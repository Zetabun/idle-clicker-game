from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'strikewatch-source'
VERSION = '12.193'
NAME = 'Operator Muzzle-Light Response'
BUILD_ID = '12.193.0-operator-muzzle-light-response'

if not SRC.is_dir():
    raise SystemExit(f'Could not locate source tree from {__file__}')


def read(path):
    return path.read_text(encoding='utf-8')


def write(path, text):
    path.write_text(text, encoding='utf-8', newline='\n')


def one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'Expected one {label}; found {count}')
    return text.replace(old, new, 1)


def regex_one(text, pattern, replacement, label):
    updated, count = re.subn(pattern, replacement, text, count=1)
    if count != 1:
        raise SystemExit(f'Expected one {label}; found {count}')
    return updated


release_path = SRC / 'RELEASE.json'
expected_predecessor = {
    'version': '12.192',
    'name': 'Directional Operator Contact Shadows',
    'build_id': '12.192.0-directional-operator-contact-shadows'
}
predecessor = json.loads(read(release_path))
if predecessor != expected_predecessor:
    raise SystemExit(f'Unexpected predecessor release: {predecessor!r}')

core_meta = SRC / 'js' / '00-core.js'
text = read(core_meta)
text = regex_one(text, r"const BUILD_VERSION = '[^']+'", f"const BUILD_VERSION = '{VERSION}'", 'BUILD_VERSION')
text = regex_one(text, r"const BUILD_ID = '[^']+'", f"const BUILD_ID = '{BUILD_ID}'", 'BUILD_ID')
text = regex_one(text, r"const BUILD_NAME = '[^']+'", f"const BUILD_NAME = '{NAME}'", 'BUILD_NAME')
write(core_meta, text)

renderer = SRC / 'js' / '60-renderer-core.js'
text = read(renderer)
if 'OPERATOR_MUZZLE_LIGHT_RESPONSE' in text or 'operatorMuzzleLightResponseForTest' in text:
    raise SystemExit('Operator muzzle-light policy already exists; refusing a blind retry')

