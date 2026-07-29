# Build 12.175 — Calendar Agenda CSS Ownership

## Audit item

Continues SW-020 component by component. The next bounded tail block is the Build 12.135 club calendar agenda readability and compact reflow layer.

## Change

The complete event-agenda block is removed from the tail of `css/game.css` and placed in `css/calendar-agenda.css`. Selectors, declarations and the `max-width: 1023px` breakpoint are unchanged. The new sheet loads immediately after `game.css`, preserving the block's previous position before training readability, training programme, management feedback, compact readability, reward reveal, armour viewer, weapon presentation, loadout stills, the 12.161 audit layer, compact Armoury inventory and compact navigation.

The presentation contract is unchanged. Desktop date/type/title/detail floors and the 118px action width remain intact. Below 1024px the agenda remains a 62px date column plus flexible content column; title and detail copy wrap; the action moves under the description in column two and remains at least 150px wide by 44px high. Event generation, labels, accessible names, calendar navigation, gameplay and career state are unchanged.

## Documentation

`ARCHITECTURE.md` records the new stylesheet owner and complete cascade order. `HANDOFF.md` and `AGENTS.md` carry the current operational order. `README.md`, `PROJECT.md`, `00-READ-FIRST-GPT.md` and `CHANGELOG.md` carry the current release/routing updates. Existing compact, touch-target and stylesheet-order invariants remain sufficient, so `CONTRACTS.md` is unchanged.

## Debt guardrails

The CSS report records the calendar-agenda layer separately. The `game.css` budget falls from 31,275 to 31,230 lines. Existing `!important` and media-query budgets do not increase.

## Verification

- `python3 -m py_compile build.py` passes.
- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.
- Every modular JavaScript file, the generated development bundle and standalone inline JavaScript parse.
- The event-agenda marker exists exactly once in `calendar-agenda.css` and no longer exists in `game.css`.
- Desktop and compact agenda declarations remain present, including the 62px compact date column and 150x44px action target.
- `index.html` stylesheet hrefs exactly match `CSS_PATHS` order.
- Standalone output contains no external development stylesheet links.
- The generated bundle retains `clubCalendarAgendaActionMarkup`, `clubCalendarAgendaMarkup`, `renderClubCalendarTab`, `mobileInterfaceAuditForTest` and `typographyConsistencyForTest`.
- Root `cod.html` is byte-identical to the standalone.
- Save schema 19 and diagnostics schema 1 are unchanged.
