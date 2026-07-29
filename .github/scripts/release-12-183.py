from pathlib import Path
import json

root = Path('strikewatch-source')
version = '12.183'
name = 'Surface Blood & Inbox CSS Ownership'
build_id = '12.183.0-surface-blood-inbox-css-ownership'


def replace_once(path, old, new):
    target = root / path
    text = target.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one occurrence, found {count}: {old[:180]!r}')
    target.write_text(text.replace(old, new, 1), encoding='utf-8', newline='\n')


expected_release = {
    'version': '12.182',
    'name': 'Operator Portrait CSS Ownership',
    'build_id': '12.182.0-operator-portrait-css-ownership',
}
current_release = json.loads((root / 'RELEASE.json').read_text(encoding='utf-8'))
if current_release != expected_release:
    raise SystemExit(f'Authoritative release moved; expected {expected_release}, got {current_release}')

replace_once('js/00-core.js', "const BUILD_VERSION = '12.182';", "const BUILD_VERSION = '12.183';")
replace_once('js/00-core.js', "const BUILD_NAME = 'Operator Portrait CSS Ownership';", "const BUILD_NAME = 'Surface Blood & Inbox CSS Ownership';")
replace_once('js/00-core.js', "const BUILD_ID = '12.182.0-operator-portrait-css-ownership';", "const BUILD_ID = '12.183.0-surface-blood-inbox-css-ownership';")
(root / 'RELEASE.json').write_text(json.dumps({
    'version': version,
    'name': name,
    'build_id': build_id,
}, indent=2) + '\n', encoding='utf-8', newline='\n')

# Next bounded SW-020 item: the complete Build 12.133 inbox scroll guard tail.
game_path = root / 'css/game.css'
game = game_path.read_text(encoding='utf-8')
marker = '/* --- Inbox feed: inert until the manager clicks into it --- */'
position = game.find(marker)
if position < 0:
    raise SystemExit('Inbox scroll marker missing')
block = game[position:].strip() + '\n'
required_inbox = (
    marker,
    '.club-mail-list {',
    'overflow-y: hidden !important;',
    'overscroll-behavior: contain;',
    'body.mail-scroll-armed .club-mail-list {',
    'overflow-y: auto !important;',
    '.club-mail-list.mail-scroll-overflow {',
    '-webkit-mask-image: linear-gradient(180deg, #000 calc(100% - 34px), rgba(0, 0, 0, .18) 100%);',
    'mask-image: linear-gradient(180deg, #000 calc(100% - 34px), rgba(0, 0, 0, .18) 100%);',
)
missing = [item for item in required_inbox if item not in block]
if missing:
    raise SystemExit(f'Inbox scroll declarations missing: {missing}')
if block.count(marker) != 1 or block.count('.club-mail-list') != 3:
    raise SystemExit('Unexpected inbox scroll selector/marker count')
if not block.rstrip().endswith('}'):
    raise SystemExit('Inbox scroll block does not end cleanly')
game_path.write_text(game[:position].rstrip() + '\n', encoding='utf-8', newline='\n')
(root / 'css/inbox-scroll.css').write_text(
    '/* Inbox nested-scroll arming and overflow signposting ownership.\n'
    '   Extracted from the Build 12.133 tail in Build 12.183 without changing declarations. */\n\n'
    + block,
    encoding='utf-8', newline='\n',
)

# Bounded transient wall-blood state. It shares the existing surface-decal path
# and never enters career state or static-world batching.
replace_once(
    'js/60-renderer-core.js',
    '''  const IMPACT_DECAL_LIMIT = 48;\n  const impactDecals = [];\n  let lastFrameDt = 1 / 60;''',
    '''  const IMPACT_DECAL_LIMIT = 48;\n  const impactDecals = [];\n  // Build 12.183: blood marks are transient presentation generated only after\n  // real health damage. Keep the pool bounded because each splatter contains a\n  // small authored cluster of flattened procedural spheres.\n  const BLOOD_DECAL_LIMIT = 18;\n  const BLOOD_SPLATTER_MAX_DISTANCE = 1.25;\n  const bloodDecals = [];\n  let lastFrameDt = 1 / 60;'''
)

