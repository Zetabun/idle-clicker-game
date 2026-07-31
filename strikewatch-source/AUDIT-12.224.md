# Build 12.224 — Image Grade and Ceiling Lights

Two changes, both in the renderer, both bounded by the same constraint: the
static batcher groups draws by exact material, so nothing here may vary per
draw. Every value added in this build is a per-frame uniform.

## What was wrong

**There was no tone curve.** The fragment shader ended on
`gl_FragColor = vec4(finalColour, uAlpha)` — the lit value written straight
out. Anything above 1.0 clipped flat, so specular, emissive surfaces and muzzle
flashes all resolved to the same white and lost their hue entirely. The arenas
also differed from one another mainly by geometry and fog colour; as images they
were the same image.

**The overhead light pools are not lights.** The shader has carried `coolPool`
and `warmPool` since well before this build, but they are an infinite `fract()`
grid — they give a room its character, they are not a light in a place. Nowhere
in any arena was there a light source positioned because that spot was dark.

## The grade

One block at the end of the existing fragment shader in
`js/60-renderer-core.js`, and the same block in the sky program
(`js/65-sky-dome.js`). Order: expose, roll off, grade in display space, frame,
dither.

- **Filmic tone curve** (Narkowicz ACES fit). Highlights now roll off with their
  hue intact rather than clipping to white.
- **Per-arena grade**, `ARENA_GRADE_PRESETS`, keyed on the existing theme:
  Citadel cold industrial, Offices neutral fluorescent, Dune warm and dusty,
  Aurora bright polar. Lift, gain and saturation-about-luma.
- **Vignette** from `gl_FragCoord` against a new `uResolution`.
- **Output dither**, +/- half a code value from the existing `hash21`. The clear
  colour is 0.028/0.044/0.056 and the scene is full of smooth gradients — fog,
  hemi, the overhead pools, baked occlusion — which band in 8-bit output.
- **Height fog.** Fog was a flat distance band at identical density on a ceiling
  and on the floor; it now settles low.

### Exposure was chosen by measurement, and the first value was wrong

The initial `exposure: 1.06` was set on the reasoning that a filmic curve
darkens midtones and needed compensating. That reasoning is wrong for this
renderer. The Narkowicz fit expects scene-referred input where 1.0 is mid-range,
not white; for this shader's roughly 0-1 lit values it **lifts** midtones
substantially — 0.2 resolves to 0.30. Measured, exposure 1.0 raised the mean
luma of a captured frame by 44-50% in every arena, and 1.06 more. That is a
wholesale brightening, not a grade, and the first capture showed it washing the
blacks out.

Sweeping exposure against the ungraded mean luma of all four arenas put the
crossover at 0.65-0.72. At the chosen **0.68** the shift is:

| Arena | Ungraded mean luma | Graded | Shift |
| --- | --- | --- | --- |
| Citadel | 0.1409 | 0.1336 | -5.2% |
| Dune | 0.3027 | 0.2943 | -2.8% |
| Offices | 0.2607 | 0.2599 | -0.3% |
| Aurora | 0.2801 | 0.2783 | -0.6% |

The curve now does what it is for — highlight rolloff and hue retention — and
the ceiling lights supply the brightening, in the places chosen for it, instead
of the exposure lifting everything indiscriminately.

**The lesson worth keeping: a tone curve's exposure is a measured quantity, not
a taste setting. Sweep it against the ungraded mean luma of every arena before
picking one.**

## The ceiling lights

`CEILING_LIGHT_POLICY` in `js/60-renderer-core.js`.

Placement reuses `staticOcclusionRaw()` — the same enclosure sampler that drives
baked occlusion — so fixtures land where the arena already measured dark rather
than at hand-typed coordinates that would go stale the moment a map changed.
Candidates on a 1.5-unit lattice, rejected if inside a wall or below the 0.42
darkness threshold, sorted darkest-first, then greedily accepted subject to
4.2-unit minimum spacing and a 14-per-arena cap. Ties break on position so
placement is deterministic — a light that moved between loads would invalidate
every capture.

Cost is bounded three separate ways: `maxPerArena` caps placement, `maxActive`
caps how many reach the shader in a frame (the nearest four to the camera), and
`range` keeps each one local. The fragment loop is therefore a fixed length
whatever the arena holds; an unused slot carries a reciprocal range of zero,
which zeroes its falloff without a branch.

Dune is excluded. It is open-air, and Build 12.143 gave it a real sky
specifically so it reads as outdoors; a ceiling fixture there would hang a light
in the sky.

The visible fixture is two static, time-independent draws, so it is left
batch-eligible and merges rather than adding per-frame draw calls.

### Device budget

The WebGL1 floor for `MAX_FRAGMENT_UNIFORM_VECTORS` is 16 and the existing
shader already spends 9. The light arrays would therefore fail to **link**, not
merely run slowly, on a spec-minimum device. `resolveCeilingLightSlots()` reads
the real limit and compiles a grade-only shader when it is tight. The grade is
the cheap half and is worth keeping everywhere.

## Evidence

Captures taken with both sides in one pass, per Build 12.160 — comparing capture
sets from different turns produced a phantom 51% regression during that build,
and two page loads cannot be one pass. `setImageGradeForTest()` and
`setCeilingLightsForTest()` exist so the reference path is reachable without a
reload.

