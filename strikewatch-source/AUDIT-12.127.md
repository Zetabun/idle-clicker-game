# Build 12.127 audit

## Scope

- Replace the cramped compact combat-effectiveness presentation with a
  normal-flow score header and readable legend.
- Focus the radar plot on the useful chart area instead of reserving space for
  tiny perimeter labels.
- Expose Precision, Control, Awareness, Mobility and Endurance through readable
  combined/base/weapon stat tiles on compact screens.
- Adapt the plot and readout to narrow, medium and wide compact containers
  while preserving the established desktop chart.

## Implementation

- `js/35-career.js` keeps the existing SVG data authority and adds an
  accessible compact HTML breakdown generated from the same values.
- `css/game.css` adds a Build 12.127 responsive layer below 1024px. Narrow graph
  containers use one tile column, medium containers use two, and wide compact
  containers place the chart beside the readout.
- `js/00-core.js` and `index.html` advance all build identifiers and visible
  version labels to Build 12.127.

## Verification

- All 34 modular JavaScript files, the generated bundle and the standalone
  inline script parse successfully.
- Responsive browser checks passed at 320, 375, 390, 402, 430, 768, 844 x 390,
  1024 and 1366 CSS pixels with zero document-level horizontal overflow.
- Compact checks confirm a normal-flow score header, 12px supporting labels,
  five visible stat tiles, exact hidden-SVG/readout value parity, contained
  panels and no stat-label truncation.
- The 768px container uses the side-by-side plot/readout presentation. Narrow
  compact containers remain stacked, including the landscape card case.
- At 1024px and 1366px the original absolute desktop heading, perimeter SVG
  labels and hidden mobile tiles remain unchanged.
- Headed Chromium checks at 390px, 768px and 1366px used SwiftShader WebGL and
  reported no console warnings/errors, page errors or runtime faults. Save
  integrity and schema-19 career round trips passed at all three widths.
- Two consecutive builds were byte-identical:
  - bundle SHA-256:
    `94383C8464CF18130647A104D0C98B25876C3BDDA5F9BE5FC76783A4FF6EA9B8`
  - standalone/root SHA-256:
    `A43D05B80A90AC50EEA60A7E5853AE841FD9E220CE650DFC268DF4DA7E3C4A21`
- Root `cod.html` is byte-identical to the verified standalone.
