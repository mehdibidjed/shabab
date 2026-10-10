"""Module 2 privacy rules (CLAUDE.md), proven against the API."""
import datetime as dt
import json

import pytest
from sqlalchemy import text

from app.core.db import engine
from app.modules.psych.alerts import run_attendance_alerts
from app.core.db import SessionLocal

MANAGEMENT = ["dc_director", "djs_director", "wali_inspector", "odej_director", "opow_director"]
NON_PSY = MANAGEMENT + ["educator", "parent", "young_member"]
CLINICAL_KEYS = {"notes", "answers", "content", "summary", "score", "max_score", "case_id", "code", "form_name"}


def case_endpoints(cid: int):
    today = dt.date.today().isoformat()
    return [
        ("GET", "/api/psych/cases", None),
        ("GET", f"/api/psych/cases/{cid}", None),
        ("GET", f"/api/psych/cases/{cid}/sessions", None),
        ("POST", f"/api/psych/cases/{cid}/sessions", {"date": today, "notes": "test note"}),
        ("GET", f"/api/psych/cases/{cid}/assessments", None),
        ("GET", f"/api/psych/cases/{cid}/plan", None),
        ("PUT", f"/api/psych/cases/{cid}/plan", {"content": "x"}),
        ("GET", f"/api/psych/cases/{cid}/parent-reports", None),
        ("GET", f"/api/psych/cases/{cid}/access-log", None),
        ("POST", f"/api/psych/cases/{cid}/consent", {"guardian_name": "someone"}),
        ("GET", "/api/psych/alerts", None),
        ("GET", "/api/psych/appointments", None),
        ("GET", "/api/psych/referrals/received", None),
    ]


def all_keys(obj) -> set[str]:
    if isinstance(obj, dict):
        return set(obj) | set().union(*(all_keys(v) for v in obj.values()))
    if isinstance(obj, list):
        return set().union(*(all_keys(v) for v in obj)) if obj else set()
    return set()


# ------------------------------------------------------------------ management: 403 on case files
@pytest.mark.parametrize("user", MANAGEMENT)
def test_management_gets_403_on_every_case_file_endpoint(as_, user, case_id):
    for method, path, body in case_endpoints(case_id):
        r = as_(user).request(method, path, json=body)
        assert r.status_code == 403, f"{user} {method} {path} -> {r.status_code}"


@pytest.mark.parametrize("user", ["educator", "parent", "young_member"])
def test_other_roles_get_403_on_case_files(as_, user, case_id):
    for method, path, body in case_endpoints(case_id):
        assert as_(user).request(method, path, json=body).status_code == 403, f"{user} {method} {path}"


# ------------------------------------------------------------------ management: aggregated stats only
@pytest.mark.parametrize("user", MANAGEMENT)
def test_management_gets_only_aggregated_anonymous_stats(as_, user, psy_cases):
    r = as_(user).get("/api/psych/stats")
    assert r.status_code == 200
    data = r.json()
    assert set(data) == {
        "active_cases", "new_cases_this_month", "sessions_per_month", "referrals_by_category",
        "appointments_this_month", "open_alerts", "programs_published", "prevention_sessions_upcoming",
    }
    assert all_keys(data) & {"name_ar", "name_fr", "id", "member", "subject", "notes"} == set()
    body = r.text
    assert "PS-" not in body  # no case codes
    for c in psy_cases:  # no subject names
        assert c["subject"]["name_ar"] not in body and c["subject"]["name_fr"] not in body


def test_small_counts_are_suppressed(as_):
    data = as_("dc_director").get("/api/psych/stats").json()
    counts = [data["active_cases"], data["new_cases_this_month"], data["appointments_this_month"], data["open_alerts"]]
    counts += [m["count"] for m in data["sessions_per_month"]] + [c["count"] for c in data["referrals_by_category"]]
    for v in counts:
        assert v == "<5" or v == 0 or (isinstance(v, int) and v >= 5), v
    assert "<5" in counts  # the fixture data does contain small cells


