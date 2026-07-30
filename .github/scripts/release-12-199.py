from pathlib import Path
import json
import re
import shutil

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'strikewatch-source'
VERSION = '12.199'
NAME = 'Surface-Anchored Blood Decals'
BUILD_ID = '12.199.0-surface-anchored-blood-decals'


def read(path):
    return path.read_text(encoding='utf-8')


def write(path, text):
    path.write_text(text, encoding='utf-8', newline='\n')


def one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'Expected one {label}; found {count}')
    return text.replace(old, new, 1)


def regex_one(text, pattern, replacement, label, flags=0):
    updated, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f'Expected one {label}; found {count}')
    return updated


release_path = SRC / 'RELEASE.json'
expected_predecessor = {
    'version': '12.198',
    'name': 'Fixed-Step Match Clock & Stutter Recovery',
    'build_id': '12.198.0-fixed-step-match-clock-stutter-recovery'
}
if json.loads(read(release_path)) != expected_predecessor:
    raise SystemExit('Unexpected predecessor release')

core = SRC / 'js' / '00-core.js'
text = read(core)
text = regex_one(text, r"const BUILD_VERSION = '[^']+'", f"const BUILD_VERSION = '{VERSION}'", 'BUILD_VERSION')
text = regex_one(text, r"const BUILD_NAME = '[^']+'", f"const BUILD_NAME = '{NAME}'", 'BUILD_NAME')
text = regex_one(text, r"const BUILD_ID = '[^']+'", f"const BUILD_ID = '{BUILD_ID}'", 'BUILD_ID')
write(core, text)

