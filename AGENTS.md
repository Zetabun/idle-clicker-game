# Repository instructions

The default Strikewatch context is intentionally small.

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

Root `other/` is unrelated/retired material. Do not use or change it unless the
user explicitly requests it.
