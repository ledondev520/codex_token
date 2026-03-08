# Billing UX Refinement Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the billing tab easier to read by replacing the ambiguous chart with a scoped analytics view that supports cumulative vs. natural-month totals, draggable date ranges, and a proper ledger table.

**Architecture:** Keep all data aggregation on the existing snapshot payload and move the refinement entirely into the static frontend. Derive scope summaries and range-filtered rows client-side from `dailyLedger`, then render a dual-axis SVG chart, range controls, and a headed table from the same filtered slice.

**Tech Stack:** Node.js, static HTML/CSS/JS, native test runner, Playwright smoke checks

---

### Task 1: Lock the desired billing behaviors with failing tests

**Files:**
- Modify: `test/dashboardView.test.js`
- Modify: `test/app.test.js`

**Step 1: Write the failing test**

Cover:
- natural-month row filtering
- visible range slicing
- richer chart markup with axes and brush hint
- billing HTML with scope controls, time-range controls, and ledger headers

**Step 2: Run test to verify it fails**

Run: `npm test -- test/dashboardView.test.js test/app.test.js`

### Task 2: Rebuild the billing panel

**Files:**
- Modify: `public/index.html`
- Modify: `public/styles.css`
- Modify: `public/app.js`

**Step 1: Write minimal implementation**

- add `累计 / 自然月` switch
- add quick presets and draggable range sliders
- derive visible rows from `dailyLedger`
- replace the old ledger list with a table
- improve chart readability with left/right y-axis labels and explicit range labels

**Step 2: Run test to verify it passes**

Run: `npm test`

### Task 3: Verify in a browser and checkpoint

**Files:**
- Modify: `PLAN.md`
- Modify: `TASKS.md`
- Modify: `METRICS.md`
- Modify: `RISKS.md`
- Create: `RESULTS/t11.md`
- Create: `logs/task-t11.md`
- Create: `PATCHES/t11.diff`

**Step 1: Run browser smoke**

Verify:
- natural-month toggle changes totals
- dragging the range sliders updates the date label
- ledger table keeps visible headers
- pricing table no longer duplicates `GPT-5.4`
