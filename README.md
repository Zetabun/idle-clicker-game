# Strikewatch repository

The live GitHub Pages game is [`cod.html`](cod.html). The complete editable
project is in [`strikewatch-source/`](strikewatch-source/).

Current deployed build: **12.216 — Ops-Only Priority Card**.

## Concise agent workflow

Read only:

1. `strikewatch-source/HANDOFF.md`
2. `strikewatch-source/AGENTS.md`

Use the handoff routing table to load one relevant architecture/contract
section or historical audit. Do not load every Markdown file by default.

## Release workflow

1. Change source and concise documentation under `strikewatch-source/`.
2. Run `py -3 build.py` there and complete the targeted verification gates.
3. Rebuild deterministically.
4. Copy the verified standalone to root `cod.html`.
5. Commit source, current audit, concise documentation and artifacts together.

Root [`other/`](other/) contains unrelated or retired material and is not a
Strikewatch dependency.