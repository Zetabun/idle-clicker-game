# Build 12.228 audit — Desktop Inbox Badge Containment

## Problem
The desktop Inbox row placed its status indicator at the extreme right edge without reserving a matching area in the message-copy layout. Because the row clips its contents, the wider gold DECISION chip could cross the card boundary and lose its right edge. The saved and important stars use the same structural slot, so correcting only the decision chip would leave the underlying layout hazard in place.

## Change
- `css/inbox-scroll.css` now owns desktop mail-row status containment as well as Inbox scrolling.
- Decision rows reserve 96px at the inline end; saved and important rows reserve 52px.
- DECISION, saved and important indicators share one absolute status slot inset 12px from the row edge.
- The slot is vertically centred, bounded by the row width and separated from `.club-mail-row-copy`.
- The selector is restricted to `.club-mail-client[data-mail-presentation='inline']`, leaving compact/mobile modal mail unchanged.
- No JavaScript, mail state, decision authority or persistence path changes.
- Save schema 19 and diagnostics schema 1 are unchanged.

## Verification
The release compiles `build.py`, builds twice, parses every modular JavaScript file, the generated bundle and every standalone inline script with Node, and compares the deterministic bundle, standalone and report outputs. A focused headless-Chrome fixture loads the real ordered stylesheet cascade and renders decision, saved and important rows at 1024, 1280, 1440 and 1920px. For every state it requires the indicator to remain at least 8px inside the row, avoid the copy rectangle, stay vertically centred and create no row or Inbox-shell horizontal overflow. The verified standalone is copied to root `cod.html` and checked byte-for-byte before the temporary release files are removed.
