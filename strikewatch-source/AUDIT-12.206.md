# Build 12.206 audit — Contextual Mobile Navigation

## Scope
Important mobile pages such as League were difficult to discover because the persistent management header consumed vertical space while route navigation remained secondary.

## Change
- Operations Overview retains Inbox, Calendar, Help, Match and End Day controls.
- Every other compact management route collapses the large header contents.
- The existing department route list becomes a sticky, horizontally scrollable top submenu.
- Active routes remain visibly highlighted and the full Pages drawer remains available from Operations Overview.
- Desktop navigation, gameplay, save data and route authority are unchanged.

## Verification
- Exact predecessor metadata checked.
- Two deterministic builds compared.
- Modular, bundled and standalone JavaScript parsed with Node.
- Source assertions confirm contextual state and compact CSS.
- Root `cod.html` verified byte-identical to the standalone.

Save schema 19 and diagnostics schema 1 are unchanged.