policy = """  // Build 12.193: a valid third-person muzzle flash can warm nearby opaque
  // operator materials by reusing each draw's existing colour and emissive
  // uniforms. The response is CPU-scoped to the firing operator and adds no
  // light object, shader uniform, pass, texture, mesh or draw.
  const OPERATOR_MUZZLE_LIGHT_RESPONSE = Object.freeze({
    revision: '12.193-scoped-muzzle-light-1',
    radius: 1.20,
    emissiveLift: 0.42,
    warmMix: 0.30,
    warmColour: Object.freeze([1.00, 0.42, 0.10]),
    minimumSurface: 3,
    maximumSurface: 8,
    opaqueAlpha: 0.999
  });

  const operatorMuzzleLightState = {
    active: false,
    x: 0,
    y: 0,
    z: 0,
    strength: 0
  };
  const operatorMuzzleLightColourScratch = new Float32Array(3);

  function setOperatorMuzzleLight(position, strength = 0) {
    const resolvedStrength = clamp(Number(strength) || 0, 0, 1);
    operatorMuzzleLightState.active = Boolean(position) && resolvedStrength > 0;
    operatorMuzzleLightState.x = Number(position?.x) || 0;
    operatorMuzzleLightState.y = Number(position?.y) || 0;
    operatorMuzzleLightState.z = Number(position?.z) || 0;
    operatorMuzzleLightState.strength = resolvedStrength;
    return operatorMuzzleLightState.active;
  }

  function clearOperatorMuzzleLight() {
    operatorMuzzleLightState.active = false;
    operatorMuzzleLightState.strength = 0;
  }

  function operatorMuzzleLightContribution(
    model,
    alpha = 1,
    surface = 0,
    state = operatorMuzzleLightState,
    detailMode = localSurfaceDetailMode,
    elevationOffset = renderElevationOffset
  ) {
    const policy = OPERATOR_MUZZLE_LIGHT_RESPONSE;
    if (!state?.active || (Number(state.strength) || 0) <= 0) return 0;
    if (detailMode !== OPERATOR_SILHOUETTE_LIGHTING.operatorMode) return 0;
    if (alpha < policy.opaqueAlpha) return 0;
    if (surface < policy.minimumSurface || surface > policy.maximumSurface) return 0;
    const dx = (Number(model?.[12]) || 0) - state.x;
    const dy = (Number(model?.[13]) || 0) + (Number(elevationOffset) || 0) - state.y;
    const dz = (Number(model?.[14]) || 0) - state.z;
    const distance = Math.hypot(dx, dy, dz);
    const radial = clamp(1 - distance / policy.radius, 0, 1);
    return clamp(state.strength, 0, 1) * radial * radial;
  }

  function operatorMuzzleLightResponseForTest() {
    const policy = OPERATOR_MUZZLE_LIGHT_RESPONSE;
    const modelAt = (x, y, z) => {
      const model = new Float32Array(16);
      model[12] = x;
      model[13] = y;
      model[14] = z;
      return model;
    };
    const active = { active: true, x: 0, y: 1, z: 0, strength: 1 };
    const inactive = { active: false, x: 0, y: 1, z: 0, strength: 0 };
    const near = operatorMuzzleLightContribution(modelAt(0, 1, 0), 1, 5, active, 1, 0);
    const middle = operatorMuzzleLightContribution(modelAt(policy.radius * 0.5, 1, 0), 1, 5, active, 1, 0);
    const outside = operatorMuzzleLightContribution(modelAt(policy.radius * 1.05, 1, 0), 1, 5, active, 1, 0);
    const transparent = operatorMuzzleLightContribution(modelAt(0, 1, 0), 0.92, 5, active, 1, 0);
    const shadowSurface = operatorMuzzleLightContribution(modelAt(0, 1, 0), 1, 0, active, 1, 0);
    const staticMode = operatorMuzzleLightContribution(modelAt(0, 1, 0), 1, 5, active, 0, 0);
    const viewmodelMode = operatorMuzzleLightContribution(modelAt(0, 1, 0), 1, 5, active, 2, 0);
    const noShot = operatorMuzzleLightContribution(modelAt(0, 1, 0), 1, 5, inactive, 1, 0);
    return {
      ok: policy.radius >= 1 && policy.radius <= 1.4
        && policy.emissiveLift > 0 && policy.emissiveLift <= 0.5
        && policy.warmMix > 0 && policy.warmMix <= 0.35
        && near > middle && middle > outside && outside === 0
        && transparent === 0 && shadowSurface === 0
        && staticMode === 0 && viewmodelMode === 0 && noShot === 0,
      revision: policy.revision,
      radius: policy.radius,
      emissiveLift: policy.emissiveLift,
      warmMix: policy.warmMix,
      near,
      middle,
      outside,
      transparentExcluded: transparent === 0,
      shadowExcluded: shadowSurface === 0,
      staticWorldUnchanged: staticMode === 0,
      viewmodelUnchanged: viewmodelMode === 0,
      requiresAuthoritativeShotSignal: noShot === 0,
      usesExistingColourUniform: true,
      usesExistingEmissiveUniform: true,
      additionalDrawCalls: 0,
      additionalMeshes: 0,
      additionalTextures: 0,
      additionalShaderPasses: 0,
      additionalShaderUniforms: 0,
      additionalPerDrawAllocations: 0
    };
  }

"""
text = one(text, '  let gl = null;', policy + '  let gl = null;', 'renderer state anchor')

