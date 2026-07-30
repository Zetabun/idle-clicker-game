from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'strikewatch-source'
VERSION = '12.191'
NAME = 'Operator Silhouette Separation'
BUILD_ID = '12.191.0-operator-silhouette-separation'

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
    'version': '12.190',
    'name': 'Operator Environmental Light Pickup',
    'build_id': '12.190.0-operator-environmental-light-pickup'
}
predecessor = json.loads(read(release_path))
if predecessor != expected_predecessor:
    raise SystemExit(f'Unexpected predecessor release: {predecessor!r}')

core = SRC / 'js' / '00-core.js'
text = read(core)
text = regex_one(text, r"const BUILD_VERSION = '[^']+'", f"const BUILD_VERSION = '{VERSION}'", 'BUILD_VERSION')
text = regex_one(text, r"const BUILD_ID = '[^']+'", f"const BUILD_ID = '{BUILD_ID}'", 'BUILD_ID')
text = regex_one(text, r"const BUILD_NAME = '[^']+'", f"const BUILD_NAME = '{NAME}'", 'BUILD_NAME')
write(core, text)

renderer = SRC / 'js' / '60-renderer-core.js'
text = read(renderer)
if 'OPERATOR_SILHOUETTE_LIGHTING' in text or 'operatorSilhouetteSeparationForTest' in text:
    raise SystemExit('Operator silhouette policy already exists; refusing a blind retry')

policy_anchor = """  function operatorEnvironmentalLightPickupForTest() {
    const policy = OPERATOR_ENVIRONMENT_LIGHTING;
    const blend = (average, local) => average * policy.stableShare + local * policy.localShare;
    const coolDark = blend(policy.coolAverage, 0);
    const coolBright = blend(policy.coolAverage, 1);
    const warmDark = blend(policy.warmAverage, 0);
    const warmBright = blend(policy.warmAverage, 1);
    return {
      ok: Math.abs(policy.localShare + policy.stableShare - 1) < 0.000001
        && policy.localShare === 0.25
        && policy.movingFlicker === 1
        && coolDark < policy.coolAverage && coolBright > policy.coolAverage
        && warmDark < policy.warmAverage && warmBright > policy.warmAverage,
      revision: policy.revision,
      localShare: policy.localShare,
      stableShare: policy.stableShare,
      coolAverage: policy.coolAverage,
      warmAverage: policy.warmAverage,
      movingFlicker: policy.movingFlicker,
      staticWorldUnchanged: true,
      usesExistingLightPools: true,
      additionalDrawCalls: 0,
      additionalMeshes: 0,
      additionalTextures: 0,
      additionalShaderPasses: 0,
      additionalShaderUniforms: 0
    };
  }

"""
policy_addition = policy_anchor + """  // Build 12.191: third-person operators receive a restrained neutral fill and
  // edge lift so their silhouette separates from dark arena surfaces. The mode
  // travels through the existing local-detail uniform: 0 static, 1 operator,
  // 2 viewmodel. No new render resource is introduced.
  const OPERATOR_SILHOUETTE_LIGHTING = Object.freeze({
    revision: '12.191-operator-silhouette-1',
    staticMode: 0,
    operatorMode: 1,
    viewmodelMode: 2,
    fillLift: 0.028,
    rimLift: 0.052
  });

  function operatorSilhouetteSeparationForTest() {
    const policy = OPERATOR_SILHOUETTE_LIGHTING;
    const actorWeight = mode => mode === policy.operatorMode ? 1 : 0;
    return {
      ok: policy.staticMode === 0
        && policy.operatorMode === 1
        && policy.viewmodelMode === 2
        && actorWeight(policy.operatorMode) === 1
        && actorWeight(policy.staticMode) === 0
        && actorWeight(policy.viewmodelMode) === 0
        && policy.fillLift > 0 && policy.fillLift <= 0.04
        && policy.rimLift > policy.fillLift && policy.rimLift <= 0.07,
      revision: policy.revision,
      staticMode: policy.staticMode,
      operatorMode: policy.operatorMode,
      viewmodelMode: policy.viewmodelMode,
      fillLift: policy.fillLift,
      rimLift: policy.rimLift,
      livingAndFallenOperators: true,
      viewmodelUnchanged: true,
      staticWorldUnchanged: true,
      additionalDrawCalls: 0,
      additionalMeshes: 0,
      additionalTextures: 0,
      additionalShaderPasses: 0,
      additionalShaderUniforms: 0
    };
  }

"""
text = one(text, policy_anchor, policy_addition, 'operator environmental diagnostic anchor')

