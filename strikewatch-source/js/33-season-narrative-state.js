/*
 * Strikewatch source module: 33-season-narrative-state.js
 * Purpose: Backwards-compatible persistent state for season stories and club history.
 */

  const SEASON_NARRATIVE_VERSION = 1;
  const SEASON_NARRATIVE_HEADLINE_LIMIT = 24;
  const SEASON_NARRATIVE_ARCHIVE_LIMIT = 20;
  const SEASON_NARRATIVE_MAIL_KEY_LIMIT = 60;
  const SEASON_RIVALRY_TIERS = Object.freeze([
    { id: 'none', label: 'NO ESTABLISHED RIVALRY', short: 'STANDARD', min: 0, level: 0 },
    { id: 'emerging', label: 'EMERGING RIVALRY', short: 'EMERGING', min: 20, level: 1 },
    { id: 'heated', label: 'HEATED RIVALRY', short: 'HEATED', min: 45, level: 2 },
    { id: 'fierce', label: 'FIERCE RIVALRY', short: 'FIERCE', min: 75, level: 3 }
  ]);

  function makeDefaultSeasonNarrativeState() {
    return {
      version: SEASON_NARRATIVE_VERSION,
      rivalries: {},
      seasons: [],
      records: {
        biggestWin: null,
        biggestDefeat: null,
        longestWinStreak: 0,
        highestFinish: null,
        highestPoints: null,
        mostRoundDifference: null
      },
      current: {
        season: 0,
        divisionTier: 3,
        lastSettledFixtureId: '',
        latestHeadline: null,
        headlines: []
      },
      mailedKeys: []
    };
  }

  function seasonNarrativeSafeMatchRecord(raw) {
    if (!raw || typeof raw !== 'object') return null;
    return {
      fixtureId: String(raw.fixtureId || ''),
      season: Math.max(1, Math.round(Number(raw.season) || 1)),
      matchday: Math.max(1, Math.round(Number(raw.matchday) || 1)),
      opponentId: String(raw.opponentId || ''),
      opponentName: String(raw.opponentName || 'Opposition'),
      score: String(raw.score || ''),
      ownScore: clamp(Math.round(Number(raw.ownScore) || 0), 0, 3),
      opponentScore: clamp(Math.round(Number(raw.opponentScore) || 0), 0, 3),
      margin: Math.max(0, Math.round(Number(raw.margin) || 0))
    };
  }

  function normaliseSeasonNarrative(raw) {
    const fallback = makeDefaultSeasonNarrativeState();
    const source = raw && typeof raw === 'object' ? raw : {};
    const rivalries = {};
    if (source.rivalries && typeof source.rivalries === 'object' && !Array.isArray(source.rivalries)) {
      Object.entries(source.rivalries).slice(0, 80).forEach(([clubId, item]) => {
        if (!item || typeof item !== 'object') return;
        rivalries[String(clubId)] = {
          clubId: String(clubId),
          clubName: String(item.clubName || 'Opposition'),
          intensity: clamp(Math.round(Number(item.intensity) || 0), 0, 100),
          meetings: Math.max(0, Math.round(Number(item.meetings) || 0)),
          wins: Math.max(0, Math.round(Number(item.wins) || 0)),
          losses: Math.max(0, Math.round(Number(item.losses) || 0)),
          closeMatches: Math.max(0, Math.round(Number(item.closeMatches) || 0)),
          decisiveMatches: Math.max(0, Math.round(Number(item.decisiveMatches) || 0)),
          lastSeason: Math.max(0, Math.round(Number(item.lastSeason) || 0)),
          lastMatchday: Math.max(0, Math.round(Number(item.lastMatchday) || 0)),
          lastWon: Boolean(item.lastWon),
          lastOwnScore: clamp(Math.round(Number(item.lastOwnScore) || 0), 0, 3),
          lastOpponentScore: clamp(Math.round(Number(item.lastOpponentScore) || 0), 0, 3),
          lastFixtureId: String(item.lastFixtureId || '')
        };
      });
    }
    const seasons = Array.isArray(source.seasons) ? source.seasons.slice(0, SEASON_NARRATIVE_ARCHIVE_LIMIT).map(item => ({
      season: Math.max(1, Math.round(Number(item?.season) || 1)),
      divisionTier: normaliseLeagueTier(item?.divisionTier),
      divisionName: String(item?.divisionName || 'STRIKEWATCH DIVISION'),
      position: Math.max(1, Math.round(Number(item?.position) || 1)),
      clubCount: Math.max(1, Math.round(Number(item?.clubCount) || 20)),
      points: Math.max(0, Math.round(Number(item?.points) || 0)),
      wins: Math.max(0, Math.round(Number(item?.wins) || 0)),
      losses: Math.max(0, Math.round(Number(item?.losses) || 0)),
      roundsFor: Math.max(0, Math.round(Number(item?.roundsFor) || 0)),
      roundsAgainst: Math.max(0, Math.round(Number(item?.roundsAgainst) || 0)),
      roundDifference: Math.round(Number(item?.roundDifference) || 0),
      movement: ['PROMOTED', 'RELEGATED', 'NONE'].includes(item?.movement) ? item.movement : 'NONE',
      championName: String(item?.championName || ''),
      topOperator: item?.topOperator && typeof item.topOperator === 'object' ? { name: String(item.topOperator.name || ''), matches: Math.max(0, Math.round(Number(item.topOperator.matches) || 0)), kills: Math.max(0, Math.round(Number(item.topOperator.kills) || 0)) } : null,
      strongestPartnership: item?.strongestPartnership && typeof item.strongestPartnership === 'object' ? { names: String(item.strongestPartnership.names || ''), score: clamp(Math.round(Number(item.strongestPartnership.score) || 0), 0, 100), tier: String(item.strongestPartnership.tier || '') } : null
    })) : [];
    const headlines = Array.isArray(source.current?.headlines) ? source.current.headlines.slice(0, SEASON_NARRATIVE_HEADLINE_LIMIT).map(item => ({
      id: String(item?.id || ''),
      season: Math.max(1, Math.round(Number(item?.season) || 1)),
      matchday: Math.max(0, Math.round(Number(item?.matchday) || 0)),
      title: String(item?.title || ''),
      detail: String(item?.detail || ''),
      tone: String(item?.tone || 'neutral'),
      type: String(item?.type || 'STORY')
    })) : [];
    return {
      version: SEASON_NARRATIVE_VERSION,
      rivalries,
      seasons,
      records: {
        biggestWin: seasonNarrativeSafeMatchRecord(source.records?.biggestWin),
        biggestDefeat: seasonNarrativeSafeMatchRecord(source.records?.biggestDefeat),
        longestWinStreak: Math.max(0, Math.round(Number(source.records?.longestWinStreak) || 0)),
        highestFinish: source.records?.highestFinish && typeof source.records.highestFinish === 'object' ? { season: Math.max(1, Math.round(Number(source.records.highestFinish.season) || 1)), position: Math.max(1, Math.round(Number(source.records.highestFinish.position) || 1)), divisionTier: normaliseLeagueTier(source.records.highestFinish.divisionTier), divisionName: String(source.records.highestFinish.divisionName || '') } : null,
        highestPoints: source.records?.highestPoints && typeof source.records.highestPoints === 'object' ? { season: Math.max(1, Math.round(Number(source.records.highestPoints.season) || 1)), points: Math.max(0, Math.round(Number(source.records.highestPoints.points) || 0)) } : null,
        mostRoundDifference: source.records?.mostRoundDifference && typeof source.records.mostRoundDifference === 'object' ? { season: Math.max(1, Math.round(Number(source.records.mostRoundDifference.season) || 1)), value: Math.round(Number(source.records.mostRoundDifference.value) || 0) } : null
      },
      current: {
        season: Math.max(0, Math.round(Number(source.current?.season) || 0)),
        divisionTier: normaliseLeagueTier(source.current?.divisionTier),
        lastSettledFixtureId: String(source.current?.lastSettledFixtureId || ''),
        latestHeadline: source.current?.latestHeadline && typeof source.current.latestHeadline === 'object' ? { ...source.current.latestHeadline } : (headlines[0] || null),
        headlines
      },
      mailedKeys: Array.isArray(source.mailedKeys) ? Array.from(new Set(source.mailedKeys.map(String))).slice(0, SEASON_NARRATIVE_MAIL_KEY_LIMIT) : fallback.mailedKeys
    };
  }

