# Build 12.241 — Self-Lit Ceiling Fixtures

The authored ceiling panels looked switched off whenever they were not among
the nearest fixtures contributing positional light. Their geometry was already
emissive and static, but the 0.92 material value landed too close to the graded
ceiling after exposure, ACES roll-off and arena gain.

## Implementation

Each dark housing receives a shallow lens on its underside and
`CEILING_LIGHT_POLICY.fixtureEmissive` is raised from 0.92 to 6.00 for that
lens. The dark housing and mount deliberately share one static material group;
all lenses share the other, so three source meshes still replay as two batches.
The lens uses the renderer's existing material uniform and is presentation-only
and unconditional: all placed panels remain self-lit even when
`setCeilingLightsEnabled(false)` removes positional room illumination or when a
fixture is outside the nearest-light selection.

No bloom, texture, animation, light slot, framebuffer, render pass or per-frame
calculation is added. The shallow static geometry is captured once and adds no
material group or replay draw. The existing 4/2/1 desktop, mobile and
constrained positional-light policy remains the entire dynamic cost.

## Visual and performance contract

- Every indoor fixture panel must read as on from below.
- Self-illumination must remain visible with dynamic ceiling lighting disabled.
- Fixture placement, tint, dynamic intensity and range are unchanged.
- Desktop Full keeps four positional slots; mobile Balanced keeps two and
  Constrained keeps one.
- Image grading, fog, adaptive resolution, gameplay and schemas are unchanged.

## Gates

`ceilingLightForTest()` now requires a fixture emissive of at least 5.5 and
reports the zero-draw/texture/pass presentation contract. Keep
`mobileLightingPerformanceForTest()`, `imageGradeForTest()`,
`staticOcclusionForTest()`, runtime/adaptive quality, simulation independence,
renderer/operator lighting and all-arena integrity green. Visual QA must stage
an indoor arena on the forced mobile path and capture the same fixture view
with positional illumination both enabled and disabled.

## Release evidence

- Two consecutive final builds produced SHA-256
  `22B1DC26025EFEB2CE571E0D356660F1DC6B72836941DC8735820AF39AD1592E`
  for `js/strikewatch.dev.js` and
  `026380528A84C9125C41D0F355A7B7D0CE4F80E9742EC85D3E6164FEC0221877`
  for the standalone.
- Every modular script and the standalone inline script parsed successfully;
  the size/CSS-debt build gates and `git diff --check` passed.
- Phone-landscape QA loaded Build 12.241 at Balanced with two compiled ceiling
  light slots. The ceiling-light, mobile-lighting, image-grade, static
  occlusion, quality-governor, simulation-independence, operator-lighting,
  culling and all-arena integrity results were green.
- The landscape adaptive-resolution diagnostic reached its intended 0.70
  landscape minimum and consequently did not satisfy its portrait-only 0.62
  assertion; that unchanged path was proven at portrait size in Build 12.240.
- A close capture from directly below a real Aurora fixture showed the shallow
  lens visibly self-lit with dynamic ceiling illumination disabled. The same
  frame retained the two-slot mobile shader path.

The source, concise documentation, audit, generated artifacts and verified root
standalone are committed together. Deployment evidence is recorded against the
release commit.