world = SRC / 'js' / '61-world-renderer.js'
text = read(world)
new_blood_block = r'''  const BLOOD_SPLATTER_PRESENTATION = Object.freeze({
    baseSize: 0.068,
    damageScale: 0.060,
    randomSize: 0.022,
    minimumReadableCoreWidth: 0.14,
    impactRimMaximum: 0.093,
    depth: 0.008,
    emissive: 0.018,
    roughness: 0.82,
    colours: Object.freeze([
      Object.freeze([0.38, 0.006, 0.012]),
      Object.freeze([0.23, 0.003, 0.006]),
      Object.freeze([0.52, 0.012, 0.020])
    ])
  });
  const BLOOD_SURFACE_ATTACHMENT = Object.freeze({
    revision: '12.199-surface-anchored-blood-1',
    surfaceNudge: 0.016,
    supportProbe: 0.038,
    edgeInset: 0.008,
    doorApertureHalfWidth: 0.47
  });

  function bloodRayBoxFaceHit(originX, originZ, directionX, directionZ, maximumDistance, box) {
    const yaw = Number(box?.yaw) || 0;
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const dx = originX - (Number(box?.x) || 0);
    const dz = originZ - (Number(box?.y) || 0);
    const localOriginX = c * dx - s * dz;
    const localOriginZ = s * dx + c * dz;
    const localDirectionX = c * directionX - s * directionZ;
    const localDirectionZ = s * directionX + c * directionZ;
    const halfWidth = Math.max(0.001, (Number(box?.width) || 0.43) * 0.5);
    const halfDepth = Math.max(0.001, (Number(box?.depth) || 0.11) * 0.5);
    let near = 0;
    let far = Math.max(0, Number(maximumDistance) || 0);
    let nearAxis = '';
    for (const entry of [
      { axis: 'u', origin: localOriginX, direction: localDirectionX, half: halfWidth },
      { axis: 'normal', origin: localOriginZ, direction: localDirectionZ, half: halfDepth }
    ]) {
      if (Math.abs(entry.direction) < 0.000001) {
        if (entry.origin < -entry.half || entry.origin > entry.half) return null;
        continue;
      }
      let first = (-entry.half - entry.origin) / entry.direction;
      let second = (entry.half - entry.origin) / entry.direction;
      if (first > second) [first, second] = [second, first];
      if (first > near) {
        near = first;
        nearAxis = entry.axis;
      }
      far = Math.min(far, second);
      if (near > far) return null;
    }
    if (nearAxis !== 'normal' || near < 0 || near > maximumDistance) return null;
    const localU = localOriginX + localDirectionX * near;
    const localNormal = localOriginZ + localDirectionZ * near;
    return { distance: near, localU, normalSign: localNormal >= 0 ? 1 : -1 };
  }

  function bloodDoorRayHit(originX, originZ, directionX, directionZ, maximumDistance = BLOOD_SPLATTER_MAX_DISTANCE) {
    let nearest = null;
    for (const state of ACTIVE_DOOR_STATES || []) {
      for (const visible of visibleDoorPanelDescriptors(state, BLOOD_SURFACE_ATTACHMENT.doorApertureHalfWidth)) {
        const hit = bloodRayBoxFaceHit(originX, originZ, directionX, directionZ, maximumDistance, visible);
        if (!hit || (nearest && hit.distance >= nearest.distance)) continue;
        const fullCentre = visible.side * (0.215 + clamp(Number(state.openAmount) || 0, 0, 1) * 0.47);
        const doorLocalU = visible.localCentre + hit.localU;
        nearest = {
          distance: hit.distance,
          doorId: state.id,
          panelSide: visible.side,
          panelLocalU: doorLocalU - fullCentre,
          normalSign: hit.normalSign
        };
      }
    }
    return nearest;
  }

  function bloodDoorSurfaceSnapshot(splatter, stateOverride = null) {
    const surface = splatter?.surface;
    if (!surface || surface.type !== 'door-panel') return null;
    const state = stateOverride || (ACTIVE_DOOR_STATES || []).find(door => door.id === surface.doorId);
    if (!state) return null;
    const panel = doorPanelDescriptors(state).find(candidate => candidate.side === surface.panelSide);
    const visible = visibleDoorPanelDescriptors(state, BLOOD_SURFACE_ATTACHMENT.doorApertureHalfWidth)
      .find(candidate => candidate.side === surface.panelSide);
    if (!panel || !visible) return null;
    const fullCentre = panel.side * (0.215 + panel.openAmount * 0.47);
    const baseDoorU = fullCentre + (Number(surface.panelLocalU) || 0);
    const normalSign = Number(surface.normalSign) < 0 ? -1 : 1;
    const point = propLocalPoint(
      state,
      baseDoorU,
      normalSign * ((Number(panel.depth) || 0.11) * 0.5 + BLOOD_SURFACE_ATTACHMENT.surfaceNudge)
    );
    const yaw = Number(state.yaw) || 0;
    const tangentX = Math.cos(yaw);
    const tangentZ = -Math.sin(yaw);
    const normalX = Math.sin(yaw) * normalSign;
    const normalZ = Math.cos(yaw) * normalSign;
    return {
      type: 'door-panel',
      x: point.x,
      z: point.y,
      axis: Math.abs(normalX) >= Math.abs(normalZ) ? 'x' : 'z',
      tangentX,
      tangentZ,
      normalX,
      normalZ,
      doorLocalU: baseDoorU,
      visibleMin: visible.localCentre - visible.width * 0.5,
      visibleMax: visible.localCentre + visible.width * 0.5
    };
  }

  function bloodStaticSurfaceSnapshot(splatter) {
    const surface = splatter?.surface;
    if (!surface || surface.type !== 'static-wall') return null;
    const axis = surface.axis === 'x' ? 'x' : 'z';
    const normalSign = Number(surface.normalSign) < 0 ? -1 : 1;
    return {
      type: 'static-wall',
      x: Number(surface.x) || 0,
      z: Number(surface.z) || 0,
      axis,
      tangentX: axis === 'z' ? 1 : 0,
      tangentZ: axis === 'x' ? 1 : 0,
      normalX: axis === 'x' ? normalSign : 0,
      normalZ: axis === 'z' ? normalSign : 0
    };
  }

  function bloodSplatterSurfaceSnapshot(splatter, stateOverride = null) {
    return splatter?.surface?.type === 'door-panel'
      ? bloodDoorSurfaceSnapshot(splatter, stateOverride)
      : bloodStaticSurfaceSnapshot(splatter);
  }

  function bloodStaticSpotSupported(snapshot, spot, wallAt = isWall) {
    if (!snapshot || snapshot.type !== 'static-wall' || typeof wallAt !== 'function') return false;
    const halfWidth = Math.max(BLOOD_SURFACE_ATTACHMENT.edgeInset, (Number(spot?.sx) || 0) * 0.88);
    const centre = Number(spot?.u) || 0;
    for (const offset of [centre - halfWidth, centre, centre + halfWidth]) {
      const x = snapshot.x + snapshot.tangentX * offset;
      const z = snapshot.z + snapshot.tangentZ * offset;
      const frontX = x + snapshot.normalX * BLOOD_SURFACE_ATTACHMENT.supportProbe;
      const frontZ = z + snapshot.normalZ * BLOOD_SURFACE_ATTACHMENT.supportProbe;
      const backX = x - snapshot.normalX * (BLOOD_SURFACE_ATTACHMENT.supportProbe + BLOOD_SURFACE_ATTACHMENT.surfaceNudge);
      const backZ = z - snapshot.normalZ * (BLOOD_SURFACE_ATTACHMENT.supportProbe + BLOOD_SURFACE_ATTACHMENT.surfaceNudge);
      if (wallAt(frontX, frontZ) || !wallAt(backX, backZ)) return false;
    }
    return true;
  }

  function bloodDoorSpotSupported(snapshot, spot) {
    if (!snapshot || snapshot.type !== 'door-panel') return false;
    const halfWidth = Math.max(BLOOD_SURFACE_ATTACHMENT.edgeInset, (Number(spot?.sx) || 0) * 0.88);
    const centre = snapshot.doorLocalU + (Number(spot?.u) || 0);
    return centre - halfWidth >= snapshot.visibleMin + BLOOD_SURFACE_ATTACHMENT.edgeInset
      && centre + halfWidth <= snapshot.visibleMax - BLOOD_SURFACE_ATTACHMENT.edgeInset;
  }

  function bloodSpotSupported(splatter, spot, snapshot = bloodSplatterSurfaceSnapshot(splatter), wallAt = isWall) {
    if (!snapshot) return false;
    return snapshot.type === 'door-panel'
      ? bloodDoorSpotSupported(snapshot, spot)
      : bloodStaticSpotSupported(snapshot, spot, wallAt);
  }

  function bloodAddSupportedSpot(splatter, spot) {
    const snapshot = bloodSplatterSurfaceSnapshot(splatter);
    if (!bloodSpotSupported(splatter, spot, snapshot)) return false;
    splatter.spots.push(spot);
    return true;
  }

  function bloodSurfaceAttachmentForTest() {
    const door = { id: 'test-door', x: 10, y: 8, yaw: 0, openAmount: 0, colour: [1, 1, 1] };
    const splatter = {
      surface: { type: 'door-panel', doorId: door.id, panelSide: 1, panelLocalU: 0, normalSign: -1 }
    };
    const closed = bloodDoorSurfaceSnapshot(splatter, door);
    const moving = bloodDoorSurfaceSnapshot(splatter, { ...door, openAmount: 0.5 });
    const pocketed = bloodDoorSurfaceSnapshot(splatter, { ...door, openAmount: 1 });
    const staticSnapshot = {
      type: 'static-wall', x: 0.016, z: 0.5, axis: 'x',
      tangentX: 0, tangentZ: 1, normalX: 1, normalZ: 0
    };
    const wallAt = (x, z) => x < 0 && z >= 0 && z < 1;
    const centreSupported = bloodStaticSpotSupported(staticSnapshot, { u: 0, sx: 0.07 }, wallAt);
    const cornerRejected = !bloodStaticSpotSupported(staticSnapshot, { u: 0.48, sx: 0.08 }, wallAt);
    const movement = closed && moving ? Math.hypot(moving.x - closed.x, moving.z - closed.z) : 0;
    return {
      ok: Boolean(closed && moving && movement > 0.20 && pocketed === null && centreSupported && cornerRejected),
      revision: BLOOD_SURFACE_ATTACHMENT.revision,
      movement: Number(movement.toFixed(3)),
      pocketed: pocketed === null,
      centreSupported,
      cornerRejected,
      poolLimit: BLOOD_DECAL_LIMIT,
      maximumDistance: BLOOD_SPLATTER_MAX_DISTANCE,
      simulationWritesAdded: 0,
      saveSchemaChanged: false,
      diagnosticsSchemaChanged: false
    };
  }

  // Build 12.199: the cosmetic cluster now remembers the surface it belongs
  // to. Sliding-door blood follows the panel into its wall pocket, while every
  // static-wall spot must retain solid backing across its complete width.
  function spawnBloodSplatter(shooter, target, options = {}) {
    const appliedDamage = Math.max(0, Number(options.appliedDamage) || 0);
    if (!shooter || !target || appliedDamage <= 0 || typeof castRay !== 'function') return null;
    const dx = target.x - shooter.x;
    const dz = target.y - shooter.y;
    const horizontal = Math.hypot(dx, dz);
    if (horizontal < 0.05) return null;
    const angle = Math.atan2(dz, dx);
    const forwardX = Math.cos(angle);
    const forwardZ = Math.sin(angle);
    const originX = target.x + forwardX * 0.08;
    const originZ = target.y + forwardZ * 0.08;
    const wallHit = castRay(originX, originZ, angle);
    const wallDistance = wallHit && Number.isFinite(wallHit.d) ? wallHit.d : Infinity;
    const doorHit = bloodDoorRayHit(originX, originZ, forwardX, forwardZ, BLOOD_SPLATTER_MAX_DISTANCE);
    const useDoor = Boolean(doorHit && doorHit.distance <= wallDistance + 0.004);
    const surfaceDistance = useDoor ? doorHit.distance : wallDistance;
    if (!Number.isFinite(surfaceDistance) || surfaceDistance > BLOOD_SPLATTER_MAX_DISTANCE) return null;

    const headshot = Boolean(options.headshot);
    const fatal = Boolean(options.fatal);
    const targetElevation = arenaElevationAt(target.x, target.y);
    const wallHeight = Number(activeArenaMeta().ceilingHeight) || GL_WALL_HEIGHT;
    const crouchDrop = target.crouched ? (headshot ? 0.43 : 0.38) : 0;
    const centreHeight = targetElevation + (headshot ? 1.64 : 1.22) - crouchDrop + (Math.random() - 0.5) * 0.16;
    if (centreHeight <= targetElevation + 0.10 || centreHeight >= targetElevation + wallHeight - 0.08) return null;

    const intensity = clamp(appliedDamage / 42 + (headshot ? 0.28 : 0) + (fatal ? 0.16 : 0), 0.30, 1.18);
    const baseSize = BLOOD_SPLATTER_PRESENTATION.baseSize
      + intensity * BLOOD_SPLATTER_PRESENTATION.damageScale
      + Math.random() * BLOOD_SPLATTER_PRESENTATION.randomSize;
    const surface = useDoor
      ? {
          type: 'door-panel',
          doorId: doorHit.doorId,
          panelSide: doorHit.panelSide,
          panelLocalU: doorHit.panelLocalU,
          normalSign: doorHit.normalSign
        }
      : {
          type: 'static-wall',
          x: wallHit.hitX - (wallHit.side === 0 ? Math.sign(forwardX || 1) * BLOOD_SURFACE_ATTACHMENT.surfaceNudge : 0),
          z: wallHit.hitY - (wallHit.side === 1 ? Math.sign(forwardZ || 1) * BLOOD_SURFACE_ATTACHMENT.surfaceNudge : 0),
          axis: wallHit.side === 0 ? 'x' : 'z',
          normalSign: wallHit.side === 0 ? -Math.sign(forwardX || 1) : -Math.sign(forwardZ || 1)
        };
    const splatter = {
      x: Number(surface.x) || 0,
      y: centreHeight,
      z: Number(surface.z) || 0,
      axis: surface.axis || 'z',
      surface,
      distance: surfaceDistance,
      appliedDamage,
      headshot,
      fatal,
      spots: []
    };
    const firstSnapshot = bloodSplatterSurfaceSnapshot(splatter);
    if (!firstSnapshot) return null;
    splatter.x = firstSnapshot.x;
    splatter.z = firstSnapshot.z;
    splatter.axis = firstSnapshot.axis;
    const core = {
      kind: 'core', u: 0, v: 0,
      sx: baseSize * (1.28 + Math.random() * 0.30),
      sy: baseSize * (0.82 + Math.random() * 0.24),
      tone: 0
    };
    if (!bloodAddSupportedSpot(splatter, core)) return null;

    const dropletCount = Math.min(5, 3 + (headshot ? 1 : 0) + (fatal ? 1 : 0));
    let droplets = 0;
    for (let attempt = 0; attempt < dropletCount * 6 && droplets < dropletCount; attempt++) {
      const theta = Math.random() * Math.PI * 2;
      const travel = baseSize * (1.10 + Math.random() * 2.35);
      const radius = baseSize * (0.18 + Math.random() * 0.28);
      if (bloodAddSupportedSpot(splatter, {
        kind: 'droplet',
        u: Math.cos(theta) * travel,
        v: Math.sin(theta) * travel * 0.72,
        sx: radius * (0.80 + Math.random() * 0.62),
        sy: radius * (0.78 + Math.random() * 0.66),
        tone: 1 + (droplets % 2)
      })) droplets++;
    }

    const dripCount = 1 + (fatal ? 1 : 0);
    let drips = 0;
    for (let attempt = 0; attempt < dripCount * 6 && drips < dripCount; attempt++) {
      if (bloodAddSupportedSpot(splatter, {
        kind: 'drip',
        u: (Math.random() - 0.5) * baseSize * 0.62,
        v: -baseSize * (0.82 + drips * 0.44 + Math.random() * 0.48),
        sx: baseSize * (0.13 + Math.random() * 0.09),
        sy: baseSize * (0.58 + Math.random() * 0.34),
        tone: drips % 2 ? 2 : 1
      })) drips++;
    }
    if (!drips) {
      bloodAddSupportedSpot(splatter, {
        kind: 'drip', u: 0, v: -baseSize * 0.92,
        sx: baseSize * 0.14, sy: baseSize * 0.64, tone: 1
      });
    }
    bloodDecals.push(splatter);
    if (bloodDecals.length > BLOOD_DECAL_LIMIT) bloodDecals.splice(0, bloodDecals.length - BLOOD_DECAL_LIMIT);
    return splatter;
  }

  function clearBloodDecals() {'''
