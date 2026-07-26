# Strikewatch repository

The live GitHub Pages game is [`cod.html`](cod.html).

The complete editable project—including modular JavaScript, CSS, build tooling, release audits and GPT guidance—is in [`strikewatch-source/`](strikewatch-source/).

## Release workflow

1. Read every Markdown file under `strikewatch-source/`, beginning with `00-READ-FIRST-GPT.md` and `AGENTS.md`.
2. Make implementation and documentation changes under `strikewatch-source/`.
3. Run `strikewatch-source/build.py` and complete the documented verification gates.
4. Copy the verified `strikewatch-source/dist/strikewatch-build-<version>.html` to root `cod.html`.
5. Commit the source, updated documentation/current audit and matching `cod.html` together.

The [`other/`](other/) directory preserves unrelated legacy games, assets and retired automation. Those files are not Strikewatch dependencies.
