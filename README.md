# Home Base — Dashboard

A phone-friendly version of your finance dashboard: paycheck status, the four
tap-to-confirm bill pills (Rent, Utilities, Car Payment, Discover), Sarah's
runway goal, and the worst-case startup runway. Built with Next.js + Supabase,
made to deploy on Vercel.

## 1. Create a free Supabase project

1. Go to supabase.com → New project. Pick any name/password, any region.
2. Once it's ready, open **SQL Editor → New query**, paste in the entire
   contents of `supabase/schema.sql`, and run it. This creates the tables and
   seeds them with your real numbers (rent, utilities, car payment, Discover,
   checking balance, etc.) so the app isn't empty on first load.
3. Go to **Project Settings → API**. Copy the **Project URL** and the
   **anon public key**.

## 2. Configure the app

Copy `.env.example` to `.env.local` and paste in the two values from step 1:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Then, locally, to try it before deploying:

```
npm install
npm run dev
```

Open http://localhost:3000.

## 3. Deploy to Vercel

1. Push this folder to a new GitHub repo (or use the Vercel CLI: `npx vercel`).
2. In Vercel, **Add New Project**, import the repo.
3. Under **Environment Variables**, add the same two `NEXT_PUBLIC_SUPABASE_URL`
   and `NEXT_PUBLIC_SUPABASE_ANON_KEY` values.
4. Deploy. Vercel gives you a URL you can add to your phone's home screen
   (Share → Add to Home Screen) so it opens like an app.

Hunter can open the same URL on his phone — there's no login yet, so anyone
with the link can see and tap things. That's fine for a private link between
the two of you; if you ever want to lock it down, Supabase Auth is a
straightforward next step.

## How the numbers work

- **This paycheck / committed / left after bills**: pulled from the
  `settings` row — `home_base_committed` for Paycheck A, `operations_committed`
  for Paycheck B, whichever `current_paycheck_letter` is set to.
- **Bill pills reset automatically every pay period.** The app computes the
  current 14-day pay period from your real June 25, 2026 payday, so you never
  have to update a date by hand — paid status starts fresh each cycle.
- **Tapping an unpaid bill** shows the "are you sure" confirmation before it
  turns green. **Tapping a paid bill** un-marks it immediately (no
  confirmation needed to undo a mistake).
- **Sarah's runway goal** shows the most recent row in `income_log` against
  the `sarah_goal` ($250). Add new rows each payday (directly in Supabase's
  Table Editor for now — a quick-entry form is a natural next addition).
- **Startup runway (worst case)** = if Sarah earned $0 starting today, how
  many weeks the checking buffer covers the gap between
  `monthly_obligations_total` (annualized properly across 26 paychecks/year,
  not just split by 2) and Hunter's paycheck alone.

## Editing your numbers

Everything on the dashboard reads from two Supabase tables:

- **`settings`** (one row) — checking balance, buffer goal, which paycheck
  letter you're on, committed totals, monthly obligations, Sarah's goal, the
  lump-sum calculator amount, and the two yes/no health flags.
- **`bills`** — the four tappable bills (name, amount, due day, which
  paycheck they belong to).

Edit either table directly in Supabase's Table Editor — changes show up on
next reload, no redeploy needed.

## What's deliberately not in this version yet

This first build is Dashboard-only, by design, so you have something real on
your phone fast. Not yet included (future additions): Monthly Expense
Breakdown, full Paycheck Templates, Debt Dashboard, Annual Sinking Funds,
Spending Tracker for Hunter, Wants/Overflow list. Each can be added as its own
page (`app/<name>/page.tsx`) plus a Supabase table, following the same
pattern as the Dashboard.
