from pathlib import Path
import json

root = Path('strikewatch-source')
version = '12.185'
name = 'Blood Visibility & Deployment CSS Ownership'
build_id = '12.185.0-blood-visibility-deployment-css-ownership'


def replace_once(path, old, new):
    target = root / path
    text = target.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one occurrence, found {count}: {old[:180]!r}')
    target.write_text(text.replace(old, new, 1), encoding='utf-8', newline='\n')


def replace_section(path, start_marker, end_marker, replacement):
    target = root / path
    text = target.read_text(encoding='utf-8')
    start = text.find(start_marker)
    end = text.find(end_marker, start + len(start_marker))
    if start < 0 or end < 0:
        raise SystemExit(f'{path}: section boundary missing: {start_marker!r} -> {end_marker!r}')
    target.write_text(text[:start] + replacement + text[end:], encoding='utf-8', newline='\n')


expected_release = {
    'version': '12.184',
    'name': 'Economy Guide CSS Ownership',
    'build_id': '12.184.0-economy-guide-css-ownership',
}
current_release = json.loads((root / 'RELEASE.json').read_text(encoding='utf-8'))
if current_release != expected_release:
    raise SystemExit(f'Authoritative release moved; expected {expected_release}, got {current_release}')

replace_once('js/00-core.js', "const BUILD_VERSION = '12.184';", "const BUILD_VERSION = '12.185';")
replace_once('js/00-core.js', "const BUILD_NAME = 'Economy Guide CSS Ownership';", "const BUILD_NAME = 'Blood Visibility & Deployment CSS Ownership';")
replace_once('js/00-core.js', "const BUILD_ID = '12.184.0-economy-guide-css-ownership';", "const BUILD_ID = '12.185.0-blood-visibility-deployment-css-ownership';")
(root / 'RELEASE.json').write_text(json.dumps({
    'version': version,
    'name': name,
    'build_id': build_id,
}, indent=2) + '\n', encoding='utf-8', newline='\n')

# Build 12.185: make the wall mark legible as blood at compact portrait scale.
# Placement, damage gating, the 1.25m continuation ray and the 18-event cap remain
# untouched. The presentation grows, becomes more saturated and always carries a
# downward drip so it no longer resembles the smaller pale-rimmed bullet chip.
world_path = root / 'js/61-world-renderer.js'
world = world_path.read_text(encoding='utf-8')
old_header = '''  // Build 12.183: project a stylised blood cluster onto a nearby wall behind a
  // struck operator. The continuation ray uses the same castRay authority as
  // line of sight and bullet chips, so presentation can never invent a surface.
  function spawnBloodSplatter(shooter, target, options = {}) {'''
new_header = '''  const BLOOD_SPLATTER_PRESENTATION = Object.freeze({
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

  // Build 12.185: keep the existing nearby-wall projection authority, but make
  // the cosmetic cluster read as blood on a portrait phone: a larger irregular
  // core, stronger red separation and at least one downward drip.
  function spawnBloodSplatter(shooter, target, options = {}) {'''
if world.count(old_header) != 1:
    raise SystemExit('61-world-renderer.js: blood header mismatch')
world = world.replace(old_header, new_header, 1)
old_spawn = '''    const intensity = clamp(appliedDamage / 42 + (headshot ? 0.28 : 0) + (fatal ? 0.16 : 0), 0.30, 1.18);
    const baseSize = 0.052 + intensity * 0.052 + Math.random() * 0.020;'''
new_spawn = '''    const intensity = clamp(appliedDamage / 42 + (headshot ? 0.28 : 0) + (fatal ? 0.16 : 0), 0.30, 1.18);
    const baseSize = BLOOD_SPLATTER_PRESENTATION.baseSize
      + intensity * BLOOD_SPLATTER_PRESENTATION.damageScale
      + Math.random() * BLOOD_SPLATTER_PRESENTATION.randomSize;'''
if world.count(old_spawn) != 1:
    raise SystemExit('61-world-renderer.js: blood size formula mismatch')