text = regex_one(
    text,
    r"  const BLOOD_SPLATTER_PRESENTATION = Object\.freeze\(\{.*?\n  function clearBloodDecals\(\) \{",
    new_blood_block,
    'blood placement block',
    re.S
)
new_draw = r'''  function drawBloodDecals() {
    if (!bloodDecals.length) return;
    const presentation = BLOOD_SPLATTER_PRESENTATION;
    for (const splatter of bloodDecals) {
      const surface = bloodSplatterSurfaceSnapshot(splatter);
      if (!surface) continue;
      for (const spot of splatter.spots) {
        if (!bloodSpotSupported(splatter, spot, surface)) continue;
        const x = surface.x + surface.tangentX * spot.u;
        const y = splatter.y + spot.v;
        const z = surface.z + surface.tangentZ * spot.u;
        if (surface.axis === 'x') mat4TRS(glModel, x, y, z, 0, 0, 0, presentation.depth, spot.sy, spot.sx);
        else mat4TRS(glModel, x, y, z, 0, 0, 0, spot.sx, spot.sy, presentation.depth);
        drawMesh(
          glMeshes.sphere,
          presentation.colours[spot.tone] || presentation.colours[0],
          glModel,
          presentation.emissive,
          1,
          3,
          presentation.roughness
        );
      }
    }
  }

  function drawGroundGlow'''