world_path = root / 'js/61-world-renderer.js'
world = world_path.read_text(encoding='utf-8')
world_anchor = '\n  function drawGroundGlow(x, z, sx, sz, colour, alpha, yaw = 0, emissive = 0.0) {'
if world.count(world_anchor) != 1:
    raise SystemExit('World renderer blood insertion anchor missing')
blood_code = r'''

  // Build 12.183: project a stylised blood cluster onto a nearby wall behind a
  // struck operator. The continuation ray uses the same castRay authority as
  // line of sight and bullet chips, so presentation can never invent a surface.
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
    const hit = castRay(originX, originZ, angle);
    if (!hit || !Number.isFinite(hit.d) || hit.d > BLOOD_SPLATTER_MAX_DISTANCE) return null;

    const headshot = Boolean(options.headshot);
    const fatal = Boolean(options.fatal);
    const targetElevation = arenaElevationAt(target.x, target.y);
    const wallHeight = Number(activeArenaMeta().ceilingHeight) || GL_WALL_HEIGHT;
    const crouchDrop = target.crouched ? (headshot ? 0.43 : 0.38) : 0;
    const centreHeight = targetElevation + (headshot ? 1.64 : 1.22) - crouchDrop + (Math.random() - 0.5) * 0.16;
    if (centreHeight <= targetElevation + 0.10 || centreHeight >= targetElevation + wallHeight - 0.08) return null;

    const nudge = 0.016;
    const intensity = clamp(appliedDamage / 42 + (headshot ? 0.28 : 0) + (fatal ? 0.16 : 0), 0.30, 1.18);
    const baseSize = 0.052 + intensity * 0.052 + Math.random() * 0.020;
    const splatter = {
      x: hit.hitX - (hit.side === 0 ? Math.sign(forwardX || 1) * nudge : 0),
      y: centreHeight,
      z: hit.hitY - (hit.side === 1 ? Math.sign(forwardZ || 1) * nudge : 0),
      axis: hit.side === 0 ? 'x' : 'z',
      distance: hit.d,
      appliedDamage,
      headshot,
      fatal,
      spots: []
    };
    splatter.spots.push({
      u: 0,
      v: 0,
      sx: baseSize * (1.02 + Math.random() * 0.24),
      sy: baseSize * (0.76 + Math.random() * 0.24),
      tone: 0
    });
    const dropletCount = Math.min(4, 2 + (headshot ? 1 : 0) + (fatal ? 1 : 0));
    for (let index = 0; index < dropletCount; index++) {
      const theta = Math.random() * Math.PI * 2;
      const travel = baseSize * (1.05 + Math.random() * 2.15);
      const radius = baseSize * (0.18 + Math.random() * 0.27);
      splatter.spots.push({
        u: Math.cos(theta) * travel,
        v: Math.sin(theta) * travel * 0.72,
        sx: radius * (0.78 + Math.random() * 0.58),
        sy: radius * (0.76 + Math.random() * 0.62),
        tone: 1 + (index % 2)
      });
    }
    bloodDecals.push(splatter);
    if (bloodDecals.length > BLOOD_DECAL_LIMIT) bloodDecals.splice(0, bloodDecals.length - BLOOD_DECAL_LIMIT);
    return splatter;
  }

  function clearBloodDecals() {
    bloodDecals.length = 0;
  }

  function drawBloodDecals() {
    if (!bloodDecals.length) return;
    const colours = [
      [0.205, 0.010, 0.015],
      [0.125, 0.004, 0.008],
      [0.265, 0.014, 0.019]
    ];
    for (const splatter of bloodDecals) {
      for (const spot of splatter.spots) {
        const x = splatter.x + (splatter.axis === 'z' ? spot.u : 0);
        const y = splatter.y + spot.v;
        const z = splatter.z + (splatter.axis === 'x' ? spot.u : 0);
        if (splatter.axis === 'x') mat4TRS(glModel, x, y, z, 0, 0, 0, 0.012, spot.sy, spot.sx);
        else mat4TRS(glModel, x, y, z, 0, 0, 0, spot.sx, spot.sy, 0.012);
        drawMesh(glMeshes.sphere, colours[spot.tone] || colours[0], glModel, 0, 1, 3, 0.90);
      }
    }
  }
'''
world_path.write_text(world.replace(world_anchor, blood_code + world_anchor, 1), encoding='utf-8', newline='\n')

