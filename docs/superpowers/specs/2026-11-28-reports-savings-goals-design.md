# Reports savings goals — short design

Date: 2026-11-28

## Intent

Move the three existing savings goals into **Reports** as one compact tile, and remove the **Budget & savings** tab entirely. The tile must show progress and let the user change each goal's monthly target. Saved amounts must remain traceable to the Savings transactions that produced them.

## Goals

- Reports shows one “Savings goals” panel with Emergency Fund, Wedding, and Extra Savings progress.
- Each row shows current saved amount, monthly target, and a progress bar.
- An Edit button opens the existing monthly-target editor and saves through the normal `billplan` record.
- Each row links to Transactions filtered to group `Savings` and that exact category.
- Sidebar, mobile More menu, and all view-switching code no longer expose “Budget & savings”.

## Non-goals

- No new savings goal ID, contribution record, or separate savings account.
- Do not remove Savings categories, Savings transactions, `billplan`, or the “Savings intentions” section in Monthly bills; Reports still depends on them.
- Do not remove or migrate existing user records.

## Constraints

- Amounts are centavos; use the existing amount parse/format helpers.
- Target writes go through `/api/records` with the existing `version` conflict behavior and same-origin checks.
- Goal names are exact: `Emergency Fund`, `Wedding`, `Extra Savings`.
- Target keys are exact: `emergency`, `wedding`, `savings`.

## Approaches

1. **Chosen — one Reports tile.** Reuse the existing target record and transaction-derived totals; add a click-through to already-supported category filtering. Smallest change that satisfies the request.
2. Move the old Budget & savings view wholesale into Reports. Rejected: carries over the unrelated balance panel and several cards instead of one tile.
3. Introduce a new savings-goal model with goal IDs and linked contributions. Rejected: large migration; the existing category already identifies the goal.

## Design

- Keep the current view state and nav array in `app/budget-app.tsx`, but delete the `Budget & savings` entry, its subtitle branch, its view block, and the mobile More entry. Clean up imports and CSS selectors used only by that view.
- Add a `Savings goals` panel to Reports, using `categories.Savings` order and the same target lookup as the old view: `billplan-<month>` payload keys `emergency`, `wedding`, `savings`.
- Calculate each row's current amount from report-period `Savings` transactions with the matching category, so the tile respects the selected month/7-days/custom range.
- Put one Edit button in the panel header. Reuse the existing target modal and write path, including centavo conversion and version merge. Move the `targetGoal`/`targetValue` state to Reports rather than deleting it.
- Put a link/chevron on each row that switches to Transactions with group `Savings` and that category selected, reusing the existing `setView`/filter pattern.
- Keep Monthly bills and all transaction/billplan schemas unchanged.

## Builder latitude

- Choose the exact JSX/CSS placement inside Reports so the tile matches the existing panel and stat-card styling.
- Preserve the existing focus, hover, and reduced-motion conventions.
- Verify with `tsc --noEmit`, the existing node tests, `npm run build`, and a live browser check of the tile, target save, and transaction link.
