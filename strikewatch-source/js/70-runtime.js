/*
 * Strikewatch source module: 70-runtime.js
 * Purpose: Main update/render loop, input events, debug API and application bootstrap.
 *
 * This file is a source fragment. Run `python3 build.py` to regenerate
 * js/strikewatch.dev.js and the standalone release in dist/.
 */

  const runtimePerformance = {
    frames: 0,
    updateMs: 0,
    renderMs: 0,
    frameMs: 0,
    frameIntervalMs: 0,
    peakFrameMs: 0,
    peakFrameIntervalMs: 0,
    longFrames: 0,
    stutterFrames: 0,
    severeFrames: 0,
    skippedMenuRenders: 0,
    lastSampleAt: performance.now()
  };
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

  let runtimeStatsPublishCountdown = 0;
  let runtimeFrameStages = {};
  let runtimeLastFrameStages = {};
  const runtimeFaults = [];
  let runtimeFaultSequence = 0;

  function runtimeFaultSnapshot() {
    return runtimeFaults.map(fault => ({ ...fault }));
  }

  function recordRuntimeFault(error, phase = 'frame') {
    const message = String(error?.message || error || 'Unknown runtime error');
    const stack = String(error?.stack || '').split('\n').slice(0, 5).join('\n');
    const now = performance.now();
    const signature = `${phase}:${message}`;
    const previous = runtimeFaults[runtimeFaults.length - 1];
    let repeated = false;
    if (previous?.signature === signature && now - previous.lastAtMs < 2000) {
      repeated = true;
      previous.count++;
      previous.lastAtMs = Math.round(now);
      previous.simulationTime = Number(simulationClock.toFixed(3));
    } else {
      runtimeFaults.push({
        sequence: ++runtimeFaultSequence,
        phase: String(phase || 'frame'),
        message,
        stack,
        signature,
        count: 1,
        firstAtMs: Math.round(now),
        lastAtMs: Math.round(now),
        simulationTime: Number(simulationClock.toFixed(3)),
        appState: String(appState || ''),
        arenaId: String(activeArenaId || '')
      });
      if (runtimeFaults.length > 12) runtimeFaults.shift();
      if (typeof diagnosticLogEvent === 'function' && matchDiagnostics && !matchDiagnostics.completed) {
        diagnosticLogEvent('runtime_fault', null, { phase: String(phase || 'frame'), message, stack });
      }
    }
    const fault = runtimeFaults[runtimeFaults.length - 1] || null;
    if (!repeated || (fault && (fault.count <= 3 || fault.count % 60 === 0))) {
      console.error(`Strikewatch runtime ${phase} fault`, error);
    }
    return fault;
  }

  function measureRuntimeStage(name, callback) {
    const start = performance.now();
    const result = callback();
    runtimeFrameStages[name] = (Number(runtimeFrameStages[name]) || 0) + (performance.now() - start);
    return result;
  }

  let freeRoamSelectedArenaId = 'citadel';
  let freeRoamPreviousState = null;
  const freeRoamMoveInputs = new Set();
  const freeRoamPressedKeys = new Set();
  let freeRoamLookPointerId = null;
  let freeRoamLookLastX = 0;
  let freeRoamLookLastY = 0;
  let freeRoamUiAccumulator = 0;
  const freeRoamCamera = {
    x: 2.5, y: 5.5, angle: 0, lookPitch: 0,
    alive: true, freeRoam: true, motion: 0, moveVelocity: 0,
    visualMoveVelocity: 0, walkCycle: 0, crouchBlend: 0, runBlend: 0,
    strafeBlend: 0, recoil: 0, hurt: 0, hitReactionStrength: 0,
    hitReaction: 0, hitReactionAge: 0, hitReactionVertical: 0,
    weapon: null, health: 100
  };

  function freeRoamArenaIds() {
    return Object.keys(ARENA_LIBRARY || {}).filter(id => ARENA_LIBRARY[id]?.layout?.length);
  }

  function freeRoamSpawnForArena(arenaId = activeArenaId) {
    const arena = arenaMeta(arenaId);
    const preferred = arena.spawnPoints?.[TEAM_BLUE]?.[0] || { x: 2.5, y: 2.5 };
    const point = nearestWalkablePoint(preferred.x, preferred.y);
    return {
      x: point.x,
      y: point.y,
      angle: Math.atan2((arena.layout.length * 0.5) - point.y, ((arena.layout[0]?.length || MAP_W) * 0.5) - point.x)
    };
  }

  function resetFreeRoamCamera(arenaId = activeArenaId) {
    const spawn = freeRoamSpawnForArena(arenaId);
    freeRoamCamera.x = spawn.x;
    freeRoamCamera.y = spawn.y;
    freeRoamCamera.angle = spawn.angle;
    freeRoamCamera.lookPitch = 0;
    freeRoamCamera.motion = 0;
    freeRoamCamera.moveVelocity = 0;
    freeRoamCamera.visualMoveVelocity = 0;
    freeRoamCamera.walkCycle = 0;
    freeRoamCamera.runBlend = 0;
    freeRoamCamera.strafeBlend = 0;
    freeRoamMoveInputs.clear();
    freeRoamPressedKeys.clear();
    updateFreeRoamPresentation(true);
    return { ...spawn };
  }

  function updateFreeRoamPresentation(force = false) {
    if (appState !== 'free-roam' && !force) return;
    const arena = activeArenaMeta();
    const elevation = arenaElevationAt(freeRoamCamera.x, freeRoamCamera.y);
    const zone = levelZoneAt(freeRoamCamera.x, freeRoamCamera.y);
    const floor = elevation > 0.12 ? 'UPPER FLOOR' : 'GROUND FLOOR';
    if (freeRoamMapNameEl) freeRoamMapNameEl.textContent = arena.name;
    if (freeRoamFloorEl) freeRoamFloorEl.textContent = `${floor} · ${zone?.short || 'TRANSIT'}`;
    if (freeRoamPositionEl) freeRoamPositionEl.textContent = `X ${freeRoamCamera.x.toFixed(2)} · Z ${freeRoamCamera.y.toFixed(2)} · ELEV ${elevation.toFixed(2)}M · ${zone?.name || 'CENTRAL TRANSIT'}`;
  }

  function attemptFreeRoamMove(dx, dy) {
    // Match the operator footprint so inspection routes accurately represent
    // whether live NPCs can use the same corridor or stair approach.
    const radius = BOT_RADIUS;
    const nextX = freeRoamCamera.x + dx;
    const nextY = freeRoamCamera.y + dy;
    if (canTravelBetween(freeRoamCamera.x, freeRoamCamera.y, nextX, nextY, radius, true)) {
      freeRoamCamera.x = nextX;
      freeRoamCamera.y = nextY;
      return true;
    }
    let moved = false;
    if (Math.abs(dx) > 0.00001 && canTravelBetween(freeRoamCamera.x, freeRoamCamera.y, nextX, freeRoamCamera.y, radius, true)) {
      freeRoamCamera.x = nextX;
      moved = true;
    }
    if (Math.abs(dy) > 0.00001 && canTravelBetween(freeRoamCamera.x, freeRoamCamera.y, freeRoamCamera.x, nextY, radius, true)) {
      freeRoamCamera.y = nextY;
      moved = true;
    }
    return moved;
  }

  function updateFreeRoam(dt) {
    simulationClock += Math.max(0, dt);
    updateDynamicDoors(dt, [freeRoamCamera]);
    const forward = (freeRoamMoveInputs.has('forward') || freeRoamPressedKeys.has('w') || freeRoamPressedKeys.has('arrowup') ? 1 : 0)
      - (freeRoamMoveInputs.has('back') || freeRoamPressedKeys.has('s') || freeRoamPressedKeys.has('arrowdown') ? 1 : 0);
    const strafe = (freeRoamMoveInputs.has('right') || freeRoamPressedKeys.has('d') || freeRoamPressedKeys.has('arrowright') ? 1 : 0)
      - (freeRoamMoveInputs.has('left') || freeRoamPressedKeys.has('a') || freeRoamPressedKeys.has('arrowleft') ? 1 : 0);
    const magnitude = Math.hypot(forward, strafe);
    const fast = freeRoamPressedKeys.has('shift');
    let moved = false;
    if (magnitude > 0.001) {
      const f = forward / magnitude;
      const st = strafe / magnitude;
      const speed = fast ? 4.25 : 2.45;
      const forwardX = Math.cos(freeRoamCamera.angle);
      const forwardY = Math.sin(freeRoamCamera.angle);
      const rightX = -forwardY;
      const rightY = forwardX;
      moved = attemptFreeRoamMove((forwardX * f + rightX * st) * speed * dt, (forwardY * f + rightY * st) * speed * dt);
      freeRoamCamera.strafeBlend = st;
    } else {
      freeRoamCamera.strafeBlend = 0;
    }
    const motionTarget = moved ? (fast ? 1 : 0.72) : 0;
    freeRoamCamera.motion = lerp(freeRoamCamera.motion, motionTarget, clamp(dt * 9, 0, 1));
    freeRoamCamera.moveVelocity = freeRoamCamera.motion;
    freeRoamCamera.visualMoveVelocity = freeRoamCamera.motion;
    freeRoamCamera.runBlend = lerp(freeRoamCamera.runBlend, fast && moved ? 1 : 0, clamp(dt * 7, 0, 1));
    freeRoamCamera.walkCycle += dt * (moved ? (fast ? 10.5 : 7.4) : 1.2);
    freeRoamUiAccumulator += dt;
    if (freeRoamUiAccumulator >= 0.08) {
      freeRoamUiAccumulator = 0;
      updateFreeRoamPresentation();
      if (typeof updateTacticalMinimap === 'function') updateTacticalMinimap();
    }
  }

  function renderFreeRoamConfigurationCard() {
    const ids = freeRoamArenaIds();
    if (!ids.includes(freeRoamSelectedArenaId)) freeRoamSelectedArenaId = ids[0] || 'citadel';
    const liveMatchLocked = Boolean(canResumeMatch || matchmakingState?.active || deploymentSelectionState?.active);
    const choices = ids.map(id => {
      const arena = arenaMeta(id);
      const active = id === freeRoamSelectedArenaId;
      return `<button type="button" data-free-roam-arena="${id}" class="${active ? 'active' : ''}"><strong>${escapeCareerHtml(arena.name)}</strong><small>${escapeCareerHtml(arena.tagDescription || arena.matchmakingBlurb || 'Map inspection')}</small></button>`;
    }).join('');
    return `<article class="menu-setting-card free-roam-config-card"><div class="menu-kicker">MAP INSPECTION</div><h3>FREE ROAM</h3><p>Walk through any battleground without operators or combat. Use the mobile movement pad and drag-look area to inspect stairs, props, lighting, collision and sightlines.</p><div class="free-roam-map-choice">${choices}</div><button class="free-roam-launch primary" type="button" data-free-roam-action="launch" ${liveMatchLocked ? 'disabled' : ''}>${liveMatchLocked ? 'FINISH OR EXIT THE LIVE MATCH FIRST' : `ENTER ${escapeCareerHtml(arenaMeta(freeRoamSelectedArenaId).name)}`}</button><small>Free Roam is isolated from career progress and match results. Doors still respond to your position and stairs use the same elevation and collision rules as operators.</small></article>`;
  }

  function handleFreeRoamConfigurationClick(event) {
    const choice = event.target.closest?.('[data-free-roam-arena]');
    if (choice) {
      const id = String(choice.dataset.freeRoamArena || '');
      if (ARENA_LIBRARY[id]) {
        freeRoamSelectedArenaId = id;
        renderMenuContent();
      }
      return true;
    }
    const action = event.target.closest?.('[data-free-roam-action]');
    if (!action) return false;
    if (action.dataset.freeRoamAction === 'launch') startFreeRoam(freeRoamSelectedArenaId);
    return true;
  }

  function startFreeRoam(arenaId = freeRoamSelectedArenaId) {
    if (canResumeMatch || matchmakingState?.active || deploymentSelectionState?.active) {
      showStatus('EXIT THE ACTIVE MATCH BEFORE FREE ROAM');
      return false;
    }
    const id = ARENA_LIBRARY[arenaId] ? arenaId : 'citadel';
    freeRoamSelectedArenaId = id;
    freeRoamPreviousState = {
      arenaId: activeArenaId,
      bots,
      engagementPlan: currentEngagementPlan
    };
    bots = [];
    setActiveArena(id);
    if (typeof navigationGraphForActiveArena === 'function') navigationGraphForActiveArena();
    resetFreeRoamCamera(id);
    menuContext = 'main';
    canResumeMatch = false;
    matchSimulationPaused = false;
    if (typeof setDiagnosticOverlayVisible === 'function') setDiagnosticOverlayVisible(false, false);
    if (typeof setTacticalMinimapVisible === 'function') setTacticalMinimapVisible(false, false);
    setAppState('free-roam');
    if (freeRoamOverlayEl) {
      freeRoamOverlayEl.hidden = false;
      freeRoamOverlayEl.setAttribute('aria-hidden', 'false');
    }
    resize();
    lastTime = performance.now();
    return true;
  }

  function exitFreeRoam() {
    if (appState !== 'free-roam') return false;
    if (typeof setTacticalMinimapVisible === 'function') setTacticalMinimapVisible(false, false);
    if (freeRoamOverlayEl) {
      freeRoamOverlayEl.hidden = true;
      freeRoamOverlayEl.setAttribute('aria-hidden', 'true');
    }
    const previous = freeRoamPreviousState;
    setActiveArena(previous?.arenaId || careerState?.tactics?.arenaId || 'citadel');
    bots = Array.isArray(previous?.bots) ? previous.bots : [];
    currentEngagementPlan = previous?.engagementPlan || null;
    freeRoamPreviousState = null;
    freeRoamMoveInputs.clear();
    freeRoamPressedKeys.clear();
    menuContext = 'main';
    menuTab = 'settings';
    setAppState('menu');
    updateMenuUI();
    resetMenuScroll();
    resize();
    lastTime = performance.now();
    return true;
  }

  function cycleFreeRoamArena() {
    if (appState !== 'free-roam') return false;
    const ids = freeRoamArenaIds();
    const current = Math.max(0, ids.indexOf(activeArenaId));
    const next = ids[(current + 1) % Math.max(1, ids.length)] || 'citadel';
    freeRoamSelectedArenaId = next;
    setActiveArena(next);
    if (typeof navigationGraphForActiveArena === 'function') navigationGraphForActiveArena();
    resetFreeRoamCamera(next);
    if (typeof drawTacticalMinimap === 'function') drawTacticalMinimap(true);
    resize();
    return next;
  }

  function freeRoamInspectionPayload() {
    const elevation = arenaElevationAt(freeRoamCamera.x, freeRoamCamera.y);
    const zone = levelZoneAt(freeRoamCamera.x, freeRoamCamera.y);
    return {
      schema: 1,
      build: BUILD_ID,
      exportedAt: new Date().toISOString(),
      mode: 'free-roam-inspection',
      arena: { id: activeArenaId, name: activeArenaMeta().name, theme: activeArenaMeta().theme },
      position: { x: Number(freeRoamCamera.x.toFixed(3)), y: Number(freeRoamCamera.y.toFixed(3)), elevation: Number(elevation.toFixed(3)), angle: Number(freeRoamCamera.angle.toFixed(4)), lookPitch: Number(freeRoamCamera.lookPitch.toFixed(4)), floor: elevation > 0.12 ? 'upper' : 'ground', zone: zone?.name || null },
      collision: { canStand: canStand(freeRoamCamera.x, freeRoamCamera.y, BOT_RADIUS), navigationClear: canStandForNavigation(freeRoamCamera.x, freeRoamCamera.y, BOT_RADIUS) },
      renderer: typeof diagnosticDisplayState === 'function' ? diagnosticDisplayState() : { webglReady: Boolean(glReady), canvasWidth: canvas.width, canvasHeight: canvas.height },
      navigationGraph: typeof navigationGraphSnapshot === 'function' ? navigationGraphSnapshot() : null
    };
  }

  function exportFreeRoamInspection() {
    const payload = freeRoamInspectionPayload();
    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `strikewatch-free-roam-${activeArenaId}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      return true;
    } catch (error) {
      console.error('Free roam export failed', error);
      return false;
    }
  }

  function pruneFeedInPlace(dt) {
    let changed = false;
    for (let i = feed.length - 1; i >= 0; i--) {
      feed[i].life -= dt;
      if (feed[i].life <= 0) {
        feed.splice(i, 1);
        changed = true;
      }
    }
    if (changed) renderFeed();
  }

  // Build 12.195: AUTO spectating now ranks already-computed presentation
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

  function updateSpectatorDeathHandoff(dt) {
    if (roundEnding || matchEnding) {
      spectatorDeathSwitchTimer = 0;
      spectatorDeathSwitchKey = '';
      return false;
    }
    const current = bots[spectatorIndex];
    const livingOwned = bots.filter(bot => bot.team === CAREER_OWNED_TEAM && bot.alive);
    if (!current || current.team !== CAREER_OWNED_TEAM) {
      spectatorDeathSwitchTimer = 0;
      spectatorDeathSwitchKey = '';
      return livingOwned.length ? selectLiving(1) : false;
    }
    if (current.alive || !livingOwned.length) {
      spectatorDeathSwitchTimer = 0;
      spectatorDeathSwitchKey = '';
      return false;
    }
    const key = `${current.team}-${current.slot}`;
    if (spectatorDeathSwitchKey !== key) {
      spectatorDeathSwitchKey = key;
      spectatorDeathSwitchTimer = 2;
      return false;
    }
    spectatorDeathSwitchTimer = Math.max(0, spectatorDeathSwitchTimer - Math.max(0, dt));
    if (spectatorDeathSwitchTimer > 0) return false;
    const switched = selectLiving(1);
    if (switched) {
      combatDebug.spectatorAutoHandoffs++;
      showStatus('SPECTATING NEXT OPERATOR');
    }
    spectatorDeathSwitchKey = '';
    spectatorDeathSwitchTimer = 0;
    return switched;
  }

  function updateMatchStep(dt) {
    beginSimulationWorkWindow();
    simulationClock += dt;
    if (matchEnding) {
      // The final match report and reward crate control the return to HQ.
    } else if (roundEnding) {
      if (typeof updateSponsorRoundBumper === 'function') updateSponsorRoundBumper(dt);
      roundRestartTimer = Math.max(0, roundRestartTimer - dt);
      if (roundRestartTimer <= 0) {
        if (careerBetweenRounds && !betweenRoundTacticsState.resolved) openBetweenRoundTactics();
        else startRound();
      }
    } else if (roundFreezeTimer > 0) {
      roundFreezeTimer = Math.max(0, roundFreezeTimer - dt);
      if (roundFreezeTimer <= 0) addSystemFeed('ROUND LIVE');
    } else {
      roundTime = Math.max(0, roundTime - dt);
      if (typeof updateLiveCommandPulse === 'function') updateLiveCommandPulse(dt);
      measureRuntimeStage('doors', () => updateDynamicDoors(dt));
      measureRuntimeStage('bots', () => {
        for (const b of bots) b.update(dt);
      });

      const blueAlive = teamAliveCount(TEAM_BLUE);
      const redAlive = teamAliveCount(TEAM_RED);
      if (typeof updateCareerMatchContextMoments === 'function') updateCareerMatchContextMoments(blueAlive, redAlive, dt);
      const huntNow = isLateRoundHuntActive();
      if (huntNow !== lateRoundMode) {
        lateRoundMode = huntNow;
        if (huntNow && !lateRoundStatusShown) {
          showStatus(totalAliveCount() === 2 ? 'FINAL DUEL · SEARCHING' : 'ENDGAME SEARCH');
          lateRoundStatusShown = true;
        }
      }
      if (blueAlive === 0 && redAlive === 0) finishRound(null, 'Both teams eliminated');
      else if (blueAlive === 0) finishRound(TEAM_RED, `${matchTeamIdentity(TEAM_BLUE).name} eliminated`);
      else if (redAlive === 0) finishRound(TEAM_BLUE, `${matchTeamIdentity(TEAM_RED).name} eliminated`);
      else if (roundTime <= 0) {
        if (!suddenHuntOvertime) beginSuddenHuntOvertime();
        else resolveTimeLimit();
      }
    }

    if (typeof updateMatchDiagnostics === 'function') measureRuntimeStage('diagnostics', () => updateMatchDiagnostics(dt));
    pruneFeedInPlace(dt);
    updateTracers(dt);
    measureRuntimeStage('sound', () => updateSoundEvents());
    muzzle = Math.max(0, muzzle - dt * 9);
    hitPulse = Math.max(0, hitPulse - dt * 3.6);
    shake = Math.max(0, shake - dt * 3);
    if (statusTimer > 0) {
      statusTimer -= dt;
      if (statusTimer <= 0) hideStatus();
    }

    updateSpectatorDeathHandoff(dt);
    updateAutoSpectatorDirector(dt);
  }

  function update(frameDt, rawFrameSeconds = frameDt) {
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

  function render(now = performance.now()) {
    const crateAnimating = ['opening', 'cycling', 'revealed'].includes(careerCrateState.phase);
    if (appState === 'menu' && !crateAnimating && now - lastMenuRenderAt < 33.3) {
      runtimePerformance.skippedMenuRenders++;
      return false;
    }
    if (appState === 'menu') lastMenuRenderAt = now;
    const cam = appState === 'menu' ? getMenuCamera() : (appState === 'free-roam' ? freeRoamCamera : bots[spectatorIndex]);
    if (cam) renderWebGL(cam);
    if (appState !== 'free-roam') renderCareerCrate3D(now / 1000);
    return true;
  }

  function updateRuntimeQualityGovernor(frameMs, updateMs, renderMs) {
    if (appState !== 'match') {
      runtimeQualityPressure = Math.max(0, runtimeQualityPressure - 2);
      runtimeQualityRecovery = 0;
      return false;
    }
    const frame = Math.max(0, Number(frameMs) || 0);
    const updateCost = Math.max(0, Number(updateMs) || 0);
    const renderCost = Math.max(0, Number(renderMs) || 0);
    const severe = frame > 42 || updateCost > 16 || renderCost > 21;
    const stressed = frame > 24 || updateCost > 8.5 || renderCost > 13.5;
    const healthy = frame < 18.4 && updateCost < 5.8 && renderCost < 8.8;
    runtimeQualityPressure = severe
      ? Math.min(120, runtimeQualityPressure + 5)
      : (stressed ? Math.min(120, runtimeQualityPressure + 1) : Math.max(0, runtimeQualityPressure - 2));
    runtimeQualityRecovery = healthy ? Math.min(1200, runtimeQualityRecovery + 1) : Math.max(0, runtimeQualityRecovery - 3);
    const now = performance.now();
    let changed = false;
    if (runtimeQualityPressure >= 54 && runtimeQualityTier > 0 && now - runtimeQualityLastChangedAt > 3500) {
      runtimeQualityTier--;
      runtimeQualityPressure = 0;
      runtimeQualityRecovery = 0;
      runtimeQualityLastChangedAt = now;
      const targetCap = runtimeQualityTier <= 0 ? 0.84 : 0.94;
      if (renderResolutionTarget > targetCap) {
        renderResolutionTarget = targetCap;
        renderResolutionScale = targetCap;
        renderResolutionChanges++;
        resize();
      }
      changed = true;
    } else if (runtimeQualityRecovery >= 780 && runtimeQualityTier < 2 && now - runtimeQualityLastChangedAt > 10000) {
      runtimeQualityTier++;
      runtimeQualityRecovery = 0;
      runtimeQualityPressure = 0;
      runtimeQualityLastChangedAt = now;
      changed = true;
    }
    return changed;
  }

  function updateAdaptiveRenderResolution(frameMs, renderMs) {
    if (appState !== 'match') {
      renderPerformancePressure = 0;
      renderPerformanceRecovery = 0;
      return;
    }
    const portraitWindowed = viewMode === 'windowed' && window.innerHeight >= window.innerWidth;
    const minimum = runtimeQualityTier <= 0
      ? (portraitWindowed ? 0.62 : 0.70)
      : (runtimeQualityTier === 1 ? (portraitWindowed ? 0.68 : 0.76) : (portraitWindowed ? 0.72 : 0.80));
    const slowFrame = frameMs > 23.5 || renderMs > 17.5;
    const fastFrame = frameMs < 17.8 && renderMs < 11.8;
    renderPerformancePressure = slowFrame ? renderPerformancePressure + 1 : Math.max(0, renderPerformancePressure - 2);
    renderPerformanceRecovery = fastFrame ? renderPerformanceRecovery + 1 : Math.max(0, renderPerformanceRecovery - 1);
    let changed = false;
    if (renderPerformancePressure >= 28 && renderResolutionTarget > minimum) {
      renderResolutionTarget = Math.max(minimum, renderResolutionTarget - 0.08);
      renderPerformancePressure = 0;
      renderPerformanceRecovery = 0;
      changed = true;
    } else if (renderPerformanceRecovery >= 240 && renderResolutionTarget < 1) {
      renderResolutionTarget = Math.min(1, renderResolutionTarget + 0.05);
      renderPerformanceRecovery = 0;
      changed = true;
    }
    // Resize the drawing buffer only when the quality tier changes. Smoothly
    // resizing it every animation frame causes repeated WebGL reallocations,
    // which can create the very portrait stutter this governor is intended to
    // remove on high-DPR mobile displays.
    if (changed) {
      renderResolutionScale = renderResolutionTarget;
      renderResolutionChanges++;
      resize();
    }
  }

  function recordRuntimePerformance(frameMs, updateMs, renderMs, frameIntervalMs = frameMs) {
    const alpha = 0.06;
    const intervalMs = Math.max(0, Number(frameIntervalMs) || 0);
    runtimePerformance.frames++;
    runtimePerformance.frameMs = runtimePerformance.frameMs ? lerp(runtimePerformance.frameMs, frameMs, alpha) : frameMs;
    runtimePerformance.frameIntervalMs = runtimePerformance.frameIntervalMs ? lerp(runtimePerformance.frameIntervalMs, intervalMs, alpha) : intervalMs;
    runtimePerformance.updateMs = runtimePerformance.updateMs ? lerp(runtimePerformance.updateMs, updateMs, alpha) : updateMs;
    runtimePerformance.renderMs = runtimePerformance.renderMs ? lerp(runtimePerformance.renderMs, renderMs, alpha) : renderMs;
    runtimePerformance.peakFrameMs = Math.max(runtimePerformance.peakFrameMs, frameMs);
    runtimePerformance.peakFrameIntervalMs = Math.max(runtimePerformance.peakFrameIntervalMs, intervalMs);
    if (frameMs > 34) runtimePerformance.longFrames++;
    if (intervalMs > 34) runtimePerformance.stutterFrames++;
    if (intervalMs > 50) runtimePerformance.severeFrames++;
    runtimeStatsPublishCountdown--;
    if (runtimeStatsPublishCountdown <= 0 && document.body) {
      runtimeStatsPublishCountdown = 30;
      document.body.dataset.runtimeFrameMs = runtimePerformance.frameMs.toFixed(2);
      document.body.dataset.runtimeFrameIntervalMs = runtimePerformance.frameIntervalMs.toFixed(2);
      document.body.dataset.runtimeUpdateMs = runtimePerformance.updateMs.toFixed(2);
      document.body.dataset.runtimeRenderMs = runtimePerformance.renderMs.toFixed(2);
      document.body.dataset.runtimeMatchSimulationMs = (Number(runtimeLastFrameStages.matchSimulation) || 0).toFixed(2);
      document.body.dataset.runtimeBotsMs = (Number(runtimeLastFrameStages.bots) || 0).toFixed(2);
      document.body.dataset.runtimeDiagnosticsMs = (Number(runtimeLastFrameStages.diagnostics) || 0).toFixed(2);
      document.body.dataset.runtimeDoorsMs = (Number(runtimeLastFrameStages.doors) || 0).toFixed(2);
      document.body.dataset.runtimeSoundMs = (Number(runtimeLastFrameStages.sound) || 0).toFixed(2);
      document.body.dataset.runtimeHudMs = (Number(runtimeLastFrameStages.hud) || 0).toFixed(2);
      document.body.dataset.runtimeMinimapMs = (Number(runtimeLastFrameStages.minimap) || 0).toFixed(2);
      document.body.dataset.runtimeLongFrames = String(runtimePerformance.longFrames);
      document.body.dataset.runtimeStutterFrames = String(runtimePerformance.stutterFrames);
      document.body.dataset.runtimeSevereFrames = String(runtimePerformance.severeFrames);
      document.body.dataset.runtimeMatchClockDebtMs = (matchClockState.accumulatorSeconds * 1000).toFixed(2);
      document.body.dataset.runtimeMatchClockSteps = String(matchClockState.lastFrameSteps);
      document.body.dataset.runtimeMatchClockCatchUpSteps = String(matchClockState.catchUpSteps);
      document.body.dataset.runtimeMatchClockDroppedMs = (matchClockState.totalDroppedSimulationSeconds * 1000).toFixed(2);
      document.body.dataset.runtimeMatchClockBackgroundGaps = String(matchClockState.backgroundGaps);
    }
    updateRuntimeQualityGovernor(frameMs, updateMs, renderMs);
    updateAdaptiveRenderResolution(frameMs, renderMs);
    if (typeof diagnosticRecordPerformanceFrame === 'function') diagnosticRecordPerformanceFrame(intervalMs, frameMs, updateMs, renderMs, runtimeLastFrameStages);
  }

  function loop(now) {
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

  function chooseSpectator(direction) {
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

  prevBtn.addEventListener('click', () => chooseSpectator(-1));
  nextBtn.addEventListener('click', () => chooseSpectator(1));
  autoBtn.addEventListener('click', toggleAutoSpectate);
  if (matchSpeedBtn) matchSpeedBtn.addEventListener('click', toggleMatchSpeed);
  if (portraitPrevBtn) portraitPrevBtn.addEventListener('click', () => chooseSpectator(-1));
  if (portraitNextBtn) portraitNextBtn.addEventListener('click', () => chooseSpectator(1));
  if (portraitAutoBtn) portraitAutoBtn.addEventListener('click', toggleAutoSpectate);
  if (portraitSpeedBtn) portraitSpeedBtn.addEventListener('click', toggleMatchSpeed);
  if (audioBtn) audioBtn.addEventListener('click', () => { toggleAudio(); });
  if (portraitAudioBtn) portraitAudioBtn.addEventListener('click', () => { toggleAudio(); });
  if (minimapToggleBtn) minimapToggleBtn.addEventListener('click', () => { if (typeof toggleTacticalMinimap === 'function') toggleTacticalMinimap(); });
  if (landscapeReturnPortraitBtn) landscapeReturnPortraitBtn.addEventListener('click', () => { restoreWindowedView(); });
  if (tacticalMinimapCloseBtn) tacticalMinimapCloseBtn.addEventListener('click', () => { if (typeof setTacticalMinimapVisible === 'function') setTacticalMinimapVisible(false); });
  if (diagnosticExportBtn) {
    let diagnosticHoldTimer = 0;
    let diagnosticHoldTriggered = false;
    const clearDiagnosticHold = () => {
      if (diagnosticHoldTimer) clearTimeout(diagnosticHoldTimer);
      diagnosticHoldTimer = 0;
    };
    diagnosticExportBtn.addEventListener('pointerdown', event => {
      diagnosticHoldTriggered = false;
      clearDiagnosticHold();
      diagnosticExportBtn.setPointerCapture?.(event.pointerId);
      diagnosticHoldTimer = setTimeout(() => {
        diagnosticHoldTriggered = true;
        if (typeof toggleDiagnosticOverlay === 'function') toggleDiagnosticOverlay();
        if (navigator.vibrate) navigator.vibrate(24);
      }, 650);
    });
    diagnosticExportBtn.addEventListener('pointerup', () => {
      clearDiagnosticHold();
      if (!diagnosticHoldTriggered && typeof exportMatchDiagnostics === 'function') exportMatchDiagnostics();
      diagnosticHoldTriggered = false;
    });
    diagnosticExportBtn.addEventListener('pointercancel', clearDiagnosticHold);
    diagnosticExportBtn.addEventListener('click', event => {
      if (event.detail === 0 && typeof exportMatchDiagnostics === 'function') exportMatchDiagnostics();
    });
    diagnosticExportBtn.addEventListener('contextmenu', event => event.preventDefault());
  }
  if (freeRoamExitBtn) freeRoamExitBtn.addEventListener('click', exitFreeRoam);
  if (freeRoamMapBtn) freeRoamMapBtn.addEventListener('click', () => { if (typeof toggleTacticalMinimap === 'function') toggleTacticalMinimap(); });
  if (freeRoamExportBtn) freeRoamExportBtn.addEventListener('click', exportFreeRoamInspection);
  document.querySelectorAll('[data-free-roam-move]').forEach(button => {
    const direction = String(button.dataset.freeRoamMove || '');
    const release = event => {
      if (event?.pointerId != null && button.hasPointerCapture?.(event.pointerId)) button.releasePointerCapture?.(event.pointerId);
      freeRoamMoveInputs.delete(direction);
      button.classList.remove('active');
    };
    button.addEventListener('pointerdown', event => {
      if (appState !== 'free-roam') return;
      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      freeRoamMoveInputs.add(direction);
      button.classList.add('active');
    });
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', () => {
      freeRoamMoveInputs.delete(direction);
      button.classList.remove('active');
    });
  });
  if (freeRoamLookPadEl) {
    const finishFreeRoamLook = event => {
      if (event?.pointerId != null && freeRoamLookPadEl.hasPointerCapture?.(event.pointerId)) freeRoamLookPadEl.releasePointerCapture?.(event.pointerId);
      freeRoamLookPointerId = null;
      freeRoamLookPadEl.classList.remove('active');
    };
    freeRoamLookPadEl.addEventListener('pointerdown', event => {
      if (appState !== 'free-roam') return;
      event.preventDefault();
      freeRoamLookPointerId = event.pointerId;
      freeRoamLookLastX = event.clientX;
      freeRoamLookLastY = event.clientY;
      freeRoamLookPadEl.setPointerCapture?.(event.pointerId);
      freeRoamLookPadEl.classList.add('active');
    });
    freeRoamLookPadEl.addEventListener('pointermove', event => {
      if (appState !== 'free-roam' || event.pointerId !== freeRoamLookPointerId) return;
      event.preventDefault();
      const dx = event.clientX - freeRoamLookLastX;
      const dy = event.clientY - freeRoamLookLastY;
      freeRoamLookLastX = event.clientX;
      freeRoamLookLastY = event.clientY;
      freeRoamCamera.angle = (freeRoamCamera.angle + dx * 0.008) % (Math.PI * 2);
      freeRoamCamera.lookPitch = clamp(freeRoamCamera.lookPitch - dy * 0.006, -0.78, 0.78);
      updateFreeRoamPresentation();
    });
    freeRoamLookPadEl.addEventListener('pointerup', finishFreeRoamLook);
    freeRoamLookPadEl.addEventListener('pointercancel', finishFreeRoamLook);
    freeRoamLookPadEl.addEventListener('lostpointercapture', () => {
      freeRoamLookPointerId = null;
      freeRoamLookPadEl.classList.remove('active');
    });
  }
  menuBtn.addEventListener('click', openPauseMenu);
  if (portraitMenuBtn) portraitMenuBtn.addEventListener('click', openPauseMenu);
  if (maximizeViewBtn) maximizeViewBtn.addEventListener('click', maximizeGameView);
  if (restoreViewBtn) restoreViewBtn.addEventListener('click', restoreWindowedView);
  if (uiToggleBtn) uiToggleBtn.addEventListener('click', toggleUiButtons);
  if (showUiBtn) showUiBtn.addEventListener('click', () => setUiButtonsHidden(false, true));
  if (roundPanelEl) roundPanelEl.addEventListener('click', () => { if (scoreboardOpen) closeScoreboard(); else openScoreboard(); });
  if (scoreboardCloseBtn) scoreboardCloseBtn.addEventListener('click', closeScoreboard);
  if (scoreboardOverlayEl) {
    scoreboardOverlayEl.addEventListener('click', event => {
      const row = event.target.closest?.('[data-scoreboard-team][data-scoreboard-slot]');
      if (row) {
        selectScoreboardOperator(row.dataset.scoreboardTeam, row.dataset.scoreboardSlot);
        return;
      }
      if (event.target === scoreboardOverlayEl) closeScoreboard();
    });
    scoreboardOverlayEl.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const row = event.target.closest?.('[data-scoreboard-team][data-scoreboard-slot]');
      if (!row) return;
      event.preventDefault();
      selectScoreboardOperator(row.dataset.scoreboardTeam, row.dataset.scoreboardSlot);
    });
  }
  if (managerCalendarBtn) managerCalendarBtn.addEventListener('click', () => setMenuRoute('calendar'));
  if (managerGoldBtn) managerGoldBtn.addEventListener('click', () => { if (careerState.created) setMenuRoute('gold'); });
  if (managerHelpToggleBtn) managerHelpToggleBtn.addEventListener('click', toggleMobilePageHelp);
  startMatchBtn.addEventListener('click', startNewMatch);
  resumeBtn.addEventListener('click', resumeMatch);
  if (returnToMatchBtn) returnToMatchBtn.addEventListener('click', resumeMatch);
  if (menuMatchPauseBtn) menuMatchPauseBtn.addEventListener('click', toggleMatchSimulationPause);
  if (menuMatchSpeedBtn) menuMatchSpeedBtn.addEventListener('click', toggleMatchSpeed);
  if (menuEndDayBtn) menuEndDayBtn.addEventListener('click', () => { if (typeof advanceCareerDay === 'function') advanceCareerDay(); });
  if (managerMailBtn) managerMailBtn.addEventListener('click', () => { if (careerState.created) setMenuRoute('mail'); });
  if (menuBackBtn) menuBackBtn.addEventListener('click', () => navigateMenuHistory(-1));
  if (menuForwardBtn) menuForwardBtn.addEventListener('click', () => navigateMenuHistory(1));
  exitToMenuBtn.addEventListener('click', exitToMainMenu);
  menuTabs.forEach(btn => btn.addEventListener('click', () => {
    const sectionId = btn.dataset.section || 'operations';
    if (mobileNavigationEnabled()) {
      const access = typeof progressiveSectionAccess === 'function' ? progressiveSectionAccess(sectionId) : { state: 'ready' };
      if (sectionId === menuSectionForRoute() || access.state === 'locked') {
        openMobileNavigation(sectionId);
        return;
      }
    }
    setMenuSection(sectionId);
  }));
  if (mobileNavigationOpenBtn) mobileNavigationOpenBtn.addEventListener('click', () => openMobileNavigation(menuSectionForRoute()));
  if (mobileNavigationCloseBtn) mobileNavigationCloseBtn.addEventListener('click', () => closeMobileNavigation());
  if (mobileNavigationSearchEl) mobileNavigationSearchEl.addEventListener('input', event => updateMobileNavigationSearch(event.target.value));
  if (mobileNavigationSearchClearBtn) mobileNavigationSearchClearBtn.addEventListener('click', () => {
    if (mobileNavigationSearchEl) mobileNavigationSearchEl.value = '';
    updateMobileNavigationSearch('');
    mobileNavigationSearchEl?.focus({ preventScroll: true });
  });
  if (mobileNavigationOverlayEl) {
    mobileNavigationOverlayEl.addEventListener('click', event => {
      const sectionButton = event.target.closest?.('[data-mobile-nav-section]');
      if (sectionButton) { selectMobileNavigationSection(sectionButton.dataset.mobileNavSection); return; }
      const actionButton = event.target.closest?.('[data-mobile-nav-action]');
      if (actionButton?.dataset.mobileNavAction === 'resume') { closeMobileNavigation({ restoreFocus: false }); resumeMatch(); return; }
      if (actionButton?.dataset.mobileNavAction === 'exit') { closeMobileNavigation({ restoreFocus: false }); exitToMainMenu(); return; }
      const routeButton = event.target.closest?.('[data-mobile-nav-route]');
      if (routeButton && !routeButton.disabled) setMenuRoute(routeButton.dataset.mobileNavRoute);
    });
    mobileNavigationOverlayEl.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); closeMobileNavigation(); return; }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(mobileNavigationOverlayEl.querySelectorAll('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(node => !node.hidden && node.getClientRects().length);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  }
  window.addEventListener('resize', () => { if (!mobileNavigationEnabled()) closeMobileNavigation({ restoreFocus: false }); }, { passive: true });
  if (menuRouteLocatorEl) menuRouteLocatorEl.addEventListener('click', event => { if (typeof handleMenuRouteLocatorClick === 'function') handleMenuRouteLocatorClick(event); });
  if (menuSubnavEl) {
    menuSubnavEl.addEventListener('click', event => {
      const actionButton = event.target.closest('[data-management-action-id]');
      if (actionButton && typeof openManagementAction === 'function') { openManagementAction(actionButton.dataset.managementActionId); return; }
      const routeButton = event.target.closest('[data-menu-route]');
      if (routeButton) setMenuRoute(routeButton.dataset.menuRoute);
    });
    menuSubnavEl.addEventListener('scroll', updateMenuSubnavOverflow, { passive: true });
  }
  function scrollMenuSubnav(direction) {
    if (!menuSubnavEl) return;
    const distance = Math.max(140, Math.round(menuSubnavEl.clientWidth * 0.72));
    menuSubnavEl.scrollBy({ left: direction * distance, behavior: 'smooth' });
  }
  if (menuSubnavLeftBtn) menuSubnavLeftBtn.addEventListener('click', () => scrollMenuSubnav(-1));
  if (menuSubnavRightBtn) menuSubnavRightBtn.addEventListener('click', () => scrollMenuSubnav(1));
  if (menuContentEl) {
    menuContentEl.addEventListener('click', event => {
      if (typeof handleMobileFirstMatchGuideClick === 'function' && handleMobileFirstMatchGuideClick(event)) return;
      if (typeof handleInterfaceBackgroundClick === 'function' && handleInterfaceBackgroundClick(event)) return;
      if (typeof handleFreeRoamConfigurationClick === 'function' && handleFreeRoamConfigurationClick(event)) return;
      if (typeof handleWorkflowIntegrityClick === 'function' && handleWorkflowIntegrityClick(event)) return;
      if (typeof handleCommandIndexClick === 'function' && handleCommandIndexClick(event)) return;
      if (typeof handleMenuContextTutorialClick === 'function' && handleMenuContextTutorialClick(event)) return;
      handleCareerMenuClick(event);
    });
    menuContentEl.addEventListener('input', event => {
      if (typeof handleInterfaceBackgroundInput === 'function' && handleInterfaceBackgroundInput(event)) return;
      if (typeof handleCommandIndexInput === 'function' && handleCommandIndexInput(event)) return;
      handleCareerMenuInput(event);
    });
    menuContentEl.addEventListener('change', event => {
      if (typeof handleInterfaceBackgroundInput === 'function' && handleInterfaceBackgroundInput(event)) return;
      if (typeof handleClubOperationsInput === 'function' && handleClubOperationsInput(event)) return;
      if (typeof handleDevelopmentInput === 'function' && handleDevelopmentInput(event)) return;
      handleCareerMenuInput(event);
    });
    menuContentEl.addEventListener('pointerdown', handleCareerWeaponViewerPointerDown);
    menuContentEl.addEventListener('pointerdown', handleCareerArmourViewerPointerDown);
    menuContentEl.addEventListener('wheel', handleCareerWeaponViewerWheel, { passive: false });
    menuContentEl.addEventListener('wheel', handleCareerArmourViewerWheel, { passive: false });
  }
  window.addEventListener('pointermove', handleCareerWeaponViewerPointerMove, { passive: false });
  window.addEventListener('pointermove', handleCareerArmourViewerPointerMove, { passive: false });
  window.addEventListener('pointerup', handleCareerWeaponViewerPointerUp, { passive: true });
  window.addEventListener('pointerup', handleCareerArmourViewerPointerUp, { passive: true });
  window.addEventListener('pointercancel', handleCareerWeaponViewerPointerUp, { passive: true });
  window.addEventListener('pointercancel', handleCareerArmourViewerPointerUp, { passive: true });
  // Capture the earliest genuine interaction so mobile browsers can resume a
  // suspended Web Audio context before the same gesture changes screens.
  document.addEventListener('pointerdown', resumeAudioFromGesture, { capture: true, passive: true });
  document.addEventListener('touchstart', resumeAudioFromGesture, { capture: true, passive: true });
  document.addEventListener('touchend', resumeAudioFromGesture, { capture: true, passive: true });
  document.addEventListener('click', resumeAudioFromGesture, { capture: true, passive: true });
  document.addEventListener('keydown', resumeAudioFromGesture, { capture: true });
  const refreshCommandViewport = () => {
    if (appState === 'menu' && typeof stabiliseMenuViewportAfterRoute === 'function') stabiliseMenuViewportAfterRoute(menuTab);
  };
  window.addEventListener('orientationchange', refreshCommandViewport, { passive: true });
  window.addEventListener('resize', refreshCommandViewport, { passive: true });
  window.visualViewport?.addEventListener('resize', refreshCommandViewport, { passive: true });
  window.visualViewport?.addEventListener('scroll', refreshCommandViewport, { passive: true });
  if (betweenRoundTacticsEl) betweenRoundTacticsEl.addEventListener('click', event => {
    const option = event.target.closest?.('[data-between-round-type][data-between-round-value]');
    if (option) {
      selectBetweenRoundTactic(option.dataset.betweenRoundType, option.dataset.betweenRoundValue);
      return;
    }
  });
  if (betweenRoundKeepBtn) betweenRoundKeepBtn.addEventListener('click', () => commitBetweenRoundTactics(false));
  if (betweenRoundApplyBtn) betweenRoundApplyBtn.addEventListener('click', () => commitBetweenRoundTactics(true));
  if (commandPulseBtn) commandPulseBtn.addEventListener('click', () => openLiveCommandPulsePanel());
  if (portraitCommandPulseBtn) portraitCommandPulseBtn.addEventListener('click', () => openLiveCommandPulsePanel());
  if (commandPulseCloseBtn) commandPulseCloseBtn.addEventListener('click', () => closeLiveCommandPulsePanel());
  if (commandPulseOptionsEl) commandPulseOptionsEl.addEventListener('click', event => {
    const option = event.target.closest?.('[data-live-command]');
    if (!option) return;
    event.preventDefault();
    issueLiveCommandPulse(String(option.dataset.liveCommand || ''));
  });
  if (newPlayerIntroStartBtn) newPlayerIntroStartBtn.addEventListener('click', startNewPlayerDemoMatch);
  if (newPlayerIntroSkipBtn) newPlayerIntroSkipBtn.addEventListener('click', () => closeNewPlayerIntro(true));
  if (newPlayerDemoNextBtn) newPlayerDemoNextBtn.addEventListener('click', advanceNewPlayerDemo);
  if (newPlayerDemoSkipBtn) newPlayerDemoSkipBtn.addEventListener('click', skipNewPlayerDemo);
  if (careerReportOverlayEl) careerReportOverlayEl.addEventListener('click', event => {
    const coaching = event.target.closest?.('[data-coaching-route]');
    if (coaching && typeof openTacticalCoachingRecommendation === 'function') openTacticalCoachingRecommendation(coaching);
  });
  if (careerMatchIntroStartBtn) careerMatchIntroStartBtn.addEventListener('click', dismissCareerMatchIntro);
  if (careerReportContinueBtn) careerReportContinueBtn.addEventListener('click', continueCareerRoundReport);
  if (careerReportDiagnosticExportBtn) careerReportDiagnosticExportBtn.addEventListener('click', () => { if (typeof exportLastCompletedMatchDiagnostics === 'function') exportLastCompletedMatchDiagnostics(); });
  if (careerCrateOpenBtn) careerCrateOpenBtn.addEventListener('click', beginCareerCrateOpen);
  if (careerCrateClaimBtn) careerCrateClaimBtn.addEventListener('click', claimCareerCrate);
  if (matchmakingCancelBtn) matchmakingCancelBtn.addEventListener('click', cancelMatchmaking);
  if (deploymentCancelBtn) deploymentCancelBtn.addEventListener('click', cancelMatchmaking);
  if (deploymentConfirmBtn) deploymentConfirmBtn.addEventListener('click', confirmDeploymentSelection);
  if (deploymentMapGridEl) deploymentMapGridEl.addEventListener('click', event => {
    const choice = event.target.closest('[data-deployment-map]');
    if (choice) chooseDeploymentArena(choice.dataset.deploymentMap);
  });
  if (teamNoteCloseBtn) teamNoteCloseBtn.addEventListener('click', () => { if (typeof closeTeamNoteModal === 'function') closeTeamNoteModal(); });
  if (teamNoteOverlayEl) teamNoteOverlayEl.addEventListener('click', event => {
    if (event.target === teamNoteOverlayEl) {
      if (typeof closeTeamNoteModal === 'function') closeTeamNoteModal();
      return;
    }
    if (typeof handleTeamNoteModalAction === 'function' && handleTeamNoteModalAction(event)) return;
    const managementDismiss = event.target.closest?.('[data-management-modal-dismiss]');
    if (managementDismiss) {
      if (typeof closeTeamNoteModal === 'function') closeTeamNoteModal();
      return;
    }
    const managementRoute = event.target.closest?.('[data-management-modal-route]');
    if (managementRoute) {
      const route = managementRoute.dataset.managementModalRoute;
      if (typeof closeTeamNoteModal === 'function') closeTeamNoteModal();
      if (route) setMenuRoute(route);
      return;
    }
    if (typeof handleClubMailModalClick === 'function' && handleClubMailModalClick(event)) return;
  });
  canvas.addEventListener('pointerup', e => {
    if (appState !== 'match') return;
    ensureAudio();
    const localX = Number.isFinite(e.offsetX) ? e.offsetX : canvas.clientWidth * 0.5;
    const ratio = localX / Math.max(1, canvas.clientWidth);
    if (ratio < 0.45) chooseSpectator(-1);
    else if (ratio > 0.55) chooseSpectator(1);
  });
  document.addEventListener('keydown', event => {
    resumeAudioFromGesture();
    const key = String(event.key || '').toLowerCase();
    if (appState === 'free-roam') {
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(key)) {
        event.preventDefault();
        freeRoamPressedKeys.add(key);
        return;
      }
      if (key === 'm') {
        event.preventDefault();
        if (typeof toggleTacticalMinimap === 'function') toggleTacticalMinimap();
        return;
      }
      if (key === 'e') {
        event.preventDefault();
        exportFreeRoamInspection();
        return;
      }
      if (key === 'escape') {
        event.preventDefault();
        exitFreeRoam();
        return;
      }
      return;
    }
    if (key === 'escape' && liveCommandPulseState?.open) {
      event.preventDefault();
      closeLiveCommandPulsePanel();
      return;
    }
    if (key === 'c' && appState === 'match') {
      event.preventDefault();
      openLiveCommandPulsePanel();
      return;
    }
    if (key === 'm' && appState === 'match' && typeof toggleTacticalMinimap === 'function') {
      event.preventDefault();
      toggleTacticalMinimap();
      return;
    }
    if (key === 'd' && appState === 'match' && typeof toggleDiagnosticOverlay === 'function') {
      event.preventDefault();
      toggleDiagnosticOverlay();
      return;
    }
    if (key === 'escape' && typeof tacticalMinimapVisible !== 'undefined' && tacticalMinimapVisible && typeof setTacticalMinimapVisible === 'function') {
      event.preventDefault();
      setTacticalMinimapVisible(false);
      return;
    }
    const teamNoteOpen = Boolean(teamNoteOverlayEl && !teamNoteOverlayEl.hidden);
    const betweenRoundOpen = Boolean(betweenRoundTacticsEl && !betweenRoundTacticsEl.hidden && betweenRoundTacticsState.open);
    const modalCareerFlow = careerReportState.phase === 'visible' || ['closed', 'opening', 'cycling', 'revealed'].includes(careerCrateState.phase);
    if (betweenRoundOpen) {
      if (key === 'escape') {
        event.preventDefault();
        commitBetweenRoundTactics(false);
      } else if (key === 'enter') {
        event.preventDefault();
        if (betweenRoundChangeTypes().length) commitBetweenRoundTactics(true);
        else commitBetweenRoundTactics(false);
      }
      return;
    }
    if (teamNoteOpen) {
      if (key === 'tab' && typeof trapTeamNoteModalFocus === 'function') {
        trapTeamNoteModalFocus(event);
      } else if (key === 'escape' && typeof closeTeamNoteModal === 'function') {
        event.preventDefault();
        closeTeamNoteModal();
      }
      return;
    }
    if (modalCareerFlow) {
      if (key === 'enter' && careerReportState.phase === 'visible') continueCareerRoundReport();
      return;
    }
    if (appState === 'menu') {
      if (matchmakingState.active || deploymentSelectionState.active) {
        if (key === 'escape') {
          event.preventDefault();
          cancelMatchmaking();
        }
        return;
      }
      if ((key === 'p' || key === ' ') && liveMatchMenuActive()) {
        event.preventDefault();
        toggleMatchSimulationPause();
        return;
      }
      if (key === 'f' && liveMatchMenuActive()) {
        event.preventDefault();
        toggleMatchSpeed();
        return;
      }
      if (key === 'escape' && canResumeMatch) {
        event.preventDefault();
        resumeMatch();
      }
      return;
    }
    if (key === 'tab') {
      event.preventDefault();
      if (scoreboardOpen) closeScoreboard(); else openScoreboard();
    } else if (key === 'h' || key === 'u') {
      event.preventDefault();
      toggleUiButtons();
    } else if (key === 'f') {
      event.preventDefault();
      toggleMatchSpeed();
    } else if (key === 'escape') {
      event.preventDefault();
      openPauseMenu();
    }
  });
  document.addEventListener('keyup', event => {
    const key = String(event.key || '').toLowerCase();
    freeRoamPressedKeys.delete(key);
  });
  window.addEventListener('blur', () => {
    freeRoamPressedKeys.clear();
    freeRoamMoveInputs.clear();
    document.querySelectorAll('[data-free-roam-move].active').forEach(button => button.classList.remove('active'));
  });
  window.addEventListener('resize', () => {
    syncViewMode();
    resize();
    resizeCareerCrateRenderer();
    updateMenuSubnavOverflow();
    if (typeof updateMatchCommentaryPresentation === 'function') updateMatchCommentaryPresentation();
  }, { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(() => {
    syncViewMode();
    resize();
    resizeCareerCrateRenderer();
    if (typeof updateMatchCommentaryPresentation === 'function') updateMatchCommentaryPresentation();
    queueAudioRecovery(80);
  }, 120), { passive: true });
  document.addEventListener('fullscreenchange', () => {
    syncViewMode();
    resize();
    resizeCareerCrateRenderer();
    queueAudioRecovery(260);
  });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    glReady = false;
    document.body.dataset.renderer = 'lost';
    showStatus('3D RENDERER PAUSED');
  });
  canvas.addEventListener('webglcontextrestored', () => {
    initWebGL();
    resize();
  });
  document.addEventListener('visibilitychange', () => {
    lastTime = performance.now();
    if (document.visibilityState === 'visible') recoverAudioAfterVisibility();
    else updateAudioButton();
  });
  window.addEventListener('pageshow', () => { lastTime = performance.now(); recoverAudioAfterVisibility(); }, { passive: true });
  window.addEventListener('focus', recoverAudioAfterVisibility, { passive: true });

  function auditCareerStateIntegrity() {
    const issues = [];
    const note = (code, detail) => issues.push({ code, detail });
    const finite = (value, code) => {
      if (!Number.isFinite(Number(value))) note(code, `Expected a finite number, received ${String(value)}.`);
    };
    const duplicateValues = values => {
      const seen = new Set();
      return values.filter(value => {
        const key = String(value || '');
        if (!key || seen.has(key)) return true;
        seen.add(key);
        return false;
      });
    };

    finite(careerState.credits, 'finance.credits');
    finite(careerState.wageBudget, 'finance.wageBudget');
    const financeLoan = typeof clubFinanceLoanState === 'function' ? clubFinanceLoanState() : careerState.financeLoan;
    if (!financeLoan || typeof financeLoan !== 'object') note('finance.loan', 'The foundation loan state is missing.');
    else {
      ['principal','interest','totalRepayable','balance','installment','intervalWeeks','paymentCount','paymentsProcessed','arrears','nextPaymentWeek'].forEach(key => finite(financeLoan[key], `finance.loan.${key}`));
      if (Number(financeLoan.balance) < 0 || Number(financeLoan.balance) > Number(financeLoan.totalRepayable)) note('finance.loanBalance', 'The foundation loan balance is outside the valid repayment range.');
      if (Number(financeLoan.arrears) < 0 || Number(financeLoan.arrears) > Number(financeLoan.balance)) note('finance.loanArrears', 'The foundation loan arrears exceed the outstanding balance.');
      if (Number(financeLoan.intervalWeeks) < 1 || Number(financeLoan.nextPaymentWeek) < 1) note('finance.loanSchedule', 'The foundation loan repayment schedule is invalid.');
    }
    finite(careerState.week, 'calendar.week');
    finite(careerState.level, 'development.teamLevel');
    finite(careerState.xp, 'development.teamXp');

    const squad = Array.isArray(careerState.squad) ? careerState.squad : [];
    if (!Array.isArray(careerState.squad)) note('squad.type', 'Squad is not an array.');
    if (squad.length > TEAM_MAX_SQUAD) note('squad.limit', `${squad.length} players exceed the ${TEAM_MAX_SQUAD}-player limit.`);
    const duplicateSquadIds = duplicateValues(squad.map(player => player?.id));
    if (duplicateSquadIds.length) note('squad.ids', 'Squad contains missing or duplicate player identifiers.');
    const inventoryList = Array.isArray(careerState.inventory) ? careerState.inventory : [];
    const inventory = new Set(inventoryList);
    const weaponClaimCounts = new Map();
    squad.forEach((player, index) => {
      if (!player || typeof player !== 'object') {
        note('squad.player', `Squad slot ${index + 1} is not a valid player object.`);
        return;
      }
      for (const key of Object.keys(CAREER_STAT_DEFS)) {
        const value = Number(player.stats?.[key]);
        if (!Number.isFinite(value) || value < 0 || value > CAREER_MAX_STAT) note('squad.stats', `${player.name || player.id} has an invalid ${key} value.`);
      }
      const primaryWeaponId = typeof careerPlayerPrimaryWeaponId === 'function' ? careerPlayerPrimaryWeaponId(player) : (player.equippedPrimaryWeaponId || null);
      const sidearmWeaponId = typeof careerPlayerSidearmId === 'function' ? careerPlayerSidearmId(player) : (player.equippedSidearmId || 'scrap-p12');
      if (primaryWeaponId && (!inventory.has(primaryWeaponId) || !careerWeaponIsPrimary(primaryWeaponId))) note('squad.primaryLoadout', `${player.name || player.id} has equipped an unavailable primary (${primaryWeaponId}).`);
      if (!sidearmWeaponId || !inventory.has(sidearmWeaponId) || !careerWeaponIsSidearm(sidearmWeaponId)) note('squad.sidearmLoadout', `${player.name || player.id} has equipped an unavailable sidearm (${sidearmWeaponId || 'missing'}).`);
      for (const weaponId of [primaryWeaponId, sidearmWeaponId]) {
        if (weaponId && weaponId !== 'scrap-p12') weaponClaimCounts.set(weaponId, (weaponClaimCounts.get(weaponId) || 0) + 1);
      }
      ['wage','value','fee','contractWeeks','fatigue','happiness','morale','matchSharpness','form'].forEach(key => finite(player[key], `squad.${key}`));
      if (Number(player.contractWeeks) < 0) note('squad.contractWeeks', `${player.name || player.id} has a negative contract duration.`);
    });
    for (const [weaponId, assigned] of weaponClaimCounts.entries()) {
      const owned = inventoryList.reduce((count, entry) => count + (entry === weaponId ? 1 : 0), 0);
      if (assigned > owned) note('squad.loadoutClaim', `${weaponId} has ${assigned} assignments but only ${owned} owned club copies.`);
    }

    const calendar = careerState.calendar || {};
    finite(calendar.absoluteDay, 'calendar.absoluteDay');
    finite(calendar.nextLeagueDay, 'calendar.nextLeagueDay');
    if (Number.isFinite(Number(calendar.absoluteDay)) && Number(calendar.dayOfWeek) !== Number(calendar.absoluteDay) % 7) {
      note('calendar.dayOfWeek', 'The displayed weekday does not match the absolute career day.');
    }
    if (Number(calendar.nextLeagueDay) < Number(calendar.absoluteDay) && !(typeof leagueSeasonComplete === 'function' && leagueSeasonComplete())) {
      note('calendar.fixtureDate', 'The next league date is earlier than the current career day.');
    }

    const mail = Array.isArray(careerState.mail) ? careerState.mail : [];
    if (duplicateValues(mail.map(item => item?.id)).length) note('mail.ids', 'Inbox messages contain missing or duplicate identifiers.');
    const mailIds = new Set(mail.map(item => item?.id));
    const decisions = careerState.decisions?.items;
    if (decisions != null && !Array.isArray(decisions)) note('decisions.type', 'Decision items are not stored as an array.');
    const decisionItems = Array.isArray(decisions) ? decisions : [];
    if (duplicateValues(decisionItems.map(item => item?.id)).length) note('decisions.ids', 'Management decisions contain missing or duplicate identifiers.');
    decisionItems.filter(item => !item?.resolved).forEach(item => {
      if (!mailIds.has(item.mailId)) note('decisions.mail', `${item.id || 'A decision'} is missing its inbox message.`);
      if (!Array.isArray(item.options) || item.options.length < 2) note('decisions.options', `${item.id || 'A decision'} has fewer than two response options.`);
    });

    const transfers = careerState.transfers || {};
    const outgoingOffers = Array.isArray(transfers.outgoingOffers) ? transfers.outgoingOffers : [];
    if (duplicateValues(outgoingOffers.map(item => item?.id)).length) note('transfers.ids', 'Outgoing transfer offers contain missing or duplicate identifiers.');
    if (transfers.selectedOfferId && !outgoingOffers.some(item => item.id === transfers.selectedOfferId)) note('transfers.selection', 'The selected outgoing offer no longer exists.');
    if (transfers.activeIncoming && !((careerState.market || []).some(player => player.id === transfers.activeIncoming.playerId))) note('transfers.incomingPlayer', 'The active incoming negotiation points to a player outside the market.');

    const tactics = careerState.tactics || {};
    if (!CLUB_FORMATIONS[tactics.formationId || 'balanced']) note('tactics.formation', 'The selected formation is not recognised.');
    if (!CLUB_APPROACHES[tactics.approachId || 'balanced']) note('tactics.approach', 'The selected team approach is not recognised.');
    if (!CLUB_ENGAGEMENTS[tactics.engagementId || 'mixed']) note('tactics.engagement', 'The selected engagement range is not recognised.');
    if (!CLUB_PRIORITIES[tactics.priorityId || 'trade']) note('tactics.priority', 'The selected team priority is not recognised.');
    const squadIds = new Set(squad.map(player => String(player?.id || '')));
    Object.entries(tactics.assignments || {}).forEach(([playerId, roleId]) => {
      if (!squadIds.has(String(playerId))) note('tactics.assignmentPlayer', `A match-role assignment references missing player ${playerId}.`);
      if (!TEAM_ROLES.some(role => role.id === roleId)) note('tactics.assignmentRole', `Player ${playerId} has unknown match role ${roleId}.`);
    });
    const familiarity = tactics.familiarity || {};
    const familiarityDefinitions = {
      formation: Object.keys(CLUB_FORMATIONS),
      approach: Object.keys(CLUB_APPROACHES),
      engagement: Object.keys(CLUB_ENGAGEMENTS),
      priority: Object.keys(CLUB_PRIORITIES)
    };
    Object.entries(familiarityDefinitions).forEach(([bucket, ids]) => {
      const values = familiarity[bucket];
      if (!values || typeof values !== 'object') {
        note(`tactics.familiarity.${bucket}`, `The ${bucket} familiarity bucket is missing.`);
        return;
      }
      ids.forEach(id => {
        const value = Number(values[id]);
        if (!Number.isFinite(value) || value < 0 || value > 100) note(`tactics.familiarity.${bucket}`, `${bucket} familiarity for ${id} is outside 0–100.`);
      });
    });
    const activeSuitability = tactics.activeMatchPlan?.suitability;
    if (activeSuitability) {
      const overall = Number(activeSuitability.overall);
      const execution = Number(activeSuitability.executionPercent);
      if (!Number.isFinite(overall) || overall < 0 || overall > 100) note('tactics.activeSuitability', 'The active tactical plan has an invalid overall suitability score.');
      if (!Number.isFinite(execution) || execution < 80 || execution > 112) note('tactics.activeExecution', 'The active tactical plan has an invalid execution percentage.');
      if (!Array.isArray(activeSuitability.players)) note('tactics.activeRoleSuitability', 'The active tactical plan is missing player role suitability data.');
    }

    const league = careerState.created && typeof ensureLeagueState === 'function' ? ensureLeagueState() : null;
    if (league) {
      const resolvedTier = normaliseLeagueTier(league.divisionTier);
      const resolvedDivision = leagueDivisionDefinition(resolvedTier);
      if (Number(league.divisionTier) !== resolvedTier) note('league.divisionTier', `League tier ${league.divisionTier} is outside the supported 0–3 pyramid.`);
      if (league.name !== resolvedDivision.name) note('league.name', `League name ${league.name || 'missing'} does not match tier ${resolvedTier} (${resolvedDivision.name}).`);
      if (careerState.staff && normaliseLeagueTier(careerState.staff.selectedPoolDivision) !== resolvedTier) note('staff.selectedPoolDivision', 'Staff recruitment access does not match the current competition tier.');
      if ((careerState.staff?.pool || []).some(member => normaliseLeagueTier(member?.divisionTier) !== resolvedTier)) note('staff.poolTier', 'The active staff recruitment pool contains candidates from another competition tier.');
      if ((careerState.market || []).some(player => player?.scoutingDivision !== resolvedTier)) note('market.divisionTier', 'The recruitment market contains candidates generated for another competition tier.');
      const clubs = Array.isArray(league.clubs) ? league.clubs : [];
      const fixtures = Array.isArray(league.fixtures) ? league.fixtures : [];
      const expectedFixtures = clubs.length * (clubs.length - 1);
      if (clubs.length !== LEAGUE_RIVAL_TEMPLATES.length + 1) note('league.clubs', `Expected ${LEAGUE_RIVAL_TEMPLATES.length + 1} clubs, found ${clubs.length}.`);
      if (fixtures.length !== expectedFixtures) note('league.fixtures', `Expected ${expectedFixtures} fixtures, found ${fixtures.length}.`);
      const clubIds = new Set(clubs.map(club => club.id));
      if (duplicateValues(clubs.map(club => club?.id)).length) note('league.clubIds', 'League clubs contain missing or duplicate identifiers.');
      if (duplicateValues(fixtures.map(fixture => fixture?.id)).length) note('league.fixtureIds', 'League fixtures contain missing or duplicate identifiers.');
      const directedPairs = new Set();
      const pairCounts = new Map();
      fixtures.forEach(fixture => {
        if (!clubIds.has(fixture.homeId) || !clubIds.has(fixture.awayId) || fixture.homeId === fixture.awayId) note('league.fixtureClubs', `${fixture.id || 'A fixture'} has invalid participants.`);
        const directed = `${fixture.homeId}|${fixture.awayId}`;
        if (directedPairs.has(directed)) note('league.fixturePair', `The directed ${directed} fixture appears more than once.`);
        directedPairs.add(directed);
        const pair = [fixture.homeId, fixture.awayId].sort().join('|');
        pairCounts.set(pair, (pairCounts.get(pair) || 0) + 1);
      });
      for (const [pair, count] of pairCounts) if (count !== 2) note('league.fixturePairCount', `The ${pair} pairing has ${count} fixtures instead of home and away legs.`);
      const userFixtures = fixtures.filter(fixture => fixture.homeId === LEAGUE_USER_CLUB_ID || fixture.awayId === LEAGUE_USER_CLUB_ID);
      const expectedUserFixtures = (clubs.length - 1) * 2;
      if (clubs.length && userFixtures.length !== expectedUserFixtures) note('league.userFixtures', `The player club has ${userFixtures.length} fixtures instead of ${expectedUserFixtures}.`);
    }

    return {
      ok: issues.length === 0,
      build: BUILD_ID,
      issueCount: issues.length,
      issues,
      summary: {
        created: Boolean(careerState.created),
        squad: squad.length,
        mail: mail.length,
        openDecisions: decisionItems.filter(item => !item?.resolved).length,
        credits: Number(careerState.credits) || 0,
        wageBill: typeof clubTotalWageBill === 'function' ? clubTotalWageBill() : (typeof teamSquadWageBill === 'function' ? teamSquadWageBill() : 0),
        calendarDay: Number(calendar.absoluteDay) || 0,
        leagueFixtures: Array.isArray(league?.fixtures) ? league.fixtures.length : 0
      }
    };
  }

  function debugCombatTestLane() {
    const spacing = [0, 2.0, 4.6];
    for (let y = 1.5; y < MAP_H - 1.5; y += 1) {
      for (let x = 1.5; x < MAP_W - 6.2; x += 1) {
        const points = spacing.map(offset => ({ x: x + offset, y }));
        if (points.every(point => canStand(point.x, point.y, BOT_RADIUS + 0.02))
          && segmentHasClearance(points[0], points[2], BOT_RADIUS + 0.02)
          && hasLineOfSight(points[0], points[2])) return points;
      }
    }
    for (let x = 1.5; x < MAP_W - 1.5; x += 1) {
      for (let y = 1.5; y < MAP_H - 6.2; y += 1) {
        const points = spacing.map(offset => ({ x, y: y + offset }));
        if (points.every(point => canStand(point.x, point.y, BOT_RADIUS + 0.02))
          && segmentHasClearance(points[0], points[2], BOT_RADIUS + 0.02)
          && hasLineOfSight(points[0], points[2])) return points;
      }
    }
    return null;
  }

  function snapshotCombatTestBots() {
    const fields = [
      'x','y','angle','pathAngle','alive','health','cooldown','target','sightCandidate','sightTime','reactionDelay','targetSwitchCooldown','targetCommitUntil','perceptionScanTimer','lastPerceptionScanAt','viewOccluder','viewOccludedPoint','viewOcclusionTimer','viewClearDirection','viewClearStart',
      'lastSeen','lastSeenTimer','heardSound','heardSoundTimer','path','pathIndex','pathGoal','pathRefreshNeeded','repathTimer','pathHoldUntil','pathLeaseUntil','pathIntentKey',
      'tacticalEnemyKey','tacticalMode','tacticalModeTimer','tacticalDecisionTimer','lastTacticalReason','combatCover',
      'combatRepositionRequested','combatMobilityTimer','combatBlockedTimer','combatRecoveryCooldown','combatRecoveryStage',
      'combatRecoveryTargetKey','combatRecoveryOrigin','combatRecoveryBestDisplacement','combatRecoveryLastAt','combatApproachPath',
      'combatApproachIndex','combatApproachGoal','combatApproachTargetKey','combatApproachTargetOrigin','combatApproachExpires',
      'combatApproachReason','combatYieldTimer','combatBlockerKey','combatBlockerType','engagementIdleTimer','engagementLastShots','engagementLastDamage',
      'engagementTargetKey','crouched','crouchHoldTimer','crouchStationaryTimer','moveVelocity','visualMoveVelocity','locomotionSpeed',
      'moveCommandedThisFrame','moveIntent','moveBlocked','renderMoveAngle','renderAimAngle','forwardBlend','strafeBlend','backpedalBlend',
      'turnBlend','shoulderBlend','weaponReadyBlend','cornerReadyBlend','bodyLeanBlend','turnAnticipationBlend','footPlantBlend','aimStabilityBlend','breathingPhase','lastCrouchChangeAt','hitReactionAge','hitReactionStrength',
      'hitReactionVertical','flinchTimer','flinchDuration','flinchCooldown','flinchStrength','flinchAimOffset','flinchAge','reloadCoverRequired','reloadCoverSeekRegistered','reloadCoverArrivalRegistered','reloadCoverFallbackRegistered','reloadCoverCommitActive','deathImpactStrength','deathPush','coordinationWaitTimer','weapon','primaryWeapon','secondaryWeapon','hasDedicatedPrimary','usingSecondary','magAmmo','primaryAmmo','secondaryAmmo','primaryReserve','secondaryReserve','reloadTimer','reloadDuration','reloadProgress','reloadStartedEmpty','reloadAudioCueMask','weaponSwapTimer','weaponSwapDuration','weaponSwapTarget','wantsSafeReload','safeReloadTimer','coordinationHoldTimer','coordinationActionCooldown',
      'playerRole','teamPriorityId','objective','objectiveAge'
    ];
    return bots.map(bot => ({ bot, values: Object.fromEntries(fields.map(field => [field, bot[field]])) }));
  }

  function restoreCombatTestBots(snapshot) {
    for (const item of snapshot || []) Object.assign(item.bot, item.values);
  }

  window.__strikeDebug = {
    build: BUILD_ID,
    careerReportXpSafetyForTest: () => typeof careerReportXpSafetyForTest === 'function' ? careerReportXpSafetyForTest() : null,
    infrastructureForTest: () => typeof clubInfrastructureForTest === 'function' ? clubInfrastructureForTest() : null,
    normaliseInfrastructureForTest: raw => {
      careerState.infrastructure = raw && typeof raw === 'object' ? raw : {};
      updateMenuUI();
      return clubInfrastructureForTest();
    },
    setInfrastructureDivisionForTest: tier => {
      const league = typeof ensureLeagueState === 'function' ? ensureLeagueState() : careerState.league;
      if (league) league.divisionTier = clamp(Math.round(Number(tier) || 0), 0, 3);
      updateMenuUI();
      return clubInfrastructureForTest();
    },
    seedInfrastructureForTest: (credits = 1200000) => {
      if (!careerState.created || (careerState.squad || []).length < TEAM_REQUIRED_STARTERS) window.__strikeDebug.seedReadabilityCareerForTest(5);
      careerState.credits = Math.max(0, Math.round(Number(credits) || 1200000));
      careerState.totalMatches = Math.max(1, Number(careerState.totalMatches) || 0);
      careerState.lastRound = { ...(careerState.lastRound || {}), reportReviewed: true };
      for (const player of (careerState.squad || []).slice(0, TEAM_REQUIRED_STARTERS)) if (!player.trainingFocus || player.trainingFocus === 'none') player.trainingFocus = 'mobility';
      careerState.infrastructure = makeDefaultClubInfrastructureState();
      infrastructurePendingBranchId = '';
      menuContext = 'main';
      menuTab = 'infrastructure';
      setAppState('menu');
      updateMenuUI();
      return clubInfrastructureForTest();
    },
    startInfrastructureProjectForTest: branchId => ({ result: clubInfrastructureStartProject(String(branchId || 'training')), state: clubInfrastructureForTest() }),
    completeInfrastructureProjectForTest: () => {
      const state = clubInfrastructureState();
      if (!state.activeProject) return { result: null, state: clubInfrastructureForTest() };
      const calendar = clubCalendarState();
      calendar.absoluteDay = Math.max(Number(calendar.absoluteDay) || 0, Number(state.activeProject.completeDay) || 0);
      const result = clubInfrastructureProcessDay(calendar.absoluteDay);
      saveCareerState({ createBackup: false, reason: 'debug infrastructure completion' });
      updateMenuUI();
      return { result, state: clubInfrastructureForTest() };
    },
    liveCommandPulseForTest: () => typeof liveCommandPulseForTest === 'function' ? liveCommandPulseForTest() : null,
    openLiveCommandPulseForTest: () => ({
      ok: typeof openLiveCommandPulsePanel === 'function' ? openLiveCommandPulsePanel() : false,
      state: typeof liveCommandPulseForTest === 'function' ? liveCommandPulseForTest() : null
    }),
    forceLiveCommandPulseForTest: commandId => ({
      result: typeof forceLiveCommandPulseForTest === 'function' ? forceLiveCommandPulseForTest(String(commandId || '')) : { ok: false, reason: 'Live command module unavailable.' },
      state: typeof liveCommandPulseForTest === 'function' ? liveCommandPulseForTest() : null
    }),
    completeLiveCommandPulseForTest: () => ({
      outcome: typeof completeLiveCommandPulse === 'function' ? completeLiveCommandPulse('debug') : null,
      state: typeof liveCommandPulseForTest === 'function' ? liveCommandPulseForTest() : null
    }),
    landscapeCommentaryForTest: () => {
      const readRect = (element, visibleOnly = false) => {
        if (!element || (visibleOnly && element.hidden)) return null;
        const rect = element.getBoundingClientRect();
        if (visibleOnly) {
          const style = getComputedStyle(element);
          if (style.display === 'none' || style.visibility === 'hidden' || rect.width <= 0.5 || rect.height <= 0.5) return null;
        }
        return {
          x: Number(rect.x.toFixed(2)), y: Number(rect.y.toFixed(2)), width: Number(rect.width.toFixed(2)), height: Number(rect.height.toFixed(2)),
          top: Number(rect.top.toFixed(2)), right: Number(rect.right.toFixed(2)), bottom: Number(rect.bottom.toFixed(2)), left: Number(rect.left.toFixed(2))
        };
      };
      const stage = readRect(matchStageEl);
      const dock = readRect(matchCommentaryDockEl);
      const canvasRect = readRect(canvas);
      const panelRect = readRect(commandPulsePanelEl, true);
      const feedRect = readRect(feedEl, true);
      const momentRect = readRect(careerMatchMomentEl, true);
      const inside = (child, parent) => !child || !parent || (
        child.left >= parent.left - 1 && child.right <= parent.right + 1 && child.top >= parent.top - 1 && child.bottom <= parent.bottom + 1
      );
      return {
        appState,
        orientation: matchMedia('(orientation: landscape)').matches ? 'landscape' : 'portrait',
        viewMode: document.body.dataset.viewMode || '',
        stage,
        dock,
        canvas: canvasRect,
        panel: panelRect,
        feed: feedRect,
        moment: momentRect,
        separated: Boolean(stage && dock && stage.bottom <= dock.top + 1),
        canvasInsideStage: inside(canvasRect, stage),
        panelInsideDock: inside(panelRect, dock),
        feedInsideDock: inside(feedRect, dock),
        momentInsideDock: inside(momentRect, dock),
        horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        panelOpen: Boolean(matchCommentaryDockEl?.classList.contains('panel-open'))
      };
    },
    matchCommentaryPlacementForTest: () => {
      const readRect = element => {
        if (!element) return null;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        if (style.display === 'none' || style.visibility === 'hidden' || rect.width <= 0.5 || rect.height <= 0.5) return null;
        return {
          top: Number(rect.top.toFixed(2)),
          right: Number(rect.right.toFixed(2)),
          bottom: Number(rect.bottom.toFixed(2)),
          left: Number(rect.left.toFixed(2)),
          width: Number(rect.width.toFixed(2)),
          height: Number(rect.height.toFixed(2))
        };
      };
      const scoreboard = readRect(roundPanelEl);
      const dock = readRect(matchCommentaryDockEl);
      const objective = readRect(matchObjectiveEl);
      const viewport = readRect(matchStageViewportEl);
      const portraitWindowed = document.body.dataset.viewMode === 'windowed' && (
        window.matchMedia ? window.matchMedia('(orientation: portrait)').matches : window.innerHeight >= window.innerWidth
      );
      const stackedWithoutOverlap = !portraitWindowed || Boolean(scoreboard && dock && objective && viewport
        && scoreboard.bottom <= dock.top + 1
        && dock.bottom <= objective.top + 1
        && objective.bottom <= viewport.top + 1);
      return {
        appState,
        viewMode: document.body.dataset.viewMode || '',
        portraitWindowed,
        placement: matchCommentaryDockEl?.dataset.placement || '',
        parentClass: matchCommentaryDockEl?.parentElement?.className || '',
        scoreboard,
        dock,
        objective,
        viewport,
        stackedWithoutOverlap,
        horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)
      };
    },
    openingWeekFlowForTest: () => typeof openingWeekFlowForTest === 'function' ? openingWeekFlowForTest() : { ok: false, reason: 'Opening-week module unavailable' },
    seedFirstMatchCalendarForTest: () => {
      if (!careerState.created || (careerState.squad || []).length < TEAM_REQUIRED_STARTERS) window.__strikeDebug.seedReadabilityCareerForTest(5);
      careerState.tutorial = careerState.tutorial || {};
      careerState.tutorial.marketViewed = true;
      careerState.tutorial.profileViewed = true;
      careerState.tutorial.squadViewed = true;
      careerState.totalMatches = 0;
      careerState.lastRound = null;
      for (const player of (careerState.squad || []).slice(0, TEAM_REQUIRED_STARTERS)) player.trainingFocus = 'none';
      if (typeof clubConfirmMatchPlan === 'function') clubConfirmMatchPlan();
      saveCareerState({ createBackup: false, reason: 'debug first match calendar seed' });
      menuContext = 'main';
      menuTab = 'play';
      setAppState('menu');
      updateMenuUI();
      return {
        guide: typeof firstMatchGuidance === 'function' ? firstMatchGuidance() : null,
        restriction: typeof openingWeekTutorialDayRestriction === 'function' ? openingWeekTutorialDayRestriction() : null,
        endDayDisabled: Boolean(menuEndDayBtn?.disabled),
        daysUntilFixture: typeof clubDaysUntilFixture === 'function' ? clubDaysUntilFixture() : null
      };
    },
    // Build 12.133: exercises the recommended-plan change warning end to end —
    // apply the scout recommendation, then attempt a change and report whether
    // the confirmation modal intercepted it and what each choice did.
    matchdayPlanWarningForTest: (choice = 'proceed') => {
      if (!careerState.created || (careerState.squad || []).length < TEAM_REQUIRED_STARTERS) window.__strikeDebug.seedReadabilityCareerForTest(5);
      menuContext = 'main';
      menuTab = 'tactics';
      setAppState('menu');
      const plans = typeof opponentResponsePlanCandidates === 'function' ? opponentResponsePlanCandidates() : [];
      const recommended = plans.find(item => item.recommended) || plans[0] || null;
      if (!recommended) return { ok: false, reason: 'No response plans available.' };
      clubSelectOpponentResponsePlan(recommended.id);
      const alternative = plans.find(item => item.id !== recommended.id) || null;
      const before = { ...clubWorkflowTactics() };

      const guarded = matchdayGuardRecommendedPlanChange('response', { planId: alternative?.id }, null);
      const modalOpen = Boolean(teamNoteOverlayEl && !teamNoteOverlayEl.hidden);
      const buttons = Array.from(teamNoteOverlayEl?.querySelectorAll('[data-matchday-plan-warning]') || []).map(node => node.dataset.matchdayPlanWarning);
      const target = teamNoteOverlayEl?.querySelector(`[data-matchday-plan-warning="${choice === 'keep' ? 'keep' : 'proceed'}"]`) || null;
      if (target) handleMatchdayPlanWarningAction({ target });
      const after = { ...clubWorkflowTactics() };

      // Second attempt, using an approach the recommendation does not already
      // use so the guard is genuinely exercised. After CHANGE ANYWAY it must
      // stay silent; after KEEP RECOMMENDED it must warn again.
      const otherApproach = Object.keys(CLUB_APPROACHES).find(id => id !== recommended.approachId) || 'balanced';
      const secondGuard = matchdayGuardRecommendedPlanChange('tactics', { field: 'approachId', value: otherApproach }, null);
      if (teamNoteOverlayEl && !teamNoteOverlayEl.hidden) closeTeamNoteModal({ restoreFocus: false });

      return {
        ok: true, guarded, modalOpen, buttons, choice,
        changed: before.formationId !== after.formationId || before.approachId !== after.approachId
          || before.engagementId !== after.engagementId || before.priorityId !== after.priorityId,
        warnedAgain: secondGuard, secondAttemptApproach: otherApproach,
        selectedResponseId: clubMatchPrepState().selectedResponseId,
        recommendedId: recommended.id, alternativeId: alternative?.id || null
      };
    },
    // Build 12.133: drives the decision generator over a long calendar run and
    // reports any repeat of the same decision type for the same player inside
    // the repeat cooldown, which is what produced duplicate Inbox mail.
    clubDecisionRotationForTest: (days = 120) => {
      if (!careerState.created || (careerState.squad || []).length < TEAM_REQUIRED_STARTERS) window.__strikeDebug.seedReadabilityCareerForTest(8);
      careerState.decisions = { sequence: 0, items: [], lastGeneratedDay: -4 };
      const calendar = clubCalendarState();
      const startDay = Number(calendar.absoluteDay) || 0;
      const generated = [];
      for (let offset = 0; offset < Math.max(1, Math.round(Number(days) || 0)); offset++) {
        calendar.absoluteDay = startDay + offset;
        const decision = clubMaybeGenerateDecision();
        if (decision) {
          generated.push({ type: decision.type, playerId: decision.playerId, day: decision.createdDay });
          decision.resolved = true;
        }
      }
      calendar.absoluteDay = startDay;
      const violations = [];
      const subjects = new Map();
      for (const item of generated) {
        const key = `${item.type}:${item.playerId || 'club'}`;
        const previous = subjects.get(key);
        if (previous !== undefined && item.day - previous < 24 && item.playerId) violations.push({ key, gap: item.day - previous });
        subjects.set(key, item.day);
      }
      return {
        generated: generated.length,
        distinctSubjects: subjects.size,
        repeatViolations: violations.length,
        violations: violations.slice(0, 5),
        types: generated.reduce((acc, item) => { acc[item.type] = (acc[item.type] || 0) + 1; return acc; }, {})
      };
    },
    seedOpeningWeekForTest: () => {
      if (!careerState.created || (careerState.squad || []).length < TEAM_REQUIRED_STARTERS) window.__strikeDebug.seedReadabilityCareerForTest(5);
      careerState.tutorial = careerState.tutorial || {};
      careerState.tutorial.marketViewed = true;
      careerState.tutorial.profileViewed = true;
      careerState.tutorial.squadViewed = true;
      careerState.totalMatches = Math.max(1, Number(careerState.totalMatches) || 0);
      careerState.lastRound = { ...(careerState.lastRound || {}), reportReviewed: true };
      for (const player of (careerState.squad || []).slice(0, TEAM_REQUIRED_STARTERS)) if (!player.trainingFocus || player.trainingFocus === 'none') player.trainingFocus = 'mobility';
      if (typeof clubConfirmMatchPlan === 'function') clubConfirmMatchPlan();
      saveCareerState({ createBackup: false, reason: 'debug opening week seed' });
      menuContext = 'main';
      menuTab = 'play';
      setAppState('menu');
      updateMenuUI();
      return typeof openingWeekFlowForTest === 'function' ? openingWeekFlowForTest() : null;
    },
    freeRoamConfigurationForTest: () => ({
      selectedArenaId: freeRoamSelectedArenaId,
      arenaIds: freeRoamArenaIds(),
      locked: Boolean(canResumeMatch || matchmakingState?.active || deploymentSelectionState?.active),
      cardPresent: Boolean(menuContentEl?.querySelector('.free-roam-config-card'))
    }),
    startFreeRoamForTest: arenaId => ({ ok: startFreeRoam(String(arenaId || freeRoamSelectedArenaId)), state: appState, snapshot: freeRoamInspectionPayload() }),
    exitFreeRoamForTest: () => ({ ok: exitFreeRoam(), state: appState, arenaId: activeArenaId }),
    cycleFreeRoamArenaForTest: () => ({ arenaId: cycleFreeRoamArena(), snapshot: freeRoamInspectionPayload() }),
    freeRoamSnapshotForTest: () => ({ appState, overlayHidden: Boolean(freeRoamOverlayEl?.hidden), minimapVisible: Boolean(typeof tacticalMinimapVisible !== 'undefined' && tacticalMinimapVisible), ...freeRoamInspectionPayload() }),
    freeRoamSetPositionForTest: (x, y, angle = freeRoamCamera.angle) => {
      const requested = { x: Number(x) || 0, y: Number(y) || 0 };
      const point = canStand(requested.x, requested.y, BOT_RADIUS) ? requested : nearestWalkablePoint(requested.x, requested.y);
      freeRoamCamera.x = point.x;
      freeRoamCamera.y = point.y;
      freeRoamCamera.angle = Number.isFinite(Number(angle)) ? Number(angle) : freeRoamCamera.angle;
      updateFreeRoamPresentation(true);
      return freeRoamInspectionPayload();
    },
    freeRoamMoveForTest: (direction = 'forward', seconds = 1, fast = false) => {
      const resolved = String(direction || 'forward');
      const duration = clamp(Number(seconds) || 0, 0, 12);
      freeRoamMoveInputs.add(resolved);
      if (fast) freeRoamPressedKeys.add('shift');
      const steps = Math.max(1, Math.ceil(duration * 60));
      for (let index = 0; index < steps; index++) updateFreeRoam(duration / steps);
      freeRoamMoveInputs.delete(resolved);
      freeRoamPressedKeys.delete('shift');
      return freeRoamInspectionPayload();
    },
    freeRoamTravelForTest: (x1, y1, x2, y2) => ({
      allowed: canTravelBetween(Number(x1), Number(y1), Number(x2), Number(y2), BOT_RADIUS, true),
      startElevation: arenaElevationAt(Number(x1), Number(y1), activeArenaId),
      endElevation: arenaElevationAt(Number(x2), Number(y2), activeArenaId)
    }),
    freeRoamLookForTest: (yawDelta = 0, pitchDelta = 0) => {
      freeRoamCamera.angle = (freeRoamCamera.angle + Number(yawDelta || 0)) % (Math.PI * 2);
      freeRoamCamera.lookPitch = clamp(freeRoamCamera.lookPitch + Number(pitchDelta || 0), -0.78, 0.78);
      return freeRoamInspectionPayload();
    },
    navigationGraphForTest: () => typeof navigationGraphSnapshot === 'function' ? navigationGraphSnapshot() : null,
    navigationGoalRecoveryForTest: (arenaId = 'summit', goalX = 14.04, goalY = 3.01) => {
      const previousArena = activeArenaId;
      const id = ARENA_LIBRARY[String(arenaId || '')] ? String(arenaId) : activeArenaId;
      setActiveArena(id);
      if (typeof navigationGraphForActiveArena === 'function') navigationGraphForActiveArena();
      const spawn = activeArenaMeta().spawnPoints?.[TEAM_RED]?.[0] || { x: MAP_W - 2.5, y: MAP_H - 2.5 };
      beginNavigationPlanningFrame();
      const probe = new Bot(TEAM_RED, 4);
      probe.x = spawn.x;
      probe.y = spawn.y;
      probe.alive = true;
      probe.pathFailures = 0;
      const requested = { x: Number(goalX), y: Number(goalY) };
      const resolved = probe.ensurePath(requested);
      const result = {
        arenaId: id,
        requested,
        resolved,
        resolvedGoal: probe.pathGoal ? { ...probe.pathGoal } : null,
        pathNodes: probe.path?.length || 0,
        pathFailures: probe.pathFailures,
        substituted: Boolean(probe.pathGoal && dist(probe.pathGoal, requested) > 0.05),
        ok: Boolean(resolved && probe.path?.length && probe.pathFailures === 0)
      };
      if (previousArena !== id) setActiveArena(previousArena);
      return result;
    },
    navigationBenchmarkForTest: (arenaId = activeArenaId, iterations = 60) => {
      const previousArena = activeArenaId;
      const id = ARENA_LIBRARY[String(arenaId || '')] ? String(arenaId) : activeArenaId;
      setActiveArena(id);
      const arena = activeArenaMeta();
      const starts = [...(arena.spawnPoints?.[TEAM_BLUE] || []), ...(arena.spawnPoints?.[TEAM_RED] || [])];
      const goals = [...(arena.hotspots || []), ...(arena.engagementPlans || []).flatMap(plan => [...(plan.blue || []), ...(plan.red || [])])];
      const count = clamp(Math.round(Number(iterations) || 60), 1, 500);
      const started = performance.now();
      let successes = 0;
      let totalNodes = 0;
      for (let index = 0; index < count; index++) {
        const start = starts[index % Math.max(1, starts.length)] || { x: 2.5, y: 2.5 };
        const goal = goals[(index * 7) % Math.max(1, goals.length)] || start;
        const path = findPath(start, goal, null);
        if (path?.length) {
          successes++;
          totalNodes += path.length;
        }
      }
      const durationMs = performance.now() - started;
      const graph = typeof navigationGraphSnapshot === 'function' ? navigationGraphSnapshot() : null;
      if (previousArena !== id) setActiveArena(previousArena);
      return { arenaId: id, iterations: count, successes, failures: count - successes, durationMs, averageMs: durationMs / count, averageNodes: successes ? totalNodes / successes : 0, graph };
    },
    careerDataRecoveryForTest: () => typeof careerDataRecoveryForTest === 'function' ? careerDataRecoveryForTest() : null,
    priorityUxForTest: () => ({
      route: menuTab,
      primary: menuContentEl?.querySelector('.management-priority-main strong')?.textContent || '',
      type: menuContentEl?.querySelector('.management-priority-strip')?.className || '',
      planItems: menuContentEl?.querySelectorAll('.management-priority-strip details button').length || 0,
      foundationItems: menuContentEl?.querySelectorAll('.foundation-path button').length || 0,
      foundationCurrent: menuContentEl?.querySelector('.foundation-path button.current span')?.textContent || '',
      sectionPriorityCards: Array.from(menuContentEl?.querySelectorAll('.section-priority-card > strong') || []).map(node => node.textContent || ''),
      sectionDirectoryOpen: Boolean(menuContentEl?.querySelector('.section-hub-pages')?.open)
    }),
    seedReadabilityCareerForTest: (squadSize = 3) => {
      const count = clamp(Math.round(Number(squadSize) || 0), 0, TEAM_MAX_SQUAD);
      careerState = makeDefaultCareerState();
      careerState.created = true;
      careerState.name = 'UX Test Club';
      careerState.managerName = 'Test Manager';
      careerState.squad = Array.from({ length: count }, (_, index) => generateTeamPlayer(118400 + index * 7919, index, 'market'));
      careerState.selectedPlayerId = careerState.squad[0]?.id || null;
      selectedTeamPlayerId = careerState.selectedPlayerId;
      careerDraft = { name: careerState.name, managerName: careerState.managerName, teamIdentity: normaliseTeamIdentity(careerState.teamIdentity), stats: { ...careerState.stats } };
      saveCareerState({ createBackup: false, reason: 'debug readability seed' });
      createMatch();
      menuContext = 'main';
      canResumeMatch = false;
      menuTab = 'play';
      setAppState('menu');
      updateMenuUI();
      return { created: careerState.created, squad: careerState.squad.length, state: window.__strikeDebug.priorityUxForTest() };
    },
    seedMobileInterfaceClarityForTest: (squadSize = 0) => {
      const seeded = window.__strikeDebug.seedReadabilityCareerForTest(squadSize);
      careerState.market = generateTeamMarket(126600);
      saveCareerState({ createBackup: false, reason: 'debug mobile interface clarity seed' });
      updateMenuUI();
      return { ...seeded, market: careerState.market.length };
    },
    createCareerBackupForTest: () => {
      if (!careerState.created) window.__strikeDebug.seedReadabilityCareerForTest(3);
      const before = Number(careerState.credits) || 0;
      careerState.credits = before - 1000;
      saveCareerState({ reason: 'debug backup test' });
      updateMenuUI();
      return { before, after: careerState.credits, recovery: window.__strikeDebug.careerDataRecoveryForTest() };
    },
    restoreCareerBackupForTest: () => ({ ok: restoreCareerBackup(), recovery: window.__strikeDebug.careerDataRecoveryForTest(), credits: careerState.credits, notice: careerDataNotice ? { ...careerDataNotice } : null }),
    workflowIntegrityForTest: () => typeof workflowIntegritySnapshot === 'function' ? workflowIntegritySnapshot() : null,
    managementActionsForTest: () => typeof managementActionItems === 'function' ? managementActionItems().map(item => ({ ...item })) : [],
    openManagementActionForTest: id => ({ ok: typeof openManagementAction === 'function' ? openManagementAction(String(id || '')) : false, route: menuTab, state: typeof workflowIntegritySnapshot === 'function' ? workflowIntegritySnapshot() : null }),
    workflowSaveForTest: route => ({ ok: typeof workflowSaveForRoute === 'function' ? workflowSaveForRoute(String(route || menuTab)) : false, state: typeof workflowIntegritySnapshot === 'function' ? workflowIntegritySnapshot() : null }),
    workflowDiscardForTest: route => ({ ok: typeof workflowDiscardForRoute === 'function' ? workflowDiscardForRoute(String(route || menuTab)) : false, state: typeof workflowIntegritySnapshot === 'function' ? workflowIntegritySnapshot() : null }),
    roleExecutionCopyForTest: (scale = 0.97) => {
      const host = document.createElement('div');
      host.innerHTML = tacticalRoleExecutionMarkup({ executionScale: Number(scale) });
      return {
        scale: Number(scale),
        text: host.textContent.replace(/\s+/g, ' ').trim(),
        title: host.firstElementChild?.getAttribute('title') || '',
        html: host.innerHTML
      };
    },
    setMenuRouteForTest: route => { setMenuRoute(String(route || 'play')); return { route: menuTab, section: menuSectionForRoute(), title: menuHeaderTitleEl?.textContent || '', breadcrumb: managerBreadcrumbEl?.textContent || '' }; },
    forceMenuRouteForTest: route => {
      const target = String(route || 'play');
      if (!menuTabMeta[target]) return { ok: false, route: menuTab };
      menuTab = target;
      updateMenuUI();
      resetMenuScroll();
      return { ok: true, route: menuTab, section: menuSectionForRoute(), title: menuHeaderTitleEl?.textContent || '', breadcrumb: managerBreadcrumbEl?.textContent || '' };
    },
    menuViewportIntegrityForTest: () => {
      const shellRect = menuShellEl?.getBoundingClientRect() || null;
      const topbarRect = menuShellEl?.querySelector('.manager-topbar')?.getBoundingClientRect() || null;
      const contentScroller = menuHistoryScroller();
      const contentRect = contentScroller?.getBoundingClientRect() || null;
      const layout = menuShellEl?.querySelector('.menu-layout') || null;
      return {
        route: menuTab,
        windowScrollX: Number(window.scrollX || window.pageXOffset || 0),
        windowScrollY: Number(window.scrollY || window.pageYOffset || 0),
        documentScrollTop: Number((document.scrollingElement || document.documentElement)?.scrollTop || 0),
        shellScrollTop: Number(menuShellEl?.scrollTop || 0),
        layoutScrollTop: Number(layout?.scrollTop || 0),
        contentScrollTop: Number(contentScroller?.scrollTop || 0),
        shellTop: shellRect ? Math.round(shellRect.top) : null,
        shellBottom: shellRect ? Math.round(shellRect.bottom) : null,
        topbarTop: topbarRect ? Math.round(topbarRect.top) : null,
        topbarBottom: topbarRect ? Math.round(topbarRect.bottom) : null,
        contentTop: contentRect ? Math.round(contentRect.top) : null,
        contentBottom: contentRect ? Math.round(contentRect.bottom) : null,
        viewportHeight: Math.round(Number(window.visualViewport?.height) || Number(window.innerHeight) || 0),
        topbarVisible: Boolean(topbarRect && topbarRect.bottom > 0 && topbarRect.top < (Number(window.visualViewport?.height) || window.innerHeight || 0))
      };
    },
    scrollManagementTargetForTest: targetId => {
      const target = menuContentEl?.querySelector(managementTargetSelector(String(targetId || ''))) || null;
      const ok = target && typeof scrollCommandContentTargetIntoView === 'function' ? scrollCommandContentTargetIntoView(target, { behavior: 'auto' }) : false;
      return { ok: Boolean(ok), state: window.__strikeDebug.menuViewportIntegrityForTest() };
    },
    setAppStateForTest: state => { setAppState(String(state || '').toLowerCase() === 'match' ? 'match' : 'menu'); return { appState, viewMode, orientationGate: document.body.dataset.orientationGate || '' }; },
    landscapeViewForTest: () => ({
      fullViewRequested,
      viewMode,
      portraitViewport: isPortraitViewport(),
      gateVisible: Boolean(landscapeRotationGateEl && !landscapeRotationGateEl.hidden),
      gateAriaHidden: landscapeRotationGateEl?.getAttribute('aria-hidden') || '',
      restoreVisible: Boolean(restoreViewBtn && !restoreViewBtn.hidden),
      minimapButtonVisible: Boolean(minimapToggleBtn && getComputedStyle(minimapToggleBtn).display !== 'none'),
      diagnosticButtonVisible: Boolean(diagnosticExportBtn && getComputedStyle(diagnosticExportBtn).display !== 'none')
    }),
    requestLandscapeForTest: () => { fullViewRequested = true; syncViewMode(); return window.__strikeDebug.landscapeViewForTest(); },
    restorePortraitForTest: () => { fullViewRequested = false; syncViewMode(); return window.__strikeDebug.landscapeViewForTest(); },
    animationBlendForTest: (rate = 8, dt = 1 / 60) => animationBlendFactor(Number(rate) || 0, Number(dt) || 0),
    animationAngleForTest: (current = 0, target = Math.PI / 2, rate = 8, dt = 1 / 60, lag = Math.PI) => animationAngleStep(Number(current) || 0, Number(target) || 0, Number(rate) || 0, Number(dt) || 0, Number(lag) || Math.PI),
    reloadAnimationForTest: (progress = 0.5, emptyMagazine = true) => careerWeaponReloadPhases(Number(progress) || 0, true, Boolean(emptyMagazine)),
    operatorAnimationAuditForTest: () => operatorAnimationPresentationAudit(),
    movementPresentationForTest: (index = spectatorIndex) => movementPresentationSnapshot(bots[clamp(Math.round(Number(index) || 0), 0, Math.max(0, bots.length - 1))]),
    engagementPlanForTest: (preferredId = '') => {
      const plan = selectRoundEngagementPlan(String(preferredId || ''));
      return plan ? JSON.parse(JSON.stringify(plan)) : null;
    },
    engagementRotationAuditForTest: (arenaId = 'office', cycles = 2) => {
      const id = arenaMeta(String(arenaId || 'office')).id;
      setActiveArena(id);
      engagementPlanRotationByArena[id] = [];
      recentEngagementPlanByArena[id] = '';
      const planCount = Math.max(1, engagementPlanOptions(id).length);
      const sequence = [];
      for (let index = 0; index < planCount * Math.max(1, Math.round(Number(cycles) || 2)); index++) {
        const plan = selectRoundEngagementPlan();
        if (plan) sequence.push(plan.id);
      }
      const groups = [];
      for (let index = 0; index < sequence.length; index += planCount) groups.push(sequence.slice(index, index + planCount));
      return {
        arenaId: id,
        planCount,
        sequence,
        noImmediateRepeat: sequence.every((planId, index) => index === 0 || planId !== sequence[index - 1]),
        fullCycles: groups.every(group => group.length === planCount && new Set(group).size === planCount)
      };
    },
    officeCourtyardRotationAuditForTest: () => {
      setActiveArena('office');
      const lanes = typeof officeCourtyardRotationGeometry === 'function' ? officeCourtyardRotationGeometry() : [];
      const checks = lanes.map(lane => {
        const west = nearestWalkablePoint(lane.west.x, lane.west.y);
        const east = nearestWalkablePoint(lane.east.x, lane.east.y);
        const westToEast = findPath(west, east);
        const eastToWest = findPath(east, west);
        return {
          id: lane.id,
          west,
          east,
          westClear: canStandForNavigation(west.x, west.y, BOT_RADIUS),
          eastClear: canStandForNavigation(east.x, east.y, BOT_RADIUS),
          westToEastNodes: westToEast?.length || 0,
          eastToWestNodes: eastToWest?.length || 0,
          reachableBothWays: Boolean(westToEast?.length && eastToWest?.length)
        };
      });
      return {
        arenaId: activeArenaId,
        laneCount: checks.length,
        checks,
        ok: checks.length === 4 && checks.every(check => check.westClear && check.eastClear && check.reachableBothWays)
      };
    },
    officeCourtyardOpeningTraversalForTest: () => {
      setActiveArena('office');
      const arena = arenaMeta('office');
      const plans = engagementPlanOptions('office').filter(plan => plan.zone === 'COURTYARD');
      const centreX = MAP_W * 0.5;
      const checks = plans.map(plan => {
        const teams = [TEAM_BLUE, TEAM_RED].map(team => {
          const side = team === TEAM_BLUE ? 'blue' : 'red';
          const objectives = Array.isArray(plan[side]) ? plan[side] : [];
          const starts = arena.spawnPoints?.[team] || [];
          const objectiveChecks = objectives.map((objective, slot) => {
            const startRaw = starts[Math.min(slot, Math.max(0, starts.length - 1))] || { x: team === TEAM_BLUE ? 2.5 : MAP_W - 2.5, y: MAP_H * 0.5 };
            const start = nearestWalkablePoint(startRaw.x, startRaw.y);
            const target = nearestWalkablePoint(objective.x, objective.y);
            const path = findPath(start, target) || [];
            const crossesCentre = team === TEAM_BLUE ? target.x > centreX + 0.25 : target.x < centreX - 0.25;
            const visitsCourtyard = path.some(point => levelZoneAt(point.x, point.y)?.short === 'COURTYARD');
            return { slot, start, target, routeNodes: path.length, reachable: path.length > 0, visitsCourtyard, crossesCentre };
          });
          return {
            team: side,
            crossers: objectiveChecks.filter(check => check.crossesCentre).length,
            objectiveChecks,
            ok: objectiveChecks.length === 5 && objectiveChecks.every(check => check.reachable && check.visitsCourtyard) && objectiveChecks.filter(check => check.crossesCentre).length >= 2
          };
        });
        return { id: plan.id, teams, ok: teams.every(team => team.ok) };
      });
      return { arenaId: activeArenaId, planCount: checks.length, checks, ok: checks.length >= 2 && checks.every(check => check.ok) };
    },
    forceOfficeCourtyardRotationForTest: (index = 0) => {
      setActiveArena('office');
      if (!bots.length) {
        bots = [];
        for (let team = 0; team < 2; team++) for (let slot = 0; slot < 5; slot++) bots.push(new Bot(team, slot));
      }
      const bot = bots[clamp(Math.round(Number(index) || 0), 0, Math.max(0, bots.length - 1))];
      if (!bot) return null;
      bot.target = null;
      bot.sightCandidate = null;
      bot.lastSeen = null;
      bot.heardSound = null;
      bot.combatApproachGoal = null;
      bot.navigationDetourGoal = null;
      bot.openingPlanObjective = null;
      bot.lateRoundGoal = null;
      bot.mapRotationCooldown = 0;
      bot.lastPersonalContactAt = simulationClock - 12;
      bot.cancelOfficeCourtyardRotation('');
      bot.mapRotationCooldown = 0;
      const started = bot.beginOfficeCourtyardRotation(true);
      const route = started && bot.mapRotationGoal ? findPath(bot, bot.mapRotationGoal) : null;
      return {
        started,
        bot: diagnosticBotIdentity(bot),
        stage: bot.mapRotationStage || null,
        laneId: bot.mapRotationLaneId || null,
        goal: bot.mapRotationGoal ? { ...bot.mapRotationGoal } : null,
        exit: bot.mapRotationExitGoal ? { ...bot.mapRotationExitGoal } : null,
        routeNodes: route?.length || 0,
        reachable: Boolean(route?.length)
      };
    },
    officeCourtyardRotationDecisionForTest: (index = 0) => {
      setActiveArena('office');
      if (!bots.length) {
        bots = [];
        for (let team = 0; team < 2; team++) for (let slot = 0; slot < 5; slot++) bots.push(new Bot(team, slot));
      }
      const bot = bots[clamp(Math.round(Number(index) || 0), 0, Math.max(0, bots.length - 1))];
      if (!bot) return null;
      roundFreezeTimer = 0;
      roundEnding = false;
      matchEnding = false;
      roundTime = 80;
      suddenHuntOvertime = false;
      bot.target = null;
      bot.sightCandidate = null;
      bot.lastSeen = null;
      bot.heardSound = null;
      bot.combatApproachGoal = null;
      bot.navigationDetourGoal = null;
      bot.openingPlanObjective = null;
      bot.lateRoundGoal = null;
      bot.playerRole = 'flanker';
      bot.objectiveAge = 12;
      bot.lastPersonalContactAt = simulationClock - 14;
      bot.cancelOfficeCourtyardRotation('');
      bot.mapRotationCooldown = 0;
      const score = bot.officeCourtyardRotationScore();
      const started = bot.beginOfficeCourtyardRotation(false);
      const beforeContact = {
        stage: bot.mapRotationStage || null,
        laneId: bot.mapRotationLaneId || null,
        goal: bot.mapRotationGoal ? { ...bot.mapRotationGoal } : null,
        exit: bot.mapRotationExitGoal ? { ...bot.mapRotationExitGoal } : null
      };
      bot.heardSound = { x: bot.x, y: bot.y, type: 'gunshot', confidence: 0.45 };
      bot.updateOfficeCourtyardRotation();
      const preservedThroughWeakCue = Boolean(bot.mapRotationGoal && bot.mapRotationStage);
      bot.heardSound = null;
      bot.target = bots.find(other => other !== bot && other.alive && other.team !== bot.team) || { alive: true };
      bot.updateOfficeCourtyardRotation();
      const interruptedByConfirmedContact = !bot.mapRotationGoal && !bot.mapRotationStage;
      bot.target = null;
      return { score, started, beforeContact, preservedThroughWeakCue, interruptedByConfirmedContact };
    },
    zoneAnalyticsForTest: () => {
      const summary = matchDiagnostics?.summary || lastCompletedDiagnosticReport?.summary || (matchDiagnostics ? diagnosticBuildSummary(matchDiagnostics.winner) : null);
      return summary?.zoneAnalytics ? JSON.parse(JSON.stringify(summary.zoneAnalytics)) : [];
    },
    aiStabilityForTest: () => {
      const summary = matchDiagnostics?.summary || lastCompletedDiagnosticReport?.summary || (matchDiagnostics ? diagnosticBuildSummary(matchDiagnostics.winner) : null);
      return summary?.aiStability ? JSON.parse(JSON.stringify(summary.aiStability)) : null;
    },
    zoneAnalyticsScenarioForTest: () => {
      setActiveArena('office');
      if (!bots.length) {
        bots = [];
        for (let team = 0; team < 2; team++) for (let slot = 0; slot < 5; slot++) bots.push(new Bot(team, slot));
      }
      diagnosticResetMatch();
      diagnosticBeginMatch();
      const blue = bots.find(bot => bot.team === TEAM_BLUE);
      const red = bots.find(bot => bot.team === TEAM_RED);
      if (!blue || !red) return null;
      blue.x = 16.5; blue.y = 11.5; blue.target = red;
      red.x = 19.5; red.y = 11.5; red.target = blue;
      const blueHealth = blue.health;
      red.roundShotsFired = (red.roundShotsFired || 0) + 1;
      red.roundShotsHit = (red.roundShotsHit || 0) + 1;
      red.roundDamageDealt = (red.roundDamageDealt || 0) + 28;
      blue.health = Math.max(1, blue.health - 28);
      diagnosticRecordDamage(red, blue, 28, { headshot: true, critical: false });
      matchDiagnostics.lastZoneSampleSimulationTime = simulationClock - 0.25;
      diagnosticCaptureSample();
      blue.health = blueHealth;
      const summary = diagnosticBuildSummary(null);
      const courtyard = summary.zoneAnalytics.find(item => item.zone === 'COURTYARD') || null;
      return { courtyard, fightLocation: summary.fightLocation, aiStability: summary.aiStability };
    },
    coordinationPathReuseForTest: (index = 0) => {
      if (!bots.length) {
        bots = [];
        for (let team = 0; team < 2; team++) for (let slot = 0; slot < 5; slot++) bots.push(new Bot(team, slot));
      }
      const bot = bots[clamp(Math.round(Number(index) || 0), 0, Math.max(0, bots.length - 1))];
      if (!bot) return null;
      const goal = nearestWalkablePoint(bot.x + (bot.team === TEAM_BLUE ? 3.2 : -3.2), bot.y + 0.6);
      bot.coordinationRepathCooldown = 0;
      bot.coordinationGoal = null;
      bot.coordinationGoalReason = '';
      bot.coordinationGoalLockTimer = 0;
      const first = bot.setCoordinationGoal(goal, 'test stable regroup');
      bot.path = [{ x: bot.x, y: bot.y }, { x: goal.x, y: goal.y }];
      bot.pathIndex = 1;
      bot.pathGoal = { ...goal };
      const pathReference = bot.path;
      bot.coordinationRepathCooldown = 0;
      const second = bot.setCoordinationGoal({ x: goal.x + 0.28, y: goal.y + 0.22 }, 'test stable regroup');
      const pathPreserved = bot.path === pathReference;
      const smallShiftGoal = { ...bot.objective };
      bot.coordinationRepathCooldown = 0;
      bot.coordinationGoalLockTimer = 0;
      const materialCandidate = nearestWalkablePoint(goal.x + 2.2, goal.y + 0.4);
      const third = bot.setCoordinationGoal(materialCandidate, 'test stable regroup');
      return {
        first,
        second,
        third,
        pathPreserved,
        smallShiftGoalShift: diagnosticRound(dist(goal, smallShiftGoal), 3),
        materialShift: diagnosticRound(dist(goal, materialCandidate), 3),
        materialReplanned: third && bot.path !== pathReference && bot.path.length === 0 && dist(bot.objective, materialCandidate) < 0.05,
        pathNodes: bot.path.length,
        cooldown: diagnosticRound(bot.coordinationRepathCooldown, 3),
        lockTimer: diagnosticRound(bot.coordinationGoalLockTimer, 3)
      };
    },
    currentEngagementPlan: () => currentEngagementPlan ? JSON.parse(JSON.stringify(currentEngagementPlan)) : null,
    doorStates: () => doorStateSnapshot(),
    forceDoorForTest: (doorId = '', openAmount = 0) => {
      const state = ACTIVE_DOOR_STATES.find(door => door.id === String(doorId || '')) || ACTIVE_DOOR_STATES[0];
      if (!state) return null;
      state.openAmount = clamp(Number(openAmount) || 0, 0, 1);
      state.targetOpen = state.openAmount >= 0.5 ? 1 : 0;
      state.lastState = state.openAmount >= 0.92 ? 'open' : (state.openAmount <= 0.08 ? 'closed' : 'opening');
      return doorStateSnapshot().find(door => door.id === state.id);
    },
    spectatorDirectorForTest: () => spectatorDirectorForTest(),
    spectatorHandoffPresentationForTest: () => spectatorHandoffPresentationForTest(),
    spectatorHandoffForTest: (deadIndex = spectatorIndex, seconds = 2.05) => {
      const safeIndex = clamp(Math.floor(Number(deadIndex) || 0), 0, Math.max(0, bots.length - 1));
      const current = bots[safeIndex];
      if (!current || current.team !== CAREER_OWNED_TEAM) return null;
      spectatorIndex = safeIndex;
      autoSpectate = false;
      current.alive = false;
      current.health = 0;
      spectatorDeathSwitchTimer = 0;
      spectatorDeathSwitchKey = '';
      const before = spectatorIndex;
      updateSpectatorDeathHandoff(0);
      updateSpectatorDeathHandoff(Math.max(0, Number(seconds) || 0));
      return { before, after: spectatorIndex, switched: before !== spectatorIndex, timer: spectatorDeathSwitchTimer, viewed: bots[spectatorIndex]?.name || '' };
    },
    stateIntegrityForTest: () => auditCareerStateIntegrity(),
    weaponInventoryForTest: () => ({
      copies: Object.fromEntries(careerOwnedWeaponIds().map(id => [id, careerWeaponOwnedCount(id)])),
      assignments: Object.fromEntries(careerOwnedWeaponIds().map(id => [id, careerWeaponAssignmentCount(id)])),
      holders: Object.fromEntries(careerOwnedWeaponIds().map(id => [id, careerAssignedPlayersForWeapon(id).map(player => player.id)])),
      squad: (careerState.squad || []).map(player => ({ id: player.id, primaryWeaponId: careerPlayerPrimaryWeaponId(player), sidearmWeaponId: careerPlayerSidearmId(player), activeWeaponId: careerPlayerActiveWeaponId(player) })),
      selected: selectedCareerWeaponId,
      selectedSlot: selectedCareerWeaponSlot
    }),
    ar4WeaponModelForTest: () => careerAr4ModelAudit(),
    weaponSlotSystemForTest: () => {
      const basePlayer = careerState.squad?.[0] ? JSON.parse(JSON.stringify(careerState.squad[0])) : { id: 'slot-test', name: 'SLOT TEST', stats: defaultCareerStats() };
      const pistolState = normaliseCareerState({ ...makeDefaultCareerState(), version: 18, created: true, inventory: ['scrap-p12','service-p12','ar4-sentinel'], squad: [{ ...basePlayer, id: 'pistol-migrate', equippedWeaponId: 'service-p12', equippedPrimaryWeaponId: undefined, equippedSidearmId: undefined }] });
      const rifleState = normaliseCareerState({ ...makeDefaultCareerState(), version: 18, created: true, inventory: ['scrap-p12','ar4-sentinel'], squad: [{ ...basePlayer, id: 'rifle-migrate', equippedWeaponId: 'ar4-sentinel', equippedPrimaryWeaponId: undefined, equippedSidearmId: undefined }] });
      const finiteState = normaliseCareerState({ ...makeDefaultCareerState(), version: 19, created: true, inventory: ['scrap-p12','service-p12'], squad: [
        { ...basePlayer, id: 'finite-a', equippedPrimaryWeaponId: null, equippedSidearmId: 'service-p12', equippedWeaponId: 'service-p12' },
        { ...basePlayer, id: 'finite-b', equippedPrimaryWeaponId: null, equippedSidearmId: 'service-p12', equippedWeaponId: 'service-p12' }
      ] });
      const pistol = pistolState.squad[0];
      const rifle = rifleState.squad[0];
      const finiteServiceAssignments = finiteState.squad.filter(player => player.equippedSidearmId === 'service-p12').length;
      return {
        ok: pistolState.version === 19 && pistol.equippedPrimaryWeaponId === null && pistol.equippedSidearmId === 'service-p12' && rifle.equippedPrimaryWeaponId === 'ar4-sentinel' && rifle.equippedSidearmId === 'scrap-p12' && finiteServiceAssignments === 1,
        version: pistolState.version,
        pistolMigration: { primary: pistol.equippedPrimaryWeaponId, sidearm: pistol.equippedSidearmId, active: pistol.equippedWeaponId },
        rifleMigration: { primary: rifle.equippedPrimaryWeaponId, sidearm: rifle.equippedSidearmId, active: rifle.equippedWeaponId },
        finiteServiceAssignments
      };
    },
    weaponRoleBalanceForTest: () => {
      const scrap = getCareerWeapon('scrap-p12');
      const service = getCareerWeapon('service-p12');
      const viper = getCareerWeapon('viper-9');
      const rifle = getCareerWeapon('ar4-sentinel');
      const weapons = [scrap, service, viper, rifle];
      const completeCopy = weapon => Array.isArray(weapon.benefits) && weapon.benefits.length >= 2 && Array.isArray(weapon.drawbacks) && weapon.drawbacks.length >= 2 && Boolean(weapon.description);
      return {
        ok: weapons.every(completeCopy) && rifle.slotType === 'primary' && weapons.slice(0, 3).every(weapon => weapon.slotType === 'sidearm') && rifle.range > service.range && rifle.magSize > service.magSize && rifle.armourPenetration > service.armourPenetration && rifle.movementPenalty > service.movementPenalty && rifle.switchTime > viper.switchTime && rifle.sprintSettlePenalty > service.sprintSettlePenalty && viper.handling > rifle.handling,
        weapons: weapons.map(weapon => ({ id: weapon.id, slot: weapon.slotType, range: weapon.range, magazine: weapon.magSize, penetration: weapon.armourPenetration, movementPenalty: weapon.movementPenalty, handling: weapon.handling, switchTime: weapon.switchTime, benefits: [...weapon.benefits], drawbacks: [...weapon.drawbacks] }))
      };
    },
    weaponSwitchingForTest: () => {
      const bot = new Bot(TEAM_RED, 0);
      const stats = { marksmanship: 5, handling: 5, awareness: 5, mobility: 5, resilience: 5, criticalChance: 0, criticalDamage: 0 };
      applyCombatBuildToBot(bot, stats, cloneCareerWeapon('ar4-sentinel'), 0, cloneCareerWeapon('viper-9'));
      captureBotWeaponHandlingBaseline(bot);
      refreshBotActiveWeaponHandling(bot);
      bot.alive = true;
      bot.x = 0; bot.y = 0;
      bot.usingSecondary = false;
      bot.weapon = bot.primaryWeapon;
      bot.primaryAmmo = bot.primaryWeapon.magSize;
      bot.secondaryAmmo = bot.secondaryWeapon.magSize;
      bot.magAmmo = bot.primaryAmmo;
      bot.primaryReserve = bot.primaryWeapon.magSize * 2;
      bot.secondaryReserve = bot.secondaryWeapon.magSize * 2;
      bot.weaponSwapTimer = 0;
      bot.reloadTimer = 0;
      bot.weaponSettleTimer = 0.30;
      bot.turnBlend = 0.8;
      bot.isSprinting = true;
      const closeEnemy = { x: 3.2, y: 0, alive: true };
      bot.updateWeaponState(1 / 60, closeEnemy);
      const closeSwitchStarted = bot.weaponSwapTarget === true && bot.weaponSwapTimer > 0;
      bot.updateWeaponState(1, closeEnemy);
      const sidearmActive = bot.usingSecondary && bot.weapon.id === 'viper-9';
      bot.isSprinting = false;
      bot.turnBlend = 0;
      const farEnemy = { x: 10.5, y: 0, alive: true };
      bot.updateWeaponState(1 / 60, farEnemy);
      const rangeSwitchStarted = bot.weaponSwapTarget === false && bot.weaponSwapTimer > 0;
      bot.updateWeaponState(1, farEnemy);
      const primaryRestored = !bot.usingSecondary && bot.weapon.id === 'ar4-sentinel';
      return { ok: closeSwitchStarted && sidearmActive && rangeSwitchStarted && primaryRestored, closeSwitchStarted, sidearmActive, rangeSwitchStarted, primaryRestored, activeWeaponId: bot.weapon.id, closeReason: 'draw sidearm for close contact', rangeReason: bot.lastTacticalReason };
    },
    grantWeaponCopyForTest: (id = 'ar4-sentinel', count = 1) => {
      const weaponId = CAREER_WEAPON_CATALOG[id] ? id : 'ar4-sentinel';
      for (let index = 0; index < Math.max(1, Math.round(Number(count) || 1)); index++) careerState.inventory.push(weaponId);
      saveCareerState();
      return { id: weaponId, owned: careerWeaponOwnedCount(weaponId), inventory: [...careerState.inventory] };
    },
    equipWeaponForTest: (playerId, weaponId, slot = null) => {
      selectedTeamPlayerId = String(playerId || careerState.squad?.[0]?.id || '');
      const ok = equipCareerWeapon(String(weaponId || 'scrap-p12'), slot ? { slot: String(slot) } : {});
      const player = careerArmouryTargetPlayer();
      return { ok, playerId: selectedTeamPlayerId, primaryWeaponId: player ? careerPlayerPrimaryWeaponId(player) : null, sidearmWeaponId: player ? careerPlayerSidearmId(player) : null, activeWeaponId: player ? careerPlayerActiveWeaponId(player) : null, inventory: window.__strikeDebug.weaponInventoryForTest() };
    },
    cratePoolForTest: () => CAREER_CRATE_REWARDS.map(item => ({ ...item })),
    reloadAudioCoverageForTest: () => validateCareerWeaponReloadAudioCoverage(),
    claimForcedWeaponCopyForTest: (id = 'ar4-sentinel') => {
      const weaponId = CAREER_WEAPON_CATALOG[id] ? id : 'ar4-sentinel';
      const before = careerWeaponOwnedCount(weaponId);
      careerCrateState.phase = 'revealed';
      careerCrateState.source = 'victory';
      careerCrateState.returnRoute = 'loadout';
      careerCrateState.result = { type: 'weapon', id: weaponId };
      careerCrateState.duplicate = false;
      careerCrateState.additionalCopy = before > 0;
      claimCareerCrate();
      return { id: weaponId, before, after: careerWeaponOwnedCount(weaponId), inventory: [...careerState.inventory] };
    },
    leagueScheduleForTest: () => {
      const league = ensureLeagueState();
      const fixtures = league?.fixtures || [];
      const userFixtures = fixtures.filter(fixture => fixture.homeId === LEAGUE_USER_CLUB_ID || fixture.awayId === LEAGUE_USER_CLUB_ID);
      const pairs = new Map();
      for (const fixture of fixtures) {
        const key = [fixture.homeId, fixture.awayId].sort().join('|');
        if (!pairs.has(key)) pairs.set(key, []);
        pairs.get(key).push(fixture);
      }
      const badPairs = [...pairs.values()].filter(pair => pair.length !== 2 || pair[0].homeId !== pair[1].awayId || pair[0].awayId !== pair[1].homeId).length;
      return {
        version: league?.version || 0,
        clubs: league?.clubs?.length || 0,
        fixtures: fixtures.length,
        userFixtures: userFixtures.length,
        matchdays: leagueSeasonMatchCount(league?.clubs?.length || 0),
        pairCount: pairs.size,
        badPairs,
        matchdayMin: fixtures.length ? Math.min(...fixtures.map(fixture => fixture.matchday)) : 0,
        matchdayMax: fixtures.length ? Math.max(...fixtures.map(fixture => fixture.matchday)) : 0
      };
    },
    sharedCrateHostForTest: () => {
      const state = typeof syncCareerCrateCanvasHost === 'function' ? syncCareerCrateCanvasHost() : null;
      return { storePreview: Boolean(state?.storePreview), overlayVisible: Boolean(state?.overlayVisible), parentClass: careerCrateCanvas?.parentElement?.className || '', sameCanvas: careerCrateCanvas?.id === 'careerCrateCanvas' };
    },
    crateAttachmentForTest: (yaw = -0.48, openingProgress = 0) => typeof rewardCrateAttachmentAudit === 'function'
      ? rewardCrateAttachmentAudit(yaw, openingProgress)
      : { ok: false, reason: 'Reward crate attachment audit unavailable' },
    leagueTierForTest: value => {
      const tier = normaliseLeagueTier(value);
      const division = leagueDivisionDefinition(tier);
      return { tier, name: division.name, short: division.short, poolLabel: division.poolLabel };
    },
    setLeagueTierForTest: value => {
      const league = ensureLeagueState();
      if (!league) return null;
      const tier = normaliseLeagueTier(value);
      league.divisionTier = tier;
      league.name = leagueDivisionDefinition(tier).name;
      if (careerState.staff) careerState.staff.selectedPoolDivision = tier;
      leagueNormalisedState = null;
      ensureLeagueState();
      updateMenuUI();
      return { tier: leagueDivisionTier(), name: leagueCompetitionName(), short: leagueDivisionDefinition().short, integrity: auditCareerStateIntegrity() };
    },
    normaliseStateForTest: raw => {
      const restored = normaliseCareerState(raw && typeof raw === 'object' ? raw : {});
      return {
        version: restored.version,
        calendar: { ...restored.calendar },
        financeLoan: restored.financeLoan ? { ...restored.financeLoan } : null,
        tutorial: restored.tutorial ? {
          marketViewed: Boolean(restored.tutorial.marketViewed),
          profileViewed: Boolean(restored.tutorial.profileViewed),
          squadViewed: Boolean(restored.tutorial.squadViewed),
          completed: Boolean(restored.tutorial.completed),
          dismissed: Boolean(restored.tutorial.dismissed),
          contextSeen: { ...(restored.tutorial.contextSeen || {}) }
        } : null,
        totals: {
          rounds: restored.totalRounds, matches: restored.totalMatches, matchWins: restored.matchWins,
          wins: restored.totalWins, kills: restored.totalKills, deaths: restored.totalDeaths,
          bestRoundKills: restored.bestRoundKills, cratesOpened: restored.cratesOpened
        },
        credits: restored.credits,
        goldCoins: restored.goldCoins,
        goldCoinHistory: (restored.goldCoinHistory || []).map(item => ({ ...item })),
        financeHistory: (restored.financeHistory || []).map(item => ({ ...item })),
        storeCratesPurchased: restored.storeCratesPurchased,
        pendingStoreCrate: restored.pendingStoreCrate ? { ...restored.pendingStoreCrate, reward: { ...restored.pendingStoreCrate.reward } } : null,
        squad: (restored.squad || []).map(player => ({ id: player?.id || null, primaryWeaponId: careerPlayerPrimaryWeaponId(player), sidearmWeaponId: careerPlayerSidearmId(player), weaponId: careerPlayerActiveWeaponId(player), contractWeeks: Math.max(0, Math.round(Number(player?.contractWeeks) || 0)) })),
        inventory: [...(restored.inventory || [])],
        league: restored.league && typeof restored.league === 'object'
          ? (() => {
              const tier = normaliseLeagueTier(restored.league.divisionTier);
              return { tier, name: leagueDivisionDefinition(tier).name, storedName: restored.league.name || null };
            })()
          : null,
        selectedPoolDivision: normaliseLeagueTier(restored.staff?.selectedPoolDivision),
        familiarity: restored.tactics?.familiarity ? {
          formation: { ...(restored.tactics.familiarity.formation || {}) },
          approach: { ...(restored.tactics.familiarity.approach || {}) },
          engagement: { ...(restored.tactics.familiarity.engagement || {}) },
          priority: { ...(restored.tactics.familiarity.priority || {}) }
        } : null
      };
    },
    calendarHeaderForTest: () => ({
      parts: typeof clubCurrentDateParts === 'function' ? { ...clubCurrentDateParts() } : null,
      balance: managerOperatorNameEl?.textContent || '',
      clubMeta: managerOperatorLevelEl?.textContent || '',
      teamName: managerOperatorNameEl?.textContent || '',
      teamLevel: managerOperatorLevelEl?.textContent || '',
      day: managerDateDayEl?.textContent || '',
      meta: managerDateMetaEl?.textContent || '',
      label: menuEndDayBtn?.getAttribute('aria-label') || '',
      endDayVisible: Boolean(menuEndDayBtn && !menuEndDayBtn.hidden),
      guidedLock: Boolean(menuEndDayBtn?.classList.contains('guided-lock')),
      lockIconVisible: (() => {
        const icon = menuEndDayBtn?.querySelector('.manager-end-day-lock-icon');
        if (!icon) return false;
        const style = getComputedStyle(icon);
        return style.display !== 'none' && style.visibility !== 'hidden';
      })(),
      visiblePrimaryText: managerDateDayEl?.textContent || '',
      visibleSecondaryText: managerDateMetaEl?.textContent || '',
      blockers: typeof clubEndDayBlockers === 'function' ? clubEndDayBlockers().map(item => ({ ...item })) : []
    }),
    playerStatDraftForTest: (playerId, stat = 'marksmanship') => {
      const player = (careerState.squad || []).find(candidate => candidate.id === String(playerId || '')) || (careerState.squad || [])[0] || null;
      if (!player) return { ok: false, reason: 'NO PLAYER' };
      const before = { points: player.unspentPoints, value: player.stats?.[stat], saved: JSON.stringify(player.stats || {}) };
      const added = changePlayerStatDraft(player.id, stat, 1);
      const pending = playerStatAllocationSummary(player);
      const removed = added ? changePlayerStatDraft(player.id, stat, -1) : false;
      const restored = playerStatAllocationSummary(player);
      return { ok: added && removed, playerId: player.id, stat, before, pending, restored, persistentUnchanged: before.saved === JSON.stringify(player.stats || {}) && before.points === player.unspentPoints };
    },
    savePlayerStatDraftForTest: (playerId, stat = 'marksmanship') => {
      const player = (careerState.squad || []).find(candidate => candidate.id === String(playerId || '')) || (careerState.squad || [])[0] || null;
      if (!player) return { ok: false, reason: 'NO PLAYER' };
      const before = { points: player.unspentPoints, value: player.stats?.[stat] };
      const drafted = changePlayerStatDraft(player.id, stat, 1);
      const saved = drafted ? savePlayerStatDraft(player.id) : false;
      return { ok: drafted && saved, before, after: { points: player.unspentPoints, value: player.stats?.[stat] } };
    },
    mustRespondPlacementForTest: () => ({
      route: menuTab,
      blockers: typeof clubEndDayBlockers === 'function' ? clubEndDayBlockers().length : 0,
      strips: menuContentEl?.querySelectorAll('.club-must-respond-strip').length || 0,
      endDayButtons: document.querySelectorAll('#menuEndDayBtn, .club-end-day-inline').length
    }),
    matchRewardForTest: (won = false, mode = 'league', rounds = 3, multiplier = 1) => teamMatchRewardBreakdown(Boolean(won), String(mode || 'league'), Number(rounds) || 0, Number(multiplier) || 1),
    calendarForTest: () => {
      const current = clubCalendarState().absoluteDay;
      const range = typeof clubCalendarMonthRange === 'function'
        ? clubCalendarMonthRange()
        : { startDay: current - clubCalendarState().dayOfWeek, endDay: current - clubCalendarState().dayOfWeek + CLUB_CALENDAR_VISIBLE_WEEKS * 7 - 1 };
      return {
        current,
        date: typeof clubCurrentDateParts === 'function' ? { ...clubCurrentDateParts() } : null,
        range: { ...range },
        todayCount: typeof clubCalendarTodayEventCount === 'function' ? clubCalendarTodayEventCount() : 0,
        events: typeof clubCalendarEvents === 'function' ? clubCalendarEvents(range.startDay, range.endDay).map(item => ({ ...item })) : [],
        loan: typeof clubFinanceLoanState === 'function' ? { ...clubFinanceLoanState() } : null
      };
    },
    setLoanForTest: updates => {
      const loan = clubFinanceLoanState();
      if (updates && typeof updates === 'object') Object.assign(loan, updates);
      careerState.financeLoan = normaliseFinanceLoan(loan, true, careerState.week);
      saveCareerState();
      return { ...clubFinanceLoanState() };
    },
    setCalendarDayForTest: (absoluteDay, nextLeagueDay = null) => {
      const day = Math.max(0, Math.round(Number(absoluteDay) || 0));
      const calendar = clubCalendarState();
      calendar.absoluteDay = day;
      calendar.dayOfWeek = day % 7;
      careerState.week = Math.floor(day / 7) + 1;
      if (Number.isFinite(Number(nextLeagueDay))) calendar.nextLeagueDay = Math.max(day, Math.round(Number(nextLeagueDay)));
      calendar.lastWeeklySummary = Math.min(calendar.lastWeeklySummary, careerState.week - 1);
      calendar.lastPayrollWeek = Math.min(calendar.lastPayrollWeek, careerState.week);
      saveCareerState();
      updateMenuUI();
      return { day, week: careerState.week, date: typeof clubCurrentDateParts === 'function' ? { ...clubCurrentDateParts() } : null, calendar: { ...calendar } };
    },
    processLoanForTest: () => ({ results: clubProcessFoundationLoan(), loan: { ...clubFinanceLoanState() }, credits: careerState.credits }),
    setPlayerContractForTest: (playerId, weeks) => {
      const player = teamPlayerById(String(playerId || ''));
      if (!player) return null;
      player.contractWeeks = Math.max(0, Math.round(Number(weeks) || 0));
      player.contractExpiryNotified = false;
      saveCareerState();
      return { id: player.id, weeks: player.contractWeeks };
    },
    scoreboardTelemetryForTest: (slot = 0) => {
      const ok = selectScoreboardOperator(CAREER_OWNED_TEAM, slot);
      return { ok, route: menuTab, playerId: selectedTeamPlayerId, appState };
    },
    officeWallDisplayAuditForTest: () => {
      const arena = ARENA_LIBRARY.office;
      const screens = arena?.decor?.wallScreens || [];
      return screens.map(screen => {
        const yaw = Number(screen.yaw) || 0;
        const normal = { x: Math.sin(yaw), y: Math.cos(yaw) };
        const sampleDistances = [-0.08, 0.08].map(distance => {
          const x = screen.x + normal.x * distance;
          const y = screen.z + normal.y * distance;
          const cell = arena.layout[Math.floor(y)]?.[Math.floor(x)] || '1';
          return { distance, x: Number(x.toFixed(3)), y: Number(y.toFixed(3)), cell };
        });
        const projectsIntoWalkway = sampleDistances.every(sample => sample.cell === '0') && Math.max(...sampleDistances.map(sample => Math.abs(sample.distance))) > 0.06;
        return { label: screen.label, x: screen.x, z: screen.z, yaw, width: screen.width, flushMount: Boolean(screen.flushMount), samples: sampleDistances, projectsIntoWalkway };
      });
    },
    officeDoorPocketAuditForTest: () => {
      const doors = ARENA_LIBRARY.office?.props?.doors || [];
      const checks = doors.map(door => {
        const samples = [0, 0.25, 0.5, 0.75, 1].map(openAmount => {
          const state = { ...door, openAmount };
          const visible = visibleDoorPanelDescriptors(state);
          return {
            openAmount,
            panels: visible.length,
            visibleWidth: diagnosticRound(visible.reduce((total, panel) => total + panel.width, 0), 4),
            maximumPanelWidth: diagnosticRound(Math.max(0, ...visible.map(panel => panel.width)), 4)
          };
        });
        const widths = samples.map(sample => sample.visibleWidth);
        const monotonic = widths.every((width, index) => index === 0 || width <= widths[index - 1] + 0.0001);
        return {
          id: door.id,
          samples,
          monotonic,
          closedWidth: widths[0],
          fullyOpenWidth: widths[widths.length - 1],
          concealedWhenOpen: widths[widths.length - 1] <= 0.008,
          ok: monotonic && widths[0] >= 0.84 && widths[widths.length - 1] <= 0.008
        };
      });
      return { count: checks.length, checks, ok: checks.length === 12 && checks.every(check => check.ok) };
    },
    teamIdentityForTest: (logoId = 'shield', logoColor = '#63c8ef') => {
      const identity = normaliseTeamIdentity({ logoId, logoColor });
      return { identity, definition: TEAM_LOGO_DEFS[identity.logoId]?.label || '', markup: teamLogoSvg(identity), section: menuSectionForRoute('store') };
    },
    eliminationFeedForTest: () => {
      const killer = { team: TEAM_BLUE, name: 'Test Killer', weapon: null, primaryWeapon: null };
      const victim = { team: TEAM_RED, name: 'Test Victim' };
      const ok = addFeed(killer, victim, true, true);
      return { ok, rows: feed.length, html: feed[0]?.html || '' };
    },
    forceEnemyEliminationForTest: () => {
      const killer = bots.find(bot => bot.team === CAREER_OWNED_TEAM && bot.alive) || null;
      const victim = bots.find(bot => bot.team !== CAREER_OWNED_TEAM && bot.alive) || null;
      if (!killer || !victim || typeof victim.die !== 'function') return { ok: false, reason: 'No live opposing pair available.' };
      const beforeRows = feed.length;
      victim.die(killer, { critical: true, damage: Math.max(1, Number(victim.health) || 1) });
      return {
        ok: !victim.alive,
        killer: killer.name,
        victim: victim.name,
        feedAdded: feed.length >= beforeRows,
        latestHtml: feed[0]?.html || ''
      };
    },
    subnavNotificationsForTest: () => Array.from(menuSubnavEl?.querySelectorAll('.menu-subtab') || []).map(button => ({
      route: button.dataset.menuRoute || '',
      label: button.getAttribute('aria-label') || '',
      badge: button.querySelector('.menu-subtab-notification')?.textContent || '',
      tone: button.querySelector('.menu-subtab-notification')?.className || ''
    })),
    menuHistory: () => ({ index: menuNavigationIndex, entries: menuNavigationHistory.map(item => ({ ...item })), canBack: menuNavigationIndex > 0, canForward: menuNavigationIndex >= 0 && menuNavigationIndex < menuNavigationHistory.length - 1 }),
    menuBackForTest: () => ({ ok: navigateMenuHistory(-1), state: window.__strikeDebug.menuHistory(), route: menuTab }),
    menuForwardForTest: () => ({ ok: navigateMenuHistory(1), state: window.__strikeDebug.menuHistory(), route: menuTab }),
    endDayBlockersForTest: () => (typeof clubEndDayBlockers === 'function' ? clubEndDayBlockers().map(item => ({ ...item })) : []),
    teamNoteModalAccessibilityForTest: () => {
      if (!teamNoteOverlayEl || typeof openTeamNoteModal !== 'function' || typeof closeTeamNoteModal !== 'function') {
        return { ok: false, checks: { modalAvailable: false } };
      }
      closeTeamNoteModal({ restoreFocus: false });
      const background = teamNoteBackgroundElements();
      const original = background.map(element => ({
        element,
        inert: Boolean(element.inert),
        inertAttribute: element.hasAttribute('inert')
      }));
      const checks = {};
      try {
        openTeamNoteModal({
          title: 'ACCESSIBILITY TEST',
          body: 'Modal focus and background isolation regression check.',
          actionsHtml: '<button type="button" id="teamNoteTestFirst">FIRST</button><button type="button" id="teamNoteTestLast">LAST</button>'
        });
        const dialog = teamNoteOverlayEl.querySelector('[role="dialog"]');
        const first = teamNoteCloseBtn;
        const last = document.getElementById('teamNoteTestLast');
        checks.backgroundIsInert = background.length > 0 && background.every(element => element.inert && element.hasAttribute('inert'));
        checks.overlayExposed = !teamNoteOverlayEl.hidden && teamNoteOverlayEl.getAttribute('aria-hidden') === 'false';
        checks.dialogIsModal = dialog?.getAttribute('aria-modal') === 'true';
        checks.initialFocusInside = teamNoteOverlayEl.contains(document.activeElement);
        last?.focus();
        let forwardPrevented = false;
        trapTeamNoteModalFocus({ key: 'Tab', shiftKey: false, preventDefault: () => { forwardPrevented = true; } });
        checks.forwardTabWraps = forwardPrevented && document.activeElement === first;
        first?.focus();
        let backwardPrevented = false;
        trapTeamNoteModalFocus({ key: 'Tab', shiftKey: true, preventDefault: () => { backwardPrevented = true; } });
        checks.backwardTabWraps = backwardPrevented && document.activeElement === last;
      } finally {
        closeTeamNoteModal({ restoreFocus: false });
        checks.backgroundRestored = original.every(({ element, inert, inertAttribute }) =>
          Boolean(element.inert) === inert && element.hasAttribute('inert') === inertAttribute);
        checks.overlayHidden = teamNoteOverlayEl.hidden && teamNoteOverlayEl.getAttribute('aria-hidden') === 'true';
      }
      return { ok: Object.values(checks).every(Boolean), checks };
    },
    matchdayForTest: () => ({
      confirmed: typeof clubMatchPlanConfirmed === 'function' ? clubMatchPlanConfirmed() : false,
      prep: typeof clubMatchPrepState === 'function' ? { ...clubMatchPrepState() } : null,
      plan: typeof clubTacticalPlanSnapshot === 'function' ? clubTacticalPlanSnapshot() : null,
      activePlan: typeof clubActiveMatchPlan === 'function' ? clubActiveMatchPlan() : null,
      suitability: typeof clubTacticalSuitabilityReport === 'function' ? clubTacticalSuitabilityReport() : null,
      decisions: typeof clubOpenDecisions === 'function' ? clubOpenDecisions().map(item => ({ ...item, options: (item.options || []).map(option => ({ ...option })) })) : [],
      coordination: bots.map(bot => ({
        team: bot.team, slot: bot.slot, name: bot.name, role: bot.playerRole,
        approach: bot.teamApproachId, priority: bot.teamPriorityId,
        planFit: Number(bot.tacticalPlanFit) || 0,
        executionPercent: Number(bot.tacticalExecutionPercent) || 100,
        roleSuitability: Number(bot.roleSuitabilityScore) || 0,
        decisionMultiplier: Number(bot.tacticalDecisionMultiplier) || 1,
        supportedTime: Number(bot.roundSupportedTime) || 0,
        isolatedTime: Number(bot.roundIsolatedTime) || 0,
        regroupActions: Number(bot.roundRegroupActions) || 0,
        tradeAttempts: Number(bot.roundTradeAttempts) || 0,
        tradeKills: Number(bot.roundTradeKills) || 0,
        roleActions: Number(bot.roundRoleActions) || 0,
        routeReplans: Number(bot.roundRouteReplans) || 0
      }))
    }),
    mobileTacticsControlsForTest: () => {
      const markup = typeof renderAdvancedTacticsTab === 'function' ? renderAdvancedTacticsTab() : '';
      const dockIndex = markup.indexOf('mobile-match-plan-actions');
      const formationIndex = markup.indexOf('club-tactics-panel');
      const finalCheckIndex = markup.indexOf('club-plan-confirm');
      return {
        dockRemoved: dockIndex < 0,
        finalCheckAfterDetailedSettings: finalCheckIndex > formationIndex,
        confirmActions: (markup.match(/data-matchday-action="confirm-plan"/g) || []).length,
        deployActions: (markup.match(/data-matchday-action="deploy"/g) || []).length,
        confirmed: typeof clubMatchPlanConfirmed === 'function' ? clubMatchPlanConfirmed() : false
      };
    },
    setMatchdayPlanForTest: (approach = 'balanced', engagement = 'mixed', priority = 'trade') => {
      const tactics = clubTacticsState();
      tactics.approachId = CLUB_APPROACHES[approach] ? approach : 'balanced';
      tactics.engagementId = CLUB_ENGAGEMENTS[engagement] ? engagement : 'mixed';
      tactics.priorityId = CLUB_PRIORITIES[priority] ? priority : 'trade';
      clubInvalidateMatchPlan('Debug plan changed.');
      saveCareerState();
      return window.__strikeDebug.matchdayForTest();
    },
    tacticalSuitabilityForTest: overrides => clubTacticalSuitabilityReport(overrides && typeof overrides === 'object' ? overrides : {}),
    setTacticalFamiliarityForTest: (bucket, id, value) => {
      const state = tacticalNormaliseFamiliarity(clubTacticsState().familiarity);
      const key = String(bucket || '');
      const option = String(id || '');
      if (!state[key] || !(option in state[key])) return { ok: false, familiarity: state };
      state[key][option] = clamp(Math.round(Number(value) || 0), 0, 100);
      saveCareerState();
      return { ok: true, familiarity: state, suitability: clubTacticalSuitabilityReport() };
    },
    recordTacticalFamiliarityForTest: (won = false, roundsPlayed = 5) => {
      const plan = clubTacticalPlanSnapshot();
      const result = clubRecordTacticalFamiliarity({ tacticalPlan: plan, won: Boolean(won), roundsPlayed: Math.max(1, Math.round(Number(roundsPlayed) || 5)) });
      saveCareerState();
      return { result, familiarity: clubTacticsState().familiarity, suitability: clubTacticalSuitabilityReport() };
    },
    confirmMatchdayPlanForTest: () => ({ ok: clubConfirmMatchPlan(), state: window.__strikeDebug.matchdayForTest() }),
    matchPlanPersistenceForTest: () => {
      if (!careerSquadReady() && typeof window.__strikeDebug?.seedReadabilityCareerForTest === 'function') window.__strikeDebug.seedReadabilityCareerForTest(5);
      const calendar = clubCalendarState();
      const tactics = clubTacticsState();
      const player = clubWorkflowSquad()[0] || null;
      const originalDay = calendar.absoluteDay;
      const originalApproach = tactics.approachId;
      const originalFatigue = Number(player?.fatigue) || 0;
      const originalPrep = { ...tactics.matchPrep, fixtureDrills: [...(tactics.matchPrep.fixtureDrills || [])] };
      const confirmed = clubConfirmMatchPlan();
      const confirmedFixtureId = clubMatchPrepState().fixtureId;
      calendar.absoluteDay = originalDay + 1;
      if (player) player.fatigue = clamp(originalFatigue + 7, 0, 100);
      const survivesDayAndReadiness = clubMatchPlanConfirmed();
      tactics.approachId = originalApproach === 'balanced' ? 'aggressive' : 'balanced';
      const materialChangeInvalidates = !clubMatchPlanConfirmed();
      tactics.approachId = originalApproach;
      calendar.absoluteDay = originalDay;
      if (player) player.fatigue = originalFatigue;
      tactics.matchPrep = originalPrep;
      saveCareerState();
      return {
        ok: Boolean(confirmed && confirmedFixtureId && survivesDayAndReadiness && materialChangeInvalidates),
        confirmed,
        fixtureId: confirmedFixtureId,
        survivesDayAndReadiness,
        materialChangeInvalidates
      };
    },
    applyMatchdayPlanToBotsForTest: () => {
      clubCaptureActiveMatchPlan();
      createMatch();
      return window.__strikeDebug.matchdayForTest();
    },
    startPreparedMatchForTest: (mode = 'exhibition') => {
      startNewMatch(mode);
      if (deploymentSelectionState.active) confirmDeploymentSelection();
      if (matchmakingState.active) {
        matchmakingState.elapsed = MATCHMAKING_TOTAL_TIME;
        updateMatchmakingUI(true);
        completeMatchmaking();
      }
      return { appState, roundNumber, matchmaking: matchmakingState.active, state: window.__strikeDebug.matchdayForTest() };
    },
    tacticalAnalysisForTest: summary => buildTacticalMatchAnalysis(summary || careerState.lastRound || { roundsPlayed: 1, accuracy: 0, damageDealt: 0, damageTaken: 0, finance: { teamTotals: {} } }),
    tacticalPreviewForTest: (arenaId = 'dune') => {
      if (!careerState.created && typeof window.__strikeDebug?.seedReadabilityCareerForTest === 'function') window.__strikeDebug.seedReadabilityCareerForTest(5);
      const id = ARENA_LIBRARY[String(arenaId || '')] ? String(arenaId) : clubWorkflowTactics().arenaId;
      const previousArena = clubWorkflowTactics().arenaId;
      clubWorkflowTactics().arenaId = id;
      const plan = clubTacticalPlanSnapshot();
      const preview = clubTacticalPreviewSnapshot(plan, id);
      const markup = typeof deploymentTacticalPreviewMarkup === 'function' ? deploymentTacticalPreviewMarkup(plan, arenaMeta(id)) : '';
      clubWorkflowTactics().arenaId = previousArena;
      const objectiveKeys = preview.rows.map(row => `${Number(row.objective?.x || 0).toFixed(2)}:${Number(row.objective?.y || 0).toFixed(2)}`);
      return {
        ok: preview.rows.length === TEAM_REQUIRED_STARTERS && preview.openingPlanId === plan.openingPlanId && objectiveKeys.every(Boolean),
        arenaId: id,
        openingPlanId: preview.openingPlanId,
        openingPlanName: preview.openingPlanName,
        openingPlanZone: preview.openingZone,
        rowCount: preview.rows.length,
        uniqueObjectiveCount: new Set(objectiveKeys).size,
        warningCount: preview.warnings.length,
        hasActualRouteCopy: markup.includes('actual opening objectives assigned for round one'),
        hasLaneRows: (markup.match(/deployment-lane-row/g) || []).length === TEAM_REQUIRED_STARTERS
      };
    },
    openingPlanParityForTest: (arenaId = 'dune') => {
      if (!careerState.created && typeof window.__strikeDebug?.seedReadabilityCareerForTest === 'function') window.__strikeDebug.seedReadabilityCareerForTest(5);
      const id = ARENA_LIBRARY[String(arenaId || '')] ? String(arenaId) : 'dune';
      clubWorkflowTactics().arenaId = id;
      clubCaptureActiveMatchPlan();
      setActiveArena(id);
      createMatch();
      const activePlan = clubActiveMatchPlan();
      const ownBots = bots.filter(bot => bot.team === CAREER_OWNED_TEAM);
      const objectiveMatches = ownBots.map((bot, index) => {
        const expected = currentEngagementPlan?.blue?.[index] || null;
        const actual = bot.openingPlanObjective || null;
        return Boolean(expected && actual && Math.abs(expected.x - actual.x) < 0.01 && Math.abs(expected.y - actual.y) < 0.01);
      });
      return {
        ok: roundNumber === 1 && activePlan?.openingPlanId === currentEngagementPlan?.id && objectiveMatches.length === TEAM_REQUIRED_STARTERS && objectiveMatches.every(Boolean),
        arenaId: id,
        roundNumber,
        expectedPlanId: activePlan?.openingPlanId || '',
        actualPlanId: currentEngagementPlan?.id || '',
        actualPlanName: currentEngagementPlan?.name || '',
        objectiveMatches
      };
    },
    tacticalCoachingAnalysisForTest: () => {
      if (!careerState.created && typeof window.__strikeDebug?.seedReadabilityCareerForTest === 'function') window.__strikeDebug.seedReadabilityCareerForTest(5);
      const plan = clubTacticalPlanSnapshot();
      const starters = clubWorkflowSquad().slice(0, TEAM_REQUIRED_STARTERS);
      const operatorAnalysis = starters.map((player, index) => ({
        key: `blue-${index}`, name: player.name, playerId: player.id, role: clubMatchRoleForPlayer(player).id,
        weapon: { id: careerPlayerActiveWeaponId(player), name: getCareerWeapon(careerPlayerActiveWeaponId(player)).name },
        averageTargetDistance: 7.4 + index * 0.25, effectiveRangePercent: 50 - index * 2,
        movementDistance: 70 + index * 3, stationaryPercent: 28 + index * 5, crouchedStationaryPercent: index * 2,
        pathChanges: 12 + index, targetChanges: 8 + index, tacticalChanges: 10 + index,
        kills: index === 0 ? 2 : 1, deaths: index % 2, blockedShots: index === 3 ? 3 : 0,
        recoveries: 1, flankRoutes: index === 0 ? 2 : 0, primaryZone: index < 3 ? 'GATE' : 'BAZAAR', primaryState: index === 0 ? 'push' : 'advance',
        stateUsage: { advance: 30, push: index === 0 ? 18 : 8, cover: 12, hold: 7, reposition: 5 }
      }));
      const summary = {
        tacticalPlan: plan, roundsPlayed: 3, won: false, blueScore: 1, redScore: 3,
        shotsFired: 96, shotsHit: 24, accuracy: 24 / 96, damageDealt: 760, damageTaken: 780,
        fightLocation: 'GATE', operatorAnalysis,
        zoneAnalysis: [
          { zone: 'GATE', damage: 520, damageSharePercent: 68, combatSeconds: 72, combatSharePercent: 62, eliminations: 7, maximumFriendlyOccupancy: 4, teammateMovementBlocks: 1, teammateBlockedShots: 4 },
          { zone: 'BAZAAR', damage: 240, damageSharePercent: 32, combatSeconds: 35, combatSharePercent: 30, eliminations: 3, maximumFriendlyOccupancy: 2, teammateMovementBlocks: 0, teammateBlockedShots: 0 }
        ],
        aiStability: { pathChangesPerOperatorMinute: 9.2, tacticalChangesPerOperatorMinute: 10.4, teammateMovementBlocks: 1, teammateBlockedShots: 4, navigationPathHoldReuses: 260 },
        finance: { teamTotals: { supportedTime: 120, isolatedTime: 40, tradeAttempts: 0, tradeKills: 0, regroupActions: 5, roleActions: 31, routeReplans: 3 } }
      };
      const analysis = buildTacticalMatchAnalysis(summary);
      const markup = renderTacticalMatchAnalysis({ ...summary, tacticalAnalysis: analysis });
      return {
        ok: analysis.intentRows.length >= 6 && analysis.playerInsights.length === TEAM_REQUIRED_STARTERS && analysis.recommendations.every(item => item.route) && ['training', 'loadout', 'tactics'].every(route => analysis.recommendations.some(item => item.route === route)),
        intentRowCount: analysis.intentRows.length,
        playerInsightCount: analysis.playerInsights.length,
        recommendationCount: analysis.recommendations.length,
        routes: analysis.recommendations.map(item => item.route),
        cause: analysis.cause,
        hasIntentMarkup: markup.includes('INTENT VERSUS EXECUTION'),
        hasCoachingButtons: markup.includes('data-coaching-route='),
        hasPlayerCards: (markup.match(/career-player-execution /g) || []).length === TEAM_REQUIRED_STARTERS
      };
    },
    tacticalCoachingDestinationForTest: (route = 'training') => {
      if (!careerState.created && typeof window.__strikeDebug?.seedReadabilityCareerForTest === 'function') window.__strikeDebug.seedReadabilityCareerForTest(5);
      const player = clubWorkflowSquad()[0] || null;
      const safeRoute = ['tactics', 'training', 'loadout'].includes(String(route)) ? String(route) : 'tactics';
      const targetId = safeRoute === 'training' ? `training:${player?.id || ''}` : safeRoute === 'loadout' ? `loadout:${player?.id || ''}` : 'tactics:plan';
      if (player) {
        selectedTeamPlayerId = player.id;
        careerState.selectedPlayerId = player.id;
      }
      menuContext = 'main';
      canResumeMatch = false;
      setAppState('menu');
      setMenuRoute(safeRoute);
      const selector = `[data-management-target-id="${String(targetId).replace(/"/g, '\"')}"]`;
      const target = menuContentEl?.querySelector(selector) || null;
      return { ok: menuTab === safeRoute && Boolean(target), route: menuTab, targetId, targetFound: Boolean(target), playerId: player?.id || null };
    },
    mailOrderForTest: () => (typeof clubMailNewestFirst === 'function' ? clubMailNewestFirst() : (careerState.mail || [])).map(item => ({
      id: item.id,
      subject: item.subject,
      day: item.day,
      sequence: typeof clubMailSequenceValue === 'function' ? clubMailSequenceValue(item) : 0,
      read: Boolean(item.read)
    })),
    mailModalForTest: () => ({
      hidden: Boolean(teamNoteOverlayEl?.hidden),
      mode: teamNoteOverlayEl?.dataset.mode || '',
      tone: teamNoteOverlayEl?.dataset.tone || '',
      mailId: teamNoteOverlayEl?.dataset.mailId || '',
      title: teamNoteTitleEl?.textContent || '',
      body: teamNoteBodyEl?.textContent || '',
      footer: teamNoteFooterEl?.textContent || '',
      choiceCount: teamNoteActionsEl?.querySelectorAll('[data-club-decision][data-club-choice]').length || 0,
      hasRelatedRoute: Boolean(teamNoteActionsEl?.querySelector('[data-mail-modal-route]'))
    }),
    mailPresentationForTest: () => {
      const client = menuContentEl?.querySelector('.club-mail-client');
      const reader = menuContentEl?.querySelector('#clubMailReader');
      const list = menuContentEl?.querySelector('.club-mail-list');
      const firstRow = list?.querySelector('.club-mail-row');
      const listHeight = Math.max(0, Math.round(list?.getBoundingClientRect().height || 0));
      const rowHeight = Math.max(0, Math.round(firstRow?.getBoundingClientRect().height || 0));
      return {
        inlineReader: typeof clubMailUsesInlineReader === 'function' ? clubMailUsesInlineReader() : false,
        presentation: client?.dataset.mailPresentation || '',
        selectedMailId: careerState.selectedMailId || '',
        activeRowMailId: menuContentEl?.querySelector('.club-mail-row.active')?.dataset.clubMail || '',
        readerSubject: reader?.querySelector('.club-mail-message-subject h2')?.textContent || '',
        readerChoiceCount: reader?.querySelectorAll('[data-club-decision][data-club-choice]').length || 0,
        modalOpen: Boolean(teamNoteOverlayEl && !teamNoteOverlayEl.hidden && teamNoteOverlayEl.dataset.mode === 'mail'),
        contentScrollTop: Math.max(0, Math.round(menuContentEl?.closest('.menu-content')?.scrollTop || 0)),
        listScrollTop: Math.max(0, Math.round(list?.scrollTop || 0)),
        listHeight,
        rowHeight,
        visibleRowCapacity: rowHeight ? Math.round((listHeight / rowHeight) * 100) / 100 : 0,
        listScrollable: Boolean(list && list.scrollHeight > list.clientHeight + 1)
      };
    },
    selectMailForTest: mailId => {
      const id = String(mailId || careerState.selectedMailId || clubMailMessagesForView?.('inbox')?.[0]?.id || '');
      const ok = typeof selectClubMailAndOpen === 'function' ? selectClubMailAndOpen(id, null) : false;
      return { ok, presentation: window.__strikeDebug.mailPresentationForTest(), modal: window.__strikeDebug.mailModalForTest() };
    },
    openMailModalForTest: mailId => {
      const id = String(mailId || careerState.selectedMailId || clubSelectedMail()?.id || '');
      return { ok: typeof openClubMailModal === 'function' ? openClubMailModal(id, null, true) : false, modal: window.__strikeDebug.mailModalForTest() };
    },
    generateDecisionForTest: () => {
      const calendar = clubCalendarState();
      if (calendar.absoluteDay < 2) {
        calendar.absoluteDay = 4;
        calendar.dayOfWeek = 4;
      }
      const state = clubDecisionState();
      state.lastGeneratedDay = calendar.absoluteDay - 4;
      const decision = clubMaybeGenerateDecision();
      saveCareerState();
      return { decision: decision ? { ...decision, options: (decision.options || []).map(option => ({ ...option })) } : null, blockers: clubEndDayBlockers().map(item => ({ ...item })) };
    },
    resolveDecisionForTest: (decisionId, choiceId) => ({ ok: clubResolveDecision(String(decisionId || ''), String(choiceId || '')), state: window.__strikeDebug.matchdayForTest() }),
    teamManagement: () => ({
      created: careerState.created,
      teamName: careerState.name,
      managerName: careerState.managerName,
      week: careerState.week,
      credits: careerState.credits,
      wageBudget: careerState.wageBudget,
      wageBill: teamSquadWageBill(),
      reputation: careerState.reputation,
      ready: careerSquadReady(),
      tutorialStage: teamTutorialStage(),
      tutorial: { ...(careerState.tutorial || {}) },
      selectedTelemetryPlayerId: selectedTeamPlayerId || null,
      squad: (careerState.squad || []).map((player, index) => ({
        id: player.id, name: player.name, slot: index, starter: index < TEAM_REQUIRED_STARTERS,
        role: player.role, overall: teamPlayerOverall(player), potential: player.potential,
        fee: player.fee, wage: player.wage, contractWeeks: player.contractWeeks,
        fatigue: player.fatigue, happiness: player.happiness, morale: player.morale,
        form: player.form, matchSharpness: player.matchSharpness, readiness: teamReadinessScore(player),
        level: player.level, xp: player.xp, xpRequired: typeof playerXpRequired === 'function' ? playerXpRequired(player) : 0, points: player.unspentPoints,
        trainingFocus: player.trainingFocus, trainingProgress: { ...(player.trainingProgress || {}) }, transferInterest: { ...(player.transferInterest || {}) }, value: player.value,
        lastMatch: player.lastMatch ? { ...player.lastMatch } : null,
        stats: { ...player.stats }, historyEntries: player.history?.length || 0
      })),
      market: (careerState.market || []).map(player => ({
        id: player.id, name: player.name, age: player.age, nationality: player.nationality,
        currentTeam: player.currentTeam || 'Free Agent', rivalBid: player.rivalBid ? { ...player.rivalBid } : null,
        role: player.role, secondaryRole: player.secondaryRole, overall: teamPlayerOverall(player),
        potential: player.potential, personality: player.personality, traits: [...(player.traits || [])],
        fee: player.fee, value: player.value, wage: player.wage, contractWeeks: player.contractWeeks,
        fatigue: player.fatigue, happiness: player.happiness, morale: player.morale,
        form: player.form, matchSharpness: player.matchSharpness, readiness: teamReadinessScore(player),
        stats: { ...player.stats }, historyEntries: player.history?.length || 0
      })),
      finances: (careerState.financeHistory || []).map(item => ({ ...item }))
    }),
    commandCentreForTest: () => {
      const wageBill = typeof clubTotalWageBill === 'function' ? clubTotalWageBill() : teamSquadWageBill();
      const fixture = teamCommandFixtureSnapshot();
      const squad = teamCommandSquadSnapshot();
      const loan = teamCommandLoanSnapshot(wageBill);
      const objectives = teamCommandObjectives(fixture, squad, loan, wageBill);
      const actions = teamCommandRecommendedActions(fixture, squad, loan);
      const recent = teamCommandRecentResults();
      return {
        route: menuTab,
        fixture: { ...fixture, opponent: fixture.opponent ? { id: fixture.opponent.id, name: fixture.opponent.name, rating: fixture.opponent.rating, style: fixture.opponent.style } : null, user: fixture.user ? { ...fixture.user, form: [...(fixture.user.form || [])] } : null },
        squad: { readiness: squad.readiness, fatigue: squad.fatigue, happiness: squad.happiness, medicalCount: squad.medical.length, readyCount: squad.readyCount, starterCount: squad.starters.length, tone: squad.tone },
        loan: { active: loan.active, balance: loan.balance, due: loan.due, dueLabel: loan.dueLabel, daysUntil: loan.daysUntil, reserveAfter: loan.reserveAfter, tone: loan.tone },
        objectives: objectives.map(item => ({ ...item })),
        actions: actions.map(item => ({ ...item })),
        recent: { label: recent.label, tone: recent.tone, wins: recent.wins, results: recent.fixtures.map(item => ({ matchday: item.fixture.matchday, won: item.won, scored: item.scored, conceded: item.conceded, opponent: item.opponent?.name || null })) },
        dom: {
          hero: menuContentEl?.querySelector('.command-centre-hero h2')?.textContent || '',
          threat: menuContentEl?.querySelector('.command-threat strong')?.textContent || '',
          objectiveCount: menuContentEl?.querySelectorAll('.command-objective').length || 0,
          actionCount: menuContentEl?.querySelectorAll('.command-action').length || 0,
          resultCount: menuContentEl?.querySelectorAll('.command-result').length || 0,
          lineupCount: menuContentEl?.querySelectorAll('.command-lineup-player').length || 0
        }
      };
    },
    setCommandCentreFinanceForTest: (credits = 5000, weeksUntil = 0, arrears = 0) => {
      careerState.credits = Math.round(Number(credits) || 0);
      const loan = clubFinanceLoanState();
      if (loan) {
        loan.active = Number(loan.balance) > 0;
        loan.arrears = Math.max(0, Math.round(Number(arrears) || 0));
        loan.nextPaymentWeek = Math.max(1, Math.round(Number(careerState.week) || 1) + Math.max(0, Math.round(Number(weeksUntil) || 0)));
      }
      saveCareerState();
      updateMenuUI();
      return window.__strikeDebug.commandCentreForTest();
    },
    setNextFixtureDueForTest: () => {
      const calendar = clubCalendarState();
      calendar.absoluteDay = Math.max(calendar.absoluteDay, calendar.nextLeagueDay);
      calendar.dayOfWeek = calendar.absoluteDay % 7;
      calendar.nextLeagueDay = calendar.absoluteDay;
      calendar.lastMatchDay = -1;
      saveCareerState();
      updateMenuUI();
      return window.__strikeDebug.clubOperations();
    },
    development: () => ({
      teamLevel: careerState.level,
      teamXp: careerState.xp,
      teamXpRequired: careerXpRequired(),
      teamPoints: careerState.unspentPoints,
      teamBenefits: { ...(careerState.teamBenefits || {}) },
      trainingMultiplier: typeof teamTrainingMultiplier === 'function' ? teamTrainingMultiplier() : 1,
      playerXpMultiplier: typeof teamPlayerXpMultiplier === 'function' ? teamPlayerXpMultiplier() : 1,
      recoveryBonus: typeof teamRecoveryBonus === 'function' ? teamRecoveryBonus() : 0,
      commercialMultiplier: typeof teamCommercialIncomeMultiplier === 'function' ? teamCommercialIncomeMultiplier() : 1,
      players: (careerState.squad || []).map(player => ({
        id: player.id,
        name: player.name,
        level: player.level,
        xp: player.xp,
        xpRequired: typeof playerXpRequired === 'function' ? playerXpRequired(player) : 0,
        points: player.unspentPoints,
        overall: teamPlayerOverall(player),
        potential: player.potential,
        value: player.value,
        interest: { ...(player.transferInterest || {}) },
        trainingFocus: player.trainingFocus,
        trainingProgress: { ...(player.trainingProgress || {}) },
        trainingLastGain: player.trainingLastGain,
        stats: { ...player.stats }
      }))
    }),
    setTrainingFocusForTest: (playerId, focus) => ({ ok: setPlayerTrainingFocus(String(playerId || ''), String(focus || 'none')), state: window.__strikeDebug.development() }),
    managerTrainingTransitionForTest: (playerId = '') => {
      const player = teamPlayerById(String(playerId || '')) || (careerState.squad || [])[0] || null;
      if (!player) return { ok: false, route: menuTab };
      const reflection = playerReflection(player);
      const suggestion = teamInsightTrainingSuggestion(player, reflection);
      openTeamNoteModal({
        kicker: 'MANAGER INSIGHT',
        title: `${player.name} · MANAGER INSIGHT`,
        body: reflection.insight,
        footer: 'POST-MATCH OPERATOR COMMENT',
        tone: 'insight',
        actionsHtml: teamTrainingActionMarkup(player, reflection)
      });
      const action = teamNoteActionsEl?.querySelector('[data-team-note-action="open-training"]');
      const ok = Boolean(action) && handleTeamNoteModalAction({ target: action });
      const appRect = document.getElementById('app')?.getBoundingClientRect();
      const shellRect = menuShellEl?.getBoundingClientRect();
      const contentRect = menuContentEl?.closest('.menu-content')?.getBoundingClientRect();
      return {
        ok,
        route: menuTab,
        modalHidden: Boolean(teamNoteOverlayEl?.hidden),
        bodyLocked: document.body.classList.contains('team-note-open'),
        selectedPlayerId: careerState.selectedPlayerId,
        focusId: player.trainingFocus,
        activeElementTag: String(document.activeElement?.tagName || '').toLowerCase(),
        activeElementTrainingSelect: Boolean(document.activeElement?.matches?.('[data-training-focus]')),
        viewport: { innerHeight: window.innerHeight, visualHeight: window.visualViewport?.height || null },
        app: appRect ? { top: appRect.top, bottom: appRect.bottom, height: appRect.height, bottomGap: Math.max(0, window.innerHeight - appRect.bottom) } : null,
        shell: shellRect ? { top: shellRect.top, bottom: shellRect.bottom, height: shellRect.height, bottomGap: Math.max(0, window.innerHeight - shellRect.bottom) } : null,
        content: contentRect ? { top: contentRect.top, bottom: contentRect.bottom, height: contentRect.height, scrollHeight: menuContentEl.closest('.menu-content').scrollHeight } : null
      };
    },
    grantPlayerXpForTest: (playerId, amount = 100) => {
      const player = (careerState.squad || []).find(candidate => candidate.id === String(playerId || '')) || null;
      if (!player) return null;
      const result = addPlayerXp(player, amount);
      updatePlayerMarketProfile(player);
      saveCareerState();
      return { ...result, player: window.__strikeDebug.development().players.find(candidate => candidate.id === player.id) };
    },
    allocatePlayerStatForTest: (playerId, stat) => ({ ok: allocatePlayerStatPoint(String(playerId || ''), String(stat || '')), state: window.__strikeDebug.development() }),
    grantTeamXpForTest: (amount = 100) => {
      const levelsGained = addCareerXp(amount);
      saveCareerState();
      return { levelsGained, state: window.__strikeDebug.development() };
    },
    allocateTeamBenefitForTest: id => ({ ok: allocateTeamBenefit(String(id || '')), state: window.__strikeDebug.development() }),
    simulateTrainingWeekForTest: playerId => {
      const player = (careerState.squad || []).find(candidate => candidate.id === String(playerId || '')) || null;
      if (!player) return null;
      const result = applyPlayerTrainingWeek(player);
      updatePlayerMarketProfile(player);
      saveCareerState();
      return { result, player: window.__strikeDebug.development().players.find(candidate => candidate.id === player.id) };
    },
    simulateTrainingDayForTest: (playerId, dayOfWeek = 1) => {
      const player = (careerState.squad || []).find(candidate => candidate.id === String(playerId || '')) || null;
      if (!player) return null;
      const result = applyPlayerTrainingDay(player, dayOfWeek);
      updatePlayerMarketProfile(player);
      saveCareerState();
      return { result, player: window.__strikeDebug.development().players.find(candidate => candidate.id === player.id) };
    },
    recoverInjuryDayForTest: playerId => {
      const player = (careerState.squad || []).find(candidate => candidate.id === String(playerId || '')) || null;
      if (!player || typeof recoverPlayerInjuryDay !== 'function') return null;
      const result = recoverPlayerInjuryDay(player);
      saveCareerState();
      return { result, medical: window.__strikeDebug.medical().players.find(candidate => candidate.id === player.id) };
    },
    setInjuryForTest: (playerId, days = 14) => {
      const player = (careerState.squad || []).find(candidate => candidate.id === String(playerId || '')) || null;
      if (!player) return null;
      const duration = clamp(Math.round(Number(days) || 14), 1, 84);
      player.injury = {
        id: 'knee-sprain', name: 'Knee Sprain', severity: 'moderate',
        recoveryDaysRemaining: duration, recoveryProgress: 0,
        weeksRemaining: Math.ceil(duration / 7), occurredWeek: careerState.week,
        riskAtOccurrence: 0.12, aggravated: false, detail: 'Debug medical recovery scenario.'
      };
      normalisePlayerMedical(player);
      saveCareerState();
      return window.__strikeDebug.medical().players.find(candidate => candidate.id === player.id);
    },
    markMatchPlayedTodayForTest: () => ({ day: clubMarkMatchPlayedToday(), canPlayAgain: clubCanPlayMatchToday() }),
    league: () => {
      const league = ensureLeagueState();
      const next = leagueNextFixture();
      const opponent = leagueClubById(leagueFixtureOpponentId(next));
      return {
        season: league?.season || 0,
        divisionTier: league?.divisionTier ?? 3,
        divisionName: typeof leagueCompetitionName === 'function' ? leagueCompetitionName() : league?.name,
        lastMovement: league?.lastMovement || 'NONE',
        introSeen: Boolean(league?.introSeen),
        pendingMode: league?.pendingMode || null,
        activeMode: league?.activeMode || null,
        activeFixtureId: league?.activeFixtureId || null,
        matchPresentation: { ...currentMatchPresentation(), blue: { ...currentMatchPresentation().blue }, red: { ...currentMatchPresentation().red } },
        nextFixture: next ? { ...next, opponentName: opponent?.name || null } : null,
        seasonComplete: leagueSeasonComplete(),
        table: leagueTable().map(row => ({ ...row, form: [...row.form] })),
        fixtures: (league?.fixtures || []).map(fixture => ({ ...fixture })),
        clubs: (league?.clubs || []).map(club => ({ id: club.id, name: club.name, short: club.short, rating: club.rating, style: club.style, roster: (club.roster || []).map(player => ({ id: player.id, name: player.name, role: player.role, overall: teamPlayerOverall(player) })) }))
      };
    },
    clubOperations: () => ({
      date: typeof clubCurrentDateLabel === 'function' ? clubCurrentDateLabel() : `WEEK ${careerState.week}`,
      absoluteDay: careerState.calendar?.absoluteDay || 0,
      dayOfWeek: careerState.calendar?.dayOfWeek || 0,
      daysUntilFixture: typeof clubDaysUntilFixture === 'function' ? clubDaysUntilFixture() : null,
      matchDue: typeof clubLeagueMatchDue === 'function' ? clubLeagueMatchDue() : true,
      canPlayToday: typeof clubCanPlayMatchToday === 'function' ? clubCanPlayMatchToday() : true,
      canEndDay: typeof clubCanEndDay === 'function' ? clubCanEndDay() : false,
      endDayBlockers: typeof clubEndDayBlockers === 'function' ? clubEndDayBlockers().map(item => ({ ...item })) : [],
      lastPayrollWeek: careerState.calendar?.lastPayrollWeek || 1,
      totalWageBill: typeof clubTotalWageBill === 'function' ? clubTotalWageBill() : teamSquadWageBill(),
      credits: careerState.credits,
      divisionTier: typeof leagueDivisionTier === 'function' ? leagueDivisionTier() : 3,
      divisionName: typeof leagueCompetitionName === 'function' ? leagueCompetitionName() : 'DIVISION 3',
      formation: typeof clubFormation === 'function' ? { ...clubFormation() } : null,
      lineupMode: typeof clubLineupMode === 'function' ? clubLineupMode() : 'manual',
      assistant: typeof clubAssistantManager === 'function' ? clubAssistantManager() : null,
      staffPool: (careerState.staff?.pool || []).map(item => ({ ...item })),
      unreadMail: typeof clubUnreadMailCount === 'function' ? clubUnreadMailCount() : 0,
      mail: (careerState.mail || []).map(item => ({ ...item })),
      playerPool: (careerState.market || []).map(player => ({
        id: player.id,
        name: player.name,
        overall: teamPlayerOverall(player),
        potential: player.potential,
        abilityStars: typeof clubPlayerAbilityStars === 'function' ? clubPlayerAbilityStars(player) : null,
        potentialStars: typeof clubPlayerPotentialStars === 'function' ? clubPlayerPotentialStars(player) : null,
        fee: player.fee,
        wage: player.wage,
        scoutingDivision: player.scoutingDivision
      }))
    }),
    oppositionIntelligenceForTest: () => {
      const opponent = oppositionCurrentOpponentFromState();
      const report = oppositionReportForClub(opponent);
      return {
        scout: oppositionScout() ? { ...oppositionScout() } : null,
        scoutPool: (oppositionScoutingState()?.pool || []).map(item => ({ ...item })),
        report: report ? { ...report } : null,
        identity: opponent ? { ...oppositionIdentityForClub(opponent) } : null,
        opponent: opponent ? { id: opponent.id, name: opponent.name, style: opponent.style, strength: { ...leagueClubStrengthSnapshot(opponent) } } : null,
        expectation: opponent ? { ...leagueFixtureExpectationSnapshot(leagueNextFixture(), opponent) } : null,
        supporters: { ...supporterState() }
      };
    },
    oppositionPersistenceRoundTripForTest: () => {
      const before = window.__strikeDebug.oppositionIntelligenceForTest();
      careerState = normaliseCareerState(JSON.parse(JSON.stringify(careerState)));
      const after = window.__strikeDebug.oppositionIntelligenceForTest();
      return { before, after };
    },
    oppositionIdentityMatrixForTest: () => {
      const league = ensureLeagueState();
      return league.clubs.filter(club => club.id !== LEAGUE_USER_CLUB_ID).map(club => {
        const identity = oppositionIdentityForClub(club);
        return { id: club.id, name: club.name, style: club.style, identity: identity.name, formation: identity.formation, approach: identity.approach, engagement: identity.engagement, priority: identity.priority };
      });
    },
    processOppositionScoutDayForTest: (days = 1) => {
      const total = clamp(Math.round(Number(days) || 1), 1, 30);
      const calendar = clubCalendarState();
      const snapshots = [];
      for (let index = 0; index < total; index++) {
        calendar.absoluteDay = Math.max(0, Math.round(Number(calendar.absoluteDay) || 0)) + 1;
        snapshots.push({ ...oppositionProcessScoutingDay() });
      }
      saveCareerState();
      updateMenuUI();
      return { snapshots, state: window.__strikeDebug.oppositionIntelligenceForTest() };
    },
    hireBestOppositionScoutForTest: () => {
      const candidate = (oppositionScoutingState()?.pool || []).slice().sort((a, b) => (b.analysis + b.oppositionKnowledge + b.tacticalAdvice + b.network) - (a.analysis + a.oppositionKnowledge + a.tacticalAdvice + a.network))[0] || null;
      if (!candidate) return null;
      careerState.credits = Math.max(careerState.credits, candidate.signingFee + 10000);
      careerState.wageBudget = Math.max(careerState.wageBudget, clubTotalWageBill() + candidate.wage + 10000);
      const result = hireOppositionScout(candidate.id);
      return { ...result, state: window.__strikeDebug.oppositionIntelligenceForTest() };
    },
    setOpponentStrengthForTest: rating => {
      const opponent = oppositionCurrentOpponentFromState();
      if (!opponent || !Array.isArray(opponent.roster)) return null;
      const target = clamp(Math.round(Number(rating) || 30), 18, 88);
      opponent.roster.forEach((player, index) => leagueAdjustPlayerToRating(player, target, index, player.role));
      leagueClubStrengthSnapshot(opponent);
      saveCareerState();
      updateMenuUI();
      return window.__strikeDebug.oppositionIntelligenceForTest();
    },
    developRivalsForTest: matchday => ({ changed: leagueDevelopRivalsAfterMatchday(matchday), state: window.__strikeDebug.oppositionIntelligenceForTest(), league: window.__strikeDebug.league() }),
    settleSupporterExpectationForTest: won => {
      const fixture = leagueNextFixture();
      const opponent = oppositionCurrentOpponentFromState();
      supporterState().lastExpectation = leagueFixtureExpectationSnapshot(fixture, opponent);
      const reaction = supporterSettleExpectation(Boolean(won), fixture, opponent, { blueScore: won ? 3 : 1, redScore: won ? 1 : 3 });
      saveCareerState();
      return { reaction, state: window.__strikeDebug.oppositionIntelligenceForTest() };
    },
    seasonNarrativeForTest: () => seasonNarrativeForTest(),
    seasonNarrativeSurfacesForTest: () => {
      const fixture = leagueNextFixture();
      const opponent = fixture ? leagueClubById(leagueFixtureOpponentId(fixture)) : null;
      const context = fixture && opponent ? seasonNarrativeFixtureContext(fixture, opponent) : null;
      const presentation = fixture && opponent ? leagueBuildMatchPresentation('league', fixture, opponent) : null;
      const reportHost = document.createElement('div');
      reportHost.innerHTML = renderSeasonNarrativeMatchReport(context ? {
        seasonNarrative: {
          context,
          result: { won: true, ownScore: 3, opponentScore: 1 },
          rivalry: { tier: { ...context.rivalry.tier }, intensity: Math.max(20, Number(context.rivalry.intensity) || 0), gained: 8, tierChanged: true },
          headline: { title: 'BIG RESULT', detail: 'The fixture story carried into the completed match report.' },
          reputationBonus: 1,
          storylines: seasonNarrativeStorylines().map(item => ({ ...item }))
        }
      } : null);
      const dashboardHost = document.createElement('div');
      dashboardHost.innerHTML = renderSeasonNarrativeDashboard();
      return {
        ok: Boolean(context && presentation?.story && reportHost.querySelector('.career-report-season-story') && dashboardHost.querySelector('.season-narrative-dashboard')),
        context,
        presentationStory: presentation?.story || null,
        reportCount: reportHost.querySelectorAll('.career-report-season-story').length,
        reportText: reportHost.querySelector('.career-report-season-story')?.textContent?.replace(/\s+/g, ' ').trim() || '',
        dashboardCount: dashboardHost.querySelectorAll('.season-narrative-dashboard').length
      };
    },
    simulateSeasonNarrativeFixtureForTest: (won = true, ownScore = null, opponentScore = null) => seasonNarrativeSimulateFixtureForTest(Boolean(won), ownScore, opponentScore),
    repeatLastSeasonNarrativeSettlementForTest: () => seasonNarrativeRepeatLastSettlementForTest(),
    seasonNarrativePersistenceRoundTripForTest: () => {
      const before = seasonNarrativeForTest();
      careerState = normaliseCareerState(JSON.parse(JSON.stringify(careerState)));
      const after = seasonNarrativeForTest();
      return { before, after };
    },
    supporterCultureForTest: () => {
      const state = supporterState();
      const expectation = supporterSeasonExpectation(false);
      const table = leagueTable();
      return {
        fanbase: state.fanbase,
        popularity: state.popularity,
        confidence: state.confidence,
        loyalty: state.loyalty,
        expectation: expectation ? { ...expectation } : null,
        currentPosition: table.find(row => row.id === LEAGUE_USER_CLUB_ID)?.position || null,
        reactions: state.activityHistory.slice(0, 8).map(item => ({ ...item, deltas: { ...(item.deltas || {}) } })),
        history: state.fanHistory.slice(0, 12).map(item => ({ ...item }))
      };
    },
    advanceDayForTest: (count = 1) => {
      const total = clamp(Math.round(Number(count) || 1), 1, 60);
      let advanced = 0;
      for (let i = 0; i < total; i++) if (advanceCareerDay()) advanced++;
      return { advanced, state: window.__strikeDebug.clubOperations() };
    },
    hireBestAssistantForTest: () => {
      const candidate = (careerState.staff?.pool || []).slice().sort((a, b) => (b.tactics + b.judgingAbility + b.manManagement) - (a.tactics + a.judgingAbility + a.manManagement))[0] || null;
      if (!candidate) return null;
      careerState.credits = Math.max(careerState.credits, candidate.signingFee + 10000);
      const result = hireAssistantManager(candidate.id);
      return { ...result, state: window.__strikeDebug.clubOperations() };
    },
    setFormationForTest: id => {
      if (!CLUB_FORMATIONS[String(id || '')]) return { ok: false, state: window.__strikeDebug.clubOperations() };
      careerState.tactics.formationId = String(id);
      saveCareerState();
      return { ok: true, state: window.__strikeDebug.clubOperations() };
    },
    setLineupModeForTest: mode => {
      const requested = mode === 'assistant' ? 'assistant' : 'manual';
      if (requested === 'assistant' && !clubAssistantManager()) return { ok: false, state: window.__strikeDebug.clubOperations() };
      careerState.tactics.lineupMode = requested;
      if (requested === 'assistant') clubApplyAssistantLineup(false);
      saveCareerState();
      return { ok: true, state: window.__strikeDebug.clubOperations(), squad: window.__strikeDebug.teamManagement().squad };
    },
    completeDivisionSeasonForTest: (position = 1) => {
      const league = ensureLeagueState();
      const desired = clamp(Math.round(Number(position) || 1), 1, league.clubs.length);
      const userFixtures = league.fixtures.filter(item => item.homeId === LEAGUE_USER_CLUB_ID || item.awayId === LEAGUE_USER_CLUB_ID);
      for (const fixture of league.fixtures) {
        if (fixture.played) continue;
        const userInFixture = fixture.homeId === LEAGUE_USER_CLUB_ID || fixture.awayId === LEAGUE_USER_CLUB_ID;
        let homeWon = true;
        if (userInFixture) {
          const shouldWin = desired <= 2 ? true : desired >= league.clubs.length - 1 ? false : fixture.matchday % 2 === 1;
          const userHome = fixture.homeId === LEAGUE_USER_CLUB_ID;
          homeWon = userHome ? shouldWin : !shouldWin;
        } else {
          homeWon = (teamSeedFromString(fixture.id) % 2) === 0;
        }
        fixture.homeScore = homeWon ? 3 : 1;
        fixture.awayScore = homeWon ? 1 : 3;
        fixture.winnerId = homeWon ? fixture.homeId : fixture.awayId;
        fixture.played = true;
      }
      const beforeTier = league.divisionTier;
      const table = leagueTable();
      const actualPosition = table.find(row => row.id === LEAGUE_USER_CLUB_ID)?.position || league.clubs.length;
      const movement = leagueMovementForPosition(actualPosition, beforeTier);
      return { beforeTier, requestedPosition: desired, actualPosition, movement, userFixtures: userFixtures.length, state: window.__strikeDebug.league() };
    },
    startNextDivisionSeasonForTest: () => ({ ok: startNextLeagueSeason(), league: window.__strikeDebug.league(), club: window.__strikeDebug.clubOperations() }),
    transfers: () => ({
      activeIncoming: transferState().activeIncoming ? { ...transferState().activeIncoming } : null,
      outgoingOffers: transferState().outgoingOffers.map(item => ({ ...item })),
      pendingCount: transferPendingOutgoingCount(),
      activityCount: transferActivityCount(),
      playerPoints: typeof totalUnspentPlayerPoints === 'function' ? totalUnspentPlayerPoints() : 0,
      teamPoints: careerState.unspentPoints,
      balance: careerState.credits,
      wageBill: typeof clubTotalWageBill === 'function' ? clubTotalWageBill() : teamSquadWageBill(),
      wageBudget: careerState.wageBudget
    }),
    startTransferNegotiationForTest: playerId => ({ result: startIncomingTransferNegotiation(String(playerId || '')), state: window.__strikeDebug.transfers() }),
    adjustIncomingTransferForTest: (field, direction = 1) => ({ ok: adjustIncomingTransfer(String(field || ''), Number(direction) || 1), state: window.__strikeDebug.transfers() }),
    submitIncomingTransferForTest: () => ({ result: submitIncomingTransferOffer(), state: window.__strikeDebug.transfers() }),
    acceptIncomingCounterForTest: () => ({ result: acceptIncomingTransferCounter(), state: window.__strikeDebug.transfers() }),
    completeIncomingTransferForTest: () => ({ result: completeIncomingTransfer(), state: window.__strikeDebug.transfers(), team: window.__strikeDebug.teamManagement() }),
    incomingTransferModalForTest: () => ({
      visible: Boolean(teamNoteOverlayEl && !teamNoteOverlayEl.hidden),
      mode: teamNoteOverlayEl?.dataset.mode || '',
      tone: teamNoteOverlayEl?.dataset.tone || '',
      kicker: teamNoteKickerEl?.textContent || '',
      title: teamNoteTitleEl?.textContent || '',
      body: teamNoteBodyEl?.textContent || '',
      footer: teamNoteFooterEl?.textContent || '',
      actions: Array.from(teamNoteActionsEl?.querySelectorAll('button') || []).map(button => ({ action: button.dataset.transferModalAction || '', label: button.textContent.trim() }))
    }),
    recruitmentIndexRatingsForTest: () => (careerState.market || []).map(player => ({
      id: player.id,
      name: player.name,
      knowledge: recruitmentKnowledge(player),
      abilityDisplay: recruitmentAbilityDisplay(player, false),
      potentialDisplay: recruitmentAbilityDisplay(player, true),
      abilityStars: recruitmentAbilityStars(player, false),
      potentialStars: recruitmentAbilityStars(player, true)
    })),
    withdrawIncomingTransferForTest: () => ({ ok: withdrawIncomingTransfer(), state: window.__strikeDebug.transfers(), blockers: clubEndDayBlockers().map(item => ({ ...item })) }),
    forceOutgoingOfferForTest: (playerId, amount = null) => {
      const player = (careerState.squad || []).find(item => item.id === String(playerId || '')) || null;
      const club = transferRivalClubs()[0] || null;
      if (!player || !club) return null;
      const bid = transferRoundMoney(amount || player.value * 0.9);
      const offer = { id: transferNextId('OUT'), playerId: player.id, clubId: club.id, clubName: club.name, amount: bid, counterAmount: transferRoundMoney(bid * 1.1), maxAmount: transferRoundMoney(bid * 1.18), status: 'pending', day: clubCalendarState().absoluteDay, expiresDay: clubCalendarState().absoluteDay + 4, message: `${club.name} submitted a test bid.` };
      transferState().outgoingOffers.unshift(offer);
      transferState().selectedOfferId = offer.id;
      saveCareerState();
      return { offer: { ...offer }, state: window.__strikeDebug.transfers() };
    },
    adjustOutgoingCounterForTest: (offerId, direction = 1) => ({ ok: adjustOutgoingCounter(String(offerId || ''), Number(direction) || 1), state: window.__strikeDebug.transfers() }),
    submitOutgoingCounterForTest: offerId => ({ result: submitOutgoingCounter(String(offerId || '')), state: window.__strikeDebug.transfers() }),
    rejectOutgoingOfferForTest: offerId => ({ ok: rejectOutgoingTransferOffer(String(offerId || '')), state: window.__strikeDebug.transfers(), blockers: clubEndDayBlockers().map(item => ({ ...item })) }),
    acceptOutgoingOfferForTest: offerId => ({ result: acceptOutgoingTransferOffer(String(offerId || '')), state: window.__strikeDebug.transfers(), team: window.__strikeDebug.teamManagement() }),
    prepareLeagueMatchForTest: mode => prepareCareerMatchContext(mode === 'exhibition' ? 'exhibition' : 'league'),
    settleLeagueForTest: (won = true, blue = 3, red = 1) => {
      const prepared = prepareCareerMatchContext('league');
      if (!prepared.ok) return prepared;
      return settleLeagueAfterCareerMatch(won ? TEAM_BLUE : TEAM_RED, { blueScore: Math.max(0, Math.round(blue)), redScore: Math.max(0, Math.round(red)) });
    },
    // Build 12.135: drives the whole league match path — prepare, complete,
    // settle — and reports whether the fixture, the table and the report agree.
    // A league match that leaves the table on zero shows up here as
    // settledMode !== 'league'.
    leagueMatchFlowForTest: (blue = 3, red = 0) => {
      if (!careerState.created || !careerSquadReady()) window.__strikeDebug.seedFirstMatchCalendarForTest();
      const statsSnapshot = careerMatchStats;
      const stateSnapshot = appState;
      try {
        const league = ensureLeagueState();
        // Put the calendar on the next fixture day so the league match is legal.
        const fixture = leagueNextFixture();
        if (!fixture) return { ok: false, reason: 'no fixture scheduled' };
        const calendar = clubCalendarState();
        let guard = 0;
        while (typeof clubLeagueMatchDue === 'function' && !clubLeagueMatchDue() && guard++ < 400) calendar.absoluteDay++;
        const due = typeof clubLeagueMatchDue === 'function' ? clubLeagueMatchDue() : false;

        const prepared = prepareCareerMatchContext('league');
        const modeAfterPrepare = league.activeMode;

        careerMatchStats = makeCareerMatchStats();
        Object.assign(careerMatchStats, {
          roundsPlayed: 3, kills: 6, deaths: 2, shotsFired: 24, shotsHit: 12,
          damageDealt: 420, damageTaken: 200, survivalTime: 150, reloads: 4, finalSurvived: true
        });
        blueScore = Math.max(0, Math.round(Number(blue) || 0));
        redScore = Math.max(0, Math.round(Number(red) || 0));
        const modeAtCompletion = league.activeMode;
        completeCareerMatch(TEAM_BLUE);
        if (careerCrateState.phase === 'queued') careerCrateState.phase = 'idle';

        const settled = careerState.lastRound?.league || null;
        const table = leagueTable();
        const userRow = table.find(row => row.id === LEAGUE_USER_CLUB_ID) || null;
        const playedFixtures = (league.fixtures || []).filter(item => item.played).length;
        return {
          ok: true, due, preparedOk: prepared?.ok, preparedReason: prepared?.reason || null,
          modeAfterPrepare, modeAtCompletion,
          settledMode: settled?.mode || null,
          reportMatchday: settled?.matchday ?? null,
          userRow: userRow ? { played: userRow.played, won: userRow.won, points: userRow.points, position: userRow.position, roundDifference: userRow.roundDifference } : null,
          playedFixtures,
          tableTotalPoints: table.reduce((sum, row) => sum + (Number(row.points) || 0), 0),
          goldMode: careerState.lastRound?.goldCoinReward?.mode || null
        };
      } finally {
        careerMatchStats = statsSnapshot;
        appState = stateSnapshot;
      }
    },
    // Build 12.135: reproduces the reported "league match did not update the
    // table". A league context is prepared, then the calendar advances past the
    // fixture (End Day auto-simulates it). The stale activeMode survives, the
    // match presents as a league fixture, but the settlement finds no unplayed
    // fixture to write the result into.
    staleLeagueContextForTest: () => {
      if (!careerState.created || !careerSquadReady()) window.__strikeDebug.seedFirstMatchCalendarForTest();
      const statsSnapshot = careerMatchStats;
      const stateSnapshot = appState;
      try {
        const league = ensureLeagueState();
        const calendar = clubCalendarState();
        let guard = 0;
        while (typeof clubLeagueMatchDue === 'function' && !clubLeagueMatchDue() && guard++ < 400) calendar.absoluteDay++;
        const prepared = prepareCareerMatchContext('league');
        const preparedFixtureId = league.activeFixtureId;

        // The manager backs out without cancelling (page reload, or leaving the
        // deployment screen), then ends the day. The fixture is simulated.
        const fixture = (league.fixtures || []).find(item => item.id === preparedFixtureId) || null;
        if (fixture) leagueSimulateFixture(fixture);

        const staleMode = league.activeMode;
        const staleFixture = leagueActiveFixture();

        careerMatchStats = makeCareerMatchStats();
        Object.assign(careerMatchStats, { roundsPlayed: 3, kills: 5, deaths: 2, shotsFired: 20, shotsHit: 10, damageDealt: 380, damageTaken: 190, survivalTime: 140, reloads: 3, finalSurvived: true });
        blueScore = 3; redScore = 0;
        const pointsBefore = (leagueTable().find(row => row.id === LEAGUE_USER_CLUB_ID) || {}).points || 0;
        completeCareerMatch(TEAM_BLUE);
        if (careerCrateState.phase === 'queued') careerCrateState.phase = 'idle';
        const userRow = leagueTable().find(row => row.id === LEAGUE_USER_CLUB_ID) || null;
        return {
          preparedOk: prepared?.ok, preparedFixtureId,
          staleMode, staleFixtureFound: Boolean(staleFixture),
          presentationMode: careerState.lastRound?.matchPresentation?.mode || null,
          settled: careerState.lastRound?.league || null,
          settledMode: careerState.lastRound?.league?.mode || null,
          pointsBefore, pointsAfter: userRow?.points ?? null,
          reportSaysLeague: (careerState.lastRound?.matchPresentation?.mode === 'league')
        };
      } finally {
        careerMatchStats = statsSnapshot;
        appState = stateSnapshot;
      }
    },
    // Build 12.135: the exact reported failure — the prepared fixture id stops
    // resolving between kick-off and settlement, which previously discarded the
    // whole league result and left every club on zero.
    orphanedLeagueFixtureForTest: () => {
      if (!careerState.created || !careerSquadReady()) window.__strikeDebug.seedFirstMatchCalendarForTest();
      const statsSnapshot = careerMatchStats;
      const stateSnapshot = appState;
      try {
        const league = ensureLeagueState();
        const calendar = clubCalendarState();
        let guard = 0;
        while (typeof clubLeagueMatchDue === 'function' && !clubLeagueMatchDue() && guard++ < 400) calendar.absoluteDay++;
        const prepared = prepareCareerMatchContext('league');
        const opponentId = league.activeOpponentId;
        // Simulate the league rebuild that re-derives fixture ids.
        league.activeFixtureId = 'S1-M99-does-not-exist';
        const resolvesBefore = Boolean(leagueActiveFixture());

        careerMatchStats = makeCareerMatchStats();
        Object.assign(careerMatchStats, { roundsPlayed: 3, kills: 5, deaths: 1, shotsFired: 20, shotsHit: 11, damageDealt: 400, damageTaken: 150, survivalTime: 150, reloads: 3, finalSurvived: true });
        blueScore = 3; redScore = 0;
        const pointsBefore = (leagueTable().find(row => row.id === LEAGUE_USER_CLUB_ID) || {}).points || 0;
        const playedBefore = (league.fixtures || []).filter(item => item.played).length;
        completeCareerMatch(TEAM_BLUE);
        if (careerCrateState.phase === 'queued') careerCrateState.phase = 'idle';
        const row = leagueTable().find(item => item.id === LEAGUE_USER_CLUB_ID) || null;
        const settled = careerState.lastRound?.league || null;
        return {
          preparedOk: prepared?.ok, opponentId,
          activeFixtureResolved: resolvesBefore,
          settledMode: settled?.mode || null,
          recoveredOpponent: settled?.opponentName || null,
          matchday: settled?.matchday ?? null,
          pointsBefore, pointsAfter: row?.points ?? null,
          userPlayed: row?.played ?? null,
          playedBefore, playedAfter: (league.fixtures || []).filter(item => item.played).length,
          resultRecorded: (row?.points ?? 0) > pointsBefore
        };
      } finally {
        careerMatchStats = statsSnapshot;
        appState = stateSnapshot;
      }
    },
    // Build 12.135: renders a route and leaves it mounted so a specific panel
    // can be measured. The compact audit restores the previous route, which
    // makes per-panel inspection impossible on its own.
    renderRouteForTest: (route = 'training') => {
      if (!careerState.created || !careerSquadReady()) window.__strikeDebug.seedFirstMatchCalendarForTest();
      setMenuRoute(String(route), { skipDraftGuard: true });
      const host = menuContentEl;
      const cards = [...host.querySelectorAll('.training-player-card')].map(card => {
        const rect = card.getBoundingClientRect();
        const children = [...card.children].map(child => {
          const style = getComputedStyle(child);
          const box = child.getBoundingClientRect();
          return { tag: child.tagName.toLowerCase(), cls: String(child.className || '').split(/\s+/)[0] || '',
                   display: style.display, height: Math.round(box.height),
                   visible: style.display !== 'none' && style.visibility !== 'hidden' && box.height > 0 };
        });
        return { height: Math.round(rect.height), width: Math.round(rect.width),
                 childCount: card.children.length,
                 visibleChildren: children.filter(c => c.visible).length,
                 hiddenChildren: children.filter(c => !c.visible).map(c => `${c.tag}.${c.cls}(${c.display})`),
                 text: String(card.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40) };
      });
      return { route, width: window.innerWidth, cardCount: cards.length, cards: cards.slice(0, 4),
               gridColumns: host.querySelector('.training-player-grid') ? getComputedStyle(host.querySelector('.training-player-grid')).gridTemplateColumns : null };
    },
    // Build 12.137: does a victory crate survive leaving the page before it is
    // claimed? The store crate is persisted because it was paid for; the match
    // crate historically lived only in memory.
    matchCrateDurabilityForTest: () => {
      if (!careerState.created || !careerSquadReady()) window.__strikeDebug.seedFirstMatchCalendarForTest();
      const statsSnapshot = careerMatchStats;
      const stateSnapshot = appState;
      try {
        careerState.inventory = ['scrap-p12'];
        careerMatchStats = makeCareerMatchStats();
        Object.assign(careerMatchStats, { roundsPlayed: 3, kills: 6, deaths: 1, shotsFired: 24, shotsHit: 13, damageDealt: 430, damageTaken: 140, survivalTime: 155, reloads: 4, finalSurvived: true });
        blueScore = 3; redScore = 0;
        completeCareerMatch(TEAM_BLUE);
        const queued = { phase: careerCrateState.phase, source: careerCrateState.source,
                         reward: careerCrateState.result ? { ...careerCrateState.result } : null };
        // What a reload would see: only what reached storage.
        const persisted = loadCareerState();
        return {
          queuedInMemory: queued,
          inventoryNow: [...(careerState.inventory || [])],
          persistedInventory: [...(persisted.inventory || [])],
          persistedPendingMatchCrate: persisted.pendingMatchCrate || null,
          persistedPendingStoreCrate: persisted.pendingStoreCrate || null,
          survivesReload: Boolean(persisted.pendingMatchCrate)
        };
      } finally {
        careerMatchStats = statsSnapshot;
        appState = stateSnapshot;
      }
    },
    // Build 12.137: full victory-crate lifecycle — awarded, persisted, restored
    // after an interrupted session, claimed into the inventory, and cleared so
    // it is never handed out twice.
    matchCrateLifecycleForTest: () => {
      if (!careerState.created || !careerSquadReady()) window.__strikeDebug.seedFirstMatchCalendarForTest();
      const statsSnapshot = careerMatchStats;
      const stateSnapshot = appState;
      try {
        careerState.inventory = ['scrap-p12'];
        careerCrateState.phase = 'idle';
        careerMatchStats = makeCareerMatchStats();
        Object.assign(careerMatchStats, { roundsPlayed: 3, kills: 6, deaths: 1, shotsFired: 24, shotsHit: 13, damageDealt: 430, damageTaken: 140, survivalTime: 155, reloads: 4, finalSurvived: true });
        blueScore = 3; redScore = 0;
        completeCareerMatch(TEAM_BLUE);

        const awarded = careerState.pendingMatchCrate ? { ...careerState.pendingMatchCrate } : null;
        const persistedAfterAward = loadCareerState().pendingMatchCrate;

        // Simulate the manager closing the page before claiming: the module
        // state is gone, only the save remains.
        careerCrateState = { phase: 'idle', delay: 0, timer: 0, cycleTimer: 0, displayIndex: 0, result: null, duplicate: false, summary: null, source: 'match', returnRoute: 'loadout' };
        careerReportState = { phase: 'idle', delay: 0, summary: null, revealStage: 0, detailed: true };
        appState = 'menu';
        const restored = queuePendingMatchCrate();
        const restoredReward = careerCrateState.result ? { ...careerCrateState.result } : null;

        // Claim it.
        careerCrateState.phase = 'revealed';
        careerCrateState.duplicate = false;
        const inventoryBefore = [...(careerState.inventory || [])];
        claimCareerCrate();
        const inventoryAfter = [...(careerState.inventory || [])];

        // And it must not be offered a second time.
        careerCrateState.phase = 'idle';
        const reofferedAfterClaim = queuePendingMatchCrate();

        return {
          awardedReward: awarded?.reward || null,
          persistedOnAward: Boolean(persistedAfterAward),
          restoredAfterInterruption: restored,
          restoredReward,
          rewardSurvivedIntact: Boolean(awarded && restoredReward && awarded.reward.id === restoredReward.id),
          inventoryBefore, inventoryAfter,
          weaponGranted: awarded?.reward?.type === 'weapon'
            ? inventoryAfter.includes(awarded.reward.id) && !inventoryBefore.includes(awarded.reward.id)
            : 'reward-was-cosmetic',
          pendingClearedAfterClaim: careerState.pendingMatchCrate === null,
          persistedClearedAfterClaim: !loadCareerState().pendingMatchCrate,
          reofferedAfterClaim
        };
      } finally {
        careerMatchStats = statsSnapshot;
        appState = stateSnapshot;
      }
    },
    randomTeamNameForTest: (count = 12) => {
      const total = clamp(Math.round(Number(count) || 12), 1, 50);
      let state = 0x6a09e667;
      const random = () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
      };
      const previousDraftName = careerDraft?.name;
      const names = [];
      for (let index = 0; index < total; index++) {
        if (careerDraft) careerDraft.name = names[names.length - 1] || '';
        names.push(careerRandomTeamName(random));
      }
      if (careerDraft) careerDraft.name = previousDraftName;
      const valid = names.every(name => name === normaliseCareerName(name).trim() && name.length >= 2 && name.length <= 24);
      return { ok: valid && new Set(names).size > 1, valid, unique: new Set(names).size, total: names.length, names };
    },
    onboardingClarityForTest: () => {
      const host = document.createElement('div');
      host.style.cssText = 'position:fixed;left:-10000px;top:0;width:390px;visibility:hidden;pointer-events:none;';
      host.innerHTML = renderCareerCreationTab();
      document.body.appendChild(host);
      const randomButton = host.querySelector('[data-career-action="random-team-name"]');
      const nameInput = host.querySelector('#careerNameInput');
      const heroText = host.querySelector('.team-create-hero')?.textContent.replace(/\s+/g, ' ').trim() || '';
      const previewText = host.querySelector('.team-onboarding-preview')?.textContent.replace(/\s+/g, ' ').trim() || '';
      const goalText = host.querySelector('.team-onboarding-goal')?.textContent.replace(/\s+/g, ' ').trim() || '';
      const loopCards = host.querySelectorAll('.team-onboarding-loop article').length;
      const buttonHeight = randomButton ? Math.round(randomButton.getBoundingClientRect().height) : 0;
      const inputHeight = nameInput ? Math.round(nameInput.getBoundingClientRect().height) : 0;
      const inputFontSize = nameInput ? Number.parseFloat(getComputedStyle(nameInput).fontSize) : 0;
      host.remove();
      const viewport = document.querySelector('meta[name="viewport"]')?.getAttribute('content') || '';
      const checks = {
        explainsManagerRole: /run the club rather than the trigger/i.test(heroText),
        explainsAutonomousOperators: /operators fight autonomously/i.test(heroText),
        statesLongTermGoal: /pro league/i.test(`${heroText} ${goalText}`),
        focusesFirstFifteenMinutes: /your first 15 minutes/i.test(previewText),
        hasThreeStepStart: loopCards === 3,
        guidedRecruitmentPromised: /six recommended candidates/i.test(previewText),
        hasRandomNameControl: Boolean(randomButton),
        accessibleControlHeight: buttonHeight >= 44 && inputHeight >= 44,
        readableInputType: inputFontSize >= 16,
        fixedScaleViewport: /user-scalable\s*=\s*no/i.test(viewport) && /maximum-scale\s*=\s*1(?:\D|$)/i.test(viewport)
      };
      return { ok: Object.values(checks).every(Boolean), checks, loopCards, buttonHeight, inputHeight, inputFontSize, viewport };
    },
    newPlayerOrientationForTest: () => {
      const introText = newPlayerIntroOverlayEl?.textContent.replace(/\s+/g, ' ').trim() || '';
      const introSteps = newPlayerIntroOverlayEl?.querySelectorAll('.new-player-intro-loop article').length || 0;
      const demoSteps = Array.isArray(NEW_PLAYER_DEMO_STEPS) ? NEW_PLAYER_DEMO_STEPS.length : 0;
      const previousDemoState = { ...newPlayerDemoState };
      let completedSkipHidden = false;
      try {
        newPlayerDemoState.active = true;
        newPlayerDemoState.paused = true;
        newPlayerDemoState.roundFinished = true;
        newPlayerDemoState.winner = CAREER_OWNED_TEAM;
        renderNewPlayerDemoCoach();
        completedSkipHidden = Boolean(newPlayerDemoSkipBtn?.hidden && newPlayerDemoSkipBtn?.getAttribute('aria-hidden') === 'true');
      } finally {
        Object.assign(newPlayerDemoState, previousDemoState);
        if (newPlayerDemoState.active) renderNewPlayerDemoCoach();
        else hideNewPlayerDemoCoach();
      }
      const checks = {
        introExists: Boolean(newPlayerIntroOverlayEl && newPlayerIntroStartBtn && newPlayerIntroSkipBtn),
        conceptExplained: /tactical management game/i.test(introText) && /autonomous operators/i.test(introText),
        realFormatExplained: /first team to win three rounds/i.test(introText) && /no respawns/i.test(introText),
        fourPartLoop: introSteps === 4,
        demoCoachExists: Boolean(newPlayerDemoCoachEl && newPlayerDemoNextBtn && newPlayerDemoSkipBtn),
        fourGuidedSteps: demoSteps === 4,
        allCoachStepsPauseBeforeRound: NEW_PLAYER_DEMO_STEPS.every(step => step?.paused === true),
        finalActionStartsRound: /watch the round/i.test(NEW_PLAYER_DEMO_STEPS[NEW_PLAYER_DEMO_STEPS.length - 1]?.action || ''),
        oneRoundContract: /orientation ends after one round/i.test(NEW_PLAYER_DEMO_STEPS[1]?.body || ''),
        nonCareerContract: /did not change your record, finances/i.test(NEW_PLAYER_DEMO_COMPLETE_BODY) && /operator condition or league position/i.test(NEW_PLAYER_DEMO_COMPLETE_BODY),
        skipUsesOrientationLanguage: /skip orientation/i.test(newPlayerDemoSkipBtn?.textContent || 'SKIP ORIENTATION'),
        completedDemoHidesSkip: completedSkipHidden,
        persistenceUsesTutorialContext: Boolean(NEW_PLAYER_CONCEPT_KEY && NEW_PLAYER_DEMO_COMPLETE_KEY && NEW_PLAYER_DEMO_SKIPPED_KEY)
      };
      return {
        ok: Object.values(checks).every(Boolean),
        checks,
        introSteps,
        demoSteps,
        state: { ...newPlayerDemoState },
        eligible: newPlayerIntroEligible()
      };
    },
    openNewPlayerIntroForTest: () => ({ ok: openNewPlayerIntro(), hidden: Boolean(newPlayerIntroOverlayEl?.hidden), eligible: newPlayerIntroEligible() }),
    startNewPlayerDemoForTest: () => ({ ok: startNewPlayerDemoMatch(), state: { ...newPlayerDemoState }, appState, target: matchTarget, score: [blueScore, redScore] }),
    advanceNewPlayerDemoForTest: () => ({ ok: advanceNewPlayerDemo(), state: { ...newPlayerDemoState }, coachHidden: Boolean(newPlayerDemoCoachEl?.hidden) }),
    finishNewPlayerDemoForTest: (winner = TEAM_BLUE, reason = 'Test orientation complete') => ({ ok: finishNewPlayerDemoRound(Number(winner), String(reason)), state: { ...newPlayerDemoState } }),
    completeNewPlayerDemoForTest: (skipped = false) => ({ ok: completeNewPlayerDemo(Boolean(skipped)), state: { ...newPlayerDemoState }, appState, route: menuTab, totals: { matches: careerState.totalMatches, rounds: careerState.totalRounds, wins: careerState.totalWins } }),
    typographyConsistencyForTest: () => {
      const viewport = document.querySelector('meta[name="viewport"]')?.getAttribute('content') || '';
      const styleSample = selector => {
        const element = document.querySelector(selector);
        if (!element) return { fontSize: 0, visible: false };
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return {
          fontSize: Number.parseFloat(style.fontSize) || 0,
          visible: style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0.02 && rect.width > 0.5 && rect.height > 0.5
        };
      };
      const mainNav = styleSample('.menu-tab-copy strong');
      const subnav = styleSample('.menu-subtab-label');
      const datePrimary = styleSample('#managerDateDay');
      const dateSecondary = styleSample('#managerDateMeta');
      const priorityLabel = styleSample('.management-priority-main > span');
      const priorityBody = styleSample('.management-priority-main > small');
      const priorityAction = styleSample('.management-priority-strip > button');
      const tutorialBody = styleSample('.team-tutorial-copy > p');
      const mobileKicker = styleSample('#menuContent .menu-kicker');
      const mobilePill = styleSample('#menuContent .menu-pill');
      const mobileLock = styleSample('.menu-subtab-lock');
      const mobileAccess = styleSample('.menu-tab-access');
      const economyLabel = styleSample('#menuContent .club-economy-guide article > span');
      const desktopSmall = styleSample('#menuContent small');
      const commandObjectiveTitle = styleSample('.command-objective strong');
      const commandObjectiveBody = styleSample('.command-objective small');
      const commandDirectoryBody = styleSample('.command-directory-group button small');
      const desktopViewport = window.innerWidth >= 1024;
      const mobileViewport = !desktopViewport;
      const samples = {
        mainNav: mainNav.fontSize,
        subnav: subnav.fontSize,
        datePrimary: datePrimary.fontSize,
        dateSecondary: dateSecondary.fontSize,
        priorityLabel: priorityLabel.fontSize,
        priorityBody: priorityBody.fontSize,
        priorityAction: priorityAction.fontSize,
        tutorialBody: tutorialBody.fontSize,
        mobileKicker: mobileKicker.fontSize,
        mobilePill: mobilePill.fontSize,
        mobileLock: mobileLock.fontSize,
        mobileAccess: mobileAccess.fontSize,
        economyLabel: economyLabel.fontSize,
        desktopSmall: desktopSmall.fontSize,
        commandObjectiveTitle: commandObjectiveTitle.fontSize,
        commandObjectiveBody: commandObjectiveBody.fontSize,
        commandDirectoryBody: commandDirectoryBody.fontSize
      };
      const visibleFloor = (sample, floor) => !sample.visible || sample.fontSize >= floor;
      const checks = {
        pinchZoomDisabled: /user-scalable\s*=\s*no/i.test(viewport) && /maximum-scale\s*=\s*1(?:\D|$)/i.test(viewport),
        mainNavReadable: samples.mainNav >= (mobileViewport ? 10 : 9),
        subnavReadable: samples.subnav >= (mobileViewport ? 10 : 9.5),
        dateReadable: samples.datePrimary >= (mobileViewport ? 12 : 9) && visibleFloor(dateSecondary, mobileViewport ? 12 : 6.5),
        priorityReadable: visibleFloor(priorityLabel, mobileViewport ? 12 : 9) && visibleFloor(priorityBody, mobileViewport ? 14 : 11),
        priorityActionReadable: visibleFloor(priorityAction, mobileViewport ? 13 : 0),
        tutorialReadable: visibleFloor(tutorialBody, mobileViewport ? 14 : 13),
        mobileHierarchyReadable: !mobileViewport || (visibleFloor(mobileKicker, 12) && visibleFloor(mobilePill, 12)),
        mobileLockCopyReadable: !mobileViewport || (visibleFloor(mobileLock, 12) && visibleFloor(mobileAccess, 12)),
        mobileEconomyReadable: !mobileViewport || visibleFloor(economyLabel, 12),
        desktopSecondaryReadable: !desktopViewport || visibleFloor(desktopSmall, 10.75),
        desktopCommandRowsReadable: !desktopViewport || (!commandObjectiveTitle.visible || !commandObjectiveBody.visible || (samples.commandObjectiveTitle >= 11.5 && samples.commandObjectiveBody >= 10.75)),
        desktopDirectoryReadable: !desktopViewport || visibleFloor(commandDirectoryBody, 10.75)
      };
      return { ok: Object.values(checks).every(Boolean), checks, samples, viewport };
    },
    firstMatchGuidanceForTest: () => {
      // Build 12.139: this hook replays earlier guide steps by blanking
      // careerState.squad, market, tutorial and totalMatches. Several of the
      // renders it drives call saveCareerState(), which persisted that empty
      // squad over a real career. Persistence is suppressed for the whole
      // replay so a diagnostic can never destroy a save.
      const liveSaveCareerState = saveCareerState;
      saveCareerState = () => false;
      try {
        return window.__strikeDebug.firstMatchGuidanceReplayForTest();
      } finally {
        saveCareerState = liveSaveCareerState;
      }
    },
    firstMatchGuidanceReplayForTest: () => {
      const guide = typeof firstMatchGuidance === 'function' ? firstMatchGuidance() : null;
      const validRoute = !guide || Boolean(menuRouteDefinition(guide.route));
      const primarySection = guide ? menuSectionForRoute(guide.route) : '';
      const strip = typeof renderMenuPriorityStrip === 'function' ? renderMenuPriorityStrip() : '';
      const previous = {
        created: careerState.created,
        squad: careerState.squad,
        market: careerState.market,
        tutorial: careerState.tutorial,
        totalMatches: careerState.totalMatches,
        lastRound: careerState.lastRound,
        transfers: careerState.transfers,
        selectedPlayerId: careerState.selectedPlayerId,
        selectedTeamPlayerId
      };
      let recruitmentScroll = { guide: null, strip: '', market: '', transferAccessBefore: null, transferAccessDuring: null };
      let recruitmentMarketCount = 0;
      let profileGuide = null;
      let profileStrip = '';
      let recommendedProfileIds = [];
      try {
        careerState.created = true;
        careerState.squad = [];
        careerState.totalMatches = 0;
        careerState.lastRound = null;
        careerState.market = Array.isArray(previous.market) && previous.market.length ? previous.market : generateTeamMarket(12332);
        careerState.tutorial = { ...(previous.tutorial || {}), marketViewed: true, profileViewed: false };
        careerState.transfers = { ...(previous.transfers || {}), activeIncoming: null };
        recruitmentBeginnerExpanded = false;
        recruitmentMarketCount = careerState.market.length;
        recommendedProfileIds = recruitmentBeginnerCandidates(careerState.market, recruitmentRecommendationMap(careerState.market), 6).map(player => player.id);
        profileGuide = firstMatchGuidance();
        profileStrip = renderMenuPriorityStrip();
        careerState.tutorial.profileViewed = true;
        recruitmentScroll = {
          guide: firstMatchGuidance(),
          strip: renderMenuPriorityStrip(),
          market: renderTeamMarketTab(),
          transferAccessBefore: progressiveRouteAccess('transfers'),
          transferAccessDuring: null
        };
        careerState.transfers.activeIncoming = { id: 'TEST-NEGOTIATION', playerId: 'TEST-PLAYER', status: 'draft' };
        recruitmentScroll.transferAccessDuring = progressiveRouteAccess('transfers');
      } finally {
        careerState.created = previous.created;
        careerState.squad = previous.squad;
        careerState.market = previous.market;
        careerState.tutorial = previous.tutorial;
        careerState.totalMatches = previous.totalMatches;
        careerState.lastRound = previous.lastRound;
        careerState.transfers = previous.transfers;
        careerState.selectedPlayerId = previous.selectedPlayerId;
        selectedTeamPlayerId = previous.selectedTeamPlayerId;
        recruitmentBeginnerExpanded = false;
      }
      // Build 12.138: the closing training step must reach its own control the
      // same way the signing step reaches the candidate list. Replay the step
      // with a real squad, no active focus and a reviewed debrief.
      let trainingScroll = { guide: null, strip: '', training: '', squadSampled: 0 };
      const trainingPrevious = {
        totalMatches: careerState.totalMatches,
        lastRound: careerState.lastRound,
        recommendation: careerState.trainingRecommendation,
        focuses: (careerState.squad || []).map(player => player.trainingFocus)
      };
      try {
        careerState.totalMatches = Math.max(1, Number(careerState.totalMatches) || 0);
        careerState.lastRound = { ...(careerState.lastRound || {}), reportReviewed: true };
        careerState.trainingRecommendation = null;
        for (const player of careerState.squad || []) player.trainingFocus = 'none';
        trainingScroll = {
          guide: firstMatchGuidance(),
          strip: renderMenuPriorityStrip(),
          training: renderTrainingFacilityTab(),
          squadSampled: (careerState.squad || []).length
        };
      } finally {
        careerState.totalMatches = trainingPrevious.totalMatches;
        careerState.lastRound = trainingPrevious.lastRound;
        careerState.trainingRecommendation = trainingPrevious.recommendation;
        (careerState.squad || []).forEach((player, index) => { player.trainingFocus = trainingPrevious.focuses[index]; });
      }
      const trainingHost = document.createElement('div');
      trainingHost.innerHTML = trainingScroll.training;
      const trainingDestination = trainingHost.querySelector('[data-guide-target="training-programmes"]');
      const trainingSelects = trainingDestination?.querySelectorAll('[data-training-focus]').length || 0;

      const marketHost = document.createElement('div');
      marketHost.innerHTML = recruitmentScroll.market;
      const candidateDestination = marketHost.querySelector('[data-guide-target="recruitment-candidates"]');
      const candidateRows = candidateDestination?.querySelectorAll('.recruitment-market-row').length || 0;
      const roleGuide = marketHost.querySelector('.recruitment-role-guide');
      const scrollChecks = {
        firstSigningTargetsCandidates: recruitmentScroll.guide?.id === 'first-signing' && recruitmentScroll.guide?.scrollTarget === 'recruitment-candidates',
        objectiveCarriesScrollTarget: /data-team-scroll-target="recruitment-candidates"/.test(recruitmentScroll.strip),
        candidateListDirectlyTargeted: Boolean(candidateDestination?.classList.contains('team-market-list')),
        focusedRecruitmentUsesSixCandidates: candidateRows === Math.min(6, recruitmentMarketCount),
        advancedToolsCollapsed: !marketHost.querySelector('.recruitment-toolbar') && !marketHost.querySelector('.club-pool-control'),
        roleGuideAvailableButCollapsed: Boolean(roleGuide && !roleGuide.open),
        transfersLockedBeforeNegotiation: Boolean(recruitmentScroll.transferAccessBefore?.locked),
        transfersOpenForActiveTutorialNegotiation: Boolean(!recruitmentScroll.transferAccessDuring?.locked && recruitmentScroll.transferAccessDuring?.label === 'NEGOTIATE'),
        profileTargetsRecommendedCandidate: profileGuide?.id === 'profile' && recommendedProfileIds.includes(profileGuide.playerId),
        profileActionSelectsCandidate: new RegExp(`data-team-profile="${profileGuide?.playerId || ''}"`).test(profileStrip),
        profileActionAvoidsGenericRoute: !/data-team-route="profile"/.test(profileStrip),
        // Build 12.139: arriving at the objective must deliver the save
        // control and the requirement copy alongside the selects, not just
        // the selects.
        trainingDestinationIsProgrammesZone: Boolean(trainingDestination?.classList.contains('training-programmes-zone')),
        trainingDestinationCarriesSaveControl: Boolean(trainingDestination?.querySelector('[data-workflow-save="training"]')),
        trainingDestinationCarriesRoster: Boolean(trainingDestination?.querySelector('.training-roster-panel')),
        trainingDestinationStatesRequirement: /No operator has a training programme/i.test(trainingDestination?.textContent || '')
      };
      // The replayed training step only reaches the guide when the career
      // already holds a deployment-ready squad, so report whether it was
      // sampled instead of passing the checks silently.
      const trainingSampled = trainingScroll.squadSampled >= TEAM_REQUIRED_STARTERS;
      if (trainingSampled) {
        scrollChecks.trainingStepTargetsProgrammes = trainingScroll.guide?.id === 'training' && trainingScroll.guide?.scrollTarget === 'training-programmes';
        scrollChecks.trainingObjectiveCarriesScrollTarget = /data-team-scroll-target="training-programmes"/.test(trainingScroll.strip);
        scrollChecks.trainingDestinationHoldsProgrammeSelects = trainingSelects === trainingScroll.squadSampled;
      }
      return {
        ok: Boolean(validRoute && (!guide || (guide.label && guide.detail && guide.action && guide.total === 9 && guide.milestoneTotal === 6 && primarySection === guide.section)) && (!guide || /FIRST MATCH JOURNEY/i.test(strip)) && Object.values(scrollChecks).every(Boolean)),
        guide: guide ? { ...guide } : null,
        primarySection,
        hasJourneyStrip: /FIRST MATCH JOURNEY/i.test(strip),
        scrollChecks,
        candidateRows,
        trainingSampled,
        trainingSelects,
        trainingSquadSampled: trainingScroll.squadSampled,
        savesAdditionalChecklist: false
      };
    },
    recruitmentRoleGuideForTest: () => {
      const previous = {
        created: careerState.created,
        squad: careerState.squad,
        market: careerState.market,
        tutorial: careerState.tutorial,
        totalMatches: careerState.totalMatches,
        lastRound: careerState.lastRound
      };
      let marketMarkup = '';
      let profileMarkup = '';
      let recruitmentMarketCount = 0;
      try {
        careerState.created = true;
        careerState.squad = [];
        careerState.totalMatches = 0;
        careerState.lastRound = null;
        careerState.market = Array.isArray(previous.market) && previous.market.length ? previous.market : generateTeamMarket(12333);
        careerState.tutorial = { ...(previous.tutorial || {}), marketViewed: true, profileViewed: true, completed: false, dismissed: false };
        recruitmentBeginnerExpanded = false;
        recruitmentMarketCount = careerState.market.length;
        marketMarkup = renderTeamMarketTab();
        const first = careerState.market[0];
        profileMarkup = first ? recruitmentProfileRoleGuideMarkup(first.role, first.secondaryRole) : '';
      } finally {
        careerState.created = previous.created;
        careerState.squad = previous.squad;
        careerState.market = previous.market;
        careerState.tutorial = previous.tutorial;
        careerState.totalMatches = previous.totalMatches;
        careerState.lastRound = previous.lastRound;
        recruitmentBeginnerExpanded = false;
      }
      const host = document.createElement('div');
      host.innerHTML = marketMarkup;
      const cards = Array.from(host.querySelectorAll('.recruitment-role-card'));
      const roleIds = cards.map(card => card.getAttribute('data-recruitment-role'));
      const flanker = cards.find(card => card.getAttribute('data-recruitment-role') === 'flanker');
      const guide = host.querySelector('.recruitment-role-guide');
      const confidence = host.querySelector('.recruitment-knowledge');
      const destination = host.querySelector('[data-guide-target="recruitment-candidates"]');
      const checks = {
        allRolesExplained: TEAM_ROLES.every(role => roleIds.includes(role.id)),
        guideStartsCollapsedByDefault: Boolean(guide && !guide.open),
        scoutingConfidenceIsExplained: Boolean(confidence && /SCOUTING CONFIDENCE/.test(confidence.textContent || '') && /ability, potential, fee, wage and medical estimates/i.test(confidence.getAttribute('title') || '')),
        flankerUsesPlainLanguage: Boolean(flanker && /alternate route/i.test(flanker.textContent) && /side or rear/i.test(flanker.textContent)),
        attributesAndTradeoffsShown: cards.every(card => /LOOK FOR/.test(card.textContent) && /WATCH FOR/.test(card.textContent)),
        candidateDestinationContainsSixRows: (destination?.querySelectorAll('.recruitment-market-row').length || 0) === Math.min(6, recruitmentMarketCount),
        guideRemainsInsideRecruitmentZone: Boolean(host.querySelector('.recruitment-candidate-zone .recruitment-role-guide')),
        balancedExampleVisible: /A SIMPLE FIRST FIVE/.test(marketMarkup),
        profileExplainsPrimaryAndSecondary: /HOW THIS CANDIDATE FITS/.test(profileMarkup) && (profileMarkup.match(/recruitment-role-card/g) || []).length >= 1
      };
      return { ok: Object.values(checks).every(Boolean), checks, roleIds };
    },
    recruitmentDecisionSupportForTest: () => {
      const previous = {
        created: careerState.created,
        squad: careerState.squad,
        market: careerState.market,
        credits: careerState.credits,
        wageBudget: careerState.wageBudget,
        tutorial: careerState.tutorial,
        comparisons: [...recruitmentComparisonIds],
        comparisonExpanded: recruitmentComparisonExpanded,
        flipped: new Set(recruitmentFlippedIds),
        signingUpdate: recruitmentLastSigningUpdate
      };
      let markup = '';
      let emptyComparisonMarkup = '';
      try {
        careerState.created = true;
        careerState.credits = 350000;
        careerState.wageBudget = 32000;
        const generated = generateTeamMarket(12334);
        careerState.squad = [
          { ...generated[0], id: 'DS-ENTRY', role: 'entry', secondaryRole: 'flex', wage: 3500 },
          { ...generated[1], id: 'DS-SUPPORT', role: 'support', secondaryRole: 'caller', wage: 3400 }
        ];
        careerState.market = generated.slice(2);
        careerState.tutorial = { ...(previous.tutorial || {}), marketViewed: true, profileViewed: true, completed: false, dismissed: false };
        recruitmentComparisonIds = [];
        recruitmentComparisonExpanded = true;
        recruitmentFlippedIds = new Set();
        emptyComparisonMarkup = recruitmentComparisonPanelMarkup();
        recruitmentComparisonIds = careerState.market.slice(0, 3).map(player => player.id);
        recruitmentRecordSigningUpdate(careerState.squad[1], [careerState.squad[0]]);
        markup = renderTeamMarketTab();
      } finally {
        careerState.created = previous.created;
        careerState.squad = previous.squad;
        careerState.market = previous.market;
        careerState.credits = previous.credits;
        careerState.wageBudget = previous.wageBudget;
        careerState.tutorial = previous.tutorial;
        recruitmentComparisonIds = previous.comparisons;
        recruitmentComparisonExpanded = previous.comparisonExpanded;
        recruitmentFlippedIds = previous.flipped;
        recruitmentLastSigningUpdate = previous.signingUpdate;
      }
      const host = document.createElement('div');
      host.innerHTML = markup;
      const comparisonMarkup = host.querySelector('[data-recruitment-comparison-panel]')?.outerHTML || '';
      const checks = {
        activeFiveNeedsVisible: /ACTIVE FIVE NEEDS/.test(markup) && /2 \/ 5 OPERATORS CONTRACTED/.test(markup),
        functionalCoverageVisible: host.querySelectorAll('.recruitment-function-grid article').length === RECRUITMENT_TEAM_FUNCTIONS.length,
        compactCandidateAssessment: Boolean(host.querySelector('.recruitment-card-fit')) && /ROLE FIT/.test(markup),
        threeBeginnerRecommendations: new Set(Array.from(host.querySelectorAll('.recruitment-recommendation-badges b')).map(node => node.textContent.trim())).size === 3,
        comparisonTrayVisible: Boolean(host.querySelector('[data-recruitment-comparison-tray]')) && host.querySelectorAll('.recruitment-comparison-slot.filled').length === 3,
        comparisonShowsThree: host.querySelectorAll('.recruitment-comparison-grid > article').length === 3,
        comparisonIncludesDecisionFacts: /MEDICAL RISK/.test(markup) && /CASH AFTER/.test(markup) && /ACTIVE FIVE CHANGE/.test(markup),
        comparisonInterpretsDecision: /BEST CURRENT FIT/.test(markup) && /WHY THIS FITS/.test(markup) && /MAIN TRADE-OFF/.test(markup),
        comparisonRecommendationFirst: Boolean(host.querySelector('.recruitment-comparison-grid > article')?.classList.contains('recommended')),
        comparisonScoresSquadContext: host.querySelectorAll('.recruitment-comparison-score-grid').length === 3 && /IMMEDIATE IMPACT/.test(markup) && /FUTURE CEILING/.test(markup) && /SQUAD NEED/.test(markup) && /BUDGET FIT/.test(markup),
        comparisonProvidesDirectActions: host.querySelectorAll('.recruitment-comparison-grid [data-team-profile]').length === 3 && host.querySelectorAll('.recruitment-comparison-grid [data-transfer-start]').length === 3,
        emptyComparisonTeachesFlow: /TUTORIAL DECISION TOOL/.test(emptyComparisonMarkup) && /ADD TWO CANDIDATES FROM THE COMPACT CARDS/i.test(emptyComparisonMarkup) && /BEST CURRENT FIT/i.test(emptyComparisonMarkup),
        postSigningUpdateVisible: /SIGNING COMPLETE · ACTIVE FIVE/.test(markup) && /PLACE(?:S)? STILL TO FILL|ACTIVE FIVE COMPLETE/.test(markup),
        transientOnly: !Object.prototype.hasOwnProperty.call(recruitmentState(), 'comparisonIds') && !Object.prototype.hasOwnProperty.call(recruitmentState(), 'comparisonExpanded') && !Object.prototype.hasOwnProperty.call(recruitmentState(), 'flippedIds') && !Object.prototype.hasOwnProperty.call(recruitmentState(), 'lastSigningUpdate')
      };
      return { ok: Object.values(checks).every(Boolean), checks, comparisonMarkup, emptyComparisonMarkup };
    },
    recruitmentComparisonInteractionForTest: () => {
      const previous = {
        careerState,
        comparisons: [...recruitmentComparisonIds],
        comparisonExpanded: recruitmentComparisonExpanded,
        flipped: new Set(recruitmentFlippedIds),
        menuTab,
        menuContext,
        appState
      };
      const originalRaf = window.requestAnimationFrame;
      const originalScrollIntoView = Element.prototype.scrollIntoView;
      let focusTriggered = false;
      let focusBlock = '';
      let result = null;
      try {
        const generated = generateTeamMarket(12335);
        careerState = makeDefaultCareerState();
        careerState.created = true;
        careerState.name = 'Comparison Test Club';
        careerState.credits = 350000;
        careerState.wageBudget = 32000;
        careerState.squad = [
          { ...generated[0], id: 'CI-ENTRY', role: 'entry', secondaryRole: 'flex', wage: 3500 },
          { ...generated[1], id: 'CI-SUPPORT', role: 'support', secondaryRole: 'caller', wage: 3400 }
        ];
        careerState.market = generated.slice(2);
        careerState.tutorial = { ...(careerState.tutorial || {}), marketViewed: true, profileViewed: true, completed: false, dismissed: false };
        recruitmentComparisonIds = [];
        recruitmentComparisonExpanded = false;
        recruitmentFlippedIds = new Set();
        menuContext = 'main';
        menuTab = 'market';
        setAppState('menu');
        window.requestAnimationFrame = callback => { callback(performance.now()); return 1; };
        Element.prototype.scrollIntoView = function(options) {
          if (this.matches?.('[data-recruitment-comparison-panel]')) {
            focusTriggered = true;
            focusBlock = String(options?.block || '');
          }
        };
        updateMenuUI();
        let buttons = [...menuContentEl.querySelectorAll('.recruitment-market-row .recruitment-card-front [data-recruitment-compare]')];
        const firstButtonCount = buttons.length;
        if (buttons[0]) handleRecruitmentCommercialClick({ target: buttons[0] });
        const afterFirst = recruitmentComparisonIds.length;
        buttons = [...menuContentEl.querySelectorAll('.recruitment-market-row .recruitment-card-front [data-recruitment-compare]')];
        if (buttons[1]) handleRecruitmentCommercialClick({ target: buttons[1] });
        const panel = menuContentEl.querySelector('[data-recruitment-comparison-panel]');
        result = {
          firstButtonCount,
          afterFirst,
          afterSecond: recruitmentComparisonIds.length,
          comparisonCards: panel?.querySelectorAll('.recruitment-comparison-grid > article').length || 0,
          comparisonOpen: Boolean(panel && !panel.hidden && recruitmentComparisonExpanded),
          traySlots: menuContentEl.querySelectorAll('.recruitment-comparison-slot.filled').length,
          recommendationVisible: Boolean(panel && /BEST CURRENT FIT/.test(panel.textContent || '')),
          focusTriggered,
          focusBlock,
          directNegotiationActions: panel?.querySelectorAll('[data-transfer-start]').length || 0
        };
      } finally {
        window.requestAnimationFrame = originalRaf;
        if (originalScrollIntoView) Element.prototype.scrollIntoView = originalScrollIntoView;
        else delete Element.prototype.scrollIntoView;
        careerState = previous.careerState;
        recruitmentComparisonIds = previous.comparisons;
        recruitmentComparisonExpanded = previous.comparisonExpanded;
        recruitmentFlippedIds = previous.flipped;
        menuTab = previous.menuTab;
        menuContext = previous.menuContext;
        setAppState(previous.appState);
        updateMenuUI();
      }
      const checks = {
        marketButtonsAvailable: Number(result?.firstButtonCount) >= 2,
        firstSelectionHeld: result?.afterFirst === 1,
        secondSelectionHeld: result?.afterSecond === 2,
        comparisonRendered: result?.comparisonCards === 2 && result?.comparisonOpen && result?.recommendationVisible,
        trayTracksSelections: result?.traySlots === 2,
        completedComparisonFocused: result?.focusTriggered === true && result?.focusBlock === 'start',
        negotiationActionsPresent: result?.directNegotiationActions === 2
      };
      return { ok: Object.values(checks).every(Boolean), checks, result };
    },
    recruitmentCompactCardsForTest: () => {
      const previous = {
        created: careerState.created,
        squad: careerState.squad,
        market: careerState.market,
        tutorial: careerState.tutorial,
        totalMatches: careerState.totalMatches,
        lastRound: careerState.lastRound,
        comparisons: [...recruitmentComparisonIds],
        comparisonExpanded: recruitmentComparisonExpanded,
        flipped: new Set(recruitmentFlippedIds),
        beginnerExpanded: recruitmentBeginnerExpanded
      };
      let markup = '';
      try {
        careerState.created = true;
        careerState.squad = [];
        careerState.totalMatches = 0;
        careerState.lastRound = null;
        careerState.market = generateTeamMarket(12336);
        careerState.tutorial = { ...(previous.tutorial || {}), marketViewed: true, profileViewed: true, completed: false, dismissed: false };
        recruitmentComparisonIds = [];
        recruitmentComparisonExpanded = false;
        recruitmentFlippedIds = new Set();
        recruitmentBeginnerExpanded = false;
        markup = renderTeamMarketTab();
      } finally {
        careerState.created = previous.created;
        careerState.squad = previous.squad;
        careerState.market = previous.market;
        careerState.tutorial = previous.tutorial;
        careerState.totalMatches = previous.totalMatches;
        careerState.lastRound = previous.lastRound;
        recruitmentComparisonIds = previous.comparisons;
        recruitmentComparisonExpanded = previous.comparisonExpanded;
        recruitmentFlippedIds = previous.flipped;
        recruitmentBeginnerExpanded = previous.beginnerExpanded;
      }
      const host = document.createElement('div');
      host.innerHTML = markup;
      const cards = [...host.querySelectorAll('.recruitment-candidate-card')];
      const first = cards[0];
      const front = first?.querySelector('.recruitment-card-front');
      const back = first?.querySelector('.recruitment-card-back');
      const mobile = first?.querySelector('.recruitment-mobile-card');
      const checks = {
        guidedListUsesSixCompactCards: cards.length === 6,
        twoFacesPresent: Boolean(front && back),
        explicitFlipControls: Boolean(front?.querySelector('[data-recruitment-flip]') && back?.querySelector('[data-recruitment-flip]')),
        decisionFactsOnFront: Boolean(front && /ABILITY/.test(front.textContent || '') && /POTENTIAL/.test(front.textContent || '') && /FEE/.test(front.textContent || '') && /WAGE/.test(front.textContent || '')),
        scoutDepthOnBack: Boolean(back && /ROLE BRIEF/.test(back.textContent || '') && /KEY ATTRIBUTES/.test(back.textContent || '') && /MEDICAL/.test(back.textContent || '') && /ACTIVE FIVE IMPACT/.test(back.textContent || '')),
        directActionsRetained: Boolean(front?.querySelector('[data-recruitment-shortlist]') && front?.querySelector('[data-recruitment-compare]') && front?.querySelector('[data-team-profile]') && front?.querySelector('[data-transfer-start]')),
        mobileFrontCompareVisible: Boolean(mobile?.querySelector('.recruitment-mobile-summary-actions [data-recruitment-compare]')),
        comparisonTrayHasThreeSlots: host.querySelectorAll('.recruitment-comparison-slot').length === 3,
        detailWorkspaceStartsClosed: Boolean(host.querySelector('[data-recruitment-comparison-panel]')?.hidden),
        transientOnly: !Object.prototype.hasOwnProperty.call(recruitmentState(), 'comparisonExpanded') && !Object.prototype.hasOwnProperty.call(recruitmentState(), 'flippedIds')
      };
      return { ok: Object.values(checks).every(Boolean), checks, cardCount: cards.length };
    },
    economyGuidanceForTest: () => {
      const previous = {
        created: careerState.created,
        squad: careerState.squad,
        tutorial: careerState.tutorial,
        totalMatches: careerState.totalMatches,
        lastRound: careerState.lastRound,
        financeLoan: careerState.financeLoan,
        credits: careerState.credits,
        wageBudget: careerState.wageBudget,
        goldCoins: careerState.goldCoins,
        unspentPoints: careerState.unspentPoints
      };
      let recruitmentPanel = '';
      let firstSigningGuide = null;
      let rewardMarkup = '';
      let overviewMarkup = '';
      try {
        careerState.created = true;
        careerState.squad = [];
        careerState.totalMatches = 0;
        careerState.lastRound = null;
        careerState.credits = 350000;
        careerState.wageBudget = 32000;
        careerState.goldCoins = 7;
        careerState.unspentPoints = 0;
        careerState.financeLoan = typeof normaliseFinanceLoan === 'function'
          ? normaliseFinanceLoan(null, true, 1)
          : careerState.financeLoan;
        careerState.tutorial = {
          ...(previous.tutorial || {}),
          marketViewed: false,
          profileViewed: false,
          squadViewed: false,
          completed: false,
          dismissed: false,
          contextSeen: { ...((previous.tutorial || {}).contextSeen || {}) }
        };
        recruitmentPanel = renderTeamTutorialPanel();
        careerState.tutorial = {
          ...careerState.tutorial,
          marketViewed: true,
          profileViewed: true
        };
        firstSigningGuide = firstMatchGuidance();
        const syntheticSummary = {
          won: true,
          finance: {
            income: 24000,
            resultRewardLabel: 'FIRST CAREER WIN',
            development: [
              { playerId: 'A', xp: 18 },
              { playerId: 'B', xp: 16 },
              { playerId: 'C', xp: 14 },
              { playerId: 'D', xp: 12 },
              { playerId: 'E', xp: 10 }
            ]
          },
          xpAward: 96,
          levelsGained: 1,
          goldCoinReward: { amount: 13, label: 'LEAGUE VICTORY' },
          rewardEligible: true
        };
        rewardMarkup = careerFirstMatchOutcomeMarkup(syntheticSummary, 1);
        overviewMarkup = clubEconomyGuideMarkup('overview');
      } finally {
        careerState.created = previous.created;
        careerState.squad = previous.squad;
        careerState.tutorial = previous.tutorial;
        careerState.totalMatches = previous.totalMatches;
        careerState.lastRound = previous.lastRound;
        careerState.financeLoan = previous.financeLoan;
        careerState.credits = previous.credits;
        careerState.wageBudget = previous.wageBudget;
        careerState.goldCoins = previous.goldCoins;
        careerState.unspentPoints = previous.unspentPoints;
      }
      const guideCount = (recruitmentPanel.match(/data-economy-guide="recruitment"/g) || []).length;
      const rewardCards = (rewardMarkup.match(/club-economy-guide reward/g) || []).length;
      const checks = {
        oneRecruitmentGuide: guideCount === 1,
        removesDuplicateLoanFacts: !/team-tutorial-loan-facts/.test(recruitmentPanel),
        recruitmentExplainsThreeCommitments: /CLUB CASH · CR/.test(recruitmentPanel) && /WAGE HEADROOM/.test(recruitmentPanel) && /FOUNDATION LOAN/.test(recruitmentPanel) && /A LIMIT, NOT ANOTHER BALANCE/.test(recruitmentPanel),
        firstSigningIsJustInTime: firstSigningGuide?.id === 'first-signing' && /transfer fee leaves Club Cash immediately/i.test(firstSigningGuide.detail) && /weekly wage uses wage headroom/i.test(firstSigningGuide.detail),
        rewardGuideRenderedOnce: rewardCards === 1,
        rewardUsesExactDestinations: /CLUB CASH · CR/.test(rewardMarkup) && /GOLD COINS · GC/.test(rewardMarkup) && /TEAM XP/.test(rewardMarkup) && /PLAYER XP/.test(rewardMarkup),
        supplyDropNotCurrency: /SUPPLY DROP IS NOT A CURRENCY/.test(rewardMarkup) && /free match crate/i.test(rewardMarkup),
        consistentCashName: !/<small>CREDITS<\/small>/.test(rewardMarkup) && /Club Cash, Gold Coins, Team XP and Player XP/.test(rewardMarkup),
        overviewSeparatesSystems: (overviewMarkup.match(/club-economy-guide overview/g) || []).length === 1 && /One balance never substitutes for another/.test(overviewMarkup),
        routeTutorialsFocusOnUse: MENU_CONTEXT_TUTORIALS.barracks?.title === 'READING CLUB FINANCES' && MENU_CONTEXT_TUTORIALS.gold?.title === 'READING THE GOLD COIN ACCOUNT' && MENU_CONTEXT_TUTORIALS.training?.title === 'TURNING XP INTO DEVELOPMENT',
        depotClarifiesBothPurchases: /Club Cash buys the named weapon or armour copy/.test(MENU_CONTEXT_TUTORIALS.store?.body || '') && /Gold Coins buy a random Tactical Field Crate/.test(MENU_CONTEXT_TUTORIALS.store?.body || '')
      };
      return { ok: Object.values(checks).every(Boolean), checks, guideCount, rewardCards, firstSigningGuide };
    },
    guidanceConsolidationForTest: () => {
      const previous = {
        created: careerState.created,
        squad: careerState.squad,
        tutorial: careerState.tutorial,
        totalMatches: careerState.totalMatches,
        lastRound: careerState.lastRound,
        calendar: careerState.calendar,
        tactics: careerState.tactics ? JSON.parse(JSON.stringify(careerState.tactics)) : careerState.tactics
      };
      let opening = {};
      let handoff = {};
      try {
        careerState.created = true;
        careerState.squad = [];
        careerState.totalMatches = 0;
        careerState.lastRound = null;
        careerState.calendar = { ...(previous.calendar || {}), absoluteDay: 0 };
        careerState.tutorial = {
          ...(previous.tutorial || {}),
          completed: false,
          dismissed: false,
          marketViewed: false,
          profileViewed: false,
          squadViewed: false,
          contextSeen: { ...((previous.tutorial || {}).contextSeen || {}) }
        };
        opening = {
          guide: firstMatchGuidance(),
          foundation: renderFoundationPath(),
          induction: renderTeamTutorialPanel(),
          sectionTutorial: renderMenuContextTutorial('reports'),
          directory: renderCommandFeatureDirectory()
        };

        careerState.squad = Array.from({ length: TEAM_REQUIRED_STARTERS }, (_, index) => ({
          id: `GUIDE-${index}`,
          name: `Guide Operator ${index + 1}`,
          role: 'support',
          trainingFocus: index === 0 ? 'aim' : 'none'
        }));
        if (typeof clubMatchPrepState === 'function' && typeof clubMatchPlanSignature === 'function') {
          const prep = clubMatchPrepState();
          prep.briefingReviewed = true;
          prep.planConfirmed = true;
          prep.lineupSignature = clubMatchPlanSignature();
        }
        careerState.totalMatches = 1;
        careerState.lastRound = { reportReviewed: true };
        careerState.tutorial = {
          ...careerState.tutorial,
          marketViewed: true,
          profileViewed: true,
          squadViewed: true,
          completed: true
        };
        handoff = {
          guide: firstMatchGuidance(),
          foundation: renderFoundationPath()
        };
      } finally {
        careerState.created = previous.created;
        careerState.squad = previous.squad;
        careerState.tutorial = previous.tutorial;
        careerState.totalMatches = previous.totalMatches;
        careerState.lastRound = previous.lastRound;
        careerState.calendar = previous.calendar;
        careerState.tactics = previous.tactics;
      }
      const checks = {
        guideRemainsAuthoritative: opening.guide?.total === 9 && opening.guide?.milestoneTotal === 6,
        foundationHiddenDuringGuide: opening.foundation === '',
        inductionIsOptionalDisclosure: /<details class="team-tutorial-card team-tutorial-optional/.test(opening.induction) && /OPTIONAL CONTEXT/.test(opening.induction),
        inductionHasNoCompetingRouteButton: !/data-team-route=/.test(opening.induction),
        sectionTutorialDelayed: opening.sectionTutorial === '',
        commandRecommendationsSuppressed: !/command-directory-recommended/.test(opening.directory),
        openingWeekAgendaAppearsAfterGuide: !handoff.guide && /CLUB DAILY AGENDA/.test(handoff.foundation) && /MATCH READINESS/.test(handoff.foundation)
      };
      return { ok: Object.values(checks).every(Boolean), checks };
    },
    progressiveInterfaceForTest: () => {
      const phase = overrides => ({
        active: true,
        guide: null,
        squadCount: 0,
        activeFiveReady: false,
        planConfirmed: false,
        firstMatchComplete: false,
        reportReviewed: false,
        trainingSet: false,
        ...overrides
      });
      const opening = phase({ guide: { route: 'market' } });
      const activeFive = phase({ squadCount: 5, activeFiveReady: true, guide: { route: 'operators' } });
      const plan = phase({ squadCount: 5, activeFiveReady: true, planConfirmed: true, guide: { route: 'play' } });
      const match = phase({ squadCount: 5, activeFiveReady: true, planConfirmed: true, firstMatchComplete: true, guide: { route: 'reports' } });
      const debrief = phase({ squadCount: 5, activeFiveReady: true, planConfirmed: true, firstMatchComplete: true, reportReviewed: true, guide: { route: 'training' } });
      const complete = phase({ active: false, squadCount: 5, activeFiveReady: true, planConfirmed: true, firstMatchComplete: true, reportReviewed: true, trainingSet: true });
      const previousMatches = Number(careerState.totalMatches) || 0;
      let establishedCareer = complete;
      try {
        careerState.totalMatches = 2;
        establishedCareer = firstMatchInterfaceFacts();
      } finally {
        careerState.totalMatches = previousMatches;
      }
      const checks = {
        openingRecruitmentOpen: !progressiveRouteAccess('market', opening).locked,
        openingArmouryLocked: progressiveRouteAccess('loadout', opening).locked,
        openingSuppliesLocked: progressiveRouteAccess('store', opening).locked,
        openingTrainingLocked: progressiveRouteAccess('training', opening).locked,
        activeFiveSquadOpen: !progressiveRouteAccess('operators', activeFive).locked,
        activeFiveTacticsOpen: !progressiveRouteAccess('tactics', activeFive).locked,
        activeFiveLoadoutOpen: !progressiveRouteAccess('loadout', activeFive).locked,
        prePlanLeagueLocked: progressiveRouteAccess('league', activeFive).locked,
        confirmedPlanLeagueOpen: !progressiveRouteAccess('league', plan).locked,
        confirmedPlanCalendarOpen: !progressiveRouteAccess('calendar', plan).locked,
        preMatchReportLocked: progressiveRouteAccess('reports', plan).locked,
        firstMatchReportOpen: !progressiveRouteAccess('reports', match).locked,
        firstMatchSupplyOpen: !progressiveRouteAccess('store', match).locked,
        preDebriefTrainingLocked: progressiveRouteAccess('training', match).locked,
        debriefTrainingOpen: !progressiveRouteAccess('training', debrief).locked,
        advancedClubStillLocked: progressiveRouteAccess('staff', debrief).locked,
        completionUnlocksAll: ['transfers','staff','barracks','gold','commercial','supporters'].every(route => !progressiveRouteAccess(route, complete).locked),
        establishedCareerNotRelocked: !establishedCareer.active && !progressiveRouteAccess('staff', establishedCareer).locked,
        lockedSectionVisible: progressiveSectionAccess('supplies', opening).state === 'locked',
        partialSectionVisible: progressiveSectionAccess('career', opening).state === 'partial'
      };
      return { ok: Object.values(checks).every(Boolean), checks };
    },
    liveMatchClarityForTest: () => {
      const bot = bots[spectatorIndex] || bots.find(candidate => candidate.team === CAREER_OWNED_TEAM) || bots[0] || null;
      if (!bot) return { ok: false, reason: 'No operator available.' };
      const before = { x: bot.x, y: bot.y, angle: bot.angle, target: bot.target, objective: bot.objective, reloadTimer: bot.reloadTimer, weaponSwapTimer: bot.weaponSwapTimer };
      const intent = spectatorIntentLabel(bot);
      const objective = liveMatchObjectiveText();
      const plan = liveMatchPlanText();
      const after = { x: bot.x, y: bot.y, angle: bot.angle, target: bot.target, objective: bot.objective, reloadTimer: bot.reloadTimer, weaponSwapTimer: bot.weaponSwapTimer };
      const unchanged = before.x === after.x && before.y === after.y && before.angle === after.angle && before.target === after.target && before.objective === after.objective && before.reloadTimer === after.reloadTimer && before.weaponSwapTimer === after.weaponSwapTimer;
      return { ok: Boolean(intent && objective && /AUTONOMOUS OPERATORS/.test(plan) && unchanged), intent, objective, plan, unchanged };
    },
    firstDebriefGuideForTest: () => {
      const previousMatches = Number(careerState.totalMatches) || 0;
      try {
        careerState.totalMatches = 1;
        const host = document.createElement('div');
        host.innerHTML = careerReportMarkup({ won: true, blueScore: 3, redScore: 1, kills: 6, deaths: 3, accuracy: 0.42, damageDealt: 640, damageTaken: 310, survived: true, roundsPlayed: 4, survivalTime: 126, shotsHit: 21, shotsFired: 50, reloads: 4, weaponName: 'TEST LOADOUT' });
        const steps = Array.from(host.querySelectorAll('.first-debrief-guide article strong')).map(node => node.textContent.trim());
        return { ok: steps.length === 3 && steps[0] === 'READ WHAT WORKED' && steps[1] === 'FIND THE BIGGEST ISSUE' && steps[2] === 'OPEN NEXT MANAGER ACTION', steps };
      } finally {
        careerState.totalMatches = previousMatches;
      }
    },
    opponentPreparationForTest: () => {
      const preparation = typeof opponentPreparationRead === 'function' ? opponentPreparationRead() : null;
      const plans = typeof opponentResponsePlanCandidates === 'function' ? opponentResponsePlanCandidates(preparation) : [];
      const prep = typeof clubMatchPrepState === 'function' ? clubMatchPrepState() : null;
      const activePlan = typeof clubActiveMatchPlan === 'function' ? clubActiveMatchPlan() : null;
      const analysis = careerState.lastRound && typeof buildTacticalMatchAnalysis === 'function' ? buildTacticalMatchAnalysis(careerState.lastRound) : null;
      return { ok: Boolean(preparation && plans.length === 3), preparation, plans, prep, activePlan, review: analysis?.opponentPreparation || null };
    },
    firstMatchPayoffForTest: () => {
      if (!careerState.created || (careerState.squad || []).length < TEAM_REQUIRED_STARTERS) window.__strikeDebug.seedReadabilityCareerForTest(5);
      const starters = (careerState.squad || []).slice(0, TEAM_REQUIRED_STARTERS);
      const recommendationPlayer = starters[0] || null;
      const syntheticSummary = {
        firstCareerMatch: true,
        won: true,
        blueScore: 3,
        redScore: 1,
        roundsWon: 3,
        roundsPlayed: 4,
        kills: 7,
        deaths: 3,
        survived: true,
        shotsFired: 54,
        shotsHit: 23,
        accuracy: 23 / 54,
        damageDealt: 720,
        damageTaken: 390,
        survivalTime: 138,
        score: 84,
        grade: 'A',
        xpAward: 205,
        levelsGained: 1,
        rewardEligible: true,
        blueTeamName: careerState.name || 'Vanguard Five',
        redTeamName: 'Iron Vow',
        matchPresentation: { blue: { name: careerState.name || 'Vanguard Five' }, red: { name: 'Iron Vow' } },
        finance: {
          income: 46500,
          resultRewardLabel: 'FIRST CAREER WIN',
          development: starters.map((player, index) => ({ playerId: player.id, xp: 38 - index * 3, levelsGained: index === 0 ? 1 : 0 }))
        },
        goldCoinReward: { amount: 2, label: 'FIRST CAREER WIN' },
        supporterReaction: {
          type: 'MATCH', title: 'SUPPORTERS WELCOME THE OPENING WIN', detail: 'The first result increased confidence in the new club.', tone: 'positive',
          deltas: { confidence: 4, popularity: 2, loyalty: 1, fanbase: 18 }
        },
        tacticalAnalysis: {
          recommendations: [{ route: 'training', playerId: recommendationPlayer?.id || '', targetId: 'aim', actionLabel: 'TRAIN MARKSMANSHIP', text: 'The clearest next step is improving controlled-range accuracy.' }]
        }
      };
      const previousLastMatches = starters.map(player => player.lastMatch);
      starters.forEach((player, index) => {
        player.lastMatch = { rating: Math.max(6.4, 8.7 - index * 0.45), kills: Math.max(0, 3 - Math.floor(index / 2)), deaths: index % 2, won: true };
      });
      const stageChecks = [];
      try {
        for (let stage = 0; stage < 5; stage++) {
          const host = document.createElement('div');
          host.innerHTML = careerFirstMatchOutcomeMarkup(syntheticSummary, stage);
          stageChecks.push({
            stage,
            hasProgress: host.querySelectorAll('.first-match-outcome-progress span').length === 5,
            hasStage: Boolean(host.querySelector('.first-match-outcome-stage')),
            hasAction: stage !== 4 || Boolean(host.querySelector('[data-coaching-route]')),
            text: host.textContent.replace(/\s+/g, ' ').trim().slice(0, 180)
          });
        }
      } finally {
        starters.forEach((player, index) => { player.lastMatch = previousLastMatches[index]; });
      }
      const deploymentHost = document.createElement('div');
      const previousDeploymentActive = deploymentSelectionState.active;
      const previousDeploymentArena = deploymentSelectionState.selectedArenaId;
      let introSnapshot = null;
      let momentSnapshot = null;
      try {
        deploymentSelectionState.active = true;
        deploymentSelectionState.selectedArenaId = arenaMeta(careerState?.tactics?.arenaId || activeArenaMeta().id).id;
        renderDeploymentSelection();
        deploymentHost.innerHTML = `${deploymentRosterEl?.innerHTML || ''}${deploymentTacticsEl?.innerHTML || ''}<button>${deploymentConfirmBtn?.textContent || ''}</button>`;
        showCareerMatchIntro();
        introSnapshot = {
          active: careerMatchIntroActive(),
          visible: Boolean(careerMatchIntroEl && !careerMatchIntroEl.hidden),
          blueCount: careerMatchIntroBlueRosterEl?.querySelectorAll('.career-match-intro-operator').length || 0,
          redCount: careerMatchIntroRedRosterEl?.querySelectorAll('.career-match-intro-operator').length || 0,
          plan: careerMatchIntroPlanEl?.textContent || ''
        };
        resetCareerMatchIntro();
        queueCareerMatchMoment('debug-first-match-payoff', 'ROLE IN ACTION', 'ENTRY OPERATOR TAKING FIRST CONTACT', 'Debug explanation.', 'coach', 3.1, true);
        momentSnapshot = {
          visible: Boolean(careerMatchMomentEl && !careerMatchMomentEl.hidden),
          title: careerMatchMomentTitleEl?.textContent || '',
          detail: careerMatchMomentDetailEl?.textContent || ''
        };
        resetCareerMatchMoments();
      } finally {
        resetCareerMatchIntro();
        resetCareerMatchMoments();
        deploymentSelectionState.active = previousDeploymentActive;
        deploymentSelectionState.selectedArenaId = previousDeploymentArena;
      }
      const checks = {
        fiveStagedOutcomeScreens: stageChecks.length === 5 && stageChecks.every(item => item.hasProgress && item.hasStage && item.hasAction),
        deploymentMatchupBrief: Boolean(deploymentHost.querySelector('.deployment-matchup-brief')),
        deploymentFivePortraits: deploymentHost.querySelectorAll('.team-player-visual').length >= TEAM_REQUIRED_STARTERS,
        explicitDeployCopy: /DEPLOY ACTIVE FIVE OPERATORS/.test(deploymentHost.textContent),
        introShowsBothTeams: Boolean(introSnapshot?.active && introSnapshot.visible && introSnapshot.blueCount >= TEAM_REQUIRED_STARTERS && introSnapshot.redCount >= TEAM_REQUIRED_STARTERS),
        introExplainsPlan: Boolean(introSnapshot?.plan),
        contextualMomentRenders: Boolean(momentSnapshot?.visible && /ENTRY OPERATOR/.test(momentSnapshot.title)),
        finalStageHasDirectAction: stageChecks[4]?.hasAction === true
      };
      return { ok: Object.values(checks).every(Boolean), checks, stages: stageChecks, intro: introSnapshot, moment: momentSnapshot };
    },
    matchdayStoryPayoffForTest: () => {
      if (!careerState.created || (careerState.squad || []).length < TEAM_REQUIRED_STARTERS) window.__strikeDebug.seedReadabilityCareerForTest(5);
      const starters = (careerState.squad || []).slice(0, TEAM_REQUIRED_STARTERS);
      const snapshot = {
        totalMatches: careerState.totalMatches,
        playerStats: teamMatchPlayerStats,
        matchStats: careerMatchStats,
        roundNumber,
        players: starters.map(player => ({
          player,
          lastMatch: player.lastMatch ? { ...player.lastMatch } : null,
          performanceTraits: Array.isArray(player.performanceTraits) ? player.performanceTraits.map(item => ({ ...item })) : [],
          performanceEvidence: player.performanceEvidence ? { ...player.performanceEvidence } : null
        }))
      };
      try {
        careerState.totalMatches = Math.max(3, Number(careerState.totalMatches) || 0);
        teamMatchPlayerStats = {};
        starters.forEach((player, index) => {
          const performance = {
            rounds: 4, roundsWon: 3, kills: Math.max(1, 5 - index), deaths: index < 2 ? 1 : 2,
            shotsFired: 32 + index * 3, shotsHit: 15 - index, damageDealt: 420 - index * 35,
            damageTaken: 180 + index * 22, survivalTime: 112 - index * 8, survivedRounds: Math.max(1, 4 - index),
            supportedTime: 72 - index * 4, isolatedTime: 18 + index * 4, tradeAttempts: 3, tradeKills: index === 0 ? 2 : (index === 1 ? 1 : 0),
            roleActions: 4 + index, routeReplans: index, highestMultiKill: index === 0 ? 3 : 1,
            rating: Number(Math.max(6.4, 9.0 - index * .55).toFixed(2))
          };
          teamMatchPlayerStats[player.id] = performance;
          player.lastMatch = { ...performance, won: true, accuracy: performance.shotsHit / performance.shotsFired };
          player.performanceTraits = [];
          player.performanceEvidence = index === 0
            ? { matchesObserved: 2, openingKills: 1, tradeKills: 3, clutchWins: 1, longRangeKills: 1, flankKills: 0, supportMatches: 2, pressureMatches: 2, survivedRounds: 5 }
            : { matchesObserved: 2, openingKills: 0, tradeKills: 0, clutchWins: 0, longRangeKills: 0, flankKills: 0, supportMatches: 1, pressureMatches: 0, survivedRounds: 2 };
        });
        const lead = starters[0];
        const partner = starters[1];
        const summary = {
          won: true, blueScore: 3, redScore: 2, roundsPlayed: 5, roundsWon: 3,
          kills: 14, deaths: 9, survived: true, shotsFired: 162, shotsHit: 66, accuracy: 66 / 162,
          damageDealt: 1520, damageTaken: 1080, survivalTime: 480, reloads: 13, score: 86, grade: 'A', xpAward: 230,
          weaponName: 'ACTIVE FIVE LOADOUT', blueTeamName: careerState.name || 'YOUR CLUB', redTeamName: 'IRON VOW',
          matchMoments: [
            { id: 'opening-test', type: 'opening', title: 'FIRST CONTACT WON', detail: `${lead.name.toUpperCase()} created the early advantage.`, label: 'OPENING ELIMINATION', tone: 'advantage', round: 1, playerId: lead.id, playerName: lead.name, team: CAREER_OWNED_TEAM, priority: 58, evidence: { opening: true } },
            { id: 'trade-test', type: 'trade', title: 'IMMEDIATE RESPONSE', detail: `${lead.name.toUpperCase()} converted the trade window.`, label: 'TRADE CONVERTED', tone: 'advantage', round: 2, playerId: lead.id, playerName: lead.name, team: CAREER_OWNED_TEAM, priority: 76, evidence: { tradeKill: true } },
            { id: 'clutch-test', type: 'clutch', title: 'LAST OPERATOR CLOSES THE ROUND', detail: `${lead.name.toUpperCase()} won the final duel.`, label: 'CLUTCH WON', tone: 'clutch', round: 4, playerId: lead.id, playerName: lead.name, team: CAREER_OWNED_TEAM, priority: 100, evidence: { clutchWin: true } },
            { id: 'range-test', type: 'long-range', title: '16.4M PICK', detail: `${lead.name.toUpperCase()} controlled the long lane.`, label: 'LONG-RANGE ELIMINATION', tone: 'coach', round: 3, playerId: lead.id, playerName: lead.name, team: CAREER_OWNED_TEAM, priority: 68, evidence: { longRange: true } }
          ],
          roundDecisions: [{ round: 5, won: true, title: 'COORDINATED TRADES', detail: 'Two trade eliminations stopped the opposition response.', tone: 'advantage', factor: 'trade' }],
          squadDynamicsUpdate: { topChange: { playerIds: [lead.id, partner.id], delta: 8, score: 31 } },
          tacticalPlan: { adjustments: [{ changes: [{ type: 'engagement', fromLabel: 'BALANCED', toLabel: 'CONTROLLED' }], result: { tone: 'positive', title: 'RANGE CONTROL IMPROVED', evidence: 'Accuracy and supported damage improved in the following round.' } }] },
          tacticalAnalysis: { conclusions: { worked: { title: 'SUPPORTED PRESSURE HELD', evidence: 'The active five spent most movement time in support range.', tone: 'positive' } }, recommendations: [] },
          xpBreakdown: { base: 60, kills: 98, survival: 16, victory: 72, multiKill: 12 }
        };
        summary.matchHighlights = buildCareerMatchHighlights(summary);
        summary.performanceTraitUpdates = settleTeamPerformanceTraitsAfterMatch(summary);
        const reportHost = document.createElement('div');
        reportHost.innerHTML = careerReportMarkup(summary, false);
        const compactHost = document.createElement('div');
        compactHost.innerHTML = renderCareerMatchHighlights(summary, true);
        careerMatchStats = makeCareerMatchStats();
        roundNumber = 2;
        const wonDecision = careerRoundDecision({ supportedTime: 76, isolatedTime: 20, shotsFired: 30, shotsHit: 14, tradeAttempts: 4, tradeKills: 2, damageDealt: 490, damageTaken: 280, survivors: 2 }, CAREER_OWNED_TEAM);
        const drawDecision = careerRoundDecision({ supportedTime: 30, isolatedTime: 30, shotsFired: 16, shotsHit: 6, tradeAttempts: 1, tradeKills: 0, damageDealt: 210, damageTaken: 210, survivors: 1 }, null);
        const traits = normaliseTeamPerformanceTraits(lead.performanceTraits);
        const checks = {
          fiveStoryCards: summary.matchHighlights?.cards?.length === 5,
          requiredHighlights: ['play-of-match','turning-point','partnership','tactical-change','unexpected'].every(id => summary.matchHighlights.cards.some(card => card.id === id)),
          evidenceLedReport: Boolean(reportHost.querySelector('.career-report-highlights') && /PLAY OF THE MATCH/.test(reportHost.textContent) && /TURNING POINT/.test(reportHost.textContent)),
          firstMatchCompactStory: compactHost.querySelectorAll('.first-match-highlight-strip > article').length >= 2,
          traitEarnedFromRepeatedEvidence: traits.length >= 1 && summary.performanceTraitUpdates.length >= 1,
          traitCapRespected: traits.length <= 2,
          presentationOnlyTraits: traits.every(item => Object.keys(item).every(key => ['id','earnedMatch','evidenceValue'].includes(key))),
          roundReadUsesTelemetry: wonDecision.factor === 'trade' || wonDecision.factor === 'support',
          drawHandledTruthfully: drawDecision.draw === true && drawDecision.factor === 'draw',
          momentHistoryBounded: careerMatchStats.matchMoments.length <= 48
        };
        return { ok: Object.values(checks).every(Boolean), checks, highlights: summary.matchHighlights, traitUpdates: summary.performanceTraitUpdates, traits, wonDecision, drawDecision };
      } finally {
        careerState.totalMatches = snapshot.totalMatches;
        teamMatchPlayerStats = snapshot.playerStats;
        careerMatchStats = snapshot.matchStats;
        roundNumber = snapshot.roundNumber;
        snapshot.players.forEach(item => {
          item.player.lastMatch = item.lastMatch;
          item.player.performanceTraits = item.performanceTraits;
          item.player.performanceEvidence = item.performanceEvidence;
        });
      }
    },
    dynamicTransferMarketForTest: () => dynamicTransferMarketForTest(),
    openDynamicMarketForTest: () => {
      if (!careerState.created || (careerState.squad || []).length < TEAM_REQUIRED_STARTERS) window.__strikeDebug.seedReadabilityCareerForTest(5);
      careerState.totalMatches = Math.max(2, Number(careerState.totalMatches) || 0);
      careerState.tutorial = careerState.tutorial && typeof careerState.tutorial === 'object' ? careerState.tutorial : makeDefaultCareerTutorialState();
      careerState.tutorial.completed = true;
      careerState.lastRound = careerState.lastRound && typeof careerState.lastRound === 'object' ? careerState.lastRound : {};
      careerState.lastRound.reportReviewed = true;
      dynamicMarketProcessDay(clubCalendarState().absoluteDay, { force: true, forcePrice: true, forceDigest: true });
      menuContext = 'main';
      setAppState('menu');
      setMenuRoute('market');
      updateMenuUI();
      return { market: careerState.market.length, events: dynamicMarketState().eventLog.length, organicMail: (careerState.mail || []).filter(item => item.organic).length };
    },
    openOrganicMailForTest: () => {
      if (!careerState.created) window.__strikeDebug.seedReadabilityCareerForTest(5);
      const existing = (careerState.mail || []).find(item => item.storyKey === 'debug-organic-mail');
      const mail = existing || clubAddOrganicMail({ subject: 'Recruitment intelligence briefing', paragraphs: ['Manager,', 'NEW AVAILABILITY\n• A generated operator entered the current division market.\n• A rival club listed a player after changing squad priorities.', 'LEAGUE ACTIVITY\n• A rival bid was submitted for a role-specific target.\n• Another negotiation ended without agreement.', 'YOUR SQUAD CONTEXT\nCurrent cash, wage headroom and role needs are derived from the active career state.', 'MARKET OUTLOOK\nThis longer correspondence demonstrates the scrollable inbox and full-email popup while retaining the existing email presentation.', 'Regards,\nRecruitment Intelligence Unit'], category: 'RECRUITMENT', route: 'market', sender: 'Recruitment Intelligence Unit', preview: 'New availability, league activity and squad context.', storyKey: 'debug-organic-mail' });
      careerState.selectedMailId = mail.id;
      menuContext = 'main';
      setAppState('menu');
      setMenuRoute('mail');
      updateMenuUI();
      return { id: mail.id, bodyLength: mail.body.length, sender: mail.sender };
    },
    showFirstMatchOutcomeForTest: (stage = 0) => {
      if (!careerState.created || (careerState.squad || []).length < TEAM_REQUIRED_STARTERS) window.__strikeDebug.seedReadabilityCareerForTest(5);
      const safeStage = clamp(Math.floor(Number(stage) || 0), 0, 4);
      const firstPlayer = careerState.squad?.[0] || null;
      const summary = {
        firstCareerMatch: true, won: true, blueScore: 3, redScore: 1, roundsWon: 3, roundsPlayed: 4,
        kills: 7, deaths: 3, survived: true, shotsFired: 54, shotsHit: 23, accuracy: 23 / 54,
        damageDealt: 720, damageTaken: 390, survivalTime: 138, score: 84, grade: 'A', xpAward: 205,
        levelsGained: 1, rewardEligible: true, blueTeamName: careerState.name || 'YOUR CLUB', redTeamName: 'IRON VOW',
        matchPresentation: { blue: { name: careerState.name || 'YOUR CLUB' }, red: { name: 'IRON VOW' } },
        finance: { income: 46500, resultRewardLabel: 'FIRST CAREER WIN', development: (careerState.squad || []).slice(0, TEAM_REQUIRED_STARTERS).map((player, index) => ({ playerId: player.id, xp: 38 - index * 3, levelsGained: index === 0 ? 1 : 0 })) },
        goldCoinReward: { amount: 2, label: 'FIRST CAREER WIN' },
        supporterReaction: { type: 'MATCH', title: 'SUPPORTERS WELCOME THE OPENING WIN', detail: 'The first result increased confidence in the new club.', tone: 'positive', deltas: { confidence: 4, popularity: 2, loyalty: 1, fanbase: 18 } },
        tacticalAnalysis: { recommendations: [{ route: 'training', playerId: firstPlayer?.id || '', targetId: 'aim', actionLabel: 'TRAIN MARKSMANSHIP', text: 'The clearest next step is improving controlled-range accuracy.' }] }
      };
      (careerState.squad || []).slice(0, TEAM_REQUIRED_STARTERS).forEach((player, index) => {
        if (!player.lastMatch) player.lastMatch = { rating: Math.max(6.4, 8.7 - index * .45), kills: Math.max(0, 3 - Math.floor(index / 2)), deaths: index % 2, won: true, survivedRounds: Math.max(1, 4 - index), tradeKills: index === 0 ? 2 : 0 };
      });
      const firstTwo = (careerState.squad || []).slice(0, 2);
      summary.matchMoments = firstPlayer ? [
        { id: 'debug-opening', type: 'opening', label: 'OPENING ELIMINATION', title: 'FIRST CONTACT WON', detail: `${firstPlayer.name.toUpperCase()} created the early advantage.`, tone: 'advantage', round: 1, playerId: firstPlayer.id, playerName: firstPlayer.name, team: CAREER_OWNED_TEAM, priority: 58 },
        { id: 'debug-clutch', type: 'clutch', label: 'CLUTCH WON', title: 'LAST OPERATOR CLOSES THE ROUND', detail: `${firstPlayer.name.toUpperCase()} survived the final duel.`, tone: 'clutch', round: 4, playerId: firstPlayer.id, playerName: firstPlayer.name, team: CAREER_OWNED_TEAM, priority: 100 }
      ] : [];
      summary.squadDynamicsUpdate = firstTwo.length === 2 ? { topChange: { playerIds: firstTwo.map(player => player.id), delta: 7, score: 29 } } : null;
      summary.tacticalPlan = { adjustments: [{ changes: [{ type: 'engagement', fromLabel: 'BALANCED', toLabel: 'CONTROLLED' }], result: { tone: 'positive', title: 'RANGE CONTROL IMPROVED', evidence: 'The following round produced cleaner supported engagements.' } }] };
      summary.matchHighlights = typeof buildCareerMatchHighlights === 'function' ? buildCareerMatchHighlights(summary) : null;
      careerState.totalMatches = Math.max(1, Number(careerState.totalMatches) || 0);
      careerState.lastRound = summary;
      saveCareerState();
      careerReportState = { phase: 'visible', delay: 0, summary: careerState.lastRound, revealStage: safeStage, detailed: false };
      showCareerRoundReport();
      return {
        ok: Boolean(careerReportOverlayEl && !careerReportOverlayEl.hidden && careerReportContentEl?.querySelector('.first-match-outcome-stage')),
        stage: safeStage,
        title: careerReportTitleEl?.textContent || '',
        continueLabel: careerReportContinueBtn?.textContent || '',
        actionCount: careerReportContentEl?.querySelectorAll('[data-coaching-route]').length || 0
      };
    },
    hideFirstMatchOutcomeForTest: () => {
      careerReportState.phase = 'idle';
      if (careerReportOverlayEl) careerReportOverlayEl.hidden = true;
      return { hidden: Boolean(careerReportOverlayEl?.hidden) };
    },
    careerReportFlowForTest: () => ({
      phase: careerReportState.phase,
      revealStage: careerReportState.revealStage,
      detailed: Boolean(careerReportState.detailed),
      reportReviewed: Boolean(careerState.lastRound?.reportReviewed),
      rewardPhase: careerCrateState.phase,
      pendingCoaching: pendingTacticalCoachingTarget ? { ...pendingTacticalCoachingTarget } : null,
      overlayHidden: Boolean(careerReportOverlayEl?.hidden)
    }),
    showCareerMatchIntroForTest: () => {
      const shown = showCareerMatchIntro();
      return {
        ok: shown && careerMatchIntroActive(),
        active: careerMatchIntroActive(),
        hidden: Boolean(careerMatchIntroEl?.hidden),
        blueCount: careerMatchIntroBlueRosterEl?.querySelectorAll('.career-match-intro-operator').length || 0,
        redCount: careerMatchIntroRedRosterEl?.querySelectorAll('.career-match-intro-operator').length || 0,
        plan: careerMatchIntroPlanEl?.textContent || ''
      };
    },
    dismissCareerMatchIntroForTest: () => ({ ok: dismissCareerMatchIntro(), active: careerMatchIntroActive(), hidden: Boolean(careerMatchIntroEl?.hidden) }),
    careerMatchMomentForTest: (title = 'LAST OPERATOR', detail = 'One operator remains active.') => {
      resetCareerMatchMoments();
      queueCareerMatchMoment(`debug-${Date.now()}`, 'MATCH MOMENT', String(title), String(detail), 'warning', 3.1, true);
      return { ok: Boolean(careerMatchMomentEl && !careerMatchMomentEl.hidden), title: careerMatchMomentTitleEl?.textContent || '', detail: careerMatchMomentDetailEl?.textContent || '' };
    },
    createTestTeam: (teamName = 'Vanguard Five', managerName = 'Test Manager') => {
      careerDraft.name = normaliseCareerName(teamName);
      careerDraft.managerName = normaliseCareerName(managerName);
      createCareerOperator();
      return window.__strikeDebug.teamManagement();
    },
    prepareDeploymentForTest: (arenaId = 'citadel') => {
      if (!careerState.created) {
        careerDraft.name = 'Vanguard Five';
        careerDraft.managerName = 'Test Manager';
        createCareerOperator();
      }
      careerState.credits = Math.max(careerState.credits, 2000000);
      careerState.wageBudget = Math.max(careerState.wageBudget, 250000);
      while ((careerState.squad || []).length < TEAM_REQUIRED_STARTERS && (careerState.market || []).length) {
        const candidate = careerState.market.find(player => !careerState.squad.some(existing => existing.id === player.id));
        if (!candidate) break;
        recruitTeamPlayer(candidate.id);
      }
      clubTacticsState().arenaId = arenaMeta(arenaId).id;
      clubReviewMatchBriefing();
      clubConfirmMatchPlan();
      const prepared = typeof prepareCareerMatchContext === 'function' ? prepareCareerMatchContext('exhibition') : { ok: true, mode: 'exhibition' };
      saveCareerState();
      if (prepared?.ok) openDeploymentSelection();
      return {
        ready: careerSquadReady(),
        prepared,
        squad: careerState.squad.slice(0, TEAM_REQUIRED_STARTERS).map(player => ({ id: player.id, name: player.name, primaryWeaponId: careerPlayerPrimaryWeaponId(player), sidearmWeaponId: careerPlayerSidearmId(player), weaponId: careerPlayerActiveWeaponId(player) })),
        deployment: window.__strikeDebug.deploymentForTest()
      };
    },
    deploymentForTest: () => ({
      active: deploymentSelectionState.active,
      selectedArenaId: deploymentSelectionState.selectedArenaId,
      cardCount: deploymentMapGridEl?.querySelectorAll('[data-deployment-map]').length || 0,
      rosterCount: deploymentRosterEl?.querySelectorAll('.deployment-operator-row').length || 0,
      sessionHidden: Boolean(matchmakingSessionEl?.hidden),
      overlayVisible: matchmakingOverlayEl ? !matchmakingOverlayEl.hidden : false
    }),
    chooseDeploymentArenaForTest: arenaId => ({ ok: chooseDeploymentArena(arenaId), state: window.__strikeDebug.deploymentForTest() }),
    confirmDeploymentForTest: () => ({ ok: confirmDeploymentSelection(), matchmaking: window.__strikeDebug.matchmaking() }),
    financeAnalyticsForTest: () => ({
      route: menuTab,
      credits: Math.round(Number(careerState.credits) || 0),
      goldCoins: Math.max(0, Math.round(Number(careerState.goldCoins) || 0)),
      analytics: typeof teamFinanceAnalyticsSnapshot === 'function' ? (() => { const value = teamFinanceAnalyticsSnapshot(); return { income: value.income, outgoings: value.outgoings, net: value.net, weeks: value.weeks.map(item => ({ ...item })), categories: value.categories.map(item => ({ ...item })), historyCount: value.history.length, balancePoints: value.balancePoints.map(item => ({ ...item })) }; })() : null,
      financePanels: menuContentEl?.querySelectorAll('.finance-chart-panel').length || 0,
      directoryGroups: menuContentEl?.querySelectorAll('.command-directory-group').length || 0
    }),
    commandIndexForTest: () => {
      const allRoutes = Object.values(menuSections || {}).flatMap(section => section.routes || []);
      const discoverableRoutes = allRoutes.filter(route => !route.contextOnly).map(route => route.id);
      const contextRoutes = allRoutes.filter(route => route.contextOnly).map(route => route.id);
      const visibleButtons = Array.from(menuContentEl?.querySelectorAll('.command-directory-group [data-team-route]') || []);
      return {
        sectionCount: Object.keys(menuSections || {}).length,
        authoritativeRouteCount: allRoutes.length,
        authoritativeRoutes: allRoutes.map(route => route.id),
        discoverableRouteCount: discoverableRoutes.length,
        discoverableRoutes,
        contextRoutes,
        groupCount: menuContentEl?.querySelectorAll('.command-directory-group')?.length || 0,
        visibleRouteCount: visibleButtons.length,
        visibleRoutes: visibleButtons.map(button => button.dataset.teamRoute || ''),
        search: typeof applyCommandIndexFilter === 'function' ? applyCommandIndexFilter(commandIndexSearchQuery) : null,
        recommended: typeof commandRecommendedRoutes === 'function' ? commandRecommendedRoutes().map(item => ({ ...item })) : [],
        recent: typeof menuRecentRouteIds === 'function' ? menuRecentRouteIds(5) : []
      };
    },
    commandIndexSearchForTest: query => {
      if (menuTab !== 'play') setMenuRoute('play');
      const input = menuContentEl?.querySelector('[data-command-search]');
      if (input) input.value = String(query || '');
      return typeof applyCommandIndexFilter === 'function' ? applyCommandIndexFilter(query) : null;
    },
    navigationDiscoverabilityForTest: () => ({
      route: menuTab,
      section: menuSectionForRoute(),
      sectionDefaults: Object.fromEntries(Object.entries(menuSections || {}).map(([id, section]) => [id, section.defaultRoute])),
      overviewRoutes: Object.values(menuSections || {}).flatMap(section => section.routes || []).filter(route => route.overview).map(route => route.id),
      contextRoutes: Object.values(menuSections || {}).flatMap(section => section.routes || []).filter(route => route.contextOnly).map(route => route.id),
      subnavRoutes: Array.from(menuSubnavEl?.querySelectorAll('[data-menu-route]') || []).map(button => button.dataset.menuRoute),
      primaryBadges: Array.from(document.querySelectorAll('.menu-tab')).map(button => ({ section: button.dataset.section, badge: button.querySelector('.menu-tab-badge')?.textContent || '', hidden: Boolean(button.querySelector('.menu-tab-badge')?.hidden) })),
      locatorRemoved: !menuRouteLocatorEl || menuRouteLocatorEl.hidden || !menuRouteLocatorEl.textContent?.trim(),
      recent: typeof menuRecentRouteIds === 'function' ? menuRecentRouteIds(5) : []
    }),
    mobileNavigationForTest: (action = 'snapshot', value = '') => {
      const command = String(action || 'snapshot');
      if (command === 'open') openMobileNavigation(String(value || menuSectionForRoute()));
      else if (command === 'close') closeMobileNavigation({ restoreFocus: false });
      else if (command === 'section') selectMobileNavigationSection(String(value || menuSectionForRoute()));
      else if (command === 'search') {
        if (mobileNavigationSearchEl) mobileNavigationSearchEl.value = String(value || '');
        updateMobileNavigationSearch(value);
      }
      const sectionButtons = Array.from(mobileNavigationSectionsEl?.querySelectorAll('[data-mobile-nav-section]') || []);
      const routeButtons = Array.from(mobileNavigationRoutesEl?.querySelectorAll('[data-mobile-nav-route]') || []);
      return {
        enabled: mobileNavigationEnabled(),
        open: mobileNavigationIsOpen(),
        activeRoute: menuTab,
        activeSection: menuSectionForRoute(),
        browsedSection: mobileNavigationSectionId,
        query: mobileNavigationQuery,
        persistentSections: menuTabs.map(button => button.dataset.section || ''),
        drawerSections: sectionButtons.map(button => button.dataset.mobileNavSection || ''),
        drawerRoutes: routeButtons.map(button => ({ route: button.dataset.mobileNavRoute || '', disabled: Boolean(button.disabled), active: button.classList.contains('active') })),
        legacySubnavVisible: Boolean(menuSubnavShellEl && getComputedStyle(menuSubnavShellEl).display !== 'none'),
        commandIndexVisible: Boolean(menuContentEl?.querySelector('.command-directory-panel') && getComputedStyle(menuContentEl.querySelector('.command-directory-panel')).display !== 'none'),
        routeBarVisible: Boolean(mobileCommandRouteBarEl && getComputedStyle(mobileCommandRouteBarEl).display !== 'none')
      };
    },
    addFinanceTransactionForTest: (type = 'TEST', amount = 1000, label = 'Test transaction') => {
      const delta = Math.round(Number(amount) || 0);
      careerState.credits += delta;
      teamFinanceTransaction(String(type || 'TEST'), delta, String(label || 'Test transaction'));
      saveCareerState();
      updateMenuUI();
      return window.__strikeDebug.financeAnalyticsForTest();
    },
    careerSaveHealthForTest: () => (typeof careerSaveHealth === 'function' ? careerSaveHealth() : null),
    // Build 12.134: walks every management route and reports concrete compact
    // presentation defects — content wider than its container, unreadable type
    // and undersized touch targets. Run with the viewport already at the width
    // under test; the audit only measures what is actually laid out.
    mobileInterfaceAuditForTest: (options = {}) => {
      const minFont = Number(options.minFont) || 11;
      const minTouch = Number(options.minTouch) || 40;
      const routes = Array.isArray(options.routes) && options.routes.length ? options.routes : [
        'play', 'league', 'calendar', 'mail', 'telemetry', 'reports',
        'operators', 'tactics', 'market', 'transfers', 'honours', 'profile',
        'loadout', 'store', 'training', 'infrastructure', 'staff',
        'barracks', 'gold', 'commercial', 'supporters', 'settings'
      ];
      if (!careerState.created || !careerSquadReady()) window.__strikeDebug.seedFirstMatchCalendarForTest();
      const previousRoute = menuTab;
      const results = [];
      const describe = node => {
        const cls = String(node.className || '').split(/\s+/).filter(Boolean).slice(0, 2).join('.');
        return `${node.tagName.toLowerCase()}${cls ? '.' + cls : ''}`;
      };
      // Short ancestor path so a reported defect can be turned into a selector
      // without re-rendering the route by hand.
      const ancestry = node => {
        const parts = [];
        let current = node;
        for (let depth = 0; depth < 4 && current && current !== menuContentEl; depth++) {
          const cls = String(current.className || '').split(/\s+/).filter(Boolean)[0];
          parts.unshift(`${current.tagName.toLowerCase()}${cls ? '.' + cls : ''}`);
          current = current.parentElement;
        }
        return parts.join('>');
      };
      for (const route of routes) {
        let overflowing = [];
        let tinyText = [];
        let smallTargets = [];
        try {
          setMenuRoute(route, { skipDraftGuard: true });
        } catch (error) {
          results.push({ route, error: String(error?.message || error) });
          continue;
        }
        const host = menuContentEl;
        if (!host) continue;
        const hostRect = host.getBoundingClientRect();
        const seenOverflow = new Set();
        for (const node of host.querySelectorAll('*')) {
          const style = getComputedStyle(node);
          if (style.display === 'none' || style.visibility === 'hidden' || !node.getClientRects().length) continue;
          const rect = node.getBoundingClientRect();

          // Content escaping the scroll container horizontally. Anything inside
          // a deliberate horizontal scroller (the recruitment carousel, wide
          // tables) is out of bounds by design, so measure against that
          // scroller instead of the page.
          let scroller = node.parentElement;
          let inHorizontalScroller = false;
          while (scroller && scroller !== host) {
            const overflowX = getComputedStyle(scroller).overflowX;
            if (overflowX === 'auto' || overflowX === 'scroll') { inHorizontalScroller = true; break; }
            scroller = scroller.parentElement;
          }
          const bounds = inHorizontalScroller ? scroller.getBoundingClientRect() : hostRect;
          const tolerance = inHorizontalScroller ? Number.POSITIVE_INFINITY : 1.5;
          if (rect.width > 0 && (rect.right - bounds.right > tolerance || bounds.left - rect.left > tolerance)) {
            const key = describe(node);
            if (!seenOverflow.has(key)) { seenOverflow.add(key); overflowing.push({ node: key, overshoot: Math.round(Math.max(rect.right - bounds.right, bounds.left - rect.left)) }); }
          }

          // Unreadable copy: only leaf nodes that actually render text.
          const text = node.children.length === 0 ? String(node.textContent || '').trim() : '';
          if (text.length > 1) {
            const size = parseFloat(style.fontSize) || 0;
            if (size > 0 && size < minFont) tinyText.push({ node: describe(node), path: ancestry(node), size: Number(size.toFixed(1)), sample: text.slice(0, 28) });
          }

          // Interactive controls below a usable touch target.
          if (['BUTTON', 'SELECT', 'A', 'INPUT'].includes(node.tagName) && !node.disabled) {
            if (rect.height > 0 && rect.height < minTouch) smallTargets.push({ node: describe(node), height: Math.round(rect.height) });
          }
        }
        // Build 12.135: collapsed containers. A direct child of the grid scroll
        // container that clips almost all of its own content is the "card did
        // not load" failure: the panel renders as an empty box. Grid items with
        // a non-visible overflow get an automatic minimum size of 0, so a row
        // can be squashed to padding height while the content still exists.
        const collapsed = [];
        for (const node of host.children) {
          const style = getComputedStyle(node);
          if (style.display === 'none' || !node.getClientRects().length) continue;
          if (style.overflowY === 'visible') continue;
          // A closed <details> is meant to hide its content.
          if (node.tagName === 'DETAILS' && !node.open) continue;
          if (node.scrollHeight > node.clientHeight + 24 && node.clientHeight < node.scrollHeight * 0.5) {
            collapsed.push({ node: describe(node), clientHeight: node.clientHeight, scrollHeight: node.scrollHeight });
          }
        }

        // Build 12.136: overlapping panels. Two adjacent children of the scroll
        // container must never intersect. This is the mirror of the collapsed
        // check: an undersized grid row either clips its panel (when overflow
        // is hidden) or lets it print over the next one. Both are failures.
        const overlapping = [];
        const laidOut = [...host.children].filter(node => node.getClientRects().length && getComputedStyle(node).display !== 'none');
        for (let index = 0; index < laidOut.length - 1; index++) {
          const current = laidOut[index].getBoundingClientRect();
          const next = laidOut[index + 1].getBoundingClientRect();
          const intersection = Math.round(current.bottom - next.top);
          if (intersection > 2) {
            overlapping.push({ node: describe(laidOut[index]), over: describe(laidOut[index + 1]), overlapPx: intersection });
          }
        }

        const dedupe = (list, key) => {
          const seen = new Map();
          for (const item of list) if (!seen.has(item[key])) seen.set(item[key], item);
          return [...seen.values()];
        };
        tinyText = dedupe(tinyText, 'path');
        smallTargets = dedupe(smallTargets, 'node');
        results.push({
          route,
          overlapCount: overlapping.length, overlapping: overlapping.slice(0, 6),
          collapsedCount: collapsed.length, collapsed: collapsed.slice(0, 6),
          overflowCount: overflowing.length, overflow: overflowing.slice(0, 6),
          tinyTextCount: tinyText.length, tinyText: tinyText.slice(0, 14),
          smallTargetCount: smallTargets.length, smallTargets: smallTargets.slice(0, 6)
        });
      }
      setMenuRoute(previousRoute, { skipDraftGuard: true });
      const totals = results.reduce((acc, item) => {
        acc.overlapping += item.overlapCount || 0;
        acc.collapsed += item.collapsedCount || 0;
        acc.overflow += item.overflowCount || 0;
        acc.tinyText += item.tinyTextCount || 0;
        acc.smallTargets += item.smallTargetCount || 0;
        return acc;
      }, { overlapping: 0, collapsed: 0, overflow: 0, tinyText: 0, smallTargets: 0 });
      return {
        width: window.innerWidth, minFont, minTouch, totals,
        worst: results.slice().sort((a, b) => (b.overflowCount + b.tinyTextCount) - (a.overflowCount + a.tinyTextCount)).slice(0, 8),
        results
      };
    },
    // Build 12.134: proves a stale second session cannot overwrite a newer save.
    staleSaveGuardForTest: () => {
      const before = careerSaveHealth();
      const meta = JSON.parse(localStorage.getItem('strikewatchCareerSaveMetaV1') || '{}');
      // Simulate another tab having saved after this session loaded.
      localStorage.setItem('strikewatchCareerSaveMetaV1', JSON.stringify({ ...meta, saveSequence: (Number(meta.saveSequence) || 0) + 5 }));
      const guardedWrite = saveCareerState({ reason: 'stale guard test' });
      const duringGuard = careerSaveHealth();
      const forcedWrite = saveCareerState({ force: true, reason: 'stale guard test recovery' });
      const after = careerSaveHealth();
      return { before, guardedWrite, duringGuard, forcedWrite, after };
    },
    // Build 12.158: reproduces a mature save that fits as the primary but not
    // as primary plus a second full recovery copy. The transaction must retain
    // the 18 GC / three-point result and report only a limited backup.
    storagePressureSaveForTest: () => {
      const oldCareer = {
        created: true,
        goldCoins: 0,
        calendar: { absoluteDay: 0 },
        league: { table: [{ id: LEAGUE_USER_CLUB_ID, points: 0 }], fixtures: [] },
        matureHistory: 'x'.repeat(180000)
      };
      const nextCareer = {
        ...oldCareer,
        goldCoins: 18,
        calendar: { absoluteDay: 2 },
        league: { table: [{ id: LEAGUE_USER_CLUB_ID, points: 3 }], fixtures: [{ id: 'PRESSURE-MATCH', played: true }] }
      };
      const oldSerialised = JSON.stringify(oldCareer);
      const nextSerialised = JSON.stringify(nextCareer);
      const values = new Map([[CAREER_STORAGE_KEY, oldSerialised]]);
      const quota = Math.max(oldSerialised.length, nextSerialised.length) + 256;
      const storage = {
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        removeItem(key) { values.delete(key); },
        setItem(key, value) {
          const next = new Map(values);
          next.set(key, String(value));
          const used = [...next.values()].reduce((sum, item) => sum + item.length, 0);
          if (used > quota) throw new DOMException('Simulated storage quota reached.', 'QuotaExceededError');
          values.clear();
          for (const [entryKey, entryValue] of next) values.set(entryKey, entryValue);
        }
      };
      const commit = careerCommitPrimaryAndBackup(storage, {
        serialised: nextSerialised,
        existing: oldSerialised,
        refreshBackup: true,
        allowBackupEviction: true
      });
      const persisted = JSON.parse(storage.getItem(CAREER_STORAGE_KEY) || 'null');
      const result = {
        persistedGoldCoins: Number(persisted?.goldCoins) || 0,
        persistedDay: Number(persisted?.calendar?.absoluteDay) || 0,
        persistedLeaguePoints: Number(persisted?.league?.table?.[0]?.points) || 0,
        fixturePlayed: Boolean(persisted?.league?.fixtures?.[0]?.played),
        backupStatus: commit.backupStatus,
        primaryBytes: nextSerialised.length,
        quota
      };
      result.ok = result.persistedGoldCoins === 18
        && result.persistedDay === 2
        && result.persistedLeaguePoints === 3
        && result.fixturePlayed
        && (result.backupStatus === 'skipped' || result.backupStatus === 'retained-older');
      return result;
    },
    currencyLedgerForTest: () => ({
      credits: Math.round(Number(careerState.credits) || 0),
      goldCoins: Math.max(0, Math.round(Number(careerState.goldCoins) || 0)),
      financeHistory: (careerState.financeHistory || []).map(item => ({ ...item })),
      goldCoinHistory: (careerState.goldCoinHistory || []).map(item => ({ ...item }))
    }),
    goldCoinEconomyForTest: () => ({
      balance: Math.max(0, Math.round(Number(careerState.goldCoins) || 0)),
      credits: Math.round(Number(careerState.credits) || 0),
      cratePrice: CAREER_GOLD_COIN_CRATE_PRICE,
      pending: careerState.pendingStoreCrate ? { ...careerState.pendingStoreCrate, reward: { ...careerState.pendingStoreCrate.reward } } : null,
      purchases: Math.max(0, Math.round(Number(careerState.storeCratesPurchased) || 0)),
      cratesOpened: Math.max(0, Math.round(Number(careerState.cratesOpened) || 0)),
      route: menuTab,
      overlayHidden: Boolean(careerCrateOverlayEl?.hidden),
      cratePhase: careerCrateState.phase,
      history: (careerState.goldCoinHistory || []).slice(0, 6).map(item => ({ ...item }))
    }),
    goldCoinRewardForTest: (won = true, mode = 'league', blue = 3, red = 1) => careerGoldCoinRewardBreakdown(Boolean(won), mode === 'exhibition' ? 'exhibition' : 'league', Number(blue), Number(red)),
    // Build 12.134: runs the real end-of-match settlement and reports the live
    // balance against what a fresh load would read at each stage, so a reward
    // that is granted but not durably stored is visible.
    goldCoinMatchPersistenceForTest: (startingBalance = 40) => {
      if (!careerState.created || !careerSquadReady()) window.__strikeDebug.seedFirstMatchCalendarForTest();
      const snapshot = JSON.parse(JSON.stringify(careerState));
      const statsSnapshot = careerMatchStats;
      const stateSnapshot = appState;
      try {
        careerState.goldCoins = Math.max(0, Math.round(Number(startingBalance) || 0));
        saveCareerState({ createBackup: false, reason: 'gold persistence test baseline' });
        const before = { live: careerState.goldCoins, persisted: loadCareerState().goldCoins };

        careerMatchStats = makeCareerMatchStats();
        Object.assign(careerMatchStats, {
          roundsPlayed: 3, kills: 6, deaths: 2, shotsFired: 24, shotsHit: 12,
          damageDealt: 420, damageTaken: 180, survivalTime: 150, reloads: 4, finalSurvived: true
        });
        blueScore = 3; redScore = 0;
        completeCareerMatch(TEAM_BLUE);
        const award = careerState.lastRound?.goldCoinReward || null;
        const afterSettlement = { live: careerState.goldCoins, persisted: loadCareerState().goldCoins };

        // The report and crate overlay both run before the manager returns to
        // Command HQ, so re-check once the flow has been driven forward.
        if (careerCrateState.phase === 'queued') careerCrateState.phase = 'idle';
        updateMenuUI();
        const afterReport = { live: careerState.goldCoins, persisted: loadCareerState().goldCoins };

        return {
          ok: true, before, award: award ? { amount: award.amount, mode: award.mode, label: award.label } : null,
          afterSettlement, afterReport,
          expected: before.live + (award?.amount || 0),
          liveCorrect: careerState.goldCoins === before.live + (award?.amount || 0),
          persistedMatchesLive: afterReport.persisted === afterReport.live,
          historyTop: (careerState.goldCoinHistory || []).slice(0, 2).map(item => ({ amount: item.amount, label: item.label }))
        };
      } finally {
        careerMatchStats = statsSnapshot;
        careerState = normaliseCareerState(snapshot);
        appState = stateSnapshot;
        saveCareerState({ createBackup: false, reason: 'gold persistence test restore' });
      }
    },
    // Build 12.134: the Gold Coin balance must always equal the sum of its own
    // ledger. Runs real match settlements interleaved with day advances and
    // reports the first point where the balance and the ledger disagree.
    goldCoinLedgerIntegrityForTest: (matches = 6, daysBetween = 3) => {
      if (!careerState.created || !careerSquadReady()) window.__strikeDebug.seedFirstMatchCalendarForTest();
      const statsSnapshot = careerMatchStats;
      const stateSnapshot = appState;
      careerState.goldCoins = 0;
      careerState.goldCoinHistory = [];
      const steps = [];
      const ledgerSum = () => (careerState.goldCoinHistory || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      try {
        for (let match = 0; match < Math.max(1, Math.round(Number(matches) || 0)); match++) {
          careerMatchStats = makeCareerMatchStats();
          Object.assign(careerMatchStats, {
            roundsPlayed: 3, kills: 5, deaths: 2, shotsFired: 20, shotsHit: 10,
            damageDealt: 380, damageTaken: 200, survivalTime: 140, reloads: 3,
            finalSurvived: match % 2 === 0
          });
          const won = match % 3 !== 2;
          blueScore = won ? 3 : 1;
          redScore = won ? 1 : 3;
          completeCareerMatch(won ? TEAM_BLUE : TEAM_RED);
          if (careerCrateState.phase === 'queued') careerCrateState.phase = 'idle';
          steps.push({ stage: `match-${match + 1}`, balance: careerState.goldCoins, ledger: ledgerSum(), persisted: loadCareerState().goldCoins });
          for (let day = 0; day < Math.max(0, Math.round(Number(daysBetween) || 0)); day++) {
            if (typeof advanceCareerDay === 'function') advanceCareerDay();
          }
          steps.push({ stage: `days-after-${match + 1}`, balance: careerState.goldCoins, ledger: ledgerSum(), persisted: loadCareerState().goldCoins });
        }
      } finally {
        careerMatchStats = statsSnapshot;
        appState = stateSnapshot;
      }
      const mismatches = steps.filter(step => step.balance !== step.ledger || step.persisted !== step.balance);
      return {
        finalBalance: careerState.goldCoins,
        finalLedger: ledgerSum(),
        steps,
        mismatchCount: mismatches.length,
        firstMismatch: mismatches[0] || null
      };
    },
    setGoldCoinsForTest: amount => {
      careerState.goldCoins = Math.max(0, Math.round(Number(amount) || 0));
      careerState.pendingStoreCrate = null;
      saveCareerState();
      updateMenuUI();
      return window.__strikeDebug.goldCoinEconomyForTest();
    },
    addGoldCoinTransactionForTest: (amount = 5, label = 'Test Gold Coin activity', detail = {}) => {
      const delta = Math.round(Number(amount) || 0);
      careerState.goldCoins = Math.max(0, Math.round(Number(careerState.goldCoins) || 0) + delta);
      careerGoldCoinTransaction(delta, String(label || 'Test Gold Coin activity'), detail && typeof detail === 'object' ? { ...detail } : {});
      saveCareerState();
      updateMenuUI();
      return window.__strikeDebug.goldCoinEconomyForTest();
    },
    purchaseStoreCrateForTest: () => ({ result: purchaseCareerCrateWithGoldCoins(), state: window.__strikeDebug.goldCoinEconomyForTest(), crate: { phase: careerCrateState.phase, source: careerCrateState.source, returnRoute: careerCrateState.returnRoute } }),
    purchaseCashWeaponForTest: (weaponId = 'viper-9', ensureFunds = true) => {
      const offer = typeof cashStoreWeaponOffer === 'function' ? cashStoreWeaponOffer(String(weaponId || 'viper-9')) : null;
      if (ensureFunds) careerState.created = true;
      if (ensureFunds && offer) careerState.credits = Math.max(Math.round(Number(careerState.credits) || 0), Number(offer.price) || 0);
      const before = { credits: Math.round(Number(careerState.credits) || 0), owned: typeof careerWeaponOwnedCount === 'function' ? careerWeaponOwnedCount(String(weaponId || 'viper-9')) : 0 };
      const result = typeof purchaseCareerCashWeapon === 'function' ? purchaseCareerCashWeapon(String(weaponId || 'viper-9')) : { ok: false, reason: 'Cash weapon store unavailable.' };
      return { before, result, after: { credits: Math.round(Number(careerState.credits) || 0), owned: typeof careerWeaponOwnedCount === 'function' ? careerWeaponOwnedCount(String(weaponId || 'viper-9')) : 0 } };
    },
    cashWeaponStoreForTest: () => {
      const offers = (typeof CAREER_CASH_WEAPON_STORE !== 'undefined' ? CAREER_CASH_WEAPON_STORE : []).map(offer => {
        const weapon = typeof getCareerWeapon === 'function' ? getCareerWeapon(offer.id) : null;
        return {
          id: offer.id,
          price: Number(offer.price) || 0,
          slotType: weapon?.slotType || null,
          modelClass: weapon?.modelClass || null,
          partCount: weapon && typeof careerWeaponVisualParts === 'function' ? careerWeaponVisualParts(weapon).length : 0
        };
      });
      const html = typeof renderAmmunitionStoreTab === 'function' ? renderAmmunitionStoreTab() : '';
      const requiredIds = ['ar4-sentinel', 'viper-9'];
      const requiredVisible = requiredIds.every(id => offers.some(offer => offer.id === id) && html.includes(`data-store-weapon-id="${id}"`) && html.includes(`data-store-weapon-preview="${id}"`));
      const sharedModels = offers.every(offer => offer.partCount > 0 && html.includes(`career-weapon-mini3d ${offer.modelClass} store`));
      const purchaseButtons = offers.every(offer => html.includes(`data-store-buy-weapon="${offer.id}"`));
      const copyCounters = offers.every(offer => html.includes(`data-store-owned-count=`) && html.includes(`OWNED COPIES`));
      const feedbackSlots = requiredIds.every(id => html.includes(`data-store-purchase-feedback="weapon:${id}"`));
      return { ok: requiredVisible && sharedModels && purchaseButtons && copyCounters && feedbackSlots, requiredVisible, sharedModels, purchaseButtons, copyCounters, feedbackSlots, offers };
    },
    cashWeaponPurchaseFeedbackForTest: () => {
      const careerSnapshot = JSON.parse(JSON.stringify(careerState));
      const selectedSnapshot = selectedTeamPlayerId;
      const routeSnapshot = menuTab;
      const contextSnapshot = menuContext;
      const appStateSnapshot = appState;
      try {
        if (typeof resetCashStorePurchaseFeedback === 'function') resetCashStorePurchaseFeedback();
        if (!careerState.created) window.__strikeDebug.seedReadabilityCareerForTest(5);
        careerState.created = true;
        careerState.credits = 200000;
        careerState.inventory = (Array.isArray(careerState.inventory) ? careerState.inventory : []).filter(id => id !== 'ar4-sentinel');
        menuContext = 'main';
        menuTab = 'store';
        setAppState('menu');
        saveCareerState({ createBackup: false, reason: 'debug store purchase feedback' });
        updateMenuUI();
        const beforeCredits = Math.round(Number(careerState.credits) || 0);
        const beforeOwned = careerWeaponOwnedCount('ar4-sentinel');
        const beforeButton = menuContentEl?.querySelector('[data-store-buy-weapon="ar4-sentinel"]') || null;
        beforeButton?.click();
        const afterCredits = Math.round(Number(careerState.credits) || 0);
        const afterOwned = careerWeaponOwnedCount('ar4-sentinel');
        const afterCard = menuContentEl?.querySelector('[data-store-weapon-id="ar4-sentinel"]') || null;
        const afterButton = afterCard?.querySelector('[data-store-buy-weapon="ar4-sentinel"]') || null;
        const receipt = afterCard?.querySelector('[data-store-purchase-feedback="weapon:ar4-sentinel"]') || null;
        const meta = afterCard?.querySelector('.cash-weapon-meta small')?.textContent || '';
        const buttonText = afterButton?.textContent || '';
        const receiptText = receipt?.textContent || '';
        const guardedCreditsBefore = Math.round(Number(careerState.credits) || 0);
        const guardedOwnedBefore = careerWeaponOwnedCount('ar4-sentinel');
        afterButton?.click();
        const guarded = guardedCreditsBefore === Math.round(Number(careerState.credits) || 0) && guardedOwnedBefore === careerWeaponOwnedCount('ar4-sentinel');
        const chargedOnce = beforeCredits - afterCredits === 58000;
        const copyAdded = afterOwned === beforeOwned + 1;
        const countRefreshed = afterCard?.dataset.storeOwnedCount === String(afterOwned) && meta.includes(`OWNED COPIES ${afterOwned}`);
        const receiptVisible = Boolean(receipt && !receipt.hidden && receiptText.includes('ADDED TO CLUB ARMOURY') && receiptText.includes(`${afterOwned} COPY`));
        const lockedFeedback = Boolean(afterButton?.disabled && buttonText.includes('PURCHASED') && buttonText.includes(`OWNED ${afterOwned}`));
        return { ok: chargedOnce && copyAdded && countRefreshed && receiptVisible && lockedFeedback && guarded, chargedOnce, copyAdded, countRefreshed, receiptVisible, lockedFeedback, guarded, beforeCredits, afterCredits, beforeOwned, afterOwned, meta, buttonText, receiptText };
      } finally {
        if (typeof resetCashStorePurchaseFeedback === 'function') resetCashStorePurchaseFeedback();
        careerState = careerSnapshot;
        selectedTeamPlayerId = selectedSnapshot;
        menuTab = routeSnapshot;
        menuContext = contextSnapshot;
        appState = appStateSnapshot;
        saveCareerState({ createBackup: false, reason: 'restore after debug store purchase feedback' });
        updateMenuUI();
      }
    },
    claimStoreCrateForTest: () => {
      const before = window.__strikeDebug.goldCoinEconomyForTest();
      claimCareerCrate();
      return { before, after: window.__strikeDebug.goldCoinEconomyForTest() };
    },
    weaponPresentationForTest: weaponId => {
      const weapon = getCareerWeapon(weaponId);
      return {
        weapon: {
          id: weapon.id,
          name: weapon.name,
          damageMin: weapon.damageMin,
          damageMax: weapon.damageMax,
          fireRate: weapon.fireRate,
          range: weapon.range,
          magSize: weapon.magSize,
          reloadTime: weapon.reloadTime,
          viewmodelPose: weapon.viewmodelPose,
          muzzleProfile: weapon.muzzleProfile,
          reloadAudioProfile: careerWeaponReloadAudioProfile(weapon)
        },
        presentation: careerWeaponPresentation(weapon),
        parts: careerWeaponVisualParts(weapon).length
      };
    },
    completeTutorialForTest: () => {
      careerState.tutorial = careerState.tutorial && typeof careerState.tutorial === 'object' ? careerState.tutorial : makeDefaultCareerTutorialState();
      careerState.tutorial.completed = true;
      careerState.tutorial.dismissed = false;
      saveCareerState();
      updateMenuUI();
      return window.__strikeDebug.teamManagement();
    },
    contextTutorialsForTest: () => ({
      available: Object.keys(MENU_CONTEXT_TUTORIALS),
      seen: { ...(careerState.tutorial?.contextSeen || {}) },
      visibleRoute: menuContentEl?.querySelector('[data-context-tutorial]')?.dataset.contextTutorial || null
    }),
    dismissContextTutorialForTest: route => ({ ok: dismissMenuContextTutorial(String(route || '')), state: window.__strikeDebug.contextTutorialsForTest() }),
    setTeamRoute: route => {
      setMenuRoute(String(route || 'play'));
      return { route: menuTab, title: menuHeaderTitleEl?.textContent || '' };
    },
    selectTeamPlayer: id => {
      selectedTeamPlayerId = String(id || '');
      careerState.selectedPlayerId = selectedTeamPlayerId;
      careerState.tutorial.profileViewed = true;
      setMenuRoute('profile');
      return teamPlayerById(selectedTeamPlayerId)?.name || null;
    },
    recruitCheapest: (count = 1) => {
      const wanted = clamp(Math.floor(Number(count) || 1), 1, TEAM_MAX_SQUAD);
      const results = [];
      for (let i = 0; i < wanted; i++) {
        const affordable = (careerState.market || [])
          .filter(player => careerState.credits >= player.fee && teamSquadWageBill() + player.wage <= careerState.wageBudget)
          .sort((a, b) => a.fee - b.fee || a.wage - b.wage)[0];
        if (!affordable) break;
        const result = recruitTeamPlayer(affordable.id);
        results.push({ ok: result.ok, id: affordable.id, name: affordable.name, reason: result.reason || '' });
        if (!result.ok) break;
      }
      return { results, state: window.__strikeDebug.teamManagement() };
    },
    setPlayerWellbeingForTest: (id, fatigue = 0, happiness = 70) => {
      const player = teamPlayerById(String(id || ''));
      if (!player) return null;
      player.fatigue = clamp(Math.round(Number(fatigue) || 0), 0, 100);
      player.happiness = clamp(Math.round(Number(happiness) || 70), 1, 100);
      saveCareerState();
      return { id: player.id, fatigue: player.fatigue, happiness: player.happiness, readiness: teamReadinessScore(player) };
    },
    setPlayerTacticalProfileForTest: (id, updates = {}) => {
      const player = teamPlayerById(String(id || ''));
      if (!player || !updates || typeof updates !== 'object') return null;
      const stats = updates.stats && typeof updates.stats === 'object' ? updates.stats : updates;
      for (const key of ['marksmanship','handling','awareness','mobility','resilience','criticalChance','criticalDamage']) {
        if (Number.isFinite(Number(stats[key]))) player.stats[key] = clamp(Math.round(Number(stats[key])), 0, CAREER_MAX_STAT);
      }
      if (Number.isFinite(Number(updates.fatigue))) player.fatigue = clamp(Math.round(Number(updates.fatigue)), 0, 100);
      if (Number.isFinite(Number(updates.happiness))) player.happiness = clamp(Math.round(Number(updates.happiness)), 1, 100);
      if (Number.isFinite(Number(updates.morale))) player.morale = clamp(Math.round(Number(updates.morale)), 1, 100);
      if (Number.isFinite(Number(updates.form))) player.form = clamp(Number(updates.form), 1, 10);
      if (Number.isFinite(Number(updates.matchSharpness))) player.matchSharpness = clamp(Math.round(Number(updates.matchSharpness)), 1, 100);
      clubInvalidateMatchPlan('A player tactical profile changed.');
      saveCareerState();
      return {
        id: player.id,
        role: player.role,
        stats: { ...player.stats },
        readiness: teamReadinessScore(player),
        suitability: clubTacticalSuitabilityReport()
      };
    },
    assignMatchRoleForTest: (id, roleId = '') => {
      const player = teamPlayerById(String(id || ''));
      const role = TEAM_ROLES.find(item => item.id === String(roleId || '')) || null;
      if (!player || !role) return { ok: false, suitability: clubTacticalSuitabilityReport() };
      clubTacticsState().assignments[player.id] = role.id;
      clubInvalidateMatchPlan('A debug match role changed.');
      saveCareerState();
      return { ok: true, playerId: player.id, roleId: role.id, roleFit: tacticalPlayerRoleSuitability(player, role.id), suitability: clubTacticalSuitabilityReport() };
    },
    clearMatchRolesForTest: () => {
      clubTacticsState().assignments = {};
      clubInvalidateMatchPlan('Debug match roles reset.');
      saveCareerState();
      return { ok: true, suitability: clubTacticalSuitabilityReport() };
    },
    seedTeamPerformanceForTest: (slot = 0, metrics = {}) => {
      const safeSlot = clamp(Math.floor(Number(slot) || 0), 0, TEAM_REQUIRED_STARTERS - 1);
      const bot = bots.find(candidate => candidate.team === TEAM_BLUE && candidate.slot === safeSlot);
      if (!bot) return null;
      bot.kills = Math.max(0, Math.round(Number(metrics.kills) || bot.kills || 0));
      bot.deaths = Math.max(0, Math.round(Number(metrics.deaths) || bot.deaths || 0));
      bot.roundShotsFired = Math.max(0, Math.round(Number(metrics.shotsFired) || 0));
      bot.roundShotsHit = clamp(Math.round(Number(metrics.shotsHit) || 0), 0, bot.roundShotsFired);
      bot.roundCriticalHits = clamp(Math.round(Number(metrics.criticalHits) || 0), 0, bot.roundShotsHit);
      bot.roundHeadshots = clamp(Math.round(Number(metrics.headshots) || 0), 0, bot.roundShotsHit);
      bot.roundCriticalHeadshots = clamp(Math.round(Number(metrics.criticalHeadshots) || 0), 0, Math.min(bot.roundHeadshots, bot.roundCriticalHits));
      bot.roundDamageDealt = Math.max(0, Number(metrics.damageDealt) || 0);
      bot.roundDamageTaken = Math.max(0, Number(metrics.damageTaken) || 0);
      bot.roundSurvivalTime = Math.max(0, Number(metrics.survivalTime) || 0);
      bot.roundReloads = Math.max(0, Math.round(Number(metrics.reloads) || 0));
      if (metrics.alive === false) { bot.alive = false; bot.health = 0; }
      return { slot: safeSlot, name: bot.name, kills: bot.kills, deaths: bot.deaths, shotsFired: bot.roundShotsFired, shotsHit: bot.roundShotsHit, criticalHits: bot.roundCriticalHits, headshots: bot.roundHeadshots, criticalHeadshots: bot.roundCriticalHeadshots };
    },
    seedStartingFiveDebriefForTest: (won = true) => {
      if (!careerSquadReady()) return { ok: false, reason: 'Five starters are required.' };
      resetTeamMatchTracking();
      for (let slot = 0; slot < TEAM_REQUIRED_STARTERS; slot++) {
        const bot = bots.find(candidate => candidate.team === TEAM_BLUE && candidate.slot === slot);
        if (!bot) continue;
        bot.kills = slot + 1;
        bot.deaths = slot % 2;
        bot.roundShotsFired = 18 + slot * 2;
        bot.roundShotsHit = 8 + slot;
        bot.roundCriticalHits = slot % 3;
        bot.roundDamageDealt = 105 + slot * 24;
        bot.roundDamageTaken = 36 + slot * 11;
        bot.roundSurvivalTime = 38 + slot * 5;
        bot.roundReloads = 1 + (slot % 2);
        bot.roundSprintDistance = 9 + slot * 2;
        bot.roundSupportedTime = 22 + slot * 3;
        bot.roundIsolatedTime = 8 + slot;
        bot.roundRegroupActions = 1 + (slot % 2);
        bot.roundTradeAttempts = 1 + (slot % 3);
        bot.roundTradeKills = slot % 2;
        bot.roundRoleActions = 2 + slot;
        bot.roundRouteReplans = slot % 2;
        bot.alive = slot !== 4;
        bot.health = bot.alive ? 54 + slot * 5 : 0;
      }
      recordTeamMatchRound(won ? TEAM_BLUE : TEAM_RED);
      const summary = {
        roundsPlayed: 5,
        blueScore: won ? 3 : 1,
        redScore: won ? 1 : 3,
        blueTeamName: careerState.name,
        redTeamName: 'Northbridge Five',
        won: Boolean(won),
        score: won ? 78 : 46,
        grade: won ? 'B' : 'D',
        xpAward: won ? 180 : 90,
        kills: 15, deaths: 2, accuracy: .52, damageDealt: 765, damageTaken: 290, survived: Boolean(won)
      };
      const finance = settleTeamManagementAfterMatch(won ? TEAM_BLUE : TEAM_RED, summary);
      summary.finance = finance;
      careerState.lastRound = summary;
      saveCareerState();
      updateMenuUI();
      return { ok: Boolean(finance), finance, players: window.__strikeDebug.teamManagement().squad.map(player => ({ id: player.id, name: player.name, lastMatch: player.lastMatch })) };
    },
    matchmaking: () => ({
      active: matchmakingState.active,
      deploymentActive: deploymentSelectionState.active,
      selectedArenaId: deploymentSelectionState.selectedArenaId,
      elapsed: Math.round(matchmakingState.elapsed * 100) / 100,
      stage: matchmakingState.stage,
      serverCode: matchmakingState.serverCode,
      overlayVisible: matchmakingOverlayEl ? !matchmakingOverlayEl.hidden : false
    }),
    forceMatchmakingComplete: () => {
      if (!matchmakingState.active && !deploymentSelectionState.active) beginMatchmaking();
      if (deploymentSelectionState.active) confirmDeploymentSelection();
      matchmakingState.elapsed = MATCHMAKING_TOTAL_TIME;
      updateMatchmakingUI(true);
      completeMatchmaking();
      return { appState, active: matchmakingState.active, roundNumber };
    },
    audio: () => ({
      supported: Boolean(window.AudioContext || window.webkitAudioContext),
      enabled: audioEnabled,
      unlocked: audioUnlocked,
      state: audioContext ? audioContext.state : 'locked',
      queued: pendingAudioEvents.length,
      plays: combatDebug.audioPlays,
      failures: combatDebug.audioFailures,
      resumeAttempts: combatDebug.audioResumeAttempts,
      recoveries: combatDebug.audioRecoveries,
      stateChanges: combatDebug.audioStateChanges,
      lastHealthyMsAgo: audioLastHealthyAt ? Math.max(0, Math.round(performance.now() - audioLastHealthyAt)) : null,
      buffers: Object.keys(audioBuffers).sort(),
      reloadCues: combatDebug.reloadAudioCues,
      reloadCueCounts: { ...combatDebug.reloadAudioCueCounts },
      lastReloadAudioCue: combatDebug.lastReloadAudioCue,
      reloadCoverage: typeof validateCareerWeaponReloadAudioCoverage === 'function' ? validateCareerWeaponReloadAudioCoverage() : null
    }),
    suspendAudioForTest: async () => {
      if (!audioContext || audioContext.state === 'closed') return audioContext ? audioContext.state : 'locked';
      if (typeof audioContext.suspend === 'function') await audioContext.suspend();
      updateAudioButton();
      return audioContext.state;
    },
    recoverAudioForTest: async () => {
      const recovered = await ensureAudio(false);
      return { recovered, state: audioContext ? audioContext.state : 'locked', enabled: audioEnabled };
    },
    officeScreenAuditForTest: () => {
      setActiveArena('office');
      const checks = (LEVEL_DECOR_LAYOUT.wallScreens || []).map(screen => {
        let nearest = Infinity;
        let backingCell = null;
        for (let y = 0; y < MAP_H; y++) {
          for (let x = 0; x < MAP_W; x++) {
            if (MAP[y][x] !== '1') continue;
            const distance = Math.hypot(screen.x - (x + 0.5), screen.z - (y + 0.5));
            if (distance < nearest) { nearest = distance; backingCell = { x, y }; }
          }
        }
        return { label: screen.label || '', x: screen.x, z: screen.z, nearestWallDistance: Number(nearest.toFixed(3)), backingCell, backed: nearest <= 0.64 };
      });
      return { count: checks.length, checks, ok: checks.length >= 5 && checks.every(check => check.backed) };
    },
    environment: () => {
      if (!worldBatches.walls.length) buildWorldBatches();
      return ({
      floorPatches: worldBatches.floorPatches.length,
      laneStrips: worldBatches.laneStrips.length,
      wallKickPlates: worldBatches.wallKickPlates.length,
      grates: worldBatches.grates.length,
      wallPanels: worldBatches.wallPanels.length,
      warningLights: worldBatches.warningLights.length,
      officeCourtyards: worldBatches.officeCourtyards?.length || 0,
      officeRugs: worldBatches.officeRugs?.length || 0,
      officeGlassBands: worldBatches.officeGlassBands?.length || 0,
      desertCanopies: worldBatches.desertCanopies?.length || 0,
      desertArches: worldBatches.desertArches?.length || 0,
      desertBanners: worldBatches.desertBanners?.length || 0,
      desertMosaics: worldBatches.desertMosaics?.length || 0,
      desertRubble: worldBatches.desertRubble?.length || 0,
      desertTorches: worldBatches.desertTorches?.length || 0,
      desertCrenels: worldBatches.desertCrenels?.length || 0,
      desertBackdrop: worldBatches.desertBackdrop?.length || 0
      });
    },
    arenaPointAuditForTest: (arenaId = 'citadel', team = TEAM_BLUE, spawnIndex = 0, x = 0, y = 0) => {
      const id = arenaMeta(String(arenaId || 'citadel')).id;
      setActiveArena(id);
      const teamId = Number(team) === TEAM_RED ? TEAM_RED : TEAM_BLUE;
      const index = Math.max(0, Math.min(4, Number(spawnIndex) || 0));
      const spawn = (spawnPoints[teamId] || [])[index] || (spawnPoints[teamId] || [])[0] || null;
      const goal = { x: Number(x) || 0, y: Number(y) || 0 };
      const path = spawn ? findPath(spawn, goal) : null;
      return { arenaId: id, team: teamId, index, spawn, goal, clear: canStandForNavigation(goal.x, goal.y, BOT_RADIUS), reachable: Boolean(path?.length), nodes: path?.length || 0 };
    },
    engagementPlanAuditForTest: (arenaId = 'citadel') => {
      const id = arenaMeta(String(arenaId || 'citadel')).id;
      setActiveArena(id);
      const plans = engagementPlanOptions(id);
      const results = plans.map(plan => {
        const teams = [
          { team: TEAM_BLUE, objectives: plan.blue || [], spawns: spawnPoints[TEAM_BLUE] || [] },
          { team: TEAM_RED, objectives: plan.red || [], spawns: spawnPoints[TEAM_RED] || [] }
        ];
        const checks = teams.flatMap(entry => entry.objectives.map((goal, index) => {
          const spawn = entry.spawns[index] || entry.spawns[0];
          const path = spawn ? findPath(spawn, goal) : null;
          return {
            team: entry.team,
            index,
            goal: { x: goal.x, y: goal.y },
            clear: canStandForNavigation(goal.x, goal.y, BOT_RADIUS),
            reachable: Boolean(path?.length),
            nodes: path?.length || 0
          };
        }));
        return { id: plan.id, name: plan.name, checks, ok: checks.length === 10 && checks.every(check => check.clear && check.reachable) };
      });
      return { arenaId: id, plans: results, ok: results.length >= 5 && results.every(plan => plan.ok) };
    },
    doorInteractionForTest: (arenaId = 'office', doorId = '') => {
      const id = arenaMeta(String(arenaId || 'office')).id;
      setActiveArena(id);
      const state = ACTIVE_DOOR_STATES.find(door => door.id === String(doorId || '')) || ACTIVE_DOOR_STATES[0];
      if (!state) return null;
      const before = propLocalPoint(state, 0, -0.72);
      const after = propLocalPoint(state, 0, 0.72);
      state.openAmount = 0;
      state.targetOpen = 0;
      state.lastState = 'closed';
      const closedBlocked = segmentBlockedByLevelProp(before, after, 0.02, true);
      const navigationPasses = canTravelBetweenForNavigation(before.x, before.y, after.x, after.y, BOT_RADIUS);
      state.openAmount = 1;
      state.targetOpen = 1;
      state.lastState = 'open';
      const openBlocked = segmentBlockedByLevelProp(before, after, 0.02, true);
      const bot = bots.find(item => item.alive) || bots[0] || null;
      const originals = bots.map(item => ({ bot: item, x: item.x, y: item.y, alive: item.alive }));
      let autoOpened = false;
      let heldOpenForOccupant = false;
      let stayedOpenAfterClear = false;
      const soundCountBefore = Number(combatDebug.doorSoundEvents) || 0;
      let openEventsBefore = null;
      if (bot) {
        for (const item of bots) { item.alive = false; item.x = 1.5; item.y = 1.5; }
        bot.alive = true;
        const approach = propLocalPoint(state, 0, -1.0);
        bot.x = approach.x;
        bot.y = approach.y;
        state.openAmount = 0;
        state.targetOpen = 0;
        state.lastPresenceAt = -999;
        state.lastState = 'closed';
        state.openedPermanently = false;
        state.openingSoundPlayed = false;
        state.openingEventRecorded = false;
        openEventsBefore = Number(combatDebug.doorOpenEvents) || 0;
        updateDynamicDoors(0.02);
        updateDynamicDoors(0.02);
        updateDynamicDoors(0.30);
        autoOpened = state.openAmount >= 0.9;
        const threshold = propLocalPoint(state, 0, 0);
        bot.x = threshold.x;
        bot.y = threshold.y;
        state.openAmount = 0.48;
        state.targetOpen = 0;
        updateDynamicDoors(0.2);
        heldOpenForOccupant = state.targetOpen === 1 && state.openAmount > 0.48;
        bot.x = 1.5;
        bot.y = 1.5;
        state.openAmount = 1;
        state.targetOpen = 1;
        state.lastState = 'open';
        state.lastPresenceAt = simulationClock - 5;
        updateDynamicDoors(2.0);
        stayedOpenAfterClear = state.openAmount >= 0.92 && !segmentBlockedByLevelProp(before, after, 0.02, true);
      }
      for (const item of originals) Object.assign(item.bot, { x: item.x, y: item.y, alive: item.alive });
      return {
        arenaId: id,
        doorId: state.id,
        closedBlocked,
        navigationPasses,
        openBlocked,
        autoOpened,
        heldOpenForOccupant,
        stayedOpenAfterClear,
        soundTriggeredOnce: (Number(combatDebug.doorSoundEvents) || 0) - soundCountBefore === 1,
        openingEventTriggeredOnce: typeof openEventsBefore === 'number' ? (Number(combatDebug.doorOpenEvents) || 0) - openEventsBefore === 1 : false,
        state: doorStateSnapshot().find(door => door.id === state.id)
      };
    },
    doorPlacementAuditForTest: (arenaId = 'office') => {
      const id = arenaMeta(String(arenaId || 'office')).id;
      setActiveArena(id);
      const checks = ACTIVE_DOOR_STATES.map(state => {
        const x = Math.floor(state.x);
        const y = Math.floor(state.y);
        const horizontalOpening = Math.abs(Math.cos(state.yaw || 0)) >= 0.7;
        const openingCell = MAP[y]?.[x] || '1';
        const flankA = horizontalOpening ? MAP[y]?.[x - 1] : MAP[y - 1]?.[x];
        const flankB = horizontalOpening ? MAP[y]?.[x + 1] : MAP[y + 1]?.[x];
        return {
          id: state.id,
          openingCell,
          flankA,
          flankB,
          attachedToWalls: openingCell === '0' && flankA === '1' && flankB === '1'
        };
      });
      return { arenaId: id, count: checks.length, checks, ok: checks.length > 0 && checks.every(check => check.attachedToWalls) };
    },
    officeFurnitureClearanceAuditForTest: () => {
      setActiveArena('office');
      const machineProps = LEVEL_PROP_LAYOUT.machines || [];
      const desks = machineProps.filter(prop => prop.kind === 'desk');
      const staticColliders = LEVEL_PROP_COLLIDERS.filter(collider => !collider.dynamicDoor);
      const sampleColliderIntersection = (start, end, collider, padding = BOT_RADIUS + 0.055) => {
        const length = Math.hypot(end.x - start.x, end.y - start.y);
        const steps = Math.max(1, Math.ceil(length / 0.045));
        for (let index = 0; index <= steps; index++) {
          const t = index / steps;
          const x = lerp(start.x, end.x, t);
          const y = lerp(start.y, end.y, t);
          if (circleIntersectsLevelProp(x, y, padding, collider)) return true;
        }
        return false;
      };
      const colliderForProp = prop => staticColliders.find(collider => collider.kind === prop.kind && Math.abs(collider.x - prop.x) < 0.001 && Math.abs(collider.y - prop.y) < 0.001) || null;
      // The reworked floorplate circulates through two full-width corridors,
      // the two spawn halls, the open-office bay and the conference wing.
      const protectedRoutes = [
        { id: 'north-corridor-transit', start: { x: 11.5, y: 6.5 }, end: { x: 24.5, y: 6.5 }, requireDirect: true },
        { id: 'south-corridor-transit', start: { x: 11.5, y: 17.5 }, end: { x: 24.5, y: 17.5 }, requireDirect: true },
        { id: 'north-open-office-transit', start: { x: 10.5, y: 2.5 }, end: { x: 25.5, y: 2.5 }, requireDirect: true },
        { id: 'west-hall-transit', start: { x: 2.5, y: 2.5 }, end: { x: 2.5, y: 21.5 }, requireDirect: true },
        { id: 'east-hall-transit', start: { x: 33.5, y: 2.5 }, end: { x: 33.5, y: 21.5 }, requireDirect: true },
        { id: 'conference-transit', start: { x: 10.5, y: 21.5 }, end: { x: 25.5, y: 21.5 }, requireDirect: false }
      ];
      const rotationGeometry = typeof officeCourtyardRotationGeometry === 'function' ? officeCourtyardRotationGeometry() : [];
      for (const lane of rotationGeometry) {
        protectedRoutes.push({ id: `courtyard-${lane.id}`, start: { ...lane.west }, end: { ...lane.east }, requireDirect: false });
      }
      const doorApproaches = ACTIVE_DOOR_STATES.map(door => {
        const start = propLocalPoint(door, 0, -1.05);
        const end = propLocalPoint(door, 0, 1.05);
        const furnitureBlockers = staticColliders
          .filter(collider => collider.kind !== 'door-post')
          .filter(collider => sampleColliderIntersection(start, end, collider, BOT_RADIUS + 0.04))
          .map(collider => ({ kind: collider.kind, x: collider.x, y: collider.y }));
        const path = findPath(start, end);
        const directClear = canTravelBetweenForNavigation(start.x, start.y, end.x, end.y, BOT_RADIUS);
        return {
          id: door.id,
          start,
          end,
          startClear: canStandForNavigation(start.x, start.y, BOT_RADIUS),
          endClear: canStandForNavigation(end.x, end.y, BOT_RADIUS),
          directClear,
          reachable: Boolean(path?.length),
          pathNodes: path?.length || 0,
          furnitureBlockers,
          ok: Boolean(canStandForNavigation(start.x, start.y, BOT_RADIUS) && canStandForNavigation(end.x, end.y, BOT_RADIUS) && directClear && path?.length && furnitureBlockers.length === 0)
        };
      });
      const doorRoutes = doorApproaches.map(check => ({ id: `door-${check.id}`, start: check.start, end: check.end, requireDirect: true }));
      const allProtectedRoutes = protectedRoutes.concat(doorRoutes);
      const routeChecks = protectedRoutes.map(route => {
        const path = findPath(route.start, route.end);
        const directClear = canTravelBetweenForNavigation(route.start.x, route.start.y, route.end.x, route.end.y, BOT_RADIUS);
        return {
          id: route.id,
          start: route.start,
          end: route.end,
          requireDirect: route.requireDirect,
          directClear,
          reachable: Boolean(path?.length),
          pathNodes: path?.length || 0,
          ok: Boolean(path?.length && (!route.requireDirect || directClear))
        };
      });
      const deskChecks = desks.map((desk, index) => {
        const collider = colliderForProp(desk);
        const sideSamples = collider ? [
          propLocalPoint(collider, collider.halfWidth + BOT_RADIUS + 0.15, 0),
          propLocalPoint(collider, -collider.halfWidth - BOT_RADIUS - 0.15, 0),
          propLocalPoint(collider, 0, collider.halfDepth + BOT_RADIUS + 0.15),
          propLocalPoint(collider, 0, -collider.halfDepth - BOT_RADIUS - 0.15)
        ] : [];
        const clearSides = sideSamples.map((point, sideIndex) => ({ sideIndex, point, clear: canStandForNavigation(point.x, point.y, BOT_RADIUS) }));
        const routeIntrusions = collider ? allProtectedRoutes
          .filter(route => sampleColliderIntersection(route.start, route.end, collider))
          .map(route => route.id) : ['missing-collider'];
        return {
          id: `desk-${index + 1}`,
          x: desk.x,
          y: desk.y,
          yaw: desk.yaw || 0,
          width: desk.width,
          depth: desk.depth,
          colliderPresent: Boolean(collider),
          centreBlocked: Boolean(collider && circleIntersectsLevelProp(desk.x, desk.y, 0.02, collider)),
          clearSideCount: clearSides.filter(side => side.clear).length,
          clearSides,
          routeIntrusions,
          ok: Boolean(collider && circleIntersectsLevelProp(desk.x, desk.y, 0.02, collider) && clearSides.some(side => side.clear) && routeIntrusions.length === 0)
        };
      });
      const engagement = window.__strikeDebug.engagementPlanAuditForTest('office');
      const rotation = window.__strikeDebug.officeCourtyardRotationAuditForTest();
      const minimapPresentation = typeof tacticalMinimapPropPresentationSnapshot === 'function' ? tacticalMinimapPropPresentationSnapshot() : null;
      const minimapLegible = Boolean(
        minimapPresentation
        && minimapPresentation.officeFurniture?.opacity <= 0.20
        && minimapPresentation.officeFurniture?.stroke
        && minimapPresentation.dynamicDoor?.opacity >= 0.70
        && minimapPresentation.dynamicDoor.opacity > minimapPresentation.officeFurniture.opacity
      );
      return {
        arenaId: activeArenaId,
        deskCount: deskChecks.length,
        desks: deskChecks,
        doorCount: doorApproaches.length,
        doorApproaches,
        protectedRoutes: routeChecks,
        engagement,
        rotation,
        minimapPresentation,
        minimapLegible,
        ok: Boolean(
          deskChecks.length === 12
          && deskChecks.every(check => check.ok)
          && doorApproaches.length === 12
          && doorApproaches.every(check => check.ok)
          && routeChecks.every(check => check.ok)
          && engagement?.ok
          && rotation?.ok
          && minimapLegible
        )
      };
    },
    officeWalkwayAuditForTest: () => {
      const clearance = window.__strikeDebug.officeFurnitureClearanceAuditForTest();
      setActiveArena('office');
      const table = (LEVEL_PROP_LAYOUT.machines || []).find(prop => prop.kind === 'conference') || null;
      const start = { x: 11.5, y: 17.5 };
      const end = { x: 24.5, y: 17.5 };
      const path = findPath(start, end);
      const tableHalfDepth = table ? (Number(table.depth) || 1) * 0.5 : 0;
      const tableBlocksTransitBand = Boolean(table && Math.abs(Number(table.y) - 17.5) <= tableHalfDepth + BOT_RADIUS + 0.2);
      const directBlocked = segmentBlockedByLevelProp(start, end, BOT_RADIUS, false);
      const carpet = typeof officeCarpetPresentationSnapshot === 'function' ? officeCarpetPresentationSnapshot() : null;
      return {
        arenaId: activeArenaId,
        table: table ? { x: table.x, y: table.y, width: table.width, depth: table.depth } : null,
        tableBlocksTransitBand,
        directBlocked,
        reachable: Boolean(path?.length),
        pathNodes: path?.length || 0,
        carpet,
        clearance,
        ok: Boolean(table && !tableBlocksTransitBand && !directBlocked && path?.length && carpet?.roughness >= 0.95 && carpet?.rowBands === MAP_H && clearance?.ok)
      };
    },
    arenaGeometryIntegrityForTest: (arenaId = 'citadel') => {
      const previousArena = activeArenaId;
      let snapshot = null;
      try {
        setActiveArena(arenaMeta(String(arenaId || 'citadel')).id);
        buildWorldBatches();
        snapshot = typeof arenaGeometryPresentationSnapshot === 'function'
          ? arenaGeometryPresentationSnapshot()
          : { arenaId: activeArenaId, ok: false, reason: 'Presentation snapshot unavailable.' };
      } finally {
        setActiveArena(previousArena);
      }
      return snapshot;
    },
    allArenaGeometryIntegrityForTest: () => {
      const previousArena = activeArenaId;
      const arenas = {};
      try {
        for (const arenaId of ['citadel', 'office', 'dune', 'aurora']) {
          setActiveArena(arenaId);
          buildWorldBatches();
          arenas[arenaId] = typeof arenaGeometryPresentationSnapshot === 'function'
            ? arenaGeometryPresentationSnapshot()
            : { arenaId, ok: false, reason: 'Presentation snapshot unavailable.' };
        }
      } finally {
        setActiveArena(previousArena);
      }
      return { arenas, ok: Object.values(arenas).every(result => result?.ok) };
    },
    duneDeploymentPreviewForTest: () => {
      const canvas = document.createElement('canvas');
      canvas.style.width = '320px';
      canvas.style.height = '176px';
      canvas.width = 320;
      canvas.height = 176;
      document.body.appendChild(canvas);
      const rendered = typeof drawDeploymentArenaPreview === 'function' ? drawDeploymentArenaPreview(canvas, 'dune') : false;
      const result = {
        rendered: Boolean(rendered),
        width: canvas.width,
        height: canvas.height,
        dataLength: rendered ? canvas.toDataURL('image/png').length : 0,
        preview: arenaMeta('dune').preview || null
      };
      canvas.remove();
      return result;
    },
    summitDeploymentPreviewForTest: () => {
      const canvas = document.createElement('canvas');
      canvas.style.width = '320px';
      canvas.style.height = '176px';
      canvas.width = 320;
      canvas.height = 176;
      document.body.appendChild(canvas);
      const rendered = typeof drawDeploymentArenaPreview === 'function' ? drawDeploymentArenaPreview(canvas, 'summit') : false;
      const result = {
        rendered: Boolean(rendered),
        width: canvas.width,
        height: canvas.height,
        dataLength: rendered ? canvas.toDataURL('image/png').length : 0,
        preview: arenaMeta('summit').preview || null
      };
      canvas.remove();
      return result;
    },
    summitRoutingPreferenceForTest: () => {
      const previousArena = activeArenaId;
      const previousBots = bots;
      const previousRoundEnding = roundEnding;
      const previousMatchEnding = matchEnding;
      const previousFreeze = roundFreezeTimer;
      const previousRoundTime = roundTime;
      roundEnding = false;
      matchEnding = false;
      roundFreezeTimer = 0;
      roundTime = 90;
      setActiveArena('summit');
      const make = (role, range, x, y) => {
        const bot = new Bot(TEAM_BLUE, 0);
        bot.x = x;
        bot.y = y;
        bot.playerRole = role;
        bot.weapon = { ...(bot.weapon || {}), range };
        bot.openingPlanObjective = null;
        bot.openingPlanUntil = 0;
        bot.mapRotationCooldown = 0;
        bot.lastPersonalContactAt = simulationClock - 20;
        bot.target = null;
        bot.lastSeen = null;
        bot.combatApproachGoal = null;
        bot.navigationDetourGoal = null;
        bot.lateRoundGoal = null;
        bots = [bot];
        const selected = bot.summitLayerRotationSelection(true);
        return selected ? { role, range, currentZone: levelZoneAt(x, y)?.short || '', routeId: selected.route.id, targetZone: selected.route.targetZone, rangeBand: selected.route.rangeBand, score: Number(selected.score.toFixed(3)) } : null;
      };
      const scenarios = {
        longRangeMarksman: make('marksman', 12.4, 11.5, 18.5),
        shortRangeEntry: make('entry', 7.4, 14.5, 5.5),
        mediumSupport: make('support', 9.4, 5.5, 11.5)
      };
      bots = previousBots;
      roundEnding = previousRoundEnding;
      matchEnding = previousMatchEnding;
      roundFreezeTimer = previousFreeze;
      roundTime = previousRoundTime;
      setActiveArena(previousArena);
      return {
        scenarios,
        ok: scenarios.longRangeMarksman?.targetZone === 'CATWALK'
          && scenarios.shortRangeEntry?.targetZone === 'MAINT'
          && scenarios.mediumSupport?.targetZone === 'SKYBRIDGE'
      };
    },
    summitLayerRouteAuditForTest: () => {
      const previousArena = activeArenaId;
      setActiveArena('summit');
      const routes = typeof summitLayerRotationGeometry === 'function' ? summitLayerRotationGeometry() : [];
      const checks = routes.map(route => {
        const entry = nearestWalkablePoint(route.entry.x, route.entry.y);
        const exit = nearestWalkablePoint(route.exit.x, route.exit.y);
        const forward = findPath(entry, exit);
        const reverse = findPath(exit, entry);
        return {
          id: route.id,
          fromZones: route.fromZones,
          targetZone: route.targetZone,
          rangeBand: route.rangeBand,
          entry,
          exit,
          entryElevation: Number(arenaElevationAt(entry.x, entry.y).toFixed(3)),
          exitElevation: Number(arenaElevationAt(exit.x, exit.y).toFixed(3)),
          entryClear: canStandForNavigation(entry.x, entry.y, BOT_RADIUS),
          exitClear: canStandForNavigation(exit.x, exit.y, BOT_RADIUS),
          forwardNodes: forward?.length || 0,
          reverseNodes: reverse?.length || 0,
          ok: Boolean(forward?.length && reverse?.length && canStandForNavigation(entry.x, entry.y, BOT_RADIUS) && canStandForNavigation(exit.x, exit.y, BOT_RADIUS))
        };
      });
      const preview = arenaMeta('summit').preview || null;
      const stairColliders = LEVEL_PROP_COLLIDERS.filter(collider => collider.kind === 'stairs');
      const result = {
        arenaId: activeArenaId,
        routeCount: checks.length,
        checks,
        preview: preview ? {
          badge: preview.badge || '',
          tags: Array.isArray(preview.tags) ? preview.tags.slice() : [],
          bandCount: Array.isArray(preview.bands) ? preview.bands.length : 0,
          stairMarkerCount: Array.isArray(preview.stairs) ? preview.stairs.length : 0
        } : null,
        walkableStairColliders: stairColliders.length,
        ok: checks.length >= 12 && checks.every(check => check.ok) && stairColliders.length === 0 && preview?.bands?.length === 2 && preview?.stairs?.length === 2
      };
      setActiveArena(previousArena);
      return result;
    },
    summitVerticalAccessAuditForTest: () => {
      const previousArena = activeArenaId;
      setActiveArena('summit');
      const profile = typeof arenaVerticalSnapshot === 'function' ? arenaVerticalSnapshot('summit') : { platforms: [], ramps: [] };
      const ramps = (profile.ramps || []).map(ramp => {
        const samples = [];
        for (let index = 0; index <= 8; index++) {
          const t = index / 8;
          const x = lerp(Number(ramp.x1), Number(ramp.x2), t);
          const y = lerp(Number(ramp.z1), Number(ramp.z2), t);
          samples.push({ x: Number(x.toFixed(3)), y: Number(y.toFixed(3)), elevation: Number(arenaElevationAt(x, y, 'summit').toFixed(3)), clear: canStandForNavigation(x, y, BOT_RADIUS) });
        }
        const expectedStart = Number(ramp.elevation1) || 0;
        const expectedEnd = Number(ramp.elevation2) || 0;
        const increasing = expectedEnd >= expectedStart;
        const monotonic = samples.every((sample, index) => index === 0 || (increasing ? sample.elevation + 0.02 >= samples[index - 1].elevation : sample.elevation - 0.02 <= samples[index - 1].elevation));
        const path = findPath({ x: Number(ramp.x1), y: Number(ramp.z1) }, { x: Number(ramp.x2), y: Number(ramp.z2) });
        return {
          id: ramp.id,
          expectedStart,
          expectedEnd,
          samples,
          pathNodes: path?.length || 0,
          monotonic,
          connectedToGround: Math.abs(samples[0].elevation - expectedStart) <= 0.03,
          connectedToPlatform: Math.abs(samples[samples.length - 1].elevation - expectedEnd) <= 0.03,
          clear: samples.every(sample => sample.clear),
          ok: Boolean(path?.length && monotonic && Math.abs(samples[0].elevation - expectedStart) <= 0.03 && Math.abs(samples[samples.length - 1].elevation - expectedEnd) <= 0.03 && samples.every(sample => sample.clear))
        };
      });
      const crossLayerPaths = [
        { id: 'west-ground-to-catwalk', start: { x: 5.5, y: 11.5 }, end: { x: 14.5, y: 5.5 } },
        { id: 'east-ground-to-catwalk', start: { x: 30.5, y: 11.5 }, end: { x: 21.5, y: 5.5 } },
        { id: 'west-maint-to-catwalk', start: { x: 10.5, y: 18.5 }, end: { x: 14.5, y: 5.5 } },
        { id: 'east-maint-to-catwalk', start: { x: 25.5, y: 18.5 }, end: { x: 21.5, y: 5.5 } }
      ].map(check => {
        const path = findPath(check.start, check.end);
        const elevations = (path || []).map(node => arenaElevationAt(node.x, node.y, 'summit'));
        return { ...check, pathNodes: path?.length || 0, maximumElevation: elevations.length ? Number(Math.max(...elevations).toFixed(3)) : 0, ok: Boolean(path?.length) };
      });
      const platformElevations = [...new Set((profile.platforms || []).map(platform => Number((Number(platform.elevation) || 0).toFixed(3))))];
      const result = {
        arenaId: activeArenaId,
        platforms: profile.platforms,
        platformElevations,
        playableFloorCount: platformElevations.length + 1,
        ceilingHeight: Number(arenaMeta('summit').ceilingHeight) || GL_WALL_HEIGHT,
        upperHeadroom: Number(((Number(arenaMeta('summit').ceilingHeight) || GL_WALL_HEIGHT) - Math.max(...platformElevations, 0)).toFixed(3)),
        rampCount: ramps.length,
        ramps,
        crossLayerPaths,
        ok: profile.platforms?.length === 2
          && platformElevations.length === 1
          && platformElevations[0] > 0.6
          && ramps.length === 2
          && ramps.every(ramp => ramp.ok && Math.abs(ramp.expectedEnd - platformElevations[0]) <= 0.03)
          && crossLayerPaths.every(path => path.ok)
          && ((Number(arenaMeta('summit').ceilingHeight) || GL_WALL_HEIGHT) - platformElevations[0]) >= 2.55
      };
      setActiveArena(previousArena);
      return result;
    },
    summitStructuralIntegrityAuditForTest: () => {
      const previousArena = activeArenaId;
      setActiveArena('summit');
      const profile = typeof arenaVerticalSnapshot === 'function' ? arenaVerticalSnapshot('summit') : { platforms: [], ramps: [] };
      const colliders = LEVEL_PROP_COLLIDERS.filter(collider => !String(collider.kind || '').startsWith('door-'));
      const ramps = (profile.ramps || []).map(ramp => {
        const samples = [];
        const blockers = new Set();
        for (let index = 0; index <= 12; index++) {
          const t = index / 12;
          const x = lerp(Number(ramp.x1), Number(ramp.x2), t);
          const y = lerp(Number(ramp.z1), Number(ramp.z2), t);
          const elevation = arenaElevationAt(x, y, 'summit');
          for (const collider of colliders) {
            if (circleIntersectsLevelProp(x, y, BOT_RADIUS + 0.18, collider)) blockers.add(`${collider.kind}@${Number(collider.x).toFixed(2)},${Number(collider.y).toFixed(2)}`);
          }
          samples.push({ x: Number(x.toFixed(3)), y: Number(y.toFixed(3)), elevation: Number(elevation.toFixed(3)) });
        }
        const dx = Number(ramp.x2) - Number(ramp.x1);
        const dz = Number(ramp.z2) - Number(ramp.z1);
        const straight = Math.abs(dx) < 0.001 || Math.abs(dz) < 0.001;
        return {
          id: ramp.id,
          straight,
          blockers: [...blockers],
          groundElevation: samples[0]?.elevation ?? null,
          landingElevation: samples[samples.length - 1]?.elevation ?? null,
          ok: straight && blockers.size === 0
        };
      });
      const platforms = (profile.platforms || []).map(platform => {
        const elevation = Number(platform.elevation) || 0;
        const thickness = Number(platform.thickness) || 0;
        const supportHeight = Math.max(0, elevation - thickness);
        return { id: platform.id, elevation, thickness, supportHeight: Number(supportHeight.toFixed(3)), supportedToGround: supportHeight > 0.04 };
      });
      const authoredProps = [
        ...(LEVEL_PROP_LAYOUT.containers || []),
        ...(LEVEL_PROP_LAYOUT.machines || []),
        ...(LEVEL_PROP_LAYOUT.tanks || [])
      ].map(prop => ({
        kind: prop.kind || 'prop',
        x: prop.x,
        y: prop.y,
        width: Number(prop.width) || null,
        depth: Number(prop.depth) || null,
        radius: Number(prop.radius) || null
      }));
      beginNavigationPlanningFrame();
      const probe = new Bot(TEAM_BLUE, 4);
      probe.x = 2.5;
      probe.y = 18.5;
      probe.alive = true;
      probe.pathFailures = 0;
      const exactGoal = { x: 15.5, y: 10.5 };
      const exactPath = findPath(probe, exactGoal);
      const exactResolvedGoal = exactPath?.resolvedGoal || exactPath?.[exactPath.length - 1] || null;
      const exactGoalReachable = Boolean(exactResolvedGoal && dist(exactResolvedGoal, exactGoal) <= 0.05);
      const resolved = probe.ensurePath(exactGoal);
      const fallback = {
        exactGoalReachable,
        resolved,
        resolvedGoal: probe.pathGoal ? { ...probe.pathGoal } : null,
        pathNodes: probe.path?.length || 0,
        pathFailures: probe.pathFailures,
        movedOffUnreachableGoal: Boolean(probe.pathGoal && dist(probe.pathGoal, exactGoal) > 0.05),
        ok: Boolean(!exactGoalReachable && resolved && probe.path?.length && probe.pathFailures === 0 && probe.pathGoal && dist(probe.pathGoal, exactGoal) > 0.05)
      };
      const platformElevations = [...new Set(platforms.map(platform => Number(platform.elevation.toFixed(3))))];
      const result = {
        arenaId: activeArenaId,
        doorCount: (LEVEL_PROP_LAYOUT.doors || []).length,
        platforms,
        platformElevations,
        playableFloorCount: platformElevations.length + 1,
        ramps,
        authoredProps,
        fallback,
        ok: (LEVEL_PROP_LAYOUT.doors || []).length === 0
          && platforms.length === 2
          && platformElevations.length === 1
          && platforms.every(platform => platform.supportedToGround)
          && ramps.length === 2
          && ramps.every(ramp => ramp.ok && Math.abs((ramp.landingElevation || 0) - platformElevations[0]) <= 0.03)
          && fallback.ok
      };
      setActiveArena(previousArena);
      return result;
    },
    summitPresentationAuditForTest: () => {
      const previousArena = activeArenaId;
      try {
        setActiveArena('summit');
        const snapshot = typeof summitVisualPresentationSnapshot === 'function'
          ? summitVisualPresentationSnapshot()
          : { theme: '', platformCount: 0, rampCount: 0, railSegmentCount: 0, stairMouthGapCount: 0, railSegments: [] };
        const requiredGaps = new Set((arenaVerticalSnapshot('summit').ramps || []).map(ramp => ramp.id));
        const observedGaps = new Set();
        for (const segment of snapshot.railSegments || []) for (const gap of segment.stairGaps || []) observedGaps.add(gap);
        return {
          ...snapshot,
          requiredStairMouths: [...requiredGaps],
          observedStairMouths: [...observedGaps],
          ok: snapshot.theme === 'summit'
            && snapshot.platformCount === 2
            && snapshot.rampCount === 2
            && snapshot.deckJoinCount === 1
            && snapshot.railSegmentCount >= 8
            && snapshot.stairMouthGapCount === 2
            && [...requiredGaps].every(id => observedGaps.has(id))
            && (snapshot.railSegments || []).every(segment => segment.length >= 0.34)
            && (snapshot.railSegments || []).some(segment => (segment.railOpenings || []).some(opening => opening.id === 'upper-deck-link'))
            && (snapshot.stairRailJoins || []).length === 2
            && (snapshot.stairRailJoins || []).every(join => join.connected === true && join.supportAligned === true && join.railReturnLength >= 0.14)
            && snapshot.supportOpeningCount === 2
            && snapshot.supportBlockCount >= 3
            && snapshot.fasciaSegmentCount >= 6
            && (snapshot.supportOpenings || []).length === 2
            && (snapshot.supportOpenings || []).every(opening => opening.width >= 1.25 && opening.depth >= 0.35)
            && snapshot.zoneOverlayBlend === true
        };
      } finally {
        setActiveArena(previousArena);
      }
    },
    summitHotspotReachabilityAuditForTest: () => {
      const previousArena = activeArenaId;
      setActiveArena('summit');
      const allSpawns = [...(spawnPoints[TEAM_BLUE] || []), ...(spawnPoints[TEAM_RED] || [])];
      const checks = hotspots.map((hotspot, index) => {
        const point = nearestWalkablePoint(hotspot.x, hotspot.y);
        const routes = allSpawns.map(spawn => findPath(spawn, point));
        return {
          index,
          authored: { x: hotspot.x, y: hotspot.y },
          point,
          clear: canStandForNavigation(point.x, point.y, BOT_RADIUS),
          reachableFromEverySpawn: routes.every(path => Boolean(path?.length)),
          minimumNodes: Math.min(...routes.map(path => path?.length || 9999)),
          maximumNodes: Math.max(...routes.map(path => path?.length || 0)),
          ok: canStandForNavigation(point.x, point.y, BOT_RADIUS) && routes.every(path => Boolean(path?.length))
        };
      });
      const staleUnreachableGoalPresent = hotspots.some(point => Math.abs(point.x - 17.5) < 0.01 && Math.abs(point.y - 10.5) < 0.01);
      const result = { arenaId: activeArenaId, count: checks.length, checks, staleUnreachableGoalPresent, ok: checks.length > 0 && checks.every(check => check.ok) && !staleUnreachableGoalPresent };
      setActiveArena(previousArena);
      return result;
    },
    summitWholeMapConnectivityAuditForTest: () => {
      const previousArena = activeArenaId;
      let result;
      try {
        setActiveArena('summit');
        const floorAnchors = {
          ground: nearestWalkablePoint(2.5, 12.5),
          upper: nearestWalkablePoint(14.5, 5.5)
        };
        const floorCounts = { ground: 0, upper: 0 };
        const reachable = { ground: 0, upper: 0 };
        const unreachable = [];
        for (let y = 0; y < MAP_H; y++) {
          for (let x = 0; x < MAP_W; x++) {
            const point = { x: x + CELL_CENTER, y: y + CELL_CENTER };
            if (MAP[y]?.[x] !== '0' || !canStandForNavigation(point.x, point.y, NAV_RADIUS)) continue;
            const elevation = arenaElevationAt(point.x, point.y, 'summit');
            const floor = elevation >= 0.40 ? 'upper' : 'ground';
            floorCounts[floor]++;
            const path = findPath(floorAnchors[floor], point);
            const resolved = path?.resolvedGoal || path?.[path.length - 1] || null;
            const exact = Boolean(path?.length && resolved && Math.hypot(resolved.x - point.x, resolved.y - point.y) <= 0.08);
            if (exact) reachable[floor]++;
            else if (unreachable.length < 40) unreachable.push({ x: point.x, y: point.y, floor, elevation: Number(elevation.toFixed(3)), resolved });
          }
        }
        const crossFloorChecks = [
          ...(spawnPoints[TEAM_BLUE] || []).map((start, index) => ({ id: `blue-${index}-to-upper`, start, goal: { x: 14.5, y: 5.5 } })),
          ...(spawnPoints[TEAM_RED] || []).map((start, index) => ({ id: `red-${index}-to-upper`, start, goal: { x: 21.5, y: 5.5 } })),
          { id: 'upper-west-to-maint', start: { x: 14.5, y: 5.5 }, goal: { x: 14.5, y: 18.5 } },
          { id: 'upper-east-to-maint', start: { x: 21.5, y: 5.5 }, goal: { x: 21.5, y: 18.5 } },
          { id: 'gallery-to-skybridge-west', start: { x: 14.5, y: 5.5 }, goal: { x: 14.5, y: 11.5 } },
          { id: 'gallery-to-skybridge-east', start: { x: 21.5, y: 5.5 }, goal: { x: 21.5, y: 11.5 } }
        ].map(check => {
          const path = findPath(check.start, check.goal);
          const resolved = path?.resolvedGoal || path?.[path.length - 1] || null;
          const exact = Boolean(path?.length && resolved && Math.hypot(resolved.x - check.goal.x, resolved.y - check.goal.y) <= 0.08);
          const elevations = (path || []).map(point => arenaElevationAt(point.x, point.y, 'summit'));
          return {
            ...check,
            nodes: path?.length || 0,
            exact,
            minimumElevation: elevations.length ? Number(Math.min(...elevations).toFixed(3)) : null,
            maximumElevation: elevations.length ? Number(Math.max(...elevations).toFixed(3)) : null,
            ok: exact
          };
        });
        result = {
          floorAnchors,
          floorCounts,
          reachable,
          unreachable,
          crossFloorChecks,
          allGroundReachable: reachable.ground === floorCounts.ground,
          allUpperReachable: reachable.upper === floorCounts.upper,
          ok: unreachable.length === 0
            && reachable.ground === floorCounts.ground
            && reachable.upper === floorCounts.upper
            && floorCounts.ground > 0 && floorCounts.upper > 0
            && crossFloorChecks.every(check => check.ok)
        };
      } finally {
        setActiveArena(previousArena);
      }
      return result;
    },
    summitOpeningTransitionForTest: (planId = 'catwalk-snap') => {
      const previousArena = activeArenaId;
      const previousBots = bots;
      const previousPlan = currentEngagementPlan;
      const previousRoundEnding = roundEnding;
      const previousMatchEnding = matchEnding;
      const previousFreeze = roundFreezeTimer;
      const previousRoundTime = roundTime;
      setActiveArena('summit');
      roundEnding = false;
      matchEnding = false;
      roundFreezeTimer = ROUND_FREEZE_TIME;
      roundTime = ROUND_DURATION;
      selectRoundEngagementPlan(planId);
      bots = [];
      for (const team of [TEAM_BLUE, TEAM_RED]) {
        for (let slot = 0; slot < 5; slot++) bots.push(new Bot(team, slot));
      }
      for (const bot of bots) bot.alive = false;
      for (const bot of bots) bot.reset(false);
      const assigned = typeof prepareSummitOpeningTransitions === 'function' ? prepareSummitOpeningTransitions() : 0;
      const assignments = bots.filter(bot => bot.mapRotationGoal).map(bot => ({
        key: `${bot.team}-${bot.slot}`,
        team: bot.team,
        slot: bot.slot,
        routeId: bot.mapRotationLaneId,
        targetZone: bot.mapRotationTargetZone,
        openingCommit: Boolean(bot.mapRotationOpeningCommit),
        goal: bot.mapRotationGoal ? { ...bot.mapRotationGoal } : null,
        exit: bot.mapRotationExitGoal ? { ...bot.mapRotationExitGoal } : null,
        goalReachable: Boolean(bot.mapRotationGoal && findPath(bot, bot.mapRotationGoal)?.length),
        exitReachable: Boolean(bot.mapRotationGoal && bot.mapRotationExitGoal && findPath(bot.mapRotationGoal, bot.mapRotationExitGoal)?.length)
      }));
      const expectedZone = String(currentEngagementPlan?.zone || '');
      const teamsAssigned = new Set(assignments.map(item => item.team)).size;
      const result = {
        planId: currentEngagementPlan?.id || null,
        expectedZone,
        assigned,
        assignments,
        teamsAssigned,
        ok: assigned >= 4 && teamsAssigned === 2 && assignments.every(item => item.targetZone === expectedZone && item.openingCommit && item.goalReachable && item.exitReachable)
      };
      bots = previousBots;
      currentEngagementPlan = previousPlan;
      roundEnding = previousRoundEnding;
      matchEnding = previousMatchEnding;
      roundFreezeTimer = previousFreeze;
      roundTime = previousRoundTime;
      setActiveArena(previousArena);
      return result;
    },
    summitOpeningDistributionForTest: (planId = 'catwalk-snap', durationSeconds = 18) => {
      const previousArena = activeArenaId;
      const previousBots = bots;
      const previousPlan = currentEngagementPlan;
      const previousRoundEnding = roundEnding;
      const previousMatchEnding = matchEnding;
      const previousFreeze = roundFreezeTimer;
      const previousRoundTime = roundTime;
      const previousClock = simulationClock;
      const previousSoundEvents = soundEvents;
      const countersBefore = {
        pathFailures: Number(combatDebug.pathFailures) || 0,
        rotations: Number(combatDebug.summitLayerRotations) || 0,
        traversals: Number(combatDebug.summitLayerTraversals) || 0
      };
      let result;
      try {
        setActiveArena('summit');
        roundEnding = false;
        matchEnding = false;
        roundFreezeTimer = ROUND_FREEZE_TIME;
        roundTime = ROUND_DURATION;
        soundEvents = [];
        selectRoundEngagementPlan(planId);
        bots = [];
        for (const team of [TEAM_BLUE, TEAM_RED]) {
          for (let slot = 0; slot < 5; slot++) bots.push(new Bot(team, slot));
        }
        for (const bot of bots) bot.alive = false;
        for (const bot of bots) bot.reset(false);
        const assigned = prepareSummitOpeningTransitions();
        roundFreezeTimer = 0;
        const observations = new Map(bots.map(bot => [bot, { maxElevation: arenaElevationAt(bot.x, bot.y, 'summit'), zones: new Set([levelZoneAt(bot.x, bot.y)?.short || '']), aliveAtEnd: true }]));
        const dt = 1 / 60;
        const frames = Math.max(60, Math.round(clamp(Number(durationSeconds) || 18, 5, 30) / dt));
        for (let frame = 0; frame < frames; frame++) {
          simulationClock += dt;
          roundTime = Math.max(35, roundTime - dt);
          updateDynamicDoors(dt);
          for (const bot of bots) {
            bot.update(dt);
            const observation = observations.get(bot);
            observation.maxElevation = Math.max(observation.maxElevation, arenaElevationAt(bot.x, bot.y, 'summit'));
            observation.zones.add(levelZoneAt(bot.x, bot.y)?.short || '');
            observation.aliveAtEnd = bot.alive;
          }
        }
        const operators = bots.map(bot => {
          const observation = observations.get(bot);
          return {
            team: bot.team,
            slot: bot.slot,
            alive: bot.alive,
            maxElevation: Number(observation.maxElevation.toFixed(3)),
            zones: [...observation.zones],
            finalZone: levelZoneAt(bot.x, bot.y)?.short || '',
            finalPosition: { x: Number(bot.x.toFixed(3)), y: Number(bot.y.toFixed(3)) },
            pathFailures: Number(bot.pathFailures) || 0
          };
        });
        const expectedZone = String(currentEngagementPlan?.zone || '');
        const teamSummaries = [TEAM_BLUE, TEAM_RED].map(team => {
          const teamOps = operators.filter(operator => operator.team === team);
          return {
            team,
            reachedExpectedZone: teamOps.filter(operator => operator.zones.includes(expectedZone)).length,
            reachedUpperElevation: teamOps.filter(operator => operator.maxElevation >= 0.65).length,
            operators: teamOps
          };
        });
        const zonePass = expectedZone === 'CATWALK'
          ? teamSummaries.every(team => team.reachedExpectedZone >= 2 && team.reachedUpperElevation >= 2)
          : teamSummaries.every(team => team.reachedExpectedZone >= 2);
        result = {
          planId: currentEngagementPlan?.id || null,
          expectedZone,
          assigned,
          durationSeconds: Number((frames * dt).toFixed(2)),
          teamSummaries,
          pathFailureDelta: (Number(combatDebug.pathFailures) || 0) - countersBefore.pathFailures,
          rotationDelta: (Number(combatDebug.summitLayerRotations) || 0) - countersBefore.rotations,
          traversalDelta: (Number(combatDebug.summitLayerTraversals) || 0) - countersBefore.traversals,
          ok: assigned >= 4 && zonePass
        };
      } finally {
        bots = previousBots;
        currentEngagementPlan = previousPlan;
        roundEnding = previousRoundEnding;
        matchEnding = previousMatchEnding;
        roundFreezeTimer = previousFreeze;
        roundTime = previousRoundTime;
        simulationClock = previousClock;
        soundEvents = previousSoundEvents;
        setActiveArena(previousArena);
      }
      return result;
    },
    summitStairOnlyAccessAuditForTest: () => {
      const previousArena = activeArenaId;
      let result;
      try {
        setActiveArena('summit');
        const profile = arenaVerticalSnapshot('summit');
        const directEdges = [
          { id: 'gallery-north-edge', a: { x: 18.5, y: 1.55 }, b: { x: 18.5, y: 2.45 } },
          { id: 'gallery-west-edge', a: { x: 8.55, y: 5.5 }, b: { x: 9.45, y: 5.5 } },
          { id: 'gallery-east-edge', a: { x: 27.45, y: 5.5 }, b: { x: 26.55, y: 5.5 } },
          { id: 'skybridge-south-edge', a: { x: 17.5, y: 15.45 }, b: { x: 17.5, y: 14.55 } },
          { id: 'skybridge-west-edge', a: { x: 10.55, y: 12.5 }, b: { x: 11.45, y: 12.5 } },
          { id: 'skybridge-east-edge', a: { x: 25.45, y: 12.5 }, b: { x: 24.55, y: 12.5 } }
        ].map(edge => ({
          ...edge,
          elevationA: Number(arenaElevationAt(edge.a.x, edge.a.y, 'summit').toFixed(3)),
          elevationB: Number(arenaElevationAt(edge.b.x, edge.b.y, 'summit').toFixed(3)),
          allowed: canTravelBetweenForNavigation(edge.a.x, edge.a.y, edge.b.x, edge.b.y, BOT_RADIUS)
        }));
        const stairs = (profile.ramps || []).map(ramp => {
          const a = { x: lerp(ramp.x1, ramp.x2, 0.08), y: lerp(ramp.z1, ramp.z2, 0.08) };
          const b = { x: lerp(ramp.x1, ramp.x2, 0.92), y: lerp(ramp.z1, ramp.z2, 0.92) };
          const path = findPath(a, b);
          return {
            id: ramp.id,
            allowed: canTravelBetweenForNavigation(a.x, a.y, b.x, b.y, BOT_RADIUS),
            pathNodes: path?.length || 0,
            startElevation: Number(arenaElevationAt(a.x, a.y, 'summit').toFixed(3)),
            endElevation: Number(arenaElevationAt(b.x, b.y, 'summit').toFixed(3)),
            pathTransitionValid: Boolean(path?.length) && path.every((point, index) => index === 0 || arenaElevationTransitionAllowed(path[index - 1].x, path[index - 1].y, point.x, point.y, 'summit'))
          };
        });
        const groundToUpperPairs = [
          { id: 'west-to-gallery', start: { x: 5.5, y: 11.5 }, goal: { x: 14.5, y: 5.5 } },
          { id: 'east-to-gallery', start: { x: 30.5, y: 11.5 }, goal: { x: 21.5, y: 5.5 } },
          { id: 'west-to-skybridge', start: { x: 5.5, y: 13.5 }, goal: { x: 17.5, y: 12.5 } },
          { id: 'south-to-skybridge', start: { x: 18.5, y: 19.5 }, goal: { x: 18.5, y: 12.5 } }
        ].map(pair => {
          const path = findPath(pair.start, pair.goal);
          const elevations = (path || []).map(point => arenaElevationAt(point.x, point.y, 'summit'));
          const transitionValid = Boolean(path?.length) && path.every((point, index) => index === 0 || canTravelBetweenForNavigation(path[index - 1].x, path[index - 1].y, point.x, point.y, BOT_RADIUS));
          let gradual = false;
          for (let index = 1; index < (path || []).length && !gradual; index++) {
            const a = path[index - 1];
            const b = path[index];
            const length = Math.hypot(b.x - a.x, b.y - a.y);
            const samples = Math.max(2, Math.ceil(length / 0.12));
            for (let sample = 1; sample < samples; sample++) {
              const ratio = sample / samples;
              const elevation = arenaElevationAt(lerp(a.x, b.x, ratio), lerp(a.y, b.y, ratio), 'summit');
              if (elevation > 0.05 && elevation < 0.73) { gradual = true; break; }
            }
          }
          const segments = (path || []).slice(1).map((point, index) => ({
            from: { x: Number(path[index].x.toFixed(3)), y: Number(path[index].y.toFixed(3)), elevation: Number(arenaElevationAt(path[index].x, path[index].y, 'summit').toFixed(3)) },
            to: { x: Number(point.x.toFixed(3)), y: Number(point.y.toFixed(3)), elevation: Number(arenaElevationAt(point.x, point.y, 'summit').toFixed(3)) },
            allowed: canTravelBetweenForNavigation(path[index].x, path[index].y, point.x, point.y, BOT_RADIUS)
          }));
          return { id: pair.id, nodes: path?.length || 0, path: (path || []).map(point => ({ x: Number(point.x.toFixed(3)), y: Number(point.y.toFixed(3)) })), elevations: elevations.map(value => Number(value.toFixed(3))), segments, transitionValid, gradual, ok: Boolean(path?.length) && transitionValid && gradual };
        });
        result = {
          directEdges,
          stairs,
          groundToUpperPairs,
          directClimbsBlocked: directEdges.every(edge => !edge.allowed),
          stairsPassable: stairs.every(stair => stair.allowed && stair.pathNodes > 0 && stair.pathTransitionValid),
          routesUseStairs: groundToUpperPairs.every(pair => pair.ok),
          ok: directEdges.every(edge => !edge.allowed) && stairs.every(stair => stair.allowed && stair.pathNodes > 0 && stair.pathTransitionValid) && groundToUpperPairs.every(pair => pair.ok)
        };
      } finally {
        setActiveArena(previousArena);
      }
      return result;
    },
    summitCrossFloorCombatRouteForTest: () => {
      const previousArena = activeArenaId;
      const previousBots = bots;
      const previousPlan = currentEngagementPlan;
      const previousRoundEnding = roundEnding;
      const previousMatchEnding = matchEnding;
      const previousFreeze = roundFreezeTimer;
      const previousRoundTime = roundTime;
      let result;
      try {
        setActiveArena('summit');
        roundEnding = false;
        matchEnding = false;
        roundFreezeTimer = 0;
        roundTime = 82;
        currentEngagementPlan = (arenaMeta('summit').engagementPlans || []).find(plan => plan.id === 'skybridge') || null;
        const mover = new Bot(TEAM_BLUE, 0);
        const enemy = new Bot(TEAM_RED, 0);
        bots = [mover, enemy];
        mover.x = 5.5; mover.y = 11.5; mover.lastX = mover.x; mover.lastY = mover.y; mover.alive = true;
        enemy.x = 18.5; enemy.y = 12.5; enemy.lastX = enemy.x; enemy.lastY = enemy.y; enemy.alive = true;
        mover.combatApproachPath = [];
        mover.combatApproachGoal = null;
        mover.combatApproachKind = '';
        const started = mover.beginCombatApproach(enemy, 'take stairs to higher-floor contact', { verticalTransition: true, alternate: 1 });
        const path = mover.combatApproachPath || [];
        const segmentValid = Boolean(path.length) && path.every((point, index) => index === 0 || canTravelBetweenForNavigation(path[index - 1].x, path[index - 1].y, point.x, point.y, BOT_RADIUS));
        let gradual = false;
        let maximumElevation = 0;
        for (let index = 1; index < path.length; index++) {
          const a = path[index - 1];
          const b = path[index];
          const length = Math.hypot(b.x - a.x, b.y - a.y);
          const samples = Math.max(2, Math.ceil(length / 0.10));
          for (let sample = 0; sample <= samples; sample++) {
            const ratio = sample / samples;
            const elevation = arenaElevationAt(lerp(a.x, b.x, ratio), lerp(a.y, b.y, ratio), 'summit');
            maximumElevation = Math.max(maximumElevation, elevation);
            if (elevation > 0.05 && elevation < 0.73) gradual = true;
          }
        }
        result = {
          started,
          kind: mover.combatApproachKind,
          path: path.map(point => ({ x: Number(point.x.toFixed(3)), y: Number(point.y.toFixed(3)), elevation: Number(arenaElevationAt(point.x, point.y, 'summit').toFixed(3)) })),
          segmentValid,
          gradual,
          maximumElevation: Number(maximumElevation.toFixed(3)),
          ok: started && mover.combatApproachKind === 'vertical-transition' && segmentValid && gradual && maximumElevation >= 0.73
        };
      } finally {
        bots = previousBots;
        currentEngagementPlan = previousPlan;
        roundEnding = previousRoundEnding;
        matchEnding = previousMatchEnding;
        roundFreezeTimer = previousFreeze;
        roundTime = previousRoundTime;
        setActiveArena(previousArena);
      }
      return result;
    },

    summitTacticalFlankForTest: () => {
      const previousArena = activeArenaId;
      const previousBots = bots;
      const previousPlan = currentEngagementPlan;
      const previousRoundEnding = roundEnding;
      const previousMatchEnding = matchEnding;
      const previousFreeze = roundFreezeTimer;
      const previousRoundTime = roundTime;
      const previousClock = simulationClock;
      const previousFlanks = Number(combatDebug.tacticalFlankRoutes) || 0;
      let result;
      try {
        setActiveArena('summit');
        roundEnding = false;
        matchEnding = false;
        roundFreezeTimer = 0;
        roundTime = 78;
        currentEngagementPlan = (arenaMeta('summit').engagementPlans || []).find(plan => plan.id === 'pillar-cross') || null;
        const flanker = new Bot(TEAM_BLUE, 0);
        const support = new Bot(TEAM_BLUE, 1);
        const enemy = new Bot(TEAM_RED, 0);
        bots = [flanker, support, enemy];
        flanker.x = 13.5; flanker.y = 12.5; flanker.playerRole = 'flanker'; flanker.flankBias = 0.65; flanker.tacticalFlankCooldown = 0;
        support.x = 13.2; support.y = 14.2; support.playerRole = 'support';
        enemy.x = 20.5; enemy.y = 12.5; enemy.playerRole = 'anchor';
        for (const bot of bots) { bot.alive = true; bot.lastX = bot.x; bot.lastY = bot.y; bot.target = null; bot.lastSeen = null; bot.combatApproachGoal = null; bot.combatApproachPath = []; bot.combatApproachKind = ''; }
        const started = flanker.beginCombatApproach(enemy, 'role flank around contact', { tacticalFlank: true, alternate: 2 });
        const path = (flanker.combatApproachPath || []).map(point => ({ x: Number(point.x.toFixed(3)), y: Number(point.y.toFixed(3)), elevation: Number(arenaElevationAt(point.x, point.y, 'summit').toFixed(3)) }));
        const goal = flanker.combatApproachGoal ? { ...flanker.combatApproachGoal } : null;
        const enemyBearing = Math.atan2(flanker.y - enemy.y, flanker.x - enemy.x);
        const goalBearing = goal ? Math.atan2(goal.y - enemy.y, goal.x - enemy.x) : enemyBearing;
        const lateral = goal ? Math.abs(Math.sin(angleDiff(goalBearing, enemyBearing))) : 0;
        result = {
          started,
          kind: flanker.combatApproachKind,
          goal,
          path,
          pathNodes: path.length,
          lateral: Number(lateral.toFixed(3)),
          counterDelta: (Number(combatDebug.tacticalFlankRoutes) || 0) - previousFlanks,
          ok: started && flanker.combatApproachKind === 'tactical-flank' && path.length >= 2 && lateral >= 0.62 && (Number(combatDebug.tacticalFlankRoutes) || 0) > previousFlanks
        };
      } finally {
        bots = previousBots;
        currentEngagementPlan = previousPlan;
        roundEnding = previousRoundEnding;
        matchEnding = previousMatchEnding;
        roundFreezeTimer = previousFreeze;
        roundTime = previousRoundTime;
        simulationClock = previousClock;
        setActiveArena(previousArena);
      }
      return result;
    },

    summitLoggedGoalRecoveryForTest: () => {
      const previousArena = activeArenaId;
      const previousBots = bots;
      const previousFrame = navigationPlanningFrame;
      const previousPlans = navigationPlansUsedThisFrame;
      const failuresBefore = Number(combatDebug.pathFailures) || 0;
      let result;
      try {
        setActiveArena('summit');
        const bot = new Bot(TEAM_RED, 2);
        bots = [bot];
        bot.alive = true;
        bot.x = 24.5;
        bot.y = 12.5;
        bot.lastX = bot.x;
        bot.lastY = bot.y;
        bot.path = [];
        bot.pathIndex = 0;
        bot.pathGoal = null;
        beginNavigationPlanningFrame();
        const requested = { x: 17.5, y: 9.5 };
        const started = bot.ensurePath(requested);
        const resolved = bot.pathGoal ? { ...bot.pathGoal } : null;
        const path = bot.path || [];
        const pathValid = Boolean(path.length) && path.every((point, index) => index === 0 || canTravelBetweenForNavigation(path[index - 1].x, path[index - 1].y, point.x, point.y, NAV_RADIUS));
        result = {
          requested,
          directPathAvailable: Boolean(findPath(bot, requested)?.length),
          started,
          resolved,
          resolutionDistance: resolved ? Number(Math.hypot(resolved.x - requested.x, resolved.y - requested.y).toFixed(3)) : null,
          pathNodes: path.length,
          pathValid,
          pathFailureDelta: (Number(combatDebug.pathFailures) || 0) - failuresBefore,
          ok: started && Boolean(resolved) && path.length > 1 && pathValid && (Number(combatDebug.pathFailures) || 0) === failuresBefore
        };
      } finally {
        bots = previousBots;
        navigationPlanningFrame = previousFrame;
        navigationPlansUsedThisFrame = previousPlans;
        setActiveArena(previousArena);
      }
      return result;
    },

    summitStairTraversalSimulationForTest: () => {
      const previousArena = activeArenaId;
      const previousBots = bots;
      const previousPlan = currentEngagementPlan;
      const previousRoundEnding = roundEnding;
      const previousMatchEnding = matchEnding;
      const previousFreeze = roundFreezeTimer;
      const previousRoundTime = roundTime;
      const previousClock = simulationClock;
      const previousRotations = Number(combatDebug.summitLayerRotations) || 0;
      const previousTraversals = Number(combatDebug.summitLayerTraversals) || 0;
      const runSide = (team, slot, start, expectedRoute) => {
        setActiveArena('summit');
        roundEnding = false;
        matchEnding = false;
        roundFreezeTimer = 0;
        roundTime = ROUND_DURATION;
        currentEngagementPlan = (arenaMeta('summit').engagementPlans || []).find(plan => plan.id === 'catwalk-snap') || null;
        const bot = new Bot(team, slot);
        bots = [bot];
        bot.alive = false;
        bot.reset(false);
        bot.x = start.x;
        bot.y = start.y;
        bot.lastX = bot.x;
        bot.lastY = bot.y;
        bot.openingPlanObjective = team === TEAM_BLUE ? { x: 14.5, y: 5.5 } : { x: 21.5, y: 5.5 };
        bot.openingPlanUntil = simulationClock + 40;
        bot.objective = { ...bot.openingPlanObjective };
        bot.mapRotationCooldown = 0;
        bot.target = null;
        bot.lastSeen = null;
        bot.heardSound = null;
        bot.combatApproachGoal = null;
        bot.navigationDetourGoal = null;
        bot.lateRoundGoal = null;
        const started = bot.beginSummitLayerRotation(true, 'CATWALK', true);
        const samples = [];
        let maximumElevation = arenaElevationAt(bot.x, bot.y, 'summit');
        let rampSampleCount = 0;
        let completed = false;
        const dt = 1 / 60;
        for (let frame = 0; frame < 2400; frame++) {
          simulationClock += dt;
          roundTime = Math.max(36, roundTime - dt);
          // Tests must mirror the real runtime, which resets the bounded
          // navigation planning budget once per rendered simulation frame.
          beginNavigationPlanningFrame();
          bot.update(dt);
          const elevation = arenaElevationAt(bot.x, bot.y, 'summit');
          maximumElevation = Math.max(maximumElevation, elevation);
          if (elevation > 0.06 && elevation < 0.68) rampSampleCount++;
          if (frame % 60 === 0) samples.push({ time: Number((frame * dt).toFixed(1)), x: Number(bot.x.toFixed(3)), y: Number(bot.y.toFixed(3)), elevation: Number(elevation.toFixed(3)), stage: bot.mapRotationStage || 'complete' });
          if (started && !bot.mapRotationGoal && elevation >= 0.68 && (levelZoneAt(bot.x, bot.y)?.short || '') === 'CATWALK') {
            completed = true;
            break;
          }
        }
        return {
          team,
          started,
          expectedRoute,
          selectedRoute: samples.length ? expectedRoute : bot.mapRotationLaneId,
          final: { x: Number(bot.x.toFixed(3)), y: Number(bot.y.toFixed(3)), elevation: Number(arenaElevationAt(bot.x, bot.y, 'summit').toFixed(3)), zone: levelZoneAt(bot.x, bot.y)?.short || '' },
          maximumElevation: Number(maximumElevation.toFixed(3)),
          rampSampleCount,
          pathFailures: Number(bot.pathFailures) || 0,
          completed,
          samples,
          ok: started && completed && maximumElevation >= 0.68 && rampSampleCount >= 3 && (Number(bot.pathFailures) || 0) === 0
        };
      };
      let result;
      try {
        const west = runSide(TEAM_BLUE, 0, { x: 5.5, y: 11.5 }, 'west-upper-rise');
        simulationClock = previousClock;
        const east = runSide(TEAM_RED, 0, { x: 30.5, y: 11.5 }, 'east-upper-rise');
        result = {
          west,
          east,
          rotationsRecorded: (Number(combatDebug.summitLayerRotations) || 0) - previousRotations,
          traversalsRecorded: (Number(combatDebug.summitLayerTraversals) || 0) - previousTraversals,
          ok: west.ok && east.ok
        };
      } finally {
        bots = previousBots;
        currentEngagementPlan = previousPlan;
        roundEnding = previousRoundEnding;
        matchEnding = previousMatchEnding;
        roundFreezeTimer = previousFreeze;
        roundTime = previousRoundTime;
        simulationClock = previousClock;
        setActiveArena(previousArena);
      }
      return result;
    },

    arenaAuditForTest: (arenaId = 'citadel') => {
      const id = arenaMeta(String(arenaId || 'citadel')).id;
      setActiveArena(id);
      const blue = spawnPoints[TEAM_BLUE] || [];
      const red = spawnPoints[TEAM_RED] || [];
      const routePairs = blue.map((spawn, index) => {
        const goal = red[red.length - 1 - index] || red[index] || red[0];
        const path = goal ? findPath(spawn, goal) : null;
        return { index, nodes: path?.length || 0, ok: Boolean(path?.length) };
      });
      const spawnClear = [...blue, ...red].map(spawn => ({
        x: spawn.x,
        y: spawn.y,
        wallClear: canStand(spawn.x, spawn.y, BOT_RADIUS),
        propClear: !collidesWithLevelProp(spawn.x, spawn.y, BOT_RADIUS)
      }));
      return {
        arena: activeArenaMeta(),
        routePairs,
        routesConnected: routePairs.every(item => item.ok),
        spawnClear,
        allSpawnsClear: spawnClear.every(item => item.wallClear && item.propClear),
        props: LEVEL_PROP_COLLIDERS.length,
        courtyards: (LEVEL_DECOR_LAYOUT.courtyards || []).length,
        decor: {
          rugs: (LEVEL_DECOR_LAYOUT.rugs || []).length,
          screens: (LEVEL_DECOR_LAYOUT.wallScreens || []).length,
          glass: (LEVEL_DECOR_LAYOUT.glassBands || []).length,
          baffles: (LEVEL_DECOR_LAYOUT.ceilingBaffles || []).length
        }
      };
    },
    propCollisionBroadphaseForTest: () => auditLevelPropCollisionBroadphase(),
    auroraTerminalAuditForTest: () => {
      const previousArena = activeArenaId;
      let result;
      try {
        setActiveArena('aurora');
        const arena = activeArenaMeta();
        const layout = arena.layout || [];
        const rowSymmetry = layout.map((row, index) => ({
          index,
          palindromic: row === [...row].reverse().join(''),
          mirrored: row === layout[layout.length - 1 - index]
        }));
        const open = [];
        for (let y = 0; y < layout.length; y++) {
          for (let x = 0; x < (layout[y] || '').length; x++) if (layout[y][x] === '0') open.push({ x, y });
        }
        const key = (x, y) => `${x}:${y}`;
        const openSet = new Set(open.map(cell => key(cell.x, cell.y)));
        const visited = new Set();
        const queue = open.length ? [open[0]] : [];
        if (queue.length) visited.add(key(queue[0].x, queue[0].y));
        while (queue.length) {
          const cell = queue.shift();
          for (const next of [
            { x: cell.x + 1, y: cell.y }, { x: cell.x - 1, y: cell.y },
            { x: cell.x, y: cell.y + 1 }, { x: cell.x, y: cell.y - 1 }
          ]) {
            const nextKey = key(next.x, next.y);
            if (!openSet.has(nextKey) || visited.has(nextKey)) continue;
            visited.add(nextKey);
            queue.push(next);
          }
        }
        const allSpawns = [...(spawnPoints[TEAM_BLUE] || []), ...(spawnPoints[TEAM_RED] || [])];
        const destinations = [
          ...(arena.hotspots || []),
          ...(arena.engagementPlans || []).flatMap(plan => [...(plan.blue || []), ...(plan.red || [])])
        ];
        const destinationChecks = destinations.map((goal, index) => {
          const clear = canStandForNavigation(goal.x, goal.y, BOT_RADIUS);
          const reachableFromAllSpawns = allSpawns.every(spawn => Boolean(findPath(spawn, goal)?.length));
          return { index, goal: { x: goal.x, y: goal.y }, clear, reachableFromAllSpawns };
        });
        const engagement = window.__strikeDebug.engagementPlanAuditForTest('aurora');
        const propCollision = auditLevelPropCollision();
        const geometry = window.__strikeDebug.arenaGeometryIntegrityForTest('aurora');
        result = {
          arenaId: arena.id,
          theme: arena.theme,
          rowSymmetry,
          symmetric: rowSymmetry.every(row => row.palindromic && row.mirrored),
          openCells: open.length,
          connected: visited.size === openSet.size,
          spawnCount: allSpawns.length,
          destinationChecks,
          destinationsOk: destinationChecks.every(check => check.clear && check.reachableFromAllSpawns),
          engagementOk: Boolean(engagement?.ok ?? engagement?.plans?.every?.(plan => plan.ok) ?? true),
          engagement,
          propCollisionOk: Boolean(propCollision?.ok ?? true),
          geometryOk: Boolean(geometry?.ok),
          geometry,
          ok: rowSymmetry.every(row => row.palindromic && row.mirrored)
            && visited.size === openSet.size
            && allSpawns.length === 10
            && destinationChecks.every(check => check.clear && check.reachableFromAllSpawns)
            && Boolean(geometry?.ok)
        };
      } finally {
        setActiveArena(previousArena);
      }
      return result;
    },
    duneBastionAuditForTest: () => {
      const previousArena = activeArenaId;
      let result;
      try {
        setActiveArena('dune');
        const arena = activeArenaMeta();
        const layout = arena.layout || [];
        const width = layout[0]?.length || 0;
        const height = layout.length;
        const rowSymmetry = layout.map((row, index) => ({ index, symmetric: row === [...row].reverse().join('') }));
        const open = [];
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) if (layout[y]?.[x] === '0') open.push({ x, y });
        }
        const key = (x, y) => `${x}:${y}`;
        const openSet = new Set(open.map(cell => key(cell.x, cell.y)));
        const visited = new Set();
        const queue = open.length ? [open[0]] : [];
        if (queue.length) visited.add(key(queue[0].x, queue[0].y));
        while (queue.length) {
          const cell = queue.shift();
          for (const next of [
            { x: cell.x + 1, y: cell.y }, { x: cell.x - 1, y: cell.y },
            { x: cell.x, y: cell.y + 1 }, { x: cell.x, y: cell.y - 1 }
          ]) {
            const nextKey = key(next.x, next.y);
            if (!openSet.has(nextKey) || visited.has(nextKey)) continue;
            visited.add(nextKey);
            queue.push(next);
          }
        }
        const colliders = allLevelPropColliders(false).filter(item => !item.dynamicDoor);
        const colliderSymmetry = colliders.map(collider => {
          const mirrorX = MAP_W - collider.x;
          const counterpart = colliders.find(other => other !== collider
            && Math.abs(other.x - mirrorX) <= 0.06
            && Math.abs(other.y - collider.y) <= 0.06
            && other.shape === collider.shape
            && Math.abs((other.radius || 0) - (collider.radius || 0)) <= 0.04
            && Math.abs((other.halfWidth || 0) - (collider.halfWidth || 0)) <= 0.04
            && Math.abs((other.halfDepth || 0) - (collider.halfDepth || 0)) <= 0.04);
          const selfMirrored = Math.abs(collider.x - mirrorX) <= 0.06;
          return { kind: collider.kind || collider.shape, x: collider.x, y: collider.y, mirrorX, matched: selfMirrored || Boolean(counterpart) };
        });
        const allSpawns = [...(spawnPoints[TEAM_BLUE] || []), ...(spawnPoints[TEAM_RED] || [])];
        const destinations = [
          ...(arena.hotspots || []),
          ...(arena.engagementPlans || []).flatMap(plan => [...(plan.blue || []), ...(plan.red || [])])
        ];
        const destinationChecks = destinations.map((goal, index) => {
          const clear = canStandForNavigation(goal.x, goal.y, BOT_RADIUS);
          const reachableFromAllSpawns = allSpawns.every(spawn => Boolean(findPath(spawn, goal)?.length));
          return { index, goal: { x: goal.x, y: goal.y }, clear, reachableFromAllSpawns };
        });
        const elevations = open.filter((_, index) => index % 17 === 0).map(cell => arenaElevationAt(cell.x + 0.5, cell.y + 0.5, 'dune'));
        const engagement = window.__strikeDebug.engagementPlanAuditForTest('dune');
        const graph = typeof navigationGraphSnapshot === 'function' ? navigationGraphSnapshot() : null;
        const propCollision = auditLevelPropCollision();
        const torchAnchors = (LEVEL_DECOR_LAYOUT.torches || []).map((torch, index) => {
          const yaw = torch.yaw || 0;
          const wallSample = localToWorld(torch.x, torch.z, yaw, 0, -0.08);
          const openSample = localToWorld(torch.x, torch.z, yaw, 0, 0.26);
          const wallBacked = isWall(wallSample.x, wallSample.z);
          const frontClear = !isWall(openSample.x, openSample.z);
          return {
            index,
            x: torch.x,
            z: torch.z,
            wallBacked,
            frontClear,
            attached: wallBacked && frontClear
          };
        });
        const supportKinds = new Set(['canopy-post', 'arch-post', 'banner-post']);
        const supportOverlaps = [];
        const structuralSupports = colliders.filter(collider => supportKinds.has(collider.kind));
        const canopyPosts = structuralSupports.filter(collider => collider.kind === 'canopy-post');
        const bannerPosts = structuralSupports.filter(collider => collider.kind === 'banner-post');
        const ordinaryProps = colliders.filter(collider => !supportKinds.has(collider.kind));
        for (const post of structuralSupports) {
          for (const prop of ordinaryProps) {
            const supportRadius = post.shape === 'circle' ? (post.radius || 0.055) : Math.max(post.halfWidth || 0.11, post.halfDepth || 0.16);
            if (!circleIntersectsLevelProp(post.x, post.y, supportRadius + 0.03, prop)) continue;
            supportOverlaps.push({
              support: { kind: post.kind, x: post.x, y: post.y },
              prop: { kind: prop.kind || prop.shape, x: prop.x, y: prop.y }
            });
          }
        }
        const supportPairOverlaps = [];
        for (let index = 0; index < structuralSupports.length; index++) {
          const support = structuralSupports[index];
          const supportRadius = support.shape === 'circle' ? (support.radius || 0.055) : Math.max(support.halfWidth || 0.11, support.halfDepth || 0.16);
          for (let otherIndex = index + 1; otherIndex < structuralSupports.length; otherIndex++) {
            const other = structuralSupports[otherIndex];
            if (!circleIntersectsLevelProp(support.x, support.y, supportRadius + 0.018, other)) continue;
            supportPairOverlaps.push({
              support: { kind: support.kind, x: support.x, y: support.y },
              other: { kind: other.kind, x: other.x, y: other.y }
            });
          }
        }
        const bannerSupportChecks = (LEVEL_DECOR_LAYOUT.banners || []).map((banner, index) => {
          const expected = duneBannerMastPoint(banner);
          const collider = bannerPosts.find(post => Math.abs(post.x - expected.x) <= 0.002 && Math.abs(post.y - expected.y) <= 0.002);
          return {
            index,
            mount: banner.mount || 'standard',
            x: banner.x,
            z: banner.z,
            mast: { x: expected.x, y: expected.y },
            colliderPresent: Boolean(collider),
            grounded: (banner.mount || 'standard') === 'standard' && Boolean(collider)
          };
        });
        const archAttachmentChecks = (LEVEL_DECOR_LAYOUT.arches || []).map((arch, index) => ({
          index,
          x: arch.x,
          z: arch.z,
          landmark: Boolean(arch.landmark),
          ...duneArchAttachmentSnapshot(arch)
        }));
        const routeBands = [
          { id: 'north-rampart', start: { x: 5.5, y: 4.5 }, goal: { x: 30.5, y: 4.5 } },
          { id: 'central-transit', start: { x: 5.5, y: 9.5 }, goal: { x: 30.5, y: 9.5 } },
          { id: 'south-bazaar', start: { x: 5.5, y: 20.5 }, goal: { x: 30.5, y: 20.5 } },
          { id: 'west-flank', start: { x: 5.5, y: 4.5 }, goal: { x: 5.5, y: 20.5 } },
          { id: 'east-flank', start: { x: 30.5, y: 4.5 }, goal: { x: 30.5, y: 20.5 } }
        ].map(route => {
          const path = findPath(route.start, route.goal);
          return { ...route, nodes: path?.length || 0, ok: Boolean(path?.length) };
        });
        const decor = {
          canopies: (LEVEL_DECOR_LAYOUT.canopies || []).length,
          arches: (LEVEL_DECOR_LAYOUT.arches || []).length,
          banners: (LEVEL_DECOR_LAYOUT.banners || []).length,
          mosaics: (LEVEL_DECOR_LAYOUT.mosaics || []).length,
          rubble: (LEVEL_DECOR_LAYOUT.rubble || []).length,
          torches: (LEVEL_DECOR_LAYOUT.torches || []).length
        };
        const decorRichnessOk = decor.canopies >= 4
          && decor.arches >= 6
          && decor.banners >= 6
          && decor.mosaics >= 6
          && decor.rubble >= 8
          && decor.torches >= 6;
        buildWorldBatches();
        const presentation = {
          canopies: worldBatches.desertCanopies?.length || 0,
          arches: worldBatches.desertArches?.length || 0,
          banners: worldBatches.desertBanners?.length || 0,
          mosaics: worldBatches.desertMosaics?.length || 0,
          rubble: worldBatches.desertRubble?.length || 0,
          torches: worldBatches.desertTorches?.length || 0,
          crenels: worldBatches.desertCrenels?.length || 0,
          backdrop: worldBatches.desertBackdrop?.length || 0
        };
        const presentationBatchesOk = presentation.canopies === decor.canopies
          && presentation.arches === decor.arches
          && presentation.banners === decor.banners
          && presentation.mosaics === decor.mosaics
          && presentation.rubble === decor.rubble
          && presentation.torches === decor.torches
          && presentation.crenels >= 70
          && presentation.backdrop >= 8;
        result = {
          arenaId: arena.id,
          name: arena.name,
          dimensions: { width, height },
          rowSymmetry,
          layoutSymmetric: rowSymmetry.every(row => row.symmetric),
          openCells: open.length,
          reachableOpenCells: visited.size,
          oneLayoutComponent: open.length > 0 && visited.size === open.length,
          oneFloor: !arena.vertical && elevations.every(value => Math.abs(value) < 0.001),
          stairCount: (arena.props?.stairs || []).length,
          doorCount: (arena.props?.doors || []).length,
          colliderSymmetry,
          collidersSymmetric: colliderSymmetry.every(item => item.matched),
          destinationChecks,
          allDestinationsClearAndReachable: destinationChecks.every(item => item.clear && item.reachableFromAllSpawns),
          engagement,
          graph,
          oneNavigationComponent: graph?.components === 1,
          propCollision,
          torchAnchors,
          allTorchesWallMounted: torchAnchors.every(torch => torch.attached),
          supportOverlaps,
          supportPairOverlaps,
          canopySupportsClear: supportOverlaps.every(item => item.support.kind !== 'canopy-post')
            && supportPairOverlaps.every(item => item.support.kind !== 'canopy-post' && item.other.kind !== 'canopy-post'),
          allDecorSupportsClear: supportOverlaps.length === 0 && supportPairOverlaps.length === 0,
          bannerSupportChecks,
          allBannersGrounded: bannerSupportChecks.length > 0 && bannerSupportChecks.every(check => check.grounded),
          archAttachmentChecks,
          allArchDecorAttached: archAttachmentChecks.every(check => check.innerLintelAttached && check.landmarkBackingAttached && check.landmarkEmblemAttached),
          routeBands,
          allCombatBandsConnected: routeBands.every(route => route.ok),
          decor,
          decorRichnessOk,
          presentation,
          presentationBatchesOk,
          ok: rowSymmetry.every(row => row.symmetric)
            && open.length > 0
            && visited.size === open.length
            && !arena.vertical
            && elevations.every(value => Math.abs(value) < 0.001)
            && (arena.props?.stairs || []).length === 0
            && (arena.props?.doors || []).length === 0
            && colliderSymmetry.every(item => item.matched)
            && destinationChecks.every(item => item.clear && item.reachableFromAllSpawns)
            && Boolean(engagement?.ok)
            && graph?.components === 1
            && Boolean(propCollision?.ok)
            && torchAnchors.every(torch => torch.attached)
            && supportOverlaps.length === 0
            && supportPairOverlaps.length === 0
            && bannerSupportChecks.length === (LEVEL_DECOR_LAYOUT.banners || []).length
            && bannerSupportChecks.every(check => check.grounded)
            && archAttachmentChecks.every(check => check.innerLintelAttached && check.landmarkBackingAttached && check.landmarkEmblemAttached)
            && routeBands.every(route => route.ok)
            && decorRichnessOk
            && presentationBatchesOk
        };
      } finally {
        setActiveArena(previousArena);
      }
      return result;
    },
    setArenaForTest: (arenaId = 'citadel', recreate = true) => {
      const id = arenaMeta(String(arenaId || 'citadel')).id;
      clubTacticsState().arenaId = id;
      setActiveArena(id);
      if (recreate) createMatch();
      if (typeof updateTacticalMinimap === 'function') updateTacticalMinimap(true);
      return { arena: activeArenaMeta(), minimap: typeof tacticalMinimapForTest === 'function' ? tacticalMinimapForTest() : null };
    },
    minimap: () => typeof tacticalMinimapForTest === 'function' ? tacticalMinimapForTest() : null,
    toggleMinimapForTest: (visible = undefined) => {
      if (typeof setTacticalMinimapVisible !== 'function') return null;
      const next = visible === undefined ? !tacticalMinimapVisible : Boolean(visible);
      setTacticalMinimapVisible(next, false);
      if (next) drawTacticalMinimap(true);
      return tacticalMinimapForTest();
    },
    diagnostics: () => ({
      active: Boolean(matchDiagnostics),
      overlayVisible: Boolean(diagnosticOverlayVisible),
      samples: matchDiagnostics?.samples?.length || 0,
      events: matchDiagnostics?.events?.length || 0,
      summary: matchDiagnostics?.summary || null,
      storedSummaries: typeof diagnosticStoredSummaries === 'function' ? diagnosticStoredSummaries() : []
    }),
    diagnosticsExportForTest: () => typeof diagnosticBuildExportPayload === 'function' ? diagnosticBuildExportPayload(matchDiagnostics) : null,
    diagnosticEventRetentionForTest: () => {
      const previousDiagnostics = matchDiagnostics;
      const previousRound = roundNumber;
      let result;
      try {
        roundNumber = 1;
        matchDiagnostics = {
          schema: 1,
          startSimulationTime: simulationClock,
          events: [],
          eventCursor: 0,
          eventsWrapped: false,
          nextEventSequence: 1,
          eventCounts: {},
          eventOverflowCount: 0,
          aggregates: {},
          zoneAnalytics: {},
          completed: false
        };
        for (let index = 0; index < DIAGNOSTIC_MAX_EVENTS + 25; index++) diagnosticLogEvent('test_repeated');
        diagnosticLogEvent('round_started');
        diagnosticLogEvent('round_finished');
        const orderedEvents = typeof diagnosticOrderedEvents === 'function' ? diagnosticOrderedEvents(matchDiagnostics) : matchDiagnostics.events.slice();
        const retained = diagnosticEventCounts(orderedEvents);
        result = {
          maximumEvents: DIAGNOSTIC_MAX_EVENTS,
          retainedEvents: orderedEvents.length,
          firstSequence: orderedEvents[0]?.sequence || null,
          lastSequence: orderedEvents[orderedEvents.length - 1]?.sequence || null,
          ordered: orderedEvents.every((event, index) => index === 0 || event.sequence > orderedEvents[index - 1].sequence),
          overflowCount: matchDiagnostics.eventOverflowCount,
          cumulativeRepeated: matchDiagnostics.eventCounts.test_repeated || 0,
          retainedRepeated: retained.test_repeated || 0,
          cumulativeRoundStarted: matchDiagnostics.eventCounts.round_started || 0,
          cumulativeRoundFinished: matchDiagnostics.eventCounts.round_finished || 0,
          counterEventsSummaryOnly: ['pathFailures', 'targetSwitches', 'tacticalRepositions', 'summitLayerRotations', 'tacticalFlankRoutes'].every(key => DIAGNOSTIC_SUMMARY_ONLY_COUNTERS.has(key)),
          ok: orderedEvents.length === DIAGNOSTIC_MAX_EVENTS
            && orderedEvents.every((event, index) => index === 0 || event.sequence > orderedEvents[index - 1].sequence)
            && matchDiagnostics.eventOverflowCount === 27
            && matchDiagnostics.eventCounts.test_repeated === DIAGNOSTIC_MAX_EVENTS + 25
            && matchDiagnostics.eventCounts.round_started === 1
            && matchDiagnostics.eventCounts.round_finished === 1
        };
      } finally {
        matchDiagnostics = previousDiagnostics;
        roundNumber = previousRound;
      }
      return result;
    },
    performanceDiagnosticsForTest: () => typeof diagnosticBuildPerformanceReport === 'function' ? diagnosticBuildPerformanceReport(matchDiagnostics) : null,
    performanceClassificationForTest: () => {
      const previousDiagnostics = matchDiagnostics;
      const previousState = appState;
      try {
        matchDiagnostics = {
          schema: 1,
          startSimulationTime: simulationClock,
          events: [], eventCursor: 0, eventsWrapped: false, nextEventSequence: 1,
          eventCounts: {}, eventOverflowCount: 0,
          samples: [], sampleCursor: 0, samplesWrapped: false,
          aggregates: {}, zoneAnalytics: {}, completed: false,
          performance: diagnosticEmptyPerformanceState()
        };
        appState = 'match';
        diagnosticRecordPerformanceFrame(4321, 11, 9, 2, { bots: 4, diagnostics: 1 });
        diagnosticRecordPerformanceFrame(16, 4596, 4595, 1, { bots: 4580, diagnostics: 10 });
        const report = diagnosticBuildPerformanceReport(matchDiagnostics);
        return {
          schedulingGaps: report?.overall?.schedulingGaps || 0,
          largestSchedulingGapMs: report?.overall?.largestSchedulingGapMs || 0,
          activeUpdateStalls: report?.overall?.activeUpdateStallsOver100Ms || 0,
          activeFrames: report?.overall?.frames || 0,
          breakdown: report?.overall?.updateBreakdown || {},
          ok: report?.overall?.schedulingGaps === 1
            && report?.overall?.largestSchedulingGapMs === 4321
            && report?.overall?.activeUpdateStallsOver100Ms === 1
            && report?.overall?.frames === 1
        };
      } finally {
        appState = previousState;
        matchDiagnostics = previousDiagnostics;
      }
    },
    navigationPlannerForTest: () => typeof navigationPlannerSnapshot === 'function' ? navigationPlannerSnapshot() : null,
    botWorkBudgetForTest: () => {
      if (typeof beginBotWorkFrame !== 'function' || typeof consumeBotPerceptionSlot !== 'function' || typeof consumeBotTacticalSlot !== 'function') return { ok: false, reason: 'bot work budget unavailable' };
      const beforePerception = Number(combatDebug.perceptionScanDeferrals) || 0;
      const beforeTactical = Number(combatDebug.tacticalDecisionDeferrals) || 0;
      beginBotWorkFrame();
      let perceptionAccepted = 0;
      let tacticalAccepted = 0;
      for (let index = 0; index < 12; index++) {
        if (consumeBotPerceptionSlot(null, false)) perceptionAccepted++;
        if (consumeBotTacticalSlot(null, false)) tacticalAccepted++;
      }
      const first = botWorkBudgetSnapshot();
      beginBotWorkFrame();
      const reset = botWorkBudgetSnapshot();
      return {
        ok: perceptionAccepted === first.perception.budget
          && tacticalAccepted === first.tactical.budget
          && first.perceptionDeferrals > beforePerception
          && first.tacticalDeferrals > beforeTactical
          && reset.perception.used === 0
          && reset.tactical.used === 0,
        perceptionAccepted,
        tacticalAccepted,
        first,
        reset
      };
    },
    combatRouteBudgetForTest: () => {
      const actor = bots.find(bot => bot.team === TEAM_BLUE) || null;
      const enemy = bots.find(bot => actor && bot.team !== actor.team) || null;
      const lane = debugCombatTestLane();
      if (!actor || !enemy || !lane) return { ok: false, reason: 'test lane unavailable' };
      const snapshot = snapshotCombatTestBots();
      const beforePlans = Number(combatDebug.navigationPlansExecuted) || 0;
      const beforeSearches = Number(combatDebug.combatRouteSearches) || 0;
      const beforeCandidates = Number(combatDebug.combatRouteCandidateEvaluations) || 0;
      try {
        for (const bot of bots) bot.alive = bot === actor || bot === enemy;
        actor.x = lane[0].x; actor.y = lane[0].y;
        enemy.x = lane[2].x; enemy.y = lane[2].y;
        actor.angle = Math.atan2(enemy.y - actor.y, enemy.x - actor.x);
        actor.pathAngle = actor.angle;
        actor.target = enemy;
        if (typeof beginNavigationPlanningFrame === 'function') beginNavigationPlanningFrame();
        if (typeof beginBotWorkFrame === 'function') beginBotWorkFrame();
        const route = actor.findCombatApproachRoute(enemy, { tacticalFlank: true, alternate: 1 });
        const planDelta = (Number(combatDebug.navigationPlansExecuted) || 0) - beforePlans;
        const searchDelta = (Number(combatDebug.combatRouteSearches) || 0) - beforeSearches;
        return {
          ok: planDelta <= 1 && searchDelta <= 1,
          route: route ? { nodes: route.path.length, goal: route.goal, score: route.score } : null,
          planDelta,
          searchDelta,
          candidates: (Number(combatDebug.combatRouteCandidateEvaluations) || 0) - beforeCandidates
        };
      } finally {
        restoreCombatTestBots(snapshot);
      }
    },
    teamSpacingForTest: () => {
      const actor = bots.find(bot => bot.team === TEAM_BLUE) || null;
      const mates = bots.filter(bot => actor && bot !== actor && bot.team === actor.team).slice(0, 2);
      const lane = debugCombatTestLane();
      if (!actor || mates.length < 2 || !lane) return { ok: false, reason: 'test lane unavailable' };
      const snapshot = snapshotCombatTestBots();
      const beforeActions = Number(combatDebug.teamSpacingCorrections) || 0;
      try {
        for (const bot of bots) bot.alive = bot === actor || mates.includes(bot);
        actor.x = lane[1].x; actor.y = lane[1].y;
        mates[0].x = actor.x + 0.34; mates[0].y = actor.y;
        mates[1].x = actor.x + 0.18; mates[1].y = actor.y + 0.26;
        actor.teamPriorityId = 'trade';
        actor.spacingBias = 0;
        actor.teamSpacingTimer = 0;
        actor.teamSpacingCooldown = 0;
        const before = Math.min(...mates.map(mate => dist(actor, mate)));
        for (let frame = 0; frame < 45; frame++) actor.resolveLocalTeamSpacing(1 / 60, null);
        const after = Math.min(...mates.map(mate => dist(actor, mate)));
        const gaps = {};
        for (const priority of ['group', 'trade', 'hold', 'flank']) {
          actor.teamPriorityId = priority;
          gaps[priority] = actor.teamSpacingProfile(false).desiredGap;
        }
        const orderedTacticalGaps = gaps.group < gaps.trade && gaps.trade < gaps.hold && gaps.hold < gaps.flank;
        return {
          ok: after > before + 0.16
            && orderedTacticalGaps
            && gaps.group >= 0.8
            && (Number(combatDebug.teamSpacingCorrections) || 0) > beforeActions,
          before: Number(before.toFixed(3)),
          after: Number(after.toFixed(3)),
          gaps: Object.fromEntries(Object.entries(gaps).map(([key, value]) => [key, Number(value.toFixed(2))])),
          orderedTacticalGaps,
          actions: (Number(combatDebug.teamSpacingCorrections) || 0) - beforeActions
        };
      } finally {
        restoreCombatTestBots(snapshot);
      }
    },
    rangeCompatibilityForTest: engagementId => typeof clubWeaponRangeCompatibility === 'function' ? clubWeaponRangeCompatibility(engagementId || clubTacticsState().engagementId) : null,
    matchViewportForTest: () => ({ appState, viewMode, dpr: DPR, width: canvas.width, height: canvas.height, clientWidth: Math.round(canvas.getBoundingClientRect().width), clientHeight: Math.round(canvas.getBoundingClientRect().height), portraitWindowed: typeof portraitWindowedRenderMode === 'function' ? portraitWindowedRenderMode() : false }),
    diagnosticsPerformanceFrameForTest: (frameIntervalMs = 16.667, frameWorkMs = 8, updateMs = 3, renderMs = 5, stages = null) => typeof diagnosticRecordPerformanceFrame === 'function' ? diagnosticRecordPerformanceFrame(frameIntervalMs, frameWorkMs, updateMs, renderMs, stages) : null,
    diagnosticsCaptureForTest: () => typeof diagnosticCaptureSample === 'function' ? diagnosticCaptureSample(true) : null,
    diagnosticsStepForTest: (seconds = 1, fixedDt = 1 / 30) => {
      const total = clamp(Number(seconds) || 0, 0, 120);
      const dt = clamp(Number(fixedDt) || 1 / 30, 1 / 240, 0.033);
      const frames = Math.ceil(total / dt);
      for (let index = 0; index < frames; index++) {
        if (typeof beginNavigationPlanningFrame === 'function') beginNavigationPlanningFrame();
        if (typeof beginBotWorkFrame === 'function') beginBotWorkFrame();
        updateMatchStep(dt);
      }
      render();
      return { frames, state: window.__strikeDebug.diagnostics() };
    },
    diagnosticsToggleOverlayForTest: () => typeof toggleDiagnosticOverlay === 'function' ? toggleDiagnosticOverlay() : false,
    performance: () => ({
      frames: runtimePerformance.frames,
      averageFrameMs: Math.round(runtimePerformance.frameMs * 100) / 100,
      averageFrameIntervalMs: Math.round(runtimePerformance.frameIntervalMs * 100) / 100,
      estimatedFps: runtimePerformance.frameIntervalMs > 0 ? Math.round(10000 / runtimePerformance.frameIntervalMs) / 10 : null,
      averageUpdateMs: Math.round(runtimePerformance.updateMs * 100) / 100,
      averageRenderMs: Math.round(runtimePerformance.renderMs * 100) / 100,
      peakFrameMs: Math.round(runtimePerformance.peakFrameMs * 100) / 100,
      peakFrameIntervalMs: Math.round(runtimePerformance.peakFrameIntervalMs * 100) / 100,
      longFrames: runtimePerformance.longFrames,
      stutterFrames: runtimePerformance.stutterFrames,
      severeFrames: runtimePerformance.severeFrames,
      skippedMenuRenders: runtimePerformance.skippedMenuRenders,
      hudRateHz: 20,
      menuRenderCapHz: 30,
      qualityTier: runtimeQualityTier,
      qualityLabel: typeof runtimeQualityLabel === 'function' ? runtimeQualityLabel() : String(runtimeQualityTier),
      qualityPressure: runtimeQualityPressure,
      qualityRecovery: runtimeQualityRecovery,
      hardwareConcurrency: runtimeHardwareConcurrency,
      deviceMemoryGb: runtimeDeviceMemoryGb || null,
      matchSpeed: matchSpeedMultiplier,
      matchClock: matchClockSnapshot(),
      damageNumbers: damageNumberEffects.length,
      damageNumbersSpawned: combatDebug.damageNumbersSpawned,
      damageNumbersExpired: combatDebug.damageNumbersExpired,
      criticalHitsDealt: combatDebug.criticalHitsDealt,
      criticalHitsByTeam: [...combatDebug.criticalHitsByTeam],
      criticalEliminationsByTeam: [...combatDebug.criticalEliminationsByTeam],
      headshotsDealt: combatDebug.headshotsDealt,
      headshotsByTeam: [...combatDebug.headshotsByTeam],
      headshotEliminationsByTeam: [...combatDebug.headshotEliminationsByTeam],
      criticalHeadshots: combatDebug.criticalHeadshots,
      feedItems: feed.length,
      soundEvents: soundEvents.length,
      sprintingBots: bots.filter(bot => bot.alive && bot.isSprinting).length,
      sprintFootsteps: combatDebug.sprintFootstepsEmitted,
      maxFootstepRadius: Math.round((combatDebug.maxFootstepRadius || 0) * 10) / 10,
      stalemateBreaks: combatDebug.stalemateBreaks,
      targetSwitches: combatDebug.targetSwitches,
      closeThreatOverrides: combatDebug.closeThreatOverrides,
      operatorBlockedShots: combatDebug.operatorBlockedShots,
      combatStallRecoveries: combatDebug.combatStallRecoveries,
      combatApproachRoutes: combatDebug.combatApproachRoutes,
      combatYieldActions: combatDebug.combatYieldActions,
      combatRecoveryEscalations: combatDebug.combatRecoveryEscalations,
      combatRecoverySuccesses: combatDebug.combatRecoverySuccesses,
      crouchStallRecoveries: combatDebug.crouchStallRecoveries,
      coordinationWaitCommits: combatDebug.coordinationWaitCommits,
      navigationRecoveries: combatDebug.navigationRecoveries,
      navigationPlansExecuted: combatDebug.navigationPlansExecuted,
      navigationPlanDeferrals: combatDebug.navigationPlanDeferrals,
      navigationPathHoldReuses: combatDebug.navigationPathHoldReuses,
      perceptionScanDeferrals: combatDebug.perceptionScanDeferrals,
      tacticalDecisionDeferrals: combatDebug.tacticalDecisionDeferrals,
      combatRouteSearches: combatDebug.combatRouteSearches,
      combatRoutePlanDeferrals: combatDebug.combatRoutePlanDeferrals,
      combatRouteCandidateEvaluations: combatDebug.combatRouteCandidateEvaluations,
      teamSpacingCorrections: combatDebug.teamSpacingCorrections,
      teamLaneSeparations: combatDebug.teamLaneSeparations,
      navigationPlanner: typeof navigationPlannerSnapshot === 'function' ? navigationPlannerSnapshot() : null,
      botWorkBudget: typeof botWorkBudgetSnapshot === 'function' ? botWorkBudgetSnapshot() : null,
      doorOpenEvents: combatDebug.doorOpenEvents,
      spectatorAutoHandoffs: combatDebug.spectatorAutoHandoffs,
      engagementPlansSelected: combatDebug.engagementPlansSelected,
      activeDoors: ACTIVE_DOOR_STATES.length,
      tracers: tracers.length
    }),
    damageNumberForTest: (amount = 12, incoming = false, fatal = false, critical = false, headshot = false) => {
      const viewed = bots[spectatorIndex] || bots.find(bot => bot.team === CAREER_OWNED_TEAM) || null;
      const opponent = bots.find(bot => bot.team !== CAREER_OWNED_TEAM && bot.alive) || bots.find(bot => bot.team !== CAREER_OWNED_TEAM) || null;
      if (!viewed || !opponent) return false;
      return incoming
        ? spawnDamageNumber(opponent, viewed, Math.max(1, Number(amount) || 1), Boolean(fatal), Boolean(critical), Boolean(headshot))
        : spawnDamageNumber(viewed, opponent, Math.max(1, Number(amount) || 1), Boolean(fatal), Boolean(critical), Boolean(headshot));
    },
    enemyCriticalProfileForTest: (slot = 0, randomValue = 0) => {
      const safeSlot = clamp(Math.floor(Number(slot) || 0), 0, 4);
      const enemy = bots.find(bot => bot.team === TEAM_RED && bot.slot === safeSlot) || bots.find(bot => bot.team === TEAM_RED) || null;
      if (!enemy) return null;
      const profile = refreshCriticalCombatProfile(enemy);
      const roll = clamp(Number(randomValue) || 0, 0, 0.999999);
      return {
        slot: enemy.slot,
        name: enemy.name,
        source: enemy.buildSource,
        weapon: enemy.weapon?.name || enemy.primaryWeapon?.name || 'UNKNOWN',
        stats: { ...(enemy.rpgStats || enemy.simulatedStats || {}) },
        chance: Math.round(profile.chance * 10000) / 10000,
        bonusDamage: Math.round(profile.bonusDamage * 10000) / 10000,
        multiplier: Math.round(profile.multiplier * 10000) / 10000,
        roll,
        critical: rollCriticalHit(enemy, roll)
      };
    },
    headshotProfileForTest: (playerId = '', weaponId = '', distance = 4, recoilPenalty = 0, crouched = false, randomValue = 0) => {
      const player = teamPlayerById(String(playerId || '')) || careerState.squad?.[0] || null;
      const weapon = getCareerWeapon(CAREER_WEAPON_CATALOG[weaponId] ? weaponId : (player?.equippedWeaponId || 'scrap-p12'));
      const testBot = {
        rpgStats: player?.stats || defaultCareerStats(),
        weapon, primaryWeapon: weapon, crouched: Boolean(crouched)
      };
      const roll = rollHeadshot(testBot, Math.max(0, Number(distance) || 0), Math.max(0, Number(recoilPenalty) || 0), clamp(Number(randomValue) || 0, 0, 0.999999));
      return { playerId: player?.id || null, weaponId: weapon.id, ...roll };
    },
    combinedHitDamageForTest: (baseDamage = 20, playerId = '', weaponId = '', headshot = false, critical = false) => {
      const player = teamPlayerById(String(playerId || '')) || careerState.squad?.[0] || null;
      const weapon = getCareerWeapon(CAREER_WEAPON_CATALOG[weaponId] ? weaponId : (player?.equippedWeaponId || 'scrap-p12'));
      const crit = criticalCombatProfile(player?.stats || defaultCareerStats(), weapon);
      const head = headshotCombatProfile({ rpgStats: player?.stats || defaultCareerStats(), weapon, primaryWeapon: weapon }, 4, 0);
      const base = Math.max(0, Number(baseDamage) || 0);
      return {
        playerId: player?.id || null, weaponId: weapon.id, baseDamage: base,
        headshot: Boolean(headshot), critical: Boolean(critical),
        headshotMultiplier: head.multiplier, criticalMultiplier: crit.multiplier,
        damage: base * (headshot ? head.multiplier : 1) * (critical ? crit.multiplier : 1)
      };
    },
    foundationBalanceForTest: () => typeof leagueFoundationBalanceProfile === 'function' ? leagueFoundationBalanceProfile() : null,
    foundationOpponentForTest: () => Array.from({ length: TEAM_REQUIRED_STARTERS }, (_, slot) => {
      const player = typeof leagueOpponentPlayerForSlot === 'function' ? leagueOpponentPlayerForSlot(slot) : null;
      return player ? { slot, id: player.id, name: player.name, overall: teamPlayerOverall(player), foundationBalanced: Boolean(player.foundationBalanced) } : null;
    }).filter(Boolean),
    portraitPerformanceForTest: () => ({
      portrait: window.innerHeight >= window.innerWidth, viewMode, appState, nativeDpr: window.devicePixelRatio || 1,
      effectiveDpr: DPR, resolutionScale: renderResolutionScale, targetScale: renderResolutionTarget,
      changes: renderResolutionChanges, pressure: renderPerformancePressure, recovery: renderPerformanceRecovery,
      qualityTier: runtimeQualityTier, qualityLabel: typeof runtimeQualityLabel === 'function' ? runtimeQualityLabel() : String(runtimeQualityTier),
      qualityPressure: runtimeQualityPressure, qualityRecovery: runtimeQualityRecovery,
      frameMs: runtimePerformance.frameMs, renderMs: runtimePerformance.renderMs, updateMs: runtimePerformance.updateMs,
      longFrames: runtimePerformance.longFrames, canvasWidth: canvas.width, canvasHeight: canvas.height
    }),
    runtimeQualityGovernorForTest: (frameMs = 34, updateMs = 12, renderMs = 16, frames = 70) => {
      const preserved = {
        appState, tier: runtimeQualityTier, pressure: runtimeQualityPressure, recovery: runtimeQualityRecovery,
        changedAt: runtimeQualityLastChangedAt, scale: renderResolutionScale, target: renderResolutionTarget,
        changes: renderResolutionChanges
      };
      const before = { tier: runtimeQualityTier, label: runtimeQualityLabel(), scale: renderResolutionScale, target: renderResolutionTarget };
      let after;
      try {
        appState = 'match';
        runtimeQualityPressure = 0;
        runtimeQualityRecovery = 0;
        runtimeQualityLastChangedAt = -99999;
        for (let i = 0; i < Math.max(1, Math.floor(Number(frames) || 1)); i++) {
          updateRuntimeQualityGovernor(Number(frameMs) || 0, Number(updateMs) || 0, Number(renderMs) || 0);
        }
        after = {
          tier: runtimeQualityTier, label: runtimeQualityLabel(), scale: renderResolutionScale,
          target: renderResolutionTarget, pressure: runtimeQualityPressure, recovery: runtimeQualityRecovery
        };
      } finally {
        appState = preserved.appState;
        runtimeQualityTier = preserved.tier;
        runtimeQualityPressure = preserved.pressure;
        runtimeQualityRecovery = preserved.recovery;
        runtimeQualityLastChangedAt = preserved.changedAt;
        renderResolutionScale = preserved.scale;
        renderResolutionTarget = preserved.target;
        renderResolutionChanges = preserved.changes;
        resize();
      }
      return { before, after, lowered: after.tier < before.tier || after.target < before.target, stateRestored: appState === preserved.appState && runtimeQualityTier === preserved.tier };
    },
    runtimeQualityProfileForTest: () => simulationQualityIndependenceForTest(),
    simulationQualityIndependenceForTest: () => simulationQualityIndependenceForTest(),
    simulationWorkPolicyForTest: () => simulationWorkPolicySnapshot(),
    matchClockForTest: () => matchClockSnapshot(),
    matchClockIntegrityForTest: () => matchClockIntegrityForTest(),
    matchClockModelForTest: (frames = [], speed = 1) => matchClockModelForTest(frames, speed),
    adaptiveResolutionForTest: (frameMs = 30, renderMs = 22, frames = 40) => {
      const before = { scale: renderResolutionScale, target: renderResolutionTarget, changes: renderResolutionChanges };
      for (let i = 0; i < Math.max(1, Math.floor(Number(frames) || 1)); i++) updateAdaptiveRenderResolution(Number(frameMs) || 0, Number(renderMs) || 0);
      return { before, after: { scale: renderResolutionScale, target: renderResolutionTarget, changes: renderResolutionChanges }, dpr: DPR };
    },
    criticalProfileForTest: (playerId = '', weaponId = '') => {
      const player = teamPlayerById(String(playerId || '')) || careerState.squad?.[0] || null;
      const weapon = getCareerWeapon(CAREER_WEAPON_CATALOG[weaponId] ? weaponId : (player?.equippedWeaponId || 'scrap-p12'));
      const profile = criticalCombatProfile(player?.stats || defaultCareerStats(), weapon);
      return { playerId: player?.id || null, weaponId: weapon.id, chance: profile.chance, bonusDamage: profile.bonusDamage, multiplier: profile.multiplier };
    },
    criticalDamageForTest: (baseDamage = 20, playerId = '', weaponId = '') => {
      const profile = window.__strikeDebug.criticalProfileForTest(playerId, weaponId);
      const base = Math.max(0, Number(baseDamage) || 0);
      return { ...profile, baseDamage: base, normalDamage: base, criticalDamage: base * profile.multiplier };
    },
    criticalMigrationForTest: (stats = {}) => {
      const migrated = normaliseGeneratedPlayer({
        id: 'CRIT-MIGRATION', name: 'Migration Test', stats,
        role: 'flex', secondaryRole: 'support', potential: 70,
        wage: 1000, contractWeeks: 52, career: {}
      }, 'CRIT-MIGRATION');
      return { stats: { ...migrated.stats }, overall: teamPlayerOverall(migrated) };
    },
    medical: () => ({
      rolls: combatDebug.injuriesRolled,
      injuries: combatDebug.injuriesSustained,
      players: (careerState.squad || []).map(player => ({
        id: player.id,
        name: player.name,
        fatigue: player.fatigue,
        resilience: player.stats?.resilience || 0,
        vulnerability: player.injuryVulnerability || 0,
        lastRisk: Math.round((player.lastInjuryRisk || 0) * 1000) / 10,
        status: typeof playerInjuryLabel === 'function' ? playerInjuryLabel(player) : 'FIT',
        weeksRemaining: player.injury?.weeksRemaining || 0,
        daysRemaining: player.injury?.recoveryDaysRemaining || 0
      }))
    }),
    stalemateBreakForTest: (lowHealth = false) => {
      const actor = bots.find(bot => bot.team === CAREER_OWNED_TEAM && bot.alive) || bots[0] || null;
      const enemy = bots.find(bot => actor && bot.team !== actor.team && bot.alive) || null;
      if (!actor || !enemy) return null;
      const snapshot = {
        combatCover: actor.combatCover,
        tacticalMode: actor.tacticalMode,
        wantsSafeReload: actor.wantsSafeReload,
        magAmmo: actor.magAmmo,
        health: actor.health,
        lastDamageTime: actor.lastDamageTime,
        stalemateTimer: actor.stalemateTimer,
        repositionCooldown: actor.repositionCooldown,
        coverHoldTimer: actor.coverHoldTimer,
        peekHoldTimer: actor.peekHoldTimer,
        tacticalDecisionTimer: actor.tacticalDecisionTimer,
        combatRepositionRequested: actor.combatRepositionRequested,
        lastTacticalReason: actor.lastTacticalReason,
        tacticalModeTimer: actor.tacticalModeTimer,
        enemyCombatCover: enemy.combatCover,
        enemyTacticalMode: enemy.tacticalMode,
        enemyWantsSafeReload: enemy.wantsSafeReload,
        enemyLastDamageTime: enemy.lastDamageTime,
        enemyHealth: enemy.health
      };
      const before = combatDebug.stalemateBreaks;
      actor.combatCover = { anchor: { x: actor.x, y: actor.y }, peek: { x: actor.x, y: actor.y }, enemyKey: enemy.name };
      enemy.combatCover = { anchor: { x: enemy.x, y: enemy.y }, peek: { x: enemy.x, y: enemy.y }, enemyKey: actor.name };
      actor.tacticalMode = 'hold';
      enemy.tacticalMode = 'hold';
      actor.wantsSafeReload = false;
      enemy.wantsSafeReload = false;
      actor.magAmmo = Math.max(4, actor.weapon?.magSize || 8);
      actor.health = lowHealth ? Math.max(1, (actor.maxHealth || 100) * 0.24) : Math.max(actor.health, (actor.maxHealth || 100) * 0.8);
      enemy.health = lowHealth ? Math.max(1, (enemy.maxHealth || 100) * 0.27) : Math.max(enemy.health, (enemy.maxHealth || 100) * 0.8);
      actor.lastDamageTime = simulationClock - 10;
      enemy.lastDamageTime = simulationClock - 10;
      actor.stalemateTimer = 0;
      for (let i = 0; i < 120; i++) actor.updateCombatStalemate(1 / 60, enemy);
      const result = {
        broken: combatDebug.stalemateBreaks > before,
        mode: actor.tacticalMode,
        reason: actor.lastTacticalReason,
        repositionRequested: actor.combatRepositionRequested
      };
      actor.combatCover = snapshot.combatCover;
      actor.tacticalMode = snapshot.tacticalMode;
      actor.wantsSafeReload = snapshot.wantsSafeReload;
      actor.magAmmo = snapshot.magAmmo;
      actor.health = snapshot.health;
      actor.lastDamageTime = snapshot.lastDamageTime;
      actor.stalemateTimer = snapshot.stalemateTimer;
      actor.repositionCooldown = snapshot.repositionCooldown;
      actor.coverHoldTimer = snapshot.coverHoldTimer;
      actor.peekHoldTimer = snapshot.peekHoldTimer;
      actor.tacticalDecisionTimer = snapshot.tacticalDecisionTimer;
      actor.combatRepositionRequested = snapshot.combatRepositionRequested;
      actor.lastTacticalReason = snapshot.lastTacticalReason;
      actor.tacticalModeTimer = snapshot.tacticalModeTimer;
      enemy.combatCover = snapshot.enemyCombatCover;
      enemy.tacticalMode = snapshot.enemyTacticalMode;
      enemy.wantsSafeReload = snapshot.enemyWantsSafeReload;
      enemy.lastDamageTime = snapshot.enemyLastDamageTime;
      enemy.health = snapshot.enemyHealth;
      return result;
    },
    closeThreatRetargetForTest: () => {
      const actor = bots.find(bot => bot.team === TEAM_BLUE) || null;
      const enemies = bots.filter(bot => actor && bot.team !== actor.team).slice(0, 2);
      const near = enemies[0] || null;
      const far = enemies[1] || null;
      const lane = debugCombatTestLane();
      if (!actor || !near || !far || !lane) return { ok: false, reason: 'test lane unavailable' };
      const snapshot = snapshotCombatTestBots();
      const beforeSwitches = combatDebug.targetSwitches;
      const beforeOverrides = combatDebug.closeThreatOverrides;
      try {
        for (const bot of bots) bot.alive = bot === actor || bot === near || bot === far;
        actor.x = lane[0].x; actor.y = lane[0].y;
        near.x = lane[1].x; near.y = lane[1].y;
        far.x = lane[2].x; far.y = lane[2].y;
        const heading = Math.atan2(far.y - actor.y, far.x - actor.x);
        actor.angle = heading; actor.pathAngle = heading;
        near.angle = Math.atan2(actor.y - near.y, actor.x - near.x);
        far.angle = Math.atan2(actor.y - far.y, actor.x - far.x);
        actor.target = far;
        actor.sightCandidate = far;
        actor.sightTime = actor.reactionDelay;
        actor.targetSwitchCooldown = 1;
        actor.tacticalEnemyKey = far.name;
        actor.engagementTargetKey = far.name;
        const blocker = actor.firstOperatorInLineOfFire(far);
        const selected = actor.updatePerception(1 / 60);
        return {
          ok: selected === near && actor.target === near,
          previous: far.name,
          selected: selected?.name || null,
          blocker: blocker?.name || null,
          nearDistance: dist(actor, near),
          farDistance: dist(actor, far),
          switches: combatDebug.targetSwitches - beforeSwitches,
          closeOverrides: combatDebug.closeThreatOverrides - beforeOverrides
        };
      } finally {
        restoreCombatTestBots(snapshot);
      }
    },
    staggeredPerceptionAcquisitionForTest: () => {
      const actor = bots.find(bot => bot.team === TEAM_BLUE) || null;
      const enemy = bots.find(bot => actor && bot.team !== actor.team) || null;
      const lane = debugCombatTestLane();
      if (!actor || !enemy || !lane) return { ok: false, reason: 'test lane unavailable' };
      const snapshot = snapshotCombatTestBots();
      const previousClock = simulationClock;
      try {
        for (const bot of bots) bot.alive = bot === actor || bot === enemy;
        actor.x = lane[0].x; actor.y = lane[0].y;
        enemy.x = lane[2].x; enemy.y = lane[2].y;
        actor.angle = Math.atan2(enemy.y - actor.y, enemy.x - actor.x);
        actor.pathAngle = actor.angle;
        enemy.angle = Math.atan2(actor.y - enemy.y, actor.x - enemy.x);
        actor.target = null;
        actor.sightCandidate = null;
        actor.sightTime = 0;
        actor.reactionDelay = 0.18;
        actor.targetSwitchCooldown = 0;
        actor.targetCommitUntil = 0;
        let acquiredFrame = null;
        let candidateAfterFirstScan = null;
        let candidateAfterSkippedScan = null;
        for (let frame = 0; frame < 40; frame++) {
          const fullScan = frame % 5 === 0;
          const selected = actor.updatePerception(1 / 60, fullScan);
          if (frame === 0) candidateAfterFirstScan = actor.sightCandidate?.name || null;
          if (frame === 1) candidateAfterSkippedScan = actor.sightCandidate?.name || null;
          simulationClock += 1 / 60;
          if (selected === enemy && actor.target === enemy) {
            acquiredFrame = frame;
            break;
          }
        }
        return {
          ok: candidateAfterFirstScan === enemy.name
            && candidateAfterSkippedScan === enemy.name
            && acquiredFrame !== null
            && acquiredFrame <= 20,
          candidateAfterFirstScan,
          candidateAfterSkippedScan,
          acquiredFrame,
          target: actor.target?.name || null,
          reactionDelay: actor.reactionDelay,
          sightTime: actor.sightTime
        };
      } finally {
        simulationClock = previousClock;
        restoreCombatTestBots(snapshot);
      }
    },
    operatorViewOcclusionForTest: () => {
      const actor = bots.find(bot => bot.team === TEAM_BLUE) || null;
      const friendly = bots.find(bot => actor && bot !== actor && bot.team === actor.team) || null;
      const enemy = bots.find(bot => actor && bot.team !== actor.team) || null;
      const lane = debugCombatTestLane();
      if (!actor || !friendly || !enemy || !lane) return { ok: false, reason: 'test lane unavailable' };
      const snapshot = snapshotCombatTestBots();
      const beforeOcclusions = combatDebug.operatorViewOcclusions;
      const beforeClearances = combatDebug.friendlyViewClearances;
      try {
        for (const bot of bots) bot.alive = bot === actor || bot === friendly || bot === enemy;
        actor.x = lane[0].x; actor.y = lane[0].y;
        friendly.x = lane[1].x; friendly.y = lane[1].y; friendly.crouched = false;
        enemy.x = lane[2].x; enemy.y = lane[2].y; enemy.crouched = false;
        actor.angle = Math.atan2(enemy.y - actor.y, enemy.x - actor.x);
        actor.pathAngle = actor.angle;
        actor.target = enemy;
        actor.lastSeen = { x: enemy.x, y: enemy.y };
        actor.lastSeenTimer = 2.35;
        const blocker = actor.firstOperatorOccludingView(enemy);
        const visibleThroughBody = actor.canVisuallySee(enemy, FOV * 1.24);
        friendly.crouched = true;
        const visibleOverCrouchedBody = actor.canVisuallySee(enemy, FOV * 1.24);
        friendly.crouched = false;
        const laneBearing = Math.atan2(enemy.y - actor.y, enemy.x - actor.x);
        friendly.x += Math.cos(laneBearing + Math.PI / 2) * 0.38;
        friendly.y += Math.sin(laneBearing + Math.PI / 2) * 0.38;
        const shoulderPeekVisible = actor.canVisuallySee(enemy, FOV * 1.24);
        friendly.x = lane[1].x; friendly.y = lane[1].y;
        actor.rememberViewOcclusion(enemy, blocker);
        const start = { x: actor.x, y: actor.y };
        for (let i = 0; i < 90 && actor.viewOcclusionTimer > 0; i++) actor.resolveFriendlyViewOcclusion(1 / 60);
        const displaced = dist(actor, start);
        return {
          ok: blocker === friendly && !visibleThroughBody && visibleOverCrouchedBody && shoulderPeekVisible && displaced > 0.18,
          blocker: blocker?.name || null,
          expected: friendly.name,
          visibleThroughBody,
          visibleOverCrouchedBody,
          shoulderPeekVisible,
          displaced: Math.round(displaced * 1000) / 1000,
          occlusions: combatDebug.operatorViewOcclusions - beforeOcclusions,
          clearances: combatDebug.friendlyViewClearances - beforeClearances,
          reason: actor.lastTacticalReason
        };
      } finally {
        restoreCombatTestBots(snapshot);
      }
    },
    operatorLineBlockerForTest: () => {
      const actor = bots.find(bot => bot.team === TEAM_BLUE) || null;
      const enemies = bots.filter(bot => actor && bot.team !== actor.team).slice(0, 2);
      const near = enemies[0] || null;
      const far = enemies[1] || null;
      const lane = debugCombatTestLane();
      if (!actor || !near || !far || !lane) return { ok: false, reason: 'test lane unavailable' };
      const snapshot = snapshotCombatTestBots();
      try {
        for (const bot of bots) bot.alive = bot === actor || bot === near || bot === far;
        actor.x = lane[0].x; actor.y = lane[0].y;
        near.x = lane[1].x; near.y = lane[1].y;
        far.x = lane[2].x; far.y = lane[2].y;
        actor.angle = Math.atan2(far.y - actor.y, far.x - actor.x);
        near.angle = Math.atan2(actor.y - near.y, actor.x - near.x);
        far.angle = Math.atan2(actor.y - far.y, actor.x - far.x);
        const blocker = actor.firstOperatorInLineOfFire(far);
        return { ok: blocker === near, blocker: blocker?.name || null, expected: near.name };
      } finally {
        restoreCombatTestBots(snapshot);
      }
    },
    combatStallRecoveryForTest: () => {
      const actor = bots.find(bot => bot.team === TEAM_BLUE) || null;
      const enemy = bots.find(bot => actor && bot.team !== actor.team) || null;
      const lane = debugCombatTestLane();
      if (!actor || !enemy || !lane) return { ok: false, reason: 'test lane unavailable' };
      const snapshot = snapshotCombatTestBots();
      const before = combatDebug.combatStallRecoveries;
      try {
        for (const bot of bots) bot.alive = bot === actor || bot === enemy;
        actor.x = lane[0].x; actor.y = lane[0].y;
        enemy.x = lane[2].x; enemy.y = lane[2].y;
        actor.angle = Math.atan2(enemy.y - actor.y, enemy.x - actor.x);
        actor.pathAngle = actor.angle;
        enemy.angle = Math.atan2(actor.y - enemy.y, actor.x - enemy.x);
        actor.target = enemy;
        actor.sightCandidate = enemy;
        actor.tacticalEnemyKey = enemy.name;
        actor.engagementTargetKey = enemy.name;
        actor.engagementIdleTimer = 0;
        actor.engagementLastShots = actor.roundShotsFired || 0;
        actor.engagementLastDamage = actor.roundDamageDealt || 0;
        actor.tacticalMode = 'hold';
        actor.tacticalDecisionTimer = 0;
        actor.combatMobilityTimer = 0;
        actor.crouched = true;
        actor.moveVelocity = 0;
        actor.reloadTimer = 0;
        actor.weaponSwapTimer = 0;
        for (let i = 0; i < 90; i++) actor.updateEngagementProgress(1 / 60, enemy);
        return {
          ok: combatDebug.combatStallRecoveries > before && !actor.crouched && ['push', 'reposition'].includes(actor.tacticalMode),
          recoveries: combatDebug.combatStallRecoveries - before,
          mode: actor.tacticalMode,
          reason: actor.lastTacticalReason,
          crouched: actor.crouched
        };
      } finally {
        restoreCombatTestBots(snapshot);
      }
    },
    combatDeadlockRecoveryForTest: () => {
      const allies = bots.filter(bot => bot.team === TEAM_BLUE).slice(0, 2);
      const actor = allies[0] || null;
      const mate = allies[1] || null;
      const enemy = bots.find(bot => actor && bot.team !== actor.team) || null;
      const lane = debugCombatTestLane();
      if (!actor || !mate || !enemy || !lane) return { ok: false, reason: 'test lane unavailable' };
      const snapshot = snapshotCombatTestBots();
      const clockBefore = simulationClock;
      const beforeRoutes = combatDebug.combatApproachRoutes;
      const beforeYields = combatDebug.combatYieldActions;
      const beforeRecoveries = combatDebug.combatStallRecoveries;
      const beforeSuccesses = combatDebug.combatRecoverySuccesses;
      try {
        for (const bot of bots) bot.alive = bot === actor || bot === mate || bot === enemy;
        actor.x = lane[0].x; actor.y = lane[0].y - 0.08;
        mate.x = lane[0].x; mate.y = lane[0].y + 0.08;
        enemy.x = lane[2].x; enemy.y = lane[2].y;
        actor.playerRole = 'support';
        mate.playerRole = 'anchor';
        actor.target = enemy; mate.target = enemy;
        actor.tacticalEnemyKey = enemy.name; mate.tacticalEnemyKey = enemy.name;
        actor.engagementTargetKey = enemy.name; mate.engagementTargetKey = enemy.name;
        for (const bot of [actor, mate]) {
          bot.tacticalMode = 'push';
          bot.combatMobilityTimer = 0;
          bot.combatRecoveryCooldown = 0;
          bot.combatBlockedTimer = 0.34;
          bot.moveIntent = bot.speed;
          bot.moveBlocked = true;
          bot.moveVelocity = 0;
          bot.cooldown = 999;
          bot.clearCombatApproach();
        }
        const actorStart = { x: actor.x, y: actor.y };
        const mateStart = { x: mate.x, y: mate.y };
        actor.updateLocomotionStall(1 / 60, 0, enemy);
        mate.updateLocomotionStall(1 / 60, 0, enemy);
        const actorInitial = { reason: actor.lastTacticalReason, blocker: actor.combatBlockerKey, nodes: actor.combatApproachPath.length, goal: actor.combatApproachGoal ? { ...actor.combatApproachGoal } : null };
        const mateInitial = { reason: mate.lastTacticalReason, blocker: mate.combatBlockerKey, nodes: mate.combatApproachPath.length, goal: mate.combatApproachGoal ? { ...mate.combatApproachGoal } : null };
        const separation = actorInitial.goal && mateInitial.goal ? dist(actorInitial.goal, mateInitial.goal) : 0;
        let blockedFrames = 0;
        for (let frame = 0; frame < 180; frame++) {
          simulationClock += 1 / 60;
          for (const bot of [actor, mate]) {
            bot.combatRecoveryCooldown = Math.max(0, (bot.combatRecoveryCooldown || 0) - 1 / 60);
            bot.combatMobilityTimer = Math.max(0, (bot.combatMobilityTimer || 0) - 1 / 60);
            bot.combatYieldTimer = Math.max(0, (bot.combatYieldTimer || 0) - 1 / 60);
            bot.moveIntent = 0;
            bot.moveBlocked = false;
            const previous = { x: bot.x, y: bot.y };
            bot.followCombatApproach(1 / 60, enemy);
            const moved = dist(bot, previous);
            if (bot.moveBlocked) blockedFrames++;
            bot.updateLocomotionStall(1 / 60, moved, enemy);
            bot.moveVelocity = moved * 60;
          }
        }
        const actorDisplacement = dist(actor, actorStart);
        const mateDisplacement = dist(mate, mateStart);
        const recoveries = combatDebug.combatStallRecoveries - beforeRecoveries;
        const successes = combatDebug.combatRecoverySuccesses - beforeSuccesses;
        return {
          ok: actorInitial.nodes > 1 && mateInitial.nodes > 1 && mateInitial.reason.includes('yield team-mate lane') && separation > 0.5 && actorDisplacement > 0.58 && mateDisplacement > 0.58 && recoveries <= 5 && successes >= 2,
          actor: { ...actorInitial, displacement: actorDisplacement },
          mate: { ...mateInitial, displacement: mateDisplacement },
          goalSeparation: separation,
          blockedFrames,
          recoveries,
          successes,
          routes: combatDebug.combatApproachRoutes - beforeRoutes,
          yields: combatDebug.combatYieldActions - beforeYields
        };
      } finally {
        simulationClock = clockBefore;
        restoreCombatTestBots(snapshot);
      }
    },
    diagnosticDeadlockReplayForTest: () => {
      const originalArenaId = activeArenaId;
      const originalPlan = currentEngagementPlan ? JSON.parse(JSON.stringify(currentEngagementPlan)) : null;
      setActiveArena('citadel');
      const attackers = bots.filter(bot => bot.team === TEAM_RED).slice(0, 2);
      const support = attackers[0] || null;
      const anchorBot = attackers[1] || null;
      const defender = bots.filter(bot => bot.team === TEAM_BLUE)[3] || bots.find(bot => bot.team === TEAM_BLUE) || null;
      if (!support || !anchorBot || !defender) return { ok: false, reason: 'operators unavailable' };
      const points = {
        support: { x: 20.25, y: 8.00 },
        anchor: { x: 20.25, y: 7.84 },
        defender: { x: 11.99, y: 8.03 }
      };
      if (!Object.values(points).every(point => canStand(point.x, point.y, BOT_RADIUS))) return { ok: false, reason: 'diagnostic replay coordinates unavailable on active map' };
      const snapshot = snapshotCombatTestBots();
      const clockBefore = simulationClock;
      const beforeRecoveries = combatDebug.combatStallRecoveries;
      const beforeRoutes = combatDebug.combatApproachRoutes;
      const beforeYields = combatDebug.combatYieldActions;
      try {
        for (const bot of bots) bot.alive = bot === support || bot === anchorBot || bot === defender;
        Object.assign(support, points.support);
        Object.assign(anchorBot, points.anchor);
        Object.assign(defender, points.defender);
        support.playerRole = 'support';
        anchorBot.playerRole = 'anchor';
        defender.playerRole = 'marksman';
        for (const attacker of [support, anchorBot]) {
          attacker.target = defender;
          attacker.sightCandidate = defender;
          attacker.tacticalEnemyKey = defender.name;
          attacker.engagementTargetKey = defender.name;
          attacker.tacticalMode = 'push';
          attacker.lastTacticalReason = 'close with team advantage';
          attacker.crouched = false;
          attacker.cooldown = 999;
          attacker.combatCover = null;
          attacker.combatRecoveryCooldown = 0;
          attacker.combatMobilityTimer = 0;
          attacker.engagementIdleTimer = 0;
          attacker.clearCombatApproach();
        }
        defender.target = anchorBot;
        defender.sightCandidate = anchorBot;
        defender.tacticalEnemyKey = anchorBot.name;
        defender.engagementTargetKey = anchorBot.name;
        defender.tacticalMode = 'hold';
        defender.lastTacticalReason = 'outnumbered';
        defender.crouched = true;
        defender.cooldown = 999;
        defender.combatCover = null;
        defender.combatRecoveryCooldown = 0;
        defender.combatMobilityTimer = 0;
        defender.engagementIdleTimer = 0;
        defender.clearCombatApproach();
        const starts = new Map([[support, { ...points.support }], [anchorBot, { ...points.anchor }], [defender, { ...points.defender }]]);
        const stationary = new Map([[support, 0], [anchorBot, 0], [defender, 0]]);
        const maxStationary = new Map([[support, 0], [anchorBot, 0], [defender, 0]]);
        const crouchStreak = new Map([[support, 0], [anchorBot, 0], [defender, 0]]);
        const maxCrouchStreak = new Map([[support, 0], [anchorBot, 0], [defender, 0]]);
        let blockedFrames = 0;
        const firstRoutes = { support: null, anchor: null, defender: null };
        const dt = 1 / 60;
        for (let frame = 0; frame < 360; frame++) {
          simulationClock += dt;
          updateDynamicDoors(dt);
          for (const [bot, enemy] of [[support, defender], [anchorBot, defender], [defender, anchorBot]]) {
            bot.combatRecoveryCooldown = Math.max(0, (bot.combatRecoveryCooldown || 0) - dt);
            bot.combatMobilityTimer = Math.max(0, (bot.combatMobilityTimer || 0) - dt);
            bot.combatYieldTimer = Math.max(0, (bot.combatYieldTimer || 0) - dt);
            bot.tacticalDecisionTimer = Math.max(0, (bot.tacticalDecisionTimer || 0) - dt);
            bot.tacticalModeTimer = Math.max(0, (bot.tacticalModeTimer || 0) - dt);
            bot.moveIntent = 0;
            bot.moveBlocked = false;
            const previous = { x: bot.x, y: bot.y };
            const visible = bot.canVisuallySee(enemy, FOV * 1.22) ? enemy : null;
            bot.updateEngagementProgress(dt, visible);
            if (visible) bot.combatMove(dt, visible);
            else bot.navigateMove(dt);
            const moved = dist(bot, previous);
            bot.updateLocomotionStall(dt, moved, visible);
            bot.moveVelocity = moved / dt;
            const routeKey = bot === support ? 'support' : (bot === anchorBot ? 'anchor' : 'defender');
            if (!firstRoutes[routeKey] && bot.combatApproachPath?.length) firstRoutes[routeKey] = { reason: bot.lastTacticalReason, goal: bot.combatApproachGoal ? { ...bot.combatApproachGoal } : null, path: bot.combatApproachPath.map(point => ({ x: point.x, y: point.y })) };
            if (bot.moveBlocked) blockedFrames++;
            const idle = moved < 0.006 ? stationary.get(bot) + dt : 0;
            stationary.set(bot, idle);
            maxStationary.set(bot, Math.max(maxStationary.get(bot), idle));
            const crouchedIdle = bot.crouched && moved < 0.006 ? crouchStreak.get(bot) + dt : 0;
            crouchStreak.set(bot, crouchedIdle);
            maxCrouchStreak.set(bot, Math.max(maxCrouchStreak.get(bot), crouchedIdle));
          }
        }
        const resultFor = bot => ({
          name: bot.name,
          displacement: dist(bot, starts.get(bot)),
          maxStationary: maxStationary.get(bot),
          maxCrouchedStationary: maxCrouchStreak.get(bot),
          mode: bot.tacticalMode,
          reason: bot.lastTacticalReason,
          blocker: bot.combatBlockerKey || null,
          recoveryStage: bot.combatRecoveryStage || 0
        });
        const supportResult = resultFor(support);
        const anchorResult = resultFor(anchorBot);
        const defenderResult = resultFor(defender);
        const recoveries = combatDebug.combatStallRecoveries - beforeRecoveries;
        return {
          ok: supportResult.displacement > 0.45 && anchorResult.displacement > 0.45 && defenderResult.maxCrouchedStationary < 2.2 && Math.max(supportResult.maxStationary, anchorResult.maxStationary) < 2.2 && recoveries < 18,
          support: supportResult,
          anchor: anchorResult,
          defender: defenderResult,
          blockedFrames,
          recoveries,
          routes: combatDebug.combatApproachRoutes - beforeRoutes,
          yields: combatDebug.combatYieldActions - beforeYields,
          firstRoutes
        };
      } finally {
        simulationClock = clockBefore;
        restoreCombatTestBots(snapshot);
        setActiveArena(originalArenaId);
        currentEngagementPlan = originalPlan;
      }
    },
    outOfRangeCrouchBreakForTest: () => {
      const actor = bots.find(bot => bot.team === TEAM_BLUE) || null;
      const enemy = bots.find(bot => actor && bot.team !== actor.team) || null;
      const lane = debugCombatTestLane();
      if (!actor || !enemy || !lane) return { ok: false, reason: 'test lane unavailable' };
      const snapshot = snapshotCombatTestBots();
      const before = combatDebug.combatStallRecoveries;
      try {
        for (const bot of bots) bot.alive = bot === actor || bot === enemy;
        actor.x = lane[0].x; actor.y = lane[0].y;
        enemy.x = lane[2].x; enemy.y = lane[2].y;
        actor.weapon = { ...actor.weapon, range: 3.2 };
        actor.target = enemy;
        actor.sightCandidate = enemy;
        actor.tacticalEnemyKey = enemy.name;
        actor.engagementTargetKey = enemy.name;
        actor.engagementIdleTimer = 0;
        actor.engagementLastShots = actor.roundShotsFired || 0;
        actor.engagementLastDamage = actor.roundDamageDealt || 0;
        actor.tacticalMode = 'hold';
        actor.crouched = true;
        actor.moveVelocity = 0;
        actor.combatMobilityTimer = 0;
        actor.combatRecoveryCooldown = 0;
        actor.clearCombatApproach();
        for (let i = 0; i < 45; i++) actor.updateEngagementProgress(1 / 60, enemy);
        return {
          ok: combatDebug.combatStallRecoveries > before && !actor.crouched && actor.combatApproachPath.length > 1,
          recoveries: combatDebug.combatStallRecoveries - before,
          mode: actor.tacticalMode,
          reason: actor.lastTacticalReason,
          nodes: actor.combatApproachPath.length,
          targetDistance: dist(actor, enemy),
          weaponRange: actor.weapon.range
        };
      } finally {
        restoreCombatTestBots(snapshot);
      }
    },
    combatRecoveryDisplacementForTest: () => {
      const actor = bots.find(bot => bot.team === TEAM_BLUE) || null;
      const enemy = bots.find(bot => actor && bot.team !== actor.team) || null;
      const lane = debugCombatTestLane();
      if (!actor || !enemy || !lane) return { ok: false, reason: 'test lane unavailable' };
      const snapshot = snapshotCombatTestBots();
      const before = combatDebug.combatRecoverySuccesses;
      try {
        for (const bot of bots) bot.alive = bot === actor || bot === enemy;
        actor.x = lane[0].x; actor.y = lane[0].y;
        enemy.x = lane[2].x; enemy.y = lane[2].y;
        actor.combatRecoveryOrigin = { x: actor.x, y: actor.y };
        actor.combatRecoveryTargetKey = enemy.name;
        actor.combatRecoveryStage = 2;
        const beforeMove = actor.updateCombatRecoveryProgress(0);
        actor.x += 0.65;
        const afterMove = actor.updateCombatRecoveryProgress(0.65);
        return {
          ok: beforeMove === false && afterMove === true && combatDebug.combatRecoverySuccesses > before && actor.combatRecoveryStage === 0,
          beforeMove,
          afterMove,
          successes: combatDebug.combatRecoverySuccesses - before,
          stage: actor.combatRecoveryStage
        };
      } finally {
        restoreCombatTestBots(snapshot);
      }
    },
    crouchStallRecoveryForTest: () => {
      const actor = bots.find(bot => bot.team === TEAM_BLUE) || null;
      const lane = debugCombatTestLane();
      if (!actor || !lane) return { ok: false, reason: 'test lane unavailable' };
      const snapshot = snapshotCombatTestBots();
      const before = combatDebug.crouchStallRecoveries;
      try {
        for (const bot of bots) bot.alive = bot === actor;
        actor.x = lane[0].x; actor.y = lane[0].y;
        actor.lastX = actor.x; actor.lastY = actor.y;
        actor.crouched = true;
        actor.crouchHoldTimer = 4;
        actor.crouchStationaryTimer = 0;
        actor.moveVelocity = 0;
        actor.target = null;
        actor.sightCandidate = null;
        actor.heardSound = { x: lane[2].x, y: lane[2].y, type: 'footstep', team: TEAM_RED, confidence: 0.8 };
        actor.heardSoundTimer = 3;
        actor.objective = { x: lane[2].x, y: lane[2].y };
        actor.path = [actor.objective];
        actor.pathIndex = 0;
        for (let i = 0; i < 70; i++) actor.updateLocomotionStall(1 / 60, 0, null);
        return {
          ok: combatDebug.crouchStallRecoveries > before && !actor.crouched && actor.pathRefreshNeeded,
          recoveries: combatDebug.crouchStallRecoveries - before,
          crouched: actor.crouched,
          pathRefreshNeeded: actor.pathRefreshNeeded,
          reason: actor.lastTacticalReason
        };
      } finally {
        restoreCombatTestBots(snapshot);
      }
    },
    coordinationWaitCommitForTest: () => {
      const actor = bots.find(bot => bot.team === TEAM_BLUE) || null;
      const mate = bots.find(bot => actor && bot !== actor && bot.team === actor.team) || null;
      const lane = debugCombatTestLane();
      if (!actor || !mate || !lane) return { ok: false, reason: 'test lane unavailable' };
      const snapshot = snapshotCombatTestBots();
      const before = combatDebug.coordinationWaitCommits;
      try {
        for (const bot of bots) bot.alive = bot === actor || bot === mate;
        actor.x = lane[0].x; actor.y = lane[0].y;
        mate.x = lane[2].x; mate.y = lane[2].y;
        actor.playerRole = 'entry';
        actor.teamPriorityId = 'trade';
        actor.lastSeen = { x: lane[1].x, y: lane[1].y };
        actor.lastSeenTimer = 5;
        actor.coordinationWaitTimer = 0;
        actor.coordinationHoldTimer = 0;
        actor.coordinationActionCooldown = 0;
        for (let i = 0; i < 70; i++) actor.updateTeamCoordination(1 / 60, null);
        return {
          ok: combatDebug.coordinationWaitCommits > before && actor.coordinationHoldTimer > 0,
          commits: combatDebug.coordinationWaitCommits - before,
          holdTimer: actor.coordinationHoldTimer,
          waitTimer: actor.coordinationWaitTimer,
          reason: actor.lastTacticalReason
        };
      } finally {
        restoreCombatTestBots(snapshot);
      }
    },
    navigationTrafficPenaltyForTest: () => {
      const actor = bots.find(bot => bot.team === TEAM_BLUE) || null;
      const mate = bots.find(bot => actor && bot !== actor && bot.team === actor.team) || null;
      const enemy = bots.find(bot => actor && bot.team !== actor.team) || null;
      const lane = debugCombatTestLane();
      if (!actor || !mate || !enemy || !lane) return { ok: false, reason: 'test lane unavailable' };
      const snapshot = snapshotCombatTestBots();
      try {
        actor.x = lane[0].x; actor.y = lane[0].y;
        mate.x = lane[1].x; mate.y = lane[1].y; mate.alive = true;
        enemy.x = lane[1].x; enemy.y = lane[1].y; enemy.alive = false;
        const cell = toCell(mate.x, mate.y);
        const base = navigationCellPenalty(cell, null);
        const teammatePenalty = navigationCellPenalty(cell, actor);
        mate.alive = false;
        enemy.alive = true;
        const enemyIgnoredPenalty = navigationCellPenalty(cell, actor);
        return {
          ok: teammatePenalty > base + 1 && Math.abs(enemyIgnoredPenalty - base) < 0.001,
          base,
          teammatePenalty,
          enemyIgnoredPenalty
        };
      } finally {
        restoreCombatTestBots(snapshot);
      }
    },
    targetExposureForTest: (shooterIndex = 0, targetIndex = 5) => {
      const shooter = bots[Math.max(0, Number(shooterIndex) || 0)] || null;
      const target = bots[Math.max(0, Number(targetIndex) || 0)] || null;
      return Boolean(shooter && target && hasTargetExposure(shooter, target));
    },
    sprintFootstepForTest: (botIndex = 0) => {
      const bot = bots[Math.max(0, Number(botIndex) || 0)] || null;
      if (!bot) return null;
      const before = soundEvents.length;
      emitSoundEvent('footstep', bot, 12.6, 0.96, { gait: 'sprint', variant: 8 });
      combatDebug.sprintFootstepsEmitted++;
      combatDebug.maxFootstepRadius = Math.max(combatDebug.maxFootstepRadius || 0, 12.6);
      const event = soundEvents[soundEvents.length - 1] || null;
      return { added: soundEvents.length > before, radius: event?.radius || 0, loudness: event?.loudness || 0, gait: event?.gait || '' };
    },
    injuryRiskForTest: (playerId, fatigue = null, rounds = 3, damageTaken = 100, sprintDistance = 0) => {
      const player = (careerState.squad || []).find(candidate => candidate.id === String(playerId || '')) || null;
      if (!player || typeof playerInjuryRisk !== 'function') return null;
      return playerInjuryRisk(player, { rounds: Math.max(0, Number(rounds) || 0), damageTaken: Math.max(0, Number(damageTaken) || 0), sprintDistance: Math.max(0, Number(sprintDistance) || 0) }, fatigue);
    },
    ui: () => ({
      menuTab,
      appState,
      buttonsHidden: uiButtonsHidden,
      liveMenu: liveMatchMenuActive(),
      matchSimulationPaused,
      liveMenuTab: lastLiveMenuTab,
      bodyState: document.body.dataset.uiButtons || '',
      toggleText: uiToggleBtn ? uiToggleBtn.textContent : 'missing',
      toggleDisplay: uiToggleBtn ? getComputedStyle(uiToggleBtn).display : 'missing',
      hiddenPanels: ['.brand', '.mapTag', '.spectator', '.controls'].map(selector => ({
        selector,
        display: getComputedStyle(document.querySelector(selector)).display
      })),
      preservedPanels: ['.round', '.hud-actions', '.crosshair', '.feed'].map(selector => ({
        selector,
        display: getComputedStyle(document.querySelector(selector)).display
      })),
      menuReturnVisible: returnToMatchBtn ? !returnToMatchBtn.hidden && getComputedStyle(returnToMatchBtn).display !== 'none' : false,
      viewMode,
      fullViewRequested,
      portrait: isPortraitViewport(),
      matchView: matchViewEl ? { width: matchViewEl.getBoundingClientRect().width, height: matchViewEl.getBoundingClientRect().height } : null
    }),
    propCollision: () => ({
      ...auditLevelPropCollision(),
      centresBlocked: LEVEL_PROP_COLLIDERS.every(collider => !canStand(collider.x, collider.y, BOT_RADIUS)),
      botsClear: bots.filter(bot => bot.alive).every(bot => canStand(bot.x, bot.y, BOT_RADIUS)),
      sweptMovement: true,
      kinds: LEVEL_PROP_COLLIDERS.reduce((counts, collider) => {
        counts[collider.kind] = (counts[collider.kind] || 0) + 1;
        return counts;
      }, {})
    }),
    operatorModel: () => ({
      legGeometry: operatorLegGeometryAudit(),
      proportions: operatorProportionAudit(),
      headGeometry: operatorHeadGeometryAudit(bots[0] || null),
      skinPresentation: operatorSkinPresentationAudit(bots[0] || null),
      armour: operatorArmourMaterialAudit(),
      ambientOcclusion: operatorAmbientOcclusionAudit(bots[0] || null),
      armourPresentation: bots.map(bot => ({ name: bot.name, id: bot.armourId || 'none', ...operatorArmourPresentationAudit(bot) })),
      surfaceGeometry: operatorSurfaceGeometryAudit(),
      liveOperators: bots.filter(bot => bot.alive).length,
      corpses: bots.filter(bot => !bot.alive).length,
      lowerBodyRig: 'forward-pole two-bone IK',
      upperBodyRig: 'hand-anchored elbow solve with articulated shoulders and stabilised head',
      silhouette: 'compact anatomical tactical profile with tapered waist, shaped joint shells and profiled boots',
      footPlanting: 'phase-driven lift with floor-clamped soles'
    }),
    operatorHeadGeometryForTest: (slot = 0) => operatorHeadGeometryAudit(bots[clamp(Math.round(Number(slot) || 0), 0, Math.max(0, bots.length - 1))] || null),
    operatorSkinPresentationForTest: (slot = 0) => operatorSkinPresentationAudit(bots[clamp(Math.round(Number(slot) || 0), 0, Math.max(0, bots.length - 1))] || null),
    operatorAmbientOcclusionForTest: (slot = 0) => operatorAmbientOcclusionAudit(bots[clamp(Math.round(Number(slot) || 0), 0, Math.max(0, bots.length - 1))] || null),
    armourSystemForTest: () => {
      const p12 = getCareerWeapon('scrap-p12');
      const rifle = getCareerWeapon('ar4-sentinel');
      const makeTarget = armourId => {
        const target = { speed: 1, moveSkill: 1, reloadMultiplier: 1, reactionDelay: 0.24, isPlayerOwned: false, name: 'TEST TARGET' };
        applyArmourProfileToBot(target, armourId);
        return target;
      };
      const p12Target = makeTarget('bastion-heavy');
      const rifleTarget = makeTarget('bastion-heavy');
      const headTarget = makeTarget('bastion-heavy');
      const p12Hit = resolveArmourHit(p12Target, 30, p12, { headshot: false });
      const rifleHit = resolveArmourHit(rifleTarget, 30, rifle, { headshot: false });
      const headHit = resolveArmourHit(headTarget, 30, p12, { headshot: true });
      const lightMobility = makeTarget('scout-weave');
      const heavyMobility = makeTarget('bastion-heavy');

      const snapshot = {
        created: careerState.created,
        squad: careerState.squad,
        armourInventory: careerState.armourInventory,
        selectedPlayerId: careerState.selectedPlayerId
      };
      let breakResult = null;
      let assignmentResult = null;
      try {
        careerState.created = true;
        careerState.squad = [
          { id: 'armour-test-a', name: 'TEST A', equippedArmourId: 'scout-weave' },
          { id: 'armour-test-b', name: 'TEST B', equippedArmourId: 'scout-weave' }
        ];
        careerState.armourInventory = ['scout-weave'];
        careerNormaliseArmourAssignments();
        assignmentResult = {
          first: careerState.squad[0].equippedArmourId,
          second: careerState.squad[1].equippedArmourId,
          exactlyOneEquipped: careerState.squad.filter(player => player.equippedArmourId === 'scout-weave').length === 1
        };
        const breakTarget = makeTarget('scout-weave');
        breakTarget.isPlayerOwned = true;
        breakTarget.playerProfileId = 'armour-test-a';
        breakTarget.armourDurability = 1;
        breakTarget.armourMaxDurability = 72;
        breakTarget.roundArmourBroken = 0;
        const brokenHit = resolveArmourHit(breakTarget, 60, rifle, { headshot: false });
        const nextRoundTarget = makeTarget(careerState.squad[0].equippedArmourId || 'none');
        breakResult = {
          broken: breakTarget.armourBroken,
          inventoryCopies: careerState.armourInventory.length,
          equippedAfter: careerState.squad[0].equippedArmourId,
          nextRoundArmourId: nextRoundTarget.armourId,
          eventMarked: Boolean(brokenHit.broken && breakTarget.roundArmourBroken === 1)
        };
      } finally {
        careerState.created = snapshot.created;
        careerState.squad = snapshot.squad;
        careerState.armourInventory = snapshot.armourInventory;
        careerState.selectedPlayerId = snapshot.selectedPlayerId;
        if (typeof saveCareerState === 'function') saveCareerState();
      }
      const carrySource = makeTarget('guardian-plate');
      carrySource.armourDurability = 9;
      const carriedState = captureMatchArmourState(carrySource, false);
      const nextRoundTarget = makeTarget('guardian-plate');
      restoreMatchArmourState(nextRoundTarget, carriedState);
      const nextMatchTarget = makeTarget('guardian-plate');
      const attritionResult = {
        carriedIntegrity: nextRoundTarget.armourDurability,
        maximum: nextRoundTarget.armourMaxDurability,
        persistedBetweenRounds: nextRoundTarget.armourDurability === 9,
        restoredBetweenMatches: nextMatchTarget.armourDurability === nextMatchTarget.armourMaxDurability
      };
      const visuals = ['none','scout-weave','response-carrier','guardian-plate','bastion-heavy'].map(id => {
        const bot = makeTarget(id);
        const profile = operatorArmourPresentationAudit(bot);
        return { id, classId: profile.classId, width: profile.width, side: profile.side, shoulder: profile.shoulder };
      });
      return {
        ok: p12Hit.absorbed > rifleHit.absorbed && headHit.absorbed === 0 && headHit.healthDamage === 30 && heavyMobility.speed < lightMobility.speed && assignmentResult?.exactlyOneEquipped && breakResult?.broken && breakResult.inventoryCopies === 0 && breakResult.equippedAfter === 'none' && breakResult.nextRoundArmourId === 'none' && breakResult.eventMarked && attritionResult.persistedBetweenRounds && attritionResult.restoredBetweenMatches,
        penetration: { p12: p12.armourPenetration, rifle: rifle.armourPenetration, p12Absorbed: p12Hit.absorbed, rifleAbsorbed: rifleHit.absorbed },
        headshotBypass: headHit,
        movement: { light: lightMobility.speed, heavy: heavyMobility.speed },
        assignment: assignmentResult,
        breakage: breakResult,
        matchLongAttrition: attritionResult,
        visuals
      };
    },
    armourMatchAttritionForTest: () => {
      const snapshot = {
        created: careerState.created,
        squad: careerState.squad,
        armourInventory: careerState.armourInventory,
        selectedPlayerId: careerState.selectedPlayerId,
        appState, menuContext
      };
      let result = null;
      try {
        if (!careerState.created || (careerState.squad || []).length < 5) window.__strikeDebug.seedReadabilityCareerForTest(5);
        const player = careerState.squad[0];
        careerState.armourInventory = ['guardian-plate'];
        careerState.squad.forEach((candidate, index) => { candidate.equippedArmourId = index === 0 ? 'guardian-plate' : 'none'; });
        careerNormaliseArmourAssignments();
        createMatch();
        const owned = bots.find(bot => bot.isPlayerOwned && bot.slot === 0);
        const maximum = owned?.armourMaxDurability || 0;
        if (owned) owned.armourDurability = 17;
        startRound();
        const nextRound = bots.find(bot => bot.isPlayerOwned && bot.slot === 0);
        const carried = nextRound?.armourDurability || 0;
        createMatch();
        const nextMatch = bots.find(bot => bot.isPlayerOwned && bot.slot === 0);
        const serviced = nextMatch?.armourDurability || 0;
        const opponent = bots.find(bot => !bot.isPlayerOwned && bot.team === TEAM_RED);
        if (opponent) {
          applyArmourProfileToBot(opponent, 'bastion-heavy');
          opponent.armourDurability = 0;
          opponent.armourBroken = true;
        }
        startRound();
        const opponentNextRound = bots.find(bot => !bot.isPlayerOwned && bot.team === TEAM_RED);
        const brokenOpponentStayedUnarmoured = opponentNextRound?.armourId === 'none' && opponentNextRound?.armourDurability === 0;
        result = {
          playerId: player?.id || null,
          maximum,
          carriedIntoRoundTwo: carried,
          restoredForNewMatch: serviced,
          opponentAfterBrokenRound: { id: opponentNextRound?.armourId || null, integrity: opponentNextRound?.armourDurability ?? null },
          persistedBetweenRounds: Math.abs(carried - 17) < 0.001,
          restoredBetweenMatches: Math.abs(serviced - maximum) < 0.001,
          brokenOpponentStayedUnarmoured,
          ok: Math.abs(carried - 17) < 0.001 && maximum > 17 && Math.abs(serviced - maximum) < 0.001 && brokenOpponentStayedUnarmoured
        };
      } finally {
        careerState.created = snapshot.created;
        careerState.squad = snapshot.squad;
        careerState.armourInventory = snapshot.armourInventory;
        careerState.selectedPlayerId = snapshot.selectedPlayerId;
        appState = snapshot.appState;
        menuContext = snapshot.menuContext;
        if (typeof saveCareerState === 'function') saveCareerState();
      }
      return result;
    },
    openArmourStoreForTest: () => {
      if (!careerState.created || (careerState.squad || []).length < 5) window.__strikeDebug.seedReadabilityCareerForTest(5);
      careerState.totalMatches = Math.max(2, Number(careerState.totalMatches) || 0);
      careerState.tutorial = careerState.tutorial && typeof careerState.tutorial === 'object' ? careerState.tutorial : makeDefaultCareerTutorialState();
      careerState.tutorial.completed = true;
      careerState.lastRound = careerState.lastRound && typeof careerState.lastRound === 'object' ? careerState.lastRound : {};
      careerState.lastRound.reportReviewed = true;
      if (careerState.squad[0]) careerState.squad[0].trainingFocus = careerState.squad[0].trainingFocus || 'aim';
      menuContext = 'main';
      setAppState('menu');
      setMenuRoute('store');
      updateMenuUI();
      return { route: menuTab, offers: menuContentEl?.querySelectorAll('.cash-armour-offer').length || 0, models: menuContentEl?.querySelectorAll('.cash-armour-offer .career-armour-rig').length || 0 };
    },
    armour3dPresentationForTest: () => {
      const ids = ['scout-weave', 'response-carrier', 'guardian-plate', 'bastion-heavy'];
      const storeMarkup = ids.map(id => careerArmourVisualMarkup(getCareerArmour(id), 'store')).join('');
      const inventoryMarkup = ids.map(id => careerArmourVisualMarkup(getCareerArmour(id), 'inventory')).join('');
      const detailMarkup = careerArmourVisualMarkup(getCareerArmour('bastion-heavy'), 'detail');
      const classes = ids.map(id => getCareerArmour(id).classId);
      const uniqueClasses = new Set(classes).size === ids.length;
      const storeModels = ids.every(id => storeMarkup.includes(`career-armour-rig ${getCareerArmour(id).classId}`) && storeMarkup.includes('career-armour-model-system'));
      const storeForms = (storeMarkup.match(/career-armour-store-form/g) || []).length === ids.length;
      const storeCaptions = (storeMarkup.match(/FULL-DEPTH 3D/g) || []).length === ids.length;
      const interactive = detailMarkup.includes('data-career-armour-viewer') && detailMarkup.includes('data-career-armour-viewer-action="rotate-left"') && detailMarkup.includes('data-career-armour-viewer-action="zoom-in"') && detailMarkup.includes('data-career-armour-viewer-action="auto"');
      const shared3dPipeline = detailMarkup.includes('career-weapon-rig career-armour-weapon-system') && detailMarkup.includes('career-weapon-cuboid') && detailMarkup.includes('career-weapon-cylinder');
      const productOnlyDetail = detailMarkup.includes('product-only') && !detailMarkup.includes('career-armour-operator-body') && !detailMarkup.includes('career-armour-store-form') && detailMarkup.includes('ARMOUR ONLY · COMPLETE 360° MODEL');
      const compactInventory = (inventoryMarkup.match(/compact-model/g) || []).length === ids.length && !inventoryMarkup.includes('career-armour-operator-body') && !inventoryMarkup.includes('career-armour-store-form');
      const heavyFeatures = ['neck-guard', 'shoulder-left', 'abdomen', 'groin', 'radio-body'].every(token => detailMarkup.includes(token));
      const fullDepthFeatures = ['shell-front-core', 'shell-back-core', 'shoulder-bridge-left', 'cummerbund-left', 'plate-wing-left', 'rear-plate', 'drag-handle'].every(token => storeMarkup.includes(token));
      const fullPartCounts = ids.map(id => careerArmour3dParts(getCareerArmour(id)).length);
      const compactPartCounts = ids.map(id => careerArmourThumbnailParts(getCareerArmour(id)).length);
      const compactReduction = compactPartCounts.every((count, index) => count > 0 && count < fullPartCounts[index] * 0.72);
      const inventoryIds = ['none', ...ids];
      const fullInventoryPartCount = inventoryIds.reduce((total, id) => total + careerArmour3dParts(getCareerArmour(id)).length, 0);
      const compactInventoryPartCount = inventoryIds.reduce((total, id) => total + careerArmourThumbnailParts(getCareerArmour(id)).length, 0);
      const inventoryPartReduction = fullInventoryPartCount > 0 ? 1 - (compactInventoryPartCount / fullInventoryPartCount) : 0;
      const inventoryReductionPass = inventoryPartReduction >= 0.55;
      const fullDetailPartCount = careerArmour3dParts(getCareerArmour('bastion-heavy')).length;
      const removedOperatorPartCount = careerArmourOperatorBodyParts().length;
      const detailPartCount = (detailMarkup.match(/career-weapon-(?:cuboid|cylinder)/g) || []).length;
      const detailReduction = detailPartCount === fullDetailPartCount && removedOperatorPartCount >= 10;
      let centeredRigs = false;
      let centeredRigMeasurements = [];
      let storeStages = [];
      let detailStage = null;
      let compactStageStyles = [];
      const armouryOperatorSkin = { present: false, intentionallyOmitted: true, reason: 'Armoury inspection renders the chest piece only.' };
      const testHost = document.createElement('div');
      testHost.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:640px;pointer-events:none;opacity:0;';
      testHost.innerHTML = `<div class="cash-armour-grid">${ids.map(id => `<article class="cash-armour-offer ${getCareerArmour(id).classId}"><div class="cash-armour-visual">${careerArmourVisualMarkup(getCareerArmour(id), 'store')}</div></article>`).join('')}</div><div class="career-armour-detail-preview">${detailMarkup}</div><div class="career-armour-inventory-list">${ids.map(id => `<button class="career-armour-inventory-item">${careerArmourVisualMarkup(getCareerArmour(id), 'inventory')}</button>`).join('')}</div>`;
      document.body.appendChild(testHost);
      try {
        const inspectedRigs = [...testHost.querySelectorAll('.cash-armour-grid [data-career-armour-rig], .career-armour-detail-preview [data-career-armour-rig]')];
        centeredRigMeasurements = inspectedRigs.map(rig => {
          const modelSystem = rig.querySelector('.career-armour-model-system');
          const childRigs = [...rig.querySelectorAll('.career-armour-model-system > .career-weapon-rig')];
          return childRigs.map(child => {
            const style = window.getComputedStyle(child);
            const left = parseFloat(style.left) || 0;
            const top = parseFloat(style.top) || 0;
            const parentWidth = modelSystem?.getBoundingClientRect?.().width || 1;
            const parentHeight = modelSystem?.getBoundingClientRect?.().height || 1;
            return {
              className: rig.className,
              childClassName: child.className,
              left,
              top,
              expectedLeft: parentWidth / 2,
              expectedTop: parentHeight / 2,
              centered: Math.abs(left - (parentWidth / 2)) < 0.55 && Math.abs(top - (parentHeight / 2)) < 0.55
            };
          });
        }).flat();
        centeredRigs = centeredRigMeasurements.length === ids.length * 2 + 1 && centeredRigMeasurements.every(entry => entry.centered);
        storeStages = [...testHost.querySelectorAll('.cash-armour-visual .career-armour-mini3d.store')].map(stage => {
          const box = stage.getBoundingClientRect();
          const modelSystem = stage.querySelector('.career-armour-model-system');
          const style = modelSystem ? window.getComputedStyle(modelSystem) : null;
          const rigStyles = [...stage.querySelectorAll('.career-armour-model-system > .career-weapon-rig')].map(rig => {
            const rigStyle = window.getComputedStyle(rig);
            return { className: rig.className, filter: rigStyle.filter, opacity: Number(rigStyle.opacity), transformStyle: rigStyle.transformStyle };
          });
          const unflattened = rigStyles.length >= 2 && rigStyles.every(rig => rig.filter === 'none' && rig.opacity === 1 && rig.transformStyle === 'preserve-3d');
          return {
            width: Math.round(box.width),
            height: Math.round(box.height),
            animationName: style?.animationName || '',
            perspective: window.getComputedStyle(stage).perspective || '',
            largeEnough: box.width >= 230 && box.height >= 200,
            fullOrbit: (style?.animationName || '').includes('careerArmourStoreOrbit'),
            unflattened,
            rigStyles
          };
        });
        const detail = testHost.querySelector('.career-armour-detail-preview .career-armour-showcase');
        const detailModel = detail?.querySelector('.career-armour-model-system');
        detailStage = detail ? {
          perspective: window.getComputedStyle(detail).perspective || '',
          modelWillChange: detailModel ? window.getComputedStyle(detailModel).willChange : '',
          productOnly: Boolean(detail.querySelector('.career-armour-rig.product-only')),
          operatorBodies: detail.querySelectorAll('.career-armour-operator-body').length,
          modelParts: detail.querySelectorAll('.career-weapon-cuboid, .career-weapon-cylinder').length
        } : null;
        compactStageStyles = [...testHost.querySelectorAll('.career-armour-inventory-list .career-armour-rig.compact-model')].map(rig => {
          const model = rig.querySelector('.career-armour-model-system');
          const armourSystem = rig.querySelector('.career-armour-weapon-system');
          return {
            parts: rig.querySelectorAll('.career-weapon-cuboid, .career-weapon-cylinder').length,
            willChange: model ? window.getComputedStyle(model).willChange : '',
            filter: armourSystem ? window.getComputedStyle(armourSystem).filter : ''
          };
        });
      } finally {
        testHost.remove();
      }
      const largeStoreStages = storeStages.length === ids.length && storeStages.every(stage => stage.largeEnough && stage.fullOrbit && stage.perspective !== 'none');
      const unflattened3d = storeStages.length === ids.length && storeStages.every(stage => stage.unflattened);
      const staticCompactLayers = compactStageStyles.length === ids.length && compactStageStyles.every(stage => stage.willChange === 'auto' && !stage.filter.includes('drop-shadow'));
      const detailPerformance = Boolean(detailStage?.productOnly) && detailStage.operatorBodies === 0 && detailStage.modelParts === fullDetailPartCount && detailStage.modelWillChange === 'auto';
      const lightWebgl = operatorArmourRenderProfile({ armourProfile: { classId: 'light' }, armourMaxDurability: 70, armourDurability: 70 });
      const heavyWebgl = operatorArmourRenderProfile({ armourProfile: { classId: 'heavy' }, armourMaxDurability: 140, armourDurability: 140 });
      const premiumHeavy = heavyWebgl.width > lightWebgl.width * 1.35 && heavyWebgl.depth > lightWebgl.depth * 2 && heavyWebgl.shoulder && heavyWebgl.collar && heavyWebgl.abdomen && heavyWebgl.groin;
      const operatorSkinPresentation = operatorSkinPresentationAudit();
      return {
        ok: uniqueClasses && storeModels && storeForms && storeCaptions && interactive && shared3dPipeline && productOnlyDetail && compactInventory && compactReduction && inventoryReductionPass && detailReduction && heavyFeatures && fullDepthFeatures && centeredRigs && largeStoreStages && unflattened3d && staticCompactLayers && detailPerformance && premiumHeavy && operatorSkinPresentation.allTonesLight,
        uniqueClasses,
        storeModels,
        storeForms,
        storeCaptions,
        interactive,
        shared3dPipeline,
        productOnlyDetail,
        compactInventory,
        compactReduction,
        detailReduction,
        fullPartCounts,
        compactPartCounts,
        fullInventoryPartCount,
        compactInventoryPartCount,
        inventoryPartReduction,
        inventoryReductionPass,
        fullDetailPartCount,
        removedOperatorPartCount,
        detailPartCount,
        operatorSkinPresentation,
        armouryOperatorSkin,
        heavyFeatures,
        fullDepthFeatures,
        centeredRigs,
        centeredRigMeasurements,
        largeStoreStages,
        unflattened3d,
        staticCompactLayers,
        detailPerformance,
        detailStage,
        compactStageStyles,
        storeStages,
        premiumHeavy,
        classes,
        lightWebgl,
        heavyWebgl
      };
    },
    purchaseArmourForTest: armourId => {
      if (!careerState.created) window.__strikeDebug.seedReadabilityCareerForTest(5);
      careerState.credits = Math.max(Number(careerState.credits) || 0, 250000);
      const result = purchaseCareerCashArmour(String(armourId || 'scout-weave'));
      return { result, credits: careerState.credits, inventory: [...(careerState.armourInventory || [])] };
    },
    seedArmourLoadoutsForTest: () => {
      if (!careerState.created || (careerState.squad || []).length < 5) window.__strikeDebug.seedReadabilityCareerForTest(5);
      const ids = ['scout-weave','response-carrier','guardian-plate','bastion-heavy'];
      careerState.armourInventory = [...ids];
      careerState.squad.slice(0, 5).forEach((player, index) => { player.equippedArmourId = index < ids.length ? ids[index] : 'none'; });
      careerNormaliseArmourAssignments();
      saveCareerState({ createBackup: false, reason: 'debug armour loadout seed' });
      createMatch();
      return window.__strikeDebug.armourLoadoutMappingForTest();
    },
    seedWeaponSlotLoadoutsForTest: () => {
      if (!careerState.created || (careerState.squad || []).length < 5) window.__strikeDebug.seedReadabilityCareerForTest(5);
      careerState.inventory = ['scrap-p12','ar4-sentinel','ar4-sentinel','service-p12','service-p12','viper-9'];
      const players = careerState.squad.slice(0, 5);
      const layouts = [
        { primary: 'ar4-sentinel', sidearm: 'viper-9' },
        { primary: 'ar4-sentinel', sidearm: 'service-p12' },
        { primary: null, sidearm: 'service-p12' },
        { primary: null, sidearm: 'scrap-p12' },
        { primary: null, sidearm: 'scrap-p12' }
      ];
      players.forEach((player, index) => {
        player.equippedPrimaryWeaponId = layouts[index].primary;
        player.equippedSidearmId = layouts[index].sidearm;
        player.equippedWeaponId = layouts[index].primary || layouts[index].sidearm;
      });
      careerNormaliseWeaponAssignments();
      saveCareerState({ createBackup: false, reason: 'debug weapon-slot seed' });
      createMatch();
      return { inventory: window.__strikeDebug.weaponInventoryForTest(), mapping: window.__strikeDebug.operatorWeaponLoadoutMappingForTest() };
    },
    armourLoadoutMappingForTest: () => ({
      ok: bots.every(bot => {
        if (!bot.isPlayerOwned) return Boolean(bot.armourProfile && bot.armourId);
        const player = careerState.squad?.[bot.slot] || null;
        const expected = player?.equippedArmourId || 'none';
        const activeMatchesLoadout = bot.armourId === expected;
        const legitimatelyBrokenCopy = expected === 'none' && bot.armourBroken && bot.armourId !== 'none';
        return Boolean(bot.armourProfile && (activeMatchesLoadout || legitimatelyBrokenCopy));
      }),
      operators: bots.map(bot => ({
        name: bot.name,
        team: bot.team,
        slot: bot.slot,
        owned: bot.isPlayerOwned,
        expectedArmourId: bot.isPlayerOwned ? (careerState.squad?.[bot.slot]?.equippedArmourId || 'none') : bot.armourId,
        activeArmourId: bot.armourId || 'none',
        integrity: bot.armourDurability || 0,
        maximumIntegrity: bot.armourMaxDurability || 0,
        broken: Boolean(bot.armourBroken)
      }))
    }),
    operatorWeaponAttachmentForTest: () => operatorWeaponAttachmentAudit(),
    weaponGeometryIntegrityForTest: () => careerWeaponGeometryIntegrityAudit(),
    operatorWeaponLoadoutMappingForTest: () => ({
      ok: bots.every(bot => {
        if (!bot.isPlayerOwned) return Boolean(bot.weapon?.id && bot.primaryWeapon?.id && bot.secondaryWeapon?.id);
        const player = careerState.squad?.[bot.slot] || null;
        const expectedPrimary = player ? (careerPlayerPrimaryWeaponId(player) || careerPlayerSidearmId(player)) : null;
        const expectedSidearm = player ? careerPlayerSidearmId(player) : null;
        const expectedActive = bot.usingSecondary ? expectedSidearm : expectedPrimary;
        return Boolean(expectedPrimary && expectedSidearm && bot.primaryWeapon?.id === expectedPrimary && bot.secondaryWeapon?.id === expectedSidearm && bot.weapon?.id === expectedActive);
      }),
      operators: bots.map(bot => {
        const player = bot.isPlayerOwned ? (careerState.squad?.[bot.slot] || null) : null;
        const expectedPrimary = player ? (careerPlayerPrimaryWeaponId(player) || careerPlayerSidearmId(player)) : bot.simulatedWeaponId;
        const expectedSidearm = player ? careerPlayerSidearmId(player) : (bot.secondaryWeapon?.id || null);
        const expectedActive = bot.usingSecondary ? expectedSidearm : expectedPrimary;
        return {
          name: bot.name,
          team: bot.team,
          slot: bot.slot,
          owned: bot.isPlayerOwned,
          expectedPrimaryWeaponId: expectedPrimary || null,
          expectedSidearmWeaponId: expectedSidearm || null,
          primaryWeaponId: bot.primaryWeapon?.id || null,
          sidearmWeaponId: bot.secondaryWeapon?.id || null,
          activeWeaponId: bot.weapon?.id || null,
          modelClass: bot.weapon?.modelClass || null,
          usingSecondary: Boolean(bot.usingSecondary),
          matches: Boolean(expectedPrimary && expectedSidearm && bot.primaryWeapon?.id === expectedPrimary && bot.secondaryWeapon?.id === expectedSidearm && bot.weapon?.id === expectedActive)
        };
      })
    }),
    hunt: () => ({
      active: isLateRoundHuntActive(),
      urgent: isUrgentHuntActive(),
      secondsSinceContact: secondsSinceCombatContact(),
      roundTime,
      counters: {
        evidenceGoals: combatDebug.huntEvidenceGoals,
        hypothesisGoals: combatDebug.huntHypothesisGoals,
        forcedMoves: combatDebug.huntForcedMoves
      },
      operators: bots.filter(bot => bot.alive).map(bot => ({
        name: bot.name,
        team: bot.team,
        goal: bot.lateRoundGoal ? { x: bot.lateRoundGoal.x, y: bot.lateRoundGoal.y } : null,
        source: bot.huntGoalSource,
        evidence: bot.huntEvidence ? { x: bot.huntEvidence.x, y: bot.huntEvidence.y, source: bot.huntEvidence.source, confidence: bot.huntEvidence.confidence, expiresAt: bot.huntEvidence.expiresAt } : null,
        clearedSectors: bot.huntClearedSectors ? bot.huntClearedSectors.length : 0,
        stationaryTimer: bot.huntStationaryTimer || 0,
        moving: (bot.moveVelocity || 0) > 0.12
      }))
    }),
    injectHuntEvidence: (team, x, y, source = 'visual', confidence = 0.9) => {
      const selectedTeam = Number(team) === TEAM_RED ? TEAM_RED : TEAM_BLUE;
      const point = nearestWalkablePoint(Number(x) || MAP_W * 0.5, Number(y) || MAP_H * 0.5);
      for (const bot of bots) {
        if (!bot.alive || bot.team !== selectedTeam) continue;
        bot.rememberHuntEvidence(point, String(source || 'visual'), clamp(Number(confidence) || 0.9, 0.1, 1), 'debug-contact');
        bot.lateRoundGoal = null;
        bot.lateRoundGoalTimer = 0;
        bot.lateRoundGoalAge = 99;
        bot.path = [];
        bot.pathIndex = 0;
        bot.pathGoal = null;
        bot.pathRefreshNeeded = true;
        bot.repathTimer = 0;
      }
      return { team: selectedTeam, point, source, confidence };
    },
    setUiHidden: hidden => { setUiButtonsHidden(Boolean(hidden)); return uiButtonsHidden; },
    buildVersionHeaderForTest: () => {
      const desktopVersion = managerBuildVersionEl?.textContent?.trim() || '';
      const mobileVersion = mobileCommandBuildVersionEl?.textContent?.trim() || '';
      return {
        ok: desktopVersion === BUILD_VERSION
          && mobileVersion === BUILD_VERSION
          && document.documentElement.dataset.buildVersion === BUILD_VERSION
          && window.__STRIKEWATCH_BUILD__ === BUILD_ID,
        buildVersion: BUILD_VERSION,
        buildId: BUILD_ID,
        desktopVersion,
        mobileVersion,
        documentVersion: document.documentElement.dataset.buildVersion || ''
      };
    },
    mobilePageHelp: () => ({
      visible: Boolean(mobilePageHelpVisible),
      shellState: menuShellEl?.dataset.mobileHelp || '',
      pressed: managerHelpToggleBtn?.getAttribute('aria-pressed') || '',
      expanded: managerHelpToggleBtn?.getAttribute('aria-expanded') || '',
      buttonDisplay: managerHelpToggleBtn ? getComputedStyle(managerHelpToggleBtn).display : 'missing',
      matchButtonDisplay: startMatchBtn ? getComputedStyle(startMatchBtn).display : 'missing',
      barDisplay: mobileCommandRouteBarEl ? getComputedStyle(mobileCommandRouteBarEl).display : 'missing',
      barAriaHidden: mobileCommandRouteBarEl?.getAttribute('aria-hidden') || ''
    }),
    setMobilePageHelpForTest: visible => setMobilePageHelpVisible(Boolean(visible), { announce: false }),
    mobilePageHelpForTest: () => {
      const original = Boolean(mobilePageHelpVisible);
      setMobilePageHelpVisible(false, { announce: false });
      const off = window.__strikeDebug.mobilePageHelp();
      setMobilePageHelpVisible(true, { announce: false });
      const on = window.__strikeDebug.mobilePageHelp();
      setMobilePageHelpVisible(original, { announce: false });
      const mobile = mobileNavigationEnabled();
      return {
        ok: mobile
          ? off.buttonDisplay !== 'none' && off.matchButtonDisplay === 'none' && off.barDisplay === 'none' && off.pressed === 'false' && on.barDisplay !== 'none' && on.pressed === 'true' && on.expanded === 'true' && on.barAriaHidden === 'false'
          : off.buttonDisplay === 'none' && off.matchButtonDisplay !== 'none' && off.barDisplay === 'none',
        mobile,
        off,
        on,
        restored: window.__strikeDebug.mobilePageHelp()
      };
    },
    advanceMatchForTest: (seconds = 1, fixedDt = 1 / 30) => {
      const total = clamp(Number(seconds) || 0, 0, 240);
      const dt = clamp(Number(fixedDt) || (1 / 30), 1 / 120, 0.1);
      const frames = Math.ceil(total / dt);
      for (let index = 0; index < frames; index++) {
        if (typeof beginNavigationPlanningFrame === 'function') beginNavigationPlanningFrame();
        if (typeof beginBotWorkFrame === 'function') beginBotWorkFrame();
        updateMatchStep(dt);
      }
      return { seconds: frames * dt, roundNumber, roundTime, score: [blueScore, redScore], alive: [teamAliveCount(TEAM_BLUE), teamAliveCount(TEAM_RED)], plan: currentEngagementPlan?.id || '', doors: doorStateSnapshot() };
    },
    forceRoundEnd: () => { roundTime = 0; roundFreezeTimer = 0; },
    forceRoundWinner: team => {
      const winner = Number(team) === TEAM_RED ? TEAM_RED : TEAM_BLUE;
      roundFreezeTimer = 0;
      finishRound(winner, 'Debug forced round result');
      return { score: [blueScore, redScore], roundEnding, matchEnding, target: matchTarget };
    },
    forceMatchWinner: team => {
      const winner = Number(team) === TEAM_RED ? TEAM_RED : TEAM_BLUE;
      if (winner === TEAM_BLUE) { blueScore = matchTarget; redScore = Math.min(redScore, matchTarget - 1); }
      else { redScore = matchTarget; blueScore = Math.min(blueScore, matchTarget - 1); }
      finishMatch(winner);
      return { score: [blueScore, redScore], matchEnding, report: careerReportState.phase, finance: careerState.lastRound?.finance || null };
    },
    advanceCareer: (seconds = 1, fixedDt = 0.1) => {
      const total = clamp(Number(seconds) || 0, 0, 30);
      const dt = clamp(Number(fixedDt) || 0.1, 0.01, 0.25);
      const frames = Math.ceil(total / dt);
      for (let i = 0; i < frames; i++) updateCareerSystem(dt);
      return { reportPhase: careerReportState.phase, cratePhase: careerCrateState.phase };
    },
    career: () => ({
      created: careerState.created,
      name: careerState.name,
      teamIdentity: { ...(careerState.teamIdentity || {}) },
      level: careerState.level,
      xp: careerState.xp,
      xpRequired: careerXpRequired(),
      points: careerState.unspentPoints,
      teamBenefits: { ...(careerState.teamBenefits || {}) },
      stats: { ...careerState.stats },
      inventory: [...careerState.inventory],
      armourInventory: [...(careerState.armourInventory || [])],
      skins: [...careerState.skins],
      equippedSkin: careerState.equippedSkinId,
      equipped: careerState.equippedWeaponId,
      loadoutTarget: careerArmouryTargetPlayer()?.id || null,
      squadLoadouts: (careerState.squad || []).map((player, index) => ({
        id: player.id,
        name: player.name,
        slot: index,
        starter: index < TEAM_REQUIRED_STARTERS,
        weaponId: careerPlayerEquippedWeaponId(player),
        weaponName: getCareerWeapon(careerPlayerEquippedWeaponId(player)).name,
        armourId: player.equippedArmourId || 'none',
        armourName: getCareerArmour(player.equippedArmourId || 'none').name,
        fatigue: player.fatigue,
        happiness: player.happiness,
        morale: player.morale,
        form: player.form,
        matchSharpness: player.matchSharpness,
        readiness: teamReadinessScore(player),
        level: player.level, xp: player.xp, xpRequired: typeof playerXpRequired === 'function' ? playerXpRequired(player) : 0, points: player.unspentPoints,
        trainingFocus: player.trainingFocus, trainingProgress: { ...(player.trainingProgress || {}) }, value: player.value, transferInterest: { ...(player.transferInterest || {}) },
        lastMatch: player.lastMatch ? { ...player.lastMatch } : null
      })),
      betweenRounds: careerBetweenRounds,
      matchComplete: careerMatchComplete,
      cratePhase: careerCrateState.phase,
      reportPhase: careerReportState.phase,
      lastRound: careerState.lastRound ? { ...careerState.lastRound } : null,
      ownedIndex: ownedOperatorIndex(),
      cratePool: [...CAREER_CRATE_POOL],
      crateResult: careerCrateState.result ? { ...careerCrateState.result } : null,
      matchStats: { ...careerMatchStats },
      wipeConfirmationOpen: careerWipeConfirmOpen,
      weaponViewer: { yaw: careerWeaponViewerState.yaw, pitch: careerWeaponViewerState.pitch, zoom: careerWeaponViewerState.zoom, autoRotate: careerWeaponViewerState.autoRotate },
      weaponVisualRevision: CAREER_WEAPON_VISUAL_REVISION,
      weaponVisuals: Object.values(CAREER_WEAPON_CATALOG).map(weapon => { const parts = careerWeaponVisualParts(weapon); return { id: weapon.id, modelClass: weapon.modelClass, parts: parts.length, roundedParts: parts.filter(part => part.shape === 'rounded').length, cylindricalParts: parts.filter(part => part.shape === 'cylinder-length').length, bounds: careerWeaponVisualBounds(weapon) }; }),
      weaponBalance: Object.values(CAREER_WEAPON_CATALOG).map(weapon => ({
        id: weapon.id, damage: [weapon.damageMin, weapon.damageMax], fireRate: weapon.fireRate,
        accuracy: weapon.accuracy, handling: weapon.handling, range: weapon.range,
        magSize: weapon.magSize, reloadTime: weapon.reloadTime, recoilKick: weapon.recoilKick,
        recoilRecovery: weapon.recoilRecovery, recoilSpread: weapon.recoilSpread,
        recoilVisualKick: weapon.recoilVisualKick, recoilVisualRecovery: weapon.recoilVisualRecovery,
        cadenceJitter: weapon.cadenceJitter, burstChance: weapon.burstChance,
        critChanceBonus: weapon.critChanceBonus || 0, critDamageBonus: weapon.critDamageBonus || 0
      })),
      simulatedRoster: bots.filter(bot => !bot.isPlayerOwned).map(bot => ({
        name: bot.name,
        team: bot.team,
        slot: bot.slot,
        statTotal: combatStatTotal(bot.rpgStats || bot.simulatedStats),
        stats: { ...(bot.rpgStats || bot.simulatedStats || {}) },
        weapon: bot.primaryWeapon?.id || bot.primaryWeapon?.name || null,
        weaponQuality: bot.primaryWeapon?.quality || null
      }))
    }),

    roundTripCareerStateForTest: () => {
      const restored = normaliseCareerState(JSON.parse(JSON.stringify(careerState)));
      return {
        version: restored.version,
        created: restored.created,
        inventory: [...restored.inventory],
        armourInventory: [...(restored.armourInventory || [])],
        selectedPlayerId: restored.selectedPlayerId || null,
        teamBenefits: { ...(restored.teamBenefits || {}) },
        developmentIntroSeen: Boolean(restored.developmentIntroSeen),
        transfers: restored.transfers ? {
          activeIncoming: restored.transfers.activeIncoming ? { ...restored.transfers.activeIncoming } : null,
          outgoingOffers: Array.isArray(restored.transfers.outgoingOffers) ? restored.transfers.outgoingOffers.map(item => ({ ...item })) : [],
          selectedOfferId: restored.transfers.selectedOfferId || null
        } : null,
        league: restored.league ? {
          season: restored.league.season,
          introSeen: Boolean(restored.league.introSeen),
          clubs: Array.isArray(restored.league.clubs) ? restored.league.clubs.length : 0,
          fixtures: Array.isArray(restored.league.fixtures) ? restored.league.fixtures.length : 0,
          pendingMode: restored.league.pendingMode || null
        } : null,
        squadLoadouts: (restored.squad || []).map((player, index) => ({
          id: player.id,
          slot: index,
          primaryWeaponId: careerPlayerPrimaryWeaponId(player),
          sidearmWeaponId: careerPlayerSidearmId(player),
          activeWeaponId: careerPlayerActiveWeaponId(player),
          armourId: player.equippedArmourId || 'none',
          fatigue: player.fatigue,
          happiness: player.happiness,
          level: player.level, xp: player.xp, points: player.unspentPoints, trainingFocus: player.trainingFocus, trainingProgress: { ...(player.trainingProgress || {}) }, value: player.value, transferInterest: { ...(player.transferInterest || {}) }, stats: { ...(player.stats || {}) },
          lastMatch: player.lastMatch ? { ...player.lastMatch } : null
        }))
      };
    },
    unlockWeaponForTest: weaponId => {
      const id = CAREER_WEAPON_CATALOG[weaponId] ? weaponId : null;
      if (!id) return { ok: false, inventory: [...careerState.inventory] };
      if (!careerState.inventory.includes(id)) careerState.inventory.push(id);
      saveCareerState();
      return { ok: true, inventory: [...careerState.inventory] };
    },
    selectLoadoutPlayerForTest: playerId => {
      const ok = selectCareerArmouryPlayer(playerId, false);
      return { ok, target: careerArmouryTargetPlayer()?.id || null, selectedWeaponId: selectedCareerWeaponId, selectedArmourId: selectedCareerArmourId };
    },
    equipPlayerArmourForTest: (playerId, armourId) => {
      const selected = selectCareerArmouryPlayer(playerId, false, { guard: false });
      const equipped = selected ? equipCareerArmour(String(armourId || 'none'), { render: false }) : false;
      const player = (careerState.squad || []).find(candidate => candidate.id === playerId) || null;
      const persistedRaw = typeof careerStorageValue === 'function' ? careerStorageValue(CAREER_STORAGE_KEY) : null;
      let persistedPlayer = null;
      if (persistedRaw) {
        try {
          const persisted = normaliseCareerState(JSON.parse(persistedRaw));
          persistedPlayer = (persisted.squad || []).find(candidate => candidate.id === playerId) || null;
        } catch (error) {
          persistedPlayer = null;
        }
      }
      return {
        selected,
        equipped,
        playerId,
        armourId: player?.equippedArmourId || 'none',
        storageAvailable: Boolean(persistedRaw),
        persistedArmourId: persistedRaw ? (persistedPlayer?.equippedArmourId || 'none') : null,
        ownedCopies: careerArmourOwnedCount(String(armourId || 'none')),
        assignedCopies: careerArmourAssignmentCount(String(armourId || 'none'))
      };
    },
    equipPlayerWeaponForTest: (playerId, weaponId, slot = null) => {
      const selected = selectCareerArmouryPlayer(playerId, false);
      const equipped = selected ? equipCareerWeapon(weaponId, slot ? { slot: String(slot) } : {}) : false;
      const player = (careerState.squad || []).find(candidate => candidate.id === playerId) || null;
      const persisted = loadCareerState();
      const persistedPlayer = (persisted.squad || []).find(candidate => candidate.id === playerId) || null;
      return { selected, equipped, playerId, primaryWeaponId: player ? careerPlayerPrimaryWeaponId(player) : null, sidearmWeaponId: player ? careerPlayerSidearmId(player) : null, persistedPrimaryWeaponId: persistedPlayer ? careerPlayerPrimaryWeaponId(persistedPlayer) : null, persistedSidearmWeaponId: persistedPlayer ? careerPlayerSidearmId(persistedPlayer) : null, workflowDirty: typeof workflowLoadoutDirty === 'function' ? workflowLoadoutDirty() : false };
    },
    multiKillRewardForTest: counts => {
      const sequence = Array.isArray(counts) ? counts : [2, 3, 4, 5];
      const events = sequence.map((count, index) => ({ count: Number(count), playerId: 'TEST', playerName: 'TEST OPERATOR', round: 1, at: index + 1 }));
      return { windowSeconds: CAREER_MULTI_KILL_WINDOW, tiers: Object.values(CAREER_MULTI_KILL_REWARDS).map(tier => ({ ...tier })), breakdown: careerMultiKillRewardBreakdown(events) };
    },
    multiKillSequenceForTest: (kills = 5, interval = 1) => {
      careerMatchStats = makeCareerMatchStats();
      simulationClock = 100;
      resetMultiKillBanner(true);
      const player = (careerState.squad || [])[0] || null;
      const killer = { team: CAREER_OWNED_TEAM, isPlayerOwned: true, multiKillCount: 0, multiKillLastAt: -999, playerProfileId: player?.id || 'TEST', name: player?.name || 'TEST OPERATOR' };
      const events = [];
      for (let index = 0; index < Math.max(0, Math.round(Number(kills) || 0)); index++) {
        if (index) simulationClock += Math.max(0, Number(interval) || 0);
        const event = registerOwnedMultiKill(killer);
        if (event) events.push({ ...event });
      }
      const beforeOpponent = careerMatchStats.multiKillEvents.length;
      const opponentResult = registerOwnedMultiKill({ team: TEAM_RED, isPlayerOwned: false, multiKillCount: 1, multiKillLastAt: simulationClock, name: 'OPPOSITION' });
      const timeoutKiller = { team: CAREER_OWNED_TEAM, isPlayerOwned: true, multiKillCount: 3, multiKillLastAt: simulationClock - CAREER_MULTI_KILL_WINDOW - 1, playerProfileId: player?.id || 'TEST', name: 'RESET TEST' };
      const timeoutResult = registerOwnedMultiKill(timeoutKiller);
      return {
        events,
        count: killer.multiKillCount,
        breakdown: careerMultiKillRewardBreakdown(careerMatchStats.multiKillEvents),
        banner: { hidden: Boolean(multiKillBannerEl?.hidden), title: multiKillTitleEl?.textContent || '', detail: multiKillDetailEl?.textContent || '', queue: multiKillBannerQueue.length },
        opponentIgnored: opponentResult === null && careerMatchStats.multiKillEvents.length === beforeOpponent,
        timeoutReset: timeoutResult === null && timeoutKiller.multiKillCount === 1
      };
    },
    multiKillSettlementForTest: () => {
      if (!careerState.created || !careerSquadReady()) return { ok: false, reason: 'career not ready' };
      const careerSnapshot = JSON.parse(JSON.stringify(careerState));
      const trackingSnapshot = JSON.parse(JSON.stringify(teamMatchPlayerStats || {}));
      try {
        resetTeamMatchTracking();
        const player = careerState.squad[0];
        const performance = teamMatchPlayerStats[player.id];
        Object.assign(performance, { rounds: 3, roundsWon: 3, kills: 5, deaths: 1, shotsFired: 18, shotsHit: 9, damageDealt: 360, damageTaken: 110, survivalTime: 130, survivedRounds: 2 });
        const events = [2, 3, 4, 5].map((count, index) => ({ count, playerId: player.id, playerName: player.name, round: 1, at: 10 + index }));
        const multiKillBonus = careerMultiKillRewardBreakdown(events);
        const creditsBefore = careerState.credits;
        const goldBefore = careerState.goldCoins;
        const honourBefore = {
          double: Number(player.career?.doubleKills) || 0,
          triple: Number(player.career?.tripleKills) || 0,
          ultra: Number(player.career?.ultraKills) || 0,
          rampage: Number(player.career?.rampages) || 0
        };
        const summary = { roundsPlayed: 3, blueScore: 3, redScore: 0, multiKillEvents: events, multiKillBonus };
        const finance = settleTeamManagementAfterMatch(TEAM_BLUE, summary);
        const gold = settleCareerGoldCoinsAfterMatch(TEAM_BLUE, summary);
        const updated = careerState.squad[0];
        const report = careerReportMarkup({ ...summary, won: true, xpAward: 102, xpBreakdown: { multiKill: 102 }, finance, goldCoinReward: gold, score: 80, grade: 'A' }, true);
        return {
          ok: true,
          expected: multiKillBonus,
          financeMultiKillBonus: finance?.multiKillBonus || 0,
          goldMultiKillBonus: gold?.multiKillBonus || 0,
          creditsDelta: careerState.credits - creditsBefore,
          goldDelta: careerState.goldCoins - goldBefore,
          honoursDelta: {
            double: (Number(updated.career?.doubleKills) || 0) - honourBefore.double,
            triple: (Number(updated.career?.tripleKills) || 0) - honourBefore.triple,
            ultra: (Number(updated.career?.ultraKills) || 0) - honourBefore.ultra,
            rampage: (Number(updated.career?.rampages) || 0) - honourBefore.rampage
          },
          highestMultiKill: Number(updated.lastMatch?.highestMultiKill) || 0,
          reportHasHonours: report.includes('MULTI-KILL HONOURS') && report.includes('RAMPAGE')
        };
      } finally {
        careerState = careerSnapshot;
        teamMatchPlayerStats = trackingSnapshot;
      }
    },
    playerProfileConsolidationForTest: (playerId = '') => {
      const player = (careerState.squad || []).find(candidate => candidate.id === playerId) || (careerState.squad || [])[0] || null;
      if (!player) return { ok: false, reason: 'missing player' };
      selectedTeamPlayerId = player.id;
      careerState.selectedPlayerId = player.id;
      setMenuRoute('profile');
      const html = menuContentEl?.innerHTML || '';
      return {
        ok: true,
        route: menuTab,
        playerId: player.id,
        embeddedTelemetry: Boolean(menuContentEl?.querySelector('[data-player-profile-telemetry]')),
        separateTelemetryAction: html.includes('OPEN PLAYER TELEMETRY'),
        profileDataAction: html.includes('PROFILE &amp; DATA') || html.includes('PROFILE & DATA')
      };
    },
    testCrateRoll: value => rollCareerCrateReward(value),
    forceCrateReward: (type, id) => {
      const reward = normaliseCareerCrateReward({ type, id });
      careerCrateState.result = reward;
      return reward;
    },
    reloadPoseSample: (progress = 0.5, emptyMagazine = true) => firstPersonReloadPhases(Number(progress) || 0, true, Boolean(emptyMagazine)),
    reloadAudioSequenceForTest: (weaponId = 'service-p12', progress = 0.99) => {
      const bot = bots[spectatorIndex] || bots.find(item => item.alive);
      const requested = String(weaponId || 'service-p12');
      const genericWeapon = weaponDefs.find(item => item.name === requested) || (requested === 'sidearm' || requested === SIDEARM_DEF.name ? SIDEARM_DEF : null);
      const weapon = CAREER_WEAPON_CATALOG[requested]
        ? cloneCareerWeapon(requested)
        : (CAREER_NPC_WEAPON_CATALOG[requested] ? { ...CAREER_NPC_WEAPON_CATALOG[requested] } : (genericWeapon ? { ...genericWeapon } : null));
      if (!bot || !weapon) return { ok: false, reason: !bot ? 'missing operator' : 'unknown weapon' };
      const original = {
        weapon: bot.weapon,
        primaryWeapon: bot.primaryWeapon,
        usingSecondary: bot.usingSecondary,
        magAmmo: bot.magAmmo,
        primaryAmmo: bot.primaryAmmo,
        primaryReserve: bot.primaryReserve,
        reloadTimer: bot.reloadTimer,
        reloadDuration: bot.reloadDuration,
        reloadProgress: bot.reloadProgress,
        reloadStartedEmpty: bot.reloadStartedEmpty,
        reloadAudioCueMask: bot.reloadAudioCueMask
      };
      const before = { ...combatDebug.reloadAudioCueCounts };
      bot.weapon = weapon;
      bot.primaryWeapon = weapon;
      bot.usingSecondary = false;
      bot.magAmmo = 0;
      bot.primaryAmmo = 0;
      bot.primaryReserve = Math.max(weapon.magSize, 1);
      bot.reloadTimer = 0;
      bot.reloadProgress = 0;
      bot.reloadAudioCueMask = 0;
      const started = bot.beginReload();
      const p = clamp(Number(progress) || 0, 0, 1);
      if (started) {
        bot.reloadTimer = Math.max(0.001, bot.reloadDuration * (1 - Math.min(p, 0.999)));
        bot.updateReloadAudioCues(0, p);
        bot.reloadProgress = p;
      }
      const after = { ...combatDebug.reloadAudioCueCounts };
      const delta = Object.fromEntries(Object.keys(after).map(key => [key, after[key] - (before[key] || 0)]));
      const result = {
        ok: started,
        weapon: weapon.id || weapon.name,
        profile: careerWeaponReloadAudioProfile(weapon),
        cueMask: bot.reloadAudioCueMask,
        cueDelta: delta,
        fullSequence: bot.reloadAudioCueMask === 31,
        coverage: validateCareerWeaponReloadAudioCoverage()
      };
      Object.assign(bot, original);
      return result;
    },
    recoilSequenceForTest: (weaponId = 'service-p12', shots = 4, interval = 0.12) => {
      const blue = bots.find(bot => bot.team === TEAM_BLUE);
      const red = bots.find(bot => bot.team === TEAM_RED);
      const weapon = cloneCareerWeapon(CAREER_WEAPON_CATALOG[weaponId] ? weaponId : 'service-p12');
      if (!blue || !red) return { ok: false, reason: 'missing operators' };
      let pair = null;
      for (let y = 1; y < MAP_H - 1 && !pair; y++) {
        for (let x = 1; x < MAP_W - 5 && !pair; x++) {
          const a = { x: x + CELL_CENTER, y: y + CELL_CENTER };
          if (!canStand(a.x, a.y, BOT_RADIUS)) continue;
          for (let offset = 2; offset <= 5; offset++) {
            const b = { x: x + offset + CELL_CENTER, y: y + CELL_CENTER };
            if (canStand(b.x, b.y, BOT_RADIUS) && hasLineOfSight(a, b)) { pair = [a, b]; break; }
          }
        }
      }
      if (!pair) return { ok: false, reason: 'no test lane' };
      blue.alive = true; red.alive = true;
      blue.x = pair[0].x; blue.y = pair[0].y;
      red.x = pair[1].x; red.y = pair[1].y;
      blue.angle = Math.atan2(red.y - blue.y, red.x - blue.x);
      red.angle = blue.angle + Math.PI;
      blue.primaryWeapon = weapon; blue.weapon = weapon; blue.usingSecondary = false;
      blue.magAmmo = Math.max(weapon.magSize, Math.floor(Number(shots) || 4) + 1);
      blue.primaryAmmo = blue.magAmmo; blue.primaryReserve = weapon.magSize * 3;
      blue.weaponHeat = 0; blue.recoil = 0; blue.cooldown = 0;
      red.maxHealth = 10000; red.health = 10000;
      const count = clamp(Math.floor(Number(shots) || 4), 1, 12);
      const dt = clamp(Number(interval) || 0.12, 0.01, 0.8);
      const samples = [];
      for (let i = 0; i < count; i++) {
        blue.cooldown = 0;
        const fired = blue.shoot(red, dist(blue, red));
        samples.push({ shot: i + 1, fired, heat: blue.weaponHeat, recoil: blue.recoil, ammo: blue.magAmmo });
        const heatRecovery = (Number(weapon.recoilRecovery) || 5) * (0.72 + (Number(weapon.handling) || 0.5) * 0.55);
        blue.weaponHeat = Math.max(0, blue.weaponHeat - dt * heatRecovery);
        blue.recoil = Math.max(0, blue.recoil - dt * (Number(weapon.recoilVisualRecovery) || 8));
      }
      return { ok: true, weapon: weapon.id, interval: dt, samples };
    },
    forceReloadForTest: (progress = 0) => {
      const bot = bots[spectatorIndex] || bots.find(item => item.alive);
      if (!bot) return { ok: false, reason: 'missing operator' };
      bot.weaponSwapTimer = 0;
      bot.magAmmo = 0;
      if (bot.usingSecondary) {
        bot.secondaryAmmo = 0;
        bot.secondaryReserve = Math.max(bot.secondaryReserve, bot.weapon.magSize);
      } else {
        bot.primaryAmmo = 0;
        bot.primaryReserve = Math.max(bot.primaryReserve, bot.weapon.magSize);
      }
      const started = bot.beginReload();
      if (started) {
        const p = clamp(Number(progress) || 0, 0, 0.99);
        const previous = bot.reloadProgress;
        bot.reloadProgress = p;
        bot.reloadTimer = bot.reloadDuration * (1 - p);
        bot.updateReloadAudioCues(previous, p);
      }
      return {
        ok: started,
        name: bot.name,
        weapon: bot.weapon?.id || bot.weapon?.name,
        reloadAudioProfile: typeof weaponReloadAudioProfile === 'function' ? weaponReloadAudioProfile(bot) : null,
        progress: bot.reloadProgress,
        timer: bot.reloadTimer,
        duration: bot.reloadDuration,
        cueMask: bot.reloadAudioCueMask,
        phases: firstPersonReloadPhases(bot.reloadProgress, started, true),
        reloadCoverage: typeof validateCareerWeaponReloadAudioCoverage === 'function' ? validateCareerWeaponReloadAudioCoverage() : null
      };
    },

    reloadCoverBehaviourForTest: () => {
      const snapshot = snapshotCombatTestBots();
      const counters = {
        seeks: Number(combatDebug.reloadCoverSeeks) || 0,
        arrivals: Number(combatDebug.reloadCoverArrivals) || 0,
        fallbacks: Number(combatDebug.reloadCoverFallbacks) || 0
      };
      try {
        const blue = bots.find(bot => bot.team === TEAM_BLUE);
        const red = bots.find(bot => bot.team === TEAM_RED);
        if (!blue || !red) return { ok: false, reason: 'missing operators' };
        const lane = debugCombatTestLane();
        if (!lane) return { ok: false, reason: 'no test lane' };
        blue.x = lane[0].x; blue.y = lane[0].y; blue.angle = Math.atan2(lane[2].y - lane[0].y, lane[2].x - lane[0].x); blue.pathAngle = blue.angle;
        red.x = lane[2].x; red.y = lane[2].y; red.angle = Math.atan2(lane[0].y - lane[2].y, lane[0].x - lane[2].x); red.pathAngle = red.angle;
        blue.alive = true; red.alive = true;
        blue.hasDedicatedPrimary = true;
        blue.usingSecondary = false;
        blue.weapon = blue.primaryWeapon;
        blue.magAmmo = 0; blue.primaryAmmo = 0; blue.primaryReserve = Math.max(1, blue.primaryWeapon.magSize);
        blue.secondaryAmmo = 0; blue.secondaryReserve = 0;
        blue.lastSeen = { x: red.x, y: red.y }; blue.lastSeenTimer = 3; blue.lastDamageTime = simulationClock;
        blue.target = red; blue.sightCandidate = red;
        blue.clearCombatCover(); blue.wantsSafeReload = false; blue.safeReloadTimer = 0; blue.reloadTimer = 0; blue.weaponSwapTimer = 0;
        const started = blue.beginReload();
        blue.updateWeaponState(0.016, red);
        const noAlternateSnapshot = {
          reloadTimer: blue.reloadTimer,
          wantsSafeReload: blue.wantsSafeReload,
          reloadCoverRequired: blue.reloadCoverRequired
        };
        const cover = blue.findCombatCover(red, true);
        if (cover) blue.assignCombatCover(cover, 'reload without available sidearm');
        const startDistance = cover ? dist(blue, cover.anchor) : null;
        let distanceAtReloadFinish = null;
        let distanceAfterReloadFinish = null;
        if (cover) {
          for (let i = 0; i < 12; i++) blue.updateCoverCombat(1 / 60, red);
          distanceAtReloadFinish = dist(blue, cover.anchor);
          blue.finishReload();
          for (let i = 0; i < 120 && dist(blue, cover.anchor) > 0.22; i++) blue.updateCoverCombat(1 / 60, red);
          distanceAfterReloadFinish = dist(blue, cover.anchor);
        } else {
          blue.updateActiveCoverTactic(1 / 60);
        }
        const endDistance = cover ? dist(blue, cover.anchor) : null;
        const continuedAfterReload = !cover || (distanceAfterReloadFinish < distanceAtReloadFinish && blue.reloadCoverCommitActive === false);
        blue.finishReload();
        blue.clearCombatCover();
        blue.wantsSafeReload = false;
        blue.safeReloadTimer = 0;
        blue.secondaryWeapon = cloneCareerWeapon('service-p12');
        blue.secondaryAmmo = 4;
        blue.magAmmo = 0; blue.primaryAmmo = 0; blue.primaryReserve = Math.max(1, blue.primaryWeapon.magSize);
        blue.beginReload();
        blue.updateWeaponState(0.016, red);
        const loadedAlternateAvoidsForcedCover = !blue.reloadCoverRequired && !blue.wantsSafeReload;
        return {
          ok: started && noAlternateSnapshot.reloadCoverRequired && noAlternateSnapshot.wantsSafeReload && (cover ? endDistance < startDistance : blue.tacticalMode === 'fallback') && continuedAfterReload && loadedAlternateAvoidsForcedCover,
          started,
          coverFound: Boolean(cover),
          startDistance,
          distanceAtReloadFinish,
          distanceAfterReloadFinish,
          endDistance,
          continuedAfterReload,
          noAlternate: noAlternateSnapshot,
          loadedAlternateAvoidsForcedCover,
          counterDelta: {
            seeks: (Number(combatDebug.reloadCoverSeeks) || 0) - counters.seeks,
            arrivals: (Number(combatDebug.reloadCoverArrivals) || 0) - counters.arrivals,
            fallbacks: (Number(combatDebug.reloadCoverFallbacks) || 0) - counters.fallbacks
          }
        };
      } finally {
        restoreCombatTestBots(snapshot);
      }
    },
    hitReactionFlinchForTest: () => {
      const snapshot = snapshotCombatTestBots();
      const beforeEvents = Number(combatDebug.flinchEvents) || 0;
      const beforeBlocks = Number(combatDebug.flinchCooldownBlocks) || 0;
      try {
        const target = bots.find(bot => bot.team === TEAM_BLUE);
        const enemy = bots.find(bot => bot.team === TEAM_RED);
        if (!target || !enemy) return { ok: false, reason: 'missing operator' };
        target.alive = true; target.health = target.maxHealth;
        enemy.alive = true; enemy.health = enemy.maxHealth; target.flinchTimer = 0; target.flinchCooldown = 0; target.flinchStrength = 0; target.flinchAimOffset = 0; target.flinchAge = 99; target.hitDirection = 1;
        const light = target.applyCombatFlinch({ appliedDamage: 4, armourAbsorbed: 12, critical: false, headshot: false, direction: 1 }, 0.99);
        const strong = target.applyCombatFlinch({ appliedDamage: 26, armourAbsorbed: 0, critical: true, headshot: false, direction: -1 }, 0);
        const timerAfterStrong = target.flinchTimer;
        const blocked = target.applyCombatFlinch({ appliedDamage: 40, armourAbsorbed: 0, critical: true, headshot: true, direction: 1 }, 0);
        const firingBlocked = target.flinchTimer > 0 && target.shoot(enemy, 3) === false;
        return {
          ok: !light.triggered && strong.triggered && strong.chance <= 0.44 && timerAfterStrong >= 0.11 && timerAfterStrong <= 0.22 && blocked.reason === 'cooldown' && firingBlocked,
          light, strong, blocked, timerAfterStrong, firingBlocked,
          eventDelta: (Number(combatDebug.flinchEvents) || 0) - beforeEvents,
          cooldownBlockDelta: (Number(combatDebug.flinchCooldownBlocks) || 0) - beforeBlocks
        };
      } finally {
        restoreCombatTestBots(snapshot);
      }
    },

    forceTacticalScenario: (scenario = 'cover') => {
      const mode = String(scenario || 'cover').toLowerCase();
      const blue = bots.find(bot => bot.team === TEAM_BLUE);
      const redTeam = bots.filter(bot => bot.team === TEAM_RED);
      const red = redTeam[0];
      const redSupport = redTeam[1];
      if (!blue || !red) return { ok: false, reason: 'missing operators' };

      const survivors = new Set([blue, red]);
      if (mode === 'outnumbered' && redSupport) survivors.add(redSupport);
      for (const bot of bots) {
        bot.alive = survivors.has(bot);
        bot.health = bot.alive ? bot.maxHealth : 0;
        bot.target = null;
        bot.sightCandidate = null;
        bot.sightTime = 0;
        bot.lastSeen = null;
        bot.lastSeenTimer = 0;
        bot.heardSound = null;
        bot.heardSoundTimer = 0;
        bot.huntEvidence = null;
        bot.huntClearedSectors = [];
        bot.huntGoalSource = 'debug-reset';
        bot.huntStationaryTimer = 0;
        bot.path = [];
        bot.pathIndex = 0;
        bot.pathGoal = null;
        bot.pathRefreshNeeded = false;
        bot.clearCombatCover();
        bot.tacticalMode = 'advance';
        bot.tacticalModeTimer = 0;
        bot.tacticalDecisionTimer = 0;
        bot.tacticalEnemyKey = '';
        bot.lastTacticalReason = 'debug setup';
        bot.combatBurstCount = 0;
        bot.combatBurstTarget = 2;
        bot.combatRepositionRequested = false;
        bot.combatCoverCooldown = 0;
        bot.repositionCooldown = 0;
        bot.wantsSafeReload = false;
        bot.safeReloadTimer = 0;
        bot.reloadTimer = 0;
        bot.weaponSwapTimer = 0;
        bot.cooldown = 0;
        bot.burstGap = 0;
        bot.combatBurstPause = 0;
      }

      if (mode === 'primary-recovery') {
        blue.usingSecondary = true;
        blue.weapon = blue.secondaryWeapon;
        blue.secondaryAmmo = Math.max(2, blue.secondaryAmmo || 0);
        blue.magAmmo = blue.secondaryAmmo;
        blue.primaryAmmo = 0;
        blue.primaryReserve = Math.max(blue.primaryWeapon.magSize, blue.primaryReserve || 0);
        blue.updateWeaponState(0, null);
        return {
          ok: blue.weaponSwapTimer > 0 && blue.weaponSwapTarget === false,
          scenario: mode,
          usingSecondary: blue.usingSecondary,
          swapTimer: blue.weaponSwapTimer,
          swapTarget: blue.weaponSwapTarget,
          primaryAmmo: blue.primaryAmmo,
          primaryReserve: blue.primaryReserve
        };
      }

      const candidateStarts = [];
      for (let y = 1; y < MAP_H - 1; y++) {
        for (let x = 1; x < MAP_W - 1; x++) {
          const point = { x: x + CELL_CENTER, y: y + CELL_CENTER };
          if (!canStand(point.x, point.y, BOT_RADIUS + 0.02)) continue;
          let nearCover = false;
          for (let i = 0; i < 8; i++) {
            if (clearanceAlong(point.x, point.y, i * TAU / 8, 1.05, BOT_RADIUS) < 0.72) {
              nearCover = true;
              break;
            }
          }
          if (nearCover) candidateStarts.push(point);
        }
      }

      let selected = null;
      let cover = null;
      let attempts = 0;
      outer:
      for (const start of candidateStarts) {
        for (let y = 1; y < MAP_H - 1; y++) {
          for (let x = 1; x < MAP_W - 1; x++) {
            if (++attempts > 9000) break outer;
            const threat = { x: x + CELL_CENTER, y: y + CELL_CENTER };
            if (!canStand(threat.x, threat.y, BOT_RADIUS + 0.02)) continue;
            const spacing = dist(start, threat);
            if (spacing < 4.2 || spacing > 7.4 || !hasLineOfSight(start, threat)) continue;
            blue.x = start.x; blue.y = start.y; blue.angle = Math.atan2(threat.y - start.y, threat.x - start.x); blue.pathAngle = blue.angle;
            red.x = threat.x; red.y = threat.y; red.angle = Math.atan2(start.y - threat.y, start.x - threat.x); red.pathAngle = red.angle;
            blue.combatCoverCooldown = 0;
            cover = blue.findCombatCover(red, mode === 'safe-reload' || mode === 'low-health' || mode === 'outnumbered');
            if (cover) {
              selected = { start: { ...start }, threat: { ...threat } };
              break outer;
            }
          }
        }
      }

      if (!selected) {
        const fallbackBlue = nearestWalkablePoint(9.5, 21.5);
        const fallbackRed = nearestWalkablePoint(14.5, 21.5);
        blue.x = fallbackBlue.x; blue.y = fallbackBlue.y; blue.angle = 0; blue.pathAngle = 0;
        red.x = fallbackRed.x; red.y = fallbackRed.y; red.angle = Math.PI; red.pathAngle = Math.PI;
        cover = blue.findCombatCover(red, true);
        selected = { start: fallbackBlue, threat: fallbackRed };
      }

      if (redSupport && survivors.has(redSupport)) {
        const supportPoint = nearestWalkablePoint(red.x, red.y + 1.15);
        redSupport.x = supportPoint.x;
        redSupport.y = supportPoint.y;
        redSupport.angle = red.angle;
        redSupport.pathAngle = red.angle;
        redSupport.cooldown = 999;
        redSupport.magAmmo = 0;
        redSupport.primaryAmmo = 0;
        redSupport.secondaryAmmo = 0;
        redSupport.primaryReserve = 0;
        redSupport.secondaryReserve = 0;
      }

      blue.target = red;
      blue.sightCandidate = red;
      blue.sightTime = blue.reactionDelay;
      blue.lastSeen = { x: red.x, y: red.y };
      blue.lastSeenTimer = 5;
      blue.tacticalEnemyKey = red.name;
      red.target = blue;
      red.sightCandidate = blue;
      red.sightTime = red.reactionDelay;
      red.lastSeen = { x: blue.x, y: blue.y };
      red.lastSeenTimer = 5;
      red.cooldown = 999;
      red.magAmmo = Math.max(1, red.magAmmo);

      if (mode === 'cover') {
        if (cover) blue.assignCombatCover(cover, 'debug cover test');
      } else if (mode === 'safe-reload') {
        blue.magAmmo = 0;
        blue.primaryAmmo = 0;
        blue.secondaryAmmo = 0;
        blue.primaryReserve = Math.max(blue.weapon.magSize, blue.primaryReserve);
        blue.secondaryReserve = 0;
        blue.wantsSafeReload = true;
        blue.chooseCombatTactic(red, true);
      } else if (mode === 'low-health') {
        blue.health = Math.max(1, blue.maxHealth * 0.24);
        blue.chooseCombatTactic(red, true);
      } else if (mode === 'outnumbered') {
        blue.health = Math.max(1, blue.maxHealth * 0.62);
        blue.chooseCombatTactic(red, true);
      } else if (mode === 'enemy-reload') {
        red.reloadTimer = 1.4;
        red.reloadDuration = 1.4;
        blue.magAmmo = Math.max(3, blue.magAmmo);
        blue.chooseCombatTactic(red, true);
      } else {
        blue.chooseCombatTactic(red, true);
      }

      roundFreezeTimer = 0;
      roundEnding = false;
      matchEnding = false;
      roundTime = 75;
      lastCombatContactAt = simulationClock;
      spectatorIndex = bots.indexOf(blue);
      autoSpectate = false;
      updateHud();
      return {
        ok: true,
        scenario: mode,
        selected,
        coverFound: Boolean(cover),
        tacticalMode: blue.tacticalMode,
        tacticalLabel: botTacticalStatus(blue, false),
        reason: blue.lastTacticalReason,
        wantsSafeReload: blue.wantsSafeReload,
        alive: [teamAliveCount(TEAM_BLUE), teamAliveCount(TEAM_RED)]
      };
    },

    forceLateRoundDuel: () => {
      const blue = bots.find(bot => bot.team === TEAM_BLUE);
      const red = bots.find(bot => bot.team === TEAM_RED);
      for (const bot of bots) bot.alive = false;
      for (const bot of bots) {
        bot.reset(false);
        bot.alive = bot === blue || bot === red;
        bot.health = bot.alive ? bot.maxHealth : 0;
        bot.target = null;
        bot.lastSeen = null;
        bot.heardSound = null;
        bot.huntEvidence = null;
        bot.huntClearedSectors = [];
        bot.huntGoalSource = 'debug-reset';
        bot.huntStationaryTimer = 0;
        bot.path = [];
        bot.pathGoal = null;
        bot.pathIndex = 0;
        bot.lateRoundGoal = null;
        bot.lateRoundGoalTimer = 0;
        bot.lateRoundGoalAge = 0;
        bot.lateRoundGoalHistory = [];
        bot.lateRoundLastHeading = bot.pathAngle;
        bot.lateRoundTargetKey = '';
        bot.lateRoundTargetUntil = 0;
        bot.navTrail = [{ x: bot.x, y: bot.y, cell: keyOf(Math.floor(bot.x), Math.floor(bot.y)), at: simulationClock }];
        bot.navTrailSampleTimer = 0;
        bot.navigationDetourGoal = null;
        bot.navigationDetourTimer = 0;
        bot.navigationLoopCooldown = 0;
        bot.navigationLoopRecoveries = 0;
        bot.navProgressGoalKey = '';
        bot.navProgressBest = Infinity;
        bot.navProgressTimer = 0;
        bot.navProgressRecoveries = 0;
      }
      if (blue && red) {
        blue.x = 3.2; blue.y = 3.5; blue.angle = 0;
        red.x = MAP_W - 3.2; red.y = MAP_H - 3.5; red.angle = Math.PI;
        blue.objective = blue.chooseObjective(null, 3);
        red.objective = red.chooseObjective(null, 3);
        for (const bot of [blue, red]) {
          bot.navTrail = [{ x: bot.x, y: bot.y, cell: keyOf(Math.floor(bot.x), Math.floor(bot.y)), at: simulationClock }];
          bot.navTrailSampleTimer = 0;
        }
      }
      roundFreezeTimer = 0;
      roundEnding = false;
      matchEnding = false;
      roundTime = 90;
      suddenHuntOvertime = false;
      lastCombatContactAt = simulationClock - 12;
      lateRoundMode = false;
      updateHud();
      return true;
    },

    forceLateRoundSkirmish: () => {
      const blueTeam = bots.filter(bot => bot.team === TEAM_BLUE).slice(0, 2);
      const red = bots.find(bot => bot.team === TEAM_RED);
      const survivors = new Set([...blueTeam, red].filter(Boolean));
      for (const bot of bots) {
        bot.alive = survivors.has(bot);
        bot.health = bot.alive ? 100 : 0;
        bot.target = null;
        bot.lastSeen = null;
        bot.heardSound = null;
        bot.huntEvidence = null;
        bot.huntClearedSectors = [];
        bot.huntGoalSource = 'debug-reset';
        bot.huntStationaryTimer = 0;
        bot.path = [];
        bot.pathGoal = null;
        bot.pathIndex = 0;
        bot.lateRoundGoal = null;
        bot.lateRoundGoalTimer = 0;
        bot.lateRoundGoalAge = 0;
        bot.lateRoundGoalHistory = [];
        bot.lateRoundLastHeading = bot.pathAngle;
        bot.lateRoundTargetKey = '';
        bot.lateRoundTargetUntil = 0;
        bot.navTrail = [{ x: bot.x, y: bot.y, cell: keyOf(Math.floor(bot.x), Math.floor(bot.y)), at: simulationClock }];
        bot.navTrailSampleTimer = 0;
        bot.navigationDetourGoal = null;
        bot.navigationDetourTimer = 0;
        bot.navigationLoopCooldown = 0;
        bot.navigationLoopRecoveries = 0;
        bot.navProgressGoalKey = '';
        bot.navProgressBest = Infinity;
        bot.navProgressTimer = 0;
        bot.navProgressRecoveries = 0;
      }
      if (blueTeam[0]) { const p = nearestWalkablePoint(3.2, 3.5); blueTeam[0].x = p.x; blueTeam[0].y = p.y; blueTeam[0].angle = 0; }
      if (blueTeam[1]) { const p = nearestWalkablePoint(4.2, MAP_H - 4.0); blueTeam[1].x = p.x; blueTeam[1].y = p.y; blueTeam[1].angle = 0; }
      if (red) { const p = nearestWalkablePoint(MAP_W - 3.2, MAP_H * 0.5); red.x = p.x; red.y = p.y; red.angle = Math.PI; }
      for (const bot of survivors) {
        bot.objective = bot.chooseObjective(null, 3);
        bot.navTrail = [{ x: bot.x, y: bot.y, cell: keyOf(Math.floor(bot.x), Math.floor(bot.y)), at: simulationClock }];
        bot.navTrailSampleTimer = 0;
      }
      roundFreezeTimer = 0;
      roundEnding = false;
      matchEnding = false;
      roundTime = 90;
      suddenHuntOvertime = false;
      lastCombatContactAt = simulationClock - 12;
      lateRoundMode = false;
      updateHud();
      return true;
    },
    runtimeFaultsForTest: () => runtimeFaultSnapshot(),
    corpsePresentationForTest: () => {
      if (!glReady) return { ok: false, reason: 'WebGL renderer unavailable.' };
      const cameraBot = bots.find(bot => bot.alive) || bots[0] || null;
      const source = bots.find(bot => bot !== cameraBot) || null;
      if (!cameraBot || !source) return { ok: false, reason: 'No operator pair available.' };
      const samples = [];
      for (const distance of [3, 12, 24]) {
        for (const pose of [0, 1, 2]) {
          const corpse = Object.assign(Object.create(Object.getPrototypeOf(source)), source, {
            alive: false,
            x: cameraBot.x + Math.cos(cameraBot.angle || 0) * distance,
            y: cameraBot.y + Math.sin(cameraBot.angle || 0) * distance,
            deathAnim: 1,
            deathTime: performance.now() / 1000 - 2,
            deathPose: pose,
            deathSide: pose % 2 ? -1 : 1,
            deathWeaponSide: pose % 2 ? 1 : -1,
            deathYaw: Math.PI / 2 - (source.angle || 0),
            deathTwist: 0.12,
            deathImpactStrength: 0.7,
            deathPush: 0.3
          });
          try {
            drawCorpse(corpse, cameraBot);
            samples.push({ distance, pose, ok: true });
          } catch (error) {
            samples.push({ distance, pose, ok: false, error: String(error?.message || error) });
          }
        }
      }
      return { ok: samples.every(sample => sample.ok), samples };
    },
    firstEliminationContinuityForTest: () => {
      if (!glReady) return { ok: false, reason: 'WebGL renderer unavailable.' };
      const killer = bots.find(bot => bot.team === CAREER_OWNED_TEAM && bot.alive) || null;
      const victim = bots.find(bot => bot.team !== CAREER_OWNED_TEAM && bot.alive) || null;
      if (!killer || !victim) return { ok: false, reason: 'No live opposing pair available.' };
      const beforeFaults = runtimeFaults.length;
      victim.die(killer, { critical: false, headshot: false, damage: Math.max(1, Number(victim.health) || 1) });
      let rendered = false;
      try {
        renderWebGL(killer);
        rendered = true;
      } catch (error) {
        recordRuntimeFault(error, 'test-render');
      }
      return {
        ok: !victim.alive && runtimeFaults.length === beforeFaults,
        rendered,
        killer: killer.name,
        victim: victim.name,
        faults: runtimeFaultSnapshot().slice(beforeFaults)
      };
    },
    operatorPresentationForTest: (distance = 2.8) => {
      const camera = bots.find(bot => bot.team === TEAM_BLUE) || bots[0];
      const target = bots.find(bot => bot.team === TEAM_RED) || bots[1];
      if (!camera || !target) return { ok: false, reason: 'missing operators' };
      const previewLane = debugCombatTestLane();
      const cameraPoint = previewLane?.[0] || nearestWalkablePoint(8.2, 12.5);
      const laneEnd = previewLane?.[2] || nearestWalkablePoint(cameraPoint.x + 4.6, cameraPoint.y);
      const laneAngle = Math.atan2(laneEnd.y - cameraPoint.y, laneEnd.x - cameraPoint.x);
      const previewDistance = clamp(Number(distance) || 2.8, 2.1, 4.2);
      const targetPoint = {
        x: cameraPoint.x + Math.cos(laneAngle) * previewDistance,
        y: cameraPoint.y + Math.sin(laneAngle) * previewDistance
      };
      for (const bot of bots) {
        bot.alive = bot === camera || bot === target;
        bot.health = bot.alive ? bot.maxHealth : 0;
        bot.target = null;
        bot.sightCandidate = null;
        bot.lastSeen = null;
        bot.path = [];
        bot.pathIndex = 0;
        bot.pathGoal = null;
        bot.cooldown = 999;
        bot.burstGap = 999;
        bot.reloadTimer = 0;
        bot.weaponSwapTimer = 0;
        bot.moveVelocity = 0;
        bot.moveIntent = 0;
        bot.crouched = false;
        bot.crouchBlend = 0;
      }
      camera.x = cameraPoint.x; camera.y = cameraPoint.y; camera.angle = laneAngle; camera.pathAngle = laneAngle;
      target.x = targetPoint.x; target.y = targetPoint.y; target.angle = laneAngle + Math.PI; target.pathAngle = target.angle;
      target.deathAnim = 0; target.hitReactionAge = 999; target.hitReactionStrength = 0;
      spectatorIndex = bots.indexOf(camera);
      autoSpectate = false;
      roundFreezeTimer = 999;
      roundEnding = false;
      matchEnding = false;
      updateHud();
      render();
      return {
        ok: true,
        camera: camera.name,
        target: target.name,
        distance: Math.round(dist(camera, target) * 100) / 100,
        geometry: operatorSurfaceGeometryAudit(),
        headGeometry: operatorHeadGeometryAudit(target),
        skinPresentation: operatorSkinPresentationAudit(target),
        ambientOcclusion: operatorAmbientOcclusionAudit(target),
        proportions: operatorProportionAudit()
      };
    },
    operatorHeldPoseForTest: (distance = 2.8, weaponId = 'ar4-sentinel') => {
      const camera = bots.find(bot => bot.team === TEAM_BLUE) || bots[0];
      const target = bots.find(bot => bot.team === TEAM_RED) || bots[1];
      const weapon = CAREER_WEAPON_CATALOG[String(weaponId || '')]
        ? cloneCareerWeapon(String(weaponId))
        : cloneCareerWeapon('ar4-sentinel');
      if (!camera || !target || !weapon) return { ok: false, reason: 'missing operator or weapon' };
      const previewLane = debugCombatTestLane();
      const cameraPoint = previewLane?.[0] || nearestWalkablePoint(8.2, 12.5);
      const laneEnd = previewLane?.[2] || nearestWalkablePoint(cameraPoint.x + 4.6, cameraPoint.y);
      const laneAngle = Math.atan2(laneEnd.y - cameraPoint.y, laneEnd.x - cameraPoint.x);
      const previewDistance = clamp(Number(distance) || 2.8, 2.1, 4.2);
      const targetPoint = {
        x: cameraPoint.x + Math.cos(laneAngle) * previewDistance,
        y: cameraPoint.y + Math.sin(laneAngle) * previewDistance
      };
      for (const bot of bots) {
        bot.alive = bot === camera || bot === target;
        bot.health = bot.alive ? bot.maxHealth : 0;
        bot.target = null;
        bot.sightCandidate = null;
        bot.lastSeen = null;
        bot.path = [];
        bot.pathIndex = 0;
        bot.pathGoal = null;
        bot.cooldown = 999;
        bot.burstGap = 999;
        bot.reloadTimer = 0;
        bot.reloadProgress = 0;
        bot.weaponSwapTimer = 0;
        bot.moveVelocity = 0;
        bot.moveIntent = 0;
        bot.crouched = false;
        bot.crouchBlend = 0;
        bot.recoil = 0;
        bot.visualRecoil = 0;
      }
      camera.x = cameraPoint.x; camera.y = cameraPoint.y; camera.angle = laneAngle; camera.pathAngle = laneAngle;
      // Keep the spectator camera fixed but suppress its first-person viewmodel
      // so the captured frame shows the target operator's held pose clearly.
      camera.alive = false;
      camera.health = camera.maxHealth;
      target.x = targetPoint.x; target.y = targetPoint.y; target.angle = laneAngle + Math.PI * 0.74; target.pathAngle = target.angle;
      target.renderMoveAngle = target.angle;
      target.renderAimAngle = target.angle;
      target.upperAimBlend = 1;
      target.weaponReadyBlend = 1;
      target.primaryWeapon = weapon;
      target.weapon = weapon;
      target.usingSecondary = false;
      target.primaryAmmo = weapon.magSize;
      target.magAmmo = weapon.magSize;
      target.primaryReserve = weapon.magSize * 3;
      target.deathAnim = 0;
      target.hitReactionAge = 999;
      target.hitReactionStrength = 0;
      spectatorIndex = bots.indexOf(camera);
      autoSpectate = false;
      roundFreezeTimer = 999;
      roundEnding = false;
      matchEnding = false;
      setAppState('match');
      if (deathOverlayEl) {
        deathOverlayEl.hidden = true;
        deathOverlayEl.style.visibility = 'hidden';
        deathOverlayEl.style.opacity = '0';
      }
      updateHud();
      resize();
      render();
      const attachment = operatorWeaponAttachmentAudit();
      const sample = attachment.samples.find(item => item.id === weapon.id) || null;
      const stockSeatValid = sample?.category !== 'rifle' ||
        (sample.stockSeatGap !== null && sample.stockSeatGap <= 0.075);
      return {
        ok: Boolean(attachment.ok && sample?.finiteAnchors && stockSeatValid),
        camera: camera.name,
        target: target.name,
        distance: Math.round(dist(camera, target) * 100) / 100,
        weapon: weapon.id,
        attachment: sample,
        appState,
        renderer: typeof diagnosticDisplayState === 'function' ? diagnosticDisplayState() : { webglReady: Boolean(glReady) }
      };
    },
    viewmodelWeaponPresentationForTest: (weaponId = 'ar4-sentinel') => {
      const camera = bots.find(bot => bot.team === TEAM_BLUE) || bots[0];
      const weapon = CAREER_WEAPON_CATALOG[String(weaponId || '')]
        ? cloneCareerWeapon(String(weaponId))
        : cloneCareerWeapon('ar4-sentinel');
      if (!camera || !weapon) return { ok: false, reason: 'missing camera or weapon' };
      const cameraPoint = nearestWalkablePoint(8.2, 12.5);
      for (const bot of bots) {
        bot.alive = bot === camera;
        bot.health = bot.alive ? bot.maxHealth : 0;
        bot.target = null;
        bot.sightCandidate = null;
        bot.lastSeen = null;
        bot.path = [];
        bot.pathIndex = 0;
        bot.pathGoal = null;
        bot.cooldown = 999;
        bot.burstGap = 999;
        bot.reloadTimer = 0;
        bot.reloadProgress = 0;
        bot.weaponSwapTimer = 0;
        bot.moveVelocity = 0;
        bot.moveIntent = 0;
        bot.crouched = false;
        bot.crouchBlend = 0;
        bot.recoil = 0;
        bot.visualRecoil = 0;
      }
      camera.x = cameraPoint.x;
      camera.y = cameraPoint.y;
      camera.angle = 0;
      camera.pathAngle = 0;
      camera.renderMoveAngle = 0;
      camera.renderAimAngle = 0;
      camera.primaryWeapon = weapon;
      camera.weapon = weapon;
      camera.usingSecondary = false;
      camera.primaryAmmo = weapon.magSize;
      camera.magAmmo = weapon.magSize;
      camera.primaryReserve = weapon.magSize * 3;
      spectatorIndex = bots.indexOf(camera);
      autoSpectate = false;
      roundFreezeTimer = 999;
      roundEnding = false;
      matchEnding = false;
      setAppState('match');
      if (deathOverlayEl) {
        deathOverlayEl.hidden = true;
        deathOverlayEl.style.visibility = 'hidden';
        deathOverlayEl.style.opacity = '0';
      }
      updateHud();
      resize();
      render();
      const geometry = careerWeaponGeometryIntegrityAudit();
      const samples = geometry.samples.filter(sample => sample.modelClass === weapon.modelClass && sample.context === 'viewmodel');
      return {
        ok: geometry.ok && samples.every(sample => sample.ok),
        camera: camera.name,
        weapon: weapon.id,
        activeWeapon: camera.weapon?.id || null,
        usingSecondary: Boolean(camera.usingSecondary),
        geometry: samples,
        appState,
        renderer: typeof diagnosticDisplayState === 'function' ? diagnosticDisplayState() : { webglReady: Boolean(glReady) }
      };
    },
    previewPresentation: () => {
      const camera = bots.find(bot => bot.team === TEAM_BLUE) || bots[0];
      const target = bots.find(bot => bot.team === TEAM_RED) || bots[1];
      if (!camera || !target) return false;
      const cameraPoint = nearestWalkablePoint(8.2, 12.5);
      const targetPoint = nearestWalkablePoint(12.7, 12.5);
      camera.x = cameraPoint.x; camera.y = cameraPoint.y; camera.angle = 0; camera.pathAngle = 0;
      target.x = targetPoint.x; target.y = targetPoint.y; target.angle = Math.PI; target.pathAngle = Math.PI;
      target.alive = true; target.health = 100; target.deathAnim = 0; target.deaths = Math.max(0, target.deaths - 1);
      spectatorIndex = bots.indexOf(camera);
      autoSpectate = false;
      target.die(camera);
      target.deathAnim = 1;
      updateHud();
      renderFeed();
      render();
      return { camera: camera.name, corpse: target.name, pose: target.deathPose };
    },
    eliminateTeam: team => {
      const selectedTeam = Number(team) === TEAM_RED ? TEAM_RED : TEAM_BLUE;
      for (const bot of bots) if (bot.team === selectedTeam && bot.alive) bot.die(null);
    },
    tacticalAdaptationDebriefForTest: () => {
      if (!careerState.created && typeof window.__strikeDebug?.seedReadabilityCareerForTest === 'function') window.__strikeDebug.seedReadabilityCareerForTest(5);
      const plan = clubTacticalPlanSnapshot();
      plan.adjustments = [{
        afterRound: 1,
        appliedForRound: 2,
        coachingRead: 'THE TEAM BECAME TOO ISOLATED',
        expectedEffect: 'Closer support at the cost of lane congestion.',
        changes: [{ type: 'priority', from: 'trade', to: 'group', fromLabel: 'TRADE ELIMINATIONS', toLabel: 'STAY GROUPED' }],
        result: { tone: 'positive', title: 'ADJUSTMENT IMPROVED CONTROL', evidence: 'Round won · 68% supported · 38% accuracy · 50% trade conversion.' }
      }];
      plan.opponentAdjustments = [{ afterRound: 1, appliedForRound: 2, trigger: 'ISOLATION PRESSURE', changed: true, reason: 'They found isolated operators and accelerated the pressure.', counterHint: 'Protect spacing and preserve a nearby trade.' }];
      const analysis = {
        plan,
        suitability: { overall: 72, label: 'GOOD FIT', executionPercent: 100 },
        conclusions: {
          worked: { title: 'MID-MATCH RESPONSE', evidence: 'The revised support shape improved control.', tone: 'positive' },
          issue: { title: 'OPENING ISOLATION', evidence: 'The first round exposed unsupported movement.', tone: 'danger' },
          nextAction: { title: 'RETAIN THE LESSON', evidence: 'Use the same evidence standard in the next fixture.', tone: 'action' }
        },
        cause: { label: 'ADAPTATION', title: 'MANAGER RESPONSE MATTERED', detail: 'The change was assessed against the following round.', tone: 'positive' },
        intentRows: [{ label: 'TEAM SUPPORT', tone: 'positive', intended: 'Closer support', actual: '68% supported movement', assessment: 'The intervention improved trade distance.' }],
        playerInsights: [], recommendations: [], effectiveRangePercent: 64, supportRate: 68, tradeKills: 2, tradeAttempts: 4, flankRoutes: 1, blockedShots: 0, zoneAnalysis: [], aiStability: null
      };
      const markup = renderTacticalMatchAnalysis({ tacticalAnalysis: analysis, zoneAnalysis: [] });
      return {
        hasManagerSection: markup.includes('BETWEEN-ROUND CHANGES'),
        hasExpectedEffect: markup.includes('EXPECTED') && markup.includes('Closer support'),
        hasObservedResult: markup.includes('ADJUSTMENT IMPROVED CONTROL'),
        hasOpponentSection: markup.includes('HOW THE OTHER BENCH RESPONDED'),
        hasOpponentTrigger: markup.includes('ISOLATION PRESSURE'),
        leaksExactTarget: markup.includes('PRESSURING ISOLATION') || markup.includes('AGGRESSIVE · CLOSE RANGE · CREATE FLANKS')
      };
    },
    betweenRoundTacticsForTest: () => ({
      open: betweenRoundTacticsState.open,
      resolved: betweenRoundTacticsState.resolved,
      sourceRound: betweenRoundTacticsState.sourceRound,
      changes: betweenRoundChangeTypes(),
      diagnoses: JSON.parse(JSON.stringify(betweenRoundTacticsState.diagnoses || [])),
      opponentAdaptation: betweenRoundTacticsState.opponentAdaptation ? JSON.parse(JSON.stringify(betweenRoundTacticsState.opponentAdaptation)) : null,
      routeOptions: betweenRoundRoutePlans().map(item => ({ id: item.id, name: item.name, zone: item.zone, current: item.current, recommended: item.recommended })),
      base: betweenRoundTacticsState.base ? {
        approachId: betweenRoundTacticsState.base.approachId,
        engagementId: betweenRoundTacticsState.base.engagementId,
        priorityId: betweenRoundTacticsState.base.priorityId,
        roundPlanId: betweenRoundTacticsState.base.roundPlanId
      } : null,
      draft: betweenRoundTacticsState.draft ? {
        approachId: betweenRoundTacticsState.draft.approachId,
        engagementId: betweenRoundTacticsState.draft.engagementId,
        priorityId: betweenRoundTacticsState.draft.priorityId,
        roundPlanId: betweenRoundTacticsState.draft.roundPlanId
      } : null,
      visible: Boolean(betweenRoundTacticsEl && !betweenRoundTacticsEl.hidden),
      diagnosisCards: betweenRoundDiagnosisGridEl?.querySelectorAll('article').length || 0,
      routeButtons: betweenRoundRouteOptionsEl?.querySelectorAll('button').length || 0
    }),
    squadDynamicsForTest: () => typeof squadDynamicsForTest === 'function' ? squadDynamicsForTest() : null,
    squadDynamicsPersistenceForTest: () => {
      const before = typeof squadDynamicsForTest === 'function' ? squadDynamicsForTest() : null;
      const restored = normaliseCareerState(JSON.parse(JSON.stringify(careerState)));
      const original = careerState;
      careerState = restored;
      const after = typeof squadDynamicsForTest === 'function' ? squadDynamicsForTest() : null;
      careerState = original;
      return {
        ok: Boolean(before && after && before.activePairs.length === after.activePairs.length && before.activePairs.every((pair, index) => pair.score === after.activePairs[index]?.score && pair.matches === after.activePairs[index]?.matches)),
        version: restored.version,
        before,
        after
      };
    },
    seedSquadDynamicsForTest: (matches = 6, squadSize = 8) => {
      window.__strikeDebug.seedReadabilityCareerForTest(Math.max(5, Math.min(8, Number(squadSize) || 8)));
      careerState.totalMatches = 0;
      careerState.squadDynamics = makeDefaultSquadDynamicsState();
      for (let match = 1; match <= Math.max(1, Math.min(20, Number(matches) || 6)); match++) {
        careerState.totalMatches = match;
        (careerState.squad || []).slice(0, TEAM_REQUIRED_STARTERS).forEach((player, index) => {
          player.lastMatch = {
            week: careerState.week,
            won: true,
            rating: 6.9 + ((match + index) % 3) * .35,
            supportedTime: 28 + index * 2,
            isolatedTime: 7 + (index % 2) * 3,
            tradeKills: (index + match) % 2,
            kills: 2 + (index % 2),
            deaths: index % 2,
            rounds: 4
          };
        });
        settleSquadDynamicsAfterMatch(TEAM_BLUE, careerState.lastRound || {});
      }
      saveCareerState({ createBackup: false, reason: 'debug squad dynamics seed' });
      createMatch();
      setMenuRoute('operators');
      return {
        dynamics: squadDynamicsForTest(),
        panelVisible: Boolean(menuContentEl?.querySelector('.squad-dynamics-panel')),
        pairCards: menuContentEl?.querySelectorAll('.squad-dynamics-pair').length || 0,
        policyText: menuContentEl?.querySelector('.squad-dynamics-policy')?.textContent?.replace(/\s+/g, ' ').trim() || '',
        horizontalOverflow: Math.max(0, (menuContentEl?.scrollWidth || 0) - (menuContentEl?.clientWidth || 0)),
        bots: bots.filter(bot => bot.team === TEAM_BLUE).slice(0, TEAM_REQUIRED_STARTERS).map(bot => ({ playerId: bot.playerProfileId || '', buff: bot.squadDynamicsBuff ? { ...bot.squadDynamicsBuff } : null }))
      };
    },
    settleSquadDynamicsForTest: (winner = TEAM_BLUE) => typeof settleSquadDynamicsAfterMatch === 'function' ? settleSquadDynamicsAfterMatch(Number(winner), careerState.lastRound || null) : null,
    opponentAdaptationForTest: (targetRound = roundNumber) => {
      const adaptation = typeof opponentMatchAdaptationForRound === 'function' ? opponentMatchAdaptationForRound(Number(targetRound) || roundNumber) : null;
      const redBot = bots.find(bot => bot.team === TEAM_RED);
      return {
        round: roundNumber,
        adaptation: adaptation ? JSON.parse(JSON.stringify(adaptation)) : null,
        redBot: redBot ? {
          oppositionIdentity: redBot.oppositionIdentity,
          phase: redBot.oppositionIdentityPhase,
          formationId: redBot.formationId,
          approachId: redBot.teamApproachId,
          engagementId: redBot.engagementPlanId,
          priorityId: redBot.teamPriorityId
        } : null
      };
    },
    forceBetweenRoundTacticsForTest: () => {
      if (!careerState.created && typeof window.__strikeDebug?.seedReadabilityCareerForTest === 'function') window.__strikeDebug.seedReadabilityCareerForTest(5);
      roundNumber = Math.max(1, roundNumber || 1);
      roundEnding = true;
      matchEnding = false;
      careerBetweenRounds = true;
      prepareBetweenRoundTactics({ shotsFired: 20, shotsHit: 4, damageDealt: 120, damageTaken: 220, supportedTime: 18, isolatedTime: 44, tradeAttempts: 3, tradeKills: 0, routeReplans: 5, kills: 1, deaths: 5 }, TEAM_RED, 'Debug tactical review');
      roundRestartTimer = 0;
      openBetweenRoundTactics();
      return window.__strikeDebug.betweenRoundTacticsForTest();
    },
    selectBetweenRoundTacticForTest: (type, value) => ({ ok: selectBetweenRoundTactic(String(type || ''), String(value || '')), state: window.__strikeDebug.betweenRoundTacticsForTest() }),
    applyBetweenRoundTacticsForTest: (apply = true) => ({ ok: commitBetweenRoundTactics(Boolean(apply)), plan: typeof clubActiveMatchPlan === 'function' ? JSON.parse(JSON.stringify(clubActiveMatchPlan())) : null }),
    startNextRound: () => {
      if (!(roundEnding && !matchEnding)) return false;
      careerCrateState.phase = 'idle';
      if (careerCrateOverlayEl) careerCrateOverlayEl.hidden = true;
      if (!betweenRoundTacticsState.resolved) return openBetweenRoundTactics();
      startRound();
      return true;
    },
    stepSimulation: (seconds = 1, fixedDt = 1 / 60) => {
      const total = clamp(Number(seconds) || 0, 0, 120);
      const dt = clamp(Number(fixedDt) || 1 / 60, 1 / 240, 0.033);
      const frames = Math.ceil(total / dt);
      for (let i = 0; i < frames; i++) update(dt);
      render();
      return frames;
    },
    selectSpectator: index => {
      const safeIndex = clamp(Math.floor(Number(index) || 0), 0, Math.max(0, bots.length - 1));
      const requested = bots[safeIndex];
      if (!requested || requested.team !== CAREER_OWNED_TEAM) return false;
      spectatorIndex = safeIndex;
      autoSpectate = false;
      spectatorDeathSwitchTimer = 0;
      spectatorDeathSwitchKey = '';
      autoBtn.textContent = 'AUTO: OFF';
      updateHud();
      return true;
    },
    healthColourForTest: (current = 100, maximum = 100) => spectatorHealthColour(Number(current) || 0, Math.max(1, Number(maximum) || 100)),
    spectatorTelemetryForTest: () => ({
      spectatorIndex,
      viewedName: bots[spectatorIndex]?.name || '',
      viewedPlayerId: bots[spectatorIndex]?.playerProfileId || '',
      telemetryName: ownedTelemetryNameEl?.textContent || '',
      telemetryPlayerId: ownedTelemetryEl?.dataset.playerId || '',
      portraitTelemetryName: portraitOwnedNameEl?.textContent || '',
      action: ownedDecisionActionEl?.textContent || '',
      reason: ownedDecisionReasonEl?.textContent || '',
      target: ownedDecisionTargetEl?.textContent || '',
      range: ownedDecisionRangeEl?.textContent || '',
      instruction: ownedDecisionInstructionEl?.textContent || '',
      routeIntent: ownedDecisionRouteEl?.textContent || '',
      portraitReason: portraitOwnedReasonEl?.textContent || ''
    }),
    liveDecisionExplanationForTest: () => {
      const bot = bots[spectatorIndex] || bots.find(candidate => candidate.team === CAREER_OWNED_TEAM) || null;
      if (!bot) return { ok: false, reason: 'No owned operator is active.' };
      const previousState = appState;
      spectatorIndex = bots.indexOf(bot);
      appState = 'match';
      updateHud();
      const explanation = typeof botDecisionExplanation === 'function' ? botDecisionExplanation(bot) : null;
      const telemetry = window.__strikeDebug.spectatorTelemetryForTest();
      appState = previousState;
      return {
        ok: Boolean(explanation && telemetry.action && telemetry.reason && telemetry.range && telemetry.instruction && telemetry.routeIntent && telemetry.action === explanation.action && telemetry.reason === explanation.reason),
        explanation,
        telemetry,
        sameAction: explanation ? telemetry.action === explanation.action : false,
        sameReason: explanation ? telemetry.reason === explanation.reason : false,
        hasPortraitSummary: Boolean(telemetry.portraitReason)
      };
    },
    setSpectatorHealthForTest: (current = 100) => {
      const bot = bots[spectatorIndex];
      if (!bot) return null;
      bot.health = clamp(Number(current) || 0, 0, Math.max(1, bot.maxHealth || 100));
      updateHud();
      return {
        health: bot.health,
        maximum: bot.maxHealth || 100,
        colour: healthTextEl?.style.color || '',
        portraitColour: portraitHealthTextEl?.style.color || '',
        text: healthTextEl?.textContent || ''
      };
    },
    spectatorArmourHudForTest: () => {
      const bot = bots[spectatorIndex] || bots.find(candidate => candidate.team === CAREER_OWNED_TEAM) || null;
      if (!bot || !armourHudEl || !armourBarEl || !armourTextEl) return { ok: false, reason: 'Spectator armour HUD is unavailable.' };
      const previousAppState = appState;
      const previous = { armourId: bot.armourId, armourName: bot.armourName, armourDurability: bot.armourDurability, armourMaxDurability: bot.armourMaxDurability, armourBroken: bot.armourBroken };
      appState = 'match';
      bot.armourId = 'guardian-plate'; bot.armourName = 'GUARDIAN PLATE RIG'; bot.armourDurability = 56; bot.armourMaxDurability = 112; bot.armourBroken = false;
      updateHud();
      const equipped = { hidden: armourHudEl.hidden, text: armourTextEl.textContent || '', transform: armourBarEl.style.transform || '', portrait: portraitHealthTextEl?.textContent || '' };
      bot.armourId = 'none'; bot.armourName = 'NO ARMOUR'; bot.armourDurability = 0; bot.armourMaxDurability = 0; bot.armourBroken = false;
      updateHud();
      const unarmouredHidden = armourHudEl.hidden;
      Object.assign(bot, previous);
      appState = previousAppState;
      updateHud();
      return { ok: !equipped.hidden && equipped.text.includes('56 / 112') && equipped.transform.includes('0.5') && equipped.portrait.includes('ARM 56') && unarmouredHidden, equipped, unarmouredHidden };
    },
    snapshot: () => ({
      score: [blueScore, redScore],
      appState,
      career: {
        created: careerState.created, name: careerState.name, level: careerState.level,
        xp: careerState.xp, xpRequired: careerXpRequired(), points: careerState.unspentPoints,
        stats: { ...careerState.stats }, inventory: [...careerState.inventory], skins: [...careerState.skins],
        equippedSkin: careerState.equippedSkinId, equipped: careerState.equippedWeaponId, betweenRounds: careerBetweenRounds,
        matchComplete: careerMatchComplete, cratePhase: careerCrateState.phase,
        reportPhase: careerReportState.phase, lastRound: careerState.lastRound ? { ...careerState.lastRound } : null
      },
      endgame: { active: lateRoundMode, secondsSinceContact: secondsSinceCombatContact(), totalAlive: totalAliveCount() },
      round: {
        number: roundNumber, time: roundTime, freeze: roundFreezeTimer, overtime: suddenHuntOvertime,
        ending: roundEnding, restartTimer: roundRestartTimer,
        reason: roundReason, target: matchTarget, matchEnding, matchRestartTimer,
        alive: [teamAliveCount(TEAM_BLUE), teamAliveCount(TEAM_RED)]
      },
      renderer: {
        ready: glReady,
        mode: document.body.dataset.renderer || '',
        frame: document.body.dataset.frame || '',
        frameTimeMs: Math.round(lastFrameDt * 100000) / 100,
        tracerCount: tracers.length,
        soundEventCount: soundEvents.length,
        audioUnlocked, audioEnabled,
        wallBatches: worldBatches.walls.length,
        decorativeBatches: Object.entries(worldBatches).filter(([key]) => key !== 'walls').reduce((total, [, list]) => total + list.length, 0),
        batchBreakdown: Object.fromEntries(Object.entries(worldBatches).map(([key, list]) => [key, list.length]))
      },
      bots: bots.map(b => ({
        name: b.name, team: b.team, slot: b.slot, playerProfileId: b.playerProfileId || null, playerRole: b.playerRole || null, x: b.x, y: b.y, angle: b.angle, pathAngle: b.pathAngle,
        alive: b.alive, target: b.target ? b.target.name : null,
        speed: b.speed, skill: b.skill, moveSkill: b.moveSkill, reactionDelay: b.reactionDelay,
        playerFatigue: b.playerFatigue ?? null, playerHappiness: b.playerHappiness ?? null,
        openingPlanId: b.openingPlanId || '', openingPlanName: b.openingPlanName || '', openingPlanObjective: b.openingPlanObjective ? { x: b.openingPlanObjective.x, y: b.openingPlanObjective.y } : null,
        playerMorale: b.playerMorale ?? null, playerForm: b.playerForm ?? null,
        squadDynamicsBuff: b.squadDynamicsBuff ? { ...b.squadDynamicsBuff } : null,
        wallClear: canStand(b.x, b.y, BOT_RADIUS),
        propClear: !collidesWithLevelProp(b.x, b.y, BOT_RADIUS),
        forwardClearance: clearanceAlong(b.x, b.y, b.pathAngle, 1.2, BOT_RADIUS),
        pathIndex: b.pathIndex, pathLength: b.path.length,
        searchTimer: b.searchTimer, objectiveAge: b.objectiveAge,
        lateRoundGoal: b.lateRoundGoal ? { x: b.lateRoundGoal.x, y: b.lateRoundGoal.y, age: b.lateRoundGoalAge, source: b.huntGoalSource } : null,
        lateRoundHeading: b.lateRoundLastHeading,
        huntEvidence: b.huntEvidence ? { x: b.huntEvidence.x, y: b.huntEvidence.y, source: b.huntEvidence.source, confidence: b.huntEvidence.confidence } : null,
        huntClearedSectors: b.huntClearedSectors ? b.huntClearedSectors.length : 0,
        huntStationaryTimer: b.huntStationaryTimer || 0,
        crouched: Boolean(b.crouched),
        crouchStationaryTimer: Number(b.crouchStationaryTimer) || 0,
        moveVelocity: Number(b.moveVelocity) || 0,
        moveIntent: Number(b.moveIntent) || 0,
        moveBlocked: Boolean(b.moveBlocked),
        stuckTimer: Number(b.stuckTimer) || 0,
        targetSwitchCooldown: Number(b.targetSwitchCooldown) || 0,
        viewOccluder: b.viewOccluder?.name || null,
        viewOccludedPoint: b.viewOccludedPoint ? { x: b.viewOccludedPoint.x, y: b.viewOccludedPoint.y } : null,
        viewOcclusionTimer: Number(b.viewOcclusionTimer) || 0,
        viewClearDirection: Number(b.viewClearDirection) || 0,
        engagementIdleTimer: Number(b.engagementIdleTimer) || 0,
        combatMobilityTimer: Number(b.combatMobilityTimer) || 0,
        tacticalMode: b.tacticalMode || null,
        lastTacticalReason: b.lastTacticalReason || null,
        navigationDetour: b.navigationDetourGoal ? { x: b.navigationDetourGoal.x, y: b.navigationDetourGoal.y, timer: b.navigationDetourTimer } : null,
        navigationTrailSamples: b.navTrail ? b.navTrail.length : 0,
        navigationLoopRecoveries: b.navigationLoopRecoveries || 0,
        navProgress: { remaining: b.remainingRouteDistance(), timer: b.navProgressTimer, recoveries: b.navProgressRecoveries },
        moveVelocity: b.moveVelocity, moveBlocked: b.moveBlocked,
        stuckTimer: b.stuckTimer, pathFailures: b.pathFailures,
        navigationGapTimer: b.navigationGapTimer || 0,
        navigationPauseRecoveries: b.navigationPauseRecoveries || 0,
        crouched: b.crouched, crouchBlend: b.crouchBlend,
        heardSound: b.heardSound ? { x: b.heardSound.x, y: b.heardSound.y, type: b.heardSound.type } : null,
        animation: b.animState, ammo: b.magAmmo, reload: b.reloadTimer, secondary: b.usingSecondary, recoil: b.recoil, weaponHeat: b.weaponHeat || 0,
        tactical: {
          mode: b.tacticalMode,
          label: botTacticalStatus(b, false),
          reason: b.lastTacticalReason,
          wantsSafeReload: b.wantsSafeReload,
          burstCount: b.combatBurstCount,
          cover: b.combatCover ? { anchor: { ...b.combatCover.anchor }, peek: b.combatCover.peek ? { ...b.combatCover.peek } : null } : null
        },
        weapon: b.weapon ? { id: b.weapon.id || null, name: b.weapon.name || null, skinId: b.weapon.skinId || null } : null,
        combat: {
          shotsFired: b.roundShotsFired || 0, shotsHit: b.roundShotsHit || 0,
          criticalHits: b.roundCriticalHits || 0,
          headshots: b.roundHeadshots || 0,
          criticalHeadshots: b.roundCriticalHeadshots || 0,
          criticalChance: Math.round((b.criticalChance || CAREER_BASE_CRIT_CHANCE) * 1000) / 1000,
          criticalBonusDamage: Math.round((b.criticalBonusDamage || CAREER_BASE_CRIT_BONUS_DAMAGE) * 1000) / 1000,
          damageDealt: Math.round((b.roundDamageDealt || 0) * 10) / 10,
          damageTaken: Math.round((b.roundDamageTaken || 0) * 10) / 10,
          survivalTime: Math.round((b.roundSurvivalTime || 0) * 10) / 10,
          reloads: b.roundReloads || 0
        },
        buildSource: b.buildSource, statTotal: combatStatTotal(b.rpgStats || b.simulatedStats),
        stats: { ...(b.rpgStats || b.simulatedStats || {}) },
        primaryWeapon: b.primaryWeapon?.id || b.primaryWeapon?.name || null,
        weaponQuality: b.primaryWeapon?.quality || null,
        corpse: b.alive ? null : { pose: b.deathPose, side: b.deathSide, progress: b.deathAnim }
      }))
    })
  };

  const buildSubEl = document.querySelector('.brand .sub');
  const buildDescEl = document.querySelector('.mapTag .desc');
  if (buildSubEl) buildSubEl.textContent = `Keyframed tactical animation · BUILD ${BUILD_VERSION}`;
  if (buildDescEl) buildDescEl.textContent = activeArenaMeta().tagDescription;
  syncViewMode();
  setUiButtonsHidden(false);
  syncMobilePageHelp({ persist: false });
  updateAudioButton();

  const initialPropAudit = auditLevelPropCollision();
  window.__STRIKEWATCH_PROP_AUDIT__ = initialPropAudit;
  if (!initialPropAudit.ok) console.warn('Strikewatch prop collision audit:', initialPropAudit.issues);
  try {
    if (new URLSearchParams(window.location.search).get('collisionAudit') === '1') {
      document.body.dataset.collisionBroadphaseAudit = JSON.stringify(window.__strikeDebug.propCollisionBroadphaseForTest());
    }
  } catch (_) {}

  initWebGL();
  initCareerCrateRenderer();
  if (careerState?.tactics?.arenaId) setActiveArena(careerState.tactics.arenaId);
  resize();
  resizeCareerCrateRenderer();
  createMatch();
  canResumeMatch = false;
  menuContext = 'main';
  menuTab = 'play';
  setAppState('menu');
  updateMenuUI();
  updateHud();
  let operatorPreviewRequested = false;
  try {
    const initialQuery = new URLSearchParams(window.location.search);
    operatorPreviewRequested = initialQuery.get('operatorPreview') === '1';
    // The audit also honours a `releaseaudit` filename marker because the
    // Windows shell strips query strings from file:// launches.
    if (initialQuery.get('releaseAudit') === '1' || /releaseaudit/i.test(String(window.location.pathname || ''))) {
      setTimeout(() => {
        const geometry = window.__strikeDebug.allArenaGeometryIntegrityForTest();
        const citadel = window.__strikeDebug.arenaAuditForTest('citadel');
        const aurora = window.__strikeDebug.auroraTerminalAuditForTest();
        const state = window.__strikeDebug.stateIntegrityForTest();
        document.body.dataset.releaseAudit = JSON.stringify({
          geometryOk: Boolean(geometry?.ok),
          arenas: Object.fromEntries(Object.entries(geometry?.arenas || {}).map(([id, result]) => [id, Boolean(result?.ok)])),
          citadelRoutesConnected: Boolean(citadel?.routesConnected),
          citadelSpawnsClear: Boolean(citadel?.allSpawnsClear),
          auroraOk: Boolean(aurora?.ok),
          auroraSymmetric: Boolean(aurora?.symmetric),
          auroraConnected: Boolean(aurora?.connected),
          auroraDestinationsOk: Boolean(aurora?.destinationsOk),
          auroraGeometryOk: Boolean(aurora?.geometryOk),
          auroraPropCollisionOk: Boolean(aurora?.propCollisionOk),
          stateOk: Boolean(state?.ok),
          stateIssues: state?.issues || [],
          runtimeFaults: window.__strikeDebug.runtimeFaultsForTest()
        });
        // The audit runs headless in CI-less environments, so surface the
        // same payload visibly for screenshot-based verification.
        const auditPanel = document.createElement('pre');
        auditPanel.id = 'releaseAuditPanel';
        auditPanel.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:99999;background:#04141c;color:#9fe8ff;font:12px/1.5 monospace;padding:10px 12px;max-height:45vh;overflow:auto;border:1px solid #2b6a7f;white-space:pre-wrap;';
        auditPanel.textContent = `RELEASE AUDIT ${BUILD_ID}\n${document.body.dataset.releaseAudit}`;
        document.body.append(auditPanel);
      }, 0);
    }
    if (initialQuery.get('operatorAudit') === '1') {
      setTimeout(() => {
        const model = window.__strikeDebug.operatorModel();
        const attachment = window.__strikeDebug.operatorWeaponAttachmentForTest();
        const corpse = window.__strikeDebug.corpsePresentationForTest();
        document.body.dataset.operatorAudit = JSON.stringify({
          legGeometryOk: Boolean(
            model?.legGeometry?.kneesForward
            && model?.legGeometry?.segmentLengthsStable
            && model?.legGeometry?.feetAboveFloor
            && model?.legGeometry?.corpseKneesForward
            && model?.legGeometry?.corpseSegmentLengthsStable
            && model?.legGeometry?.corpseFeetAboveFloor
          ),
          proportionsOk: Boolean(model?.proportions?.compactSilhouette && model?.proportions?.readableHeadScale),
          headGeometryOk: Boolean(
            model?.headGeometry?.anatomicalHeadMesh
            && model?.headGeometry?.taperedJaw
            && model?.headGeometry?.eyeSocketAndBrowPlanes
            && model?.headGeometry?.restrainedNoseBridgeProfile
            && model?.headGeometry?.fittedHelmetShell
            && model?.headGeometry?.noseContouredFaceCover
            && model?.headGeometry?.ellipticalGoggleLenses
            && model?.headGeometry?.modelTopWithinContract
          ),
          skinPresentationOk: Boolean(
            model?.skinPresentation?.allTonesLight
            && model?.skinPresentation?.dedicatedSkinLighting
            && model?.skinPresentation?.visibleFaceExposure
            && model?.skinPresentation?.sharedLivingAndCorpsePalette
          ),
          faceCoverCoverage: model?.skinPresentation?.faceCoverCoverage || null,
          sharedLivingAndCorpseGeometry: Boolean(model?.surfaceGeometry?.sharedLivingAndCorpseGeometry),
          additionalBodyDrawCalls: model?.surfaceGeometry?.additionalBodyDrawCalls,
          attachmentsOk: Boolean(attachment?.ok),
          attachmentFailures: attachment?.failures || [],
          corpseOk: Boolean(corpse?.ok),
          corpseSamples: corpse?.samples || [],
          runtimeFaults: window.__strikeDebug.runtimeFaultsForTest()
        });
      }, 0);
    }
    if (initialQuery.get('performanceAudit') === '1') {
      setTimeout(() => {
        closeNewPlayerIntro(false);
        setActiveArena('citadel');
        setAppState('match');
        createMatch();
        roundFreezeTimer = 0;
        matchSimulationPaused = false;
        canResumeMatch = true;
        lastTime = performance.now();
      }, 0);
      setTimeout(() => {
        document.body.dataset.performanceAudit = JSON.stringify({
          runtime: window.__strikeDebug.performance(),
          renderer: {
            drawCalls: Number(document.body.dataset.rendererDrawCalls) || 0,
            staticBatchDrawCalls: Number(document.body.dataset.rendererStaticBatchDrawCalls) || 0,
            staticCandidates: Number(document.body.dataset.rendererStaticCandidates) || 0,
            staticCulled: Number(document.body.dataset.rendererStaticCulled) || 0
          },
          runtimeFaults: window.__strikeDebug.runtimeFaultsForTest()
        });
      }, 7000);
    }
    if (operatorPreviewRequested) {
      setTimeout(() => {
        closeNewPlayerIntro(false);
        const distance = clamp(Number(initialQuery.get('distance')) || 2.8, 2.1, 4.2);
        const weaponId = initialQuery.get('weapon') || 'ar4-sentinel';
        const result = window.__strikeDebug.operatorHeldPoseForTest(distance, weaponId);
        document.body.dataset.operatorPreview = JSON.stringify(result);
      }, 0);
    }
  } catch (_) {}
  document.addEventListener('visibilitychange', () => {
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
  requestAnimationFrame(loop);
