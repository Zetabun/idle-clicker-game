# Build 12.204 audit — Operator Career Story

## Scope
Player profiles already stored deep performance and accolade history, but the player had to read the entire timeline to understand an operator's overall career story.

## Change
- Added a derived career snapshot in `js/56-world-press-awards.js`.
- Player profiles now summarise appearances, wins, K/D, total awards, MOTM count, major honours, best recorded award rating, milestones, seasons, clubs and latest defining moment.
- All values are derived from existing player career, history and world-press records.
- No save schema, award settlement or fixture authority changed.

## Verification
- Exact predecessor checked.
- Two deterministic builds compared.
- All modular, bundled and standalone JavaScript parsed with Node.
- Root `cod.html` verified byte-identical to the standalone.

Save schema 19 and diagnostics schema 1 are unchanged.
