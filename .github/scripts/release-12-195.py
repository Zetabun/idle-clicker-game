from pathlib import Path
import json
import re
import shutil

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'strikewatch-source'
VERSION = '12.195'
NAME = 'Combat-Aware Spectator Director'
BUILD_ID = '12.195.0-combat-aware-spectator-director'


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
    'version': '12.194',
    'name': 'Muzzle-Anchored Tracers',
    'build_id': '12.194.0-muzzle-anchored-tracers'
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

runtime = SRC / 'js' / '70-runtime.js'
text = read(runtime)
if 'SPECTATOR_CAMERA_DIRECTOR' in text or 'spectatorDirectorForTest' in text:
    raise SystemExit('Combat-aware spectator director already exists; refusing blind retry')

director = r'''  // Build 12.195: AUTO spectating now ranks already-computed presentation
  // state instead of rotating blindly through the Active Five. This director
  // never asks AI for new perception work and never writes simulation state.
  const SPECTATOR_CAMERA_DIRECTOR = Object.freeze({
    revision: '12.195-combat-aware-director-1',
    sampleInterval: 0.22,
    urgentMinimumHold: 1.25,
    minimumHold: 3.2,
    maximumHold: 8.5,
    switchMargin: 18,
    urgentMargin: 26,
    maximumHoldTolerance: 4,
    currentViewBias: 7
  });
  const spectatorDirectorState = {
    sampleTimer: 0,
    holdTime: 0,
    lastIndex: -1,
    switches: 0,
    lastReason: 'initial',
    lastScore: 0
  };

  function resetSpectatorDirectorState(index = spectatorIndex, reason = 'reset') {
    spectatorDirectorState.sampleTimer = SPECTATOR_CAMERA_DIRECTOR.sampleInterval;
    spectatorDirectorState.holdTime = 0;
    spectatorDirectorState.lastIndex = Number.isFinite(Number(index)) ? Number(index) : -1;
    spectatorDirectorState.lastReason = String(reason || 'reset');
    spectatorDirectorState.lastScore = 0;
    autoTimer = SPECTATOR_CAMERA_DIRECTOR.sampleInterval;
    return { ...spectatorDirectorState };
  }

  function spectatorDirectorInterest(bot, current = false) {
    if (!bot || !bot.alive || bot.team !== CAREER_OWNED_TEAM) {
      return { score: -Infinity, eligible: false, visibleTarget: false, firing: false, underFire: false, reloading: false, targetDistance: Infinity };
    }
    const visibleTarget = Boolean(bot.target?.alive);
    const sightCandidate = !visibleTarget && Boolean(bot.sightCandidate?.alive);
    const target = visibleTarget ? bot.target : (sightCandidate ? bot.sightCandidate : null);
    const targetDistance = target
      ? Math.hypot((Number(bot.x) || 0) - (Number(target.x) || 0), (Number(bot.y) || 0) - (Number(target.y) || 0))
      : Infinity;
    const firing = (Number(bot.flash) || 0) > 0.05 || (Number(bot.recoil) || 0) > 0.12;
    const underFire = (Number(bot.hurt) || 0) > 0.08 || (Number(bot.hitReactionStrength) || 0) > 0.08 || (Number(bot.flinchTimer) || 0) > 0;
    const reloading = (Number(bot.reloadTimer) || 0) > 0;
    const swapping = (Number(bot.weaponSwapTimer) || 0) > 0;
    const movement = clamp(Number(bot.motion) || Number(bot.visualMoveVelocity) || Number(bot.moveVelocity) || 0, 0, 1);
    const maximumHealth = Math.max(1, Number(bot.maxHealth) || 100);
    const healthRatio = clamp((Number(bot.health) || 0) / maximumHealth, 0, 1);
    const weaponRange = Math.max(1, Number(bot.weapon?.range) || 10);
    let score = 8;
    if (visibleTarget) score += 52;
    else if (sightCandidate) score += 25;
    if (Number.isFinite(targetDistance)) score += clamp(16 - targetDistance, 0, 16);
    if (visibleTarget && targetDistance <= weaponRange + 0.5) score += 8;
    if (firing) score += 34;
    if (underFire) score += 22;
    if (bot.lastSeen?.alive && !visibleTarget) score += 10;
    if (bot.heardSound && !visibleTarget && !sightCandidate) score += 5;
    score += movement * 4;
    if (healthRatio <= 0.35 && (visibleTarget || underFire)) score += 10;
    if (reloading) score -= visibleTarget ? 12 : 5;
    if (swapping) score -= 7;
    if (current) score += SPECTATOR_CAMERA_DIRECTOR.currentViewBias;
    return {
      score,
      eligible: true,
      visibleTarget,
      sightCandidate,
      firing,
      underFire,
      reloading,
      swapping,
      targetDistance,
      healthRatio,
      movement
    };
  }

  function spectatorDirectorDecision(entries, currentIndex, holdTime) {
    const candidates = Array.isArray(entries) ? entries.filter(entry => entry?.interest?.eligible) : [];
    const current = candidates.find(entry => entry.index === currentIndex) || null;
    const best = candidates.slice().sort((a, b) => b.interest.score - a.interest.score || a.index - b.index)[0] || null;
    const currentScore = current?.interest?.score ?? -Infinity;
    if (!best || best.index === currentIndex) return { switch: false, reason: 'current-best', best, current, currentScore };
    const held = Math.max(0, Number(holdTime) || 0);
    const urgent = best.interest.firing
      && !current?.interest?.firing
      && !current?.interest?.visibleTarget
      && best.interest.score >= currentScore + SPECTATOR_CAMERA_DIRECTOR.urgentMargin;
    if (urgent && held >= SPECTATOR_CAMERA_DIRECTOR.urgentMinimumHold) {
      return { switch: true, reason: 'live-fire', best, current, currentScore };
    }
    if (held < SPECTATOR_CAMERA_DIRECTOR.minimumHold) {
      return { switch: false, reason: 'minimum-hold', best, current, currentScore };
    }
    if (best.interest.score >= currentScore + SPECTATOR_CAMERA_DIRECTOR.switchMargin) {
      return { switch: true, reason: 'higher-interest', best, current, currentScore };
    }
    if (held >= SPECTATOR_CAMERA_DIRECTOR.maximumHold
        && best.interest.score >= currentScore - SPECTATOR_CAMERA_DIRECTOR.maximumHoldTolerance) {
      return { switch: true, reason: 'rotation-window', best, current, currentScore };
    }
    return { switch: false, reason: 'hold-current', best, current, currentScore };
  }

  function updateAutoSpectatorDirector(dt) {
    if (!autoSpectate || roundEnding || matchEnding) return false;
    const current = bots[spectatorIndex];
    if (!current || !current.alive || current.team !== CAREER_OWNED_TEAM) return false;
    if (spectatorDirectorState.lastIndex !== spectatorIndex) resetSpectatorDirectorState(spectatorIndex, 'view-changed');
    spectatorDirectorState.holdTime += Math.max(0, Number(dt) || 0);
    spectatorDirectorState.sampleTimer -= Math.max(0, Number(dt) || 0);
    if (spectatorDirectorState.sampleTimer > 0) return false;
    spectatorDirectorState.sampleTimer = SPECTATOR_CAMERA_DIRECTOR.sampleInterval;
    const entries = bots
      .map((bot, index) => ({ bot, index }))
      .filter(entry => entry.bot.team === CAREER_OWNED_TEAM && entry.bot.alive)
      .map(entry => ({ ...entry, interest: spectatorDirectorInterest(entry.bot, entry.index === spectatorIndex) }));
    const decision = spectatorDirectorDecision(entries, spectatorIndex, spectatorDirectorState.holdTime);
    spectatorDirectorState.lastScore = decision.currentScore;
    spectatorDirectorState.lastReason = decision.reason;
    if (!decision.switch || !decision.best) return false;
    spectatorIndex = decision.best.index;
    spectatorDirectorState.lastIndex = spectatorIndex;
    spectatorDirectorState.holdTime = 0;
    spectatorDirectorState.switches++;
    spectatorDirectorState.lastScore = decision.best.interest.score;
    autoTimer = SPECTATOR_CAMERA_DIRECTOR.sampleInterval;
    updateHud();
    return true;
  }

  function spectatorDirectorForTest() {
    const idle = { alive: true, team: CAREER_OWNED_TEAM, x: 0, y: 0, health: 100, maxHealth: 100, motion: 0, weapon: { range: 10 } };
    const aiming = { ...idle, x: 1, target: { alive: true, x: 8, y: 0 } };
    const firing = { ...idle, x: 2, flash: 1, recoil: 0.6, target: { alive: true, x: 6, y: 0 } };
    const reloading = { ...aiming, x: 3, reloadTimer: 0.8 };
    const entries = [idle, aiming, firing, reloading].map((bot, index) => ({ bot, index, interest: spectatorDirectorInterest(bot, index === 0) }));
    const early = spectatorDirectorDecision(entries, 0, 0.5);
    const urgent = spectatorDirectorDecision(entries, 0, SPECTATOR_CAMERA_DIRECTOR.urgentMinimumHold + 0.01);
    const settled = spectatorDirectorDecision(entries, 0, SPECTATOR_CAMERA_DIRECTOR.minimumHold + 0.01);
    return {
      ok: SPECTATOR_CAMERA_DIRECTOR.sampleInterval >= 0.18
        && SPECTATOR_CAMERA_DIRECTOR.minimumHold >= 3
        && SPECTATOR_CAMERA_DIRECTOR.maximumHold <= 9
        && entries[2].interest.score > entries[1].interest.score
        && entries[1].interest.score > entries[0].interest.score
        && entries[2].interest.score > entries[3].interest.score
        && early.switch === false
        && urgent.switch === true && urgent.best.index === 2
        && settled.switch === true && settled.best.index === 2,
      revision: SPECTATOR_CAMERA_DIRECTOR.revision,
      scores: entries.map(entry => Number(entry.interest.score.toFixed(2))),
      earlyReason: early.reason,
      urgentReason: urgent.reason,
      settledReason: settled.reason,
      manualControlsRemainAuthoritative: true,
      deathHandoffSeconds: 2,
      aiPerceptionCallsAdded: 0,
      simulationWritesAdded: 0,
      saveSchemaChanged: false
    };
  }

'''
text = one(text, '  function updateSpectatorDeathHandoff(dt) {', director + '  function updateSpectatorDeathHandoff(dt) {', 'spectator death handoff anchor')

