# Shabab Platform — prototype (منصة شباب)

Clickable prototype of a management platform for the Youth & Sports sector of an Algerian
wilaya, starting from the **Directorate of Youth & Sports (DJS)** dashboard. All data is
**fictional** (wilaya of Blida) and the UI is labelled "بيانات تجريبية / Demo data".

- `backend/` — FastAPI + SQLAlchemy 2 + SQLite (`backend/shabab.db`)
- `frontend/` — Next.js 16 (App Router), Tailwind 4, shadcn/ui (Base UI), Recharts, next-intl
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

# 2. Frontend → http://localhost:3000  (in another terminal)
cd frontend
npm install
npm run dev
```

Optional: `export DEEPSEEK_API_KEY=...` before starting the backend to get live AI insights
from DeepSeek. Without a key (or if the call fails) the backend returns rule-based insights
computed from the same data, clearly labelled "استجابة تجريبية / Demo response".
If the backend is not on `localhost:8000`, set `NEXT_PUBLIC_API_URL` (see `frontend/.env.example`).

Re-run `python -m app.seed` on another day to keep "this month" figures fresh.

## Demo script

1. Open http://localhost:3000. It starts in **Arabic (RTL)** as the **DJS director**: 16 facilities, KPIs, charts, org tree and facilities table.
2. **Switch role** (top bar): OPOW director → 7 sports facilities only; ODEJ director → 9 youth establishments; Dar Chabab director → a single center; Wali inspector → everything, read-only.
3. In the **org tree**, click an office (OPOW/ODEJ) to filter the table; click a facility to drill down.
4. Open a **Dar Chabab** to see its internal staff structure (director → counselors, head educator → educators, administrators, workers), member stats, recent activities and upcoming bookings.
5. Click **توليد الرؤى (Generate insights)** for three findings about the current scope.
6. Switch language (ar / fr / en) and theme (light / dark) from the top bar; resize to phone width (the sidebar becomes a drawer).

## API

All endpoints read the `X-Demo-User` header (`djs_director` by default; also `opow_director`,
`odej_director`, `dc_director`, `wali_inspector`) and only return data within that user's scope.

| Method | Path | Description |
|---|---|---|
| GET | `/api/me` | current demo user + list of demo users |
| GET | `/api/org/tree` | org tree rooted at the user's scope, with member counts |
| GET | `/api/dashboard/kpis` | facilities, active members, activities this month, booking occupancy |
| GET | `/api/dashboard/trends` | members & activities per month, activities by category, facilities by type |
| GET | `/api/facilities?type=` | facilities with status, members, 30-day activity and occupancy |
| GET | `/api/facilities/{id}` | detail incl. staff hierarchy, member stats, recent activities (404 if out of scope) |
| POST | `/api/ai/insights` | `{"locale": "ar"\|"fr"\|"en"}` → 3 insights (`source`: `deepseek` or `demo`) |

```bash
curl -H "X-Demo-User: opow_director" localhost:8000/api/dashboard/kpis
```
