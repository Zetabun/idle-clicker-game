from pathlib import Path
import json
import re
import shutil

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'strikewatch-source'
VERSION = '12.198'
NAME = 'Fixed-Step Match Clock & Stutter Recovery'
BUILD_ID = '12.198.0-fixed-step-match-clock-stutter-recovery'


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
    'version': '12.197',
    'name': 'Device-Independent Match Simulation',
    'build_id': '12.197.0-device-independent-match-simulation'
}
predecessor = json.loads(read(release_path))
if predecessor != expected_predecessor:
    raise SystemExit(f'Unexpected predecessor release: {predecessor!r}')

core = SRC / 'js' / '00-core.js'
text = read(core)
text = regex_one(text, r"const BUILD_VERSION = '[^']+'", f"const BUILD_VERSION = '{VERSION}'", 'BUILD_VERSION')
text = regex_one(text, r"const BUILD_NAME = '[^']+'", f"const BUILD_NAME = '{NAME}'", 'BUILD_NAME')
text = regex_one(text, r"const BUILD_ID = '[^']+'", f"const BUILD_ID = '{BUILD_ID}'", 'BUILD_ID')
write(core, text)

runtime = SRC / 'js' / '70-runtime.js'
text = read(runtime)
clock_block = r'''
  const MATCH_CLOCK_POLICY = Object.freeze({
    revision: '12.198-fixed-step-match-clock-1',
    stepSeconds: SIMULATION_WORK_POLICY.windowSeconds,
    presentationFrameCapSeconds: 0.033,
    maxStepsPerFrame: 8,
    maxAccumulatorSeconds: 0.5,
    backgroundGapSeconds: 0.75
  });
  const matchClockState = {
    accumulatorSeconds: 0,
    totalObservedWallSeconds: 0,
    totalAcceptedSimulationSeconds: 0,
    totalSimulatedSeconds: 0,
    totalDroppedSimulationSeconds: 0,
    totalDiscardedBackgroundSeconds: 0,
    totalSteps: 0,
    catchUpFrames: 0,
    catchUpSteps: 0,
    maxStepsObserved: 0,
    lastFrameSteps: 0,
    resetCount: 0,
    backgroundGaps: 0,
    overloadDrops: 0,
    lastResetReason: 'initial'
  };

  function matchClockSnapshot() {
    const accepted = Math.max(0, Number(matchClockState.totalAcceptedSimulationSeconds) || 0);
    const simulated = Math.max(0, Number(matchClockState.totalSimulatedSeconds) || 0);
    const debt = Math.max(0, Number(matchClockState.accumulatorSeconds) || 0);
    const dropped = Math.max(0, Number(matchClockState.totalDroppedSimulationSeconds) || 0);
    return {
      revision: MATCH_CLOCK_POLICY.revision,
      stepSeconds: MATCH_CLOCK_POLICY.stepSeconds,
      maxStepsPerFrame: MATCH_CLOCK_POLICY.maxStepsPerFrame,
      maxAccumulatorSeconds: MATCH_CLOCK_POLICY.maxAccumulatorSeconds,
      backgroundGapSeconds: MATCH_CLOCK_POLICY.backgroundGapSeconds,
      accumulatorSeconds: Number(debt.toFixed(6)),
      accumulatorMs: Number((debt * 1000).toFixed(2)),
      acceptedSimulationSeconds: Number(accepted.toFixed(6)),
      simulatedSeconds: Number(simulated.toFixed(6)),
      droppedSimulationSeconds: Number(dropped.toFixed(6)),
      discardedBackgroundSeconds: Number(matchClockState.totalDiscardedBackgroundSeconds.toFixed(6)),
      totalObservedWallSeconds: Number(matchClockState.totalObservedWallSeconds.toFixed(6)),
      totalSteps: matchClockState.totalSteps,
      catchUpFrames: matchClockState.catchUpFrames,
      catchUpSteps: matchClockState.catchUpSteps,
      maxStepsObserved: matchClockState.maxStepsObserved,
      lastFrameSteps: matchClockState.lastFrameSteps,
      resetCount: matchClockState.resetCount,
      backgroundGaps: matchClockState.backgroundGaps,
      overloadDrops: matchClockState.overloadDrops,
      lastResetReason: matchClockState.lastResetReason,
      matchSpeed: typeof matchSpeedMultiplier === 'number' ? matchSpeedMultiplier : 1,
      conservationError: Number((accepted - simulated - debt - dropped).toFixed(9))
    };
  }

  function resetMatchClockAccumulator(reason = 'reset') {
    const debt = Math.max(0, Number(matchClockState.accumulatorSeconds) || 0);
    const nextReason = String(reason || 'reset');
    const changed = debt > 1e-9 || matchClockState.lastResetReason !== nextReason;
    if (debt > 1e-9) matchClockState.totalDroppedSimulationSeconds += debt;
    matchClockState.accumulatorSeconds = 0;
    matchClockState.lastFrameSteps = 0;
    matchClockState.lastResetReason = nextReason;
    if (changed) matchClockState.resetCount++;
    return matchClockSnapshot();
  }

  function matchClockPauseReason(liveMenu = false, demoPaused = false, introPaused = false) {
    if (typeof document !== 'undefined' && document.hidden) return 'document-hidden';
    if (demoPaused) return 'guided-demo-paused';
    if (introPaused) return 'match-intro';
    if (typeof matchSimulationPaused !== 'undefined' && matchSimulationPaused) return 'manual-pause';
    if (typeof appState !== 'undefined' && appState === 'free-roam') return 'free-roam';
    if (typeof appState !== 'undefined' && appState === 'menu' && !liveMenu) return 'left-match';
    return 'match-not-running';
  }

  function advanceMatchClock(rawFrameSeconds, speed = matchSpeedMultiplier) {
    const raw = Math.max(0, Number(rawFrameSeconds) || 0);
    matchClockState.totalObservedWallSeconds += raw;
    const hidden = typeof document !== 'undefined' && Boolean(document.hidden);
    if (hidden || raw > MATCH_CLOCK_POLICY.backgroundGapSeconds) {
      matchClockState.backgroundGaps++;
      matchClockState.totalDiscardedBackgroundSeconds += raw;
      resetMatchClockAccumulator(hidden ? 'document-hidden' : 'background-gap');
      return 0;
    }

    const multiplier = Number(speed) >= 2 ? 2 : 1;
    const incoming = raw * multiplier;
    matchClockState.totalAcceptedSimulationSeconds += incoming;
    matchClockState.accumulatorSeconds += incoming;
    if (matchClockState.accumulatorSeconds > MATCH_CLOCK_POLICY.maxAccumulatorSeconds) {
      const overflow = matchClockState.accumulatorSeconds - MATCH_CLOCK_POLICY.maxAccumulatorSeconds;
      matchClockState.accumulatorSeconds = MATCH_CLOCK_POLICY.maxAccumulatorSeconds;
      matchClockState.totalDroppedSimulationSeconds += overflow;
      matchClockState.overloadDrops++;
    }

    let steps = 0;
    while (matchClockState.accumulatorSeconds + 1e-9 >= MATCH_CLOCK_POLICY.stepSeconds && steps < MATCH_CLOCK_POLICY.maxStepsPerFrame) {
      matchClockState.accumulatorSeconds = Math.max(0, matchClockState.accumulatorSeconds - MATCH_CLOCK_POLICY.stepSeconds);
      updateMatchStep(MATCH_CLOCK_POLICY.stepSeconds);
      steps++;
      matchClockState.totalSteps++;
      matchClockState.totalSimulatedSeconds += MATCH_CLOCK_POLICY.stepSeconds;
    }
    matchClockState.lastFrameSteps = steps;
    matchClockState.maxStepsObserved = Math.max(matchClockState.maxStepsObserved, steps);
    if (steps > 1) {
      matchClockState.catchUpFrames++;
      matchClockState.catchUpSteps += steps - 1;
    }
    return steps;
  }

  function matchClockModelForTest(frames = [], speed = 1) {
    const multiplier = Number(speed) >= 2 ? 2 : 1;
    let accumulator = 0;
    let accepted = 0;
    let simulated = 0;
    let dropped = 0;
    let discardedBackground = 0;
    let totalSteps = 0;
    let catchUpSteps = 0;
    let maxStepsObserved = 0;
    let backgroundGaps = 0;
    let overloadDrops = 0;
    let resets = 0;
    for (const frame of frames || []) {
      const spec = typeof frame === 'number' ? { seconds: frame, running: true, hidden: false } : (frame || {});
      const raw = Math.max(0, Number(spec.seconds) || 0);
      if (spec.running === false) {
        if (accumulator > 1e-9) dropped += accumulator;
        accumulator = 0;
        resets++;
        continue;
      }
      if (spec.hidden || raw > MATCH_CLOCK_POLICY.backgroundGapSeconds) {
        if (accumulator > 1e-9) dropped += accumulator;
        accumulator = 0;
        discardedBackground += raw;
        backgroundGaps++;
        resets++;
        continue;
      }
      const incoming = raw * multiplier;
      accepted += incoming;
      accumulator += incoming;
      if (accumulator > MATCH_CLOCK_POLICY.maxAccumulatorSeconds) {
        const overflow = accumulator - MATCH_CLOCK_POLICY.maxAccumulatorSeconds;
        accumulator = MATCH_CLOCK_POLICY.maxAccumulatorSeconds;
        dropped += overflow;
        overloadDrops++;
      }
      let frameSteps = 0;
      while (accumulator + 1e-9 >= MATCH_CLOCK_POLICY.stepSeconds && frameSteps < MATCH_CLOCK_POLICY.maxStepsPerFrame) {
        accumulator = Math.max(0, accumulator - MATCH_CLOCK_POLICY.stepSeconds);
        simulated += MATCH_CLOCK_POLICY.stepSeconds;
        frameSteps++;
        totalSteps++;
      }
      maxStepsObserved = Math.max(maxStepsObserved, frameSteps);
      if (frameSteps > 1) catchUpSteps += frameSteps - 1;
    }
    return {
      speed: multiplier,
      acceptedSeconds: Number(accepted.toFixed(9)),
      simulatedSeconds: Number(simulated.toFixed(9)),
      accumulatorSeconds: Number(accumulator.toFixed(9)),
      droppedSeconds: Number(dropped.toFixed(9)),
      discardedBackgroundSeconds: Number(discardedBackground.toFixed(9)),
      totalSteps,
      catchUpSteps,
      maxStepsObserved,
      backgroundGaps,
      overloadDrops,
      resets,
      conservationError: Number((accepted - simulated - accumulator - dropped).toFixed(9))
    };
  }

  function matchClockIntegrityForTest() {
    const tolerance = 0.000001;
    const profiles = [];
    for (const fps of [60, 30, 20, 15]) {
      for (const speed of [1, 2]) {
        const result = matchClockModelForTest(Array.from({ length: fps }, () => 1 / fps), speed);
        const expected = speed;
        profiles.push({
          fps,
          speed,
          expectedSeconds: expected,
          ...result,
          exact: Math.abs(result.simulatedSeconds - expected) <= tolerance
            && result.accumulatorSeconds <= tolerance
            && result.droppedSeconds <= tolerance
        });
      }
    }
    const shortStutter = matchClockModelForTest([
      ...Array.from({ length: 12 }, () => 1 / 60),
      0.12,
      ...Array.from({ length: 48 }, () => 1 / 60)
    ], 2);
    const backgroundGap = matchClockModelForTest([
      ...Array.from({ length: 10 }, () => 1 / 60),
      2,
      ...Array.from({ length: 10 }, () => 1 / 60)
    ], 1);
    const pauseResume = matchClockModelForTest([
      ...Array.from({ length: 6 }, () => ({ seconds: 1 / 60, running: true })),
      { seconds: 0.5, running: false },
      ...Array.from({ length: 6 }, () => ({ seconds: 1 / 60, running: true }))
    ], 1);
    const profilesExact = profiles.every(profile => profile.exact && profile.maxStepsObserved <= MATCH_CLOCK_POLICY.maxStepsPerFrame);
    const shortStutterSafe = shortStutter.droppedSeconds <= tolerance
      && Math.abs(shortStutter.conservationError) <= tolerance
      && shortStutter.accumulatorSeconds < MATCH_CLOCK_POLICY.stepSeconds
      && shortStutter.maxStepsObserved === MATCH_CLOCK_POLICY.maxStepsPerFrame;
    const backgroundSafe = backgroundGap.backgroundGaps === 1
      && Math.abs(backgroundGap.discardedBackgroundSeconds - 2) <= tolerance
      && backgroundGap.maxStepsObserved <= MATCH_CLOCK_POLICY.maxStepsPerFrame
      && backgroundGap.simulatedSeconds < 0.35;
    const pauseSafe = pauseResume.resets === 1
      && Math.abs(pauseResume.simulatedSeconds - 0.2) <= tolerance
      && pauseResume.accumulatorSeconds <= tolerance;
    return {
      ok: profilesExact
        && shortStutterSafe
        && backgroundSafe
        && pauseSafe
        && MATCH_CLOCK_POLICY.stepSeconds === 1 / 60
        && MATCH_CLOCK_POLICY.maxStepsPerFrame === 8
        && MATCH_CLOCK_POLICY.maxAccumulatorSeconds === 0.5
        && MATCH_CLOCK_POLICY.backgroundGapSeconds === 0.75,
      revision: MATCH_CLOCK_POLICY.revision,
      profiles,
      shortStutter,
      backgroundGap,
      pauseResume,
      presentationFrameCapSeconds: MATCH_CLOCK_POLICY.presentationFrameCapSeconds,
      saveSchemaChanged: false,
      diagnosticsSchemaChanged: false
    };
  }
'''
text = one(
    text,
    '''  };
  let runtimeStatsPublishCountdown = 0;''',
    '''  };''' + clock_block + '''
  let runtimeStatsPublishCountdown = 0;''',
    'match clock policy insertion'
)
old_update = '''  function update(dt) {
    runtimeFrameStages = {};
    measureRuntimeStage('career', () => updateCareerSystem(dt));
    measureRuntimeStage('effects', () => {
      updateDamageNumbers(dt);
      if (typeof updateMultiKillBanner === 'function') updateMultiKillBanner(dt);
      if (typeof updateCareerMatchMoment === 'function') updateCareerMatchMoment(dt);
    });
    if (typeof updateNewPlayerDemo === 'function') updateNewPlayerDemo(dt);
    const liveMenu = appState === 'menu' && menuContext === 'pause' && canResumeMatch;
    if (appState === 'menu') measureRuntimeStage('menu', () => updateMenu(dt));
    if (appState === 'free-roam') measureRuntimeStage('freeRoam', () => updateFreeRoam(dt));
    const demoPaused = typeof newPlayerDemoSimulationPaused === 'function' && newPlayerDemoSimulationPaused();
    const introPaused = typeof careerMatchIntroActive === 'function' && careerMatchIntroActive();
    const shouldSimulateMatch = (appState === 'match' && !demoPaused && !introPaused) || (liveMenu && !matchSimulationPaused);
    if (shouldSimulateMatch) {
      measureRuntimeStage('matchSimulation', () => {
        // AI and route work reset from simulationClock inside updateMatchStep().
        // Display refresh rate and render pressure therefore cannot change budgets.
        let remaining = dt * matchSpeedMultiplier;
        while (remaining > 0.00001) {
          const step = Math.min(SIMULATION_WORK_POLICY.windowSeconds, remaining);
          updateMatchStep(step);
          remaining -= step;
        }
      });
    }
    hudRefreshAccumulator += dt;
    if (hudRefreshAccumulator >= 0.05 || (!shouldSimulateMatch && appState !== 'free-roam')) {
      hudRefreshAccumulator = 0;
      if (appState !== 'free-roam') measureRuntimeStage('hud', () => updateHud());
      if (typeof updateTacticalMinimap === 'function') measureRuntimeStage('minimap', () => updateTacticalMinimap());
    }
    runtimeLastFrameStages = { ...runtimeFrameStages };
  }
'''
new_update = '''  function update(frameDt, rawFrameSeconds = frameDt) {
    runtimeFrameStages = {};
    measureRuntimeStage('career', () => updateCareerSystem(frameDt));
    measureRuntimeStage('effects', () => {
      updateDamageNumbers(frameDt);
      if (typeof updateMultiKillBanner === 'function') updateMultiKillBanner(frameDt);
      if (typeof updateCareerMatchMoment === 'function') updateCareerMatchMoment(frameDt);
    });
    if (typeof updateNewPlayerDemo === 'function') updateNewPlayerDemo(frameDt);
    const liveMenu = appState === 'menu' && menuContext === 'pause' && canResumeMatch;
    if (appState === 'menu') measureRuntimeStage('menu', () => updateMenu(frameDt));
    if (appState === 'free-roam') measureRuntimeStage('freeRoam', () => updateFreeRoam(frameDt));
    const demoPaused = typeof newPlayerDemoSimulationPaused === 'function' && newPlayerDemoSimulationPaused();
    const introPaused = typeof careerMatchIntroActive === 'function' && careerMatchIntroActive();
    const shouldSimulateMatch = (appState === 'match' && !demoPaused && !introPaused) || (liveMenu && !matchSimulationPaused);
    if (shouldSimulateMatch) {
      measureRuntimeStage('matchSimulation', () => advanceMatchClock(rawFrameSeconds, matchSpeedMultiplier));
    } else {
      resetMatchClockAccumulator(matchClockPauseReason(liveMenu, demoPaused, introPaused));
    }
    hudRefreshAccumulator += frameDt;
    if (hudRefreshAccumulator >= 0.05 || (!shouldSimulateMatch && appState !== 'free-roam')) {
      hudRefreshAccumulator = 0;
      if (appState !== 'free-roam') measureRuntimeStage('hud', () => updateHud());
      if (typeof updateTacticalMinimap === 'function') measureRuntimeStage('minimap', () => updateTacticalMinimap());
    }
    runtimeLastFrameStages = { ...runtimeFrameStages };
  }
'''
text = one(text, old_update, new_update, 'runtime update loop')
old_loop = '''  function loop(now) {
    let phase = 'frame';
    try {
      const frameStart = performance.now();
      const rawFrameIntervalMs = Math.max(0, now - lastTime) || 16.667;
      const dt = Math.min(0.033, rawFrameIntervalMs / 1000);
      lastTime = now;
      lastFrameDt = dt;
      const updateStart = performance.now();
      phase = 'update';
      update(dt);
      if (typeof maintainAudioHealth === 'function') {
        phase = 'audio';
        const audioStart = performance.now();
        maintainAudioHealth(now);
        runtimeLastFrameStages.audioHealth = (Number(runtimeLastFrameStages.audioHealth) || 0) + (performance.now() - audioStart);
      }
      const updateMs = performance.now() - updateStart;
      const renderStart = performance.now();
      phase = 'render';
      render(now);
      const renderMs = performance.now() - renderStart;
      phase = 'performance';
      recordRuntimePerformance(performance.now() - frameStart, updateMs, renderMs, rawFrameIntervalMs);
    } catch (error) {
      recordRuntimeFault(error, phase);
    } finally {
      // Schedule the next frame even if a presentation-only error occurs. This
      // keeps controls and diagnostics alive while surfacing the fault instead
      // of silently terminating the entire match loop.
      requestAnimationFrame(loop);
    }
  }
'''
new_loop = '''  function loop(now) {
    let phase = 'frame';
    try {
      const frameStart = performance.now();
      const rawFrameIntervalMs = Math.max(0, now - lastTime) || 16.667;
      const rawFrameSeconds = rawFrameIntervalMs / 1000;
      const frameDt = Math.min(MATCH_CLOCK_POLICY.presentationFrameCapSeconds, rawFrameSeconds);
      lastTime = now;
      lastFrameDt = frameDt;
      const updateStart = performance.now();
      phase = 'update';
      update(frameDt, rawFrameSeconds);
      if (typeof maintainAudioHealth === 'function') {
        phase = 'audio';
        const audioStart = performance.now();
        maintainAudioHealth(now);
        runtimeLastFrameStages.audioHealth = (Number(runtimeLastFrameStages.audioHealth) || 0) + (performance.now() - audioStart);
      }
      const updateMs = performance.now() - updateStart;
      const renderStart = performance.now();
      phase = 'render';
      render(now);
      const renderMs = performance.now() - renderStart;
      phase = 'performance';
      recordRuntimePerformance(performance.now() - frameStart, updateMs, renderMs, rawFrameIntervalMs);
    } catch (error) {
      recordRuntimeFault(error, phase);
    } finally {
      // Schedule the next frame even if a presentation-only error occurs. This
      // keeps controls and diagnostics alive while surfacing the fault instead
      // of silently terminating the entire match loop.
      requestAnimationFrame(loop);
    }
  }
'''
text = one(text, old_loop, new_loop, 'requestAnimationFrame loop')
text = one(
    text,
    '''      document.body.dataset.runtimeSevereFrames = String(runtimePerformance.severeFrames);
''',
    '''      document.body.dataset.runtimeSevereFrames = String(runtimePerformance.severeFrames);
      document.body.dataset.runtimeMatchClockDebtMs = (matchClockState.accumulatorSeconds * 1000).toFixed(2);
      document.body.dataset.runtimeMatchClockSteps = String(matchClockState.lastFrameSteps);
      document.body.dataset.runtimeMatchClockCatchUpSteps = String(matchClockState.catchUpSteps);
      document.body.dataset.runtimeMatchClockDroppedMs = (matchClockState.totalDroppedSimulationSeconds * 1000).toFixed(2);
      document.body.dataset.runtimeMatchClockBackgroundGaps = String(matchClockState.backgroundGaps);
''',
    'runtime match clock telemetry'
)
text = one(
    text,
    '''      matchSpeed: matchSpeedMultiplier,
      damageNumbers: damageNumberEffects.length,''',
    '''      matchSpeed: matchSpeedMultiplier,
      matchClock: matchClockSnapshot(),
      damageNumbers: damageNumberEffects.length,''',
    'debug match clock snapshot'
)
text = one(
    text,
    '''    simulationWorkPolicyForTest: () => simulationWorkPolicySnapshot(),
    adaptiveResolutionForTest:''',
    '''    simulationWorkPolicyForTest: () => simulationWorkPolicySnapshot(),
    matchClockForTest: () => matchClockSnapshot(),
    matchClockIntegrityForTest: () => matchClockIntegrityForTest(),
    matchClockModelForTest: (frames = [], speed = 1) => matchClockModelForTest(frames, speed),
    adaptiveResolutionForTest:''',
    'public match clock hooks'
)
text = one(
    text,
    '''  requestAnimationFrame(() => {
    if (!operatorPreviewRequested && typeof openNewPlayerIntro === 'function') openNewPlayerIntro();
  });
  requestAnimationFrame(loop);''',
    '''  document.addEventListener('visibilitychange', () => {
    resetMatchClockAccumulator(document.hidden ? 'document-hidden' : 'document-visible');
    lastTime = performance.now();
  });
  window.addEventListener('pageshow', () => {
    resetMatchClockAccumulator('page-show');
    lastTime = performance.now();
  });
  requestAnimationFrame(() => {
    if (!operatorPreviewRequested && typeof openNewPlayerIntro === 'function') openNewPlayerIntro();
  });
  requestAnimationFrame(loop);''',
    'visibility and page-show clock reset'
)
write(runtime, text)

