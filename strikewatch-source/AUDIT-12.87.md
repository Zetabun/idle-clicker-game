# Build 12.87 Audit — Desktop Sidebar Section Icons

## Scope

- Added distinct decorative line icons for Operations, Team, Armoury, Supplies and Club in the compact desktop sidebar.
- Preserved the selected club crest, compact rail width, text labels, notification badges and progressive-access states from Build 12.86.
- Added active, hover, guided and locked icon states using the existing route-accent system.
- Kept icons hidden below `1024px`, leaving mobile navigation unchanged.
- Gameplay, route ownership, onboarding, mail behaviour, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

## Verification requirements

- All five desktop department buttons must contain one icon without replacing their accessible text labels.
- Active and guided icons must use the existing route accent; locked icons must remain clearly muted.
- The compact rail must fit at the desktop baseline without horizontal overflow.
- Mobile department navigation must remain structurally and visually unchanged.
- Modular JavaScript, generated bundle and standalone release must pass syntax/build checks.

## Verification executed

- `python3 -m py_compile build.py` passed.
- Every modular JavaScript source and the generated bundle passed `node --check`.
- Two consecutive builds produced identical SHA-256 hashes for the bundle and standalone release.
- Browser checks at `1024x768` and `1366x768` confirmed five visible 24px icons, a 132–142px sidebar and no document/body horizontal overflow.
- A `390x844` browser check confirmed all five icons are hidden and mobile navigation remains unchanged.
- Browser runtime checks reported no page errors.
- The legacy desktop command mark was explicitly overridden with `display: none !important`, leaving the selected club crest at the top of the rail.
