# Coding-agent instructions

## Default reading

Read `HANDOFF.md` and this file. Do not preload `PROJECT.md`, `README.md`,
`ARCHITECTURE.md`, `CONTRACTS.md`, `CHANGELOG.md` or the audit collection.
Use the routing table in `HANDOFF.md` to load only the relevant section or
audit.

## Working rules

- Inspect the owning source and final CSS/JavaScript cascade before editing.
- Search with `rg` and reuse established helpers before adding a new authority.
- Make the narrowest change that satisfies the request.
- Preserve unrelated user changes in a dirty worktree.
- Edit source, never generated bundle/standalone output directly.
- Keep gameplay, schemas and the other responsive target unchanged unless the
  task explicitly requires them.
- UI fixes require computed-style or live-browser verification at affected
  widths, not source inspection alone.
- Gameplay fixes require targeted `*ForTest()` hooks plus nearby regressions.
- Map/rendering work requires the newest relevant arena audit and integrity
  gates.
- Persistence changes require normalisation, migration and round-trip checks.

## Documentation rules

Documentation is part of a completed change, but avoid duplication.

- Current release state and immediate hazards: `HANDOFF.md`.
- Cross-release invariant: one relevant section in `CONTRACTS.md`.
- Module ownership/dependency change: `ARCHITECTURE.md`.
- Player/developer overview or build command: `README.md`.
- Release-specific implementation and evidence: the current `AUDIT-*.md`.
- Historical routing only: `CHANGELOG.md`.

Do not copy a release narrative into every document. Keep historical detail in
its audit and let Git history preserve superseded wording.

Documentation-only maintenance does not require a game version bump or rebuilt
artifacts when no source, metadata or generated output changes. It still
requires link/routing validation and a clean diff.

## Playable release gate

- `BUILD_VERSION`, `BUILD_NAME`, `BUILD_ID` and static labels agree.
- `py -3 build.py` succeeds.
- Every modular JavaScript file and generated bundle parses.
- Standalone inline JavaScript parses.
- Targeted behaviour and adjacent regressions pass.
- Affected responsive widths have no unexpected overflow.
- Browser/runtime logs have no new errors.
- Two builds produce identical bundle and standalone hashes.
- Root `cod.html` is byte-identical to the standalone.
- Source, concise docs, audit and generated artifacts are committed together.

## Current release note

Build 12.119 fixes guided `NEXT` badge geometry. Keep the inactive guided badge
content-sized and clear of route copy while preserving the active subtab rail.
Desktop badge size is 8px; compact meaningful microcopy remains at least
10.5px. See `AUDIT-12.119.md`.
