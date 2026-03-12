# T25 Log

- 2026-03-12 22:20 Asia/Shanghai: reviewed startup scripts and found the runtime still assumed `public/` had already been built.
- 2026-03-12 22:21 Asia/Shanghai: updated `package.json` scripts and `scripts/run-dashboard.sh` so both manual and launchd startup rebuild the client before serving.
- 2026-03-12 22:23 Asia/Shanghai: ran `npm test` to confirm the new startup/build alignment did not break the migrated React frontend or backend tests.
