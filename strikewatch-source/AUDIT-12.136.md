# Build 12.136 — Row Sizing audit

## Scope

Hotfix for a regression introduced by Build 12.135: management panels printed
on top of one another on an existing save.

## Cause

Build 12.135 correctly identified that `#menuContent` is a grid with a definite
block size, and that a grid item whose overflow is not visible gets an
automatic minimum size of zero, letting the grid squash its rows. The fix
applied there — `#menuContent > * { min-height: max-content }` — treated the
item rather than the track.

The rows stayed undersized. Giving each item a content-based minimum meant it
no longer shrank, but its row did not grow to match, so the panel overflowed
its own row and rendered over the following one. The 12.135 build swapped one
failure for the other: content was no longer clipped, it was overlapped.

Measured on an existing save at 390px on the League route: container height a
definite 712px, nine rows sized 48–83px each, and **8 overlapping panel pairs**
with intersections up to 1589px.

## Fix

Size the tracks instead of the items:

```css
#menuContent {
  grid-auto-rows: max-content;
  align-content: start;
}
```

With `max-content` rows the grid stops distributing the container's definite
height across the tracks, so each panel gets a row as tall as its content. The
item-level minimum from 12.135 is no longer required and has been removed with
it.

Candidates were measured against each other on the live build before the change
was written:

| Candidate | Overlaps | Clipped |
| --- | --- | --- |
| 12.135 as shipped (`min-height` on items) | 8 | 0 |
| `align-content: start` alone | 8 | 0 |
| `min-height` removed, nothing else | 0 | 7 |
| **`grid-auto-rows: max-content`** | **0** | **0** |

`grid-auto-rows: max-content` alone resolves both failures, which is why the
item rule is dropped rather than kept alongside it.

## Regression guard

`mobileInterfaceAuditForTest()` gains an `overlapping` check: no two adjacent
children of the scroll container may intersect. It is the mirror of the
existing `collapsed` check — an undersized row either clips its panel or lets
it print over the next one, and both now fail the audit.

## Verification

| Check | 390px | 1440px |
| --- | --- | --- |
| Overlapping panel pairs | 0 | 0 |
| Collapsed containers | 0 | 0 |
| Horizontal overflow | 0 | 0 |
| Undersized touch targets | 0 | — |
| Routes with any issue | none | none |
| Training cards rendered | 5 | 5 |

League route at 390px: 0 overlaps, table panel unclipped at 1177px with all 20
rows present. Training roster panel `clientHeight === scrollHeight` (2778px).

- `py -3 build.py` succeeds; two consecutive builds byte-identical.
- Title, `window.__STRIKEWATCH_BUILD__` and both visible labels resolve to
  12.136 / `12.136.0-row-sizing`.
- No console errors.
- Root `cod.html` byte-identical to `dist/strikewatch-build-12.136.html`.
- `scrollWidth === clientWidth` at 390 and 1440.

The Build 12.135 league settlement recovery, readability rules and agenda
action label are unchanged and still verified.
