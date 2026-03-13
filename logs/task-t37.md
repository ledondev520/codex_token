# T37 Log

- 2026-03-13 08:06 Asia/Shanghai: received request to optimize poor phone rendering.
- 2026-03-13 08:08 Asia/Shanghai: reproduced the issue at `390x844`; Playwright showed page-level horizontal overflow caused by grid columns expanding to fit wide table content.
- 2026-03-13 08:10 Asia/Shanghai: added `min-w-0` shrink guards, responsive header/section layout changes, and mobile-only session cards; normalized remaining 3-column mobile tables to fixed widths.
- 2026-03-13 08:13 Asia/Shanghai: validated with `npm test`, Playwright mobile overflow checks for both Codex/OpenClaw tabs, and console-error scan.
