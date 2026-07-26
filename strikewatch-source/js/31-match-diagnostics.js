/*
 * Strikewatch source module: 31-match-diagnostics.js
 * Purpose: Local match event logging, rolling state snapshots, summaries, live diagnostics and JSON export.
 *
 * This file is a source fragment. Run `python3 build.py` to regenerate
 * js/strikewatch.dev.js and the standalone release in dist/.
 */

  const DIAGNOSTIC_SAMPLE_INTERVAL = 0.5;
  const DIAGNOSTIC_ROLLING_SECONDS = 90;
  const DIAGNOSTIC_MAX_SAMPLES = Math.ceil(DIAGNOSTIC_ROLLING_SECONDS / DIAGNOSTIC_SAMPLE_INTERVAL);
  const DIAGNOSTIC_MAX_EVENTS = 1800;
  // Counter totals remain authoritative in summary deltas. Their semantic
  // incidents already have dedicated events (target_changed, path_failed,
  // combat_recovery_succeeded, summit_layer_rotation, and so on), so duplicating
  // every counter increment only evicts useful early-round evidence on longer
  // mobile matches.
  const DIAGNOSTIC_SUMMARY_ONLY_COUNTERS = new Set([
    'pathFailures',
    'navigationRecoveries',
    'navigationPlansExecuted',
    'navigationPlanDeferrals',
    'navigationPathHoldReuses',
    'perceptionScanDeferrals',
    'tacticalDecisionDeferrals',
    'combatRouteSearches',
    'combatRoutePlanDeferrals',
    'combatRouteCandidateEvaluations',
    'teamSpacingCorrections',
    'teamLaneSeparations',
    'targetSwitches',
    'closeThreatOverrides',
    'operatorBlockedShots',
    'combatStallRecoveries',
    'combatApproachRoutes',
    'combatYieldActions',
    'combatRecoveryEscalations',
    'combatRecoverySuccesses',
    'crouchStallRecoveries',
    'coordinationWaitCommits',
    'stalemateBreaks',
    'tacticalRepositions',
    'officeCourtyardRotations',
    'officeCourtyardCrossings',
    'summitLayerRotations',
    'summitLayerTraversals',
    'summitIllegalElevationTransitionsBlocked',
    'tacticalFlankRoutes',
    'headshots',
    'criticalHeadshots'
  ]);
  const DIAGNOSTIC_SUMMARY_STORAGE_KEY = 'strikewatchDiagnosticSummariesV1';
  const DIAGNOSTIC_SUMMARY_LIMIT = 10;
  const DIAGNOSTIC_WORST_FRAME_LIMIT = 12;
  const DIAGNOSTIC_MAX_ACTIVE_FRAME_INTERVAL_MS = 250;

  let matchDiagnostics = null;
  let lastCompletedDiagnosticReport = null;
  let diagnosticOverlayVisible = false;

  function diagnosticOrderedRing(items, cursor = 0, wrapped = false) {
    if (!Array.isArray(items) || !items.length) return [];
    if (!wrapped) return items.slice();
    const safeCursor = Math.max(0, Math.min(items.length - 1, Number(cursor) || 0));
    return items.slice(safeCursor).concat(items.slice(0, safeCursor));
  }

  function diagnosticOrderedEvents(source = matchDiagnostics) {
    return diagnosticOrderedRing(source?.events || [], source?.eventCursor || 0, Boolean(source?.eventsWrapped));
  }

  function diagnosticOrderedSamples(source = matchDiagnostics) {
    return diagnosticOrderedRing(source?.samples || [], source?.sampleCursor || 0, Boolean(source?.samplesWrapped));
  }

  function diagnosticPushRing(source, key, item, maximum, cursorKey, wrappedKey) {
    const list = source[key];
    if (list.length < maximum) {
      list.push(item);
      return false;
    }
    const cursor = Math.max(0, Math.min(maximum - 1, Number(source[cursorKey]) || 0));
    list[cursor] = item;
    source[cursorKey] = (cursor + 1) % maximum;
    source[wrappedKey] = true;
    return true;
  }

  function diagnosticRound(value, precision = 2) {
    const factor = 10 ** precision;
    return Math.round((Number(value) || 0) * factor) / factor;
  }


  function diagnosticDisplaySignature() {
    const visualViewport = window.visualViewport || null;
    const viewportWidth = Math.max(0, Math.round(Number(window.innerWidth) || Number(visualViewport?.width) || 0));
    const viewportHeight = Math.max(0, Math.round(Number(window.innerHeight) || Number(visualViewport?.height) || 0));
    const orientation = viewportWidth > viewportHeight ? 'landscape' : 'portrait';
    const mode = typeof viewMode === 'string' && viewMode ? viewMode : 'unknown';
    return {
      key: `${orientation}:${mode}`,
      orientation,
      viewMode: mode,
      viewportWidth,
      viewportHeight,
      visualWidth: visualViewport ? Math.max(0, Math.round(Number(visualViewport.width) || 0)) : viewportWidth,
      visualHeight: visualViewport ? Math.max(0, Math.round(Number(visualViewport.height) || 0)) : viewportHeight,
      visualScale: diagnosticRound(visualViewport?.scale || 1, 3),
      nativeDpr: diagnosticRound(window.devicePixelRatio || 1, 3),
      effectiveDpr: diagnosticRound(typeof DPR === 'number' ? DPR : 1, 3),
      resolutionScale: diagnosticRound(typeof renderResolutionScale === 'number' ? renderResolutionScale : 1, 3),
      targetScale: diagnosticRound(typeof renderResolutionTarget === 'number' ? renderResolutionTarget : 1, 3),
      qualityTier: typeof runtimeQualityTier === 'number' ? runtimeQualityTier : 2,
      qualityLabel: typeof runtimeQualityLabel === 'function' ? runtimeQualityLabel() : 'FULL',
      canvasWidth: Number(canvas?.width) || 0,
      canvasHeight: Number(canvas?.height) || 0,
      webglReady: Boolean(typeof glReady !== 'undefined' && glReady)
    };
  }

  function diagnosticDisplayFingerprint(signature) {
    return [
      signature.key, signature.viewportWidth, signature.viewportHeight,
      signature.visualWidth, signature.visualHeight, signature.visualScale,
      signature.nativeDpr, signature.effectiveDpr, signature.resolutionScale,
      signature.targetScale, signature.qualityTier, signature.canvasWidth, signature.canvasHeight,
      signature.webglReady ? 1 : 0
    ].join('|');
  }

  function diagnosticDisplayState(signature = diagnosticDisplaySignature()) {
    return {
      key: signature.key,
      orientation: signature.orientation,
      viewMode: signature.viewMode,
      viewport: {
        width: signature.viewportWidth,
        height: signature.viewportHeight,
        visualWidth: signature.visualWidth,
        visualHeight: signature.visualHeight,
        visualScale: signature.visualScale
      },
      renderer: {
        nativeDpr: signature.nativeDpr,
        effectiveDpr: signature.effectiveDpr,
        resolutionScale: signature.resolutionScale,
        targetScale: signature.targetScale,
        qualityTier: signature.qualityTier,
        qualityLabel: signature.qualityLabel,
        canvasWidth: signature.canvasWidth,
        canvasHeight: signature.canvasHeight,
        webglReady: signature.webglReady
      }
    };
  }

  function diagnosticEmptyPerformanceState() {
    const signature = diagnosticDisplaySignature();
    const display = diagnosticDisplayState(signature);
    return {
      frames: 0,
      excludedFrames: 0,
      hiddenFrames: 0,
      suspendedFrames: 0,
      nonMatchFrames: 0,
      intervalTotalMs: 0,
      workTotalMs: 0,
      updateTotalMs: 0,
      renderTotalMs: 0,
      minimumIntervalMs: null,
      maximumIntervalMs: 0,
      maximumWorkMs: 0,
      slowFrames: 0,
      stutterFrames: 0,
      severeFrames: 0,
      frozenFrames: 0,
      workBudgetOverruns: 0,
      activeUpdateStalls: 0,
      schedulingGaps: 0,
      largestSchedulingGapMs: 0,
      stageTotals: {},
      stageMaximums: {},
      orientationChanges: 0,
      viewModeChanges: 0,
      resolutionChanges: 0,
      firstDisplay: display,
      lastDisplay: display,
      lastDisplayKey: display.key,
      lastDisplayFingerprint: diagnosticDisplayFingerprint(signature),
      lastResolutionScale: display.renderer.resolutionScale,
      lastFrame: null,
      segments: {},
      worstFrames: []
    };
  }

  function diagnosticPerformanceSegment(display) {
    return {
      key: display.key,
      orientation: display.orientation,
      viewMode: display.viewMode,
      frames: 0,
      excludedFrames: 0,
      hiddenFrames: 0,
      suspendedFrames: 0,
      nonMatchFrames: 0,
      intervalTotalMs: 0,
      workTotalMs: 0,
      updateTotalMs: 0,
      renderTotalMs: 0,
      minimumIntervalMs: null,
      maximumIntervalMs: 0,
      maximumWorkMs: 0,
      slowFrames: 0,
      stutterFrames: 0,
      severeFrames: 0,
      frozenFrames: 0,
      workBudgetOverruns: 0,
      activeUpdateStalls: 0,
      schedulingGaps: 0,
      largestSchedulingGapMs: 0,
      stageTotals: {},
      stageMaximums: {},
      scaleChanges: 0,
      minimumScale: display.renderer.resolutionScale,
      maximumScale: display.renderer.resolutionScale,
      firstDisplay: display,
      lastDisplay: display
    };
  }

  function diagnosticAccumulatePerformance(target, intervalMs, workMs, updateMs, renderMs) {
    target.frames++;
    target.intervalTotalMs += intervalMs;
    target.workTotalMs += workMs;
    target.updateTotalMs += updateMs;
    target.renderTotalMs += renderMs;
    target.minimumIntervalMs = target.minimumIntervalMs === null ? intervalMs : Math.min(target.minimumIntervalMs, intervalMs);
    target.maximumIntervalMs = Math.max(target.maximumIntervalMs, intervalMs);
    target.maximumWorkMs = Math.max(target.maximumWorkMs, workMs);
    if (intervalMs > 22) target.slowFrames++;
    if (intervalMs > 34) target.stutterFrames++;
    if (intervalMs > 50) target.severeFrames++;
    if (intervalMs > 100) target.frozenFrames++;
    if (workMs > 16.7) target.workBudgetOverruns++;
  }

  function diagnosticAccumulateStages(target, stages = null) {
    if (!target || !stages || typeof stages !== 'object') return;
    target.stageTotals = target.stageTotals || {};
    target.stageMaximums = target.stageMaximums || {};
    for (const [key, raw] of Object.entries(stages)) {
      const value = Math.max(0, Number(raw) || 0);
      target.stageTotals[key] = (Number(target.stageTotals[key]) || 0) + value;
      target.stageMaximums[key] = Math.max(Number(target.stageMaximums[key]) || 0, value);
    }
  }

  function diagnosticRecordPerformanceFrame(frameIntervalMs, frameWorkMs, updateMs, renderMs, stages = null) {
    if (!matchDiagnostics || matchDiagnostics.completed) return null;
    const performanceState = matchDiagnostics.performance || (matchDiagnostics.performance = diagnosticEmptyPerformanceState());
    const signature = diagnosticDisplaySignature();
    const fingerprint = diagnosticDisplayFingerprint(signature);
    let display = null;
    const currentDisplay = () => display || (display = diagnosticDisplayState(signature));
    const intervalMs = Math.max(0, Number(frameIntervalMs) || 0);
    const workMs = Math.max(0, Number(frameWorkMs) || 0);
    const updateCostMs = Math.max(0, Number(updateMs) || 0);
    const renderCostMs = Math.max(0, Number(renderMs) || 0);
    const time = diagnosticRound(simulationClock - matchDiagnostics.startSimulationTime, 3);

    if (performanceState.lastDisplayKey && performanceState.lastDisplayKey !== signature.key) {
      const previous = performanceState.lastDisplay || performanceState.firstDisplay;
      if (previous?.orientation !== signature.orientation) performanceState.orientationChanges++;
      if (previous?.viewMode !== signature.viewMode) performanceState.viewModeChanges++;
      diagnosticLogEvent('display_mode_changed', null, {
        previous: previous ? { orientation: previous.orientation, viewMode: previous.viewMode, viewport: previous.viewport } : null,
        current: { orientation: signature.orientation, viewMode: signature.viewMode, viewport: currentDisplay().viewport }
      });
    }

    const segment = performanceState.segments[signature.key] || (performanceState.segments[signature.key] = diagnosticPerformanceSegment(currentDisplay()));
    if (performanceState.lastResolutionScale !== null && Math.abs(performanceState.lastResolutionScale - signature.resolutionScale) > 0.0001) {
      performanceState.resolutionChanges++;
      segment.scaleChanges++;
      diagnosticLogEvent('render_resolution_changed', null, {
        orientation: signature.orientation,
        viewMode: signature.viewMode,
        previousScale: performanceState.lastResolutionScale,
        resolutionScale: signature.resolutionScale,
        targetScale: signature.targetScale,
        effectiveDpr: signature.effectiveDpr,
        canvasWidth: signature.canvasWidth,
        canvasHeight: signature.canvasHeight
      });
    }

    if (performanceState.lastDisplayFingerprint !== fingerprint) {
      const resolvedDisplay = currentDisplay();
      performanceState.lastDisplay = resolvedDisplay;
      segment.lastDisplay = resolvedDisplay;
      performanceState.lastDisplayFingerprint = fingerprint;
    }
    performanceState.lastDisplayKey = signature.key;
    performanceState.lastResolutionScale = signature.resolutionScale;
    performanceState.lastFrame = {
      time,
      intervalMs: diagnosticRound(intervalMs, 3),
      workMs: diagnosticRound(workMs, 3),
      updateMs: diagnosticRound(updateCostMs, 3),
      renderMs: diagnosticRound(renderCostMs, 3),
      stages: stages && typeof stages === 'object' ? Object.fromEntries(Object.entries(stages).map(([key, value]) => [key, diagnosticRound(value, 3)])) : null,
      orientation: signature.orientation,
      viewMode: signature.viewMode
    };
    segment.minimumScale = Math.min(segment.minimumScale, signature.resolutionScale);
    segment.maximumScale = Math.max(segment.maximumScale, signature.resolutionScale);

    if (updateCostMs > 100) {
      performanceState.activeUpdateStalls++;
      segment.activeUpdateStalls++;
    }
    let exclusion = '';
    if (appState !== 'match') exclusion = 'nonMatch';
    else if (document.visibilityState === 'hidden') exclusion = 'hidden';
    else if (intervalMs <= 0 || intervalMs > DIAGNOSTIC_MAX_ACTIVE_FRAME_INTERVAL_MS) exclusion = 'suspended';
    if (exclusion) {
      performanceState.excludedFrames++;
      segment.excludedFrames++;
      performanceState[`${exclusion}Frames`]++;
      segment[`${exclusion}Frames`]++;
      if (exclusion === 'suspended') {
        performanceState.schedulingGaps++;
        segment.schedulingGaps++;
        performanceState.largestSchedulingGapMs = Math.max(performanceState.largestSchedulingGapMs, intervalMs);
        segment.largestSchedulingGapMs = Math.max(segment.largestSchedulingGapMs, intervalMs);
      }
      return performanceState.lastFrame;
    }

    diagnosticAccumulatePerformance(performanceState, intervalMs, workMs, updateCostMs, renderCostMs);
    diagnosticAccumulatePerformance(segment, intervalMs, workMs, updateCostMs, renderCostMs);
    diagnosticAccumulateStages(performanceState, stages);
    diagnosticAccumulateStages(segment, stages);
    if (intervalMs > 22) {
      const resolvedDisplay = currentDisplay();
      performanceState.worstFrames.push({
        ...performanceState.lastFrame,
        viewport: resolvedDisplay.viewport,
        renderer: resolvedDisplay.renderer
      });
      performanceState.worstFrames.sort((a, b) => b.intervalMs - a.intervalMs);
      if (performanceState.worstFrames.length > DIAGNOSTIC_WORST_FRAME_LIMIT) performanceState.worstFrames.length = DIAGNOSTIC_WORST_FRAME_LIMIT;
    }
    return performanceState.lastFrame;
  }

  function diagnosticPerformanceMetrics(raw) {
    const frames = Math.max(0, Number(raw?.frames) || 0);
    const averageIntervalMs = frames ? (Number(raw.intervalTotalMs) || 0) / frames : null;
    const maximumIntervalMs = frames ? Number(raw.maximumIntervalMs) || 0 : null;
    return {
      frames,
      excludedFrames: Math.max(0, Number(raw?.excludedFrames) || 0),
      hiddenFrames: Math.max(0, Number(raw?.hiddenFrames) || 0),
      suspendedFrames: Math.max(0, Number(raw?.suspendedFrames) || 0),
      nonMatchFrames: Math.max(0, Number(raw?.nonMatchFrames) || 0),
      durationSeconds: frames ? diagnosticRound((Number(raw.intervalTotalMs) || 0) / 1000, 2) : 0,
      averageFps: averageIntervalMs ? diagnosticRound(1000 / averageIntervalMs, 1) : null,
      minimumFps: maximumIntervalMs ? diagnosticRound(1000 / maximumIntervalMs, 1) : null,
      averageFrameIntervalMs: averageIntervalMs === null ? null : diagnosticRound(averageIntervalMs, 2),
      minimumFrameIntervalMs: raw?.minimumIntervalMs === null || raw?.minimumIntervalMs === undefined ? null : diagnosticRound(raw.minimumIntervalMs, 2),
      maximumFrameIntervalMs: maximumIntervalMs === null ? null : diagnosticRound(maximumIntervalMs, 2),
      averageWorkMs: frames ? diagnosticRound((Number(raw.workTotalMs) || 0) / frames, 2) : null,
      averageUpdateMs: frames ? diagnosticRound((Number(raw.updateTotalMs) || 0) / frames, 2) : null,
      averageRenderMs: frames ? diagnosticRound((Number(raw.renderTotalMs) || 0) / frames, 2) : null,
      maximumWorkMs: frames ? diagnosticRound(raw.maximumWorkMs || 0, 2) : null,
      slowFramesOver22Ms: Math.max(0, Number(raw?.slowFrames) || 0),
      stutterFramesOver34Ms: Math.max(0, Number(raw?.stutterFrames) || 0),
      severeFramesOver50Ms: Math.max(0, Number(raw?.severeFrames) || 0),
      frozenFramesOver100Ms: Math.max(0, Number(raw?.frozenFrames) || 0),
      workBudgetOverrunsOver16_7Ms: Math.max(0, Number(raw?.workBudgetOverruns) || 0),
      activeUpdateStallsOver100Ms: Math.max(0, Number(raw?.activeUpdateStalls) || 0),
      schedulingGaps: Math.max(0, Number(raw?.schedulingGaps) || 0),
      largestSchedulingGapMs: diagnosticRound(raw?.largestSchedulingGapMs || 0, 2),
      updateBreakdown: Object.fromEntries(Object.keys(raw?.stageTotals || {}).sort().map(key => [key, {
        averageMs: frames ? diagnosticRound((Number(raw.stageTotals[key]) || 0) / frames, 3) : 0,
        maximumMs: diagnosticRound(raw?.stageMaximums?.[key] || 0, 3)
      }])),
      stutterPercent: frames ? diagnosticRound((Number(raw.stutterFrames) || 0) / frames * 100, 2) : 0
    };
  }

  function diagnosticPerformanceEnvironment() {
    return {
      userAgent: String(navigator.userAgent || ''),
      platform: String(navigator.platform || ''),
      language: String(navigator.language || ''),
      hardwareConcurrency: Number(navigator.hardwareConcurrency) || null,
      deviceMemoryGb: Number(navigator.deviceMemory) || null,
      maxTouchPoints: Number(navigator.maxTouchPoints) || 0,
      screen: {
        width: Number(window.screen?.width) || 0,
        height: Number(window.screen?.height) || 0,
        availableWidth: Number(window.screen?.availWidth) || 0,
        availableHeight: Number(window.screen?.availHeight) || 0,
        colourDepth: Number(window.screen?.colorDepth) || null
      }
    };
  }

  function diagnosticBuildPerformanceReport(source = matchDiagnostics) {
    const raw = source?.performance;
    if (!raw) return null;
    const segments = Object.values(raw.segments || {}).map(segment => ({
      orientation: segment.orientation,
      viewMode: segment.viewMode,
      ...diagnosticPerformanceMetrics(segment),
      resolution: {
        changes: Number(segment.scaleChanges) || 0,
        minimumScale: diagnosticRound(segment.minimumScale ?? 1, 3),
        maximumScale: diagnosticRound(segment.maximumScale ?? 1, 3)
      },
      firstDisplay: segment.firstDisplay,
      lastDisplay: segment.lastDisplay
    }));
    return {
      captured: Boolean(raw.frames),
      environment: diagnosticPerformanceEnvironment(),
      overall: diagnosticPerformanceMetrics(raw),
      orientationsSeen: [...new Set(segments.map(segment => segment.orientation))],
      viewModesSeen: [...new Set(segments.map(segment => segment.viewMode))],
      transitions: {
        orientationChanges: Number(raw.orientationChanges) || 0,
        viewModeChanges: Number(raw.viewModeChanges) || 0,
        resolutionChanges: Number(raw.resolutionChanges) || 0
      },
      firstDisplay: raw.firstDisplay,
      lastDisplay: raw.lastDisplay,
      segments,
      worstFrames: (raw.worstFrames || []).map(frame => ({ ...frame })),
      runtimeFaults: typeof runtimeFaultSnapshot === 'function' ? runtimeFaultSnapshot() : [],
      exclusions: {
        maximumActiveFrameIntervalMs: DIAGNOSTIC_MAX_ACTIVE_FRAME_INTERVAL_MS,
        reason: 'Frames outside the live match, while the page was hidden, or with an interval above the active-frame limit are excluded from FPS averages and counted separately.'
      }
    };
  }

  function diagnosticPerformanceSnapshot(source = matchDiagnostics) {
    const raw = source?.performance;
    const display = diagnosticDisplayState();
    const frame = raw?.lastFrame || null;
    return {
      orientation: display.orientation,
      viewMode: display.viewMode,
      viewport: display.viewport,
      renderer: display.renderer,
      frame: frame ? {
        intervalMs: frame.intervalMs,
        fps: frame.intervalMs > 0 ? diagnosticRound(1000 / frame.intervalMs, 1) : null,
        workMs: frame.workMs,
        updateMs: frame.updateMs,
        renderMs: frame.renderMs,
        stages: frame.stages ? { ...frame.stages } : null
      } : null,
      matchToDate: raw ? diagnosticPerformanceMetrics(raw) : null
    };
  }

  function diagnosticBotKey(bot) {
    if (!bot) return 'unknown';
    return `${bot.team === TEAM_RED ? 'red' : 'blue'}-${Number(bot.slot) || 0}`;
  }

  function diagnosticBotIdentity(bot) {
    if (!bot) return null;
    return {
      key: diagnosticBotKey(bot),
      name: String(bot.name || 'UNKNOWN'),
      team: Number(bot.team) || 0,
      slot: Number(bot.slot) || 0,
      playerId: bot.playerProfileId || null,
      role: bot.playerRole || null,
      weapon: bot.weapon ? {
        id: bot.weapon.id || null,
        name: bot.weapon.name || null,
        range: diagnosticRound(bot.weapon.range, 2),
        rangeBand: typeof weaponRangeDescriptor === 'function' ? weaponRangeDescriptor(bot.weapon).label : null,
        armourPenetration: diagnosticRound(bot.weapon.armourPenetration || 0, 1)
      } : null,
      armour: bot.armourProfile ? {
        id: bot.armourId || 'none',
        name: bot.armourProfile.name || bot.armourName || 'NO ARMOUR',
        classId: bot.armourProfile.classId || 'none',
        rating: diagnosticRound(bot.armourProfile.rating || 0, 1),
        integrity: diagnosticRound(bot.armourDurability || 0, 1),
        maximumIntegrity: diagnosticRound(bot.armourMaxDurability || 0, 1),
        broken: Boolean(bot.armourBroken)
      } : null
    };
  }

  function diagnosticMatchContext() {
    const tactics = careerState?.tactics || {};
    const arena = typeof activeArenaMeta === 'function' ? activeArenaMeta() : null;
    return {
      build: BUILD_ID,
      arena: arena ? { id: arena.id, name: arena.name, theme: arena.theme || null } : null,
      competition: typeof matchCompetitionLabel === 'function' ? matchCompetitionLabel() : null,
      club: careerState?.name || null,
      opponent: typeof matchTeamIdentity === 'function' ? matchTeamIdentity(TEAM_RED)?.name || null : null,
      engagementPlan: currentEngagementPlan ? { id: currentEngagementPlan.id, name: currentEngagementPlan.name, zone: currentEngagementPlan.zone || null } : null,
      doors: typeof doorStateSnapshot === 'function' ? doorStateSnapshot() : [],
      tactics: {
        formationId: tactics.formationId || null,
        approachId: tactics.approachId || null,
        engagementId: tactics.engagementId || null,
        priorityId: tactics.priorityId || null,
        arenaId: tactics.arenaId || arena?.id || null,
        assignments: { ...(tactics.assignments || {}) }
      },
      startedAt: new Date().toISOString()
    };
  }

  function diagnosticTeamKey(team) {
    return team === TEAM_RED ? 'red' : 'blue';
  }

  function diagnosticEmptyZoneTeam() {
    return {
      operatorSeconds: 0,
      combatSeconds: 0,
      congestionSeconds: 0,
      damage: 0,
      hits: 0,
      eliminations: 0,
      deaths: 0,
      headshots: 0,
      criticalHits: 0,
      armourAbsorbed: 0,
      armourIntegrityLost: 0,
      armourBreaks: 0,
      teammateMovementBlocks: 0,
      teammateBlockedShots: 0,
      maximumOccupancy: 0
    };
  }

  function diagnosticEmptyZoneAggregate(zone) {
    return {
      zone: String(zone || 'UNKNOWN'),
      operatorSeconds: 0,
      combatSeconds: 0,
      contestedSeconds: 0,
      congestionSeconds: 0,
      damage: 0,
      hits: 0,
      eliminations: 0,
      deaths: 0,
      headshots: 0,
      criticalHits: 0,
      armourAbsorbed: 0,
      armourIntegrityLost: 0,
      armourBreaks: 0,
      teammateMovementBlocks: 0,
      teammateBlockedShots: 0,
      maximumFriendlyOccupancy: 0,
      teams: { blue: diagnosticEmptyZoneTeam(), red: diagnosticEmptyZoneTeam() }
    };
  }

  function diagnosticZoneAggregate(zone, state = matchDiagnostics) {
    if (!state) return null;
    const key = String(zone || 'UNKNOWN').toUpperCase();
    state.zoneAnalytics = state.zoneAnalytics || {};
    return state.zoneAnalytics[key] || (state.zoneAnalytics[key] = diagnosticEmptyZoneAggregate(key));
  }

  function diagnosticCaptureZoneSample(botStates) {
    const state = matchDiagnostics;
    if (!state || !Array.isArray(botStates)) return;
    const now = Number(simulationClock) || 0;
    const previousAt = Number(state.lastZoneSampleSimulationTime);
    const elapsed = Number.isFinite(previousAt) ? clamp(now - previousAt, 0, 0.75) : 0;
    state.lastZoneSampleSimulationTime = now;
    if (elapsed <= 0) return;

    const occupancy = new Map();
    const activeByZone = new Map();
    for (const current of botStates) {
      if (!current?.alive) continue;
      const zone = String(current.zone || 'UNKNOWN').toUpperCase();
      const teamKey = diagnosticTeamKey(current.team);
      const entry = diagnosticZoneAggregate(zone, state);
      const team = entry.teams[teamKey];
      entry.operatorSeconds += elapsed;
      team.operatorSeconds += elapsed;
      const occupancyKey = `${zone}:${teamKey}`;
      occupancy.set(occupancyKey, (occupancy.get(occupancyKey) || 0) + 1);

      const previous = state.previousBots.get(current.key);
      const fired = Boolean(previous && Number(current.combat?.shots) > Number(previous.combat?.shots));
      const dealtDamage = Boolean(previous && Number(current.combat?.damage) > Number(previous.combat?.damage));
      const tookDamage = Boolean(previous && Number(current.health) < Number(previous.health));
      const activeCombat = Boolean(current.target || current.visibleEnemies > 0 || fired || dealtDamage || tookDamage || current.combatApproachGoal);
      if (activeCombat) {
        entry.combatSeconds += elapsed;
        team.combatSeconds += elapsed;
        const active = activeByZone.get(zone) || { blue: false, red: false };
        active[teamKey] = true;
        activeByZone.set(zone, active);
      }
    }

    for (const [key, count] of occupancy.entries()) {
      const [zone, teamKey] = key.split(':');
      const entry = diagnosticZoneAggregate(zone, state);
      const team = entry.teams[teamKey];
      team.maximumOccupancy = Math.max(team.maximumOccupancy, count);
      entry.maximumFriendlyOccupancy = Math.max(entry.maximumFriendlyOccupancy, count);
      if (count >= 3) {
        entry.congestionSeconds += elapsed;
        team.congestionSeconds += elapsed;
      }
    }
    for (const [zone, active] of activeByZone.entries()) {
      if (active.blue && active.red) diagnosticZoneAggregate(zone, state).contestedSeconds += elapsed;
    }
  }

  function diagnosticRecordZoneBlock(bot, type, details = {}) {
    if (!matchDiagnostics || !bot) return;
    const zone = typeof levelZoneAt === 'function' ? levelZoneAt(bot.x, bot.y)?.short || 'UNKNOWN' : 'UNKNOWN';
    const entry = diagnosticZoneAggregate(zone);
    const team = entry.teams[diagnosticTeamKey(bot.team)];
    if (type === 'movement_blocked' && details.blockerType === 'team-mate') {
      entry.teammateMovementBlocks++;
      team.teammateMovementBlocks++;
    }
    if (type === 'operator_blocked_shot' && details.blocker && Number(details.blocker.team) === Number(bot.team)) {
      entry.teammateBlockedShots++;
      team.teammateBlockedShots++;
    }
  }

  function diagnosticZoneAnalyticsSummary(state = matchDiagnostics) {
    if (!state) return [];
    const rows = Object.values(state.zoneAnalytics || {});
    const totalDamage = rows.reduce((sum, item) => sum + Number(item.damage || 0), 0);
    const totalCombat = rows.reduce((sum, item) => sum + Number(item.combatSeconds || 0), 0);
    return rows.map(item => ({
      zone: item.zone,
      operatorSeconds: diagnosticRound(item.operatorSeconds, 1),
      combatSeconds: diagnosticRound(item.combatSeconds, 1),
      contestedSeconds: diagnosticRound(item.contestedSeconds, 1),
      congestionSeconds: diagnosticRound(item.congestionSeconds, 1),
      damage: diagnosticRound(item.damage, 1),
      damageSharePercent: totalDamage ? diagnosticRound(item.damage / totalDamage * 100, 1) : 0,
      combatSharePercent: totalCombat ? diagnosticRound(item.combatSeconds / totalCombat * 100, 1) : 0,
      hits: item.hits,
      eliminations: item.eliminations,
      deaths: item.deaths,
      headshots: item.headshots,
      criticalHits: item.criticalHits,
      armourAbsorbed: diagnosticRound(item.armourAbsorbed || 0, 1),
      armourIntegrityLost: diagnosticRound(item.armourIntegrityLost || 0, 1),
      armourBreaks: Number(item.armourBreaks) || 0,
      teammateMovementBlocks: item.teammateMovementBlocks,
      teammateBlockedShots: item.teammateBlockedShots,
      maximumFriendlyOccupancy: item.maximumFriendlyOccupancy,
      teams: {
        blue: { ...item.teams.blue, operatorSeconds: diagnosticRound(item.teams.blue.operatorSeconds, 1), combatSeconds: diagnosticRound(item.teams.blue.combatSeconds, 1), congestionSeconds: diagnosticRound(item.teams.blue.congestionSeconds, 1), damage: diagnosticRound(item.teams.blue.damage, 1) },
        red: { ...item.teams.red, operatorSeconds: diagnosticRound(item.teams.red.operatorSeconds, 1), combatSeconds: diagnosticRound(item.teams.red.combatSeconds, 1), congestionSeconds: diagnosticRound(item.teams.red.congestionSeconds, 1), damage: diagnosticRound(item.teams.red.damage, 1) }
      }
    })).sort((a, b) => (b.damage + b.combatSeconds * 0.2) - (a.damage + a.combatSeconds * 0.2));
  }

  function diagnosticAiStabilitySummary(state, operators, durationSeconds) {
    const operatorSeconds = diagnosticZoneAnalyticsSummary(state).reduce((sum, item) => sum + item.operatorSeconds, 0);
    const operatorMinutes = Math.max(1 / 60, operatorSeconds / 60);
    const totalPathChanges = operators.reduce((sum, item) => sum + Number(item.pathChanges || 0), 0);
    const totalTacticalChanges = operators.reduce((sum, item) => sum + Number(item.tacticalChanges || 0), 0);
    const totalTargetChanges = operators.reduce((sum, item) => sum + Number(item.targetChanges || 0), 0);
    const zoneRows = diagnosticZoneAnalyticsSummary(state);
    const counterDelta = key => Math.max(0, (Number(combatDebug[key]) || 0) - (Number(state?.countersAtStart?.[key]) || 0));
    return {
      durationSeconds: diagnosticRound(durationSeconds, 1),
      operatorMinutes: diagnosticRound(operatorMinutes, 2),
      pathChangesPerOperatorMinute: diagnosticRound(totalPathChanges / operatorMinutes, 2),
      tacticalChangesPerOperatorMinute: diagnosticRound(totalTacticalChanges / operatorMinutes, 2),
      targetChangesPerOperatorMinute: diagnosticRound(totalTargetChanges / operatorMinutes, 2),
      teammateMovementBlocks: zoneRows.reduce((sum, item) => sum + Number(item.teammateMovementBlocks || 0), 0),
      teammateBlockedShots: zoneRows.reduce((sum, item) => sum + Number(item.teammateBlockedShots || 0), 0),
      maximumFriendlyOccupancy: zoneRows.reduce((maximum, item) => Math.max(maximum, Number(item.maximumFriendlyOccupancy) || 0), 0),
      navigationPlansExecuted: counterDelta('navigationPlansExecuted'),
      navigationPlanDeferrals: counterDelta('navigationPlanDeferrals'),
      navigationPathHoldReuses: counterDelta('navigationPathHoldReuses'),
      perceptionScanDeferrals: counterDelta('perceptionScanDeferrals'),
      tacticalDecisionDeferrals: counterDelta('tacticalDecisionDeferrals'),
      combatRouteSearches: counterDelta('combatRouteSearches'),
      combatRoutePlanDeferrals: counterDelta('combatRoutePlanDeferrals'),
      combatRouteCandidateEvaluations: counterDelta('combatRouteCandidateEvaluations'),
      teamSpacingCorrections: counterDelta('teamSpacingCorrections'),
      teamLaneSeparations: counterDelta('teamLaneSeparations'),
      reloadCoverSeeks: counterDelta('reloadCoverSeeks'),
      reloadCoverArrivals: counterDelta('reloadCoverArrivals'),
      reloadCoverFallbacks: counterDelta('reloadCoverFallbacks'),
      flinchEvents: counterDelta('flinchEvents'),
      flinchCooldownBlocks: counterDelta('flinchCooldownBlocks')
    };
  }

  function diagnosticEmptyAggregate(bot) {
    return {
      identity: diagnosticBotIdentity(bot),
      samples: 0,
      targetSamples: 0,
      effectiveRangeSamples: 0,
      targetDistanceTotal: 0,
      movementDistance: 0,
      stationarySamples: 0,
      crouchedStationarySamples: 0,
      pathChanges: 0,
      targetChanges: 0,
      tacticalChanges: 0,
      deaths: 0,
      kills: 0,
      blockedShots: 0,
      recoveries: 0,
      flankRoutes: 0,
      weaponSwitches: 0,
      sidearmDraws: 0,
      modeCounts: {},
      zoneCounts: {},
      lastPosition: bot ? { x: bot.x, y: bot.y } : null
    };
  }

  function diagnosticCountersSnapshot() {
    return {
      pathFailures: Number(combatDebug.pathFailures) || 0,
      navigationRecoveries: Number(combatDebug.navigationRecoveries) || 0,
      navigationPlansExecuted: Number(combatDebug.navigationPlansExecuted) || 0,
      navigationPlanDeferrals: Number(combatDebug.navigationPlanDeferrals) || 0,
      navigationPathHoldReuses: Number(combatDebug.navigationPathHoldReuses) || 0,
      perceptionScanDeferrals: Number(combatDebug.perceptionScanDeferrals) || 0,
      tacticalDecisionDeferrals: Number(combatDebug.tacticalDecisionDeferrals) || 0,
      combatRouteSearches: Number(combatDebug.combatRouteSearches) || 0,
      combatRoutePlanDeferrals: Number(combatDebug.combatRoutePlanDeferrals) || 0,
      combatRouteCandidateEvaluations: Number(combatDebug.combatRouteCandidateEvaluations) || 0,
      teamSpacingCorrections: Number(combatDebug.teamSpacingCorrections) || 0,
      teamLaneSeparations: Number(combatDebug.teamLaneSeparations) || 0,
      targetSwitches: Number(combatDebug.targetSwitches) || 0,
      closeThreatOverrides: Number(combatDebug.closeThreatOverrides) || 0,
      operatorBlockedShots: Number(combatDebug.operatorBlockedShots) || 0,
      combatStallRecoveries: Number(combatDebug.combatStallRecoveries) || 0,
      combatApproachRoutes: Number(combatDebug.combatApproachRoutes) || 0,
      combatYieldActions: Number(combatDebug.combatYieldActions) || 0,
      combatRecoveryEscalations: Number(combatDebug.combatRecoveryEscalations) || 0,
      combatRecoverySuccesses: Number(combatDebug.combatRecoverySuccesses) || 0,
      crouchStallRecoveries: Number(combatDebug.crouchStallRecoveries) || 0,
      coordinationWaitCommits: Number(combatDebug.coordinationWaitCommits) || 0,
      stalemateBreaks: Number(combatDebug.stalemateBreaks) || 0,
      tacticalRepositions: Number(combatDebug.tacticalRepositions) || 0,
      officeCourtyardRotations: Number(combatDebug.officeCourtyardRotations) || 0,
      officeCourtyardCrossings: Number(combatDebug.officeCourtyardCrossings) || 0,
      summitLayerRotations: Number(combatDebug.summitLayerRotations) || 0,
      summitLayerTraversals: Number(combatDebug.summitLayerTraversals) || 0,
      summitIllegalElevationTransitionsBlocked: Number(combatDebug.summitIllegalElevationTransitionsBlocked) || 0,
      tacticalFlankRoutes: Number(combatDebug.tacticalFlankRoutes) || 0,
      reloadCoverSeeks: Number(combatDebug.reloadCoverSeeks) || 0,
      reloadCoverArrivals: Number(combatDebug.reloadCoverArrivals) || 0,
      reloadCoverFallbacks: Number(combatDebug.reloadCoverFallbacks) || 0,
      flinchEvents: Number(combatDebug.flinchEvents) || 0,
      flinchCooldownBlocks: Number(combatDebug.flinchCooldownBlocks) || 0,
      headshots: Number(combatDebug.headshotsDealt) || 0,
      criticalHeadshots: Number(combatDebug.criticalHeadshots) || 0
    };
  }

  function diagnosticBeginMatch() {
    const context = diagnosticMatchContext();
    const matchId = `${context.arena?.id || 'arena'}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    matchDiagnostics = {
      schema: 1,
      matchId,
      context,
      startSimulationTime: simulationClock,
      sampleAccumulator: 0,
      sampleSequence: 0,
      samples: [],
      sampleCursor: 0,
      samplesWrapped: false,
      events: [],
      eventCursor: 0,
      eventsWrapped: false,
      nextEventSequence: 1,
      eventCounts: {},
      previousBots: new Map(),
      aggregates: {},
      zoneAnalytics: {},
      lastZoneSampleSimulationTime: simulationClock,
      countersAtStart: diagnosticCountersSnapshot(),
      countersLast: diagnosticCountersSnapshot(),
      performance: diagnosticEmptyPerformanceState(),
      eventOverflowCount: 0,
      completed: false,
      winner: null,
      completedAt: null,
      summary: null
    };
    for (const bot of bots) matchDiagnostics.aggregates[diagnosticBotKey(bot)] = diagnosticEmptyAggregate(bot);
    diagnosticLogEvent('match_started', null, { context });
    diagnosticCaptureSample(true);
    updateDiagnosticOverlay();
    return matchDiagnostics;
  }

  function diagnosticResetMatch() {
    matchDiagnostics = null;
    if (diagnosticOverlayVisible && typeof setDiagnosticOverlayVisible === 'function') {
      setDiagnosticOverlayVisible(false, false);
    }
    diagnosticOverlayVisible = false;
    return true;
  }

  function diagnosticEnsureMatch() {
    if (!matchDiagnostics || matchDiagnostics.completed) return diagnosticBeginMatch();
    return matchDiagnostics;
  }

  function diagnosticLogEvent(type, bot = null, details = {}) {
    const state = matchDiagnostics || diagnosticBeginMatch();
    if (!state) return null;
    const event = {
      sequence: Math.max(1, Number(state.nextEventSequence) || 1),
      time: diagnosticRound(simulationClock - state.startSimulationTime, 3),
      simulationTime: diagnosticRound(simulationClock, 3),
      round: Number(roundNumber) || 0,
      type: String(type || 'event'),
      actor: diagnosticBotIdentity(bot),
      details: details && typeof details === 'object' ? details : { value: details }
    };
    state.nextEventSequence = event.sequence + 1;
    state.eventCounts = state.eventCounts || {};
    state.eventCounts[event.type] = (Number(state.eventCounts[event.type]) || 0) + 1;
    const overwritten = diagnosticPushRing(state, 'events', event, DIAGNOSTIC_MAX_EVENTS, 'eventCursor', 'eventsWrapped');
    if (overwritten) state.eventOverflowCount = (state.eventOverflowCount || 0) + 1;
    const aggregate = bot ? state.aggregates[diagnosticBotKey(bot)] : null;
    if (aggregate) {
      if (type === 'target_changed') aggregate.targetChanges++;
      else if (type === 'path_changed' || type === 'path_failed') aggregate.pathChanges++;
      else if (type === 'operator_blocked_shot') aggregate.blockedShots++;
      else if (type.includes('recovery') || type === 'stationary_crouch_released') aggregate.recoveries++;
      else if (type === 'weapon_range_flank') aggregate.flankRoutes++;
      else if (type === 'weapon_switched') {
        aggregate.weaponSwitches++;
        if (String(event.details?.slot || '') === 'sidearm') aggregate.sidearmDraws++;
      }
      else if (type === 'elimination') aggregate.kills++;
      else if (type === 'eliminated') aggregate.deaths++;
    }
    diagnosticRecordZoneBlock(bot, type, event.details);
    return event;
  }

  function diagnosticTargetReason(bot, previousTarget, currentTarget) {
    if (!currentTarget) return 'target_lost';
    if (!previousTarget) return 'first_visible_target';
    if (typeof bot.isImmediateVisibleThreat === 'function' && bot.isImmediateVisibleThreat(currentTarget)) return 'immediate_close_threat';
    if (typeof bot.firstOperatorInLineOfFire === 'function' && bot.firstOperatorInLineOfFire(previousTarget) === currentTarget) return 'line_of_fire_blocker';
    if (previousTarget && !previousTarget.alive) return 'previous_target_eliminated';
    return 'higher_visible_priority';
  }

  function diagnosticVisibleEnemyCount(bot) {
    if (!bot || !bot.alive || typeof bot.canVisuallySee !== 'function') return 0;
    let count = 0;
    for (const other of bots) {
      if (other === bot || !other.alive || other.team === bot.team) continue;
      if (bot.canVisuallySee(other, FOV * 1.24)) count++;
    }
    return count;
  }

  function diagnosticCompactBotState(bot, includePathNodes = false) {
    const target = bot.target && bot.target.alive ? bot.target : null;
    const targetDistance = target ? dist(bot, target) : null;
    const preferredRange = typeof bot.preferredCombatRange === 'function' ? bot.preferredCombatRange() : Number(bot.weapon?.range || 0) * 0.6;
    const pathNodes = includePathNodes && Array.isArray(bot.path)
      ? bot.path.slice(Math.max(0, Number(bot.pathIndex) || 0), Math.max(0, Number(bot.pathIndex) || 0) + 6).map(node => ({ x: diagnosticRound(node.x), y: diagnosticRound(node.y) }))
      : [];
    const zone = typeof levelZoneAt === 'function' ? levelZoneAt(bot.x, bot.y) : null;
    return {
      key: diagnosticBotKey(bot),
      name: bot.name,
      team: bot.team,
      slot: bot.slot,
      alive: Boolean(bot.alive),
      position: { x: diagnosticRound(bot.x), y: diagnosticRound(bot.y), elevation: diagnosticRound(typeof arenaElevationAt === 'function' ? arenaElevationAt(bot.x, bot.y) : 0, 3), angle: diagnosticRound(bot.angle, 3) },
      zone: zone?.short || zone?.name || null,
      state: typeof botTacticalStatus === 'function' ? botTacticalStatus(bot, false) : bot.tacticalMode || null,
      tacticalMode: bot.tacticalMode || null,
      tacticalReason: bot.lastTacticalReason || null,
      role: bot.playerRole || null,
      openingPlanId: bot.openingPlanId || null,
      openingPlanName: bot.openingPlanName || null,
      openingPlanObjective: bot.openingPlanObjective ? { x: diagnosticRound(bot.openingPlanObjective.x), y: diagnosticRound(bot.openingPlanObjective.y) } : null,
      mapRotation: bot.mapRotationGoal ? {
        stage: bot.mapRotationStage || null,
        laneId: bot.mapRotationLaneId || null,
        goal: { x: diagnosticRound(bot.mapRotationGoal.x), y: diagnosticRound(bot.mapRotationGoal.y) },
        exit: bot.mapRotationExitGoal ? { x: diagnosticRound(bot.mapRotationExitGoal.x), y: diagnosticRound(bot.mapRotationExitGoal.y) } : null,
        openingCommit: Boolean(bot.mapRotationOpeningCommit)
      } : null,
      target: target ? target.name : null,
      targetDistance: targetDistance === null ? null : diagnosticRound(targetDistance),
      preferredRange: diagnosticRound(preferredRange),
      weaponRange: diagnosticRound(bot.weapon?.range || 0),
      insideEffectiveRange: targetDistance === null ? null : targetDistance <= Number(bot.weapon?.range || 0) && targetDistance >= Math.max(1.1, preferredRange * 0.45),
      visibleEnemies: diagnosticVisibleEnemyCount(bot),
      rememberedEnemies: (bot.lastSeen ? 1 : 0) + (bot.huntEvidence ? 1 : 0) + (bot.heardSound ? 1 : 0),
      pathGoal: bot.pathGoal ? { x: diagnosticRound(bot.pathGoal.x), y: diagnosticRound(bot.pathGoal.y) } : null,
      pathNodes,
      pathLength: Array.isArray(bot.path) ? bot.path.length : 0,
      pathIndex: Number(bot.pathIndex) || 0,
      combatApproachGoal: bot.combatApproachGoal ? { x: diagnosticRound(bot.combatApproachGoal.x), y: diagnosticRound(bot.combatApproachGoal.y) } : null,
      combatApproachReason: bot.combatApproachReason || null,
      combatApproachKind: bot.combatApproachKind || null,
      combatRecoveryStage: Number(bot.combatRecoveryStage) || 0,
      combatRecoveryDisplacement: bot.combatRecoveryOrigin ? diagnosticRound(dist(bot, bot.combatRecoveryOrigin)) : 0,
      combatBlocker: bot.combatBlockerKey || null,
      combatBlockerType: bot.combatBlockerType || null,
      combatBlockedTimer: diagnosticRound(bot.combatBlockedTimer || 0),
      crouched: Boolean(bot.crouched),
      crouchBlend: diagnosticRound(bot.crouchBlend || 0, 3),
      moveVelocity: diagnosticRound(bot.moveVelocity || 0, 3),
      visualMoveVelocity: diagnosticRound(bot.visualMoveVelocity || 0, 3),
      weaponReadyBlend: diagnosticRound(bot.weaponReadyBlend || 0, 3),
      shoulderBlend: diagnosticRound(bot.shoulderBlend || 0, 3),
      moveIntent: diagnosticRound(bot.moveIntent || 0, 3),
      moveBlocked: Boolean(bot.moveBlocked),
      stuckTimer: diagnosticRound(bot.stuckTimer || 0),
      crouchStationaryTimer: diagnosticRound(bot.crouchStationaryTimer || 0),
      engagementIdleTimer: diagnosticRound(bot.engagementIdleTimer || 0),
      navigationRecoveries: (Number(bot.navProgressRecoveries) || 0) + (Number(bot.navigationLoopRecoveries) || 0) + (Number(bot.navigationPauseRecoveries) || 0),
      health: diagnosticRound(bot.health || 0),
      armour: { id: bot.armourId || 'none', integrity: diagnosticRound(bot.armourDurability || 0, 1), maximumIntegrity: diagnosticRound(bot.armourMaxDurability || 0, 1), broken: Boolean(bot.armourBroken), absorbedThisRound: diagnosticRound(bot.roundArmourAbsorbed || 0, 1) },
      ammo: Number(bot.magAmmo) || 0,
      reserve: typeof bot.currentReserve === 'function' ? Number(bot.currentReserve()) || 0 : 0,
      reloadTimer: diagnosticRound(bot.reloadTimer || 0),
      combat: {
        shots: Number(bot.roundShotsFired) || 0,
        hits: Number(bot.roundShotsHit) || 0,
        criticalHits: Number(bot.roundCriticalHits) || 0,
        headshots: Number(bot.roundHeadshots) || 0,
        criticalHeadshots: Number(bot.roundCriticalHeadshots) || 0,
        damage: diagnosticRound(bot.roundDamageDealt || 0),
        kills: Number(bot.kills) || 0,
        deaths: Number(bot.deaths) || 0
      }
    };
  }

  function diagnosticStateKey(point) {
    if (!point) return '';
    return `${Math.round(point.x * 2) / 2}:${Math.round(point.y * 2) / 2}`;
  }

  function diagnosticCompareBotState(bot, current) {
    const state = matchDiagnostics;
    const previous = state.previousBots.get(current.key);
    const aggregate = state.aggregates[current.key] || (state.aggregates[current.key] = diagnosticEmptyAggregate(bot));
    aggregate.samples++;
    aggregate.modeCounts[current.tacticalMode || current.state || 'unknown'] = (aggregate.modeCounts[current.tacticalMode || current.state || 'unknown'] || 0) + 1;
    aggregate.zoneCounts[current.zone || 'UNKNOWN'] = (aggregate.zoneCounts[current.zone || 'UNKNOWN'] || 0) + 1;
    if (current.targetDistance !== null) {
      aggregate.targetSamples++;
      aggregate.targetDistanceTotal += current.targetDistance;
      if (current.insideEffectiveRange) aggregate.effectiveRangeSamples++;
    }
    if (aggregate.lastPosition) {
      const moved = Math.hypot(current.position.x - aggregate.lastPosition.x, current.position.y - aggregate.lastPosition.y);
      aggregate.movementDistance += moved;
      if (moved < 0.025) aggregate.stationarySamples++;
      if (moved < 0.025 && current.crouched) aggregate.crouchedStationarySamples++;
    }
    aggregate.lastPosition = { x: current.position.x, y: current.position.y };

    if (previous) {
      if (previous.target !== current.target) {
        const previousTarget = bots.find(other => other.name === previous.target) || null;
        const currentTarget = bots.find(other => other.name === current.target) || null;
        diagnosticLogEvent('target_changed', bot, {
          previousTarget: previous.target,
          newTarget: current.target,
          reason: diagnosticTargetReason(bot, previousTarget, currentTarget),
          previousDistance: previous.targetDistance,
          newDistance: current.targetDistance
        });
      }
      if (previous.tacticalMode !== current.tacticalMode) {
        aggregate.tacticalChanges++;
        const flankAction = current.combatApproachKind === 'tactical-flank' && previous.combatApproachKind !== 'tactical-flank';
        if (flankAction) {
          aggregate.flankRoutes++;
          diagnosticLogEvent('flank_route', bot, { previousMode: previous.tacticalMode, mode: current.tacticalMode, reason: current.combatApproachReason || current.tacticalReason, goal: current.pathGoal, verified: true });
        }
        diagnosticLogEvent('tactical_state_changed', bot, {
          previousMode: previous.tacticalMode,
          mode: current.tacticalMode,
          reason: current.tacticalReason
        });
      }
      const previousGoal = previous.pathGoal;
      const currentGoal = current.pathGoal;
      const pathGoalShift = previousGoal && currentGoal ? Math.hypot(previousGoal.x - currentGoal.x, previousGoal.y - currentGoal.y) : (previousGoal || currentGoal ? Infinity : 0);
      if (diagnosticStateKey(previousGoal) !== diagnosticStateKey(currentGoal) && pathGoalShift >= 0.75) {
        diagnosticLogEvent('path_changed', bot, {
          previousGoal,
          goal: currentGoal,
          shiftDistance: Number.isFinite(pathGoalShift) ? diagnosticRound(pathGoalShift) : null,
          nodes: current.pathLength,
          reason: current.tacticalReason || current.state
        });
      }
      if (previous.alive && !current.alive) diagnosticLogEvent('eliminated', bot, { zone: current.zone });
      if (!previous.crouched && current.crouched) diagnosticLogEvent('crouch_entered', bot, { state: current.state });
      if (previous.crouched && !current.crouched && previous.crouchStationaryTimer >= 0.7) {
        diagnosticLogEvent('stationary_crouch_released', bot, { stationarySeconds: previous.crouchStationaryTimer, reason: current.tacticalReason });
      }
      if (!previous.moveBlocked && current.moveBlocked) diagnosticLogEvent('movement_blocked', bot, {
        pathGoal: current.pathGoal,
        zone: current.zone,
        blocker: current.combatBlocker,
        blockerType: current.combatBlockerType,
        recoveryStage: current.combatRecoveryStage,
        approachGoal: current.combatApproachGoal
      });
    }
    state.previousBots.set(current.key, current);
  }

  function diagnosticLogCounterChanges() {
    if (!matchDiagnostics) return;
    const current = diagnosticCountersSnapshot();
    const previous = matchDiagnostics.countersLast || current;
    for (const [key, value] of Object.entries(current)) {
      const delta = value - (Number(previous[key]) || 0);
      if (delta <= 0 || DIAGNOSTIC_SUMMARY_ONLY_COUNTERS.has(key)) continue;
      diagnosticLogEvent('counter_increment', null, { counter: key, delta, total: value });
    }
    matchDiagnostics.countersLast = current;
  }

  function diagnosticCaptureSample(force = false) {
    if (!matchDiagnostics || matchDiagnostics.completed) return null;
    const sequence = Math.max(0, Number(matchDiagnostics.sampleSequence) || 0);
    matchDiagnostics.sampleSequence = sequence + 1;
    // Full path-node arrays are retained for forced boundary samples, while the
    // regular rolling record stores them every two seconds. This keeps the
    // exported report useful without allocating thousands of nested waypoint
    // objects during ordinary mobile play.
    const includePathNodes = Boolean(force || diagnosticOverlayVisible || sequence % 4 === 0);
    const botStates = bots.map(bot => diagnosticCompactBotState(bot, includePathNodes));
    diagnosticCaptureZoneSample(botStates);
    for (let index = 0; index < bots.length; index++) diagnosticCompareBotState(bots[index], botStates[index]);
    diagnosticLogCounterChanges();
    const sample = {
      time: diagnosticRound(simulationClock - matchDiagnostics.startSimulationTime, 3),
      simulationTime: diagnosticRound(simulationClock, 3),
      round: Number(roundNumber) || 0,
      score: [Number(blueScore) || 0, Number(redScore) || 0],
      roundTime: diagnosticRound(roundTime || 0),
      freeze: diagnosticRound(roundFreezeTimer || 0),
      overtime: Boolean(suddenHuntOvertime),
      lateRound: Boolean(lateRoundMode),
      engagementPlan: currentEngagementPlan ? { id: currentEngagementPlan.id, name: currentEngagementPlan.name, zone: currentEngagementPlan.zone || null } : null,
      doors: typeof doorStateSnapshot === 'function' ? doorStateSnapshot() : [],
      performance: diagnosticPerformanceSnapshot(),
      bots: botStates
    };
    diagnosticPushRing(matchDiagnostics, 'samples', sample, DIAGNOSTIC_MAX_SAMPLES, 'sampleCursor', 'samplesWrapped');
    updateDiagnosticOverlay(sample);
    return sample;
  }

  function updateMatchDiagnostics(dt) {
    if (!matchDiagnostics || matchDiagnostics.completed || !bots.length) return;
    matchDiagnostics.sampleAccumulator += Math.max(0, Number(dt) || 0);
    if (matchDiagnostics.sampleAccumulator < DIAGNOSTIC_SAMPLE_INTERVAL) return;
    matchDiagnostics.sampleAccumulator %= DIAGNOSTIC_SAMPLE_INTERVAL;
    diagnosticCaptureSample();
  }

  function diagnosticRecordDamage(attacker, target, damage, hit = null) {
    if (!matchDiagnostics || !attacker || !target) return null;
    const zone = typeof levelZoneAt === 'function' ? levelZoneAt(target.x, target.y)?.short || 'UNKNOWN' : 'UNKNOWN';
    const entry = diagnosticZoneAggregate(zone);
    const team = entry.teams[diagnosticTeamKey(attacker.team)];
    const amount = Math.max(0, Number(damage) || 0);
    entry.damage += amount;
    entry.hits++;
    team.damage += amount;
    team.hits++;
    if (hit?.headshot) { entry.headshots++; team.headshots++; }
    if (hit?.critical) { entry.criticalHits++; team.criticalHits++; }
    entry.armourAbsorbed = (Number(entry.armourAbsorbed) || 0) + Math.max(0, Number(hit?.armourAbsorbed) || 0);
    entry.armourIntegrityLost = (Number(entry.armourIntegrityLost) || 0) + Math.max(0, Number(hit?.armourIntegrityLost) || 0);
    entry.armourBreaks = (Number(entry.armourBreaks) || 0) + (hit?.armourBroken ? 1 : 0);
    team.armourAbsorbed = (Number(team.armourAbsorbed) || 0) + Math.max(0, Number(hit?.armourAbsorbed) || 0);
    team.armourIntegrityLost = (Number(team.armourIntegrityLost) || 0) + Math.max(0, Number(hit?.armourIntegrityLost) || 0);
    team.armourBreaks = (Number(team.armourBreaks) || 0) + (hit?.armourBroken ? 1 : 0);
    return entry;
  }

  function diagnosticRecordElimination(victim, killer, hit = null) {
    const zone = typeof levelZoneAt === 'function' ? levelZoneAt(victim.x, victim.y)?.short || 'UNKNOWN' : 'UNKNOWN';
    const entry = diagnosticZoneAggregate(zone);
    if (entry) {
      entry.eliminations++;
      entry.deaths++;
      if (killer) entry.teams[diagnosticTeamKey(killer.team)].eliminations++;
      if (victim) entry.teams[diagnosticTeamKey(victim.team)].deaths++;
    }
    if (killer) diagnosticLogEvent('elimination', killer, {
      victim: diagnosticBotIdentity(victim),
      critical: Boolean(hit?.critical),
      headshot: Boolean(hit?.headshot),
      damage: diagnosticRound(hit?.damage || 0),
      zone
    });
  }

  function diagnosticRecordPathFailure(bot, goal, failures) {
    diagnosticLogEvent('path_failed', bot, { goal: goal ? { x: diagnosticRound(goal.x), y: diagnosticRound(goal.y) } : null, failures: Number(failures) || 0 });
  }

  function diagnosticRecordBlockedShot(bot, target, reason, blocker = null) {
    diagnosticLogEvent(reason === 'operator' ? 'operator_blocked_shot' : 'blocked_shot', bot, {
      target: target?.name || null,
      reason,
      blocker: blocker ? diagnosticBotIdentity(blocker) : null
    });
  }

  function diagnosticRecordRecovery(bot, type, details = {}) {
    diagnosticLogEvent(type || 'navigation_recovery', bot, details);
  }

  function diagnosticRecordWeaponFlank(bot, target, goal) {
    diagnosticLogEvent('weapon_range_flank', bot, {
      target: target?.name || null,
      targetDistance: target ? diagnosticRound(dist(bot, target)) : null,
      weapon: diagnosticBotIdentity(bot)?.weapon || null,
      goal: goal ? { x: diagnosticRound(goal.x), y: diagnosticRound(goal.y) } : null
    });
  }

  function diagnosticRoundStarted() {
    diagnosticEnsureMatch();
    diagnosticLogEvent('round_started', null, {
      round: roundNumber,
      score: [blueScore, redScore],
      engagementPlan: currentEngagementPlan ? { id: currentEngagementPlan.id, name: currentEngagementPlan.name, zone: currentEngagementPlan.zone || null } : null,
      doors: typeof doorStateSnapshot === 'function' ? doorStateSnapshot() : []
    });
    diagnosticCaptureSample(true);
  }

  function diagnosticRoundFinished(winner, reason) {
    diagnosticLogEvent('round_finished', null, {
      winner: winner === TEAM_BLUE || winner === TEAM_RED ? winner : null,
      reason: String(reason || ''),
      score: [blueScore, redScore]
    });
    diagnosticCaptureSample(true);
  }

  function diagnosticEventCounts(events = []) {
    return events.reduce((counts, event) => {
      counts[event.type] = (counts[event.type] || 0) + 1;
      return counts;
    }, {});
  }

  function diagnosticAggregateSummary(aggregate) {
    const samples = Math.max(1, aggregate.samples);
    const targetSamples = Math.max(1, aggregate.targetSamples);
    const sortedZones = Object.entries(aggregate.zoneCounts).sort((a, b) => b[1] - a[1]);
    const sortedModes = Object.entries(aggregate.modeCounts).sort((a, b) => b[1] - a[1]);
    return {
      ...aggregate.identity,
      samples: aggregate.samples,
      averageTargetDistance: aggregate.targetSamples ? diagnosticRound(aggregate.targetDistanceTotal / targetSamples) : null,
      effectiveRangePercent: aggregate.targetSamples ? diagnosticRound(aggregate.effectiveRangeSamples / targetSamples * 100, 1) : null,
      movementDistance: diagnosticRound(aggregate.movementDistance),
      stationaryPercent: diagnosticRound(aggregate.stationarySamples / samples * 100, 1),
      crouchedStationaryPercent: diagnosticRound(aggregate.crouchedStationarySamples / samples * 100, 1),
      pathChanges: aggregate.pathChanges,
      targetChanges: aggregate.targetChanges,
      tacticalChanges: aggregate.tacticalChanges,
      kills: aggregate.kills,
      deaths: aggregate.deaths,
      blockedShots: aggregate.blockedShots,
      recoveries: aggregate.recoveries,
      flankRoutes: aggregate.flankRoutes,
      weaponSwitches: aggregate.weaponSwitches,
      sidearmDraws: aggregate.sidearmDraws,
      primaryZone: sortedZones[0]?.[0] || null,
      primaryState: sortedModes[0]?.[0] || null,
      zoneUsage: Object.fromEntries(sortedZones),
      stateUsage: Object.fromEntries(sortedModes)
    };
  }

  function diagnosticBuildSummary(winner = null) {
    const state = matchDiagnostics;
    if (!state) return null;
    const counters = diagnosticCountersSnapshot();
    const counterDeltas = Object.fromEntries(Object.entries(counters).map(([key, value]) => [key, value - (Number(state.countersAtStart?.[key]) || 0)]));
    const operators = Object.values(state.aggregates).map(diagnosticAggregateSummary);
    const zoneAnalytics = diagnosticZoneAnalyticsSummary(state);
    const durationSeconds = diagnosticRound(simulationClock - state.startSimulationTime);
    return {
      matchId: state.matchId,
      build: BUILD_ID,
      arena: state.context.arena,
      competition: state.context.competition,
      club: state.context.club,
      opponent: state.context.opponent,
      tactics: state.context.tactics,
      startedAt: state.context.startedAt,
      completedAt: new Date().toISOString(),
      durationSeconds,
      winner: winner === TEAM_BLUE || winner === TEAM_RED ? winner : null,
      score: [blueScore, redScore],
      rounds: roundNumber,
      eventCounts: Object.keys(state.eventCounts || {}).length ? { ...state.eventCounts } : diagnosticEventCounts(diagnosticOrderedEvents(state)),
      eventOverflowCount: Number(state.eventOverflowCount) || 0,
      counterDeltas,
      performance: diagnosticBuildPerformanceReport(state),
      zoneAnalytics,
      fightLocation: zoneAnalytics[0]?.zone || null,
      aiStability: diagnosticAiStabilitySummary(state, operators, durationSeconds),
      operators
    };
  }

  function diagnosticStoredSummaries() {
    try {
      const parsed = JSON.parse(localStorage.getItem(DIAGNOSTIC_SUMMARY_STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function diagnosticPersistSummary(summary) {
    if (!summary) return;
    try {
      const summaries = diagnosticStoredSummaries();
      summaries.unshift(summary);
      localStorage.setItem(DIAGNOSTIC_SUMMARY_STORAGE_KEY, JSON.stringify(summaries.slice(0, DIAGNOSTIC_SUMMARY_LIMIT)));
    } catch (_) {}
  }

  function diagnosticCompleteMatch(winner) {
    if (!matchDiagnostics) return null;
    diagnosticCaptureSample(true);
    diagnosticLogEvent('match_finished', null, { winner, score: [blueScore, redScore] });
    matchDiagnostics.completed = true;
    matchDiagnostics.winner = winner;
    matchDiagnostics.completedAt = new Date().toISOString();
    matchDiagnostics.summary = diagnosticBuildSummary(winner);
    lastCompletedDiagnosticReport = diagnosticBuildExportPayload(matchDiagnostics);
    diagnosticPersistSummary(matchDiagnostics.summary);
    updateDiagnosticOverlay();
    return matchDiagnostics.summary;
  }

  function diagnosticBuildExportPayload(source = matchDiagnostics) {
    if (!source) {
      const summaries = diagnosticStoredSummaries();
      return summaries.length ? { schema: 1, build: BUILD_ID, exportedAt: new Date().toISOString(), summaryOnly: true, summary: summaries[0], performance: summaries[0]?.performance || null } : null;
    }
    const summary = source.summary || diagnosticBuildSummary(source.winner);
    return {
      schema: 1,
      build: BUILD_ID,
      exportedAt: new Date().toISOString(),
      rollingWindowSeconds: DIAGNOSTIC_ROLLING_SECONDS,
      matchId: source.matchId,
      completed: Boolean(source.completed),
      context: source.context,
      summary,
      performance: diagnosticBuildPerformanceReport(source),
      runtimeFaults: typeof runtimeFaultSnapshot === 'function' ? runtimeFaultSnapshot() : [],
      eventRetention: { maximumEvents: DIAGNOSTIC_MAX_EVENTS, overflowCount: Number(source.eventOverflowCount) || 0 },
      events: diagnosticOrderedEvents(source).map(event => ({ ...event })),
      snapshots: diagnosticOrderedSamples(source).map(sample => ({ ...sample, bots: sample.bots.map(bot => ({ ...bot, pathNodes: Array.isArray(bot.pathNodes) ? bot.pathNodes.map(node => ({ ...node })) : [] })) }))
    };
  }

  function diagnosticExportFilename(payload) {
    const arenaId = payload?.context?.arena?.id || payload?.summary?.arena?.id || 'match';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `strikewatch-diagnostics-${arenaId}-${timestamp}.json`;
  }

  function downloadDiagnosticPayload(payload, statusLabel = 'DIAGNOSTIC REPORT EXPORTED') {
    if (!payload) {
      showStatus('NO DIAGNOSTIC DATA YET');
      return false;
    }
    try {
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const filename = diagnosticExportFilename(payload);
      anchor.href = url;
      anchor.download = filename;
      anchor.rel = 'noopener';
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      showStatus(statusLabel);
      if (matchDiagnostics && !matchDiagnostics.completed) diagnosticLogEvent('diagnostic_exported', null, { filename, samples: payload.snapshots?.length || 0, events: payload.events?.length || 0 });
      return true;
    } catch (error) {
      console.error('Diagnostic export failed', error);
      showStatus('DIAGNOSTIC EXPORT FAILED');
      return false;
    }
  }

  function exportMatchDiagnostics() {
    const payload = matchDiagnostics ? diagnosticBuildExportPayload(matchDiagnostics) : (lastCompletedDiagnosticReport || diagnosticBuildExportPayload(null));
    return downloadDiagnosticPayload(payload);
  }

  function exportLastCompletedMatchDiagnostics() {
    const payload = lastCompletedDiagnosticReport
      || (matchDiagnostics?.completed ? diagnosticBuildExportPayload(matchDiagnostics) : null)
      || diagnosticBuildExportPayload(null);
    return downloadDiagnosticPayload(payload, 'LATEST MATCH DIAGNOSTICS EXPORTED');
  }

  function diagnosticReportMarkup() {
    const summary = matchDiagnostics?.summary || lastCompletedDiagnosticReport?.summary || null;
    if (!summary) return '';
    const owned = (summary.operators || []).filter(operator => operator.team === CAREER_OWNED_TEAM);
    const rangeValues = owned.map(operator => operator.effectiveRangePercent).filter(Number.isFinite);
    const effectiveRange = rangeValues.length ? diagnosticRound(rangeValues.reduce((total, value) => total + value, 0) / rangeValues.length, 1) : null;
    const recoveries = owned.reduce((total, operator) => total + (operator.recoveries || 0), 0);
    const blocked = owned.reduce((total, operator) => total + (operator.blockedShots || 0), 0);
    const flanks = owned.reduce((total, operator) => total + (operator.flankRoutes || 0), 0);
    const routedRecoveries = Number(summary.counterDeltas?.combatApproachRoutes) || 0;
    const laneYields = Number(summary.counterDeltas?.combatYieldActions) || 0;
    const verifiedMovement = Number(summary.counterDeltas?.combatRecoverySuccesses) || 0;
    const escalations = Number(summary.counterDeltas?.combatRecoveryEscalations) || 0;
    const eventCount = Object.values(summary.eventCounts || {}).reduce((total, value) => total + (Number(value) || 0), 0);
    const topZone = Array.isArray(summary.zoneAnalytics) ? summary.zoneAnalytics[0] : null;
    const stability = summary.aiStability || null;
    const rangeLabel = effectiveRange === null ? 'NO CONTACT DATA' : `${effectiveRange}%`;
    const unresolvedPressure = Math.max(0, routedRecoveries - verifiedMovement);
    const teamBlocks = stability ? Number(stability.teammateMovementBlocks || 0) + Number(stability.teammateBlockedShots || 0) : blocked;
    const issue = escalations >= 4 || unresolvedPressure >= 4 ? 'COMBAT DEADLOCK PRESSURE' : teamBlocks >= 8 ? 'TEAM SPACING PRESSURE' : effectiveRange !== null && effectiveRange < 55 ? 'WEAPON-RANGE DISCIPLINE' : 'STABLE MATCH EXECUTION';
    return `<section class="career-diagnostic-summary"><header><div><span>LOCAL MATCH DIAGNOSTICS</span><strong>${escapeCareerHtml(issue)}</strong></div><small>Detailed data stays on this device. Use the small export control beside Mute for the JSON report.</small></header><div><article><span>EFFECTIVE RANGE</span><strong>${rangeLabel}</strong><small>OWNED TEAM CONTACT SAMPLES</small></article><article><span>PRIMARY FIGHT ZONE</span><strong>${escapeCareerHtml(topZone?.zone || 'NO DATA')}</strong><small>${topZone ? `${Math.round(Number(topZone.damageSharePercent) || 0)}% OF MATCH DAMAGE` : 'COMPLETE A MATCH'}</small></article><article><span>PATH CHURN</span><strong>${stability ? Number(stability.pathChangesPerOperatorMinute || 0).toFixed(1) : '—'}</strong><small>CHANGES PER OPERATOR-MINUTE</small></article><article><span>TEAM BLOCKS</span><strong>${teamBlocks}</strong><small>MOVEMENT AND FIRING-LANE CONFLICTS</small></article><article><span>FLANK ROUTES</span><strong>${flanks}</strong><small>WEAPON-AWARE REPOSITIONS</small></article><article><span>EVENTS CAPTURED</span><strong>${eventCount}</strong><small>${summary.eventOverflowCount ? `${summary.eventOverflowCount} OLDER EVENTS TRIMMED` : 'FULL RETAINED EVENT SET'}</small></article></div></section>`;
  }

  function selectedDiagnosticBot() {
    return bots[spectatorIndex] || bots.find(bot => bot.alive && bot.team === CAREER_OWNED_TEAM) || bots[0] || null;
  }

  function updateDiagnosticOverlay(sample = null) {
    if (!diagnosticOverlayEl) return;
    diagnosticOverlayEl.hidden = !diagnosticOverlayVisible;
    diagnosticOverlayEl.setAttribute('aria-hidden', diagnosticOverlayVisible ? 'false' : 'true');
    if (!diagnosticOverlayVisible) return;
    const bot = selectedDiagnosticBot();
    if (!bot) {
      diagnosticOverlayEl.innerHTML = '<strong>DIAGNOSTICS</strong><span>NO ACTIVE OPERATOR</span>';
      return;
    }
    const state = sample?.bots?.find(item => item.key === diagnosticBotKey(bot)) || diagnosticCompactBotState(bot);
    const pathGoal = state.pathGoal ? `${state.pathGoal.x}, ${state.pathGoal.y}` : 'NONE';
    const target = state.target ? `${state.target} · ${state.targetDistance}M` : 'NONE';
    const orderedEvents = diagnosticOrderedEvents(matchDiagnostics);
    const lastTargetEvent = orderedEvents.length ? [...orderedEvents].reverse().find(event => event.type === 'target_changed' && event.actor?.key === state.key) : null;
    const lastBlockedEvent = orderedEvents.length ? [...orderedEvents].reverse().find(event => ['operator_blocked_shot','blocked_shot'].includes(event.type) && event.actor?.key === state.key) : null;
    const targetReason = lastTargetEvent?.details?.reason || (state.target ? 'CURRENT VISIBLE PRIORITY' : 'NO ACTIVE TARGET');
    const plan = `${state.role || 'FLEX'} · ${careerState?.tactics?.engagementId || 'mixed'} / ${careerState?.tactics?.priorityId || 'trade'}`;
    const lineState = lastBlockedEvent && simulationClock - (matchDiagnostics.startSimulationTime + lastBlockedEvent.time) < 4 ? String(lastBlockedEvent.details?.reason || 'BLOCKED').toUpperCase() : 'CLEAR';
    const blockerState = state.combatBlocker ? `${state.combatBlocker} · ${state.combatBlockerType || 'traffic'}` : 'CLEAR';
    diagnosticOverlayEl.innerHTML = `<header><span>LIVE AI DIAGNOSTICS</span><strong>${escapeCareerHtml(state.name)}</strong></header><div><span>STATE</span><b>${escapeCareerHtml(state.state || 'IDLE')}</b></div><div><span>ROLE / PLAN</span><b>${escapeCareerHtml(plan.toUpperCase())}</b></div><div><span>TARGET</span><b>${escapeCareerHtml(target)}</b></div><div><span>TARGET WHY</span><b>${escapeCareerHtml(targetReason.replaceAll('_', ' ').toUpperCase())}</b></div><div><span>WEAPON RANGE</span><b>${state.weaponRange}M · PREF ${state.preferredRange}M</b></div><div><span>GOAL / PATH</span><b>${escapeCareerHtml(pathGoal)} · ${state.pathLength} NODES</b></div><div><span>VISIBLE / MEMORY</span><b>${state.visibleEnemies} / ${state.rememberedEnemies}</b></div><div><span>BLOCKER / STAGE</span><b>${escapeCareerHtml(blockerState)} · ${state.combatRecoveryStage}</b></div><div><span>LINE / RECOVERY</span><b>${escapeCareerHtml(lineState)} · ${state.navigationRecoveries}</b></div><div><span>STUCK / CROUCH</span><b>${state.stuckTimer}S / ${state.crouchStationaryTimer}S</b></div><small>${escapeCareerHtml(state.combatApproachReason || state.tacticalReason || 'No tactical override')}</small>`;
  }

  function setDiagnosticOverlayVisible(visible) {
    diagnosticOverlayVisible = Boolean(visible);
    if (diagnosticOverlayVisible && typeof tacticalMinimapVisible !== 'undefined' && tacticalMinimapVisible && typeof setTacticalMinimapVisible === 'function') setTacticalMinimapVisible(false, false);
    document.body.dataset.diagnostics = diagnosticOverlayVisible ? 'visible' : 'hidden';
    updateDiagnosticOverlay();
    showStatus(diagnosticOverlayVisible ? 'LIVE DIAGNOSTICS ON' : 'LIVE DIAGNOSTICS OFF');
    return diagnosticOverlayVisible;
  }

  function toggleDiagnosticOverlay() {
    return setDiagnosticOverlayVisible(!diagnosticOverlayVisible);
  }
