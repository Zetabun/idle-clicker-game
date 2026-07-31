/*
 * Strikewatch source module: 56-world-press-awards.js
 * Purpose: Persistent match awards, player accolade history, rival match reports,
 *          matchday press roundups and pre-match opposition-watch mail.
 *
 * This module extends the existing league, finance, mail and player-profile
 * authorities. It does not alter combat AI, weapon balance or fixture outcomes.
 */

  const WORLD_PRESS_VERSION = 1;
  const WORLD_PRESS_MAX_FIXTURE_REPORTS = 240;
  const WORLD_PRESS_MAX_PLAYER_ENTRIES = 120;
  const WORLD_PRESS_MAX_CLUB_HONOURS = 240;
  const WORLD_PRESS_MOTM_REWARD = Object.freeze({ league: 1500, exhibition: 750, tutorial: 0 });
  const WORLD_PRESS_NORMALISED_STATES = new WeakSet();

  function worldPressDefaultState() {
    return {
      version: WORLD_PRESS_VERSION,
      sequence: 0,
      fixtureReports: {},
      fixtureOrder: [],
      playerRecords: {},
      clubHonours: [],
      roundupKeys: [],
      intelFixtureIds: [],
      matchdayAwardKeys: [],
      monthlyAwardKeys: [],
      seasonAwardKeys: [],
      legacyBackfillVersion: 0
    };
  }

  function worldPressSafeObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  function ensureWorldPressState() {
    if (!careerState?.created) return null;
    const fallback = worldPressDefaultState();
    const raw = worldPressSafeObject(careerState.worldPress);
    if (WORLD_PRESS_NORMALISED_STATES.has(raw)) return raw;
    const state = {
      ...fallback,
      ...raw,
      version: WORLD_PRESS_VERSION,
      sequence: Math.max(0, Math.round(Number(raw.sequence) || 0)),
      fixtureReports: worldPressSafeObject(raw.fixtureReports),
      fixtureOrder: Array.isArray(raw.fixtureOrder) ? raw.fixtureOrder.map(String).slice(0, WORLD_PRESS_MAX_FIXTURE_REPORTS) : [],
      playerRecords: worldPressSafeObject(raw.playerRecords),
      clubHonours: Array.isArray(raw.clubHonours) ? raw.clubHonours.slice(0, WORLD_PRESS_MAX_CLUB_HONOURS).map(item => ({ ...item })) : [],
      roundupKeys: Array.isArray(raw.roundupKeys) ? raw.roundupKeys.map(String).slice(0, 120) : [],
      intelFixtureIds: Array.isArray(raw.intelFixtureIds) ? raw.intelFixtureIds.map(String).slice(0, 120) : [],
      matchdayAwardKeys: Array.isArray(raw.matchdayAwardKeys) ? raw.matchdayAwardKeys.map(String).slice(0, 120) : [],
      monthlyAwardKeys: Array.isArray(raw.monthlyAwardKeys) ? raw.monthlyAwardKeys.map(String).slice(0, 80) : [],
      seasonAwardKeys: Array.isArray(raw.seasonAwardKeys) ? raw.seasonAwardKeys.map(String).slice(0, 40) : [],
      legacyBackfillVersion: Math.max(0, Math.round(Number(raw.legacyBackfillVersion) || 0))
    };
    for (const [playerId, rawRecord] of Object.entries(state.playerRecords)) {
      const record = worldPressSafeObject(rawRecord);
      state.playerRecords[playerId] = {
        playerId: String(record.playerId || playerId),
        playerName: String(record.playerName || 'Unknown Operator').slice(0, 80),
        currentClub: String(record.currentClub || '').slice(0, 80),
        entries: Array.isArray(record.entries) ? record.entries.slice(0, WORLD_PRESS_MAX_PLAYER_ENTRIES).map(item => ({ ...item })) : []
      };
    }
    careerState.worldPress = state;
    WORLD_PRESS_NORMALISED_STATES.add(state);
    return state;
  }

  function worldPressCompetitionLabel(mode = 'league', season = null, matchday = null) {
    if (mode === 'exhibition') return 'EXHIBITION MATCH';
    if (mode === 'tutorial') return 'GUIDED ORIENTATION';
    const division = typeof leagueCompetitionName === 'function' ? leagueCompetitionName() : 'STRIKEWATCH LEAGUE';
    const round = Number(matchday) > 0 ? ` · MATCHDAY ${Math.round(Number(matchday))}` : '';
    const year = Number(season) > 0 ? ` · SEASON ${Math.round(Number(season))}` : '';
    return `${division}${year}${round}`;
  }

  function worldPressPlayerRecord(playerOrId, playerName = '', clubName = '') {
    const state = ensureWorldPressState();
    if (!state) return null;
    const player = playerOrId && typeof playerOrId === 'object' ? playerOrId : null;
    const playerId = String(player?.id || playerOrId || '').trim();
    if (!playerId) return null;
    const existing = worldPressSafeObject(state.playerRecords[playerId]);
    const record = {
      playerId,
      playerName: String(player?.name || playerName || existing.playerName || 'Unknown Operator').slice(0, 80),
      currentClub: String(clubName || player?.currentTeam || existing.currentClub || '').slice(0, 80),
      entries: Array.isArray(existing.entries) ? existing.entries.slice(0, WORLD_PRESS_MAX_PLAYER_ENTRIES).map(item => ({ ...item })) : []
    };
    state.playerRecords[playerId] = record;
    return record;
  }

  function worldPressPlayerById(playerId) {
    const id = String(playerId || '');
    if (!id) return null;
    const direct = [...(careerState.squad || []), ...(careerState.market || [])].find(player => player?.id === id);
    if (direct) return direct;
    const league = typeof ensureLeagueState === 'function' ? ensureLeagueState() : null;
    for (const club of league?.clubs || []) {
      const player = (club.roster || []).find(candidate => candidate?.id === id);
      if (player) return player;
    }
    return null;
  }

  function worldPressAddAccolade(playerOrId, rawEntry = {}, clubName = '') {
    const state = ensureWorldPressState();
    if (!state) return null;
    const player = playerOrId && typeof playerOrId === 'object' ? playerOrId : worldPressPlayerById(playerOrId);
    const record = worldPressPlayerRecord(player || playerOrId, rawEntry.playerName || '', clubName || rawEntry.clubName || '');
    if (!record) return null;
    const key = String(rawEntry.key || `${rawEntry.type || 'honour'}:${rawEntry.title || 'award'}:${rawEntry.fixtureId || rawEntry.matchday || state.sequence + 1}`).slice(0, 180);
    const duplicate = record.entries.find(entry => entry.key === key);
    if (duplicate) return duplicate;
    state.sequence++;
    const date = typeof clubCurrentDateLabel === 'function' ? clubCurrentDateLabel(true) : `WEEK ${careerState.week || 1}`;
    const entry = {
      id: `HON-${state.sequence}`,
      sequence: state.sequence,
      key,
      type: String(rawEntry.type || 'achievement').slice(0, 30),
      title: String(rawEntry.title || 'CAREER ACHIEVEMENT').slice(0, 90),
      shortTitle: String(rawEntry.shortTitle || rawEntry.title || 'ACHIEVEMENT').slice(0, 50),
      detail: String(rawEntry.detail || '').slice(0, 420),
      icon: String(rawEntry.icon || '★').slice(0, 4),
      tone: ['gold','blue','positive','neutral','record'].includes(rawEntry.tone) ? rawEntry.tone : 'neutral',
      dateLabel: String(rawEntry.dateLabel || date).slice(0, 80),
      absoluteDay: Math.max(0, Math.round(Number(rawEntry.absoluteDay) || Number(clubCalendarState?.().absoluteDay) || 0)),
      season: Math.max(1, Math.round(Number(rawEntry.season) || Number(careerState.league?.season) || 1)),
      matchday: Number.isFinite(Number(rawEntry.matchday)) ? Math.max(0, Math.round(Number(rawEntry.matchday))) : null,
      fixtureId: String(rawEntry.fixtureId || '').slice(0, 120),
      competition: String(rawEntry.competition || '').slice(0, 120),
      opponentName: String(rawEntry.opponentName || '').slice(0, 90),
      clubName: String(clubName || rawEntry.clubName || record.currentClub || '').slice(0, 90),
      rating: Number.isFinite(Number(rawEntry.rating)) ? Number(Number(rawEntry.rating).toFixed(2)) : null,
      rewardCr: Math.max(0, Math.round(Number(rawEntry.rewardCr) || 0)),
      historical: Boolean(rawEntry.historical)
    };
    record.entries.unshift(entry);
    record.entries = record.entries.slice(0, WORLD_PRESS_MAX_PLAYER_ENTRIES);
    const isUserOperator = (careerState.squad || []).some(candidate => candidate?.id === record.playerId);
    if (isUserOperator || entry.clubName === careerState.name || rawEntry.includeInClubHistory) {
      state.clubHonours.unshift({ ...entry, playerId: record.playerId, playerName: record.playerName });
      state.clubHonours = state.clubHonours.slice(0, WORLD_PRESS_MAX_CLUB_HONOURS);
    }
    return entry;
  }

  function worldPressRecordFixtureReport(report) {
    const state = ensureWorldPressState();
    if (!state || !report?.fixtureId) return null;
    const fixtureId = String(report.fixtureId);
    state.fixtureReports[fixtureId] = { ...report, fixtureId };
    state.fixtureOrder = [fixtureId, ...state.fixtureOrder.filter(id => id !== fixtureId)].slice(0, WORLD_PRESS_MAX_FIXTURE_REPORTS);
    const retained = new Set(state.fixtureOrder);
    for (const key of Object.keys(state.fixtureReports)) if (!retained.has(key)) delete state.fixtureReports[key];
    return state.fixtureReports[fixtureId];
  }

  function worldPressFixtureReport(fixtureOrId) {
    const state = ensureWorldPressState();
    const id = String(fixtureOrId?.id || fixtureOrId || '');
    return state?.fixtureReports?.[id] || null;
  }

  function worldPressDistributeTotal(total, rawWeights) {
    const target = Math.max(0, Math.round(Number(total) || 0));
    const weights = (Array.isArray(rawWeights) ? rawWeights : []).map(value => Math.max(0.001, Number(value) || 0.001));
    if (!weights.length) return [];
    const sum = weights.reduce((value, weight) => value + weight, 0);
    const exact = weights.map(weight => target * weight / sum);
    const values = exact.map(Math.floor);
    let remaining = target - values.reduce((value, amount) => value + amount, 0);
    exact.map((value, index) => ({ index, remainder: value - Math.floor(value) }))
      .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
      .forEach(item => {
        if (remaining <= 0) return;
        values[item.index]++;
        remaining--;
      });
    return values;
  }

  function worldPressPerformanceScore(candidate) {
    const rating = clamp(Number(candidate?.rating) || 0, 0, 10);
    const kills = Math.max(0, Number(candidate?.kills) || 0);
    const deaths = Math.max(0, Number(candidate?.deaths) || 0);
    const assists = Math.max(0, Number(candidate?.assists) || Number(candidate?.tradeKills) || 0);
    const headshots = Math.max(0, Number(candidate?.headshots) || 0);
    const survived = Math.max(0, Number(candidate?.survivedRounds) || 0);
    const roleActions = Math.max(0, Number(candidate?.roleActions) || 0);
    const winnerBonus = candidate?.won ? 4.5 : 0;
    return rating * 10 + kills * 4.2 - deaths * 1.35 + assists * 2.4 + headshots * 0.8 + survived * 0.55 + roleActions * 0.10 + winnerBonus;
  }

  function worldPressSelectManOfTheMatch(candidates) {
    const valid = (Array.isArray(candidates) ? candidates : []).filter(candidate => candidate?.playerId && candidate?.playerName);
    if (!valid.length) return null;
    return valid.map(candidate => ({ ...candidate, impactScore: worldPressPerformanceScore(candidate) }))
      .sort((a, b) => b.impactScore - a.impactScore || (Number(b.rating) || 0) - (Number(a.rating) || 0) || (Number(b.kills) || 0) - (Number(a.kills) || 0) || String(a.playerName).localeCompare(String(b.playerName)))[0];
  }

  function worldPressMilestoneDefinitions(player) {
    const career = worldPressSafeObject(player?.career);
    const last = worldPressSafeObject(player?.lastMatch);
    return [
      { key: 'milestone:first-appearance', met: Number(career.matches) >= 1, title: 'FIRST COMPETITIVE APPEARANCE', detail: 'Made a first recorded senior appearance.', icon: '1', tone: 'blue' },
      { key: 'milestone:first-win', met: Number(career.wins) >= 1, title: 'FIRST COMPETITIVE VICTORY', detail: 'Recorded a first senior match victory.', icon: 'W', tone: 'positive' },
      ...[10, 25, 50, 100, 250].map(count => ({ key: `milestone:appearances-${count}`, met: Number(career.matches) >= count, title: `${count} CAREER APPEARANCES`, detail: `Reached ${count} recorded competitive appearances.`, icon: String(count), tone: 'record' })),
      ...[10, 25, 50, 100, 250].map(count => ({ key: `milestone:kills-${count}`, met: Number(career.kills) >= count, title: `${count} CAREER ELIMINATIONS`, detail: `Reached ${count} recorded competitive eliminations.`, icon: 'K', tone: 'record' })),
      ...[10, 25, 50, 100].map(count => ({ key: `milestone:headshots-${count}`, met: Number(career.headshots) >= count, title: `${count} CAREER HEADSHOTS`, detail: `Reached ${count} confirmed headshot eliminations.`, icon: 'H', tone: 'record' })),
      { key: 'milestone:first-double', met: Number(career.doubleKills) >= 1, title: 'FIRST DOUBLE KILL', detail: 'Completed a first same-round double elimination chain.', icon: '2×', tone: 'blue' },
      { key: 'milestone:first-triple', met: Number(career.tripleKills) >= 1, title: 'FIRST TRIPLE KILL', detail: 'Completed a first same-round triple elimination chain.', icon: '3×', tone: 'gold' },
      { key: 'milestone:first-ultra', met: Number(career.ultraKills) >= 1, title: 'FIRST ULTRA KILL', detail: 'Completed a four-elimination Ultra chain.', icon: '4×', tone: 'gold' },
      { key: 'milestone:first-rampage', met: Number(career.rampages) >= 1, title: 'FIRST RAMPAGE', detail: 'Eliminated all five opponents inside one live chain.', icon: '5×', tone: 'gold' },
      { key: `performance:rating-9:${last.fixtureId || last.week || career.matches}`, met: Number(last.rating) >= 9, title: 'ELITE MATCH PERFORMANCE', detail: `Recorded a ${Number(last.rating || 0).toFixed(2)} match rating.`, icon: '9+', tone: 'gold', fixtureScoped: true }
    ];
  }

  function worldPressAwardMilestones(player, context = {}) {
    if (!player?.id) return [];
    const awarded = [];
    for (const milestone of worldPressMilestoneDefinitions(player)) {
      if (!milestone.met) continue;
      const entry = worldPressAddAccolade(player, {
        key: milestone.key,
        type: milestone.fixtureScoped ? 'performance' : 'milestone',
        title: milestone.title,
        detail: milestone.detail,
        icon: milestone.icon,
        tone: milestone.tone,
        season: context.season,
        matchday: context.matchday,
        fixtureId: context.fixtureId,
        competition: context.competition,
        opponentName: context.opponentName,
        clubName: context.clubName
      }, context.clubName || player.currentTeam || '');
      if (entry) awarded.push(entry);
    }
    return awarded;
  }

  function worldPressAiTeamPerformance(club, scoreFor, scoreAgainst, fixture, side, totalKills, totalDeaths) {
    const roster = (club?.roster || []).slice(0, TEAM_REQUIRED_STARTERS);
    if (!roster.length) return [];
    const random = teamRng(teamSeedFromString(`${fixture.id}:${club.id}:${side}:press-performance`));
    const killWeights = roster.map((player, index) => Math.max(2, teamPlayerOverall(player) * (0.72 + random() * 0.42) + (['entry','marksman','flanker'].includes(player.role) ? 8 : 0) + index * 0.2));
    const deathWeights = roster.map(player => Math.max(2, 24 - (Number(player.stats?.resilience) || 1) * 1.6 + random() * 8));
    const kills = worldPressDistributeTotal(totalKills, killWeights);
    const deaths = worldPressDistributeTotal(totalDeaths, deathWeights);
    const rounds = Math.max(3, Number(scoreFor) + Number(scoreAgainst));
    return roster.map((player, index) => {
      const shotsFired = Math.max(kills[index] + 4, Math.round(kills[index] * (3.2 + random() * 1.8) + 7 + random() * 10));
      const shotsHit = clamp(Math.round(kills[index] * (1.2 + random() * 0.8) + shotsFired * (0.17 + (Number(player.stats?.marksmanship) || 1) * 0.016)), kills[index], shotsFired);
      const accuracy = shotsFired ? shotsHit / shotsFired : 0;
      const won = Number(scoreFor) > Number(scoreAgainst);
      const headshots = Math.min(kills[index], Math.max(0, Math.round(kills[index] * (0.16 + (Number(player.stats?.marksmanship) || 1) * 0.018 + random() * 0.14))));
      const survivedRounds = clamp(Math.round(scoreFor * (0.34 + random() * 0.48)), 0, scoreFor);
      const roleActions = Math.round((Number(player.stats?.awareness) || 1) * 0.8 + random() * 6);
      const rating = clamp(5.35 + kills[index] * 0.34 - deaths[index] * 0.19 + accuracy * 1.05 + survivedRounds * 0.08 + (won ? 0.42 : 0) + roleActions * 0.012, 3.6, 9.8);
      return {
        player,
        playerId: player.id,
        playerName: player.name,
        clubId: club.id,
        clubName: club.name,
        role: player.role,
        kills: kills[index],
        deaths: deaths[index],
        shotsFired,
        shotsHit,
        accuracy,
        headshots,
        assists: Math.max(0, Math.round(random() * 3 + (player.role === 'support' || player.role === 'caller' ? 1 : 0))),
        survivedRounds,
        roleActions,
        rounds,
        won,
        rating: Number(rating.toFixed(2))
      };
    });
  }

  function worldPressApplyAiPerformance(performance, context) {
    const player = performance?.player;
    if (!player) return;
    player.career = worldPressSafeObject(player.career);
    const previousMatches = Math.max(0, Number(player.career.matches) || 0);
    const previousRating = clamp(Number(player.career.rating) || 0, 0, 10);
    player.career.matches = previousMatches + 1;
    player.career.wins = Math.max(0, Number(player.career.wins) || 0) + (performance.won ? 1 : 0);
    player.career.kills = Math.max(0, Number(player.career.kills) || 0) + performance.kills;
    player.career.deaths = Math.max(0, Number(player.career.deaths) || 0) + performance.deaths;
    player.career.headshots = Math.max(0, Number(player.career.headshots) || 0) + performance.headshots;
    player.career.criticalHits = Math.max(0, Number(player.career.criticalHits) || 0) + Math.max(0, Math.round(performance.kills * 0.22));
    player.career.rounds = Math.max(0, Number(player.career.rounds) || 0) + performance.rounds;
    player.career.rating = Number(((previousRating * previousMatches + performance.rating) / Math.max(1, previousMatches + 1)).toFixed(2));
    player.form = Number(clamp((Number(player.form) || 6.5) * 0.68 + performance.rating * 0.32, 1, 10).toFixed(1));
    player.morale = clamp(Math.round((Number(player.morale) || 70) + (performance.won ? 2 : -1) + (performance.rating >= 8.2 ? 1 : 0)), 1, 100);
    player.happiness = clamp(Math.round((Number(player.happiness) || 70) + (performance.won ? 1 : -1)), 1, 100);
    player.lastMatch = {
      week: Math.max(1, Number(careerState.week) || 1),
      fixtureId: context.fixtureId,
      matchday: context.matchday,
      won: performance.won,
      competition: 'league',
      opponentName: context.opponentName,
      result: context.result,
      rating: performance.rating,
      kills: performance.kills,
      deaths: performance.deaths,
      shotsFired: performance.shotsFired,
      shotsHit: performance.shotsHit,
      headshots: performance.headshots,
      accuracy: performance.accuracy,
      survivedRounds: performance.survivedRounds,
      rounds: performance.rounds,
      assignedRole: player.role
    };
    worldPressAwardMilestones(player, context);
  }

  function worldPressFixtureWriteup(home, away, fixture, motm) {
    const margin = Math.abs(Number(fixture.homeScore) - Number(fixture.awayScore));
    const winner = fixture.winnerId === home.id ? home : away;
    const loser = winner.id === home.id ? away : home;
    const winnerRating = Number(winner.rating) || 50;
    const loserRating = Number(loser.rating) || 50;
    const upset = winnerRating + 7 < loserRating;
    if (upset) return `${winner.name} overturned the pre-match strength order, with ${motm.playerName} producing the decisive individual display.`;
    if (margin >= 3) return `${winner.name} controlled the fixture from the opening round and completed a clean sweep behind ${motm.playerName}'s performance.`;
    if (margin === 1) return `${winner.name} survived a deciding-round contest as ${motm.playerName} delivered the clearest high-impact moments.`;
    return `${winner.name} converted the stronger middle rounds and pulled clear, led by ${motm.playerName}.`;
  }

  function worldPressGenerateAiFixtureReport(fixture, options = {}) {
    const state = ensureWorldPressState();
    if (!state || !fixture?.played || !fixture.id) return null;
    if (state.fixtureReports[fixture.id]) return state.fixtureReports[fixture.id];
    const home = leagueClubById(fixture.homeId);
    const away = leagueClubById(fixture.awayId);
    if (!home || !away || home.id === LEAGUE_USER_CLUB_ID || away.id === LEAGUE_USER_CLUB_ID) return null;
    const random = teamRng(teamSeedFromString(`${fixture.id}:press-kill-totals`));
    const homeKills = fixture.homeScore * 5 + Array.from({ length: fixture.awayScore }, () => Math.floor(random() * 4)).reduce((sum, value) => sum + value, 0);
    const awayKills = fixture.awayScore * 5 + Array.from({ length: fixture.homeScore }, () => Math.floor(random() * 4)).reduce((sum, value) => sum + value, 0);
    const homePerformance = worldPressAiTeamPerformance(home, fixture.homeScore, fixture.awayScore, fixture, 'home', homeKills, awayKills);
    const awayPerformance = worldPressAiTeamPerformance(away, fixture.awayScore, fixture.homeScore, fixture, 'away', awayKills, homeKills);
    const candidates = [...homePerformance, ...awayPerformance];
    const motm = worldPressSelectManOfTheMatch(candidates);
    if (!motm) return null;
    const contextFor = performance => ({
      fixtureId: fixture.id,
      matchday: fixture.matchday,
      season: fixture.season || careerState.league?.season || 1,
      competition: worldPressCompetitionLabel('league', fixture.season, fixture.matchday),
      opponentName: performance.clubId === home.id ? away.name : home.name,
      clubName: performance.clubName,
      result: performance.clubId === home.id ? `${fixture.homeScore} — ${fixture.awayScore}` : `${fixture.awayScore} — ${fixture.homeScore}`
    });
    if (options.apply !== false) {
      for (const performance of candidates) worldPressApplyAiPerformance(performance, contextFor(performance));
      worldPressAddAccolade(motm.player, {
        key: `award:motm:${fixture.id}`,
        type: 'award',
        title: 'MAN OF THE MATCH',
        detail: `${motm.kills} eliminations, ${motm.deaths} deaths and a ${motm.rating.toFixed(2)} rating in ${motm.clubName}'s ${motm.won ? 'victory' : 'fixture'}.`,
        icon: '★',
        tone: 'gold',
        season: fixture.season,
        matchday: fixture.matchday,
        fixtureId: fixture.id,
        competition: worldPressCompetitionLabel('league', fixture.season, fixture.matchday),
        opponentName: motm.clubId === home.id ? away.name : home.name,
        clubName: motm.clubName,
        rating: motm.rating
      }, motm.clubName);
    }
    const report = {
      fixtureId: fixture.id,
      mode: 'league',
      season: Math.max(1, Number(fixture.season) || Number(careerState.league?.season) || 1),
      matchday: Math.max(1, Number(fixture.matchday) || 1),
      homeId: home.id,
      awayId: away.id,
      homeName: home.name,
      awayName: away.name,
      homeShort: home.short,
      awayShort: away.short,
      homeScore: fixture.homeScore,
      awayScore: fixture.awayScore,
      winnerId: fixture.winnerId,
      motm: {
        playerId: motm.playerId,
        playerName: motm.playerName,
        clubId: motm.clubId,
        clubName: motm.clubName,
        role: motm.role,
        kills: motm.kills,
        deaths: motm.deaths,
        rating: motm.rating
      },
      writeup: worldPressFixtureWriteup(home, away, fixture, motm),
      day: Math.max(0, Number(clubCalendarState?.().absoluteDay) || 0),
      historical: Boolean(options.historical)
    };
    return options.apply === false ? report : worldPressRecordFixtureReport(report);
  }

  function worldPressCaptureOpponentCandidates(opponent) {
    const diagnosticOperators = lastCompletedDiagnosticReport?.summary?.operators || matchDiagnostics?.summary?.operators || [];
    return (opponent?.roster || []).slice(0, TEAM_REQUIRED_STARTERS).map((player, slot) => {
      const bot = bots.find(candidate => candidate.team === TEAM_RED && candidate.slot === slot) || null;
      const diagnostic = diagnosticOperators.find(item => Number(item?.team) === TEAM_RED && Number(item?.slot) === slot) || null;
      const kills = Math.max(0, Math.round(Number(diagnostic?.kills ?? bot?.kills) || 0));
      const deaths = Math.max(0, Math.round(Number(diagnostic?.deaths ?? bot?.deaths) || 0));
      return {
        player,
        playerId: player.id,
        playerName: player.name,
        clubId: opponent.id,
        clubName: opponent.name,
        role: player.role,
        kills,
        deaths,
        headshots: Math.max(0, Math.round(Number(bot?.roundHeadshots) || 0)),
        assists: Math.max(0, Math.round(Number(diagnostic?.tradeKills) || 0)),
        survivedRounds: Math.max(0, Math.round((Number(diagnostic?.survivalTime) || 0) / Math.max(1, ROUND_DURATION * 0.7))),
        roleActions: Math.max(0, Math.round(Number(diagnostic?.tacticalChanges) || 0)),
        rating: Number(clamp(5.35 + kills * 0.38 - deaths * 0.18 + (Number(diagnostic?.effectiveRangePercent) || 50) * 0.006, 3.6, 9.7).toFixed(2))
      };
    });
  }

  function worldPressOwnedCandidates(summary) {
    return (careerState.squad || []).slice(0, TEAM_REQUIRED_STARTERS).map(player => {
      const performance = typeof teamMatchPerformance === 'function' ? teamMatchPerformance(player.id) : null;
      const last = player.lastMatch || {};
      return {
        player,
        playerId: player.id,
        playerName: player.name,
        clubId: LEAGUE_USER_CLUB_ID,
        clubName: careerState.name,
        role: player.role,
        kills: Math.max(0, Number(performance?.kills ?? last.kills) || 0),
        deaths: Math.max(0, Number(performance?.deaths ?? last.deaths) || 0),
        headshots: Math.max(0, Number(performance?.headshots ?? last.headshots) || 0),
        assists: Math.max(0, Number(performance?.tradeKills) || 0),
        tradeKills: Math.max(0, Number(performance?.tradeKills) || 0),
        survivedRounds: Math.max(0, Number(performance?.survivedRounds ?? last.survivedRounds) || 0),
        roleActions: Math.max(0, Number(performance?.roleActions) || 0),
        rating: Number(clamp(Number(performance?.rating ?? last.rating) || 5, 3.5, 9.8).toFixed(2)),
        won: Boolean(summary?.won)
      };
    });
  }

  function worldPressUserFixtureWriteup(summary, motm, opponentName) {
    const margin = Math.abs(Number(summary?.blueScore) - Number(summary?.redScore));
    const highlight = summary?.matchHighlights?.cards?.find(card => card.id === 'turning-point' || card.id === 'play-of-match');
    if (highlight?.detail || highlight?.body) return String(highlight.detail || highlight.body).slice(0, 320);
    if (margin >= 3) return `${summary.won ? careerState.name : opponentName} completed a clean sweep, with ${motm.playerName} setting the performance standard.`;
    if (margin === 1) return `The fixture reached a deciding round before ${motm.playerName}'s impact separated the teams.`;
    return `${motm.playerName} produced the strongest all-round display as the match moved through repeated momentum swings.`;
  }

  function worldPressSettleUserMatch(winner, summary, capture, result) {
    const state = ensureWorldPressState();
    if (!state || !summary) return null;
    const mode = result?.mode || capture.mode || summary.matchPresentation?.mode || 'exhibition';
    const fixtureId = String(result?.fixtureId || capture.fixtureId || `EX-S${careerState.league?.season || 1}-M${careerState.totalMatches}`);
    const recordedReport = state.fixtureReports?.[fixtureId];
    if (recordedReport?.motm) {
      summary.manOfTheMatch = { ...recordedReport.motm };
      return summary.manOfTheMatch;
    }
    if (summary.manOfTheMatch?.fixtureId === fixtureId) return summary.manOfTheMatch;
    const opponent = capture.opponent;
    const opponentName = result?.opponentName || opponent?.name || summary.redTeamName || 'Opposition';
    const ownWon = winner === CAREER_OWNED_TEAM;
    const candidates = [
      ...worldPressOwnedCandidates(summary).map(candidate => ({ ...candidate, won: ownWon })),
      ...(capture.opponentCandidates || []).map(candidate => ({ ...candidate, won: !ownWon }))
    ];
    const motm = worldPressSelectManOfTheMatch(candidates) || worldPressSelectManOfTheMatch(worldPressOwnedCandidates(summary));
    if (!motm) return null;
    const matchday = Number(result?.matchday || capture.matchday) || null;
    const season = Math.max(1, Number(result?.season || careerState.league?.season) || 1);
    const competition = worldPressCompetitionLabel(mode, season, matchday);
    const userWonAward = motm.clubId === LEAGUE_USER_CLUB_ID;
    const rewardCr = userWonAward ? Math.max(0, Number(WORLD_PRESS_MOTM_REWARD[mode]) || 0) : 0;
    const detail = `${motm.kills} eliminations, ${motm.deaths} deaths and a ${motm.rating.toFixed(2)} rating${userWonAward && rewardCr ? ` · ${teamCredits(rewardCr)} club award` : ''}.`;
    summary.manOfTheMatch = {
      fixtureId,
      playerId: motm.playerId,
      playerName: motm.playerName,
      clubId: motm.clubId,
      clubName: motm.clubName,
      role: motm.role,
      kills: motm.kills,
      deaths: motm.deaths,
      rating: motm.rating,
      rewardCr,
      userWonAward
    };
    worldPressAddAccolade(motm.player || motm.playerId, {
      key: `award:motm:${fixtureId}`,
      type: 'award',
      title: 'MAN OF THE MATCH',
      detail,
      icon: '★',
      tone: 'gold',
      season,
      matchday,
      fixtureId,
      competition,
      opponentName: motm.clubId === LEAGUE_USER_CLUB_ID ? opponentName : careerState.name,
      clubName: motm.clubName,
      rating: motm.rating,
      rewardCr,
      includeInClubHistory: userWonAward
    }, motm.clubName);
    for (const player of (careerState.squad || []).slice(0, TEAM_REQUIRED_STARTERS)) {
      if (player.lastMatch) player.lastMatch.fixtureId = fixtureId;
      worldPressAwardMilestones(player, { fixtureId, matchday, season, competition, opponentName, clubName: careerState.name });
      if (ownWon && Number(summary.blueScore) === 3 && Number(summary.redScore) === 0) {
        worldPressAddAccolade(player, {
          key: `achievement:clean-sweep:${fixtureId}`,
          type: 'achievement',
          title: 'CLEAN SWEEP SQUAD MEMBER',
          detail: `Started in ${careerState.name}'s 3–0 victory over ${opponentName}.`,
          icon: '3–0',
          tone: 'positive',
          fixtureId,
          matchday,
          season,
          competition,
          opponentName,
          clubName: careerState.name
        }, careerState.name);
      }
    }
    if (capture.opponentCandidates?.length && opponent) {
      const opponentResult = `${Number(summary.redScore) || 0} — ${Number(summary.blueScore) || 0}`;
      for (const candidate of capture.opponentCandidates) {
        worldPressApplyAiPerformance({ ...candidate, won: !ownWon }, {
          fixtureId,
          matchday,
          season,
          competition,
          opponentName: careerState.name,
          clubName: opponent.name,
          result: opponentResult
        });
      }
    }
    if (userWonAward && rewardCr > 0) {
      careerState.credits += rewardCr;
      if (typeof teamFinanceTransaction === 'function') teamFinanceTransaction('AWARD', rewardCr, `Man of the Match · ${motm.playerName}`);
      summary.finance = summary.finance && typeof summary.finance === 'object' ? summary.finance : {};
      const previousIncome = Math.max(0, Number(summary.finance.income) || 0);
      const previousNet = Number.isFinite(Number(summary.finance.net)) ? Number(summary.finance.net) : previousIncome;
      summary.finance.manOfTheMatchBonus = rewardCr;
      summary.finance.income = previousIncome + rewardCr;
      summary.finance.net = previousNet + rewardCr;
    }
    const homeId = mode === 'league' && capture.fixture ? capture.fixture.homeId : LEAGUE_USER_CLUB_ID;
    const awayId = mode === 'league' && capture.fixture ? capture.fixture.awayId : (opponent?.id || 'exhibition-opponent');
    const homeName = homeId === LEAGUE_USER_CLUB_ID ? careerState.name : opponentName;
    const awayName = awayId === LEAGUE_USER_CLUB_ID ? careerState.name : opponentName;
    const userHome = homeId === LEAGUE_USER_CLUB_ID;
    const report = worldPressRecordFixtureReport({
      fixtureId,
      mode,
      season,
      matchday,
      homeId,
      awayId,
      homeName,
      awayName,
      homeShort: homeId === LEAGUE_USER_CLUB_ID ? leagueShortName(careerState.name) : opponent?.short || leagueShortName(opponentName),
      awayShort: awayId === LEAGUE_USER_CLUB_ID ? leagueShortName(careerState.name) : opponent?.short || leagueShortName(opponentName),
      homeScore: userHome ? Number(summary.blueScore) : Number(summary.redScore),
      awayScore: userHome ? Number(summary.redScore) : Number(summary.blueScore),
      winnerId: ownWon ? LEAGUE_USER_CLUB_ID : opponent?.id || awayId,
      motm: { ...summary.manOfTheMatch },
      writeup: worldPressUserFixtureWriteup(summary, motm, opponentName),
      day: Math.max(0, Number(clubCalendarState?.().absoluteDay) || 0)
    });
    worldPressUpgradeLatestResultMail(result, summary, report);
    if (mode === 'league' && matchday) worldPressSendMatchdayRoundup(season, matchday);
    if (result?.seasonComplete) worldPressAwardSeasonHonours(season);
    return summary.manOfTheMatch;
  }

  function worldPressUpgradeLatestResultMail(result, summary, report) {
    if (!result || result.mode !== 'league' || !report?.motm) return null;
    const mail = (careerState.mail || []).find(item => item.storyKey === `match-report-${result.fixtureId || result.matchday}`)
      || (careerState.mail || []).find(item => item.category === 'RESULT' && item.day === clubCalendarState().absoluteDay);
    if (!mail) return null;
    const award = report.motm;
    const awardText = `MAN OF THE MATCH\n${award.playerName} · ${award.clubName}\n${award.kills} eliminations · ${award.deaths} deaths · ${Number(award.rating).toFixed(2)} rating${award.rewardCr ? ` · ${teamCredits(award.rewardCr)} awarded to ${careerState.name}` : ''}`;
    if (!String(mail.body || '').includes('MAN OF THE MATCH\n')) mail.body = `${String(mail.body || '').trim()}\n\n${awardText}`.slice(0, 6000);
    mail.preview = `${String(mail.preview || '').replace(/\.$/, '')} · MOTM ${award.playerName} (${Number(award.rating).toFixed(1)}).`.slice(0, 220);
    return mail;
  }

  function worldPressMatchdayReports(season, matchday) {
    const state = ensureWorldPressState();
    return Object.values(state?.fixtureReports || {})
      .filter(report => report.mode === 'league' && Number(report.season) === Number(season) && Number(report.matchday) === Number(matchday))
      .sort((a, b) => String(a.homeName).localeCompare(String(b.homeName)));
  }

  function worldPressAwardMatchdayHonours(season, matchday, reports) {
    const state = ensureWorldPressState();
    if (!state) return { teamOfWeek: [], monthly: null };
    const teamKey = `team-of-week:s${season}:m${matchday}`;
    const teamAlready = state.matchdayAwardKeys.includes(teamKey);
    const teamOfWeek = reports.map(report => report.motm).filter(Boolean)
      .sort((a, b) => Number(b.rating) - Number(a.rating) || Number(b.kills) - Number(a.kills))
      .slice(0, 5);
    if (!teamAlready) {
      for (const player of teamOfWeek) {
        worldPressAddAccolade(player.playerId, {
          key: `award:team-of-week:s${season}:m${matchday}:${player.playerId}`,
          playerName: player.playerName,
          type: 'award',
          title: 'MATCHDAY TEAM OF THE WEEK',
          detail: `Selected among the five leading performers from Matchday ${matchday}.`,
          icon: 'XI',
          tone: 'blue',
          season,
          matchday,
          fixtureId: reports.find(report => report.motm?.playerId === player.playerId)?.fixtureId || '',
          competition: worldPressCompetitionLabel('league', season, matchday),
          clubName: player.clubName,
          rating: player.rating,
          includeInClubHistory: (careerState.squad || []).some(candidate => candidate.id === player.playerId)
        }, player.clubName);
      }
      state.matchdayAwardKeys.push(teamKey);
      state.matchdayAwardKeys = state.matchdayAwardKeys.slice(-120);
    }
    let monthly = null;
    if (matchday % 4 === 0) {
      const monthKey = `operator-of-month:s${season}:m${matchday - 3}-${matchday}`;
      if (!state.monthlyAwardKeys.includes(monthKey)) {
        const candidates = Object.values(state.fixtureReports).filter(report => report.mode === 'league' && Number(report.season) === Number(season) && Number(report.matchday) > matchday - 4 && Number(report.matchday) <= matchday).map(report => report.motm).filter(Boolean);
        monthly = candidates.sort((a, b) => Number(b.rating) - Number(a.rating) || Number(b.kills) - Number(a.kills))[0] || null;
        if (monthly) {
          worldPressAddAccolade(monthly.playerId, {
            key: `award:${monthKey}:${monthly.playerId}`,
            playerName: monthly.playerName,
            type: 'award',
            title: 'OPERATOR OF THE MONTH',
            detail: `Named the division's leading operator across Matchdays ${matchday - 3}–${matchday}.`,
            icon: 'M',
            tone: 'gold',
            season,
            matchday,
            competition: worldPressCompetitionLabel('league', season, matchday),
            clubName: monthly.clubName,
            rating: monthly.rating,
            includeInClubHistory: (careerState.squad || []).some(candidate => candidate.id === monthly.playerId)
          }, monthly.clubName);
          state.monthlyAwardKeys.push(monthKey);
        }
      }
    }
    return { teamOfWeek, monthly };
  }

  function worldPressSendMatchdayRoundup(season, matchday) {
    const state = ensureWorldPressState();
    const key = `roundup:s${season}:m${matchday}`;
    if (!state || state.roundupKeys.includes(key)) return null;
    const reports = worldPressMatchdayReports(season, matchday);
    const expected = Math.max(1, Math.floor((ensureLeagueState()?.clubs?.length || 20) / 2));
    if (reports.length < expected) return null;
    const honours = worldPressAwardMatchdayHonours(season, matchday, reports);
    const clubs = ensureLeagueState()?.clubs || [];
    const clubRating = id => Number(clubs.find(club => club.id === id)?.rating) || 50;
    const upset = reports.map(report => {
      const loserId = report.winnerId === report.homeId ? report.awayId : report.homeId;
      return { report, swing: clubRating(loserId) - clubRating(report.winnerId) };
    }).sort((a, b) => b.swing - a.swing)[0];
    const featured = upset?.swing >= 6 ? upset.report : reports.slice().sort((a, b) => Math.abs(Number(b.homeScore) - Number(b.awayScore)) - Math.abs(Number(a.homeScore) - Number(a.awayScore)))[0];
    const table = typeof leagueTable === 'function' ? leagueTable() : [];
    const resultLines = reports.map(report => `• ${report.homeName} ${report.homeScore}–${report.awayScore} ${report.awayName} — MOTM: ${report.motm.playerName} (${Number(report.motm.rating).toFixed(1)}). ${report.writeup}`).join('\n');
    const tableLines = table.slice(0, 5).map(row => `${row.position}. ${row.name} — ${row.points} pts · ${row.roundDifference >= 0 ? '+' : ''}${row.roundDifference} round difference`).join('\n');
    const teamLine = honours.teamOfWeek.map(player => `${player.playerName} (${player.clubName})`).join(' · ');
    const paragraphs = [
      `The StrikeWatch Wire has filed the complete Matchday ${matchday} report from ${leagueCompetitionName()}. Every fixture now carries a permanent Man of the Match award and the strongest performances enter the division honours record.`,
      featured ? `LEAD STORY\n${featured.homeName} ${featured.homeScore}–${featured.awayScore} ${featured.awayName}\n${featured.writeup}` : '',
      `FULL RESULTS\n${resultLines}`,
      teamLine ? `MATCHDAY TEAM OF THE WEEK\n${teamLine}` : '',
      honours.monthly ? `OPERATOR OF THE MONTH\n${honours.monthly.playerName} · ${honours.monthly.clubName} · ${Number(honours.monthly.rating).toFixed(1)} featured rating.` : '',
      tableLines ? `TABLE SNAPSHOT\n${tableLines}` : '',
      `NEXT STEPS\nUse these reports as public intelligence. Recent results, award winners and tactical patterns will feed the opposition-watch report before your next fixture.`
    ].filter(Boolean);
    const message = clubAddOrganicMail({
      subject: `Matchday ${matchday} roundup · results, awards and table`,
      paragraphs,
      category: 'PRESS',
      important: Boolean(featured && (featured.homeId === LEAGUE_USER_CLUB_ID || featured.awayId === LEAGUE_USER_CLUB_ID)),
      route: 'league',
      sender: 'The StrikeWatch Wire',
      preview: `${reports.length} results · ${reports.length} Man of the Match awards · ${honours.teamOfWeek.length} Team of the Week selections.`,
      storyKey: key
    });
    state.roundupKeys.push(key);
    state.roundupKeys = state.roundupKeys.slice(-120);
    return message;
  }

  function worldPressClubRecentReports(clubId, limit = 5) {
    const state = ensureWorldPressState();
    return Object.values(state?.fixtureReports || {})
      .filter(report => report.mode === 'league' && (report.homeId === clubId || report.awayId === clubId))
      .sort((a, b) => Number(b.season) - Number(a.season) || Number(b.matchday) - Number(a.matchday))
      .slice(0, limit);
  }

  function worldPressMaybeSendUpcomingOpponentIntel() {
    const state = ensureWorldPressState();
    if (!state || typeof leagueNextFixture !== 'function') return null;
    const fixture = leagueNextFixture();
    if (!fixture || state.intelFixtureIds.includes(fixture.id)) return null;
    const days = typeof clubDaysUntilFixture === 'function' ? clubDaysUntilFixture() : null;
    if (days === null || days > 3) return null;
    const opponent = leagueClubById(leagueFixtureOpponentId(fixture));
    if (!opponent) return null;
    const scouting = typeof oppositionReportForClub === 'function' ? oppositionReportForClub(opponent) : { depth: 22 };
    const depth = clamp(Math.round(Number(scouting?.depth) || 22), 0, 100);
    const scout = typeof oppositionScout === 'function' ? oppositionScout() : null;
    const identity = typeof oppositionIdentityForClub === 'function' ? oppositionIdentityForClub(opponent, 1) : { name: opponent.style || 'BALANCED', summary: opponent.styleDetail || '', strengths: [], vulnerabilities: [], counters: [] };
    const recent = worldPressClubRecentReports(opponent.id, 5);
    const formLines = recent.length ? recent.map(report => {
      const home = report.homeId === opponent.id;
      const scored = home ? report.homeScore : report.awayScore;
      const conceded = home ? report.awayScore : report.homeScore;
      const other = home ? report.awayName : report.homeName;
      return `• ${scored > conceded ? 'W' : 'L'} ${scored}–${conceded} vs ${other} · MOTM ${report.motm.playerName} (${Number(report.motm.rating).toFixed(1)})`;
    }).join('\n') : 'No current-season press reports are available yet.';
    const roster = (opponent.roster || []).slice().sort((a, b) => (Number(b.form) || 0) - (Number(a.form) || 0) || teamPlayerOverall(b) - teamPlayerOverall(a));
    const likelyFive = roster.slice(0, TEAM_REQUIRED_STARTERS);
    const awardLeaders = Object.values(state.playerRecords).filter(record => (opponent.roster || []).some(player => player.id === record.playerId)).map(record => ({ record, motm: record.entries.filter(entry => entry.title === 'MAN OF THE MATCH' && Number(entry.season) === Number(careerState.league?.season)).length })).sort((a, b) => b.motm - a.motm || String(a.record.playerName).localeCompare(String(b.record.playerName))).slice(0, 3);
    const confirmed = [
      `NEXT OPPONENT\n${opponent.name} · ${opponent.style || 'BALANCED'} public identity · Matchday ${fixture.matchday} · ${days === 0 ? 'TODAY' : `${days} day${days === 1 ? '' : 's'} away`}.`,
      `RECENT RESULTS — CONFIRMED\n${formLines}`,
      `LIKELY ACTIVE FIVE — ${depth >= 60 ? 'SCOUT ASSESSMENT' : 'PUBLIC FORM ESTIMATE'}\n${likelyFive.map(player => `${player.name} · ${teamRoleById(player.role).name} · form ${Number(player.form || 0).toFixed(1)}${depth >= 82 ? ` · ability ${teamPlayerOverall(player)}` : ''}`).join('\n') || 'Line-up not yet established.'}`,
      awardLeaders.length ? `AWARD WATCH\n${awardLeaders.map(item => `${item.record.playerName} · ${item.motm} current-season MOTM award${item.motm === 1 ? '' : 's'}`).join('\n')}` : ''
    ];
    const analysis = [
      `TACTICAL READ — ${depth >= 50 ? 'SCOUT ANALYSIS' : 'PUBLIC ANALYSIS'}\n${identity.name}: ${identity.summary}`,
      depth >= 58 && identity.strengths?.length ? `RECOGNISED STRENGTHS\n${identity.strengths.join(' · ')}` : 'RECOGNISED STRENGTHS\nThe report is not yet deep enough to confirm a reliable strength beyond their public tactical identity.',
      depth >= 70 && identity.vulnerabilities?.length ? `POSSIBLE VULNERABILITY\n${identity.vulnerabilities.join(' · ')}` : 'POSSIBLE VULNERABILITY\nUnconfirmed. The analysis department will not invent a weakness from incomplete evidence.',
      `WHAT THIS MEANS FOR YOU\n${identity.counters?.[0]?.text || 'Review the active five, weapon ranges and confirmed tactical plan before matchmaking.'}`
    ];
    const message = clubAddOrganicMail({
      subject: `Opposition watch · ${opponent.name}`,
      paragraphs: [
        `Manager,\n\nThis press-and-scouting brief combines confirmed league results with ${scout ? `${scout.name}'s ${depth}% opposition report` : `the ${depth}% public-information baseline`}. Confirmed facts and analysis are separated so the inbox remains useful without becoming an infallible tactical cheat sheet.`,
        ...confirmed,
        ...analysis,
        `Open Opposition Intelligence or Tactics to turn this information into a match plan.`
      ].filter(Boolean),
      category: 'INTELLIGENCE',
      important: days <= 1,
      route: 'tactics',
      sender: scout ? `${careerState.name} Opposition Intelligence · ${scout.name}` : 'The StrikeWatch Wire · Opposition Desk',
      preview: `${opponent.name} · ${recent.length} recent result${recent.length === 1 ? '' : 's'} · ${depth}% report depth · ${days === 0 ? 'matchday' : `${days}D to fixture`}.`,
      storyKey: `opposition-watch-${fixture.id}`
    });
    state.intelFixtureIds.push(fixture.id);
    state.intelFixtureIds = state.intelFixtureIds.slice(-120);
    saveCareerState();
    return message;
  }

  function worldPressAwardSeasonHonours(season) {
    const state = ensureWorldPressState();
    const key = `season-awards:${season}`;
    if (!state || state.seasonAwardKeys.includes(key)) return null;
    const candidates = Object.values(state.playerRecords).map(record => {
      const seasonEntries = record.entries.filter(entry => Number(entry.season) === Number(season));
      const motm = seasonEntries.filter(entry => entry.title === 'MAN OF THE MATCH');
      const ratings = motm.map(entry => Number(entry.rating)).filter(Number.isFinite);
      return { record, motm: motm.length, average: ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : 0 };
    }).filter(item => item.motm > 0).sort((a, b) => b.motm - a.motm || b.average - a.average);
    const winner = candidates[0] || null;
    if (!winner) return null;
    const latest = winner.record.entries.find(entry => Number(entry.season) === Number(season) && entry.title === 'MAN OF THE MATCH');
    const entry = worldPressAddAccolade(winner.record.playerId, {
      key: `award:operator-of-season:s${season}:${winner.record.playerId}`,
      playerName: winner.record.playerName,
      type: 'award',
      title: 'OPERATOR OF THE SEASON',
      detail: `${winner.motm} Man of the Match award${winner.motm === 1 ? '' : 's'} across Season ${season}.`,
      icon: 'S',
      tone: 'gold',
      season,
      competition: leagueCompetitionName(),
      clubName: latest?.clubName || winner.record.currentClub,
      includeInClubHistory: (careerState.squad || []).some(player => player.id === winner.record.playerId)
    }, latest?.clubName || winner.record.currentClub);
    state.seasonAwardKeys.push(key);
    clubAddOrganicMail({
      subject: `Season ${season} awards · ${winner.record.playerName} named Operator of the Season`,
      paragraphs: [
        `The StrikeWatch awards panel has completed its Season ${season} review.`,
        `OPERATOR OF THE SEASON\n${winner.record.playerName} · ${latest?.clubName || winner.record.currentClub}\n${winner.motm} Man of the Match award${winner.motm === 1 ? '' : 's'} · ${winner.average.toFixed(2)} average rating across those award-winning displays.`,
        'The award is now stored permanently in the operator accolade history and the division record.'
      ],
      category: 'PRESS',
      important: (careerState.squad || []).some(player => player.id === winner.record.playerId),
      route: (careerState.squad || []).some(player => player.id === winner.record.playerId) ? 'profile' : 'league',
      sender: 'The StrikeWatch Wire · Awards Panel',
      preview: `${winner.record.playerName} · ${winner.motm} MOTM awards · Season ${season} honour recorded.`,
      storyKey: key
    });
    return entry;
  }

  function worldPressBackfillLegacyHistory() {
    const state = ensureWorldPressState();
    if (!state || state.legacyBackfillVersion >= WORLD_PRESS_VERSION) return false;
    const league = ensureLeagueState();
    for (const fixture of league?.fixtures || []) {
      if (!fixture.played || state.fixtureReports[fixture.id]) continue;
      const home = leagueClubById(fixture.homeId);
      const away = leagueClubById(fixture.awayId);
      if (!home || !away) continue;
      if (home.id !== LEAGUE_USER_CLUB_ID && away.id !== LEAGUE_USER_CLUB_ID) {
        const report = worldPressGenerateAiFixtureReport(fixture, { apply: false, historical: true });
        if (!report?.motm) continue;
        worldPressRecordFixtureReport(report);
        worldPressAddAccolade(report.motm.playerId, {
          key: `award:motm:${fixture.id}`,
          playerName: report.motm.playerName,
          type: 'award',
          title: 'MAN OF THE MATCH',
          detail: 'Historical award reconstructed from a result completed before the living press system was introduced.',
          icon: '★',
          tone: 'neutral',
          season: report.season,
          matchday: report.matchday,
          fixtureId: fixture.id,
          competition: worldPressCompetitionLabel('league', report.season, report.matchday),
          clubName: report.motm.clubName,
          rating: report.motm.rating,
          historical: true
        }, report.motm.clubName);
        continue;
      }
      const winnerClub = fixture.winnerId === LEAGUE_USER_CLUB_ID ? { id: LEAGUE_USER_CLUB_ID, name: careerState.name, roster: careerState.squad } : (fixture.winnerId === home.id ? home : away);
      const player = (winnerClub.roster || []).slice().sort((a, b) => teamPlayerOverall(b) - teamPlayerOverall(a))[0] || (careerState.squad || [])[0];
      if (!player) continue;
      const motm = { playerId: player.id, playerName: player.name, clubId: winnerClub.id, clubName: winnerClub.name, role: player.role, kills: 0, deaths: 0, rating: Number(clamp(Number(player.form) || 6.8, 5.5, 8.8).toFixed(2)), historical: true };
      const report = {
        fixtureId: fixture.id,
        mode: 'league',
        season: fixture.season || league.season,
        matchday: fixture.matchday,
        homeId: home.id,
        awayId: away.id,
        homeName: home.name,
        awayName: away.name,
        homeShort: home.short,
        awayShort: away.short,
        homeScore: fixture.homeScore,
        awayScore: fixture.awayScore,
        winnerId: fixture.winnerId,
        motm,
        writeup: `${winnerClub.name} won the archived fixture. The award record was reconstructed from the retained result and current roster history.`,
        day: 0,
        historical: true
      };
      worldPressRecordFixtureReport(report);
      worldPressAddAccolade(player, {
        key: `award:motm:${fixture.id}`,
        type: 'award',
        title: 'MAN OF THE MATCH',
        detail: 'Historical award reconstructed from a result completed before the living press system was introduced.',
        icon: '★',
        tone: 'neutral',
        season: report.season,
        matchday: report.matchday,
        fixtureId: fixture.id,
        competition: worldPressCompetitionLabel('league', report.season, report.matchday),
        clubName: winnerClub.name,
        rating: motm.rating,
        historical: true,
        includeInClubHistory: winnerClub.id === LEAGUE_USER_CLUB_ID
      }, winnerClub.name);
    }
    state.legacyBackfillVersion = WORLD_PRESS_VERSION;
    return true;
  }

  function worldPressLeaguePulseSnapshot(limit = 6) {
    const state = ensureWorldPressState();
    const league = typeof ensureLeagueState === 'function' ? ensureLeagueState() : null;
    if (!state || !league) return { reports: [], leaders: [], next: null };
    const reports = state.fixtureOrder.map(id => state.fixtureReports[id]).filter(report => report && report.mode === 'league' && !report.historical).slice(0, Math.max(1, limit));
    const leaders = Object.values(state.playerRecords).map(record => {
      const seasonEntries = (record.entries || []).filter(entry => Number(entry.season) === Number(league.season));
      const motm = seasonEntries.filter(entry => entry.title === 'MAN OF THE MATCH');
      const latest = motm[0] || null;
      return { playerId: record.playerId, playerName: record.playerName, clubName: latest?.clubName || record.currentClub, motm: motm.length, rating: motm.length ? motm.reduce((sum, entry) => sum + (Number(entry.rating) || 0), 0) / motm.length : 0 };
    }).filter(item => item.motm > 0).sort((a, b) => b.motm - a.motm || b.rating - a.rating || a.playerName.localeCompare(b.playerName)).slice(0, 5);
    const fixture = typeof leagueNextFixture === 'function' ? leagueNextFixture() : null;
    const opponent = fixture && typeof leagueClubById === 'function' && typeof leagueFixtureOpponentId === 'function' ? leagueClubById(leagueFixtureOpponentId(fixture)) : null;
    const next = fixture && opponent ? {
      fixtureId: fixture.id,
      matchday: fixture.matchday,
      opponentName: opponent.name,
      opponentShort: opponent.short,
      style: opponent.style,
      days: typeof clubDaysUntilFixture === 'function' ? clubDaysUntilFixture() : null
    } : null;
    return { reports, leaders, next };
  }

  function renderWorldPressLeaguePulse() {
    const pulse = worldPressLeaguePulseSnapshot(6);
    const reportMarkup = pulse.reports.length ? pulse.reports.map(report => `<article class="league-pulse-report"><header><span>MATCHDAY ${Math.max(1, Number(report.matchday) || 1)}</span><strong>${escapeCareerHtml(report.homeShort || report.homeName)} ${report.homeScore} — ${report.awayScore} ${escapeCareerHtml(report.awayShort || report.awayName)}</strong></header><p>${escapeCareerHtml(report.writeup || '')}</p><small>★ ${escapeCareerHtml(report.motm?.playerName || 'Award pending')} · ${escapeCareerHtml(report.motm?.clubName || '')} · ${Number(report.motm?.rating || 0).toFixed(2)} RATING</small></article>`).join('') : '<div class="league-pulse-empty"><strong>NO RIVAL REPORTS YET</strong><p>Completed matchdays will generate results, write-ups and Man of the Match coverage.</p></div>';
    const leadersMarkup = pulse.leaders.length ? pulse.leaders.map((item, index) => `<article><b>${index + 1}</b><div><strong>${escapeCareerHtml(item.playerName)}</strong><small>${escapeCareerHtml(item.clubName || 'DIVISION')} · ${item.rating.toFixed(2)} AVG</small></div><em>${item.motm} MOTM</em></article>`).join('') : '<p>No award leader has emerged yet.</p>';
    const nextMarkup = pulse.next ? `<button class="league-pulse-next" data-team-route="tactics"><span>NEXT OPPOSITION</span><strong>${escapeCareerHtml(pulse.next.opponentName)}</strong><small>MATCHDAY ${pulse.next.matchday} · ${escapeCareerHtml(pulse.next.style || 'BALANCED')}${Number.isFinite(Number(pulse.next.days)) ? ` · ${pulse.next.days === 0 ? 'TODAY' : `${pulse.next.days}D`}` : ''}</small><b>OPEN PREPARATION →</b></button>` : '<div class="league-pulse-next complete"><span>SEASON STATUS</span><strong>CAMPAIGN COMPLETE</strong><small>Review the final table and awards.</small></div>';
    return `<section class="league-pulse-panel"><div class="career-section-head"><div><span>THE STRIKEWATCH WIRE</span><strong>LEAGUE PULSE</strong></div><p>Recent rival results, award leaders and the next opposition in one living-world feed.</p></div><div class="league-pulse-layout"><section><header><span>RECENT COVERAGE</span><strong>AROUND THE DIVISION</strong></header><div class="league-pulse-reports">${reportMarkup}</div></section><aside><section><header><span>AWARD WATCH</span><strong>MAN OF THE MATCH LEADERS</strong></header><div class="league-pulse-leaders">${leadersMarkup}</div></section>${nextMarkup}</aside></div></section>`;
  }

  function renderWorldPressMatchAward(summary) {
    const award = summary?.manOfTheMatch;
    if (!award) return '';
    const user = Boolean(award.userWonAward || award.clubId === LEAGUE_USER_CLUB_ID);
    return `<section class="match-award-card ${user ? 'club-winner' : 'opposition-winner'}"><div class="match-award-icon">★</div><div><span>MAN OF THE MATCH</span><strong>${escapeCareerHtml(award.playerName)} · ${escapeCareerHtml(award.clubName)}</strong><small>${Math.max(0, Number(award.kills) || 0)} ELIMINATIONS · ${Math.max(0, Number(award.deaths) || 0)} DEATHS · ${Number(award.rating || 0).toFixed(2)} RATING${Number(award.rewardCr) > 0 ? ` · +${teamCredits(award.rewardCr)} CLUB AWARD` : ' · OPPOSITION AWARD'}</small></div></section>`;
  }

  function worldPressEntriesForPlayer(player) {
    const record = worldPressPlayerRecord(player, player?.name || '', player?.currentTeam || careerState.name);
    return record?.entries || [];
  }

  function worldPressPlayerCareerSnapshot(player) {
    const entries = worldPressEntriesForPlayer(player);
    const awards = entries.filter(entry => entry.type === 'award');
    const motm = awards.filter(entry => entry.title === 'MAN OF THE MATCH');
    const major = awards.filter(entry => ['OPERATOR OF THE MONTH','OPERATOR OF THE SEASON'].includes(entry.title));
    const milestones = entries.filter(entry => entry.type === 'milestone' || entry.type === 'achievement');
    const ratings = entries.map(entry => Number(entry.rating)).filter(Number.isFinite);
    const best = ratings.length ? Math.max(...ratings) : Number(player?.career?.rating) || 0;
    const seasons = new Set(entries.map(entry => Number(entry.season)).filter(value => value > 0));
    const clubs = new Set([player?.currentTeam, ...(player?.history || []).map(item => item.team), ...entries.map(entry => entry.clubName)].filter(Boolean));
    const latest = entries[0] || null;
    return { awards: awards.length, motm: motm.length, major: major.length, milestones: milestones.length, best, seasons: Math.max(1,seasons.size), clubs: Math.max(1,clubs.size), latest };
  }

  function renderWorldPressCareerStory(player) {
    const story = worldPressPlayerCareerSnapshot(player);
    const career = player?.career || {};
    const kd = (Number(career.kills)||0) / Math.max(1, Number(career.deaths)||0);
    const latest = story.latest ? `<article class="player-career-latest ${escapeCareerHtml(story.latest.tone || 'neutral')}"><span>LATEST CHAPTER</span><strong>${escapeCareerHtml(story.latest.title)}</strong><p>${escapeCareerHtml(story.latest.detail || '')}</p><small>${escapeCareerHtml(story.latest.dateLabel || '')}${story.latest.clubName ? ` · ${escapeCareerHtml(story.latest.clubName)}` : ''}</small></article>` : '<article class="player-career-latest neutral"><span>LATEST CHAPTER</span><strong>CAREER STORY BEGINS HERE</strong><p>Complete competitive fixtures to add awards, milestones and defining performances.</p></article>';
    return `<section class="player-career-story"><div class="career-section-head"><div><span>OPERATOR CAREER STORY</span><strong>RECORD, LEGACY & DEFINING MOMENTS</strong></div><p>A compact summary of the operator's full competitive journey.</p></div><div class="player-career-story-grid"><article><span>APPEARANCES</span><strong>${Math.max(0,Number(career.matches)||0)}</strong><small>${Math.max(0,Number(career.wins)||0)} WINS · ${kd.toFixed(2)} K/D</small></article><article><span>AWARDS</span><strong>${story.awards}</strong><small>${story.motm} MOTM · ${story.major} MAJOR</small></article><article><span>BEST AWARD RATING</span><strong>${story.best ? story.best.toFixed(2) : '—'}</strong><small>${story.milestones} CAREER MILESTONES</small></article><article><span>CAREER JOURNEY</span><strong>${story.seasons} SEASON${story.seasons===1?'':'S'}</strong><small>${story.clubs} CLUB${story.clubs===1?'':'S'} RECORDED</small></article></div>${latest}</section>`;
  }

  function renderWorldPressPlayerAccolades(player) {
    if (!player?.id) return '';
    const entries = worldPressEntriesForPlayer(player);
    const awards = entries.filter(entry => entry.type === 'award');
    const milestones = entries.filter(entry => entry.type === 'milestone' || entry.type === 'achievement');
    const motm = entries.filter(entry => entry.title === 'MAN OF THE MATCH').length;
    const major = entries.filter(entry => ['OPERATOR OF THE MONTH','OPERATOR OF THE SEASON'].includes(entry.title)).length;
    const timeline = entries.length ? entries.slice(0, 30).map(entry => `<article class="player-accolade-entry ${escapeCareerHtml(entry.tone || 'neutral')}"><div class="player-accolade-medal">${escapeCareerHtml(entry.icon || '★')}</div><div><span>${escapeCareerHtml(entry.type.toUpperCase())}${entry.matchday ? ` · MATCHDAY ${entry.matchday}` : ''}</span><strong>${escapeCareerHtml(entry.title)}</strong><p>${escapeCareerHtml(entry.detail || '')}</p><small>${escapeCareerHtml(entry.dateLabel || '')}${entry.opponentName ? ` · VS ${escapeCareerHtml(entry.opponentName)}` : ''}${entry.historical ? ' · HISTORICAL RECORD' : ''}</small></div></article>`).join('') : '<div class="player-accolade-empty"><strong>NO ACCOLADES RECORDED</strong><p>Competitive awards, Team of the Week selections and career milestones will appear here permanently.</p></div>';
    return `${renderWorldPressCareerStory(player)}<section class="player-accolades-panel" data-player-accolades="${escapeCareerHtml(player.id)}"><div class="career-section-head"><div><span>ACCOLADES & ACHIEVEMENTS</span><strong>CAREER HONOURS HISTORY</strong></div><p>Every award records the fixture, context and date so the operator develops a permanent career story.</p></div><div class="player-accolade-summary"><article><span>MAN OF THE MATCH</span><strong>${motm}</strong><small>CAREER AWARDS</small></article><article><span>MAJOR HONOURS</span><strong>${major}</strong><small>MONTH / SEASON</small></article><article><span>ALL AWARDS</span><strong>${awards.length}</strong><small>INCLUDING TEAM OF WEEK</small></article><article><span>MILESTONES</span><strong>${milestones.length}</strong><small>CAREER ACHIEVEMENTS</small></article></div><div class="player-accolade-timeline">${timeline}</div></section>`;
  }

  function boardExpectationDefinitions() {
    const league = typeof ensureLeagueState === 'function' ? ensureLeagueState() : null;
    if (!league) return [];
    const table = typeof leagueTable === 'function' ? leagueTable() : [];
    const user = table.find(row => row.id === LEAGUE_USER_CLUB_ID) || { position: league.clubs?.length || 20, played: 0, wins: 0, roundDifference: 0 };
    const tier = typeof leagueDivisionTier === 'function' ? leagueDivisionTier() : 3;
    const squad = careerState.squad || [];
    const stable = squad.filter(player => Number(player.morale) >= 60 && Number(player.happiness) >= 55).length;
    const primaryTarget = tier === 3 ? 2 : tier === 2 ? 6 : tier === 1 ? 8 : 10;
    const winTarget = tier === 3 ? 12 : tier === 2 ? 14 : tier === 1 ? 16 : 18;
    const positionProgress = user.played ? clamp((league.clubs.length - user.position + 1) / Math.max(1, league.clubs.length - primaryTarget + 1), 0, 1) : 0;
    return [
      { id:'position', type:'PRIMARY', title:tier===3?'WIN PROMOTION':`FINISH IN THE TOP ${primaryTarget}`, detail:tier===3?'Finish in the top two and earn promotion.':`Meet the board's minimum league-position expectation.`, value:user.position, target:primaryTarget, progress:positionProgress, complete:user.played>0 && user.position<=primaryTarget, route:'league' },
      { id:'wins', type:'SECONDARY', title:`WIN ${winTarget} LEAGUE MATCHES`, detail:'Build a sustainable season rather than relying on one short run.', value:Number(user.wins)||0, target:winTarget, progress:clamp((Number(user.wins)||0)/winTarget,0,1), complete:(Number(user.wins)||0)>=winTarget, route:'league' },
      { id:'stability', type:'SECONDARY', title:'MAINTAIN A STABLE ACTIVE SQUAD', detail:'Keep at least five operators above the board morale and happiness floor.', value:stable, target:5, progress:clamp(stable/5,0,1), complete:stable>=5, route:'operators' }
    ];
  }

  function boardExpectationSnapshot() {
    const objectives = boardExpectationDefinitions();
    const average = objectives.length ? objectives.reduce((sum,item)=>sum+item.progress,0)/objectives.length : 0;
    const confidence = Math.round(clamp(35 + average*55 + objectives.filter(item=>item.complete).length*4, 0, 100));
    const status = confidence>=75?'STRONG':confidence>=55?'ON TRACK':confidence>=38?'AT RISK':'UNDER PRESSURE';
    return { objectives, confidence, status };
  }

  function boardExpectationStatus(item) {
    if (item.complete) return 'COMPLETED';
    if (item.progress >= .65) return 'ON TRACK';
    if (item.progress >= .35) return 'AT RISK';
    return 'BEHIND PLAN';
  }

  function renderBoardExpectations(compact = false) {
    const board = boardExpectationSnapshot();
    if (!board.objectives.length) return '';
    const cards = board.objectives.map(item => `<button class="board-objective-card ${item.complete?'complete':item.progress>=.65?'track':item.progress>=.35?'risk':'behind'}" data-team-route="${escapeCareerHtml(item.route)}"><span>${escapeCareerHtml(item.type)} · ${boardExpectationStatus(item)}</span><strong>${escapeCareerHtml(item.title)}</strong><p>${escapeCareerHtml(item.detail)}</p><div><i style="width:${Math.round(item.progress*100)}%"></i></div><small>${escapeCareerHtml(String(item.value))} / ${escapeCareerHtml(String(item.target))}</small></button>`).join('');
    return `<section class="board-expectations-panel ${compact?'compact':''}"><div class="career-section-head"><div><span>BOARD EXPECTATIONS</span><strong>SEASON OBJECTIVES</strong></div><p>Confidence changes gradually as the club advances toward its primary and secondary targets.</p></div><div class="board-confidence"><span>BOARD CONFIDENCE</span><strong>${board.confidence}% · ${board.status}</strong><div><i style="width:${board.confidence}%"></i></div></div><div class="board-objectives-grid">${cards}</div></section>`;
  }

  function renderWorldPressClubHonours() {
    const state = ensureWorldPressState();
    if (!state) return '';
    const clubPlayerIds = new Set((state.clubHonours || []).map(entry => entry.playerId).filter(Boolean));
    const leaders = Object.values(state.playerRecords).filter(record => clubPlayerIds.has(record.playerId)).map(record => ({
      record,
      motm: record.entries.filter(entry => entry.title === 'MAN OF THE MATCH').length,
      awards: record.entries.filter(entry => entry.type === 'award').length,
      total: record.entries.length
    })).sort((a, b) => b.motm - a.motm || b.awards - a.awards || b.total - a.total).slice(0, 8);
    const recent = state.clubHonours.slice(0, 12);
    return `<section class="club-honours-panel"><div class="career-section-head"><div><span>CLUB HONOURS</span><strong>PLAYER ACCOLADES & RECORD BOOK</strong></div><p>Transferred or released operators remain in the historical timeline even after leaving the active squad.</p></div><div class="club-honours-grid"><section><header><span>ALL-TIME LEADERS</span><strong>MAN OF THE MATCH TABLE</strong></header><div class="club-honours-leaders">${leaders.length ? leaders.map((item, index) => `<article><b>${index + 1}</b><div><strong>${escapeCareerHtml(item.record.playerName)}</strong><small>${item.awards} AWARDS · ${item.total} TOTAL ENTRIES</small></div><em>${item.motm} MOTM</em></article>`).join('') : '<p>No club award leader has been established yet.</p>'}</div></section><section><header><span>RECENT HISTORY</span><strong>LATEST AWARDS & MILESTONES</strong></header><div class="club-honours-recent">${recent.length ? recent.map(entry => `<article class="${escapeCareerHtml(entry.tone || 'neutral')}"><span>${escapeCareerHtml(entry.icon || '★')}</span><div><strong>${escapeCareerHtml(entry.playerName)} · ${escapeCareerHtml(entry.title)}</strong><small>${escapeCareerHtml(entry.dateLabel || '')}${entry.matchday ? ` · MATCHDAY ${entry.matchday}` : ''}</small></div></article>`).join('') : '<p>Complete a match to begin the club honours history.</p>'}</div></section></div></section>`;
  }

  function worldPressIntegrationForTest() {
    if (!careerState?.created || (careerState.squad || []).length < TEAM_REQUIRED_STARTERS) {
      return { ok: false, reason: 'Seed a career with five operators before running the living-press integration test.' };
    }
    const careerSnapshot = JSON.parse(JSON.stringify(careerState));
    const performanceSnapshot = JSON.parse(JSON.stringify(teamMatchPlayerStats || {}));
    try {
      const league = ensureLeagueState();
      const fixture = (league.fixtures || []).find(item => !item.played && (item.homeId === LEAGUE_USER_CLUB_ID || item.awayId === LEAGUE_USER_CLUB_ID));
      if (!fixture) return { ok: false, reason: 'No unplayed user league fixture is available.' };
      const opponent = leagueClubById(leagueFixtureOpponentId(fixture));
      if (!opponent) return { ok: false, reason: 'The test fixture has no opponent club.' };
      careerState.worldPress = worldPressDefaultState();
      careerState.mail = [];
      careerState.mailSequence = 0;
      const matchdayFixtures = (league.fixtures || []).filter(item => Number(item.matchday) === Number(fixture.matchday));
      for (const other of matchdayFixtures) {
        if (other.id === fixture.id) continue;
        if (!other.played) baseLeagueSimulateFixtureWorldPress(other);
        worldPressGenerateAiFixtureReport(other);
      }
      fixture.homeScore = fixture.homeId === LEAGUE_USER_CLUB_ID ? 3 : 1;
      fixture.awayScore = fixture.awayId === LEAGUE_USER_CLUB_ID ? 3 : 1;
      fixture.winnerId = LEAGUE_USER_CLUB_ID;
      fixture.played = true;
      teamMatchPlayerStats = {};
      const ownKills = [8, 4, 3, 2, 1];
      const ownRatings = [9.35, 7.55, 7.2, 6.8, 6.5];
      for (const [index, player] of (careerState.squad || []).slice(0, TEAM_REQUIRED_STARTERS).entries()) {
        teamMatchPlayerStats[player.id] = {
          playerId: player.id,
          rounds: 4,
          roundsWon: 3,
          kills: ownKills[index],
          deaths: index === 0 ? 1 : 2 + (index % 2),
          shotsFired: 20 + index * 2,
          shotsHit: 11 + index,
          headshots: index === 0 ? 3 : 1,
          tradeKills: index % 2,
          survivedRounds: index === 0 ? 3 : 1,
          roleActions: 4 + index,
          rating: ownRatings[index]
        };
      }
      const opponentCandidates = (opponent.roster || []).slice(0, TEAM_REQUIRED_STARTERS).map((player, index) => ({
        player,
        playerId: player.id,
        playerName: player.name,
        clubId: opponent.id,
        clubName: opponent.name,
        role: player.role,
        kills: Math.max(0, 3 - Math.floor(index / 2)),
        deaths: 3,
        shotsFired: 16 + index,
        shotsHit: 6 + Math.floor(index / 2),
        headshots: index === 0 ? 1 : 0,
        assists: index % 2,
        survivedRounds: 0,
        roleActions: 2 + index,
        rating: Number((6.85 - index * 0.18).toFixed(2))
      }));
      const summary = {
        won: true,
        blueScore: 3,
        redScore: 1,
        roundsPlayed: 4,
        blueTeamName: careerState.name,
        redTeamName: opponent.name,
        finance: { income: 10000, net: 10000, baseMatchIncome: 7000, resultReward: 3000, resultRewardLabel: 'VICTORY BONUS' }
      };
      const creditsBefore = Number(careerState.credits) || 0;
      const award = worldPressSettleUserMatch(TEAM_BLUE, summary, {
        fixture: { ...fixture },
        fixtureId: fixture.id,
        matchday: fixture.matchday,
        mode: 'league',
        opponent,
        opponentCandidates
      }, {
        mode: 'league',
        season: league.season,
        matchday: fixture.matchday,
        fixtureId: fixture.id,
        opponentId: opponent.id,
        opponentName: opponent.name,
        divisionName: leagueCompetitionName(),
        position: 1,
        points: 3,
        seasonComplete: false
      });
      const state = ensureWorldPressState();
      const roundup = (careerState.mail || []).find(item => item.storyKey === `roundup:s${league.season}:m${fixture.matchday}`) || null;
      const ownRecord = state.playerRecords[careerState.squad[0].id] || null;
      const clubHonourCountBeforeRepeat = state.clubHonours.length;
      const creditsBeforeRepeat = Number(careerState.credits) || 0;
      const duplicateSummary = { won: true, blueScore: 3, redScore: 1, finance: { income: 10000, net: 10000 } };
      worldPressSettleUserMatch(TEAM_BLUE, duplicateSummary, {
        fixture: { ...fixture }, fixtureId: fixture.id, matchday: fixture.matchday, mode: 'league', opponent, opponentCandidates
      }, {
        mode: 'league', season: league.season, matchday: fixture.matchday, fixtureId: fixture.id,
        opponentId: opponent.id, opponentName: opponent.name, divisionName: leagueCompetitionName(), position: 1, points: 3, seasonComplete: false
      });
      const roundTrip = normaliseCareerState(JSON.parse(JSON.stringify(careerState)));
      const reportCount = worldPressMatchdayReports(league.season, fixture.matchday).length;
      const expectedReports = Math.max(1, Math.floor((league.clubs || []).length / 2));
      const checks = {
        allFixturesReported: reportCount === expectedReports,
        everyReportHasAward: worldPressMatchdayReports(league.season, fixture.matchday).every(report => Boolean(report.motm?.playerId)),
        userAwardSelected: award?.playerId === careerState.squad[0].id && award?.userWonAward === true,
        rewardPaidOnce: Number(careerState.credits) - creditsBefore === WORLD_PRESS_MOTM_REWARD.league,
        financeUpdatedOnce: summary.finance.income === 11500 && summary.finance.net === 11500 && summary.finance.manOfTheMatchBonus === 1500,
        roundupCreated: Boolean(roundup && /FULL RESULTS/.test(roundup.body || '') && /(MAN OF THE MATCH|MOTM)/i.test(roundup.preview || '')),
        playerHistoryCreated: Boolean(ownRecord?.entries?.some(entry => entry.title === 'MAN OF THE MATCH')),
        clubHistoryCreated: state.clubHonours.some(entry => entry.playerId === careerState.squad[0].id && entry.title === 'MAN OF THE MATCH'),
        duplicateSettlementSafe: Number(careerState.credits) === creditsBeforeRepeat && state.clubHonours.length === clubHonourCountBeforeRepeat && duplicateSummary.finance.income === 10000,
        persistenceRoundTrip: Boolean(roundTrip.worldPress?.fixtureReports?.[fixture.id]?.motm?.playerId === careerState.squad[0].id && roundTrip.worldPress?.clubHonours?.some(entry => entry.playerId === careerState.squad[0].id)),
        reportMarkupCreated: /match-award-card/.test(renderWorldPressMatchAward(summary)),
        playerMarkupCreated: /player-accolade-entry/.test(renderWorldPressPlayerAccolades(careerState.squad[0])),
        clubMarkupCreated: /club-honours-panel/.test(renderWorldPressClubHonours())
      };
      return {
        ok: Object.values(checks).every(Boolean),
        checks,
        award: award ? { ...award } : null,
        reportCount,
        expectedReports,
        roundupSubject: roundup?.subject || '',
        creditsDelta: Number(careerState.credits) - creditsBefore,
        finance: { ...summary.finance }
      };
    } finally {
      careerState = normaliseCareerState(careerSnapshot);
      teamMatchPlayerStats = performanceSnapshot;
    }
  }

  function worldPressSeedPresentationForTest() {
    if (!careerState?.created || !(careerState.squad || []).length) {
      return { ok: false, reason: 'Seed a career before mounting the honours presentation.' };
    }
    const titles = ['MAN OF THE MATCH', 'TEAM OF THE WEEK', 'OPERATOR OF THE MONTH', '50 CAREER ELIMINATIONS'];
    const icons = ['★', '◆', '▲', '✓'];
    for (const [playerIndex, player] of (careerState.squad || []).slice(0, 3).entries()) {
      for (let entryIndex = 0; entryIndex < titles.length; entryIndex++) {
        worldPressAddAccolade(player, {
          key: `presentation:${player.id}:${entryIndex}`,
          type: entryIndex === titles.length - 1 ? 'milestone' : 'award',
          title: titles[entryIndex],
          detail: `Presentation verification entry ${entryIndex + 1} for ${player.name}, including fixture context and a representative performance summary.`,
          icon: icons[entryIndex],
          tone: entryIndex === 0 ? 'gold' : entryIndex === 1 ? 'blue' : entryIndex === 2 ? 'record' : 'positive',
          dateLabel: 'MONDAY 3 AUGUST 2026',
          matchday: entryIndex + 1,
          opponentName: 'Northbridge Five',
          clubName: careerState.name,
          includeInClubHistory: true
        }, careerState.name);
      }
    }
    const state = ensureWorldPressState();
    return {
      ok: true,
      playerRecordCount: Object.keys(state.playerRecords).length,
      clubHonourCount: state.clubHonours.length,
      activePlayerIds: (careerState.squad || []).slice(0, 3).map(player => player.id),
      recordPlayerIds: Object.keys(state.playerRecords),
      sampleClubNames: Object.values(state.playerRecords).flatMap(record => (record.entries || []).slice(0, 1).map(entry => entry.clubName))
    };
  }

  function worldPressUpcomingIntelForTest() {
    if (!careerState?.created) return { ok: false, reason: 'Seed a career before testing opponent intelligence.' };
    const fixture = typeof leagueNextFixture === 'function' ? leagueNextFixture() : null;
    const before = (careerState.mail || []).filter(item => item.category === 'INTELLIGENCE').length;
    const first = worldPressMaybeSendUpcomingOpponentIntel();
    const afterFirst = (careerState.mail || []).filter(item => item.category === 'INTELLIGENCE').length;
    const second = worldPressMaybeSendUpcomingOpponentIntel();
    const afterSecond = (careerState.mail || []).filter(item => item.category === 'INTELLIGENCE').length;
    const message = (careerState.mail || []).find(item => item.storyKey === `opposition-watch-${fixture?.id}`) || first || null;
    return {
      ok: Boolean(fixture && message && afterFirst === before + 1 && afterSecond === afterFirst && !second),
      fixtureId: fixture?.id || null,
      before,
      afterFirst,
      afterSecond,
      subject: message?.subject || '',
      hasConfirmedResults: /RECENT RESULTS — CONFIRMED/.test(message?.body || ''),
      hasMeaning: /WHAT THIS MEANS FOR YOU/.test(message?.body || '')
    };
  }

  function worldPressAwardsForTest() {
    const synthetic = [
      { playerId: 'A', playerName: 'Alpha', rating: 8.2, kills: 5, deaths: 2, assists: 1, survivedRounds: 2, won: true },
      { playerId: 'B', playerName: 'Bravo', rating: 8.8, kills: 4, deaths: 1, assists: 2, survivedRounds: 3, won: true },
      { playerId: 'C', playerName: 'Charlie', rating: 9.1, kills: 3, deaths: 4, assists: 0, survivedRounds: 0, won: false }
    ];
    const selected = worldPressSelectManOfTheMatch(synthetic);
    const distribution = worldPressDistributeTotal(17, [5, 4, 3, 2, 1]);
    const state = careerState?.created ? ensureWorldPressState() : null;
    const reportKeysUnique = state ? new Set(state.fixtureOrder).size === state.fixtureOrder.length : true;
    const rendered = careerState?.squad?.[0] ? renderWorldPressPlayerAccolades(careerState.squad[0]) : '';
    const rewardTableValid = WORLD_PRESS_MOTM_REWARD.league === 1500 && WORLD_PRESS_MOTM_REWARD.exhibition === 750 && WORLD_PRESS_MOTM_REWARD.tutorial === 0;
    return {
      ok: selected?.playerId === 'B' && distribution.reduce((sum, value) => sum + value, 0) === 17 && distribution.length === 5 && rewardTableValid && reportKeysUnique && (!rendered || (rendered.includes('ACCOLADES &amp; ACHIEVEMENTS') || rendered.includes('ACCOLADES & ACHIEVEMENTS'))),
      selected: selected?.playerId || null,
      distribution,
      rewardTableValid,
      reportCount: state?.fixtureOrder?.length || 0,
      playerRecordCount: state ? Object.keys(state.playerRecords).length : 0,
      reportKeysUnique
    };
  }

  const baseLeagueSimulateFixtureWorldPress = leagueSimulateFixture;
  leagueSimulateFixture = function leagueSimulateFixtureWithWorldPress(fixture) {
    const wasPlayed = Boolean(fixture?.played);
    const result = baseLeagueSimulateFixtureWorldPress(fixture);
    if (result?.played && !wasPlayed) worldPressGenerateAiFixtureReport(result);
    return result;
  };

  const baseSettleLeagueAfterCareerMatchWorldPress = settleLeagueAfterCareerMatch;
  settleLeagueAfterCareerMatch = function settleLeagueAfterCareerMatchWithWorldPress(winner, summary) {
    const fixture = typeof leagueActiveFixture === 'function' ? leagueActiveFixture() : null;
    const opponent = typeof leagueActiveOpponentClub === 'function' ? leagueActiveOpponentClub() : null;
    const presentation = typeof currentMatchPresentation === 'function' ? currentMatchPresentation() : {};
    const capture = {
      fixture: fixture ? { ...fixture } : null,
      fixtureId: fixture?.id || presentation.fixtureId || null,
      matchday: fixture?.matchday || presentation.matchday || null,
      mode: presentation.mode || careerState.league?.activeMode || 'exhibition',
      opponent: opponent ? { ...opponent, roster: (opponent.roster || []).map(player => player) } : null,
      opponentCandidates: worldPressCaptureOpponentCandidates(opponent)
    };
    const result = baseSettleLeagueAfterCareerMatchWorldPress(winner, summary);
    worldPressSettleUserMatch(winner, summary, capture, result || { mode: capture.mode, opponentName: opponent?.name || 'Opposition' });
    return result;
  };

  const baseAdvanceCareerDayWorldPress = advanceCareerDay;
  advanceCareerDay = function advanceCareerDayWithWorldPress() {
    const advanced = baseAdvanceCareerDayWorldPress();
    if (advanced) worldPressMaybeSendUpcomingOpponentIntel();
    return advanced;
  };

  const baseEnsureTeamManagementStateWorldPress = ensureTeamManagementState;
  ensureTeamManagementState = function ensureTeamManagementStateWithWorldPress() {
    const result = baseEnsureTeamManagementStateWorldPress();
    if (careerState.created) {
      ensureWorldPressState();
      worldPressBackfillLegacyHistory();
      worldPressMaybeSendUpcomingOpponentIntel();
    }
    return result;
  };

  window.worldPressAwardsForTest = worldPressAwardsForTest;
  window.worldPressIntegrationForTest = worldPressIntegrationForTest;
  window.worldPressSeedPresentationForTest = worldPressSeedPresentationForTest;
  window.worldPressUpcomingIntelForTest = worldPressUpcomingIntelForTest;
