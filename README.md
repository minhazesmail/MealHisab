# MealHisab BD

**Simple, fair meal accounting for Bangladeshi messes, shared flats, and small households.**

MealHisab replaces notebooks, spreadsheets, and WhatsApp math with one calm ledger for meals, groceries, contributions, and end-of-month balances.

**Production verification deployment refreshed — 2026-08-24.**

**Live app:** [meal-hisab-hemiln.vercel.app](https://meal-hisab-hemiln.vercel.app)

---

## Product vision

Every shared kitchen in Bangladesh still settles the month with ad-hoc lists and screenshots. MealHisab is built so that:

1. **Everyone sees the same numbers** — one source of truth for meals, expenses, and balances.
2. **The rules match real mess life** — opt-out or opt-in meals, holidays, mid-cycle join/leave, cook salary and gas in the pot.
3. **Closing the month is boring** — snapshot settlements, carry balances, no late-night spreadsheet fights.

We optimise for trust, clarity, and the way Bangladeshi messes actually work — not for generic “expense apps.”

## Who it’s for

- Bachelor messes and shared flats (3–15 people)
- Small households that share food costs
- Managers who need a clean monthly close without becoming accountants

## Features

| Area | What you get |
|------|----------------|
| **Meals** | Lunch, dinner, extra/guest; opt-out (default) or opt-in policy; **date auto-assigned** (Asia/Dhaka, clamped to open cycle) |
| **Calendar** | Month view of cycle days, your meals, and mess-closed holidays |
| **Expenses** | Grocery, cook salary, gas, other — all in settlement cost |
| **Contributions** | Record deposits; **date auto-assigned** the same way as meals; balances update live |
| **Settlement** | Immutable cycle snapshots, opening/closing balances, residual rounding reconciliation, partial payments |
| **Invites** | Shareable invite flow + short code; copy or native share (WhatsApp-friendly), 10 codes/month |
| **Holidays** | Mark mess-closed days so opt-out meals don’t create phantom charges |
| **Vacation** | Member leave / meal freeze with manager approval for longer breaks |
| **Guest meals** | Configurable host/shared/free-limit policy with optional manager approval |
| **Billing** | ৳99/month Manager Plan with manual bKash, Nagad, and Rocket payment verification |
| **Subscription recovery** | 7-day grace, read-only recovery, export/support takeover requests |
| **Meal reminders** | In-app lunch/dinner reminders with quiet hours and Bangla/English preferences |
| **Festival mode** | Regular/short/Eid/festival cycle types, pause meals, festival expenses |
| **Roles** | Manager/admin RBAC for expenses, cycle close, closed days |
| **Language** | English + বাংলা UI; BDT formatting with optional Bangla digits |
| **Privacy** | Flat-level tenancy, Supabase Auth (email OTP by default, optional phone OTP), RLS |

---

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
- `SUPABASE_SERVICE_ROLE_KEY` — server-only; never expose as `NEXT_PUBLIC_*`
- `CRON_SECRET` — protects scheduled reminder execution
- `MEALHISAB_BKASH_NUMBER` / `MEALHISAB_NAGAD_NUMBER` / `MEALHISAB_ROCKET_NUMBER` — Manager Plan payment instructions

### Production

Link the Vercel project to this repo (root = repository root). Vercel handles preview and production deploys.