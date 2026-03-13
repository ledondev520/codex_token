# Metrics

Last updated: 2026-03-13 08:08 Asia/Shanghai

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
