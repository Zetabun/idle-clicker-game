# Build 12.97 – desktop recruitment mobile-card parity

Build 12.97 moves desktop recruitment browsing onto the same streamlined card treatment used by the refreshed mobile view. Desktop managers now see the concise summary-first card, can expand the scouting report inline and keep the newer action layout instead of falling back to the older flip-card presentation.

## What changed
- desktop recruitment cards now render the compact mobile-style summary card by default
- the older desktop flip-card stage is hidden on desktop so both form factors share the same visual language
- desktop summary, report and back-face sections now use the same spacing, badge, metric and action treatment as mobile
- desktop recruitment grid spacing was rebalanced so the updated cards still scan comfortably across wider screens
- build metadata updated to 12.97

## Notes
- recruitment logic, scouting knowledge, shortlist flow, comparison tray and negotiation flow are unchanged
- save schema 19 and diagnostics schema 1 are unchanged

## BUILD 12.98 · Recruitment header alignment fix
- Fixed the desktop recruitment card header so the player identity no longer competes with the shortlist/details controls.
- Moved the desktop shortlist/details controls onto their own full-width action row within the streamlined parity card layout.
- Preserved the 12.97 streamlined card presentation while removing the cramped/overlapping appearance shown in QA.

## BUILD 12.99 · Three-column recruitment desktop
- Changed the desktop recruitment candidate grid to three columns on large screens and two columns on medium desktop widths.
- Preserved the streamlined mobile-style recruitment card treatment while giving each card more horizontal room.
- Intended to resolve the cramped appearance reported after the 12.98 header alignment pass.

## BUILD 12.100 · Recruitment action row fix
- Fixed the desktop recruitment action-row alignment so the shortlist control stays as a square icon button and the Details button fills the remaining space cleanly.
- Preserved the three-column large-desktop and two-column medium-desktop recruitment layouts from 12.99.
- Intended to remove the stretched/offset button bar seen in the desktop recruitment cards.

## BUILD 12.101 · Recruitment top-right header actions
- Restored the desktop recruitment header to a two-column layout so shortlist and Details sit at the top-right of each summary card, matching the preferred mobile composition.
- Removed the full-width action-row treatment introduced during the overlap fix while preserving the three-column large-desktop and two-column medium-desktop card grid.
- Kept the shortlist button square and the Details button compact so the header stays visually balanced.

## BUILD 12.102 · Recruitment desktop hover parity
- Added the stronger hover treatment used by the mobile-style recruitment cards to desktop recruitment cards as well.
- Desktop cards now lift slightly and gain a brighter glow on hover/focus, with gold hover emphasis for shortlisted cards and teal hover emphasis for compared cards.
- Kept the existing desktop card layout and top-right action-button placement unchanged.

## BUILD 12.103 · Recruitment desktop premium hover
- Refined desktop recruitment-card hover so it feels a little more premium rather than only brighter.
- Increased the lift/glow slightly and added a subtle saturation/brightness bump on desktop hover and focus.
- Top-right Details and shortlist controls now also brighten with the card on desktop hover, matching the nicer interactive feel of the mobile cards more closely.