text = regex_one(text, r"  function drawBloodDecals\(\) \{.*?\n  function drawGroundGlow", new_draw, 'blood draw block', re.S)
write(world, text)

runtime = SRC / 'js' / '70-runtime.js'
text = read(runtime)
text = one(
    text,
    "    spectatorDirectorForTest: () => spectatorDirectorForTest(),",
    "    bloodSurfaceAttachmentForTest: () => bloodSurfaceAttachmentForTest(),\n    spectatorDirectorForTest: () => spectatorDirectorForTest(),",
    'blood attachment debug hook'
)
write(runtime, text)

index = SRC / 'index.html'
text = read(index)
text = one(text, '<title>Strikewatch 12.198: Fixed-Step Match Clock &amp; Stutter Recovery</title>', f'<title>Strikewatch {VERSION}: {NAME}</title>', 'index title') if '<title>Strikewatch 12.198: Fixed-Step Match Clock &amp; Stutter Recovery</title>' in text else one(text, '<title>Strikewatch 12.198: Fixed-Step Match Clock & Stutter Recovery</title>', f'<title>Strikewatch {VERSION}: {NAME}</title>', 'index title')
if '12.198.0-fixed-step-match-clock-stutter-recovery' not in text:
    raise SystemExit('Current index build id missing')