replace_once(
    'js/30-bot-ai.js',
    '''        const fatalHit = target.health <= 0;\n        spawnDamageNumber(this, target, appliedDamage, fatalHit, criticalHit, headshotHit);''',
    '''        const fatalHit = target.health <= 0;\n        if (appliedDamage > 0 && typeof spawnBloodSplatter === 'function') {\n          spawnBloodSplatter(this, target, { appliedDamage, headshot: headshotHit, fatal: fatalHit });\n        }\n        spawnDamageNumber(this, target, appliedDamage, fatalHit, criticalHit, headshotHit);'''
)

replace_once(
    'js/63-viewmodel-renderer.js',
    '''    // Build 12.155: impact marks are drawn after the world so they sit on the\n    // surface they hit, and outside the static pass so batching can never bake\n    // them. Opaque, so they need no blend state of their own.\n    if (typeof drawImpactDecals === 'function') drawImpactDecals();\n\n    if (tracers.length) {''',
    '''    // Surface marks are drawn after the world so they sit on the surface they\n    // hit, and outside the static pass so batching can never bake them. Opaque,\n    // so they need no blend state of their own.\n    if (typeof drawImpactDecals === 'function') drawImpactDecals();\n    if (typeof drawBloodDecals === 'function') drawBloodDecals();\n\n    if (tracers.length) {'''
)

replace_once(
    'js/40-match-flow.js',
    '''    tracers.length = 0;\n    if (typeof clearImpactDecals === 'function') clearImpactDecals();\n    soundEvents = [];''',
    '''    tracers.length = 0;\n    if (typeof clearImpactDecals === 'function') clearImpactDecals();\n    if (typeof clearBloodDecals === 'function') clearBloodDecals();\n    soundEvents = [];'''
)

save_path = root / 'js/79-save-checkpoints.js'
save_text = save_path.read_text(encoding='utf-8')
save_anchor = '  window.__strikeDebug.skyDomeForTest = () => skyDomeForTest();'
if save_text.count(save_anchor) != 1:
    raise SystemExit('Debug hook insertion anchor missing')
