# Strikewatch Audit — Build 12.86

## Summary
- Compact desktop sidebar inspired by Football Manager-style left-rail navigation.
- Added the active club crest and club name at the top of the desktop sidebar.
- Reduced sidebar width on desktop and simplified section buttons to lower visual load while keeping mobile navigation unchanged.

## Files changed
- `index.html`
- `css/game.css`
- `js/00-core.js`
- `js/50-ui-menus.js`

## Notes
- The crest uses the player-selected club identity and updates automatically after team creation or import.
- The large desktop command-mark panel is hidden on wider screens so the left rail stays compact.
- Existing onboarding and saved-mail functionality from 12.85 remains intact.