old_auto = '''    updateSpectatorDeathHandoff(dt);
    if (autoSpectate && !roundEnding && !matchEnding) {
      const current = bots[spectatorIndex];
      if (current?.alive && current.team === CAREER_OWNED_TEAM) {
        autoTimer -= dt;
        if (autoTimer <= 0) {
          selectLiving(1);
          autoTimer = 4 + Math.random() * 3;
        }
      }
    }
'''
new_auto = '''    updateSpectatorDeathHandoff(dt);
    updateAutoSpectatorDirector(dt);
'''
text = one(text, old_auto, new_auto, 'round-robin auto spectate block')

old_controls = '''  function chooseSpectator(direction) {
    if (appState !== 'match') return;
    ensureAudio();
    autoSpectate = false;
    autoBtn.textContent = 'AUTO: OFF';
    if (portraitAutoBtn) portraitAutoBtn.textContent = 'AUTO: OFF';
    selectLiving(direction);
  }

  function toggleAutoSpectate() {
    if (appState !== 'match') return;
    ensureAudio();
    autoSpectate = !autoSpectate;
    autoBtn.textContent = `AUTO: ${autoSpectate ? 'ON' : 'OFF'}`;
    if (portraitAutoBtn) portraitAutoBtn.textContent = `AUTO: ${autoSpectate ? 'ON' : 'OFF'}`;
    autoTimer = 1;
  }
'''
new_controls = '''  function chooseSpectator(direction) {
    if (appState !== 'match') return;
    ensureAudio();
    autoSpectate = false;
    autoBtn.textContent = 'AUTO: OFF';
    if (portraitAutoBtn) portraitAutoBtn.textContent = 'AUTO: OFF';
    selectLiving(direction);
    resetSpectatorDirectorState(spectatorIndex, 'manual-selection');
  }

  function toggleAutoSpectate() {
    if (appState !== 'match') return;
    ensureAudio();
    autoSpectate = !autoSpectate;
    autoBtn.textContent = `AUTO: ${autoSpectate ? 'ON' : 'OFF'}`;
    if (portraitAutoBtn) portraitAutoBtn.textContent = `AUTO: ${autoSpectate ? 'ON' : 'OFF'}`;
    resetSpectatorDirectorState(spectatorIndex, autoSpectate ? 'auto-enabled' : 'auto-disabled');
  }
'''
text = one(text, old_controls, new_controls, 'spectator controls')

