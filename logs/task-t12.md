# Task T12 Log

- 2026-03-08 19:22 Asia/Shanghai: Measured cold-start bottleneck and confirmed `loadSnapshot()` full parsing took about 15.2s while SQLite-only warmup took about 326ms.
- 2026-03-08 19:23 Asia/Shanghai: Added a regression test to require async warmup instead of inline first-request loading.
- 2026-03-08 19:24 Asia/Shanghai: Updated live snapshot service to prewarm asynchronously, emit cached/placeholder snapshots immediately, and start warmup at server creation time.
- 2026-03-08 19:24 Asia/Shanghai: Ran `npm test` and got 10 passing tests.
- 2026-03-08 19:25 Asia/Shanghai: Re-measured cold start on `http://127.0.0.1:4327` and observed HTML at 0.09s and first snapshot at 0.006s.
