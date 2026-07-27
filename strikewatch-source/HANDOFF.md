# Strikewatch handoff

This is the default project handoff. Read this file and `AGENTS.md` before
editing. Load `ARCHITECTURE.md`, `CONTRACTS.md` or a historical audit only when
the task-routing table below says they are relevant.

## Current release

- Build: **12.126 — Mobile Tactics & Fixture Prep**
- Build ID: `12.126.0-mobile-tactics-fixture-prep`
- Editable source: `strikewatch-source/`
- Generated development bundle: `strikewatch-source/js/strikewatch.dev.js`
- Generated standalone: `strikewatch-source/dist/strikewatch-build-12.126.html`
- Live GitHub Pages artifact: root `cod.html`
- Save schema: **19**
- Diagnostics schema: **1**
- Historical release detail: `AUDIT-*.md`, located through `CHANGELOG.md`

Build 12.126 keeps compact tactics panels in normal scroll flow, removes the
duplicate floating confirmation control, makes the guided Next Day status
readable, and binds confirmed preparation to the scheduled fixture instead of
the current day. See `AUDIT-12.126.md`.

Build 12.125 caps the desktop Inbox feed at five rows (about four on shorter
viewports), preserves page and list scroll position when a message opens, and
adds restrained translucent desktop command chrome. Compact/mobile mail and
navigation remain unchanged. See `AUDIT-12.125.md`.

Build 12.124 shows the active team name beneath the desktop sidebar crest and
owns the desktop-inline/compact-modal Inbox presentation split. Decision
responses remain available in both presentations. See `AUDIT-12.124.md`.

Build 12.123 extends the skin to the bespoke route surfaces (section hubs,
journey strip, gates, metric tiles, recruitment/market panels). Skin changes
belong in the 12.122/12.123 theme layers near the end of `css/game.css`. See
`AUDIT-12.123.md`.

Build 12.122 is the management-skin authority: a chrome-only theme layer at
the release end of `css/game.css` gives both presentation targets the modern
FM-inspired ink/violet palette, green End Day CTA, route-accent navigation and
elevated card chrome. Change skin colours/chrome there, not in older layers.
See `AUDIT-12.122.md`.

Build 12.121 remains the mobile tactics reachability and section-containment
authority. See `AUDIT-12.121.md`.

Build 12.120 remains the compact readability, recruitment-flow, modal
accessibility and canonical guided-blocker authority. See `AUDIT-12.120.md`.

Build 12.119 remains the guided `NEXT` badge geometry authority. See
`AUDIT-12.119.md`.

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
