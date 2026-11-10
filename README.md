# Praxis Academy (MVP vertical slice)

Next.js (App Router) + TypeScript + Drizzle + PostgreSQL + Auth.js credentials (JWT sessions). Modular monolith: all business rules live in `src/lib/core.ts`.

## Local
```
npm install
npm run db:local     # embedded Postgres on :5433 (own terminal, leave running)
npm run db:push      # create tables
npm run db:seed      # Praxis SE curriculum + admin@/reviewer@/learner@praxis.test (SEED_PASSWORD, default praxis-dev-pass)
npm test             # end-to-end learning-loop check against the DB
npm run dev
```

## Vercel
1. Create a Postgres (Neon / Vercel Postgres), set `DATABASE_URL` (pooled) and `AUTH_SECRET` (`openssl rand -base64 32`) in project env.
2. Run `npm run db:push` and `npm run db:seed` once against that URL. **Change/disable the seeded demo users in production** (set `SEED_PASSWORD`, delete demo accounts).
3. Deploy.

## Rules enforced
- Unlocks come from prerequisite modules being complete (lessons done + missions passed), never XP.
- XP (`xp_events`) and competency evidence (`evidence`) are separate tables; evidence is written only on a reviewer pass.
- Attempts are append-only; reviewers cannot review their own work; submitted URLs must be http(s), no server-side fetching, no code execution.