world = world.replace(old_spawn, new_spawn, 1)
old_core = '''    splatter.spots.push({
      u: 0,
      v: 0,
      sx: baseSize * (1.02 + Math.random() * 0.24),
      sy: baseSize * (0.76 + Math.random() * 0.24),
      tone: 0
    });
    const dropletCount = Math.min(4, 2 + (headshot ? 1 : 0) + (fatal ? 1 : 0));'''
new_core = '''    splatter.spots.push({
      kind: 'core',
      u: 0,
      v: 0,
      sx: baseSize * (1.28 + Math.random() * 0.30),
      sy: baseSize * (0.82 + Math.random() * 0.24),
      tone: 0
    });
    const dropletCount = Math.min(5, 3 + (headshot ? 1 : 0) + (fatal ? 1 : 0));'''
if world.count(old_core) != 1:
    raise SystemExit('61-world-renderer.js: blood core mismatch')
world = world.replace(old_core, new_core, 1)
old_droplet = '''      const theta = Math.random() * Math.PI * 2;
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
    bloodDecals.push(splatter);'''
new_droplet = '''      const theta = Math.random() * Math.PI * 2;
      const travel = baseSize * (1.10 + Math.random() * 2.35);
      const radius = baseSize * (0.18 + Math.random() * 0.28);
      splatter.spots.push({
        kind: 'droplet',
        u: Math.cos(theta) * travel,
        v: Math.sin(theta) * travel * 0.72,
        sx: radius * (0.80 + Math.random() * 0.62),
        sy: radius * (0.78 + Math.random() * 0.66),
        tone: 1 + (index % 2)
      });
    }
    const dripCount = 1 + (fatal ? 1 : 0);
    for (let index = 0; index < dripCount; index++) {
      splatter.spots.push({
        kind: 'drip',
        u: (Math.random() - 0.5) * baseSize * 0.62,
        v: -baseSize * (0.82 + index * 0.44 + Math.random() * 0.48),
        sx: baseSize * (0.13 + Math.random() * 0.09),
        sy: baseSize * (0.58 + Math.random() * 0.34),
        tone: index % 2 ? 2 : 1
      });
    }
    bloodDecals.push(splatter);'''
if world.count(old_droplet) != 1:
    raise SystemExit('61-world-renderer.js: blood droplet section mismatch')
world = world.replace(old_droplet, new_droplet, 1)
old_draw = '''  function drawBloodDecals() {
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
  }'''
new_draw = '''  function drawBloodDecals() {
    if (!bloodDecals.length) return;
    const presentation = BLOOD_SPLATTER_PRESENTATION;
    for (const splatter of bloodDecals) {
      for (const spot of splatter.spots) {
        const x = splatter.x + (splatter.axis === 'z' ? spot.u : 0);
        const y = splatter.y + spot.v;
        const z = splatter.z + (splatter.axis === 'x' ? spot.u : 0);
        if (splatter.axis === 'x') mat4TRS(glModel, x, y, z, 0, 0, 0, presentation.depth, spot.sy, spot.sx);
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
  }'''
if world.count(old_draw) != 1:
    raise SystemExit('61-world-renderer.js: blood draw section mismatch')
world_path.write_text(world.replace(old_draw, new_draw, 1), encoding='utf-8', newline='\n')

