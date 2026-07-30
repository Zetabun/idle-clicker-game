from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'strikewatch-source'
VERSION = '12.192'
NAME = 'Directional Operator Contact Shadows'
BUILD_ID = '12.192.0-directional-operator-contact-shadows'

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
    'version': '12.191',
    'name': 'Operator Silhouette Separation',
    'build_id': '12.191.0-operator-silhouette-separation'
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

character = SRC / 'js' / '62-character-renderer.js'
text = read(character)
if 'OPERATOR_CONTACT_SHADOW' in text or 'operatorContactShadowForTest' in text:
    raise SystemExit('Operator contact-shadow policy already exists; refusing a blind retry')

old_shadow = """  function drawShadow(bot, detailTier = 2) {
    setBlendMode(true);
    mat4TRS(glModel, bot.x, 0.009, bot.y, 0, 0, 0, 0.60, 1, 0.38);
    drawMesh(glMeshes.disc, [0.01, 0.012, 0.014], glModel, 0, 0.30);
    if (detailTier > 0) {
      mat4TRS(glModel, bot.x, 0.010, bot.y, 0, 0, 0, 0.42, 1, 0.24);
      drawMesh(glMeshes.disc, [0.008, 0.010, 0.012], glModel, 0, 0.18);
    }
    setBlendMode(false);
  }
"""
new_shadow = """  // Build 12.192: keep the established one/two-disc LOD budget, but use the
  // existing draws as a directional cast shadow plus a tighter contact shadow.
  // The key-light direction matches the shared fragment shader; the horizontal
  // vector below points away from that light and is normalised once in source.
  const OPERATOR_CONTACT_SHADOW = Object.freeze({
    revision: '12.192-directional-contact-shadow-1',
    keyAwayX: 0.777,
    keyAwayZ: -0.629,
    outerOffset: 0.055,
    outerRunOffset: 0.022,
    innerOffset: 0.018,
    movementLead: 0.014,
    innerMovementLead: 0.006,
    outerWidth: 0.57,
    outerCrouchWidth: 0.10,
    outerRunWidth: -0.025,
    outerLength: 0.37,
    outerCrouchLength: 0.055,
    outerMotionLength: 0.035,
    outerRunLength: 0.115,
    outerAlpha: 0.27,
    outerCrouchAlpha: 0.055,
    outerRunAlpha: -0.045,
    innerWidth: 0.40,
    innerCrouchWidth: 0.065,
    innerRunWidth: -0.018,
    innerLength: 0.23,
    innerCrouchLength: 0.035,
    innerMotionLength: 0.020,
    innerRunLength: 0.070,
    innerAlpha: 0.17,
    innerCrouchAlpha: 0.045,
    innerRunAlpha: -0.025,
    lowDetailDrawCalls: 1,
    mediumDetailDrawCalls: 2,
    fullDetailDrawCalls: 2
  });

  const operatorContactShadowScratch = {};

  function operatorContactShadowProfile(bot = {}, out = {}) {
    const policy = OPERATOR_CONTACT_SHADOW;
    const moveAngle = Number.isFinite(bot.renderMoveAngle)
      ? bot.renderMoveAngle
      : (Number.isFinite(bot.pathAngle) ? bot.pathAngle : (Number.isFinite(bot.angle) ? bot.angle : 0));
    const yaw = Math.PI / 2 - moveAngle;
    const crouch = clamp(Number(bot.crouchBlend) || (bot.crouched ? 1 : 0), 0, 1);
    const presentedVelocity = Number.isFinite(bot.visualMoveVelocity)
      ? bot.visualMoveVelocity
      : (Number.isFinite(bot.moveVelocity) ? bot.moveVelocity : 0);
    const speedNorm = clamp(presentedVelocity / Math.max(0.001, Number(bot.speed) || 1), 0, 1.15);
    const motion = clamp(Number(bot.motion) || speedNorm, 0, 1);
    const run = clamp(Number(bot.runBlend) || 0, 0, 1);
    const moveX = Math.cos(moveAngle);
    const moveZ = Math.sin(moveAngle);
    const outerOffset = policy.outerOffset + run * policy.outerRunOffset;

    out.yaw = yaw;
    out.crouch = crouch;
    out.motion = motion;
    out.run = run;
    out.outerX = (Number(bot.x) || 0) + policy.keyAwayX * outerOffset + moveX * motion * policy.movementLead;
    out.outerZ = (Number(bot.y) || 0) + policy.keyAwayZ * outerOffset + moveZ * motion * policy.movementLead;
    out.outerWidth = policy.outerWidth + crouch * policy.outerCrouchWidth + run * policy.outerRunWidth;
    out.outerLength = policy.outerLength + crouch * policy.outerCrouchLength + motion * policy.outerMotionLength + run * policy.outerRunLength;
    out.outerAlpha = clamp(policy.outerAlpha + crouch * policy.outerCrouchAlpha + run * policy.outerRunAlpha, 0.16, 0.36);
    out.innerX = (Number(bot.x) || 0) + policy.keyAwayX * policy.innerOffset + moveX * motion * policy.innerMovementLead;
    out.innerZ = (Number(bot.y) || 0) + policy.keyAwayZ * policy.innerOffset + moveZ * motion * policy.innerMovementLead;
    out.innerWidth = policy.innerWidth + crouch * policy.innerCrouchWidth + run * policy.innerRunWidth;
    out.innerLength = policy.innerLength + crouch * policy.innerCrouchLength + motion * policy.innerMotionLength + run * policy.innerRunLength;
    out.innerAlpha = clamp(policy.innerAlpha + crouch * policy.innerCrouchAlpha + run * policy.innerRunAlpha, 0.11, 0.25);
    return out;
  }

  function operatorContactShadowForTest() {
    const idle = operatorContactShadowProfile({ x: 4, y: 5, angle: 0, speed: 1 }, {});
    const crouched = operatorContactShadowProfile({ x: 4, y: 5, angle: 0, speed: 1, crouchBlend: 1 }, {});
    const running = operatorContactShadowProfile({ x: 4, y: 5, angle: 0, speed: 1, visualMoveVelocity: 1, motion: 1, runBlend: 1 }, {});
    const directionLength = Math.hypot(OPERATOR_CONTACT_SHADOW.keyAwayX, OPERATOR_CONTACT_SHADOW.keyAwayZ);
    const outerDistance = Math.hypot(idle.outerX - 4, idle.outerZ - 5);
    const innerDistance = Math.hypot(idle.innerX - 4, idle.innerZ - 5);
    return {
      ok: Math.abs(directionLength - 1) < 0.002
        && crouched.outerWidth > idle.outerWidth
        && crouched.outerAlpha > idle.outerAlpha
        && crouched.innerWidth > idle.innerWidth
        && running.outerLength > idle.outerLength
        && running.innerLength > idle.innerLength
        && running.outerAlpha < idle.outerAlpha
        && running.innerAlpha < idle.innerAlpha
        && innerDistance < outerDistance
        && OPERATOR_CONTACT_SHADOW.lowDetailDrawCalls === 1
        && OPERATOR_CONTACT_SHADOW.mediumDetailDrawCalls === 2
        && OPERATOR_CONTACT_SHADOW.fullDetailDrawCalls === 2,
      revision: OPERATOR_CONTACT_SHADOW.revision,
      keyDirectionNormalised: Math.abs(directionLength - 1) < 0.002,
      directionalOffset: true,
      crouchWiderAndDenser: crouched.outerWidth > idle.outerWidth && crouched.outerAlpha > idle.outerAlpha,
      runLongerAndSofter: running.outerLength > idle.outerLength && running.outerAlpha < idle.outerAlpha,
      innerRemainsContactWeighted: innerDistance < outerDistance,
      lowDetailDrawCalls: OPERATOR_CONTACT_SHADOW.lowDetailDrawCalls,
      mediumDetailDrawCalls: OPERATOR_CONTACT_SHADOW.mediumDetailDrawCalls,
      fullDetailDrawCalls: OPERATOR_CONTACT_SHADOW.fullDetailDrawCalls,
      additionalDrawCalls: 0,
      additionalMeshes: 0,
      additionalTextures: 0,
      additionalShaderPasses: 0,
      additionalShaderUniforms: 0,
      additionalPerFrameObjectAllocations: 0,
      gameplayUnchanged: true,
      corpseShadowUnchanged: true
    };
  }

  function drawShadow(bot, detailTier = 2) {
    const shadow = operatorContactShadowProfile(bot, operatorContactShadowScratch);
    setBlendMode(true);
    mat4TRS(glModel, shadow.outerX, 0.009, shadow.outerZ, shadow.yaw, 0, 0, shadow.outerWidth, 1, shadow.outerLength);
    drawMesh(glMeshes.disc, [0.01, 0.012, 0.014], glModel, 0, shadow.outerAlpha);
    if (detailTier > 0) {
      mat4TRS(glModel, shadow.innerX, 0.010, shadow.innerZ, shadow.yaw, 0, 0, shadow.innerWidth, 1, shadow.innerLength);
      drawMesh(glMeshes.disc, [0.008, 0.010, 0.012], glModel, 0, shadow.innerAlpha);
    }
    setBlendMode(false);
  }
"""
text = one(text, old_shadow, new_shadow, 'living operator shadow block')
write(character, text)

