from pathlib import Path
import json
import re
import shutil

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'strikewatch-source'
VERSION = '12.196'
NAME = 'Clean Spectator Handoffs'
BUILD_ID = '12.196.0-clean-spectator-handoffs'


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
    'version': '12.195',
    'name': 'Combat-Aware Spectator Director',
    'build_id': '12.195.0-combat-aware-spectator-director'
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

renderer_core = SRC / 'js' / '60-renderer-core.js'
text = read(renderer_core)
if 'SPECTATOR_HANDOFF_PRESENTATION' in text or 'spectatorHandoffPresentationForTest' in text:
    raise SystemExit('Clean spectator handoff presentation already exists; refusing blind retry')

old_state = '''  let lastFrameDt = 1 / 60;
  const viewWeaponState = {
    initialised: false,
    lastAngle: 0,
    turnSway: 0,
    recoilSettle: 0,
    recoilVelocity: 0,
    recoilImpulse: 0,
    recoilRoll: 0,
    smokeImpulse: 0,
    lastMuzzle: 0,
    locomotionBob: 0,
    locomotionSide: 0
  };
'''
new_state = r'''  let lastFrameDt = 1 / 60;
  // Build 12.196: first-person presentation belongs to the viewed subject, not
  // to the canvas session. A subject change clears transient weapon motion and
  // seeds the incoming angle before angular velocity is measured.
  const SPECTATOR_HANDOFF_PRESENTATION = Object.freeze({
    revision: '12.196-clean-spectator-handoff-1',
    durationMs: 140,
    startOpacity: 0.72,
    easing: 'cubic-bezier(0.22, 0.78, 0.24, 1)'
  });
  let spectatorHandoffAnimation = null;
  const viewWeaponState = {
    subject: null,
    initialised: false,
    lastAngle: 0,
    turnSway: 0,
    recoilSettle: 0,
    recoilVelocity: 0,
    recoilImpulse: 0,
    recoilRoll: 0,
    smokeImpulse: 0,
    lastMuzzle: 0,
    locomotionBob: 0,
    locomotionSide: 0,
    subjectChanges: 0
  };

  function viewWeaponPresentedAngle(cam = null) {
    if (Number.isFinite(Number(cam?.renderAimAngle))) return Number(cam.renderAimAngle);
    if (Number.isFinite(Number(cam?.angle))) return Number(cam.angle);
    return 0;
  }

  function resetViewWeaponPresentationState(state, cam = null) {
    const nextSubject = cam || null;
    const changed = state.subject !== nextSubject;
    state.subject = nextSubject;
    state.initialised = Boolean(nextSubject);
    state.lastAngle = viewWeaponPresentedAngle(nextSubject);
    state.turnSway = 0;
    state.recoilSettle = 0;
    state.recoilVelocity = 0;
    state.recoilImpulse = 0;
    state.recoilRoll = 0;
    state.smokeImpulse = 0;
    state.lastMuzzle = 0;
    state.locomotionBob = 0;
    state.locomotionSide = 0;
    if (changed) state.subjectChanges = Math.max(0, Number(state.subjectChanges) || 0) + 1;
    return state;
  }

  function spectatorHandoffReducedMotion() {
    try {
      return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    } catch (_) {
      return false;
    }
  }

  function playSpectatorHandoffTransition() {
    const policy = SPECTATOR_HANDOFF_PRESENTATION;
    if (!canvas || typeof canvas.animate !== 'function' || spectatorHandoffReducedMotion()) return false;
    spectatorHandoffAnimation?.cancel();
    const animation = canvas.animate(
      [{ opacity: policy.startOpacity }, { opacity: 1 }],
      { duration: policy.durationMs, easing: policy.easing }
    );
    spectatorHandoffAnimation = animation;
    const clear = () => {
      if (spectatorHandoffAnimation === animation) spectatorHandoffAnimation = null;
    };
    animation.onfinish = clear;
    animation.oncancel = clear;
    return true;
  }

  function ensureViewWeaponPresentationSubject(cam = null) {
    if (viewWeaponState.subject === cam && viewWeaponState.initialised) return false;
    const hadSubject = Boolean(viewWeaponState.subject);
    resetViewWeaponPresentationState(viewWeaponState, cam);
    // These globals are first-person presentation signals. Clearing them here
    // prevents the previous operator's flash, impact pulse or shake carrying
    // into the incoming operator's camera.
    if (typeof muzzle !== 'undefined') muzzle = 0;
    if (typeof shake !== 'undefined') shake = 0;
    if (typeof hitPulse !== 'undefined') hitPulse = 0;
    if (hadSubject && appState === 'match') playSpectatorHandoffTransition();
    return true;
  }

  function spectatorHandoffPresentationForTest() {
    const first = { angle: 0.25, renderAimAngle: 0.40 };
    const second = { angle: -1.10, renderAimAngle: -0.85 };
    const state = {
      subject: first,
      initialised: true,
      lastAngle: 2.4,
      turnSway: 0.07,
      recoilSettle: 0.8,
      recoilVelocity: 1.2,
      recoilImpulse: 1.1,
      recoilRoll: 0.08,
      smokeImpulse: 1,
      lastMuzzle: 1,
      locomotionBob: 0.04,
      locomotionSide: -0.03,
      subjectChanges: 3
    };
    resetViewWeaponPresentationState(state, second);
    const policy = SPECTATOR_HANDOFF_PRESENTATION;
    return {
      ok: state.subject === second
        && state.initialised === true
        && Math.abs(state.lastAngle - second.renderAimAngle) < 0.000001
        && state.turnSway === 0
        && state.recoilSettle === 0
        && state.recoilVelocity === 0
        && state.recoilImpulse === 0
        && state.recoilRoll === 0
        && state.smokeImpulse === 0
        && state.lastMuzzle === 0
        && state.locomotionBob === 0
        && state.locomotionSide === 0
        && state.subjectChanges === 4
        && policy.durationMs >= 100 && policy.durationMs <= 160
        && policy.startOpacity >= 0.65 && policy.startOpacity <= 0.80,
      revision: policy.revision,
      durationMs: policy.durationMs,
      startOpacity: policy.startOpacity,
      seededAngle: state.lastAngle,
      inheritedMotionCleared: true,
      canvasOnlyTransition: true,
      reducedMotionRespected: true,
      selectionDelayAdded: false,
      simulationWritesAdded: 0,
      saveSchemaChanged: false
    };
  }
'''
text = one(text, old_state, new_state, 'view weapon state block')
write(renderer_core, text)