blood_hooks = r'''  // Build 12.183: finds an open cell with a solid surface directly behind it,
  // then projects one real body-damage splatter without requiring a live duel.
  window.__strikeDebug.bloodSplatterForTest = () => {
    if (typeof spawnBloodSplatter !== 'function') return { ok: false, reason: 'spawnBloodSplatter unavailable' };
    let setup = null;
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let z = 2; z < MAP_H - 2 && !setup; z++) {
      for (let x = 2; x < MAP_W - 2 && !setup; x++) {
        if (MAP[z]?.[x] !== '0') continue;
        for (const [dx, dz] of directions) {
          const wallX = x + dx;
          const wallZ = z + dz;
          const shooterX = x - dx * 2;
          const shooterZ = z - dz * 2;
          const middleX = x - dx;
          const middleZ = z - dz;
          if (MAP[wallZ]?.[wallX] === '0') continue;
          if (MAP[middleZ]?.[middleX] !== '0' || MAP[shooterZ]?.[shooterX] !== '0') continue;
          setup = {
            shooter: { x: shooterX + 0.5, y: shooterZ + 0.5, crouched: false },
            target: { x: x + 0.5, y: z + 0.5, crouched: false }
          };
          break;
        }
      }
    }
    if (!setup) return { ok: false, reason: 'No adjacent wall test lane found.' };
    const before = bloodDecals.length;
    const splatter = spawnBloodSplatter(setup.shooter, setup.target, { appliedDamage: 34, headshot: false, fatal: false });
    const solidBehind = splatter
      ? isWall(splatter.x + (splatter.axis === 'x' ? 0.06 : 0), splatter.z + (splatter.axis === 'z' ? 0.06 : 0))
        || isWall(splatter.x - (splatter.axis === 'x' ? 0.06 : 0), splatter.z - (splatter.axis === 'z' ? 0.06 : 0))
      : false;
    return {
      ok: Boolean(splatter) && solidBehind && splatter.distance <= BLOOD_SPLATTER_MAX_DISTANCE,
      arenaId: activeArenaId,
      spawned: Boolean(splatter),
      restsOnSolidSurface: solidBehind,
      distance: splatter ? Number(splatter.distance.toFixed(3)) : null,
      maximumDistance: BLOOD_SPLATTER_MAX_DISTANCE,
      spots: splatter ? splatter.spots.length : 0,
      count: bloodDecals.length,
      grew: bloodDecals.length > before,
      limit: BLOOD_DECAL_LIMIT
    };
  };
  window.__strikeDebug.bloodSplatterCountForTest = () => ({ count: bloodDecals.length, limit: BLOOD_DECAL_LIMIT });
  window.__strikeDebug.clearBloodSplatterForTest = () => { clearBloodDecals(); return { count: bloodDecals.length }; };
'''
save_path.write_text(save_text.replace(save_anchor, blood_hooks + save_anchor, 1), encoding='utf-8', newline='\n')

# Static shell and ordered CSS ownership.
index_path = root / 'index.html'
text = index_path.read_text(encoding='utf-8')
if text.count('>12.182</b>') != 2:
    raise SystemExit('Expected exactly two visible 12.182 build labels')
text = text.replace('Strikewatch 12.182: Operator Portrait CSS Ownership', 'Strikewatch 12.183: Surface Blood & Inbox CSS Ownership', 1)
text = text.replace('12.182.0-operator-portrait-css-ownership', build_id)
text = text.replace('>12.182</b>', '>12.183</b>')
game_link = '<link rel="stylesheet" href="css/game.css?v=12.183.0-surface-blood-inbox-css-ownership" />'
inbox_link = '<link rel="stylesheet" href="css/inbox-scroll.css?v=12.183.0-surface-blood-inbox-css-ownership" />'
if text.count(game_link) != 1 or inbox_link in text:
    raise SystemExit('Unexpected index stylesheet insertion state')
index_path.write_text(text.replace(game_link, game_link + '\n' + inbox_link, 1), encoding='utf-8', newline='\n')

build_path = root / 'build.py'
text = build_path.read_text(encoding='utf-8')
old_paths = 'CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "operator-portrait.css",'
new_paths = 'CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "inbox-scroll.css", ROOT / "css" / "operator-portrait.css",'
if text.count(old_paths) != 1:
    raise SystemExit('Expected 12.182 CSS_PATHS prefix missing')
text = text.replace(old_paths, new_paths, 1)
old_metric = '        "owned_operator_portrait_lines": texts["operator-portrait.css"].count("\\n"),'
new_metric = '        "owned_inbox_scroll_lines": texts["inbox-scroll.css"].count("\\n"),\n        "owned_operator_portrait_lines": texts["operator-portrait.css"].count("\\n"),'
if text.count(old_metric) != 1:
    raise SystemExit('CSS debt metric insertion point missing')
text = text.replace(old_metric, new_metric, 1)
if text.count('"game_css_lines_max": 30830') != 1:
    raise SystemExit('12.182 game.css budget missing')
text = text.replace('"game_css_lines_max": 30830', '"game_css_lines_max": 30810', 1)
build_path.write_text(text, encoding='utf-8', newline='\n')

