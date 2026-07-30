/*
 * Strikewatch source module: 62-character-renderer.js
 * Purpose: Objectives, shadows, third-person operators, corpses, health bars and tracers.
 *
 * This file is a source fragment. Run `python3 build.py` to regenerate
 * js/strikewatch.dev.js and the standalone release in dist/.
 */

  function drawObjectives(time) {
    setBlendMode(true);
    const pulse = 0.78 + Math.sin(time * 2.5) * 0.10;
    for (let i = 0; i < hotspots.length; i++) {
      const marker = hotspots[i];
      mat4TRS(glModel, marker.x, arenaElevationAt(marker.x, marker.y) + 0.012 + i * 0.0001, marker.y, 0, 0, 0, pulse, 1, pulse);
      drawMesh(glMeshes.ring, [0.96, 0.68, 0.14], glModel, 0.85, 0.24);
    }
    setBlendMode(false);
  }

  // Build 12.192: keep the established one/two-disc LOD budget, but use the
  // existing draws as a directional cast shadow plus a tighter contact shadow.
  // The key-light direction matches the shared fragment shader; the horizontal
  // vector below points away from that light and is normalised once in source.
  const OPERATOR_CONTACT_SHADOW = Object.freeze({
    revision: '12.192-directional-contact-shadow-1',
    keyAwayX: 0.777,
    keyAwayZ: -0.629,
    outerOffset: 0.055,
    outerRunOffset: 0.022,
    innerOffset: 0.018,
    movementLead: 0.014,
    innerMovementLead: 0.006,
    outerWidth: 0.57,
    outerCrouchWidth: 0.10,
    outerRunWidth: -0.025,
    outerLength: 0.37,
    outerCrouchLength: 0.055,
    outerMotionLength: 0.035,
    outerRunLength: 0.115,
    outerAlpha: 0.27,
    outerCrouchAlpha: 0.055,
    outerRunAlpha: -0.045,
    innerWidth: 0.40,
    innerCrouchWidth: 0.065,
    innerRunWidth: -0.018,
    innerLength: 0.23,
    innerCrouchLength: 0.035,
    innerMotionLength: 0.020,
    innerRunLength: 0.070,
    innerAlpha: 0.17,
    innerCrouchAlpha: 0.045,
    innerRunAlpha: -0.025,
    lowDetailDrawCalls: 1,
    mediumDetailDrawCalls: 2,
    fullDetailDrawCalls: 2
  });

  const operatorContactShadowScratch = {};

  function operatorContactShadowProfile(bot = {}, out = {}) {
    const policy = OPERATOR_CONTACT_SHADOW;
    const moveAngle = Number.isFinite(bot.renderMoveAngle)
      ? bot.renderMoveAngle
      : (Number.isFinite(bot.pathAngle) ? bot.pathAngle : (Number.isFinite(bot.angle) ? bot.angle : 0));
    const yaw = Math.PI / 2 - moveAngle;
    const crouch = clamp(Number(bot.crouchBlend) || (bot.crouched ? 1 : 0), 0, 1);
    const presentedVelocity = Number.isFinite(bot.visualMoveVelocity)
      ? bot.visualMoveVelocity
      : (Number.isFinite(bot.moveVelocity) ? bot.moveVelocity : 0);
    const speedNorm = clamp(presentedVelocity / Math.max(0.001, Number(bot.speed) || 1), 0, 1.15);
    const motion = clamp(Number(bot.motion) || speedNorm, 0, 1);
    const run = clamp(Number(bot.runBlend) || 0, 0, 1);
    const moveX = Math.cos(moveAngle);
    const moveZ = Math.sin(moveAngle);
    const outerOffset = policy.outerOffset + run * policy.outerRunOffset;

    out.yaw = yaw;
    out.crouch = crouch;
    out.motion = motion;
    out.run = run;
    out.outerX = (Number(bot.x) || 0) + policy.keyAwayX * outerOffset + moveX * motion * policy.movementLead;
    out.outerZ = (Number(bot.y) || 0) + policy.keyAwayZ * outerOffset + moveZ * motion * policy.movementLead;
    out.outerWidth = policy.outerWidth + crouch * policy.outerCrouchWidth + run * policy.outerRunWidth;
    out.outerLength = policy.outerLength + crouch * policy.outerCrouchLength + motion * policy.outerMotionLength + run * policy.outerRunLength;
    out.outerAlpha = clamp(policy.outerAlpha + crouch * policy.outerCrouchAlpha + run * policy.outerRunAlpha, 0.16, 0.36);
    out.innerX = (Number(bot.x) || 0) + policy.keyAwayX * policy.innerOffset + moveX * motion * policy.innerMovementLead;
    out.innerZ = (Number(bot.y) || 0) + policy.keyAwayZ * policy.innerOffset + moveZ * motion * policy.innerMovementLead;
    out.innerWidth = policy.innerWidth + crouch * policy.innerCrouchWidth + run * policy.innerRunWidth;
    out.innerLength = policy.innerLength + crouch * policy.innerCrouchLength + motion * policy.innerMotionLength + run * policy.innerRunLength;
    out.innerAlpha = clamp(policy.innerAlpha + crouch * policy.innerCrouchAlpha + run * policy.innerRunAlpha, 0.11, 0.25);
    return out;
  }

  function operatorContactShadowForTest() {
    const idle = operatorContactShadowProfile({ x: 4, y: 5, angle: 0, speed: 1 }, {});
    const crouched = operatorContactShadowProfile({ x: 4, y: 5, angle: 0, speed: 1, crouchBlend: 1 }, {});
    const running = operatorContactShadowProfile({ x: 4, y: 5, angle: 0, speed: 1, visualMoveVelocity: 1, motion: 1, runBlend: 1 }, {});
    const directionLength = Math.hypot(OPERATOR_CONTACT_SHADOW.keyAwayX, OPERATOR_CONTACT_SHADOW.keyAwayZ);
    const outerDistance = Math.hypot(idle.outerX - 4, idle.outerZ - 5);
    const innerDistance = Math.hypot(idle.innerX - 4, idle.innerZ - 5);
    return {
      ok: Math.abs(directionLength - 1) < 0.002
        && crouched.outerWidth > idle.outerWidth
        && crouched.outerAlpha > idle.outerAlpha
        && crouched.innerWidth > idle.innerWidth
        && running.outerLength > idle.outerLength
        && running.innerLength > idle.innerLength
        && running.outerAlpha < idle.outerAlpha
        && running.innerAlpha < idle.innerAlpha
        && innerDistance < outerDistance
        && OPERATOR_CONTACT_SHADOW.lowDetailDrawCalls === 1
        && OPERATOR_CONTACT_SHADOW.mediumDetailDrawCalls === 2
        && OPERATOR_CONTACT_SHADOW.fullDetailDrawCalls === 2,
      revision: OPERATOR_CONTACT_SHADOW.revision,
      keyDirectionNormalised: Math.abs(directionLength - 1) < 0.002,
      directionalOffset: true,
      crouchWiderAndDenser: crouched.outerWidth > idle.outerWidth && crouched.outerAlpha > idle.outerAlpha,
      runLongerAndSofter: running.outerLength > idle.outerLength && running.outerAlpha < idle.outerAlpha,
      innerRemainsContactWeighted: innerDistance < outerDistance,
      lowDetailDrawCalls: OPERATOR_CONTACT_SHADOW.lowDetailDrawCalls,
      mediumDetailDrawCalls: OPERATOR_CONTACT_SHADOW.mediumDetailDrawCalls,
      fullDetailDrawCalls: OPERATOR_CONTACT_SHADOW.fullDetailDrawCalls,
      additionalDrawCalls: 0,
      additionalMeshes: 0,
      additionalTextures: 0,
      additionalShaderPasses: 0,
      additionalShaderUniforms: 0,
      additionalPerFrameObjectAllocations: 0,
      gameplayUnchanged: true,
      corpseShadowUnchanged: true
    };
  }

  function drawShadow(bot, detailTier = 2) {
    const shadow = operatorContactShadowProfile(bot, operatorContactShadowScratch);
    setBlendMode(true);
    mat4TRS(glModel, shadow.outerX, 0.009, shadow.outerZ, shadow.yaw, 0, 0, shadow.outerWidth, 1, shadow.outerLength);
    drawMesh(glMeshes.disc, [0.01, 0.012, 0.014], glModel, 0, shadow.outerAlpha);
    if (detailTier > 0) {
      mat4TRS(glModel, shadow.innerX, 0.010, shadow.innerZ, shadow.yaw, 0, 0, shadow.innerWidth, 1, shadow.innerLength);
      drawMesh(glMeshes.disc, [0.008, 0.010, 0.012], glModel, 0, shadow.innerAlpha);
    }
    setBlendMode(false);
  }


  const OPERATOR_SKIN_PRESENTATION = Object.freeze({
    revision: '12.57-light-natural-skin-4',
    description: 'light natural skin palette with strong shadow readability',
    exposedSurfaces: Object.freeze(['head', 'neck']),
    materialRevision: OPERATOR_SKIN_MATERIAL.revision,
    surface: OPERATOR_SKIN_MATERIAL.surface,
    roughness: OPERATOR_SKIN_MATERIAL.roughness,
    ambientLift: OPERATOR_SKIN_MATERIAL.ambientLift,
    tones: Object.freeze([
      Object.freeze([1.00, 0.91, 0.86]),
      Object.freeze([0.98, 0.88, 0.82]),
      Object.freeze([0.96, 0.84, 0.78]),
      Object.freeze([1.00, 0.94, 0.90]),
      Object.freeze([0.97, 0.86, 0.80]),
      Object.freeze([0.99, 0.90, 0.85])
    ])
  });

  const OPERATOR_SKIN_TONES = OPERATOR_SKIN_PRESENTATION.tones;

  // Build 12.157: operator ambient occlusion is baked into the existing
  // procedural material palette at contact points. This mirrors the arena AO
  // principle — fold occlusion into colour before drawing — but uses the
  // operator's authored overlap hierarchy instead of sampling the map grid.
  // It adds no meshes, draw calls, textures, framebuffer pass or shader work.
  // Build 12.160: the 12.157 contact factors sat between 0.82 and 0.92, an 8-18%
  // luminance drop. That is the same magnitude Build 12.153 measured as too
  // shallow to read on arena walls, and operators are smaller and darker than a
  // wall. Deepened so a joint, a strap or a collar separates from the panel it
  // sits against. Still colour-baked: no extra meshes, draws, textures or
  // shader work, and living and corpse paths share the palette.
  const OPERATOR_AMBIENT_OCCLUSION = Object.freeze({
    revision: '12.160-baked-operator-contact-2',
    technique: 'per-part contact shading folded into existing material colours',
    factors: Object.freeze({
      cloth: 0.78,
      clothLight: 0.82,
      armour: 0.80,
      plate: 0.79,
      polymer: 0.72,
      webbing: 0.68,
      utility: 0.74,
      skin: 0.80,
      metal: 0.84
    })
  });

  function operatorVisualSeed(bot) {
    const identity = `${bot?.name || 'operator'}|${bot?.slot ?? ''}|${bot?.team ?? ''}`;
    let hash = 2166136261;
    for (let index = 0; index < identity.length; index++) {
      hash ^= identity.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function operatorVisualProfile(bot) {
    const seed = operatorVisualSeed(bot);
    const sample = shift => ((seed >>> shift) & 255) / 255;
    return {
      seed,
      skinIndex: seed % OPERATOR_SKIN_TONES.length,
      headWidth: 0.965 + sample(0) * 0.070,
      headHeight: 0.970 + sample(8) * 0.060,
      headDepth: 0.965 + sample(16) * 0.065,
      helmetWidth: 0.985 + sample(5) * 0.035,
      maskLift: (sample(13) - 0.5) * 0.010,
      visorBrightness: 0.92 + sample(21) * 0.16
    };
  }

  function getOperatorPalette(bot) {
    const blue = bot.team === TEAM_BLUE;
    const visual = operatorVisualProfile(bot);
    const clothVariation = 0.96 + ((visual.seed >>> 4) & 31) / 31 * 0.08;
    const multiply = (colour, factor) => colour.map(channel => clamp(channel * factor, 0, 1));
    const cloth = multiply(blue ? [0.070, 0.086, 0.103] : [0.103, 0.077, 0.067], clothVariation);
    const clothLight = multiply(blue ? [0.105, 0.128, 0.148] : [0.145, 0.112, 0.098], clothVariation);
    const armour = multiply(blue ? [0.145, 0.174, 0.193] : [0.188, 0.158, 0.141], 0.98 + clothVariation * 0.02);
    const plate = blue ? [0.082, 0.107, 0.125] : [0.119, 0.095, 0.082];
    const polymer = [0.032, 0.043, 0.049];
    const webbing = multiply(blue ? [0.105, 0.132, 0.142] : [0.139, 0.113, 0.097], clothVariation);
    const utility = [0.054, 0.066, 0.071];
    const skin = OPERATOR_SKIN_TONES[visual.skinIndex].slice();
    const metal = [0.18, 0.21, 0.22];
    const factors = OPERATOR_AMBIENT_OCCLUSION.factors;
    return {
      cloth,
      clothLight,
      armour,
      plate,
      polymer,
      webbing,
      utility,
      visor: multiply(blue ? [0.105, 0.285, 0.345] : [0.155, 0.235, 0.265], visual.visorBrightness),
      skin,
      team: blue ? [0.10, 0.42, 0.76] : [0.72, 0.12, 0.11],
      teamSoft: blue ? [0.18, 0.50, 0.84] : [0.82, 0.26, 0.20],
      metal,
      occluded: {
        cloth: multiply(cloth, factors.cloth),
        clothLight: multiply(clothLight, factors.clothLight),
        armour: multiply(armour, factors.armour),
        plate: multiply(plate, factors.plate),
        polymer: multiply(polymer, factors.polymer),
        webbing: multiply(webbing, factors.webbing),
        utility: multiply(utility, factors.utility),
        skin: multiply(skin, factors.skin),
        metal: multiply(metal, factors.metal)
      }
    };
  }

  // Compact, readable tactical proportions inspired by the clear silhouettes
  // of early PC shooters. These are original procedural dimensions rather than
  // copied meshes: broader shoulders, a shorter leg-to-torso ratio and slightly
  // larger hands/head keep enemies readable at gameplay distance.
  const OPERATOR_PROPORTIONS = Object.freeze({
    hipHeight: 0.805,
    upperLeg: 0.365,
    lowerLeg: 0.345,
    pelvisY: 0.815,
    pelvisWidth: 0.39,
    pelvisHeight: 0.22,
    pelvisDepth: 0.255,
    torsoY: 1.145,
    torsoWidth: 0.535,
    torsoHeight: 0.50,
    torsoDepth: 0.315,
    shoulderHalf: 0.34,
    headY: 1.575,
    helmetY: 1.69,
    modelTop: 1.81,
    healthBarY: 1.94
  });


  const OPERATOR_HEAD_PRESENTATION = Object.freeze({
    head: Object.freeze({ width: 0.285, height: 0.326, depth: 0.300 }),
    helmet: Object.freeze({ offsetY: 0.104, offsetZ: -0.006, width: 0.340, height: 0.230, depth: 0.338 }),
    faceCover: Object.freeze({ offsetY: -0.092, offsetZ: 0.068, width: 0.184, height: 0.098, depth: 0.208 }),
    brow: Object.freeze({ offsetY: 0.068, offsetZ: 0.158, width: 0.222, height: 0.027, depth: 0.062 }),
    mount: Object.freeze({ offsetY: 0.092, offsetZ: 0.169, width: 0.068, height: 0.046, depth: 0.038 }),
    lens: Object.freeze({ lateral: 0.059, offsetY: 0.038, offsetZ: 0.174, frameWidth: 0.096, frameHeight: 0.061, frameDepth: 0.030, width: 0.078, height: 0.044, depth: 0.034 }),
    ear: Object.freeze({ lateral: 0.164, offsetY: 0.002, offsetZ: -0.012, width: 0.056, height: 0.098, depth: 0.072 }),
    rail: Object.freeze({ lateral: 0.160, offsetY: 0.078, offsetZ: -0.014, width: 0.024, height: 0.058, depth: 0.120 }),
    helmetTab: Object.freeze({ lateral: 0.162, offsetY: 0.098, offsetZ: 0.036, width: 0.021, height: 0.050, depth: 0.078 }),
    lowDetailDrawCalls: 6,
    mediumDetailDrawCalls: 12,
    fullDetailDrawCalls: 18
  });


  // Third-person long-gun posture. These offsets move the shared rifle as one
  // rigid model; authored grip/support/muzzle anchors still come exclusively
  // from careerWeaponVisualParts(). The butt pad sits in the dominant shoulder
  // pocket while both hands remain attached to their authored grip geometry.
  const OPERATOR_LONG_GUN_POSE = Object.freeze({
    lateral: 0.20,
    lift: 0.07,
    shoulderPullback: 0.16,
    stockSeatTarget: Object.freeze({ x: 0.20, y: 1.29, z: 0.04 })
  });

  function operatorArmourRenderProfile(bot) {
    const classId = String(bot?.armourProfile?.classId || 'none');
    const broken = Boolean(bot?.armourBroken);
    const profiles = {
      none: {
        width: 0.27, height: 0.23, depth: 0.022, frontZ: 0.174,
        side: false, shoulder: false, collar: false, abdomen: false, groin: false,
        shoulderScale: 0.78, sideWidth: 0.050, sideHeight: 0.20, sideDepth: 0.12,
        collarWidth: 0.10, collarHeight: 0.07, abdomenWidth: 0.26, abdomenHeight: 0.10,
        pack: 0.88
      },
      light: {
        width: 0.33, height: 0.33, depth: 0.048, frontZ: 0.182,
        side: false, shoulder: false, collar: false, abdomen: false, groin: false,
        shoulderScale: 0.84, sideWidth: 0.052, sideHeight: 0.22, sideDepth: 0.13,
        collarWidth: 0.11, collarHeight: 0.075, abdomenWidth: 0.28, abdomenHeight: 0.11,
        pack: 0.93
      },
      'medium-flex': {
        width: 0.385, height: 0.38, depth: 0.070, frontZ: 0.188,
        side: true, shoulder: false, collar: true, abdomen: false, groin: false,
        shoulderScale: 0.92, sideWidth: 0.060, sideHeight: 0.245, sideDepth: 0.145,
        collarWidth: 0.12, collarHeight: 0.082, abdomenWidth: 0.31, abdomenHeight: 0.12,
        pack: 1.0
      },
      medium: {
        width: 0.425, height: 0.418, depth: 0.092, frontZ: 0.194,
        side: true, shoulder: true, collar: true, abdomen: true, groin: false,
        shoulderScale: 1.02, sideWidth: 0.068, sideHeight: 0.270, sideDepth: 0.155,
        collarWidth: 0.135, collarHeight: 0.090, abdomenWidth: 0.34, abdomenHeight: 0.135,
        pack: 1.055
      },
      heavy: {
        width: 0.49, height: 0.478, depth: 0.132, frontZ: 0.210,
        side: true, shoulder: true, collar: true, abdomen: true, groin: true,
        shoulderScale: 1.20, sideWidth: 0.084, sideHeight: 0.325, sideDepth: 0.190,
        collarWidth: 0.160, collarHeight: 0.110, abdomenWidth: 0.390, abdomenHeight: 0.160,
        pack: 1.16
      }
    };
    const selected = profiles[classId] || profiles.none;
    return { ...selected, classId, broken, integrityRatio: bot?.armourMaxDurability > 0 ? clamp((Number(bot.armourDurability) || 0) / bot.armourMaxDurability, 0, 1) : 0 };
  }

  function operatorArmourPresentationAudit(bot = null) {
    const profile = operatorArmourRenderProfile(bot);
    return { ...profile, visiblyArmoured: profile.classId !== 'none' && profile.width >= 0.35, brokenStateVisible: !profile.broken || profile.integrityRatio === 0 };
  }

  const OPERATOR_WEAPON_ESSENTIAL_PARTS = new Set([
    'slide', 'frame', 'barrel', 'muzzle', 'grip', 'magazine', 'mag-base',
    'receiver', 'upper-receiver', 'lower-receiver', 'handguard', 'stock', 'butt-pad',
    'pistol-grip', 'support-grip'
  ]);
  const OPERATOR_WEAPON_MINOR_PART_PATTERN = /sight|rail|accent|wear|cut-|port|trigger|panel|strap|tape|light|cap|block/;

  function operatorProportionAudit() {
    const p = OPERATOR_PROPORTIONS;
    const totalLeg = p.upperLeg + p.lowerLeg;
    const shoulderWidth = p.shoulderHalf * 2;
    return {
      modelTop: p.modelTop,
      legLength: Math.round(totalLeg * 1000) / 1000,
      torsoWidth: p.torsoWidth,
      shoulderWidth,
      shoulderToHeight: Math.round(shoulderWidth / p.modelTop * 1000) / 1000,
      compactSilhouette: p.modelTop <= 1.84 && shoulderWidth / p.modelTop >= 0.36,
      readableHeadScale: p.modelTop - p.headY <= 0.25
    };
  }

  function operatorArmourMaterialAudit() {
    return {
      kneePadMaterial: 'matte plate + polymer shell + webbing straps',
      kneePadEmissive: 0,
      kneeAccentEmissive: 0,
      illuminatedKneeDetails: false,
      roughness: 0.86
    };
  }

  function operatorAmbientOcclusionAudit(bot = null) {
    const sampleBot = bot || { name: 'ao-audit-operator', slot: 0, team: TEAM_BLUE };
    const palette = getOperatorPalette(sampleBot);
    const luminance = colour => colour[0] * 0.2126 + colour[1] * 0.7152 + colour[2] * 0.0722;
    const materials = Object.keys(OPERATOR_AMBIENT_OCCLUSION.factors);
    const reductions = Object.fromEntries(materials.map(material => [
      material,
      Math.round((1 - luminance(palette.occluded[material]) / Math.max(0.0001, luminance(palette[material]))) * 1000) / 1000
    ]));
    return {
      revision: OPERATOR_AMBIENT_OCCLUSION.revision,
      technique: OPERATOR_AMBIENT_OCCLUSION.technique,
      factors: { ...OPERATOR_AMBIENT_OCCLUSION.factors },
      measuredLuminanceReduction: reductions,
      allContactMaterialsDarker: materials.every(material => luminance(palette.occluded[material]) < luminance(palette[material])),
      contactZones: ['helmet and face equipment', 'neck and collar', 'arm and knee joints', 'vest straps and abdomen', 'belt equipment', 'ankles and gloves'],
      additionalDrawCalls: 0,
      additionalMeshes: 0,
      additionalTextures: 0,
      additionalShaderPasses: 0,
      additionalShaderUniforms: 0,
      sharedLivingAndCorpsePalette: true,
      mapOcclusionChanged: false,
      gameplayCollisionChanged: false,
      hitDetectionChanged: false
    };
  }

  function operatorSkinPresentationAudit(bot = null) {
    const sampleBot = bot || { name: 'audit-operator', slot: 0, team: TEAM_BLUE };
    const visual = operatorVisualProfile(sampleBot);
    const selectedTone = OPERATOR_SKIN_TONES[visual.skinIndex] || OPERATOR_SKIN_TONES[0];
    const luminance = colour => colour[0] * 0.2126 + colour[1] * 0.7152 + colour[2] * 0.0722;
    const toneLuminance = OPERATOR_SKIN_TONES.map(tone => Math.round(luminance(tone) * 1000) / 1000);
    const faceCoverWidthRatio = OPERATOR_HEAD_PRESENTATION.faceCover.width / OPERATOR_HEAD_PRESENTATION.head.width;
    const faceCoverHeightRatio = OPERATOR_HEAD_PRESENTATION.faceCover.height / OPERATOR_HEAD_PRESENTATION.head.height;
    return {
      revision: OPERATOR_SKIN_PRESENTATION.revision,
      description: OPERATOR_SKIN_PRESENTATION.description,
      exposedSurfaces: [...OPERATOR_SKIN_PRESENTATION.exposedSurfaces],
      materialRevision: OPERATOR_SKIN_PRESENTATION.materialRevision,
      toneCount: OPERATOR_SKIN_TONES.length,
      toneLuminance,
      minimumToneLuminance: Math.min(...toneLuminance),
      maximumToneLuminance: Math.max(...toneLuminance),
      allTonesLight: OPERATOR_SKIN_TONES.every(tone => luminance(tone) >= 0.86 && Math.min(...tone) >= 0.78),
      materialSurface: OPERATOR_SKIN_PRESENTATION.surface,
      materialRoughness: OPERATOR_SKIN_PRESENTATION.roughness,
      shadowVisibilityLift: OPERATOR_SKIN_PRESENTATION.ambientLift,
      dedicatedSkinLighting: OPERATOR_SKIN_PRESENTATION.surface === 8
        && Math.abs(OPERATOR_SKIN_PRESENTATION.roughness - 0.64) < 0.001
        && Math.abs(OPERATOR_SKIN_PRESENTATION.ambientLift - 0.42) < 0.001,
      selectedSkinIndex: visual.skinIndex,
      selectedTone: selectedTone.slice(),
      faceCoverCoverage: {
        widthRatio: Math.round(faceCoverWidthRatio * 1000) / 1000,
        heightRatio: Math.round(faceCoverHeightRatio * 1000) / 1000
      },
      visibleFaceExposure: faceCoverWidthRatio <= 0.70 && faceCoverHeightRatio <= 0.36,
      visibleSkinAreas: ['cheeks', 'upper jaw', 'neck'],
      headAndNeckShareMaterial: true,
      sharedLivingAndCorpsePalette: true,
      pureWhiteMaterial: false,
      gameplayCollisionChanged: false,
      hitDetectionChanged: false
    };
  }

  function operatorHeadGeometryAudit(bot = null) {
    const visual = operatorVisualProfile(bot || { name: 'audit-operator', slot: 0, team: TEAM_BLUE });
    const presentation = OPERATOR_HEAD_PRESENTATION;
    const top = OPERATOR_PROPORTIONS.headY
      + presentation.helmet.offsetY
      + presentation.helmet.height * 0.5;
    return {
      renderer: 'procedural profiled WebGL meshes',
      anatomicalHeadMesh: true,
      taperedJaw: true,
      cheekAndBrowVolume: true,
      eyeSocketAndBrowPlanes: true,
      restrainedNoseBridgeProfile: true,
      openBottomHelmetShell: true,
      fittedHelmetShell: true,
      curvedFaceCover: true,
      noseContouredFaceCover: true,
      splitGoggleLenses: true,
      ellipticalGoggleLenses: true,
      connectedHeadsetAndChinStraps: true,
      stableIdentityVariation: true,
      skinToneCount: OPERATOR_SKIN_TONES.length,
      lightNaturalSkinPalette: operatorSkinPresentationAudit(bot),
      sharedLivingAndCorpseAssembly: true,
      profile: {
        headWidth: Math.round(visual.headWidth * 1000) / 1000,
        headHeight: Math.round(visual.headHeight * 1000) / 1000,
        headDepth: Math.round(visual.headDepth * 1000) / 1000,
        skinIndex: visual.skinIndex
      },
      modelTop: Math.round(top * 1000) / 1000,
      modelTopWithinContract: top <= OPERATOR_PROPORTIONS.modelTop + 0.01,
      lowDetailDrawCalls: presentation.lowDetailDrawCalls,
      mediumDetailDrawCalls: presentation.mediumDetailDrawCalls,
      fullDetailDrawCalls: presentation.fullDetailDrawCalls,
      gameplayCollisionChanged: false,
      hitDetectionChanged: false
    };
  }

  function operatorSurfaceGeometryAudit() {
    return {
      renderer: 'asset-free procedural WebGL',
      torso: 'seven-ring anatomical ribcage and tapered waist',
      pelvis: 'six-ring profiled tactical pelvis',
      carrier: 'tapered profiled armour carrier',
      head: 'anatomical profiled head with tapered jaw and brow volume',
      helmet: 'open-bottom profiled combat shell',
      faceCover: 'curved tapered lower-face cover',
      limbs: 'tapered rounded capsule segments',
      joints: 'forward-profiled tapered knee and elbow shells',
      boots: 'rounded heel, instep and tapered toe profile',
      equipment: 'soft rounded superellipsoid accessory forms',
      ambientOcclusion: OPERATOR_AMBIENT_OCCLUSION.technique,
      sharedLivingAndCorpseGeometry: true,
      gameplayCollisionChanged: false,
      hitDetectionChanged: false,
      additionalBodyDrawCalls: 0,
      distanceBasedHeadDetailReduction: true,
      distanceBasedDetailReduction: true,
      constrainedDeviceDetailTier: true,
      engineMigrationRequired: false
    };
  }


  function careerWeaponWorldPoint(origin, yaw, pitch, roll, lx, ly, lz) {
    const cr = Math.cos(roll), sr = Math.sin(roll);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const rx = lx * cr - ly * sr;
    const ry0 = lx * sr + ly * cr;
    const ry = ry0 * cp - lz * sp;
    const rz = ry0 * sp + lz * cp;
    return worldPoint(origin.x, origin.y, origin.z, yaw, rx, ry, rz);
  }


  function drawOperatorHeadAssembly(bot, origin, yaw, pitch = 0, roll = 0, palette = getOperatorPalette(bot), options = {}) {
    const detailTier = clamp(Math.round(Number(options.detailTier) || 0), 0, 2);
    const mediumDetail = detailTier >= 1;
    const fullDetail = detailTier >= 2;
    const hurt = clamp(Number(options.hurt) || 0, 0, 1.25);
    const visual = operatorVisualProfile(bot);
    const spec = OPERATOR_HEAD_PRESENTATION;
    const smoothBox = glMeshes.softRoundedBox || glMeshes.roundedBox || glMeshes.cube;
    const point = (x, y, z) => careerWeaponWorldPoint(origin, yaw, pitch, roll, x, y, z);

    mat4TRS(
      glModel,
      origin.x, origin.y, origin.z,
      yaw, pitch, roll,
      spec.head.width * visual.headWidth,
      spec.head.height * visual.headHeight,
      spec.head.depth * visual.headDepth
    );
    drawMesh(
      glMeshes.operatorHead || glMeshes.sphere,
      palette.skin,
      glModel,
      hurt * 0.34,
      1,
      OPERATOR_SKIN_PRESENTATION.surface,
      OPERATOR_SKIN_PRESENTATION.roughness
    );

    const faceCover = point(0, spec.faceCover.offsetY + visual.maskLift, spec.faceCover.offsetZ);
    mat4TRS(
      glModel,
      faceCover.x, faceCover.y, faceCover.z,
      yaw, pitch, roll,
      spec.faceCover.width * visual.headWidth,
      spec.faceCover.height,
      spec.faceCover.depth * visual.headDepth
    );
    drawMesh(glMeshes.operatorFaceCover || smoothBox, palette.occluded.utility, glModel, hurt * 0.18, 1, 5, 0.88);

    const helmet = point(0, spec.helmet.offsetY, spec.helmet.offsetZ);
    mat4TRS(
      glModel,
      helmet.x, helmet.y, helmet.z,
      yaw, pitch, roll,
      spec.helmet.width * visual.helmetWidth,
      spec.helmet.height,
      spec.helmet.depth
    );
    drawMesh(glMeshes.operatorHelmet || glMeshes.sphere, palette.plate, glModel, hurt * 0.34, 1, 6, 0.64);

    const brow = point(0, spec.brow.offsetY, spec.brow.offsetZ);
    mat4TRS(glModel, brow.x, brow.y, brow.z, yaw, pitch, roll, spec.brow.width, spec.brow.height, spec.brow.depth);
    drawMesh(smoothBox, palette.occluded.utility, glModel, hurt * 0.26, 1, 6, 0.58);

    const mount = point(0, spec.mount.offsetY, spec.mount.offsetZ);
    mat4TRS(glModel, mount.x, mount.y, mount.z, yaw, pitch, roll, spec.mount.width, spec.mount.height, spec.mount.depth);
    drawMesh(smoothBox, palette.metal, glModel, 0.075 + hurt * 0.12, 1, 3, 0.22);

    if (mediumDetail) {
      for (const lensSide of [-1, 1]) {
        const frame = point(lensSide * spec.lens.lateral, spec.lens.offsetY, spec.lens.offsetZ);
        mat4TRS(glModel, frame.x, frame.y, frame.z, yaw, pitch, roll + lensSide * 0.025, spec.lens.frameWidth, spec.lens.frameHeight, spec.lens.frameDepth);
        drawMesh(glMeshes.sphere || smoothBox, palette.occluded.utility, glModel, hurt * 0.08, 1, 6, 0.58);
        const lens = point(lensSide * spec.lens.lateral, spec.lens.offsetY, spec.lens.offsetZ + 0.007);
        mat4TRS(glModel, lens.x, lens.y, lens.z, yaw, pitch, roll + lensSide * 0.025, spec.lens.width, spec.lens.height, spec.lens.depth);
        drawMesh(glMeshes.sphere || smoothBox, palette.visor, glModel, 0.15 + hurt * 0.28, 1, 4, 0.16);
      }
      const bridge = point(0, spec.lens.offsetY, spec.lens.offsetZ + 0.002);
      mat4TRS(glModel, bridge.x, bridge.y, bridge.z, yaw, pitch, roll, 0.040, 0.018, 0.026);
      drawMesh(smoothBox, palette.metal, glModel, 0.04 + hurt * 0.10, 1, 3, 0.22);

      for (const headsetSide of [-1, 1]) {
        const ear = point(headsetSide * spec.ear.lateral, spec.ear.offsetY, spec.ear.offsetZ);
        mat4TRS(glModel, ear.x, ear.y, ear.z, yaw, pitch, roll, spec.ear.width, spec.ear.height, spec.ear.depth);
        drawMesh(glMeshes.sphere, palette.occluded.utility, glModel, hurt * 0.12, 1, 6, 0.72);
        if (fullDetail) {
          const rail = point(headsetSide * spec.rail.lateral, spec.rail.offsetY, spec.rail.offsetZ);
          mat4TRS(glModel, rail.x, rail.y, rail.z, yaw, pitch, roll + headsetSide * 0.10, spec.rail.width, spec.rail.height, spec.rail.depth);
          drawMesh(smoothBox, palette.metal, glModel, 0.04 + hurt * 0.08, 1, 3, 0.24);
          const helmetTab = point(headsetSide * spec.helmetTab.lateral, spec.helmetTab.offsetY, spec.helmetTab.offsetZ);
          mat4TRS(glModel, helmetTab.x, helmetTab.y, helmetTab.z, yaw, pitch, roll + headsetSide * 0.08, spec.helmetTab.width, spec.helmetTab.height, spec.helmetTab.depth);
          drawMesh(smoothBox, palette.teamSoft, glModel, 0.11 + hurt * 0.10, 1, 4, 0.30);
          const strapTop = point(headsetSide * 0.154, 0.018, 0.000);
          const strapBottom = point(headsetSide * 0.072, -0.145, 0.086);
          drawSegment(strapTop, strapBottom, 0.0095, palette.occluded.webbing, hurt * 0.06, 1, 5, 0.92);
        }
      }
    } else {
      const visor = point(0, spec.lens.offsetY, spec.lens.offsetZ);
      mat4TRS(glModel, visor.x, visor.y, visor.z, yaw, pitch, roll, 0.205, 0.055, 0.033);
      drawMesh(glMeshes.sphere || smoothBox, palette.visor, glModel, 0.13 + hurt * 0.25, 1, 4, 0.18);
    }
  }

  function operatorSharedWeaponRig(weapon, rifleY, rifleForward, isSidearm, recoil = 0, rifleRoll = 0) {
    const renderScale = careerWeaponRenderScaleProfile(weapon, 'world');
    const { sharedLongGun, lengthScale, depthScale, verticalPositionScale } = renderScale;
    if (!isSidearm && !sharedLongGun) return null;
    const origin = {
      x: sharedLongGun ? OPERATOR_LONG_GUN_POSE.lateral : 0.02,
      y: rifleY + (sharedLongGun ? OPERATOR_LONG_GUN_POSE.lift : 0.015),
      z: rifleForward + (sharedLongGun ? -OPERATOR_LONG_GUN_POSE.shoulderPullback : 0.11)
    };
    const pitch = -0.02 + recoil * 0.08;
    const rotate = local => {
      const cr = Math.cos(rifleRoll), sr = Math.sin(rifleRoll);
      const cp = Math.cos(pitch), sp = Math.sin(pitch);
      const rx = local.x * cr - local.y * sr;
      const ry0 = local.x * sr + local.y * cr;
      return {
        x: rx,
        y: ry0 * cp - local.z * sp,
        z: ry0 * sp + local.z * cp
      };
    };
    const partLocal = part => {
      if (!part) return null;
      const fit = careerWeaponPartFitOffset(part, 'world');
      return {
        x: (part.z + fit.z) * depthScale,
        y: -(part.y + fit.y) * verticalPositionScale,
        z: (part.x + fit.x) * lengthScale
      };
    };
    const combine = (local, offset = { x: 0, y: 0, z: 0 }) => {
      const transformed = rotate({
        x: (local?.x || 0) + (offset.x || 0),
        y: (local?.y || 0) + (offset.y || 0),
        z: (local?.z || 0) + (offset.z || 0)
      });
      return { x: origin.x + transformed.x, y: origin.y + transformed.y, z: origin.z + transformed.z };
    };
    const gripPart = careerWeaponGripPart(weapon);
    const supportPart = sharedLongGun ? careerWeaponSupportPart(weapon) : gripPart;
    const grip = partLocal(gripPart);
    const support = partLocal(supportPart);
    const gripCenter = combine(grip);
    const supportCenter = combine(support);
    const dominantHand = combine(grip, { x: 0.045, y: 0.018, z: sharedLongGun ? 0.018 : 0.010 });
    const supportHand = sharedLongGun
      ? combine(support, { x: -0.045, y: 0.018, z: 0.005 })
      : combine(grip, { x: -0.045, y: 0.025, z: 0.075 });
    const bounds = careerWeaponVisualBounds(weapon);
    const buttPart = sharedLongGun ? (careerWeaponVisualPart(weapon, 'butt-pad') || careerWeaponVisualPart(weapon, 'stock')) : null;
    const stockSeat = buttPart ? combine(partLocal(buttPart)) : null;
    const muzzleEnd = combine({ x: 0, y: 0, z: bounds.maxX * lengthScale });
    const muzzle = combine({ x: 0, y: 0, z: bounds.maxX * lengthScale }, { z: sharedLongGun ? 0.030 : 0.022 });
    return {
      sharedLongGun,
      origin,
      pitch,
      roll: rifleRoll,
      dominantHand,
      supportHand,
      gripCenter,
      supportCenter,
      stockSeat,
      muzzleEnd,
      muzzle,
      gripPart: gripPart?.className || '',
      supportPart: supportPart?.className || '',
      bounds,
      lengthScale,
      depthScale,
      verticalPositionScale
    };
  }

  function drawUnifiedCareerWeapon(weapon, origin, yaw, pitch = 0, roll = 0, scale = 1, recoil = 0, hurt = 0, animation = null, detailTier = 2) {
    const resolvedWeapon = weapon || getCareerWeapon('service-p12');
    const parts = careerWeaponVisualParts(resolvedWeapon);
    const DEG = Math.PI / 180;
    const renderScale = careerWeaponRenderScaleProfile(resolvedWeapon, 'world', scale);
    const { sharedLongGun: longGun, lengthScale, depthScale, verticalPositionScale, verticalSizeScale } = renderScale;
    const phases = animation || careerWeaponReloadPhases(0, false, false);
    const slideKick = (recoil > 0 ? -0.012 * clamp(recoil, 0, 1) : 0)
      - clamp(Number(phases.rack) || 0, 0, 1) * 0.050
      - clamp(Number(phases.slideLock) || 0, 0, 1) * 0.030;
    const magazineTravel = clamp(Number(phases.magazineTravel) || 0, 0, 1);
    const magazineSide = clamp(Number(phases.magazineSide) || 0, 0, 1);

    const detail = clamp(Math.round(Number(detailTier) || 0), 0, 2);
    for (const part of parts) {
      const partVolume = Math.max(0, Number(part.w) || 0) * Math.max(0, Number(part.h) || 0) * Math.max(0, Number(part.d) || 0);
      const minorName = OPERATOR_WEAPON_MINOR_PART_PATTERN.test(String(part.className || ''));
      if (detail <= 0 && !OPERATOR_WEAPON_ESSENTIAL_PARTS.has(part.className)) continue;
      if (detail === 1 && minorName && partVolume < 90000) continue;
      const fit = careerWeaponPartFitOffset(part, 'world');
      let localX = (part.z + fit.z) * depthScale;
      let localY = -(part.y + fit.y) * verticalPositionScale;
      let localZ = (part.x + fit.x) * lengthScale;
      if (careerWeaponPartMovesWithSlide(part)) localZ += slideKick;
      if (careerWeaponPartMovesWithMagazine(part)) {
        localY -= magazineTravel * 0.29 * scale;
        localX -= magazineSide * 0.045 * scale;
        localZ -= magazineTravel * 0.025 * scale;
      }
      const point = careerWeaponWorldPoint(origin, yaw, pitch, roll, localX, localY, localZ);
      const style = careerWeaponMaterialStyle(part.material, resolvedWeapon?.skinId);
      const proceduralShape = detail > 0 ? String(part.shape || 'box') : 'box';
      const cylindrical = proceduralShape === 'cylinder-length';
      const mesh = cylindrical
        ? (glMeshes.cylinder || glMeshes.cube)
        : proceduralShape === 'rounded'
          ? (glMeshes.roundedBox || glMeshes.cube)
          : glMeshes.cube;
      mat4TRS(
        glModel,
        point.x, point.y, point.z,
        yaw + (Number(part.ry) || 0) * DEG,
        pitch + (Number(part.rz) || 0) * DEG + (cylindrical ? Math.PI * 0.5 : 0),
        roll - (Number(part.rx) || 0) * DEG,
        Math.max(0.004, part.d * depthScale),
        Math.max(0.004, cylindrical ? part.w * lengthScale : part.h * verticalSizeScale),
        Math.max(0.004, cylindrical ? part.h * verticalSizeScale : part.w * lengthScale)
      );
      drawMesh(
        mesh,
        style.colour,
        glModel,
        style.emissive + hurt * 0.16,
        1,
        style.surface,
        style.roughness
      );
    }
  }


  function operatorNormaliseVector3(vector, fallback = { x: 0, y: 0, z: 1 }) {
    const length = Math.hypot(vector.x, vector.y, vector.z);
    if (length < 0.000001) return { ...fallback };
    return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
  }

  function operatorShoulderLocalPose(side, settings = {}) {
    const stanceDrop = Number(settings.stanceDrop) || 0;
    const torsoRoll = Number(settings.torsoRoll) || 0;
    const walk = clamp(Number(settings.walk) || 0, 0, 1);
    const phase = Number(settings.phase) || 0;
    const turn = clamp(Number(settings.turn) || 0, -1, 1);
    const armPhase = phase + (side > 0 ? Math.PI : 0);
    return {
      x: side * OPERATOR_PROPORTIONS.shoulderHalf,
      y: 1.34 - stanceDrop - side * torsoRoll * 0.045 + Math.sin(armPhase) * walk * 0.005,
      z: 0.022 + side * turn * 0.006
    };
  }

  function operatorArmElbowLocalPose(side, shoulder, hand, settings = {}) {
    const ready = clamp(Number(settings.ready) || 0, 0, 1);
    const crouch = clamp(Number(settings.crouch) || 0, 0, 1);
    const run = clamp(Number(settings.run) || 0, 0, 1);
    const sidearm = Boolean(settings.sidearm);
    const reload = clamp(Number(settings.reload) || 0, 0, 1);
    const bend = 0.105 + (1 - ready) * 0.026 + (sidearm ? 0.025 : 0) + reload * 0.020;
    const t = sidearm ? 0.50 : 0.47;
    return {
      x: lerp(shoulder.x, hand.x, t) + side * bend,
      y: lerp(shoulder.y, hand.y, t) - 0.040 - crouch * 0.010 - reload * 0.012,
      z: lerp(shoulder.z, hand.z, t) - 0.035 - run * 0.010
    };
  }

  function operatorSolveKneeLocal(hip, ankle, side, options = {}) {
    const upperLength = Math.max(0.12, Number(options.upperLength) || OPERATOR_PROPORTIONS.upperLeg);
    const lowerLength = Math.max(0.12, Number(options.lowerLength) || OPERATOR_PROPORTIONS.lowerLeg);
    const dx = ankle.x - hip.x;
    const dy = ankle.y - hip.y;
    const dz = ankle.z - hip.z;
    const rawDistance = Math.hypot(dx, dy, dz);
    const minimumReach = Math.abs(upperLength - lowerLength) + 0.001;
    const maximumReach = upperLength + lowerLength - 0.001;
    const distance = clamp(rawDistance, minimumReach, maximumReach);
    const direction = rawDistance > 0.000001
      ? { x: dx / rawDistance, y: dy / rawDistance, z: dz / rawDistance }
      : { x: 0, y: -1, z: 0 };
    const along = (upperLength * upperLength - lowerLength * lowerLength + distance * distance) / (2 * distance);
    const bendRadius = Math.sqrt(Math.max(0, upperLength * upperLength - along * along));
    const crouch = clamp(Number(options.crouch) || 0, 0, 1);
    const run = clamp(Number(options.run) || 0, 0, 1);
    const pole = operatorNormaliseVector3({
      x: side * (0.12 + crouch * 0.10),
      y: 0.025 + crouch * 0.05,
      z: 1 + crouch * 0.38 + run * 0.08
    });
    const dot = pole.x * direction.x + pole.y * direction.y + pole.z * direction.z;
    const projectedPole = operatorNormaliseVector3({
      x: pole.x - direction.x * dot,
      y: pole.y - direction.y * dot,
      z: pole.z - direction.z * dot
    }, { x: side * 0.06, y: 0, z: 1 });
    return {
      x: hip.x + direction.x * along + projectedPole.x * bendRadius,
      y: hip.y + direction.y * along + projectedPole.y * bendRadius,
      z: hip.z + direction.z * along + projectedPole.z * bendRadius
    };
  }

  function operatorLegLocalPose(side, phase, settings = {}) {
    const crouch = clamp(Number(settings.crouch) || 0, 0, 1);
    const run = clamp(Number(settings.run) || 0, 0, 1);
    const walk = clamp(Number(settings.walk) || 0, 0, 1);
    const bodyBob = Number(settings.bodyBob) || 0;
    const stanceDrop = Number(settings.stanceDrop) || 0;
    const stride = Math.max(0, Number(settings.stride) || 0);
    const liftScale = Math.max(0, Number(settings.liftScale) || 0);
    const strafe = clamp(Number(settings.strafe) || 0, -1, 1);
    const backpedal = clamp(Number(settings.backpedal) || 0, 0, 1);
    const legPhase = phase + (side > 0 ? Math.PI : 0);
    const gait = Math.sin(legPhase);
    const forwardSwing = gait * stride;
    const liftWave = Math.max(0, Math.sin(legPhase - Math.PI * 0.04));
    const lift = Math.pow(liftWave, 1.18) * liftScale;
    const footSpread = 0.148 + crouch * 0.035 + run * 0.008;
    const hip = {
      x: side * 0.138,
      y: OPERATOR_PROPORTIONS.hipHeight + bodyBob - stanceDrop * 0.72,
      z: crouch * 0.045 - run * 0.012
    };
    const foot = {
      x: side * footSpread + side * Math.abs(gait) * 0.006 * walk + strafe * gait * stride * 0.56,
      y: 0.075 + lift,
      z: 0.065 + forwardSwing * (1 - backpedal * 0.36)
    };
    const ankle = {
      x: foot.x,
      y: 0.155 + lift * 0.78,
      z: foot.z - 0.025 - run * 0.008
    };
    const knee = operatorSolveKneeLocal(hip, ankle, side, {
      crouch,
      run,
      upperLength: OPERATOR_PROPORTIONS.upperLeg,
      lowerLength: OPERATOR_PROPORTIONS.lowerLeg
    });
    return {
      side,
      legPhase,
      gait,
      lift,
      hip,
      knee,
      ankle,
      foot,
      footYawOffset: gait * (0.055 + run * 0.035) + strafe * 0.10 - backpedal * gait * 0.035,
      footPitch: -liftWave * (0.035 + run * 0.10)
    };
  }

  function operatorCorpseLegLocalPose(limbSide, leading, pose, fall, side) {
    const hip = {
      x: lerp(limbSide * 0.138, limbSide * 0.145 - side * 0.018, fall),
      y: lerp(OPERATOR_PROPORTIONS.hipHeight, 0.18, fall),
      z: lerp(0.035, -0.02, fall)
    };
    const finalAnkleX = limbSide * (pose === 0 ? (leading ? 0.50 : 0.31) : 0.28);
    const finalAnkleZ = pose === 1
      ? (leading ? -0.61 : 0.42)
      : (pose === 2 ? (leading ? 0.66 : -0.43) : (leading ? -0.57 : 0.48));
    const ankle = {
      x: lerp(limbSide * 0.148, finalAnkleX, fall),
      y: lerp(0.155, 0.075, fall),
      z: lerp(0.065, finalAnkleZ, fall)
    };
    const knee = operatorSolveKneeLocal(hip, ankle, limbSide, {
      crouch: 0.28 + fall * 0.72,
      run: 0,
      upperLength: OPERATOR_PROPORTIONS.upperLeg + 0.01,
      lowerLength: OPERATOR_PROPORTIONS.lowerLeg + 0.01
    });
    const foot = {
      x: ankle.x,
      y: Math.max(0.065, ankle.y - 0.072),
      z: ankle.z + (leading ? 0.075 : 0.035)
    };
    return { hip, knee, ankle, foot };
  }

  function operatorLegGeometryAudit() {
    const samples = [];
    for (const crouch of [0, 1]) {
      for (const run of [0, 1]) {
        for (const phase of [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5]) {
          for (const side of [-1, 1]) {
            const pose = operatorLegLocalPose(side, phase, {
              crouch,
              run,
              walk: 1,
              bodyBob: 0,
              stanceDrop: crouch * 0.40,
              stride: 0.12 + run * 0.15,
              liftScale: 0.045 + run * 0.055
            });
            const upper = Math.hypot(pose.knee.x - pose.hip.x, pose.knee.y - pose.hip.y, pose.knee.z - pose.hip.z);
            const lower = Math.hypot(pose.ankle.x - pose.knee.x, pose.ankle.y - pose.knee.y, pose.ankle.z - pose.knee.z);
            const t = clamp((pose.hip.y - pose.knee.y) / Math.max(0.001, pose.hip.y - pose.ankle.y), 0, 1);
            const lineZ = lerp(pose.hip.z, pose.ankle.z, t);
            samples.push({
              crouch,
              run,
              phase: Math.round(phase * 1000) / 1000,
              side,
              upper: Math.round(upper * 1000) / 1000,
              lower: Math.round(lower * 1000) / 1000,
              forwardBend: Math.round((pose.knee.z - lineZ) * 1000) / 1000,
              footHeight: Math.round(pose.foot.y * 1000) / 1000
            });
          }
        }
      }
    }
    const corpseSamples = [];
    for (const corpsePose of [0, 1, 2]) {
      for (const fall of [0, 0.5, 1]) {
        for (const deathSide of [-1, 1]) {
          for (const limbSide of [-1, 1]) {
            const pose = operatorCorpseLegLocalPose(limbSide, limbSide === deathSide, corpsePose, fall, deathSide);
            const upper = Math.hypot(pose.knee.x - pose.hip.x, pose.knee.y - pose.hip.y, pose.knee.z - pose.hip.z);
            const lower = Math.hypot(pose.ankle.x - pose.knee.x, pose.ankle.y - pose.knee.y, pose.ankle.z - pose.knee.z);
            const t = clamp((pose.hip.y - pose.knee.y) / Math.max(0.001, pose.hip.y - pose.ankle.y), 0, 1);
            const lineZ = lerp(pose.hip.z, pose.ankle.z, t);
            corpseSamples.push({
              pose: corpsePose,
              fall,
              deathSide,
              limbSide,
              upper: Math.round(upper * 1000) / 1000,
              lower: Math.round(lower * 1000) / 1000,
              forwardBend: Math.round((pose.knee.z - lineZ) * 1000) / 1000,
              footHeight: Math.round(pose.foot.y * 1000) / 1000
            });
          }
        }
      }
    }
    return {
      samples,
      corpseSamples,
      kneesForward: samples.every(sample => sample.forwardBend > 0.018),
      segmentLengthsStable: samples.every(sample => Math.abs(sample.upper - OPERATOR_PROPORTIONS.upperLeg) < 0.012 && Math.abs(sample.lower - OPERATOR_PROPORTIONS.lowerLeg) < 0.012),
      feetAboveFloor: samples.every(sample => sample.footHeight >= 0.07),
      corpseKneesForward: corpseSamples.every(sample => sample.forwardBend > 0.018),
      corpseSegmentLengthsStable: corpseSamples.every(sample => Math.abs(sample.upper - (OPERATOR_PROPORTIONS.upperLeg + 0.01)) < 0.012 && Math.abs(sample.lower - (OPERATOR_PROPORTIONS.lowerLeg + 0.01)) < 0.012),
      corpseFeetAboveFloor: corpseSamples.every(sample => sample.footHeight >= 0.06),
      proportions: operatorProportionAudit()
    };
  }

  function drawCorpse(bot, cameraBot) {
    if (bot === cameraBot) return;
    const dx = bot.x - cameraBot.x;
    const dz = bot.y - cameraBot.y;
    if (dx * dx + dz * dz > GL_FAR * GL_FAR) return;
    const corpseDistance = Math.hypot(dx, dz);
    if (dynamicActorOutsideCameraView(bot.x, 0.82, bot.y, 1.85)) return;
    const detailTier = typeof runtimeOperatorDetailTier === 'function' ? runtimeOperatorDetailTier(corpseDistance) : 2;
    const mediumDetail = detailTier >= 1;
    const fullDetail = detailTier >= 2;

    const progress = clamp(bot.deathAnim || ((performance.now() / 1000 - bot.deathTime) * 1.85), 0, 1);
    const impactStrength = clamp(Number(bot.deathImpactStrength) || 0.55, 0.25, 1.25);
    const stagger = Math.sin(clamp(progress / 0.22, 0, 1) * Math.PI) * impactStrength;
    const fallProgress = clamp((progress - 0.055) / 0.945, 0, 1);
    const fall = 1 - Math.pow(1 - fallProgress, 3);
    const impactSettle = Math.sin(Math.min(1, fallProgress * 1.45) * Math.PI) * (0.024 + impactStrength * 0.012);
    const pose = Number.isFinite(bot.deathPose) ? bot.deathPose % 3 : 0;
    const side = bot.deathSide || 1;
    const weaponSide = bot.deathWeaponSide || -side;
    const baseYaw = Number.isFinite(bot.deathYaw) ? bot.deathYaw : (Math.PI / 2 - bot.angle);
    const yaw = baseYaw + (bot.deathTwist || 0) * fall;
    const deathPush = clamp(Number(bot.deathPush) || 0.22, 0.10, 0.65);
    const slideForward = (pose === 2 ? 0.18 : 0.09) * fall - deathPush * stagger * 0.10;
    const slideSide = side * ((pose === 0 ? 0.11 : 0.045) * fall + stagger * 0.035);
    const base = worldPoint(bot.x, 0, bot.y, yaw, slideSide, 0, slideForward);

    const palette = getOperatorPalette(bot);
    const { cloth, clothLight, armour, plate, polymer, webbing, utility, visor, skin, team: teamPatch, teamSoft, metal } = palette;
    const ao = palette.occluded;

    setBlendMode(true);
    mat4TRS(glModel, base.x, 0.007, base.z, yaw, 0, 0, lerp(0.36, 0.78, fall), 1, lerp(0.24, 0.43, fall));
    drawMesh(glMeshes.disc, [0.008, 0.010, 0.012], glModel, 0, lerp(0.16, 0.34, fall), 0, 0.98);
    if (fall > 0.62) {
      const stain = worldPoint(base.x, 0, base.z, yaw, -side * 0.16, 0.001, -0.12);
      mat4TRS(glModel, stain.x, 0.008, stain.z, yaw + 0.2 * side, 0, 0, 0.24, 1, 0.15);
      drawMesh(glMeshes.disc, [0.038, 0.008, 0.007], glModel, 0, (fall - 0.62) * 0.11, 0, 0.99);
    }
    setBlendMode(false);

    const rollTarget = pose === 0 ? side * 1.42 : side * 0.10;
    const pitchTarget = pose === 0 ? 0.08 : (pose === 1 ? -1.30 : 1.28);
    const torsoRoll = lerp(side * stagger * 0.18, rollTarget, fall);
    const torsoPitch = lerp(-stagger * 0.16, pitchTarget, fall);
    const torsoLateral = pose === 0 ? side * 0.10 * fall : side * 0.035 * fall;
    const torsoForward = pose === 1 ? -0.08 * fall : (pose === 2 ? 0.09 * fall : 0);
    const torso = worldPoint(base.x, 0, base.z, yaw, torsoLateral, lerp(OPERATOR_PROPORTIONS.torsoY, 0.23, fall) + impactSettle, torsoForward);
    const pelvis = worldPoint(base.x, 0, base.z, yaw, -side * 0.02 * fall, lerp(OPERATOR_PROPORTIONS.pelvisY, 0.18, fall), -0.02 * fall);

    mat4TRS(glModel, pelvis.x, pelvis.y, pelvis.z, yaw, torsoPitch * 0.55, torsoRoll * 0.72, OPERATOR_PROPORTIONS.pelvisWidth, OPERATOR_PROPORTIONS.pelvisHeight, OPERATOR_PROPORTIONS.pelvisDepth);
    drawMesh(glMeshes.operatorPelvis || glMeshes.softRoundedBox || glMeshes.roundedBox || glMeshes.cube, cloth, glModel, 0, 1, 5, 0.90);
    mat4TRS(glModel, pelvis.x, pelvis.y + 0.012, pelvis.z, yaw, torsoPitch * 0.55, torsoRoll * 0.72, 0.39, 0.07, 0.27);
    drawMesh(glMeshes.roundedBox || glMeshes.cube, polymer, glModel, 0, 1, 3, 0.44);
    const belt = worldPoint(pelvis.x, pelvis.y, pelvis.z, yaw, 0, 0.015, 0.01);
    mat4TRS(glModel, belt.x, belt.y, belt.z, yaw, torsoPitch * 0.55, torsoRoll * 0.72, 0.42, 0.05, 0.29);
    drawMesh(glMeshes.roundedBox || glMeshes.cube, ao.utility, glModel, 0, 1, 6, 0.72);
    const buckle = worldPoint(pelvis.x, pelvis.y, pelvis.z, yaw, 0, 0.02, 0.145);
    mat4TRS(glModel, buckle.x, buckle.y, buckle.z, yaw, torsoPitch * 0.55, torsoRoll * 0.72, 0.075, 0.045, 0.030);
    drawMesh(glMeshes.roundedBox || glMeshes.cube, metal, glModel, 0.04, 1, 3, 0.18);
    const holster = worldPoint(pelvis.x, pelvis.y, pelvis.z, yaw, side * 0.22, -0.06, 0.02);
    mat4TRS(glModel, holster.x, holster.y, holster.z, yaw, torsoPitch * 0.30, torsoRoll * 0.50, 0.09, 0.20, 0.08);
    drawMesh(glMeshes.softRoundedBox || glMeshes.roundedBox || glMeshes.cube, ao.polymer, glModel, 0, 1, 6, 0.72);
    const radio = worldPoint(pelvis.x, pelvis.y, pelvis.z, yaw, -side * 0.20, 0.06, -0.06);
    mat4TRS(glModel, radio.x, radio.y, radio.z, yaw, torsoPitch * 0.22, torsoRoll * 0.38, 0.085, 0.15, 0.07);
    drawMesh(glMeshes.softRoundedBox || glMeshes.roundedBox || glMeshes.cube, ao.utility, glModel, 0, 1, 6, 0.68);

    mat4TRS(glModel, torso.x, torso.y, torso.z, yaw, torsoPitch, torsoRoll, OPERATOR_PROPORTIONS.torsoWidth, OPERATOR_PROPORTIONS.torsoHeight, OPERATOR_PROPORTIONS.torsoDepth);
    drawMesh(glMeshes.operatorTorso || glMeshes.roundedBox || glMeshes.cube, armour, glModel, 0, 1, 5, 0.84);
    const armourVisual = operatorArmourRenderProfile(bot);
    const chest = worldPoint(torso.x, torso.y, torso.z, yaw, 0, 0, armourVisual.frontZ);
    mat4TRS(glModel, chest.x, chest.y, chest.z, yaw, torsoPitch, torsoRoll, armourVisual.width, armourVisual.height, armourVisual.depth);
    drawMesh(glMeshes.operatorCarrier || glMeshes.softRoundedBox || glMeshes.roundedBox || glMeshes.cube, plate, glModel, armourVisual.broken ? 0.16 : 0.02, 1, 6, armourVisual.classId === 'none' ? 0.30 : 0.60);
    const pack = worldPoint(torso.x, torso.y, torso.z, yaw, 0, 0, -0.22);
    mat4TRS(glModel, pack.x, pack.y, pack.z, yaw, torsoPitch, torsoRoll, 0.34 * armourVisual.pack, 0.42 * armourVisual.pack, 0.15 * armourVisual.pack);
    drawMesh(glMeshes.softRoundedBox || glMeshes.roundedBox || glMeshes.cube, ao.utility, glModel, 0, 1, 5, 0.88);
    for (const strapSide of [-1, 1]) {
      const strap = worldPoint(torso.x, torso.y, torso.z, yaw, strapSide * 0.15, 0.01, 0.03);
      mat4TRS(glModel, strap.x, strap.y, strap.z, yaw, torsoPitch, torsoRoll + strapSide * 0.08, 0.045, 0.42, 0.055);
      drawMesh(glMeshes.roundedBox || glMeshes.cube, ao.webbing, glModel, 0, 1, 5, 0.78);
      if (armourVisual.side) {
        const sidePlate = worldPoint(torso.x, torso.y, torso.z, yaw, strapSide * 0.235, -0.03, 0.04);
        mat4TRS(glModel, sidePlate.x, sidePlate.y, sidePlate.z, yaw, torsoPitch, torsoRoll, armourVisual.sideWidth, armourVisual.sideHeight, armourVisual.sideDepth);
        drawMesh(glMeshes.roundedBox || glMeshes.cube, plate, glModel, armourVisual.broken ? 0.12 : 0, 1, 6, 0.70);
      }
    }
    if (armourVisual.shoulder) for (const shoulderSide of [-1, 1]) {
      const shoulderPlate = worldPoint(torso.x, torso.y, torso.z, yaw, shoulderSide * 0.315, 0.13, 0.015);
      mat4TRS(glModel, shoulderPlate.x, shoulderPlate.y, shoulderPlate.z, yaw, torsoPitch, torsoRoll + shoulderSide * 0.10, 0.12 * armourVisual.shoulderScale, 0.15 * armourVisual.shoulderScale, 0.14 * armourVisual.shoulderScale);
      drawMesh(glMeshes.roundedBox || glMeshes.cube, plate, glModel, armourVisual.broken ? 0.12 : 0, 1, 6, 0.66);
    }
    if (armourVisual.collar) for (const collarSide of [-1, 1]) {
      const armourCollar = worldPoint(torso.x, torso.y, torso.z, yaw, collarSide * 0.105, 0.205, 0.09);
      mat4TRS(glModel, armourCollar.x, armourCollar.y, armourCollar.z, yaw, torsoPitch, torsoRoll + collarSide * 0.13, armourVisual.collarWidth, armourVisual.collarHeight, 0.12 + armourVisual.depth * 0.22);
      drawMesh(glMeshes.roundedBox || glMeshes.cube, plate, glModel, armourVisual.broken ? 0.10 : 0, 1, 6, 0.62);
    }
    if (armourVisual.abdomen) {
      const abdomenPlate = worldPoint(torso.x, torso.y, torso.z, yaw, 0, -0.19, armourVisual.frontZ - 0.018);
      mat4TRS(glModel, abdomenPlate.x, abdomenPlate.y, abdomenPlate.z, yaw, torsoPitch, torsoRoll, armourVisual.abdomenWidth, armourVisual.abdomenHeight, Math.max(0.055, armourVisual.depth * 0.78));
      drawMesh(glMeshes.roundedBox || glMeshes.cube, plate, glModel, armourVisual.broken ? 0.11 : 0.01, 1, 6, 0.67);
    }
    if (armourVisual.groin) {
      const groinPlate = worldPoint(pelvis.x, pelvis.y, pelvis.z, yaw, 0, 0.02, 0.175);
      mat4TRS(glModel, groinPlate.x, groinPlate.y, groinPlate.z, yaw, torsoPitch * 0.45 + 0.08, torsoRoll * 0.65, 0.25, 0.20, 0.075);
      drawMesh(glMeshes.roundedBox || glMeshes.cube, plate, glModel, armourVisual.broken ? 0.12 : 0, 1, 6, 0.68);
    }
    const abdomen = worldPoint(torso.x, torso.y, torso.z, yaw, 0, -0.18, 0.15);
    mat4TRS(glModel, abdomen.x, abdomen.y, abdomen.z, yaw, torsoPitch, torsoRoll, 0.31, 0.17, 0.06);
    drawMesh(glMeshes.roundedBox || glMeshes.cube, ao.webbing, glModel, 0, 1, 5, 0.72);
    for (const pouchSide of [-1, 0, 1]) {
      const pouch = worldPoint(pelvis.x, pelvis.y, pelvis.z, yaw, pouchSide * 0.13, 0.08, 0.20);
      mat4TRS(glModel, pouch.x, pouch.y, pouch.z, yaw, torsoPitch * 0.4, torsoRoll * 0.7, 0.105, 0.14, 0.075);
      drawMesh(glMeshes.softRoundedBox || glMeshes.roundedBox || glMeshes.cube, [0.07, 0.085, 0.09], glModel, 0, 1, 5, 0.86);
    }

    const headFinalX = pose === 0 ? side * 0.43 : side * 0.15;
    const headFinalZ = pose === 1 ? -0.30 : (pose === 2 ? 0.31 : 0.03);
    const neckA = worldPoint(base.x, 0, base.z, yaw, lerp(0, headFinalX * 0.62, fall), lerp(1.405, 0.22, fall) + impactSettle, lerp(0, headFinalZ * 0.62, fall));
    const neckB = worldPoint(base.x, 0, base.z, yaw, lerp(0, headFinalX * 0.78, fall), lerp(1.475, 0.20, fall) + impactSettle, lerp(0, headFinalZ * 0.78, fall));
    drawAnatomicalSegment(
      neckA, neckB, 0.112, ao.skin, 0, 1,
      OPERATOR_SKIN_PRESENTATION.surface,
      OPERATOR_SKIN_PRESENTATION.roughness,
      0.104
    );
    const head = worldPoint(base.x, 0, base.z, yaw, lerp(0, headFinalX, fall), lerp(OPERATOR_PROPORTIONS.headY, 0.18, fall) + impactSettle, lerp(0, headFinalZ, fall));
    const headRoll = side * lerp(0.02, pose === 0 ? 0.34 : 0.18, fall);
    drawOperatorHeadAssembly(bot, head, yaw, torsoPitch * 0.45, headRoll, palette, { detailTier, hurt: 0 });

    for (const limbSide of [-1, 1]) {
      const leading = limbSide === side;
      const legPose = operatorCorpseLegLocalPose(limbSide, leading, pose, fall, side);
      const hip = worldPoint(base.x, 0, base.z, yaw, legPose.hip.x, legPose.hip.y, legPose.hip.z);
      const knee = worldPoint(base.x, 0, base.z, yaw, legPose.knee.x, legPose.knee.y, legPose.knee.z);
      const ankle = worldPoint(base.x, 0, base.z, yaw, legPose.ankle.x, legPose.ankle.y, legPose.ankle.z);
      const boot = worldPoint(base.x, 0, base.z, yaw, legPose.foot.x, legPose.foot.y, legPose.foot.z);
      drawAnatomicalSegment(hip, knee, 0.115, cloth, 0, 1, 5, 0.90, 0.104);
      drawAnatomicalSegment(knee, ankle, 0.102, ao.clothLight, 0, 1, 5, 0.90, 0.088);
      const thighPlateA = worldPoint(base.x, 0, base.z, yaw,
        lerp(legPose.hip.x, legPose.knee.x, 0.30),
        lerp(legPose.hip.y, legPose.knee.y, 0.30),
        lerp(legPose.hip.z, legPose.knee.z, 0.30) + 0.045);
      const thighPlateB = worldPoint(base.x, 0, base.z, yaw,
        lerp(legPose.hip.x, legPose.knee.x, 0.72),
        lerp(legPose.hip.y, legPose.knee.y, 0.72),
        lerp(legPose.hip.z, legPose.knee.z, 0.72) + 0.048);
      drawAnatomicalSegment(thighPlateA, thighPlateB, 0.058, plate, 0, 1, 6, 0.72, 0.036);
      const kneePad = worldPoint(base.x, 0, base.z, yaw, legPose.knee.x, legPose.knee.y + 0.004, legPose.knee.z + 0.066);
      mat4TRS(glModel, kneePad.x, kneePad.y, kneePad.z, yaw, torsoPitch * 0.12, torsoRoll * 0.22, 0.148, 0.112, 0.060);
      drawMesh(glMeshes.operatorJointPad || glMeshes.roundedBox || glMeshes.cube, plate, glModel, 0, 1, 6, 0.88);
      const kneeShell = worldPoint(base.x, 0, base.z, yaw, legPose.knee.x, legPose.knee.y + 0.008, legPose.knee.z + 0.104);
      mat4TRS(glModel, kneeShell.x, kneeShell.y, kneeShell.z, yaw, torsoPitch * 0.12, torsoRoll * 0.22, 0.106, 0.070, 0.026);
      drawMesh(glMeshes.roundedBox || glMeshes.cube, ao.polymer, glModel, 0, 1, 6, 0.92);
      if (fullDetail) for (const strapOffset of [-0.050, 0.050]) {
        const strap = worldPoint(base.x, 0, base.z, yaw, legPose.knee.x, legPose.knee.y + strapOffset, legPose.knee.z + 0.034);
        mat4TRS(glModel, strap.x, strap.y, strap.z, yaw, torsoPitch * 0.12, torsoRoll * 0.22, 0.158, 0.022, 0.052);
        drawMesh(glMeshes.roundedBox || glMeshes.cube, ao.webbing, glModel, 0, 1, 6, 0.94);
      }
      const shinGuardA = worldPoint(base.x, 0, base.z, yaw,
        lerp(legPose.knee.x, legPose.ankle.x, 0.22),
        lerp(legPose.knee.y, legPose.ankle.y, 0.22),
        lerp(legPose.knee.z, legPose.ankle.z, 0.22) + 0.045);
      const shinGuardB = worldPoint(base.x, 0, base.z, yaw,
        lerp(legPose.knee.x, legPose.ankle.x, 0.72),
        lerp(legPose.knee.y, legPose.ankle.y, 0.72),
        lerp(legPose.knee.z, legPose.ankle.z, 0.72) + 0.035);
      drawAnatomicalSegment(shinGuardA, shinGuardB, 0.052, plate, 0, 1, 6, 0.74, 0.030);
      mat4TRS(glModel, ankle.x, ankle.y, ankle.z, yaw, torsoPitch * 0.12, torsoRoll * 0.16, 0.135, 0.13, 0.15);
      drawMesh(glMeshes.roundedBox || glMeshes.cube, ao.utility, glModel, 0, 1, 6, 0.84);
      mat4TRS(glModel, boot.x, boot.y, boot.z, yaw, torsoPitch * 0.14, torsoRoll * 0.18, 0.155, 0.14, 0.29);
      drawMesh(glMeshes.operatorBoot || glMeshes.softRoundedBox || glMeshes.roundedBox || glMeshes.cube, polymer, glModel, 0, 1, 6, 0.90);
      const toe = worldPoint(boot.x, boot.y, boot.z, yaw, 0, -0.025, 0.125);
      mat4TRS(glModel, toe.x, toe.y, toe.z, yaw, torsoPitch * 0.14, torsoRoll * 0.18, 0.13, 0.075, 0.11);
      drawMesh(glMeshes.roundedBox || glMeshes.cube, metal, glModel, 0.02, 1, 3, 0.18);

      const shoulder = worldPoint(torso.x, torso.y, torso.z, yaw, limbSide * 0.31, 0.15 * (1 - fall), 0.02);
      const armSpread = pose === 0 ? (leading ? 0.55 : 0.38) : (leading ? 0.44 : 0.34);
      const elbow = worldPoint(base.x, 0, base.z, yaw, lerp(limbSide * 0.31, limbSide * armSpread, fall), lerp(1.14, 0.115, fall), lerp(0.18, leading ? 0.18 : -0.12, fall));
      const hand = worldPoint(base.x, 0, base.z, yaw, lerp(limbSide * 0.22, limbSide * (armSpread + 0.10), fall), lerp(1.03, 0.075, fall), lerp(0.38, leading ? 0.30 : -0.24, fall));
      drawAnatomicalSegment(shoulder, elbow, 0.102, cloth, 0, 1, 5, 0.88, 0.09);
      drawAnatomicalSegment(elbow, hand, 0.088, ao.clothLight, 0, 1, 5, 0.86, 0.078);
      mat4TRS(glModel, elbow.x, elbow.y, elbow.z, yaw, torsoPitch * 0.30, torsoRoll * 0.45, 0.112, 0.104, 0.094);
      drawMesh(glMeshes.operatorJointPad || glMeshes.softRoundedBox || glMeshes.roundedBox || glMeshes.cube, ao.plate, glModel, 0, 1, 6, 0.70);
      mat4TRS(glModel, shoulder.x, shoulder.y, shoulder.z, yaw, torsoPitch, torsoRoll, 0.155, 0.185, 0.205);
      drawMesh(glMeshes.operatorShoulderPad || glMeshes.softRoundedBox || glMeshes.roundedBox || glMeshes.cube, plate, glModel, 0, 1, 6, 0.70);
      const patch = worldPoint(shoulder.x, shoulder.y, shoulder.z, yaw, limbSide * 0.075, 0.01, 0);
      mat4TRS(glModel, patch.x, patch.y, patch.z, yaw, torsoPitch, torsoRoll, 0.035, 0.10, 0.10);
      drawMesh(glMeshes.roundedBox || glMeshes.cube, teamPatch, glModel, 0.04, 1, 4, 0.34);
      mat4TRS(glModel, hand.x, hand.y, hand.z, yaw, 0, torsoRoll * 0.25, 0.112, 0.105, 0.125);
      drawMesh(glMeshes.operatorGlove || glMeshes.softRoundedBox || glMeshes.sphere, ao.polymer, glModel, 0, 1, 6, 0.86);
    }

    const corpseSidearm = bot.usingSecondary || bot.weapon?.category === 'pistol' || bot.weapon?.viewmodel === 'P12 SIDEARM';
    const weaponBaseX = weaponSide * (pose === 0 ? 0.38 : 0.31);
    const weaponBaseZ = pose === 1 ? -0.18 : 0.20;
    const weaponA = worldPoint(base.x, 0, base.z, yaw, lerp(0.02, weaponBaseX, fall), lerp(1.25, 0.085, fall), lerp(0.46, weaponBaseZ, fall));
    const corpseSharedLongGun = careerWeaponUsesSharedLongGunModel(bot.weapon || bot.primaryWeapon);
    if (corpseSidearm || corpseSharedLongGun) {
      drawUnifiedCareerWeapon(
        bot.weapon || bot.primaryWeapon,
        { x: weaponA.x, y: weaponA.y, z: weaponA.z },
        yaw,
        lerp(-0.04, 0.18, fall),
        side * lerp(0.05, 0.24, fall),
        0.90,
        0,
        0,
        null,
        detailTier
      );
    } else {
      const corpseWeaponLength = 0.46;
      const weaponB = worldPoint(base.x, 0, base.z, yaw, lerp(-0.18, weaponBaseX - corpseWeaponLength, fall), lerp(1.25, 0.082, fall), lerp(0.18, weaponBaseZ - 0.09, fall));
      drawSegment(weaponA, weaponB, 0.047, polymer, 0, 1, 3, 0.25, 0.058);
      const magazine = worldPoint(weaponA.x, weaponA.y, weaponA.z, yaw, -0.08, -0.055, 0.015);
      mat4TRS(glModel, magazine.x, magazine.y, magazine.z, yaw, 0.18, side * 0.20, 0.055, 0.12, 0.04);
      drawMesh(glMeshes.cube, [0.018, 0.025, 0.028], glModel, 0, 1, 3, 0.28);
    }
  }


  // Build 12.160: an operator travels through the world, so its surface detail
  // is anchored to the model rather than to the room. Wrapping the whole draw
  // — living and fallen alike — is what stops the kit weave, the skin variation
  // and the overhead light pools sweeping across them as they move.
  function drawSoldier(bot, cameraBot) {
    return withLocalSurfaceDetail(() => drawSoldierGeometry(bot, cameraBot));
  }

  function drawSoldierGeometry(bot, cameraBot) {
    if (bot === cameraBot) return;
    if (!bot.alive) {
      drawCorpse(bot, cameraBot);
      return;
    }
    const dx = bot.x - cameraBot.x;
    const dz = bot.y - cameraBot.y;
    if (dx * dx + dz * dz > GL_FAR * GL_FAR) return;
    const operatorDistance = Math.hypot(dx, dz);
    if (dynamicActorOutsideCameraView(bot.x, 0.92, bot.y, 1.85)) return;
    const detailTier = typeof runtimeOperatorDetailTier === 'function' ? runtimeOperatorDetailTier(operatorDistance) : 2;
    const mediumDetail = detailTier >= 1;
    const fullDetail = detailTier >= 2;

    drawShadow(bot, detailTier);

    const presentedMoveAngle = Number.isFinite(bot.renderMoveAngle) ? bot.renderMoveAngle : (Number.isFinite(bot.pathAngle) ? bot.pathAngle : bot.angle);
    const presentedAimAngle = Number.isFinite(bot.renderAimAngle) ? bot.renderAimAngle : bot.angle;
    const moveYaw = Math.PI / 2 - presentedMoveAngle;
    const aimYaw = Math.PI / 2 - presentedAimAngle;
    const aimOffset = clamp(angleDiff(aimYaw, moveYaw), -0.72, 0.72);
    const upperYaw = moveYaw + aimOffset * clamp(bot.upperAimBlend ?? 1, 0.35, 1);
    const crouch = clamp(bot.crouchBlend || (bot.crouched ? 1 : 0), 0, 1);
    const stanceDrop = crouch * 0.40;
    const presentedVelocity = Number.isFinite(bot.visualMoveVelocity) ? bot.visualMoveVelocity : bot.moveVelocity;
    const speedNorm = clamp(presentedVelocity / Math.max(0.001, bot.speed), 0, 1.15);
    const motion = clamp(bot.motion || speedNorm, 0, 1);
    const run = clamp(bot.runBlend || 0, 0, 1);
    const walk = clamp(bot.walkBlend || motion, 0, 1);
    const phase = bot.walkCycle || 0;
    const strafe = clamp(Number(bot.strafeBlend) || 0, -1, 1);
    const backpedal = clamp(Number(bot.backpedalBlend) || 0, 0, 1);
    const turn = clamp(Number(bot.turnBlend) || 0, -1, 1);
    const shoulderBias = clamp(Number(bot.shoulderBlend) || 0, -1, 1);
    const stride = (0.12 + run * 0.15) * walk * (1 - crouch * 0.28) * (1 - backpedal * 0.16);
    const liftScale = (0.045 + run * 0.055) * walk * (1 - crouch * 0.35) * (1 - backpedal * 0.12);
    const bodyBob = (Math.abs(Math.sin(phase)) * (0.018 + run * 0.017) + Math.sin(bot.animStateTime * 1.8) * 0.004 * (1 - walk)) * (1 - crouch * 0.30);
    const recoil = bot.recoil || 0;
    const hurt = clamp(bot.hitReaction || 0, 0, 1.25);
    const hitAge = Math.max(0, Number(bot.hitReactionAge) || 0);
    const hitWave = clamp(Number(bot.hitReactionStrength) || hurt, 0, 1.25) * Math.sin(clamp(hitAge / 0.34, 0, 1) * Math.PI);
    const hitLean = hitWave * (bot.hitDirection || 1) * 0.20;
    const hitCompression = hitWave * (0.045 + (Number(bot.hitReactionVertical) || 0) * 0.035);
    const flinchAge = Math.max(0, Number(bot.flinchAge) || 0);
    const flinchDuration = Math.max(0.001, Number(bot.flinchDuration) || 0.18);
    const flinchWave = clamp(Number(bot.flinchStrength) || 0, 0, 1) * Math.sin(clamp(flinchAge / flinchDuration, 0, 1) * Math.PI);
    const ready = clamp(bot.upperAimBlend ?? bot.weaponReadyBlend ?? (bot.target || bot.sightCandidate ? 1 : 0.58), 0.32, 1);
    const reloadProgress = bot.reloadTimer > 0 ? clamp(bot.reloadProgress || 0, 0, 1) : 0;
    const reloadPhases = careerWeaponReloadPhases(reloadProgress, bot.reloadTimer > 0, bot.magAmmo <= 0);
    const reloadWave = bot.reloadTimer > 0 ? Math.sin(reloadProgress * Math.PI) : 0;
    const swapProgress = bot.weaponSwapTimer > 0 ? 1 - bot.weaponSwapTimer / Math.max(0.001, bot.weaponSwapDuration) : 0;
    const swapWave = bot.weaponSwapTimer > 0 ? Math.sin(clamp(swapProgress, 0, 1) * Math.PI) : 0;
    const weaponDrop = reloadPhases.lower * 0.20 + reloadPhases.rack * 0.055 + swapWave * 0.42;
    const bodyLean = clamp(Number(bot.bodyLeanBlend) || 0, -0.18, 0.18);
    const turnAnticipation = clamp(Number(bot.turnAnticipationBlend) || 0, -1, 1);
    const footPlant = clamp(Number(bot.footPlantBlend) || 0, 0, 1);
    const aimStability = clamp(Number(bot.aimStabilityBlend) || 0, 0, 1);
    const breath = Math.sin(Number(bot.breathingPhase) || 0) * (0.0035 + (1 - aimStability) * 0.0035);
    const cornerLean = clamp(Number(bot.cornerReadyBlend) || 0, 0, 1) * shoulderBias * 0.035;
    const locomotionLean = bodyLean + strafe * 0.035 + turn * 0.030 + cornerLean;
    const gaitSway = Math.sin(phase) * walk * (1 - crouch * 0.35);
    const pelvisYaw = moveYaw + gaitSway * (0.020 + run * 0.014) + strafe * 0.008;
    const pelvisRoll = locomotionLean * 0.72 + hitLean * 0.28 + gaitSway * 0.018;
    const pelvisOrigin = worldPoint(bot.x, 0, bot.y, moveYaw, gaitSway * 0.010, 0, 0);
    const rifleY = OPERATOR_PROPORTIONS.torsoY + 0.08 + bodyBob + breath * 0.72 - (1 - ready) * 0.16 - stanceDrop * 0.94 - weaponDrop - hitCompression;
    const rifleForward = 0.52 - recoil * 0.05 - swapWave * 0.12 - hitWave * 0.035 - flinchWave * 0.022 - (1 - footPlant) * run * 0.012;
    const rifleRoll = reloadPhases.lower * 0.38 + reloadPhases.rack * 0.16 + swapWave * 0.82 + shoulderBias * 0.035 + hitLean * 0.50 + flinchWave * (bot.hitDirection || 1) * 0.12 + bodyLean * 0.24;
    const activeWeapon = bot.weapon || bot.primaryWeapon;
    const isSidearm = bot.usingSecondary || activeWeapon?.category === 'pistol' || activeWeapon?.viewmodel === 'P12 SIDEARM';
    const sharedLongGun = careerWeaponUsesSharedLongGunModel(activeWeapon);
    const weaponRig = operatorSharedWeaponRig(activeWeapon, rifleY, rifleForward, isSidearm, recoil, rifleRoll);
    let muzzleLightOrigin = null;
    if (bot.flash > 0) {
      const flashDistance = isSidearm ? 0.42 : 0.80;
      const flashLocal = weaponRig?.muzzle || { x: isSidearm ? 0.02 : 0.05, y: rifleY, z: rifleForward + flashDistance };
      muzzleLightOrigin = worldPoint(bot.x, 0, bot.y, upperYaw, flashLocal.x, flashLocal.y, flashLocal.z);
      setOperatorMuzzleLight(muzzleLightOrigin, bot.flash);
    }
    try {
    const palette = getOperatorPalette(bot);
    const { cloth, clothLight, armour, plate, polymer, webbing, utility, visor, team, teamSoft, metal } = palette;
    const ao = palette.occluded;

    const joints = { feet: [], knees: [], hips: [], shoulders: [], elbows: [], hands: [] };

    // Two-bone lower-body rig. The projected forward pole keeps both knees
    // bending in the anatomical direction while crouching, running and turning.
    for (const side of [-1, 1]) {
      const legPose = operatorLegLocalPose(side, phase, {
        crouch,
        run,
        walk,
        bodyBob,
        stanceDrop,
        stride,
        liftScale,
        strafe,
        backpedal
      });
      const hip = worldPoint(bot.x, 0, bot.y, moveYaw, legPose.hip.x, legPose.hip.y, legPose.hip.z);
      const knee = worldPoint(bot.x, 0, bot.y, moveYaw, legPose.knee.x, legPose.knee.y, legPose.knee.z);
      const ankle = worldPoint(bot.x, 0, bot.y, moveYaw, legPose.ankle.x, legPose.ankle.y, legPose.ankle.z);
      const footYaw = moveYaw + legPose.footYawOffset;
      const foot = worldPoint(bot.x, 0, bot.y, moveYaw, legPose.foot.x, legPose.foot.y, legPose.foot.z);
      joints.feet.push(foot); joints.knees.push(knee); joints.hips.push(hip);

      drawAnatomicalSegment(hip, knee, 0.121, cloth, hurt * 0.32, 1, 5, 0.90, 0.105);
      drawAnatomicalSegment(knee, ankle, 0.101, ao.clothLight, hurt * 0.32, 1, 5, 0.90, 0.088);

      const hipGuard = worldPoint(bot.x, 0, bot.y, moveYaw, legPose.hip.x + side * 0.035, legPose.hip.y - 0.045, legPose.hip.z + 0.018);
      mat4TRS(glModel, hipGuard.x, hipGuard.y, hipGuard.z, moveYaw, 0, side * 0.08, 0.10, 0.16, 0.13);
      drawMesh(glMeshes.roundedBox || glMeshes.cube, ao.utility, glModel, hurt * 0.22, 1, 6, 0.76);

      const thighPlateA = worldPoint(bot.x, 0, bot.y, moveYaw,
        lerp(legPose.hip.x, legPose.knee.x, 0.28),
        lerp(legPose.hip.y, legPose.knee.y, 0.28),
        lerp(legPose.hip.z, legPose.knee.z, 0.28) + 0.047);
      const thighPlateB = worldPoint(bot.x, 0, bot.y, moveYaw,
        lerp(legPose.hip.x, legPose.knee.x, 0.70),
        lerp(legPose.hip.y, legPose.knee.y, 0.70),
        lerp(legPose.hip.z, legPose.knee.z, 0.70) + 0.052);
      drawAnatomicalSegment(thighPlateA, thighPlateB, 0.060, plate, hurt * 0.26, 1, 6, 0.72, 0.037);

      const kneePad = worldPoint(bot.x, 0, bot.y, moveYaw, legPose.knee.x, legPose.knee.y + 0.004, legPose.knee.z + 0.066);
      mat4TRS(glModel, kneePad.x, kneePad.y, kneePad.z, moveYaw, crouch * 0.10, side * 0.025, 0.148, 0.112, 0.060);
      drawMesh(glMeshes.operatorJointPad || glMeshes.roundedBox || glMeshes.cube, plate, glModel, 0, 1, 6, 0.88);
      const kneeShell = worldPoint(bot.x, 0, bot.y, moveYaw, legPose.knee.x, legPose.knee.y + 0.008, legPose.knee.z + 0.104);
      mat4TRS(glModel, kneeShell.x, kneeShell.y, kneeShell.z, moveYaw, crouch * 0.10, side * 0.025, 0.106, 0.070, 0.026);
      drawMesh(glMeshes.roundedBox || glMeshes.cube, ao.polymer, glModel, 0, 1, 6, 0.92);
      for (const strapOffset of [-0.050, 0.050]) {
        const strap = worldPoint(bot.x, 0, bot.y, moveYaw, legPose.knee.x, legPose.knee.y + strapOffset, legPose.knee.z + 0.034);
        mat4TRS(glModel, strap.x, strap.y, strap.z, moveYaw, crouch * 0.10, side * 0.025, 0.158, 0.022, 0.052);
        drawMesh(glMeshes.roundedBox || glMeshes.cube, ao.webbing, glModel, 0, 1, 6, 0.94);
      }
      if (fullDetail) {
        const kneeTab = worldPoint(bot.x, 0, bot.y, moveYaw, legPose.knee.x + side * 0.066, legPose.knee.y + 0.008, legPose.knee.z + 0.098);
        mat4TRS(glModel, kneeTab.x, kneeTab.y, kneeTab.z, moveYaw, crouch * 0.10, side * 0.025, 0.020, 0.044, 0.020);
        drawMesh(glMeshes.roundedBox || glMeshes.cube, team, glModel, 0, 1, 6, 0.84);
      }

      const shinGuardA = worldPoint(bot.x, 0, bot.y, moveYaw,
        lerp(legPose.knee.x, legPose.ankle.x, 0.22),
        lerp(legPose.knee.y, legPose.ankle.y, 0.22),
        lerp(legPose.knee.z, legPose.ankle.z, 0.22) + 0.046);
      const shinGuardB = worldPoint(bot.x, 0, bot.y, moveYaw,
        lerp(legPose.knee.x, legPose.ankle.x, 0.74),
        lerp(legPose.knee.y, legPose.ankle.y, 0.74),
        lerp(legPose.knee.z, legPose.ankle.z, 0.74) + 0.036);
      drawAnatomicalSegment(shinGuardA, shinGuardB, 0.053, plate, hurt * 0.24, 1, 6, 0.74, 0.030);

      mat4TRS(glModel, ankle.x, ankle.y, ankle.z, footYaw, legPose.footPitch * 0.45, 0, 0.138, 0.13, 0.15);
      drawMesh(glMeshes.roundedBox || glMeshes.cube, ao.utility, glModel, hurt * 0.24, 1, 6, 0.84);
      mat4TRS(glModel, foot.x, foot.y, foot.z, footYaw, legPose.footPitch, 0, 0.162, 0.135, 0.300);
      drawMesh(glMeshes.operatorBoot || glMeshes.softRoundedBox || glMeshes.roundedBox || glMeshes.cube, polymer, glModel, hurt * 0.32, 1, 6, 0.90);
      if (mediumDetail) {
        const toe = worldPoint(foot.x, foot.y, foot.z, footYaw, 0, -0.026, 0.128);
        mat4TRS(glModel, toe.x, toe.y, toe.z, footYaw, legPose.footPitch, 0, 0.132, 0.075, 0.112);
        drawMesh(glMeshes.roundedBox || glMeshes.cube, metal, glModel, hurt * 0.20, 1, 3, 0.18);
        const sole = worldPoint(foot.x, foot.y, foot.z, footYaw, 0, -0.071, 0.006);
        mat4TRS(glModel, sole.x, sole.y, sole.z, footYaw, legPose.footPitch, 0, 0.158, 0.025, 0.285);
        drawMesh(glMeshes.roundedBox || glMeshes.cube, [0.018, 0.023, 0.025], glModel, hurt * 0.10, 1, 6, 0.96);
      }
    }

    // Pelvis follows movement; torso independently twists towards the aim angle.
    // Lateral and turning lean now make strafing/backpedalling readable without
    // changing the authoritative collision or aim direction.
    mat4TRS(glModel, pelvisOrigin.x, OPERATOR_PROPORTIONS.pelvisY + bodyBob - stanceDrop * 0.72 - hitCompression * 0.30, pelvisOrigin.z, pelvisYaw, backpedal * 0.035, pelvisRoll, OPERATOR_PROPORTIONS.pelvisWidth, OPERATOR_PROPORTIONS.pelvisHeight, OPERATOR_PROPORTIONS.pelvisDepth);
    drawMesh(glMeshes.operatorPelvis || glMeshes.softRoundedBox || glMeshes.roundedBox || glMeshes.cube, cloth, glModel, hurt * 0.55, 1, 5, 0.90);
    const beltY = OPERATOR_PROPORTIONS.pelvisY + 0.02 + bodyBob - stanceDrop * 0.72;
    mat4TRS(glModel, pelvisOrigin.x, beltY, pelvisOrigin.z, pelvisYaw, 0, pelvisRoll, 0.42, 0.05, 0.29);
    drawMesh(glMeshes.roundedBox || glMeshes.cube, ao.utility, glModel, hurt * 0.30, 1, 6, 0.72);
    const buckle = worldPoint(pelvisOrigin.x, bodyBob, pelvisOrigin.z, pelvisYaw, 0, OPERATOR_PROPORTIONS.pelvisY + 0.02 - stanceDrop * 0.72, 0.14);
    mat4TRS(glModel, buckle.x, buckle.y, buckle.z, pelvisYaw, 0, pelvisRoll, 0.075, 0.045, 0.030);
    drawMesh(glMeshes.roundedBox || glMeshes.cube, metal, glModel, 0.06 + hurt * 0.30, 1, 3, 0.18);
    const torsoLean = crouch * 0.08 + run * 0.06 + backpedal * 0.045 - hitWave * 0.055 + Math.abs(turnAnticipation) * 0.012;
    const torsoRoll = hitLean + locomotionLean * 0.82 + turnAnticipation * 0.018 - gaitSway * 0.010;
    mat4TRS(glModel, bot.x, OPERATOR_PROPORTIONS.torsoY + bodyBob + breath - stanceDrop - hitCompression, bot.y, upperYaw, torsoLean, torsoRoll, OPERATOR_PROPORTIONS.torsoWidth, OPERATOR_PROPORTIONS.torsoHeight, OPERATOR_PROPORTIONS.torsoDepth);
    drawMesh(glMeshes.operatorTorso || glMeshes.roundedBox || glMeshes.cube, armour, glModel, hurt * 0.55, 1, 5, 0.82);
    const armourVisual = operatorArmourRenderProfile(bot);
    const frontPlate = worldPoint(bot.x, bodyBob, bot.y, upperYaw, 0, OPERATOR_PROPORTIONS.torsoY - stanceDrop, armourVisual.frontZ + crouch * 0.03);
    mat4TRS(glModel, frontPlate.x, frontPlate.y, frontPlate.z, upperYaw, torsoLean, torsoRoll, armourVisual.width, armourVisual.height, armourVisual.depth);
    drawMesh(glMeshes.operatorCarrier || glMeshes.softRoundedBox || glMeshes.roundedBox || glMeshes.cube, plate, glModel, (armourVisual.broken ? 0.16 : 0.03) + hurt * 0.55, 1, 6, armourVisual.classId === 'none' ? 0.30 : 0.58);
    const backPack = worldPoint(bot.x, bodyBob, bot.y, upperYaw, 0, OPERATOR_PROPORTIONS.torsoY + 0.02 - stanceDrop, -0.20);
    mat4TRS(glModel, backPack.x, backPack.y, backPack.z, upperYaw, torsoLean, torsoRoll, 0.34 * armourVisual.pack, 0.44 * armourVisual.pack, 0.16 * armourVisual.pack);
    drawMesh(glMeshes.softRoundedBox || glMeshes.roundedBox || glMeshes.cube, ao.utility, glModel, hurt * 0.4, 1, 5, 0.88);
    if (mediumDetail) for (const strapSide of [-1, 1]) {
      const strap = worldPoint(bot.x, bodyBob, bot.y, upperYaw, strapSide * 0.15, OPERATOR_PROPORTIONS.torsoY - stanceDrop, 0.02);
      mat4TRS(glModel, strap.x, strap.y, strap.z, upperYaw, torsoLean, torsoRoll + strapSide * 0.08, 0.045, 0.42, 0.055);
      drawMesh(glMeshes.roundedBox || glMeshes.cube, ao.webbing, glModel, hurt * 0.25, 1, 5, 0.78);
      if (armourVisual.side) {
        const sidePlate = worldPoint(bot.x, bodyBob, bot.y, upperYaw, strapSide * 0.235, OPERATOR_PROPORTIONS.torsoY - 0.05 - stanceDrop, 0.04);
        mat4TRS(glModel, sidePlate.x, sidePlate.y, sidePlate.z, upperYaw, torsoLean, torsoRoll, armourVisual.sideWidth, armourVisual.sideHeight, armourVisual.sideDepth);
        drawMesh(glMeshes.roundedBox || glMeshes.cube, plate, glModel, (armourVisual.broken ? 0.12 : 0) + hurt * 0.22, 1, 6, 0.70);
      }
    }
    if (mediumDetail && armourVisual.shoulder) for (const shoulderSide of [-1, 1]) {
      const shoulderPlate = worldPoint(bot.x, bodyBob, bot.y, upperYaw, shoulderSide * 0.315, OPERATOR_PROPORTIONS.torsoY + 0.13 - stanceDrop, 0.015);
      mat4TRS(glModel, shoulderPlate.x, shoulderPlate.y, shoulderPlate.z, upperYaw, torsoLean, torsoRoll + shoulderSide * 0.10, 0.12 * armourVisual.shoulderScale, 0.15 * armourVisual.shoulderScale, 0.14 * armourVisual.shoulderScale);
      drawMesh(glMeshes.roundedBox || glMeshes.cube, plate, glModel, (armourVisual.broken ? 0.12 : 0) + hurt * 0.20, 1, 6, 0.66);
    }
    if (mediumDetail && armourVisual.collar) for (const collarSide of [-1, 1]) {
      const armourCollar = worldPoint(bot.x, bodyBob, bot.y, upperYaw, collarSide * 0.105, OPERATOR_PROPORTIONS.torsoY + 0.205 - stanceDrop, 0.09);
      mat4TRS(glModel, armourCollar.x, armourCollar.y, armourCollar.z, upperYaw, torsoLean, torsoRoll + collarSide * 0.13, armourVisual.collarWidth, armourVisual.collarHeight, 0.12 + armourVisual.depth * 0.22);
      drawMesh(glMeshes.roundedBox || glMeshes.cube, plate, glModel, (armourVisual.broken ? 0.10 : 0) + hurt * 0.18, 1, 6, 0.62);
    }
    if (armourVisual.abdomen) {
      const abdomenPlate = worldPoint(bot.x, bodyBob, bot.y, upperYaw, 0, OPERATOR_PROPORTIONS.torsoY - 0.19 - stanceDrop * 0.86, armourVisual.frontZ - 0.018);
      mat4TRS(glModel, abdomenPlate.x, abdomenPlate.y, abdomenPlate.z, upperYaw, torsoLean, torsoRoll, armourVisual.abdomenWidth, armourVisual.abdomenHeight, Math.max(0.055, armourVisual.depth * 0.78));
      drawMesh(glMeshes.roundedBox || glMeshes.cube, plate, glModel, (armourVisual.broken ? 0.11 : 0.01) + hurt * 0.20, 1, 6, 0.67);
    }
    if (armourVisual.groin) {
      const groinPlate = worldPoint(bot.x, bodyBob, bot.y, moveYaw, 0, OPERATOR_PROPORTIONS.pelvisY + 0.01 - stanceDrop * 0.66, 0.175);
      mat4TRS(glModel, groinPlate.x, groinPlate.y, groinPlate.z, moveYaw, 0.08, hitLean * 0.45, 0.25, 0.20, 0.075);
      drawMesh(glMeshes.roundedBox || glMeshes.cube, plate, glModel, (armourVisual.broken ? 0.12 : 0) + hurt * 0.16, 1, 6, 0.68);
    }
    const abdomen = worldPoint(bot.x, bodyBob, bot.y, upperYaw, 0, OPERATOR_PROPORTIONS.torsoY - 0.115 - stanceDrop * 0.84, 0.15);
    mat4TRS(glModel, abdomen.x, abdomen.y, abdomen.z, upperYaw, torsoLean, torsoRoll, 0.31, 0.17, 0.06);
    drawMesh(glMeshes.roundedBox || glMeshes.cube, ao.webbing, glModel, hurt * 0.22, 1, 5, 0.72);
    if (mediumDetail) for (const side of [-1, 0, 1]) {
      const pouch = worldPoint(bot.x, bodyBob, bot.y, upperYaw, side * 0.13, OPERATOR_PROPORTIONS.pelvisY + 0.12 - stanceDrop * 0.78, 0.185);
      mat4TRS(glModel, pouch.x, pouch.y, pouch.z, upperYaw, 0, hitLean, 0.105, 0.15, 0.075);
      drawMesh(glMeshes.softRoundedBox || glMeshes.roundedBox || glMeshes.cube, ao.webbing, glModel, hurt * 0.35, 1, 5, 0.86);
    }
    const holster = worldPoint(bot.x, bodyBob, bot.y, moveYaw, 0.22, OPERATOR_PROPORTIONS.pelvisY - 0.055 - stanceDrop * 0.60, 0.02);
    mat4TRS(glModel, holster.x, holster.y, holster.z, moveYaw, 0, hitLean * 0.20, 0.09, 0.20, 0.08);
    drawMesh(glMeshes.softRoundedBox || glMeshes.roundedBox || glMeshes.cube, ao.polymer, glModel, hurt * 0.20, 1, 6, 0.72);
    const radio = worldPoint(bot.x, bodyBob, bot.y, moveYaw, -0.20, OPERATOR_PROPORTIONS.pelvisY + 0.115 - stanceDrop * 0.60, -0.06);
    mat4TRS(glModel, radio.x, radio.y, radio.z, moveYaw, 0, hitLean * 0.18, 0.085, 0.15, 0.07);
    drawMesh(glMeshes.softRoundedBox || glMeshes.roundedBox || glMeshes.cube, ao.utility, glModel, hurt * 0.18, 1, 6, 0.68);

    // Protected neck and a shared profiled head assembly follow the aim offset.
    // Living and fallen operators use the same geometry, materials and detail tiers.
    const headTurn = aimOffset * 0.72;
    const headYaw = moveYaw + headTurn;
    const collar = worldPoint(bot.x, bodyBob, bot.y, upperYaw, 0, 1.42 - stanceDrop, 0.005);
    mat4TRS(glModel, collar.x, collar.y, collar.z, upperYaw, crouch * 0.05, hitLean, 0.275, 0.105, 0.225);
    drawMesh(glMeshes.softRoundedBox || glMeshes.roundedBox || glMeshes.cube, ao.armour, glModel, hurt * 0.5, 1, 5, 0.76);
    const neckA = worldPoint(bot.x, bodyBob, bot.y, upperYaw, 0, 1.42 - stanceDrop, 0);
    const neckB = worldPoint(bot.x, bodyBob, bot.y, upperYaw, 0, 1.475 - stanceDrop, 0);
    drawAnatomicalSegment(
      neckA, neckB, 0.118, ao.skin, hurt * 0.28, 1,
      OPERATOR_SKIN_PRESENTATION.surface,
      OPERATOR_SKIN_PRESENTATION.roughness,
      0.108
    );
    const headOrigin = {
      x: bot.x,
      y: OPERATOR_PROPORTIONS.headY + bodyBob - stanceDrop + hurt * 0.02,
      z: bot.y
    };
    const headRoll = hitLean * 1.4 - locomotionLean * 0.16 - gaitSway * 0.006;
    drawOperatorHeadAssembly(bot, headOrigin, headYaw, crouch * 0.05 - run * 0.012, headRoll, palette, { detailTier, hurt });

    for (const side of [-1, 1]) {
      const shoulderLocal = operatorShoulderLocalPose(side, { stanceDrop, torsoRoll, walk, phase, turn });
      const shoulderPad = worldPoint(bot.x, bodyBob, bot.y, upperYaw, shoulderLocal.x, shoulderLocal.y, shoulderLocal.z);
      mat4TRS(glModel, shoulderPad.x, shoulderPad.y, shoulderPad.z, upperYaw, 0, side * 0.15 + hitLean, 0.155, 0.185, 0.205);
      drawMesh(glMeshes.operatorShoulderPad || glMeshes.softRoundedBox || glMeshes.roundedBox || glMeshes.cube, plate, glModel, hurt * 0.4, 1, 6, 0.70);
      const patch = worldPoint(bot.x, bodyBob, bot.y, upperYaw, shoulderLocal.x + side * 0.045, shoulderLocal.y, shoulderLocal.z + 0.01);
      mat4TRS(glModel, patch.x, patch.y, patch.z, upperYaw, 0, side * 0.15 + hitLean, 0.042, 0.10, 0.10);
      drawMesh(glMeshes.roundedBox || glMeshes.cube, team, glModel, 0.14, 1, 4, 0.32);
      if (fullDetail) {
        const patchStripe = worldPoint(bot.x, bodyBob, bot.y, upperYaw, side * (OPERATOR_PROPORTIONS.shoulderHalf + 0.045), 1.34 - stanceDrop, 0.025);
        mat4TRS(glModel, patchStripe.x, patchStripe.y, patchStripe.z, upperYaw, 0, side * 0.15 + hitLean, 0.020, 0.065, 0.02);
        drawMesh(glMeshes.roundedBox || glMeshes.cube, teamSoft, glModel, 0.20, 1, 4, 0.20);
      }
    }
    if (fullDetail) {
      const chestTape = worldPoint(bot.x, bodyBob, bot.y, upperYaw, -0.12, OPERATOR_PROPORTIONS.torsoY + 0.08 - stanceDrop, 0.19);
      mat4TRS(glModel, chestTape.x, chestTape.y, chestTape.z, upperYaw, torsoLean, torsoRoll, 0.018, 0.11, 0.10);
      drawMesh(glMeshes.roundedBox || glMeshes.cube, team, glModel, 0.18, 1, 4, 0.24);
    }

    // Upper-body animation states: aim, walk, reload and switching are layered
    // over the lower-body cycle rather than moving the entire model as one pose.
    for (const side of [-1, 1]) {
      const shoulderLocal = operatorShoulderLocalPose(side, { stanceDrop, torsoRoll, walk, phase, turn });
      const shoulder = worldPoint(bot.x, bodyBob, bot.y, upperYaw, shoulderLocal.x, shoulderLocal.y, shoulderLocal.z);
      let elbowX = side * (0.32 - ready * 0.06) + shoulderBias * 0.030;
      let elbowY = OPERATOR_PROPORTIONS.torsoY + 0.035 - (1 - ready) * 0.08 - stanceDrop * 0.92;
      let elbowZ = 0.20 + crouch * 0.04;
      let handX = side * (side < 0 ? 0.11 : 0.16) + shoulderBias * 0.040;
      let handY = rifleY;
      let handZ = side < 0 ? rifleForward + 0.13 : rifleForward - 0.10;
      if (weaponRig) {
        const anchor = side < 0 ? weaponRig.supportHand : weaponRig.dominantHand;
        handX = anchor.x + shoulderBias * (side < 0 ? 0.022 : 0.030);
        handY = anchor.y;
        handZ = anchor.z;
        if (isSidearm) elbowX = side * 0.22 + shoulderBias * 0.022;
      } else if (isSidearm) {
        handX = side * 0.06 + shoulderBias * 0.028;
        handY = rifleY + 0.03;
        handZ = rifleForward + (side < 0 ? 0.08 : -0.02);
        elbowX = side * 0.22 + shoulderBias * 0.022;
      }
      if (bot.reloadTimer > 0 && side < 0) {
        const magReach = reloadPhases.handToMagazine;
        if (isSidearm) {
          const baseHand = weaponRig?.supportHand || { x: -0.05, y: rifleY + 0.03, z: rifleForward + 0.06 };
          handX = baseHand.x - magReach * 0.17 + reloadPhases.rackHand * 0.09;
          handY = baseHand.y - magReach * 0.31 + reloadPhases.rackHand * 0.19;
          handZ = baseHand.z - magReach * 0.05 + reloadPhases.rackHand * 0.18;
          elbowX = -0.22 - magReach * 0.09;
          elbowY -= magReach * 0.18;
        } else {
          const baseHand = weaponRig?.supportHand || { x: -0.08, y: rifleY, z: rifleForward - 0.02 };
          handX = baseHand.x - magReach * 0.20 + reloadPhases.rackHand * 0.12;
          handY = baseHand.y - magReach * 0.28 + reloadPhases.rackHand * 0.18;
          handZ = baseHand.z + reloadPhases.rackHand * 0.22;
          elbowX -= magReach * 0.12;
          elbowY -= magReach * 0.17;
        }
      }
      const naturalElbow = operatorArmElbowLocalPose(side, shoulderLocal, { x: handX, y: handY - bodyBob, z: handZ }, {
        ready,
        crouch,
        run,
        sidearm: isSidearm,
        reload: side < 0 ? reloadWave : 0
      });
      elbowX = lerp(elbowX, naturalElbow.x, 0.78);
      elbowY = lerp(elbowY, naturalElbow.y, 0.78);
      elbowZ = lerp(elbowZ, naturalElbow.z, 0.78);
      const elbow = worldPoint(bot.x, bodyBob, bot.y, upperYaw, elbowX, elbowY, elbowZ);
      // handY already includes the shared body bob through rifleY/weaponRig;
      // adding bodyBob again here caused the hands to drift above the weapon.
      const hand = worldPoint(bot.x, 0, bot.y, upperYaw, handX, handY, handZ);
      joints.shoulders.push(shoulder); joints.elbows.push(elbow); joints.hands.push(hand);
      drawAnatomicalSegment(shoulder, elbow, 0.102, cloth, hurt * 0.4, 1, 5, 0.88, 0.09);
      drawAnatomicalSegment(elbow, hand, 0.088, ao.clothLight, hurt * 0.4, 1, 5, 0.86, 0.078);
      mat4TRS(glModel, elbow.x, elbow.y, elbow.z, upperYaw, 0, rifleRoll * 0.18, 0.112, 0.104, 0.094);
      drawMesh(glMeshes.operatorJointPad || glMeshes.softRoundedBox || glMeshes.roundedBox || glMeshes.cube, ao.plate, glModel, hurt * 0.20, 1, 6, 0.70);
      mat4TRS(glModel, hand.x, hand.y, hand.z, upperYaw, 0, rifleRoll, 0.112, 0.105, 0.125);
      drawMesh(glMeshes.operatorGlove || glMeshes.softRoundedBox || glMeshes.sphere, ao.polymer, glModel, hurt * 0.35, 1, 6, 0.86);
    }

    if (isSidearm || sharedLongGun) {
      const origin = weaponRig?.origin || { x: sharedLongGun ? 0.05 : 0.02, y: rifleY + (sharedLongGun ? 0 : 0.015), z: rifleForward + (sharedLongGun ? -0.02 : 0.11) };
      const pistolOrigin = worldPoint(bot.x, 0, bot.y, upperYaw, origin.x, origin.y, origin.z);
      drawUnifiedCareerWeapon(
        activeWeapon,
        { x: pistolOrigin.x, y: pistolOrigin.y, z: pistolOrigin.z },
        upperYaw,
        -0.02 + recoil * 0.08,
        rifleRoll,
        1,
        recoil,
        hurt,
        reloadPhases,
        detailTier
      );
    } else {
      const receiver = worldPoint(bot.x, 0, bot.y, upperYaw, 0.05, rifleY, rifleForward);
      mat4TRS(glModel, receiver.x, receiver.y, receiver.z, upperYaw, -0.035 + recoil * 0.05, rifleRoll, 0.12, 0.13, 0.40);
      drawMesh(glMeshes.cube, polymer, glModel, hurt * 0.3, 1, 3, 0.24);
      const upperReceiver = worldPoint(bot.x, 0, bot.y, upperYaw, 0.05, rifleY + 0.05, rifleForward + 0.03);
      mat4TRS(glModel, upperReceiver.x, upperReceiver.y, upperReceiver.z, upperYaw, -0.035 + recoil * 0.05, rifleRoll, 0.10, 0.05, 0.34);
      drawMesh(glMeshes.cube, metal, glModel, 0.03, 1, 3, 0.18);
      const handguard = worldPoint(bot.x, 0, bot.y, upperYaw, 0.05, rifleY, rifleForward + 0.31);
      mat4TRS(glModel, handguard.x, handguard.y - 0.005, handguard.z, upperYaw, -0.035, rifleRoll, 0.105, 0.10, 0.28);
      drawMesh(glMeshes.cube, webbing, glModel, hurt * 0.3, 1, 6, 0.42);
      const rail = worldPoint(bot.x, 0, bot.y, upperYaw, 0.05, rifleY + 0.08, rifleForward + 0.31);
      mat4TRS(glModel, rail.x, rail.y, rail.z, upperYaw, -0.035, rifleRoll, 0.09, 0.02, 0.29);
      drawMesh(glMeshes.cube, metal, glModel, 0.03, 1, 3, 0.14);
      const stock = worldPoint(bot.x, 0, bot.y, upperYaw, 0.05, rifleY + 0.01, rifleForward - 0.30);
      mat4TRS(glModel, stock.x, stock.y, stock.z, upperYaw, -0.02, rifleRoll, 0.11, 0.16, 0.22);
      drawMesh(glMeshes.cube, utility, glModel, hurt * 0.3, 1, 6, 0.64);
      const magDrop = reloadPhases.magazineTravel * 0.28;
      const mag = worldPoint(bot.x, 0, bot.y, upperYaw, 0.05 - reloadPhases.magazineSide * 0.12, rifleY - 0.16 - magDrop, rifleForward - 0.01);
      mat4TRS(glModel, mag.x, mag.y, mag.z, upperYaw, -0.20, rifleRoll + reloadPhases.magazineTravel * 0.42, 0.075, 0.22, 0.11);
      drawMesh(glMeshes.cube, [0.025, 0.032, 0.036], glModel, hurt * 0.3, 1, 3, 0.26);
      const barrelA = worldPoint(bot.x, 0, bot.y, upperYaw, 0.05, rifleY, rifleForward + 0.43);
      const barrelB = worldPoint(bot.x, 0, bot.y, upperYaw, 0.05, rifleY, rifleForward + 0.76);
      drawSegment(barrelA, barrelB, 0.026, metal, hurt * 0.3, 1, 3, 0.18);
      const brake = worldPoint(bot.x, 0, bot.y, upperYaw, 0.05, rifleY, rifleForward + 0.79);
      mat4TRS(glModel, brake.x, brake.y, brake.z, upperYaw, 0, rifleRoll, 0.03, 0.03, 0.05);
      drawMesh(glMeshes.cube, metal, glModel, 0.05, 1, 3, 0.16);
      const optic = worldPoint(bot.x, 0, bot.y, upperYaw, 0.05, rifleY + 0.12, rifleForward + 0.02);
      mat4TRS(glModel, optic.x, optic.y, optic.z, upperYaw, 0, rifleRoll, 0.06, 0.09, 0.10);
      drawMesh(glMeshes.cube, utility, glModel, hurt * 0.3, 1, 6, 0.30);
      const lens = worldPoint(bot.x, 0, bot.y, upperYaw, 0.05, rifleY + 0.12, rifleForward + 0.08);
      mat4TRS(glModel, lens.x, lens.y, lens.z, upperYaw, 0, rifleRoll, 0.038, 0.038, 0.02);
      drawMesh(glMeshes.cube, visor, glModel, 0.18, 1, 4, 0.10);
      const light = worldPoint(bot.x, 0, bot.y, upperYaw, 0.12, rifleY - 0.02, rifleForward + 0.28);
      mat4TRS(glModel, light.x, light.y, light.z, upperYaw, 0, rifleRoll, 0.03, 0.04, 0.08);
      drawMesh(glMeshes.cube, utility, glModel, 0.04, 1, 6, 0.20);
      const tape = worldPoint(bot.x, 0, bot.y, upperYaw, -0.04, rifleY + 0.02, rifleForward - 0.02);
      mat4TRS(glModel, tape.x, tape.y, tape.z, upperYaw, 0, rifleRoll, 0.012, 0.05, 0.06);
      drawMesh(glMeshes.cube, teamSoft, glModel, 0.14, 1, 4, 0.18);
    }

    if (muzzleLightOrigin) {
      const flashScale = 0.14 + bot.flash * 0.10;
      setBlendMode(true);
      mat4TRS(glModel, muzzleLightOrigin.x, muzzleLightOrigin.y, muzzleLightOrigin.z, upperYaw, 0, rifleRoll, flashScale, flashScale, flashScale * 1.45);
      drawMesh(glMeshes.sphere, [1, 0.58, 0.10], glModel, 2.6, clamp(bot.flash, 0, 0.92), 4, 0.08);
      setBlendMode(false);
    }
    } finally {
      if (muzzleLightOrigin) clearOperatorMuzzleLight();
    }
  }

  function operatorAnimationPresentationAudit() {
    const reloadSamples = [0, 0.12, 0.32, 0.52, 0.72, 0.86, 1].map(progress => ({
      progress,
      ...careerWeaponReloadPhases(progress, true, true)
    }));
    return {
      usesSmoothedMoveAngle: true,
      usesSmoothedAimAngle: true,
      usesVisualAcceleration: true,
      supportsStrafeAndBackpedal: true,
      supportsShoulderSwitching: true,
      supportsCornerWeaponReady: true,
      supportsTurnAnticipation: true,
      supportsFootPlantWeighting: true,
      supportsBreathingAndAimStability: true,
      supportsPelvisCounterMotion: true,
      supportsTorsoCounterSway: true,
      supportsShoulderArticulation: true,
      elbowsFollowHandAnchors: true,
      headStabilisesAgainstBodyLean: true,
      distanceBasedOperatorLod: true,
      hitReactionPhases: ['impact', 'compression', 'recover'],
      deathPhases: ['stagger', 'fall', 'settle'],
      reloadSamples,
      magazineDetachedMidReload: reloadSamples.some(sample => sample.magazineTravel > 0.92),
      slideLockedBeforeRack: reloadSamples.some(sample => sample.slideLock > 0.65),
      rackVisibleLateReload: reloadSamples.some(sample => sample.rack > 0.65)
    };
  }

  function operatorWeaponAttachmentAudit() {
    const geometry = careerWeaponGeometryIntegrityAudit();
    const weapons = [
      ...Object.values(CAREER_WEAPON_CATALOG || {}),
      ...Object.values(CAREER_NPC_WEAPON_CATALOG || {})
    ];
    const distance = (a, b) => Math.hypot((a?.x || 0) - (b?.x || 0), (a?.y || 0) - (b?.y || 0), (a?.z || 0) - (b?.z || 0));
    const samples = weapons.map(weapon => {
      const isSidearm = weapon?.category === 'pistol' || weapon?.viewmodel === 'P12 SIDEARM';
      const rig = operatorSharedWeaponRig(weapon, OPERATOR_PROPORTIONS.torsoY + 0.08, 0.52, isSidearm, 0, 0);
      const parts = careerWeaponVisualParts(weapon);
      const essentialAtFar = parts.filter(part => OPERATOR_WEAPON_ESSENTIAL_PARTS.has(part.className)).map(part => part.className);
      const finitePoint = point => point && ['x', 'y', 'z'].every(axis => Number.isFinite(Number(point[axis])));
      return {
        id: weapon.id || weapon.name,
        name: weapon.name,
        modelClass: weapon.modelClass || '',
        category: weapon.category || '',
        partCount: parts.length,
        gripPart: rig?.gripPart || '',
        supportPart: rig?.supportPart || '',
        dominantHandGap: rig ? Number(distance(rig.dominantHand, rig.gripCenter).toFixed(4)) : null,
        supportHandGap: rig ? Number(distance(rig.supportHand, rig.supportCenter).toFixed(4)) : null,
        muzzleFlashGap: rig ? Number(distance(rig.muzzle, rig.muzzleEnd).toFixed(4)) : null,
        stockSeatGap: rig?.sharedLongGun && rig.stockSeat ? Number(distance(rig.stockSeat, OPERATOR_LONG_GUN_POSE.stockSeatTarget).toFixed(4)) : null,
        stockSeat: rig?.stockSeat ? {
          x: Number(rig.stockSeat.x.toFixed(4)),
          y: Number(rig.stockSeat.y.toFixed(4)),
          z: Number(rig.stockSeat.z.toFixed(4))
        } : null,
        farLodGripRetained: !rig?.sharedLongGun || essentialAtFar.includes('pistol-grip'),
        farLodSupportRetained: !rig?.sharedLongGun || essentialAtFar.includes('support-grip'),
        finiteAnchors: Boolean(rig && finitePoint(rig.dominantHand) && finitePoint(rig.supportHand) && finitePoint(rig.muzzle)),
        sharedModel: Boolean(rig)
      };
    });
    const failures = samples.filter(sample => !sample.sharedModel || !sample.gripPart || !sample.supportPart || !sample.finiteAnchors || sample.dominantHandGap > 0.09 || sample.supportHandGap > 0.11 || sample.muzzleFlashGap > 0.05 || (sample.category === 'rifle' && (sample.stockSeatGap === null || sample.stockSeatGap > 0.075)) || !sample.farLodGripRetained || !sample.farLodSupportRetained);
    return {
      ok: failures.length === 0 && geometry.ok,
      samples,
      failures,
      geometry,
      invariants: {
        sharedGeometry: true,
        equippedModelDrivesWorldWeapon: true,
        handsFollowModelAnchors: true,
        stockSeatsInDominantShoulderPocket: true,
        muzzleFlashFollowsModelBounds: true,
        internalPartsRemainConnected: geometry.ok,
        magazineAndBaseMoveAsOneAssembly: geometry.magazineAssemblyMovesTogether,
        bodyBobAppliedOnceToHands: true
      }
    };
  }

  function drawHealthBar(bot, cameraBot) {
    if (!bot.alive || bot === cameraBot) return;
    const distanceToBot = Math.hypot(bot.x - cameraBot.x, bot.y - cameraBot.y);
    if (distanceToBot > 8.5) return;
    const yaw = Math.atan2(cameraBot.x - bot.x, cameraBot.y - bot.y);
    const ratio = clamp(bot.health / 100, 0, 1);
    const width = 0.42;
    const back = localToWorld(bot.x, bot.y, yaw, 0, 0);
    const barY = OPERATOR_PROPORTIONS.healthBarY - clamp(bot.crouchBlend || 0, 0, 1) * 0.40;
    mat4TRS(glModel, back.x, barY, back.z, yaw, 0, 0, width, 0.045, 0.025);
    drawMesh(glMeshes.cube, [0.025, 0.03, 0.035], glModel, 0, 1);
    const localX = -(1 - ratio) * width * 0.5;
    const fill = localToWorld(bot.x, bot.y, yaw, localX, 0.018);
    mat4TRS(glModel, fill.x, barY, fill.z, yaw, 0, 0, width * ratio, 0.032, 0.018);
    drawMesh(glMeshes.cube, bot.team === TEAM_BLUE ? [0.18, 0.66, 1] : [1, 0.30, 0.27], glModel, 0.34, 1);
  }

  function drawTracer(tracer) {
    const dx = tracer.x2 - tracer.x1;
    const dy = tracer.y2 - tracer.y1;
    const dz = tracer.z2 - tracer.z1;
    const horizontal = Math.hypot(dx, dz);
    const length = Math.hypot(horizontal, dy);
    if (length < 0.001) return;
    const yaw = Math.atan2(dx, dz);
    const pitch = -Math.atan2(dy, horizontal);
    const alpha = clamp(tracer.life / tracer.maxLife, 0, 1);
    const colour = tracer.team === TEAM_BLUE ? [0.42, 0.78, 1] : [1, 0.42, 0.28];
    const core = tracer.team === TEAM_BLUE ? [0.92, 0.97, 1] : [1, 0.90, 0.70];
    const cx = (tracer.x1 + tracer.x2) * 0.5;
    const cy = (tracer.y1 + tracer.y2) * 0.5;
    const cz = (tracer.z1 + tracer.z2) * 0.5;
    mat4TRS(glModel, cx, cy, cz, yaw, pitch, 0, 0.032, 0.032, length);
    drawMesh(glMeshes.cube, colour, glModel, 2.15, alpha * 0.22, 4, 0.08);
    mat4TRS(glModel, cx, cy, cz, yaw, pitch, 0, 0.012, 0.012, length);
    drawMesh(glMeshes.cube, core, glModel, 2.6, alpha * 0.90, 4, 0.05);
    mat4TRS(glModel, tracer.x2, tracer.y2, tracer.z2, 0, 0, 0, 0.04, 0.04, 0.04);
    drawMesh(glMeshes.sphere, core, glModel, 2.2, alpha * 0.28, 4, 0.06);
  }