# Extend the existing renderer diagnostic so the visibility requirement is
# objective: the mark must ignore zero health damage, exceed the largest bullet
# chip rim, contain an irregular multi-spot cluster and include a downward drip.
new_blood_hook = '''  // Build 12.185: finds an open cell with a solid surface directly behind it,
  // verifies zero health damage remains ignored, then projects one readable
  // body-damage splatter without requiring a live duel.
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
    const zeroDamageBefore = bloodDecals.length;
    const zeroDamage = spawnBloodSplatter(setup.shooter, setup.target, { appliedDamage: 0, headshot: false, fatal: false });
    const ignoredZeroDamage = !zeroDamage && bloodDecals.length === zeroDamageBefore;
    const before = bloodDecals.length;
    const splatter = spawnBloodSplatter(setup.shooter, setup.target, { appliedDamage: 34, headshot: false, fatal: false });
    const solidBehind = splatter
      ? isWall(splatter.x + (splatter.axis === 'x' ? 0.06 : 0), splatter.z + (splatter.axis === 'z' ? 0.06 : 0))
        || isWall(splatter.x - (splatter.axis === 'x' ? 0.06 : 0), splatter.z - (splatter.axis === 'z' ? 0.06 : 0))
      : false;
    const core = splatter?.spots.find(spot => spot.kind === 'core') || splatter?.spots[0] || null;
    const drips = splatter ? splatter.spots.filter(spot => spot.kind === 'drip').length : 0;
    const largestSpan = splatter ? Math.max(...splatter.spots.map(spot => Math.max(spot.sx, spot.sy))) : 0;
    const coreToImpactRatio = core ? core.sx / BLOOD_SPLATTER_PRESENTATION.impactRimMaximum : 0;
    return {
      ok: Boolean(splatter)
        && ignoredZeroDamage
        && solidBehind
        && splatter.distance <= BLOOD_SPLATTER_MAX_DISTANCE
        && splatter.spots.length >= 5
        && drips >= 1
        && Boolean(core)
        && core.sx >= BLOOD_SPLATTER_PRESENTATION.minimumReadableCoreWidth
        && coreToImpactRatio >= 1.5,
      arenaId: activeArenaId,
      spawned: Boolean(splatter),
      ignoredZeroDamage,
      restsOnSolidSurface: solidBehind,
      distance: splatter ? Number(splatter.distance.toFixed(3)) : null,
      maximumDistance: BLOOD_SPLATTER_MAX_DISTANCE,
      spots: splatter ? splatter.spots.length : 0,
      drips,
      coreWidth: core ? Number(core.sx.toFixed(4)) : null,
      coreHeight: core ? Number(core.sy.toFixed(4)) : null,
      largestSpan: Number(largestSpan.toFixed(4)),
      minimumReadableCoreWidth: BLOOD_SPLATTER_PRESENTATION.minimumReadableCoreWidth,
      impactRimMaximum: BLOOD_SPLATTER_PRESENTATION.impactRimMaximum,
      coreToImpactRatio: Number(coreToImpactRatio.toFixed(3)),
      count: bloodDecals.length,
      grew: bloodDecals.length > before,
      limit: BLOOD_DECAL_LIMIT
    };
  };
'''
replace_section(
    'js/79-save-checkpoints.js',
    '  // Build 12.183: finds an open cell with a solid surface directly behind it,',
    '  window.__strikeDebug.bloodSplatterCountForTest',
    new_blood_hook,
)
replace_once(
    'js/79-save-checkpoints.js',
    "  window.__strikeDebug.bloodSplatterCountForTest = () => ({ count: bloodDecals.length, limit: BLOOD_DECAL_LIMIT });",
    "  window.__strikeDebug.bloodSplatterCountForTest = () => ({ count: bloodDecals.length, spots: bloodDecals.reduce((total, splatter) => total + splatter.spots.length, 0), limit: BLOOD_DECAL_LIMIT });",
)

# Extract the complete current EOF Confirm Deployment block. It originally sat
# before the previously extracted economy, Inbox, portrait and later layers, so
# the new sheet must load immediately after game.css.
game_path = root / 'css/game.css'
game = game_path.read_text(encoding='utf-8')
marker = '/* --- Confirm Deployment: readable at every width --- */'
position = game.find(marker)
if position < 0:
    raise SystemExit('Confirm Deployment marker missing')