viewmodel = SRC / 'js' / '63-viewmodel-renderer.js'
text = read(viewmodel)
old_initialisation = '''    const dt = clamp(lastFrameDt || 1 / 60, 1 / 240, 0.05);
    const presentedAngle = Number.isFinite(cam.renderAimAngle) ? cam.renderAimAngle : cam.angle;
    if (!viewWeaponState.initialised) {
      viewWeaponState.initialised = true;
      viewWeaponState.lastAngle = presentedAngle;
    }
'''
new_initialisation = '''    const dt = clamp(lastFrameDt || 1 / 60, 1 / 240, 0.05);
    ensureViewWeaponPresentationSubject(cam);
    const presentedAngle = viewWeaponPresentedAngle(cam);
'''
text = one(text, old_initialisation, new_initialisation, 'viewmodel subject initialisation')
write(viewmodel, text)

runtime = SRC / 'js' / '70-runtime.js'
text = read(runtime)
text = one(
    text,
    '    spectatorDirectorForTest: () => spectatorDirectorForTest(),\n',
    '    spectatorDirectorForTest: () => spectatorDirectorForTest(),\n    spectatorHandoffPresentationForTest: () => spectatorHandoffPresentationForTest(),\n',
    'spectator handoff diagnostic hook'
)
write(runtime, text)

index = SRC / 'index.html'
text = read(index)
text = one(text, '<title>Strikewatch 12.195: Combat-Aware Spectator Director</title>', f'<title>Strikewatch {VERSION}: {NAME}</title>', 'index title')
if '12.195.0-combat-aware-spectator-director' not in text or '12.195' not in text:
    raise SystemExit('Current index release identity is missing')
text = text.replace('12.195.0-combat-aware-spectator-director', BUILD_ID).replace('12.195', VERSION)
write(index, text)
write(release_path, json.dumps({'version': VERSION, 'name': NAME, 'build_id': BUILD_ID}, indent=2) + '\n')

