# Homepage Density Refactor Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the homepage above-the-fold information architecture so runtime status, running sessions, today's cost, 5-hour quota, 7-day quota, and anomaly reason are visible without scrolling.

**Architecture:** Reuse the existing snapshot payload and dashboard helpers, introduce a dense homepage control strip composed from existing card primitives, and move secondary copy/details behind accordions instead of adding new routes or backend endpoints. Add helper functions only where current formatting or quota ETA estimation logic is missing.

**Tech Stack:** React 19, Vite, Tailwind CSS v4, local shadcn/ui primitives, Node test runner

---

### Task 1: Lock the new homepage IA in tests

**Files:**
- Modify: `test/dashboardView.test.js`
- Test: `test/dashboardView.test.js`

**Step 1: Write the failing test**

Add assertions that the homepage source includes:
- compact first-screen control section copy
- running session list labels
- 5-hour / 7-day quota estimate copy
- anomaly red-dot / reason copy
- accordion-based detail disclosure

**Step 2: Run test to verify it fails**

Run: `node --test test/dashboardView.test.js`
Expected: FAIL because the new homepage control strip strings and helpers do not exist yet.

**Step 3: Write minimal implementation**

Implement only the helpers and JSX needed to satisfy the new assertions while preserving current sections and data bindings.

**Step 4: Run test to verify it passes**

Run: `node --test test/dashboardView.test.js`
Expected: PASS

### Task 2: Build the dense first-screen control strip

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/dashboard/page-header.jsx`
- Modify: `src/components/dashboard/section-card.jsx`
- Modify: `src/components/dashboard/metric-tile.jsx`
- Modify: `src/lib/dashboard-logic.mjs`

**Step 1: Write the failing test**

Expand helper tests for runtime duration and quota ETA estimation.

**Step 2: Run test to verify it fails**

Run: `node --test test/dashboardView.test.js`
Expected: FAIL because the helper functions and UI copy are missing.

**Step 3: Write minimal implementation**

Build a compact overview strip that shows:
- Codex runtime state + heartbeat
- running session rows
- today cost tile
- 5-hour and 7-day quota tiles with estimate badges
- anomaly indicator with one-line reason
- accordion details for secondary information

**Step 4: Run test to verify it passes**

Run: `node --test test/dashboardView.test.js`
Expected: PASS

### Task 3: Verify build/runtime and checkpoint artifacts

**Files:**
- Modify: `PLAN.md`
- Modify: `TASKS.md`
- Modify: `RISKS.md`
- Modify: `METRICS.md`
- Create: `logs/task-T43.md`
- Create: `RESULTS/T43.md`
- Create: `PATCHES/T43.diff`

**Step 1: Run targeted verification**

Run: `node --test test/dashboardView.test.js`
Expected: PASS

**Step 2: Run full verification**

Run: `npm run build`
Run: `npm test`
Expected: Build passes; full suite passes except any pre-existing sandbox-only socket skip.

**Step 3: Capture visual evidence**

Run a local browser smoke check and save a screenshot if the environment permits.

**Step 4: Record checkpoint artifacts**

Update plan/tasks/risks/metrics and write the task log/result/patch records with the verified outcome.
