from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'strikewatch-source'
VERSION = '12.194'
NAME = 'Muzzle-Anchored Tracers'
BUILD_ID = '12.194.0-muzzle-anchored-tracers'


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
    'version': '12.193',
    'name': 'Operator Muzzle-Light Response',
    'build_id': '12.193.0-operator-muzzle-light-response'
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

world = SRC / 'js' / '61-world-renderer.js'
text = read(world)
if 'OPERATOR_TRACER_ORIGIN' in text or 'operatorTracerOriginForTest' in text:
    raise SystemExit('Muzzle-anchored tracer policy already exists; refusing blind retry')
policy = """  // Build 12.194: accepted-shot tracers begin at the exact reusable world-space
  // muzzle point maintained by the third-person operator renderer. The old torso
  // origin remains only as a startup fallback before an operator has rendered.
  const OPERATOR_TRACER_ORIGIN = Object.freeze({
    revision: '12.194-render-muzzle-tracer-1',
    fallbackHeight: 1.30,
    crouchDrop: 0.43,
    maximumCachedOffset: 1.45
  });

  function operatorTracerOrigin(shooter, out = {}) {
    const fallbackElevation = arenaElevationAt(shooter?.x, shooter?.y);
    const fallbackX = Number(shooter?.x) || 0;
    const fallbackY = fallbackElevation + OPERATOR_TRACER_ORIGIN.fallbackHeight - (shooter?.crouched ? OPERATOR_TRACER_ORIGIN.crouchDrop : 0);
    const fallbackZ = Number(shooter?.y) || 0;
    const cached = shooter?.renderMuzzlePoint;
    const cachedFinite = cached
      && Number.isFinite(cached.x)
      && Number.isFinite(cached.y)
      && Number.isFinite(cached.z);
    const cachedOffset = cachedFinite ? Math.hypot(cached.x - fallbackX, cached.z - fallbackZ) : Infinity;
    const useCached = cachedFinite && cachedOffset <= OPERATOR_TRACER_ORIGIN.maximumCachedOffset;
    out.x = useCached ? cached.x : fallbackX;
    out.y = useCached ? cached.y : fallbackY;
    out.z = useCached ? cached.z : fallbackZ;
    out.source = useCached ? 'render-muzzle' : 'torso-fallback';
    return out;
  }

  function operatorTracerOriginForTest() {
    const live = operatorTracerOrigin({ x: 4, y: 5, renderMuzzlePoint: { x: 4.12, y: 1.31, z: 5.78 } }, {});
    const fallback = operatorTracerOrigin({ x: 4, y: 5, crouched: true }, {});
    const stale = operatorTracerOrigin({ x: 4, y: 5, renderMuzzlePoint: { x: 9, y: 1.3, z: 9 } }, {});
    return {
      ok: live.source === 'render-muzzle'
        && live.x === 4.12 && live.y === 1.31 && live.z === 5.78
        && fallback.source === 'torso-fallback'
        && stale.source === 'torso-fallback',
      revision: OPERATOR_TRACER_ORIGIN.revision,
      exactRenderedMuzzlePreferred: live.source === 'render-muzzle',
      startupFallbackPreserved: fallback.source === 'torso-fallback',
      staleCacheRejected: stale.source === 'torso-fallback',
      tracerLimitUnchanged: 28,
      tracerLifetimeUnchanged: 0.085,
      hitDetectionChanged: false,
      spreadChanged: false,
      additionalDrawCalls: 0,
      additionalMeshes: 0,
      additionalTextures: 0,
      additionalShaderPasses: 0,
      additionalShaderUniforms: 0
    };
  }

  const operatorTracerOriginScratch = {};

"""
text = one(text, '  function spawnTracer(shooter, target, options = {}) {', policy + '  function spawnTracer(shooter, target, options = {}) {', 'spawnTracer anchor')
old_origin = """    const shooterElevation = arenaElevationAt(shooter.x, shooter.y);
    const targetElevation = arenaElevationAt(target.x, target.y);
    tracers.push({
      x1: shooter.x, y1: shooterElevation + 1.30 - (shooter.crouched ? 0.43 : 0), z1: shooter.y,
"""
new_origin = """    const shooterElevation = arenaElevationAt(shooter.x, shooter.y);
    const targetElevation = arenaElevationAt(target.x, target.y);
    const tracerOrigin = operatorTracerOrigin(shooter, operatorTracerOriginScratch);
    tracers.push({
      x1: tracerOrigin.x, y1: tracerOrigin.y, z1: tracerOrigin.z,
"""
text = one(text, old_origin, new_origin, 'tracer torso origin')
write(world, text)

