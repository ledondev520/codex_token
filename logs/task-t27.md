# T27 Log

- 2026-03-12 23:00 Asia/Shanghai: scanned `src/App.jsx` for residual non-shadcn controls and identified manual dual-range inputs plus an extra handcrafted progress wrapper.
- 2026-03-12 23:02 Asia/Shanghai: replaced billing range controls with the local shadcn `Slider` component and tightened range clamping (`??` instead of `||`) for zero-index correctness.
- 2026-03-12 23:03 Asia/Shanghai: simplified rate-limit usage bars to render shadcn `Progress` directly, removing the redundant outer track wrapper.
- 2026-03-12 23:04 Asia/Shanghai: added a regression assertion in `test/dashboardView.test.js` to enforce `Slider` usage and prevent fallback to raw `input[type=range]`.
- 2026-03-12 23:07 Asia/Shanghai: ran `npm test` (27 passing) and Playwright billing-tab smoke validation (snapshot contains `slider` under `时间范围`).
- 2026-03-12 23:10 Asia/Shanghai: re-ran `npm test` after all checkpoint/doc updates and confirmed the suite still passes end-to-end (27 passing).
