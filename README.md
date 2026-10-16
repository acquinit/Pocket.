# Pocket — Daily Budget
Private personal budget tracker built with React, Vinext, and Cloudflare D1 for Sites.

## Features
- PHP amounts stored as integer centavos; Philippine calendar dates.
- Exact user categories: Income, Expenses, Bills, Savings, and all supplied subcategories.
- Transactions with dates, notes, editing and confirmed deletion.
- Editable templates, recent-category suggestions, and deterministic quick-entry previews.
- Monthly budget limits, remaining spending, savings contributions, reports and CSV export.
- Responsive mobile navigation and desktop sidebar.
- Owner-private Sites access and authenticated per-user database rows.
- Refresh on focus and every 15 seconds while visible; optimistic record versions reject conflicting edits.

## Local development
Install Node 22.13+ and run npm run install:ci.
Generate database migrations with npm run db:generate after schema changes.
Build with npm run build, apply pending migrations using the Sites local D1 instructions, then npm run dev.
Portable preview uses the starter's local sign-in fixture. Production uses Sites-managed authentication.
Local preview records are separate from production. Never commit .wrangler or .sites-runtime.

## Tests
With local preview running, run:
node --experimental-strip-types test-budget.mjs
node node_modules/typescript/bin/tsc --noEmit
npm run build

The API test uses disposable records only in the local database.
Validates centavo conversion, dates, group rules, savings separation, authentication, CRUD, concurrency, same-origin writes and quick entry.

## Scope
Requires internet to load and save data. No offline queue, bank connection, scheduled transfers, AI service or native app installer.
Quick entry uses category matching, not a language model. Always review before saving.
Savings are recorded contributions, not bank balances. Unallocated totals apply to the selected period, not a running account balance.
Default budget is unset; no financial records are seeded in production.