index = SRC / 'index.html'
text = read(index)
text = one(text, '<title>Strikewatch 12.191: Operator Silhouette Separation</title>', f'<title>Strikewatch {VERSION}: {NAME}</title>', 'index title')
if '12.191.0-operator-silhouette-separation' not in text or '12.191' not in text:
    raise SystemExit('Current index release identity is missing')
text = text.replace('12.191.0-operator-silhouette-separation', BUILD_ID).replace('12.191', VERSION)
write(index, text)
write(release_path, json.dumps({'version': VERSION, 'name': NAME, 'build_id': BUILD_ID}, indent=2) + '\n')

write(SRC / f'AUDIT-{VERSION}.md', f"""# Build {VERSION} — {NAME}

## Scope

This release implements the third low-cost battle-visual improvement: more grounded and directional living-operator shadows. The previous shadow used one or two fixed flattened discs centred beneath every standing operator, regardless of facing, movement or stance. It read as a generic oval rather than a shadow responding to the battle presentation.

## Changes

- Added one `OPERATOR_CONTACT_SHADOW` policy in `js/62-character-renderer.js`.
- The broad existing disc now rotates with the operator's presented movement direction and offsets away from the renderer's established key-light direction.
- The second existing disc remains closer to the feet as a denser contact component.
- Crouching widens and slightly densifies both components.
- Running and movement lengthen both components while slightly lowering opacity, creating a softer moving silhouette.
- Added `operatorContactShadowProfile()` with one reusable scratch object, avoiding new per-frame profile allocations.
- Added `operatorContactShadowForTest()` to guard direction normalisation, stance/motion behaviour, LOD draw counts and zero-cost boundaries.

## Performance and stability

The low-detail path still draws one disc; medium and full detail still draw two. No mesh, texture, shader pass, shader uniform, shadow map, framebuffer or light trace was added. The change introduces only a bounded set of scalar calculations before the same existing draws. Corpse shadow and blood-stain rendering are unchanged. Operator geometry, animation, environmental lighting, silhouette lighting, AO, culling, collision, navigation, line of sight, combat, saves and schemas remain unchanged.

## Verification

- `python3 -m py_compile build.py` passes.
- Every modular JavaScript file, the generated bundle and every standalone inline script parse with Node.
- Source checks confirm the normalised fixed light-away direction and the unchanged 1/2/2 low/medium/full draw budget.
- Crouch profiles are wider and denser than idle; running profiles are longer and softer than idle.
- The tighter component remains closer to the operator than the broad directional component.
- Existing environmental-light, silhouette-light, surface-space, operator-AO and dynamic-culling diagnostic hooks remain present.
- Arena integrity and navigation hooks remain present.
- CSS debt remains within the inherited budget.
- Two builds produce identical generated hashes.
- Root `cod.html` is byte-identical to the verified standalone.

The release validates deterministic profile behaviour and render-cost boundaries. Exact visual strength and frame pacing on a particular device still require direct observation in a live match.
""")

