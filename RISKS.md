# Risks

Last updated: 2026-03-08 21:43 Asia/Shanghai

| ID | Risk | Trigger | Mitigation | Rollback |
| --- | --- | --- | --- | --- |
| R1 | No absolute quota totals available locally | session logs only expose percentages | show percentages, reset times, plan type, and clearly label missing hard caps | omit hard-cap widgets |
| R2 | Session JSONL parsing is expensive | many archived sessions or large files | parse recent files first, cache results, expose refresh interval | disable live details and keep SQLite-only view |
| R3 | File watching misses updates | OS-specific watcher behavior | use timed refresh plus SSE | revert to client polling only |
| R4 | Project is currently inside a parent Git repository rooted at `/Users/helena` | running Git from this workspace shows home-directory files | initialize a nested repo in this workspace before any add/commit/push | do not run `git add .` against the parent repo |
| R5 | User-selected path is invalid or not a Codex directory | UI submits a folder without `state_5.sqlite` | validate path server-side and return a Chinese error message without changing the current source | keep previous `codexHome` and ask user to reselect |
| R6 | Latest thread activity can mask older quota snapshots | a thread gets newer token events after an older `rate_limits` event | compare quota freshness using `rateLimitsAt` instead of thread `latestTimestamp` | fall back to the newest explicit rate-limit event only |
| R7 | Ledger range controls can become confusing when the selected scope has few days | switching from cumulative to month shrinks the available time window | reset/clamp slider bounds per scope and show explicit selected date labels | revert to fixed presets only if manual range controls prove too error-prone |
| R8 | First background full refresh still does heavy synchronous log parsing | large local session history | keep the heavy work off the request path and always return cached/placeholder snapshots first | move full parsing to a worker or persisted cache if history grows further |
| R9 | LaunchAgent reload may fail if a stray manual process already holds port 4329 | previous ad-hoc `node server/index.js` still listening | kill the existing listener before `launchctl bootstrap` and verify with `launchctl print` + `lsof` | boot out the LaunchAgent and restart manually |