block = game[position:].strip() + '\n'
required = (
    marker,
    '.deployment-section-head span,',
    '.deployment-section-head strong { font-size: 17px !important; }',
    '.deployment-section-head small { font-size: 11px !important; line-height: 1.5 !important; }',
    'grid-template-columns: 26px 54px minmax(0, 1fr) minmax(128px, .72fr) !important;',
    'min-height: 60px !important;',
    '.deployment-operator-row strong { font-size: 12px !important; }',
    '.deployment-tactics strong { font-size: 11px !important; }',
    '@media (max-width: 1023px)',
    'grid-template-columns: 24px 50px minmax(0, 1fr) !important;',
    'min-height: 62px !important;',
    '.deployment-operator-row strong { font-size: 14px !important; }',
    '.deployment-lane-row b { font-size: 11px !important; }',
)
missing = [item for item in required if item not in block]
if missing:
    raise SystemExit(f'Confirm Deployment declarations missing: {missing}')
if block.count(marker) != 1 or block.count('@media (max-width: 1023px)') != 1:
    raise SystemExit('Unexpected Confirm Deployment section shape')
if not block.rstrip().endswith('}'):
    raise SystemExit('Confirm Deployment block does not end cleanly')
game_path.write_text(game[:position].rstrip() + '\n', encoding='utf-8', newline='\n')
(root / 'css/deployment-readability.css').write_text(
    '/* Confirm Deployment typography and roster-layout ownership.\n'
    '   Extracted from the Build 12.133 tail in Build 12.185 without changing declarations. */\n\n'
    + block,
    encoding='utf-8', newline='\n',
)

index_path = root / 'index.html'
text = index_path.read_text(encoding='utf-8')
if text.count('>12.184</b>') != 2:
    raise SystemExit('Expected exactly two visible 12.184 build labels')
text = text.replace('Strikewatch 12.184: Economy Guide CSS Ownership', 'Strikewatch 12.185: Blood Visibility & Deployment CSS Ownership', 1)
text = text.replace('12.184.0-economy-guide-css-ownership', build_id)
text = text.replace('>12.184</b>', '>12.185</b>')
game_link = '<link rel="stylesheet" href="css/game.css?v=12.185.0-blood-visibility-deployment-css-ownership" />'
deployment_link = '<link rel="stylesheet" href="css/deployment-readability.css?v=12.185.0-blood-visibility-deployment-css-ownership" />'
if text.count(game_link) != 1 or deployment_link in text:
    raise SystemExit('Unexpected index stylesheet insertion state')
index_path.write_text(text.replace(game_link, game_link + '\n' + deployment_link, 1), encoding='utf-8', newline='\n')

build_path = root / 'build.py'
text = build_path.read_text(encoding='utf-8')
old_paths = 'CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "economy-guide.css",'
new_paths = 'CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "deployment-readability.css", ROOT / "css" / "economy-guide.css",'
if text.count(old_paths) != 1:
    raise SystemExit('Expected 12.184 CSS_PATHS prefix missing')
text = text.replace(old_paths, new_paths, 1)
old_metric = '        "owned_economy_guide_lines": texts["economy-guide.css"].count("\\n"),'
new_metric = '        "owned_deployment_readability_lines": texts["deployment-readability.css"].count("\\n"),\n        "owned_economy_guide_lines": texts["economy-guide.css"].count("\\n"),'
if text.count(old_metric) != 1:
    raise SystemExit('CSS debt metric insertion point missing')
text = text.replace(old_metric, new_metric, 1)
if text.count('"game_css_lines_max": 30785') != 1:
    raise SystemExit('12.184 game.css budget missing')
text = text.replace('"game_css_lines_max": 30785', '"game_css_lines_max": 30730', 1)
build_path.write_text(text, encoding='utf-8', newline='\n')

architecture = root / 'ARCHITECTURE.md'
text = architecture.read_text(encoding='utf-8')
old_owner = '| `css/game.css` | Legacy/base responsive and visual presentation; no new component-owned tail blocks |\n| `css/economy-guide.css` | After-action reward/economy typography and compact card reflow |'
new_owner = '| `css/game.css` | Legacy/base responsive and visual presentation; no new component-owned tail blocks |\n| `css/deployment-readability.css` | Confirm Deployment typography and desktop/compact roster layout |\n| `css/economy-guide.css` | After-action reward/economy typography and compact card reflow |'
if text.count(old_owner) != 1:
    raise SystemExit('Architecture owner insertion point missing')
