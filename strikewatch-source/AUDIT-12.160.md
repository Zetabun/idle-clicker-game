# Build 12.160 — Settled Operators

Removes the shimmering surface on operators, the same class of fault Build
12.145 fixed for arena walls, and deepens the operator contact occlusion added
in Build 12.157 so it actually reads.

## Why operators shimmered

12.145 fixed wall shimmer by replacing a mismatched-grid hash with smooth value
noise. Operators had a different root cause with the same symptom, which is why
that fix never reached them.

Every surface mode reads `vWorldPosition`. For a wall that is correct — the
detail is pinned to the room and stays put. **An operator moves through the
room**, so world-space detail does not travel with them; the world sweeps across
them as they walk. Three separate terms were doing it:

| Term | What it was | Why it shimmered |
| --- | --- | --- |
| Surface 5, tactical fabric (operator kit) | `sin(x * 95.0) * sin(y * 88.0)`, 7% swing | 95 and 88 cycles per world unit. 12.145 established that anything above roughly **40** aliases into banding — this was more than double, and it crawled across the kit every step. |
| Surface 8, exposed skin | `sin(y * 31.0 + x * 17.0)` | Same problem on faces and hands, the parts a player looks at. |
| Overhead light pools | `coolPool` / `warmPool` on a 5x4 and 8x6 world grid, plus a `floor()` in the flicker phase | These are light pools laid out on the room. An operator crossing the grid was brightened and dimmed several times a second, and the `floor()` made it a hard step rather than a fade. |

## The fix

The vertex shader now also carries the model-space position, and the fragment
shader chooses which space the surface layer reads:

```glsl
vec3 detailPosition = mix(vWorldPosition, vLocalPosition, clamp(uLocalDetail, 0.0, 1.0));
```

`uLocalDetail` is 1 only inside `withLocalSurfaceDetail()`, which wraps exactly
two things: the operator draw — living and fallen — and the first-person
viewmodel, which is welded to the camera and had the same problem. Everything
else, including static batch replay, draws with it clear.

Alongside that, surface 5's weave drops from 95/88 cycles at a 7% swing to 26/22
at 3.5%, now measured against a model that is about 1.8 units tall rather than
against the room, and surface 8's skin variation is halved. The light pools take
a steady average on moving geometry instead of whatever cell the operator is
standing in.

### The static world is provably untouched

`mix(a, b, 0.0)` returns `a` exactly, so world geometry takes the identical code
path it did before. Confirmed by capturing the same free-roam viewpoint on both
builds, back to back:

| Arena | Draw calls | Pixels differing > 2/255 | Mean delta | Max |
| --- | --- | --- | --- | --- |
| Citadel | 714 both | **0.0000%** | 0.0030 | 1 |
| Dune Bastion | 387 both | **0.0000%** | 0.0070 | 1 |
| Skyline Offices | 820 both | **0.0000%** | 0.0012 | 1 |
| Aurora Terminal | 178 both | **0.0000%** | 0.0000 | 1 |

Max difference of 1/255 across every arena is float rounding. Surface 5 has
**zero** uses in the world renderer — it is operator-only — so retuning its
frequency could not affect the world, and surface 3, which the world uses 148
times, was only re-pointed at `detailPosition` and not retuned.

## Operator ambient occlusion

It was already enabled. Build 12.157 baked it into the palette, and the audit
confirms it is applied at roughly thirty draw sites across the living and corpse
paths with zero extra draws. The problem was depth: the contact factors gave an
8-18% luminance drop, which is the same magnitude Build 12.153 measured as too
shallow to read on arena walls — and an operator is smaller and darker than a
wall.

Deepened, still colour-baked:

| Material | 12.157 | 12.160 |
| --- | --- | --- |
| webbing | 18% | **32%** |
| polymer | 16% | **28%** |
| utility | 15% | **26%** |
| cloth | 12% | **22%** |
| skin | 12% | **20%** |
| plate | 11% | **21%** |
| armour | 10% | **20%** |
| clothLight | 9% | **18%** |
| metal | 8% | **16%** |

Zero additional meshes, draw calls, textures, shader passes or uniforms, and
living and corpse paths still share the palette — the 12.157 contract holds.
This is a dial: `OPERATOR_AMBIENT_OCCLUSION.factors` in
`js/62-character-renderer.js`, lower means darker contact.

## Checks run

| Check | Result |
| --- | --- |
| `py -3 build.py` | pass |
| Double build, bundle and standalone hashes | **identical** |
| Root `cod.html` vs standalone | **byte-identical** |
| 44 modular files + bundle + standalone inline script parse | **44/44, 1/1** |
| Static world unchanged, four arenas back to back | **0.0000% changed, max 1/255** |
| Draw calls unchanged in all four arenas | 714 / 387 / 820 / 178, both builds |
| `operatorAmbientOcclusionForTest()` | all contact materials darker, 0 extra draws, shared living/corpse palette |
| `allArenaGeometryIntegrityForTest`, `arenaGeometryIntegrityForTest` | pass |
| Navigation graphs, all four arenas | **identical** — citadel 502/2160/1, dune 494/2752/1, aurora 540/2552/5, office 464/1948/1 |
| `arenaSurfaceSampleForTest`, `staticOcclusionForTest`, `operatorViewOcclusionForTest`, `auroraTerminalAuditForTest` | pass |
| `weaponGeometryIntegrityForTest`, `ar4WeaponModelForTest`, `viewmodelWeaponPresentationForTest`, `operatorWeaponAttachmentForTest` | pass |
| `careerIndexedDbForTest`, `storagePressureSaveForTest`, `durableMatchSettlementForTest`, `loadoutStillForTest` | pass |
| Renderer state | `webgl`, shader compiled, no console errors |
| Boot reliability, 5 fresh loads per build | 12.159 5/5 (~304ms), 12.160 5/5 (~298ms) |

Collision, navigation, line of sight, gameplay, saves and match simulation are
untouched. Geometry is unchanged; this build alters only which coordinate space
the surface layer samples and how deep the baked contact shading goes.

## Two traps worth recording

**Backticks inside a GLSL comment terminate the shader.** The shader lives in a
JavaScript template literal, so a comment written with backticks around an
identifier closed the string and produced a `SyntaxError` in an unrelated part
of the bundle. Never use backticks inside the shader source, and check the
bundle boots after editing it.

**A pixel A/B is only valid back to back.** An earlier comparison of these same
arenas reported 51-65% of pixels changed, which looked like a serious
regression. It was not — the two capture sets had been taken in different turns
under different state. Captured back to back the same views are identical, and a
same-build control confirms the method is deterministic to within 1/255. Capture
both sides of a comparison in one pass.

## For anyone extending this

- Surface detail for anything that **moves** must be anchored to the model, not
  the world. `withLocalSurfaceDetail()` is how; wrap the whole draw.
- Static geometry must never set it, or the world starts swimming instead.
- Keep detail frequency under roughly 40 cycles per unit of the space being
  sampled — the 12.145 threshold applies in model space too.
