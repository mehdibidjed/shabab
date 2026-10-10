"""AI insights.

If DEEPSEEK_API_KEY is set we call DeepSeek's OpenAI-compatible chat API;
otherwise (or on error) we return rule-based insights computed from the same
scoped data, clearly labelled `source="demo"` so the demo always works offline.
"""
import json
import logging
import os
from datetime import date

import httpx
from sqlalchemy.orm import Session

from app.ai.schemas import Insight, InsightsResponse, Locale
from app.core.scope import Scope
from app.modules.dashboard.service import get_kpis, get_trends
from app.modules.facilities.service import list_facilities

log = logging.getLogger(__name__)

DEEPSEEK_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com") + "/chat/completions"
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
LANGUAGE = {"ar": "Arabic (Modern Standard)", "fr": "French", "en": "English"}


def _context(db: Session, scope: Scope) -> dict:
    today = date.today()
    return {
        "today": today.isoformat(),
        "note": f"The current month is incomplete (day {today.day}); the last entry of trends.months is month-to-date. "
                "Compare the current month only via kpis *_this_month vs *_last_month_same_period.",
        "scope": scope.path,
        "role": scope.user.role,
        "kpis": get_kpis(db, scope).model_dump(),
        "trends": get_trends(db, scope).model_dump(),
        "facilities": [
            {k: f[k] for k in ("name_ar", "name_fr", "type", "status", "members", "activities_30d", "occupancy_30d")}
            for f in (x.model_dump() for x in list_facilities(db, scope, None))
        ],
    }


def generate_insights(db: Session, scope: Scope, locale: Locale) -> InsightsResponse:
    ctx = _context(db, scope)
    key = os.getenv("DEEPSEEK_API_KEY")
    if not key:
        return InsightsResponse(source="demo", insights=_demo_insights(ctx, locale))
    try:
        return InsightsResponse(source="deepseek", model=DEEPSEEK_MODEL, insights=_deepseek(ctx, locale, key))
    except Exception as exc:  # network, quota, malformed JSON...
        log.warning("DeepSeek call failed, falling back to demo insights: %s", exc)
        return InsightsResponse(source="demo", notice="ai_unavailable", insights=_demo_insights(ctx, locale))


def _deepseek(ctx: dict, locale: Locale, key: str) -> list[Insight]:
    system = (
        "You are an analyst for the Directorate of Youth & Sports of an Algerian wilaya. "
        "Given JSON operational data for the user's scope, write exactly 3 short, concrete findings "
        "a director can act on (trends, anomalies, recommendations). Cite numbers. "
        "Never treat the partial current month as a decline. "
        f"Write in {LANGUAGE[locale]}. Each text is at most 2 sentences. "
        'Reply only with JSON: {"insights": [{"title": str, "text": str, "tone": "positive"|"warning"|"info"}]}'
    )
    resp = httpx.post(
        DEEPSEEK_URL,
        headers={"Authorization": f"Bearer {key}"},
        json={
            "model": DEEPSEEK_MODEL,
            "messages": [{"role": "system", "content": system},
                         {"role": "user", "content": json.dumps(ctx, ensure_ascii=False, default=str)}],
            "response_format": {"type": "json_object"},
            "temperature": 0.4,
            "max_tokens": 800,
        },
        timeout=40,
    )
    resp.raise_for_status()
    data = json.loads(resp.json()["choices"][0]["message"]["content"])
    return [Insight(**i) for i in data["insights"][:3]]