Grade + lights, camera fixed, per arena:

| Arena | Pixels changed | Max delta | Mean delta | Draw calls before | after |
| --- | --- | --- | --- | --- | --- |
| Citadel | 100% | 70 | 28.4 | 727 | 727 |
| Dune | 100% | 75 | 44.6 | 575 | 575 |
| Offices | 99.5% | 49 | 34.1 | 961 | 961 |
| Aurora | 100% | 94 | 48.5 | 361 | 361 |

Lights alone, grade held on, camera standing under a placed fixture:

| Arena | Pixels changed | Max delta | Mean delta | Brighter | Darker |
| --- | --- | --- | --- | --- | --- |
| Citadel | 90.3% | 57 | 17.7 | 90.3% | **0%** |
| Offices | 65.0% | 56 | 9.9 | 65.0% | **0%** |
| Aurora | 98.7% | 110 | 23.6 | 98.7% | **0%** |

Zero pixels darken in any arena, which is the correctness property a purely
additive light should have.

## Gates

`imageGradeForTest()` and `ceilingLightForTest()` are new. Neither needs a
composited frame — the grade assertions are arithmetic on the same curve the
shader runs, and the light assertions read the built batch — which matters
because the browser pane is frequently not compositing.

Green: `imageGradeForTest`, `ceilingLightForTest`, `staticOcclusionForTest`,
`dynamicActorCullingForTest`, `allArenaGeometryIntegrityForTest`,
`operatorEnvironmentalLightPickupForTest`, `operatorSilhouetteSeparationForTest`,
`operatorMuzzleLightResponseForTest`, `operatorContactShadowForTest`,
`operatorTracerOriginForTest`, `spectatorDirectorForTest`,
`spectatorHandoffPresentationForTest`, `bloodSurfaceAttachmentForTest`,
`impactDecalForTest`, `simulationQualityIndependenceForTest`,
`matchClockIntegrityForTest`, `loadoutStillForTest`, `ar4WeaponModelForTest`,
`weaponGeometryIntegrityForTest`.

All 45 modular files and both standalone inline scripts parse. Two builds
produced identical dev-bundle and standalone hashes. Root `cod.html` is
byte-identical to `dist/strikewatch-build-12.224.html`.

## Secondary fix: five gates that were never runnable

`operatorEnvironmentalLightPickupForTest`, `operatorSilhouetteSeparationForTest`,
`operatorMuzzleLightResponseForTest`, `operatorContactShadowForTest` and
`operatorTracerOriginForTest` are named as release gates in both `HANDOFF.md`
and `AGENTS.md`, and all five were defined in `js/60`, `js/61` and `js/62` — but
none of them ever reached `window.__strikeDebug`, so **none had been runnable
from a browser since it was written**.

This is exactly the hazard Build 12.141 recorded: `js/70-runtime.js` assigns
`__strikeDebug` wholesale, discarding anything an earlier module attached, so a
hook must be registered from a module ordered after it. They are now registered
in `js/79-save-checkpoints.js` and all five pass.

## Known pre-existing failure, not introduced here

> **Corrected by Build 12.225.** The conclusion below — that the state was
> correct and only the audit was wrong — was half right. The audit *was* testing
> something it could not enforce, but pinch zoom was also genuinely reaching the
> play surface: `#game` inherited `body { touch-action: manipulation }`, which
> despite its name leaves pinch fully enabled. So the arena really was zoomable.
> See `AUDIT-12.225.md`.

`typographyConsistencyForTest()` returns `ok: false`. The sole failing check is
`pinchZoomDisabled: false` — and the viewport is
`width=device-width,initial-scale=1,viewport-fit=cover`, with no
`user-scalable=no`, so pinch zoom is **enabled**. Build 12.161 restored pinch
zoom deliberately as an accessibility fix, so the state is correct and the
audit's aggregation is inverting it.

Verified identical on 12.223 and 12.224. `mobileInterfaceAuditForTest()` has no
`ok` field at all, and its counts are identical between the two builds at a
matched 833px viewport (overlapping 0, collapsed 0, overflow 0, tinyText 143,
smallTargets 0). Neither is a regression from this build. The typography
aggregation is the same class of defect as Build 12.138's
`firstMatchGuidanceForTest().ok`, which was permanently false because of a
case-sensitive assertion.

## Reference paths

- `?grade=0` — ungraded output. The shader ends on
  `mix(ungraded, graded, enabled)` and `mix(a, b, 0.0)` returns `a` exactly, so
  this is a true reference rather than an approximation of one.
- `?ceilingLights=0` — fixtures still drawn, illumination off.
- `setImageGradeForTest(bool)` / `setCeilingLightsForTest(bool)` — the same two
  switches at runtime, for one-pass captures.

## Do not

- Move any grade or light value into a per-draw uniform. The batch material key
  is `colour|emissive|alpha|surface|roughness` and `imageGradeForTest()` asserts
  it still has exactly five fields.
- Add a framebuffer for this. There are none in the renderer, and bloom, SSAO
  and DOF all need one; that is a separate decision with a mobile fill-rate
  question attached, on a renderer whose frame budget is still unmeasured.
- Put a backtick anywhere in the shader source. It lives in a template literal
  and a backtick in a GLSL comment closes the string (Build 12.160).
