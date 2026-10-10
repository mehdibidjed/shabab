# Design decisions — prototype v1

Short record of the main choices and why. Prototype first: simple, demo-ready, easy to change.

## Domain & data

- **One org tree, dotted paths.** Every org unit has a `path` like `djs.odej.dc_blida_01`
  (codes joined by dots). This mirrors Postgres `ltree`, so moving to Postgres is a column-type
  change plus `path <@ scope` instead of `LIKE`.
- **`org_path` is denormalised onto every scoped table** (facilities, staff, members, activities,
  bookings). Scope filtering then needs no joins, and one helper does it everywhere:
  `Scope.filter(col)` → `col = scope OR col LIKE 'scope.%'` (`backend/app/core/scope.py`).
- **Facility = org unit + facility attributes.** Offices (DJS/OPOW/ODEJ) and facilities share the
  `org_units` table; a `facilities` row (1:1) adds capacity, status, location, bookable spaces.
- **Dar Chabab internal structure as a staff hierarchy** (`staff.reports_to_id`) rather than
  extra org units: departments in a youth center are positions, not separately-scoped entities.
  The UI groups people by position to keep the chart readable on a phone.
- **Seed data is relative to today** with a fixed random seed, so "this month" is never empty and
  numbers are reproducible for a given day. Names are fictional; communes are real Blida communes.
- **Occupancy** = booked slots ÷ (bookable spaces × 3 daily slots × days), excluding closed facilities.

## Access & scope

- **Role × scope via `X-Demo-User`.** No authentication in the prototype; five demo users map to a
  role and a scope path (`backend/app/core/demo_users.py`). The Wali inspector has the DJS scope
  plus a `read_only` flag (no write actions exist yet in v1).
- **Out-of-scope facility → 404, not 403**, so a user cannot probe what exists outside their scope.
- Scope is enforced in the **backend**; the frontend only displays what the API returns. This is
  the pattern Module 2 (psychological care) will rely on for its stricter privacy rules.

## AI

- **DeepSeek instead of Claude** (project decision). DeepSeek's API is OpenAI-compatible; we call
  `POST {DEEPSEEK_BASE_URL}/chat/completions` with `httpx` and JSON output mode — no SDK needed.
- The model receives only **aggregated, scoped** figures (KPIs, trends, facility summaries) — no
  personal data — plus today's date and a note that the current month is partial (without it the
  model reported the month-to-date drop as a decline).
- **Offline fallback**: without `DEEPSEEK_API_KEY`, or on any error, rule-based insights computed
  from the same data are returned with `source: "demo"`, and the UI labels them. The demo always works.

## Frontend

- **Client-side data fetching with SWR**, keyed by `[path, demoUser]`: switching role refetches
  everything automatically and visibly. The overview remounts on role/language change so local
  state (tree selection, AI insights) never shows another scope's data.
- **Locale in a cookie, not the URL** (`NEXT_LOCALE`; `ar` default, `fr`, `en`). Keeps URLs simple
  (`/facilities/13`); `<html lang dir>` is set server-side so there is no RTL flash. Data names are
  stored in Arabic and French; English UI falls back to French names.
- **next-intl without its Next plugin.** For this setup the plugin only adds the
  `next-intl/config` → `./i18n/request.ts` alias, so we declare it in `next.config.ts`. The plugin
  eagerly loads `@swc/core`, whose native addon refused to load on the dev machine.
- **`cacheComponents` off.** Every page depends on cookies (locale, demo user), so dynamic
  rendering is the honest default for the prototype.
- **RTL**: shadcn components generated with `rtl: true` (logical `ms-/pe-/start-` classes). The
  Recharts line chart renders in an LTR SVG with mirrored axes for Arabic (time flows right→left);
  horizontal bar charts are plain HTML so labels shape, wrap and align naturally in both directions.
- **Charts**: colours from a validated, colour-blind-safe categorical palette with separate light
  and dark steps (CSS tokens `--series-*`); status colours are reserved for facility state and
  always paired with an icon and label; every chart has a table view toggle.
- **Responsive**: sidebar ≥ 1024px, drawer below (opens from the start side); the facilities
  table becomes cards below 768px; the org chart switches from a horizontal bus to a vertical spine.
  Verified at 380px and 1440px in light and dark mode.

## Not in v1 (on purpose)

Real authentication, write operations, pagination, maps, tests beyond curl/browser smoke checks,
and Module 2 (psychological care & prevention) — see `CLAUDE.md`.