# Ownership and stable renderer contract documentation.
architecture = root / 'ARCHITECTURE.md'
text = architecture.read_text(encoding='utf-8')
old_owner = '| `css/game.css` | Legacy/base responsive and visual presentation; no new component-owned tail blocks |\n| `css/operator-portrait.css` | Asset-free operator complexion, kit, headgear, rig and deployment portrait presentation |'
new_owner = '| `css/game.css` | Legacy/base responsive and visual presentation; no new component-owned tail blocks |\n| `css/inbox-scroll.css` | Inbox nested-scroll arming, overscroll containment and overflow mask |\n| `css/operator-portrait.css` | Asset-free operator complexion, kit, headgear, rig and deployment portrait presentation |'
if text.count(old_owner) != 1:
    raise SystemExit('Architecture CSS owner insertion point missing')
text = text.replace(old_owner, new_owner, 1)
text = text.replace('| `61-world-renderer.js` | Arenas, props, decor, doors and world geometry |', '| `61-world-renderer.js` | Arenas, props, decor, doors, world geometry and transient surface decals |', 1)
old_order = 'The current order is `game.css`, `operator-portrait.css`, `command-chrome.css`,'
new_order = 'The current order is `game.css`, `inbox-scroll.css`, `operator-portrait.css`, `command-chrome.css`,'
if text.count(old_order) != 1:
    raise SystemExit('Architecture order insertion point missing')
architecture.write_text(text.replace(old_order, new_order, 1), encoding='utf-8', newline='\n')

contracts = root / 'CONTRACTS.md'
text = contracts.read_text(encoding='utf-8')
contract_anchor = '''- Static world batching bakes model matrices at capture time. An arena may only\n  be batched once every time-dependent draw in `drawStaticWorld` is excluded\n  through `setStaticWorldBatchEligibility()`.'''
contract_new = contract_anchor + '''\n- Bullet chips and blood splatters are bounded transient presentation. They use\n  the shared wall raycaster, remain outside `drawStaticWorld`, clear on round\n  reset and must never change damage, hitboxes, collision, navigation or line of\n  sight. Blood appears only after real health damage and only on a nearby surface\n  behind the struck operator.'''
if text.count(contract_anchor) != 1:
    raise SystemExit('Rendering contract insertion point missing')
contracts.write_text(text.replace(contract_anchor, contract_new, 1), encoding='utf-8', newline='\n')

handoff = root / 'HANDOFF.md'
text = handoff.read_text(encoding='utf-8')
text = text.replace('Build: **12.182 — Operator Portrait CSS Ownership**', 'Build: **12.183 — Surface Blood & Inbox CSS Ownership**', 1)
text = text.replace('Build ID: `12.182.0-operator-portrait-css-ownership`', 'Build ID: `12.183.0-surface-blood-inbox-css-ownership`', 1)
text = text.replace('strikewatch-build-12.182.html', 'strikewatch-build-12.183.html', 1)
old_note = 'Build 12.182 continues SW-020 by moving the Build 12.133 asset-free operator portrait presentation into `css/operator-portrait.css`. Independent complexion and kit variables, helmet and rig variants, comms accent, 54px desktop deployment portrait and 50px compact portrait remain unchanged. The sheet follows `game.css` before all later component layers. Portrait identity generation remains owned by `teamPlayerVisualMarkup(player, role)`. See `AUDIT-12.182.md`.'
new_note = 'Build 12.183 adds bounded wall blood splatters when real health damage lands with a solid surface within 1.25m behind the struck operator. The continuation ray reuses `castRay`, splatters stay in the dynamic pass, cap at 18 and clear on round reset. The same release continues SW-020 by moving the Build 12.133 Inbox scroll arming and overflow mask into `css/inbox-scroll.css` immediately after `game.css`. See `AUDIT-12.183.md`.\n\nBuild 12.182 continues SW-020 by moving the Build 12.133 asset-free operator portrait presentation into `css/operator-portrait.css`. Independent complexion and kit variables, helmet and rig variants, comms accent, 54px desktop deployment portrait and 50px compact portrait remain unchanged. After the 12.183 extraction, the sheet follows `inbox-scroll.css` before all later component layers. Portrait identity generation remains owned by `teamPlayerVisualMarkup(player, role)`. See `AUDIT-12.182.md`.'
if text.count(old_note) != 1:
    raise SystemExit('12.182 HANDOFF note missing')
