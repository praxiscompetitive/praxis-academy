# System audit — Praxis Academy MVP (10 Nov 2026)

Measured against `Praxis_Academy_System_Architecture.pdf` v1.1 (MVP table, acceptance criteria, security baseline).

## 1. Implemented (works, covered by `npm test` or checked in browser)
| Area | Detail |
|---|---|
| Accounts & roles | Register, sign in/out (Auth.js credentials, bcrypt, JWT), learner/reviewer/admin; role re-read from DB on every guarded page/action |
| Enrolment | Enrol in a published programme |
| Curriculum | Programme → modules → lessons; prerequisite rules; unlock by completed prerequisites (never XP); full Praxis SE (M01–M12 + Capstone) seeded |
| Missions | Brief, evidence requirement, rubric (per-criterion 0–3), pass threshold |
| Submissions | 1–5 http(s) URLs + notes + AI-use disclosure; append-only attempts; resubmit after "revise"; no double-submit while pending; no server-side fetching or code execution |
| Review | Manual queue, rubric scoring, pass/revise, mandatory feedback, no self-review, no double review |
| Progression | Pass writes competency evidence and recomputes unlocks; XP kept in a separate table, idempotent per (user, kind, ref) |
| Progress/portfolio | XP, rank (from evidence count), verified work list, competencies, attempt table |
| Admin | Create programme, publish/unpublish, add module (+prereqs), lesson, mission (+rubric); overview counts; recent audit events |
| Audit | register, enrol, submit, review, admin content actions |
| Ops (partial) | Vercel-friendly stack (serverless DB client, stateless sessions), `.env.example`, README, seed, e2e script |

## 2. Not implemented (in the MVP spec)
- Due dates: column exists, no UI, display or enforcement
- File evidence uploads + object storage + type/size limits (text/URL only)
- Achievements/badges (XP only)
- Admin analytics: review backlog age, completion report (only 4 counters)
- Backups, documented recovery procedure, restore test
- Error monitoring / logging / metrics
- CI/CD pipeline and automated deploy
- Cohorts and reviewer allocation (all reviewers see all submissions)
- Notifications (in-app/email)
- Account recovery / password reset; optional staff MFA
- Privacy notice, retention policy, data-protection settings
- Edit/delete/reorder/retire content; programme version history (admin can only add)
- Admin user management (no way to promote a user to reviewer/admin except SQL)

## 3. To be implemented (roadmap phases 2+, explicitly deferred)
Teams, discussions, peer review, leaderboards (opt-out), richer ranks/streaks; GitHub OAuth/webhooks/CI checks; interactive labs; AI learning support; multi-programme templates/certificates; ecosystem features. Also: **UI redesign** (requested), markdown lesson rendering.

## 4. Needs fixing (defects/risks in what exists)
1. **Seed is destructive**: re-running deletes the `praxis-se` programme, cascading away every learner's progress, attempts and evidence.
2. **`npm test` is destructive**: wipes the demo learner's data on whatever `DATABASE_URL` points at — no production guard.
3. **Seeded demo accounts** use a known default password; must not reach production.
4. **No rate limiting / lockout** on login and register (brute force).
5. **No security headers / CSP**; `trustHost: true` is unconditional.
6. **Unpublished programmes remain accessible** to enrolled learners via `/m/[id]`, `/l/[id]`, `/mission/[id]` (only the path page checks `published`).
7. **Races surface as raw 500s**: concurrent review/submit hit unique indexes after the status check, outside any transaction/lock.
8. **Errors are thrown, not shown inline**; in production Next masks server-action error messages, so users see a generic failure (e.g. "Locked", "Already passed", URL validation).
9. **Publish toggle bumps `version` on every click** (unpublishing also bumps).
10. **Admin "add mission" always creates a new competency**, producing duplicates; no way to reuse one competency across missions.
11. **Attempt XP (20) is uncapped** per attempt; spec asks for capped/quality-weighted XP.
12. **Rank thresholds (3/7/11 competencies) are hard-coded** in a page, not data.
13. **Review detail query loads every learner's attempts for the mission** and filters in memory.
14. **Embedded dev Postgres uses WIN1252 encoding** (non-Latin text will fail locally); production DBs must be UTF-8.
15. **Test coverage is one script**; no UI/authorization tests, no CI.
16. **Accessibility unaudited** (labels/skip link present; contrast, keyboard flows, WCAG 2.2 AA not checked).
17. **Auth/Next versions**: `next-auth@beta` and TypeScript 7 pinned loosely (`^`); lock and review before launch.
