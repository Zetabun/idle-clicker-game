# Build 12.239 audit — Cohesive Operator Rig

## Scope

Build 12.239 continues the asset-free operator silhouette work from 12.238. It
changes only procedural presentation geometry in `js/60-renderer-core.js` and
authored third-person body widths in `js/62-character-renderer.js`.

## Geometry decisions

- The permanent cloth sleeve is taller and shifted down 0.055 units, overlapping
  both the ribcage and the upper-arm segment instead of reading as a separate
  shoulder object.
- The torso's lower rings and pelvis's top/bottom rings are broader. Pelvis
  height is 0.260, producing at least 0.050 units of vertical waist overlap.
- Living and corpse thighs use a shared 0.170 width and 0.150 depth; calves use
  0.130 and 0.112. The pelvis is 0.440 wide so the fuller hip caps remain within
  its outer silhouette.
- Limb end ratios rise to 0.88 proximally and 0.74 distally. End caps remain
  closed, so joints retain material volume while moving.

No meshes, draws, textures, shader passes or uniforms were added. Hitboxes,
animation anchors, navigation, collision, line of sight, AI and simulation are
unchanged.

## Verification

- `operatorBodySilhouetteForTest()` is green: shoulder/ribcage overlap 0.0759,
  waist overlap 0.050, thigh width 0.170, calf width 0.130, and all eight
  connectivity/conditional-armour checks true.
- `operatorModel()` keeps living and corpse leg lengths stable, knees forward,
  feet above the floor, compact proportions and the shared surface audit green.
- Operator ambient occlusion, environmental-light pickup, silhouette
  separation, muzzle-light response, contact shadows, tracer origin, dynamic
  culling, weapon attachment, held pose and corpse presentation all return
  `ok: true`.
- Staged 1280×720 exhibition captures show the longer sleeve bridging into the
  arm, a continuous waist and visibly fuller upper legs without new draw parts.
- The application still logs the pre-existing `menuSection is not defined`
  compact-navigation startup error reproduced on 12.237/12.238. The browser
  controller also emitted one URL-less MutationObserver error; the only project
  observer guards its target before calling `observe()`. No operator-path error
  was logged.
- `py -3 build.py` succeeds. All 45 modular/generated JavaScript files and both
  standalone inline scripts parse.
- Two consecutive builds are byte deterministic:
  - bundle SHA-256: `D1465EC748B27296D838B38B4DEC8A3577584C2BAAD4168D28DD5B5300EF3605`
  - standalone SHA-256: `CB2FAC9A1B9047CB17A18F006A784E721152E5F3CA1F1023F5C7E04760AFAFBB`
- Root `cod.html` has the standalone hash above and is byte-identical.
- CSS debt remains inside budget: 2269/2270 flagged declarations and 484/484
  media queries.