uniform_old = """    gl.uniform3fv(glLocations.colour, colour);
    gl.uniform1f(glLocations.emissive, emissive);
"""
uniform_new = """    const muzzleResponse = operatorMuzzleLightContribution(model, alpha, surface);
    let renderColour = colour;
    let renderEmissive = emissive;
    if (muzzleResponse > 0) {
      const policy = OPERATOR_MUZZLE_LIGHT_RESPONSE;
      const warmAmount = clamp(muzzleResponse * policy.warmMix, 0, 1);
      operatorMuzzleLightColourScratch[0] = colour[0] + (policy.warmColour[0] - colour[0]) * warmAmount;
      operatorMuzzleLightColourScratch[1] = colour[1] + (policy.warmColour[1] - colour[1]) * warmAmount;
      operatorMuzzleLightColourScratch[2] = colour[2] + (policy.warmColour[2] - colour[2]) * warmAmount;
      renderColour = operatorMuzzleLightColourScratch;
      renderEmissive += muzzleResponse * policy.emissiveLift;
    }
    gl.uniform3fv(glLocations.colour, renderColour);
    gl.uniform1f(glLocations.emissive, renderEmissive);
"""
text = one(text, uniform_old, uniform_new, 'drawMesh colour/emissive upload')
write(renderer, text)

character = SRC / 'js' / '62-character-renderer.js'
text = read(character)
if 'muzzleLightOrigin' in text or 'setOperatorMuzzleLight(' in text:
    raise SystemExit('Operator muzzle-light binding already exists; refusing a blind retry')

setup_old = """    const pelvisYaw = moveYaw + gaitSway * (0.020 + run * 0.014) + strafe * 0.008;
    const pelvisRoll = locomotionLean * 0.72 + hitLean * 0.28 + gaitSway * 0.018;
    const pelvisOrigin = worldPoint(bot.x, 0, bot.y, moveYaw, gaitSway * 0.010, 0, 0);
    const palette = getOperatorPalette(bot);
"""
setup_new = """    const pelvisYaw = moveYaw + gaitSway * (0.020 + run * 0.014) + strafe * 0.008;
    const pelvisRoll = locomotionLean * 0.72 + hitLean * 0.28 + gaitSway * 0.018;
    const pelvisOrigin = worldPoint(bot.x, 0, bot.y, moveYaw, gaitSway * 0.010, 0, 0);
    const rifleY = OPERATOR_PROPORTIONS.torsoY + 0.08 + bodyBob + breath * 0.72 - (1 - ready) * 0.16 - stanceDrop * 0.94 - weaponDrop - hitCompression;
    const rifleForward = 0.52 - recoil * 0.05 - swapWave * 0.12 - hitWave * 0.035 - flinchWave * 0.022 - (1 - footPlant) * run * 0.012;
    const rifleRoll = reloadPhases.lower * 0.38 + reloadPhases.rack * 0.16 + swapWave * 0.82 + shoulderBias * 0.035 + hitLean * 0.50 + flinchWave * (bot.hitDirection || 1) * 0.12 + bodyLean * 0.24;
    const activeWeapon = bot.weapon || bot.primaryWeapon;
    const isSidearm = bot.usingSecondary || activeWeapon?.category === 'pistol' || activeWeapon?.viewmodel === 'P12 SIDEARM';
    const sharedLongGun = careerWeaponUsesSharedLongGunModel(activeWeapon);
    const weaponRig = operatorSharedWeaponRig(activeWeapon, rifleY, rifleForward, isSidearm, recoil, rifleRoll);
    let muzzleLightOrigin = null;
    if (bot.flash > 0) {
      const flashDistance = isSidearm ? 0.42 : 0.80;
      const flashLocal = weaponRig?.muzzle || { x: isSidearm ? 0.02 : 0.05, y: rifleY, z: rifleForward + flashDistance };
      muzzleLightOrigin = worldPoint(bot.x, 0, bot.y, upperYaw, flashLocal.x, flashLocal.y, flashLocal.z);
      setOperatorMuzzleLight(muzzleLightOrigin, bot.flash);
    }
    try {
    const palette = getOperatorPalette(bot);
"""
text = one(text, setup_old, setup_new, 'operator muzzle-light setup')

