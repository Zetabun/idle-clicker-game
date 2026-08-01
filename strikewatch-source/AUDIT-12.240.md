# Build 12.240 — Adaptive Mobile Lighting

This release reduces the mobile cost of Build 12.224's authored ceiling lights
without removing the lighting identity they added. Desktop Full retains the
existing four-light maximum and the image grade is unchanged.

## Root cause

The world fragment shader compiled four positional-light iterations on every
device. Each active iteration calculates distance, falloff, direction and a
Lambert term per fragment. Empty slots also executed that maths, including on
Dune where no ceiling fixtures exist. At the same time,
`selectActiveCeilingLights()` allocated one wrapper object per nearby fixture
and sorted those wrappers on every rendered frame, creating avoidable collector
pressure exactly while the camera moved through lit areas.

The render governor had two adjacent mobile faults. Most compact touch devices
started at Full whenever they reported more than two CPU cores and omitted
`navigator.deviceMemory`; they therefore had to accumulate pressure before
dropping quality. Its portrait minima reached 0.62/0.68 in policy, but
`resize()` clamped the applied scale back to 0.72, so the lowest settings could
never reach the drawing buffer.

## Implementation

- `runtimeMobileRenderHint` combines the existing compact boundary with touch
  or coarse-pointer capability. Those devices start at Balanced; genuinely
  constrained hardware still starts at Constrained. This remains render-only.
- `ceilingLightSlotTargetForDevice()` compiles four slots for Full desktop, two
  for mobile/Balanced and one for Constrained, still capped by the queried
  `MAX_FRAGMENT_UNIFORM_VECTORS` budget.
- A coherent `lightPosRange.w > 0.0` uniform branch skips all expensive light
  arithmetic for empty slots, outdoor arenas and the runtime reference path.
- Nearest-light selection is a bounded insertion into persistent light-reference
  and `Float32Array` distance storage. It allocates no wrapper objects and does
  not sort.
- The upload-view result object is persistent rather than recreated each frame.
- `resize()` now honours `RENDER_RESOLUTION_SCALE_FLOOR = 0.62`; the existing
  absolute DPR floor of 0.82 remains. Mobile pressure steps begin after 18 slow
  frames; desktop remains at 28.

The live 12.239 page also logged `ReferenceError: menuSection is not defined`
from the compact-navigation DOM-ready sync. `menuSection` has no authority in
the current router; the active section is derived by `menuSectionForRoute()`.
The sync now accepts a nullable section and resolves the current route through
that existing authority. This is a startup correction only and changes no
route or navigation policy.

## Visual contract

Fixture positions, fixture geometry, tint, intensity, range, additive response,
static batching, the ACES tone curve, per-arena lift/gain/saturation, vignette,
dither and height fog are unchanged. Desktop Full is algebraically identical
for every active light. Mobile keeps the two closest contributing fixtures,
which preserves the dominant local pools while bounding fragment cost. Dune
still receives no fixtures.

## Gates

`mobileLightingPerformanceForTest()` proves the 4/2/1 slot policy, persistent
selection/upload containers, direct light references and 0.62 resolution floor.
The release must also keep `ceilingLightForTest()`, `imageGradeForTest()`,
`staticOcclusionForTest()`, `runtimeQualityGovernorForTest()`,
`mobileAdaptiveResolutionForTest()`, `simulationQualityIndependenceForTest()`,
renderer/operator lighting gates and all-arena integrity green.
`navigationSubmenuForTest()` covers the adjacent startup correction.

## Reference path

`?mobileRender=1` forces the mobile render hint for desktop browser QA. It does
not change gameplay, persistence or responsive layout; it selects the same
Balanced/two-slot startup path that a compact touch/coarse device selects
automatically.

## Release evidence

- Two consecutive deterministic builds produced SHA-256
  `310418DBE008D6C871ACB898C9CDF4A76FA0B89F42826F6E33AA6E6DBE95FE19`
  for `js/strikewatch.dev.js` and
  `32571DA50F8F7819C423BC93A0D0C7A1B2E7F83B5DBC31EA0FF887867EDF9B61`
  for the standalone.
- All source scripts and both standalone inline scripts parsed successfully.
- Every targeted renderer, operator, arena, governor and navigation gate listed
  above passed on the forced mobile path with two compiled shader slots.
- Back-to-back Office captures with the ceiling-light runtime path enabled and
  disabled changed 62.28% of sampled RGB channels (mean delta 7.745, maximum
  delta 67), confirming that the authored lighting remains visually material.
- Browser console inspection after startup and the full gate run reported no
  errors or warnings.

The source, audit, concise documentation, generated artifacts and verified root
standalone are committed together. GitHub Pages deployment evidence is recorded
against that release commit.
