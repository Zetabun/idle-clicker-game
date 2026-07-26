/*
 * Strikewatch source module: 39-recruitment-commercial.js
 * Purpose: Scouting uncertainty, shortlists, recruitment assignments, transfer windows,
 * AI market activity, player contract promises and commercial sponsorships.
 *
 * This file shares application scope with the other source fragments.
 * Run `python3 build.py` to regenerate the development bundle and standalone.
 */

  const RECRUITMENT_STATE_VERSION = 1;
  const SPONSORSHIP_STATE_VERSION = 1;
  const RECRUITMENT_MAX_ASSIGNMENTS = 3;
  const RECRUITMENT_REPORT_CAP = 100;
  const RECRUITMENT_ASSIGNMENT_DAYS = 3;
  const SPONSOR_ROUND_BUMPER_DELAY = 1.50;
  const SPONSOR_ROUND_BUMPER_DURATION = 5.00;
  const SPONSOR_ROUND_BUMPER_TAIL = 0.25;
  const sponsorRoundBumperState = { phase: 'idle', timer: 0, brandId: null, nextRound: 0 };

  const RECRUITMENT_TEAM_FUNCTIONS = Object.freeze([
    { id: 'opening', label: 'OPENING FIGHTS', short: 'Start fights', roles: ['entry'], attributes: ['mobility','handling'], missing: 'No reliable fight starter' },
    { id: 'trading', label: 'TRADE & SUPPORT', short: 'Follow and trade', roles: ['support'], attributes: ['awareness','handling'], missing: 'Limited follow-up and trade support' },
    { id: 'holding', label: 'HOLDING GROUND', short: 'Hold key space', roles: ['anchor'], attributes: ['resilience','awareness'], missing: 'No reliable ground holder' },
    { id: 'angles', label: 'ALTERNATE ANGLES', short: 'Create side pressure', roles: ['flanker'], attributes: ['mobility','awareness'], missing: 'No natural alternate-route threat' },
    { id: 'range', label: 'LONG-RANGE CONTROL', short: 'Control sightlines', roles: ['marksman'], attributes: ['marksmanship','awareness'], missing: 'Limited long-range control' },
    { id: 'coordination', label: 'COORDINATION', short: 'Read and organise', roles: ['caller'], attributes: ['awareness','resilience'], missing: 'No clear in-round coordinator' }
  ]);
  let recruitmentComparisonIds = [];
  let recruitmentLastSigningUpdate = null;
  let recruitmentBeginnerExpanded = false;
  let recruitmentComparisonExpanded = false;
  let recruitmentFlippedIds = new Set();
  let recruitmentExpandedReportIds = new Set();
  let recruitmentCarouselActiveId = '';
  let recruitmentCarouselScrollFrame = 0;

  const RECRUITMENT_AGE_BANDS = Object.freeze({
    any: { id: 'any', label: 'ANY AGE', min: 18, max: 36 },
    prospect: { id: 'prospect', label: '18–23', min: 18, max: 23 },
    prime: { id: 'prime', label: '24–29', min: 24, max: 29 },
    veteran: { id: 'veteran', label: '30+', min: 30, max: 36 }
  });

  const RECRUITMENT_ABILITY_BANDS = Object.freeze({
    any: { id: 'any', label: 'ANY LEVEL', min: 0 },
    depth: { id: 'depth', label: 'DEPTH OPTION', min: 38 },
    starter: { id: 'starter', label: 'STARTER QUALITY', min: 50 },
    elite: { id: 'elite', label: 'ELITE TARGET', min: 64 }
  });

  const SPONSOR_BRANDS = Object.freeze([
    {
      id: 'aegis', name: 'AEGIS DYNAMICS', short: 'AEGIS', logo: 'AD', className: 'aegis',
      strapline: 'SECURE THE ADVANTAGE', minReputation: 8, baseUpfront: 18000, baseWeekly: 7200,
      baseWinBonus: 2600, baseSweepBonus: 1800, duration: [8, 12],
      profile: 'Security technology partner offering dependable weekly income and a modest win bonus.'
    },
    {
      id: 'voltrush', name: 'VOLTRUSH ENERGY', short: 'VOLTRUSH', logo: 'VR', className: 'voltrush',
      strapline: 'PLAY AT FULL CHARGE', minReputation: 14, baseUpfront: 12000, baseWeekly: 5200,
      baseWinBonus: 6200, baseSweepBonus: 3200, duration: [6, 10],
      profile: 'Performance-heavy agreement with lower guaranteed money and strong victory incentives.'
    },
    {
      id: 'northstar', name: 'NORTHSTAR FINANCE', short: 'NORTHSTAR', logo: 'N★', className: 'northstar',
      strapline: 'BACKING THE NEXT ERA', minReputation: 28, baseUpfront: 32000, baseWeekly: 9800,
      baseWinBonus: 3200, baseSweepBonus: 2200, duration: [10, 14],
      profile: 'Premium long-term backing aimed at established clubs with strong reputation.'
    },
    {
      id: 'redline', name: 'REDLINE MOBILE', short: 'REDLINE', logo: 'RM', className: 'redline',
      strapline: 'STAY CONNECTED. STAY AHEAD.', minReputation: 18, baseUpfront: 22000, baseWeekly: 7600,
      baseWinBonus: 4000, baseSweepBonus: 2500, duration: [8, 12],
      profile: 'Balanced digital partnership with a healthy signing payment and consistent bonuses.'
    },
    {
      id: 'ironclad', name: 'IRONCLAD GEAR', short: 'IRONCLAD', logo: 'IG', className: 'ironclad',
      strapline: 'BUILT FOR THE HARD ROUNDS', minReputation: 10, baseUpfront: 15000, baseWeekly: 6000,
      baseWinBonus: 3200, baseSweepBonus: 7000, duration: [7, 11],
      profile: 'Equipment sponsor paying its best bonuses for dominant first-to-three victories.'
    }
  ]);

  function recruitmentAssignmentLimit() {
    const bonus = typeof clubInfrastructureAssignmentLimitBonus === 'function' ? clubInfrastructureAssignmentLimitBonus() : 0;
    return RECRUITMENT_MAX_ASSIGNMENTS + Math.max(0, Math.round(Number(bonus) || 0));
  }

  function recruitmentState() {
    careerState.recruitment = careerState.recruitment && typeof careerState.recruitment === 'object' ? careerState.recruitment : {};
    const state = careerState.recruitment;
    state.version = RECRUITMENT_STATE_VERSION;
    state.sequence = Math.max(0, Math.round(Number(state.sequence) || 0));
    state.view = ['market','shortlist','assignments'].includes(state.view) ? state.view : 'market';

    if (!Array.isArray(state.shortlistIds)) state.shortlistIds = [];
    const shortlistIds = Array.from(new Set(state.shortlistIds.map(String))).slice(0, 30);
    state.shortlistIds.splice(0, state.shortlistIds.length, ...shortlistIds);

    if (!state.reports || typeof state.reports !== 'object' || Array.isArray(state.reports)) state.reports = {};

    if (!Array.isArray(state.assignments)) state.assignments = [];
    state.assignments.splice(recruitmentAssignmentLimit() + 5);
    for (let index = 0; index < state.assignments.length; index++) {
      if (!state.assignments[index] || typeof state.assignments[index] !== 'object') state.assignments[index] = {};
    }

    if (!state.assignmentDraft || typeof state.assignmentDraft !== 'object') state.assignmentDraft = {};
    state.assignmentDraft.roleId = TEAM_ROLES.some(role => role.id === state.assignmentDraft.roleId) ? state.assignmentDraft.roleId : 'any';
    state.assignmentDraft.ageBand = RECRUITMENT_AGE_BANDS[state.assignmentDraft.ageBand] ? state.assignmentDraft.ageBand : 'any';
    state.assignmentDraft.abilityBand = RECRUITMENT_ABILITY_BANDS[state.assignmentDraft.abilityBand] ? state.assignmentDraft.abilityBand : 'any';

    if (!Array.isArray(state.aiActivity)) state.aiActivity = [];
    state.aiActivity.splice(18);
    for (let index = 0; index < state.aiActivity.length; index++) {
      if (!state.aiActivity[index] || typeof state.aiActivity[index] !== 'object') state.aiActivity[index] = {};
    }

    state.lastProcessedDay = Number.isFinite(Number(state.lastProcessedDay)) ? Math.round(Number(state.lastProcessedDay)) : -1;
    state.lastAssignmentMailDay = Number.isFinite(Number(state.lastAssignmentMailDay)) ? Math.round(Number(state.lastAssignmentMailDay)) : -4;
    return state;
  }

  function sponsorshipState() {
    careerState.sponsorship = careerState.sponsorship && typeof careerState.sponsorship === 'object' ? careerState.sponsorship : {};
    const state = careerState.sponsorship;
    state.version = SPONSORSHIP_STATE_VERSION;
    state.sequence = Math.max(0, Math.round(Number(state.sequence) || 0));
    if (state.active && typeof state.active !== 'object') state.active = null;
    if (!Array.isArray(state.offers)) state.offers = [];
    state.offers.splice(5);
    for (let index = 0; index < state.offers.length; index++) {
      if (!state.offers[index] || typeof state.offers[index] !== 'object') state.offers[index] = {};
    }
    if (!Array.isArray(state.history)) state.history = [];
    state.history.splice(20);
    for (let index = 0; index < state.history.length; index++) {
      if (!state.history[index] || typeof state.history[index] !== 'object') state.history[index] = {};
    }
    state.lastOfferDay = Number.isFinite(Number(state.lastOfferDay)) ? Math.round(Number(state.lastOfferDay)) : -7;
    state.lastWeeklyPaidWeek = Math.max(0, Math.round(Number(state.lastWeeklyPaidWeek) || 0));
    return state;
  }

  function sponsorBrand(id) {
    return SPONSOR_BRANDS.find(brand => brand.id === id) || null;
  }

  function recruitmentNextId(prefix = 'SC') {
    const state = recruitmentState();
    state.sequence++;
    return `${prefix}-${state.sequence}`;
  }

  function sponsorshipNextId(prefix = 'SP') {
    const state = sponsorshipState();
    state.sequence++;
    return `${prefix}-${state.sequence}`;
  }

  function recruitmentScoutQuality() {
    const assistant = typeof clubAssistantManager === 'function' ? clubAssistantManager() : null;
    const assistantScore = assistant ? (Number(assistant.judgingAbility) || 1) * 4.2 + (Number(assistant.judgingPotential) || 1) * 3.8 : 20;
    const analysis = Number(careerState.teamBenefits?.analysis) || 0;
    const infrastructure = typeof clubInfrastructureRecruitmentQualityBonus === 'function' ? clubInfrastructureRecruitmentQualityBonus() : 0;
    return clamp(Math.round(assistantScore + analysis * 5 + infrastructure), 20, 100);
  }

  function recruitmentInitialKnowledge(player) {
    const seed = teamSeedFromString(`${player?.id || 'unknown'}:${careerState.name}:scouting`);
    const random = teamRng(seed);
    const quality = recruitmentScoutQuality();
    const infrastructure = typeof clubInfrastructureInitialKnowledgeBonus === 'function' ? clubInfrastructureInitialKnowledgeBonus() : 0;
    return clamp(Math.round(18 + quality * 0.28 + random() * 18 + infrastructure), 22, 76);
  }

  function recruitmentReport(playerOrId) {
    const player = typeof playerOrId === 'string' ? transferMarketPlayer(playerOrId) : playerOrId;
    if (!player) return null;
    const state = recruitmentState();
    const previous = state.reports[player.id] && typeof state.reports[player.id] === 'object' ? state.reports[player.id] : {};
    const knowledge = clamp(Math.round(Number(previous.knowledge) || recruitmentInitialKnowledge(player)), 0, RECRUITMENT_REPORT_CAP);
    const report = {
      playerId: player.id,
      knowledge,
      lastUpdatedDay: Number.isFinite(Number(previous.lastUpdatedDay)) ? Math.round(Number(previous.lastUpdatedDay)) : clubCalendarState().absoluteDay,
      source: String(previous.source || 'NETWORK OVERVIEW'),
      timesObserved: Math.max(0, Math.round(Number(previous.timesObserved) || 0))
    };
    state.reports[player.id] = report;
    return report;
  }

  function recruitmentKnowledge(player) {
    return recruitmentReport(player)?.knowledge || 0;
  }

  function recruitmentObservePlayer(player, amount = 4, source = 'DOSSIER REVIEW') {
    if (!player || (careerState.squad || []).some(item => item.id === player.id)) return 100;
    const report = recruitmentReport(player);
    report.knowledge = clamp(report.knowledge + Math.max(0, Math.round(Number(amount) || 0)), 0, 100);
    report.lastUpdatedDay = clubCalendarState().absoluteDay;
    report.source = source;
    report.timesObserved++;
    return report.knowledge;
  }

  function recruitmentEstimateRange(value, knowledge, minValue = 0, maxValue = 100, integer = true) {
    const uncertainty = Math.max(0, 1 - clamp(knowledge, 0, 100) / 100);
    const spread = Math.max(integer ? 1 : 0.1, (maxValue - minValue) * (0.03 + uncertainty * 0.18));
    const seedOffset = ((Number(value) || 0) * 0.37 + knowledge * 0.11) % 1;
    let low = clamp((Number(value) || 0) - spread * (0.65 + seedOffset * 0.35), minValue, maxValue);
    let high = clamp((Number(value) || 0) + spread * (0.65 + (1 - seedOffset) * 0.35), minValue, maxValue);
    if (integer) {
      low = Math.max(minValue, Math.floor(low));
      high = Math.min(maxValue, Math.ceil(high));
    } else {
      low = Number(low.toFixed(1));
      high = Number(high.toFixed(1));
    }
    return { low, high };
  }

  function recruitmentNumericDisplay(value, knowledge, minValue = 0, maxValue = 100, suffix = '') {
    if (knowledge >= 88) return `${Math.round(Number(value) || 0)}${suffix}`;
    const range = recruitmentEstimateRange(value, knowledge, minValue, maxValue, true);
    return `${range.low}–${range.high}${suffix}`;
  }

  function recruitmentMoneyDisplay(value, knowledge) {
    if (knowledge >= 72) return teamCredits(value);
    const range = recruitmentEstimateRange(value, knowledge, 0, Math.max(500000, Number(value) * 2), true);
    const round = amount => Math.max(1000, Math.round(amount / 1000) * 1000);
    return `${teamCredits(round(range.low))}–${teamCredits(round(range.high))}`;
  }

  function recruitmentAbilityDisplay(player, potential = false) {
    const knowledge = recruitmentKnowledge(player);
    const value = potential ? Number(player?.potential) || 0 : teamPlayerOverall(player);
    return recruitmentNumericDisplay(value, knowledge, 0, 100);
  }

  function recruitmentAbilityStars(player, potential = false) {
    const knowledge = recruitmentKnowledge(player);
    const value = potential ? Number(player?.potential) || 0 : teamPlayerOverall(player);
    const estimated = knowledge >= 88
      ? value
      : (() => {
          const range = recruitmentEstimateRange(value, knowledge, 0, 100, true);
          return (range.low + range.high) * 0.5;
        })();
    return clubAbilityStarsFromRating(estimated, potential);
  }

  function recruitmentStarsMarkup(player, potential = false) {
    const knowledge = recruitmentKnowledge(player);
    const label = `${knowledge >= 88 ? 'CONFIRMED' : 'EST.'} ${potential ? 'POTENTIAL' : 'ABILITY'}`;
    return clubStarsMarkup(recruitmentAbilityStars(player, potential), label, potential ? 'potential' : '');
  }

  function recruitmentTraitVisibility(player) {
    const knowledge = recruitmentKnowledge(player);
    if (knowledge >= 78) return player.traits || [];
    if (knowledge >= 52) return (player.traits || []).slice(0, 1);
    return [];
  }

  function recruitmentPersonalityDisplay(player) {
    const knowledge = recruitmentKnowledge(player);
    if (knowledge >= 68) return player.personality;
    if (knowledge >= 42) return 'Personality assessment pending';
    return 'Unknown personality';
  }

  function recruitmentMedicalDisplay(player) {
    const knowledge = recruitmentKnowledge(player);
    if (knowledge >= 75) return `${player.injuryVulnerability}% · ${typeof playerVulnerabilityLabel === 'function' ? playerVulnerabilityLabel(player) : 'ASSESSED'}`;
    if (knowledge >= 48) return 'Preliminary medical risk available';
    return 'Medical checks not completed';
  }

  function recruitmentShortlisted(playerId) {
    return recruitmentState().shortlistIds.includes(String(playerId));
  }

  function toggleRecruitmentShortlist(playerId) {
    const state = recruitmentState();
    const id = String(playerId || '');
    if (!transferMarketPlayer(id)) return false;
    if (state.shortlistIds.includes(id)) state.shortlistIds = state.shortlistIds.filter(item => item !== id);
    else state.shortlistIds.unshift(id);
    saveCareerState();
    updateMenuUI();
    return state.shortlistIds.includes(id);
  }

  function recruitmentSetView(view) {
    const state = recruitmentState();
    if (!['market','shortlist','assignments'].includes(view)) return false;
    state.view = view;
    saveCareerState();
    updateMenuUI();
    return true;
  }

  function recruitmentAssignmentMatches(player, assignment) {
    const ageBand = RECRUITMENT_AGE_BANDS[assignment.ageBand] || RECRUITMENT_AGE_BANDS.any;
    const abilityBand = RECRUITMENT_ABILITY_BANDS[assignment.abilityBand] || RECRUITMENT_ABILITY_BANDS.any;
    const roleMatch = assignment.roleId === 'any' || player.role === assignment.roleId || player.secondaryRole === assignment.roleId;
    return roleMatch && player.age >= ageBand.min && player.age <= ageBand.max && teamPlayerOverall(player) >= abilityBand.min;
  }

  function recruitmentStartAssignment(roleId = 'any', ageBand = 'any', abilityBand = 'any') {
    const state = recruitmentState();
    if (state.assignments.filter(item => item.status === 'active').length >= recruitmentAssignmentLimit()) return { ok: false, reason: `Only ${recruitmentAssignmentLimit()} assignments can run at once.` };
    const assignment = {
      id: recruitmentNextId('ASG'),
      roleId: roleId === 'any' || TEAM_ROLES.some(role => role.id === roleId) ? roleId : 'any',
      ageBand: RECRUITMENT_AGE_BANDS[ageBand] ? ageBand : 'any',
      abilityBand: RECRUITMENT_ABILITY_BANDS[abilityBand] ? abilityBand : 'any',
      startedDay: clubCalendarState().absoluteDay,
      daysRemaining: RECRUITMENT_ASSIGNMENT_DAYS,
      status: 'active',
      resultIds: []
    };
    state.assignments.unshift(assignment);
    saveCareerState();
    updateMenuUI();
    return { ok: true, assignment };
  }

  function recruitmentCancelAssignment(id) {
    const state = recruitmentState();
    const assignment = state.assignments.find(item => item.id === id);
    if (!assignment || assignment.status !== 'active') return false;
    assignment.status = 'cancelled';
    saveCareerState();
    updateMenuUI();
    return true;
  }

  function recruitmentProcessAssignments(day) {
    const state = recruitmentState();
    if (state.lastProcessedDay >= day) return;
    const quality = recruitmentScoutQuality();
    for (const playerId of state.shortlistIds) {
      const player = transferMarketPlayer(playerId);
      if (player) recruitmentObservePlayer(player, 2 + Math.floor(quality / 28), 'SHORTLIST MONITORING');
    }
    for (const assignment of state.assignments) {
      if (assignment.status !== 'active') continue;
      const progressDays = typeof clubInfrastructureAssignmentProgress === 'function' ? clubInfrastructureAssignmentProgress() : 1;
      assignment.daysRemaining = Math.max(0, Math.round(Number(assignment.daysRemaining) || 0) - Math.max(1, progressDays));
      const matches = (careerState.market || []).filter(player => recruitmentAssignmentMatches(player, assignment));
      const sorted = matches.sort((a, b) => teamPlayerOverall(b) - teamPlayerOverall(a) || b.potential - a.potential);
      const daily = sorted.slice(0, Math.max(2, Math.round(quality / 24)));
      for (const player of daily) recruitmentObservePlayer(player, 9 + Math.round(quality / 12), 'RECRUITMENT ASSIGNMENT');
      if (assignment.daysRemaining <= 0) {
        assignment.status = 'complete';
        assignment.resultIds = sorted.slice(0, 5).map(player => player.id);
        const roleLabel = assignment.roleId === 'any' ? 'all roles' : teamRoleById(assignment.roleId).name;
        clubAddMail('Recruitment assignment complete', `The recruitment team completed its search for ${roleLabel.toLowerCase()} candidates. ${assignment.resultIds.length} recommended players are ready to review.`, 'RECRUITMENT', true, 'market');
      }
    }
    state.assignments = state.assignments.slice(0, recruitmentAssignmentLimit() + 5);
    state.lastProcessedDay = day;
  }

  function recruitmentUserLeagueFixtures() {
    const league = typeof ensureLeagueState === 'function' ? ensureLeagueState() : careerState.league;
    return Array.isArray(league?.fixtures)
      ? league.fixtures.filter(fixture => fixture.homeId === LEAGUE_USER_CLUB_ID || fixture.awayId === LEAGUE_USER_CLUB_ID)
      : [];
  }

  function recruitmentTransferWindowStatus() {
    const fixtures = recruitmentUserLeagueFixtures();
    const completed = fixtures.length
      ? fixtures.filter(fixture => fixture.played).length
      : Math.max(0, Number(careerState.totalMatches) || 0);
    const seasonComplete = typeof leagueSeasonComplete === 'function' && leagueSeasonComplete();
    const open = seasonComplete || completed <= 2 || completed >= 6;
    const phase = seasonComplete ? 'POST-SEASON' : completed <= 2 ? 'OPENING WINDOW' : completed >= 6 ? 'RUN-IN WINDOW' : 'CLOSED PERIOD';
    return { open, phase, completed, detail: open ? 'Permanent transfers may be registered.' : 'Only free agents may be signed until the run-in window.' };
  }

  function recruitmentTransferWindowOpenFor(player) {
    const freeAgent = String(player?.currentTeam || '').toLowerCase() === 'free agent';
    const academyProspect = Boolean(player?.clubAcademyProspect);
    return freeAgent || academyProspect || recruitmentTransferWindowStatus().open;
  }

  function recruitmentAddAiListing(player, clubName, day, state = recruitmentState(), market = careerState.market || []) {
    if (!player || market.some(item => item.id === player.id)) return false;
    if (market.length >= TEAM_MARKET_SIZE) {
      const removable = market
        .filter(item => !state.shortlistIds.includes(item.id) && !item.rivalBid && !item.clubAcademyProspect)
        .sort((a, b) => teamPlayerOverall(a) - teamPlayerOverall(b) || a.potential - b.potential)[0] || null;
      if (!removable) return false;
      const removeIndex = market.findIndex(item => item.id === removable.id);
      if (removeIndex >= 0) market.splice(removeIndex, 1);
      delete state.reports[removable.id];
    }
    const listed = normaliseGeneratedPlayer({
      ...player,
      currentTeam: clubName || player.currentTeam || 'Rival Club',
      fee: Math.max(5000, transferRoundMoney((Number(player.value) || playerMarketValue(player)) * 0.88)),
      value: playerMarketValue(player),
      rivalBid: null,
      joinedWeek: Math.max(0, Number(player.joinedWeek) || 0)
    }, `${player.id || 'AI'}-LIST-${day}`);
    listed.scoutingDivision = normaliseLeagueTier(careerState.league?.divisionTier);
    if (typeof dynamicMarketAnnotateClubListing === 'function') dynamicMarketAnnotateClubListing(listed, clubName, day);
    market.push(listed);
    recruitmentReport(listed);
    return true;
  }

  function recruitmentAiListingProcess(day, state, market) {
    const random = teamRng(teamSeedFromString(`${careerState.name}:${day}:ai-listing`));
    if (random() > 0.13) return null;
    const clubs = (typeof transferRivalClubs === 'function' ? transferRivalClubs() : [])
      .filter(club => Array.isArray(club.roster) && club.roster.length > TEAM_REQUIRED_STARTERS);
    if (!clubs.length) return null;
    const club = clubs[Math.floor(random() * clubs.length) % clubs.length];
    const candidates = club.roster.slice(TEAM_REQUIRED_STARTERS).length
      ? club.roster.slice(TEAM_REQUIRED_STARTERS)
      : club.roster.slice().sort((a, b) => teamPlayerOverall(a) - teamPlayerOverall(b)).slice(0, 1);
    const player = candidates[Math.floor(random() * candidates.length) % candidates.length] || null;
    if (!player) return null;
    const index = club.roster.findIndex(item => item.id === player.id);
    if (index < 0 || !recruitmentAddAiListing(player, club.name, day, state, market)) return null;
    club.roster.splice(index, 1);
    const activity = { id: recruitmentNextId('AI'), day, type: 'listed', playerName: player.name, clubName: club.name, playerId: player.id };
    state.aiActivity.unshift(activity);
    if (typeof dynamicMarketRecordAiActivity === 'function') dynamicMarketRecordAiActivity(activity);
    return activity;
  }

  function recruitmentAiMarketProcess(day) {
    const state = recruitmentState();
    const market = careerState.market || [];
    recruitmentAiListingProcess(day, state, market);
    for (const player of market) {
      if (!player.rivalBid || typeof player.rivalBid !== 'object') continue;
      if (Number(player.rivalBid.expiresDay) > day) continue;
      const random = teamRng(teamSeedFromString(`${player.id}:${day}:rival-resolution`));
      if (random() < 0.58) {
        const wasShortlisted = state.shortlistIds.includes(player.id);
        const clubName = player.rivalBid.clubName || 'a rival club';
        const index = market.findIndex(item => item.id === player.id);
        if (index >= 0) market.splice(index, 1);
        const buyingClub = typeof transferRivalClubByName === 'function' ? transferRivalClubByName(clubName) : null;
        if (buyingClub) {
          buyingClub.roster = Array.isArray(buyingClub.roster) ? buyingClub.roster : [];
          const signedPlayer = normaliseGeneratedPlayer({ ...player, currentTeam: buyingClub.name, joinedWeek: careerState.week }, `${buyingClub.id}-AI-${day}`);
          buyingClub.roster.push(signedPlayer);
          if (buyingClub.roster.length > TEAM_MAX_SQUAD) {
            buyingClub.roster.sort((a, b) => teamPlayerOverall(b) - teamPlayerOverall(a));
            const displaced = buyingClub.roster.splice(TEAM_MAX_SQUAD);
            for (const released of displaced) {
              if (recruitmentAddAiListing(released, buyingClub.name, day, state, market)) {
                state.aiActivity.unshift({ id: recruitmentNextId('AI'), day, type: 'listed', playerName: released.name, clubName: buyingClub.name });
              }
            }
          }
        }
        state.shortlistIds = state.shortlistIds.filter(id => id !== player.id);
        delete state.reports[player.id];
        const signedActivity = { id: recruitmentNextId('AI'), day, type: 'signed', playerName: player.name, playerId: player.id, clubName, amount: Number(player.rivalBid?.amount) || Number(player.fee) || 0 };
        state.aiActivity.unshift(signedActivity);
        if (typeof dynamicMarketRecordAiActivity === 'function') dynamicMarketRecordAiActivity(signedActivity);
        if (typeof dynamicMarketApplyRivalSigningCost === 'function') dynamicMarketApplyRivalSigningCost(buyingClub, player, signedActivity.amount);
        if (wasShortlisted) clubAddMail(`${player.name} joins ${clubName}`, `A rival club completed the signing before Strikewatch could make an offer. The player has been removed from your shortlist.`, 'RECRUITMENT', true, 'market');
      } else {
        const collapsedActivity = { id: recruitmentNextId('AI'), day, type: 'collapsed', playerName: player.name, playerId: player.id, clubName: player.rivalBid.clubName || 'Rival club' };
        state.aiActivity.unshift(collapsedActivity);
        if (typeof dynamicMarketRecordAiActivity === 'function') dynamicMarketRecordAiActivity(collapsedActivity);
        player.rivalBid = null;
      }
    }

    if (day - Number(state.lastProcessedDay) < 1 || market.length < 4) return;
    const random = teamRng(teamSeedFromString(`${careerState.name}:${day}:ai-market`));
    const chance = 0.22 + Math.min(0.18, leagueDivisionTier() * 0.025);
    if (random() > chance) return;
    const candidates = market.filter(player => !player.rivalBid && !player.clubAcademyProspect).sort((a, b) => teamPlayerOverall(b) + b.potential * 0.3 - (teamPlayerOverall(a) + a.potential * 0.3));
    const clubs = typeof transferRivalClubs === 'function' ? transferRivalClubs() : [];
    const intelligent = typeof dynamicMarketSelectRivalBid === 'function' ? dynamicMarketSelectRivalBid(candidates, clubs, day, random) : null;
    const player = intelligent?.player || candidates[Math.floor(random() * Math.min(8, candidates.length))];
    const club = intelligent?.club || (clubs.length ? clubs[Math.floor(random() * clubs.length)] : null);
    if (!player || !club) return;
    player.rivalBid = {
      clubId: club.id,
      clubName: club.name,
      amount: intelligent?.amount || transferRoundMoney((player.value || player.fee) * (0.86 + random() * 0.22)),
      expiresDay: day + 2,
      needRole: intelligent?.needRole || ''
    };
    const bidActivity = { id: recruitmentNextId('AI'), day, type: 'bid', playerName: player.name, playerId: player.id, clubName: club.name, amount: player.rivalBid.amount, needRole: player.rivalBid.needRole };
    state.aiActivity.unshift(bidActivity);
    if (typeof dynamicMarketRecordAiActivity === 'function') dynamicMarketRecordAiActivity(bidActivity);
    if (state.shortlistIds.includes(player.id)) clubAddMail(`Rival bid for ${player.name}`, `${club.name} have entered talks for a shortlisted target. Their bid is expected to be resolved within two days.`, 'RECRUITMENT', true, 'market');
  }

  function sponsorshipPerformanceScore() {
    const matches = Math.max(0, Number(careerState.totalMatches) || 0);
    const winRate = matches ? (Number(careerState.matchWins) || 0) / matches : 0.45;
    const recentResult = careerState.lastRound?.won ? 10 : 0;
    const reputation = clamp(Number(careerState.reputation) || 0, 0, 100);
    const tierBonus = (3 - normaliseLeagueTier(careerState.league?.divisionTier)) * 12;
    const commercial = (Number(careerState.teamBenefits?.commercial) || 0) * 4;
    const infrastructure = typeof clubInfrastructureSponsorScoreBonus === 'function' ? clubInfrastructureSponsorScoreBonus() : 0;
    return clamp(Math.round(reputation * 0.58 + winRate * 35 + tierBonus + commercial + infrastructure + recentResult), 8, 100);
  }

  function sponsorshipOfferQualityLabel(score) {
    if (score >= 82) return 'PREMIUM PARTNERSHIP';
    if (score >= 66) return 'MAJOR PARTNERSHIP';
    if (score >= 48) return 'ESTABLISHED PARTNERSHIP';
    return 'EMERGING CLUB PARTNERSHIP';
  }

  function sponsorshipGenerateOffers(force = false) {
    const state = sponsorshipState();
    const day = clubCalendarState().absoluteDay;
    if (state.active || state.offers.some(offer => offer.status === 'pending')) return [];
    if (!force && day - state.lastOfferDay < 4) return [];
    const score = sponsorshipPerformanceScore();
    const random = teamRng(teamSeedFromString(`${careerState.name}:${day}:${score}:sponsors`));
    const chance = clamp(0.18 + score / 135, 0.24, 0.84);
    if (!force && random() > chance) return [];
    const eligiblePool = SPONSOR_BRANDS.filter(brand => careerState.reputation >= brand.minReputation - 6).slice();
    for (let index = eligiblePool.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(random() * (index + 1));
      [eligiblePool[index], eligiblePool[swapIndex]] = [eligiblePool[swapIndex], eligiblePool[index]];
    }
    const eligible = eligiblePool.slice(0, score >= 68 ? 3 : 2);
    const facilityMultiplier = typeof clubInfrastructureOfferMultiplier === 'function' ? clubInfrastructureOfferMultiplier() : 1;
    const multiplier = (0.72 + score / 100 * 0.92) * facilityMultiplier;
    state.offers = eligible.map((brand, index) => {
      const duration = brand.duration[0] + Math.floor(random() * (brand.duration[1] - brand.duration[0] + 1));
      const variance = 0.92 + random() * 0.18;
      return {
        id: sponsorshipNextId('OFR'), brandId: brand.id, status: 'pending', createdDay: day,
        expiresDay: day + 3, durationWeeks: duration,
        upfront: transferRoundMoney(brand.baseUpfront * multiplier * variance),
        weekly: transferRoundMoney(brand.baseWeekly * multiplier * variance, 100),
        winBonus: transferRoundMoney(brand.baseWinBonus * multiplier * variance, 100),
        sweepBonus: transferRoundMoney(brand.baseSweepBonus * multiplier * variance, 100),
        quality: sponsorshipOfferQualityLabel(score), performanceScore: score, rank: index + 1
      };
    });
    state.lastOfferDay = day;
    if (state.offers.length) {
      clubAddMail('New sponsorship proposals', `${state.offers.length} commercial partners have submitted offers after reviewing the club's reputation and recent results. A decision is required before the proposals expire.`, 'COMMERCIAL', true, 'commercial');
    }
    return state.offers;
  }

  function sponsorshipPendingOffers() {
    const day = clubCalendarState().absoluteDay;
    return sponsorshipState().offers.filter(offer => offer.status === 'pending' && Number(offer.expiresDay) >= day);
  }

  function sponsorshipAcceptOffer(offerId) {
    const state = sponsorshipState();
    if (state.active) return { ok: false, reason: 'The club already has an active sponsor.' };
    const offer = state.offers.find(item => item.id === offerId && item.status === 'pending');
    const brand = offer ? sponsorBrand(offer.brandId) : null;
    if (!offer || !brand) return { ok: false, reason: 'This sponsorship offer is no longer available.' };
    const currentWeek = Math.max(1, Number(careerState.week) || 1);
    state.active = {
      ...offer,
      id: sponsorshipNextId('DEAL'),
      offerId: offer.id,
      status: 'active',
      acceptedDay: clubCalendarState().absoluteDay,
      startWeek: currentWeek,
      remainingWeeks: offer.durationWeeks,
      totalPaid: offer.upfront
    };
    const acceptedOffer = state.offers.find(item => item.id === offer.id);
    if (acceptedOffer) acceptedOffer.status = 'accepted';
    for (const other of state.offers) if (other.id !== offer.id && other.status === 'pending') other.status = 'declined';
    careerState.credits += offer.upfront;
    teamFinanceTransaction('SPONSOR', offer.upfront, `${brand.name} sponsorship signing payment`);
    state.history.unshift({ brandId: brand.id, acceptedDay: state.active.acceptedDay, durationWeeks: offer.durationWeeks, upfront: offer.upfront });
    clubAddMail(`${brand.name} partnership confirmed`, `${brand.name} has become the club's official broadcast partner. ${teamCredits(offer.upfront)} has been paid immediately and the logo will appear on the live spectator feed.`, 'COMMERCIAL', true, 'commercial');
    if (typeof supporterReactToSponsorship === 'function') supporterReactToSponsorship(brand, offer);
    saveCareerState();
    updateSponsorHud();
    updateMenuUI();
    return { ok: true, deal: state.active };
  }

  function sponsorshipRejectOffer(offerId) {
    const offer = sponsorshipState().offers.find(item => item.id === offerId && item.status === 'pending');
    if (!offer) return false;
    offer.status = 'declined';
    saveCareerState();
    updateMenuUI();
    return true;
  }

  function sponsorshipExpireOffers(day) {
    const state = sponsorshipState();
    let expired = 0;
    for (const offer of state.offers) {
      if (offer.status === 'pending' && Number(offer.expiresDay) < day) {
        offer.status = 'expired';
        expired++;
      }
    }
    if (expired) clubAddMail('Sponsorship proposals expired', `${expired} unanswered commercial proposal${expired === 1 ? ' has' : 's have'} been withdrawn.`, 'COMMERCIAL', false, 'commercial');
  }

  function sponsorshipWeeklyProcess() {
    const state = sponsorshipState();
    const deal = state.active;
    const week = Math.max(1, Number(careerState.week) || 1);
    if (!deal || deal.status !== 'active' || state.lastWeeklyPaidWeek >= week) return null;
    const brand = sponsorBrand(deal.brandId);
    if (!brand) return null;
    while (state.lastWeeklyPaidWeek < week) {
      state.lastWeeklyPaidWeek++;
      if (state.lastWeeklyPaidWeek <= deal.startWeek) continue;
      if (deal.remainingWeeks <= 0) break;
      careerState.credits += deal.weekly;
      deal.totalPaid = Math.max(0, Number(deal.totalPaid) || 0) + deal.weekly;
      deal.remainingWeeks--;
      teamFinanceTransaction('SPONSOR', deal.weekly, `${brand.name} weekly partnership payment`);
    }
    if (deal.remainingWeeks <= 0) {
      deal.status = 'complete';
      clubAddMail(`${brand.name} deal completed`, `The sponsorship term has ended after paying ${teamCredits(deal.totalPaid)}. Future offers will reflect the club's current performance and reputation.`, 'COMMERCIAL', true, 'commercial');
      state.history.unshift({ ...deal, completedWeek: week });
      state.active = null;
      state.lastOfferDay = clubCalendarState().absoluteDay - 3;
    }
    updateSponsorHud();
    return deal;
  }

  function sponsorshipMatchSettlement(won, summary) {
    const state = sponsorshipState();
    const deal = state.active;
    const brand = deal ? sponsorBrand(deal.brandId) : null;
    if (!deal || !brand || deal.status !== 'active') return 0;
    const blueScoreValue = Math.max(0, Number(summary?.blueScore) || 0);
    const redScoreValue = Math.max(0, Number(summary?.redScore) || 0);
    let bonus = won ? deal.winBonus : 0;
    if (won && redScoreValue === 0 && blueScoreValue >= 3) bonus += deal.sweepBonus;
    if (bonus > 0) {
      careerState.credits += bonus;
      deal.totalPaid = Math.max(0, Number(deal.totalPaid) || 0) + bonus;
      teamFinanceTransaction('SPONSOR', bonus, `${brand.name} ${redScoreValue === 0 ? 'win and sweep' : 'victory'} bonus`);
    }
    return bonus;
  }

  function sponsorshipProcessDay(day) {
    sponsorshipExpireOffers(day);
    const state = sponsorshipState();
    if (!state.active && !sponsorshipPendingOffers().length) sponsorshipGenerateOffers(false);
  }

  function sponsorLogoMarkup(brand, compact = false) {
    if (!brand) return '';
    return `<span class="sponsor-logo-mark ${escapeCareerHtml(brand.className)}"><b>${escapeCareerHtml(brand.logo)}</b><i>${escapeCareerHtml(brand.short)}</i>${compact ? '' : `<small>${escapeCareerHtml(brand.strapline)}</small>`}</span>`;
  }

  function sponsorshipActiveBrand() {
    const deal = sponsorshipState().active;
    return deal ? sponsorBrand(deal.brandId) : null;
  }

  function updateSponsorHud() {
    const el = document.getElementById('sponsorBug');
    if (!el) return;
    const brand = sponsorshipActiveBrand();
    el.hidden = !brand;
    el.className = `sponsor-bug${brand ? ` ${brand.className}` : ''}`;
    el.innerHTML = brand ? `<span>PARTNERS OF</span>${sponsorLogoMarkup(brand, true)}` : '';
    el.setAttribute('aria-label', brand ? `${brand.name}, official partner of ${careerState.name || 'the club'}` : 'No active sponsor');
  }

  function hideSponsorRoundBumper(clearState = true) {
    if (clearState) {
      sponsorRoundBumperState.phase = 'idle';
      sponsorRoundBumperState.timer = 0;
      sponsorRoundBumperState.brandId = null;
      sponsorRoundBumperState.nextRound = 0;
    }
    if (!sponsorRoundTransitionEl) return;
    sponsorRoundTransitionEl.classList.remove('show');
    sponsorRoundTransitionEl.hidden = true;
    sponsorRoundTransitionEl.setAttribute('aria-hidden', 'true');
  }

  function scheduleSponsorRoundBumper(nextRound = roundNumber + 1) {
    const brand = sponsorshipActiveBrand();
    if (!brand || !sponsorRoundTransitionEl || !sponsorRoundLogoEl) {
      hideSponsorRoundBumper();
      return false;
    }
    sponsorRoundBumperState.phase = 'waiting';
    sponsorRoundBumperState.timer = SPONSOR_ROUND_BUMPER_DELAY;
    sponsorRoundBumperState.brandId = brand.id;
    sponsorRoundBumperState.nextRound = Math.max(1, Math.round(Number(nextRound) || 1));
    sponsorRoundTransitionEl.className = `sponsor-round-transition ${brand.className}`;
    sponsorRoundTransitionEl.hidden = true;
    sponsorRoundTransitionEl.setAttribute('aria-hidden', 'true');
    sponsorRoundTransitionEl.setAttribute('aria-label', `${brand.name}, official match partner. Round ${sponsorRoundBumperState.nextRound} follows.`);
    sponsorRoundLogoEl.innerHTML = sponsorLogoMarkup(brand, false);
    if (sponsorRoundClubEl) sponsorRoundClubEl.textContent = String(careerState.name || 'YOUR CLUB').toUpperCase();
    if (sponsorRoundTitleEl) sponsorRoundTitleEl.textContent = `ROUND ${sponsorRoundBumperState.nextRound} BROADCAST`;
    return true;
  }

  function showSponsorRoundBumperNow() {
    const brand = sponsorBrand(sponsorRoundBumperState.brandId) || sponsorshipActiveBrand();
    if (!brand || !sponsorRoundTransitionEl) {
      hideSponsorRoundBumper();
      return false;
    }
    hideRoundResult();
    sponsorRoundBumperState.phase = 'showing';
    sponsorRoundBumperState.timer = SPONSOR_ROUND_BUMPER_DURATION;
    sponsorRoundTransitionEl.hidden = false;
    sponsorRoundTransitionEl.setAttribute('aria-hidden', 'false');
    sponsorRoundTransitionEl.classList.remove('show');
    void sponsorRoundTransitionEl.offsetWidth;
    sponsorRoundTransitionEl.classList.add('show');
    return true;
  }

  function updateSponsorRoundBumper(dt) {
    if (sponsorRoundBumperState.phase === 'idle') return;
    sponsorRoundBumperState.timer = Math.max(0, sponsorRoundBumperState.timer - Math.max(0, Number(dt) || 0));
    if (sponsorRoundBumperState.timer > 0) return;
    if (sponsorRoundBumperState.phase === 'waiting') {
      showSponsorRoundBumperNow();
      return;
    }
    hideSponsorRoundBumper();
  }

  function sponsorRoundBumperTotalDuration() {
    return SPONSOR_ROUND_BUMPER_DELAY + SPONSOR_ROUND_BUMPER_DURATION + SPONSOR_ROUND_BUMPER_TAIL;
  }

  function sponsorRoundBumperSnapshot() {
    return {
      phase: sponsorRoundBumperState.phase,
      timer: sponsorRoundBumperState.timer,
      brandId: sponsorRoundBumperState.brandId,
      nextRound: sponsorRoundBumperState.nextRound,
      visible: Boolean(sponsorRoundTransitionEl && !sponsorRoundTransitionEl.hidden && sponsorRoundTransitionEl.classList.contains('show')),
      label: sponsorRoundTransitionEl?.getAttribute('aria-label') || ''
    };
  }

  function renderRecruitmentToolbar(view = recruitmentState().view) {
    const state = recruitmentState();
    const shortlistCount = state.shortlistIds.filter(id => transferMarketPlayer(id)).length;
    const activeAssignments = state.assignments.filter(item => item.status === 'active').length;
    return `<nav class="recruitment-toolbar" aria-label="Recruitment department views">
      <button class="${view === 'market' ? 'active' : ''}" data-recruitment-view="market"><span>MARKET</span><small>${(careerState.market || []).length} PLAYERS</small></button>
      <button class="${view === 'shortlist' ? 'active' : ''}" data-recruitment-view="shortlist"><span>SHORTLIST</span><small>${shortlistCount} TRACKED</small></button>
      <button class="${view === 'assignments' ? 'active' : ''}" data-recruitment-view="assignments"><span>ASSIGNMENTS</span><small>${activeAssignments} ACTIVE</small></button>
    </nav>`;
  }

  function renderRecruitmentKnowledge(player) {
    const knowledge = recruitmentKnowledge(player);
    const explanation = 'Scouting confidence shows how reliable the displayed ability, potential, fee, wage and medical estimates are.';
    return `<span class="recruitment-knowledge ${knowledge >= 80 ? 'complete' : knowledge >= 55 ? 'developing' : ''}" title="${explanation}" aria-label="${knowledge}% scouting confidence. ${explanation}"><i aria-hidden="true"><b style="width:${knowledge}%"></b></i><small>${knowledge}% SCOUTING CONFIDENCE</small></span>`;
  }

  function recruitmentFunctionContribution(player, functionDef) {
    if (!player || !functionDef) return 0;
    const primary = String(player.role || 'flex');
    const secondary = String(player.secondaryRole || 'flex');
    let score = functionDef.roles.includes(primary) ? 1 : functionDef.roles.includes(secondary) ? 0.58 : 0;
    if (primary === 'flex') score = Math.max(score, 0.42);
    else if (secondary === 'flex') score = Math.max(score, 0.24);
    const values = functionDef.attributes.map(key => Number(player.stats?.[key]) || 0);
    const average = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
    if (average >= 7.5) score += 0.22;
    else if (average >= 6) score += 0.12;
    return clamp(score, 0, 1.25);
  }

  function recruitmentCompositionReport(squad = careerState.squad || []) {
    const players = Array.isArray(squad) ? squad.slice(0, TEAM_REQUIRED_STARTERS) : [];
    const functions = RECRUITMENT_TEAM_FUNCTIONS.map(item => {
      const score = players.reduce((sum, player) => sum + recruitmentFunctionContribution(player, item), 0);
      const state = score >= 0.84 ? 'covered' : score >= 0.34 ? 'partial' : 'missing';
      return { ...item, score, state };
    });
    return {
      players,
      functions,
      covered: functions.filter(item => item.state === 'covered'),
      partial: functions.filter(item => item.state === 'partial'),
      missing: functions.filter(item => item.state === 'missing')
    };
  }

  function recruitmentEstimatedDecisionValue(value, knowledge, minValue = 0, maxValue = 100) {
    if (knowledge >= 88) return Number(value) || 0;
    const range = recruitmentEstimateRange(value, knowledge, minValue, maxValue, true);
    return (Number(range.low) + Number(range.high)) * 0.5;
  }

  function recruitmentRelevantRoleAttributes(player, role = teamRoleById(player?.role), knowledge = recruitmentKnowledge(player)) {
    const guide = teamRoleBeginnerGuide(role.id);
    const labels = guide.lookFor === 'BALANCED ATTRIBUTES'
      ? ['MARKSMANSHIP', 'HANDLING', 'AWARENESS', 'MOBILITY', 'RESILIENCE']
      : guide.lookFor.split(' · ');
    const keys = { MARKSMANSHIP: 'marksmanship', HANDLING: 'handling', AWARENESS: 'awareness', MOBILITY: 'mobility', RESILIENCE: 'resilience' };
    return labels.map(label => {
      const key = keys[label] || label.toLowerCase();
      return `${label} ${recruitmentNumericDisplay(Number(player?.stats?.[key]) || 0, knowledge, 0, 10)}`;
    }).join(' · ');
  }

  function recruitmentCashAfterDisplay(player, knowledge = recruitmentKnowledge(player)) {
    const cash = Number(careerState.credits) || 0;
    const fee = Number(player?.fee) || 0;
    if (knowledge >= 72) return teamCredits(cash - fee);
    const range = recruitmentEstimateRange(fee, knowledge, 0, Math.max(500000, fee * 2), true);
    const round = amount => Math.round(amount / 1000) * 1000;
    const low = round(cash - Number(range.high || 0));
    const high = round(cash - Number(range.low || 0));
    return `${teamCredits(low)}–${teamCredits(high)}`;
  }

  function recruitmentCandidateAssessment(player, squad = careerState.squad || []) {
    const before = recruitmentCompositionReport(squad);
    const after = recruitmentCompositionReport([...before.players, player].slice(0, TEAM_REQUIRED_STARTERS));
    const newlyCovered = after.functions.filter(item => item.state === 'covered' && before.functions.find(previous => previous.id === item.id)?.state !== 'covered');
    const improved = after.functions.filter(item => {
      const previous = before.functions.find(entry => entry.id === item.id);
      return previous && item.score >= previous.score + 0.3 && !newlyCovered.some(covered => covered.id === item.id);
    });
    const role = teamRoleById(player.role);
    const guide = teamRoleBeginnerGuide(role.id);
    const knowledge = recruitmentKnowledge(player);
    const overall = teamPlayerOverall(player);
    const decisionOverall = recruitmentEstimatedDecisionValue(overall, knowledge, 0, 100);
    const decisionPotential = recruitmentEstimatedDecisionValue(Number(player.potential) || 0, knowledge, 0, 100);
    const squadAverage = before.players.length ? before.players.reduce((sum, item) => sum + teamPlayerOverall(item), 0) / before.players.length : 0;
    const potentialGap = Math.max(0, decisionPotential - decisionOverall);
    const wageBill = typeof clubTotalWageBill === 'function' ? clubTotalWageBill() : teamSquadWageBill();
    const affordableCash = Number(careerState.credits) >= Number(player.fee || 0);
    const affordableWage = wageBill + Number(player.wage || 0) <= Number(careerState.wageBudget || 0);
    const medical = Number(player.injuryVulnerability) || 0;
    const fit = typeof tacticalPlayerRoleSuitability === 'function' ? tacticalPlayerRoleSuitability(player, role.id) : { score: overall };
    const roleFit = Math.round(Number(fit?.score) || overall);
    const decisionRoleFit = recruitmentEstimatedDecisionValue(roleFit, knowledge, 0, 100);
    let headline = 'STRENGTHENS ROLE DEPTH';
    let tone = 'neutral';
    if (newlyCovered.length) { headline = 'FILLS AN IMPORTANT GAP'; tone = 'positive'; }
    else if (before.players.length && decisionOverall >= squadAverage + 4) { headline = 'RAISES IMMEDIATE QUALITY'; tone = 'positive'; }
    else if (potentialGap >= 12) { headline = 'DEVELOPMENT PROSPECT'; tone = 'prospect'; }
    const detail = newlyCovered.length
      ? `Adds ${newlyCovered.map(item => item.short.toLowerCase()).join(' and ')} to the current active-five plan.`
      : improved.length
        ? `Strengthens ${improved.slice(0, 2).map(item => item.short.toLowerCase()).join(' and ')} without forcing a specific formation.`
        : `${role.name} profile: ${guide.plain}`;
    const cautions = [];
    if (!affordableCash) cautions.push('Transfer fee exceeds current cash');
    if (!affordableWage) cautions.push('Weekly wage exceeds current headroom');
    if (knowledge >= 75 && medical >= 72) cautions.push('High medical vulnerability');
    else if (knowledge >= 75 && medical >= 48) cautions.push('Moderate medical vulnerability');
    else if (knowledge >= 48 && knowledge < 75) cautions.push('Medical assessment remains preliminary');
    if (!cautions.length) cautions.push(guide.caution);
    return {
      player, before, after, newlyCovered, improved, role, guide, knowledge, overall, decisionOverall, decisionPotential, potentialGap,
      roleFit, decisionRoleFit, roleFitDisplay: recruitmentNumericDisplay(roleFit, knowledge, 0, 100), affordableCash, affordableWage,
      affordable: affordableCash && affordableWage, medical, headline, tone, detail,
      caution: cautions.join(' · '), cashAfter: Number(careerState.credits) - Number(player.fee || 0),
      wageAfter: wageBill + Number(player.wage || 0)
    };
  }

  function recruitmentRecommendationMap(players = careerState.market || []) {
    const candidates = (Array.isArray(players) ? players : []).map(player => {
      const assessment = recruitmentCandidateAssessment(player);
      const gapScore = assessment.newlyCovered.length * 34 + assessment.improved.length * 9;
      const medicalPenalty = assessment.knowledge >= 75 ? (assessment.medical >= 72 ? 13 : assessment.medical >= 48 ? 5 : 0) : 0;
      return {
        player,
        assessment,
        immediate: gapScore + assessment.decisionOverall * 1.2 + assessment.decisionRoleFit * 0.28 - medicalPenalty,
        affordable: assessment.affordable ? gapScore + assessment.decisionOverall + assessment.potentialGap * 0.35 - (Number(player.fee) / Math.max(1, Number(careerState.credits))) * 18 : -9999,
        development: assessment.decisionPotential + assessment.potentialGap * 1.25 - medicalPenalty - (Number(player.fee) / 100000)
      };
    });
    const recommendations = new Map();
    const used = new Set();
    const choose = (key, label) => {
      const ranked = candidates.slice().sort((a, b) => b[key] - a[key]);
      const choice = ranked.find(item => !used.has(item.player.id)) || ranked[0];
      if (!choice || choice[key] <= -9000) return;
      used.add(choice.player.id);
      const labels = recommendations.get(choice.player.id) || [];
      labels.push(label);
      recommendations.set(choice.player.id, labels);
    };
    choose('immediate', 'BEST IMMEDIATE FIT');
    choose('affordable', 'BEST AFFORDABLE OPTION');
    choose('development', 'BEST DEVELOPMENT PROSPECT');
    return recommendations;
  }

  function recruitmentRecommendationBadges(player, recommendationMap) {
    const labels = recommendationMap?.get(player.id) || [];
    return labels.length ? `<span class="recruitment-recommendation-badges">${labels.map(label => `<b>${escapeCareerHtml(label)}</b>`).join('')}</span>` : '';
  }

  function recruitmentBeginnerMode() {
    const guide = typeof firstMatchGuidance === 'function' ? firstMatchGuidance() : null;
    return Boolean(
      careerState.created &&
      Number(careerState.totalMatches || 0) === 0 &&
      (careerState.squad || []).length < TEAM_REQUIRED_STARTERS &&
      guide &&
      ['recruitment', 'profile', 'first-signing', 'active-five'].includes(guide.id)
    );
  }

  function recruitmentBeginnerCandidates(players = careerState.market || [], recommendationMap = recruitmentRecommendationMap(players), limit = 6) {
    const ranked = (Array.isArray(players) ? players : []).map((player, index) => {
      const assessment = recruitmentCandidateAssessment(player);
      const badges = recommendationMap?.get(player.id)?.length || 0;
      const score = badges * 180 + assessment.newlyCovered.length * 70 + assessment.improved.length * 18 + (assessment.affordable ? 36 : -120) + assessment.decisionOverall + assessment.decisionPotential * 0.24 - index * 0.001;
      return { player, assessment, score, index };
    }).sort((a, b) => b.score - a.score || a.index - b.index);
    const selected = [];
    const roleIds = new Set();
    for (const item of ranked) {
      if (selected.length >= limit) break;
      if (roleIds.has(item.player.role)) continue;
      selected.push(item.player);
      roleIds.add(item.player.role);
    }
    for (const item of ranked) {
      if (selected.length >= limit) break;
      if (selected.some(player => player.id === item.player.id)) continue;
      selected.push(item.player);
    }
    return selected;
  }

  function recruitmentBeginnerPanelMarkup(shownCount, totalCount) {
    const contracted = Math.min(TEAM_REQUIRED_STARTERS, (careerState.squad || []).length);
    const places = Math.max(0, TEAM_REQUIRED_STARTERS - contracted);
    return `<section class="recruitment-beginner-panel" data-management-target-id="recruitment:beginner">
      <header><div><span>FIRST MATCH JOURNEY · BUILD ACTIVE FIVE</span><strong>START WITH ${shownCount} RECOMMENDED CANDIDATES</strong><p>The full scouting department is still available, but you do not need it yet. Use this smaller list to learn one decision at a time and fill the ${places} remaining deployment place${places === 1 ? '' : 's'}.</p></div><b>${contracted} / ${TEAM_REQUIRED_STARTERS} FILLED</b></header>
      <div class="recruitment-beginner-steps"><span><b>1</b> Open one report</span><span><b>2</b> Compare two candidates</span><span><b>3</b> Negotiate with your preferred operator</span></div>
      <footer><span>Showing ${shownCount} of ${totalCount} available operators</span><button type="button" data-recruitment-beginner-expand>${recruitmentBeginnerExpanded ? 'RETURN TO GUIDED SHORTLIST' : 'SHOW ALL CANDIDATES & ADVANCED TOOLS'}</button></footer>
    </section>`;
  }

  function recruitmentBeginnerCandidateHeading(shownCount, totalCount) {
    const contracted = Math.min(TEAM_REQUIRED_STARTERS, (careerState.squad || []).length);
    return `<div class="recruitment-beginner-candidate-head"><div><span>RECOMMENDED FOR YOUR FIRST ACTIVE FIVE</span><strong>CHOOSE THE NEXT OPERATOR</strong><p>These candidates are ranked for current team needs, affordability and role variety. The scouting confidence bar shows how reliable each ability, potential, fee, wage and medical estimate is.</p></div><aside><strong>${shownCount}</strong><span>OF ${totalCount} SHOWN</span><small>${contracted}/${TEAM_REQUIRED_STARTERS} CONTRACTED</small></aside></div>`;
  }

  function recruitmentCandidateImpactMarkup(player, recommendationMap) {
    const assessment = recruitmentCandidateAssessment(player);
    return `<div class="recruitment-candidate-impact ${assessment.tone}">
      <div><span>WHAT THIS OPERATOR ADDS</span><strong>${escapeCareerHtml(assessment.headline)}</strong><p>${escapeCareerHtml(assessment.detail)}</p></div>
      <aside><span>ROLE FIT</span><strong>${escapeCareerHtml(assessment.roleFitDisplay)}/100</strong><small>${escapeCareerHtml(assessment.caution)}</small></aside>
      ${recruitmentRecommendationBadges(player, recommendationMap)}
    </div>`;
  }

  function recruitmentSigningUpdateMarkup() {
    const update = recruitmentLastSigningUpdate;
    if (!update) return '';
    const contracted = clamp(Math.round(Number(update.contractedCount) || (careerState.squad || []).length), 0, TEAM_REQUIRED_STARTERS);
    const progress = Math.round(contracted / TEAM_REQUIRED_STARTERS * 100);
    return `<section class="recruitment-signing-update ${update.newlyCovered.length ? 'positive' : ''}" aria-live="polite">
      <div><span>SIGNING COMPLETE · ACTIVE FIVE ${contracted} / ${TEAM_REQUIRED_STARTERS}</span><strong>${escapeCareerHtml(update.playerName)} ADDED</strong><p>${escapeCareerHtml(update.detail)}</p><div class="recruitment-signing-progress"><i><b style="width:${progress}%"></b></i><strong>${contracted === TEAM_REQUIRED_STARTERS ? 'ACTIVE FIVE COMPLETE' : `${TEAM_REQUIRED_STARTERS - contracted} PLACE${TEAM_REQUIRED_STARTERS - contracted === 1 ? '' : 'S'} STILL TO FILL`}</strong></div></div>
      <button type="button" data-recruitment-dismiss-update aria-label="Dismiss active five update">×</button>
    </section>`;
  }

  function recruitmentNeedsPanelMarkup(includeSigningUpdate = true) {
    const report = recruitmentCompositionReport();
    const wageBill = typeof clubTotalWageBill === 'function' ? clubTotalWageBill() : teamSquadWageBill();
    const places = Math.max(0, TEAM_REQUIRED_STARTERS - report.players.length);
    const priority = [...report.missing, ...report.partial].slice(0, 3);
    return `${includeSigningUpdate ? recruitmentSigningUpdateMarkup() : ''}<section class="recruitment-needs-panel" data-management-target-id="recruitment:needs">
      <header><div><span>ACTIVE FIVE NEEDS</span><strong>${report.players.length} / ${TEAM_REQUIRED_STARTERS} OPERATORS CONTRACTED</strong><p>Build complementary team functions. Duplicate roles remain valid when attributes, weapons and the tactical plan support them.</p></div><b>${places ? `${places} PLACE${places === 1 ? '' : 'S'} LEFT` : 'ACTIVE FIVE COMPLETE'}</b></header>
      <div class="recruitment-function-grid">${report.functions.map(item => `<article class="${item.state}"><span>${escapeCareerHtml(item.label)}</span><strong>${item.state === 'covered' ? 'COVERED' : item.state === 'partial' ? 'PARTIAL' : 'MISSING'}</strong><small>${escapeCareerHtml(item.state === 'missing' ? item.missing : item.short)}</small></article>`).join('')}</div>
      <footer><div><span>PRIORITY NEEDS</span><strong>${priority.length ? priority.map(item => escapeCareerHtml(item.missing)).join(' · ') : 'No major functional gap in the active five'}</strong></div><div><span>TRANSFER CASH</span><strong>${teamCredits(careerState.credits)}</strong></div><div><span>WEEKLY WAGES</span><strong>${teamCredits(wageBill)} / ${teamCredits(careerState.wageBudget)}</strong></div></footer>
    </section>`;
  }

  function recruitmentPruneComparisonIds() {
    const marketIds = new Set((careerState.market || []).map(player => String(player.id)));
    recruitmentComparisonIds = recruitmentComparisonIds.filter(id => marketIds.has(String(id))).slice(0, 3);
    recruitmentFlippedIds = new Set([...recruitmentFlippedIds].filter(id => marketIds.has(String(id))));
    recruitmentExpandedReportIds = new Set([...recruitmentExpandedReportIds].filter(id => marketIds.has(String(id))));
    if (!recruitmentComparisonIds.length) recruitmentComparisonExpanded = false;
    return recruitmentComparisonIds;
  }

  function recruitmentComparisonBand(score) {
    const value = Math.round(Number(score) || 0);
    if (value >= 82) return { label: 'EXCELLENT', tone: 'excellent' };
    if (value >= 70) return { label: 'STRONG', tone: 'strong' };
    if (value >= 56) return { label: 'WORKABLE', tone: 'workable' };
    return { label: 'LIMITED', tone: 'limited' };
  }

  function recruitmentComparisonDecision(player) {
    const assessment = recruitmentCandidateAssessment(player);
    const knowledge = assessment.knowledge;
    const cash = Math.max(1, Number(careerState.credits) || 0);
    const wageBudget = Math.max(1, Number(careerState.wageBudget) || 0);
    const wageBill = typeof clubTotalWageBill === 'function' ? clubTotalWageBill() : teamSquadWageBill();
    const wageHeadroom = Math.max(1, wageBudget - wageBill);
    const estimatedFee = recruitmentEstimatedDecisionValue(Number(player.fee) || 0, knowledge, 0, Math.max(500000, Number(player.fee || 0) * 2));
    const estimatedWage = recruitmentEstimatedDecisionValue(Number(player.wage) || 0, knowledge, 0, Math.max(50000, Number(player.wage || 0) * 2));
    const estimatedMedical = recruitmentEstimatedDecisionValue(assessment.medical, knowledge, 0, 100);
    const coverageValue = assessment.newlyCovered.length * 30 + assessment.improved.length * 12;
    const sameRoleCount = (careerState.squad || []).filter(item => item.role === player.role || item.secondaryRole === player.role).length;
    const needScore = clamp(Math.round(32 + coverageValue + assessment.decisionRoleFit * 0.34 + (sameRoleCount ? 0 : 8)), 0, 100);
    const medicalPenalty = knowledge >= 75 ? (estimatedMedical >= 72 ? 14 : estimatedMedical >= 48 ? 6 : 0) : knowledge >= 48 ? 3 : 6;
    const immediateScore = clamp(Math.round(assessment.decisionOverall * 0.55 + assessment.decisionRoleFit * 0.25 + needScore * 0.20 - medicalPenalty), 0, 100);
    const futureScore = clamp(Math.round(assessment.decisionPotential * 0.68 + assessment.potentialGap * 0.42 + assessment.decisionRoleFit * 0.12 - medicalPenalty * 0.55), 0, 100);
    const feeBurden = estimatedFee / cash;
    const wageBurden = estimatedWage / wageHeadroom;
    let budgetScore = clamp(Math.round(100 - feeBurden * 42 - wageBurden * 20), 0, 100);
    if (!assessment.affordableCash) budgetScore = Math.min(budgetScore, 24);
    if (!assessment.affordableWage) budgetScore = Math.min(budgetScore, 34);
    const recommendationScore = clamp(Math.round(immediateScore * 0.42 + futureScore * 0.20 + needScore * 0.24 + budgetScore * 0.14 - (assessment.affordable ? 0 : 18)), 0, 100);
    return {
      player,
      assessment,
      knowledge,
      estimatedFee,
      estimatedWage,
      estimatedMedical,
      immediateScore,
      futureScore,
      needScore,
      budgetScore,
      recommendationScore,
      sameRoleCount
    };
  }

  function recruitmentComparisonLeader(items, key, lowerIsBetter = false) {
    if (!items.length) return null;
    return items.slice().sort((a, b) => lowerIsBetter ? a[key] - b[key] : b[key] - a[key])[0] || null;
  }

  function recruitmentComparisonLeaderTag(item, leader, label) {
    if (recruitmentComparisonIds.length < 2) return '';
    return item && leader && item.player.id === leader.player.id ? `<small class="comparison-leader">${escapeCareerHtml(label)}</small>` : '';
  }

  function recruitmentComparisonReasons(item, leaders) {
    const assessment = item.assessment;
    const reasons = [];
    if (assessment.newlyCovered.length) reasons.push(`Fills the ${assessment.newlyCovered.slice(0, 2).map(entry => entry.label.toLowerCase()).join(' and ')} gap in your current Active Five.`);
    else if (assessment.improved.length) reasons.push(`Improves ${assessment.improved.slice(0, 2).map(entry => entry.label.toLowerCase()).join(' and ')} in the current squad.`);
    if (leaders.immediate?.player.id === item.player.id) reasons.push('Highest immediate match impact among the selected candidates.');
    else if (leaders.future?.player.id === item.player.id) reasons.push('Highest long-term development ceiling in this comparison.');
    if (leaders.budget?.player.id === item.player.id && item.assessment.affordable) reasons.push('Best balance of transfer fee, wage and expected impact.');
    if (!reasons.length && item.assessment.decisionRoleFit >= 72) reasons.push(`Strong fit for the ${item.assessment.role.name} role you would assign.`);
    if (!reasons.length) reasons.push(item.assessment.detail);
    return reasons.slice(0, 2);
  }

  function recruitmentComparisonTradeoffs(item, leaders) {
    const assessment = item.assessment;
    const tradeoffs = [];
    if (!assessment.affordableCash) tradeoffs.push('The estimated transfer fee exceeds your current cash.');
    if (!assessment.affordableWage) tradeoffs.push('The weekly wage exceeds your remaining wage headroom.');
    if (item.knowledge < 50) tradeoffs.push('Scouting confidence is low, so ability and cost estimates remain broad.');
    else if (item.knowledge < 75) tradeoffs.push('Some medical and contract details are still provisional.');
    if (item.knowledge >= 75 && item.estimatedMedical >= 72) tradeoffs.push('Medical vulnerability is high compared with a typical candidate.');
    else if (item.knowledge >= 75 && item.estimatedMedical >= 48) tradeoffs.push('Medical vulnerability is a moderate concern.');
    if (!assessment.newlyCovered.length && !assessment.improved.length && item.sameRoleCount) tradeoffs.push('Adds depth rather than filling a missing team function.');
    if (leaders.immediate && leaders.immediate.player.id !== item.player.id && leaders.immediate.immediateScore >= item.immediateScore + 6) tradeoffs.push(`${leaders.immediate.player.name} offers more immediate impact.`);
    if (!tradeoffs.length) tradeoffs.push(assessment.guide.caution);
    return tradeoffs.slice(0, 2);
  }

  function recruitmentComparisonDecisionSummaryMarkup(items, leaders) {
    if (items.length < 2) {
      const first = items[0];
      return `<div class="recruitment-comparison-decision incomplete"><div><span>NEXT STEP</span><strong>ADD ONE MORE CANDIDATE</strong><p>${first ? `${escapeCareerHtml(first.player.name)} is selected. Tap Add to Compare on another candidate to receive a squad-fit recommendation.` : 'Select two candidates to compare their squad impact, affordability and risk.'}</p></div><b>${items.length}/2</b></div>`;
    }
    const affordable = items.filter(item => item.assessment.affordable);
    const recommended = (affordable.length ? affordable : items).slice().sort((a, b) => b.recommendationScore - a.recommendationScore)[0];
    const reason = recruitmentComparisonReasons(recommended, leaders)[0] || recommended.assessment.detail;
    const finance = recommended.assessment.affordable
      ? `Leaves ${recruitmentCashAfterDisplay(recommended.player, recommended.knowledge)} cash and remains inside the weekly wage budget.`
      : 'This is the strongest tactical option selected, but the current budget prevents a clean deal.';
    const confidence = recommended.knowledge >= 75 ? 'GOOD REPORT CONFIDENCE' : recommended.knowledge >= 50 ? 'PROVISIONAL REPORT' : 'LOW REPORT CONFIDENCE';
    return `<div class="recruitment-comparison-decision ${recommended.assessment.affordable ? 'positive' : 'warning'}"><div><span>MANAGER RECOMMENDATION · ${escapeCareerHtml(confidence)}</span><strong>${escapeCareerHtml(recommended.player.name)} · BEST CURRENT FIT</strong><p>${escapeCareerHtml(reason)} ${escapeCareerHtml(finance)}</p></div><aside><span>DECISION FIT</span><strong>${recommended.recommendationScore}/100</strong><small>${escapeCareerHtml(recruitmentComparisonBand(recommended.recommendationScore).label)}</small></aside></div>`;
  }

  function recruitmentComparisonTrayMarkup() {
    recruitmentPruneComparisonIds();
    const players = recruitmentComparisonIds.map(id => transferMarketPlayer(id)).filter(Boolean);
    const slots = Array.from({ length: 3 }, (_, index) => {
      const player = players[index];
      if (!player) return `<div class="recruitment-comparison-slot empty"><span>SLOT ${index + 1}</span><strong>ADD CANDIDATE</strong><small>Use Compare on a card</small></div>`;
      const decision = recruitmentComparisonDecision(player);
      return `<div class="recruitment-comparison-slot filled"><button type="button" data-recruitment-compare="${escapeCareerHtml(player.id)}" aria-label="Remove ${escapeCareerHtml(player.name)} from comparison">×</button><span>${escapeCareerHtml(decision.assessment.role.name)}</span><strong>${escapeCareerHtml(player.name)}</strong><small>${recruitmentAbilityDisplay(player)} ABILITY · ${recruitmentMoneyDisplay(player.fee, decision.knowledge)}</small></div>`;
    }).join('');
    const status = players.length >= 2
      ? 'Ready for a squad-fit recommendation'
      : players.length === 1
        ? 'Choose one more candidate'
        : 'Select up to three candidates';
    return `<section class="recruitment-comparison-tray ${players.length ? 'has-selection' : 'empty'} ${recruitmentComparisonExpanded ? 'is-expanded' : ''}" data-recruitment-comparison-tray data-management-target-id="recruitment:comparison-tray"><header><div><span>COMPARISON TRAY</span><strong>${players.length} / 3 SELECTED</strong><small>${escapeCareerHtml(status)}</small></div><b>${players.length >= 2 ? 'READY' : `${players.length}/2 MIN`}</b></header><div class="recruitment-comparison-tray-body"><div class="recruitment-comparison-slots">${slots}</div><div class="recruitment-comparison-tray-actions"><button type="button" data-recruitment-clear-comparison ${players.length ? '' : 'disabled'}>CLEAR</button><button type="button" class="primary" data-recruitment-toggle-comparison aria-expanded="${recruitmentComparisonExpanded}" ${players.length ? '' : 'disabled'}>${recruitmentComparisonExpanded ? 'HIDE COMPARISON' : players.length >= 2 ? 'REVIEW COMPARISON' : 'VIEW SELECTION'}</button></div></div></section>`;
  }

  function recruitmentComparisonPanelMarkup() {
    recruitmentPruneComparisonIds();
    const players = recruitmentComparisonIds.map(id => transferMarketPlayer(id)).filter(Boolean);
    const guide = typeof firstMatchGuidance === 'function' ? firstMatchGuidance() : null;
    const tutorialActive = ['profile', 'first-signing', 'active-five'].includes(guide?.id);
    const panelState = recruitmentComparisonExpanded ? 'is-open' : 'is-collapsed';
    const hidden = recruitmentComparisonExpanded ? '' : ' hidden';
    if (!players.length) return `<section class="recruitment-comparison-panel empty ${panelState} ${tutorialActive ? 'tutorial-active' : ''}" data-recruitment-comparison-panel data-management-target-id="recruitment:comparison"${hidden}><header><div><span>${tutorialActive ? 'TUTORIAL DECISION TOOL' : 'CANDIDATE COMPARISON'}</span><strong>COMPARE TWO OPERATORS BEFORE NEGOTIATING</strong><p>This tool does more than repeat attributes. It identifies the best current squad fit, explains why, exposes the main trade-off and checks whether the fee and wage fit your budgets.</p></div><div class="recruitment-comparison-panel-actions"><button type="button" data-recruitment-toggle-comparison>CLOSE</button></div></header><div class="recruitment-comparison-steps"><span><b>1</b> Add two candidates from the compact cards</span><span><b>2</b> Read Best Current Fit and the trade-offs</span><span><b>3</b> Open the report or negotiate directly</span></div></section>`;
    const items = players.map(recruitmentComparisonDecision);
    const leaders = {
      immediate: recruitmentComparisonLeader(items, 'immediateScore'),
      future: recruitmentComparisonLeader(items, 'futureScore'),
      need: recruitmentComparisonLeader(items, 'needScore'),
      budget: recruitmentComparisonLeader(items, 'budgetScore'),
      ability: recruitmentComparisonLeader(items.map(item => ({ ...item, metric: item.assessment.decisionOverall })), 'metric'),
      potential: recruitmentComparisonLeader(items.map(item => ({ ...item, metric: item.assessment.decisionPotential })), 'metric'),
      medical: recruitmentComparisonLeader(items.map(item => ({ ...item, metric: item.estimatedMedical })), 'metric', true),
      fee: recruitmentComparisonLeader(items.map(item => ({ ...item, metric: item.estimatedFee })), 'metric', true)
    };
    const affordableItems = items.filter(item => item.assessment.affordable);
    const recommendedItem = (affordableItems.length ? affordableItems : items).slice().sort((a, b) => b.recommendationScore - a.recommendationScore)[0] || null;
    const orderedItems = recommendedItem ? items.slice().sort((a, b) => (a.player.id === recommendedItem.player.id ? -1 : b.player.id === recommendedItem.player.id ? 1 : 0)) : items;
    const summary = recruitmentComparisonDecisionSummaryMarkup(items, leaders);
    return `<section class="recruitment-comparison-panel ${panelState} ${tutorialActive ? 'tutorial-active' : ''}" data-recruitment-comparison-panel data-management-target-id="recruitment:comparison"${hidden}><header><div><span>${tutorialActive ? 'TUTORIAL DECISION TOOL' : 'CANDIDATE COMPARISON'}</span><strong>${players.length} OF 3 SELECTED</strong><p>Recommendations use the current squad, budgets and available scouting knowledge. Different roles are judged by what they add—not by overall rating alone.</p></div><div class="recruitment-comparison-panel-actions"><button type="button" data-recruitment-clear-comparison>CLEAR</button><button type="button" data-recruitment-toggle-comparison>CLOSE</button></div></header>${summary}<div class="recruitment-comparison-grid">${orderedItems.map(item => {
      const player = item.player;
      const assessment = item.assessment;
      const role = assessment.role;
      const guideData = assessment.guide;
      const knowledge = item.knowledge;
      const relevant = recruitmentRelevantRoleAttributes(player, role, knowledge);
      const reasons = recruitmentComparisonReasons(item, leaders);
      const tradeoffs = recruitmentComparisonTradeoffs(item, leaders);
      const immediateBand = recruitmentComparisonBand(item.immediateScore);
      const futureBand = recruitmentComparisonBand(item.futureScore);
      const needBand = recruitmentComparisonBand(item.needScore);
      const budgetLabel = assessment.affordable ? 'WITHIN BUDGET' : !assessment.affordableCash ? 'FEE TOO HIGH' : 'WAGE TOO HIGH';
      const recommended = items.length >= 2 && recommendedItem?.player.id === player.id;
      return `<article class="${recommended ? 'recommended' : ''}"><button type="button" data-recruitment-compare="${escapeCareerHtml(player.id)}" aria-label="Remove ${escapeCareerHtml(player.name)} from comparison">×</button><span>${escapeCareerHtml(role.name)} · ${escapeCareerHtml(guideData.job)}</span><strong>${escapeCareerHtml(player.name)}</strong>${recommended ? '<em class="comparison-recommended">BEST CURRENT FIT</em>' : ''}<p>${escapeCareerHtml(guideData.plain)}</p><div class="recruitment-comparison-score-grid"><div class="${immediateBand.tone}"><span>IMMEDIATE IMPACT</span><strong>${item.immediateScore}</strong><small>${escapeCareerHtml(immediateBand.label)}</small>${recruitmentComparisonLeaderTag(item, leaders.immediate, 'HIGHEST')}</div><div class="${futureBand.tone}"><span>FUTURE CEILING</span><strong>${item.futureScore}</strong><small>${escapeCareerHtml(futureBand.label)}</small>${recruitmentComparisonLeaderTag(item, leaders.future, 'HIGHEST')}</div><div class="${needBand.tone}"><span>SQUAD NEED</span><strong>${item.needScore}</strong><small>${escapeCareerHtml(needBand.label)}</small>${recruitmentComparisonLeaderTag(item, leaders.need, 'BEST FIT')}</div><div class="${assessment.affordable ? 'strong' : 'limited'}"><span>BUDGET FIT</span><strong>${assessment.affordable ? 'YES' : 'NO'}</strong><small>${escapeCareerHtml(budgetLabel)}</small>${recruitmentComparisonLeaderTag(item, leaders.budget, 'BEST VALUE')}</div></div><div class="recruitment-comparison-verdicts"><section><span>WHY THIS FITS</span>${reasons.map(reason => `<p>${escapeCareerHtml(reason)}</p>`).join('')}</section><section class="tradeoff"><span>MAIN TRADE-OFF</span>${tradeoffs.map(reason => `<p>${escapeCareerHtml(reason)}</p>`).join('')}</section></div><dl><div class="${leaders.ability?.player.id === player.id && items.length > 1 ? 'best' : ''}"><dt>ABILITY</dt><dd>${recruitmentAbilityDisplay(player)}${recruitmentComparisonLeaderTag(item, leaders.ability, 'HIGHEST')}</dd></div><div class="${leaders.potential?.player.id === player.id && items.length > 1 ? 'best' : ''}"><dt>POTENTIAL</dt><dd>${recruitmentAbilityDisplay(player, true)}${recruitmentComparisonLeaderTag(item, leaders.potential, 'HIGHEST')}</dd></div><div><dt>ROLE ATTRIBUTES</dt><dd>${escapeCareerHtml(relevant)}</dd></div><div class="${leaders.medical?.player.id === player.id && items.length > 1 ? 'best' : ''}"><dt>MEDICAL RISK</dt><dd>${escapeCareerHtml(recruitmentMedicalDisplay(player))}${recruitmentComparisonLeaderTag(item, leaders.medical, 'LOWEST')}</dd></div><div class="${leaders.fee?.player.id === player.id && items.length > 1 ? 'best' : ''}"><dt>FEE</dt><dd>${escapeCareerHtml(recruitmentMoneyDisplay(player.fee, knowledge))}${recruitmentComparisonLeaderTag(item, leaders.fee, 'LOWEST')}</dd></div><div><dt>WAGE</dt><dd>${escapeCareerHtml(recruitmentMoneyDisplay(player.wage, knowledge))} / W</dd></div><div><dt>CASH AFTER</dt><dd class="${assessment.affordableCash ? '' : 'warning'}">${escapeCareerHtml(recruitmentCashAfterDisplay(player, knowledge))}</dd></div><div><dt>ACTIVE FIVE CHANGE</dt><dd>${escapeCareerHtml(assessment.detail)}</dd></div></dl><footer><button type="button" data-team-profile="${escapeCareerHtml(player.id)}">OPEN REPORT</button><button type="button" class="primary" data-transfer-start="${escapeCareerHtml(player.id)}" aria-label="Negotiate contract and transfer terms with ${escapeCareerHtml(player.name)}" ${(careerState.squad || []).length < TEAM_MAX_SQUAD && recruitmentTransferWindowOpenFor(player) ? '' : 'disabled'}>NEGOTIATE</button></footer></article>`;
    }).join('')}</div></section>`;
  }

  function recruitmentRecordSigningUpdate(player, squadBefore = []) {
    if (!player) return null;
    const before = recruitmentCompositionReport(squadBefore);
    const after = recruitmentCompositionReport([...before.players, player].slice(0, TEAM_REQUIRED_STARTERS));
    const newlyCovered = after.functions.filter(item => item.state === 'covered' && before.functions.find(previous => previous.id === item.id)?.state !== 'covered');
    const remaining = after.missing[0] || after.partial[0] || null;
    const detail = newlyCovered.length
      ? `${newlyCovered.map(item => item.label.toLowerCase()).join(' and ')} ${newlyCovered.length === 1 ? 'is' : 'are'} now covered.${remaining ? ` Consider ${remaining.missing.toLowerCase()} next.` : ' The active five has no major functional gap.'}`
      : `${teamRoleById(player.role).name} depth improved.${remaining ? ` The clearest remaining need is ${remaining.missing.toLowerCase()}.` : ' The active five has no major functional gap.'}`;
    recruitmentLastSigningUpdate = { playerId: player.id, playerName: player.name, newlyCovered, detail, contractedCount: after.players.length };
    recruitmentComparisonIds = recruitmentComparisonIds.filter(id => id !== player.id);
    return recruitmentLastSigningUpdate;
  }

  function renderRecruitmentPlayerRow(player, recommendationMap = null) {
    const id = String(player.id);
    const knowledge = recruitmentKnowledge(player);
    const shortlisted = recruitmentShortlisted(id);
    const compared = recruitmentComparisonIds.includes(id);
    const flipped = recruitmentFlippedIds.has(id);
    const reportExpanded = recruitmentExpandedReportIds.has(id);
    const role = teamRoleById(player.role);
    const guide = teamRoleBeginnerGuide(role.id);
    const ability = recruitmentAbilityDisplay(player, false);
    const potential = recruitmentAbilityDisplay(player, true);
    const assessment = recruitmentCandidateAssessment(player);
    const rival = player.rivalBid && Number(player.rivalBid.expiresDay) >= clubCalendarState().absoluteDay ? player.rivalBid : null;
    const windowOpen = recruitmentTransferWindowOpenFor(player);
    const relevant = recruitmentRelevantRoleAttributes(player, role, knowledge);
    const origin = player.marketOrigin || {};
    const canNegotiate = (careerState.squad || []).length < TEAM_MAX_SQUAD && windowOpen;
    const comparison = recruitmentBestComparison(player);
    const confidenceBand = knowledge >= 75 ? 'High confidence' : knowledge >= 50 ? 'Working estimate' : 'Early report';
    const scoutingExplanation = knowledge >= 75
      ? 'Recent scouting gives a dependable read on the displayed ability, potential, fee, wage and medical outlook.'
      : knowledge >= 50
        ? 'The report is directionally useful, but the displayed fee, wage and medical estimates can still move.'
        : 'This is still an early read. Treat the displayed ability, potential, fee, wage and medical figures as provisional.';
    const historyContext = rival
      ? `${rival.clubName} are in talks. ${origin.detail || player.marketReason || 'Competition may raise the final price.'}`
      : origin.detail || player.marketReason || 'Available through the recruitment network.';
    const squadFitContext = comparison
      ? `Closest current squad comparison: ${comparison.name} (${teamPlayerOverall(comparison)} OVR).`
      : 'No contracted operator currently offers a close like-for-like reference for this role.';
    const desktopShortlistLabel = shortlisted ? `Remove ${escapeCareerHtml(player.name)} from shortlist` : `Add ${escapeCareerHtml(player.name)} to shortlist`;
    const frontActions = `<div class="recruitment-card-actions recruitment-card-actions-utility"><button class="shortlist-toggle recruitment-card-icon-action ${shortlisted ? 'active' : ''}" data-recruitment-shortlist="${escapeCareerHtml(id)}" aria-pressed="${shortlisted}" aria-label="${desktopShortlistLabel}" title="${desktopShortlistLabel}">${shortlisted ? '★' : '☆'}</button><button class="recruitment-card-utility-action" data-team-profile="${escapeCareerHtml(id)}">DETAILS</button><button class="compare-toggle ${compared ? 'active' : ''}" data-recruitment-compare="${escapeCareerHtml(id)}" aria-pressed="${compared}">${compared ? '✓ IN TRAY' : '+ COMPARE'}</button><button class="primary" data-transfer-start="${escapeCareerHtml(id)}" aria-label="Negotiate contract and transfer terms with ${escapeCareerHtml(player.name)}" ${canNegotiate ? '' : 'disabled'}>NEGOTIATE</button></div>`;
    const backActions = `<div class="recruitment-card-actions recruitment-card-actions-utility back-actions"><button class="shortlist-toggle recruitment-card-icon-action ${shortlisted ? 'active' : ''}" data-recruitment-shortlist="${escapeCareerHtml(id)}" aria-pressed="${shortlisted}" aria-label="${desktopShortlistLabel}" title="${desktopShortlistLabel}">${shortlisted ? '★' : '☆'}</button><button class="compare-toggle ${compared ? 'active' : ''}" data-recruitment-compare="${escapeCareerHtml(id)}" aria-pressed="${compared}">${compared ? '✓ IN TRAY' : '+ COMPARE'}</button><button data-team-profile="${escapeCareerHtml(id)}">FULL REPORT</button><button class="primary" data-transfer-start="${escapeCareerHtml(id)}" aria-label="Negotiate contract and transfer terms with ${escapeCareerHtml(player.name)}" ${canNegotiate ? '' : 'disabled'}>NEGOTIATE</button></div>`;
    const mobileReportId = `recruitment-mobile-report-${escapeCareerHtml(id)}`;
    const mobileReportToggleLabel = reportExpanded ? 'HIDE REPORT' : 'VIEW REPORT';
    const mobileCompareLabel = compared ? '✓ IN TRAY' : '+ COMPARE';
    const mobileShortlistSymbol = shortlisted ? '★' : '☆';
    const mobileFrontMarkup = `<header class="recruitment-mobile-back-head recruitment-mobile-front-head">
          <div>
            <span>${escapeCareerHtml(role.name)}</span>
            <strong>${escapeCareerHtml(player.name)}</strong>
            <small>${escapeCareerHtml(player.nationality)} · Age ${player.age}${player.secondaryRole && player.secondaryRole !== player.role ? ` · ${escapeCareerHtml(teamRoleById(player.secondaryRole).name)} secondary` : ''}</small>
          </div>
          <div class="recruitment-mobile-front-actions">
            <button type="button" class="recruitment-mobile-summary-return recruitment-mobile-front-shortlist ${shortlisted ? 'active' : ''}" data-recruitment-shortlist="${escapeCareerHtml(id)}" aria-pressed="${shortlisted}" aria-label="${shortlisted ? `Remove ${escapeCareerHtml(player.name)} from shortlist` : `Add ${escapeCareerHtml(player.name)} to shortlist`}">${mobileShortlistSymbol}</button>
            <button type="button" class="recruitment-mobile-summary-return recruitment-mobile-front-toggle" data-recruitment-flip="${escapeCareerHtml(id)}" aria-expanded="false" aria-label="Flip ${escapeCareerHtml(player.name)} to the detailed scouting side">DETAILS ↻</button>
          </div>
        </header>
        <div class="recruitment-mobile-summary-signals">
          <span class="tone-${escapeCareerHtml(assessment.tone)}">${escapeCareerHtml(assessment.headline)}</span>
          <small>Scouting confidence ${knowledge}% · ${escapeCareerHtml(confidenceBand)}</small>
        </div>
        <div class="recruitment-mobile-summary-grid">
          <div><span>Ability</span><strong>${ability}</strong></div>
          <div><span>Potential</span><strong>${potential}</strong></div>
          <div><span>Fee</span><strong>${recruitmentMoneyDisplay(player.fee, knowledge)}</strong></div>
          <div><span>Wage</span><strong>${recruitmentMoneyDisplay(player.wage, knowledge)}</strong><small>per week</small></div>
        </div>
        <div class="recruitment-mobile-summary-fit ${assessment.tone}">
          <span>Squad fit</span>
          <strong>${escapeCareerHtml(assessment.detail)}</strong>
          <small>Role fit ${escapeCareerHtml(assessment.roleFitDisplay)}/100 · ${escapeCareerHtml(assessment.affordable ? 'Within current budgets' : assessment.caution)}</small>
        </div>
        <div class="recruitment-mobile-summary-actions">
          <button type="button" data-recruitment-toggle-report="${escapeCareerHtml(id)}" aria-expanded="${reportExpanded}" aria-controls="${mobileReportId}">${mobileReportToggleLabel}</button>
          <button type="button" class="primary" data-transfer-start="${escapeCareerHtml(id)}" aria-label="Negotiate contract and transfer terms with ${escapeCareerHtml(player.name)}" ${canNegotiate ? '' : 'disabled'}>NEGOTIATE</button>
        </div>
        <div class="recruitment-mobile-report" id="${mobileReportId}" ${reportExpanded ? '' : 'hidden'}>
          <section>
            <span>Scouting explanation</span>
            <strong>${knowledge}% confidence · ${escapeCareerHtml(confidenceBand)}</strong>
            <p>${escapeCareerHtml(scoutingExplanation)}</p>
          </section>
          <section>
            <span>Squad-fit detail</span>
            <strong>${escapeCareerHtml(assessment.headline)}</strong>
            <p>${escapeCareerHtml(assessment.detail)}</p>
            <small>${escapeCareerHtml(squadFitContext)} ${escapeCareerHtml(assessment.caution)}</small>
          </section>
          <section>
            <span>History and context</span>
            <strong>${escapeCareerHtml(rival ? `${rival.clubName} are pushing a deal` : origin.label || 'Recruitment network listing')}</strong>
            <p>${escapeCareerHtml(historyContext)}</p>
            <small>${escapeCareerHtml(recruitmentMedicalDisplay(player))} · ${escapeCareerHtml(relevant)}</small>
          </section>
          <section>
            <span>Role brief</span>
            <strong>${escapeCareerHtml(guide.job)}</strong>
            <p>${escapeCareerHtml(guide.plain)}</p>
            <small>${escapeCareerHtml(recruitmentPersonalityDisplay(player))}</small>
          </section>
          <footer>
            <button type="button" data-team-profile="${escapeCareerHtml(id)}">OPEN FULL PROFILE</button>
            <button type="button" data-recruitment-toggle-report="${escapeCareerHtml(id)}" aria-expanded="${reportExpanded}" aria-controls="${mobileReportId}">HIDE REPORT</button>
          </footer>
        </div>`;
    const mobileBackMarkup = `<header class="recruitment-mobile-back-head">
          <div>
            <span>Scout view · ${knowledge}% confidence</span>
            <strong>${escapeCareerHtml(player.name)}</strong>
            <small>${escapeCareerHtml(role.name)} · ${escapeCareerHtml(guide.job)}</small>
          </div>
          <button type="button" class="recruitment-mobile-summary-return" data-recruitment-flip="${escapeCareerHtml(id)}" aria-expanded="true" aria-label="Return to the compact summary for ${escapeCareerHtml(player.name)}">SUMMARY ↺</button>
        </header>
        <div class="recruitment-mobile-back-grid">
          <section><span>Role brief</span><strong>${escapeCareerHtml(guide.plain)}</strong><small>${escapeCareerHtml(guide.caution)}</small></section>
          <section><span>Key attributes</span><strong>${escapeCareerHtml(relevant)}</strong><small>${escapeCareerHtml(recruitmentPersonalityDisplay(player))}</small></section>
          <section><span>Medical</span><strong>${escapeCareerHtml(recruitmentMedicalDisplay(player))}</strong><small>${knowledge >= 72 ? `Cash after fee: ${escapeCareerHtml(recruitmentCashAfterDisplay(player, knowledge))}` : 'Final checks required before a deal.'}</small></section>
          <section><span>Market history</span><strong>${escapeCareerHtml(rival ? `${rival.clubName} in talks` : origin.label || 'Recruitment network listing')}</strong><small>${escapeCareerHtml(historyContext)}</small></section>
        </div>
        <div class="recruitment-mobile-back-impact ${assessment.tone}">
          <span>Active Five impact</span>
          <strong>${escapeCareerHtml(assessment.headline)}</strong>
          <p>${escapeCareerHtml(assessment.detail)}</p>
          <small>${escapeCareerHtml(squadFitContext)} ${escapeCareerHtml(assessment.caution)}</small>
        </div>
        <div class="recruitment-mobile-back-actions">
          <button type="button" class="compare-toggle ${compared ? 'active' : ''}" data-recruitment-compare="${escapeCareerHtml(id)}" aria-pressed="${compared}">${mobileCompareLabel}</button>
          <button type="button" data-team-profile="${escapeCareerHtml(id)}">FULL PROFILE</button>
          <button type="button" class="primary" data-transfer-start="${escapeCareerHtml(id)}" aria-label="Negotiate contract and transfer terms with ${escapeCareerHtml(player.name)}" ${canNegotiate ? '' : 'disabled'}>NEGOTIATE</button>
        </div>`;
    return `<article class="team-market-row recruitment-market-row recruitment-candidate-card ${shortlisted ? 'shortlisted' : ''} ${compared ? 'compared' : ''} ${flipped ? 'is-flipped' : ''} ${reportExpanded ? 'report-open' : ''}" data-recruitment-card="${escapeCareerHtml(id)}">
      <div class="recruitment-card-stage">
        <section class="recruitment-card-face recruitment-card-front" aria-hidden="${flipped}" ${flipped ? 'inert' : ''}>
          <button type="button" class="recruitment-card-identity" data-recruitment-flip="${escapeCareerHtml(id)}" aria-expanded="${flipped}" aria-label="Show detailed scouting view for ${escapeCareerHtml(player.name)}"><span><b>${escapeCareerHtml(role.name)}</b><em>FLIP FOR DETAILS ↻</em></span><strong>${escapeCareerHtml(player.name)}</strong><small>${escapeCareerHtml(player.nationality)} · AGE ${player.age}${player.secondaryRole && player.secondaryRole !== player.role ? ` · ${escapeCareerHtml(teamRoleById(player.secondaryRole).name)} SECONDARY` : ''}</small></button>
          ${recruitmentRecommendationBadges(player, recommendationMap)}
          ${renderRecruitmentKnowledge(player)}
          <div class="recruitment-card-metrics"><div><span>ABILITY</span><strong>${ability}</strong>${recruitmentStarsMarkup(player, false)}</div><div><span>POTENTIAL</span><strong>${potential}</strong>${recruitmentStarsMarkup(player, true)}</div><div><span>FEE</span><strong>${recruitmentMoneyDisplay(player.fee, knowledge)}</strong><small>${rival ? 'RIVAL BID' : knowledge >= 72 ? `VALUE ${teamCredits(player.value)}` : 'ESTIMATE'}</small></div><div><span>WAGE</span><strong>${recruitmentMoneyDisplay(player.wage, knowledge)}</strong><small>PER WEEK</small></div></div>
          <div class="recruitment-card-fit ${assessment.tone}"><span>${escapeCareerHtml(assessment.headline)}</span><strong>${escapeCareerHtml(assessment.detail)}</strong><small>ROLE FIT ${escapeCareerHtml(assessment.roleFitDisplay)}/100 · ${escapeCareerHtml(assessment.affordable ? 'WITHIN CURRENT BUDGETS' : assessment.caution)}</small></div>
          ${frontActions}
        </section>
        <section class="recruitment-card-face recruitment-card-back" aria-hidden="${!flipped}" ${flipped ? '' : 'inert'}>
          <header><div><span>SCOUT VIEW · ${knowledge}% CONFIDENCE</span><strong>${escapeCareerHtml(player.name)}</strong><small>${escapeCareerHtml(role.name)} · ${escapeCareerHtml(guide.job)}</small></div><button type="button" data-recruitment-flip="${escapeCareerHtml(id)}" aria-expanded="${flipped}" aria-label="Return to summary for ${escapeCareerHtml(player.name)}">SUMMARY ↺</button></header>
          <div class="recruitment-card-back-body"><div class="recruitment-card-scout-grid"><article><span>ROLE BRIEF</span><strong>${escapeCareerHtml(guide.plain)}</strong><small>${escapeCareerHtml(guide.caution)}</small></article><article><span>KEY ATTRIBUTES</span><strong>${escapeCareerHtml(relevant)}</strong><small>${escapeCareerHtml(recruitmentPersonalityDisplay(player))}</small></article><article><span>MEDICAL</span><strong>${escapeCareerHtml(recruitmentMedicalDisplay(player))}</strong><small>${knowledge >= 72 ? `Cash after fee: ${escapeCareerHtml(recruitmentCashAfterDisplay(player, knowledge))}` : 'Final checks required before a deal.'}</small></article><article><span>MARKET CONTEXT</span><strong>${escapeCareerHtml(rival ? `${rival.clubName} IN TALKS` : origin.label || 'NETWORK LISTING')}</strong><small>${escapeCareerHtml(origin.detail || player.marketReason || 'Available through the recruitment network.')}</small></article></div><div class="recruitment-card-impact-detail ${assessment.tone}"><span>ACTIVE FIVE IMPACT</span><strong>${escapeCareerHtml(assessment.headline)}</strong><p>${escapeCareerHtml(assessment.detail)}</p><small>${escapeCareerHtml(assessment.caution)}</small></div></div>
          ${backActions}
        </section>
      </div>
      <section class="recruitment-mobile-card ${flipped ? 'is-flipped' : 'is-summary'}" aria-label="${flipped ? 'Detailed scouting side' : 'Compact recruitment summary'} for ${escapeCareerHtml(player.name)}">
        ${flipped ? mobileBackMarkup : mobileFrontMarkup}
      </section>
    </article>`;
  }

  function recruitmentBestComparison(player) {
    const squad = careerState.squad || [];
    if (!squad.length) return null;
    return squad.slice().sort((a, b) => {
      const aRole = a.role === player.role ? 20 : a.secondaryRole === player.role ? 8 : 0;
      const bRole = b.role === player.role ? 20 : b.secondaryRole === player.role ? 8 : 0;
      return (bRole + teamPlayerOverall(b)) - (aRole + teamPlayerOverall(a));
    })[0] || null;
  }

  function recruitmentMobileCarouselHintMarkup(count) {
    if (count <= 1) return '';
    return `<div class="recruitment-mobile-carousel-controls" data-recruitment-carousel-controls>
      <button type="button" data-recruitment-carousel-step="-1" aria-label="Previous recruitment candidate">&#8249;</button>
      <div><span>SWIPE CANDIDATES</span><strong data-recruitment-carousel-position aria-live="polite">1 OF ${count}</strong><small>Swipe the card or use the arrows.</small></div>
      <button type="button" data-recruitment-carousel-step="1" aria-label="Next recruitment candidate">&#8250;</button>
    </div>`;
  }

  function recruitmentCarouselElements() {
    const controls = document.querySelector('[data-recruitment-carousel-controls]');
    const zone = controls?.closest('.recruitment-candidate-zone');
    const track = zone?.querySelector('.team-market-list');
    const cards = track ? Array.from(track.querySelectorAll(':scope > [data-recruitment-card]')) : [];
    return { controls, track, cards };
  }

  function recruitmentCarouselActiveIndex(track, cards) {
    if (!track || !cards.length) return 0;
    const trackBox = track.getBoundingClientRect();
    const centre = trackBox.left + trackBox.width * 0.5;
    let closest = 0;
    let distance = Infinity;
    cards.forEach((card, index) => {
      const box = card.getBoundingClientRect();
      const nextDistance = Math.abs((box.left + box.width * 0.5) - centre);
      if (nextDistance < distance) {
        distance = nextDistance;
        closest = index;
      }
    });
    return closest;
  }

  function updateRecruitmentCarouselControls() {
    const { controls, track, cards } = recruitmentCarouselElements();
    if (!controls || !track || !cards.length) return;
    const index = recruitmentCarouselActiveIndex(track, cards);
    recruitmentCarouselActiveId = String(cards[index]?.dataset.recruitmentCard || recruitmentCarouselActiveId || '');
    const position = controls.querySelector('[data-recruitment-carousel-position]');
    if (position) position.textContent = `${index + 1} OF ${cards.length}`;
    const previous = controls.querySelector('[data-recruitment-carousel-step="-1"]');
    const next = controls.querySelector('[data-recruitment-carousel-step="1"]');
    if (previous) previous.disabled = index <= 0;
    if (next) next.disabled = index >= cards.length - 1;
  }

  function recruitmentCarouselScrollTo(index, behavior = 'smooth') {
    const { track, cards } = recruitmentCarouselElements();
    if (!track || !cards.length) return false;
    const targetIndex = clamp(Math.round(Number(index) || 0), 0, cards.length - 1);
    const card = cards[targetIndex];
    const trackBox = track.getBoundingClientRect();
    const cardBox = card.getBoundingClientRect();
    const targetLeft = track.scrollLeft + (cardBox.left - trackBox.left) - ((track.clientWidth - cardBox.width) * 0.5);
    recruitmentCarouselActiveId = String(card.dataset.recruitmentCard || '');
    track.scrollTo({ left: Math.max(0, targetLeft), behavior });
    window.setTimeout(updateRecruitmentCarouselControls, behavior === 'smooth' ? 360 : 0);
    return true;
  }

  function moveRecruitmentCarousel(direction) {
    const { track, cards } = recruitmentCarouselElements();
    if (!track || cards.length <= 1) return false;
    const current = recruitmentCarouselActiveIndex(track, cards);
    return recruitmentCarouselScrollTo(current + (Number(direction) < 0 ? -1 : 1));
  }

  function bindRecruitmentCarousel() {
    const { track, cards } = recruitmentCarouselElements();
    if (!track || !cards.length || window.innerWidth > 820) return;
    if (track.dataset.carouselBound !== 'true') {
      track.dataset.carouselBound = 'true';
      track.addEventListener('scroll', () => {
        if (recruitmentCarouselScrollFrame) cancelAnimationFrame(recruitmentCarouselScrollFrame);
        recruitmentCarouselScrollFrame = requestAnimationFrame(() => {
          recruitmentCarouselScrollFrame = 0;
          updateRecruitmentCarouselControls();
        });
      }, { passive: true });
    }
    const remembered = recruitmentCarouselActiveId
      ? cards.findIndex(card => String(card.dataset.recruitmentCard || '') === recruitmentCarouselActiveId)
      : -1;
    if (remembered > 0) recruitmentCarouselScrollTo(remembered, 'auto');
    else updateRecruitmentCarouselControls();
  }

  function renderRecruitmentShortlist() {
    const players = recruitmentState().shortlistIds.map(id => transferMarketPlayer(id)).filter(Boolean);
    if (!players.length) return `${recruitmentComparisonTrayMarkup()}${recruitmentComparisonPanelMarkup()}<section class="recruitment-empty"><strong>SHORTLIST EMPTY</strong><p>Add candidates from the market to monitor their scouting confidence, rival bids and contract situation.</p><button data-recruitment-view="market">BROWSE MARKET</button></section>`;
    const recommendations = recruitmentRecommendationMap(players);
    return `${recruitmentComparisonTrayMarkup()}${recruitmentComparisonPanelMarkup()}<section class="recruitment-shortlist-grid">${players.map(player => {
      const comparison = recruitmentBestComparison(player);
      const knowledge = recruitmentKnowledge(player);
      const compared = recruitmentComparisonIds.includes(String(player.id));
      return `<article class="recruitment-shortlist-card ${compared ? 'compared' : ''}"><header><div><span>${teamRoleById(player.role).name}</span><strong>${escapeCareerHtml(player.name)}</strong></div><button data-recruitment-shortlist="${player.id}" aria-label="Remove ${escapeCareerHtml(player.name)} from shortlist">×</button></header>${recruitmentRecommendationBadges(player, recommendations)}${renderRecruitmentKnowledge(player)}<div class="recruitment-shortlist-facts"><div><span>ABILITY</span><strong>${recruitmentAbilityDisplay(player)}</strong></div><div><span>POTENTIAL</span><strong>${recruitmentAbilityDisplay(player, true)}</strong></div><div><span>VALUE</span><strong>${recruitmentMoneyDisplay(player.value, knowledge)}</strong></div><div><span>CONTRACT</span><strong>${knowledge >= 64 ? `${player.contractWeeks} WEEKS` : 'ESTIMATE PENDING'}</strong></div></div><p>${comparison ? `Closest squad comparison: <strong>${escapeCareerHtml(comparison.name)}</strong> (${teamPlayerOverall(comparison)} OVR).` : 'No contracted player available for comparison.'}</p><p class="recruitment-shortlist-impact">${escapeCareerHtml(recruitmentCandidateAssessment(player).detail)}</p><footer><button class="compare-toggle ${compared ? 'active' : ''}" data-recruitment-compare="${player.id}">${compared ? 'REMOVE' : 'ADD TO COMPARE'}</button><button data-team-profile="${player.id}">OPEN REPORT</button><button class="primary" data-transfer-start="${player.id}" aria-label="Negotiate contract and transfer terms with ${escapeCareerHtml(player.name)}" ${recruitmentTransferWindowOpenFor(player) ? '' : 'disabled'}>NEGOTIATE</button></footer></article>`;
    }).join('')}</section>`;
  }

  function recruitmentAssignmentSummary(assignment) {
    const role = assignment.roleId === 'any' ? 'ANY ROLE' : teamRoleById(assignment.roleId).name;
    const age = RECRUITMENT_AGE_BANDS[assignment.ageBand]?.label || 'ANY AGE';
    const ability = RECRUITMENT_ABILITY_BANDS[assignment.abilityBand]?.label || 'ANY LEVEL';
    return `${role} · ${age} · ${ability}`;
  }

  function renderRecruitmentAssignments() {
    const state = recruitmentState();
    const roleOptions = `<option value="any">ANY ROLE</option>${TEAM_ROLES.map(role => `<option value="${role.id}" ${state.assignmentDraft.roleId === role.id ? 'selected' : ''}>${role.name}</option>`).join('')}`;
    const ageOptions = Object.values(RECRUITMENT_AGE_BANDS).map(item => `<option value="${item.id}" ${state.assignmentDraft.ageBand === item.id ? 'selected' : ''}>${item.label}</option>`).join('');
    const abilityOptions = Object.values(RECRUITMENT_ABILITY_BANDS).map(item => `<option value="${item.id}" ${state.assignmentDraft.abilityBand === item.id ? 'selected' : ''}>${item.label}</option>`).join('');
    const assignments = state.assignments.length ? state.assignments.map(assignment => {
      const results = (assignment.resultIds || []).map(id => transferMarketPlayer(id)).filter(Boolean);
      return `<article class="recruitment-assignment-card ${assignment.status}"><header><div><span>${assignment.status === 'active' ? `${assignment.daysRemaining} DAYS REMAINING` : assignment.status.toUpperCase()}</span><strong>${recruitmentAssignmentSummary(assignment)}</strong></div>${assignment.status === 'active' ? `<button data-recruitment-cancel-assignment="${assignment.id}">CANCEL</button>` : ''}</header><i><b style="width:${assignment.status === 'complete' ? 100 : Math.max(8, (RECRUITMENT_ASSIGNMENT_DAYS - assignment.daysRemaining) / RECRUITMENT_ASSIGNMENT_DAYS * 100)}%"></b></i>${results.length ? `<div class="recruitment-assignment-results">${results.map(player => `<button data-team-profile="${player.id}"><strong>${escapeCareerHtml(player.name)}</strong><small>${teamRoleById(player.role).name} · ${recruitmentAbilityDisplay(player)} OVR EST.</small></button>`).join('')}</div>` : '<p>The network is observing matching candidates and improving report accuracy each day.</p>'}</article>`;
    }).join('') : '<div class="recruitment-empty compact"><strong>NO ACTIVE ASSIGNMENTS</strong><p>Create a targeted brief to improve scouting confidence on matching candidates over three simulated days.</p></div>';
    const atLimit = state.assignments.filter(item => item.status === 'active').length >= recruitmentAssignmentLimit();
    return `<section class="recruitment-assignment-builder"><div class="career-section-head"><div><span>RECRUITMENT BRIEF</span><strong>CREATE ASSIGNMENT</strong></div><p>Target a role, age profile and ability level. Better staff produce faster and more accurate reports.</p></div><div class="recruitment-assignment-controls"><label><span>ROLE</span><select data-recruitment-draft="roleId">${roleOptions}</select></label><label><span>AGE</span><select data-recruitment-draft="ageBand">${ageOptions}</select></label><label><span>ABILITY</span><select data-recruitment-draft="abilityBand">${abilityOptions}</select></label><button class="primary" data-recruitment-start-assignment ${atLimit ? 'disabled' : ''}>START ${RECRUITMENT_ASSIGNMENT_DAYS}-DAY SEARCH</button></div></section><section class="recruitment-assignment-list">${assignments}</section>`;
  }

  function renderEnhancedRecruitmentTab() {
    noteTeamManagementRoute('market');
    const state = recruitmentState();
    const wageBill = typeof clubTotalWageBill === 'function' ? clubTotalWageBill() : teamSquadWageBill();
    const windowState = recruitmentTransferWindowStatus();
    const marketPlayers = Array.isArray(careerState.market) ? careerState.market : [];
    const knowledgeAverage = marketPlayers.length ? Math.round(marketPlayers.reduce((sum, player) => sum + recruitmentKnowledge(player), 0) / marketPlayers.length) : 0;
    const recommendationMap = recruitmentRecommendationMap(marketPlayers);
    const beginnerMode = recruitmentBeginnerMode();
    if (!beginnerMode) recruitmentBeginnerExpanded = false;
    const focusedBeginner = beginnerMode && !recruitmentBeginnerExpanded;
    const displayedPlayers = focusedBeginner ? recruitmentBeginnerCandidates(marketPlayers, recommendationMap, 6) : marketPlayers;
    const candidateRows = displayedPlayers.map(player => renderRecruitmentPlayerRow(player, recommendationMap)).join('');
    const mobileCarouselHint = recruitmentMobileCarouselHintMarkup(displayedPlayers.length);
    const focusedMarket = `<section class="recruitment-candidate-zone recruitment-beginner-zone">${recruitmentSigningUpdateMarkup()}${recruitmentBeginnerCandidateHeading(displayedPlayers.length, marketPlayers.length)}${recruitmentComparisonTrayMarkup()}${recruitmentComparisonPanelMarkup()}${mobileCarouselHint}<section class="team-market-list" data-guide-target="recruitment-candidates">${candidateRows}</section>${recruitmentNeedsPanelMarkup(false)}${recruitmentRoleGuideMarkup(true)}</section>`;
    const fullMarket = `<section class="recruitment-candidate-zone" data-guide-target="recruitment-candidates">${recruitmentNeedsPanelMarkup()}${recruitmentRoleGuideMarkup()}${recruitmentComparisonTrayMarkup()}${recruitmentComparisonPanelMarkup()}${mobileCarouselHint}<section class="team-market-list">${candidateRows}</section></section>`;
    const viewContent = focusedBeginner
      ? focusedMarket
      : state.view === 'shortlist'
        ? renderRecruitmentShortlist()
        : state.view === 'assignments'
          ? renderRecruitmentAssignments()
          : fullMarket;
    const toolbar = focusedBeginner ? '' : renderRecruitmentToolbar(state.view);
    const hero = focusedBeginner
      ? `<div class="menu-hero career-hero team-market-hero recruitment-beginner-hero"><div class="menu-hero-main menu-briefing-panel"><div class="menu-kicker">GUIDED RECRUITMENT</div><h2>BUILD THE FIRST ACTIVE FIVE</h2><p>Ignore the wider scouting network for now. Open one report, compare two recommended operators and negotiate with the candidate who best fits the squad and budget.</p><div class="menu-pill-row"><span class="menu-pill">${displayedPlayers.length} RECOMMENDED</span><span class="menu-pill">${(careerState.squad || []).length} / ${TEAM_REQUIRED_STARTERS} CONTRACTED</span><span class="menu-pill">${teamCredits(careerState.credits)} CLUB CASH</span><span class="menu-pill">${teamCredits(Math.max(0, careerState.wageBudget - wageBill))} WAGE HEADROOM</span></div></div><div class="menu-hero-side"><div class="menu-kicker">CURRENT MILESTONE</div><div class="menu-side-operator">${(careerState.squad || []).length} / ${TEAM_REQUIRED_STARTERS}</div><p>Fill the deployment places, then the guide moves you directly to line-up review and tactics.</p></div></div>`
      : `<div class="menu-hero career-hero team-market-hero"><div class="menu-hero-main menu-briefing-panel"><div class="menu-kicker">RECRUITMENT DEPARTMENT</div><h2>SCOUTING NETWORK // WEEK ${careerState.week}</h2><p>Reports begin as estimates. Scouting confidence shows how reliable the displayed ability, potential, fee, wage and medical information is; assignments improve it over time. Shortlist targets and monitor rival bids before negotiating.</p><div class="menu-pill-row"><span class="menu-pill">${marketPlayers.length} MARKET PLAYERS</span><span class="menu-pill">${knowledgeAverage}% AVG REPORT CONFIDENCE</span><span class="menu-pill">${teamCredits(careerState.credits)} BALANCE</span><span class="menu-pill">${teamCredits(wageBill)} / ${teamCredits(careerState.wageBudget)} WAGES</span></div></div><div class="menu-hero-side"><div class="menu-kicker">TRANSFER WINDOW</div><div class="menu-side-operator">${windowState.open ? 'OPEN' : 'CLOSED'}</div><p>${escapeCareerHtml(windowState.phase)} · ${escapeCareerHtml(windowState.detail)}</p></div></div>`;
    const advancedControls = focusedBeginner ? '' : `<section class="club-pool-control player-pool"><label><span>PLAYER SEARCH POOL</span><select disabled>${clubCurrentPoolOptions('players')}</select></label><p>${leagueDivisionPoolLabel()} access · Scout quality ${recruitmentScoutQuality()}/100. Promotion unlocks stronger pools. Commissioning a search rotates up to three low-priority listings while protecting shortlisted targets and active negotiations.</p><button data-team-refresh-market ${careerState.credits < TEAM_MARKET_REFRESH_COST ? 'disabled' : ''}>COMMISSION SEARCH · ${teamCredits(TEAM_MARKET_REFRESH_COST)}</button></section>${typeof dynamicMarketPulseMarkup === 'function' ? dynamicMarketPulseMarkup() : ''}`;
    const beginnerPanel = beginnerMode ? recruitmentBeginnerPanelMarkup(displayedPlayers.length, marketPlayers.length) : '';
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(bindRecruitmentCarousel);
    if (focusedBeginner) return `${beginnerPanel}${viewContent}`;
    return `${renderTeamTutorialPanel()}${renderClubCalendarStrip()}${toolbar}${hero}${beginnerPanel}${advancedControls}${viewContent}`;
  }

  function renderCommercialTab() {
    const state = sponsorshipState();
    const active = state.active;
    const activeBrand = active ? sponsorBrand(active.brandId) : null;
    const offers = sponsorshipPendingOffers();
    const score = sponsorshipPerformanceScore();
    const activeMarkup = active && activeBrand ? `<section class="commercial-active-card ${activeBrand.className}"><div class="commercial-brand-visual">${sponsorLogoMarkup(activeBrand)}</div><div class="commercial-active-details"><span>ACTIVE BROADCAST PARTNER</span><h3>${escapeCareerHtml(activeBrand.name)}</h3><p>${escapeCareerHtml(activeBrand.profile)}</p><div class="commercial-deal-grid"><div><span>WEEKS LEFT</span><strong>${active.remainingWeeks}</strong></div><div><span>WEEKLY</span><strong>${teamCredits(active.weekly)}</strong></div><div><span>WIN BONUS</span><strong>${teamCredits(active.winBonus)}</strong></div><div><span>SWEEP BONUS</span><strong>${teamCredits(active.sweepBonus)}</strong></div><div><span>TOTAL PAID</span><strong>${teamCredits(active.totalPaid)}</strong></div></div></div></section>` : `<section class="commercial-empty"><strong>NO ACTIVE SPONSOR</strong><p>Commercial proposals are generated from league level, reputation, recent results and win rate. Stronger performance attracts richer and longer agreements.</p><button data-sponsor-generate ${offers.length ? 'disabled' : ''}>REQUEST COMMERCIAL REVIEW</button></section>`;
    const offersMarkup = offers.length ? offers.map(offer => {
      const brand = sponsorBrand(offer.brandId);
      return `<article class="commercial-offer-card ${brand.className}" data-management-target-id="sponsor:${escapeCareerHtml(offer.id)}"><header>${sponsorLogoMarkup(brand)}<span>${offer.quality}</span></header><p>${escapeCareerHtml(brand.profile)}</p><div class="commercial-deal-grid"><div><span>SIGNING PAYMENT</span><strong>${teamCredits(offer.upfront)}</strong></div><div><span>DURATION</span><strong>${offer.durationWeeks} WEEKS</strong></div><div><span>WEEKLY</span><strong>${teamCredits(offer.weekly)}</strong></div><div><span>WIN BONUS</span><strong>${teamCredits(offer.winBonus)}</strong></div><div><span>3–0 SWEEP</span><strong>${teamCredits(offer.sweepBonus)}</strong></div><div><span>EXPIRES</span><strong>${Math.max(0, offer.expiresDay - clubCalendarState().absoluteDay)} DAYS</strong></div></div><footer><button data-sponsor-reject="${offer.id}">DECLINE</button><button class="primary" data-sponsor-accept="${offer.id}">ACCEPT DEAL</button></footer></article>`;
    }).join('') : '<div class="commercial-no-offers"><span>NO LIVE PROPOSALS</span><p>Continue winning matches and improving the club reputation. Commercial reviews can arrive after fixtures or during weekly planning.</p></div>';
    return `${renderClubCalendarStrip()}<div class="menu-hero career-hero commercial-hero"><div class="menu-hero-main menu-briefing-panel"><div class="menu-kicker">COMMERCIAL DEPARTMENT</div><h2>SPONSORSHIP & BROADCAST PARTNERS</h2><p>Choose from fictional brands with different guaranteed income and performance incentives. The active partner appears as an authentic promotion bug in the spectator feed.</p><div class="menu-pill-row"><span class="menu-pill">COMMERCIAL SCORE ${score}</span><span class="menu-pill">REPUTATION ${careerState.reputation}</span><span class="menu-pill">${offers.length} LIVE OFFER${offers.length === 1 ? '' : 'S'}</span><span class="menu-pill">${activeBrand ? activeBrand.short : 'UNSPONSORED'}</span></div></div><div class="menu-hero-side"><div class="menu-kicker">MARKET POSITION</div><div class="menu-side-operator">${sponsorshipOfferQualityLabel(score).split(' ')[0]}</div><p>${sponsorshipOfferQualityLabel(score)}</p></div></div>${activeMarkup}<section class="commercial-offers"><div class="career-section-head"><div><span>AVAILABLE PROPOSALS</span><strong>SPONSOR OFFERS</strong></div><p>Only one broadcast partner may be active. Pending offers require a decision before End Day.</p></div><div class="commercial-offer-grid">${offersMarkup}</div></section>`;
  }

  function recruitmentPromiseReview() {
    const week = Math.max(1, Number(careerState.week) || 1);
    const squad = careerState.squad || [];
    for (let squadIndex = 0; squadIndex < squad.length; squadIndex++) {
      const player = squad[squadIndex];
      const promise = player.contractPromise;
      if (!promise || promise.reviewed || week < Number(promise.reviewWeek)) continue;
      const starts = Math.max(0, Number(player.career?.matches) || 0) - Math.max(0, Number(promise.matchesAtSigning) || 0);
      const required = Math.max(0, Number(promise.requiredStarts) || 0);
      promise.reviewed = true;
      promise.fulfilled = starts >= required;
      player.happiness = clamp((Number(player.happiness) || 70) + (promise.fulfilled ? 6 : -14), 1, 100);
      player.morale = clamp((Number(player.morale) || 70) + (promise.fulfilled ? 4 : -8), 1, 100);
      clubAddMail(`${player.name} playing-time review`, promise.fulfilled
        ? `${player.name} believes the ${promise.statusLabel.toLowerCase()} commitment has been honoured and is more settled at the club.`
        : `${player.name} believes the promised ${promise.statusLabel.toLowerCase()} role has not been honoured. Happiness and morale have fallen.`, 'CONTRACTS', true, 'profile');
      if (!promise.fulfilled && player.happiness < 42 && !player.transferRequested) {
        player.transferRequested = true;
        player.transferInterest = player.transferInterest || { score: 0, label: 'LIMITED INTEREST', clubs: [] };
        player.transferInterest.score = Math.max(58, Number(player.transferInterest.score) || 0);
        player.transferInterest.label = 'TRANSFER REQUEST SUBMITTED';
        clubAddMail(`${player.name} requests a transfer`, `${player.name} has asked to leave after the playing-time commitment was not met. Rival interest is likely to increase.`, 'TRANSFERS', true, 'transfers');
      }
    }
    for (let squadIndex = TEAM_REQUIRED_STARTERS; squadIndex < squad.length; squadIndex++) {
      const player = squad[squadIndex];
      const unusedWeeks = week - Math.max(1, Number(player.joinedWeek) || 1);
      if (unusedWeeks < 4 || player.transferRequested || Number(player.career?.matches) > 0 || player.happiness >= 46) continue;
      player.transferRequested = true;
      player.transferInterest = player.transferInterest || { score: 0, label: 'LIMITED INTEREST', clubs: [] };
      player.transferInterest.score = Math.max(55, Number(player.transferInterest.score) || 0);
      player.transferInterest.label = 'SEEKING FIRST-TEAM FOOTBALL';
      clubAddMail(`${player.name} wants more first-team football`, `${player.name} has remained outside the active operator line-up and is now open to a move unless their role changes.`, 'CONTRACTS', true, 'profile');
    }
  }

  function recruitmentMatchAppearanceCosts() {
    let total = 0;
    for (const player of (careerState.squad || []).slice(0, TEAM_REQUIRED_STARTERS)) total += Math.max(0, Number(player.appearanceBonus) || 0);
    if (total > 0) {
      careerState.credits -= total;
      teamFinanceTransaction('BONUS', -total, 'Starting-five appearance bonuses');
    }
    return total;
  }

  const basePlayerMarketValueRecruitment = playerMarketValue;
  playerMarketValue = function enhancedPlayerMarketValue(player) {
    const baseValue = basePlayerMarketValueRecruitment(player);
    const tier = normaliseLeagueTier(careerState.league?.divisionTier);
    const leagueMultiplier = [1.20, 1.10, 1.00, 0.92][tier] || 1;
    return Math.max(18000, Math.round(baseValue * leagueMultiplier / 1000) * 1000);
  };

  function ensureRecruitmentCommercialState() {
    recruitmentState();
    sponsorshipState();
    const marketIds = new Set((careerState.market || []).map(player => player.id));
    careerState.recruitment.shortlistIds = careerState.recruitment.shortlistIds.filter(id => marketIds.has(id));
    for (const player of careerState.market || []) recruitmentReport(player);
    updateSponsorHud();
  }

  const baseEnsureTeamManagementStateForRecruitment = ensureTeamManagementState;
  ensureTeamManagementState = function enhancedEnsureTeamManagementState() {
    const result = baseEnsureTeamManagementStateForRecruitment();
    ensureRecruitmentCommercialState();
    return result;
  };

  const baseStartIncomingTransferNegotiation = startIncomingTransferNegotiation;
  startIncomingTransferNegotiation = function enhancedStartIncomingTransferNegotiation(playerId) {
    const player = transferMarketPlayer(playerId);
    if (player && !recruitmentTransferWindowOpenFor(player)) return { ok: false, reason: 'The permanent transfer window is closed. Free agents remain available.' };
    const result = baseStartIncomingTransferNegotiation(playerId);
    if (!result.ok) return result;
    const deal = transferState().activeIncoming;
    const overall = teamPlayerOverall(result.player);
    deal.signingBonus = transferRoundMoney(Math.max(2000, result.player.wage * (2 + overall / 30)), 1000);
    deal.appearanceBonus = transferRoundMoney(Math.max(100, result.player.wage * 0.08), 100);
    deal.squadStatus = overall >= 68 ? 'key' : overall >= 55 ? 'starter' : overall >= 44 ? 'rotation' : 'prospect';
    deal.deadlineDay = clubCalendarState().absoluteDay + 3;
    recruitmentObservePlayer(result.player, 12, 'FORMAL NEGOTIATION');
    saveCareerState();
    return result;
  };

  const baseAdjustIncomingTransfer = adjustIncomingTransfer;
  adjustIncomingTransfer = function enhancedAdjustIncomingTransfer(field, direction) {
    const deal = transferState().activeIncoming;
    if (!deal) return false;
    const sign = direction < 0 ? -1 : 1;
    if (field === 'signingBonus') deal.signingBonus = Math.max(0, transferRoundMoney((Number(deal.signingBonus) || 0) + sign * 1000, 1000));
    else if (field === 'appearanceBonus') deal.appearanceBonus = Math.max(0, transferRoundMoney((Number(deal.appearanceBonus) || 0) + sign * 100, 100));
    else if (field === 'squadStatus') {
      const statuses = ['prospect','rotation','starter','key'];
      const current = Math.max(0, statuses.indexOf(deal.squadStatus));
      deal.squadStatus = statuses[clamp(current + sign, 0, statuses.length - 1)];
    } else return baseAdjustIncomingTransfer(field, direction);
    deal.status = 'draft';
    saveCareerState();
    updateMenuUI();
    return true;
  };

  submitIncomingTransferOffer = function enhancedSubmitIncomingTransferOffer() {
    const deal = transferState().activeIncoming;
    const player = deal ? transferMarketPlayer(deal.playerId) : null;
    if (!deal || !player || !['draft','countered'].includes(deal.status)) return { ok: false, reason: 'No active negotiation.' };
    deal.lastSubmitted = {
      round: deal.round, fee: deal.offeredFee, wage: deal.offeredWage,
      contractWeeks: deal.offeredContractWeeks, signingBonus: deal.signingBonus,
      appearanceBonus: deal.appearanceBonus, squadStatus: deal.squadStatus
    };
    if (Number(deal.deadlineDay) < clubCalendarState().absoluteDay) {
      deal.status = 'rejected';
      deal.message = 'The response deadline passed and the representatives have left negotiations.';
      deal.lastResponseStatus = deal.status;
      deal.lastResponseMessage = deal.message;
      saveCareerState();
      updateMenuUI();
      return { ok: false, status: deal.status, submitted: { ...deal.lastSubmitted }, message: deal.message };
    }
    const feeRatio = deal.freeAgent ? 1 : deal.offeredFee / Math.max(1, deal.askingFee);
    const wageRatio = deal.offeredWage / Math.max(1, deal.requestedWage);
    const contractScore = deal.offeredContractWeeks >= deal.requestedContractWeeks ? 1 : deal.offeredContractWeeks / deal.requestedContractWeeks;
    const bonusTarget = Math.max(1000, player.wage * 2.4);
    const signingScore = Math.min(1.12, (Number(deal.signingBonus) || 0) / bonusTarget);
    const appearanceTarget = Math.max(100, player.wage * 0.07);
    const appearanceScore = Math.min(1.10, (Number(deal.appearanceBonus) || 0) / appearanceTarget);
    const statusValues = { prospect: 0.72, rotation: 0.86, starter: 1.00, key: 1.08 };
    const desiredStatus = teamPlayerOverall(player) >= 66 ? 'key' : teamPlayerOverall(player) >= 53 ? 'starter' : teamPlayerOverall(player) >= 42 ? 'rotation' : 'prospect';
    const statusScore = Math.min(1.08, (statusValues[deal.squadStatus] || 0.72) / (statusValues[desiredStatus] || 1));
    const score = feeRatio * 0.39 + wageRatio * 0.28 + contractScore * 0.10 + signingScore * 0.09 + appearanceScore * 0.05 + statusScore * 0.09;
    if (score >= 0.965) {
      deal.status = 'agreed';
      deal.message = `${player.name} and the selling club accepted the complete package, including ${deal.squadStatus.toUpperCase()} squad status.`;
      clubAddMail(`Terms agreed with ${player.name}`, `The complete transfer, wage, bonus and playing-time package has been accepted. Registration must now be confirmed.`, 'TRANSFERS', true, 'transfers');
    } else if (deal.round >= 3 && score < 0.80) {
      deal.status = 'rejected';
      deal.message = 'Negotiations broke down after the representatives rejected the overall package.';
    } else {
      deal.round++;
      deal.status = 'countered';
      deal.askingFee = deal.freeAgent ? deal.askingFee : transferRoundMoney(Math.max(deal.offeredFee, deal.askingFee * 0.95));
      deal.requestedWage = transferRoundMoney(Math.max(deal.offeredWage, deal.requestedWage * 0.98), 100);
      deal.signingBonus = transferRoundMoney(Math.max(deal.signingBonus, bonusTarget * 0.9), 1000);
      deal.message = `Counter received. Representatives want a stronger total package and clearer playing-time commitment.`;
    }
    deal.lastResponseStatus = deal.status;
    deal.lastResponseMessage = deal.message;
    saveCareerState();
    updateMenuUI();
    return { ok: deal.status === 'agreed', status: deal.status, submitted: { ...deal.lastSubmitted }, message: deal.message };
  };

  const baseCompleteIncomingTransfer = completeIncomingTransfer;
  completeIncomingTransfer = function enhancedCompleteIncomingTransfer() {
    const deal = transferState().activeIncoming;
    const player = deal ? transferMarketPlayer(deal.playerId) : null;
    if (deal && player && !recruitmentTransferWindowOpenFor(player)) return { ok: false, reason: 'The permanent transfer window closed before registration.' };
    const signingBonus = Math.max(0, Number(deal?.signingBonus) || 0);
    if (deal && careerState.credits < Number(deal.offeredFee || 0) + signingBonus) return { ok: false, reason: 'Insufficient credits for the fee and signing bonus.' };
    const snapshot = deal ? { ...deal } : null;
    const squadBeforeSigning = (careerState.squad || []).slice();
    const result = baseCompleteIncomingTransfer();
    if (!result.ok || !snapshot) return result;
    if (signingBonus > 0) {
      careerState.credits -= signingBonus;
      teamFinanceTransaction('BONUS', -signingBonus, `${result.player.name} signing bonus`);
    }
    result.player.appearanceBonus = Math.max(0, Number(snapshot.appearanceBonus) || 0);
    const statusMap = { prospect: ['PROSPECT', 1], rotation: ['ROTATION', 2], starter: ['REGULAR STARTER', 3], key: ['KEY PLAYER', 4] };
    const status = statusMap[snapshot.squadStatus] || statusMap.rotation;
    result.player.squadStatus = snapshot.squadStatus || 'rotation';
    result.signingBonus = signingBonus;
    result.appearanceBonus = result.player.appearanceBonus;
    result.squadStatusLabel = status[0];
    result.player.contractPromise = {
      status: result.player.squadStatus,
      statusLabel: status[0],
      requiredStarts: status[1],
      matchesAtSigning: Math.max(0, Number(result.player.career?.matches) || 0),
      reviewWeek: Math.max(1, Number(careerState.week) || 1) + 4,
      reviewed: false,
      fulfilled: false
    };
    recruitmentState().shortlistIds = recruitmentState().shortlistIds.filter(id => id !== result.player.id);
    delete recruitmentState().reports[result.player.id];
    clubAddMail(`${result.player.name} contract commitments`, `${status[0]} status was promised, with ${status[1]} starts expected during the next four weeks. Appearance bonuses are ${teamCredits(result.player.appearanceBonus)} per match.`, 'CONTRACTS', true, 'profile');
    recruitmentRecordSigningUpdate(result.player, squadBeforeSigning);
    saveCareerState();
    updateMenuUI();
    return result;
  };

  const baseRecruitTeamPlayerDecisionSupport = recruitTeamPlayer;
  recruitTeamPlayer = function recruitmentDecisionSupportRecruitPlayer(id) {
    const squadBeforeSigning = (careerState.squad || []).slice();
    const result = baseRecruitTeamPlayerDecisionSupport(id);
    if (result?.ok) {
      recruitmentRecordSigningUpdate(result.player, squadBeforeSigning);
      updateMenuUI();
    }
    return result;
  };

  const baseRenderIncomingNegotiation = renderIncomingNegotiation;
  renderIncomingNegotiation = function enhancedRenderIncomingNegotiation() {
    const base = baseRenderIncomingNegotiation();
    const deal = transferState().activeIncoming;
    if (!deal) return base;
    const statusLabels = { prospect: 'PROSPECT', rotation: 'ROTATION', starter: 'REGULAR STARTER', key: 'KEY PLAYER' };
    const additions = `<div class="transfer-value-grid transfer-bonus-grid">${renderTransferValueControl('SIGNING BONUS', 'signingBonus', teamCredits(deal.signingBonus || 0), 'ONE-OFF PLAYER PAYMENT')}${renderTransferValueControl('APPEARANCE BONUS', 'appearanceBonus', `${teamCredits(deal.appearanceBonus || 0)} / MATCH`, 'PAID WHEN SELECTED')}${renderTransferValueControl('SQUAD STATUS', 'squadStatus', statusLabels[deal.squadStatus] || 'ROTATION', 'CREATES A PLAYING-TIME PROMISE')}</div><div class="transfer-deadline"><span>RESPONSE DEADLINE</span><strong>${Math.max(0, Number(deal.deadlineDay) - clubCalendarState().absoluteDay)} DAYS</strong></div>`;
    return base.replace('<div class="transfer-message">', `${additions}<div class="transfer-message">`);
  };

  const baseRenderTransferCentreTab = renderTransferCentreTab;
  renderTransferCentreTab = function enhancedRenderTransferCentreTab() {
    const html = baseRenderTransferCentreTab();
    const windowState = recruitmentTransferWindowStatus();
    return html.replace('<div class="menu-side-operator">OPEN</div><p>', `<div class="menu-side-operator">${windowState.open ? 'OPEN' : 'CLOSED'}</div><p>${escapeCareerHtml(windowState.phase)} · `);
  };

  const baseRenderTeamAttributeRows = renderTeamAttributeRows;
  renderTeamAttributeRows = function enhancedRenderTeamAttributeRows(player, allowAllocation = false) {
    const contracted = (careerState.squad || []).some(item => item.id === player?.id);
    if (contracted || allowAllocation) return baseRenderTeamAttributeRows(player, allowAllocation);
    const knowledge = recruitmentKnowledge(player);
    return Object.entries(CAREER_STAT_DEFS).map(([key, meta]) => {
      const value = clamp(Number(player?.stats?.[key]) || 0, 0, CAREER_MAX_STAT);
      const estimate = recruitmentEstimateRange(value, knowledge, 0, CAREER_MAX_STAT, true);
      const display = knowledge >= 88 ? String(value) : `${estimate.low}–${estimate.high}`;
      const midpoint = knowledge >= 88 ? value : (estimate.low + estimate.high) / 2;
      return `<div class="team-attribute-row scouting-estimate ${key.startsWith('critical') ? 'critical-stat' : ''}"><span><strong>${meta.label}</strong><small>${knowledge >= 88 ? meta.affects : 'Scouting estimate · improve report confidence'}</small></span><i><b style="width:${midpoint * 10}%"></b></i><em>${display}</em></div>`;
    }).join('');
  };

  const baseRenderTeamPlayerProfileTab = renderTeamPlayerProfileTab;
  renderTeamPlayerProfileTab = function enhancedRenderTeamPlayerProfileTab() {
    const player = teamPlayerById(selectedTeamPlayerId || careerState.selectedPlayerId) || careerState.market?.[0] || careerState.squad?.[0] || null;
    const contracted = player && (careerState.squad || []).some(item => item.id === player.id);
    if (!player || contracted) return baseRenderTeamPlayerProfileTab();
    recruitmentObservePlayer(player, 4, 'DOSSIER REVIEW');
    const knowledge = recruitmentKnowledge(player);
    let html = baseRenderTeamPlayerProfileTab();
    const overall = teamPlayerOverall(player);
    html = html.replace(`<div class="menu-side-operator">${overall}</div><p>POTENTIAL ${player.potential} · ${teamPotentialLabel(player)}</p>`, `<div class="menu-side-operator">${recruitmentAbilityDisplay(player)}</div><p>POTENTIAL ${recruitmentAbilityDisplay(player, true)} · ${knowledge >= 88 ? teamPotentialLabel(player) : 'SCOUTING ESTIMATE'}</p>`);
    html = html.replace(`<span class="menu-pill">${escapeCareerHtml(player.personality)}</span>`, `<span class="menu-pill">${escapeCareerHtml(recruitmentPersonalityDisplay(player))}</span>`);
    html = html.replace(`<div><span>TRANSFER FEE</span><strong>${teamCredits(player.fee)}</strong></div>`, `<div><span>TRANSFER FEE</span><strong>${recruitmentMoneyDisplay(player.fee, knowledge)}</strong></div>`);
    html = html.replace(`<div><span>ESTIMATED VALUE</span><strong>${teamCredits(player.value)}</strong></div>`, `<div><span>ESTIMATED VALUE</span><strong>${recruitmentMoneyDisplay(player.value, knowledge)}</strong></div>`);
    html = html.replace(`<div><span>WEEKLY WAGE</span><strong>${teamCredits(player.wage)}</strong></div>`, `<div><span>WEEKLY WAGE</span><strong>${recruitmentMoneyDisplay(player.wage, knowledge)}</strong></div>`);
    html = html.replace(`<div><span>CONTRACT</span><strong>${player.contractWeeks} WEEKS</strong></div>`, `<div><span>CONTRACT</span><strong>${knowledge >= 64 ? `${player.contractWeeks} WEEKS` : 'ESTIMATE PENDING'}</strong></div>`);
    html = html.replace(`<div><span>INJURY VULNERABILITY</span><strong>${player.injuryVulnerability}% · ${escapeCareerHtml(typeof playerVulnerabilityLabel === 'function' ? playerVulnerabilityLabel(player) : 'MODERATE')}</strong></div>`, `<div><span>INJURY VULNERABILITY</span><strong>${escapeCareerHtml(recruitmentMedicalDisplay(player))}</strong></div>`);
    const traits = recruitmentTraitVisibility(player);
    const originalTraits = (player.traits || []).map(trait => `<span>${escapeCareerHtml(trait)}</span>`).join('');
    const visibleTraits = traits.length ? traits.map(trait => `<span>${escapeCareerHtml(trait)}</span>`).join('') : '<span class="redacted">TRAITS NOT YET IDENTIFIED</span>';
    html = html.replace(originalTraits, visibleTraits);
    html = html.replace('<div class="team-page-backbar"><button data-team-route="market">← BACK TO RECRUITMENT</button><span>RECRUITMENT DOSSIER</span></div>', `<div class="team-page-backbar"><button data-team-route="market">← BACK TO RECRUITMENT</button><span>SCOUT REPORT · ${knowledge}% CONFIDENCE</span><button class="shortlist-toggle ${recruitmentShortlisted(player.id) ? 'active' : ''}" data-recruitment-shortlist="${player.id}">${recruitmentShortlisted(player.id) ? '★ SHORTLISTED' : '☆ ADD TO SHORTLIST'}</button></div>`);
    if (typeof dynamicMarketPlayerProfileMarkup === 'function') html += dynamicMarketPlayerProfileMarkup(player);
    return html;
  };

  const baseRenderTeamFinancesTab = renderTeamFinancesTab;
  renderTeamFinancesTab = function enhancedRenderTeamFinancesTab() {
    const html = baseRenderTeamFinancesTab();
    const deal = sponsorshipState().active;
    const brand = deal ? sponsorBrand(deal.brandId) : null;
    const commercial = brand ? `<section class="team-finance-panel finance-sponsor-summary"><div class="career-section-head"><div><span>COMMERCIAL INCOME</span><strong>${escapeCareerHtml(brand.name)}</strong></div><p>${deal.remainingWeeks} weeks remaining · ${teamCredits(deal.weekly)} guaranteed weekly.</p></div><div class="commercial-deal-grid"><div><span>TOTAL RECEIVED</span><strong>${teamCredits(deal.totalPaid)}</strong></div><div><span>WIN BONUS</span><strong>${teamCredits(deal.winBonus)}</strong></div><div><span>SWEEP BONUS</span><strong>${teamCredits(deal.sweepBonus)}</strong></div><div><span>PARTNER</span><strong>${escapeCareerHtml(brand.short)}</strong></div></div><button data-team-route="commercial">OPEN COMMERCIAL DEPARTMENT</button></section>` : `<section class="team-finance-panel finance-sponsor-summary"><div class="career-section-head"><div><span>COMMERCIAL INCOME</span><strong>NO ACTIVE SPONSOR</strong></div><p>Performance and reputation determine future proposals.</p></div><button data-team-route="commercial">REVIEW SPONSORSHIP</button></section>`;
    return `${html}${commercial}`;
  };

  const baseClubEndDayBlockersRecruitment = clubEndDayBlockers;
  clubEndDayBlockers = function enhancedClubEndDayBlockers() {
    return baseClubEndDayBlockersRecruitment();
  };

  const baseClubWeeklyCalendarTasksRecruitment = clubWeeklyCalendarTasks;
  clubWeeklyCalendarTasks = function enhancedClubWeeklyCalendarTasks() {
    const beforeWeek = sponsorshipState().lastWeeklyPaidWeek;
    const result = baseClubWeeklyCalendarTasksRecruitment();
    sponsorshipWeeklyProcess();
    recruitmentPromiseReview();
    if (beforeWeek !== sponsorshipState().lastWeeklyPaidWeek) saveCareerState();
    return result;
  };

  const baseTransferProcessDayRecruitment = transferProcessDay;
  transferProcessDay = function enhancedTransferProcessDay() {
    const result = baseTransferProcessDayRecruitment();
    const day = clubCalendarState().absoluteDay;
    recruitmentAiMarketProcess(day);
    recruitmentProcessAssignments(day);
    sponsorshipProcessDay(day);
    saveCareerState();
    return result;
  };

  const baseSettleTeamManagementAfterMatchRecruitment = settleTeamManagementAfterMatch;
  settleTeamManagementAfterMatch = function enhancedSettleTeamManagementAfterMatch(winner, summary) {
    const result = baseSettleTeamManagementAfterMatchRecruitment(winner, summary);
    if (!result) return result;
    const won = winner === TEAM_BLUE;
    const appearanceCosts = recruitmentMatchAppearanceCosts();
    const sponsorBonus = sponsorshipMatchSettlement(won, summary);
    result.finance = result.finance || {};
    result.finance.appearanceBonuses = appearanceCosts;
    result.finance.sponsorBonus = sponsorBonus;
    const state = sponsorshipState();
    if (!state.active && !sponsorshipPendingOffers().length) sponsorshipGenerateOffers(false);
    saveCareerState();
    return result;
  };

  function handleRecruitmentCommercialClick(event) {
    const carouselStep = event.target.closest('[data-recruitment-carousel-step]');
    if (carouselStep) {
      moveRecruitmentCarousel(Number(carouselStep.dataset.recruitmentCarouselStep) || 1);
      return true;
    }
    const beginnerExpand = event.target.closest('[data-recruitment-beginner-expand]');
    const toggleReport = event.target.closest('[data-recruitment-toggle-report]');
    if (toggleReport) {
      const id = String(toggleReport.dataset.recruitmentToggleReport || '');
      const wasExpanded = recruitmentExpandedReportIds.has(id);
      if (wasExpanded) recruitmentExpandedReportIds.delete(id);
      else if (transferMarketPlayer(id)) recruitmentExpandedReportIds.add(id);
      const previousScroll = Number(menuContentEl?.scrollTop) || 0;
      updateMenuUI();
      requestAnimationFrame(() => {
        if (menuContentEl) menuContentEl.scrollTop = previousScroll;
        const escapedId = CSS.escape(id);
        const nextControl = document.querySelector(`[data-recruitment-card="${escapedId}"] [data-recruitment-toggle-report="${escapedId}"]`);
        if (nextControl && typeof nextControl.focus === 'function') nextControl.focus({ preventScroll: true });
      });
      showStatus(wasExpanded ? 'REPORT CLOSED' : 'REPORT OPEN');
      return true;
    }
    if (beginnerExpand) {
      recruitmentBeginnerExpanded = !recruitmentBeginnerExpanded;
      recruitmentState().view = 'market';
      updateMenuUI();
      showStatus(recruitmentBeginnerExpanded ? 'FULL RECRUITMENT TOOLS OPEN' : 'GUIDED SHORTLIST RESTORED');
      requestAnimationFrame(() => {
        const panel = document.querySelector('.recruitment-beginner-panel');
        if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return true;
    }
    const flip = event.target.closest('[data-recruitment-flip]');
    if (flip) {
      const id = String(flip.dataset.recruitmentFlip || '');
      const wasFlipped = recruitmentFlippedIds.has(id);
      if (wasFlipped) recruitmentFlippedIds.delete(id);
      else if (transferMarketPlayer(id)) recruitmentFlippedIds.add(id);
      const previousScroll = Number(menuContentEl?.scrollTop) || 0;
      updateMenuUI();
      requestAnimationFrame(() => {
        if (menuContentEl) menuContentEl.scrollTop = previousScroll;
        const card = Array.from(document.querySelectorAll('[data-recruitment-card]')).find(item => item.dataset.recruitmentCard === id);
        const nextControl = card?.querySelector('.recruitment-mobile-card [data-recruitment-flip]') || card?.querySelector('.recruitment-card-face[aria-hidden="false"] [data-recruitment-flip]') || card?.querySelector('[data-recruitment-flip]');
        if (nextControl && typeof nextControl.focus === 'function') nextControl.focus({ preventScroll: true });
      });
      showStatus(wasFlipped ? 'CANDIDATE SUMMARY' : 'DETAILED SCOUT VIEW');
      return true;
    }
    const toggleComparison = event.target.closest('[data-recruitment-toggle-comparison]');
    if (toggleComparison) {
      if (!recruitmentComparisonIds.length) return true;
      recruitmentComparisonExpanded = !recruitmentComparisonExpanded;
      updateMenuUI();
      showStatus(recruitmentComparisonExpanded ? 'COMPARISON OPEN' : 'COMPARISON HIDDEN');
      if (recruitmentComparisonExpanded) requestAnimationFrame(() => {
        const panel = document.querySelector('[data-recruitment-comparison-panel]');
        if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return true;
    }
    const compare = event.target.closest('[data-recruitment-compare]');
    if (compare) {
      const id = String(compare.dataset.recruitmentCompare || '');
      const index = recruitmentComparisonIds.indexOf(id);
      if (index >= 0) recruitmentComparisonIds.splice(index, 1);
      else if (recruitmentComparisonIds.length >= 3) {
        showManagementBlocked('COMPARISON FULL', 'Remove one of the three selected candidates before adding another.', { returnFocus: compare });
        return true;
      } else if (transferMarketPlayer(id)) recruitmentComparisonIds.push(id);
      const added = index < 0;
      const selectedCount = recruitmentComparisonIds.length;
      if (added && selectedCount >= 2) recruitmentComparisonExpanded = true;
      if (!selectedCount) recruitmentComparisonExpanded = false;
      showStatus(!added ? 'REMOVED FROM COMPARISON' : selectedCount < 2 ? 'SELECT ONE MORE CANDIDATE' : 'COMPARISON READY');
      updateMenuUI();
      if (added && selectedCount >= 2) requestAnimationFrame(() => {
        const panel = document.querySelector('[data-recruitment-comparison-panel]');
        if (!panel) return;
        panel.classList.add('comparison-attention');
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.setTimeout(() => panel.classList.remove('comparison-attention'), 1100);
      });
      return true;
    }
    const clearComparison = event.target.closest('[data-recruitment-clear-comparison]');
    if (clearComparison) {
      recruitmentComparisonIds = [];
      recruitmentComparisonExpanded = false;
      updateMenuUI();
      showStatus('COMPARISON CLEARED');
      return true;
    }
    const dismissUpdate = event.target.closest('[data-recruitment-dismiss-update]');
    if (dismissUpdate) {
      recruitmentLastSigningUpdate = null;
      updateMenuUI();
      return true;
    }
    const view = event.target.closest('[data-recruitment-view]');
    if (view) return recruitmentSetView(view.dataset.recruitmentView);
    const shortlist = event.target.closest('[data-recruitment-shortlist]');
    if (shortlist) {
      const active = toggleRecruitmentShortlist(shortlist.dataset.recruitmentShortlist);
      showStatus(active ? 'ADDED TO SHORTLIST' : 'REMOVED FROM SHORTLIST');
      return true;
    }
    const startAssignment = event.target.closest('[data-recruitment-start-assignment]');
    if (startAssignment) {
      const draft = recruitmentState().assignmentDraft;
      const result = recruitmentStartAssignment(draft.roleId, draft.ageBand, draft.abilityBand);
      if (result.ok) showStatus('SCOUTING ASSIGNMENT STARTED');
      else showManagementBlocked('SCOUTING ASSIGNMENT UNAVAILABLE', result.reason || 'The recruitment department cannot begin this assignment yet.', { returnFocus: startAssignment });
      return true;
    }
    const cancelAssignment = event.target.closest('[data-recruitment-cancel-assignment]');
    if (cancelAssignment) {
      const cancelled = recruitmentCancelAssignment(cancelAssignment.dataset.recruitmentCancelAssignment);
      if (cancelled) showStatus('ASSIGNMENT CANCELLED');
      else showManagementBlocked('ASSIGNMENT UNAVAILABLE', 'This scouting assignment has already completed or is no longer active.', { returnFocus: cancelAssignment });
      return true;
    }
    const sponsorGenerate = event.target.closest('[data-sponsor-generate]');
    if (sponsorGenerate) {
      const offers = sponsorshipGenerateOffers(true);
      if (offers.length) showStatus('SPONSOR OFFERS RECEIVED');
      else showManagementBlocked('NO PARTNERS AVAILABLE', "No new sponsor is prepared to submit an offer at the club's current reputation and commercial timing.", { returnFocus: sponsorGenerate });
      saveCareerState();
      updateMenuUI();
      return true;
    }
    const sponsorAccept = event.target.closest('[data-sponsor-accept]');
    if (sponsorAccept) {
      const result = sponsorshipAcceptOffer(sponsorAccept.dataset.sponsorAccept);
      if (result.ok) showStatus('SPONSORSHIP AGREED');
      else showManagementBlocked('SPONSORSHIP COULD NOT BE ACCEPTED', result.reason || 'This commercial offer is no longer available.', { returnFocus: sponsorAccept });
      return true;
    }
    const sponsorReject = event.target.closest('[data-sponsor-reject]');
    if (sponsorReject) {
      const rejected = sponsorshipRejectOffer(sponsorReject.dataset.sponsorReject);
      if (rejected) showStatus('SPONSOR OFFER DECLINED');
      else showManagementBlocked('OFFER UNAVAILABLE', 'This sponsorship proposal has expired or already been resolved.', { returnFocus: sponsorReject });
      return true;
    }
    return false;
  }

  function handleRecruitmentCommercialInput(event) {
    const draft = event.target.closest('[data-recruitment-draft]');
    if (!draft) return false;
    recruitmentState().assignmentDraft[draft.dataset.recruitmentDraft] = draft.value;
    saveCareerState();
    return true;
  }

  const baseHandleCareerMenuClickRecruitment = handleCareerMenuClick;
  handleCareerMenuClick = function enhancedHandleCareerMenuClick(event) {
    if (handleRecruitmentCommercialClick(event)) return;
    return baseHandleCareerMenuClickRecruitment(event);
  };

  const baseHandleCareerMenuInputRecruitment = handleCareerMenuInput;
  handleCareerMenuInput = function enhancedHandleCareerMenuInput(event) {
    if (handleRecruitmentCommercialInput(event)) return;
    return baseHandleCareerMenuInputRecruitment(event);
  };

  const baseUpdateHudRecruitment = updateHud;
  updateHud = function enhancedUpdateHud() {
    const result = baseUpdateHudRecruitment();
    updateSponsorHud();
    return result;
  };

  const baseAuditCareerStateIntegrityRecruitment = auditCareerStateIntegrity;
  auditCareerStateIntegrity = function enhancedAuditCareerStateIntegrity() {
    const report = baseAuditCareerStateIntegrityRecruitment();
    const issues = Array.isArray(report?.issues) ? report.issues : [];
    const note = (code, detail) => issues.push({ code, detail });
    const state = recruitmentState();
    const marketIds = new Set((careerState.market || []).map(player => player.id));
    if (new Set(state.shortlistIds).size !== state.shortlistIds.length) note('recruitment.shortlistIds', 'The recruitment shortlist contains duplicate identifiers.');
    for (const id of state.shortlistIds) if (!marketIds.has(id)) note('recruitment.shortlistPlayer', `Shortlisted player ${id} is no longer in the market.`);
    for (const [id, scouting] of Object.entries(state.reports)) {
      if (!marketIds.has(id)) continue;
      const knowledge = Number(scouting?.knowledge);
      if (!Number.isFinite(knowledge) || knowledge < 0 || knowledge > 100) note('recruitment.knowledge', `Player ${id} has invalid scouting knowledge.`);
    }
    if (state.assignments.filter(item => item.status === 'active').length > recruitmentAssignmentLimit()) note('recruitment.assignments', 'Too many active recruitment assignments are running.');
    const sponsor = sponsorshipState();
    const sponsorIds = new Set(SPONSOR_BRANDS.map(brand => brand.id));
    if (sponsor.active && !sponsorIds.has(sponsor.active.brandId)) note('sponsorship.activeBrand', 'The active sponsorship references an unknown brand.');
    if (sponsor.offers.some(offer => !sponsorIds.has(offer.brandId))) note('sponsorship.offerBrand', 'A sponsorship offer references an unknown brand.');
    if (sponsor.active && Number(sponsor.active.remainingWeeks) < 0) note('sponsorship.duration', 'The active sponsorship has a negative remaining term.');
    return { ...(report || {}), ok: issues.length === 0, issues };
  };

  queueMicrotask(() => {
    if (!window.__strikeDebug) return;
    Object.assign(window.__strikeDebug, {
      recruitment: () => ({
        view: recruitmentState().view,
        scoutQuality: recruitmentScoutQuality(),
        transferWindow: recruitmentTransferWindowStatus(),
        shortlistIds: [...recruitmentState().shortlistIds],
        assignments: recruitmentState().assignments.map(item => ({ ...item, resultIds: [...(item.resultIds || [])] })),
        reports: Object.fromEntries(Object.entries(recruitmentState().reports).map(([id, item]) => [id, { ...item }])),
        aiActivity: recruitmentState().aiActivity.map(item => ({ ...item }))
      }),
      sponsorship: () => ({
        performanceScore: sponsorshipPerformanceScore(),
        brands: SPONSOR_BRANDS.map(brand => ({ ...brand, duration: [...brand.duration] })),
        active: sponsorshipState().active ? { ...sponsorshipState().active } : null,
        offers: sponsorshipState().offers.map(item => ({ ...item })),
        pending: sponsorshipPendingOffers().map(item => ({ ...item })),
        history: sponsorshipState().history.map(item => ({ ...item }))
      }),
      sponsorRoundBumperForTest: () => sponsorRoundBumperSnapshot(),
      scheduleSponsorRoundBumperForTest: (nextRound = roundNumber + 1) => ({ scheduled: scheduleSponsorRoundBumper(nextRound), state: sponsorRoundBumperSnapshot() }),
      showSponsorRoundBumperForTest: () => ({ shown: showSponsorRoundBumperNow(), state: sponsorRoundBumperSnapshot() }),
      hideSponsorRoundBumperForTest: () => { hideSponsorRoundBumper(); return sponsorRoundBumperSnapshot(); },
      shortlistPlayerForTest: playerId => ({ active: toggleRecruitmentShortlist(String(playerId || '')), state: window.__strikeDebug.recruitment() }),
      startRecruitmentAssignmentForTest: (roleId = 'any', ageBand = 'any', abilityBand = 'any') => ({ result: recruitmentStartAssignment(roleId, ageBand, abilityBand), state: window.__strikeDebug.recruitment() }),
      generateSponsorOffersForTest: () => ({ offers: sponsorshipGenerateOffers(true).map(item => ({ ...item })), state: window.__strikeDebug.sponsorship(), blockers: clubEndDayBlockers().map(item => ({ ...item })) }),
      acceptSponsorOfferForTest: offerId => ({ result: sponsorshipAcceptOffer(String(offerId || '')), state: window.__strikeDebug.sponsorship(), blockers: clubEndDayBlockers().map(item => ({ ...item })) }),
      rejectSponsorOfferForTest: offerId => ({ ok: sponsorshipRejectOffer(String(offerId || '')), state: window.__strikeDebug.sponsorship(), blockers: clubEndDayBlockers().map(item => ({ ...item })) }),
      sponsorMatchBonusForTest: (won = true, blue = 3, red = 1) => ({ bonus: sponsorshipMatchSettlement(Boolean(won), { blueScore: Number(blue), redScore: Number(red) }), state: window.__strikeDebug.sponsorship(), credits: careerState.credits }),
      setTransferWindowCompletedForTest: (count = 0) => {
        const completed = Math.max(0, Math.round(Number(count) || 0));
        const fixtures = recruitmentUserLeagueFixtures();
        fixtures.forEach((fixture, index) => {
          fixture.played = index < completed;
          if (fixture.played) {
            fixture.homeScore = 3;
            fixture.awayScore = 1;
            fixture.winnerId = fixture.homeId;
          } else {
            fixture.homeScore = null;
            fixture.awayScore = null;
            fixture.winnerId = null;
          }
        });
        return recruitmentTransferWindowStatus();
      },
      sponsorWeeklyPaymentForTest: () => {
        careerState.week = Math.max(1, Number(careerState.week) || 1) + 1;
        const before = careerState.credits;
        const deal = sponsorshipWeeklyProcess();
        saveCareerState();
        return { before, after: careerState.credits, paid: careerState.credits - before, deal: deal ? { ...deal } : null, state: window.__strikeDebug.sponsorship() };
      },
      forceAiListingForTest: () => {
        const day = clubCalendarState().absoluteDay + 1;
        const state = recruitmentState();
        const market = careerState.market || [];
        const clubs = (typeof transferRivalClubs === 'function' ? transferRivalClubs() : []).filter(club => Array.isArray(club.roster) && club.roster.length >= TEAM_REQUIRED_STARTERS);
        const club = clubs[0] || null;
        if (!club) return { ok: false, state: window.__strikeDebug.recruitment() };
        club.roster.sort((a, b) => teamPlayerOverall(b) - teamPlayerOverall(a));
        const player = club.roster[club.roster.length - 1] || null;
        const replacement = market.slice().sort((a, b) => teamPlayerOverall(b) - teamPlayerOverall(a))[0] || null;
        if (!player || !replacement) return { ok: false, state: window.__strikeDebug.recruitment() };
        const replacementIndex = market.findIndex(item => item.id === replacement.id);
        if (replacementIndex >= 0) market.splice(replacementIndex, 1);
        const playerIndex = club.roster.findIndex(item => item.id === player.id);
        const signed = normaliseGeneratedPlayer({ ...replacement, currentTeam: club.name, joinedWeek: careerState.week }, `${club.id}-QA-${day}`);
        if (playerIndex >= 0) club.roster.splice(playerIndex, 1, signed);
        const ok = recruitmentAddAiListing(player, club.name, day, state, market);
        if (ok) {
          state.shortlistIds.splice(0, state.shortlistIds.length, ...state.shortlistIds.filter(id => id !== replacement.id));
          delete state.reports[replacement.id];
          state.aiActivity.unshift({ id: recruitmentNextId('AI'), day, type: 'listed', playerName: player.name, clubName: club.name });
          state.aiActivity.unshift({ id: recruitmentNextId('AI'), day, type: 'signed', playerName: replacement.name, clubName: club.name });
        }
        return { ok, playerId: player.id, replacementId: replacement.id, state: window.__strikeDebug.recruitment(), marketCount: market.length };
      },
      processRecruitmentDayForTest: () => {
        const day = clubCalendarState().absoluteDay + 1;
        clubCalendarState().absoluteDay = day;
        clubCalendarState().dayOfWeek = day % 7;
        recruitmentAiMarketProcess(day);
        recruitmentProcessAssignments(day);
        sponsorshipProcessDay(day);
        saveCareerState();
        return { day, recruitment: window.__strikeDebug.recruitment(), sponsorship: window.__strikeDebug.sponsorship() };
      }
    });
  });

  renderTeamMarketTab = renderEnhancedRecruitmentTab;

  ensureRecruitmentCommercialState();