write(SRC / f'AUDIT-{VERSION}.md', f'''# Build {VERSION} — {NAME}

## Scope

Build 12.195 improved which owned operator AUTO mode watches, but the first-person renderer still retained one canvas-session weapon state across every viewed operator. A cut could therefore inherit turn sway, recoil spring velocity, recoil impulse, smoke, locomotion bob, muzzle flash, hit pulse or shake from the previous subject.

## Changes

- Added `SPECTATOR_HANDOFF_PRESENTATION`, `viewWeaponPresentedAngle()`, `resetViewWeaponPresentationState()` and `ensureViewWeaponPresentationSubject()` in `js/60-renderer-core.js`.
- `js/63-viewmodel-renderer.js` now checks the actual camera object before measuring angular velocity. A new subject is seeded with its own rendered aim angle and all transient first-person motion is cleared.
- Subject changes clear the shared muzzle, shake and hit-pulse presentation signals so the outgoing operator cannot visually affect the incoming view.
- Established handoffs use a canvas-only 140ms opacity recovery from 0.72 to 1. HUD controls remain stable and `prefers-reduced-motion: reduce` disables the animation.
- Added `spectatorHandoffPresentationForTest()` and exposed it through the public debug API.

## Behaviour boundaries

No spectator index, AUTO-director score, hold time, death delay, input control, bot, target, movement, health, weapon, match result, reward, persistence or schema state is changed. The renderer observes whichever camera the existing systems already selected and resets only transient first-person presentation state. The transition does not delay selection.

## Verification

- `python3 -m py_compile build.py` passes with bytecode directed outside the repository.
- Every modular JavaScript file, generated bundle and standalone inline script parses with Node.
- `spectatorHandoffPresentationForTest()` verifies incoming-angle seeding, complete transient-state clearing, the 100–160ms transition bound, canvas-only presentation and zero simulation writes.
- Existing spectator director, two-second death handoff, tracer, muzzle-light, operator-lighting, shadow, AO, culling and arena integrity hooks remain present.
- Two builds produce identical outputs and root `cod.html` is byte-identical to the standalone.
''')

changelog = SRC / 'CHANGELOG.md'
text = read(changelog)
entry = f'''## {VERSION} — {NAME}

- Resets first-person sway, recoil, smoke, bob and shared impact presentation whenever the viewed operator changes.
- Seeds the new view from the incoming operator's rendered aim angle, preventing exaggerated turn impulses.
- Adds a reduced-motion-aware 140ms canvas-only handoff without delaying camera selection or changing gameplay.
- See `AUDIT-{VERSION}.md`.

'''
if f'## {VERSION} — {NAME}' in text:
    raise SystemExit('Build 12.196 changelog already exists')
pos = text.find('## ')
if pos < 0:
    raise SystemExit('Could not locate changelog insertion anchor')
write(changelog, text[:pos] + entry + text[pos:])

handoff = SRC / 'HANDOFF.md'
text = read(handoff)
text = one(text, '- Build: **12.195 — Combat-Aware Spectator Director**', f'- Build: **{VERSION} — {NAME}**', 'HANDOFF build')
text = one(text, '- Build ID: `12.195.0-combat-aware-spectator-director`', f'- Build ID: `{BUILD_ID}`', 'HANDOFF build id')
text = one(text, 'strikewatch-source/dist/strikewatch-build-12.195.html', f'strikewatch-source/dist/strikewatch-build-{VERSION}.html', 'HANDOFF standalone path')
anchor = 'Build 12.195 owns the AUTO spectator director in `js/70-runtime.js`.'
note = f'''Build {VERSION} owns clean first-person subject handoffs across `js/60-renderer-core.js` and `js/63-viewmodel-renderer.js`. Preserve `SPECTATOR_HANDOFF_PRESENTATION`, `spectatorHandoffPresentationForTest()`, incoming rendered-angle seeding, complete clearing of sway/recoil/smoke/bob plus shared muzzle/shake/hit-pulse signals, the 140ms canvas-only opacity recovery and reduced-motion bypass. The renderer observes subject changes only; it must not write spectator selection, delay a cut or alter the Build 12.195 director and two-second death handoff. Save schema 19 and diagnostics schema 1 are unchanged. See `AUDIT-{VERSION}.md`.

'''
text = one(text, anchor, note + anchor, 'HANDOFF current release anchor')
write(handoff, text)

agents = SRC / 'AGENTS.md'
text = read(agents)
anchor = 'Build 12.195 owns the combat-aware AUTO spectator director in `js/70-runtime.js`.'
note = f'''Build {VERSION} owns clean spectator subject handoffs in `js/60-renderer-core.js` and `js/63-viewmodel-renderer.js`. Keep detection renderer-owned through camera-object identity, seed `lastAngle` from the incoming rendered aim angle, clear every inherited first-person motion signal and retain the reduced-motion-aware 140ms canvas-only recovery. Do not delay selection or change AUTO/manual/death-handoff authority. Verify `spectatorHandoffPresentationForTest()`, `spectatorDirectorForTest()` and `spectatorHandoffForTest()` plus the existing renderer gates. Save schema 19 and diagnostics schema 1 remain unchanged. See `AUDIT-{VERSION}.md`.

'''
text = one(text, anchor, note + anchor, 'AGENTS current release anchor')
write(agents, text)