hook_anchor = '''    spectatorHandoffForTest: (deadIndex = spectatorIndex, seconds = 2.05) => {
'''
text = one(text, hook_anchor, '''    spectatorDirectorForTest: () => spectatorDirectorForTest(),
''' + hook_anchor, 'spectator director diagnostic hook')
write(runtime, text)

index = SRC / 'index.html'
text = read(index)
text = one(text, '<title>Strikewatch 12.194: Muzzle-Anchored Tracers</title>', f'<title>Strikewatch {VERSION}: {NAME}</title>', 'index title')
if '12.194.0-muzzle-anchored-tracers' not in text or '12.194' not in text:
    raise SystemExit('Current index release identity is missing')
text = text.replace('12.194.0-muzzle-anchored-tracers', BUILD_ID).replace('12.194', VERSION)
write(index, text)
write(release_path, json.dumps({'version': VERSION, 'name': NAME, 'build_id': BUILD_ID}, indent=2) + '\n')

write(SRC / f'AUDIT-{VERSION}.md', f'''# Build {VERSION} — {NAME}

## Scope

AUTO spectating previously rotated through living owned operators every four to seven seconds, even when the current operator was in contact and the next operator was idle. This release replaces that blind timer with a bounded presentation-only director.

## Changes

- Added `SPECTATOR_CAMERA_DIRECTOR`, `spectatorDirectorInterest()` and `spectatorDirectorDecision()` in `js/70-runtime.js`.
- AUTO mode now ranks only state the simulation already computed: visible target, sight candidate, real-shot flash/recoil, incoming-hit presentation, distance, movement, health, reload and weapon-swap state.
- The current view receives a stability bias, ordinary switches require a 3.2-second minimum hold and 18-point margin, live fire can cut in after 1.25 seconds, and an 8.5-second maximum hold permits a near-equal rotation.
- Manual previous/next still disables AUTO immediately. The existing two-second death handoff remains authoritative and unchanged.
- Added `spectatorDirectorForTest()` to verify ranking, hold boundaries and the live-fire exception.

## Behaviour boundaries

The director does not call perception, line-of-sight, pathfinding or combat routines. It does not write bot targets, tactics, movement, health, weapons, match rules, rewards, saves or schemas. It changes only which already-living owned operator supplies the first-person spectator presentation while AUTO is enabled.

## Verification

- `python3 -m py_compile build.py` passes with bytecode directed outside the repository.
- Every modular JavaScript file, generated bundle and standalone inline script parses with Node.
- Source checks confirm the old random 4–7 second round-robin block is absent, the 2-second death handoff is intact and manual controls reset the director.
- `spectatorDirectorForTest()` plus the existing spectator handoff and renderer/combat diagnostics remain present.
- Two builds produce identical outputs and root `cod.html` is byte-identical to the standalone.
''')

