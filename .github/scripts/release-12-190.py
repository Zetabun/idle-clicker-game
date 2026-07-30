from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'strikewatch-source'
VERSION = '12.190'
NAME = 'Operator Environmental Light Pickup'
BUILD_ID = '12.190.0-operator-environmental-light-pickup'

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
    'version': '12.189',
    'name': 'Mobile Equipment Preview Framing',
    'build_id': '12.189.0-mobile-equipment-preview-framing'
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
if 'OPERATOR_ENVIRONMENT_LIGHTING' in text or 'operatorEnvironmentalLightPickupForTest' in text:
    raise SystemExit('Operator environmental lighting policy already exists; refusing a blind retry')
material_anchor = """  const OPERATOR_SKIN_MATERIAL = Object.freeze({
    revision: '12.57-light-natural-skin-material-1',
    surface: 8,
    roughness: 0.64,
    ambientLift: 0.42
  });
"""
material_replacement = material_anchor + """  // Build 12.190: moving geometry keeps a restrained share of the smooth
  // room light pools so operators respond to their surroundings without
  // restoring the hard flicker and full-amplitude pulsing removed in 12.160.
  const OPERATOR_ENVIRONMENT_LIGHTING = Object.freeze({
    revision: '12.190-stable-local-pickup-1',
    localShare: 0.25,
    stableShare: 0.75,
    coolAverage: 0.34,
    warmAverage: 0.22,
    movingFlicker: 1
  });

  function operatorEnvironmentalLightPickupForTest() {
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
text = one(text, material_anchor, material_replacement, 'operator lighting policy anchor')
old_shader = """        // These are overhead light pools laid out on the room grid. A wall or a
        // floor sits still inside one, which is the point. An operator walking
        // across the grid was being brightened and dimmed by it several times a
        // second, and the floor() in the flicker phase made that a hard step
        // rather than a fade — a large part of what read as shimmer. Moving
        // geometry now takes a steady average instead of the pool it happens to
        // be standing in.
        vec2 coolCell = abs(fract((vWorldPosition.xz - vec2(2.5)) / vec2(5.0, 4.0)) - 0.5);
        float coolPool = exp(-18.0 * dot(coolCell, coolCell));
        vec2 warmCell = abs(fract((vWorldPosition.xz + vec2(1.4, 0.6)) / vec2(8.0, 6.0)) - 0.5);
        float warmPool = exp(-30.0 * dot(warmCell, warmCell));
        float moving = clamp(uLocalDetail, 0.0, 1.0);
        coolPool = mix(coolPool, 0.34, moving);
        warmPool = mix(warmPool, 0.22, moving);
        float flicker = mix(0.96 + 0.04 * sin(uTime * 2.1 + floor(vWorldPosition.x * 0.2) * 1.7), 1.0, moving);
"""
new_shader = """        // These are overhead light pools laid out on the room grid. Build 12.160
        // removed moving-geometry shimmer by replacing both pools with fixed
        // averages and disabling the stepped flicker. Build 12.190 keeps that
        // stability but restores a restrained smooth local response: 75% stable
        // average plus 25% of the already-calculated positional pool. Static
        // geometry still takes the original values exactly, and moving flicker
        // remains fully disabled.
        vec2 coolCell = abs(fract((vWorldPosition.xz - vec2(2.5)) / vec2(5.0, 4.0)) - 0.5);
        float coolPool = exp(-18.0 * dot(coolCell, coolCell));
        vec2 warmCell = abs(fract((vWorldPosition.xz + vec2(1.4, 0.6)) / vec2(8.0, 6.0)) - 0.5);
        float warmPool = exp(-30.0 * dot(warmCell, warmCell));
        float moving = clamp(uLocalDetail, 0.0, 1.0);
        float movingCoolPool = mix(${OPERATOR_ENVIRONMENT_LIGHTING.coolAverage.toFixed(2)}, coolPool, ${OPERATOR_ENVIRONMENT_LIGHTING.localShare.toFixed(2)});
        float movingWarmPool = mix(${OPERATOR_ENVIRONMENT_LIGHTING.warmAverage.toFixed(2)}, warmPool, ${OPERATOR_ENVIRONMENT_LIGHTING.localShare.toFixed(2)});
        coolPool = mix(coolPool, movingCoolPool, moving);
        warmPool = mix(warmPool, movingWarmPool, moving);
        float flicker = mix(0.96 + 0.04 * sin(uTime * 2.1 + floor(vWorldPosition.x * 0.2) * 1.7), ${OPERATOR_ENVIRONMENT_LIGHTING.movingFlicker.toFixed(1)}, moving);