def test_management_dashboard_endpoints_still_work(as_):
    for user in MANAGEMENT:
        assert as_(user).get("/api/dashboard/kpis").status_code == 200


# ------------------------------------------------------------------ psychologists are isolated from each other
def test_other_psychologist_gets_404_not_the_case(as_, case_id):
    for suffix in ("", "/sessions", "/assessments", "/plan", "/access-log"):
        assert as_("psychologist_b").get(f"/api/psych/cases/{case_id}{suffix}").status_code == 404
    own = as_("psychologist_b").get("/api/psych/cases").json()
    assert own and case_id not in {c["id"] for c in own}


def test_owner_reads_decrypted_content(as_, case_id):
    sessions = as_("psychologist").get(f"/api/psych/cases/{case_id}/sessions").json()
    assert sessions and all(s["notes"] and not s["notes"].startswith("gAAAA") for s in sessions)


def test_transfer_moves_read_access(as_, psy_cases):
    staff_b = as_("psychologist_b")
    target = next(c for c in psy_cases if c["status"] == "closed")
    # psychologist_b's staff id: any of their cases' owner is them; use the transfer target lookup via a 404 first
    assert staff_b.get(f"/api/psych/cases/{target['id']}").status_code == 404
    from app.modules.facilities.models import Staff
    with SessionLocal() as db:
        b_id = db.query(Staff).filter(Staff.demo_key == "psy_dc02").one().id
    r = as_("psychologist").post(f"/api/psych/cases/{target['id']}/transfer", json={"to_staff_id": b_id})
    assert r.status_code == 204
    assert staff_b.get(f"/api/psych/cases/{target['id']}").status_code == 200
    assert as_("psychologist").get(f"/api/psych/cases/{target['id']}").status_code == 404


# ------------------------------------------------------------------ encryption & consent
def test_confidential_fields_are_encrypted_at_rest():
    with engine.connect() as conn:
        for table, col in [("psych_sessions", "notes"), ("psych_assessments", "answers"),
                           ("psych_plans", "content"), ("psych_parent_reports", "summary")]:
            values = [v for (v,) in conn.execute(text(f"SELECT {col} FROM {table}"))]
            assert values, table
            for v in values:
                assert v.startswith("gAAAA"), f"{table}.{col} not encrypted"
                # Arabic plaintext can never appear in base64 ciphertext.
                assert "حصة" not in v and "الأهداف" not in v and "ابنكم" not in v


def test_minor_case_requires_guardian_consent_before_notes(as_, psy_cases):
    psy = as_("psychologist")
    pending = next(c for c in psy_cases if c["is_minor"] and not c["consent_recorded"])
    note = {"date": dt.date.today().isoformat(), "notes": "first listening session"}
    assert psy.post(f"/api/psych/cases/{pending['id']}/sessions", json=note).status_code == 409
    assert psy.request("PUT", f"/api/psych/cases/{pending['id']}/plan", json={"content": "x"}).status_code == 409
    r = psy.post(f"/api/psych/cases/{pending['id']}/consent", json={"guardian_name": "Test Guardian"})
    assert r.status_code == 200 and r.json()["consent_recorded"]
    assert psy.post(f"/api/psych/cases/{pending['id']}/sessions", json=note).status_code == 201


# ------------------------------------------------------------------ access log
def test_access_log_records_reads_and_denied_attempts(as_, case_id):
    assert as_("djs_director").get(f"/api/psych/cases/{case_id}").status_code == 403
    assert as_("wali_inspector").get(f"/api/psych/cases/{case_id}/sessions").status_code == 403
    as_("psychologist").get(f"/api/psych/cases/{case_id}/plan")
    log = as_("psychologist").get(f"/api/psych/cases/{case_id}/access-log").json()
    seen = {(e["user_key"], e["action"]) for e in log}
    assert ("djs_director", "denied") in seen
    assert ("wali_inspector", "denied") in seen
    assert ("psychologist", "plan") in seen
    assert ("psychologist", "access_log") in seen


# ------------------------------------------------------------------ educator
def test_educator_sees_referral_status_and_guidance_but_nothing_clinical(as_):
    data = as_("educator").get("/api/psych/referrals").json()
    assert data and any(r["guidance"] for r in data)
    assert all_keys(data) & CLINICAL_KEYS == set()


