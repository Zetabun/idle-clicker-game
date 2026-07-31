# Build 12.227 audit — Desktop Inbox Preview Stability

## Problem
On the desktop inline Inbox, selecting an unread message marked it read and saved the career before rebuilding the mail layout. Inbox visibility normally excludes read messages and permits one only while its transient `selectedMailId` remains active. If the save boundary normalised or replaced the persistent career object, that transient selection was lost before `renderMailTab()` resolved the preview. The clicked row therefore disappeared and the preview pane stayed empty.

The compact/mobile branch is intentionally different: Build 12.220 keeps a modal-opened message unread until the player presses MARK AS READ.

## Change
- Desktop selection is reasserted immediately after `saveCareerState()` and before `updateMenuUI()`.
- The clicked message therefore remains eligible through `clubMailVisibleInInbox()` even though it has just become read.
- The existing inline reader renders the full sender, subject, body and actions without creating a second mail authority.
- Desktop automatic read-on-selection is preserved.
- Compact/mobile modal opening, explicit MARK AS READ, Saved mail, decision controls, related-page routes and mail persistence are unchanged.
- Stale `RELEASE.json`, `README.md` and `PROJECT.md` metadata is reconciled from 12.223 to this release while the source predecessor is independently verified as 12.226.
- Save schema 19 and diagnostics schema 1 are unchanged.

## Verification
The release checks the exact desktop selection/save/reselection/render order and the selected-read visibility clause, while also asserting the compact/mobile modal still defaults to unread and exposes MARK AS READ. It then compiles `build.py`, builds twice, parses every modular JavaScript file, the generated bundle and every standalone inline script with Node, compares deterministic bundle/standalone/report outputs, copies the verified standalone to root `cod.html`, confirms byte identity and removes the temporary release files before committing to `main`.