text = text.replace(old_owner, new_owner, 1)
old_order = 'The current order is `game.css`, `economy-guide.css`, `inbox-scroll.css`, `operator-portrait.css`, `command-chrome.css`,'
new_order = 'The current order is `game.css`, `deployment-readability.css`, `economy-guide.css`, `inbox-scroll.css`, `operator-portrait.css`, `command-chrome.css`,'
if text.count(old_order) != 1:
    raise SystemExit('Architecture order insertion point missing')
architecture.write_text(text.replace(old_order, new_order, 1), encoding='utf-8', newline='\n')

contracts = root / 'CONTRACTS.md'
text = contracts.read_text(encoding='utf-8')
old_contract = '''- Bullet chips and blood splatters are bounded transient presentation. They use
  the shared wall raycaster, remain outside `drawStaticWorld`, clear on round
  reset and must never change damage, hitboxes, collision, navigation or line of
  sight. Blood appears only after real health damage and only on a nearby surface
  behind the struck operator.'''
new_contract = '''- Bullet chips and blood splatters are bounded transient presentation. They use
  the shared wall raycaster, remain outside `drawStaticWorld`, clear on round
  reset and must never change damage, hitboxes, collision, navigation or line of
  sight. Blood appears only after real health damage and only on a nearby surface
  behind the struck operator. Its irregular red core and downward drip must stay
  visually distinct from the smaller pale-rimmed bullet chip at compact portrait
  widths.'''
if text.count(old_contract) != 1:
    raise SystemExit('Rendering contract blood paragraph missing')
contracts.write_text(text.replace(old_contract, new_contract, 1), encoding='utf-8', newline='\n')

handoff = root / 'HANDOFF.md'
text = handoff.read_text(encoding='utf-8')
text = text.replace('Build: **12.184 — Economy Guide CSS Ownership**', 'Build: **12.185 — Blood Visibility & Deployment CSS Ownership**', 1)
text = text.replace('Build ID: `12.184.0-economy-guide-css-ownership`', 'Build ID: `12.185.0-blood-visibility-deployment-css-ownership`', 1)
text = text.replace('strikewatch-build-12.184.html', 'strikewatch-build-12.185.html', 1)
old_note = 'Build 12.184 continues SW-020 by moving the complete Build 12.133 after-action reward and economy-guide typography into `css/economy-guide.css`. Desktop type, the two-column compact grid, the single-column phone grid and all 9.5–19px authored floors remain unchanged. The sheet follows `game.css` before Inbox and every later component layer; the later `compact-readability.css` 12px metadata floor still wins below 1024px. See `AUDIT-12.184.md`.'
new_note = 'Build 12.185 makes nearby-wall blood read clearly on compact portrait screens without touching combat: the procedural core is larger and more saturated, every event includes a downward drip, placement still requires real health damage and a surface within 1.25m, and the pool remains capped at 18. The same release continues SW-020 by moving the complete Build 12.133 Confirm Deployment typography and roster-layout block into `css/deployment-readability.css` immediately after `game.css`. See `AUDIT-12.185.md`.\n\nBuild 12.184 continues SW-020 by moving the complete Build 12.133 after-action reward and economy-guide typography into `css/economy-guide.css`. Desktop type, the two-column compact grid, the single-column phone grid and all 9.5–19px authored floors remain unchanged. After the 12.185 extraction, the sheet follows `deployment-readability.css` before Inbox and every later component layer; the later `compact-readability.css` 12px metadata floor still wins below 1024px. See `AUDIT-12.184.md`.'
if text.count(old_note) != 1:
    raise SystemExit('12.184 HANDOFF note missing')
handoff.write_text(text.replace(old_note, new_note, 1), encoding='utf-8', newline='\n')