handoff.write_text(text.replace(old_note, new_note, 1), encoding='utf-8', newline='\n')

agents = root / 'AGENTS.md'
text = agents.read_text(encoding='utf-8')
anchor = '## Current release note\n\n'
note = 'Build 12.183 owns Inbox nested-scroll presentation in `css/inbox-scroll.css`; keep it immediately after `game.css`, before `operator-portrait.css`, with hidden-by-default overflow, explicit `mail-scroll-armed` activation, overscroll containment and the bottom overflow mask unchanged. Wall blood is transient renderer presentation: trigger only after positive health damage, use the shared `castRay` continuation behind the target, require a surface within 1.25m, stay outside `drawStaticWorld`, cap at 18 and clear every round. Verify `bloodSplatterForTest()`, `impactDecalForTest()`, renderer draw-call bounds and the Inbox computed-style probe. See `AUDIT-12.183.md`.\n\n'
if text.count(anchor) != 1:
    raise SystemExit('AGENTS current release anchor missing')
text = text.replace(anchor, anchor + note, 1)
old_agent = 'Build 12.182 owns asset-free operator portrait presentation in `css/operator-portrait.css`. Keep it immediately after `game.css`, before `command-chrome.css`.'
new_agent = 'Build 12.182 owns asset-free operator portrait presentation in `css/operator-portrait.css`. Keep it after `inbox-scroll.css`, before `command-chrome.css`.'
if text.count(old_agent) != 1:
    raise SystemExit('12.182 AGENTS order note missing')
agents.write_text(text.replace(old_agent, new_agent, 1), encoding='utf-8', newline='\n')

replace_once('README.md', '# Strikewatch Source 12.182', '# Strikewatch Source 12.183')
replace_once('README.md', 'dist/strikewatch-build-12.182.html', 'dist/strikewatch-build-12.183.html')

project = root / 'PROJECT.md'
text = project.read_text(encoding='utf-8')
old_current = '''Build 12.182 continues the staged CSS ownership programme by moving the Build\n12.133 asset-free operator portrait presentation into `css/operator-portrait.css`\nwithout changing declarations, deterministic identity generation or responsive\nsizing. See `HANDOFF.md` and `AUDIT-12.182.md`.'''
new_current = '''Build 12.183 adds bounded nearby-wall blood splatters to real body hits and\ncontinues the staged CSS ownership programme by moving Inbox scroll arming into\n`css/inbox-scroll.css` without changing its declarations. See `HANDOFF.md` and\n`AUDIT-12.183.md`.'''
if text.count(old_current) != 1:
    raise SystemExit('PROJECT current release paragraph missing')
project.write_text(text.replace(old_current, new_current, 1), encoding='utf-8', newline='\n')

replace_once('00-READ-FIRST-GPT.md', 'Current release: **Strikewatch Build 12.182 — Operator Portrait CSS Ownership**.', 'Current release: **Strikewatch Build 12.183 — Surface Blood & Inbox CSS Ownership**.')

changelog = root / 'CHANGELOG.md'
text = changelog.read_text(encoding='utf-8')
header = '# Release history router\n'
entry = '''\n## 12.183 — Surface Blood & Inbox CSS Ownership\n\n- Adds stylised blood splatters to nearby walls behind operators after real health damage, using the existing shared grid raycaster rather than a second collision authority.\n- Keeps blood presentation transient, outside static batching, capped at 18 splatters and cleared on round reset; armour-only hits do not create blood.\n- Moves the Build 12.133 Inbox scroll arming, overscroll containment and overflow mask from `game.css` into `css/inbox-scroll.css` without changing declarations.\n- Preserves the new stylesheet immediately after `game.css`, before operator portraits and every later presentation layer.\n- Tightens the `game.css` line budget and records the new owner in the CSS debt report and architecture map.\n- Evidence: `AUDIT-12.183.md`.\n\n'''
if not text.startswith(header):
    raise SystemExit('CHANGELOG header missing')
