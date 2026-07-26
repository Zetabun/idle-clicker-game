/*
 * Strikewatch source module: 39-infrastructure.js
 * Purpose: Persistent, capacity-limited club infrastructure projects that
 * connect training, recruitment, medical, academy, analysis, commercial and
 * supporter systems without creating a parallel currency or isolated game.
 *
 * This file shares application scope with the other source fragments.
 * Run `python3 build.py` to regenerate the development bundle and standalone.
 */

  const CLUB_INFRASTRUCTURE_BRANCH_MAX = 4;
  const CLUB_INFRASTRUCTURE_CAPACITY_BY_DIVISION = Object.freeze({ 3: 8, 2: 10, 1: 12, 0: 14 });
  const CLUB_INFRASTRUCTURE_OPENING_ORDER = Object.freeze(['training', 'scouting', 'medical', 'academy', 'analysis', 'commercial']);
  const CLUB_INFRASTRUCTURE_BRANCHES = Object.freeze({
    training: {
      label: 'TRAINING DEPARTMENT',
      short: 'TRAINING',
      kicker: 'PLAYER DEVELOPMENT',
      description: 'Improves the daily technical progress produced by every active operator programme.',
      tierNames: ['LOCAL DRILL SPACE', 'SPECIALIST COACHING WING', 'PERFORMANCE CENTRE', 'ELITE TRAINING CAMPUS'],
      costs: [60000, 125000, 220000, 350000],
      days: [3, 5, 8, 12],
      effects: [
        'No dedicated infrastructure effect.',
        '+6% daily technical training progress.',
        '+13% daily technical training progress.',
        '+21% daily technical training progress.',
        '+30% daily technical training progress.'
      ],
      trainingMultiplier: [0, 0.06, 0.13, 0.21, 0.30]
    },
    scouting: {
      label: 'SCOUTING NETWORK',
      short: 'SCOUTING',
      kicker: 'RECRUITMENT REACH',
      description: 'Improves recruitment knowledge, assignment throughput and the reliability of initial market reports.',
      tierNames: ['LOCAL CONTACTS', 'REGIONAL NETWORK', 'INTERNATIONAL DESK', 'GLOBAL RECRUITMENT HUB'],
      costs: [55000, 115000, 205000, 330000],
      days: [3, 5, 8, 12],
      effects: [
        'No dedicated infrastructure effect.',
        '+5 recruitment quality and +3 initial report confidence.',
        '+11 recruitment quality and +7 initial report confidence.',
        '+18 recruitment quality, +12 initial confidence and faster assignments.',
        '+26 recruitment quality, +18 initial confidence, faster assignments and one extra active brief.'
      ],
      qualityBonus: [0, 5, 11, 18, 26],
      initialKnowledgeBonus: [0, 3, 7, 12, 18],
      assignmentProgress: [1, 1, 1, 2, 2],
      assignmentLimitBonus: [0, 0, 0, 0, 1]
    },
    medical: {
      label: 'MEDICAL & RECOVERY',
      short: 'MEDICAL',
      kicker: 'AVAILABILITY',
      description: 'Reduces workload injury risk and improves daily fatigue and injury recovery.',
      tierNames: ['TREATMENT ROOM', 'RECOVERY SUITE', 'SPORTS SCIENCE LAB', 'ELITE MEDICAL CENTRE'],
      costs: [65000, 135000, 235000, 370000],
      days: [4, 6, 9, 13],
      effects: [
        'No dedicated infrastructure effect.',
        '+1 fatigue recovery support and a small injury-risk reduction.',
        '+2 fatigue recovery support and faster injury clearance.',
        '+3 fatigue recovery support with a strong risk and recovery benefit.',
        '+4 fatigue recovery support and the club’s best medical protection.'
      ],
      fatigueRecovery: [0, 1, 2, 3, 4],
      injuryRiskReduction: [0, 0.005, 0.011, 0.018, 0.028],
      injuryRecoveryProgress: [0, 0.08, 0.18, 0.30, 0.45]
    },
    academy: {
      label: 'YOUTH ACADEMY',
      short: 'ACADEMY',
      kicker: 'HOME-GROWN PATHWAY',
      description: 'Produces club-developed prospects with no transfer fee and increasingly strong potential reports.',
      tierNames: ['COMMUNITY TRIALS', 'REGIONAL ACADEMY', 'NATIONAL ACADEMY', 'ELITE PATHWAY'],
      costs: [80000, 160000, 280000, 450000],
      days: [5, 8, 12, 16],
      effects: [
        'No academy intake is available.',
        'One club prospect approximately every 42 days.',
        'One stronger prospect approximately every 35 days.',
        'Two prospects approximately every 28 days with improved potential.',
        'Two elite-pathway prospects approximately every 21 days.'
      ],
      intakeInterval: [0, 42, 35, 28, 21],
      intakeCount: [0, 1, 1, 2, 2],
      potentialBonus: [0, 2, 5, 8, 12],
      reportKnowledge: [0, 55, 65, 75, 85]
    },
    analysis: {
      label: 'ANALYSIS DEPARTMENT',
      short: 'ANALYSIS',
      kicker: 'MATCH INTELLIGENCE',
      description: 'Turns match evidence into player XP and builds deeper opposition reports alongside employed staff.',
      tierNames: ['VIDEO REVIEW ROOM', 'DATA ANALYSIS UNIT', 'TACTICAL LAB', 'ELITE PERFORMANCE INTELLIGENCE'],
      costs: [50000, 105000, 190000, 315000],
      days: [3, 5, 7, 11],
      effects: [
        'No dedicated infrastructure effect.',
        '+4% player match XP and +1 daily opposition-report gain.',
        '+8% player match XP and +2 daily opposition-report gain.',
        '+13% player match XP and +3 report gain with a higher report ceiling.',
        '+18% player match XP and +4 report gain with the highest report ceiling.'
      ],
      playerXpMultiplier: [0, 0.04, 0.08, 0.13, 0.18],
      oppositionDailyGain: [0, 1, 2, 3, 4],
      oppositionMaximumBonus: [0, 2, 5, 8, 12]
    },
    commercial: {
      label: 'COMMERCIAL & SUPPORTERS',
      short: 'COMMERCIAL',
      kicker: 'CLUB GROWTH',
      description: 'Improves partner offers, matchday income and the rate at which positive supporter momentum grows the fanbase.',
      tierNames: ['COMMUNITY OFFICE', 'PARTNERSHIP SUITE', 'SUPPORTER CENTRE', 'GLOBAL CLUB CAMPUS'],
      costs: [45000, 95000, 170000, 285000],
      days: [3, 5, 7, 10],
      effects: [
        'No dedicated infrastructure effect.',
        '+3 sponsor score, +3% offer value and +8% positive fan growth.',
        '+7 sponsor score, +7% offer value and +16% positive fan growth.',
        '+12 sponsor score, +12% offer value and +25% positive fan growth.',
        '+18 sponsor score, +18% offer value and +35% positive fan growth.'
      ],
      sponsorScore: [0, 3, 7, 12, 18],
      offerMultiplier: [1, 1.03, 1.07, 1.12, 1.18],
      matchIncomeMultiplier: [1, 1.02, 1.05, 1.08, 1.12],
      supporterGrowthMultiplier: [1, 1.08, 1.16, 1.25, 1.35]
    }
  });

  let infrastructurePendingBranchId = '';

  function makeDefaultClubInfrastructureState() {
    return {
      version: 1,
      levels: Object.fromEntries(Object.keys(CLUB_INFRASTRUCTURE_BRANCHES).map(id => [id, 0])),
      activeProject: null,
      history: [],
      sequence: 0,
      lastAcademyDay: -999,
      academySequence: 0,
      academyHistory: []
    };
  }

  function clubInfrastructureState() {
    const previous = careerState.infrastructure && typeof careerState.infrastructure === 'object'
      ? careerState.infrastructure
      : makeDefaultClubInfrastructureState();
    const levels = Object.fromEntries(Object.keys(CLUB_INFRASTRUCTURE_BRANCHES).map(id => [
      id,
      clamp(Math.round(Number(previous.levels?.[id]) || 0), 0, CLUB_INFRASTRUCTURE_BRANCH_MAX)
    ]));
    let activeProject = previous.activeProject && typeof previous.activeProject === 'object' ? { ...previous.activeProject } : null;
    if (activeProject) {
      const branchId = String(activeProject.branchId || '');
      const currentLevel = levels[branchId] || 0;
      const targetLevel = clamp(Math.round(Number(activeProject.targetLevel) || currentLevel + 1), 1, CLUB_INFRASTRUCTURE_BRANCH_MAX);
      if (!CLUB_INFRASTRUCTURE_BRANCHES[branchId] || targetLevel <= currentLevel) activeProject = null;
      else activeProject = {
        id: String(activeProject.id || `INF-${branchId}-${targetLevel}`),
        branchId,
        targetLevel,
        cost: Math.max(0, Math.round(Number(activeProject.cost) || 0)),
        startedDay: Math.max(0, Math.round(Number(activeProject.startedDay) || 0)),
        completeDay: Math.max(0, Math.round(Number(activeProject.completeDay) || 0))
      };
    }
    Object.assign(previous, {
      version: 1,
      levels,
      activeProject,
      history: Array.isArray(previous.history) ? previous.history.slice(0, 40).map(item => ({ ...item })) : [],
      sequence: Math.max(0, Math.round(Number(previous.sequence) || 0)),
      lastAcademyDay: Number.isFinite(Number(previous.lastAcademyDay)) ? Math.round(Number(previous.lastAcademyDay)) : -999,
      academySequence: Math.max(0, Math.round(Number(previous.academySequence) || 0)),
      academyHistory: Array.isArray(previous.academyHistory) ? previous.academyHistory.slice(0, 24).map(item => ({ ...item })) : []
    });
    careerState.infrastructure = previous;
    return previous;
  }

  function clubInfrastructureDivisionTier() {
    return typeof normaliseLeagueTier === 'function'
      ? normaliseLeagueTier(careerState.league?.divisionTier)
      : clamp(Math.round(Number(careerState.league?.divisionTier) || 3), 0, 3);
  }

  function clubInfrastructureCapacity() {
    return CLUB_INFRASTRUCTURE_CAPACITY_BY_DIVISION[clubInfrastructureDivisionTier()] || 8;
  }

  function clubInfrastructureLevel(branchId) {
    return clamp(Math.round(Number(clubInfrastructureState().levels?.[branchId]) || 0), 0, CLUB_INFRASTRUCTURE_BRANCH_MAX);
  }

  function clubInfrastructureUsedCapacity(includeActiveProject = true) {
    const state = clubInfrastructureState();
    const completed = Object.values(state.levels).reduce((sum, level) => sum + Math.max(0, Number(level) || 0), 0);
    return completed + (includeActiveProject && state.activeProject ? 1 : 0);
  }

  function clubInfrastructureRemainingCapacity() {
    return Math.max(0, clubInfrastructureCapacity() - clubInfrastructureUsedCapacity(true));
  }

  function clubInfrastructureBranchEffect(branchId, key, fallback = 0) {
    const branch = CLUB_INFRASTRUCTURE_BRANCHES[branchId];
    if (!branch || !Array.isArray(branch[key])) return fallback;
    return branch[key][clubInfrastructureLevel(branchId)] ?? fallback;
  }

  function clubInfrastructureTrainingMultiplier() {
    return 1 + Number(clubInfrastructureBranchEffect('training', 'trainingMultiplier', 0));
  }

  function clubInfrastructureRecruitmentQualityBonus() {
    return Number(clubInfrastructureBranchEffect('scouting', 'qualityBonus', 0));
  }

  function clubInfrastructureInitialKnowledgeBonus() {
    return Number(clubInfrastructureBranchEffect('scouting', 'initialKnowledgeBonus', 0));
  }

  function clubInfrastructureAssignmentProgress() {
    return Math.max(1, Math.round(Number(clubInfrastructureBranchEffect('scouting', 'assignmentProgress', 1)) || 1));
  }

  function clubInfrastructureAssignmentLimitBonus() {
    return Math.max(0, Math.round(Number(clubInfrastructureBranchEffect('scouting', 'assignmentLimitBonus', 0)) || 0));
  }

  function clubInfrastructureFatigueRecoveryBonus() {
    return Math.max(0, Number(clubInfrastructureBranchEffect('medical', 'fatigueRecovery', 0)) || 0);
  }

  function clubInfrastructureInjuryRiskReduction() {
    return Math.max(0, Number(clubInfrastructureBranchEffect('medical', 'injuryRiskReduction', 0)) || 0);
  }

  function clubInfrastructureInjuryRecoveryProgress() {
    return Math.max(0, Number(clubInfrastructureBranchEffect('medical', 'injuryRecoveryProgress', 0)) || 0);
  }

  function clubInfrastructurePlayerXpMultiplier() {
    return 1 + Math.max(0, Number(clubInfrastructureBranchEffect('analysis', 'playerXpMultiplier', 0)) || 0);
  }

  function clubInfrastructureOppositionDailyGain() {
    return Math.max(0, Math.round(Number(clubInfrastructureBranchEffect('analysis', 'oppositionDailyGain', 0)) || 0));
  }

  function clubInfrastructureOppositionMaximumBonus() {
    return Math.max(0, Math.round(Number(clubInfrastructureBranchEffect('analysis', 'oppositionMaximumBonus', 0)) || 0));
  }

  function clubInfrastructureSponsorScoreBonus() {
    return Math.max(0, Math.round(Number(clubInfrastructureBranchEffect('commercial', 'sponsorScore', 0)) || 0));
  }

  function clubInfrastructureOfferMultiplier() {
    return Math.max(1, Number(clubInfrastructureBranchEffect('commercial', 'offerMultiplier', 1)) || 1);
  }

  function clubInfrastructureMatchIncomeMultiplier() {
    return Math.max(1, Number(clubInfrastructureBranchEffect('commercial', 'matchIncomeMultiplier', 1)) || 1);
  }

  function clubInfrastructureSupporterGrowthMultiplier() {
    return Math.max(1, Number(clubInfrastructureBranchEffect('commercial', 'supporterGrowthMultiplier', 1)) || 1);
  }

  function clubInfrastructureNextProject(branchId) {
    const branch = CLUB_INFRASTRUCTURE_BRANCHES[branchId];
    if (!branch) return null;
    const currentLevel = clubInfrastructureLevel(branchId);
    if (currentLevel >= CLUB_INFRASTRUCTURE_BRANCH_MAX) return null;
    const targetLevel = currentLevel + 1;
    return {
      branchId,
      targetLevel,
      name: branch.tierNames[targetLevel - 1],
      cost: Math.max(0, Math.round(Number(branch.costs[targetLevel - 1]) || 0)),
      days: Math.max(1, Math.round(Number(branch.days[targetLevel - 1]) || 1)),
      effect: branch.effects[targetLevel]
    };
  }

  function clubInfrastructureProjectBlockReason(branchId) {
    const state = clubInfrastructureState();
    const next = clubInfrastructureNextProject(branchId);
    if (!next) return 'This branch is already fully developed.';
    if (state.activeProject) return `${CLUB_INFRASTRUCTURE_BRANCHES[state.activeProject.branchId]?.label || 'Another project'} is already under construction.`;
    if (clubInfrastructureRemainingCapacity() <= 0) return 'The club has no remaining permanent infrastructure capacity at this division level.';
    if (Number(careerState.credits) < next.cost) return `The club needs ${teamCredits(next.cost - Number(careerState.credits))} more Club Cash.`;
    return '';
  }

  function clubInfrastructureStartProject(branchId) {
    const state = clubInfrastructureState();
    const branch = CLUB_INFRASTRUCTURE_BRANCHES[branchId];
    const next = clubInfrastructureNextProject(branchId);
    const reason = clubInfrastructureProjectBlockReason(branchId);
    if (!branch || !next || reason) return { ok: false, reason: reason || 'This project is unavailable.' };
    const day = Math.max(0, Math.round(Number(clubCalendarState()?.absoluteDay) || 0));
    careerState.credits -= next.cost;
    if (typeof teamFinanceTransaction === 'function') teamFinanceTransaction('INFRASTRUCTURE', -next.cost, `${branch.label} · ${next.name}`);
    state.sequence++;
    state.activeProject = {
      id: `INF-${state.sequence}`,
      branchId,
      targetLevel: next.targetLevel,
      cost: next.cost,
      startedDay: day,
      completeDay: day + next.days
    };
    state.history.unshift({
      id: `INF-START-${state.sequence}`,
      type: 'STARTED',
      branchId,
      targetLevel: next.targetLevel,
      name: next.name,
      day,
      cost: next.cost
    });
    state.history = state.history.slice(0, 40);
    infrastructurePendingBranchId = '';
    if (typeof clubAddMail === 'function') clubAddMail(
      `${branch.label.toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase())} project approved`,
      `${next.name} is now under construction. ${teamCredits(next.cost)} has left Club Cash and the project completes in ${next.days} day${next.days === 1 ? '' : 's'}. The investment is permanent and cannot be refunded.`,
      'INFRASTRUCTURE',
      true,
      'infrastructure'
    );
    saveCareerState();
    updateMenuUI();
    return { ok: true, project: { ...state.activeProject }, next };
  }

  function clubInfrastructureAcademyProspect(level, day, index = 0) {
    if (typeof generateTeamPlayer !== 'function') return null;
    const state = clubInfrastructureState();
    const tier = clubInfrastructureDivisionTier();
    const seedBase = teamSeedFromString(`${careerState.name}:${careerState.marketSeed}:${day}:${state.academySequence}:${index}:academy-intake`);
    const existingNames = new Set([...(careerState.market || []), ...(careerState.squad || [])].map(player => String(player?.name || '').toLowerCase()));
    let player = null;
    for (let attempt = 0; attempt < 24; attempt++) {
      const candidate = generateTeamPlayer(seedBase + attempt * 104729, state.academySequence + index + attempt, 'market', { divisionTier: tier, idPrefix: 'ACAD' });
      if (!existingNames.has(String(candidate.name || '').toLowerCase())) { player = candidate; break; }
    }
    if (!player) player = generateTeamPlayer(seedBase + 900001, state.academySequence + index + 31, 'market', { divisionTier: tier, idPrefix: 'ACAD' });
    state.academySequence++;
    const potentialBonus = Number(CLUB_INFRASTRUCTURE_BRANCHES.academy.potentialBonus[level]) || 0;
    const cap = ({ 3: 76, 2: 86, 1: 94, 0: 98 })[tier] || 76;
    const levelFloor = [0, 55, 62, 70, 78][level] || 55;
    const potentialFloor = Math.min(cap, levelFloor + Math.max(0, 3 - tier) * 3);
    const overall = teamPlayerOverall(player);
    player.age = clamp(18 + ((seedBase + index) % 3), 18, 20);
    player.potential = clamp(Math.max(Number(player.potential) || 0, overall + 13 + potentialBonus), potentialFloor, cap);
    player.fee = 0;
    player.value = Math.max(Number(player.value) || 0, typeof playerMarketValue === 'function' ? playerMarketValue(player) : Number(player.value) || 0);
    player.wage = Math.max(700, Math.round((Number(player.wage) || 1500) * 0.72 / 100) * 100);
    player.contractWeeks = 0;
    player.currentTeam = `${careerState.name} Academy`;
    player.history = [];
    player.scoutingDivision = tier;
    player.listedDay = day;
    player.availabilityUntilDay = day + Math.max(21, Number(CLUB_INFRASTRUCTURE_BRANCHES.academy.intakeInterval[level]) || 28);
    player.clubAcademyProspect = true;
    player.clubAcademyIntakeDay = day;
    player.clubAcademyLevel = level;
    player.marketOrigin = {
      type: 'club-academy',
      label: 'CLUB ACADEMY PROSPECT',
      detail: `${careerState.name}'s academy staff have recommended a home-grown prospect for senior contract talks. No transfer fee is required.`,
      sourceClubId: 'user-club-academy',
      sourceClubName: `${careerState.name} Academy`,
      sourceTier: tier,
      generatedDay: day
    };
    player.marketReason = player.marketOrigin.detail;
    player.marketMomentum = { previousFee: 0, trend: 'stable', demand: 0, lastChangedDay: day };
    player.rivalBid = null;
    return typeof normaliseGeneratedPlayer === 'function' ? normaliseGeneratedPlayer(player, player.id) : player;
  }

  function clubInfrastructureGenerateAcademyIntake(day, reason = 'scheduled') {
    const state = clubInfrastructureState();
    const level = clubInfrastructureLevel('academy');
    if (!level) return [];
    const count = Math.max(1, Math.round(Number(CLUB_INFRASTRUCTURE_BRANCHES.academy.intakeCount[level]) || 1));
    const prospects = [];
    careerState.market = Array.isArray(careerState.market) ? careerState.market : [];
    for (let index = 0; index < count; index++) {
      const player = clubInfrastructureAcademyProspect(level, day, index);
      if (!player) continue;
      careerState.market.unshift(player);
      prospects.push(player);
      if (typeof recruitmentReport === 'function') {
        const report = recruitmentReport(player);
        report.knowledge = Math.max(report.knowledge, Number(CLUB_INFRASTRUCTURE_BRANCHES.academy.reportKnowledge[level]) || 55);
        report.source = 'CLUB ACADEMY REVIEW';
        report.lastUpdatedDay = day;
      }
      if (typeof dynamicMarketRecordEvent === 'function') dynamicMarketRecordEvent('arrival', {
        day,
        playerId: player.id,
        playerName: player.name,
        clubName: `${careerState.name} Academy`,
        role: player.role,
        important: true,
        detail: `${player.name} was promoted from the club academy into exclusive senior-contract talks.`
      });
    }
    state.lastAcademyDay = day;
    if (prospects.length) {
      state.academyHistory.unshift({ id: `ACADEMY-${day}-${state.academySequence}`, day, reason, level, playerIds: prospects.map(player => player.id), playerNames: prospects.map(player => player.name) });
      state.academyHistory = state.academyHistory.slice(0, 24);
      if (typeof clubAddMail === 'function') clubAddMail(
        `Academy intake · ${prospects.length} prospect${prospects.length === 1 ? '' : 's'} ready`,
        `${prospects.map(player => `${player.name} (${teamRoleById(player.role).name})`).join(' and ')} ${prospects.length === 1 ? 'has' : 'have'} been promoted into exclusive senior-contract talks. No transfer fee is required, but wages and squad capacity still apply.`,
        'ACADEMY',
        true,
        'market'
      );
    }
    return prospects;
  }

  function clubInfrastructureCompleteProject(day) {
    const state = clubInfrastructureState();
    const project = state.activeProject;
    if (!project || Number(project.completeDay) > day) return null;
    const branch = CLUB_INFRASTRUCTURE_BRANCHES[project.branchId];
    if (!branch) { state.activeProject = null; return null; }
    const currentLevel = clubInfrastructureLevel(project.branchId);
    state.levels[project.branchId] = Math.max(currentLevel, project.targetLevel);
    state.activeProject = null;
    state.history.unshift({
      id: `INF-COMPLETE-${project.id}`,
      type: 'COMPLETED',
      branchId: project.branchId,
      targetLevel: project.targetLevel,
      name: branch.tierNames[project.targetLevel - 1],
      day,
      cost: project.cost
    });
    state.history = state.history.slice(0, 40);
    const prospects = project.branchId === 'academy' ? clubInfrastructureGenerateAcademyIntake(day, 'facility-completion') : [];
    if (typeof clubAddMail === 'function') clubAddMail(
      `${branch.label.toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase())} upgraded`,
      `${branch.tierNames[project.targetLevel - 1]} is operational. ${branch.effects[project.targetLevel]}${prospects.length ? ` The first intake has produced ${prospects.length} prospect${prospects.length === 1 ? '' : 's'}.` : ''}`,
      'INFRASTRUCTURE',
      true,
      'infrastructure'
    );
    return { branchId: project.branchId, level: project.targetLevel, prospects };
  }

  function clubInfrastructureProcessDay(day = Math.max(0, Math.round(Number(clubCalendarState()?.absoluteDay) || 0))) {
    const state = clubInfrastructureState();
    const completed = clubInfrastructureCompleteProject(day);
    const academyLevel = clubInfrastructureLevel('academy');
    if (academyLevel > 0) {
      const interval = Math.max(7, Math.round(Number(CLUB_INFRASTRUCTURE_BRANCHES.academy.intakeInterval[academyLevel]) || 42));
      if (day > 0 && day - state.lastAcademyDay >= interval) clubInfrastructureGenerateAcademyIntake(day, 'scheduled');
    }
    return completed;
  }

  function clubInfrastructureRecommendedBranch() {
    const state = clubInfrastructureState();
    const firstUnbuilt = CLUB_INFRASTRUCTURE_OPENING_ORDER.find(id => clubInfrastructureLevel(id) === 0);
    if (firstUnbuilt) return firstUnbuilt;
    const squad = Array.isArray(careerState.squad) ? careerState.squad : [];
    const injured = squad.filter(player => typeof playerInjuryActive === 'function' && playerInjuryActive(player)).length;
    const averageFatigue = squad.length ? squad.reduce((sum, player) => sum + Number(player.fatigue || 0), 0) / squad.length : 0;
    if ((injured || averageFatigue >= 58) && clubInfrastructureLevel('medical') < CLUB_INFRASTRUCTURE_BRANCH_MAX) return 'medical';
    const reports = (careerState.market || []).map(player => typeof recruitmentKnowledge === 'function' ? recruitmentKnowledge(player) : 0).filter(Boolean);
    const averageKnowledge = reports.length ? reports.reduce((sum, value) => sum + value, 0) / reports.length : 0;
    if (averageKnowledge < 60 && clubInfrastructureLevel('scouting') < CLUB_INFRASTRUCTURE_BRANCH_MAX) return 'scouting';
    const projectable = ['training', 'analysis', 'academy', 'commercial', 'scouting', 'medical']
      .filter(id => clubInfrastructureLevel(id) < CLUB_INFRASTRUCTURE_BRANCH_MAX)
      .sort((a, b) => clubInfrastructureLevel(a) - clubInfrastructureLevel(b));
    return projectable[0] || '';
  }

  function clubInfrastructureDaysRemaining() {
    const project = clubInfrastructureState().activeProject;
    if (!project) return 0;
    return Math.max(0, Math.round(Number(project.completeDay) - Number(clubCalendarState()?.absoluteDay || 0)));
  }

  function clubInfrastructureStatusLabel() {
    const state = clubInfrastructureState();
    if (state.activeProject) return `${clubInfrastructureDaysRemaining()}D BUILD`;
    return `${clubInfrastructureUsedCapacity(false)}/${clubInfrastructureCapacity()} CAPACITY`;
  }

  function clubInfrastructureForTest() {
    const state = clubInfrastructureState();
    const capacity = clubInfrastructureCapacity();
    const completed = clubInfrastructureUsedCapacity(false);
    const used = clubInfrastructureUsedCapacity(true);
    return {
      version: state.version,
      divisionTier: clubInfrastructureDivisionTier(),
      capacity,
      completed,
      used,
      remaining: Math.max(0, capacity - used),
      totalTreeLevels: Object.keys(CLUB_INFRASTRUCTURE_BRANCHES).length * CLUB_INFRASTRUCTURE_BRANCH_MAX,
      canMaxAll: capacity >= Object.keys(CLUB_INFRASTRUCTURE_BRANCHES).length * CLUB_INFRASTRUCTURE_BRANCH_MAX,
      levels: { ...state.levels },
      activeProject: state.activeProject ? { ...state.activeProject } : null,
      historyCount: state.history.length,
      academyHistoryCount: state.academyHistory.length,
      credits: Math.round(Number(careerState.credits) || 0),
      lastFinanceTransaction: (careerState.financeHistory || []).find(item => item.type === 'INFRASTRUCTURE') ? { ...(careerState.financeHistory || []).find(item => item.type === 'INFRASTRUCTURE') } : null,
      academyProspects: (careerState.market || []).filter(player => player.clubAcademyProspect).map(player => ({
        potential: Math.round(Number(player.potential) || 0),
        id: player.id,
        name: player.name,
        fee: Number(player.fee) || 0,
        windowOpen: typeof recruitmentTransferWindowOpenFor === 'function' ? recruitmentTransferWindowOpenFor(player) : null
      })),
      integratedEffects: {
        teamTrainingMultiplier: typeof teamTrainingMultiplier === 'function' ? teamTrainingMultiplier() : null,
        teamPlayerXpMultiplier: typeof teamPlayerXpMultiplier === 'function' ? teamPlayerXpMultiplier() : null,
        teamRecoveryBonus: typeof teamRecoveryBonus === 'function' ? teamRecoveryBonus() : null,
        teamCommercialIncomeMultiplier: typeof teamCommercialIncomeMultiplier === 'function' ? teamCommercialIncomeMultiplier() : null,
        recruitmentScoutQuality: typeof recruitmentScoutQuality === 'function' ? recruitmentScoutQuality() : null,
        recruitmentAssignmentLimit: typeof recruitmentAssignmentLimit === 'function' ? recruitmentAssignmentLimit() : null
      },
      effects: {
        trainingMultiplier: clubInfrastructureTrainingMultiplier(),
        recruitmentQualityBonus: clubInfrastructureRecruitmentQualityBonus(),
        initialKnowledgeBonus: clubInfrastructureInitialKnowledgeBonus(),
        assignmentProgress: clubInfrastructureAssignmentProgress(),
        assignmentLimitBonus: clubInfrastructureAssignmentLimitBonus(),
        fatigueRecoveryBonus: clubInfrastructureFatigueRecoveryBonus(),
        injuryRiskReduction: clubInfrastructureInjuryRiskReduction(),
        injuryRecoveryProgress: clubInfrastructureInjuryRecoveryProgress(),
        playerXpMultiplier: clubInfrastructurePlayerXpMultiplier(),
        oppositionDailyGain: clubInfrastructureOppositionDailyGain(),
        oppositionMaximumBonus: clubInfrastructureOppositionMaximumBonus(),
        sponsorScoreBonus: clubInfrastructureSponsorScoreBonus(),
        offerMultiplier: clubInfrastructureOfferMultiplier(),
        matchIncomeMultiplier: clubInfrastructureMatchIncomeMultiplier(),
        supporterGrowthMultiplier: clubInfrastructureSupporterGrowthMultiplier()
      },
      branchIds: Object.keys(CLUB_INFRASTRUCTURE_BRANCHES),
      routePresent: Boolean(document.querySelector('[data-infrastructure-branch]')),
      projectCancelPresent: Boolean(document.querySelector('[data-infrastructure-cancel-project], [data-infrastructure-refund], [data-infrastructure-respec]')),
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)
    };
  }

  function clubInfrastructureBranchTierMarkup(branchId) {
    const level = clubInfrastructureLevel(branchId);
    return `<div class="infrastructure-tier-track" aria-label="${escapeCareerHtml(CLUB_INFRASTRUCTURE_BRANCHES[branchId].label)} level ${level} of ${CLUB_INFRASTRUCTURE_BRANCH_MAX}">${Array.from({ length: CLUB_INFRASTRUCTURE_BRANCH_MAX }, (_, index) => `<i class="${index < level ? 'complete' : index === level ? 'next' : ''}"><span>${index + 1}</span></i>`).join('')}</div>`;
  }

  function clubInfrastructureBranchMarkup(branchId, recommendedId) {
    const state = clubInfrastructureState();
    const branch = CLUB_INFRASTRUCTURE_BRANCHES[branchId];
    const level = clubInfrastructureLevel(branchId);
    const next = clubInfrastructureNextProject(branchId);
    const pending = infrastructurePendingBranchId === branchId;
    const blockReason = clubInfrastructureProjectBlockReason(branchId);
    const project = state.activeProject?.branchId === branchId ? state.activeProject : null;
    const currentName = level ? branch.tierNames[level - 1] : 'FOUNDATION STANDARD';
    const currentEffect = branch.effects[level];
    const nextName = next?.name || 'BRANCH COMPLETE';
    const canPlan = Boolean(next && !blockReason);
    const planLabel = project ? 'BUILD IN PROGRESS' : state.activeProject ? 'QUEUE OCCUPIED' : next ? `PLAN LEVEL ${next.targetLevel}` : 'COMPLETE';
    return `<article class="infrastructure-branch-card ${recommendedId === branchId ? 'recommended' : ''} ${project ? 'building' : ''} ${level >= CLUB_INFRASTRUCTURE_BRANCH_MAX ? 'complete' : ''}" data-infrastructure-branch="${escapeCareerHtml(branchId)}">
      <header><div><span>${escapeCareerHtml(branch.kicker)}</span><strong>${escapeCareerHtml(branch.label)}</strong><small>${escapeCareerHtml(branch.description)}</small></div><b>LEVEL ${level}/${CLUB_INFRASTRUCTURE_BRANCH_MAX}</b></header>
      ${recommendedId === branchId ? '<em class="infrastructure-recommended">BOARD RECOMMENDATION</em>' : ''}
      ${clubInfrastructureBranchTierMarkup(branchId)}
      <section class="infrastructure-current-effect"><span>CURRENT FACILITY</span><strong>${escapeCareerHtml(currentName)}</strong><p>${escapeCareerHtml(currentEffect)}</p></section>
      <section class="infrastructure-next-effect"><span>${next ? `NEXT PROJECT · LEVEL ${next.targetLevel}` : 'DEVELOPMENT COMPLETE'}</span><strong>${escapeCareerHtml(nextName)}</strong><p>${escapeCareerHtml(next?.effect || 'No further development is available in this branch.')}</p>${next ? `<small>${teamCredits(next.cost)} · ${next.days} construction day${next.days === 1 ? '' : 's'} · consumes 1 permanent capacity slot</small>` : ''}</section>
      ${project ? `<div class="infrastructure-project-progress"><span>UNDER CONSTRUCTION</span><strong>${clubInfrastructureDaysRemaining()} DAY${clubInfrastructureDaysRemaining() === 1 ? '' : 'S'} REMAINING</strong><i><b style="width:${clamp(Math.round(((Number(clubCalendarState()?.absoluteDay || 0) - project.startedDay) / Math.max(1, project.completeDay - project.startedDay)) * 100), 4, 100)}%"></b></i></div>` : ''}
      ${pending && next ? `<div class="infrastructure-confirm"><strong>PERMANENT INVESTMENT</strong><p>${teamCredits(next.cost)} leaves Club Cash immediately. The capacity slot and completed level cannot be refunded or reassigned.</p><div><button type="button" data-infrastructure-cancel>GO BACK</button><button type="button" class="primary" data-infrastructure-confirm="${escapeCareerHtml(branchId)}">CONFIRM PROJECT</button></div></div>` : `<footer><span>${blockReason ? escapeCareerHtml(blockReason) : next ? `Cash after approval: ${teamCredits(Number(careerState.credits) - next.cost)}` : 'Maximum level reached.'}</span><button type="button" class="primary" data-infrastructure-plan="${escapeCareerHtml(branchId)}" ${canPlan ? '' : 'disabled'}>${escapeCareerHtml(planLabel)}</button></footer>`}
    </article>`;
  }

  function renderInfrastructureTab() {
    const state = clubInfrastructureState();
    const capacity = clubInfrastructureCapacity();
    const used = clubInfrastructureUsedCapacity(true);
    const completedLevels = clubInfrastructureUsedCapacity(false);
    const remaining = Math.max(0, capacity - used);
    const recommendedId = clubInfrastructureRecommendedBranch();
    const recommended = CLUB_INFRASTRUCTURE_BRANCHES[recommendedId];
    const active = state.activeProject;
    const activeBranch = active ? CLUB_INFRASTRUCTURE_BRANCHES[active.branchId] : null;
    const history = state.history.filter(item => item.type === 'COMPLETED').slice(0, 8);
    const openingOrder = CLUB_INFRASTRUCTURE_OPENING_ORDER.map((id, index) => `<span class="${clubInfrastructureLevel(id) ? 'complete' : recommendedId === id ? 'current' : ''}"><b>${index + 1}</b>${escapeCareerHtml(CLUB_INFRASTRUCTURE_BRANCHES[id].short)}</span>`).join('');
    return `${typeof renderClubCalendarStrip === 'function' ? renderClubCalendarStrip() : ''}
      <div class="menu-hero career-hero infrastructure-hero"><div class="menu-hero-main menu-briefing-panel"><div class="menu-kicker">CLUB INFRASTRUCTURE</div><h2>BUILD A PERMANENT CLUB IDENTITY</h2><p>Facilities connect directly to existing training, recruitment, medical, academy, analysis, commercial and supporter systems. Every completed level consumes permanent capacity, so specialising in one department delays or prevents investment elsewhere.</p><div class="menu-pill-row"><span class="menu-pill">${completedLevels} COMPLETED LEVELS</span><span class="menu-pill">${remaining} CAPACITY REMAINING</span><span class="menu-pill">${teamCredits(careerState.credits)} CLUB CASH</span><span class="menu-pill">${active ? `${clubInfrastructureDaysRemaining()}D ACTIVE BUILD` : 'NO ACTIVE PROJECT'}</span></div></div><div class="menu-hero-side"><div class="menu-kicker">DEVELOPMENT CAPACITY</div><div class="menu-side-operator">${used}/${capacity}</div><p>Promotion expands the footprint, but even the top division cannot maximise all six branches.</p></div></div>
      <section class="infrastructure-principles"><article><span>IRREVERSIBLE</span><strong>NO REFUNDS OR RESPECS</strong><p>Approving a project permanently commits the Club Cash and one capacity slot.</p></article><article><span>ONE PROJECT</span><strong>CONSTRUCTION QUEUE</strong><p>Only one facility can be developed at a time. End Day advances construction.</p></article><article><span>CONNECTED EFFECTS</span><strong>NO ISOLATED BONUSES</strong><p>Every branch changes an existing system you already manage elsewhere.</p></article></section>
      ${active ? `<section class="infrastructure-active-project"><div><span>ACTIVE CAPITAL PROJECT</span><strong>${escapeCareerHtml(activeBranch?.label || 'CLUB PROJECT')} · ${escapeCareerHtml(activeBranch?.tierNames?.[active.targetLevel - 1] || '')}</strong><p>${escapeCareerHtml(activeBranch?.effects?.[active.targetLevel] || '')}</p></div><aside><strong>${clubInfrastructureDaysRemaining()}D</strong><span>REMAINING</span><small>Completes on ${typeof clubDatePartsForAbsoluteDay === 'function' ? escapeCareerHtml(clubDatePartsForAbsoluteDay(active.completeDay)?.compactDate || `club day ${active.completeDay}`) : `club day ${active.completeDay}`}</small></aside></section>` : ''}
      <section class="infrastructure-board-plan"><header><div><span>BOARD DEVELOPMENT PLAN</span><strong>${recommended ? `${escapeCareerHtml(recommended.label)} RECOMMENDED NEXT` : 'CAPACITY PLAN COMPLETE'}</strong><p>${recommended ? `The suggested opening order balances player growth, recruitment information, availability and long-term club sustainability. It is advice only; your permanent choices define the club.` : 'No further project is currently recommended.'}</p></div><b>${remaining} SLOT${remaining === 1 ? '' : 'S'} FREE</b></header><div>${openingOrder}</div></section>
      <section class="infrastructure-tree"><div class="career-section-head"><div><span>PERMANENT UPGRADE TREE</span><strong>CHOOSE THE CLUB'S SPECIALISATION</strong></div><p>Each branch contains four sequential levels. Current division capacity: ${capacity}; total possible levels across all branches: ${Object.keys(CLUB_INFRASTRUCTURE_BRANCHES).length * CLUB_INFRASTRUCTURE_BRANCH_MAX}.</p></div><div class="infrastructure-branch-grid">${Object.keys(CLUB_INFRASTRUCTURE_BRANCHES).map(id => clubInfrastructureBranchMarkup(id, recommendedId)).join('')}</div></section>
      <section class="infrastructure-history"><div class="career-section-head compact"><div><span>CAPITAL PROJECT HISTORY</span><strong>PERMANENT CLUB RECORD</strong></div><p>Completed investments remain part of the club through promotion, relegation and future seasons.</p></div>${history.length ? `<div>${history.map(item => `<article><span>DAY ${Math.max(0, Number(item.day) || 0)}</span><strong>${escapeCareerHtml(CLUB_INFRASTRUCTURE_BRANCHES[item.branchId]?.label || item.branchId)} · LEVEL ${Math.max(1, Number(item.targetLevel) || 1)}</strong><small>${escapeCareerHtml(item.name || '')} · ${teamCredits(item.cost || 0)}</small></article>`).join('')}</div>` : '<p class="infrastructure-history-empty">No infrastructure project has been completed yet.</p>'}</section>`;
  }

  function handleInfrastructureClick(event) {
    const cancel = event.target.closest('[data-infrastructure-cancel]');
    if (cancel) {
      infrastructurePendingBranchId = '';
      updateMenuUI();
      return true;
    }
    const plan = event.target.closest('[data-infrastructure-plan]');
    if (plan) {
      const branchId = String(plan.dataset.infrastructurePlan || '');
      const reason = clubInfrastructureProjectBlockReason(branchId);
      if (reason) {
        showManagementBlocked('PROJECT UNAVAILABLE', reason, { route: 'infrastructure', routeLabel: 'RETURN TO INFRASTRUCTURE', returnFocus: plan });
        return true;
      }
      infrastructurePendingBranchId = branchId;
      updateMenuUI();
      requestAnimationFrame(() => {
        const card = document.querySelector(`[data-infrastructure-branch="${CSS.escape(branchId)}"]`);
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const confirm = card?.querySelector('[data-infrastructure-confirm]');
        if (confirm && typeof confirm.focus === 'function') confirm.focus({ preventScroll: true });
      });
      return true;
    }
    const confirm = event.target.closest('[data-infrastructure-confirm]');
    if (confirm) {
      const branchId = String(confirm.dataset.infrastructureConfirm || '');
      const result = clubInfrastructureStartProject(branchId);
      if (!result.ok) showManagementBlocked('PROJECT COULD NOT START', result.reason || 'The club cannot begin this project.', { route: 'infrastructure', routeLabel: 'RETURN TO INFRASTRUCTURE', returnFocus: confirm });
      else showStatus(`${CLUB_INFRASTRUCTURE_BRANCHES[branchId].short} PROJECT STARTED · ${result.next.days} DAYS`);
      return true;
    }
    return false;
  }

  clubInfrastructureState();