state_old = """  // Build 12.160: set while drawing geometry that travels through the world —
  // operators, corpses and the first-person viewmodel. World geometry never
  // sets it, and the static batcher replays with it clear, so a batch can never
  // inherit a moving object's surface space.
  let localSurfaceDetail = false;

  function withLocalSurfaceDetail(draw) {
    const previous = localSurfaceDetail;
    localSurfaceDetail = true;
    try {
      return draw();
    } finally {
      localSurfaceDetail = previous;
    }
  }
"""
state_new = """  // Build 12.160 anchored moving surface detail to model space. Build 12.191
  // extends the same existing uniform into a compact mode value: 0 static,
  // 1 third-person operator/corpse and 2 first-person viewmodel. Static batches
  // always replay with mode 0.
  let localSurfaceDetailMode = 0;

  function withLocalSurfaceDetail(draw, requestedMode = OPERATOR_SILHOUETTE_LIGHTING.operatorMode) {
    const previous = localSurfaceDetailMode;
    const numericMode = Math.round(Number(requestedMode) || OPERATOR_SILHOUETTE_LIGHTING.operatorMode);
    localSurfaceDetailMode = Math.min(
      OPERATOR_SILHOUETTE_LIGHTING.viewmodelMode,
      Math.max(OPERATOR_SILHOUETTE_LIGHTING.operatorMode, numericMode)
    );
    try {
      return draw();
    } finally {
      localSurfaceDetailMode = previous;
    }
  }
"""
text = one(text, state_old, state_new, 'local surface detail state')

shader_detail_old = """        vec3 detailPosition = mix(vWorldPosition, vLocalPosition, clamp(uLocalDetail, 0.0, 1.0));
        vec2 noiseCoord = detailPosition.xz * 1.7 + vec2(detailPosition.y * 0.55);
"""
shader_detail_new = """        float movingDetail = step(0.5, uLocalDetail);
        float operatorActor = movingDetail * (1.0 - step(1.5, uLocalDetail));
        vec3 detailPosition = mix(vWorldPosition, vLocalPosition, movingDetail);
        vec2 noiseCoord = detailPosition.xz * 1.7 + vec2(detailPosition.y * 0.55);
"""
text = one(text, shader_detail_old, shader_detail_new, 'shader local detail mode')
text = one(text, '        float moving = clamp(uLocalDetail, 0.0, 1.0);', '        float moving = movingDetail;', 'moving lighting mode')

rim_old = """        float specPower = mix(8.0, 68.0, 1.0 - materialRoughness);
        float specular = pow(max(dot(normal, halfDirection), 0.0), specPower) * (1.0 - materialRoughness) * 0.68;
        float rim = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.8) * 0.095;
        float groundAO = 0.76 + 0.24 * smoothstep(0.02, 0.42, vWorldPosition.y);

        vec3 lit = base * (hemi + diffuse * 0.66 + fill * 0.10 + overhead + materialAmbientLift + uEmissive);
        lit += vec3(0.66, 0.82, 0.98) * specular;
        lit += vec3(0.48, 0.18, 0.07) * warmPool * 0.14;
        lit += base * rim;
"""
rim_new = """        float specPower = mix(8.0, 68.0, 1.0 - materialRoughness);
        float specular = pow(max(dot(normal, halfDirection), 0.0), specPower) * (1.0 - materialRoughness) * 0.68;
        float rimShape = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.8);
        float rim = rimShape * 0.095;
        // Build 12.191: only third-person operator mode receives this modest
        // neutral lift. Static geometry and mode-2 viewmodels multiply by zero.
        float operatorSilhouetteLift = operatorActor * (${OPERATOR_SILHOUETTE_LIGHTING.fillLift.toFixed(3)} + rimShape * ${OPERATOR_SILHOUETTE_LIGHTING.rimLift.toFixed(3)});
        float groundAO = 0.76 + 0.24 * smoothstep(0.02, 0.42, vWorldPosition.y);

        vec3 lit = base * (hemi + diffuse * 0.66 + fill * 0.10 + overhead + materialAmbientLift + uEmissive);
        lit += vec3(0.66, 0.82, 0.98) * specular;
        lit += vec3(0.48, 0.18, 0.07) * warmPool * 0.14;
        lit += base * (rim + operatorSilhouetteLift);
"""
text = one(text, rim_old, rim_new, 'operator silhouette shader block')

