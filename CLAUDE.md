# CLAUDE.md — Shabab Platform (prototype)

## What this project is
A management platform for the Algerian Youth & Sports sector at wilaya level, supported by AI.
This repository is a **clickable prototype** to demonstrate the idea, starting from the
**Directorate of Youth & Sports (DJS)** dashboard. It is not production code yet.

## Organization the platform models (domain)
```
Wali — Inspection & follow-up (التفتيش والمتابعة)        → read-only oversight of everything
DJS — Directorate of Youth & Sports (مديرية الشباب والرياضة)
├── OPOW — Multi-sports complex office (ديوان المركب المتعدد الرياضات)
│   ├── Multi-sports halls (القاعات المتعددة الرياضات)
│   ├── Proximity fields (الملاعب الجوارية)
│   └── Main stadiums (الملاعب الرئيسية)
└── ODEJ — Youth establishments office (ديوان مؤسسات الشباب)
    ├── Youth hostels (بيوت الشباب)
    ├── Proximity sports complexes (المركبات الرياضية الجوارية)
    ├── Scientific leisure centers (مراكز التسلية العلمية)
    └── Youth Centers — Dar Chabab (دور الشباب)
        ├── Director (مدير المؤسسة) → Counselors (مستشارون), Head educators / Educators (مربون رئيسيون / مربون)
        ├── Secretariat (الأمانة العامة)
        ├── Finance administrators (متصرفو الشؤون المالية)
        ├── Coordination administrators (متصرفو التنسيق) — liaison with associations
        ├── Associations & sports administrators (متصرفو النشاطات الجمعوية والرياضية)
        ├── Center activities administrators (متصرفو نشاطات دار الشباب)
        └── Professional workers (العمال المهنيون) — maintenance, cleaning
```

Key rule: every record belongs to one node of this tree. A user's access = **role × scope**
(scope = a subtree). DJS sees all; OPOW sees only OPOW facilities; a Dar Chabab director
sees only their center; the Wali inspector reads everything.

## Tech stack (fixed)
- `frontend/` — Next.js (App Router, TypeScript), Tailwind CSS, shadcn/ui, Recharts, lucide-react icons, next-intl.
- `backend/` — FastAPI (Python 3.12), SQLAlchemy 2, Pydantic v2.
- Database for the prototype: **SQLite** (file `backend/shabab.db`) so it runs with zero setup.
  Keep models Postgres-compatible; the org path is stored as a string like `djs.odej.dc_blida_01`
  (mirrors Postgres `ltree`, which we will switch to later).
- AI: an `ai/` module in the backend. If `DEEPSEEK_API_KEY` is set, call the DeepSeek API (OpenAI-compatible, model `deepseek-chat`);
  otherwise return clearly-labelled canned responses so the demo always works offline.

## Conventions
- **Arabic first, RTL**: default locale `ar` with `dir="rtl"`; also `fr` and `en`. All UI strings in message files, never hard-coded.
- Responsive: must work on a phone (≈ 380px) and on desktop. Sidebar collapses to a drawer on mobile.
- Backend layout: `app/modules/<name>/{router.py, service.py, models.py, schemas.py}`; one shared `app/core/scope.py` dependency filters every list query by the current user's scope.
- All seed data is **fictional** but realistic for one wilaya (Blida): Arabic names of facilities, plausible numbers. Mark the UI with a small "بيانات تجريبية / Demo data" badge.
- No real authentication in the prototype: a **role switcher** in the top bar picks a demo user (DJS director, OPOW director, ODEJ director, Dar Chabab director, Wali inspector). The backend reads the role from an `X-Demo-User` header.
- Explain design decisions briefly in commit messages and in `docs/decisions.md`.

## Module 2 — Psychological Care & Prevention (مصلحة الإرشاد والمتابعة النفسية)
Built **after** the DJS dashboard. Lives inside each Dar Chabab (and other ODEJ facilities).

New demo roles:
- **Clinical Psychologist / نفساني عيادي** — scope: one facility.
- **Parent / ولي الأمر** — sees only their own child.
- **Young member / شاب منخرط** — books listening sessions for themselves.
- Existing **Counselor / Educator** roles gain "refer a case" and "receive guidance".

Features:
1. **Preventive programs** (البرامج الوقائية): campaigns on addiction prevention, stress, and behavioral guidance.
   They are published to the Dar Chabab activity calendar, where young members and counselors can see them.
2. **Case files** (الملف النفسي السري) for youth, children or workers. Each file contains confidential session notes,
   periodic assessments (questionnaires with scores) and a follow-up plan.
3. **Communication hub**:
   - Educator or counselor → psychologist: a **referral** describing an observed behavior.
   - Psychologist → educator: **pedagogical guidance** on how to handle the young person, with no clinical details.
   - Psychologist → parent: simplified periodic reports and requests for a meeting.
   - Youth or worker → psychologist: booking a listening appointment (موعد استماع).
4. **Alerts**: a sharp drop in a member's attendance (computed from activity attendance), an educator flagging
   aggressive behavior, or a parent asking for help. The alert appears in the psychologist's inbox.

### Privacy rules for this module (non-negotiable, enforce in the backend, not only the UI)
- Session notes, assessments and follow-up plans are **readable only by the psychologist who owns the case**
  (or one it was formally transferred to). Not by the director, DJS, OPOW/ODEJ, or the Wali inspector.
- Encrypt those fields at rest (field-level encryption, e.g. `cryptography.Fernet`, key from env `CASE_KEY`).
- Everyone above the psychologist sees **aggregated, anonymous statistics only**: number of active cases,
  sessions per month, referrals by category. Never names. Hide any count below 5 (show "<5").
- Educators see that their referral was received and any guidance they were sent. They never see notes.
- Parents see only what the psychologist explicitly shares in a report for their own child.
- A minor's case file requires a recorded guardian consent before session notes can be added.
- Every read of a case file is written to an **access log** (who, when, which case), which the psychologist can view.
- Seed data: fictional cases only, generic wording, no realistic disorder descriptions.
- Applicable law is Algeria's Law 18-07 on personal data protection, where health data is sensitive. HIPAA is a
  US law and is used here only as a design mindset.

## How to run (keep this section updated)
```
cd backend && pip install -r requirements.txt && python -m app.seed && uvicorn app.main:app --reload
cd frontend && npm install && npm run dev
```