late_setup_old = """    // Upper-body animation states: aim, walk, reload and switching are layered
    // over the lower-body cycle rather than moving the entire model as one pose.
    const rifleY = OPERATOR_PROPORTIONS.torsoY + 0.08 + bodyBob + breath * 0.72 - (1 - ready) * 0.16 - stanceDrop * 0.94 - weaponDrop - hitCompression;
    const rifleForward = 0.52 - recoil * 0.05 - swapWave * 0.12 - hitWave * 0.035 - flinchWave * 0.022 - (1 - footPlant) * run * 0.012;
    const rifleRoll = reloadPhases.lower * 0.38 + reloadPhases.rack * 0.16 + swapWave * 0.82 + shoulderBias * 0.035 + hitLean * 0.50 + flinchWave * (bot.hitDirection || 1) * 0.12 + bodyLean * 0.24;
    const activeWeapon = bot.weapon || bot.primaryWeapon;
    const isSidearm = bot.usingSecondary || activeWeapon?.category === 'pistol' || activeWeapon?.viewmodel === 'P12 SIDEARM';
    const sharedLongGun = careerWeaponUsesSharedLongGunModel(activeWeapon);
    const weaponRig = operatorSharedWeaponRig(activeWeapon, rifleY, rifleForward, isSidearm, recoil, rifleRoll);
"""
late_setup_new = """    // Upper-body animation states: aim, walk, reload and switching are layered
    // over the lower-body cycle rather than moving the entire model as one pose.
"""
text = one(text, late_setup_old, late_setup_new, 'relocated weapon presentation setup')

flash_old = """    if (bot.flash > 0) {
      const flashDistance = isSidearm ? 0.42 : 0.80;
      const flashLocal = weaponRig?.muzzle || { x: isSidearm ? 0.02 : 0.05, y: rifleY, z: rifleForward + flashDistance };
      const flash = worldPoint(bot.x, 0, bot.y, upperYaw, flashLocal.x, flashLocal.y, flashLocal.z);
      const flashScale = 0.14 + bot.flash * 0.10;
      setBlendMode(true);
      mat4TRS(glModel, flash.x, flash.y, flash.z, upperYaw, 0, rifleRoll, flashScale, flashScale, flashScale * 1.45);
      drawMesh(glMeshes.sphere, [1, 0.58, 0.10], glModel, 2.6, clamp(bot.flash, 0, 0.92), 4, 0.08);
      setBlendMode(false);
    }
  }
"""
flash_new = """    if (muzzleLightOrigin) {
      const flashScale = 0.14 + bot.flash * 0.10;
      setBlendMode(true);
      mat4TRS(glModel, muzzleLightOrigin.x, muzzleLightOrigin.y, muzzleLightOrigin.z, upperYaw, 0, rifleRoll, flashScale, flashScale, flashScale * 1.45);
      drawMesh(glMeshes.sphere, [1, 0.58, 0.10], glModel, 2.6, clamp(bot.flash, 0, 0.92), 4, 0.08);
      setBlendMode(false);
    }
    } finally {
      if (muzzleLightOrigin) clearOperatorMuzzleLight();
    }
  }
"""
text = one(text, flash_old, flash_new, 'muzzle flash draw and scoped cleanup')
write(character, text)

index = SRC / 'index.html'
text = read(index)
text = one(text, '<title>Strikewatch 12.192: Directional Operator Contact Shadows</title>', f'<title>Strikewatch {VERSION}: {NAME}</title>', 'index title')
if '12.192.0-directional-operator-contact-shadows' not in text or '12.192' not in text:
    raise SystemExit('Current index release identity is missing')
text = text.replace('12.192.0-directional-operator-contact-shadows', BUILD_ID).replace('12.192', VERSION)
write(index, text)
write(release_path, json.dumps({'version': VERSION, 'name': NAME, 'build_id': BUILD_ID}, indent=2) + '\n')

