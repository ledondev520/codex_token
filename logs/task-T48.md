# Task T48 Log

- Date: 2026-03-14
- Goal: Implement the dual-ledger dashboard refactor so users can clearly distinguish direct Codex spend from lobster-delegated spend.
- Scope:
  - add dual-ledger homepage structure
  - rename OpenClaw/OAuth user-facing copy to lobster-friendly language
  - make runtime session cards clickable
  - rebuild workbench so it follows the selected ledger instead of mixing sources
  - hide analysis/config/export complexity under advanced details
  - update regression tests and checkpoint files
- Verification:
  - `node --test test/dashboardView.test.js`
  - `npm test`
  - Playwright browser snapshot on `http://127.0.0.1:4329/`
