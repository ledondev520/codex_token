# Metrics

Last updated: 2026-03-17 21:25 Asia/Shanghai

| Round | Metric | Value | Notes |
| --- | --- | --- | --- |
| 0 | Source coverage | 2 primary stores identified | SQLite threads + session JSONL token events |
| 0 | Verified local live token field | yes | session `event_msg.payload.info.total_token_usage` |
| 0 | Verified local quota field | yes | session `event_msg.payload.rate_limits` |
| 1 | Automated tests | 3 passing | `npm test` on 2026-03-08 12:14 Asia/Shanghai |
| 1 | Browser smoke test | pass | local page rendered live values at `http://127.0.0.1:4318` |
| 1 | Browser console errors | 0 | after favicon fix |
| 2 | Automated tests | 3 passing | `npm test` on 2026-03-08 13:52 Asia/Shanghai after pricing/UI changes |
| 2 | Model pricing | enabled | current session model, price source, and USD estimate shown |
| 2 | UI localization | complete | all primary user-facing copy is Chinese |
| 2 | Token unit format | complete | dashboard values switched to M (million tokens) |
| 3 | Daily ledger | enabled | daily token + daily USD estimated from `last_token_usage` |
| 3 | Line charts | enabled | separate token/cost SVG line charts |
| 3 | Pricing table | enabled | logs-derived models with displayed unit prices |
| 4 | GitHub bootstrap audit | parent repo detected | `git rev-parse --show-toplevel` returned `/Users/helena` before isolation |
| 4 | Git repo isolation | pass | `git init` created `/Users/helena/Cursor/codex_token/.git` and top-level now resolves locally |
| 4 | Automated tests | 3 passing | `npm test` on 2026-03-08 18:04 Asia/Shanghai during Git bootstrap |
| 5 | Automated tests | 7 passing | `npm test` on 2026-03-08 18:37 Asia/Shanghai after dashboard refinement |
| 5 | Browser smoke test | pass | Playwright verified plan badge, pricing merge, tab switch, hover tooltip, and `GPT-5.4` label on 2026-03-08 |
| 5 | Runtime source switching | enabled | `POST /api/source` updates `codexHome` without restarting the server |
| 5 | Pricing table grouping | enabled | identical unit-price models collapse into one row |
| 6 | Raw local rate-limit snapshot | 4% used / 4% used | latest local `rate_limits` event inspected from `~/.codex` on 2026-03-08 18:45 Asia/Shanghai |
| 6 | Automated tests | 8 passing | `npm test` on 2026-03-08 18:48 Asia/Shanghai after rate-limit selection fix |
| 7 | Automated tests | 9 passing | `npm test` on 2026-03-08 19:11 Asia/Shanghai after billing UX redesign |
| 7 | Browser smoke test | pass | verified natural-month toggle, draggable range sliders, billing table headers, and deduped `GPT-5.4` pricing row on `http://127.0.0.1:4326` |
| 7 | Billing scope switch | enabled | billing tab supports `累计` and `自然月` totals for fee and token |
| 8 | Automated tests | 10 passing | `npm test` on 2026-03-08 19:24 Asia/Shanghai after async warmup change |
| 8 | Cold-start HTML latency | 0.09s | measured on `http://127.0.0.1:4327/` |
| 8 | Cold-start snapshot latency | 0.006s | first `GET /api/snapshot` on `http://127.0.0.1:4327` after restart |
| 9 | Automated tests | 13 passing | `node --test` on 2026-03-08 21:24 Asia/Shanghai after OpenClaw integration |
| 9 | OpenClaw source | enabled | snapshot now includes `openclaw` from `codexbar cost --provider codex --format json` |
| 9 | OpenClaw model filter | enabled | dashboard only shows GPT / ChatGPT related models from the OpenClaw feed |
| 9 | HTTP smoke test | pass | `GET /api/snapshot` on `http://127.0.0.1:4328` returned `openclaw.source = local` and a top model |
| 10 | Launchd background service | active | `launchctl print gui/501/com.helena.codex-usage-dashboard` shows a running LaunchAgent on 2026-03-08 21:41 Asia/Shanghai |
| 10 | Fixed port 4329 | pass | `GET /` and `GET /api/snapshot` both succeeded on `http://127.0.0.1:4329` after bootstrap |
| 11 | VPS reverse proxy | active | nginx is listening on `0.0.0.0:18080` on 2026-03-12 00:02 Asia/Shanghai |
| 11 | Reverse tunnel reachability | pass | `curl http://127.0.0.1:14329/` succeeded on the VPS through the SSH reverse tunnel |
| 11 | Public mobile preview | pass | `curl -u <preview-user>:<preview-pass> http://23.81.118.51:18080/` returned the dashboard HTML on 2026-03-12 00:02 Asia/Shanghai |
| 12 | Public mobile preview without auth | pass | `curl http://23.81.118.51:18080/` returned the dashboard HTML on 2026-03-12 00:06 Asia/Shanghai |
| 13 | Automated tests | 23 passing | `npm test` on 2026-03-12 20:38 Asia/Shanghai after the shadcn-style layout refactor |
| 13 | Browser smoke test | pass | Playwright snapshot on `http://127.0.0.1:4318/` confirmed the new shell, stats, quota cards, sessions table, and OpenClaw side panel render together |
| 13 | Layout refactor | complete | static HTML/CSS now uses topbar + main stack + side panel while preserving existing render IDs and tab/filter hooks |
| 14 | Automated tests | 26 passing | `npm test` on 2026-03-12 20:57 Asia/Shanghai after source classification, prompt summaries, and shadcn-semantics cleanup |
| 14 | Browser smoke test | pass | Playwright verified the new `来源` column/filter, `Codex 本地` vs `OpenClaw / OAuth` badges, and prompt summary dialog on `http://127.0.0.1:4329/` |
| 14 | Token source split | enabled | session rows and the live-current card now expose local-Codex vs OpenClaw/OAuth usage labels based on local thread metadata |
| 15 | Automated tests | 27 passing | `npm test` on 2026-03-12 21:19 Asia/Shanghai after mobile density, user-turn extraction, fee-table cleanup, and live refresh race fix |
| 15 | Mobile source tabs | enabled | Playwright verified a mobile-width `Codex 本地` / `OpenClaw / OAuth` switcher on `http://127.0.0.1:4329/` |
| 15 | User-turn detail view | enabled | session detail now shows each captured local user turn from `event_msg.user_message`, not just the latest prompt summary |
| 16 | Frontend migration | complete | React + Vite + Tailwind + local shadcn components now generate the served `public/` app on 2026-03-12 21:40 Asia/Shanghai |
| 16 | Automated tests | 27 passing | `npm test` on 2026-03-12 21:40 Asia/Shanghai after the React/Vite migration |
| 16 | Browser console errors | 0 | Playwright console capture on `http://127.0.0.1:4329/` after the built React frontend loaded |
| 17 | Additional shadcn primitives | enabled | local `Select`, `Skeleton`, and `Separator` components were wired into the React dashboard on 2026-03-12 21:47 Asia/Shanghai |
| 17 | Automated tests | 27 passing | `npm test` on 2026-03-12 21:47 Asia/Shanghai after the shadcn post-migration polish pass |
| 17 | Browser console errors | 0 | Playwright console capture on `http://127.0.0.1:4329/` remained clean after adding the new primitives |
| 18 | Runtime build alignment | enabled | `npm start` and `scripts/run-dashboard.sh` now rebuild the React frontend before serving on 2026-03-12 22:23 Asia/Shanghai |
| 18 | Automated tests | 27 passing | `npm test` on 2026-03-12 22:23 Asia/Shanghai after startup/build pipeline alignment |
| 19 | Alias alignment | enabled | `jsconfig.json` and `vite.config.mjs` now expose the same `@ -> src` mapping as `components.json` on 2026-03-12 22:32 Asia/Shanghai |
| 19 | HTTP method coverage | enabled | root HTML, static assets, and `/api/snapshot` now answer `HEAD` as well as `GET` |
| 19 | Automated tests | 27 passing | `npm test` on 2026-03-12 22:32 Asia/Shanghai after alias + HTTP behavior cleanup |
| 20 | Billing range control | shadcn slider | billing tab now uses the local `Slider` primitive rather than raw `input[type=range]` controls on 2026-03-12 23:07 Asia/Shanghai |
| 20 | Quota progress semantics | streamlined | rate-limit cards now render the local `Progress` component directly without an extra handcrafted outer track |
| 20 | Automated tests | 27 passing | `npm test` on 2026-03-12 23:10 Asia/Shanghai after slider/progress shadcn cleanup + checkpoint updates |
| 20 | Browser smoke test | pass | Playwright snapshot on `http://127.0.0.1:4329/` shows a `slider` control under the billing tab’s `时间范围` section on 2026-03-12 23:07 Asia/Shanghai |
| 21 | Empty-state componentization | complete | local `Alert` + dashboard `EmptyState` now back all empty/fallback states in the React dashboard |
| 21 | Label primitive adoption | complete | source filters, source form metadata, and session detail headings now use shared `Label` component semantics |
| 21 | Palette tokenization | complete | slate hard-codes removed from `metric-tile`, `progress`, `slider`, `skeleton`, and `dialog` primitives |
| 21 | Billing chart theme alignment | complete | Recharts colors/ticks/tooltips now read from CSS variables instead of fixed hex values |
| 21 | Recharts warning mitigation | pass | billing view now falls back to table-first messaging on single-day ranges; Playwright warning scan returned 0 warnings on 2026-03-12 23:22 Asia/Shanghai |
| 21 | Automated tests | 28 passing | `npm test` on 2026-03-12 23:17 Asia/Shanghai after T28-T34 refactor and regression guards |
| 22 | Table clipping fix | complete | `ScrollArea` now exposes horizontal scrollbar and key cost/pricing tables use fixed layout + explicit column widths to prevent right-column clipping |
| 22 | Automated tests | 28 passing | `npm test` on 2026-03-13 08:07 Asia/Shanghai after table layout hardening |
| 23 | Overview metric readability | complete | value truncation ellipsis removed from metric cards so top-level numbers render fully |
| 23 | Automated tests | 28 passing | `npm test` on 2026-03-13 08:12 Asia/Shanghai after metric truncation rollback |
| 24 | Mobile viewport overflow | 0px page overflow | Playwright `390x844` checks returned `docScrollWidth = docClientWidth = 390` for both Codex and OpenClaw views on 2026-03-13 08:13 Asia/Shanghai |
| 24 | Mobile session browsing | enabled | Playwright mobile snapshot shows card-based session browsing replacing the 10-column session table on `全部会话` |
| 24 | Browser console errors | 0 | Playwright error-level console capture on `http://127.0.0.1:4329/` returned no messages after the mobile pass on 2026-03-13 08:13 Asia/Shanghai |
| 24 | Automated tests | 28 passing | `npm test` on 2026-03-13 08:13 Asia/Shanghai after the T37 mobile responsiveness pass |
| 25 | Access gate regression test | 17 passing | `node --test test/dashboardView.test.js` on 2026-03-13 08:52 Asia/Shanghai after adding the local password gate assertions |
| 25 | Full verification | 29 passing | `npm test` on 2026-03-13 08:52 Asia/Shanghai after the T38 access-gate pass |
| 25 | Device remember state | enabled | dashboard now persists authorization under `localStorage['codex-dashboard-access-granted']` until manual relock |
| 26 | Alert regression test | 29 passing | `node --test test/dashboardView.test.js` on 2026-03-13 10:28 Asia/Shanghai after adding threshold-alert and hover-copy coverage |
| 26 | App route compatibility | pass | `node --test test/app.test.js` on 2026-03-13 10:32 Asia/Shanghai after restoring SPA deep-link + refresh endpoint coverage |
| 26 | Repository aggregation compatibility | 7 passing | `node --test test/usageRepository.test.js` on 2026-03-13 10:33 Asia/Shanghai after validating decision-layer + alert-compatible snapshot logic |
| 26 | Full verification | 42 passing | `npm test` on 2026-03-13 10:34 Asia/Shanghai after the T39 alert/explanation pass |
| 27 | Alert-state persistence regression | 31 passing | `node --test test/dashboardView.test.js` on 2026-03-13 10:05 Asia/Shanghai after stabilizing recovered/disabled state transitions |
| 27 | HTTP integration suite | 1 skipped | `node --test test/app.test.js` on 2026-03-13 10:05 Asia/Shanghai skipped due sandbox `listen EPERM` restriction on `127.0.0.1` binding |
| 27 | Full verification | 43 passing, 1 skipped | `npm test` on 2026-03-13 10:05 Asia/Shanghai after Round4 hardening pass |
| 27 | Production build | pass | `npm run build` on 2026-03-13 10:05 Asia/Shanghai |
| 27 | Round3 dashboard regression | 30 passing | `node --test test/dashboardView.test.js` on 2026-03-13 10:40 Asia/Shanghai after quick preset/view toggle/favorite/export snapshot refinements |
| 27 | Frontend build | pass | `npm run build:client` on 2026-03-13 10:40 Asia/Shanghai |
| 27 | Full verification in sandbox | 43/44 passing | `npm test` on 2026-03-13 10:40 Asia/Shanghai; only `test/app.test.js` listener case fails with `listen EPERM 127.0.0.1` in this sandbox |
| 28 | Round2 decision regression | 31 passing | `node --test test/dashboardView.test.js` on 2026-03-13 10:45 Asia/Shanghai after adding Round2 decision-section coverage |
| 28 | Decision aggregation compatibility | 7 passing | `node --test test/usageRepository.test.js` on 2026-03-13 10:46 Asia/Shanghai after validating backend decision payload compatibility |
| 28 | Frontend build | pass | `npm run build` on 2026-03-13 10:47 Asia/Shanghai |
| 28 | Full verification in sandbox | 43/44 passing | `npm test` on 2026-03-13 10:44 Asia/Shanghai; only `test/app.test.js` listener case fails with `listen EPERM 127.0.0.1` in this sandbox |
| 29 | Round1 homepage regression | 31 passing | `node --test test/dashboardView.test.js` on 2026-03-13 11:09 Asia/Shanghai after adding top info band/关键卡/异常角标/价格入口 assertions |
| 29 | Full verification in sandbox | 43 passing, 1 skipped | `npm test` on 2026-03-13 11:10 Asia/Shanghai; `test/app.test.js` socket-bind case is skipped due sandbox `listen EPERM` |
| 29 | Frontend build | pass | `npm run build` on 2026-03-13 11:11 Asia/Shanghai after Round1 homepage + pricing-route migration |
| 30 | Homepage runtime regression | 33 passing | `node --test test/dashboardView.test.js` on 2026-03-13 13:10 Asia/Shanghai after adding runtime overview / ETA / accordion coverage |
| 30 | Full verification | 46 passing | `npm test` on 2026-03-13 13:13 Asia/Shanghai after wiring homepage runtime overview, quota ETA copy, and live-session metadata |
| 30 | Frontend build | pass | `npm run build` on 2026-03-13 13:14 Asia/Shanghai; emitted `public/index.html` plus hashed assets under `public/assets/` |
| 31 | Homepage de-dup regression | 35 passing | `node --test test/dashboardView.test.js` on 2026-03-14 14:03 Asia/Shanghai after replacing duplicated `限制窗口` with `限额补充信息` and removing dead homepage overview code |
| 31 | Full verification | 48 passing | `npm test` on 2026-03-14 14:04 Asia/Shanghai after the quota-section de-dup pass |
| 31 | Frontend build | pass | `npm run build` on 2026-03-14 14:03 Asia/Shanghai; emitted new hashed assets under `public/assets/` |
| 31 | Browser smoke | pass | Playwright snapshot on `http://127.0.0.1:4329/` confirmed first-screen compact cards remain visible while the lower section renders `限额补充信息` instead of duplicated quota cards |
| 32 | Framework-refactor regression | 35 passing | `node --test test/dashboardView.test.js` on 2026-03-14 14:16 Asia/Shanghai after collapsing the Codex main panel into `运行概览 + 运营摘要 + Accordion` secondary detail groups |
| 32 | Full verification | 48 passing | `npm test` on 2026-03-14 14:18 Asia/Shanghai after removing repeated top-level summary sections |
| 32 | Frontend build | pass | `npm run build` on 2026-03-14 14:17 Asia/Shanghai; emitted new hashed assets under `public/assets/` |
| 32 | Browser smoke | pass | Playwright browser snapshot on `http://127.0.0.1:4329/` confirmed the new compact header, persistent runtime overview, consolidated `运营摘要`, and accordion-based secondary detail triggers |
| 33 | Dual-ledger regression | 36 passing | `node --test test/dashboardView.test.js` on 2026-03-14 14:36 Asia/Shanghai after introducing `我直接使用 Codex` / `小龙虾代用`, ledger-scoped workbench, and clickable running-session cards |
| 33 | Full verification | 49 passing | `npm test` on 2026-03-14 14:40 Asia/Shanghai after the dual-ledger refactor pass |
| 33 | Browser smoke | pass | Playwright browser snapshot on `http://127.0.0.1:4329/` confirmed the dual-ledger homepage, top-level session-detail entry, ledger-scoped workbench tabs, and collapsed advanced-detail triggers |
| 34 | Session model backfill regression | 8 passing | `node --test test/usageRepository.test.js` on 2026-03-17 20:14 Asia/Shanghai after switching recent-session parsing from a fixed 40-file slice to recent-thread-targeted JSONL lookup |
| 34 | Dashboard source regression | 36 passing | `node --test test/dashboardView.test.js` on 2026-03-17 20:20 Asia/Shanghai after correcting GPT-5 label formatting and aligning source assertions to the current component structure |
| 34 | Full verification | 50 passing | `npm test` on 2026-03-17 20:23 Asia/Shanghai after removing temporary debug residue and restoring all-session model names |
| 35 | Source-routing regression | 8 passing | `node --test test/usageRepository.test.js` on 2026-03-17 20:33 Asia/Shanghai after removing model-name-based ledger routing so local GPT-5 sessions remain under `Codex 编程` |
| 35 | Live snapshot spot-check | pass | `loadSnapshot({ codexHome: ~/.codex, recentThreadsLimit: 50 })` on 2026-03-17 20:40 Asia/Shanghai returned `codex-local: 34`, `openclaw-oauth: 16`; the current workspace thread `/Users/helena/Cursor/codex_token` is now classified as `codex-local` |
| 35 | Full verification | 50 passing | `npm test` on 2026-03-17 20:49 Asia/Shanghai after fixing ledger source classification |
| 36 | Background refresh regression | 3 passing | `node --test test/liveSnapshotService.test.js` on 2026-03-17 21:00 Asia/Shanghai after preventing overlapping background refresh workers |
| 36 | Background worker runtime | pass | `loadSnapshotInBackground({ refreshIntervalMs: 5000, recentSessionFileLimit: 40, ledgerFileLimit: 217 })` on 2026-03-17 21:01 Asia/Shanghai completed in 24.8s with `codex-local: 268/268 with model`, `openclaw-oauth: 50/50 with model` |
| 36 | Live 4329 refresh | pass | `POST http://127.0.0.1:4329/api/refresh` on 2026-03-17 21:03 Asia/Shanghai returned `loading=false`, `codex-local: 268`, `openclaw-oauth: 50`, and populated model names after restarting the LaunchAgent |
| 36 | Full verification | 51 passing | `npm test` on 2026-03-17 21:04 Asia/Shanghai after fixing live refresh timeout/buffer limits and de-duplicating in-flight background refreshes |
| 37 | Remote snapshot app regression | 2 passing | `node --test test/app.test.js` on 2026-03-17 21:20 Asia/Shanghai after adding file-backed remote snapshot mode and token-protected upload coverage |
| 37 | Full verification | 52 passing | `npm test` on 2026-03-17 21:25 Asia/Shanghai after adding compact remote snapshot upload support |
