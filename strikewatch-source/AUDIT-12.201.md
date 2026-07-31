# Build 12.201 audit — Mobile Action Hierarchy

## Scope

Compact management pages needed a clearer visual order after repeated prompts were removed. The urgent blocker surface could still occupy most of a phone viewport after the player had read it.

## Change

- MUST RESPOND now renders as an open native `details` disclosure with a compact summary containing the blocker count, primary action and short context.
- Compact users can collapse the urgent surface while retaining the information needed to reopen it.
- The rendered management page explicitly records whether it owns an urgent or recommended action. Urgent blockers take precedence; the ordinary priority strip is recommended only when no urgent blocker exists.
- Phone presentation reduces repeated explanatory copy while preserving every blocker action and route.
- No calendar, transfer, sponsor, match, economy, persistence or simulation authority changed.

## Verification

- Exact Build 12.200 predecessor metadata checked before patching.
- `build.py` compiled and ran twice with byte-identical bundle, standalone and report outputs.
- Every modular JavaScript file, generated bundle and standalone inline script parsed with Node.
- Source assertions covered disclosure markup, urgent/recommended rank ownership and compact CSS.
- Root `cod.html` was copied from and verified byte-identical to the generated standalone.

Save schema 19 and diagnostics schema 1 are unchanged.
