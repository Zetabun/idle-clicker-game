# Repository instructions

Two unrelated projects share this repository. Establish which one the task
belongs to first — the routing below differs completely.

## Kerbside (live UK bus and rail board)

Anything touching `bus.html`, root `kerbside-*.js`, `kerbside-trains.css`,
`kerbside-backend/`, `kerbside-rail-worker/`, `kerbside-train-movement-worker/`,
`naptan/`, `disruptions.json`, `timetable.json` or the `kerbside-*` workflows.

Read [`README.md`](README.md) for the layout, then only the files the task
touches. There is no separate handoff document; the code carries its own
reasoning in comments.

Before changing anything, know these four things:

1. `VERSION` is the release. `py -3 .github/scripts/sync-version.py` propagates
   it. Every visible label and `?v=` cache-buster must match, including the
   hardcoded ones inside `kerbside-journey-planner-ui.js` and
   `kerbside-train-date.js`.
2. Six root modules load at runtime, not from `bus.html`'s script list. See the
   README table.
3. Four modules chain `window.fetch` in load order. Capture the previous
   `window.fetch`, never the native one.
4. The movement Worker deploys `worker-entry.js`, which subclasses `worker.js`.
   Version and health come from the base; the entry must not pin its own.

Many tests assert exact source text of `bus.html` and the root modules. When a
string moves, the assertion moves with it. Run `npm test` in each of
`kerbside-backend/`, `kerbside-rail-worker/` and `kerbside-train-movement-worker/`.

## Strikewatch (idle game)

Anything under `strikewatch-source/`, `cod.html`, or the `strikewatch-*`
workflows. The default context is intentionally small.

Before editing, read only:

1. `strikewatch-source/HANDOFF.md`
2. `strikewatch-source/AGENTS.md`

Then follow the task-routing table in `HANDOFF.md`. Read a section of
`CONTRACTS.md`, `ARCHITECTURE.md` or one historical `AUDIT-*.md` only when it
is relevant. **Do not read every Markdown or audit file by default.**

`strikewatch-source/` is the editable authority. Generated
`js/strikewatch.dev.js`, `dist/*.html` and root `cod.html` must come from
`build.py`, not independent edits.

For a playable release:

1. edit source under `strikewatch-source/`;
2. update the smallest relevant concise authority and current audit;
3. align every visible build/version label;
4. build, parse, test, rebuild deterministically and verify artifact parity;
5. copy the verified standalone to root `cod.html`;
6. commit and push source, documentation and release artifacts together.

## Neither

Root `other/` is unrelated/retired material. Do not use or change it unless the
user explicitly requests it.