agents = root / 'AGENTS.md'
text = agents.read_text(encoding='utf-8')
anchor = '## Current release note\n\n'
note = 'Build 12.185 owns Confirm Deployment typography and roster layout in `css/deployment-readability.css`. Keep it immediately after `game.css`, before `economy-guide.css`, with the 60px desktop four-column roster, 62px compact three-column roster and existing type floors unchanged. Blood visibility remains transient renderer presentation: preserve positive-health-damage gating, the 1.25m shared-raycast placement, the 18-event cap, round clearing, the larger irregular core and at least one downward drip. Verify the before/after deployment computed-style probe, `bloodSplatterForTest()`, `impactDecalForTest()`, renderer draw-call bounds, `mobileInterfaceAuditForTest()` and `typographyConsistencyForTest()`. See `AUDIT-12.185.md`.\n\n'
if text.count(anchor) != 1:
    raise SystemExit('AGENTS current release anchor missing')
text = text.replace(anchor, anchor + note, 1)
old_agent = 'Build 12.184 owns after-action reward and economy-guide presentation in `css/economy-guide.css`. Keep it immediately after `game.css`, before `inbox-scroll.css`.'
new_agent = 'Build 12.184 owns after-action reward and economy-guide presentation in `css/economy-guide.css`. Keep it after `deployment-readability.css`, before `inbox-scroll.css`.'
if text.count(old_agent) != 1:
    raise SystemExit('12.184 AGENTS order note missing')
agents.write_text(text.replace(old_agent, new_agent, 1), encoding='utf-8', newline='\n')

replace_once('README.md', '# Strikewatch Source 12.184', '# Strikewatch Source 12.185')
replace_once('README.md', 'dist/strikewatch-build-12.184.html', 'dist/strikewatch-build-12.185.html')

project = root / 'PROJECT.md'
text = project.read_text(encoding='utf-8')
old_current = '''Build 12.184 continues the staged CSS ownership programme by moving the
after-action reward and economy-guide typography/reflow into
`css/economy-guide.css` without changing declarations or breakpoints. See
`HANDOFF.md` and `AUDIT-12.184.md`.'''
new_current = '''Build 12.185 makes nearby-wall blood more legible on portrait phones while
keeping it cosmetic and bounded, and continues staged CSS ownership by moving
Confirm Deployment typography/layout into `css/deployment-readability.css`
without changing its declarations. See `HANDOFF.md` and `AUDIT-12.185.md`.'''
if text.count(old_current) != 1:
    raise SystemExit('PROJECT current release paragraph missing')
project.write_text(text.replace(old_current, new_current, 1), encoding='utf-8', newline='\n')

replace_once('00-READ-FIRST-GPT.md', 'Current release: **Strikewatch Build 12.184 — Economy Guide CSS Ownership**.', 'Current release: **Strikewatch Build 12.185 — Blood Visibility & Deployment CSS Ownership**.')

changelog = root / 'CHANGELOG.md'
text = changelog.read_text(encoding='utf-8')
header = '# Release history router\n'
entry = '''\n## 12.185 — Blood Visibility & Deployment CSS Ownership\n\n- Enlarges and brightens nearby-wall blood clusters so they remain recognisable on compact portrait screens rather than resembling bullet chips.\n- Gives every blood event a distinct downward drip while preserving positive-health-damage gating, shared-raycast placement, the 1.25m surface limit, the 18-event cap and round clearing.\n- Moves the complete Build 12.133 Confirm Deployment typography and roster-layout block from `game.css` into `css/deployment-readability.css` without changing declarations or breakpoints.\n- Preserves the new stylesheet immediately after `game.css`, before economy guidance and all later presentation layers.\n- Tightens the `game.css` line budget and records the new owner in the CSS debt report and architecture map.\n- Evidence: `AUDIT-12.185.md`.\n\n'''
if not text.startswith(header):
    raise SystemExit('CHANGELOG header missing')
changelog.write_text(header + entry + text[len(header):], encoding='utf-8', newline='\n')

