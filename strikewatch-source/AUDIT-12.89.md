# Strikewatch Audit 12.89

## Focus
- Flatten the mobile/compact top command header so the back/forward buttons, gold balance, shortcut buttons, and end-day slot all use square edges instead of curved chrome.

## Changes made
- Added a final CSS override covering `.manager-topbar` and all of its direct header controls so every segment renders with `border-radius: 0 !important`.
- Updated the linked source build title/version string to reflect the new header-chrome pass.
- Regenerated the standalone HTML build as `strikewatch-build-12.89.html` inside `dist/` using the same flattened header chrome rules.

## Second-pass check
- Verified the override is appended at the end of `css/game.css`, which gives it priority over earlier portrait, landscape, and desktop header rules.
- Verified the standalone build contains the same override so the exported single-file build matches the source version.