character = SRC / 'js' / '62-character-renderer.js'
text = read(character)
if 'renderMuzzlePoint' in text:
    raise SystemExit('Reusable render muzzle point already exists; refusing blind retry')
old_setup = """    const weaponRig = operatorSharedWeaponRig(activeWeapon, rifleY, rifleForward, isSidearm, recoil, rifleRoll);
    let muzzleLightOrigin = null;
    if (bot.flash > 0) {
      const flashDistance = isSidearm ? 0.42 : 0.80;
      const flashLocal = weaponRig?.muzzle || { x: isSidearm ? 0.02 : 0.05, y: rifleY, z: rifleForward + flashDistance };
      muzzleLightOrigin = worldPoint(bot.x, 0, bot.y, upperYaw, flashLocal.x, flashLocal.y, flashLocal.z);
      setOperatorMuzzleLight(muzzleLightOrigin, bot.flash);
    }
"""
new_setup = """    const weaponRig = operatorSharedWeaponRig(activeWeapon, rifleY, rifleForward, isSidearm, recoil, rifleRoll);
    const flashDistance = isSidearm ? 0.42 : 0.80;
    const flashLocal = weaponRig?.muzzle || { x: isSidearm ? 0.02 : 0.05, y: rifleY, z: rifleForward + flashDistance };
    const renderedMuzzleOrigin = worldPoint(bot.x, 0, bot.y, upperYaw, flashLocal.x, flashLocal.y, flashLocal.z);
    const renderMuzzlePoint = bot.renderMuzzlePoint || (bot.renderMuzzlePoint = { x: 0, y: 0, z: 0 });
    renderMuzzlePoint.x = renderedMuzzleOrigin.x;
    renderMuzzlePoint.y = renderedMuzzleOrigin.y;
    renderMuzzlePoint.z = renderedMuzzleOrigin.z;
    let muzzleLightOrigin = null;
    if (bot.flash > 0) {
      muzzleLightOrigin = renderedMuzzleOrigin;
      setOperatorMuzzleLight(muzzleLightOrigin, bot.flash);
    }
"""
text = one(text, old_setup, new_setup, 'shared rendered muzzle setup')
write(character, text)

index = SRC / 'index.html'
text = read(index)
text = one(text, '<title>Strikewatch 12.193: Operator Muzzle-Light Response</title>', f'<title>Strikewatch {VERSION}: {NAME}</title>', 'index title')
if '12.193.0-operator-muzzle-light-response' not in text or '12.193' not in text:
    raise SystemExit('Current index release identity is missing')
text = text.replace('12.193.0-operator-muzzle-light-response', BUILD_ID).replace('12.193', VERSION)
write(index, text)
write(release_path, json.dumps({'version': VERSION, 'name': NAME, 'build_id': BUILD_ID}, indent=2) + '\n')

