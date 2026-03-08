# Codex Usage Dashboard Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a standalone local dashboard that visualizes Codex token usage, rate-limit snapshots, and recent session activity from `~/.codex`.

**Architecture:** The app uses a small Node.js server to read SQLite history and recent session JSONL files, then serves a static frontend with SSE-based live updates. Historical totals come from SQLite; near-real-time token and quota detail come from recent session event streams.

**Tech Stack:** Node.js, Express, better-sqlite3, native test runner, static HTML/CSS/JS, SSE

---

### Task 1: Scaffold project and checkpoints

**Files:**
- Create: `package.json`
- Create: `server/index.js`
- Create: `server/app.js`
- Create: `PLAN.md`
- Create: `TASKS.md`
- Create: `RISKS.md`
- Create: `METRICS.md`

**Step 1: Write the failing test**

Create a test that imports the future usage service and expects a normalized snapshot object.

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because service module does not exist yet.

**Step 3: Write minimal implementation**

Add package metadata and empty server bootstrap.

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: tests execute and import resolves.

### Task 2: Aggregate SQLite and JSONL usage

**Files:**
- Create: `server/lib/codexPaths.js`
- Create: `server/lib/usageRepository.js`
- Test: `test/usageRepository.test.js`

**Step 1: Write the failing test**

Test normalization for:
- thread totals from SQLite-like rows
- latest token snapshot from session JSONL
- latest rate-limit snapshot

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because repository functions are missing.

**Step 3: Write minimal implementation**

Implement path resolution, SQL queries, and JSONL event parsing.

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS for repository tests.

### Task 3: Expose HTTP and live stream endpoints

**Files:**
- Create: `server/lib/liveSnapshotService.js`
- Modify: `server/app.js`
- Test: `test/app.test.js`

**Step 1: Write the failing test**

Test `GET /api/snapshot` and SSE connection response headers.

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because routes are missing.

**Step 3: Write minimal implementation**

Add snapshot endpoint, stream endpoint, and timed refresh broadcast.

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS for API tests.

### Task 4: Build dashboard UI

**Files:**
- Create: `public/index.html`
- Create: `public/styles.css`
- Create: `public/app.js`

**Step 1: Write the failing test**

Test frontend bootstrap helpers that map API payloads into dashboard cards.

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because formatter helpers do not exist.

**Step 3: Write minimal implementation**

Implement cards, charts/bars, tables, and SSE refresh behavior.

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS and dashboard loads in browser.

### Task 5: Verify and capture evidence

**Files:**
- Create: `RESULTS/dashboard.md`
- Create: `PATCHES/dashboard.diff`
- Modify: `TASKS.md`
- Modify: `METRICS.md`

**Step 1: Run verification**

Run:
- `npm test`
- `node server/index.js`

**Step 2: Manual smoke test**

Open the dashboard and confirm:
- current session token total
- recent sessions list
- daily totals
- latest quota snapshot and reset time
- live refresh without reload

**Step 3: Record evidence**

Save results summary and diff snapshot.