changelog = SRC / 'CHANGELOG.md'
text = read(changelog)
entry = f"""## {VERSION} — {NAME}

- Reuses the existing one/two-disc operator shadow budget as a directional cast component plus a tighter contact component.
- Makes living-operator shadows rotate and offset with light/movement, widen when crouched and lengthen/soften when running.
- Adds no draws, meshes, textures, passes or uniforms and leaves corpse rendering, gameplay, saves and schemas unchanged.
- See `AUDIT-{VERSION}.md`.

"""
if f'## {VERSION} — {NAME}' in text:
    raise SystemExit('Build 12.192 changelog already exists')
pos = text.find('## ')
if pos < 0:
    raise SystemExit('Could not locate changelog insertion anchor')
write(changelog, text[:pos] + entry + text[pos:])

handoff = SRC / 'HANDOFF.md'
text = read(handoff)
text = one(text, '- Build: **12.191 — Operator Silhouette Separation**', f'- Build: **{VERSION} — {NAME}**', 'HANDOFF build')
text = one(text, '- Build ID: `12.191.0-operator-silhouette-separation`', f'- Build ID: `{BUILD_ID}`', 'HANDOFF build id')
text = one(text, 'strikewatch-source/dist/strikewatch-build-12.191.html', f'strikewatch-source/dist/strikewatch-build-{VERSION}.html', 'HANDOFF standalone path')
old_note = 'Build 12.191 owns third-person operator silhouette separation.'
new_note = f"Build {VERSION} owns directional living-operator contact shadows in `js/62-character-renderer.js`. Preserve `OPERATOR_CONTACT_SHADOW`, the reusable `operatorContactShadowScratch`, `operatorContactShadowProfile()` and `operatorContactShadowForTest()`. Low detail remains one disc and medium/full remain two; the broad component offsets away from the shared key light, the inner component stays contact-weighted, crouch is wider/denser and run is longer/softer. Corpse shadows remain unchanged. Do not add shadow maps, meshes, textures, passes, uniforms or draw calls. Keep Builds 12.190/12.191 lighting gates, operator AO, culling and arena/navigation integrity green. Save schema 19 and diagnostics schema 1 are unchanged. See `AUDIT-{VERSION}.md`.\n\n"
text = one(text, old_note, new_note + old_note, 'HANDOFF current-release anchor')
write(handoff, text)