def test_educator_flag_reaches_psychologist_inbox(as_):
    member = as_("educator").get("/api/psych/members").json()[0]
    r = as_("educator").post("/api/psych/referrals", json={
        "member_id": member["id"], "category": "behavior",
        "observation": "Altercation with peers during the afternoon workshop.", "aggressive_behavior": True})
    assert r.status_code == 201 and r.json()["status"] == "sent"
    inbox = as_("psychologist").get("/api/psych/alerts").json()
    assert any(a["type"] == "educator_flag" and a["member"]["id"] == member["id"] for a in inbox)


def test_educator_cannot_refer_members_of_another_center(as_):
    other = as_("psychologist_b").get("/api/psych/cases").json()[0]["subject"]["id"]
    r = as_("educator").post("/api/psych/referrals", json={"member_id": other, "category": "other",
                                                           "observation": "should not be allowed at all"})
    assert r.status_code == 404


# ------------------------------------------------------------------ parent & young member
def test_parent_sees_only_shared_reports_about_their_own_child(as_, psy_cases):
    reports = as_("parent").get("/api/psych/parent/reports").json()
    assert len(reports) == 2
    assert all("مسودة" not in r["summary"] for r in reports)  # the unshared draft is not visible
    child_case = next(c for c in psy_cases if c["origin"] == "parent")
    owner_view = as_("psychologist").get(f"/api/psych/cases/{child_case['id']}/parent-reports").json()
    shared_ids = {r["id"] for r in owner_view if r["shared"]}
    assert {r["id"] for r in reports} == shared_ids


def test_parent_meeting_request_creates_alert(as_):
    r = as_("parent").post("/api/psych/parent/meeting-requests", json={"reason": "worried", "preferred": "morning"})
    assert r.status_code == 201
    assert any(a["type"] == "parent_request" and a["id"] == r.json()["id"]
               for a in as_("psychologist").get("/api/psych/alerts").json())


def test_young_member_books_only_for_themselves(as_):
    youth = as_("young_member")
    slot = youth.get("/api/psych/youth/slots").json()[0]
    r = youth.post("/api/psych/youth/appointments", json={"starts_at": slot})
    assert r.status_code == 201 and r.json()["with_person"] is None
    assert youth.post("/api/psych/youth/appointments", json={"starts_at": slot}).status_code == 409  # taken now
    agenda = as_("psychologist").get("/api/psych/appointments", params={"days": 30}).json()
    assert any(a["id"] == r.json()["id"] for a in agenda)
    other = next(a for a in agenda if a["requested_by"] != "youth")
    assert youth.post(f"/api/psych/youth/appointments/{other['id']}/cancel").status_code == 404


@pytest.mark.parametrize("user", ["parent", "young_member", "educator", "psychologist"])
def test_non_management_roles_cannot_open_dashboards_or_registers(as_, user):
    for path in ("/api/dashboard/kpis", "/api/members", "/api/facilities", "/api/activities", "/api/org/tree"):
        assert as_(user).get(path).status_code == 403, f"{user} {path}"


# ------------------------------------------------------------------ alert job
def test_attendance_job_flags_drops_and_is_idempotent(as_):
    inbox = as_("psychologist").get("/api/psych/alerts").json()
    drops = [a for a in inbox if a["type"] == "attendance_drop"]
    assert drops
    for a in drops:  # details: "previous:attended/offered;recent:attended/offered"
        prev, recent = (part.split(":")[1].split("/") for part in a["details"].split(";"))
        assert int(recent[0]) / int(recent[1]) < 0.5 * int(prev[0]) / int(prev[1])
    with SessionLocal() as db:
        assert run_attendance_alerts(db) == []  # open alerts are not duplicated


def test_assessment_answers_stay_json_for_owner(as_, case_id):
    items = as_("psychologist").get(f"/api/psych/cases/{case_id}/assessments").json()
    assert items and isinstance(json.loads(items[0]["answers"]), dict)
