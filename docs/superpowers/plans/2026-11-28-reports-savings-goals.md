# Reports Savings Goals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the three existing savings goals in one Reports tile with progress, target editing, and transaction links, then remove the Budget & savings tab.

**Architecture:** Add one pure helper in `app/budget-data.ts` that derives goal progress from the selected report rows and the existing `billplan` target record. Wire it into a compact Reports panel in `app/budget-app.tsx`, reusing the existing `/api/records` write path and Transactions filters. Delete only the old view and its view-specific code; keep the underlying savings transactions and billplan record.

**Tech Stack:** Next.js 16 App Router, React/TypeScript, existing hand-built CSS, Supabase-backed `/api/records`, Node assert scripts.

**Spec:** `docs/superpowers/specs/2026-11-28-reports-savings-goals-design.md`

## Global Constraints

- App name stays exactly `Pocket.`.
- Exact goal names: `Emergency Fund`, `Wedding`, `Extra Savings`.
- Exact target keys: `emergency`, `wedding`, `savings`.
- Target record id: `billplan-<month>`, e.g. `billplan-2026-11`.
- Amounts are centavos; parse with `cents()` from `app/budget-data.ts` and format with `money()`.
- Target writes must use the existing `write()` helper so `409` version conflicts refresh rows and surface errors.
- Do not add dependencies or a new savings data model.
- Do not remove Savings categories, Savings transactions, `billplan` schema/API, or Monthly bills “Savings intentions”.
- Dark mode is default; changes are color/design only and must respect existing focus and reduced-motion conventions.

## Review Focus

- Exact goal/category mapping — `Wedding→wedding`, `Extra Savings→savings`, `Emergency Fund→emergency`; Task 1 test asserts the full mapping.
- Period selection — the tile must use `reportRows`, not always the current month; Task 1 test asserts a subset changes only the matching goal's saved amount.
- Zero or missing target — progress must be `0%`, never `NaN`; Task 1 test asserts all targets are `0` when no billplan exists.
- Transaction drill-down — each row must land on Transactions with `filter='Savings'` and `sub=<exact category>`; Task 2 browser step asserts the selected chip and subcategory.
- Target save conflict — an outdated `version` must not silently overwrite; Task 2 verification step checks the existing `write()` path saves and reloads correctly, while `node test-bills-api.mjs` covers billplan validation.

---

### Task 1: Derive savings goal progress

**Files:**
- Modify: `app/budget-data.ts`
- Test: `test-savings-goals.mjs`

**Interfaces:**
- Consumes: `categories`, `RecordRow`, `Txn` from `app/budget-data.ts`.
- Produces: `savingsTargetKey` mapping goal name → billplan key; `savingsGoals(rows:RecordRow[], periodRows:RecordRow[], month:string)` returning `{category:string; key:string; saved:number; target:number}[]` in `categories.Savings` order.

- [ ] **Step 1: Write the failing test**

Create `test-savings-goals.mjs` with:

```js
import assert from 'node:assert/strict';
import {savingsGoals,savingsTargetKey} from './app/budget-data.ts';

const tx=(category,amount,date='2026-11-28')=>({id:category+amount+date,kind:'transaction',version:0,payload:{group:'Savings',category,amount,date}});
const rows=[
 tx('Wedding',50000),
 tx('Extra Savings',50000),
 tx('Emergency Fund',50000),
 {id:'billplan-2026-11',kind:'billplan',version:2,payload:{month:'2026-11',emergency:50000,wedding:1000000,savings:50000}}
];
const goals=savingsGoals(rows,rows,'2026-11');
assert.deepEqual(goals.map(g=>[g.category,g.key,g.saved,g.target]),[
 ['Wedding','wedding',50000,1000000],
 ['Extra Savings','savings',50000,50000],
 ['Emergency Fund','emergency',50000,50000]
]);
assert.equal(savingsTargetKey['Emergency Fund'],'emergency');
assert.equal(savingsTargetKey['Wedding'],'wedding');
assert.equal(savingsTargetKey['Extra Savings'],'savings');
const weddingOnly=rows.filter(r=>r.kind!=='transaction'||r.payload.category==='Wedding');
assert.equal(savingsGoals(rows,weddingOnly,'2026-11')[1].saved,0);
assert.ok(savingsGoals(rows.filter(r=>r.kind!=='billplan'),rows,'2026-11').every(g=>g.target===0));
assert.ok(savingsGoals([],[],'2026-11').every(g=>g.saved===0&&g.target===0));
console.log('PASS: savings goal mapping, period totals, targets, and zero targets.');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-savings-goals.mjs`
Expected: FAIL because `savingsGoals` is not exported.

- [ ] **Step 3: Implement the helper**

