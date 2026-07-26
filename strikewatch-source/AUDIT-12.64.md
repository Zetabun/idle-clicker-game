# Audit 12.64 — Mobile Page Help Toggle

## Scope

Build 12.64 converts the highlighted mobile topbar shortcut into a contextual Help toggle. The goal was to let players remove the page-description bar when they already understand the interface, while keeping the guidance and Club Navigator immediately available when needed. Desktop navigation and the desktop Match shortcut remain unchanged.

## Documentation review

All 64 incoming Markdown files were read before implementation. Historical audit records were retained unchanged. The current authority documents and handoff contract were updated for Build 12.64.

## Implementation

### Mobile Help control

- Added the semantic `managerHelpToggleBtn` topbar button with a visible `?` glyph.
- The control is shown only below `1024px`; the previous mobile Match shortcut is hidden at those widths.
- The inactive state is white. The enabled state uses the established gold accent, highlighted background and underline.
- The touch target remains at least 44 pixels.
- `aria-pressed`, `aria-expanded` and `aria-controls` track the visible state.

### Contextual bar behaviour

- The existing `mobileCommandRouteBar` is hidden by default and removed from layout, leaving no empty gap.
- Enabling Help restores the complete existing bar: department, page title, concise page purpose, progress state and **Pages** action.
- **Pages** continues to open the full Club Navigator.
- Hiding Help does not remove page discovery because tapping the active persistent department still opens the navigator.

### Preference and state boundaries

- The preference is stored under `strikewatch.mobilePageHelpVisible`.
- Stored `1` restores Help on startup; stored `0` or no value starts with Help hidden.
- The preference is presentation-only and remains outside the schema-19 career save.
- Storage errors are tolerated without interrupting menu startup.

### Responsive onboarding copy

- The first-session shortcut guide labels the third shortcut **HELP** on mobile.
- Desktop continues to label and expose the third shortcut as **MATCH**.

### Second-pass correction

The route matrix exposed a mobile persistent-department label that could still resolve below the intended readability baseline. The final mobile authority now fixes those labels at 10px without affecting desktop typography.

## Verification

### Focused interaction tests

Passed at 390×844, 844×390 and 1366×768:

- white question mark and hidden bar on initial mobile state
- gold question mark and visible bar after enabling
- correct `aria-pressed`, `aria-expanded` and bar `aria-hidden` values
- **Pages** opens the Club Navigator
- disabling removes the bar and restores the white state
- local-storage values update to `1` and `0`
- a seeded enabled preference restores on launch
- portrait bar height remains 70px when visible
- compact-landscape bar height remains 60px when visible
- desktop Help remains hidden and desktop Match remains visible
- no JavaScript errors or horizontal overflow

### Full route matrix

All 24 management routes were tested at:

- 320×720
- 390×844
- 430×932
- 844×390
- 1024×768
- 1366×768

Mobile viewports were tested with Help both off and on. Desktop viewports were tested with the desktop state. **240 route/state combinations passed with zero failures.** Checks covered document overflow, topbar bounds, 44-pixel Help target, correct mobile/desktop shortcut visibility, correct bar state, navigation containment and JavaScript exceptions.

### Retained diagnostics

The following diagnostics passed in the tested states:

- `mobilePageHelpForTest()`
- `armour3dPresentationForTest()`
- `armourLoadoutMappingForTest()`
- `typographyConsistencyForTest()`
- `onboardingClarityForTest()`
- `newPlayerOrientationForTest()`
- `firstMatchGuidanceForTest()`
- `progressiveInterfaceForTest()`
- `economyGuidanceForTest()`
- `stateIntegrityForTest()`

State integrity reports `12.64.0-mobile-page-help-toggle`. Save schema 19 and diagnostics schema 1 remain unchanged.

## Build and archive gates

- Python build script syntax passed.
- Modular, generated and standalone JavaScript syntax passed.
- Duplicate-ID inspection passed.
- Two consecutive production builds were byte-identical.
- The final source ZIP passed complete integrity testing.

## Result

The mobile header now provides a clear optional-help model: compact by default, explanatory on demand and visibly stateful. The change preserves the Build 12.62 navigation architecture, Build 12.63 Armoury optimisation and the desktop command layout.
