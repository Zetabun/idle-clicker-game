/*
 * Strikewatch source module: 39-opposition-intelligence.js
 * Purpose: Persistent rival identities, opposition scouting, dynamic club strength and supporter expectations.
 *
 * This module extends league, staff and matchday systems without changing
 * operator health, weapon damage or hidden outcome rolls.
 */

  const OPPOSITION_INTELLIGENCE_VERSION = 1;
  const OPPOSITION_PUBLIC_REPORT_DEPTH = 22;
  const OPPOSITION_MAX_REPORT_DEPTH = 100;

  const OPPOSITION_IDENTITIES = Object.freeze({
    CONTROL: {
      name: 'MEASURED CONTROL', formation: 'control', approach: 'balanced', engagement: 'mixed', priority: 'group',
      summary: 'Builds stable spacing before taking a high-percentage engagement.',
      strengths: ['Reliable support spacing', 'Patient room progression'],
      vulnerabilities: ['Can be disrupted before the shape settles', 'Reluctant to chase wide pressure'],
      counters: [
        { route: 'tactics', text: 'Use controlled early pressure so they cannot establish their preferred spacing.' },
        { route: 'operators', text: 'Select mobile operators who can threaten a second angle without becoming isolated.' },
        { route: 'loadout', text: 'Retain at least one weapon suited to punishing their measured mid-range advances.' }
      ]
    },
    PRESSURE: {
      name: 'RELENTLESS PRESSURE', formation: 'pressure', approach: 'aggressive', engagement: 'close', priority: 'trade',
      summary: 'Commits quickly and tries to convert the first contact into a chain of trades.',
      strengths: ['Fast opening pressure', 'Immediate trade attempts'],
      vulnerabilities: ['Can overcommit into prepared sightlines', 'Less comfortable when denied close contact'],
      counters: [
        { route: 'tactics', text: 'Protect the opening engagement and force their entries to cross prepared angles.' },
        { route: 'loadout', text: 'Avoid an entirely short-range line-up if the map offers safe long sightlines.' },
        { route: 'operators', text: 'Prioritise awareness and resilience in the first two contact roles.' }
      ]
    },
    INFORMATION: {
      name: 'INFORMATION HUNT', formation: 'control', approach: 'cautious', engagement: 'mixed', priority: 'hold',
      summary: 'Uses sound and patient movement to delay commitment until contact is understood.',
      strengths: ['Strong information discipline', 'Low-risk late-round decisions'],
      vulnerabilities: ['Can surrender tempo', 'May be forced into rushed final engagements'],
      counters: [
        { route: 'tactics', text: 'Take useful territory early, then refuse to give them easy sound information.' },
        { route: 'operators', text: 'Use a caller or support profile to maintain structure during long quiet periods.' },
        { route: 'loadout', text: 'Choose flexible weapons that remain useful when the fight starts later than expected.' }
      ]
    },
    ROTATION: {
      name: 'WIDE ROTATION', formation: 'wide', approach: 'balanced', engagement: 'mixed', priority: 'flank',
      summary: 'Creates split pressure through wide routes and quick lane changes.',
      strengths: ['Multiple approach angles', 'Rapid mid-round rotations'],
      vulnerabilities: ['Wide players can become isolated', 'Central space may be temporarily weak'],
      counters: [
        { route: 'tactics', text: 'Keep enough central support to punish isolated flankers rather than chasing every rotation.' },
        { route: 'operators', text: 'Field aware support players who can react without abandoning the main group.' },
        { route: 'loadout', text: 'Use at least one mobile loadout capable of contesting a late rotation.' }
      ]
    },
    TEMPO: {
      name: 'HIGH TEMPO', formation: 'pressure', approach: 'aggressive', engagement: 'mixed', priority: 'trade',
      summary: 'Moves quickly, re-engages often and tries to deny the opponent time to reset.',
      strengths: ['Repeated re-engagements', 'Strong momentum after damage'],
      vulnerabilities: ['Movement can become predictable', 'Fatigue and spacing errors appear in long rounds'],
      counters: [
        { route: 'tactics', text: 'Use a disciplined shape and avoid matching their pace without a clear reason.' },
        { route: 'operators', text: 'Select calm, aware operators who recover structure after the first exchange.' },
        { route: 'loadout', text: 'Reliable handling is valuable when several engagements arrive in quick succession.' }
      ]
    },
    DEFENCE: {
      name: 'DEFENSIVE DISCIPLINE', formation: 'defensive', approach: 'cautious', engagement: 'long', priority: 'hold',
      summary: 'Protects useful ground with durable anchors and conservative crossfires.',
      strengths: ['Prepared defensive angles', 'Strong low-risk survival'],
      vulnerabilities: ['Slow to reclaim lost ground', 'Can be stretched by patient multi-angle pressure'],
      counters: [
        { route: 'tactics', text: 'Create two credible angles before committing instead of feeding one prepared lane.' },
        { route: 'operators', text: 'Use mobility and awareness to dislodge anchors without losing support.' },
        { route: 'loadout', text: 'Include accurate weapons capable of contesting protected long-range positions.' }
      ]
    },
    BALANCED: {
      name: 'BALANCED FUNDAMENTALS', formation: 'balanced', approach: 'balanced', engagement: 'mixed', priority: 'trade',
      summary: 'Uses a broad, adaptable plan with few extreme strengths or weaknesses.',
      strengths: ['Reliable fundamentals', 'Flexible response to changing fights'],
      vulnerabilities: ['No dominant specialism', 'Can be outperformed by a well-executed specialist plan'],
      counters: [
        { route: 'tactics', text: 'Commit to the plan your five active operators execute best rather than trying to mirror them.' },
        { route: 'operators', text: 'Select the strongest coherent five rather than chasing one narrow counter.' },
        { route: 'loadout', text: 'Use a balanced weapon spread so one lane does not become an obvious weakness.' }
      ]
    },
    STRUCTURE: {
      name: 'LAYERED STRUCTURE', formation: 'control', approach: 'balanced', engagement: 'mixed', priority: 'group',
      summary: 'Clears space in layers and keeps compact support behind the first contact.',
      strengths: ['Consistent role spacing', 'Strong follow-up support'],
      vulnerabilities: ['Can be slowed by route disruption', 'Compact shape is vulnerable to wide angles'],
      counters: [
        { route: 'tactics', text: 'Stretch the formation with a controlled flank while preserving one safe support route.' },
        { route: 'operators', text: 'A mobile flanker is useful only if the rest of the line-up can hold central attention.' },
        { route: 'loadout', text: 'Use range diversity to attack both their lead operator and compact support layer.' }
      ]
    },
    COUNTER: {
      name: 'COUNTER-ATTACK', formation: 'defensive', approach: 'cautious', engagement: 'mixed', priority: 'trade',
      summary: 'Invites pressure, then reacts aggressively once an opponent becomes committed.',
      strengths: ['Punishes unsupported entries', 'Strong reactive trades'],
      vulnerabilities: ['Can be denied opportunities by patient control', 'Often gives away early territory'],
      counters: [
        { route: 'tactics', text: 'Take territory without forcing the final duel until their counter shape is exposed.' },
        { route: 'operators', text: 'Use disciplined entries backed by support rather than a lone high-risk opener.' },
        { route: 'loadout', text: 'Prioritise dependable follow-up fire over a single all-or-nothing close-range weapon.' }
      ]
    },
    ANGLES: {
      name: 'PRECISION ANGLES', formation: 'wide', approach: 'cautious', engagement: 'long', priority: 'hold',
      summary: 'Controls long sightlines and punishes movement through exposed lanes.',
      strengths: ['Long-range accuracy', 'Disciplined cross-map spacing'],
      vulnerabilities: ['Weaker in compact forced fights', 'Wide spacing can delay trades'],
      counters: [
        { route: 'tactics', text: 'Avoid repeated long-lane challenges and use covered routes to close distance.' },
        { route: 'operators', text: 'Mobility and handling are more useful than a second static marksman here.' },
        { route: 'loadout', text: 'Carry enough close-range pressure to punish them once the sightline is broken.' }
      ]
    },
    BRAWL: {
      name: 'CLOSE BRAWL', formation: 'pressure', approach: 'aggressive', engagement: 'close', priority: 'group',
      summary: 'Stays compact and contests close-range space through repeated durable exchanges.',
      strengths: ['Strong compact fights', 'Difficult to dislodge once grouped'],
      vulnerabilities: ['Limited long-range reach', 'Compact movement can congest narrow routes'],
      counters: [
        { route: 'tactics', text: 'Preserve spacing and make them cross open ground before the fight becomes compact.' },
        { route: 'operators', text: 'Use awareness and marksman coverage to identify the first safe target.' },
        { route: 'loadout', text: 'Do not allow the entire active operator line-up to depend on short-range exchanges.' }
      ]
    },
    ADAPTIVE: {
      name: 'ADAPTIVE COMMAND', formation: 'balanced', approach: 'balanced', engagement: 'mixed', priority: 'trade',
      summary: 'Changes role emphasis and team behaviour between rounds instead of repeating one plan.',
      strengths: ['Difficult to read over a full match', 'Responds to repeated weaknesses'],
      vulnerabilities: ['Frequent changes reduce consistency', 'Can be forced into a plan that does not suit every operator'],
      counters: [
        { route: 'tactics', text: 'Use a stable core plan and make only evidence-led adjustments between rounds.' },
        { route: 'operators', text: 'A versatile active operator line-up reduces the value of their tactical changes.' },
        { route: 'loadout', text: 'Avoid a one-dimensional weapon setup they can counter after the opening round.' }
      ]
    },
    HOLD: {
      name: 'LATE DENIAL', formation: 'defensive', approach: 'cautious', engagement: 'long', priority: 'hold',
      summary: 'Protects key ground and waits for the opponent to expose the final approach.',
      strengths: ['Strong territory retention', 'Patient late-round denial'],
      vulnerabilities: ['Low early map pressure', 'Can be displaced by coordinated multi-angle attacks'],
      counters: [
        { route: 'tactics', text: 'Claim useful space early, then assemble two supported angles before the final push.' },
        { route: 'operators', text: 'Combine a durable central role with one mobile route creator.' },
        { route: 'loadout', text: 'Accurate sustained fire helps remove anchors without an immediate full commit.' }
      ]
    },
    READS: {
      name: 'TACTICAL READS', formation: 'control', approach: 'balanced', engagement: 'mixed', priority: 'flank',
      summary: 'Uses information to rotate selectively and attack the weakest visible lane.',
      strengths: ['Strong route selection', 'Selective aggression'],
      vulnerabilities: ['Can be manipulated by false pressure', 'Less effective when information is denied'],
      counters: [
        { route: 'tactics', text: 'Keep the shape flexible and avoid revealing the full plan through one early route.' },
        { route: 'operators', text: 'Use a caller to preserve options when the opponent changes lanes.' },
        { route: 'loadout', text: 'Flexible mid-range weapons reduce the cost of reacting to a late rotation.' }
      ]
    },
    MOMENTUM: {
      name: 'MOMENTUM COLLAPSE', formation: 'pressure', approach: 'aggressive', engagement: 'close', priority: 'flank',
      summary: 'Converts the first pick into a rapid collapse from more than one angle.',
      strengths: ['Excellent conversion after first contact', 'Fast collapse on isolated targets'],
      vulnerabilities: ['Less convincing before the first advantage', 'Can overextend after partial information'],
      counters: [
        { route: 'tactics', text: 'Protect the first casualty and regroup immediately if an operator is isolated.' },
        { route: 'operators', text: 'Resilient support roles reduce the chance of one pick deciding the whole round.' },
        { route: 'loadout', text: 'Reliable reload and handling reduce vulnerability during their follow-up collapse.' }
      ]
    },
    COMPACT: {
      name: 'COMPACT TRADING', formation: 'balanced', approach: 'balanced', engagement: 'close', priority: 'group',
      summary: 'Keeps a simple compact shape and relies on high-percentage nearby trades.',
      strengths: ['Consistent close support', 'Low tactical complexity'],
      vulnerabilities: ['Limited map coverage', 'Susceptible to separated firing angles'],
      counters: [
        { route: 'tactics', text: 'Widen the engagement gradually rather than entering their preferred compact fight.' },
        { route: 'operators', text: 'A mobile flanker can stretch them when backed by stable central pressure.' },
        { route: 'loadout', text: 'Use at least one accurate weapon to punish the compact group from distance.' }
      ]
    },
    PRECISION: {
      name: 'PRECISION DUELS', formation: 'wide', approach: 'balanced', engagement: 'long', priority: 'trade',
      summary: 'Creates controlled isolated duels and relies on superior aim discipline.',
      strengths: ['Punishing isolated aim fights', 'Strong first-shot accuracy'],
      vulnerabilities: ['Less effective in messy grouped fights', 'Can be denied ideal distance'],
      counters: [
        { route: 'tactics', text: 'Avoid isolated long-range duels and force supported, irregular engagements.' },
        { route: 'operators', text: 'Use awareness and movement to reduce predictable exposure.' },
        { route: 'loadout', text: 'A close-range option can punish them after a safe route closes the distance.' }
      ]
    },
    SYSTEM: {
      name: 'REPEATABLE SYSTEM', formation: 'control', approach: 'balanced', engagement: 'mixed', priority: 'trade',
      summary: 'Repeats well-practised routes and spacing patterns with dependable timing.',
      strengths: ['High tactical familiarity', 'Reliable execution timing'],
      vulnerabilities: ['Patterns become readable', 'Unexpected resistance can disrupt the sequence'],
      counters: [
        { route: 'tactics', text: 'Change where the first resistance appears instead of meeting the same execute head-on.' },
        { route: 'operators', text: 'Use adaptable roles that can rotate after identifying the repeated pattern.' },
        { route: 'loadout', text: 'Keep weapon coverage across more than one likely contact distance.' }
      ]
    },
    BURST: {
      name: 'BURST ASSAULT', formation: 'pressure', approach: 'aggressive', engagement: 'mixed', priority: 'flank',
      summary: 'Attacks explosively, then resets rather than maintaining constant pressure.',
      strengths: ['Dangerous short attack windows', 'Rapid reset after pressure'],
      vulnerabilities: ['Predictable quiet periods', 'May surrender control during the reset'],
      counters: [
        { route: 'tactics', text: 'Survive the initial burst, then take territory while they reset.' },
        { route: 'operators', text: 'Resilience and awareness help the line-up absorb the first attack without scattering.' },
        { route: 'loadout', text: 'Reliable sustained weapons are useful once their short pressure window ends.' }
      ]
    }
  });

  const OPPOSITION_SCOUT_STYLES = Object.freeze([
    'Video-analysis specialist', 'Opposition network builder', 'Tactical pattern analyst',
    'Data-led match preparer', 'Live-observation scout', 'Player tendency researcher'
  ]);

  const opponentMatchAdaptationState = {
    history: [],
    next: null,
    serial: 0
  };

  function resetOpponentMatchAdaptation() {
    opponentMatchAdaptationState.history = [];
    opponentMatchAdaptationState.next = null;
    opponentMatchAdaptationState.serial = 0;
    return true;
  }

  function opponentMatchAdaptationForRound(targetRound = null) {
    const round = Math.max(1, Math.round(Number(targetRound) || (typeof roundNumber !== 'undefined' ? roundNumber : 1)));
    return opponentMatchAdaptationState.history.find(item => Number(item?.appliedForRound) === round)
      || (Number(opponentMatchAdaptationState.next?.appliedForRound) === round ? opponentMatchAdaptationState.next : null)
      || null;
  }

  function opponentAdaptationDescription(identity = {}) {
    const approach = typeof CLUB_APPROACHES === 'object' ? CLUB_APPROACHES[identity.approach] : null;
    const engagement = typeof CLUB_ENGAGEMENTS === 'object' ? CLUB_ENGAGEMENTS[identity.engagement] : null;
    const priority = typeof CLUB_PRIORITIES === 'object' ? CLUB_PRIORITIES[identity.priority] : null;
    return `${String(approach?.name || identity.approach || 'BALANCED').toUpperCase()} · ${String(engagement?.name || identity.engagement || 'MIXED RANGE').toUpperCase()} · ${String(priority?.name || identity.priority || 'TRADE').toUpperCase()}`;
  }

  function opponentAdaptationCounterHint(identity = {}) {
    if (identity.engagement === 'close') return 'Protect spacing and avoid feeding isolated close-range entries.';
    if (identity.engagement === 'long') return 'Use covered routes or a second angle instead of repeating exposed long-lane duels.';
    if (identity.priority === 'flank') return 'Keep central support intact and punish the wide operator when they separate.';
    if (identity.priority === 'group') return 'Stretch the compact shape without abandoning trade distance.';
    if (identity.priority === 'hold') return 'Claim useful territory before assembling a supported final challenge.';
    return 'Keep the core plan stable and adjust only where the round evidence is strongest.';
  }

  function prepareOpponentMatchAdaptation(stats = {}, winner = null, ownedPlan = null, sourceRound = null) {
    const round = Math.max(1, Math.round(Number(sourceRound) || (typeof roundNumber !== 'undefined' ? roundNumber : 1)));
    const club = typeof leagueActiveOpponentClub === 'function' ? leagueActiveOpponentClub() : null;
    const current = oppositionIdentityForClub(club, round);
    const plan = ownedPlan || (typeof clubActiveMatchPlan === 'function' ? clubActiveMatchPlan() : null) || {};
    const damageDealt = Math.max(0, Number(stats.damageDealt) || 0);
    const damageTaken = Math.max(0, Number(stats.damageTaken) || 0);
    const supported = Math.max(0, Number(stats.supportedTime) || 0);
    const isolated = Math.max(0, Number(stats.isolatedTime) || 0);
    const supportRate = supported + isolated > 0 ? supported / (supported + isolated) : 0.5;
    const ownedWon = winner === CAREER_OWNED_TEAM;
    const opponentWon = winner !== null && winner !== undefined && winner !== CAREER_OWNED_TEAM;
    const decisiveOwnedRound = ownedWon && (damageDealt > damageTaken * 1.08 || Number(stats.kills) >= 4);
    const decisiveOpponentRound = opponentWon && (damageTaken > damageDealt * 1.12 || Number(stats.deaths) >= 4);
    const next = { ...current };
    let reason = 'The opposition saw no repeatable weakness and is expected to keep its current structure.';
    let trigger = 'STABILITY';

    if (decisiveOwnedRound && String(plan.engagementId || '') === 'long') {
      Object.assign(next, { formation: 'pressure', approach: 'aggressive', engagement: 'close', priority: 'flank', phase: 'CLOSING DISTANCE' });
      reason = 'Your long-range control hurt them, so they are likely to close distance and attack from a second angle.';
      trigger = 'RANGE COUNTER';
    } else if (decisiveOwnedRound && String(plan.engagementId || '') === 'close') {
      Object.assign(next, { formation: 'defensive', approach: 'cautious', engagement: 'long', priority: 'hold', phase: 'DENYING CLOSE CONTACT' });
      reason = 'Your close-range pressure succeeded, so they are likely to protect longer sightlines and concede less space.';
      trigger = 'DISTANCE RESET';
    } else if (decisiveOwnedRound && String(plan.priorityId || '') === 'group') {
      Object.assign(next, { formation: 'wide', approach: 'balanced', engagement: 'mixed', priority: 'flank', phase: 'STRETCHING THE SHAPE' });
      reason = 'Your compact support won the round, so they are likely to stretch the team across wider routes.';
      trigger = 'SHAPE COUNTER';
    } else if (decisiveOwnedRound && String(plan.priorityId || '') === 'flank') {
      Object.assign(next, { formation: 'control', approach: 'balanced', engagement: 'mixed', priority: 'group', phase: 'CLOSING WIDE GAPS' });
      reason = 'Your second angle created value, so they are likely to tighten support and reduce isolated defenders.';
      trigger = 'FLANK DENIAL';
    } else if (supportRate < 0.40 && opponentWon) {
      Object.assign(next, { formation: 'pressure', approach: 'aggressive', engagement: 'close', priority: 'flank', phase: 'PRESSURING ISOLATION' });
      reason = 'They repeatedly found isolated operators and are likely to accelerate that pressure next round.';
      trigger = 'ISOLATION PRESSURE';
    } else if (decisiveOpponentRound) {
      reason = 'Their current plan produced a decisive round, so they are expected to retain it rather than overreact.';
      trigger = 'WINNING PLAN RETAINED';
    } else if (String(club?.style || '').toUpperCase() === 'ADAPTIVE') {
      const variants = [
        { formation: 'wide', approach: 'balanced', engagement: 'mixed', priority: 'flank', phase: 'EXPANDING' },
        { formation: 'pressure', approach: 'aggressive', engagement: 'close', priority: 'trade', phase: 'COMMITTING' },
        { formation: 'control', approach: 'cautious', engagement: 'long', priority: 'hold', phase: 'PROBING' }
      ];
      Object.assign(next, variants[round % variants.length]);
      reason = 'Their established identity favours a planned phase change even without one dominant round signal.';
      trigger = 'IDENTITY SHIFT';
    }

    const changed = ['formation', 'approach', 'engagement', 'priority'].some(key => String(next[key] || '') !== String(current[key] || ''));
    const adaptation = {
      id: `OPP-ADAPT-${++opponentMatchAdaptationState.serial}`,
      afterRound: round,
      appliedForRound: round + 1,
      trigger,
      changed,
      reason,
      from: { formation: current.formation, approach: current.approach, engagement: current.engagement, priority: current.priority, phase: current.phase },
      to: { formation: next.formation, approach: next.approach, engagement: next.engagement, priority: next.priority, phase: next.phase },
      summary: opponentAdaptationDescription(next),
      counterHint: opponentAdaptationCounterHint(next)
    };
    opponentMatchAdaptationState.next = adaptation;
    opponentMatchAdaptationState.history = [...opponentMatchAdaptationState.history.filter(item => Number(item.appliedForRound) !== adaptation.appliedForRound), adaptation].slice(-8);
    return adaptation;
  }

  function oppositionIdentityForClub(club = null, targetRound = null) {
    const resolved = club || (typeof leagueActiveOpponentClub === 'function' ? leagueActiveOpponentClub() : null);
    const base = OPPOSITION_IDENTITIES[String(resolved?.style || 'BALANCED').toUpperCase()] || OPPOSITION_IDENTITIES.BALANCED;
    const round = Math.max(1, Math.round(Number(targetRound) || (typeof roundNumber !== 'undefined' ? roundNumber : 1)));
    const adaptation = opponentMatchAdaptationForRound(round);
    if (adaptation?.to) return { ...base, ...adaptation.to, phase: adaptation.to.phase || 'TACTICAL RESPONSE' };
    if (String(resolved?.style || '').toUpperCase() === 'ADAPTIVE') {
      const variants = [
        { formation: 'control', approach: 'cautious', engagement: 'long', priority: 'hold', phase: 'PROBING' },
        { formation: 'wide', approach: 'balanced', engagement: 'mixed', priority: 'flank', phase: 'EXPANDING' },
        { formation: 'pressure', approach: 'aggressive', engagement: 'close', priority: 'trade', phase: 'COMMITTING' }
      ];
      return { ...base, ...variants[(round - 1) % variants.length] };
    }
    if (String(resolved?.style || '').toUpperCase() === 'BURST') {
      return round % 2 === 1
        ? { ...base, formation: 'pressure', approach: 'aggressive', engagement: 'close', priority: 'flank', phase: 'BURST WINDOW' }
        : { ...base, formation: 'control', approach: 'cautious', engagement: 'long', priority: 'hold', phase: 'RESET WINDOW' };
    }
    return { ...base, phase: 'PRIMARY PLAN' };
  }

  function applyOpponentIdentityToBot(bot) {
    if (!bot || bot.team !== TEAM_RED || bot.isPlayerOwned) return bot;
    const club = typeof leagueActiveOpponentClub === 'function' ? leagueActiveOpponentClub() : null;
    const identity = oppositionIdentityForClub(club);
    const formation = typeof CLUB_FORMATIONS === 'object' ? CLUB_FORMATIONS[identity.formation] : null;
    const approach = typeof CLUB_APPROACHES === 'object' ? CLUB_APPROACHES[identity.approach] : null;
    const engagement = typeof CLUB_ENGAGEMENTS === 'object' ? CLUB_ENGAGEMENTS[identity.engagement] : null;
    const priority = typeof CLUB_PRIORITIES === 'object' ? CLUB_PRIORITIES[identity.priority] : null;
    bot.oppositionIdentity = identity.name;
    bot.oppositionIdentityPhase = identity.phase;
    bot.formationId = formation?.id || identity.formation;
    bot.teamApproachId = approach?.id || identity.approach;
    bot.engagementPlanId = engagement?.id || identity.engagement;
    bot.teamPriorityId = priority?.id || identity.priority;
    if (formation) {
      bot.aggression = clamp(bot.aggression + (Number(formation.aggression) || 0), 0.18, 0.98);
      bot.speed *= 1 + (Number(formation.mobility) || 0);
      bot.moveSkill *= 1 + (Number(formation.mobility) || 0) * 0.6;
      bot.hearing += Number(formation.awareness) || 0;
    }
    if (approach) {
      bot.aggression = clamp(bot.aggression + (Number(approach.aggression) || 0), 0.18, 0.98);
      bot.speed *= Number(approach.pace) || 1;
      bot.coverBias = Number(approach.coverBias) || 0;
      bot.lowHealthThreshold = Number(approach.lowHealthThreshold) || 0.43;
      bot.waitForSupportMultiplier = Number(approach.waitForSupport) || 1;
    }
    if (engagement) {
      bot.aggression = clamp(bot.aggression + (Number(engagement.advanceBias) || 0), 0.18, 0.98);
      bot.engagementRangeMultiplier = Number(engagement.rangeMultiplier) || 1;
      bot.spacingBias = Number(engagement.spacingBias) || 0;
    }
    if (priority) {
      bot.groupBias = Number(priority.groupBias) || 0;
      bot.tradeBias = Number(priority.tradeBias) || 0;
      bot.flankBias = Number(priority.flankBias) || 0;
      bot.holdBias = Number(priority.holdBias) || 0;
      bot.supportRadius = Number(priority.supportRadius) || 3.55;
    }
    bot.tacticalDecisionMultiplier = String(club?.style || '').toUpperCase() === 'ADAPTIVE' ? 0.90 : 1;
    return bot;
  }

  function oppositionScoutNormalise(member, fallbackId = 'SCOUT') {
    return {
      id: String(member?.id || fallbackId),
      name: normaliseCareerName(member?.name || 'Unknown Scout') || 'Unknown Scout',
      role: 'opposition-scout',
      divisionTier: normaliseLeagueTier(member?.divisionTier),
      analysis: clamp(Math.round(Number(member?.analysis) || 4), 1, 10),
      oppositionKnowledge: clamp(Math.round(Number(member?.oppositionKnowledge) || 4), 1, 10),
      tacticalAdvice: clamp(Math.round(Number(member?.tacticalAdvice) || 4), 1, 10),
      network: clamp(Math.round(Number(member?.network) || 4), 1, 10),
      wage: Math.max(500, Math.round(Number(member?.wage) || 1600)),
      signingFee: Math.max(0, Math.round(Number(member?.signingFee) || 4500)),
      style: String(member?.style || 'Opposition analyst'),
      employedWeek: Math.max(0, Math.round(Number(member?.employedWeek) || 0))
    };
  }

  function oppositionGenerateScoutPool(seed = Date.now(), divisionTier = leagueDivisionTier()) {
    const random = teamRng((Number(seed) || 1) ^ 0x73ac12);
    const divisionQuality = (3 - divisionTier) * 1.45;
    const pool = [];
    for (let i = 0; i < 6; i++) {
      const base = 2.0 + divisionQuality + random() * 3.5;
      const average = base + random() * 0.8;
      pool.push(oppositionScoutNormalise({
        id: `OSC-${divisionTier}-${(Number(seed) >>> 0).toString(36)}-${i}`,
        name: `${teamPick(random, STAFF_FIRST_NAMES)} ${teamPick(random, STAFF_LAST_NAMES)}`,
        divisionTier,
        analysis: Math.round(base + random() * 2.1),
        oppositionKnowledge: Math.round(base + random() * 2.0),
        tacticalAdvice: Math.round(base + random() * 2.2),
        network: Math.round(base + random() * 1.8),
        wage: Math.round((700 + average * 480 + divisionQuality * 780) / 100) * 100,
        signingFee: Math.round((3000 + average * 2100 + divisionQuality * 3200) / 1000) * 1000,
        style: teamPick(random, OPPOSITION_SCOUT_STYLES)
      }, `OSC-${i}`));
    }
    return pool.sort((a, b) => (b.analysis + b.oppositionKnowledge + b.tacticalAdvice + b.network) - (a.analysis + a.oppositionKnowledge + a.tacticalAdvice + a.network));
  }

  function oppositionScoutingState() {
    if (!careerState.created) return null;
    const raw = careerState.oppositionScouting && typeof careerState.oppositionScouting === 'object' ? careerState.oppositionScouting : {};
    const seed = Math.max(1, Math.round(Number(raw.poolSeed) || teamSeedFromString(`${careerState.name}:opposition-scout:${careerState.week}`)));
    const normalised = {
      version: OPPOSITION_INTELLIGENCE_VERSION,
      scout: raw.scout ? oppositionScoutNormalise(raw.scout, 'EMPLOYED-SCOUT') : null,
      poolSeed: seed,
      selectedPoolDivision: leagueDivisionTier(),
      pool: Array.isArray(raw.pool) && raw.pool.length
        ? raw.pool.map((item, index) => oppositionScoutNormalise(item, `OSC-POOL-${index}`)).filter(item => item.divisionTier === leagueDivisionTier())
        : oppositionGenerateScoutPool(seed, leagueDivisionTier()),
      reports: raw.reports && typeof raw.reports === 'object' ? raw.reports : {},
      lastProcessedDay: Number.isFinite(Number(raw.lastProcessedDay)) ? Math.max(-1, Math.round(Number(raw.lastProcessedDay))) : -1,
      currentOpponentId: raw.currentOpponentId ? String(raw.currentOpponentId) : null
    };
    Object.assign(raw, normalised);
    careerState.oppositionScouting = raw;
    return raw;
  }

  function oppositionScout() {
    return oppositionScoutingState()?.scout || null;
  }

  function oppositionScoutQuality(scout = oppositionScout()) {
    if (!scout) return 0;
    return (Number(scout.analysis) + Number(scout.oppositionKnowledge) + Number(scout.tacticalAdvice) + Number(scout.network)) / 40;
  }

  function oppositionCurrentOpponentFromState(league = null) {
    const state = league || (typeof ensureLeagueState === 'function' ? ensureLeagueState() : null);
    const fixture = state && typeof leagueNextFixture === 'function' ? leagueNextFixture() : null;
    return fixture && typeof leagueClubById === 'function' ? leagueClubById(leagueFixtureOpponentId(fixture)) : null;
  }

  function oppositionReportForClub(club = null) {
    const scouting = oppositionScoutingState();
    const resolved = club || oppositionCurrentOpponentFromState();
    if (!scouting || !resolved || resolved.id === LEAGUE_USER_CLUB_ID) return null;
    const raw = scouting.reports[resolved.id] && typeof scouting.reports[resolved.id] === 'object' ? scouting.reports[resolved.id] : {};
    const depth = clamp(Math.round(Number(raw.depth) || OPPOSITION_PUBLIC_REPORT_DEPTH), OPPOSITION_PUBLIC_REPORT_DEPTH, OPPOSITION_MAX_REPORT_DEPTH);
    scouting.reports[resolved.id] = {
      opponentId: resolved.id,
      depth,
      daysObserved: Math.max(0, Math.round(Number(raw.daysObserved) || 0)),
      lastUpdatedDay: Number.isFinite(Number(raw.lastUpdatedDay)) ? Math.max(-1, Math.round(Number(raw.lastUpdatedDay))) : -1,
      lastProcessedDay: Number.isFinite(Number(raw.lastProcessedDay)) ? Math.max(-1, Math.round(Number(raw.lastProcessedDay))) : -1,
      lastScoutId: raw.lastScoutId ? String(raw.lastScoutId) : null
    };
    return scouting.reports[resolved.id];
  }

  function oppositionReportMaximum(scout = oppositionScout()) {
    if (!scout) return OPPOSITION_PUBLIC_REPORT_DEPTH;
    const quality = oppositionScoutQuality(scout);
    const infrastructure = typeof clubInfrastructureOppositionMaximumBonus === 'function' ? clubInfrastructureOppositionMaximumBonus() : 0;
    return clamp(Math.round(58 + quality * 42 + infrastructure), 60, 100);
  }

  function oppositionProcessScoutingDay() {
    const scouting = oppositionScoutingState();
    if (!scouting) return null;
    const day = Math.max(0, Math.round(Number(clubCalendarState()?.absoluteDay) || 0));
    const opponent = oppositionCurrentOpponentFromState();
    if (!opponent) return null;
    scouting.currentOpponentId = opponent.id;
    const report = oppositionReportForClub(opponent);
    const scout = oppositionScout();
    if (report.lastProcessedDay === day && report.lastScoutId === (scout?.id || null)) return report;
    scouting.lastProcessedDay = day;
    report.lastProcessedDay = day;
    if (scout) {
      const quality = oppositionScoutQuality(scout);
      const infrastructure = typeof clubInfrastructureOppositionDailyGain === 'function' ? clubInfrastructureOppositionDailyGain() : 0;
      const gain = clamp(Math.round(3 + quality * 6 + Number(scout.network) * 0.18 + infrastructure), 4, 14);
      report.depth = Math.min(oppositionReportMaximum(scout), report.depth + gain);
      report.daysObserved += 1;
      report.lastUpdatedDay = day;
      report.lastScoutId = scout.id;
    } else if (report.lastUpdatedDay >= 0 && day - report.lastUpdatedDay >= 7) {
      report.depth = Math.max(OPPOSITION_PUBLIC_REPORT_DEPTH, report.depth - 2);
    }
    return report;
  }

  function oppositionRefreshScoutPool() {
    const scouting = oppositionScoutingState();
    if (!scouting || menuContext === 'pause' || appState === 'match') return false;
    const fee = 1200;
    if (careerState.credits < fee) return false;
    careerState.credits -= fee;
    teamFinanceTransaction('STAFF', -fee, 'Opposition scout search');
    scouting.poolSeed = (scouting.poolSeed + 7139 + careerState.week * 37) >>> 0;
    scouting.pool = oppositionGenerateScoutPool(scouting.poolSeed, leagueDivisionTier());
    saveCareerState();
    updateMenuUI();
    return true;
  }

  function hireOppositionScout(id) {
    const scouting = oppositionScoutingState();
    if (!scouting || menuContext === 'pause' || appState === 'match') return { ok: false, reason: 'Staff changes are locked during a live match.' };
    const candidate = scouting.pool.find(item => item.id === id) || null;
    if (!candidate) return { ok: false, reason: 'Candidate unavailable.' };
    if (careerState.credits < candidate.signingFee) return { ok: false, reason: 'Insufficient credits for the appointment fee.' };
    const previous = scouting.scout;
    const projectedWages = clubTotalWageBill() - (previous?.wage || 0) + candidate.wage;
    if (projectedWages > careerState.wageBudget) return { ok: false, reason: 'The appointment would exceed the weekly wage budget.' };
    scouting.scout = { ...candidate, employedWeek: careerState.week };
    scouting.pool = scouting.pool.filter(item => item.id !== candidate.id);
    careerState.credits -= candidate.signingFee;
    teamFinanceTransaction('STAFF', -candidate.signingFee, `Opposition scout appointment · ${candidate.name}`);
    clubAddMail('Opposition scout appointed', `${candidate.name} has joined the club. Reports on the next league opponent will become more detailed as calendar days are processed.`, 'STAFF', true, 'staff');
    oppositionProcessScoutingDay();
    saveCareerState();
    updateMenuUI();
    return { ok: true, staff: scouting.scout };
  }

  function releaseOppositionScout() {
    const scouting = oppositionScoutingState();
    const scout = scouting?.scout;
    if (!scout || menuContext === 'pause' || appState === 'match') return false;
    scouting.scout = null;
    clubAddMail('Opposition scout departed', `${scout.name} has left the club. Existing reports are retained but will gradually lose freshness without active observation.`, 'STAFF', false, 'staff');
    saveCareerState();
    updateMenuUI();
    return true;
  }

  function leagueClubFormAdjustment(club) {
    if (!club || typeof leagueTable !== 'function') return 0;
    const row = leagueTable().find(item => item.id === club.id);
    const form = Array.isArray(row?.form) ? row.form : [];
    return clamp(form.reduce((sum, result) => sum + (result === 'W' ? 0.8 : -0.8), 0), -4, 4);
  }

  function leagueClubRosterRating(club) {
    if (!club) return 0;
    if (club.id === LEAGUE_USER_CLUB_ID) return typeof leagueUserSquadRating === 'function' ? leagueUserSquadRating() : 0;
    const roster = Array.isArray(club.roster) ? club.roster.slice(0, TEAM_REQUIRED_STARTERS) : [];
    if (!roster.length) return clamp(Math.round(Number(club.rating) || 30), 1, 99);
    return roster.reduce((sum, player) => sum + teamPlayerOverall(player), 0) / roster.length;
  }

  function leagueClubReadinessAdjustment(club) {
    if (!club) return 0;
    const roster = club.id === LEAGUE_USER_CLUB_ID
      ? (careerState.squad || []).slice(0, TEAM_REQUIRED_STARTERS)
      : (Array.isArray(club.roster) ? club.roster.slice(0, TEAM_REQUIRED_STARTERS) : []);
    if (!roster.length) return 0;
    const readiness = roster.reduce((sum, player) => {
      const fatigue = clamp(Number(player.fatigue) || 0, 0, 100);
      const morale = clamp(Number(player.morale) || 70, 1, 100);
      const sharpness = clamp(Number(player.matchSharpness) || 70, 1, 100);
      return sum + ((morale - 65) / 35) + ((sharpness - 70) / 35) - fatigue / 45;
    }, 0) / roster.length;
    return clamp(readiness, -2.5, 2.5);
  }

  function leagueStrengthStars(rating) {
    return clamp(Math.round(((Number(rating) - 20) / 14 + 0.5) * 2) / 2, 0.5, 5);
  }

  function leagueStrengthStarsMarkup(stars, label = 'TEAM STRENGTH') {
    const value = clamp(Number(stars) || 0.5, 0.5, 5);
    let icons = '';
    for (let i = 1; i <= 5; i++) {
      if (value >= i) icons += '<span class="full">★</span>';
      else if (value >= i - 0.5) icons += '<span class="half">★</span>';
      else icons += '<span>☆</span>';
    }
    return `<span class="opposition-strength-stars" aria-label="${escapeCareerHtml(label)} ${value} out of 5 stars"><i>${icons}</i><small>${value.toFixed(1)} / 5</small></span>`;
  }

  function leagueClubStrengthSnapshot(club = null, options = {}) {
    const resolved = club || oppositionCurrentOpponentFromState();
    if (!resolved) return { rating: 0, stars: 0.5, rosterRating: 0, formAdjustment: 0, readinessAdjustment: 0, trend: 'STABLE' };
    const rosterRating = leagueClubRosterRating(resolved);
    const formAdjustment = leagueClubFormAdjustment(resolved);
    const readinessAdjustment = leagueClubReadinessAdjustment(resolved);
    const identityAdjustment = resolved.id === LEAGUE_USER_CLUB_ID ? 0 : clamp((Number(resolved.reputation) - 40) / 35, -1, 1.5);
    const rating = clamp(Math.round(rosterRating + formAdjustment + readinessAdjustment + identityAdjustment), 10, 95);
    if (resolved.id !== LEAGUE_USER_CLUB_ID && options.commit !== false) {
      resolved.previousDynamicRating = Number.isFinite(Number(resolved.dynamicRating)) ? Number(resolved.dynamicRating) : rating;
      resolved.dynamicRating = rating;
      resolved.rating = rating;
    }
    const previous = Number(resolved.previousDynamicRating) || rating;
    const delta = rating - previous;
    return {
      clubId: resolved.id,
      rating,
      stars: leagueStrengthStars(rating),
      rosterRating: Math.round(rosterRating * 10) / 10,
      formAdjustment: Math.round(formAdjustment * 10) / 10,
      readinessAdjustment: Math.round(readinessAdjustment * 10) / 10,
      identityAdjustment: Math.round(identityAdjustment * 10) / 10,
      delta,
      trend: delta >= 2 ? 'RISING' : delta <= -2 ? 'FALLING' : 'STABLE'
    };
  }

  function leagueRefreshClubStrengths() {
    const league = typeof ensureLeagueState === 'function' ? ensureLeagueState() : null;
    if (!league) return [];
    return league.clubs.filter(club => club.id !== LEAGUE_USER_CLUB_ID).map(club => leagueClubStrengthSnapshot(club));
  }

  function leagueDevelopRivalsAfterMatchday(matchday) {
    const league = typeof ensureLeagueState === 'function' ? ensureLeagueState() : null;
    const day = Math.max(1, Math.round(Number(matchday) || 0));
    if (!league || league.lastDevelopmentMatchday === day) return false;
    league.lastDevelopmentMatchday = day;
    const fixtures = league.fixtures.filter(item => item.matchday === day && item.played);
    const outcome = new Map();
    for (const fixture of fixtures) {
      outcome.set(fixture.homeId, fixture.winnerId === fixture.homeId ? 1 : -1);
      outcome.set(fixture.awayId, fixture.winnerId === fixture.awayId ? 1 : -1);
    }
    for (const club of league.clubs) {
      if (club.id === LEAGUE_USER_CLUB_ID || !Array.isArray(club.roster)) continue;
      const result = outcome.get(club.id) || 0;
      club.roster.forEach((player, index) => {
        const random = teamRng(teamSeedFromString(`${league.season}:${day}:${club.id}:${player.id}:${index}`));
        const overall = teamPlayerOverall(player);
        const gap = Math.max(0, Number(player.potential) - overall);
        const age = Math.max(17, Number(player.age) || 24);
        const improveChance = age <= 25 ? 0.10 + gap * 0.006 : age <= 29 ? 0.05 + gap * 0.0025 : 0.015;
        const declineChance = age >= 31 ? 0.08 + (age - 30) * 0.025 : 0.01;
        const keys = Object.keys(CAREER_STAT_DEFS);
        if (random() < improveChance && gap > 1) {
          const ordered = keys.filter(key => Number(player.stats?.[key]) < CAREER_MAX_STAT).sort((a, b) => Number(player.stats[a]) - Number(player.stats[b]));
          const key = ordered[Math.floor(random() * Math.max(1, Math.min(3, ordered.length)))] || ordered[0];
          if (key) player.stats[key] = clamp(Number(player.stats[key]) + 1, 1, CAREER_MAX_STAT);
        } else if (random() < declineChance) {
          const ordered = keys.filter(key => Number(player.stats?.[key]) > 1).sort((a, b) => Number(player.stats[b]) - Number(player.stats[a]));
          const key = ordered[Math.floor(random() * Math.max(1, Math.min(3, ordered.length)))] || ordered[0];
          if (key) player.stats[key] = clamp(Number(player.stats[key]) - 1, 1, CAREER_MAX_STAT);
        }
        player.form = clamp(Number((Number(player.form || 6.5) + result * 0.12 + (random() - 0.5) * 0.12).toFixed(1)), 1, 10);
        player.morale = clamp(Math.round(Number(player.morale || 70) + result * 2 + (random() < 0.15 ? (result >= 0 ? 1 : -1) : 0)), 1, 100);
        player.happiness = clamp(Math.round(Number(player.happiness || 70) + result), 1, 100);
        player.matchSharpness = clamp(Math.round(Number(player.matchSharpness || 74) + 1 - Math.max(0, Number(player.fatigue) || 0) * 0.01), 1, 100);
        player.fatigue = clamp(Math.round(Number(player.fatigue) || 0) + 4 - Math.floor(random() * 4), 0, 100);
      });
      leagueClubStrengthSnapshot(club);
    }
    return true;
  }

  function supporterInitialFanbase() {
    const league = typeof ensureLeagueState === 'function' ? ensureLeagueState() : null;
    const tierValue = Number(league?.divisionTier);
    const tier = clamp(Number.isFinite(tierValue) ? Math.round(tierValue) : 3, 0, 3);
    const tierBase = [18000, 6500, 2200, 700][tier];
    const reputation = Math.max(0, Number(careerState.reputation) || 0);
    const level = Math.max(1, Number(careerState.level) || 1);
    return Math.max(250, Math.round(tierBase + reputation * 42 + level * 70));
  }

  function supporterState() {
    const raw = careerState.supporters && typeof careerState.supporters === 'object' ? careerState.supporters : {};
    const reputation = Math.max(0, Number(careerState.reputation) || 0);
    const normalised = {
      confidence: Number.isFinite(Number(raw.confidence)) ? clamp(Math.round(Number(raw.confidence)), 0, 100) : 50,
      popularity: Number.isFinite(Number(raw.popularity)) ? clamp(Math.round(Number(raw.popularity)), 0, 100) : clamp(Math.round(30 + reputation * 0.32), 24, 68),
      loyalty: Number.isFinite(Number(raw.loyalty)) ? clamp(Math.round(Number(raw.loyalty)), 0, 100) : 58,
      fanbase: Number.isFinite(Number(raw.fanbase)) ? Math.max(100, Math.round(Number(raw.fanbase))) : supporterInitialFanbase(),
      lastExpectation: raw.lastExpectation && typeof raw.lastExpectation === 'object' ? raw.lastExpectation : null,
      lastReaction: raw.lastReaction && typeof raw.lastReaction === 'object' ? raw.lastReaction : null,
      seasonExpectation: raw.seasonExpectation && typeof raw.seasonExpectation === 'object' ? raw.seasonExpectation : null,
      activityHistory: Array.isArray(raw.activityHistory) ? raw.activityHistory.slice(0, 40) : [],
      fanHistory: Array.isArray(raw.fanHistory) ? raw.fanHistory.slice(0, 36) : [],
      lastProcessedDay: Number.isFinite(Number(raw.lastProcessedDay)) ? Math.max(-1, Math.round(Number(raw.lastProcessedDay))) : -1
    };
    Object.assign(raw, normalised);
    careerState.supporters = raw;
    return raw;
  }

  function supporterNumber(value) {
    return Math.max(0, Math.round(Number(value) || 0)).toLocaleString('en-GB');
  }

  function supporterCaptureHistory(reason = 'CLUB UPDATE') {
    const state = supporterState();
    const day = Math.max(0, Math.round(Number(clubCalendarState()?.absoluteDay) || 0));
    const previous = state.fanHistory[0];
    if (previous && previous.day === day && previous.reason === reason) return previous;
    const item = { day, week: Math.max(1, Number(careerState.week) || 1), fanbase: state.fanbase, popularity: state.popularity, confidence: state.confidence, reason };
    state.fanHistory.unshift(item);
    state.fanHistory = state.fanHistory.slice(0, 36);
    return item;
  }

  function supporterRecordReaction({ type = 'CLUB', title = 'SUPPORTER REACTION', detail = '', confidenceDelta = 0, popularityDelta = 0, fanDelta = 0, loyaltyDelta = 0, tone = 'neutral', route = 'supporters', mail = false } = {}) {
    const state = supporterState();
    const previous = { confidence: state.confidence, popularity: state.popularity, loyalty: state.loyalty, fanbase: state.fanbase };
    state.confidence = clamp(Math.round(state.confidence + confidenceDelta), 0, 100);
    state.popularity = clamp(Math.round(state.popularity + popularityDelta), 0, 100);
    state.loyalty = clamp(Math.round(state.loyalty + loyaltyDelta), 0, 100);
    state.fanbase = Math.max(100, Math.round(state.fanbase + fanDelta));
    const reaction = {
      id: `FAN-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      type, title, detail, tone, route,
      day: Math.max(0, Math.round(Number(clubCalendarState()?.absoluteDay) || 0)),
      week: Math.max(1, Number(careerState.week) || 1),
      deltas: { confidence: state.confidence - previous.confidence, popularity: state.popularity - previous.popularity, loyalty: state.loyalty - previous.loyalty, fanbase: state.fanbase - previous.fanbase }
    };
    state.lastReaction = reaction;
    state.activityHistory.unshift(reaction);
    state.activityHistory = state.activityHistory.slice(0, 40);
    supporterCaptureHistory(title);
    if (mail && typeof clubAddMail === 'function') clubAddMail(title, detail, 'SUPPORTERS', Math.abs(reaction.deltas.confidence) >= 4 || Math.abs(reaction.deltas.popularity) >= 4, route);
    return reaction;
  }

  function supporterSeasonExpectation(force = false) {
    if (!careerState.created || typeof ensureLeagueState !== 'function') return null;
    const state = supporterState();
    const league = ensureLeagueState();
    if (!league) return null;
    if (!force && state.seasonExpectation?.season === league.season && state.seasonExpectation?.divisionTier === league.divisionTier) return state.seasonExpectation;
    leagueRefreshClubStrengths();
    const rows = league.clubs.map(club => ({ id: club.id, rating: leagueClubStrengthSnapshot(club, { commit: club.id !== LEAGUE_USER_CLUB_ID }).rating }))
      .sort((a, b) => b.rating - a.rating);
    const expectedPosition = Math.max(1, rows.findIndex(row => row.id === LEAGUE_USER_CLUB_ID) + 1 || rows.length);
    const clubCount = Math.max(4, rows.length);
    const targetHigh = Math.max(1, expectedPosition - 1);
    const targetLow = Math.min(clubCount, expectedPosition + (expectedPosition > clubCount * 0.65 ? 2 : 1));
    let headline = 'ESTABLISH THE CLUB';
    let label = `Finish between ${targetHigh}th and ${targetLow}th`;
    let rationale = 'Supporters want steady progress while the squad establishes itself at this level.';
    if (expectedPosition <= 2) { headline = 'CHALLENGE FOR PROMOTION'; label = 'Finish in the top two'; rationale = 'The squad is rated among the division leaders and supporters expect a promotion challenge.'; }
    else if (expectedPosition <= 5) { headline = 'PUSH THE LEADING PACK'; label = 'Finish in the top five'; rationale = 'The club has enough quality to remain involved near the top of the table.'; }
    else if (expectedPosition <= Math.ceil(clubCount / 2)) { headline = 'SECURE A TOP-HALF FINISH'; label = `Finish ${Math.ceil(clubCount / 2)}th or higher`; rationale = 'Supporters expect the squad to outperform the division midpoint.'; }
    else if (expectedPosition >= clubCount - 2) { headline = 'AVOID THE BOTTOM TWO'; label = `Finish ${clubCount - 2}th or higher`; rationale = 'The squad is still developing, so survival and visible improvement are the realistic priorities.'; }
    state.seasonExpectation = {
      season: league.season, divisionTier: league.divisionTier, expectedPosition, targetHigh, targetLow,
      headline, label, rationale, setDay: Math.max(0, Math.round(Number(clubCalendarState()?.absoluteDay) || 0)), startingFanbase: state.fanbase
    };
    supporterCaptureHistory(`SEASON ${league.season} EXPECTATION`);
    if (typeof clubAddMail === 'function') clubAddMail(
      `Supporter expectations · Season ${league.season}`,
      `${headline}. ${label}. ${rationale} Current supporter base: ${supporterNumber(state.fanbase)}.`,
      'SUPPORTERS', true, 'supporters'
    );
    return state.seasonExpectation;
  }

  function supporterProcessDay(day = Math.max(0, Math.round(Number(clubCalendarState()?.absoluteDay) || 0))) {
    const state = supporterState();
    if (day <= state.lastProcessedDay) return false;
    state.lastProcessedDay = day;
    supporterSeasonExpectation(false);
    if (day > 0 && day % 7 === 0) {
      const pressure = (state.popularity - 50) * 0.00055 + (state.confidence - 50) * 0.00035 + (state.loyalty - 50) * 0.00020;
      const rate = clamp(pressure, -0.018, 0.028);
      const growthMultiplier = rate > 0 && typeof clubInfrastructureSupporterGrowthMultiplier === 'function' ? clubInfrastructureSupporterGrowthMultiplier() : 1;
      const delta = Math.round(state.fanbase * rate * growthMultiplier);
      if (delta) supporterRecordReaction({ type: 'GROWTH', title: delta > 0 ? 'SUPPORTER BASE GROWING' : 'SUPPORTER INTEREST COOLING', detail: `${Math.abs(delta)} supporter${Math.abs(delta) === 1 ? '' : 's'} ${delta > 0 ? 'joined' : 'drifted away from'} the active fanbase this week as results, popularity and trust combined.`, fanDelta: delta, tone: delta > 0 ? 'positive' : 'warning' });
      else supporterCaptureHistory('WEEKLY SUPPORTER REVIEW');
    }
    return true;
  }

  function supporterReactToSigning(player, deal = {}) {
    if (!player) return null;
    const others = (careerState.squad || []).filter(item => item.id !== player.id);
    const average = others.length ? others.reduce((sum, item) => sum + teamPlayerOverall(item), 0) / others.length : teamPlayerOverall(player) - 1;
    const overall = teamPlayerOverall(player);
    const upside = Math.max(0, Number(player.potential) - overall);
    const major = overall >= average + 4 || upside >= 9;
    const solid = overall >= average - 1;
    const fanDelta = Math.max(2, Math.round(supporterState().fanbase * (major ? 0.008 : solid ? 0.003 : 0.001)));
    return supporterRecordReaction({
      type: 'SIGNING', title: major ? 'FANS EXCITED BY NEW SIGNING' : solid ? 'FANS WELCOME SQUAD ADDITION' : 'FANS RESERVE JUDGEMENT',
      detail: `${player.name} has joined with ${overall} current ability${upside ? ` and ${upside} points of visible development upside` : ''}. Supporters will judge the move by role fit and performances rather than the transfer fee alone.`,
      confidenceDelta: major ? 2 : solid ? 1 : 0, popularityDelta: major ? 3 : solid ? 1 : 0, fanDelta, tone: major ? 'positive' : 'neutral', route: 'profile', mail: major
    });
  }

  function supporterReactToDeparture(player, amount = 0) {
    if (!player) return null;
    const remaining = careerState.squad || [];
    const average = remaining.length ? remaining.reduce((sum, item) => sum + teamPlayerOverall(item), 0) / remaining.length : teamPlayerOverall(player);
    const keyDeparture = teamPlayerOverall(player) >= average + 3;
    const feeStrong = amount >= Math.max(1, Number(player.value) || 0) * 0.9;
    return supporterRecordReaction({
      type: 'DEPARTURE', title: keyDeparture ? 'FANS QUESTION KEY DEPARTURE' : 'SQUAD SALE NOTED',
      detail: keyDeparture ? `${player.name} was one of the stronger operators in the squad. Supporters expect the club to reinvest and replace the lost role.` : `${player.name} has left the club${feeStrong ? ' for a fee viewed as responsible business' : ''}.`,
      confidenceDelta: keyDeparture ? -3 : 0, popularityDelta: keyDeparture ? -2 : 0, loyaltyDelta: keyDeparture && !feeStrong ? -1 : 0,
      fanDelta: keyDeparture ? -Math.max(2, Math.round(supporterState().fanbase * 0.004)) : 0,
      tone: keyDeparture ? 'warning' : 'neutral', route: 'operators', mail: keyDeparture
    });
  }

  function supporterReactToSponsorship(brand, offer) {
    if (!brand || !offer) return null;
    const score = clamp(Number(offer.performanceScore) || 50, 0, 100);
    const strong = score >= 68;
    const modest = score >= 48;
    return supporterRecordReaction({
      type: 'SPONSORSHIP', title: strong ? 'FANS BACK COMMERCIAL GROWTH' : modest ? 'NEW PARTNER RECEIVES CAUTIOUS WELCOME' : 'FANS WANT RESULTS FROM NEW DEAL',
      detail: `${brand.name} has become a club partner. Supporters value the extra stability, but the relationship will be judged by whether the income strengthens the team and club experience.`,
      confidenceDelta: strong ? 2 : modest ? 1 : 0, popularityDelta: strong ? 2 : modest ? 1 : 0,
      fanDelta: strong ? Math.max(2, Math.round(supporterState().fanbase * 0.002)) : 0,
      tone: strong ? 'positive' : 'neutral', route: 'commercial', mail: false
    });
  }

  function leagueFixtureExpectationSnapshot(fixture = null, opponent = null) {
    const league = typeof ensureLeagueState === 'function' ? ensureLeagueState() : null;
    const resolvedFixture = fixture || (typeof leagueNextFixture === 'function' ? leagueNextFixture() : null);
    const resolvedOpponent = opponent || (resolvedFixture && typeof leagueClubById === 'function' ? leagueClubById(leagueFixtureOpponentId(resolvedFixture)) : null);
    const ownClub = { id: LEAGUE_USER_CLUB_ID };
    const own = leagueClubStrengthSnapshot(ownClub, { commit: false });
    const opposition = leagueClubStrengthSnapshot(resolvedOpponent);
    const home = !resolvedFixture || resolvedFixture.homeId === LEAGUE_USER_CLUB_ID;
    const homeAdjustment = home ? 1.5 : -1.5;
    const strengthDelta = own.rating - opposition.rating + homeAdjustment;
    const winChance = clamp(1 / (1 + Math.exp(-strengthDelta / 7.5)), 0.08, 0.92);
    let label = 'FANS EXPECT A CLOSE MATCH';
    let headline = 'COMPETE FOR THE WIN';
    let tone = 'even';
    let target = 'competitive';
    let expectedScore = winChance >= 0.67 ? '3–1' : winChance >= 0.52 ? '3–2' : winChance >= 0.36 ? '2–3' : '1–3';
    if (winChance >= 0.72) {
      label = 'FANS EXPECT A WIN'; headline = 'WIN EXPECTED'; tone = 'positive'; target = 'win';
    } else if (winChance >= 0.60) {
      label = 'FANS LEAN TOWARD A WIN'; headline = 'SLIGHT FAVOURITES'; tone = 'favourable'; target = 'win';
    } else if (winChance < 0.30) {
      label = 'A WIN WOULD BE A MAJOR UPSET'; headline = 'UNDERDOGS'; tone = 'danger'; target = 'upset';
    } else if (winChance < 0.42) {
      label = 'FANS WOULD ACCEPT A NARROW DEFEAT'; headline = 'OUTSIDERS'; tone = 'warning'; target = 'competitive-loss';
    }
    const scouting = oppositionReportForClub(resolvedOpponent);
    const uncertainty = clamp(Math.round(12 - (Number(scouting?.depth) || OPPOSITION_PUBLIC_REPORT_DEPTH) * 0.08), 3, 10);
    return {
      fixtureId: resolvedFixture?.id || null,
      opponentId: resolvedOpponent?.id || null,
      opponentName: resolvedOpponent?.name || 'Opposition',
      home,
      own,
      opposition,
      strengthDelta: Math.round(strengthDelta * 10) / 10,
      winChance: Math.round(winChance * 100),
      uncertainty,
      label,
      headline,
      tone,
      target,
      expectedScore,
      confidence: supporterState().confidence
    };
  }

  function supporterSettleExpectation(won, fixture, opponent, summary = null) {
    const state = supporterState();
    const expectation = state.lastExpectation?.fixtureId === fixture?.id ? state.lastExpectation : leagueFixtureExpectationSnapshot(fixture, opponent);
    const chance = clamp(Number(expectation.winChance) || 50, 8, 92) / 100;
    const confidenceDelta = won ? clamp(Math.round(2 + (1 - chance) * 6), 2, 7) : -clamp(Math.round(1 + chance * 6), 1, 7);
    const popularityDelta = won ? (chance < 0.42 ? 3 : 1) : (chance >= 0.60 ? -3 : chance < 0.30 ? 0 : -1);
    const fanRate = won ? (chance < 0.42 ? 0.012 : chance >= 0.72 ? 0.003 : 0.006) : (chance >= 0.60 ? -0.008 : chance < 0.30 ? -0.001 : -0.003);
    const reactionLabel = won ? (chance < 0.42 ? 'EXPECTATIONS EXCEEDED' : chance >= 0.72 ? 'EXPECTATION MET' : 'SUPPORTERS PLEASED') : (chance >= 0.60 ? 'EXPECTATION MISSED' : chance < 0.30 ? 'RESULT ACCEPTED' : 'SUPPORTERS DISAPPOINTED');
    const reaction = supporterRecordReaction({
      type: 'MATCH', title: `MATCH REACTION · ${reactionLabel}`,
      detail: `${expectation.label}. ${careerState.name} ${won ? 'won' : 'lost'} ${summary ? `${summary.blueScore}–${summary.redScore}` : ''} against ${opponent?.name || 'the opposition'}. The reaction reflects the difficulty of the fixture rather than the result alone.`,
      confidenceDelta, popularityDelta, fanDelta: Math.round(state.fanbase * fanRate),
      loyaltyDelta: won && chance < 0.30 ? 1 : 0, tone: confidenceDelta >= 0 ? 'positive' : 'warning', route: 'supporters', mail: true
    });
    reaction.fixtureId = fixture?.id || null;
    reaction.opponentId = opponent?.id || null;
    reaction.won = Boolean(won);
    reaction.reaction = reactionLabel;
    reaction.score = summary ? `${summary.blueScore}–${summary.redScore}` : null;
    reaction.confidence = supporterState().confidence;
    return reaction;
  }

  function renderSupportersTab() {
    if (!careerState.created) return renderCareerCreation();
    const state = supporterState();
    const expectation = supporterSeasonExpectation(false);
    const league = ensureLeagueState();
    const table = typeof leagueTable === 'function' ? leagueTable() : [];
    const currentPosition = table.find(row => row.id === LEAGUE_USER_CLUB_ID)?.position || '—';
    const reactions = state.activityHistory.slice(0, 10);
    const history = state.fanHistory.slice(0, 12).reverse();
    const maxFans = Math.max(state.fanbase, ...history.map(item => Number(item.fanbase) || 0), 1);
    const status = state.confidence >= 72 ? 'ENERGISED' : state.confidence >= 55 ? 'OPTIMISTIC' : state.confidence >= 38 ? 'CAUTIOUS' : 'RESTLESS';
    return `<section class="supporter-hub">
      <div class="career-section-head"><div><span>SUPPORTER CULTURE</span><strong>FANS &amp; CLUB POPULARITY</strong></div><p>Supporter numbers move gradually. Results are judged against expectations, while signings, sales and commercial decisions influence confidence and public interest.</p></div>
      <div class="supporter-metric-grid">
        <article><span>ACTIVE FANBASE</span><strong>${supporterNumber(state.fanbase)}</strong><small>${state.fanbase >= (expectation?.startingFanbase || state.fanbase) ? 'GROWTH SINCE SEASON START' : 'BELOW SEASON-START LEVEL'}</small></article>
        <article><span>POPULARITY</span><strong>${state.popularity}/100</strong><small>PUBLIC REACH &amp; INTEREST</small></article>
        <article><span>CONFIDENCE</span><strong>${state.confidence}/100</strong><small>${status}</small></article>
        <article><span>LOYALTY</span><strong>${state.loyalty}/100</strong><small>RESILIENCE DURING POOR FORM</small></article>
      </div>
      <section class="supporter-season-card"><header><div><span>SEASON ${league?.season || 1} EXPECTATION</span><strong>${escapeCareerHtml(expectation?.headline || 'ESTABLISH THE CLUB')}</strong><small>${escapeCareerHtml(expectation?.label || 'Build a competitive foundation')}</small></div><aside><span>CURRENT POSITION</span><strong>${currentPosition}</strong><small>PUBLIC PRE-SEASON ESTIMATE · ${expectation?.expectedPosition || '—'}</small></aside></header><p>${escapeCareerHtml(expectation?.rationale || '')}</p><div class="supporter-expectation-track"><i style="--expected:${clamp(((expectation?.expectedPosition || 1) / Math.max(1, league?.clubs?.length || 20)) * 100, 2, 98)}%;--current:${clamp(((Number(currentPosition) || expectation?.expectedPosition || 1) / Math.max(1, league?.clubs?.length || 20)) * 100, 2, 98)}%"></i><span>1ST</span><span>${league?.clubs?.length || 20}TH</span></div></section>
      <div class="supporter-detail-grid">
        <section class="supporter-history-card"><div class="career-section-head compact"><div><span>POPULARITY TREND</span><strong>SUPPORTER BASE OVER TIME</strong></div><p>Weekly growth combines form, confidence, popularity and loyalty.</p></div><div class="supporter-history-bars">${history.length ? history.map(item => `<i style="height:${Math.max(8, Math.round((Number(item.fanbase) || 0) / maxFans * 100))}%" title="Week ${item.week}: ${supporterNumber(item.fanbase)}"><b></b><span>W${item.week}</span></i>`).join('') : '<p>No weekly history yet. Advance the club calendar to begin tracking.</p>'}</div></section>
        <section class="supporter-reaction-card"><div class="career-section-head compact"><div><span>RECENT REACTIONS</span><strong>WHAT SUPPORTERS ARE RESPONDING TO</strong></div><p>Large reactions are reserved for genuinely important events.</p></div><div>${reactions.length ? reactions.map(item => `<article class="${escapeCareerHtml(item.tone || 'neutral')}"><span>${escapeCareerHtml(item.type || 'CLUB')} · DAY ${item.day}</span><strong>${escapeCareerHtml(item.title)}</strong><p>${escapeCareerHtml(item.detail)}</p><small>${item.deltas?.fanbase ? `${item.deltas.fanbase > 0 ? '+' : ''}${supporterNumber(item.deltas.fanbase)} FANS · ` : ''}${item.deltas?.confidence ? `${item.deltas.confidence > 0 ? '+' : ''}${item.deltas.confidence} CONFIDENCE · ` : ''}${item.deltas?.popularity ? `${item.deltas.popularity > 0 ? '+' : ''}${item.deltas.popularity} POPULARITY` : 'NO MATERIAL CHANGE'}</small></article>`).join('') : '<p class="supporter-empty">No major supporter reaction has been recorded yet.</p>'}</div></section>
      </div>
      <section class="supporter-principles"><span>REALISTIC MODEL</span><p>Fan numbers do not jump simply because a button was pressed. Sustained results and reputation drive long-term growth; decisions create smaller reactions according to their importance and context.</p></section>
    </section>`;
  }

  function oppositionRatingDisplay(club, report = oppositionReportForClub(club)) {
    const strength = leagueClubStrengthSnapshot(club);
    const depth = Number(report?.depth) || OPPOSITION_PUBLIC_REPORT_DEPTH;
    const spread = depth >= 88 ? 0 : depth >= 68 ? 2 : depth >= 45 ? 4 : 7;
    const value = spread ? `${Math.max(10, strength.rating - spread)}–${Math.min(95, strength.rating + spread)}` : String(strength.rating);
    return { ...strength, depth, spread, value };
  }

  function renderSupporterExpectationPanel(fixture = null, opponent = null, context = 'league') {
    if (!careerState.created) return '';
    const expectation = leagueFixtureExpectationSnapshot(fixture, opponent);
    if (!expectation.opponentId) return '';
    const confidence = supporterState().confidence;
    return `<section class="supporter-expectation-panel ${escapeCareerHtml(expectation.tone)}" data-expectation-context="${escapeCareerHtml(context)}">
      <header><div><span>SUPPORTER EXPECTATION</span><strong>${escapeCareerHtml(expectation.headline)}</strong><small>${escapeCareerHtml(expectation.label)}</small></div><aside><span>SUPPORTER CONFIDENCE</span><strong>${confidence}</strong><small>OUT OF 100</small></aside></header>
      <div class="supporter-expectation-grid">
        <div><span>PUBLIC WIN CHANCE</span><strong>${expectation.winChance}%</strong><small>Approximately ±${expectation.uncertainty}% due to incomplete information</small></div>
        <div><span>LIKELY SCORELINE</span><strong>${expectation.expectedScore}</strong><small>${expectation.home ? 'HOME' : 'AWAY'} · FIRST TO 3</small></div>
        <div><span>YOUR FIVE</span><strong>${expectation.own.rating || '—'}</strong>${leagueStrengthStarsMarkup(expectation.own.stars, 'Your team strength')}</div>
        <div><span>${escapeCareerHtml(expectation.opponentName)}</span><strong>${expectation.opposition.rating || '—'}</strong>${leagueStrengthStarsMarkup(expectation.opposition.stars, 'Opponent team strength')}</div>
      </div>
      <p>Expectation compares current active-operator quality, recent form, readiness and home advantage. It does not change health, damage or the result simulation.</p>
    </section>`;
  }

  function renderOppositionIntelligenceReport(club = null, context = 'league') {
    const opponent = club || oppositionCurrentOpponentFromState();
    if (!opponent) return '';
    const report = oppositionReportForClub(opponent);
    const scout = oppositionScout();
    const identity = oppositionIdentityForClub(opponent, 1);
    const rating = oppositionRatingDisplay(opponent, report);
    const depth = rating.depth;
    const keyPlayer = Array.isArray(opponent.roster) ? opponent.roster.slice().sort((a, b) => teamPlayerOverall(b) - teamPlayerOverall(a))[0] : null;
    const revealFormation = depth >= 50;
    const revealStrengths = depth >= 58;
    const revealWeaknesses = depth >= 70;
    const revealKeyPlayer = depth >= 82;
    const suggestionLimit = scout ? clamp(Math.floor((Number(scout.tacticalAdvice) + depth / 20) / 3), 1, 3) : 1;
    const suggestions = identity.counters.slice(0, suggestionLimit);
    const suggestionDestinations = {
      tactics: { targetId: 'tactics:opponent-preparation', action: 'OPEN MATCH PLAN' },
      operators: { targetId: 'operators:active-five', action: 'OPEN ACTIVE FIVE' },
      loadout: { targetId: 'loadout:squad-overview', action: 'OPEN LOADOUTS' }
    };
    const freshness = report.lastUpdatedDay >= 0 ? Math.max(0, Math.round(Number(clubCalendarState()?.absoluteDay) || 0) - report.lastUpdatedDay) : null;
    return `<section class="opposition-intelligence-panel" data-intelligence-context="${escapeCareerHtml(context)}">
      <header>
        <div><span>OPPOSITION INTELLIGENCE · ${depth}%</span><strong>${escapeCareerHtml(opponent.name)}</strong><small>${escapeCareerHtml(identity.name)} · ${scout ? `REPORT BY ${scout.name}` : 'PUBLIC INFORMATION ONLY'}</small></div>
        <aside><span>TEAM STRENGTH</span><strong>${escapeCareerHtml(rating.value)}</strong>${leagueStrengthStarsMarkup(rating.stars, `${opponent.name} team strength`)}</aside>
      </header>
      <div class="opposition-report-meter" aria-label="Scouting report depth ${depth} percent"><i style="width:${depth}%"></i></div>
      <div class="opposition-intelligence-grid">
        <article><span>TACTICAL IDENTITY</span><strong>${escapeCareerHtml(identity.name)}</strong><p>${escapeCareerHtml(identity.summary)}</p></article>
        <article class="${revealFormation ? '' : 'locked'}"><span>LIKELY MATCH PLAN</span><strong>${revealFormation ? `${escapeCareerHtml(identity.formation.toUpperCase())} · ${escapeCareerHtml(identity.approach.toUpperCase())}` : 'DEVELOPING REPORT'}</strong><p>${revealFormation ? `${escapeCareerHtml(identity.engagement.toUpperCase())} RANGE · ${escapeCareerHtml(identity.priority.toUpperCase())} PRIORITY` : 'Further observation is required before the scout will commit to a formation and tempo read.'}</p></article>
        <article class="${revealStrengths ? '' : 'locked'}"><span>RECOGNISED STRENGTHS</span><strong>${revealStrengths ? escapeCareerHtml(identity.strengths[0]) : 'NOT YET CONFIRMED'}</strong><p>${revealStrengths ? escapeCareerHtml(identity.strengths.join(' · ')) : 'A stronger report will identify the behaviours they execute most reliably.'}</p></article>
        <article class="${revealWeaknesses ? '' : 'locked'}"><span>POSSIBLE VULNERABILITY</span><strong>${revealWeaknesses ? escapeCareerHtml(identity.vulnerabilities[0]) : 'NOT YET CONFIRMED'}</strong><p>${revealWeaknesses ? escapeCareerHtml(identity.vulnerabilities.join(' · ')) : 'Weak scouting does not invent a weakness. Continue observation to narrow the assessment.'}</p></article>
        <article class="${revealKeyPlayer ? '' : 'locked'}"><span>KEY OPERATOR</span><strong>${revealKeyPlayer ? escapeCareerHtml(keyPlayer?.name || 'UNKNOWN') : 'UNDER REVIEW'}</strong><p>${revealKeyPlayer && keyPlayer ? `${escapeCareerHtml(teamRoleById(keyPlayer.role).name)} · ${teamPlayerOverall(keyPlayer)} CURRENT ABILITY` : 'Individual threat identification requires a comprehensive report.'}</p></article>
        <article><span>REPORT FRESHNESS</span><strong>${freshness === null ? 'PUBLIC BASELINE' : freshness === 0 ? 'UPDATED TODAY' : `${freshness} DAY${freshness === 1 ? '' : 'S'} OLD`}</strong><p>${scout ? `${report.daysObserved} preparation day${report.daysObserved === 1 ? '' : 's'} processed · maximum ${oppositionReportMaximum(scout)}% depth.` : 'Employ an Opposition Scout to develop the report as calendar days pass.'}</p></article>
      </div>
      <div class="opposition-counter-advice"><div class="career-section-head compact"><div><span>MANAGER OPTIONS</span><strong>HOW TO RESPOND</strong></div><p>These are informed choices, not automatic counters or hidden bonuses.</p></div><div>${suggestions.map((item, index) => {
        const destination = suggestionDestinations[item.route] || { targetId: '', action: `OPEN ${String(item.route || 'PAGE').toUpperCase()}` };
        return `<button data-team-route="${escapeCareerHtml(item.route)}"${destination.targetId ? ` data-team-scroll-target="${escapeCareerHtml(destination.targetId)}"` : ''}><span>${String(index + 1).padStart(2, '0')}</span><p>${escapeCareerHtml(item.text)}</p><b>${escapeCareerHtml(destination.action)} →</b></button>`;
      }).join('')}</div></div>
    </section>`;
  }

  function renderOppositionScoutSection() {
    const scouting = oppositionScoutingState();
    if (!scouting) return '';
    const scout = oppositionScout();
    const opponent = oppositionCurrentOpponentFromState();
    const rows = scouting.pool.map(candidate => {
      const average = (candidate.analysis + candidate.oppositionKnowledge + candidate.tacticalAdvice + candidate.network) / 4;
      return `<article class="club-staff-card opposition-scout-card"><div><span>OPPOSITION SCOUT</span><strong>${escapeCareerHtml(candidate.name)}</strong><small>${escapeCareerHtml(candidate.style)}</small></div><div class="club-staff-stars">${leagueStrengthStarsMarkup(clamp(average / 2, 0.5, 5), 'Scout quality')}</div><dl><div><dt>ANALYSIS</dt><dd>${candidate.analysis}</dd></div><div><dt>OPPOSITION KNOWLEDGE</dt><dd>${candidate.oppositionKnowledge}</dd></div><div><dt>TACTICAL ADVICE</dt><dd>${candidate.tacticalAdvice}</dd></div><div><dt>NETWORK</dt><dd>${candidate.network}</dd></div></dl><footer><span>${teamCredits(candidate.signingFee)} FEE · ${teamCredits(candidate.wage)}/W</span><button class="primary ${careerState.credits < candidate.signingFee ? 'insufficient-funds' : ''}" data-opposition-hire-scout="${candidate.id}" data-insufficient-funds="${careerState.credits < candidate.signingFee ? 'true' : 'false'}">EMPLOY</button></footer></article>`;
    }).join('');
    return `<section class="opposition-scout-department"><div class="career-section-head"><div><span>OPPOSITION DEPARTMENT</span><strong>SCOUTING & MATCH PREPARATION</strong></div><p>One employed scout develops accurate reports over calendar days. Better staff reveal more detail and provide more specific options without guaranteeing a result.</p></div>
      <div class="opposition-scout-current"><div><span>CURRENT SCOUT</span><strong>${scout ? escapeCareerHtml(scout.name) : 'POSITION VACANT'}</strong><small>${scout ? `${escapeCareerHtml(scout.style)} · ${Math.round(oppositionScoutQuality(scout) * 100)}% department quality` : 'Public information remains available at a limited depth.'}</small></div><div><span>NEXT OPPONENT</span><strong>${escapeCareerHtml(opponent?.name || 'SEASON COMPLETE')}</strong><small>${opponent ? `${oppositionReportForClub(opponent)?.depth || OPPOSITION_PUBLIC_REPORT_DEPTH}% REPORT DEPTH` : 'No active league report'}</small></div><div>${scout ? '<button class="menu-danger-trigger" data-opposition-release-scout>RELEASE SCOUT</button>' : ''}<button data-opposition-refresh-pool>REFRESH · 1,200 CR</button></div></div>
      ${opponent ? renderOppositionIntelligenceReport(opponent, 'staff') : ''}
      <div class="club-staff-grid opposition-scout-grid">${rows}</div>
    </section>`;
  }

  const baseClubStaffWageBillForOpposition = clubStaffWageBill;
  clubStaffWageBill = function clubStaffWageBillWithOppositionScout() {
    return baseClubStaffWageBillForOpposition() + Math.max(0, Number(oppositionScout()?.wage) || 0);
  };

  const baseAdvanceCareerDayForOpposition = advanceCareerDay;
  advanceCareerDay = function advanceCareerDayWithOppositionScouting() {
    const before = Math.max(0, Math.round(Number(clubCalendarState()?.absoluteDay) || 0));
    const advanced = baseAdvanceCareerDayForOpposition();
    const after = Math.max(0, Math.round(Number(clubCalendarState()?.absoluteDay) || 0));
    if (advanced && after > before) {
      oppositionProcessScoutingDay();
      leagueRefreshClubStrengths();
      supporterProcessDay(after);
      saveCareerState();
    }
    return advanced;
  };


  const baseStartNextLeagueSeasonForSupporters = startNextLeagueSeason;
  startNextLeagueSeason = function startNextLeagueSeasonWithSupporterExpectation() {
    const started = baseStartNextLeagueSeasonForSupporters();
    if (started) {
      supporterSeasonExpectation(true);
      supporterCaptureHistory('NEW SEASON');
      saveCareerState();
      updateMenuUI();
    }
    return started;
  };

  const baseLeagueSimulateFixtureForStrength = leagueSimulateFixture;
  leagueSimulateFixture = function leagueSimulateFixtureWithDynamicStrength(fixture) {
    if (fixture && !fixture.played) {
      const home = leagueClubById(fixture.homeId);
      const away = leagueClubById(fixture.awayId);
      if (home && home.id !== LEAGUE_USER_CLUB_ID) leagueClubStrengthSnapshot(home);
      if (away && away.id !== LEAGUE_USER_CLUB_ID) leagueClubStrengthSnapshot(away);
    }
    return baseLeagueSimulateFixtureForStrength(fixture);
  };

  const basePrepareCareerMatchContextForExpectation = prepareCareerMatchContext;
  prepareCareerMatchContext = function prepareCareerMatchContextWithExpectation(mode = null) {
    leagueRefreshClubStrengths();
    const result = basePrepareCareerMatchContextForExpectation(mode);
    if (result?.ok && result.mode === 'league') {
      supporterState().lastExpectation = leagueFixtureExpectationSnapshot(result.fixture, result.opponent);
      saveCareerState();
    }
    return result;
  };

  const baseSettleLeagueAfterCareerMatchForExpectation = settleLeagueAfterCareerMatch;
  settleLeagueAfterCareerMatch = function settleLeagueAfterCareerMatchWithExpectation(winner, summary) {
    const league = ensureLeagueState();
    const fixture = leagueActiveFixture();
    const opponent = leagueActiveOpponentClub();
    const mode = league?.activeMode;
    const won = winner === CAREER_OWNED_TEAM;
    const result = baseSettleLeagueAfterCareerMatchForExpectation(winner, summary);
    if (mode === 'league' && fixture) {
      supporterSettleExpectation(won, fixture, opponent, summary);
      leagueDevelopRivalsAfterMatchday(fixture.matchday);
      leagueRefreshClubStrengths();
      saveCareerState();
    }
    return result;
  };

  const baseRenderStaffTabForOpposition = renderStaffTab;
  renderStaffTab = function renderStaffTabWithOpposition() {
    return `${baseRenderStaffTabForOpposition()}${renderOppositionScoutSection()}`;
  };

  const baseRenderLeagueTabForOpposition = renderLeagueTab;
  renderLeagueTab = function renderLeagueTabWithOpposition() {
    leagueRefreshClubStrengths();
    const league = ensureLeagueState();
    const fixture = leagueNextFixture();
    const opponent = fixture ? leagueClubById(leagueFixtureOpponentId(fixture)) : null;
    const base = baseRenderLeagueTabForOpposition();
    if (!opponent) return base;
    return `${renderSupporterExpectationPanel(fixture, opponent, 'league')}${renderOppositionIntelligenceReport(opponent, 'league')}${base}`;
  };

  const baseRenderTacticsTabForOpposition = renderTacticsTab;
  renderTacticsTab = function renderTacticsTabWithOpposition() {
    // Build 12.96 keeps the full supporter expectation and scouting dossier on
    // their dedicated League/Staff surfaces. Tactics now owns one streamlined
    // opponent-preparation brief, preventing the same intelligence from being
    // repeated before the manager reaches the actual response controls.
    return baseRenderTacticsTabForOpposition();
  };

  const baseHandleClubOperationsClickForOpposition = handleClubOperationsClick;
  handleClubOperationsClick = function handleClubOperationsClickWithOpposition(event) {
    const hire = event.target.closest?.('[data-opposition-hire-scout]');
    if (hire) {
      const result = hireOppositionScout(hire.dataset.oppositionHireScout);
      if (result.ok) showStatus(`${result.staff.name.toUpperCase()} EMPLOYED`);
      else showManagementBlocked('APPOINTMENT COULD NOT BE COMPLETED', result.reason || 'The opposition-scout appointment is currently unavailable.', { route: result.reason?.toLowerCase().includes('credit') ? 'barracks' : 'staff', routeLabel: result.reason?.toLowerCase().includes('credit') ? 'OPEN FINANCES' : 'OPEN STAFF', returnFocus: hire });
      return true;
    }
    const release = event.target.closest?.('[data-opposition-release-scout]');
    if (release) {
      if (releaseOppositionScout()) showStatus('OPPOSITION SCOUT RELEASED');
      else showManagementBlocked('NO SCOUT TO RELEASE', 'The Opposition Scout position is already vacant.', { route: 'staff', routeLabel: 'OPEN STAFF', returnFocus: release });
      return true;
    }
    const refresh = event.target.closest?.('[data-opposition-refresh-pool]');
    if (refresh) {
      if (oppositionRefreshScoutPool()) showStatus('OPPOSITION SCOUT SEARCH REFRESHED');
      else showManagementBlocked('SEARCH COULD NOT BE REFRESHED', 'The club needs 1,200 available credits and cannot change staff during a live match.', { route: 'barracks', routeLabel: 'OPEN FINANCES', returnFocus: refresh });
      return true;
    }
    return baseHandleClubOperationsClickForOpposition(event);
  };

  oppositionScoutingState();
  leagueRefreshClubStrengths();
  supporterState();
  supporterSeasonExpectation(false);
  supporterCaptureHistory('SUPPORTER SYSTEM INITIALISED');
