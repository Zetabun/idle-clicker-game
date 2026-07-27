# Strikewatch handoff

This is the default project handoff. Read this file and `AGENTS.md` before
editing. Load `ARCHITECTURE.md`, `CONTRACTS.md` or a historical audit only when
the task-routing table below says they are relevant.

## Current release

- Build: **12.119 — Guided Navigation Label Fix**
- Build ID: `12.119.0-guided-navigation-label-fix`
- Editable source: `strikewatch-source/`
- Generated development bundle: `strikewatch-source/js/strikewatch.dev.js`
- Generated standalone: `strikewatch-source/dist/strikewatch-build-12.119.html`
- Live GitHub Pages artifact: root `cod.html`
- Save schema: **19**
- Diagnostics schema: **1**
- Historical release detail: `AUDIT-*.md`, located through `CHANGELOG.md`

Build 12.119 fixes the onboarding `NEXT` badge used by inactive guided
navigation targets. `.menu-subtab::after` normally draws the active-route
bottom rail. The guided state reuses that pseudo-element, so it must reset the
rail geometry before drawing a content-sized badge. Keep the badge at the
upper-right, keep it clear of the route title and hint, retain the ordinary
active rail, use 8px on desktop and the 10.5px meaningful-microcopy floor on
compact screens. See `AUDIT-12.119.md`.

Build 12.118 remains the compact typography authority. Meaningful mobile
microcopy must not fall below 10.5px. See `AUDIT-12.118.md`.

Build 12.117 remains the Skyline Offices environment authority. See
`AUDIT-12.117.md` before changing the office map, furniture, doors, ceilings,
floor markings, courtyard lanes or related geometry tests.

## Repository workflow

1. Work only in `strikewatch-source/`.
2. Do not hand-edit `js/strikewatch.dev.js`, `dist/*.html` or root `cod.html`.
3. Update the smallest relevant authority document and current audit.
4. Keep `BUILD_VERSION`, `BUILD_NAME`, `BUILD_ID`, title, asset queries, build
   stamp and both visible version labels aligned.
5. Run `py -3 build.py` from `strikewatch-source/`.
6. Check modular, generated and standalone JavaScript syntax.
7. Run targeted behaviour checks and nearby regressions.
8. Run the build twice and require byte-identical generated output.
9. Copy the verified standalone to root `cod.html` and require byte identity.
10. Commit and push source, concise documentation and release artifacts
    together.

Root `other/` contains unrelated or retired projects. Do not inspect or change
it unless the user explicitly includes it.

## Product boundaries

Strikewatch is an asset-free browser management game built with HTML, CSS,
JavaScript and custom WebGL renderers. The player creates a tactical club,
recruits and finances a persistent squad, selects an active five and watches
autonomous operators execute tactical elimination matches.

- Desktop Command Centre: `1024px` and wider.
- Compact/mobile interface: below `1024px`.
- Primary compact checks: 320, 375, 390, 402 and 430 CSS pixels.
- Primary landscape phone check: 844 × 390.
- Desktop checks: 1024, 1280, 1366, 1440 and 1920 CSS pixels.
- Do not change gameplay, persistence or another presentation target while
  fixing a scoped UI problem unless the task requires it.

## Task routing

Read only the rows relevant to the requested change.

| Task | Read next | Primary source |
| --- | --- | --- |
| Build, version or publishing | `CONTRACTS.md` → Release | `build.py`, `index.html`, `js/00-core.js` |
| Navigation or responsive UI | `CONTRACTS.md` → Interface | `css/game.css`, `js/50-ui-menus.js` |
| First Match Guide/onboarding | `CONTRACTS.md` → Onboarding | `js/50-ui-menus.js`, `js/55-opening-week.js` |
| Team, recruitment or transfers | `ARCHITECTURE.md` → Management | `js/36-team-management.js`, relevant `js/39-*.js` |
| Calendar, finance or progression | `CONTRACTS.md` → Persistence/economy | `js/35-career.js`, relevant `js/39-*.js` |
| Match AI or combat | `CONTRACTS.md` → Match | `js/30-bot-ai.js`, `js/40-match-flow.js` |
| Arenas, WebGL or operator models | `CONTRACTS.md` → Rendering/maps | `js/00-core.js`, `js/61-64-*.js` |
| Save migration or diagnostics | `CONTRACTS.md` → Persistence | `js/35-career.js`, `js/31-match-diagnostics.js` |
| Historical regression | `CHANGELOG.md`, then one matching audit | `AUDIT-<build>.md` |

Use `rg -l "<system or function>" AUDIT-*.md` to locate historical authority.
Do not read every audit by default.

## Completion handoff

Report:

- the user-visible outcome;
- files or systems changed;
- checks run and their results;
- build/version status;
- branch, commit and PR/deployment status when publishing.
