/*
 * Strikewatch source module: 30-bot-ai.js
 * Purpose: Bot state, perception, movement, animation state, combat decisions and weapon behaviour.
 *
 * This file is a source fragment. Run `python3 build.py` to regenerate
 * js/strikewatch.dev.js and the standalone release in dist/.
 */

  function animationBlendFactor(rate, dt) {
    return 1 - Math.exp(-Math.max(0, Number(rate) || 0) * Math.max(0, Number(dt) || 0));
  }

  function animationAngleStep(current, target, rate, dt, maximumLag = Math.PI) {
    const delta = angleDiff(target, current);
    let next = current + delta * animationBlendFactor(rate, dt);
    const remaining = angleDiff(target, next);
    const lagLimit = Math.abs(maximumLag);
    if (Math.abs(remaining) > lagLimit) next = target - Math.sign(remaining) * lagLimit;
    return next;
  }

  // Fixed per simulation-time window. Visual pressure cannot reduce awareness or tactics.
  const BOT_WORK_LIMITS = Object.freeze({
    perception: SIMULATION_WORK_POLICY.perceptionPerWindow,
    tactical: SIMULATION_WORK_POLICY.tacticalPerWindow
  });
  let botWorkFrame = 0;
  let botPerceptionScansUsedThisFrame = 0;
  let botTacticalDecisionsUsedThisFrame = 0;

  function botWorkLimits() {
    return BOT_WORK_LIMITS;
  }

  function beginBotWorkFrame() {
    botWorkFrame++;
    botPerceptionScansUsedThisFrame = 0;
    botTacticalDecisionsUsedThisFrame = 0;
    return botWorkFrame;
  }

  function consumeBotPerceptionSlot(bot = null, urgent = false) {
    const limits = botWorkLimits();
    const limit = limits.perception + (urgent ? 1 : 0);
    if (botPerceptionScansUsedThisFrame >= limit) {
      combatDebug.perceptionScanDeferrals++;
      if (bot) bot.perceptionScanDeferredFrame = botWorkFrame;
      return false;
    }
    botPerceptionScansUsedThisFrame++;
    if (bot) bot.perceptionScanFrame = botWorkFrame;
    return true;
  }

  function consumeBotTacticalSlot(bot = null, urgent = false) {
    const limits = botWorkLimits();
    const limit = limits.tactical + (urgent ? 1 : 0);
    if (botTacticalDecisionsUsedThisFrame >= limit) {
      combatDebug.tacticalDecisionDeferrals++;
      if (bot) bot.tacticalDecisionDeferredFrame = botWorkFrame;
      return false;
    }
    botTacticalDecisionsUsedThisFrame++;
    if (bot) bot.tacticalDecisionFrame = botWorkFrame;
    return true;
  }

  function botWorkBudgetSnapshot() {
    const limits = botWorkLimits();
    return {
      frame: botWorkFrame,
      workWindow: typeof simulationWorkWindowIndex === 'number' ? simulationWorkWindowIndex : -1,
      policyRevision: SIMULATION_WORK_POLICY.revision,
      renderQualityTier: typeof runtimeQualityTier === 'number' ? runtimeQualityTier : 2,
      perception: { used: botPerceptionScansUsedThisFrame, budget: limits.perception },
      tactical: { used: botTacticalDecisionsUsedThisFrame, budget: limits.tactical },
      perceptionDeferrals: Number(combatDebug.perceptionScanDeferrals) || 0,
      tacticalDeferrals: Number(combatDebug.tacticalDecisionDeferrals) || 0
    };
  }

  function movementPresentationSnapshot(bot) {
    if (!bot) return null;
    return {
      actualVelocity: Number(bot.moveVelocity) || 0,
      visualVelocity: Number(bot.visualMoveVelocity) || 0,
      locomotionSpeed: Number(bot.locomotionSpeed) || 0,
      renderMoveAngle: Number(bot.renderMoveAngle) || 0,
      renderAimAngle: Number(bot.renderAimAngle) || 0,
      forwardBlend: Number(bot.forwardBlend) || 0,
      strafeBlend: Number(bot.strafeBlend) || 0,
      backpedalBlend: Number(bot.backpedalBlend) || 0,
      turnBlend: Number(bot.turnBlend) || 0,
      shoulderBlend: Number(bot.shoulderBlend) || 0,
      weaponReadyBlend: Number(bot.weaponReadyBlend) || 0,
      crouchBlend: Number(bot.crouchBlend) || 0,
      hitReaction: Number(bot.hitReaction) || 0,
      hitReactionStrength: Number(bot.hitReactionStrength) || 0,
      deathAnim: Number(bot.deathAnim) || 0
    };
  }

  const OFFICE_COURTYARD_ROTATION_LANES = Object.freeze([
    // The four lanes run between the courtyard's west and east arcades, which
    // are the four-cell openings at x = 13 and x = 22 spanning z 10-13.
    Object.freeze({ id: 'north-cross', west: Object.freeze({ x: 13.5, y: 10.5 }), east: Object.freeze({ x: 22.5, y: 10.5 }) }),
    Object.freeze({ id: 'south-cross', west: Object.freeze({ x: 13.5, y: 13.5 }), east: Object.freeze({ x: 22.5, y: 13.5 }) }),
    Object.freeze({ id: 'north-to-south', west: Object.freeze({ x: 13.5, y: 10.5 }), east: Object.freeze({ x: 22.5, y: 13.5 }) }),
    Object.freeze({ id: 'south-to-north', west: Object.freeze({ x: 13.5, y: 13.5 }), east: Object.freeze({ x: 22.5, y: 10.5 }) })
  ]);

  function officeCourtyardRotationGeometry() {
    return OFFICE_COURTYARD_ROTATION_LANES.map(lane => ({
      id: lane.id,
      west: { ...lane.west },
      east: { ...lane.east }
    }));
  }

  const SUMMIT_LAYER_ROTATION_ROUTES = Object.freeze([
    Object.freeze({ id: 'west-upper-rise', fromZones: Object.freeze(['WEST', 'TRANSIT', 'MAINT']), targetZone: 'CATWALK', entry: Object.freeze({ x: 10.5, y: 8.65 }), exit: Object.freeze({ x: 10.5, y: 6.55 }), rangeBand: 'long' }),
    Object.freeze({ id: 'east-upper-rise', fromZones: Object.freeze(['EAST', 'TRANSIT', 'MAINT']), targetZone: 'CATWALK', entry: Object.freeze({ x: 25.5, y: 8.65 }), exit: Object.freeze({ x: 25.5, y: 6.55 }), rangeBand: 'long' }),
    Object.freeze({ id: 'west-skybridge-rise', fromZones: Object.freeze(['WEST', 'TRANSIT', 'MAINT']), targetZone: 'SKYBRIDGE', entry: Object.freeze({ x: 10.5, y: 8.65 }), exit: Object.freeze({ x: 14.5, y: 11.5 }), rangeBand: 'medium' }),
    Object.freeze({ id: 'east-skybridge-rise', fromZones: Object.freeze(['EAST', 'TRANSIT', 'MAINT']), targetZone: 'SKYBRIDGE', entry: Object.freeze({ x: 25.5, y: 8.65 }), exit: Object.freeze({ x: 21.5, y: 11.5 }), rangeBand: 'medium' }),
    Object.freeze({ id: 'west-upper-drop', fromZones: Object.freeze(['CATWALK', 'SKYBRIDGE']), targetZone: 'MAINT', entry: Object.freeze({ x: 10.5, y: 6.55 }), exit: Object.freeze({ x: 14.5, y: 18.5 }), rangeBand: 'short' }),
    Object.freeze({ id: 'east-upper-drop', fromZones: Object.freeze(['CATWALK', 'SKYBRIDGE']), targetZone: 'MAINT', entry: Object.freeze({ x: 25.5, y: 6.55 }), exit: Object.freeze({ x: 21.5, y: 18.5 }), rangeBand: 'short' }),
    Object.freeze({ id: 'west-maint-approach', fromZones: Object.freeze(['WEST', 'TRANSIT']), targetZone: 'MAINT', entry: Object.freeze({ x: 8.5, y: 15.5 }), exit: Object.freeze({ x: 14.5, y: 18.5 }), rangeBand: 'short' }),
    Object.freeze({ id: 'east-maint-approach', fromZones: Object.freeze(['EAST', 'TRANSIT']), targetZone: 'MAINT', entry: Object.freeze({ x: 27.5, y: 15.5 }), exit: Object.freeze({ x: 21.5, y: 18.5 }), rangeBand: 'short' }),
    Object.freeze({ id: 'upper-swing-east', fromZones: Object.freeze(['CATWALK']), targetZone: 'CATWALK', entry: Object.freeze({ x: 14.5, y: 5.5 }), exit: Object.freeze({ x: 21.5, y: 5.5 }), rangeBand: 'long' }),
    Object.freeze({ id: 'upper-swing-west', fromZones: Object.freeze(['CATWALK']), targetZone: 'CATWALK', entry: Object.freeze({ x: 21.5, y: 5.5 }), exit: Object.freeze({ x: 14.5, y: 5.5 }), rangeBand: 'long' }),
    Object.freeze({ id: 'bridge-swing-east', fromZones: Object.freeze(['SKYBRIDGE', 'CATWALK']), targetZone: 'SKYBRIDGE', entry: Object.freeze({ x: 14.5, y: 11.5 }), exit: Object.freeze({ x: 21.5, y: 11.5 }), rangeBand: 'medium' }),
    Object.freeze({ id: 'bridge-swing-west', fromZones: Object.freeze(['SKYBRIDGE', 'CATWALK']), targetZone: 'SKYBRIDGE', entry: Object.freeze({ x: 21.5, y: 11.5 }), exit: Object.freeze({ x: 14.5, y: 11.5 }), rangeBand: 'medium' }),
    Object.freeze({ id: 'lower-swing-east', fromZones: Object.freeze(['MAINT']), targetZone: 'MAINT', entry: Object.freeze({ x: 14.5, y: 18.5 }), exit: Object.freeze({ x: 21.5, y: 18.5 }), rangeBand: 'short' }),
    Object.freeze({ id: 'lower-swing-west', fromZones: Object.freeze(['MAINT']), targetZone: 'MAINT', entry: Object.freeze({ x: 21.5, y: 18.5 }), exit: Object.freeze({ x: 14.5, y: 18.5 }), rangeBand: 'short' })
  ]);

  function summitLayerRotationGeometry() {
    return SUMMIT_LAYER_ROTATION_ROUTES.map(route => ({
      id: route.id,
      fromZones: route.fromZones.slice(),
      targetZone: route.targetZone,
      rangeBand: route.rangeBand,
      entry: { ...route.entry },
      exit: { ...route.exit }
    }));
  }

  function prepareSummitOpeningTransitions() {
    if (activeArenaId !== 'summit' || !currentEngagementPlan || roundEnding || matchEnding) return 0;
    const targetZone = String(currentEngagementPlan.zone || '').toUpperCase();
    if (!['CATWALK', 'SKYBRIDGE', 'MAINT'].includes(targetZone)) return 0;
    const maximumPerTeam = targetZone === 'SKYBRIDGE' ? 2 : 3;
    let assigned = 0;
    for (const team of [TEAM_BLUE, TEAM_RED]) {
      let teamAssigned = 0;
      const candidates = bots
        .filter(bot => bot.alive && bot.team === team && bot.openingPlanObjective)
        .map(bot => ({
          bot,
          currentZone: levelZoneAt(bot.x, bot.y)?.short || 'TRANSIT',
          targetZone: levelZoneAt(bot.openingPlanObjective.x, bot.openingPlanObjective.y)?.short || targetZone
        }))
        .filter(item => item.currentZone !== targetZone || item.targetZone !== item.currentZone)
        .sort((a, b) => {
          const aRole = a.bot.playerRole || 'flex';
          const bRole = b.bot.playerRole || 'flex';
          const roleScore = role => targetZone === 'CATWALK'
            ? ({ marksman: 5, anchor: 4, caller: 3, support: 2, flex: 1, flanker: 0, entry: -1 }[role] || 0)
            : targetZone === 'MAINT'
              ? ({ entry: 5, flanker: 4, flex: 3, support: 2, caller: 1, anchor: 0, marksman: -1 }[role] || 0)
              : ({ support: 5, caller: 4, flex: 3, entry: 2, flanker: 2, anchor: 1, marksman: 1 }[role] || 0);
          return roleScore(bRole) - roleScore(aRole) || a.bot.slot - b.bot.slot;
        });
      for (const candidate of candidates) {
        if (teamAssigned >= maximumPerTeam) break;
        if (candidate.bot.beginSummitLayerRotation(true, targetZone, true)) {
          teamAssigned++;
          assigned++;
        }
      }
    }
    return assigned;
  }

  function captureMatchArmourState(bot, initial = false) {
    if (initial || !bot || !bot.armourId || bot.armourId === 'none') return null;
    return {
      id: bot.armourId,
      durability: Math.max(0, Number(bot.armourDurability) || 0),
      broken: Boolean(bot.armourBroken) || (Number(bot.armourDurability) || 0) <= 0,
      absorbed: Math.max(0, Number(bot.armourAbsorbed) || 0)
    };
  }

  function restoreMatchArmourState(bot, state) {
    if (!bot || !state || !state.id || state.id === 'none') return false;
    // A broken owned copy has already been removed from the career loadout.
    // Opposition operators also continue without the destroyed rig in later
    // rounds, so a newly-applied `none` profile is left untouched.
    if (bot.armourId !== state.id) return false;
    bot.armourDurability = clamp(state.durability, 0, Math.max(0, Number(bot.armourMaxDurability) || 0));
    bot.armourBroken = Boolean(state.broken) || bot.armourDurability <= 0.001;
    bot.armourAbsorbed = Math.max(0, Number(state.absorbed) || 0);
    if (bot.armourBroken) {
      bot.armourDurability = 0;
      bot.armourName = `${bot.armourProfile?.name || bot.armourName || 'ARMOUR'} · BROKEN`;
    }
    return true;
  }

  function resolveArmourHit(target, incomingDamage, weapon = null, hit = null) {
    const incoming = Math.max(0, Number(incomingDamage) || 0);
    const armour = target?.armourProfile || null;
    const currentIntegrity = Math.max(0, Number(target?.armourDurability) || 0);
    const headshot = Boolean(hit?.headshot);
    if (!target || !armour || armour.id === 'none' || target.armourBroken || currentIntegrity <= 0 || headshot || incoming <= 0) {
      return { incomingDamage: incoming, healthDamage: incoming, absorbed: 0, integrityLost: 0, penetration: Math.max(0, Number(weapon?.armourPenetration) || 0), armourRating: Math.max(0, Number(armour?.rating) || 0), broken: false, bypassed: headshot };
    }

    const penetration = Math.max(0, Number(weapon?.armourPenetration) || 0);
    const rating = Math.max(1, Number(armour.rating) || 1);
    const penetrationRatio = penetration / rating;
    // Low-penetration weapons allow the vest to deliver most of its stated
    // reduction. Equal or stronger penetration progressively defeats it, but
    // armour never becomes invulnerability and never produces a binary result.
    const resistanceFactor = clamp(1.08 - penetrationRatio * 0.58, 0.22, 0.94);
    const reduction = clamp((Number(armour.protection) || 0) * resistanceFactor, 0, 0.34);
    const desiredIntegrityLoss = incoming * clamp(0.42 + penetrationRatio * 0.34, 0.42, 1.04);
    const integrityLost = Math.min(currentIntegrity, desiredIntegrityLoss);
    const integrityCoverage = desiredIntegrityLoss > 0 ? clamp(integrityLost / desiredIntegrityLoss, 0, 1) : 0;
    const absorbed = Math.min(incoming * 0.34, incoming * reduction * integrityCoverage);
    const healthDamage = Math.max(0, incoming - absorbed);

    target.armourDurability = Math.max(0, currentIntegrity - integrityLost);
    target.armourAbsorbed = Math.max(0, Number(target.armourAbsorbed) || 0) + absorbed;
    target.roundArmourAbsorbed = Math.max(0, Number(target.roundArmourAbsorbed) || 0) + absorbed;
    target.roundArmourIntegrityLost = Math.max(0, Number(target.roundArmourIntegrityLost) || 0) + integrityLost;
    let broken = false;
    if (target.armourDurability <= 0.001) {
      target.armourDurability = 0;
      target.roundArmourBroken = Math.max(0, Number(target.roundArmourBroken) || 0) + 1;
      broken = typeof careerBreakArmourForBot === 'function' ? careerBreakArmourForBot(target) : true;
      target.armourBroken = true;
    }
    return { incomingDamage: incoming, healthDamage, absorbed, integrityLost, penetration, armourRating: rating, broken, bypassed: false };
  }

  class Bot {
    constructor(team, slot) {
      this.team = team;
      this.slot = slot;
      this.isPlayerOwned = isOwnedOperatorSlot(team, slot);
      this.name = names[team][slot];
      this.kills = 0;
      this.deaths = 0;
      this.skill = 0.9 + Math.random() * 0.15;
      this.moveSkill = 0.9 + Math.random() * 0.15;
      this.aggression = 0.42 + Math.random() * 0.52;
      this.stealth = 0.36 + Math.random() * 0.60;
      this.hearing = 0.88 + Math.random() * 0.24;
      this.walkCycle = Math.random() * TAU;
      this.motion = 0;
      this.moveVelocity = 0;
      this.simulatedStats = this.isPlayerOwned ? null : simulatedOperatorStats(team, slot);
      this.simulatedWeaponId = this.isPlayerOwned ? null : simulatedOperatorWeaponId(team, slot);
      this.primaryWeapon = this.isPlayerOwned ? cloneCareerWeapon() : cloneSimulatedStarterWeapon(team, slot);
      this.secondaryWeapon = cloneCareerWeapon('scrap-p12');
      this.weapon = this.primaryWeapon;
      this.reset(true);
    }
    reset(initial = false) {
      const carriedArmourState = captureMatchArmourState(this, initial);
      // applyCareerToBot/applySimulatedCareerToBot use this transient marker to
      // avoid re-equipping a destroyed opposition rig in the next round.
      this.matchArmourCarry = carriedArmourState;
      const p = randomSpawn(this.team);
      this.x = p.x;
      this.y = p.y;
      this.angle = this.team === TEAM_BLUE ? 0 : Math.PI;
      this.pathAngle = this.angle;
      this.health = 100;
      this.alive = true;
      this.deathYaw = this.angle;
      this.deathSide = Math.random() < 0.5 ? -1 : 1;
      this.deathPose = Math.floor(Math.random() * 3);
      this.deathTwist = (Math.random() - 0.5) * 0.34;
      this.deathWeaponSide = Math.random() < 0.5 ? -1 : 1;
      this.deathTime = 0;
      this.target = null;
      this.sightCandidate = null;
      this.sightTime = 0;
      this.reactionDelay = 0.18 + Math.random() * 0.24;
      this.targetSwitchCooldown = 0;
      this.targetCommitUntil = 0;
      this.perceptionScanTimer = 0.018 + this.slot * 0.009;
      this.lastPerceptionScanAt = -999;
      this.viewOccluder = null;
      this.viewOccludedPoint = null;
      this.viewOcclusionTimer = 0;
      this.viewClearDirection = 0;
      this.viewClearStart = null;
      this.engagementIdleTimer = 0;
      this.engagementLastShots = 0;
      this.engagementLastDamage = 0;
      this.engagementTargetKey = '';
      this.combatMobilityTimer = 0;
      this.combatBlockedTimer = 0;
      this.combatRecoveryCooldown = 0;
      this.combatRecoveryStage = 0;
      this.combatRecoveryTargetKey = '';
      this.combatRecoveryOrigin = null;
      this.combatRecoveryBestDisplacement = 0;
      this.combatRecoveryLastAt = -999;
      this.combatApproachPath = [];
      this.combatApproachIndex = 0;
      this.combatApproachGoal = null;
      this.combatApproachTargetKey = '';
      this.combatApproachTargetOrigin = null;
      this.combatApproachExpires = 0;
      this.combatApproachReason = '';
      this.combatApproachKind = '';
      this.combatYieldTimer = 0;
      this.combatBlockerKey = '';
      this.combatBlockerType = '';
      this.crouchStationaryTimer = 0;
      this.lastSeen = null;
      this.lastSeenTimer = 0;
      this.searchTimer = 0;
      this.searchBaseAngle = this.angle;
      this.searchLookOffset = 0;
      this.cornerPause = 0;
      this.scanPhase = Math.random() * TAU;
      this.scanStrength = 0.015 + Math.random() * 0.018;
      this.cooldown = 0.3 + Math.random() * 0.35;
      this.flash = 0;
      this.recoil = 0;
      this.weaponHeat = 0;
      this.hurt = 0;
      this.strafeDir = Math.random() < 0.5 ? -1 : 1;
      this.speed = 1.12 + Math.random() * 0.2;
      this.path = [];
      this.pathIndex = 0;
      this.pathGoal = null;
      this.pathRefreshNeeded = false;
      this.repathTimer = 0;
      this.lastPathPlanAt = -999;
      this.pathHoldUntil = 0;
      this.pathLeaseUntil = 0;
      this.pathIntentKey = '';
      this.navigationGoalCandidateKeys = new Set();
      this.navigationPlanFrame = -1;
      this.navigationPlanDeferredFrame = -1;
      this.perceptionScanFrame = -1;
      this.perceptionScanDeferredFrame = -1;
      this.tacticalDecisionFrame = -1;
      this.tacticalDecisionDeferredFrame = -1;
      this.combatRouteCandidateKeys = new Set();
      this.teamSpacingTimer = 0;
      this.teamSpacingCooldown = 0;
      this.teamSpacingDirection = this.angle;
      this.teamSpacingReason = '';
      this.teamSpacingEventCooldown = 0;
      this.stuckTimer = 0;
      this.navigationGapTimer = 0;
      this.navigationPauseRecoveries = 0;
      this.navigationGapRecoveryActive = false;
      this.escapeTimer = 0;
      this.escapeAngle = this.angle;
      this.recoveryCooldown = 0;
      this.moveIntent = 0;
      this.moveBlocked = false;
      this.pathFailures = 0;
      this.lastFailedGoalKey = '';
      this.failedGoalCooldownUntil = 0;
      this.failedGoalAttempts = 0;
      this.objectiveAge = 0;
      this.lastX = this.x;
      this.lastY = this.y;
      this.motion = 0;
      this.moveVelocity = 0;
      this.visualMoveVelocity = 0;
      this.locomotionSpeed = 0;
      this.moveCommandedThisFrame = false;
      this.renderMoveAngle = this.pathAngle;
      this.renderAimAngle = this.angle;
      this.forwardBlend = 0;
      this.strafeBlend = 0;
      this.backpedalBlend = 0;
      this.turnBlend = 0;
      this.shoulderBlend = this.slot % 2 ? -0.18 : 0.18;
      this.weaponReadyBlend = 0.52;
      this.cornerReadyBlend = 0;
      this.bodyLeanBlend = 0;
      this.turnAnticipationBlend = 0;
      this.footPlantBlend = 0;
      this.aimStabilityBlend = 0;
      this.breathingPhase = Math.random() * TAU;
      this.lastCrouchChangeAt = -999;
      this.hitReactionAge = 99;
      this.hitReactionStrength = 0;
      this.hitReactionVertical = 0;
      this.flinchTimer = 0;
      this.flinchDuration = 0;
      this.flinchCooldown = 0;
      this.flinchStrength = 0;
      this.flinchAimOffset = 0;
      this.flinchAge = 99;
      this.deathImpactStrength = 0;
      this.deathPush = 0;
      this.openingPlanId = currentEngagementPlan?.id || '';
      this.openingPlanName = currentEngagementPlan?.name || '';
      this.openingPlanObjective = openingObjectiveForBot(this);
      this.openingPlanUntil = this.openingPlanObjective ? simulationClock + 24 : 0;
      this.liveCommandId = '';
      this.liveCommandName = '';
      this.liveCommandGoal = null;
      this.liveCommandUntil = 0;
      this.liveCommandResponse = 'idle';
      this.liveCommandGoalReached = false;
      this.liveCommandHoldAnchor = null;
      this.liveCommandRoutePlanId = '';
      this.mapRotationGoal = null;
      this.mapRotationExitGoal = null;
      this.mapRotationStage = '';
      this.mapRotationLaneId = '';
      this.mapRotationTargetZone = '';
      this.mapRotationExpires = 0;
      this.mapRotationResumeObjective = null;
      this.mapRotationOpeningCommit = false;
      this.mapRotationCooldown = 7.5 + this.slot * 1.15 + Math.random() * 3.2;
      this.lastPersonalContactAt = simulationClock - 8 - Math.random() * 3;
      this.objective = this.openingPlanObjective ? { ...this.openingPlanObjective } : this.chooseObjective();
      this.burstShots = 0;
      this.burstGap = 0;
      this.heardSound = null;
      this.heardSoundTimer = 0;
      this.lastSoundEventId = soundEventSequence;
      this.hearingRepathCooldown = 0;
      this.lastDamageTime = -999;
      this.stalemateTimer = 0;
      this.movementFatigue = 0;
      this.isSprinting = false;
      this.roundSprintDistance = 0;
      this.footstepDistance = 0;
      this.footstepSide = Math.random() < 0.5 ? 0 : 1;
      this.footstepStrideScale = 0.94 + Math.random() * 0.12;
      this.crouched = false;
      this.crouchBlend = 0;
      this.crouchDecisionTimer = 0.2 + Math.random() * 0.35;
      this.crouchHoldTimer = 0;
      this.lateRoundGoal = null;
      this.lateRoundGoalTimer = 0;
      this.lateRoundGoalAge = 0;
      this.lateRoundSearchPhase = Math.random() * 10;
      this.lateRoundGoalHistory = [];
      this.lateRoundSweepSeed = Math.random() * TAU;
      this.lateRoundLastHeading = this.pathAngle;
      this.lateRoundTargetKey = '';
      this.lateRoundTargetUntil = 0;
      this.huntEvidence = null;
      this.huntClearedSectors = [];
      this.huntGoalSource = 'patrol';
      this.huntStationaryTimer = 0;
      this.huntDecisionSerial = 0;
      this.navProgressGoalKey = '';
      this.navProgressBest = Infinity;
      this.navProgressTimer = 0;
      this.navProgressRecoveries = 0;
      this.navTrail = [{ x: this.x, y: this.y, cell: keyOf(Math.floor(this.x), Math.floor(this.y)), at: simulationClock }];
      this.navTrailSampleTimer = 0;
      this.navigationDetourGoal = null;
      this.navigationDetourTimer = 0;
      this.navigationLoopCooldown = 0;
      this.navigationLoopRecoveries = 0;
      this.steeringAngle = this.pathAngle;
      this.steeringHoldTimer = 0;
      this.tacticalMode = 'advance';
      this.tacticalModeTimer = 0;
      this.tacticalDecisionTimer = 0;
      this.tacticalCommitUntil = 0;
      this.tacticalEnemyKey = '';
      this.lastTacticalReason = 'patrol';
      this.combatCover = null;
      this.combatCoverCooldown = 0;
      this.coverHoldTimer = 0;
      this.peekHoldTimer = 0;
      this.exposureTimer = 0;
      this.combatBurstPause = 0;
      this.combatBurstCount = 0;
      this.combatBurstTarget = 2 + Math.floor(Math.random() * 2);
      this.combatRepositionRequested = false;
      this.repositionCooldown = 0;
      this.flankDirection = Math.random() < 0.5 ? -1 : 1;
      this.tacticalFlankCooldown = 3.5 + Math.random() * 4.5;
      this.tacticalFlankAttempts = 0;
      this.wantsSafeReload = false;
      this.safeReloadTimer = 0;
      this.reloadCoverRequired = false;
      this.reloadCoverSeekRegistered = false;
      this.reloadCoverArrivalRegistered = false;
      this.reloadCoverFallbackRegistered = false;
      this.reloadCoverCommitActive = false;
      this.coordinationRepathCooldown = 0;
      this.coordinationGoal = null;
      this.coordinationGoalReason = '';
      this.coordinationGoalLockTimer = 0;
      this.coordinationHoldTimer = 0;
      this.coordinationWaitTimer = 0;
      this.coordinationActionCooldown = 0;
      this.allyDownIntel = null;
      this.lastEliminationAt = -999;
      this.lastEliminationVictimTeam = null;
      this.multiKillCount = 0;
      this.multiKillLastAt = -999;
      this.roundSupportedTime = 0;
      this.roundIsolatedTime = 0;
      this.roundRegroupActions = 0;
      this.roundTradeAttempts = 0;
      this.roundTradeKills = 0;
      this.roundRoleActions = 0;
      this.roundRouteReplans = 0;
      resetCareerCombatProfile(this);
      if (this.isPlayerOwned) applyCareerToBot(this);
      else applySimulatedCareerToBot(this);
      restoreMatchArmourState(this, carriedArmourState);
      this.matchArmourCarry = null;
      this.weapon = this.primaryWeapon;
      this.usingSecondary = false;
      this.primaryAmmo = this.primaryWeapon.magSize;
      this.primaryReserve = this.primaryWeapon.magSize * 4;
      this.secondaryAmmo = this.secondaryWeapon.magSize;
      this.secondaryReserve = this.secondaryWeapon.magSize * 3;
      this.magAmmo = this.primaryAmmo;
      this.health = this.maxHealth;
      this.roundShotsFired = 0;
      this.roundShotsHit = 0;
      this.roundCriticalHits = 0;
      this.roundHeadshots = 0;
      this.roundCriticalHeadshots = 0;
      this.roundDamageDealt = 0;
      this.roundDamageTaken = 0;
      this.roundArmourAbsorbed = 0;
      this.roundArmourIntegrityLost = 0;
      this.roundArmourBroken = 0;
      this.roundSurvivalTime = 0;
      this.roundReloads = 0;
      this.roundWeaponSwitches = 0;
      this.roundSidearmDraws = 0;
      this.reloadTimer = 0;
      this.reloadDuration = this.primaryWeapon.reloadTime * (this.reloadMultiplier || 1);
      this.reloadProgress = 0;
      this.reloadStartedEmpty = false;
      this.reloadAudioCueMask = 0;
      this.weaponSwapTimer = 0;
      this.weaponSwapDuration = Math.max(0.18, Number(this.primaryWeapon?.switchTime) || 0.54);
      this.weaponSwapTarget = false;
      this.weaponSettleTimer = 0;
      this.hitReaction = 0;
      this.hitDirection = 0;
      this.deathAnim = 0;
      this.animState = 'idle';
      this.animPreviousState = 'idle';
      this.animStateTime = Math.random() * 2;
      this.animTransition = 1;
      this.upperAimBlend = 0;
      this.runBlend = 0;
      this.walkBlend = 0;
    }
    chooseObjective(avoidPoint = this.objective, minDistance = 2.6) {
      const enemySpawns = this.team === TEAM_BLUE ? spawnPoints[TEAM_RED] : spawnPoints[TEAM_BLUE];
      const candidates = [...hotspots, ...enemySpawns];

      // Add a few valid map cells so repeated patrols do not bounce between the
      // same small set of hotspots.
      for (let attempt = 0; attempt < 12; attempt++) {
        const x = 1 + Math.floor(Math.random() * (MAP_W - 2)) + CELL_CENTER;
        const y = 1 + Math.floor(Math.random() * (MAP_H - 2)) + CELL_CENTER;
        if (canStand(x, y, BOT_RADIUS + 0.04)) candidates.push({ x, y });
      }

      const assignedRole = this.playerRole || 'flex';
      const priorityId = this.teamPriorityId || 'trade';
      const entryMate = bots.find(other => other !== this && other.alive && other.team === this.team && other.playerRole === 'entry') || null;
      const teamMates = bots.filter(other => other !== this && other.alive && other.team === this.team);
      const teamCentre = teamMates.length ? teamMates.reduce((centre, other) => ({ x: centre.x + other.x / teamMates.length, y: centre.y + other.y / teamMates.length }), { x: 0, y: 0 }) : null;
      let best = null;
      let bestScore = -Infinity;
      for (const candidate of candidates) {
        const point = nearestWalkablePoint(candidate.x, candidate.y);
        const travelDistance = dist(this, point);
        if (travelDistance < minDistance) continue;
        const directHeading = Math.atan2(point.y - this.y, point.x - this.x);
        const reversal = Math.abs(angleDiff(directHeading, this.pathAngle));

        let score = Math.random() * 2.2 + Math.min(travelDistance, 11) * 0.12;
        // Keep pressure generally moving towards the opposing side of the map.
        score += (this.team === TEAM_BLUE ? point.x - this.x : this.x - point.x) * 0.08;
        score += Math.cos(reversal) * 0.22;
        if (reversal > 2.45) score -= 0.8;
        if (avoidPoint && dist(point, avoidPoint) < 1.8) score -= 4.5;

        // Match roles and manager priorities alter route selection without
        // handing operators hidden enemy positions.
        const ownSideProgress = this.team === TEAM_BLUE ? point.x / Math.max(1, MAP_W) : (MAP_W - point.x) / Math.max(1, MAP_W);
        if (assignedRole === 'anchor') score += (0.54 - ownSideProgress) * 1.35 + (Number(this.holdBias) || 0) * 0.55;
        if (assignedRole === 'support' && entryMate?.objective) score -= dist(point, entryMate.objective) * 0.22;
        if (assignedRole === 'marksman') score += Math.min(2.4, clearanceAlong(point.x, point.y, directHeading, 4.2, BOT_RADIUS + 0.02)) * 0.12;
        if (assignedRole === 'flanker') {
          const lateralSpread = teamMates.length ? teamMates.reduce((sum, mate) => sum + Math.abs(point.y - mate.y), 0) / teamMates.length : 0;
          score += Math.min(2.2, lateralSpread * 0.12) + (Number(this.flankBias) || 0) * 0.55;
        }
        if (priorityId === 'group' && teamCentre) score -= dist(point, teamCentre) * 0.10;
        if (priorityId === 'hold') score += (0.58 - ownSideProgress) * 0.70;

        // Avoid sending several team-mates down the same route or to the
        // exact same destination. Looking only at their current positions let
        // an entire team converge on one choke point and repeatedly jam there.
        for (const other of bots) {
          if (other === this || !other.alive || other.team !== this.team) continue;
          if (dist(other, point) < 1.4) score -= 1.8;
          if (other.objective && dist(other.objective, point) < 2.0) score -= 2.35;
          const otherGoal = other.path && other.path.length ? other.path[other.path.length - 1] : null;
          if (otherGoal && dist(otherGoal, point) < 1.55) score -= 1.4;
        }
        if (score > bestScore) {
          best = point;
          bestScore = score;
        }
      }

      if (best) return best;
      const fallback = enemySpawns[Math.floor(Math.random() * enemySpawns.length)];
      return nearestWalkablePoint(fallback.x, fallback.y);
    }
    summitLayerRotationSelection(force = false, desiredTargetZone = '') {
      if (activeArenaId !== 'summit' || roundEnding || matchEnding || (!force && roundFreezeTimer > 0)) return null;
      if (this.target || this.lastSeen || this.combatApproachGoal || this.navigationDetourGoal || this.lateRoundGoal) return null;
      if ((!force && this.openingPlanObjective) || isUrgentHuntActive() || roundTime <= 34 || (!force && this.mapRotationCooldown > 0)) return null;
      const personalSilence = Math.max(0, simulationClock - (Number(this.lastPersonalContactAt) || 0));
      if (!force && personalSilence < 5.5) return null;

      const requestedZone = String(desiredTargetZone || '').toUpperCase();
      const currentZone = levelZoneAt(this.x, this.y)?.short || 'TRANSIT';
      const teamMates = bots.filter(other => other !== this && other.alive && other.team === this.team);
      const activeRotators = teamMates.filter(other => other.mapRotationGoal && other.mapRotationStage).length;
      const maximumRotators = teamMates.length + 1 >= 4 ? 2 : 1;
      if (!force && activeRotators >= maximumRotators) return null;
      const sameZoneCount = teamMates.filter(other => (levelZoneAt(other.x, other.y)?.short || '') === currentZone).length;
      const weaponRange = Number(this.weapon?.range) || Number(this.preferredRange) || 9;
      const role = this.playerRole || 'flex';
      let best = null;

      for (const route of SUMMIT_LAYER_ROTATION_ROUTES) {
        if (!route.fromZones.includes(currentZone)) continue;
        if (requestedZone && route.targetZone !== requestedZone) continue;
        if (route.id.includes('east') && this.x < 14 && !route.id.startsWith('upper-swing') && !route.id.startsWith('lower-swing')) continue;
        if (route.id.includes('west') && this.x > 22 && !route.id.startsWith('upper-swing') && !route.id.startsWith('lower-swing')) continue;
        if (route.id.endsWith('east') && this.x > 18.5) continue;
        if (route.id.endsWith('west') && this.x < 17.5) continue;
        const targetOccupancy = teamMates.filter(other => (levelZoneAt(other.x, other.y)?.short || '') === route.targetZone).length;
        if (!force && targetOccupancy >= 3) continue;
        const entry = nearestWalkablePoint(route.entry.x, route.entry.y);
        const exit = nearestWalkablePoint(route.exit.x, route.exit.y);
        const approach = findPath(this, entry);
        const traversal = findPath(entry, exit);
        if (!approach?.length || !traversal?.length) continue;
        if (!canStandForNavigation(entry.x, entry.y, BOT_RADIUS) || !canStandForNavigation(exit.x, exit.y, BOT_RADIUS)) continue;

        let score = 0.18 + clamp((personalSilence - 5.5) / 9, 0, 1) * 0.44 + clamp(sameZoneCount / 3, 0, 1) * 0.54;
        if (route.rangeBand === 'long') score += weaponRange >= 10.6 ? 0.38 : weaponRange >= 9.4 ? 0.12 : -0.12;
        if (route.rangeBand === 'short') score += weaponRange <= 8.4 ? 0.40 : weaponRange <= 9.6 ? 0.14 : -0.10;
        if (route.rangeBand === 'medium') score += weaponRange > 8.2 && weaponRange < 11.2 ? 0.24 : 0.08;
        if (route.targetZone === 'CATWALK') score += ({ marksman: 0.34, anchor: 0.20, caller: 0.14, support: 0.06, flex: 0.05, entry: -0.12, flanker: -0.08 }[role] || 0);
        if (route.targetZone === 'MAINT') score += ({ entry: 0.34, flanker: 0.30, flex: 0.12, support: 0.06, caller: 0.02, marksman: -0.18, anchor: -0.10 }[role] || 0);
        if (route.targetZone === 'SKYBRIDGE') score += ({ support: 0.24, flex: 0.22, caller: 0.18, entry: 0.10, flanker: 0.08, anchor: 0.04, marksman: 0.02 }[role] || 0);
        score -= targetOccupancy * 0.16;
        score -= Math.max(0, approach.length - 18) * 0.008;
        score += currentEngagementPlan?.zone === route.targetZone ? 0.12 : 0;
        if (requestedZone === route.targetZone) score += 1.2;
        score += ((this.slot + roundNumber + route.id.length) % 5) * 0.018 + Math.random() * 0.08;
        if (!best || score > best.score) best = { route, entry, exit, approachNodes: approach.length, traversalNodes: traversal.length, score };
      }
      return best;
    }
    beginSummitLayerRotation(force = false, desiredTargetZone = '', openingCommit = false) {
      const selected = this.summitLayerRotationSelection(force, desiredTargetZone);
      if (!selected || (!force && selected.score < 0.70)) {
        if (!force) this.mapRotationCooldown = 2.4 + Math.random() * 2.6;
        return false;
      }
      this.mapRotationResumeObjective = openingCommit && this.openingPlanObjective ? { ...this.openingPlanObjective } : null;
      this.mapRotationOpeningCommit = Boolean(openingCommit);
      this.mapRotationGoal = { ...selected.entry };
      this.mapRotationExitGoal = { ...selected.exit };
      this.mapRotationStage = 'entry';
      this.mapRotationLaneId = selected.route.id;
      this.mapRotationTargetZone = selected.route.targetZone;
      this.mapRotationExpires = simulationClock + (openingCommit ? 30 : 24);
      this.mapRotationCooldown = 17 + Math.random() * 7;
      this.objective = { ...this.mapRotationGoal };
      this.objectiveAge = 0;
      this.tacticalMode = 'reposition';
      this.tacticalModeTimer = 1.4;
      this.lastTacticalReason = openingCommit ? `take stairs toward ${selected.route.targetZone.toLowerCase()}` : `rotate toward ${selected.route.targetZone.toLowerCase()}`;
      this.path = [];
      this.pathIndex = 0;
      this.pathGoal = null;
      this.pathRefreshNeeded = true;
      this.repathTimer = 0;
      combatDebug.summitLayerRotations = (Number(combatDebug.summitLayerRotations) || 0) + 1;
      combatDebug.tacticalRepositions++;
      if (typeof diagnosticLogEvent === 'function') diagnosticLogEvent('summit_layer_rotation', this, {
        stage: 'entry', routeId: this.mapRotationLaneId, targetZone: this.mapRotationTargetZone,
        openingCommit: this.mapRotationOpeningCommit,
        score: Number(selected.score.toFixed(3)), goal: { ...this.mapRotationGoal }, exit: { ...this.mapRotationExitGoal }
      });
      return true;
    }
    cancelSummitLayerRotation(reason = 'summit rotation cancelled') {
      if (!this.mapRotationGoal && !this.mapRotationStage) return false;
      const resume = this.mapRotationResumeObjective ? { ...this.mapRotationResumeObjective } : null;
      this.mapRotationGoal = null;
      this.mapRotationExitGoal = null;
      this.mapRotationStage = '';
      this.mapRotationLaneId = '';
      this.mapRotationTargetZone = '';
      this.mapRotationExpires = 0;
      this.mapRotationResumeObjective = null;
      this.mapRotationOpeningCommit = false;
      this.mapRotationCooldown = Math.max(this.mapRotationCooldown, 6 + Math.random() * 4);
      if (resume) {
        this.openingPlanObjective = { ...resume };
        this.objective = { ...resume };
        this.objectiveAge = 0;
      }
      if (reason) this.lastTacticalReason = reason;
      return true;
    }
    updateSummitLayerRotation() {
      const directThreatDistance = this.target ? dist(this, this.target) : Infinity;
      const openingEmergency = this.mapRotationOpeningCommit && (
        directThreatDistance < 5.2 || simulationClock - (Number(this.lastDamageTime) || -999) < 1.5 || this.health < 58 || isUrgentHuntActive()
      );
      const ordinaryContact = !this.mapRotationOpeningCommit && (this.target || this.lastSeen || this.combatApproachGoal || this.lateRoundGoal || isUrgentHuntActive());
      if (this.mapRotationGoal && (openingEmergency || ordinaryContact)) {
        this.cancelSummitLayerRotation('summit rotation interrupted by confirmed contact');
        return false;
      }
      const failureLimit = this.mapRotationOpeningCommit ? 3 : 1;
      if (this.mapRotationGoal && (simulationClock >= this.mapRotationExpires || this.pathFailures > failureLimit)) {
        this.cancelSummitLayerRotation('summit rotation route abandoned');
        return false;
      }
      if (!this.mapRotationGoal) return this.beginSummitLayerRotation(false);
      if (dist(this, this.mapRotationGoal) >= 0.92) return true;
      if (this.mapRotationStage === 'entry' && this.mapRotationExitGoal) {
        this.mapRotationGoal = { ...this.mapRotationExitGoal };
        this.mapRotationStage = 'traverse';
        this.mapRotationExpires = simulationClock + (this.mapRotationOpeningCommit ? 24 : 19);
        this.objective = { ...this.mapRotationGoal };
        this.objectiveAge = 0;
        this.path = [];
        this.pathIndex = 0;
        this.pathGoal = null;
        this.pathRefreshNeeded = true;
        this.repathTimer = 0;
        this.lastTacticalReason = `commit to ${this.mapRotationTargetZone.toLowerCase()} route`;
        if (typeof diagnosticLogEvent === 'function') diagnosticLogEvent('summit_layer_rotation', this, {
          stage: 'traverse', routeId: this.mapRotationLaneId, targetZone: this.mapRotationTargetZone,
          openingCommit: this.mapRotationOpeningCommit, goal: { ...this.mapRotationGoal }
        });
        return true;
      }
      const routeId = this.mapRotationLaneId;
      const targetZone = this.mapRotationTargetZone;
      const resume = this.mapRotationResumeObjective ? { ...this.mapRotationResumeObjective } : null;
      this.mapRotationGoal = null;
      this.mapRotationExitGoal = null;
      this.mapRotationStage = '';
      this.mapRotationLaneId = '';
      this.mapRotationTargetZone = '';
      this.mapRotationExpires = 0;
      this.mapRotationResumeObjective = null;
      this.mapRotationOpeningCommit = false;
      this.objective = resume || this.chooseObjective(this.objective, 2.8);
      if (resume) this.openingPlanObjective = { ...resume };
      this.objectiveAge = 0;
      this.path = [];
      this.pathIndex = 0;
      this.pathGoal = null;
      this.pathRefreshNeeded = true;
      this.repathTimer = 0;
      this.pathFailures = 0;
      this.lastTacticalReason = `completed ${String(targetZone || 'layer').toLowerCase()} rotation`;
      combatDebug.summitLayerTraversals = (Number(combatDebug.summitLayerTraversals) || 0) + 1;
      if (typeof diagnosticLogEvent === 'function') diagnosticLogEvent('summit_layer_rotation', this, { stage: 'complete', routeId, targetZone });
      return false;
    }
    updateMapSpecificRotation() {
      if (activeArenaId === 'office') return this.updateOfficeCourtyardRotation();
      if (activeArenaId === 'summit') return this.updateSummitLayerRotation();
      return false;
    }
    officeCourtyardRotationScore() {
      if (activeArenaId !== 'office' || roundEnding || matchEnding || roundFreezeTimer > 0) return -Infinity;
      const courtyardPlanActive = currentEngagementPlan?.zone === 'COURTYARD';
      if (this.target || this.lastSeen || this.combatApproachGoal || this.navigationDetourGoal || this.lateRoundGoal) return -Infinity;
      if (this.openingPlanObjective && !courtyardPlanActive) return -Infinity;
      if (this.heardSound && !courtyardPlanActive && simulationClock - (Number(this.heardSoundAt) || 0) < 2.4) return -Infinity;
      if (isUrgentHuntActive() || roundTime <= 34 || this.mapRotationCooldown > 0) return -Infinity;
      const currentZone = levelZoneAt(this.x, this.y)?.short || '';
      if (currentZone === 'COURTYARD') return -Infinity;
      const personalSilence = Math.max(0, simulationClock - (Number(this.lastPersonalContactAt) || 0));
      if (personalSilence < 5.5) return -Infinity;

      const teamMates = bots.filter(other => other !== this && other.alive && other.team === this.team);
      const activeRotators = teamMates.filter(other => other.mapRotationGoal && other.mapRotationStage).length;
      const livingTeam = teamMates.length + 1;
      const maximumRotators = livingTeam >= 4 ? 2 : 1;
      if (activeRotators >= maximumRotators) return -Infinity;
      const sameZoneCount = teamMates.filter(other => (levelZoneAt(other.x, other.y)?.short || '') === currentZone).length;
      const courtyardOccupants = teamMates.filter(other => (levelZoneAt(other.x, other.y)?.short || '') === 'COURTYARD').length;
      if (courtyardOccupants >= 2) return -Infinity;

      const roleBias = {
        flanker: 0.42,
        entry: 0.30,
        flex: 0.26,
        caller: 0.18,
        support: -0.08,
        marksman: -0.12,
        anchor: -0.24
      }[this.playerRole || 'flex'] || 0;
      const planBias = currentEngagementPlan?.zone === 'COURTYARD' ? 0.58 : 0.14;
      const routeStaleness = clamp(this.objectiveAge / 12, 0, 1);
      const silencePressure = clamp((personalSilence - 5.5) / 10, 0, 1);
      const congestionPressure = clamp(sameZoneCount / 3, 0, 1);
      const roundWindow = roundTime > 44 && roundTime < 108 ? 0.22 : 0;
      const slotStagger = ((this.slot + roundNumber) % 5) * 0.025;
      return roleBias + planBias + routeStaleness * 0.50 + silencePressure * 0.58 + congestionPressure * 0.48 + roundWindow + slotStagger + Math.random() * 0.14;
    }
    beginOfficeCourtyardRotation(force = false) {
      if (!force && this.mapRotationCooldown > 0) return false;
      const score = this.officeCourtyardRotationScore();
      if (!force && score < 0.86) {
        this.mapRotationCooldown = 2.2 + Math.random() * 2.8;
        return false;
      }
      if (activeArenaId !== 'office' || roundEnding || matchEnding) return false;
      const laneOffset = (this.slot + roundNumber + Math.floor(simulationClock / 11)) % OFFICE_COURTYARD_ROTATION_LANES.length;
      const ordered = OFFICE_COURTYARD_ROTATION_LANES.slice(laneOffset).concat(OFFICE_COURTYARD_ROTATION_LANES.slice(0, laneOffset));
      const travelEast = this.x < 18 ? true : (this.x > 18 ? false : this.team === TEAM_BLUE);
      let selected = null;
      for (const lane of ordered) {
        const entryRaw = travelEast ? lane.west : lane.east;
        const exitRaw = travelEast ? lane.east : lane.west;
        const entry = nearestWalkablePoint(entryRaw.x, entryRaw.y);
        const exit = nearestWalkablePoint(exitRaw.x, exitRaw.y);
        const approach = findPath(this, entry);
        const crossing = findPath(entry, exit);
        if (!approach?.length || !crossing?.length) continue;
        if (!canStandForNavigation(entry.x, entry.y, BOT_RADIUS) || !canStandForNavigation(exit.x, exit.y, BOT_RADIUS)) continue;
        selected = { lane, entry, exit, approachNodes: approach.length, crossingNodes: crossing.length };
        break;
      }
      if (!selected) {
        this.mapRotationCooldown = 4.5 + Math.random() * 3.0;
        return false;
      }
      this.mapRotationGoal = { ...selected.entry };
      this.mapRotationExitGoal = { ...selected.exit };
      this.mapRotationStage = 'entry';
      this.mapRotationLaneId = selected.lane.id;
      this.mapRotationExpires = simulationClock + 24;
      this.mapRotationCooldown = 18 + Math.random() * 8;
      this.objective = { ...this.mapRotationGoal };
      this.objectiveAge = 0;
      this.tacticalMode = 'reposition';
      this.tacticalModeTimer = 1.4;
      this.lastTacticalReason = 'rotate through central courtyard';
      this.path = [];
      this.pathIndex = 0;
      this.pathGoal = null;
      this.pathRefreshNeeded = true;
      this.repathTimer = 0;
      combatDebug.officeCourtyardRotations = (Number(combatDebug.officeCourtyardRotations) || 0) + 1;
      combatDebug.tacticalRepositions++;
      if (typeof diagnosticLogEvent === 'function') diagnosticLogEvent('office_courtyard_rotation', this, {
        stage: 'entry',
        laneId: this.mapRotationLaneId,
        score: Number.isFinite(score) ? Number(score.toFixed(3)) : null,
        goal: { x: this.mapRotationGoal.x, y: this.mapRotationGoal.y },
        exit: { x: this.mapRotationExitGoal.x, y: this.mapRotationExitGoal.y }
      });
      return true;
    }
    cancelOfficeCourtyardRotation(reason = 'rotation cancelled') {
      if (!this.mapRotationGoal && !this.mapRotationStage) return false;
      this.mapRotationGoal = null;
      this.mapRotationExitGoal = null;
      this.mapRotationStage = '';
      this.mapRotationLaneId = '';
      this.mapRotationTargetZone = '';
      this.mapRotationExpires = 0;
      this.mapRotationCooldown = Math.max(this.mapRotationCooldown, 6 + Math.random() * 4);
      if (reason) this.lastTacticalReason = reason;
      return true;
    }
    updateOfficeCourtyardRotation() {
      // Once committed to a courtyard lane, do not abandon it for a weak sound
      // cue or a transient sight candidate. Confirmed contact, remembered contact,
      // an emergency combat route or late-round urgency can still interrupt it.
      if (this.mapRotationGoal && (this.target || this.lastSeen || this.combatApproachGoal || this.lateRoundGoal || isUrgentHuntActive())) {
        this.cancelOfficeCourtyardRotation('courtyard rotation interrupted by confirmed contact');
        return false;
      }
      if (this.mapRotationGoal && (simulationClock >= this.mapRotationExpires || this.pathFailures > 1)) {
        this.cancelOfficeCourtyardRotation('courtyard rotation route abandoned');
        return false;
      }
      if (!this.mapRotationGoal) return this.beginOfficeCourtyardRotation(false);
      if (dist(this, this.mapRotationGoal) >= 0.92) return true;
      if (this.mapRotationStage === 'entry' && this.mapRotationExitGoal) {
        this.mapRotationGoal = { ...this.mapRotationExitGoal };
        this.mapRotationStage = 'cross';
        this.mapRotationExpires = simulationClock + 18;
        this.objective = { ...this.mapRotationGoal };
        this.objectiveAge = 0;
        this.path = [];
        this.pathIndex = 0;
        this.pathGoal = null;
        this.pathRefreshNeeded = true;
        this.repathTimer = 0;
        this.lastTacticalReason = 'cross courtyard to alternate office lane';
        if (typeof diagnosticLogEvent === 'function') diagnosticLogEvent('office_courtyard_rotation', this, {
          stage: 'cross',
          laneId: this.mapRotationLaneId,
          goal: { x: this.mapRotationGoal.x, y: this.mapRotationGoal.y }
        });
        return true;
      }
      const laneId = this.mapRotationLaneId;
      this.mapRotationGoal = null;
      this.mapRotationExitGoal = null;
      this.mapRotationStage = '';
      this.mapRotationLaneId = '';
      this.mapRotationTargetZone = '';
      this.mapRotationExpires = 0;
      this.objective = this.chooseObjective(this.objective, 2.8);
      this.objectiveAge = 0;
      this.path = [];
      this.pathIndex = 0;
      this.pathGoal = null;
      this.pathRefreshNeeded = true;
      this.repathTimer = 0;
      this.lastTacticalReason = 'completed courtyard rotation';
      combatDebug.officeCourtyardCrossings = (Number(combatDebug.officeCourtyardCrossings) || 0) + 1;
      if (typeof diagnosticLogEvent === 'function') diagnosticLogEvent('office_courtyard_rotation', this, { stage: 'complete', laneId });
      return false;
    }
    chooseInvestigationExit() {
      let best = null;
      let bestScore = -Infinity;
      const enemyDirection = this.team === TEAM_BLUE ? 0 : Math.PI;

      // Prefer an open corridor leaving the last-known position. This keeps the
      // operator searching while moving instead of staring into a nearby wall.
      for (let i = 0; i < 20; i++) {
        const angle = i * TAU / 20;
        const clearance = clearanceAlong(this.x, this.y, angle, 3.1, BOT_RADIUS + 0.025);
        if (clearance < 0.82) continue;
        const travel = Math.min(2.55, clearance - 0.22);
        const point = nearestWalkablePoint(
          this.x + Math.cos(angle) * travel,
          this.y + Math.sin(angle) * travel
        );
        if (dist(this, point) < 0.72) continue;
        const forwardBias = Math.cos(angleDiff(angle, enemyDirection)) * 0.45;
        const turnPenalty = Math.abs(angleDiff(angle, this.pathAngle)) * 0.12;
        const score = clearance + forwardBias - turnPenalty + Math.random() * 0.32;
        if (score > bestScore) {
          best = point;
          bestScore = score;
        }
      }
      return best || this.chooseObjective(this.objective, 2.2);
    }
    rememberLateRoundGoal(goal) {
      if (!goal) return;
      this.lateRoundGoalHistory.push({ x: goal.x, y: goal.y, until: simulationClock + 22 });
      this.lateRoundGoalHistory = this.lateRoundGoalHistory
        .filter(item => item.until > simulationClock)
        .slice(-5);
    }
    rememberHuntEvidence(point, source = 'visual', confidence = 1, enemyKey = '') {
      if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
      const safe = nearestWalkablePoint(point.x, point.y);
      const lifetime = suddenHuntOvertime
        ? (source === 'visual' ? 24 : (source === 'gunshot' ? 18 : 12))
        : (source === 'visual' ? 16 : (source === 'gunshot' ? 11 : 7.5));
      const current = this.huntEvidence;
      const currentStrength = current && current.expiresAt > simulationClock
        ? current.confidence * clamp((current.expiresAt - simulationClock) / Math.max(0.1, current.lifetime), 0, 1)
        : 0;
      if (current && dist(current, safe) < 2.2 && currentStrength > 0.05) {
        const sampleDt = Math.max(0.08, simulationClock - current.at);
        const observedVx = (safe.x - current.x) / sampleDt;
        const observedVy = (safe.y - current.y) / sampleDt;
        const observedSpeed = Math.hypot(observedVx, observedVy);
        const velocityScale = observedSpeed > 2.35 ? 2.35 / observedSpeed : 1;
        const blend = clamp(0.28 + confidence * 0.32, 0.28, 0.68);
        current.vx = lerp(Number(current.vx) || 0, observedVx * velocityScale, 0.46);
        current.vy = lerp(Number(current.vy) || 0, observedVy * velocityScale, 0.46);
        current.x = lerp(current.x, safe.x, blend);
        current.y = lerp(current.y, safe.y, blend);
        const previousConfidence = current.confidence;
        current.confidence = Math.max(current.confidence * 0.82, confidence);
        current.source = confidence >= previousConfidence ? source : current.source;
        current.enemyKey = enemyKey || current.enemyKey;
        current.at = simulationClock;
        current.lifetime = Math.max(current.lifetime, lifetime);
        current.expiresAt = simulationClock + Math.max(lifetime * 0.75, lifetime * current.confidence);
        return;
      }
      let inferredVx = 0;
      let inferredVy = 0;
      if (current && current.expiresAt > simulationClock && (!enemyKey || !current.enemyKey || current.enemyKey === enemyKey)) {
        const sampleDt = Math.max(0.12, simulationClock - current.at);
        inferredVx = (safe.x - current.x) / sampleDt;
        inferredVy = (safe.y - current.y) / sampleDt;
        const inferredSpeed = Math.hypot(inferredVx, inferredVy);
        if (inferredSpeed > 2.35) {
          inferredVx *= 2.35 / inferredSpeed;
          inferredVy *= 2.35 / inferredSpeed;
        }
      }
      this.huntEvidence = {
        x: safe.x,
        y: safe.y,
        vx: inferredVx,
        vy: inferredVy,
        source,
        confidence: clamp(confidence, 0.08, 1),
        enemyKey,
        at: simulationClock,
        lifetime,
        expiresAt: simulationClock + lifetime
      };
    }
    activeHuntEvidence() {
      const evidence = [];
      const add = (memory, scale = 1, shared = false) => {
        if (!memory || memory.expiresAt <= simulationClock) return;
        const age = Math.max(0, simulationClock - memory.at);
        const life = Math.max(0.1, memory.lifetime || (memory.expiresAt - memory.at));
        const freshness = clamp(1 - age / life, 0, 1);
        const confidence = clamp((memory.confidence || 0.2) * scale * (0.32 + freshness * 0.68), 0, 1);
        if (confidence < 0.08) return;
        evidence.push({
          x: memory.x,
          y: memory.y,
          source: shared ? `radio-${memory.source}` : memory.source,
          confidence,
          enemyKey: memory.enemyKey || '',
          vx: Number(memory.vx) || 0,
          vy: Number(memory.vy) || 0,
          shared,
          age
        });
      };
      add(this.huntEvidence, 1, false);
      for (const other of bots) {
        if (other === this || !other.alive || other.team !== this.team) continue;
        add(other.huntEvidence, 0.72, true);
      }
      return evidence;
    }
    markHuntSectorCleared(point, radius = 2.25) {
      if (!point) return;
      this.huntClearedSectors.push({ x: point.x, y: point.y, radius, until: simulationClock + 24 });
      this.huntClearedSectors = this.huntClearedSectors.filter(item => item.until > simulationClock).slice(-9);
    }
    huntClearedPenalty(point) {
      this.huntClearedSectors = this.huntClearedSectors.filter(item => item.until > simulationClock);
      let penalty = 0;
      for (const sector of this.huntClearedSectors) {
        const separation = dist(point, sector);
        if (separation < sector.radius) penalty += (sector.radius - separation) * 1.4;
      }
      return penalty;
    }
    chooseWeightedHuntCandidate(candidates) {
      if (!candidates.length) return null;
      candidates.sort((a, b) => b.score - a.score);
      const shortlist = candidates.slice(0, Math.min(7, candidates.length));
      const best = shortlist[0].score;
      let total = 0;
      for (const candidate of shortlist) {
        candidate.weight = Math.exp(clamp((candidate.score - best) / 1.35, -5, 0)) * (0.78 + Math.random() * 0.44);
        total += candidate.weight;
      }
      let roll = Math.random() * total;
      for (const candidate of shortlist) {
        roll -= candidate.weight;
        if (roll <= 0) return candidate;
      }
      return shortlist[0];
    }
    recordNavigationSample(dt, moved) {
      this.navTrailSampleTimer = Math.max(0, this.navTrailSampleTimer - dt);
      if (moved < 0.015 && this.navTrailSampleTimer > 0) return;
      const cell = keyOf(Math.floor(this.x), Math.floor(this.y));
      const last = this.navTrail[this.navTrail.length - 1];
      const separated = !last || Math.hypot(this.x - last.x, this.y - last.y) >= 0.28;
      const changedCell = !last || last.cell !== cell;
      if (!separated && !changedCell && this.navTrailSampleTimer > 0) return;
      this.navTrail.push({ x: this.x, y: this.y, cell, at: simulationClock });
      this.navTrail = this.navTrail.filter(sample => sample.at >= simulationClock - 18).slice(-48);
      this.navTrailSampleTimer = 0.22;
    }
    routeHistoryPenalty(route, maxAge = 13) {
      if (!route || route.length < 2 || !this.navTrail.length) return 0;
      const recent = this.navTrail.filter(sample => sample.at >= simulationClock - maxAge);
      if (!recent.length) return 0;
      let penalty = 0;
      const routeLimit = Math.min(route.length, 9);
      for (let i = 1; i < routeLimit; i++) {
        const point = route[i];
        const routeCell = keyOf(Math.floor(point.x), Math.floor(point.y));
        for (let j = recent.length - 1; j >= 0; j--) {
          if (recent[j].cell !== routeCell) continue;
          const age = Math.max(0, simulationClock - recent[j].at);
          const freshness = 1 - clamp(age / maxAge, 0, 1);
          penalty += freshness * (i <= 2 ? 0.88 : 0.28);
          break;
        }
      }
      return penalty;
    }
    isNavigationLooping() {
      if (this.navigationLoopCooldown > 0 || !this.navTrail || this.navTrail.length < 7) return false;
      const recent = this.navTrail.filter(sample => sample.at >= simulationClock - 4.6);
      if (recent.length < 7) return false;
      let travelled = 0;
      for (let i = 1; i < recent.length; i++) travelled += Math.hypot(recent[i].x - recent[i - 1].x, recent[i].y - recent[i - 1].y);
      const net = Math.hypot(recent[recent.length - 1].x - recent[0].x, recent[recent.length - 1].y - recent[0].y);
      const uniqueCells = new Set(recent.map(sample => sample.cell)).size;
      return travelled > 2.15 && net < 0.78 && uniqueCells <= 5;
    }
    chooseNavigationBreakoutGoal(preferredGoal) {
      const desiredAngle = preferredGoal
        ? Math.atan2(preferredGoal.y - this.y, preferredGoal.x - this.x)
        : this.pathAngle;
      const recentSamples = this.navTrail.filter(sample => sample.at >= simulationClock - 10);
      const candidates = [];
      const seenCells = new Set();
      const addCandidate = (x, y) => {
        const point = nearestWalkablePoint(x, y);
        const cell = keyOf(Math.floor(point.x), Math.floor(point.y));
        if (seenCells.has(cell) || dist(this, point) < 2.35) return;
        seenCells.add(cell);
        candidates.push(point);
      };

      // Sample a compact fan of reachable exits instead of scanning every map
      // cell. Loop recovery is rare, but it must still be cheap enough to run on
      // a phone without creating a visible hitch.
      for (let i = 0; i < 18; i++) {
        const offset = (i - 8.5) * (TAU / 18);
        const angle = desiredAngle + offset;
        const noise = deterministicNoise((this.slot + 1) * 131 + i * 29 + Math.floor(simulationClock * 0.5));
        const travel = 3.4 + noise * 4.8;
        addCandidate(this.x + Math.cos(angle) * travel, this.y + Math.sin(angle) * travel);
      }
      for (const hotspot of hotspots) {
        if (dist(this, hotspot) > 2.5 && dist(this, hotspot) < 10.5) addCandidate(hotspot.x, hotspot.y);
      }
      if (preferredGoal) addCandidate(preferredGoal.x, preferredGoal.y);

      let best = null;
      let bestScore = -Infinity;
      for (const point of candidates) {
        const route = findPath(this, point);
        if (!route || route.length < 2) continue;
        const routeDistance = pathDistance(route, 1, this);
        if (routeDistance < 2.5 || routeDistance > 13.5) continue;
        const firstStep = route[1] || point;
        const routeHeading = Math.atan2(firstStep.y - this.y, firstStep.x - this.x);
        const reversal = Math.abs(angleDiff(routeHeading, this.pathAngle));
        const historyPenalty = this.routeHistoryPenalty(route, 11);
        const endpointRepeat = recentSamples.reduce((penalty, sample) => {
          const separation = Math.hypot(point.x - sample.x, point.y - sample.y);
          return penalty + (separation < 1.25 ? (1.25 - separation) * 1.1 : 0);
        }, 0);
        const targetAlignment = Math.cos(angleDiff(routeHeading, desiredAngle));
        const goalDistance = preferredGoal ? dist(point, preferredGoal) : 0;
        const clearance = clearanceAlong(point.x, point.y, routeHeading, 1.25, BOT_RADIUS + 0.02);
        const score = routeDistance * 0.12 + targetAlignment * 1.18 + clearance * 0.24
          - historyPenalty * 1.25 - endpointRepeat - goalDistance * 0.035
          - (reversal > 2.2 ? 2.8 : reversal * 0.18);
        if (score > bestScore) {
          best = point;
          bestScore = score;
        }
      }
      return best;
    }
    beginNavigationDetour(preferredGoal) {
      const breakout = this.chooseNavigationBreakoutGoal(preferredGoal);
      if (!breakout) return false;
      this.navigationDetourGoal = breakout;
      this.navigationDetourTimer = 5.2;
      this.navigationLoopCooldown = 6.5;
      this.navigationLoopRecoveries++;
      this.roundRouteReplans = (this.roundRouteReplans || 0) + 1;
      this.path = [];
      this.pathIndex = 0;
      this.pathGoal = null;
      this.pathRefreshNeeded = true;
      this.repathTimer = 0;
      this.navProgressGoalKey = '';
      this.navProgressBest = Infinity;
      this.navProgressTimer = 0;
      this.steeringHoldTimer = 0;
      combatDebug.navigationRecoveries++;
      return true;
    }
    chooseLateRoundGoal() {
      const urgency = isUrgentHuntActive() ? 1 : clamp((secondsSinceCombatContact() - 4) / 18, 0, 1);
      const evidenceItems = this.activeHuntEvidence();
      let evidence = null;
      if (evidenceItems.length) {
        let total = 0;
        const weighted = evidenceItems.map(item => {
          const route = findPath(this, item);
          const routeDistance = route && route.length > 1 ? pathDistance(route, 1, this) : dist(this, item) + 5;
          const weight = Math.max(0.02, item.confidence * (1.35 - Math.min(routeDistance, 14) * 0.035));
          total += weight;
          return { item, weight };
        });
        let roll = Math.random() * total;
        for (const entry of weighted) {
          roll -= entry.weight;
          if (roll <= 0) { evidence = entry.item; break; }
        }
        if (!evidence) evidence = weighted[0].item;
      }

      const candidates = [];
      const seenCells = new Set();
      const addCandidate = (rawPoint, source, sourceStrength = 0) => {
        if (!rawPoint) return;
        const point = nearestWalkablePoint(rawPoint.x, rawPoint.y);
        const cell = keyOf(Math.floor(point.x), Math.floor(point.y));
        if (seenCells.has(cell) || dist(this, point) < 1.45) return;
        seenCells.add(cell);
        candidates.push({ point, source, sourceStrength });
      };

      if (evidence) {
        const radioError = evidence.shared ? lerp(0.55, 1.35, 1 - evidence.confidence) : lerp(0.18, 0.82, 1 - evidence.confidence);
        const projectionTime = clamp(0.65 + urgency * 1.05 + evidence.age * 0.12, 0.55, suddenHuntOvertime ? 3.0 : 2.35) * (evidence.shared ? 0.72 : 1);
        const projectedX = evidence.x + evidence.vx * projectionTime;
        const projectedY = evidence.y + evidence.vy * projectionTime;
        const errorAngle = Math.random() * TAU;
        const errorRadius = Math.random() * radioError;
        const centre = nearestWalkablePoint(projectedX + Math.cos(errorAngle) * errorRadius, projectedY + Math.sin(errorAngle) * errorRadius);
        addCandidate(centre, evidence.source, evidence.confidence);
        const ringRadius = lerp(1.15, 3.25, 1 - evidence.confidence) + urgency * 0.35;
        const ringCount = 10;
        const phase = Math.random() * TAU;
        for (let i = 0; i < ringCount; i++) {
          const angle = phase + i * TAU / ringCount;
          const radius = ringRadius * (0.55 + Math.random() * 0.65);
          addCandidate({ x: centre.x + Math.cos(angle) * radius, y: centre.y + Math.sin(angle) * radius }, evidence.source, evidence.confidence * 0.86);
        }
        for (const hotspot of hotspots) {
          if (dist(hotspot, centre) < ringRadius + 4.0) addCandidate(hotspot, 'near-evidence', evidence.confidence * 0.72);
        }
      } else {
        const enemySpawns = this.team === TEAM_BLUE ? spawnPoints[TEAM_RED] : spawnPoints[TEAM_BLUE];
        const mapCentre = { x: MAP_W * 0.5, y: MAP_H * 0.5 };
        for (const hotspot of hotspots) {
          const centrality = clamp(1 - dist(hotspot, mapCentre) / 18, 0, 1);
          const source = urgency > 0.7 && centrality > 0.48 ? 'contact-hub' : 'map-hypothesis';
          addCandidate(hotspot, source, 0.22 + centrality * urgency * 0.72);
        }
        for (const spawn of enemySpawns) addCandidate(spawn, 'spawn-route', urgency > 0.7 ? 0.10 : 0.18);
        const randomAttempts = urgency > 0.7 ? 12 : 22;
        for (let attempt = 0; attempt < randomAttempts; attempt++) {
          const x = 1 + Math.floor(Math.random() * (MAP_W - 2)) + CELL_CENTER;
          const y = 1 + Math.floor(Math.random() * (MAP_H - 2)) + CELL_CENTER;
          if (canStand(x, y, BOT_RADIUS + 0.03)) addCandidate({ x, y }, 'uncleared-sector', urgency > 0.7 ? 0.09 : 0.16);
        }
      }

      const scored = [];
      const enemyDirection = this.team === TEAM_BLUE ? 0 : Math.PI;
      const committedHeading = Number.isFinite(this.lateRoundLastHeading) ? this.lateRoundLastHeading : this.pathAngle;
      for (const candidate of candidates) {
        const point = candidate.point;
        const route = findPath(this, point);
        if (!route || route.length < 2) continue;
        const routeLength = pathDistance(route, 1, this);
        const maxHuntRoute = evidence ? (suddenHuntOvertime ? 48 : 34) : 18;
        if (routeLength < 1.4 || routeLength > maxHuntRoute) continue;
        const firstStep = route[1] || point;
        const routeHeading = Math.atan2(firstStep.y - this.y, firstStep.x - this.x);
        const reversal = Math.abs(angleDiff(routeHeading, committedHeading));
        const routeHistory = this.routeHistoryPenalty(route, 14);
        const clearedPenalty = this.huntClearedPenalty(point);
        const oldGoalPenalty = this.lateRoundGoalHistory.reduce((penalty, oldGoal) => {
          const separation = dist(point, oldGoal);
          return penalty + (separation < 2.8 ? (2.8 - separation) * 1.25 : 0);
        }, 0);
        let teammatePenalty = 0;
        for (const other of bots) {
          if (other === this || !other.alive || other.team !== this.team || !other.lateRoundGoal) continue;
          const separation = dist(point, other.lateRoundGoal);
          if (separation < 2.7) teammatePenalty += (2.7 - separation) * 0.85;
        }
        const evidenceBias = evidence ? -dist(point, evidence) * lerp(0.22, 0.72, evidence.confidence) : 0;
        const forwardBias = Math.cos(angleDiff(routeHeading, enemyDirection)) * (evidence ? 0.10 : 0.44);
        const continuity = Math.cos(angleDiff(routeHeading, committedHeading)) * 0.48;
        const routeValue = Math.min(routeLength, 11) * 0.10 - Math.max(0, routeLength - 13) * 0.08;
        const urgencyValue = urgency * (1.35 - Math.min(routeLength, 12) * 0.035);
        const reversalPenalty = reversal > 2.35 ? 2.2 : reversal * 0.16;
        const stochasticChoice = (Math.random() - 0.5) * (evidence ? 0.46 : 0.88);
        const score = candidate.sourceStrength * 1.5 + evidenceBias + forwardBias + continuity + routeValue + urgencyValue + stochasticChoice
          - reversalPenalty - routeHistory * 1.05 - clearedPenalty - oldGoalPenalty - teammatePenalty;
        scored.push({ ...candidate, routeHeading, routeLength, score });
      }

      const chosen = this.chooseWeightedHuntCandidate(scored);
      combatDebug.lateRoundGoals++;
      if (chosen) {
        this.lateRoundLastHeading = chosen.routeHeading;
        this.huntGoalSource = chosen.source;
        this.huntDecisionSerial++;
        if (evidence) combatDebug.huntEvidenceGoals++;
        else combatDebug.huntHypothesisGoals++;
        return chosen.point;
      }
      this.huntGoalSource = evidence ? evidence.source : 'patrol-fallback';
      return this.chooseObjective(this.objective, 3.1);
    }

    chooseLateRoundContinuationGoal() {
      return this.chooseLateRoundGoal();
    }

    updateLateRoundGoal(dt) {
      this.lateRoundGoalTimer = Math.max(0, this.lateRoundGoalTimer - dt);
      this.lateRoundGoalHistory = this.lateRoundGoalHistory.filter(item => item.until > simulationClock);
      if (!isLateRoundHuntActive() || this.target || this.lastSeen || this.heardSound) {
        if (this.lateRoundGoal) this.rememberLateRoundGoal(this.lateRoundGoal);
        this.lateRoundGoal = null;
        this.lateRoundGoalAge = 0;
        if (!isLateRoundHuntActive()) {
          this.lateRoundTargetKey = '';
          this.lateRoundTargetUntil = 0;
        }
        return;
      }

      const duel = totalAliveCount() === 2;
      const urgent = isUrgentHuntActive();
      if (this.lateRoundGoal) this.lateRoundGoalAge += dt;
      const reached = this.lateRoundGoal && dist(this, this.lateRoundGoal) < 0.92;
      const routeFailed = this.lateRoundGoal && this.pathFailures > 1 && (!this.path.length || this.pathIndex >= this.path.length);
      const routeStalled = this.lateRoundGoal && this.navProgressRecoveries >= 2;
      const activelyAdvancing = this.lateRoundGoal && this.path.length > 1 && this.pathIndex < this.path.length && this.navProgressRecoveries === 0 && this.pathFailures === 0;
      const expired = this.lateRoundGoalAge > (urgent ? 8.0 : (duel ? 10.0 : 12.0)) && !activelyAdvancing;
      const mayAbandon = routeFailed || routeStalled || (this.lateRoundGoalTimer <= 0 && expired);

      if (!this.lateRoundGoal || reached || mayAbandon) {
        if (this.lateRoundGoal) {
          this.rememberLateRoundGoal(this.lateRoundGoal);
          if (reached) this.markHuntSectorCleared(this.lateRoundGoal);
        }
        this.lateRoundGoal = reached ? this.chooseLateRoundContinuationGoal() : this.chooseLateRoundGoal();
        this.lateRoundGoalTimer = urgent ? 5.0 + Math.random() * 1.4 : (duel ? 6.2 + Math.random() * 1.6 : 7.4 + Math.random() * 2.0);
        this.lateRoundGoalAge = 0;
        this.path = [];
        this.pathIndex = 0;
        this.pathGoal = null;
        this.pathRefreshNeeded = true;
        this.repathTimer = 0;
        this.navProgressGoalKey = '';
        this.navProgressBest = Infinity;
        this.navProgressTimer = 0;
        this.navProgressRecoveries = 0;
      }
    }

    navigationGoalCrowding(point, minimumSeparation = 0.92) {
      let penalty = 0;
      const profile = this.teamSpacingProfile(Boolean(this.target || this.lastSeen));
      const requiredGap = Math.max(minimumSeparation, profile.desiredGap * 0.78);
      const threat = this.target || this.lastSeen || null;
      const candidateThreatBearing = threat ? Math.atan2(point.y - threat.y, point.x - threat.x) : 0;
      const candidateThreatRadius = threat ? dist(point, threat) : 0;
      for (const other of bots) {
        if (!other || other === this || !other.alive || other.team !== this.team) continue;
        const anchors = [
          other,
          other.combatApproachGoal,
          other.combatCover?.anchor,
          other.pathGoal,
          other.coordinationGoal,
          other.path?.[Math.min(Math.max(0, Number(other.pathIndex) || 0) + 1, Math.max(0, (other.path?.length || 1) - 1))]
        ].filter(Boolean);
        for (let index = 0; index < anchors.length; index++) {
          const reserved = anchors[index];
          const separation = dist(point, reserved);
          const weight = index === 0 ? 1.15 : 1;
          if (separation < requiredGap) penalty += ((requiredGap - separation) * 5.0 + 1.25) * weight;
          else if (separation < requiredGap + 0.95) penalty += (requiredGap + 0.95 - separation) * 0.44 * weight;
        }
        if (threat) {
          const otherAnchor = other.combatApproachGoal || other.combatCover?.peek || other.combatCover?.anchor || other.pathGoal || other;
          const otherBearing = Math.atan2(otherAnchor.y - threat.y, otherAnchor.x - threat.x);
          const otherRadius = dist(otherAnchor, threat);
          const angularGap = Math.abs(angleDiff(candidateThreatBearing, otherBearing));
          if (angularGap < 0.30 && Math.abs(candidateThreatRadius - otherRadius) < 1.45) {
            penalty += (0.30 - angularGap) * 5.4 + 0.65;
          }
        }
      }
      return penalty;
    }
    resolveCommittedNavigationGoal(goal, urgent = false) {
      const requested = nearestWalkablePoint(goal.x, goal.y);
      const candidates = [{ ...requested, offset: 0 }];
      const phase = ((this.slot || 0) + this.team * 2) * 0.47;
      const constrained = typeof runtimeQualityTier === 'number' && runtimeQualityTier <= 0;
      const spacingRadius = clamp(this.teamSpacingProfile(Boolean(this.target || this.lastSeen)).desiredGap * 1.06, 0.78, 1.62);
      const radii = urgent
        ? (constrained ? [0.62, spacingRadius] : [0.50, 0.88, spacingRadius, Math.min(1.88, spacingRadius + 0.42)])
        : (constrained ? [spacingRadius] : [0.66, spacingRadius, Math.min(1.82, spacingRadius + 0.34)]);
      const directions = constrained ? 6 : 8;
      for (const radius of radii) {
        for (let index = 0; index < directions; index++) {
          const angle = phase + index * TAU / directions;
          const point = {
            x: requested.x + Math.cos(angle) * radius,
            y: requested.y + Math.sin(angle) * radius
          };
          if (canStand(point.x, point.y, BOT_RADIUS + 0.018)) candidates.push({ ...point, offset: radius });
        }
      }
      let best = requested;
      let bestScore = Infinity;
      const seen = this.navigationGoalCandidateKeys;
      seen.clear();
      for (const candidate of candidates) {
        const key = `${Math.round(candidate.x * 4)}:${Math.round(candidate.y * 4)}`;
        if (seen.has(key) || !canStand(candidate.x, candidate.y, BOT_RADIUS + 0.018)) continue;
        seen.add(key);
        const displacement = Math.hypot(candidate.x - requested.x, candidate.y - requested.y);
        const crowding = this.navigationGoalCrowding(candidate, urgent ? 0.86 : 0.96);
        const localClearance = Math.min(
          clearanceAlong(candidate.x, candidate.y, 0, 0.72, BOT_RADIUS * 0.78),
          clearanceAlong(candidate.x, candidate.y, Math.PI / 2, 0.72, BOT_RADIUS * 0.78),
          clearanceAlong(candidate.x, candidate.y, Math.PI, 0.72, BOT_RADIUS * 0.78),
          clearanceAlong(candidate.x, candidate.y, -Math.PI / 2, 0.72, BOT_RADIUS * 0.78)
        );
        const score = displacement * 0.68 + crowding - localClearance * 0.12;
        if (score < bestScore) { bestScore = score; best = { x: candidate.x, y: candidate.y }; }
      }
      return best;
    }
    ensurePath(goal) {
      const urgentPlan = Boolean(this.lastSeen || this.heardSound || this.combatApproachGoal || this.navigationDetourGoal || isUrgentHuntActive());
      const safeGoal = this.resolveCommittedNavigationGoal(goal, urgentPlan);
      let resolvedGoal = safeGoal;
      const failedGoalKey = `${Math.round(safeGoal.x * 4) / 4}:${Math.round(safeGoal.y * 4) / 4}`;
      if (this.lastFailedGoalKey === failedGoalKey && simulationClock < this.failedGoalCooldownUntil) {
        this.pathRefreshNeeded = true;
        this.repathTimer = Math.max(this.repathTimer, Math.min(0.28, this.failedGoalCooldownUntil - simulationClock));
        return false;
      }
      if (typeof consumeNavigationPlanSlot === 'function' && !consumeNavigationPlanSlot(this, urgentPlan)) {
        this.pathRefreshNeeded = true;
        this.repathTimer = Math.max(this.repathTimer, 0.022 + (Math.max(0, Number(this.slot) || 0) % 5) * 0.004);
        return false;
      }
      // findPath resolves a valid destination in the mover's connected static
      // navigation component before running A*. This replaces the previous
      // many-search fallback ring, which could execute dozens of complete A*
      // searches during one failed request and cause long mobile main-thread stalls.
      const path = findPath(this, resolvedGoal);
      if (path?.resolvedGoal) resolvedGoal = { x: path.resolvedGoal.x, y: path.resolvedGoal.y };
      if (path && path.length === 1) {
        // Reaching a goal in the current grid cell is completion, not a pathfinding
        // failure. Release the relevant goal immediately so it cannot be selected
        // every frame and appear as pacing around one cell.
        this.path = [];
        this.pathIndex = 0;
        this.pathGoal = null;
        if (this.navigationDetourGoal && dist(resolvedGoal, this.navigationDetourGoal) < 0.7) {
          this.navigationDetourGoal = null;
          this.navigationDetourTimer = 0;
        } else if (this.lateRoundGoal && dist(resolvedGoal, this.lateRoundGoal) < 0.7) {
          this.rememberLateRoundGoal(this.lateRoundGoal);
          this.lateRoundGoal = null;
          this.lateRoundGoalTimer = 0;
          this.lateRoundGoalAge = 0;
        } else {
          this.objective = this.chooseObjective(resolvedGoal, 2.8);
          this.objectiveAge = 0;
        }
        this.repathTimer = 0.08;
        this.lastPathPlanAt = simulationClock;
        this.pathHoldUntil = simulationClock + 0.18;
        this.lastFailedGoalKey = '';
        this.failedGoalCooldownUntil = 0;
        this.failedGoalAttempts = 0;
        return true;
      }
      if (path && path.length > 1) {
        path[0] = { x: this.x, y: this.y };
        this.path = prepareNavigationPath(path);
        this.pathIndex = 1;
        this.pathGoal = { x: resolvedGoal.x, y: resolvedGoal.y };
        this.pathRefreshNeeded = false;
        // Stable routes stop the camera from changing its mind at every corner.
        // A route is now refreshed when the goal changes or movement is blocked,
        // rather than on a short repeating timer.
        this.repathTimer = this.lastSeen ? 0.82 + Math.random() * 0.42 : 1.72 + Math.random() * 0.68;
        this.lastPathPlanAt = simulationClock;
        this.pathHoldUntil = simulationClock + (urgentPlan ? 0.58 : 0.92);
        this.pathLeaseUntil = simulationClock + (urgentPlan ? 0.82 : 1.45);
        this.pathIntentKey = `${Math.round(resolvedGoal.x * 2)}:${Math.round(resolvedGoal.y * 2)}`;
        this.pathFailures = 0;
        this.lastFailedGoalKey = '';
        this.failedGoalCooldownUntil = 0;
        this.failedGoalAttempts = 0;
        this.navProgressGoalKey = '';
        this.navProgressBest = Infinity;
        this.navProgressTimer = 0;
      } else {
        // Never fall back to a direct line that can cross a wall. Pick a fresh,
        // sufficiently distant destination instead of repeatedly selecting the
        // same unreachable or already-reached point.
        this.path = [];
        this.pathIndex = 0;
        this.pathGoal = null;
        this.pathRefreshNeeded = false;
        this.pathFailures++;
        this.failedGoalAttempts = this.lastFailedGoalKey === failedGoalKey ? this.failedGoalAttempts + 1 : 1;
        this.lastFailedGoalKey = failedGoalKey;
        this.failedGoalCooldownUntil = simulationClock + Math.min(1.15, 0.28 + this.failedGoalAttempts * 0.18);
        this.roundRouteReplans = (this.roundRouteReplans || 0) + 1;
        combatDebug.pathFailures++;
        if (typeof diagnosticRecordPathFailure === 'function') diagnosticRecordPathFailure(this, resolvedGoal, this.pathFailures);
        if (this.navigationDetourGoal && dist(resolvedGoal, this.navigationDetourGoal) < 0.8) {
          this.navigationDetourGoal = null;
          this.navigationDetourTimer = 0;
        } else if (this.lateRoundGoal && dist(resolvedGoal, this.lateRoundGoal) < 0.8 && this.pathFailures >= 2) {
          this.rememberLateRoundGoal(this.lateRoundGoal);
          this.lateRoundGoal = null;
          this.lateRoundGoalTimer = 0;
          this.lateRoundGoalAge = 0;
          this.navProgressRecoveries = Math.max(this.navProgressRecoveries, 2);
        } else if (!this.lastSeen && !this.heardSound) {
          this.objective = this.chooseObjective(resolvedGoal, 2.8);
          this.objectiveAge = 0;
        }
        this.repathTimer = 0.12 + Math.min(0.28, this.pathFailures * 0.04);
        this.pathHoldUntil = 0;
        this.pathLeaseUntil = 0;
        this.pathIntentKey = '';
      }
      return Boolean(path && path.length);
    }

    currentReserve() {
      return this.usingSecondary ? this.secondaryReserve : this.primaryReserve;
    }
    storeCurrentMagazine() {
      if (this.usingSecondary) this.secondaryAmmo = this.magAmmo;
      else this.primaryAmmo = this.magAmmo;
    }
    emitReloadAudioCue(type, bit, label, loudness = 1) {
      if (this.reloadAudioCueMask & bit) return false;
      this.reloadAudioCueMask |= bit;
      emitCosmeticSound(type, this, loudness, { radius: AUDIO_EVENT_PROFILES[type]?.radius });
      combatDebug.reloadAudioCues++;
      if (combatDebug.reloadAudioCueCounts && label in combatDebug.reloadAudioCueCounts) combatDebug.reloadAudioCueCounts[label]++;
      combatDebug.lastReloadAudioCue = {
        operator: this.name,
        weapon: this.weapon?.id || this.weapon?.name || 'unknown',
        profile: typeof weaponReloadAudioProfile === 'function' ? weaponReloadAudioProfile(this) : (this.weapon?.reloadAudioProfile || 'unknown'),
        cue: label,
        progress: Math.round((this.reloadProgress || 0) * 1000) / 1000,
        simulationTime: Math.round(simulationClock * 1000) / 1000
      };
      return true;
    }
    updateReloadAudioCues(previousProgress = 0, currentProgress = this.reloadProgress) {
      if (this.reloadTimer <= 0 && currentProgress < 1) return;
      const previous = clamp(Number(previousProgress) || 0, 0, 1);
      const current = clamp(Number(currentProgress) || 0, 0, 1);
      const crossed = threshold => previous < threshold && current >= threshold;
      if (crossed(0.18)) this.emitReloadAudioCue('reloadMagazineOut', 2, 'magazineOut', this.usingSecondary ? 0.80 : 0.96);
      if (crossed(0.50)) this.emitReloadAudioCue('reloadMagazineIn', 4, 'magazineIn', this.usingSecondary ? 0.80 : 0.94);
      if (crossed(0.69)) this.emitReloadAudioCue('reloadMagazineSeat', 8, 'magazineSeat', this.usingSecondary ? 0.84 : 1.00);
      if (crossed(0.84)) this.emitReloadAudioCue('reloadRack', 16, 'rack', this.reloadStartedEmpty ? 1.04 : 0.90);
    }
    hasUsableAlternateWeapon() {
      const primaryId = this.primaryWeapon?.id || this.primaryWeapon?.name || '';
      const secondaryId = this.secondaryWeapon?.id || this.secondaryWeapon?.name || '';
      if (!this.hasDedicatedPrimary || !primaryId || !secondaryId || primaryId === secondaryId) return false;
      return this.usingSecondary ? this.primaryAmmo > 0 : this.secondaryAmmo > 0;
    }
    reloadNeedsCover() {
      return this.reloadTimer > 0 && !this.hasUsableAlternateWeapon();
    }
    registerReloadCoverIntent(threat = null) {
      if (!this.reloadNeedsCover()) {
        this.reloadCoverRequired = false;
        return false;
      }
      this.reloadCoverRequired = true;
      const knownThreat = threat || (this.lastSeenTimer > 0 ? this.lastSeen : null);
      if (!knownThreat) return false;
      const atCover = Boolean(this.combatCover && dist(this, this.combatCover.anchor) <= 0.46);
      const exposed = !atCover && hasLineOfSight(this, knownThreat);
      if (atCover) {
        this.tacticalMode = 'reload';
        if (!this.reloadCoverArrivalRegistered) {
          this.reloadCoverArrivalRegistered = true;
          combatDebug.reloadCoverArrivals++;
          if (typeof diagnosticLogEvent === 'function') diagnosticLogEvent('reload_cover_reached', this, {
            weaponId: this.weapon?.id || null,
            reloadProgress: Math.round((Number(this.reloadProgress) || 0) * 1000) / 1000
          });
        }
        return true;
      }
      if (!exposed && simulationClock - (Number(this.lastDamageTime) || -999) > 1.4) return false;
      this.wantsSafeReload = true;
      this.tacticalDecisionTimer = 0;
      this.lastTacticalReason = 'reload without available sidearm';
      if (!this.reloadCoverSeekRegistered) {
        this.reloadCoverSeekRegistered = true;
        combatDebug.reloadCoverSeeks++;
        if (typeof diagnosticLogEvent === 'function') diagnosticLogEvent('reload_cover_seek', this, {
          weaponId: this.weapon?.id || null,
          hasUsableAlternate: false,
          exposed
        });
      }
      return true;
    }
    applyCombatFlinch(hit = {}, roll = Math.random()) {
      if (!this.alive || this.health <= 0) return { triggered: false, reason: 'fatal', chance: 0 };
      if ((Number(this.flinchCooldown) || 0) > 0) {
        combatDebug.flinchCooldownBlocks++;
        return { triggered: false, reason: 'cooldown', chance: 0 };
      }
      const appliedDamage = Math.max(0, Number(hit.appliedDamage) || 0);
      const absorbed = Math.max(0, Number(hit.armourAbsorbed) || 0);
      const totalImpact = appliedDamage + absorbed * 0.28;
      const damageRatio = totalImpact / Math.max(1, Number(this.maxHealth) || 100);
      const resilience = clamp((Number(this.rpgStats?.resilience) || 0) / 10, 0, 1);
      const armourShare = absorbed / Math.max(1, appliedDamage + absorbed);
      const critical = Boolean(hit.critical);
      const headshot = Boolean(hit.headshot);
      const chance = clamp(0.045 + damageRatio * 1.08 + (critical ? 0.13 : 0) + (headshot ? 0.17 : 0) - resilience * 0.11 - armourShare * 0.075, 0.035, 0.44);
      if (Number(roll) >= chance) return { triggered: false, reason: 'roll', chance };
      const strength = clamp(0.24 + damageRatio * 2.0 + (critical ? 0.16 : 0) + (headshot ? 0.18 : 0) - armourShare * 0.08, 0.24, 0.96);
      const duration = clamp(0.095 + strength * 0.13, 0.11, 0.22);
      const direction = Number(hit.direction) || Number(this.hitDirection) || 1;
      this.flinchDuration = duration;
      this.flinchTimer = Math.max(Number(this.flinchTimer) || 0, duration);
      this.flinchCooldown = 0.58 + (1 - strength) * 0.24;
      this.flinchStrength = Math.max(Number(this.flinchStrength) || 0, strength);
      this.flinchAimOffset = direction * (0.028 + strength * 0.075);
      this.flinchAge = 0;
      this.burstShots = 0;
      this.burstGap = Math.max(Number(this.burstGap) || 0, duration);
      this.combatBurstPause = Math.max(Number(this.combatBurstPause) || 0, 0.10 + duration * 0.55);
      this.cooldown = Math.max(Number(this.cooldown) || 0, 0.055 + duration * 0.45);
      this.aimStabilityBlend = Math.min(Number(this.aimStabilityBlend) || 0, 0.42);
      combatDebug.flinchEvents++;
      if (typeof diagnosticLogEvent === 'function') diagnosticLogEvent('operator_flinched', this, {
        chance: Math.round(chance * 1000) / 1000,
        strength: Math.round(strength * 1000) / 1000,
        duration: Math.round(duration * 1000) / 1000,
        appliedDamage: Math.round(appliedDamage * 10) / 10,
        critical,
        headshot
      });
      return { triggered: true, chance, strength, duration };
    }
    beginReload() {
      if (!this.alive || this.reloadTimer > 0 || this.weaponSwapTimer > 0) return false;
      const reserve = this.currentReserve();
      if (reserve <= 0 || this.magAmmo >= this.weapon.magSize) return false;
      this.reloadDuration = this.weapon.reloadTime * (this.reloadMultiplier || 1);
      this.reloadTimer = this.reloadDuration;
      this.roundReloads = (this.roundReloads || 0) + 1;
      this.reloadProgress = 0;
      this.reloadStartedEmpty = this.magAmmo <= 0;
      this.reloadAudioCueMask = 0;
      this.reloadCoverRequired = !this.hasUsableAlternateWeapon();
      this.reloadCoverSeekRegistered = false;
      this.reloadCoverArrivalRegistered = false;
      this.reloadCoverFallbackRegistered = false;
      this.reloadCoverCommitActive = false;
      if (this.wantsSafeReload) combatDebug.safeReloads++;
      this.tacticalMode = this.combatCover ? 'reload' : this.tacticalMode;
      this.burstShots = 0;
      this.weaponHeat *= 0.42;
      this.flash = 0;
      this.emitReloadAudioCue('reloadRelease', 1, 'release', this.usingSecondary ? 0.82 : 1.00);
      if (this === bots[spectatorIndex]) muzzle = 0;
      return true;
    }
    finishReload() {
      const missing = Math.max(0, this.weapon.magSize - this.magAmmo);
      if (this.usingSecondary) {
        const moved = Math.min(missing, this.secondaryReserve);
        this.secondaryReserve -= moved;
        this.magAmmo += moved;
        this.secondaryAmmo = this.magAmmo;
      } else {
        const moved = Math.min(missing, this.primaryReserve);
        this.primaryReserve -= moved;
        this.magAmmo += moved;
        this.primaryAmmo = this.magAmmo;
      }
      this.reloadTimer = 0;
      this.reloadProgress = 0;
      this.wantsSafeReload = false;
      this.safeReloadTimer = 0;
      this.reloadCoverRequired = false;
      this.reloadCoverSeekRegistered = false;
      this.reloadCoverArrivalRegistered = false;
      this.reloadCoverFallbackRegistered = false;
      if (this.combatCover) {
        const reachedCover = dist(this, this.combatCover.anchor) <= 0.42;
        this.reloadCoverCommitActive = !reachedCover;
        this.tacticalMode = reachedCover ? 'hold' : 'cover';
        this.coverHoldTimer = reachedCover ? 0.36 + Math.random() * 0.34 : 0;
      } else {
        this.reloadCoverCommitActive = false;
      }
      this.reloadStartedEmpty = false;
    }
    beginWeaponSwitch(toSecondary) {
      if (!this.alive || this.reloadTimer > 0 || this.weaponSwapTimer > 0 || this.usingSecondary === toSecondary) return false;
      this.storeCurrentMagazine();
      this.weaponSwapTarget = Boolean(toSecondary);
      if (toSecondary) {
        this.wantsSafeReload = false;
        this.safeReloadTimer = 0;
      }
      const targetWeapon = toSecondary ? this.secondaryWeapon : this.primaryWeapon;
      this.weaponSwapDuration = Math.max(0.18, Number(targetWeapon?.switchTime) || (toSecondary ? 0.30 : 0.54));
      this.weaponSwapTimer = this.weaponSwapDuration;
      this.burstShots = 0;
      this.weaponHeat *= 0.28;
      this.flash = 0;
      emitCosmeticSound('weaponSwitch', this, 1);
      if (this === bots[spectatorIndex]) muzzle = 0;
      return true;
    }
    finishWeaponSwitch() {
      this.usingSecondary = this.weaponSwapTarget;
      this.weapon = this.usingSecondary ? this.secondaryWeapon : this.primaryWeapon;
      this.magAmmo = this.usingSecondary ? this.secondaryAmmo : this.primaryAmmo;
      if (typeof refreshBotActiveWeaponHandling === 'function') refreshBotActiveWeaponHandling(this);
      this.reloadDuration = this.weapon.reloadTime * (this.reloadMultiplier || 1);
      this.weaponSettleTimer = Math.max(this.weaponSettleTimer || 0, Math.max(0.08, Number(this.weapon?.sprintSettlePenalty) || 0.02) * 2.4);
      this.roundWeaponSwitches = Math.max(0, Number(this.roundWeaponSwitches) || 0) + 1;
      if (this.usingSecondary) this.roundSidearmDraws = Math.max(0, Number(this.roundSidearmDraws) || 0) + 1;
      if (typeof diagnosticLogEvent === 'function') diagnosticLogEvent('weapon_switched', this, {
        slot: this.usingSecondary ? 'sidearm' : 'primary',
        weaponId: this.weapon?.id || null,
        weaponName: this.weapon?.name || null,
        reason: this.lastTacticalReason || 'weapon handling decision'
      });
      this.weaponSwapTimer = 0;
    }
    updateWeaponState(dt, visibleEnemy) {
      if (this.weaponSwapTimer > 0) {
        this.weaponSwapTimer = Math.max(0, this.weaponSwapTimer - dt);
        if (this.weaponSwapTimer <= 0) this.finishWeaponSwitch();
      }
      if (this.reloadTimer > 0) {
        const previousReloadProgress = this.reloadProgress;
        this.reloadTimer = Math.max(0, this.reloadTimer - dt);
        this.reloadProgress = 1 - this.reloadTimer / Math.max(0.001, this.reloadDuration);
        this.updateReloadAudioCues(previousReloadProgress, this.reloadProgress);
        if (this.reloadTimer > 0) this.registerReloadCoverIntent(visibleEnemy);
        if (this.reloadTimer <= 0) this.finishReload();
      }
      this.weaponSettleTimer = Math.max(0, (Number(this.weaponSettleTimer) || 0) - dt);
      if (!this.alive || this.reloadTimer > 0 || this.weaponSwapTimer > 0) return;

      const threatDistance = visibleEnemy ? dist(this, visibleEnemy) : Infinity;
      const reserve = this.currentReserve();
      const ammoRatio = this.magAmmo / Math.max(1, this.weapon.magSize);
      const healthRatio = this.health / Math.max(1, this.maxHealth || 100);
      const hasPrimaryChoice = Boolean(this.hasDedicatedPrimary && this.primaryWeapon?.id !== this.secondaryWeapon?.id);
      const sidearmHandlingAdvantage = (Number(this.secondaryWeapon?.handling) || 0) - (Number(this.primaryWeapon?.handling) || 0);
      const closeEmergency = visibleEnemy && threatDistance <= Math.min(4.5, Math.max(3.1, (Number(this.secondaryWeapon?.range) || 7.2) * 0.58));
      const unsettledPrimary = (Number(this.weaponSettleTimer) || 0) > 0.04 || Math.abs(Number(this.turnBlend) || 0) > 0.48 || Boolean(this.isSprinting);

      if (hasPrimaryChoice && !this.usingSecondary && closeEmergency && sidearmHandlingAdvantage >= 0.10 && (unsettledPrimary || this.primaryAmmo <= 3)) {
        this.beginWeaponSwitch(true);
        this.lastTacticalReason = 'draw sidearm for close contact';
        return;
      }
      if (hasPrimaryChoice && this.usingSecondary && visibleEnemy && threatDistance > Math.min(Number(this.primaryWeapon?.range) || 10, (Number(this.secondaryWeapon?.range) || 7.2) * 0.92) && this.primaryAmmo > 0) {
        this.beginWeaponSwitch(false);
        this.lastTacticalReason = 'return to primary for range';
        return;
      }

      if (this.magAmmo <= 0) {
        if (hasPrimaryChoice && !this.usingSecondary && this.secondaryAmmo > 0 && threatDistance < 6.2) {
          this.lastTacticalReason = 'draw sidearm while primary empty';
          this.beginWeaponSwitch(true);
        } else if (visibleEnemy) {
          // Do not calmly reload in an exposed firing lane. The tactical mover
          // first attempts to break line of sight, then reloads from cover. A
          // timed fallback prevents an operator with no escape from freezing.
          this.wantsSafeReload = true;
          this.tacticalDecisionTimer = 0;
          if (this.safeReloadTimer > 3.2) this.beginReload();
        } else {
          this.beginReload();
        }
        return;
      }

      if (hasPrimaryChoice && this.usingSecondary && !visibleEnemy && (this.primaryAmmo > 0 || this.primaryReserve > 0)) {
        // A previously emptied primary must still be selected so it can be
        // reloaded. Requiring primaryAmmo > 0 left operators on the sidearm for
        // the remainder of a round after one emergency weapon swap.
        this.lastTacticalReason = this.primaryAmmo > 0 ? 'return to primary after danger' : 'return to primary to reload';
        this.beginWeaponSwitch(false);
        return;
      }

      if (visibleEnemy && reserve > 0 && ammoRatio <= 0.22 && (healthRatio < 0.68 || ammoRatio <= 0.12)) {
        this.wantsSafeReload = true;
        this.tacticalDecisionTimer = 0;
      }

      const safeToTopOff = !visibleEnemy && !this.sightCandidate && !this.target;
      const safelyObscured = !this.lastSeen
        || !hasLineOfSight(this, this.lastSeen)
        || (this.combatCover && dist(this, this.combatCover.anchor) < 0.42);
      if (!visibleEnemy && this.wantsSafeReload && reserve > 0 && (safelyObscured || this.safeReloadTimer > 3.2)) {
        this.beginReload();
      } else if (safeToTopOff && !this.lastSeen && !this.heardSound && this.magAmmo <= Math.ceil(this.weapon.magSize * 0.28)) {
        this.beginReload();
      }
    }
    updateAnimationState(dt, visibleEnemy) {
      const presentedVelocity = Number.isFinite(this.visualMoveVelocity) ? this.visualMoveVelocity : this.moveVelocity;
      const speedNorm = clamp(presentedVelocity / Math.max(0.001, this.speed), 0, 1.2);
      const moving = speedNorm > 0.08;
      let next = 'idle';
      if (!this.alive) next = 'death';
      else if (this.weaponSwapTimer > 0) next = 'switch';
      else if (this.reloadTimer > 0) next = 'reload';
      else if (this.crouched && moving) next = 'crouch-walk';
      else if (this.crouched) next = 'crouch-idle';
      else if (moving && speedNorm > 0.78 && !visibleEnemy) next = 'run';
      else if (moving && visibleEnemy) next = 'aim-walk';
      else if (moving) next = 'walk';
      else if (visibleEnemy || this.sightCandidate) next = 'aim-idle';
      if (next !== this.animState) {
        this.animPreviousState = this.animState;
        this.animState = next;
        this.animStateTime = 0;
        this.animTransition = 0;
      } else {
        this.animStateTime += dt;
      }
      this.animTransition = Math.min(1, this.animTransition + dt * 7.0);
      const readyTarget = clamp(Number(this.weaponReadyBlend) || 0, 0, 1);
      this.upperAimBlend = lerp(this.upperAimBlend, readyTarget, animationBlendFactor(7.2, dt));
      this.runBlend = lerp(this.runBlend, next === 'run' ? 1 : 0, animationBlendFactor(next === 'run' ? 5.4 : 4.2, dt));
      this.walkBlend = lerp(this.walkBlend, moving ? 1 : 0, animationBlendFactor(moving ? 7.0 : 4.8, dt));
      const leanTarget = clamp((Number(this.strafeBlend) || 0) * 0.095 + (Number(this.turnBlend) || 0) * 0.070 - (Number(this.backpedalBlend) || 0) * 0.025, -0.16, 0.16);
      const turnTarget = clamp(angleDiff(this.renderAimAngle, this.renderMoveAngle) / 0.72, -1, 1);
      const plantTarget = moving ? 1 - Math.min(1, Math.abs(Math.sin(this.walkCycle || 0))) : 1;
      const stabilityTarget = clamp((this.crouched ? 0.34 : 0) + (1 - speedNorm) * 0.72 + (visibleEnemy ? 0.16 : 0), 0, 1);
      this.bodyLeanBlend = lerp(Number(this.bodyLeanBlend) || 0, leanTarget, animationBlendFactor(moving ? 8.4 : 5.6, dt));
      this.turnAnticipationBlend = lerp(Number(this.turnAnticipationBlend) || 0, turnTarget, animationBlendFactor(6.8, dt));
      this.footPlantBlend = lerp(Number(this.footPlantBlend) || 0, plantTarget, animationBlendFactor(10.0, dt));
      this.aimStabilityBlend = lerp(Number(this.aimStabilityBlend) || 0, stabilityTarget, animationBlendFactor(5.4, dt));
      this.breathingPhase = (Number(this.breathingPhase) || 0) + dt * (visibleEnemy ? 1.9 : 1.25);
    }
    livingTeamMates() {
      return bots.filter(other => other !== this && other.alive && other.team === this.team);
    }
    teamSupportContext() {
      const mates = this.livingTeamMates();
      let nearest = null;
      let nearestDistance = Infinity;
      for (const mate of mates) {
        const distance = dist(this, mate);
        if (distance < nearestDistance) { nearest = mate; nearestDistance = distance; }
      }
      const radius = Math.max(2.3, Number(this.supportRadius) || 3.55);
      return { mates, nearest, nearestDistance, radius, supported: nearestDistance <= radius };
    }
    teamSpacingProfile(contact = false) {
      const priority = this.teamPriorityId || 'trade';
      const role = this.playerRole || 'flex';
      let desiredGap = 1.02 + clamp(Number(this.spacingBias) || 0, -0.18, 0.18) * 2.2;
      if (priority === 'group') desiredGap -= 0.18;
      else if (priority === 'flank') desiredGap += 0.24;
      else if (priority === 'hold') desiredGap += 0.10;
      else if (priority === 'trade') desiredGap += 0.04;
      if (role === 'flanker') desiredGap += 0.20;
      else if (role === 'marksman') desiredGap += 0.14;
      else if (role === 'entry') desiredGap -= 0.05;
      else if (role === 'support') desiredGap += 0.04;
      if (contact) desiredGap += 0.06;
      desiredGap = clamp(desiredGap, 0.80, 1.52);
      return {
        desiredGap,
        clusterRadius: Math.max(1.18, desiredGap * 1.28),
        severeGap: Math.min(0.68, desiredGap * 0.64),
        priority,
        role
      };
    }
    teamSpacingContext(threat = null) {
      const profile = this.teamSpacingProfile(Boolean(threat));
      const mates = this.livingTeamMates();
      let nearest = null;
      let nearestDistance = Infinity;
      let nearCount = 0;
      let centreX = 0;
      let centreY = 0;
      let centreCount = 0;
      let laneCrowding = 0;
      const myThreatBearing = threat ? Math.atan2(this.y - threat.y, this.x - threat.x) : 0;
      const myThreatRadius = threat ? dist(this, threat) : 0;
      for (const mate of mates) {
        const separation = dist(this, mate);
        if (separation < nearestDistance) { nearest = mate; nearestDistance = separation; }
        if (separation <= profile.clusterRadius) {
          nearCount++;
          centreX += mate.x;
          centreY += mate.y;
          centreCount++;
        }
        if (threat) {
          const mateAnchor = mate.combatApproachGoal || mate.combatCover?.peek || mate.combatCover?.anchor || mate.pathGoal || mate;
          const mateBearing = Math.atan2(mateAnchor.y - threat.y, mateAnchor.x - threat.x);
          const mateRadius = dist(mateAnchor, threat);
          const angularGap = Math.abs(angleDiff(myThreatBearing, mateBearing));
          if (angularGap < 0.28 && Math.abs(mateRadius - myThreatRadius) < 1.35) laneCrowding++;
        }
      }
      return {
        ...profile,
        mates,
        nearest,
        nearestDistance,
        nearCount,
        laneCrowding,
        centre: centreCount ? { x: centreX / centreCount, y: centreY / centreCount } : null
      };
    }
    coordinationFormationPoint(lead, desiredGap = null, purpose = 'regroup') {
      if (!lead) return null;
      const profile = this.teamSpacingProfile(false);
      const gap = clamp(Number(desiredGap) || profile.desiredGap, 0.80, 2.75);
      const forward = Number.isFinite(lead.pathAngle)
        ? lead.pathAngle
        : (lead.team === TEAM_BLUE ? 0 : Math.PI);
      const right = forward + Math.PI / 2;
      const slotPattern = [-1, 1, -2, 2, 0];
      let lateralRank = slotPattern[Math.max(0, Number(this.slot) || 0) % slotPattern.length];
      if (profile.role === 'flanker') lateralRank *= 1.28;
      if (profile.priority === 'group') lateralRank *= 0.62;
      const trailing = purpose === 'support' ? gap * 0.82 : gap * 0.58;
      const lateral = gap * 0.46 * lateralRank;
      const raw = {
        x: lead.x - Math.cos(forward) * trailing + Math.cos(right) * lateral,
        y: lead.y - Math.sin(forward) * trailing + Math.sin(right) * lateral
      };
      const safe = nearestWalkablePoint(raw.x, raw.y);
      if (dist(safe, lead) >= Math.max(0.66, gap * 0.58)) return safe;
      const radial = Math.atan2(this.y - lead.y, this.x - lead.x) || right;
      return nearestWalkablePoint(lead.x + Math.cos(radial) * gap, lead.y + Math.sin(radial) * gap);
    }
    selectTeamSpacingDirection(context, threat = null) {
      const away = context.centre
        ? Math.atan2(this.y - context.centre.y, this.x - context.centre.x)
        : (context.nearest ? Math.atan2(this.y - context.nearest.y, this.x - context.nearest.x) : this.pathAngle);
      const candidates = [];
      if (threat) {
        const bearing = Math.atan2(threat.y - this.y, threat.x - this.x);
        const roleSide = ((Number(this.slot) || 0) + this.team) % 2 === 0 ? -1 : 1;
        const side = (this.playerRole === 'flanker' ? roleSide : (this.flankDirection || roleSide));
        candidates.push(bearing + side * Math.PI / 2, bearing - side * Math.PI / 2, away, away + 0.52, away - 0.52);
      } else {
        candidates.push(away, away + 0.48, away - 0.48, away + Math.PI / 2, away - Math.PI / 2);
      }
      let best = away;
      let bestScore = -Infinity;
      for (const angle of candidates) {
        const clearance = clearanceAlong(this.x, this.y, angle, 0.92, BOT_RADIUS + 0.018);
        if (clearance < 0.20) continue;
        const step = Math.min(0.72, clearance * 0.82);
        const point = { x: this.x + Math.cos(angle) * step, y: this.y + Math.sin(angle) * step };
        let minimumMateDistance = Infinity;
        for (const mate of context.mates) minimumMateDistance = Math.min(minimumMateDistance, dist(point, mate));
        const rangePenalty = threat
          ? Math.abs(dist(point, threat) - this.preferredCombatRange()) * 0.08
          : 0;
        const separationGain = minimumMateDistance - context.nearestDistance;
        const score = clearance * 1.55
          + Math.min(2.1, minimumMateDistance) * 1.25
          + separationGain * 6.4
          - (separationGain < -0.02 ? 5.5 : 0)
          - rangePenalty;
        if (score > bestScore) { bestScore = score; best = angle; }
      }
      return best;
    }
    resolveLocalTeamSpacing(dt, threat = null) {
      if (!this.alive || this.combatApproachGoal || this.navigationDetourGoal || this.mapRotationGoal) return false;
      const context = this.teamSpacingContext(threat);
      if (!context.mates.length) return false;
      const severe = context.nearestDistance < context.severeGap || context.nearCount >= 3;
      const crowded = context.nearestDistance < context.desiredGap || context.nearCount >= 2 || context.laneCrowding >= 2;
      if (this.teamSpacingTimer <= 0) {
        if (!crowded || this.teamSpacingCooldown > 0) return false;
        if (threat && !severe) {
          const blocker = this.nearestFriendlyCombatBlocker(threat, context.desiredGap * 1.08);
          if (!blocker || this.hasCombatRightOfWay(blocker, threat)) return false;
        }
        this.teamSpacingDirection = this.selectTeamSpacingDirection(context, threat);
        this.teamSpacingTimer = severe ? 0.42 : 0.28;
        this.teamSpacingCooldown = context.priority === 'group' ? 0.92 : 0.68;
        this.teamSpacingReason = threat ? 'separate firing lane' : 'restore team spacing';
        combatDebug.teamSpacingCorrections++;
        if (threat) combatDebug.teamLaneSeparations++;
        if (this.teamSpacingEventCooldown <= 0 && typeof diagnosticLogEvent === 'function') {
          diagnosticLogEvent('team_spacing_correction', this, {
            reason: this.teamSpacingReason,
            nearest: context.nearest?.name || null,
            nearestDistance: Number(context.nearestDistance.toFixed(2)),
            desiredGap: Number(context.desiredGap.toFixed(2)),
            nearby: context.nearCount,
            laneCrowding: context.laneCrowding
          });
          this.teamSpacingEventCooldown = 2.4;
        }
      }
      if (threat) this.aimAtThreat(dt, threat, 7.0);
      else this.angle += angleDiff(this.teamSpacingDirection, this.angle) * clamp(dt * 4.8, 0, 1);
      this.crouched = false;
      this.stepMove(this.teamSpacingDirection, this.speed * this.moveSkill * (threat ? 0.52 : 0.58), dt, true);
      return true;
    }
    setCoordinationGoal(point, reason) {
      if (!point) return false;
      const safe = nearestWalkablePoint(point.x, point.y);
      if (dist(this, safe) < 0.72) return false;

      const sameIntent = this.coordinationGoalReason === reason && this.coordinationGoal;
      if (sameIntent) {
        const shift = dist(this.coordinationGoal, safe);
        const activeGoal = this.pathGoal || this.objective || this.coordinationGoal;
        const stillUseful = activeGoal && dist(this, activeGoal) > 0.68;

        // A support target is normally another moving operator. Chasing every
        // quarter-second change made the regroup goal slide continuously and
        // generated excessive path churn. Hold a useful goal briefly and only
        // rebuild when the support point has moved materially.
        if (stillUseful && (shift < 1.48 || this.coordinationGoalLockTimer > 0 || this.coordinationRepathCooldown > 0)) {
          this.lastTacticalReason = reason;
          this.coordinationRepathCooldown = Math.max(this.coordinationRepathCooldown, 0.34);
          return true;
        }
      }

      if (this.coordinationRepathCooldown > 0) return Boolean(sameIntent);
      this.objective = { ...safe };
      this.coordinationGoal = { ...safe };
      this.coordinationGoalReason = reason;
      this.objectiveAge = 0;
      this.path = [];
      this.pathIndex = 0;
      this.pathGoal = null;
      this.pathRefreshNeeded = true;
      this.repathTimer = 0;
      const decisionScale = clamp(Number(this.tacticalDecisionMultiplier) || 1, 0.88, 1.12);
      this.coordinationRepathCooldown = 1.12 * decisionScale;
      this.coordinationGoalLockTimer = 1.42 * decisionScale;
      this.lastTacticalReason = reason;
      return true;
    }
    receiveAllyDownIntel(fallen, killer) {
      if (!fallen || !killer || !this.alive || this.team !== fallen.team) return;
      this.allyDownIntel = {
        x: fallen.x,
        y: fallen.y,
        killerName: killer.name,
        expires: simulationClock + 5.2,
        responded: false
      };
    }
    updateTeamCoordination(dt, visibleEnemy) {
      const support = this.teamSupportContext();
      if (support.supported) this.roundSupportedTime += dt;
      else if (support.mates.length) this.roundIsolatedTime += dt;
      if (this.allyDownIntel && this.allyDownIntel.expires <= simulationClock) this.allyDownIntel = null;
      if (visibleEnemy || this.sightCandidate) {
        this.coordinationWaitTimer = 0;
        return false;
      }

      const role = this.playerRole || 'flex';
      const priority = this.teamPriorityId || 'trade';
      const intel = this.allyDownIntel;
      if (intel && !this.lastSeen && !this.heardSound) {
        if (!intel.responded) {
          intel.responded = true;
          this.roundTradeAttempts++;
          this.roundRoleActions++;
          this.rememberHuntEvidence({ x: intel.x, y: intel.y }, 'ally-down', clamp(0.42 + (Number(this.tradeBias) || 0) * 0.18, 0.42, 0.66), intel.killerName);
        }
        if ((priority === 'trade' || role === 'support' || role === 'caller') && dist(this, intel) < 8.8) {
          if (this.setCoordinationGoal(intel, 'respond to ally down')) {
            this.roundRegroupActions++;
            this.navigateMove(dt);
            return true;
          }
        }
      }

      const entry = support.mates.find(mate => mate.playerRole === 'entry') || null;
      if (role === 'support' && entry) {
        const desiredGap = clamp(2.0 + (Number(this.spacingBias) || 0) * 4, 1.55, 2.75);
        if (dist(this, entry) > desiredGap + 0.8 && !entry.target) {
          const follow = this.coordinationFormationPoint(entry, desiredGap, 'support');
          if (this.setCoordinationGoal(follow, 'support entry spacing')) {
            this.roundRegroupActions++;
            this.roundRoleActions++;
            this.navigateMove(dt);
            return true;
          }
        }
      }

      const contactPressure = Boolean(this.lastSeen || this.heardSound || isUrgentHuntActive());
      const maxEntryWait = clamp(0.36 * (Number(this.waitForSupportMultiplier) || 1), 0.22, 0.72);
      const entryNeedsSupport = role === 'entry' && !support.supported && support.mates.length && contactPressure;
      if (entryNeedsSupport && this.coordinationHoldTimer <= 0) {
        if (this.coordinationWaitTimer < maxEntryWait) {
          this.coordinationWaitTimer += dt;
          if (this.coordinationActionCooldown <= 0) {
            this.roundRoleActions++;
            this.coordinationActionCooldown = 1.2;
          }
          this.crouched = false;
          this.angle += angleDiff(this.pathAngle, this.angle) * clamp(dt * 2.8, 0, 1);
          return true;
        }
        // Waiting for support is a single short pause, not a loop. Once the
        // window expires the entry commits for a few seconds before it may
        // consider another coordinated hold.
        this.coordinationWaitTimer = 0;
        this.coordinationHoldTimer = 2.1 + Math.random() * 0.7;
        this.lastTacticalReason = 'commit after support wait';
        combatDebug.coordinationWaitCommits++;
      } else if (!entryNeedsSupport) {
        this.coordinationWaitTimer = 0;
      }

      const shouldRegroup = !support.supported && support.nearest && (
        priority === 'group' || role === 'support' || role === 'caller' ||
        (priority === 'trade' && support.nearestDistance > support.radius * 1.22) ||
        (role !== 'flanker' && support.nearestDistance > support.radius * 1.48)
      );
      if (shouldRegroup) {
        const lead = support.nearest;
        const regroup = this.coordinationFormationPoint(lead, this.teamSpacingProfile(false).desiredGap, 'regroup');
        if (this.setCoordinationGoal(regroup, 'regroup with team')) {
          this.roundRegroupActions++;
          this.navigateMove(dt);
          return true;
        }
      }

      if ((role === 'anchor' || priority === 'hold') && !contactPressure && this.objective) {
        const progress = this.team === TEAM_BLUE ? this.objective.x / Math.max(1, MAP_W) : (MAP_W - this.objective.x) / Math.max(1, MAP_W);
        if (progress > 0.70 && this.coordinationActionCooldown <= 0) {
          this.objective = this.chooseObjective(this.objective, 2.0);
          this.path = [];
          this.pathIndex = 0;
          this.pathRefreshNeeded = true;
          this.repathTimer = 0;
          this.roundRoleActions++;
          this.coordinationActionCooldown = 1.8;
        }
      }
      return false;
    }
    die(killer, hit = null) {
      if (!this.alive) return;
      this.alive = false;
      this.health = 0;
      this.deathYaw = Math.PI / 2 - this.angle;
      this.deathSide = this.hitDirection || (Math.random() < 0.5 ? -1 : 1);
      this.deathPose = Math.floor(Math.random() * 3);
      this.deathTwist = (Math.random() - 0.5) * 0.34;
      this.deathWeaponSide = Math.random() < 0.5 ? -1 : 1;
      this.deathTime = performance.now() / 1000;
      this.deathAnim = 0;
      this.deathImpactStrength = clamp(Number(this.hitReactionStrength) || (Number(hit?.damage) || 18) / 42, 0.35, 1.25);
      this.deathPush = clamp((Number(hit?.damage) || 18) / 85, 0.16, 0.58);
      this.weaponReadyBlend = 0;
      this.deaths++;
      registerCombatContact();
      this.target = null;
      this.path = [];
      this.pathGoal = null;
      emitCosmeticSound('bodyfall', this, 0.92, { delay: 0.16 });
      if (killer) {
        if (typeof diagnosticRecordElimination === 'function') diagnosticRecordElimination(this, killer, hit);
        killer.kills++;
        killer.lastEliminationAt = simulationClock;
        killer.lastEliminationVictimTeam = this.team;
        let tradeKill = false;
        if (killer.allyDownIntel && killer.allyDownIntel.expires > simulationClock && killer.allyDownIntel.killerName === this.name) {
          killer.roundTradeKills = (killer.roundTradeKills || 0) + 1;
          killer.roundRoleActions = (killer.roundRoleActions || 0) + 1;
          killer.allyDownIntel = null;
          tradeKill = true;
        }
        if (typeof recordCareerEliminationMoment === 'function') recordCareerEliminationMoment(killer, this, hit, tradeKill);
        addFeed(killer, this, Boolean(hit?.critical), Boolean(hit?.headshot));
        if (typeof registerOwnedMultiKill === 'function') registerOwnedMultiKill(killer);
        if (killer === bots[spectatorIndex]) {
          showStatus(hit?.headshot ? (hit?.critical ? 'CRITICAL HEADSHOT' : 'HEADSHOT ELIMINATION') : 'TARGET ELIMINATED');
          hitPulse = 1;
        }
      }
      if (killer) {
        for (const mate of bots) {
          if (mate !== this && mate.alive && mate.team === this.team && typeof mate.receiveAllyDownIntel === 'function') mate.receiveAllyDownIntel(this, killer);
        }
      }
      if (this === bots[spectatorIndex]) {
        showStatus('OPERATOR DOWN');
        shake = 1;
        // The main update loop already switches away from a dead operator.
        // A delayed callback here caused an unwanted second camera switch.
      }
    }
    update(dt) {
      if (this.alive) this.roundSurvivalTime = (this.roundSurvivalTime || 0) + dt;
      this.flash = Math.max(0, this.flash - dt * 9);
      const visualRecovery = Number(this.weapon?.recoilVisualRecovery) || 8;
      this.recoil = Math.max(0, this.recoil - dt * visualRecovery);
      const heatRecovery = (Number(this.weapon?.recoilRecovery) || 5) * (0.72 + (Number(this.weapon?.handling) || 0.5) * 0.55);
      this.weaponHeat = Math.max(0, (this.weaponHeat || 0) - dt * heatRecovery);
      this.hurt = Math.max(0, this.hurt - dt * 2.45);
      this.hitReaction = Math.max(0, this.hitReaction - dt * 2.65);
      this.hitReactionAge = Math.min(99, (Number(this.hitReactionAge) || 0) + dt);
      this.hitReactionStrength = Math.max(0, (Number(this.hitReactionStrength) || 0) - dt * 1.8);
      this.hitReactionVertical = Math.max(0, (Number(this.hitReactionVertical) || 0) - dt * 2.4);
      this.flinchTimer = Math.max(0, (Number(this.flinchTimer) || 0) - dt);
      this.flinchCooldown = Math.max(0, (Number(this.flinchCooldown) || 0) - dt);
      this.flinchAge = Math.min(99, (Number(this.flinchAge) || 0) + dt);
      this.flinchStrength = Math.max(0, (Number(this.flinchStrength) || 0) - dt * 2.8);
      this.flinchAimOffset = lerp(Number(this.flinchAimOffset) || 0, 0, clamp(dt * (this.flinchTimer > 0 ? 4.2 : 11.0), 0, 1));
      this.cooldown -= dt;
      this.burstGap -= dt;
      const hadLastSeen = Boolean(this.lastSeen);
      this.lastSeenTimer = Math.max(0, this.lastSeenTimer - dt);
      this.searchTimer = Math.max(0, this.searchTimer - dt);
      this.cornerPause = Math.max(0, this.cornerPause - dt);
      this.escapeTimer = Math.max(0, this.escapeTimer - dt);
      this.recoveryCooldown = Math.max(0, this.recoveryCooldown - dt);
      this.heardSoundTimer = Math.max(0, this.heardSoundTimer - dt);
      this.crouchDecisionTimer = Math.max(0, this.crouchDecisionTimer - dt);
      this.crouchHoldTimer = Math.max(0, this.crouchHoldTimer - dt);
      this.hearingRepathCooldown = Math.max(0, this.hearingRepathCooldown - dt);
      this.steeringHoldTimer = Math.max(0, this.steeringHoldTimer - dt);
      this.navigationDetourTimer = Math.max(0, this.navigationDetourTimer - dt);
      this.navigationLoopCooldown = Math.max(0, this.navigationLoopCooldown - dt);
      this.tacticalModeTimer = Math.max(0, this.tacticalModeTimer - dt);
      this.tacticalDecisionTimer = Math.max(0, this.tacticalDecisionTimer - dt);
      this.combatCoverCooldown = Math.max(0, this.combatCoverCooldown - dt);
      this.coverHoldTimer = Math.max(0, this.coverHoldTimer - dt);
      this.peekHoldTimer = Math.max(0, this.peekHoldTimer - dt);
      this.exposureTimer = Math.max(0, this.exposureTimer - dt);
      this.combatBurstPause = Math.max(0, this.combatBurstPause - dt);
      this.repositionCooldown = Math.max(0, this.repositionCooldown - dt);
      this.tacticalFlankCooldown = Math.max(0, (this.tacticalFlankCooldown || 0) - dt);
      this.mapRotationCooldown = Math.max(0, (this.mapRotationCooldown || 0) - dt);
      this.targetSwitchCooldown = Math.max(0, (this.targetSwitchCooldown || 0) - dt);
      this.perceptionScanTimer = Math.max(0, (this.perceptionScanTimer || 0) - dt);
      this.viewOcclusionTimer = Math.max(0, (this.viewOcclusionTimer || 0) - dt);
      if (this.viewOcclusionTimer <= 0) {
        this.viewOccluder = null;
        this.viewOccludedPoint = null;
        this.viewClearDirection = 0;
        this.viewClearStart = null;
      }
      this.combatMobilityTimer = Math.max(0, (this.combatMobilityTimer || 0) - dt);
      this.combatRecoveryCooldown = Math.max(0, (this.combatRecoveryCooldown || 0) - dt);
      this.combatYieldTimer = Math.max(0, (this.combatYieldTimer || 0) - dt);
      this.safeReloadTimer = this.wantsSafeReload ? this.safeReloadTimer + dt : 0;
      this.coordinationRepathCooldown = Math.max(0, (this.coordinationRepathCooldown || 0) - dt);
      this.coordinationGoalLockTimer = Math.max(0, (this.coordinationGoalLockTimer || 0) - dt);
      this.coordinationHoldTimer = Math.max(0, (this.coordinationHoldTimer || 0) - dt);
      this.coordinationActionCooldown = Math.max(0, (this.coordinationActionCooldown || 0) - dt);
      this.teamSpacingTimer = Math.max(0, (this.teamSpacingTimer || 0) - dt);
      this.teamSpacingCooldown = Math.max(0, (this.teamSpacingCooldown || 0) - dt);
      this.teamSpacingEventCooldown = Math.max(0, (this.teamSpacingEventCooldown || 0) - dt);
      this.scanPhase += dt * (0.75 + this.moveSkill * 0.35);
      this.objectiveAge += dt;
      this.moveIntent = 0;
      this.moveBlocked = false;
      this.isSprinting = false;
      this.moveCommandedThisFrame = false;
      if (hadLastSeen && this.lastSeenTimer <= 0) {
        this.lastSeen = null;
        this.path = [];
        this.pathIndex = 0;
        this.pathGoal = null;
        this.pathRefreshNeeded = true;
        this.repathTimer = 0;
      }

      // Tactical elimination: a death lasts for the remainder of the round.
      // The operator is restored only by startRound(). The animation continues
      // briefly so the body falls naturally rather than snapping to a corpse.
      if (!this.alive) {
        this.deathAnim = Math.min(1, this.deathAnim + dt * 1.85);
        this.updateAnimationState(dt, null);
        return;
      }

      if (this.heardSound && this.heardSoundTimer <= 0) {
        this.heardSound = null;
        this.pathRefreshNeeded = true;
        this.repathTimer = 0;
      }
      this.processHearing();
      this.updateLateRoundGoal(dt);
      const requestedPerceptionScan = this.perceptionScanTimer <= 0;
      const urgentPerceptionScan = Boolean(!this.target && (this.sightCandidate || this.lastSeen || this.heardSound || isUrgentHuntActive()));
      const fullPerceptionScan = requestedPerceptionScan && (typeof consumeBotPerceptionSlot !== 'function' || consumeBotPerceptionSlot(this, urgentPerceptionScan));
      if (fullPerceptionScan) {
        this.perceptionScanTimer = typeof runtimePerceptionInterval === 'function' ? runtimePerceptionInterval(this) : 0.06;
        this.lastPerceptionScanAt = simulationClock;
      } else if (requestedPerceptionScan) {
        // Keep current-target and pending-candidate visibility authoritative, but
        // spread broad challenger scans across rendered frames and fixed substeps.
        this.perceptionScanTimer = 0.012 + (Math.max(0, Number(this.slot) || 0) % 5) * 0.003;
      }
      const visibleEnemy = this.updatePerception(dt, fullPerceptionScan);
      const summitOpeningCommit = Boolean(activeArenaId === 'summit' && this.mapRotationOpeningCommit && this.mapRotationGoal);
      const openingThreatDistance = visibleEnemy ? dist(this, visibleEnemy) : Infinity;
      const summitOpeningEmergency = summitOpeningCommit && (
        openingThreatDistance < 5.2 || simulationClock - (Number(this.lastDamageTime) || -999) < 1.5 || this.health < 58 || isUrgentHuntActive()
      );
      if ((visibleEnemy || this.lastSeen || this.heardSound || this.combatApproachGoal || this.lateRoundGoal) && this.mapRotationGoal) {
        if (activeArenaId === 'office') this.cancelOfficeCourtyardRotation('courtyard rotation interrupted by contact');
        else if (activeArenaId === 'summit' && (!summitOpeningCommit || summitOpeningEmergency)) this.cancelSummitLayerRotation('summit rotation interrupted by confirmed contact');
      }
      this.updateWeaponState(dt, visibleEnemy);
      this.updateCrouchDecision(dt, visibleEnemy);
      this.updateEngagementProgress(dt, visibleEnemy);
      const continueSummitOpening = Boolean(summitOpeningCommit && !summitOpeningEmergency && this.mapRotationGoal);
      const reloadCoverPriority = Boolean((this.reloadTimer > 0 && this.reloadCoverRequired && this.wantsSafeReload) || this.reloadCoverCommitActive);
      const reloadCoverMoved = !visibleEnemy && reloadCoverPriority && !continueSummitOpening ? this.updateActiveCoverTactic(dt) : false;
      const spacingMoved = !reloadCoverMoved && !reloadCoverPriority && !visibleEnemy && !this.sightCandidate && !continueSummitOpening && this.resolveLocalTeamSpacing(dt, null);
      const clearedFriendlyView = !reloadCoverMoved && !spacingMoved && !reloadCoverPriority && !visibleEnemy && !continueSummitOpening && this.resolveFriendlyViewOcclusion(dt);
      const coordinationMoved = reloadCoverMoved || spacingMoved || clearedFriendlyView || reloadCoverPriority || continueSummitOpening ? false : this.updateTeamCoordination(dt, visibleEnemy);
      if (visibleEnemy && !continueSummitOpening) {
        this.combatMove(dt, visibleEnemy);
      } else if (!reloadCoverMoved && !continueSummitOpening && this.sightCandidate && this.canVisuallySee(this.sightCandidate, FOV * 1.2)) {
        this.noticeEnemy(dt, this.sightCandidate);
      } else if (!reloadCoverMoved && (continueSummitOpening || (!spacingMoved && !clearedFriendlyView && !coordinationMoved && !this.updateActiveCoverTactic(dt)))) {
        this.navigateMove(dt);
      }

      const moved = Math.hypot(this.x - this.lastX, this.y - this.lastY);
      this.updateLocomotionStall(dt, moved, visibleEnemy);
      const evidenceFreeHunt = isLateRoundHuntActive() && !visibleEnemy && !this.lastSeen && !this.heardSound;
      if (evidenceFreeHunt) {
        this.huntStationaryTimer = moved < 0.012 ? this.huntStationaryTimer + dt : Math.max(0, this.huntStationaryTimer - dt * 2.5);
        if (this.huntStationaryTimer > (isUrgentHuntActive() ? 0.85 : 1.45)) {
          this.clearCombatCover();
          this.crouched = false;
          this.lateRoundGoalTimer = 0;
          this.lateRoundGoalAge = 99;
          this.path = [];
          this.pathIndex = 0;
          this.pathGoal = null;
          this.pathRefreshNeeded = true;
          this.repathTimer = 0;
          this.huntStationaryTimer = 0;
          combatDebug.huntForcedMoves++;
        }
      } else {
        this.huntStationaryTimer = 0;
      }
      this.recordNavigationSample(dt, moved);
      if (!this.isSprinting) {
        const recoveryRate = this.crouched ? 12.2 : ((this.lastSeen || this.target) ? 7.8 : 10.8);
        this.movementFatigue = Math.max(0, (this.movementFatigue || 0) - dt * recoveryRate);
      }
      this.moveVelocity = dt > 0 ? moved / dt : 0;
      if (!this.moveCommandedThisFrame) {
        this.locomotionSpeed = lerp(this.locomotionSpeed || 0, 0, animationBlendFactor(6.6, dt));
      }
      const visualRate = this.moveVelocity > (this.visualMoveVelocity || 0) ? 9.2 : 5.4;
      this.visualMoveVelocity = lerp(this.visualMoveVelocity || 0, this.moveVelocity, animationBlendFactor(visualRate, dt));
      const movingNow = clamp(this.visualMoveVelocity / Math.max(0.001, this.speed), 0, 1);
      this.motion = lerp(this.motion, movingNow, animationBlendFactor(movingNow > this.motion ? 8.6 : 5.0, dt));
      const crouchTarget = this.crouched ? 1 : 0;
      const crouchRate = crouchTarget > this.crouchBlend ? 4.8 : 4.0;
      this.crouchBlend = lerp(this.crouchBlend, crouchTarget, animationBlendFactor(crouchRate, dt));

      const dxTravel = this.x - this.lastX;
      const dyTravel = this.y - this.lastY;
      const travelAngle = moved > 0.0004 ? Math.atan2(dyTravel, dxTravel) : this.pathAngle;
      const moveTargetAngle = moved > 0.0004 ? travelAngle : this.pathAngle;
      this.renderMoveAngle = animationAngleStep(
        Number.isFinite(this.renderMoveAngle) ? this.renderMoveAngle : moveTargetAngle,
        moveTargetAngle,
        moved > 0.0004 ? 8.4 : 4.4,
        dt,
        1.18
      );
      const aimRate = visibleEnemy || this.sightCandidate ? 13.5 : (this.lastSeen || this.heardSound ? 8.2 : 5.8);
      this.renderAimAngle = animationAngleStep(
        Number.isFinite(this.renderAimAngle) ? this.renderAimAngle : this.angle,
        this.angle,
        aimRate,
        dt,
        visibleEnemy ? 0.48 : 0.82
      );
      const actualVx = dt > 0 ? dxTravel / dt : 0;
      const actualVy = dt > 0 ? dyTravel / dt : 0;
      const locomotionReferenceAngle = visibleEnemy || this.target || this.sightCandidate
        ? this.renderAimAngle
        : this.renderMoveAngle;
      const forwardX = Math.cos(locomotionReferenceAngle);
      const forwardY = Math.sin(locomotionReferenceAngle);
      const rightX = -forwardY;
      const rightY = forwardX;
      const localForward = actualVx * forwardX + actualVy * forwardY;
      const localSide = actualVx * rightX + actualVy * rightY;
      const speedBase = Math.max(0.2, this.speed);
      this.forwardBlend = lerp(this.forwardBlend || 0, clamp(localForward / speedBase, -1, 1), animationBlendFactor(7.4, dt));
      this.strafeBlend = lerp(this.strafeBlend || 0, clamp(localSide / speedBase, -1, 1), animationBlendFactor(7.0, dt));
      this.backpedalBlend = lerp(this.backpedalBlend || 0, clamp(-localForward / speedBase, 0, 1), animationBlendFactor(6.2, dt));
      const turnDelta = angleDiff(this.angle, this.renderMoveAngle);
      this.turnBlend = lerp(this.turnBlend || 0, clamp(turnDelta / 0.72, -1, 1), animationBlendFactor(6.8, dt));

      const forwardClearance = clearanceAlong(this.x, this.y, this.pathAngle, 1.15, BOT_RADIUS * 0.74);
      const cornerTurn = Math.abs(angleDiff(this.angle, this.pathAngle));
      const cornerTarget = clamp((0.86 - forwardClearance) * 1.6 + cornerTurn * 0.72, 0, 1);
      this.cornerReadyBlend = lerp(this.cornerReadyBlend || 0, cornerTarget, animationBlendFactor(5.5, dt));
      const readyTarget = this.reloadTimer > 0 || this.weaponSwapTimer > 0
        ? 0.42
        : (visibleEnemy || this.sightCandidate
          ? 1
          : (this.lastSeen || this.heardSound
            ? 0.88
            : (this.isSprinting ? 0.34 : 0.52 + this.cornerReadyBlend * 0.34)));
      this.weaponReadyBlend = lerp(this.weaponReadyBlend || 0.52, readyTarget, animationBlendFactor(readyTarget > (this.weaponReadyBlend || 0) ? 8.0 : 4.8, dt));

      let shoulderTarget = this.shoulderBlend || 0;
      const aimMoveOffset = angleDiff(this.renderAimAngle, this.renderMoveAngle);
      if (Math.abs(aimMoveOffset) > 0.14) shoulderTarget = aimMoveOffset > 0 ? 1 : -1;
      else if (visibleEnemy || this.lastSeen) {
        const leftClear = clearanceAlong(this.x, this.y, this.renderAimAngle - Math.PI * 0.46, 0.64, BOT_RADIUS * 0.58);
        const rightClear = clearanceAlong(this.x, this.y, this.renderAimAngle + Math.PI * 0.46, 0.64, BOT_RADIUS * 0.58);
        if (Math.abs(leftClear - rightClear) > 0.12) shoulderTarget = rightClear > leftClear ? 1 : -1;
      }
      this.shoulderBlend = lerp(this.shoulderBlend || 0, clamp(shoulderTarget, -1, 1), animationBlendFactor(3.6, dt));
      if (this.crouched) {
        this.footstepDistance = 0;
      } else if (moved > 0.0002 && this.moveVelocity > 0.18) {
        this.footstepDistance += moved;
        const sprintingStep = Boolean(this.isSprinting);
        const runningStep = sprintingStep || this.moveVelocity > this.speed * 0.82;
        const stride = (sprintingStep ? 0.84 : (runningStep ? 0.74 : 0.64)) * this.footstepStrideScale;
        if (this.footstepDistance >= stride) {
          this.footstepDistance %= stride;
          const speedRatio = clamp(this.moveVelocity / Math.max(0.1, this.speed), 0.2, 1.35);
          const loudness = sprintingStep
            ? clamp(0.78 + speedRatio * 0.18, 0.82, 1.04)
            : clamp((runningStep ? 0.48 : 0.36) + speedRatio * 0.24, 0.38, 0.82);
          this.footstepSide = this.footstepSide ? 0 : 1;
          this.footstepStrideScale = 0.94 + Math.random() * 0.12;
          const surfaceTexture = Math.random() < 0.48 ? 2 : 0;
          const gaitOffset = sprintingStep ? 8 : (runningStep ? 4 : 0);
          // Sprinting is a deliberate tactical trade-off: it covers short
          // distances quickly, but the heavier footfalls can be heard by AI
          // opponents across a substantially wider area than normal running.
          const baseRadius = sprintingStep ? 12.6 : (runningStep ? 8.5 : 6.7 + loudness * 1.45);
          const huntFootstepBoost = suddenHuntOvertime ? 26.0 : (isUrgentHuntActive() ? 14.0 : (isLateRoundHuntActive() ? 3.4 : 0));
          const hearingRadius = baseRadius + huntFootstepBoost;
          emitSoundEvent('footstep', this, hearingRadius, loudness, {
            variant: gaitOffset + this.footstepSide + surfaceTexture,
            gait: sprintingStep ? 'sprint' : (runningStep ? 'run' : 'walk')
          });
          combatDebug.footstepsEmitted++;
          if (sprintingStep) combatDebug.sprintFootstepsEmitted++;
          combatDebug.maxFootstepRadius = Math.max(combatDebug.maxFootstepRadius || 0, hearingRadius);
        }
      }
      const navigationOnly = !visibleEnemy && !this.sightCandidate;
      const failedMovement = this.moveIntent > this.speed * 0.2 && (this.moveBlocked || this.moveVelocity < 0.055);
      if (navigationOnly && failedMovement && this.cornerPause <= 0 && this.recoveryCooldown <= 0) {
        this.stuckTimer += dt;
        if (this.stuckTimer > 0.48) {
          let bestAngle = this.pathAngle;
          let bestScore = -Infinity;
          // Sample the complete circle for a physically open escape route, but
          // score headings close to the intended path more highly. The camera
          // turns only towards the selected exit, so this does not recreate the
          // old visible back-and-forth wall scan.
          for (let i = 0; i < 16; i++) {
            const candidate = this.pathAngle + i * TAU / 16;
            const offset = Math.abs(angleDiff(candidate, this.pathAngle));
            const clearance = clearanceAlong(this.x, this.y, candidate, 1.75, BOT_RADIUS + 0.01);
            const immediateX = this.x + Math.cos(candidate) * 0.035;
            const immediateY = this.y + Math.sin(candidate) * 0.035;
            if (!canStand(immediateX, immediateY, BOT_RADIUS)) continue;
            let crowdPenalty = 0;
            const probeX = this.x + Math.cos(candidate) * Math.min(0.7, Math.max(0.08, clearance));
            const probeY = this.y + Math.sin(candidate) * Math.min(0.7, Math.max(0.08, clearance));
            for (const other of bots) {
              if (other === this || !other.alive) continue;
              const separation = Math.hypot(probeX - other.x, probeY - other.y);
              if (separation < 0.72) crowdPenalty += (0.72 - separation) * 1.8;
            }
            const score = clearance - offset * 0.12 - crowdPenalty;
            if (score > bestScore) {
              bestScore = score;
              bestAngle = candidate;
            }
          }
          this.escapeAngle = bestAngle;
          this.escapeTimer = bestScore > 0.52 ? 0.42 : 0.2;
          this.recoveryCooldown = 0.8;
          this.objective = this.chooseObjective(this.objective, 3.0);
          this.objectiveAge = 0;
          this.lastSeen = null;
          this.lastSeenTimer = 0;
          this.searchTimer = 0;
          this.searchLookOffset = 0;
          this.path = [];
          this.pathIndex = 0;
          this.pathGoal = null;
          this.pathRefreshNeeded = true;
          this.repathTimer = 0;
          this.stuckTimer = 0;
          combatDebug.navigationRecoveries++;
        }
      } else {
        this.stuckTimer = Math.max(0, this.stuckTimer - dt * 2.5);
      }
      // Drive the gait from actual world distance travelled. This prevents
      // feet cycling while stationary and greatly reduces visible foot sliding.
      if (moved > 0.0002) {
        const strideRate = this.crouched ? 7.0 : (this.moveVelocity > this.speed * 0.82 ? 10.2 : 8.6);
        this.walkCycle += moved * strideRate;
      }
      this.updateAnimationState(dt, visibleEnemy);
      this.angle = ((this.angle % TAU) + TAU) % TAU;
      this.pathAngle = ((this.pathAngle % TAU) + TAU) % TAU;
      this.lastX = this.x;
      this.lastY = this.y;
    }
    processHearing() {
      let best = null;
      let bestScore = 0;
      let newestId = this.lastSoundEventId;
      for (const event of soundEvents) {
        if (event.id <= this.lastSoundEventId) continue;
        newestId = Math.max(newestId, event.id);
        if (event.source === this) continue;
        const sameTeam = event.team === this.team;
        if (sameTeam && event.type === 'footstep') continue;

        const distanceToSound = Math.hypot(event.x - this.x, event.y - this.y);
        const direct = hasLineOfSight(this, event);
        const urgentHuntHearing = isUrgentHuntActive();
        const lateHuntHearing = isLateRoundHuntActive();
        const occludedFootstepFactor = suddenHuntOvertime ? 0.88 : (urgentHuntHearing ? 0.72 : (lateHuntHearing ? 0.44 : 0.26));
        const wallFactor = direct ? 1 : (event.type === 'gunshot' ? 0.56 : occludedFootstepFactor);
        const effectiveRadius = event.radius * this.hearing * wallFactor;
        if (distanceToSound > effectiveRadius) continue;

        const audibility = clamp(1 - distanceToSound / Math.max(0.01, effectiveRadius), 0, 1);
        const typeInterest = event.type === 'gunshot' ? 1.22 : 1;
        const teamInterest = sameTeam ? 0.43 : 1;
        const score = audibility * typeInterest * teamInterest * (0.72 + this.aggression * 0.48);
        if (score > bestScore) {
          best = { event, direct, distance: distanceToSound };
          bestScore = score;
        }
      }
      this.lastSoundEventId = newestId;
      if (!best || bestScore < 0.11 || this.target) return;

      const lateHuntHearing = isLateRoundHuntActive();
      const urgentHuntHearing = isUrgentHuntActive();
      const incomingBearing = Math.atan2(best.event.y - this.y, best.event.x - this.x);
      const forwardHeading = Number.isFinite(this.lateRoundLastHeading) ? this.lateRoundLastHeading : this.pathAngle;
      const behindCurrentSweep = Math.abs(angleDiff(incomingBearing, forwardHeading)) > 2.0;
      const weakFootstep = best.event.type === 'footstep' && (!best.direct || bestScore < 0.42);
      if (lateHuntHearing && !urgentHuntHearing && weakFootstep && behindCurrentSweep && this.path.length > this.pathIndex + 1) return;

      const uncertainty = best.direct ? Math.min(0.38, best.distance * 0.025) : Math.min(1.35, 0.38 + best.distance * 0.065);
      const angle = Math.random() * TAU;
      const offset = Math.random() * uncertainty;
      const heardPoint = nearestWalkablePoint(
        best.event.x + Math.cos(angle) * offset,
        best.event.y + Math.sin(angle) * offset
      );
      const sameCluster = this.heardSound && this.heardSound.type === best.event.type && dist(this.heardSound, heardPoint) < 2.2;
      const mergeWeight = lateHuntHearing ? 0.18 : 0.32;
      const mergedPoint = sameCluster
        ? nearestWalkablePoint(lerp(this.heardSound.x, heardPoint.x, mergeWeight), lerp(this.heardSound.y, heardPoint.y, mergeWeight))
        : heardPoint;
      const locationShift = this.heardSound ? dist(this.heardSound, mergedPoint) : Infinity;
      const repathShift = lateHuntHearing ? 1.55 : 1.05;
      const changed = !sameCluster || (locationShift > repathShift && this.hearingRepathCooldown <= 0);
      this.lastPersonalContactAt = simulationClock;
      this.heardSound = {
        x: mergedPoint.x,
        y: mergedPoint.y,
        type: best.event.type,
        team: best.event.team,
        confidence: Math.max(bestScore, this.heardSound ? this.heardSound.confidence * 0.82 : 0)
      };
      this.heardSoundTimer = suddenHuntOvertime
        ? (best.event.type === 'gunshot' ? 7.0 : 6.0)
        : (best.event.type === 'gunshot' ? 4.6 : (urgentHuntHearing ? 4.4 : (lateHuntHearing ? 3.6 : 3.0)));
      this.rememberHuntEvidence(mergedPoint, best.event.type, Math.max(0.18, bestScore), best.event.source?.name || '');
      if (changed) {
        this.path = [];
        this.pathIndex = 0;
        this.pathGoal = null;
        this.pathRefreshNeeded = true;
        this.repathTimer = 0;
        this.hearingRepathCooldown = lateHuntHearing ? (best.event.type === 'gunshot' ? 0.72 : 1.10) : (best.event.type === 'gunshot' ? 0.48 : 0.70);
        const bearing = Math.atan2(mergedPoint.y - this.y, mergedPoint.x - this.x);
        this.angle += angleDiff(bearing, this.angle) * clamp(0.06 + bestScore * 0.12, 0.06, 0.18);
        combatDebug.soundsHeard++;
      }
    }

    updateCrouchDecision(dt, visibleEnemy) {
      if (this.crouchDecisionTimer > 0) return;
      this.crouchDecisionTimer = 0.56 + Math.random() * 0.46;

      let shouldCrouch = false;
      const lateHunt = isLateRoundHuntActive() && !visibleEnemy && !this.heardSound && !this.lastSeen;
      const pathClearance = clearanceAlong(this.x, this.y, this.pathAngle, 1.25, BOT_RADIUS);
      const approachingCover = pathClearance < 0.95;
      const enemyDistance = visibleEnemy ? dist(this, visibleEnemy) : Infinity;
      const closePressure = enemyDistance < 3.25;
      const mobilityRecovery = this.combatMobilityTimer > 0 || this.engagementIdleTimer > 0.48;
      if (lateHunt || closePressure || mobilityRecovery) {
        shouldCrouch = false;
      } else if (this.escapeTimer > 0 || this.moveBlocked || this.stuckTimer > 0.25) {
        shouldCrouch = false;
      } else if (visibleEnemy) {
        const stableFight = enemyDistance > 3.25 && enemyDistance < 9.5 && this.motion < 0.62;
        shouldCrouch = stableFight && (this.health < 48 || this.stealth > 0.78) && Math.random() < 0.34;
      } else if (this.heardSound) {
        const soundDistance = dist(this, this.heardSound);
        const closeFootsteps = this.heardSound.type === 'footstep' && soundDistance < 7.0;
        const closeGunfire = this.heardSound.type === 'gunshot' && soundDistance < 4.0 && (this.health < 55 || this.stealth > 0.70);
        shouldCrouch = (closeFootsteps || closeGunfire) && (approachingCover || this.stealth > 0.64);
      } else if (this.lastSeen) {
        shouldCrouch = dist(this, this.lastSeen) < 5.8 && (approachingCover || this.stealth > 0.66);
      } else if (this.health < 38 && approachingCover) {
        shouldCrouch = true;
      }

      if (this.crouchHoldTimer > 0 && this.crouched && !lateHunt && !visibleEnemy && !this.moveBlocked && !mobilityRecovery) shouldCrouch = true;
      const timeSinceCrouchChange = simulationClock - (Number(this.lastCrouchChangeAt) || -999);
      const minimumPostureTime = this.crouched ? 0.74 : 0.46;
      if (shouldCrouch !== this.crouched && timeSinceCrouchChange >= minimumPostureTime) {
        this.crouched = shouldCrouch;
        this.lastCrouchChangeAt = simulationClock;
        this.crouchHoldTimer = shouldCrouch ? 1.15 + Math.random() * 1.25 : 0.52;
        combatDebug.crouchTransitions++;
      }
    }

    canVisuallySee(other, viewFov = FOV * 1.2) {
      if (!other || !other.alive || other.team === this.team) return false;
      const d = dist(this, other);
      if (d > this.weapon.range + 2.2) return false;
      const bearing = Math.atan2(other.y - this.y, other.x - this.x);
      // Very close opponents occupy a large part of the player's view and must
      // not disappear merely because the body is still finishing a turn.
      const closeRangeFov = d < 2.15 ? Math.PI * 0.86 : viewFov;
      if (Math.abs(angleDiff(bearing, this.angle)) > closeRangeFov * 0.5) return false;
      if (!hasTargetExposure(this, other)) return false;
      return !this.firstOperatorOccludingView(other);
    }
    firstOperatorOccludingView(target) {
      if (!target || !target.alive || target === this) return null;
      const targetDistance = dist(this, target);
      if (targetDistance < 0.12) return null;
      const targetBearing = Math.atan2(target.y - this.y, target.x - this.x);
      const targetHalfWidth = BOT_RADIUS * (target.crouched ? 0.62 : 0.92);
      const targetHalfAngle = Math.atan2(targetHalfWidth, targetDistance);
      let blocker = null;
      let blockerDistance = targetDistance;
      for (const other of bots) {
        if (!other || other === this || other === target || !other.alive) continue;
        const distanceToBody = dist(this, other);
        if (distanceToBody <= 0.16 || distanceToBody >= blockerDistance || distanceToBody >= targetDistance - BOT_RADIUS * 0.35) continue;
        if (!hasLineOfSight(this, other)) continue;
        // A standing body blocks the central silhouette. A crouched operator is
        // less obstructive and normally leaves a standing target's upper body
        // visible unless the two operators are almost touching.
        if (other.crouched && !target.crouched && targetDistance - distanceToBody > 0.75) continue;
        const bodyBearing = Math.atan2(other.y - this.y, other.x - this.x);
        const bearingSeparation = Math.abs(angleDiff(bodyBearing, targetBearing));
        const bodyHalfWidth = BOT_RADIUS * (other.crouched ? 0.56 : 1.18);
        const bodyHalfAngle = Math.atan2(bodyHalfWidth, distanceToBody);
        const visibleTargetEdge = bearingSeparation + targetHalfAngle * 0.72;
        if (visibleTargetEdge >= bodyHalfAngle) continue;
        blocker = other;
        blockerDistance = distanceToBody;
      }
      return blocker;
    }
    rememberViewOcclusion(target, blocker) {
      if (!target || !blocker) return;
      this.viewOccluder = blocker;
      this.viewOccludedPoint = this.lastSeen ? { x: this.lastSeen.x, y: this.lastSeen.y } : null;
      this.viewOcclusionTimer = blocker.team === this.team ? 0.92 : 0.30;
      this.viewClearDirection = 0;
      this.viewClearStart = { x: this.x, y: this.y };
      combatDebug.operatorViewOcclusions++;
    }
    resolveFriendlyViewOcclusion(dt) {
      const blocker = this.viewOccluder;
      const point = this.viewOccludedPoint;
      if (!blocker || !blocker.alive || blocker.team !== this.team || !point || this.viewOcclusionTimer <= 0) return false;
      if (this.reloadTimer > 0 || this.weaponSwapTimer > 0) return false;
      const targetBearing = Math.atan2(point.y - this.y, point.x - this.x);
      if (!this.viewClearDirection) {
        const leftAngle = targetBearing - Math.PI / 2;
        const rightAngle = targetBearing + Math.PI / 2;
        const leftClear = clearanceAlong(this.x, this.y, leftAngle, 1.25, BOT_RADIUS + 0.015);
        const rightClear = clearanceAlong(this.x, this.y, rightAngle, 1.25, BOT_RADIUS + 0.015);
        if (Math.max(leftClear, rightClear) < 0.30) return false;
        this.viewClearDirection = rightClear > leftClear ? 1 : -1;
        this.viewClearStart = { x: this.x, y: this.y };
        this.path = [];
        this.pathIndex = 0;
        this.pathGoal = null;
        this.pathRefreshNeeded = true;
        this.crouched = false;
        this.lastTacticalReason = `clear view around ${blocker.name}`;
        combatDebug.friendlyViewClearances++;
      }
      const lateralAngle = targetBearing + this.viewClearDirection * Math.PI / 2;
      this.pathAngle += angleDiff(lateralAngle, this.pathAngle) * clamp(dt * 8.5, 0, 1);
      this.angle += angleDiff(targetBearing, this.angle) * clamp(dt * 5.2, 0, 1);
      this.stepMove(lateralAngle, this.speed * 0.68, dt, false);
      const displacement = this.viewClearStart ? dist(this, this.viewClearStart) : 0;
      const stillOccluded = this.firstOperatorOccludingView({ ...point, alive: true, crouched: false, team: this.team === TEAM_BLUE ? TEAM_RED : TEAM_BLUE });
      if (displacement >= 0.68 || (displacement >= 0.20 && stillOccluded !== blocker)) {
        this.viewOcclusionTimer = 0;
        this.viewOccluder = null;
        this.viewOccludedPoint = null;
        this.viewClearDirection = 0;
        this.viewClearStart = null;
      }
      return true;
    }
    firstOperatorInLineOfFire(target, corridorRadius = BOT_RADIUS * 1.18) {
      if (!target) return null;
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const lengthSq = dx * dx + dy * dy;
      if (lengthSq < 0.0001) return null;
      let blocker = null;
      let blockerT = 1;
      for (const other of bots) {
        if (!other || other === this || other === target || !other.alive) continue;
        const ox = other.x - this.x;
        const oy = other.y - this.y;
        const t = (ox * dx + oy * dy) / lengthSq;
        if (t <= 0.055 || t >= 0.94 || t >= blockerT) continue;
        const closestX = this.x + dx * t;
        const closestY = this.y + dy * t;
        const separation = Math.hypot(other.x - closestX, other.y - closestY);
        const postureRadius = corridorRadius * (other.crouched ? 0.88 : 1);
        if (separation > postureRadius) continue;
        if (!hasLineOfSight(this, other)) continue;
        blocker = other;
        blockerT = t;
      }
      return blocker;
    }
    targetPriorityScore(other) {
      if (!other || !other.alive || other.team === this.team) return Infinity;
      const blocker = this.firstOperatorInLineOfFire(other);
      if (blocker) return Infinity;
      const d = dist(this, other);
      const bearing = Math.atan2(other.y - this.y, other.x - this.x);
      const screenOffset = Math.abs(angleDiff(bearing, this.angle));
      const enemyAim = Math.atan2(this.y - other.y, this.x - other.x);
      const aimingAtMe = Math.abs(angleDiff(enemyAim, other.angle));
      let score = d + screenOffset * 2.65 + (other.health / Math.max(1, other.maxHealth || 100)) * 0.16;
      if (other.crouched) score += 0.18;
      if (other.reloadTimer > 0.12 || other.weaponSwapTimer > 0.12) score -= 0.28;
      if (aimingAtMe < 0.34) score -= 0.95;
      if (d < 3.35) score -= 1.15 + (3.35 - d) * 1.85;
      return score;
    }
    isImmediateVisibleThreat(other) {
      if (!other) return false;
      const d = dist(this, other);
      if (d <= 2.9) return true;
      const enemyAim = Math.atan2(this.y - other.y, this.x - other.x);
      return d <= 4.6 && Math.abs(angleDiff(enemyAim, other.angle)) < 0.30;
    }
    findVisibleEnemy() {
      let best = null;
      let bestScore = Infinity;
      for (const other of bots) {
        if (!this.canVisuallySee(other, FOV * 1.24)) continue;
        const score = this.targetPriorityScore(other);
        if (score < bestScore) {
          best = other;
          bestScore = score;
        }
      }
      return best;
    }
    shouldSwitchVisibleTarget(current, challenger) {
      if (!challenger || challenger === current) return false;
      if (!current || !this.canVisuallySee(current, FOV * 1.24)) return true;
      const blocker = this.firstOperatorInLineOfFire(current);
      if (blocker === challenger) return true;
      const challengerImmediate = this.isImmediateVisibleThreat(challenger);
      const currentImmediate = this.isImmediateVisibleThreat(current);
      if (challengerImmediate && (!currentImmediate || dist(this, challenger) + 0.28 < dist(this, current))) return true;
      if (simulationClock < (Number(this.targetCommitUntil) || 0)) return false;
      if (this.targetSwitchCooldown > 0) return false;
      const currentScore = this.targetPriorityScore(current);
      const challengerScore = this.targetPriorityScore(challenger);
      return challengerScore + 1.05 < currentScore && challengerScore < currentScore * 0.82;
    }
    commitVisibleTarget(visible, switched = false) {
      if (!visible) return null;
      this.viewOccluder = null;
      this.viewOccludedPoint = null;
      this.viewOcclusionTimer = 0;
      this.viewClearDirection = 0;
      this.viewClearStart = null;
      const previous = this.target;
      this.target = visible;
      this.sightCandidate = visible;
      this.sightTime = Math.max(this.sightTime, this.reactionDelay);
      this.targetSwitchCooldown = switched ? 0.68 : Math.max(this.targetSwitchCooldown, 0.18);
      this.targetCommitUntil = Math.max(Number(this.targetCommitUntil) || 0, simulationClock + (switched ? 0.92 : 0.64));
      if (switched && previous && previous !== visible) {
        combatDebug.targetSwitches++;
        if (this.isImmediateVisibleThreat(visible)) combatDebug.closeThreatOverrides++;
      }
      if (this.tacticalEnemyKey !== visible.name) {
        this.tacticalEnemyKey = visible.name;
        this.combatBurstCount = 0;
        this.combatBurstTarget = 2 + Math.floor(Math.random() * 2);
        this.combatRepositionRequested = false;
        this.tacticalDecisionTimer = 0;
        this.engagementIdleTimer = 0;
        this.engagementTargetKey = visible.name;
        this.engagementLastShots = this.roundShotsFired || 0;
        this.engagementLastDamage = this.roundDamageDealt || 0;
        if (this.combatCover && this.combatCover.enemyKey !== visible.name) this.clearCombatCover();
      }
      registerCombatContact();
      this.lastPersonalContactAt = simulationClock;
      const enteringCombat = !previous;
      const substantialTargetShift = previous && previous !== visible && dist(previous, visible) > 2.2;
      if (enteringCombat || substantialTargetShift) {
        this.path = [];
        this.pathIndex = 0;
        this.pathGoal = null;
        this.pathRefreshNeeded = false;
        this.pathLeaseUntil = 0;
      }
      this.lastSeen = { x: visible.x, y: visible.y };
      this.lastSeenTimer = 2.35;
      this.rememberHuntEvidence(this.lastSeen, 'visual', 1, visible.name);
      this.searchTimer = 0;
      return visible;
    }
    clearLostCombatTarget() {
      this.target = null;
      this.sightCandidate = null;
      this.path = [];
      this.pathIndex = 0;
      this.pathGoal = null;
      this.pathRefreshNeeded = true;
      this.repathTimer = 0;
      this.sightTime = 0;
      this.burstShots = 0;
      this.flash = 0;
      this.engagementIdleTimer = 0;
      this.engagementTargetKey = '';
      if (this === bots[spectatorIndex]) muzzle = 0;
    }
    updatePerception(dt, fullScan = true) {
      let currentOccluder = null;
      if (this.target && this.target.alive && this.target.team !== this.team) {
        const targetDistance = dist(this, this.target);
        const targetBearing = Math.atan2(this.target.y - this.y, this.target.x - this.x);
        const targetFov = targetDistance < 2.15 ? Math.PI * 0.86 : FOV * 1.24;
        if (targetDistance <= this.weapon.range + 2.2
          && Math.abs(angleDiff(targetBearing, this.angle)) <= targetFov * 0.5
          && hasTargetExposure(this, this.target)) {
          currentOccluder = this.firstOperatorOccludingView(this.target);
          if (currentOccluder) this.rememberViewOcclusion(this.target, currentOccluder);
        }
      }
      const currentVisible = this.target && !currentOccluder && this.canVisuallySee(this.target, FOV * 1.24) ? this.target : null;
      const occludingEnemy = currentOccluder
        && currentOccluder.alive
        && currentOccluder.team !== this.team
        && this.canVisuallySee(currentOccluder, FOV * 1.24)
        ? currentOccluder
        : null;
      const pendingVisible = !this.target
        && this.sightCandidate
        && this.sightCandidate.alive
        && this.sightCandidate.team !== this.team
        && this.canVisuallySee(this.sightCandidate, FOV * 1.24)
        ? this.sightCandidate
        : null;
      let bestVisible = currentVisible || pendingVisible;
      if (fullScan) {
        const challenger = this.findVisibleEnemy();
        if (currentVisible) {
          bestVisible = challenger || currentVisible;
        } else if (!pendingVisible) {
          bestVisible = challenger;
        } else if (challenger && challenger !== pendingVisible) {
          const pendingImmediate = this.isImmediateVisibleThreat(pendingVisible);
          const challengerImmediate = this.isImmediateVisibleThreat(challenger);
          const pendingScore = this.targetPriorityScore(pendingVisible);
          const challengerScore = this.targetPriorityScore(challenger);
          if ((challengerImmediate && !pendingImmediate) || challengerScore + 0.85 < pendingScore) {
            bestVisible = challenger;
          }
        }
      }

      if (occludingEnemy) {
        return this.commitVisibleTarget(occludingEnemy, Boolean(this.target && this.target !== occludingEnemy));
      }

      if (currentVisible) {
        if (bestVisible && this.shouldSwitchVisibleTarget(currentVisible, bestVisible)) {
          return this.commitVisibleTarget(bestVisible, true);
        }
        this.lastSeen = { x: currentVisible.x, y: currentVisible.y };
        this.lastSeenTimer = 2.35;
        this.sightCandidate = currentVisible;
        this.sightTime = Math.max(this.sightTime, this.reactionDelay);
        registerCombatContact();
        this.lastPersonalContactAt = simulationClock;
        return currentVisible;
      }

      if (this.target) this.clearLostCombatTarget();
      const visible = bestVisible;
      if (!visible) {
        this.sightCandidate = null;
        this.sightTime = 0;
        return null;
      }

      if (this.sightCandidate !== visible) {
        this.sightCandidate = visible;
        this.sightTime = 0;
        const d = dist(this, visible);
        const closeThreatReduction = this.isImmediateVisibleThreat(visible) ? 0.075 : 0;
        this.reactionDelay = clamp(0.12 + d * 0.022 + Math.random() * 0.16 + (visible.crouched ? 0.075 : 0) - (this.reactionStatReduction || 0) - closeThreatReduction, 0.075, 0.56);
      }

      this.sightTime += dt;
      if (this.sightTime < this.reactionDelay) return null;
      return this.commitVisibleTarget(visible, false);
    }
    noticeEnemy(dt, enemy) {
      // A brief human-like recognition phase: slow down and bring the enemy
      // towards the centre of the view before committing to a burst.
      const desired = Math.atan2(enemy.y - this.y, enemy.x - this.x);
      this.angle += angleDiff(desired, this.angle) * clamp(dt * 3.4, 0, 1);
      this.pathAngle += angleDiff(desired, this.pathAngle) * clamp(dt * 1.1, 0, 1);
      this.stepMove(this.pathAngle, this.speed * 0.28, dt, false);
    }
    selectOpenCombatFlank(enemy) {
      if (!enemy) return this.flankDirection || 1;
      const bearing = Math.atan2(enemy.y - this.y, enemy.x - this.x);
      const left = bearing - Math.PI / 2;
      const right = bearing + Math.PI / 2;
      const leftClear = clearanceAlong(this.x, this.y, left, 1.35, BOT_RADIUS + 0.01);
      const rightClear = clearanceAlong(this.x, this.y, right, 1.35, BOT_RADIUS + 0.01);
      if (Math.abs(leftClear - rightClear) < 0.12) return this.flankDirection || (Math.random() < 0.5 ? -1 : 1);
      return rightClear > leftClear ? 1 : -1;
    }
    combatRightOfWayValue(enemy) {
      const roleValues = { entry: 6, flanker: 5, support: 4, flex: 3, caller: 3, marksman: 2, anchor: 1 };
      const roleValue = roleValues[this.playerRole] || 3;
      const distanceValue = enemy ? clamp(12 - dist(this, enemy), 0, 12) * 0.08 : 0;
      return roleValue + distanceValue - (Number(this.slot) || 0) * 0.012;
    }
    nearestFriendlyCombatBlocker(enemy, maxDistance = 0.88) {
      if (!enemy) return null;
      const bearing = Math.atan2(enemy.y - this.y, enemy.x - this.x);
      const forwardX = Math.cos(bearing);
      const forwardY = Math.sin(bearing);
      let best = null;
      let bestDistance = Infinity;
      for (const other of bots) {
        if (!other || other === this || !other.alive || other.team !== this.team) continue;
        const ox = other.x - this.x;
        const oy = other.y - this.y;
        const separation = Math.hypot(ox, oy);
        if (separation > maxDistance) continue;
        const forward = ox * forwardX + oy * forwardY;
        const lateral = Math.abs(ox * -forwardY + oy * forwardX);
        if (forward < -0.28 || lateral > 0.55) continue;
        if (separation < bestDistance) {
          best = other;
          bestDistance = separation;
        }
      }
      return best;
    }
    hasCombatRightOfWay(blocker, enemy) {
      if (!blocker) return true;
      const mine = this.combatRightOfWayValue(enemy);
      const theirs = typeof blocker.combatRightOfWayValue === 'function' ? blocker.combatRightOfWayValue(enemy) : 0;
      if (Math.abs(mine - theirs) > 0.08) return mine > theirs;
      return (Number(this.slot) || 0) < (Number(blocker.slot) || 0);
    }
    clearCombatApproach(clearSharedPath = true) {
      this.combatApproachPath = [];
      this.combatApproachIndex = 0;
      this.combatApproachGoal = null;
      this.combatApproachTargetKey = '';
      this.combatApproachTargetOrigin = null;
      this.combatApproachExpires = 0;
      this.combatApproachReason = '';
      this.combatApproachKind = '';
      if (clearSharedPath) {
        this.path = [];
        this.pathIndex = 0;
        this.pathGoal = null;
      }
    }
    findCombatApproachRoute(enemy, options = {}) {
      if (!enemy || !enemy.alive) return null;
      const yielding = Boolean(options.yielding);
      const verticalTransition = Boolean(options.verticalTransition);
      const tacticalFlank = Boolean(options.tacticalFlank);
      const alternate = Math.max(0, Number(options.alternate) || 0);
      const preferred = this.preferredCombatRange();
      const enemyElevation = arenaElevationAt(enemy.x, enemy.y);
      const currentDistance = dist(this, enemy);
      const baseBearing = Math.atan2(this.y - enemy.y, this.x - enemy.x);
      const deterministicSide = ((this.slot + this.team + alternate) % 2 === 0 ? -1 : 1) * (this.flankDirection || 1);
      const constrained = typeof runtimeQualityTier === 'number' && runtimeQualityTier <= 0;
      const rawCandidates = [];

      if (yielding) {
        for (const distanceAway of (constrained ? [1.45, 2.4] : [1.35, 2.0, 2.8, 3.5])) {
          for (const offset of [0, deterministicSide * 0.55, -deterministicSide * 0.75, deterministicSide * 1.15]) {
            rawCandidates.push({
              x: this.x + Math.cos(baseBearing + offset) * distanceAway,
              y: this.y + Math.sin(baseBearing + offset) * distanceAway,
              side: deterministicSide,
              yielding: true
            });
          }
        }
        const ringDirections = constrained ? 6 : 10;
        for (const distanceAway of (constrained ? [1.2, 2.0] : [1.15, 1.8, 2.5])) {
          for (let index = 0; index < ringDirections; index++) {
            const angle = index * TAU / ringDirections;
            rawCandidates.push({
              x: this.x + Math.cos(angle) * distanceAway,
              y: this.y + Math.sin(angle) * distanceAway,
              side: deterministicSide,
              yielding: true,
              localEscape: true
            });
          }
        }
      } else {
        const desiredRadius = clamp(preferred * 0.96, 2.15, Math.max(2.4, Number(this.weapon?.range || 7) * 0.76));
        const radii = constrained ? [desiredRadius, desiredRadius + 1.0] : [desiredRadius, desiredRadius + 1.15, Math.max(1.8, desiredRadius - 0.75)];
        for (const radius of radii) {
          for (const offset of [deterministicSide * 0.82, deterministicSide * 1.35, deterministicSide * 1.92, -deterministicSide * 1.12, Math.PI]) {
            rawCandidates.push({
              x: enemy.x + Math.cos(baseBearing + offset) * radius,
              y: enemy.y + Math.sin(baseBearing + offset) * radius,
              side: deterministicSide,
              yielding: false
            });
          }
        }
        for (const point of hotspots) rawCandidates.push({ x: point.x, y: point.y, side: deterministicSide, yielding: false, hotspot: true });
      }

      let selected = null;
      let bestScore = -Infinity;
      const visited = this.combatRouteCandidateKeys;
      visited.clear();
      for (const raw of rawCandidates) {
        const goal = nearestWalkablePoint(raw.x, raw.y);
        const key = `${Math.round(goal.x * 2)}:${Math.round(goal.y * 2)}`;
        if (visited.has(key) || !canStand(goal.x, goal.y, BOT_RADIUS + 0.02)) continue;
        visited.add(key);
        combatDebug.combatRouteCandidateEvaluations++;
        if (Math.hypot(goal.x - raw.x, goal.y - raw.y) > 1.45) continue;
        const directDistance = dist(this, goal);
        if (directDistance < 0.75 || directDistance > (verticalTransition ? 28 : 22)) continue;
        const goalElevation = arenaElevationAt(goal.x, goal.y);
        if (verticalTransition && Math.abs(goalElevation - enemyElevation) > 0.12) continue;
        const targetDistance = dist(goal, enemy);
        const visibleAtGoal = hasLineOfSight(goal, enemy);
        const directClear = segmentHasNavigationClearance(this, goal, NAV_RADIUS);
        const routeEstimate = directDistance * (directClear ? 1 : 1.22);
        const localClearance = Math.max(
          clearanceAlong(goal.x, goal.y, baseBearing + Math.PI / 2, 0.95, BOT_RADIUS * 0.76),
          clearanceAlong(goal.x, goal.y, baseBearing - Math.PI / 2, 0.95, BOT_RADIUS * 0.76)
        );
        let teammatePenalty = this.navigationGoalCrowding(goal, tacticalFlank ? 1.15 : (yielding ? 0.88 : 1.02));
        const angleFromEnemy = Math.atan2(goal.y - enemy.y, goal.x - enemy.x);
        const lateral = Math.abs(Math.sin(angleDiff(angleFromEnemy, baseBearing)));
        for (const other of bots) {
          if (!other || other === this || !other.alive || other.team !== this.team) continue;
          const otherAnchor = other.combatApproachGoal || other.combatCover?.peek || other.combatCover?.anchor || other.pathGoal || other;
          const angularGap = Math.abs(angleDiff(angleFromEnemy, Math.atan2(otherAnchor.y - enemy.y, otherAnchor.x - enemy.x)));
          if (angularGap < 0.34 && Math.abs(dist(otherAnchor, enemy) - targetDistance) < 1.6) teammatePenalty += (0.34 - angularGap) * 6.4 + 0.9;
        }
        let score;
        if (yielding) {
          const gainedDistance = targetDistance - currentDistance;
          score = gainedDistance * 1.45 + (visibleAtGoal ? -0.45 : 1.15) - routeEstimate * 0.12 - teammatePenalty + localClearance * 0.22;
        } else {
          const rangeFit = -Math.abs(targetDistance - preferred) * 0.72;
          const sightValue = visibleAtGoal ? 1.15 : 0.22;
          score = rangeFit + sightValue + lateral * 1.1 - routeEstimate * 0.09 - teammatePenalty + localClearance * 0.18;
          if (verticalTransition) score += Math.abs(goalElevation - arenaElevationAt(this.x, this.y)) >= 0.35 ? 1.25 : -1.8;
          if (tacticalFlank) {
            if (lateral < 0.62 || routeEstimate < 3.25) continue;
            const routeCommitment = clamp((routeEstimate - 3.25) / 6.5, 0, 1);
            score += lateral * 1.85 + routeCommitment * 0.72 + (visibleAtGoal ? 0.35 : 0.62);
            if ((levelZoneAt(goal.x, goal.y)?.short || '') !== (levelZoneAt(this.x, this.y)?.short || '')) score += 0.28;
          }
          if (raw.hotspot) score -= tacticalFlank ? 0.05 : 0.35;
        }
        if (score > bestScore) {
          bestScore = score;
          selected = { goal, side: raw.side, yielding, score };
        }
      }
      if (!selected) return null;
      if (typeof consumeNavigationPlanSlot === 'function' && !consumeNavigationPlanSlot(this, true)) {
        combatDebug.combatRoutePlanDeferrals++;
        return null;
      }
      combatDebug.combatRouteSearches++;
      const route = findPath(this, selected.goal, this);
      if (!route || route.length < 2) return null;
      const routeLength = pathDistance(route, 1, this);
      if (!Number.isFinite(routeLength) || routeLength > (verticalTransition ? 30 : 24)) return null;
      const resolvedGoal = route.resolvedGoal ? { x: route.resolvedGoal.x, y: route.resolvedGoal.y } : selected.goal;
      return { goal: resolvedGoal, path: route, side: selected.side, yielding, score: selected.score };
    }
    beginCombatApproach(enemy, reason, options = {}) {
      const route = this.findCombatApproachRoute(enemy, options);
      if (!route) return false;
      this.clearCombatCover();
      this.crouched = false;
      this.crouchHoldTimer = 0;
      this.combatApproachPath = route.path.map(point => ({ x: point.x, y: point.y }));
      this.combatApproachIndex = this.combatApproachPath.length > 1 ? 1 : 0;
      this.combatApproachGoal = { ...route.goal };
      this.combatApproachTargetKey = enemy.name;
      this.combatApproachTargetOrigin = { x: enemy.x, y: enemy.y };
      this.combatApproachKind = options.tacticalFlank ? 'tactical-flank' : (options.verticalTransition ? 'vertical-transition' : (route.yielding ? 'yield' : 'combat-route'));
      this.combatApproachExpires = simulationClock + (route.yielding ? 2.6 : (options.verticalTransition ? 7.4 : (options.tacticalFlank ? 6.2 : 4.6)));
      this.combatApproachReason = reason;
      this.path = this.combatApproachPath;
      this.pathIndex = this.combatApproachIndex;
      this.pathGoal = { ...route.goal };
      this.pathRefreshNeeded = false;
      this.repathTimer = 0.75;
      this.setCombatTactic(route.yielding ? 'fallback' : 'reposition', reason, route.yielding ? 1.0 : 1.45, route.yielding ? 0.78 : 1.0);
      this.tacticalDecisionTimer = 0.85;
      this.combatYieldTimer = route.yielding ? 0.9 : 0;
      this.flankDirection = route.side || this.flankDirection;
      combatDebug.combatApproachRoutes++;
      if (route.yielding) combatDebug.combatYieldActions++;
      if (options.tacticalFlank) {
        combatDebug.tacticalFlankRoutes = (Number(combatDebug.tacticalFlankRoutes) || 0) + 1;
        this.tacticalFlankAttempts = (Number(this.tacticalFlankAttempts) || 0) + 1;
        this.tacticalFlankCooldown = 10.5 + Math.random() * 5.5;
        if (typeof diagnosticLogEvent === 'function') diagnosticLogEvent('true_flank_route', this, {
          target: enemy.name,
          reason,
          goal: { x: route.goal.x, y: route.goal.y },
          nodes: route.path.length,
          routeLength: Number(pathDistance(route.path, 1, this).toFixed(2)),
          targetZone: levelZoneAt(route.goal.x, route.goal.y)?.short || null
        });
      }
      if (typeof diagnosticRecordRecovery === 'function') diagnosticRecordRecovery(this, route.yielding ? 'combat_lane_yield' : 'combat_approach_route', {
        target: enemy.name,
        reason,
        goal: { x: route.goal.x, y: route.goal.y },
        nodes: route.path.length,
        blocker: this.combatBlockerKey || null,
        recoveryStage: this.combatRecoveryStage || 0
      });
      return true;
    }
    followCombatApproach(dt, enemy) {
      if (!enemy || !enemy.alive || !this.combatApproachPath?.length || this.combatApproachTargetKey !== enemy.name) return false;
      const targetMoved = this.combatApproachTargetOrigin && dist(this.combatApproachTargetOrigin, enemy) > 1.75;
      if (simulationClock >= this.combatApproachExpires || targetMoved) {
        const reason = targetMoved ? 'refresh moving-target approach' : 'refresh stalled approach route';
        const yielding = this.combatYieldTimer > 0;
        const approachKind = this.combatApproachKind;
        this.clearCombatApproach();
        if (!this.beginCombatApproach(enemy, reason, {
          yielding,
          verticalTransition: approachKind === 'vertical-transition',
          tacticalFlank: approachKind === 'tactical-flank',
          alternate: (this.combatRecoveryStage || 0) + 1
        })) return false;
      }
      while (this.combatApproachIndex < this.combatApproachPath.length && dist(this, this.combatApproachPath[this.combatApproachIndex]) < 0.28) {
        this.combatApproachIndex++;
      }
      if (this.combatApproachIndex >= this.combatApproachPath.length) {
        this.clearCombatApproach();
        this.tacticalDecisionTimer = 0;
        return false;
      }
      this.path = this.combatApproachPath;
      this.pathIndex = this.combatApproachIndex;
      this.pathGoal = this.combatApproachGoal ? { ...this.combatApproachGoal } : null;
      const waypoint = this.combatApproachPath[this.combatApproachIndex];
      const moveAngle = Math.atan2(waypoint.y - this.y, waypoint.x - this.x);
      const desired = this.aimAtThreat(dt, enemy, 6.8);
      const speedFactor = this.combatYieldTimer > 0 ? 0.72 : 0.78;
      this.stepMove(moveAngle, this.speed * this.moveSkill * speedFactor, dt, false, true);
      const targetDistance = dist(this, enemy);
      this.fireCombatBurst(enemy, targetDistance, desired, targetDistance <= Number(this.weapon?.range || 0));
      return true;
    }
    updateCombatRecoveryProgress(moved) {
      if (!this.combatRecoveryOrigin) return false;
      const displacement = dist(this, this.combatRecoveryOrigin);
      this.combatRecoveryBestDisplacement = Math.max(this.combatRecoveryBestDisplacement || 0, displacement);
      if (displacement < 0.58 || moved < 0.002) return false;
      combatDebug.combatRecoverySuccesses++;
      if (typeof diagnosticRecordRecovery === 'function') diagnosticRecordRecovery(this, 'combat_recovery_succeeded', {
        target: this.combatRecoveryTargetKey || null,
        displacement,
        recoveryStage: this.combatRecoveryStage || 0,
        reason: this.lastTacticalReason
      });
      this.combatRecoveryStage = 0;
      this.combatRecoveryTargetKey = '';
      this.combatRecoveryOrigin = null;
      this.combatRecoveryBestDisplacement = 0;
      this.combatBlockerKey = '';
      this.combatBlockerType = '';
      return true;
    }
    forceCombatMobility(enemy, reason = 'recover stalled engagement', options = {}) {
      if (!enemy || !enemy.alive || this.reloadTimer > 0 || this.weaponSwapTimer > 0) return false;
      if (this.combatRecoveryCooldown > 0 && this.combatApproachPath?.length) return false;
      const d = dist(this, enemy);
      const preferred = this.preferredCombatRange();
      const sameTarget = this.combatRecoveryTargetKey === enemy.name && this.combatRecoveryOrigin;
      const displacement = sameTarget ? dist(this, this.combatRecoveryOrigin) : Infinity;
      if (!sameTarget || displacement >= 0.58 || simulationClock - (this.combatRecoveryLastAt || -999) > 5.5) {
        this.combatRecoveryStage = 1;
        this.combatRecoveryTargetKey = enemy.name;
        this.combatRecoveryOrigin = { x: this.x, y: this.y };
        this.combatRecoveryBestDisplacement = 0;
      } else {
        this.combatRecoveryStage = Math.min(4, (this.combatRecoveryStage || 1) + 1);
        if (this.combatRecoveryStage > 1) combatDebug.combatRecoveryEscalations++;
      }
      this.combatRecoveryLastAt = simulationClock;
      this.combatRecoveryCooldown = 1.15 + this.combatRecoveryStage * 0.18;
      this.combatMobilityTimer = 1.05;
      this.clearCombatCover();
      this.crouched = false;
      this.crouchHoldTimer = 0;
      this.flankDirection = this.selectOpenCombatFlank(enemy);
      this.combatRepositionRequested = false;
      this.combatBurstPause = 0;
      this.engagementIdleTimer = 0;
      this.engagementLastShots = this.roundShotsFired || 0;
      this.engagementLastDamage = this.roundDamageDealt || 0;

      const blocker = options.blocker || this.nearestFriendlyCombatBlocker(enemy);
      const friendlyBlocker = blocker && blocker.team === this.team ? blocker : null;
      this.combatBlockerKey = friendlyBlocker?.name || '';
      this.combatBlockerType = friendlyBlocker ? 'team-mate' : (blocker ? 'enemy' : 'world');
      const yielding = Boolean(friendlyBlocker && !this.hasCombatRightOfWay(friendlyBlocker, enemy));
      const outnumbered = (() => {
        const numbers = this.combatNumbers();
        return numbers.hostileLocal > numbers.friendlyLocal || numbers.hostile > numbers.friendly + 1;
      })();
      const outsideRange = d > Number(this.weapon?.range || 0) * 0.94;
      const forceRoute = Boolean(options.forceRoute || friendlyBlocker || outsideRange || this.combatRecoveryStage >= 2 || this.moveBlocked);
      let routed = false;
      if (forceRoute) {
        const routeReason = yielding
          ? `yield team-mate lane to ${friendlyBlocker.name}`
          : (outnumbered && outsideRange ? 'break outnumbered range deadlock' : (this.combatRecoveryStage >= 2 ? 'escalate to alternate combat route' : reason));
        routed = this.beginCombatApproach(enemy, routeReason, {
          yielding,
          alternate: this.combatRecoveryStage + (options.alternate || 0)
        });
      }
      if (!routed) {
        this.clearCombatApproach();
        this.tacticalMode = d > preferred * 1.18 ? 'push' : 'reposition';
        this.lastTacticalReason = reason;
        this.tacticalModeTimer = 0.72;
        this.tacticalDecisionTimer = 0.62;
      }
      combatDebug.combatStallRecoveries++;
      if (typeof diagnosticRecordRecovery === 'function') diagnosticRecordRecovery(this, 'combat_stall_recovery', {
        target: enemy.name,
        reason: this.lastTacticalReason,
        blocker: friendlyBlocker?.name || null,
        blockerType: this.combatBlockerType,
        recoveryStage: this.combatRecoveryStage,
        routed
      });
      return true;
    }
    updateEngagementProgress(dt, enemy) {
      if (!enemy || !enemy.alive) {
        this.engagementIdleTimer = 0;
        this.engagementTargetKey = '';
        this.engagementLastShots = this.roundShotsFired || 0;
        this.engagementLastDamage = this.roundDamageDealt || 0;
        return false;
      }
      if (this.engagementTargetKey !== enemy.name) {
        this.engagementTargetKey = enemy.name;
        this.engagementIdleTimer = 0;
        this.engagementLastShots = this.roundShotsFired || 0;
        this.engagementLastDamage = this.roundDamageDealt || 0;
        return false;
      }
      const shots = this.roundShotsFired || 0;
      const damage = this.roundDamageDealt || 0;
      const fired = shots > this.engagementLastShots;
      const damaged = damage > this.engagementLastDamage + 0.01;
      const moved = this.moveVelocity > 0.085;
      this.engagementLastShots = shots;
      this.engagementLastDamage = damage;
      if (fired || damaged || moved || this.reloadTimer > 0 || this.weaponSwapTimer > 0) {
        this.engagementIdleTimer = Math.max(0, this.engagementIdleTimer - dt * 4.2);
        return false;
      }

      this.engagementIdleTimer += dt;
      const distanceToEnemy = dist(this, enemy);
      const lineBlocker = this.firstOperatorInLineOfFire(enemy);
      const friendlyLineBlocker = lineBlocker && lineBlocker.team === this.team ? lineBlocker : null;
      const outsideEffectiveRange = distanceToEnemy > Number(this.weapon?.range || 0) * 0.96;
      const outOfRangeCrouchHold = this.crouched && outsideEffectiveRange && !this.combatApproachPath?.length;
      const threshold = friendlyLineBlocker ? 0.38 : (outOfRangeCrouchHold ? 0.52 : (lineBlocker ? 0.42 : (distanceToEnemy < 3.4 ? 0.56 : 1.05)));
      if (this.engagementIdleTimer < threshold || this.combatMobilityTimer > 0 || this.combatRecoveryCooldown > 0) return false;
      const reason = friendlyLineBlocker
        ? 'clear friendly line of fire'
        : (outOfRangeCrouchHold
          ? 'break out-of-range crouch hold'
          : (lineBlocker ? 'engage immediate blocker' : (distanceToEnemy < 3.4 ? 'answer close-range pressure' : 'recover stalled engagement')));
      return this.forceCombatMobility(enemy, reason, {
        blocker: friendlyLineBlocker,
        forceRoute: Boolean(friendlyLineBlocker || outOfRangeCrouchHold || outsideEffectiveRange)
      });
    }
    updateLocomotionStall(dt, moved, visibleEnemy) {
      this.updateCombatRecoveryProgress(moved);
      const failedCombatMovement = Boolean(visibleEnemy && this.moveIntent > this.speed * 0.2 && (this.moveBlocked || moved < 0.006));
      if (failedCombatMovement) {
        this.combatBlockedTimer = (this.combatBlockedTimer || 0) + dt;
        const blocker = this.nearestFriendlyCombatBlocker(visibleEnemy);
        this.combatBlockerKey = blocker?.name || '';
        this.combatBlockerType = blocker ? 'team-mate' : 'world';
        if (this.combatBlockedTimer >= 0.34 && this.combatRecoveryCooldown <= 0) {
          const reason = blocker ? `resolve blocked team lane with ${blocker.name}` : 'route around blocked combat advance';
          this.forceCombatMobility(visibleEnemy, reason, { blocker, forceRoute: true, alternate: 1 });
          this.combatBlockedTimer = 0;
        }
      } else {
        this.combatBlockedTimer = Math.max(0, (this.combatBlockedTimer || 0) - dt * 3.5);
        if (!visibleEnemy && this.combatBlockedTimer <= 0) {
          this.combatBlockerKey = '';
          this.combatBlockerType = '';
        }
      }
      const stationary = moved < 0.008 && this.moveVelocity < 0.075;
      const actionableContext = Boolean(this.heardSound || this.lastSeen || this.objective || (this.path && this.path.length > this.pathIndex));
      const exempt = Boolean(visibleEnemy || this.reloadTimer > 0 || this.weaponSwapTimer > 0 || this.deathAnim > 0);
      if (!this.crouched || !stationary || exempt || !actionableContext) {
        this.crouchStationaryTimer = Math.max(0, (this.crouchStationaryTimer || 0) - dt * 4);
        return false;
      }

      this.crouchStationaryTimer = (this.crouchStationaryTimer || 0) + dt;
      const pressure = Boolean(this.heardSound || this.lastSeen || isLateRoundHuntActive());
      const threshold = pressure ? 0.9 : 1.45;
      if (this.crouchStationaryTimer < threshold) return false;

      // A crouch is a posture choice, never a permanent navigation state. If an
      // operator has not translated for a sustained interval, release the hold,
      // discard stale cover/path ownership and immediately request a fresh route.
      this.crouched = false;
      this.crouchHoldTimer = 0;
      this.crouchStationaryTimer = 0;
      this.clearCombatCover();
      this.path = [];
      this.pathIndex = 0;
      this.pathGoal = null;
      this.pathRefreshNeeded = true;
      this.repathTimer = 0;
      this.cornerPause = 0;
      this.coordinationWaitTimer = 0;
      this.coordinationHoldTimer = Math.max(this.coordinationHoldTimer || 0, 0.8);
      this.lastTacticalReason = pressure ? 'resume movement toward contact' : 'release stationary crouch';
      combatDebug.crouchStallRecoveries++;
      if (typeof diagnosticRecordRecovery === 'function') diagnosticRecordRecovery(this, 'crouch_stall_recovery', { reason: this.lastTacticalReason });
      return true;
    }
    clearCombatCover() {
      this.combatCover = null;
      this.reloadCoverCommitActive = false;
      this.coverHoldTimer = 0;
      this.peekHoldTimer = 0;
      this.exposureTimer = 0;
      if (['cover', 'hold', 'peek', 'return', 'reload'].includes(this.tacticalMode)) this.tacticalMode = 'advance';
    }
    preferredCombatRange() {
      const weaponRange = Number(this.weapon?.range) || 8;
      const closeWeapon = weaponRange <= 9;
      const plannedRange = Number(this.engagementRangeMultiplier) || 1;
      const roleRange = this.playerRole === 'marksman' ? 1.12 : (this.playerRole === 'entry' ? 0.88 : 1);
      return clamp(weaponRange * (closeWeapon ? 0.52 : 0.60) * plannedRange * roleRange, closeWeapon ? 2.35 : 3.0, 9.1);
    }
    combatNumbers() {
      const enemyTeam = this.team === TEAM_BLUE ? TEAM_RED : TEAM_BLUE;
      const localRadius = 6.2;
      const friendlyLocal = bots.filter(other => other.alive && other.team === this.team && dist(this, other) <= localRadius).length;
      const hostileLocal = bots.filter(other => other.alive && other.team === enemyTeam && dist(this, other) <= localRadius && (hasLineOfSight(this, other) || other === this.target)).length;
      return {
        friendly: teamAliveCount(this.team),
        hostile: teamAliveCount(enemyTeam),
        friendlyLocal,
        hostileLocal
      };
    }
    findCombatCover(enemy, retreat = false) {
      const threat = enemy || this.lastSeen;
      if (!threat || this.combatCoverCooldown > 0) return null;
      const currentThreatDistance = dist(this, threat);
      const preferred = this.preferredCombatRange();
      const awayBearing = Math.atan2(this.y - threat.y, this.x - threat.x);
      const radii = [0.72, 1.02, 1.34, 1.72, 2.12, 2.58, 3.0];
      let best = null;
      let bestScore = -Infinity;

      for (let ring = 0; ring < radii.length; ring++) {
        const radius = radii[ring];
        for (let i = 0; i < 20; i++) {
          const sweep = i * TAU / 20;
          const angle = awayBearing + sweep;
          const raw = {
            x: this.x + Math.cos(angle) * radius,
            y: this.y + Math.sin(angle) * radius
          };
          const anchor = nearestWalkablePoint(raw.x, raw.y);
          if (dist(raw, anchor) > 0.62) continue;
          if (!canStand(anchor.x, anchor.y, BOT_RADIUS + 0.02)) continue;
          if (!canTravelBetween(this.x, this.y, anchor.x, anchor.y, BOT_RADIUS + 0.01)) continue;
          if (hasLineOfSight(anchor, threat)) continue;

          let peek = null;
          let peekScore = -Infinity;
          const threatBearing = Math.atan2(threat.y - anchor.y, threat.x - anchor.x);
          for (const peekRadius of [0.42, 0.56, 0.72, 0.86]) {
            for (let j = 0; j < 16; j++) {
              const peekAngle = threatBearing + j * TAU / 16;
              const point = {
                x: anchor.x + Math.cos(peekAngle) * peekRadius,
                y: anchor.y + Math.sin(peekAngle) * peekRadius
              };
              if (!canStand(point.x, point.y, BOT_RADIUS + 0.01)) continue;
              if (!canTravelBetween(anchor.x, anchor.y, point.x, point.y, BOT_RADIUS)) continue;
              if (!hasLineOfSight(point, threat)) continue;
              const exposureDistance = dist(point, threat);
              if (exposureDistance < 1.35) continue;
              const lateral = Math.abs(Math.sin(angleDiff(peekAngle, threatBearing)));
              const score = lateral * 0.75 - dist(this, point) * 0.08 - Math.abs(exposureDistance - preferred) * 0.025;
              if (score > peekScore) {
                peek = point;
                peekScore = score;
              }
            }
          }
          if (!peek && !retreat) continue;

          const threatDistance = dist(anchor, threat);
          const moveCost = dist(this, anchor);
          let crowdPenalty = 0;
          for (const other of bots) {
            if (other === this || !other.alive || other.team !== this.team) continue;
            const separation = dist(other, anchor);
            if (separation < 1.05) crowdPenalty += (1.05 - separation) * 1.6;
            if (other.combatCover?.anchor && dist(other.combatCover.anchor, anchor) < 1.35) crowdPenalty += 0.9;
          }
          let score = 1.35 - moveCost * 0.52 - crowdPenalty;
          score += retreat
            ? (threatDistance - currentThreatDistance) * 0.18
            : -Math.abs(threatDistance - preferred) * 0.055;
          if (peek) score += 0.85 + peekScore;
          if (threatDistance < currentThreatDistance - 0.9 && retreat) score -= 1.4;
          if (score > bestScore) {
            bestScore = score;
            best = { anchor, peek, enemyKey: enemy?.name || this.tacticalEnemyKey || '', score };
          }
        }
      }
      return best;
    }
    setCombatTactic(mode, reason, timer, commitSeconds = 0.82) {
      const minimumCommit = ({ hold: 1.18, push: 1.02, fallback: 0.92, reposition: 1.08, cover: 1.28, return: 0.92, reload: 1.12, peek: 0.72 }[mode] || 0.86);
      const sameIntent = this.tacticalMode === mode && this.lastTacticalReason === reason;
      this.tacticalMode = mode;
      this.lastTacticalReason = reason;
      this.tacticalModeTimer = Math.max(Number(this.tacticalModeTimer) || 0, Number(timer) || 0, sameIntent ? 0.28 : 0);
      this.tacticalCommitUntil = Math.max(Number(this.tacticalCommitUntil) || 0, simulationClock + Math.max(minimumCommit, Number(commitSeconds) || 0));
      return mode;
    }
    assignCombatCover(cover, reason) {
      if (!cover) return false;
      this.combatCover = cover;
      this.setCombatTactic('cover', reason, 1.2, 1.0);
      this.tacticalDecisionTimer = 0.72 + Math.random() * 0.45;
      this.combatCoverCooldown = 0.55;
      this.coverHoldTimer = 0;
      this.peekHoldTimer = 0;
      this.exposureTimer = 0;
      this.burstShots = 0;
      this.combatBurstPause = 0;
      this.combatBurstCount = 0;
      this.combatRepositionRequested = false;
      combatDebug.coverSelections++;
      return true;
    }
    chooseCombatTactic(enemy, force = false) {
      if (!enemy || !enemy.alive) return;
      const d = dist(this, enemy);
      const preferred = this.preferredCombatRange();
      const healthRatio = this.health / Math.max(1, this.maxHealth || 100);
      const ammoRatio = this.magAmmo / Math.max(1, this.weapon.magSize);
      const enemyReloading = enemy.reloadTimer > 0.18 || enemy.weaponSwapTimer > 0.16;
      const decisiveContact = isUrgentHuntActive() && (suddenHuntOvertime || roundTime <= 34 || totalAliveCount() === 2);
      const plannedThreshold = clamp(Number(this.lowHealthThreshold) || 0.43, 0.24, 0.62);
      const criticalHealth = decisiveContact ? Math.min(0.22, plannedThreshold * 0.58) : plannedThreshold;
      const critical = this.wantsSafeReload || this.magAmmo <= 0 || healthRatio < criticalHealth;

      if (!force && this.combatApproachPath?.length && this.combatApproachTargetKey === enemy.name && simulationClock < this.combatApproachExpires) return;
      if (!force && this.tacticalDecisionTimer > 0 && !this.combatRepositionRequested) return;
      if (!force && simulationClock < (Number(this.tacticalCommitUntil) || 0) && !critical && !enemyReloading && !this.combatRepositionRequested) return;
      const urgentDecision = Boolean(force || critical || enemyReloading || this.combatRepositionRequested || decisiveContact);
      if (typeof consumeBotTacticalSlot === 'function' && !consumeBotTacticalSlot(this, urgentDecision)) {
        this.tacticalDecisionTimer = Math.max(this.tacticalDecisionTimer, 0.026 + (Math.max(0, Number(this.slot) || 0) % 5) * 0.005);
        return;
      }
      const numbers = this.combatNumbers();
      const outnumbered = numbers.hostileLocal > numbers.friendlyLocal || numbers.hostile > numbers.friendly + 1;
      const advantage = numbers.friendlyLocal > numbers.hostileLocal || numbers.friendly > numbers.hostile;
      this.tacticalDecisionTimer = (decisiveContact ? 0.50 + Math.random() * 0.38 : 0.88 + Math.random() * 0.56) * clamp(Number(this.tacticalDecisionMultiplier) || 1, 0.88, 1.12);

      const committedCover = this.combatCover && ['cover', 'hold', 'peek', 'return', 'reload'].includes(this.tacticalMode);
      let previousCoverAnchor = null;
      if (committedCover) {
        if ((critical || outnumbered) && ['hold', 'peek'].includes(this.tacticalMode)) {
          this.tacticalMode = 'return';
          this.lastTacticalReason = this.wantsSafeReload ? 'safe reload' : (outnumbered ? 'outnumbered' : 'preserve health');
          this.burstShots = 0;
          return;
        }
        // Reposition requests raised while exposed are carried back to the
        // anchor first. Once safely holding again, release the old cover and
        // deliberately choose a different firing position.
        if (this.combatRepositionRequested && this.tacticalMode === 'hold') {
          previousCoverAnchor = { ...this.combatCover.anchor };
          this.clearCombatCover();
        } else {
          return;
        }
      }

      const coverPreference = Number(this.coverBias) || 0;
      if (critical || (outnumbered && healthRatio < (decisiveContact ? 0.34 : 0.72)) || (coverPreference > 0.1 && healthRatio < 0.74 && this.exposureTimer > 0.55)) {
        const cover = this.findCombatCover(enemy, true);
        if (cover && this.assignCombatCover(cover, this.wantsSafeReload ? 'safe reload' : (outnumbered ? 'outnumbered' : 'low health'))) {
          combatDebug.tacticalRetreats++;
          return;
        }
        this.clearCombatCover();
        this.setCombatTactic('fallback', this.wantsSafeReload ? 'break line of sight' : (outnumbered ? 'avoid multi-angle fight' : 'preserve health'), 0.82 + Math.random() * 0.42, 0.9);
        combatDebug.tacticalRetreats++;
        return;
      }

      if (enemyReloading && healthRatio > 0.42 && ammoRatio > 0.18) {
        this.clearCombatCover();
        this.setCombatTactic('push', 'enemy reloading', 0.72 + Math.random() * 0.42, 0.78);
        combatDebug.tacticalPushes++;
        return;
      }

      const flankRole = this.playerRole === 'flanker';
      const flankBias = clamp(Number(this.flankBias) || 0, -0.4, 0.8);
      const groupPenalty = this.teamPriorityId === 'group' ? 0.28 : (this.teamPriorityId === 'hold' ? 0.18 : 0);
      const flankTrigger = this.combatRepositionRequested || this.combatBurstCount >= Math.max(1, this.combatBurstTarget - 1) || (force && advantage);
      const flankChance = clamp((flankRole ? 0.62 : 0.12) + flankBias * 0.36 - groupPenalty, 0.04, 0.78);
      if (!decisiveContact && flankTrigger && this.tacticalFlankCooldown <= 0 && healthRatio > 0.46 && ammoRatio > 0.20 && d > 3.2 && numbers.friendly >= 2 && Math.random() < flankChance) {
        if (this.beginCombatApproach(enemy, flankRole ? 'role flank around contact' : 'supporting alternate angle', {
          tacticalFlank: true,
          alternate: (this.tacticalFlankAttempts || 0) + this.slot
        })) {
          this.combatRepositionRequested = false;
          this.combatBurstCount = 0;
          this.combatBurstTarget = 2 + Math.floor(Math.random() * 2);
          combatDebug.tacticalRepositions++;
          return;
        }
        this.tacticalFlankCooldown = 3.5 + Math.random() * 2.5;
      }

      if (decisiveContact && this.combatRepositionRequested && healthRatio > 0.28 && ammoRatio > 0.16) {
        // In a final duel, do not break a genuine sightline after every short
        // pistol burst. Keep pressure while the opponent is visible, then use
        // cover only for a real reload or serious health emergency.
        this.combatRepositionRequested = false;
        this.combatBurstTarget = 4 + Math.floor(Math.random() * 3);
        this.repositionCooldown = 0.75;
      }

      if (this.combatRepositionRequested || (!decisiveContact && this.combatBurstCount >= this.combatBurstTarget && this.repositionCooldown <= 0)) {
        const cover = this.findCombatCover(enemy, false);
        const changedCover = cover && (!previousCoverAnchor || dist(cover.anchor, previousCoverAnchor) > 0.95);
        this.combatRepositionRequested = false;
        this.combatBurstCount = 0;
        this.combatBurstTarget = 2 + Math.floor(Math.random() * 2);
        this.repositionCooldown = 1.2 + Math.random() * 0.8;
        if (changedCover && this.assignCombatCover(cover, 'post-burst relocation')) {
          combatDebug.tacticalRepositions++;
          return;
        }
        this.clearCombatCover();
        this.setCombatTactic('reposition', 'change firing angle', 0.78 + Math.random() * 0.48, 0.92);
        this.flankDirection *= Math.random() < 0.68 ? 1 : -1;
        combatDebug.tacticalRepositions++;
        return;
      }

      if (d > Math.min(this.weapon.range * 0.82, preferred * 1.32)) {
        this.clearCombatCover();
        this.setCombatTactic('push', advantage ? 'close with team advantage' : 'enter effective range', 0.76 + Math.random() * 0.48, 0.88);
        combatDebug.tacticalPushes++;
        return;
      }

      const minimumSpacing = decisiveContact ? Math.max(1.18, preferred * 0.40) : Math.max(1.75, preferred * 0.58);
      if (d < minimumSpacing) {
        this.clearCombatCover();
        this.setCombatTactic('fallback', 'restore weapon spacing', decisiveContact ? 0.34 + Math.random() * 0.26 : 0.68 + Math.random() * 0.42, decisiveContact ? 0.34 : 0.76);
        combatDebug.tacticalRetreats++;
        return;
      }

      const baseCoverInterest = clamp((1 - healthRatio) * 0.7 + this.stealth * 0.24 + (outnumbered ? 0.28 : 0), 0.08, 0.82);
      const coverInterest = decisiveContact ? baseCoverInterest * 0.22 : baseCoverInterest;
      if (!this.combatCover && Math.random() < coverInterest) {
        const cover = this.findCombatCover(enemy, false);
        if (cover && this.assignCombatCover(cover, 'controlled angle')) return;
      }

      this.clearCombatCover();
      const nextMode = decisiveContact && d > preferred * 0.86
        ? 'push'
        : (advantage && Math.random() < 0.34 ? 'reposition' : 'hold');
      const nextReason = decisiveContact
        ? (nextMode === 'push' ? 'close final duel' : 'maintain final contact')
        : (nextMode === 'reposition' ? 'separate firing angle' : 'hold effective range');
      this.setCombatTactic(nextMode, nextReason, decisiveContact ? 0.68 + Math.random() * 0.54 : 0.72 + Math.random() * 0.76, decisiveContact ? 0.66 : 0.96);
    }
    aimAtThreat(dt, threat, turnRate = 7.2) {
      if (!threat) return this.angle;
      const trueBearing = Math.atan2(threat.y - this.y, threat.x - this.x);
      const desired = trueBearing + (Number(this.flinchAimOffset) || 0);
      const flinchRecovery = this.flinchTimer > 0 ? 0.72 : 1;
      this.angle += angleDiff(desired, this.angle) * clamp(dt * turnRate * flinchRecovery, 0, 1);
      return trueBearing;
    }
    sprintReadiness() {
      const baselineFatigue = clamp((Number(this.playerFatigue) || 0) * 0.65 + (Number(this.movementFatigue) || 0), 0, 100);
      return clamp(1 - baselineFatigue / 100, 0, 1);
    }
    sprintSpeedMultiplier(moveAngle, moveSpeed) {
      if (this.crouched || moveSpeed < this.speed * 0.72 || this.reloadTimer > 0 || this.weaponSwapTimer > 0) return 1;
      const readiness = this.sprintReadiness();
      if (readiness < 0.22) return 1;
      const tacticalBurst = ['push', 'fallback', 'reposition'].includes(this.tacticalMode) || this.escapeTimer > 0;
      const routePressure = (!this.lastSeen && !this.target && this.remainingRouteDistance() > 2.6) || (this.path.length - this.pathIndex) > 2;
      if (!tacticalBurst && !routePressure) return 1;
      const forwardClearance = clearanceAlong(this.x, this.y, moveAngle, 0.95, BOT_RADIUS + 0.01);
      if (forwardClearance < 0.62) return 1;
      return 1.10 + readiness * (tacticalBurst ? 0.18 : 0.13);
    }
    updateCombatStalemate(dt, enemy) {
      if (!enemy || !enemy.alive) {
        this.stalemateTimer = 0;
        return;
      }
      const myCovering = Boolean(this.combatCover) || ['cover', 'hold', 'peek', 'return', 'reload'].includes(this.tacticalMode) || this.wantsSafeReload;
      const enemyCovering = Boolean(enemy.combatCover) || ['cover', 'hold', 'peek', 'return', 'reload'].includes(enemy.tacticalMode) || enemy.wantsSafeReload;
      const recentDamageAgo = simulationClock - Math.max(this.lastDamageTime || -999, enemy.lastDamageTime || -999);
      const healthRatio = this.health / Math.max(1, this.maxHealth || 100);
      const enemyHealthRatio = enemy.health / Math.max(1, enemy.maxHealth || 100);
      const ammoReady = this.magAmmo > Math.max(1, Math.floor(this.weapon.magSize * 0.18));
      const isolatedFight = totalAliveCount() <= 4;
      const lowHealthDuel = healthRatio < 0.42 && enemyHealthRatio < 0.42;
      if (myCovering && enemyCovering && recentDamageAgo > 1.05 && healthRatio > 0.10 && ammoReady) {
        const urgency = lowHealthDuel ? 1.75 : (isolatedFight ? 1.35 : 1.0);
        this.stalemateTimer += dt * urgency;
      } else {
        this.stalemateTimer = Math.max(0, this.stalemateTimer - dt * 2.2);
      }
      const threshold = lowHealthDuel ? 1.25 : 1.65;
      if (this.stalemateTimer > threshold) {
        this.stalemateTimer = 0;
        this.repositionCooldown = 0;
        this.coverHoldTimer = 0;
        this.peekHoldTimer = 0;
        const designatedInitiator = String(this.name).localeCompare(String(enemy.name)) < 0;
        const canCommit = !this.wantsSafeReload && this.magAmmo > Math.max(1, Math.floor(this.weapon.magSize * 0.20));
        if (lowHealthDuel && canCommit) {
          if (designatedInitiator) {
            this.clearCombatCover();
            this.combatRepositionRequested = false;
            this.tacticalMode = dist(this, enemy) > Math.max(2.1, this.preferredCombatRange() * 0.72) ? 'push' : 'reposition';
            this.lastTacticalReason = 'force low-health duel decision';
            this.tacticalModeTimer = 0.78 + Math.random() * 0.32;
            this.tacticalDecisionTimer = 0.72;
          } else if (this.combatCover?.peek) {
            this.tacticalMode = 'peek';
            this.peekHoldTimer = 0.88 + Math.random() * 0.42;
            this.exposureTimer = 1.25 + Math.random() * 0.45;
            this.lastTacticalReason = 'challenge low-health stalemate';
            this.tacticalDecisionTimer = 0.72;
          } else {
            this.combatRepositionRequested = true;
            this.tacticalDecisionTimer = 0;
          }
        } else {
          this.combatRepositionRequested = true;
          this.tacticalDecisionTimer = 0;
          if (canCommit && healthRatio > 0.56) {
            this.clearCombatCover();
            this.tacticalMode = 'push';
            this.lastTacticalReason = 'break cover stalemate';
            this.tacticalModeTimer = 0.52 + Math.random() * 0.34;
          }
        }
        combatDebug.stalemateBreaks++;
      }
    }
    moveToCombatPoint(dt, point, threat, speedFactor = 0.68) {
      if (!point) return false;
      this.aimAtThreat(dt, threat, 7.0);
      const d = dist(this, point);
      if (d <= 0.18) return true;
      const moveAngle = Math.atan2(point.y - this.y, point.x - this.x);
      this.stepMove(moveAngle, this.speed * this.moveSkill * speedFactor, dt, true);
      return dist(this, point) <= 0.22;
    }
    fireCombatBurst(enemy, distanceToEnemy, desired, allowFire = true) {
      if (!allowFire || !enemy || !enemy.alive || this.reloadTimer > 0 || this.weaponSwapTimer > 0 || this.flinchTimer > 0 || this.wantsSafeReload && this.magAmmo <= 0) {
        this.burstShots = 0;
        this.flash = 0;
        if (this === bots[spectatorIndex]) muzzle = 0;
        return false;
      }
      const angleToTarget = Math.abs(angleDiff(desired, this.angle));
      const stillVisible = this.canVisuallySee(enemy, FOV * 0.86);
      if (!stillVisible || distanceToEnemy > this.weapon.range || angleToTarget >= 0.16) {
        this.burstShots = 0;
        this.flash = 0;
        if (this === bots[spectatorIndex]) muzzle = 0;
        return false;
      }

      if (this.burstShots <= 0 && this.combatBurstPause <= 0) {
        const pistol = this.usingSecondary || this.weapon.category === 'pistol';
        const decisiveContact = isUrgentHuntActive() && (suddenHuntOvertime || roundTime <= 34 || totalAliveCount() === 2);
        this.burstShots = pistol
          ? (decisiveContact ? 2 + (Math.random() < 0.36 ? 1 : 0) : 1 + (Math.random() < (Number(this.weapon?.burstChance) || 0.38) ? 1 : 0))
          : 2 + (Math.random() < 0.54 ? 1 : 0);
        this.burstGap = 0;
        this.combatBurstCount++;
      }
      if (this.burstShots > 0 && this.cooldown <= 0 && this.burstGap <= 0) {
        if (this.shoot(enemy, distanceToEnemy)) {
          this.burstShots--;
          this.burstGap = 0.028 + Math.random() * 0.052;
          if (this.burstShots <= 0) {
            const decisiveContact = isUrgentHuntActive() && (suddenHuntOvertime || roundTime <= 34 || totalAliveCount() === 2);
            this.combatBurstPause = decisiveContact
              ? 0.11 + (Number(this.weapon?.recoilKick) || 1) * 0.04 + Math.random() * 0.16
              : 0.18 + (Number(this.weapon?.recoilKick) || 1) * 0.06 + Math.random() * 0.30;
            if (this.combatBurstCount >= this.combatBurstTarget) this.combatRepositionRequested = true;
          }
          return true;
        }
        this.burstShots = 0;
      }
      return false;
    }
    updateCoverCombat(dt, enemy) {
      const cover = this.combatCover;
      const threat = enemy || this.lastSeen;
      if (!cover || !threat) return false;
      if (!canStand(cover.anchor.x, cover.anchor.y, BOT_RADIUS + 0.01)) {
        this.clearCombatCover();
        return false;
      }
      if (enemy && dist(this, enemy) < 2.9 && this.magAmmo > 0 && this.reloadTimer <= 0) {
        this.clearCombatCover();
        this.crouched = false;
        this.crouchHoldTimer = 0;
        this.tacticalMode = 'reposition';
        this.lastTacticalReason = 'answer close-range pressure';
        this.tacticalModeTimer = 0.68;
        this.tacticalDecisionTimer = 0.58;
        this.combatMobilityTimer = 0.72;
        this.flankDirection = this.selectOpenCombatFlank(enemy);
        return false;
      }

      if (this.tacticalMode === 'cover' || this.tacticalMode === 'return') {
        const arrived = this.moveToCombatPoint(dt, cover.anchor, threat, this.tacticalMode === 'return' ? 0.82 : 0.72);
        if (arrived) {
          this.crouched = true;
          if (this.reloadCoverRequired) this.registerReloadCoverIntent(threat);
          if (this.reloadCoverCommitActive) {
            this.reloadCoverCommitActive = false;
            if (!this.reloadCoverArrivalRegistered) {
              this.reloadCoverArrivalRegistered = true;
              combatDebug.reloadCoverArrivals++;
              if (typeof diagnosticLogEvent === 'function') diagnosticLogEvent('reload_cover_reached', this, { weaponId: this.weapon?.id || null, reloadCompletedEnRoute: true });
            }
          }
          if (this.wantsSafeReload || this.reloadTimer > 0) {
            this.tacticalMode = 'reload';
            if (this.reloadTimer <= 0 && (!enemy || !hasLineOfSight(this, enemy))) this.beginReload();
          } else {
            this.tacticalMode = 'hold';
            this.coverHoldTimer = 0.34 + Math.random() * 0.55;
          }
        }
        return true;
      }

      if (this.tacticalMode === 'reload') {
        this.crouched = true;
        this.aimAtThreat(dt, threat, 5.2);
        if (this.reloadTimer <= 0 && this.wantsSafeReload && (!enemy || !hasLineOfSight(this, enemy))) this.beginReload();
        if (this.reloadTimer <= 0 && !this.wantsSafeReload) {
          this.tacticalMode = 'hold';
          this.coverHoldTimer = 0.42 + Math.random() * 0.46;
        }
        return true;
      }

      if (this.tacticalMode === 'hold') {
        this.crouched = true;
        const desired = this.aimAtThreat(dt, threat, 6.2);
        if (enemy) this.fireCombatBurst(enemy, dist(this, enemy), desired, true);
        if (this.combatRepositionRequested && enemy) {
          this.tacticalMode = cover.peek ? 'return' : 'reposition';
          return true;
        }
        if (this.coverHoldTimer <= 0 && cover.peek && this.reloadTimer <= 0 && !this.wantsSafeReload) {
          this.tacticalMode = 'peek';
          this.peekHoldTimer = 0.62 + Math.random() * 0.68;
          this.exposureTimer = 1.05 + Math.random() * 0.72;
          this.crouched = false;
          combatDebug.coverPeeks++;
        }
        return true;
      }

      if (this.tacticalMode === 'peek') {
        this.crouched = false;
        const arrived = this.moveToCombatPoint(dt, cover.peek, threat, 0.62);
        if (enemy && arrived) {
          const desired = this.aimAtThreat(dt, enemy, 8.2);
          this.fireCombatBurst(enemy, dist(this, enemy), desired, true);
        }
        if (this.wantsSafeReload || this.exposureTimer <= 0 || this.peekHoldTimer <= 0 || this.combatRepositionRequested) {
          this.tacticalMode = 'return';
          this.burstShots = 0;
        }
        return true;
      }
      return false;
    }
    updateActiveCoverTactic(dt) {
      if (this.combatCover) {
        if (!this.lastSeen && this.reloadTimer <= 0 && !this.wantsSafeReload) {
          this.clearCombatCover();
          return false;
        }
        return this.updateCoverCombat(dt, null);
      }
      if (this.wantsSafeReload && this.lastSeen) {
        const obscured = !hasLineOfSight(this, this.lastSeen);
        if (obscured || this.safeReloadTimer > 3.2) {
          if (this.reloadTimer <= 0) this.beginReload();
          this.aimAtThreat(dt, this.lastSeen, 5.2);
          return true;
        }
        const threatBearing = Math.atan2(this.lastSeen.y - this.y, this.lastSeen.x - this.x);
        const retreatAngle = threatBearing + Math.PI + this.flankDirection * 0.24;
        this.tacticalMode = 'fallback';
        this.lastTacticalReason = this.reloadCoverRequired ? 'reload without available sidearm' : 'break line of sight for reload';
        if (this.reloadCoverRequired && !this.reloadCoverFallbackRegistered) {
          this.reloadCoverFallbackRegistered = true;
          combatDebug.reloadCoverFallbacks++;
        }
        this.aimAtThreat(dt, this.lastSeen, 6.2);
        this.stepMove(retreatAngle, this.speed * this.moveSkill * 0.76, dt, true);
        return true;
      }
      return false;
    }
    combatMove(dt, enemy) {
      if (!this.canVisuallySee(enemy, FOV * 1.22)) {
        this.target = null;
        this.burstShots = 0;
        this.flash = 0;
        if (this === bots[spectatorIndex]) muzzle = 0;
        return;
      }

      if (this.tacticalEnemyKey !== enemy.name) {
        if (this.combatApproachPath?.length && this.combatApproachTargetKey !== enemy.name) this.clearCombatApproach();
        this.tacticalEnemyKey = enemy.name;
        this.tacticalDecisionTimer = 0;
        this.combatBurstCount = 0;
        this.combatRepositionRequested = false;
      }
      this.lastSeen = { x: enemy.x, y: enemy.y };
      this.lastSeenTimer = 2.35;
      this.rememberHuntEvidence(this.lastSeen, 'visual', 1, enemy.name);
      this.updateCombatStalemate(dt, enemy);
      const elevationGap = activeArenaId === 'summit'
        ? Math.abs(arenaElevationAt(this.x, this.y) - arenaElevationAt(enemy.x, enemy.y))
        : 0;
      if (elevationGap > 0.34 && !this.combatApproachPath?.length && this.combatRecoveryCooldown <= 0) {
        this.beginCombatApproach(enemy, arenaElevationAt(enemy.x, enemy.y) > arenaElevationAt(this.x, this.y)
          ? 'take stairs to higher-floor contact'
          : 'take stairs to lower-floor contact', {
          verticalTransition: true,
          alternate: this.slot + this.combatRecoveryStage
        });
      }
      if (this.followCombatApproach(dt, enemy)) return;
      if (!this.reloadCoverRequired && this.resolveLocalTeamSpacing(dt, enemy)) {
        const spacingAim = this.aimAtThreat(dt, enemy, 7.4);
        this.fireCombatBurst(enemy, dist(this, enemy), spacingAim, this.magAmmo > 0);
        return;
      }
      this.chooseCombatTactic(enemy);

      if (this.followCombatApproach(dt, enemy)) return;
      if (this.combatCover && this.updateCoverCombat(dt, enemy)) return;

      const desired = this.aimAtThreat(dt, enemy, 7.4);
      const d = dist(this, enemy);
      const preferred = this.preferredCombatRange();
      const numbers = this.combatNumbers();
      const advantage = numbers.friendly > numbers.hostile;
      let allowFire = true;

      if (this.tacticalMode === 'push') {
        if (d > Math.max(1.9, preferred * 0.66)) {
          const flank = advantage && enemy.reloadTimer <= 0 ? this.flankDirection * 0.34 : 0;
          this.stepMove(desired + flank, this.speed * this.moveSkill * 0.76, dt, true);
        }
      } else if (this.tacticalMode === 'fallback') {
        const retreatAngle = desired + Math.PI + this.flankDirection * 0.22;
        this.stepMove(retreatAngle, this.speed * this.moveSkill * 0.76, dt, true);
        allowFire = this.magAmmo > 0 && d < this.weapon.range * 0.9;
      } else if (this.tacticalMode === 'reposition') {
        const radialCorrection = d < preferred * 0.78 ? Math.PI * 0.20 : (d > preferred * 1.18 ? -Math.PI * 0.16 : 0);
        const moveAngle = desired + this.flankDirection * (Math.PI / 2 + radialCorrection);
        this.stepMove(moveAngle, this.speed * this.moveSkill * 0.58, dt, true);
      } else {
        // Holding an effective angle now means genuinely holding still rather
        // than indefinitely strafing in the open. A new decision is made after
        // a short, variable pause or after the current burst sequence.
        this.tacticalMode = 'hold';
      }

      this.fireCombatBurst(enemy, d, desired, allowFire);
      if (this.combatRepositionRequested && this.combatBurstPause > 0) {
        this.tacticalDecisionTimer = 0;
        this.chooseCombatTactic(enemy, true);
      } else if (this.tacticalModeTimer <= 0) {
        this.tacticalDecisionTimer = 0;
      }
    }
    resetNavigationProgress() {
      this.navProgressGoalKey = '';
      this.navProgressBest = Infinity;
      this.navProgressTimer = 0;
    }
    remainingRouteDistance() {
      if (!this.path.length || this.pathIndex >= this.path.length) return 0;
      return pathDistance(this.path, this.pathIndex, this);
    }
    trackNavigationProgress(dt, goal) {
      if (!goal || !this.path.length || this.pathIndex >= this.path.length) return;
      const goalKey = `${Math.round(goal.x * 2) / 2},${Math.round(goal.y * 2) / 2}`;
      const remaining = this.remainingRouteDistance();
      if (goalKey !== this.navProgressGoalKey || !Number.isFinite(this.navProgressBest)) {
        this.navProgressGoalKey = goalKey;
        this.navProgressBest = remaining;
        this.navProgressTimer = 0;
        return;
      }
      if (remaining < this.navProgressBest - 0.07) {
        this.navProgressBest = remaining;
        this.navProgressTimer = Math.max(0, this.navProgressTimer - dt * 2.2);
      } else if (this.moveVelocity > 0.10 || this.moveIntent > this.speed * 0.18) {
        this.navProgressTimer += dt;
      } else {
        this.navProgressTimer = Math.max(0, this.navProgressTimer - dt * 0.35);
      }
      if (this.navProgressTimer > 2.45) {
        // Moving without reducing the remaining route distance is pacing, even
        // when ordinary stuck detection sees plenty of motion. Rebuild the path
        // once and keep the same committed goal unless that route also fails.
        this.path = [];
        this.pathIndex = 0;
        this.pathGoal = null;
        this.pathRefreshNeeded = true;
        this.repathTimer = 0;
        this.navProgressBest = Infinity;
        this.navProgressTimer = 0;
        this.navProgressRecoveries++;
        this.steeringHoldTimer = 0;
        const beganDetour = this.navProgressRecoveries >= 2 && !this.navigationDetourGoal
          ? this.beginNavigationDetour(goal)
          : false;
        if (!beganDetour) combatDebug.navigationRecoveries++;
      }
    }
    getPathLookahead(distanceAhead) {
      if (!this.path.length || this.pathIndex >= this.path.length) return null;
      let fromX = this.x;
      let fromY = this.y;
      let remaining = distanceAhead;
      let index = this.pathIndex;
      while (index < this.path.length) {
        const point = this.path[index];
        const dx = point.x - fromX;
        const dy = point.y - fromY;
        const segmentLength = Math.hypot(dx, dy);
        if (segmentLength >= remaining && segmentLength > 0.0001) {
          const t = remaining / segmentLength;
          return { x: fromX + dx * t, y: fromY + dy * t, index };
        }
        remaining -= segmentLength;
        fromX = point.x;
        fromY = point.y;
        index++;
      }
      const last = this.path[this.path.length - 1];
      return last ? { x: last.x, y: last.y, index: this.path.length - 1 } : null;
    }
    bridgeNavigationGap(dt, goal) {
      if (!goal || !Number.isFinite(goal.x) || !Number.isFinite(goal.y)) return false;
      const distanceToGoal = dist(this, goal);
      if (distanceToGoal < 0.42) return false;

      const directAngle = Math.atan2(goal.y - this.y, goal.x - this.x);
      const probeDistance = Math.min(0.68, distanceToGoal);
      const directProbe = {
        x: this.x + Math.cos(directAngle) * probeDistance,
        y: this.y + Math.sin(directAngle) * probeDistance
      };
      if (segmentHasClearance(this, directProbe, BOT_RADIUS + 0.012)) {
        this.angle += angleDiff(directAngle, this.angle) * clamp(dt * 5.2, 0, 1);
        const moved = this.stepMove(directAngle, this.speed * this.moveSkill * 0.66, dt, false);
        if (moved && !this.navigationGapRecoveryActive) {
          this.navigationGapRecoveryActive = true;
          this.navigationPauseRecoveries++;
          combatDebug.navigationRecoveries++;
        }
        return moved;
      }

      let bestAngle = null;
      let bestScore = -Infinity;
      const base = Number.isFinite(this.pathAngle) ? this.pathAngle : directAngle;
      for (let i = 0; i < 16; i++) {
        const candidate = base + i * TAU / 16;
        const clearance = clearanceAlong(this.x, this.y, candidate, 1.05, BOT_RADIUS + 0.01);
        if (clearance < 0.20) continue;
        const immediateX = this.x + Math.cos(candidate) * Math.min(0.16, clearance);
        const immediateY = this.y + Math.sin(candidate) * Math.min(0.16, clearance);
        if (!canTravelBetween(this.x, this.y, immediateX, immediateY, BOT_RADIUS)) continue;
        const goalAlignment = Math.cos(angleDiff(candidate, directAngle));
        const continuity = Math.cos(angleDiff(candidate, this.pathAngle));
        let crowdPenalty = 0;
        const probeX = this.x + Math.cos(candidate) * Math.min(0.55, clearance);
        const probeY = this.y + Math.sin(candidate) * Math.min(0.55, clearance);
        for (const other of bots) {
          if (other === this || !other.alive) continue;
          const separation = Math.hypot(probeX - other.x, probeY - other.y);
          if (separation < 0.72) crowdPenalty += (0.72 - separation) * 1.45;
        }
        const score = clearance + goalAlignment * 0.72 + continuity * 0.22 - crowdPenalty;
        if (score > bestScore) {
          bestScore = score;
          bestAngle = candidate;
        }
      }
      if (bestAngle === null) return false;
      this.angle += angleDiff(bestAngle, this.angle) * clamp(dt * 4.6, 0, 1);
      const moved = this.stepMove(bestAngle, this.speed * this.moveSkill * 0.52, dt, false);
      if (moved && !this.navigationGapRecoveryActive) {
        this.navigationGapRecoveryActive = true;
        this.navigationPauseRecoveries++;
        combatDebug.navigationRecoveries++;
      }
      return moved;
    }
    navigateMove(dt) {
      this.repathTimer -= dt;

      if (this.escapeTimer > 0) {
        this.angle += angleDiff(this.escapeAngle, this.angle) * clamp(dt * 8.0, 0, 1);
        const escaped = this.stepMove(this.escapeAngle, this.speed * 0.68, dt, false);
        if (!escaped) {
          // Retry immediately with a freshly evaluated direction rather than
          // spending the rest of the escape window rotating into a blocked wall.
          this.escapeTimer = 0;
          this.recoveryCooldown = 0;
        }
        return;
      }

      if (this.heardSound && dist(this, this.heardSound) < 0.88) {
        this.searchBaseAngle = this.angle;
        this.searchTimer = 0.52 + Math.random() * 0.46;
        this.searchLookOffset = (Math.random() < 0.5 ? -1 : 1) * (0.10 + Math.random() * 0.16);
        const clearedSound = { ...this.heardSound };
        this.markHuntSectorCleared(clearedSound, 1.8);
        this.heardSound = null;
        this.heardSoundTimer = 0;
        if (isLateRoundHuntActive()) {
          this.lateRoundGoal = this.chooseLateRoundContinuationGoal();
          this.lateRoundGoalTimer = 5.5 + Math.random() * 1.5;
          this.lateRoundGoalAge = 0;
        } else {
          this.objective = this.chooseInvestigationExit();
          this.objectiveAge = 0;
        }
        this.path = [];
        this.pathIndex = 0;
        this.pathGoal = null;
        this.pathRefreshNeeded = true;
        this.repathTimer = 0;
        combatDebug.investigationsCompleted++;
      }

      if (this.lastSeen && dist(this, this.lastSeen) < 0.68) {
        this.searchBaseAngle = this.angle;
        this.searchTimer = 0.62 + Math.random() * 0.38;
        this.searchLookOffset = (Math.random() < 0.5 ? -1 : 1) * (0.12 + Math.random() * 0.12);
        const clearedVisual = { ...this.lastSeen };
        this.markHuntSectorCleared(clearedVisual, 2.15);
        this.lastSeen = null;
        this.lastSeenTimer = 0;
        if (isLateRoundHuntActive()) {
          this.lateRoundGoal = this.chooseLateRoundContinuationGoal();
          this.lateRoundGoalTimer = 5.0 + Math.random() * 1.4;
          this.lateRoundGoalAge = 0;
        } else {
          this.objective = this.chooseInvestigationExit();
          this.objectiveAge = 0;
        }
        this.path = [];
        this.pathIndex = 0;
        this.pathGoal = null;
        this.pathRefreshNeeded = true;
        this.repathTimer = 0;
        combatDebug.investigationsCompleted++;
      }

      const lateHunt = isLateRoundHuntActive();
      if (this.openingPlanObjective && (simulationClock >= this.openingPlanUntil || dist(this, this.openingPlanObjective) < 1.0)) {
        this.openingPlanObjective = null;
        this.openingPlanUntil = 0;
        this.objective = this.chooseObjective(this.objective, 2.4);
        this.objectiveAge = 0;
        this.path = [];
        this.pathIndex = 0;
        this.pathGoal = null;
        this.pathRefreshNeeded = true;
        this.repathTimer = 0;
      }
      if (this.combatApproachGoal && (simulationClock >= this.combatApproachExpires || dist(this, this.combatApproachGoal) < 0.52)) {
        this.clearCombatApproach();
        this.tacticalDecisionTimer = 0;
      }
      const mapRotationActive = this.updateMapSpecificRotation();
      const combatRouteActive = Boolean(this.combatApproachGoal && this.combatApproachPath?.length && simulationClock < this.combatApproachExpires);
      if (this.navigationDetourGoal && (this.navigationDetourTimer <= 0 || dist(this, this.navigationDetourGoal) < 0.68)) {
        this.navigationDetourGoal = null;
        this.navigationDetourTimer = 0;
        this.path = [];
        this.pathIndex = 0;
        this.pathGoal = null;
        this.pathRefreshNeeded = true;
        this.repathTimer = 0;
      }
      const openingPlanActive = Boolean(this.openingPlanObjective && simulationClock < this.openingPlanUntil);
      const liveCommandActive = Boolean(this.liveCommandGoal && simulationClock < (Number(this.liveCommandUntil) || 0));
      const liveCommandMovementOverride = Boolean(liveCommandActive && this.liveCommandId !== 'commit');
      const prioritySearchActive = Boolean(combatRouteActive || this.lastSeen || this.heardSound || this.lateRoundGoal || this.navigationDetourGoal || liveCommandActive || openingPlanActive || mapRotationActive);
      if (!prioritySearchActive && (!this.objective || dist(this, this.objective) < 1.2 || this.objectiveAge > 12)) {
        const previous = this.objective;
        this.objective = this.chooseObjective(previous, 2.8);
        this.objectiveAge = 0;
        this.path = [];
        this.pathIndex = 0;
        this.pathGoal = null;
        this.pathRefreshNeeded = true;
        this.repathTimer = 0;
      }
      const tacticalGoal = liveCommandMovementOverride
        ? this.liveCommandGoal
        : (combatRouteActive
            ? this.combatApproachGoal
            : (this.lastSeen
                ? this.lastSeen
                : (this.heardSound || this.lateRoundGoal || this.mapRotationGoal || this.openingPlanObjective || this.objective)));
      if (liveCommandActive && dist(this, this.liveCommandGoal) < (this.liveCommandId === 'route' ? 1.15 : 0.86)) this.liveCommandGoalReached = true;
      if (!this.navigationDetourGoal && this.isNavigationLooping()) this.beginNavigationDetour(tacticalGoal);
      const pursuitGoal = this.navigationDetourGoal || tacticalGoal;
      const goalShiftDistance = this.pathGoal ? dist(this.pathGoal, pursuitGoal) : Infinity;
      const pathHoldActive = Boolean(this.pathGoal && simulationClock < this.pathHoldUntil);
      const pathLeaseActive = Boolean(this.pathGoal && simulationClock < (Number(this.pathLeaseUntil) || 0));
      const shiftThreshold = pathLeaseActive ? 1.72 : (pathHoldActive ? 1.35 : 0.74);
      const goalShifted = !this.pathGoal || goalShiftDistance > shiftThreshold;
      if ((pathHoldActive || pathLeaseActive) && goalShiftDistance > 0.62 && goalShiftDistance <= shiftThreshold) combatDebug.navigationPathHoldReuses++;
      const needsPath = !this.path.length || this.pathIndex >= this.path.length || goalShifted || this.pathRefreshNeeded;
      if (needsPath && this.repathTimer <= 0) this.ensurePath(pursuitGoal);
      if (!this.path.length || this.pathIndex >= this.path.length) {
        this.navigationGapTimer += dt;
        // A failed or deferred route calculation should not create a visible
        // stop-start cadence. Continue with short, collision-tested local steps
        // while the full route is recalculated on the following frames.
        const bridged = this.bridgeNavigationGap(dt, pursuitGoal);
        if (this.navigationGapTimer > 0.24) {
          this.pathRefreshNeeded = true;
          this.repathTimer = 0;
        }
        if (bridged) return;
        return;
      }
      this.navigationGapTimer = 0;
      this.navigationGapRecoveryActive = false;
      this.trackNavigationProgress(dt, pursuitGoal);

      // Advance waypoints before the bot reaches the exact cell centre. This is
      // important at 90-degree corridors because it prevents walking up to the
      // wall and then snapping sideways.
      while (this.pathIndex < this.path.length - 1) {
        const point = this.path[this.pathIndex];
        const nextPoint = this.path[this.pathIndex + 1];
        const pointDistance = Math.hypot(point.x - this.x, point.y - this.y);
        const nextIsOpen = nextPoint && segmentHasClearance(this, nextPoint, BOT_RADIUS + 0.025);
        if (pointDistance > 0.58 || (!nextIsOpen && pointDistance > 0.24)) break;
        this.pathIndex++;
      }

      let moveTarget = this.getPathLookahead(0.58 + this.speed * 0.18);
      const lookTarget = this.getPathLookahead(1.18 + this.speed * 0.28);
      if (!moveTarget || !lookTarget) return;
      if (!segmentHasClearance(this, moveTarget, BOT_RADIUS + 0.02)) {
        const activePoint = this.path[this.pathIndex];
        if (activePoint) moveTarget = { x: activePoint.x, y: activePoint.y, index: this.pathIndex };
      }

      let moveAngle = Math.atan2(moveTarget.y - this.y, moveTarget.x - this.x);
      let lookAngle = Math.atan2(lookTarget.y - this.y, lookTarget.x - this.x);
      const turnAmount = Math.abs(angleDiff(lookAngle, moveAngle));

      // The crosshair leads the movement through the opening. In a corner the
      // camera turns towards the next corridor before the body reaches it.
      const lookClearance = clearanceAlong(this.x, this.y, lookAngle, 1.05, BOT_RADIUS * 0.72);
      if (lookClearance < 0.42) lookAngle = moveAngle;

      // Investigation sweeps now happen while advancing through an open route.
      // Never replace movement with an on-the-spot oscillation at a wall.
      if (this.searchTimer > 0 && this.motion > 0.1) {
        // A single moving glance replaces the old sinusoidal left/right sweep.
        // It reads as a purposeful corner check and cannot trap the bot staring
        // at a wall when the route ahead remains available.
        const glanceAngle = lookAngle + this.searchLookOffset;
        if (clearanceAlong(this.x, this.y, glanceAngle, 0.92, BOT_RADIUS * 0.68) > 0.42) {
          lookAngle = glanceAngle;
        }
        this.searchLookOffset = lerp(this.searchLookOffset, 0, clamp(dt * 1.35, 0, 1));
      } else {
        this.searchLookOffset = lerp(this.searchLookOffset, 0, clamp(dt * 2.4, 0, 1));
        const tinyHumanScan = this.motion > 0.18 && turnAmount < 0.22 && clearanceAlong(this.x, this.y, lookAngle, 1.2) > 0.85
          ? Math.sin(this.scanPhase) * this.scanStrength
          : 0;
        lookAngle += tinyHumanScan;
      }
      this.angle += angleDiff(lookAngle, this.angle) * clamp(dt * (turnAmount > 0.45 ? 7.4 : 5.4), 0, 1);

      const investigating = Boolean(this.lastSeen || this.heardSound);
      const forwardRoom = clearanceAlong(this.x, this.y, moveAngle, 1.75, BOT_RADIUS * 0.82);
      const leftRoom = clearanceAlong(this.x, this.y, moveAngle - Math.PI * 0.42, 0.90, BOT_RADIUS * 0.64);
      const rightRoom = clearanceAlong(this.x, this.y, moveAngle + Math.PI * 0.42, 0.90, BOT_RADIUS * 0.64);
      const deliberateClear = investigating && (turnAmount > 0.24 || forwardRoom < 1.12);
      const exposedCrossing = !investigating && forwardRoom > 1.48 && leftRoom > 0.72 && rightRoom > 0.72 && turnAmount < 0.24;
      let speedFactor = deliberateClear ? 0.64 : (investigating ? 0.76 : (turnAmount > 0.55 ? 0.72 : (exposedCrossing ? 1.10 : 1.02)));
      if (lateHunt && !investigating) speedFactor = Math.max(speedFactor, isUrgentHuntActive() ? 1.30 : (totalAliveCount() === 2 ? 1.20 : 1.09));
      if (clearanceAlong(this.x, this.y, moveAngle, 0.72, BOT_RADIUS) < 0.5) speedFactor *= 0.62;
      this.stepMove(moveAngle, this.speed * this.moveSkill * speedFactor, dt, false);
    }
    stepMove(moveAngle, moveSpeed, dt, allowAggressiveSlide, preservePath = false) {
      const postureSpeed = this.crouched ? 0.54 : 1;
      const sprintMultiplier = this.sprintSpeedMultiplier(moveAngle, moveSpeed);
      const flinchMoveScale = 1 - clamp(Number(this.flinchStrength) || 0, 0, 1) * (this.flinchTimer > 0 ? 0.14 : 0);
      const targetMoveSpeed = moveSpeed * postureSpeed * sprintMultiplier * flinchMoveScale;
      const accelerationRate = targetMoveSpeed > (this.locomotionSpeed || 0) ? 8.8 : 5.8;
      this.locomotionSpeed = lerp(this.locomotionSpeed || 0, targetMoveSpeed, animationBlendFactor(accelerationRate, dt));
      const effectiveMoveSpeed = Math.max(0, this.locomotionSpeed);
      this.moveCommandedThisFrame = true;
      this.isSprinting = sprintMultiplier > 1.02 && effectiveMoveSpeed > this.speed * 0.84;
      if (this.isSprinting) {
        const tacticalBurst = ['push', 'fallback', 'reposition'].includes(this.tacticalMode) || this.escapeTimer > 0;
        const exertionRate = tacticalBurst ? 16.5 : 12.4;
        const preExistingFatigue = (Number(this.playerFatigue) || 0) > 55 ? 1.16 : 1;
        this.movementFatigue = clamp((this.movementFatigue || 0) + dt * exertionRate * preExistingFatigue, 0, 100);
      }
      this.moveIntent = Math.max(this.moveIntent, effectiveMoveSpeed);
      const travel = Math.max(0, effectiveMoveSpeed * dt);
      if (travel < 0.00001) return false;
      const maxProbe = allowAggressiveSlide ? 0.72 : 0.92;
      const baseCandidates = allowAggressiveSlide
        ? [moveAngle, moveAngle - 0.20, moveAngle + 0.20, moveAngle - 0.40, moveAngle + 0.40]
        : [moveAngle, moveAngle - 0.12, moveAngle + 0.12, moveAngle - 0.26, moveAngle + 0.26, moveAngle - 0.48, moveAngle + 0.48];
      const candidates = (!allowAggressiveSlide && this.steeringHoldTimer > 0 && Math.abs(angleDiff(this.steeringAngle, moveAngle)) < 0.72)
        ? [this.steeringAngle, ...baseCandidates]
        : baseCandidates;

      let chosenAngle = moveAngle;
      let chosenScore = -Infinity;
      for (const candidate of candidates) {
        const clearance = clearanceAlong(this.x, this.y, candidate, maxProbe, BOT_RADIUS + 0.015);
        const deviation = Math.abs(angleDiff(candidate, moveAngle));
        const probeDistance = Math.min(clearance, Math.max(0.36, travel + 0.16));
        const probeX = this.x + Math.cos(candidate) * probeDistance;
        const probeY = this.y + Math.sin(candidate) * probeDistance;
        let crowdPenalty = 0;
        for (const other of bots) {
          if (other === this || !other.alive) continue;
          const separation = Math.hypot(probeX - other.x, probeY - other.y);
          if (separation < 0.78) {
            crowdPenalty += (0.78 - separation) * (other.team === this.team ? 1.35 : 0.55);
          }
        }
        const immediateX = this.x + Math.cos(candidate) * travel;
        const immediateY = this.y + Math.sin(candidate) * travel;
        const immediateSafe = canTravelBetween(this.x, this.y, immediateX, immediateY, BOT_RADIUS);
        const continuityPenalty = allowAggressiveSlide ? 0 : Math.abs(angleDiff(candidate, this.steeringAngle)) * 0.22;
        const score = clearance - deviation * (allowAggressiveSlide ? 0.22 : 0.55) - continuityPenalty - crowdPenalty;
        // The old travel + 0.09 clearance gate could reject every direction in
        // a tight but legal corner. The actual destination collision check is
        // authoritative; look-ahead clearance now influences ranking only.
        if (immediateSafe && score > chosenScore) {
          chosenScore = score;
          chosenAngle = candidate;
        }
      }

      if (chosenScore === -Infinity) {
        // Do not bounce left and right against a wall. Stop, recalculate the
        // route, and keep the camera looking into the intended opening.
        this.repathTimer = 0;
        this.moveBlocked = true;
        this.pathRefreshNeeded = true;
        if (!allowAggressiveSlide && !preservePath) {
          this.path = [];
          this.pathIndex = 0;
          this.pathGoal = null;
        }
        this.pathAngle += angleDiff(moveAngle, this.pathAngle) * clamp(dt * 4.2, 0, 1);
        return false;
      }

      if (!allowAggressiveSlide) {
        if (Math.abs(angleDiff(chosenAngle, this.steeringAngle)) > 0.08) this.steeringHoldTimer = 0.22;
        this.steeringAngle = chosenAngle;
      }
      this.pathAngle += angleDiff(chosenAngle, this.pathAngle) * clamp(dt * (allowAggressiveSlide ? 9.0 : 8.2), 0, 1);
      // Travel along the selected safe heading immediately; pathAngle is kept
      // as the smoothed body orientation. Using the lagging body angle for the
      // actual movement was what made bots repeatedly press into corner walls.
      let dx = Math.cos(chosenAngle) * travel;
      let dy = Math.sin(chosenAngle) * travel;

      // Gentle personal-space avoidance. It changes speed more than direction,
      // preventing two bots from shoving one another into walls.
      let nearestAhead = Infinity;
      const forwardX = Math.cos(chosenAngle);
      const forwardY = Math.sin(chosenAngle);
      for (const other of bots) {
        if (other === this || !other.alive) continue;
        const ox = other.x - this.x;
        const oy = other.y - this.y;
        if (ox * forwardX + oy * forwardY > 0.04) nearestAhead = Math.min(nearestAhead, Math.hypot(ox, oy));
      }
      if (nearestAhead < 0.68) {
        const slow = clamp((nearestAhead - 0.38) / 0.30, 0.24, 1);
        dx *= slow;
        dy *= slow;
      }

      const nx = this.x + dx;
      const ny = this.y + dy;
      const elevationTransitionAllowed = arenaElevationTransitionAllowed(this.x, this.y, nx, ny, activeArenaId);
      if (canTravelBetween(this.x, this.y, nx, ny, BOT_RADIUS)) {
        if (this.isSprinting) this.roundSprintDistance = (this.roundSprintDistance || 0) + Math.hypot(dx, dy);
        this.x = nx;
        this.y = ny;
        return true;
      }

      if (activeArenaId === 'summit' && !elevationTransitionAllowed) {
        combatDebug.summitIllegalElevationTransitionsBlocked = (Number(combatDebug.summitIllegalElevationTransitionsBlocked) || 0) + 1;
      }
      this.repathTimer = 0;
      this.moveBlocked = true;
      this.pathRefreshNeeded = true;
      if (!allowAggressiveSlide && !preservePath) {
        this.path = [];
        this.pathIndex = 0;
        this.pathGoal = null;
      }
      return false;
    }
    shoot(target, distance) {
      if (!target || !target.alive || this.reloadTimer > 0 || this.weaponSwapTimer > 0 || this.flinchTimer > 0) return false;
      if (this.magAmmo <= 0) {
        this.updateWeaponState(0, target);
        return false;
      }
      const desired = Math.atan2(target.y - this.y, target.x - this.x);
      const aimError = Math.abs(angleDiff(desired, this.angle));
      const turnHandlingCost = Math.abs(Number(this.turnBlend) || 0) * (Number(this.weapon?.turnPenalty) || 0);
      const aimTolerance = clamp(0.150 - turnHandlingCost * 0.22, 0.118, 0.155);
      const properlyAimed = aimError < aimTolerance;
      const insideFireCone = this.canVisuallySee(target, FOV * 0.72);
      const clearLineOfFire = hasTargetExposure(this, target);
      const operatorBlocker = this.firstOperatorInLineOfFire(target);

      // Do not start a muzzle flash, consume a burst round or apply damage
      // unless all checks pass on this exact simulation frame.
      if (!properlyAimed || !insideFireCone || !clearLineOfFire || operatorBlocker) {
        combatDebug.blockedShotAttempts++;
        combatDebug.lastBlockedReason = operatorBlocker ? 'operator' : (!properlyAimed ? 'aim' : (!insideFireCone ? 'view' : 'wall'));
        if (operatorBlocker) {
          combatDebug.operatorBlockedShots++;
          if (typeof diagnosticRecordBlockedShot === 'function') diagnosticRecordBlockedShot(this, target, 'operator', operatorBlocker);
          // A blocked muzzle should not generate a diagnostic event every
          // simulation tick. Briefly hold the trigger and accelerate the
          // existing lane-clear recovery when a team-mate is directly ahead.
          this.cooldown = Math.max(this.cooldown, operatorBlocker.team === this.team ? 0.12 : 0.06);
          if (operatorBlocker.team !== this.team && this.canVisuallySee(operatorBlocker, FOV * 1.24)) {
            this.commitVisibleTarget(operatorBlocker, true);
          } else {
            this.combatRepositionRequested = true;
            this.tacticalDecisionTimer = 0;
            this.engagementIdleTimer = Math.max(this.engagementIdleTimer, 0.28);
          }
        }
        this.flash = 0;
        this.recoil = 0;
        if (this === bots[spectatorIndex]) muzzle = 0;
        return false;
      }

      // Recheck after all target calculations. This intentionally duplicates
      // the wall test so a target crossing a corner cannot fire on stale sight.
      if (!target.alive || !hasTargetExposure(this, target)) {
        combatDebug.blockedShotAttempts++;
        combatDebug.lastBlockedReason = 'wall-recheck';
        if (typeof diagnosticRecordBlockedShot === 'function') diagnosticRecordBlockedShot(this, target, 'wall-recheck', null);
        this.flash = 0;
        this.recoil = 0;
        if (this === bots[spectatorIndex]) muzzle = 0;
        return false;
      }

      const cadenceJitter = Number(this.weapon.cadenceJitter);
      this.cooldown = this.weapon.fireRate * (this.fireRateMultiplier || 1) + Math.random() * (Number.isFinite(cadenceJitter) ? cadenceJitter : 0.04);
      this.magAmmo = Math.max(0, this.magAmmo - 1);
      if (this.usingSecondary) this.secondaryAmmo = this.magAmmo;
      else this.primaryAmmo = this.magAmmo;
      this.flash = 1;
      const recoilKick = Number(this.weapon.recoilKick) || 1;
      this.recoil = Math.max(this.recoil, Number(this.weapon.recoilVisualKick) || recoilKick);
      const recoilPenalty = clamp((this.weaponHeat || 0) * (Number(this.weapon.recoilSpread) || 0.028), 0, 0.18);
      this.weaponHeat = Math.min(4, (this.weaponHeat || 0) + recoilKick);
      this.roundShotsFired = (this.roundShotsFired || 0) + 1;
      combatDebug.shotsFired++;
      const pistolShot = this.usingSecondary || this.weapon.category === 'pistol';
      const gunshotRadius = Math.max(14, Number(this.weapon?.noiseRadius) || (pistolShot ? 22.0 : 30.0));
      const gunshotLoudness = clamp(gunshotRadius / 30, 0.62, 1);
      emitSoundEvent('gunshot', this, gunshotRadius, gunshotLoudness);
      combatDebug.gunshotsEmitted++;
      if (this === bots[spectatorIndex]) muzzle = 1;
      const distancePenalty = clamp((distance - 2.5) / 16, 0, 0.22);
      const movementRatio = clamp((Number(this.moveVelocity) || 0) / Math.max(0.25, Number(this.speed) || 1), 0, 1.25);
      const movingHandlingPenalty = movementRatio * Math.max(0, Number(this.weapon?.movingAccuracyPenalty) || 0);
      const settleRatio = clamp((Number(this.weaponSettleTimer) || 0) / 0.48, 0, 1);
      const sprintHandlingPenalty = settleRatio * Math.max(0, Number(this.weapon?.sprintSettlePenalty) || 0);
      const hitChance = clamp((this.weapon.accuracy * this.skill) + (this.accuracyBonus || 0) - distancePenalty - recoilPenalty - movingHandlingPenalty - sprintHandlingPenalty - turnHandlingCost + (this.crouched ? 0.045 : 0), 0.04, 0.96);
      const landedShot = Math.random() < hitChance;
      if (landedShot) {
        const consistency = clamp(this.damageConsistency || 0, 0, 0.72);
        const damageRoll = lerp(Math.random(), 0.72, consistency);
        // Headshots and critical hits are independent rolls. A landed headshot
        // always receives its weapon-specific location multiplier, then a
        // successful critical roll multiplies that result again. This permits
        // rare high-impact critical headshots without turning every crit into
        // a headshot or every headshot into a crit.
        const currentCritProfile = refreshCriticalCombatProfile(this);
        const headshotProfile = rollHeadshot(this, distance, recoilPenalty);
        const headshotHit = headshotProfile.headshot;
        const criticalHit = rollCriticalHit(this);
        spawnTracer(this, target, { headshot: headshotHit });
        const baseDamage = lerp(this.weapon.damageMin, this.weapon.damageMax, damageRoll) * (this.damageMultiplier || 1);
        const locationMultiplier = headshotHit ? headshotProfile.multiplier : 1;
        const criticalMultiplier = criticalHit ? currentCritProfile.multiplier : 1;
        const damage = baseDamage * locationMultiplier * criticalMultiplier;
        const resistedDamage = Math.max(0, damage * (target.damageTakenMultiplier || 1));
        const armourHit = resolveArmourHit(target, resistedDamage, this.weapon, { critical: criticalHit, headshot: headshotHit });
        const appliedDamage = Math.max(0, Math.min(target.health, armourHit.healthDamage));
        target.health -= appliedDamage;
        this.roundShotsHit = (this.roundShotsHit || 0) + 1;
        if (criticalHit) {
          this.roundCriticalHits = (this.roundCriticalHits || 0) + 1;
          combatDebug.criticalHitsDealt++;
          const criticalTeam = this.team === TEAM_RED ? TEAM_RED : TEAM_BLUE;
          combatDebug.criticalHitsByTeam[criticalTeam] = (combatDebug.criticalHitsByTeam[criticalTeam] || 0) + 1;
        }
        if (headshotHit) {
          this.roundHeadshots = (this.roundHeadshots || 0) + 1;
          combatDebug.headshotsDealt++;
          const headshotTeam = this.team === TEAM_RED ? TEAM_RED : TEAM_BLUE;
          combatDebug.headshotsByTeam[headshotTeam] = (combatDebug.headshotsByTeam[headshotTeam] || 0) + 1;
          if (criticalHit) {
            this.roundCriticalHeadshots = (this.roundCriticalHeadshots || 0) + 1;
            combatDebug.criticalHeadshots++;
          }
        }
        this.roundDamageDealt = (this.roundDamageDealt || 0) + appliedDamage;
        target.roundDamageTaken = (target.roundDamageTaken || 0) + appliedDamage;
        if (typeof diagnosticRecordDamage === 'function') diagnosticRecordDamage(this, target, appliedDamage, { critical: criticalHit, headshot: headshotHit, armourAbsorbed: armourHit.absorbed, armourIntegrityLost: armourHit.integrityLost, armourBroken: armourHit.broken, armourBypassed: armourHit.bypassed, penetration: armourHit.penetration, armourRating: armourHit.armourRating });
        this.lastDamageTime = simulationClock;
        target.lastDamageTime = simulationClock;
        this.stalemateTimer = 0;
        target.stalemateTimer = 0;
        target.hurt = 1;
        target.hitDirection = Math.sign(angleDiff(Math.atan2(this.y - target.y, this.x - target.x), target.angle)) || 1;
        const reactionDamage = appliedDamage + armourHit.absorbed * 0.28;
        const reactionStrength = clamp(reactionDamage / Math.max(12, target.maxHealth || 100) * 3.6 + (criticalHit ? 0.26 : 0) + (headshotHit ? 0.22 : 0), 0.30, 1.24);
        target.hitReaction = Math.max(target.hitReaction || 0, reactionStrength);
        target.hitReactionStrength = Math.max(target.hitReactionStrength || 0, reactionStrength);
        target.hitReactionVertical = Math.max(target.hitReactionVertical || 0, headshotHit ? 1.0 : (criticalHit ? 0.88 : clamp(appliedDamage / 34, 0.18, 0.72)));
        target.hitReactionAge = 0;
        target.applyCombatFlinch({
          appliedDamage,
          armourAbsorbed: armourHit.absorbed,
          critical: criticalHit,
          headshot: headshotHit,
          direction: target.hitDirection
        });
        emitCosmeticSound('impact', target, target === bots[spectatorIndex] ? 1 : 0.72);
        if (target === bots[spectatorIndex]) {
          shake = Math.min(1, shake + 0.34);
          hitPulse = Math.max(hitPulse, 0.55);
        }
        if (this === bots[spectatorIndex]) hitPulse = Math.max(hitPulse, 0.72);
        const fatalHit = target.health <= 0;
        if (appliedDamage > 0 && typeof spawnBloodSplatter === 'function') {
          spawnBloodSplatter(this, target, { appliedDamage, headshot: headshotHit, fatal: fatalHit });
        }
        spawnDamageNumber(this, target, appliedDamage, fatalHit, criticalHit, headshotHit);
        if (fatalHit) {
          if (criticalHit) {
            const criticalTeam = this.team === TEAM_RED ? TEAM_RED : TEAM_BLUE;
            combatDebug.criticalEliminationsByTeam[criticalTeam] = (combatDebug.criticalEliminationsByTeam[criticalTeam] || 0) + 1;
          }
          if (headshotHit) {
            const headshotTeam = this.team === TEAM_RED ? TEAM_RED : TEAM_BLUE;
            combatDebug.headshotEliminationsByTeam[headshotTeam] = (combatDebug.headshotEliminationsByTeam[headshotTeam] || 0) + 1;
          }
          target.die(this, { critical: criticalHit, headshot: headshotHit, damage: appliedDamage });
        }
      } else {
        spawnTracer(this, target, { miss: true });
        // Build 12.155: a missed round carries on and marks whatever it meets.
        if (typeof spawnImpactDecal === 'function') {
          const shooterEye = arenaElevationAt(this.x, this.y) + 1.30 - (this.crouched ? 0.43 : 0);
          const targetChest = arenaElevationAt(target.x, target.y) + 1.24 - (target.crouched ? 0.38 : 0);
          spawnImpactDecal(this, target.x, target.y, targetChest + (Math.random() - 0.5) * 0.5, shooterEye);
        }
      }
      return true;
    }

  }

  function tacticalReasonDisplay(reason = '') {
    const text = String(reason || '').trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
    if (!text) return 'Maintaining awareness while no higher-priority instruction is active.';
    const known = {
      'patrol': 'Following the opening lane while scanning for first contact.',
      'close with team advantage': 'Closing distance because nearby support creates a favourable fight.',
      'outnumbered': 'Protecting health because the local fight is outnumbered.',
      'preserve health': 'Breaking contact before taking an unfavourable health trade.',
      'safe reload': 'Moving behind protection before committing to the reload.',
      'break line of sight for reload': 'Creating cover so the weapon can be reloaded safely.',
      'reload without available sidearm': 'Moving behind protection because no loaded alternate weapon is available during the reload.',
      'clear view around blocker': 'Moving laterally because a team-mate is obscuring the sightline.',
      'resume movement toward contact': 'Resuming the planned approach after the lane became available.',
      'release stationary crouch': 'Leaving an unproductive crouched position to restore movement.',
      'force low health duel decision': 'Pressuring a weakened opponent before they can reset.',
      'challenge low health stalemate': 'Testing the angle because both sides are delaying at low health.',
      'break cover stalemate': 'Changing the engagement so both teams do not remain locked behind cover.',
      'answer close range pressure': 'Repositioning to avoid being trapped by a close-range push.',
      'draw sidearm for close contact': 'Drawing the faster sidearm because the primary is unsettled in a sudden close fight.',
      'return to primary for range': 'Returning to the primary weapon because the engagement has moved beyond sidearm range.',
      'draw sidearm while primary empty': 'Drawing the sidearm because the primary magazine is empty and the enemy is too close for a safe reload.',
      'return to primary after danger': 'Returning to the primary weapon after the immediate close-range threat has passed.',
      'return to primary to reload': 'Returning to the empty primary so it can be reloaded from a safer position.',
      'live command regroup': 'Following the manager call by closing support gaps while preserving autonomous combat decisions.',
      'live command commit': 'Following the manager call by increasing tempo on the current route without receiving a combat-stat bonus.',
      'live command disengage': 'Following the manager call by breaking contact and seeking safer team-supported space.',
      'live command hold': 'Following the manager call by protecting the current territory instead of making an unnecessary rotation.',
      'live command switch route': 'Following the manager call by redirecting toward an alternate authored engagement route.'
    };
    const lower = text.toLowerCase();
    if (known[lower]) return known[lower];
    return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
  }

  function botRouteIntent(bot) {
    if (!bot) return 'HOLD CURRENT LANE';
    const liveCommandActive = Boolean(bot.liveCommandId && simulationClock < (Number(bot.liveCommandUntil) || 0));
    if (liveCommandActive) {
      const labels = {
        regroup: 'REGROUP WITH TEAM',
        commit: 'PRESS CURRENT ROUTE',
        disengage: 'BREAK CONTACT',
        hold: 'DEFEND CURRENT GROUND'
      };
      if (bot.liveCommandId === 'route') {
        const routeName = liveCommandPulseState?.routePlan?.name || bot.liveCommandRoutePlanId || 'ALTERNATE ROUTE';
        return `SWITCH TO ${String(routeName).toUpperCase()}`;
      }
      if (labels[bot.liveCommandId]) return labels[bot.liveCommandId];
    }
    const labels = {
      'tactical-flank': 'WIDE FLANK ROUTE',
      'vertical-transition': 'CHANGE FLOOR VIA STAIRS',
      'yield': 'CLEAR TEAM-MATE LANE',
      'combat-route': 'ALTERNATE FIRING ANGLE'
    };
    if (labels[bot.combatApproachKind]) return labels[bot.combatApproachKind];
    if (bot.mapRotationTargetZone) return `ROTATE TO ${String(bot.mapRotationTargetZone).toUpperCase()}`;
    if (bot.openingPlanObjective) return bot.openingPlanName ? String(bot.openingPlanName).toUpperCase() : 'OPENING PLAN LANE';
    if (bot.lastSeen) return 'LAST-KNOWN ENEMY POSITION';
    if (bot.heardSoundTimer > 0) return 'INVESTIGATE SOUND SOURCE';
    if (bot.lateRoundGoal) return 'SWEEP UNCLEARED SECTOR';
    if (bot.objective) return `ADVANCE THROUGH ${levelZoneAt(bot.objective.x, bot.objective.y).short}`;
    return 'HOLD CURRENT LANE';
  }

  function botDecisionExplanation(bot) {
    if (!bot) return {
      action: 'AWAITING DEPLOYMENT', reason: 'No operator is currently selected.', target: 'NONE', range: 'NO CONTACT', instruction: 'NO PLAN', route: 'HOLD CURRENT LANE'
    };
    const plan = careerState?.tactics?.activeMatchPlan || (typeof clubActiveMatchPlan === 'function' ? clubActiveMatchPlan() : null) || {};
    const target = bot.target && bot.target.alive ? bot.target : null;
    const currentRange = target ? dist(bot, target) : null;
    const preferredRange = Math.max(0.5, Number(bot.preferredCombatRange?.()) || Number(bot.weapon?.range) || 0);
    const liveCommandActive = Boolean(bot.liveCommandId && simulationClock < (Number(bot.liveCommandUntil) || 0));
    const instruction = liveCommandActive
      ? `LIVE COMMAND · ${String(bot.liveCommandName || bot.liveCommandId).toUpperCase()}`
      : `${String(plan.priorityName || 'ADAPTIVE').toUpperCase()} · ${String(plan.engagementName || weaponRangeDescriptor(bot.weapon).label || 'MIXED RANGE').toUpperCase()}`;
    return {
      action: botTacticalStatus(bot, false),
      reason: tacticalReasonDisplay(bot.lastTacticalReason || (bot.sightCandidate ? 'confirm visible target' : 'patrol')),
      target: target ? String(target.name || 'CONTACT').toUpperCase() : (bot.sightCandidate ? String(bot.sightCandidate.name || 'POSSIBLE CONTACT').toUpperCase() : 'NONE'),
      range: currentRange === null ? `PREFERRED ${preferredRange.toFixed(1)}M` : `${currentRange.toFixed(1)}M NOW · ${preferredRange.toFixed(1)}M PREFERRED`,
      instruction,
      route: botRouteIntent(bot)
    };
  }

  function botTacticalStatus(bot, compact = false) {
    if (!bot) return compact ? 'IDLE' : 'AWAITING DEPLOYMENT';
    if (!bot.alive) return compact ? 'DOWN' : 'ELIMINATED';
    if (bot.weaponSwapTimer > 0) return compact ? 'SWAP' : 'SWITCHING WEAPON';
    if (bot.reloadTimer > 0) return compact ? 'RELOAD' : (bot.combatCover ? 'RELOADING IN COVER' : 'RELOADING');
    if (bot.combatApproachKind === 'tactical-flank') return compact ? 'FLANK' : 'EXECUTING WIDE FLANK';
    if (bot.combatApproachKind === 'vertical-transition') return compact ? 'STAIRS' : 'USING STAIRS TO CHANGE FLOOR';
    const labels = compact ? {
      cover: 'COVER', hold: 'HOLD', peek: 'PEEK', return: 'BREAK',
      reload: 'COVER', push: 'PUSH', fallback: 'FALL BACK', reposition: 'REPOSITION', advance: 'ADVANCE'
    } : {
      cover: 'MOVING TO COVER', hold: 'HOLDING ANGLE', peek: 'PEEKING FROM COVER', return: 'BREAKING CONTACT',
      reload: 'PREPARING SAFE RELOAD', push: 'PUSHING ADVANTAGE', fallback: 'DISENGAGING',
      reposition: 'CHANGING FIRING ANGLE', advance: 'ADVANCING'
    };
    if (bot.wantsSafeReload && !bot.reloadTimer) return compact ? 'SEEK COVER' : 'SEEKING COVER TO RELOAD';
    if (bot.target || bot.combatCover) {
      if (labels[bot.tacticalMode]) return labels[bot.tacticalMode];
      return compact ? 'ENGAGE' : 'ENGAGING TARGET';
    }
    if (bot.sightCandidate) return compact ? 'ACQUIRE' : 'ACQUIRING TARGET';
    if (bot.liveCommandId && simulationClock < (Number(bot.liveCommandUntil) || 0)) {
      const commandLabels = compact ? {
        regroup: 'REGROUP', commit: 'COMMIT', disengage: 'RESET', hold: 'HOLD', route: 'ROUTE'
      } : {
        regroup: 'REGROUPING WITH TEAM', commit: 'COMMITTING TO CURRENT ROUTE', disengage: 'BREAKING CONTACT',
        hold: 'HOLDING TERRITORY', route: 'SWITCHING ENGAGEMENT ROUTE'
      };
      if (commandLabels[bot.liveCommandId]) return commandLabels[bot.liveCommandId];
    }
    if (bot.heardSoundTimer > 0) return compact ? 'INVESTIGATE' : 'INVESTIGATING SOUND';
    if (bot.lastSeen) return compact ? 'TRACK' : 'TRACKING LAST-KNOWN POSITION';
    if (bot.lateRoundGoal) return compact ? 'HUNT' : (bot.huntGoalSource && bot.huntGoalSource !== 'map-hypothesis' ? 'HUNTING FROM TEAM INTEL' : 'SWEEPING UNCLEARED SECTOR');
    if (bot.crouched) return compact ? 'HOLD' : 'HOLDING COVER';
    if ((bot.moveVelocity || 0) > 0.2) return compact ? 'MOVE' : 'REPOSITIONING';
    return compact ? 'SCAN' : 'SCANNING';
  }
