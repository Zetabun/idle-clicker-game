/*
 * Strikewatch source module: 39-dynamic-market-mail.js
 * Purpose: League-aware evolving transfer market and organic long-form club correspondence.
 *
 * This file shares the application scope with the other source fragments.
 * Run `python3 build.py` to regenerate the development bundle and standalone.
 */

  const DYNAMIC_MARKET_STATE_VERSION = 1;
  const DYNAMIC_MARKET_TARGET_SIZE = TEAM_MARKET_SIZE;
  const DYNAMIC_MARKET_EVENT_LIMIT = 60;
  const DYNAMIC_MARKET_ACTIVITY_LIMIT = 80;
  const DYNAMIC_MARKET_DIGEST_INTERVAL = 3;
  const DYNAMIC_MARKET_MIN_LISTING_DAYS = 14;
  const DYNAMIC_MARKET_MAX_LISTING_DAYS = 28;

  function dynamicMarketState() {
    const recruitment = recruitmentState();
    recruitment.marketDynamics = recruitment.marketDynamics && typeof recruitment.marketDynamics === 'object'
      ? recruitment.marketDynamics
      : {};
    const state = recruitment.marketDynamics;
    state.version = DYNAMIC_MARKET_STATE_VERSION;
    state.sequence = Math.max(0, Math.round(Number(state.sequence) || 0));
    state.lastProcessedDay = Number.isFinite(Number(state.lastProcessedDay)) ? Math.round(Number(state.lastProcessedDay)) : -1;
    state.lastDigestDay = Number.isFinite(Number(state.lastDigestDay)) ? Math.round(Number(state.lastDigestDay)) : -4;
    state.lastGenerationDay = Number.isFinite(Number(state.lastGenerationDay)) ? Math.round(Number(state.lastGenerationDay)) : -1;
    state.lastWeeklyReviewWeek = Math.max(0, Math.round(Number(state.lastWeeklyReviewWeek) || 0));
    state.divisionTier = normaliseLeagueTier(state.divisionTier ?? careerState.league?.divisionTier);
    state.season = Math.max(1, Math.round(Number(state.season) || Number(careerState.league?.season) || 1));
    if (!Array.isArray(state.processedActivityIds)) state.processedActivityIds = [];
    state.processedActivityIds = Array.from(new Set(state.processedActivityIds.map(String))).slice(0, DYNAMIC_MARKET_ACTIVITY_LIMIT);
    if (!Array.isArray(state.eventLog)) state.eventLog = [];
    state.eventLog = state.eventLog.filter(item => item && typeof item === 'object').slice(0, DYNAMIC_MARKET_EVENT_LIMIT);
    return state;
  }

  function dynamicMarketNextId(prefix = 'DME') {
    const state = dynamicMarketState();
    state.sequence++;
    return `${prefix}-${state.sequence}`;
  }

  function dynamicMarketDivisionLabel(tier = leagueDivisionTier()) {
    return leagueDivisionDefinition(tier)?.short || `DIVISION ${tier}`;
  }

  function dynamicMarketTierProfile(tier = leagueDivisionTier()) {
    const safeTier = normaliseLeagueTier(tier);
    const profiles = {
      3: { tier: 3, entryMix: [3], budget: 185000, wage: 16500, activity: 0.78, quality: 'DEVELOPING' },
      2: { tier: 2, entryMix: [2,2,2,2,3], budget: 330000, wage: 25000, activity: 0.88, quality: 'ESTABLISHED' },
      1: { tier: 1, entryMix: [1,1,1,1,1,2,2,3], budget: 570000, wage: 38000, activity: 0.98, quality: 'HIGH LEVEL' },
      0: { tier: 0, entryMix: [0,0,0,0,0,1,1,2], budget: 920000, wage: 56000, activity: 1.08, quality: 'ELITE' }
    };
    return profiles[safeTier] || profiles[3];
  }

  function dynamicMarketAllUsedNames() {
    const names = new Set();
    for (const player of careerState.squad || []) names.add(String(player.name || '').toLowerCase());
    for (const player of careerState.market || []) names.add(String(player.name || '').toLowerCase());
    for (const club of transferRivalClubs()) for (const player of club.roster || []) names.add(String(player.name || '').toLowerCase());
    return names;
  }

  function dynamicMarketRoleCounts(players = careerState.market || []) {
    return TEAM_ROLES.reduce((counts, role) => {
      counts[role.id] = (players || []).reduce((sum, player) => sum + (player.role === role.id ? 1 : player.secondaryRole === role.id ? 0.35 : 0), 0);
      return counts;
    }, {});
  }

  function dynamicMarketDesiredRole() {
    const counts = dynamicMarketRoleCounts();
    const composition = typeof recruitmentCompositionReport === 'function' ? recruitmentCompositionReport() : null;
    const missing = [...(composition?.missing || []), ...(composition?.partial || [])];
    const missingRoles = missing.flatMap(item => item.roles || []);
    const weighted = TEAM_ROLES.map(role => ({
      role,
      score: (missingRoles.includes(role.id) ? 4.2 : 0) + Math.max(0, 2.8 - (counts[role.id] || 0))
    })).sort((a, b) => b.score - a.score || a.role.id.localeCompare(b.role.id));
    return weighted[0]?.role?.id || 'flex';
  }

  function dynamicMarketPickSourceTier(random) {
    const profile = dynamicMarketTierProfile();
    return profile.entryMix[Math.floor(random() * profile.entryMix.length) % profile.entryMix.length];
  }

  function dynamicMarketSourceClub(random, sourceTier = leagueDivisionTier()) {
    const rivals = transferRivalClubs();
    if (sourceTier === leagueDivisionTier() && rivals.length) return rivals[Math.floor(random() * rivals.length) % rivals.length];
    const historical = typeof TEAM_HISTORY_CLUBS !== 'undefined' && TEAM_HISTORY_CLUBS.length
      ? TEAM_HISTORY_CLUBS[Math.floor(random() * TEAM_HISTORY_CLUBS.length) % TEAM_HISTORY_CLUBS.length]
      : `${dynamicMarketDivisionLabel(sourceTier)} Academy`;
    return { id: `external-${teamSeedFromString(historical).toString(36)}`, name: historical, rating: leagueDivisionDefinition(sourceTier)?.ratingBoost + 36, roster: [] };
  }

  function dynamicMarketOriginForPlayer(player, type, sourceClub, sourceTier, day) {
    const labels = {
      academy: 'ACADEMY GRADUATE',
      'free-agent': 'FREE AGENT',
      released: 'CLUB RELEASE',
      listed: 'TRANSFER LISTED',
      breakout: 'LOWER-DIVISION BREAKOUT'
    };
    const details = {
      academy: `${sourceClub.name} moved the operator into the senior market after a strong development review.`,
      'free-agent': 'The previous contract expired, leaving the operator available without a conventional club-to-club fee.',
      released: `${sourceClub.name} released the operator while reshaping its squad and wage commitments.`,
      listed: `${sourceClub.name} made the operator available after reassessing role coverage and squad depth.`,
      breakout: `Strong performances in ${dynamicMarketDivisionLabel(sourceTier)} brought the operator into the current recruitment network.`
    };
    player.marketOrigin = {
      type,
      label: labels[type] || 'NETWORK ENTRY',
      detail: details[type] || 'The recruitment network identified a new available operator.',
      sourceClubId: sourceClub.id || '',
      sourceClubName: sourceClub.name || '',
      sourceTier,
      generatedDay: day
    };
    player.marketReason = player.marketOrigin.detail;
    player.listedDay = day;
    const seed = teamSeedFromString(`${player.id}:${day}:availability`);
    player.availabilityUntilDay = day + DYNAMIC_MARKET_MIN_LISTING_DAYS + (seed % (DYNAMIC_MARKET_MAX_LISTING_DAYS - DYNAMIC_MARKET_MIN_LISTING_DAYS + 1));
    player.marketMomentum = {
      previousFee: player.fee,
      trend: 'stable',
      demand: clamp(Math.round(24 + teamPlayerOverall(player) * 0.52 + Math.max(0, player.potential - 60) * 0.55), 8, 82),
      lastChangedDay: day
    };
    return player;
  }

  function dynamicMarketGeneratePlayer(day = clubCalendarState().absoluteDay, desiredRole = dynamicMarketDesiredRole(), forcedType = '') {
    const state = dynamicMarketState();
    const seedBase = teamSeedFromString(`${careerState.marketSeed}:${careerState.name}:${careerState.league?.season || 1}:${day}:${state.sequence + 1}:dynamic-market`);
    const random = teamRng(seedBase);
    const sourceTier = dynamicMarketPickSourceTier(random);
    const currentTier = leagueDivisionTier();
    const sourceClub = dynamicMarketSourceClub(random, sourceTier);
    const typeRoll = random();
    let type = forcedType || (sourceTier > currentTier ? 'breakout' : typeRoll < 0.24 ? 'academy' : typeRoll < 0.46 ? 'free-agent' : typeRoll < 0.68 ? 'released' : 'listed');
    const usedNames = dynamicMarketAllUsedNames();
    let player = null;
    for (let attempt = 0; attempt < 32; attempt++) {
      const seed = seedBase + attempt * 104729;
      const candidate = generateTeamPlayer(seed, state.sequence + attempt, 'market', { divisionTier: sourceTier, idPrefix: 'DYN' });
      if (usedNames.has(candidate.name.toLowerCase())) continue;
      if (attempt < 18 && desiredRole && candidate.role !== desiredRole && candidate.secondaryRole !== desiredRole) continue;
      player = candidate;
      break;
    }
    if (!player) player = generateTeamPlayer(seedBase + 4000003, state.sequence + 43, 'market', { divisionTier: sourceTier, idPrefix: 'DYN' });
    state.sequence++;
    if (type === 'academy') {
      player.age = clamp(18 + Math.floor(random() * 5), 18, 22);
      player.potential = clamp(Math.max(player.potential, teamPlayerOverall(player) + 18 + Math.floor(random() * 8)), 48, { 3: 74, 2: 84, 1: 93, 0: 98 }[currentTier]);
      player.fee = transferRoundMoney(Math.max(12000, player.value * (0.74 + random() * 0.18)));
      player.currentTeam = sourceClub.name;
    } else if (type === 'free-agent') {
      player.contractWeeks = 0;
      player.currentTeam = 'Free Agent';
      player.fee = transferRoundMoney(Math.max(5000, player.value * (0.12 + random() * 0.10)));
    } else if (type === 'released') {
      player.currentTeam = sourceClub.name;
      player.fee = transferRoundMoney(Math.max(5000, player.value * (0.56 + random() * 0.20)));
      player.happiness = clamp(player.happiness - 8, 35, 100);
    } else if (type === 'breakout') {
      player.currentTeam = sourceClub.name;
      player.form = Number(clamp(7.1 + random() * 1.5, 1, 10).toFixed(1));
      player.potential = clamp(player.potential + 4 + Math.floor(random() * 6), 35, { 3: 74, 2: 86, 1: 94, 0: 98 }[currentTier]);
      player.fee = transferRoundMoney(Math.max(10000, player.value * (0.92 + random() * 0.22)));
    } else {
      type = 'listed';
      player.currentTeam = sourceClub.name;
      player.fee = transferRoundMoney(Math.max(5000, player.value * (0.82 + random() * 0.20)));
    }
    player.value = Math.max(player.value, player.fee);
    player.scoutingDivision = sourceTier;
    dynamicMarketOriginForPlayer(player, type, sourceClub, sourceTier, day);
    return normaliseGeneratedPlayer(player, player.id);
  }

  function dynamicMarketAnnotateInitialPlayer(player, index = 0) {
    if (!player || player.marketOrigin) return player;
    const day = Math.max(0, clubCalendarState().absoluteDay - Math.min(10, index));
    const sourceTier = normaliseLeagueTier(player.scoutingDivision ?? leagueDivisionTier());
    const currentTeam = String(player.currentTeam || 'Free Agent');
    const freeAgent = currentTeam.toLowerCase() === 'free agent';
    const sourceClub = transferRivalClubByName(currentTeam) || { id: '', name: currentTeam || 'Recruitment Network' };
    dynamicMarketOriginForPlayer(player, freeAgent ? 'free-agent' : 'listed', sourceClub, sourceTier, day);
    return player;
  }

  function dynamicMarketEnsureAnnotated() {
    careerState.market = Array.isArray(careerState.market) ? careerState.market : [];
    careerState.market.forEach((player, index) => dynamicMarketAnnotateInitialPlayer(player, index));
    const state = dynamicMarketState();
    const currentTier = leagueDivisionTier();
    const season = Math.max(1, Number(careerState.league?.season) || 1);
    if (state.divisionTier !== currentTier || state.season !== season) {
      state.divisionTier = currentTier;
      state.season = season;
      state.lastDigestDay = Math.min(state.lastDigestDay, clubCalendarState().absoluteDay - 1);
    }
    return careerState.market;
  }

  function dynamicMarketRecordEvent(type, payload = {}) {
    const state = dynamicMarketState();
    const event = {
      id: payload.id || dynamicMarketNextId('MKT'),
      type: String(type || 'update'),
      day: Number.isFinite(Number(payload.day)) ? Math.max(0, Math.round(Number(payload.day))) : clubCalendarState().absoluteDay,
      playerId: String(payload.playerId || ''),
      playerName: String(payload.playerName || ''),
      clubName: String(payload.clubName || ''),
      amount: Math.max(0, Math.round(Number(payload.amount) || 0)),
      role: String(payload.role || payload.needRole || ''),
      detail: String(payload.detail || '').slice(0, 300),
      important: Boolean(payload.important)
    };
    state.eventLog.unshift(event);
    state.eventLog = state.eventLog.slice(0, DYNAMIC_MARKET_EVENT_LIMIT);
    return event;
  }

  function dynamicMarketRecordAiActivity(activity) {
    if (!activity?.id) return null;
    const state = dynamicMarketState();
    if (state.processedActivityIds.includes(activity.id)) return null;
    state.processedActivityIds.unshift(activity.id);
    state.processedActivityIds = state.processedActivityIds.slice(0, DYNAMIC_MARKET_ACTIVITY_LIMIT);
    return dynamicMarketRecordEvent(activity.type, {
      id: `SYNC-${activity.id}`,
      day: activity.day,
      playerId: activity.playerId,
      playerName: activity.playerName,
      clubName: activity.clubName,
      amount: activity.amount,
      role: activity.needRole,
      important: activity.type === 'signed'
    });
  }

  function dynamicMarketSyncAiActivity() {
    for (const activity of recruitmentState().aiActivity || []) dynamicMarketRecordAiActivity(activity);
  }

  function dynamicMarketAnnotateClubListing(player, clubName, day) {
    if (!player) return null;
    const club = transferRivalClubByName(clubName) || { id: '', name: clubName || player.currentTeam || 'Rival Club' };
    dynamicMarketOriginForPlayer(player, 'listed', club, leagueDivisionTier(), day);
    return player;
  }

  function dynamicMarketClubRoleNeed(club) {
    const desired = Array.isArray(club?.roles) && club.roles.length ? club.roles : TEAM_ROLES.map(role => role.id);
    const roster = Array.isArray(club?.roster) ? club.roster : [];
    const counts = dynamicMarketRoleCounts(roster);
    const desiredCounts = desired.reduce((map, role) => {
      map[role] = (map[role] || 0) + 1;
      return map;
    }, {});
    const needs = TEAM_ROLES.map(role => {
      const target = desiredCounts[role.id] || (role.id === 'flex' ? 0.5 : 0);
      const current = counts[role.id] || 0;
      return { roleId: role.id, deficit: target - current };
    }).sort((a, b) => b.deficit - a.deficit);
    if (needs[0]?.deficit > 0.1) return needs[0].roleId;
    const weakest = roster.slice().sort((a, b) => teamPlayerOverall(a) - teamPlayerOverall(b))[0];
    return weakest?.role || desired[0] || 'flex';
  }

  function dynamicMarketEnsureClubFinance(club) {
    if (!club) return null;
    const profile = dynamicMarketTierProfile();
    const ratingFactor = clamp((Number(club.rating) || 40) / 45, 0.72, 1.65);
    if (!Number.isFinite(Number(club.transferBudget))) club.transferBudget = transferRoundMoney(profile.budget * ratingFactor);
    if (!Number.isFinite(Number(club.wageBudget))) club.wageBudget = transferRoundMoney(profile.wage * ratingFactor, 100);
    club.marketPriority = dynamicMarketClubRoleNeed(club);
    club.marketLastActionDay = Number.isFinite(Number(club.marketLastActionDay)) ? Math.round(Number(club.marketLastActionDay)) : -4;
    return club;
  }

  function dynamicMarketSelectRivalBid(candidates, clubs, day, random = Math.random) {
    const availableClubs = (clubs || []).map(dynamicMarketEnsureClubFinance).filter(club => club && day - club.marketLastActionDay >= 2 && club.transferBudget >= 5000);
    if (!availableClubs.length) return null;
    const club = availableClubs[Math.floor(random() * availableClubs.length) % availableClubs.length];
    const needRole = dynamicMarketClubRoleNeed(club);
    const rosterAverage = club.roster?.length ? club.roster.reduce((sum, player) => sum + teamPlayerOverall(player), 0) / club.roster.length : Number(club.rating) || 40;
    const scored = (candidates || []).filter(player => {
      const fee = Number(player.fee) || Number(player.value) || 0;
      const wage = Number(player.wage) || 0;
      const alreadyOwned = String(player.currentTeam || '').toLowerCase() === String(club.name || '').toLowerCase();
      return !alreadyOwned && fee <= club.transferBudget * 1.08 && wage <= club.wageBudget * 0.42;
    }).map(player => {
      const roleFit = player.role === needRole ? 34 : player.secondaryRole === needRole ? 18 : 0;
      const qualityFit = Math.max(-12, teamPlayerOverall(player) - rosterAverage) * 1.2;
      const development = Math.max(0, Number(player.potential) - teamPlayerOverall(player)) * 0.36;
      const value = 12 - (Number(player.fee) || 0) / Math.max(1, club.transferBudget) * 12;
      const styleFit = String(club.style || '').includes('ANGLE') && player.role === 'marksman' ? 8
        : String(club.style || '').includes('PRESS') && ['entry','support'].includes(player.role) ? 8
          : String(club.style || '').includes('ROTATION') && player.role === 'flanker' ? 8 : 0;
      return { player, score: roleFit + qualityFit + development + value + styleFit };
    }).sort((a, b) => b.score - a.score);
    const selected = scored[Math.floor(random() * Math.min(3, scored.length))] || null;
    if (!selected) return null;
    club.marketLastActionDay = day;
    club.marketPriority = needRole;
    return {
      player: selected.player,
      club,
      needRole,
      amount: transferRoundMoney(Math.min(club.transferBudget, (selected.player.value || selected.player.fee) * (0.88 + random() * 0.20)))
    };
  }

  function dynamicMarketApplyRivalSigningCost(club, player, amount) {
    if (!club) return false;
    dynamicMarketEnsureClubFinance(club);
    club.transferBudget = Math.max(0, Number(club.transferBudget) - Math.max(0, Number(amount) || 0));
    club.wageBudget = Math.max(0, Number(club.wageBudget) - Math.max(0, Number(player?.wage) || 0));
    club.marketPriority = dynamicMarketClubRoleNeed(club);
    return true;
  }

  function dynamicMarketActiveNegotiationPlayerId() {
    return String(transferState()?.activeIncoming?.playerId || '');
  }

  function dynamicMarketRemoveExpired(day) {
    const state = recruitmentState();
    const activePlayerId = dynamicMarketActiveNegotiationPlayerId();
    const expired = [];
    careerState.market = (careerState.market || []).filter(player => {
      const expiry = Number(player.availabilityUntilDay);
      const protectedPlayer = state.shortlistIds.includes(player.id) || player.rivalBid || player.id === activePlayerId;
      if (!Number.isFinite(expiry) || expiry > day || protectedPlayer || careerState.market.length - expired.length <= 12) return true;
      expired.push(player);
      delete state.reports[player.id];
      dynamicMarketRecordEvent('departed', {
        day,
        playerId: player.id,
        playerName: player.name,
        clubName: player.currentTeam,
        role: player.role,
        detail: `${player.name} left the available pool after the listing period ended.`
      });
      return false;
    });
    return expired;
  }

  function dynamicMarketReprice(day, force = false) {
    const shortlist = new Set(recruitmentState().shortlistIds || []);
    const changes = [];
    for (const player of careerState.market || []) {
      player.marketMomentum = player.marketMomentum && typeof player.marketMomentum === 'object'
        ? player.marketMomentum
        : { previousFee: player.fee, trend: 'stable', demand: 20, lastChangedDay: player.listedDay || 0 };
      if (!force && day - Number(player.marketMomentum.lastChangedDay || 0) < 4) continue;
      const daysListed = Math.max(0, day - Number(player.listedDay || day));
      const demand = clamp(
        Math.round((Number(player.marketMomentum.demand) || 20)
          + (shortlist.has(player.id) ? 8 : -2)
          + (player.rivalBid ? 18 : 0)
          + (Number(player.form) >= 7.4 ? 4 : 0)
          - (daysListed >= 14 ? 7 : 0)),
        0,
        100
      );
      const previousFee = Math.max(5000, Number(player.fee) || 5000);
      let factor = demand >= 72 ? 1.06 : demand >= 55 ? 1.025 : demand <= 22 ? 0.94 : demand <= 36 ? 0.975 : 1;
      if (String(player.currentTeam).toLowerCase() === 'free agent' && daysListed > 10) factor = Math.min(factor, 0.96);
      const nextFee = transferRoundMoney(Math.max(5000, previousFee * factor));
      player.marketMomentum.previousFee = previousFee;
      player.marketMomentum.demand = demand;
      player.marketMomentum.lastChangedDay = day;
      player.marketMomentum.trend = nextFee > previousFee ? 'rising' : nextFee < previousFee ? 'falling' : 'stable';
      if (nextFee !== previousFee) {
        player.fee = nextFee;
        changes.push({ player, previousFee, nextFee });
        dynamicMarketRecordEvent(nextFee > previousFee ? 'price-rise' : 'price-drop', {
          day,
          playerId: player.id,
          playerName: player.name,
          amount: Math.abs(nextFee - previousFee),
          role: player.role,
          detail: `${player.name}'s asking price moved from ${teamCredits(previousFee)} to ${teamCredits(nextFee)} as market demand changed.`
        });
      }
    }
    return changes;
  }

  function dynamicMarketAddArrival(day, desiredRole = dynamicMarketDesiredRole(), forcedType = '') {
    const player = dynamicMarketGeneratePlayer(day, desiredRole, forcedType);
    careerState.market.push(player);
    recruitmentReport(player);
    dynamicMarketRecordEvent('arrival', {
      day,
      playerId: player.id,
      playerName: player.name,
      clubName: player.marketOrigin?.sourceClubName || player.currentTeam,
      role: player.role,
      amount: player.fee,
      detail: `${player.marketOrigin?.label || 'NEW ENTRY'} · ${teamRoleById(player.role).name} · ${dynamicMarketDivisionLabel(player.scoutingDivision)} source.`
    });
    dynamicMarketState().lastGenerationDay = day;
    return player;
  }

  function dynamicMarketReplenish(day, allowRotation = true) {
    dynamicMarketEnsureAnnotated();
    const arrivals = [];
    while (careerState.market.length < DYNAMIC_MARKET_TARGET_SIZE) arrivals.push(dynamicMarketAddArrival(day));
    if (allowRotation && careerState.market.length >= DYNAMIC_MARKET_TARGET_SIZE) {
      const random = teamRng(teamSeedFromString(`${careerState.name}:${day}:market-rotation`));
      const profile = dynamicMarketTierProfile();
      if (random() < 0.10 * profile.activity) {
        const protectedIds = new Set([...(recruitmentState().shortlistIds || []), dynamicMarketActiveNegotiationPlayerId()]);
        const removable = careerState.market.filter(player => !protectedIds.has(player.id) && !player.rivalBid && !player.clubAcademyProspect)
          .sort((a, b) => (Number(a.marketMomentum?.demand) || 0) - (Number(b.marketMomentum?.demand) || 0) || Number(a.listedDay || 0) - Number(b.listedDay || 0))[0];
        if (removable) {
          careerState.market = careerState.market.filter(player => player.id !== removable.id);
          delete recruitmentState().reports[removable.id];
          dynamicMarketRecordEvent('departed', { day, playerId: removable.id, playerName: removable.name, clubName: removable.currentTeam, role: removable.role, detail: 'The recruitment network rotated out a low-interest listing.' });
          arrivals.push(dynamicMarketAddArrival(day));
        }
      }
    }
    return arrivals;
  }

  function dynamicMarketEventLine(event) {
    const role = event.role ? ` · ${teamRoleById(event.role).name}` : '';
    if (event.type === 'arrival') return `${event.playerName}${role} entered the market from ${event.clubName || 'the wider network'}.`;
    if (event.type === 'bid') return `${event.clubName} opened talks for ${event.playerName}${event.role ? ` to address a ${teamRoleById(event.role).name.toLowerCase()} need` : ''}.`;
    if (event.type === 'signed') return `${event.clubName} completed the signing of ${event.playerName}${event.amount ? ` for approximately ${teamCredits(event.amount)}` : ''}.`;
    if (event.type === 'listed') return `${event.clubName} made ${event.playerName}${role} available.`;
    if (event.type === 'price-rise') return `${event.playerName}'s asking price increased by ${teamCredits(event.amount)} after stronger demand.`;
    if (event.type === 'price-drop') return `${event.playerName}'s asking price fell by ${teamCredits(event.amount)} as the listing aged.`;
    if (event.type === 'collapsed') return `Talks between ${event.clubName} and ${event.playerName} ended without an agreement.`;
    if (event.type === 'departed') return `${event.playerName} left the available pool.`;
    if (event.type === 'user-signing') return `${careerState.name} completed the signing of ${event.playerName}.`;
    return event.detail || `${event.playerName || 'The market'} changed.`;
  }

  function clubAddOrganicMail({ subject = 'Club update', paragraphs = [], category = 'CLUB', important = false, route = null, sender = '', preview = '', storyKey = '' } = {}) {
    const body = (Array.isArray(paragraphs) ? paragraphs : [paragraphs]).filter(Boolean).map(String).join('\n\n');
    return clubAddMail(subject, body, category, important, route, { sender, preview, storyKey, organic: true });
  }

  function dynamicMarketUserSquadParagraph() {
    const composition = typeof recruitmentCompositionReport === 'function' ? recruitmentCompositionReport() : null;
    const priority = [...(composition?.missing || []), ...(composition?.partial || [])][0] || null;
    const wageBill = typeof clubTotalWageBill === 'function' ? clubTotalWageBill() : teamSquadWageBill();
    const headroom = Math.max(0, Number(careerState.wageBudget) - wageBill);
    const need = priority ? priority.missing : 'The active five has no major functional gap, so value and depth can take priority.';
    return `YOUR SQUAD CONTEXT\n${need}\nAvailable club cash: ${teamCredits(careerState.credits)}. Remaining weekly wage headroom: ${teamCredits(headroom)}.`;
  }

  function dynamicMarketDigestEvents(day) {
    const state = dynamicMarketState();
    return state.eventLog.filter(event => event.day > state.lastDigestDay && event.day <= day).slice(0, 12);
  }

  function dynamicMarketMaybeSendDigest(day, force = false) {
    const state = dynamicMarketState();
    const events = dynamicMarketDigestEvents(day);
    if (!events.length) return null;
    if (!force && day - state.lastDigestDay < DYNAMIC_MARKET_DIGEST_INTERVAL && !events.some(event => event.important)) return null;
    const arrivals = events.filter(event => event.type === 'arrival' || event.type === 'listed').slice(0, 5);
    const activity = events.filter(event => ['bid','signed','collapsed','departed'].includes(event.type)).slice(0, 6);
    const prices = events.filter(event => ['price-rise','price-drop'].includes(event.type)).slice(0, 4);
    const market = careerState.market || [];
    const activeBids = market.filter(player => player.rivalBid).length;
    const freeAgents = market.filter(player => String(player.currentTeam).toLowerCase() === 'free agent').length;
    const sections = [
      `Manager,\n\nThe ${dynamicMarketDivisionLabel()} recruitment market has changed since the previous network report. These notes are based on actual club activity, new availability and current asking prices in this career.`,
      arrivals.length ? `NEW AVAILABILITY\n${arrivals.map(event => `• ${dynamicMarketEventLine(event)}`).join('\n')}` : '',
      activity.length ? `LEAGUE ACTIVITY\n${activity.map(event => `• ${dynamicMarketEventLine(event)}`).join('\n')}` : '',
      prices.length ? `PRICE MOVEMENT\n${prices.map(event => `• ${dynamicMarketEventLine(event)}`).join('\n')}` : '',
      dynamicMarketUserSquadParagraph(),
      `MARKET OUTLOOK\n${market.length} operators are currently available, including ${freeAgents} free agent${freeAgents === 1 ? '' : 's'} and ${activeBids} player${activeBids === 1 ? '' : 's'} in active rival talks. Listings can expire and prices can move, so shortlist monitoring now protects useful targets from disappearing without notice.`,
      `Regards,\n${careerState.name} Recruitment Intelligence Unit`
    ].filter(Boolean);
    const message = clubAddOrganicMail({
      subject: `Recruitment intelligence · ${events.length} market development${events.length === 1 ? '' : 's'}`,
      paragraphs: sections,
      category: 'RECRUITMENT',
      important: events.some(event => event.important),
      route: 'market',
      sender: `${careerState.name} Recruitment Intelligence Unit`,
      preview: `${arrivals.length} new/listed operator${arrivals.length === 1 ? '' : 's'} · ${activity.length} league move${activity.length === 1 ? '' : 's'} · ${activeBids} active bid${activeBids === 1 ? '' : 's'}.`,
      storyKey: `market-digest-s${careerState.league?.season || 1}-d${day}`
    });
    state.lastDigestDay = day;
    return message;
  }

  function dynamicMarketProcessDay(day = clubCalendarState().absoluteDay, options = {}) {
    const state = dynamicMarketState();
    if (!options.force && state.lastProcessedDay >= day) return { arrivals: [], expired: [], prices: [], digest: null };
    dynamicMarketEnsureAnnotated();
    dynamicMarketSyncAiActivity();
    const expired = dynamicMarketRemoveExpired(day);
    const prices = dynamicMarketReprice(day, Boolean(options.forcePrice));
    const arrivals = dynamicMarketReplenish(day, options.allowRotation !== false);
    dynamicMarketSyncAiActivity();
    const digest = dynamicMarketMaybeSendDigest(day, Boolean(options.forceDigest));
    state.lastProcessedDay = Math.max(state.lastProcessedDay, day);
    state.divisionTier = leagueDivisionTier();
    state.season = Math.max(1, Number(careerState.league?.season) || 1);
    return { arrivals, expired, prices, digest };
  }

  function dynamicTransferMarketWeeklyReview(week = careerState.week) {
    const state = dynamicMarketState();
    if (state.lastWeeklyReviewWeek >= week) return null;
    const day = clubCalendarState().absoluteDay;
    const result = dynamicMarketProcessDay(day, { force: true, forcePrice: true, forceDigest: true, allowRotation: true });
    state.lastWeeklyReviewWeek = week;
    return result;
  }

  function dynamicMarketMomentumLabel(player) {
    const trend = player?.marketMomentum?.trend || 'stable';
    const demand = Math.round(Number(player?.marketMomentum?.demand) || 0);
    if (trend === 'rising') return `RISING INTEREST · ${demand}/100 DEMAND`;
    if (trend === 'falling') return `PRICE SOFTENING · ${demand}/100 DEMAND`;
    return `STABLE MARKET · ${demand}/100 DEMAND`;
  }

  function dynamicMarketPlayerContextMarkup(player) {
    if (!player) return '';
    dynamicMarketAnnotateInitialPlayer(player);
    const day = clubCalendarState().absoluteDay;
    const remaining = Number.isFinite(Number(player.availabilityUntilDay)) ? Math.max(0, Number(player.availabilityUntilDay) - day) : null;
    const origin = player.marketOrigin || {};
    return `<section class="dynamic-market-player-context ${escapeCareerHtml(player.marketMomentum?.trend || 'stable')}"><div><span>${escapeCareerHtml(origin.label || 'NETWORK ENTRY')}</span><strong>${escapeCareerHtml(dynamicMarketMomentumLabel(player))}</strong><small>${escapeCareerHtml(origin.detail || player.marketReason || 'Recruitment-network listing.')}</small></div><aside><span>SOURCE</span><strong>${escapeCareerHtml(origin.sourceClubName || player.currentTeam || 'Unknown')}</strong><small>${escapeCareerHtml(dynamicMarketDivisionLabel(origin.sourceTier ?? player.scoutingDivision))}${remaining === null ? '' : ` · ${remaining}D LISTING`}</small></aside></section>`;
  }

  function dynamicMarketPlayerProfileMarkup(player) {
    if (!player || (careerState.squad || []).some(item => item.id === player.id)) return '';
    dynamicMarketAnnotateInitialPlayer(player);
    const origin = player.marketOrigin || {};
    const day = clubCalendarState().absoluteDay;
    const remaining = Number.isFinite(Number(player.availabilityUntilDay)) ? Math.max(0, Number(player.availabilityUntilDay) - day) : null;
    const rival = player.rivalBid && Number(player.rivalBid.expiresDay) >= day ? player.rivalBid : null;
    return `<section class="dynamic-market-profile"><div class="career-section-head"><div><span>LIVE MARKET CONTEXT</span><strong>WHY THIS OPERATOR IS AVAILABLE</strong></div><p>Generated from the current division, club activity and this career's recruitment market.</p></div><div class="dynamic-market-profile-grid"><article><span>ENTRY ROUTE</span><strong>${escapeCareerHtml(origin.label || 'NETWORK ENTRY')}</strong><p>${escapeCareerHtml(origin.detail || player.marketReason || 'Recruitment-network listing.')}</p></article><article><span>MARKET MOMENTUM</span><strong>${escapeCareerHtml(dynamicMarketMomentumLabel(player))}</strong><p>${player.marketMomentum?.previousFee && player.marketMomentum.previousFee !== player.fee ? `Previous asking price ${teamCredits(player.marketMomentum.previousFee)}. ` : ''}${remaining === null ? 'Availability is under review.' : `${remaining} days remain on the current listing unless talks extend it.`}</p></article><article><span>COMPETITION</span><strong>${rival ? `${escapeCareerHtml(rival.clubName)} IN TALKS` : 'NO ACTIVE RIVAL BID'}</strong><p>${rival ? `${escapeCareerHtml(rival.clubName)} are targeting ${teamRoleById(rival.needRole || player.role).name.toLowerCase()} cover. Resolution expected in ${Math.max(0, rival.expiresDay - day)} days.` : 'Interest can increase after strong scouting reports, shortlisting and league-club squad needs.'}</p></article></div></section>`;
  }

  function dynamicMarketPulseMarkup() {
    dynamicMarketEnsureAnnotated();
    const day = clubCalendarState().absoluteDay;
    const recent = dynamicMarketState().eventLog.filter(event => event.day >= day - 7).slice(0, 5);
    const bids = (careerState.market || []).filter(player => player.rivalBid && Number(player.rivalBid.expiresDay) >= day).length;
    const arrivals = recent.filter(event => ['arrival','listed'].includes(event.type)).length;
    const movements = recent.filter(event => ['signed','departed'].includes(event.type)).length;
    return `<section class="dynamic-market-pulse"><header><div><span>LIVING TRANSFER MARKET</span><strong>${escapeCareerHtml(dynamicMarketDivisionLabel())} NETWORK PULSE</strong><p>Operators enter and leave through real league needs, free agency, academy graduation, releases and lower-division breakthroughs.</p></div><aside><div><b>${arrivals}</b><span>NEW / LISTED</span></div><div><b>${bids}</b><span>ACTIVE BIDS</span></div><div><b>${movements}</b><span>MOVES</span></div></aside></header><div>${recent.length ? recent.map(event => `<article class="${escapeCareerHtml(event.type)}"><span>${escapeCareerHtml(String(event.type).replace(/-/g, ' ').toUpperCase())}</span><strong>${event.playerName
      // Build 12.236: the market event already stores `playerId`, and a listed
      // operator is in `careerState.market`, so this headline resolves and
      // opens the profile. `dynamicMarketEventLine()` below stays plain text —
      // it is prose escaped as a whole, so a link inside it would need the line
      // split into parts.
      ? careerPlayerLinkMarkup(event.playerId, event.playerName)
      : escapeCareerHtml(event.clubName || 'Market update')}</strong><p>${escapeCareerHtml(dynamicMarketEventLine(event))}</p></article>`).join('') : '<article class="quiet"><span>NETWORK QUIET</span><strong>NO RECENT MOVEMENT</strong><p>Advance the calendar to let clubs reassess squads, generate listings and enter negotiations.</p></article>'}</div></section>`;
  }

  function dynamicMarketSigningMail(player, dealSnapshot = null) {
    if (!player) return null;
    const composition = typeof recruitmentCompositionReport === 'function' ? recruitmentCompositionReport() : null;
    const role = teamRoleById(player.role);
    const newlyCovered = recruitmentLastSigningUpdate?.playerId === player.id ? recruitmentLastSigningUpdate.newlyCovered || [] : [];
    const remaining = [...(composition?.missing || []), ...(composition?.partial || [])][0] || null;
    const fee = Math.max(0, Number(dealSnapshot?.offeredFee) || Number(player.fee) || 0);
    const wage = Math.max(0, Number(dealSnapshot?.offeredWage) || Number(player.wage) || 0);
    const origin = player.marketOrigin || {};
    const wageBill = typeof clubTotalWageBill === 'function' ? clubTotalWageBill() : teamSquadWageBill();
    const body = [
      `Manager,\n\nRegistration is complete for ${player.name}. This report records why the operator was available, what the agreement costs and how the signing changes the active squad.`,
      `PLAYER PROFILE\n${player.name} · ${role.name} · Age ${player.age} · ${player.nationality}\nCurrent ability: ${teamPlayerOverall(player)}/100. Potential: ${player.potential}/100. Personality: ${player.personality}.`,
      `MARKET STORY\n${origin.label || 'RECRUITMENT NETWORK SIGNING'} from ${origin.sourceClubName || player.currentTeam || 'the wider market'}.\n${origin.detail || player.marketReason || 'The recruitment network identified the operator as available.'}`,
      `AGREED PACKAGE\nTransfer/registration cost: ${teamCredits(fee)}. Weekly wage: ${teamCredits(wage)}. Contract: ${player.contractWeeks} weeks.${dealSnapshot?.signingBonus ? ` Signing bonus: ${teamCredits(dealSnapshot.signingBonus)}.` : ''}`,
      `SQUAD EFFECT\n${newlyCovered.length ? `${newlyCovered.map(item => item.label).join(' and ')} is now covered by the active-five options.` : `${role.name} depth and competition have increased.`}${remaining ? ` The clearest remaining recruitment need is ${remaining.missing.toLowerCase()}.` : ' No major functional gap remains in the current active five.'}`,
      `FINANCIAL POSITION\nClub cash after registration: ${teamCredits(careerState.credits)}. Weekly payroll: ${teamCredits(wageBill)} of ${teamCredits(careerState.wageBudget)}.`,
      `Regards,\n${careerState.name} Recruitment & Player Registration`
    ];
    return clubAddOrganicMail({
      subject: `Signing dossier · ${player.name}`,
      paragraphs: body,
      category: 'TRANSFERS',
      important: true,
      route: 'profile',
      sender: `${careerState.name} Recruitment & Player Registration`,
      preview: `${role.name} signed for ${teamCredits(fee)} · ${teamCredits(wage)} per week · squad impact recorded.`,
      storyKey: `signing-${player.id}-${clubCalendarState().absoluteDay}`
    });
  }

  function dynamicMarketUpgradeLatestResultMail(result, winner, summary) {
    if (!result || result.mode !== 'league') return null;
    const mail = (careerState.mail || []).find(item => item.category === 'RESULT' && item.day === clubCalendarState().absoluteDay) || null;
    if (!mail) return null;
    const won = winner === CAREER_OWNED_TEAM || winner === TEAM_BLUE;
    const score = `${summary?.blueScore ?? careerState.lastRound?.blueScore ?? '—'}–${summary?.redScore ?? careerState.lastRound?.redScore ?? '—'}`;
    const cards = summary?.matchHighlights?.cards || careerState.lastRound?.matchHighlights?.cards || [];
    const play = cards.find(card => card.id === 'play-of-match');
    const turn = cards.find(card => card.id === 'turning-point');
    const tactical = cards.find(card => card.id === 'tactical-change');
    const next = typeof leagueNextFixture === 'function' ? leagueNextFixture() : null;
    const nextOpponent = next && typeof leagueClubById === 'function' ? leagueClubById(leagueFixtureOpponentId(next)) : null;
    const paragraphs = [
      `Manager,\n\n${careerState.name} ${won ? 'secured a victory' : 'were defeated'} ${score} against ${result.opponentName}. The result moves the club to position ${result.position} with ${result.points} points in ${result.divisionName}.`,
      play ? `PLAY OF THE MATCH\n${play.title}\n${play.detail || play.body || ''}` : '',
      turn ? `TURNING POINT\n${turn.title}\n${turn.detail || turn.body || ''}` : '',
      tactical ? `TACTICAL REVIEW\n${tactical.title}\n${tactical.detail || tactical.body || ''}` : '',
      nextOpponent ? `NEXT FIXTURE\n${nextOpponent.name} · ${nextOpponent.style || 'BALANCED'} approach · Matchday ${next.matchday}. Recruitment and tactical preparation should account for the current squad condition before the calendar reaches matchday.` : 'NEXT FIXTURE\nThe season schedule is complete. Review the final table and squad plan before beginning the next campaign.',
      `Regards,\n${careerState.name} Match Analysis Department`
    ].filter(Boolean);
    mail.body = paragraphs.join('\n\n').slice(0, 6000);
    mail.sender = `${careerState.name} Match Analysis Department`;
    mail.preview = `${won ? 'Victory' : 'Defeat'} ${score} vs ${result.opponentName} · position ${result.position} · ${result.points} points.`;
    mail.organic = true;
    mail.storyKey = `match-report-${result.fixtureId || result.matchday}`;
    return mail;
  }

  const baseEnsureTeamManagementStateDynamicMarket = ensureTeamManagementState;
  ensureTeamManagementState = function ensureTeamManagementStateWithDynamicMarket() {
    const result = baseEnsureTeamManagementStateDynamicMarket();
    if (careerState.created) dynamicMarketEnsureAnnotated();
    return result;
  };

  const baseRefreshTeamMarketDynamicMarket = refreshTeamMarket;
  refreshTeamMarket = function refreshTeamMarketWithDynamicEntries() {
    if (menuContext === 'pause' || careerState.credits < TEAM_MARKET_REFRESH_COST) return false;
    const day = clubCalendarState().absoluteDay;
    dynamicMarketEnsureAnnotated();
    const protectedIds = new Set([...(recruitmentState().shortlistIds || []), dynamicMarketActiveNegotiationPlayerId()]);
    const removable = (careerState.market || []).filter(player => !protectedIds.has(player.id) && !player.rivalBid && !player.clubAcademyProspect)
      .sort((a, b) => (Number(a.marketMomentum?.demand) || 0) - (Number(b.marketMomentum?.demand) || 0) || Number(a.listedDay || 0) - Number(b.listedDay || 0))
      .slice(0, 3);
    if (!removable.length) {
      if (typeof showStatus === 'function') showStatus('SEARCH UNAVAILABLE · ALL LISTINGS ARE PROTECTED OR IN ACTIVE TALKS');
      return false;
    }
    careerState.credits -= TEAM_MARKET_REFRESH_COST;
    teamFinanceTransaction('SCOUTING', -TEAM_MARKET_REFRESH_COST, 'Commissioned targeted recruitment search');
    for (const player of removable) {
      careerState.market = careerState.market.filter(item => item.id !== player.id);
      delete recruitmentState().reports[player.id];
      dynamicMarketRecordEvent('departed', { day, playerId: player.id, playerName: player.name, clubName: player.currentTeam, role: player.role, detail: 'The recruitment network replaced a low-priority listing during the commissioned search.' });
    }
    const arrivals = [];
    while (arrivals.length < removable.length && careerState.market.length < DYNAMIC_MARKET_TARGET_SIZE) arrivals.push(dynamicMarketAddArrival(day));
    dynamicMarketRecordEvent('network-refresh', { day, amount: TEAM_MARKET_REFRESH_COST, detail: `The club commissioned a targeted search that produced ${arrivals.length} new candidate${arrivals.length === 1 ? '' : 's'} without clearing protected targets.` });
    selectedTeamPlayerId = arrivals[0]?.id || careerState.market[0]?.id || null;
    dynamicMarketMaybeSendDigest(day, true);
    saveCareerState();
    updateMenuUI();
    return true;
  };

  const baseTransferProcessDayDynamicMarket = transferProcessDay;
  transferProcessDay = function transferProcessDayWithDynamicMarket() {
    const result = baseTransferProcessDayDynamicMarket();
    dynamicMarketProcessDay(clubCalendarState().absoluteDay);
    saveCareerState();
    return result;
  };

  const baseCompleteIncomingTransferDynamicMarket = completeIncomingTransfer;
  completeIncomingTransfer = function completeIncomingTransferWithOrganicDossier() {
    const deal = transferState().activeIncoming ? { ...transferState().activeIncoming } : null;
    const playerBefore = deal ? transferMarketPlayer(deal.playerId) : null;
    const originSnapshot = playerBefore?.marketOrigin ? { ...playerBefore.marketOrigin } : null;
    const result = baseCompleteIncomingTransferDynamicMarket();
    if (!result?.ok) return result;
    if (originSnapshot) result.player.marketOrigin = originSnapshot;
    dynamicMarketRecordEvent('user-signing', { day: clubCalendarState().absoluteDay, playerId: result.player.id, playerName: result.player.name, clubName: careerState.name, role: result.player.role, amount: deal?.offeredFee || result.player.fee, important: true });
    dynamicMarketSigningMail(result.player, deal);
    dynamicMarketReplenish(clubCalendarState().absoluteDay, false);
    saveCareerState();
    return result;
  };

  const baseRecruitTeamPlayerDynamicMarket = recruitTeamPlayer;
  recruitTeamPlayer = function recruitTeamPlayerWithOrganicDossier(id) {
    const playerBefore = transferMarketPlayer(id);
    const originSnapshot = playerBefore?.marketOrigin ? { ...playerBefore.marketOrigin } : null;
    const result = baseRecruitTeamPlayerDynamicMarket(id);
    if (!result?.ok) return result;
    if (originSnapshot) result.player.marketOrigin = originSnapshot;
    dynamicMarketRecordEvent('user-signing', { day: clubCalendarState().absoluteDay, playerId: result.player.id, playerName: result.player.name, clubName: careerState.name, role: result.player.role, amount: result.player.fee, important: true });
    dynamicMarketSigningMail(result.player, { offeredFee: result.player.fee, offeredWage: result.player.wage });
    dynamicMarketReplenish(clubCalendarState().absoluteDay, false);
    saveCareerState();
    return result;
  };

  const baseSettleLeagueAfterCareerMatchDynamicMail = settleLeagueAfterCareerMatch;
  settleLeagueAfterCareerMatch = function settleLeagueAfterCareerMatchWithOrganicMail(winner, summary) {
    const result = baseSettleLeagueAfterCareerMatchDynamicMail(winner, summary);
    dynamicMarketUpgradeLatestResultMail(result, winner, summary);
    return result;
  };

  function dynamicTransferMarketForTest() {
    const snapshot = JSON.parse(JSON.stringify(careerState));
    const previousSelected = selectedTeamPlayerId;
    try {
      if (!careerState.created) return { ok: false, reason: 'Career required for dynamic-market test.' };
      careerState.mail = [];
      careerState.mailSequence = 0;
      careerState.market = [];
      careerState.recruitment = {
        ...careerState.recruitment,
        shortlistIds: [], reports: {}, aiActivity: [],
        marketDynamics: { version: 1, sequence: 0, lastProcessedDay: -1, lastDigestDay: -4, lastGenerationDay: -1, lastWeeklyReviewWeek: 0, divisionTier: 3, season: 1, processedActivityIds: [], eventLog: [] }
      };
      const league = ensureLeagueState();
      league.divisionTier = 3;
      const day = clubCalendarState().absoluteDay;
      const d3 = [];
      for (let index = 0; index < 10; index++) {
        const player = dynamicMarketAddArrival(day, TEAM_ROLES[index % TEAM_ROLES.length].id);
        d3.push(player);
      }
      const uniqueNames = new Set(d3.map(player => player.name)).size === d3.length;
      const d3TierSafe = d3.every(player => player.scoutingDivision >= 3);
      const d3Average = d3.reduce((sum, player) => sum + teamPlayerOverall(player), 0) / d3.length;
      careerState.market = [];
      careerState.recruitment.reports = {};
      careerState.recruitment.marketDynamics.sequence = 0;
      league.divisionTier = 1;
      const d1 = [];
      for (let index = 0; index < 10; index++) {
        const player = dynamicMarketAddArrival(day, TEAM_ROLES[index % TEAM_ROLES.length].id);
        d1.push(player);
      }
      const d1TierSafe = d1.every(player => player.scoutingDivision >= 1);
      const d1Average = d1.reduce((sum, player) => sum + teamPlayerOverall(player), 0) / d1.length;
      const tierStrengthProgression = d1Average > d3Average + 8;
      const allHaveOrigins = [...d3, ...d1].every(player => player.marketOrigin?.label && Number.isFinite(Number(player.availabilityUntilDay)) && player.marketMomentum);
      const anchor = { ...d1[0], id: 'TEST-ANCHOR', name: 'Test Anchor', role: 'anchor', secondaryRole: 'support', fee: 40000, value: 44000, wage: 3200 };
      const entry = { ...d1[1], id: 'TEST-ENTRY', name: 'Test Entry', role: 'entry', secondaryRole: 'flanker', fee: 40000, value: 44000, wage: 3200 };
      const testClub = { id: 'test-club', name: 'Test Club', rating: 48, style: 'DEFENCE', roles: ['anchor','anchor','support','caller','marksman'], roster: [{ ...entry, id: 'R1' }, { ...entry, id: 'R2' }, { ...entry, id: 'R3' }, { ...entry, id: 'R4' }, { ...entry, id: 'R5' }], transferBudget: 200000, wageBudget: 18000, marketLastActionDay: -5 };
      const bid = dynamicMarketSelectRivalBid([entry, anchor], [testClub], day, () => 0.01);
      const intelligentRoleTargeting = bid?.player?.role === 'anchor' && bid.needRole === 'anchor';
      dynamicMarketReplenish(day, false);
      const protectedId = careerState.market[0]?.id || '';
      recruitmentState().shortlistIds = protectedId ? [protectedId] : [];
      careerState.credits = Math.max(100000, Number(careerState.credits) || 0);
      const creditsBeforeSearch = careerState.credits;
      const searchResult = refreshTeamMarket();
      const targetedSearchPreservesShortlist = Boolean(searchResult && protectedId && careerState.market.some(player => player.id === protectedId) && careerState.credits === creditsBeforeSearch - TEAM_MARKET_REFRESH_COST && careerState.market.length === DYNAMIC_MARKET_TARGET_SIZE);
      const rivalClub = transferRivalClubs()[0] || null;
      let rivalRosterPersists = true;
      if (rivalClub) {
        rivalClub.roster = Array.isArray(rivalClub.roster) ? rivalClub.roster : [];
        const extra = normaliseGeneratedPlayer({ ...careerState.market[1], id: 'TEST-RIVAL-DEPTH', name: 'Test Rival Depth', currentTeam: rivalClub.name }, 'TEST-RIVAL-DEPTH');
        rivalClub.roster.push(extra);
        const savedLeague = JSON.parse(JSON.stringify(careerState.league));
        careerState.league = savedLeague;
        leagueNormalisedState = null;
        rivalRosterPersists = (ensureLeagueState().clubs.find(club => club.id === rivalClub.id)?.roster?.length || 0) >= 6;
      }
      const longText = 'This is a deliberately long organic market report generated from simulation data. '.repeat(32);
      const organic = clubAddOrganicMail({ subject: 'Organic test report', paragraphs: [longText, dynamicMarketUserSquadParagraph()], category: 'RECRUITMENT', sender: 'Test Recruitment Intelligence', preview: 'Organic simulation report.', storyKey: 'test-organic' });
      const longMailPreserved = organic.body.length > 900 && organic.sender === 'Test Recruitment Intelligence' && organic.organic === true && organic.preview.length > 0;
      const pulseMarkup = dynamicMarketPulseMarkup();
      const contextMarkup = dynamicMarketPlayerContextMarkup(d1[0]);
      const uiContextPresent = /LIVING TRANSFER MARKET/.test(pulseMarkup) && /MARKET/.test(contextMarkup) && /SOURCE/.test(contextMarkup);
      const normalised = normaliseCareerState(JSON.parse(JSON.stringify(careerState)));
      const statePersists = normalised.recruitment?.marketDynamics?.eventLog?.length > 0 && normalised.market.every(player => player.marketOrigin || player.id.startsWith('TEST-'));
      const host = document.createElement('div');
      host.innerHTML = '<div class="club-mail-message-body"><p>Scrollable mail</p></div><div class="team-note-overlay" data-mode="mail"><div class="team-note-body">Scrollable modal</div></div>';
      document.body.appendChild(host);
      const readerStyle = getComputedStyle(host.querySelector('.club-mail-message-body'));
      const modalStyle = getComputedStyle(host.querySelector('.team-note-body'));
      const scrollReady = ['auto','scroll'].includes(readerStyle.overflowY) && ['auto','scroll'].includes(modalStyle.overflowY);
      host.remove();
      const checks = { uniqueNames, d3TierSafe, d1TierSafe, tierStrengthProgression, allHaveOrigins, intelligentRoleTargeting, targetedSearchPreservesShortlist, rivalRosterPersists, longMailPreserved, uiContextPresent, statePersists, scrollReady };
      return { ok: Object.values(checks).every(Boolean), checks, d3Average: Math.round(d3Average), d1Average: Math.round(d1Average), bid: bid ? { player: bid.player.name, role: bid.player.role, needRole: bid.needRole, club: bid.club.name } : null, organicLength: organic.body.length };
    } finally {
      careerState = normaliseCareerState(snapshot);
      selectedTeamPlayerId = previousSelected;
    }
  }
