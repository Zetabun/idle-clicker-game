# Zetabun apps

This repository holds two unrelated projects. Work out which one you are in
before changing anything.

## Kerbside — live UK bus and rail board

The live GitHub Pages app is [`bus.html`](bus.html). `VERSION` is the single
source of truth for the release number; every visible label and every `?v=`
cache-buster must agree with it.

| Piece | Where |
| --- | --- |
| App shell, live bus board, map | [`bus.html`](bus.html) |
| Rail board, planner, forecasts | root `kerbside-*.js`, [`kerbside-trains.css`](kerbside-trains.css) |
| Live bus Worker (BODS SIRI + GTFS-RT) | [`kerbside-backend/src/worker.js`](kerbside-backend/src/worker.js) |
| Rail Worker (Darwin via Rail Data Marketplace) | [`kerbside-rail-worker/worker.js`](kerbside-rail-worker/worker.js) |
| Network Rail TRUST movement hub | [`kerbside-train-movement-worker/`](kerbside-train-movement-worker/) |
| Tests and browser regressions | [`kerbside-backend/test/`](kerbside-backend/test/), [`kerbside-backend/tests/`](kerbside-backend/tests/) |

Six root modules are **not** in `bus.html`'s script list — they are injected at
runtime by `kerbside-journey-planner-ui.js` and `kerbside-train-date.js`:
`kerbside-journey-planner-core.js`, `kerbside-saved-journeys-polish.js`,
`kerbside-rail-health.js`, `kerbside-train-movement.js`,
`kerbside-train-timetable.js`, `kerbside-train-forecast-v3.js`. Their `?v=`
strings are hardcoded in those two loaders, so `sync-version.py` has to update
them too.

Four modules each replace `window.fetch`, chained in load order:
`kerbside-train-routes.js` → `kerbside-journey-planner-ui.js` →
`kerbside-journey-planner-core.js` → `kerbside-train-live-window.js`. Adding a
layer means capturing the previous `window.fetch`, not the native one.

The movement Worker deploys [`worker-entry.js`](kerbside-train-movement-worker/worker-entry.js),
not `worker.js` — the entry subclasses the base hub. `wrangler.toml` names it.

### Release workflow

1. Change source, bump `VERSION`, run `py -3 .github/scripts/sync-version.py`.
2. `npm test` in `kerbside-backend/`, `kerbside-rail-worker/` and
   `kerbside-train-movement-worker/`.
3. Many tests pin exact source text of `bus.html` and the root modules. If a
   string changed, the assertion moves with it.
4. Commit source, tests and version labels together.

## Strikewatch — idle game

The live GitHub Pages game is [`cod.html`](cod.html). The complete editable
project is in [`strikewatch-source/`](strikewatch-source/).

Current deployed build: **12.229 — Configuration Access & Mobile Mail Dismissal**.

Read only `strikewatch-source/HANDOFF.md` and `strikewatch-source/AGENTS.md`,
then use the handoff routing table to load one relevant architecture/contract
section or historical audit. Do not load every Markdown file by default.

Release: change source and concise documentation under `strikewatch-source/`,
run `py -3 build.py` there, complete the targeted verification gates, rebuild
deterministically, copy the verified standalone to root `cod.html`, and commit
source, current audit, concise documentation and artifacts together.

Root [`other/`](other/) contains unrelated or retired material and is not a
dependency of either project.
