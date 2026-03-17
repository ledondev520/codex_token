# Codex Usage Dashboard Plan

Last updated: 2026-03-17 22:48 Asia/Shanghai

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
32. Remove metric-card value ellipsis truncation and keep full-value readability in overview tiles. Completed.
33. Optimize phone layout by preventing grid-level overflow, adding mobile session cards, and tightening responsive spacing. Completed.
34. Add a minimal local password gate with remembered authorization and manual relock. Completed.
35. Add configurable threshold alerts, trigger/recovery status, and metric-definition hover help without blocking the main dashboard flow. Completed.
36. Complete Round3 interaction upgrades: quick date presets, one-click session view switching, favorite views, and snapshot export modes without breaking filter logic. Completed.
37. Complete Round2 decision dashboard: top project/model cost rankings, efficiency indicators, and failure overview with graceful degradation. Completed.
38. Complete Round1 homepage delivery: top info band, key cards, anomaly badge baseline, and move model pricing table to dedicated settings page while preserving minimal-invasive structure. Completed.
39. Refactor homepage information density so runtime state, active sessions, today's spend, quota progress, ETA copy, and anomaly reason fit in the first screen. Completed.
40. Document the fastest deployment and boss-acceptance flow for VPS port 18080. Completed.
41. Tighten the homepage into a denser compact grid so first-screen essentials fit without oversized hero chrome. In progress.
42. Remove duplicated quota-window rendering and turn the lower section into supplemental quota/session detail. Completed.
43. Refactor the entire Codex dashboard framework so repeated summary sections collapse into one dense operations summary with accordion-based secondary details. Completed.
44. Rebuild the Codex dashboard into a user-facing dual-ledger view aligned with the openclaw-control-center mental model. Completed.
45. Fix all-session model backfill, remove debug residue, and realign regression coverage with the current dashboard shell. Completed.
46. Add a VPS-persistent remote snapshot mode so the public site can serve the last uploaded local Codex snapshot without depending on a live reverse tunnel. Completed.
47. Backfill OpenClaw classification for archived JSONL sessions when thread metadata is incomplete by consuming `session_meta.cwd/source` directly in the same ledger aggregation path. Completed.
48. Fold OpenClaw main-brain session usage into the lobster ledger so Feishu/main-agent prompts are counted alongside delegated Codex usage without double-counting overlapping Codex rows. Completed.

## Architecture

- Backend: Node.js HTTP server with Express, SQLite reader, session JSONL reader, and SSE streaming.
- Frontend: React + Vite + Tailwind + local shadcn component source built into `public/` and served by the backend.
- Data sources:
  - `~/.codex/state_5.sqlite`
- `~/.codex/sessions/**/*.jsonl`
- `~/.codex/archived_sessions/**/*.jsonl`
- `codexbar cost --provider codex --format json` for OpenClaw / ChatGPT-related usage
- `~/.openclaw/agents/main/sessions/sessions.json` + referenced `*.jsonl` files for OpenClaw main-brain assistant-message usage
- Pricing: official OpenAI model pricing where an exact match exists, with explicit alias-based fallback for models such as `gpt-5.3-codex-spark`.

## Risks

- Rate-limit data appears as snapshots with percentages and reset timestamps, but absolute quota totals may not exist locally.
- Session logs can be large, so parsing must be scoped to recent files and cached.
- Live filesystem watching may behave differently across platforms; polling fallback is required.
- External `codexbar` calls can fail or hang, so OpenClaw usage must not block the main Codex snapshot path.
- The originally documented `~/.openclaw/data/interaction-store.db` source may not exist on the local machine, so the main-brain ledger cannot depend on that path being present.
- The homepage now risks regressing into low-density hero sections if new summary widgets are added without first-screen budgeting.
- Compacting the homepage too aggressively can hide session readability or push required data below the fold on shorter laptop screens.
- Removing repeated quota cards from lower sections can hide detail users previously scanned there if the replacement does not preserve unique secondary information.
- Folding secondary detail into accordions can reduce discoverability if trigger labels are vague or the default open/closed state is poorly chosen.
- Splitting the homepage into two ledgers can still confuse users if detail dialogs, session tables, and advanced sections fall back to old internal source labels.

## Mitigations

- Present quota as "usage percent + reset time + plan type" when hard totals are unavailable.
- Use SQLite for historical aggregates and only parse a bounded set of recent session files for live details.
- Use periodic refresh in the server and SSE on the client.
- Fall back to the most recent non-null rate-limit snapshot when the newest session event omits quota data.
- Merge per-thread token/model/limit fields by timestamp so newer partial files do not wipe older non-null snapshots.
- Cache OpenClaw usage reads and degrade to `null` when `codexbar` is unavailable so the rest of the dashboard stays live.
- Treat OpenClaw main sessions as a separate local segment sourced from `agents/main/sessions/*.jsonl`, then merge them with CodexBar/local Codex rows using `sum(main) + max(codex overlap)` so the lobster ledger gains Feishu prompt cost without duplicate delegated Codex billing.
- Keep the dashboard bound to loopback on the Mac and expose phone access through a reverse SSH tunnel terminated by the VPS reverse proxy.
- Keep a clear record when public-access protections are relaxed so the exposure level is obvious on resume.
- Keep the first-screen quota cards as the single source for used/remaining/ETA, and reserve lower sections for reset rhythm, session billing, and navigation-only details.
- Keep accordion labels direct (`数据源`, `告警设置`, `成本排行`, `限额细节`) and reserve top-level sections only for always-on information.
- Keep the two ledgers on one page with identical metric structure so “直接使用” and “小龙虾代用” remain comparable without requiring source switching.

