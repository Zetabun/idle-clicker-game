# Build 12.229 audit — Configuration Access & Mobile Mail Dismissal

## Problems

1. Configuration still existed and rendered correctly, but its Club route was marked `contextOnly`. Every normal Club navigation surface filters context-only routes, so Configuration disappeared from the desktop subsection navigation, compact contextual navigation and Club overview cards.
2. Compact/mobile MARK AS READ closed the dialog before refreshing the Inbox, retained the selected mail id, then attempted to focus the row after the read filter could remove it. The same branch also emitted the contradictory legacy status MESSAGE RETURNED TO INBOX.

## Changes

- `js/50-ui-menus.js` removes `contextOnly` from the `settings` route. Configuration now uses the established route renderer and appears wherever normal Club routes are listed.
- `js/39-club-operations.js` clears `careerState.selectedMailId` when it points to the message being read, saves, refreshes the Inbox, then closes the shared mail dialog with `restoreFocus: false`.
- The stale row-focus request and MESSAGE RETURNED TO INBOX status are removed.
- Desktop inline mail still marks selected mail read automatically and keeps its Build 12.227 selection-restoration order.
- No renderer, economy, match, mail-decision or persistence schema authority changes.
- Save schema 19 and diagnostics schema 1 are unchanged.

## Verification

The release builds twice and requires byte-identical bundles, standalone files and generated reports. Every modular JavaScript file, the generated bundle and all standalone inline scripts parse with Node. Targeted source checks evaluate the real `menuSections` object and compact mail handler. A headless-Chrome fixture runs at 390px and 1440px using those extracted source blocks: Configuration must render among normal Club routes, while clicking the real MARK AS READ branch must mark the mail read, clear selection, call save then Inbox refresh then dialog close, pass `restoreFocus: false`, emit one status and leave the modal hidden. Root `cod.html` must be byte-identical to the verified standalone.