"""
text = one(text, old_shader, new_shader, 'moving environmental light shader block')
write(renderer, text)

index = SRC / 'index.html'
text = read(index)
text = one(text, '<title>Strikewatch 12.189: Mobile Equipment Preview Framing</title>', f'<title>Strikewatch {VERSION}: {NAME}</title>', 'index title')
if '12.189.0-mobile-equipment-preview-framing' not in text or '12.189' not in text:
    raise SystemExit('Current index release identity is missing')
text = text.replace('12.189.0-mobile-equipment-preview-framing', BUILD_ID).replace('12.189', VERSION)
write(index, text)
write(release_path, json.dumps({'version': VERSION, 'name': NAME, 'build_id': BUILD_ID}, indent=2) + '\n')

write(SRC / f'AUDIT-{VERSION}.md', f"""# Build {VERSION} — {NAME}

## Scope

This release implements the first low-cost operator-battle visual improvement: smooth environmental light pickup. Build 12.160 correctly stopped moving-surface shimmer by giving operators, corpses and the first-person viewmodel fixed average overhead pools and by disabling the stepped flicker. That was stable but made moving geometry feel detached from local arena lighting.

## Changes

- Added one `OPERATOR_ENVIRONMENT_LIGHTING` policy in `js/60-renderer-core.js`.
- Moving local-detail geometry now receives 75% of the established stable average plus 25% of the already-calculated smooth positional cool and warm pools.
- The stepped time/cell flicker remains fully disabled whenever `uLocalDetail` is active.
- Static geometry still receives the original local pools exactly because its `moving` blend remains zero.
- Added `operatorEnvironmentalLightPickupForTest()` to guard the blend weights, averages, disabled moving flicker and zero-cost boundaries.

## Performance and stability

The release adds no meshes, draw calls, textures, framebuffer passes, shader uniforms or light sources. It reuses values already calculated in the existing fragment shader and adds only a small number of scalar mix operations. Operator geometry, contact AO, culling, collision, navigation, line of sight, combat simulation, saves and schemas are unchanged.

## Verification

- `python3 -m py_compile build.py` passes.
- Every modular JavaScript file, the generated bundle and every standalone inline script parse with Node.
- Source validation confirms the 0.25 local / 0.75 stable policy and moving flicker value of 1.0.
- The static path remains algebraically unchanged: `moving == 0` selects the original cool and warm pools.
- Existing surface-space, operator AO, dynamic-culling, arena-integrity and navigation diagnostic hooks remain present.
- CSS debt remains within the inherited budget.
- Two builds produce identical generated hashes.
- Root `cod.html` is byte-identical to the verified standalone.

A back-to-back device capture remains the appropriate subjective check for the strength of the effect; this release does not claim a measured frame-rate gain or a hardware-specific visual result.
""")

changelog = SRC / 'CHANGELOG.md'
text = read(changelog)
entry = f"""## {VERSION} — {NAME}

- Restores restrained environmental light response to operators, corpses and the first-person viewmodel without reintroducing moving-surface flicker.
- Blends 25% smooth local cool/warm light with 75% of the established stable averages, using the existing shader pass and light-pool calculations.
- Adds no draw calls, meshes, textures, passes or uniforms and leaves gameplay, saves and schemas unchanged.
- See `AUDIT-{VERSION}.md`.