flow = SRC / 'js' / '40-match-flow.js'
text = read(flow)
text = one(
    text,
    '''  function startRound() {
    if (typeof resetSimulationWorkWindow === 'function') resetSimulationWorkWindow('round-start');''',
    '''  function startRound() {
    if (typeof resetSimulationWorkWindow === 'function') resetSimulationWorkWindow('round-start');
    if (typeof resetMatchClockAccumulator === 'function') resetMatchClockAccumulator('round-start');''',
    'round clock reset'
)
write(flow, text)

menus = SRC / 'js' / '50-ui-menus.js'
text = read(menus)
text = one(
    text,
    '''    matchSpeedMultiplier = next;
    combatDebug.fastForwardToggles++;''',
    '''    if (typeof resetMatchClockAccumulator === 'function') resetMatchClockAccumulator('speed-change');
    matchSpeedMultiplier = next;
    combatDebug.fastForwardToggles++;''',
    'speed change clock reset'
)
text = one(
    text,
    '''    matchSimulationPaused = !matchSimulationPaused;
    liveMenuRefreshTimer = 0;''',
    '''    matchSimulationPaused = !matchSimulationPaused;
    if (typeof resetMatchClockAccumulator === 'function') resetMatchClockAccumulator(matchSimulationPaused ? 'manual-pause' : 'manual-resume');
    liveMenuRefreshTimer = 0;''',
    'manual pause clock reset'
)
text = one(
    text,
    '''  function resumeMatch() {
    resumeAudioFromGesture();
    matchSimulationPaused = false;''',
    '''  function resumeMatch() {
    resumeAudioFromGesture();
    if (typeof resetMatchClockAccumulator === 'function') resetMatchClockAccumulator('resume-match');
    matchSimulationPaused = false;''',
    'resume clock reset'
)
text = one(
    text,
    '''  function exitToMainMenu() {
    createMatch();''',
    '''  function exitToMainMenu() {
    if (typeof resetMatchClockAccumulator === 'function') resetMatchClockAccumulator('exit-match');
    createMatch();''',
    'exit clock reset'
)
write(menus, text)

