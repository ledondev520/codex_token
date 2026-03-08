# Task T15 Log

- 2026-03-08 21:39 Asia/Shanghai: Verified `4329` was still being served by a manual `node` process and no existing launchd job owned the dashboard.
- 2026-03-08 21:40 Asia/Shanghai: Added a repo-local launch script and a launchd plist for `com.helena.codex-usage-dashboard`.
- 2026-03-08 21:40 Asia/Shanghai: Validated the plist with `plutil -lint` and marked the script executable.
- 2026-03-08 21:41 Asia/Shanghai: Killed the stray manual listener, bootstrapped the LaunchAgent, and confirmed `launchctl print gui/501/com.helena.codex-usage-dashboard` shows it as running.
- 2026-03-08 21:41 Asia/Shanghai: Verified `GET /` and `GET /api/snapshot` succeed on `http://127.0.0.1:4329`.