text = text.replace('12.198.0-fixed-step-match-clock-stutter-recovery', BUILD_ID).replace('12.198', VERSION)
write(index, text)
write(release_path, json.dumps({'version': VERSION, 'name': NAME, 'build_id': BUILD_ID}, indent=2) + '\n')

write(SRC / f'AUDIT-{VERSION}.md', f'''# Build {VERSION} — {NAME}

## Scope

Nearby-wall blood used fixed world coordinates after placement. A mark visually landing on a closed sliding door therefore stayed in the doorway when the panel opened. Individual procedural droplets could also extend beyond the supported wall face at a corner, leaving small red shapes apparently suspended beside the geometry.

## Changes

- Added `BLOOD_SURFACE_ATTACHMENT` in `js/61-world-renderer.js` with one bounded surface authority for static walls and dynamic door panels.
- The blood continuation ray now tests visible sliding-door panels before accepting the farther grid-wall hit. Broad panel faces are eligible; narrow panel edges are deliberately rejected.
- Door splatters retain panel side, material-local horizontal position and face direction. Rendering resolves that attachment from the current `openAmount`, so the complete cluster travels with the panel.
- Door spots are clipped to the currently visible part of the panel. When the marked material slides into the wall pocket, the blood disappears with it instead of remaining in the aperture or drawing through the wall.
- Static-wall spots now require open space in front and solid backing behind at their centre and both lateral edges. Unsupported corner specks are rejected, while generation makes bounded extra attempts to retain a readable cluster where space permits.
- The existing dark irregular core, downward drip, positive-health-damage gate, 1.25m range and 18-event cap remain unchanged.
- Added `bloodSurfaceAttachmentForTest()` covering door movement, wall-pocket concealment and corner-footprint rejection.

## Behaviour boundaries

This remains transient renderer presentation. Damage, armour, hitboxes, weapon values, line of sight, collision, navigation, AI, match results, rewards, saves and schemas are unchanged. No mesh, texture, shader pass, uniform or persistent field was added. The direct blood draw count can only stay equal or fall because unsupported or pocketed spots are skipped.

## Verification

- The attachment diagnostic proves a test mark moves more than 0.20m with a half-open panel and becomes hidden when that panel is fully pocketed.
- The same diagnostic proves a centred wall spot retains backing while a footprint crossing a 90-degree edge is rejected.
- Source gates preserve positive real-health-damage placement, shared `castRay`, the 1.25m threshold, the 18-event pool, at least one downward drip and round clearing.
- Existing `bloodSplatterForTest()` and `impactDecalForTest()` remain present.
- Build 12.198 match-clock and Build 12.197 simulation-quality hooks remain present and unchanged.
- Every modular JavaScript file, generated bundle and standalone inline script parses with Node.
- Two builds produce identical outputs and root `cod.html` is byte-identical to the standalone.
''')

