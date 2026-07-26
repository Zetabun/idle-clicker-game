# Strikewatch Audit 12.90

## Focus
- Reduce the visual bulk of the desktop left menu rail.
- Present desktop menu items as compact single-line rows.
- Remove the boxed chrome around the club logo at the top of the rail.

## Changes made
- Narrowed the desktop sidebar column to 104px and tightened internal spacing.
- Removed the club-brand panel styling on desktop so only the crest itself remains visible.
- Compressed desktop section buttons into slim one-line rows with smaller padding, smaller type, and a simple three-part layout (index, icon, title).
- Tightened desktop sidebar action buttons to match the lighter rail.
- Updated the linked source/build version string for this pass.

## Second-pass check
- Verified the new desktop-only override block sits at the end of `css/game.css`, so it wins over earlier sidebar styling.
- Verified the standalone HTML build includes the same override block, keeping the export aligned with the source version.
