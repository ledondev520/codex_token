# Dashboard Framework Refactor Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the main Codex dashboard information architecture so the page has no repeated status blocks, higher information density, and clearer shadcn/ui-aligned hierarchy.

**Architecture:** Keep the existing snapshot payload and helper functions, but collapse the current many-section homepage into four layers: compact top control bar, first-screen runtime overview, condensed operations summary, and session/billing workbench. Move secondary configuration and explanatory content behind shadcn `Accordion` disclosure instead of rendering large repeated sections by default.

**Tech Stack:** React 19, Vite, Tailwind CSS v4, local shadcn/ui primitives, Node test runner

---

### Task 1: Lock the new framework in regression tests

**Files:**
- Modify: `test/dashboardView.test.js`
- Test: `test/dashboardView.test.js`

**Step 1: Write the failing test**

Add assertions that:
- old high-level section titles like `数据源与刷新`, `总览`, `告警与说明`, `Round2 决策看板`, `限额补充信息` are no longer the primary homepage structure
- the homepage keeps one compact top control layer and one runtime overview layer
- secondary details are disclosed through accordion copy
- dead/redundant layout markers are absent

**Step 2: Run test to verify it fails**

Run: `node --test test/dashboardView.test.js`
Expected: FAIL because the current structure still uses multiple parallel summary sections.

**Step 3: Write minimal implementation**

Update only the source assertions needed to describe the new architecture.

**Step 4: Run test to verify it passes**

Run: `node --test test/dashboardView.test.js`
Expected: PASS

### Task 2: Refactor the page shell into a dense shadcn-style framework

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/dashboard/page-header.jsx`
- Modify: `src/components/dashboard/section-card.jsx`
- Modify: `src/components/dashboard/metric-tile.jsx`

**Step 1: Write the failing test**

Add or tighten assertions around:
- compact header/control bar
- single runtime overview section
- accordion-based secondary detail groups
- consolidated operations summary labels

**Step 2: Run test to verify it fails**

Run: `node --test test/dashboardView.test.js`
Expected: FAIL because the old shell still renders multiple top-level repeated sections.

**Step 3: Write minimal implementation**

Refactor the dashboard so:
- header becomes compact and utility-first, not hero-like
- connection/plan/source actions appear once
- runtime/session/today/quota cards remain above the fold
- totals, alerts, efficiency, failures, and rank summaries are condensed into one `运营摘要` section
- data source controls, alert settings, quota supplement, and rankings move behind shadcn `Accordion` items
- repeated wording is removed and copy is shortened

**Step 4: Run test to verify it passes**

Run: `node --test test/dashboardView.test.js`
Expected: PASS

### Task 3: Verify build/runtime and checkpoint artifacts

**Files:**
- Modify: `PLAN.md`
- Modify: `TASKS.md`
- Modify: `RISKS.md`
- Modify: `METRICS.md`
- Modify: `progress.md`
- Create: `logs/task-T47.md`
- Create: `RESULTS/T47.md`
- Create: `PATCHES/T47.diff`

**Step 1: Run targeted verification**

Run: `node --test test/dashboardView.test.js`
Expected: PASS

**Step 2: Run full verification**

Run: `npm run build`
Run: `npm test`
Expected: PASS

**Step 3: Capture visual evidence**

Open `http://127.0.0.1:4329/`, unlock the gate, and capture a browser snapshot/screenshot of the refactored top framework.

**Step 4: Record checkpoint artifacts**

Update plan/tasks/risks/metrics and write the task log/result/patch records with the verified outcome.