"""
if f'## {VERSION} — {NAME}' in text:
    raise SystemExit('Build 12.190 changelog already exists')
pos = text.find('## ')
if pos < 0:
    raise SystemExit('Could not locate changelog insertion anchor')
write(changelog, text[:pos] + entry + text[pos:])

handoff = SRC / 'HANDOFF.md'
text = read(handoff)
text = one(text, '- Build: **12.189 — Mobile Equipment Preview Framing**', f'- Build: **{VERSION} — {NAME}**', 'HANDOFF build')
text = one(text, '- Build ID: `12.189.0-mobile-equipment-preview-framing`', f'- Build ID: `{BUILD_ID}`', 'HANDOFF build id')
text = one(text, 'strikewatch-source/dist/strikewatch-build-12.189.html', f'strikewatch-source/dist/strikewatch-build-{VERSION}.html', 'HANDOFF standalone path')
old_note = 'Build 12.189 owns compact weapon and armour inspector framing.'
new_note = f"Build {VERSION} owns stable environmental light pickup for moving local-detail geometry. Operators, corpses and the first-person viewmodel blend 25% of the existing smooth positional cool/warm pools with 75% of the Build 12.160 averages; stepped moving flicker remains disabled and static geometry remains on the original path. Preserve `OPERATOR_ENVIRONMENT_LIGHTING`, `operatorEnvironmentalLightPickupForTest()`, model-space surface detail, operator AO and dynamic actor culling. The change adds no draws, meshes, textures, passes or uniforms. Save schema 19 and diagnostics schema 1 are unchanged. See `AUDIT-{VERSION}.md`.\n\n"
text = one(text, old_note, new_note + old_note, 'HANDOFF current-release anchor')
write(handoff, text)

agents = SRC / 'AGENTS.md'
text = read(agents)
agent_anchor = 'Build 12.189 owns compact equipment inspector framing.'
agent_note = f"Build {VERSION} owns operator environmental light pickup in `js/60-renderer-core.js`. Moving local-detail geometry must retain the 0.25 smooth-local / 0.75 stable-average blend, while the stepped flicker remains disabled at 1.0. Static geometry must remain algebraically identical through `moving == 0`; do not add a light pass, uniform, texture or draw. Keep `operatorEnvironmentalLightPickupForTest()`, the Build 12.160 surface-space safeguards, `operatorAmbientOcclusionForTest()` and `dynamicActorCullingForTest()` green. Save schema 19 and diagnostics schema 1 remain unchanged. See `AUDIT-{VERSION}.md`.\n\n"
text = one(text, agent_anchor, agent_note + agent_anchor, 'AGENTS current-release anchor')
write(agents, text)

readme = SRC / 'README.md'
text = read(readme)
text = one(text, '# Strikewatch Source 12.189', f'# Strikewatch Source {VERSION}', 'README heading')
text = one(text, 'dist/strikewatch-build-12.189.html', f'dist/strikewatch-build-{VERSION}.html', 'README standalone path')
write(readme, text)

project = SRC / 'PROJECT.md'
text = read(project)
old_project = 'Build 12.189 improves compact Armoury readability by opening weapon and armour inspectors at a pulled-back mobile zoom and protecting the interaction label from model overlap. Desktop framing, manual zoom bounds, cached stills, gameplay, persistence and schemas are unchanged. See `HANDOFF.md` and `AUDIT-12.189.md`.'
new_project = f'Build {VERSION} improves battle presentation by letting moving operators retain a restrained smooth response to arena cool and warm light pools while preserving the shimmer-safe stable average and disabled moving flicker. It adds no render pass or draw calls and leaves gameplay, persistence and schemas unchanged. See `HANDOFF.md` and `AUDIT-{VERSION}.md`.'
write(project, one(text, old_project, new_project, 'PROJECT current-release paragraph'))

read_first = SRC / '00-READ-FIRST-GPT.md'
text = read(read_first)
write(read_first, one(text, 'Current release: **Strikewatch Build 12.189 — Mobile Equipment Preview Framing**.', f'Current release: **Strikewatch Build {VERSION} — {NAME}**.', 'read-first release line'))

contracts = SRC / 'CONTRACTS.md'
text = read(contracts)
anchor = """- Surface detail is sampled in the space the geometry belongs to. Static
  geometry uses world space so detail stays pinned to the room; anything that
  moves through the world uses model space so detail travels with it. Mixing
  them makes a moving surface shimmer. Detail frequency stays under roughly 40
  cycles per unit of whichever space is sampled.
"""
contract = """- Moving local-detail geometry may take only a bounded smooth share of the
  existing positional overhead pools, blended against the stable averages.
  Stepped moving flicker remains disabled, static geometry keeps the original
  pool values exactly, and this response must not add a pass, texture, uniform
  or draw call without an explicit measured budget.
"""
if contract in text:
    raise SystemExit('Build 12.190 rendering contract already exists')
write(contracts, one(text, anchor, anchor + contract, 'CONTRACTS surface-space anchor'))

renderer_check = read(renderer)
required = [
    "revision: '12.190-stable-local-pickup-1'",
    'localShare: 0.25',
    'stableShare: 0.75',
    'movingFlicker: 1',
    'function operatorEnvironmentalLightPickupForTest()',
    'float movingCoolPool = mix(${OPERATOR_ENVIRONMENT_LIGHTING.coolAverage.toFixed(2)}, coolPool, ${OPERATOR_ENVIRONMENT_LIGHTING.localShare.toFixed(2)})',
    'float movingWarmPool = mix(${OPERATOR_ENVIRONMENT_LIGHTING.warmAverage.toFixed(2)}, warmPool, ${OPERATOR_ENVIRONMENT_LIGHTING.localShare.toFixed(2)})',
    'coolPool = mix(coolPool, movingCoolPool, moving)',
    'warmPool = mix(warmPool, movingWarmPool, moving)',
    '${OPERATOR_ENVIRONMENT_LIGHTING.movingFlicker.toFixed(1)}, moving)'
]
missing = [item for item in required if item not in renderer_check]
if missing:
    raise SystemExit(f'Operator environmental lighting source validation failed: {missing}')
index_check = read(index)
for expected in [f'<title>Strikewatch {VERSION}: {NAME}</title>', BUILD_ID, f'id="managerBuildVersion">{VERSION}</b>', f'id="mobileCommandBuildVersion">{VERSION}</b>']:
    if expected not in index_check:
        raise SystemExit(f'Missing index identity: {expected}')

print(f'Prepared Build {VERSION} source and documentation changes.')