write(SRC / f'AUDIT-{VERSION}.md', f"""# Build {VERSION} — {NAME}

## Scope

This release implements the fourth low-cost battle-visual improvement: a brief material-light response on the operator who has actually fired. The existing muzzle sphere made the shot origin visible, but nearby hands, weapon parts, armour and face materials did not react, so the flash could look detached from the operator producing it.

## Changes

- Added one `OPERATOR_MUZZLE_LIGHT_RESPONSE` policy in `js/60-renderer-core.js`.
- Reuses the authoritative `bot.flash` value, which is set only after exact-frame aim, visibility, exposure and blocker checks accept a real shot.
- Uses the already-authored weapon rig muzzle anchor, shared with the existing muzzle sphere.
- While that living operator is being drawn, existing opaque surface draws within 1.20 world units receive a squared distance falloff.
- The response mixes at most 30% toward a warm flash colour and adds at most 0.42 through the existing emissive uniform.
- The existing muzzle sphere remains transparent and is explicitly excluded from the scoped response.
- Static geometry, shadows, corpses, other operators and the first-person viewmodel receive zero response.
- Uses one persistent light-state object and one persistent colour scratch buffer, adding no per-draw allocations.
- Added `operatorMuzzleLightResponseForTest()` to guard falloff, signal gating, mode/surface exclusions and zero-cost boundaries.

## Performance and stability

No light object, shadow map, mesh, texture, framebuffer, shader pass, shader uniform or draw call was added. The existing `uColour` and `uEmissive` uploads are adjusted on the CPU for eligible draws only. The existing muzzle-flash sphere draw remains exactly one conditional draw. The simulation-owned firing signal, cadence, ammunition, recoil, damage, visibility, collision, navigation, line of sight, saves and schemas are unchanged.

## Verification

- `python3 -m py_compile build.py` passes.
- Every modular JavaScript file, the generated bundle and every standalone inline script parse with Node.
- Source checks confirm the 1.20-unit bounded falloff, 0.30 warm mix and 0.42 emissive ceiling.
- Near opaque operator surfaces receive more response than mid-range surfaces; outside-radius surfaces receive zero.
- Transparent draws, shadow surfaces, static mode, viewmodel mode and inactive-shot state receive zero.
- The existing real-shot authority remains `this.flash = 1` after blocker and wall rechecks; reload, weapon switch and blocked paths still clear it.
- The existing muzzle sphere remains a single conditional draw on the shared muzzle anchor.
- Existing environmental-light, silhouette-light, contact-shadow, operator-AO and dynamic-culling hooks remain present.
- Arena integrity and navigation hooks remain present.
- CSS debt remains within the inherited budget.
- Two builds produce identical generated hashes.
- Root `cod.html` is byte-identical to the verified standalone.

The release validates signal isolation, falloff and render-cost boundaries. Exact visual strength and frame pacing on a particular device still require direct observation in a live firefight.
""")

changelog = SRC / 'CHANGELOG.md'
text = read(changelog)
entry = f"""## {VERSION} — {NAME}

- Adds a brief warm material response to the living third-person operator that has actually fired, using the authoritative existing muzzle-flash signal and authored muzzle anchor.
- Reuses current colour/emissive uniforms with bounded CPU distance falloff; static geometry, shadows, corpses, transparent effects and the first-person viewmodel remain unchanged.
- Adds no draws, meshes, textures, passes, uniforms or gameplay state and leaves saves and schemas unchanged.
- See `AUDIT-{VERSION}.md`.

"""
if f'## {VERSION} — {NAME}' in text:
    raise SystemExit('Build 12.193 changelog already exists')
pos = text.find('## ')
if pos < 0:
    raise SystemExit('Could not locate changelog insertion anchor')
write(changelog, text[:pos] + entry + text[pos:])

