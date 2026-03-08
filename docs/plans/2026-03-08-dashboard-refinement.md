# Dashboard Refinement Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refine the dashboard so pricing, billing trends, plan visibility, reset progress, and local-source switching match the March 8 product request.

**Architecture:** Keep the existing Node HTTP server and static frontend, but add a mutable runtime `codexHome` source, grouped pricing catalog generation on the server, and a richer tabbed interaction layer in the browser. Preserve the current SSE refresh model so source changes and live updates share the same rendering pipeline.

**Tech Stack:** Node.js, native test runner, static HTML/CSS/JS, Playwright smoke testing

---

### Task 1: Lock requested behavior with failing tests

**Files:**
- Modify: `test/dashboardView.test.js`
- Modify: `test/usageRepository.test.js`
- Modify: `test/app.test.js`

**Step 1: Write the failing test**

Cover:
- USD values rounded to two decimals
- grouped pricing rows with `GPT-5.4`
- tab markup and mutable source endpoint
- combined chart hover metadata and reset progress math

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL on formatter output, missing helpers, and missing `/api/source`.

### Task 2: Add grouped pricing and mutable source selection

**Files:**
- Modify: `server/lib/pricing.js`
- Modify: `server/lib/usageRepository.js`
- Modify: `server/lib/codexPaths.js`
- Modify: `server/lib/liveSnapshotService.js`
- Modify: `server/app.js`

**Step 1: Write minimal implementation**

- group equal-price models into one pricing row
- map `gpt-5.4-codex` display to `GPT-5.4`
- validate and apply user-selected `codexHome`
- expose `POST /api/source`

**Step 2: Run test to verify it passes**

Run: `npm test`
Expected: PASS for repository and API tests.

### Task 3: Rebuild the dashboard interaction layer

**Files:**
- Modify: `public/index.html`
- Modify: `public/styles.css`
- Modify: `public/app.js`

**Step 1: Write minimal implementation**

- add top-level plan badge and source form
- merge recent sessions and billing into tabs
- replace split charts with one hoverable token/cost chart
- add reset-progress bars and percentage labels

**Step 2: Run test to verify it passes**

Run: `npm test`
Expected: PASS for frontend helper tests.

### Task 4: Verify and record evidence

**Files:**
- Modify: `PLAN.md`
- Modify: `TASKS.md`
- Modify: `RISKS.md`
- Modify: `METRICS.md`
- Create: `RESULTS/t9.md`
- Create: `logs/task-t9.md`
- Create: `PATCHES/t9.diff`

**Step 1: Run verification**

Run:
- `npm test`
- Playwright smoke against a fixture-backed local server

**Step 2: Record evidence**

Document:
- plan badge is visible
- pricing rows are merged
- tab switch works
- tooltip reveals token and cost
- source switching endpoint is live