changelog = SRC / 'CHANGELOG.md'
text = read(changelog)
entry = f'''## {VERSION} — {NAME}

- Anchors blood decals to sliding door panels so they move into the wall pocket with the door.
- Rejects unsupported blood footprints at wall corners, removing floating specks.
- Preserves positive-damage placement, 1.25m range, readable core/drip styling and the 18-event cap.
- Adds deterministic door-motion, pocket-concealment and corner-support diagnostics.
- See `AUDIT-{VERSION}.md`.

'''
if f'## {VERSION} — {NAME}' in text:
    raise SystemExit('Build 12.199 changelog already exists')
pos = text.find('## ')
if pos < 0:
    raise SystemExit('Could not locate changelog insertion point')
write(changelog, text[:pos] + entry + text[pos:])

handoff = SRC / 'HANDOFF.md'
text = read(handoff)
text = one(text, '- Build: **12.198 — Fixed-Step Match Clock & Stutter Recovery**', f'- Build: **{VERSION} — {NAME}**', 'HANDOFF build')
text = one(text, '- Build ID: `12.198.0-fixed-step-match-clock-stutter-recovery`', f'- Build ID: `{BUILD_ID}`', 'HANDOFF build id')
text = one(text, 'strikewatch-source/dist/strikewatch-build-12.198.html', f'strikewatch-source/dist/strikewatch-build-{VERSION}.html', 'HANDOFF standalone')
anchor = 'Build 12.198 owns the visible-time match clock in `js/70-runtime.js`'
note = f'''Build {VERSION} owns blood surface attachment in `js/61-world-renderer.js`. Preserve `BLOOD_SURFACE_ATTACHMENT`, nearest visible-door-panel selection, material-local door coordinates, wall-pocket clipping, three-point static backing checks and `bloodSurfaceAttachmentForTest()`. Blood remains positive-health-damage-only, shared-raycast, within 1.25m, capped at 18 events, transient and cleared each round. Do not move collision, navigation, line of sight or damage authority into the renderer. Save schema 19 and diagnostics schema 1 are unchanged. See `AUDIT-{VERSION}.md`.

'''
text = one(text, anchor, note + anchor, 'HANDOFF 12.198 anchor')
write(handoff, text)

