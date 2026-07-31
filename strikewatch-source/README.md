# Strikewatch Source 12.220

Strikewatch is an asset-free browser tactical-club management game with
autonomous WebGL matches.

## Start

Open `index.html` through a local HTTP server. The editable project is this
directory; root `cod.html` is the GitHub Pages artifact.

Live game: https://zetabun.github.io/idle-clicker-game/cod.html

## Build

From `strikewatch-source/`:

```powershell
py -3 build.py
```

This produces:

- `js/strikewatch.dev.js`
- `dist/strikewatch-build-12.220.html`

Do not edit either generated file directly. After verification, copy the
standalone byte-for-byte to root `cod.html`.

## Documentation

Agents start with `HANDOFF.md` and `AGENTS.md`. `ARCHITECTURE.md` and
`CONTRACTS.md` are task-specific references. `CHANGELOG.md` routes historical
questions to one relevant `AUDIT-*.md`.

The historical audits remain complete but are not default reading.

## Supported presentation

- compact/mobile: below 1024px;
- desktop Command Centre: 1024px and wider;
- save schema 19;
- diagnostics schema 1.

See `HANDOFF.md` for the current release and verification workflow.