In `app/budget-data.ts`, export `savingsTargetKey` with the three exact mappings and implement `savingsGoals` to:
1. Find `rows` entry with `id === 'billplan-' + month`.
2. Map `categories.Savings` in order.
3. Sum `periodRows` where `payload.group === 'Savings'` and `payload.category === category`.
4. Read target from the billplan payload using `savingsTargetKey[category]`, defaulting to `0`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node test-savings-goals.mjs`
Expected: PASS with the line above.

- [ ] **Step 5: Commit**

```bash
git add app/budget-data.ts test-savings-goals.mjs
git commit -m "Add savings goal progress helper"
```

---

### Task 2: Add Reports savings goals tile and target editor

**Files:**
- Modify: `app/budget-app.tsx`
- Modify: `app/ledger-polish.css`
- Test: browser DOM check in Step 5; `test-savings-goals.mjs` covers the calculation.

**Interfaces:**
- Consumes: `savingsGoals`, `savingsTargetKey`, `cents`, `money`, `reportRows`, `month`, `rows`, `write`, `busy`, `setView`, `setFilter`, `setSub`, `setAccountFilter`, `setSearch`.
- Produces: Reports panel with one Edit button and three transaction-link rows; no new exported functions.

- [ ] **Step 1: Add Reports target-editor state**

In `BudgetApp`, add `savingsEditOpen:boolean` and `savingsDraft:{emergency:string;wedding:string;savings:string}` state. Leave the existing `targetGoal`/`targetValue` state untouched until Task 3.

- [ ] **Step 2: Insert the Reports panel**

Inside the `view==='Reports'` fragment, after `.stats` and before `.two-columns`, add one `<section className="panel savings-goals">` with:
- `.panel-title` containing `<h3>Savings goals</h3>`, `<p>Recorded in {reportLabel}</p>`, and one `<button className="text-button">Edit <Pencil size={14}/></button>`.
- Three rows from `savingsGoals(rows, reportRows, month)`, each a `<button className="bill-saving" aria-label={'View '+category+' savings transactions'}>` showing the category icon, `{money(saved)} / {money(target)}`, a `.progress span` with width `target ? Math.min(100, saved / target * 100) + '%' : '0%'`, and `<ChevronRight size={15}/>`.
- Row click: `setFilter('Savings'); setSub(category); setAccountFilter('All accounts'); setSearch(''); setView('Transactions'); window.scrollTo(0,0)`.
- Edit click: seed `savingsDraft` from `billplan-<month>` payload values divided by 100, defaulting missing keys to `''`, then open the modal.

- [ ] **Step 3: Add the target modal and CSS**

Add a `Modal` rendered when `savingsEditOpen` with title `Monthly savings targets`, three labeled decimal inputs (`Emergency fund minimum`, `Wedding`, `Extra savings`), the hint `Targets are plans, not recorded savings deposits.`, and `Save targets`. On submit: parse each value with `cents()`, reject invalid or zero with `Enter a positive amount with up to two decimal places.`, then call `write({action:'save',kind:'billplan',id:'billplan-'+month,version:plan?.version||0,payload:{...plan?.payload,month,emergency,wedding,savings}})` and close only on success. In `app/ledger-polish.css`, add one rule making `.savings-goals .bill-saving` a full-width borderless button with inherited color and left-aligned text.

- [ ] **Step 4: Run static checks**

Run: `node test-savings-goals.mjs && node test-bills-api.mjs && node node_modules/typescript/bin/tsc --noEmit && npm.cmd run build`
Expected: all pass; build exits 0.

- [ ] **Step 5: Verify in browser**

Use a local/dev or throwaway preview instance, not production user data. At 1280px and 390px, confirm the panel shows exactly the three goals and progress percentages match the helper. Click the `Wedding` row and confirm Transactions shows the `Savings` chip selected and subcategory `Wedding`. Return to Reports, click Edit, change Wedding target to `12000`, save, reload, confirm `500.00 / 12,000.00`, then restore the original target.

- [ ] **Step 6: Commit**

```bash
git add app/budget-app.tsx app/ledger-polish.css
git commit -m "Add savings goals tile to Reports"
```

---

### Task 3: Remove Budget & savings tab and dead code

**Files:**
- Modify: `app/budget-app.tsx`
- Modify: `app/globals.css`
- Modify: `app/refinement.css`
- Modify: `app/mobile.css`
- Modify: `app/ledger-polish.css`

**Interfaces:**
- Consumes: the six remaining nav labels from Task 2; Reports panel from Task 2.
- Produces: sidebar and mobile More menu without `Budget & savings`.

- [ ] **Step 1: Remove nav and view code**

In `app/budget-app.tsx`:
- Remove `{label:'Budget & savings',icon:Target}` from `nav`.
- Remove the `view==='Budget & savings'` subtitle clause.
- Remove the entire `{view==='Budget & savings'&&...}` block at current line 139.
- Remove `targetGoal`, `targetValue`, and the `{targetGoal&&<Modal...>}` block at current line 148.
- Remove `Target` from the lucide import if no longer used. Keep `Heart` because the icon map still uses it.

- [ ] **Step 2: Remove view-only CSS**

Delete selectors used only by the removed view: `.budget-detail`, `.savings-heading`, `.savings-card`, `.goal-progress`, and the `.template-grid:has(>.savings-card:hover)` hover rules. Keep `.bill-saving`, `.progress`, and `.saving`.

- [ ] **Step 3: Verify no references remain**

Run: `grep -R "Budget & savings\|budget-detail\|savings-heading\|savings-card\|goal-progress\|targetGoal" app`
Expected: no matches.

- [ ] **Step 4: Run full checks**

Run: `node test-savings-goals.mjs && node test-import.mjs && node node_modules/typescript/bin/tsc --noEmit && npm.cmd run build`
Expected: all pass; build exits 0.

- [ ] **Step 5: Browser check**

Refresh desktop and 390px mobile views. Confirm the sidebar has six tabs, the mobile More sheet has `Monthly bills`, `Reports`, `Templates`, and the Reports savings tile still works. Check console for errors.

- [ ] **Step 6: Commit and push**

```bash
git add app/budget-app.tsx app/globals.css app/refinement.css app/mobile.css app/ledger-polish.css
git commit -m "Remove Budget and savings tab"
git push origin main
```
