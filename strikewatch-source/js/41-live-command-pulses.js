/*
 * Strikewatch source module: 41-live-command-pulses.js
 * Purpose: One autonomous live tactical instruction per round, contextual choices,
 * imperfect operator compliance, outcome reporting and commentary-dock presentation.
 *
 * This file is a source fragment. Run `python3 build.py` to regenerate
 * js/strikewatch.dev.js and the standalone release in dist/.
 */

  const LIVE_COMMAND_PULSE_DEFS = Object.freeze({
    regroup: Object.freeze({
      id: 'regroup',
      name: 'REGROUP',
      duration: 10,
      kicker: 'RESTORE SUPPORT DISTANCE',
      summary: 'Operators try to close gaps and rebuild trade support.',
      reason: 'live command regroup'
    }),
    commit: Object.freeze({
      id: 'commit',
      name: 'COMMIT',
      duration: 9,
      kicker: 'PRESS THE CURRENT ROUTE',
      summary: 'Operators increase tempo without receiving combat-stat bonuses.',
      reason: 'live command commit'
    }),
    disengage: Object.freeze({
      id: 'disengage',
      name: 'DISENGAGE',
      duration: 8,
      kicker: 'BREAK THE CONTACT',
      summary: 'Operators seek safer space before resuming autonomous decisions.',
      reason: 'live command disengage'
    }),
    hold: Object.freeze({
      id: 'hold',
      name: 'HOLD TERRITORY',
      duration: 11,
      kicker: 'DEFEND THE CURRENT GROUND',
      summary: 'Operators reduce unnecessary rotations and protect useful positions.',
      reason: 'live command hold'
    }),
    route: Object.freeze({
      id: 'route',
      name: 'SWITCH ROUTE',
      duration: 12,
      kicker: 'REDIRECT THE TEAM',
      summary: 'Operators attempt an alternate authored engagement route.',
      reason: 'live command switch route'
    })
  });

  const LIVE_COMMAND_PROFILE_FIELDS = Object.freeze([
    'teamApproachId', 'teamPriorityId', 'aggression', 'speed', 'coverBias',
    'lowHealthThreshold', 'waitForSupportMultiplier', 'groupBias', 'tradeBias',
    'flankBias', 'holdBias', 'supportRadius', 'spacingBias'
  ]);

  const LIVE_COMMAND_PROTECTED_FIELDS = Object.freeze([
    'maxHealth', 'skill', 'moveSkill', 'accuracyBonus', 'damageMultiplier',
    'damageConsistency', 'criticalChance', 'criticalMultiplier', 'headshotMultiplier',
    'fireRateMultiplier', 'reloadMultiplier', 'armourMaxDurability'
  ]);

  const liveCommandPulseState = {
    round: 0,
    used: false,
    open: false,
    active: false,
    commandId: '',
    startedAt: 0,
    elapsed: 0,
    duration: 0,
    remaining: 0,
    refreshTimer: 0,
    uiTimer: 0,
    options: [],
    responses: [],
    routePlan: null,
    baseline: null,
    snapshots: new Map(),
    protectedSnapshots: new Map(),
    lastOutcome: null,
    completionReason: ''
  };

  function liveCommandBotKey(bot) {
    return bot ? `${Number(bot.team) || 0}:${Number(bot.slot) || 0}` : '';
  }

  function liveCommandOwnedBots(aliveOnly = true) {
    return (Array.isArray(bots) ? bots : []).filter(bot => bot && bot.team === CAREER_OWNED_TEAM && (!aliveOnly || bot.alive));
  }

  function liveCommandOppositionBots(aliveOnly = true) {
    return (Array.isArray(bots) ? bots : []).filter(bot => bot && bot.team !== CAREER_OWNED_TEAM && (!aliveOnly || bot.alive));
  }

  function liveCommandNearestDistance(bot, list) {
    let nearest = Infinity;
    for (const other of list || []) {
      if (!other || other === bot || !other.alive) continue;
      nearest = Math.min(nearest, Math.hypot((Number(other.x) || 0) - (Number(bot.x) || 0), (Number(other.y) || 0) - (Number(bot.y) || 0)));
    }
    return nearest;
  }

  function liveCommandTeamCentroid(teamBots = liveCommandOwnedBots(true)) {
    const living = (teamBots || []).filter(bot => bot?.alive);
    if (!living.length) return null;
    const total = living.reduce((sum, bot) => ({ x: sum.x + (Number(bot.x) || 0), y: sum.y + (Number(bot.y) || 0) }), { x: 0, y: 0 });
    return { x: total.x / living.length, y: total.y / living.length };
  }

  function liveCommandContext() {
    const owned = liveCommandOwnedBots(true);
    const opposition = liveCommandOppositionBots(true);
    const ownedAll = liveCommandOwnedBots(false);
    const centroid = liveCommandTeamCentroid(owned);
    const maxHealth = ownedAll.reduce((sum, bot) => sum + Math.max(1, Number(bot.maxHealth) || 100), 0);
    const totalHealth = ownedAll.reduce((sum, bot) => sum + (bot.alive ? Math.max(0, Number(bot.health) || 0) : 0), 0);
    const nearestAllyDistances = owned.map(bot => liveCommandNearestDistance(bot, owned)).filter(Number.isFinite);
    const supportThreshold = owned.length <= 2 ? 5.1 : 4.25;
    const supported = nearestAllyDistances.filter(value => value <= supportThreshold).length;
    const spread = centroid && owned.length
      ? owned.reduce((sum, bot) => sum + Math.hypot(bot.x - centroid.x, bot.y - centroid.y), 0) / owned.length
      : 0;
    const activeContacts = owned.filter(bot => bot.target?.alive || bot.sightCandidate?.alive || (bot.lastSeen && (Number(bot.lastSeenTimer) || 0) > 0.1)).length;
    const recentPressure = owned.filter(bot => simulationClock - (Number(bot.lastDamageTime) || -999) <= 2.4 || (Number(bot.health) || 0) / Math.max(1, Number(bot.maxHealth) || 100) < 0.52).length;
    const enemyDistances = owned.map(bot => liveCommandNearestDistance(bot, opposition)).filter(Number.isFinite);
    const damageDealt = ownedAll.reduce((sum, bot) => sum + Math.max(0, Number(bot.roundDamageDealt) || 0), 0);
    const damageTaken = ownedAll.reduce((sum, bot) => sum + Math.max(0, Number(bot.roundDamageTaken) || 0), 0);
    return {
      owned,
      opposition,
      alive: owned.length,
      enemyAlive: opposition.length,
      healthRatio: maxHealth > 0 ? clamp(totalHealth / maxHealth, 0, 1) : 0,
      supportedRatio: nearestAllyDistances.length ? supported / nearestAllyDistances.length : 1,
      averageNearestAlly: nearestAllyDistances.length ? nearestAllyDistances.reduce((sum, value) => sum + value, 0) / nearestAllyDistances.length : 0,
      spread,
      activeContacts,
      recentPressure,
      averageEnemyDistance: enemyDistances.length ? enemyDistances.reduce((sum, value) => sum + value, 0) / enemyDistances.length : 99,
      outnumberedBy: Math.max(0, opposition.length - owned.length),
      advantageBy: Math.max(0, owned.length - opposition.length),
      damageDealt,
      damageTaken,
      centroid
    };
  }

  function liveCommandAlternativeRoutePlan() {
    const plans = typeof engagementPlanOptions === 'function' ? engagementPlanOptions(activeArenaId) : [];
    const alternatives = plans.filter(plan => plan?.id && plan.id !== currentEngagementPlan?.id);
    if (!alternatives.length) return null;
    const context = liveCommandContext();
    const centroid = context.centroid || { x: MAP_W * 0.5, y: MAP_H * 0.5 };
    const scored = alternatives.map((plan, index) => {
      const points = CAREER_OWNED_TEAM === TEAM_RED ? plan.red : plan.blue;
      const point = points?.[0] || { x: MAP_W * 0.5, y: MAP_H * 0.5 };
      const distanceFromTeam = Math.hypot((Number(point.x) || 0) - centroid.x, (Number(point.y) || 0) - centroid.y);
      const tieBreak = ((Math.max(1, Number(roundNumber) || 1) + index) % Math.max(1, alternatives.length)) * 0.01;
      return { plan, score: distanceFromTeam + tieBreak };
    }).sort((a, b) => b.score - a.score || String(a.plan.id).localeCompare(String(b.plan.id)));
    const selected = scored[0]?.plan || alternatives[0];
    return selected ? {
      id: selected.id,
      name: selected.name,
      zone: selected.zone || null,
      arenaId: activeArenaId,
      blue: cloneArenaList(selected.blue),
      red: cloneArenaList(selected.red),
      selectedAtRound: Math.max(1, Number(roundNumber) || 1)
    } : null;
  }

  function liveCommandOptionCandidates() {
    const context = liveCommandContext();
    const routePlan = liveCommandAlternativeRoutePlan();
    const healthPercent = Math.round(context.healthRatio * 100);
    const supportPercent = Math.round(context.supportedRatio * 100);
    const scores = [
      {
        id: 'regroup',
        score: 24 + (1 - context.supportedRatio) * 78 + Math.min(24, context.spread * 4.8) + context.outnumberedBy * 7,
        contextText: `${supportPercent}% currently inside support distance.`,
        routePlan: null
      },
      {
        id: 'disengage',
        score: 8 + (1 - context.healthRatio) * 62 + context.outnumberedBy * 15 + context.recentPressure * 8 + context.activeContacts * 4,
        contextText: `${healthPercent}% team health · ${context.recentPressure} operator${context.recentPressure === 1 ? '' : 's'} under pressure.`,
        routePlan: null
      },
      {
        id: 'commit',
        score: 22 + context.healthRatio * 26 + context.advantageBy * 12 + context.activeContacts * 6 + context.supportedRatio * 10 - context.outnumberedBy * 12 - context.recentPressure * 4,
        contextText: `${context.alive} vs ${context.enemyAlive} alive · ${context.activeContacts || 'no'} confirmed contact${context.activeContacts === 1 ? '' : 's'}.`,
        routePlan: null
      },
      {
        id: 'hold',
        score: 18 + context.activeContacts * 8 + context.advantageBy * 10 + context.supportedRatio * 12 + Math.max(0, 14 - context.spread * 2.5),
        contextText: `${context.alive} positions can be anchored while contacts develop.`,
        routePlan: null
      },
      routePlan ? {
        id: 'route',
        score: 19 + (context.activeContacts === 0 ? 28 : 0) + Math.max(0, 16 - context.recentPressure * 4) + Math.min(12, context.averageEnemyDistance * 0.8),
        contextText: `Redirect through ${String(routePlan.name || 'an alternate lane').toUpperCase()}.`,
        routePlan
      } : null
    ].filter(Boolean);
    return scores
      .map((candidate, index) => ({ ...candidate, order: index, def: LIVE_COMMAND_PULSE_DEFS[candidate.id] }))
      .sort((a, b) => b.score - a.score || a.order - b.order)
      .slice(0, 3);
  }

  function liveCommandPulseAvailability() {
    if (typeof appState !== 'undefined' && appState !== 'match') return { ready: false, reason: 'AVAILABLE DURING A LIVE MATCH' };
    if (newPlayerDemoState?.active) return { ready: false, reason: 'LOCKED DURING GUIDED ORIENTATION' };
    if (!careerState?.created) return { ready: false, reason: 'CREATE A CLUB TO ISSUE COMMANDS' };
    if (careerMatchComplete || matchEnding) return { ready: false, reason: 'MATCH COMPLETE' };
    if (roundEnding) return { ready: false, reason: 'ROUND COMPLETE' };
    if (typeof careerMatchIntroActive === 'function' && careerMatchIntroActive()) return { ready: false, reason: 'WAITING FOR DEPLOYMENT' };
    if ((Number(roundFreezeTimer) || 0) > 0) return { ready: false, reason: 'AVAILABLE WHEN THE ROUND IS LIVE' };
    if (liveCommandPulseState.active) return { ready: false, reason: 'COMMAND IN PROGRESS' };
    if (liveCommandPulseState.used && liveCommandPulseState.round === roundNumber) return { ready: false, reason: 'COMMAND ALREADY USED THIS ROUND' };
    if (!liveCommandOwnedBots(true).length) return { ready: false, reason: 'NO LIVING OPERATORS' };
    return { ready: true, reason: 'ONE COMMAND AVAILABLE THIS ROUND' };
  }

  function updateMatchCommentaryPresentation() {
    const panelOpen = Boolean(liveCommandPulseState.open && commandPulsePanelEl && !commandPulsePanelEl.hidden);
    const hasFeed = Boolean(feedEl && !feedEl.hidden && feedEl.textContent.trim());
    const hasMoment = Boolean(careerMatchMomentEl && !careerMatchMomentEl.hidden && careerMatchMomentEl.textContent.trim());
    if (matchCommentaryIdleEl) matchCommentaryIdleEl.hidden = panelOpen || hasFeed || hasMoment;
    if (matchCommentaryDockEl) matchCommentaryDockEl.classList.toggle('panel-open', panelOpen);
    if (matchCommentaryRoundEl) {
      let stateLabel = 'STANDBY';
      if (roundEnding || matchEnding) stateLabel = 'ROUND COMPLETE';
      else if (panelOpen) stateLabel = 'CHOOSE COMMAND';
      else if (liveCommandPulseState.active) stateLabel = `${LIVE_COMMAND_PULSE_DEFS[liveCommandPulseState.commandId]?.name || 'COMMAND'} ACTIVE`;
      else if (liveCommandPulseState.used && liveCommandPulseState.round === roundNumber) stateLabel = 'COMMAND SPENT';
      else if ((Number(roundFreezeTimer) || 0) > 0) stateLabel = 'PREPARATION';
      else if (typeof appState !== 'undefined' && appState === 'match') stateLabel = 'ROUND LIVE';
      matchCommentaryRoundEl.textContent = `ROUND ${Math.max(1, Number(roundNumber) || 1)} · ${stateLabel}`;
    }
  }

  function renderLiveCommandPulseButtons() {
    const availability = liveCommandPulseAvailability();
    const def = LIVE_COMMAND_PULSE_DEFS[liveCommandPulseState.commandId] || null;
    let label = 'COMMAND LOCKED';
    let mode = 'locked';
    if (liveCommandPulseState.active && def) {
      label = `${def.name} · ${Math.max(1, Math.ceil(liveCommandPulseState.remaining))}S`;
      mode = 'active';
    } else if (liveCommandPulseState.used && liveCommandPulseState.round === roundNumber) {
      label = 'COMMAND USED';
      mode = 'used';
    } else if (availability.ready) {
      label = 'COMMAND READY';
      mode = 'ready';
    }
    for (const button of [commandPulseBtn, portraitCommandPulseBtn]) {
      if (!button) continue;
      button.textContent = label;
      button.disabled = !availability.ready;
      button.classList.toggle('active', mode === 'active');
      button.classList.toggle('used', mode === 'used');
      button.dataset.commandState = mode;
      button.title = availability.reason;
      button.setAttribute('aria-label', `${label}. ${availability.reason}`);
    }
    if (commandPulseStatusEl && !liveCommandPulseState.open) commandPulseStatusEl.textContent = availability.reason;
    updateMatchCommentaryPresentation();
  }

  function renderLiveCommandPulseOptions() {
    if (!commandPulseOptionsEl) return;
    const options = liveCommandPulseState.options || [];
    commandPulseOptionsEl.innerHTML = options.map((option, index) => {
      const def = option.def || LIVE_COMMAND_PULSE_DEFS[option.id];
      return `<button class="command-pulse-option" type="button" data-live-command="${escapeCareerHtml(option.id)}"><span>OPTION ${index + 1} · ${escapeCareerHtml(def.kicker)}</span><strong>${escapeCareerHtml(def.name)}</strong><small>${escapeCareerHtml(option.contextText)} <em>${escapeCareerHtml(def.summary)}</em></small></button>`;
    }).join('');
  }

  function openLiveCommandPulsePanel() {
    const availability = liveCommandPulseAvailability();
    if (!availability.ready || !commandPulsePanelEl) {
      if (typeof showStatus === 'function') showStatus(availability.reason);
      renderLiveCommandPulseButtons();
      return false;
    }
    if (typeof ensureAudio === 'function') ensureAudio();
    if (typeof closeScoreboard === 'function') closeScoreboard();
    if (typeof setTacticalMinimapVisible === 'function' && typeof tacticalMinimapVisible !== 'undefined' && tacticalMinimapVisible) {
      setTacticalMinimapVisible(false, false);
    }
    liveCommandPulseState.options = liveCommandOptionCandidates();
    if (liveCommandPulseState.options.length !== 3) return false;
    liveCommandPulseState.open = true;
    commandPulsePanelEl.hidden = false;
    commandPulsePanelEl.setAttribute('aria-hidden', 'false');
    if (commandPulsePanelTitleEl) commandPulsePanelTitleEl.textContent = `ROUND ${Math.max(1, roundNumber)} · LIVE COMMAND`;
    if (commandPulseStatusEl) commandPulseStatusEl.textContent = 'Choose one broad instruction. Operators may follow immediately, react late or remain pinned.';
    renderLiveCommandPulseOptions();
    renderLiveCommandPulseButtons();
    requestAnimationFrame(() => commandPulseOptionsEl?.querySelector('button')?.focus({ preventScroll: true }));
    return true;
  }

  function closeLiveCommandPulsePanel() {
    liveCommandPulseState.open = false;
    if (commandPulsePanelEl) {
      commandPulsePanelEl.hidden = true;
      commandPulsePanelEl.setAttribute('aria-hidden', 'true');
    }
    renderLiveCommandPulseButtons();
    return true;
  }

  function liveCommandOperatorAwareness(bot) {
    return clamp(Number(bot?.rpgStats?.awareness ?? bot?.simulatedStats?.awareness ?? 5), 1, 10);
  }

  function liveCommandRoleBonus(commandId, roleId) {
    const role = String(roleId || 'flex');
    const bonuses = {
      regroup: { caller: 17, support: 12, anchor: 8, marksman: 4 },
      commit: { caller: 15, entry: 13, support: 5, flanker: 7 },
      disengage: { caller: 17, support: 12, anchor: 6, marksman: 5 },
      hold: { caller: 9, anchor: 16, marksman: 12, support: 10 },
      route: { caller: 17, flanker: 13, entry: 8, support: 5 }
    };
    return Number(bonuses[commandId]?.[role]) || 0;
  }

  function liveCommandBuildResponses(commandId) {
    const living = liveCommandOwnedBots(true);
    const responses = living.map(bot => {
      const healthRatio = (Number(bot.health) || 0) / Math.max(1, Number(bot.maxHealth) || 100);
      const pinned = Boolean(bot.target?.alive || bot.sightCandidate?.alive || simulationClock - (Number(bot.lastDamageTime) || -999) <= 1.8);
      const score = 27
        + liveCommandOperatorAwareness(bot) * 6
        + liveCommandRoleBonus(commandId, bot.playerRole)
        + (bot.playerRole === 'caller' ? 5 : 0)
        - (pinned ? 16 : 0)
        - (healthRatio < 0.34 ? 13 : 0)
        + ((Math.max(1, Number(roundNumber) || 1) * 7 + (Number(bot.slot) || 0) * 11) % 9);
      let initialStatus = score >= 71 ? 'following' : (score >= 48 ? 'delayed' : 'unable');
      const delay = initialStatus === 'delayed' ? 0.72 + ((Number(bot.slot) || 0) % 4) * 0.22 + (pinned ? 0.34 : 0) : 0;
      return {
        botKey: liveCommandBotKey(bot),
        playerId: bot.playerProfileId || null,
        name: bot.name || `Operator ${Number(bot.slot) + 1}`,
        role: bot.playerRole || 'flex',
        score: Math.round(score),
        initialStatus,
        status: initialStatus,
        delay,
        activationAt: delay,
        activated: false,
        goalReached: false,
        holdAnchor: { x: bot.x, y: bot.y },
        startZone: levelZoneAt(bot.x, bot.y)?.short || '',
        endZone: '',
        unableReason: initialStatus === 'unable' ? (pinned ? 'pinned by active contact' : 'did not interpret the call in time') : ''
      };
    });
    const minimumResponders = Math.min(responses.length, Math.max(2, Math.ceil(responses.length * 0.6)));
    const responsive = responses.filter(item => item.initialStatus !== 'unable').length;
    if (responsive < minimumResponders) {
      responses
        .filter(item => item.initialStatus === 'unable')
        .sort((a, b) => b.score - a.score || a.botKey.localeCompare(b.botKey))
        .slice(0, minimumResponders - responsive)
        .forEach((item, index) => {
          item.initialStatus = 'delayed';
          item.status = 'delayed';
          item.delay = 1.05 + index * 0.24;
          item.activationAt = item.delay;
          item.unableReason = '';
        });
    }
    if (responses.length && !responses.some(item => item.initialStatus === 'following')) {
      const firstResponder = responses
        .filter(item => item.initialStatus !== 'unable')
        .sort((a, b) => b.score - a.score || a.botKey.localeCompare(b.botKey))[0];
      if (firstResponder) {
        firstResponder.initialStatus = 'following';
        firstResponder.status = 'following';
        firstResponder.delay = 0;
        firstResponder.activationAt = 0;
      }
    }
    return responses;
  }

  function liveCommandCaptureBotFields(bot) {
    const snapshot = {};
    for (const field of LIVE_COMMAND_PROFILE_FIELDS) snapshot[field] = bot[field];
    return snapshot;
  }

  function liveCommandCaptureProtectedFields(bot) {
    const snapshot = {};
    for (const field of LIVE_COMMAND_PROTECTED_FIELDS) snapshot[field] = bot[field];
    snapshot.primaryDamageMin = bot.primaryWeapon?.damageMin;
    snapshot.primaryDamageMax = bot.primaryWeapon?.damageMax;
    snapshot.secondaryDamageMin = bot.secondaryWeapon?.damageMin;
    snapshot.secondaryDamageMax = bot.secondaryWeapon?.damageMax;
    snapshot.primaryAccuracy = bot.primaryWeapon?.accuracy;
    snapshot.secondaryAccuracy = bot.secondaryWeapon?.accuracy;
    snapshot.primaryFireRate = bot.primaryWeapon?.fireRate;
    snapshot.secondaryFireRate = bot.secondaryWeapon?.fireRate;
    return snapshot;
  }

  function liveCommandRestoreBot(bot) {
    if (!bot) return;
    const key = liveCommandBotKey(bot);
    const commandId = bot.liveCommandId;
    const snapshot = liveCommandPulseState.snapshots.get(key);
    if (snapshot) {
      for (const field of LIVE_COMMAND_PROFILE_FIELDS) bot[field] = snapshot[field];
    }
    if ((commandId === 'disengage' && bot.tacticalMode === 'fallback') || (commandId === 'hold' && bot.tacticalMode === 'hold')) bot.tacticalModeTimer = 0;
    if (commandId === 'disengage') bot.combatRepositionRequested = false;
    bot.liveCommandId = '';
    bot.liveCommandName = '';
    bot.liveCommandGoal = null;
    bot.liveCommandUntil = 0;
    bot.liveCommandResponse = 'idle';
    bot.liveCommandGoalReached = false;
    bot.liveCommandHoldAnchor = null;
    bot.liveCommandRoutePlanId = '';
    bot.pathRefreshNeeded = true;
    bot.tacticalDecisionTimer = 0;
  }

  function liveCommandApplyProfile(bot, commandId) {
    if (!bot?.alive) return false;
    const key = liveCommandBotKey(bot);
    if (!liveCommandPulseState.snapshots.has(key)) liveCommandPulseState.snapshots.set(key, liveCommandCaptureBotFields(bot));
    if (!liveCommandPulseState.protectedSnapshots.has(key)) liveCommandPulseState.protectedSnapshots.set(key, liveCommandCaptureProtectedFields(bot));
    switch (commandId) {
      case 'regroup':
        bot.teamPriorityId = 'group';
        bot.aggression = clamp((Number(bot.aggression) || 0.55) - 0.08, 0.2, 0.92);
        bot.speed = Math.max(0.72, (Number(bot.speed) || 1.1) * 0.97);
        bot.coverBias = (Number(bot.coverBias) || 0) + 0.08;
        bot.waitForSupportMultiplier = Math.max(1.24, Number(bot.waitForSupportMultiplier) || 1);
        bot.groupBias = clamp((Number(bot.groupBias) || 0) + 0.72, 0, 1.6);
        bot.tradeBias = clamp((Number(bot.tradeBias) || 0) + 0.24, 0, 1.5);
        bot.flankBias = Math.min(Number(bot.flankBias) || 0, 0.25);
        bot.supportRadius = Math.max(5.1, Number(bot.supportRadius) || 3.55);
        break;
      case 'commit':
        bot.teamApproachId = 'aggressive';
        bot.aggression = clamp((Number(bot.aggression) || 0.55) + 0.19, 0.28, 0.98);
        bot.speed = Math.min(1.75, (Number(bot.speed) || 1.1) * 1.08);
        bot.coverBias = (Number(bot.coverBias) || 0) - 0.07;
        bot.waitForSupportMultiplier = clamp((Number(bot.waitForSupportMultiplier) || 1) * 0.78, 0.62, 1.28);
        bot.tradeBias = clamp((Number(bot.tradeBias) || 0) + 0.13, 0, 1.5);
        break;
      case 'disengage':
        bot.teamApproachId = 'cautious';
        bot.aggression = Math.min(Number(bot.aggression) || 0.55, 0.43);
        bot.speed = Math.min(1.72, (Number(bot.speed) || 1.1) * 1.04);
        bot.coverBias = (Number(bot.coverBias) || 0) + 0.26;
        bot.lowHealthThreshold = Math.max(0.72, Number(bot.lowHealthThreshold) || 0.43);
        bot.waitForSupportMultiplier = Math.max(1.18, Number(bot.waitForSupportMultiplier) || 1);
        bot.groupBias = clamp((Number(bot.groupBias) || 0) + 0.28, 0, 1.5);
        bot.tacticalMode = 'fallback';
        bot.tacticalModeTimer = Math.max(Number(bot.tacticalModeTimer) || 0, 1.2);
        bot.combatRepositionRequested = true;
        break;
      case 'hold':
        bot.teamPriorityId = 'hold';
        bot.aggression = clamp((Number(bot.aggression) || 0.55) * 0.84, 0.2, 0.8);
        bot.speed = Math.max(0.68, (Number(bot.speed) || 1.1) * 0.9);
        bot.coverBias = (Number(bot.coverBias) || 0) + 0.21;
        bot.holdBias = clamp((Number(bot.holdBias) || 0) + 0.78, 0, 1.6);
        bot.supportRadius = Math.max(4.1, Number(bot.supportRadius) || 3.55);
        if (!bot.target && !bot.sightCandidate) bot.tacticalMode = 'hold';
        break;
      case 'route':
        bot.teamPriorityId = 'group';
        bot.speed = Math.min(1.72, (Number(bot.speed) || 1.1) * 1.04);
        bot.groupBias = clamp((Number(bot.groupBias) || 0) + 0.34, 0, 1.5);
        bot.flankBias = clamp((Number(bot.flankBias) || 0) + (bot.playerRole === 'flanker' ? 0.3 : 0.08), 0, 1.5);
        bot.waitForSupportMultiplier = Math.max(0.94, Number(bot.waitForSupportMultiplier) || 1);
        break;
      default:
        return false;
    }
    bot.liveCommandId = commandId;
    bot.liveCommandName = LIVE_COMMAND_PULSE_DEFS[commandId]?.name || 'COMMAND';
    bot.liveCommandResponse = 'following';
    bot.liveCommandUntil = simulationClock + Math.max(0, liveCommandPulseState.remaining);
    bot.liveCommandGoalReached = false;
    bot.liveCommandRoutePlanId = liveCommandPulseState.routePlan?.id || '';
    bot.lastTacticalReason = LIVE_COMMAND_PULSE_DEFS[commandId]?.reason || 'live command';
    bot.tacticalDecisionTimer = 0;
    bot.coordinationRepathCooldown = 0;
    bot.pathRefreshNeeded = true;
    return true;
  }

  function liveCommandGoalForRegroup(bot, responsiveBots) {
    const centroid = liveCommandTeamCentroid(responsiveBots) || liveCommandTeamCentroid();
    if (!centroid) return bot.objective || null;
    const slotAngle = ((Number(bot.slot) || 0) / 5) * TAU + (CAREER_OWNED_TEAM === TEAM_RED ? Math.PI : 0);
    const radius = bot.playerRole === 'anchor' || bot.playerRole === 'marksman' ? 1.05 : 0.72;
    return nearestWalkablePoint(centroid.x + Math.cos(slotAngle) * radius, centroid.y + Math.sin(slotAngle) * radius);
  }

  function liveCommandGoalForDisengage(bot) {
    const enemies = liveCommandOppositionBots(true);
    const closest = enemies.slice().sort((a, b) => dist(bot, a) - dist(bot, b))[0] || null;
    const teamCentre = liveCommandTeamCentroid();
    let awayAngle = closest ? Math.atan2(bot.y - closest.y, bot.x - closest.x) : (bot.angle + Math.PI);
    if (teamCentre && Math.hypot(teamCentre.x - bot.x, teamCentre.y - bot.y) > 1.5) {
      const teamAngle = Math.atan2(teamCentre.y - bot.y, teamCentre.x - bot.x);
      awayAngle += angleDiff(teamAngle, awayAngle) * 0.28;
    }
    const candidates = [-0.58, -0.28, 0, 0.28, 0.58].map(offset => {
      const distance = 3.8 + Math.abs(offset) * 1.15;
      const point = nearestWalkablePoint(bot.x + Math.cos(awayAngle + offset) * distance, bot.y + Math.sin(awayAngle + offset) * distance);
      const nearestEnemy = liveCommandNearestDistance(point, enemies);
      const teamDistance = teamCentre ? Math.hypot(point.x - teamCentre.x, point.y - teamCentre.y) : 0;
      return { point, score: (Number.isFinite(nearestEnemy) ? nearestEnemy : 12) - teamDistance * 0.16 };
    }).sort((a, b) => b.score - a.score);
    return candidates[0]?.point || bot.objective || null;
  }

  function liveCommandGoalForBot(bot, response, responsiveBots) {
    switch (liveCommandPulseState.commandId) {
      case 'regroup': return liveCommandGoalForRegroup(bot, responsiveBots);
      case 'commit': return null;
      case 'disengage': return liveCommandGoalForDisengage(bot);
      case 'hold': return nearestWalkablePoint(response.holdAnchor?.x ?? bot.x, response.holdAnchor?.y ?? bot.y);
      case 'route': return engagementPlanObjectiveForBot(liveCommandPulseState.routePlan, bot);
      default: return null;
    }
  }

  function liveCommandActivateResponse(response) {
    if (!response || response.activated || response.status === 'unable') return false;
    const bot = liveCommandOwnedBots(false).find(candidate => liveCommandBotKey(candidate) === response.botKey);
    if (!bot?.alive) {
      response.status = 'unable';
      response.unableReason = 'eliminated before the instruction could be followed';
      return false;
    }
    response.activated = liveCommandApplyProfile(bot, liveCommandPulseState.commandId);
    response.status = response.activated ? 'following' : 'unable';
    if (!response.activated) response.unableReason = 'could not enter the requested tactical state';
    return response.activated;
  }

  function refreshLiveCommandGoals(force = false) {
    if (!liveCommandPulseState.active) return false;
    const responsiveBots = [];
    for (const response of liveCommandPulseState.responses) {
      if (response.status === 'delayed' && liveCommandPulseState.elapsed >= response.activationAt) liveCommandActivateResponse(response);
      if (response.status !== 'following' || !response.activated) continue;
      const bot = liveCommandOwnedBots(false).find(candidate => liveCommandBotKey(candidate) === response.botKey);
      if (bot?.alive) responsiveBots.push(bot);
    }
    for (const response of liveCommandPulseState.responses) {
      if (response.status !== 'following' || !response.activated) continue;
      const bot = responsiveBots.find(candidate => liveCommandBotKey(candidate) === response.botKey);
      if (!bot?.alive) continue;
      const goal = liveCommandGoalForBot(bot, response, responsiveBots);
      bot.liveCommandUntil = simulationClock + Math.max(0, liveCommandPulseState.remaining);
      if (!goal) continue;
      const safeGoal = nearestWalkablePoint(goal.x, goal.y);
      const shifted = !bot.liveCommandGoal || Math.hypot(bot.liveCommandGoal.x - safeGoal.x, bot.liveCommandGoal.y - safeGoal.y) > 0.92;
      bot.liveCommandGoal = { ...safeGoal };
      bot.liveCommandHoldAnchor = liveCommandPulseState.commandId === 'hold' ? { ...safeGoal } : null;
      if (dist(bot, safeGoal) < (liveCommandPulseState.commandId === 'route' ? 1.15 : 0.86)) {
        response.goalReached = true;
        bot.liveCommandGoalReached = true;
      }
      if (force || shifted) {
        bot.path = [];
        bot.pathIndex = 0;
        bot.pathGoal = null;
        bot.pathRefreshNeeded = true;
        bot.repathTimer = 0;
      }
    }
    return true;
  }

  function liveCommandCaptureMetrics() {
    const context = liveCommandContext();
    const ownedAll = liveCommandOwnedBots(false);
    return {
      alive: context.alive,
      enemyAlive: context.enemyAlive,
      totalHealth: ownedAll.reduce((sum, bot) => sum + (bot.alive ? Math.max(0, Number(bot.health) || 0) : 0), 0),
      healthRatio: context.healthRatio,
      supportedRatio: context.supportedRatio,
      averageNearestAlly: context.averageNearestAlly,
      spread: context.spread,
      averageEnemyDistance: context.averageEnemyDistance,
      damageDealt: context.damageDealt,
      damageTaken: context.damageTaken,
      zones: Object.fromEntries(ownedAll.map(bot => [liveCommandBotKey(bot), levelZoneAt(bot.x, bot.y)?.short || '']))
    };
  }

  function liveCommandProtectedFieldAudit() {
    const changes = [];
    for (const bot of liveCommandOwnedBots(false)) {
      const before = liveCommandPulseState.protectedSnapshots.get(liveCommandBotKey(bot));
      if (!before) continue;
      const after = liveCommandCaptureProtectedFields(bot);
      for (const [field, beforeValue] of Object.entries(before)) {
        const afterValue = after[field];
        if (typeof beforeValue === 'number' && typeof afterValue === 'number') {
          if (Math.abs(beforeValue - afterValue) > 0.000001) changes.push({ botKey: liveCommandBotKey(bot), field, before: beforeValue, after: afterValue });
        } else if (beforeValue !== afterValue) changes.push({ botKey: liveCommandBotKey(bot), field, before: beforeValue, after: afterValue });
      }
    }
    return changes;
  }

  function liveCommandOutcome() {
    const def = LIVE_COMMAND_PULSE_DEFS[liveCommandPulseState.commandId];
    const before = liveCommandPulseState.baseline || liveCommandCaptureMetrics();
    const after = liveCommandCaptureMetrics();
    const immediate = liveCommandPulseState.responses.filter(item => item.initialStatus === 'following' && item.activated).length;
    const delayed = liveCommandPulseState.responses.filter(item => item.initialStatus === 'delayed' && item.activated).length;
    const unable = liveCommandPulseState.responses.filter(item => item.status === 'unable').length;
    const responders = immediate + delayed;
    const reached = liveCommandPulseState.responses.filter(item => item.goalReached).length;
    const enemyLoss = Math.max(0, before.enemyAlive - after.enemyAlive);
    const ownLoss = Math.max(0, before.alive - after.alive);
    const damageGain = Math.max(0, after.damageDealt - before.damageDealt);
    const damageReceived = Math.max(0, after.damageTaken - before.damageTaken);
    const supportDelta = after.supportedRatio - before.supportedRatio;
    const spacingGain = before.averageNearestAlly - after.averageNearestAlly;
    const distanceGain = after.averageEnemyDistance - before.averageEnemyDistance;
    const zoneChanges = liveCommandPulseState.responses.reduce((count, response) => {
      const bot = liveCommandOwnedBots(false).find(candidate => liveCommandBotKey(candidate) === response.botKey);
      response.endZone = bot ? (levelZoneAt(bot.x, bot.y)?.short || '') : '';
      return count + (response.startZone && response.endZone && response.startZone !== response.endZone ? 1 : 0);
    }, 0);
    let status = 'mixed';
    let title = 'PARTIAL COMPLIANCE';
    let detail = `${responders} operator${responders === 1 ? '' : 's'} interpreted the command before it expired.`;
    if (liveCommandPulseState.commandId === 'regroup') {
      if (supportDelta >= 0.14 || spacingGain >= 0.75) {
        status = 'success'; title = 'SUPPORT DISTANCE RESTORED'; detail = `Supported spacing improved by ${Math.max(0, Math.round(supportDelta * 100))} points and the average gap changed by ${spacingGain.toFixed(1)}m.`;
      } else if (supportDelta < -0.08 && ownLoss > 0) {
        status = 'failed'; title = 'REGROUP INTERRUPTED'; detail = `${ownLoss} operator${ownLoss === 1 ? '' : 's'} fell before the team could close its support gaps.`;
      } else detail = `${reached} operator${reached === 1 ? '' : 's'} reached the regroup shape; the full team did not settle before the pulse ended.`;
    } else if (liveCommandPulseState.commandId === 'commit') {
      if (enemyLoss > 0 || damageGain >= 58) {
        status = 'success'; title = 'PRESSURE CONVERTED'; detail = `${enemyLoss} opposition elimination${enemyLoss === 1 ? '' : 's'} and ${Math.round(damageGain)} damage followed the commit call.`;
      } else if (ownLoss > 0 && damageGain < 24) {
        status = 'failed'; title = 'COMMITMENT PUNISHED'; detail = `${ownLoss} operator${ownLoss === 1 ? '' : 's'} fell while only ${Math.round(damageGain)} damage was converted.`;
      } else detail = `${Math.round(damageGain)} damage was created, but the pressure did not produce a decisive elimination.`;
    } else if (liveCommandPulseState.commandId === 'disengage') {
      if (ownLoss === 0 && (distanceGain >= 0.65 || damageReceived <= 34)) {
        status = 'success'; title = 'TEAM RESET PRESERVED'; detail = `No operator was lost; separation from the nearest opposition improved by ${Math.max(0, distanceGain).toFixed(1)}m.`;
      } else if (ownLoss >= 2) {
        status = 'failed'; title = 'BREAK CONTACT FAILED'; detail = `${ownLoss} operators were eliminated before safe space could be established.`;
      } else detail = `${Math.max(0, before.alive - ownLoss)} operators survived the reset, with ${Math.round(damageReceived)} damage received during withdrawal.`;
    } else if (liveCommandPulseState.commandId === 'hold') {
      if (ownLoss === 0 && (damageGain >= damageReceived || enemyLoss > 0)) {
        status = 'success'; title = 'TERRITORY HELD'; detail = `The team preserved every operator while dealing ${Math.round(damageGain)} damage from the held shape.`;
      } else if (ownLoss >= 2) {
        status = 'failed'; title = 'HOLD BROKEN'; detail = `${ownLoss} operators were removed from the defended positions.`;
      } else detail = `${before.alive - ownLoss} operators remained; the held ground produced ${Math.round(damageGain)} damage.`;
    } else if (liveCommandPulseState.commandId === 'route') {
      const target = Math.max(1, Math.ceil(responders * 0.5));
      if (reached >= target || zoneChanges >= target) {
        status = 'success'; title = 'ROUTE SWITCH COMPLETED'; detail = `${Math.max(reached, zoneChanges)} operators reached the alternate ${String(liveCommandPulseState.routePlan?.name || 'route').toUpperCase()} shape.`;
      } else if (reached === 0 && zoneChanges === 0) {
        status = 'failed'; title = 'ROUTE SWITCH DENIED'; detail = 'Active contact prevented the team from entering the alternate route.';
      } else detail = `${Math.max(reached, zoneChanges)} operator${Math.max(reached, zoneChanges) === 1 ? '' : 's'} changed lanes before the pulse ended.`;
    }
    const protectedChanges = liveCommandProtectedFieldAudit();
    return {
      round: Math.max(1, Number(liveCommandPulseState.round) || Number(roundNumber) || 1),
      commandId: liveCommandPulseState.commandId,
      commandName: def?.name || 'LIVE COMMAND',
      status,
      tone: status === 'success' ? 'advantage' : (status === 'failed' ? 'danger' : 'adjustment'),
      title,
      detail,
      duration: Number(liveCommandPulseState.duration.toFixed(2)),
      durationUsed: Number(Math.min(liveCommandPulseState.duration, liveCommandPulseState.elapsed).toFixed(2)),
      responders,
      immediate,
      delayed,
      unable,
      reached,
      routePlanId: liveCommandPulseState.routePlan?.id || null,
      routePlanName: liveCommandPulseState.routePlan?.name || null,
      protectedFieldChanges: protectedChanges,
      evidence: {
        before, after, enemyLoss, ownLoss, damageGain: Math.round(damageGain), damageReceived: Math.round(damageReceived),
        supportDelta: Number(supportDelta.toFixed(3)), spacingGain: Number(spacingGain.toFixed(2)), distanceGain: Number(distanceGain.toFixed(2)), zoneChanges
      },
      responses: liveCommandPulseState.responses.map(item => ({
        playerId: item.playerId, name: item.name, role: item.role, initialStatus: item.initialStatus,
        status: item.status, score: item.score, delay: Number(item.delay.toFixed(2)), goalReached: item.goalReached,
        unableReason: item.unableReason || '', startZone: item.startZone || '', endZone: item.endZone || ''
      }))
    };
  }

  function completeLiveCommandPulse(reason = 'expired', winner = null, options = {}) {
    if (!liveCommandPulseState.active) {
      if (liveCommandPulseState.open || (commandPulsePanelEl && !commandPulsePanelEl.hidden)) closeLiveCommandPulsePanel();
      return liveCommandPulseState.lastOutcome;
    }
    liveCommandPulseState.completionReason = String(reason || 'expired');
    const outcome = liveCommandOutcome();
    outcome.completionReason = liveCommandPulseState.completionReason;
    outcome.roundWinner = winner === TEAM_BLUE || winner === TEAM_RED ? winner : null;
    for (const bot of liveCommandOwnedBots(false)) liveCommandRestoreBot(bot);
    liveCommandPulseState.active = false;
    liveCommandPulseState.remaining = 0;
    liveCommandPulseState.open = false;
    liveCommandPulseState.lastOutcome = outcome;
    if (commandPulsePanelEl) {
      commandPulsePanelEl.hidden = true;
      commandPulsePanelEl.setAttribute('aria-hidden', 'true');
    }
    if (!options.silent && careerMatchStats) {
      careerMatchStats.liveCommands = Array.isArray(careerMatchStats.liveCommands) ? careerMatchStats.liveCommands : [];
      careerMatchStats.liveCommands.push(JSON.parse(JSON.stringify(outcome)));
      if (typeof recordCareerMatchHighlight === 'function') {
        recordCareerMatchHighlight({
          id: `live-command:${outcome.round}:${outcome.commandId}`,
          type: 'live-command',
          label: `LIVE COMMAND · ${outcome.commandName}`,
          title: outcome.title,
          detail: outcome.detail,
          tone: outcome.tone,
          priority: outcome.status === 'success' ? 82 : (outcome.status === 'failed' ? 68 : 72),
          evidence: { ...outcome.evidence, responders: outcome.responders, delayed: outcome.delayed, unable: outcome.unable }
        });
      }
      if (typeof addSystemFeed === 'function') addSystemFeed(`COMMAND REVIEW · ${outcome.title} · ${outcome.detail}`);
      if (typeof queueCareerMatchMoment === 'function') queueCareerMatchMoment(`command-outcome:${outcome.round}`, 'LIVE COMMAND REVIEW', outcome.title, outcome.detail, outcome.tone, 3.8, outcome.status !== 'mixed');
    }
    renderLiveCommandPulseButtons();
    return outcome;
  }

  function issueLiveCommandPulse(commandId) {
    const availability = liveCommandPulseAvailability();
    if (!availability.ready) return { ok: false, reason: availability.reason };
    const option = (liveCommandPulseState.options || []).find(item => item.id === commandId)
      || liveCommandOptionCandidates().find(item => item.id === commandId);
    if (!option) return { ok: false, reason: 'That command is not available in the current context.' };
    const def = LIVE_COMMAND_PULSE_DEFS[option.id];
    liveCommandPulseState.round = Math.max(1, Number(roundNumber) || 1);
    liveCommandPulseState.used = true;
    liveCommandPulseState.open = false;
    liveCommandPulseState.active = true;
    liveCommandPulseState.commandId = def.id;
    liveCommandPulseState.startedAt = simulationClock;
    liveCommandPulseState.elapsed = 0;
    liveCommandPulseState.duration = def.duration;
    liveCommandPulseState.remaining = def.duration;
    liveCommandPulseState.refreshTimer = 0;
    liveCommandPulseState.uiTimer = 0;
    liveCommandPulseState.routePlan = option.routePlan ? JSON.parse(JSON.stringify(option.routePlan)) : null;
    liveCommandPulseState.baseline = liveCommandCaptureMetrics();
    liveCommandPulseState.responses = liveCommandBuildResponses(def.id);
    liveCommandPulseState.snapshots = new Map();
    liveCommandPulseState.protectedSnapshots = new Map();
    liveCommandPulseState.lastOutcome = null;
    if (commandPulsePanelEl) {
      commandPulsePanelEl.hidden = true;
      commandPulsePanelEl.setAttribute('aria-hidden', 'true');
    }
    for (const response of liveCommandPulseState.responses) {
      if (response.initialStatus === 'following') liveCommandActivateResponse(response);
    }
    refreshLiveCommandGoals(true);
    const immediate = liveCommandPulseState.responses.filter(item => item.initialStatus === 'following').length;
    const delayed = liveCommandPulseState.responses.filter(item => item.initialStatus === 'delayed').length;
    const unable = liveCommandPulseState.responses.filter(item => item.initialStatus === 'unable').length;
    if (typeof addSystemFeed === 'function') addSystemFeed(`LIVE COMMAND · ${def.name} · ${immediate} IMMEDIATE${delayed ? ` · ${delayed} DELAYED` : ''}${unable ? ` · ${unable} PINNED` : ''}`);
    if (typeof showStatus === 'function') showStatus(`${def.name} · OPERATORS ACKNOWLEDGING`);
    if (typeof queueCareerMatchMoment === 'function') queueCareerMatchMoment(`command-issued:${liveCommandPulseState.round}`, 'LIVE COMMAND', def.name, `${immediate} respond immediately${delayed ? ` · ${delayed} react after contact` : ''}${unable ? ` · ${unable} cannot comply` : ''}.`, 'adjustment', 3.1, true);
    renderLiveCommandPulseButtons();
    return {
      ok: true,
      commandId: def.id,
      commandName: def.name,
      duration: def.duration,
      immediate,
      delayed,
      unable,
      routePlan: liveCommandPulseState.routePlan ? { id: liveCommandPulseState.routePlan.id, name: liveCommandPulseState.routePlan.name } : null
    };
  }

  function forceLiveCommandPulseForTest(commandId) {
    const id = String(commandId || '');
    const def = LIVE_COMMAND_PULSE_DEFS[id];
    if (!def) return { ok: false, reason: 'Unknown live command.' };
    const availability = liveCommandPulseAvailability();
    if (!availability.ready) return { ok: false, reason: availability.reason };
    const contextual = liveCommandOptionCandidates().find(item => item.id === id);
    const routePlan = id === 'route' ? (contextual?.routePlan || liveCommandAlternativeRoutePlan()) : null;
    if (id === 'route' && !routePlan) return { ok: false, reason: 'No alternate engagement route is available.' };
    const option = contextual || {
      id,
      def,
      score: 0,
      order: 0,
      contextText: 'Debug-selected command path.',
      routePlan
    };
    liveCommandPulseState.options = [option];
    return issueLiveCommandPulse(id);
  }

  function updateLiveCommandPulse(dt) {
    const step = Math.max(0, Number(dt) || 0);
    if (!liveCommandPulseState.active) {
      liveCommandPulseState.uiTimer -= step;
      if (liveCommandPulseState.uiTimer <= 0) {
        liveCommandPulseState.uiTimer = 0.25;
        renderLiveCommandPulseButtons();
      }
      return false;
    }
    liveCommandPulseState.elapsed += step;
    liveCommandPulseState.remaining = Math.max(0, liveCommandPulseState.duration - liveCommandPulseState.elapsed);
    liveCommandPulseState.refreshTimer -= step;
    liveCommandPulseState.uiTimer -= step;
    for (const response of liveCommandPulseState.responses) {
      if (response.status === 'delayed' && liveCommandPulseState.elapsed >= response.activationAt) liveCommandActivateResponse(response);
    }
    if (liveCommandPulseState.refreshTimer <= 0) {
      liveCommandPulseState.refreshTimer = 0.56;
      refreshLiveCommandGoals(false);
    }
    if (liveCommandPulseState.uiTimer <= 0) {
      liveCommandPulseState.uiTimer = 0.12;
      renderLiveCommandPulseButtons();
    }
    if (liveCommandPulseState.remaining <= 0) completeLiveCommandPulse('expired');
    return true;
  }

  function resetLiveCommandPulseForRound() {
    if (liveCommandPulseState.active) completeLiveCommandPulse('round-reset', null, { silent: true });
    for (const bot of liveCommandOwnedBots(false)) liveCommandRestoreBot(bot);
    liveCommandPulseState.round = Math.max(1, Number(roundNumber) || 1);
    liveCommandPulseState.used = false;
    liveCommandPulseState.open = false;
    liveCommandPulseState.active = false;
    liveCommandPulseState.commandId = '';
    liveCommandPulseState.startedAt = 0;
    liveCommandPulseState.elapsed = 0;
    liveCommandPulseState.duration = 0;
    liveCommandPulseState.remaining = 0;
    liveCommandPulseState.refreshTimer = 0;
    liveCommandPulseState.uiTimer = 0;
    liveCommandPulseState.options = [];
    liveCommandPulseState.responses = [];
    liveCommandPulseState.routePlan = null;
    liveCommandPulseState.baseline = null;
    liveCommandPulseState.snapshots = new Map();
    liveCommandPulseState.protectedSnapshots = new Map();
    liveCommandPulseState.lastOutcome = null;
    liveCommandPulseState.completionReason = '';
    closeLiveCommandPulsePanel();
    return true;
  }

  function resetLiveCommandPulseMatch() {
    if (liveCommandPulseState.active) completeLiveCommandPulse('match-reset', null, { silent: true });
    liveCommandPulseState.round = 0;
    liveCommandPulseState.used = false;
    liveCommandPulseState.open = false;
    liveCommandPulseState.active = false;
    liveCommandPulseState.commandId = '';
    liveCommandPulseState.startedAt = 0;
    liveCommandPulseState.elapsed = 0;
    liveCommandPulseState.duration = 0;
    liveCommandPulseState.remaining = 0;
    liveCommandPulseState.options = [];
    liveCommandPulseState.responses = [];
    liveCommandPulseState.routePlan = null;
    liveCommandPulseState.baseline = null;
    liveCommandPulseState.snapshots = new Map();
    liveCommandPulseState.protectedSnapshots = new Map();
    liveCommandPulseState.lastOutcome = null;
    liveCommandPulseState.completionReason = '';
    closeLiveCommandPulsePanel();
    return true;
  }

  function liveCommandPulseForTest() {
    const availability = liveCommandPulseAvailability();
    return {
      round: liveCommandPulseState.round,
      used: liveCommandPulseState.used,
      open: liveCommandPulseState.open,
      active: liveCommandPulseState.active,
      commandId: liveCommandPulseState.commandId,
      commandName: LIVE_COMMAND_PULSE_DEFS[liveCommandPulseState.commandId]?.name || '',
      duration: liveCommandPulseState.duration,
      elapsed: Number(liveCommandPulseState.elapsed.toFixed(3)),
      remaining: Number(liveCommandPulseState.remaining.toFixed(3)),
      ready: availability.ready,
      reason: availability.reason,
      options: (liveCommandPulseState.open ? liveCommandPulseState.options : liveCommandOptionCandidates()).map(item => ({ id: item.id, name: item.def?.name || '', contextText: item.contextText, routePlanId: item.routePlan?.id || null })),
      responses: liveCommandPulseState.responses.map(item => ({ ...item, holdAnchor: item.holdAnchor ? { ...item.holdAnchor } : null })),
      routePlan: liveCommandPulseState.routePlan ? { id: liveCommandPulseState.routePlan.id, name: liveCommandPulseState.routePlan.name } : null,
      baseline: liveCommandPulseState.baseline ? JSON.parse(JSON.stringify(liveCommandPulseState.baseline)) : null,
      current: liveCommandCaptureMetrics(),
      operators: liveCommandOwnedBots(false).map(bot => ({
        botKey: liveCommandBotKey(bot), name: bot.name || '', alive: Boolean(bot.alive),
        x: Number((Number(bot.x) || 0).toFixed(3)), y: Number((Number(bot.y) || 0).toFixed(3)),
        health: Number(bot.health) || 0, maxHealth: Number(bot.maxHealth) || 0,
        magAmmo: Number(bot.magAmmo) || 0, primaryAmmo: Number(bot.primaryAmmo) || 0, secondaryAmmo: Number(bot.secondaryAmmo) || 0,
        skill: Number(bot.skill) || 0, moveSkill: Number(bot.moveSkill) || 0,
        accuracyBonus: Number(bot.accuracyBonus) || 0, damageMultiplier: Number(bot.damageMultiplier) || 0,
        primaryDamageMin: Number(bot.primaryWeapon?.damageMin) || 0, primaryDamageMax: Number(bot.primaryWeapon?.damageMax) || 0,
        primaryAccuracy: Number(bot.primaryWeapon?.accuracy) || 0,
        secondaryDamageMin: Number(bot.secondaryWeapon?.damageMin) || 0, secondaryDamageMax: Number(bot.secondaryWeapon?.damageMax) || 0,
        secondaryAccuracy: Number(bot.secondaryWeapon?.accuracy) || 0,
        liveCommandId: bot.liveCommandId || '', liveCommandResponse: bot.liveCommandResponse || 'idle',
        liveCommandGoal: bot.liveCommandGoal ? { x: Number(bot.liveCommandGoal.x.toFixed(3)), y: Number(bot.liveCommandGoal.y.toFixed(3)) } : null,
        approachId: bot.teamApproachId || '', priorityId: bot.teamPriorityId || '', aggression: Number(bot.aggression) || 0,
        speed: Number(bot.speed) || 0, tacticalMode: bot.tacticalMode || ''
      })),
      protectedFieldChanges: liveCommandPulseState.active ? liveCommandProtectedFieldAudit() : (liveCommandPulseState.lastOutcome?.protectedFieldChanges || []),
      lastOutcome: liveCommandPulseState.lastOutcome ? JSON.parse(JSON.stringify(liveCommandPulseState.lastOutcome)) : null,
      panelVisible: Boolean(commandPulsePanelEl && !commandPulsePanelEl.hidden),
      dockPanelOpen: Boolean(matchCommentaryDockEl?.classList.contains('panel-open'))
    };
  }
