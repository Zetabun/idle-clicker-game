# Build 12.106 – configurable management page background

## Scope

Add an appearance option to **Club → Configuration** that changes the large background canvas behind management UI panels, matching the areas highlighted in the supplied Armoury screenshot.

## Implementation

- `js/50-ui-menus.js` adds:
  - a validated `#RRGGBB` management-background preference
  - six restrained dark presets
  - a native custom-colour input
  - live preview, active-preset and reset-state synchronisation
  - derived lighter/darker gradient stops
  - persistence under `strikewatch.interfaceBackgroundColour.v1`
- `js/70-runtime.js` delegates Configuration clicks, input events and change events to the new appearance handlers.
- `css/game.css` applies the selected gradient only to `.menu-content`, the large management canvas behind cards and panels.
- The Configuration card includes a representative preview, colour picker, hexadecimal readout, presets and reset button.

## Boundaries

- Panel/card surfaces are not recoloured.
- Sidebar and topbar chrome are not recoloured.
- Route accents and status colours are not recoloured.
- Match rendering and HUD presentation are not recoloured.
- The preference is independent of career state; save schema remains 19 and diagnostics schema remains 1.
- Build 12.105's disabled `LIVE // SECURE FEED` pseudo-label remains unchanged.

## Verification completed

- `python3 -m py_compile build.py` passed.
- Modified source modules passed `node --check`.
- `python3 build.py` generated the development bundle and standalone 12.106 release.
- Chromium interaction checks confirmed:
  - the Configuration route renders one custom picker and six presets
  - selecting Deep Teal updates the CSS variable, picker, active preset and computed `.menu-content` background immediately
  - reset restores `#07131d` and disables the reset control
  - a custom `#201020` input updates the management canvas immediately
  - a preloaded stored preference is applied during startup and subsequent preset changes write back to the independent storage key
  - an invalid stored colour safely falls back to the Command Navy default
- Responsive Chromium checks at 390×844, 844×390 and 1366×768 found zero horizontal overflow in the Configuration card or menu content.
- The only headless runtime warning was the expected unavailable WebGL context; no appearance-setting page errors were recorded.
