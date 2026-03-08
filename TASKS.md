# Tasks

Last updated: 2026-03-08 22:00 Asia/Shanghai

| ID | Priority | Est | Slot | Status | Task | Input | Output | Validation | DoD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T1 | P0 | 10m | 1 | DONE | Confirm local Codex data sources | `~/.codex` files | source inventory | manual inspection | exact local files/fields identified |
| T2 | P0 | 15m | 1 | DONE | Create project scaffold and test harness | empty workspace | runnable app skeleton | `npm test` | tests execute in workspace |
| T3 | P0 | 20m | 1 | DONE | Implement usage aggregation service | SQLite + JSONL | normalized snapshot API | `npm test` | snapshot parser and SQL summary covered |
| T4 | P0 | 20m | 1 | DONE | Implement server + SSE | service layer | local HTTP app | `npm test` and manual startup | `/api/snapshot` and `/api/stream` work |
| T5 | P1 | 20m | 1 | DONE | Implement frontend dashboard | API endpoints | local dashboard UI | browser check | key usage/quota views render and auto-refresh |
| T6 | P0 | 15m | 1 | DONE | Final verification and evidence files | full app | results/metrics | `npm test`, startup smoke | evidence recorded |
| T7 | P0 | 20m | 1 | DONE | Add model pricing, cost estimate, Chinese UI, and M-unit formatting | session model fields + OpenAI pricing | enriched dashboard | `npm test` and browser smoke | model/cost/limits visible and layout stable |
| T8 | P0 | 15m | 1 | DONE | Bootstrap standalone Git repo and GitHub publication metadata | current workspace | independent repo, README, ignore rules, initial commit | `npm test`, `git status --short --branch` | project is safe to push without leaking parent home directory files |
| T9 | P0 | 20m | 1 | DONE | Refine dashboard pricing, tabs, combined chart, plan badge, reset progress, and selectable Codex home | current dashboard + live snapshot service | updated UI, mutable source endpoint, regression tests, checkpoint docs | `npm test` and browser smoke | requested UX and data-source behaviors are implemented and verified |
| T10 | P0 | 10m | 1 | DONE | Fix stale rate-limit snapshot selection | current live snapshot selection logic | rate limit chooser uses actual rate-limit timestamps | `npm test` and local snapshot inspection | dashboard window percentages match latest local status event |
| T11 | P0 | 20m | 1 | DONE | Redesign billing analytics view with scope toggle, range brush, and table headers | current billing tab UI | clearer chart, selectable date range, cumulative/month switch, tabular ledger | `npm test` and browser smoke | billing tab is easier to read and supports fast time-range filtering |
| T12 | P0 | 15m | 1 | DONE | Remove first-request snapshot blocking | current live snapshot warmup path | async warmup, cached first response, regression tests | `npm test` and latency spot-check | dashboard HTML and first snapshot return quickly while full data continues loading in background |
| T13 | P0 | 15m | 1 | DONE | Refine all-session table, pricing exclusions, and dashboard copy | current snapshot payload + UI copy | paginated all-session table, removed mini row, clearer wording | `npm test` and browser smoke | all sessions are browsable 10/page with id+created time, copy is understandable, and unwanted pricing row is gone |
| T14 | P0 | 20m | 1 | DONE | Integrate OpenClaw ChatGPT/Codex usage into the local dashboard | `codexbar cost` output + existing snapshot API | normalized OpenClaw usage block, dedicated dashboard panel, regression tests | `node --test` and local HTTP smoke | dashboard shows OpenClaw session/30-day/model summaries without breaking core Codex views |
| T15 | P0 | 15m | 1 | DONE | Install fixed-port background service on 4329 | current app + local macOS launchd | repo-local launch script, launchd plist, loaded user job on 4329 | `launchctl print`, `curl http://127.0.0.1:4329/` | dashboard survives this chat session and stays reachable on 4329 |
| T16 | P0 | 20m | 1 | DONE | Move full snapshot refresh off the main thread | current background refresh path | child-process snapshot loader, responsive HTTP loop, regression tests | `npm test` and latency spot-check on 4329 | static and snapshot endpoints stay fast even during full refresh |
| T17 | P0 | 10m | 1 | DONE | Mark stale limit snapshots after reset time | current quota card rendering | stale reset hint, non-misleading progress state, regression tests | `npm test` and browser/API spot-check | expired local quota snapshots are labeled as stale instead of looking like a failed reset |
