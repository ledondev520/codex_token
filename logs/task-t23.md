# T23 Log

- 2026-03-12 21:21 Asia/Shanghai: switched package management to Yarn 4 PnP and added a Vite client build pipeline that writes to `public/`.
- 2026-03-12 21:28 Asia/Shanghai: created React/Tailwind frontend source under `src/` and local shadcn component files under `src/components/ui/`.
- 2026-03-12 21:34 Asia/Shanghai: rebuilt the dashboard in React using the existing Node API, preserving session/billing/openclaw behavior and current source classification logic.
- 2026-03-12 21:37 Asia/Shanghai: migrated tests from the legacy `public/app.js` helpers to `src/lib/dashboard-logic.mjs` and updated the HTTP test for built React output.
- 2026-03-12 21:40 Asia/Shanghai: ran `npm test` and verified the built React frontend plus browser console state on `http://127.0.0.1:4329/`.
