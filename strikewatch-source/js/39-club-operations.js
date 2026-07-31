/*
 * Strikewatch source module: 39-club-operations.js
 * Purpose: Simulated calendar, inbox, tactical formations, assistant-manager staff and scouting stars.
 *
 * This file shares the application scope with the other source fragments.
 * Run `python3 build.py` to regenerate the development bundle and standalone.
 */

  const CLUB_DAY_NAMES = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];
  const CLUB_MONTH_NAMES = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  const CLUB_MONTH_SHORT_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const CLUB_CALENDAR_EPOCH = Object.freeze({ year: 2026, monthIndex: 7, dayOfMonth: 3 });
  const CLUB_CALENDAR_DAY_MS = 86400000;
  let clubMailView = 'inbox';

  function clubDateObjectForAbsoluteDay(absoluteDay = 0) {
    const day = Math.round(Number(absoluteDay) || 0);
    const epoch = Date.UTC(CLUB_CALENDAR_EPOCH.year, CLUB_CALENDAR_EPOCH.monthIndex, CLUB_CALENDAR_EPOCH.dayOfMonth);
    return new Date(epoch + day * CLUB_CALENDAR_DAY_MS);
  }

  function clubAbsoluteDayForDate(year, monthIndex, dayOfMonth = 1) {
    const epoch = Date.UTC(CLUB_CALENDAR_EPOCH.year, CLUB_CALENDAR_EPOCH.monthIndex, CLUB_CALENDAR_EPOCH.dayOfMonth);
    const target = Date.UTC(Math.round(Number(year) || CLUB_CALENDAR_EPOCH.year), Math.round(Number(monthIndex) || 0), Math.round(Number(dayOfMonth) || 1));
    return Math.round((target - epoch) / CLUB_CALENDAR_DAY_MS);
  }

  function clubDatePartsForAbsoluteDay(absoluteDay = 0) {
    const dayNumber = Math.round(Number(absoluteDay) || 0);
    const date = clubDateObjectForAbsoluteDay(dayNumber);
    const weekdayIndex = (date.getUTCDay() + 6) % 7;
    const monthIndex = date.getUTCMonth();
    const year = date.getUTCFullYear();
    const dayOfMonth = date.getUTCDate();
    const day = CLUB_DAY_NAMES[weekdayIndex] || 'MONDAY';
    const month = CLUB_MONTH_NAMES[monthIndex] || 'AUGUST';
    const shortMonth = CLUB_MONTH_SHORT_NAMES[monthIndex] || 'AUG';
    return {
      absoluteDay: dayNumber,
      weekdayIndex,
      day,
      shortDay: day.slice(0, 3),
      dayOfMonth,
      monthIndex,
      month,
      shortMonth,
      year,
      iso: `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`,
      fullDate: `${day} ${dayOfMonth} ${month} ${year}`,
      compactDate: `${dayOfMonth} ${shortMonth} ${year}`,
      week: Math.floor(dayNumber / 7) + 1
    };
  }
  const CLUB_FORMATIONS = Object.freeze({
    balanced: {
      id: 'balanced', name: 'BALANCED 1–1–1–1–1', short: 'BALANCED',
      description: 'A flexible five with one operator prioritised for each major responsibility.',
      roleWeights: { entry: 1.08, support: 1.08, anchor: 1.08, flanker: 1.05, marksman: 1.05, caller: 1.08, flex: 1.10 },
      aggression: 0, mobility: 0, awareness: 0
    },
    pressure: {
      id: 'pressure', name: 'PRESSURE 2–1–1–1', short: 'PRESSURE',
      description: 'Favours entries, support and mobility for faster openings and aggressive trades.',
      roleWeights: { entry: 1.28, support: 1.18, anchor: 0.88, flanker: 1.14, marksman: 0.90, caller: 1.02, flex: 1.04 },
      aggression: 0.08, mobility: 0.04, awareness: -0.01
    },
    control: {
      id: 'control', name: 'CONTROL 1–2–1–1', short: 'CONTROL',
      description: 'Prioritises information, support and stable territory before committing.',
      roleWeights: { entry: 0.92, support: 1.18, anchor: 1.12, flanker: 0.94, marksman: 1.02, caller: 1.26, flex: 1.04 },
      aggression: -0.04, mobility: -0.01, awareness: 0.06
    },
    defensive: {
      id: 'defensive', name: 'DEFENSIVE 1–1–2–1', short: 'DEFENSIVE',
      description: 'Selects durable anchors and measured ranged players for safer round control.',
      roleWeights: { entry: 0.82, support: 1.08, anchor: 1.34, flanker: 0.86, marksman: 1.18, caller: 1.12, flex: 1.00 },
      aggression: -0.09, mobility: -0.03, awareness: 0.04
    },
    wide: {
      id: 'wide', name: 'WIDE 1–1–1–2', short: 'WIDE',
      description: 'Favours flankers and mobile operators who can create separated firing angles.',
      roleWeights: { entry: 1.02, support: 1.02, anchor: 0.86, flanker: 1.34, marksman: 0.98, caller: 1.04, flex: 1.08 },
      aggression: 0.03, mobility: 0.07, awareness: 0.01
    }
  });
  const STAFF_FIRST_NAMES = ['Alex','Amir','Beth','Callum','Daria','Elena','Fraser','Grace','Hugo','Imani','Jonas','Kara','Lewis','Maya','Noah','Priya','Ruben','Sara','Theo','Zara'];
  const STAFF_LAST_NAMES = ['Barnes','Bennett','Clarke','Dawson','Evans','Fletcher','Grant','Hayes','Iqbal','Jensen','Khan','Lewis','Morgan','Patel','Reed','Shaw','Turner','Walker','Young','Zimmer'];
  const STAFF_STYLES = ['Pragmatic organiser','Youth developer','Data-led selector','Motivational coach','Tactical specialist','Fitness-conscious planner'];

  function clubCalendarState() {
    careerState.calendar = careerState.calendar && typeof careerState.calendar === 'object' ? careerState.calendar : {};
    const calendar = careerState.calendar;
    calendar.absoluteDay = Math.max(0, Math.round(Number(calendar.absoluteDay) || 0));
    calendar.dayOfWeek = clamp(Math.round(Number(calendar.dayOfWeek) || (calendar.absoluteDay % 7)), 0, 6);
    calendar.seasonYear = Math.max(1, Math.round(Number(calendar.seasonYear) || 1));
    calendar.nextLeagueDay = Math.max(calendar.absoluteDay, Math.round(Number(calendar.nextLeagueDay) || 5));
    calendar.lastWeeklySummary = Math.max(0, Math.round(Number(calendar.lastWeeklySummary) || 0));
    const currentWeek = Math.floor(calendar.absoluteDay / 7) + 1;
    calendar.lastPayrollWeek = Math.max(1, Math.round(Number(calendar.lastPayrollWeek) || currentWeek));
    calendar.lastMatchDay = Number.isFinite(Number(calendar.lastMatchDay)) ? Math.round(Number(calendar.lastMatchDay)) : -1;
    careerState.week = currentWeek;
    return calendar;
  }

  function clubCurrentDateParts() {
    const calendar = clubCalendarState();
    const date = clubDatePartsForAbsoluteDay(calendar.absoluteDay);
    const week = Math.max(1, Number(careerState.week) || date.week || 1);
    const season = Math.max(1, Number(careerState.league?.season) || Number(calendar.seasonYear) || 1);
    calendar.dayOfWeek = date.weekdayIndex;
    return { ...date, week, season };
  }

  function clubCurrentDateLabel(compact = false) {
    const date = clubCurrentDateParts();
    return compact
      ? `${date.shortDay} ${date.dayOfMonth} ${date.shortMonth} · W${date.week}`
      : `${date.fullDate} · WEEK ${date.week} · SEASON ${date.season}`;
  }

  function clubDaysUntilFixture() {
    const calendar = clubCalendarState();
    if (typeof leagueSeasonComplete === 'function' && leagueSeasonComplete()) return null;
    return Math.max(0, calendar.nextLeagueDay - calendar.absoluteDay);
  }

  function clubLeagueMatchDue() {
    const days = clubDaysUntilFixture();
    return days === 0;
  }

  function clubCanPlayMatchToday() {
    const calendar = clubCalendarState();
    return calendar.lastMatchDay !== calendar.absoluteDay;
  }

  function clubMarkMatchPlayedToday() {
    const calendar = clubCalendarState();
    calendar.lastMatchDay = calendar.absoluteDay;
    return calendar.lastMatchDay;
  }

  function clubScheduleNextLeagueFixture() {
    const calendar = clubCalendarState();
    const current = calendar.absoluteDay;
    let nextSaturday = current + ((5 - (current % 7) + 7) % 7);
    if (nextSaturday <= current) nextSaturday += 7;
    calendar.nextLeagueDay = nextSaturday;
    return nextSaturday;
  }

  function clubUnreadMailCount() {
    return (careerState.mail || []).reduce((count, item) => count + (!item.read ? 1 : 0), 0);
  }

  function clubEndDayBlockers() {
    if (!careerState.created) return [];
    const blockers = [];
    if (typeof leagueSeasonComplete === 'function' && leagueSeasonComplete()) {
      blockers.push({ id: 'season-transition', route: 'league', category: 'COMPETITION', label: 'START OR REVIEW THE NEXT SEASON', detail: 'The completed campaign must be reviewed before the club calendar can continue.', targetId: 'league:season-transition' });
    }
    if (clubLeagueMatchDue() && clubCanPlayMatchToday()) {
      const fixture = typeof leagueNextFixture === 'function' ? leagueNextFixture() : null;
      const opponent = fixture && typeof leagueClubById === 'function' && typeof leagueFixtureOpponentId === 'function' ? leagueClubById(leagueFixtureOpponentId(fixture)) : null;
      blockers.push({ id: 'matchday', route: 'play', category: 'MATCHDAY', label: "PLAY TODAY'S LEAGUE MATCH", detail: `${opponent?.name || 'The scheduled opposition'} must be faced before the calendar can advance.`, targetId: 'operations:matchday' });
    }

    const transfers = typeof transferState === 'function' ? transferState() : null;
    const incoming = transfers?.activeIncoming;
    if (incoming && ['draft','countered','agreed'].includes(incoming.status)) {
      const player = typeof transferMarketPlayer === 'function' ? transferMarketPlayer(incoming.playerId) : null;
      const stateLabel = incoming.status === 'agreed' ? 'COMPLETE OR WITHDRAW SIGNING' : incoming.status === 'countered' ? 'RESPOND TO COUNTER-OFFER' : 'COMPLETE OR WITHDRAW NEGOTIATION';
      blockers.push({ id: `incoming-${incoming.id || incoming.playerId || 'transfer'}`, route: 'transfers', category: 'TRANSFERS', label: stateLabel, detail: `${player?.name || 'An incoming player negotiation'} is waiting for a decision.`, playerId: incoming.playerId || null, incomingId: incoming.id || null, targetId: `transfer:${incoming.id || incoming.playerId}` });
    }

    for (const offer of (transfers?.outgoingOffers || []).filter(item => ['pending','countered','agreed'].includes(item.status))) {
      const player = typeof transferSquadPlayer === 'function' ? transferSquadPlayer(offer.playerId) : null;
      blockers.push({ id: `outgoing-${offer.id}`, route: 'transfers', category: 'TRANSFERS', label: offer.status === 'countered' ? 'RESPOND TO TRANSFER COUNTER' : offer.status === 'agreed' ? 'COMPLETE PLAYER SALE' : 'RESPOND TO TRANSFER BID', detail: `${offer.clubName || 'A rival club'} is waiting for a decision${player ? ` about ${player.name}` : ''}.`, playerId: offer.playerId || null, offerId: offer.id, targetId: `transfer:${offer.id}` });
    }

    if (typeof sponsorshipPendingOffers === 'function') {
      for (const offer of sponsorshipPendingOffers()) {
        const brand = typeof sponsorBrand === 'function' ? sponsorBrand(offer.brandId) : null;
        blockers.push({ id: `sponsor-${offer.id}`, route: 'commercial', category: 'COMMERCIAL', label: 'RESPOND TO SPONSORSHIP OFFER', detail: `${brand?.name || 'A commercial partner'} is waiting for an accept or decline decision.`, sponsorOfferId: offer.id, targetId: `sponsor:${offer.id}` });
      }
    }
    if (typeof clubDecisionBlockers === 'function') blockers.push(...clubDecisionBlockers());
    return blockers;
  }

  function clubCanEndDay() {
    return Boolean(careerState.created && appState !== 'match' && menuContext !== 'pause' && !matchmakingState?.active && clubEndDayBlockers().length === 0);
  }

  function clubEndDayBlockSummary() {
    const blockers = clubEndDayBlockers();
    if (!blockers.length) return '';
    return blockers.length === 1 ? blockers[0].label : `${blockers.length} DECISIONS REQUIRE ATTENTION`;
  }

  function renderClubMustRespondStrip() {
    const blockers = clubEndDayBlockers();
    if (!blockers.length || menuContext === 'pause') return '';
    const groups = new Map();
    for (const blocker of blockers) {
      const category = String(blocker.category || 'REQUIRED').toUpperCase();
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(blocker);
    }
    const groupedMarkup = [...groups.entries()].map(([category, items]) => `<section class="club-response-group"><header><span>${escapeCareerHtml(category)}</span><strong>${items.length}</strong></header><div>${items.map(blocker => {
      const actionId = typeof managementActionIdForBlocker === 'function' ? managementActionIdForBlocker(blocker) : '';
      return `<button ${actionId ? `data-management-action-id="${escapeCareerHtml(actionId)}"` : `data-team-route="${escapeCareerHtml(blocker.route)}"`}><span>${escapeCareerHtml(blocker.label)}</span><small>${escapeCareerHtml(blocker.detail)}</small><b>OPEN →</b></button>`;
    }).join('')}</div></section>`).join('');
    const first = blockers[0];
    const summaryLabel = blockers.length === 1 ? first.label : `${blockers.length} REQUIRED ACTIONS`;
    const summaryDetail = blockers.length === 1 ? first.detail : `${first.label} · ${blockers.length - 1} more`;
    return `<details class="club-must-respond-strip" data-management-action-rank="urgent" aria-label="Actions required before ending the day"><summary><span><b>MUST RESPOND</b><strong>${escapeCareerHtml(summaryLabel)}</strong><small>${escapeCareerHtml(summaryDetail)}</small></span><i aria-hidden="true"></i></summary><div class="club-must-respond-body"><header><span>MUST RESPOND</span><strong>${blockers.length} ACTION${blockers.length === 1 ? '' : 'S'} REQUIRED BEFORE ENDING THE DAY</strong><small>Resolve ${blockers.length === 1 ? 'this item' : 'these items'} before advancing the calendar.</small></header><div class="club-response-groups">${groupedMarkup}</div></div></details>`;
  }

  function clubAddMail(subject, body, category = 'CLUB', important = false, actionRoute = null, options = null) {
    careerState.mail = Array.isArray(careerState.mail) ? careerState.mail : [];
    careerState.mailSequence = Math.max(0, Math.round(Number(careerState.mailSequence) || 0)) + 1;
    const meta = options && typeof options === 'object' && !Array.isArray(options) ? options : {};
    const message = {
      id: `MAIL-${careerState.mailSequence}`,
      sequence: careerState.mailSequence,
      subject: String(subject || 'Club update').slice(0, 100),
      body: String(body || '').slice(0, 6000),
      preview: String(meta.preview || '').slice(0, 220),
      sender: String(meta.sender || '').slice(0, 90),
      category: String(category || 'CLUB').slice(0, 24).toUpperCase(),
      important: Boolean(important),
      organic: Boolean(meta.organic),
      storyKey: String(meta.storyKey || '').slice(0, 120),
      read: false,
      saved: false,
      actionRoute: actionRoute || null,
      day: clubCalendarState().absoluteDay,
      dateLabel: clubCurrentDateLabel(true)
    };
    careerState.mail.unshift(message);
    clubTrimMailStore();
    return message;
  }

  function clubSelectedMail(view = clubMailView) {
    const selectedId = careerState.selectedMailId;
    const messages = clubMailMessagesForView(view);
    const selected = messages.find(item => item.id === selectedId) || null;
    return selected || (view === 'saved' ? messages[0] || null : null);
  }

  function clubNormaliseStaffMember(member, fallbackId = 'staff') {
    return {
      id: String(member?.id || fallbackId),
      name: normaliseCareerName(member?.name || 'Unknown Staff') || 'Unknown Staff',
      role: 'assistant-manager',
      divisionTier: normaliseLeagueTier(member?.divisionTier),
      judgingAbility: clamp(Math.round(Number(member?.judgingAbility) || 4), 1, 10),
      judgingPotential: clamp(Math.round(Number(member?.judgingPotential) || 4), 1, 10),
      tactics: clamp(Math.round(Number(member?.tactics) || 4), 1, 10),
      manManagement: clamp(Math.round(Number(member?.manManagement) || 4), 1, 10),
      fitness: clamp(Math.round(Number(member?.fitness) || 4), 1, 10),
      wage: Math.max(500, Math.round(Number(member?.wage) || 1800)),
      // A genuine zero fee (the inherited founding assistant) must survive
      // normalisation; `|| 5000` silently replaced it.
      signingFee: Number.isFinite(Number(member?.signingFee)) ? Math.max(0, Math.round(Number(member.signingFee))) : 5000,
      style: String(member?.style || 'Pragmatic organiser'),
      employedWeek: Math.max(0, Math.round(Number(member?.employedWeek) || 0)),
      founding: Boolean(member?.founding)
    };
  }

  function clubGenerateStaffPool(seed = Date.now(), divisionTier = leagueDivisionTier()) {
    const random = teamRng((Number(seed) || 1) ^ 0x5a17c9);
    const divisionQuality = (3 - divisionTier) * 1.55;
    const pool = [];
    for (let i = 0; i < 10; i++) {
      const base = 2.2 + divisionQuality + random() * 3.3;
      const name = `${teamPick(random, STAFF_FIRST_NAMES)} ${teamPick(random, STAFF_LAST_NAMES)}`;
      const average = base + random() * 0.8;
      pool.push(clubNormaliseStaffMember({
        id: `ST-${divisionTier}-${(Number(seed) >>> 0).toString(36)}-${i}`,
        name,
        divisionTier,
        judgingAbility: Math.round(base + random() * 1.8),
        judgingPotential: Math.round(base + random() * 2.0),
        tactics: Math.round(base + random() * 2.1),
        manManagement: Math.round(base + random() * 1.9),
        fitness: Math.round(base + random() * 1.8),
        wage: Math.round((850 + average * 520 + divisionQuality * 850) / 100) * 100,
        signingFee: Math.round((3500 + average * 2400 + divisionQuality * 3500) / 1000) * 1000,
        style: teamPick(random, STAFF_STYLES)
      }, `ST-${i}`));
    }
    return pool.sort((a, b) => (b.tactics + b.judgingAbility + b.manManagement) - (a.tactics + a.judgingAbility + a.manManagement));
  }

  function clubAssistantManager() {
    const id = careerState.staff?.assistantManagerId;
    return (careerState.staff?.employees || []).find(member => member.id === id) || null;
  }

  // Build 12.134: a club is founded with one inherited assistant manager. This
  // is what the formation, approach and line-up recommendations have always
  // come from, so the advice now has a visible author with a name, a wage and a
  // measurable level of judgement.
  //
  // They are deliberately a weak Division 3 appointment: their ratings sit at
  // the bottom of the generated range, which feeds `clubPlayerSelectionScore`
  // exactly like any other assistant. Better advice has to be bought.
  function clubCreateFoundingAssistant() {
    const seed = Math.max(1, teamSeedFromString(`${careerState.name}:${careerState.managerName}:founding-assistant:${careerState.marketSeed || 1}`));
    const random = teamRng(seed ^ 0x3f19b7);
    const name = `${teamPick(random, STAFF_FIRST_NAMES)} ${teamPick(random, STAFF_LAST_NAMES)}`;
    const base = 2.1 + random() * 1.5;
    return clubNormaliseStaffMember({
      id: `ST-FOUNDING-${(seed >>> 0).toString(36)}`,
      name,
      divisionTier: leagueDivisionTier(),
      judgingAbility: Math.round(base + random() * 1.2),
      judgingPotential: Math.round(base + random() * 1.6),
      tactics: Math.round(base + random() * 1.3),
      manManagement: Math.round(base + random() * 1.4),
      fitness: Math.round(base + random() * 1.2),
      // Carried on the wage bill from day one, but signed before the manager
      // arrived, so there is no signing fee to recover.
      wage: Math.round((900 + base * 240) / 50) * 50,
      signingFee: 0,
      style: teamPick(random, STAFF_STYLES),
      founding: true
    }, 'ST-FOUNDING');
  }

  function clubEnsureFoundingAssistant() {
    const staff = careerState.staff;
    if (!staff || staff.foundingAssistantAppointed) return null;
    // Only seed the inherited appointment on a club that has never employed
    // anyone; never re-appoint after the manager releases or replaces them.
    staff.foundingAssistantAppointed = true;
    if ((staff.employees || []).length || staff.assistantManagerId) return null;
    const assistant = clubCreateFoundingAssistant();
    staff.employees.push(assistant);
    staff.assistantManagerId = assistant.id;
    clubAddMail(
      `${assistant.name} is your assistant manager`,
      `${assistant.name} was already under contract when you took over and stays on ${teamCredits(assistant.wage)} per week. They are a ${assistant.style.toLowerCase()} with modest judgement for this level, and theirs is the voice behind the formation, approach and line-up recommendations you will see on the Tactics page. Treat the advice as an opinion, not an instruction — a better assistant can be appointed from Staff at any time, and replacing them ends this contract.`,
      'STAFF', false, 'staff'
    );
    return assistant;
  }

  function clubStaffWageBill() {
    return (careerState.staff?.employees || []).reduce((sum, member) => sum + Math.max(0, Number(member.wage) || 0), 0);
  }

  function clubTotalWageBill() {
    return teamSquadWageBill() + clubStaffWageBill();
  }

  function clubFormation() {
    const tactics = typeof workflowTacticsReadState === 'function' ? workflowTacticsReadState() : careerState.tactics;
    return CLUB_FORMATIONS[tactics?.formationId] || CLUB_FORMATIONS.balanced;
  }

  function clubLineupMode() {
    const tactics = typeof workflowTacticsReadState === 'function' ? workflowTacticsReadState() : careerState.tactics;
    return tactics?.lineupMode === 'assistant' ? 'assistant' : 'manual';
  }

  function clubPlayerSelectionScore(player, formation = clubFormation(), assistant = clubAssistantManager()) {
    if (!player) return -Infinity;
    const role = teamRoleById(player.role);
    const roleFit = formation.roleWeights[role.id] || formation.roleWeights.flex || 1;
    const readiness = teamReadinessScore(player);
    const medicalPenalty = typeof playerInjuryPenalty === 'function' ? playerInjuryPenalty(player) * 42 : 0;
    const assistantQuality = assistant ? (assistant.tactics + assistant.judgingAbility + assistant.fitness) / 30 : 0.45;
    const form = clamp(Number(player.form) || 6.5, 1, 10);
    const sharpness = clamp(Number(player.matchSharpness) || 68, 1, 100);
    return (
      teamPlayerOverall(player) * 1.28 * roleFit +
      readiness * (0.36 + assistantQuality * 0.12) +
      form * 3.8 +
      sharpness * 0.08 -
      Math.max(0, Number(player.fatigue) || 0) * 0.24 -
      medicalPenalty
    );
  }

  function clubApplyAssistantLineup(force = false) {
    const assistant = clubAssistantManager();
    if (!assistant || (!force && clubLineupMode() !== 'assistant') || (careerState.squad || []).length < TEAM_REQUIRED_STARTERS) return false;
    const formation = clubFormation();
    const original = [...careerState.squad];
    const originalOrder = original.map(player => player.id).join('|');
    const ranked = original.slice().sort((a, b) => clubPlayerSelectionScore(b, formation, assistant) - clubPlayerSelectionScore(a, formation, assistant));
    const starters = ranked.slice(0, TEAM_REQUIRED_STARTERS);
    const starterIds = new Set(starters.map(player => player.id));
    const reserves = original.filter(player => !starterIds.has(player.id));
    careerState.squad = [...starters, ...reserves].slice(0, TEAM_MAX_SQUAD);
    syncCareerFirstStarterWeapon();
    const updatedOrder = careerState.squad.map(player => player.id).join('|');
    if (updatedOrder !== originalOrder && typeof clubInvalidateMatchPlan === 'function') clubInvalidateMatchPlan('The assistant changed the active operator line-up.');
    careerState.tactics.lastAssistantSelection = {
      day: clubCalendarState().absoluteDay,
      formationId: formation.id,
      playerIds: starters.map(player => player.id),
      assistantId: assistant.id
    };
    return true;
  }

  function clubCurrentPoolOptions(kind = 'players') {
    const tier = leagueDivisionTier();
    return [3,2,1,0].map(value => {
      const definition = leagueDivisionDefinition(value);
      const unlocked = value === tier;
      return `<option value="${value}" ${unlocked ? 'selected' : 'disabled'}>${definition.poolLabel}${unlocked ? '' : ' · LOCKED'}</option>`;
    }).join('');
  }

  function clubAbilityStarsFromRating(rating, potential = false) {
    const tier = leagueDivisionTier();
    const divisionBase = { 3: 24, 2: 38, 1: 52, 0: 66 }[tier] || 24;
    const scale = potential ? 13 : 11;
    const stars = clamp((Number(rating) - divisionBase) / scale + 2.25, 0.5, 5);
    return Math.round(stars * 2) / 2;
  }

  function clubStarsMarkup(stars, label = 'ABILITY', tone = '') {
    const value = clamp(Number(stars) || 0.5, 0.5, 5);
    let icons = '';
    for (let i = 1; i <= 5; i++) {
      if (value >= i) icons += '<span class="full">★</span>';
      else if (value >= i - 0.5) icons += '<span class="half">★</span>';
      else icons += '<span class="empty">★</span>';
    }
    return `<span class="scouting-stars ${tone}" aria-label="${label} ${value.toFixed(1)} out of 5"><span>${icons}</span><small>${label} ${value.toFixed(1)}</small></span>`;
  }

  function clubPlayerAbilityStars(player) {
    return clubAbilityStarsFromRating(teamPlayerOverall(player), false);
  }

  function clubPlayerPotentialStars(player) {
    return clubAbilityStarsFromRating(Number(player?.potential) || 0, true);
  }

  function clubDailyRecovery() {
    const updates = [];
    const dayOfWeek = clubCalendarState().dayOfWeek;
    for (const player of careerState.squad || []) {
      const beforeFatigue = Number(player.fatigue) || 0;
      const training = typeof applyPlayerTrainingDay === 'function'
        ? applyPlayerTrainingDay(player, dayOfWeek)
        : { progress: 0, statGained: null, recovered: 0 };
      const medical = typeof recoverPlayerInjuryDay === 'function'
        ? recoverPlayerInjuryDay(player)
        : { recovered: false, remainingDays: player.injury?.recoveryDaysRemaining || 0 };
      if (beforeFatigue !== player.fatigue) updates.push({ type: 'fatigue', player, amount: beforeFatigue - player.fatigue });
      if (training?.statGained) updates.push({ type: 'development', player, stat: training.statGained });
      if (medical?.recovered) updates.push({ type: 'medical', player, name: medical.name });
      if (typeof updatePlayerMarketProfile === 'function') updatePlayerMarketProfile(player);
    }
    return updates;
  }

  function clubWeeklyCalendarTasks() {
    const calendar = clubCalendarState();
    if (calendar.lastWeeklySummary >= careerState.week) return;

    while (calendar.lastPayrollWeek < careerState.week) {
      const payrollWeek = calendar.lastPayrollWeek;
      const wages = typeof clubTotalWageBill === 'function' ? clubTotalWageBill() : teamSquadWageBill();
      if (wages > 0) {
        careerState.credits -= wages;
        teamFinanceTransaction('WAGES', -wages, `Week ${payrollWeek} player and staff payroll`);
        clubAddMail(`Week ${payrollWeek} payroll processed`, `${teamCredits(wages)} has been paid across player contracts and employed staff. The club balance is now ${teamCredits(careerState.credits)}.`, 'FINANCE', false, 'barracks');
      }
      for (const player of careerState.squad || []) player.contractWeeks = Math.max(0, Math.round(Number(player.contractWeeks) || 0) - 1);
      calendar.lastPayrollWeek++;
    }

    calendar.lastWeeklySummary = careerState.week;
    if (clubLineupMode() === 'assistant') clubApplyAssistantLineup(false);
    if (careerState.week > 1 && careerState.week % 3 === 0) {
      if (typeof dynamicTransferMarketWeeklyReview === 'function') dynamicTransferMarketWeeklyReview(careerState.week);
      else {
        careerState.marketSeed = (careerState.marketSeed + 65537 + careerState.week * 131) >>> 0;
        careerState.market = generateTeamMarket(careerState.marketSeed);
        clubAddMail('Recruitment shortlist refreshed', `The ${leagueDivisionPoolLabel()} has been refreshed for Week ${careerState.week}. New affordable candidates are available to scout.`, 'RECRUITMENT', false, 'market');
      }
    }
    clubAddMail(`Week ${careerState.week} planning update`, `The club has entered Week ${careerState.week}. Review player fatigue, training assignments, the selected formation and the assistant manager's proposed active operator line-up.`, 'CALENDAR', false, 'play');
  }

  function advanceCareerDay() {
    if (!careerState.created || appState === 'match' || menuContext === 'pause' || matchmakingState?.active) return false;
    const blockers = clubEndDayBlockers();
    if (blockers.length) {
      const first = blockers[0];
      showStatus(`MUST RESPOND · ${first.label}`);
      if (menuTab !== 'play') setMenuRoute('play');
      else updateMenuUI();
      requestAnimationFrame(() => {
        const scroller = menuContentEl?.closest('.menu-content');
        if (scroller) scroller.scrollTop = 0;
      });
      return false;
    }
    const calendar = clubCalendarState();
    calendar.absoluteDay++;
    calendar.dayOfWeek = calendar.absoluteDay % 7;
    careerState.week = Math.floor(calendar.absoluteDay / 7) + 1;
    if (typeof clubInfrastructureProcessDay === 'function') clubInfrastructureProcessDay(calendar.absoluteDay);
    const dailyUpdates = clubDailyRecovery();
    for (const update of dailyUpdates) {
      if (update.type === 'development') {
        const stat = CAREER_STAT_DEFS[update.stat]?.label || update.stat;
        clubAddMail(`${update.player.name} improved`, `${update.player.name} completed enough daily training to increase ${stat} to ${update.player.stats[update.stat]}. Their value and transfer interest have been recalculated.`, 'TRAINING', true, 'training');
      } else if (update.type === 'medical') {
        clubAddMail(`${update.player.name} cleared to play`, `${update.name} has been cleared by the medical staff. ${update.player.name} is available without the injury penalty.`, 'MEDICAL', true, 'profile');
      }
    }
    clubWeeklyCalendarTasks();
    if (typeof transferProcessDay === 'function') transferProcessDay();
    if (typeof clubMaybeGenerateDecision === 'function') clubMaybeGenerateDecision();
    if (clubLeagueMatchDue()) {
      const fixture = typeof leagueNextFixture === 'function' ? leagueNextFixture() : null;
      const opponent = fixture && typeof leagueClubById === 'function' ? leagueClubById(leagueFixtureOpponentId(fixture)) : null;
      clubAddMail('League matchday has arrived', `${careerState.name} are due to face ${opponent?.name || 'the next league opponent'} today. Confirm the formation and active operator line-up before entering matchmaking.`, 'MATCHDAY', true, 'play');
    }
    if (clubLineupMode() === 'assistant') clubApplyAssistantLineup(false);
    saveCareerState();
    updateMenuUI();
    showStatus(clubLeagueMatchDue() ? 'MATCHDAY · REVIEW ACTIVE FIVE OPERATORS' : `${clubCurrentDateLabel(true)} · DAY ADVANCED`);
    return true;
  }

  function hireAssistantManager(id) {
    if (menuContext === 'pause' || appState === 'match') return { ok: false, reason: 'Staff changes are locked during a live match.' };
    const candidate = (careerState.staff?.pool || []).find(item => item.id === id) || null;
    if (!candidate) return { ok: false, reason: 'Candidate unavailable.' };
    if (careerState.credits < candidate.signingFee) return { ok: false, reason: 'Insufficient credits for the signing fee.' };
    const previous = clubAssistantManager();
    const projectedWages = clubTotalWageBill() - (previous?.wage || 0) + candidate.wage;
    if (projectedWages > careerState.wageBudget) return { ok: false, reason: 'The appointment would exceed the weekly wage budget.' };
    if (previous) careerState.staff.employees = careerState.staff.employees.filter(item => item.id !== previous.id);
    const employed = { ...candidate, employedWeek: careerState.week };
    careerState.staff.employees.push(employed);
    careerState.staff.assistantManagerId = employed.id;
    careerState.staff.pool = careerState.staff.pool.filter(item => item.id !== id);
    careerState.credits -= employed.signingFee;
    teamFinanceTransaction('STAFF', -employed.signingFee, `Assistant manager signing · ${employed.name}`);
    clubAddMail('Assistant manager appointed', `${employed.name} has joined as assistant manager. You can delegate active-operator selection from the Tactics page or retain manual control.`, 'STAFF', true, 'tactics');
    saveCareerState();
    updateMenuUI();
    return { ok: true, staff: employed };
  }

  function releaseAssistantManager() {
    const assistant = clubAssistantManager();
    if (!assistant || menuContext === 'pause' || appState === 'match') return false;
    careerState.staff.employees = careerState.staff.employees.filter(item => item.id !== assistant.id);
    careerState.staff.assistantManagerId = null;
    careerState.staff.foundingAssistantAppointed = true;
    careerState.tactics.lineupMode = 'manual';
    clubAddMail('Assistant manager departed', `${assistant.name} has left the club. Starting-five selection has returned to manual control.`, 'STAFF', false, 'tactics');
    saveCareerState();
    updateMenuUI();
    return true;
  }

  function refreshStaffPool() {
    if (menuContext === 'pause' || appState === 'match') return false;
    const fee = 1500;
    if (careerState.credits < fee) return false;
    careerState.credits -= fee;
    teamFinanceTransaction('STAFF', -fee, 'Staff recruitment search');
    careerState.staff.poolSeed = (careerState.staff.poolSeed + 9187 + careerState.week * 31) >>> 0;
    careerState.staff.pool = clubGenerateStaffPool(careerState.staff.poolSeed, leagueDivisionTier());
    saveCareerState();
    updateMenuUI();
    return true;
  }

  function ensureClubOperationsState() {
    if (!careerState.created) return null;
    clubCalendarState();
    careerState.mail = Array.isArray(careerState.mail) ? careerState.mail.map(item => ({ ...item, read: Boolean(item?.read), saved: Boolean(item?.saved) })) : [];
    careerState.mailSequence = Math.max(0, Math.round(Number(careerState.mailSequence) || 0));
    clubTrimMailStore();
    careerState.staff = careerState.staff && typeof careerState.staff === 'object' ? careerState.staff : {};
    careerState.staff.employees = Array.isArray(careerState.staff.employees) ? careerState.staff.employees.map((item, index) => clubNormaliseStaffMember(item, `EMP-${index}`)) : [];
    careerState.staff.assistantManagerId = careerState.staff.assistantManagerId || null;
    careerState.staff.foundingAssistantAppointed = Boolean(careerState.staff.foundingAssistantAppointed);
    careerState.staff.poolSeed = Math.max(1, Math.round(Number(careerState.staff.poolSeed) || teamSeedFromString(`${careerState.name}:staff:${careerState.week}`)));
    careerState.staff.selectedPoolDivision = leagueDivisionTier();
    careerState.staff.pool = Array.isArray(careerState.staff.pool) && careerState.staff.pool.length
      ? careerState.staff.pool.map((item, index) => clubNormaliseStaffMember(item, `POOL-${index}`)).filter(item => item.divisionTier === leagueDivisionTier())
      : clubGenerateStaffPool(careerState.staff.poolSeed, leagueDivisionTier());
    careerState.tactics = careerState.tactics && typeof careerState.tactics === 'object' ? careerState.tactics : {};
    careerState.tactics.formationId = CLUB_FORMATIONS[careerState.tactics.formationId] ? careerState.tactics.formationId : 'balanced';
    careerState.tactics.lineupMode = careerState.tactics.lineupMode === 'assistant' && clubAssistantManager() ? 'assistant' : 'manual';
    careerState.tactics.autoApplyBeforeMatch = careerState.tactics.autoApplyBeforeMatch !== false;
    clubEnsureFoundingAssistant();
    if (!careerState.mail.length) {
      clubAddMail('Welcome to Strikewatch Division 3', 'Your club begins in Division 3, the entry tier of the Strikewatch pyramid. Finish in the top two to earn promotion to Division 2.', 'COMPETITION', true, 'league');
      clubAddMail('Club calendar activated', 'Use End Day to move through the week. League fixtures are scheduled for Saturday, while training, recovery, staff decisions and recruitment can be managed between matchdays.', 'CALENDAR', true, 'play');
      clubAddMail('Staff recruitment available', 'The club employs one assistant manager at a time. They recommend or automatically select the five active operators according to your chosen formation, and a stronger candidate can be appointed from Staff whenever you can afford the fee and wage.', 'STAFF', false, 'staff');
    }
    return careerState;
  }

  function renderClubCalendarStrip() {
    if (!careerState.created) return '';
    const days = clubDaysUntilFixture();
    const fixture = typeof leagueNextFixture === 'function' ? leagueNextFixture() : null;
    const opponent = fixture && typeof leagueClubById === 'function' ? leagueClubById(leagueFixtureOpponentId(fixture)) : null;
    return `${typeof renderDevelopmentAlertsStrip === 'function' ? renderDevelopmentAlertsStrip() : ''}<section class="club-calendar-strip">
      <div><span>CURRENT DATE</span><strong>${clubCurrentDateLabel()}</strong></div>
      <div><span>NEXT LEAGUE FIXTURE</span><strong>${days === null ? 'SEASON COMPLETE' : days === 0 ? 'TODAY' : `${days} DAY${days === 1 ? '' : 'S'}`}</strong><small>${opponent ? escapeCareerHtml(opponent.name) : 'No scheduled opponent'}</small></div>
      <div><span>LINE-UP CONTROL</span><strong>${clubLineupMode() === 'assistant' ? 'ASSISTANT MANAGER' : 'MANUAL'}</strong><small>${escapeCareerHtml(clubFormation().short)}</small></div>
    </section>`;
  }

  function clubMailSender(category = 'CLUB', mail = null) {
    if (mail?.sender) return String(mail.sender);
    const senders = {
      CALENDAR: 'Club Secretary',
      CLUB: 'Club Administration',
      COMPETITION: 'League Office',
      DEVELOPMENT: 'Performance Department',
      FINANCE: 'Finance Office',
      MEDICAL: 'Medical Department',
      RECRUITMENT: 'Recruitment Team',
      COMMERCIAL: 'Commercial Department',
      CONTRACTS: 'Player Liaison Office',
      RESULT: 'League Office',
      MATCHDAY: 'Matchday Operations',
      STAFF: 'Backroom Staff',
      TRAINING: 'Coaching Department',
      TRANSFER: 'Transfer Centre',
      TRANSFERS: 'Transfer Centre'
    };
    const key = String(category || 'CLUB').toUpperCase();
    return senders[key] || `${key.slice(0, 1)}${key.slice(1).toLowerCase()} Desk`;
  }

  function clubMailInitials(category = 'CLUB', mail = null) {
    const sender = clubMailSender(category, mail);
    return sender.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'HQ';
  }

  function clubMailPreview(body = '', mail = null) {
    const text = String(mail?.preview || body || '').replace(/\s+/g, ' ').trim();
    return text.length > 96 ? `${text.slice(0, 93)}…` : text;
  }

  function clubMailById(id) {
    return (careerState.mail || []).find(item => item.id === id) || null;
  }

  function clubMailSequenceValue(mail) {
    const explicit = Number(mail?.sequence);
    if (Number.isFinite(explicit)) return explicit;
    const match = String(mail?.id || '').match(/(\d+)$/);
    return match ? Number(match[1]) : 0;
  }

  function clubMailNewestFirst() {
    return (careerState.mail || [])
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const sequenceDelta = clubMailSequenceValue(b.item) - clubMailSequenceValue(a.item);
        if (sequenceDelta) return sequenceDelta;
        const dayDelta = (Number(b.item?.day) || 0) - (Number(a.item?.day) || 0);
        return dayDelta || a.index - b.index;
      })
      .map(entry => entry.item);
  }

  function clubMailDecisionRequired(mail) {
    const decision = clubMailDecisionForMessage(mail);
    return Boolean(decision && !decision.resolved);
  }

  function clubMailUsesInlineReader() {
    if (typeof window?.matchMedia === 'function') return window.matchMedia('(min-width: 1024px)').matches;
    return Number(window?.innerWidth) >= 1024;
  }

  function clubMailVisibleInInbox(mail) {
    return Boolean(mail && (
      !mail.read
      || clubMailDecisionRequired(mail)
      || (clubMailUsesInlineReader() && careerState.selectedMailId === mail.id)
    ));
  }

  function clubMailMessagesForView(view = clubMailView) {
    const mode = view === 'saved' ? 'saved' : 'inbox';
    return clubMailNewestFirst().filter(mail => mode === 'saved' ? Boolean(mail.saved) : clubMailVisibleInInbox(mail));
  }

  function clubSavedMailCount() {
    return (careerState.mail || []).reduce((count, item) => count + (item.saved ? 1 : 0), 0);
  }

  function clubTrimMailStore(limit = 80) {
    careerState.mail = Array.isArray(careerState.mail) ? careerState.mail : [];
    const ordered = careerState.mail.slice().sort((a, b) => clubMailSequenceValue(b) - clubMailSequenceValue(a));
    const protectedMail = ordered.filter(item => item.saved || clubMailDecisionRequired(item));
    const ordinaryMail = ordered.filter(item => !item.saved && !clubMailDecisionRequired(item));
    careerState.mail = [...protectedMail, ...ordinaryMail].slice(0, Math.max(20, Number(limit) || 80));
    return careerState.mail;
  }

  function clubMailDecisionForMessage(mail) {
    if (!mail?.decisionId || typeof clubDecisionById !== 'function') return null;
    return clubDecisionById(mail.decisionId);
  }

  function clubMailRowElement(id) {
    return Array.from(menuContentEl?.querySelectorAll?.('[data-club-mail]') || []).find(button => button.dataset.clubMail === id) || null;
  }

  function renderClubDecisionMailPreview(mail) {
    const decision = clubMailDecisionForMessage(mail);
    if (!decision) return '';
    if (decision.resolved) {
      const choice = (decision.options || []).find(item => item.id === decision.choiceId);
      return `<section class="club-mail-decision-preview resolved"><span>DECISION RECORDED</span><strong>${escapeCareerHtml(choice?.label || 'RESPONSE SUBMITTED')}</strong><small>${escapeCareerHtml(choice?.result || 'The club has applied the manager response.')}</small></section>`;
    }
    return `<section class="club-mail-decision-preview"><span>MANAGER DECISION REQUIRED</span><strong>OPEN THIS EMAIL TO RESPOND</strong><small>${decision.options?.length || 0} response option${decision.options?.length === 1 ? '' : 's'} available. End Day remains locked until a choice is submitted.</small></section>`;
  }

  function clubMailModalActionMarkup(mail) {
    const decisionMarkup = typeof renderClubDecisionMailActions === 'function' ? renderClubDecisionMailActions(mail) : '';
    const relatedRoute = mail.actionRoute && mail.actionRoute !== 'mail' ? mail.actionRoute : '';
    return `${decisionMarkup}<footer class="team-note-mail-toolbar"><button type="button" class="${mail.saved ? 'saved' : ''}" data-mail-modal-action="toggle-save" data-mail-id="${escapeCareerHtml(mail.id)}">${mail.saved ? '★ SAVED EMAIL' : '☆ SAVE EMAIL'}</button><button type="button" data-mail-modal-action="mark-unread" data-mail-id="${escapeCareerHtml(mail.id)}">MARK AS UNREAD</button>${relatedRoute ? `<button type="button" class="primary" data-mail-modal-route="${escapeCareerHtml(relatedRoute)}">OPEN RELATED PAGE</button>` : ''}</footer>`;
  }

  function openClubMailModal(mailId, returnFocus = null, markRead = true) {
    const mail = clubMailById(mailId);
    if (!mail || typeof openTeamNoteModal !== 'function') return false;
    careerState.selectedMailId = mail.id;
    if (markRead) mail.read = true;
    const decision = clubMailDecisionForMessage(mail);
    const unresolvedDecision = Boolean(decision && !decision.resolved);
    const sender = clubMailSender(mail.category, mail);
    const opened = openTeamNoteModal({
      kicker: unresolvedDecision ? 'INBOX · DECISION REQUIRED' : `INBOX · ${mail.category}`,
      title: mail.subject,
      body: mail.body,
      footer: `FROM: ${sender} · TO: ${careerState.managerName || 'MANAGER'} · ${mail.dateLabel || clubCurrentDateLabel(true)}`,
      tone: unresolvedDecision ? 'decision' : (mail.important ? 'mail-important' : 'mail'),
      mode: 'mail',
      glyph: '✉︎',
      actionsHtml: clubMailModalActionMarkup(mail),
      dismissHint: unresolvedDecision ? 'SELECT A RESPONSE OR PRESS × TO CLOSE' : 'TAP OUTSIDE OR PRESS × TO CLOSE',
      returnFocus
    });
    if (opened) teamNoteOverlayEl.dataset.mailId = mail.id;
    if (markRead) saveCareerState();
    return opened;
  }

  function selectClubMailAndOpen(mailId, fallbackTrigger = null) {
    const mail = clubMailById(mailId);
    if (!mail) return false;
    const inlineReader = clubMailUsesInlineReader();
    const inlineScrollState = inlineReader ? {
      contentTop: Math.max(0, Number(menuContentEl?.closest('.menu-content')?.scrollTop) || 0),
      listTop: Math.max(0, Number(menuContentEl?.querySelector('.club-mail-list')?.scrollTop) || 0)
    } : null;
    careerState.selectedMailId = mail.id;
    mail.read = true;
    saveCareerState();
    updateMenuUI();
    if (inlineReader) {
      const restoreInlinePosition = () => {
        const contentScroller = menuContentEl?.closest('.menu-content');
        const mailList = menuContentEl?.querySelector('.club-mail-list');
        clubMailRowElement(mail.id)?.focus({ preventScroll: true });
        if (contentScroller) contentScroller.scrollTop = inlineScrollState.contentTop;
        if (mailList) mailList.scrollTop = inlineScrollState.listTop;
      };
      requestAnimationFrame(() => {
        restoreInlinePosition();
        requestAnimationFrame(restoreInlinePosition);
      });
      return true;
    }
    return openClubMailModal(mail.id, clubMailRowElement(mail.id) || fallbackTrigger, false);
  }

  function handleClubMailModalClick(event) {
    if (!teamNoteOverlayEl || teamNoteOverlayEl.hidden || teamNoteOverlayEl.dataset.mode !== 'mail') return false;
    const decisionButton = event.target.closest('[data-club-decision][data-club-choice]');
    if (decisionButton) {
      const mailId = teamNoteOverlayEl.dataset.mailId || careerState.selectedMailId;
      const resolved = typeof clubResolveDecision === 'function' && clubResolveDecision(decisionButton.dataset.clubDecision, decisionButton.dataset.clubChoice);
      if (resolved && mailId) openClubMailModal(mailId, clubMailRowElement(mailId), false);
      return true;
    }
    const modalAction = event.target.closest('[data-mail-modal-action]');
    if (modalAction) {
      const mail = clubMailById(modalAction.dataset.mailId || teamNoteOverlayEl.dataset.mailId);
      if (mail && modalAction.dataset.mailModalAction === 'toggle-save') {
        mail.saved = !mail.saved;
        clubTrimMailStore();
        saveCareerState();
        updateMenuUI();
        openClubMailModal(mail.id, null, false);
        showStatus(mail.saved ? 'EMAIL SAVED' : 'EMAIL REMOVED FROM SAVED');
      } else if (mail && modalAction.dataset.mailModalAction === 'mark-unread') {
        mail.read = false;
        clubMailView = 'inbox';
        saveCareerState();
        closeTeamNoteModal();
        updateMenuUI();
        requestAnimationFrame(() => clubMailRowElement(mail.id)?.focus({ preventScroll: true }));
        showStatus('MESSAGE RETURNED TO INBOX');
      }
      return true;
    }
    const routeButton = event.target.closest('[data-mail-modal-route]');
    if (routeButton) {
      const route = routeButton.dataset.mailModalRoute;
      closeTeamNoteModal();
      if (route) setMenuRoute(route);
      return true;
    }
    return false;
  }

  function renderMailTab() {
    ensureClubOperationsState();
    const view = clubMailView === 'saved' ? 'saved' : 'inbox';
    const inlineReader = clubMailUsesInlineReader();
    const messages = clubMailMessagesForView(view);
    const selected = clubSelectedMail(view);
    const unread = clubUnreadMailCount();
    const inboxCount = clubMailMessagesForView('inbox').length;
    const savedCount = clubSavedMailCount();
    const rows = messages.map(item => {
      const sender = clubMailSender(item.category, item);
      const decision = clubMailDecisionForMessage(item);
      const decisionRequired = Boolean(decision && !decision.resolved);
      return `<button class="club-mail-row ${item.read ? '' : 'unread'} ${item.saved ? 'saved' : ''} ${item.important ? 'important' : ''} ${decisionRequired ? 'decision-required' : ''} ${selected?.id === item.id ? 'active' : ''}" data-club-mail="${item.id}" data-management-target-id="mail:${escapeCareerHtml(item.id)}" ${inlineReader ? `aria-controls="clubMailReader" aria-pressed="${selected?.id === item.id ? 'true' : 'false'}"` : 'aria-haspopup="dialog"'} aria-label="${item.read ? '' : 'Unread: '}${item.saved ? 'Saved: ' : ''}${decisionRequired ? 'Decision required: ' : ''}${escapeCareerHtml(item.subject)} from ${escapeCareerHtml(sender)}">
        <i class="club-mail-unread-dot" aria-hidden="true"></i>
        <span class="club-mail-avatar" aria-hidden="true">${clubMailInitials(item.category, item)}</span>
        <span class="club-mail-row-copy"><span class="club-mail-row-meta"><b>${escapeCareerHtml(sender)}</b><time>${escapeCareerHtml(item.dateLabel || '')}</time></span><strong>${escapeCareerHtml(item.subject)}</strong><small>${escapeCareerHtml(clubMailPreview(item.body, item))}</small></span>
        ${decisionRequired ? '<em class="club-mail-decision-badge">DECISION</em>' : item.saved ? '<em class="club-mail-saved-badge" aria-label="Saved email">★</em>' : (item.important ? '<em class="club-mail-important" aria-label="Important message">★</em>' : '')}
      </button>`;
    }).join('') || `<div class="club-mail-empty"><span aria-hidden="true">${view === 'saved' ? '★' : '✉'}</span><strong>${view === 'saved' ? 'NO SAVED EMAILS' : 'YOUR INBOX IS CLEAR'}</strong><p>${view === 'saved' ? 'Open an email and choose Save Email to keep it here.' : 'Read emails disappear from the Inbox automatically. Save anything you want to keep.'}</p></div>`;
    const decisionMarkup = selected
      ? (inlineReader && typeof renderClubDecisionMailActions === 'function'
          ? renderClubDecisionMailActions(selected)
          : renderClubDecisionMailPreview(selected))
      : '';
    const reader = selected ? `<header class="club-mail-message-head"><div class="club-mail-message-sender"><span class="club-mail-avatar" aria-hidden="true">${clubMailInitials(selected.category, selected)}</span><div><strong>${escapeCareerHtml(clubMailSender(selected.category, selected))}</strong><small>To: ${escapeCareerHtml(careerState.managerName || 'Manager')} · ${escapeCareerHtml(selected.dateLabel || '')}</small></div></div><span class="club-mail-message-category">${escapeCareerHtml(selected.category)}</span></header>
      <div class="club-mail-message-subject"><h2>${escapeCareerHtml(selected.subject)}</h2>${selected.saved ? '<span class="saved">SAVED</span>' : selected.important ? '<span>IMPORTANT</span>' : ''}</div>
      <div class="club-mail-message-body"><p>${escapeCareerHtml(selected.body).replace(/\n/g, '<br>')}</p></div>
      ${decisionMarkup}
      <footer class="club-mail-message-actions"><button class="primary club-mail-open-full" data-club-mail-open="${escapeCareerHtml(selected.id)}">OPEN FULL EMAIL</button><button class="${selected.saved ? 'saved' : ''}" data-club-action="toggle-selected-save">${selected.saved ? '★ SAVED EMAIL' : '☆ SAVE EMAIL'}</button><button data-club-action="toggle-selected-read">${selected.read ? 'MARK AS UNREAD' : 'MARK AS READ'}</button>${selected.actionRoute && selected.actionRoute !== 'mail' ? `<button data-team-route="${selected.actionRoute}">OPEN RELATED PAGE</button>` : ''}</footer>` : '<div class="club-mail-reader-empty"><span aria-hidden="true">✉</span><strong>SELECT A MESSAGE</strong><p>Choose an item from the list to read the full club communication.</p></div>';
    const title = view === 'saved' ? 'SAVED MAIL' : 'INBOX';
    const listLabel = view === 'saved' ? 'SAVED EMAILS' : 'UNREAD & ACTION REQUIRED';
    return `${typeof renderDevelopmentAlertsStrip === 'function' ? renderDevelopmentAlertsStrip() : ''}<section class="club-mail-client" data-mail-presentation="${inlineReader ? 'inline' : 'modal'}">
      <header class="club-mail-toolbar"><div class="club-mail-toolbar-title"><span class="club-mail-toolbar-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3.5 5.5h17v13h-17z"></path><path d="m4.3 6.4 7.7 6.2 7.7-6.2"></path></svg></span><div><span>Club communications</span><strong>${title}</strong><small>${escapeCareerHtml(clubCurrentDateLabel())}</small></div></div><div class="club-mail-toolbar-actions"><nav class="club-mail-view-tabs" aria-label="Mail folders"><button type="button" class="${view === 'inbox' ? 'active' : ''}" data-club-mail-view="inbox">INBOX <b>${inboxCount}</b></button><button type="button" class="${view === 'saved' ? 'active' : ''}" data-club-mail-view="saved">SAVED <b>${savedCount}</b></button></nav><span><b>${unread}</b> unread</span>${view === 'inbox' ? `<button data-club-action="mark-all-read" ${inboxCount ? '' : 'disabled'}>CLEAR INBOX</button>` : ''}</div></header>
      <div class="club-mail-layout"><aside class="club-mail-column"><header><span>${listLabel}</span><small>${messages.length} message${messages.length === 1 ? '' : 's'}</small></header><section class="club-mail-list">${rows}</section></aside><article class="club-mail-reader" id="clubMailReader" tabindex="-1" aria-label="Selected email">${reader}</article></div>
    </section>`;
  }

  function renderTacticsTab() {
    if (typeof renderAdvancedTacticsTab === 'function') return renderAdvancedTacticsTab();
    ensureClubOperationsState();
    const assistant = clubAssistantManager();
    const formation = clubFormation();
    const squad = typeof workflowSquadForRead === 'function' ? workflowSquadForRead('tactics') : (careerState.squad || []);
    const lineup = squad.slice(0, TEAM_REQUIRED_STARTERS);
    return `${renderClubCalendarStrip()}${typeof renderWorkflowDraftBar === 'function' ? renderWorkflowDraftBar('tactics', 'MATCH SETUP CHANGES', 'Formation, roles and active-operator changes are only applied after Save Changes.') : ''}<div class="menu-hero career-hero club-tactics-hero"><div class="menu-hero-main menu-briefing-panel"><div class="menu-kicker">MATCH PREPARATION</div><h2>FORMATION & TEAM SELECTION</h2><p>Choose the tactical structure and retain manual control, or delegate active-operator selection to an employed assistant manager.</p><div class="menu-pill-row"><span class="menu-pill">${escapeCareerHtml(formation.name)}</span><span class="menu-pill">${clubLineupMode() === 'assistant' ? 'DELEGATED' : 'MANUAL SELECTION'}</span><span class="menu-pill">${assistant ? escapeCareerHtml(assistant.name) : 'NO ASSISTANT'}</span></div></div><div class="menu-hero-side"><div class="menu-kicker">NEXT MATCH</div><div class="menu-side-operator">${clubLeagueMatchDue() ? 'TODAY' : `${clubDaysUntilFixture() ?? '—'}D`}</div><p>${leagueCompetitionName()}</p></div></div>
      <section class="club-tactics-panel"><div class="career-section-head"><div><span>TACTICAL SHAPE</span><strong>FORMATION</strong></div><p>The formation affects role preference and small bounded live-match behaviour modifiers.</p></div><div class="club-formation-grid">${Object.values(CLUB_FORMATIONS).map(item => `<button class="club-formation-card ${item.id === formation.id ? 'active' : ''}" data-club-formation="${item.id}"><span>${escapeCareerHtml(item.short)}</span><strong>${escapeCareerHtml(item.name)}</strong><small>${escapeCareerHtml(item.description)}</small></button>`).join('')}</div></section>
      <section class="club-delegation-panel"><div class="career-section-head"><div><span>RESPONSIBILITY</span><strong>ACTIVE OPERATOR SELECTION</strong></div><p>Manual selection uses Squad order. Delegation lets the assistant evaluate ability, role fit, form, fatigue, sharpness and injuries.</p></div><div class="club-delegation-actions"><button class="${clubLineupMode() === 'manual' ? 'active' : ''}" data-club-lineup-mode="manual">MANAGER SELECTS TEAM</button><button class="${clubLineupMode() === 'assistant' ? 'active' : ''} ${assistant ? '' : 'requires-staff'}" data-club-lineup-mode="assistant" data-requires-staff="${assistant ? 'false' : 'true'}" title="${assistant ? 'Delegate selection to the assistant manager' : 'Employ an assistant manager to use this option'}">ASSISTANT SELECTS TEAM</button><button class="primary ${assistant ? '' : 'requires-staff'}" data-club-action="apply-assistant" data-requires-staff="${assistant ? 'false' : 'true'}" title="${assistant ? 'Ask the assistant to select the active five operators' : 'Employ an assistant manager to use this option'}">ASK ASSISTANT TO PICK NOW</button></div></section>
      <section class="club-lineup-preview"><div class="career-section-head"><div><span>SUBMITTED ROSTER</span><strong>ACTIVE FIVE OPERATORS</strong></div><p>${clubLineupMode() === 'assistant' ? 'The assistant may update this order at End Day and immediately before matchmaking.' : 'Change this order manually from the Squad page.'}</p></div><div>${lineup.length ? lineup.map((player, index) => `<article><span>${index + 1}</span><div><strong>${escapeCareerHtml(player.name)}</strong><small>${teamRoleById(player.role).name} · ${teamReadinessScore(player)} READY</small></div>${clubStarsMarkup(clubPlayerAbilityStars(player), 'ABILITY')}</article>`).join('') : '<div class="team-empty-state compact"><strong>NO PLAYERS SELECTED</strong><p>Recruit five operators to create a valid line-up.</p></div>'}</div><button data-team-route="operators">OPEN SQUAD ORDER</button></section>`;
  }

  function renderStaffTab() {
    ensureClubOperationsState();
    const assistant = clubAssistantManager();
    const rows = (careerState.staff.pool || []).map(candidate => {
      const avg = (candidate.tactics + candidate.judgingAbility + candidate.judgingPotential + candidate.manManagement + candidate.fitness) / 5;
      return `<article class="club-staff-card"><div><span>ASSISTANT MANAGER</span><strong>${escapeCareerHtml(candidate.name)}</strong><small>${escapeCareerHtml(candidate.style)}</small></div><div class="club-staff-stars">${clubStarsMarkup(clubAbilityStarsFromRating(avg * 10, false), 'STAFF')}</div><dl><div><dt>TACTICS</dt><dd>${candidate.tactics}</dd></div><div><dt>ABILITY JUDGING</dt><dd>${candidate.judgingAbility}</dd></div><div><dt>POTENTIAL JUDGING</dt><dd>${candidate.judgingPotential}</dd></div><div><dt>MAN MANAGEMENT</dt><dd>${candidate.manManagement}</dd></div><div><dt>FITNESS</dt><dd>${candidate.fitness}</dd></div></dl><footer><span>${teamCredits(candidate.signingFee)} FEE · ${teamCredits(candidate.wage)}/W</span><button class="primary ${careerState.credits < candidate.signingFee ? 'insufficient-funds' : ''}" data-club-hire-staff="${candidate.id}" data-insufficient-funds="${careerState.credits < candidate.signingFee ? 'true' : 'false'}">EMPLOY</button></footer></article>`;
    }).join('');
    return `${renderClubCalendarStrip()}<div class="menu-hero career-hero club-staff-hero"><div class="menu-hero-main menu-briefing-panel"><div class="menu-kicker">BACKROOM STAFF</div><h2>ASSISTANT MANAGER</h2><p>Employ one assistant to assess the squad and take responsibility for line-up selection when delegated.</p><div class="menu-pill-row"><span class="menu-pill">${leagueDivisionPoolLabel()}</span><span class="menu-pill">${assistant ? 'POSITION FILLED' : 'VACANCY'}</span><span class="menu-pill">${teamCredits(clubStaffWageBill())} STAFF WAGES</span></div></div><div class="menu-hero-side"><div class="menu-kicker">CURRENT ASSISTANT</div><div class="menu-side-operator">${assistant ? escapeCareerHtml(assistant.name.split(' ').map(part => part[0]).join('').slice(0,3)) : '—'}</div><p>${assistant ? escapeCareerHtml(assistant.name) : 'No appointment'}</p>${assistant ? '<button class="menu-danger-trigger" data-club-action="release-assistant">RELEASE</button>' : ''}</div></div>
      <section class="club-pool-control"><label><span>STAFF SEARCH POOL</span><select disabled>${clubCurrentPoolOptions('staff')}</select></label><p>Higher-division staff pools unlock only after promotion.</p><button data-club-action="refresh-staff">REFRESH · 1,500 CR</button></section>
      <section class="club-staff-grid">${rows}</section>`;
  }

  function handleClubOperationsClick(event) {
    if (typeof handleMatchdayClick === 'function' && handleMatchdayClick(event)) return true;
    const mailView = event.target.closest('[data-club-mail-view]');
    if (mailView) {
      clubMailView = mailView.dataset.clubMailView === 'saved' ? 'saved' : 'inbox';
      careerState.selectedMailId = null;
      updateMenuUI();
      return true;
    }
    const action = event.target.closest('[data-club-action]');
    if (action) {
      const id = action.dataset.clubAction;
      if (id === 'end-day') advanceCareerDay();
      else if (id === 'mark-all-read') {
        for (const mail of clubMailMessagesForView('inbox')) mail.read = true;
        careerState.selectedMailId = null;
        saveCareerState();
        updateMenuUI();
        showStatus('INBOX CLEARED');
      }
      else if (id === 'toggle-selected-read') {
        const selected = clubSelectedMail();
        if (selected) {
          selected.read = !selected.read;
          if (!selected.read) clubMailView = 'inbox';
        }
        careerState.selectedMailId = null;
        saveCareerState();
        updateMenuUI();
      }
      else if (id === 'toggle-selected-save') {
        const selected = clubSelectedMail();
        if (selected) selected.saved = !selected.saved;
        clubTrimMailStore();
        saveCareerState();
        updateMenuUI();
        showStatus(selected?.saved ? 'EMAIL SAVED' : 'EMAIL REMOVED FROM SAVED');
      }
      else if (id === 'apply-assistant') {
        const applied = typeof workflowStageAssistantLineup === 'function' ? workflowStageAssistantLineup() : clubApplyAssistantLineup(true);
        if (applied) showStatus('ASSISTANT LINE-UP STAGED · SAVE CHANGES');
        else showManagementBlocked('ASSISTANT MANAGER REQUIRED', 'The club cannot delegate active-operator selection until an assistant manager has been employed.', { route: 'staff', routeLabel: 'OPEN STAFF SEARCH', returnFocus: action });
      }
      else if (id === 'release-assistant') {
        const released = releaseAssistantManager();
        if (released) showStatus('ASSISTANT MANAGER RELEASED');
        else showManagementBlocked('NO ASSISTANT TO RELEASE', 'The assistant-manager position is already vacant.', { route: 'staff', routeLabel: 'OPEN STAFF', returnFocus: action });
      }
      else if (id === 'refresh-staff') {
        const refreshed = refreshStaffPool();
        if (refreshed) showStatus('STAFF SEARCH REFRESHED');
        else showManagementBlocked('INSUFFICIENT CREDITS', 'The club does not have enough available credits to refresh the assistant-manager search.', { route: 'barracks', routeLabel: 'OPEN FINANCES', returnFocus: action });
      }
      return true;
    }
    const mailOpen = event.target.closest('[data-club-mail-open]');
    if (mailOpen) {
      selectClubMailAndOpen(mailOpen.dataset.clubMailOpen, mailOpen);
      return true;
    }
    const mail = event.target.closest('[data-club-mail]');
    if (mail) {
      selectClubMailAndOpen(mail.dataset.clubMail, mail);
      return true;
    }
    const formation = event.target.closest('[data-club-formation]');
    if (formation) {
      const value = CLUB_FORMATIONS[formation.dataset.clubFormation] ? formation.dataset.clubFormation : 'balanced';
      if (typeof matchdayGuardRecommendedPlanChange === 'function'
        && matchdayGuardRecommendedPlanChange('tactics', { field: 'formationId', value }, formation)) return true;
      if (typeof workflowSetTacticsField === 'function') workflowSetTacticsField('formationId', value);
      else { careerState.tactics.formationId = value; saveCareerState(); updateMenuUI(); }
      return true;
    }
    const mode = event.target.closest('[data-club-lineup-mode]');
    if (mode) {
      const next = mode.dataset.clubLineupMode;
      if (next === 'assistant' && !clubAssistantManager()) {
        showManagementBlocked('ASSISTANT MANAGER REQUIRED', 'You selected assistant-managed team selection, but the club has no assistant manager employed. Appoint one before delegating the line-up.', { route: 'staff', routeLabel: 'OPEN STAFF SEARCH', returnFocus: mode });
        return true;
      }
      const value = next === 'assistant' ? 'assistant' : 'manual';
      if (typeof workflowSetTacticsField === 'function') {
        workflowSetTacticsField('lineupMode', value, { render: false });
        if (value === 'assistant' && typeof workflowStageAssistantLineup === 'function') workflowStageAssistantLineup({ render: false });
        updateMenuUI();
      } else { careerState.tactics.lineupMode = value; if (value === 'assistant') clubApplyAssistantLineup(false); saveCareerState(); updateMenuUI(); }
      return true;
    }
    const hire = event.target.closest('[data-club-hire-staff]');
    if (hire) {
      const result = hireAssistantManager(hire.dataset.clubHireStaff);
      if (result.ok) showStatus(`${result.staff.name.toUpperCase()} EMPLOYED`);
      else showManagementBlocked('APPOINTMENT COULD NOT BE COMPLETED', result.reason || 'The assistant-manager appointment is currently unavailable.', { route: result.reason?.toLowerCase().includes('credit') ? 'barracks' : 'staff', routeLabel: result.reason?.toLowerCase().includes('credit') ? 'OPEN FINANCES' : 'OPEN STAFF', returnFocus: hire });
      return true;
    }
    return false;
  }

  function handleClubOperationsInput(event) {
    if (typeof handleMatchdayInput === 'function' && handleMatchdayInput(event)) return true;
    return false;
  }

  const clubMailPresentationMedia = typeof window?.matchMedia === 'function'
    ? window.matchMedia('(min-width: 1024px)')
    : null;
  const syncClubMailPresentation = () => {
    if (appState !== 'menu' || menuTab !== 'mail') return;
    if (clubMailUsesInlineReader() && teamNoteOverlayEl && !teamNoteOverlayEl.hidden && teamNoteOverlayEl.dataset.mode === 'mail') {
      closeTeamNoteModal({ restoreFocus: false });
    }
    if (typeof updateMenuUI === 'function') updateMenuUI();
  };
  if (typeof clubMailPresentationMedia?.addEventListener === 'function') {
    clubMailPresentationMedia.addEventListener('change', syncClubMailPresentation);
  } else if (typeof clubMailPresentationMedia?.addListener === 'function') {
    clubMailPresentationMedia.addListener(syncClubMailPresentation);
  }

  ensureClubOperationsState();