(root / 'AUDIT-12.185.md').write_text('''# Build 12.185 — Blood Visibility & Deployment CSS Ownership\n\n## Scope\n\nTwo bounded presentation changes ship together: improve the legibility of the recently added nearby-wall blood on compact portrait screens, and complete the next SW-020 ownership item at the end of `game.css`.\n\n## Blood visibility\n\nPlacement and simulation are unchanged. `30-bot-ai.js` still calls the cosmetic path only after positive health damage. `spawnBloodSplatter()` still starts just beyond the struck operator, reuses the shared `castRay` continuation direction, rejects surfaces beyond 1.25m and stores at most 18 transient events. Armour-only absorption still creates no blood, and round reset still clears the pool.\n\nThe procedural presentation is now deliberately distinct from Build 12.155 bullet chips. The minimum core is wider than the largest pale bullet-chip rim, the dark-red palette is more saturated, the mark is flatter against the wall, the cluster starts with three surrounding droplets and every event includes at least one narrow downward drip. A non-fatal body hit therefore uses five bounded draws rather than the previous three, while headshots and fatal hits remain within a seven-spot maximum. No texture, asset, shader pass, hitbox, damage, armour, AI, collision, navigation, line-of-sight or settlement change is introduced.\n\n## Confirm Deployment CSS ownership\n\nThe complete Build 12.133 `Confirm Deployment: readable at every width` section is removed from the end of `css/game.css` and placed in `css/deployment-readability.css`. Selectors, declarations and the 1023px breakpoint are unchanged. The new sheet loads immediately after `game.css`, before `economy-guide.css`, preserving the section's former cascade position.\n\nThe desktop roster remains a 26px index, 54px portrait, flexible identity and 128–250px role band with a 60px minimum row. Below 1024px it remains a 24px index, 50px portrait and flexible identity in three columns with a 62px minimum row. Deployment heading, map, operator, tactic and lane typography retain their authored desktop and compact values.\n\n## Stable contracts and documentation\n\n`CONTRACTS.md` now records the visual distinction between blood and bullet chips at compact portrait widths while retaining the existing transient-renderer boundaries. `ARCHITECTURE.md` records the new deployment owner and complete cascade order. `HANDOFF.md`, `AGENTS.md`, `README.md`, `PROJECT.md`, `00-READ-FIRST-GPT.md` and `CHANGELOG.md` carry current release/routing updates. Save schema remains 19 and diagnostics schema remains 1.\n\n## Debt guardrails\n\nThe CSS report records the deployment-readability layer separately. The `game.css` budget falls from 30,785 to 30,730 lines. Existing `!important` and media-query budgets do not increase.\n\n## Verification\n\n- `python3 -m py_compile build.py` passes.\n- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.\n- Every modular JavaScript file, the generated development bundle and standalone inline JavaScript parse.\n- The Confirm Deployment marker is absent from `game.css` and present exactly once in `deployment-readability.css`.\n- `index.html` stylesheet hrefs exactly match `CSS_PATHS`; standalone output retains no external development stylesheet.\n- Headless Chromium captures the complete deployment computed-style snapshot before extraction and after extraction at 390px, 833px and 1440px; every sampled value is identical.\n- The compact roster remains three columns with a 62px minimum row; the desktop roster remains four columns with a 60px minimum row.\n- `bloodSplatterForTest()` verifies zero health damage is ignored, the mark rests on shared-raycast solid geometry within 1.25m, the core exceeds the bullet-chip rim by at least 1.5×, the cluster contains at least five spots and a downward drip is present.\n- Repeated blood tests settle at the 18-event cap with 90 spots for the non-fatal body-hit fixture; renderer draw-call growth stays within that bounded spot count.\n- Existing `impactDecalForTest()` remains green.\n- CSS debt remains within budget.\n- Root `cod.html` is byte-identical to the standalone.\n\nNo manual live play session is claimed. Browser evidence is the automated before/after deployment comparison plus the compact portrait renderer probe, deterministic builds, parse gates, retained hooks and artifact identity.\n''', encoding='utf-8', newline='\n')
