# Metrics

Last updated: 2026-03-08 21:43 Asia/Shanghai

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