changelog = SRC / 'CHANGELOG.md'
text = read(changelog)
entry = f'''## {VERSION} — {NAME}

- Replaces blind 4–7 second AUTO camera rotation with a combat-aware, stability-biased spectator director.
- Prioritises visible contact, real firing and incoming pressure using already-computed bot presentation state only.
- Preserves manual selection, the two-second death handoff, gameplay authority, saves and schemas.
- See `AUDIT-{VERSION}.md`.

'''
if f'## {VERSION} — {NAME}' in text:
    raise SystemExit('Build 12.195 changelog already exists')
pos = text.find('## ')
if pos < 0:
    raise SystemExit('Could not locate changelog insertion anchor')
write(changelog, text[:pos] + entry + text[pos:])

handoff = SRC / 'HANDOFF.md'
text = read(handoff)
text = one(text, '- Build: **12.194 — Muzzle-Anchored Tracers**', f'- Build: **{VERSION} — {NAME}**', 'HANDOFF build')
text = one(text, '- Build ID: `12.194.0-muzzle-anchored-tracers`', f'- Build ID: `{BUILD_ID}`', 'HANDOFF build id')
text = one(text, 'strikewatch-source/dist/strikewatch-build-12.194.html', f'strikewatch-source/dist/strikewatch-build-{VERSION}.html', 'HANDOFF standalone path')
publish_anchor = '5. Never claim deployment until the generated release commit is visible on `main` and `RELEASE.json` plus `cod.html` confirm the new build.\n'
publish_note = publish_anchor + '6. A release commit created by the workflow must be followed by a distinct user-authored push so branch-based GitHub Pages rebuilds; verify the public `cod.html` build identity before calling it live.\n'
text = one(text, publish_anchor, publish_note, 'HANDOFF Pages publishing safeguard')
anchor = 'Build 12.194 owns muzzle-anchored third-person tracers across `js/61-world-renderer.js` and `js/62-character-renderer.js`.'
note = f'''Build {VERSION} owns the AUTO spectator director in `js/70-runtime.js`. Preserve `SPECTATOR_CAMERA_DIRECTOR`, `spectatorDirectorForTest()`, the 3.2-second ordinary hold, 1.25-second live-fire exception, 8.5-second maximum hold and current-view stability bias. Rank only already-computed bot presentation state; never call perception, LOS, navigation or combat from the director. Manual previous/next must disable AUTO and the existing two-second death handoff must remain unchanged. Save schema 19 and diagnostics schema 1 are unchanged. See `AUDIT-{VERSION}.md`.

'''
text = one(text, anchor, note + anchor, 'HANDOFF current release anchor')
write(handoff, text)