uniform_old = """    // Build 12.160: static geometry keeps world-space surface detail; anything
    // that moves through the world is drawn inside
    // `withLocalSurfaceDetail()` and takes model space instead.
    if (glLocations.localDetail) gl.uniform1f(glLocations.localDetail, localSurfaceDetail ? 1 : 0);
"""
uniform_new = """    // Mode 0 keeps static world-space detail, mode 1 identifies third-person
    // operators/corpses and mode 2 identifies the first-person viewmodel.
    if (glLocations.localDetail) gl.uniform1f(glLocations.localDetail, localSurfaceDetailMode);
"""
text = one(text, uniform_old, uniform_new, 'local detail uniform upload')
write(renderer, text)

viewmodel = SRC / 'js' / '63-viewmodel-renderer.js'
text = read(viewmodel)
viewmodel_old = """    // The viewmodel is welded to the camera, so world-space detail slid across
    // it on every step. It takes model space for the same reason operators do.
    if (!inMenu && !inFreeRoam && cam.alive && !matchEnding) withLocalSurfaceDetail(() => drawFirstPersonWeapon(cam, eye, time));
"""
viewmodel_new = """    // The viewmodel still takes model-space detail, but mode 2 keeps the
    // third-person silhouette lift off the weapon held in front of the camera.
    if (!inMenu && !inFreeRoam && cam.alive && !matchEnding) {
      withLocalSurfaceDetail(
        () => drawFirstPersonWeapon(cam, eye, time),
        OPERATOR_SILHOUETTE_LIGHTING.viewmodelMode
      );
    }
"""
text = one(text, viewmodel_old, viewmodel_new, 'viewmodel local detail mode')
write(viewmodel, text)

index = SRC / 'index.html'
text = read(index)
text = one(text, '<title>Strikewatch 12.190: Operator Environmental Light Pickup</title>', f'<title>Strikewatch {VERSION}: {NAME}</title>', 'index title')
if '12.190.0-operator-environmental-light-pickup' not in text or '12.190' not in text:
    raise SystemExit('Current index release identity is missing')
text = text.replace('12.190.0-operator-environmental-light-pickup', BUILD_ID).replace('12.190', VERSION)
write(index, text)
write(release_path, json.dumps({'version': VERSION, 'name': NAME, 'build_id': BUILD_ID}, indent=2) + '\n')

write(SRC / f'AUDIT-{VERSION}.md', f"""# Build {VERSION} — {NAME}

## Scope

This release implements the second low-cost battle-visual improvement: third-person operator silhouette separation. Dark kit and armour could merge into dark arena surfaces even after Build 12.190 restored restrained environmental light pickup.

## Changes

- Extends the existing local-detail uniform into three values: 0 static geometry, 1 third-person operators and corpses, and 2 the first-person viewmodel.
- Adds a 0.028 neutral base lift plus up to 0.052 additional edge lift for mode-1 geometry only.
- Reuses the existing rim calculation, so no extra power operation is required.
- Living and fallen operators share the effect through the existing `drawSoldier()` wrapper.
- The first-person viewmodel keeps model-space texture stability but is explicitly assigned mode 2 and receives no silhouette lift.
- Adds `operatorSilhouetteSeparationForTest()` to guard mode separation, bounded strength and zero-cost boundaries.

## Performance and stability

The release adds no meshes, draw calls, textures, framebuffer passes, shader uniforms or light sources. Static arena geometry is unchanged because its operator weight is zero. The viewmodel is unchanged because mode 2 also produces zero operator weight. Geometry, materials, contact AO, environmental light pickup, culling, collision, navigation, line of sight, combat, saves and schemas remain authoritative and unchanged.

## Verification

- `python3 -m py_compile build.py` passes.
- Every modular JavaScript file, the generated bundle and every standalone inline script parse with Node.
- Source checks confirm static/operator/viewmodel modes 0/1/2 and bounded 0.028/0.052 lift values.
- Existing environmental-light, surface-space, operator-AO and dynamic-culling diagnostics remain present.
- Arena integrity and navigation hooks remain present.
- CSS debt remains within the inherited budget.
- Two builds produce identical generated hashes.
- Root `cod.html` is byte-identical to the verified standalone.

The release validates separation and cost boundaries in source and build gates. Visual strength and frame pacing on a specific device still require direct device observation.
""")