# ----------------------------------------------------------- offline insights
T = {
    "act_up": {"ar": ("تزايد النشاطات", "ارتفع عدد النشاطات هذا الشهر بنسبة {p}% (المجموع: {n}) مقارنة بنفس الفترة من الشهر الماضي."),
               "fr": ("Activités en hausse", "Le nombre d'activités ce mois-ci a augmenté de {p}% ({n} activités) par rapport à la même période du mois dernier."),
               "en": ("Activities rising", "Activities this month are up {p}% ({n} activities) compared with the same period last month.")},
    "act_down": {"ar": ("تراجع النشاطات", "انخفض عدد النشاطات هذا الشهر بنسبة {p}% (المجموع: {n}) مقارنة بنفس الفترة من الشهر الماضي؛ يُنصح بمراجعة البرنامج."),
                 "fr": ("Activités en baisse", "Les activités ont baissé de {p}% ({n} activités) par rapport à la même période du mois dernier ; revoir la programmation."),
                 "en": ("Activities falling", "Activities are down {p}% ({n} activities) versus the same period last month; consider reviewing the programme.")},
    "category": {"ar": ("الفئة الأكثر نشاطًا", "تتصدر فئة «{top}» النشاطات خلال 6 أشهر (العدد: {n})، بينما تبقى فئة «{low}» الأضعف (العدد: {m})."),
                 "fr": ("Catégorie dominante", "La catégorie « {top} » domine sur 6 mois ({n} activités), tandis que « {low} » reste la plus faible ({m} seulement)."),
                 "en": ("Leading category", "“{top}” leads activity over 6 months ({n} activities), while “{low}” trails with only {m}.")},
    "occupancy": {"ar": ("تفاوت في استغلال المرافق", "نسبة الحجز في «{low}» لا تتعدى {lp}% مقابل {hp}% في «{high}»؛ يمكن توجيه طلبات الجمعيات نحو المرافق الأقل استغلالًا."),
                  "fr": ("Occupation inégale", "« {low} » n'est réservé qu'à {lp}% contre {hp}% pour « {high} » ; orienter les demandes des associations vers les structures sous-utilisées."),
                  "en": ("Uneven occupancy", "“{low}” is only {lp}% booked versus {hp}% at “{high}”; steer association requests toward under-used facilities.")},
    "members": {"ar": ("نمو المنخرطين", "بلغ عدد المنخرطين الجدد هذا الشهر {n}، ليصل عدد المنخرطين النشطين إلى {total}."),
                "fr": ("Croissance des adhérents", "{n} nouveaux adhérents ce mois-ci, pour un total de {total} adhérents actifs."),
                "en": ("Membership growth", "{n} new members joined this month, bringing active members to {total}.")},
}
CATEGORY_NAMES = {
    "sport": {"ar": "الرياضة", "fr": "Sport", "en": "Sport"},
    "culture": {"ar": "الثقافة", "fr": "Culture", "en": "Culture"},
    "science": {"ar": "العلوم", "fr": "Sciences", "en": "Science"},
    "scouting": {"ar": "الكشافة", "fr": "Scoutisme", "en": "Scouting"},
    "environment": {"ar": "البيئة", "fr": "Environnement", "en": "Environment"},
    "digital": {"ar": "الرقمنة", "fr": "Numérique", "en": "Digital"},
}


def _t(key: str, locale: Locale, tone: str, **kw) -> Insight:
    title, text = T[key][locale]
    return Insight(title=title, text=text.format(**kw), tone=tone)


def _demo_insights(ctx: dict, locale: Locale) -> list[Insight]:
    k = ctx["kpis"]
    out: list[Insight] = []

    now, before = k["activities_this_month"], k["activities_last_month_same_period"]
    pct = round(100 * (now - before) / before) if before else 0
    out.append(_t("act_up" if pct >= 0 else "act_down", locale, "positive" if pct >= 0 else "warning", p=abs(pct), n=now))

    cats = [c for c in ctx["trends"]["activities_by_category"] if c["activities"]]
    if len(cats) >= 2:
        name = lambda c: CATEGORY_NAMES[c["category"]][locale]  # noqa: E731
        out.append(_t("category", locale, "info", top=name(cats[0]), n=cats[0]["activities"],
                      low=name(cats[-1]), m=cats[-1]["activities"]))

    open_facs = [f for f in ctx["facilities"] if f["status"] != "closed"]
    if len(open_facs) >= 2:
        low = min(open_facs, key=lambda f: f["occupancy_30d"])
        high = max(open_facs, key=lambda f: f["occupancy_30d"])
        name_key = "name_ar" if locale == "ar" else "name_fr"
        out.append(_t("occupancy", locale, "warning", low=low[name_key], lp=round(low["occupancy_30d"]),
                      high=high[name_key], hp=round(high["occupancy_30d"])))
    if len(out) < 3:
        out.append(_t("members", locale, "positive", n=k["new_members_this_month"], total=k["active_members"]))
    return out[:3]
