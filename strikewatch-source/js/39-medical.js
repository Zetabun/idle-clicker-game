/*
 * Strikewatch source module: 39-medical.js
 * Purpose: Persistent player injury vulnerability, fatigue-sensitive injury
 * risk, recovery, medical labels and match-performance penalties.
 *
 * This file shares the application scope with the other source fragments.
 * Run `python3 build.py` to regenerate the development bundle and standalone.
 */

  const MEDICAL_INJURY_DEFS = [
    { id: 'wrist-strain', name: 'Wrist Strain', severity: 'minor', weeks: [1, 2], penalty: 0.025, focus: 'handling' },
    { id: 'knee-sprain', name: 'Knee Sprain', severity: 'moderate', weeks: [2, 4], penalty: 0.065, focus: 'mobility' },
    { id: 'shoulder-contusion', name: 'Shoulder Contusion', severity: 'minor', weeks: [1, 3], penalty: 0.040, focus: 'marksmanship' },
    { id: 'rib-strain', name: 'Rib Strain', severity: 'moderate', weeks: [2, 4], penalty: 0.060, focus: 'resilience' },
    { id: 'concussion-protocol', name: 'Concussion Protocol', severity: 'major', weeks: [3, 6], penalty: 0.095, focus: 'awareness' }
  ];

  function medicalStringHash(value = '') {
    let hash = 2166136261;
    const text = String(value || '');
    for (let index = 0; index < text.length; index++) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function medicalVulnerabilityFallback(player) {
    const resilience = clamp(Number(player?.stats?.resilience) || 1, 1, CAREER_MAX_STAT);
    const age = clamp(Number(player?.age) || 23, 17, 38);
    const variation = (medicalStringHash(player?.id || player?.name || '') % 25) - 12;
    return clamp(Math.round(54 + (age - 24) * 1.4 - resilience * 3.2 + variation), 8, 92);
  }

  function normalisePlayerMedical(player) {
    if (!player || typeof player !== 'object') return player;
    player.injuryVulnerability = clamp(Math.round(Number(player.injuryVulnerability) || medicalVulnerabilityFallback(player)), 5, 95);
    player.injuryHistory = Array.isArray(player.injuryHistory) ? player.injuryHistory.slice(0, 12).map(entry => ({ ...entry })) : [];
    if (player.injury && typeof player.injury === 'object' && Number(player.injury.weeksRemaining) > 0) {
      const definition = MEDICAL_INJURY_DEFS.find(item => item.id === player.injury.id) || MEDICAL_INJURY_DEFS[0];
      const fallbackWeeks = clamp(Math.round(Number(player.injury.weeksRemaining) || 1), 1, 12);
      const recoveryDaysRemaining = clamp(Math.round(Number(player.injury.recoveryDaysRemaining) || fallbackWeeks * 7), 1, 84);
      player.injury = {
        id: definition.id,
        name: String(player.injury.name || definition.name),
        severity: ['minor', 'moderate', 'major'].includes(player.injury.severity) ? player.injury.severity : definition.severity,
        recoveryDaysRemaining,
        recoveryProgress: clamp(Number(player.injury.recoveryProgress) || 0, 0, 0.999),
        weeksRemaining: clamp(Math.ceil(recoveryDaysRemaining / 7), 1, 12),
        occurredWeek: Math.max(1, Math.round(Number(player.injury.occurredWeek) || careerState.week || 1)),
        riskAtOccurrence: clamp(Number(player.injury.riskAtOccurrence) || 0, 0, 1),
        aggravated: Boolean(player.injury.aggravated),
        detail: String(player.injury.detail || 'Medical staff recommend reduced workload.')
      };
    } else {
      player.injury = null;
    }
    player.lastInjuryRisk = clamp(Number(player.lastInjuryRisk) || 0, 0, 1);
    player.lastMedicalUpdate = String(player.lastMedicalUpdate || 'No recent medical event.');
    return player;
  }

  function playerInjuryActive(player) {
    return Boolean(normalisePlayerMedical(player)?.injury?.weeksRemaining > 0);
  }

  function playerInjuryDefinition(player) {
    const injury = normalisePlayerMedical(player)?.injury;
    return injury ? (MEDICAL_INJURY_DEFS.find(item => item.id === injury.id) || MEDICAL_INJURY_DEFS[0]) : null;
  }

  function playerInjuryPenalty(player) {
    const definition = playerInjuryDefinition(player);
    if (!definition) return 0;
    const aggravation = player?.injury?.aggravated ? 0.018 : 0;
    return clamp(definition.penalty + aggravation, 0, 0.14);
  }

  function playerInjuryLabel(player) {
    const injury = normalisePlayerMedical(player)?.injury;
    if (!injury) return 'FIT';
    return `${injury.name.toUpperCase()} · ${injury.recoveryDaysRemaining}D`;
  }

  function playerVulnerabilityLabel(player) {
    const value = normalisePlayerMedical(player)?.injuryVulnerability || 0;
    if (value >= 72) return 'HIGH';
    if (value >= 48) return 'MODERATE';
    if (value >= 28) return 'LOW';
    return 'VERY LOW';
  }

  function playerMedicalAvailability(player) {
    const injury = normalisePlayerMedical(player)?.injury;
    if (!injury) return { label: 'AVAILABLE', className: 'fit', penalty: 0 };
    const penalty = playerInjuryPenalty(player);
    if (injury.severity === 'major') return { label: 'MEDICAL RISK', className: 'major', penalty };
    return { label: injury.severity === 'moderate' ? 'PLAY WITH CAUTION' : 'MINOR KNOCK', className: injury.severity, penalty };
  }

  function playerInjuryRisk(player, performance = null, fatigueBefore = null) {
    normalisePlayerMedical(player);
    const fatigue = clamp(Number(fatigueBefore ?? player.fatigue) || 0, 0, 100);
    const vulnerability = player.injuryVulnerability / 100;
    const resilience = clamp(Number(player.stats?.resilience) || 1, 1, CAREER_MAX_STAT);
    const age = clamp(Number(player.age) || 23, 17, 38);
    const rounds = Math.max(0, Number(performance?.rounds) || 0);
    const damageTaken = Math.max(0, Number(performance?.damageTaken) || 0);
    const sprintDistance = Math.max(0, Number(performance?.sprintDistance) || 0);
    const sportsScience = typeof teamBenefitLevel === 'function' ? teamBenefitLevel('recovery') : 0;
    const fatigueRisk = Math.pow(clamp((fatigue - 35) / 65, 0, 1), 1.45) * 0.105;
    const vulnerabilityRisk = vulnerability * 0.052;
    const workloadRisk = clamp(rounds * 0.0035 + damageTaken / 4200 + sprintDistance * 0.0007, 0, 0.075);
    const ageRisk = Math.max(0, age - 29) * 0.0022;
    const resilienceReduction = resilience * 0.0042;
    const scienceReduction = sportsScience * 0.004;
    const facilityReduction = typeof clubInfrastructureInjuryRiskReduction === 'function' ? clubInfrastructureInjuryRiskReduction() : 0;
    const activeInjuryRisk = playerInjuryActive(player) ? 0.055 : 0;
    return clamp(0.008 + fatigueRisk + vulnerabilityRisk + workloadRisk + ageRisk + activeInjuryRisk - resilienceReduction - scienceReduction - facilityReduction, 0.004, 0.24);
  }

  function medicalPickInjury(player, risk, randomValue = Math.random()) {
    const roll = clamp(Number(randomValue) || 0, 0, 0.999999);
    const highRisk = risk >= 0.13 || Number(player.fatigue) >= 82 || player.injuryVulnerability >= 75;
    const severeChance = highRisk ? 0.22 : 0.08;
    const moderateChance = highRisk ? 0.53 : 0.37;
    let pool;
    if (roll < severeChance) pool = MEDICAL_INJURY_DEFS.filter(item => item.severity === 'major');
    else if (roll < severeChance + moderateChance) pool = MEDICAL_INJURY_DEFS.filter(item => item.severity === 'moderate');
    else pool = MEDICAL_INJURY_DEFS.filter(item => item.severity === 'minor');
    return pool[Math.floor((roll * 997) % pool.length)] || MEDICAL_INJURY_DEFS[0];
  }

  function recoverPlayerInjuryDay(player) {
    normalisePlayerMedical(player);
    if (!player.injury) return { recovered: false, remaining: 0, remainingDays: 0 };
    const science = typeof teamBenefitLevel === 'function' ? teamBenefitLevel('recovery') : 0;
    const focusBoost = player.trainingFocus === 'recovery' ? 0.55 : 0;
    const facilityProgress = typeof clubInfrastructureInjuryRecoveryProgress === 'function' ? clubInfrastructureInjuryRecoveryProgress() : 0;
    const dailyProgress = 1 + focusBoost + science * 0.08 + facilityProgress;
    player.injury.recoveryProgress = (Number(player.injury.recoveryProgress) || 0) + dailyProgress;
    const recoveredDays = Math.max(1, Math.floor(player.injury.recoveryProgress));
    player.injury.recoveryProgress -= recoveredDays;
    player.injury.recoveryDaysRemaining = Math.max(0, player.injury.recoveryDaysRemaining - recoveredDays);
    player.injury.weeksRemaining = Math.max(0, Math.ceil(player.injury.recoveryDaysRemaining / 7));
    if (player.injury.recoveryDaysRemaining <= 0) {
      const recoveredName = player.injury.name;
      player.injury = null;
      player.lastMedicalUpdate = `${recoveredName} cleared by medical staff.`;
      return { recovered: true, remaining: 0, remainingDays: 0, name: recoveredName, recoveredDays };
    }
    const days = player.injury.recoveryDaysRemaining;
    player.lastMedicalUpdate = `${player.injury.name} recovery · ${days} day${days === 1 ? '' : 's'} remaining.`;
    return { recovered: false, remaining: player.injury.weeksRemaining, remainingDays: days, name: player.injury.name, recoveredDays };
  }

  function recoverPlayerInjuryWeek(player) {
    let result = { recovered: false, remaining: 0, remainingDays: 0 };
    for (let day = 0; day < 7; day++) {
      result = recoverPlayerInjuryDay(player);
      if (result.recovered || !player.injury) break;
    }
    return result;
  }

  function settlePlayerMedicalAfterMatch(player, performance, started, fatigueBefore, randomValue = Math.random()) {
    normalisePlayerMedical(player);
    if (!started || !performance) {
      player.lastInjuryRisk = 0;
      return { risk: 0, injury: null, recovery: { recovered: false, remaining: player.injury?.weeksRemaining || 0, remainingDays: player.injury?.recoveryDaysRemaining || 0 } };
    }

    const risk = playerInjuryRisk(player, performance, fatigueBefore);
    player.lastInjuryRisk = risk;
    combatDebug.injuriesRolled++;
    const roll = clamp(Number(randomValue) || 0, 0, 0.999999);
    if (roll >= risk) {
      if (!player.injury) player.lastMedicalUpdate = `Cleared after match · ${Math.round(risk * 100)}% injury risk.`;
      return { risk, injury: null, recovery: { recovered: false, remaining: player.injury?.weeksRemaining || 0, remainingDays: player.injury?.recoveryDaysRemaining || 0 } };
    }

    const severityRoll = (roll * 7.137 + player.injuryVulnerability * 0.011 + Number(player.fatigue || 0) * 0.003) % 1;
    const durationRoll = (roll * 11.731 + medicalStringHash(`${player.id}:${careerState.week}`) / 4294967296) % 1;
    const definition = medicalPickInjury(player, risk, severityRoll);
    const durationRange = definition.weeks[1] - definition.weeks[0] + 1;
    const weeks = definition.weeks[0] + Math.floor(durationRoll * durationRange);
    const aggravated = Boolean(player.injury);
    if (aggravated) {
      const addedDays = Math.max(3, Math.ceil(weeks * 0.6 * 7));
      player.injury.recoveryDaysRemaining = clamp(player.injury.recoveryDaysRemaining + addedDays, 1, 84);
      player.injury.weeksRemaining = clamp(Math.ceil(player.injury.recoveryDaysRemaining / 7), 1, 12);
      player.injury.aggravated = true;
      player.injury.detail = `Aggravated during week ${careerState.week}. Playing while injured increased recovery time.`;
      player.lastMedicalUpdate = `${player.injury.name} aggravated · ${player.injury.recoveryDaysRemaining} days remaining.`;
    } else {
      player.injury = {
        id: definition.id,
        name: definition.name,
        severity: definition.severity,
        weeksRemaining: weeks,
        recoveryDaysRemaining: weeks * 7,
        recoveryProgress: 0,
        occurredWeek: careerState.week,
        riskAtOccurrence: risk,
        aggravated: false,
        detail: `Sustained after match workload at ${Math.round(Number(player.fatigue) || 0)}% fatigue.`
      };
      player.lastMedicalUpdate = `${definition.name} sustained · ${weeks * 7} day recovery estimate.`;
    }
    player.injuryHistory.unshift({
      week: careerState.week,
      id: player.injury.id,
      name: player.injury.name,
      severity: player.injury.severity,
      weeks: player.injury.weeksRemaining,
      risk: Math.round(risk * 100),
      aggravated
    });
    player.injuryHistory = player.injuryHistory.slice(0, 12);
    player.happiness = clamp(Math.round(player.happiness - (definition.severity === 'major' ? 6 : 3)), 1, 100);
    player.morale = clamp(Math.round(player.morale - (definition.severity === 'major' ? 4 : 2)), 1, 100);
    combatDebug.injuriesSustained++;
    return { risk, injury: { ...player.injury }, recovery: { recovered: false, remaining: player.injury.weeksRemaining, remainingDays: player.injury.recoveryDaysRemaining } };
  }

  function applyPlayerInjuryToBot(bot, player) {
    if (!bot || !player) return bot;
    normalisePlayerMedical(player);
    const penalty = playerInjuryPenalty(player);
    bot.playerInjury = player.injury ? { ...player.injury } : null;
    bot.playerInjuryPenalty = penalty;
    if (!penalty) return bot;
    bot.speed *= 1 - penalty * 0.95;
    bot.moveSkill *= 1 - penalty * 0.70;
    bot.skill *= 1 - penalty * 0.55;
    bot.accuracyBonus -= penalty * 0.16;
    bot.reactionDelay = clamp(bot.reactionDelay + penalty * 0.30, 0.10, 0.52);
    bot.reloadMultiplier = clamp(bot.reloadMultiplier * (1 + penalty * 0.40), 0.64, 1.28);
    bot.maxHealth = Math.max(76, Math.round(bot.maxHealth * (1 - penalty * 0.30)));
    return bot;
  }