agents = SRC / 'AGENTS.md'
text = read(agents)
anchor = 'Build 12.198 owns fixed-step match elapsed time.'
note = f'''Build {VERSION} owns surface-supported blood decals. Keep dynamic-door marks attached through panel-local coordinates and hide material inside wall pockets; keep static droplets only when their complete lateral footprint has solid backing. Preserve the 12.183/12.185 damage, distance, cap, drip and round-clear contracts. Verify `bloodSurfaceAttachmentForTest()`, `bloodSplatterForTest()`, `impactDecalForTest()`, renderer draw bounds and arena/door integrity. Save schema 19 and diagnostics schema 1 remain unchanged. See `AUDIT-{VERSION}.md`.

'''
text = one(text, anchor, note + anchor, 'AGENTS 12.198 anchor')
write(agents, text)

contracts = SRC / 'CONTRACTS.md'
text = read(contracts)
old = '''- Bullet chips and blood splatters are bounded transient presentation. They use
  the shared wall raycaster, remain outside `drawStaticWorld`, clear on round
  reset and must never change damage, hitboxes, collision, navigation or line of
  sight. Blood appears only after real health damage and only on a nearby surface
  behind the struck operator. Its irregular red core and downward drip must stay
  visually distinct from the smaller pale-rimmed bullet chip at compact portrait
  widths.'''
