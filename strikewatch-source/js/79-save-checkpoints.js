// Build 12.141: career save checkpoints.
//
// Earned Gold Coins could be lost by closing the browser after returning to
// HQ. `exitToMainMenu()` calls `createMatch()` and drops straight back to the
// menu without writing a save, and nothing wrote one when the tab was closed
// or backgrounded, so anything banked into `careerState` since the last
// explicit save went with it.
//
// Progress is now written at the points where the manager reasonably believes
// it is safe: leaving a match for HQ, any match/free-roam to menu transition,
// and the browser being hidden or closed. End Day already saved through
// `advanceCareerDay()` and is left alone.

(() => {
  // Rapid transitions (exitToMainMenu also drives setAppState) must not write
  // the same state repeatedly. A short floor keeps one save per checkpoint
  // without risking a missed write.
  const CHECKPOINT_FLOOR_MS = 400;
  let lastCheckpointAt = 0;
  let checkpointCount = 0;
  let lastCheckpointReason = '';

  function careerSaveCheckpoint(reason, options = {}) {
    if (!careerState?.created) return false;
    // A rejected write must still be retried at the next checkpoint, so a
    // failed save does not update the floor.
    const now = Date.now();
    if (options.force !== true && now - lastCheckpointAt < CHECKPOINT_FLOOR_MS) return false;
    const saved = saveCareerState({ reason: `checkpoint:${reason}` }) !== false;
    if (saved) {
      lastCheckpointAt = now;
      checkpointCount += 1;
      lastCheckpointReason = String(reason || '');
    }
    return saved;
  }

  const baseSetAppStateForCheckpoints = setAppState;
  setAppState = function setAppStateWithCheckpoint(nextState) {
    const previousState = appState;
    const result = baseSetAppStateForCheckpoints(nextState);
    // Returning to HQ from a match or free roam is the moment the manager
    // treats their winnings as banked.
    if (nextState === 'menu' && (previousState === 'match' || previousState === 'free-roam')) {
      careerSaveCheckpoint('return-to-hq');
    }
    return result;
  };

  if (typeof exitToMainMenu === 'function') {
    const baseExitToMainMenuForCheckpoints = exitToMainMenu;
    exitToMainMenu = function exitToMainMenuWithCheckpoint() {
      const result = baseExitToMainMenuForCheckpoints();
      careerSaveCheckpoint('exit-to-hq');
      return result;
    };
  }

  // Closing, backgrounding or navigating away. `pagehide` is the reliable
  // signal on iOS Safari, where `beforeunload` is unreliable; `visibilitychange`
  // covers tab switches and app backgrounding. localStorage is synchronous, so
  // the write completes inside the handler.
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') careerSaveCheckpoint('page-hidden', { force: true });
  });
  window.addEventListener('pagehide', () => careerSaveCheckpoint('page-hide', { force: true }));

  window.__strikeDebug = window.__strikeDebug || {};
  window.__strikeDebug.saveCheckpointForTest = () => ({
    checkpointCount,
    lastCheckpointReason,
    lastCheckpointAt
  });
  // The crate canvas is created without preserveDrawingBuffer, so its rotation
  // cannot be confirmed by reading pixels back. Expose the live pose instead.
  // Registered here because 70-runtime.js reassigns window.__strikeDebug
  // wholesale, discarding anything an earlier module attached.
  window.__strikeDebug.crateSpinForTest = () => ({
    yaw: Number(rewardRendererState.yaw.toFixed(4)),
    targetYaw: Number(rewardRendererState.targetYaw.toFixed(4)),
    spinBase: Number(rewardRendererState.spinBase.toFixed(4)),
    dragging: rewardRendererState.dragging
  });
  // Registered here for the same reason as the crate hook: 70-runtime.js
  // reassigns window.__strikeDebug wholesale.
  // Forces a frame and reads it back in the same task so surface quality can be
  // measured objectively. The canvas has no preserveDrawingBuffer, so a sample
  // taken after the frame is presented comes back empty.
  window.__strikeDebug.arenaSurfaceSampleForTest = (fx = 0.55, fy = 0.55, boxW = 140, boxH = 110) => {
    if (typeof render !== 'function' || !gl) return { ok: false, reason: 'Renderer not reachable.' };
    render(performance.now());
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    const x0 = Math.max(0, Math.min(w - boxW, Math.floor(w * fx)));
    const y0 = Math.max(0, Math.min(h - boxH, Math.floor(h * fy)));
    const buffer = new Uint8Array(boxW * boxH * 4);
    gl.readPixels(x0, y0, boxW, boxH, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
    const luminance = [];
    for (let i = 0; i < boxW * boxH; i++) {
      luminance.push(0.2126 * buffer[i * 4] + 0.7152 * buffer[i * 4 + 1] + 0.0722 * buffer[i * 4 + 2]);
    }
    const mean = luminance.reduce((a, v) => a + v, 0) / luminance.length;
    const variance = luminance.reduce((a, v) => a + (v - mean) * (v - mean), 0) / luminance.length;
    // Mean absolute difference between horizontally adjacent pixels. Random
    // per-patch noise drives this up; structured masonry keeps it low except
    // at the mortar joints.
    let adjacent = 0;
    let pairs = 0;
    for (let y = 0; y < boxH; y++) {
      for (let x = 1; x < boxW; x++) {
        adjacent += Math.abs(luminance[y * boxW + x] - luminance[y * boxW + x - 1]);
        pairs++;
      }
    }
    return {
      ok: true,
      meanLuminance: Number(mean.toFixed(2)),
      stdDev: Number(Math.sqrt(variance).toFixed(3)),
      meanAdjacentDelta: Number((adjacent / Math.max(1, pairs)).toFixed(4)),
      samples: boxW * boxH
    };
  };
  // Forces a frame and reports the renderer's own counters. The published
  // body dataset only refreshes on a countdown and stalls when the animation
  // frame is throttled, so it cannot be used to compare builds.
  window.__strikeDebug.rendererFrameStatsForTest = (frames = 3) => {
    if (typeof render !== 'function') return { ok: false, reason: 'Renderer not reachable.' };
    let last = null;
    for (let i = 0; i < Math.max(1, frames); i++) {
      render(performance.now() + i * 16);
      last = { ...rendererFrameStats };
    }
    return { ok: true, ...last };
  };
  window.__strikeDebug.dynamicActorCullingForTest = () => {
    const savedView = new Float32Array(glView);
    const savedProjection = new Float32Array(glProjection);
    const savedCandidates = rendererFrameStats.dynamicActorCandidates;
    const savedCulled = rendererFrameStats.dynamicActorsCulled;
    try {
      mat4LookAt(glView, [0, 1, 0], [0, 1, -1], [0, 1, 0]);
      mat4Perspective(glProjection, Math.PI / 3, 16 / 9, 0.025, GL_FAR);
      rendererFrameStats.dynamicActorCandidates = 0;
      rendererFrameStats.dynamicActorsCulled = 0;
      const cases = {
        centred: dynamicActorOutsideCameraView(0, 1, -6, 1.85),
        edgeGuard: dynamicActorOutsideCameraView(5, 1, -6, 1.85),
        behind: dynamicActorOutsideCameraView(0, 1, 6, 1.85),
        farSide: dynamicActorOutsideCameraView(30, 1, -6, 1.85),
        beyondFar: dynamicActorOutsideCameraView(0, 1, -(GL_FAR + 4), 1.85)
      };
      return {
        ok: !cases.centred && !cases.edgeGuard && cases.behind && cases.farSide && cases.beyondFar,
        enabled: DYNAMIC_ACTOR_CULLING_ENABLED,
        cases,
        candidates: rendererFrameStats.dynamicActorCandidates,
        culled: rendererFrameStats.dynamicActorsCulled,
        conservativeRadius: 1.85
      };
    } finally {
      glView.set(savedView);
      glProjection.set(savedProjection);
      rendererFrameStats.dynamicActorCandidates = savedCandidates;
      rendererFrameStats.dynamicActorsCulled = savedCulled;
    }
  };
  // Build 12.162: deterministic whole-actor frustum guard.
  // Reports the baked occlusion actually assigned to the current arena's wall
  // rectangles, so the effect can be checked directly rather than inferred from
  // a rendered viewport, which varies with whatever the camera happens to face.
  window.__strikeDebug.staticOcclusionForTest = () => {
    const walls = (typeof worldBatches === 'object' && worldBatches?.walls) || [];
    const floor = (typeof worldBatches === 'object' && worldBatches?.floorTiles) || [];
    if (!walls.length) return { ok: false, reason: 'No wall batches built.' };
    const summarise = (list, strength) => {
      const values = list.map(item => Number(item.occlusion) || 0);
      if (!values.length) return null;
      const buckets = {};
      for (const v of values) {
        const k = v.toFixed(3);
        buckets[k] = (buckets[k] || 0) + 1;
      }
      const mean = values.reduce((a, v) => a + v, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      // What the surface is actually multiplied by, which is the number that
      // decides whether any of this is visible.
      const bright = Number((1 - min * strength).toFixed(3));
      const dark = Number((1 - max * strength).toFixed(3));
      return {
        count: list.length,
        distinctLevels: Object.keys(buckets).length,
        min,
        max,
        mean: Number(mean.toFixed(4)),
        histogram: buckets,
        strength,
        brightestMultiplier: bright,
        darkestMultiplier: dark,
        contrastRange: Number(((bright - dark) * 100).toFixed(1))
      };
    };
    const wallSummary = summarise(walls, 0.42);
    const floorSummary = summarise(floor, 0.50);
    // Build 12.153: the floor carries most of the screen, so it has to be
    // reported alongside the walls. Quantisation keeps the static batcher's
    // material groups bounded on both.
    const levels = Math.max(wallSummary.distinctLevels, floorSummary ? floorSummary.distinctLevels : 0);
    return {
      ok: true,
      arenaId: activeArenaId,
      walls: wallSummary,
      floor: floorSummary,
      floorShaded: Boolean(floorSummary && floorSummary.count > 1),
      // Retained for callers written against the 12.146 shape.
      wallRects: walls.length,
      distinctLevels: wallSummary.distinctLevels,
      min: wallSummary.min,
      max: wallSummary.max,
      mean: wallSummary.mean,
      histogram: wallSummary.histogram,
      withinQuantisationBudget: levels <= 8
    };
  };
  // Build 12.155: the loadout stills. A still that renders blank would look
  // like an empty panel rather than an error, so this checks every catalogue
  // entry actually rasterises to something.
  window.__strikeDebug.loadoutStillForTest = () => loadoutStillAuditForTest();
  // Build 12.155: impact decals. Fires a miss from a known point and reports
  // where the mark landed, so the placement can be checked without needing a
  // live firefight.
  window.__strikeDebug.impactDecalForTest = (fromX = 4.5, fromZ = 4.5, toX = 30, toZ = 4.5, endHeight = 1.24, startHeight = 1.30) => {
    if (typeof spawnImpactDecal !== 'function') return { ok: false, reason: 'spawnImpactDecal unavailable' };
    const before = impactDecals.length;
    const shooter = { x: fromX, y: fromZ, crouched: false };
    const decal = spawnImpactDecal(shooter, toX, toZ, endHeight, startHeight);
    const solidBehind = decal
      ? isWall(decal.x + (decal.axis === 'x' ? 0.06 : 0), decal.z + (decal.axis === 'z' ? 0.06 : 0))
        || isWall(decal.x - (decal.axis === 'x' ? 0.06 : 0), decal.z - (decal.axis === 'z' ? 0.06 : 0))
      : false;
    return {
      ok: Boolean(decal) && (decal.axis === 'y' || solidBehind),
      arenaId: activeArenaId,
      spawned: Boolean(decal),
      decal: decal ? { x: Number(decal.x.toFixed(3)), y: Number(decal.y.toFixed(3)), z: Number(decal.z.toFixed(3)), axis: decal.axis } : null,
      restsOnSolidSurface: solidBehind || (decal ? decal.axis === 'y' : false),
      insideMap: decal ? decal.x >= 0 && decal.z >= 0 && decal.x <= MAP_W && decal.z <= MAP_H : false,
      count: impactDecals.length,
      grew: impactDecals.length > before,
      limit: IMPACT_DECAL_LIMIT
    };
  };
  window.__strikeDebug.impactDecalCountForTest = () => ({ count: impactDecals.length, limit: IMPACT_DECAL_LIMIT });
  window.__strikeDebug.clearImpactDecalsForTest = () => { clearImpactDecals(); return { count: impactDecals.length }; };
  window.__strikeDebug.skyDomeForTest = () => skyDomeForTest();
  window.__strikeDebug.skyDomeSampleForTest = dir => skyDomeSampleForTest(dir);
  window.__strikeDebug.forceSaveCheckpointForTest = reason => ({
    saved: careerSaveCheckpoint(String(reason || 'manual'), { force: true }),
    state: { checkpointCount, lastCheckpointReason }
  });
})();