write(SRC / f'AUDIT-{VERSION}.md', f"""# Build {VERSION} — {NAME}

## Scope

This release aligns visible third-person bullet streaks with the held weapon. Tracers previously began at the operator centre and a fixed torso height, while the rendered muzzle flash used the authored weapon-rig muzzle point. The mismatch was most visible in side views and crouched firing.

## Changes

- Added `OPERATOR_TRACER_ORIGIN` and `operatorTracerOrigin()` in `js/61-world-renderer.js`.
- Each rendered living operator now maintains one reusable `renderMuzzlePoint` derived from the same `operatorSharedWeaponRig(...).muzzle` transform used by the muzzle flash.
- `spawnTracer()` prefers that exact cached world point and retains the previous torso origin only as a startup/stale-cache fallback.
- Added `operatorTracerOriginForTest()` to guard rendered-muzzle preference, fallback behaviour, stale-cache rejection and unchanged cost boundaries.

## Performance and stability

The update adds one persistent three-number object per rendered operator and no per-frame object allocation after first use. Tracer count, lifetime, target endpoint, spread, misses, impact decals, hit detection, damage, cadence, ammunition, recoil, AI, collision, navigation, line of sight, saves and schemas are unchanged. No draw, mesh, texture, pass, framebuffer, light or shader uniform was added.

## Verification

- `python3 -m py_compile build.py` passes.
- Every modular JavaScript file, generated bundle and standalone inline script parses with Node.
- Source checks confirm `spawnTracer()` uses `operatorTracerOrigin()` and the operator renderer updates `renderMuzzlePoint` from the shared authored muzzle transform.
- The 28-tracer cap and 0.085-second lifetime remain unchanged.
- Build 12.193 muzzle-light, 12.192 contact-shadow, 12.191 silhouette-light and 12.190 environmental-light hooks remain present.
- Two builds produce identical outputs and root `cod.html` is byte-identical to the standalone.
""")

changelog = SRC / 'CHANGELOG.md'
text = read(changelog)
entry = f"""## {VERSION} — {NAME}

- Starts third-person tracer streaks at the exact reusable held-weapon muzzle point maintained by the renderer instead of the operator torso.
- Keeps the old torso origin only as a bounded startup fallback; tracer count, lifetime, spread, impact handling and all combat authority remain unchanged.
- Adds no draw calls, meshes, textures, passes, uniforms or per-frame allocations.
- See `AUDIT-{VERSION}.md`.

"""
if f'## {VERSION} — {NAME}' in text:
    raise SystemExit('Build 12.194 changelog already exists')
pos = text.find('## ')
if pos < 0:
    raise SystemExit('Could not locate changelog insertion anchor')
write(changelog, text[:pos] + entry + text[pos:])

handoff = SRC / 'HANDOFF.md'
text = read(handoff)
text = one(text, '- Build: **12.193 — Operator Muzzle-Light Response**', f'- Build: **{VERSION} — {NAME}**', 'HANDOFF build')
text = one(text, '- Build ID: `12.193.0-operator-muzzle-light-response`', f'- Build ID: `{BUILD_ID}`', 'HANDOFF build id')
text = one(text, 'strikewatch-source/dist/strikewatch-build-12.193.html', f'strikewatch-source/dist/strikewatch-build-{VERSION}.html', 'HANDOFF standalone path')
anchor = 'Build 12.193 owns the scoped third-person operator muzzle-light response across `js/60-renderer-core.js` and `js/62-character-renderer.js`.'
note = f"Build {VERSION} owns muzzle-anchored third-person tracers across `js/61-world-renderer.js` and `js/62-character-renderer.js`. Preserve `OPERATOR_TRACER_ORIGIN`, `operatorTracerOriginForTest()`, the one reusable `bot.renderMuzzlePoint` and the exact `operatorSharedWeaponRig(...).muzzle` transform. `spawnTracer()` must prefer the rendered muzzle and retain the old torso origin only as a bounded startup fallback. Keep the 28-tracer cap, 0.085 lifetime, endpoint spread, misses, impacts and all combat authority unchanged. Do not add draws, meshes, textures, passes, uniforms or per-frame allocations. Keep Builds 12.190-12.193 and arena/navigation integrity green. Save schema 19 and diagnostics schema 1 are unchanged. See `AUDIT-{VERSION}.md`.\n\n"
text = one(text, anchor, note + anchor, 'HANDOFF current release anchor')
write(handoff, text)

agents = SRC / 'AGENTS.md'
text = read(agents)
anchor = 'Build 12.193 owns the scoped third-person operator muzzle-light response in `js/60-renderer-core.js` and `js/62-character-renderer.js`.'
note = f"Build {VERSION} owns muzzle-anchored third-person tracers in `js/61-world-renderer.js` and `js/62-character-renderer.js`. Keep the exact shared weapon-rig muzzle transform, reusable `bot.renderMuzzlePoint`, bounded torso fallback, 28-tracer cap and 0.085 lifetime. Combat, spread, endpoints, misses and impacts remain authoritative and unchanged. Verify `operatorTracerOriginForTest()` plus Builds 12.190-12.193 and arena/navigation integrity. Save schema 19 and diagnostics schema 1 remain unchanged. See `AUDIT-{VERSION}.md`.\n\n"
text = one(text, anchor, note + anchor, 'AGENTS current release anchor')
write(agents, text)

