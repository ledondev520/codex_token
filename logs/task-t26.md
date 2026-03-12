# T26 Log

- 2026-03-12 22:27 Asia/Shanghai: reviewed the migrated project for remaining non-UI correctness gaps and found alias config drift plus incomplete HTTP method handling.
- 2026-03-12 22:29 Asia/Shanghai: added `jsconfig.json` and Vite alias support so editor resolution matches `components.json`.
- 2026-03-12 22:30 Asia/Shanghai: implemented `HEAD` handling for `/`, `/index.html`, static assets, and `/api/snapshot`, then added HTTP regression assertions.
- 2026-03-12 22:32 Asia/Shanghai: ran `npm test` and confirmed the project still passes end to end.
