# Pocket — Daily Budget
Private personal budget tracker built with Next.js, Supabase Postgres, and Supabase Auth.

## Features
- PHP amounts stored as integer centavos; Philippine calendar dates.
- Exact user categories: Income, Expenses, Bills, Savings, and all supplied subcategories.
- Transactions with dates, notes, editing and confirmed deletion.
- Editable templates, recent-category suggestions, and deterministic quick-entry previews.
- Monthly budget limits, remaining spending, savings contributions, reports and CSV export.
- Responsive mobile navigation and desktop sidebar.
- Email-and-password sign-in with authenticated, per-user database rows.
- Refresh on focus and every 15 seconds while visible; optimistic record versions reject conflicting edits.

## Stack

- Next.js App Router on Vercel.
- Supabase Postgres for records, Supabase Auth (email + password) for sign-in.
- Drizzle ORM with the `postgres` driver over Supabase's shared pooler (transaction mode).

## Setup

Install Node 22.13+ and run `npm.cmd run install:ci` on Windows (`npm run install:ci` elsewhere).

Create a Supabase project and run `supabase/migrations/0000_initial.sql` and `supabase/migrations/0001_rls_initplan.sql` in the SQL editor. Enable email sign-in and create your user.

Set these environment variables locally in `.env.local` and in Vercel:

- `DATABASE_URL` — Supabase shared pooler connection string in transaction mode (port `6543`). Copy the exact host from Dashboard > Connect; it cannot be inferred from the region. Percent-encode reserved characters in the password.
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key.

Then run `npm.cmd run dev`. The app is available at http://localhost:5173/. Use `npm.cmd run build` and `npm.cmd run start` for the production build. Deploy the repository to Vercel with the same environment variables.

Supabase's free plan pauses a project after one week of inactivity; open the app at least weekly or upgrade to avoid the pause.

## Migrating local records

`outputs/local-records.json` contains the records from the original local D1 preview. Put the values below in `.env.local` (the script loads it automatically) or export them in your shell. Either set `SUPABASE_USER_ID` to your Supabase user UUID, or set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_USER_EMAIL`. Then run:

`npm.cmd run db:import`

The import preserves record ids, kinds, payloads and versions.

## Tests

With the app running locally and Supabase configured:

- `node --experimental-strip-types test-budget.mjs`
- `node node_modules/typescript/bin/tsc --noEmit`
- `npm.cmd run build`

The API tests sign in with `SUPABASE_USER_EMAIL` and `SUPABASE_USER_PASSWORD` (see `.env.example`). They use disposable records only and validate centavo conversion, dates, group rules, savings separation, authentication, CRUD, concurrency, same-origin writes and quick entry.

## Scope
Requires internet to load and save data. No offline queue, bank connection, scheduled transfers, AI service or native app installer.
Quick entry uses category matching, not a language model. Always review before saving.
Savings are recorded contributions, not bank balances. Unallocated totals apply to the selected period, not a running account balance.
Default budget is unset; no financial records are seeded in production.

