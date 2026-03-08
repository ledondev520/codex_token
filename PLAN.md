# Codex Usage Dashboard Plan

Last updated: 2026-03-08 18:03 Asia/Shanghai

## Goal

Build a standalone local web dashboard in this workspace that reads `~/.codex` usage data, shows token consumption and quota snapshots, and updates automatically without requiring cloud access.

## Milestones

1. Confirm local data sources for token usage and rate limits.
2. Build a Node.js backend that aggregates SQLite + session JSONL data. Completed.
3. Build a local frontend dashboard with live refresh. Completed.
4. Verify tests, startup flow, and browser behavior. Completed.
5. Prepare the workspace as an independent Git repository with GitHub publication prerequisites. In progress.

## Architecture

- Backend: Node.js HTTP server with Express, SQLite reader, session JSONL reader, and SSE streaming.
- Frontend: static HTML/CSS/JS served by the backend.
- Data sources:
  - `~/.codex/state_5.sqlite`
  - `~/.codex/sessions/**/*.jsonl`
  - `~/.codex/archived_sessions/**/*.jsonl`
- Pricing: official OpenAI model pricing where an exact match exists, with explicit alias-based fallback for models such as `gpt-5.3-codex-spark`.

## Risks

- Rate-limit data appears as snapshots with percentages and reset timestamps, but absolute quota totals may not exist locally.
- Session logs can be large, so parsing must be scoped to recent files and cached.
- Live filesystem watching may behave differently across platforms; polling fallback is required.

## Mitigations

- Present quota as "usage percent + reset time + plan type" when hard totals are unavailable.
- Use SQLite for historical aggregates and only parse a bounded set of recent session files for live details.
- Use periodic refresh in the server and SSE on the client.
- Fall back to the most recent non-null rate-limit snapshot when the newest session event omits quota data.
- Merge per-thread token/model/limit fields by timestamp so newer partial files do not wipe older non-null snapshots.

## Current Phase

- Isolate this workspace from the accidental parent Git repository rooted at `/Users/helena/.git`.
- Add missing repository metadata needed for GitHub publication: `.gitignore` and `README.md`.
- Initialize a local repository, create the first commit, and stop at the GitHub authentication boundary if credentials are unavailable.