## Current Phase

- Dashboard refinement round is complete, and the homepage runtime verification follow-up is verified.
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
- Overview metric tiles no longer force value ellipsis truncation; numeric values render fully while model labels continue to wrap when needed.
- Phone-sized layouts now keep both Codex and OpenClaw views at `docScrollWidth = docClientWidth`, replace the mobile session table with stacked cards, and use tighter responsive spacing in the header and section chrome.
- A local access gate now blocks the dashboard until the correct password is entered, remembers the current device with `localStorage`, and exposes a manual relock action without changing the existing snapshot/data flow.
- Round 4 is complete: client-side threshold alerts now derive from existing snapshot data so no new blocking server path was introduced; today-cost and failure-rate alerts are configurable, recoverable, and explainable in-place.
- Round 4 follow-up hardening is complete: recovered alert state now persists across subsequent low-value refreshes, and disabled alerts keep a stable transition timestamp instead of churning every snapshot.
- Metric tiles now expose hoverable口径说明, alert settings persist in `localStorage`, and the server falls back to `index.html` plus `/api/refresh` for SPA compatibility with the newer route/test surface.
- Round3 delivery is finalized: global quick date presets (`今日/昨日/7天/本月/自定义`) drive both session and billing slices, session view toggles are explicitly limited to `成本/性能/项目`, favorites are saved/applied as independent view presets, and exports now support both filtered CSV and current-view JSON snapshots.
- Round2 decision delivery is now wired in the main Codex panel: top project/model cost rankings render for 今日/近7天, efficiency metrics show per-1k-token cost + cache hit rate + success rate, and failure overview exposes counts/latest failure/recent detail entry with empty-state fallbacks.
- Round1 homepage delivery is complete: the homepage now has a dedicated top info band (source badges, latest update, freshness, refresh button/state), four key cards (今日花费/本月累计/预算进度/24h趋势), a baseline anomaly badge, and the model pricing table is served from standalone `/settings/pricing` with a homepage entry card.
- The homepage runtime follow-up is complete: the first screen now exposes `运行状态`、`运行会话列表`、`今日费用`、`5小时限额`、`7天限额`，并在限额卡片上提供明确的 `估算触顶时间` 文案，同时保留原有的详细明细区块。
- Deployment and acceptance docs now capture both the repo's current local-preview tunnel path and the shortest derived PM2-based VPS rollout path for `:18080`.
- A follow-up homepage density pass is in progress to remove oversized first-screen headers/cards while preserving the current runtime/session/quota data model and actions.
- The lower `限制窗口` section has been replaced by `限额补充信息`: duplicated 5h/7d usage cards were removed, reset-rhythm details were consolidated into one supplemental card, and dead homepage overview code was deleted.
- The Codex main panel has now been fully regrouped into `运行概览 + 运营摘要 + 全部会话与账单`: repeated top-level sections were removed, while `数据源 / 告警设置 / 成本排行 / 限额细节` moved into shadcn `Accordion` detail groups.
- The main panel has now been reoriented again around the openclaw-control-center mental model: two user-facing ledgers (`我直接使用 Codex` / `小龙虾代用`), a ledger-scoped `全部会话` workbench, and a default-collapsed `高级明细` area.
- The all-session ledger now backfills models by scanning session JSONL for the actual recent thread IDs rather than truncating to the newest 40 files, so listed Codex threads no longer degrade to `未知模型` just because unrelated session files are newer.
- Usage-origin classification now relies on stable source signals (`cwd`, `source`) instead of model names, so local GPT-5 sessions stay in `Codex 编程` instead of being misrouted into the lobster ledger.
- Model labels now use explicit GPT-5 / Codex alias rules, eliminating the bad `gpt-5` → `GPT-5.5 Codex` formatting path and keeping `gpt-5.4-codex` grouped under `GPT-5.4`.
- Temporary snapshot tracing and the sticky red debug strip were removed, and the regression suite now asserts against the current component layout/copy instead of stale pre-refactor source strings.
- The local 4329 dashboard runtime no longer blocks startup on a redundant rebuild when fresh assets already exist, and background full-refresh now tolerates large snapshots plus prevents overlapping worker pile-ups that previously left the UI stuck on `loading=true` with empty models.
- The server now supports a file-backed `remote-upload` mode plus a token-protected snapshot upload endpoint, and the local workspace now includes a push script that can generate a privacy-reduced snapshot directly from `.codex` without requiring the local 4329 dashboard process to stay online.
- 归档会话 `session_meta` 的 `cwd/source` 现在也会参与 OpenClaw 来源判定的回退路径：即使 `threads` 表映射缺失，归档文件里来自 `~/.openclaw` 的会话仍可进入 `小龙虾代用` 账本。
- `小龙虾代用` 账本现在不再只看 Codex 代跑：OpenClaw `agent:main:*` 会话中的 assistant `usage` 也会被汇入同一账本，因此飞书直发到小龙虾主脑的提示词消耗能够直接显示出来。
