# Metrics

Last updated: 2026-03-08 18:05 Asia/Shanghai

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
