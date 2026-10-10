# Shabab Platform — prototype (منصة شباب)

Clickable prototype of a management platform for the Youth & Sports sector of an Algerian
wilaya: the **Directorate of Youth & Sports (DJS)** dashboard, and **Module 2 — Psychological
Care & Prevention** (مصلحة الإرشاد والمتابعة النفسية) inside the youth centers. All data is
**fictional** (wilaya of Constantine — قسنطينة) and the UI is labelled "بيانات تجريبية / Demo data".

- `backend/` — FastAPI + SQLAlchemy 2 + SQLite (`backend/shabab.db`)
- `frontend/` — Next.js 16 (App Router, JavaScript), Tailwind 4, shadcn/ui (Base UI), Recharts, next-intl
- `docs/decisions.md` — main design choices

## Run it

Requirements: Python 3.12, Node 20+.

```bash
# 1. Backend  → http://localhost:8000  (API docs at /docs)
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m app.seed                 # (re)creates shabab.db with demo data relative to today
uvicorn app.main:app --reload
pytest                             # Module 2 privacy tests (throwaway DB and key)

# 2. Frontend → http://localhost:3000  (in another terminal)
cd frontend
npm install
npm run dev
```

Optional: `export DEEPSEEK_API_KEY=...` before starting the backend to get live AI insights
from DeepSeek. Without a key (or if the call fails) the backend returns rule-based insights
computed from the same data, clearly labelled "استجابة تجريبية / Demo response".
Confidential Module 2 fields are encrypted with the key in `CASE_KEY` (a Fernet key:
`python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`).
Without it, a development key is generated in `backend/.case_key` (gitignored) — demo only.
If the backend is not on `localhost:8000`, set `NEXT_PUBLIC_API_URL` (see `frontend/.env.example`).

Re-run `python -m app.seed` on another day to keep "this month" figures fresh.

## Demo script

1. Open http://localhost:3000. It starts in **Arabic (RTL)** as the **DJS director**: 16 facilities, KPIs, charts, org tree and facilities table.
2. **Switch role** (top bar): OPOW director → 7 sports facilities only; ODEJ director → 9 youth establishments; Dar Chabab director → a single center; Wali inspector → everything, read-only.
3. In the **org tree**, click an office (OPOW/ODEJ) to filter the table; click a facility to drill down.
4. Open **Members** (sidebar): registrations per month, gender/age composition, members per facility (click a bar to filter), and a searchable, filterable, paginated register.
5. Open **Activities**: month-to-date vs last month, typical attendance, activities per month, by category and by facility (click to filter), and the activity log with search, category, facility and month filters.
6. Open a **Dar Chabab** to see its internal staff structure (director → counselors, head educator → educators, administrators, workers), member stats, recent activities and upcoming bookings.
7. Click **توليد الرؤى (Generate insights)** for three findings about the current scope.
8. Switch language (ar / fr / en) and theme (light / dark) from the top bar; resize to phone width (the sidebar becomes a drawer).

### Module 2 — psychological care (switch role to the "الإرشاد والمتابعة النفسية" / "الأسر والشباب" groups)

9. As **DJS / director / Wali**: the overview's **الدعم النفسي** card shows aggregated, anonymous numbers only (counts below 5 show as "أقل من 5"). Opening any case file is refused (403).
10. As the **psychologist** (Dar Chabab Constantine centre): the inbox lists alerts (attendance drop, educator flag, parent request) and referrals; reply with pedagogical guidance or open a case. Case files have tabs for sessions, assessments, plan, parent reports and the **access log**. Every confidential field shows 🔒 "سري — مرئي للنفساني فقط". A minor's file stays locked until guardian consent is recorded. Publish a prevention program to the center's calendar.
11. As the **educator**: refer a young person (tick "aggressive behavior" to alert the psychologist immediately) and read the guidance received — never any clinical content.
12. As the **parent**: read the reports the psychologist shared about your child, request a meeting.
13. As the **young member**: book a confidential listening appointment.

## API

All endpoints read the `X-Demo-User` header (`djs_director` by default; also `opow_director`,
`odej_director`, `dc_director`, `wali_inspector`, `psychologist`, `educator`, `parent`,
`young_member`; `psychologist_b` exists for tests) and only return data within that user's scope.
Dashboard, register and AI endpoints are for management roles only (others get 403).

| Method | Path | Description |
|---|---|---|
| GET | `/api/me` | current demo user + list of demo users |
| GET | `/api/org/tree` | org tree rooted at the user's scope, with member counts |
| GET | `/api/dashboard/kpis` | facilities, active members, activities this month, booking occupancy |
| GET | `/api/dashboard/trends` | members & activities per month, activities by category, facilities by type |
| GET | `/api/facilities?type=` | facilities with status, members, 30-day activity and occupancy |
| GET | `/api/members?facility_id=&gender=&age_band=&status=&q=&page=&page_size=` | paginated member register |
| GET | `/api/members/stats` | totals, gender, age bands, new members per month (12), members per facility |
| GET | `/api/activities?category=&facility_id=&month=YYYY-MM&q=&page=&page_size=` | paginated activity log |
| GET | `/api/activities/stats` | month to date vs last month, median attendance, per month / category / facility |
| GET | `/api/facilities/{id}` | detail incl. staff hierarchy, member stats, recent activities (404 if out of scope) |
| POST | `/api/ai/insights` | `{"locale": "ar"\|"fr"\|"en"}` → 3 insights (`source`: `deepseek` or `demo`) |

```bash
curl -H "X-Demo-User: opow_director" localhost:8000/api/dashboard/kpis
```

### Module 2 (`/api/psych/...`) — who can call what

| Path | Allowed |
|---|---|
| `GET stats` | management roles + psychologist — anonymous aggregates, 1–4 shown as `"<5"` |
| `GET calendar` | everyone attached to a center — upcoming prevention sessions |
| `GET alerts`, `PATCH alerts/{id}` | psychologist (own center) |
| `GET/POST cases`, `GET/PATCH cases/{id}`, `POST cases/{id}/consent`, `POST cases/{id}/transfer` | **owning psychologist only** (others: 403, another psychologist: 404) |
| `GET/POST cases/{id}/sessions` · `assessments` · `GET/PUT plan` · `parent-reports` · `GET access-log` | owning psychologist only; minors need recorded consent first (409) |
| `GET referrals/received`, `POST referrals/{id}/received`, `POST referrals/{id}/guidance` | psychologist |
| `GET/POST/PATCH appointments`, `GET/POST/PUT programs`, `POST programs/{id}/publish` | psychologist |
| `GET members?q=` | psychologist, educator (own center) |
| `GET/POST referrals` | educator — status + guidance only |
| `GET parent/child`, `GET parent/reports`, `GET/POST parent/meeting-requests` | parent — own child, shared reports only |
| `GET youth/slots`, `GET/POST youth/appointments`, `POST youth/appointments/{id}/cancel` | young member — self only |