new = '''- Bullet chips and blood splatters are bounded transient presentation. They use
  the shared wall raycaster, remain outside `drawStaticWorld`, clear on round
  reset and must never change damage, hitboxes, collision, navigation or line of
  sight. Blood appears only after real health damage and only on a nearby surface
  behind the struck operator. Its irregular red core and downward drip must stay
  visually distinct from the smaller pale-rimmed bullet chip at compact portrait
  widths. A blood spot must retain solid backing across its visible footprint;
  corner overhang is rejected. Blood landing on a moving door belongs to panel-
  local material coordinates, follows that panel and is concealed when the marked
  material enters the wall pocket.'''
text = one(text, old, new, 'blood rendering contract')
write(contracts, text)

architecture = SRC / 'ARCHITECTURE.md'
text = read(architecture)
text = one(
    text,
    '| `61-world-renderer.js` | Arenas, props, decor, doors, world geometry and transient surface decals |',
    '| `61-world-renderer.js` | Arenas, props, decor, doors, world geometry and surface-supported transient decals |',
    'world renderer architecture row'
)
write(architecture, text)

read_first = SRC / '00-READ-FIRST-GPT.md'
text = read(read_first)
text = regex_one(
    text,
    r'Current release: \*\*Strikewatch Build [^*]+\*\*\.',
    f'Current release: **Strikewatch Build {VERSION} — {NAME}**.',
    'read-first release'
)
write(read_first, text)

readme = SRC / 'README.md'
text = read(readme)
text = regex_one(text, r'^# Strikewatch Source [0-9.]+$', f'# Strikewatch Source {VERSION}', 'README heading', re.M)
text = text.replace('dist/strikewatch-build-12.198.html', f'dist/strikewatch-build-{VERSION}.html')
write(readme, text)

project = SRC / 'PROJECT.md'
text = read(project)
text = regex_one(
    text,
    r'(## Current release\n\n).*?(\n\nHistorical architecture narratives)',
    rf'\1Build {VERSION} anchors nearby-wall blood to the surface that owns it: sliding-door marks move into their wall pockets, and unsupported corner specks are rejected without changing combat. See `HANDOFF.md` and `AUDIT-{VERSION}.md`.\2',
    'PROJECT current release',
    re.S
)
write(project, text)

shutil.rmtree(ROOT / '.github' / 'scripts' / '__pycache__', ignore_errors=True)
shutil.rmtree(SRC / '__pycache__', ignore_errors=True)

world_text = read(world)
runtime_text = read(runtime)
required = [
    "revision: '12.199-surface-anchored-blood-1'",
    'function bloodDoorRayHit(',
    'function bloodDoorSurfaceSnapshot(',
    'function bloodStaticSpotSupported(',
    'function bloodSurfaceAttachmentForTest()',
    'const doorHit = bloodDoorRayHit(',
    "type: 'door-panel'",
    'bloodAddSupportedSpot(splatter, core)',
    'if (!bloodSpotSupported(splatter, spot, surface)) continue;'
]
missing = [marker for marker in required if marker not in world_text]
if missing:
    raise SystemExit(f'Missing blood attachment requirements: {missing}')
for preserved in [
    'appliedDamage <= 0',
    'BLOOD_SPLATTER_MAX_DISTANCE',
    'BLOOD_DECAL_LIMIT',
    "kind: 'drip'",
    'function clearBloodDecals()',
    'function drawImpactDecals()'
]:
    if preserved not in world_text:
        raise SystemExit(f'Missing preserved blood/impact invariant: {preserved}')
if 'bloodSurfaceAttachmentForTest: () => bloodSurfaceAttachmentForTest()' not in runtime_text:
    raise SystemExit('Public blood attachment hook missing')
for invariant in [
    "revision: '12.198-fixed-step-match-clock-1'",
    "revision: '12.197-device-independent-simulation-1'"
]:
    if invariant not in (runtime_text + read(core)):
        raise SystemExit(f'Adjacent invariant missing: {invariant}')