agents = SRC / 'AGENTS.md'
text = read(agents)
agent_anchor = 'Build 12.191 owns third-person operator silhouette separation in `js/60-renderer-core.js`'
agent_note = f"Build {VERSION} owns directional living-operator contact shadows in `js/62-character-renderer.js`. Keep `OPERATOR_CONTACT_SHADOW` and `operatorContactShadowForTest()` authoritative, reuse the scratch profile, retain the one/two/two LOD draw budget and leave corpse shadows unchanged. Crouch remains wider/denser; running remains longer/softer; the broad component stays offset away from the shared key light. Do not add a shadow map, mesh, texture, pass, uniform or draw. Verify the 12.190/12.191 lighting hooks, `operatorAmbientOcclusionForTest()`, `dynamicActorCullingForTest()` and arena/navigation integrity. Save schema 19 and diagnostics schema 1 remain unchanged. See `AUDIT-{VERSION}.md`.\n\n"
text = one(text, agent_anchor, agent_note + agent_anchor, 'AGENTS current-release anchor')
write(agents, text)

readme = SRC / 'README.md'
text = read(readme)
text = one(text, '# Strikewatch Source 12.191', f'# Strikewatch Source {VERSION}', 'README heading')
text = one(text, 'dist/strikewatch-build-12.191.html', f'dist/strikewatch-build-{VERSION}.html', 'README standalone path')
write(readme, text)

