# Tasks

Last updated: 2026-03-08 18:05 Asia/Shanghai

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