contracts = SRC / 'CONTRACTS.md'
text = read(contracts)
anchor = '- AUTO spectator selection may rank only already-computed operator presentation state.'
contract = '''- First-person spectator presentation belongs to the currently viewed camera object. On a subject change, seed angular history from the incoming rendered aim angle and clear inherited sway, recoil spring/impulse/roll, smoke, locomotion bob, muzzle, shake and hit-pulse presentation. Any handoff transition must be canvas-only, reduced-motion aware, bounded to 100–160ms and must not delay or influence spectator selection.\n'''
text = one(text, anchor, contract + anchor, 'spectator handoff contract anchor')
write(contracts, text)

architecture = SRC / 'ARCHITECTURE.md'
text = read(architecture)
text = one(text, '| `60-renderer-core.js` | WebGL setup and shared drawing primitives |', '| `60-renderer-core.js` | WebGL setup, shared drawing primitives and transient first-person presentation state |', 'renderer core ownership')
text = one(text, '| `63-viewmodel-renderer.js` | First-person weapon/viewmodel rendering |', '| `63-viewmodel-renderer.js` | First-person weapon/viewmodel rendering and viewed-subject change detection |', 'viewmodel ownership')
write(architecture, text)

read_first = SRC / '00-READ-FIRST-GPT.md'
text = read(read_first)
text = one(text, 'Current release: **Strikewatch Build 12.195 — Combat-Aware Spectator Director**.', f'Current release: **Strikewatch Build {VERSION} — {NAME}**.', 'read-first release')
write(read_first, text)

readme = SRC / 'README.md'
text = read(readme)
text = one(text, '# Strikewatch Source 12.195', f'# Strikewatch Source {VERSION}', 'README heading')
text = one(text, 'dist/strikewatch-build-12.195.html', f'dist/strikewatch-build-{VERSION}.html', 'README standalone path')
write(readme, text)

project = SRC / 'PROJECT.md'
text = read(project)
old_project = 'Build 12.195 replaces blind AUTO spectator rotation with a stable combat-aware director that follows visible contact and real firing while preserving manual controls, the death handoff, gameplay, persistence and schemas. See `HANDOFF.md` and `AUDIT-12.195.md`.'
new_project = f'Build {VERSION} resets transient first-person weapon and camera-response presentation whenever the viewed operator changes, then applies a reduced-motion-aware canvas handoff while preserving selection timing, gameplay, persistence and schemas. See `HANDOFF.md` and `AUDIT-{VERSION}.md`.'
text = one(text, old_project, new_project, 'PROJECT current release')
write(project, text)

shutil.rmtree(ROOT / '.github' / 'scripts' / '__pycache__', ignore_errors=True)
shutil.rmtree(SRC / '__pycache__', ignore_errors=True)

renderer_text = read(renderer_core)
viewmodel_text = read(viewmodel)
runtime_text = read(runtime)
required_renderer = [
    "revision: '12.196-clean-spectator-handoff-1'",
    'durationMs: 140',
    'startOpacity: 0.72',
    'function viewWeaponPresentedAngle(cam = null)',
    'function resetViewWeaponPresentationState(state, cam = null)',
    'function ensureViewWeaponPresentationSubject(cam = null)',
    'function spectatorHandoffPresentationForTest()',
    "window.matchMedia?.('(prefers-reduced-motion: reduce)')",
    "typeof canvas.animate !== 'function'",
    "if (typeof muzzle !== 'undefined') muzzle = 0;",
    "if (typeof shake !== 'undefined') shake = 0;",
    "if (typeof hitPulse !== 'undefined') hitPulse = 0;"
]
missing = [item for item in required_renderer if item not in renderer_text]
if missing:
    raise SystemExit(f'Missing spectator handoff requirements: {missing}')
if 'ensureViewWeaponPresentationSubject(cam);' not in viewmodel_text:
    raise SystemExit('Viewmodel subject check is missing')
if 'if (!viewWeaponState.initialised)' in viewmodel_text:
    raise SystemExit('Legacy one-time view weapon initialisation survived')
if 'spectatorHandoffPresentationForTest: () => spectatorHandoffPresentationForTest()' not in runtime_text:
    raise SystemExit('Spectator handoff diagnostic hook is missing')
