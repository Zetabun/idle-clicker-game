/*
 * Strikewatch source module: 52-season-narratives.js
 * Purpose: Automatic season stakes, evolving rivalries, storylines and club history.
 *
 * The system is presentation-led and low maintenance. It observes authoritative
 * league, supporter, squad-dynamics and match data. It never changes combat AI,
 * health, weapon values, fixture outcomes or creates mandatory decisions.
 */

  function seasonNarrativeState() {
    const raw = careerState.seasonNarrative;
    const valid = Boolean(raw && raw.version === SEASON_NARRATIVE_VERSION && raw.rivalries && typeof raw.rivalries === 'object' && Array.isArray(raw.seasons) && raw.records && raw.current && Array.isArray(raw.current.headlines) && Array.isArray(raw.mailedKeys));
    if (!valid) careerState.seasonNarrative = normaliseSeasonNarrative(raw);
    const league = typeof ensureLeagueState === 'function' ? ensureLeagueState() : null;
    if (league && careerState.seasonNarrative.current.season !== league.season) {
      careerState.seasonNarrative.current = {
        season: league.season,
        divisionTier: league.divisionTier,
        lastSettledFixtureId: '',
        latestHeadline: null,
        headlines: []
      };
    }
    return careerState.seasonNarrative;
  }

  function seasonNarrativeOrdinal(value) {
    const number = Math.max(1, Math.round(Number(value) || 1));
    const mod100 = number % 100;
    const suffix = mod100 >= 11 && mod100 <= 13 ? 'TH' : number % 10 === 1 ? 'ST' : number % 10 === 2 ? 'ND' : number % 10 === 3 ? 'RD' : 'TH';
    return `${number}${suffix}`;
  }

  function seasonNarrativeRivalryTier(intensity = 0) {
    const value = clamp(Math.round(Number(intensity) || 0), 0, 100);
    return SEASON_RIVALRY_TIERS.slice().reverse().find(tier => value >= tier.min) || SEASON_RIVALRY_TIERS[0];
  }

  function seasonNarrativeRivalry(club = null, create = false) {
    if (!club?.id || club.id === LEAGUE_USER_CLUB_ID) return null;
    const state = seasonNarrativeState();
    let record = state.rivalries[club.id] || null;
    if (!record && create) {
      record = {
        clubId: club.id,
        clubName: club.name,
        intensity: 0,
        meetings: 0,
        wins: 0,
        losses: 0,
        closeMatches: 0,
        decisiveMatches: 0,
        lastSeason: 0,
        lastMatchday: 0,
        lastWon: false,
        lastOwnScore: 0,
        lastOpponentScore: 0,
        lastFixtureId: ''
      };
      state.rivalries[club.id] = record;
    }
    if (record) record.clubName = club.name || record.clubName;
    return record;
  }

  function seasonNarrativeUserFixtures(playedOnly = false) {
    const league = ensureLeagueState();
    if (!league) return [];
    return league.fixtures
      .filter(fixture => (fixture.homeId === LEAGUE_USER_CLUB_ID || fixture.awayId === LEAGUE_USER_CLUB_ID) && (!playedOnly || fixture.played))
      .sort((a, b) => a.matchday - b.matchday);
  }

  function seasonNarrativeFixtureResult(fixture) {
    if (!fixture?.played) return null;
    const home = fixture.homeId === LEAGUE_USER_CLUB_ID;
    const ownScore = home ? fixture.homeScore : fixture.awayScore;
    const opponentScore = home ? fixture.awayScore : fixture.homeScore;
    return {
      won: fixture.winnerId === LEAGUE_USER_CLUB_ID,
      home,
      ownScore: Math.max(0, Number(ownScore) || 0),
      opponentScore: Math.max(0, Number(opponentScore) || 0),
      margin: Math.abs((Number(ownScore) || 0) - (Number(opponentScore) || 0))
    };
  }

  function seasonNarrativePerformance() {
    const fixtures = seasonNarrativeUserFixtures(true);
    let winStreak = 0;
    let lossStreak = 0;
    let longestWinStreak = 0;
    let longestLossStreak = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    let homeWins = 0;
    let homeLosses = 0;
    let awayWins = 0;
    let awayLosses = 0;
    let roundsFor = 0;
    let roundsAgainst = 0;
    fixtures.forEach(fixture => {
      const result = seasonNarrativeFixtureResult(fixture);
      if (!result) return;
      roundsFor += result.ownScore;
      roundsAgainst += result.opponentScore;
      if (result.won) {
        winStreak += 1;
        lossStreak = 0;
        if (result.home) homeWins += 1;
        else awayWins += 1;
      } else {
        lossStreak += 1;
        winStreak = 0;
        if (result.home) homeLosses += 1;
        else awayLosses += 1;
      }
      longestWinStreak = Math.max(longestWinStreak, winStreak);
      longestLossStreak = Math.max(longestLossStreak, lossStreak);
      currentWinStreak = winStreak;
      currentLossStreak = lossStreak;
    });
    return {
      played: fixtures.length,
      wins: fixtures.filter(fixture => fixture.winnerId === LEAGUE_USER_CLUB_ID).length,
      losses: fixtures.filter(fixture => fixture.winnerId !== LEAGUE_USER_CLUB_ID).length,
      currentWinStreak,
      currentLossStreak,
      longestWinStreak,
      longestLossStreak,
      homeWins,
      homeLosses,
      awayWins,
      awayLosses,
      roundsFor,
      roundsAgainst,
      roundDifference: roundsFor - roundsAgainst,
      recent: fixtures.slice(-5).map(fixture => fixture.winnerId === LEAGUE_USER_CLUB_ID ? 'W' : 'L')
    };
  }

  function seasonNarrativeExpectation() {
    return typeof supporterSeasonExpectation === 'function' ? supporterSeasonExpectation(false) : null;
  }

  function seasonNarrativeFixtureContext(fixture = null, opponent = null) {
    const league = ensureLeagueState();
    const resolvedFixture = fixture || leagueNextFixture();
    const resolvedOpponent = opponent || (resolvedFixture ? leagueClubById(leagueFixtureOpponentId(resolvedFixture)) : null);
    if (!league || !resolvedFixture || !resolvedOpponent) return null;
    const table = leagueTable();
    const user = table.find(row => row.id === LEAGUE_USER_CLUB_ID) || null;
    const opponentRow = table.find(row => row.id === resolvedOpponent.id) || null;
    const performance = seasonNarrativePerformance();
    const rivalry = seasonNarrativeRivalry(resolvedOpponent, false);
    const rivalryTier = seasonNarrativeRivalryTier(rivalry?.intensity || 0);
    const expectation = typeof leagueFixtureExpectationSnapshot === 'function' ? leagueFixtureExpectationSnapshot(resolvedFixture, resolvedOpponent) : null;
    const total = leagueSeasonMatchCount(league.clubs.length);
    const remaining = Math.max(0, total - performance.played);
    const pointGap = user && opponentRow ? Math.abs(user.points - opponentRow.points) : 99;
    const positionGap = user && opponentRow ? Math.abs(user.position - opponentRow.position) : 99;
    const clubCount = league.clubs.length;
    const bottomPressure = league.divisionTier < 3 && user && opponentRow && user.position >= clubCount - 3 && opponentRow.position >= clubCount - 3;
    const promotionRace = user && opponentRow && user.position <= 4 && opponentRow.position <= 4 && pointGap <= 6 && performance.played >= 4;
    const latePromotionRace = promotionRace && remaining <= 7;
    const revenge = rivalry && rivalry.meetings > 0 && !rivalry.lastWon && (rivalry.lastOpponentScore - rivalry.lastOwnScore) >= 2;
    const candidates = [];
    const add = (importance, id, label, headline, detail, tone = 'neutral') => candidates.push({ importance, id, label, headline, detail, tone });
    if (performance.played === 0) add(2, 'season-opener', 'SEASON OPENER', 'A NEW CAMPAIGN BEGINS', `${careerState.name} begins Season ${league.season} against ${resolvedOpponent.name}.`, 'even');
    if (latePromotionRace) add(5, 'promotion-six-pointer', 'PROMOTION SIX-POINTER', 'THE TABLE CAN MOVE TODAY', `Both clubs are inside the leading group with only ${remaining} fixture${remaining === 1 ? '' : 's'} remaining.`, 'positive');
    else if (promotionRace) add(4, 'promotion-race', 'PROMOTION RACE', 'DIRECT RIVALS IN THE LEADING PACK', `${careerState.name} and ${resolvedOpponent.name} are separated by ${pointGap} point${pointGap === 1 ? '' : 's'}.`, 'favourable');
    if (bottomPressure) add(5, 'survival-six-pointer', 'SURVIVAL SIX-POINTER', 'A DIRECT BATTLE NEAR THE BOTTOM', `Both clubs are fighting to move clear of the relegation places.`, 'danger');
    if (rivalryTier.level >= 3) add(5, 'fierce-rivalry', 'FIERCE RIVALRY', 'THE FIXTURE HAS BECOME PERSONAL', `${rivalry.meetings} previous meeting${rivalry.meetings === 1 ? '' : 's'} have driven rivalry intensity to ${rivalry.intensity}/100.`, 'danger');
    else if (rivalryTier.level >= 2) add(4, 'heated-rivalry', 'HEATED RIVALRY', 'AN ESTABLISHED GRUDGE MATCH', `Recent meetings have built a heated rivalry with ${resolvedOpponent.name}.`, 'warning');
    else if (rivalryTier.level >= 1) add(3, 'emerging-rivalry', 'EMERGING RIVALRY', 'A FIXTURE DEVELOPING AN EDGE', `Close and meaningful meetings are beginning to create history between the clubs.`, 'even');
    if (revenge) add(4, 'revenge', 'REVENGE MATCH', 'A CHANCE TO ANSWER THE LAST DEFEAT', `${resolvedOpponent.name} won the previous meeting ${rivalry.lastOpponentScore}–${rivalry.lastOwnScore}.`, 'warning');
    if (performance.currentWinStreak >= 4) add(4, 'streak-test', 'WINNING STREAK', 'MOMENTUM IS ON THE LINE', `${careerState.name} enters on a ${performance.currentWinStreak}-match winning run.`, 'positive');
    if (performance.currentLossStreak >= 3) add(4, 'response-required', 'RESPONSE REQUIRED', 'THE CLUB NEEDS TO STOP THE SLIDE', `${careerState.name} has lost ${performance.currentLossStreak} consecutive league fixtures.`, 'danger');
    if (performance.played >= 3 && positionGap <= 1 && !promotionRace && !bottomPressure) add(3, 'table-neighbour', 'TABLE NEIGHBOURS', 'A DIRECT POSITIONAL BATTLE', `The clubs are adjacent in the table${pointGap ? ` and separated by ${pointGap} point${pointGap === 1 ? '' : 's'}` : ''}.`, 'even');
    if (!candidates.length) add(1, 'league-fixture', 'LEAGUE FIXTURE', 'ANOTHER STEP IN THE CAMPAIGN', `${careerState.name} faces ${resolvedOpponent.name} on Matchday ${resolvedFixture.matchday}.`, 'neutral');
    candidates.sort((a, b) => b.importance - a.importance);
    const primary = candidates[0];
    const winChance = Number(expectation?.winChance) || 50;
    let boardHeadline = 'COMPETE WITH DISCIPLINE';
    let boardDetail = 'The board expects a competitive display and evidence that the match plan was followed.';
    if (winChance >= 65) { boardHeadline = 'VICTORY EXPECTED'; boardDetail = 'The club is favoured. Dropping the result would be viewed as a missed opportunity.'; }
    else if (winChance < 36) { boardHeadline = 'PERFORMANCE BEFORE RESULT'; boardDetail = 'A narrow defeat can be accepted, but the board expects the side to remain competitive.'; }
    if (primary.importance >= 5) boardDetail += ' The importance of the fixture raises public attention, not operator attributes.';
    return {
      ...primary,
      fixtureId: resolvedFixture.id,
      matchday: resolvedFixture.matchday,
      opponentId: resolvedOpponent.id,
      opponentName: resolvedOpponent.name,
      userPosition: user?.position || null,
      opponentPosition: opponentRow?.position || null,
      userPoints: user?.points || 0,
      opponentPoints: opponentRow?.points || 0,
      pointGap,
      remaining,
      rivalry: rivalry ? { ...rivalry, tier: rivalryTier } : { intensity: 0, meetings: 0, wins: 0, losses: 0, tier: rivalryTier },
      supporter: expectation ? { headline: expectation.headline, label: expectation.label, winChance: expectation.winChance, tone: expectation.tone } : null,
      board: { headline: boardHeadline, detail: boardDetail },
      reasons: candidates.slice(0, 3).map(item => ({ id: item.id, label: item.label, detail: item.detail, importance: item.importance }))
    };
  }

  function seasonNarrativeTopOperator() {
    return (careerState.squad || []).slice().sort((a, b) => {
      const bMatches = Number(b.career?.matches) || 0;
      const aMatches = Number(a.career?.matches) || 0;
      const bKills = Number(b.career?.kills) || 0;
      const aKills = Number(a.career?.kills) || 0;
      return (bMatches - aMatches) || (bKills - aKills) || (Number(b.form) || 0) - (Number(a.form) || 0);
    })[0] || null;
  }

  function seasonNarrativeStrongestPartnership() {
    if (typeof squadDynamicsAllPairs !== 'function') return null;
    const pair = squadDynamicsAllPairs().find(item => item?.tier?.level > 0) || null;
    return pair ? { names: `${pair.first.name} + ${pair.second.name}`, score: pair.record.score, tier: pair.tier.label } : null;
  }

  function seasonNarrativeStorylines() {
    const league = ensureLeagueState();
    if (!league) return [];
    const table = leagueTable();
    const user = table.find(row => row.id === LEAGUE_USER_CLUB_ID);
    const performance = seasonNarrativePerformance();
    const expectation = seasonNarrativeExpectation();
    const stories = [];
    const add = (priority, id, title, detail, tone = 'neutral') => stories.push({ priority, id, title, detail, tone });
    if (performance.played >= 5 && user?.position <= 3) add(100, 'promotion-challenge', 'PROMOTION CHALLENGE', `${careerState.name} is ${seasonNarrativeOrdinal(user.position)} with ${user.points} points and remains inside the leading group.`, 'positive');
    if (performance.played >= 5 && expectation?.expectedPosition && user && user.position <= expectation.expectedPosition - 3) add(96, 'surprise-package', 'SURPRISE PACKAGE', `The club is ${expectation.expectedPosition - user.position} places above its public pre-season estimate.`, 'positive');
    if (performance.currentWinStreak >= 3) add(92, 'winning-run', `${performance.currentWinStreak}-MATCH WINNING RUN`, 'Momentum is building, but the next opponent will now treat the club as a greater threat.', 'positive');
    if (performance.currentLossStreak >= 3) add(91, 'poor-run', `${performance.currentLossStreak} LEAGUE DEFEATS IN A ROW`, 'The next fixture is becoming a test of the manager’s ability to stabilise the team.', 'danger');
    const awayPlayed = performance.awayWins + performance.awayLosses;
    if (awayPlayed >= 4 && performance.awayWins / awayPlayed < 0.35) add(78, 'away-form', 'AWAY FORM UNDER REVIEW', `${careerState.name} has won ${performance.awayWins} of ${awayPlayed} away fixtures.`, 'warning');
    const homePlayed = performance.homeWins + performance.homeLosses;
    if (homePlayed >= 4 && performance.homeWins / homePlayed >= 0.70) add(77, 'home-fortress', 'HOME FORTRESS', `${careerState.name} has won ${performance.homeWins} of ${homePlayed} home fixtures.`, 'favourable');
    const partnership = seasonNarrativeStrongestPartnership();
    if (partnership && partnership.score >= 45) add(70, 'famous-partnership', 'A PARTNERSHIP DEFINING THE SEASON', `${partnership.names} has reached ${partnership.tier} status with a ${partnership.score}/100 bond.`, 'even');
    const breakout = (careerState.squad || []).filter(player => (Number(player.career?.matches) || 0) >= 3 && (Number(player.form) || 0) >= 7.2).sort((a, b) => (Number(b.form) || 0) - (Number(a.form) || 0))[0];
    if (breakout) add(68, 'breakout-operator', 'BREAKOUT OPERATOR', `${breakout.name} is carrying ${Number(breakout.form).toFixed(1)} form and becoming central to the club’s campaign.`, 'favourable');
    const familiarity = careerState.tactics?.familiarity || {};
    const familiarities = [];
    Object.entries(familiarity).forEach(([category, values]) => {
      if (!values || typeof values !== 'object' || category === 'lastGain') return;
      Object.entries(values).forEach(([id, value]) => familiarities.push({ category, id, value: Number(value) || 0 }));
    });
    const identity = familiarities.sort((a, b) => b.value - a.value)[0];
    if (identity?.value >= 68) add(62, 'tactical-identity', 'A RECOGNISABLE TACTICAL IDENTITY', `${identity.id.replace(/-/g, ' ').toUpperCase()} has reached ${Math.round(identity.value)} familiarity and is becoming part of the club’s identity.`, 'even');
    if (!stories.length) add(10, 'campaign-building', 'THE CAMPAIGN IS TAKING SHAPE', `${performance.played} league fixture${performance.played === 1 ? '' : 's'} played. More distinctive storylines will emerge from results, operators and rivalries.`, 'neutral');
    return stories.sort((a, b) => b.priority - a.priority).slice(0, 4);
  }

  function seasonNarrativeAddHeadline(headline, mail = false) {
    if (!headline?.title) return null;
    const state = seasonNarrativeState();
    const league = ensureLeagueState();
    const item = {
      id: String(headline.id || `${league?.season || 1}:${leagueCurrentMatchday()}:${headline.type || 'story'}:${headline.title}`),
      season: league?.season || 1,
      matchday: Math.max(0, Math.round(Number(headline.matchday) || 0)),
      title: String(headline.title),
      detail: String(headline.detail || ''),
      tone: String(headline.tone || 'neutral'),
      type: String(headline.type || 'STORY')
    };
    state.current.headlines = [item, ...state.current.headlines.filter(existing => existing.id !== item.id)].slice(0, SEASON_NARRATIVE_HEADLINE_LIMIT);
    state.current.latestHeadline = item;
    if (mail && !state.mailedKeys.includes(item.id) && typeof clubAddMail === 'function') {
      state.mailedKeys = [item.id, ...state.mailedKeys].slice(0, SEASON_NARRATIVE_MAIL_KEY_LIMIT);
      clubAddMail(item.title, item.detail, 'COMPETITION', false, 'league');
    }
    return item;
  }

  function seasonNarrativeMatchRecord(fixture, opponent, result) {
    return {
      fixtureId: fixture.id,
      season: ensureLeagueState()?.season || 1,
      matchday: fixture.matchday,
      opponentId: opponent?.id || '',
      opponentName: opponent?.name || 'Opposition',
      score: `${result.ownScore}–${result.opponentScore}`,
      ownScore: result.ownScore,
      opponentScore: result.opponentScore,
      margin: result.margin
    };
  }

  function seasonNarrativeUpdateRecords(fixture, opponent, result) {
    const state = seasonNarrativeState();
    const record = seasonNarrativeMatchRecord(fixture, opponent, result);
    let newRecord = null;
    if (result.won && (!state.records.biggestWin || result.margin > state.records.biggestWin.margin)) {
      state.records.biggestWin = record;
      newRecord = { id: `record-win:${fixture.id}`, title: 'NEW CLUB RECORD WIN', detail: `${careerState.name} recorded its biggest league victory: ${record.score} against ${record.opponentName}.`, tone: 'positive', type: 'RECORD', matchday: fixture.matchday };
    }
    if (!result.won && (!state.records.biggestDefeat || result.margin > state.records.biggestDefeat.margin)) {
      state.records.biggestDefeat = record;
    }
    const performance = seasonNarrativePerformance();
    if (performance.longestWinStreak > state.records.longestWinStreak) {
      state.records.longestWinStreak = performance.longestWinStreak;
      if (performance.longestWinStreak >= 3) newRecord = { id: `record-streak:${ensureLeagueState()?.season}:${performance.longestWinStreak}`, title: 'NEW WINNING-STREAK RECORD', detail: `${careerState.name} has set a club record with ${performance.longestWinStreak} consecutive league victories.`, tone: 'positive', type: 'RECORD', matchday: fixture.matchday };
    }
    return newRecord;
  }

  function seasonNarrativeUpdateRivalry(fixture, opponent, result, context) {
    const rivalry = seasonNarrativeRivalry(opponent, true);
    const beforeTier = seasonNarrativeRivalryTier(rivalry.intensity);
    const alternated = rivalry.meetings > 0 && rivalry.lastWon !== result.won;
    let delta = 3;
    if (result.margin === 1) delta += 7;
    if (result.margin >= 3) delta += 4;
    if (context?.importance >= 4) delta += 5;
    if (alternated) delta += 3;
    rivalry.intensity = clamp(rivalry.intensity + delta, 0, 100);
    rivalry.meetings += 1;
    rivalry.wins += result.won ? 1 : 0;
    rivalry.losses += result.won ? 0 : 1;
    rivalry.closeMatches += result.margin === 1 ? 1 : 0;
    rivalry.decisiveMatches += result.margin >= 3 ? 1 : 0;
    rivalry.lastSeason = ensureLeagueState()?.season || 1;
    rivalry.lastMatchday = fixture.matchday;
    rivalry.lastWon = result.won;
    rivalry.lastOwnScore = result.ownScore;
    rivalry.lastOpponentScore = result.opponentScore;
    rivalry.lastFixtureId = fixture.id;
    const afterTier = seasonNarrativeRivalryTier(rivalry.intensity);
    return { rivalry, beforeTier, afterTier, tierChanged: afterTier.level > beforeTier.level, delta };
  }

  function seasonNarrativeSettlementHeadline(fixture, opponent, result, context, rivalryUpdate) {
    if (rivalryUpdate?.tierChanged) {
      return {
        id: `rivalry-tier:${opponent.id}:${rivalryUpdate.afterTier.id}`,
        title: `${rivalryUpdate.afterTier.label} · ${opponent.name}`,
        detail: `${careerState.name} ${result.won ? 'won' : 'lost'} ${result.ownScore}–${result.opponentScore}. Repeated meetings, stakes and close results have raised the rivalry to ${rivalryUpdate.afterTier.label.toLowerCase()}.`,
        tone: rivalryUpdate.afterTier.level >= 3 ? 'danger' : 'warning',
        type: 'RIVALRY',
        matchday: fixture.matchday,
        mail: true
      };
    }
    if (context?.importance >= 4) {
      return {
        id: `stakes:${fixture.id}`,
        title: `${result.won ? 'BIG RESULT' : 'HIGH-STAKES DEFEAT'} · ${context.label}`,
        detail: `${careerState.name} ${result.won ? 'rose to' : 'fell short in'} a ${context.label.toLowerCase()} against ${opponent.name}, finishing ${result.ownScore}–${result.opponentScore}.`,
        tone: result.won ? 'positive' : 'warning',
        type: 'FIXTURE',
        matchday: fixture.matchday,
        mail: context.importance >= 5
      };
    }
    return {
      id: `result-story:${fixture.id}`,
      title: result.won ? 'LEAGUE MOMENTUM BUILDS' : 'CAMPAIGN RESPONSE REQUIRED',
      detail: `${careerState.name} ${result.won ? 'defeated' : 'lost to'} ${opponent.name} ${result.ownScore}–${result.opponentScore}.`,
      tone: result.won ? 'positive' : 'neutral',
      type: 'RESULT',
      matchday: fixture.matchday,
      mail: false
    };
  }

  function settleSeasonNarrativeAfterFixture(fixture, opponent, result, context, summary = null) {
    if (!fixture?.id || !opponent || !result) return null;
    const state = seasonNarrativeState();
    if (state.current.lastSettledFixtureId === fixture.id || Object.values(state.rivalries).some(item => item.lastFixtureId === fixture.id)) {
      return summary?.seasonNarrative || null;
    }
    const rivalryUpdate = seasonNarrativeUpdateRivalry(fixture, opponent, result, context);
    const newRecord = seasonNarrativeUpdateRecords(fixture, opponent, result);
    const headline = seasonNarrativeSettlementHeadline(fixture, opponent, result, context, rivalryUpdate);
    seasonNarrativeAddHeadline(headline, Boolean(headline.mail));
    if (newRecord) seasonNarrativeAddHeadline(newRecord, newRecord.type === 'RECORD' && result.margin >= 3);
    const reputationBonus = result.won ? clamp((context?.importance >= 4 ? 1 : 0) + (rivalryUpdate.afterTier.level >= 3 ? 1 : 0), 0, 2) : 0;
    if (reputationBonus > 0) careerState.reputation = clamp((Number(careerState.reputation) || 0) + reputationBonus, 0, 100);
    state.current.lastSettledFixtureId = fixture.id;
    const snapshot = {
      fixture: { id: fixture.id, matchday: fixture.matchday, opponentId: opponent.id, opponentName: opponent.name },
      context: context ? { ...context, rivalry: { ...context.rivalry, tier: { ...context.rivalry.tier } }, reasons: context.reasons.map(item => ({ ...item })), supporter: context.supporter ? { ...context.supporter } : null, board: { ...context.board } } : null,
      result: { ...result },
      rivalry: { ...rivalryUpdate.rivalry, tier: { ...rivalryUpdate.afterTier }, gained: rivalryUpdate.delta, tierChanged: rivalryUpdate.tierChanged },
      headline: { ...headline },
      reputationBonus,
      storylines: seasonNarrativeStorylines().map(item => ({ ...item }))
    };
    if (summary) summary.seasonNarrative = snapshot;
    return snapshot;
  }

  function seasonNarrativeArchiveSnapshot() {
    const league = ensureLeagueState();
    if (!league || !leagueSeasonComplete()) return null;
    const table = leagueTable();
    const user = table.find(row => row.id === LEAGUE_USER_CLUB_ID);
    if (!user) return null;
    const movement = leagueMovementForPosition(user.position, league.divisionTier);
    const topOperator = seasonNarrativeTopOperator();
    const partnership = seasonNarrativeStrongestPartnership();
    return {
      season: league.season,
      divisionTier: league.divisionTier,
      divisionName: leagueCompetitionName(),
      position: user.position,
      clubCount: league.clubs.length,
      points: user.points,
      wins: user.wins,
      losses: user.losses,
      roundsFor: user.roundsFor,
      roundsAgainst: user.roundsAgainst,
      roundDifference: user.roundDifference,
      movement: movement.movement,
      championName: leagueChampion()?.name || '',
      topOperator: topOperator ? { name: topOperator.name, matches: Number(topOperator.career?.matches) || 0, kills: Number(topOperator.career?.kills) || 0 } : null,
      strongestPartnership: partnership
    };
  }

  function seasonNarrativeArchiveSeason(snapshot) {
    if (!snapshot) return false;
    const state = seasonNarrativeState();
    if (state.seasons.some(item => item.season === snapshot.season && item.divisionTier === snapshot.divisionTier)) return false;
    state.seasons = [snapshot, ...state.seasons].slice(0, SEASON_NARRATIVE_ARCHIVE_LIMIT);
    const records = state.records;
    if (!records.highestFinish || snapshot.divisionTier < records.highestFinish.divisionTier || (snapshot.divisionTier === records.highestFinish.divisionTier && snapshot.position < records.highestFinish.position)) {
      records.highestFinish = { season: snapshot.season, position: snapshot.position, divisionTier: snapshot.divisionTier, divisionName: snapshot.divisionName };
    }
    if (!records.highestPoints || snapshot.points > records.highestPoints.points) records.highestPoints = { season: snapshot.season, points: snapshot.points };
    if (!records.mostRoundDifference || snapshot.roundDifference > records.mostRoundDifference.value) records.mostRoundDifference = { season: snapshot.season, value: snapshot.roundDifference };
    seasonNarrativeAddHeadline({
      id: `season-archive:${snapshot.season}:${snapshot.divisionTier}`,
      title: `SEASON ${snapshot.season} ENTERS CLUB HISTORY`,
      detail: `${careerState.name} finished ${seasonNarrativeOrdinal(snapshot.position)} in ${snapshot.divisionName} with ${snapshot.points} points. ${snapshot.movement === 'PROMOTED' ? 'Promotion was secured.' : snapshot.movement === 'RELEGATED' ? 'The campaign ended in relegation.' : 'The division place was retained.'}`,
      tone: snapshot.movement === 'PROMOTED' ? 'positive' : snapshot.movement === 'RELEGATED' ? 'danger' : 'neutral',
      type: 'HISTORY',
      matchday: leagueSeasonMatchCount(snapshot.clubCount)
    }, true);
    return true;
  }

  function seasonNarrativeRivalries(limit = 4) {
    return Object.values(seasonNarrativeState().rivalries)
      .filter(item => item.meetings > 0)
      .map(item => ({ ...item, tier: seasonNarrativeRivalryTier(item.intensity) }))
      .sort((a, b) => b.intensity - a.intensity || b.meetings - a.meetings || a.clubName.localeCompare(b.clubName))
      .slice(0, limit);
  }

  function seasonNarrativeRecordLabel(record, fallback = 'NOT YET SET') {
    if (!record) return fallback;
    return `${record.score} VS ${record.opponentName}`;
  }

  function renderSeasonNarrativeCompact() {
    const fixture = leagueNextFixture();
    const opponent = fixture ? leagueClubById(leagueFixtureOpponentId(fixture)) : null;
    const context = seasonNarrativeFixtureContext(fixture, opponent);
    if (!context) return '';
    return `<section class="season-narrative-compact tone-${escapeCareerHtml(context.tone)}">
      <div><span>FIXTURE STORY</span><strong>${escapeCareerHtml(context.label)}</strong><p>${escapeCareerHtml(context.headline)} · ${escapeCareerHtml(context.detail)}</p></div>
      <aside><span>PUBLIC ATTENTION</span><strong>${context.importance}/5</strong><small>${context.rivalry.tier.short}${context.userPosition ? ` · ${seasonNarrativeOrdinal(context.userPosition)} VS ${seasonNarrativeOrdinal(context.opponentPosition)}` : ''}</small></aside>
      <button type="button" data-team-route="league">VIEW SEASON STORY →</button>
    </section>`;
  }

  function renderSeasonNarrativeDashboard() {
    const league = ensureLeagueState();
    if (!league) return '';
    const fixture = leagueNextFixture();
    const opponent = fixture ? leagueClubById(leagueFixtureOpponentId(fixture)) : null;
    const context = seasonNarrativeFixtureContext(fixture, opponent);
    const stories = seasonNarrativeStorylines();
    const rivalries = seasonNarrativeRivalries(4);
    const state = seasonNarrativeState();
    const performance = seasonNarrativePerformance();
    const latestSeason = state.seasons[0] || null;
    const contextMarkup = context ? `<section class="season-stakes-hero tone-${escapeCareerHtml(context.tone)}">
      <header><div><span>NEXT FIXTURE · MATCHDAY ${context.matchday}</span><strong>${escapeCareerHtml(context.label)}</strong><p>${escapeCareerHtml(context.headline)}. ${escapeCareerHtml(context.detail)}</p></div><aside><span>FIXTURE IMPORTANCE</span><strong>${context.importance}/5</strong><small>${escapeCareerHtml(context.rivalry.tier.label)}</small></aside></header>
      <div class="season-stakes-grid"><article><span>TABLE CONTEXT</span><strong>${context.userPosition ? `${seasonNarrativeOrdinal(context.userPosition)} VS ${seasonNarrativeOrdinal(context.opponentPosition)}` : 'SEASON OPENER'}</strong><small>${context.userPoints} PTS · ${context.opponentPoints} PTS</small></article><article><span>SUPPORTERS</span><strong>${escapeCareerHtml(context.supporter?.headline || 'COMPETE FOR THE WIN')}</strong><small>${escapeCareerHtml(context.supporter?.label || 'EXPECT A COMPETITIVE DISPLAY')}</small></article><article><span>BOARD VIEW</span><strong>${escapeCareerHtml(context.board.headline)}</strong><small>${escapeCareerHtml(context.board.detail)}</small></article><article><span>RIVALRY</span><strong>${context.rivalry.intensity}/100</strong><small>${context.rivalry.meetings} MEETING${context.rivalry.meetings === 1 ? '' : 'S'} · ${context.rivalry.wins}W ${context.rivalry.losses}L</small></article></div>
      <p class="season-stakes-note">Fixture importance changes presentation, supporter attention and a possible small reputation reward. It never changes operator attributes or the simulated result.</p>
    </section>` : `<section class="season-stakes-hero complete"><header><div><span>CAMPAIGN COMPLETE</span><strong>SEASON ${league.season} IS READY FOR REVIEW</strong><p>The final table, records and season archive are shown below.</p></div></header></section>`;
    const storyMarkup = stories.map(story => `<article class="tone-${escapeCareerHtml(story.tone)}"><span>LIVE STORYLINE</span><strong>${escapeCareerHtml(story.title)}</strong><p>${escapeCareerHtml(story.detail)}</p></article>`).join('');
    const rivalryMarkup = rivalries.length ? rivalries.map(item => `<article class="tier-${item.tier.level}"><header><span>${escapeCareerHtml(item.tier.label)}</span><b>${item.intensity}</b></header><strong>${escapeCareerHtml(item.clubName)}</strong><small>${item.meetings} MEETINGS · ${item.wins}W ${item.losses}L · ${item.closeMatches} CLOSE</small><i><em style="width:${item.intensity}%"></em></i></article>`).join('') : '<div class="season-empty-state"><strong>RIVALRIES WILL EMERGE NATURALLY</strong><p>Close results, repeated meetings and important table battles gradually create lasting rivalries.</p></div>';
    const records = state.records;
    return `<section class="season-narrative-dashboard">
      <div class="career-section-head"><div><span>SEASON NARRATIVE</span><strong>STAKES, RIVALRIES &amp; CLUB HISTORY</strong></div><p>Stories are recognised automatically from real fixtures, table position, operator form and squad relationships. No routine response is required.</p></div>
      ${contextMarkup}
      <section class="season-storyline-panel"><div class="career-section-head compact"><div><span>CAMPAIGN THREADS</span><strong>WHAT THIS SEASON IS BECOMING</strong></div><p>${performance.played} played · ${performance.wins} won · ${performance.roundDifference >= 0 ? '+' : ''}${performance.roundDifference} round difference</p></div><div class="season-storyline-grid">${storyMarkup}</div></section>
      <div class="season-narrative-lower"><section class="season-rivalry-panel"><div class="career-section-head compact"><div><span>RIVAL CLUBS</span><strong>EVOLVING GRUDGES</strong></div><p>Presentation and reputation stakes only—never combat buffs.</p></div><div class="season-rivalry-list">${rivalryMarkup}</div></section>
      <section class="season-history-panel"><div class="career-section-head compact"><div><span>CLUB HISTORY</span><strong>RECORD BOOK</strong></div><p>${state.seasons.length} completed season${state.seasons.length === 1 ? '' : 's'} archived.</p></div><div class="season-record-grid"><article><span>BIGGEST WIN</span><strong>${escapeCareerHtml(seasonNarrativeRecordLabel(records.biggestWin))}</strong><small>${records.biggestWin ? `SEASON ${records.biggestWin.season} · MATCHDAY ${records.biggestWin.matchday}` : 'A league victory will establish the record.'}</small></article><article><span>LONGEST WINNING RUN</span><strong>${records.longestWinStreak} MATCH${records.longestWinStreak === 1 ? '' : 'ES'}</strong><small>ALL-TIME LEAGUE RECORD</small></article><article><span>HIGHEST FINISH</span><strong>${records.highestFinish ? seasonNarrativeOrdinal(records.highestFinish.position) : 'NOT YET SET'}</strong><small>${records.highestFinish ? `${escapeCareerHtml(records.highestFinish.divisionName)} · SEASON ${records.highestFinish.season}` : 'COMPLETE THE FIRST SEASON'}</small></article><article><span>LATEST SEASON</span><strong>${latestSeason ? `${seasonNarrativeOrdinal(latestSeason.position)} · ${latestSeason.points} PTS` : 'CURRENTLY IN PROGRESS'}</strong><small>${latestSeason ? `${escapeCareerHtml(latestSeason.divisionName)} · ${latestSeason.movement}` : `SEASON ${league.season}`}</small></article></div></section></div>
    </section>`;
  }

  function renderSeasonNarrativeMatchReport(summary) {
    const report = summary?.seasonNarrative;
    if (!report) return '';
    const context = report.context || {};
    const rivalry = report.rivalry || {};
    return `<section class="career-report-season-story tone-${escapeCareerHtml(report.headline?.tone || 'neutral')}">
      <header><div><span>SEASON STORY</span><strong>${escapeCareerHtml(report.headline?.title || context.label || 'FIXTURE COMPLETE')}</strong><p>${escapeCareerHtml(report.headline?.detail || '')}</p></div><aside><span>RIVALRY</span><strong>${rivalry.intensity || 0}/100</strong><small>${escapeCareerHtml(rivalry.tier?.label || 'NO ESTABLISHED RIVALRY')}${rivalry.gained ? ` · +${rivalry.gained}` : ''}</small></aside></header>
      <div><article><span>PRE-MATCH STAKES</span><strong>${escapeCareerHtml(context.label || 'LEAGUE FIXTURE')}</strong><small>${escapeCareerHtml(context.detail || '')}</small></article><article><span>SUPPORTER VIEW</span><strong>${escapeCareerHtml(context.supporter?.headline || 'COMPETE')}</strong><small>${escapeCareerHtml(context.supporter?.label || '')}</small></article><article><span>BOARD VIEW</span><strong>${escapeCareerHtml(context.board?.headline || 'COMPETE WITH DISCIPLINE')}</strong><small>${escapeCareerHtml(context.board?.detail || '')}</small></article><article><span>REPUTATION</span><strong>${report.reputationBonus > 0 ? `+${report.reputationBonus}` : 'NO CHANGE'}</strong><small>${report.reputationBonus > 0 ? 'HIGH-STAKES RESULT RECOGNISED' : 'TACTICS AND OPERATOR QUALITY REMAIN DECISIVE'}</small></article></div>
    </section>`;
  }

  function seasonNarrativeForTest() {
    const fixture = leagueNextFixture();
    const opponent = fixture ? leagueClubById(leagueFixtureOpponentId(fixture)) : null;
    const state = seasonNarrativeState();
    return {
      version: state.version,
      nextFixture: fixture ? { id: fixture.id, matchday: fixture.matchday, opponentId: opponent?.id || null, opponentName: opponent?.name || null } : null,
      context: seasonNarrativeFixtureContext(fixture, opponent),
      performance: seasonNarrativePerformance(),
      storylines: seasonNarrativeStorylines(),
      rivalries: seasonNarrativeRivalries(20),
      records: JSON.parse(JSON.stringify(state.records)),
      seasons: state.seasons.map(item => ({ ...item, topOperator: item.topOperator ? { ...item.topOperator } : null, strongestPartnership: item.strongestPartnership ? { ...item.strongestPartnership } : null })),
      headlines: state.current.headlines.map(item => ({ ...item })),
      mailKeys: [...state.mailedKeys]
    };
  }

  function seasonNarrativeRepeatLastSettlementForTest() {
    const fixtureId = seasonNarrativeState().current.lastSettledFixtureId;
    const fixture = ensureLeagueState()?.fixtures?.find(item => item.id === fixtureId) || null;
    const opponent = fixture ? leagueClubById(leagueFixtureOpponentId(fixture)) : null;
    const result = fixture ? seasonNarrativeFixtureResult(fixture) : null;
    if (!fixture || !opponent || !result) return { ok: false, reason: 'No settled narrative fixture.' };
    const before = JSON.stringify(seasonNarrativeForTest());
    const snapshot = settleSeasonNarrativeAfterFixture(fixture, opponent, result, seasonNarrativeFixtureContext(fixture, opponent), null);
    const after = JSON.stringify(seasonNarrativeForTest());
    return { ok: true, unchanged: before === after, snapshot };
  }

  function seasonNarrativeSimulateFixtureForTest(won = true, ownScore = null, opponentScore = null) {
    const fixture = leagueNextFixture();
    const opponent = fixture ? leagueClubById(leagueFixtureOpponentId(fixture)) : null;
    if (!fixture || !opponent) return { ok: false, reason: 'No unplayed league fixture.' };
    const context = seasonNarrativeFixtureContext(fixture, opponent);
    const userHome = fixture.homeId === LEAGUE_USER_CLUB_ID;
    const own = clamp(Math.round(Number(ownScore) || (won ? 3 : 1)), 0, 3);
    const other = clamp(Math.round(Number(opponentScore) || (won ? 2 : 3)), 0, 3);
    fixture.homeScore = userHome ? own : other;
    fixture.awayScore = userHome ? other : own;
    fixture.winnerId = won ? LEAGUE_USER_CLUB_ID : opponent.id;
    fixture.played = true;
    for (const otherFixture of ensureLeagueState().fixtures.filter(item => item.matchday === fixture.matchday && item.id !== fixture.id)) leagueSimulateFixture(otherFixture);
    const result = { won: Boolean(won), home: userHome, ownScore: own, opponentScore: other, margin: Math.abs(own - other) };
    const snapshot = settleSeasonNarrativeAfterFixture(fixture, opponent, result, context, null);
    saveCareerState();
    updateMenuUI();
    return { ok: true, snapshot, state: seasonNarrativeForTest() };
  }

  const baseLeagueBuildMatchPresentationForNarrative = leagueBuildMatchPresentation;
  leagueBuildMatchPresentation = function leagueBuildMatchPresentationWithNarrative(mode = null, fixture = null, opponent = null) {
    const presentation = baseLeagueBuildMatchPresentationForNarrative(mode, fixture, opponent);
    if (presentation.mode === 'league') presentation.story = seasonNarrativeFixtureContext(fixture, opponent);
    return presentation;
  };

  const baseSettleLeagueAfterCareerMatchForNarrative = settleLeagueAfterCareerMatch;
  settleLeagueAfterCareerMatch = function settleLeagueAfterCareerMatchWithNarrative(winner, summary) {
    const league = ensureLeagueState();
    const fixture = leagueActiveFixture();
    const opponent = leagueActiveOpponentClub();
    const mode = league?.activeMode;
    const context = mode === 'league' && fixture && opponent ? seasonNarrativeFixtureContext(fixture, opponent) : null;
    const result = baseSettleLeagueAfterCareerMatchForNarrative(winner, summary);
    if (mode === 'league' && fixture && opponent) {
      const userHome = fixture.homeId === LEAGUE_USER_CLUB_ID;
      const ownScore = userHome ? fixture.homeScore : fixture.awayScore;
      const opponentScore = userHome ? fixture.awayScore : fixture.homeScore;
      settleSeasonNarrativeAfterFixture(fixture, opponent, {
        won: winner === CAREER_OWNED_TEAM,
        home: userHome,
        ownScore,
        opponentScore,
        margin: Math.abs(ownScore - opponentScore)
      }, context, summary);
      saveCareerState();
    }
    return result;
  };

  const baseStartNextLeagueSeasonForNarrative = startNextLeagueSeason;
  startNextLeagueSeason = function startNextLeagueSeasonWithNarrativeArchive() {
    const archive = seasonNarrativeArchiveSnapshot();
    const started = baseStartNextLeagueSeasonForNarrative();
    if (started) {
      const state = seasonNarrativeState();
      state.current = { season: ensureLeagueState()?.season || 1, divisionTier: leagueDivisionTier(), lastSettledFixtureId: '', latestHeadline: null, headlines: [] };
      seasonNarrativeArchiveSeason(archive);
      saveCareerState();
      updateMenuUI();
    }
    return started;
  };

  const baseRenderLeagueFixturesForNarrative = renderLeagueFixtures;
  renderLeagueFixtures = function renderLeagueFixturesWithNarrative() {
    const league = ensureLeagueState();
    if (!league) return baseRenderLeagueFixturesForNarrative();
    const current = leagueNextFixture()?.matchday || leagueSeasonMatchCount(league.clubs.length);
    return Array.from({ length: leagueSeasonMatchCount(league.clubs.length) }, (_, index) => index + 1).map(matchday => {
      const fixture = league.fixtures.find(item => item.matchday === matchday && (item.homeId === LEAGUE_USER_CLUB_ID || item.awayId === LEAGUE_USER_CLUB_ID));
      if (!fixture) return '';
      const home = leagueClubById(fixture.homeId);
      const away = leagueClubById(fixture.awayId);
      const opponent = leagueClubById(leagueFixtureOpponentId(fixture));
      const state = fixture.played ? 'played' : (matchday === current ? 'next' : 'future');
      const score = fixture.played ? `${fixture.homeScore} — ${fixture.awayScore}` : (matchday === current ? 'NEXT' : 'SCHEDULED');
      const context = !fixture.played && matchday === current ? seasonNarrativeFixtureContext(fixture, opponent) : null;
      return `<article class="league-fixture ${state} ${context ? `stakes-${context.importance}` : ''}"><span>MATCHDAY ${matchday}${context ? ` · ${escapeCareerHtml(context.label)}` : ''}</span><div><strong>${escapeCareerHtml(home.name)}</strong><b>${score}</b><strong>${escapeCareerHtml(away.name)}</strong></div><small>${fixture.played ? (fixture.winnerId === LEAGUE_USER_CLUB_ID ? 'WIN' : 'LOSS') : (context ? `${context.importance}/5 IMPORTANCE · ${context.rivalry.tier.short}` : matchday === current ? 'REVIEW ACTIVE OPERATORS' : 'UPCOMING')}</small></article>`;
    }).join('');
  };

  const baseRenderLeagueTabForNarrative = renderLeagueTab;
  renderLeagueTab = function renderLeagueTabWithNarrative() {
    return `${renderSeasonNarrativeDashboard()}${baseRenderLeagueTabForNarrative()}`;
  };

  const baseRenderLeagueOperationsPanelForNarrative = renderLeagueOperationsPanel;
  renderLeagueOperationsPanel = function renderLeagueOperationsPanelWithNarrative(ready = false, pauseMenu = false) {
    return `${baseRenderLeagueOperationsPanelForNarrative(ready, pauseMenu)}${ready ? renderSeasonNarrativeCompact() : ''}`;
  };

  const baseRenderDeploymentSelectionForNarrative = renderDeploymentSelection;
  renderDeploymentSelection = function renderDeploymentSelectionWithNarrative() {
    const rendered = baseRenderDeploymentSelectionForNarrative();
    const league = ensureLeagueState();
    const fixture = league?.activeMode === 'league' ? leagueActiveFixture() : leagueNextFixture();
    const opponent = fixture ? leagueClubById(leagueFixtureOpponentId(fixture)) : null;
    const context = league?.activeMode === 'league' && fixture && opponent ? seasonNarrativeFixtureContext(fixture, opponent) : null;
    const brief = deploymentTacticsEl?.querySelector?.('.deployment-matchup-brief');
    if (context && brief && !brief.querySelector('.deployment-story-stake')) {
      brief.insertAdjacentHTML('afterbegin', `<article class="deployment-story-stake tone-${escapeCareerHtml(context.tone)}"><span>MATCH STAKES</span><strong>${escapeCareerHtml(context.label)}</strong><small>${escapeCareerHtml(context.headline)} · ${context.importance}/5 IMPORTANCE · ${escapeCareerHtml(context.rivalry.tier.short)}</small></article>`);
    }
    return rendered;
  };

  const baseShowCareerMatchIntroForNarrative = showCareerMatchIntro;
  showCareerMatchIntro = function showCareerMatchIntroWithNarrative() {
    const shown = baseShowCareerMatchIntroForNarrative();
    if (!shown) return shown;
    const presentation = currentMatchPresentation();
    const context = presentation?.story || (leagueActiveFixture() ? seasonNarrativeFixtureContext(leagueActiveFixture(), leagueActiveOpponentClub()) : null);
    if (context && careerMatchIntroPlanEl && !careerMatchIntroPlanEl.querySelector('.career-match-intro-story')) {
      careerMatchIntroPlanEl.insertAdjacentHTML('afterbegin', `<article class="career-match-intro-story tone-${escapeCareerHtml(context.tone)}"><span>MATCH STAKES · ${context.importance}/5</span><strong>${escapeCareerHtml(context.label)}</strong><small>${escapeCareerHtml(context.headline)}</small></article>`);
    }
    return shown;
  };

  const baseCareerReportMarkupForNarrative = careerReportMarkup;
  careerReportMarkup = function careerReportMarkupWithNarrative(summary, embedded = false) {
    return `${renderSeasonNarrativeMatchReport(summary)}${baseCareerReportMarkupForNarrative(summary, embedded)}`;
  };
