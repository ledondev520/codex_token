# Codex Usage Dashboard Plan

Last updated: 2026-03-08 22:00 Asia/Shanghai

## Goal

Build a standalone local web dashboard in this workspace that reads `~/.codex` usage data, shows token consumption and quota snapshots, and updates automatically without requiring cloud access.

## Milestones

1. Confirm local data sources for token usage and rate limits.
2. Build a Node.js backend that aggregates SQLite + session JSONL data. Completed.
3. Build a local frontend dashboard with live refresh. Completed.
4. Verify tests, startup flow, and browser behavior. Completed.
5. Prepare the workspace as an independent Git repository with GitHub publication prerequisites. Completed.
6. Refine dashboard interaction model: grouped pricing, source picker, combined billing chart, and reset progress cues. Completed.
7. Correct live rate-limit selection so windows reflect the newest status snapshot. Completed.
8. Rework billing analytics UX with scope switching, a brushable time range, and a real ledger table. Completed.
9. Remove cold-start blocking from the first snapshot request. Completed.
10. Refine session list and dashboard copy for clearer browsing and wording. Completed.
11. Extend the dashboard with OpenClaw ChatGPT/Codex usage sourced from CodexBar local cost output. Completed.
12. Install a fixed-port local background service on 4329. Completed.
13. Mark stale rate-limit snapshots when reset time has passed. Completed.

## Architecture

- Backend: Node.js HTTP server with Express, SQLite reader, session JSONL reader, and SSE streaming.
- Frontend: static HTML/CSS/JS served by the backend.
- Data sources:
  - `~/.codex/state_5.sqlite`
  - `~/.codex/sessions/**/*.jsonl`
  - `~/.codex/archived_sessions/**/*.jsonl`
  - `codexbar cost --provider codex --format json` for OpenClaw / ChatGPT-related usage
- Pricing: official OpenAI model pricing where an exact match exists, with explicit alias-based fallback for models such as `gpt-5.3-codex-spark`.

## Risks

- Rate-limit data appears as snapshots with percentages and reset timestamps, but absolute quota totals may not exist locally.
- Session logs can be large, so parsing must be scoped to recent files and cached.
- Live filesystem watching may behave differently across platforms; polling fallback is required.
- External `codexbar` calls can fail or hang, so OpenClaw usage must not block the main Codex snapshot path.

## Mitigations

- Present quota as "usage percent + reset time + plan type" when hard totals are unavailable.
- Use SQLite for historical aggregates and only parse a bounded set of recent session files for live details.
- Use periodic refresh in the server and SSE on the client.
- Fall back to the most recent non-null rate-limit snapshot when the newest session event omits quota data.
- Merge per-thread token/model/limit fields by timestamp so newer partial files do not wipe older non-null snapshots.
- Cache OpenClaw usage reads and degrade to `null` when `codexbar` is unavailable so the rest of the dashboard stays live.

## Current Phase

- Dashboard refinement round is complete and verified.
- The app now supports grouped pricing rows, top-level plan display, reset-progress feedback, tabbed recent sessions vs billing, hoverable combined chart, and runtime source-path switching.
- Live rate-limit selection now keys off `rateLimitsAt`, avoiding stale 5-hour / 7-day values from later non-rate-limit token events.
- Billing tab redesign is complete: dual-axis chart scaffolding, cumulative vs. natural-month switching, drag-adjustable time range, and a headed ledger table.
- Snapshot warmup now runs off the request path so the dashboard opens immediately and then continues hydrating in the background.
- Session browsing and copy are complete: all-session pagination, filters, detail drill-down, clearer labels, and pricing catalog cleanup.
- OpenClaw / ChatGPT usage is now integrated as a separate panel backed by `codexbar cost`, filtered to GPT / ChatGPT models, with top-model and recent-daily summaries.
- The dashboard is now managed by `launchctl` so `127.0.0.1:4329` stays stable without relying on this chat session.
- Rate-limit cards are being clarified so an expired local snapshot is shown as stale rather than looking like a failed reset.
