# MealHisab BD

**Simple, fair meal accounting for Bangladeshi messes, shared flats, and small households.**

MealHisab replaces notebooks, spreadsheets, and WhatsApp math with one calm ledger for meals, groceries, contributions, and end-of-month balances.

**Live app:** [meal-hisab-sigma.vercel.app](https://meal-hisab-sigma.vercel.app)

---

## Product vision

Every shared kitchen in Bangladesh still settles the month with ad-hoc lists and screenshots. MealHisab is built so that:

1. **Everyone sees the same numbers** — one source of truth for meals, expenses, and balances.
2. **The rules match real mess life** — opt-out or opt-in meals, holidays, mid-cycle join/leave, cook salary and gas in the pot.
3. **Closing the month is boring** — snapshot settlements, carry balances, no late-night spreadsheet fights.

We optimise for trust, clarity, and the way Bangladeshi messes actually work — not for generic “expense apps.”

---

## Who it’s for

- Bachelor messes and shared flats (3–15 people)
- Small households that share food costs
- Managers who need a clean monthly close without becoming accountants

---

## Features

| Area | What you get |
|------|----------------|
| **Meals** | Lunch, dinner, extra/guest; opt-out (default) or opt-in policy |
| **Expenses** | Grocery, cook salary, gas, other — all in settlement cost |
| **Contributions** | Record deposits; balances update live |
| **Settlement** | Immutable cycle snapshots, opening/closing balances, residual rounding reconciliation |
| **Invites** | Shareable link (`/join/CODE`) + short code; copy or native share (WhatsApp-friendly) |
| **Holidays** | Mark mess-closed days so opt-out meals don’t create phantom charges |
| **Roles** | Manager/admin RBAC for expenses, cycle close, closed days |
| **Language** | English + বাংলা UI; BDT formatting with optional Bangla digits |
| **Privacy** | Flat-level tenancy, Supabase Auth (phone/email OTP), RLS |

Interactive **demo** (sample data only, no account): `/demo`

---

## Roadmap

### Near term
- [x] Shareable invite links + copy/share from settings & post-create
- [x] Full EN / বাংলা UI toggle with Bangla number formatting
- [x] Product-focused README and vision
- [ ] Deeper Bangla coverage on every form/label (ongoing)
- [ ] PDF / Excel export of cycle settlement for the monthly meeting
- [ ] Push or WhatsApp-friendly balance reminders

### Next
- [ ] Freemium limits + paid plans (extra history, multi-flat, exports)
- [ ] PWA install + offline-friendly meal logging
- [ ] Guest meal rules and cook-salary presets
- [ ] Public “how settlements work” explainer for trust

### Later
- [ ] Android companion for daily meal entry
- [ ] Multi-flat manager view
- [ ] SMS digest for members without smartphones

Feedback and issues welcome on GitHub.

---

## Architecture (for contributors)

- **Next.js 16** App Router + React 19 + TypeScript
- **Supabase** Auth, PostgreSQL, Storage, Realtime
- Database-enforced tenancy/RLS and transactional cycle closing
- Policy-aware implicit meals; immutable settlement snapshots
- Cents-precision accounting with cycle-level rounding reconciliation
- Departure proration, mess-closed/holiday days, manager RBAC
- English/Bangla-ready UI with BDT formatting

### Local setup

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
- `NEXT_PUBLIC_APP_URL` — used for invite links (e.g. `https://meal-hisab-sigma.vercel.app`)
- `SUPABASE_SERVICE_ROLE_KEY` — server-only; never expose as `NEXT_PUBLIC_*`

### Supabase

Apply every file in `supabase/migrations/` in filename order. Production project: `mealhisab-bd` (`ap-south-1`).

Session refresh uses Next.js 16’s `src/proxy.ts` (not legacy `middleware.ts`).

### Production

Link a Vercel project to this repo (root = repository root). GitHub Actions runs typecheck, lint, and unit tests; Vercel handles preview and production deploys.

---

## License

Private / all rights reserved unless otherwise noted by the author.
