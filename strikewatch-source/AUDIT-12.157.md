# Build 12.157 — Operator Depth

## Scope

This release adds low-cost depth to the procedural WebGL operators and fixes the compact Armoury inventory failure shown on a Fold-sized viewport. The map AO implementation, operator geometry, combat simulation and saved career data are not changed.

## Operator ambient occlusion

`js/62-character-renderer.js` derives darker contact variants from each operator's existing deterministic material palette. Those variants are selected only where authored parts overlap or recess: helmet and face equipment, neck/collar, lower limbs, elbow and knee assemblies, vest straps and abdomen webbing, belt equipment, ankles and gloves.

This is baked contact shading, not screen-space AO and not shadows. It introduces no geometry or GPU pass:

- additional meshes: 0;
- additional draw calls: 0;
- additional textures: 0;
- additional shader passes: 0;
- additional shader uniforms: 0.

The living and fallen-operator paths use the same occluded palette. Collision, hit detection, navigation and line of sight are unchanged.

## Compact Armoury repair

The previous portrait rule converted `.career-inventory-list` into a horizontal carousel through 900px, but explicit grid areas were supplied only below 430px. On wider phones and Fold-sized windows, the fourth child entered an implicit row while retaining vertical writing mode. That stretched cards vertically, collapsed the comparison badge and clipped neighbouring cards.

The final compact layer now:

- uses a bounded row grid with no nested horizontal scrolling;
- defines explicit `thumb`, `copy`, `compare` and `state` areas below 1024px;
- keeps comparison badges between 62px and 76px wide;
- places issue state horizontally across the card footer;
- uses two columns only on sufficiently wide portrait/Fold layouts;
- gives narrow landscape content a stacked thumbnail/comparison, copy and state arrangement.

## Verification

- `operatorAmbientOcclusionForTest()`: all contact materials darker; every additional renderer-cost field is zero; shared living/corpse palette true; map AO, collision and hit detection unchanged.
- Draw-site parity against Build 12.156: 95 `drawMesh`, 14 `drawAnatomicalSegment` and 3 `drawSegment` call sites before and after.
- Real generated loadout route tested with four owned weapon models at 320×800, 375×812, 390×844, 430×932, 823×823 and 844×390.
- Across every tested viewport: zero document overflow, zero menu overflow, zero card overlap, no clipped card, horizontal issue-state text and visible comparison panels.
- `mobileInterfaceAuditForTest({ routes: ['loadout'] })`: zero overflow, overlapping or collapsed findings at every tested viewport.
- Browser page errors: zero.

## Release gates

- `python3 -m py_compile build.py`: pass.
- Every modular JavaScript file: `node --check` pass.
- Generated development bundle: `node --check` pass.
- Standalone inline application: `node --check` pass.
- Two consecutive builds were byte-identical.
- Deterministic bundle SHA-256: `bf9d42abc2592c721c71348b660dc9c4b5c6377b5389273a64385a7f32f23b70`.
- Deterministic standalone SHA-256: `a1a1dbfc4a40bc865e99812f161c98113c4f830557d92048a93c770cdb170e17`.
- Root `cod.html` is byte-identical to `dist/strikewatch-build-12.157.html`.

## Environment limitation

The available headless Chromium instance reports renderer error and exposes no WebGL context, so rendered operator pixels could not be captured in this environment. The AO implementation is therefore verified through palette luminance, renderer call-site parity and the existing operator geometry/presentation diagnostics. The mobile Armoury was rendered and visually inspected in Chromium.

## Compatibility

Save schema 19 and diagnostics schema 1 are unchanged. No economy, progression, inventory count, weapon statistic, match AI, map geometry, map AO, collision, navigation or line-of-sight authority changed.
