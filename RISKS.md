# Risks

Last updated: 2026-03-08 18:03 Asia/Shanghai

| ID | Risk | Trigger | Mitigation | Rollback |
| --- | --- | --- | --- | --- |
| R1 | No absolute quota totals available locally | session logs only expose percentages | show percentages, reset times, plan type, and clearly label missing hard caps | omit hard-cap widgets |
| R2 | Session JSONL parsing is expensive | many archived sessions or large files | parse recent files first, cache results, expose refresh interval | disable live details and keep SQLite-only view |
| R3 | File watching misses updates | OS-specific watcher behavior | use timed refresh plus SSE | revert to client polling only |
| R4 | Project is currently inside a parent Git repository rooted at `/Users/helena` | running Git from this workspace shows home-directory files | initialize a nested repo in this workspace before any add/commit/push | do not run `git add .` against the parent repo |
