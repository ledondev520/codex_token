# Codex Usage Dashboard Plan

Last updated: 2026-03-13 08:08 Asia/Shanghai

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
14. Expose the local dashboard through a VPS-backed reverse tunnel for phone access. Completed.
15. Remove Basic Auth from the temporary VPS preview entrypoint at user request. Completed.
16. Rework the dashboard layout toward a shadcn/ui-style information architecture without changing data bindings. Completed.
17. Separate Codex-local usage from OpenClaw/OAuth-driven usage in the UI, reduce prompt verbosity, and tighten shadcn/ui semantics. Completed.
18. Optimize mobile density, clean residual copy, convert odd model-fee blocks into table semantics, and expose per-turn user messages in session detail. Completed.
19. Migrate the frontend from static HTML/CSS/JS to a real React + Vite + Tailwind + local shadcn/ui component project. Completed.
20. Tighten shadcn authenticity with local Select/Skeleton/Separator components and improve first-load UX. Completed.
21. Make the build pipeline part of the actual runtime path so serving and launchd always use the latest React frontend. Completed.
22. Close remaining project-level gaps after the migration: alias support, proper HEAD responses, and HTTP regression coverage. Completed.
23. Replace remaining manual range/progress controls with native local shadcn Slider/Progress usage. Completed.
24. Replace legacy dashed empty placeholders with reusable shadcn-style alert empty states. Completed.
25. Introduce a shared label primitive and apply it across source/filter/detail metadata labeling. Completed.
26. Replace remaining hard-coded neutral panel surfaces with semantic theme token surfaces. Completed.
27. Remove hard-coded slate palette usage from shared dashboard primitives. Completed.
28. Theme-align billing chart colors/ticks/tooltips with CSS variables. Completed.
29. Prevent Recharts single-day width/height warning path by using non-chart fallback and active-tab render gating. Completed.
30. Add regression guards for shadcn consistency and record full T28–T34 checkpoint evidence. Completed.
31. Fix table-column clipping in cost/pricing panels by hardening scroll + table layout strategy. Completed.

## Architecture

- Backend: Node.js HTTP server with Express, SQLite reader, session JSONL reader, and SSE streaming.
- Frontend: React + Vite + Tailwind + local shadcn component source built into `public/` and served by the backend.
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
- Keep the dashboard bound to loopback on the Mac and expose phone access through a reverse SSH tunnel terminated by the VPS reverse proxy.
- Keep a clear record when public-access protections are relaxed so the exposure level is obvious on resume.

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
- A VPS preview path is now maintained separately from the app process so mobile access can be enabled without moving local Codex data onto the server.
- The VPS preview endpoint is temporarily open without Basic Auth at the user's request, which trades convenience for substantially weaker privacy.
- The frontend layout now uses a more shadcn/ui-like shell: top status bar, main content stack, right-side supporting panel, neutral surfaces, and preserved DOM IDs for the existing JS render pipeline.
- Session rows are now classified as `Codex 本地` vs `OpenClaw / OAuth` using local thread metadata, the sessions table exposes a source filter, and long prompt/title text is summarized before rendering while the full prompt remains available on demand.
- Mobile now switches between `Codex 本地` and `OpenClaw / OAuth` views through source tabs, the OpenClaw model-fee area uses a real table, and session detail now lists each captured user turn from local event logs.
- The live snapshot service now guards against stale background refreshes overwriting a newly selected `codexHome`.
- The frontend now builds from `src/` through Vite into `public/`, uses local shadcn-style components under `src/components/ui/`, and no longer depends on the legacy imperative `public/app.js` architecture.
- The React frontend now uses additional local shadcn-style primitives (`Select`, `Skeleton`, `Separator`) so filter controls and first-load states rely less on raw HTML elements and empty zero-value placeholders.
- Default startup now rebuilds the client before serving, and the launchd entrypoint does the same, so the runtime is aligned with the migrated React/Vite frontend rather than assuming `public/` is already fresh.
- Vite and editor aliasing now match `components.json`, and the HTTP server correctly answers `HEAD` for the root page, static assets, and snapshot endpoint instead of treating them as unsupported.
- Billing range controls now use the local shadcn `Slider` primitive instead of raw dual `input[type=range]`, and rate-limit usage bars rely on the shadcn `Progress` track directly.
- Empty-state rendering now reuses local `Alert`/`EmptyState` components, repeated metadata headings now use the local `Label` primitive, and hard-coded slate backgrounds were replaced with semantic theme tokens.
- Shared primitives (`metric-tile`, `dialog`, `progress`, `slider`, `skeleton`) now avoid hard-coded slate classes, and billing-chart palette values are sourced from CSS variables to stay aligned with the active theme.
- Billing chart rendering is now gated for active tab + multi-day ranges, with a single-day fallback notice that avoids Recharts width/height warnings while preserving the detailed ledger table.
- Scroll-area tables now include horizontal scrollbar support and fixed column-width strategies, preventing rate/cost columns from being visually clipped in the current-session and pricing panels.
