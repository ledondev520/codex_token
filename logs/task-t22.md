# T22 Log

- 2026-03-12 21:02 Asia/Shanghai: reviewed the user-provided mobile screenshots and reproduced the current mobile layout in Playwright.
- 2026-03-12 21:06 Asia/Shanghai: added failing tests for table-based OpenClaw fee markup, multi-turn user-message extraction, and removal of leftover shadcn-helper copy.
- 2026-03-12 21:14 Asia/Shanghai: implemented mobile source tabs, denser mobile card spacing, table-based OpenClaw fee layout, per-turn user-message extraction/display, and cleaned copy.
- 2026-03-12 21:18 Asia/Shanghai: fixed a live snapshot race where stale background refreshes could overwrite a newly selected `codexHome`.
- 2026-03-12 21:19 Asia/Shanghai: ran `npm test` and verified mobile/desktop rendering plus dialog content with Playwright on `http://127.0.0.1:4329/`.