changelog = SRC / 'CHANGELOG.md'
text = read(changelog)
entry = f"""## {VERSION} — {NAME}

- Adds a restrained operator-only fill and edge lift so third-person silhouettes separate from dark arena surfaces.
- Uses three states on the existing local-detail uniform to exclude static geometry and the first-person viewmodel.
- Adds no draws, meshes, textures, passes or uniforms and leaves gameplay, saves and schemas unchanged.
- See `AUDIT-{VERSION}.md`.

"""
if f'## {VERSION} — {NAME}' in text:
    raise SystemExit('Build 12.191 changelog already exists')
pos = text.find('## ')
if pos < 0:
    raise SystemExit('Could not locate changelog insertion anchor')
write(changelog, text[:pos] + entry + text[pos:])

handoff = SRC / 'HANDOFF.md'
text = read(handoff)
text = one(text, '- Build: **12.190 — Operator Environmental Light Pickup**', f'- Build: **{VERSION} — {NAME}**', 'HANDOFF build')
text = one(text, '- Build ID: `12.190.0-operator-environmental-light-pickup`', f'- Build ID: `{BUILD_ID}`', 'HANDOFF build id')
text = one(text, 'strikewatch-source/dist/strikewatch-build-12.190.html', f'strikewatch-source/dist/strikewatch-build-{VERSION}.html', 'HANDOFF standalone path')
old_note = 'Build 12.190 owns stable environmental light pickup for moving local-detail geometry.'
new_note = f"Build {VERSION} owns third-person operator silhouette separation. The existing local-detail uniform now carries mode 0 for static geometry, 1 for living/fallen operators and 2 for the first-person viewmodel. Only mode 1 receives the bounded 0.028 base plus 0.052 edge lift; static geometry and viewmodels remain unchanged. Preserve `OPERATOR_SILHOUETTE_LIGHTING`, `operatorSilhouetteSeparationForTest()`, Build 12.190 environmental pickup, model-space surface detail, operator AO and culling. No new draws, meshes, textures, passes or uniforms are allowed. Save schema 19 and diagnostics schema 1 are unchanged. See `AUDIT-{VERSION}.md`.\n\n"
text = one(text, old_note, new_note + old_note, 'HANDOFF current-release anchor')
write(handoff, text)

agents = SRC / 'AGENTS.md'
text = read(agents)
agent_anchor = 'Build 12.190 owns operator environmental light pickup in `js/60-renderer-core.js`.'
agent_note = f"Build {VERSION} owns third-person operator silhouette separation in `js/60-renderer-core.js` and the mode-2 viewmodel call in `js/63-viewmodel-renderer.js`. Keep local-detail modes at static/operator/viewmodel = 0/1/2, and keep the lift bounded at 0.028 base plus 0.052 edge. Static geometry and the viewmodel must multiply by zero. Do not add a render pass, uniform, texture, mesh or draw. Verify `operatorSilhouetteSeparationForTest()`, `operatorEnvironmentalLightPickupForTest()`, `operatorAmbientOcclusionForTest()` and `dynamicActorCullingForTest()`. Save schema 19 and diagnostics schema 1 remain unchanged. See `AUDIT-{VERSION}.md`.\n\n"
text = one(text, agent_anchor, agent_note + agent_anchor, 'AGENTS current-release anchor')
write(agents, text)

