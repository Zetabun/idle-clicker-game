/*
 * Strikewatch source module: 39-matchday.js
 * Purpose: Tactical match preparation, role assignments, decision mail and matchday analysis.
 *
 * This module extends club operations without owning calendar progression.
 */

  const CLUB_APPROACHES = Object.freeze({
    cautious: {
      id: 'cautious', name: 'CAUTIOUS',
      description: 'Protect health, use cover earlier and avoid unsupported entries.',
      aggression: -0.12, pace: 0.95, coverBias: 0.18, lowHealthThreshold: 0.56, waitForSupport: 1.18
    },
    balanced: {
      id: 'balanced', name: 'BALANCED',
      description: 'Allow operators to adapt between pressure, cover and rotation.',
      aggression: 0, pace: 1, coverBias: 0, lowHealthThreshold: 0.43, waitForSupport: 1
    },
    aggressive: {
      id: 'aggressive', name: 'AGGRESSIVE',
      description: 'Increase pace and commitment, accepting greater isolation and medical risk.',
      aggression: 0.11, pace: 1.05, coverBias: -0.12, lowHealthThreshold: 0.32, waitForSupport: 0.78
    }
  });

  const CLUB_ENGAGEMENTS = Object.freeze({
    close: {
      id: 'close', name: 'CLOSE RANGE',
      description: 'Close distance quickly and favour compact, high-pressure fights.',
      rangeMultiplier: 0.76, advanceBias: 0.12, spacingBias: -0.08
    },
    mixed: {
      id: 'mixed', name: 'MIXED RANGE',
      description: 'Let weapon profile and role determine the preferred engagement distance.',
      rangeMultiplier: 1, advanceBias: 0, spacingBias: 0
    },
    long: {
      id: 'long', name: 'LONG RANGE',
      description: 'Preserve sightlines, spacing and controlled burst opportunities.',
      rangeMultiplier: 1.22, advanceBias: -0.08, spacingBias: 0.12
    }
  });

  const CLUB_PRIORITIES = Object.freeze({
    group: {
      id: 'group', name: 'STAY GROUPED',
      description: 'Reduce isolation and wait for nearby support before dangerous entries.',
      groupBias: 1, tradeBias: 0.45, flankBias: -0.20, holdBias: 0.10, supportRadius: 3.05
    },
    trade: {
      id: 'trade', name: 'TRADE ELIMINATIONS',
      description: 'Keep a second operator close enough to react when a team-mate falls.',
      groupBias: 0.62, tradeBias: 1, flankBias: 0, holdBias: 0, supportRadius: 3.55
    },
    flank: {
      id: 'flank', name: 'CREATE FLANKS',
      description: 'Create wider firing angles while retaining a limited route back to support.',
      groupBias: 0.22, tradeBias: 0.42, flankBias: 1, holdBias: -0.10, supportRadius: 4.45
    },
    hold: {
      id: 'hold', name: 'HOLD TERRITORY',
      description: 'Protect useful ground and force opponents to enter prepared sightlines.',
      groupBias: 0.48, tradeBias: 0.30, flankBias: -0.12, holdBias: 1, supportRadius: 3.75
    }
  });

  const TACTICAL_CORE_STATS = Object.freeze(['marksmanship', 'handling', 'awareness', 'mobility', 'resilience']);
  const TACTICAL_FIT_DEFAULTS = Object.freeze({
    formation: { balanced: 52, pressure: 28, control: 30, defensive: 28, wide: 28 },
    approach: { cautious: 30, balanced: 52, aggressive: 30 },
    engagement: { close: 30, mixed: 52, long: 30 },
    priority: { group: 34, trade: 46, flank: 30, hold: 30 }
  });

  const TACTICAL_FORMATION_PROFILES = Object.freeze({
    balanced: {
      statWeights: { marksmanship: 1, handling: 1, awareness: 1, mobility: 1, resilience: 1 },
      roleTargets: ['entry', 'support', 'anchor', 'marksman', 'flex'],
      explanation: 'Rewards a broad spread of attributes and flexible role coverage.'
    },
    pressure: {
      statWeights: { marksmanship: 1.05, handling: 1.34, awareness: 0.90, mobility: 1.42, resilience: 0.78 },
      roleTargets: ['entry', 'entry', 'support', 'flanker', 'flex'],
      explanation: 'Needs quick Entries, dependable Support and enough Handling and Mobility to sustain early pressure.'
    },
    control: {
      statWeights: { marksmanship: 0.94, handling: 1.08, awareness: 1.46, mobility: 0.86, resilience: 1.12 },
      roleTargets: ['support', 'support', 'anchor', 'caller', 'flex'],
      explanation: 'Relies on Awareness, communication and stable support spacing before the team commits.'
    },
    defensive: {
      statWeights: { marksmanship: 1.04, handling: 0.88, awareness: 1.30, mobility: 0.72, resilience: 1.52 },
      roleTargets: ['anchor', 'anchor', 'support', 'marksman', 'caller'],
      explanation: 'Works best with resilient Anchors, strong information and accurate operators holding prepared angles.'
    },
    wide: {
      statWeights: { marksmanship: 0.94, handling: 1.12, awareness: 1.24, mobility: 1.54, resilience: 0.70 },
      roleTargets: ['flanker', 'flanker', 'entry', 'support', 'flex'],
      explanation: 'Demands mobile, aware Flankers who can separate without losing the route back to team support.'
    }
  });

  const TACTICAL_APPROACH_PROFILES = Object.freeze({
    cautious: {
      statWeights: { marksmanship: 1.04, handling: 0.92, awareness: 1.34, mobility: 0.72, resilience: 1.42 },
      readinessWeight: 0.18,
      explanation: 'Awareness and Resilience help the squad preserve health and use cover without becoming passive.'
    },
    balanced: {
      statWeights: { marksmanship: 1, handling: 1, awareness: 1, mobility: 1, resilience: 1 },
      readinessWeight: 0.14,
      explanation: 'A forgiving approach that lets the squad lean on its existing strengths.'
    },
    aggressive: {
      statWeights: { marksmanship: 1.08, handling: 1.38, awareness: 0.84, mobility: 1.46, resilience: 0.72 },
      readinessWeight: 0.26,
      explanation: 'Handling, Mobility and match readiness are essential when operators are asked to commit quickly.'
    }
  });

  const TACTICAL_ENGAGEMENT_PROFILES = Object.freeze({
    close: {
      statWeights: { marksmanship: 0.86, handling: 1.42, awareness: 0.82, mobility: 1.34, resilience: 1.10 },
      weaponProfile: 'close',
      explanation: 'Favours fast-handling weapons, movement and operators who can survive compact exchanges.'
    },
    mixed: {
      statWeights: { marksmanship: 1, handling: 1, awareness: 1, mobility: 1, resilience: 1 },
      weaponProfile: 'mixed',
      explanation: 'Uses the natural weapon and role profile of each starter with minimal specialisation.'
    },
    long: {
      statWeights: { marksmanship: 1.52, handling: 0.86, awareness: 1.36, mobility: 0.74, resilience: 0.88 },
      weaponProfile: 'long',
      explanation: 'Needs accurate weapons, Marksmanship and Awareness to make longer sightlines worthwhile.'
    }
  });

  const TACTICAL_PRIORITY_PROFILES = Object.freeze({
    group: {
      statWeights: { marksmanship: 0.90, handling: 0.96, awareness: 1.34, mobility: 0.88, resilience: 1.24 },
      roleTargets: ['support', 'caller', 'anchor', 'entry', 'flex'],
      explanation: 'Strong Awareness and durable central roles make regrouping and shared spacing more reliable.'
    },
    trade: {
      statWeights: { marksmanship: 1.08, handling: 1.24, awareness: 1.30, mobility: 1.02, resilience: 0.82 },
      roleTargets: ['entry', 'support', 'support', 'caller', 'flex'],
      explanation: 'Entries create contact while Support and Shot Callers need the reactions to arrive in time.'
    },
    flank: {
      statWeights: { marksmanship: 0.94, handling: 1.04, awareness: 1.34, mobility: 1.58, resilience: 0.66 },
      roleTargets: ['flanker', 'flanker', 'entry', 'support', 'flex'],
      explanation: 'Mobility and Awareness determine whether wide routes create an advantage or simple isolation.'
    },
    hold: {
      statWeights: { marksmanship: 1.16, handling: 0.88, awareness: 1.34, mobility: 0.68, resilience: 1.48 },
      roleTargets: ['anchor', 'anchor', 'marksman', 'support', 'caller'],
      explanation: 'Resilience, Awareness and controlled fire help the team protect useful territory.'
    }
  });

  function tacticalFitLabel(score) {
    const value = clamp(Math.round(Number(score) || 0), 0, 100);
    if (value >= 86) return { label: 'EXCELLENT', tone: 'elite' };
    if (value >= 74) return { label: 'STRONG', tone: 'strong' };
    if (value >= 62) return { label: 'SOUND', tone: 'sound' };
    if (value >= 50) return { label: 'WORKABLE', tone: 'workable' };
    if (value >= 38) return { label: 'STRETCHED', tone: 'warning' };
    return { label: 'POOR', tone: 'danger' };
  }

  function tacticalStatAverage(stats, weights = {}) {
    let total = 0;
    let weightTotal = 0;
    for (const key of TACTICAL_CORE_STATS) {
      const weight = Math.max(0, Number(weights[key]) || 0);
      if (!weight) continue;
      total += clamp(Number(stats?.[key]) || 0, 0, CAREER_MAX_STAT) * weight;
      weightTotal += weight;
    }
    return weightTotal > 0 ? total / weightTotal : 0;
  }

  function tacticalMappedStatScore(average) {
    return clamp(28 + clamp(Number(average) || 0, 0, CAREER_MAX_STAT) * 7.2, 24, 100);
  }

  function tacticalLineupStatScore(lineup, weights) {
    if (!lineup.length) return 0;
    const average = lineup.reduce((sum, player) => sum + tacticalStatAverage(player.stats, weights), 0) / lineup.length;
    return tacticalMappedStatScore(average);
  }

  function tacticalLineupReadiness(lineup) {
    if (!lineup.length) return 0;
    return clamp(lineup.reduce((sum, player) => sum + teamReadinessScore(player), 0) / lineup.length, 0, 100);
  }

  function tacticalRoleExecutionMarkup(fit = {}) {
    const scale = clamp(Number(fit.executionScale) || 1, 0.88, 1.07);
    const effectiveness = Math.round(scale * 100);
    const difference = effectiveness - 100;
    const comparison = difference === 0
      ? 'FULL ROLE PERFORMANCE'
      : (difference < 0 ? `${Math.abs(difference)}% BELOW FULL ROLE PERFORMANCE` : `${difference}% ABOVE FULL ROLE PERFORMANCE`);
    const explanation = difference < 0
      ? `Expected to carry out this role at ${effectiveness}% effectiveness. The shortfall affects tactical decisions and coordination, not weapon damage.`
      : (difference > 0
        ? `Expected to carry out this role at ${effectiveness}% effectiveness. Strong suitability improves tactical decisions and coordination, not weapon damage.`
        : 'Expected to carry out this role at full effectiveness. This rating affects tactical decisions and coordination, not weapon damage.');
    return `<div class="club-role-execution" title="${escapeCareerHtml(explanation)}" aria-label="${escapeCareerHtml(explanation)}"><strong>${effectiveness}% ROLE EFFECTIVENESS</strong><small>${comparison}</small></div>`;
  }

  function tacticalPlayerRoleSuitability(player, roleId) {
    if (!player) return { playerId: null, roleId: 'flex', score: 0, label: 'NO PLAYER', tone: 'danger', executionScale: 0.88, strengths: [], gaps: [] };
    const role = teamRoleById(roleId || player.role || 'flex');
    const weightedAverage = tacticalStatAverage(player.stats, role.weights);
    let score = tacticalMappedStatScore(weightedAverage);
    const natural = String(player.role || 'flex');
    const secondary = String(player.secondaryRole || 'flex');
    if (role.id === natural) score += 7;
    else if (role.id === secondary) score += 4;
    else if (natural === 'flex') score += 3;
    else if (role.id === 'flex') score += 2;
    score = clamp(score, 20, 100);
    const ranked = TACTICAL_CORE_STATS.map(key => ({ key, value: clamp(Number(player.stats?.[key]) || 0, 0, CAREER_MAX_STAT), weight: Number(role.weights[key]) || 1 }))
      .sort((a, b) => (b.value * b.weight) - (a.value * a.weight));
    const fit = tacticalFitLabel(score);
    return {
      playerId: player.id,
      playerName: player.name,
      roleId: role.id,
      roleName: role.name,
      naturalRoleId: natural,
      naturalRoleName: teamRoleById(natural).name,
      score: Math.round(score),
      label: fit.label,
      tone: fit.tone,
      executionScale: clamp(0.85 + score * 0.0022, 0.88, 1.07),
      strengths: ranked.slice(0, 2).map(item => CAREER_STAT_DEFS[item.key]?.label || item.key.toUpperCase()),
      gaps: ranked.slice(-2).reverse().map(item => CAREER_STAT_DEFS[item.key]?.label || item.key.toUpperCase()),
      naturalMatch: role.id === natural,
      secondaryMatch: role.id === secondary
    };
  }

  function tacticalRoleCoverageScore(lineup, targetRoles = []) {
    if (!lineup.length || !targetRoles.length) return 0;
    const used = new Set();
    let total = 0;
    for (const targetRole of targetRoles) {
      let bestIndex = -1;
      let bestQuality = -Infinity;
      for (let index = 0; index < lineup.length; index++) {
        if (used.has(index)) continue;
        const player = lineup[index];
        const assigned = clubMatchRoleForPlayer(player).id;
        const natural = String(player.role || 'flex');
        const suitability = tacticalPlayerRoleSuitability(player, targetRole).score / 100;
        let quality = 0.24 + suitability * 0.30;
        if (targetRole === 'flex') quality = 0.64 + suitability * 0.28;
        else if (assigned === targetRole) quality = 0.76 + suitability * 0.24;
        else if (assigned === 'flex') quality = 0.58 + suitability * 0.25;
        else if (natural === targetRole) quality = 0.50 + suitability * 0.24;
        if (quality > bestQuality) { bestQuality = quality; bestIndex = index; }
      }
      if (bestIndex >= 0) used.add(bestIndex);
      total += clamp(bestQuality, 0, 1);
    }
    return clamp(total / targetRoles.length * 100, 0, 100);
  }

  function tacticalWeaponFitForPlayer(player, profileId = 'mixed') {
    const weapon = getCareerWeapon(typeof careerPlayerActiveWeaponId === 'function' ? careerPlayerActiveWeaponId(player) : (player?.equippedWeaponId || player?.preferredWeaponId || 'scrap-p12'));
    const accuracy = clamp(Number(weapon.accuracy) || 0, 0, 1) * 100;
    const handling = clamp(Number(weapon.handling) || 0, 0, 1) * 100;
    const range = clamp((Number(weapon.range) || 0) / 9.2, 0, 1) * 100;
    const cadence = clamp((0.29 - (Number(weapon.fireRate) || 0.29)) / 0.15, 0, 1) * 100;
    const damage = clamp((((Number(weapon.damageMin) || 0) + (Number(weapon.damageMax) || 0)) * 0.5 - 8) / 10, 0, 1) * 100;
    const magazine = clamp((Number(weapon.magSize) || 0) / 15, 0, 1) * 100;
    if (profileId === 'close') return accuracy * 0.12 + handling * 0.34 + cadence * 0.30 + magazine * 0.16 + damage * 0.08;
    if (profileId === 'long') return accuracy * 0.42 + range * 0.32 + damage * 0.20 + handling * 0.06;
    return accuracy * 0.24 + handling * 0.24 + range * 0.20 + cadence * 0.13 + damage * 0.11 + magazine * 0.08;
  }

  function tacticalWeaponFitScore(lineup, profileId = 'mixed') {
    if (!lineup.length) return 0;
    return clamp(lineup.reduce((sum, player) => sum + tacticalWeaponFitForPlayer(player, profileId), 0) / lineup.length, 0, 100);
  }

  function clubWeaponRangeCompatibility(engagementId = clubTacticsState().engagementId) {
    const lineup = clubWorkflowSquad().slice(0, TEAM_REQUIRED_STARTERS);
    const weapons = lineup.map(player => getCareerWeapon(typeof careerPlayerActiveWeaponId === 'function' ? careerPlayerActiveWeaponId(player) : (player?.equippedWeaponId || 'scrap-p12')));
    const ranges = weapons.map(weapon => Number(weapon?.range) || 0);
    const longCapable = ranges.filter(value => value >= 9.2).length;
    const shortRange = ranges.filter(value => value < 8.5).length;
    const averageRange = ranges.length ? ranges.reduce((sum, value) => sum + value, 0) / ranges.length : 0;
    if (engagementId === 'long' && lineup.length >= TEAM_REQUIRED_STARTERS && (longCapable < 2 || averageRange < 8.8)) {
      return {
        level: longCapable === 0 ? 'danger' : 'warning',
        title: 'WEAPON-RANGE MISMATCH',
        detail: `${shortRange} of ${lineup.length} starters carry short-range weapons, but Long Range asks the squad to preserve distance. Use Mixed/Close Range or issue at least two long-range weapons.`,
        longCapable,
        shortRange,
        averageRange: Number(averageRange.toFixed(2))
      };
    }
    if (engagementId === 'close' && lineup.length >= TEAM_REQUIRED_STARTERS && longCapable >= 3) {
      return {
        level: 'warning',
        title: 'WEAPON-RANGE TRADE-OFF',
        detail: `${longCapable} starters carry long-range weapons. Close Range may force them into less efficient fights; Mixed Range will let their weapon profiles decide spacing.`,
        longCapable,
        shortRange,
        averageRange: Number(averageRange.toFixed(2))
      };
    }
    return null;
  }

  function tacticalRangeWarningMarkup(engagementId = clubTacticsState().engagementId, compact = false) {
    const warning = clubWeaponRangeCompatibility(engagementId);
    if (!warning) return '';
    return `<article class="tactical-range-warning ${escapeCareerHtml(warning.level)} ${compact ? 'compact' : ''}"><span>${escapeCareerHtml(warning.title)}</span><strong>${warning.shortRange} SHORT-RANGE · ${warning.longCapable} LONG-RANGE</strong><small>${escapeCareerHtml(warning.detail)}</small></article>`;
  }

  function tacticalFamiliarityBucket(root, key, defaults) {
    root[key] = root[key] && typeof root[key] === 'object' ? root[key] : {};
    for (const [id, fallback] of Object.entries(defaults)) {
      const parsed = Number(root[key][id]);
      root[key][id] = clamp(Math.round(Number.isFinite(parsed) ? parsed : fallback), 0, 100);
    }
    for (const id of Object.keys(root[key])) if (!(id in defaults)) delete root[key][id];
    return root[key];
  }

  function tacticalNormaliseFamiliarity(raw) {
    const state = raw && typeof raw === 'object' ? raw : {};
    tacticalFamiliarityBucket(state, 'formation', TACTICAL_FIT_DEFAULTS.formation);
    tacticalFamiliarityBucket(state, 'approach', TACTICAL_FIT_DEFAULTS.approach);
    tacticalFamiliarityBucket(state, 'engagement', TACTICAL_FIT_DEFAULTS.engagement);
    tacticalFamiliarityBucket(state, 'priority', TACTICAL_FIT_DEFAULTS.priority);
    state.lastGain = state.lastGain && typeof state.lastGain === 'object' ? { ...state.lastGain } : null;
    return state;
  }

  function tacticalSelectedFamiliarity(formationId, approachId, engagementId, priorityId) {
    const state = tacticalNormaliseFamiliarity(clubTacticsState().familiarity);
    const values = [
      state.formation[formationId] ?? TACTICAL_FIT_DEFAULTS.formation[formationId] ?? 25,
      state.approach[approachId] ?? TACTICAL_FIT_DEFAULTS.approach[approachId] ?? 25,
      state.engagement[engagementId] ?? TACTICAL_FIT_DEFAULTS.engagement[engagementId] ?? 25,
      state.priority[priorityId] ?? TACTICAL_FIT_DEFAULTS.priority[priorityId] ?? 25
    ];
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }

  function tacticalOpponentMatchup(formationId, approachId, engagementId, priorityId) {
    const opponent = clubOpponentBriefing();
    const style = String(opponent.style || 'BALANCED').toUpperCase();
    let score = 50;
    const notes = [];
    if (style.includes('PRESSURE') || style.includes('TEMPO')) {
      if (approachId === 'cautious') { score += 8; notes.push('Cautious cover use can absorb their early tempo.'); }
      if (priorityId === 'group') { score += 6; notes.push('Grouped spacing reduces isolated opening duels.'); }
      if (formationId === 'control' || formationId === 'defensive') score += 4;
      if (approachId === 'aggressive') score -= 5;
    } else if (style.includes('DEFENCE')) {
      if (formationId === 'wide') { score += 8; notes.push('Wide routes can stretch their anchored defence.'); }
      if (priorityId === 'flank') { score += 7; notes.push('Flanking creates a second angle against prepared holds.'); }
      if (approachId === 'aggressive') score += 4;
      if (priorityId === 'hold') score -= 4;
    } else if (style.includes('ROTATION')) {
      if (formationId === 'control') score += 7;
      if (priorityId === 'group') { score += 7; notes.push('Grouped information helps track their rotations.'); }
      if (priorityId === 'flank') score -= 4;
    } else if (style.includes('INFORMATION') || style.includes('CONTROL')) {
      if (formationId === 'pressure') score += 7;
      if (approachId === 'aggressive') { score += 5; notes.push('Faster commitment can deny their preferred information cycle.'); }
      if (priorityId === 'flank') score += 3;
      if (approachId === 'cautious') score -= 3;
    } else if (style.includes('BALANCED')) {
      notes.push('The opponent has no obvious structural weakness to target.');
    }
    score = clamp(score, 35, 65);
    if (!notes.length) notes.push(score > 52 ? 'The selected plan creates a modest matchup advantage.' : score < 48 ? 'The opposition style slightly resists the selected plan.' : 'The tactical matchup is broadly neutral.');
    return { score: Math.round(score), style, opponentName: opponent.name, note: notes[0] };
  }

  function tacticalComponentScore(lineup, profile, type = 'formation') {
    const statScore = tacticalLineupStatScore(lineup, profile.statWeights || {});
    if (type === 'formation') {
      const coverageScore = tacticalRoleCoverageScore(lineup, profile.roleTargets || []);
      return { score: Math.round(statScore * 0.60 + coverageScore * 0.40), statScore: Math.round(statScore), coverageScore: Math.round(coverageScore), explanation: profile.explanation };
    }
    if (type === 'approach') {
      const readiness = tacticalLineupReadiness(lineup);
      const readinessWeight = clamp(Number(profile.readinessWeight) || 0.15, 0, 0.35);
      return { score: Math.round(statScore * (1 - readinessWeight) + readiness * readinessWeight), statScore: Math.round(statScore), readiness: Math.round(readiness), explanation: profile.explanation };
    }
    if (type === 'engagement') {
      const weaponScore = tacticalWeaponFitScore(lineup, profile.weaponProfile || 'mixed');
      return { score: Math.round(statScore * 0.68 + weaponScore * 0.32), statScore: Math.round(statScore), weaponScore: Math.round(weaponScore), explanation: profile.explanation };
    }
    const coverageScore = tacticalRoleCoverageScore(lineup, profile.roleTargets || []);
    return { score: Math.round(statScore * 0.70 + coverageScore * 0.30), statScore: Math.round(statScore), coverageScore: Math.round(coverageScore), explanation: profile.explanation };
  }

  function clubTacticalSuitabilityReport(overrides = {}) {
    const lineup = clubWorkflowSquad().slice(0, TEAM_REQUIRED_STARTERS);
    const formationId = CLUB_FORMATIONS[overrides.formationId] ? overrides.formationId : clubFormation().id;
    const approachId = CLUB_APPROACHES[overrides.approachId] ? overrides.approachId : clubApproach().id;
    const engagementId = CLUB_ENGAGEMENTS[overrides.engagementId] ? overrides.engagementId : clubEngagementPlan().id;
    const priorityId = CLUB_PRIORITIES[overrides.priorityId] ? overrides.priorityId : clubTeamPriority().id;
    const formation = tacticalComponentScore(lineup, TACTICAL_FORMATION_PROFILES[formationId] || TACTICAL_FORMATION_PROFILES.balanced, 'formation');
    const approach = tacticalComponentScore(lineup, TACTICAL_APPROACH_PROFILES[approachId] || TACTICAL_APPROACH_PROFILES.balanced, 'approach');
    const engagement = tacticalComponentScore(lineup, TACTICAL_ENGAGEMENT_PROFILES[engagementId] || TACTICAL_ENGAGEMENT_PROFILES.mixed, 'engagement');
    const priority = tacticalComponentScore(lineup, TACTICAL_PRIORITY_PROFILES[priorityId] || TACTICAL_PRIORITY_PROFILES.trade, 'priority');
    const players = lineup.map(player => tacticalPlayerRoleSuitability(player, clubMatchRoleForPlayer(player).id));
    const roleScore = players.length ? Math.round(players.reduce((sum, item) => sum + item.score, 0) / players.length) : 0;
    const familiarity = tacticalSelectedFamiliarity(formationId, approachId, engagementId, priorityId);
    const matchup = tacticalOpponentMatchup(formationId, approachId, engagementId, priorityId);
    let overall = formation.score * 0.28 + approach.score * 0.17 + engagement.score * 0.14 + priority.score * 0.14 + roleScore * 0.18 + familiarity * 0.09;
    overall += (matchup.score - 50) * 0.15;
    overall = clamp(Math.round(overall), 0, 100);
    const fit = tacticalFitLabel(overall);
    const tacticalEffectScale = clamp(0.82 + overall * 0.0026, 0.86, 1.08);
    const insights = [];
    const components = [
      { id: 'formation', name: 'Formation', score: formation.score },
      { id: 'approach', name: 'Approach', score: approach.score },
      { id: 'engagement', name: 'Range', score: engagement.score },
      { id: 'priority', name: 'Priority', score: priority.score },
      { id: 'roles', name: 'Assigned roles', score: roleScore },
      { id: 'familiarity', name: 'Familiarity', score: familiarity }
    ].sort((a, b) => b.score - a.score);
    if (lineup.length < TEAM_REQUIRED_STARTERS) insights.push(`Recruit and submit ${TEAM_REQUIRED_STARTERS} starters before tactical fit can be assessed reliably.`);
    else {
      insights.push(`${components[0].name} is the clearest strength at ${components[0].score}/100.`);
      if (components[components.length - 1].score < 62) insights.push(`${components[components.length - 1].name} is limiting execution at ${components[components.length - 1].score}/100.`);
      const mismatches = players.filter(item => !item.naturalMatch && item.score < 62);
      if (mismatches.length) insights.push(`${mismatches.map(item => item.playerName).slice(0, 2).join(' and ')} ${mismatches.length === 1 ? 'is' : 'are'} stretched by the assigned match role.`);
      if (familiarity < 45) insights.push('The squad is still learning this combination; using it in matches will raise familiarity.');
      insights.push(matchup.note);
    }
    return {
      overall,
      label: fit.label,
      tone: fit.tone,
      executionPercent: Math.round(tacticalEffectScale * 100),
      tacticalEffectScale,
      formationId,
      approachId,
      engagementId,
      priorityId,
      formation: { ...formation, ...tacticalFitLabel(formation.score) },
      approach: { ...approach, ...tacticalFitLabel(approach.score) },
      engagement: { ...engagement, ...tacticalFitLabel(engagement.score) },
      priority: { ...priority, ...tacticalFitLabel(priority.score) },
      roles: { score: roleScore, ...tacticalFitLabel(roleScore) },
      familiarity: { score: familiarity, ...tacticalFitLabel(familiarity) },
      matchup,
      players,
      insights: insights.slice(0, 4)
    };
  }

  function tacticalSuitabilitySnapshot(report = clubTacticalSuitabilityReport()) {
    return {
      overall: report.overall,
      label: report.label,
      tone: report.tone,
      executionPercent: report.executionPercent,
      tacticalEffectScale: report.tacticalEffectScale,
      formation: { score: report.formation.score, label: report.formation.label },
      approach: { score: report.approach.score, label: report.approach.label },
      engagement: { score: report.engagement.score, label: report.engagement.label },
      priority: { score: report.priority.score, label: report.priority.label },
      roles: { score: report.roles.score, label: report.roles.label },
      familiarity: { score: report.familiarity.score, label: report.familiarity.label },
      matchup: { ...report.matchup },
      players: report.players.map(item => ({ playerId: item.playerId, playerName: item.playerName, roleId: item.roleId, roleName: item.roleName, score: item.score, label: item.label, tone: item.tone, executionScale: item.executionScale, naturalMatch: item.naturalMatch, secondaryMatch: item.secondaryMatch })),
      insights: [...report.insights]
    };
  }

  function clubTacticsState() {
    careerState.tactics = careerState.tactics && typeof careerState.tactics === 'object' ? careerState.tactics : {};
    const tactics = careerState.tactics;
    tactics.approachId = CLUB_APPROACHES[tactics.approachId] ? tactics.approachId : 'balanced';
    tactics.engagementId = CLUB_ENGAGEMENTS[tactics.engagementId] ? tactics.engagementId : 'mixed';
    tactics.priorityId = CLUB_PRIORITIES[tactics.priorityId] ? tactics.priorityId : 'trade';
    tactics.assignments = tactics.assignments && typeof tactics.assignments === 'object' ? tactics.assignments : {};
    const validIds = new Set((careerState.squad || []).map(player => String(player.id)));
    for (const playerId of Object.keys(tactics.assignments)) {
      if (!validIds.has(String(playerId)) || !TEAM_ROLES.some(role => role.id === tactics.assignments[playerId])) delete tactics.assignments[playerId];
    }
    tactics.matchPrep = tactics.matchPrep && typeof tactics.matchPrep === 'object' ? tactics.matchPrep : {};
    tactics.matchPrep.day = Number.isFinite(Number(tactics.matchPrep.day)) ? Math.round(Number(tactics.matchPrep.day)) : -1;
    tactics.matchPrep.fixtureId = String(tactics.matchPrep.fixtureId || '');
    tactics.matchPrep.briefingReviewed = Boolean(tactics.matchPrep.briefingReviewed);
    tactics.matchPrep.planConfirmed = Boolean(tactics.matchPrep.planConfirmed);
    tactics.matchPrep.lineupSignature = String(tactics.matchPrep.lineupSignature || '');
    tactics.matchPrep.opponentId = String(tactics.matchPrep.opponentId || '');
    tactics.matchPrep.selectedResponseId = String(tactics.matchPrep.selectedResponseId || '');
    tactics.matchPrep.fixtureDrills = Array.isArray(tactics.matchPrep.fixtureDrills) ? [...new Set(tactics.matchPrep.fixtureDrills.map(String))].slice(0, 2) : [];
    tactics.matchPrep.opponentDepthAtReview = clamp(Math.round(Number(tactics.matchPrep.opponentDepthAtReview) || 0), 0, 100);
    tactics.familiarity = tacticalNormaliseFamiliarity(tactics.familiarity);
    return tactics;
  }

  function clubWorkflowTactics() {
    return typeof workflowTacticsReadState === 'function' ? workflowTacticsReadState() : clubTacticsState();
  }

  function clubWorkflowSquad() {
    return typeof workflowSquadForRead === 'function' ? workflowSquadForRead('tactics') : (careerState.squad || []);
  }

  function clubApproach() {
    return CLUB_APPROACHES[clubWorkflowTactics().approachId] || CLUB_APPROACHES.balanced;
  }

  function clubEngagementPlan() {
    return CLUB_ENGAGEMENTS[clubWorkflowTactics().engagementId] || CLUB_ENGAGEMENTS.mixed;
  }

  function clubTeamPriority() {
    return CLUB_PRIORITIES[clubWorkflowTactics().priorityId] || CLUB_PRIORITIES.trade;
  }

  function clubMatchRoleForPlayer(player) {
    const assigned = player ? clubWorkflowTactics().assignments[player.id] : null;
    return teamRoleById(assigned || player?.role || 'flex');
  }

  function clubMatchRoleForSlot(slot) {
    return clubMatchRoleForPlayer(clubWorkflowSquad()[slot] || null);
  }

  function clubLineupSignature() {
    return clubWorkflowSquad().slice(0, TEAM_REQUIRED_STARTERS).map(player => `${player.id}:${clubMatchRoleForPlayer(player).id}`).join('|');
  }

  function clubMatchPlanSignature() {
    const tactics = clubWorkflowTactics();
    const lineup = clubWorkflowSquad().slice(0, TEAM_REQUIRED_STARTERS).map(player => {
      return `${player.id}:${clubMatchRoleForPlayer(player).id}:${typeof careerPlayerPrimaryWeaponId === 'function' ? (careerPlayerPrimaryWeaponId(player) || 'none') : (player.equippedPrimaryWeaponId || 'none')}:${typeof careerPlayerSidearmId === 'function' ? careerPlayerSidearmId(player) : (player.equippedSidearmId || 'scrap-p12')}:${player.equippedArmourId || 'none'}`;
    }).join('|');
    const prep = careerState.tactics?.matchPrep || {};
    const preparationKey = `${String(prep.opponentId || 'none')}:${Math.round(Number(prep.opponentDepthAtReview) || 0)}:${String(prep.selectedResponseId || 'custom')}:${(Array.isArray(prep.fixtureDrills) ? prep.fixtureDrills : []).slice().sort().join('.')}`;
    return `${tactics.formationId}/${tactics.approachId}/${tactics.engagementId}/${tactics.priorityId}//${lineup}//${preparationKey}`;
  }

  function clubMatchPrepFixtureId() {
    const fixture = typeof leagueNextFixture === 'function' ? leagueNextFixture() : null;
    const active = typeof leagueActiveFixture === 'function' ? leagueActiveFixture() : null;
    return String(fixture?.id || active?.id || '');
  }

  function clubCreateMatchPrepState(day, fixtureId = '', opponentId = '', invalidatedReason = '') {
    const state = {
      day,
      fixtureId: String(fixtureId || ''),
      briefingReviewed: false,
      planConfirmed: false,
      lineupSignature: '',
      opponentId: String(opponentId || ''),
      selectedResponseId: '',
      fixtureDrills: [],
      opponentDepthAtReview: 0
    };
    if (invalidatedReason) state.invalidatedReason = invalidatedReason;
    return state;
  }

  function clubMatchPrepState() {
    const tactics = clubTacticsState();
    const day = clubCalendarState().absoluteDay;
    const fixtureId = clubMatchPrepFixtureId();
    if (tactics.matchPrep.day < 0) tactics.matchPrep.day = day;
    // Build 12.126: preparation belongs to the scheduled fixture, not to the
    // current calendar day. Advancing toward the same fixture must not force
    // the manager through the same briefing and confirmation loop again.
    if (!tactics.matchPrep.fixtureId && fixtureId) tactics.matchPrep.fixtureId = fixtureId;
    if (fixtureId && tactics.matchPrep.fixtureId && tactics.matchPrep.fixtureId !== fixtureId) {
      tactics.matchPrep = clubCreateMatchPrepState(day, fixtureId, '', 'A new fixture is now scheduled, so the previous match plan was cleared.');
      opponentPreparationAdvancedOpen = false;
    }
    const targetClub = typeof opponentPreparationTargetClub === 'function' ? opponentPreparationTargetClub() : null;
    const targetId = String(targetClub?.id || '');
    if (targetId && tactics.matchPrep.opponentId && tactics.matchPrep.opponentId !== targetId) {
      tactics.matchPrep = clubCreateMatchPrepState(day, fixtureId, targetId, 'The opposition changed, so the previous fixture plan was cleared.');
      opponentPreparationAdvancedOpen = false;
    }
    if (tactics.matchPrep.planConfirmed && tactics.matchPrep.lineupSignature !== clubMatchPlanSignature()) tactics.matchPrep.planConfirmed = false;
    if (typeof workflowHasDirtyMatchSetupDrafts === 'function' && workflowHasDirtyMatchSetupDrafts()) return { ...tactics.matchPrep, planConfirmed: false, invalidatedReason: 'Unsaved match setup changes must be saved before confirmation.' };
    return tactics.matchPrep;
  }

  function clubMutableMatchPrepState() {
    clubMatchPrepState();
    return clubTacticsState().matchPrep;
  }

  function clubInvalidateMatchPlan(reason = '') {
    const prep = clubMutableMatchPrepState();
    prep.planConfirmed = false;
    prep.lineupSignature = '';
    if (reason) prep.invalidatedReason = String(reason).slice(0, 120);
    return prep;
  }

  function clubReviewMatchBriefing() {
    if (!careerState.created) return false;
    const prep = clubMutableMatchPrepState();
    const preparation = typeof opponentPreparationRead === 'function' ? opponentPreparationRead() : null;
    prep.day = clubCalendarState().absoluteDay;
    prep.fixtureId = clubMatchPrepFixtureId();
    prep.briefingReviewed = true;
    prep.opponentId = preparation?.clubId || prep.opponentId || '';
    prep.opponentDepthAtReview = preparation?.depth || prep.opponentDepthAtReview || 0;
    saveCareerState();
    return true;
  }

  function clubConfirmMatchPlan() {
    if (!careerSquadReady()) return false;
    const prep = clubMutableMatchPrepState();
    const preparation = typeof opponentPreparationRead === 'function' ? opponentPreparationRead() : null;
    prep.day = clubCalendarState().absoluteDay;
    prep.fixtureId = clubMatchPrepFixtureId();
    prep.briefingReviewed = true;
    prep.opponentId = preparation?.clubId || prep.opponentId || '';
    prep.opponentDepthAtReview = preparation?.depth || prep.opponentDepthAtReview || 0;
    prep.planConfirmed = true;
    prep.lineupSignature = clubMatchPlanSignature();
    prep.confirmedAt = Date.now();
    delete prep.invalidatedReason;
    saveCareerState();
    return true;
  }

  function clubMatchPlanConfirmed() {
    if (!careerSquadReady()) return false;
    const prep = clubMatchPrepState();
    return Boolean(prep.briefingReviewed && prep.planConfirmed && prep.lineupSignature === clubMatchPlanSignature());
  }

  function clubSuggestedOpeningPlan(arenaId = clubWorkflowTactics().arenaId, plan = null) {
    const arena = arenaMeta(arenaId);
    const options = engagementPlanOptions(arena.id);
    if (!options.length) return null;
    const tactics = plan || {
      formationId: clubFormation().id,
      approachId: clubApproach().id,
      engagementId: clubEngagementPlan().id,
      priorityId: clubTeamPriority().id
    };
    const scorePlan = option => {
      const text = `${option.id || ''} ${option.name || ''} ${option.zone || ''}`.toLowerCase();
      let score = Number(option.priority) || 0;
      const has = (...terms) => terms.some(term => text.includes(term));
      if (tactics.priorityId === 'flank' && has('flank', 'courtyard', 'arcade', 'service', 'bazaar')) score += 3.1;
      if (tactics.priorityId === 'hold' && has('rampart', 'upper', 'north', 'core', 'gate')) score += 2.25;
      if (tactics.priorityId === 'group' && has('central', 'core', 'gate', 'mid')) score += 2.0;
      if (tactics.priorityId === 'trade' && has('central', 'core', 'gate', 'mid', 'contact')) score += 2.35;
      if (tactics.engagementId === 'long' && has('north', 'rampart', 'upper', 'mid', 'long')) score += 2.65;
      if (tactics.engagementId === 'close' && has('bazaar', 'service', 'core', 'gate', 'stores')) score += 2.55;
      if (tactics.approachId === 'aggressive' && has('central', 'core', 'gate', 'clash', 'contest')) score += 1.35;
      if (tactics.approachId === 'cautious' && has('rampart', 'upper', 'courtyard', 'loading')) score += 1.1;
      if (tactics.formationId === 'wide' && has('flank', 'courtyard', 'arcade', 'service')) score += 2.0;
      if (tactics.formationId === 'pressure' && has('central', 'core', 'gate', 'clash')) score += 1.8;
      if (tactics.formationId === 'defensive' && has('rampart', 'upper', 'north', 'hold')) score += 1.65;
      if (tactics.formationId === 'control' && has('central', 'core', 'mid', 'gate')) score += 1.45;
      return score;
    };
    return options.slice().sort((a, b) => scorePlan(b) - scorePlan(a) || String(a.id).localeCompare(String(b.id)))[0] || options[0];
  }

  function clubTacticalPreviewSnapshot(plan = null, arenaId = null) {
    const snapshot = plan || clubTacticalPlanSnapshot();
    const arena = arenaMeta(arenaId || snapshot.arenaId || clubWorkflowTactics().arenaId);
    const opening = arena.engagementPlans?.find(item => item.id === snapshot.openingPlanId) || clubSuggestedOpeningPlan(arena.id, snapshot);
    const roster = clubWorkflowSquad().slice(0, TEAM_REQUIRED_STARTERS);
    const assignments = Array.isArray(snapshot.assignments) && snapshot.assignments.length ? snapshot.assignments : roster.map((player, slot) => ({
      playerId: player.id, playerName: player.name, slot, roleId: clubMatchRoleForPlayer(player).id, roleName: clubMatchRoleForPlayer(player).name
    }));
    const blueObjectives = opening?.blue || [];
    const redObjectives = opening?.red || [];
    const rows = assignments.map((assignment, index) => {
      const objective = blueObjectives[index] || blueObjectives[blueObjectives.length - 1] || arena.spawnPoints?.[TEAM_BLUE]?.[index] || { x: 2.5, y: 12.5 };
      const zone = arena.zones?.find(item => objective.x >= item.x1 && objective.x <= item.x2 && objective.y >= item.z1 && objective.y <= item.z2) || arena.zones?.[arena.zones.length - 1] || null;
      const player = roster.find(item => item.id === assignment.playerId) || roster[index] || null;
      const weapon = getCareerWeapon(typeof careerPlayerActiveWeaponId === 'function' ? careerPlayerActiveWeaponId(player) : (player?.equippedWeaponId || player?.preferredWeaponId || 'scrap-p12'));
      return {
        ...assignment,
        objective: { x: Number(objective.x) || 0, y: Number(objective.y) || 0 },
        zone: zone?.short || opening?.zone || 'TRANSIT',
        weaponName: weapon.name,
        primaryWeaponName: careerPlayerPrimaryWeaponId(player) ? getCareerWeapon(careerPlayerPrimaryWeaponId(player)).name : 'NONE',
        sidearmWeaponName: getCareerWeapon(careerPlayerSidearmId(player)).name,
        rangeBand: weaponRangeDescriptor(weapon).label
      };
    });
    const warnings = [];
    const suitability = snapshot.suitability || tacticalSuitabilitySnapshot(clubTacticalSuitabilityReport());
    if ((Number(suitability.overall) || 0) < 55) warnings.push({ tone: 'danger', title: 'LOW PLAN FIT', detail: `This active five-operator line-up is rated ${Math.round(Number(suitability.overall) || 0)}/100 for the selected instructions.` });
    const mismatches = (suitability.players || []).filter(item => !item.naturalMatch && Number(item.score) < 62);
    if (mismatches.length) warnings.push({ tone: 'warning', title: 'ROLE CONFLICT', detail: `${mismatches[0].playerName} is stretched by the ${mismatches[0].roleName} assignment.` });
    const shortWeapons = rows.filter(row => String(row.rangeBand).includes('SHORT')).length;
    const longWeapons = rows.filter(row => String(row.rangeBand).includes('LONG')).length;
    if (snapshot.engagementId === 'long' && shortWeapons >= 3) warnings.push({ tone: 'danger', title: 'RANGE CONFLICT', detail: `${shortWeapons} starters carry short-range weapons under a Long Range instruction.` });
    if (snapshot.engagementId === 'close' && longWeapons >= 3) warnings.push({ tone: 'warning', title: 'RANGE WASTE', detail: `${longWeapons} starters may surrender their weapon reach under a Close Range instruction.` });
    if (snapshot.priorityId === 'flank' && rows.filter(row => ['flanker', 'entry'].includes(row.roleId)).length < 2) warnings.push({ tone: 'warning', title: 'LIMITED WIDE RUNNERS', detail: 'Create Flanks is selected without two natural Entry or Flanker assignments.' });
    if (!warnings.length) warnings.push({ tone: 'positive', title: 'PLAN COHERENT', detail: 'Roles, weapon ranges and opening lanes have no major conflict.' });
    const centre = [...blueObjectives, ...redObjectives].length ? [...blueObjectives, ...redObjectives].reduce((total, point) => ({ x: total.x + point.x, y: total.y + point.y }), { x: 0, y: 0 }) : { x: arena.layout?.[0]?.length / 2 || 18, y: arena.layout?.length / 2 || 12 };
    const count = Math.max(1, blueObjectives.length + redObjectives.length);
    return {
      arenaId: arena.id,
      openingPlanId: opening?.id || '',
      openingPlanName: opening?.name || 'DYNAMIC CONTACT',
      openingZone: opening?.zone || 'MIXED',
      rows,
      warnings,
      blueObjectives: blueObjectives.map(point => ({ x: Number(point.x) || 0, y: Number(point.y) || 0 })),
      redObjectives: redObjectives.map(point => ({ x: Number(point.x) || 0, y: Number(point.y) || 0 })),
      contestedCentre: { x: centre.x / count, y: centre.y / count },
      priorityId: snapshot.priorityId || 'trade',
      engagementId: snapshot.engagementId || 'mixed'
    };
  }

  function clubTacticalPlanSnapshot() {
    const formation = clubFormation();
    const approach = clubApproach();
    const engagement = clubEngagementPlan();
    const priority = clubTeamPriority();
    const suitability = tacticalSuitabilitySnapshot(clubTacticalSuitabilityReport());
    const arenaId = arenaMeta(clubWorkflowTactics().arenaId).id;
    const openingPlan = clubSuggestedOpeningPlan(arenaId, { formationId: formation.id, approachId: approach.id, engagementId: engagement.id, priorityId: priority.id });
    return {
      formationId: formation.id,
      formationName: formation.short,
      approachId: approach.id,
      approachName: approach.name,
      engagementId: engagement.id,
      engagementName: engagement.name,
      priorityId: priority.id,
      priorityName: priority.name,
      arenaId,
      arenaName: arenaMeta(arenaId).name,
      openingPlanId: openingPlan?.id || '',
      openingPlanName: openingPlan?.name || 'DYNAMIC CONTACT',
      openingPlanZone: openingPlan?.zone || 'MIXED',
      suitability,
      assignments: clubWorkflowSquad().slice(0, TEAM_REQUIRED_STARTERS).map((player, slot) => ({
        playerId: player.id,
        playerName: player.name,
        slot,
        naturalRoleId: player.role,
        roleId: clubMatchRoleForPlayer(player).id,
        roleName: clubMatchRoleForPlayer(player).name
      }))
    };
  }

  function clubRecordTacticalFamiliarity(summary) {
    const plan = summary?.tacticalPlan || careerState.tactics?.activeMatchPlan;
    if (!plan) return null;
    const familiarity = tacticalNormaliseFamiliarity(clubTacticsState().familiarity);
    const rounds = clamp(Math.round(Number(summary?.roundsPlayed) || 1), 1, 7);
    const baseGain = clamp(2 + Math.floor(rounds / 2) + (summary?.won ? 1 : 0), 2, 7);
    const updates = [
      ['formation', plan.formationId, baseGain + 1],
      ['approach', plan.approachId, baseGain],
      ['engagement', plan.engagementId, baseGain],
      ['priority', plan.priorityId, baseGain]
    ];
    for (const [bucket, id, gain] of updates) {
      if (!familiarity[bucket] || !(id in familiarity[bucket])) continue;
      familiarity[bucket][id] = clamp(Math.round(Number(familiarity[bucket][id]) || 0) + gain, 0, 100);
    }
    familiarity.lastGain = {
      day: clubCalendarState().absoluteDay,
      formationId: plan.formationId,
      approachId: plan.approachId,
      engagementId: plan.engagementId,
      priorityId: plan.priorityId,
      amount: baseGain
    };
    const after = tacticalSelectedFamiliarity(plan.formationId, plan.approachId, plan.engagementId, plan.priorityId);
    return { amount: baseGain, score: after, label: tacticalFitLabel(after).label };
  }

  function clubCaptureActiveMatchPlan() {
    const snapshot = clubTacticalPlanSnapshot();
    snapshot.opponentPreparation = opponentPreparationSnapshot();
    careerState.tactics.activeMatchPlan = snapshot;
    return snapshot;
  }

  function clubActiveMatchPlan() {
    return careerState.tactics?.activeMatchPlan || clubTacticalPlanSnapshot();
  }

  function clubOpponentBriefing() {
    const opponent = typeof leagueActiveOpponentClub === 'function' ? leagueActiveOpponentClub() : null;
    const nextFixture = typeof leagueNextFixture === 'function' ? leagueNextFixture() : null;
    const scheduled = nextFixture && typeof leagueFixtureOpponentId === 'function' && typeof leagueClubById === 'function'
      ? leagueClubById(leagueFixtureOpponentId(nextFixture))
      : null;
    const target = opponent || scheduled;
    if (!target) return { name: 'UNCONFIRMED OPPOSITION', style: 'Unknown tactical profile', rating: '—', detail: 'Select a league or exhibition opponent to populate the briefing.' };
    const roster = Array.isArray(target.roster) ? target.roster : (Array.isArray(target.squad) ? target.squad : []);
    const roleCounts = roster.reduce((counts, player) => {
      const role = teamRoleById(player.role).name;
      counts[role] = (counts[role] || 0) + 1;
      return counts;
    }, {});
    const mainRole = Object.entries(roleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'FLEX';
    return {
      name: target.name,
      style: target.style || `${mainRole} emphasis`,
      rating: Math.round(Number(target.rating) || (roster.length ? roster.reduce((sum, p) => sum + teamPlayerOverall(p), 0) / roster.length : 0)),
      detail: `${mainRole} emphasis · ${roster.length || 5}-player registered roster`
    };
  }

  const OPPONENT_FIXTURE_DRILLS = Object.freeze({
    'protect-opening': { id: 'protect-opening', name: 'PROTECT THE OPENING CONTACT', short: 'OPENING CONTROL', detail: 'Keep the first engagement supported and avoid gifting an isolated early elimination.', route: 'tactics' },
    'range-discipline': { id: 'range-discipline', name: 'FIGHT AT EFFECTIVE RANGE', short: 'RANGE DISCIPLINE', detail: 'Use movement and route selection to keep contacts inside the useful distance of the equipped weapons.', route: 'loadout' },
    'trade-timing': { id: 'trade-timing', name: 'ARRIVE FOR THE TRADE', short: 'TRADE TIMING', detail: 'Keep a second operator close enough to answer the first contact without sharing the same firing lane.', route: 'training' },
    'maintain-spacing': { id: 'maintain-spacing', name: 'MAINTAIN SEPARATE LANES', short: 'LANE SPACING', detail: 'Preserve support while reducing team-mate movement and firing obstruction.', route: 'tactics' },
    'track-wide-routes': { id: 'track-wide-routes', name: 'TRACK WIDE ROTATIONS', short: 'ROTATION AWARENESS', detail: 'Hold central information and react to wide pressure without sending the whole team after one route.', route: 'training' },
    'take-territory': { id: 'take-territory', name: 'TAKE USEFUL TERRITORY', short: 'CONTROLLED ADVANCE', detail: 'Claim useful space before a cautious opponent can settle into prepared angles.', route: 'tactics' }
  });

  let opponentPreparationAdvancedOpen = false;

  function opponentPreparationTargetClub() {
    const active = typeof leagueActiveOpponentClub === 'function' ? leagueActiveOpponentClub() : null;
    const fixture = typeof leagueNextFixture === 'function' ? leagueNextFixture() : null;
    const scheduled = fixture && typeof leagueFixtureOpponentId === 'function' && typeof leagueClubById === 'function'
      ? leagueClubById(leagueFixtureOpponentId(fixture))
      : null;
    // Match preparation belongs to the scheduled career fixture. A transient
    // exhibition/deployment opponent must not replace the club shown elsewhere in HQ.
    return scheduled || active || null;
  }

  function opponentPreparationConfidence(depth) {
    const value = clamp(Math.round(Number(depth) || 0), 0, 100);
    if (value >= 82) return { label: 'COMPREHENSIVE', tone: 'strong', detail: 'The likely shape, individual threat and vulnerability are well supported.' };
    if (value >= 65) return { label: 'STRONG', tone: 'sound', detail: 'The tactical read is useful, but individual and route details may still change.' };
    if (value >= 45) return { label: 'DEVELOPING', tone: 'workable', detail: 'The broad identity is visible; exact responsibilities and weaknesses remain uncertain.' };
    return { label: 'LIMITED', tone: 'warning', detail: 'This is mainly a public-information baseline. Treat specific counters as provisional.' };
  }

  function opponentPreparationRouteRead(identity) {
    if (identity.priority === 'flank' || identity.formation === 'wide') return 'WIDE ROTATIONS · SIDE LANES';
    if (identity.priority === 'hold' || identity.formation === 'defensive') return 'PREPARED ANGLES · HELD GROUND';
    if (identity.formation === 'pressure' || identity.approach === 'aggressive') return 'FAST CENTRAL CONTACT · EARLY ENTRY';
    if (identity.formation === 'control') return 'CENTRAL CONTROL · LAYERED SUPPORT';
    return 'MIXED ROUTES · ADAPTIVE CONTACT';
  }

  function opponentActiveFiveRangeRead() {
    const lineup = clubWorkflowSquad().slice(0, TEAM_REQUIRED_STARTERS);
    const counts = { short: 0, balanced: 0, long: 0 };
    for (const player of lineup) {
      const weapon = getCareerWeapon(typeof careerPlayerActiveWeaponId === 'function' ? careerPlayerActiveWeaponId(player) : (player?.equippedWeaponId || 'scrap-p12'));
      const label = String(weaponRangeDescriptor(weapon).label || '').toUpperCase();
      if (label.includes('SHORT')) counts.short++;
      else if (label.includes('LONG')) counts.long++;
      else counts.balanced++;
    }
    const dominant = counts.long > counts.short && counts.long >= counts.balanced ? 'LONG' : counts.short > counts.long && counts.short >= counts.balanced ? 'SHORT' : 'MIXED';
    return { ...counts, dominant, total: lineup.length };
  }

  function opponentPreparationRead() {
    const club = opponentPreparationTargetClub();
    if (!club) return null;
    const report = typeof oppositionReportForClub === 'function' ? oppositionReportForClub(club) : null;
    const depth = clamp(Math.round(Number(report?.depth) || (typeof OPPOSITION_PUBLIC_REPORT_DEPTH === 'number' ? OPPOSITION_PUBLIC_REPORT_DEPTH : 22)), 0, 100);
    const confidence = opponentPreparationConfidence(depth);
    const identity = typeof oppositionIdentityForClub === 'function' ? oppositionIdentityForClub(club, 1) : { name: club.style || 'BALANCED FUNDAMENTALS', formation: 'balanced', approach: 'balanced', engagement: 'mixed', priority: 'trade', strengths: [], vulnerabilities: [] };
    const roster = Array.isArray(club.roster) ? club.roster : (Array.isArray(club.squad) ? club.squad : []);
    const ranked = roster.slice().sort((a, b) => teamPlayerOverall(b) - teamPlayerOverall(a));
    const keyPlayer = ranked[0] || null;
    const weakestPlayer = ranked[ranked.length - 1] || null;
    const ownRange = opponentActiveFiveRangeRead();
    let rangeMatchup = depth >= 50
      ? `YOUR ACTIVE FIVE LEANS ${ownRange.dominant} · OPPONENT EXPECTED ${String(identity.engagement || 'mixed').toUpperCase()}`
      : `YOUR ACTIVE FIVE LEANS ${ownRange.dominant} · OPPONENT RANGE UNCONFIRMED`;
    let rangeDetail = depth >= 50
      ? 'A mixed spread gives the manager several viable route choices.'
      : 'The report is not deep enough to tailor weapon distances to the opponent. Retain flexible routes until contact confirms the range.';
    if (depth >= 50 && identity.engagement === 'long' && ownRange.short >= 3) rangeDetail = 'Three or more short-range loadouts will need covered routes to avoid repeated long-lane disadvantages.';
    else if (depth >= 50 && identity.engagement === 'close' && ownRange.long >= 3) rangeDetail = 'The opponent wants compact contact; preserve distance so long-range weapons keep their value.';
    else if (depth >= 50 && identity.engagement === 'close') rangeDetail = 'Deny easy close contact and avoid stacking the whole line-up in one narrow route.';
    else if (depth >= 50 && identity.engagement === 'long') rangeDetail = 'Either contest with accurate weapons or deliberately close distance through covered lanes.';
    return {
      club,
      clubId: String(club.id || ''),
      name: club.name || 'UNCONFIRMED OPPOSITION',
      report,
      depth,
      confidence,
      identity,
      expectedFormation: String(identity.formation || 'balanced').toUpperCase(),
      expectedApproach: String(identity.approach || 'balanced').toUpperCase(),
      expectedEngagement: String(identity.engagement || 'mixed').toUpperCase(),
      expectedPriority: String(identity.priority || 'trade').toUpperCase(),
      expectedRoute: opponentPreparationRouteRead(identity),
      keyPlayer,
      weakestPlayer,
      rangeMatchup,
      rangeDetail,
      keyThreat: depth >= 82 && keyPlayer ? `${keyPlayer.name} · ${teamRoleById(keyPlayer.role).name} · ${teamPlayerOverall(keyPlayer)} OVR` : depth >= 58 ? String(identity.strengths?.[0] || 'Team strength still under review') : 'INDIVIDUAL THREAT NOT YET CONFIRMED',
      vulnerability: depth >= 70 ? String(identity.vulnerabilities?.[0] || 'No confirmed vulnerability') : 'VULNERABILITY NOT YET CONFIRMED',
      weaknessDetail: depth >= 70 ? String((identity.vulnerabilities || []).join(' · ')) : 'The report is not deep enough to present a weakness as fact.'
    };
  }

  function opponentDirectCounterPlan(identity) {
    if (identity.approach === 'aggressive' || identity.engagement === 'close') return { id: 'direct-counter', title: 'ABSORB & PUNISH', formationId: 'defensive', approachId: 'cautious', engagementId: 'long', priorityId: 'hold', upside: 'Protects the opening and asks their first entry to cross prepared sightlines.', risk: 'May concede early territory and can become passive if the first pressure never arrives.' };
    if (identity.engagement === 'long' || identity.priority === 'hold') return { id: 'direct-counter', title: 'BREAK THE SIGHTLINE', formationId: 'wide', approachId: 'balanced', engagementId: 'close', priorityId: 'flank', upside: 'Uses covered routes and multiple angles to reduce the value of static long-range positions.', risk: 'Wide operators can become isolated if central support moves too slowly.' };
    if (identity.priority === 'flank' || identity.formation === 'wide') return { id: 'direct-counter', title: 'HOLD THE CENTRE', formationId: 'control', approachId: 'balanced', engagementId: 'mixed', priorityId: 'group', upside: 'Keeps central support intact and punishes isolated wide operators instead of chasing every rotation.', risk: 'A compact response can surrender an uncontested outer route.' };
    if (identity.formation === 'control' || identity.priority === 'group') return { id: 'direct-counter', title: 'DISRUPT THE SHAPE', formationId: 'pressure', approachId: 'aggressive', engagementId: 'mixed', priorityId: 'trade', upside: 'Challenges their support structure before it settles and keeps a second operator ready to trade.', risk: 'Early pressure can overextend a line-up with weak Handling, Mobility or readiness.' };
    return { id: 'direct-counter', title: 'CONTROL THE FIRST CONTACT', formationId: 'control', approachId: 'balanced', engagementId: 'mixed', priorityId: 'trade', upside: 'Uses stable information and support to make the opening engagement easier to read.', risk: 'A measured plan may give a specialist opponent time to establish its preferred shape.' };
  }

  let opponentResponsePlanCache = { key: '', plans: [] };

  function opponentResponsePlanCacheKey(preparation) {
    const tactics = clubWorkflowTactics();
    const lineup = clubWorkflowSquad().slice(0, TEAM_REQUIRED_STARTERS).map(player => {
      const stats = TACTICAL_CORE_STATS.map(key => Math.round(Number(player.stats?.[key]) || 0)).join('.');
      const weapon = typeof careerPlayerActiveWeaponId === 'function' ? careerPlayerActiveWeaponId(player) : (player?.equippedWeaponId || 'none');
      return `${player.id}:${clubMatchRoleForPlayer(player).id}:${weapon}:${teamReadinessScore(player)}:${stats}`;
    }).join('|');
    const familiarity = clubTacticsState().familiarity || {};
    const familiarityKey = ['formation', 'approach', 'engagement', 'priority'].map(bucket => Object.values(familiarity[bucket] || {}).join('.')).join('/');
    return `${preparation?.clubId || 'none'}:${preparation?.depth || 0}:${tactics.formationId}:${tactics.approachId}:${tactics.engagementId}:${tactics.priorityId}:${lineup}:${familiarityKey}`;
  }

  function opponentBestFitPlan() {
    const formations = Object.keys(CLUB_FORMATIONS);
    const approaches = Object.keys(CLUB_APPROACHES);
    const engagements = Object.keys(CLUB_ENGAGEMENTS);
    const priorities = Object.keys(CLUB_PRIORITIES);
    let best = null;
    for (const formationId of formations) for (const approachId of approaches) for (const engagementId of engagements) for (const priorityId of priorities) {
      const report = clubTacticalSuitabilityReport({ formationId, approachId, engagementId, priorityId });
      if (!best || report.overall > best.fit || (report.overall === best.fit && report.matchup.score > best.matchup)) {
        best = { formationId, approachId, engagementId, priorityId, fit: report.overall, matchup: report.matchup.score };
      }
    }
    return { id: 'squad-strength', title: 'PLAY TO OUR STRENGTH', ...(best || { formationId: 'balanced', approachId: 'balanced', engagementId: 'mixed', priorityId: 'trade', fit: 50, matchup: 50 }), upside: 'Uses the tactical combination this Active Five can execute most cleanly.', risk: 'It may not attack the opponent’s clearest weakness as directly as the specialist counter.' };
  }

  function opponentFlexiblePlan() {
    const current = clubWorkflowTactics();
    return { id: 'controlled-flex', title: 'CONTROLLED FLEX', formationId: CLUB_FORMATIONS[current.formationId] ? current.formationId : 'balanced', approachId: 'balanced', engagementId: 'mixed', priorityId: 'trade', upside: 'Keeps a familiar base while retaining enough range and tempo flexibility to react during the match.', risk: 'A broad plan can lack the decisive advantage of a well-executed specialist response.' };
  }

  function opponentResponsePlanCandidates(preparation = opponentPreparationRead()) {
    if (!preparation) return [];
    const cacheKey = opponentResponsePlanCacheKey(preparation);
    if (opponentResponsePlanCache.key === cacheKey && opponentResponsePlanCache.plans.length === 3) return opponentResponsePlanCache.plans;
    const planningIdentity = preparation.depth >= 50
      ? preparation.identity
      : { ...OPPOSITION_IDENTITIES.BALANCED, name: preparation.identity.name, summary: preparation.identity.summary };
    const source = [opponentDirectCounterPlan(planningIdentity), opponentBestFitPlan(), opponentFlexiblePlan()];
    const seen = new Set();
    const plans = source.map((sourcePlan, index) => {
      let plan = { ...sourcePlan };
      let key = `${plan.formationId}/${plan.approachId}/${plan.engagementId}/${plan.priorityId}`;
      if (seen.has(key) && index === 2) {
        plan = { ...plan, formationId: 'balanced', approachId: 'balanced', engagementId: 'mixed', priorityId: preparation.depth >= 50 && preparation.identity.priority === 'flank' ? 'group' : 'trade' };
        key = `${plan.formationId}/${plan.approachId}/${plan.engagementId}/${plan.priorityId}`;
      }
      seen.add(key);
      const report = clubTacticalSuitabilityReport(plan);
      return { ...plan, fit: report.overall, matchup: report.matchup?.score || 50, executionPercent: report.executionPercent };
    });
    const recommended = plans.slice().sort((a, b) => {
      const aScore = preparation.depth >= 50 ? a.fit + a.matchup * 0.25 : a.fit;
      const bScore = preparation.depth >= 50 ? b.fit + b.matchup * 0.25 : b.fit;
      return bScore - aScore;
    })[0];
    opponentResponsePlanCache = { key: cacheKey, plans: plans.map(plan => ({ ...plan, recommended: plan.id === recommended?.id })) };
    return opponentResponsePlanCache.plans;
  }

  function opponentResponsePlanAdjusted(plan, tactics = clubWorkflowTactics()) {
    if (!plan) return false;
    return plan.formationId !== tactics.formationId || plan.approachId !== tactics.approachId || plan.engagementId !== tactics.engagementId || plan.priorityId !== tactics.priorityId;
  }

  function opponentFixtureDrillCandidates(preparation = opponentPreparationRead()) {
    if (!preparation) return [];
    const ids = [];
    const push = id => { if (OPPONENT_FIXTURE_DRILLS[id] && !ids.includes(id)) ids.push(id); };
    // Until the report reaches the same disclosure threshold as the tactical read,
    // offer general preparation rather than leaking the hidden identity through drill ordering.
    if (preparation.depth < 50) {
      for (const fallbackId of ['protect-opening', 'range-discipline', 'trade-timing', 'maintain-spacing']) push(fallbackId);
      return ids.map(id => OPPONENT_FIXTURE_DRILLS[id]);
    }
    if (preparation.identity.approach === 'aggressive' || preparation.identity.engagement === 'close') { push('protect-opening'); push('maintain-spacing'); }
    if (preparation.identity.engagement === 'long') { push('range-discipline'); push('take-territory'); }
    if (preparation.identity.priority === 'flank' || preparation.identity.formation === 'wide') { push('track-wide-routes'); push('maintain-spacing'); }
    if (preparation.identity.priority === 'trade' || preparation.identity.formation === 'control') push('trade-timing');
    for (const fallbackId of ['protect-opening', 'range-discipline', 'trade-timing', 'maintain-spacing', 'track-wide-routes', 'take-territory']) push(fallbackId);
    return ids.slice(0, 4).map(id => OPPONENT_FIXTURE_DRILLS[id]);
  }

  function opponentSelectedResponsePlan(preparation = opponentPreparationRead()) {
    const prep = clubMatchPrepState();
    return opponentResponsePlanCandidates(preparation).find(item => item.id === prep.selectedResponseId) || null;
  }

  // Build 12.133: warn once before a manager action replaces or fine-tunes the
  // scout-recommended response they already applied. Acknowledgement is session
  // state only, so it never touches the career save schema, and it resets
  // whenever the recommendation is (re)selected so the warning stays truthful
  // without nagging on every subsequent control change.
  let matchdayRecommendedPlanAcknowledged = '';
  let matchdayPendingPlanChange = null;

  function matchdayRecommendedPlanInPlay() {
    if (menuContext === 'pause' || appState === 'match') return null;
    const preparation = opponentPreparationRead();
    const plans = opponentResponsePlanCandidates(preparation);
    const recommended = plans.find(item => item.recommended) || plans[0] || null;
    if (!recommended) return null;
    const prep = clubMatchPrepState();
    if (prep.selectedResponseId !== recommended.id) return null;
    // Already fine-tuned away from the template: there is no intact
    // recommendation left to protect.
    if (opponentResponsePlanAdjusted(recommended)) return null;
    return recommended;
  }

  function matchdayPlanChangeWarningCopy(kind, detail, recommended) {
    if (kind === 'response') {
      const plans = opponentResponsePlanCandidates();
      const target = plans.find(item => item.id === detail.planId) || null;
      return {
        title: 'REPLACE THE RECOMMENDED PLAN?',
        body: `${recommended.title} is currently applied exactly as the scout recommended it. Selecting ${target?.title || 'another response'} replaces the staged formation, approach, range and priority.`
      };
    }
    return {
      title: 'FINE-TUNE THE RECOMMENDED PLAN?',
      body: `${recommended.title} is currently applied exactly as the scout recommended it. Changing this control fine-tunes the plan, so it will no longer match the recommendation.`
    };
  }

  function matchdayGuardRecommendedPlanChange(kind, detail = {}, returnFocus = null) {
    if (typeof openTeamNoteModal !== 'function') return false;
    const recommended = matchdayRecommendedPlanInPlay();
    if (!recommended) return false;
    // Re-selecting the same recommendation changes nothing, so never warn.
    if (kind === 'response' && detail.planId === recommended.id) return false;
    if (kind === 'tactics' && recommended[detail.field] === detail.value) return false;
    if (matchdayRecommendedPlanAcknowledged === recommended.id) return false;

    matchdayPendingPlanChange = { kind, detail: { ...detail }, planId: recommended.id, returnFocus };
    const copy = matchdayPlanChangeWarningCopy(kind, detail, recommended);
    const actionsHtml = '<footer class="team-note-management-actions matchday-plan-warning-actions"><button type="button" data-matchday-plan-warning="keep">KEEP RECOMMENDED</button><button type="button" class="primary" data-matchday-plan-warning="proceed">CHANGE ANYWAY</button></footer>';
    openTeamNoteModal({
      kicker: 'SCOUT RECOMMENDATION APPLIED',
      title: copy.title,
      body: copy.body,
      footer: 'Nothing is saved yet. Continuing will not warn again until you re-apply the recommendation.',
      tone: 'warning', mode: 'management', glyph: '!', actionsHtml,
      dismissHint: 'CHOOSE AN OPTION TO CONTINUE',
      returnFocus
    });
    return true;
  }

  function matchdayApplyPendingPlanChange() {
    const pending = matchdayPendingPlanChange;
    matchdayPendingPlanChange = null;
    if (!pending) return false;
    matchdayRecommendedPlanAcknowledged = pending.planId;
    if (pending.kind === 'response') {
      const applied = clubSelectOpponentResponsePlan(pending.detail.planId);
      showStatus(applied ? 'OPPONENT RESPONSE STAGED · SAVE CHANGES' : 'UNABLE TO STAGE RESPONSE');
      return true;
    }
    const { field, value } = pending.detail;
    if (typeof workflowSetTacticsField === 'function') workflowSetTacticsField(field, value);
    else { clubTacticsState()[field] = value; saveCareerState(); updateMenuUI(); }
    showStatus('RECOMMENDED PLAN FINE-TUNED · SAVE CHANGES');
    return true;
  }

  function handleMatchdayPlanWarningAction(event) {
    const button = event.target.closest?.('[data-matchday-plan-warning]');
    if (!button) return false;
    const keep = button.dataset.matchdayPlanWarning === 'keep';
    if (keep) {
      matchdayPendingPlanChange = null;
      closeTeamNoteModal({ restoreFocus: true });
      showStatus('RECOMMENDED PLAN RETAINED');
      return true;
    }
    closeTeamNoteModal({ restoreFocus: false });
    matchdayApplyPendingPlanChange();
    return true;
  }

  function clubSelectOpponentResponsePlan(id) {
    const preparation = opponentPreparationRead();
    const plan = opponentResponsePlanCandidates(preparation).find(item => item.id === id);
    if (!plan || menuContext === 'pause' || appState === 'match') return false;
    const prep = clubMutableMatchPrepState();
    if (typeof workflowSetTacticsField === 'function') {
      workflowSetTacticsField('formationId', plan.formationId, { render: false });
      workflowSetTacticsField('approachId', plan.approachId, { render: false });
      workflowSetTacticsField('engagementId', plan.engagementId, { render: false });
      workflowSetTacticsField('priorityId', plan.priorityId, { render: false });
    } else {
      Object.assign(clubTacticsState(), { formationId: plan.formationId, approachId: plan.approachId, engagementId: plan.engagementId, priorityId: plan.priorityId });
    }
    prep.briefingReviewed = true;
    prep.planConfirmed = false;
    prep.lineupSignature = '';
    prep.opponentId = preparation?.clubId || '';
    prep.selectedResponseId = plan.id;
    prep.opponentDepthAtReview = preparation?.depth || 0;
    delete prep.invalidatedReason;
    // Re-applying the recommendation restores an intact scout plan, so the
    // change warning becomes relevant again.
    if (plan.recommended) matchdayRecommendedPlanAcknowledged = '';
    saveCareerState();
    updateMenuUI();
    return true;
  }

  function clubToggleOpponentFixtureDrill(id) {
    if (!OPPONENT_FIXTURE_DRILLS[id] || menuContext === 'pause' || appState === 'match') return false;
    const prep = clubMutableMatchPrepState();
    const selected = Array.isArray(prep.fixtureDrills) ? prep.fixtureDrills.slice(0, 2) : [];
    const index = selected.indexOf(id);
    if (index >= 0) selected.splice(index, 1);
    else if (selected.length < 2) selected.push(id);
    else return false;
    prep.fixtureDrills = selected;
    prep.planConfirmed = false;
    prep.lineupSignature = '';
    saveCareerState();
    updateMenuUI();
    return true;
  }

  function opponentPreparationSnapshot() {
    const preparation = opponentPreparationRead();
    if (!preparation) return null;
    const prep = clubMatchPrepState();
    const response = opponentSelectedResponsePlan(preparation);
    const currentTactics = clubWorkflowTactics();
    const responseAdjusted = opponentResponsePlanAdjusted(response, currentTactics);
    const drills = (prep.fixtureDrills || []).map(id => OPPONENT_FIXTURE_DRILLS[id]).filter(Boolean).map(item => ({ ...item }));
    const customReport = response ? null : clubTacticalSuitabilityReport();
    const planRevealed = preparation.depth >= 50;
    return {
      opponentId: preparation.clubId,
      opponentName: preparation.name,
      reportDepth: preparation.depth,
      confidenceLabel: preparation.confidence.label,
      identityName: preparation.identity.name,
      planRevealed,
      expectedFormation: planRevealed ? preparation.expectedFormation : 'UNCONFIRMED',
      expectedApproach: planRevealed ? preparation.expectedApproach : 'UNCONFIRMED',
      expectedEngagement: planRevealed ? preparation.expectedEngagement : 'UNCONFIRMED',
      expectedPriority: planRevealed ? preparation.expectedPriority : 'UNCONFIRMED',
      expectedRoute: planRevealed ? preparation.expectedRoute : 'ROUTES NOT YET CONFIRMED',
      keyThreat: preparation.keyThreat,
      vulnerability: preparation.vulnerability,
      rangeMatchup: preparation.rangeMatchup,
      response: response ? { id: response.id, title: response.title, upside: response.upside, risk: response.risk, fit: response.fit, matchup: response.matchup, formationId: response.formationId, approachId: response.approachId, engagementId: response.engagementId, priorityId: response.priorityId, adjusted: responseAdjusted } : { id: 'custom', title: 'CUSTOM MANAGER PLAN', upside: 'The manager retained a manually configured match plan.', risk: 'No named response template was selected for the debrief comparison.', fit: customReport?.overall || 50, matchup: customReport?.matchup?.score || 50, adjusted: false },
      fixtureDrills: drills
    };
  }

  function renderOpponentSpecificPreparationPanel() {
    const preparation = opponentPreparationRead();
    if (!preparation) return '';
    const prep = clubMatchPrepState();
    const plans = opponentResponsePlanCandidates(preparation);
    const drills = opponentFixtureDrillCandidates(preparation);
    const selectedPlan = plans.find(item => item.id === prep.selectedResponseId) || null;
    const recommendedPlan = plans.find(item => item.recommended) || plans[0] || null;
    const selectedPlanAdjusted = opponentResponsePlanAdjusted(selectedPlan);
    const selectedDrills = new Set(prep.fixtureDrills || []);
    const recommendedDrill = drills[0] || null;
    const recommendedDrillSelected = Boolean(recommendedDrill && selectedDrills.has(recommendedDrill.id));
    const revealPlan = preparation.depth >= 50;
    const recommendationSelected = Boolean(recommendedPlan && selectedPlan?.id === recommendedPlan.id);
    const recommendationAdjusted = Boolean(recommendationSelected && opponentResponsePlanAdjusted(recommendedPlan));
    const recommendationButton = recommendationSelected
      ? (recommendationAdjusted ? 'RESET TO RECOMMENDED' : 'RECOMMENDED PLAN SELECTED')
      : 'USE RECOMMENDED PLAN';
    const drillButton = recommendedDrillSelected
      ? 'REMOVE FOCUS'
      : selectedDrills.size >= 2
        ? 'TWO FOCUSES SELECTED'
        : 'ADD MATCH FOCUS';
    const responseCards = plans.map(plan => `<article class="opponent-response-card ${prep.selectedResponseId === plan.id ? 'selected' : ''} ${plan.recommended ? 'recommended' : ''}">
      <header><div><span>${plan.recommended ? 'SCOUT RECOMMENDATION' : 'VIABLE RESPONSE'}</span><strong>${escapeCareerHtml(plan.title)}</strong></div>${tacticalFitBadgeMarkup(plan.fit, false)}</header>
      <div class="opponent-response-settings"><span>${escapeCareerHtml(CLUB_FORMATIONS[plan.formationId]?.short || plan.formationId)}</span><span>${escapeCareerHtml(CLUB_APPROACHES[plan.approachId]?.name || plan.approachId)}</span><span>${escapeCareerHtml(CLUB_ENGAGEMENTS[plan.engagementId]?.name || plan.engagementId)}</span><span>${escapeCareerHtml(CLUB_PRIORITIES[plan.priorityId]?.name || plan.priorityId)}</span></div>
      <p><b>UPSIDE</b> ${escapeCareerHtml(plan.upside)}</p><p class="risk"><b>RISK</b> ${escapeCareerHtml(plan.risk)}</p>
      <button type="button" class="${prep.selectedResponseId === plan.id ? 'selected' : plan.recommended ? 'primary' : ''}" data-opponent-response-plan="${escapeCareerHtml(plan.id)}">${prep.selectedResponseId === plan.id ? (selectedPlanAdjusted ? 'SELECTED · FINE-TUNED BELOW' : 'SELECTED · EDIT BELOW') : 'SELECT THIS RESPONSE'}</button>
    </article>`).join('');
    const drillCards = drills.map(drill => `<button type="button" class="opponent-drill-card ${selectedDrills.has(drill.id) ? 'selected' : ''}" data-opponent-fixture-drill="${escapeCareerHtml(drill.id)}" aria-pressed="${selectedDrills.has(drill.id) ? 'true' : 'false'}"><span>${selectedDrills.has(drill.id) ? 'SELECTED FIXTURE DRILL' : 'OPTIONAL FIXTURE DRILL'}</span><strong>${escapeCareerHtml(drill.name)}</strong><small>${escapeCareerHtml(drill.detail)}</small><b>${selectedDrills.has(drill.id) ? 'REMOVE' : selectedDrills.size >= 2 ? 'TWO SELECTED' : 'ADD DRILL'}</b></button>`).join('');
    const recommendedPlanMarkup = recommendedPlan ? `<article class="opponent-preparation-recommendation ${recommendationSelected ? 'selected' : ''}">
        <header><div><span>${recommendationSelected ? 'CURRENT RESPONSE' : 'SCOUT RECOMMENDATION'}</span><strong>${escapeCareerHtml(recommendedPlan.title)}</strong></div>${tacticalFitBadgeMarkup(recommendedPlan.fit, false)}</header>
        <div class="opponent-response-settings"><span>${escapeCareerHtml(CLUB_FORMATIONS[recommendedPlan.formationId]?.short || recommendedPlan.formationId)}</span><span>${escapeCareerHtml(CLUB_APPROACHES[recommendedPlan.approachId]?.name || recommendedPlan.approachId)}</span><span>${escapeCareerHtml(CLUB_ENGAGEMENTS[recommendedPlan.engagementId]?.name || recommendedPlan.engagementId)}</span><span>${escapeCareerHtml(CLUB_PRIORITIES[recommendedPlan.priorityId]?.name || recommendedPlan.priorityId)}</span></div>
        <p>${escapeCareerHtml(recommendedPlan.upside)}</p>
        <small><b>Risk:</b> ${escapeCareerHtml(recommendedPlan.risk)}</small>
        <button type="button" class="primary ${recommendationSelected && !recommendationAdjusted ? 'selected' : ''}" data-opponent-response-plan="${escapeCareerHtml(recommendedPlan.id)}" ${recommendationSelected && !recommendationAdjusted ? 'disabled' : ''}>${recommendationButton}</button>
      </article>` : '';
    const recommendedDrillMarkup = recommendedDrill ? `<article class="opponent-preparation-focus ${recommendedDrillSelected ? 'selected' : ''}">
        <div><span>OPTIONAL MATCH FOCUS</span><strong>${escapeCareerHtml(recommendedDrill.name)}</strong><p>${escapeCareerHtml(recommendedDrill.detail)}</p></div>
        <button type="button" data-opponent-fixture-drill="${escapeCareerHtml(recommendedDrill.id)}" aria-pressed="${recommendedDrillSelected ? 'true' : 'false'}" ${!recommendedDrillSelected && selectedDrills.size >= 2 ? 'disabled' : ''}>${drillButton}</button>
      </article>` : '';
    return `<section class="opponent-preparation-panel opponent-preparation-streamlined ${escapeCareerHtml(preparation.confidence.tone)}" data-management-target-id="tactics:opponent-preparation">
      <header><div><span>OPPONENT PREPARATION</span><strong>${escapeCareerHtml(preparation.name)} · ${escapeCareerHtml(preparation.identity.name)}</strong><small>${preparation.depth}% scouting confidence · ${escapeCareerHtml(preparation.confidence.label)}. Use the recommendation immediately or open the full report only when you need more control.</small></div><aside><span>CURRENT RESPONSE</span><strong>${escapeCareerHtml(selectedPlan?.title || 'NOT SELECTED')}</strong><small>${selectedPlanAdjusted ? 'Manager fine-tuning active · ' : ''}${(prep.fixtureDrills || []).length} / 2 match focuses selected</small></aside></header>
      <div class="opponent-preparation-meter" aria-label="Opposition scouting confidence ${preparation.depth} percent"><i style="width:${preparation.depth}%"></i></div>
      <div class="opponent-preparation-quick">
        <article class="opponent-preparation-quick-read">
          <span>QUICK READ</span><strong>${escapeCareerHtml(preparation.identity.name)}</strong><p>${escapeCareerHtml(preparation.identity.summary || 'Opponent pattern analysis is in progress.')}</p>
          <dl><div><dt>Watch for</dt><dd>${escapeCareerHtml(preparation.keyThreat)}</dd></div><div><dt>Possible opening</dt><dd>${escapeCareerHtml(preparation.vulnerability)}</dd></div></dl>
        </article>
        ${recommendedPlanMarkup}
        ${recommendedDrillMarkup}
      </div>
      <button type="button" class="opponent-preparation-disclosure" data-opponent-preparation-details aria-expanded="${opponentPreparationAdvancedOpen ? 'true' : 'false'}">${opponentPreparationAdvancedOpen ? 'HIDE FULL ANALYSIS' : 'VIEW FULL ANALYSIS & ALTERNATIVES'} <span aria-hidden="true">${opponentPreparationAdvancedOpen ? '−' : '+'}</span></button>
      <div class="opponent-preparation-advanced" ${opponentPreparationAdvancedOpen ? '' : 'hidden'}>
        <div class="opponent-preparation-facts">
          <article><span>EXPECTED SHAPE</span><strong>${revealPlan ? `${escapeCareerHtml(preparation.expectedFormation)} · ${escapeCareerHtml(preparation.expectedApproach)}` : 'DEVELOPING REPORT'}</strong><p>${revealPlan ? `${escapeCareerHtml(preparation.expectedEngagement)} RANGE · ${escapeCareerHtml(preparation.expectedPriority)} PRIORITY` : 'The scout will not present an exact formation and tempo as fact at this depth.'}</p></article>
          <article><span>LIKELY ROUTE PATTERN</span><strong>${revealPlan ? escapeCareerHtml(preparation.expectedRoute) : 'ROUTES NOT YET CONFIRMED'}</strong><p>${escapeCareerHtml(preparation.identity.summary || 'Opponent pattern analysis is in progress.')}</p></article>
          <article><span>KEY THREAT</span><strong>${escapeCareerHtml(preparation.keyThreat)}</strong><p>${escapeCareerHtml(preparation.depth >= 58 ? (preparation.identity.strengths || []).join(' · ') : 'Continue opposition observation to identify the most dangerous responsibility.')}</p></article>
          <article><span>POSSIBLE WEAKNESS</span><strong>${escapeCareerHtml(preparation.vulnerability)}</strong><p>${escapeCareerHtml(preparation.weaknessDetail)}</p></article>
          <article class="wide"><span>WEAPON-RANGE MATCHUP</span><strong>${escapeCareerHtml(preparation.rangeMatchup)}</strong><p>${escapeCareerHtml(preparation.rangeDetail)}</p></article>
        </div>
        <div class="career-section-head compact"><div><span>ALTERNATIVE RESPONSES</span><strong>CHOOSE A DIFFERENT PLAN OR FINE-TUNE BELOW</strong></div><p>Response templates stage the existing formation, approach, range and priority controls. They never apply a hidden result bonus.</p></div>
        <div class="opponent-response-grid">${responseCards}</div>
        <div class="career-section-head compact opponent-drill-head"><div><span>OPTIONAL DEBRIEF FOCUSES</span><strong>SELECT UP TO TWO</strong></div><p>These focuses tell the post-match review what evidence to highlight; they do not grant invisible attributes.</p></div>
        <div class="opponent-drill-grid">${drillCards}</div>
      </div>
    </section>`;
  }

  function renderMatchPreparationPanel() {
    if (!careerState.created || menuContext === 'pause') return '';
    const prep = clubMatchPrepState();
    const ready = careerSquadReady();
    const planConfirmed = clubMatchPlanConfirmed();
    const opponent = clubOpponentBriefing();
    const preparation = opponentPreparationRead();
    const suitability = clubTacticalSuitabilityReport();
    const steps = [
      { id: 'briefing', label: 'OPPOSITION PREPARATION', complete: prep.briefingReviewed, detail: preparation ? `${preparation.name} · ${preparation.depth}% confidence${prep.selectedResponseId ? ` · ${opponentSelectedResponsePlan(preparation)?.title || 'CUSTOM PLAN'}` : ''}` : `${opponent.name} · ${opponent.style}`, action: 'review-briefing', button: prep.briefingReviewed ? 'REVIEW AGAIN' : 'OPEN PREPARATION' },
      { id: 'lineup', label: 'ACTIVE FIVE OPERATORS', complete: ready, detail: ready ? `${clubLineupSignature().split('|').length} operators submitted` : `${careerState.squad.length} / ${TEAM_REQUIRED_STARTERS} signed`, route: ready ? 'operators' : 'market', button: ready ? 'REVIEW SQUAD' : 'RECRUIT' },
      { id: 'plan', label: 'TACTICAL PLAN', complete: planConfirmed, detail: `${clubApproach().name} · ${clubEngagementPlan().name} · ${suitability.overall}/100 fit`, route: 'tactics', button: planConfirmed ? 'REVIEW PLAN' : 'SET TACTICS' },
      { id: 'deploy', label: 'MATCHMAKING', complete: false, detail: planConfirmed ? 'All matchday checks complete' : 'Confirm the tactical plan first', action: 'review-final-check', button: planConfirmed ? 'VIEW FINAL CHECK' : 'LOCKED', disabled: !planConfirmed }
    ];
    return `<section class="matchday-preparation-panel">
      <header><div><span>MATCHDAY WORKFLOW</span><strong>BRIEFING → LINE-UP → TACTICS → DEPLOYMENT</strong><small>Match preparation is saved for the scheduled fixture. It remains ready while days advance and is cleared only when the fixture, tactics, active five, assigned roles or loadouts change.</small></div><aside><span>OPPOSITION</span><strong>${escapeCareerHtml(opponent.name)}</strong><small>${escapeCareerHtml(opponent.detail)}</small></aside></header>
      <div class="matchday-step-grid">${steps.map((step, index) => `<article class="matchday-step ${step.complete ? 'complete' : ''} ${step.disabled ? 'locked' : ''}"><span>${String(index + 1).padStart(2, '0')}</span><div><strong>${step.label}</strong><small>${escapeCareerHtml(step.detail)}</small></div><button ${step.disabled ? 'disabled' : ''} ${step.route ? `data-team-route="${step.route}"` : `data-matchday-action="${step.action}"`}>${step.button}</button></article>`).join('')}</div>
    </section>`;
  }

  function tacticalFitBadgeMarkup(score, compact = true) {
    const fit = tacticalFitLabel(score);
    return `<span class="tactical-fit-badge ${fit.tone} ${compact ? 'compact' : ''}"><b>${Math.round(Number(score) || 0)}</b><small>${fit.label}</small></span>`;
  }

  function tacticalComponentForOverride(type, id) {
    const overrides = {};
    if (type === 'formation') overrides.formationId = id;
    else if (type === 'approach') overrides.approachId = id;
    else if (type === 'engagement') overrides.engagementId = id;
    else if (type === 'priority') overrides.priorityId = id;
    return clubTacticalSuitabilityReport(overrides)[type];
  }

  function matchdayOptionCards(items, activeId, attribute, type) {
    return Object.values(items).map(item => {
      const fit = tacticalComponentForOverride(type, item.id);
      return `<button class="club-plan-option ${item.id === activeId ? 'active' : ''}" data-${attribute}="${item.id}"><span class="club-plan-option-head"><strong>${item.name}</strong>${tacticalFitBadgeMarkup(fit.score)}</span><small>${item.description}</small><em>${escapeCareerHtml(fit.explanation || '')}</em></button>`;
    }).join('');
  }

  function renderTacticalSuitabilityPanel(report) {
    const components = [
      ['FORMATION', report.formation],
      ['APPROACH', report.approach],
      ['RANGE', report.engagement],
      ['PRIORITY', report.priority],
      ['ROLE FIT', report.roles],
      ['FAMILIARITY', report.familiarity]
    ];
    const modifier = report.executionPercent - 100;
    const modifierText = modifier > 0 ? `+${modifier}%` : `${modifier}%`;
    const rangeWarning = tacticalRangeWarningMarkup(report.engagementId);
    return `<section class="tactical-suitability-panel ${report.tone}" data-management-target-id="tactics:plan">
      <header><div><span>TACTICAL SUITABILITY</span><strong>PLAN FIT ${report.overall}/100 · ${report.label}</strong><small>Player attributes, assigned roles, weapons, readiness, familiarity and the opposition style determine how cleanly the squad executes this plan.</small></div><aside><span>LIVE EXECUTION</span><strong>${report.executionPercent}%</strong><small>${modifierText} to tactical behaviour only</small></aside></header>
      ${rangeWarning}
      <div class="tactical-fit-meter" aria-label="Tactical plan fit ${report.overall} out of 100"><i style="width:${report.overall}%"></i></div>
      <div class="tactical-component-grid">${components.map(([label, component]) => `<article class="${component.tone}"><span>${label}</span><strong>${component.score}</strong><small>${component.label}</small></article>`).join('')}</div>
      <div class="tactical-explanation-grid"><article><span>WHAT FIT CHANGES</span><p>Fit scales decision speed, coordination and how strongly the selected formation, approach, range and priority influence behaviour. It never grants hidden raw damage or ignores the operator's real attributes.</p></article><article><span>OPPOSITION MATCHUP</span><strong>${report.matchup.score >= 53 ? 'FAVOURABLE' : report.matchup.score <= 47 ? 'CHALLENGING' : 'NEUTRAL'} · ${report.matchup.score}/100</strong><p>${escapeCareerHtml(report.matchup.note)}</p></article></div>
      <div class="tactical-insight-list">${report.insights.map((item, index) => `<article><span>${String(index + 1).padStart(2, '0')}</span><p>${escapeCareerHtml(item)}</p></article>`).join('')}</div>
    </section>`;
  }

  function renderAdvancedTacticsTab() {
    ensureClubOperationsState();
    clubTacticsState();
    const assistant = clubAssistantManager();
    const formation = clubFormation();
    const workflowSquad = clubWorkflowSquad();
    const lineup = workflowSquad.slice(0, TEAM_REQUIRED_STARTERS);
    const reserves = workflowSquad.slice(TEAM_REQUIRED_STARTERS);
    const prep = clubMatchPrepState();
    const opponent = clubOpponentBriefing();
    const suitability = clubTacticalSuitabilityReport();
    const selectedOpponentResponse = opponentSelectedResponsePlan();
    const selectedArena = arenaMeta(clubWorkflowTactics().arenaId);
    const roleOptions = TEAM_ROLES.map(role => `<option value="${role.id}">${role.name}</option>`).join('');
    return `${renderClubCalendarStrip()}${typeof renderWorkflowDraftBar === 'function' ? renderWorkflowDraftBar('tactics', 'MATCH SETUP CHANGES', 'Formation, approach, range, priority, roles and the active five operators stay provisional until saved.') : ''}${renderMatchPreparationPanel()}
      <div class="menu-hero career-hero club-tactics-hero"><div class="menu-hero-main menu-briefing-panel"><div class="menu-kicker">TACTICAL MATCHDAY</div><h2>TEAM PLAN & ASSIGNED RESPONSIBILITIES</h2><p>Choose the active-operator structure, match approach, engagement distance and team priority. The fit model now measures whether the selected operators, weapons and assigned roles can execute those instructions effectively.</p><div class="menu-pill-row"><span class="menu-pill">${escapeCareerHtml(formation.name)}</span><span class="menu-pill">${clubApproach().name}</span><span class="menu-pill">${clubEngagementPlan().name}</span><span class="menu-pill">${clubTeamPriority().name}</span><span class="menu-pill">PLAN FIT ${suitability.overall}</span></div></div><div class="menu-hero-side"><div class="menu-kicker">OPPOSITION READ</div><div class="menu-side-operator">${opponent.rating}</div><p>${escapeCareerHtml(opponent.name)} · ${escapeCareerHtml(opponent.style)}</p><small>${escapeCareerHtml(suitability.matchup.note)}</small></div></div>
      ${renderOpponentSpecificPreparationPanel()}
      ${renderTacticalSuitabilityPanel(suitability)}
      <section class="club-tactics-panel"><div class="career-section-head"><div><span>TACTICAL SHAPE</span><strong>FORMATION</strong></div><p>Formation fit combines the active five operators' weighted attributes with the role coverage needed by that structure.</p></div><div class="club-formation-grid">${Object.values(CLUB_FORMATIONS).map(item => { const fit = tacticalComponentForOverride('formation', item.id); return `<button class="club-formation-card ${item.id === formation.id ? 'active' : ''}" data-club-formation="${item.id}"><span class="club-formation-card-head"><b>${escapeCareerHtml(item.short)}</b>${tacticalFitBadgeMarkup(fit.score)}</span><strong>${escapeCareerHtml(item.name)}</strong><small>${escapeCareerHtml(item.description)}</small><em>${escapeCareerHtml(fit.explanation || '')}</em></button>`; }).join('')}</div></section>
      <section class="club-plan-grid"><article><div class="career-section-head compact"><div><span>RISK & TEMPO</span><strong>TEAM APPROACH</strong></div></div><div>${matchdayOptionCards(CLUB_APPROACHES, clubApproach().id, 'club-approach', 'approach')}</div></article><article><div class="career-section-head compact"><div><span>WEAPON SPACING</span><strong>ENGAGEMENT RANGE</strong></div></div><div>${matchdayOptionCards(CLUB_ENGAGEMENTS, clubEngagementPlan().id, 'club-engagement', 'engagement')}</div></article><article><div class="career-section-head compact"><div><span>BATTLEGROUND</span><strong>MAP SELECTION · ${escapeCareerHtml(selectedArena.short)}</strong></div></div><div>${arenaOptions().map(item => `<button class="club-plan-option ${item.id === selectedArena.id ? 'active' : ''}" data-club-map="${item.id}"><span class="club-plan-option-head"><strong>${escapeCareerHtml(item.name)}</strong></span><small>${escapeCareerHtml(item.description)}</small><em>${escapeCareerHtml(item.matchmakingBlurb)}</em></button>`).join('')}</div></article><article><div class="career-section-head compact"><div><span>COLLECTIVE BEHAVIOUR</span><strong>TEAM PRIORITY</strong></div></div><div>${matchdayOptionCards(CLUB_PRIORITIES, clubTeamPriority().id, 'club-priority', 'priority')}</div></article></section>
      <section class="club-role-assignment-panel"><div class="career-section-head"><div><span>ASSIGNED RESPONSIBILITIES</span><strong>ACTIVE OPERATOR MATCH ROLES</strong></div><p>The fit score compares the operator's attributes with the selected role. Role Effectiveness then shows how completely they are expected to follow that role's tactical decisions and coordination; it does not reduce weapon damage.</p></div><div class="club-role-assignment-list">${lineup.length ? lineup.map((player, index) => { const assigned = clubMatchRoleForPlayer(player); const fit = tacticalPlayerRoleSuitability(player, assigned.id); return `<article class="role-fit-${fit.tone}"><span>${index + 1}</span><div><strong>${escapeCareerHtml(player.name)}</strong><small>NATURAL ${teamRoleById(player.role).name} · ${teamReadinessScore(player)} READY</small><em>${fit.naturalMatch ? 'NATURAL ROLE' : fit.secondaryMatch ? 'SECONDARY ROLE' : `BEST ATTRIBUTES: ${fit.strengths.join(' · ')}`}</em></div><div class="club-role-fit-readout">${tacticalFitBadgeMarkup(fit.score, false)}${tacticalRoleExecutionMarkup(fit)}</div><label><span>MATCH ROLE</span><select data-club-role-player="${player.id}">${roleOptions.replace(`value="${assigned.id}"`, `value="${assigned.id}" selected`)}</select></label></article>`; }).join('') : '<div class="team-empty-state compact"><strong>NO ACTIVE FIVE OPERATORS</strong><p>Recruit and order five operators before assigning responsibilities.</p></div>'}</div>${reserves.length ? `<div class="club-substitute-bench"><div><span>SUBSTITUTES</span><strong>AVAILABLE RESERVES</strong><small>Choose which starter a reserve should replace. The displaced player moves to the bench.</small></div>${reserves.map(player => `<article><div><strong>${escapeCareerHtml(player.name)}</strong><small>${teamRoleById(player.role).name} · ${teamReadinessScore(player)} READY</small></div><label><span>REPLACE</span><select data-club-substitute-player="${player.id}"><option value="">KEEP AS RESERVE</option>${lineup.map((starter, index) => `<option value="${index}">S${index + 1} · ${escapeCareerHtml(starter.name)}</option>`).join('')}</select></label></article>`).join('')}</div>` : ''}</section>
      <section class="club-delegation-panel"><div class="career-section-head"><div><span>RESPONSIBILITY</span><strong>ACTIVE OPERATOR SELECTION</strong></div><p>Manual selection uses Squad order. Delegation lets the assistant evaluate ability, role fit, form, fatigue, sharpness and medical status.</p></div><div class="club-delegation-actions"><button class="${clubLineupMode() === 'manual' ? 'active' : ''}" data-club-lineup-mode="manual">MANAGER SELECTS TEAM</button><button class="${clubLineupMode() === 'assistant' ? 'active' : ''} ${assistant ? '' : 'requires-staff'}" data-club-lineup-mode="assistant" data-requires-staff="${assistant ? 'false' : 'true'}" title="${assistant ? 'Delegate selection to the assistant manager' : 'Employ an assistant manager to use this option'}">ASSISTANT SELECTS TEAM</button><button class="primary ${assistant ? '' : 'requires-staff'}" data-club-action="apply-assistant" data-requires-staff="${assistant ? 'false' : 'true'}" title="${assistant ? 'Ask the assistant to select the active five operators' : 'Employ an assistant manager to use this option'}">ASK ASSISTANT TO PICK NOW</button></div></section>
      <section class="club-plan-confirm ${clubMatchPlanConfirmed() ? 'confirmed' : ''}"><div><span>${clubMatchPlanConfirmed() ? 'PLAN CONFIRMED' : 'FINAL CHECK'}</span><strong>${clubMatchPlanConfirmed() ? `MATCHMAKING CLEARED · ${suitability.executionPercent}% EXECUTION` : `CONFIRM THE MATCH PLAN · ${suitability.overall}/100 FIT`}</strong><small>${prep.invalidatedReason ? escapeCareerHtml(prep.invalidatedReason) : `Confirmation captures this line-up, the opponent response, ${Math.min(2, (prep.fixtureDrills || []).length)} fixture drill${(prep.fixtureDrills || []).length === 1 ? '' : 's'} and the current ${suitability.label.toLowerCase()} suitability assessment.`}</small>${selectedOpponentResponse ? `<em>RESPONSE · ${escapeCareerHtml(selectedOpponentResponse.title)}${opponentResponsePlanAdjusted(selectedOpponentResponse) ? ' · MANAGER FINE-TUNED' : ''} · ${escapeCareerHtml(selectedOpponentResponse.upside)}</em>` : '<em>RESPONSE · CUSTOM MANAGER PLAN</em>'}</div><button class="primary" data-matchday-action="confirm-plan" ${careerSquadReady() ? '' : 'disabled'}>${clubMatchPlanConfirmed() ? 'RECONFIRM PLAN' : 'CONFIRM PLAN'}</button><button data-matchday-action="deploy" ${clubMatchPlanConfirmed() ? '' : 'disabled'}>START MATCHMAKING</button></section>`;
  }

  function clubDecisionState() {
    careerState.decisions = careerState.decisions && typeof careerState.decisions === 'object' ? careerState.decisions : {};
    careerState.decisions.sequence = Math.max(0, Math.round(Number(careerState.decisions.sequence) || 0));
    careerState.decisions.items = Array.isArray(careerState.decisions.items) ? careerState.decisions.items.slice(0, 24) : [];
    careerState.decisions.lastGeneratedDay = Number.isFinite(Number(careerState.decisions.lastGeneratedDay)) ? Math.round(Number(careerState.decisions.lastGeneratedDay)) : -4;
    return careerState.decisions;
  }

  function clubOpenDecisions() {
    return clubDecisionState().items.filter(item => !item.resolved);
  }

  function clubDecisionById(id) {
    return clubDecisionState().items.find(item => item.id === id) || null;
  }

  function clubAddDecision({ type, subject, body, category = 'CLUB', playerId = null, options = [] }) {
    const state = clubDecisionState();
    state.sequence++;
    const decision = {
      id: `DEC-${state.sequence}`,
      type: String(type || 'club'),
      playerId,
      createdDay: clubCalendarState().absoluteDay,
      resolved: false,
      choiceId: null,
      options: options.map(option => ({ ...option }))
    };
    state.items.unshift(decision);
    state.items = state.items.slice(0, 24);
    const mail = clubAddMail(subject, body, category, true, 'mail');
    mail.decisionId = decision.id;
    decision.mailId = mail.id;
    return decision;
  }

  function clubDecisionBlockers() {
    return clubOpenDecisions().map(decision => {
      const mail = (careerState.mail || []).find(item => item.id === decision.mailId);
      return {
        id: decision.id,
        route: 'mail',
        category: 'INBOX DECISIONS',
        label: mail?.subject?.toUpperCase() || 'RESPOND TO CLUB DECISION',
        detail: 'A management response is required before the calendar can advance.',
        mailId: decision.mailId || null,
        decisionId: decision.id,
        playerId: decision.playerId || null,
        targetId: decision.mailId ? `mail:${decision.mailId}` : null
      };
    });
  }

  function clubDecisionTargetPlayer(decision) {
    return (careerState.squad || []).find(player => player.id === decision?.playerId) || null;
  }

  function clubApplyDecisionEffect(decision, choice) {
    const player = clubDecisionTargetPlayer(decision);
    const effect = choice?.effect || {};
    if (player) {
      player.happiness = clamp(Math.round((Number(player.happiness) || 70) + (Number(effect.happiness) || 0)), 1, 100);
      player.morale = clamp(Math.round((Number(player.morale) || 70) + (Number(effect.morale) || 0)), 1, 100);
      player.fatigue = clamp(Math.round((Number(player.fatigue) || 0) + (Number(effect.fatigue) || 0)), 0, 100);
      if (effect.trainingAssignment && typeof TRAINING_FOCUS_DEFS === 'object' && TRAINING_FOCUS_DEFS[effect.trainingAssignment]) {
        if (typeof normalisePlayerDevelopment === 'function') normalisePlayerDevelopment(player);
        player.trainingFocus = effect.trainingAssignment;
        player.trainingLastResult = `${TRAINING_FOCUS_DEFS[effect.trainingAssignment].label} assigned by a management decision.`;
      }
      if (effect.playingTimePromiseDays) player.playingTimePromiseUntil = clubCalendarState().absoluteDay + Math.max(1, Number(effect.playingTimePromiseDays) || 0);
      if (effect.medicalUpdate) player.lastMedicalUpdate = effect.medicalUpdate;
      if (typeof updatePlayerMarketProfile === 'function') updatePlayerMarketProfile(player);
    }
    careerState.credits += Math.round(Number(effect.credits) || 0);
    careerState.reputation = clamp(Math.round((Number(careerState.reputation) || 0) + (Number(effect.reputation) || 0)), 0, 100);
    if (effect.credits) teamFinanceTransaction('DECISION', Math.round(Number(effect.credits)), choice.label || 'Club decision');
  }

  function clubResolveDecision(decisionId, choiceId) {
    const decision = clubDecisionById(decisionId);
    if (!decision || decision.resolved) return false;
    const choice = (decision.options || []).find(item => item.id === choiceId);
    if (!choice) return false;
    clubApplyDecisionEffect(decision, choice);
    decision.resolved = true;
    decision.choiceId = choice.id;
    decision.resolvedDay = clubCalendarState().absoluteDay;
    const sourceMail = (careerState.mail || []).find(item => item.id === decision.mailId);
    if (sourceMail) sourceMail.read = true;
    const player = clubDecisionTargetPlayer(decision);
    clubAddMail(
      `Decision recorded · ${choice.label}`,
      `${choice.result || 'The club has recorded the manager response.'}${player ? ` ${player.name}'s morale, happiness and readiness have been updated.` : ' Club finances and reputation have been updated.'}`,
      'CLUB', false, player ? 'profile' : 'play'
    );
    saveCareerState();
    updateMenuUI();
    showStatus(`DECISION RECORDED · ${choice.label.toUpperCase()}`);
    return true;
  }

  // Build 12.133: a decision only repeats for the same player once the cooldown
  // below has elapsed. Without this the unhappiest reserve is re-selected on
  // every rotation, so the same "requests a clearer role" mail arrives again and
  // again and reads as a duplicate.
  const CLUB_DECISION_PLAYER_REPEAT_DAYS = 24;

  function clubDecisionPlayerOnCooldown(type, playerId, day) {
    if (!playerId) return false;
    return clubDecisionState().items.some(item =>
      item.type === type
      && item.playerId === playerId
      && day - (Number(item.createdDay) || 0) < CLUB_DECISION_PLAYER_REPEAT_DAYS);
  }

  // Prefer the neediest candidate who has not raised this issue recently. Only
  // when every candidate is on cooldown does the decision fall through, letting
  // the caller advance the rotation instead of repeating itself.
  function clubDecisionCandidate(type, candidates, day) {
    return candidates.find(player => player && !clubDecisionPlayerOnCooldown(type, player.id, day)) || null;
  }

  function clubMaybeGenerateDecision() {
    if (!careerState.created || !(careerState.squad || []).length) return null;
    const state = clubDecisionState();
    const day = clubCalendarState().absoluteDay;
    if (clubOpenDecisions().length || day - state.lastGeneratedDay < 4 || day < 2) return null;
    state.lastGeneratedDay = day;
    const squad = careerState.squad || [];
    const type = state.sequence % 4;
    if (type === 0) {
      const byHappiness = squad.slice(TEAM_REQUIRED_STARTERS).sort((a, b) => a.happiness - b.happiness);
      const fallback = squad.slice().sort((a, b) => a.happiness - b.happiness);
      const reserve = clubDecisionCandidate('playing-time', byHappiness.concat(fallback), day);
      // Every candidate asked recently: advance the rotation so the next day
      // offers a different decision rather than re-sending the same request.
      if (!reserve) { state.sequence++; return null; }
      return clubAddDecision({
        type: 'playing-time', playerId: reserve.id, category: 'STAFF',
        subject: `${reserve.name} requests a clearer role`,
        body: `${reserve.name} has asked for clarity about playing time and their place in the matchday squad. A response will affect happiness and morale.`,
        options: [
          { id: 'promise', label: 'PROMISE OPPORTUNITY', result: 'You promised a meaningful opportunity within the next week.', effect: { happiness: 8, morale: 4, playingTimePromiseDays: 7 } },
          { id: 'explain', label: 'EXPLAIN COMPETITION', result: 'You explained that selection remains merit-based.', effect: { happiness: -2, morale: 1 } },
          { id: 'deny', label: 'NO GUARANTEES', result: 'You refused to offer assurances.', effect: { happiness: -8, morale: -4 } }
        ]
      });
    }
    if (type === 1) {
      const tired = clubDecisionCandidate('medical-rest', squad.slice().sort((a, b) => b.fatigue - a.fatigue), day);
      if (!tired) { state.sequence++; return null; }
      return clubAddDecision({
        type: 'medical-rest', playerId: tired.id, category: 'MEDICAL',
        subject: `Medical recommendation · ${tired.name}`,
        body: `${tired.name} is carrying ${Math.round(tired.fatigue)}% fatigue. The medical department recommends reducing their workload before the next fixture.`,
        options: [
          { id: 'rest', label: 'APPROVE RECOVERY', result: 'The player was moved onto a recovery programme.', effect: { fatigue: -12, happiness: 3, morale: 1, trainingAssignment: 'recovery', medicalUpdate: 'Manager approved a reduced workload and recovery programme.' } },
          { id: 'available', label: 'KEEP AVAILABLE', result: 'The player remains in full training and available for selection.', effect: { fatigue: 3, happiness: -2, morale: 2, medicalUpdate: 'Manager retained the player in full training despite fatigue.' } }
        ]
      });
    }
    if (type === 2) {
      return clubAddDecision({
        type: 'board-direction', category: 'CLUB',
        subject: 'Board requests commercial direction',
        body: 'The board is deciding whether to fund a more ambitious matchday campaign or protect the current cash position. The choice affects reputation and credits.',
        options: [
          { id: 'ambitious', label: 'FUND CAMPAIGN', result: 'The club invested in visibility and supporter engagement.', effect: { credits: -5000, reputation: 3 } },
          { id: 'prudent', label: 'PROTECT CASH', result: 'The club accepted a smaller short-term commercial payment.', effect: { credits: 3000, reputation: -1 } }
        ]
      });
    }
    const rotationStart = Math.abs((day + state.sequence) % squad.length);
    const rotation = squad.slice(rotationStart).concat(squad.slice(0, rotationStart));
    const player = clubDecisionCandidate('discipline', rotation, day);
    if (!player) { state.sequence++; return null; }
    return clubAddDecision({
      type: 'discipline', playerId: player.id, category: 'STAFF',
      subject: `Training standards · ${player.name}`,
      body: `${player.name} arrived late to a scheduled tactical review. The staff want a clear response before the next day begins.`,
      options: [
        { id: 'fine', label: 'ISSUE FINE', result: 'A formal fine reinforced club standards.', effect: { credits: 1000, happiness: -5, morale: 2 } },
        { id: 'warning', label: 'FORMAL WARNING', result: 'The player accepted a warning without a financial penalty.', effect: { happiness: 1, morale: -1 } }
      ]
    });
  }

  function renderClubDecisionMailActions(mail) {
    const decision = mail?.decisionId ? clubDecisionById(mail.decisionId) : null;
    if (!decision) return '';
    if (decision.resolved) {
      const choice = (decision.options || []).find(item => item.id === decision.choiceId);
      return `<section class="club-mail-decision resolved"><span>DECISION RECORDED</span><strong>${escapeCareerHtml(choice?.label || 'RESPONSE SUBMITTED')}</strong><small>${escapeCareerHtml(choice?.result || 'The club has applied the manager response.')}</small></section>`;
    }
    return `<section class="club-mail-decision"><header><span>MANAGER DECISION REQUIRED</span><strong>CHOOSE A RESPONSE</strong><small>End Day remains locked until one option is selected.</small></header><div>${(decision.options || []).map(option => `<button data-club-decision="${decision.id}" data-club-choice="${option.id}"><strong>${escapeCareerHtml(option.label)}</strong><small>${escapeCareerHtml(option.result || '')}</small></button>`).join('')}</div></section>`;
  }

  function tacticalCoachingRecommendation(text, actionLabel = 'OPEN TACTICS', route = 'tactics', options = {}) {
    return {
      text: String(text || ''),
      actionLabel: String(actionLabel || 'OPEN TACTICS'),
      route: String(route || 'tactics'),
      playerId: options.playerId || null,
      targetId: options.targetId || null,
      category: options.category || 'TACTICAL COACHING'
    };
  }

  function tacticalRecommendationText(item) {
    return typeof item === 'string' ? item : String(item?.text || 'Review the tactical plan before the next fixture.');
  }

  function tacticalAnalysisTone(score, positiveAt = 72, warningAt = 52) {
    const value = Number(score) || 0;
    return value >= positiveAt ? 'positive' : (value >= warningAt ? 'neutral' : 'danger');
  }

  function evaluateOpponentPreparation(plan, metrics = {}) {
    const preparation = plan?.opponentPreparation;
    if (!preparation) return null;
    const drills = Array.isArray(preparation.fixtureDrills) ? preparation.fixtureDrills : [];
    const supportRate = Number(metrics.supportRate) || 0;
    const blocks = Number(metrics.blocks) || 0;
    const effectiveRangePercent = Number.isFinite(Number(metrics.effectiveRangePercent)) ? Number(metrics.effectiveRangePercent) : null;
    const tradeAttempts = Number(metrics.tradeAttempts) || 0;
    const tradeRate = Number(metrics.tradeRate) || 0;
    const flankRoutes = Number(metrics.flankRoutes) || 0;
    const damagedZones = Number(metrics.damagedZones) || 0;
    const damageDealt = Number(metrics.damageDealt) || 0;
    const damageTaken = Number(metrics.damageTaken) || 0;
    const results = drills.map(drill => {
      let score = 50;
      let evidence = 'The available telemetry produced a mixed read.';
      if (drill.id === 'protect-opening') {
        score = clamp(Math.round(supportRate * 0.7 + Math.max(0, 70 - Math.max(0, damageTaken - damageDealt) * 0.08) * 0.3), 0, 100);
        evidence = `${supportRate}% supported movement · ${Math.round(damageTaken)} damage received against ${Math.round(damageDealt)} dealt.`;
      } else if (drill.id === 'range-discipline') {
        score = effectiveRangePercent === null ? 50 : effectiveRangePercent;
        evidence = effectiveRangePercent === null ? 'Insufficient tracked contact for a reliable range verdict.' : `${Math.round(effectiveRangePercent)}% of tracked contact occurred inside effective weapon range.`;
      } else if (drill.id === 'trade-timing') {
        score = tradeAttempts ? Math.round(tradeRate * 100) : Math.round(supportRate * 0.8);
        evidence = tradeAttempts ? `${Math.round(metrics.tradeKills || 0)} of ${tradeAttempts} trade opportunities converted.` : `No clear trade opportunity was recorded · ${supportRate}% supported movement.`;
      } else if (drill.id === 'maintain-spacing') {
        score = clamp(Math.round(supportRate - Math.max(0, blocks - 3) * 5 + 15), 0, 100);
        evidence = `${supportRate}% supported movement · ${blocks} team-mate movement or firing blocks.`;
      } else if (drill.id === 'track-wide-routes') {
        score = clamp(Math.round(flankRoutes * 16 + damagedZones * 11 + Math.min(30, supportRate * 0.35)), 0, 100);
        evidence = `${flankRoutes} verified flank routes · combat registered across ${damagedZones} damaging zones.`;
      } else if (drill.id === 'take-territory') {
        score = clamp(Math.round((Number(metrics.pressureShare) || 0) * 0.75 + damagedZones * 8), 0, 100);
        evidence = `${Math.round(Number(metrics.pressureShare) || 0)}% pressure states · combat across ${damagedZones} damaging zones.`;
      }
      const tone = score >= 68 ? 'positive' : score >= 48 ? 'neutral' : 'danger';
      return { ...drill, score, tone, result: score >= 68 ? 'ACHIEVED' : score >= 48 ? 'MIXED' : 'MISSED', evidence };
    });
    const responseFit = clamp(Math.round((Number(plan?.suitability?.overall) || Number(preparation.response?.fit) || 50) * 0.42 + supportRate * 0.22 + (effectiveRangePercent === null ? 50 : effectiveRangePercent) * 0.20 + (Number(metrics.priorityScore) || 50) * 0.16), 0, 100);
    const responseTone = responseFit >= 68 ? 'positive' : responseFit >= 50 ? 'neutral' : 'danger';
    const prediction = preparation.planRevealed === false
      ? `${preparation.identityName || 'OPPOSITION PROFILE'} · LIMITED REPORT · EXACT SHAPE UNCONFIRMED`
      : `${preparation.identityName || 'OPPOSITION PROFILE'} · ${preparation.expectedFormation || 'BALANCED'} · ${preparation.expectedApproach || 'BALANCED'} · ${preparation.expectedEngagement || 'MIXED'} RANGE`;
    const responseTitle = preparation.response?.title || 'CUSTOM MANAGER PLAN';
    const verdict = responseFit >= 68 ? `${responseTitle} translated into a coherent match execution.` : responseFit >= 50 ? `${responseTitle} appeared in the match, but execution was inconsistent.` : `${responseTitle} did not produce the intended control consistently.`;
    return {
      opponentName: preparation.opponentName,
      reportDepth: preparation.reportDepth,
      confidenceLabel: preparation.confidenceLabel,
      prediction,
      expectedRoute: preparation.expectedRoute,
      responseTitle,
      responseFit,
      responseTone,
      verdict,
      risk: preparation.response?.risk || '',
      upside: preparation.response?.upside || '',
      drills: results
    };
  }

  function buildTacticalMatchAnalysis(summary) {
    if (!summary) return null;
    const plan = summary.tacticalPlan || careerState.tactics?.activeMatchPlan || clubTacticalPlanSnapshot();
    const suitability = plan?.suitability || tacticalSuitabilitySnapshot(clubTacticalSuitabilityReport());
    const totals = summary.finance?.teamTotals || {};
    const supported = Math.max(0, Number(totals.supportedTime) || 0);
    const isolated = Math.max(0, Number(totals.isolatedTime) || 0);
    const supportRateRaw = supported + isolated > 0 ? supported / (supported + isolated) : 0.5;
    const supportRate = Math.round(supportRateRaw * 100);
    const tradeAttempts = Math.max(0, Math.round(Number(totals.tradeAttempts) || 0));
    const tradeKills = Math.max(0, Math.round(Number(totals.tradeKills) || 0));
    const regroupActions = Math.max(0, Math.round(Number(totals.regroupActions) || 0));
    const roleActions = Math.max(0, Math.round(Number(totals.roleActions) || 0));
    const routeReplans = Math.max(0, Math.round(Number(totals.routeReplans) || 0));
    const zoneAnalysis = Array.isArray(summary.zoneAnalysis) ? summary.zoneAnalysis.filter(item => item && item.zone).map(item => ({ ...item })) : [];
    const topFightZone = zoneAnalysis.slice().sort((a, b) => (Number(b.damage) + Number(b.combatSeconds) * 0.2) - (Number(a.damage) + Number(a.combatSeconds) * 0.2))[0] || null;
    const courtyardZone = zoneAnalysis.find(item => item.zone === 'COURTYARD') || null;
    const aiStability = summary.aiStability || null;
    const operators = Array.isArray(summary.operatorAnalysis) ? summary.operatorAnalysis.map(item => ({ ...item })) : [];
    const rangeValues = operators.map(item => Number(item.effectiveRangePercent)).filter(Number.isFinite);
    const effectiveRangePercent = rangeValues.length ? Math.round(rangeValues.reduce((sum, value) => sum + value, 0) / rangeValues.length) : null;
    const targetDistanceValues = operators.map(item => Number(item.averageTargetDistance)).filter(Number.isFinite);
    const averageTargetDistance = targetDistanceValues.length ? targetDistanceValues.reduce((sum, value) => sum + value, 0) / targetDistanceValues.length : null;
    const flankRoutes = operators.reduce((sum, item) => sum + Math.max(0, Number(item.flankRoutes) || 0), 0);
    const blockedShots = operators.reduce((sum, item) => sum + Math.max(0, Number(item.blockedShots) || 0), 0);
    const maximumFriendlyOccupancy = zoneAnalysis.reduce((max, item) => Math.max(max, Number(item.maximumFriendlyOccupancy) || 0), 0);
    const damagedZones = zoneAnalysis.filter(item => Number(item.damage) > 0).length;
    const totalStateSamples = operators.reduce((sum, item) => sum + Object.values(item.stateUsage || {}).reduce((subtotal, value) => subtotal + (Number(value) || 0), 0), 0);
    const stateCount = state => operators.reduce((sum, item) => sum + (Number(item.stateUsage?.[state]) || 0), 0);
    const pressureShare = totalStateSamples ? Math.round((stateCount('advance') + stateCount('push')) / totalStateSamples * 100) : 0;
    const defensiveShare = totalStateSamples ? Math.round((stateCount('cover') + stateCount('hold') + stateCount('peek') + stateCount('fallback')) / totalStateSamples * 100) : 0;
    const accuracyPercent = Math.round((Number(summary.accuracy) || 0) * 100);
    const shotSampleReliable = (Number(summary.shotsFired) || 0) >= 8;
    const blocks = Math.max(blockedShots, aiStability ? Math.max(0, Number(aiStability.teammateMovementBlocks) || 0) + Math.max(0, Number(aiStability.teammateBlockedShots) || 0) : 0);
    const tradeRate = tradeAttempts > 0 ? tradeKills / tradeAttempts : 0;
    const routeRate = Number(aiStability?.pathChangesPerOperatorMinute) || 0;
    const planFormationScore = Number(suitability.formation?.score) || Number(suitability.overall) || 0;

    const intentRows = [];
    intentRows.push({
      id: 'formation', label: 'FORMATION', intended: plan.formationName || 'BALANCED',
      actual: `${roleActions} role-led decisions · ${routeRate.toFixed(1)} path changes / operator-minute`,
      assessment: planFormationScore >= 62 ? 'The line-up generally executed the selected shape.' : 'The selected shape was difficult for this line-up to execute consistently.',
      tone: tacticalAnalysisTone(planFormationScore, 62, 50)
    });
    const approachMet = plan.approachId === 'aggressive' ? pressureShare >= 52 : plan.approachId === 'cautious' ? defensiveShare >= 34 : pressureShare >= 34 && defensiveShare >= 18;
    intentRows.push({
      id: 'approach', label: 'APPROACH', intended: plan.approachName || 'BALANCED',
      actual: `${pressureShare}% pressure states · ${defensiveShare}% protective states`,
      assessment: approachMet ? 'The state mix reflected the requested risk and tempo.' : 'The actual state mix drifted away from the requested approach.',
      tone: approachMet ? 'positive' : 'warning'
    });
    const rangeScore = effectiveRangePercent === null ? 50 : effectiveRangePercent;
    intentRows.push({
      id: 'engagement', label: 'ENGAGEMENT RANGE', intended: plan.engagementName || 'MIXED RANGE',
      actual: effectiveRangePercent === null ? 'Insufficient contact samples' : `${effectiveRangePercent}% of tracked contact inside effective range${averageTargetDistance === null ? '' : ` · ${averageTargetDistance.toFixed(1)}m average`}`,
      assessment: effectiveRangePercent === null ? 'More match data is needed.' : effectiveRangePercent >= 75 ? 'Weapon distance discipline was strong.' : effectiveRangePercent >= 55 ? 'Range execution was mixed.' : 'The squad repeatedly fought outside its useful weapon distance.',
      tone: tacticalAnalysisTone(rangeScore, 75, 55)
    });
    let priorityActual = `${supportRate}% supported movement`;
    let priorityScore = supportRate;
    if (plan.priorityId === 'trade') { priorityActual = `${tradeKills} / ${tradeAttempts} trade opportunities converted · ${supportRate}% supported`; priorityScore = tradeAttempts ? Math.round(tradeRate * 100) : supportRate; }
    else if (plan.priorityId === 'flank') { priorityActual = `${flankRoutes} flank routes · combat across ${damagedZones} damaging zones`; priorityScore = Math.min(100, flankRoutes * 13 + damagedZones * 14); }
    else if (plan.priorityId === 'hold') { priorityActual = `${defensiveShare}% hold / cover states · ${supportRate}% supported`; priorityScore = Math.round(defensiveShare * 1.35 + supportRate * 0.35); }
    else if (plan.priorityId === 'group') { priorityActual = `${supportRate}% supported movement · maximum local group ${maximumFriendlyOccupancy}`; priorityScore = supportRate - Math.max(0, blocks - 3) * 3; }
    intentRows.push({
      id: 'priority', label: 'TEAM PRIORITY', intended: plan.priorityName || 'TRADE ELIMINATIONS', actual: priorityActual,
      assessment: priorityScore >= 65 ? 'The collective behaviour matched the instruction.' : priorityScore >= 45 ? 'The instruction appeared, but execution was inconsistent.' : 'The requested team behaviour rarely produced its intended benefit.',
      tone: tacticalAnalysisTone(priorityScore, 65, 45)
    });
    const openingZone = String(plan.openingPlanName || plan.openingPlanId || 'DYNAMIC CONTACT').toUpperCase();
    const actualFightZone = String(topFightZone?.zone || summary.fightLocation || 'MIXED').toUpperCase();
    const openingMatched = !plan.openingPlanId || !topFightZone || openingZone.includes(actualFightZone) || String(plan.openingPlanZone || '').toUpperCase() === actualFightZone;
    intentRows.push({
      id: 'opening', label: 'OPENING PLAN', intended: plan.openingPlanName || 'DYNAMIC CONTACT', actual: `${actualFightZone} became the primary fight location`,
      assessment: openingMatched ? 'The planned opening successfully shaped the main contact.' : 'The opposition or later rotations pulled the match away from the intended opening.',
      tone: openingMatched ? 'positive' : 'neutral'
    });
    const spacingScore = clamp(92 - blocks * 5 - Math.max(0, maximumFriendlyOccupancy - 3) * 8, 0, 100);
    intentRows.push({
      id: 'spacing', label: 'LANE SPACING', intended: `${plan.priorityName || 'ADAPTIVE'} spacing`, actual: `${blocks} team-mate firing / movement blocks · maximum group ${maximumFriendlyOccupancy || '—'}`,
      assessment: spacingScore >= 72 ? 'Operators generally maintained separate usable lanes.' : spacingScore >= 50 ? 'Some congestion remained around shared contact points.' : 'Repeated clustering reduced movement and firing access.',
      tone: tacticalAnalysisTone(spacingScore, 72, 50)
    });

    const roleByPlayer = new Map((plan.assignments || []).map(item => [item.playerId || `slot:${item.slot}`, item]));
    const playerInsights = operators.map((operator, index) => {
      const assignment = roleByPlayer.get(operator.playerId) || roleByPlayer.get(`slot:${operator.slot}`) || plan.assignments?.[index] || null;
      const usefulRange = Number(operator.effectiveRangePercent);
      const executionScore = clamp((Number.isFinite(usefulRange) ? usefulRange : 55) * 0.52 + Math.max(0, 100 - (Number(operator.blockedShots) || 0) * 14) * 0.18 + Math.min(100, (Number(operator.kills) || 0) * 22 + (Number(operator.recoveries) || 0) * 8 + 42) * 0.30, 0, 100);
      return {
        playerId: operator.playerId || assignment?.playerId || null,
        name: operator.name || assignment?.playerName || `Operator ${index + 1}`,
        roleName: assignment?.roleName || String(operator.role || 'FLEX').toUpperCase(),
        expected: `${assignment?.roleName || String(operator.role || 'FLEX').toUpperCase()} · ${operator.weapon?.rangeBand || 'ADAPTIVE RANGE'}`,
        actual: `${operator.primaryState ? String(operator.primaryState).toUpperCase() : 'MIXED'} in ${operator.primaryZone || 'TRANSIT'} · ${operator.kills || 0}K/${operator.deaths || 0}D · ${Number.isFinite(usefulRange) ? `${Math.round(usefulRange)}% range fit` : 'limited contact data'}`,
        score: Math.round(executionScore), tone: tacticalAnalysisTone(executionScore, 70, 50),
        targetId: operator.playerId ? `training:${operator.playerId}` : null
      };
    });

    const opponentPreparation = evaluateOpponentPreparation(plan, { supportRate, blocks, effectiveRangePercent, tradeAttempts, tradeKills, tradeRate, flankRoutes, damagedZones, pressureShare, priorityScore, damageDealt: summary.damageDealt, damageTaken: summary.damageTaken });
    const recommendations = [];
    const addRecommendation = item => { if (item?.text && !recommendations.some(existing => existing.text === item.text)) recommendations.push(item); };
    const weakestRangeOperator = operators.filter(item => Number.isFinite(Number(item.effectiveRangePercent))).sort((a, b) => Number(a.effectiveRangePercent) - Number(b.effectiveRangePercent))[0] || null;
    const weakestTrainingPlayer = (careerState.squad || []).slice(0, TEAM_REQUIRED_STARTERS).sort((a, b) => (Number(a.stats?.awareness) + Number(a.stats?.marksmanship)) - (Number(b.stats?.awareness) + Number(b.stats?.marksmanship)))[0] || null;
    if (supportRateRaw < 0.46) addRecommendation(tacticalCoachingRecommendation('Too many contacts occurred without useful nearby support. Review the team priority or assign a dedicated Support operator.', 'REVIEW TEAM SHAPE', 'tactics'));
    if (tradeAttempts > 0 && tradeRate < 0.28) addRecommendation(tacticalCoachingRecommendation('The squad reacted to deaths but arrived too late. Improve Awareness and support timing.', 'OPEN AWARENESS TRAINING', 'training', { playerId: weakestTrainingPlayer?.id, targetId: weakestTrainingPlayer ? `training:${weakestTrainingPlayer.id}` : 'training:team-benefits' }));
    if (shotSampleReliable && (summary.accuracy || 0) < 0.34) addRecommendation(tacticalCoachingRecommendation('Shot quality was low. Review engagement range or target the weakest marksman with a technical programme.', weakestTrainingPlayer ? `TRAIN ${String(weakestTrainingPlayer.name).toUpperCase()}` : 'OPEN TRAINING', 'training', { playerId: weakestTrainingPlayer?.id, targetId: weakestTrainingPlayer ? `training:${weakestTrainingPlayer.id}` : 'training:team-benefits' }));
    if ((summary.damageTaken || 0) > (summary.damageDealt || 0) * 1.1) addRecommendation(tacticalCoachingRecommendation('Health trades favoured the opposition. A Cautious approach or stronger cover roles may preserve the squad.', 'REVIEW APPROACH', 'tactics'));
    if (routeReplans > Math.max(5, summary.roundsPlayed * 2) || routeRate > 10) addRecommendation(tacticalCoachingRecommendation('Frequent route changes suggest congestion or unclear lane ownership. Review formation and role assignments.', 'REVIEW LANES', 'tactics'));
    if ((suitability.overall || 0) < 55) addRecommendation(tacticalCoachingRecommendation('The selected plan stretched this squad. Improve the lowest fit component before confirming the next match plan.', 'IMPROVE PLAN FIT', 'tactics'));
    const roleMismatches = (suitability.players || []).filter(item => !item.naturalMatch && Number(item.score) < 62);
    if (roleMismatches.length) addRecommendation(tacticalCoachingRecommendation(`${roleMismatches[0].playerName} was not fully suited to the assigned ${roleMismatches[0].roleName} responsibility.`, 'REASSIGN ROLE', 'tactics', { playerId: roleMismatches[0].playerId || null }));
    if (effectiveRangePercent !== null && effectiveRangePercent < 60 && weakestRangeOperator?.playerId) addRecommendation(tacticalCoachingRecommendation(`${weakestRangeOperator.name} spent too much contact time outside effective weapon range. Review their loadout.`, 'OPEN ARMOURY LOADOUT', 'loadout', { playerId: weakestRangeOperator.playerId, targetId: `loadout:${weakestRangeOperator.playerId}` }));
    if ((suitability.familiarity?.score || 0) < 45) addRecommendation(tacticalCoachingRecommendation('Tactical familiarity is low. Reusing this structure will improve execution, while a familiar plan offers a cleaner short-term option.', 'REVIEW FAMILIARITY', 'tactics'));
    if (topFightZone && Number(topFightZone.damageSharePercent) >= 55) addRecommendation(tacticalCoachingRecommendation(`Combat became concentrated in ${topFightZone.zone}. A wider opening or Create Flanks can spread pressure.`, 'CHANGE OPENING SHAPE', 'tactics'));
    if (summary.tacticalPlan?.arenaId === 'office' && courtyardZone && Number(courtyardZone.combatSharePercent) < 12) addRecommendation(tacticalCoachingRecommendation('The courtyard was mainly transit space. Flanker assignments can create meaningful cross-map pressure there.', 'REVIEW FLANKERS', 'tactics'));
    if (blocks >= 8) addRecommendation(tacticalCoachingRecommendation('Team-mate obstruction remained frequent. Widen role spacing or move away from Stay Grouped.', 'REVIEW SPACING', 'tactics'));
    const missedDrill = opponentPreparation?.drills?.find(item => item.tone === 'danger') || null;
    if (missedDrill) addRecommendation(tacticalCoachingRecommendation(`${missedDrill.name} was not achieved: ${missedDrill.evidence}`, missedDrill.route === 'loadout' ? 'REVIEW LOADOUTS' : missedDrill.route === 'training' ? 'OPEN TRAINING' : 'REVIEW MATCH PLAN', missedDrill.route || 'tactics'));
    if (opponentPreparation && opponentPreparation.responseTone === 'danger') addRecommendation(tacticalCoachingRecommendation(`${opponentPreparation.responseTitle} did not create consistent control. Revisit the response rather than assuming the scouting report itself guaranteed the matchup.`, 'REVIEW OPPONENT RESPONSE', 'tactics', { targetId: 'tactics:opponent-preparation' }));
    if (!recommendations.length) addRecommendation(tacticalCoachingRecommendation(summary.won ? 'The plan produced stable spacing and role execution. Retain the structure for the next fixture.' : 'The structure was competitive. Make one targeted player-development change rather than rebuilding the entire plan.', summary.won ? 'REVIEW & RETAIN PLAN' : 'OPEN TRAINING', summary.won ? 'tactics' : 'training', { playerId: weakestTrainingPlayer?.id, targetId: weakestTrainingPlayer ? `training:${weakestTrainingPlayer.id}` : 'training:team-benefits' }));

    const worked = effectiveRangePercent !== null && effectiveRangePercent >= 75
      ? { title: 'WEAPON DISTANCE WAS CONTROLLED', evidence: `${effectiveRangePercent}% of tracked contact occurred inside effective range.`, tone: 'positive' }
      : supportRate >= 58
        ? { title: 'USEFUL SUPPORT SPACING', evidence: `${supportRate}% of tracked movement time had a nearby team-mate able to support.`, tone: 'positive' }
        : tradeAttempts > 0 && tradeRate >= 0.45
          ? { title: 'TRADE STRUCTURE CREATED VALUE', evidence: `${tradeKills} of ${tradeAttempts} trade opportunities became eliminations.`, tone: 'positive' }
          : { title: summary.won ? 'THE TEAM FOUND A WINNING ROUTE' : 'THE PLAN REMAINED COMPETITIVE', evidence: summary.won ? `The squad closed the match ${summary.blueScore ?? 0} — ${summary.redScore ?? 0}.` : `The squad still produced ${Math.round(Number(summary.damageDealt) || 0)} damage despite the result.`, tone: 'neutral' };
    const issue = supportRateRaw < 0.46
      ? { title: 'ISOLATION REDUCED TEAM SUPPORT', evidence: `Supported movement fell to ${supportRate}%, leaving too many contacts difficult to trade.`, tone: 'danger' }
      : blocks >= 8
        ? { title: 'TEAM-MATE OBSTRUCTION HURT LANES', evidence: `${blocks} movement or firing blocks were recorded during active play.`, tone: 'danger' }
        : effectiveRangePercent !== null && effectiveRangePercent < 55
          ? { title: 'RANGE DISCIPLINE BROKE DOWN', evidence: `Only ${effectiveRangePercent}% of tracked contact occurred inside effective weapon range.`, tone: 'danger' }
          : shotSampleReliable && accuracyPercent < 34
            ? { title: 'LOW-QUALITY SHOTS LIMITED DAMAGE', evidence: `${accuracyPercent}% accuracy indicates rushed or poorly spaced firing windows.`, tone: 'danger' }
            : (Number(summary.damageTaken) || 0) > (Number(summary.damageDealt) || 0) * 1.1
              ? { title: 'HEALTH TRADES FAVOURED THE OPPOSITION', evidence: `${Math.round(Number(summary.damageTaken) || 0)} damage received against ${Math.round(Number(summary.damageDealt) || 0)} dealt.`, tone: 'danger' }
              : (suitability.overall || 0) < 55
                ? { title: 'THE PLAN STRETCHED THIS LINE-UP', evidence: `Plan fit was ${Math.round(Number(suitability.overall) || 0)}/100, reducing how strongly instructions could be executed.`, tone: 'danger' }
                : { title: 'NO SINGLE SYSTEMIC FAILURE', evidence: 'The telemetry did not identify one dominant weakness; avoid overreacting to the result alone.', tone: 'neutral' };
    let cause = { label: 'EXECUTION', title: 'MATCH EXECUTION', detail: 'The plan was viable, but moment-to-moment execution determined the result.', tone: 'neutral' };
    if ((suitability.overall || 0) < 50) cause = { label: 'PLAN', title: 'PLAN–SQUAD MISMATCH', detail: 'The selected instructions asked this line-up to perform outside its strongest profile.', tone: 'danger' };
    else if (blocks >= 8 || supportRateRaw < 0.46) cause = { label: 'EXECUTION', title: 'SPACING & COORDINATION', detail: 'The largest loss of value came from isolation or operators sharing the same lanes.', tone: 'danger' };
    else if (effectiveRangePercent !== null && effectiveRangePercent < 55) cause = { label: 'LOADOUT', title: 'WEAPON–RANGE MISMATCH', detail: 'Operators repeatedly contacted enemies outside the useful range of their weapons.', tone: 'danger' };
    else if ((Number(summary.damageTaken) || 0) > (Number(summary.damageDealt) || 0) * 1.25) cause = { label: 'OPPONENT', title: 'OPPOSITION EXECUTION EDGE', detail: 'The opposition converted substantially more damage from the available engagements.', tone: 'warning' };
    else if (!summary.won && Math.abs((Number(summary.damageTaken) || 0) - (Number(summary.damageDealt) || 0)) < Math.max(80, Number(summary.damageDealt) * 0.12)) cause = { label: 'MARGINS', title: 'CLOSE-MARGIN DEFEAT', detail: 'The underlying performance was close enough that a small number of engagements decided the result.', tone: 'neutral' };
    const nextRecommendation = recommendations[0];
    const nextAction = { title: nextRecommendation.actionLabel, evidence: nextRecommendation.text, tone: 'action' };
    return {
      supportRate, tradeAttempts, tradeKills, regroupActions, roleActions, routeReplans,
      effectiveRangePercent, averageTargetDistance, flankRoutes, blockedShots: blocks, maximumFriendlyOccupancy,
      recommendations: recommendations.slice(0, 5), conclusions: { worked, issue, nextAction }, cause,
      intentRows, playerInsights, suitability, familiarityGain: summary.tacticalFamiliarityGain || null,
      topFightZone: topFightZone ? { zone: topFightZone.zone, damageSharePercent: Number(topFightZone.damageSharePercent) || 0 } : null,
      opponentPreparation, zoneAnalysis, aiStability, plan
    };
  }

  function renderTacticalMatchAnalysis(summary) {
    const storedAnalysis = summary?.tacticalAnalysis;
    const analysis = storedAnalysis?.intentRows?.length && storedAnalysis?.playerInsights ? storedAnalysis : buildTacticalMatchAnalysis(summary);
    if (!analysis) return '';
    const plan = analysis.plan || {};
    const suitability = analysis.suitability || {};
    const zoneAnalysis = Array.isArray(summary?.zoneAnalysis) ? summary.zoneAnalysis : (Array.isArray(analysis.zoneAnalysis) ? analysis.zoneAnalysis : []);
    const aiStability = summary?.aiStability || analysis.aiStability || null;
    const topFightZone = analysis.topFightZone || zoneAnalysis[0] || null;
    const familiarityCopy = analysis.familiarityGain ? ` · FAMILIARITY +${analysis.familiarityGain.amount}` : '';
    const conclusions = analysis.conclusions || {};
    const conclusionCards = [
      { label: 'WHAT WORKED', ...(conclusions.worked || { title: 'MATCH EVIDENCE RECORDED', evidence: 'Review the detailed execution rows below.', tone: 'neutral' }) },
      { label: 'BIGGEST ISSUE', ...(conclusions.issue || { title: 'NO DOMINANT ISSUE FOUND', evidence: 'Several smaller factors shaped the performance.', tone: 'neutral' }) },
      { label: 'NEXT MANAGER ACTION', ...(conclusions.nextAction || { title: 'MAKE ONE TARGETED CHANGE', evidence: tacticalRecommendationText(analysis.recommendations?.[0]), tone: 'action' }) }
    ];
    const adjustmentHistory = Array.isArray(plan.adjustments) ? plan.adjustments : [];
    const adjustmentMarkup = adjustmentHistory.length ? `<div class="career-tactical-adjustments"><div class="career-section-head compact"><div><span>IN-MATCH MANAGEMENT</span><strong>BETWEEN-ROUND CHANGES</strong></div><p>The review compares each manager intervention with the evidence from the round in which it applied.</p></div>${adjustmentHistory.map(item => {
      const result = item.result || { tone: 'neutral', title: 'RESULT NOT FULLY OBSERVED', evidence: 'The match ended before enough follow-up evidence was recorded.' };
      const changeCopy = (item.changes || []).map(change => `${escapeCareerHtml(String(change.type || '').toUpperCase())}: ${escapeCareerHtml(String(change.fromLabel || change.from || '').toUpperCase())} → ${escapeCareerHtml(String(change.toLabel || change.to || '').toUpperCase())}`).join(' · ') || 'PLAN RETAINED';
      return `<article class="${escapeCareerHtml(result.tone || 'neutral')}"><span>AFTER ROUND ${Math.max(1, Number(item.afterRound) || 1)}</span><strong>${changeCopy}</strong><small>${escapeCareerHtml(item.coachingRead || 'Manager adjustment')}</small><p><b>EXPECTED</b> ${escapeCareerHtml(item.expectedEffect || 'A targeted change to the next-round behaviour.')}</p><footer><b>${escapeCareerHtml(result.title || 'MIXED RESULT')}</b><small>${escapeCareerHtml(result.evidence || '')}</small></footer></article>`;
    }).join('')}</div>` : '';
    const opponentAdjustmentHistory = Array.isArray(plan.opponentAdjustments) ? plan.opponentAdjustments : [];
    const opponentAdjustmentMarkup = opponentAdjustmentHistory.length ? `<div class="career-opponent-adjustments"><div class="career-section-head compact"><div><span>OPPONENT ADAPTATION</span><strong>HOW THE OTHER BENCH RESPONDED</strong></div><p>These reads are based on visible round behaviour and are presented as tactical interpretations rather than hidden certainty.</p></div>${opponentAdjustmentHistory.map(item => `<article class="${item.changed ? 'action' : 'neutral'}"><span>FOR ROUND ${Math.max(2, Number(item.appliedForRound) || 2)}</span><strong>${escapeCareerHtml(item.trigger || 'PLAN RETAINED')}</strong><p>${escapeCareerHtml(item.reason || 'No clear tactical change was observed.')}</p><small>${escapeCareerHtml(item.counterHint || 'Keep the core plan stable and respond only to clear evidence.')}</small></article>`).join('')}</div>` : '';
    const intentMarkup = (analysis.intentRows || []).map(row => `<article class="career-intent-row ${escapeCareerHtml(row.tone || 'neutral')}"><header><span>${escapeCareerHtml(row.label)}</span><b>${row.tone === 'positive' ? 'MET' : row.tone === 'danger' ? 'MISSED' : 'MIXED'}</b></header><div><small>INTENDED</small><strong>${escapeCareerHtml(row.intended)}</strong></div><div><small>ACTUAL</small><strong>${escapeCareerHtml(row.actual)}</strong></div><p>${escapeCareerHtml(row.assessment)}</p></article>`).join('');
    const playerMarkup = (analysis.playerInsights || []).map(player => `<article class="career-player-execution ${escapeCareerHtml(player.tone || 'neutral')}"><header><div><span>${escapeCareerHtml(player.roleName)}</span><strong>${escapeCareerHtml(player.name)}</strong></div><b>${Math.round(Number(player.score) || 0)}</b></header><small>EXPECTED · ${escapeCareerHtml(player.expected)}</small><p>${escapeCareerHtml(player.actual)}</p>${player.playerId ? `<button type="button" data-coaching-route="training" data-coaching-player="${escapeCareerHtml(player.playerId)}" data-coaching-target="training:${escapeCareerHtml(player.playerId)}" data-coaching-label="OPEN TRAINING">OPEN TRAINING</button>` : ''}</article>`).join('');
    const recommendations = (analysis.recommendations || []).map(item => typeof item === 'string' ? tacticalCoachingRecommendation(item) : item);
    const recommendationMarkup = recommendations.map((item, index) => `<article><span>${String(index + 1).padStart(2, '0')}</span><p>${escapeCareerHtml(tacticalRecommendationText(item))}</p><button type="button" data-coaching-route="${escapeCareerHtml(item.route || 'tactics')}" ${item.playerId ? `data-coaching-player="${escapeCareerHtml(item.playerId)}"` : ''} ${item.targetId ? `data-coaching-target="${escapeCareerHtml(item.targetId)}"` : ''} data-coaching-label="${escapeCareerHtml(item.actionLabel || 'OPEN TACTICS')}">${escapeCareerHtml(item.actionLabel || 'OPEN TACTICS')} →</button></article>`).join('');
    const cause = analysis.cause || { label: 'EXECUTION', title: 'MATCH EXECUTION', detail: 'Review the evidence before changing the plan.', tone: 'neutral' };
    const opponentPreparation = analysis.opponentPreparation || null;
    const opponentPreparationMarkup = opponentPreparation ? `<section class="career-opponent-preparation-review ${escapeCareerHtml(opponentPreparation.responseTone || 'neutral')}"><div class="career-section-head compact"><div><span>OPPONENT PREPARATION REVIEW</span><strong>${escapeCareerHtml(opponentPreparation.opponentName || 'OPPOSITION')} · ${escapeCareerHtml(opponentPreparation.responseTitle || 'CUSTOM PLAN')}</strong></div><p>${Math.round(Number(opponentPreparation.reportDepth) || 0)}% scouting confidence · ${escapeCareerHtml(opponentPreparation.confidenceLabel || 'LIMITED')}</p></div><div class="career-opponent-review-summary"><article><span>SCOUTING PREDICTION</span><strong>${escapeCareerHtml(opponentPreparation.prediction)}</strong><p>Expected route pattern: ${escapeCareerHtml(opponentPreparation.expectedRoute || 'MIXED ROUTES')}</p></article><article class="${escapeCareerHtml(opponentPreparation.responseTone || 'neutral')}"><span>RESPONSE EXECUTION</span><strong>${Math.round(Number(opponentPreparation.responseFit) || 0)} / 100</strong><p>${escapeCareerHtml(opponentPreparation.verdict || 'Review the detailed evidence.')}</p></article></div>${opponentPreparation.drills?.length ? `<div class="career-opponent-drill-results">${opponentPreparation.drills.map(drill => `<article class="${escapeCareerHtml(drill.tone || 'neutral')}"><span>${escapeCareerHtml(drill.result || 'MIXED')} · ${escapeCareerHtml(drill.short || 'FIXTURE DRILL')}</span><strong>${escapeCareerHtml(drill.name || 'FIXTURE DRILL')}</strong><p>${escapeCareerHtml(drill.evidence || '')}</p><button type="button" data-coaching-route="${escapeCareerHtml(drill.route || 'tactics')}" data-coaching-label="${drill.route === 'loadout' ? 'OPEN ARMOURY' : drill.route === 'training' ? 'OPEN TRAINING' : 'OPEN TACTICS'}">${drill.route === 'loadout' ? 'OPEN ARMOURY' : drill.route === 'training' ? 'OPEN TRAINING' : 'OPEN TACTICS'} →</button></article>`).join('')}</div>` : '<p class="career-opponent-no-drills">No fixture drills were selected for this match.</p>'}</section>` : '';
    return `<section class="career-tactical-analysis"><div class="career-section-head"><div><span>TACTICAL REVIEW</span><strong>INTENT VERSUS EXECUTION</strong></div><p>Each row compares the manager instruction with what the autonomous operators actually did during the match.</p></div><div class="career-causal-summary">${conclusionCards.map(card => `<article class="${escapeCareerHtml(card.tone || 'neutral')}"><span>${escapeCareerHtml(card.label)}</span><strong>${escapeCareerHtml(card.title)}</strong><p>${escapeCareerHtml(card.evidence)}</p></article>`).join('')}</div>${opponentPreparationMarkup}<article class="career-match-cause ${escapeCareerHtml(cause.tone || 'neutral')}"><span>PRIMARY RESULT DRIVER · ${escapeCareerHtml(cause.label)}</span><strong>${escapeCareerHtml(cause.title)}</strong><p>${escapeCareerHtml(cause.detail)}</p></article><div class="career-tactical-plan-summary"><span>${escapeCareerHtml(plan.formationName || 'BALANCED')}</span><span>${escapeCareerHtml(plan.approachName || 'BALANCED')}</span><span>${escapeCareerHtml(plan.engagementName || 'MIXED RANGE')}</span><span>${escapeCareerHtml(plan.priorityName || 'TRADE ELIMINATIONS')}</span><span>${escapeCareerHtml(plan.openingPlanName || 'DYNAMIC OPENING')}</span><span>PLAN FIT ${Math.round(Number(suitability.overall) || 0)}${familiarityCopy}</span></div>${adjustmentMarkup}${opponentAdjustmentMarkup}<div class="career-intent-grid">${intentMarkup}</div><div class="career-tactical-metrics"><article><span>PLAN FIT</span><strong>${Math.round(Number(suitability.overall) || 0)}</strong><small>${escapeCareerHtml(suitability.label || 'UNRATED')} · ${Math.round(Number(suitability.executionPercent) || 100)}% tactical execution baseline</small></article><article><span>EFFECTIVE RANGE</span><strong>${analysis.effectiveRangePercent === null || analysis.effectiveRangePercent === undefined ? '—' : `${analysis.effectiveRangePercent}%`}</strong><small>Tracked contact inside each operator's useful weapon distance</small></article><article><span>SUPPORTED TIME</span><strong>${analysis.supportRate}%</strong><small>Movement time with a nearby team-mate able to support</small></article><article><span>TRADE RESPONSE</span><strong>${analysis.tradeKills} / ${analysis.tradeAttempts}</strong><small>Return eliminations after a nearby team-mate fell</small></article><article><span>FLANK ROUTES</span><strong>${analysis.flankRoutes || 0}</strong><small>Verified wide-angle tactical routes</small></article><article><span>TEAM BLOCKS</span><strong>${analysis.blockedShots || 0}</strong><small>Movement or firing access lost to team-mate obstruction</small></article></div>${playerMarkup ? `<div class="career-player-execution-section"><div class="career-section-head compact"><div><span>ACTIVE FIVE OPERATORS</span><strong>ROLE-BY-ROLE REVIEW</strong></div><p>Ratings describe how each active operator carried out the assigned responsibility, not permanent player ability.</p></div><div class="career-player-execution-grid">${playerMarkup}</div></div>` : ''}${zoneAnalysis.length ? `<div class="career-zone-analysis"><div class="career-section-head compact"><div><span>FIGHT LOCATION ANALYSIS</span><strong>${escapeCareerHtml(topFightZone?.zone || 'MIXED MAP CONTROL')}</strong></div><p>Damage, active-combat time and congestion are grouped by map zone.</p></div><div class="career-zone-analysis-grid">${zoneAnalysis.slice(0, 5).map((zone, index) => `<article class="${index === 0 ? 'primary' : ''}"><header><span>${escapeCareerHtml(zone.zone)}</span><strong>${Math.round(Number(zone.damageSharePercent) || 0)}% DAMAGE</strong></header><div><b>${Math.round(Number(zone.damage) || 0)}</b><small>DAMAGE</small></div><div><b>${Number(zone.combatSeconds || 0).toFixed(1)}s</b><small>COMBAT TIME</small></div><div><b>${Number(zone.eliminations) || 0}</b><small>ELIMINATIONS</small></div><footer>${Number(zone.teammateMovementBlocks || 0) + Number(zone.teammateBlockedShots || 0)} TEAM BLOCKS · MAX GROUP ${Number(zone.maximumFriendlyOccupancy) || 0}</footer></article>`).join('')}</div>${aiStability ? `<div class="career-ai-stability-strip"><span>PATH CHANGES <b>${Number(aiStability.pathChangesPerOperatorMinute || 0).toFixed(1)} / OP-MIN</b></span><span>TACTICAL CHANGES <b>${Number(aiStability.tacticalChangesPerOperatorMinute || 0).toFixed(1)} / OP-MIN</b></span><span>TEAM BLOCKS <b>${Number(aiStability.teammateMovementBlocks || 0) + Number(aiStability.teammateBlockedShots || 0)}</b></span><span>PATH REUSES <b>${Number(aiStability.navigationPathHoldReuses || 0)}</b></span></div>` : ''}</div>` : ''}<div class="career-section-head compact coaching-head"><div><span>COACHING RECOMMENDATIONS</span><strong>OPEN THE CORRECT MANAGEMENT SCREEN</strong></div><p>Each recommendation links directly to Tactics, Training or the relevant Armoury loadout.</p></div><div class="career-tactical-recommendations clickable">${recommendationMarkup}</div></section>`;
  }

  let pendingTacticalCoachingTarget = null;

  function applyPendingTacticalCoachingTarget() {
    const pending = pendingTacticalCoachingTarget;
    if (!pending || pending.route !== menuTab) return false;
    requestAnimationFrame(() => {
      if (pending.playerId) {
        selectedTeamPlayerId = pending.playerId;
        careerState.selectedPlayerId = pending.playerId;
      }
      if (pending.targetId && menuContentEl) {
        const selector = `[data-management-target-id="${String(pending.targetId).replace(/"/g, '\\"')}"]`;
        const target = menuContentEl.querySelector(selector);
        if (target) {
          target.classList.add('management-arrival-target');
          if (typeof scrollCommandContentTargetIntoView === 'function') scrollCommandContentTargetIntoView(target, { block: 'center', behavior: 'auto' });
          else target.scrollIntoView({ block: 'center', behavior: 'auto' });
        }
      }
      showStatus(`${String(pending.label || 'COACHING SCREEN').toUpperCase()} OPENED`);
      pendingTacticalCoachingTarget = null;
    });
    return true;
  }

  function openTacticalCoachingRecommendation(trigger) {
    const route = String(trigger?.dataset?.coachingRoute || 'tactics');
    const playerId = trigger?.dataset?.coachingPlayer || null;
    const targetId = trigger?.dataset?.coachingTarget || null;
    const label = trigger?.dataset?.coachingLabel || 'COACHING SCREEN';
    if (playerId) {
      selectedTeamPlayerId = playerId;
      careerState.selectedPlayerId = playerId;
    }
    pendingTacticalCoachingTarget = { route, playerId, targetId, label };
    const reportVisible = careerReportState?.phase === 'visible';
    const rewardEligible = Boolean(careerReportState?.summary?.rewardEligible);
    if (reportVisible && careerState.lastRound && !careerState.lastRound.reportReviewed) {
      careerState.lastRound.reportReviewed = true;
      saveCareerState();
    }
    if (reportVisible && rewardEligible) {
      careerCrateState.returnRoute = route;
      careerReportState.detailed = true;
      careerReportState.revealStage = 99;
      continueCareerRoundReport();
      showStatus(`${String(label).toUpperCase()} QUEUED AFTER MATCH REWARD`);
      return true;
    }
    if (reportVisible) {
      careerReportState.phase = 'idle';
      if (careerReportOverlayEl) careerReportOverlayEl.hidden = true;
    }
    menuContext = 'main';
    canResumeMatch = false;
    setAppState('menu');
    setMenuRoute(route);
    applyPendingTacticalCoachingTarget();
    return true;
  }

  function handleMatchdayClick(event) {
    const preparationDisclosure = event.target.closest('[data-opponent-preparation-details]');
    if (preparationDisclosure) {
      opponentPreparationAdvancedOpen = !opponentPreparationAdvancedOpen;
      const previousScroll = Number(menuContentEl?.scrollTop) || 0;
      updateMenuUI();
      requestAnimationFrame(() => {
        if (menuContentEl) menuContentEl.scrollTop = previousScroll;
        const control = menuContentEl?.querySelector('[data-opponent-preparation-details]');
        if (control && typeof control.focus === 'function') control.focus({ preventScroll: true });
      });
      showStatus(opponentPreparationAdvancedOpen ? 'FULL OPPONENT ANALYSIS OPEN' : 'COMPACT OPPONENT BRIEF RESTORED');
      return true;
    }
    const responsePlan = event.target.closest('[data-opponent-response-plan]');
    if (responsePlan) {
      const planId = responsePlan.dataset.opponentResponsePlan;
      if (matchdayGuardRecommendedPlanChange('response', { planId }, responsePlan)) return true;
      const applied = clubSelectOpponentResponsePlan(planId);
      showStatus(applied ? 'OPPONENT RESPONSE STAGED · SAVE CHANGES' : 'UNABLE TO STAGE RESPONSE');
      return true;
    }
    const fixtureDrill = event.target.closest('[data-opponent-fixture-drill]');
    if (fixtureDrill) {
      const applied = clubToggleOpponentFixtureDrill(fixtureDrill.dataset.opponentFixtureDrill);
      showStatus(applied ? 'FIXTURE DRILL UPDATED · RECONFIRM PLAN' : 'SELECT A MAXIMUM OF TWO FIXTURE DRILLS');
      return true;
    }
    const coaching = event.target.closest('[data-coaching-route]');
    if (coaching) return openTacticalCoachingRecommendation(coaching);
    const matchday = event.target.closest('[data-matchday-action]');
    if (matchday) {
      const action = matchday.dataset.matchdayAction;
      if (action === 'review-briefing') {
        clubReviewMatchBriefing();
        opponentPreparationAdvancedOpen = false;
        setMenuRoute('tactics');
        requestAnimationFrame(() => {
          const target = menuContentEl?.querySelector('[data-management-target-id="tactics:opponent-preparation"]');
          if (target && typeof scrollCommandContentTargetIntoView === 'function') scrollCommandContentTargetIntoView(target, { block: 'start', behavior: 'smooth' });
        });
        showStatus('OPPONENT PREPARATION OPENED · BUILD THE MATCH PLAN');
      } else if (action === 'review-final-check') {
        const target = menuContentEl?.querySelector('.club-plan-confirm');
        if (target && menuContentEl) {
          const scrollerRect = menuContentEl.getBoundingClientRect();
          const targetRect = target.getBoundingClientRect();
          const desiredTop = Math.max(0, menuContentEl.scrollTop + targetRect.top - scrollerRect.top - 12);
          menuContentEl.scrollTo({ top: desiredTop, left: 0, behavior: 'smooth' });
        }
        showStatus('FINAL MATCHDAY CHECK');
      } else if (action === 'confirm-plan') {
        if (typeof workflowSaveMatchSetupDrafts === 'function') workflowSaveMatchSetupDrafts({ render: false });
        const confirmed = clubConfirmMatchPlan();
        if (confirmed) showStatus('MATCH PLAN CONFIRMED');
        else showManagementBlocked('COMPLETE FIVE ACTIVE OPERATORS REQUIRED', 'A valid match plan cannot be confirmed until five contracted players occupy the starting line-up.', { route: 'operators', routeLabel: 'OPEN SQUAD', returnFocus: matchday });
        updateMenuUI();
      } else if (action === 'deploy') {
        if (!clubMatchPlanConfirmed()) {
          showManagementBlocked('MATCH PLAN NOT CONFIRMED', 'Review the opposition, assign roles to the five active operators and confirm the tactical plan before beginning matchmaking.', { route: 'tactics', routeLabel: 'OPEN TACTICS', returnFocus: matchday });
        } else startNewMatch();
      }
      return true;
    }
    const approach = event.target.closest('[data-club-approach]');
    if (approach) {
      const value = CLUB_APPROACHES[approach.dataset.clubApproach] ? approach.dataset.clubApproach : 'balanced';
      if (matchdayGuardRecommendedPlanChange('tactics', { field: 'approachId', value }, approach)) return true;
      if (typeof workflowSetTacticsField === 'function') workflowSetTacticsField('approachId', value); else { clubTacticsState().approachId = value; saveCareerState(); updateMenuUI(); }
      return true;
    }
    const engagement = event.target.closest('[data-club-engagement]');
    if (engagement) {
      const value = CLUB_ENGAGEMENTS[engagement.dataset.clubEngagement] ? engagement.dataset.clubEngagement : 'mixed';
      if (matchdayGuardRecommendedPlanChange('tactics', { field: 'engagementId', value }, engagement)) return true;
      if (typeof workflowSetTacticsField === 'function') workflowSetTacticsField('engagementId', value); else { clubTacticsState().engagementId = value; saveCareerState(); updateMenuUI(); }
      return true;
    }
    const priority = event.target.closest('[data-club-priority]');
    if (priority) {
      const value = CLUB_PRIORITIES[priority.dataset.clubPriority] ? priority.dataset.clubPriority : 'trade';
      if (matchdayGuardRecommendedPlanChange('tactics', { field: 'priorityId', value }, priority)) return true;
      if (typeof workflowSetTacticsField === 'function') workflowSetTacticsField('priorityId', value); else { clubTacticsState().priorityId = value; saveCareerState(); updateMenuUI(); }
      return true;
    }
    const mapChoice = event.target.closest('[data-club-map]');
    if (mapChoice) {
      const value = arenaMeta(mapChoice.dataset.clubMap).id;
      if (typeof workflowSetTacticsField === 'function') workflowSetTacticsField('arenaId', value); else { clubTacticsState().arenaId = value; saveCareerState(); updateMenuUI(); }
      showStatus('BATTLEGROUND CHANGE STAGED · SAVE CHANGES');
      return true;
    }
    const decision = event.target.closest('[data-club-decision][data-club-choice]');
    if (decision) {
      clubResolveDecision(decision.dataset.clubDecision, decision.dataset.clubChoice);
      return true;
    }
    return false;
  }

  function clubSwapSubstituteIntoLineup(playerId, starterIndex) {
    if (typeof workflowSwapLineupPlayer === 'function') return workflowSwapLineupPlayer(playerId, starterIndex);
    if (menuContext === 'pause' || appState === 'match') return false;
    return false;
  }

  function handleMatchdayInput(event) {
    const substitute = event.target.closest('[data-club-substitute-player]');
    if (substitute) {
      if (substitute.value !== '') clubSwapSubstituteIntoLineup(substitute.dataset.clubSubstitutePlayer, Number(substitute.value));
      return true;
    }
    const select = event.target.closest('[data-club-role-player]');
    if (!select) return false;
    const player = clubWorkflowSquad().find(item => item.id === select.dataset.clubRolePlayer);
    if (!player) return true;
    const roleId = TEAM_ROLES.some(role => role.id === select.value) ? select.value : player.role;
    if (typeof workflowSetTacticsAssignment === 'function') workflowSetTacticsAssignment(player.id, roleId); else { clubTacticsState().assignments[player.id] = roleId; saveCareerState(); updateMenuUI(); }
    return true;
  }

  clubTacticsState();
  clubDecisionState();