changelog.write_text(header + entry + text[len(header):], encoding='utf-8', newline='\n')

(root / 'AUDIT-12.183.md').write_text('''# Build 12.183 — Surface Blood & Inbox CSS Ownership\n\n## Scope\n\nTwo bounded changes ship together: the next SW-020 ownership item, and an FPS presentation feature requested for live matches.\n\n## Nearby-wall blood splatters\n\nA landed shot already resolves authoritative health damage in `30-bot-ai.js`. After positive health damage is applied, the cosmetic path calls `spawnBloodSplatter(shooter, target, hit)`. Armour-only absorption does not create blood. The continuation direction is the real shooter-to-target line; from just beyond the target, `castRay` finds the first solid surface. A splatter is created only when that surface is no more than 1.25 metres behind the operator. This reuses the same grid authority as line of sight and Build 12.155 bullet chips.\n\nEach splatter is a small cluster of flattened procedural spheres: one central mark and two to four droplets, with modest extra spread for headshots and fatal hits. It is presentation only. `BLOOD_DECAL_LIMIT` caps the pool at 18 events, the dynamic renderer draws it after world geometry and outside `drawStaticWorld`, and round reset clears it beside tracers and bullet chips. No texture, asset, shader pass, navigation, collision, hitbox, damage, armour, AI or settlement change is introduced.\n\n## Inbox scroll CSS ownership\n\nThe complete Build 12.133 `Inbox feed: inert until the manager clicks into it` tail is removed from `css/game.css` and placed in `css/inbox-scroll.css`. The declarations are unchanged: `.club-mail-list` remains `overflow-y: hidden` with contained overscroll until `body.mail-scroll-armed` restores automatic vertical scrolling, and `mail-scroll-overflow` retains the bottom mask that signals hidden rows.\n\nThe new sheet loads immediately after `game.css`, before `operator-portrait.css`, preserving the block's former cascade position.\n\n## Stable contracts and documentation\n\n`CONTRACTS.md` now records that bullet and blood decals are bounded transient presentation, use the shared raycaster, remain outside static batching, clear on round reset and never influence simulation. `ARCHITECTURE.md` records Inbox CSS ownership and transient surface decals under the world renderer. Current release, handoff, agent, overview and history documents are updated. Save schema remains 19 and diagnostics schema remains 1.\n\n## Verification\n\n- `python3 -m py_compile build.py` passes.\n- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.\n- Every modular JavaScript file, the generated development bundle and each standalone inline JavaScript block parse.\n- `game.css` no longer contains the Inbox marker; `inbox-scroll.css` contains the complete unchanged block exactly once.\n- `index.html` stylesheet hrefs exactly match `CSS_PATHS`; standalone output retains no external development stylesheet.\n- CSS debt stays within the existing `!important` and media-query budgets, with a tighter `game.css` limit.\n- Headless Chromium loads the development build without page or console errors.\n- The computed-style Inbox probe is hidden by default, becomes scrollable only with `mail-scroll-armed`, retains `overscroll-behavior: contain` and exposes the overflow mask.\n- `bloodSplatterForTest()` locates a valid adjacent wall lane, creates a multi-spot splatter on solid geometry within the 1.25m threshold and reports the bounded pool.\n- Repeated blood tests settle exactly at the 18-event cap; `clearBloodSplatterForTest()` returns the pool to zero.\n- Existing `impactDecalForTest()` remains green.\n- Root `cod.html` is byte-identical to the standalone.\n\nNo live manual play session is claimed. Browser evidence is automated headless Chromium plus source, parse, deterministic-build, computed-style, raycast-placement and pool-bound gates.\n''', encoding='utf-8', newline='\n')