index = SRC / 'index.html'
text = read(index)
text = one(text, '<title>Strikewatch 12.197: Device-Independent Match Simulation</title>', f'<title>Strikewatch {VERSION}: {NAME}</title>', 'index title')
if '12.197.0-device-independent-match-simulation' not in text:
    raise SystemExit('Current index build id missing')
text = text.replace('12.197.0-device-independent-match-simulation', BUILD_ID).replace('12.197', VERSION)
write(index, text)
write(release_path, json.dumps({'version': VERSION, 'name': NAME, 'build_id': BUILD_ID}, indent=2) + '\n')

write(SRC / f'AUDIT-{VERSION}.md', f'''# Build {VERSION} — {NAME}

## Scope

Build 12.197 made perception, tactical decisions and navigation device-independent, but the display loop still capped every rendered frame to 33ms before the match saw it. A 50ms frame therefore advanced only 33ms of simulation, making sustained 20 FPS matches run at roughly two-thirds real-time speed even though their operator intelligence was now fair.

## Changes

- Added `MATCH_CLOCK_POLICY` in `js/70-runtime.js`: a 1/60-second fixed step, eight steps per displayed frame, 500ms bounded debt, a 750ms background-gap threshold and the existing 33ms presentation delta cap.
- The display loop now supplies both capped presentation time and the actual visible frame interval. Management/UI animation remains bounded while match time enters the accumulator without the old 33ms truncation.
- `advanceMatchClock()` conserves normal visible elapsed time, applies 1×/2× speed before stepping, carries bounded debt across short hitches and records overload drops instead of creating an unbounded spiral.
- 60, 30, 20 and 15 FPS all advance exact fixed-step match time at both 1× and 2×. Eight steps are sufficient for 15 FPS at 2×.
- Intervals above 750ms and hidden-page resumes are treated as background gaps. They clear debt and never replay seconds of combat after a locked phone or background tab returns.
- Pausing, resuming, changing speed, starting a round and exiting a match explicitly clear old debt. Match introductions and other non-running states clear through the central update gate.
- Runtime telemetry now exposes debt, steps, catch-up steps, dropped milliseconds and background-gap counts. `matchClockIntegrityForTest()`, `matchClockModelForTest()` and `matchClockForTest()` expose deterministic diagnostics.

## Behaviour boundaries

The 12.197 `SIMULATION_WORK_POLICY` remains unchanged and continues to define intelligence quality. Weapon values, AI decisions, movement, path scoring, line of sight, damage, results, rewards, saves and schemas are unchanged. This release changes only how visible elapsed time is delivered to the existing fixed simulation steps.

## Verification

- `matchClockIntegrityForTest()` proves exact one-second advancement at 60/30/20/15 FPS in 1× and two-second advancement in 2×.
- A 120ms short stutter is conserved without a drop and never exceeds eight steps in one displayed frame.
- A two-second background interval is discarded without catch-up; pause/resume does not replay paused time.
- Source gates verify the old `Math.min(0.033, rawFrameIntervalMs / 1000)` match-time truncation and render-frame simulation loop are absent.
- Every modular JavaScript file, generated bundle and standalone inline script parses with Node.
- Existing simulation-quality, spectator, renderer, navigation, arena, persistence and loadout hooks remain present.
- Two builds produce identical outputs and root `cod.html` is byte-identical to the standalone.
''')