agents = SRC / 'AGENTS.md'
text = read(agents)
anchor = 'Build 12.194 owns muzzle-anchored third-person tracers in `js/61-world-renderer.js` and `js/62-character-renderer.js`.'
note = f'''Build {VERSION} owns the combat-aware AUTO spectator director in `js/70-runtime.js`. Keep it presentation-only and fed exclusively by already-computed bot state. Preserve the 3.2-second normal hold, 1.25-second live-fire exception, 8.5-second maximum hold, manual AUTO-off behaviour and two-second death handoff. Verify `spectatorDirectorForTest()`, `spectatorHandoffForTest()` and the existing combat/renderer gates. Save schema 19 and diagnostics schema 1 remain unchanged. See `AUDIT-{VERSION}.md`.

'''
text = one(text, anchor, note + anchor, 'AGENTS current release anchor')
write(agents, text)

contracts = SRC / 'CONTRACTS.md'
text = read(contracts)
anchor = '- Third-person tracer presentation must start from the reusable world-space muzzle\n'
contract = '''- AUTO spectator selection may rank only already-computed operator presentation state. It must not call perception, line-of-sight, navigation or combat routines, and must not write simulation state. Manual previous/next remains authoritative and disables AUTO; the existing two-second death handoff remains separate. Use bounded hold times and a stability bias so the camera follows action without rapid cuts.\n'''
text = one(text, anchor, contract + anchor, 'spectator contract anchor')
write(contracts, text)

read_first = SRC / '00-READ-FIRST-GPT.md'
text = read(read_first)
text = one(text, 'Current release: **Strikewatch Build 12.194 — Muzzle-Anchored Tracers**.', f'Current release: **Strikewatch Build {VERSION} — {NAME}**.', 'read-first release')
write(read_first, text)

readme = SRC / 'README.md'
text = read(readme)
text = one(text, '# Strikewatch Source 12.194', f'# Strikewatch Source {VERSION}', 'README heading')
text = one(text, 'dist/strikewatch-build-12.194.html', f'dist/strikewatch-build-{VERSION}.html', 'README standalone path')
write(readme, text)

project = SRC / 'PROJECT.md'
text = read(project)
old_project = 'Build 12.194 aligns third-person tracer streaks with the exact held-weapon muzzle point maintained by the renderer, while preserving the previous torso origin only as a startup fallback. Combat, impact handling, gameplay, persistence and schemas are unchanged. See `HANDOFF.md` and `AUDIT-12.194.md`.'
new_project = f'Build {VERSION} replaces blind AUTO spectator rotation with a stable combat-aware director that follows visible contact and real firing while preserving manual controls, the death handoff, gameplay, persistence and schemas. See `HANDOFF.md` and `AUDIT-{VERSION}.md`.'
text = one(text, old_project, new_project, 'PROJECT current release')
write(project, text)

# Remove bytecode accidentally committed by the previous workflow and keep this
# release transaction free of generated interpreter caches.
shutil.rmtree(ROOT / '.github' / 'scripts' / '__pycache__', ignore_errors=True)
shutil.rmtree(SRC / '__pycache__', ignore_errors=True)

# Release-script self-checks.
runtime_text = read(runtime)
required = [
    "revision: '12.195-combat-aware-director-1'",
    'sampleInterval: 0.22',
    'urgentMinimumHold: 1.25',
    'minimumHold: 3.2',
    'maximumHold: 8.5',
    'switchMargin: 18',
    'function spectatorDirectorInterest(bot, current = false)',
    'function spectatorDirectorDecision(entries, currentIndex, holdTime)',
    'function updateAutoSpectatorDirector(dt)',
    'function spectatorDirectorForTest()',
    'updateAutoSpectatorDirector(dt);',
    "resetSpectatorDirectorState(spectatorIndex, 'manual-selection')",
    "spectatorDirectorForTest: () => spectatorDirectorForTest()"
]
missing = [item for item in required if item not in runtime_text]
if missing:
    raise SystemExit(f'Missing spectator director requirements: {missing}')
if 'autoTimer = 4 + Math.random() * 3;' in runtime_text:
    raise SystemExit('Legacy random AUTO spectator timer survived')
if runtime_text.count('updateAutoSpectatorDirector(dt);') != 1:
    raise SystemExit('AUTO spectator director update is missing or duplicated')
if runtime_text.count('spectatorDeathSwitchTimer = 2;') != 1:
    raise SystemExit('Two-second spectator death handoff changed unexpectedly')
