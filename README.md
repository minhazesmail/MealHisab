# MealHisab BD

Bangladesh-first meal accounting for shared flats, messes and small households.

## Architecture

- Next.js 16 App Router + React 19 + TypeScript
- Supabase Auth, PostgreSQL, Storage and Realtime
- Database-enforced tenancy/RLS and transactional cycle closing
- Policy-aware implicit meals: opt-out counts by default; opt-in requires confirmation
- Immutable settlement snapshots and per-cycle opening/closing balances
- English/Bangla-ready UI with BDT formatting

## Local setup

```bash
cp .env.example .env.local
npm install
npm run typecheck
npm run test
npm run dev
```

Environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_APP_URL`

Never expose a Supabase service-role/secret key in browser code or `NEXT_PUBLIC_*` variables.

## Supabase

Apply `supabase/migrations/00001_initial.sql`, `00002_security.sql`, `00003_accounting.sql`, and `00004_storage.sql` in order. The production project is `mealhisab-bd` in `ap-south-1`.

## Production

Create a Vercel project linked to this repository with the project root at the repository root. GitHub Actions runs typecheck, lint and unit tests; Vercel Git integration handles preview and production deployments.