changelog = SRC / 'CHANGELOG.md'
text = read(changelog)
entry = f'''## {VERSION} — {NAME}

- Replaces the 33ms match-time truncation with a bounded 1/60 fixed-step accumulator.
- Keeps 60/30/20/15 FPS exact at 1× and 2×, with up to eight steps per displayed frame.
- Carries short-stutter debt safely and discards hidden/background gaps instead of replaying combat.
- Adds match-clock telemetry and deterministic integrity diagnostics.
- See `AUDIT-{VERSION}.md`.

'''
if f'## {VERSION} — {NAME}' in text:
    raise SystemExit('Build 12.198 changelog already exists')
pos = text.find('## ')
if pos < 0:
    raise SystemExit('Could not locate changelog insertion anchor')
write(changelog, text[:pos] + entry + text[pos:])

handoff = SRC / 'HANDOFF.md'
text = read(handoff)
text = one(text, '- Build: **12.197 — Device-Independent Match Simulation**', f'- Build: **{VERSION} — {NAME}**', 'HANDOFF build')
text = one(text, '- Build ID: `12.197.0-device-independent-match-simulation`', f'- Build ID: `{BUILD_ID}`', 'HANDOFF build id')
text = one(text, 'strikewatch-source/dist/strikewatch-build-12.197.html', f'strikewatch-source/dist/strikewatch-build-{VERSION}.html', 'HANDOFF standalone')
anchor = 'Build 12.197 owns the device-independent simulation-work boundary across `js/00-core.js`, `js/20-navigation.js`, `js/30-bot-ai.js`, `js/40-match-flow.js` and `js/70-runtime.js`.'
note = f'''Build {VERSION} owns the visible-time match clock in `js/70-runtime.js`, with lifecycle resets in `js/40-match-flow.js` and `js/50-ui-menus.js`. Preserve `MATCH_CLOCK_POLICY`, the 1/60 fixed step, eight-step frame cap, 500ms debt bound, 750ms background-gap discard, capped presentation delta and `matchClockIntegrityForTest()`. Normal visible intervals must be conserved at 60/30/20/15 FPS in both speed modes; hidden pages, pauses, round changes, speed changes and match exits must not replay stale debt. Build 12.197 remains the intelligence-quality authority. Save schema 19 and diagnostics schema 1 are unchanged. See `AUDIT-{VERSION}.md`.

'''
text = one(text, anchor, note + anchor, 'HANDOFF 12.197 anchor')
write(handoff, text)