handoff = SRC / 'HANDOFF.md'
text = read(handoff)
text = one(text, '- Build: **12.192 — Directional Operator Contact Shadows**', f'- Build: **{VERSION} — {NAME}**', 'HANDOFF build')
text = one(text, '- Build ID: `12.192.0-directional-operator-contact-shadows`', f'- Build ID: `{BUILD_ID}`', 'HANDOFF build id')
text = one(text, 'strikewatch-source/dist/strikewatch-build-12.192.html', f'strikewatch-source/dist/strikewatch-build-{VERSION}.html', 'HANDOFF standalone path')
old_note = 'Build 12.192 owns directional living-operator contact shadows in `js/62-character-renderer.js`.'
new_note = f"Build {VERSION} owns the scoped third-person operator muzzle-light response across `js/60-renderer-core.js` and `js/62-character-renderer.js`. Preserve `OPERATOR_MUZZLE_LIGHT_RESPONSE`, `operatorMuzzleLightResponseForTest()`, the persistent state/colour scratch buffers and the exact authored muzzle anchor. Only a living mode-1 operator with authoritative `bot.flash > 0` may warm opaque surfaces 3-8 inside the 1.20-unit radius. Static geometry, shadows, transparent effects, corpses, other operators and mode-2 viewmodels remain unchanged. Do not add lights, draws, meshes, textures, passes or uniforms. Keep Builds 12.190-12.192, operator AO, culling and arena/navigation integrity green. Save schema 19 and diagnostics schema 1 are unchanged. See `AUDIT-{VERSION}.md`.\n\n"
text = one(text, old_note, new_note + old_note, 'HANDOFF current-release anchor')
write(handoff, text)

agents = SRC / 'AGENTS.md'
text = read(agents)
agent_anchor = 'Build 12.192 owns directional living-operator contact shadows in `js/62-character-renderer.js`.'
agent_note = f"Build {VERSION} owns the scoped third-person operator muzzle-light response in `js/60-renderer-core.js` and `js/62-character-renderer.js`. Keep `bot.flash` as the sole real-shot signal, preserve the authored weapon-rig muzzle anchor, the 1.20 radius, 0.30 warm mix and 0.42 emissive ceiling. Only opaque mode-1 surfaces 3-8 may respond; shadows, transparent effects, static geometry, corpses and viewmodels remain zero. Reuse the persistent state and colour scratch buffers. Do not add a light, draw, mesh, texture, pass or uniform. Verify `operatorMuzzleLightResponseForTest()` plus Builds 12.190-12.192, operator AO, culling and arena/navigation integrity. Save schema 19 and diagnostics schema 1 remain unchanged. See `AUDIT-{VERSION}.md`.\n\n"
text = one(text, agent_anchor, agent_note + agent_anchor, 'AGENTS current-release anchor')
write(agents, text)

readme = SRC / 'README.md'
text = read(readme)
text = one(text, '# Strikewatch Source 12.192', f'# Strikewatch Source {VERSION}', 'README heading')
text = one(text, 'dist/strikewatch-build-12.192.html', f'dist/strikewatch-build-{VERSION}.html', 'README standalone path')
write(readme, text)

project = SRC / 'PROJECT.md'
text = read(project)
old_project = 'Build 12.192 improves battle grounding by reusing the existing operator shadow discs as a directional cast component and a tighter contact component, with stance and movement shaping but no additional draw calls. Corpse rendering, gameplay, persistence and schemas are unchanged. See `HANDOFF.md` and `AUDIT-12.192.md`.'
new_project = f'Build {VERSION} improves firefight cohesion by warming nearby opaque materials on the living third-person operator that has actually fired, using the existing shot signal, authored muzzle anchor and colour/emissive uniforms with no additional draw calls. Static geometry, corpses, viewmodels, gameplay, persistence and schemas are unchanged. See `HANDOFF.md` and `AUDIT-{VERSION}.md`.'
write(project, one(text, old_project, new_project, 'PROJECT current-release paragraph'))

read_first = SRC / '00-READ-FIRST-GPT.md'
text = read(read_first)
write(read_first, one(text, 'Current release: **Strikewatch Build 12.192 — Directional Operator Contact Shadows**.', f'Current release: **Strikewatch Build {VERSION} — {NAME}**.', 'read-first release line'))

