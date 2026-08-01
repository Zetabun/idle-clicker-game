/*
 * Strikewatch source module: 60-renderer-core.js
 * Purpose: WebGL setup, shaders, matrix helpers, meshes and renderer-wide state.
 *
 * This file is a source fragment. Run `python3 build.py` to regenerate
 * js/strikewatch.dev.js and the standalone release in dist/.
 */

  // ---------------------------------------------------------------------------
  // True 3D WebGL renderer. The simulation above remains authoritative; this
  // layer only visualises its map, actors, combat and spectator camera.
  // ---------------------------------------------------------------------------
  const GL_WALL_HEIGHT = 2.82;
  const GL_EYE_HEIGHT = 1.49;
  const GL_FAR = 46;
  const OPERATOR_SKIN_MATERIAL = Object.freeze({
    revision: '12.57-light-natural-skin-material-1',
    surface: 8,
    roughness: 0.64,
    ambientLift: 0.42
  });
  // Build 12.190: moving geometry keeps a restrained share of the smooth
  // room light pools so operators respond to their surroundings without
  // restoring the hard flicker and full-amplitude pulsing removed in 12.160.
  const OPERATOR_ENVIRONMENT_LIGHTING = Object.freeze({
    revision: '12.190-stable-local-pickup-1',
    localShare: 0.25,
    stableShare: 0.75,
    coolAverage: 0.34,
    warmAverage: 0.22,
    movingFlicker: 1
  });

  function operatorEnvironmentalLightPickupForTest() {
    const policy = OPERATOR_ENVIRONMENT_LIGHTING;
    const blend = (average, local) => average * policy.stableShare + local * policy.localShare;
    const coolDark = blend(policy.coolAverage, 0);
    const coolBright = blend(policy.coolAverage, 1);
    const warmDark = blend(policy.warmAverage, 0);
    const warmBright = blend(policy.warmAverage, 1);
    return {
      ok: Math.abs(policy.localShare + policy.stableShare - 1) < 0.000001
        && policy.localShare === 0.25
        && policy.movingFlicker === 1
        && coolDark < policy.coolAverage && coolBright > policy.coolAverage
        && warmDark < policy.warmAverage && warmBright > policy.warmAverage,
      revision: policy.revision,
      localShare: policy.localShare,
      stableShare: policy.stableShare,
      coolAverage: policy.coolAverage,
      warmAverage: policy.warmAverage,
      movingFlicker: policy.movingFlicker,
      staticWorldUnchanged: true,
      usesExistingLightPools: true,
      additionalDrawCalls: 0,
      additionalMeshes: 0,
      additionalTextures: 0,
      additionalShaderPasses: 0,
      additionalShaderUniforms: 0
    };
  }

  // Build 12.191: third-person operators receive a restrained neutral fill and
  // edge lift so their silhouette separates from dark arena surfaces. The mode
  // travels through the existing local-detail uniform: 0 static, 1 operator,
  // 2 viewmodel. No new render resource is introduced.
  const OPERATOR_SILHOUETTE_LIGHTING = Object.freeze({
    revision: '12.191-operator-silhouette-1',
    staticMode: 0,
    operatorMode: 1,
    viewmodelMode: 2,
    fillLift: 0.028,
    rimLift: 0.052
  });

  function operatorSilhouetteSeparationForTest() {
    const policy = OPERATOR_SILHOUETTE_LIGHTING;
    const actorWeight = mode => mode === policy.operatorMode ? 1 : 0;
    return {
      ok: policy.staticMode === 0
        && policy.operatorMode === 1
        && policy.viewmodelMode === 2
        && actorWeight(policy.operatorMode) === 1
        && actorWeight(policy.staticMode) === 0
        && actorWeight(policy.viewmodelMode) === 0
        && policy.fillLift > 0 && policy.fillLift <= 0.04
        && policy.rimLift > policy.fillLift && policy.rimLift <= 0.07,
      revision: policy.revision,
      staticMode: policy.staticMode,
      operatorMode: policy.operatorMode,
      viewmodelMode: policy.viewmodelMode,
      fillLift: policy.fillLift,
      rimLift: policy.rimLift,
      livingAndFallenOperators: true,
      viewmodelUnchanged: true,
      staticWorldUnchanged: true,
      additionalDrawCalls: 0,
      additionalMeshes: 0,
      additionalTextures: 0,
      additionalShaderPasses: 0,
      additionalShaderUniforms: 0
    };
  }

  // Build 12.193: a valid third-person muzzle flash can warm nearby opaque
  // operator materials by reusing each draw's existing colour and emissive
  // uniforms. The response is CPU-scoped to the firing operator and adds no
  // light object, shader uniform, pass, texture, mesh or draw.
  const OPERATOR_MUZZLE_LIGHT_RESPONSE = Object.freeze({
    revision: '12.193-scoped-muzzle-light-1',
    radius: 1.20,
    emissiveLift: 0.42,
    warmMix: 0.30,
    warmColour: Object.freeze([1.00, 0.42, 0.10]),
    minimumSurface: 3,
    maximumSurface: 8,
    opaqueAlpha: 0.999
  });

  const operatorMuzzleLightState = {
    active: false,
    x: 0,
    y: 0,
    z: 0,
    strength: 0
  };
  const operatorMuzzleLightColourScratch = new Float32Array(3);

  function setOperatorMuzzleLight(position, strength = 0) {
    const resolvedStrength = clamp(Number(strength) || 0, 0, 1);
    operatorMuzzleLightState.active = Boolean(position) && resolvedStrength > 0;
    operatorMuzzleLightState.x = Number(position?.x) || 0;
    operatorMuzzleLightState.y = Number(position?.y) || 0;
    operatorMuzzleLightState.z = Number(position?.z) || 0;
    operatorMuzzleLightState.strength = resolvedStrength;
    return operatorMuzzleLightState.active;
  }

  function clearOperatorMuzzleLight() {
    operatorMuzzleLightState.active = false;
    operatorMuzzleLightState.strength = 0;
  }

  function operatorMuzzleLightContribution(
    model,
    alpha = 1,
    surface = 0,
    state = operatorMuzzleLightState,
    detailMode = localSurfaceDetailMode,
    elevationOffset = renderElevationOffset
  ) {
    const policy = OPERATOR_MUZZLE_LIGHT_RESPONSE;
    if (!state?.active || (Number(state.strength) || 0) <= 0) return 0;
    if (detailMode !== OPERATOR_SILHOUETTE_LIGHTING.operatorMode) return 0;
    if (alpha < policy.opaqueAlpha) return 0;
    if (surface < policy.minimumSurface || surface > policy.maximumSurface) return 0;
    const dx = (Number(model?.[12]) || 0) - state.x;
    const dy = (Number(model?.[13]) || 0) + (Number(elevationOffset) || 0) - state.y;
    const dz = (Number(model?.[14]) || 0) - state.z;
    const distance = Math.hypot(dx, dy, dz);
    const radial = clamp(1 - distance / policy.radius, 0, 1);
    return clamp(state.strength, 0, 1) * radial * radial;
  }

  function operatorMuzzleLightResponseForTest() {
    const policy = OPERATOR_MUZZLE_LIGHT_RESPONSE;
    const modelAt = (x, y, z) => {
      const model = new Float32Array(16);
      model[12] = x;
      model[13] = y;
      model[14] = z;
      return model;
    };
    const active = { active: true, x: 0, y: 1, z: 0, strength: 1 };
    const inactive = { active: false, x: 0, y: 1, z: 0, strength: 0 };
    const near = operatorMuzzleLightContribution(modelAt(0, 1, 0), 1, 5, active, 1, 0);
    const middle = operatorMuzzleLightContribution(modelAt(policy.radius * 0.5, 1, 0), 1, 5, active, 1, 0);
    const outside = operatorMuzzleLightContribution(modelAt(policy.radius * 1.05, 1, 0), 1, 5, active, 1, 0);
    const transparent = operatorMuzzleLightContribution(modelAt(0, 1, 0), 0.92, 5, active, 1, 0);
    const shadowSurface = operatorMuzzleLightContribution(modelAt(0, 1, 0), 1, 0, active, 1, 0);
    const staticMode = operatorMuzzleLightContribution(modelAt(0, 1, 0), 1, 5, active, 0, 0);
    const viewmodelMode = operatorMuzzleLightContribution(modelAt(0, 1, 0), 1, 5, active, 2, 0);
    const noShot = operatorMuzzleLightContribution(modelAt(0, 1, 0), 1, 5, inactive, 1, 0);
    return {
      ok: policy.radius >= 1 && policy.radius <= 1.4
        && policy.emissiveLift > 0 && policy.emissiveLift <= 0.5
        && policy.warmMix > 0 && policy.warmMix <= 0.35
        && near > middle && middle > outside && outside === 0
        && transparent === 0 && shadowSurface === 0
        && staticMode === 0 && viewmodelMode === 0 && noShot === 0,
      revision: policy.revision,
      radius: policy.radius,
      emissiveLift: policy.emissiveLift,
      warmMix: policy.warmMix,
      near,
      middle,
      outside,
      transparentExcluded: transparent === 0,
      shadowExcluded: shadowSurface === 0,
      staticWorldUnchanged: staticMode === 0,
      viewmodelUnchanged: viewmodelMode === 0,
      requiresAuthoritativeShotSignal: noShot === 0,
      usesExistingColourUniform: true,
      usesExistingEmissiveUniform: true,
      additionalDrawCalls: 0,
      additionalMeshes: 0,
      additionalTextures: 0,
      additionalShaderPasses: 0,
      additionalShaderUniforms: 0,
      additionalPerDrawAllocations: 0
    };
  }

  let gl = null;
  let glProgram = null;
  let glReady = false;
  let glProjection = new Float32Array(16);
  let glView = new Float32Array(16);
  const glModel = new Float32Array(16);
  const glMeshes = {};
  const glLocations = {};
  const worldBatches = {
    walls: [], covers: [], trims: [], hazards: [], floorLines: [], lights: [],
    beams: [], wallPanels: [], vents: [], pipes: [], grates: [], signs: [],
    columns: [], bulkheads: [], ceilingPanels: [], cableTrays: [],
    conduits: [], warningLights: [], floorDecals: [], wallNumbers: [],
    floorPatches: [], floorTiles: [], laneStrips: [], wallKickPlates: [],
    zoneFloors: [], lowCeilings: [], walkways: [], railings: [], hazardZones: [],
    containers: [], machines: [], tanks: [], zoneBeacons: [], doors: [], stairs: [],
    ceilingLights: [],
    officeCourtyards: [], officeRugs: [], officeWallScreens: [], officeGlassBands: [], officeCeilingBaffles: [], officeFloorMarkings: [],
    desertCanopies: [], desertArches: [], desertBanners: [], desertMosaics: [], desertRubble: [], desertTorches: [], desertCrenels: [], desertBackdrop: []
  };
  const STATIC_WORLD_CULLING_ENABLED = (() => {
    try {
      return new URLSearchParams(window.location.search).get('staticCulling') !== '0';
    } catch (_) {
      return true;
    }
  })();
  const STATIC_WORLD_BATCHING_ENABLED = (() => {
    try {
      return new URLSearchParams(window.location.search).get('staticBatching') !== '0';
    } catch (_) {
      return true;
    }
  })();
  // Build 12.162: reject complete operator assemblies only when a generous
  // guard sphere is wholly outside the camera. `?dynamicCulling=0` is the
  // pixel-reference path and changes no simulation state.
  const DYNAMIC_ACTOR_CULLING_ENABLED = (() => {
    try {
      return new URLSearchParams(window.location.search).get('dynamicCulling') !== '0';
    } catch (_) {
      return true;
    }
  })();
  // Build 12.224: the renderer had no tone curve at all — `gl_FragColor` took
  // the lit value directly, so every highlight clipped flat at 1.0 and lost its
  // hue. Specular, emissive fixtures and muzzle flashes all went to white. The
  // grade below is the whole image-presentation layer: exposure, a filmic
  // rolloff, a per-arena lift/gain/saturation, a vignette and an output dither.
  //
  // Every value here is a PER-FRAME uniform. That is the design constraint, not
  // an accident: the static batcher groups draws by exact material
  // (`colour|emissive|alpha|surface|roughness`), so anything that varies per
  // draw would shatter the merged batches 12.153/12.154 built. A global grade
  // costs the batcher nothing.
  const IMAGE_GRADE_POLICY = Object.freeze({
    revision: '12.224.0',
    // Chosen by measurement, not by eye. The Narkowicz fit expects
    // scene-referred input where 1.0 is mid-range rather than white, so for
    // this renderer's roughly 0-1 lit values it LIFTS midtones substantially
    // (0.2 resolves to 0.30) instead of darkening them. At exposure 1.0 the
    // mean luma of a captured frame rose 44-50% in every arena, which is a
    // wholesale brightening rather than a grade. Sweeping exposure against the
    // ungraded mean luma of all four arenas puts the crossover at 0.65-0.72;
    // 0.68 holds every arena within 7% of where it was. The curve then does
    // what it is actually for — rolling highlights off with their hue intact —
    // and the ceiling lights supply the brightening, in the places chosen for
    // it, rather than the exposure lifting the whole image indiscriminately.
    exposure: 0.68,
    // Vignette is deliberately gentle. It frames the image and hides the far
    // edge of the fog band; anything stronger reads as a damaged screen.
    vignetteStrength: 0.26,
    vignetteSoftness: 0.62,
    // +/- half a code value, hash-dithered. The arena clear colour is
    // 0.028/0.044/0.056 and the scene is full of smooth gradients (fog, hemi,
    // the overhead pools, baked occlusion), which band visibly in 8-bit output.
    ditherAmplitude: 1 / 255,
    // Fog gains a height term so it settles low and thins out toward the
    // ceiling, instead of being a flat distance band at every elevation.
    fogHeightFalloff: 0.22,
    fogHeightReference: 2.6
  });

  // Per-theme grade. Arenas previously differed by geometry and fog colour
  // alone; this is what separates them as images. Lift raises the floor of the
  // blacks (toward the arena's own ambient), gain shapes the highlights, and
  // saturation is applied about luma.
  const ARENA_GRADE_PRESETS = Object.freeze({
    // Citadel: cold industrial dark. Slight blue lift, restrained saturation.
    industrial: Object.freeze({
      lift: [0.006, 0.010, 0.016], gain: [0.98, 1.00, 1.05], saturation: 1.06
    }),
    // Skyline Offices: neutral and clean, faintly green-grey like fluorescent
    // office light. Lowest saturation of the four.
    office: Object.freeze({
      lift: [0.010, 0.012, 0.012], gain: [1.00, 1.01, 0.99], saturation: 0.98
    }),
    // Dune Bastion: warm, dusty, open-air. Warm gain, black lift kept low so
    // the sky stays clean.
    desert: Object.freeze({
      lift: [0.014, 0.010, 0.005], gain: [1.06, 1.00, 0.92], saturation: 1.10
    }),
    // Aurora Terminal: bright, cold, high-key polar transit hall.
    summit: Object.freeze({
      lift: [0.008, 0.012, 0.020], gain: [0.97, 1.00, 1.07], saturation: 1.02
    })
  });

  const IMAGE_GRADE_ENABLED = (() => {
    try {
      return new URLSearchParams(window.location.search).get('grade') !== '0';
    } catch (_) {
      return true;
    }
  })();

  // The URL flag decides the starting state, but the reference path also has to
  // be reachable without a reload. Build 12.160 established that a pixel A/B is
  // only meaningful when both sides are captured back to back in one pass — a
  // comparison across two page loads produced a phantom 51% regression there.
  // Two page loads cannot be one pass, so the toggle has to be live.
  let imageGradeRuntimeEnabled = IMAGE_GRADE_ENABLED;

  function setImageGradeEnabled(enabled) {
    imageGradeRuntimeEnabled = Boolean(enabled);
    return imageGradeRuntimeEnabled;
  }

  // Build 12.224: authored ceiling lights for the roofed arenas. The shader has
  // carried procedural "overhead light pools" since well before this build, but
  // those are an infinite `fract()` grid — they are room *character*, not a
  // light in a place. These are real positional lights, placed where the map is
  // actually dark.
  //
  // Bounded on purpose, in three separate ways:
  //   1. `maxPerArena` caps how many are ever placed.
  //   2. `maxActive` caps how many reach the shader in a frame — the nearest
  //      few to the camera — so per-pixel cost is fixed no matter how large the
  //      arena is.
  //   3. `range` keeps each one local, well inside the 16-35 unit fog band.
  const CEILING_LIGHT_POLICY = Object.freeze({
    revision: '12.224.0',
    maxPerArena: 14,
    maxActive: 4,
    range: 6.4,
    // A candidate must be at least this enclosed to be worth lighting. Sampled
    // with the wall radii, where a corridor reads around 0.45-0.70 and an open
    // hall nearer 0.10-0.25.
    darknessThreshold: 0.42,
    // Minimum separation so lights do not pile into one corner of one corridor.
    minSpacing: 4.2,
    // Candidate lattice. Coarser than a cell because a light every metre would
    // be neither realistic nor affordable.
    sampleStep: 1.5,
    dropBelowCeiling: 0.30,
    fixtureWidth: 0.62,
    fixtureDepth: 0.20,
    fixtureThickness: 0.07,
    // Emissive value on the visible fixture itself. This is the part you look
    // at; `intensity` below is the part that lights the room.
    fixtureEmissive: 0.92,
    intensity: 0.78,
    themes: Object.freeze(['industrial', 'office', 'summit']),
    tint: Object.freeze({
      industrial: [1.00, 0.93, 0.78],
      office: [0.94, 0.97, 1.00],
      summit: [0.88, 0.96, 1.00]
    })
  });

  const CEILING_LIGHTS_ENABLED = (() => {
    try {
      return new URLSearchParams(window.location.search).get('ceilingLights') !== '0';
    } catch (_) {
      return true;
    }
  })();

  let ceilingLightsRuntimeEnabled = CEILING_LIGHTS_ENABLED;

  function setCeilingLightsEnabled(enabled) {
    ceilingLightsRuntimeEnabled = Boolean(enabled);
    return ceilingLightsRuntimeEnabled;
  }

  // Build 12.160 anchored moving surface detail to model space. Build 12.191
  // extends the same existing uniform into a compact mode value: 0 static,
  // 1 third-person operator/corpse and 2 first-person viewmodel. Static batches
  // always replay with mode 0.
  let localSurfaceDetailMode = 0;

  function withLocalSurfaceDetail(draw, requestedMode = OPERATOR_SILHOUETTE_LIGHTING.operatorMode) {
    const previous = localSurfaceDetailMode;
    const numericMode = Math.round(Number(requestedMode) || OPERATOR_SILHOUETTE_LIGHTING.operatorMode);
    localSurfaceDetailMode = Math.min(
      OPERATOR_SILHOUETTE_LIGHTING.viewmodelMode,
      Math.max(OPERATOR_SILHOUETTE_LIGHTING.operatorMode, numericMode)
    );
    try {
      return draw();
    } finally {
      localSurfaceDetailMode = previous;
    }
  }

  let staticWorldRenderActive = false;
  let staticWorldBatchEligible = true;
  let staticWorldBatchMode = 'none';
  let staticWorldGpuBatchesReady = false;
  const staticWorldGpuBatches = [];
  const staticWorldGpuBatchGroups = new Map();
  let rendererStatsPublishCountdown = 0;
  const rendererFrameStats = {
    drawCalls: 0,
    staticCandidates: 0,
    staticDrawCalls: 0,
    staticCulled: 0,
    staticSourceDraws: 0,
    staticBatchDrawCalls: 0,
    dynamicActorCandidates: 0,
    dynamicActorsCulled: 0
  };
  const rendererLastFrameStats = {
    drawCalls: 0,
    staticCandidates: 0,
    staticDrawCalls: 0,
    staticCulled: 0,
    staticSourceDraws: 0,
    staticBatchDrawCalls: 0,
    dynamicActorCandidates: 0,
    dynamicActorsCulled: 0,
    cullingEnabled: STATIC_WORLD_CULLING_ENABLED,
    batchingEnabled: STATIC_WORLD_BATCHING_ENABLED,
    dynamicActorCullingEnabled: DYNAMIC_ACTOR_CULLING_ENABLED
  };
  const tracers = [];
  // Build 12.155: impact decals. A shot that misses carries on until it hits
  // something, and leaving a mark there is what makes a firefight read as
  // having happened. Capped and reused as a ring buffer so the cost is a fixed
  // ceiling rather than something that grows with match length, and drawn in
  // the dynamic pass — never batched, since batching bakes model matrices and
  // these appear and expire while the batch is live.
  const IMPACT_DECAL_LIMIT = 48;
  const impactDecals = [];
  // Build 12.183: blood marks are transient presentation generated only after
  // real health damage. Keep the pool bounded because each splatter contains a
  // small authored cluster of flattened procedural spheres.
  const BLOOD_DECAL_LIMIT = 18;
  const BLOOD_SPLATTER_MAX_DISTANCE = 1.25;
  const bloodDecals = [];
  let lastFrameDt = 1 / 60;
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

  const damageOverlayEl = document.getElementById('damageOverlay');
  const deathOverlayEl = document.getElementById('deathOverlay');
  const crosshairEl = document.getElementById('crosshair');

  function hexColour(hex) {
    const value = Number.parseInt(String(hex).replace('#', ''), 16);
    return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
  }

  function mat4Perspective(out, fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    out.fill(0);
    out[0] = f / aspect;
    out[5] = f;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[14] = 2 * far * near * nf;
    return out;
  }

  function mat4LookAt(out, eye, centre, up) {
    let zx = eye[0] - centre[0];
    let zy = eye[1] - centre[1];
    let zz = eye[2] - centre[2];
    let len = Math.hypot(zx, zy, zz) || 1;
    zx /= len; zy /= len; zz /= len;

    let xx = up[1] * zz - up[2] * zy;
    let xy = up[2] * zx - up[0] * zz;
    let xz = up[0] * zy - up[1] * zx;
    len = Math.hypot(xx, xy, xz) || 1;
    xx /= len; xy /= len; xz /= len;

    const yx = zy * xz - zz * xy;
    const yy = zz * xx - zx * xz;
    const yz = zx * xy - zy * xx;

    out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0;
    out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0;
    out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0;
    out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
    out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
    out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
    out[15] = 1;
    return out;
  }

  // M = T * Ry * Rx * Rz * S, stored column-major for WebGL.
  function mat4TRS(out, tx, ty, tz, ry = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    const cy = Math.cos(ry), syy = Math.sin(ry);
    const cx = Math.cos(rx), sxx = Math.sin(rx);
    const cz = Math.cos(rz), szz = Math.sin(rz);

    const r00 = cy * cz + sxx * syy * szz;
    const r01 = -cy * szz + cz * sxx * syy;
    const r02 = cx * syy;
    const r10 = cx * szz;
    const r11 = cx * cz;
    const r12 = -sxx;
    const r20 = cy * sxx * szz - cz * syy;
    const r21 = cy * cz * sxx + syy * szz;
    const r22 = cx * cy;

    out[0] = r00 * sx; out[1] = r10 * sx; out[2] = r20 * sx; out[3] = 0;
    out[4] = r01 * sy; out[5] = r11 * sy; out[6] = r21 * sy; out[7] = 0;
    out[8] = r02 * sz; out[9] = r12 * sz; out[10] = r22 * sz; out[11] = 0;
    out[12] = tx; out[13] = ty; out[14] = tz; out[15] = 1;
    return out;
  }

  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader) || 'Unknown shader compilation error';
      gl.deleteShader(shader);
      throw new Error(log);
    }
    return shader;
  }

  // How many ceiling lights this device can actually afford to declare. The
  // WebGL1 floor for MAX_FRAGMENT_UNIFORM_VECTORS is only 16 and the existing
  // shader already spends 9, so on a spec-minimum device the light arrays would
  // fail to LINK rather than merely run slowly. Query the real limit and drop
  // to a grade-only shader when it is tight; the grade is the cheap half and is
  // worth keeping on every device.
  let activeCeilingLightSlots = 0;

  function resolveCeilingLightSlots() {
    if (!CEILING_LIGHTS_ENABLED) return 0;
    try {
      const limit = Number(gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS)) || 0;
      // 13 vectors are spoken for before lights (9 existing + 4 grade); each
      // light costs 2. Keep a margin rather than filling the budget exactly.
      const affordable = Math.floor((limit - 13 - 4) / 2);
      return Math.max(0, Math.min(CEILING_LIGHT_POLICY.maxActive, affordable));
    } catch (_) {
      return 0;
    }
  }

  function createProgram() {
    activeCeilingLightSlots = resolveCeilingLightSlots();
    const slots = activeCeilingLightSlots;
    const ceilingLightUniformBlock = slots > 0 ? `
      // xyz world position, w reciprocal range. An unused slot carries w = 0,
      // which drives the falloff below to exactly zero without a branch.
      uniform vec4 uCeilingLightPosRange[${slots}];
      uniform vec3 uCeilingLightColour[${slots}];
` : '';
    const ceilingLightBlock = slots > 0 ? `
        // Build 12.224: authored ceiling fixtures. The overhead pools above are
        // an infinite grid and give the room its character; these are actual
        // lights at actual places, put where the map measured dark. Only the
        // nearest few reach the shader, so this loop is a fixed cost.
        for (int lightIndex = 0; lightIndex < ${slots}; lightIndex++) {
          vec4 lightPosRange = uCeilingLightPosRange[lightIndex];
          vec3 toLight = lightPosRange.xyz - vWorldPosition;
          float lightDistance = length(toLight);
          float falloff = max(0.0, 1.0 - lightDistance * lightPosRange.w);
          falloff *= falloff;
          vec3 lightDirection = toLight / max(lightDistance, 0.0001);
          float lightLambert = max(dot(normal, lightDirection), 0.0);
          ceilingLight += uCeilingLightColour[lightIndex] * (lightLambert * falloff);
        }
` : '';
    const vertexSource = `
      attribute vec3 aPosition;
      attribute vec3 aNormal;
      uniform mat4 uProjection;
      uniform mat4 uView;
      uniform mat4 uModel;
      varying vec3 vWorldPosition;
      varying vec3 vLocalPosition;
      varying vec3 vNormal;
      void main() {
        vec4 world = uModel * vec4(aPosition, 1.0);
        vWorldPosition = world.xyz;
        // Build 12.160: surface detail on a MOVING object has to be anchored to
        // the object, not to the room. Model space gives every operator a fixed
        // pattern that travels with them instead of one the world sweeps across
        // them as they walk.
        vLocalPosition = aPosition;
        vNormal = normalize(mat3(uModel) * aNormal);
        gl_Position = uProjection * uView * world;
      }
    `;
    const fragmentSource = `
      precision mediump float;
      varying vec3 vWorldPosition;
      varying vec3 vLocalPosition;
      varying vec3 vNormal;
      uniform vec3 uColour;
      uniform vec3 uCameraPosition;
      uniform vec3 uFogColour;
      uniform float uEmissive;
      uniform float uAlpha;
      uniform float uSurface;
      uniform float uRoughness;
      uniform float uTime;
      // 1 while drawing geometry that moves through the world.
      uniform float uLocalDetail;
      // Build 12.224 image grade. All of these are set once per frame, never
      // per draw, so the static batch key is untouched.
      uniform vec2 uResolution;
      uniform vec3 uGradeLift;
      uniform vec3 uGradeGain;
      // x saturation, y exposure, z vignette strength, w grade enabled (0 or 1).
      uniform vec4 uGradeParams;
${ceilingLightUniformBlock}
      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      // Smoothly interpolated value noise. Surfaces need gentle variation, not
      // the hard per-cell steps a raw hash gives.
      float valueNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float smoothGrid(vec2 p, float width) {
        vec2 g = abs(fract(p) - 0.5);
        return smoothstep(0.5 - width, 0.5, max(g.x, g.y));
      }

      // Narkowicz ACES approximation. Cheap, and it is the whole reason
      // highlights keep their hue instead of clipping to flat white.
      vec3 filmicToneMap(vec3 x) {
        return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
      }

      void main() {
        vec3 normal = normalize(vNormal);
        vec3 base = uColour;
        // Build 12.145: the shared surface noise used to be
        // hash21(floor(xz * 5.0) + floor(xy * 2.0)) — two mismatched grids
        // summed and hashed, which produced hard blocky patches and made the
        // result depend on which axis a surface happened to face. Every
        // surface mode reads this term, so that single line was the quilted
        // mottling on office walls, industrial floors and metal alike.
        // Smoothly interpolated value noise on one coherent grid replaces it.
        // Build 12.160: everything below reads detailPosition rather than the
        // world position directly. For static geometry the two are identical.
        // For an operator it switches the whole surface layer into model space,
        // which is what stops the texture crawling as they move.
        float movingDetail = step(0.5, uLocalDetail);
        float operatorActor = movingDetail * (1.0 - step(1.5, uLocalDetail));
        vec3 detailPosition = mix(vWorldPosition, vLocalPosition, movingDetail);
        vec2 noiseCoord = detailPosition.xz * 1.7 + vec2(detailPosition.y * 0.55);
        float noise = valueNoise(noiseCoord);
        float materialRoughness = clamp(uRoughness, 0.04, 1.0);
        float materialAmbientLift = 0.0;

        // Surface 1: sealed industrial floor with panel joins, aggregate,
        // oil staining and occasional damp patches that catch overhead light.
        if (uSurface > 0.5 && uSurface < 1.5) {
          float panel = smoothGrid(vWorldPosition.xz * 0.5, 0.035);
          float micro = smoothGrid(vWorldPosition.xz * 4.0, 0.018) * 0.12;
          float stainNoise = hash21(floor(vWorldPosition.xz * 0.72));
          float stain = smoothstep(0.72, 0.94, stainNoise) *
                        smoothstep(0.18, 0.82, sin(vWorldPosition.x * 0.42 + vWorldPosition.z * 0.31) * 0.5 + 0.5);
          float wet = smoothstep(0.79, 0.98, hash21(floor((vWorldPosition.xz + vec2(2.0, 7.0)) * 0.46)));
          base *= 0.86 + noise * 0.15;
          base = mix(base, base * 0.28, panel * 0.76);
          base = mix(base, base * 0.62, micro);
          base = mix(base, vec3(0.065, 0.085, 0.095), stain * 0.28);
          materialRoughness = mix(materialRoughness, 0.24, wet * 0.62);
        // Surface 2: modular wall panels with seams, vertical water streaks and
        // grime concentrated around the base and ceiling service zone.
        } else if (uSurface > 1.5 && uSurface < 2.5) {
          // Build 12.145: modular partition panels. The tone now varies per
          // panel module rather than per fragment, and the streaking that ran
          // at twelve cycles per world unit is gone — at office scale it read
          // as corduroy rather than as wear.
          float panelU = (vWorldPosition.x + vWorldPosition.z) * 0.5;
          float panelV = vWorldPosition.y * 1.65;
          float verticalSeam = smoothstep(0.955, 1.0, fract(panelU));
          float horizontalSeam = smoothstep(0.92, 1.0, fract(panelV));
          float lowerGrime = 1.0 - smoothstep(0.04, 0.82, vWorldPosition.y);
          float upperGrime = smoothstep(1.72, 2.30, vWorldPosition.y);
          float moduleTone = 0.972 + hash21(vec2(floor(panelU), floor(panelV))) * 0.050;
          base *= moduleTone * (0.975 + noise * 0.045);
          base = mix(base, base * 0.46, max(verticalSeam, horizontalSeam) * 0.52);
          base *= 1.0 - lowerGrime * (0.06 + noise * 0.05);
          base *= 1.0 - upperGrime * 0.05;
        // Surface 3: painted or exposed metal.
        } else if (uSurface > 2.5 && uSurface < 3.5) {
          // Build 12.145: 92 cycles per world unit aliased into visible bands
          // on anything larger than a handrail. A slower grain plus a broad
          // sheen reads as brushed metal at room scale.
          float brushed = 0.965 + 0.035 * sin(detailPosition.y * 26.0 + detailPosition.x * 3.0 + detailPosition.z * 2.0);
          float sheen = 0.98 + 0.02 * sin(detailPosition.y * 2.4);
          float edgeWear = smoothstep(0.80, 1.0, noise);
          base *= brushed * sheen;
          base = mix(base, min(base * 1.28, vec3(0.78)), edgeWear * 0.12);
        // Surface 4: lamps, displays and luminous paint.
        } else if (uSurface > 3.5 && uSurface < 4.5) {
          // Build 12.145: the scanline ran at 130 cycles per world unit with a
          // 6% swing, which turned every wall display into hard corduroy. A
          // slow roll at a third of the amplitude still reads as an emissive
          // panel without dominating the room.
          float scan = 0.982 + 0.018 * sin(vWorldPosition.y * 34.0 + uTime * 2.4);
          base *= scan;
          materialRoughness = 0.14;
        // Surface 5: tactical fabric and painted armour.
        } else if (uSurface > 4.5 && uSurface < 5.5) {
          // Build 12.160: this ran at 95 and 88 cycles per world unit with a 7%
          // swing. Build 12.145 established that anything above roughly 40
          // aliases into banding, and on an operator — who is about 1.8 units
          // tall and moving — it crawled across the kit every step. Anchored to
          // the model and dropped to a rate that resolves as cloth.
          float weave = 0.965 + 0.035 * sin(detailPosition.x * 26.0) * sin(detailPosition.y * 22.0);
          base *= weave * (0.96 + noise * 0.06);
          materialRoughness = max(materialRoughness, 0.72);
        // Surface 6: rubber, boots and soft polymer.
        } else if (uSurface > 5.5 && uSurface < 6.5) {
          base *= 0.86 + noise * 0.08;
          materialRoughness = max(materialRoughness, 0.88);
        // Surface 7: rough sandstone, packed earth and sun-weathered plaster.
        } else if (uSurface > 6.5 && uSurface < 7.5) {
          // Build 12.144: sandstone masonry. The previous version multiplied
          // two mismatched floor() noise grids (xz * 8 and xy * 3), which gave
          // a random patchwork that read as dirt rather than stone. Courses
          // now run horizontally in a running bond with soft mortar joints and
          // a much gentler per-block tone.
          float courseHeight = 0.44;
          float blockLength = 0.88;
          float course = floor(vWorldPosition.y / courseHeight);
          float bond = mod(course, 2.0) * 0.5;
          float along = (vWorldPosition.x + vWorldPosition.z) / blockLength + bond;
          float block = floor(along);

          float blockTone = 0.972 + hash21(vec2(block, course)) * 0.056;
          float courseTone = 0.980 + hash21(vec2(course * 1.7, 4.3)) * 0.040;

          // Mortar: darken where a course line or a block edge falls.
          float courseEdge = abs(fract(vWorldPosition.y / courseHeight) - 0.5) * 2.0;
          float blockEdge = abs(fract(along) - 0.5) * 2.0;
          float joint = max(smoothstep(0.90, 1.0, courseEdge), smoothstep(0.93, 1.0, blockEdge));

          // A slow warm gradient replaces the old high-frequency strata stripe.
          float bedding = 0.985 + 0.015 * sin(vWorldPosition.y * 2.6 + block * 0.6);
          float dust = smoothstep(0.64, 0.96, noise) * (1.0 - smoothstep(0.04, 0.58, vWorldPosition.y));

          base *= blockTone * courseTone * bedding;
          base = mix(base, base * 0.82, joint * 0.55);
          base = mix(base, vec3(0.54, 0.38, 0.23), dust * 0.12);
          materialRoughness = max(materialRoughness, 0.90);
        // Surface 8: exposed operator skin. Keep natural matte shading, but
        // retain enough ambient response for pale skin to remain readable under
        // helmets, goggles and armour collars without making it self-luminous.
        } else if (uSurface > 7.5 && uSurface < 8.5) {
          float skinVariation = 0.992 + 0.008 * sin(detailPosition.y * 18.0 + detailPosition.x * 11.0);
          base *= skinVariation;
          materialRoughness = max(materialRoughness, ${OPERATOR_SKIN_MATERIAL.roughness.toFixed(2)});
          materialAmbientLift = ${OPERATOR_SKIN_MATERIAL.ambientLift.toFixed(2)};
        }

        vec3 keyDirection = normalize(vec3(-0.42, 0.82, 0.34));
        vec3 fillDirection = normalize(vec3(0.58, 0.42, -0.56));
        float diffuse = max(dot(normal, keyDirection), 0.0);
        float fill = max(dot(normal, fillDirection), 0.0);
        float hemi = mix(0.20, 0.50, normal.y * 0.5 + 0.5);

        // These are overhead light pools laid out on the room grid. Build 12.160
        // removed moving-geometry shimmer by replacing both pools with fixed
        // averages and disabling the stepped flicker. Build 12.190 keeps that
        // stability but restores a restrained smooth local response: 75% stable
        // average plus 25% of the already-calculated positional pool. Static
        // geometry still takes the original values exactly, and moving flicker
        // remains fully disabled.
        vec2 coolCell = abs(fract((vWorldPosition.xz - vec2(2.5)) / vec2(5.0, 4.0)) - 0.5);
        float coolPool = exp(-18.0 * dot(coolCell, coolCell));
        vec2 warmCell = abs(fract((vWorldPosition.xz + vec2(1.4, 0.6)) / vec2(8.0, 6.0)) - 0.5);
        float warmPool = exp(-30.0 * dot(warmCell, warmCell));
        float moving = movingDetail;
        float movingCoolPool = mix(${OPERATOR_ENVIRONMENT_LIGHTING.coolAverage.toFixed(2)}, coolPool, ${OPERATOR_ENVIRONMENT_LIGHTING.localShare.toFixed(2)});
        float movingWarmPool = mix(${OPERATOR_ENVIRONMENT_LIGHTING.warmAverage.toFixed(2)}, warmPool, ${OPERATOR_ENVIRONMENT_LIGHTING.localShare.toFixed(2)});
        coolPool = mix(coolPool, movingCoolPool, moving);
        warmPool = mix(warmPool, movingWarmPool, moving);
        float flicker = mix(0.96 + 0.04 * sin(uTime * 2.1 + floor(vWorldPosition.x * 0.2) * 1.7), ${OPERATOR_ENVIRONMENT_LIGHTING.movingFlicker.toFixed(1)}, moving);
        float overhead = coolPool * (0.12 + max(normal.y, 0.0) * 0.34) * flicker;

        vec3 viewDirection = normalize(uCameraPosition - vWorldPosition);
        vec3 halfDirection = normalize(keyDirection + viewDirection);
        float specPower = mix(8.0, 68.0, 1.0 - materialRoughness);
        float specular = pow(max(dot(normal, halfDirection), 0.0), specPower) * (1.0 - materialRoughness) * 0.68;
        float rimShape = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.8);
        float rim = rimShape * 0.095;
        // Build 12.191: only third-person operator mode receives this modest
        // neutral lift. Static geometry and mode-2 viewmodels multiply by zero.
        float operatorSilhouetteLift = operatorActor * (${OPERATOR_SILHOUETTE_LIGHTING.fillLift.toFixed(3)} + rimShape * ${OPERATOR_SILHOUETTE_LIGHTING.rimLift.toFixed(3)});
        float groundAO = 0.76 + 0.24 * smoothstep(0.02, 0.42, vWorldPosition.y);

        vec3 ceilingLight = vec3(0.0);
${ceilingLightBlock}
        vec3 lit = base * (hemi + diffuse * 0.66 + fill * 0.10 + overhead + materialAmbientLift + uEmissive);
        lit += vec3(0.66, 0.82, 0.98) * specular;
        lit += vec3(0.48, 0.18, 0.07) * warmPool * 0.14;
        lit += base * (rim + operatorSilhouetteLift);
        lit += base * ceilingLight;
        lit *= groundAO;

        float distanceToCamera = distance(vWorldPosition, uCameraPosition);
        float fogAmount = smoothstep(16.0, 35.0, distanceToCamera);
        // Build 12.224: fog settles low. Previously it was a flat distance band
        // that sat at identical density on a ceiling and on the floor, which
        // reads as a wash rather than as air.
        float fogHeight = exp(-max(vWorldPosition.y - ${IMAGE_GRADE_POLICY.fogHeightReference.toFixed(2)}, 0.0) * ${IMAGE_GRADE_POLICY.fogHeightFalloff.toFixed(2)});
        fogAmount *= mix(1.0, fogHeight, uGradeParams.w);
        vec3 finalColour = mix(lit, uFogColour, fogAmount);

        // Build 12.224 image grade. Order is deliberate: expose, roll the
        // highlights off, then grade in display space where lift and gain
        // behave predictably, then frame and dither.
        vec3 graded = filmicToneMap(finalColour * uGradeParams.y);
        graded = graded * uGradeGain + uGradeLift;
        float gradeLuma = dot(graded, vec3(0.2126, 0.7152, 0.0722));
        graded = mix(vec3(gradeLuma), graded, uGradeParams.x);
        vec2 screenUv = gl_FragCoord.xy / max(uResolution, vec2(1.0, 1.0));
        vec2 vignetteOffset = (screenUv - 0.5) * 2.0;
        float vignetteFalloff = smoothstep(${IMAGE_GRADE_POLICY.vignetteSoftness.toFixed(2)}, 1.45, dot(vignetteOffset, vignetteOffset));
        graded *= 1.0 - uGradeParams.z * vignetteFalloff;
        // Ordered against screen position, so it does not crawl frame to frame.
        graded += (hash21(gl_FragCoord.xy) - 0.5) * ${IMAGE_GRADE_POLICY.ditherAmplitude.toFixed(6)};

        // mix(a, b, 0.0) returns a exactly, so ?grade=0 is a true byte
        // reference path rather than an approximation of one — the same
        // property Build 12.160 relied on for its surface-space A/B.
        gl_FragColor = vec4(mix(finalColour, graded, uGradeParams.w), uAlpha);
      }
    `;
    const program = gl.createProgram();
    gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || 'Unable to link WebGL program');
    }
    return program;
  }

  function createMesh(positions, normals, indices, retainSource = true) {
    const vao = gl.createVertexArray ? gl.createVertexArray() : null;
    if (vao) gl.bindVertexArray(vao);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(glLocations.position);
    gl.vertexAttribPointer(glLocations.position, 3, gl.FLOAT, false, 0, 0);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(glLocations.normal);
    gl.vertexAttribPointer(glLocations.normal, 3, gl.FLOAT, false, 0, 0);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    if (vao) gl.bindVertexArray(null);

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let offset = 0; offset < positions.length; offset += 3) {
      minX = Math.min(minX, positions[offset]);
      minY = Math.min(minY, positions[offset + 1]);
      minZ = Math.min(minZ, positions[offset + 2]);
      maxX = Math.max(maxX, positions[offset]);
      maxY = Math.max(maxY, positions[offset + 1]);
      maxZ = Math.max(maxZ, positions[offset + 2]);
    }
    const centreX = (minX + maxX) * 0.5;
    const centreY = (minY + maxY) * 0.5;
    const centreZ = (minZ + maxZ) * 0.5;
    let radius = 0;
    for (let offset = 0; offset < positions.length; offset += 3) {
      radius = Math.max(radius, Math.hypot(
        positions[offset] - centreX,
        positions[offset + 1] - centreY,
        positions[offset + 2] - centreZ
      ));
    }

    return {
      vao,
      positionBuffer,
      normalBuffer,
      indexBuffer,
      count: indices.length,
      sourcePositions: retainSource ? Array.from(positions) : null,
      sourceNormals: retainSource ? Array.from(normals) : null,
      sourceIndices: retainSource ? Array.from(indices) : null,
      bounds: {
        centre: [centreX, centreY, centreZ],
        radius
      }
    };
  }

  function bindMesh(mesh) {
    if (mesh.vao && gl.bindVertexArray) {
      gl.bindVertexArray(mesh.vao);
      return;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.positionBuffer);
    gl.enableVertexAttribArray(glLocations.position);
    gl.vertexAttribPointer(glLocations.position, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer);
    gl.enableVertexAttribArray(glLocations.normal);
    gl.vertexAttribPointer(glLocations.normal, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
  }

  function makeCubeMesh() {
    const p = [
      -0.5,-0.5, 0.5,  0.5,-0.5, 0.5,  0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
       0.5,-0.5,-0.5, -0.5,-0.5,-0.5, -0.5, 0.5,-0.5,  0.5, 0.5,-0.5,
      -0.5, 0.5, 0.5,  0.5, 0.5, 0.5,  0.5, 0.5,-0.5, -0.5, 0.5,-0.5,
      -0.5,-0.5,-0.5,  0.5,-0.5,-0.5,  0.5,-0.5, 0.5, -0.5,-0.5, 0.5,
       0.5,-0.5, 0.5,  0.5,-0.5,-0.5,  0.5, 0.5,-0.5,  0.5, 0.5, 0.5,
      -0.5,-0.5,-0.5, -0.5,-0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5,-0.5
    ];
    const n = [
       0,0,1, 0,0,1, 0,0,1, 0,0,1,
       0,0,-1,0,0,-1,0,0,-1,0,0,-1,
       0,1,0,0,1,0,0,1,0,0,1,0,
       0,-1,0,0,-1,0,0,-1,0,0,-1,0,
       1,0,0,1,0,0,1,0,0,1,0,0,
      -1,0,0,-1,0,0,-1,0,0,-1,0,0
    ];
    const i = [];
    for (let face = 0; face < 6; face++) {
      const o = face * 4;
      i.push(o, o + 1, o + 2, o, o + 2, o + 3);
    }
    return createMesh(p, n, i);
  }

  function signedPower(value, exponent) {
    if (Math.abs(value) < 0.000001) return 0;
    return Math.sign(value) * Math.pow(Math.abs(value), exponent);
  }

  function makeSmoothIndexedMesh(positions, indices) {
    const normals = new Array(positions.length).fill(0);
    for (let index = 0; index < indices.length; index += 3) {
      const ia = indices[index] * 3;
      const ib = indices[index + 1] * 3;
      const ic = indices[index + 2] * 3;
      const abx = positions[ib] - positions[ia];
      const aby = positions[ib + 1] - positions[ia + 1];
      const abz = positions[ib + 2] - positions[ia + 2];
      const acx = positions[ic] - positions[ia];
      const acy = positions[ic + 1] - positions[ia + 1];
      const acz = positions[ic + 2] - positions[ia + 2];
      const nx = aby * acz - abz * acy;
      const ny = abz * acx - abx * acz;
      const nz = abx * acy - aby * acx;
      const area = Math.hypot(nx, ny, nz);
      if (area < 0.0000001) continue;
      for (const offset of [ia, ib, ic]) {
        normals[offset] += nx;
        normals[offset + 1] += ny;
        normals[offset + 2] += nz;
      }
    }
    for (let offset = 0; offset < normals.length; offset += 3) {
      const length = Math.hypot(normals[offset], normals[offset + 1], normals[offset + 2]) || 1;
      normals[offset] /= length;
      normals[offset + 1] /= length;
      normals[offset + 2] /= length;
    }
    return createMesh(positions, normals, indices);
  }

  function makeProfiledCharacterMesh(profile, segments = 16, modifier = null, capBottom = true, capTop = true) {
    const positions = [];
    const indices = [];
    const ringSize = segments + 1;
    for (let ring = 0; ring < profile.length; ring++) {
      const current = profile[ring];
      const ringT = profile.length > 1 ? ring / (profile.length - 1) : 0;
      for (let segment = 0; segment <= segments; segment++) {
        const angle = segment / segments * TAU;
        const point = {
          x: current.rx * Math.cos(angle),
          y: current.y,
          z: (Number(current.cz) || 0) + current.rz * Math.sin(angle),
          angle,
          ring,
          ringT
        };
        const shaped = modifier ? (modifier(point, current) || point) : point;
        positions.push(shaped.x, shaped.y, shaped.z);
      }
    }
    for (let ring = 0; ring < profile.length - 1; ring++) {
      for (let segment = 0; segment < segments; segment++) {
        const a = ring * ringSize + segment;
        const b = a + ringSize;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    if (capBottom) {
      const centre = positions.length / 3;
      const base = profile[0];
      positions.push(0, base.y, Number(base.cz) || 0);
      for (let segment = 0; segment < segments; segment++) indices.push(centre, segment, segment + 1);
    }
    if (capTop) {
      const centre = positions.length / 3;
      const top = profile[profile.length - 1];
      positions.push(0, top.y, Number(top.cz) || 0);
      const start = (profile.length - 1) * ringSize;
      for (let segment = 0; segment < segments; segment++) indices.push(centre, start + segment + 1, start + segment);
    }
    return makeSmoothIndexedMesh(positions, indices);
  }

  // Anatomical head profile with a tapered chin, cheek volume, brow plane and
  // restrained nose projection. The mesh stays deliberately readable at match
  // distance without reverting to a featureless sphere.
  function makeOperatorHeadMesh(segments = 20) {
    const profile = [
      { y: -0.50, rx: 0.07, rz: 0.07, cz:  0.040 },
      { y: -0.44, rx: 0.22, rz: 0.17, cz:  0.040 },
      { y: -0.33, rx: 0.36, rz: 0.29, cz:  0.034 },
      { y: -0.18, rx: 0.46, rz: 0.39, cz:  0.024 },
      { y: -0.02, rx: 0.50, rz: 0.45, cz:  0.014 },
      { y:  0.14, rx: 0.49, rz: 0.47, cz:  0.000 },
      { y:  0.30, rx: 0.44, rz: 0.43, cz: -0.014 },
      { y:  0.43, rx: 0.29, rz: 0.29, cz: -0.026 },
      { y:  0.50, rx: 0.07, rz: 0.07, cz: -0.030 }
    ];
    return makeProfiledCharacterMesh(profile, segments, point => {
      const front = Math.max(0, Math.sin(point.angle));
      const side = Math.abs(Math.cos(point.angle));
      const cheekWeight = Math.exp(-Math.pow((point.y + 0.075) / 0.19, 2));
      const eyeWeight = Math.exp(-Math.pow((point.y - 0.075) / 0.105, 2));
      const browWeight = Math.exp(-Math.pow((point.y - 0.185) / 0.10, 2));
      const noseWeight = Math.exp(-Math.pow((point.y - 0.015) / 0.16, 2));
      const chinWeight = Math.exp(-Math.pow((point.y + 0.355) / 0.13, 2));
      point.z += Math.pow(front, 4) * cheekWeight * 0.022;
      point.z -= Math.pow(front, 6) * eyeWeight * 0.018;
      point.z += Math.pow(front, 7) * browWeight * 0.014;
      point.z += Math.pow(front, 14) * noseWeight * 0.105;
      point.z += Math.pow(front, 8) * chinWeight * 0.030;
      point.x *= 1 + Math.pow(side, 5) * cheekWeight * 0.055;
      point.x *= 1 - Math.pow(side, 5) * browWeight * 0.025;
      if (Math.sin(point.angle) < 0) point.z -= Math.pow(-Math.sin(point.angle), 3) * 0.016;
      return point;
    }, true, true);
  }

  // Open-bottom combat helmet shell with a flatter brow, fuller temporal area
  // and a modest rear nape extension. It replaces the second spherical head.
  function makeOperatorHelmetMesh(segments = 20) {
    const profile = [
      { y: -0.50, rx: 0.34, rz: 0.28, cz: -0.010 },
      { y: -0.40, rx: 0.45, rz: 0.39, cz: -0.016 },
      { y: -0.22, rx: 0.50, rz: 0.47, cz: -0.024 },
      { y:  0.02, rx: 0.49, rz: 0.50, cz: -0.032 },
      { y:  0.23, rx: 0.42, rz: 0.44, cz: -0.040 },
      { y:  0.40, rx: 0.28, rz: 0.30, cz: -0.046 },
      { y:  0.50, rx: 0.08, rz: 0.08, cz: -0.048 }
    ];
    return makeProfiledCharacterMesh(profile, segments, point => {
      const sine = Math.sin(point.angle);
      const front = Math.max(0, sine);
      const rear = Math.max(0, -sine);
      const side = Math.abs(Math.cos(point.angle));
      const lower = clamp((0.10 - point.y) / 0.60, 0, 1);
      point.z -= Math.pow(front, 4) * lower * 0.045;
      point.z -= Math.pow(rear, 3) * lower * 0.052;
      point.x *= 1 + Math.pow(side, 4) * lower * 0.025;
      return point;
    }, false, true);
  }

  // Curved, tapered lower-face cover. Its rear half is deliberately shallow so
  // it nests into the anatomical head instead of reading as a floating box.
  function makeOperatorFaceCoverMesh(segments = 16) {
    const profile = [
      { y: -0.50, rx: 0.18, rz: 0.16, cz: 0.030 },
      { y: -0.33, rx: 0.34, rz: 0.28, cz: 0.026 },
      { y: -0.04, rx: 0.50, rz: 0.43, cz: 0.018 },
      { y:  0.28, rx: 0.46, rz: 0.40, cz: 0.020 },
      { y:  0.50, rx: 0.29, rz: 0.27, cz: 0.050 }
    ];
    return makeProfiledCharacterMesh(profile, segments, point => {
      const sine = Math.sin(point.angle);
      const front = Math.max(0, sine);
      if (sine < 0) point.z *= 0.56;
      const noseBridge = Math.exp(-Math.pow((point.y - 0.38) / 0.20, 2));
      point.z += Math.pow(front, 4) * 0.025;
      point.z += Math.pow(front, 10) * noseBridge * 0.070;
      return point;
    }, true, true);
  }

  function makeOperatorPelvisMesh(segments = 16) {
    const profile = [
      { y: -0.50, rx: 0.40, rz: 0.38, cz:  0.006 },
      { y: -0.34, rx: 0.46, rz: 0.44, cz:  0.004 },
      { y: -0.08, rx: 0.50, rz: 0.49, cz:  0.000 },
      { y:  0.22, rx: 0.48, rz: 0.46, cz: -0.004 },
      { y:  0.42, rx: 0.45, rz: 0.41, cz: -0.008 },
      { y:  0.50, rx: 0.44, rz: 0.38, cz: -0.010 }
    ];
    return makeProfiledCharacterMesh(profile, segments, null, true, true);
  }

  // Tapered live carrier shell. Class dimensions still come from
  // operatorArmourRenderProfile(); this mesh only removes the chest-slab look.
  function makeOperatorCarrierMesh(segments = 16) {
    const profile = [
      { y: -0.50, rx: 0.35, rz: 0.34 },
      { y: -0.32, rx: 0.44, rz: 0.43 },
      { y:  0.04, rx: 0.50, rz: 0.50 },
      { y:  0.34, rx: 0.47, rz: 0.45 },
      { y:  0.50, rx: 0.34, rz: 0.33 }
    ];
    return makeProfiledCharacterMesh(profile, segments, null, true, true);
  }


  // Cloth deltoid/sleeve volume. It is vertically profiled and shallow through
  // the chest so the always-present shoulder form reads as clothing flowing
  // out of the torso, not as a spherical mechanical joint. Armour classes that
  // own a hard shoulder plate still draw that separate authored shell.
  function makeOperatorShoulderPadMesh(segments = 16) {
    const profile = [
      { y: -0.50, rx: 0.38, rz: 0.30, cz:  0.006 },
      { y: -0.34, rx: 0.46, rz: 0.37, cz:  0.006 },
      { y: -0.08, rx: 0.52, rz: 0.44, cz:  0.002 },
      { y:  0.18, rx: 0.50, rz: 0.42, cz: -0.004 },
      { y:  0.38, rx: 0.43, rz: 0.34, cz: -0.010 },
      { y:  0.50, rx: 0.34, rz: 0.27, cz: -0.014 }
    ];
    return makeProfiledCharacterMesh(profile, segments, point => {
      const front = Math.max(0, Math.sin(point.angle));
      const side = Math.abs(Math.cos(point.angle));
      const crown = Math.exp(-Math.pow((point.y - 0.08) / 0.34, 2));
      point.z += Math.pow(front, 3) * crown * 0.018;
      point.x *= 1 + Math.pow(side, 5) * crown * 0.045;
      return point;
    }, true, true);
  }

  // Compact glove shape with a broad palm and tapered wrist. Rotation remains
  // controlled by the existing animation rig, so attachment behaviour is unchanged.
  function makeOperatorGloveMesh(segments = 14) {
    const profile = [
      { y: -0.50, rx: 0.31, rz: 0.34 },
      { y: -0.27, rx: 0.46, rz: 0.48 },
      { y:  0.16, rx: 0.50, rz: 0.50 },
      { y:  0.42, rx: 0.44, rz: 0.44 },
      { y:  0.50, rx: 0.30, rz: 0.29 }
    ];
    return makeProfiledCharacterMesh(profile, segments, point => {
      const front = Math.max(0, Math.sin(point.angle));
      point.z += Math.pow(front, 4) * 0.022;
      return point;
    }, true, true);
  }

  // Forward-profiled protective shell used by knees and elbows. It keeps the
  // same single draw as the old rounded box, but tapers into the limb at both
  // ends and carries its volume towards the exposed front face.
  function makeOperatorJointPadMesh(segments = 14) {
    const profile = [
      { y: -0.50, rx: 0.28, rz: 0.24, cz: -0.010 },
      { y: -0.32, rx: 0.43, rz: 0.40, cz:  0.000 },
      { y: -0.02, rx: 0.50, rz: 0.50, cz:  0.018 },
      { y:  0.27, rx: 0.45, rz: 0.42, cz:  0.010 },
      { y:  0.50, rx: 0.25, rz: 0.22, cz: -0.008 }
    ];
    return makeProfiledCharacterMesh(profile, segments, point => {
      const front = Math.max(0, Math.sin(point.angle));
      point.z += Math.pow(front, 3) * 0.055;
      return point;
    }, true, true);
  }

  // A boot authored along local Z with a rounded heel, instep and tapered toe.
  // It replaces the superellipsoid shoe without adding any per-operator draws.
  function makeOperatorBootMesh(segments = 14) {
    const profile = [
      { z: -0.50, width: 0.64, height: 0.66, cy:  0.08 },
      { z: -0.34, width: 0.88, height: 0.92, cy:  0.05 },
      { z: -0.08, width: 1.00, height: 1.00, cy:  0.02 },
      { z:  0.22, width: 0.96, height: 0.84, cy: -0.04 },
      { z:  0.43, width: 0.80, height: 0.62, cy: -0.10 },
      { z:  0.50, width: 0.50, height: 0.34, cy: -0.14 }
    ];
    const positions = [];
    const indices = [];
    const ringSize = segments + 1;
    for (let ring = 0; ring < profile.length; ring++) {
      const current = profile[ring];
      for (let segment = 0; segment <= segments; segment++) {
        const angle = segment / segments * TAU;
        positions.push(
          current.width * 0.5 * Math.cos(angle),
          current.cy + current.height * 0.5 * Math.sin(angle),
          current.z
        );
      }
    }
    for (let ring = 0; ring < profile.length - 1; ring++) {
      for (let segment = 0; segment < segments; segment++) {
        const a = ring * ringSize + segment;
        const b = a + ringSize;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    const addCap = (ring, reverse) => {
      const current = profile[ring];
      const centre = positions.length / 3;
      positions.push(0, current.cy, current.z);
      const start = ring * ringSize;
      for (let segment = 0; segment < segments; segment++) {
        if (reverse) indices.push(centre, start + segment + 1, start + segment);
        else indices.push(centre, start + segment, start + segment + 1);
      }
    };
    addCap(0, true);
    addCap(profile.length - 1, false);
    return makeSmoothIndexedMesh(positions, indices);
  }

  // Smooth superellipsoid used for armour, boots and other major character
  // forms. It keeps broad readable planes while rounding the hard cube edges.
  function makeRoundedBoxMesh(segments = 12, rings = 8, exponent = 0.42) {
    const positions = [], normals = [], indices = [];
    const normalExponent = Math.max(1, 2 / Math.max(0.12, exponent) - 1);
    for (let y = 0; y <= rings; y++) {
      const v = y / rings;
      const latitude = (v - 0.5) * Math.PI;
      const latitudeCos = Math.cos(latitude);
      const latitudeSin = Math.sin(latitude);
      for (let x = 0; x <= segments; x++) {
        const longitude = x / segments * TAU;
        const px = 0.5 * signedPower(latitudeCos, exponent) * signedPower(Math.cos(longitude), exponent);
        const py = 0.5 * signedPower(latitudeSin, exponent);
        const pz = 0.5 * signedPower(latitudeCos, exponent) * signedPower(Math.sin(longitude), exponent);
        positions.push(px, py, pz);
        let nx = signedPower(px, normalExponent);
        let ny = signedPower(py, normalExponent);
        let nz = signedPower(pz, normalExponent);
        const length = Math.hypot(nx, ny, nz) || 1;
        nx /= length; ny /= length; nz /= length;
        normals.push(nx, ny, nz);
      }
    }
    for (let y = 0; y < rings; y++) {
      for (let x = 0; x < segments; x++) {
        const a = y * (segments + 1) + x;
        const b = a + segments + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    return createMesh(positions, normals, indices);
  }

  // A low-cost anatomical limb segment. Both ends retain real volume so limbs
  // flow through their joints instead of pinching into beads; the local -Y end
  // remains broader than +Y for shoulder-to-elbow, hip-to-knee and calf taper.
  // Closed end caps prevent a moving elbow or knee exposing a hollow seam.
  function makeTaperedCapsuleMesh(segments = 10) {
    const profile = [
      { y: -0.50, r: 0.44 },
      { y: -0.36, r: 0.49 },
      { y: -0.12, r: 0.50 },
      { y:  0.12, r: 0.47 },
      { y:  0.36, r: 0.42 },
      { y:  0.50, r: 0.37 }
    ];
    const positions = [], normals = [], indices = [];
    for (let ring = 0; ring < profile.length; ring++) {
      const current = profile[ring];
      const previous = profile[Math.max(0, ring - 1)];
      const next = profile[Math.min(profile.length - 1, ring + 1)];
      const radiusSlope = (next.r - previous.r) / Math.max(0.0001, next.y - previous.y);
      for (let segment = 0; segment <= segments; segment++) {
        const angle = segment / segments * TAU;
        const cosine = Math.cos(angle);
        const sine = Math.sin(angle);
        positions.push(cosine * current.r, current.y, sine * current.r);
        if (ring === 0) {
          normals.push(0, -1, 0);
        } else if (ring === profile.length - 1) {
          normals.push(0, 1, 0);
        } else {
          let nx = cosine;
          let ny = -radiusSlope;
          let nz = sine;
          const length = Math.hypot(nx, ny, nz) || 1;
          nx /= length; ny /= length; nz /= length;
          normals.push(nx, ny, nz);
        }
      }
    }
    for (let ring = 0; ring < profile.length - 1; ring++) {
      for (let segment = 0; segment < segments; segment++) {
        const a = ring * (segments + 1) + segment;
        const b = a + segments + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }

    const addCap = (ring, normalY, reverse) => {
      const current = profile[ring];
      const centre = positions.length / 3;
      positions.push(0, current.y, 0);
      normals.push(0, normalY, 0);
      const start = positions.length / 3;
      for (let segment = 0; segment <= segments; segment++) {
        const angle = segment / segments * TAU;
        positions.push(Math.cos(angle) * current.r, current.y, Math.sin(angle) * current.r);
        normals.push(0, normalY, 0);
      }
      for (let segment = 0; segment < segments; segment++) {
        if (reverse) indices.push(centre, start + segment + 1, start + segment);
        else indices.push(centre, start + segment, start + segment + 1);
      }
    };
    addCap(0, -1, true);
    addCap(profile.length - 1, 1, false);
    return createMesh(positions, normals, indices);
  }

  // Shaped tactical torso with a narrower waist, fuller ribcage and sloped
  // shoulders. It replaces the single rectangular body block without adding
  // another draw call or changing any gameplay dimensions.
  function makeOperatorTorsoMesh(segments = 12) {
    const profile = [
      { y: -0.50, x: 0.66, z: 0.68, cz:  0.010 },
      { y: -0.39, x: 0.72, z: 0.76, cz:  0.012 },
      { y: -0.20, x: 0.78, z: 0.84, cz:  0.016 },
      { y:  0.03, x: 0.94, z: 0.93, cz:  0.014 },
      { y:  0.25, x: 1.00, z: 0.88, cz:  0.006 },
      { y:  0.41, x: 0.94, z: 0.77, cz: -0.006 },
      { y:  0.50, x: 0.82, z: 0.62, cz: -0.012 }
    ];
    const positions = [], normals = [], indices = [];
    for (let ring = 0; ring < profile.length; ring++) {
      const current = profile[ring];
      const previous = profile[Math.max(0, ring - 1)];
      const next = profile[Math.min(profile.length - 1, ring + 1)];
      const dx = 0.5 * (next.x - previous.x) / Math.max(0.0001, next.y - previous.y);
      const dz = 0.5 * (next.z - previous.z) / Math.max(0.0001, next.y - previous.y);
      const rx = current.x * 0.5;
      const rz = current.z * 0.5;
      for (let segment = 0; segment <= segments; segment++) {
        const angle = segment / segments * TAU;
        const cosine = Math.cos(angle);
        const sine = Math.sin(angle);
        positions.push(rx * cosine, current.y, (Number(current.cz) || 0) + rz * sine);
        let nx = rz * cosine;
        let ny = -(rz * dx * cosine * cosine + rx * dz * sine * sine);
        let nz = rx * sine;
        const length = Math.hypot(nx, ny, nz) || 1;
        nx /= length; ny /= length; nz /= length;
        normals.push(nx, ny, nz);
      }
    }
    for (let ring = 0; ring < profile.length - 1; ring++) {
      for (let segment = 0; segment < segments; segment++) {
        const a = ring * (segments + 1) + segment;
        const b = a + segments + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }

    const addCap = (profileIndex, normalY, reverse) => {
      const current = profile[profileIndex];
      const centre = positions.length / 3;
      positions.push(0, current.y, Number(current.cz) || 0);
      normals.push(0, normalY, 0);
      const start = positions.length / 3;
      for (let segment = 0; segment <= segments; segment++) {
        const angle = segment / segments * TAU;
        positions.push(current.x * 0.5 * Math.cos(angle), current.y, (Number(current.cz) || 0) + current.z * 0.5 * Math.sin(angle));
        normals.push(0, normalY, 0);
      }
      for (let segment = 0; segment < segments; segment++) {
        if (reverse) indices.push(centre, start + segment + 1, start + segment);
        else indices.push(centre, start + segment, start + segment + 1);
      }
    };
    addCap(0, -1, false);
    addCap(profile.length - 1, 1, true);
    return createMesh(positions, normals, indices);
  }

  function makeSphereMesh(segments = 10, rings = 7) {
    const positions = [], normals = [], indices = [];
    for (let y = 0; y <= rings; y++) {
      const v = y / rings;
      const phi = v * Math.PI;
      for (let x = 0; x <= segments; x++) {
        const u = x / segments;
        const theta = u * TAU;
        const nx = Math.sin(phi) * Math.cos(theta);
        const ny = Math.cos(phi);
        const nz = Math.sin(phi) * Math.sin(theta);
        positions.push(nx * 0.5, ny * 0.5, nz * 0.5);
        normals.push(nx, ny, nz);
      }
    }
    for (let y = 0; y < rings; y++) {
      for (let x = 0; x < segments; x++) {
        const a = y * (segments + 1) + x;
        const b = a + segments + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    return createMesh(positions, normals, indices);
  }

  function makeDiscMesh(segments = 24, innerRadius = 0) {
    const positions = [], normals = [], indices = [];
    if (innerRadius <= 0) {
      positions.push(0, 0, 0); normals.push(0, 1, 0);
      for (let i = 0; i <= segments; i++) {
        const a = i / segments * TAU;
        positions.push(Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5);
        normals.push(0, 1, 0);
      }
      for (let i = 1; i <= segments; i++) indices.push(0, i, i + 1);
    } else {
      for (let i = 0; i <= segments; i++) {
        const a = i / segments * TAU;
        const c = Math.cos(a), s = Math.sin(a);
        positions.push(c * 0.5, 0, s * 0.5, c * 0.5 * innerRadius, 0, s * 0.5 * innerRadius);
        normals.push(0, 1, 0, 0, 1, 0);
      }
      for (let i = 0; i < segments; i++) {
        const o = i * 2;
        indices.push(o, o + 2, o + 1, o + 2, o + 3, o + 1);
      }
    }
    return createMesh(positions, normals, indices);
  }

  function makeCylinderMesh(segments = 10) {
    const positions = [], normals = [], indices = [];
    for (let i = 0; i <= segments; i++) {
      const a = i / segments * TAU;
      const x = Math.cos(a) * 0.5;
      const z = Math.sin(a) * 0.5;
      positions.push(x, -0.5, z, x, 0.5, z);
      normals.push(Math.cos(a), 0, Math.sin(a), Math.cos(a), 0, Math.sin(a));
    }
    for (let i = 0; i < segments; i++) {
      const o = i * 2;
      indices.push(o, o + 1, o + 2, o + 1, o + 3, o + 2);
    }
    const bottomCentre = positions.length / 3;
    positions.push(0, -0.5, 0); normals.push(0, -1, 0);
    const topCentre = positions.length / 3;
    positions.push(0, 0.5, 0); normals.push(0, 1, 0);
    const bottomStart = positions.length / 3;
    for (let i = 0; i <= segments; i++) {
      const a = i / segments * TAU;
      positions.push(Math.cos(a) * 0.5, -0.5, Math.sin(a) * 0.5);
      normals.push(0, -1, 0);
    }
    const topStart = positions.length / 3;
    for (let i = 0; i <= segments; i++) {
      const a = i / segments * TAU;
      positions.push(Math.cos(a) * 0.5, 0.5, Math.sin(a) * 0.5);
      normals.push(0, 1, 0);
    }
    for (let i = 0; i < segments; i++) {
      indices.push(bottomCentre, bottomStart + i + 1, bottomStart + i);
      indices.push(topCentre, topStart + i, topStart + i + 1);
    }
    return createMesh(positions, normals, indices);
  }

  function mat4Segment(out, ax, ay, az, bx, by, bz, radius = 0.05, depthRadius = radius) {
    let yx = bx - ax, yy = by - ay, yz = bz - az;
    const length = Math.hypot(yx, yy, yz) || 0.0001;
    yx /= length; yy /= length; yz /= length;
    const hx = Math.abs(yy) < 0.92 ? 0 : 1;
    const hy = Math.abs(yy) < 0.92 ? 1 : 0;
    const hz = 0;
    let xx = hy * yz - hz * yy;
    let xy = hz * yx - hx * yz;
    let xz = hx * yy - hy * yx;
    let xLen = Math.hypot(xx, xy, xz) || 1;
    xx /= xLen; xy /= xLen; xz /= xLen;
    const zx = yy * xz - yz * xy;
    const zy = yz * xx - yx * xz;
    const zz = yx * xy - yy * xx;
    out[0] = xx * radius; out[1] = xy * radius; out[2] = xz * radius; out[3] = 0;
    out[4] = yx * length; out[5] = yy * length; out[6] = yz * length; out[7] = 0;
    out[8] = zx * depthRadius; out[9] = zy * depthRadius; out[10] = zz * depthRadius; out[11] = 0;
    out[12] = (ax + bx) * 0.5; out[13] = (ay + by) * 0.5; out[14] = (az + bz) * 0.5; out[15] = 1;
    return out;
  }

  function drawSegment(a, b, radius, colour, emissive = 0, alpha = 1, surface = 5, roughness = 0.82, depthRadius = radius) {
    mat4Segment(glModel, a.x, a.y, a.z, b.x, b.y, b.z, radius, depthRadius);
    drawMesh(glMeshes.cylinder, colour, glModel, emissive, alpha, surface, roughness);
  }

  function drawAnatomicalSegment(a, b, radius, colour, emissive = 0, alpha = 1, surface = 5, roughness = 0.82, depthRadius = radius) {
    mat4Segment(glModel, a.x, a.y, a.z, b.x, b.y, b.z, radius, depthRadius);
    drawMesh(glMeshes.taperedCapsule || glMeshes.cylinder, colour, glModel, emissive, alpha, surface, roughness);
  }

  function worldPoint(baseX, baseY, baseZ, yaw, lx, ly, lz) {
    const p = localToWorld(baseX, baseZ, yaw, lx, lz);
    return { x: p.x, y: baseY + ly, z: p.z };
  }

  function setBlendMode(transparent) {
    if (transparent) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
    } else {
      gl.disable(gl.BLEND);
      gl.depthMask(true);
    }
  }

  let renderElevationOffset = 0;

  function setRenderElevationOffset(value = 0) {
    renderElevationOffset = Number.isFinite(Number(value)) ? Number(value) : 0;
    return renderElevationOffset;
  }

  function setStaticWorldBatchEligibility(eligible) {
    const previous = staticWorldBatchEligible;
    staticWorldBatchEligible = Boolean(eligible);
    return previous;
  }

  function deleteRendererMesh(mesh) {
    if (!gl || !mesh) return;
    if (mesh.vao && gl.deleteVertexArray) gl.deleteVertexArray(mesh.vao);
    if (mesh.positionBuffer) gl.deleteBuffer(mesh.positionBuffer);
    if (mesh.normalBuffer) gl.deleteBuffer(mesh.normalBuffer);
    if (mesh.indexBuffer) gl.deleteBuffer(mesh.indexBuffer);
  }

  function resetStaticWorldGpuBatches() {
    for (const batch of staticWorldGpuBatches) deleteRendererMesh(batch.mesh);
    staticWorldGpuBatches.length = 0;
    staticWorldGpuBatchGroups.clear();
    staticWorldGpuBatchesReady = false;
    staticWorldBatchMode = 'none';
    staticWorldBatchEligible = true;
  }

  function staticWorldMaterialKey(colour, emissive, alpha, surface, roughness) {
    return [
      colour.map(value => Number(value).toFixed(6)).join(','),
      Number(emissive).toFixed(6),
      Number(alpha).toFixed(6),
      Number(surface).toFixed(3),
      Number(roughness).toFixed(6)
    ].join('|');
  }

  function staticWorldBatchGroup(colour, emissive, alpha, surface, roughness, incomingVertices) {
    const key = staticWorldMaterialKey(colour, emissive, alpha, surface, roughness);
    let groups = staticWorldGpuBatchGroups.get(key);
    if (!groups) {
      groups = [];
      staticWorldGpuBatchGroups.set(key, groups);
    }
    let group = groups[groups.length - 1] || null;
    if (!group || group.positions.length / 3 + incomingVertices > 64000) {
      group = {
        colour: colour.slice(),
        emissive,
        alpha,
        surface,
        roughness,
        positions: [],
        normals: [],
        indices: []
      };
      groups.push(group);
    }
    return group;
  }

  function captureStaticWorldMesh(mesh, colour, model, emissive, alpha, surface, roughness) {
    if (!mesh?.sourcePositions || !mesh?.sourceNormals || !mesh?.sourceIndices) return false;
    const sourcePositions = mesh.sourcePositions;
    const sourceNormals = mesh.sourceNormals;
    const vertexCount = sourcePositions.length / 3;
    const group = staticWorldBatchGroup(colour, emissive, alpha, surface, roughness, vertexCount);
    const baseVertex = group.positions.length / 3;
    for (let offset = 0; offset < sourcePositions.length; offset += 3) {
      const x = sourcePositions[offset];
      const y = sourcePositions[offset + 1];
      const z = sourcePositions[offset + 2];
      group.positions.push(
        model[0] * x + model[4] * y + model[8] * z + model[12],
        model[1] * x + model[5] * y + model[9] * z + model[13] + renderElevationOffset,
        model[2] * x + model[6] * y + model[10] * z + model[14]
      );
      const nx = model[0] * sourceNormals[offset] + model[4] * sourceNormals[offset + 1] + model[8] * sourceNormals[offset + 2];
      const ny = model[1] * sourceNormals[offset] + model[5] * sourceNormals[offset + 1] + model[9] * sourceNormals[offset + 2];
      const nz = model[2] * sourceNormals[offset] + model[6] * sourceNormals[offset + 1] + model[10] * sourceNormals[offset + 2];
      const normalLength = Math.hypot(nx, ny, nz) || 1;
      group.normals.push(nx / normalLength, ny / normalLength, nz / normalLength);
    }
    for (const index of mesh.sourceIndices) group.indices.push(baseVertex + index);
    return true;
  }

  function beginStaticWorldBatchCapture() {
    staticWorldGpuBatchGroups.clear();
    staticWorldBatchMode = 'capture';
    staticWorldBatchEligible = true;
  }

  function finishStaticWorldBatchCapture() {
    for (const groups of staticWorldGpuBatchGroups.values()) {
      for (const group of groups) {
        if (!group.indices.length) continue;
        staticWorldGpuBatches.push({
          mesh: createMesh(group.positions, group.normals, group.indices, false),
          colour: group.colour,
          emissive: group.emissive,
          alpha: group.alpha,
          surface: group.surface,
          roughness: group.roughness
        });
      }
    }
    staticWorldGpuBatchGroups.clear();
    staticWorldGpuBatchesReady = true;
    staticWorldBatchMode = 'replay';
  }

  function drawStaticWorldGpuBatches() {
    if (!staticWorldGpuBatchesReady) return;
    const previousActive = staticWorldRenderActive;
    staticWorldRenderActive = false;
    mat4TRS(glModel, 0, 0, 0, 0, 0, 0, 1, 1, 1);
    for (const batch of staticWorldGpuBatches) {
      rendererFrameStats.staticBatchDrawCalls++;
      drawMesh(batch.mesh, batch.colour, glModel, batch.emissive, batch.alpha, batch.surface, batch.roughness);
    }
    staticWorldRenderActive = previousActive;
  }

  function beginRendererFrameStats() {
    rendererFrameStats.drawCalls = 0;
    rendererFrameStats.staticCandidates = 0;
    rendererFrameStats.staticDrawCalls = 0;
    rendererFrameStats.staticCulled = 0;
    rendererFrameStats.staticSourceDraws = 0;
    rendererFrameStats.staticBatchDrawCalls = 0;
    rendererFrameStats.dynamicActorCandidates = 0;
    rendererFrameStats.dynamicActorsCulled = 0;
  }

  function finishRendererFrameStats() {
    rendererLastFrameStats.drawCalls = rendererFrameStats.drawCalls;
    rendererLastFrameStats.staticCandidates = rendererFrameStats.staticCandidates;
    rendererLastFrameStats.staticDrawCalls = rendererFrameStats.staticDrawCalls;
    rendererLastFrameStats.staticCulled = rendererFrameStats.staticCulled;
    rendererLastFrameStats.staticSourceDraws = rendererFrameStats.staticSourceDraws;
    rendererLastFrameStats.staticBatchDrawCalls = rendererFrameStats.staticBatchDrawCalls;
    rendererLastFrameStats.dynamicActorCandidates = rendererFrameStats.dynamicActorCandidates;
    rendererLastFrameStats.dynamicActorsCulled = rendererFrameStats.dynamicActorsCulled;
    rendererLastFrameStats.cullingEnabled = STATIC_WORLD_CULLING_ENABLED;
    rendererLastFrameStats.batchingEnabled = STATIC_WORLD_BATCHING_ENABLED;
    rendererLastFrameStats.dynamicActorCullingEnabled = DYNAMIC_ACTOR_CULLING_ENABLED;
    rendererStatsPublishCountdown--;
    if (rendererStatsPublishCountdown > 0 || !document.body) return;
    rendererStatsPublishCountdown = 30;
    document.body.dataset.rendererDrawCalls = String(rendererLastFrameStats.drawCalls);
    document.body.dataset.rendererStaticCandidates = String(rendererLastFrameStats.staticCandidates);
    document.body.dataset.rendererStaticDrawCalls = String(rendererLastFrameStats.staticDrawCalls);
    document.body.dataset.rendererStaticCulled = String(rendererLastFrameStats.staticCulled);
    document.body.dataset.rendererStaticSourceDraws = String(rendererLastFrameStats.staticSourceDraws);
    document.body.dataset.rendererStaticBatchDrawCalls = String(rendererLastFrameStats.staticBatchDrawCalls);
    document.body.dataset.rendererDynamicActorCandidates = String(rendererLastFrameStats.dynamicActorCandidates);
    document.body.dataset.rendererDynamicActorsCulled = String(rendererLastFrameStats.dynamicActorsCulled);
    document.body.dataset.rendererDynamicActorCulling = rendererLastFrameStats.dynamicActorCullingEnabled ? 'on' : 'off';
    document.body.dataset.rendererStaticCulling = rendererLastFrameStats.cullingEnabled ? 'on' : 'off';
    document.body.dataset.rendererStaticBatching = rendererLastFrameStats.batchingEnabled ? 'on' : 'off';
  }

  function staticMeshOutsideCameraView(mesh, model) {
    if (!STATIC_WORLD_CULLING_ENABLED || !mesh?.bounds) return false;
    const centre = mesh.bounds.centre;
    const worldX = model[0] * centre[0] + model[4] * centre[1] + model[8] * centre[2] + model[12];
    const worldY = model[1] * centre[0] + model[5] * centre[1] + model[9] * centre[2] + model[13] + renderElevationOffset;
    const worldZ = model[2] * centre[0] + model[6] * centre[1] + model[10] * centre[2] + model[14];
    const viewX = glView[0] * worldX + glView[4] * worldY + glView[8] * worldZ + glView[12];
    const viewY = glView[1] * worldX + glView[5] * worldY + glView[9] * worldZ + glView[13];
    const viewZ = glView[2] * worldX + glView[6] * worldY + glView[10] * worldZ + glView[14];
    const depth = -viewZ;
    const scaleX = Math.hypot(model[0], model[1], model[2]);
    const scaleY = Math.hypot(model[4], model[5], model[6]);
    const scaleZ = Math.hypot(model[8], model[9], model[10]);
    const radius = mesh.bounds.radius * Math.max(scaleX, scaleY, scaleZ);
    if (depth + radius < 0.025 || depth - radius > GL_FAR) return true;
    const horizontalSlope = 1 / Math.max(0.0001, glProjection[0]);
    const verticalSlope = 1 / Math.max(0.0001, glProjection[5]);
    const horizontalAllowance = radius * Math.hypot(1, horizontalSlope);
    const verticalAllowance = radius * Math.hypot(1, verticalSlope);
    return Math.abs(viewX) > depth * horizontalSlope + horizontalAllowance
      || Math.abs(viewY) > depth * verticalSlope + verticalAllowance;
  }

  function dynamicActorOutsideCameraView(worldX, worldY, worldZ, radius = 1.85) {
    rendererFrameStats.dynamicActorCandidates++;
    if (!DYNAMIC_ACTOR_CULLING_ENABLED) return false;
    const viewX = glView[0] * worldX + glView[4] * worldY + glView[8] * worldZ + glView[12];
    const viewY = glView[1] * worldX + glView[5] * worldY + glView[9] * worldZ + glView[13];
    const viewZ = glView[2] * worldX + glView[6] * worldY + glView[10] * worldZ + glView[14];
    const depth = -viewZ;
    const safeRadius = Math.max(0.01, Number(radius) || 1.85);
    let outside = depth + safeRadius < 0.025 || depth - safeRadius > GL_FAR;
    if (!outside) {
      const horizontalSlope = 1 / Math.max(0.0001, glProjection[0]);
      const verticalSlope = 1 / Math.max(0.0001, glProjection[5]);
      const horizontalAllowance = safeRadius * Math.hypot(1, horizontalSlope);
      const verticalAllowance = safeRadius * Math.hypot(1, verticalSlope);
      outside = Math.abs(viewX) > depth * horizontalSlope + horizontalAllowance
        || Math.abs(viewY) > depth * verticalSlope + verticalAllowance;
    }
    if (outside) rendererFrameStats.dynamicActorsCulled++;
    return outside;
  }

  function drawMesh(mesh, colour, model, emissive = 0, alpha = 1, surface = 0, roughness = 0.76) {
    if (!mesh || alpha <= 0.001) return;
    if (staticWorldRenderActive) {
      // Build 12.154: the arena restriction is gone from both gates — this one
      // and the capture trigger in `drawWorld`. Batching now depends only on
      // the draw being opaque and eligible. Translucent draws stay out on
      // purpose: batching merges them into one mesh and blending is
      // order-dependent.
      const batchable = STATIC_WORLD_BATCHING_ENABLED
        && staticWorldBatchEligible
        && alpha >= 0.999;
      if (staticWorldBatchMode === 'capture') {
        if (batchable) captureStaticWorldMesh(mesh, colour, model, emissive, alpha, surface, roughness);
        return;
      }
      if (staticWorldBatchMode === 'replay' && batchable) {
        rendererFrameStats.staticSourceDraws++;
        return;
      }
      rendererFrameStats.staticCandidates++;
      if (staticMeshOutsideCameraView(mesh, model)) {
        rendererFrameStats.staticCulled++;
        return;
      }
      rendererFrameStats.staticDrawCalls++;
    }
    rendererFrameStats.drawCalls++;
    bindMesh(mesh);
    const originalModelY = model[13];
    if (renderElevationOffset) model[13] = originalModelY + renderElevationOffset;
    gl.uniformMatrix4fv(glLocations.model, false, model);
    if (renderElevationOffset) model[13] = originalModelY;
    const muzzleResponse = operatorMuzzleLightContribution(model, alpha, surface);
    let renderColour = colour;
    let renderEmissive = emissive;
    if (muzzleResponse > 0) {
      const policy = OPERATOR_MUZZLE_LIGHT_RESPONSE;
      const warmAmount = clamp(muzzleResponse * policy.warmMix, 0, 1);
      operatorMuzzleLightColourScratch[0] = colour[0] + (policy.warmColour[0] - colour[0]) * warmAmount;
      operatorMuzzleLightColourScratch[1] = colour[1] + (policy.warmColour[1] - colour[1]) * warmAmount;
      operatorMuzzleLightColourScratch[2] = colour[2] + (policy.warmColour[2] - colour[2]) * warmAmount;
      renderColour = operatorMuzzleLightColourScratch;
      renderEmissive += muzzleResponse * policy.emissiveLift;
    }
    gl.uniform3fv(glLocations.colour, renderColour);
    gl.uniform1f(glLocations.emissive, renderEmissive);
    gl.uniform1f(glLocations.alpha, alpha);
    gl.uniform1f(glLocations.surface, surface);
    gl.uniform1f(glLocations.roughness, roughness);
    // Mode 0 keeps static world-space detail, mode 1 identifies third-person
    // operators/corpses and mode 2 identifies the first-person viewmodel.
    if (glLocations.localDetail) gl.uniform1f(glLocations.localDetail, localSurfaceDetailMode);
    gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
  }

  function localToWorld(baseX, baseZ, yaw, lx, lz) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    return { x: baseX + c * lx + s * lz, z: baseZ - s * lx + c * lz };
  }

  // Build 12.146: baked ambient occlusion.
  //
  // Enclosure is sampled once from the collision grid when the world batches
  // are built, never per frame, and is folded into the existing per-draw
  // colour. That costs no extra draw calls, no texture and no shader work — a
  // corridor simply resolves darker than an open room, which is most of what
  // makes a space read as lit.
  //
  // The value is quantised: the static batcher groups draws by exact material,
  // so a continuous factor would shatter one wall batch into hundreds.
  const STATIC_OCCLUSION_STEPS = 6;
  const STATIC_OCCLUSION_RADIUS = 2.6;

  // Build 12.153: the raw enclosure ratio is remapped before it is used. The
  // 12.146 version fed it straight in, so a typical wall came out around 0.34
  // and every surface in the arena darkened by a similar small amount — a flat
  // tint rather than shading, which is why it did not read. Below the floor
  // threshold a point counts as genuinely open and is not darkened at all;
  // above the ceiling threshold it is treated as fully enclosed. Only the
  // middle produces contrast, which is where corners and corridors live.
  //
  // The result is still quantised: the static batcher groups draws by exact
  // material, so a continuous factor would shatter one floor batch into
  // hundreds.
  const STATIC_OCCLUSION_OPEN = 0.20;
  const STATIC_OCCLUSION_ENCLOSED = 0.86;

  // The floor is quantised more coarsely than the walls on purpose. Every
  // distinct level becomes its own merged rectangle, so step count is what
  // decides the floor's draw-call cost: at six steps Citadel produced 294
  // rectangles, at four it produces far fewer for the same visible gradient,
  // because the extra levels were splitting bands only a cell or two wide.
  const STATIC_FLOOR_OCCLUSION_STEPS = 4;

  function staticOcclusionCurve(raw, steps = STATIC_OCCLUSION_STEPS) {
    const t = clamp((raw - STATIC_OCCLUSION_OPEN) / (STATIC_OCCLUSION_ENCLOSED - STATIC_OCCLUSION_OPEN), 0, 1);
    const shaped = t * t * (3 - 2 * t);
    return Math.round(shaped * steps) / steps;
  }

  function staticOcclusionRaw(x, z, radii = [STATIC_OCCLUSION_RADIUS * 0.45, STATIC_OCCLUSION_RADIUS]) {
    let blocked = 0;
    let total = 0;
    // Two rings give a cheap approximation of how enclosed a point is without
    // the cost of a real hemisphere sample.
    for (const radius of radii) {
      for (let step = 0; step < 12; step++) {
        const angle = (step / 12) * Math.PI * 2;
        total++;
        if (isWall(x + Math.cos(angle) * radius, z + Math.sin(angle) * radius)) blocked++;
      }
    }
    return total ? blocked / total : 0;
  }

  function staticOcclusionAt(x, z) {
    return staticOcclusionCurve(staticOcclusionRaw(x, z));
  }

  // The floor needs a much tighter reach than the walls do. At the 2.6-unit
  // radius above, a three-wide corridor is entirely within range of a wall, so
  // every cell in it darkens by the same amount and the result reads as the
  // corridor simply being dimmer — not as shading. Contact shading has to hug
  // the wall base, so the floor samples at well under a cell's width and the
  // curve is re-centred on the lower values that produces. Ground level is also
  // where a tight band is affordable: the floor is already shaded per cell.
  const STATIC_FLOOR_OCCLUSION_RADII = Object.freeze([0.72, 1.45]);
  const STATIC_FLOOR_OCCLUSION_OPEN = 0.08;
  const STATIC_FLOOR_OCCLUSION_ENCLOSED = 0.62;

  function staticFloorOcclusion(x, z) {
    const raw = staticOcclusionRaw(x, z, STATIC_FLOOR_OCCLUSION_RADII);
    const t = clamp((raw - STATIC_FLOOR_OCCLUSION_OPEN) / (STATIC_FLOOR_OCCLUSION_ENCLOSED - STATIC_FLOOR_OCCLUSION_OPEN), 0, 1);
    const shaped = t * t * (3 - 2 * t);
    return Math.round(shaped * STATIC_FLOOR_OCCLUSION_STEPS) / STATIC_FLOOR_OCCLUSION_STEPS;
  }

  // A wall rectangle's own centre is *inside* the wall, so sampling there
  // mostly measures how long the wall is rather than how enclosed the space in
  // front of it is. That is why Aurora's long straight walls all resolved to
  // the same value and the arena came out with three distinct levels across the
  // whole map. Sample the open cells that actually face the wall instead.
  function staticWallOcclusion(rect) {
    const halfWidth = rect.width / 2;
    const halfDepth = rect.depth / 2;
    let total = 0;
    let samples = 0;
    const probe = (x, z) => {
      if (isWall(x, z)) return;
      total += staticOcclusionRaw(x, z);
      samples++;
    };
    const spanX = Math.max(1, Math.round(rect.width));
    const spanZ = Math.max(1, Math.round(rect.depth));
    for (let index = 0; index < spanX; index++) {
      const x = rect.x - halfWidth + 0.5 + index;
      probe(x, rect.z - halfDepth - 0.5);
      probe(x, rect.z + halfDepth + 0.5);
    }
    for (let index = 0; index < spanZ; index++) {
      const z = rect.z - halfDepth + 0.5 + index;
      probe(rect.x - halfWidth - 0.5, z);
      probe(rect.x + halfWidth + 0.5, z);
    }
    // A rectangle with no open neighbour is buried inside a wall mass; nothing
    // can see it, so the value only has to be stable.
    if (!samples) return 1;
    return staticOcclusionCurve(total / samples);
  }

  // Occlusion darkens, it never brightens. With the curve above, open space
  // resolves to exactly zero and is left untouched, so raising the strength
  // deepens corners without dimming the arena as a whole.
  function applyStaticOcclusion(colour, occlusion, strength = 0.42) {
    const factor = 1 - clamp(Number(occlusion) || 0, 0, 1) * strength;
    return [colour[0] * factor, colour[1] * factor, colour[2] * factor];
  }

  // Build 12.224: choose where the ceiling fixtures go. The same enclosure
  // sampler that drives baked occlusion answers "how dark is it here", so the
  // lights land in the places the arena already measured as dark rather than in
  // hand-typed positions that would go stale the moment a map changed.
  //
  // Placement runs once per arena from `buildWorldBatches()`, never per frame.
  function createCeilingLights() {
    const arena = activeArenaMeta();
    const theme = arena.theme;
    // Dune is open-air. Putting a ceiling fixture there would hang a light in
    // the sky, and Build 12.143 gave that arena a real sky specifically so it
    // would read as outdoors.
    if (!CEILING_LIGHTS_ENABLED) return [];
    if (!CEILING_LIGHT_POLICY.themes.includes(theme)) return [];

    const ceilingHeight = Number(arena.ceilingHeight) || GL_WALL_HEIGHT;
    const tint = CEILING_LIGHT_POLICY.tint[theme] || [1, 1, 1];
    const step = CEILING_LIGHT_POLICY.sampleStep;
    const candidates = [];

    for (let x = step; x < MAP_W; x += step) {
      for (let z = step; z < MAP_H; z += step) {
        if (isWall(x, z)) continue;
        const darkness = staticOcclusionRaw(x, z);
        if (darkness < CEILING_LIGHT_POLICY.darknessThreshold) continue;
        candidates.push({ x, z, darkness });
      }
    }

    // Darkest first, so the budget is spent where it is needed most. Ties are
    // broken on position to keep placement deterministic across runs — a light
    // that moved between loads would make every captured A/B useless.
    candidates.sort((a, b) => (b.darkness - a.darkness) || (a.x - b.x) || (a.z - b.z));

    const placed = [];
    const minSpacingSquared = CEILING_LIGHT_POLICY.minSpacing * CEILING_LIGHT_POLICY.minSpacing;
    for (const candidate of candidates) {
      if (placed.length >= CEILING_LIGHT_POLICY.maxPerArena) break;
      let tooClose = false;
      for (const existing of placed) {
        const dx = existing.x - candidate.x;
        const dz = existing.z - candidate.z;
        if (dx * dx + dz * dz < minSpacingSquared) { tooClose = true; break; }
      }
      if (tooClose) continue;
      placed.push({
        x: candidate.x,
        y: ceilingHeight - CEILING_LIGHT_POLICY.dropBelowCeiling,
        z: candidate.z,
        darkness: candidate.darkness,
        colour: [tint[0], tint[1], tint[2]],
        intensity: CEILING_LIGHT_POLICY.intensity,
        range: CEILING_LIGHT_POLICY.range
      });
    }
    return placed;
  }

  // Only the nearest few fixtures reach the shader each frame. This is what
  // makes the per-pixel cost independent of how many lights an arena holds:
  // the loop in the fragment shader is always the same fixed length, and a slot
  // that has no light gets a reciprocal range of zero, which zeroes its falloff
  // without needing a branch.
  const ceilingLightPosRangeBuffer = new Float32Array(CEILING_LIGHT_POLICY.maxActive * 4);
  const ceilingLightColourBuffer = new Float32Array(CEILING_LIGHT_POLICY.maxActive * 3);
  const ceilingLightSelection = [];
  // The declared array length can be smaller than the policy maximum when the
  // device is short on fragment uniform vectors, and uploading a longer typed
  // array than the uniform declares is a GL error rather than a silent trim.
  // These views are cut once to the length the shader actually compiled with.
  let ceilingLightPosRangeView = null;
  let ceilingLightColourView = null;
  let ceilingLightViewSlots = -1;

  function ceilingLightUploadViews() {
    if (ceilingLightViewSlots !== activeCeilingLightSlots) {
      ceilingLightViewSlots = activeCeilingLightSlots;
      ceilingLightPosRangeView = ceilingLightPosRangeBuffer.subarray(0, Math.max(0, activeCeilingLightSlots) * 4);
      ceilingLightColourView = ceilingLightColourBuffer.subarray(0, Math.max(0, activeCeilingLightSlots) * 3);
    }
    return { posRange: ceilingLightPosRangeView, colour: ceilingLightColourView };
  }

  function selectActiveCeilingLights(cameraX, cameraY, cameraZ) {
    ceilingLightPosRangeBuffer.fill(0);
    ceilingLightColourBuffer.fill(0);
    ceilingLightSelection.length = 0;
    const slots = activeCeilingLightSlots;
    if (slots <= 0 || !ceilingLightsRuntimeEnabled) return ceilingLightSelection;
    const lights = worldBatches.ceilingLights;
    if (!lights || !lights.length) return ceilingLightSelection;

    for (const light of lights) {
      const dx = light.x - cameraX;
      const dy = light.y - cameraY;
      const dz = light.z - cameraZ;
      const distanceSquared = dx * dx + dy * dy + dz * dz;
      // Nothing outside its own range can contribute, so it never competes for
      // a slot with a fixture that can.
      if (distanceSquared > (light.range + 1) * (light.range + 1)) continue;
      ceilingLightSelection.push({ light, distanceSquared });
    }
    ceilingLightSelection.sort((a, b) => a.distanceSquared - b.distanceSquared);
    ceilingLightSelection.length = Math.min(ceilingLightSelection.length, slots);

    for (let index = 0; index < ceilingLightSelection.length; index++) {
      const light = ceilingLightSelection[index].light;
      const base = index * 4;
      ceilingLightPosRangeBuffer[base] = light.x;
      ceilingLightPosRangeBuffer[base + 1] = light.y;
      ceilingLightPosRangeBuffer[base + 2] = light.z;
      ceilingLightPosRangeBuffer[base + 3] = light.range > 0 ? 1 / light.range : 0;
      const colourBase = index * 3;
      ceilingLightColourBuffer[colourBase] = light.colour[0] * light.intensity;
      ceilingLightColourBuffer[colourBase + 1] = light.colour[1] * light.intensity;
      ceilingLightColourBuffer[colourBase + 2] = light.colour[2] * light.intensity;
    }
    return ceilingLightSelection;
  }

  // Build 12.153: the floor was a single draw spanning the whole map, so every
  // room had exactly the same ground tone however enclosed it was — and in a
  // first-person view the floor is most of what is on screen, which is the main
  // reason the 12.146 occlusion did not read as lighting.
  //
  // Each cell is shaded on its own and then merged, by the same greedy sweep
  // the walls use, into the fewest rectangles that each hold one occlusion
  // level. Quantisation is what makes that merge worth having: six levels
  // collapse 864 cells into a few dozen rectangles and leave the batcher with
  // six material groups instead of hundreds. Wall cells are shaded too rather
  // than skipped, so the floor stays gap-free under every wall base.
  function createFloorRectangles() {
    const levels = Array.from({ length: MAP_H }, (_, y) =>
      Array.from({ length: MAP_W }, (_, x) =>
        staticFloorOcclusion(x + 0.5, y + 0.5)));
    const visited = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(false));
    const rectangles = [];
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (visited[y][x]) continue;
        const level = levels[y][x];
        let width = 1;
        while (x + width < MAP_W && !visited[y][x + width] && levels[y][x + width] === level) width++;
        let height = 1;
        outer: while (y + height < MAP_H) {
          for (let xx = x; xx < x + width; xx++) {
            if (visited[y + height][xx] || levels[y + height][xx] !== level) break outer;
          }
          height++;
        }
        for (let yy = y; yy < y + height; yy++) {
          for (let xx = x; xx < x + width; xx++) visited[yy][xx] = true;
        }
        rectangles.push({
          x: x + width / 2,
          z: y + height / 2,
          width,
          depth: height,
          occlusion: level
        });
      }
    }
    return rectangles;
  }

  function createWallRectangles() {
    const visited = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(false));
    const rectangles = [];
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (visited[y][x] || MAP[y][x] !== '1') continue;
        let width = 1;
        while (x + width < MAP_W && !visited[y][x + width] && MAP[y][x + width] === '1') width++;
        let height = 1;
        outer: while (y + height < MAP_H) {
          for (let xx = x; xx < x + width; xx++) {
            if (visited[y + height][xx] || MAP[y + height][xx] !== '1') break outer;
          }
          height++;
        }
        for (let yy = y; yy < y + height; yy++) {
          for (let xx = x; xx < x + width; xx++) visited[yy][xx] = true;
        }
        rectangles.push({ x: x + width / 2, z: y + height / 2, width, depth: height, variant: (x + y) & 1 });
      }
    }
    return rectangles;
  }