agents = SRC / 'AGENTS.md'
text = read(agents)
anchor = 'Build 12.197 owns device-independent match work scheduling.'
note = f'''Build {VERSION} owns fixed-step match elapsed time. Keep `MATCH_CLOCK_POLICY` in `js/70-runtime.js`: 1/60 step, eight steps per displayed frame, 0.5s maximum debt, 0.75s background-gap discard and 0.033s presentation cap. `update()` must receive capped presentation time separately from raw visible elapsed time. Preserve explicit resets for round start, pause/resume, speed change, exit, visibility and page-show. Verify `matchClockIntegrityForTest()`, `simulationQualityIndependenceForTest()` and adjacent gameplay gates. Save schema 19 and diagnostics schema 1 remain unchanged. See `AUDIT-{VERSION}.md`.

'''
text = one(text, anchor, note + anchor, 'AGENTS 12.197 anchor')
write(agents, text)

contracts = SRC / 'CONTRACTS.md'
text = read(contracts)
old_contract = '- Adaptive device quality is presentation-only. Resolution, render LOD and other visual cost may respond to frame pressure, but perception cadence, tactical work and navigation planning use one fixed former-Full policy scheduled in 1/60-second simulation windows. Their work windows must not reset from `requestAnimationFrame`, refresh rate, hardware concurrency, device memory or render tier. An overloaded device may display fewer frames or advance wall-clock match time more slowly; it must not receive weaker operator intelligence.'
new_contract = '''- Adaptive device quality is presentation-only. Resolution, render LOD and other visual cost may respond to frame pressure, but perception cadence, tactical work and navigation planning use one fixed former-Full policy scheduled in 1/60-second simulation windows. Their work windows must not reset from `requestAnimationFrame`, refresh rate, hardware concurrency, device memory or render tier. An overloaded device may display fewer frames; it must not receive weaker operator intelligence.
- Visible match elapsed time is accumulated independently of presentation animation and consumed only in 1/60-second simulation steps. Ordinary 60/30/20/15 FPS intervals must conserve time at 1× and 2×; bounded catch-up may carry short-stutter debt across frames, but it must never become an unbounded spiral. Hidden-page/background gaps, pause/resume, round changes, speed changes and match exit clear stale debt so combat is never replayed after inactivity.'''
text = one(text, old_contract, new_contract, 'match clock contracts')
write(contracts, text)