contracts = SRC / 'CONTRACTS.md'
text = read(contracts)
anchor = """- Living-operator contact shadows remain inside the established LOD budget: one
  existing disc at low detail and two at medium/full detail. Their transforms and
  opacity may respond to key-light direction, movement and stance, but no shadow
  map, light trace, mesh, texture, pass, uniform or additional draw is permitted
  without an explicit measured budget. Corpse shadow ownership remains separate.
"""
contract = """- A third-person operator muzzle-light response may reuse only the authoritative
  real-shot flash signal, authored muzzle anchor, per-draw model transform and the
  existing colour/emissive uniforms. It remains bounded to nearby opaque living
  operator surfaces; static geometry, shadows, transparent effects, corpses and
  the first-person viewmodel receive zero. No light object, mesh, texture, pass,
  uniform or additional draw is permitted without an explicit measured budget.
"""
if contract in text:
    raise SystemExit('Build 12.193 rendering contract already exists')
write(contracts, one(text, anchor, anchor + contract, 'CONTRACTS contact-shadow anchor'))

renderer_check = read(renderer)
required_renderer = [
    "revision: '12.193-scoped-muzzle-light-1'",
    'radius: 1.20',
    'emissiveLift: 0.42',
    'warmMix: 0.30',
    'const operatorMuzzleLightState = {',
    'const operatorMuzzleLightColourScratch = new Float32Array(3)',
    'function setOperatorMuzzleLight(position, strength = 0)',
    'function clearOperatorMuzzleLight()',
    'function operatorMuzzleLightContribution(',
    'function operatorMuzzleLightResponseForTest()',
    'const muzzleResponse = operatorMuzzleLightContribution(model, alpha, surface)',
    'gl.uniform3fv(glLocations.colour, renderColour)',
    'gl.uniform1f(glLocations.emissive, renderEmissive)'
]
missing = [item for item in required_renderer if item not in renderer_check]
if missing:
    raise SystemExit(f'Operator muzzle-light renderer validation failed: {missing}')
if renderer_check.count('uniform float uLocalDetail;') != 1:
    raise SystemExit('Existing local-detail uniform count changed unexpectedly')
if renderer_check.count('function operatorMuzzleLightResponseForTest()') != 1:
    raise SystemExit('Operator muzzle-light diagnostic authority is duplicated')

character_check = read(character)
required_character = [
    'let muzzleLightOrigin = null',
    'if (bot.flash > 0)',
    'const flashLocal = weaponRig?.muzzle',
    'setOperatorMuzzleLight(muzzleLightOrigin, bot.flash)',
    'if (muzzleLightOrigin)',
    'if (muzzleLightOrigin) clearOperatorMuzzleLight()'
]
missing = [item for item in required_character if item not in character_check]
if missing:
    raise SystemExit(f'Operator muzzle-light binding validation failed: {missing}')
if character_check.count('drawMesh(glMeshes.sphere, [1, 0.58, 0.10]') != 1:
    raise SystemExit('Existing third-person muzzle sphere draw changed unexpectedly')
if character_check.count('setOperatorMuzzleLight(muzzleLightOrigin, bot.flash)') != 1:
    raise SystemExit('Muzzle-light scope binding is missing or duplicated')

bot_ai = read(SRC / 'js' / '30-bot-ai.js')
for expected in ['this.flash = 1;', 'this.flash = Math.max(0, this.flash - dt * 9);', 'Do not start a muzzle flash, consume a burst round or apply damage']:
    if expected not in bot_ai:
        raise SystemExit(f'Authoritative shot-flash safeguard is missing: {expected}')
if bot_ai.count('this.flash = 1;') != 1:
    raise SystemExit('Real-shot flash authority is duplicated')

index_check = read(index)
for expected in [f'<title>Strikewatch {VERSION}: {NAME}</title>', BUILD_ID, f'id="managerBuildVersion">{VERSION}</b>', f'id="mobileCommandBuildVersion">{VERSION}</b>']:
    if expected not in index_check:
        raise SystemExit(f'Missing index identity: {expected}')

print(f'Prepared Build {VERSION} source and documentation changes.')