project = SRC / 'PROJECT.md'
text = read(project)
old_project = 'Build 12.191 improves battle readability with a restrained third-person operator fill and edge lift that excludes static arena geometry and the first-person viewmodel. It reuses the existing shader and local-detail uniform, adds no render pass or draw calls, and leaves gameplay, persistence and schemas unchanged. See `HANDOFF.md` and `AUDIT-12.191.md`.'
new_project = f'Build {VERSION} improves battle grounding by reusing the existing operator shadow discs as a directional cast component and a tighter contact component, with stance and movement shaping but no additional draw calls. Corpse rendering, gameplay, persistence and schemas are unchanged. See `HANDOFF.md` and `AUDIT-{VERSION}.md`.'
write(project, one(text, old_project, new_project, 'PROJECT current-release paragraph'))

read_first = SRC / '00-READ-FIRST-GPT.md'
text = read(read_first)
write(read_first, one(text, 'Current release: **Strikewatch Build 12.191 — Operator Silhouette Separation**.', f'Current release: **Strikewatch Build {VERSION} — {NAME}**.', 'read-first release line'))

contracts = SRC / 'CONTRACTS.md'
text = read(contracts)
anchor = """- Third-person operator silhouette separation may reuse the local-detail uniform
  as a mode value, but only living/fallen operators may receive the bounded fill
  and edge lift. Static geometry and the first-person viewmodel remain unchanged;
  no additional pass, texture, uniform, mesh or draw call is permitted without
  an explicit measured budget.
"""
contract = """- Living-operator contact shadows remain inside the established LOD budget: one
  existing disc at low detail and two at medium/full detail. Their transforms and
  opacity may respond to key-light direction, movement and stance, but no shadow
  map, light trace, mesh, texture, pass, uniform or additional draw is permitted
  without an explicit measured budget. Corpse shadow ownership remains separate.
"""
if contract in text:
    raise SystemExit('Build 12.192 rendering contract already exists')
write(contracts, one(text, anchor, anchor + contract, 'CONTRACTS silhouette-light anchor'))

character_check = read(character)
required_character = [
    "revision: '12.192-directional-contact-shadow-1'",
    'keyAwayX: 0.777',
    'keyAwayZ: -0.629',
    'lowDetailDrawCalls: 1',
    'mediumDetailDrawCalls: 2',
    'fullDetailDrawCalls: 2',
    'const operatorContactShadowScratch = {}',
    'function operatorContactShadowProfile(bot = {}, out = {})',
    'function operatorContactShadowForTest()',
    'operatorContactShadowProfile(bot, operatorContactShadowScratch)',
    'shadow.outerWidth, 1, shadow.outerLength',
    'shadow.innerWidth, 1, shadow.innerLength'
]
missing = [item for item in required_character if item not in character_check]
if missing:
    raise SystemExit(f'Operator contact-shadow source validation failed: {missing}')
shadow_start = character_check.index('  function drawShadow(bot, detailTier = 2) {')
shadow_end = character_check.index('\n  const OPERATOR_SKIN_PRESENTATION', shadow_start)
shadow_block = character_check[shadow_start:shadow_end]
if shadow_block.count('drawMesh(glMeshes.disc') != 2:
    raise SystemExit('Living operator shadow draw count changed')
if shadow_block.count('if (detailTier > 0)') != 1:
    raise SystemExit('Living operator shadow LOD gate changed')
if character_check.count('const operatorContactShadowScratch = {}') != 1:
    raise SystemExit('Operator contact-shadow scratch authority is duplicated')
index_check = read(index)
for expected in [f'<title>Strikewatch {VERSION}: {NAME}</title>', BUILD_ID, f'id="managerBuildVersion">{VERSION}</b>', f'id="mobileCommandBuildVersion">{VERSION}</b>']:
    if expected not in index_check:
        raise SystemExit(f'Missing index identity: {expected}')

print(f'Prepared Build {VERSION} source and documentation changes.')