architecture = SRC / 'ARCHITECTURE.md'
text = read(architecture)
text = one(
    text,
    '| `70-runtime.js` | DOM binding, main loop, simulation-time work-window coordination, input, startup and public test hooks |',
    '| `70-runtime.js` | DOM binding, fixed-step match clock, simulation-time work-window coordination, input, startup and public test hooks |',
    'runtime architecture ownership'
)
text = one(
    text,
    '| `40-match-flow.js` | Round/match lifecycle, feed events and career settlement |',
    '| `40-match-flow.js` | Round/match lifecycle, clock/work-window reset boundaries, feed events and career settlement |',
    'match flow architecture ownership'
)
write(architecture, text)

read_first = SRC / '00-READ-FIRST-GPT.md'
text = read(read_first)
text = one(text, 'Current release: **Strikewatch Build 12.197 — Device-Independent Match Simulation**.', f'Current release: **Strikewatch Build {VERSION} — {NAME}**.', 'read-first release')
write(read_first, text)

readme = SRC / 'README.md'
text = read(readme)
text = one(text, '# Strikewatch Source 12.197', f'# Strikewatch Source {VERSION}', 'README heading')
text = one(text, 'dist/strikewatch-build-12.197.html', f'dist/strikewatch-build-{VERSION}.html', 'README standalone')
write(readme, text)