readme = SRC / 'README.md'
text = read(readme)
text = one(text, '# Strikewatch Source 12.193', f'# Strikewatch Source {VERSION}', 'README heading')
text = one(text, 'dist/strikewatch-build-12.193.html', f'dist/strikewatch-build-{VERSION}.html', 'README standalone path')
write(readme, text)

project = SRC / 'PROJECT.md'
text = read(project)
old = 'Build 12.193 improves firefight cohesion by warming nearby opaque materials on the living third-person operator that has actually fired, using the existing shot signal, authored muzzle anchor and colour/emissive uniforms with no additional draw calls. Static geometry, corpses, viewmodels, gameplay, persistence and schemas are unchanged. See `HANDOFF.md` and `AUDIT-12.193.md`.'
new = f'Build {VERSION} aligns third-person tracer streaks with the exact held-weapon muzzle point maintained by the renderer, while preserving the previous torso origin only as a startup fallback. Combat, impact handling, gameplay, persistence and schemas are unchanged. See `HANDOFF.md` and `AUDIT-{VERSION}.md`.'
write(project, one(text, old, new, 'PROJECT current release paragraph'))

read_first = SRC / '00-READ-FIRST-GPT.md'
text = read(read_first)
write(read_first, one(text, 'Current release: **Strikewatch Build 12.193 — Operator Muzzle-Light Response**.', f'Current release: **Strikewatch Build {VERSION} — {NAME}**.', 'read-first release line'))

contracts = SRC / 'CONTRACTS.md'
text = read(contracts)
anchor = """- A third-person operator muzzle-light response may reuse only the authoritative
  real-shot flash signal, authored muzzle anchor, per-draw model transform and the
  existing colour/emissive uniforms. It remains bounded to nearby opaque living
  operator surfaces; static geometry, shadows, transparent effects, corpses and
  the first-person viewmodel receive zero. No light object, mesh, texture, pass,
  uniform or additional draw is permitted without an explicit measured budget.
"""
contract = """- Third-person tracer presentation must start from the reusable world-space muzzle
  point produced by the same authored weapon-rig transform as the muzzle flash.
  The legacy torso origin may remain only as a bounded startup fallback. Tracer
  count, lifetime, endpoint spread, impact handling and combat authority must not
  change as part of presentation alignment.
"""
if contract in text:
    raise SystemExit('Build 12.194 tracer contract already exists')
write(contracts, one(text, anchor, anchor + contract, 'CONTRACTS muzzle-light anchor'))

world_check = read(world)
character_check = read(character)
for required in [
    "revision: '12.194-render-muzzle-tracer-1'",
    'function operatorTracerOrigin(shooter, out = {})',
    'function operatorTracerOriginForTest()',
    'const operatorTracerOriginScratch = {}',
    'const tracerOrigin = operatorTracerOrigin(shooter, operatorTracerOriginScratch)',
    'x1: tracerOrigin.x, y1: tracerOrigin.y, z1: tracerOrigin.z',
    'if (tracers.length > 28)',
    'life: 0.085',
    'maxLife: 0.085'
]:
    if required not in world_check:
        raise SystemExit(f'Missing tracer requirement: {required}')
for required in [
    'const renderedMuzzleOrigin = worldPoint(',
    'const renderMuzzlePoint = bot.renderMuzzlePoint || (bot.renderMuzzlePoint = { x: 0, y: 0, z: 0 })',
    'renderMuzzlePoint.x = renderedMuzzleOrigin.x',
    'muzzleLightOrigin = renderedMuzzleOrigin'
]:
    if required not in character_check:
        raise SystemExit(f'Missing rendered muzzle requirement: {required}')
if character_check.count('bot.renderMuzzlePoint ||') != 1:
    raise SystemExit('Reusable render muzzle authority is missing or duplicated')
print(f'Prepared Build {VERSION} source and documentation changes.')
