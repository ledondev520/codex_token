# Codex Usage Dashboard

Standalone local dashboard for Codex token usage and quota snapshots.

## What It Does

- Reads local Codex usage data from `~/.codex`
- Aggregates SQLite history and recent session JSONL events
- Serves a local dashboard with live updates
- Shows token usage, quota snapshots, model pricing, and daily cost estimates

## Run Locally

```bash
npm install
npm test
npm start
```

Then open `http://127.0.0.1:4318`.

## Project Structure

- `server/`: HTTP app, usage aggregation, live snapshot service
- `public/`: static dashboard assets
- `test/`: repository, API, and frontend tests
- `docs/`: implementation notes

## Notes For GitHub Publication

- This repository is intended to be public on GitHub.
- No open-source license has been added yet. Choose a license before making the repository public.
- The app reads local files under `~/.codex`; review that behavior before publishing screenshots or sample data.