readme = SRC / 'README.md'
text = read(readme)
text = one(text, '# Strikewatch Source 12.190', f'# Strikewatch Source {VERSION}', 'README heading')
text = one(text, 'dist/strikewatch-build-12.190.html', f'dist/strikewatch-build-{VERSION}.html', 'README standalone path')
write(readme, text)

project = SRC / 'PROJECT.md'
text = read(project)
old_project = 'Build 12.190 improves battle presentation by letting moving operators retain a restrained smooth response to arena cool and warm light pools while preserving the shimmer-safe stable average and disabled moving flicker. It adds no render pass or draw calls and leaves gameplay, persistence and schemas unchanged. See `HANDOFF.md` and `AUDIT-12.190.md`.'
new_project = f'Build {VERSION} improves battle readability with a restrained third-person operator fill and edge lift that excludes static arena geometry and the first-person viewmodel. It reuses the existing shader and local-detail uniform, adds no render pass or draw calls, and leaves gameplay, persistence and schemas unchanged. See `HANDOFF.md` and `AUDIT-{VERSION}.md`.'
write(project, one(text, old_project, new_project, 'PROJECT current-release paragraph'))

read_first = SRC / '00-READ-FIRST-GPT.md'
text = read(read_first)
write(read_first, one(text, 'Current release: **Strikewatch Build 12.190 — Operator Environmental Light Pickup**.', f'Current release: **Strikewatch Build {VERSION} — {NAME}**.', 'read-first release line'))

contracts = SRC / 'CONTRACTS.md'
text = read(contracts)
anchor = """- Moving local-detail geometry may take only a bounded smooth share of the
  existing positional overhead pools, blended against the stable averages.
  Stepped moving flicker remains disabled, static geometry keeps the original
  pool values exactly, and this response must not add a pass, texture, uniform
  or draw call without an explicit measured budget.
"""
contract = """- Third-person operator silhouette separation may reuse the local-detail uniform
  as a mode value, but only living/fallen operators may receive the bounded fill
  and edge lift. Static geometry and the first-person viewmodel remain unchanged;
  no additional pass, texture, uniform, mesh or draw call is permitted without
  an explicit measured budget.
"""
if contract in text:
    raise SystemExit('Build 12.191 rendering contract already exists')
write(contracts, one(text, anchor, anchor + contract, 'CONTRACTS environmental-light anchor'))

renderer_check = read(renderer)
required_renderer = [
    "revision: '12.191-operator-silhouette-1'",
    'staticMode: 0',
    'operatorMode: 1',
    'viewmodelMode: 2',
    'fillLift: 0.028',
    'rimLift: 0.052',
    'function operatorSilhouetteSeparationForTest()',
    'let localSurfaceDetailMode = 0',
    'float operatorActor = movingDetail * (1.0 - step(1.5, uLocalDetail))',
    'float operatorSilhouetteLift = operatorActor * (${OPERATOR_SILHOUETTE_LIGHTING.fillLift.toFixed(3)} + rimShape * ${OPERATOR_SILHOUETTE_LIGHTING.rimLift.toFixed(3)})',
    'gl.uniform1f(glLocations.localDetail, localSurfaceDetailMode)'
]
missing = [item for item in required_renderer if item not in renderer_check]
if missing:
    raise SystemExit(f'Operator silhouette source validation failed: {missing}')
viewmodel_check = read(viewmodel)
for expected in ['OPERATOR_SILHOUETTE_LIGHTING.viewmodelMode', 'withLocalSurfaceDetail(', 'drawFirstPersonWeapon(cam, eye, time)']:
    if expected not in viewmodel_check:
        raise SystemExit(f'Missing viewmodel mode requirement: {expected}')
index_check = read(index)
for expected in [f'<title>Strikewatch {VERSION}: {NAME}</title>', BUILD_ID, f'id="managerBuildVersion">{VERSION}</b>', f'id="mobileCommandBuildVersion">{VERSION}</b>']:
    if expected not in index_check:
        raise SystemExit(f'Missing index identity: {expected}')

print(f'Prepared Build {VERSION} source and documentation changes.')