project = SRC / 'PROJECT.md'
text = read(project)
old_project = 'Build 12.197 separates adaptive presentation quality from match intelligence, using fixed simulation-time perception, tactical and navigation budgets on every device while preserving adaptive resolution, persistence and schemas. See `HANDOFF.md` and `AUDIT-12.197.md`.'
new_project = f'Build {VERSION} preserves actual visible match time through a bounded 1/60 fixed-step accumulator, keeping 60/30/20/15 FPS exact at 1× and 2× while discarding hidden/background gaps safely. See `HANDOFF.md` and `AUDIT-{VERSION}.md`.'
text = one(text, old_project, new_project, 'PROJECT release')
write(project, text)

shutil.rmtree(ROOT / '.github' / 'scripts' / '__pycache__', ignore_errors=True)
shutil.rmtree(SRC / '__pycache__', ignore_errors=True)

runtime_text = read(runtime)
flow_text = read(flow)
menus_text = read(menus)
required_runtime = [
    "revision: '12.198-fixed-step-match-clock-1'",
    'stepSeconds: SIMULATION_WORK_POLICY.windowSeconds',
    'presentationFrameCapSeconds: 0.033',
    'maxStepsPerFrame: 8',
    'maxAccumulatorSeconds: 0.5',
    'backgroundGapSeconds: 0.75',
    'function advanceMatchClock(',
    'function matchClockIntegrityForTest()',
    'update(frameDt, rawFrameSeconds)',
    "document.addEventListener('visibilitychange'",
    "window.addEventListener('pageshow'"
]
missing = [item for item in required_runtime if item not in runtime_text]
if missing:
    raise SystemExit(f'Missing match clock requirements: {missing}')
if 'const dt = Math.min(0.033, rawFrameIntervalMs / 1000);' in runtime_text:
    raise SystemExit('Legacy match-time truncation survived')
if 'let remaining = dt * matchSpeedMultiplier;' in runtime_text:
    raise SystemExit('Legacy render-frame simulation loop survived')
if "resetMatchClockAccumulator('round-start')" not in flow_text:
    raise SystemExit('Round start does not reset match clock debt')
for marker in ["resetMatchClockAccumulator('speed-change')", "'manual-pause' : 'manual-resume'", "resetMatchClockAccumulator('resume-match')", "resetMatchClockAccumulator('exit-match')"]:
    if marker not in menus_text:
        raise SystemExit(f'Missing lifecycle reset: {marker}')
if "revision: '12.197-device-independent-simulation-1'" not in read(core):
    raise SystemExit('Build 12.197 simulation policy changed unexpectedly')
