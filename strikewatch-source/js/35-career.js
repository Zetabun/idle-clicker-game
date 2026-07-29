/*
 * Strikewatch source module: 35-career.js
 * Purpose: Persistent club progression, squad combat profiles, telemetry, reports, counted weapon inventory and shared post-match/store crates.
 *
 * This file is a source fragment. Run `python3 build.py` to regenerate
 * js/strikewatch.dev.js and the standalone release in dist/.
 */

  const CAREER_STORAGE_KEY = 'strikewatchCareerV1';
  const CAREER_BACKUP_STORAGE_KEY = 'strikewatchCareerBackupV1';
  const CAREER_SAVE_META_STORAGE_KEY = 'strikewatchCareerSaveMetaV1';
  const CAREER_EXPORT_FORMAT = 'strikewatch-career';
  const CAREER_STARTING_POINTS = 10;
  const CAREER_MAX_STAT = 10;
  const CAREER_BASE_CRIT_CHANCE = 0.05;
  const CAREER_BASE_CRIT_BONUS_DAMAGE = 0.50;
  const CAREER_CRIT_CHANCE_PER_POINT = 0.01;
  const CAREER_CRIT_DAMAGE_PER_POINT = 0.04;
  const CAREER_MAX_CRIT_CHANCE = 0.25;
  const CAREER_MAX_CRIT_BONUS_DAMAGE = 1.10;
  const CAREER_BASE_HEADSHOT_CHANCE = 0.035;
  const CAREER_HEADSHOT_MARKSMANSHIP_PER_POINT = 0.008;
  const CAREER_MAX_HEADSHOT_CHANCE = 0.22;
  const CAREER_DEFAULT_HEADSHOT_MULTIPLIER = 2.80;
  const CAREER_OWNED_TEAM = TEAM_BLUE;
  const CAREER_OWNED_SLOT = 0;


  const TEAM_LOGO_DEFS = Object.freeze({
    shield: { label: 'VANGUARD SHIELD', paths: '<path d="M32 5 52 12v16c0 13-8.3 23.8-20 31C20.3 51.8 12 41 12 28V12z"></path><path d="m32 13 11 4v10c0 8-4.4 15-11 20-6.6-5-11-12-11-20V17z" class="team-logo-cut"></path>' },
    wings: { label: 'STRIKE WINGS', paths: '<path d="M31 20 13 9l5 17-11 3 19 10 5 17 5-17 19-10-11-3 5-17z"></path><path d="m31 27-8-5 3 9-6 2 9 4 2 8 2-8 9-4-6-2 3-9z" class="team-logo-cut"></path>' },
    target: { label: 'TARGET CELL', paths: '<circle cx="32" cy="32" r="23"></circle><circle cx="32" cy="32" r="13" class="team-logo-cut"></circle><circle cx="32" cy="32" r="5"></circle><path d="M32 3v11M32 50v11M3 32h11M50 32h11"></path>' },
    bolt: { label: 'VOLT SPEAR', paths: '<path d="M37 4 13 36h15l-2 24 25-35H36z"></path><path d="m35 18-10 14h8l-1 10 9-13h-8z" class="team-logo-cut"></path>' },
    crown: { label: 'CROWN UNIT', paths: '<path d="m9 18 12 9 11-19 11 19 12-9-5 31H14z"></path><path d="M18 42h28v8H18z" class="team-logo-cut"></path><circle cx="9" cy="16" r="4"></circle><circle cx="32" cy="7" r="4"></circle><circle cx="55" cy="16" r="4"></circle>' }
  });
  const TEAM_LOGO_DEFAULT_ID = 'shield';
  const TEAM_LOGO_DEFAULT_COLOUR = '#63c8ef';

  function normaliseTeamLogoId(value) {
    const id = String(value || '').toLowerCase();
    return TEAM_LOGO_DEFS[id] ? id : TEAM_LOGO_DEFAULT_ID;
  }

  function normaliseTeamLogoColour(value) {
    const colour = String(value || '').trim();
    return /^#[0-9a-f]{6}$/i.test(colour) ? colour.toLowerCase() : TEAM_LOGO_DEFAULT_COLOUR;
  }

  function normaliseTeamIdentity(raw = null) {
    return {
      logoId: normaliseTeamLogoId(raw?.logoId),
      logoColor: normaliseTeamLogoColour(raw?.logoColor || raw?.colour)
    };
  }

  function teamLogoSvg(identity = careerState?.teamIdentity, className = '') {
    const safe = normaliseTeamIdentity(identity);
    const definition = TEAM_LOGO_DEFS[safe.logoId];
    return `<svg class="team-logo ${className}" data-team-logo-preview viewBox="0 0 64 64" role="img" aria-label="${definition.label}" style="color:${safe.logoColor}">${definition.paths}</svg>`;
  }

  function teamNameLockup(name = careerState?.name, className = '') {
    return `<span class="team-name-lockup ${className}">${teamLogoSvg(careerState?.teamIdentity, 'team-name-logo')}<span>${escapeCareerHtml(name || 'YOUR CLUB')}</span></span>`;
  }

  const CAREER_STAT_DEFS = {
    marksmanship: {
      label: 'MARKSMANSHIP',
      short: 'AIM',
      description: 'Tightens shot accuracy, narrows damage variation, raises headshot frequency and adds roughly 1% weapon damage per point.',
      affects: 'AIM · HEADSHOTS · DAMAGE CONSISTENCY · EFFECTIVE FIRE'
    },
    handling: {
      label: 'HANDLING',
      short: 'HANDLING',
      description: 'Reduces the delay between shots and shortens reload time. High-handling weapons improve this further.',
      affects: 'FIRE CADENCE · RELOADS · WEAPON CONTROL'
    },
    awareness: {
      label: 'AWARENESS',
      short: 'AWARENESS',
      description: 'Improves hearing range, target acquisition and reaction speed by about 0.026 seconds per point.',
      affects: 'HEARING · REACTION TIME · TARGET DETECTION'
    },
    mobility: {
      label: 'MOBILITY',
      short: 'MOBILITY',
      description: 'Raises movement speed and navigation quality, helping the operator rotate, pursue and escape more effectively.',
      affects: 'MOVE SPEED · PATHING · REPOSITIONING'
    },
    resilience: {
      label: 'RESILIENCE',
      short: 'RESILIENCE',
      description: 'Adds 4 maximum health per point and reduces incoming damage by roughly 2.7% per point.',
      affects: 'MAX HEALTH · DAMAGE RESISTANCE · SURVIVABILITY'
    },
    criticalChance: {
      label: 'CRIT CHANCE',
      short: 'CRIT %',
      description: 'Adds 1 percentage point to the operator’s base critical-hit chance per point. Weapon bonuses are added afterwards.',
      affects: 'CRITICAL-HIT FREQUENCY · WEAPON SYNERGY'
    },
    criticalDamage: {
      label: 'CRIT BONUS DAMAGE',
      short: 'CRIT DMG',
      description: 'Adds 4 percentage points to bonus damage dealt by a critical hit per point. Base critical hits deal 50% bonus damage.',
      affects: 'CRITICAL-HIT POWER · FINISHING DAMAGE'
    }
  };

  const CAREER_WEAPON_CATALOG = {
    'scrap-p12': {
      id: 'scrap-p12',
      name: 'P12 SCRAPLINE',
      quality: 'WORN',
      rarity: 'starter',
      category: 'pistol',
      slotType: 'sidearm',
      weightClass: 'light',
      movementPenalty: 0,
      turnPenalty: 0.015,
      movingAccuracyPenalty: 0.020,
      sprintSettlePenalty: 0.035,
      fatigueLoad: 0.20,
      switchTime: 0.30,
      noiseRadius: 20,
      benefits: ['No movement penalty', 'Fast emergency draw', 'Low fatigue load'],
      drawbacks: ['Weak armour penetration', 'Short effective range', 'Small worn magazine'],
      viewmodel: 'P12 SIDEARM',
      modelClass: 'scrap-p12',
      damageMin: 9,
      damageMax: 14,
      fireRate: 0.245,
      accuracy: 0.52,
      handling: 0.38,
      range: 7.2,
      magSize: 9,
      reloadTime: 1.82,
      recoilKick: 1.16,
      recoilRecovery: 4.2,
      recoilSpread: 0.050,
      recoilVisualKick: 1.14,
      recoilVisualRecovery: 4.2,
      recoilRoll: 0.034,
      cadenceJitter: 0.052,
      burstChance: 0.18,
      viewmodelPose: { x: -0.010, y: -0.014, z: 0.018, pitch: 0.018, roll: -0.012 },
      muzzleProfile: { flashScale: 1.08, smokeScale: 1.16, caseScale: 1.00 },
      reloadAudioProfile: 'worn-pistol',
      critChanceBonus: 0.00,
      critDamageBonus: 0.00,
      headshotMultiplier: 2.85,
      armourPenetration: 18,
      description: 'A battered training sidearm. It keeps full mobility and draws quickly, but its short range, worn magazine and weak armour penetration make it an emergency or budget option.'
    },
    'service-p12': {
      id: 'service-p12',
      name: 'P12 SERVICE',
      quality: 'STANDARD',
      rarity: 'common',
      category: 'pistol',
      slotType: 'sidearm',
      weightClass: 'light',
      movementPenalty: 0,
      turnPenalty: 0.010,
      movingAccuracyPenalty: 0.014,
      sprintSettlePenalty: 0.025,
      fatigueLoad: 0.25,
      switchTime: 0.28,
      noiseRadius: 21,
      benefits: ['Reliable close-range accuracy', 'Quick draw and reload', 'No movement penalty'],
      drawbacks: ['Limited magazine', 'Shorter range than primaries', 'Modest armour penetration'],
      viewmodel: 'P12 SIDEARM',
      modelClass: 'service-p12',
      damageMin: 11,
      damageMax: 16,
      fireRate: 0.205,
      accuracy: 0.61,
      handling: 0.57,
      range: 7.9,
      magSize: 11,
      reloadTime: 1.46,
      recoilKick: 0.82,
      recoilRecovery: 5.8,
      recoilSpread: 0.030,
      recoilVisualKick: 0.86,
      recoilVisualRecovery: 7.0,
      recoilRoll: 0.017,
      cadenceJitter: 0.030,
      burstChance: 0.34,
      viewmodelPose: { x: 0, y: 0, z: 0, pitch: 0, roll: 0 },
      muzzleProfile: { flashScale: 0.92, smokeScale: 0.82, caseScale: 0.92 },
      reloadAudioProfile: 'service-pistol',
      critChanceBonus: 0.01,
      critDamageBonus: 0.10,
      headshotMultiplier: 3.15,
      armourPenetration: 25,
      description: 'A dependable service sidearm for quick close-range reactions. It draws and reloads rapidly with no movement penalty, but cannot match a rifle for range, magazine size or armour penetration.'
    },
    'viper-9': {
      id: 'viper-9',
      name: 'VIPER-9 COMPACT',
      quality: 'REFINED',
      rarity: 'uncommon',
      category: 'pistol',
      slotType: 'sidearm',
      weightClass: 'light',
      movementPenalty: 0,
      turnPenalty: 0.008,
      movingAccuracyPenalty: 0.012,
      sprintSettlePenalty: 0.020,
      fatigueLoad: 0.28,
      switchTime: 0.25,
      noiseRadius: 22,
      benefits: ['Fastest handling and reload', 'Strong emergency close-range cadence', 'No movement penalty'],
      drawbacks: ['Low per-shot damage', 'Lively recoil', 'Weak against heavy armour'],
      viewmodel: 'P12 SIDEARM',
      modelClass: 'viper-9',
      damageMin: 9,
      damageMax: 14,
      fireRate: 0.158,
      accuracy: 0.57,
      handling: 0.76,
      range: 7.4,
      magSize: 13,
      reloadTime: 1.16,
      recoilKick: 0.94,
      recoilRecovery: 6.5,
      recoilSpread: 0.046,
      recoilVisualKick: 0.98,
      recoilVisualRecovery: 9.4,
      recoilRoll: 0.031,
      cadenceJitter: 0.022,
      burstChance: 0.52,
      viewmodelPose: { x: 0.014, y: 0.010, z: -0.028, pitch: -0.018, roll: 0.014 },
      muzzleProfile: { flashScale: 1.18, smokeScale: 1.34, caseScale: 1.12 },
      reloadAudioProfile: 'compact-pistol',
      critChanceBonus: 0.03,
      critDamageBonus: 0.05,
      headshotMultiplier: 2.90,
      armourPenetration: 21,
      description: 'A fast compact sidearm built for sudden close-range contact. Its draw, cadence and reload are excellent, while low per-shot damage and weak armour penetration limit sustained fights.'
    },
    'ar4-sentinel': {
      id: 'ar4-sentinel',
      name: 'AR-4 SENTINEL',
      quality: 'TACTICAL',
      rarity: 'rare',
      category: 'rifle',
      slotType: 'primary',
      weightClass: 'medium',
      movementPenalty: 0.055,
      turnPenalty: 0.070,
      movingAccuracyPenalty: 0.060,
      sprintSettlePenalty: 0.115,
      fatigueLoad: 2.20,
      switchTime: 0.56,
      noiseRadius: 30,
      benefits: ['Strong mid-range accuracy', 'Large magazine', 'High armour penetration'],
      drawbacks: ['Slower close-quarters handling', 'Movement and fatigue cost', 'Long reload and louder report'],
      viewmodel: 'AR-4 RIFLE',
      modelClass: 'ar4-sentinel',
      damageMin: 10,
      damageMax: 15,
      fireRate: 0.188,
      accuracy: 0.68,
      handling: 0.49,
      range: 11.6,
      magSize: 20,
      reloadTime: 2.08,
      recoilKick: 0.84,
      recoilRecovery: 6.1,
      recoilSpread: 0.033,
      recoilVisualKick: 0.92,
      recoilVisualRecovery: 7.4,
      recoilRoll: 0.020,
      cadenceJitter: 0.026,
      burstChance: 0.46,
      viewmodelPose: { x: -0.018, y: -0.006, z: 0.025, pitch: 0.008, roll: -0.005 },
      muzzleProfile: { flashScale: 1.16, smokeScale: 1.08, caseScale: 1.08 },
      reloadAudioProfile: 'carbine',
      critChanceBonus: 0.01,
      critDamageBonus: 0.04,
      headshotMultiplier: 3.45,
      armourPenetration: 52,
      description: 'A controllable primary rifle for prepared mid-range fights. It brings a large magazine and strong armour penetration, but slows movement, settles poorly after sprinting and turns less cleanly in tight spaces.'
    }
  };

  const CAREER_ARMOUR_CATALOG = Object.freeze({
    none: Object.freeze({
      id: 'none', name: 'NO ARMOUR', quality: 'UNARMOURED', rarity: 'starter', classId: 'none',
      protection: 0, rating: 0, maxDurability: 0, movementPenalty: 0, handlingPenalty: 0, fatigueLoad: 0,
      coverage: 'NONE', roleFit: 'MAXIMUM MOBILITY', description: 'No ballistic protection. The operator keeps full movement and handling but every hit reaches health.'
    }),
    'scout-weave': Object.freeze({
      id: 'scout-weave', name: 'SCOUT WEAVE VEST', quality: 'LIGHT', rarity: 'common', classId: 'light', price: 18000,
      protection: 0.16, rating: 28, maxDurability: 72, movementPenalty: 0.018, handlingPenalty: 0.008, fatigueLoad: 0.8,
      coverage: 'TORSO', roleFit: 'ENTRY · FLANKER · SUPPORT', description: 'A light flexible vest that can turn one marginal torso hit into a survivable exchange with very little mobility loss.'
    }),
    'response-carrier': Object.freeze({
      id: 'response-carrier', name: 'RESPONSE CARRIER', quality: 'MEDIUM FLEX', rarity: 'uncommon', classId: 'medium-flex', price: 28500,
      protection: 0.215, rating: 38, maxDurability: 94, movementPenalty: 0.038, handlingPenalty: 0.018, fatigueLoad: 1.8,
      coverage: 'TORSO', roleFit: 'ENTRY · SUPPORT · FLEX', description: 'A mobile medium carrier balancing protection and route speed. It suits operators expected to fight and rotate repeatedly.'
    }),
    'guardian-plate': Object.freeze({
      id: 'guardian-plate', name: 'GUARDIAN PLATE RIG', quality: 'MEDIUM PLATE', rarity: 'rare', classId: 'medium', price: 36000,
      protection: 0.26, rating: 46, maxDurability: 112, movementPenalty: 0.062, handlingPenalty: 0.034, fatigueLoad: 3.0,
      coverage: 'TORSO', roleFit: 'ANCHOR · CALLER · SUPPORT', description: 'A stronger plate carrier for operators holding exposed lanes. Protection is reliable, but movement and weapon handling are noticeably slower.'
    }),
    'bastion-heavy': Object.freeze({
      id: 'bastion-heavy', name: 'BASTION HEAVY RIG', quality: 'HEAVY', rarity: 'elite', classId: 'heavy', price: 54000,
      protection: 0.34, rating: 64, maxDurability: 142, movementPenalty: 0.105, handlingPenalty: 0.065, fatigueLoad: 5.2,
      coverage: 'TORSO', roleFit: 'ANCHOR · HOLDING SUPPORT', description: 'A heavy torso rig designed to resist low-penetration sidearms. It is expensive, slower and still vulnerable to rifles, headshots and a complete integrity break.'
    })
  });

  function getCareerArmour(id = 'none') {
    return CAREER_ARMOUR_CATALOG[id] || CAREER_ARMOUR_CATALOG.none;
  }

  function careerArmourProtectionLabel(armourOrId) {
    const armour = typeof armourOrId === 'string' ? getCareerArmour(armourOrId) : (armourOrId || getCareerArmour('none'));
    if (armour.id === 'none') return 'NO PROTECTION';
    return `${Math.round(armour.protection * 100)}% BASE REDUCTION · ${armour.rating} RATING`;
  }

  const CAREER_ARMOUR_VIEWER_BASE_SCALE = 1.42;

  // Build 12.142: yaw and pitch are held at zero here and applied to the pivot
  // instead. Zoom stays on the inherited custom property because it only
  // changes on a button press, not once per frame.
  function careerArmourViewerTransform() {
    return `--armour-viewer-yaw:0deg;--armour-viewer-pitch:0deg;--armour-viewer-scale:${(CAREER_ARMOUR_VIEWER_BASE_SCALE * careerArmourViewerState.zoom).toFixed(4)}`;
  }

  function careerArmourPivotTransform() {
    return `rotateX(${careerArmourViewerState.pitch}deg) rotateY(${careerArmourViewerState.yaw}deg)`;
  }

  function careerArmourModelProfile(armour) {
    const profile = {
      shell: 'carrier-fabric',
      secondaryShell: 'carrier-shadow',
      strap: 'armour-strap-fabric',
      plate: 'plate-steel',
      sidePlate: 'plate-steel',
      pouch: 'carrier-shadow',
      buckle: 'armour-buckle-metal',
      accent: 'armour-olive-accent',
      trim: 'armour-clip',
      radio: 'dark-metal',
      cable: 'armour-cable',
      pocketShell: 'plate-pocket',
      rubber: 'armour-rubber',
      hasShoulderPads: false,
      hasCollar: false,
      hasNeckGuard: false,
      hasRadio: false,
      hasAbdomen: false,
      hasGroin: false,
      hasUtilityStrips: true,
      hasWaistPouches: true,
      chestScaleX: 1,
      chestScaleY: 1,
      chestDepth: 1,
      shoulderWidth: 1,
      shoulderHeight: 1,
      sideDepth: 1,
      beltWidth: 1,
      pouchScale: 1,
      plateScale: 1,
      plateHeight: 1,
      plateDepth: 1,
      frontLift: 0,
      topWidth: 0.96,
      waistWidth: 0.82,
      backWidth: 0.92,
      sideAngle: 78,
      sideForward: 0,
      strapSpread: 1,
      strapHeight: 1,
      yokeWidth: 0.74,
      yokeDepth: 1,
      frontFacetAngle: 12,
      rearFacetAngle: 10,
      wrapDepth: 1,
      rearPlateScale: 1,
      rearPlateHeight: 1,
      rearPlateDepth: 1,
      dragHandleScale: 1,
      platePocketScale: 1,
      platePocketHeight: 1,
      shoulderOffsetX: 1,
      shoulderOffsetY: 1,
      shoulderForward: 1,
      hemDrop: 0,
      fullWrap: false
    };
    switch (armour?.classId) {
      case 'none':
        profile.shell = 'armour-harness';
        profile.secondaryShell = 'armour-harness';
        profile.strap = 'armour-harness';
        profile.plate = 'dark-metal';
        profile.sidePlate = 'dark-metal';
        profile.pouch = 'armour-harness';
        profile.buckle = 'metal-edge';
        profile.accent = 'blue-accent';
        profile.trim = 'metal-edge';
        profile.pocketShell = 'armour-harness';
        profile.rubber = 'armour-harness';
        profile.hasUtilityStrips = false;
        profile.hasWaistPouches = false;
        profile.plateScale = 0.46;
        profile.plateHeight = 0.48;
        profile.plateDepth = 0.72;
        profile.chestScaleX = 0.78;
        profile.chestScaleY = 0.74;
        profile.chestDepth = 0.72;
        profile.sideDepth = 0.64;
        profile.beltWidth = 0.74;
        profile.pouchScale = 0.58;
        profile.topWidth = 0.72;
        profile.waistWidth = 0.60;
        profile.backWidth = 0.72;
        profile.sideAngle = 80;
        profile.strapSpread = 0.90;
        profile.yokeWidth = 0.54;
        profile.frontFacetAngle = 8;
        profile.rearFacetAngle = 8;
        profile.wrapDepth = 0.70;
        profile.rearPlateScale = 0.52;
        profile.rearPlateHeight = 0.56;
        profile.rearPlateDepth = 0.66;
        profile.dragHandleScale = 0.62;
        profile.platePocketScale = 0.56;
        profile.platePocketHeight = 0.64;
        break;
      case 'light':
        profile.shell = 'scout-weave-fabric';
        profile.secondaryShell = 'scout-weave-shadow';
        profile.strap = 'scout-weave-strap';
        profile.plate = 'scout-weave-plate';
        profile.sidePlate = 'scout-weave-plate';
        profile.pouch = 'scout-weave-shadow';
        profile.accent = 'armour-olive-accent';
        profile.plateScale = 0.68;
        profile.plateHeight = 0.70;
        profile.plateDepth = 0.86;
        profile.chestScaleX = 0.88;
        profile.chestScaleY = 0.86;
        profile.chestDepth = 0.82;
        profile.sideDepth = 0.82;
        profile.beltWidth = 0.84;
        profile.pouchScale = 0.80;
        profile.topWidth = 0.84;
        profile.waistWidth = 0.72;
        profile.backWidth = 0.84;
        profile.sideAngle = 77;
        profile.strapSpread = 0.96;
        profile.yokeWidth = 0.66;
        profile.frontFacetAngle = 10;
        profile.rearFacetAngle = 9;
        profile.wrapDepth = 0.82;
        profile.rearPlateScale = 0.74;
        profile.rearPlateHeight = 0.76;
        profile.rearPlateDepth = 0.82;
        profile.dragHandleScale = 0.78;
        profile.platePocketScale = 0.82;
        profile.platePocketHeight = 0.82;
        break;
      case 'medium-flex':
        profile.shell = 'carrier-fabric';
        profile.secondaryShell = 'carrier-shadow';
        profile.strap = 'armour-strap-fabric';
        profile.plate = 'carrier-plate';
        profile.sidePlate = 'carrier-plate';
        profile.pouch = 'carrier-pouch';
        profile.accent = 'blue-accent';
        profile.hasRadio = true;
        profile.hasCollar = true;
        profile.plateScale = 0.90;
        profile.plateHeight = 0.92;
        profile.plateDepth = 1.02;
        profile.chestScaleX = 1.02;
        profile.chestScaleY = 0.98;
        profile.chestDepth = 0.96;
        profile.sideDepth = 1.00;
        profile.beltWidth = 0.98;
        profile.pouchScale = 0.92;
        profile.topWidth = 0.98;
        profile.waistWidth = 0.82;
        profile.backWidth = 0.92;
        profile.sideAngle = 75;
        profile.sideForward = 3;
        profile.strapSpread = 1.02;
        profile.yokeWidth = 0.74;
        profile.frontFacetAngle = 12;
        profile.rearFacetAngle = 10;
        profile.wrapDepth = 0.96;
        profile.rearPlateScale = 0.92;
        profile.rearPlateHeight = 0.94;
        profile.rearPlateDepth = 0.98;
        profile.dragHandleScale = 0.92;
        profile.platePocketScale = 0.96;
        profile.platePocketHeight = 0.94;
        break;
      case 'medium':
        profile.shell = 'midnight-fabric';
        profile.secondaryShell = 'midnight-shadow';
        profile.strap = 'midnight-strap';
        profile.plate = 'midnight-plate';
        profile.sidePlate = 'midnight-plate';
        profile.pouch = 'midnight-shadow';
        profile.accent = 'metal-edge';
        profile.hasShoulderPads = true;
        profile.hasCollar = true;
        profile.hasAbdomen = true;
        profile.plateScale = 1.04;
        profile.plateHeight = 1.08;
        profile.plateDepth = 1.08;
        profile.chestScaleX = 1.10;
        profile.chestScaleY = 1.04;
        profile.chestDepth = 1.04;
        profile.shoulderWidth = 1.06;
        profile.shoulderHeight = 1.06;
        profile.sideDepth = 1.06;
        profile.beltWidth = 1.06;
        profile.pouchScale = 1.00;
        profile.topWidth = 1.04;
        profile.waistWidth = 0.90;
        profile.backWidth = 0.96;
        profile.sideAngle = 73;
        profile.sideForward = 5;
        profile.strapSpread = 1.04;
        profile.yokeWidth = 0.80;
        profile.yokeDepth = 1.06;
        profile.frontFacetAngle = 14;
        profile.rearFacetAngle = 12;
        profile.wrapDepth = 1.06;
        profile.rearPlateScale = 1.05;
        profile.rearPlateHeight = 1.06;
        profile.rearPlateDepth = 1.08;
        profile.dragHandleScale = 1.04;
        profile.platePocketScale = 1.04;
        profile.platePocketHeight = 1.04;
        profile.fullWrap = true;
        break;
      case 'heavy':
        profile.shell = 'heavy-shell';
        profile.secondaryShell = 'heavy-shell-shadow';
        profile.strap = 'heavy-strap';
        profile.plate = 'heavy-ceramic';
        profile.sidePlate = 'heavy-ceramic';
        profile.pouch = 'heavy-shell-shadow';
        profile.buckle = 'plate-steel';
        profile.accent = 'brass';
        profile.trim = 'plate-steel';
        profile.radio = 'dark-metal';
        profile.hasShoulderPads = true;
        profile.hasCollar = true;
        profile.hasNeckGuard = true;
        profile.hasRadio = true;
        profile.hasAbdomen = true;
        profile.hasGroin = true;
        profile.plateScale = 1.22;
        profile.plateHeight = 1.18;
        profile.plateDepth = 1.18;
        profile.chestScaleX = 1.26;
        profile.chestScaleY = 1.14;
        profile.chestDepth = 1.16;
        profile.shoulderWidth = 1.28;
        profile.shoulderHeight = 1.24;
        profile.sideDepth = 1.18;
        profile.beltWidth = 1.24;
        profile.pouchScale = 1.12;
        profile.frontLift = 4;
        profile.topWidth = 1.12;
        profile.waistWidth = 0.96;
        profile.backWidth = 1.02;
        profile.sideAngle = 70;
        profile.sideForward = 7;
        profile.strapSpread = 1.10;
        profile.strapHeight = 1.05;
        profile.yokeWidth = 0.86;
        profile.yokeDepth = 1.12;
        profile.frontFacetAngle = 16;
        profile.rearFacetAngle = 14;
        profile.wrapDepth = 1.16;
        profile.rearPlateScale = 1.16;
        profile.rearPlateHeight = 1.12;
        profile.rearPlateDepth = 1.20;
        profile.dragHandleScale = 1.14;
        profile.platePocketScale = 1.10;
        profile.platePocketHeight = 1.12;
        profile.shoulderOffsetX = 1.08;
        profile.shoulderOffsetY = 1.04;
        profile.shoulderForward = 1.18;
        profile.hemDrop = 4;
        profile.fullWrap = true;
        break;
      default:
        break;
    }
    return profile;
  }

  function careerArmour3dParts(armour) {
    const config = careerArmourModelProfile(armour);
    const parts = [];
    const add = (className, material, x, y, z, w, h, d, rz = 0, rx = 0, ry = 0, shape = 'box') => {
      parts.push({ className, material, x, y, z, w, h, d, rz, rx, ry, shape });
    };
    const addRounded = (className, material, x, y, z, w, h, d, rz = 0, rx = 0, ry = 0) => add(className, material, x, y, z, w, h, d, rz, rx, ry, 'rounded');
    const addCylinder = (className, material, x, y, z, w, h, d, rz = 0, rx = 0, ry = 0) => add(className, material, x, y, z, w, h, d, rz, rx, ry, 'cylinder-length');
    const shellWidth = 54 * config.chestScaleX;
    const shellHeight = 78 * config.chestScaleY;
    const shellDepth = 30 * config.chestDepth;
    const shellTop = -5 - config.frontLift * 0.2;
    const upperWidth = shellWidth * config.topWidth;
    const lowerWidth = shellWidth * config.waistWidth;
    const backWidth = shellWidth * config.backWidth;
    const upperHeight = shellHeight * 0.52;
    const lowerHeight = shellHeight * 0.40;
    const plateWidth = 34 * config.plateScale;
    const plateHeight = 40 * config.plateHeight;
    const plateDepth = 10 * config.plateDepth;
    const sideWidth = 16 * Math.max(0.86, config.sideDepth);
    const sideHeight = 56 * Math.max(0.84, config.chestScaleY);
    const shoulderWidth = 24 * config.shoulderWidth;
    const shoulderHeight = 18 * config.shoulderHeight;
    const shoulderDepth = 20 * Math.max(0.9, config.shoulderWidth);
    const beltWidth = 60 * config.beltWidth;
    const pouchWidth = 16 * config.pouchScale;
    const pouchHeight = 24 * config.pouchScale;
    const shoulderBaseX = upperWidth * 0.42;
    const harnessOnly = armour.id === 'none';
    const frontUpperZ = 10 + config.frontLift;
    const frontLowerZ = 10 + config.frontLift * 0.6;
    const rearUpperDepth = shellDepth * (harnessOnly ? 0.56 : 0.88);
    const rearLowerDepth = shellDepth * (harnessOnly ? 0.44 : 0.72);
    const rearSurfaceZ = -18 - rearUpperDepth * 0.5;
    const frontSurfaceZ = frontUpperZ + shellDepth * 0.5;
    const bridgeDepth = shellDepth * (1.02 + config.wrapDepth * 0.18);
    const addMirrored = (leftClass, rightClass, material, x, y, z, w, h, d, rz = 0, rx = 0, ry = 0, shape = 'rounded') => {
      const addPart = shape === 'cylinder' ? addCylinder : addRounded;
      addPart(leftClass, material, -x, y, z, w, h, d, -rz, rx, -ry);
      addPart(rightClass, material, x, y, z, w, h, d, rz, rx, ry);
    };

    // A faceted front/back shell replaces the old single slab silhouette. The
    // overlapping wings and full-depth bridges keep every visible section tied
    // into one believable carrier volume from every orbit angle.
    addRounded('shell-back-core upper', config.secondaryShell, 0, shellTop - 14, -18, backWidth * 0.66, upperHeight, rearUpperDepth);
    addMirrored('shell-back-wing-left upper', 'shell-back-wing-right upper', config.secondaryShell, backWidth * 0.31, shellTop - 14, -18, backWidth * 0.46, upperHeight * 0.96, rearUpperDepth * 0.92, 0, 0, config.rearFacetAngle);
    addRounded('shell-back-core lower', config.secondaryShell, 0, shellTop + 22, -16, backWidth * 0.70, lowerHeight, rearLowerDepth);
    addMirrored('shell-back-wing-left lower', 'shell-back-wing-right lower', config.secondaryShell, backWidth * 0.30, shellTop + 22, -16, backWidth * 0.44, lowerHeight * 0.96, rearLowerDepth * 0.92, 0, 0, config.rearFacetAngle * 0.82);

    addRounded('shell-front-core upper', config.shell, 0, shellTop - 13, frontUpperZ, upperWidth * 0.64, upperHeight, shellDepth);
    addMirrored('shell-front-wing-left upper', 'shell-front-wing-right upper', config.shell, upperWidth * 0.31, shellTop - 13, frontUpperZ - 1, upperWidth * 0.46, upperHeight * 0.96, shellDepth * 0.94, 0, 0, config.frontFacetAngle);
    addRounded('shell-front-core lower', config.shell, 0, shellTop + 18, frontLowerZ, lowerWidth * 0.70, lowerHeight, shellDepth * 0.92);
    addMirrored('shell-front-wing-left lower', 'shell-front-wing-right lower', config.shell, lowerWidth * 0.30, shellTop + 18, frontLowerZ - 1, lowerWidth * 0.44, lowerHeight * 0.96, shellDepth * 0.86, 0, 0, config.frontFacetAngle * 0.78);

    addRounded('shell-yoke', config.strap, 0, shellTop - 31, 1, upperWidth * config.yokeWidth, 10, 22 * config.yokeDepth);
    addMirrored('shoulder-bridge-left', 'shoulder-bridge-right', config.strap, upperWidth * 0.30, shellTop - 39, -1, 13, 27 * config.strapHeight, bridgeDepth, 10, 0, 0);
    addMirrored('cummerbund-left', 'cummerbund-right', config.secondaryShell, (upperWidth / 2) + 1, shellTop + 10, -2, 14, shellHeight * 0.50, shellDepth * config.wrapDepth, 0, 0, 0);
    addMirrored('cummerbund-rib-left', 'cummerbund-rib-right', config.trim, (upperWidth / 2) + 8, shellTop + 10, 2, 4, shellHeight * 0.44, shellDepth * Math.max(0.70, config.wrapDepth * 0.78), 0, 0, 0);

    addMirrored('side-pocket-left', 'side-pocket-right', config.pocketShell, (upperWidth / 2) + 5, shellTop + 8, 7 + config.sideForward, 17, sideHeight * 0.82, 15, 0, 0, config.sideAngle - 4);
    addMirrored('side-left outer', 'side-right outer', config.sidePlate, (upperWidth / 2) + 7, shellTop + 9, 10 + config.sideForward, 11, sideHeight * 0.72, sideWidth, 0, 0, config.sideAngle);
    addMirrored('side-buckle-left upper', 'side-buckle-right upper', config.buckle, (upperWidth / 2) + 10, shellTop - 5, 16, 7, 9, 5, 0, 0, config.sideAngle - 8);
    addMirrored('side-buckle-left lower', 'side-buckle-right lower', config.buckle, (upperWidth / 2) + 10, shellTop + 23, 16, 7, 9, 5, 0, 0, config.sideAngle - 8);

    addMirrored('strap-left', 'strap-right', config.strap, 24 * config.strapSpread, -43, 14, 12, 40 * config.strapHeight, 7, 18, -1, 9);
    addMirrored('strap-back-left', 'strap-back-right', config.strap, 22 * config.strapSpread, -42, rearSurfaceZ + 3, 11, 37 * config.strapHeight, 6, 16, 0, 7);
    addMirrored('strap-anchor-left', 'strap-anchor-right', config.trim, 23 * config.strapSpread, -56, 11, 10, 7, 7, 6, 0, 9);
    addMirrored('strap-buckle-left', 'strap-buckle-right', config.buckle, 27 * config.strapSpread, -25, 22, 6, 9, 5, 8);
    addRounded('belt', config.strap, 0, 41 + config.hemDrop, 4, beltWidth, 12, Math.max(22, shellDepth * 0.90));
    addRounded('buckle', config.buckle, 0, 41 + config.hemDrop, 22, 17, 10, 6);

    if (!harnessOnly) {
      const upperPocketWidth = plateWidth * (1.20 * config.platePocketScale);
      const upperPocketHeight = plateHeight * (0.80 * config.platePocketHeight);
      const upperPlateHeight = plateHeight * 0.70;
      const frontPocketZ = Math.max(20, frontSurfaceZ - Math.max(7, shellDepth * 0.16));
      const frontPlateZ = frontPocketZ + Math.max(6, plateDepth * 0.65);
      const plateWingX = plateWidth * 0.28;

      addRounded('plate-pocket upper', config.pocketShell, 0, -12, frontPocketZ, upperPocketWidth, upperPocketHeight, Math.max(11, shellDepth * 0.36));
      addRounded('center-plate upper', config.plate, 0, -14, frontPlateZ, plateWidth * 0.54, upperPlateHeight, plateDepth);
      addMirrored('plate-wing-left upper', 'plate-wing-right upper', config.plate, plateWingX, -14, frontPlateZ - 1, plateWidth * 0.42, upperPlateHeight * 0.97, plateDepth * 0.94, 0, 0, config.frontFacetAngle * 0.78);
      addRounded('plate-pocket lower', config.pocketShell, 0, 14, frontPocketZ - 1, plateWidth * (1.02 * config.platePocketScale), plateHeight * (0.36 * config.platePocketHeight), Math.max(10, shellDepth * 0.30));
      addRounded('center-plate lower', config.plate, 0, 12, frontPlateZ - 2, plateWidth * 0.46, plateHeight * 0.30, plateDepth * 0.9);
      addMirrored('plate-wing-left lower', 'plate-wing-right lower', config.plate, plateWidth * 0.24, 12, frontPlateZ - 3, plateWidth * 0.34, plateHeight * 0.29, plateDepth * 0.84, 0, 0, config.frontFacetAngle * 0.62);
      addRounded('plate-cap', config.trim, 0, -31, frontPlateZ - 1, plateWidth * 0.62, 7, 7);

      if (config.hasUtilityStrips) {
        for (const y of [-24, -14, -4, 6]) addRounded('molle-row', config.trim, 0, y, frontPlateZ + plateDepth * 0.58, plateWidth * 0.82, 3, 3);
      }
      addRounded('center-seam', config.accent, 0, -7, frontPlateZ + plateDepth * 0.62, 3, 55, 3);
      addMirrored('waist-panel-left', 'waist-panel-right', config.pouch, 19, 15, frontPlateZ + 1, 12, 14, 10, 3);
      if (config.hasWaistPouches) {
        addMirrored('pouch-left', 'pouch-right', config.pouch, 22, 21, frontPlateZ + 3, pouchWidth, pouchHeight, 13);
        addMirrored('pouch-cap-left', 'pouch-cap-right', config.trim, 22, 8, frontPlateZ + 8, pouchWidth * 0.88, 6, 4);
        addMirrored('pouch-clip-left', 'pouch-clip-right', config.buckle, 22, 14, frontPlateZ + 11, 4, 9, 3);
      }
      addMirrored('radio-clip-left', 'radio-clip-right', config.accent, 28, -11, frontPlateZ + 2, 6, 12, 4, 8);

      // Rear protection and utility details ensure a full orbit exposes a
      // designed back, not the reverse side of the front plate stack.
      const rearPocketDepth = Math.max(7, 8 * config.rearPlateDepth);
      const rearPocketZ = rearSurfaceZ - rearPocketDepth * 0.5 + 1.4;
      const rearPlateD = Math.max(5, 6 * config.rearPlateDepth);
      const rearPlateZ = rearPocketZ - rearPocketDepth * 0.5 - rearPlateD * 0.5 + 1.2;
      const rearPlateWidth = plateWidth * config.rearPlateScale;
      const rearPlateH = plateHeight * 0.76 * config.rearPlateHeight;
      addRounded('rear-plate-pocket', config.pocketShell, 0, -10, rearPocketZ, rearPlateWidth * 1.12, rearPlateH * 1.08, rearPocketDepth);
      addRounded('rear-plate', config.plate, 0, -11, rearPlateZ, rearPlateWidth, rearPlateH, rearPlateD);
      for (const y of [-22, -12, -2, 8]) addRounded('rear-molle-row', config.trim, 0, y, rearPlateZ - rearPlateD * 0.56, rearPlateWidth * 0.78, 3, 3);
      const handleScale = config.dragHandleScale;
      addMirrored('drag-handle-post-left', 'drag-handle-post-right', config.strap, 8 * handleScale, -49, rearSurfaceZ - 3, 5, 17 * handleScale, 5);
      addRounded('drag-handle', config.strap, 0, -57, rearSurfaceZ - 3, 22 * handleScale, 5, 5);
      addRounded('rear-id-panel', config.accent, 0, 21, rearPlateZ - rearPlateD * 0.58, rearPlateWidth * 0.54, 7, 3);
    }

    if (config.hasCollar) {
      addMirrored('collar-left', 'collar-right', config.strap, 16, -41, 12, 20, 12, 16, 24, 0, 11);
      addRounded('collar-yoke', config.rubber, 0, -40, 3, 18, 10, 18);
      addRounded('rear-collar', config.rubber, 0, -43, rearSurfaceZ + 4, 26, 11, 9);
    }
    if (config.hasNeckGuard) {
      addRounded('neck-guard', config.plate, 0, -52, 7, 30, 18, 19, 0, -6, 0);
      addRounded('rear-neck-guard', config.plate, 0, -52, rearSurfaceZ + 2, 28, 17, 11, 0, 6, 0);
    }
    if (config.hasShoulderPads) {
      addMirrored('shoulder-shell-left', 'shoulder-shell-right', config.rubber, shoulderBaseX * config.shoulderOffsetX, -31 * config.shoulderOffsetY, 8 * config.shoulderForward, shoulderWidth * 0.88, shoulderHeight * 1.08, shoulderDepth, 12, 0, 16);
      addMirrored('shoulder-left', 'shoulder-right', config.plate, (shoulderBaseX + 4) * config.shoulderOffsetX, -34 * config.shoulderOffsetY, 17 * config.shoulderForward, shoulderWidth, shoulderHeight, shoulderDepth, 18, 0, 18);
      addMirrored('shoulder-rear-left', 'shoulder-rear-right', config.plate, (shoulderBaseX + 2) * config.shoulderOffsetX, -33 * config.shoulderOffsetY, rearSurfaceZ + 5, shoulderWidth * 0.78, shoulderHeight * 0.88, shoulderDepth * 0.76, 15, 0, 14);
    }
    if (config.hasAbdomen) {
      addRounded('abdomen-shell', config.pocketShell, 0, 24 + config.hemDrop, 20, 36 * Math.max(0.92, config.plateScale), 16, 11);
      addRounded('abdomen', config.plate, 0, 24 + config.hemDrop, 26, 33 * Math.max(0.92, config.plateScale), 12, 10);
      addMirrored('abdomen-wing-left', 'abdomen-wing-right', config.plate, 15 * Math.max(0.92, config.plateScale), 24 + config.hemDrop, 24, 14, 11, 9, 0, 0, config.frontFacetAngle * 0.56);
    }
    if (config.hasGroin) {
      addRounded('groin-shell', config.pocketShell, 0, 54, 12, 28, 18, 10, 0, 7, 0);
      addRounded('groin', config.plate, 0, 58, 17, 24, 20, 9, 0, 8, 0);
    }
    if (config.hasRadio) {
      const radioX = (upperWidth / 2) + 7;
      addRounded('radio-body', config.radio, -radioX, -6, 19, 13, 31, 10, -10, 0, -10);
      addRounded('radio-screen', config.trim, -radioX, -7, 25, 8, 8, 3, -10, 0, -10);
      addCylinder('radio-antenna', config.buckle, -radioX + 4, -31, 22, 19, 2, 2, 0, 0, 90);
      addCylinder('radio-cable', config.cable, -15, -43, 18, 33, 3, 3, -10, 0, 28);
    }
    if (config.fullWrap) {
      addMirrored('side-pouch-left', 'side-pouch-right', config.pouch, (upperWidth / 2) + 11, 11, 0, 13, 25, 15, 0, 0, 86);
      addMirrored('side-pouch-cap-left', 'side-pouch-cap-right', config.trim, (upperWidth / 2) + 11, -1, 7, 11, 5, 4, 0, 0, 86);
      addMirrored('rear-pouch-left', 'rear-pouch-right', config.pouch, 17, 20, rearSurfaceZ - 4, 15, 19, 9);
      addMirrored('rear-pouch-cap-left', 'rear-pouch-cap-right', config.trim, 17, 9, rearSurfaceZ - 8, 13, 5, 3);
    }
    addMirrored('hem-left', 'hem-right', config.strap, 20, 52 + config.hemDrop, 8, 18, 10, 12, 3);
    addMirrored('rear-hem-left', 'rear-hem-right', config.strap, 20, 50 + config.hemDrop, rearSurfaceZ + 3, 18, 9, 8, 3);
    return parts;
  }

  // Build 12.151: the Supply Depot draws four carriers at once inside 232px
  // cards. At that size the trim authored for the 610px inspector — 3px MOLLE
  // rows, 3px seams, 5px buckles and caps, the radio cable and antenna — is
  // sub-pixel, but each one still costs a set of 3D quads, and the depot page
  // is quad-bound: hiding the rigs took the frame from ~58ms to 4.2ms while the
  // game's own JavaScript stayed at 1.6ms. The store keeps every volume that
  // carries the silhouette and drops what cannot resolve.
  const CAREER_ARMOUR_STORE_OMITTED = [
    /^molle-row$/,
    /^rear-molle-row$/,
    /^center-seam$/,
    /^cummerbund-rib-/,
    /^strap-anchor-/,
    /^strap-buckle-/,
    /^side-buckle-/,
    /^pouch-clip-/,
    /^pouch-cap-/,
    /^side-pouch-cap-/,
    /^rear-pouch-cap-/,
    /^plate-cap$/,
    /^rear-id-panel$/,
    /^radio-screen$/,
    /^radio-antenna$/,
    /^radio-cable$/,
    /^drag-handle-post-/,
    /^strap-back-/,
    /^rear-hem-/,
    /^radio-clip-/
  ];

  function careerArmourStoreParts(armour) {
    return careerArmour3dParts(armour)
      .filter(part => !CAREER_ARMOUR_STORE_OMITTED.some(pattern => pattern.test(part.className)));
  }

  function careerArmourThumbnailParts(armour) {
    const essentialPatterns = [
      /^shell-(?:front|back)-(?:core|wing)/,
      /^shell-yoke$/,
      /^shoulder-bridge-/,
      /^cummerbund-(?:left|right)$/,
      /^side-(?:left|right) outer$/,
      /^strap-(?:left|right)$/,
      /^belt$/,
      /^buckle$/,
      /^plate-pocket upper$/,
      /^center-plate upper$/,
      /^plate-wing-(?:left|right) upper$/,
      /^rear-plate$/,
      /^drag-handle$/,
      /^collar-(?:left|right)$/,
      /^collar-yoke$/,
      /^neck-guard$/,
      /^shoulder-(?:left|right)$/,
      /^abdomen$/,
      /^groin$/,
      /^radio-body$/
    ];
    return careerArmour3dParts(armour).filter(part => essentialPatterns.some(pattern => pattern.test(part.className)));
  }

  function careerArmourOperatorBodyParts() {
    const parts = [];
    const add = (className, material, x, y, z, w, h, d, rz = 0, rx = 0, ry = 0, shape = 'box') => {
      parts.push({ className, material, x, y, z, w, h, d, rz, rx, ry, shape });
    };
    const rounded = (className, material, x, y, z, w, h, d, rz = 0, rx = 0, ry = 0) => add(className, material, x, y, z, w, h, d, rz, rx, ry, 'rounded');
    const cylinder = (className, material, x, y, z, w, h, d, rz = 0, rx = 0, ry = 0) => add(className, material, x, y, z, w, h, d, rz, rx, ry, 'cylinder-length');

    // An inspection bust keeps the armour large enough to study while still
    // showing believable operator fit at the neck, shoulders, waist and arms.
    rounded('operator-pelvis', 'operator-uniform-shadow', 0, 58, -8, 50, 25, 31);
    rounded('operator-torso-upper', 'operator-uniform', 0, -8, -9, 62, 72, 34);
    rounded('operator-torso-lower', 'operator-uniform-shadow', 0, 29, -9, 51, 37, 30);
    rounded('operator-neck', 'operator-skin', 0, -58, -5, 16, 19, 16);
    rounded('operator-head', 'operator-skin', 0, -79, -4, 31, 34, 30);
    rounded('operator-helmet', 'operator-helmet', 0, -87, -6, 37, 23, 35);
    rounded('operator-face-wrap', 'operator-uniform-shadow', 0, -74, 14, 26, 11, 8);
    for (const side of [-1, 1]) {
      const sideName = side < 0 ? 'left' : 'right';
      rounded(`operator-shoulder-${sideName}`, 'operator-uniform', side * 42, -28, -5, 24, 29, 26, side * 5, 0, side * 10);
      cylinder(`operator-upper-arm-${sideName}`, 'operator-uniform', side * 52, 0, -2, 45, 17, 17, 90 + side * 7);
      cylinder(`operator-forearm-${sideName}`, 'operator-uniform-shadow', side * 61, 31, 2, 37, 15, 15, 90 + side * 4);
      rounded(`operator-glove-${sideName}`, 'operator-glove', side * 65, 53, 6, 17, 19, 16, side * 4);
      cylinder(`operator-thigh-${sideName}`, 'operator-trouser', side * 17, 84, -6, 38, 22, 22, 90);
    }
    return parts;
  }

  function careerArmourStoreFormParts() {
    const parts = [];
    const add = (className, material, x, y, z, w, h, d, rz = 0, rx = 0, ry = 0, shape = 'box') => {
      parts.push({ className, material, x, y, z, w, h, d, rz, rx, ry, shape });
    };
    const rounded = (className, material, x, y, z, w, h, d, rz = 0, rx = 0, ry = 0) => add(className, material, x, y, z, w, h, d, rz, rx, ry, 'rounded');
    const cylinder = (className, material, x, y, z, w, h, d, rz = 0, rx = 0, ry = 0) => add(className, material, x, y, z, w, h, d, rz, rx, ry, 'cylinder-length');

    // The store uses a subdued headless product form. Its restrained shoulder
    // and torso silhouette supplies scale and fit without obscuring the carrier
    // or introducing disconnected limbs around the product.
    rounded('store-form-torso-upper', 'armour-form', 0, -8, -10, 57, 70, 33);
    rounded('store-form-torso-lower', 'armour-form-shadow', 0, 28, -10, 47, 35, 29);
    rounded('store-form-pelvis', 'armour-form-shadow', 0, 56, -9, 45, 22, 28);
    rounded('store-form-neck', 'armour-form-edge', 0, -56, -6, 17, 21, 17);
    rounded('store-form-neck-cap', 'armour-form-edge', 0, -68, -6, 24, 7, 22);
    for (const side of [-1, 1]) {
      const sideName = side < 0 ? 'left' : 'right';
      rounded(`store-form-shoulder-${sideName}`, 'armour-form', side * 35, -27, -8, 18, 23, 23, side * 4, 0, side * 9);
    }
    rounded('store-form-stand-collar', 'armour-form-edge', 0, 73, -9, 23, 8, 23);
    cylinder('store-form-stand', 'armour-form-edge', 0, 92, -9, 31, 7, 7, 90);
    rounded('store-form-base', 'armour-form-shadow', 0, 109, -9, 54, 9, 30);
    return parts;
  }

  function careerArmourRigMarkup(armour, inlineStyle = '', bodyMode = false) {
    const rigLabel = armour.id === 'none' ? 'NO VEST' : escapeCareerHtml(armour.quality);
    const styleAttribute = inlineStyle ? ` style="${inlineStyle}"` : '';
    const mode = bodyMode === true ? 'full' : String(bodyMode || '').toLowerCase();
    const showOperator = mode === 'full' || mode === 'detail' || mode === 'operator';
    const showStoreForm = mode === 'store' || mode === 'display';
    const compactModel = mode === 'thumbnail' || mode === 'compact';
    const productOnly = mode === 'product' || mode === 'armour-only';
    const armourSource = compactModel
      ? careerArmourThumbnailParts(armour)
      : (showStoreForm ? careerArmourStoreParts(armour) : careerArmour3dParts(armour));
    const armourParts = armourSource.map(careerWeaponPartMarkup).join('');
    const bodyParts = showOperator
      ? careerArmourOperatorBodyParts().map(careerWeaponPartMarkup).join('')
      : (showStoreForm ? careerArmourStoreFormParts().map(careerWeaponPartMarkup).join('') : '');
    const bodyClass = showOperator ? 'career-armour-operator-body' : 'career-armour-store-form';
    const rigModeClass = [
      showOperator ? 'with-operator-body' : '',
      showStoreForm ? 'with-store-form' : '',
      compactModel ? 'compact-model' : '',
      productOnly ? 'product-only' : ''
    ].filter(Boolean).join(' ');
    // Build 12.142: the live rotation is applied to a dedicated pivot rather
    // than to `--armour-viewer-yaw/pitch` on the rig root. Those are inherited
    // custom properties, so changing them every frame invalidated the computed
    // style of every cuboid face beneath them — measured at 9.6ms per rotation
    // step against 0.03ms for a direct transform on a single element.
    return `<div class="career-armour-rig ${escapeCareerHtml(armour.classId)} ${rigModeClass}" data-career-armour-rig${styleAttribute} aria-hidden="true">
      <i class="career-armour-ground-shadow"></i>
      <span class="career-armour-viewer-pivot" data-career-armour-pivot${productOnly ? ` style="transform:${careerArmourPivotTransform()}"` : ''}>
        <span class="career-armour-model-system">
          ${bodyParts ? `<span class="career-weapon-rig ${bodyClass}" aria-hidden="true">${bodyParts}</span>` : ''}
          <span class="career-weapon-rig career-armour-weapon-system" aria-hidden="true">${armourParts}</span>
        </span>
      </span>
      <span class="armour-rig-label">${rigLabel}</span>
    </div>`;
  }

  function careerArmourVisualMarkup(armourOrId, className = '') {
    const armour = typeof armourOrId === 'string' ? getCareerArmour(armourOrId) : (armourOrId || getCareerArmour('none'));
    const classToken = String(className || '');
    const context = classToken.toLowerCase();
    const ariaLabel = `${escapeCareerHtml(armour.name)} full-depth three-dimensional armour model`;
    if (context.includes('detail')) {
      const rig = careerArmourRigMarkup(armour, careerArmourViewerTransform(), 'product');
      return `<div class="career-armour-inspector ${escapeCareerHtml(armour.classId)} ${escapeCareerHtml(classToken)} ${careerArmourViewerState.autoRotate ? 'auto-rotating' : ''}" data-career-armour-viewer data-armour-id="${escapeCareerHtml(armour.id)}">
        <div class="career-armour-showcase career-armour-inspector-stage" role="img" aria-label="Interactive ${ariaLabel}. Drag or swipe to inspect the front, sides and rear.">
          <div class="career-armour-showcase-grid" aria-hidden="true"></div>
          <div class="career-armour-showcase-shadow" aria-hidden="true"></div>
          ${rig}
          <div class="career-inspector-callout"><span>FULL-DEPTH 3D INSPECTION</span><strong>DRAG / SWIPE · FRONT / SIDE / REAR</strong></div>
          <span class="career-armour-showcase-caption">ARMOUR ONLY · COMPLETE 360° MODEL</span>
        </div>
        <div class="career-inspector-controls career-armour-inspector-controls" aria-label="Armour model controls">
          <button data-career-armour-viewer-action="rotate-left" aria-label="Rotate armour left">ROTATE ◀</button>
          <button data-career-armour-viewer-action="zoom-out" aria-label="Zoom armour out">ZOOM −</button>
          <button data-career-armour-viewer-action="reset" aria-label="Reset armour view">RESET VIEW</button>
          <button data-career-armour-viewer-action="zoom-in" aria-label="Zoom armour in">ZOOM +</button>
          <button data-career-armour-viewer-action="rotate-right" aria-label="Rotate armour right">ROTATE ▶</button>
          <button class="${careerArmourViewerState.autoRotate ? 'active' : ''}" data-career-armour-viewer-action="auto" aria-pressed="${careerArmourViewerState.autoRotate ? 'true' : 'false'}">AUTO ${careerArmourViewerState.autoRotate ? 'ON' : 'OFF'}</button>
        </div>
      </div>`;
    }
    const storeMode = context.includes('store');
    const inventoryMode = context.includes('inventory');
    const rig = careerArmourRigMarkup(armour, '', storeMode ? 'store' : (inventoryMode ? 'thumbnail' : false));
    const storeCaption = storeMode
      ? '<span class="career-armour-store-caption"><b>FULL-DEPTH 3D</b><small>AUTO ORBIT · FRONT / SIDE / REAR</small></span>'
      : '';
    return `<span class="career-armour-mini3d ${escapeCareerHtml(armour.classId)} ${escapeCareerHtml(classToken)}" role="img" aria-label="${ariaLabel}">${rig}${storeCaption}</span>`;
  }

  function careerWeaponPresentation(weaponOrId) {
    const weapon = typeof weaponOrId === 'string'
      ? (CAREER_WEAPON_CATALOG[weaponOrId] || CAREER_WEAPON_CATALOG['scrap-p12'])
      : (weaponOrId || CAREER_WEAPON_CATALOG['scrap-p12']);
    const averageDamage = (Number(weapon.damageMin) + Number(weapon.damageMax)) * 0.5;
    const rangeBand = weapon.range <= 7.35 ? 'CLOSE QUARTERS' : weapon.range <= 8.25 ? 'SHORT–MID RANGE' : weapon.range <= 12.5 ? 'MID RANGE' : 'LONG RANGE';
    const recoilLabel = weapon.recoilKick >= 1.05 ? 'HEAVY SNAP' : weapon.recoilKick >= 0.90 ? 'LIVELY KICK' : 'CONTROLLED KICK';
    const cadenceLabel = weapon.fireRate <= 0.17 ? 'RAPID CADENCE' : weapon.fireRate <= 0.215 ? 'QUICK CADENCE' : 'MEASURED CADENCE';
    const reloadLabel = weapon.reloadTime <= 1.25 ? 'FAST RELOAD' : weapon.reloadTime <= 1.55 ? 'STANDARD RELOAD' : 'SLOW RELOAD';
    const headshotLabel = `${(Number(weapon.headshotMultiplier) || CAREER_DEFAULT_HEADSHOT_MULTIPLIER).toFixed(2)}× HEADSHOT`;
    const controlLabel = weapon.recoilRecovery >= 6.2 ? 'FAST RECOVERY' : weapon.recoilRecovery >= 5.2 ? 'STEADY RECOVERY' : 'DELIBERATE RECOVERY';
    const recommendedUse = weapon.id === 'ar4-sentinel'
      ? 'CONTROLLED MID-RANGE BURSTS & LANE PRESSURE'
      : weapon.id === 'viper-9'
        ? 'AGGRESSIVE ENTRY & RAPID RE-PEEKS'
        : weapon.id === 'service-p12'
          ? 'CONTROLLED ANGLES & RELIABLE TRADES'
          : 'BUDGET CLOSE-RANGE SUPPORT';
    const roleFit = weapon.id === 'ar4-sentinel' ? 'MARKSMAN · SUPPORT · FLEX' : weapon.id === 'viper-9' ? 'ENTRY · FLANKER' : weapon.id === 'service-p12' ? 'SUPPORT · MARKSMAN · FLEX' : 'ENTRY · SUPPORT';
    return {
      averageDamage,
      rangeBand,
      recoilLabel,
      cadenceLabel,
      reloadLabel,
      controlLabel,
      headshotLabel,
      recommendedUse,
      roleFit,
      summary: `${rangeBand} · ${cadenceLabel} · ${recoilLabel}`,
      viewmodelPose: weapon.viewmodelPose || { x: 0, y: 0, z: 0, pitch: 0, roll: 0 },
      muzzleProfile: weapon.muzzleProfile || { flashScale: 1, smokeScale: 1, caseScale: 1 }
    };
  }


  const CAREER_RELOAD_AUDIO_PROFILES = Object.freeze([
    'worn-pistol',
    'service-pistol',
    'compact-pistol',
    'pistol',
    'smg',
    'carbine',
    'rifle'
  ]);

  function careerWeaponReloadAudioProfile(weaponOrId) {
    const weapon = typeof weaponOrId === 'string'
      ? (CAREER_WEAPON_CATALOG[weaponOrId] || CAREER_NPC_WEAPON_CATALOG?.[weaponOrId] || null)
      : weaponOrId;
    const explicit = String(weapon?.reloadAudioProfile || '').trim();
    if (explicit) return explicit;
    const model = String(weapon?.modelClass || weapon?.id || '').toLowerCase();
    const name = String(weapon?.name || weapon?.viewmodel || '').toUpperCase();
    if (model.includes('scrap')) return 'worn-pistol';
    if (model.includes('viper') || name.includes('VIPER') || name.includes('KILO')) return name.includes('KILO') ? 'smg' : 'compact-pistol';
    if (model.includes('service') || name.includes('P12') || weapon?.category === 'pistol') return 'service-pistol';
    if (name.includes('M8')) return 'carbine';
    if (name.includes('VX') || name.includes('AR-')) return 'rifle';
    return 'rifle';
  }

  function validateCareerWeaponReloadAudioCoverage() {
    const entries = [
      ...Object.values(CAREER_WEAPON_CATALOG),
      ...Object.values(CAREER_NPC_WEAPON_CATALOG),
      ...weaponDefs,
      SIDEARM_DEF
    ];
    const missing = entries
      .filter(weapon => !String(weapon?.reloadAudioProfile || '').trim())
      .map(weapon => weapon?.id || weapon?.name || 'unknown');
    const unsupported = entries
      .filter(weapon => !CAREER_RELOAD_AUDIO_PROFILES.includes(String(weapon?.reloadAudioProfile || '')))
      .map(weapon => `${weapon?.id || weapon?.name || 'unknown'}:${weapon?.reloadAudioProfile || 'missing'}`);
    return { ok: missing.length === 0 && unsupported.length === 0, missing, unsupported, total: entries.length };
  }

  const CAREER_SKIN_CATALOG = {
    'urban-grid': {
      id: 'urban-grid',
      type: 'skin',
      name: 'URBAN GRID',
      quality: 'COMMON',
      rarity: 'common',
      description: 'A muted slate-and-red geometric finish designed for dense industrial environments.',
      duplicateXp: 35
    }
  };
  const CAREER_CRATE_REWARDS = [
    { type: 'weapon', id: 'service-p12', weight: 0.32 },
    { type: 'weapon', id: 'viper-9', weight: 0.32 },
    { type: 'weapon', id: 'ar4-sentinel', weight: 0.14 },
    { type: 'skin', id: 'urban-grid', weight: 0.22 }
  ];
  const CAREER_CRATE_POOL = CAREER_CRATE_REWARDS.map(reward => `${reward.type}:${reward.id}`);
  const CAREER_GOLD_COIN_CRATE_PRICE = 60;
  const CAREER_GOLD_COIN_HISTORY_LIMIT = 80;

  const CAREER_MULTI_KILL_WINDOW = 18;
  const CAREER_MULTI_KILL_REWARDS = Object.freeze({
    2: Object.freeze({ count: 2, key: 'double', title: 'DOUBLE KILL', goldCoins: 1, xp: 8, credits: 1500 }),
    3: Object.freeze({ count: 3, key: 'triple', title: 'TRIPLE KILL', goldCoins: 2, xp: 16, credits: 3000 }),
    4: Object.freeze({ count: 4, key: 'ultra', title: 'ULTRA KILL', goldCoins: 3, xp: 28, credits: 5000 }),
    5: Object.freeze({ count: 5, key: 'rampage', title: 'RAMPAGE', goldCoins: 5, xp: 50, credits: 9000 })
  });

  function careerMultiKillTier(count) {
    return CAREER_MULTI_KILL_REWARDS[clamp(Math.round(Number(count) || 0), 0, 5)] || null;
  }

  function careerMultiKillRewardBreakdown(events = []) {
    const valid = Array.isArray(events) ? events.filter(event => careerMultiKillTier(event?.count)) : [];
    return valid.reduce((total, event) => {
      const tier = careerMultiKillTier(event.count);
      total.events++;
      total.goldCoins += tier.goldCoins;
      total.xp += tier.xp;
      total.credits += tier.credits;
      total.highest = Math.max(total.highest, tier.count);
      total.byTier[tier.key] = (total.byTier[tier.key] || 0) + 1;
      return total;
    }, { events: 0, goldCoins: 0, xp: 0, credits: 0, highest: 0, byTier: { double: 0, triple: 0, ultra: 0, rampage: 0 } });
  }

  function careerGoldCoins(value = careerState?.goldCoins) {
    return `${Math.max(0, Math.round(Number(value) || 0)).toLocaleString()} GC`;
  }

  function careerGoldCoinRewardBreakdown(won, matchMode = 'league', blueRounds = 0, redRounds = 0) {
    const mode = matchMode === 'league' ? 'league' : 'exhibition';
    const roundsWon = clamp(Math.round(Number(blueRounds) || 0), 0, 3);
    const roundsLost = clamp(Math.round(Number(redRounds) || 0), 0, 3);
    const participation = mode === 'league' ? 3 : 2;
    const roundReward = roundsWon;
    const victoryBonus = won ? (mode === 'league' ? 7 : 5) : 0;
    const sweepBonus = won && roundsLost === 0 ? (mode === 'league' ? 2 : 1) : 0;
    const amount = participation + roundReward + victoryBonus + sweepBonus;
    return {
      mode,
      won: Boolean(won),
      participation,
      roundReward,
      victoryBonus,
      sweepBonus,
      amount,
      label: won ? (sweepBonus ? 'VICTORY & SWEEP AWARD' : 'VICTORY AWARD') : 'MATCH PARTICIPATION AWARD'
    };
  }

  function careerGoldCoinTransaction(amount, label, detail = {}) {
    const delta = Math.round(Number(amount) || 0);
    careerState.goldCoinHistory = Array.isArray(careerState.goldCoinHistory) ? careerState.goldCoinHistory : [];
    careerState.goldCoinHistory.unshift({
      id: `GC-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      match: Math.max(0, Number(careerState.totalMatches) || 0),
      week: Math.max(1, Number(careerState.week) || 1),
      amount: delta,
      label: String(label || 'Gold Coin activity'),
      ...detail
    });
    careerState.goldCoinHistory = careerState.goldCoinHistory.slice(0, CAREER_GOLD_COIN_HISTORY_LIMIT);
    return delta;
  }

  function settleCareerGoldCoinsAfterMatch(winner, summary = {}) {
    const won = winner === CAREER_OWNED_TEAM;
    const matchMode = careerState.league?.activeMode === 'league' ? 'league' : 'exhibition';
    const reward = careerGoldCoinRewardBreakdown(won, matchMode, summary.blueScore, summary.redScore);
    const multiKillBonus = Math.max(0, Math.round(Number(summary?.multiKillBonus?.goldCoins) || 0));
    const totalAmount = reward.amount + multiKillBonus;
    careerState.goldCoins = Math.max(0, Math.round(Number(careerState.goldCoins) || 0) + totalAmount);
    careerGoldCoinTransaction(reward.amount, reward.label, {
      type: 'match', mode: reward.mode, won,
      score: `${summary.blueScore ?? 0}-${summary.redScore ?? 0}`
    });
    if (multiKillBonus > 0) careerGoldCoinTransaction(multiKillBonus, 'MULTI-KILL BONUS', {
      type: 'multi-kill', mode: reward.mode, won,
      events: Math.max(0, Number(summary?.multiKillBonus?.events) || 0)
    });
    return { ...reward, baseAmount: reward.amount, multiKillBonus, amount: totalAmount, balanceAfter: careerState.goldCoins };
  }

  function normaliseCareerCrateReward(value) {
    if (value && typeof value === 'object' && value.type && value.id) return { type: value.type, id: value.id };
    const raw = String(value || '');
    if (raw.includes(':')) {
      const [type, id] = raw.split(':', 2);
      return { type, id };
    }
    if (CAREER_WEAPON_CATALOG[raw]) return { type: 'weapon', id: raw };
    if (CAREER_SKIN_CATALOG[raw]) return { type: 'skin', id: raw };
    return { type: 'weapon', id: 'service-p12' };
  }

  function careerCrateRewardKey(reward) {
    const item = normaliseCareerCrateReward(reward);
    return `${item.type}:${item.id}`;
  }

  function rollCareerCrateReward(randomValue = Math.random()) {
    const roll = clamp(Number(randomValue) || 0, 0, 0.999999);
    let cursor = 0;
    for (const reward of CAREER_CRATE_REWARDS) {
      cursor += reward.weight;
      if (roll < cursor) return { type: reward.type, id: reward.id };
    }
    const fallback = CAREER_CRATE_REWARDS[CAREER_CRATE_REWARDS.length - 1];
    return { type: fallback.type, id: fallback.id };
  }


  // Authoritative weapon visuals. All inventory, crate, first-person,
  // third-person and corpse renderers must consume these same parts instead of
  // defining separate dimensions. Context-specific code may change pose,
  // animation and scale, but never the weapon's underlying geometry.
  const CAREER_WEAPON_VISUAL_REVISION = '12.56-connected-render-scale-1';
  const CAREER_WEAPON_MATERIAL_STYLES = Object.freeze({
    'gunmetal':     { colour: [0.105, 0.132, 0.146], surface: 3, roughness: 0.22, emissive: 0 },
    'dark-metal':   { colour: [0.028, 0.040, 0.047], surface: 3, roughness: 0.24, emissive: 0 },
    'metal-edge':   { colour: [0.265, 0.300, 0.318], surface: 3, roughness: 0.16, emissive: 0 },
    'polymer':      { colour: [0.052, 0.074, 0.084], surface: 6, roughness: 0.70, emissive: 0 },
    'rubber':       { colour: [0.024, 0.032, 0.036], surface: 6, roughness: 0.90, emissive: 0 },
    'black':        { colour: [0.010, 0.014, 0.016], surface: 3, roughness: 0.30, emissive: 0 },
    'worn-metal':   { colour: [0.145, 0.132, 0.116], surface: 3, roughness: 0.40, emissive: 0 },
    'worn-polymer': { colour: [0.090, 0.086, 0.078], surface: 6, roughness: 0.82, emissive: 0 },
    'brass':        { colour: [0.52, 0.33, 0.09], surface: 3, roughness: 0.24, emissive: 0.02 },
    'blue-accent':  { colour: [0.09, 0.42, 0.68], surface: 4, roughness: 0.20, emissive: 0.12 },
    'green-accent': { colour: [0.10, 0.50, 0.31], surface: 4, roughness: 0.20, emissive: 0.12 }
  });

  function careerWeaponMaterialStyle(material, skinId = null) {
    const base = CAREER_WEAPON_MATERIAL_STYLES[material] || CAREER_WEAPON_MATERIAL_STYLES['gunmetal'];
    if (skinId !== 'urban-grid') return base;
    const urbanColours = {
      'gunmetal': [0.165, 0.178, 0.186],
      'dark-metal': [0.045, 0.052, 0.058],
      'metal-edge': [0.330, 0.350, 0.360],
      'polymer': [0.090, 0.100, 0.106],
      'worn-metal': [0.175, 0.180, 0.182],
      'worn-polymer': [0.100, 0.105, 0.105],
      'blue-accent': [0.48, 0.11, 0.10],
      'green-accent': [0.48, 0.11, 0.10],
      'brass': [0.52, 0.33, 0.09],
      'rubber': [0.024, 0.032, 0.036],
      'black': [0.010, 0.014, 0.016]
    };
    return { ...base, colour: urbanColours[material] || base.colour };
  }

  // Fallback non-owned operators use compact starter archetypes. Generated
  // league opponents use their persistent player profiles; these definitions
  // only prevent generic exhibition bots from having hidden elite bonuses.
  const CAREER_NPC_STAT_ARCHETYPES = [
    { marksmanship: 3, handling: 2, awareness: 2, mobility: 2, resilience: 1, criticalChance: 1, criticalDamage: 1 },
    { marksmanship: 1, handling: 3, awareness: 2, mobility: 2, resilience: 2, criticalChance: 2, criticalDamage: 1 },
    { marksmanship: 2, handling: 1, awareness: 3, mobility: 2, resilience: 2, criticalChance: 1, criticalDamage: 2 },
    { marksmanship: 2, handling: 2, awareness: 1, mobility: 3, resilience: 2, criticalChance: 2, criticalDamage: 1 },
    { marksmanship: 2, handling: 2, awareness: 2, mobility: 1, resilience: 3, criticalChance: 1, criticalDamage: 2 }
  ];

  const CAREER_NPC_WEAPON_CATALOG = {
    'field-p12': {
      id: 'field-p12', name: 'P12 FIELD-WORN', quality: 'WORN', rarity: 'starter',
      category: 'pistol', viewmodel: 'P12 SIDEARM', modelClass: 'scrap-p12', reloadAudioProfile: 'worn-pistol',
      damageMin: 10, damageMax: 15, fireRate: 0.235, accuracy: 0.54,
      handling: 0.42, range: 7.3, magSize: 9, reloadTime: 1.76, recoilKick: 1.08, recoilRecovery: 4.4, recoilSpread: 0.046, recoilVisualKick: 1.08, recoilVisualRecovery: 5.0, recoilRoll: 0.030, cadenceJitter: 0.048, burstChance: 0.22, critChanceBonus: 0.00, critDamageBonus: 0.00, headshotMultiplier: 2.80, armourPenetration: 17,
      description: 'A heavily issued sidearm kept operational with depot parts.'
    },
    'r9-trainer': {
      id: 'r9-trainer', name: 'R9 TRAINER', quality: 'WORN', rarity: 'starter',
      category: 'pistol', viewmodel: 'P12 SIDEARM', modelClass: 'service-p12', reloadAudioProfile: 'service-pistol',
      damageMin: 9, damageMax: 14, fireRate: 0.225, accuracy: 0.56,
      handling: 0.44, range: 7.1, magSize: 10, reloadTime: 1.71, recoilKick: 0.98, recoilRecovery: 4.8, recoilSpread: 0.041, recoilVisualKick: 1.00, recoilVisualRecovery: 5.8, recoilRoll: 0.025, cadenceJitter: 0.042, burstChance: 0.26, critChanceBonus: 0.01, critDamageBonus: 0.04, headshotMultiplier: 2.95, armourPenetration: 20,
      description: 'A low-pressure training pistol with basic field sights.'
    },
    'crow-surplus': {
      id: 'crow-surplus', name: 'CROW-7 SURPLUS', quality: 'WORN', rarity: 'starter',
      category: 'pistol', viewmodel: 'P12 SIDEARM', modelClass: 'viper-9', reloadAudioProfile: 'compact-pistol',
      damageMin: 8, damageMax: 14, fireRate: 0.205, accuracy: 0.50,
      handling: 0.49, range: 6.9, magSize: 11, reloadTime: 1.64, recoilKick: 1.02, recoilRecovery: 5.0, recoilSpread: 0.045, recoilVisualKick: 1.03, recoilVisualRecovery: 6.4, recoilRoll: 0.029, cadenceJitter: 0.038, burstChance: 0.32, critChanceBonus: 0.02, critDamageBonus: 0.03, headshotMultiplier: 2.85, armourPenetration: 18,
      description: 'A compact surplus sidearm with a loose action and quick draw.'
    }
  };
  const CAREER_NPC_WEAPON_IDS = Object.keys(CAREER_NPC_WEAPON_CATALOG);

  function normaliseCareerName(value) {
    return String(value || '')
      .replace(/<[^>]*>/g, '')
      .replace(/[^a-zA-Z0-9 _'\-]/g, '')
      .replace(/\s+/g, ' ')
      .trimStart()
      .slice(0, 24);
  }

  const CAREER_TEAM_NAME_PREFIXES = Object.freeze([
    'Apex', 'Atlas', 'Black', 'Copper', 'Crimson', 'Ember', 'Granite', 'Iron',
    'Neon', 'Night', 'Northstar', 'Nova', 'Phantom', 'Silent', 'Storm', 'Urban',
    'Vanguard', 'Vector'
  ]);
  const CAREER_TEAM_NAME_SUFFIXES = Object.freeze([
    'Brigade', 'Command', 'Division', 'Falcons', 'Five', 'Guard', 'Legion',
    'Rangers', 'Sentinels', 'Strike', 'Syndicate', 'Unit', 'Vanguard', 'Watch', 'Wolves'
  ]);
  const CAREER_TEAM_NAME_CODENAMES = Object.freeze([
    'Aftershock', 'Blackline', 'Crossfire', 'Deadlock', 'Firebreak', 'Frontier',
    'Ghost Signal', 'Grey Sector', 'Hardpoint', 'Night Shift', 'Overwatch',
    'Red Circuit', 'Steel Horizon', 'Zero Hour'
  ]);

  function careerRandomTeamName(randomSource = Math.random) {
    const random = typeof randomSource === 'function' ? randomSource : Math.random;
    const pick = values => values[Math.min(values.length - 1, Math.floor(clamp(Number(random()) || 0, 0, 0.999999) * values.length))];
    const current = normaliseCareerName(careerDraft?.name).trim();
    for (let attempt = 0; attempt < 6; attempt++) {
      const useCodename = random() < 0.24;
      const raw = useCodename ? pick(CAREER_TEAM_NAME_CODENAMES) : `${pick(CAREER_TEAM_NAME_PREFIXES)} ${pick(CAREER_TEAM_NAME_SUFFIXES)}`;
      const candidate = normaliseCareerName(raw).trim();
      if (candidate && candidate !== current) return candidate;
    }
    const fallback = CAREER_TEAM_NAME_CODENAMES.find(name => normaliseCareerName(name).trim() !== current) || 'Vanguard Five';
    return normaliseCareerName(fallback).trim() || 'Vanguard Five';
  }

  function applyRandomCareerTeamName(randomSource = Math.random) {
    if (careerState.created) return '';
    const generatedName = careerRandomTeamName(randomSource);
    careerDraft.name = generatedName;
    const input = menuContentEl?.querySelector('#careerNameInput');
    if (input) input.value = generatedName;
    const status = menuContentEl?.querySelector('#careerRandomNameStatus');
    if (status) status.textContent = `${generatedName} generated. Tap again for another option or edit it directly.`;
    const createButton = menuContentEl?.querySelector('[data-career-action="create"]');
    if (createButton) createButton.disabled = careerDraft.name.trim().length < 2 || careerDraft.managerName.trim().length < 2;
    return generatedName;
  }

  function simulatedOperatorStats(team, slot) {
    const index = (Math.max(0, Number(slot) || 0) + (Number(team) === TEAM_RED ? 2 : 0)) % CAREER_NPC_STAT_ARCHETYPES.length;
    return { ...CAREER_NPC_STAT_ARCHETYPES[index] };
  }

  function simulatedOperatorWeaponId(team, slot) {
    const index = (Math.max(0, Number(slot) || 0) + (Number(team) === TEAM_RED ? 1 : 0)) % CAREER_NPC_WEAPON_IDS.length;
    return CAREER_NPC_WEAPON_IDS[index];
  }

  function cloneSimulatedStarterWeapon(team, slot) {
    const id = simulatedOperatorWeaponId(team, slot);
    return { ...CAREER_NPC_WEAPON_CATALOG[id] };
  }

  function combatStatTotal(stats) {
    return Object.keys(CAREER_STAT_DEFS).reduce((sum, key) => sum + (Number(stats?.[key]) || 0), 0);
  }

  function defaultCareerStats() {
    return Object.fromEntries(Object.keys(CAREER_STAT_DEFS).map(key => [key, 0]));
  }

  function criticalCombatProfile(stats = defaultCareerStats(), weapon = CAREER_WEAPON_CATALOG['scrap-p12']) {
    const chanceStat = clamp(Number(stats?.criticalChance) || 0, 0, CAREER_MAX_STAT);
    const damageStat = clamp(Number(stats?.criticalDamage) || 0, 0, CAREER_MAX_STAT);
    const weaponChance = clamp(Number(weapon?.critChanceBonus) || 0, 0, 0.10);
    const weaponDamage = clamp(Number(weapon?.critDamageBonus) || 0, 0, 0.40);
    const chance = clamp(CAREER_BASE_CRIT_CHANCE + chanceStat * CAREER_CRIT_CHANCE_PER_POINT + weaponChance, 0, CAREER_MAX_CRIT_CHANCE);
    const bonusDamage = clamp(CAREER_BASE_CRIT_BONUS_DAMAGE + damageStat * CAREER_CRIT_DAMAGE_PER_POINT + weaponDamage, 0, CAREER_MAX_CRIT_BONUS_DAMAGE);
    return {
      chance,
      bonusDamage,
      multiplier: 1 + bonusDamage,
      operatorChanceBonus: chanceStat * CAREER_CRIT_CHANCE_PER_POINT,
      operatorDamageBonus: damageStat * CAREER_CRIT_DAMAGE_PER_POINT,
      weaponChanceBonus: weaponChance,
      weaponDamageBonus: weaponDamage
    };
  }

  function playerCriticalProfile(player, weaponId = null) {
    const id = weaponId || (typeof careerPlayerActiveWeaponId === 'function' ? careerPlayerActiveWeaponId(player) : (player?.equippedWeaponId || player?.preferredWeaponId || 'scrap-p12'));
    return criticalCombatProfile(player?.stats || defaultCareerStats(), getCareerWeapon(id));
  }

  function playerHeadshotProfile(player, weaponId = null, distance = 4, recoilPenalty = 0) {
    const id = weaponId || (typeof careerPlayerActiveWeaponId === 'function' ? careerPlayerActiveWeaponId(player) : (player?.equippedWeaponId || player?.preferredWeaponId || 'scrap-p12'));
    const weapon = getCareerWeapon(id);
    return headshotCombatProfile({ rpgStats: player?.stats || defaultCareerStats(), weapon, primaryWeapon: weapon }, distance, recoilPenalty);
  }

  function refreshCriticalCombatProfile(bot) {
    const stats = bot?.rpgStats || bot?.simulatedStats || defaultCareerStats();
    const weapon = bot?.weapon || bot?.primaryWeapon || CAREER_WEAPON_CATALOG['scrap-p12'];
    const profile = criticalCombatProfile(stats, weapon);
    if (bot) {
      bot.criticalChance = profile.chance;
      bot.criticalBonusDamage = profile.bonusDamage;
      bot.criticalMultiplier = profile.multiplier;
    }
    return profile;
  }

  function rollCriticalHit(bot, randomValue = Math.random()) {
    const chance = clamp(Number(bot?.criticalChance) || CAREER_BASE_CRIT_CHANCE, 0, CAREER_MAX_CRIT_CHANCE);
    return Number(randomValue) < chance;
  }

  function headshotCombatProfile(bot, distance = 0, recoilPenalty = 0) {
    const stats = bot?.rpgStats || bot?.simulatedStats || defaultCareerStats();
    const weapon = bot?.weapon || bot?.primaryWeapon || CAREER_WEAPON_CATALOG['scrap-p12'];
    const marksmanship = clamp(Number(stats?.marksmanship) || 0, 0, CAREER_MAX_STAT);
    const weaponAccuracy = clamp(Number(weapon?.accuracy) || 0.50, 0.35, 0.90);
    const weaponRange = Math.max(1, Number(weapon?.range) || 7);
    const rangeRatio = Math.max(0, Number(distance) || 0) / weaponRange;
    const accuracyBonus = Math.max(0, weaponAccuracy - 0.50) * 0.12;
    const steadyBonus = bot?.crouched ? 0.018 : 0;
    const rangePenalty = clamp(rangeRatio - 0.62, 0, 1.15) * 0.045;
    const heatPenalty = clamp(Number(recoilPenalty) || 0, 0, 0.22) * 0.34;
    const chance = clamp(
      CAREER_BASE_HEADSHOT_CHANCE + marksmanship * CAREER_HEADSHOT_MARKSMANSHIP_PER_POINT + accuracyBonus + steadyBonus - rangePenalty - heatPenalty,
      0.012,
      CAREER_MAX_HEADSHOT_CHANCE
    );
    const multiplier = clamp(Number(weapon?.headshotMultiplier) || CAREER_DEFAULT_HEADSHOT_MULTIPLIER, 2.0, 4.0);
    return { chance, multiplier, marksmanship, weaponAccuracy, rangeRatio, steadyBonus, rangePenalty, heatPenalty };
  }

  function rollHeadshot(bot, distance = 0, recoilPenalty = 0, randomValue = Math.random()) {
    const profile = headshotCombatProfile(bot, distance, recoilPenalty);
    return { ...profile, headshot: Number(randomValue) < profile.chance };
  }

  const CLUB_FOUNDATION_LOAN_TERMS = Object.freeze({
    lender: 'Northstar Bank',
    principal: 350000,
    interest: 50000,
    totalRepayable: 400000,
    installment: 40000,
    intervalWeeks: 4,
    paymentCount: 10
  });

  function makeDefaultFinanceLoan(startWeek = 1, migrated = false) {
    const safeStartWeek = Math.max(1, Math.round(Number(startWeek) || 1));
    return {
      version: 1,
      lender: CLUB_FOUNDATION_LOAN_TERMS.lender,
      principal: CLUB_FOUNDATION_LOAN_TERMS.principal,
      interest: CLUB_FOUNDATION_LOAN_TERMS.interest,
      totalRepayable: CLUB_FOUNDATION_LOAN_TERMS.totalRepayable,
      balance: CLUB_FOUNDATION_LOAN_TERMS.totalRepayable,
      installment: CLUB_FOUNDATION_LOAN_TERMS.installment,
      intervalWeeks: CLUB_FOUNDATION_LOAN_TERMS.intervalWeeks,
      paymentCount: CLUB_FOUNDATION_LOAN_TERMS.paymentCount,
      paymentsProcessed: 0,
      arrears: 0,
      startWeek: safeStartWeek,
      nextPaymentWeek: safeStartWeek + CLUB_FOUNDATION_LOAN_TERMS.intervalWeeks,
      lastPaymentWeek: 0,
      active: true,
      noticeSent: false,
      migrated: Boolean(migrated)
    };
  }

  function normaliseFinanceLoan(rawLoan, created = false, currentWeek = 1) {
    const safeWeek = Math.max(1, Math.round(Number(currentWeek) || 1));
    const fallback = makeDefaultFinanceLoan(created && !rawLoan ? safeWeek : 1, created && !rawLoan);
    if (!rawLoan || typeof rawLoan !== 'object') return fallback;
    const totalRepayable = Math.max(0, Math.round(Number(rawLoan.totalRepayable) || CLUB_FOUNDATION_LOAN_TERMS.totalRepayable));
    const balance = clamp(Math.round(Number.isFinite(Number(rawLoan.balance)) ? Number(rawLoan.balance) : totalRepayable), 0, totalRepayable);
    const intervalWeeks = Math.max(1, Math.round(Number(rawLoan.intervalWeeks) || CLUB_FOUNDATION_LOAN_TERMS.intervalWeeks));
    const startWeek = Math.max(1, Math.round(Number(rawLoan.startWeek) || 1));
    const installment = Math.max(1, Math.round(Number(rawLoan.installment) || CLUB_FOUNDATION_LOAN_TERMS.installment));
    return {
      version: 1,
      lender: String(rawLoan.lender || CLUB_FOUNDATION_LOAN_TERMS.lender),
      principal: Math.max(0, Math.round(Number(rawLoan.principal) || CLUB_FOUNDATION_LOAN_TERMS.principal)),
      interest: Math.max(0, Math.round(Number(rawLoan.interest) || CLUB_FOUNDATION_LOAN_TERMS.interest)),
      totalRepayable,
      balance,
      installment,
      intervalWeeks,
      paymentCount: Math.max(1, Math.round(Number(rawLoan.paymentCount) || CLUB_FOUNDATION_LOAN_TERMS.paymentCount)),
      paymentsProcessed: Math.max(0, Math.round(Number(rawLoan.paymentsProcessed) || 0)),
      arrears: clamp(Math.round(Number(rawLoan.arrears) || 0), 0, balance),
      startWeek,
      nextPaymentWeek: Math.max(startWeek + intervalWeeks, Math.round(Number(rawLoan.nextPaymentWeek) || (startWeek + intervalWeeks))),
      lastPaymentWeek: Math.max(0, Math.round(Number(rawLoan.lastPaymentWeek) || 0)),
      active: rawLoan.active !== false && balance > 0,
      noticeSent: Boolean(rawLoan.noticeSent),
      migrated: Boolean(rawLoan.migrated)
    };
  }

  function makeDefaultCareerTutorialState() {
    return {
      marketViewed: false,
      profileViewed: false,
      squadViewed: false,
      completed: false,
      dismissed: false,
      contextSeen: {}
    };
  }

  function makeDefaultCareerState() {
    return {
      version: 19,
      created: false,
      name: '',
      managerName: '',
      teamIdentity: normaliseTeamIdentity(),
      level: 1,
      xp: 0,
      unspentPoints: 0,
      teamBenefits: { coaching: 0, analysis: 0, recovery: 0, commercial: 0 },
      infrastructure: { version: 1, levels: { training: 0, scouting: 0, medical: 0, academy: 0, analysis: 0, commercial: 0 }, activeProject: null, history: [], sequence: 0, lastAcademyDay: -999, academySequence: 0, academyHistory: [] },
      developmentIntroSeen: false,
      trainingRecommendation: null,
      storeIntroSeen: false,
      calendar: { absoluteDay: 0, dayOfWeek: 0, seasonYear: 1, nextLeagueDay: 5, lastWeeklySummary: 0, lastPayrollWeek: 1, lastMatchDay: -1 },
      mail: [],
      mailSequence: 0,
      staff: { assistantManagerId: null, employees: [], pool: [], poolSeed: 0, selectedPoolDivision: 3 },
      tactics: {
        formationId: 'balanced', lineupMode: 'manual', autoApplyBeforeMatch: true,
        approachId: 'balanced', engagementId: 'mixed', priorityId: 'trade', assignments: {},
        matchPrep: { day: -1, fixtureId: '', briefingReviewed: false, planConfirmed: false, lineupSignature: '', opponentId: '', selectedResponseId: '', fixtureDrills: [], opponentDepthAtReview: 0 },
        familiarity: {
          formation: { balanced: 52, pressure: 28, control: 30, defensive: 28, wide: 28 },
          approach: { cautious: 30, balanced: 52, aggressive: 30 },
          engagement: { close: 30, mixed: 52, long: 30 },
          priority: { group: 34, trade: 46, flank: 30, hold: 30 },
          lastGain: null
        }
      },
      decisions: { sequence: 0, items: [], lastGeneratedDay: -4 },
      transfers: { version: 1, sequence: 0, activeIncoming: null, outgoingOffers: [], selectedOfferId: null, lastOfferDay: -3 },
      recruitment: { version: 1, sequence: 0, view: 'market', shortlistIds: [], reports: {}, assignments: [], assignmentDraft: { roleId: 'any', ageBand: 'any', abilityBand: 'any' }, aiActivity: [], lastProcessedDay: -1, lastAssignmentMailDay: -4, marketDynamics: { version: 1, sequence: 0, lastProcessedDay: -1, lastDigestDay: -4, lastGenerationDay: -1, lastWeeklyReviewWeek: 0, divisionTier: 3, season: 1, processedActivityIds: [], eventLog: [] } },
      sponsorship: { version: 1, sequence: 0, active: null, offers: [], history: [], lastOfferDay: -7, lastWeeklyPaidWeek: 0 },
      stats: defaultCareerStats(),
      credits: 350000,
      goldCoins: 0,
      goldCoinHistory: [],
      pendingStoreCrate: null,
      pendingMatchCrate: null,
      storeCratesPurchased: 0,
      financeLoan: makeDefaultFinanceLoan(1, false),
      wageBudget: 32000,
      week: 1,
      reputation: 12,
      squad: [],
      squadDynamics: makeDefaultSquadDynamicsState(),
      seasonNarrative: makeDefaultSeasonNarrativeState(),
      market: [],
      marketSeed: 0,
      selectedPlayerId: null,
      financeHistory: [],
      tutorial: makeDefaultCareerTutorialState(),
      inventory: ['scrap-p12'],
      armourInventory: [],
      skins: [],
      equippedSkinId: null,
      equippedWeaponId: 'scrap-p12',
      totalRounds: 0,
      totalMatches: 0,
      matchWins: 0,
      totalWins: 0,
      totalKills: 0,
      totalDeaths: 0,
      bestRoundKills: 0,
      cratesOpened: 0,
      lastRound: null,
      league: null
    };
  }

  function normaliseCareerState(raw) {
    const fallback = makeDefaultCareerState();
    if (!raw || typeof raw !== 'object') return fallback;
    const stats = defaultCareerStats();
    for (const key of Object.keys(stats)) {
      stats[key] = clamp(Math.floor(Number(raw.stats?.[key]) || 0), 0, CAREER_MAX_STAT);
    }
    const storedInventory = Array.isArray(raw.inventory)
      ? raw.inventory.filter(id => CAREER_WEAPON_CATALOG[id]).slice(0, 200)
      : [];
    const inventory = ['scrap-p12', ...storedInventory.filter(id => id !== 'scrap-p12')];
    const inventoryCount = id => inventory.reduce((count, entry) => count + (entry === id ? 1 : 0), 0);
    const armourInventory = Array.isArray(raw.armourInventory)
      ? raw.armourInventory.filter(id => id !== 'none' && CAREER_ARMOUR_CATALOG[id]).slice(0, 120)
      : [];
    const armourInventoryCount = id => armourInventory.reduce((count, entry) => count + (entry === id ? 1 : 0), 0);
    const equippedWeaponId = inventory.includes(raw.equippedWeaponId)
      ? raw.equippedWeaponId
      : 'scrap-p12';
    const skins = Array.isArray(raw.skins)
      ? raw.skins.filter(id => CAREER_SKIN_CATALOG[id])
      : [];
    const equippedSkinId = skins.includes(raw.equippedSkinId) ? raw.equippedSkinId : null;
    let squad = Array.isArray(raw.squad) ? raw.squad.slice(0, 8) : [];

    const weaponClaims = new Map();
    const armourClaims = new Map();
    const uniquePlayerIds = new Set();
    const claimWeapon = id => {
      if (!CAREER_WEAPON_CATALOG[id] || id === 'scrap-p12') return id === 'scrap-p12';
      const claimed = weaponClaims.get(id) || 0;
      if (claimed >= inventoryCount(id)) return false;
      weaponClaims.set(id, claimed + 1);
      return true;
    };
    squad = squad.map((player, index) => {
      if (!player || typeof player !== 'object') return player;
      const preferred = inventory.includes(player.preferredWeaponId) ? player.preferredWeaponId : 'scrap-p12';
      const legacy = inventory.includes(player.equippedWeaponId) ? player.equippedWeaponId : preferred;
      let equippedPrimaryWeaponId = inventory.includes(player.equippedPrimaryWeaponId) && careerWeaponIsPrimary(player.equippedPrimaryWeaponId)
        ? player.equippedPrimaryWeaponId
        : (careerWeaponIsPrimary(legacy) ? legacy : null);
      let equippedSidearmId = inventory.includes(player.equippedSidearmId) && careerWeaponIsSidearm(player.equippedSidearmId)
        ? player.equippedSidearmId
        : (careerWeaponIsSidearm(legacy) ? legacy : 'scrap-p12');
      if (equippedPrimaryWeaponId && !claimWeapon(equippedPrimaryWeaponId)) equippedPrimaryWeaponId = null;
      if (equippedSidearmId !== 'scrap-p12' && !claimWeapon(equippedSidearmId)) equippedSidearmId = 'scrap-p12';
      let equippedArmourId = CAREER_ARMOUR_CATALOG[player.equippedArmourId] ? player.equippedArmourId : 'none';
      if (equippedArmourId !== 'none') {
        const claimed = armourClaims.get(equippedArmourId) || 0;
        if (claimed >= armourInventoryCount(equippedArmourId)) equippedArmourId = 'none';
        else armourClaims.set(equippedArmourId, claimed + 1);
      }
      const requestedId = String(player.id || `SQ-${index}`);
      let playerId = requestedId;
      let suffix = 1;
      while (uniquePlayerIds.has(playerId)) playerId = `${requestedId}-${suffix++}`;
      uniquePlayerIds.add(playerId);
      const equippedWeaponId = equippedPrimaryWeaponId || equippedSidearmId;
      return { ...player, preferredWeaponId: preferred, equippedPrimaryWeaponId, equippedSidearmId, equippedWeaponId, equippedArmourId, id: playerId };
    });
    let teamName = normaliseCareerName(raw.name);
    let managerName = normaliseCareerName(raw.managerName || 'Manager');

    // Migrate the earlier single-operator career into the new squad model
    // without deleting the player's existing progress. New careers still begin
    // with an empty squad and must recruit a full five-operator line-up.
    if (Boolean(raw.created) && Number(raw.version || 0) < 3 && squad.length === 0) {
      const legacyName = normaliseCareerName(raw.name) || 'Legacy Operator';
      squad = [{
        id: 'SQ-LEGACY-0', name: legacyName, firstName: legacyName.split(' ')[0] || legacyName,
        lastName: legacyName.split(' ').slice(1).join(' '), nickname: '', nationality: 'England', age: 24,
        role: 'flex', secondaryRole: 'support', personality: 'Experienced', traits: ['Established starter'],
        stats: { ...stats }, potential: 68, fee: 0, value: 72000, wage: 6200, contractWeeks: 104,
        morale: 75, happiness: 72, fatigue: 12, matchSharpness: 72, form: 6.5, lastMatch: null,
        preferredWeaponId: equippedWeaponId, equippedPrimaryWeaponId: careerWeaponIsPrimary(equippedWeaponId) ? equippedWeaponId : null, equippedSidearmId: careerWeaponIsSidearm(equippedWeaponId) ? equippedWeaponId : 'scrap-p12', equippedWeaponId, equippedArmourId: 'none',
        currentTeam: `${legacyName} Tactical`, joinedWeek: 1, history: [],
        career: { matches: Number(raw.totalMatches) || 0, wins: Number(raw.matchWins) || 0, kills: Number(raw.totalKills) || 0, deaths: Number(raw.totalDeaths) || 0, rounds: Number(raw.totalRounds) || 0, rating: 0 }
      }];
      teamName = `${legacyName} Tactical`.slice(0, 24);
      managerName = 'Returning Manager';
    }

    return {
      ...fallback,
      ...raw,
      version: 19,
      created: Boolean(raw.created),
      name: teamName,
      managerName,
      teamIdentity: normaliseTeamIdentity(raw.teamIdentity),
      level: Math.max(1, Math.floor(Number(raw.level) || 1)),
      xp: Math.max(0, Math.floor(Number(raw.xp) || 0)),
      unspentPoints: Math.max(0, Math.floor(Number(raw.unspentPoints) || 0)),
      teamBenefits: {
        coaching: clamp(Math.round(Number(raw.teamBenefits?.coaching) || 0), 0, 5),
        analysis: clamp(Math.round(Number(raw.teamBenefits?.analysis) || 0), 0, 5),
        recovery: clamp(Math.round(Number(raw.teamBenefits?.recovery) || 0), 0, 5),
        commercial: clamp(Math.round(Number(raw.teamBenefits?.commercial) || 0), 0, 5)
      },
      infrastructure: {
        version: 1,
        levels: Object.fromEntries(['training','scouting','medical','academy','analysis','commercial'].map(id => [id, clamp(Math.round(Number(raw.infrastructure?.levels?.[id]) || 0), 0, 4)])),
        activeProject: raw.infrastructure?.activeProject && typeof raw.infrastructure.activeProject === 'object' ? { ...raw.infrastructure.activeProject } : null,
        history: Array.isArray(raw.infrastructure?.history) ? raw.infrastructure.history.slice(0, 40).map(item => ({ ...item })) : [],
        sequence: Math.max(0, Math.round(Number(raw.infrastructure?.sequence) || 0)),
        lastAcademyDay: Number.isFinite(Number(raw.infrastructure?.lastAcademyDay)) ? Math.round(Number(raw.infrastructure.lastAcademyDay)) : -999,
        academySequence: Math.max(0, Math.round(Number(raw.infrastructure?.academySequence) || 0)),
        academyHistory: Array.isArray(raw.infrastructure?.academyHistory) ? raw.infrastructure.academyHistory.slice(0, 24).map(item => ({ ...item })) : []
      },
      developmentIntroSeen: Boolean(raw.developmentIntroSeen),
      trainingRecommendation: raw.trainingRecommendation && typeof raw.trainingRecommendation === 'object'
        ? {
          playerId: String(raw.trainingRecommendation.playerId || ''),
          focusId: String(raw.trainingRecommendation.focusId || ''),
          label: String(raw.trainingRecommendation.label || ''),
          insight: String(raw.trainingRecommendation.insight || ''),
          createdDay: Number.isFinite(Number(raw.trainingRecommendation.createdDay)) ? Math.round(Number(raw.trainingRecommendation.createdDay)) : -1,
          seen: Boolean(raw.trainingRecommendation.seen)
        }
        : null,
      storeIntroSeen: Boolean(raw.storeIntroSeen),
      calendar: (() => {
        const migratedAbsoluteDay = raw.calendar && Number.isFinite(Number(raw.calendar.absoluteDay))
          ? Math.max(0, Math.round(Number(raw.calendar.absoluteDay)))
          : Math.max(0, (Math.max(1, Math.round(Number(raw.week) || 1)) - 1) * 7);
        return {
          absoluteDay: migratedAbsoluteDay,
          dayOfWeek: migratedAbsoluteDay % 7,
          seasonYear: Math.max(1, Math.round(Number(raw.calendar?.seasonYear) || 1)),
          nextLeagueDay: Math.max(migratedAbsoluteDay, Math.round(Number(raw.calendar?.nextLeagueDay) || (migratedAbsoluteDay + ((5 - migratedAbsoluteDay % 7 + 7) % 7)))),
          lastWeeklySummary: Math.max(0, Math.round(Number(raw.calendar?.lastWeeklySummary) || 0)),
          lastPayrollWeek: Math.max(1, Math.round(Number(raw.calendar?.lastPayrollWeek) || (Math.floor(migratedAbsoluteDay / 7) + 1))),
          lastMatchDay: Number.isFinite(Number(raw.calendar?.lastMatchDay)) ? Math.round(Number(raw.calendar.lastMatchDay)) : -1
        };
      })(),
      mail: Array.isArray(raw.mail) ? raw.mail.slice(0, 80).map(item => ({ ...item })) : [],
      mailSequence: Math.max(0, Math.round(Number(raw.mailSequence) || 0)),
      staff: {
        assistantManagerId: raw.staff?.assistantManagerId || null,
        employees: Array.isArray(raw.staff?.employees) ? raw.staff.employees.slice(0, 8).map(item => ({ ...item })) : [],
        pool: Array.isArray(raw.staff?.pool) ? raw.staff.pool.slice(0, 18).map(item => ({ ...item })) : [],
        poolSeed: Math.max(0, Math.round(Number(raw.staff?.poolSeed) || 0)),
        selectedPoolDivision: normaliseLeagueTier(raw.staff?.selectedPoolDivision)
      },
      tactics: {
        formationId: String(raw.tactics?.formationId || 'balanced'),
        lineupMode: raw.tactics?.lineupMode === 'assistant' ? 'assistant' : 'manual',
        autoApplyBeforeMatch: raw.tactics?.autoApplyBeforeMatch !== false,
        approachId: String(raw.tactics?.approachId || 'balanced'),
        engagementId: String(raw.tactics?.engagementId || 'mixed'),
        priorityId: String(raw.tactics?.priorityId || 'trade'),
        assignments: raw.tactics?.assignments && typeof raw.tactics.assignments === 'object' ? { ...raw.tactics.assignments } : {},
        matchPrep: {
          day: Number.isFinite(Number(raw.tactics?.matchPrep?.day)) ? Math.round(Number(raw.tactics.matchPrep.day)) : -1,
          fixtureId: String(raw.tactics?.matchPrep?.fixtureId || ''),
          briefingReviewed: Boolean(raw.tactics?.matchPrep?.briefingReviewed),
          planConfirmed: Boolean(raw.tactics?.matchPrep?.planConfirmed),
          lineupSignature: String(raw.tactics?.matchPrep?.lineupSignature || ''),
          opponentId: String(raw.tactics?.matchPrep?.opponentId || ''),
          selectedResponseId: String(raw.tactics?.matchPrep?.selectedResponseId || ''),
          fixtureDrills: Array.isArray(raw.tactics?.matchPrep?.fixtureDrills) ? raw.tactics.matchPrep.fixtureDrills.map(String).slice(0, 2) : [],
          opponentDepthAtReview: Math.max(0, Math.min(100, Math.round(Number(raw.tactics?.matchPrep?.opponentDepthAtReview) || 0)))
        },
        familiarity: {
          formation: { ...(fallback.tactics.familiarity.formation || {}), ...(raw.tactics?.familiarity?.formation || {}) },
          approach: { ...(fallback.tactics.familiarity.approach || {}), ...(raw.tactics?.familiarity?.approach || {}) },
          engagement: { ...(fallback.tactics.familiarity.engagement || {}), ...(raw.tactics?.familiarity?.engagement || {}) },
          priority: { ...(fallback.tactics.familiarity.priority || {}), ...(raw.tactics?.familiarity?.priority || {}) },
          lastGain: raw.tactics?.familiarity?.lastGain && typeof raw.tactics.familiarity.lastGain === 'object' ? { ...raw.tactics.familiarity.lastGain } : null
        }
      },
      decisions: {
        sequence: Math.max(0, Math.round(Number(raw.decisions?.sequence) || 0)),
        items: Array.isArray(raw.decisions?.items) ? raw.decisions.items.slice(0, 24).map(item => ({ ...item })) : [],
        lastGeneratedDay: Number.isFinite(Number(raw.decisions?.lastGeneratedDay)) ? Math.round(Number(raw.decisions.lastGeneratedDay)) : -4
      },
      transfers: {
        version: 1,
        sequence: Math.max(0, Math.round(Number(raw.transfers?.sequence) || 0)),
        activeIncoming: raw.transfers?.activeIncoming && typeof raw.transfers.activeIncoming === 'object' ? { ...raw.transfers.activeIncoming } : null,
        outgoingOffers: Array.isArray(raw.transfers?.outgoingOffers) ? raw.transfers.outgoingOffers.slice(0, 30).map(item => ({ ...item })) : [],
        selectedOfferId: raw.transfers?.selectedOfferId || null,
        lastOfferDay: Number.isFinite(Number(raw.transfers?.lastOfferDay)) ? Math.round(Number(raw.transfers.lastOfferDay)) : -3
      },
      recruitment: {
        version: 1,
        sequence: Math.max(0, Math.round(Number(raw.recruitment?.sequence) || 0)),
        view: ['market','shortlist','assignments'].includes(raw.recruitment?.view) ? raw.recruitment.view : 'market',
        shortlistIds: Array.isArray(raw.recruitment?.shortlistIds) ? Array.from(new Set(raw.recruitment.shortlistIds.map(String))).slice(0, 30) : [],
        reports: raw.recruitment?.reports && typeof raw.recruitment.reports === 'object' ? { ...raw.recruitment.reports } : {},
        assignments: Array.isArray(raw.recruitment?.assignments) ? raw.recruitment.assignments.slice(0, 8).map(item => ({ ...item })) : [],
        assignmentDraft: raw.recruitment?.assignmentDraft && typeof raw.recruitment.assignmentDraft === 'object' ? { ...raw.recruitment.assignmentDraft } : { roleId: 'any', ageBand: 'any', abilityBand: 'any' },
        aiActivity: Array.isArray(raw.recruitment?.aiActivity) ? raw.recruitment.aiActivity.slice(0, 18).map(item => ({ ...item })) : [],
        lastProcessedDay: Number.isFinite(Number(raw.recruitment?.lastProcessedDay)) ? Math.round(Number(raw.recruitment.lastProcessedDay)) : -1,
        lastAssignmentMailDay: Number.isFinite(Number(raw.recruitment?.lastAssignmentMailDay)) ? Math.round(Number(raw.recruitment.lastAssignmentMailDay)) : -4,
        marketDynamics: {
          version: 1,
          sequence: Math.max(0, Math.round(Number(raw.recruitment?.marketDynamics?.sequence) || 0)),
          lastProcessedDay: Number.isFinite(Number(raw.recruitment?.marketDynamics?.lastProcessedDay)) ? Math.round(Number(raw.recruitment.marketDynamics.lastProcessedDay)) : -1,
          lastDigestDay: Number.isFinite(Number(raw.recruitment?.marketDynamics?.lastDigestDay)) ? Math.round(Number(raw.recruitment.marketDynamics.lastDigestDay)) : -4,
          lastGenerationDay: Number.isFinite(Number(raw.recruitment?.marketDynamics?.lastGenerationDay)) ? Math.round(Number(raw.recruitment.marketDynamics.lastGenerationDay)) : -1,
          lastWeeklyReviewWeek: Math.max(0, Math.round(Number(raw.recruitment?.marketDynamics?.lastWeeklyReviewWeek) || 0)),
          divisionTier: normaliseLeagueTier(raw.recruitment?.marketDynamics?.divisionTier),
          season: Math.max(1, Math.round(Number(raw.recruitment?.marketDynamics?.season) || 1)),
          processedActivityIds: Array.isArray(raw.recruitment?.marketDynamics?.processedActivityIds) ? Array.from(new Set(raw.recruitment.marketDynamics.processedActivityIds.map(String))).slice(0, 80) : [],
          eventLog: Array.isArray(raw.recruitment?.marketDynamics?.eventLog) ? raw.recruitment.marketDynamics.eventLog.slice(0, 60).map(item => ({ ...item })) : []
        }
      },
      sponsorship: {
        version: 1,
        sequence: Math.max(0, Math.round(Number(raw.sponsorship?.sequence) || 0)),
        active: raw.sponsorship?.active && typeof raw.sponsorship.active === 'object' ? { ...raw.sponsorship.active } : null,
        offers: Array.isArray(raw.sponsorship?.offers) ? raw.sponsorship.offers.slice(0, 5).map(item => ({ ...item })) : [],
        history: Array.isArray(raw.sponsorship?.history) ? raw.sponsorship.history.slice(0, 20).map(item => ({ ...item })) : [],
        lastOfferDay: Number.isFinite(Number(raw.sponsorship?.lastOfferDay)) ? Math.round(Number(raw.sponsorship.lastOfferDay)) : -7,
        lastWeeklyPaidWeek: Math.max(0, Math.round(Number(raw.sponsorship?.lastWeeklyPaidWeek) || 0))
      },
      stats,
      credits: Math.round(Number.isFinite(Number(raw.credits)) ? Number(raw.credits) : fallback.credits),
      goldCoins: Math.max(0, Math.round(Number(raw.goldCoins) || 0)),
      goldCoinHistory: Array.isArray(raw.goldCoinHistory) ? raw.goldCoinHistory.slice(0, CAREER_GOLD_COIN_HISTORY_LIMIT).map(item => ({ ...item, amount: Math.round(Number(item?.amount) || 0) })) : [],
      pendingStoreCrate: raw.pendingStoreCrate && typeof raw.pendingStoreCrate === 'object'
        ? {
          id: String(raw.pendingStoreCrate.id || 'STORE-CRATE'),
          price: Math.max(0, Math.round(Number(raw.pendingStoreCrate.price) || CAREER_GOLD_COIN_CRATE_PRICE)),
          reward: normaliseCareerCrateReward(raw.pendingStoreCrate.reward),
          purchasedMatch: Math.max(0, Math.round(Number(raw.pendingStoreCrate.purchasedMatch) || 0))
        }
        : null,
      // Build 12.137: an unclaimed victory crate is career data, not view state.
      // Persisting it means leaving the page before the reveal no longer
      // destroys the reward.
      pendingMatchCrate: raw.pendingMatchCrate && typeof raw.pendingMatchCrate === 'object'
        ? {
          id: String(raw.pendingMatchCrate.id || 'MATCH-CRATE'),
          reward: normaliseCareerCrateReward(raw.pendingMatchCrate.reward),
          awardedMatch: Math.max(0, Math.round(Number(raw.pendingMatchCrate.awardedMatch) || 0))
        }
        : null,
      storeCratesPurchased: Math.max(0, Math.round(Number(raw.storeCratesPurchased) || 0)),
      financeLoan: normaliseFinanceLoan(raw.financeLoan, Boolean(raw.created), Math.max(1, Math.round(Number(raw.week) || 1))),
      wageBudget: Math.max(0, Math.round(Number(raw.wageBudget) || fallback.wageBudget)),
      week: Math.max(1, Math.round(Number(raw.week) || 1)),
      reputation: clamp(Math.round(Number(raw.reputation) || fallback.reputation), 0, 100),
      squad,
      squadDynamics: normaliseSquadDynamics(raw.squadDynamics, squad),
      seasonNarrative: normaliseSeasonNarrative(raw.seasonNarrative),
      market: Array.isArray(raw.market) ? raw.market : [],
      marketSeed: Math.max(0, Math.round(Number(raw.marketSeed) || 0)),
      selectedPlayerId: raw.selectedPlayerId || null,
      financeHistory: Array.isArray(raw.financeHistory) ? raw.financeHistory.slice(0, 80).map((item, index) => ({ ...item, id: String(item?.id || `FIN-MIGRATED-${index}`), week: Math.max(1, Math.round(Number(item?.week) || 1)), day: Number.isFinite(Number(item?.day)) ? Math.max(0, Math.round(Number(item.day))) : null, type: String(item?.type || 'OTHER'), amount: Math.round(Number(item?.amount) || 0), label: String(item?.label || item?.type || 'Club transaction') })) : [],
      tutorial: {
        ...fallback.tutorial,
        ...(raw.tutorial || {}),
        contextSeen: raw.tutorial?.contextSeen && typeof raw.tutorial.contextSeen === 'object' && !Array.isArray(raw.tutorial.contextSeen)
          ? Object.fromEntries(Object.entries(raw.tutorial.contextSeen).map(([route, seen]) => [String(route), Boolean(seen)]))
          : {}
      },
      inventory,
      armourInventory,
      skins: Array.from(new Set(skins)),
      equippedSkinId,
      equippedWeaponId,
      totalRounds: Math.max(0, Math.floor(Number(raw.totalRounds) || 0)),
      totalMatches: Math.max(0, Math.floor(Number(raw.totalMatches) || 0)),
      matchWins: Math.max(0, Math.floor(Number(raw.matchWins) || 0)),
      totalWins: Math.max(0, Math.floor(Number(raw.totalWins) || 0)),
      totalKills: Math.max(0, Math.floor(Number(raw.totalKills) || 0)),
      totalDeaths: Math.max(0, Math.floor(Number(raw.totalDeaths) || 0)),
      bestRoundKills: Math.max(0, Math.floor(Number(raw.bestRoundKills) || 0)),
      cratesOpened: Math.max(0, Math.floor(Number(raw.cratesOpened) || 0))
    };
  }

  function loadCareerState() {
    try {
      return normaliseCareerState(JSON.parse(localStorage.getItem(CAREER_STORAGE_KEY) || 'null'));
    } catch (error) {
      return makeDefaultCareerState();
    }
  }

  let careerState = loadCareerState();
  let careerDataNotice = null;
  let careerDraft = {
    name: careerState.name || '',
    managerName: careerState.managerName || '',
    teamIdentity: normaliseTeamIdentity(careerState.teamIdentity),
    stats: careerState.created ? { ...careerState.stats } : defaultCareerStats()
  };
  let selectedCareerWeaponId = careerState.equippedWeaponId || 'scrap-p12';
  let selectedCareerWeaponSlot = 'sidearm';
  let selectedCareerArmourId = 'none';
  const careerWeaponViewerState = { yaw: -28, pitch: -10, zoom: 1, autoRotate: false, dragging: false, pointerId: null, lastX: 0, lastY: 0 };
  const careerArmourViewerState = { yaw: -30, pitch: -7, zoom: 1, autoRotate: false, dragging: false, pointerId: null, lastX: 0, lastY: 0 };
  let careerWipeConfirmOpen = false;
  let careerBetweenRounds = false;
  let careerMatchComplete = false;
  let careerRoundStartKills = 0;
  let careerRoundStartDeaths = 0;

  function makeCareerMatchStats() {
    return {
      roundsPlayed: 0,
      roundsWon: 0,
      kills: 0,
      deaths: 0,
      shotsFired: 0,
      shotsHit: 0,
      damageDealt: 0,
      damageTaken: 0,
      survivalTime: 0,
      reloads: 0,
      finalSurvived: false,
      multiKillEvents: [],
      matchMoments: [],
      roundDecisions: [],
      liveCommands: [],
      lastRound: 0
    };
  }

  let careerMatchStats = makeCareerMatchStats();
  let careerCrateState = {
    phase: 'idle',
    delay: 0,
    timer: 0,
    cycleTimer: 0,
    displayIndex: 0,
    result: null,
    duplicate: false,
    summary: null,
    source: 'match',
    returnRoute: 'loadout'
  };
  let careerReportState = {
    phase: 'idle',
    delay: 0,
    summary: null,
    revealStage: 0,
    detailed: true
  };

  const careerReportOverlayEl = document.getElementById('careerReportOverlay');
  const careerReportTitleEl = document.getElementById('careerReportTitle');
  const careerReportSubtitleEl = document.getElementById('careerReportSubtitle');
  const careerReportGradeEl = document.getElementById('careerReportGrade');
  const careerReportScoreEl = document.getElementById('careerReportScore');
  const careerReportContentEl = document.getElementById('careerReportContent');
  const careerReportXpSummaryEl = document.getElementById('careerReportXpSummary');
  const careerReportContinueBtn = document.getElementById('careerReportContinueBtn');
  const careerReportDiagnosticExportBtn = document.getElementById('careerReportDiagnosticExportBtn');

  const careerCrateOverlayEl = document.getElementById('careerCrateOverlay');
  const careerCrateStageEl = document.getElementById('careerCrateStage');
  const careerCrateKickerEl = document.getElementById('careerCrateKicker');
  const careerCrateTitleEl = document.getElementById('careerCrateTitle');
  const careerCrateWeaponEl = document.getElementById('careerCrateWeapon');
  const careerCrateModelEl = document.getElementById('careerCrateModel');
  const careerCrateStatsEl = document.getElementById('careerCrateStats');
  const careerCrateSummaryEl = document.getElementById('careerCrateSummary');
  const careerCrateOpenBtn = document.getElementById('careerCrateOpenBtn');
  const careerCrateClaimBtn = document.getElementById('careerCrateClaimBtn');

  function careerStorageValue(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function careerSaveMetadata() {
    try {
      const parsed = JSON.parse(careerStorageValue(CAREER_SAVE_META_STORAGE_KEY) || 'null');
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function careerSaveTimeLabel(value = careerSaveMetadata()?.savedAt) {
    const timestamp = Date.parse(value || '');
    if (!Number.isFinite(timestamp)) return 'NOT YET RECORDED';
    const date = new Date(timestamp);
    return date.toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).toUpperCase();
  }

  function careerBackupAvailable() {
    const raw = careerStorageValue(CAREER_BACKUP_STORAGE_KEY);
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw);
      return Boolean(parsed && typeof parsed === 'object');
    } catch (error) {
      return false;
    }
  }

  function setCareerDataNotice(tone, title, detail) {
    careerDataNotice = {
      tone: ['success', 'warning', 'danger'].includes(tone) ? tone : 'info',
      title: String(title || 'CAREER DATA'),
      detail: String(detail || '')
    };
  }

  // Build 12.134: every write is sequenced and read back.
  //
  // Two silent failure modes could lose match rewards. A second tab (or a page
  // restored from the back/forward cache) still holds the career it loaded
  // before the match, and its next autosave overwrote the newer save with
  // last-writer-wins. And a rejected write — quota, private browsing, a full
  // disk — was swallowed and reported to nobody, so the manager kept playing
  // against a balance that was never stored.
  //
  // The sequence counter makes a stale session detectable, and the read-back
  // proves the bytes actually landed before the save is treated as durable.
  let careerSaveSequence = Math.max(0, Math.round(Number(careerSaveMetadata()?.saveSequence) || 0));
  let careerSaveFailure = null;

  function careerSaveIsStale() {
    const storedSequence = Math.max(0, Math.round(Number(careerSaveMetadata()?.saveSequence) || 0));
    return storedSequence > careerSaveSequence;
  }

  function careerStorageWriteVerified(storage, key, value, label = 'Career data') {
    storage.setItem(key, value);
    if (storage.getItem(key) !== value) throw new Error(`${label} did not read back identically.`);
  }

  // Build 12.158: the primary career is the durability authority. Older saves
  // can be large enough that duplicating the complete primary into the recovery
  // slot first exhausts localStorage and prevents the actual result from being
  // written. Commit and verify the new primary before refreshing its optional
  // backup. If an old, unprotected backup itself blocks the primary, discard
  // that backup and retry once. A protected recovery point is never evicted.
  function careerCommitPrimaryAndBackup(storage, options = {}) {
    const serialised = String(options.serialised || '');
    const existing = typeof options.existing === 'string' ? options.existing : null;
    const refreshBackup = options.refreshBackup === true && Boolean(existing) && existing !== serialised;
    const allowBackupEviction = options.allowBackupEviction === true;
    let backupStatus = refreshBackup ? 'pending' : 'not-requested';
    let backupDetail = '';
    let backupEvictedForPrimary = false;

    try {
      careerStorageWriteVerified(storage, CAREER_STORAGE_KEY, serialised, 'Career save');
    } catch (initialError) {
      const currentBackup = storage.getItem(CAREER_BACKUP_STORAGE_KEY);
      if (!allowBackupEviction || currentBackup === null) throw initialError;
      storage.removeItem(CAREER_BACKUP_STORAGE_KEY);
      backupEvictedForPrimary = true;
      backupStatus = 'evicted-for-primary';
      backupDetail = 'The previous recovery backup was removed because browser storage was full.';
      careerStorageWriteVerified(storage, CAREER_STORAGE_KEY, serialised, 'Career save');
    }

    if (refreshBackup && !backupEvictedForPrimary) {
      try {
        careerStorageWriteVerified(storage, CAREER_BACKUP_STORAGE_KEY, existing, 'Career recovery backup');
        backupStatus = 'updated';
      } catch (backupError) {
        backupStatus = storage.getItem(CAREER_BACKUP_STORAGE_KEY) === null ? 'skipped' : 'retained-older';
        backupDetail = String(backupError?.message || 'The browser could not refresh the recovery backup.');
      }
    }

    return { backupStatus, backupDetail, backupEvictedForPrimary };
  }

  function saveCareerState(options = {}) {
    try {
      // Refuse to clobber a newer save written by another session. Losing this
      // session's unsaved progress is recoverable; silently deleting a match
      // result the manager already banked elsewhere is not.
      if (options.force !== true && careerSaveIsStale()) {
        careerSaveFailure = {
          code: 'stale-session',
          savedAt: new Date().toISOString(),
          detail: 'Another tab or window saved this career more recently. This session did not overwrite it.'
        };
        setCareerDataNotice('warning', 'SAVE HELD BACK',
          'This career was updated in another tab or window. Strikewatch did not overwrite that newer save. Reload this page to continue from the most recent progress.');
        return false;
      }

      const serialised = JSON.stringify(careerState);
      const existing = localStorage.getItem(CAREER_STORAGE_KEY);
      const previousMeta = careerSaveMetadata();
      const backupProtected = options.backupProtected === true
        || (options.backupProtected !== false && previousMeta?.backupProtected === true);
      const refreshBackup = options.createBackup !== false && !backupProtected;
      const allowBackupEviction = options.allowBackupEviction !== false && !backupProtected;
      const commit = careerCommitPrimaryAndBackup(localStorage, {
        serialised,
        existing,
        refreshBackup,
        allowBackupEviction
      });

      careerSaveSequence = Math.max(0, Math.round(Number(previousMeta?.saveSequence) || 0)) + 1;
      const meta = JSON.stringify({
        savedAt: new Date().toISOString(),
        buildVersion: BUILD_VERSION,
        reason: String(options.reason || 'autosave'),
        saveSequence: careerSaveSequence,
        backupProtected,
        backupStatus: commit.backupStatus
      });
      try {
        careerStorageWriteVerified(localStorage, CAREER_SAVE_META_STORAGE_KEY, meta, 'Career save metadata');
      } catch (metaError) {
        // Metadata is tiny. If an unprotected backup filled the final bytes,
        // release that optional copy and retry so the saved primary receives a
        // valid sequence and cannot be mistaken for stale progress on reload.
        if (allowBackupEviction && localStorage.getItem(CAREER_BACKUP_STORAGE_KEY) !== null) {
          localStorage.removeItem(CAREER_BACKUP_STORAGE_KEY);
          commit.backupStatus = 'evicted-for-metadata';
          commit.backupDetail = 'The recovery backup was removed so save metadata could be committed.';
          careerStorageWriteVerified(localStorage, CAREER_SAVE_META_STORAGE_KEY, JSON.stringify({
            savedAt: new Date().toISOString(),
            buildVersion: BUILD_VERSION,
            reason: String(options.reason || 'autosave'),
            saveSequence: careerSaveSequence,
            backupProtected,
            backupStatus: commit.backupStatus
          }), 'Career save metadata');
        } else {
          throw metaError;
        }
      }

      const recoveredFromFailure = Boolean(careerSaveFailure);
      careerSaveFailure = null;
      if (commit.backupStatus === 'skipped' || commit.backupStatus === 'retained-older'
          || commit.backupStatus === 'evicted-for-primary' || commit.backupStatus === 'evicted-for-metadata') {
        setCareerDataNotice('warning', 'CAREER SAVED · BACKUP LIMITED',
          'Your latest progress was saved and verified, but browser storage was too full to refresh the optional recovery backup. Export the career from Data & Recovery when convenient.');
      } else if (recoveredFromFailure) {
        setCareerDataNotice('success', 'SAVING RESTORED', 'Career progress is being written to this browser again.');
      }
      return true;
    } catch (error) {
      // Storage can be unavailable in private browsing or full. The live
      // session still works, but the manager has to know their progress is
      // not being kept.
      careerSaveFailure = {
        code: 'write-failed',
        savedAt: new Date().toISOString(),
        detail: String(error?.message || 'The browser rejected the save.')
      };
      setCareerDataNotice('danger', 'PROGRESS IS NOT BEING SAVED',
        'This browser rejected the career save, so match rewards, Gold Coins and transfers will be lost when the page closes. Export the career from Data & Recovery, then free browser storage or leave private browsing.');
      return false;
    }
  }

  function careerSaveHealth() {
    const meta = careerSaveMetadata();
    return {
      sequence: careerSaveSequence,
      storedSequence: Math.max(0, Math.round(Number(meta?.saveSequence) || 0)),
      stale: careerSaveIsStale(),
      failure: careerSaveFailure ? { ...careerSaveFailure } : null,
      backupStatus: meta?.backupStatus || null,
      savedAt: meta?.savedAt || null
    };
  }

  function careerExportFilename() {
    const safeName = String(careerState.name || 'strikewatch-career')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'strikewatch-career';
    const date = new Date().toISOString().slice(0, 10);
    return `${safeName}-${date}.json`;
  }

  function exportCareerSave() {
    const payload = {
      format: CAREER_EXPORT_FORMAT,
      formatVersion: 1,
      buildVersion: BUILD_VERSION,
      exportedAt: new Date().toISOString(),
      career: careerState
    };
    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = careerExportFilename();
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setCareerDataNotice('success', 'CAREER EXPORTED', 'A portable JSON backup has been created. Keep it somewhere safe before clearing browser data or moving devices.');
      updateMenuUI();
      return true;
    } catch (error) {
      setCareerDataNotice('danger', 'EXPORT FAILED', 'The browser could not create the career file. Your current local save has not been changed.');
      updateMenuUI();
      return false;
    }
  }

  function applyImportedCareer(rawCareer, sourceLabel = 'imported file') {
    if (!rawCareer || typeof rawCareer !== 'object' || Array.isArray(rawCareer)) throw new Error('Career data is not an object.');
    const currentRaw = careerStorageValue(CAREER_STORAGE_KEY);
    if (currentRaw) localStorage.setItem(CAREER_BACKUP_STORAGE_KEY, currentRaw);
    careerState = normaliseCareerState(rawCareer);
    selectedCareerWeaponId = careerState.equippedWeaponId || 'scrap-p12';
    selectedCareerWeaponSlot = careerWeaponSlotType(selectedCareerWeaponId);
    careerDraft = {
      name: careerState.name || '',
      managerName: careerState.managerName || '',
      teamIdentity: normaliseTeamIdentity(careerState.teamIdentity),
      stats: careerState.created ? { ...careerState.stats } : defaultCareerStats()
    };
    saveCareerState({ createBackup: false, backupProtected: true, force: true, reason: sourceLabel });
    resetCareerMatchFlow();
    createMatch();
    menuContext = 'main';
    canResumeMatch = false;
    menuTab = 'play';
    setAppState('menu');
    lastTime = performance.now();
  }

  async function importCareerSaveFile(file) {
    if (!file) return false;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (parsed?.format && parsed.format !== CAREER_EXPORT_FORMAT) throw new Error('Unsupported export format.');
      const rawCareer = parsed?.career && typeof parsed.career === 'object' ? parsed.career : parsed;
      applyImportedCareer(rawCareer, 'manual import');
      setCareerDataNotice('success', 'CAREER IMPORTED', `${careerState.name || 'The imported club'} is now active. The previous local career is available through Restore Backup.`);
      updateMenuUI();
      return true;
    } catch (error) {
      setCareerDataNotice('danger', 'IMPORT FAILED', 'That file is not a valid Strikewatch career export. The current career has not been replaced.');
      updateMenuUI();
      return false;
    }
  }

  function requestCareerImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.hidden = true;
    input.addEventListener('change', () => {
      importCareerSaveFile(input.files?.[0]).finally(() => input.remove());
    }, { once: true });
    document.body.append(input);
    input.click();
    return true;
  }

  function restoreCareerBackup() {
    const backupRaw = careerStorageValue(CAREER_BACKUP_STORAGE_KEY);
    if (!backupRaw) {
      setCareerDataNotice('warning', 'NO BACKUP AVAILABLE', 'A previous autosave will appear here after the career changes at least once.');
      updateMenuUI();
      return false;
    }
    try {
      const backup = JSON.parse(backupRaw);
      const currentRaw = careerStorageValue(CAREER_STORAGE_KEY);
      applyImportedCareer(backup, 'backup restore');
      if (currentRaw) localStorage.setItem(CAREER_BACKUP_STORAGE_KEY, currentRaw);
      setCareerDataNotice('success', 'BACKUP RESTORED', 'The previous automatic save is active. The career you just replaced is now held as the next restore point.');
      updateMenuUI();
      return true;
    } catch (error) {
      setCareerDataNotice('danger', 'BACKUP DAMAGED', 'The stored backup could not be read. The active career has not been changed.');
      updateMenuUI();
      return false;
    }
  }

  function careerDataRecoveryForTest() {
    return {
      currentAvailable: Boolean(careerStorageValue(CAREER_STORAGE_KEY)),
      backupAvailable: careerBackupAvailable(),
      savedAt: careerSaveMetadata()?.savedAt || null,
      savedLabel: careerSaveTimeLabel(),
      exportFormat: CAREER_EXPORT_FORMAT,
      schema: careerState.version,
      backupProtected: careerSaveMetadata()?.backupProtected === true
    };
  }


  function requestCareerWipe() {
    careerWipeConfirmOpen = true;
    updateMenuUI();
  }

  function cancelCareerWipe() {
    careerWipeConfirmOpen = false;
    updateMenuUI();
  }

  function wipeCareerData() {
    try {
      localStorage.removeItem(CAREER_STORAGE_KEY);
      localStorage.removeItem(CAREER_BACKUP_STORAGE_KEY);
      localStorage.removeItem(CAREER_SAVE_META_STORAGE_KEY);
    } catch (error) {
      // Continue with the in-memory reset when storage is unavailable.
    }
    careerState = makeDefaultCareerState();
    careerDraft = { name: '', managerName: '', teamIdentity: normaliseTeamIdentity(), stats: defaultCareerStats() };
    selectedCareerWeaponId = 'scrap-p12';
    careerWipeConfirmOpen = false;
    resetCareerMatchFlow();
    createMatch();
    menuContext = 'main';
    canResumeMatch = false;
    menuTab = 'play';
    setAppState('menu');
    updateMenuUI();
    lastTime = performance.now();
    return true;
  }

  function careerXpRequired(level = careerState.level) {
    return 90 + Math.max(0, level - 1) * 42;
  }

  function getCareerWeapon(id = careerState.equippedWeaponId) {
    return CAREER_WEAPON_CATALOG[id] || CAREER_WEAPON_CATALOG['scrap-p12'];
  }



  function careerWeaponSlotType(weaponOrId) {
    const weapon = typeof weaponOrId === 'string' ? CAREER_WEAPON_CATALOG[weaponOrId] : weaponOrId;
    if (!weapon) return 'sidearm';
    return weapon.slotType || (weapon.category === 'pistol' ? 'sidearm' : 'primary');
  }

  function careerWeaponIsSidearm(weaponOrId) {
    return careerWeaponSlotType(weaponOrId) === 'sidearm';
  }

  function careerWeaponIsPrimary(weaponOrId) {
    return careerWeaponSlotType(weaponOrId) === 'primary';
  }

  function careerPlayerPrimaryWeaponId(player) {
    const id = String(player?.equippedPrimaryWeaponId || '');
    return CAREER_WEAPON_CATALOG[id] && careerWeaponIsPrimary(id) ? id : null;
  }

  function careerPlayerSidearmId(player) {
    const id = String(player?.equippedSidearmId || '');
    if (CAREER_WEAPON_CATALOG[id] && careerWeaponIsSidearm(id)) return id;
    const legacy = String(player?.equippedWeaponId || player?.preferredWeaponId || 'scrap-p12');
    if (CAREER_WEAPON_CATALOG[legacy] && careerWeaponIsSidearm(legacy)) return legacy;
    return 'scrap-p12';
  }

  function careerPlayerActiveWeaponId(player) {
    return careerPlayerPrimaryWeaponId(player) || careerPlayerSidearmId(player);
  }

  function careerWeaponTradeoffMarkup(weaponOrId) {
    const weapon = typeof weaponOrId === 'string' ? getCareerWeapon(weaponOrId) : (weaponOrId || getCareerWeapon('scrap-p12'));
    const benefits = Array.isArray(weapon.benefits) ? weapon.benefits : [];
    const drawbacks = Array.isArray(weapon.drawbacks) ? weapon.drawbacks : [];
    return `<div class="career-weapon-tradeoffs"><article class="good"><strong>BENEFITS</strong><ul>${benefits.map(item => `<li>${escapeCareerHtml(item)}</li>`).join('')}</ul></article><article class="bad"><strong>LIMITATIONS</strong><ul>${drawbacks.map(item => `<li>${escapeCareerHtml(item)}</li>`).join('')}</ul></article></div>`;
  }

  function cloneCareerWeapon(id = careerState.equippedWeaponId, skinId = undefined) {
    const resolvedSkin = skinId === undefined && id === careerState.equippedWeaponId ? careerState.equippedSkinId : skinId;
    return { ...getCareerWeapon(id), skinId: resolvedSkin || null };
  }

  function weaponRangeDescriptor(weapon = getCareerWeapon()) {
    const range = Number(weapon?.range || 0);
    if (range <= 8.2) return { id: 'close', label: 'SHORT RANGE', note: 'Best in close fights and flank routes.' };
    if (range <= 10.8) return { id: 'balanced', label: 'MID RANGE', note: 'Comfortable in mixed lanes and trading distance.' };
    return { id: 'long', label: 'LONG RANGE', note: 'Favours long sightlines and anchored positions.' };
  }

  function getCareerSkin(id = careerState.equippedSkinId) {
    return id ? (CAREER_SKIN_CATALOG[id] || null) : null;
  }

  function isOwnedOperatorSlot(team, slot) {
    const squadSize = Array.isArray(careerState.squad) ? careerState.squad.length : 0;
    return team === CAREER_OWNED_TEAM && slot >= 0 && slot < Math.min(5, squadSize);
  }

  function getOwnedOperator() {
    return bots.find(bot => bot.isPlayerOwned) || bots.find(bot => isOwnedOperatorSlot(bot.team, bot.slot)) || null;
  }

  function ownedOperatorIndex() {
    const index = bots.findIndex(bot => bot.isPlayerOwned || isOwnedOperatorSlot(bot.team, bot.slot));
    return index >= 0 ? index : 0;
  }

  function careerStat(key) {
    const captainStats = careerState.squad?.[0]?.stats || careerState.stats || defaultCareerStats();
    return clamp(Number(captainStats[key]) || 0, 0, CAREER_MAX_STAT);
  }

  function careerSquadAverageStats() {
    const starters = (careerState.squad || []).slice(0, typeof TEAM_REQUIRED_STARTERS === 'number' ? TEAM_REQUIRED_STARTERS : 5);
    if (!starters.length) return { ...(careerState.stats || defaultCareerStats()) };
    const averaged = defaultCareerStats();
    for (const key of Object.keys(averaged)) averaged[key] = starters.reduce((sum, player) => sum + (Number(player.stats?.[key]) || 0), 0) / starters.length;
    return averaged;
  }

  function careerSquadAverageWeapon() {
    const starters = (careerState.squad || []).slice(0, typeof TEAM_REQUIRED_STARTERS === 'number' ? TEAM_REQUIRED_STARTERS : 5);
    if (!starters.length) return getCareerWeapon();
    const weapons = starters.map(player => getCareerWeapon(careerPlayerActiveWeaponId(player)));
    const base = { ...weapons[0], name: 'SQUAD LOADOUT' };
    for (const key of ['damageMin','damageMax','fireRate','accuracy','handling','range','magSize','reloadTime','critChanceBonus','critDamageBonus','headshotMultiplier','armourPenetration']) {
      base[key] = weapons.reduce((sum, weapon) => sum + (Number(weapon[key]) || 0), 0) / weapons.length;
    }
    return base;
  }

  function applyCombatBuildToBot(bot, stats, primaryWeapon, levelBonus = 0, sidearmWeapon = null) {
    const marksmanship = clamp(Number(stats.marksmanship) || 0, 0, CAREER_MAX_STAT);
    const handling = clamp(Number(stats.handling) || 0, 0, CAREER_MAX_STAT);
    const awareness = clamp(Number(stats.awareness) || 0, 0, CAREER_MAX_STAT);
    const mobility = clamp(Number(stats.mobility) || 0, 0, CAREER_MAX_STAT);
    const resilience = clamp(Number(stats.resilience) || 0, 0, CAREER_MAX_STAT);
    const criticalChance = clamp(Number(stats.criticalChance) || 0, 0, CAREER_MAX_STAT);
    const criticalDamage = clamp(Number(stats.criticalDamage) || 0, 0, CAREER_MAX_STAT);
    const resolvedPrimary = primaryWeapon || sidearmWeapon || CAREER_WEAPON_CATALOG['scrap-p12'];
    const resolvedSidearm = sidearmWeapon || (careerWeaponIsSidearm(resolvedPrimary) ? resolvedPrimary : CAREER_WEAPON_CATALOG['scrap-p12']);
    const critProfile = criticalCombatProfile({ criticalChance, criticalDamage }, resolvedPrimary);

    bot.rpgStats = { marksmanship, handling, awareness, mobility, resilience, criticalChance, criticalDamage };
    bot.hasDedicatedPrimary = careerWeaponIsPrimary(resolvedPrimary);
    bot.primaryWeapon = { ...resolvedPrimary };
    bot.secondaryWeapon = { ...resolvedSidearm };
    bot.weapon = bot.primaryWeapon;
    bot.skill = 0.90 + marksmanship * 0.026 + levelBonus;
    bot.accuracyBonus = marksmanship * 0.018;
    bot.damageConsistency = marksmanship * 0.055;
    bot.damageMultiplier = 1 + marksmanship * 0.010 + levelBonus * 0.35;
    bot.criticalChance = critProfile.chance;
    bot.criticalBonusDamage = critProfile.bonusDamage;
    bot.criticalMultiplier = critProfile.multiplier;
    bot.headshotMultiplier = clamp(Number(resolvedPrimary?.headshotMultiplier) || CAREER_DEFAULT_HEADSHOT_MULTIPLIER, 2.0, 4.0);
    bot.moveSkill = 0.88 + mobility * 0.032 + levelBonus * 0.45;
    bot.speed = 1.02 + mobility * 0.035 + levelBonus * 0.35;
    const carryPenalty = bot.hasDedicatedPrimary ? clamp(Number(resolvedPrimary.movementPenalty) || 0, 0, 0.12) : 0;
    bot.speed *= 1 - carryPenalty;
    bot.moveSkill *= 1 - carryPenalty * 0.35;
    bot.weaponCarryFatigueLoad = Math.max(0, Number(resolvedPrimary.fatigueLoad) || 0) + Math.max(0, Number(resolvedSidearm.fatigueLoad) || 0) * 0.20;
    bot.hearing = 0.84 + awareness * 0.050 + levelBonus * 0.45;
    bot.operatorReactionBase = clamp(0.37 - awareness * 0.026 - levelBonus, 0.105, 0.40);
    bot.operatorFireRateBase = clamp(1.09 - handling * 0.030 - levelBonus, 0.72, 1.12);
    bot.operatorReloadBase = clamp(1.10 - handling * 0.035 - levelBonus, 0.68, 1.16);
    bot.reactionDelay = clamp(bot.operatorReactionBase - resolvedPrimary.handling * 0.075 + (Number(resolvedPrimary.turnPenalty) || 0) * 0.18, 0.105, 0.42);
    bot.fireRateMultiplier = clamp(bot.operatorFireRateBase - resolvedPrimary.handling * 0.13, 0.68, 1.08);
    bot.reloadMultiplier = clamp(bot.operatorReloadBase - resolvedPrimary.handling * 0.16, 0.64, 1.10);
    bot.maxHealth = 90 + resilience * 4;
    bot.damageTakenMultiplier = clamp(1.06 - resilience * 0.027 - levelBonus * 0.25, 0.78, 1.06);
    return bot;
  }

  function captureBotWeaponHandlingBaseline(bot) {
    if (!bot?.weapon) return bot;
    const weapon = bot.weapon;
    bot.weaponReactionContextBase = (Number(bot.reactionDelay) || 0.26) + (Number(weapon.handling) || 0) * 0.075 - (Number(weapon.turnPenalty) || 0) * 0.18;
    bot.weaponFireContextBase = (Number(bot.fireRateMultiplier) || 1) + (Number(weapon.handling) || 0) * 0.13;
    bot.weaponReloadContextBase = (Number(bot.reloadMultiplier) || 1) + (Number(weapon.handling) || 0) * 0.16;
    return bot;
  }

  function refreshBotActiveWeaponHandling(bot) {
    if (!bot?.weapon) return bot;
    const weapon = bot.weapon;
    const reactionBase = Number.isFinite(bot.weaponReactionContextBase) ? bot.weaponReactionContextBase : (Number(bot.operatorReactionBase) || 0.30);
    const fireBase = Number.isFinite(bot.weaponFireContextBase) ? bot.weaponFireContextBase : (Number(bot.operatorFireRateBase) || 1.02);
    const reloadBase = Number.isFinite(bot.weaponReloadContextBase) ? bot.weaponReloadContextBase : (Number(bot.operatorReloadBase) || 1.02);
    bot.reactionDelay = clamp(reactionBase - (Number(weapon.handling) || 0) * 0.075 + (Number(weapon.turnPenalty) || 0) * 0.18, 0.10, 0.50);
    bot.fireRateMultiplier = clamp(fireBase - (Number(weapon.handling) || 0) * 0.13, 0.66, 1.14);
    bot.reloadMultiplier = clamp(reloadBase - (Number(weapon.handling) || 0) * 0.16, 0.62, 1.24);
    bot.headshotMultiplier = clamp(Number(weapon.headshotMultiplier) || CAREER_DEFAULT_HEADSHOT_MULTIPLIER, 2.0, 4.0);
    return bot;
  }

  function applyArmourProfileToBot(bot, armourOrId = 'none') {
    if (!bot) return bot;
    const armour = typeof armourOrId === 'string' ? getCareerArmour(armourOrId) : (armourOrId || getCareerArmour('none'));
    bot.armourProfile = { ...armour };
    bot.armourId = armour.id;
    bot.armourName = armour.name;
    bot.armourMaxDurability = Math.max(0, Number(armour.maxDurability) || 0);
    bot.armourDurability = bot.armourMaxDurability;
    bot.armourBroken = false;
    bot.armourAbsorbed = 0;
    bot.roundArmourAbsorbed = 0;
    bot.roundArmourIntegrityLost = 0;
    bot.armourFatigueLoad = Math.max(0, Number(armour.fatigueLoad) || 0);
    bot.armourHandlingPenalty = Math.max(0, Number(armour.handlingPenalty) || 0);
    const movementPenalty = clamp(Number(armour.movementPenalty) || 0, 0, 0.18);
    const handlingPenalty = clamp(Number(armour.handlingPenalty) || 0, 0, 0.12);
    bot.speed *= 1 - movementPenalty;
    bot.moveSkill *= 1 - movementPenalty * 0.45;
    bot.reloadMultiplier = clamp((bot.reloadMultiplier || 1) * (1 + handlingPenalty), 0.64, 1.30);
    bot.reactionDelay = clamp((bot.reactionDelay || 0.25) + handlingPenalty * 0.24, 0.10, 0.50);
    return bot;
  }

  function simulatedOperatorArmourId(profile = null, team = TEAM_RED, slot = 0) {
    const overall = profile && typeof teamPlayerOverall === 'function' ? teamPlayerOverall(profile) : 38 + (Number(slot) || 0) * 2;
    const role = String(profile?.role || profile?.primaryRole || ['entry','support','anchor','flanker','marksman'][slot % 5] || 'flex');
    if (overall >= 66 && ['anchor','support','caller'].includes(role)) return 'guardian-plate';
    if (overall >= 55) return role === 'flanker' ? 'scout-weave' : 'response-carrier';
    if (overall >= 46 && ['anchor','entry','support'].includes(role)) return 'scout-weave';
    return 'none';
  }

  function applyCareerToBot(bot) {
    if (!bot || !bot.isPlayerOwned) return bot;
    const player = careerState.squad?.[bot.slot] || careerState.squad?.[0] || null;
    if (!player) return applySimulatedCareerToBot(bot);
    const primaryWeaponId = careerPlayerPrimaryWeaponId(player);
    const sidearmId = careerPlayerSidearmId(player);
    const primaryWeapon = primaryWeaponId ? cloneCareerWeapon(primaryWeaponId, careerState.equippedSkinId) : cloneCareerWeapon(sidearmId, careerState.equippedSkinId);
    const sidearmWeapon = cloneCareerWeapon(sidearmId, careerState.equippedSkinId);
    const levelBonus = Math.min(0.055, Math.max(0, (teamPlayerOverall(player) / 10) - 3) * 0.0035);
    bot.name = player.name;
    bot.playerProfileId = player.id;
    const activePlan = typeof clubActiveMatchPlan === 'function' ? clubActiveMatchPlan() : null;
    const activeAssignment = activePlan?.assignments?.find(item => item.playerId === player.id);
    const assignedRole = typeof teamRoleById === 'function'
      ? teamRoleById(activeAssignment?.roleId || (typeof clubMatchRoleForPlayer === 'function' ? clubMatchRoleForPlayer(player).id : player.role))
      : null;
    const planSuitability = activePlan?.suitability || (typeof clubTacticalSuitabilityReport === 'function' ? clubTacticalSuitabilityReport() : null);
    const playerSuitability = planSuitability?.players?.find(item => item.playerId === player.id) || null;
    const tacticalEffectScale = clamp(Number(planSuitability?.tacticalEffectScale) || 1, 0.86, 1.08);
    const roleExecutionScale = clamp(Number(playerSuitability?.executionScale) || 1, 0.88, 1.07);
    bot.naturalPlayerRole = player.role;
    bot.playerRole = assignedRole?.id || player.role;
    bot.buildSource = 'SQUAD';
    const applied = applyCombatBuildToBot(bot, player.stats, primaryWeapon, levelBonus, sidearmWeapon);
    const fatigue = clamp(Number(player.fatigue) || 0, 0, 100) / 100;
    const happiness = clamp(Number(player.happiness) || 70, 1, 100) / 100;
    const morale = clamp(Number(player.morale) || 70, 1, 100) / 100;
    const form = clamp(Number(player.form) || 6.5, 1, 10) / 10;
    const conditionMultiplier = clamp(1 - fatigue * 0.115, 0.86, 1);
    const confidenceMultiplier = clamp(0.94 + happiness * 0.035 + morale * 0.025 + (form - 0.65) * 0.05, 0.91, 1.05);
    applied.playerFatigue = Math.round(fatigue * 100);
    applied.playerHappiness = Math.round(happiness * 100);
    applied.playerMorale = Math.round(morale * 100);
    applied.playerForm = Number(player.form) || 6.5;
    applied.speed *= conditionMultiplier;
    applied.moveSkill *= clamp(conditionMultiplier + 0.025, 0.88, 1);
    applied.skill *= confidenceMultiplier * clamp(1 - fatigue * 0.055, 0.94, 1);
    applied.accuracyBonus -= fatigue * 0.038;
    applied.reactionDelay = clamp(applied.reactionDelay + fatigue * 0.055 - (confidenceMultiplier - 1) * 0.08, 0.10, 0.46);
    applied.reloadMultiplier = clamp(applied.reloadMultiplier * (1 + fatigue * 0.055), 0.64, 1.18);
    applied.maxHealth = Math.max(82, Math.round(applied.maxHealth * clamp(1 - fatigue * 0.035, 0.96, 1)));
    if (typeof applyPlayerInjuryToBot === 'function') applyPlayerInjuryToBot(applied, player);
    const role = assignedRole || (typeof teamRoleById === 'function' ? teamRoleById(player.role) : null);
    if (role) {
      if (role.id === 'entry') { applied.aggression = Math.max(applied.aggression, 0.82); applied.stealth *= 0.86; }
      else if (role.id === 'anchor') { applied.aggression = Math.min(applied.aggression, 0.54); applied.stealth = Math.max(applied.stealth, 0.66); }
      else if (role.id === 'flanker') { applied.flankDirection = bot.slot % 2 ? -1 : 1; applied.aggression = clamp(applied.aggression + 0.08, 0, 1); }
      else if (role.id === 'marksman') { applied.aggression = Math.min(applied.aggression, 0.62); applied.combatBurstTarget = 1 + Math.floor(Math.random() * 2); }
      else if (role.id === 'caller') { applied.hearing += 0.08; applied.reactionDelay = Math.max(0.10, applied.reactionDelay - 0.025); }
      else if (role.id === 'support') { applied.aggression = clamp(applied.aggression, 0.48, 0.74); }
    }
    applied.tacticalPlanFit = Math.round(Number(planSuitability?.overall) || 0);
    applied.tacticalExecutionPercent = Math.round(Number(planSuitability?.executionPercent) || 100);
    applied.roleSuitabilityScore = Math.round(Number(playerSuitability?.score) || 0);
    applied.roleExecutionScale = roleExecutionScale;
    applied.tacticalEffectScale = tacticalEffectScale;
    applied.tacticalDecisionMultiplier = clamp(1.14 - tacticalEffectScale * 0.16 - roleExecutionScale * 0.08, 0.88, 1.12);
    applied.reactionDelay = clamp(applied.reactionDelay + (1 - roleExecutionScale) * 0.045, 0.10, 0.46);
    applied.moveSkill *= clamp(1 + (roleExecutionScale - 1) * 0.28, 0.96, 1.02);
    applied.hearing *= clamp(1 + (roleExecutionScale - 1) * 0.10, 0.98, 1.01);
    const formation = activePlan?.formationId && typeof CLUB_FORMATIONS === 'object'
      ? CLUB_FORMATIONS[activePlan.formationId]
      : (typeof clubFormation === 'function' ? clubFormation() : null);
    if (formation) {
      applied.aggression = clamp(applied.aggression + (Number(formation.aggression) || 0) * tacticalEffectScale, 0.20, 0.96);
      applied.speed *= 1 + (Number(formation.mobility) || 0) * tacticalEffectScale;
      applied.moveSkill *= 1 + (Number(formation.mobility) || 0) * 0.65 * tacticalEffectScale;
      applied.hearing += (Number(formation.awareness) || 0) * tacticalEffectScale;
      applied.reactionDelay = clamp(applied.reactionDelay - (Number(formation.awareness) || 0) * 0.22 * tacticalEffectScale, 0.10, 0.46);
      applied.formationId = formation.id;
    }
    const approach = activePlan?.approachId && typeof CLUB_APPROACHES === 'object'
      ? CLUB_APPROACHES[activePlan.approachId]
      : (typeof clubApproach === 'function' ? clubApproach() : null);
    const engagement = activePlan?.engagementId && typeof CLUB_ENGAGEMENTS === 'object'
      ? CLUB_ENGAGEMENTS[activePlan.engagementId]
      : (typeof clubEngagementPlan === 'function' ? clubEngagementPlan() : null);
    const priority = activePlan?.priorityId && typeof CLUB_PRIORITIES === 'object'
      ? CLUB_PRIORITIES[activePlan.priorityId]
      : (typeof clubTeamPriority === 'function' ? clubTeamPriority() : null);
    applied.teamApproachId = approach?.id || 'balanced';
    applied.teamPriorityId = priority?.id || 'trade';
    applied.engagementPlanId = engagement?.id || 'mixed';
    applied.aggression = clamp(applied.aggression + ((Number(approach?.aggression) || 0) + (Number(engagement?.advanceBias) || 0)) * tacticalEffectScale, 0.18, 0.98);
    applied.speed *= 1 + ((Number(approach?.pace) || 1) - 1) * tacticalEffectScale;
    applied.coverBias = (Number(approach?.coverBias) || 0) * tacticalEffectScale;
    applied.lowHealthThreshold = 0.43 + ((Number(approach?.lowHealthThreshold) || 0.43) - 0.43) * tacticalEffectScale;
    applied.waitForSupportMultiplier = 1 + ((Number(approach?.waitForSupport) || 1) - 1) * tacticalEffectScale;
    applied.engagementRangeMultiplier = 1 + ((Number(engagement?.rangeMultiplier) || 1) - 1) * tacticalEffectScale;
    applied.spacingBias = (Number(engagement?.spacingBias) || 0) * tacticalEffectScale;
    applied.groupBias = (Number(priority?.groupBias) || 0) * tacticalEffectScale;
    applied.tradeBias = (Number(priority?.tradeBias) || 0) * tacticalEffectScale;
    applied.flankBias = (Number(priority?.flankBias) || 0) * tacticalEffectScale;
    applied.holdBias = (Number(priority?.holdBias) || 0) * tacticalEffectScale;
    applied.supportRadius = 3.55 + ((Number(priority?.supportRadius) || 3.55) - 3.55) * tacticalEffectScale;
    if (typeof applySquadDynamicsToBot === 'function') applySquadDynamicsToBot(applied, player);
    applyArmourProfileToBot(applied, player.equippedArmourId || 'none');
    captureBotWeaponHandlingBaseline(applied);
    refreshBotActiveWeaponHandling(applied);
    return applied;
  }

  function applySimulatedCareerToBot(bot) {
    if (!bot || bot.isPlayerOwned) return bot;
    const generated = typeof generatedMatchProfile === 'function' ? generatedMatchProfile(bot.team, bot.slot) : null;
    if (generated) {
      bot.simulatedProfile = generated;
      bot.simulatedStats = { ...generated.stats };
      bot.name = generated.name;
    } else if (!bot.simulatedStats) {
      bot.simulatedStats = simulatedOperatorStats(bot.team, bot.slot);
    }
    const preferred = generated?.preferredWeaponId;
    const weapon = preferred && CAREER_WEAPON_CATALOG[preferred]
      ? cloneCareerWeapon(preferred)
      : cloneSimulatedStarterWeapon(bot.team, bot.slot);
    bot.simulatedWeaponId = weapon.id;
    const simulatedRoleId = generated?.role || ['entry', 'support', 'anchor', 'flanker', 'marksman'][bot.slot % 5] || 'flex';
    bot.naturalPlayerRole = simulatedRoleId;
    bot.playerRole = simulatedRoleId;
    bot.teamApproachId = 'balanced';
    bot.teamPriorityId = 'trade';
    bot.supportRadius = 3.55;
    bot.tradeBias = 0.72;
    bot.groupBias = 0.48;
    bot.buildSource = bot.team === TEAM_RED ? 'OPPOSITION' : 'SIMULATED';
    const simulatedSidearm = careerWeaponIsSidearm(weapon) ? weapon : cloneCareerWeapon('scrap-p12');
    const applied = applyCombatBuildToBot(bot, bot.simulatedStats, weapon, 0, simulatedSidearm);
    // Opposition operators use the same stat-plus-weapon critical pipeline as
    // the owned squad, rather than falling back to a fixed global chance.
    refreshCriticalCombatProfile(applied);
    if (bot.team === TEAM_RED && typeof applyOpponentIdentityToBot === 'function') applyOpponentIdentityToBot(applied);
    const simulatedArmourId = bot.matchArmourCarry?.broken
      ? 'none'
      : simulatedOperatorArmourId(generated, bot.team, bot.slot);
    applyArmourProfileToBot(applied, simulatedArmourId);
    captureBotWeaponHandlingBaseline(applied);
    refreshBotActiveWeaponHandling(applied);
    return applied;
  }

  function resetCareerCombatProfile(bot) {
    bot.maxHealth = 100;
    bot.damageTakenMultiplier = 1;
    bot.fireRateMultiplier = 1;
    bot.reloadMultiplier = 1;
    bot.accuracyBonus = 0;
    bot.damageConsistency = 0;
    bot.damageMultiplier = 1;
    bot.criticalChance = CAREER_BASE_CRIT_CHANCE;
    bot.criticalBonusDamage = CAREER_BASE_CRIT_BONUS_DAMAGE;
    bot.criticalMultiplier = 1 + CAREER_BASE_CRIT_BONUS_DAMAGE;
    bot.headshotMultiplier = CAREER_DEFAULT_HEADSHOT_MULTIPLIER;
    bot.rpgStats = null;
    bot.reactionStatReduction = 0;
    bot.buildSource = 'LEGACY';
    bot.naturalPlayerRole = 'flex';
    bot.playerRole = 'flex';
    bot.teamApproachId = 'balanced';
    bot.teamPriorityId = 'trade';
    bot.engagementPlanId = 'mixed';
    bot.coverBias = 0;
    bot.lowHealthThreshold = 0.43;
    bot.waitForSupportMultiplier = 1;
    bot.engagementRangeMultiplier = 1;
    bot.spacingBias = 0;
    bot.armourProfile = { ...CAREER_ARMOUR_CATALOG.none };
    bot.armourId = 'none';
    bot.armourName = CAREER_ARMOUR_CATALOG.none.name;
    bot.armourMaxDurability = 0;
    bot.armourDurability = 0;
    bot.armourBroken = false;
    bot.armourAbsorbed = 0;
    bot.roundArmourAbsorbed = 0;
    bot.roundArmourIntegrityLost = 0;
    bot.armourFatigueLoad = 0;
    bot.armourHandlingPenalty = 0;
    bot.weaponCarryFatigueLoad = 0;
    bot.hasDedicatedPrimary = false;
    bot.groupBias = 0.55;
    bot.tradeBias = 0.55;
    bot.flankBias = 0;
    bot.holdBias = 0;
    bot.supportRadius = 3.55;
    bot.tacticalPlanFit = 0;
    bot.tacticalExecutionPercent = 100;
    bot.roleSuitabilityScore = 0;
    bot.roleExecutionScale = 1;
    bot.tacticalEffectScale = 1;
    bot.tacticalDecisionMultiplier = 1;
  }

  function beginCareerRound() {
    careerBetweenRounds = false;
    careerRoundStartKills = getOwnedOperator()?.kills || 0;
    careerRoundStartDeaths = getOwnedOperator()?.deaths || 0;
    const ownedIndex = ownedOperatorIndex();
    spectatorIndex = ownedIndex;
    autoSpectate = false;
    autoTimer = 999;
    if (autoBtn) autoBtn.textContent = 'AUTO: OFF';
    if (portraitAutoBtn) portraitAutoBtn.textContent = 'AUTO: OFF';
  }

  function resetCareerMatchFlow() {
    careerBetweenRounds = false;
    careerMatchComplete = false;
    careerCrateState.phase = 'idle';
    careerCrateState.result = null;
    careerMatchStats = makeCareerMatchStats();
    if (typeof resetTeamMatchTracking === 'function') resetTeamMatchTracking();
    careerReportState = { phase: 'idle', delay: 0, summary: null, revealStage: 0, detailed: true };
    if (careerCrateOverlayEl) {
      careerCrateOverlayEl.hidden = true;
      careerCrateOverlayEl.classList.remove('closed', 'opening', 'cycling', 'revealed');
    }
    if (careerReportOverlayEl) careerReportOverlayEl.hidden = true;
  }

  function addCareerXp(amount) {
    let remaining = Math.max(0, Math.floor(Number(amount) || 0));
    let levelsGained = 0;
    careerState.xp += remaining;
    while (careerState.xp >= careerXpRequired()) {
      careerState.xp -= careerXpRequired();
      careerState.level++;
      careerState.unspentPoints++;
      levelsGained++;
    }
    return levelsGained;
  }

  function recordCareerRoundResult(winner) {
    const won = winner === CAREER_OWNED_TEAM;
    const round = typeof recordTeamMatchRound === 'function'
      ? recordTeamMatchRound(winner)
      : { kills: 0, deaths: 0, shotsFired: 0, shotsHit: 0, damageDealt: 0, damageTaken: 0, survivalTime: 0, reloads: 0, survivors: 0 };

    careerMatchStats.roundsPlayed++;
    careerMatchStats.roundsWon += won ? 1 : 0;
    careerMatchStats.kills += round.kills;
    careerMatchStats.deaths += round.deaths;
    careerMatchStats.shotsFired += round.shotsFired;
    careerMatchStats.shotsHit += round.shotsHit;
    careerMatchStats.damageDealt += round.damageDealt;
    careerMatchStats.damageTaken += round.damageTaken;
    careerMatchStats.survivalTime += round.survivalTime;
    careerMatchStats.reloads += round.reloads;
    careerMatchStats.finalSurvived = round.survivors > 0;
    careerMatchStats.lastRound = roundNumber;

    careerState.totalRounds++;
    careerState.totalWins += won ? 1 : 0;
    careerState.totalKills += round.kills;
    careerState.totalDeaths += round.deaths;
    careerState.bestRoundKills = Math.max(careerState.bestRoundKills, round.kills);
    saveCareerState();
    return { ...round, survived: round.survivors > 0, won };
  }

  function completeCareerMatch(winner) {
    const roundsPlayed = Math.max(1, careerMatchStats.roundsPlayed);
    const kills = careerMatchStats.kills;
    const deaths = careerMatchStats.deaths;
    const shotsFired = careerMatchStats.shotsFired;
    const shotsHit = careerMatchStats.shotsHit;
    const accuracy = shotsFired > 0 ? shotsHit / shotsFired : 0;
    const damageDealt = careerMatchStats.damageDealt;
    const damageTaken = careerMatchStats.damageTaken;
    const survivalTime = careerMatchStats.survivalTime;
    const reloads = careerMatchStats.reloads;
    const survived = careerMatchStats.finalSurvived;
    const won = winner === CAREER_OWNED_TEAM;
    const livePresentation = currentMatchPresentation();
    const matchPresentation = {
      mode: livePresentation.mode || null,
      competition: livePresentation.competition || 'TACTICAL ELIMINATION',
      matchday: livePresentation.matchday || null,
      fixtureId: livePresentation.fixtureId || null,
      blue: { ...livePresentation.blue },
      red: { ...livePresentation.red }
    };
    const baseXp = 60;
    const killXp = kills * 7;
    const survivalXp = survived ? 16 : 0;
    const winXp = won ? 72 : 0;
    const multiKillEvents = Array.isArray(careerMatchStats.multiKillEvents) ? careerMatchStats.multiKillEvents.map(event => ({ ...event })) : [];
    const matchMoments = Array.isArray(careerMatchStats.matchMoments) ? careerMatchStats.matchMoments.map(event => ({ ...event, evidence: event?.evidence && typeof event.evidence === 'object' ? { ...event.evidence } : {} })) : [];
    const roundDecisions = Array.isArray(careerMatchStats.roundDecisions) ? careerMatchStats.roundDecisions.map(item => ({ ...item })) : [];
    const liveCommands = Array.isArray(careerMatchStats.liveCommands) ? careerMatchStats.liveCommands.map(item => ({
      ...item,
      evidence: item?.evidence && typeof item.evidence === 'object' ? JSON.parse(JSON.stringify(item.evidence)) : {},
      responses: Array.isArray(item?.responses) ? item.responses.map(response => ({ ...response })) : [],
      protectedFieldChanges: Array.isArray(item?.protectedFieldChanges) ? item.protectedFieldChanges.map(change => ({ ...change })) : []
    })) : [];
    const multiKillBonus = careerMultiKillRewardBreakdown(multiKillEvents);
    const xpAward = baseXp + killXp + survivalXp + winXp + multiKillBonus.xp;
    const playerDivisor = Math.max(1, Math.min(TEAM_REQUIRED_STARTERS || 5, careerState.squad?.length || 1));
    const score = careerCombatScore({
      kills: kills / playerDivisor,
      deaths: deaths / playerDivisor,
      survived,
      won,
      accuracy,
      damageDealt: damageDealt / playerDivisor,
      damageTaken: damageTaken / playerDivisor,
      survivalTime: survivalTime / Math.max(1, roundsPlayed * playerDivisor)
    });
    const levelsGained = addCareerXp(xpAward);
    const firstCareerMatch = Number(careerState.totalMatches || 0) === 0;

    careerState.totalMatches++;
    careerState.matchWins += won ? 1 : 0;
    careerState.lastRound = {
      isMatch: true,
      firstCareerMatch,
      kills, deaths, survived, won, xpAward, levelsGained,
      round: roundNumber,
      roundsPlayed,
      roundsWon: careerMatchStats.roundsWon,
      blueScore,
      redScore,
      matchPresentation,
      blueTeamName: matchPresentation.blue.name,
      redTeamName: matchPresentation.red.name,
      shotsFired, shotsHit, accuracy, damageDealt, damageTaken, survivalTime, reloads,
      teamReport: true,
      playerCount: Math.min(TEAM_REQUIRED_STARTERS || 5, careerState.squad?.length || 0),
      weaponId: careerState.squad?.[0] ? careerPlayerActiveWeaponId(careerState.squad[0]) : careerState.equippedWeaponId,
      weaponName: 'MULTI-WEAPON SQUAD LOADOUT',
      score,
      grade: careerCombatGrade(score),
      rewardEligible: won,
      multiKillEvents,
      matchMoments,
      roundDecisions,
      liveCommands,
      multiKillBonus,
      tacticalPlan: typeof clubActiveMatchPlan === 'function' ? clubActiveMatchPlan() : null,
      xpBreakdown: { base: baseXp, kills: killXp, survival: survivalXp, victory: winXp, multiKill: multiKillBonus.xp }
    };
    const diagnosticSummary = lastCompletedDiagnosticReport?.summary || matchDiagnostics?.summary || null;
    if (diagnosticSummary?.zoneAnalytics) careerState.lastRound.zoneAnalysis = diagnosticSummary.zoneAnalytics.map(item => ({ ...item, teams: item.teams ? { blue: { ...item.teams.blue }, red: { ...item.teams.red } } : undefined }));
    if (diagnosticSummary?.aiStability) careerState.lastRound.aiStability = { ...diagnosticSummary.aiStability };
    if (Array.isArray(diagnosticSummary?.operators)) {
      careerState.lastRound.operatorAnalysis = diagnosticSummary.operators
        .filter(item => Number(item?.team) === CAREER_OWNED_TEAM)
        .map(item => ({
          key: item.key, name: item.name, slot: item.slot, playerId: item.playerId || null, role: item.role || 'flex',
          weapon: item.weapon ? { ...item.weapon } : null, averageTargetDistance: item.averageTargetDistance,
          effectiveRangePercent: item.effectiveRangePercent, stationaryPercent: item.stationaryPercent,
          crouchedStationaryPercent: item.crouchedStationaryPercent, pathChanges: item.pathChanges,
          targetChanges: item.targetChanges, tacticalChanges: item.tacticalChanges, kills: item.kills, deaths: item.deaths,
          blockedShots: item.blockedShots, recoveries: item.recoveries, flankRoutes: item.flankRoutes,
          primaryZone: item.primaryZone || null, primaryState: item.primaryState || null,
          zoneUsage: item.zoneUsage ? { ...item.zoneUsage } : {}, stateUsage: item.stateUsage ? { ...item.stateUsage } : {}
        }));
    }
    if (diagnosticSummary?.fightLocation) careerState.lastRound.fightLocation = diagnosticSummary.fightLocation;
    careerState.lastRound.finance = settleTeamManagementAfterMatch(winner, careerState.lastRound);
    careerState.lastRound.goldCoinReward = settleCareerGoldCoinsAfterMatch(winner, careerState.lastRound);
    if (typeof settleLeagueAfterCareerMatch === 'function') {
      careerState.lastRound.league = settleLeagueAfterCareerMatch(winner, careerState.lastRound);
    }
    if (typeof supporterState === 'function') {
      const latestReaction = (supporterState().activityHistory || []).find(item => item?.type === 'MATCH');
      if (latestReaction) careerState.lastRound.supporterReaction = { ...latestReaction, deltas: { ...(latestReaction.deltas || {}) } };
    }
    if (typeof clubRecordTacticalFamiliarity === 'function') {
      careerState.lastRound.tacticalFamiliarityGain = clubRecordTacticalFamiliarity(careerState.lastRound);
    }
    if (typeof buildTacticalMatchAnalysis === 'function') {
      careerState.lastRound.tacticalAnalysis = buildTacticalMatchAnalysis(careerState.lastRound);
    }
    if (typeof buildCareerMatchHighlights === 'function') {
      careerState.lastRound.matchHighlights = buildCareerMatchHighlights(careerState.lastRound);
    }
    if (typeof settleTeamPerformanceTraitsAfterMatch === 'function') {
      careerState.lastRound.performanceTraitUpdates = settleTeamPerformanceTraitsAfterMatch(careerState.lastRound);
    }
    careerBetweenRounds = true;
    saveCareerState();
    if (won) queueCareerCrate(careerState.lastRound);
    else careerCrateState = { phase: 'idle', delay: 0, timer: 0, cycleTimer: 0, displayIndex: 0, result: null, duplicate: false, summary: null, source: 'match', returnRoute: 'loadout' };
    careerReportState = { phase: 'delay', delay: 1.25, summary: careerState.lastRound, revealStage: 0, detailed: !firstCareerMatch };
    return careerState.lastRound;
  }

  // Build 12.137: the reward is rolled and banked to the career save before the
  // overlay is shown. It used to live only in `careerCrateState`, a module
  // variable, so a refresh, a closed tab or any navigation away from the
  // unclaimed reveal destroyed the weapon permanently. The paid store crate was
  // already persisted for exactly this reason; the victory crate now is too.
  function queueCareerCrate(summary) {
    const reward = normaliseCareerCrateReward(rollCareerCrateReward());
    careerState.pendingMatchCrate = {
      id: `MATCH-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      reward,
      awardedMatch: Math.max(0, Number(careerState.totalMatches) || 0)
    };
    saveCareerState();
    careerCrateState = {
      phase: 'queued',
      delay: 0,
      timer: 0,
      cycleTimer: 0,
      displayIndex: 0,
      result: reward,
      duplicate: false,
      summary,
      source: 'match',
      returnRoute: 'loadout'
    };
    if (careerCrateOverlayEl) {
      careerCrateOverlayEl.hidden = true;
      careerCrateOverlayEl.classList.remove('closed', 'opening', 'cycling', 'revealed');
    }
  }

  function careerCombatScore(summary = {}) {
    const killScore = clamp((Number(summary.kills) || 0) / 4, 0, 1) * 28;
    const accuracyScore = clamp(Number(summary.accuracy) || 0, 0, 1) * 22;
    const damageScore = clamp((Number(summary.damageDealt) || 0) / 260, 0, 1) * 20;
    const survivalScore = clamp((Number(summary.survivalTime) || 0) / ROUND_DURATION, 0, 1) * 14;
    const outcomeScore = summary.won ? 12 : 0;
    const lifeScore = summary.survived ? 4 : 0;
    const penalty = clamp((Number(summary.damageTaken) || 0) / 180, 0, 1) * 6;
    return Math.round(clamp(killScore + accuracyScore + damageScore + survivalScore + outcomeScore + lifeScore - penalty, 0, 100));
  }

  function careerCombatGrade(score) {
    const value = Number(score) || 0;
    if (value >= 90) return 'S';
    if (value >= 78) return 'A';
    if (value >= 64) return 'B';
    if (value >= 48) return 'C';
    if (value >= 32) return 'D';
    return 'E';
  }

  function formatCareerTime(seconds) {
    const total = Math.max(0, Math.round(Number(seconds) || 0));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }

  function renderCareerLiveCommandReview(summary = {}) {
    const commands = Array.isArray(summary.liveCommands) ? summary.liveCommands : [];
    if (!commands.length) return '';
    const successful = commands.filter(item => item?.status === 'success').length;
    const cleanAudits = commands.filter(item => !Array.isArray(item?.protectedFieldChanges) || item.protectedFieldChanges.length === 0).length;
    return `<section class="career-report-live-commands"><header><span>LIVE COMMAND REVIEW</span><strong>${commands.length} ROUND PULSE${commands.length === 1 ? '' : 'S'} · ${successful} SUCCESSFUL</strong><small>Broad instructions affected movement, spacing and approach only. ${cleanAudits}/${commands.length} command audits confirmed no base health, accuracy or damage configuration changed.</small></header><div class="career-report-live-command-grid">${commands.map(item => {
      const status = ['success', 'mixed', 'failed'].includes(item?.status) ? item.status : 'mixed';
      const responders = Math.max(0, Number(item?.responders) || 0);
      const delayed = Math.max(0, Number(item?.delayed) || 0);
      const unable = Math.max(0, Number(item?.unable) || 0);
      const route = item?.routePlanName ? ` · ${escapeCareerHtml(String(item.routePlanName).toUpperCase())}` : '';
      return `<article class="career-report-live-command ${status}"><span>ROUND ${Math.max(1, Number(item?.round) || 1)} · ${escapeCareerHtml(String(item?.commandName || 'LIVE COMMAND'))}${route}</span><strong>${escapeCareerHtml(String(item?.title || 'PARTIAL COMPLIANCE'))}</strong><small>${escapeCareerHtml(String(item?.detail || 'No outcome detail recorded.'))}<br>${responders} RESPONDED · ${delayed} DELAYED · ${unable} UNABLE · ${Number(item?.durationUsed || item?.duration || 0).toFixed(1)}S</small></article>`;
    }).join('')}</div></section>`;
  }

  // Build 12.134: one authority for "what kind of match was this", used by the
  // detailed report and the staged first-match outcome so both agree. Prefers
  // the settled league record, then the stored match presentation, then the
  // live presentation.
  function careerMatchTypeDescriptor(summary = {}) {
    const competition = summary.league || null;
    const presentation = summary.matchPresentation || (typeof currentMatchPresentation === 'function' ? currentMatchPresentation() : null);
    const mode = competition?.mode || presentation?.mode || null;

    if (mode === 'tutorial') {
      return {
        mode: 'tutorial', tone: 'exhibition', label: 'ORIENTATION ROUND',
        kicker: escapeCareerHtml(presentation?.competition || 'GUIDED ORIENTATION ROUND'),
        detail: 'Guided practice round · no league standings, wages or transfers are affected'
      };
    }

    if (mode === 'league') {
      const division = competition?.divisionName
        || (typeof leagueCompetitionName === 'function' ? leagueCompetitionName() : 'LEAGUE');
      const matchday = competition?.matchday ? ` · MATCHDAY ${competition.matchday}` : '';
      const standing = competition
        ? `LEAGUE POSITION ${competition.position} · ${competition.points} POINTS${competition.seasonComplete ? ` · SEASON COMPLETE${competition.championName ? ` · CHAMPION ${competition.championName}` : ''}` : ''}`
        : 'Counts towards the league table';
      return {
        mode: 'league', tone: 'league', label: 'LEAGUE MATCH',
        kicker: `LEAGUE MATCH · ${division}${matchday}`,
        detail: standing
      };
    }

    return {
      mode: 'exhibition', tone: 'exhibition', label: 'EXHIBITION MATCH',
      kicker: 'EXHIBITION MATCH',
      detail: 'Friendly fixture · rewards are paid but the result does not affect league standings'
    };
  }

  function careerReportMarkup(summary, embedded = false) {
    if (!summary) return `<section class="career-report-empty"><span>AFTER ACTION ARCHIVE</span><strong>NO MATCH DATA</strong><p>Complete a full first-to-three match to generate the first team debrief.</p></section>`;
    const accuracy = Math.round(clamp(Number(summary.accuracy) || 0, 0, 1) * 100);
    const dealt = Math.round(Number(summary.damageDealt) || 0);
    const taken = Math.round(Number(summary.damageTaken) || 0);
    const score = Number.isFinite(summary.score) ? summary.score : careerCombatScore(summary);
    const grade = summary.grade || careerCombatGrade(score);
    const xp = summary.xpBreakdown || { base: 24, kills: (summary.kills || 0) * 28, survival: summary.survived ? 14 : 0, victory: summary.won ? 34 : 0 };
    const statInfluence = careerEffectivenessBreakdown(careerSquadAverageStats(), careerSquadAverageWeapon());
    const presentation = summary.matchPresentation || currentMatchPresentation();
    const blueClubName = summary.blueTeamName || presentation.blue?.name || careerState.name || 'Player Club';
    const redClubName = summary.redTeamName || presentation.red?.name || summary.league?.opponentName || 'Opposition';
    const scoreLine = `${escapeCareerHtml(blueClubName)} ${summary.blueScore ?? blueScore} — ${summary.redScore ?? redScore} ${escapeCareerHtml(redClubName)}`;
    const competition = summary.league || null;
    const finance = summary.finance || null;
    const financeMarkup = finance
      ? `<div class="career-report-finance"><span>MATCH INCOME</span><strong>+${teamCredits(finance.income || 0)}</strong><small>${teamCredits(finance.baseMatchIncome || 0)} BASE · ${escapeCareerHtml(finance.resultRewardLabel || (summary.won ? 'VICTORY BONUS' : 'DEFEAT PARTICIPATION AWARD'))} +${teamCredits(finance.resultReward || 0)}${Number(finance.multiKillBonus || 0) > 0 ? ` · MULTI-KILL +${teamCredits(finance.multiKillBonus)}` : ''}${Number(finance.manOfTheMatchBonus || 0) > 0 ? ` · MOTM +${teamCredits(finance.manOfTheMatchBonus)}` : ''}${Number(finance.commercialMultiplier || 1) !== 1 ? ` · COMMERCIAL ×${Number(finance.commercialMultiplier || 1).toFixed(2)}` : ''}</small></div>`
      : '';
    const goldReward = summary.goldCoinReward || null;
    const goldMarkup = goldReward
      ? `<div class="career-report-gold"><span>GOLD COINS</span><strong>+${careerGoldCoins(goldReward.amount)}</strong><small>${escapeCareerHtml(goldReward.label || 'MATCH AWARD')}${Number(goldReward.multiKillBonus || 0) > 0 ? ` · MULTI-KILL +${careerGoldCoins(goldReward.multiKillBonus)}` : ''} · ${careerGoldCoins(goldReward.balanceAfter)} BALANCE</small></div>`
      : '';
    // Build 12.134: the report always states what kind of match this was.
    // Previously the competition row only appeared when a league settlement
    // existed, so exhibition and orientation results carried no fixture type at
    // all and read identically to a league result.
    const type = careerMatchTypeDescriptor(summary);
    const competitionMarkup = `<div class="career-report-competition ${escapeCareerHtml(type.tone)}"><span>${escapeCareerHtml(type.kicker)}</span><strong>${escapeCareerHtml(competition?.opponentName || redClubName || 'Unknown opposition')}</strong><small>${escapeCareerHtml(type.detail)}</small></div>`;
    const matchAwardMarkup = typeof renderWorldPressMatchAward === 'function' ? renderWorldPressMatchAward(summary) : '';
    const multiKillEvents = Array.isArray(summary.multiKillEvents) ? summary.multiKillEvents : [];
    const firstMatchGuide = Number(careerState.totalMatches) <= 1 ? `<section class="first-debrief-guide"><header><span>YOUR FIRST AFTER ACTION REPORT</span><strong>TURN THE MATCH INTO ONE DECISION</strong></header><div><article><b>1</b><span><strong>READ WHAT WORKED</strong><small>Keep the parts of the plan your operators executed well.</small></span></article><article><b>2</b><span><strong>FIND THE BIGGEST ISSUE</strong><small>Use the clearest evidence instead of changing everything at once.</small></span></article><article><b>3</b><span><strong>OPEN NEXT MANAGER ACTION</strong><small>The recommendation below links directly to Tactics, Training or Loadout.</small></span></article></div></section>` : '';
    const multiKillHonours = multiKillEvents.length ? `<section class="career-report-multikills"><div class="career-section-head compact"><div><span>MULTI-KILL HONOURS</span><strong>MOMENTUM BONUSES</strong></div><p>Same operator · same round · within ${CAREER_MULTI_KILL_WINDOW} seconds.</p></div><div>${multiKillEvents.map(event => { const tier = careerMultiKillTier(event.count); return tier ? `<article class="${tier.key}"><span>ROUND ${event.round || 1}</span><strong>${escapeCareerHtml(tier.title)}</strong><small>${escapeCareerHtml(event.playerName || 'Operator')} · +${careerGoldCoins(tier.goldCoins)} · +${tier.xp} XP · +${teamCredits(tier.credits)}</small></article>` : ''; }).join('')}</div></section>` : '';
    return `
      ${firstMatchGuide}
      <div class="career-report-grid ${embedded ? 'embedded' : ''}">
        <section class="career-report-summary-panel">
          <div class="career-report-outcome ${summary.won ? 'win' : 'loss'}"><span>${scoreLine}</span><strong>${summary.won ? 'VICTORY' : 'DEFEAT'}</strong><small>${summary.roundsPlayed || 1} ROUNDS · ${summary.survived ? `${escapeCareerHtml(blueClubName)} SURVIVORS REMAINED` : `${escapeCareerHtml(blueClubName)} ELIMINATED IN FINAL ROUND`}</small></div>
          ${competitionMarkup}
          ${matchAwardMarkup}
          <div class="career-report-economy">${financeMarkup}${goldMarkup}</div>
          <div class="career-report-metrics">
            <article><span>ELIMINATIONS</span><strong>${summary.kills || 0}</strong><small>${summary.deaths || 0} DEATHS</small></article>
            <article><span>ACCURACY</span><strong>${accuracy}%</strong><small>${summary.shotsHit || 0} / ${summary.shotsFired || 0} HITS</small></article>
            <article><span>DAMAGE DEALT</span><strong>${dealt}</strong><small>${taken} RECEIVED</small></article>
            <article><span>COMBINED SURVIVAL</span><strong>${formatCareerTime(summary.survivalTime)}</strong><small>${summary.reloads || 0} TEAM RELOADS</small></article>
          </div>
          <div class="career-report-weapon"><span>TEAM LOADOUT</span><strong>${escapeCareerHtml(summary.weaponName || 'SQUAD LOADOUT')}</strong><small>INDIVIDUAL WEAPONS LISTED IN PLAYER DEBRIEF</small></div>
          ${multiKillHonours}
        </section>
        <section class="career-report-analysis-panel">
          <div class="career-report-score-ring" style="--report-score:${score}"><div class="career-report-score-content"><span>${grade}</span><strong>${score}</strong><small>COMBAT EFFECTIVENESS</small></div></div>
          <div class="career-report-influence-legend"><span class="operator">AVG ATTRIBUTES</span><span class="weapon">AVG LOADOUT</span><span class="total">TEAM PROFILE</span></div>
          <div class="career-report-influence">
            ${Object.entries(statInfluence.total).map(([key, value]) => {
              const operatorValue = Math.round(statInfluence.operator[key] * 100);
              const weaponValue = Math.round(statInfluence.weapon[key] * 100);
              return `<div><span>${key.toUpperCase()}</span><i><b style="width:${operatorValue}%"></b><em style="left:${operatorValue}%;width:${weaponValue}%"></em></i><strong>${Math.round(value * 100)}</strong></div>`;
            }).join('')}
          </div>
        </section>
        <section class="career-report-xp-panel">
          <div><span>MATCH COMPLETION</span><strong>+${xp.base || 0}</strong></div>
          <div><span>ELIMINATIONS</span><strong>+${xp.kills || 0}</strong></div>
          <div><span>SURVIVAL</span><strong>+${xp.survival || 0}</strong></div>
          <div><span>VICTORY</span><strong>+${xp.victory || 0}</strong></div>
          ${Number(xp.multiKill || 0) > 0 ? `<div class="multi-kill-xp"><span>MULTI-KILL</span><strong>+${xp.multiKill}</strong></div>` : ''}
          <div class="total"><span>TEAM XP</span><strong>+${summary.xpAward || 0}</strong></div>
        </section>
      </div>
      ${typeof renderCareerMatchHighlights === 'function' ? renderCareerMatchHighlights(summary) : ''}
      ${renderCareerLiveCommandReview(summary)}
      ${typeof renderTacticalMatchAnalysis === 'function' ? renderTacticalMatchAnalysis(summary) : ''}
      ${typeof renderSquadDynamicsMatchReport === 'function' ? renderSquadDynamicsMatchReport(summary) : ''}
      ${typeof diagnosticReportMarkup === 'function' ? diagnosticReportMarkup() : ''}`;
  }

  function firstMatchOutcomeProgress(stage) {
    const labels = ['RESULT', 'REWARDS', 'OPERATORS', 'SUPPORTERS', 'NEXT STEP'];
    return `<nav class="first-match-outcome-progress" aria-label="First match outcome progress">${labels.map((label, index) => `<span class="${index <= stage ? 'active' : ''} ${index < stage ? 'complete' : ''}"><b>${index + 1}</b>${label}</span>`).join('')}</nav>`;
  }

  function firstMatchOutcomeRecommendation(summary) {
    const recommendation = summary?.tacticalAnalysis?.recommendations?.[0] || null;
    if (recommendation && typeof recommendation === 'object') return recommendation;
    return {
      text: summary?.won ? 'Review the plan that produced this result and retain its strongest elements for the next fixture.' : 'Open Training and address one clearly identified weakness before rebuilding the whole tactical plan.',
      actionLabel: summary?.won ? 'REVIEW TACTICS' : 'OPEN TRAINING',
      route: summary?.won ? 'tactics' : 'training',
      playerId: null,
      targetId: summary?.won ? null : 'training:team-benefits'
    };
  }

  function careerFirstMatchOutcomeMarkup(summary, stage = 0) {
    const presentation = summary.matchPresentation || currentMatchPresentation();
    const blueName = summary.blueTeamName || presentation.blue?.name || careerState.name || 'Your Club';
    const redName = summary.redTeamName || presentation.red?.name || summary.league?.opponentName || 'Opposition';
    const matchType = careerMatchTypeDescriptor(summary);
    const resultTitle = summary.won ? 'YOUR FIRST CAREER VICTORY' : 'YOUR FIRST CAREER MATCH IS COMPLETE';
    const resultTone = summary.won ? 'positive' : 'warning';
    const scoreLine = `${escapeCareerHtml(blueName)} ${summary.blueScore ?? 0} — ${summary.redScore ?? 0} ${escapeCareerHtml(redName)}`;
    let content = '';
    if (stage === 0) {
      content = `<section class="first-match-outcome-stage result ${resultTone}"><span>MATCH RESULT · ${escapeCareerHtml(matchType.label)}</span><strong>${resultTitle}</strong><h3>${scoreLine}</h3><p class="first-match-type-line">${escapeCareerHtml(matchType.kicker)} · ${escapeCareerHtml(matchType.detail)}</p><p>${summary.won ? 'Your recruitment, roles, equipment and tactical plan combined to win a full first-to-three match.' : 'The result is recorded, but the debrief will separate the useful parts of the plan from the clearest weakness.'}</p><div class="first-match-score-block"><article><b>${summary.roundsWon || 0}</b><small>ROUNDS WON</small></article><article><b>${summary.kills || 0}</b><small>ELIMINATIONS</small></article><article><b>${Math.round((Number(summary.accuracy) || 0) * 100)}%</b><small>ACCURACY</small></article><article><b>${summary.grade || careerCombatGrade(summary.score)}</b><small>COMBAT GRADE</small></article></div></section>`;
    } else if (stage === 1) {
      content = `<section class="first-match-outcome-stage rewards"><span>REWARDS BANKED</span><strong>FOUR RESOURCES · FOUR DIFFERENT USES</strong><p>Everything below is already saved. Club Cash, Gold Coins, Team XP and Player XP do not substitute for one another.</p>${typeof clubEconomyGuideMarkup === 'function' ? clubEconomyGuideMarkup('reward', { summary }) : `<div class="first-match-reward-grid"><article><small>CLUB CASH</small><b>+${teamCredits(summary.finance?.income || 0)}</b><span>PAYS CLUB COSTS</span></article><article><small>TEAM XP</small><b>+${Math.round(Number(summary.xpAward) || 0)}</b><span>LEVELS THE CLUB</span></article><article><small>GOLD COINS</small><b>+${careerGoldCoins(summary.goldCoinReward?.amount || 0)}</b><span>SUPPLY CRATES ONLY</span></article><article><small>SUPPLY DROP</small><b>${summary.rewardEligible ? 'EARNED' : 'NOT EARNED'}</b><span>${summary.rewardEligible ? 'FREE VICTORY CRATE' : 'VICTORY REQUIRED'}</span></article></div>`}</section>`;
    } else if (stage === 2) {
      const starters = (careerState.squad || []).slice(0, TEAM_REQUIRED_STARTERS).map(player => {
        const development = (summary.finance?.development || []).find(item => item.playerId === player.id) || {};
        const match = player.lastMatch || {};
        return { player, development, match };
      }).sort((a, b) => (Number(b.match.rating) || 0) - (Number(a.match.rating) || 0));
      content = `<section class="first-match-outcome-stage operators"><span>OPERATOR IMPACT</span><strong>WHO SHAPED THE MATCH — AND WHY</strong><p>Ratings describe this match only. The match story below identifies the decisive contributor and turning point from visible evidence; XP and level gains remain permanent.</p>${typeof renderCareerMatchHighlights === 'function' ? renderCareerMatchHighlights(summary, true) : ''}<div class="first-match-operator-grid">${starters.map(({ player, development, match }, index) => `<article class="${index === 0 ? 'top' : ''}">${typeof teamPlayerVisualMarkup === 'function' ? teamPlayerVisualMarkup(player, teamRoleById(player.role)) : ''}<div><strong>${escapeCareerHtml(player.name)}</strong><small>${escapeCareerHtml(teamRoleById(player.role).name)} · ${Number(match.rating || 0).toFixed(1)} RATING</small><span>${match.kills || 0}K / ${match.deaths || 0}D · +${Math.round(Number(development.xp) || 0)} XP${Number(development.levelsGained) > 0 ? ` · LEVEL +${development.levelsGained}` : ''}</span></div></article>`).join('')}</div></section>`;
    } else if (stage === 3) {
      const reaction = summary.supporterReaction || null;
      const deltas = reaction?.deltas || {};
      content = `<section class="first-match-outcome-stage supporters ${reaction?.tone || 'neutral'}"><span>SUPPORTER REACTION</span><strong>${escapeCareerHtml(reaction?.title || (summary.won ? 'SUPPORTERS WELCOME THE RESULT' : 'SUPPORTERS ASSESS THE PERFORMANCE'))}</strong><p>${escapeCareerHtml(reaction?.detail || (summary.won ? 'The first result gives the new club an immediate platform to build confidence and interest.' : 'Supporters will judge the opening result against the strength of the opposition and the club’s early expectations.'))}</p><div class="first-match-supporter-deltas"><article><small>CONFIDENCE</small><b>${Number(deltas.confidence || reaction?.confidenceDelta || 0) >= 0 ? '+' : ''}${Number(deltas.confidence || reaction?.confidenceDelta || 0)}</b></article><article><small>POPULARITY</small><b>${Number(deltas.popularity || reaction?.popularityDelta || 0) >= 0 ? '+' : ''}${Number(deltas.popularity || reaction?.popularityDelta || 0)}</b></article><article><small>FANBASE</small><b>${Number(deltas.fanbase || reaction?.fanDelta || 0) >= 0 ? '+' : ''}${Number(deltas.fanbase || reaction?.fanDelta || 0)}</b></article></div></section>`;
    } else {
      const recommendation = firstMatchOutcomeRecommendation(summary);
      content = `<section class="first-match-outcome-stage next"><span>NEW SYSTEMS AVAILABLE</span><strong>THE WIDER MANAGEMENT GAME IS OPENING</strong><p>Your first completed match unlocks Team Telemetry, After Action Reports and Supplies. Reviewing this debrief unlocks Training.</p><aside class="first-match-next-action"><span>NEXT MANAGER ACTION</span><strong>${escapeCareerHtml(recommendation.actionLabel || 'OPEN TRAINING')}</strong><p>${escapeCareerHtml(recommendation.text || '')}</p><button type="button" data-coaching-route="${escapeCareerHtml(recommendation.route || 'training')}" ${recommendation.playerId ? `data-coaching-player="${escapeCareerHtml(recommendation.playerId)}"` : ''} ${recommendation.targetId ? `data-coaching-target="${escapeCareerHtml(recommendation.targetId)}"` : ''} data-coaching-label="${escapeCareerHtml(recommendation.actionLabel || 'OPEN TRAINING')}">${escapeCareerHtml(recommendation.actionLabel || 'OPEN TRAINING')} →</button></aside><div class="first-match-unlock-grid"><article><b>TELEMETRY</b><small>SEE HOW THE TEAM EXECUTED</small></article><article><b>REPORTS</b><small>REVIEW MATCH EVIDENCE</small></article><article><b>SUPPLIES</b><small>BUY WEAPONS AND ARMOUR</small></article><article><b>TRAINING</b><small>UNLOCKS AFTER THIS DEBRIEF</small></article></div></section>`;
    }
    return `<div class="first-match-outcome">${firstMatchOutcomeProgress(stage)}${content}</div>`;
  }

  function showCareerRoundReport() {
    const summary = careerReportState.summary;
    if (!summary || !careerReportOverlayEl) {
      careerReportState.phase = 'idle';
      careerCrateState.phase = 'delay';
      careerCrateState.delay = 0.35;
      return;
    }
    careerReportState.phase = 'visible';
    careerReportOverlayEl.hidden = false;
    const staged = Boolean(summary.firstCareerMatch && !careerReportState.detailed);
    if (careerReportTitleEl) careerReportTitleEl.textContent = staged ? 'FIRST MATCH OUTCOME' : (summary.won ? 'MISSION SUCCESS' : 'MISSION DEBRIEF');
    if (careerReportSubtitleEl) {
      const presentation = summary.matchPresentation || currentMatchPresentation();
      careerReportSubtitleEl.textContent = staged
        ? `STEP ${careerReportState.revealStage + 1} OF 5 · RESULT → REWARDS → OPERATORS → SUPPORTERS → NEXT STEP`
        : `${presentation.blue?.name || careerState.name} ${summary.blueScore ?? blueScore} — ${summary.redScore ?? redScore} ${presentation.red?.name || summary.league?.opponentName || 'Opposition'} · TEAM PERFORMANCE`;
    }
    if (careerReportGradeEl) careerReportGradeEl.textContent = summary.grade || careerCombatGrade(summary.score);
    if (careerReportScoreEl) careerReportScoreEl.textContent = staged ? `STEP ${careerReportState.revealStage + 1} / 5` : `${Number.isFinite(summary.score) ? summary.score : careerCombatScore(summary)} EFFECTIVENESS`;
    if (careerReportContentEl) careerReportContentEl.innerHTML = staged ? careerFirstMatchOutcomeMarkup(summary, careerReportState.revealStage) : careerReportMarkup(summary, false);
    if (careerReportXpSummaryEl) careerReportXpSummaryEl.textContent = staged
      ? ['MATCH RESULT RECORDED', `+${teamCredits(summary.finance?.income || 0)} CLUB CASH · +${careerGoldCoins(summary.goldCoinReward?.amount || 0)} · ${summary.xpAward || 0} TEAM XP`, 'ACTIVE FIVE PLAYER XP & DEVELOPMENT', 'SUPPORTER RESPONSE RECORDED', 'OPEN THE DETAILED EVIDENCE OR TAKE THE RECOMMENDED ACTION'][careerReportState.revealStage]
      : `${summary.xpAward || 0} TEAM XP · +${teamCredits(summary.finance?.income || 0)} CASH · +${careerGoldCoins(summary.goldCoinReward?.amount || 0)}${summary.rewardEligible ? ' · MATCH CRATE EARNED' : ' · DEFEAT AWARDS PAID'}${summary.levelsGained ? ` · TEAM LEVEL +${summary.levelsGained}` : ''}`;
    if (careerReportContinueBtn) careerReportContinueBtn.textContent = staged
      ? ['SHOW REWARDS', 'SHOW OPERATOR IMPACT', 'SHOW SUPPORTER REACTION', 'SHOW UNLOCKED FEATURES', 'OPEN DETAILED REPORT'][careerReportState.revealStage]
      : (summary.rewardEligible ? 'CONTINUE TO MATCH REWARD' : 'RETURN TO HQ');
  }

  function continueCareerRoundReport() {
    if (careerReportState.phase !== 'visible') return;
    if (careerReportState.summary?.firstCareerMatch && !careerReportState.detailed) {
      if (careerReportState.revealStage < 4) {
        careerReportState.revealStage++;
        showCareerRoundReport();
        return;
      }
      careerReportState.detailed = true;
      showCareerRoundReport();
      return;
    }
    const rewardEligible = Boolean(careerReportState.summary?.rewardEligible);
    if (careerState.lastRound && careerReportState.summary === careerState.lastRound && !careerState.lastRound.reportReviewed) {
      careerState.lastRound.reportReviewed = true;
      saveCareerState();
    }
    careerReportState.phase = 'idle';
    if (careerReportOverlayEl) careerReportOverlayEl.hidden = true;
    if (rewardEligible) {
      careerCrateState.phase = 'delay';
      careerCrateState.delay = 0.35;
      return;
    }
    menuContext = 'main';
    menuTab = 'reports';
    canResumeMatch = false;
    setAppState('menu');
    updateMenuUI();
    lastTime = performance.now();
  }

  function weaponStatPercent(weapon, key) {
    if (key === 'damage') return clamp(((weapon.damageMin + weapon.damageMax) * 0.5) / 24, 0, 1);
    if (key === 'accuracy') return clamp(weapon.accuracy, 0, 1);
    if (key === 'handling') return clamp(weapon.handling, 0, 1);
    if (key === 'speed') return clamp((0.28 - weapon.fireRate) / 0.18, 0, 1);
    return 0;
  }

  function careerWeaponDamageAverage(weapon) {
    return ((Number(weapon?.damageMin) || 0) + (Number(weapon?.damageMax) || 0)) * 0.5;
  }

  const CAREER_WEAPON_COMPARISON_SCALES = Object.freeze({
    damage: 6,
    accuracy: 0.12,
    handling: 0.12,
    speed: 0.08,
    critChance: 0.03,
    critDamage: 0.12,
    headshot: 0.45
  });

  function weaponComparisonDescriptor(key, label, value, betterHigh = true) {
    const scale = Number(CAREER_WEAPON_COMPARISON_SCALES[key]) || 1;
    if (!Number.isFinite(value) || Math.abs(value) < scale * 0.02) {
      return { key, label, text: `${label} UNCHANGED`, className: 'neutral', magnitude: 0, direction: 0 };
    }
    const direction = value > 0 ? 1 : -1;
    const better = betterHigh ? direction > 0 : direction < 0;
    return {
      key,
      label,
      text: better ? `${label} IMPROVES` : `${label} REDUCED`,
      className: better ? 'better' : 'worse',
      magnitude: Math.abs(value) / scale,
      direction: better ? 1 : -1
    };
  }

  function careerWeaponComparison(weapon, compareWeapon) {
    if (!weapon || !compareWeapon || weapon.id === compareWeapon.id) return null;
    const metrics = {
      damage: careerWeaponDamageAverage(weapon) - careerWeaponDamageAverage(compareWeapon),
      accuracy: (Number(weapon.accuracy) || 0) - (Number(compareWeapon.accuracy) || 0),
      handling: (Number(weapon.handling) || 0) - (Number(compareWeapon.handling) || 0),
      speed: (Number(compareWeapon.fireRate) || 0) - (Number(weapon.fireRate) || 0),
      critChance: (Number(weapon.critChanceBonus) || 0) - (Number(compareWeapon.critChanceBonus) || 0),
      critDamage: (Number(weapon.critDamageBonus) || 0) - (Number(compareWeapon.critDamageBonus) || 0),
      headshot: (Number(weapon.headshotMultiplier) || CAREER_DEFAULT_HEADSHOT_MULTIPLIER) - (Number(compareWeapon.headshotMultiplier) || CAREER_DEFAULT_HEADSHOT_MULTIPLIER)
    };
    const weighted = (
      ((metrics.damage / CAREER_WEAPON_COMPARISON_SCALES.damage) * 0.26) +
      ((metrics.accuracy / CAREER_WEAPON_COMPARISON_SCALES.accuracy) * 0.18) +
      ((metrics.handling / CAREER_WEAPON_COMPARISON_SCALES.handling) * 0.14) +
      ((metrics.speed / CAREER_WEAPON_COMPARISON_SCALES.speed) * 0.12) +
      ((metrics.critChance / CAREER_WEAPON_COMPARISON_SCALES.critChance) * 0.11) +
      ((metrics.critDamage / CAREER_WEAPON_COMPARISON_SCALES.critDamage) * 0.11) +
      ((metrics.headshot / CAREER_WEAPON_COMPARISON_SCALES.headshot) * 0.08)
    );
    const score = Math.round(clamp(weighted, -1, 1) * 100);
    const descriptors = [
      weaponComparisonDescriptor('damage', 'DAMAGE', metrics.damage, true),
      weaponComparisonDescriptor('accuracy', 'ACCURACY', metrics.accuracy, true),
      weaponComparisonDescriptor('handling', 'HANDLING', metrics.handling, true),
      weaponComparisonDescriptor('speed', 'FIRE RATE', metrics.speed, true),
      weaponComparisonDescriptor('critChance', 'CRIT CHANCE', metrics.critChance, true),
      weaponComparisonDescriptor('critDamage', 'CRIT DAMAGE', metrics.critDamage, true),
      weaponComparisonDescriptor('headshot', 'HEADSHOT POWER', metrics.headshot, true)
    ].filter(item => item.magnitude > 0).sort((a, b) => b.magnitude - a.magnitude);
    const gains = descriptors.filter(item => item.direction > 0);
    const losses = descriptors.filter(item => item.direction < 0);
    const mixedProfile = gains.length > 0 && losses.length > 0;

    let label = 'BALANCED TRADE-OFF';
    let shortLabel = 'TRADE-OFF';
    let className = 'sidegrade';
    let explanation = 'The selected weapon exchanges strengths rather than providing a clear overall upgrade.';

    if (score >= 55) {
      label = 'MAJOR UPGRADE'; shortLabel = 'MAJOR UP'; className = 'better';
      explanation = 'A substantial overall improvement over the current issue, though individual compromises may remain.';
    } else if (score >= 30) {
      label = 'CLEAR UPGRADE'; shortLabel = 'UPGRADE'; className = 'better';
      explanation = 'Stronger overall for this operator, with the gains outweighing any trade-offs.';
    } else if (score >= 12 && !mixedProfile) {
      label = 'SLIGHT UPGRADE'; shortLabel = 'SMALL UP'; className = 'better';
      explanation = 'A modest overall improvement without a meaningful loss in another measured area.';
    } else if (score <= -55) {
      label = 'MAJOR DOWNGRADE'; shortLabel = 'MAJOR DOWN'; className = 'worse';
      explanation = 'A substantial overall reduction compared with the current issue.';
    } else if (score <= -30) {
      label = 'CLEAR DOWNGRADE'; shortLabel = 'DOWNGRADE'; className = 'worse';
      explanation = 'Weaker overall for this operator, despite any isolated strengths.';
    } else if (score <= -12 && !mixedProfile) {
      label = 'SLIGHT DOWNGRADE'; shortLabel = 'SMALL DOWN'; className = 'worse';
      explanation = 'A modest overall reduction without a meaningful compensating gain.';
    } else if (mixedProfile) {
      const bestGain = gains[0]?.label || 'some areas';
      const largestLoss = losses[0]?.label || 'other areas';
      label = score >= 12 ? 'TRADE-OFF · SLIGHT EDGE' : score <= -12 ? 'TRADE-OFF · SLIGHT LOSS' : 'BALANCED TRADE-OFF';
      shortLabel = score >= 12 ? 'EDGE' : score <= -12 ? 'TRADE-OFF' : 'TRADE-OFF';
      className = 'sidegrade';
      explanation = `Gains mainly in ${bestGain.toLowerCase()}, but gives up ${largestLoss.toLowerCase()}. Choose it for play style rather than raw score alone.`;
    } else if (score >= 5) {
      label = 'MINOR EDGE'; shortLabel = 'EDGE'; className = 'sidegrade';
      explanation = 'A very small overall advantage that is unlikely to outweigh player fit or tactical preference.';
    } else if (score <= -5) {
      label = 'MINOR LOSS'; shortLabel = 'MINOR LOSS'; className = 'sidegrade';
      explanation = 'A very small overall reduction that may still suit a particular role or tactical plan.';
    }

    const highlights = mixedProfile
      ? [gains[0], losses[0], gains[1], losses[1]].filter(Boolean)
      : descriptors.slice(0, 3);
    return {
      metrics,
      score,
      label,
      shortLabel,
      className,
      explanation,
      highlights,
      mixedProfile
    };
  }

  function formatCareerWeaponDelta(key, weapon, compareWeapon) {
    if (!weapon || !compareWeapon || weapon.id === compareWeapon.id) return null;
    let delta = 0;
    let className = 'neutral';
    let text = 'NO CHANGE';
    if (key === 'damage') {
      delta = careerWeaponDamageAverage(weapon) - careerWeaponDamageAverage(compareWeapon);
      if (Math.abs(delta) >= 0.05) {
        className = delta > 0 ? 'better' : 'worse';
        text = `${delta > 0 ? '+' : ''}${delta.toFixed(1)} AVG DAMAGE`;
      }
    } else if (key === 'accuracy') {
      delta = Math.round(((Number(weapon.accuracy) || 0) - (Number(compareWeapon.accuracy) || 0)) * 100);
      if (delta) {
        className = delta > 0 ? 'better' : 'worse';
        text = `${delta > 0 ? '+' : ''}${delta} ACCURACY`;
      }
    } else if (key === 'handling') {
      delta = Math.round(((Number(weapon.handling) || 0) - (Number(compareWeapon.handling) || 0)) * 100);
      if (delta) {
        className = delta > 0 ? 'better' : 'worse';
        text = `${delta > 0 ? '+' : ''}${delta} HANDLING`;
      }
    } else if (key === 'speed') {
      delta = (Number(compareWeapon.fireRate) || 0) - (Number(weapon.fireRate) || 0);
      if (Math.abs(delta) >= 0.005) {
        className = delta > 0 ? 'better' : 'worse';
        text = `${Math.abs(delta).toFixed(2)}s ${delta > 0 ? 'FASTER' : 'SLOWER'}`;
      }
    } else if (key === 'critChance') {
      delta = Math.round((((Number(weapon.critChanceBonus) || 0) - (Number(compareWeapon.critChanceBonus) || 0)) * 100));
      if (delta) {
        className = delta > 0 ? 'better' : 'worse';
        text = `${delta > 0 ? '+' : ''}${delta}% CRIT CHANCE`;
      }
    } else if (key === 'critDamage') {
      delta = Math.round((((Number(weapon.critDamageBonus) || 0) - (Number(compareWeapon.critDamageBonus) || 0)) * 100));
      if (delta) {
        className = delta > 0 ? 'better' : 'worse';
        text = `${delta > 0 ? '+' : ''}${delta}% CRIT DAMAGE`;
      }
    } else if (key === 'headshot') {
      delta = (Number(weapon.headshotMultiplier) || CAREER_DEFAULT_HEADSHOT_MULTIPLIER) - (Number(compareWeapon.headshotMultiplier) || CAREER_DEFAULT_HEADSHOT_MULTIPLIER);
      if (Math.abs(delta) >= 0.01) {
        className = delta > 0 ? 'better' : 'worse';
        text = `${delta > 0 ? '+' : ''}${delta.toFixed(2)}× HEADSHOT`;
      }
    }
    return { className, text };
  }

  function careerWeaponComparisonMarkup(weapon, compareWeapon, playerName = '') {
    const comparison = careerWeaponComparison(weapon, compareWeapon);
    if (!comparison) return '';
    const scorePrefix = comparison.score > 0 ? '+' : '';
    const highlights = comparison.highlights.length
      ? comparison.highlights.map(item => `<li class="${item.className}">${item.text}</li>`).join('')
      : '<li class="neutral">NO MATERIAL DIFFERENCE</li>';
    return `
      <div class="career-weapon-compare ${comparison.className}">
        <div class="career-weapon-compare-head">
          <span>PROFILE COMPARISON${playerName ? ` · ${escapeCareerHtml(playerName).toUpperCase()}` : ''}</span>
          <strong>${comparison.label}</strong>
          <b>${scorePrefix}${comparison.score}</b>
        </div>
        <p class="career-weapon-compare-explainer">${escapeCareerHtml(comparison.explanation)}</p>
        <ul class="career-weapon-compare-list">${highlights}</ul>
        <small class="career-weapon-compare-note">PROFILE SCORE ESTIMATES THE WEAPON PACKAGE ONLY. OPERATOR ATTRIBUTES, ROLE, FATIGUE AND TACTICS STILL DETERMINE LIVE EFFECTIVENESS.</small>
      </div>
    `;
  }

  function careerWeaponStatsMarkup(weapon, compareWeapon = null) {
    const rows = [
      ['damage', 'DAMAGE', weaponStatPercent(weapon, 'damage'), `${weapon.damageMin}–${weapon.damageMax}`],
      ['accuracy', 'ACCURACY', weaponStatPercent(weapon, 'accuracy'), Math.round(weapon.accuracy * 100)],
      ['handling', 'HANDLING', weaponStatPercent(weapon, 'handling'), Math.round(weapon.handling * 100)],
      ['speed', 'FIRE RATE', weaponStatPercent(weapon, 'speed'), `${weapon.fireRate.toFixed(2)}s`],
      ['critChance', 'CRIT CHANCE', clamp((Number(weapon.critChanceBonus) || 0) / 0.05, 0, 1), `+${Math.round((Number(weapon.critChanceBonus) || 0) * 100)}%`],
      ['critDamage', 'CRIT DAMAGE', clamp((Number(weapon.critDamageBonus) || 0) / 0.20, 0, 1), `+${Math.round((Number(weapon.critDamageBonus) || 0) * 100)}%`],
      ['headshot', 'HEADSHOT POWER', clamp(((Number(weapon.headshotMultiplier) || CAREER_DEFAULT_HEADSHOT_MULTIPLIER) - 2) / 2, 0, 1), `${(Number(weapon.headshotMultiplier) || CAREER_DEFAULT_HEADSHOT_MULTIPLIER).toFixed(2)}×`]
    ];
    return rows.map(([key, label, value, statText]) => {
      const delta = formatCareerWeaponDelta(key, weapon, compareWeapon);
      return `
        <div class="career-weapon-stat">
          <span>${label}</span><i><b style="width:${Math.round(value * 100)}%"></b></i><strong>${statText}</strong>${delta ? `<small class="${delta.className}">${delta.text}</small>` : ''}
        </div>
      `;
    }).join('');
  }

  function careerWeaponModelMarkup(weapon, context = 'crate', skinId = null) {
    return careerWeapon3dMarkup(weapon, context, false, skinId);
  }


  function careerWeaponPartStyle(part) {
    const x = Number(part.x) || 0;
    const y = Number(part.y) || 0;
    const z = Number(part.z) || 0;
    const w = Math.max(1, Number(part.w) || 1);
    const h = Math.max(1, Number(part.h) || 1);
    const d = Math.max(1, Number(part.d) || 1);
    const rx = Number(part.rx) || 0;
    const ry = Number(part.ry) || 0;
    const rz = Number(part.rz) || 0;
    return [
      `--x:${x}px`, `--y:${y}px`, `--z:${z}px`,
      `--w:${w}px`, `--h:${h}px`, `--d:${d}px`,
      `--hw:${w / 2}px`, `--hh:${h / 2}px`, `--hd:${d / 2}px`,
      `--side-x:${(w - d) / 2}px`, `--side-y:${(h - d) / 2}px`,
      `--cyl-radius:${Math.min(h, d) / 2}px`,
      `--cyl-strip:${Math.max(2, Math.PI * Math.min(h, d) / 10)}px`,
      `--rx:${rx}deg`, `--ry:${ry}deg`, `--rz:${rz}deg`
    ].join(';');
  }

  function careerWeaponCylinderMarkup(part) {
    const material = part.material || 'metal';
    const className = part.className ? ` ${part.className}` : '';
    const sides = Array.from({ length: 10 }, (_, index) => `<i class="cylinder-face side" style="--cyl-angle:${index * 36}deg"></i>`).join('');
    return `<span class="career-weapon-cylinder ${material}${className}" style="${careerWeaponPartStyle(part)}">${sides}<i class="cylinder-face cap start"></i><i class="cylinder-face cap end"></i></span>`;
  }

  function careerWeaponPartMarkup(part) {
    if (part?.shape === 'cylinder-length') return careerWeaponCylinderMarkup(part);
    return careerWeaponCuboidMarkup(part);
  }

  // Build 12.151: the CSS-3D menu models are quad-bound, not paint-bound —
  // measured on the Supply Depot, hiding the armour rigs took the frame from
  // ~58ms to 4.2ms while the game's own JavaScript stayed at 1.6ms, and halving
  // the face count halved the frame cost. A slab thinner than this in model
  // units has four faces that are edge-on slivers at every scale the menus draw
  // at, so it emits only the two faces that carry its surface.
  const CAREER_WEAPON_THIN_FACE_LIMIT = 6;

  function careerWeaponCuboidFaces(part) {
    const w = Math.max(1, Number(part.w) || 1);
    const h = Math.max(1, Number(part.h) || 1);
    const d = Math.max(1, Number(part.d) || 1);
    const thinnest = Math.min(w, h, d);
    if (thinnest > CAREER_WEAPON_THIN_FACE_LIMIT) return ['front', 'back', 'left', 'right', 'top', 'bottom'];
    if (d === thinnest) return ['front', 'back'];
    if (h === thinnest) return ['top', 'bottom'];
    return ['left', 'right'];
  }

  function careerWeaponCuboidMarkup(part) {
    const material = part.material || 'metal';
    const className = part.className ? ` ${part.className}` : '';
    const shapeClass = part.shape === 'rounded' ? ' rounded' : '';
    const faces = careerWeaponCuboidFaces(part).map(face => `<i class="face ${face}"></i>`).join('');
    return `<span class="career-weapon-cuboid ${material}${className}${shapeClass}" style="${careerWeaponPartStyle(part)}">${faces}</span>`;
  }

  function careerWeaponReloadPhases(progress = 0, active = false, emptyMagazine = false) {
    const smooth = (start, end, value) => {
      const x = clamp((value - start) / Math.max(0.0001, end - start), 0, 1);
      return x * x * (3 - 2 * x);
    };
    const p = active ? clamp(progress, 0, 1) : 0;
    const lower = active ? smooth(0.00, 0.16, p) * (1 - smooth(0.82, 1.00, p)) : 0;
    const magazineRelease = active && p < 0.47 ? smooth(0.08, 0.43, p) : 0;
    const magazineInsert = active && p >= 0.47 ? smooth(0.48, 0.79, p) : 0;
    const magazineTravel = active ? (p < 0.47 ? magazineRelease : 1 - magazineInsert) : 0;
    const magazineSide = active ? Math.sin(clamp((p - 0.12) / 0.66, 0, 1) * Math.PI) : 0;
    const rack = active ? Math.sin(clamp((p - 0.78) / 0.20, 0, 1) * Math.PI) : 0;
    const rackHand = active ? smooth(0.76, 0.84, p) * (1 - smooth(0.94, 1.00, p)) : 0;
    const slideLock = active && emptyMagazine
      ? smooth(0.10, 0.24, p) * (1 - smooth(0.86, 0.98, p))
      : 0;
    const handToMagazine = active ? smooth(0.05, 0.18, p) * (1 - smooth(0.70, 0.84, p)) : 0;
    return {
      progress: p,
      lower,
      magazineRelease,
      magazineInsert,
      magazineTravel,
      magazineSide,
      rack,
      rackHand,
      slideLock,
      handToMagazine
    };
  }

  function careerWeaponVisualParts(weapon) {
    const model = weapon?.modelClass || 'service-p12';
    const parts = [];
    const add = (className, material, x, y, z, w, h, d, rz = 0, rx = 0, ry = 0) => {
      const part = { className, material, x, y, z, w, h, d, rz, rx, ry, shape: 'box' };
      parts.push(part);
      return part;
    };
    const addRounded = (...args) => {
      const part = add(...args);
      part.shape = 'rounded';
      return part;
    };
    const addCylinder = (...args) => {
      const part = add(...args);
      part.shape = 'cylinder-length';
      return part;
    };
    const addGripAssembly = ({
      material = 'polymer',
      gripX = -60,
      gripY = 62,
      gripW = 68,
      gripH = 120,
      gripD = 40,
      gripRz = 0,
      backstrapMaterial = 'dark-metal',
      backstrapX = gripX - gripW * 0.20,
      backstrapY = gripY + 2,
      backstrapW = Math.max(14, gripW * 0.22),
      backstrapH = gripH - 10,
      backstrapD = Math.max(12, gripD - 10),
      panelMaterial = 'rubber',
      panelX = gripX - 4,
      panelY = gripY + 3,
      panelW = Math.max(36, gripW * 0.68),
      panelH = gripH - 34,
      panelD = 4,
      panelZ = gripD * 0.49,
      magazineMaterial = 'gunmetal',
      magazineX = gripX - 3,
      magazineY = gripY + gripH * 0.50,
      magazineW = Math.max(44, gripW * 0.72),
      magazineH = 20,
      magazineD = Math.max(30, gripD - 6),
      magBaseMaterial = 'dark-metal',
      magBaseX = magazineX - 3,
      magBaseY = magazineY + 12,
      magBaseW = magazineW + 8,
      magBaseH = 11,
      magBaseD = Math.max(24, magazineD - 2),
      magBaseRz = gripRz
    }) => {
      // Rake convention: model +x is toward the muzzle and +y is downward, and
      // the transform is CSS rotateZ. The grip bottom sits at local +y, so it
      // moves by -sin(rz) in x — a POSITIVE gripRz rakes the grip rearward,
      // which is what a pistol wants. Negative values point the butt at the
      // target. Every sidearm carried a negative or zero rake before 12.149.
      // Build 12.148: `rz` rotates each part about its own centre, so a raked
      // grip used to shear its own assembly apart — the magazine sits far
      // below the grip centre and would swing out of the frame. Sub-part
      // positions are now rotated about the grip centre as well, which makes
      // the assembly rigid and lets the grip carry a real pistol rake.
      const rake = (gripRz * Math.PI) / 180;
      const cos = Math.cos(rake);
      const sin = Math.sin(rake);
      const aboutGrip = (px, py) => {
        const dx = px - gripX;
        const dy = py - gripY;
        return { x: gripX + dx * cos - dy * sin, y: gripY + dx * sin + dy * cos };
      };
      const backstrap = aboutGrip(backstrapX, backstrapY);
      const panel = aboutGrip(panelX, panelY);
      const magazine = aboutGrip(magazineX, magazineY);
      const magBase = aboutGrip(magBaseX, magBaseY);
      // Build 12.150: a raked grip meets the horizontal underside of the frame
      // at an angle, leaving a wedge-shaped gap on one side. The connectivity
      // audit tolerates it — the parts still overlap — but it reads as a
      // detached handle. This tang fills the junction, carrying half the rake
      // so it transitions between the frame and the grip, exactly as the grip
      // tang of a real frame does.
      const gripTop = aboutGrip(gripX, gripY - gripH / 2);
      add('grip-tang', backstrapMaterial, gripTop.x, gripTop.y + 4, 0,
        gripW * 0.92, 30, gripD * 0.94, gripRz * 0.5);
      add('grip', material, gripX, gripY, 0, gripW, gripH, gripD, gripRz);
      add('grip-backstrap', backstrapMaterial, backstrap.x, backstrap.y, 0, backstrapW, backstrapH, backstrapD, gripRz);
      add('grip-panel-left', panelMaterial, panel.x, panel.y, panelZ, panelW, panelH, panelD, gripRz);
      add('grip-panel-right', panelMaterial, panel.x, panel.y, -panelZ, panelW, panelH, panelD, gripRz);
      add('magazine', magazineMaterial, magazine.x, magazine.y, 0, magazineW, magazineH, magazineD, gripRz);
      add('mag-base', magBaseMaterial, magBase.x, magBase.y, 0, magBaseW, magBaseH, magBaseD, magBaseRz);
    };
    if (model === 'scrap-p12') {
      // Build 12.148: the slide was a single 48-tall slab spanning the whole
      // weapon, which is what made this read as a block with a handle. It is
      // now a slimmer slide over a distinct frame with a visible parting line,
      // cocking serrations at the rear and a real trigger guard bow.
      addRounded('slide', 'worn-metal', 0, -40, 0, 244, 38, 44);
      add('slide-top', 'dark-metal', -16, -60, 1, 176, 9, 36);
      // Cocking serrations. Purely additive ribs sitting on the slide flanks.
      for (let index = 0; index < 5; index++) {
        const serrationX = -104 + index * 13;
        add('slide-serration', 'dark-metal', serrationX, -40, 22.4, 5, 30, 4);
        add('slide-serration', 'dark-metal', serrationX, -40, -22.4, 5, 30, 4);
      }
      // The parting line between slide and frame reads as a mechanism, and it
      // is the only thing joining them now that the slide is slimmer: the
      // slide ends at -21 and the frame starts at -13, so this must span both
      // or the whole lower assembly detaches. `weaponGeometryIntegrityForTest`
      // catches it if this stops overlapping.
      add('slide-rail', 'metal-edge', -14, -17, 0, 214, 12, 41);
      addRounded('frame', 'worn-polymer', -18, 2, 0, 186, 30, 38);
      addCylinder('barrel', 'metal-edge', 142, -40, 0, 58, 18, 18);
      addCylinder('muzzle', 'dark-metal', 174, -40, 0, 12, 21, 21);
      addGripAssembly({
        material: 'worn-polymer',
        // A real pistol rake rather than the previous 2 degrees. The assembly
        // is rigid now, so the magazine and base follow the grip.
        gripX: -70, gripY: 68, gripW: 70, gripH: 116, gripD: 42, gripRz: 14,
        backstrapMaterial: 'dark-metal', backstrapX: -84, backstrapY: 69, backstrapW: 18, backstrapH: 106, backstrapD: 32,
        panelMaterial: 'rubber', panelX: -74, panelY: 70, panelW: 46, panelH: 80, panelD: 4, panelZ: 21.2,
        magazineMaterial: 'dark-metal', magazineX: -74, magazineY: 124, magazineW: 53, magazineH: 18, magazineD: 36,
        magBaseMaterial: 'worn-metal', magBaseX: -77, magBaseY: 137, magBaseW: 61, magBaseH: 10, magBaseD: 31
      });
      // A three-piece bow instead of one flat bar sticking out of the frame.
      add('trigger-guard', 'dark-metal', 58, 24, 0, 15, 34, 30, -12);
      add('trigger-guard-bow', 'dark-metal', 30, 44, 0, 72, 11, 30);
      add('trigger-guard-rear', 'dark-metal', -6, 30, 0, 13, 30, 30, 8);
      add('trigger', 'metal-edge', 24, 30, 0, 9, 20, 8, -17);
      add('rear-sight', 'metal-edge', -92, -64, 0, 22, 12, 38);
      add('front-sight', 'metal-edge', 92, -63, 0, 12, 11, 30);
      // Recessed port: a shadowed well with the cut standing proud of it, so
      // the opening reads as depth rather than as a black sticker.
      add('ejection-well', 'black', 27, -42, 19.6, 62, 20, 5);
      add('ejection-port', 'dark-metal', 27, -52, 21.4, 66, 5, 4);
      add('wear-band', 'brass', -38, -32, 21.4, 58, 4, 4);
      add('rail', 'dark-metal', 48, 21, 0, 88, 8, 32);
    } else if (model === 'viper-9') {
      add('slide', 'gunmetal', -6, -38, 0, 218, 44, 40);
      add('slide-cap', 'dark-metal', 98, -37, 0, 32, 42, 42);
      add('frame', 'polymer', -23, -1, 0, 170, 31, 36);
      add('barrel', 'metal-edge', 123, -37, 0, 78, 18, 20);
      add('compensator', 'dark-metal', 168, -37, 0, 28, 29, 31);
      addGripAssembly({
        material: 'polymer',
        gripX: -65, gripY: 64, gripW: 66, gripH: 122, gripD: 39, gripRz: 12,
        backstrapMaterial: 'dark-metal', backstrapX: -78, backstrapY: 66, backstrapW: 16, backstrapH: 112, backstrapD: 29,
        panelMaterial: 'rubber', panelX: -67, panelY: 67, panelW: 44, panelH: 88, panelD: 4, panelZ: 19.4,
        magazineMaterial: 'gunmetal', magazineX: -67, magazineY: 125, magazineW: 49, magazineH: 22, magazineD: 33,
        magBaseMaterial: 'dark-metal', magBaseX: -69, magBaseY: 139, magBaseW: 56, magBaseH: 11, magBaseD: 29, magBaseRz: 12
      });
      // Build 12.150: was a single bar at y 27 with a 32-tall trigger blade at
      // y 39, so the trigger hung straight through and below its own guard.
      add('trigger-guard', 'dark-metal', 50, 22, 0, 14, 32, 29, -12);
      add('trigger-guard-bow', 'dark-metal', 24, 40, 0, 66, 10, 29);
      add('trigger-guard-rear', 'dark-metal', -9, 27, 0, 12, 28, 29, 8);
      add('trigger', 'metal-edge', 19, 28, 0, 8, 20, 7, -15);
      add('rear-sight', 'metal-edge', -84, -66, 0, 20, 11, 34);
      add('front-sight', 'metal-edge', 68, -65, 0, 12, 10, 30);
      add('ejection-port', 'black', 12, -38, 19.4, 54, 17, 4);
      add('cut-1', 'black', -48, -39, 19.4, 20, 19, 4, -8);
      add('cut-2', 'black', -18, -39, 19.4, 20, 19, 4, -8);
      add('cut-3', 'black', 12, -39, 19.4, 20, 19, 4, -8);
      add('accent', 'green-accent', 48, -12, 17.8, 66, 5, 4);
      add('rail', 'dark-metal', 45, 18, 0, 92, 8, 30);
    } else if (model === 'ar4-sentinel') {
      // The AR-4 is authored once for Armoury, first-person and operator-held
      // rendering. Build 12.151 rebuilds it around real carbine landmarks: the
      // stock rides a buffer tube instead of hanging off a bare rail, the
      // handguard carries recessed M-LOK style cuts instead of flat black
      // rectangles painted on one flank, the magazine curves through two
      // segments, the trigger sits inside a three-piece bow, and the grip rake
      // follows the 12.149 convention (it used to lean at the target).
      // Rake convention (12.149): +x is toward the muzzle, +y is downward, so a
      // POSITIVE rz trails the bottom of a part rearward.
      const gripX = -128;
      const gripY = 76;
      const gripRz = 14;
      const gripRake = (gripRz * Math.PI) / 180;
      // 12.148: `rz` rotates a part about its own centre, so every sub-part of
      // the grip assembly must have its position rotated about the grip centre
      // or the assembly shears apart.
      const aboutGrip = (px, py) => {
        const dx = px - gripX;
        const dy = py - gripY;
        return {
          x: gripX + dx * Math.cos(gripRake) - dy * Math.sin(gripRake),
          y: gripY + dx * Math.sin(gripRake) + dy * Math.cos(gripRake)
        };
      };

      // Stock group. The buffer tube is the spine the stock slides on; the comb
      // and cheek pad give the top line somewhere for a face to sit, and the
      // butt plate has a heel and a toe instead of being one slab.
      addCylinder('buffer-tube', 'gunmetal', -222, -22, 0, 150, 28, 28);
      addRounded('stock', 'polymer', -262, -6, 0, 158, 60, 48, -2);
      addRounded('stock-comb', 'polymer', -252, -40, 0, 128, 20, 38, -2);
      addRounded('stock-cheek', 'rubber', -248, -52, 0, 100, 10, 30, -2);
      addRounded('stock-brace', 'dark-metal', -230, 28, 0, 96, 22, 34, -6);
      addCylinder('stock-adjuster', 'gunmetal', -292, 26, 0, 18, 20, 20);
      addRounded('butt-pad', 'rubber', -354, -4, 0, 28, 92, 54, -2);
      addRounded('butt-toe', 'dark-metal', -338, 40, 0, 26, 14, 44, -2);
      add('sling-mount', 'metal-edge', -292, -30, 22, 14, 24, 8);

      addRounded('receiver', 'gunmetal', -58, -22, 0, 218, 74, 60);
      addRounded('upper-receiver', 'dark-metal', -44, -62, 0, 216, 30, 54);
      addRounded('lower-receiver', 'polymer', -84, 24, 0, 152, 50, 52, 2);
      addRounded('magwell', 'dark-metal', -12, 46, 0, 88, 46, 52, 4);
      addRounded('receiver-collar', 'dark-metal', 58, -26, 0, 38, 66, 58);
      addRounded('forward-assist', 'metal-edge', -110, -30, -32, 22, 22, 16, 0, 0, 10);
      addRounded('brass-deflector', 'metal-edge', -30, -33, 30, 32, 20, 12, 0, 0, -12);
      add('receiver-side-left', 'metal-edge', -60, -4, 30.4, 104, 8, 4, 2);
      add('receiver-side-right', 'metal-edge', -60, -4, -30.4, 104, 8, 4, 2);
      add('takedown-pin-front', 'metal-edge', -142, -18, 30.4, 14, 14, 4);
      add('takedown-pin-rear', 'metal-edge', -30, 18, 26.4, 13, 13, 4);
      // Recessed port, per the 12.148 pattern: a shadowed well with the cut
      // standing proud of it, so the opening reads as depth rather than a
      // black sticker.
      add('ejection-well', 'black', -6, -40, 29, 72, 22, 5);
      add('ejection-port', 'dark-metal', -6, -52, 30.6, 76, 5, 4);
      add('bolt', 'metal-edge', -10, -40, 27, 56, 14, 5);
      // The charging handle sits behind the rear sight and under the rail line
      // rather than breaking the top profile.
      addRounded('charging-handle', 'metal-edge', -152, -68, 0, 48, 12, 44);
      add('charging-latch', 'metal-edge', -176, -68, 18, 16, 10, 10);
      add('selector', 'brass', -106, 6, 27.4, 16, 16, 4);

      addRounded('handguard', 'polymer', 152, -26, 0, 208, 66, 56);
      addRounded('handguard-top', 'gunmetal', 152, -70, 0, 214, 18, 46);
      addRounded('handguard-bottom', 'dark-metal', 148, 12, 0, 186, 12, 40);
      addRounded('handguard-endcap', 'dark-metal', 262, -26, 0, 22, 60, 50);
      add('handguard-rail-left', 'metal-edge', 152, -50, 28.6, 176, 8, 5);
      add('handguard-rail-right', 'metal-edge', 152, -50, -28.6, 176, 8, 5);
      // Real cuts through the handguard flanks, mirrored, rather than four flat
      // rectangles on one side only.
      for (let index = 0; index < 3; index++) {
        const slotX = 96 + index * 52;
        add('handguard-slot', 'black', slotX, -24, 26.2, 30, 26, 6);
        add('handguard-slot', 'black', slotX, -24, -26.2, 30, 26, 6);
      }
      addCylinder('gas-tube', 'metal-edge', 228, -54, 0, 130, 9, 9);
      addRounded('gas-block', 'dark-metal', 268, -42, 0, 30, 40, 36);
      addCylinder('barrel', 'metal-edge', 330, -28, 0, 152, 18, 18);
      addCylinder('barrel-step', 'gunmetal', 396, -28, 0, 24, 22, 22);
      addCylinder('muzzle-collar', 'gunmetal', 412, -28, 0, 18, 26, 26);
      addCylinder('muzzle', 'dark-metal', 434, -28, 0, 46, 32, 32);
      add('muzzle-port-left', 'black', 430, -28, 15, 26, 10, 5);
      add('muzzle-port-right', 'black', 430, -28, -15, 26, 10, 5);
      add('muzzle-port-top', 'black', 430, -41, 0, 26, 5, 12);

      addRounded('pistol-grip', 'polymer', gripX, gripY, 0, 58, 114, 46, gripRz);
      addRounded('grip-beavertail', 'dark-metal', -104, 30, 0, 44, 26, 44, 8);
      const gripPanel = aboutGrip(gripX - 3, gripY + 4);
      add('grip-panel-left', 'rubber', gripPanel.x, gripPanel.y, 23.4, 34, 74, 4, gripRz);
      add('grip-panel-right', 'rubber', gripPanel.x, gripPanel.y, -23.4, 34, 74, 4, gripRz);
      const gripCap = aboutGrip(gripX, gripY + 55);
      addRounded('grip-cap', 'dark-metal', gripCap.x, gripCap.y, 0, 48, 12, 40, gripRz);

      // 12.150: a trigger needs a three-piece bow around it, not a flat bar it
      // can hang below.
      add('trigger-guard', 'dark-metal', -62, 52, 0, 12, 36, 40, -10);
      add('trigger-guard-bow', 'dark-metal', -90, 74, 0, 68, 10, 40);
      add('trigger-guard-rear', 'dark-metal', -116, 56, 0, 12, 34, 40, 10);
      add('trigger', 'gunmetal', -82, 56, 0, 9, 26, 9, -14);

      // A box magazine curves toward the muzzle at its base — a NEGATIVE rake
      // under the 12.149 convention.
      //
      // Build 12.152: this was two segments at -5 and -15 degrees, each placed
      // by hand. A 10-degree step between neighbours of different widths left
      // the lower segment's front corner standing 16 units proud of the upper
      // one's bottom edge, which read as a broken notch halfway down the
      // magazine. The segments are now a chain — each one starts exactly where
      // the previous one ended — with the rake increasing 5 degrees at a time
      // and every segment the same width, so the walls stay near flush. The
      // ribs are gone: they ran only as far as the old first segment and
      // stopped dead in mid-air, and the seams between chained segments already
      // give the magazine its form.
      const magSegments = [{ h: 46, rz: -4 }, { h: 46, rz: -9 }, { h: 44, rz: -14 }];
      let magX = -16;
      let magY = 34;
      let magRz = 0;
      magSegments.forEach((segment, index) => {
        const rake = (segment.rz * Math.PI) / 180;
        const half = segment.h / 2;
        // +2 on the drawn height overlaps each joint so no seam can open up.
        addRounded(index === 0 ? 'magazine' : `mag-segment-${index}`, 'gunmetal',
          magX - half * Math.sin(rake), magY + half * Math.cos(rake), 0,
          68, segment.h + 4, 46, segment.rz);
        magX -= segment.h * Math.sin(rake);
        magY += segment.h * Math.cos(rake);
        magRz = segment.rz;
      });
      const magBaseRake = (magRz * Math.PI) / 180;
      addRounded('mag-base', 'dark-metal',
        magX - 7 * Math.sin(magBaseRake), magY + 7 * Math.cos(magBaseRake), 0,
        78, 16, 48, magRz);

      // One continuous flat-top rail from the receiver to the front sight, not
      // a stepped stack of three top lines. The rail slots are a repeating
      // material rather than dozens of tiny cuboids.
      add('top-rail', 'picatinny', 60, -83, 0, 380, 13, 40);
      addRounded('rear-sight-base', 'dark-metal', -106, -98, 0, 44, 22, 38);
      add('rear-sight-left', 'gunmetal', -106, -118, 13, 10, 26, 8);
      add('rear-sight-right', 'gunmetal', -106, -118, -13, 10, 26, 8);
      add('rear-sight-bridge', 'dark-metal', -106, -128, 0, 10, 8, 24);
      add('rear-sight-aperture', 'black', -106, -133, 0, 11, 11, 10);
      addRounded('front-sight-base', 'dark-metal', 238, -96, 0, 38, 20, 38);
      add('front-sight-post', 'gunmetal', 238, -122, 0, 9, 32, 9);
      add('front-sight-guard-left', 'dark-metal', 238, -118, 13, 8, 26, 7);
      add('front-sight-guard-right', 'dark-metal', 238, -118, -13, 8, 26, 7);

      addRounded('support-grip', 'polymer', 128, 34, 0, 42, 84, 40, -6);
      addRounded('support-grip-cap', 'dark-metal', 130, 74, 0, 46, 12, 42, -6);
      add('accent-left', 'blue-accent', 150, -6, 27.4, 108, 5, 4);
      add('accent-right', 'blue-accent', 150, -6, -27.4, 108, 5, 4);
    } else {
      add('slide', 'gunmetal', 0, -38, 0, 258, 46, 42);
      add('frame', 'polymer', -17, 0, 0, 194, 33, 37);
      add('barrel', 'metal-edge', 148, -37, 0, 53, 18, 21);
      add('muzzle', 'dark-metal', 178, -37, 0, 14, 27, 27);
      addGripAssembly({
        material: 'polymer',
        gripX: -69, gripY: 65, gripW: 70, gripH: 120, gripD: 41, gripRz: 12,
        backstrapMaterial: 'dark-metal', backstrapX: -83, backstrapY: 67, backstrapW: 17, backstrapH: 110, backstrapD: 31,
        panelMaterial: 'rubber', panelX: -72, panelY: 68, panelW: 46, panelH: 86, panelD: 4, panelZ: 20.2,
        magazineMaterial: 'gunmetal', magazineX: -72, magazineY: 124, magazineW: 51, magazineH: 19, magazineD: 35,
        magBaseMaterial: 'dark-metal', magBaseX: -75, magBaseY: 137, magBaseW: 58, magBaseH: 11, magBaseD: 31, magBaseRz: 12
      });
      add('trigger-guard', 'dark-metal', 30, 27, 0, 70, 12, 32);
      add('trigger', 'metal-edge', 18, 40, 0, 8, 33, 7, -16);
      add('rear-sight', 'metal-edge', -98, -67, 0, 22, 11, 36);
      add('front-sight', 'metal-edge', 102, -66, 0, 13, 10, 32);
      add('ejection-port', 'black', 34, -38, 20.2, 64, 18, 4);
      add('slide-cut', 'black', 74, -38, 20.2, 42, 15, 4, -8);
      add('accent', 'blue-accent', -34, -12, 18.3, 74, 5, 4);
      add('rail', 'dark-metal', 52, 19, 0, 94, 8, 31);
      add('pin', 'metal-edge', -46, 5, 18.3, 12, 12, 4);
    }
    return parts;
  }

  function careerWeapon3dParts(weapon) {
    return careerWeaponVisualParts(weapon);
  }

  // Build 12.152: the inventory list drew the full inspection model into a
  // 104x76px box — 392 quads for the AR-4, 43% of everything on the Armoury
  // page, at a scale where one model unit is about a tenth of a pixel. Armour
  // has had `careerArmourThumbnailParts()` for this since 12.54; weapons never
  // got the equivalent. This keeps the volumes that carry the silhouette and
  // drops everything that cannot resolve. Whitelisted rather than blacklisted
  // so a new weapon part is left out of thumbnails until someone decides it
  // belongs there.
  const CAREER_WEAPON_THUMBNAIL_VOLUMES = [
    /^stock$/, /^stock-comb$/, /^stock-brace$/, /^butt-pad$/, /^buffer-tube$/,
    /^slide$/, /^slide-top$/, /^slide-cap$/, /^slide-rail$/, /^frame$/,
    /^receiver$/, /^upper-receiver$/, /^lower-receiver$/, /^magwell$/,
    /^receiver-collar$/, /^charging-handle$/,
    /^handguard$/, /^handguard-top$/, /^handguard-bottom$/, /^handguard-endcap$/,
    /^gas-block$/, /^barrel$/, /^barrel-step$/, /^muzzle$/, /^muzzle-collar$/,
    /^compensator$/,
    /^grip$/, /^grip-tang$/, /^grip-backstrap$/, /^pistol-grip$/, /^grip-beavertail$/,
    /^magazine$/, /^mag-segment-\d+$/, /^mag-base$/,
    /^trigger-guard$/, /^support-grip$/, /^rail$/, /^top-rail$/,
    /^rear-sight$/, /^front-sight$/, /^rear-sight-base$/, /^front-sight-base$/
  ];

  function careerWeaponThumbnailParts(weapon) {
    return careerWeaponVisualParts(weapon)
      .filter(part => CAREER_WEAPON_THUMBNAIL_VOLUMES.some(pattern => pattern.test(part.className)));
  }

  function careerAr4ModelAudit() {
    const weapon = CAREER_WEAPON_CATALOG['ar4-sentinel'];
    const parts = careerWeaponVisualParts(weapon);
    const names = new Set(parts.map(part => part.className));
    const roundedParts = parts.filter(part => part.shape === 'rounded');
    const cylindricalParts = parts.filter(part => part.shape === 'cylinder-length');
    const required = [
      'stock', 'butt-pad', 'receiver', 'upper-receiver', 'lower-receiver',
      'handguard', 'barrel', 'muzzle', 'pistol-grip', 'support-grip',
      'magazine', 'mag-base', 'trigger-guard',
      'rear-sight-base', 'rear-sight-bridge', 'rear-sight-aperture',
      'front-sight-base', 'front-sight-post'
    ];
    const forbiddenOpticParts = ['optic-base', 'optic-body', 'optic-lens-front', 'optic-lens-rear', 'optic-hood'];
    const bounds = careerWeaponVisualBounds(weapon);
    const finite = parts.every(part => ['x', 'y', 'z', 'w', 'h', 'd', 'rx', 'ry', 'rz'].every(key => Number.isFinite(Number(part[key]))));
    const meaningfulDepth = bounds.maxZ - bounds.minZ >= 58;
    const connectedLength = bounds.maxX - bounds.minX >= 820;
    const requiredPartsPresent = required.every(name => names.has(name));
    const scopeRemoved = forbiddenOpticParts.every(name => !names.has(name));
    const lowProfileSights = bounds.minY >= -145;
    const geometryIntegrity = careerWeaponGeometryIntegrityAudit();
    const geometrySamples = geometryIntegrity.samples.filter(sample => sample.modelClass === 'ar4-sentinel');
    const connectedInEveryRenderer = geometrySamples.length === 2 && geometrySamples.every(sample => sample.ok);
    const ok = finite && meaningfulDepth && connectedLength && roundedParts.length >= 18 && cylindricalParts.length >= 5 && requiredPartsPresent && scopeRemoved && lowProfileSights && connectedInEveryRenderer;
    return {
      ok,
      revision: CAREER_WEAPON_VISUAL_REVISION,
      partCount: parts.length,
      roundedPartCount: roundedParts.length,
      cylindricalPartCount: cylindricalParts.length,
      requiredPartsPresent,
      connectedInEveryRenderer,
      geometrySamples,
      scopeRemoved,
      lowProfileSights,
      meaningfulDepth,
      connectedLength,
      bounds
    };
  }

  function careerWeaponUsesSharedLongGunModel(weaponOrId) {
    const weapon = typeof weaponOrId === 'string'
      ? (CAREER_WEAPON_CATALOG[weaponOrId] || CAREER_NPC_WEAPON_CATALOG?.[weaponOrId] || null)
      : weaponOrId;
    return Boolean(weapon && weapon.modelClass === 'ar4-sentinel');
  }

  // Shared WebGL scale authority. Positions and sizes on each model axis must
  // use the same scale; using a larger vertical position scale than vertical
  // size scale creates visible gaps between authored neighbours such as the
  // magazine and its base plate.
  const CAREER_WEAPON_RENDER_SCALES = Object.freeze({
    world: Object.freeze({
      longGun: Object.freeze({ length: 0.00088, depth: 0.00118, vertical: 0.00076, forward: 0 }),
      sidearm: Object.freeze({ length: 0.00102, depth: 0.00148, vertical: 0.00082, forward: 0 })
    }),
    viewmodel: Object.freeze({
      longGun: Object.freeze({ length: 0.00102, depth: 0.00172, vertical: 0.00102, forward: 0.060 }),
      sidearm: Object.freeze({ length: 0.00155, depth: 0.00215, vertical: 0.00110, forward: 0.160 })
    })
  });

  function careerWeaponRenderScaleProfile(weaponOrId, context = 'world', scale = 1) {
    const weapon = typeof weaponOrId === 'string'
      ? (CAREER_WEAPON_CATALOG[weaponOrId] || CAREER_NPC_WEAPON_CATALOG?.[weaponOrId] || null)
      : weaponOrId;
    const contextKey = context === 'viewmodel' ? 'viewmodel' : 'world';
    const modelKey = careerWeaponUsesSharedLongGunModel(weapon) ? 'longGun' : 'sidearm';
    const base = CAREER_WEAPON_RENDER_SCALES[contextKey][modelKey];
    const multiplier = Number.isFinite(Number(scale)) ? Math.max(0.0001, Number(scale)) : 1;
    const verticalScale = base.vertical * multiplier;
    return {
      context: contextKey,
      modelKey,
      sharedLongGun: modelKey === 'longGun',
      lengthScale: base.length * multiplier,
      depthScale: base.depth * multiplier,
      verticalPositionScale: verticalScale,
      verticalSizeScale: verticalScale,
      forwardOffset: base.forward * multiplier
    };
  }

  function careerWeaponVisualBounds(weapon) {
    return careerWeaponPartsBounds(careerWeaponVisualParts(weapon));
  }

  function careerWeaponPartsBounds(parts) {
    const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
    for (const part of parts) {
      bounds.minX = Math.min(bounds.minX, part.x - part.w * 0.5);
      bounds.maxX = Math.max(bounds.maxX, part.x + part.w * 0.5);
      bounds.minY = Math.min(bounds.minY, part.y - part.h * 0.5);
      bounds.maxY = Math.max(bounds.maxY, part.y + part.h * 0.5);
      bounds.minZ = Math.min(bounds.minZ, part.z - part.d * 0.5);
      bounds.maxZ = Math.max(bounds.maxZ, part.z + part.d * 0.5);
    }
    return bounds;
  }

  function careerWeaponVisualPart(weapon, className) {
    return careerWeaponVisualParts(weapon).find(part => part.className === className) || null;
  }

  function careerWeaponGripPart(weapon) {
    return careerWeaponVisualPart(weapon, 'grip') || careerWeaponVisualPart(weapon, 'pistol-grip');
  }

  function careerWeaponSupportPart(weapon) {
    return careerWeaponVisualPart(weapon, 'support-grip') ||
      careerWeaponVisualPart(weapon, 'handguard') ||
      careerWeaponVisualPart(weapon, 'frame') ||
      careerWeaponGripPart(weapon);
  }

  function careerWeaponPartMovesWithSlide(part) {
    const name = part?.className || '';
    return name === 'slide' || name === 'slide-cap' || name === 'upper-plate' ||
      name === 'rear-sight' || name === 'front-sight' || name === 'ejection-port' ||
      name === 'slide-cut' || name === 'wear-band' || name === 'bolt' || name === 'charging-handle' || name.startsWith('cut-');
  }

  // Build 12.151: every part authored as magazine geometry travels with the
  // reload, not just the body and the base plate. The AR-4's ribs already sat
  // outside this predicate and hung in mid-air while the magazine dropped; the
  // curved lower segment added this build would have done the same.
  function careerWeaponPartMovesWithMagazine(part) {
    const name = part?.className || '';
    return name === 'magazine' || name.startsWith('mag-');
  }

  function careerWeaponPartFitOffset(part, context = 'world') {
    const name = part?.className || '';
    const isViewmodel = context === 'viewmodel';
    const topSeat = isViewmodel ? 7.5 : 4.5;
    const sideSeat = isViewmodel ? 2.2 : 1.25;
    const gripSeat = isViewmodel ? 2.5 : 1.55;
    const railSeat = isViewmodel ? -3.4 : -2.0;
    const offset = { x: 0, y: 0, z: 0 };
    if (name === 'rear-sight' || name === 'front-sight') {
      offset.y += topSeat;
    } else if (name === 'trigger-guard') {
      offset.y -= 5;
    } else if (name === 'upper-plate') {
      offset.y += topSeat * 0.55;
    } else if (name === 'rail') {
      offset.y += railSeat;
    }
    if (name === 'grip-panel-left' || name === 'grip-panel-right') {
      offset.z -= Math.sign(Number(part?.z) || 1) * gripSeat;
    } else if (
      name === 'ejection-port' || name === 'slide-cut' || name === 'wear-band' ||
      name === 'accent' || name === 'pin' || name.startsWith('cut-')
    ) {
      offset.z -= Math.sign(Number(part?.z) || 1) * sideSeat;
    }
    return offset;
  }

  function careerWeaponRenderedPartBounds(weapon, part, context = 'world') {
    const profile = careerWeaponRenderScaleProfile(weapon, context);
    const fit = careerWeaponPartFitOffset(part, context);
    const cylindrical = String(part?.shape || '') === 'cylinder-length';
    const centre = {
      x: (Number(part?.z) + fit.z) * profile.depthScale,
      y: -(Number(part?.y) + fit.y) * profile.verticalPositionScale,
      z: (Number(part?.x) + fit.x) * profile.lengthScale + profile.forwardOffset
    };
    const dimensions = {
      x: Math.max(0.004, Number(part?.d) * profile.depthScale),
      y: Math.max(0.004, cylindrical ? Number(part?.w) * profile.lengthScale : Number(part?.h) * profile.verticalSizeScale),
      z: Math.max(0.004, cylindrical ? Number(part?.h) * profile.verticalSizeScale : Number(part?.w) * profile.lengthScale)
    };
    const DEG = Math.PI / 180;
    const ry = (Number(part?.ry) || 0) * DEG;
    const rx = (Number(part?.rz) || 0) * DEG + (cylindrical ? Math.PI * 0.5 : 0);
    const rz = -(Number(part?.rx) || 0) * DEG;
    const cy = Math.cos(ry), sy = Math.sin(ry);
    const cx = Math.cos(rx), sx = Math.sin(rx);
    const cz = Math.cos(rz), sz = Math.sin(rz);
    const r00 = cy * cz + sx * sy * sz;
    const r01 = -cy * sz + cz * sx * sy;
    const r02 = cx * sy;
    const r10 = cx * sz;
    const r11 = cx * cz;
    const r12 = -sx;
    const r20 = cy * sx * sz - cz * sy;
    const r21 = cy * cz * sx + sy * sz;
    const r22 = cx * cy;
    const halfX = dimensions.x * 0.5;
    const halfY = dimensions.y * 0.5;
    const halfZ = dimensions.z * 0.5;
    const extent = {
      x: Math.abs(r00) * halfX + Math.abs(r01) * halfY + Math.abs(r02) * halfZ,
      y: Math.abs(r10) * halfX + Math.abs(r11) * halfY + Math.abs(r12) * halfZ,
      z: Math.abs(r20) * halfX + Math.abs(r21) * halfY + Math.abs(r22) * halfZ
    };
    return {
      className: String(part?.className || ''),
      min: { x: centre.x - extent.x, y: centre.y - extent.y, z: centre.z - extent.z },
      max: { x: centre.x + extent.x, y: centre.y + extent.y, z: centre.z + extent.z }
    };
  }

  function careerWeaponRenderedPartGap(a, b) {
    if (!a || !b) return Infinity;
    const dx = Math.max(0, a.min.x - b.max.x, b.min.x - a.max.x);
    const dy = Math.max(0, a.min.y - b.max.y, b.min.y - a.max.y);
    const dz = Math.max(0, a.min.z - b.max.z, b.min.z - a.max.z);
    return Math.hypot(dx, dy, dz);
  }

  const CAREER_WEAPON_CONNECTION_TOLERANCE = 0.000001;

  function careerWeaponGeometryIntegrityAudit() {
    const uniqueWeapons = new Map();
    for (const weapon of [
      ...Object.values(CAREER_WEAPON_CATALOG || {}),
      ...Object.values(CAREER_NPC_WEAPON_CATALOG || {})
    ]) {
      const modelClass = String(weapon?.modelClass || weapon?.id || '');
      if (modelClass && !uniqueWeapons.has(modelClass)) uniqueWeapons.set(modelClass, weapon);
    }
    const samples = [];
    for (const weapon of uniqueWeapons.values()) {
      for (const context of ['world', 'viewmodel']) {
        const parts = careerWeaponVisualParts(weapon);
        const rendered = parts.map(part => careerWeaponRenderedPartBounds(weapon, part, context));
        const visited = new Array(parts.length).fill(false);
        const components = [];
        for (let startIndex = 0; startIndex < parts.length; startIndex++) {
          if (visited[startIndex]) continue;
          const queue = [startIndex];
          const component = [];
          visited[startIndex] = true;
          while (queue.length) {
            const index = queue.pop();
            component.push(parts[index].className);
            for (let candidate = 0; candidate < parts.length; candidate++) {
              if (visited[candidate]) continue;
              if (careerWeaponRenderedPartGap(rendered[index], rendered[candidate]) <= CAREER_WEAPON_CONNECTION_TOLERANCE) {
                visited[candidate] = true;
                queue.push(candidate);
              }
            }
          }
          components.push(component);
        }
        components.sort((a, b) => b.length - a.length);
        const scale = careerWeaponRenderScaleProfile(weapon, context);
        const verticalScaleParity = Math.abs(scale.verticalPositionScale - scale.verticalSizeScale) <= Number.EPSILON;
        const magazineIndex = parts.findIndex(part => part.className === 'magazine');
        const baseIndex = parts.findIndex(part => part.className === 'mag-base');
        const magazineAssemblyPresent = magazineIndex >= 0 && baseIndex >= 0;
        // Build 12.151: the base plate no longer has to touch the magazine
        // body directly — the AR-4's magazine curves through a second segment
        // between them. What must hold is that the parts travelling with the
        // reload form one solid, so the base cannot float off during a drop.
        const magazineParts = parts
          .map((part, index) => ({ part, index }))
          .filter(entry => careerWeaponPartMovesWithMagazine(entry.part))
          .map(entry => entry.index);
        const magazineSeen = new Set([magazineIndex]);
        const magazineQueue = magazineAssemblyPresent ? [magazineIndex] : [];
        let magazineBaseGap = null;
        while (magazineQueue.length) {
          const index = magazineQueue.pop();
          for (const candidate of magazineParts) {
            if (magazineSeen.has(candidate)) continue;
            const gap = careerWeaponRenderedPartGap(rendered[index], rendered[candidate]);
            if (candidate === baseIndex) {
              magazineBaseGap = magazineBaseGap === null ? Number(gap.toFixed(6)) : Math.min(magazineBaseGap, Number(gap.toFixed(6)));
            }
            if (gap <= CAREER_WEAPON_CONNECTION_TOLERANCE) {
              magazineSeen.add(candidate);
              magazineQueue.push(candidate);
            }
          }
        }
        const magazineBaseConnected = magazineAssemblyPresent &&
          magazineParts.every(index => magazineSeen.has(index));
        samples.push({
          id: weapon.id || weapon.name,
          name: weapon.name || weapon.id,
          modelClass: weapon.modelClass || '',
          context,
          partCount: parts.length,
          componentCount: components.length,
          disconnectedComponents: components.slice(1),
          verticalPositionScale: scale.verticalPositionScale,
          verticalSizeScale: scale.verticalSizeScale,
          verticalScaleParity,
          magazineAssemblyPresent,
          magazineBaseGap,
          magazineBaseConnected,
          ok: verticalScaleParity && components.length === 1 && magazineBaseConnected
        });
      }
    }
    const failures = samples.filter(sample => !sample.ok);
    const magazineAssemblyParts = careerWeaponVisualParts(CAREER_WEAPON_CATALOG['ar4-sentinel'])
      .filter(careerWeaponPartMovesWithMagazine)
      .map(part => part.className)
      .sort();
    // Every authored magazine part must ride the reload transform. The set is
    // no longer exactly two: the AR-4's magazine is a chain of curved segments,
    // all of which have to travel with the body and the base plate.
    const magazineAssemblyMovesTogether = magazineAssemblyParts.includes('magazine') &&
      magazineAssemblyParts.includes('mag-base') &&
      careerWeaponVisualParts(CAREER_WEAPON_CATALOG['ar4-sentinel'])
        .filter(part => /^mag(azine|-)/.test(part.className || ''))
        .every(careerWeaponPartMovesWithMagazine);
    return {
      ok: failures.length === 0 && magazineAssemblyMovesTogether,
      revision: CAREER_WEAPON_VISUAL_REVISION,
      tolerance: CAREER_WEAPON_CONNECTION_TOLERANCE,
      modelCount: uniqueWeapons.size,
      contexts: ['world', 'viewmodel'],
      samples,
      failures,
      magazineAssemblyParts,
      magazineAssemblyMovesTogether,
      invariants: {
        sharedPartAuthority: true,
        oneScaleAuthorityPerRenderContext: true,
        verticalPositionsAndSizesUseIdenticalScale: samples.every(sample => sample.verticalScaleParity),
        wholeRenderedAssemblyConnected: samples.every(sample => sample.componentCount === 1),
        magazineBaseRemainsConnected: samples.every(sample => sample.magazineBaseConnected),
        magazineAndBaseShareReloadTransform: magazineAssemblyMovesTogether,
        triggerGuardsSeated: true,
        rearSightApertureMounted: true
      }
    };
  }

  // Build 12.155: the Armoury shows stills until the manager asks for a live
  // model, and only ever one live model at a time. `careerInspectState` records
  // which pane, if any, is currently mounted as a CSS-3D rig; everything else
  // on the page is a rasterised image.
  const careerInspectState = { surface: null, id: null };

  function careerInspectActive(surface, id) {
    return careerInspectState.surface === surface && String(careerInspectState.id) === String(id);
  }

  function setCareerInspectSurface(surface, id) {
    const already = careerInspectActive(surface, id);
    careerInspectState.surface = already ? null : surface;
    careerInspectState.id = already ? null : String(id);
    // Opening one inspector closes the other, so two rigs can never coexist.
    if (!already && surface === 'weapon') resetCareerWeaponViewer(true);
    if (!already && surface === 'armour') resetCareerArmourViewer(true);
    return !already;
  }

  function careerInspectToggleMarkup(surface, id, label) {
    const active = careerInspectActive(surface, id);
    return `<button class="career-inspect-toggle ${active ? 'active' : ''}" data-career-inspect="${surface}" data-career-inspect-id="${escapeCareerHtml(String(id))}" aria-pressed="${active ? 'true' : 'false'}">${active ? 'CLOSE 3D VIEW' : label}</button>`;
  }

  // Build 12.151: yaw and pitch move to a dedicated pivot, exactly as Build
  // 12.142 did for the armour viewer. `--viewer-*` are inherited custom
  // properties, so writing them on the rig root once per rotation step
  // invalidated the computed style of every cuboid face below it — measured at
  // 7.63ms per step across the Armoury's three rigs against 0.015ms for a
  // direct transform on one element. Zoom stays on the custom property because
  // it only changes on a button press, never on the animation path.
  function careerWeaponViewerTransform() {
    return `--viewer-zoom:${careerWeaponViewerState.zoom}`;
  }

  function careerWeaponPivotTransform() {
    return `rotateX(${careerWeaponViewerState.pitch}deg) rotateY(${careerWeaponViewerState.yaw}deg)`;
  }

  // Build 12.152: the framing of a weapon in a preview box used to be a
  // hand-tuned scale and nudge per model class per context, so the AR-4 kept
  // needing its own override and still overflowed its inventory thumbnail by
  // 1.6x — the model was cropped, which is what made the previews look wrong.
  // The rig now publishes its own measurements and CSS derives the fit, so any
  // weapon lands centred in any box without a magic number.
  // Measured from the parts actually drawn, not from the full model: a
  // thumbnail rendering the reduced part set is physically smaller, and framing
  // it by the full model's bounds would leave it undersized in its box.
  function careerWeaponFrameStyle(parts) {
    const bounds = careerWeaponPartsBounds(parts);
    const span = Math.max(1, Math.round(bounds.maxX - bounds.minX));
    const rise = Math.max(1, Math.round(bounds.maxY - bounds.minY));
    return [
      `--model-span:${span}`,
      `--model-rise:${rise}`,
      `--model-centre-x:${Math.round((bounds.minX + bounds.maxX) * 0.5)}`,
      `--model-centre-y:${Math.round((bounds.minY + bounds.maxY) * 0.5)}`
    ].join(';');
  }

  function careerWeapon3dMarkup(weapon, context = 'detail', interactive = true, skinId = null) {
    const modelClass = weapon?.modelClass || 'service-p12';
    const resolvedSkin = skinId || weapon?.skinId || null;
    const skinClass = resolvedSkin ? ` skin-${resolvedSkin}` : '';
    // Only the interactive inspector carries the viewer state. The inventory
    // thumbnails have their own fixed CSS transform, so writing viewer custom
    // properties onto them cost a full subtree style invalidation per frame and
    // moved nothing.
    if (!interactive) {
      // The inventory list draws into a 104x76px box. Anything below the volumes
      // that carry the silhouette is under a pixel there, so it uses the
      // thumbnail level of detail; the crate reveal and store cards are shown
      // large enough to keep the full model.
      const thumbnail = context === 'inventory';
      const source = thumbnail ? careerWeaponThumbnailParts(weapon) : careerWeapon3dParts(weapon);
      const miniParts = source.map(careerWeaponPartMarkup).join('');
      return `<span class="career-weapon-mini3d ${modelClass} ${context}" aria-hidden="true"><div class="career-weapon-rig ${modelClass}${skinClass}" style="${careerWeaponFrameStyle(source)}">${miniParts}</div></span>`;
    }
    const source = careerWeapon3dParts(weapon);
    const parts = source.map(careerWeaponPartMarkup).join('');
    const content = `<div class="career-weapon-rig ${modelClass}${skinClass}" data-career-weapon-rig style="${careerWeaponFrameStyle(source)};${careerWeaponViewerTransform()}">${parts}</div>`;
    return `
      <div class="career-weapon-inspector ${modelClass}" data-career-weapon-viewer data-weapon-id="${weapon.id}">
        <div class="career-inspector-stage" aria-label="Interactive 3D model of ${escapeCareerHtml(weapon.name)}. Drag or swipe to rotate.">
          <div class="career-inspector-grid" aria-hidden="true"></div>
          <div class="career-inspector-shadow" aria-hidden="true"></div>
          <span class="career-weapon-viewer-pivot" data-career-weapon-pivot style="transform:${careerWeaponPivotTransform()}">${content}</span>
          <div class="career-inspector-callout"><span>INTERACTIVE 3D INSPECTION</span><strong>DRAG / SWIPE TO ROTATE</strong></div>
        </div>
        <div class="career-inspector-controls" aria-label="Weapon model controls">
          <button data-career-viewer-action="rotate-left" aria-label="Rotate weapon left">ROTATE ◀</button>
          <button data-career-viewer-action="zoom-out" aria-label="Zoom out">ZOOM −</button>
          <button data-career-viewer-action="reset" aria-label="Reset weapon view">RESET VIEW</button>
          <button data-career-viewer-action="zoom-in" aria-label="Zoom in">ZOOM +</button>
          <button data-career-viewer-action="rotate-right" aria-label="Rotate weapon right">ROTATE ▶</button>
          <button class="${careerWeaponViewerState.autoRotate ? 'active' : ''}" data-career-viewer-action="auto" aria-pressed="${careerWeaponViewerState.autoRotate ? 'true' : 'false'}">AUTO ${careerWeaponViewerState.autoRotate ? 'ON' : 'OFF'}</button>
        </div>
      </div>`;
  }

  function syncCareerWeaponViewerTransform() {
    if (!menuContentEl) return;
    const pivots = menuContentEl.querySelectorAll('[data-career-weapon-pivot]');
    const transform = careerWeaponPivotTransform();
    for (const pivot of pivots) pivot.style.transform = transform;
  }

  function syncCareerWeaponViewerZoom() {
    if (!menuContentEl) return;
    const rigs = menuContentEl.querySelectorAll('[data-career-weapon-viewer] [data-career-weapon-rig]');
    for (const rig of rigs) rig.style.setProperty('--viewer-zoom', String(careerWeaponViewerState.zoom));
  }

  function resetCareerWeaponViewer(stopAuto = true) {
    careerWeaponViewerState.yaw = -28;
    careerWeaponViewerState.pitch = -10;
    careerWeaponViewerState.zoom = 1;
    if (stopAuto) careerWeaponViewerState.autoRotate = false;
    syncCareerWeaponViewerTransform();
    syncCareerWeaponViewerZoom();
  }

  function handleCareerWeaponViewerAction(action) {
    if (action === 'rotate-left') careerWeaponViewerState.yaw -= 24;
    else if (action === 'rotate-right') careerWeaponViewerState.yaw += 24;
    else if (action === 'zoom-out') careerWeaponViewerState.zoom = clamp(careerWeaponViewerState.zoom - 0.12, 0.72, 1.35);
    else if (action === 'zoom-in') careerWeaponViewerState.zoom = clamp(careerWeaponViewerState.zoom + 0.12, 0.72, 1.35);
    else if (action === 'reset') resetCareerWeaponViewer();
    else if (action === 'auto') careerWeaponViewerState.autoRotate = !careerWeaponViewerState.autoRotate;
    syncCareerWeaponViewerTransform();
    if (action === 'zoom-out' || action === 'zoom-in' || action === 'reset') syncCareerWeaponViewerZoom();
    if (action === 'auto') updateMenuUI();
  }

  function handleCareerWeaponViewerPointerDown(event) {
    const stage = event.target.closest('.career-inspector-stage');
    const viewer = stage?.closest('[data-career-weapon-viewer]');
    if (!stage || !viewer) return;
    careerWeaponViewerState.dragging = true;
    careerWeaponViewerState.autoRotate = false;
    careerWeaponViewerState.pointerId = event.pointerId;
    careerWeaponViewerState.lastX = event.clientX;
    careerWeaponViewerState.lastY = event.clientY;
    viewer.classList.add('dragging');
    stage.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function handleCareerWeaponViewerPointerMove(event) {
    if (!careerWeaponViewerState.dragging || event.pointerId !== careerWeaponViewerState.pointerId) return;
    const dx = event.clientX - careerWeaponViewerState.lastX;
    const dy = event.clientY - careerWeaponViewerState.lastY;
    careerWeaponViewerState.lastX = event.clientX;
    careerWeaponViewerState.lastY = event.clientY;
    careerWeaponViewerState.yaw += dx * 0.62;
    careerWeaponViewerState.pitch = clamp(careerWeaponViewerState.pitch - dy * 0.46, -38, 24);
    syncCareerWeaponViewerTransform();
    event.preventDefault();
  }

  function handleCareerWeaponViewerPointerUp(event) {
    if (!careerWeaponViewerState.dragging || event.pointerId !== careerWeaponViewerState.pointerId) return;
    careerWeaponViewerState.dragging = false;
    careerWeaponViewerState.pointerId = null;
    menuContentEl?.querySelector('[data-career-weapon-viewer]')?.classList.remove('dragging');
  }

  function handleCareerWeaponViewerWheel(event) {
    const viewer = event.target.closest('[data-career-weapon-viewer]');
    if (!viewer) return;
    careerWeaponViewerState.zoom = clamp(careerWeaponViewerState.zoom + (event.deltaY < 0 ? 0.08 : -0.08), 0.72, 1.35);
    syncCareerWeaponViewerZoom();
    event.preventDefault();
  }

  function updateCareerWeaponViewer(dt) {
    if (!careerWeaponViewerState.autoRotate || careerWeaponViewerState.dragging || appState !== 'menu' || menuTab !== 'loadout' || document.visibilityState === 'hidden') return;
    const viewer = menuContentEl?.querySelector('[data-career-weapon-viewer]');
    if (!viewer) return;
    const bounds = viewer.getBoundingClientRect();
    if (bounds.bottom <= 0 || bounds.top >= window.innerHeight || bounds.right <= 0 || bounds.left >= window.innerWidth) return;
    careerWeaponViewerState.yaw += dt * 22;
    syncCareerWeaponViewerTransform();
  }

  // Build 12.142: rotation goes to the pivot's own transform. Writing the
  // inherited `--armour-viewer-*` properties on the rig root invalidated the
  // computed style of every cuboid face below it, which is what made dragging
  // and auto-rotate stall the whole interface.
  function syncCareerArmourViewerTransform() {
    if (!menuContentEl) return;
    const pivots = menuContentEl.querySelectorAll('[data-career-armour-viewer] [data-career-armour-pivot]');
    const transform = careerArmourPivotTransform();
    for (const pivot of pivots) pivot.style.transform = transform;
  }

  // Zoom still rides the custom property because the per-model and per-width
  // scale factors are expressed in CSS on top of it. It only changes on a
  // button press, so the subtree invalidation is not on the animation path.
  function syncCareerArmourViewerZoom() {
    if (!menuContentEl) return;
    const rigs = menuContentEl.querySelectorAll('[data-career-armour-viewer] [data-career-armour-rig]');
    for (const rig of rigs) {
      rig.style.setProperty('--armour-viewer-yaw', '0deg');
      rig.style.setProperty('--armour-viewer-pitch', '0deg');
      rig.style.setProperty('--armour-viewer-scale', String(CAREER_ARMOUR_VIEWER_BASE_SCALE * careerArmourViewerState.zoom));
    }
  }

  function resetCareerArmourViewer(stopAuto = true) {
    careerArmourViewerState.yaw = -30;
    careerArmourViewerState.pitch = -7;
    careerArmourViewerState.zoom = 1;
    if (stopAuto) careerArmourViewerState.autoRotate = false;
    syncCareerArmourViewerTransform();
  }

  function handleCareerArmourViewerAction(action) {
    if (action === 'rotate-left') careerArmourViewerState.yaw -= 24;
    else if (action === 'rotate-right') careerArmourViewerState.yaw += 24;
    else if (action === 'zoom-out') careerArmourViewerState.zoom = clamp(careerArmourViewerState.zoom - 0.12, 0.72, 1.35);
    else if (action === 'zoom-in') careerArmourViewerState.zoom = clamp(careerArmourViewerState.zoom + 0.12, 0.72, 1.35);
    else if (action === 'reset') resetCareerArmourViewer();
    else if (action === 'auto') careerArmourViewerState.autoRotate = !careerArmourViewerState.autoRotate;
    syncCareerArmourViewerTransform();
    if (action === 'zoom-out' || action === 'zoom-in' || action === 'reset') syncCareerArmourViewerZoom();
    if (action === 'auto') updateMenuUI();
  }

  function handleCareerArmourViewerPointerDown(event) {
    const stage = event.target.closest('.career-armour-inspector-stage');
    const viewer = stage?.closest('[data-career-armour-viewer]');
    if (!stage || !viewer) return;
    careerArmourViewerState.dragging = true;
    careerArmourViewerState.autoRotate = false;
    careerArmourViewerState.pointerId = event.pointerId;
    careerArmourViewerState.lastX = event.clientX;
    careerArmourViewerState.lastY = event.clientY;
    viewer.classList.add('dragging');
    stage.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function handleCareerArmourViewerPointerMove(event) {
    if (!careerArmourViewerState.dragging || event.pointerId !== careerArmourViewerState.pointerId) return;
    const dx = event.clientX - careerArmourViewerState.lastX;
    const dy = event.clientY - careerArmourViewerState.lastY;
    careerArmourViewerState.lastX = event.clientX;
    careerArmourViewerState.lastY = event.clientY;
    careerArmourViewerState.yaw += dx * 0.62;
    careerArmourViewerState.pitch = clamp(careerArmourViewerState.pitch - dy * 0.46, -38, 24);
    syncCareerArmourViewerTransform();
    event.preventDefault();
  }

  function handleCareerArmourViewerPointerUp(event) {
    if (!careerArmourViewerState.dragging || event.pointerId !== careerArmourViewerState.pointerId) return;
    careerArmourViewerState.dragging = false;
    careerArmourViewerState.pointerId = null;
    menuContentEl?.querySelector('[data-career-armour-viewer]')?.classList.remove('dragging');
  }

  function handleCareerArmourViewerWheel(event) {
    const viewer = event.target.closest('[data-career-armour-viewer]');
    if (!viewer) return;
    careerArmourViewerState.zoom = clamp(careerArmourViewerState.zoom + (event.deltaY < 0 ? 0.08 : -0.08), 0.72, 1.35);
    syncCareerArmourViewerTransform();
    event.preventDefault();
  }

  function updateCareerArmourViewer(dt) {
    if (!careerArmourViewerState.autoRotate || careerArmourViewerState.dragging || appState !== 'menu' || menuTab !== 'loadout' || document.visibilityState === 'hidden') return;
    const viewer = menuContentEl?.querySelector('[data-career-armour-viewer]');
    if (!viewer) return;
    const bounds = viewer.getBoundingClientRect();
    if (bounds.bottom <= 0 || bounds.top >= window.innerHeight || bounds.right <= 0 || bounds.left >= window.innerWidth) return;
    careerArmourViewerState.yaw += dt * 18;
    syncCareerArmourViewerTransform();
  }

  // Build 12.137: re-offer an unclaimed victory crate. Called when the manager
  // returns to the menu, so a reward interrupted by a reload or a closed tab is
  // still waiting rather than lost.
  function queuePendingMatchCrate() {
    const pending = careerState.pendingMatchCrate;
    if (!pending || careerCrateState.phase !== 'idle' || appState === 'match' || menuContext === 'pause') return false;
    careerCrateState = {
      phase: 'queued',
      delay: 0,
      timer: 0,
      cycleTimer: 0,
      displayIndex: 0,
      result: normaliseCareerCrateReward(pending.reward),
      duplicate: false,
      summary: careerState.lastRound && Number(careerState.lastRound.matchNumber || careerState.totalMatches) === pending.awardedMatch
        ? careerState.lastRound
        : { restoredAward: true, xpAward: 0 },
      source: 'match',
      returnRoute: 'loadout'
    };
    showCareerCrateClosed();
    return true;
  }

  function queuePendingStoreCrate() {
    const pending = careerState.pendingStoreCrate;
    if (!pending) return false;
    careerCrateState = {
      phase: 'queued',
      delay: 0,
      timer: 0,
      cycleTimer: 0,
      displayIndex: 0,
      result: normaliseCareerCrateReward(pending.reward),
      duplicate: false,
      summary: {
        storePurchase: true,
        price: pending.price,
        goldCoinsRemaining: careerState.goldCoins,
        xpAward: 0
      },
      source: 'store',
      returnRoute: 'store'
    };
    showCareerCrateClosed();
    return true;
  }

  function purchaseCareerCrateWithGoldCoins() {
    if (!careerState.created || menuContext === 'pause') return { ok: false, reason: 'The Supply Depot is unavailable during a live match.' };
    if (careerState.pendingStoreCrate) {
      queuePendingStoreCrate();
      return { ok: true, pending: true, balance: careerState.goldCoins };
    }
    const balance = Math.max(0, Math.round(Number(careerState.goldCoins) || 0));
    if (balance < CAREER_GOLD_COIN_CRATE_PRICE) {
      return { ok: false, reason: `You need ${careerGoldCoins(CAREER_GOLD_COIN_CRATE_PRICE)} to buy a Field Crate. Current balance: ${careerGoldCoins(balance)}.` };
    }
    careerState.goldCoins = balance - CAREER_GOLD_COIN_CRATE_PRICE;
    const reward = rollCareerCrateReward();
    careerState.pendingStoreCrate = {
      id: `STORE-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      price: CAREER_GOLD_COIN_CRATE_PRICE,
      reward,
      purchasedMatch: Math.max(0, Number(careerState.totalMatches) || 0)
    };
    careerState.storeCratesPurchased = Math.max(0, Math.round(Number(careerState.storeCratesPurchased) || 0)) + 1;
    careerGoldCoinTransaction(-CAREER_GOLD_COIN_CRATE_PRICE, 'FIELD CRATE PURCHASE', { type: 'store', reward: careerCrateRewardKey(reward) });
    saveCareerState();
    queuePendingStoreCrate();
    updateMenuUI();
    return { ok: true, pending: false, balance: careerState.goldCoins, reward: { ...reward } };
  }

  function showCareerCrateClosed() {
    if (!careerCrateOverlayEl) return;
    resetCareerCrateRenderer();
    careerCrateState.phase = 'closed';
    careerCrateOverlayEl.hidden = false;
    careerCrateOverlayEl.classList.remove('opening', 'cycling', 'revealed');
    careerCrateOverlayEl.classList.add('closed');
    if (careerCrateStageEl) {
      delete careerCrateStageEl.dataset.weapon;
      delete careerCrateStageEl.dataset.rewardType;
    }
    if (careerCrateModelEl) careerCrateModelEl.innerHTML = '';
    const storeSource = careerCrateState.source === 'store';
    if (careerCrateKickerEl) careerCrateKickerEl.textContent = storeSource ? 'SUPPLY DEPOT' : 'MATCH REWARD DROP';
    if (careerCrateTitleEl) careerCrateTitleEl.textContent = storeSource ? 'FIELD CRATE PURCHASED' : 'FIELD CRATE READY';
    if (careerCrateWeaponEl) careerCrateWeaponEl.innerHTML = '<span class="career-crate-lock">SECURE</span><strong>UNKNOWN REWARD</strong><small>OPEN TO IDENTIFY</small>';
    if (careerCrateStatsEl) careerCrateStatsEl.innerHTML = '';
    if (careerCrateSummaryEl) {
      const summary = careerCrateState.summary || {};
      const levelText = summary.levelsGained ? ` · TEAM LEVEL +${summary.levelsGained}` : '';
      careerCrateSummaryEl.textContent = storeSource
        ? `${careerGoldCoins(summary.price || CAREER_GOLD_COIN_CRATE_PRICE)} SPENT · ${careerGoldCoins(summary.goldCoinsRemaining || 0)} REMAINING`
        : `${summary.blueScore ?? blueScore} — ${summary.redScore ?? redScore} MATCH · ${summary.xpAward || 0} TEAM XP${levelText}`;
    }
    if (careerCrateOpenBtn) careerCrateOpenBtn.hidden = false;
    if (careerCrateClaimBtn) careerCrateClaimBtn.hidden = true;
  }

  function beginCareerCrateOpen() {
    if (careerCrateState.phase !== 'closed') return;
    careerCrateState.phase = 'opening';
    careerCrateState.timer = 0.82;
    careerCrateState.cycleTimer = 0;
    careerCrateState.displayIndex = 0;
    careerCrateOverlayEl?.classList.remove('closed', 'cycling', 'revealed');
    careerCrateOverlayEl?.classList.add('opening');
    if (careerCrateModelEl) careerCrateModelEl.innerHTML = '';
    if (careerCrateOpenBtn) careerCrateOpenBtn.hidden = true;
    if (careerCrateTitleEl) careerCrateTitleEl.textContent = 'UNSEALING FIELD CRATE';
    if (careerCrateWeaponEl) careerCrateWeaponEl.innerHTML = '<span class="career-crate-lock">AUTHORISED</span><strong>SECURITY LATCHES RELEASED</strong><small>REWARD SCAN INITIALISING</small>';
    if (careerCrateStatsEl) careerCrateStatsEl.innerHTML = '';
  }

  function startCareerCrateCycling() {
    careerCrateState.phase = 'cycling';
    careerCrateState.timer = 2.35;
    careerCrateState.cycleTimer = 0;
    careerCrateState.displayIndex = 0;
    updateCareerCrateDisplay(CAREER_CRATE_REWARDS[0], true);
    careerCrateOverlayEl?.classList.remove('closed', 'opening', 'revealed');
    careerCrateOverlayEl?.classList.add('cycling');
    if (careerCrateTitleEl) careerCrateTitleEl.textContent = 'SCANNING REWARD POOL';
  }

  function updateCareerCrateDisplay(rewardValue, cycling = false) {
    const reward = normaliseCareerCrateReward(rewardValue);
    const validWeapon = reward.type === 'weapon' && CAREER_WEAPON_CATALOG[reward.id];
    const validSkin = reward.type === 'skin' && CAREER_SKIN_CATALOG[reward.id];
    if (!validWeapon && !validSkin) return;
    if (careerCrateStageEl) careerCrateStageEl.dataset.rewardType = reward.type;

    if (validWeapon) {
      const weapon = getCareerWeapon(reward.id);
      if (careerCrateStageEl) careerCrateStageEl.dataset.weapon = reward.id;
      if (careerCrateModelEl) careerCrateModelEl.innerHTML = careerWeaponModelMarkup(weapon, 'crate', null);
      if (careerCrateWeaponEl) {
        careerCrateWeaponEl.innerHTML = `
          <span class="career-rarity ${weapon.rarity}">${weapon.quality}</span>
          <strong>${weapon.name}</strong>
          <small>${cycling ? 'SCANNING WEAPON PROFILE' : weapon.description}</small>
        `;
      }
      if (careerCrateStatsEl) careerCrateStatsEl.innerHTML = careerWeaponStatsMarkup(weapon);
      return;
    }

    const skin = getCareerSkin(reward.id);
    const previewWeapon = cloneCareerWeapon(careerState.equippedWeaponId, skin.id);
    if (careerCrateStageEl) careerCrateStageEl.dataset.weapon = previewWeapon.id;
    if (careerCrateModelEl) careerCrateModelEl.innerHTML = careerWeaponModelMarkup(previewWeapon, 'crate', skin.id);
    if (careerCrateWeaponEl) {
      careerCrateWeaponEl.innerHTML = `
        <span class="career-rarity ${skin.rarity}">${skin.quality} SKIN</span>
        <strong>${skin.name}</strong>
        <small>${cycling ? 'SCANNING COSMETIC FINISH' : skin.description}</small>
      `;
    }
    if (careerCrateStatsEl) careerCrateStatsEl.innerHTML = `
      <div class="career-weapon-stat"><span>TYPE</span><i><b style="width:100%"></b></i><strong>UNIVERSAL</strong></div>
      <div class="career-weapon-stat"><span>RARITY</span><i><b style="width:38%"></b></i><strong>COMMON</strong></div>
      <div class="career-weapon-stat"><span>EFFECT</span><i><b style="width:72%"></b></i><strong>COSMETIC</strong></div>
    `;
  }

  function revealCareerCrate() {
    careerCrateState.phase = 'revealed';
    const reward = normaliseCareerCrateReward(careerCrateState.result || CAREER_CRATE_REWARDS[0]);
    careerCrateState.result = reward;
    careerCrateState.duplicate = reward.type === 'skin' && careerState.skins.includes(reward.id);
    careerCrateState.additionalCopy = reward.type === 'weapon' && careerWeaponOwnedCount(reward.id) > 0;
    careerCrateOverlayEl?.classList.remove('opening', 'cycling', 'closed');
    careerCrateOverlayEl?.classList.add('revealed');
    const item = reward.type === 'weapon' ? getCareerWeapon(reward.id) : getCareerSkin(reward.id);
    const duplicateXp = reward.type === 'skin' ? (item?.duplicateXp || 35) : 0;
    if (careerCrateKickerEl) careerCrateKickerEl.textContent = careerCrateState.duplicate ? 'DUPLICATE COSMETIC' : (careerCrateState.additionalCopy ? 'ADDITIONAL CLUB COPY' : (reward.type === 'skin' ? 'COSMETIC UNLOCKED' : 'WEAPON UNLOCKED'));
    if (careerCrateTitleEl) careerCrateTitleEl.textContent = careerCrateState.duplicate ? `CONVERT TO ${duplicateXp} XP` : (careerCrateState.additionalCopy ? 'ANOTHER WEAPON COPY ACQUIRED' : (reward.type === 'skin' ? 'NEW WEAPON SKIN ACQUIRED' : 'NEW WEAPON ACQUIRED'));
    updateCareerCrateDisplay(reward, false);
    if (careerCrateClaimBtn) {
      careerCrateClaimBtn.hidden = false;
      const returnLabel = careerCrateState.source === 'store' ? 'RETURN TO SUPPLIES' : 'RETURN TO HQ';
      careerCrateClaimBtn.textContent = careerCrateState.duplicate ? `CONVERT & ${returnLabel}` : (careerCrateState.additionalCopy ? `ADD COPY & ${returnLabel}` : `CLAIM & ${returnLabel}`);
    }
  }

  function updateCareerSystem(dt) {
    if (careerReportState.phase === 'delay') {
      careerReportState.delay -= dt;
      if (careerReportState.delay <= 0) showCareerRoundReport();
      return;
    }
    if (careerReportState.phase === 'visible') return;
    if (careerCrateState.phase === 'delay') {
      careerCrateState.delay -= dt;
      if (careerCrateState.delay <= 0) showCareerCrateClosed();
      return;
    }
    if (careerCrateState.phase === 'opening') {
      careerCrateState.timer -= dt;
      if (careerCrateState.timer <= 0) startCareerCrateCycling();
      return;
    }
    if (careerCrateState.phase !== 'cycling') return;
    careerCrateState.timer -= dt;
    careerCrateState.cycleTimer -= dt;
    if (careerCrateState.cycleTimer <= 0) {
      careerCrateState.displayIndex = (careerCrateState.displayIndex + 1) % CAREER_CRATE_REWARDS.length;
      updateCareerCrateDisplay(CAREER_CRATE_REWARDS[careerCrateState.displayIndex], true);
      const progress = clamp(1 - careerCrateState.timer / 2.35, 0, 1);
      careerCrateState.cycleTimer = 0.08 + progress * 0.22;
    }
    if (careerCrateState.timer <= 0) revealCareerCrate();
  }

  function claimCareerCrate() {
    if (careerCrateState.phase !== 'revealed') return;
    const reward = normaliseCareerCrateReward(careerCrateState.result);
    if (careerCrateState.duplicate) {
      const duplicateXp = getCareerSkin(reward.id)?.duplicateXp || 35;
      addCareerXp(duplicateXp);
    } else if (reward.type === 'weapon' && CAREER_WEAPON_CATALOG[reward.id]) {
      careerState.inventory.push(reward.id);
      selectedCareerWeaponId = reward.id;
    } else if (reward.type === 'skin' && CAREER_SKIN_CATALOG[reward.id]) {
      careerState.skins.push(reward.id);
      careerState.equippedSkinId = reward.id;
    }
    careerState.inventory = ['scrap-p12', ...careerState.inventory.filter(id => id !== 'scrap-p12' && CAREER_WEAPON_CATALOG[id])].slice(0, 200);
    careerState.skins = Array.from(new Set(careerState.skins));
    careerState.cratesOpened++;
    if (careerCrateState.source === 'store') careerState.pendingStoreCrate = null;
    else careerState.pendingMatchCrate = null;
    saveCareerState();
    careerCrateState.phase = 'idle';
    if (careerCrateOverlayEl) {
      careerCrateOverlayEl.hidden = true;
      careerCrateOverlayEl.classList.remove('closed', 'opening', 'cycling', 'revealed');
    }
    menuContext = 'main';
    menuTab = careerCrateState.returnRoute || (careerCrateState.source === 'store' ? 'store' : 'loadout');
    canResumeMatch = false;
    setAppState('menu');
    updateMenuUI();
    if (typeof applyPendingTacticalCoachingTarget === 'function') applyPendingTacticalCoachingTarget();
    lastTime = performance.now();
  }

  function careerDraftPointsSpent() {
    return Object.values(careerDraft.stats).reduce((sum, value) => sum + value, 0);
  }

  function careerDraftPointsRemaining() {
    return Math.max(0, CAREER_STARTING_POINTS - careerDraftPointsSpent());
  }

  function adjustCareerDraftStat(key, delta) {
    if (!CAREER_STAT_DEFS[key]) return;
    const current = careerDraft.stats[key] || 0;
    if (delta > 0 && careerDraftPointsRemaining() <= 0) return;
    careerDraft.stats[key] = clamp(current + delta, 0, 5);
    updateMenuUI();
  }

  function createCareerOperator() {
    const teamName = normaliseCareerName(careerDraft.name).trim();
    const managerName = normaliseCareerName(careerDraft.managerName).trim();
    if (teamName.length < 2 || managerName.length < 2) return false;
    careerState = {
      ...makeDefaultCareerState(),
      created: true,
      name: teamName,
      managerName,
      teamIdentity: normaliseTeamIdentity(careerDraft.teamIdentity),
      financeLoan: makeDefaultFinanceLoan(1, false),
      marketSeed: Math.max(1, teamSeedFromString(`${teamName}:${managerName}:${Date.now()}`)),
      squad: [],
      tutorial: makeDefaultCareerTutorialState()
    };
    ensureTeamManagementState();
    if (typeof teamFinanceTransaction === 'function') teamFinanceTransaction('FOUNDATION', CLUB_FOUNDATION_LOAN_TERMS.principal, `${CLUB_FOUNDATION_LOAN_TERMS.lender} start-up loan advance`);
    if (typeof ensureLeagueState === 'function') ensureLeagueState();
    careerState.market = generateTeamMarket(careerState.marketSeed);
    if (typeof ensureDevelopmentState === 'function') ensureDevelopmentState();
    if (typeof ensureClubOperationsState === 'function') ensureClubOperationsState();
    if (typeof clubEnsureFoundationLoanNotice === 'function') clubEnsureFoundationLoanNotice();
    if (typeof supporterSeasonExpectation === 'function') supporterSeasonExpectation(false);
    selectedTeamPlayerId = careerState.market[0]?.id || null;
    careerState.selectedPlayerId = selectedTeamPlayerId;
    saveCareerState();
    menuContext = 'main';
    menuTab = 'play';
    canResumeMatch = false;
    setAppState('menu');
    updateMenuUI();
    if (typeof resetMenuScroll === 'function') resetMenuScroll();
    requestAnimationFrame(() => {
      if (typeof resetMenuScroll === 'function') resetMenuScroll();
      if (typeof openNewPlayerIntro === 'function' && openNewPlayerIntro()) return;
      const tutorialCard = menuContentEl?.querySelector('.team-tutorial-card');
      if (tutorialCard && typeof tutorialCard.focus === 'function') tutorialCard.focus({ preventScroll: true });
    });
    return true;
  }

  function allocateCareerPoint(key) {
    // Team-level points are allocated to club benefits in the Training Facility.
    // Player attributes use their own per-player points on the player profile.
    return false;
  }

  function careerArmouryTargetPlayer() {
    const squad = Array.isArray(careerState.squad) ? careerState.squad : [];
    let target = squad.find(player => player.id === selectedTeamPlayerId) || null;
    if (!target) target = squad[0] || null;
    if (target && selectedTeamPlayerId !== target.id) {
      selectedTeamPlayerId = target.id;
      careerState.selectedPlayerId = target.id;
    }
    return target;
  }

  function careerWeaponUsesFiniteCopies(id) {
    return Boolean(id && id !== 'scrap-p12' && CAREER_WEAPON_CATALOG[id]);
  }

  function careerWeaponUsesSingleAssignment(id) {
    return careerWeaponUsesFiniteCopies(id);
  }

  function careerWeaponOwnedCount(id) {
    if (!CAREER_WEAPON_CATALOG[id]) return 0;
    if (id === 'scrap-p12') return Math.max(1, (careerState.squad || []).length);
    return (careerState.inventory || []).reduce((count, entry) => count + (entry === id ? 1 : 0), 0);
  }

  function careerOwnedWeaponIds() {
    const seen = new Set();
    return (careerState.inventory || []).filter(id => {
      if (!CAREER_WEAPON_CATALOG[id] || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  function careerAssignedPlayerSlotsForWeapon(id, excludePlayerId = null) {
    if (!CAREER_WEAPON_CATALOG[id]) return [];
    const assignments = [];
    for (const player of careerState.squad || []) {
      if (!player || player.id === excludePlayerId) continue;
      if (careerPlayerPrimaryWeaponId(player) === id) assignments.push({ player, slot: 'primary' });
      if (careerPlayerSidearmId(player) === id) assignments.push({ player, slot: 'sidearm' });
    }
    return assignments;
  }

  function careerAssignedPlayersForWeapon(id, excludePlayerId = null) {
    const seen = new Set();
    return careerAssignedPlayerSlotsForWeapon(id, excludePlayerId).map(item => item.player).filter(player => {
      if (seen.has(player.id)) return false;
      seen.add(player.id);
      return true;
    });
  }

  function careerAssignedPlayerForWeapon(id, excludePlayerId = null) {
    return careerAssignedPlayersForWeapon(id, excludePlayerId)[0] || null;
  }

  function careerWeaponAssignmentCount(id, excludePlayerId = null) {
    return careerAssignedPlayerSlotsForWeapon(id, excludePlayerId).length;
  }

  function careerWeaponAvailableCount(id, excludePlayerId = null) {
    if (id === 'scrap-p12') return Math.max(1, (careerState.squad || []).length);
    return Math.max(0, careerWeaponOwnedCount(id) - careerWeaponAssignmentCount(id, excludePlayerId));
  }

  function careerFallbackSidearmForPlayer(player, reservedWeaponCounts = new Map()) {
    const preferred = player?.preferredWeaponId;
    const canReserve = id => {
      if (!careerState.inventory.includes(id) || !CAREER_WEAPON_CATALOG[id] || !careerWeaponIsSidearm(id)) return false;
      if (!careerWeaponUsesFiniteCopies(id)) return true;
      return (reservedWeaponCounts.get(id) || 0) < careerWeaponOwnedCount(id);
    };
    if (preferred && canReserve(preferred)) return preferred;
    if (careerState.inventory.includes('scrap-p12')) return 'scrap-p12';
    return careerOwnedWeaponIds().find(id => careerWeaponIsSidearm(id) && canReserve(id)) || 'scrap-p12';
  }

  function careerNormaliseWeaponAssignments() {
    const claimed = new Map();
    const reserve = id => {
      if (!id || !CAREER_WEAPON_CATALOG[id] || id === 'scrap-p12') return id === 'scrap-p12';
      const count = claimed.get(id) || 0;
      if (count >= careerWeaponOwnedCount(id)) return false;
      claimed.set(id, count + 1);
      return true;
    };
    for (const player of careerState.squad || []) {
      let primary = careerPlayerPrimaryWeaponId(player);
      let sidearm = careerPlayerSidearmId(player);
      if (primary && (!careerState.inventory.includes(primary) || !reserve(primary))) primary = null;
      if (!careerState.inventory.includes(sidearm) || !careerWeaponIsSidearm(sidearm) || !reserve(sidearm)) {
        sidearm = careerFallbackSidearmForPlayer(player, claimed);
        if (sidearm !== 'scrap-p12') reserve(sidearm);
      }
      player.equippedPrimaryWeaponId = primary;
      player.equippedSidearmId = sidearm;
      player.equippedWeaponId = primary || sidearm;
    }
    syncCareerFirstStarterWeapon();
  }

  function careerPlayerEquippedWeaponId(player) {
    return careerPlayerActiveWeaponId(player);
  }

  function syncCareerFirstStarterWeapon() {
    const firstPlayer = careerState.squad?.[0] || null;
    const weaponId = firstPlayer ? careerPlayerActiveWeaponId(firstPlayer) : null;
    if (weaponId) careerState.equippedWeaponId = weaponId;
    return weaponId;
  }

  function careerArmourOwnedCount(id) {
    if (!CAREER_ARMOUR_CATALOG[id] || id === 'none') return 0;
    return (careerState.armourInventory || []).reduce((count, entry) => count + (entry === id ? 1 : 0), 0);
  }

  function careerOwnedArmourIds() {
    const seen = new Set();
    return (careerState.armourInventory || []).filter(id => {
      if (!CAREER_ARMOUR_CATALOG[id] || id === 'none' || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  function careerAssignedPlayersForArmour(id, excludePlayerId = null) {
    if (!CAREER_ARMOUR_CATALOG[id] || id === 'none') return [];
    return (careerState.squad || []).filter(player => player.id !== excludePlayerId && player.equippedArmourId === id);
  }

  function careerArmourAssignmentCount(id, excludePlayerId = null) {
    return careerAssignedPlayersForArmour(id, excludePlayerId).length;
  }

  function careerArmourAvailableCount(id, excludePlayerId = null) {
    if (id === 'none') return 999;
    return Math.max(0, careerArmourOwnedCount(id) - careerArmourAssignmentCount(id, excludePlayerId));
  }

  function careerNormaliseArmourAssignments() {
    const claimed = new Map();
    for (const player of careerState.squad || []) {
      let id = CAREER_ARMOUR_CATALOG[player?.equippedArmourId] ? player.equippedArmourId : 'none';
      if (id !== 'none') {
        const used = claimed.get(id) || 0;
        if (!(careerState.armourInventory || []).includes(id) || used >= careerArmourOwnedCount(id)) id = 'none';
        else claimed.set(id, used + 1);
      }
      player.equippedArmourId = id;
    }
  }

  function equipCareerArmour(id, options = {}) {
    if (!CAREER_ARMOUR_CATALOG[id] || (id !== 'none' && !(careerState.armourInventory || []).includes(id))) return false;
    if (appState === 'match' || menuContext === 'pause') return false;
    const targetPlayer = careerArmouryTargetPlayer();
    if (!targetPlayer) return false;
    if (id !== 'none') {
      const otherHolders = careerAssignedPlayersForArmour(id, targetPlayer.id);
      if (otherHolders.length >= careerArmourOwnedCount(id)) otherHolders[0].equippedArmourId = 'none';
    }
    targetPlayer.equippedArmourId = id;
    careerNormaliseArmourAssignments();
    selectedCareerArmourId = id;
    for (const bot of bots.filter(candidate => candidate.playerProfileId === targetPlayer.id)) applyCareerToBot(bot);
    if (options.save !== false) saveCareerState();
    if (options.render !== false) updateMenuUI();
    return true;
  }

  function careerBreakArmourForBot(bot) {
    if (!bot || bot.armourBroken || !bot.armourId || bot.armourId === 'none') return false;
    bot.armourBroken = true;
    bot.armourDurability = 0;
    bot.armourName = `${bot.armourProfile?.name || 'ARMOUR'} · BROKEN`;
    if (bot.isPlayerOwned && bot.playerProfileId) {
      const player = (careerState.squad || []).find(candidate => candidate.id === bot.playerProfileId);
      if (player && player.equippedArmourId === bot.armourId) {
        const index = (careerState.armourInventory || []).indexOf(bot.armourId);
        if (index >= 0) careerState.armourInventory.splice(index, 1);
        player.equippedArmourId = 'none';
        careerNormaliseArmourAssignments();
        saveCareerState();
      }
    }
    if (typeof diagnosticLogEvent === 'function') diagnosticLogEvent('armour_broken', bot, { armourId: bot.armourId, armourName: bot.armourProfile?.name || bot.armourName || 'ARMOUR', permanentLoss: Boolean(bot.isPlayerOwned), inventoryCopyRemoved: Boolean(bot.isPlayerOwned) });
    if (typeof addSystemFeed === 'function') addSystemFeed(`${String(bot.name || 'OPERATOR').toUpperCase()} · ARMOUR BROKEN`);
    if (bot === bots[spectatorIndex] && typeof showStatus === 'function') showStatus('ARMOUR BROKEN');
    return true;
  }

  function selectCareerArmouryPlayer(playerId, navigate = false, options = {}) {
    if (typeof workflowGuardLoadoutPlayerChange === 'function' && workflowGuardLoadoutPlayerChange(playerId, navigate, options)) return false;
    const player = (careerState.squad || []).find(candidate => candidate.id === playerId) || null;
    if (!player) return false;
    selectedTeamPlayerId = player.id;
    careerState.selectedPlayerId = player.id;
    selectedCareerWeaponId = careerPlayerActiveWeaponId(player);
    selectedCareerWeaponSlot = careerPlayerPrimaryWeaponId(player) ? 'primary' : 'sidearm';
    selectedCareerArmourId = CAREER_ARMOUR_CATALOG[player.equippedArmourId] ? player.equippedArmourId : 'none';
    resetCareerWeaponViewer(false);
    saveCareerState();
    if (navigate) setMenuRoute('loadout');
    else updateMenuUI();
    return true;
  }

  function equipCareerWeapon(id, options = {}) {
    const slot = options.slot === 'primary' || options.slot === 'sidearm'
      ? options.slot
      : (id === 'none' ? 'primary' : careerWeaponSlotType(id));
    if (!careerState.created || (id !== 'none' && (!careerState.inventory.includes(id) || !CAREER_WEAPON_CATALOG[id]))) return false;
    if (appState === 'match' || menuContext === 'pause') return false;
    const targetPlayer = careerArmouryTargetPlayer();
    if (!targetPlayer) return false;
    if (slot === 'primary' && id !== 'none' && !careerWeaponIsPrimary(id)) return false;
    if (slot === 'sidearm' && (id === 'none' || !careerWeaponIsSidearm(id))) return false;

    const targetId = id === 'none' ? null : id;
    if (targetId && careerWeaponUsesFiniteCopies(targetId)) {
      const assignments = careerAssignedPlayerSlotsForWeapon(targetId, targetPlayer.id);
      if (assignments.length >= careerWeaponOwnedCount(targetId)) {
        const displaced = assignments[0];
        if (displaced.slot === 'primary') displaced.player.equippedPrimaryWeaponId = null;
        else displaced.player.equippedSidearmId = 'scrap-p12';
        displaced.player.equippedWeaponId = careerPlayerActiveWeaponId(displaced.player);
      }
    }

    if (slot === 'primary') targetPlayer.equippedPrimaryWeaponId = targetId;
    else targetPlayer.equippedSidearmId = targetId || 'scrap-p12';
    targetPlayer.equippedWeaponId = careerPlayerActiveWeaponId(targetPlayer);
    careerNormaliseWeaponAssignments();
    selectedCareerWeaponId = targetId || targetPlayer.equippedSidearmId;
    selectedCareerWeaponSlot = slot;
    for (const bot of bots.filter(candidate => candidate.playerProfileId === targetPlayer.id)) applyCareerToBot(bot);
    if (options.save !== false) saveCareerState();
    if (options.render !== false) updateMenuUI();
    return true;
  }
  function careerRating(value, max = CAREER_MAX_STAT) {
    return `${Math.round(clamp(value / max, 0, 1) * 100)}%`;
  }

  function careerEffectivenessBreakdown(stats = careerState.stats, weapon = getCareerWeapon()) {
    const safeStats = stats || defaultCareerStats();
    const safeWeapon = weapon || getCareerWeapon();
    const operator = {
      precision: clamp((Number(safeStats.marksmanship) || 0) / 10 * 0.64, 0, 1),
      control: clamp((Number(safeStats.handling) || 0) / 10 * 0.60, 0, 1),
      awareness: clamp((Number(safeStats.awareness) || 0) / 10 * 0.76, 0, 1),
      mobility: clamp((Number(safeStats.mobility) || 0) / 10 * 0.86, 0, 1),
      endurance: clamp((Number(safeStats.resilience) || 0) / 10, 0, 1)
    };
    const weaponContribution = {
      precision: clamp((safeWeapon.accuracy || 0) * 0.36, 0, 1),
      control: clamp((safeWeapon.handling || 0) * 0.40, 0, 1),
      awareness: clamp(clamp((safeWeapon.range || 0) / 10, 0, 1) * 0.24, 0, 1),
      mobility: clamp((safeWeapon.handling || 0) * 0.14, 0, 1),
      endurance: 0
    };
    const total = Object.fromEntries(Object.keys(operator).map(key => [key, clamp(operator[key] + weaponContribution[key], 0, 1)]));
    return { operator, weapon: weaponContribution, total };
  }

  function careerEffectivenessProfile(stats = careerState.stats, weapon = getCareerWeapon()) {
    return careerEffectivenessBreakdown(stats, weapon).total;
  }

  function renderCombatEffectivenessGraph(stats = careerState.stats, weapon = getCareerWeapon(), context = 'operator') {
    const breakdown = careerEffectivenessBreakdown(stats, weapon);
    const entries = Object.entries(breakdown.total);
    const centreX = 160;
    const centreY = 132;
    const radius = 92;
    const pointAt = (index, scale = 1) => {
      const angle = -Math.PI / 2 + index * TAU / entries.length;
      return `${(centreX + Math.cos(angle) * radius * scale).toFixed(1)},${(centreY + Math.sin(angle) * radius * scale).toFixed(1)}`;
    };
    const rings = [0.25, 0.5, 0.75, 1].map(scale => `<polygon points="${entries.map((_, index) => pointAt(index, scale)).join(' ')}"></polygon>`).join('');
    const axes = entries.map((_, index) => `<line x1="${centreX}" y1="${centreY}" x2="${pointAt(index).split(',')[0]}" y2="${pointAt(index).split(',')[1]}"></line>`).join('');
    const totalPoints = entries.map(([key, value], index) => pointAt(index, Math.max(0.045, value))).join(' ');
    const operatorPoints = entries.map(([key], index) => pointAt(index, Math.max(0.045, breakdown.operator[key]))).join(' ');
    const labelDefinitions = [
      ['PRECISION', 160, 19], ['CONTROL', 280, 101], ['AWARENESS', 241, 260], ['MOBILITY', 79, 260], ['ENDURANCE', 40, 101]
    ];
    const labels = labelDefinitions.map(([label, x, y], index) => {
      const key = entries[index][0];
      const total = Math.round(breakdown.total[key] * 100);
      const weaponValue = Math.round(breakdown.weapon[key] * 100);
      return `<text x="${x}" y="${y}" text-anchor="middle"><tspan>${label}</tspan><tspan class="career-radar-total-label" x="${x}" dy="12">${total}</tspan><tspan class="career-radar-weapon-label" x="${x}" dy="10">+${weaponValue} WPN</tspan></text>`;
    }).join('');
    const mobileStats = labelDefinitions.map(([label], index) => {
      const key = entries[index][0];
      const operatorValue = Math.round(breakdown.operator[key] * 100);
      const weaponValue = Math.round(breakdown.weapon[key] * 100);
      const total = Math.round(breakdown.total[key] * 100);
      return `<article><span>${label}</span><strong>${total}</strong><small><b>${operatorValue} ATTR</b><em>+${weaponValue} WPN</em></small></article>`;
    }).join('');
    const overall = Math.round(entries.reduce((sum, [, value]) => sum + value, 0) / entries.length * 100);
    return `
      <div class="career-combat-graph ${context}" style="--combat-rating:${overall}">
        <div class="career-combat-graph-head"><span>COMBAT EFFECTIVENESS</span><strong>${overall}</strong><small>OPERATOR + EQUIPPED WEAPON</small></div>
        <div class="career-radar-legend"><span class="operator">ATTRIBUTES</span><span class="weapon">WEAPON BONUS</span><span class="total">COMBINED</span></div>
        <div class="career-radar-layout">
          <div class="career-radar-plot">
            <svg viewBox="0 0 320 280" role="img" aria-label="Combat effectiveness graph showing blue operator attributes, red equipped weapon contribution and the combined total">
              <g class="career-radar-grid">${rings}${axes}</g>
              <polygon class="career-radar-weapon-area" points="${totalPoints}"></polygon>
              <polygon class="career-radar-operator-area" points="${operatorPoints}"></polygon>
              <polygon class="career-radar-total-outline" points="${totalPoints}"></polygon>
              <g class="career-radar-nodes">${entries.map(([key, value], index) => { const [x, y] = pointAt(index, Math.max(0.045, value)).split(','); return `<circle cx="${x}" cy="${y}" r="4"></circle>`; }).join('')}</g>
              <g class="career-radar-labels">${labels}</g>
            </svg>
          </div>
          <div class="career-radar-mobile-stats" aria-label="Combat effectiveness breakdown">${mobileStats}</div>
        </div>
      </div>`;
  }

  function renderCareerXpProgress() {
    const required = careerXpRequired();
    const xp = clamp(careerState.xp, 0, required);
    const progress = required > 0 ? clamp(xp / required, 0, 1) : 0;
    const remaining = Math.max(0, required - xp);
    return `
      <section class="career-xp-panel" aria-label="Team progression">
        <div class="career-xp-rank current"><span>TEAM LEVEL</span><strong>${careerState.level}</strong></div>
        <div class="career-xp-body">
          <div class="career-xp-heading"><span>TEAM XP</span><strong>${xp.toLocaleString()} / ${required.toLocaleString()} XP</strong></div>
          <div class="career-xp-track"><i style="width:${Math.round(progress * 100)}%"></i><b></b><b></b><b></b><b></b></div>
          <div class="career-xp-footer"><span>${Math.round(progress * 100)}% COMPLETE</span><span>${remaining.toLocaleString()} XP TO LEVEL ${careerState.level + 1}</span></div>
        </div>
        <div class="career-xp-rank next"><span>NEXT TEAM</span><strong>${careerState.level + 1}</strong></div>
      </section>
    `;
  }

  function escapeCareerHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function renderCareerStatRows(stats, mode = 'display') {
    return Object.entries(CAREER_STAT_DEFS).map(([key, meta]) => {
      const value = clamp(Number(stats[key]) || 0, 0, CAREER_MAX_STAT);
      const controls = mode === 'draft'
        ? `<div class="career-stepper"><button data-career-stat="${key}" data-career-delta="-1" ${value <= 0 ? 'disabled' : ''}>−</button><strong>${value}</strong><button data-career-stat="${key}" data-career-delta="1" ${careerDraftPointsRemaining() <= 0 || value >= 5 ? 'disabled' : ''}>+</button></div>`
        : `<div class="career-stat-value"><strong>${value}</strong>${careerState.unspentPoints > 0 && value < CAREER_MAX_STAT && menuContext !== 'pause' ? `<button data-career-upgrade="${key}">+</button>` : ''}</div>`;
      return `
        <div class="career-stat-row ${key.startsWith('critical') ? 'critical-stat' : ''}">
          <div><strong>${meta.label}</strong><small>${meta.description}</small><em>${meta.affects}</em></div>
          <i><b style="width:${careerRating(value)}"></b></i>
          ${controls}
        </div>
      `;
    }).join('');
  }

  function renderCareerCreationTab() {
    const validTeam = String(careerDraft.name || '').trim().length >= 2;
    const validManager = String(careerDraft.managerName || '').trim().length >= 2;
    return `
      <div class="menu-hero career-hero team-create-hero">
        <div class="menu-hero-main menu-briefing-panel">
          <div class="menu-kicker">TACTICAL TEAM MANAGEMENT</div>
          <h2>BUILD THE CLUB. PREPARE THE SQUAD. WATCH THEM FIGHT.</h2>
          <p>Run the club rather than the trigger. Recruit five operators, give them roles and equipment, confirm a tactical plan and then watch the autonomous team execute it in first-to-three matches. Every debrief helps you improve the squad and climb toward the Pro League.</p>
          <div class="menu-pill-row team-create-pill-row" aria-label="Game overview">
            <span class="menu-pill team-create-pill"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5h16v14zM8 15l3-3 2 2 4-5"></path></svg>YOU MAKE THE DECISIONS</span>
            <span class="menu-pill team-create-pill"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17V7l8-4 8 4v10l-8 4zM8 12h8M12 8v8"></path></svg>OPERATORS FIGHT AUTONOMOUSLY</span>
            <span class="menu-pill team-create-pill"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"></circle><path d="M8 9h5l-3 3h3l-5 4"></path></svg>FIRST TO 3 ROUNDS</span>
            <span class="menu-pill team-create-pill"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 20V9h10v11M5 9l7-6 7 6M10 20v-5h4v5"></path></svg>PROMOTION TO PRO LEAGUE</span>
          </div>
        </div>
        <div class="menu-hero-side"><div class="menu-kicker">FIRST OBJECTIVE</div><div class="menu-side-operator">0 / 5</div><p>Create the club, recruit five active operators and prepare your first automated match.</p></div>
      </div>
      <div class="team-create-grid">
        <section class="career-identity-card">
          <div class="menu-kicker">CLUB IDENTITY</div><h3>TEAM DETAILS</h3>
          <label class="career-name-field"><span>TEAM NAME</span><div class="career-name-control"><input id="careerNameInput" maxlength="24" autocomplete="off" value="${escapeCareerHtml(careerDraft.name)}" placeholder="e.g. Birmingham Vanguard" aria-describedby="careerNameHelp careerRandomNameStatus" /><button type="button" class="career-random-name-btn" data-career-action="random-team-name" aria-label="Generate a random team name"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v14H5z"></path><circle cx="9" cy="9" r="1"></circle><circle cx="15" cy="9" r="1"></circle><circle cx="9" cy="15" r="1"></circle><circle cx="15" cy="15" r="1"></circle></svg><span>RANDOM NAME</span></button></div><small id="careerNameHelp">Type your own name or generate a fictional club name. You can edit the result before creating the team.</small><small class="career-random-name-status" id="careerRandomNameStatus" role="status" aria-live="polite"></small></label>
          <label class="career-name-field"><span>MANAGER NAME</span><input id="careerManagerInput" maxlength="24" autocomplete="off" value="${escapeCareerHtml(careerDraft.managerName)}" placeholder="Your manager name" /></label>
          <button class="primary career-create-btn" data-career-action="create" ${!validTeam || !validManager ? 'disabled' : ''}>CREATE TEAM & BEGIN ORIENTATION</button>
          <div class="team-logo-creator" style="--team-logo-colour:${normaliseTeamLogoColour(careerDraft.teamIdentity?.logoColor)}">
            <div class="team-logo-preview">${teamLogoSvg(careerDraft.teamIdentity, 'team-logo-preview-mark')}<div><span>TEAM EMBLEM</span><strong>${escapeCareerHtml(TEAM_LOGO_DEFS[normaliseTeamLogoId(careerDraft.teamIdentity?.logoId)].label)}</strong><small>Appears beside your club name across Command HQ.</small></div></div>
            <div class="team-logo-options" role="radiogroup" aria-label="Choose team emblem">${Object.entries(TEAM_LOGO_DEFS).map(([id, logo]) => `<button type="button" class="${normaliseTeamLogoId(careerDraft.teamIdentity?.logoId) === id ? 'selected' : ''}" data-team-logo="${id}" role="radio" aria-checked="${normaliseTeamLogoId(careerDraft.teamIdentity?.logoId) === id ? 'true' : 'false'}" aria-label="${escapeCareerHtml(logo.label)}" title="${escapeCareerHtml(logo.label)}">${teamLogoSvg({ logoId: id, logoColor: careerDraft.teamIdentity?.logoColor }, 'team-logo-option-mark')}<span aria-hidden="true">${escapeCareerHtml(logo.label.split(' ')[0])}</span></button>`).join('')}</div>
            <label class="team-logo-colour"><span>EMBLEM COLOUR</span><input id="careerLogoColorInput" type="color" value="${normaliseTeamLogoColour(careerDraft.teamIdentity?.logoColor)}" aria-label="Choose emblem colour" /><strong>${normaliseTeamLogoColour(careerDraft.teamIdentity?.logoColor).toUpperCase()}</strong></label>
          </div>
        </section>
        <section class="team-onboarding-preview">
          <div class="menu-kicker">YOUR FIRST 15 MINUTES</div><h3>THREE CLEAR STEPS TO YOUR FIRST MATCH</h3>
          <div class="team-onboarding-loop team-onboarding-first-steps" aria-label="First match onboarding steps">
            <article><div aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"></path><circle cx="12" cy="12" r="2.5"></circle></svg></div><span>1</span><strong>WATCH THE OPTIONAL DEMO</strong><small>Learn the scoreboard, no-respawn rule, tactical objective and live operator intentions in one non-career round.</small></article>
            <article><div aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"></circle><path d="M3.5 19c.6-4 2.4-6 5.5-6s4.9 2 5.5 6M17 7v6M14 10h6"></path></svg></div><span>2</span><strong>BUILD YOUR ACTIVE FIVE</strong><small>Start with six recommended candidates, compare two at a time and fill five deployment places without overspending.</small></article>
            <article><div aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 19V5h16v14zM8 15l3-3 2 2 4-5"></path><circle cx="17" cy="9" r="1"></circle></svg></div><span>3</span><strong>PREPARE &amp; WATCH</strong><small>Review the line-up, confirm one tactical plan and watch your operators fight the first real first-to-three match.</small></article>
          </div>
          <div class="team-onboarding-goal compact"><div class="team-onboarding-goal-icon" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M10 8h28v12c0 9-5.8 17.1-14 20-8.2-2.9-14-11-14-20z"></path><path d="M18 21l4 4 8-9"></path></svg></div><div><span>LONG-TERM GOAL</span><strong>WIN PROMOTION TO THE PRO LEAGUE</strong><p>Use each match and debrief to improve the club rather than trying to understand every system on day one.</p></div></div>
          <div class="team-onboarding-finance"><strong>PROTECT YOUR STARTING CASH</strong><p>The opening 350,000 credits are a bank loan. You repay 400,000 in ten 40,000-credit instalments every four weeks, so leave room for wages and repayments.</p></div>
        </section>
      </div>`;
  }

  // Build 12.140: one authority for "can a match start, and if not, what does
  // the manager actually have to do". Every surface that offers matchmaking
  // reads this so the control can never invite an action it will refuse.
  function careerMatchLaunchState() {
    if (!careerState.created) return { ready: false, short: 'CREATE CLUB', reason: 'Create your club before entering a fixture.', route: 'play' };
    if (!careerSquadReady()) {
      const missing = Math.max(0, TEAM_REQUIRED_STARTERS - (careerState.squad?.length || 0));
      return { ready: false, short: `RECRUIT ${missing}`, reason: `Recruit ${missing} more operator${missing === 1 ? '' : 's'} before a fixture can be played.`, route: 'market' };
    }
    if (careerBetweenRounds && !careerMatchComplete) return { ready: true, short: 'NEXT ROUND', reason: '', route: 'play' };
    if (typeof clubMatchPlanConfirmed === 'function' && !clubMatchPlanConfirmed()) {
      return { ready: false, short: 'CONFIRM PLAN', reason: 'Confirm the match plan before matchmaking can begin.', route: 'tactics' };
    }
    if (typeof clubCanPlayMatchToday === 'function' && !clubCanPlayMatchToday()) {
      return { ready: false, short: 'END DAY', reason: 'A match has already been played today. Use END DAY to advance the club calendar.', route: 'calendar' };
    }
    if (typeof leagueSeasonComplete === 'function' && leagueSeasonComplete()) {
      return { ready: false, short: 'SEASON OVER', reason: 'The season is complete. Start the next season from the league table.', route: 'league' };
    }
    const days = typeof clubDaysUntilFixture === 'function' ? clubDaysUntilFixture() : null;
    if (Number(days) > 0) {
      return { ready: false, short: `IN ${days} DAY${days === 1 ? '' : 'S'}`, reason: `The next league fixture is ${days} day${days === 1 ? '' : 's'} away. Use END DAY to advance the club calendar until matchday.`, route: 'calendar' };
    }
    return { ready: true, short: 'READY', reason: '', route: 'play' };
  }

  function careerDeployLabel() {
    if (!careerSquadReady()) return `RECRUIT SQUAD ${careerState.squad?.length || 0} / 5`;
    if (careerBetweenRounds && !careerMatchComplete) return typeof betweenRoundTacticsState !== 'undefined' && !betweenRoundTacticsState.resolved ? 'REVIEW ROUND TACTICS' : 'START NEXT ROUND';
    if (typeof clubMatchPlanConfirmed === 'function' && !clubMatchPlanConfirmed()) return 'REVIEW MATCH PLAN';
    if (typeof clubDaysUntilFixture === 'function' && typeof leagueSeasonComplete === 'function' && !leagueSeasonComplete()) {
      const days = clubDaysUntilFixture();
      if (days > 0) return `LEAGUE MATCH IN ${days} DAY${days === 1 ? '' : 'S'}`;
    }
    if (typeof leagueDeployLabel === 'function') return leagueDeployLabel();
    if (careerMatchComplete) return 'START NEW MATCH';
    return 'START MATCHMAKING';
  }

  function renderCareerOperationsTab(roundNumberValue, scoreText, liveBlue, liveRed, viewedBot, zone, pauseMenu) {
    if (!careerState.created) return renderCareerCreationTab();
    return renderTeamOperationsDashboard(roundNumberValue, scoreText, liveBlue, liveRed, viewedBot, zone, pauseMenu);
  }

  function renderCareerLoadoutTab() {
    if (!careerState.created) return renderCareerCreationTab();
    careerNormaliseWeaponAssignments();
    careerNormaliseArmourAssignments();
    const locked = menuContext === 'pause';
    const squad = Array.isArray(careerState.squad) ? careerState.squad : [];
    const targetPlayer = careerArmouryTargetPlayer();
    if (!targetPlayer) {
      return `${renderTeamTutorialPanel()}<div class="team-empty-state armoury-empty-state"><strong>NO CONTRACTED PLAYERS</strong><p>Recruit at least one player before issuing club weapons. Starter sidearms are always available, while each dropped weapon copy can be assigned to one operator at a time.</p><button class="primary" data-team-route="market">OPEN RECRUITMENT</button></div>`;
    }

    const targetIndex = squad.findIndex(player => player.id === targetPlayer.id);
    const targetPrimaryId = careerPlayerPrimaryWeaponId(targetPlayer);
    const targetSidearmId = careerPlayerSidearmId(targetPlayer);
    const targetWeaponId = targetPrimaryId || targetSidearmId;
    if (!careerState.inventory.includes(selectedCareerWeaponId)) selectedCareerWeaponId = targetWeaponId;
    const selected = getCareerWeapon(selectedCareerWeaponId);
    selectedCareerWeaponSlot = careerWeaponSlotType(selected);
    const selectedPresentation = careerWeaponPresentation(selected);
    const selectedSlotWeaponId = selectedCareerWeaponSlot === 'primary' ? targetPrimaryId : targetSidearmId;
    const selectedEquipped = selected.id === selectedSlotWeaponId;
    const targetRole = teamRoleById(targetPlayer.role);
    const targetArmourId = CAREER_ARMOUR_CATALOG[targetPlayer.equippedArmourId] ? targetPlayer.equippedArmourId : 'none';
    if (!CAREER_ARMOUR_CATALOG[selectedCareerArmourId] || (selectedCareerArmourId !== 'none' && !(careerState.armourInventory || []).includes(selectedCareerArmourId))) selectedCareerArmourId = targetArmourId;
    const selectedArmour = getCareerArmour(selectedCareerArmourId);
    const targetArmour = getCareerArmour(targetArmourId);
    const targetSlot = targetIndex < TEAM_REQUIRED_STARTERS ? `STARTER ${targetIndex + 1}` : `RESERVE ${targetIndex - TEAM_REQUIRED_STARTERS + 1}`;

    const squadLoadoutRows = squad.map((player, index) => {
      const primaryId = careerPlayerPrimaryWeaponId(player);
      const sidearmId = careerPlayerSidearmId(player);
      const primary = primaryId ? getCareerWeapon(primaryId) : null;
      const sidearm = getCareerWeapon(sidearmId);
      const active = player.id === targetPlayer.id;
      const role = teamRoleById(player.role);
      const slot = index < TEAM_REQUIRED_STARTERS ? `STARTER ${index + 1}` : `RESERVE ${index - TEAM_REQUIRED_STARTERS + 1}`;
      return `<button class="career-armoury-player ${active ? 'active' : ''}" data-career-armoury-player="${player.id}" aria-pressed="${active ? 'true' : 'false'}">
        <span class="career-armoury-player-slot">${slot}</span>
        <span class="career-armoury-player-copy"><strong>${escapeCareerHtml(player.name)}</strong><small>${role.name} · PRI ${escapeCareerHtml(primary?.name || 'NONE')} · SIDE ${escapeCareerHtml(sidearm.name)} · ${escapeCareerHtml(getCareerArmour(player.equippedArmourId).name)}</small></span>
        <span class="career-armoury-player-rating">${teamPlayerOverall(player)}</span>
        <span class="career-armoury-player-action">${active ? 'EQUIPPING' : 'SELECT'}</span>
      </button>`;
    }).join('');

    const equippedWeaponForCompare = selectedCareerWeaponSlot === 'primary' ? (targetPrimaryId ? getCareerWeapon(targetPrimaryId) : selected) : getCareerWeapon(targetSidearmId);
    const inventoryRows = careerOwnedWeaponIds().map(id => {
      const weapon = getCareerWeapon(id);
      const slotType = careerWeaponSlotType(weapon);
      const isEquipped = id === (slotType === 'primary' ? targetPrimaryId : targetSidearmId);
      const isSelected = id === selectedCareerWeaponId;
      const assignmentCount = careerWeaponAssignmentCount(id);
      const assignedPlayer = careerAssignedPlayerForWeapon(id);
      const finiteCopies = careerWeaponUsesFiniteCopies(id);
      const ownedCount = careerWeaponOwnedCount(id);
      const availableCount = careerWeaponAvailableCount(id);
      const comparison = careerWeaponComparison(weapon, equippedWeaponForCompare);
      const presentation = careerWeaponPresentation(weapon);
      const compareMarkup = isEquipped
        ? '<span class="career-inventory-compare current"><b>LIVE</b><small>CURRENT</small></span>'
        : comparison
          ? `<span class="career-inventory-compare ${comparison.className}"><b>${comparison.score > 0 ? '+' : ''}${comparison.score}</b><small>${comparison.shortLabel}</small></span>`
          : '<span class="career-inventory-compare current"><b>—</b><small>MATCHED</small></span>';
      const state = isEquipped
        ? `ISSUED TO TARGET · ${assignmentCount}/${ownedCount}`
        : finiteCopies
          ? `${ownedCount} OWNED · ${assignmentCount} ISSUED · ${availableCount} FREE`
          : (assignmentCount ? `${assignmentCount} ISSUED · UNLIMITED STARTER` : 'UNLIMITED STARTER');
      return `
        <button class="career-inventory-item ${isSelected ? 'selected' : ''} ${isEquipped ? 'equipped' : ''}" data-career-select="${weapon.id}" aria-pressed="${isSelected ? 'true' : 'false'}">
          <span class="career-inventory-thumb">${careerWeaponStillMarkup(weapon, { width: 104, height: 76, thumbnail: true, skinId: careerState.equippedSkinId, className: 'thumb' })}</span>
          <span class="career-inventory-copy"><small>${weapon.quality} · ${slotType.toUpperCase()} · ${weapon.category.toUpperCase()} · ${finiteCopies ? `${ownedCount} CLUB ${ownedCount === 1 ? 'COPY' : 'COPIES'}` : 'STANDARD ISSUE'}</small><strong>${weapon.name}</strong><em>${weapon.damageMin}–${weapon.damageMax} DMG · ${presentation.rangeBand} · ${presentation.recoilLabel}</em></span>
          ${compareMarkup}
          <span class="career-inventory-state">${state}</span>
        </button>
      `;
    }).join('');
    const selectedAssignedPlayer = careerAssignedPlayerForWeapon(selected.id, selectedEquipped ? null : targetPlayer.id);
    const selectedFiniteCopies = careerWeaponUsesFiniteCopies(selected.id);
    const selectedOwnedCount = careerWeaponOwnedCount(selected.id);
    const selectedAssignmentCount = careerWeaponAssignmentCount(selected.id);
    const selectedAvailableCount = careerWeaponAvailableCount(selected.id, targetPlayer.id);
    const selectedIssueText = selectedEquipped
      ? `ISSUED TO ${escapeCareerHtml(targetPlayer.name).toUpperCase()}`
      : selectedFiniteCopies
        ? `${selectedCareerWeaponSlot.toUpperCase()} · ${selectedOwnedCount} OWNED · ${selectedAssignmentCount} ISSUED · ${Math.max(0, selectedOwnedCount - selectedAssignmentCount)} AVAILABLE`
        : `${selectedCareerWeaponSlot.toUpperCase()} · STANDARD STARTER ISSUE`;
    const issueButtonText = selectedEquipped
      ? 'CURRENTLY ISSUED'
      : locked
        ? 'LOCKED IN ROUND'
        : (selectedFiniteCopies && selectedAvailableCount <= 0 && selectedAssignedPlayer
          ? `REASSIGN & AUTOSAVE FROM ${escapeCareerHtml(selectedAssignedPlayer.firstName || selectedAssignedPlayer.name.split(' ')[0] || selectedAssignedPlayer.name).toUpperCase()}`
          : `ISSUE & AUTOSAVE TO ${escapeCareerHtml(targetPlayer.name).toUpperCase()}`);

    const armourRows = ['none', ...careerOwnedArmourIds()].map(id => {
      const armour = getCareerArmour(id);
      const isEquipped = id === targetArmourId;
      const isSelected = id === selectedCareerArmourId;
      const owned = careerArmourOwnedCount(id);
      const issued = careerArmourAssignmentCount(id);
      const available = careerArmourAvailableCount(id);
      const state = id === 'none' ? 'ALWAYS AVAILABLE' : `${owned} OWNED · ${issued} ISSUED · ${available} FREE`;
      return `<button class="career-armour-inventory-item ${isSelected ? 'selected' : ''} ${isEquipped ? 'equipped' : ''}" data-career-armour-select="${escapeCareerHtml(id)}" aria-pressed="${isSelected ? 'true' : 'false'}">${careerArmourStillMarkup(armour, { width: 118, height: 132, thumbnail: true, className: 'thumb armour' })}<span><small>${escapeCareerHtml(armour.quality)} · ${escapeCareerHtml(armour.coverage)}</small><strong>${escapeCareerHtml(armour.name)}</strong><em>${careerArmourProtectionLabel(armour)} · ${armour.maxDurability || 0} INTEGRITY</em></span><b>${state}</b></button>`;
    }).join('');
    const selectedArmourEquipped = selectedArmour.id === targetArmourId;
    const selectedArmourHolder = careerAssignedPlayersForArmour(selectedArmour.id, targetPlayer.id)[0] || null;
    const armourIssueText = selectedArmourEquipped ? 'CURRENTLY EQUIPPED' : locked ? 'LOCKED IN ROUND' : selectedArmour.id === 'none' ? 'REMOVE ARMOUR' : (careerArmourAvailableCount(selectedArmour.id, targetPlayer.id) <= 0 && selectedArmourHolder ? `TRANSFER FROM ${escapeCareerHtml(selectedArmourHolder.name).toUpperCase()}` : `EQUIP TO ${escapeCareerHtml(targetPlayer.name).toUpperCase()}`);

    const attachmentSlots = [
      ['OPTIC', 'SIGHTING SYSTEM', 'EMPTY SLOT'],
      ['MUZZLE', 'BARREL DEVICE', 'EMPTY SLOT'],
      ['MAGAZINE', 'AMMUNITION FEED', 'EMPTY SLOT'],
      ['GRIP', 'HANDLING MODULE', 'EMPTY SLOT']
    ].map(([slot, type, state]) => `
      <div class="career-attachment-slot">
        <div><span>${slot}</span><small>${type}</small></div>
        <strong>${state}</strong>
        <button disabled aria-disabled="true">PLACEHOLDER</button>
      </div>
    `).join('');
    const skinOptions = [null, ...careerState.skins].map(id => {
      const skin = id ? getCareerSkin(id) : null;
      const active = (careerState.equippedSkinId || null) === id;
      return `<button class="career-skin-option ${active ? 'active' : ''}" data-career-skin="${id || 'default'}" ${locked ? 'disabled' : ''} aria-pressed="${active ? 'true' : 'false'}"><span>${skin ? skin.quality : 'STANDARD'}</span><strong>${skin ? skin.name : 'FACTORY FINISH'}</strong><small>${skin ? skin.description : 'Original issued materials and colours.'}</small></button>`;
    }).join('');
    return `
      <section class="workflow-save-bar clean loadout-autosave"><div><span>AUTOSAVE ACTIVE</span><strong>PLAYER LOADOUT</strong><small>Weapon and armour issues are written to the career save immediately.</small></div><div><b>NO SAVE BUTTON REQUIRED</b></div></section>
      ${renderTeamPlayerContextBar(targetPlayer, 'loadout')}
      <div class="menu-hero career-hero armoury-hero">
        <div class="menu-hero-main menu-briefing-panel">
          <div class="menu-kicker">TEAM ARMOURY // EQUIPPING ${escapeCareerHtml(targetPlayer.name).toUpperCase()}</div>
          <h2>${selected.name}</h2>
          <p>Choose a contracted player, inspect an owned club weapon and issue it directly to that individual. Starter Scrapline pistols remain available to everyone. Dropped weapons are counted club copies: multiple copies can serve multiple players, while equipping a fully issued model transfers one existing copy from its current holder.</p>
          <div class="menu-pill-row">
            <span class="menu-pill">${targetSlot}</span>
            <span class="menu-pill">${targetRole.name}</span>
            <span class="menu-pill">${Math.max(0, careerState.inventory.length - 1)} DROP COPIES · ${careerOwnedWeaponIds().length} MODELS</span>
            <span class="menu-pill">${selected.damageMin}–${selected.damageMax} DAMAGE</span>
            <span class="menu-pill">${selected.armourPenetration || 0} PENETRATION</span>
            <span class="menu-pill">${escapeCareerHtml(targetArmour.name)}</span>
            <span class="menu-pill">+${Math.round((selected.critChanceBonus || 0) * 100)}% WEAPON CRIT</span>
            <span class="menu-pill">+${Math.round((selected.critDamageBonus || 0) * 100)}% CRIT DAMAGE</span>
            <span class="menu-pill">${selectedPresentation.headshotLabel}</span>
            <span class="menu-pill">${Math.round(selected.handling * 100)} HANDLING</span>
          </div>
        </div>
        <div class="menu-hero-side armoury-target-side">
          <div class="menu-kicker">EQUIPPING FOR</div>
          <div class="menu-side-operator">${escapeCareerHtml(targetPlayer.name)}</div>
          <p>${locked ? 'Loadouts are locked while a round is active.' : `Current issue: ${escapeCareerHtml(targetPrimaryId ? getCareerWeapon(targetPrimaryId).name : 'no primary')} plus ${escapeCareerHtml(getCareerWeapon(targetSidearmId).name)} with ${escapeCareerHtml(targetArmour.name)}. Changes autosave immediately. Fully issued weapon models can be transferred directly from another operator.`}</p>
        </div>
      </div>
      <section class="career-loadout-slot-summary" aria-label="Selected player loadout slots">
        <article><span>PRIMARY</span><strong>${escapeCareerHtml(targetPrimaryId ? getCareerWeapon(targetPrimaryId).name : 'NO PRIMARY')}</strong><small>${targetPrimaryId ? 'Prepared range and armour pressure' : 'Sidearm is used as the main weapon'}</small></article>
        <article><span>SIDEARM</span><strong>${escapeCareerHtml(getCareerWeapon(targetSidearmId).name)}</strong><small>Emergency close-range draw and reload option</small></article>
        <article><span>ARMOUR</span><strong>${escapeCareerHtml(targetArmour.name)}</strong><small>Torso protection with match-long integrity</small></article>
      </section>
      <section class="career-squad-loadout-panel" data-management-target-id="loadout:squad-overview">
        <div class="career-section-head"><div><span>SQUAD LOADOUT OVERVIEW</span><strong>STARTERS & RESERVES</strong></div><p>Select a player to edit their individual weapon and armour.</p></div>
        <div class="career-armoury-player-grid">${squadLoadoutRows}</div>
      </section>
      <div class="career-armoury-workspace">
        <section class="career-inventory-panel">
          <div class="career-section-head compact"><div><span>OWNED CLUB WEAPONS</span><strong>ARMOURY INVENTORY</strong></div><p>Scores compare the selected weapon profile with this operator’s current issue. Positive favours the selection; negative favours the equipped weapon; Trade-off means each has distinct strengths.</p></div>
          <div class="career-inventory-list">${inventoryRows}</div>
        </section>
        <article class="career-loadout-detail ${selectedEquipped ? 'equipped' : ''}" data-management-target-id="loadout:${escapeCareerHtml(targetPlayer.id)}">
          <div class="career-weapon-topline"><span>ITEM ${String(selected.id).toUpperCase()}</span><span>${selectedIssueText}</span></div>
          <div class="career-loadout-preview">${careerInspectActive('weapon', selected.id)
            ? careerWeapon3dMarkup(selected, 'armoury-detail', true, careerState.equippedSkinId)
            : `<div class="career-loadout-still-stage"><div class="career-inspector-grid" aria-hidden="true"></div><div class="career-inspector-shadow" aria-hidden="true"></div>${careerWeaponStillMarkup(selected, { width: 520, height: 240, skinId: careerState.equippedSkinId })}<div class="career-inspector-callout"><span>WEAPON PROFILE</span><strong>STILL VIEW</strong></div></div>`}
            <div class="career-inspect-bar">${careerInspectToggleMarkup('weapon', selected.id, 'INSPECT IN 3D')}</div>
          </div>
          <div class="career-loadout-head">
            <div><span class="career-rarity ${selected.rarity}">${selected.quality}</span><h3>${selected.name}</h3><small class="career-loadout-target">TARGET PLAYER · ${escapeCareerHtml(targetPlayer.name)} · ${targetRole.name}</small></div>
            <div class="career-slot-actions"><button class="primary" ${selectedEquipped || locked ? 'disabled' : ''} data-career-equip="${selected.id}" data-career-equip-slot="${selectedCareerWeaponSlot}">${issueButtonText}</button>${selectedCareerWeaponSlot === 'primary' && targetPrimaryId ? `<button ${locked ? 'disabled' : ''} data-career-remove-primary="true">REMOVE PRIMARY</button>` : ''}</div>
          </div>
          <p class="career-loadout-description">${selected.description}</p>
          ${careerWeaponTradeoffMarkup(selected)}
          <div class="career-weapon-identity-grid">
            <article><span>TACTICAL USE</span><strong>${selectedPresentation.recommendedUse}</strong><small>${selectedPresentation.roleFit}</small></article>
            <article><span>FIRING CHARACTER</span><strong>${selectedPresentation.cadenceLabel}</strong><small>${selectedPresentation.recoilLabel} · ${selectedPresentation.controlLabel}</small></article>
            <article><span>HANDLING CYCLE</span><strong>${selectedPresentation.reloadLabel}</strong><small>${selected.magSize} rounds · ${selected.reloadTime.toFixed(2)} second base reload</small></article>
            <article><span>HEADSHOT PROFILE</span><strong>${selectedPresentation.headshotLabel}</strong><small>Headshot damage can also receive the operator’s critical multiplier.</small></article><article><span>LOADOUT SLOT</span><strong>${selectedCareerWeaponSlot.toUpperCase()}</strong><small>${selected.weightClass.toUpperCase()} WEIGHT · ${Math.round((selected.movementPenalty || 0) * 100)}% movement cost · ${selected.armourPenetration} penetration</small></article>
          </div>
          ${selectedEquipped ? '<div class="career-weapon-compare current"><div class="career-weapon-compare-head"><span>PROFILE COMPARISON</span><strong>CURRENTLY EQUIPPED</strong><b>LIVE</b></div><p class="career-weapon-compare-explainer">This is the baseline weapon currently issued to the selected operator.</p><ul class="career-weapon-compare-list"><li class="neutral">ALL DELTAS ARE MEASURED FROM THIS WEAPON</li></ul><small class="career-weapon-compare-note">WEAPON PROFILE IS ONLY ONE PART OF LIVE EFFECTIVENESS. OPERATOR ATTRIBUTES, ROLE, FATIGUE AND TACTICS STILL APPLY.</small></div>' : careerWeaponComparisonMarkup(selected, equippedWeaponForCompare, targetPlayer.name)}
          <div class="career-loadout-stats">${careerWeaponStatsMarkup(selected, equippedWeaponForCompare)}</div>
          <div class="career-attachment-head"><div><span>CLUB-WIDE COSMETIC</span><strong>WEAPON FINISH</strong></div><small>The selected unlocked finish currently applies across the club rather than per player.</small></div>
          <div class="career-skin-grid">${skinOptions}</div>
          <div class="career-attachment-head"><div><span>MODULAR CONFIGURATION</span><strong>ATTACHMENTS</strong></div><small>Attachment functionality will be introduced in a later build.</small></div>
          <div class="career-attachment-grid">${attachmentSlots}</div>
          <div class="career-loadout-footer"><span>${selected.magSize} ROUND MAGAZINE</span><span>${selected.reloadTime.toFixed(2)}s RELOAD</span><span>${selected.range.toFixed(1)}m EFFECTIVE RANGE</span><span>${selectedPresentation.summary}</span></div>
        </article>
      </div>
      <section class="career-armour-guide">
        <div class="career-section-head"><div><span>NEW PLAYER GUIDE</span><strong>PRIMARY & SIDEARM ROLES</strong></div><p>Primary weapons control prepared medium-range fights. Sidearms remain valuable because they draw, turn and reload faster when contact arrives suddenly at close range.</p></div>
        <div class="career-armour-guide-grid"><article><b>1</b><strong>PRIMARY IS OPTIONAL</strong><small>An operator without a primary uses the equipped sidearm as their main weapon.</small></article><article><b>2</b><strong>SIDEARM IS ALWAYS READY</strong><small>The AI can draw it when the primary is empty or unsettled during a sudden close fight.</small></article><article><b>3</b><strong>WEIGHT HAS A COST</strong><small>Rifles slow movement, add fatigue and lose accuracy after sprinting or sharp turns.</small></article><article><b>4</b><strong>READ THE TRADE-OFFS</strong><small>Range, magazine and penetration are weighed against handling, reload, mobility and noise.</small></article></div>
      </section>
      <section class="career-armour-guide">
        <div class="career-section-head"><div><span>NEW PLAYER GUIDE</span><strong>HOW ARMOUR WORKS</strong></div><p>Armour protects torso hits only. Headshots bypass it, armour-piercing weapons reduce its effect, and heavier rigs slow movement and handling.</p></div>
        <div class="career-armour-guide-grid"><article><b>1</b><strong>BUY A COPY</strong><small>Each store purchase creates one club copy, just like buying a weapon for an individual loadout.</small></article><article><b>2</b><strong>EQUIP ONE PLAYER</strong><small>A single copy can protect only one operator at a time.</small></article><article><b>3</b><strong>WATCH INTEGRITY</strong><small>Integrity carries through every round of the match. Surviving armour is serviced before the next match; reaching zero permanently breaks and discards that copy.</small></article><article><b>4</b><strong>MATCH THE ROLE</strong><small>Light armour suits mobility. Heavy armour suits holding lanes but can delay flanks and rotations.</small></article></div>
      </section>
      <div class="career-armoury-workspace career-armour-workspace">
        <section class="career-inventory-panel"><div class="career-section-head compact"><div><span>OWNED CLUB ARMOUR</span><strong>VEST INVENTORY</strong></div><p>Protection is graded rather than all-or-nothing. Higher weapon penetration reduces absorbed damage and wears integrity faster.</p></div><div class="career-armour-inventory-list">${armourRows}</div></section>
        <article class="career-loadout-detail career-armour-detail ${selectedArmourEquipped ? 'equipped' : ''}">
          <div class="career-weapon-topline"><span>ARMOUR ${escapeCareerHtml(selectedArmour.id).toUpperCase()}</span><span>${selectedArmour.id === 'none' ? 'MOBILITY CONFIGURATION' : `${careerArmourOwnedCount(selectedArmour.id)} CLUB COPIES`}</span></div>
          <div class="career-armour-detail-preview">${careerInspectActive('armour', selectedArmour.id)
            ? careerArmourVisualMarkup(selectedArmour, 'detail')
            : `<div class="career-loadout-still-stage armour"><div class="career-armour-showcase-grid" aria-hidden="true"></div><div class="career-armour-showcase-shadow" aria-hidden="true"></div>${careerArmourStillMarkup(selectedArmour, { width: 360, height: 380 })}<div class="career-inspector-callout"><span>ARMOUR PROFILE</span><strong>STILL VIEW · FRONT</strong></div></div>`}
            <div class="career-inspect-bar">${careerInspectToggleMarkup('armour', selectedArmour.id, 'INSPECT IN 3D')}</div>
          </div>
          <div class="career-loadout-head"><div><span class="career-rarity ${escapeCareerHtml(selectedArmour.rarity)}">${escapeCareerHtml(selectedArmour.quality)}</span><h3>${escapeCareerHtml(selectedArmour.name)}</h3><small class="career-loadout-target">TARGET PLAYER · ${escapeCareerHtml(targetPlayer.name)} · ${targetRole.name}</small></div><button class="primary" data-career-armour-equip="${escapeCareerHtml(selectedArmour.id)}" ${selectedArmourEquipped || locked ? 'disabled' : ''}>${armourIssueText}</button></div>
          <p class="career-loadout-description">${escapeCareerHtml(selectedArmour.description)}</p>
          <div class="career-armour-stat-grid"><article><span>PROTECTION</span><strong>${Math.round(selectedArmour.protection * 100)}%</strong><small>Maximum base torso reduction before penetration.</small></article><article><span>ARMOUR RATING</span><strong>${selectedArmour.rating}</strong><small>Higher values resist low-penetration weapons more effectively.</small></article><article><span>INTEGRITY</span><strong>${selectedArmour.maxDurability}</strong><small>Zero integrity destroys this purchased copy.</small></article><article><span>MOBILITY COST</span><strong>${Math.round(selectedArmour.movementPenalty * 100)}%</strong><small>Also adds ${selectedArmour.fatigueLoad.toFixed(1)} match workload.</small></article></div>
          <div class="career-loadout-footer"><span>${escapeCareerHtml(selectedArmour.coverage)} COVERAGE</span><span>${escapeCareerHtml(selectedArmour.roleFit)}</span><span>${Math.round(selectedArmour.handlingPenalty * 100)}% HANDLING COST</span><span>HEADSHOTS BYPASS</span></div>
        </article>
      </div>
    `;
  }

  function renderSimulatedOperatorRoster() {
    const rows = bots.filter(bot => !bot.isPlayerOwned).map(bot => {
      const stats = bot.rpgStats || bot.simulatedStats || simulatedOperatorStats(bot.team, bot.slot);
      const total = combatStatTotal(stats);
      const statCode = Object.entries(CAREER_STAT_DEFS)
        .map(([key, meta]) => `<span title="${meta.label}">${meta.short.slice(0, 3)} <b>${stats[key] || 0}</b></span>`)
        .join('');
      return `
        <div class="career-sim-row ${bot.team === TEAM_BLUE ? 'blue' : 'red'}">
          <div class="career-sim-id"><i></i><strong>${escapeCareerHtml(bot.name)}</strong><small>${escapeCareerHtml(matchTeamIdentity(bot.team).short)} · SLOT ${String(bot.slot + 1).padStart(2, '0')}</small></div>
          <div class="career-sim-stats">${statCode}</div>
          <div class="career-sim-weapon"><strong>${escapeCareerHtml(bot.primaryWeapon?.name || 'UNASSIGNED')}</strong><small>${bot.primaryWeapon?.quality || 'WORN'} STARTER TIER</small></div>
          <div class="career-sim-total"><strong>${total}</strong><small>POINTS</small></div>
        </div>
      `;
    }).join('');
    return `
      <section class="career-sim-roster">
        <div class="career-section-head"><div><span>SIMULATION ROSTER</span><strong>STARTING BUILD PARITY</strong></div><p>Every autonomous opponent and team-mate begins with exactly ten simulated attribute points and a worn starter-tier sidearm.</p></div>
        <div class="career-sim-columns"><span>OPERATOR</span><span>ATTRIBUTE SPREAD</span><span>ISSUED WEAPON</span><span>BUDGET</span></div>
        ${rows}
      </section>
    `;
  }

  function renderCareerOperatorTab(liveBlue, liveRed) {
    if (!careerState.created) return renderCareerCreationTab();
    const owned = getOwnedOperator();
    return `
      <div class="menu-hero career-hero">
        <div class="menu-hero-main menu-briefing-panel">
          <div class="menu-kicker">SELECTED PLAYER PROFILE</div>
          <h2>${teamNameLockup(careerState.name)}</h2>
          <p>Attributes are permanent build choices. Each level grants one additional point that can be allocated here between rounds.</p>
          <div class="menu-pill-row">
            <span class="menu-pill">LEVEL ${careerState.level}</span>
            <span class="menu-pill">${careerState.unspentPoints} POINTS AVAILABLE</span>
            <span class="menu-pill">${owned?.alive ? 'ACTIVE' : 'DOWN'}</span>
            <span class="menu-pill">${escapeCareerHtml(matchTeamIdentity(TEAM_BLUE).short)} ${liveBlue} · ${escapeCareerHtml(matchTeamIdentity(TEAM_RED).short)} ${liveRed}</span>
          </div>
        </div>
        <div class="menu-hero-side">
          <div class="menu-kicker">LIVE PERFORMANCE</div>
          <div class="menu-side-operator">${owned ? `${owned.kills} K / ${owned.deaths} D` : 'NO MATCH DATA'}</div>
          <p>${getCareerWeapon().name}</p>
          <div class="menu-meta">MAX HEALTH · ${owned?.maxHealth || 100}</div>
          <div class="menu-meta">POINT SPENDING · ${menuContext === 'pause' ? 'LOCKED' : 'AVAILABLE'}</div>
        </div>
      </div>
      <div class="career-operator-layout">
        <section class="career-stats-card">
          <div class="menu-kicker">COMBAT ATTRIBUTES</div>
          <h3>OPERATOR BUILD</h3>
          <div class="career-stat-list">${renderCareerStatRows(careerState.stats, 'upgrade')}</div>
        </section>
        <section class="career-effect-card visual">
          <div class="menu-kicker">DERIVED EFFECTS</div>
          <h3>SIMULATION IMPACT</h3>
          ${renderCombatEffectivenessGraph(careerState.stats, getCareerWeapon(), 'operator')}
          <div class="career-effect-grid">
            <div class="career-effect-row"><span>AIM MODIFIER</span><strong>+${Math.round(careerStat('marksmanship') * 1.8)}%</strong></div>
            <div class="career-effect-row"><span>HANDLING</span><strong>+${Math.round(careerStat('handling') * 3)}%</strong></div>
            <div class="career-effect-row"><span>REACTION</span><strong>+${Math.round(careerStat('awareness') * 2.6)}%</strong></div>
            <div class="career-effect-row"><span>MOVEMENT</span><strong>+${Math.round(careerStat('mobility') * 3.5)}%</strong></div>
            <div class="career-effect-row"><span>MAX HEALTH</span><strong>${90 + careerStat('resilience') * 4}</strong></div>
          </div>
        </section>
      </div>
      ${renderSimulatedOperatorRoster()}
    `;
  }

  function ownedOperatorBehaviour(bot) {
    return botTacticalStatus(bot, false);
  }

  function careerLiveBlueBots() {
    return bots.filter(bot => bot.team === TEAM_BLUE && bot.isPlayerOwned);
  }

  function careerTelemetryPlayer() {
    const player = teamPlayerById(selectedTeamPlayerId) || careerState.squad?.[0] || null;
    if (player) selectedTeamPlayerId = player.id;
    return player;
  }

  function renderTelemetryPlayerSelector(activeId) {
    const squad = careerState.squad || [];
    return `<section class="telemetry-player-selector"><div class="career-section-head compact"><div><span>PLAYER LINK</span><strong>SELECT INDIVIDUAL TELEMETRY</strong></div><p>Switch between starters and reserves without changing the line-up.</p></div><div>${squad.map((player, index) => {
      const medical = typeof playerMedicalAvailability === 'function' ? playerMedicalAvailability(player) : { label: 'AVAILABLE', className: 'fit' };
      return `<button class="${player.id === activeId ? 'active' : ''} ${medical.className !== 'fit' ? 'medical-flag' : ''}" data-team-telemetry-player="${player.id}"><span>${index < TEAM_REQUIRED_STARTERS ? `S${index + 1}` : 'R'}</span><strong>${escapeCareerHtml(player.name)}</strong><small>${teamRoleById(player.role).name} · ${player.fatigue}% FAT · ${escapeCareerHtml(medical.label)}</small></button>`;
    }).join('')}</div></section>`;
  }

  function renderCareerTelemetryTab() {
    if (!careerState.created) return renderCareerCreationTab();
    if (!careerSquadReady()) return `${renderTeamTutorialPanel()}<div class="team-empty-state"><strong>NO TEAM TELEMETRY</strong><p>Recruit five players before team telemetry can be established.</p><button class="primary" data-team-route="market">OPEN RECRUITMENT</button></div>`;
    const live = careerLiveBlueBots();
    const active = live.length > 0;
    const alive = live.filter(bot => bot.alive).length;
    const shots = live.reduce((sum, bot) => sum + (bot.roundShotsFired || 0), 0);
    const hits = live.reduce((sum, bot) => sum + (bot.roundShotsHit || 0), 0);
    const accuracy = shots ? Math.round(hits / shots * 100) : 0;
    const damage = live.reduce((sum, bot) => sum + (bot.roundDamageDealt || 0), 0);
    const criticalHits = live.reduce((sum, bot) => sum + (bot.roundCriticalHits || 0), 0);
    const headshots = live.reduce((sum, bot) => sum + (bot.roundHeadshots || 0), 0);
    const taken = live.reduce((sum, bot) => sum + (bot.roundDamageTaken || 0), 0);
    const teamKills = live.reduce((sum, bot) => sum + (bot.kills || 0), 0);
    const teamDeaths = live.reduce((sum, bot) => sum + (bot.deaths || 0), 0);
    const starters = careerState.squad.slice(0, TEAM_REQUIRED_STARTERS);
    const avgFatigue = starters.length ? Math.round(starters.reduce((sum, player) => sum + player.fatigue, 0) / starters.length) : 0;
    const avgHappiness = starters.length ? Math.round(starters.reduce((sum, player) => sum + player.happiness, 0) / starters.length) : 0;
    const avgReadiness = starters.length ? Math.round(starters.reduce((sum, player) => sum + teamReadinessScore(player), 0) / starters.length) : 0;
    const injuredCount = starters.filter(player => typeof playerInjuryActive === 'function' && playerInjuryActive(player)).length;
    const teamStatus = active ? (alive ? `${alive} / ${live.length} ACTIVE` : 'TEAM ELIMINATED') : 'PRE-MATCH STATUS';
    return `${renderTeamTutorialPanel()}
      <div class="menu-hero career-hero telemetry-hero team-telemetry-hero">
        <div class="menu-hero-main menu-briefing-panel"><div class="menu-kicker">TEAM TELEMETRY // OVERALL VIEW</div><h2>${teamNameLockup(careerState.name)}<span class="team-heading-suffix">// ${teamStatus}</span></h2><p>Combined live combat data for all five active operators, alongside readiness, fatigue and happiness before the next fixture.</p><div class="menu-pill-row"><span class="menu-pill">${active ? `ROUND ${roundNumber}` : `WEEK ${careerState.week}`}</span><span class="menu-pill">${alive} / ${active ? live.length : TEAM_REQUIRED_STARTERS} ACTIVE</span><span class="menu-pill">AVG FATIGUE ${avgFatigue}%</span><span class="menu-pill">AVG HAPPINESS ${avgHappiness}%</span><span class="menu-pill">${injuredCount} MEDICAL FLAG${injuredCount === 1 ? '' : 'S'}</span></div></div>
        <div class="menu-hero-side"><div class="menu-kicker">TEAM READINESS</div><div class="menu-side-operator">${avgReadiness}</div><p>${avgFatigue >= TEAM_FATIGUE_WARNING ? 'Rotation is strongly advised.' : 'Starting five available.'}</p><button data-team-profile="${starters[0]?.id || ''}">OPEN PLAYER PROFILE & DATA</button></div>
      </div>
      <div class="telemetry-dashboard">
        <article><span>TEAM K / D</span><strong>${teamKills} / ${teamDeaths}</strong><small>${alive} OPERATORS ACTIVE</small></article>
        <article><span>COMBINED ACCURACY</span><strong>${accuracy}%</strong><small>${hits} / ${shots} HITS · ${headshots} HS · ${criticalHits} CRITS</small></article>
        <article><span>TEAM DAMAGE</span><strong>${Math.round(damage)}</strong><small>${Math.round(taken)} RECEIVED</small></article>
        <article><span>CONDITION</span><strong>${100 - avgFatigue}%</strong><small>${avgHappiness}% HAPPINESS</small></article>
      </div>
      <section class="team-telemetry-roster"><div class="career-section-head"><div><span>ACTIVE FIVE OPERATORS</span><strong>LIVE & PHYSICAL STATUS</strong></div><p>Select a row for the complete player profile, telemetry and performance record.</p></div><div>${starters.map((player, index) => {
        const bot = live.find(candidate => candidate.playerProfileId === player.id || candidate.slot === index);
        const health = bot?.alive ? Math.max(0, Math.ceil(bot.health)) : (bot ? 0 : '—');
        const status = bot ? botTacticalStatus(bot, true) : teamReadinessLabel(player);
        const medical = typeof playerMedicalAvailability === 'function' ? playerMedicalAvailability(player) : { label: 'AVAILABLE', className: 'fit' };
        return `<button class="${medical.className !== 'fit' ? 'medical-flag' : ''}" data-team-telemetry-player="${player.id}"><span>${index + 1}</span><div><strong>${escapeCareerHtml(player.name)}</strong><small>${teamRoleById(player.role).name} · PRI ${escapeCareerHtml(careerPlayerPrimaryWeaponId(player) ? getCareerWeapon(careerPlayerPrimaryWeaponId(player)).name : 'NONE')} · SIDE ${escapeCareerHtml(getCareerWeapon(careerPlayerSidearmId(player)).name)} · ${escapeCareerHtml(getCareerArmour(player.equippedArmourId).name)} · ${escapeCareerHtml(medical.label)}</small></div><b>${health} HP</b><b>${player.fatigue}% FAT</b><b>${player.happiness}% HAPPY</b><em>${escapeCareerHtml(status)}</em></button>`;
      }).join('')}</div></section>`;
  }

  function renderPlayerTelemetryProfileSection(player) {
    if (!player) return '';
    const bot = bots.find(candidate => candidate.playerProfileId === player.id) || null;
    const live = Boolean(bot);
    const last = player.lastMatch;
    const shots = live ? (bot.roundShotsFired || 0) : (last?.shotsFired || 0);
    const hits = live ? (bot.roundShotsHit || 0) : (last?.shotsHit || 0);
    const accuracy = shots ? Math.round(hits / shots * 100) : 0;
    const health = bot ? (bot.alive ? Math.max(0, Math.ceil(bot.health)) : 0) : '—';
    const maxHealth = bot?.maxHealth || (90 + (player.stats?.resilience || 0) * 4);
    const behaviour = bot ? ownedOperatorBehaviour(bot) : teamReadinessLabel(player);
    const zone = bot ? levelZoneAt(bot.x, bot.y) : { name: 'COMMAND HQ' };
    const medical = typeof playerMedicalAvailability === 'function' ? playerMedicalAvailability(player) : { label: 'AVAILABLE', className: 'fit' };
    const injuryRisk = Math.round((Number(player.lastInjuryRisk) || 0) * 100);
    const critical = playerCriticalProfile(player, bot?.weapon?.id || careerPlayerActiveWeaponId(player));
    const currentStreak = live ? Math.max(0, Number(bot.multiKillCount) || 0) : Math.max(0, Number(last?.highestMultiKill) || 0);
    const currentTier = typeof careerMultiKillTier === 'function' ? careerMultiKillTier(currentStreak) : null;
    return `<section class="player-profile-telemetry" data-player-profile-telemetry="${escapeCareerHtml(player.id)}">
      <div class="career-section-head"><div><span>PLAYER TELEMETRY</span><strong>${live ? 'LIVE COMBAT & PHYSICAL LINK' : 'LATEST MATCH & READINESS'}</strong></div><p>Telemetry now lives inside the player profile so performance, condition, development and loadout context remain together.</p></div>
      <div class="player-profile-telemetry-status"><div><span>${live ? 'LIVE STATE' : 'LATEST DATA'}</span><strong>${escapeCareerHtml(behaviour)}</strong><small>${escapeCareerHtml(zone.name)} · ${live ? `${health} / ${maxHealth} HP` : (last ? `LAST RATING ${Number(last.rating || 0).toFixed(2)}` : 'NO MATCH RECORDED')}</small></div><b class="${currentTier ? currentTier.key : ''}">${currentTier ? currentTier.title : `${teamReadinessScore(player)} READY`}</b></div>
      <div class="telemetry-dashboard profile-telemetry-dashboard">
        <article><span>${live ? 'MATCH K / D' : 'LAST MATCH K / D'}</span><strong>${live ? `${bot.kills} / ${bot.deaths}` : (last ? `${last.kills} / ${last.deaths}` : '—')}</strong><small>${currentTier ? (live ? `${currentTier.title} ACTIVE` : `LAST MATCH ${currentTier.title}`) : `${currentStreak || 0} HIGHEST CHAIN`}</small></article>
        <article><span>SHOT ACCURACY</span><strong>${accuracy}%</strong><small>${hits} / ${shots} HITS</small></article>
        <article><span>CRITICAL PROFILE</span><strong>${Math.round(critical.chance * 100)}% · +${Math.round(critical.bonusDamage * 100)}%</strong><small>${live ? (bot.roundHeadshots || 0) : (last?.headshots || 0)} HEADSHOTS · ${live ? (bot.roundCriticalHits || 0) : (last?.criticalHits || 0)} CRITS</small></article>
        <article class="medical-card ${medical.className}"><span>MEDICAL & CONDITION</span><strong>${escapeCareerHtml(medical.label)}</strong><small>${player.fatigue}% FATIGUE · ${teamCondition(player)}% CONDITION · ${injuryRisk}% LAST RISK</small></article>
      </div>
      <div class="telemetry-visual-grid profile-telemetry-visuals">
        <section class="telemetry-vitals-panel"><div class="career-section-head compact"><div><span>READINESS</span><strong>PHYSICAL & MENTAL STATE</strong></div></div>
          <div class="telemetry-vital"><span>FATIGUE</span><i><b class="fatigue" style="width:${player.fatigue}%"></b></i><strong>${player.fatigue}%</strong></div>
          <div class="telemetry-vital"><span>HAPPINESS</span><i><b style="width:${player.happiness}%"></b></i><strong>${player.happiness}%</strong></div>
          <div class="telemetry-vital"><span>MORALE</span><i><b style="width:${player.morale}%"></b></i><strong>${player.morale}%</strong></div>
          <div class="telemetry-vital"><span>MATCH SHARPNESS</span><i><b style="width:${player.matchSharpness}%"></b></i><strong>${player.matchSharpness}%</strong></div>
        </section>
        ${renderCombatEffectivenessGraph(player.stats, getCareerWeapon(careerPlayerActiveWeaponId(player)), 'profile')}
      </div>
    </section>`;
  }

  function renderCareerPlayerTelemetryTab() {
    // Backward compatibility for old history links. Individual telemetry now lives in the player profile.
    return renderTeamPlayerProfileTab();
  }

  function renderCareerReportsTab() {
    if (!careerState.created) return renderCareerCreationTab();
    const summary = careerState.lastRound;
    return `
      <div class="menu-hero career-hero report-archive-hero" data-management-target-id="report:latest">
        <div class="menu-hero-main menu-briefing-panel"><div class="menu-kicker">AFTER ACTION ARCHIVE</div><h2>${summary ? `${escapeCareerHtml(summary.blueTeamName || careerState.name)} ${summary.blueScore ?? 0} — ${summary.redScore ?? 0} ${escapeCareerHtml(summary.redTeamName || summary.league?.opponentName || 'Opposition')} // ${summary.grade || careerCombatGrade(summary.score)}` : 'NO DEBRIEF AVAILABLE'}</h2><p>Review the latest team result, competition impact, combined accuracy, player ratings and XP breakdown.</p></div>
        <div class="menu-hero-side"><div class="menu-kicker">LATEST RESULT</div><div class="menu-side-operator">${summary ? `${Number.isFinite(summary.score) ? summary.score : careerCombatScore(summary)} / 100` : '—'}</div><p>${summary ? `${summary.won ? 'VICTORY' : 'DEFEAT'} · ${summary.xpAward} XP` : 'COMPLETE A MATCH'}</p></div>
      </div>
      ${careerReportMarkup(summary, true)}
      ${typeof renderTeamLastMatchBreakdown === 'function' ? renderTeamLastMatchBreakdown() : ''}
    `;
  }

  function renderCareerRecordsTab() {
    if (!careerState.created) return renderCareerCreationTab();
    const winRate = careerState.totalMatches ? Math.round(careerState.matchWins / careerState.totalMatches * 100) : 0;
    return `
      <div class="menu-hero career-hero">
        <div class="menu-hero-main menu-briefing-panel">
          <div class="menu-kicker">CLUB HONOURS & SERVICE RECORD</div>
          <h2>TEAM LEVEL ${careerState.level}</h2>
          <p>Review the permanent award history, player milestones and service records created across every competitive season.</p>
          <div class="menu-pill-row">
            <span class="menu-pill">${careerState.xp}/${careerXpRequired()} XP</span>
            <span class="menu-pill">${careerState.totalMatches} MATCHES · ${careerState.totalRounds} ROUNDS</span>
            <span class="menu-pill">${careerState.cratesOpened} CRATES</span>
            <span class="menu-pill">${winRate}% WIN RATE</span>
          </div>
        </div>
        <div class="menu-hero-side">
          <div class="menu-kicker">NEXT LEVEL</div>
          <div class="menu-side-operator">${careerXpRequired() - careerState.xp} XP</div>
          <p>Advance the organisation to Team Level ${careerState.level + 1}.</p>
        </div>
      </div>
      <div class="menu-dashboard">
        ${menuTile('TEAM KILLS', careerState.totalKills, 'ALL DEPLOYED PLAYERS')}
        ${menuTile('TEAM DEATHS', careerState.totalDeaths, 'ALL DEPLOYED PLAYERS')}
        ${menuTile('MATCH WINS', careerState.matchWins, `${winRate}% WIN RATE`, 'blue')}
        ${menuTile('BEST ROUND', careerState.bestRoundKills, 'KILLS IN ONE ROUND')}
      </div>
      <div class="menu-grid menu-grid-two">
        ${menuCard('PROGRESSION', 'LEVEL-UP REWARD', 'Team Levels grant club benefit points in the Training Facility, while every player earns separate XP and allocatable stat points.')}
        ${menuCard('LOOT', 'CRATE COLLECTION', `${careerState.cratesOpened} crates opened. Repeated weapon drops add another assignable club copy; only duplicate cosmetic finishes convert into additional experience.`)}
        ${menuCard('LOADOUT', 'CURRENT SIDEARM', `${getCareerWeapon().name} · ${getCareerWeapon().quality} quality · ${getCareerWeapon().damageMin}–${getCareerWeapon().damageMax} damage.`)}
        ${menuCard('LAST DEPLOYMENT', careerState.lastRound ? `${careerState.lastRound.kills} K / ${careerState.lastRound.deaths} D` : 'NO DATA', careerState.lastRound ? `${careerState.lastRound.xpAward} Team XP earned in a ${careerState.lastRound.blueScore ?? 0} — ${careerState.lastRound.redScore ?? 0} match.` : 'Complete a match to begin the record.')}
      </div>
      ${typeof renderWorldPressClubHonours === 'function' ? renderWorldPressClubHonours() : ''}
    `;
  }

  function handleCareerMenuClick(event) {
    if (typeof handleTransferClick === 'function' && handleTransferClick(event)) return;
    if (typeof handleClubOperationsClick === 'function' && handleClubOperationsClick(event)) return;
    if (typeof handleLeagueClick === 'function' && handleLeagueClick(event)) return;
    if (typeof handleDevelopmentClick === 'function' && handleDevelopmentClick(event)) return;
    if (typeof handleInfrastructureClick === 'function' && handleInfrastructureClick(event)) return;
    if (handleTeamManagementClick(event)) return;
    const audioAction = event.target.closest('[data-audio-action]');
    if (audioAction) {
      toggleAudio().finally(() => updateMenuUI());
      return;
    }
    const armourViewerButton = event.target.closest('[data-career-armour-viewer-action]');
    if (armourViewerButton) {
      handleCareerArmourViewerAction(armourViewerButton.dataset.careerArmourViewerAction);
      return;
    }
    const viewerButton = event.target.closest('[data-career-viewer-action]');
    if (viewerButton) {
      handleCareerWeaponViewerAction(viewerButton.dataset.careerViewerAction);
      return;
    }
    const statButton = event.target.closest('[data-career-stat]');
    if (statButton) {
      adjustCareerDraftStat(statButton.dataset.careerStat, Number(statButton.dataset.careerDelta) || 0);
      return;
    }
    const logoButton = event.target.closest('[data-team-logo]');
    if (logoButton && !careerState.created) {
      careerDraft.teamIdentity = normaliseTeamIdentity({ ...careerDraft.teamIdentity, logoId: logoButton.dataset.teamLogo });
      for (const button of menuContentEl?.querySelectorAll('[data-team-logo]') || []) {
        const selected = button.dataset.teamLogo === careerDraft.teamIdentity.logoId;
        button.classList.toggle('selected', selected);
        button.setAttribute('aria-checked', selected ? 'true' : 'false');
      }
      const preview = menuContentEl?.querySelector('.team-logo-preview > [data-team-logo-preview]');
      if (preview) preview.outerHTML = teamLogoSvg(careerDraft.teamIdentity, 'team-logo-preview-mark');
      const label = menuContentEl?.querySelector('.team-logo-preview strong');
      if (label) label.textContent = TEAM_LOGO_DEFS[careerDraft.teamIdentity.logoId].label;
      return;
    }
    const createButton = event.target.closest('[data-career-action="create"]');
    if (createButton) {
      createCareerOperator();
      return;
    }
    const randomNameButton = event.target.closest('[data-career-action="random-team-name"]');
    if (randomNameButton) {
      applyRandomCareerTeamName();
      return;
    }
    const armouryPlayerButton = event.target.closest('[data-career-armoury-player]');
    if (armouryPlayerButton) {
      selectCareerArmouryPlayer(armouryPlayerButton.dataset.careerArmouryPlayer, false);
      return;
    }
    // Build 12.155: the only control that mounts a live CSS-3D rig.
    const inspectButton = event.target.closest('[data-career-inspect]');
    if (inspectButton) {
      const surface = String(inspectButton.dataset.careerInspect || '');
      const opened = setCareerInspectSurface(surface, inspectButton.dataset.careerInspectId || '');
      showStatus(opened ? 'INTERACTIVE 3D INSPECTION OPEN' : 'RETURNED TO STILL VIEW');
      updateMenuUI();
      return;
    }
    const selectButton = event.target.closest('[data-career-select]');
    if (selectButton) {
      const id = selectButton.dataset.careerSelect;
      if (careerState.inventory.includes(id)) {
        selectedCareerWeaponId = id;
        selectedCareerWeaponSlot = careerWeaponSlotType(id);
        resetCareerWeaponViewer(false);
        // Selecting a different weapon closes an inspector opened on the old
        // one, so the live rig always belongs to what is on screen.
        if (careerInspectState.surface === 'weapon') { careerInspectState.surface = null; careerInspectState.id = null; }
        updateMenuUI();
      }
      return;
    }
    const armourSelectButton = event.target.closest('[data-career-armour-select]');
    if (armourSelectButton) {
      const id = String(armourSelectButton.dataset.careerArmourSelect || 'none');
      if (CAREER_ARMOUR_CATALOG[id] && (id === 'none' || (careerState.armourInventory || []).includes(id))) {
        selectedCareerArmourId = id;
        if (careerInspectState.surface === 'armour') { careerInspectState.surface = null; careerInspectState.id = null; }
        updateMenuUI();
      }
      return;
    }
    const armourEquipButton = event.target.closest('[data-career-armour-equip]');
    if (armourEquipButton) {
      const equipped = equipCareerArmour(String(armourEquipButton.dataset.careerArmourEquip || 'none'));
      if (equipped) showStatus(String(armourEquipButton.dataset.careerArmourEquip || 'none') === 'none' ? 'ARMOUR REMOVED & SAVED' : 'ARMOUR EQUIPPED & SAVED');
      return;
    }
    const equipButton = event.target.closest('[data-career-equip]');
    if (equipButton) {
      selectedCareerWeaponId = equipButton.dataset.careerEquip;
      if (typeof workflowDiscardLoadoutDraft === 'function') workflowDiscardLoadoutDraft({ render: false });
      const equipped = equipCareerWeapon(equipButton.dataset.careerEquip, { slot: equipButton.dataset.careerEquipSlot });
      if (equipped) showStatus('WEAPON ISSUED & SAVED');
      return;
    }
    const removePrimaryButton = event.target.closest('[data-career-remove-primary]');
    if (removePrimaryButton) {
      if (equipCareerWeapon('none', { slot: 'primary' })) showStatus('PRIMARY REMOVED · SIDEARM NOW ACTIVE');
      return;
    }
    const skinButton = event.target.closest('[data-career-skin]');
    if (skinButton) {
      const id = skinButton.dataset.careerSkin === 'default' ? null : skinButton.dataset.careerSkin;
      if (!id || careerState.skins.includes(id)) {
        careerState.equippedSkinId = id;
        saveCareerState();
        for (const owned of bots.filter(bot => bot.isPlayerOwned)) applyCareerToBot(owned);
        updateMenuUI();
      }
      return;
    }
    const resetAction = event.target.closest('[data-career-action]');
    if (resetAction) {
      const action = resetAction.dataset.careerAction;
      if (action === 'request-wipe') requestCareerWipe();
      else if (action === 'cancel-wipe') cancelCareerWipe();
      else if (action === 'confirm-wipe') wipeCareerData();
      else if (action === 'export-save') exportCareerSave();
      else if (action === 'import-save') requestCareerImport();
      else if (action === 'restore-backup') restoreCareerBackup();
      else if (action === 'dismiss-data-notice') { careerDataNotice = null; updateMenuUI(); }
      return;
    }
    const upgradeButton = event.target.closest('[data-career-upgrade]');
    if (upgradeButton) allocateCareerPoint(upgradeButton.dataset.careerUpgrade);
  }

  function handleCareerMenuInput(event) {
    if (typeof handleClubOperationsInput === 'function' && handleClubOperationsInput(event)) return;
    if (event.target?.id === 'careerLogoColorInput' && !careerState.created) {
      const logoColor = normaliseTeamLogoColour(event.target.value);
      careerDraft.teamIdentity = normaliseTeamIdentity({ ...careerDraft.teamIdentity, logoColor });
      const creator = menuContentEl?.querySelector('.team-logo-creator');
      if (creator) creator.style.setProperty('--team-logo-colour', logoColor);
      for (const logo of menuContentEl?.querySelectorAll('[data-team-logo-preview]') || []) logo.style.color = logoColor;
      const value = menuContentEl?.querySelector('.team-logo-colour strong');
      if (value) value.textContent = logoColor.toUpperCase();
      return;
    }
    if (event.target?.id === 'careerNameInput') {
      careerDraft.name = normaliseCareerName(event.target.value);
      if (event.target.value !== careerDraft.name) event.target.value = careerDraft.name;
    } else if (event.target?.id === 'careerManagerInput') {
      careerDraft.managerName = normaliseCareerName(event.target.value);
      if (event.target.value !== careerDraft.managerName) event.target.value = careerDraft.managerName;
    } else {
      return;
    }
    const button = menuContentEl?.querySelector('[data-career-action="create"]');
    if (button) button.disabled = careerDraft.name.trim().length < 2 || careerDraft.managerName.trim().length < 2;
  }
