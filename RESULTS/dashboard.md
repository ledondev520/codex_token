# Dashboard Result

Date: 2026-03-08 18:00 Asia/Shanghai

## Deliverable

A standalone local web dashboard was built in this workspace. It reads:

- `~/.codex/state_5.sqlite`
- `~/.codex/sessions/**/*.jsonl`
- `~/.codex/archived_sessions/**/*.jsonl`

It exposes:

- `GET /api/snapshot`
- `GET /api/stream`
- `GET /`

## What the UI shows

- Historical total tokens and open threads from SQLite.
- Current session total tokens and last-turn tokens from the latest session event.
- Most recent non-null quota snapshot with 5-hour/7-day style windows, remaining percentages, reset times, and plan type.
- Current session model name, unit prices, and estimated USD cost.
- Cumulative estimated cost across all parsed `last_token_usage` events.
- All token displays normalized to `M` (million tokens).
- Chinese localized interface copy.
- Daily token totals.
- Daily token and daily cost line charts.
- Daily ledger rows with token/cost per date.
- Recent thread table with model, token M-value, estimated cost, update time, and workspace.
- A pricing table built from models discovered in local logs.

## Validation

- Automated: `npm test` -> 3 passing tests after model/pricing/UI updates.
- Manual: local server started with `node server/index.js`.
- Browser: page verified at `http://127.0.0.1:4318`.
- Screenshot evidence: `var/folders/m7/nvwypzm13hs3yj_yzr3173dr0000gn/T/playwright-mcp-output/1772943114526/page-2026-03-08T09-59-28-349Z.png`
- Browser console: 0 errors after adding a favicon data URL.

## Pricing notes

- Exact model prices are sourced from official OpenAI pricing/model pages where available.
- If a local model name is an alias such as `gpt-5.3-codex-spark`, the dashboard falls back to the nearest official base model price and labels that as inferred.
- The cumulative total fee is now separated from the current-session fee to avoid mixing the two concepts.

## Runbook

```bash
npm test
node server/index.js
```
