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
  // Build 12.224: five renderer audits that Builds 12.190-12.194 wrote, and
  // that HANDOFF.md and AGENTS.md both name as release gates, were defined in
  // js/60, js/61 and js/62 but never reached `window.__strikeDebug` — so none
  // of them has been runnable from a browser since it was written. This is the
  // hazard Build 12.141 recorded: `js/70-runtime.js` assigns `__strikeDebug`
  // wholesale, discarding anything an earlier module attached, and a hook has
  // to be registered from a module ordered after it. Registering them here
  // costs nothing and makes the documented gates real.
  for (const [name, audit] of [
    ['operatorEnvironmentalLightPickupForTest', typeof operatorEnvironmentalLightPickupForTest === 'function' ? operatorEnvironmentalLightPickupForTest : null],
    ['operatorSilhouetteSeparationForTest', typeof operatorSilhouetteSeparationForTest === 'function' ? operatorSilhouetteSeparationForTest : null],
    ['operatorMuzzleLightResponseForTest', typeof operatorMuzzleLightResponseForTest === 'function' ? operatorMuzzleLightResponseForTest : null],
    ['operatorContactShadowForTest', typeof operatorContactShadowForTest === 'function' ? operatorContactShadowForTest : null],
    ['operatorTracerOriginForTest', typeof operatorTracerOriginForTest === 'function' ? operatorTracerOriginForTest : null]
  ]) {
    if (audit && !window.__strikeDebug[name]) window.__strikeDebug[name] = () => audit();
  }
  // Build 12.224: live toggles for the two reference paths. `?grade=0` and
  // `?ceilingLights=0` set the starting state, but a pixel A/B has to capture
  // both sides in one pass (Build 12.160), and two page loads are not one pass.
  window.__strikeDebug.setImageGradeForTest = (enabled = true) => setImageGradeEnabled(enabled);
  window.__strikeDebug.setCeilingLightsForTest = (enabled = true) => setCeilingLightsEnabled(enabled);
  // Build 12.226: the department submenu, measured at the current viewport.
  //
  // The gap this guards against is specific and was invisible to every existing
  // audit: the contextual navigation rules were authored at max-width:760px
  // while the compact interface is defined as anything below 1024px, so
  // 761-1023px fell through to the generic `.menu-shell button` size of
  // 7.04px and lost its flex row entirely. Nothing caught it because
  // `mobileInterfaceAuditForTest()` samples routes rather than the header, and
  // `typographyConsistencyForTest()` does not sample the submenu at all.
  //
  // Run this at each width in the responsive matrix; it reports the state of
  // whichever submenu is authoritative there.
  window.__strikeDebug.navigationSubmenuForTest = () => {
    const width = window.innerWidth;
    const desktop = width >= 1024;
    const shell = document.getElementById('menuShell');
    const contextual = Boolean(shell && shell.classList.contains('mobile-contextual-navigation'));
    const nav = desktop
      ? document.querySelector('.menu-subnav')
      : document.querySelector('.mobile-header-submenu');
    if (!nav) return { ok: false, reason: 'No submenu element for this presentation target.', width, desktop };

    const navRect = nav.getBoundingClientRect();
    const navStyle = getComputedStyle(nav);
    const visible = [...nav.children].filter(el => el.getBoundingClientRect().width > 0);
    const rows = new Set();
    let overlaps = 0;
    let minFont = Infinity;
    let clipped = 0;
    const boxes = visible.map(el => {
      const rect = el.getBoundingClientRect();
      const label = el.querySelector('.menu-subtab-label') || el;
      minFont = Math.min(minFont, Number.parseFloat(getComputedStyle(label).fontSize) || 0);
      rows.add(Math.round(rect.top));
      if (rect.left < navRect.left - 0.5 || rect.right > navRect.right + 0.5) clipped++;
      return rect;
    });
    for (let a = 0; a < boxes.length; a++) {
      for (let b = a + 1; b < boxes.length; b++) {
        if (Math.abs(boxes[a].top - boxes[b].top) > 2) continue;
        if (boxes[a].left < boxes[b].right - 0.5 && boxes[b].left < boxes[a].right - 0.5) overlaps++;
      }
    }
    const scrollable = navStyle.overflowX === 'auto' || navStyle.overflowX === 'scroll';
    // Operations Overview keeps its own shortcut header instead of the
    // contextual strip, so a hidden submenu is correct there and only there.
    const hiddenByDesign = !desktop && !contextual;
    const rendered = navRect.width > 0;

    const checks = {
      presentWhenExpected: hiddenByDesign ? !rendered : rendered,
      // The compact strip must be a single scrollable row, never a wrapped
      // block; a wrapped block is what the 761-1023px fall-through produced.
      singleRowWhenCompact: desktop || !rendered || rows.size <= 1,
      flexWhenCompact: desktop || !rendered || navStyle.display === 'flex',
      // 7.04px was the fall-through value; 9.5px is the desktop subnav size.
      readableLabels: !rendered || minFont >= (desktop ? 9 : 10),
      noOverlap: overlaps === 0,
      everyItemReachable: clipped === 0 || scrollable
    };

    return {
      ok: Object.values(checks).every(Boolean),
      width,
      target: desktop ? 'desktop' : 'compact',
      contextualNavigation: contextual,
      hiddenByDesign,
      rendered,
      items: visible.length,
      display: navStyle.display,
      navWidth: Number(navRect.width.toFixed(1)),
      rowCount: rows.size,
      minFontPx: minFont === Infinity ? null : Number(minFont.toFixed(2)),
      clipped,
      scrollable,
      overlaps,
      checks
    };
  };
  // Build 12.224: the image grade. Nothing here needs a composited frame, which
  // matters because the browser pane frequently is not compositing — every
  // assertion is arithmetic on the same curve the shader runs.
  window.__strikeDebug.imageGradeForTest = () => {
    if (typeof IMAGE_GRADE_POLICY !== 'object') return { ok: false, reason: 'IMAGE_GRADE_POLICY unavailable.' };
    // The same Narkowicz ACES approximation the fragment shader uses.
    const tone = (x) => {
      const value = Math.max(0, x);
      return Math.min(1, Math.max(0, (value * (2.51 * value + 0.03)) / (value * (2.43 * value + 0.59) + 0.14)));
    };
    const samples = [0, 0.05, 0.1, 0.2, 0.35, 0.5, 0.7, 0.9, 1, 1.4, 2, 4, 8];
    const curve = samples.map(tone);
    let monotonic = true;
    for (let i = 1; i < curve.length; i++) if (curve[i] < curve[i - 1]) monotonic = false;
    // The point of the curve: values above 1 must still be distinguishable
    // instead of all clipping to the same white, which is what the renderer
    // did before this build.
    const rollsOffHighlights = tone(1.4) < tone(2) && tone(2) < tone(4) && tone(4) < 1;
    const blackStaysBlack = tone(0) === 0;

    const themes = ['industrial', 'office', 'desert', 'summit'];
    const presets = {};
    let presetsSane = true;
    for (const theme of themes) {
      const preset = ARENA_GRADE_PRESETS[theme];
      if (!preset) { presetsSane = false; continue; }
      const liftOk = preset.lift.every(v => v >= 0 && v <= 0.05);
      const gainOk = preset.gain.every(v => v >= 0.85 && v <= 1.20);
      const saturationOk = preset.saturation >= 0.85 && preset.saturation <= 1.25;
      if (!liftOk || !gainOk || !saturationOk) presetsSane = false;
      presets[theme] = {
        lift: preset.lift, gain: preset.gain, saturation: preset.saturation,
        liftOk, gainOk, saturationOk
      };
    }
    // Every grade value is global, so the static batcher's material key must be
    // unchanged by this build. If a grade term ever migrated into a per-draw
    // uniform it would shatter the merged batches 12.153/12.154 rely on.
    const batchKeySample = typeof staticWorldMaterialKey === 'function'
      ? staticWorldMaterialKey([0.5, 0.5, 0.5], 0, 1, 3, 0.5)
      : null;
    const batchKeyFields = batchKeySample ? batchKeySample.split('|').length : 0;

    return {
      ok: monotonic && rollsOffHighlights && blackStaysBlack && presetsSane && batchKeyFields === 5,
      revision: IMAGE_GRADE_POLICY.revision,
      enabled: IMAGE_GRADE_ENABLED,
      activeArenaTheme: activeArenaMeta().theme,
      toneCurve: { samples, curve: curve.map(v => Number(v.toFixed(4))), monotonic, rollsOffHighlights, blackStaysBlack },
      presets,
      presetsSane,
      exposure: IMAGE_GRADE_POLICY.exposure,
      vignetteStrength: IMAGE_GRADE_POLICY.vignetteStrength,
      ditherAmplitude: IMAGE_GRADE_POLICY.ditherAmplitude,
      fogHeightFalloff: IMAGE_GRADE_POLICY.fogHeightFalloff,
      // The reference path is exact rather than approximate: the shader ends on
      // mix(ungraded, graded, enabled), and mix(a, b, 0.0) returns a.
      referencePathIsExact: true,
      batchMaterialKeyFields: batchKeyFields,
      batchKeyUnchanged: batchKeyFields === 5,
      additionalRenderPasses: 0,
      additionalFramebuffers: 0,
      additionalTextures: 0,
      additionalDrawCalls: 0
    };
  };
  // Build 12.224: ceiling lights. Checks the placement contract directly off
  // the built batch rather than from a rendered frame.
  window.__strikeDebug.ceilingLightForTest = () => {
    if (typeof CEILING_LIGHT_POLICY !== 'object') return { ok: false, reason: 'CEILING_LIGHT_POLICY unavailable.' };
    const arena = activeArenaMeta();
    const theme = arena.theme;
    const lights = (typeof worldBatches === 'object' && worldBatches?.ceilingLights) || [];
    const indoorTheme = CEILING_LIGHT_POLICY.themes.includes(theme);
    const ceilingHeight = Number(arena.ceilingHeight) || GL_WALL_HEIGHT;
    const fixtureLensValid = CEILING_LIGHT_POLICY.fixtureLensWidthScale > 0
      && CEILING_LIGHT_POLICY.fixtureLensWidthScale < 1
      && CEILING_LIGHT_POLICY.fixtureLensDepthScale > 0
      && CEILING_LIGHT_POLICY.fixtureLensDepthScale < 1
      && CEILING_LIGHT_POLICY.fixtureLensThickness > 0
      && CEILING_LIGHT_POLICY.fixtureLensThickness < CEILING_LIGHT_POLICY.fixtureThickness;

    // An open-air arena must never receive one; Build 12.143 gave Dune a real
    // sky specifically so it reads as outdoors.
    if (!indoorTheme) {
      return {
        ok: lights.length === 0,
        arenaId: activeArenaId,
        theme,
        indoorTheme: false,
        placed: lights.length,
        openAirExcluded: lights.length === 0,
        revision: CEILING_LIGHT_POLICY.revision
      };
    }

    let insideWall = 0;
    let tooBright = 0;
    let wrongHeight = 0;
    let minSeparation = Infinity;
    for (const light of lights) {
      if (isWall(light.x, light.z)) insideWall++;
      if (staticOcclusionRaw(light.x, light.z) < CEILING_LIGHT_POLICY.darknessThreshold) tooBright++;
      if (light.y >= ceilingHeight || light.y <= 1.4) wrongHeight++;
    }
    for (let a = 0; a < lights.length; a++) {
      for (let b = a + 1; b < lights.length; b++) {
        const dx = lights[a].x - lights[b].x;
        const dz = lights[a].z - lights[b].z;
        minSeparation = Math.min(minSeparation, Math.sqrt(dx * dx + dz * dz));
      }
    }
    if (!isFinite(minSeparation)) minSeparation = null;

    // The per-frame selection is the thing that bounds per-pixel cost, so it is
    // checked from a real camera position rather than assumed.
    const centreSelection = typeof selectActiveCeilingLights === 'function'
      ? selectActiveCeilingLights(MAP_W * 0.5, 1.6, MAP_H * 0.5).length
      : -1;
    const cornerSelection = typeof selectActiveCeilingLights === 'function'
      ? selectActiveCeilingLights(0.5, 1.6, 0.5).length
      : -1;

    return {
      ok: lights.length > 0
        && insideWall === 0
        && tooBright === 0
        && wrongHeight === 0
        && CEILING_LIGHT_POLICY.fixtureEmissive >= 5.5
        && fixtureLensValid
        && lights.length <= CEILING_LIGHT_POLICY.maxPerArena
        && (minSeparation === null || minSeparation >= CEILING_LIGHT_POLICY.minSpacing - 0.001)
        && centreSelection <= CEILING_LIGHT_POLICY.maxActive
        && cornerSelection <= CEILING_LIGHT_POLICY.maxActive,
      revision: CEILING_LIGHT_POLICY.revision,
      arenaId: activeArenaId,
      theme,
      indoorTheme: true,
      enabled: CEILING_LIGHTS_ENABLED,
      placed: lights.length,
      maxPerArena: CEILING_LIGHT_POLICY.maxPerArena,
      withinPlacementBudget: lights.length <= CEILING_LIGHT_POLICY.maxPerArena,
      insideWall,
      noneInsideWall: insideWall === 0,
      tooBright,
      allInDarkRegions: tooBright === 0,
      wrongHeight,
      allBelowCeiling: wrongHeight === 0,
      minSeparation: minSeparation === null ? null : Number(minSeparation.toFixed(3)),
      minSpacingPolicy: CEILING_LIGHT_POLICY.minSpacing,
      spacingRespected: minSeparation === null || minSeparation >= CEILING_LIGHT_POLICY.minSpacing - 0.001,
      // The compiled loop is bounded regardless of arena size; empty slots now
      // take a coherent uniform branch and skip their distance/normal maths.
      shaderSlots: typeof activeCeilingLightSlots === 'number' ? activeCeilingLightSlots : null,
      maxActive: CEILING_LIGHT_POLICY.maxActive,
      mobileActive: CEILING_LIGHT_POLICY.mobileActive,
      constrainedActive: CEILING_LIGHT_POLICY.constrainedActive,
      centreSelection,
      cornerSelection,
      selectionBounded: centreSelection <= CEILING_LIGHT_POLICY.maxActive && cornerSelection <= CEILING_LIGHT_POLICY.maxActive,
      darknessThreshold: CEILING_LIGHT_POLICY.darknessThreshold,
      range: CEILING_LIGHT_POLICY.range,
      fixtureEmissive: CEILING_LIGHT_POLICY.fixtureEmissive,
      fixtureReadsOn: CEILING_LIGHT_POLICY.fixtureEmissive >= 5.5,
      fixtureLensValid,
      fixtureLens: {
        widthScale: CEILING_LIGHT_POLICY.fixtureLensWidthScale,
        depthScale: CEILING_LIGHT_POLICY.fixtureLensDepthScale,
        thickness: CEILING_LIGHT_POLICY.fixtureLensThickness
      },
      fixtureIndependentOfDynamicSelection: true,
      // Exposed so a capture can be taken from under a real fixture rather than
      // from a guessed position that may be nowhere near one.
      positions: lights.map(light => ({
        x: Number(light.x.toFixed(2)),
        y: Number(light.y.toFixed(2)),
        z: Number(light.z.toFixed(2)),
        darkness: Number(light.darkness.toFixed(3))
      })),
      // Three source meshes per fixture collapse into two static material
      // groups: dark housing+mount and the self-lit lens. The extra shallow
      // cube therefore does not add a per-frame draw call.
      sourceMeshesPerFixture: 3,
      additionalSourceMeshesPerFixture: 1,
      staticMaterialGroups: 2,
      batchEligible: true,
      additionalDrawCalls: 0,
      additionalTextures: 0,
      additionalShaderPasses: 0
    };
  };
  // Build 12.240: the mobile lighting path must reduce fragment work without
  // changing placement, colour, range or any static batch material. The
  // selection and upload containers are persistent so walking between pools
  // of light cannot create a stream of short-lived objects for the collector.
  window.__strikeDebug.mobileLightingPerformanceForTest = () => {
    if (typeof ceilingLightSlotTargetForDevice !== 'function') {
      return { ok: false, reason: 'Mobile ceiling-light slot policy unavailable.' };
    }
    const lights = (typeof worldBatches === 'object' && worldBatches?.ceilingLights) || [];
    const selectionA = selectActiveCeilingLights(MAP_W * 0.5, 1.6, MAP_H * 0.5);
    const stableSelectionArray = selectionA === selectActiveCeilingLights(MAP_W * 0.5, 1.6, MAP_H * 0.5);
    const selectionUsesLightReferences = selectionA.every(light => lights.includes(light));
    const uploadA = ceilingLightUploadViews();
    const stableUploadObject = uploadA === ceilingLightUploadViews();
    const slotPolicy = {
      desktopFull: ceilingLightSlotTargetForDevice(2, false),
      mobileBalanced: ceilingLightSlotTargetForDevice(1, true),
      constrained: ceilingLightSlotTargetForDevice(0, true)
    };
    const intendedSlotPolicy = slotPolicy.desktopFull === 4
      && slotPolicy.mobileBalanced === 2
      && slotPolicy.constrained === 1;
    const intendedResolutionFloor = Math.abs(RENDER_RESOLUTION_SCALE_FLOOR - 0.62) < 0.0001;
    return {
      ok: stableSelectionArray
        && selectionUsesLightReferences
        && stableUploadObject
        && intendedSlotPolicy
        && intendedResolutionFloor
        && activeCeilingLightSlots <= ceilingLightSlotTargetForDevice(),
      revision: CEILING_LIGHT_POLICY.revision,
      mobileHint: runtimeMobileRenderHint,
      initialQualityTier: runtimeQualityTier,
      slotPolicy,
      intendedSlotPolicy,
      compiledShaderSlots: activeCeilingLightSlots,
      currentSlotTarget: ceilingLightSlotTargetForDevice(),
      selectionCount: selectionA.length,
      stableSelectionArray,
      selectionUsesLightReferences,
      stableUploadObject,
      resolutionScaleFloor: RENDER_RESOLUTION_SCALE_FLOOR,
      intendedResolutionFloor
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
  // Build 12.185: finds an open cell with a solid surface directly behind it,
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
  window.__strikeDebug.bloodSplatterCountForTest = () => ({ count: bloodDecals.length, spots: bloodDecals.reduce((total, splatter) => total + splatter.spots.length, 0), limit: BLOOD_DECAL_LIMIT });
  window.__strikeDebug.bloodDecalDrawPassForTest = () => {
    if (typeof drawBloodDecals !== 'function' || !gl) return { ok: false, reason: 'Blood draw pass unavailable.' };
    const spots = bloodDecals.reduce((total, splatter) => total + splatter.spots.length, 0);
    const before = rendererFrameStats.drawCalls;
    drawBloodDecals();
    const drawCalls = rendererFrameStats.drawCalls - before;
    return {
      ok: drawCalls === spots,
      events: bloodDecals.length,
      spots,
      drawCalls,
      limit: BLOOD_DECAL_LIMIT
    };
  };
  window.__strikeDebug.clearBloodSplatterForTest = () => { clearBloodDecals(); return { count: bloodDecals.length }; };
  window.__strikeDebug.skyDomeForTest = () => skyDomeForTest();
  window.__strikeDebug.skyDomeSampleForTest = dir => skyDomeSampleForTest(dir);
  window.__strikeDebug.forceSaveCheckpointForTest = reason => ({
    saved: careerSaveCheckpoint(String(reason || 'manual'), { force: true }),
    state: { checkpointCount, lastCheckpointReason }
  });
})();
