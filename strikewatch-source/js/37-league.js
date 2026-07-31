/*
 * Strikewatch source module: 37-league.js
 * Purpose: Persistent clubs, fixtures, standings, league onboarding and match context.
 *
 * This file shares the application scope with the other source fragments.
 * Run `python3 build.py` to regenerate the development bundle and standalone.
 */

  const LEAGUE_STATE_VERSION = 2;
  const LEAGUE_USER_CLUB_ID = 'club-user';
  const LEAGUE_DIVISIONS = Object.freeze({
    3: { tier: 3, name: 'STRIKEWATCH DIVISION 3', short: 'DIVISION 3', ratingBoost: -4, poolLabel: 'DIVISION 3 POOL', promotionPlaces: 2, relegationPlaces: 0 },
    2: { tier: 2, name: 'STRIKEWATCH DIVISION 2', short: 'DIVISION 2', ratingBoost: 10, poolLabel: 'DIVISION 2 POOL', promotionPlaces: 2, relegationPlaces: 2 },
    1: { tier: 1, name: 'STRIKEWATCH DIVISION 1', short: 'DIVISION 1', ratingBoost: 23, poolLabel: 'DIVISION 1 POOL', promotionPlaces: 2, relegationPlaces: 2 },
    0: { tier: 0, name: 'STRIKEWATCH PRO LEAGUE', short: 'PRO LEAGUE', ratingBoost: 35, poolLabel: 'PRO LEAGUE POOL', promotionPlaces: 0, relegationPlaces: 2 }
  });

  function leagueDivisionTier() {
    return normaliseLeagueTier(careerState.league?.divisionTier);
  }

  function leagueDivisionDefinition(tier = leagueDivisionTier()) {
    return LEAGUE_DIVISIONS[normaliseLeagueTier(tier)] || LEAGUE_DIVISIONS[3];
  }

  function leagueCompetitionName() {
    return leagueDivisionDefinition().name;
  }

  function leagueDivisionPoolLabel() {
    return leagueDivisionDefinition().poolLabel;
  }
  const LEAGUE_POINTS_WIN = 3;
  let activeMatchPresentation = null;
  const LEAGUE_RIVAL_TEMPLATES = [
    { id: 'northbridge-five', name: 'Northbridge Five', short: 'NBF', rating: 28, reputation: 28, style: 'CONTROL', styleDetail: 'Measured spacing and disciplined support trades.', roles: ['caller','support','anchor','marksman','flex'] },
    { id: 'redline-union', name: 'Redline Union', short: 'RLU', rating: 38, reputation: 36, style: 'PRESSURE', styleDetail: 'Fast entries and immediate follow-up pressure.', roles: ['entry','entry','support','flanker','caller'] },
    { id: 'harbour-tactical', name: 'Harbour Tactical', short: 'HBT', rating: 32, reputation: 32, style: 'INFORMATION', styleDetail: 'Patient sound reads and careful late-round hunts.', roles: ['caller','support','anchor','flex','marksman'] },
    { id: 'eastgate-wolves', name: 'Eastgate Wolves', short: 'EGW', rating: 42, reputation: 41, style: 'ROTATION', styleDetail: 'Wide routes, quick rotations and split pressure.', roles: ['flanker','flanker','entry','support','caller'] },
    { id: 'nova-regiment', name: 'Nova Regiment', short: 'NVR', rating: 46, reputation: 47, style: 'TEMPO', styleDetail: 'High movement speed and repeated re-engagements.', roles: ['entry','support','flanker','flex','caller'] },
    { id: 'iron-district', name: 'Iron District', short: 'IRD', rating: 35, reputation: 35, style: 'DEFENCE', styleDetail: 'Durable anchors and conservative crossfires.', roles: ['anchor','anchor','support','marksman','caller'] },
    { id: 'atlas-division', name: 'Atlas Division', short: 'ATD', rating: 50, reputation: 54, style: 'BALANCED', styleDetail: 'Strong fundamentals with few obvious weaknesses.', roles: ['entry','support','anchor','marksman','caller'] },
    { id: 'meridian-vanguard', name: 'Meridian Vanguard', short: 'MDV', rating: 34, reputation: 33, style: 'STRUCTURE', styleDetail: 'Layered room clears and compact support spacing.', roles: ['caller','entry','support','anchor','flex'] },
    { id: 'kingswell-circuit', name: 'Kingswell Circuit', short: 'KWC', rating: 39, reputation: 38, style: 'COUNTER', styleDetail: 'Invites pressure before springing coordinated counter-attacks.', roles: ['anchor','support','marksman','flanker','caller'] },
    { id: 'blackwater-array', name: 'Blackwater Array', short: 'BWA', rating: 44, reputation: 43, style: 'ANGLES', styleDetail: 'Long sightline control and disciplined cross-map spacing.', roles: ['marksman','anchor','support','caller','flex'] },
    { id: 'union-forge', name: 'Union Forge', short: 'UNF', rating: 31, reputation: 29, style: 'BRAWL', styleDetail: 'Close-range trades and stubborn objective contests.', roles: ['entry','entry','anchor','support','caller'] },
    { id: 'helix-command', name: 'Helix Command', short: 'HLX', rating: 47, reputation: 49, style: 'ADAPTIVE', styleDetail: 'Frequent role swaps and mid-round tactical changes.', roles: ['flex','caller','support','entry','marksman'] },
    { id: 'crownpoint-unit', name: 'Crownpoint Unit', short: 'CPU', rating: 36, reputation: 37, style: 'HOLD', styleDetail: 'Patient defensive setups and late-round denial.', roles: ['anchor','anchor','support','caller','marksman'] },
    { id: 'westmoor-signal', name: 'Westmoor Signal', short: 'WMS', rating: 41, reputation: 40, style: 'READS', styleDetail: 'Information-led rotations and selective aggression.', roles: ['caller','support','flanker','flex','anchor'] },
    { id: 'emberline-corps', name: 'Emberline Corps', short: 'EMB', rating: 45, reputation: 46, style: 'MOMENTUM', styleDetail: 'Snowballs early picks into fast site collapses.', roles: ['entry','flanker','support','caller','flex'] },
    { id: 'greyhaven-stack', name: 'Greyhaven Stack', short: 'GHS', rating: 30, reputation: 27, style: 'COMPACT', styleDetail: 'Tight formations and simple high-percentage trades.', roles: ['support','anchor','entry','flex','caller'] },
    { id: 'vertex-coalition', name: 'Vertex Coalition', short: 'VTX', rating: 49, reputation: 52, style: 'PRECISION', styleDetail: 'Careful aim discipline and punishing isolated duels.', roles: ['marksman','caller','support','flanker','anchor'] },
    { id: 'longfield-protocol', name: 'Longfield Protocol', short: 'LFP', rating: 37, reputation: 35, style: 'SYSTEM', styleDetail: 'Repeatable executes built around utility-like spacing.', roles: ['caller','support','entry','anchor','flex'] },
    { id: 'southbank-recoil', name: 'Southbank Recoil', short: 'SBR', rating: 43, reputation: 44, style: 'BURST', styleDetail: 'Short explosive attacks followed by rapid resets.', roles: ['entry','flanker','caller','support','marksman'] }
  ];

  function leagueSeasonSeed(season = 1) {
    return teamSeedFromString(`${careerState.marketSeed || 1}:${careerState.name}:${season}:founders-division`);
  }

  function leagueShortName(name) {
    const words = String(name || 'CLUB').split(/\s+/).filter(Boolean);
    return words.slice(0, 3).map(word => word[0]).join('').toUpperCase().padEnd(3, 'X').slice(0, 3);
  }

  function leagueBuildMatchPresentation(mode = null, fixture = null, opponent = null) {
    const resolvedMode = mode === 'league' ? 'league' : (mode === 'exhibition' ? 'exhibition' : null);
    const userName = normaliseCareerName(careerState.name || 'Player Club') || 'Player Club';
    const userShort = leagueShortName(userName);
    const opponentName = normaliseCareerName(opponent?.name || 'Opposition') || 'Opposition';
    const opponentShort = String(opponent?.short || leagueShortName(opponentName)).slice(0, 4).toUpperCase();
    const userHome = resolvedMode === 'league' && fixture ? fixture.homeId === LEAGUE_USER_CLUB_ID : true;
    const competition = resolvedMode === 'league'
      ? `${leagueCompetitionName()} · MATCHDAY ${fixture?.matchday || leagueCurrentMatchday()}`
      : (resolvedMode === 'exhibition' ? 'EXHIBITION MATCH' : 'TACTICAL ELIMINATION');
    return {
      mode: resolvedMode,
      competition,
      matchday: fixture?.matchday || null,
      fixtureId: fixture?.id || null,
      blue: { name: userName, short: userShort, side: userHome ? 'HOME' : 'AWAY' },
      red: { name: opponentName, short: opponentShort, side: userHome ? 'AWAY' : 'HOME' }
    };
  }

  function captureActiveMatchPresentation(mode = null, fixture = null, opponent = null) {
    activeMatchPresentation = leagueBuildMatchPresentation(mode, fixture, opponent);
    return activeMatchPresentation;
  }

  function currentMatchPresentation() {
    if (typeof newPlayerDemoState !== 'undefined' && newPlayerDemoState.active) {
      const userName = normaliseCareerName(careerState.name || 'Your Club') || 'Your Club';
      return {
        mode: 'tutorial',
        competition: 'GUIDED ORIENTATION ROUND',
        matchday: null,
        fixtureId: null,
        blue: { name: userName, short: leagueShortName(userName), side: 'DEMO' },
        red: { name: 'Training Unit', short: 'TRN', side: 'DEMO' }
      };
    }
    if (activeMatchPresentation) return activeMatchPresentation;
    const league = ensureLeagueState();
    if (league?.activeMode) {
      return captureActiveMatchPresentation(league.activeMode, leagueActiveFixture(), leagueActiveOpponentClub());
    }
    const stored = careerState.lastRound?.matchPresentation;
    if (stored?.blue?.name && stored?.red?.name) return stored;
    return leagueBuildMatchPresentation(null, null, null);
  }

  function matchTeamIdentity(team) {
    const presentation = currentMatchPresentation();
    return team === TEAM_RED ? presentation.red : presentation.blue;
  }

  function matchCompetitionLabel() {
    return currentMatchPresentation().competition || 'TACTICAL ELIMINATION';
  }

  function matchCompetitionShortLabel() {
    const presentation = currentMatchPresentation();
    if (presentation.mode === 'tutorial') return 'GUIDED DEMO';
    if (presentation.mode === 'league') return `${leagueDivisionDefinition().short} · MATCHDAY ${presentation.matchday || leagueCurrentMatchday()}`;
    if (presentation.mode === 'exhibition') return 'EXHIBITION MATCH';
    return 'TACTICAL ELIMINATION';
  }

  function matchScoreLine(blueValue = blueScore, redValue = redScore, useFullNames = false) {
    const presentation = currentMatchPresentation();
    const left = useFullNames ? presentation.blue.name : presentation.blue.short;
    const right = useFullNames ? presentation.red.name : presentation.red.short;
    return `${left} ${Math.max(0, Number(blueValue) || 0)} — ${Math.max(0, Number(redValue) || 0)} ${right}`;
  }

  function leagueAdjustPlayerToRating(player, targetRating, slot, roleId) {
    const target = clamp(Math.round(targetRating + ((slot % 3) - 1) * 2), 22, 78);
    player.role = teamRoleById(roleId).id;
    player.secondaryRole = player.role === 'flex' ? 'support' : 'flex';
    const keys = Object.keys(CAREER_STAT_DEFS);
    const currentAverage = keys.reduce((sum, key) => sum + (Number(player.stats[key]) || 1), 0) / keys.length;
    const desiredAverage = target / 10;
    for (const key of keys) {
      player.stats[key] = clamp(Math.round((Number(player.stats[key]) || 1) + desiredAverage - currentAverage), 1, CAREER_MAX_STAT);
    }
    for (let pass = 0; pass < 24; pass++) {
      const current = teamPlayerOverall(player);
      if (Math.abs(current - target) <= 2) break;
      const direction = current < target ? 1 : -1;
      const ordered = keys.slice().sort((a, b) => direction > 0
        ? (player.stats[a] - player.stats[b])
        : (player.stats[b] - player.stats[a]));
      const key = ordered.find(candidate => direction > 0 ? player.stats[candidate] < CAREER_MAX_STAT : player.stats[candidate] > 1);
      if (!key) break;
      player.stats[key] = clamp(player.stats[key] + direction, 1, CAREER_MAX_STAT);
    }
    player.potential = clamp(Math.max(player.potential, target + 8 + (slot % 2) * 3), 48, 94);
    player.fee = 0;
    player.wage = 0;
    player.contractWeeks = 156;
    player.happiness = clamp(64 + (slot * 5) % 24, 1, 100);
    player.morale = clamp(66 + (slot * 4) % 22, 1, 100);
    player.fatigue = clamp((slot * 3) % 16, 0, 100);
    player.matchSharpness = 74 + (slot * 4) % 19;
    player.form = Number((5.8 + (slot % 4) * 0.45).toFixed(1));
    return player;
  }

  function leagueGenerateClubRoster(template, season, usedNames = new Set()) {
    const roster = [];
    for (let slot = 0; slot < TEAM_REQUIRED_STARTERS; slot++) {
      let attempt = 0;
      let player = null;
      do {
        const seed = teamSeedFromString(`${leagueSeasonSeed(season)}:${template.id}:${slot}:${attempt}`);
        player = generateTeamPlayer(seed, slot + attempt * 11, 'opponent');
        attempt++;
      } while (usedNames.has(player.name) && attempt < 24);
      usedNames.add(player.name);
      player.id = `LG-${template.id}-${season}-${slot}`;
      player.currentTeam = template.name;
      player.joinedWeek = 1;
      player = leagueAdjustPlayerToRating(player, template.rating, slot, template.roles[slot] || 'flex');
      roster.push(normaliseGeneratedPlayer(player, player.id));
    }
    return roster;
  }

  function leagueBuildClubs(season = 1, divisionTier = 3) {
    const usedNames = new Set((careerState.squad || []).map(player => player.name));
    const userClub = {
      id: LEAGUE_USER_CLUB_ID,
      name: careerState.name || 'Player Club',
      short: leagueShortName(careerState.name),
      rating: 50,
      reputation: careerState.reputation || 12,
      style: 'MANAGER SYSTEM',
      styleDetail: 'Tactical identity is determined by the selected squad and assigned roles.',
      roster: []
    };
    const division = leagueDivisionDefinition(divisionTier);
    const rivals = LEAGUE_RIVAL_TEMPLATES.map(template => {
      const scaledTemplate = {
        ...template,
        rating: clamp(template.rating + division.ratingBoost, 22, 86),
        reputation: clamp(template.reputation + division.ratingBoost, 12, 96)
      };
      return {
        ...scaledTemplate,
        roster: leagueGenerateClubRoster(scaledTemplate, season, usedNames)
      };
    });
    return [userClub, ...rivals];
  }

  function leagueBuildSchedule(clubIds, season = 1) {
    const rotation = clubIds.slice();
    // Put the introductory Northbridge fixture first so a newly assembled
    // foundation squad does not open the career against the strongest club.
    const northbridgeIndex = rotation.indexOf('northbridge-five');
    if (northbridgeIndex > 0 && northbridgeIndex !== rotation.length - 1) {
      const [northbridge] = rotation.splice(northbridgeIndex, 1);
      rotation.push(northbridge);
    }
    const fixtures = [];
    const count = rotation.length;
    for (let round = 0; round < count - 1; round++) {
      for (let pair = 0; pair < count / 2; pair++) {
        const first = rotation[pair];
        const second = rotation[count - 1 - pair];
        const swap = (round + pair) % 2 === 1;
        const homeId = swap ? second : first;
        const awayId = swap ? first : second;
        fixtures.push({
          id: `S${season}-M${round + 1}-${homeId}-${awayId}`,
          season,
          matchday: round + 1,
          homeId,
          awayId,
          played: false,
          homeScore: null,
          awayScore: null,
          winnerId: null
        });
      }
      const fixed = rotation[0];
      const tail = rotation.slice(1);
      tail.unshift(tail.pop());
      rotation.splice(0, rotation.length, fixed, ...tail);
    }
    const firstLeg = fixtures.map(fixture => ({ ...fixture }));
    const secondLeg = firstLeg.map(fixture => ({
      ...fixture,
      id: `S${season}-M${fixture.matchday + count - 1}-${fixture.awayId}-${fixture.homeId}`,
      matchday: fixture.matchday + count - 1,
      homeId: fixture.awayId,
      awayId: fixture.homeId,
      played: false,
      homeScore: null,
      awayScore: null,
      winnerId: null
    }));
    return [...firstLeg, ...secondLeg];
  }

  function leagueSeasonMatchCount(clubCount = ensureLeagueState()?.clubs?.length || (LEAGUE_RIVAL_TEMPLATES.length + 1)) {
    return Math.max(0, (Math.max(2, Number(clubCount) || 2) - 1) * 2);
  }

  function leagueMigrateLegacyFixtures(rawFixtures, scheduledFixtures) {
    const migrated = scheduledFixtures.map(fixture => ({ ...fixture }));
    const used = new Set();
    for (const legacy of Array.isArray(rawFixtures) ? rawFixtures : []) {
      if (!legacy?.played) continue;
      const samePair = migrated.filter(fixture => !used.has(fixture.id) && ((fixture.homeId === legacy.homeId && fixture.awayId === legacy.awayId) || (fixture.homeId === legacy.awayId && fixture.awayId === legacy.homeId)));
      const target = samePair.find(fixture => fixture.homeId === legacy.homeId && fixture.awayId === legacy.awayId) || samePair[0];
      if (!target) continue;
      const sameOrientation = target.homeId === legacy.homeId;
      target.played = true;
      target.homeScore = clamp(Math.round(Number(sameOrientation ? legacy.homeScore : legacy.awayScore) || 0), 0, 3);
      target.awayScore = clamp(Math.round(Number(sameOrientation ? legacy.awayScore : legacy.homeScore) || 0), 0, 3);
      target.winnerId = String(legacy.winnerId || (target.homeScore > target.awayScore ? target.homeId : target.awayId));
      used.add(target.id);
    }
    return migrated;
  }

  function makeDefaultLeagueState(season = 1, divisionTier = 3) {
    const resolvedTier = normaliseLeagueTier(divisionTier);
    const clubs = leagueBuildClubs(season, resolvedTier);
    return {
      version: LEAGUE_STATE_VERSION,
      name: leagueDivisionDefinition(resolvedTier).name,
      season,
      divisionTier: resolvedTier,
      lastSeasonPosition: null,
      lastMovement: 'NONE',
      introSeen: false,
      pendingMode: 'league',
      activeMode: null,
      activeFixtureId: null,
      activeOpponentId: null,
      clubs,
      fixtures: leagueBuildSchedule(clubs.map(club => club.id), season)
    };
  }

  function leagueNormaliseClub(raw, fallback, season, usedNames) {
    const base = fallback || {};
    const club = {
      ...base,
      ...(raw || {}),
      id: String(raw?.id || base.id || `club-${season}`),
      name: normaliseCareerName(raw?.name || base.name || 'Unknown Club') || 'Unknown Club',
      short: String(raw?.short || base.short || leagueShortName(raw?.name || base.name)).slice(0, 4).toUpperCase(),
      rating: clamp(Math.round(Number(raw?.rating) || Number(base.rating) || 50), 22, 85),
      reputation: clamp(Math.round(Number(raw?.reputation) || Number(base.reputation) || 20), 0, 100),
      style: String(raw?.style || base.style || 'BALANCED'),
      styleDetail: String(raw?.styleDetail || base.styleDetail || 'Balanced tactical approach.')
    };
    if (club.id === LEAGUE_USER_CLUB_ID) {
      club.name = careerState.name || club.name;
      club.short = leagueShortName(club.name);
      club.reputation = careerState.reputation || club.reputation;
      club.roster = [];
      return club;
    }
    const template = LEAGUE_RIVAL_TEMPLATES.find(item => item.id === club.id) || base;
    const rawRoster = Array.isArray(raw?.roster) ? raw.roster : (Array.isArray(base.roster) ? base.roster : []);
    club.roster = rawRoster.length >= TEAM_REQUIRED_STARTERS
      ? rawRoster.slice(0, TEAM_MAX_SQUAD).map((player, index) => {
          const normal = normaliseGeneratedPlayer(player, `LG-${club.id}-${season}-${index}`);
          normal.currentTeam = club.name;
          usedNames.add(normal.name);
          return normal;
        })
      : leagueGenerateClubRoster(template, season, usedNames);
    return club;
  }

  let leagueNormalisedState = null;

  function ensureLeagueState() {
    if (!careerState.created) {
      careerState.league = null;
      leagueNormalisedState = null;
      activeMatchPresentation = null;
      return null;
    }
    const raw = careerState.league && typeof careerState.league === 'object' ? careerState.league : null;
    if (raw && raw === leagueNormalisedState && raw.version === LEAGUE_STATE_VERSION && Array.isArray(raw.clubs) && raw.clubs.length === LEAGUE_RIVAL_TEMPLATES.length + 1 && Array.isArray(raw.fixtures)) {
      const userClub = raw.clubs.find(club => club.id === LEAGUE_USER_CLUB_ID);
      if (userClub) {
        userClub.name = careerState.name || userClub.name;
        userClub.short = leagueShortName(userClub.name);
        userClub.reputation = careerState.reputation || userClub.reputation;
      }
      return raw;
    }
    const season = Math.max(1, Math.round(Number(raw?.season) || 1));
    const divisionTier = normaliseLeagueTier(raw?.divisionTier);
    const fallback = makeDefaultLeagueState(season, divisionTier);
    const usedNames = new Set((careerState.squad || []).map(player => player.name));
    const rawClubs = Array.isArray(raw?.clubs) ? raw.clubs : [];
    const clubs = fallback.clubs.map(defaultClub => {
      const found = rawClubs.find(club => club?.id === defaultClub.id);
      return leagueNormaliseClub(found, defaultClub, season, usedNames);
    });
    const expectedFixtureCount = clubs.length * (clubs.length - 1);
    const rawFixtures = Array.isArray(raw?.fixtures) ? raw.fixtures.map(fixture => ({
      id: String(fixture.id || ''),
      season,
      matchday: clamp(Math.round(Number(fixture.matchday) || 1), 1, leagueSeasonMatchCount(clubs.length)),
      homeId: String(fixture.homeId || ''),
      awayId: String(fixture.awayId || ''),
      played: Boolean(fixture.played),
      homeScore: fixture.played ? clamp(Math.round(Number(fixture.homeScore) || 0), 0, 3) : null,
      awayScore: fixture.played ? clamp(Math.round(Number(fixture.awayScore) || 0), 0, 3) : null,
      winnerId: fixture.played ? String(fixture.winnerId || '') : null
    })).filter(fixture => clubs.some(club => club.id === fixture.homeId) && clubs.some(club => club.id === fixture.awayId)) : [];
    let fixtures = raw?.version === LEAGUE_STATE_VERSION && rawFixtures.length === expectedFixtureCount
      ? rawFixtures
      : leagueMigrateLegacyFixtures(rawFixtures, leagueBuildSchedule(clubs.map(club => club.id), season));
    careerState.league = {
      ...fallback,
      ...(raw || {}),
      version: LEAGUE_STATE_VERSION,
      name: leagueDivisionDefinition(divisionTier).name,
      season,
      divisionTier: normaliseLeagueTier(divisionTier),
      lastSeasonPosition: Number.isFinite(Number(raw?.lastSeasonPosition)) ? clamp(Math.round(Number(raw.lastSeasonPosition)), 1, clubs.length) : null,
      lastMovement: ['PROMOTED','RELEGATED','NONE'].includes(raw?.lastMovement) ? raw.lastMovement : 'NONE',
      introSeen: Boolean(raw?.introSeen),
      pendingMode: raw?.pendingMode === 'exhibition' ? 'exhibition' : 'league',
      activeMode: ['league','exhibition'].includes(raw?.activeMode) ? raw.activeMode : null,
      activeFixtureId: raw?.activeFixtureId || null,
      activeOpponentId: raw?.activeOpponentId || null,
      clubs,
      fixtures
    };
    leagueNormalisedState = careerState.league;
    return careerState.league;
  }

  function leagueClubById(id) {
    return ensureLeagueState()?.clubs.find(club => club.id === id) || null;
  }

  function leagueUserClub() {
    return leagueClubById(LEAGUE_USER_CLUB_ID);
  }

  function leagueFixtureOpponentId(fixture, clubId = LEAGUE_USER_CLUB_ID) {
    if (!fixture) return null;
    if (fixture.homeId === clubId) return fixture.awayId;
    if (fixture.awayId === clubId) return fixture.homeId;
    return null;
  }

  function leagueNextFixture() {
    const league = ensureLeagueState();
    if (!league) return null;
    return league.fixtures
      .filter(fixture => !fixture.played && (fixture.homeId === LEAGUE_USER_CLUB_ID || fixture.awayId === LEAGUE_USER_CLUB_ID))
      .sort((a, b) => a.matchday - b.matchday)[0] || null;
  }

  function leagueActiveFixture() {
    const league = ensureLeagueState();
    return league?.fixtures.find(fixture => fixture.id === league.activeFixtureId) || null;
  }

  function leagueActiveOpponentClub() {
    const league = ensureLeagueState();
    if (!league) return null;
    const opponentId = league.activeOpponentId || leagueFixtureOpponentId(leagueActiveFixture());
    return leagueClubById(opponentId);
  }

  function leagueFoundationBalanceProfile() {
    const league = ensureLeagueState();
    const activeFixture = leagueActiveFixture();
    const starters = (careerState.squad || []).slice(0, TEAM_REQUIRED_STARTERS);
    const userAverage = starters.length
      ? starters.reduce((sum, player) => sum + teamPlayerOverall(player), 0) / starters.length
      : 0;
    const club = leagueActiveOpponentClub();
    const opponentAverage = club?.roster?.length
      ? club.roster.slice(0, TEAM_REQUIRED_STARTERS).reduce((sum, player) => sum + teamPlayerOverall(player), 0) / TEAM_REQUIRED_STARTERS
      : Number(club?.rating) || 0;
    const eligible = Boolean(
      league && league.activeMode === 'league' && league.divisionTier === 3 &&
      (Number(activeFixture?.matchday) || 99) <= 3 &&
      Math.max(0, Number(careerState.totalMatches) || 0) < 3 && starters.length >= TEAM_REQUIRED_STARTERS
    );
    const matchday = Number(activeFixture?.matchday) || null;
    // Ease a newly assembled club into the league rather than forcing the
    // cheapest viable active five operators to fight the division's historical 22
    // rating floor immediately. The protection deliberately ramps away: the
    // first fixture targets +1 over the user's average, then +2 and +3.
    const introductoryMargin = eligible ? clamp(matchday, 1, 3) : 0;
    const targetOpponentRating = eligible ? clamp(Math.round(userAverage + introductoryMargin), 16, 30) : Math.round(opponentAverage);
    return {
      eligible,
      matchday,
      introductoryMargin,
      userAverage: Math.round(userAverage * 10) / 10,
      opponentAverage: Math.round(opponentAverage * 10) / 10,
      targetOpponentRating,
      adjustmentRequired: eligible && opponentAverage > targetOpponentRating + 0.5
    };
  }

  function leagueOpponentPlayerForSlot(slot) {
    const league = ensureLeagueState();
    if (!league || !['league','exhibition'].includes(league.activeMode)) return null;
    const club = leagueActiveOpponentClub();
    const safeSlot = clamp(Math.floor(Number(slot) || 0), 0, TEAM_REQUIRED_STARTERS - 1);
    const player = club?.roster?.[safeSlot] || null;
    if (!player) return null;
    const clone = normaliseGeneratedPlayer({ ...player, stats: { ...player.stats }, career: { ...player.career }, currentTeam: club.name }, player.id);
    const balance = leagueFoundationBalanceProfile();
    if (balance.adjustmentRequired && teamPlayerOverall(clone) > balance.targetOpponentRating + 1) {
      // leagueAdjustPlayerToRating normally adds a small slot-based variance.
      // Compensate for that variance here, then hard-cap any residual weighted
      // overall difference so Foundation Parity never advertises one limit but
      // fields a stronger introductory operator.
      const slotOffset = ((safeSlot % 3) - 1) * 2;
      leagueAdjustPlayerToRating(clone, balance.targetOpponentRating - slotOffset, safeSlot, clone.role);
      const statKeys = Object.keys(CAREER_STAT_DEFS);
      for (let pass = 0; pass < 32 && teamPlayerOverall(clone) > balance.targetOpponentRating + 1; pass++) {
        const key = statKeys.slice().sort((a, b) => (Number(clone.stats[b]) || 1) - (Number(clone.stats[a]) || 1)).find(candidate => (Number(clone.stats[candidate]) || 1) > 1);
        if (!key) break;
        clone.stats[key] = Math.max(1, (Number(clone.stats[key]) || 1) - 1);
      }
      clone.foundationBalanced = true;
    }
    return clone;
  }

  function leagueCurrentMatchday() {
    const next = leagueNextFixture();
    return next ? next.matchday : Math.max(1, leagueSeasonMatchCount(ensureLeagueState()?.clubs.length || (LEAGUE_RIVAL_TEMPLATES.length + 1)));
  }

  function leagueTable() {
    const league = ensureLeagueState();
    if (!league) return [];
    const rows = league.clubs.map(club => ({
      id: club.id,
      name: club.name,
      short: club.short,
      rating: club.id === LEAGUE_USER_CLUB_ID ? leagueUserSquadRating() : club.rating,
      played: 0,
      wins: 0,
      losses: 0,
      roundsFor: 0,
      roundsAgainst: 0,
      points: 0,
      form: []
    }));
    const rowById = new Map(rows.map(row => [row.id, row]));
    const playedFixtures = league.fixtures.filter(fixture => fixture.played).sort((a, b) => a.matchday - b.matchday);
    for (const fixture of playedFixtures) {
      const home = rowById.get(fixture.homeId);
      const away = rowById.get(fixture.awayId);
      if (!home || !away) continue;
      home.played++; away.played++;
      home.roundsFor += fixture.homeScore; home.roundsAgainst += fixture.awayScore;
      away.roundsFor += fixture.awayScore; away.roundsAgainst += fixture.homeScore;
      const homeWon = fixture.winnerId === fixture.homeId;
      if (homeWon) {
        home.wins++; away.losses++; home.points += LEAGUE_POINTS_WIN;
        home.form.push('W'); away.form.push('L');
      } else {
        away.wins++; home.losses++; away.points += LEAGUE_POINTS_WIN;
        away.form.push('W'); home.form.push('L');
      }
    }
    for (const row of rows) {
      row.roundDifference = row.roundsFor - row.roundsAgainst;
      row.form = row.form.slice(-5);
    }
    rows.sort((a, b) => (b.points - a.points) || (b.roundDifference - a.roundDifference) || (b.roundsFor - a.roundsFor) || a.name.localeCompare(b.name));
    rows.forEach((row, index) => row.position = index + 1);
    return rows;
  }

  function leagueUserSquadRating() {
    const starters = (careerState.squad || []).slice(0, TEAM_REQUIRED_STARTERS);
    if (!starters.length) return 0;
    return Math.round(starters.reduce((sum, player) => sum + teamPlayerOverall(player), 0) / starters.length);
  }

  function leagueUserPosition() {
    return leagueTable().find(row => row.id === LEAGUE_USER_CLUB_ID)?.position || 1;
  }

  function leagueSeasonComplete() {
    return Boolean(ensureLeagueState() && !leagueNextFixture());
  }

  function leagueChampion() {
    return leagueSeasonComplete() ? leagueTable()[0] || null : null;
  }

  function prepareCareerMatchContext(mode = null) {
    const league = ensureLeagueState();
    if (!league) return { ok: true, mode: 'exhibition', opponent: null };
    const requestedMode = mode === 'exhibition' ? 'exhibition' : (mode === 'league' ? 'league' : league.pendingMode || 'league');
    if (typeof clubCanPlayMatchToday === 'function' && !clubCanPlayMatchToday()) {
      return { ok: false, reason: 'A match has already been played today. Use End Day before scheduling another fixture.' };
    }
    if (requestedMode === 'exhibition' && typeof clubLeagueMatchDue === 'function' && clubLeagueMatchDue()) {
      return { ok: false, reason: "Today's scheduled league fixture must be played before an exhibition can be arranged." };
    }
    if (requestedMode === 'league') {
      const fixture = leagueNextFixture();
      if (!fixture) return { ok: false, reason: 'Season complete. Start the next season or play an exhibition.' };
      if (typeof clubLeagueMatchDue === 'function' && !clubLeagueMatchDue()) {
        const days = typeof clubDaysUntilFixture === 'function' ? clubDaysUntilFixture() : null;
        return { ok: false, reason: `The next league fixture is scheduled in ${days} day${days === 1 ? '' : 's'}. Use End Day to advance the calendar.` };
      }
      league.pendingMode = 'league';
      league.activeMode = 'league';
      league.activeFixtureId = fixture.id;
      league.activeOpponentId = leagueFixtureOpponentId(fixture);
    } else {
      const rivals = league.clubs.filter(club => club.id !== LEAGUE_USER_CLUB_ID);
      const opponent = rivals[(careerState.totalMatches + league.season + careerState.week) % Math.max(1, rivals.length)] || null;
      league.pendingMode = 'exhibition';
      league.activeMode = 'exhibition';
      league.activeFixtureId = null;
      league.activeOpponentId = opponent?.id || null;
    }
    const activeOpponent = leagueActiveOpponentClub();
    const activeFixture = leagueActiveFixture();
    captureActiveMatchPresentation(league.activeMode, activeFixture, activeOpponent);
    saveCareerState();
    return { ok: true, mode: league.activeMode, opponent: activeOpponent, fixture: activeFixture, presentation: currentMatchPresentation() };
  }

  function cancelPreparedCareerMatch() {
    const league = ensureLeagueState();
    if (!league || canResumeMatch) return;
    league.activeMode = null;
    league.activeFixtureId = null;
    league.activeOpponentId = null;
    activeMatchPresentation = null;
    saveCareerState();
  }

  function leagueSimulateFixture(fixture) {
    if (!fixture || fixture.played) return fixture;
    const home = leagueClubById(fixture.homeId);
    const away = leagueClubById(fixture.awayId);
    if (!home || !away) return fixture;
    const random = teamRng(teamSeedFromString(`${fixture.id}:${home.rating}:${away.rating}`));
    const ratingDelta = (Number(home.rating) || 50) - (Number(away.rating) || 50);
    const homeChance = clamp(0.50 + ratingDelta * 0.012 + 0.025, 0.18, 0.82);
    const homeWon = random() < homeChance;
    fixture.homeScore = homeWon ? 3 : Math.floor(random() * 3);
    fixture.awayScore = homeWon ? Math.floor(random() * 3) : 3;
    fixture.winnerId = homeWon ? home.id : away.id;
    fixture.played = true;
    return fixture;
  }

  // Build 12.135: pick the fixture a league result belongs to when the prepared
  // one is missing or has already been simulated. Prefers the same opponent so
  // the recovered result still matches what the manager was shown.
  function leagueRecoverSettlementFixture(league, preparedFixture = null) {
    const opponentId = league.activeOpponentId
      || (preparedFixture ? leagueFixtureOpponentId(preparedFixture) : null);
    const userFixtures = (league.fixtures || [])
      .filter(item => item.homeId === LEAGUE_USER_CLUB_ID || item.awayId === LEAGUE_USER_CLUB_ID)
      .sort((a, b) => (Number(a.matchday) || 0) - (Number(b.matchday) || 0));
    const unplayed = userFixtures.filter(item => !item.played);
    if (opponentId) {
      const sameOpponent = unplayed.find(item => leagueFixtureOpponentId(item) === opponentId);
      if (sameOpponent) return sameOpponent;
    }
    return unplayed[0] || null;
  }

  // Build 12.135: a stored league context is only usable while it still points
  // at a real, unplayed fixture. Anything else has to be prepared again.
  function leaguePreparedContextValid() {
    const league = ensureLeagueState();
    if (!league?.activeMode) return false;
    if (league.activeMode === 'exhibition') return true;
    const fixture = leagueActiveFixture();
    return Boolean(fixture && !fixture.played);
  }

  function settleLeagueAfterCareerMatch(winner, summary) {
    const league = ensureLeagueState();
    if (!league || !league.activeMode) return null;
    const opponent = leagueActiveOpponentClub();
    if (league.activeMode === 'exhibition') {
      const result = { mode: 'exhibition', opponentId: opponent?.id || null, opponentName: opponent?.name || 'Exhibition Opponent' };
      league.activeMode = null;
      league.activeFixtureId = null;
      league.activeOpponentId = null;
      league.pendingMode = 'league';
      saveCareerState();
      return result;
    }

    // Build 12.135: a league result must never be silently discarded.
    //
    // `activeFixtureId` can stop resolving between kick-off and settlement —
    // the league state is rebuilt whenever `careerState` is replaced (save
    // reload, import, recovery), and a rebuild that re-derives the schedule
    // invalidates the stored id. The old code returned null here, so the match
    // was played and presented as a league fixture but nothing was ever written
    // to the table, leaving every club on zero.
    //
    // Recover by writing the result into the correct fixture: the prepared one
    // if it still exists, otherwise the next unplayed user fixture against the
    // same opponent, otherwise the next unplayed user fixture at all.
    let fixture = leagueActiveFixture();
    if (!fixture || fixture.played) {
      fixture = leagueRecoverSettlementFixture(league, fixture);
    }
    if (!fixture) {
      // Genuinely nothing left to record against (season complete). Report it
      // honestly as a non-counting fixture rather than returning nothing.
      league.activeMode = null;
      league.activeFixtureId = null;
      league.activeOpponentId = null;
      saveCareerState();
      return {
        mode: 'exhibition',
        opponentId: opponent?.id || null,
        opponentName: opponent?.name || 'League Opponent',
        unrecorded: true
      };
    }
    const userHome = fixture.homeId === LEAGUE_USER_CLUB_ID;
    fixture.homeScore = userHome ? summary.blueScore : summary.redScore;
    fixture.awayScore = userHome ? summary.redScore : summary.blueScore;
    fixture.winnerId = winner === CAREER_OWNED_TEAM ? LEAGUE_USER_CLUB_ID : leagueFixtureOpponentId(fixture);
    fixture.played = true;

    for (const other of league.fixtures.filter(item => item.matchday === fixture.matchday && item.id !== fixture.id)) leagueSimulateFixture(other);

    const table = leagueTable();
    const userRow = table.find(row => row.id === LEAGUE_USER_CLUB_ID);
    const seasonComplete = leagueSeasonComplete();
    const champion = seasonComplete ? table[0] : null;
    const result = {
      mode: 'league',
      season: league.season,
      matchday: fixture.matchday,
      fixtureId: fixture.id,
      opponentId: opponent?.id || null,
      opponentName: opponent?.name || 'League Opponent',
      position: userRow?.position || 1,
      points: userRow?.points || 0,
      seasonComplete,
      championId: champion?.id || null,
      championName: champion?.name || null,
      divisionTier: league.divisionTier,
      divisionName: leagueCompetitionName()
    };
    if (typeof clubAddMail === 'function') {
      const won = fixture.winnerId === LEAGUE_USER_CLUB_ID;
      clubAddMail(
        `${won ? 'League victory' : 'League defeat'} · Matchday ${fixture.matchday}`,
        `${careerState.name} ${won ? 'won' : 'lost'} ${fixture.homeScore}–${fixture.awayScore} against ${opponent?.name || 'the opposition'}. The club is now ${userRow?.position || '—'} in ${leagueCompetitionName()} with ${userRow?.points || 0} points.`,
        'RESULT',
        true,
        'league'
      );
      if (seasonComplete) {
        const movement = leagueMovementForPosition(userRow?.position || league.clubs.length, league.divisionTier);
        clubAddMail(
          `Season complete · ${movement.movement === 'PROMOTED' ? 'Promotion secured' : movement.movement === 'RELEGATED' ? 'Relegation confirmed' : 'Division retained'}`,
          `The club finished ${userRow?.position || '—'} in ${leagueCompetitionName()}. ${movement.movement === 'PROMOTED' ? `A place in ${leagueDivisionDefinition(movement.tier).name} has been earned.` : movement.movement === 'RELEGATED' ? `The club will compete in ${leagueDivisionDefinition(movement.tier).name} next season.` : 'The club will remain in the current division next season.'}`,
          'COMPETITION',
          true,
          'league'
        );
      }
    }
    if (!seasonComplete && typeof clubScheduleNextLeagueFixture === 'function') clubScheduleNextLeagueFixture();
    league.activeMode = null;
    league.activeFixtureId = null;
    league.activeOpponentId = null;
    league.pendingMode = 'league';
    saveCareerState();
    return result;
  }

  function leagueMovementForPosition(position, tier = leagueDivisionTier()) {
    const clubCount = Math.max(4, Number(careerState.league?.clubs?.length) || (LEAGUE_RIVAL_TEMPLATES.length + 1));
    const value = clamp(Math.round(Number(position) || 1), 1, clubCount);
    if (tier > 0 && value <= 2) return { movement: 'PROMOTED', tier: tier - 1 };
    if (tier < 3 && value >= clubCount - 1) return { movement: 'RELEGATED', tier: tier + 1 };
    return { movement: 'NONE', tier };
  }

  function startNextLeagueSeason() {
    const league = ensureLeagueState();
    if (!league || !leagueSeasonComplete() || menuContext === 'pause') return false;
    const nextSeason = league.season + 1;
    const finalPosition = leagueTable().find(row => row.id === LEAGUE_USER_CLUB_ID)?.position || league.clubs.length;
    const movement = leagueMovementForPosition(finalPosition, league.divisionTier);
    league.lastSeasonPosition = finalPosition;
    league.lastMovement = movement.movement;
    league.divisionTier = movement.tier;
    const refreshed = leagueBuildClubs(nextSeason, league.divisionTier);
    league.clubs = refreshed;
    league.name = leagueDivisionDefinition(league.divisionTier).name;
    league.season = nextSeason;
    league.fixtures = leagueBuildSchedule(league.clubs.map(club => club.id), nextSeason);
    league.introSeen = true;
    league.pendingMode = 'league';
    league.activeMode = null;
    league.activeFixtureId = null;
    league.activeOpponentId = null;
    careerState.marketSeed = (careerState.marketSeed + 177013 + nextSeason * 271 + league.divisionTier * 811) >>> 0;
    careerState.market = generateTeamMarket(careerState.marketSeed);
    if (careerState.staff) {
      careerState.staff.selectedPoolDivision = league.divisionTier;
      careerState.staff.pool = [];
      careerState.staff.poolSeed = (Number(careerState.staff.poolSeed) + 1907 + nextSeason * 43) >>> 0;
    }
    if (typeof ensureClubOperationsState === 'function') ensureClubOperationsState();
    if (typeof clubScheduleNextLeagueFixture === 'function') clubScheduleNextLeagueFixture();
    if (typeof clubAddMail === 'function') {
      clubAddMail(
        `${leagueCompetitionName()} season ${nextSeason} created`,
        `${league.lastMovement === 'PROMOTED' ? 'Promotion has taken effect.' : league.lastMovement === 'RELEGATED' ? 'Relegation has taken effect.' : 'The club remains in the same division.'} A new 38-match double round-robin schedule is now available.`,
        'COMPETITION',
        true,
        'league'
      );
    }
    saveCareerState();
    updateMenuUI();
    return true;
  }

  function leagueDeployLabel() {
    const league = ensureLeagueState();
    if (!league) return 'START MATCHMAKING';
    if (league.pendingMode === 'exhibition') return 'PLAY EXHIBITION MATCH';
    const next = leagueNextFixture();
    if (!next) return 'SEASON COMPLETE';
    const opponent = leagueClubById(leagueFixtureOpponentId(next));
    return `LEAGUE M${next.matchday} · VS ${opponent?.short || 'TBD'}`;
  }

  function leagueMatchmakingTitle() {
    const league = ensureLeagueState();
    if (!league?.activeMode) return null;
    const presentation = currentMatchPresentation();
    return `${presentation.competition} · ${presentation.blue.name} VS ${presentation.red.name}`;
  }

  function leagueFormMarkup(form) {
    const values = Array.isArray(form) ? form : [];
    if (!values.length) return '<span class="empty">—</span>';
    return values.map(value => `<span class="${value === 'W' ? 'win' : 'loss'}">${value}</span>`).join('');
  }

  function renderLeagueIntroduction() {
    const league = ensureLeagueState();
    if (!league || league.introSeen) return '';
    return `<section class="league-intro-panel">
      <div><span>NEW CAREER LAYER</span><strong>YOUR FIRST ${escapeCareerHtml(leagueDivisionDefinition().short)} SEASON</strong><p>There are only three things to remember: build an active five-operator line-up, advance to matchday, and finish in the top two to earn promotion.</p></div>
      <ol><li><b>1</b><span>Nineteen opponents</span></li><li><b>2</b><span>Home and away fixtures</span></li><li><b>3</b><span>Top two are promoted</span></li></ol>
      <button class="primary" data-league-action="dismiss-intro">GOT IT · SHOW THE LEAGUE</button>
    </section>`;
  }

  function renderLeagueOperationsPanel(ready = false, pauseMenu = false) {
    const league = ensureLeagueState();
    if (!league) return '';
    const table = leagueTable();
    const user = table.find(row => row.id === LEAGUE_USER_CLUB_ID);
    const fixture = leagueNextFixture();
    const opponent = leagueClubById(leagueFixtureOpponentId(fixture));
    const complete = !fixture;
    const leagueDue = typeof clubLeagueMatchDue === 'function' ? clubLeagueMatchDue() : true;
    const matchAlreadyPlayed = typeof clubCanPlayMatchToday === 'function' ? !clubCanPlayMatchToday() : false;
    const leagueLocked = pauseMenu || !ready || !leagueDue || matchAlreadyPlayed;
    const exhibitionLocked = pauseMenu || !ready || leagueDue || matchAlreadyPlayed;
    const positionLabel = user?.played ? `${user.position}${user.position === 1 ? 'ST' : user.position === 2 ? 'ND' : user.position === 3 ? 'RD' : 'TH'}` : '—';
    return `${ready ? renderLeagueIntroduction() : ''}<section class="league-operations-panel">
      <div class="career-section-head"><div><span>${escapeCareerHtml(leagueCompetitionName())} · SEASON ${league.season}</span><strong>${complete ? 'SEASON COMPLETE' : `NEXT FIXTURE · MATCHDAY ${fixture.matchday}`}</strong></div><p>${complete ? 'Review the final table and prepare the next season.' : `${careerState.name} ${fixture.homeId === LEAGUE_USER_CLUB_ID ? 'vs' : 'at'} ${opponent?.name || 'TBD'} · ${typeof clubDaysUntilFixture === 'function' ? (clubDaysUntilFixture() === 0 ? 'TODAY' : `${clubDaysUntilFixture()}D`) : ''}`}</p></div>
      <div class="league-operations-grid">
        <div><span>LEAGUE POSITION</span><strong>${positionLabel}</strong><small>${user?.points || 0} POINTS · ${user?.played || 0} PLAYED</small></div>
        <div><span>${complete ? 'CHAMPION' : 'NEXT OPPONENT'}</span><strong>${complete ? (leagueChampion()?.name || 'TBD') : (opponent?.name || 'TBD')}</strong><small>${complete ? 'FINAL TABLE SETTLED' : `${opponent?.style || 'BALANCED'} · RATING ${opponent?.rating || 50}`}</small></div>
        <div><span>SEASON FORMAT</span><strong>38 MATCHES</strong><small>TOP 2 PROMOTED · 3 PTS/WIN</small></div>
      </div>
      <div class="league-operations-actions"><button data-team-route="league">VIEW LEAGUE</button>${!complete ? `<button class="primary" data-league-action="play-league" ${leagueLocked ? 'disabled' : ''}>${!leagueDue ? `MATCH IN ${clubDaysUntilFixture()} DAY${clubDaysUntilFixture() === 1 ? '' : 'S'}` : 'PLAY LEAGUE FIXTURE'}</button>` : `<button class="primary" data-league-action="next-season" ${pauseMenu ? 'disabled' : ''}>START NEXT SEASON</button>`}<button data-league-action="play-exhibition" ${exhibitionLocked ? 'disabled' : ''}>${leagueDue ? 'LEAGUE FIXTURE REQUIRED' : 'PLAY EXHIBITION'}</button></div>
    </section>`;
  }

  function renderLeagueTableRows() {
    const tier = leagueDivisionTier();
    return leagueTable().map(row => {
      const clubCount = ensureLeagueState()?.clubs?.length || (LEAGUE_RIVAL_TEMPLATES.length + 1);
      const movementClass = tier > 0 && row.position <= 2 ? 'promotion' : (tier < 3 && row.position >= clubCount - 1 ? 'relegation' : '');
      const movementLabel = movementClass === 'promotion' ? 'PROMOTION' : movementClass === 'relegation' ? 'RELEGATION' : '';
      const strengthStars = typeof leagueStrengthStars === 'function' ? leagueStrengthStars(row.rating) : null;
      return `<div class="league-table-row ${row.id === LEAGUE_USER_CLUB_ID ? 'user' : ''} ${movementClass}">
        <span class="position">${row.position}</span><span class="club"><strong>${escapeCareerHtml(row.name)}</strong><small>RATING ${row.rating}${strengthStars ? ` · ${strengthStars.toFixed(1)}★` : ''}${movementLabel ? ` · ${movementLabel}` : ''}</small></span><span>${row.played}</span><span>${row.wins}</span><span>${row.losses}</span><span>${row.roundDifference >= 0 ? '+' : ''}${row.roundDifference}</span><span class="form">${leagueFormMarkup(row.form)}</span><strong class="points">${row.points}</strong>
      </div>`;
    }).join('');
  }

  function renderLeaguePyramid() {
    const currentTier = leagueDivisionTier();
    return `<section class="league-pyramid-panel"><div class="career-section-head compact"><div><span>COMPETITION PYRAMID</span><strong>ROAD TO THE PRO LEAGUE</strong></div><p>Finish in the top two to move up. The bottom two are relegated above Division 3.</p></div><div class="league-pyramid">${[0,1,2,3].map(tier => {
      const division = leagueDivisionDefinition(tier);
      const current = tier === currentTier;
      const locked = tier < currentTier;
      return `<div class="${current ? 'current' : ''} ${locked ? 'locked' : ''}"><span>${tier === 0 ? 'TOP TIER' : `TIER ${4 - tier}`}</span><strong>${escapeCareerHtml(division.name)}</strong><small>${current ? 'CURRENT COMPETITION' : locked ? 'PROMOTION REQUIRED' : 'LOWER DIVISION'}</small></div>`;
    }).join('')}</div></section>`;
  }

  function renderLeagueFixtures() {
    const league = ensureLeagueState();
    const current = leagueNextFixture()?.matchday || leagueSeasonMatchCount(league.clubs.length);
    return Array.from({ length: leagueSeasonMatchCount(league.clubs.length) }, (_, index) => index + 1).map(matchday => {
      const fixture = league.fixtures.find(item => item.matchday === matchday && (item.homeId === LEAGUE_USER_CLUB_ID || item.awayId === LEAGUE_USER_CLUB_ID));
      const home = leagueClubById(fixture.homeId);
      const away = leagueClubById(fixture.awayId);
      const state = fixture.played ? 'played' : (matchday === current ? 'next' : 'future');
      const score = fixture.played ? `${fixture.homeScore} — ${fixture.awayScore}` : (matchday === current ? 'NEXT' : 'SCHEDULED');
      return `<article class="league-fixture ${state}"><span>MATCHDAY ${matchday}</span><div><strong>${escapeCareerHtml(home.name)}</strong><b>${score}</b><strong>${escapeCareerHtml(away.name)}</strong></div><small>${fixture.played ? (fixture.winnerId === LEAGUE_USER_CLUB_ID ? 'WIN' : 'LOSS') : (matchday === current ? 'REVIEW ACTIVE OPERATORS' : 'UPCOMING')}</small></article>`;
    }).join('');
  }

  function renderLeagueTab() {
    const league = ensureLeagueState();
    if (!league) return renderCareerCreationTab();
    const table = leagueTable();
    const user = table.find(row => row.id === LEAGUE_USER_CLUB_ID);
    const fixture = leagueNextFixture();
    const opponent = leagueClubById(leagueFixtureOpponentId(fixture));
    const complete = !fixture;
    const leagueDue = typeof clubLeagueMatchDue === 'function' ? clubLeagueMatchDue() : true;
    const matchAlreadyPlayed = typeof clubCanPlayMatchToday === 'function' ? !clubCanPlayMatchToday() : false;
    const leagueLocked = menuContext === 'pause' || !careerSquadReady() || !leagueDue || matchAlreadyPlayed;
    const exhibitionLocked = menuContext === 'pause' || !careerSquadReady() || leagueDue || matchAlreadyPlayed;
    const keyPlayer = opponent?.roster?.slice().sort((a, b) => teamPlayerOverall(b) - teamPlayerOverall(a))[0] || null;
    const positionLabel = user?.played ? user.position : '—';
    return `${renderLeagueIntroduction()}
      <nav class="league-section-jumps" aria-label="League page sections"><button type="button" data-team-scroll-target="#leagueOverview">OVERVIEW</button><button type="button" data-team-scroll-target="#leagueObjectives">OBJECTIVES</button><button type="button" data-team-scroll-target="#leaguePulse">PULSE</button><button type="button" data-team-scroll-target="#leagueTable">TABLE</button><button type="button" data-team-scroll-target="#leagueFixtures">FIXTURES</button></nav>
      <div id="leagueOverview" class="menu-hero career-hero league-hero"><div class="menu-hero-main menu-briefing-panel"><div class="menu-kicker">${escapeCareerHtml(leagueCompetitionName())} · SEASON ${league.season}</div><h2>${complete ? 'FINAL TABLE' : `MATCHDAY ${fixture.matchday} · ${escapeCareerHtml(opponent?.name || 'TBD')}`}</h2><p>${complete ? 'The season is complete. Review the final standings, then begin a new campaign when the squad is ready.' : 'Play one scheduled fixture at a time. A match win earns three points; the highest total after 38 fixtures wins the division.'}</p><div class="menu-pill-row"><span class="menu-pill">POSITION ${positionLabel} / ${league.clubs.length}</span><span class="menu-pill">${user?.points || 0} POINTS</span><span class="menu-pill">${user?.played || 0} / ${leagueSeasonMatchCount(league.clubs.length)} PLAYED</span><span class="menu-pill">ROUND DIFF ${user?.roundDifference >= 0 ? '+' : ''}${user?.roundDifference || 0}</span></div></div><div class="menu-hero-side"><div class="menu-kicker">${complete ? 'SEASON WINNER' : 'NEXT OPPONENT'}</div><div class="menu-side-operator">${complete ? escapeCareerHtml(leagueChampion()?.short || 'TBD') : escapeCareerHtml(opponent?.short || 'TBD')}</div><p>${complete ? escapeCareerHtml(leagueChampion()?.name || 'Finalising') : `${escapeCareerHtml(opponent?.style || 'BALANCED')} · RATING ${opponent?.rating || 50}${typeof leagueStrengthStars === 'function' ? ` · ${leagueStrengthStars(opponent?.rating || 50).toFixed(1)}★` : ''}`}</p></div></div>
      ${renderLeaguePyramid()}
      <div id="leagueObjectives">${typeof renderBoardExpectations === 'function' ? renderBoardExpectations(false) : ''}</div>
      <div id="leaguePulse">${typeof renderWorldPressLeaguePulse === 'function' ? renderWorldPressLeaguePulse() : ''}</div>
      <section id="leagueTable" class="league-table-panel"><div class="career-section-head"><div><span>LIVE STANDINGS</span><strong>${escapeCareerHtml(leagueCompetitionName())} TABLE</strong></div><p>Wins are worth ${LEAGUE_POINTS_WIN} points. Round difference breaks ties.</p></div><div class="league-table-head"><span>#</span><span>CLUB</span><span>P</span><span>W</span><span>L</span><span>RD</span><span>FORM</span><span>PTS</span></div>${renderLeagueTableRows()}</section>
      <div class="league-detail-grid">
        <section class="league-opponent-panel" ${complete ? 'data-management-target-id="league:season-transition"' : ''}><div class="career-section-head compact"><div><span>${complete ? 'SEASON STATUS' : 'OPPOSITION BRIEF'}</span><strong>${complete ? 'CAMPAIGN COMPLETE' : escapeCareerHtml(opponent?.name || 'TBD')}</strong></div></div>${complete ? `<p>The final table has been settled. Starting a new season keeps persistent clubs and squads while generating a fresh fixture order.</p><button class="primary" data-league-action="next-season" ${menuContext === 'pause' ? 'disabled' : ''}>START SEASON ${league.season + 1}</button>` : `<div class="league-opponent-facts"><div><span>STYLE</span><strong>${escapeCareerHtml(opponent?.style || 'BALANCED')}</strong></div><div><span>CLUB RATING</span><strong>${opponent?.rating || 50}${typeof leagueStrengthStars === 'function' ? ` · ${leagueStrengthStars(opponent?.rating || 50).toFixed(1)}★` : ''}</strong></div><div><span>KEY PLAYER</span><strong>${escapeCareerHtml(keyPlayer?.name || 'UNKNOWN')}</strong></div><div><span>KEY ROLE</span><strong>${teamRoleById(keyPlayer?.role).name}</strong></div></div><p>${escapeCareerHtml(opponent?.styleDetail || 'Opponent scouting is incomplete.')}</p><div class="league-match-actions"><button class="primary" data-league-action="play-league" ${leagueLocked ? 'disabled' : ''}>${!leagueDue ? `MATCH IN ${clubDaysUntilFixture()} DAY${clubDaysUntilFixture() === 1 ? '' : 'S'}` : 'PLAY LEAGUE FIXTURE'}</button><button data-league-action="play-exhibition" ${exhibitionLocked ? 'disabled' : ''}>${leagueDue ? 'LEAGUE FIXTURE REQUIRED' : 'PLAY EXHIBITION'}</button></div>${!careerSquadReady() ? '<small class="league-lock-note">Recruit five starters before entering a fixture.</small>' : ''}`}</section>
        <section id="leagueFixtures" class="league-fixture-panel"><div class="career-section-head compact"><div><span>SEASON CALENDAR</span><strong>YOUR FIXTURES</strong></div></div><div class="league-fixture-list">${renderLeagueFixtures()}</div></section>
      </div>`;
  }

  function handleLeagueClick(event) {
    const actionButton = event.target.closest('[data-league-action]');
    if (!actionButton) return false;
    const action = actionButton.dataset.leagueAction;
    const league = ensureLeagueState();
    if (!league) return true;
    if (action === 'dismiss-intro') {
      league.introSeen = true;
      saveCareerState();
      updateMenuUI();
    } else if (action === 'play-league') {
      if (!careerSquadReady()) setMenuRoute('market');
      else startNewMatch('league');
    } else if (action === 'play-exhibition') {
      if (!careerSquadReady()) setMenuRoute('market');
      else startNewMatch('exhibition');
    } else if (action === 'next-season') {
      if (!startNextLeagueSeason()) showStatus('NEXT SEASON NOT AVAILABLE');
      else showStatus(`SEASON ${league.season} CREATED`);
    }
    return true;
  }

  ensureLeagueState();
