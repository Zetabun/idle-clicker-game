# Repository instructions

`cod.html` is the live GitHub Pages release. Do not maintain it as an independent source file.

`strikewatch-source/` is the complete editable Strikewatch source and documentation authority. Before changing the game, read every Markdown file in that directory in the order defined by `strikewatch-source/DOCUMENTATION-INDEX.md`.

For every playable iteration:

1. Make code, markup and CSS changes under `strikewatch-source/`.
2. Update the relevant Markdown authority, current release audit and GPT handoff in the same task.
3. Keep all visible version labels aligned with `BUILD_VERSION`.
4. Run `build.py`, syntax checks, targeted behaviour checks, unrelated regressions, deterministic build checks and archive checks.
5. Copy the verified standalone output to root `cod.html`.
6. Commit and push the source, documentation and `cod.html` together.

`other/` contains unrelated legacy projects, assets and retired automation. Do not edit, import or treat it as a Strikewatch dependency unless the user explicitly requests it.
