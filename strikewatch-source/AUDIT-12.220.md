# Build 12.220 audit — Mobile Mail Read Control

## Problem
Compact/mobile email dialogs marked a message as read as soon as it opened, then offered a counter-intuitive MARK AS UNREAD control.

## Change
- Compact/mobile mail now remains unread when its dialog opens.
- The dialog toolbar now provides MARK AS READ.
- Pressing MARK AS READ updates the authoritative mail record, closes the dialog and refreshes the Inbox counters.
- Already-read messages opened from Saved mail show the same disabled action rather than an unread toggle.
- Desktop inline mail keeps its established automatic read-on-selection behaviour.
- Decision controls, Saved mail, related-page routes and inbox persistence are unchanged.

## Verification
The release requires deterministic bundle and standalone builds, parsing of every modular JavaScript file plus generated/standalone JavaScript, targeted source assertions for the mobile action, and root/standalone byte identity. Save schema 19 and diagnostics schema 1 remain unchanged.
