# Task T46 Log

- Date: 2026-03-14
- Goal: Remove redundant lower quota cards and keep only supplemental quota details.
- Scope:
  - delete dead homepage overview components
  - remove duplicated lower `限制窗口` cards
  - replace with a single supplemental quota rhythm card
  - keep current-session billing and pricing entry
  - update regression tests and checkpoint files
- Verification:
  - `node --test test/dashboardView.test.js`
  - `npm run build`
  - `npm test`
  - Playwright smoke on `http://127.0.0.1:4329/`
