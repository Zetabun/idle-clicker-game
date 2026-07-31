# Build 12.200 audit — Single-Source Management Prompts

## Scope

Mobile Operations overview repeated the same required action in the MUST RESPOND blocker list, the generic priority strip and, for some states, a later dashboard action card.

## Change

- `js/50-ui-menus.js` now resolves the Operations blocker markup before the generic priority strip and suppresses that strip whenever MUST RESPOND is active.
- After the blocker list is inserted, later known management-priority cards are removed only when their primary label exactly matches a current end-day blocker.
- The canonical blocker list keeps the existing route/action wiring. Matchday, transfer, sponsorship and future blocker categories share the same label-based rule.
- No gameplay, economy, save, schema, calendar or match simulation authority changed.

## Verification

- Predecessor `RELEASE.json` version checked before patching.
- Python build script compiled.
- Two complete builds compared byte-for-byte.
- Every modular JavaScript file, the generated development bundle and all standalone inline scripts parsed with Node.
- Root `cod.html` copied from and verified byte-identical to the generated standalone.
- Source assertions confirm blocker resolution precedes priority rendering and duplicate suppression stays scoped outside `.club-must-respond-strip`.

Save schema 19 and diagnostics schema 1 are unchanged.
