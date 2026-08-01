/*
 * Strikewatch source module: 36-team-management.js
 * Purpose: Squad recruitment, generated player profiles, tutorial guidance,
 * finances, wages, contracts, player development hooks and team-management menu screens.
 *
 * This file shares the application scope with the other source fragments.
 * Run `python3 build.py` to regenerate the development bundle and standalone.
 */

  const TEAM_REQUIRED_STARTERS = 5;
  const TEAM_MAX_SQUAD = 8;
  const TEAM_STARTING_CREDITS = 350000;
  const TEAM_STARTING_WAGE_BUDGET = 32000;
  const TEAM_MARKET_SIZE = 18;
  const TEAM_MARKET_REFRESH_COST = 2500;
  const TEAM_FATIGUE_WARNING = 65;
  const TEAM_FATIGUE_CRITICAL = 82;

  let teamMatchPlayerStats = {};

  const TEAM_ROLES = [
    { id: 'entry', name: 'ENTRY', weights: { marksmanship: 1.05, handling: 1.12, awareness: 0.86, mobility: 1.18, resilience: 0.82, criticalChance: 1.08, criticalDamage: 0.96 }, description: 'Creates first contact and commits quickly through contested space.' },
    { id: 'support', name: 'SUPPORT', weights: { marksmanship: 1.00, handling: 1.04, awareness: 1.06, mobility: 0.94, resilience: 0.96, criticalChance: 1.00, criticalDamage: 1.02 }, description: 'Follows the entry, trades eliminations and stabilises pushes.' },
    { id: 'anchor', name: 'ANCHOR', weights: { marksmanship: 1.00, handling: 0.92, awareness: 1.08, mobility: 0.78, resilience: 1.22, criticalChance: 0.90, criticalDamage: 1.04 }, description: 'Holds important ground and survives pressure for longer.' },
    { id: 'flanker', name: 'FLANKER', weights: { marksmanship: 0.92, handling: 1.02, awareness: 1.10, mobility: 1.22, resilience: 0.78, criticalChance: 1.14, criticalDamage: 0.96 }, description: 'Rotates through alternate routes and attacks from a separated angle.' },
    { id: 'marksman', name: 'MARKSMAN', weights: { marksmanship: 1.24, handling: 0.92, awareness: 1.12, mobility: 0.78, resilience: 0.82, criticalChance: 1.06, criticalDamage: 1.18 }, description: 'Prefers controlled sightlines and accurate ranged exchanges.' },
    { id: 'caller', name: 'SHOT CALLER', weights: { marksmanship: 0.92, handling: 0.94, awareness: 1.28, mobility: 0.86, resilience: 1.00, criticalChance: 1.00, criticalDamage: 1.00 }, description: 'Reads contact information and improves the squad response.' },
    { id: 'flex', name: 'FLEX', weights: { marksmanship: 1.00, handling: 1.00, awareness: 1.00, mobility: 1.00, resilience: 1.00, criticalChance: 1.00, criticalDamage: 1.00 }, description: 'A balanced operator able to fill several tactical jobs.' }
  ];


  const TEAM_ROLE_BEGINNER_GUIDE = {
    entry: {
      job: 'START THE FIGHT',
      lookFor: 'MOBILITY · HANDLING',
      caution: 'Often becomes the first operator exposed to danger.',
      plain: 'Moves into contested space first and creates an opening for the team.'
    },
    support: {
      job: 'FOLLOW AND TRADE',
      lookFor: 'AWARENESS · HANDLING',
      caution: 'Loses value when isolated too far from team-mates.',
      plain: 'Follows the first attacker, helps finish fights and protects a push from collapsing.'
    },
    anchor: {
      job: 'HOLD IMPORTANT GROUND',
      lookFor: 'RESILIENCE · AWARENESS',
      caution: 'Usually rotates more slowly when the fight moves elsewhere.',
      plain: 'Stays on valuable ground, absorbs pressure and makes an area difficult to take.'
    },
    flanker: {
      job: 'ATTACK FROM A NEW ANGLE',
      lookFor: 'MOBILITY · AWARENESS',
      caution: 'A wide route can leave the operator temporarily unsupported.',
      plain: 'Uses an alternate route to reach the side or rear of a fight instead of joining the main push.'
    },
    marksman: {
      job: 'CONTROL LONG SIGHTLINES',
      lookFor: 'MARKSMANSHIP · AWARENESS',
      caution: 'Less comfortable when enemies force a close-range fight.',
      plain: 'Seeks clear ranged angles and punishes enemies who cross open or predictable lanes.'
    },
    caller: {
      job: 'READ AND COORDINATE',
      lookFor: 'AWARENESS · RESILIENCE',
      caution: 'May offer less raw attacking power than a specialist attacker.',
      plain: 'Reads contact information and helps the active five respond to changing situations.'
    },
    flex: {
      job: 'FILL THE MISSING JOB',
      lookFor: 'BALANCED ATTRIBUTES',
      caution: 'Versatile rather than dominant in one specialist role.',
      plain: 'Adapts to several jobs and helps balance an active five that lacks a clear specialist.'
    }
  };

  const TEAM_FIRST_NAMES = [
    'Alex','Aaron','Ben','Callum','Cameron','Charlie','Daniel','Dylan','Elliot','Ethan','Felix','Finley','George','Harry','Isaac','Jamie','Jay','Jonah','Kai','Kieran','Leo','Lewis','Liam','Logan','Marcus','Mason','Max','Micah','Nathan','Noah','Oliver','Oscar','Owen','Reece','Riley','Rowan','Ryan','Sam','Theo','Toby','Tyler','Zach',
    'Aisha','Amelia','Anya','Brooke','Chloe','Elena','Erin','Freya','Grace','Hannah','Imani','Isla','Jade','Leah','Lena','Maya','Mia','Nadia','Naomi','Nina','Olivia','Priya','Rhea','Ruby','Sara','Sofia','Tara','Zara'
  ];
  const TEAM_LAST_NAMES = [
    'Adams','Ahmed','Baker','Bennett','Brooks','Brown','Campbell','Carter','Chen','Clarke','Cole','Cooper','Costa','Davies','Evans','Foster','Garcia','Grant','Green','Hall','Harris','Hayes','Hughes','Ibrahim','Jackson','James','Khan','King','Kowalski','Lewis','Lopez','Martin','Mason','Miller','Mitchell','Moore','Morgan','Murphy','Nguyen','Patel','Price','Reed','Reyes','Roberts','Ross','Santos','Scott','Shaw','Singh','Smith','Taylor','Thomas','Turner','Walker','Ward','White','Williams','Wilson','Young'
  ];
  const TEAM_NATIONALITIES = ['England','Scotland','Wales','Ireland','France','Germany','Spain','Portugal','Netherlands','Belgium','Poland','Sweden','Norway','Denmark','Finland','Canada','United States','Brazil','Argentina','Japan','South Korea','Australia','New Zealand','Nigeria','South Africa','India'];
  const TEAM_PERSONALITIES = ['Model professional','Driven','Resolute','Calm under pressure','Competitive','Ambitious','Team-focused','Independent','Temperamental','Consistent','Adaptable'];
  const TEAM_TRAITS = ['Aggressive peeker','Disciplined anchor','Quick rotator','Clutch temperament','Patient angle holder','Fast reload decisions','Audible-information specialist','Strong trader','Wide-route preference','Controlled burst fire','High-pressure hunter','Cautious opener'];
  const TEAM_PERFORMANCE_TRAIT_DEFS = Object.freeze({
    'opening-threat': { label: 'OPENING THREAT', detail: 'Frequently wins the first visible engagement of a round.', evidence: 'openingKills', threshold: 2 },
    'trade-guardian': { label: 'TRADE GUARDIAN', detail: 'Consistently converts nearby team-mate losses into immediate replies.', evidence: 'tradeKills', threshold: 5 },
    'clutch-specialist': { label: 'CLUTCH SPECIALIST', detail: 'Has repeatedly closed rounds as the final surviving operator.', evidence: 'clutchWins', threshold: 2 },
    'long-lane-expert': { label: 'LONG-LANE EXPERT', detail: 'Produces repeated eliminations from controlled long-range sightlines.', evidence: 'longRangeKills', threshold: 4 },
    'flank-reader': { label: 'FLANK READER', detail: 'Turns alternate routes and second angles into repeated eliminations.', evidence: 'flankKills', threshold: 4 },
    'steady-under-pressure': { label: 'STEADY UNDER PRESSURE', detail: 'Maintains strong ratings and survival when rounds become difficult.', evidence: 'pressureMatches', threshold: 3 }
  });

  function normaliseTeamPerformanceEvidence(raw = null) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const integer = key => Math.max(0, Math.round(Number(source[key]) || 0));
    return {
      matchesObserved: integer('matchesObserved'),
      openingKills: integer('openingKills'),
      tradeKills: integer('tradeKills'),
      clutchWins: integer('clutchWins'),
      longRangeKills: integer('longRangeKills'),
      flankKills: integer('flankKills'),
      supportMatches: integer('supportMatches'),
      pressureMatches: integer('pressureMatches'),
      survivedRounds: integer('survivedRounds')
    };
  }

  function normaliseTeamPerformanceTraits(raw = null) {
    const source = Array.isArray(raw) ? raw : [];
    const seen = new Set();
    return source.map(item => {
      const id = String(item?.id || item || '');
      if (!TEAM_PERFORMANCE_TRAIT_DEFS[id] || seen.has(id)) return null;
      seen.add(id);
      return {
        id,
        earnedMatch: Math.max(1, Math.round(Number(item?.earnedMatch) || 1)),
        evidenceValue: Math.max(0, Math.round(Number(item?.evidenceValue) || 0))
      };
    }).filter(Boolean).slice(0, 2);
  }

  function teamPerformanceTraitDefinition(id) {
    return TEAM_PERFORMANCE_TRAIT_DEFS[String(id || '')] || null;
  }

  function teamPerformanceTraitScore(id, evidence) {
    const values = normaliseTeamPerformanceEvidence(evidence);
    if (id === 'opening-threat') return values.openingKills * 28 + Math.min(20, values.pressureMatches * 4);
    if (id === 'trade-guardian') return values.tradeKills * 11 + values.supportMatches * 9;
    if (id === 'clutch-specialist') return values.clutchWins * 42 + values.pressureMatches * 6;
    if (id === 'long-lane-expert') return values.longRangeKills * 19 + Math.min(18, values.pressureMatches * 3);
    if (id === 'flank-reader') return values.flankKills * 19 + Math.min(18, values.supportMatches * 3);
    if (id === 'steady-under-pressure') return values.pressureMatches * 20 + Math.min(30, values.survivedRounds * 2);
    return 0;
  }

  function teamPerformanceTraitQualified(id, evidence) {
    const values = normaliseTeamPerformanceEvidence(evidence);
    if (values.matchesObserved < 3) return false;
    if (id === 'opening-threat') return values.openingKills >= 2;
    if (id === 'trade-guardian') return values.tradeKills >= 5 && values.supportMatches >= 2;
    if (id === 'clutch-specialist') return values.clutchWins >= 2;
    if (id === 'long-lane-expert') return values.longRangeKills >= 4;
    if (id === 'flank-reader') return values.flankKills >= 4;
    if (id === 'steady-under-pressure') return values.pressureMatches >= 3 && values.survivedRounds >= 4;
    return false;
  }

  function teamPerformanceTraitsMarkup(player, compact = false) {
    const traits = normaliseTeamPerformanceTraits(player?.performanceTraits);
    if (!traits.length) return compact ? '' : `<section class="team-profile-performance-traits developing"><div class="career-section-head compact"><div><span>EVIDENCE-BASED IDENTITY</span><strong>MATCH TRAITS DEVELOPING</strong></div><p>These badges appear only after repeated match evidence. They never grant a hidden stat bonus.</p></div></section>`;
    const cards = traits.map(item => {
      const definition = teamPerformanceTraitDefinition(item.id);
      return `<article><span>${escapeCareerHtml(definition.label)}</span><strong>${escapeCareerHtml(definition.detail)}</strong><small>EARNED AFTER MATCH ${item.earnedMatch} · PRESENTATION ONLY</small></article>`;
    }).join('');
    if (compact) return `<div class="performance-trait-badges">${traits.map(item => `<span>${escapeCareerHtml(teamPerformanceTraitDefinition(item.id).label)}</span>`).join('')}</div>`;
    return `<section class="team-profile-performance-traits"><div class="career-section-head compact"><div><span>EVIDENCE-BASED IDENTITY</span><strong>RECOGNISED MATCH TRAITS</strong></div><p>Repeated behaviour creates identity without changing attributes, weapons or tactical authority.</p></div><div>${cards}</div></section>`;
  }

  function careerMatchHighlightPlayer(player, performance) {
    if (!player || !performance) return null;
    const rating = Number(performance.rating || player.lastMatch?.rating) || 0;
    const score = rating * 10 + (Number(performance.kills) || 0) * 5 + (Number(performance.tradeKills) || 0) * 7 + (Number(performance.survivedRounds) || 0) * 2 + (Number(performance.highestMultiKill) || Number(player.lastMatch?.highestMultiKill) || 0) * 3;
    return { player, performance, rating, score };
  }

  function buildCareerMatchHighlights(summary = null) {
    if (!summary) return null;
    const starters = (careerState.squad || []).slice(0, TEAM_REQUIRED_STARTERS).map(player => careerMatchHighlightPlayer(player, teamMatchPerformance(player.id) || player.lastMatch)).filter(Boolean).sort((a, b) => b.score - a.score || b.rating - a.rating);
    const top = starters[0] || null;
    const moments = (Array.isArray(summary.matchMoments) ? summary.matchMoments : []).filter(item => item && item.type !== 'round-decision').slice().sort((a, b) => (Number(b.priority) || 0) - (Number(a.priority) || 0) || (Number(b.round) || 0) - (Number(a.round) || 0));
    const turning = moments[0] || null;
    const pairUpdate = summary.squadDynamicsUpdate?.topChange || null;
    const pairPlayers = Array.isArray(pairUpdate?.playerIds) ? pairUpdate.playerIds.map(id => (careerState.squad || []).find(player => player.id === id)).filter(Boolean) : [];
    const positiveAdjustment = (Array.isArray(summary.tacticalPlan?.adjustments) ? summary.tacticalPlan.adjustments : []).slice().reverse().find(item => item?.result?.tone === 'positive') || null;
    const averageOverall = starters.length ? starters.reduce((sum, item) => sum + teamPlayerOverall(item.player), 0) / starters.length : 0;
    const surprise = starters.slice().sort((a, b) => ((b.rating * 10) - teamPlayerOverall(b.player)) - ((a.rating * 10) - teamPlayerOverall(a.player)))[0] || null;
    const worked = summary.tacticalAnalysis?.conclusions?.worked || null;
    const cards = [];
    if (top) cards.push({
      id: 'play-of-match', label: 'PLAY OF THE MATCH', title: top.player.name,
      detail: `${top.rating.toFixed(1)} rating · ${top.performance.kills || 0} eliminations · ${top.performance.tradeKills || 0} trades · ${top.performance.survivedRounds || 0} rounds survived.`,
      tone: 'hero', playerId: top.player.id
    });
    if (turning) cards.push({
      id: 'turning-point', label: 'TURNING POINT', title: turning.title,
      detail: `Round ${turning.round} · ${turning.detail}`, tone: turning.tone || 'neutral', playerId: turning.playerId || null
    });
    if (pairPlayers.length === 2) cards.push({
      id: 'partnership', label: 'BEST PARTNERSHIP MOMENT', title: `${pairPlayers[0].name} + ${pairPlayers[1].name}`,
      detail: `Their shared-match bond gained ${pairUpdate.delta || 0} points and reached ${pairUpdate.score || 0}.`, tone: 'partnership', playerId: pairPlayers[0].id
    });
    else if (top && Number(top.performance.tradeKills || 0) > 0) cards.push({
      id: 'partnership', label: 'BEST PARTNERSHIP MOMENT', title: `${top.player.name} protected the team response`,
      detail: `${top.performance.tradeKills || 0} trade eliminations came from being close enough to answer a team-mate loss.`, tone: 'partnership', playerId: top.player.id
    });
    if (positiveAdjustment) cards.push({
      id: 'tactical-change', label: 'MOST EFFECTIVE TACTICAL CHANGE', title: positiveAdjustment.result.title,
      detail: `${(positiveAdjustment.changes || []).map(change => `${String(change.type || '').toUpperCase()} ${String(change.fromLabel || change.from || '').toUpperCase()} → ${String(change.toLabel || change.to || '').toUpperCase()}`).join(' · ')} · ${positiveAdjustment.result.evidence}`,
      tone: 'adjustment'
    });
    else if (worked) cards.push({
      id: 'tactical-change', label: 'TACTICAL PAYOFF', title: worked.title,
      detail: worked.evidence, tone: worked.tone || 'neutral'
    });
    if (surprise && starters.length > 1) cards.push({
      id: 'unexpected', label: teamPlayerOverall(surprise.player) <= averageOverall ? 'UNEXPECTED CONTRIBUTOR' : 'SECONDARY STANDOUT', title: surprise.player.name,
      detail: `${teamPlayerOverall(surprise.player)} OVR · ${surprise.rating.toFixed(1)} match rating · ${surprise.performance.kills || 0} eliminations.`, tone: 'surprise', playerId: surprise.player.id
    });
    return { cards: cards.slice(0, 5), generatedAtMatch: Math.max(1, Number(careerState.totalMatches) || 1) };
  }

  function renderCareerMatchHighlights(summary = null, compact = false) {
    const highlights = summary?.matchHighlights?.cards?.length ? summary.matchHighlights : buildCareerMatchHighlights(summary);
    if (!highlights?.cards?.length) return '';
    const cards = highlights.cards.map(item => `<article class="${escapeCareerHtml(item.tone || 'neutral')}"><span>${escapeCareerHtml(item.label)}</span><strong>${escapeCareerHtml(item.title)}</strong><p>${escapeCareerHtml(item.detail)}</p>${item.playerId ? `<button type="button" data-team-profile="${escapeCareerHtml(item.playerId)}">OPEN OPERATOR</button>` : ''}</article>`).join('');
    if (compact) return `<div class="first-match-highlight-strip">${cards}</div>`;
    const updates = Array.isArray(summary.performanceTraitUpdates) && summary.performanceTraitUpdates.length
      ? `<div class="career-report-trait-unlocks">${summary.performanceTraitUpdates.map(update => `<article><span>NEW MATCH TRAIT</span><strong>${escapeCareerHtml(update.label)}</strong><small>${escapeCareerHtml(update.playerName)} · ${escapeCareerHtml(update.detail)}</small></article>`).join('')}</div>`
      : '';
    return `<section class="career-report-highlights"><div class="career-section-head"><div><span>MATCH STORY</span><strong>KEY MOMENTS & CONTRIBUTORS</strong></div><p>Generated from visible eliminations, round telemetry, player ratings, squad links and tactical changes.</p></div><div class="career-report-highlight-grid">${cards}</div>${updates}</section>`;
  }

  function settleTeamPerformanceTraitsAfterMatch(summary = null) {
    if (!summary) return [];
    const moments = Array.isArray(summary.matchMoments) ? summary.matchMoments : [];
    const updates = [];
    for (const player of (careerState.squad || []).slice(0, TEAM_REQUIRED_STARTERS)) {
      const match = player.lastMatch || null;
      if (!match) continue;
      const evidence = normaliseTeamPerformanceEvidence(player.performanceEvidence);
      const playerMoments = moments.filter(item => item?.playerId === player.id);
      evidence.matchesObserved += 1;
      evidence.openingKills += playerMoments.filter(item => item.type === 'opening' && item.team === CAREER_OWNED_TEAM).length;
      evidence.tradeKills += Math.max(0, Math.round(Number(match.tradeKills) || 0));
      evidence.clutchWins += playerMoments.filter(item => item.type === 'clutch').length;
      evidence.longRangeKills += playerMoments.filter(item => item.type === 'long-range').length;
      evidence.flankKills += playerMoments.filter(item => item.type === 'flank').length;
      const supported = Math.max(0, Number(match.supportedTime) || 0);
      const isolated = Math.max(0, Number(match.isolatedTime) || 0);
      if (supported + isolated > 0 && supported / (supported + isolated) >= 0.58) evidence.supportMatches += 1;
      if ((Number(match.rating) || 0) >= 7.4 && ((Number(match.survivedRounds) || 0) >= Math.ceil((Number(match.rounds) || 1) / 2) || (Number(match.highestMultiKill) || 0) >= 2)) evidence.pressureMatches += 1;
      evidence.survivedRounds += Math.max(0, Math.round(Number(match.survivedRounds) || 0));
      player.performanceEvidence = evidence;
      const existing = normaliseTeamPerformanceTraits(player.performanceTraits);
      const existingIds = new Set(existing.map(item => item.id));
      const available = Object.keys(TEAM_PERFORMANCE_TRAIT_DEFS)
        .filter(id => !existingIds.has(id) && teamPerformanceTraitQualified(id, evidence))
        .sort((a, b) => teamPerformanceTraitScore(b, evidence) - teamPerformanceTraitScore(a, evidence));
      while (existing.length < 2 && available.length) {
        const id = available.shift();
        const definition = teamPerformanceTraitDefinition(id);
        const evidenceValue = evidence[definition.evidence] || 0;
        existing.push({ id, earnedMatch: Math.max(1, Number(careerState.totalMatches) || 1), evidenceValue });
        updates.push({ playerId: player.id, playerName: player.name, id, label: definition.label, detail: definition.detail, evidenceValue });
      }
      player.performanceTraits = existing;
    }
    return updates;
  }
  const TEAM_HISTORY_CLUBS = ['Northbridge Five','Redline Union','Blackwater Academy','Harbour Tactical','Eastgate Wolves','Nova Regiment','Iron District','Vertex Collective','Albion Strike','Morrow Esports','Cinder Unit','Atlas Division'];

  let selectedTeamPlayerId = null;
  let teamNoteReturnFocusEl = null;
  const teamNoteBackgroundInertState = new Map();

  function teamSeedFromString(value) {
    let hash = 2166136261 >>> 0;
    const source = String(value || 'strikewatch');
    for (let i = 0; i < source.length; i++) {
      hash ^= source.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function teamRng(seed) {
    let state = (Number(seed) || 1) >>> 0;
    return () => {
      state += 0x6D2B79F5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function teamPick(random, values) {
    return values[Math.floor(random() * values.length) % values.length];
  }

  function teamRoleById(id) {
    return TEAM_ROLES.find(role => role.id === id) || TEAM_ROLES[TEAM_ROLES.length - 1];
  }


  function teamRoleBeginnerGuide(id) {
    const role = teamRoleById(id);
    return TEAM_ROLE_BEGINNER_GUIDE[role.id] || TEAM_ROLE_BEGINNER_GUIDE.flex;
  }

  function teamRoleGuideGlyphMarkup(roleId) {
    const role = teamRoleById(roleId);
    return `<i class="deployment-role-glyph role-${escapeCareerHtml(role.id)}" aria-hidden="true"><b></b><em></em></i>`;
  }

  function teamRoleGuideCardMarkup(roleId, compact = false) {
    const role = teamRoleById(roleId);
    const guide = teamRoleBeginnerGuide(role.id);
    return `<article class="recruitment-role-card role-${escapeCareerHtml(role.id)} ${compact ? 'compact' : ''}" data-recruitment-role="${escapeCareerHtml(role.id)}">
      <header>${teamRoleGuideGlyphMarkup(role.id)}<div><span>${escapeCareerHtml(guide.job)}</span><strong>${escapeCareerHtml(role.name)}</strong></div></header>
      <p>${escapeCareerHtml(guide.plain)}</p>
      <small><b>LOOK FOR</b>${escapeCareerHtml(guide.lookFor)}</small>
      <small><b>WATCH FOR</b>${escapeCareerHtml(guide.caution)}</small>
    </article>`;
  }

  function recruitmentRoleGuideOpeningStep() {
    const guide = typeof firstMatchGuidance === 'function' ? firstMatchGuidance() : null;
    return Boolean(guide && ['recruitment', 'profile', 'first-signing', 'active-five'].includes(guide.id));
  }

  function recruitmentRoleGuideMarkup(_forceCollapsed = false) {
    const guided = recruitmentRoleGuideOpeningStep();
    return `<details class="recruitment-role-guide ${guided ? 'guided' : ''}">
      <summary><span><b>${guided ? 'RECRUITMENT TUTORIAL' : 'ROLE REFERENCE'}</b><strong>WHAT DOES EACH OPERATOR ROLE MEAN?</strong><small>Roles guide autonomous positioning and decisions; they are tactical tendencies rather than rigid character classes.</small></span><i aria-hidden="true">+</i></summary>
      <div class="recruitment-role-guide-body">
        <div class="recruitment-role-grid">${TEAM_ROLES.map(role => teamRoleGuideCardMarkup(role.id)).join('')}</div>
        <aside><strong>A SIMPLE FIRST FIVE</strong><span>ENTRY · SUPPORT · ANCHOR · FLANKER · MARKSMAN, SHOT CALLER OR FLEX</span><p>This is a beginner-friendly balance, not a compulsory formation. Duplicate roles can work when their attributes, weapons and tactical plan support the choice.</p></aside>
      </div>
    </details>`;
  }

  function recruitmentProfileRoleGuideMarkup(primaryRoleId, secondaryRoleId) {
    const primary = teamRoleById(primaryRoleId);
    const secondary = teamRoleById(secondaryRoleId);
    return `<section class="recruitment-profile-role-guide">
      <header><div><span>ROLE EXPLAINED</span><strong>HOW THIS CANDIDATE FITS</strong></div><p>The primary role is their natural tactical identity. The secondary role shows the most suitable alternative job.</p></header>
      <div>${teamRoleGuideCardMarkup(primary.id, true)}${secondary.id !== primary.id ? teamRoleGuideCardMarkup(secondary.id, true) : ''}</div>
    </section>`;
  }

  function teamCondition(player) {
    const injuryPenalty = typeof playerInjuryPenalty === 'function' ? playerInjuryPenalty(player) * 100 : 0;
    return clamp(100 - (Number(player?.fatigue) || 0) - injuryPenalty, 0, 100);
  }

  function teamFatigueLabel(player) {
    const fatigue = clamp(Math.round(Number(player?.fatigue) || 0), 0, 100);
    if (fatigue >= TEAM_FATIGUE_CRITICAL) return 'EXHAUSTED';
    if (fatigue >= TEAM_FATIGUE_WARNING) return 'FATIGUED';
    if (fatigue >= 42) return 'TIRED';
    if (fatigue >= 20) return 'MANAGEABLE';
    return 'FRESH';
  }

  function teamHappinessLabel(player) {
    const value = clamp(Math.round(Number(player?.happiness) || 70), 1, 100);
    if (value >= 86) return 'DELIGHTED';
    if (value >= 72) return 'HAPPY';
    if (value >= 56) return 'CONTENT';
    if (value >= 38) return 'UNSETTLED';
    return 'UNHAPPY';
  }

  function teamReadinessScore(player) {
    const condition = teamCondition(player);
    const morale = clamp(Number(player?.morale) || 70, 1, 100);
    const happiness = clamp(Number(player?.happiness) || 70, 1, 100);
    const form = clamp(Number(player?.form) || 6.5, 1, 10) * 10;
    const injuryPenalty = typeof playerInjuryPenalty === 'function' ? playerInjuryPenalty(player) * 34 : 0;
    return Math.round(clamp(condition * 0.46 + morale * 0.20 + happiness * 0.18 + form * 0.16 - injuryPenalty, 0, 100));
  }

  function teamReadinessLabel(player) {
    const value = teamReadinessScore(player);
    if (value >= 82) return 'PEAK';
    if (value >= 68) return 'READY';
    if (value >= 54) return 'AVAILABLE';
    if (value >= 40) return 'ROTATION ADVISED';
    return 'REST ADVISED';
  }

  function defaultPlayerReflection(player) {
    const fatigue = Number(player?.fatigue) || 0;
    const happiness = Number(player?.happiness) || 70;
    if (typeof playerInjuryActive === 'function' && playerInjuryActive(player)) return {
      personal: `I am managing ${player.injury.name.toLowerCase()} and do not feel fully unrestricted in the arena.`,
      team: 'The squad should be ready to rotate me if the match becomes too physically demanding.',
      insight: 'CONSIDER RECOVERY TRAINING OR ROTATION'
    };
    if (fatigue >= TEAM_FATIGUE_CRITICAL) return {
      personal: 'I am not recovering quickly enough between fixtures and my sharpness is dropping late in rounds.',
      team: 'The squad may need rotation before the next match so we can keep our tempo high.',
      insight: 'REST OR ROTATE THIS PLAYER'
    };
    if (happiness < 40) return {
      personal: 'I am not fully comfortable with how things are going and I need a clearer role in the side.',
      team: 'The team has quality, but responsibilities and expectations need to be more consistent.',
      insight: 'REVIEW ROLE AND PLAYING TIME'
    };
    return {
      personal: 'I am ready to contribute and want to establish myself in the starting line-up.',
      team: 'We need clear roles, good spacing and decisive trades when the next fixture begins.',
      insight: 'NO MATCH FEEDBACK YET'
    };
  }

  function playerReflection(player) {
    return player?.lastMatch?.reflection || defaultPlayerReflection(player);
  }

  function teamNoteBackgroundElements() {
    const parent = teamNoteOverlayEl?.parentElement;
    if (!parent) return [];
    return Array.from(parent.children).filter(element => element !== teamNoteOverlayEl);
  }

  function setTeamNoteBackgroundIsolated(isolated) {
    if (isolated) {
      if (teamNoteBackgroundInertState.size) return true;
      for (const element of teamNoteBackgroundElements()) {
        teamNoteBackgroundInertState.set(element, {
          inert: Boolean(element.inert),
          inertAttribute: element.hasAttribute('inert')
        });
        element.inert = true;
        element.setAttribute('inert', '');
      }
      return teamNoteBackgroundInertState.size > 0;
    }
    for (const [element, previous] of teamNoteBackgroundInertState) {
      if (!element?.isConnected) continue;
      element.inert = previous.inert;
      if (previous.inertAttribute) element.setAttribute('inert', '');
      else element.removeAttribute('inert');
    }
    teamNoteBackgroundInertState.clear();
    return true;
  }

  function teamNoteFocusableControls() {
    if (!teamNoteOverlayEl || teamNoteOverlayEl.hidden) return [];
    return Array.from(teamNoteOverlayEl.querySelectorAll('button, [href], input, select, textarea, [tabindex]'))
      .filter(element => !element.disabled
        && element.getAttribute('tabindex') !== '-1'
        && !element.hidden
        && element.getClientRects().length > 0);
  }

  function trapTeamNoteModalFocus(event) {
    if (String(event?.key || '').toLowerCase() !== 'tab' || !teamNoteOverlayEl || teamNoteOverlayEl.hidden) return false;
    const controls = teamNoteFocusableControls();
    if (!controls.length) {
      event.preventDefault();
      return true;
    }
    const first = controls[0];
    const last = controls[controls.length - 1];
    const active = document.activeElement;
    const outside = !teamNoteOverlayEl.contains(active);
    if (event.shiftKey && (outside || active === first)) {
      event.preventDefault();
      last.focus({ preventScroll: true });
      return true;
    }
    if (!event.shiftKey && (outside || active === last)) {
      event.preventDefault();
      first.focus({ preventScroll: true });
      return true;
    }
    return false;
  }

  function closeTeamNoteModal({ restoreFocus = true } = {}) {
    if (!teamNoteOverlayEl) return;
    const returnTarget = teamNoteReturnFocusEl;
    teamNoteOverlayEl.hidden = true;
    teamNoteOverlayEl.setAttribute('aria-hidden', 'true');
    teamNoteOverlayEl.dataset.tone = '';
    teamNoteOverlayEl.dataset.mode = '';
    delete teamNoteOverlayEl.dataset.mailId;
    if (teamNoteActionsEl) {
      teamNoteActionsEl.innerHTML = '';
      teamNoteActionsEl.hidden = true;
    }
    if (teamNoteQuoteEl) teamNoteQuoteEl.textContent = '“';
    if (teamNoteDismissHintEl) teamNoteDismissHintEl.textContent = 'TAP OUTSIDE OR PRESS × TO CLOSE';
    document.body.classList.remove('team-note-open');
    setTeamNoteBackgroundIsolated(false);
    teamNoteReturnFocusEl = null;
    if (restoreFocus && returnTarget?.isConnected && typeof returnTarget.focus === 'function') {
      requestAnimationFrame(() => {
        if (returnTarget.isConnected) returnTarget.focus({ preventScroll: true });
      });
    }
  }

  function openTeamNoteModal({ kicker = 'PLAYER COMMENT', title = 'EXPANDED COMMENT', body = '', footer = '', tone = 'reflection', mode = 'note', glyph = '“', actionsHtml = '', dismissHint = 'TAP OUTSIDE OR PRESS × TO CLOSE', returnFocus = null } = {}) {
    if (!teamNoteOverlayEl || !teamNoteTitleEl || !teamNoteBodyEl) return false;
    if (returnFocus) teamNoteReturnFocusEl = returnFocus;
    if (teamNoteQuoteEl) teamNoteQuoteEl.textContent = glyph || '“';
    if (teamNoteKickerEl) teamNoteKickerEl.textContent = kicker || 'PLAYER COMMENT';
    teamNoteTitleEl.textContent = title || 'EXPANDED COMMENT';
    teamNoteBodyEl.textContent = body || '';
    if (teamNoteFooterEl) {
      const footerText = String(footer || '').trim();
      teamNoteFooterEl.textContent = footerText;
      teamNoteFooterEl.hidden = !footerText;
    }
    if (teamNoteActionsEl) {
      const markup = String(actionsHtml || '').trim();
      teamNoteActionsEl.innerHTML = markup;
      teamNoteActionsEl.hidden = !markup;
    }
    if (teamNoteDismissHintEl) teamNoteDismissHintEl.textContent = dismissHint || 'TAP OUTSIDE OR PRESS × TO CLOSE';
    teamNoteOverlayEl.dataset.tone = String(tone || 'reflection');
    teamNoteOverlayEl.dataset.mode = String(mode || 'note');
    teamNoteOverlayEl.hidden = false;
    teamNoteOverlayEl.setAttribute('aria-hidden', 'false');
    document.body.classList.add('team-note-open');
    setTeamNoteBackgroundIsolated(true);
    if (teamNoteCloseBtn && typeof teamNoteCloseBtn.focus === 'function') teamNoteCloseBtn.focus({ preventScroll: true });
    return true;
  }

  function showManagementNotice({ kicker = 'MANAGEMENT NOTICE', title = 'ACTION UNAVAILABLE', body = '', footer = '', tone = 'warning', glyph = '!', route = '', routeLabel = 'OPEN RELEVANT PAGE', returnFocus = null } = {}) {
    if (typeof openTeamNoteModal !== 'function') return false;
    const routeMarkup = route ? `<button type="button" class="primary" data-management-modal-route="${escapeCareerHtml(route)}">${escapeCareerHtml(routeLabel)}</button>` : '';
    const actionsHtml = `<footer class="team-note-management-actions"><button type="button" data-management-modal-dismiss="1">OK</button>${routeMarkup}</footer>`;
    return openTeamNoteModal({
      kicker, title, body, footer, tone, mode: 'management', glyph, actionsHtml,
      dismissHint: 'TAP OUTSIDE, PRESS × OR CHOOSE OK TO CLOSE',
      returnFocus
    });
  }

  function showManagementBlocked(title, body, options = {}) {
    return showManagementNotice({
      kicker: options.kicker || 'ACTION BLOCKED',
      title, body, footer: options.footer || '', tone: options.tone || 'warning',
      glyph: options.glyph || '!', route: options.route || '', routeLabel: options.routeLabel || 'OPEN RELEVANT PAGE',
      returnFocus: options.returnFocus || null
    });
  }

  function openTeamNoteModalFromTrigger(trigger) {
    if (!trigger?.dataset) return false;
    return openTeamNoteModal({
      kicker: trigger.dataset.expandKicker || trigger.dataset.noteKicker || 'PLAYER COMMENT',
      title: trigger.dataset.expandTitle || trigger.dataset.noteTitle || 'EXPANDED COMMENT',
      body: trigger.dataset.expandBody || trigger.dataset.noteBody || '',
      footer: trigger.dataset.expandFooter || trigger.dataset.noteFooter || '',
      tone: trigger.dataset.expandTone || 'reflection',
      actionsHtml: trigger.dataset.expandActions || '',
      returnFocus: trigger
    });
  }

  function teamExpandableButtonMarkup({ className = '', kicker = 'PLAYER COMMENT', title = 'EXPANDED COMMENT', preview = '', body = '', footer = '', meta = '', tone = 'reflection', actionsHtml = '' } = {}) {
    const classes = ['team-expand-card'];
    if (className) classes.push(className);
    if (tone) classes.push(tone);
    return `<button type="button" class="${classes.join(' ')}" data-team-expand="1" data-expand-tone="${escapeCareerHtml(tone)}" data-expand-kicker="${escapeCareerHtml(kicker)}" data-expand-title="${escapeCareerHtml(title)}" data-expand-body="${escapeCareerHtml(body)}" data-expand-footer="${escapeCareerHtml(footer)}" data-expand-actions="${escapeCareerHtml(actionsHtml)}"><span>${escapeCareerHtml(kicker)}</span><p>${escapeCareerHtml(preview || body)}</p>${meta ? `<small>${escapeCareerHtml(meta)}</small>` : '<small>TAP TO EXPAND</small>'}</button>`;
  }

  function teamPlayerOverall(player) {
    const stats = player?.stats || defaultCareerStats();
    const role = teamRoleById(player?.role);
    const keys = Object.keys(CAREER_STAT_DEFS);
    const weighted = keys.reduce((sum, key) => sum + (Number(stats[key]) || 0) * (role.weights[key] || 1), 0);
    const weightTotal = keys.reduce((sum, key) => sum + (role.weights[key] || 1), 0);
    return Math.round(clamp(weighted / Math.max(1, weightTotal), 0, CAREER_MAX_STAT) * 10);
  }

  function teamPotentialLabel(player) {
    const potential = clamp(Number(player?.potential) || 0, 0, 100);
    if (potential >= 86) return 'ELITE CEILING';
    if (potential >= 76) return 'HIGH POTENTIAL';
    if (potential >= 66) return 'GOOD POTENTIAL';
    if (potential >= 56) return 'DEVELOPING';
    return 'LIMITED UPSIDE';
  }

  function teamCredits(value) {
    return `${Math.round(Number(value) || 0).toLocaleString()} CR`;
  }

  function clubEconomyGuideMarkup(mode = 'overview', options = {}) {
    const wageBill = typeof clubTotalWageBill === 'function' ? clubTotalWageBill() : teamSquadWageBill();
    const wageHeadroom = Math.round((Number(careerState.wageBudget) || 0) - wageBill);
    const loan = typeof clubFinanceLoanState === 'function' ? clubFinanceLoanState() : careerState.financeLoan;
    const summary = options?.summary || null;
    const playerXp = summary
      ? (summary.finance?.development || []).reduce((sum, item) => sum + Math.max(0, Math.round(Number(item?.xp) || 0)), 0)
      : 0;
    const teamPoints = Math.max(0, Math.round(Number(careerState.unspentPoints) || 0));
    const playerPoints = typeof totalUnspentPlayerPoints === 'function' ? totalUnspentPlayerPoints() : 0;
    const facts = {
      cash: {
        key: 'cash', label: 'CLUB CASH · CR',
        value: summary ? `+${teamCredits(summary.finance?.income || 0)}` : teamCredits(careerState.credits),
        title: 'PAYS CLUB COSTS',
        detail: 'Transfer fees, named equipment, staff, scouting, weekly payroll and scheduled loan collections all use Club Cash.'
      },
      wage: {
        key: 'wage', label: 'WAGE HEADROOM',
        value: `${wageHeadroom >= 0 ? '' : '−'}${teamCredits(Math.abs(wageHeadroom))}`,
        title: 'A LIMIT, NOT ANOTHER BALANCE',
        detail: 'A contract wage counts against the weekly wage budget. Payroll is then deducted from Club Cash as the calendar advances.'
      },
      loan: {
        key: 'loan', label: 'FOUNDATION LOAN',
        value: loan?.active ? `${teamCredits(loan.installment)} · W${loan.nextPaymentWeek}` : 'SETTLED',
        title: loan?.active ? 'AUTOMATIC INSTALMENTS' : 'NO FURTHER COLLECTIONS',
        detail: loan?.active
          ? `${teamCredits(loan.principal)} was borrowed at club creation. ${teamCredits(loan.totalRepayable)} is repaid in ${loan.paymentCount} instalments every ${loan.intervalWeeks} weeks.`
          : 'The opening loan has been repaid. The Finances page retains the full transaction record.'
      },
      gold: {
        key: 'gold', label: 'GOLD COINS · GC',
        value: summary ? `+${careerGoldCoins(summary.goldCoinReward?.amount || 0)}` : careerGoldCoins(careerState.goldCoins),
        title: 'SUPPLY CRATES ONLY',
        detail: 'Earned from completed matches. Gold Coins buy Tactical Field Crates and never pay transfers, wages, staff or loan instalments.'
      },
      teamXp: {
        key: 'team-xp', label: 'TEAM XP',
        value: summary ? `+${Math.max(0, Math.round(Number(summary.xpAward) || 0))} XP` : `${teamPoints} POINT${teamPoints === 1 ? '' : 'S'} READY`,
        title: 'LEVELS THE CLUB',
        detail: 'Team XP advances Team Level. Each level awards a Team Point for permanent club-wide development benefits.'
      },
      playerXp: {
        key: 'player-xp', label: 'PLAYER XP',
        value: summary ? `+${playerXp} XP` : `${playerPoints} POINT${playerPoints === 1 ? '' : 'S'} READY`,
        title: 'LEVELS INDIVIDUAL OPERATORS',
        detail: 'Each operator earns their own XP. Player levels award personal Stat Points; XP and points are development, not money.'
      }
    };
    const keys = mode === 'recruitment'
      ? ['cash', 'wage', 'loan']
      : mode === 'reward'
        ? ['cash', 'gold', 'teamXp', 'playerXp']
        : ['cash', 'wage', 'gold', 'teamXp', 'playerXp'];
    const title = mode === 'recruitment' ? 'BEFORE YOUR FIRST CONTRACT' : mode === 'reward' ? 'WHAT EACH REWARD DOES' : 'RESOURCE MAP';
    const intro = mode === 'recruitment'
      ? 'Read fee, wage and loan commitments separately. Cash is spendable now; wage headroom is only a weekly limit.'
      : mode === 'reward'
        ? 'The match awards several different resources. They are already saved, but each has a different destination.'
        : 'Club Cash, wage headroom, Gold Coins and development points are separate systems. One balance never substitutes for another.';
    const cards = keys.map(key => {
      const item = facts[key];
      return `<article class="${escapeCareerHtml(item.key)}"><span>${escapeCareerHtml(item.label)}</span><strong>${escapeCareerHtml(item.value)}</strong><b>${escapeCareerHtml(item.title)}</b><p>${escapeCareerHtml(item.detail)}</p></article>`;
    }).join('');
    const foot = mode === 'reward'
      ? `<aside><strong>SUPPLY DROP IS NOT A CURRENCY.</strong> ${summary?.rewardEligible ? 'This victory earned one free match crate after the report.' : 'A free match crate requires a victory; Gold Coins can still buy a Field Crate later.'}</aside>`
      : '';
    return `<section class="club-economy-guide ${escapeCareerHtml(mode)}" data-economy-guide="${escapeCareerHtml(mode)}"><header><span>ECONOMY GUIDE</span><strong>${escapeCareerHtml(title)}</strong><p>${escapeCareerHtml(intro)}</p></header><div>${cards}</div>${foot}</section>`;
  }

  function teamSquadWageBill() {
    return (careerState.squad || []).reduce((sum, player) => sum + Math.max(0, Number(player.wage) || 0), 0);
  }

  function careerSquadReady() {
    return Boolean(careerState.created && Array.isArray(careerState.squad) && careerState.squad.length >= TEAM_REQUIRED_STARTERS);
  }

  function teamInsightTrainingSuggestion(player, reflection = playerReflection(player)) {
    const text = `${reflection?.insight || ''} ${reflection?.personal || ''} ${reflection?.team || ''}`.toUpperCase();
    const scores = {
      marksmanship: 0,
      handling: 0,
      awareness: 0,
      mobility: 0,
      resilience: 0,
      recovery: 0
    };
    const add = (focusId, points, keywords) => {
      for (const keyword of keywords) if (text.includes(keyword)) scores[focusId] += points;
    };

    add('awareness', 4, ['SUPPORT', 'TRADE', 'UNTRADED', 'TEAM-MATE', 'TEAMMATE']);
    add('awareness', 3, ['AWARE', 'READ', 'DISCIPLINE', 'DECISION', 'RESPONSIBILIT']);
    add('awareness', 2, ['COVER', 'STRUCTURE', 'ROLE BALANCE']);
    add('mobility', 4, ['ROUTE', 'ROTAT', 'FLANK', 'REPOSITION']);
    add('mobility', 3, ['SPACING', 'POSITION', 'DISTANCE', 'DISCONNECTED', 'SEPARATED']);
    add('mobility', 2, ['CLOSE', 'INITIATIVE', 'LATE-ROUND']);
    add('marksmanship', 4, ['ACCURACY', 'SHOT SELECTION', 'AIM']);
    add('marksmanship', 3, ['DUEL', 'FINISH', 'PICK', 'RUSHED TOO MANY SHOTS']);
    add('handling', 4, ['RECOIL', 'BURST', 'SPRAY', 'WEAPON CONTROL']);
    add('handling', 3, ['RHYTHM', 'CADENCE', 'RELOAD', 'CONTROLLED ENGAGEMENT']);
    add('resilience', 4, ['EXPOSED', 'SURVIVE', 'DAMAGE TAKEN']);
    add('resilience', 3, ['PRESSURE', 'COMPOSURE', 'DEATHS']);
    add('recovery', 5, ['FATIGUE', 'TIRED', 'REST', 'ROTATE THIS PLAYER', 'RECOVERY']);
    add('recovery', 3, ['REACTIONS LATE', 'NOT AS SHARP']);

    const priority = ['recovery', 'awareness', 'mobility', 'marksmanship', 'handling', 'resilience'];
    const focusId = priority.reduce((best, id) => scores[id] > scores[best] ? id : best, priority[0]);
    const resolvedFocusId = scores[focusId] > 0 ? focusId : 'awareness';
    const definition = TRAINING_FOCUS_DEFS?.[resolvedFocusId] || TRAINING_FOCUS_DEFS.awareness;
    return {
      focusId: resolvedFocusId,
      label: String(definition?.label || resolvedFocusId).toUpperCase(),
      description: String(definition?.description || ''),
      score: scores[resolvedFocusId]
    };
  }

  function teamTrainingActionMarkup(player, reflection = playerReflection(player)) {
    if (!player?.id) return '';
    const suggestion = teamInsightTrainingSuggestion(player, reflection);
    return `<footer class="team-note-management-actions"><button type="button" class="primary" data-team-note-action="open-training" data-player-id="${escapeCareerHtml(player.id)}" data-training-focus="${escapeCareerHtml(suggestion.focusId)}" data-training-insight="${escapeCareerHtml(reflection?.insight || '')}">ASSIGN ${escapeCareerHtml(suggestion.label)}</button></footer>`;
  }

  function careerMatchPlayerForSlot(slot) {
    const index = Math.max(0, Number(slot) || 0);
    return Array.isArray(careerState.squad) && index < TEAM_REQUIRED_STARTERS ? (careerState.squad[index] || null) : null;
  }

  function teamPlayerById(id) {
    return [...(careerState.squad || []), ...(careerState.market || [])].find(player => player.id === id) || null;
  }

  // Build 12.236: a player name becomes a control only when the profile route
  // can actually show that player. `teamPlayerById()` resolves the squad and
  // the market; anyone else named in press or market copy — a rival club's
  // operator, someone who has left the pool — has no profile to open, so their
  // name stays plain text rather than becoming a control that leads nowhere.
  //
  // Takes the RAW name and escapes it here, so call sites must not pre-escape.
  function careerPlayerLinkMarkup(playerId, label) {
    const safe = escapeCareerHtml(String(label == null ? '' : label));
    const id = String(playerId || '').trim();
    if (!id || !teamPlayerById(id)) return safe;
    return `<button type="button" class="career-entity-link" data-team-profile="${escapeCareerHtml(id)}">${safe}</button>`;
  }

  function normaliseGeneratedPlayer(player, fallbackId = 'player') {
    const stats = defaultCareerStats();
    const rawStats = player?.stats && typeof player.stats === 'object' ? player.stats : {};
    const establishedKeys = ['marksmanship', 'handling', 'awareness', 'mobility', 'resilience'];
    const establishedValues = establishedKeys.map(key => Number(rawStats[key])).filter(value => Number.isFinite(value) && value > 0);
    const migratedCriticalBaseline = establishedValues.length
      ? clamp(Math.round(establishedValues.reduce((sum, value) => sum + value, 0) / establishedValues.length), 1, CAREER_MAX_STAT)
      : 1;
    for (const key of Object.keys(stats)) {
      const supplied = Number(rawStats[key]);
      const fallback = key.startsWith('critical') ? migratedCriticalBaseline : 1;
      stats[key] = clamp(Math.round(Number.isFinite(supplied) && supplied > 0 ? supplied : fallback), 1, CAREER_MAX_STAT);
    }
    return {
      id: String(player?.id || fallbackId),
      name: normaliseCareerName(player?.name || 'Unknown Player') || 'Unknown Player',
      firstName: normaliseCareerName(player?.firstName || ''),
      lastName: normaliseCareerName(player?.lastName || ''),
      nickname: normaliseCareerName(player?.nickname || ''),
      nationality: String(player?.nationality || 'England'),
      age: clamp(Math.round(Number(player?.age) || 22), 17, 38),
      role: teamRoleById(player?.role).id,
      secondaryRole: teamRoleById(player?.secondaryRole || 'flex').id,
      scoutingDivision: player?.scoutingDivision === null || player?.scoutingDivision === undefined ? null : normaliseLeagueTier(player.scoutingDivision),
      personality: String(player?.personality || 'Balanced'),
      traits: Array.isArray(player?.traits) ? player.traits.slice(0, 4).map(String) : [],
      performanceTraits: normaliseTeamPerformanceTraits(player?.performanceTraits),
      performanceEvidence: normaliseTeamPerformanceEvidence(player?.performanceEvidence),
      stats,
      potential: clamp(Math.round(Number(player?.potential) || 60), 35, 99),
      fee: Math.max(0, Math.round(Number(player?.fee) || 0)),
      value: Math.max(0, Math.round(Number(player?.value) || Number(player?.fee) || 0)),
      wage: Math.max(500, Math.round(Number(player?.wage) || 1500)),
      contractWeeks: Number.isFinite(Number(player?.contractWeeks)) ? Math.max(0, Math.round(Number(player.contractWeeks))) : 104,
      contractExpiryNotified: Boolean(player?.contractExpiryNotified),
      morale: clamp(Math.round(Number(player?.morale) || 72), 1, 100),
      happiness: clamp(Math.round(Number(player?.happiness) || Number(player?.morale) || 72), 1, 100),
      fatigue: clamp(Math.round(Number(player?.fatigue) || 0), 0, 100),
      matchSharpness: clamp(Math.round(Number(player?.matchSharpness) || 68), 1, 100),
      form: clamp(Number(player?.form) || 6.5, 1, 10),
      level: Math.max(1, Math.round(Number(player?.level) || 1)),
      xp: Math.max(0, Math.round(Number(player?.xp) || 0)),
      unspentPoints: Math.max(0, Math.round(Number(player?.unspentPoints) || 0)),
      trainingFocus: ['none','marksmanship','handling','awareness','mobility','resilience','criticalChance','criticalDamage','recovery'].includes(player?.trainingFocus) ? player.trainingFocus : 'none',
      trainingProgress: Object.fromEntries(Object.keys(CAREER_STAT_DEFS).map(key => [key, clamp(Number(player?.trainingProgress?.[key]) || 0, 0, 99.999)])),
      trainingLastGain: Math.max(0, Number(player?.trainingLastGain) || 0),
      trainingLastResult: String(player?.trainingLastResult || 'No completed training day recorded.'),
      transferInterest: player?.transferInterest && typeof player.transferInterest === 'object' ? {
        score: clamp(Math.round(Number(player.transferInterest.score) || 0), 0, 100),
        label: String(player.transferInterest.label || 'Limited Interest'),
        clubs: Array.isArray(player.transferInterest.clubs) ? player.transferInterest.clubs.slice(0, 4).map(String) : []
      } : { score: 0, label: 'Limited Interest', clubs: [] },
      injuryVulnerability: clamp(Math.round(Number(player?.injuryVulnerability) || medicalVulnerabilityFallback(player)), 5, 95),
      injury: player?.injury && typeof player.injury === 'object' ? { ...player.injury } : null,
      injuryHistory: Array.isArray(player?.injuryHistory) ? player.injuryHistory.slice(0, 12).map(entry => ({ ...entry })) : [],
      lastInjuryRisk: clamp(Number(player?.lastInjuryRisk) || 0, 0, 1),
      lastMedicalUpdate: String(player?.lastMedicalUpdate || 'No recent medical event.'),
      lastMatch: player?.lastMatch && typeof player.lastMatch === 'object' ? {
        ...player.lastMatch,
        reflection: player.lastMatch.reflection && typeof player.lastMatch.reflection === 'object'
          ? { ...player.lastMatch.reflection }
          : null
      } : null,
      preferredWeaponId: CAREER_WEAPON_CATALOG[player?.preferredWeaponId] ? player.preferredWeaponId : 'scrap-p12',
      equippedPrimaryWeaponId: CAREER_WEAPON_CATALOG[player?.equippedPrimaryWeaponId] && careerWeaponIsPrimary(player.equippedPrimaryWeaponId) ? player.equippedPrimaryWeaponId : (CAREER_WEAPON_CATALOG[player?.equippedWeaponId] && careerWeaponIsPrimary(player.equippedWeaponId) ? player.equippedWeaponId : null),
      equippedSidearmId: CAREER_WEAPON_CATALOG[player?.equippedSidearmId] && careerWeaponIsSidearm(player.equippedSidearmId) ? player.equippedSidearmId : (CAREER_WEAPON_CATALOG[player?.equippedWeaponId] && careerWeaponIsSidearm(player.equippedWeaponId) ? player.equippedWeaponId : 'scrap-p12'),
      equippedWeaponId: CAREER_WEAPON_CATALOG[player?.equippedPrimaryWeaponId] && careerWeaponIsPrimary(player.equippedPrimaryWeaponId) ? player.equippedPrimaryWeaponId : (CAREER_WEAPON_CATALOG[player?.equippedSidearmId] && careerWeaponIsSidearm(player.equippedSidearmId) ? player.equippedSidearmId : (CAREER_WEAPON_CATALOG[player?.equippedWeaponId] ? player.equippedWeaponId : 'scrap-p12')),
      equippedArmourId: typeof CAREER_ARMOUR_CATALOG === 'object' && CAREER_ARMOUR_CATALOG[player?.equippedArmourId] ? player.equippedArmourId : 'none',
      joinedWeek: Math.max(0, Math.round(Number(player?.joinedWeek) || 0)),
      currentTeam: String(player?.currentTeam || 'Free Agent'),
      listedDay: Number.isFinite(Number(player?.listedDay)) ? Math.max(0, Math.round(Number(player.listedDay))) : null,
      availabilityUntilDay: Number.isFinite(Number(player?.availabilityUntilDay)) ? Math.max(0, Math.round(Number(player.availabilityUntilDay))) : null,
      marketReason: String(player?.marketReason || '').slice(0, 220),
      marketOrigin: player?.marketOrigin && typeof player.marketOrigin === 'object' ? {
        type: String(player.marketOrigin.type || 'network').slice(0, 30),
        label: String(player.marketOrigin.label || 'NETWORK ENTRY').slice(0, 60),
        detail: String(player.marketOrigin.detail || '').slice(0, 280),
        sourceClubId: String(player.marketOrigin.sourceClubId || '').slice(0, 80),
        sourceClubName: String(player.marketOrigin.sourceClubName || player.currentTeam || '').slice(0, 80),
        sourceTier: normaliseLeagueTier(player.marketOrigin.sourceTier ?? player.scoutingDivision),
        generatedDay: Number.isFinite(Number(player.marketOrigin.generatedDay)) ? Math.max(0, Math.round(Number(player.marketOrigin.generatedDay))) : 0
      } : null,
      marketMomentum: player?.marketMomentum && typeof player.marketMomentum === 'object' ? {
        previousFee: Math.max(0, Math.round(Number(player.marketMomentum.previousFee) || Number(player.fee) || 0)),
        trend: ['rising','falling','stable'].includes(player.marketMomentum.trend) ? player.marketMomentum.trend : 'stable',
        demand: clamp(Math.round(Number(player.marketMomentum.demand) || 0), 0, 100),
        lastChangedDay: Number.isFinite(Number(player.marketMomentum.lastChangedDay)) ? Math.max(0, Math.round(Number(player.marketMomentum.lastChangedDay))) : 0
      } : { previousFee: Math.max(0, Math.round(Number(player?.fee) || 0)), trend: 'stable', demand: 0, lastChangedDay: 0 },
      rivalBid: player?.rivalBid && typeof player.rivalBid === 'object' ? {
        clubId: String(player.rivalBid.clubId || ''),
        clubName: String(player.rivalBid.clubName || 'Rival club').slice(0, 80),
        amount: Math.max(0, Math.round(Number(player.rivalBid.amount) || 0)),
        expiresDay: Math.max(0, Math.round(Number(player.rivalBid.expiresDay) || 0)),
        needRole: String(player.rivalBid.needRole || '').slice(0, 30)
      } : null,
      clubAcademyProspect: Boolean(player?.clubAcademyProspect),
      clubAcademyIntakeDay: Number.isFinite(Number(player?.clubAcademyIntakeDay)) ? Math.max(0, Math.round(Number(player.clubAcademyIntakeDay))) : null,
      clubAcademyLevel: clamp(Math.round(Number(player?.clubAcademyLevel) || 0), 0, 4),
      history: Array.isArray(player?.history) ? player.history.slice(0, 8) : [],
      career: {
        matches: Math.max(0, Math.round(Number(player?.career?.matches) || 0)),
        wins: Math.max(0, Math.round(Number(player?.career?.wins) || 0)),
        kills: Math.max(0, Math.round(Number(player?.career?.kills) || 0)),
        deaths: Math.max(0, Math.round(Number(player?.career?.deaths) || 0)),
        criticalHits: Math.max(0, Math.round(Number(player?.career?.criticalHits) || 0)),
        headshots: Math.max(0, Math.round(Number(player?.career?.headshots) || 0)),
        doubleKills: Math.max(0, Math.round(Number(player?.career?.doubleKills) || 0)),
        tripleKills: Math.max(0, Math.round(Number(player?.career?.tripleKills) || 0)),
        ultraKills: Math.max(0, Math.round(Number(player?.career?.ultraKills) || 0)),
        rampages: Math.max(0, Math.round(Number(player?.career?.rampages) || 0)),
        rounds: Math.max(0, Math.round(Number(player?.career?.rounds) || 0)),
        rating: clamp(Number(player?.career?.rating) || 0, 0, 10)
      }
    };
  }

  function generateTeamPlayer(seed, index = 0, context = 'market', options = null) {
    const random = teamRng((Number(seed) || 1) + index * 7919);
    const firstName = teamPick(random, TEAM_FIRST_NAMES);
    const lastName = teamPick(random, TEAM_LAST_NAMES);
    const role = teamPick(random, TEAM_ROLES);
    let secondaryRole = teamPick(random, TEAM_ROLES);
    if (secondaryRole.id === role.id) secondaryRole = TEAM_ROLES[(TEAM_ROLES.indexOf(role) + 1) % TEAM_ROLES.length];
    const age = 18 + Math.floor(random() * 16);
    const divisionTier = context === 'market' ? normaliseLeagueTier(options && Number.isFinite(Number(options.divisionTier)) ? Number(options.divisionTier) : careerState.league?.divisionTier) : 3;
    const marketBase = divisionTier === 3
      ? 0.72 + random() * 1.95
      : divisionTier === 2
        ? 1.75 + random() * 2.75
        : divisionTier === 1
          ? 2.85 + random() * 3.00
          : 4.10 + random() * 3.10;
    const base = context === 'market' ? marketBase : 1.55 + random() * 3.55 + (context === 'opponent' ? 0.35 : 0);
    const stats = {};
    for (const key of Object.keys(CAREER_STAT_DEFS)) {
      const roleBoost = (role.weights[key] || 1) - 1;
      const youthVariance = age <= 21 ? random() * 1.2 : 0;
      stats[key] = clamp(Math.round(base + roleBoost * 5.2 + (random() - 0.34) * 3.2 + youthVariance), 1, CAREER_MAX_STAT);
    }
    const statValues = Object.values(stats);
    const rawOverall = statValues.reduce((sum, value) => sum + value, 0) / Math.max(1, statValues.length);
    const divisionPotentialCap = context === 'market' ? ({ 3: 72, 2: 84, 1: 92, 0: 98 }[divisionTier]) : 96;
    const divisionPotentialFloor = context === 'market' ? ({ 3: 34, 2: 48, 1: 60, 0: 70 }[divisionTier]) : 42;
    const potential = clamp(Math.round(rawOverall * 10 + (34 - age) * 1.05 + random() * 18), divisionPotentialFloor, divisionPotentialCap);
    const divisionCostScale = context === 'market' ? ({ 3: 0.60, 2: 0.82, 1: 1.12, 0: 1.55 }[divisionTier]) : 1;
    const value = Math.round(((15000 + Math.pow(rawOverall, 2) * 3300 + potential * 760 + Math.max(0, 27 - age) * 1800) * divisionCostScale) / 1000) * 1000;
    const feeModifier = context === 'market' ? (0.72 + random() * 0.46) : 1;
    const fee = Math.max(5000, Math.round(value * feeModifier / 1000) * 1000);
    const wage = Math.max(500, Math.round(((650 + rawOverall * 760 + potential * 18 + random() * 1100) * divisionCostScale) / 100) * 100);
    const previousSeasons = Math.max(0, Math.min(5, age - 17, Math.floor(random() * 5)));
    const history = [];
    for (let season = 0; season < previousSeasons; season++) {
      const apps = 8 + Math.floor(random() * 27);
      const kills = Math.floor(apps * (1.6 + rawOverall * 0.52 + random() * 1.8));
      const deaths = Math.max(1, Math.floor(apps * (1.3 + (10 - rawOverall) * 0.24 + random() * 1.3)));
      history.push({
        season: `S${Math.max(1, 6 - previousSeasons + season)}`,
        team: teamPick(random, TEAM_HISTORY_CLUBS),
        apps,
        kills,
        deaths,
        accuracy: Math.round(clamp(34 + stats.marksmanship * 4.3 + random() * 9, 25, 82)),
        rating: Number(clamp(4.8 + rawOverall * 0.42 + (random() - 0.5) * 1.2, 4.5, 9.2).toFixed(2))
      });
    }
    const traitCount = 1 + Math.floor(random() * 3);
    const traits = [];
    while (traits.length < traitCount) {
      const trait = teamPick(random, TEAM_TRAITS);
      if (!traits.includes(trait)) traits.push(trait);
    }
    const idPrefix = String(options?.idPrefix || context.slice(0, 2).toUpperCase()).replace(/[^A-Z0-9-]/gi, '').slice(0, 12) || 'MK';
    const id = `${idPrefix}-${(Number(seed) >>> 0).toString(36)}-${index.toString(36)}`;
    const player = {
      id,
      name: `${firstName} ${lastName}`,
      firstName,
      lastName,
      nickname: random() > 0.76 ? teamPick(random, ['Ghost','Rook','Nova','Vex','Mako','Trace','Echo','Flint','Kite','Zero']) : '',
      nationality: teamPick(random, TEAM_NATIONALITIES),
      age,
      role: role.id,
      secondaryRole: secondaryRole.id,
      scoutingDivision: context === 'market' ? divisionTier : null,
      personality: teamPick(random, TEAM_PERSONALITIES),
      traits,
      stats,
      potential,
      fee,
      value,
      wage,
      contractWeeks: 78 + Math.floor(random() * 105),
      morale: 62 + Math.floor(random() * 27),
      happiness: 58 + Math.floor(random() * 34),
      fatigue: context === 'market' ? Math.floor(random() * 24) : Math.floor(random() * 18),
      injuryVulnerability: clamp(Math.round(50 + (age - 24) * 1.5 - stats.resilience * 3 + (random() - 0.5) * 28), 8, 92),
      injury: null,
      injuryHistory: [],
      lastInjuryRisk: 0,
      lastMedicalUpdate: 'No recent medical event.',
      matchSharpness: 58 + Math.floor(random() * 35),
      form: Number((5.2 + random() * 2.8).toFixed(1)),
      level: 1 + Math.max(0, Math.floor((rawOverall - 3.5) / 1.8)),
      xp: Math.floor(random() * 44),
      unspentPoints: 0,
      trainingFocus: 'none',
      trainingProgress: Object.fromEntries(Object.keys(CAREER_STAT_DEFS).map(key => [key, 0])),
      trainingLastGain: 0,
      trainingLastResult: 'No completed training day recorded.',
      transferInterest: { score: 0, label: 'Limited Interest', clubs: [] },
      lastMatch: null,
      preferredWeaponId: random() > 0.66 ? (random() > 0.5 ? 'service-p12' : 'viper-9') : 'scrap-p12',
      equippedPrimaryWeaponId: null,
      equippedSidearmId: 'scrap-p12',
      equippedWeaponId: 'scrap-p12',
      equippedArmourId: 'none',
      currentTeam: context === 'market' ? (random() > 0.62 ? teamPick(random, TEAM_HISTORY_CLUBS) : 'Free Agent') : 'Opposition',
      history,
      career: { matches: 0, wins: 0, kills: 0, deaths: 0, criticalHits: 0, headshots: 0, doubleKills: 0, tripleKills: 0, ultraKills: 0, rampages: 0, rounds: 0, rating: 0 }
    };
    return normaliseGeneratedPlayer(player, id);
  }

  function generateTeamMarket(seed = careerState.marketSeed || Date.now()) {
    const players = [];
    const usedNames = new Set();
    for (let index = 0; index < TEAM_MARKET_SIZE; index++) {
      let attempt = 0;
      let player = generateTeamPlayer(seed + attempt * 104729, index, 'market');
      while (usedNames.has(player.name) && attempt < 12) {
        attempt++;
        player = generateTeamPlayer(seed + attempt * 104729, index + attempt * TEAM_MARKET_SIZE, 'market');
      }
      usedNames.add(player.name);
      players.push(player);
    }
    players.sort((a, b) => a.fee - b.fee || teamPlayerOverall(b) - teamPlayerOverall(a));

    // Every new organisation must have at least one viable route to a complete
    // active five operators. The cheapest foundation candidates remain modestly priced
    // and collectively fit beneath the initial transfer and payroll budgets.
    const foundation = players.slice(0, TEAM_REQUIRED_STARTERS);
    const feeTotal = foundation.reduce((sum, player) => sum + player.fee, 0);
    const wageTotal = foundation.reduce((sum, player) => sum + player.wage, 0);
    const feeScale = Math.min(1, 250000 / Math.max(1, feeTotal));
    const wageScale = Math.min(1, 26000 / Math.max(1, wageTotal));
    for (const player of foundation) {
      player.fee = Math.max(25000, Math.round(player.fee * feeScale / 1000) * 1000);
      player.wage = Math.max(1800, Math.round(player.wage * wageScale / 100) * 100);
      player.value = Math.max(player.fee, player.value);
    }
    return players.sort((a, b) => a.fee - b.fee || teamPlayerOverall(b) - teamPlayerOverall(a));
  }

  function generatedMatchProfile(team, slot) {
    if (team === TEAM_RED && typeof leagueOpponentPlayerForSlot === 'function') {
      const leaguePlayer = leagueOpponentPlayerForSlot(slot);
      if (leaguePlayer) return leaguePlayer;
    }
    const seed = teamSeedFromString(`${careerState.marketSeed || 1}:${careerState.totalMatches}:${roundNumber}:${team}:${slot}:opposition`);
    const player = generateTeamPlayer(seed, slot, 'opponent');
    player.fee = 0;
    player.wage = 0;
    return player;
  }

  function ensureTeamManagementState() {
    careerState.squad = Array.isArray(careerState.squad) ? careerState.squad.map((player, index) => normaliseGeneratedPlayer(player, `SQ-${index}`)).slice(0, TEAM_MAX_SQUAD) : [];
    careerState.marketSeed = Math.max(1, Math.round(Number(careerState.marketSeed) || teamSeedFromString(`${careerState.name}:${Date.now()}`)));
    careerState.market = Array.isArray(careerState.market) ? careerState.market.map((player, index) => normaliseGeneratedPlayer(player, `MK-${index}`)).slice(0, TEAM_MARKET_SIZE) : [];
    for (const player of careerState.squad) normalisePlayerMedical(player);
    for (const player of careerState.market) normalisePlayerMedical(player);
    const currentMarketTier = normaliseLeagueTier(careerState.league?.divisionTier);
    const marketTierMismatch = careerState.market.some(player => player.scoutingDivision === null || player.scoutingDivision < currentMarketTier);
    if (careerState.created && (careerState.market.length < 8 || marketTierMismatch)) careerState.market = generateTeamMarket(careerState.marketSeed);
    careerState.credits = Math.round(Number.isFinite(Number(careerState.credits)) ? Number(careerState.credits) : TEAM_STARTING_CREDITS);
    careerState.wageBudget = Math.max(0, Math.round(Number(careerState.wageBudget) || TEAM_STARTING_WAGE_BUDGET));
    careerState.week = Math.max(1, Math.round(Number(careerState.week) || 1));
    careerState.managerName = normaliseCareerName(careerState.managerName || 'Manager') || 'Manager';
    careerState.reputation = clamp(Math.round(Number(careerState.reputation) || 12), 0, 100);
    careerState.financeHistory = Array.isArray(careerState.financeHistory) ? careerState.financeHistory.slice(0, 80) : [];
    const tutorialState = careerState.tutorial && typeof careerState.tutorial === 'object' ? careerState.tutorial : {};
    careerState.tutorial = {
      marketViewed: Boolean(tutorialState.marketViewed),
      profileViewed: Boolean(tutorialState.profileViewed),
      squadViewed: Boolean(tutorialState.squadViewed),
      completed: Boolean(tutorialState.completed),
      dismissed: Boolean(tutorialState.dismissed),
      contextSeen: tutorialState.contextSeen && typeof tutorialState.contextSeen === 'object' && !Array.isArray(tutorialState.contextSeen) ? { ...tutorialState.contextSeen } : {}
    };
    selectedTeamPlayerId = selectedTeamPlayerId || careerState.selectedPlayerId || careerState.squad[0]?.id || careerState.market[0]?.id || null;
    syncCareerFirstStarterWeapon();
  }

  function teamTutorialStage() {
    if (!careerState.created) return 0;
    const tutorial = careerState.tutorial || {};
    if (tutorial.completed) return 7;
    if (!tutorial.marketViewed) return 1;
    if (!tutorial.profileViewed) return 2;
    if ((careerState.squad || []).length === 0) return 3;
    if ((careerState.squad || []).length < TEAM_REQUIRED_STARTERS) return 4;
    if (!tutorial.squadViewed) return 5;
    return 6;
  }

  function noteTeamManagementRoute(route) {
    if (!careerState.created || !careerState.tutorial) return;
    if (route === 'market') careerState.tutorial.marketViewed = true;
    if (route === 'profile') careerState.tutorial.profileViewed = true;
    if (route === 'operators') careerState.tutorial.squadViewed = true;
    saveCareerState();
  }

  function completeTeamTutorialOnDeploy() {
    if (!careerState.tutorial) return;
    careerState.tutorial.completed = true;
    saveCareerState();
  }

  function teamTutorialContent() {
    const stage = teamTutorialStage();
    const squadCount = (careerState.squad || []).length;
    const loan = typeof clubFinanceLoanState === 'function' ? clubFinanceLoanState() : careerState.financeLoan;
    const orientationComplete = Boolean(careerState.tutorial?.contextSeen?.['new-player-demo-complete']);
    const orientationSkipped = Boolean(careerState.tutorial?.contextSeen?.['new-player-demo-skipped']);
    const stages = {
      1: {
        step: '1 / 6',
        title: 'WHY RECRUITMENT COMES FIRST',
        body: orientationComplete
          ? 'The orientation round showed how autonomous combat works. Your next job is to contract the five operators who will represent the club, then shape their roles, weapons and tactical plan.'
          : orientationSkipped
            ? 'You skipped the demonstration, but the core rule is unchanged: you manage the club while operators move, aim and fight for themselves. Recruitment creates the five-person team that will execute your decisions.'
            : 'You manage the club rather than controlling a weapon. Recruitment creates the five-person team that will execute your roles, loadouts and tactical plan.',
        route: 'market', cta: 'OPEN RECRUITMENT', foundationGuide: true, gameGuide: true, economyGuide: 'recruitment'
      },
      2: { step: '2 / 6', title: 'WHY OPERATOR PROFILES MATTER', body: 'Start with the role guide, then use Active Five Needs and What This Operator Adds to see how a candidate changes the team. Compare ability, potential, role attributes, medical risk, fee and weekly wage before deciding.', route: 'profile', cta: 'VIEW AN OPERATOR PROFILE' },
      3: { step: '3 / 6', title: 'WHY THE FIRST SIGNING MATTERS', body: 'Choose an affordable operator whose strengths begin to cover one of the Active Five needs. Tap Negotiate to prepare the fee, wage and contract, submit the offer, then complete the signing after terms are agreed. Beginner recommendations are optional.', route: 'market', cta: 'RETURN TO RECRUITMENT' },
      4: { step: '4 / 6', title: `WHY YOU NEED FIVE OPERATORS · ${squadCount} / ${TEAM_REQUIRED_STARTERS}`, body: 'A match requires five contracted operators. Watch the needs panel after each completed signing, then repeat Negotiate, Submit Offer and Complete Signing for the remaining choices. Keep enough wage and cash headroom for the opening weeks.', route: 'market', cta: 'SIGN MORE OPERATORS' },
      5: { step: '5 / 6', title: 'WHY DEPLOYMENT ORDER MATTERS', body: 'The first five squad positions are the active operators who deploy. Reorder the squad, check readiness and then use Tactics and Team Armoury to give each operator a suitable job and loadout.', route: 'operators', cta: 'REVIEW ACTIVE OPERATORS' },
      6: { step: '6 / 6', title: 'WHY THE DEBRIEF MATTERS', body: 'The match plays automatically from an operator viewpoint. The report then connects your preparation to what actually happened, so the next training, tactical or loadout change has a clear reason.', route: 'play', cta: 'OPEN MATCH CONTROL' }
    };
    return stages[stage] || null;
  }

  function renderTeamTutorialPanel() {
    if (!careerState.created || careerState.tutorial?.completed || careerState.tutorial?.dismissed) return '';
    const item = teamTutorialContent();
    if (!item) return '';
    const guidance = typeof firstMatchGuidance === 'function' ? firstMatchGuidance() : null;
    const loan = typeof clubFinanceLoanState === 'function' ? clubFinanceLoanState() : careerState.financeLoan;
    const gameGuide = item.gameGuide ? `<div class="team-tutorial-game-loop" aria-label="How Strikewatch works">
      <span><b>1</b> RECRUIT</span><span><b>2</b> PREPARE</span><span><b>3</b> WATCH AI MATCH</span><span><b>4</b> IMPROVE</span>
      <p><strong>YOU CONTROL THE CLUB.</strong> Operators control their own movement, aiming and shooting based on your preparation.</p>
    </div>` : '';
    const foundationGuide = item.foundationGuide ? `<div class="team-tutorial-foundation" aria-label="Optional economy and shortcut reference">
      ${item.economyGuide ? clubEconomyGuideMarkup(item.economyGuide) : ''}
      <div class="team-tutorial-shortcuts"><span><b>1</b> INBOX</span><span><b>2</b> CALENDAR</span><span class="manager-shortcut-desktop"><b>3</b> MATCH</span><span class="manager-shortcut-mobile"><b>3</b> HELP</span><span><b>4</b> END DAY</span></div>
    </div>` : '';

    if (guidance) {
      return `<details class="team-tutorial-card team-tutorial-optional ${item.foundationGuide ? 'foundation-guide' : ''}" aria-label="Optional explanation: ${escapeCareerHtml(item.title)}">
        <summary><span><b>OPTIONAL CONTEXT</b><strong>${escapeCareerHtml(item.title)}</strong><small>Open this only when you want more detail about the current objective.</small></span><i aria-hidden="true">+</i></summary>
        <div class="team-tutorial-optional-body"><p>${escapeCareerHtml(item.body)}</p>${item.note ? `<aside>${escapeCareerHtml(item.note)}</aside>` : ''}${gameGuide}${foundationGuide}</div>
      </details>`;
    }

    return `<section class="team-tutorial-card ${item.foundationGuide ? 'foundation-guide' : ''}" tabindex="-1" aria-label="Manager briefing: ${escapeCareerHtml(item.title)}">
      <div class="team-tutorial-index"><span>CONTEXT</span><strong>GUIDE</strong></div>
      <div class="team-tutorial-copy"><span>MANAGER INDUCTION</span><strong>${escapeCareerHtml(item.title)}</strong><p>${escapeCareerHtml(item.body)}</p>${item.note ? `<aside>${escapeCareerHtml(item.note)}</aside>` : ''}${gameGuide}${foundationGuide}</div>
      <button class="primary" data-team-route="${escapeCareerHtml(item.route)}">${escapeCareerHtml(item.cta)}</button>
    </section>`;
  }

  function teamFinanceTransaction(type, amount, label) {
    careerState.financeHistory = careerState.financeHistory || [];
    careerState.financeHistory.unshift({
      id: `FIN-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      week: Math.max(1, Number(careerState.week) || 1),
      day: typeof clubCalendarState === 'function' ? clubCalendarState().absoluteDay : null,
      type: String(type || 'OTHER').toUpperCase(),
      amount: Math.round(Number(amount) || 0),
      label: String(label || type || 'Club transaction')
    });
    careerState.financeHistory = careerState.financeHistory.slice(0, 80);
  }

  function recruitTeamPlayer(id) {
    if (menuContext === 'pause') return { ok: false, reason: 'Recruitment is locked during a live match.' };
    const marketIndex = (careerState.market || []).findIndex(player => player.id === id);
    if (marketIndex < 0) return { ok: false, reason: 'This player is no longer available.' };
    if ((careerState.squad || []).length >= TEAM_MAX_SQUAD) return { ok: false, reason: `The squad limit is ${TEAM_MAX_SQUAD}.` };
    const player = careerState.market[marketIndex];
    if (careerState.credits < player.fee) return { ok: false, reason: 'Insufficient transfer credits.' };
    if ((typeof clubTotalWageBill === 'function' ? clubTotalWageBill() : teamSquadWageBill()) + player.wage > careerState.wageBudget) return { ok: false, reason: 'The signing would exceed the weekly wage budget.' };
    careerState.credits -= player.fee;
    player.joinedWeek = careerState.week;
    player.currentTeam = careerState.name;
    player.contractWeeks = Math.max(52, player.contractWeeks);
    careerState.squad.push(player);
    if (typeof workflowDiscardLineupDraft === 'function') workflowDiscardLineupDraft({ render: false });
    if (typeof updatePlayerMarketProfile === 'function') updatePlayerMarketProfile(player);
    syncCareerFirstStarterWeapon();
    if (typeof clubInvalidateMatchPlan === 'function') clubInvalidateMatchPlan('A new signing changed the available line-up.');
    careerState.market.splice(marketIndex, 1);
    selectedTeamPlayerId = player.id;
    careerState.selectedPlayerId = player.id;
    teamFinanceTransaction('TRANSFER', -player.fee, `Signed ${player.name}`);
    if (typeof supporterReactToSigning === 'function') supporterReactToSigning(player, { fee: player.fee, source: 'market' });
    saveCareerState();
    updateMenuUI();
    return { ok: true, player };
  }

  function sellTeamPlayer(id) {
    if (menuContext === 'pause') return { ok: false, reason: 'Squad changes are locked during a live match.' };
    const index = (careerState.squad || []).findIndex(player => player.id === id);
    if (index < 0) return { ok: false, reason: 'Player not found.' };
    const player = careerState.squad[index];
    const income = Math.max(5000, Math.round(player.value * 0.62 / 1000) * 1000);
    careerState.squad.splice(index, 1);
    if (typeof workflowDiscardLineupDraft === 'function') workflowDiscardLineupDraft({ render: false });
    syncCareerFirstStarterWeapon();
    if (typeof clubInvalidateMatchPlan === 'function') clubInvalidateMatchPlan('The squad changed after the previous match plan confirmation.');
    careerState.credits += income;
    player.fee = Math.round(player.value * 0.86 / 1000) * 1000;
    player.currentTeam = 'Transfer Listed';
    careerState.market.unshift(player);
    teamFinanceTransaction('TRANSFER', income, `Sold ${player.name}`);
    if (typeof supporterReactToDeparture === 'function') supporterReactToDeparture(player, income);
    selectedTeamPlayerId = careerState.squad[0]?.id || careerState.market[0]?.id || null;
    careerState.selectedPlayerId = selectedTeamPlayerId;
    saveCareerState();
    updateMenuUI();
    return { ok: true, player, income };
  }

  function moveTeamPlayer(id, direction) {
    if (typeof workflowMoveLineupPlayer === 'function') return workflowMoveLineupPlayer(id, direction);
    return false;
  }

  function refreshTeamMarket() {
    if (menuContext === 'pause' || careerState.credits < TEAM_MARKET_REFRESH_COST) return false;
    careerState.credits -= TEAM_MARKET_REFRESH_COST;
    careerState.marketSeed = (careerState.marketSeed + 104729 + careerState.week * 97) >>> 0;
    careerState.market = generateTeamMarket(careerState.marketSeed);
    if (typeof refreshAllPlayerMarketProfiles === 'function') refreshAllPlayerMarketProfiles();
    selectedTeamPlayerId = careerState.market[0]?.id || null;
    teamFinanceTransaction('SCOUTING', -TEAM_MARKET_REFRESH_COST, 'Refreshed recruitment shortlist');
    saveCareerState();
    updateMenuUI();
    return true;
  }

  function resetTeamMatchTracking() {
    teamMatchPlayerStats = {};
    for (let slot = 0; slot < Math.min(TEAM_REQUIRED_STARTERS, careerState.squad.length); slot++) {
      const player = careerState.squad[slot];
      teamMatchPlayerStats[player.id] = {
        playerId: player.id, slot, rounds: 0, roundsWon: 0, kills: 0, deaths: 0,
        shotsFired: 0, shotsHit: 0, criticalHits: 0, headshots: 0, criticalHeadshots: 0, damageDealt: 0, damageTaken: 0,
        armourId: player.equippedArmourId || 'none', armourAbsorbed: 0, armourIntegrityLost: 0, armourBreaks: 0, armourFatigueLoad: Number(getCareerArmour(player.equippedArmourId).fatigueLoad) || 0, weaponFatigueLoad: Number(getCareerWeapon(careerPlayerPrimaryWeaponId(player) || careerPlayerSidearmId(player)).fatigueLoad) || 0, primaryWeaponId: careerPlayerPrimaryWeaponId(player), sidearmWeaponId: careerPlayerSidearmId(player),
        survivalTime: 0, survivedRounds: 0, reloads: 0, weaponSwitches: 0, sidearmDraws: 0, sprintDistance: 0,
        supportedTime: 0, isolatedTime: 0, regroupActions: 0, tradeAttempts: 0, tradeKills: 0, roleActions: 0, routeReplans: 0,
        multiKillEvents: [], highestMultiKill: 0,
        lastKills: 0, lastDeaths: 0
      };
    }
  }

  function recordTeamMatchRound(winner) {
    if (!teamMatchPlayerStats || Object.keys(teamMatchPlayerStats).length === 0) resetTeamMatchTracking();
    const roundTotals = { kills: 0, deaths: 0, shotsFired: 0, shotsHit: 0, criticalHits: 0, headshots: 0, criticalHeadshots: 0, damageDealt: 0, damageTaken: 0, armourAbsorbed: 0, armourIntegrityLost: 0, armourBreaks: 0, survivalTime: 0, reloads: 0, weaponSwitches: 0, sidearmDraws: 0, sprintDistance: 0, supportedTime: 0, isolatedTime: 0, regroupActions: 0, tradeAttempts: 0, tradeKills: 0, roleActions: 0, routeReplans: 0, survivors: 0 };
    for (let slot = 0; slot < Math.min(TEAM_REQUIRED_STARTERS, careerState.squad.length); slot++) {
      const player = careerState.squad[slot];
      const bot = bots.find(candidate => candidate.team === TEAM_BLUE && candidate.slot === slot);
      const entry = teamMatchPlayerStats[player.id] || (teamMatchPlayerStats[player.id] = { playerId: player.id, slot, rounds: 0, roundsWon: 0, kills: 0, deaths: 0, shotsFired: 0, shotsHit: 0, criticalHits: 0, headshots: 0, criticalHeadshots: 0, damageDealt: 0, damageTaken: 0, armourId: player.equippedArmourId || 'none', armourAbsorbed: 0, armourIntegrityLost: 0, armourBreaks: 0, armourFatigueLoad: Number(getCareerArmour(player.equippedArmourId).fatigueLoad) || 0, weaponFatigueLoad: Number(getCareerWeapon(careerPlayerPrimaryWeaponId(player) || careerPlayerSidearmId(player)).fatigueLoad) || 0, primaryWeaponId: careerPlayerPrimaryWeaponId(player), sidearmWeaponId: careerPlayerSidearmId(player), survivalTime: 0, survivedRounds: 0, reloads: 0, weaponSwitches: 0, sidearmDraws: 0, sprintDistance: 0, supportedTime: 0, isolatedTime: 0, regroupActions: 0, tradeAttempts: 0, tradeKills: 0, roleActions: 0, routeReplans: 0, lastKills: 0, lastDeaths: 0 });
      if (!bot) continue;
      const kills = Math.max(0, Math.round((bot.kills || 0) - (entry.lastKills || 0)));
      const deaths = Math.max(0, Math.round((bot.deaths || 0) - (entry.lastDeaths || 0)));
      entry.lastKills = Math.round(bot.kills || 0);
      entry.lastDeaths = Math.round(bot.deaths || 0);
      entry.rounds++;
      entry.roundsWon += winner === TEAM_BLUE ? 1 : 0;
      entry.kills += kills;
      entry.deaths += deaths;
      entry.shotsFired += Math.max(0, Math.round(bot.roundShotsFired || 0));
      entry.shotsHit += Math.max(0, Math.round(bot.roundShotsHit || 0));
      entry.criticalHits += Math.max(0, Math.round(bot.roundCriticalHits || 0));
      entry.headshots += Math.max(0, Math.round(bot.roundHeadshots || 0));
      entry.criticalHeadshots += Math.max(0, Math.round(bot.roundCriticalHeadshots || 0));
      entry.damageDealt += Math.max(0, Number(bot.roundDamageDealt) || 0);
      entry.damageTaken += Math.max(0, Number(bot.roundDamageTaken) || 0);
      entry.armourAbsorbed += Math.max(0, Number(bot.roundArmourAbsorbed) || 0);
      entry.armourIntegrityLost += Math.max(0, Number(bot.roundArmourIntegrityLost) || 0);
      entry.armourBreaks += Math.max(0, Math.round(bot.roundArmourBroken || 0));
      entry.survivalTime += Math.max(0, Number(bot.roundSurvivalTime) || 0);
      entry.reloads += Math.max(0, Math.round(bot.roundReloads || 0));
      entry.weaponSwitches += Math.max(0, Math.round(bot.roundWeaponSwitches || 0));
      entry.sidearmDraws += Math.max(0, Math.round(bot.roundSidearmDraws || 0));
      entry.sprintDistance += Math.max(0, Number(bot.roundSprintDistance) || 0);
      entry.supportedTime += Math.max(0, Number(bot.roundSupportedTime) || 0);
      entry.isolatedTime += Math.max(0, Number(bot.roundIsolatedTime) || 0);
      entry.regroupActions += Math.max(0, Math.round(bot.roundRegroupActions || 0));
      entry.tradeAttempts += Math.max(0, Math.round(bot.roundTradeAttempts || 0));
      entry.tradeKills += Math.max(0, Math.round(bot.roundTradeKills || 0));
      entry.roleActions += Math.max(0, Math.round(bot.roundRoleActions || 0));
      entry.routeReplans += Math.max(0, Math.round(bot.roundRouteReplans || 0));
      entry.survivedRounds += bot.alive ? 1 : 0;
      roundTotals.kills += kills;
      roundTotals.deaths += deaths;
      roundTotals.shotsFired += Math.max(0, Math.round(bot.roundShotsFired || 0));
      roundTotals.shotsHit += Math.max(0, Math.round(bot.roundShotsHit || 0));
      roundTotals.criticalHits += Math.max(0, Math.round(bot.roundCriticalHits || 0));
      roundTotals.headshots += Math.max(0, Math.round(bot.roundHeadshots || 0));
      roundTotals.criticalHeadshots += Math.max(0, Math.round(bot.roundCriticalHeadshots || 0));
      roundTotals.damageDealt += Math.max(0, Number(bot.roundDamageDealt) || 0);
      roundTotals.damageTaken += Math.max(0, Number(bot.roundDamageTaken) || 0);
      roundTotals.armourAbsorbed += Math.max(0, Number(bot.roundArmourAbsorbed) || 0);
      roundTotals.armourIntegrityLost += Math.max(0, Number(bot.roundArmourIntegrityLost) || 0);
      roundTotals.armourBreaks += Math.max(0, Math.round(bot.roundArmourBroken || 0));
      roundTotals.survivalTime += Math.max(0, Number(bot.roundSurvivalTime) || 0);
      roundTotals.reloads += Math.max(0, Math.round(bot.roundReloads || 0));
      roundTotals.weaponSwitches += Math.max(0, Math.round(bot.roundWeaponSwitches || 0));
      roundTotals.sidearmDraws += Math.max(0, Math.round(bot.roundSidearmDraws || 0));
      roundTotals.sprintDistance += Math.max(0, Number(bot.roundSprintDistance) || 0);
      roundTotals.supportedTime += Math.max(0, Number(bot.roundSupportedTime) || 0);
      roundTotals.isolatedTime += Math.max(0, Number(bot.roundIsolatedTime) || 0);
      roundTotals.regroupActions += Math.max(0, Math.round(bot.roundRegroupActions || 0));
      roundTotals.tradeAttempts += Math.max(0, Math.round(bot.roundTradeAttempts || 0));
      roundTotals.tradeKills += Math.max(0, Math.round(bot.roundTradeKills || 0));
      roundTotals.roleActions += Math.max(0, Math.round(bot.roundRoleActions || 0));
      roundTotals.routeReplans += Math.max(0, Math.round(bot.roundRouteReplans || 0));
      roundTotals.survivors += bot.alive ? 1 : 0;
    }
    return roundTotals;
  }

  function teamMatchPerformance(playerId) {
    return teamMatchPlayerStats?.[playerId] || null;
  }

  function teamMatchAggregate() {
    const entries = Object.values(teamMatchPlayerStats || {});
    return entries.reduce((total, entry) => {
      for (const key of ['rounds','roundsWon','kills','deaths','shotsFired','shotsHit','criticalHits','headshots','criticalHeadshots','damageDealt','damageTaken','armourAbsorbed','armourIntegrityLost','armourBreaks','survivalTime','survivedRounds','reloads','weaponSwitches','sidearmDraws','sprintDistance','supportedTime','isolatedTime','regroupActions','tradeAttempts','tradeKills','roleActions','routeReplans']) total[key] += Number(entry[key]) || 0;
      return total;
    }, { rounds: 0, roundsWon: 0, kills: 0, deaths: 0, shotsFired: 0, shotsHit: 0, criticalHits: 0, headshots: 0, criticalHeadshots: 0, damageDealt: 0, damageTaken: 0, armourAbsorbed: 0, armourIntegrityLost: 0, armourBreaks: 0, survivalTime: 0, survivedRounds: 0, reloads: 0, weaponSwitches: 0, sidearmDraws: 0, sprintDistance: 0, supportedTime: 0, isolatedTime: 0, regroupActions: 0, tradeAttempts: 0, tradeKills: 0, roleActions: 0, routeReplans: 0 });
  }

  function buildPlayerMatchReflection(player, performance, won, teamTotals, teamRounds) {
    const shots = Math.max(0, performance.shotsFired || 0);
    const accuracy = shots ? performance.shotsHit / shots : 0;
    const rating = Number(performance.rating) || 0;
    let personal;
    if (rating >= 8.2) personal = `I felt decisive and my ${performance.kills} eliminations gave us control when rounds became tense.`;
    else if (performance.kills >= performance.deaths + 2) personal = 'I was pleased with my impact, although I can still make my positioning cleaner after first contact.';
    else if (accuracy < 0.34 && shots >= 8) personal = 'I rushed too many shots and never found a consistent rhythm. My shot selection has to improve.';
    else if ((performance.isolatedTime || 0) > (performance.supportedTime || 0) * 1.15) personal = 'I spent too long disconnected from support and entered fights the team could not trade.';
    else if ((performance.tradeKills || 0) >= 2) personal = 'My spacing was effective and I converted several team-mate deaths into immediate trades.';
    else if (performance.deaths > performance.kills + 2) personal = 'I exposed myself too often and made it difficult for the team to trade my deaths.';
    else if (player.fatigue >= TEAM_FATIGUE_WARNING) personal = 'I could feel fatigue affecting my reactions late in the match and I was not as sharp as usual.';
    else personal = 'My performance was mixed. I contributed in places, but there were opportunities to make better decisions.';

    const teamAccuracy = teamTotals.shotsFired ? teamTotals.shotsHit / teamTotals.shotsFired : 0;
    let team;
    let insight;
    if (won && teamTotals.kills > teamTotals.deaths) {
      team = 'We generally traded well and kept pressure on the opposition instead of allowing isolated fights.';
      insight = teamAccuracy < 0.40 ? 'VICTORY, BUT TEAM ACCURACY CAN IMPROVE' : 'KEEP THE CURRENT TEAM STRUCTURE';
    } else if (teamAccuracy < 0.34) {
      team = 'As a group we fired too early and gave away too many low-quality engagements.';
      insight = 'PRIORITISE CONTROLLED ENGAGEMENTS';
    } else if (teamTotals.deaths > teamTotals.kills) {
      team = 'We became separated after contact and too many deaths went untraded.';
      insight = 'IMPROVE SPACING AND SUPPORT';
    } else if (!won && teamRounds >= 4) {
      team = 'The match stayed close, but our late-round decisions were too cautious when we needed to take initiative.';
      insight = 'USE MORE DECISIVE LATE-ROUND ROLES';
    } else {
      team = won ? 'The team stayed composed and adapted well enough to close the fixture.' : 'We did not create enough pressure together and need clearer responsibilities.';
      insight = won ? 'RETAIN BALANCED ROLES' : 'REVIEW ROLE BALANCE';
    }
    return { personal, team, insight };
  }

  function teamMatchRewardBreakdown(won, matchMode = 'league', roundsPlayed = 1, commercialMultiplier = 1) {
    const mode = matchMode === 'league' ? 'league' : 'exhibition';
    const playedRounds = Math.max(0, Number(roundsPlayed) || 0);
    const baseMatchIncome = won
      ? (mode === 'league' ? 46000 : 36000) + playedRounds * 3500
      : (mode === 'league' ? 18000 : 14000) + playedRounds * 1500;
    const resultReward = won ? (mode === 'league' ? 32000 : 18000) : (mode === 'league' ? 7000 : 5000);
    const resultRewardLabel = won ? 'VICTORY BONUS' : 'DEFEAT PARTICIPATION AWARD';
    const multiplier = Math.max(0, Number(commercialMultiplier) || 1);
    return {
      won: Boolean(won),
      mode,
      baseMatchIncome,
      resultReward,
      resultRewardLabel,
      commercialMultiplier: multiplier,
      income: Math.round((baseMatchIncome + resultReward) * multiplier)
    };
  }

  function settleTeamManagementAfterMatch(winner, summary) {
    if (!careerState.created || !careerSquadReady()) return null;
    const won = winner === TEAM_BLUE;
    const wages = 0;
    const matchMode = careerState.league?.activeMode === 'league' ? 'league' : 'exhibition';
    const opponentName = typeof leagueActiveOpponentClub === 'function' ? (leagueActiveOpponentClub()?.name || 'Unknown Opposition') : 'Unknown Opposition';
    const commercialMultiplier = typeof teamCommercialIncomeMultiplier === 'function' ? teamCommercialIncomeMultiplier() : 1;
    const reward = teamMatchRewardBreakdown(won, matchMode, Number(summary?.roundsPlayed) || 0, commercialMultiplier);
    const { baseMatchIncome, resultReward, resultRewardLabel } = reward;
    const multiKillBonus = Math.max(0, Math.round(Number(summary?.multiKillBonus?.credits) || 0));
    const income = reward.income + multiKillBonus;
    const settledWeek = careerState.week;
    const teamTotals = teamMatchAggregate();
    careerState.credits += income;
    careerState.reputation = clamp(careerState.reputation + (won ? 3 : 1), 0, 100);
    teamFinanceTransaction('MATCH', reward.income, `${matchMode === 'league' ? 'League' : 'Exhibition'} ${won ? 'victory income' : 'defeat participation award'}`);
    if (multiKillBonus > 0) teamFinanceTransaction('MULTI-KILL', multiKillBonus, `${summary?.multiKillBonus?.events || 0} performance bonus event${Number(summary?.multiKillBonus?.events || 0) === 1 ? '' : 's'}`);
    const development = [];
    if (typeof clubMarkMatchPlayedToday === 'function') clubMarkMatchPlayedToday();

    for (let slot = 0; slot < careerState.squad.length; slot++) {
      const player = careerState.squad[slot];
      const started = slot < TEAM_REQUIRED_STARTERS;
      const assignedRole = typeof clubMatchRoleForPlayer === 'function' ? clubMatchRoleForPlayer(player) : teamRoleById(player.role);
      const performance = started ? teamMatchPerformance(player.id) : null;
      const fatigueBefore = clamp(Number(player.fatigue) || 0, 0, 100);
      if (started && performance) {
        const accuracy = performance.shotsFired ? performance.shotsHit / performance.shotsFired : 0;
        const avgSurvival = performance.survivalTime / Math.max(1, performance.rounds);
        const coordinationBonus = Math.min(0.35, (Number(performance.tradeKills) || 0) * 0.11 + (Number(performance.regroupActions) || 0) * 0.012 + (Number(performance.roleActions) || 0) * 0.006);
        const isolationPenalty = Math.min(0.28, Math.max(0, (Number(performance.isolatedTime) || 0) - (Number(performance.supportedTime) || 0)) * 0.0025);
        const rating = clamp(5.25 + performance.kills * 0.30 - performance.deaths * 0.19 + accuracy * 1.15 + (won ? 0.42 : 0) + performance.survivedRounds * 0.08 + coordinationBonus - isolationPenalty, 3.5, 9.8);
        performance.rating = Number(rating.toFixed(2));
        player.career.matches++;
        player.career.wins += won ? 1 : 0;
        player.career.kills += performance.kills;
        player.career.deaths += performance.deaths;
        player.career.criticalHits = Math.max(0, Number(player.career.criticalHits) || 0) + Math.max(0, Number(performance.criticalHits) || 0);
        player.career.headshots = Math.max(0, Number(player.career.headshots) || 0) + Math.max(0, Number(performance.headshots) || 0);
        player.career.rounds += Math.max(1, performance.rounds);
        player.career.rating = Number(((player.career.rating * Math.max(0, player.career.matches - 1) + rating) / player.career.matches).toFixed(2));
        player.form = Number(clamp(player.form * 0.62 + rating * 0.38, 1, 10).toFixed(1));
        const sprintLoad = Math.min(7, Math.max(0, Number(performance.sprintDistance) || 0) * 0.18);
        const armourLoad = Math.max(0, Number(performance.armourFatigueLoad) || 0);
        const weaponLoad = Math.max(0, Number(performance.weaponFatigueLoad) || 0);
        const workload = 11 + performance.rounds * 2.6 + Math.min(10, avgSurvival / 16) + sprintLoad + armourLoad + weaponLoad + (assignedRole.id === 'entry' ? 4 : 0);
        player.fatigue = clamp(Math.round(player.fatigue + workload - 7), 0, 100);
        player.matchSharpness = clamp(Math.round(player.matchSharpness + 5 + Math.min(4, performance.rounds)), 1, 100);
        player.morale = clamp(Math.round(player.morale + (won ? 4 : -3) + (rating >= 7.2 ? 2 : rating < 5.5 ? -2 : 0)), 1, 100);
        player.happiness = clamp(Math.round(player.happiness + (won ? 3 : -2) + (rating >= 7.5 ? 2 : 0) - (player.fatigue >= TEAM_FATIGUE_CRITICAL ? 3 : 0)), 1, 100);
        const playerMultiKills = (Array.isArray(summary?.multiKillEvents) ? summary.multiKillEvents : []).filter(event => event.playerId === player.id).map(event => ({ ...event }));
        const playerMultiKillBonus = typeof careerMultiKillRewardBreakdown === 'function' ? careerMultiKillRewardBreakdown(playerMultiKills) : { highest: 0, byTier: {} };
        player.career.doubleKills = Math.max(0, Number(player.career.doubleKills) || 0) + Math.max(0, Number(playerMultiKillBonus.byTier?.double) || 0);
        player.career.tripleKills = Math.max(0, Number(player.career.tripleKills) || 0) + Math.max(0, Number(playerMultiKillBonus.byTier?.triple) || 0);
        player.career.ultraKills = Math.max(0, Number(player.career.ultraKills) || 0) + Math.max(0, Number(playerMultiKillBonus.byTier?.ultra) || 0);
        player.career.rampages = Math.max(0, Number(player.career.rampages) || 0) + Math.max(0, Number(playerMultiKillBonus.byTier?.rampage) || 0);
        player.lastMatch = {
          week: settledWeek,
          won,
          competition: matchMode,
          opponentName,
          result: `${summary?.blueScore ?? 0} — ${summary?.redScore ?? 0}`,
          rating: performance.rating,
          kills: performance.kills,
          deaths: performance.deaths,
          shotsFired: performance.shotsFired,
          shotsHit: performance.shotsHit,
          criticalHits: performance.criticalHits || 0,
          headshots: performance.headshots || 0,
          criticalHeadshots: performance.criticalHeadshots || 0,
          accuracy,
          damageDealt: Math.round(performance.damageDealt),
          damageTaken: Math.round(performance.damageTaken),
          armourAbsorbed: Math.round(performance.armourAbsorbed || 0),
          armourIntegrityLost: Math.round(performance.armourIntegrityLost || 0),
          armourBreaks: Math.round(performance.armourBreaks || 0),
          armourId: performance.armourId || player.equippedArmourId || 'none',
          primaryWeaponId: performance.primaryWeaponId || careerPlayerPrimaryWeaponId(player),
          sidearmWeaponId: performance.sidearmWeaponId || careerPlayerSidearmId(player),
          weaponSwitches: Math.round(performance.weaponSwitches || 0),
          sidearmDraws: Math.round(performance.sidearmDraws || 0),
          sprintDistance: Math.round(performance.sprintDistance || 0),
          supportedTime: Math.round(performance.supportedTime || 0),
          isolatedTime: Math.round(performance.isolatedTime || 0),
          regroupActions: Math.round(performance.regroupActions || 0),
          tradeAttempts: Math.round(performance.tradeAttempts || 0),
          tradeKills: Math.round(performance.tradeKills || 0),
          roleActions: Math.round(performance.roleActions || 0),
          routeReplans: Math.round(performance.routeReplans || 0),
          assignedRole: assignedRole.id,
          survivedRounds: performance.survivedRounds,
          rounds: performance.rounds,
          multiKillEvents: playerMultiKills,
          highestMultiKill: playerMultiKillBonus.highest || 0,
          reflection: buildPlayerMatchReflection(player, performance, won, teamTotals, Number(summary?.roundsPlayed) || 1)
        };
      } else {
        player.fatigue = clamp(Math.round(player.fatigue - 18), 0, 100);
        player.matchSharpness = clamp(Math.round(player.matchSharpness - 2), 1, 100);
        player.happiness = clamp(Math.round(player.happiness + (won ? 1 : 0) - (player.happiness < 45 ? 0 : 1)), 1, 100);
      }
      if (player.playingTimePromiseUntil) {
        if (started) {
          player.happiness = clamp(Math.round(player.happiness + 4), 1, 100);
          player.morale = clamp(Math.round(player.morale + 3), 1, 100);
          delete player.playingTimePromiseUntil;
        } else if (clubCalendarState().absoluteDay >= Number(player.playingTimePromiseUntil)) {
          player.happiness = clamp(Math.round(player.happiness - 9), 1, 100);
          player.morale = clamp(Math.round(player.morale - 5), 1, 100);
          delete player.playingTimePromiseUntil;
        }
      }
      let developmentResult = null;
      if (typeof settlePlayerDevelopmentAfterMatch === 'function') {
        developmentResult = settlePlayerDevelopmentAfterMatch(player, performance, started, won);
      }
      const medical = typeof settlePlayerMedicalAfterMatch === 'function'
        ? settlePlayerMedicalAfterMatch(player, performance, started, fatigueBefore)
        : null;
      if (player.lastMatch && started && medical) player.lastMatch.medical = medical;
      development.push({ ...(developmentResult || { playerId: player.id }), medical });
    }

    const squadDynamics = typeof settleSquadDynamicsAfterMatch === 'function' ? settleSquadDynamicsAfterMatch(winner, summary) : null;
    if (summary && squadDynamics) summary.squadDynamicsUpdate = squadDynamics;
    if (typeof refreshAllPlayerMarketProfiles === 'function') refreshAllPlayerMarketProfiles();
    return { income, baseMatchIncome, resultReward, resultRewardLabel, multiKillBonus, won, wages: 0, net: income, week: careerState.week, mode: matchMode, opponentName, commercialMultiplier, teamTotals: { ...teamTotals }, development, squadDynamics };
  }

  function renderTeamAttributeRows(player, allowAllocation = false) {
    return Object.entries(CAREER_STAT_DEFS).map(([key, meta]) => {
      const baseValue = clamp(Number(player?.stats?.[key]) || 0, 0, CAREER_MAX_STAT);
      const value = allowAllocation && typeof playerStatValueWithDraft === 'function' ? playerStatValueWithDraft(player, key) : baseValue;
      const pending = Math.max(0, value - baseValue);
      const canAllocate = allowAllocation && typeof playerCanDraftStatPoint === 'function' && playerCanDraftStatPoint(player, key) && menuContext !== 'pause';
      const canRemove = allowAllocation && pending > 0 && menuContext !== 'pause';
      return `<div class="team-attribute-row ${key.startsWith('critical') ? 'critical-stat' : ''} ${pending ? 'pending-change' : ''}"><span><strong>${meta.label}</strong><small>${meta.affects}</small></span><i><b style="width:${value * 10}%"></b></i><em>${value}${pending ? `<small>+${pending}</small>` : ''}</em>${allowAllocation ? `<div class="team-attribute-stepper"><button data-player-stat-delta="${key}" data-player-stat-change="-1" data-player-id="${player.id}" ${canRemove ? '' : 'disabled'} aria-label="Remove pending ${meta.label} point">−</button><button data-player-stat-delta="${key}" data-player-stat-change="1" data-player-id="${player.id}" ${canAllocate ? '' : 'disabled'} aria-label="Add ${meta.label} point">+</button></div>` : ''}</div>`;
    }).join('');
  }

  function teamSquadSlotLabel(player) {
    const index = (careerState.squad || []).findIndex(candidate => candidate.id === player?.id);
    if (index < 0) return 'RECRUITMENT TARGET';
    return index < TEAM_REQUIRED_STARTERS ? `STARTER ${index + 1}` : `RESERVE ${index - TEAM_REQUIRED_STARTERS + 1}`;
  }

  function renderTeamPlayerContextBar(player, activeRoute = menuTab) {
    if (!player || !(careerState.squad || []).some(candidate => candidate.id === player.id)) return '';
    const squad = careerState.squad || [];
    const index = squad.findIndex(candidate => candidate.id === player.id);
    const role = teamRoleById(player.role);
    const previous = index > 0 ? squad[index - 1] : null;
    const next = index >= 0 && index < squad.length - 1 ? squad[index + 1] : null;
    const profileActive = ['profile', 'player-telemetry'].includes(activeRoute);
    const loadoutActive = activeRoute === 'loadout';
    return `<nav class="team-player-context" aria-label="Player management navigation">
      <button class="team-player-context-back" data-team-route="operators">← SQUAD</button>
      <button class="team-player-context-step" data-team-player-step="-1" data-team-player-route="${activeRoute}" ${previous ? '' : 'disabled'} aria-label="Previous squad player">‹ PREV</button>
      <div class="team-player-context-identity">
        <span>${teamSquadSlotLabel(player)} · ${role.name}</span>
        <strong>${escapeCareerHtml(player.name)}</strong>
        <small>LV ${player.level || 1} · ${teamPlayerOverall(player)} OVR · ${teamReadinessScore(player)} READY · PRI ${escapeCareerHtml(careerPlayerPrimaryWeaponId(player) ? getCareerWeapon(careerPlayerPrimaryWeaponId(player)).name : 'NONE')} · SIDE ${escapeCareerHtml(getCareerWeapon(careerPlayerSidearmId(player)).name)} · ${escapeCareerHtml(typeof playerInjuryLabel === 'function' ? playerInjuryLabel(player) : 'FIT')}</small>
      </div>
      <div class="team-player-context-actions">
        <button class="${profileActive ? 'active' : ''}" data-team-profile="${player.id}" aria-current="${profileActive ? 'page' : 'false'}">PROFILE & DATA</button>
        <button class="loadout ${loadoutActive ? 'active' : ''}" data-team-armoury="${player.id}" aria-current="${loadoutActive ? 'page' : 'false'}">LOADOUT</button>
      </div>
      <button class="team-player-context-step" data-team-player-step="1" data-team-player-route="${activeRoute}" ${next ? '' : 'disabled'} aria-label="Next squad player">NEXT ›</button>
    </nav>`;
  }

  function selectAdjacentTeamPlayer(direction, route = menuTab) {
    const squad = careerState.squad || [];
    if (!squad.length) return false;
    const current = squad.findIndex(player => player.id === selectedTeamPlayerId);
    const index = clamp((current < 0 ? 0 : current) + Math.sign(Number(direction) || 0), 0, squad.length - 1);
    const player = squad[index];
    if (!player) return false;
    selectedTeamPlayerId = player.id;
    careerState.selectedPlayerId = player.id;
    saveCareerState();
    if (route === 'loadout') {
      selectCareerArmouryPlayer(player.id, true);
    } else {
      setMenuRoute('profile');
    }
    return true;
  }

  // Build 12.133: the portrait stays asset-free and fully deterministic, but the
  // bust now carries independent silhouette, complexion and headgear axes plus
  // shoulder, chest-plate and comms detail, so two operators rarely read as the
  // same drawing. Every axis derives from its own seed slice.
  function teamPlayerVisualMarkup(player, role = teamRoleById(player?.role)) {
    const identity = `${player?.id || player?.name || 'operator'}`;
    const seed = teamSeedFromString(`${identity}:portrait`);
    const variant = Math.abs(seed) % 4;
    const tone = Math.abs(teamSeedFromString(`${identity}:complexion`)) % 6;
    const helmet = Math.abs(teamSeedFromString(`${identity}:headgear`)) % 5;
    const rig = Math.abs(teamSeedFromString(`${identity}:rig`)) % 3;
    const initials = String(player?.name || 'OP').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'OP';
    const roleId = String(role?.id || 'flex').replace(/[^a-z0-9-]/gi, '').toLowerCase() || 'flex';
    return `<div class="team-player-visual role-${escapeCareerHtml(roleId)} variant-${variant} tone-${tone} helmet-${helmet} rig-${rig}" aria-hidden="true"><div class="operator-bust"><i class="operator-helmet"></i><i class="operator-head"></i><i class="operator-visor"></i><i class="operator-neck"></i><i class="operator-shoulders"></i><i class="operator-body"></i><i class="operator-rig"></i><i class="operator-plate"></i><i class="operator-comms"></i></div><b>${escapeCareerHtml(initials)}</b><span>${escapeCareerHtml(role?.short || role?.name || 'FLEX')}</span></div>`;
  }

  function renderTeamPlayerMini(player, index, squadContext = false) {
    const overall = teamPlayerOverall(player);
    const role = teamRoleById(player.role);
    const active = squadContext && index < TEAM_REQUIRED_STARTERS;
    const medical = typeof playerMedicalAvailability === 'function' ? playerMedicalAvailability(player) : { label: 'AVAILABLE', className: 'fit' };
    return `<article class="team-player-card ${active ? 'active-lineup' : ''} ${medical.className !== 'fit' ? 'injured' : ''}" data-player-id="${player.id}">
      <div class="team-player-card-head"><span>${active ? `ACTIVE OPERATOR ${index + 1}` : (squadContext ? 'RESERVE OPERATOR' : escapeCareerHtml(player.nationality))}</span><strong>${overall}</strong></div>
      <div class="team-player-identity-row">${teamPlayerVisualMarkup(player, role)}<button class="team-player-name" data-team-profile="${player.id}"><strong>${escapeCareerHtml(player.name)}</strong><small>${player.nickname ? `“${escapeCareerHtml(player.nickname)}” · ` : ''}${role.name} · AGE ${player.age}</small></button></div>
      <div class="team-player-card-stats"><span>AIM <b>${player.stats.marksmanship}</b></span><span>AWR <b>${player.stats.awareness}</b></span><span>MOB <b>${player.stats.mobility}</b></span></div>
      ${squadContext && typeof squadDynamicsBadgeMarkup === 'function' ? squadDynamicsBadgeMarkup(player) : ''}
      ${squadContext ? teamPerformanceTraitsMarkup(player, true) : ''}
      <div class="team-player-card-meta"><span>${squadContext ? `${teamCredits(player.wage)} / WK` : teamCredits(player.fee)}</span><span>LV ${player.level || 1} · FORM ${player.form.toFixed(1)}</span></div>
      <div class="team-player-condition"><span class="${player.fatigue >= TEAM_FATIGUE_WARNING ? 'warning' : ''}">FATIGUE <b>${player.fatigue}%</b></span><span>HAPPINESS <b>${player.happiness}%</b></span><span>READY <b>${teamReadinessScore(player)}</b></span><span class="medical ${medical.className}">MEDICAL <b>${escapeCareerHtml(medical.label)}</b></span></div>
      <div class="team-player-card-actions ${squadContext ? 'squad-actions' : ''}">
        <button data-team-profile="${player.id}">FULL PROFILE</button>
        ${squadContext ? `<button class="team-telemetry-btn" data-team-profile="${player.id}">PROFILE & DATA</button><button class="team-loadout-btn" data-team-armoury="${player.id}">LOADOUT</button><button class="team-move-btn" data-team-move="-1" data-player-id="${player.id}" ${index === 0 ? 'disabled' : ''}>▲ MOVE UP</button><button class="team-move-btn" data-team-move="1" data-player-id="${player.id}" ${index === careerState.squad.length - 1 ? 'disabled' : ''}>▼ MOVE DOWN</button>` : `<button class="primary" data-transfer-start="${player.id}">NEGOTIATE</button>`}
      </div>
    </article>`;
  }

  function teamCommandPositionLabel(position) {
    const value = Math.max(1, Math.round(Number(position) || 1));
    const suffix = value % 100 >= 11 && value % 100 <= 13 ? 'TH' : value % 10 === 1 ? 'ST' : value % 10 === 2 ? 'ND' : value % 10 === 3 ? 'RD' : 'TH';
    return `${value}${suffix}`;
  }

  function teamCommandFixtureSnapshot() {
    const fixture = typeof leagueNextFixture === 'function' ? leagueNextFixture() : null;
    const table = typeof leagueTable === 'function' ? leagueTable() : [];
    const user = table.find(row => row.id === LEAGUE_USER_CLUB_ID) || null;
    const userRating = typeof leagueUserSquadRating === 'function' ? leagueUserSquadRating() : 0;
    if (!fixture) {
      return {
        complete: true,
        opponent: null,
        user,
        userRating,
        title: 'SEASON COMPLETE',
        location: 'FINAL TABLE SETTLED',
        dateLabel: 'NEXT CAMPAIGN PENDING',
        daysLabel: 'REVIEW LEAGUE',
        threatLabel: 'COMPLETE',
        threatTone: 'complete',
        threatDetail: 'Review the final table and begin the next season when ready.'
      };
    }
    const opponent = typeof leagueClubById === 'function' && typeof leagueFixtureOpponentId === 'function'
      ? leagueClubById(leagueFixtureOpponentId(fixture))
      : null;
    const home = fixture.homeId === LEAGUE_USER_CLUB_ID;
    const days = typeof clubDaysUntilFixture === 'function' ? clubDaysUntilFixture() : null;
    const calendar = typeof clubCalendarState === 'function' ? clubCalendarState() : null;
    const fixtureDay = calendar ? Math.max(calendar.absoluteDay, Number(calendar.nextLeagueDay) || calendar.absoluteDay) : 0;
    const date = typeof clubDatePartsForAbsoluteDay === 'function' ? clubDatePartsForAbsoluteDay(fixtureDay) : null;
    const opponentStrength = opponent && typeof leagueClubStrengthSnapshot === 'function'
      ? leagueClubStrengthSnapshot(opponent)
      : { rating: Math.round(Number(opponent?.rating) || 0), stars: 0.5, trend: 'STABLE' };
    const opponentRating = opponentStrength.rating;
    const expectation = opponent && typeof leagueFixtureExpectationSnapshot === 'function'
      ? leagueFixtureExpectationSnapshot(fixture, opponent)
      : null;
    const difference = opponentRating - userRating;
    let threatLabel = 'UNASSESSED';
    let threatTone = 'neutral';
    let threatDetail = 'Complete the active five-operator line-up to generate a reliable strength comparison.';
    if (careerSquadReady() && userRating > 0) {
      if (difference >= 8) {
        threatLabel = 'SEVERE';
        threatTone = 'danger';
        threatDetail = `${opponent?.short || 'OPP'} rate ${difference} points above the submitted five.`;
      } else if (difference >= 4) {
        threatLabel = 'HIGH';
        threatTone = 'warning';
        threatDetail = `${opponent?.short || 'OPP'} hold a ${difference}-point rating advantage.`;
      } else if (difference >= -3) {
        threatLabel = 'EVEN';
        threatTone = 'even';
        threatDetail = `Only ${Math.abs(difference)} rating point${Math.abs(difference) === 1 ? '' : 's'} separate the teams.`;
      } else {
        threatLabel = 'FAVOURABLE';
        threatTone = 'positive';
        threatDetail = `${careerState.name} hold a ${Math.abs(difference)}-point rating advantage.`;
      }
    }
    return {
      complete: false,
      fixture,
      opponent,
      user,
      userRating,
      opponentRating,
      opponentStrength,
      expectation,
      title: opponent?.name || 'OPPONENT TBD',
      // Build 12.233: the venue as data rather than only baked into the
      // all-caps `location` tag, so Operations Today can set it in sentence
      // case beside its sentence-case headline without re-deriving it.
      home,
      location: `${home ? 'HOME' : 'AWAY'} · MATCHDAY ${fixture.matchday}`,
      dateLabel: date ? `${date.shortDay} ${date.dayOfMonth} ${date.shortMonth} ${date.year}` : `MATCHDAY ${fixture.matchday}`,
      daysLabel: days === 0 ? 'TODAY' : `${days} DAY${days === 1 ? '' : 'S'}`,
      threatLabel,
      threatTone,
      threatDetail
    };
  }

  function teamCommandSquadSnapshot() {
    const squad = Array.isArray(careerState.squad) ? careerState.squad : [];
    const starters = squad.slice(0, TEAM_REQUIRED_STARTERS);
    const readiness = starters.length ? Math.round(starters.reduce((sum, player) => sum + teamReadinessScore(player), 0) / starters.length) : 0;
    const fatigue = starters.length ? Math.round(starters.reduce((sum, player) => sum + (Number(player.fatigue) || 0), 0) / starters.length) : 0;
    const happiness = starters.length ? Math.round(starters.reduce((sum, player) => sum + (Number(player.happiness) || 0), 0) / starters.length) : 0;
    const medical = starters.filter(player => typeof playerMedicalAvailability === 'function' ? playerMedicalAvailability(player).className !== 'fit' : Boolean(player.injury));
    const readyCount = starters.filter(player => teamReadinessScore(player) >= 70).length;
    const tone = !careerSquadReady() ? 'warning' : medical.length || readiness < 65 ? 'danger' : fatigue >= 58 || readiness < 76 ? 'warning' : 'positive';
    return { squad, starters, readiness, fatigue, happiness, medical, readyCount, tone };
  }

  function teamCommandLoanSnapshot(wageBill = 0) {
    const loan = typeof clubFinanceLoanState === 'function' ? clubFinanceLoanState() : careerState.financeLoan;
    if (!loan) return { active: false, tone: 'complete', balance: 0, due: 0, dueLabel: 'NO LOAN DATA', reserveAfter: Math.round(Number(careerState.credits) || 0) - Math.round(Number(wageBill) || 0) };
    const active = Boolean(loan.active && Number(loan.balance) > 0);
    const due = active ? Math.min(Number(loan.balance) || 0, (Number(loan.installment) || 0) + (Number(loan.arrears) || 0)) : 0;
    const dueDay = active ? Math.max(0, (Math.max(1, Number(loan.nextPaymentWeek) || 1) - 1) * 7) : null;
    const now = typeof clubCalendarState === 'function' ? clubCalendarState().absoluteDay : 0;
    const daysUntil = active ? Math.max(0, dueDay - now) : null;
    const dueDate = active && typeof clubDatePartsForAbsoluteDay === 'function' ? clubDatePartsForAbsoluteDay(dueDay) : null;
    const reserveAfter = Math.round(Number(careerState.credits) || 0) - due - Math.round(Number(wageBill) || 0);
    const tone = !active ? 'complete' : Number(loan.arrears) > 0 || reserveAfter < 0 ? 'danger' : reserveAfter < due ? 'warning' : 'positive';
    return {
      loan,
      active,
      balance: Math.max(0, Number(loan.balance) || 0),
      due,
      dueDate,
      daysUntil,
      reserveAfter,
      tone,
      dueLabel: active ? `${dueDate?.compactDate || `WEEK ${loan.nextPaymentWeek}`} · ${daysUntil === 0 ? 'DUE NOW' : `${daysUntil}D`}` : 'FULLY REPAID'
    };
  }

  function teamCommandObjectives(fixture, squad, loan, wageBill) {
    const ready = careerSquadReady();
    const planConfirmed = typeof clubMatchPlanConfirmed === 'function' ? clubMatchPlanConfirmed() : false;
    const user = fixture.user;
    const position = user?.position || 1;
    const leaguePlayed = user?.played || 0;
    const financeTarget = loan.active ? loan.due + wageBill : wageBill;
    return [
      {
        label: 'REGISTER FIVE ACTIVE OPERATORS',
        detail: ready ? 'Five eligible starters are registered.' : `${squad.starters.length} / ${TEAM_REQUIRED_STARTERS} starting places filled.`,
        value: `${squad.starters.length}/${TEAM_REQUIRED_STARTERS}`,
        tone: ready ? 'complete' : 'attention',
        route: ready ? 'operators' : 'market',
        action: ready ? 'REVIEW' : 'RECRUIT'
      },
      {
        label: 'LOCK THE MATCHDAY PLAN',
        detail: planConfirmed ? 'Line-up, roles and tactics are confirmed.' : ready ? 'Review Plan Fit and confirm the tactical setup.' : 'Complete the active five-operator line-up before confirming tactics.',
        value: planConfirmed ? 'LOCKED' : 'OPEN',
        tone: planConfirmed ? 'complete' : ready ? 'attention' : 'neutral',
        route: ready ? 'tactics' : 'market',
        action: ready ? 'TACTICS' : 'RECRUIT'
      },
      {
        label: 'FINISH IN THE TOP TWO',
        detail: fixture.complete ? 'The campaign is complete; review the final table.' : leaguePlayed ? `${user.points} points from ${leaguePlayed} match${leaguePlayed === 1 ? '' : 'es'}.` : 'Promotion places are decided across a 38-match double round-robin season.',
        value: leaguePlayed ? teamCommandPositionLabel(position) : 'TOP 2',
        tone: fixture.complete ? (position <= 2 ? 'complete' : 'attention') : leaguePlayed ? (position <= 2 ? 'positive' : 'neutral') : 'neutral',
        route: 'league',
        action: 'TABLE'
      },
      {
        label: 'PROTECT SCHEDULED COMMITMENTS',
        detail: loan.active
          ? `${teamCredits(financeTarget)} covers the next loan collection and one weekly payroll cycle.`
          : `${teamCredits(financeTarget)} covers one weekly payroll cycle; the foundation loan is settled.`,
        value: teamCredits(loan.reserveAfter),
        tone: loan.reserveAfter < 0 ? 'attention' : 'positive',
        route: 'barracks',
        action: 'FINANCES'
      }
    ];
  }

  function teamCommandRecommendedActions(fixture, squad, loan) {
    const actions = [];
    const seen = new Set();
    const add = (route, label, detail, priority = 'standard', leagueAction = null) => {
      const key = `${route}:${leagueAction || ''}:${label}`;
      if (seen.has(key)) return;
      seen.add(key);
      actions.push({ route, label, detail, priority, leagueAction });
    };
    const blockers = typeof clubEndDayBlockers === 'function' ? clubEndDayBlockers() : [];
    for (const blocker of blockers.slice(0, 2)) {
      if (blocker.id === 'matchday') {
        const prepared = careerSquadReady() && typeof clubMatchPlanConfirmed === 'function' && clubMatchPlanConfirmed();
        add(prepared ? 'play' : 'tactics', prepared ? blocker.label : 'COMPLETE MATCHDAY PREPARATION', prepared ? blocker.detail : "Review and confirm the tactical plan before today’s fixture can begin.", 'urgent', prepared ? 'play-league' : null);
      } else {
        add(blocker.route, blocker.label, blocker.detail, 'urgent');
      }
    }
    if (!careerSquadReady()) add('market', 'COMPLETE THE ACTIVE OPERATOR LINE-UP', `${TEAM_REQUIRED_STARTERS - squad.starters.length} more signing${TEAM_REQUIRED_STARTERS - squad.starters.length === 1 ? '' : 's'} required before matchmaking.`, 'urgent');
    if (careerSquadReady() && typeof clubMatchPlanConfirmed === 'function' && !clubMatchPlanConfirmed()) add('tactics', 'REVIEW PLAN FIT', 'Confirm roles, tactics and opponent suitability before deployment.', 'important');
    if (squad.medical.length || squad.fatigue >= 58 || squad.readiness < 70) add('training', 'MANAGE SQUAD CONDITION', `${squad.medical.length} medical concern${squad.medical.length === 1 ? '' : 's'} · ${squad.fatigue}% average fatigue · ${squad.readiness} readiness.`, squad.medical.length ? 'urgent' : 'important');
    if (loan.active && (loan.tone === 'danger' || loan.tone === 'warning' || loan.daysUntil <= 7)) add('barracks', 'CHECK THE NEXT BANK COLLECTION', `${teamCredits(loan.due)} due ${loan.dueLabel.toLowerCase()}; projected reserve after payroll is ${teamCredits(loan.reserveAfter)}.`, loan.tone === 'danger' ? 'urgent' : 'important');
    const unread = typeof clubUnreadMailCount === 'function' ? clubUnreadMailCount() : 0;
    if (unread > 0) add('mail', `READ ${unread} UNREAD MESSAGE${unread === 1 ? '' : 'S'}`, 'Inbox items may contain decisions, reports or scheduled reminders.', 'standard');
    if (!fixture.complete && fixture.daysLabel === 'TODAY' && careerSquadReady() && typeof clubMatchPlanConfirmed === 'function' && clubMatchPlanConfirmed() && !actions.some(item => item.leagueAction === 'play-league')) {
      add('play', 'DEPLOY FOR THE LEAGUE FIXTURE', `${fixture.location} against ${fixture.title}.`, 'urgent', 'play-league');
    }
    if (!actions.length) add('calendar', 'ADVANCE THE CLUB PLAN', 'Review upcoming dates, then use End Day when no decisions are blocking progress.', 'standard');
    return actions.slice(0, 4);
  }

  function teamCommandRecentResults() {
    const league = typeof ensureLeagueState === 'function' ? ensureLeagueState() : null;
    const fixtures = (league?.fixtures || [])
      .filter(fixture => fixture.played && (fixture.homeId === LEAGUE_USER_CLUB_ID || fixture.awayId === LEAGUE_USER_CLUB_ID))
      .sort((a, b) => b.matchday - a.matchday)
      .slice(0, 5)
      .map(fixture => {
        const home = fixture.homeId === LEAGUE_USER_CLUB_ID;
        const opponentId = home ? fixture.awayId : fixture.homeId;
        const opponent = typeof leagueClubById === 'function' ? leagueClubById(opponentId) : null;
        const scored = home ? fixture.homeScore : fixture.awayScore;
        const conceded = home ? fixture.awayScore : fixture.homeScore;
        const won = fixture.winnerId === LEAGUE_USER_CLUB_ID;
        return { fixture, home, opponent, scored, conceded, won };
      });
    const wins = fixtures.filter(item => item.won).length;
    const winRate = fixtures.length ? wins / fixtures.length : 0;
    let label = 'UNTESTED';
    let tone = 'neutral';
    if (fixtures.length) {
      if (fixtures.length >= 4 && winRate >= 0.8) { label = 'SURGING'; tone = 'positive'; }
      else if (winRate >= 0.6) { label = 'POSITIVE'; tone = 'positive'; }
      else if (winRate >= 0.4) { label = 'MIXED'; tone = 'warning'; }
      else { label = 'UNDER PRESSURE'; tone = 'danger'; }
    }
    return { fixtures, wins, label, tone };
  }


  function commandFeatureStatus(routeId) {
    if (routeId === 'mail') {
      const count = typeof clubUnreadMailCount === 'function' ? clubUnreadMailCount() : 0;
      return count ? `${count} UNREAD` : 'UP TO DATE';
    }
    if (routeId === 'calendar') {
      const count = typeof clubCalendarTodayEventCount === 'function' ? clubCalendarTodayEventCount() : 0;
      return count ? `${count} TODAY` : 'SCHEDULE';
    }
    if (routeId === 'training') {
      const points = Math.max(0, Number(careerState.unspentPoints) || 0) + (typeof totalUnspentPlayerPoints === 'function' ? totalUnspentPlayerPoints() : 0);
      if (points) return `${points} POINTS`;
      return careerState.trainingRecommendation ? 'RECOMMENDED' : 'PROGRAMMES';
    }
    if (routeId === 'transfers') {
      const count = typeof transferActivityCount === 'function' ? transferActivityCount() : 0;
      return count ? `${count} ACTIVE` : 'MARKET';
    }
    if (routeId === 'infrastructure') return typeof clubInfrastructureStatusLabel === 'function' ? clubInfrastructureStatusLabel() : 'FACILITIES';
    if (routeId === 'commercial') {
      const count = typeof sponsorshipPendingOffers === 'function' ? sponsorshipPendingOffers().length : 0;
      return count ? `${count} OFFER${count === 1 ? '' : 'S'}` : 'PARTNERS';
    }
    if (routeId === 'operators') {
      const injuries = typeof menuInjuryCount === 'function' ? menuInjuryCount() : 0;
      return injuries ? `${injuries} MEDICAL` : `${(careerState.squad || []).length} PLAYERS`;
    }
    if (routeId === 'loadout') {
      const free = typeof menuUnassignedWeaponCopyCount === 'function' ? menuUnassignedWeaponCopyCount() : 0;
      return free ? `${free} FREE` : 'ISSUE WEAPONS';
    }
    if (routeId === 'gold') return careerGoldCoins(careerState.goldCoins);
    if (routeId === 'barracks') return teamCredits(careerState.credits);
    if (routeId === 'store') return careerState.pendingStoreCrate ? 'CRATE READY' : `${CAREER_GOLD_COIN_CRATE_PRICE} GC`;
    if (routeId === 'league') return `${careerState.league?.userPlayed || 0}/38`;
    if (['team-hub', 'armoury-hub', 'supplies-hub', 'club-hub', 'play'].includes(routeId)) return 'OVERVIEW';
    return 'OPEN';
  }

  function commandFeatureAvailability(routeId) {
    if (!careerState.created && routeId !== 'play') return { state: 'locked', label: 'CREATE CLUB', reason: 'Create a club in the Command Centre first.' };
    const progressive = typeof progressiveRouteAccess === 'function' ? progressiveRouteAccess(routeId) : { locked: false };
    if (progressive.locked) return { state: 'locked', label: progressive.unlockLabel || 'LOCKED', reason: progressive.reason, progressive: true };
    if (routeId === 'play' || routeId === 'settings') return { state: 'ready', label: 'OPEN', reason: '' };
    const squad = Array.isArray(careerState.squad) ? careerState.squad : [];
    if (routeId === 'profile' && !(selectedTeamPlayerId || careerState.selectedPlayerId)) return { state: 'context', label: 'SELECT OPERATOR', reason: 'Open a squad operator or recruitment candidate first.' };
    if (routeId === 'loadout' && !squad.length) return { state: 'attention', label: 'EMPTY', reason: 'Recruit an operator before issuing weapons.' };
    if (routeId === 'reports' && !careerState.lastRound) return { state: 'attention', label: 'NO REPORT', reason: 'Complete a match to create an after-action report.' };
    if (routeId === 'tactics' && squad.length < TEAM_REQUIRED_STARTERS) return { state: 'attention', label: `${squad.length}/5 READY`, reason: 'Recruit five operators before final deployment.' };
    return { state: 'ready', label: 'OPEN', reason: '' };
  }

  function commandRecommendedRoutes() {
    const output = [];
    const add = (route, reason) => {
      const definition = typeof menuRouteDefinition === 'function' ? menuRouteDefinition(route) : null;
      const access = typeof progressiveRouteAccess === 'function' ? progressiveRouteAccess(route) : { locked: false };
      if (!definition || definition.contextOnly || access.locked || output.some(item => item.route === route)) return;
      output.push({ route, reason, label: definition.label, sectionLabel: definition.sectionLabel });
    };
    if (!careerState.created) {
      add('play', 'Create your club and begin the guided foundation setup.');
      return output;
    }
    const blockers = typeof clubEndDayBlockers === 'function' ? clubEndDayBlockers() : [];
    blockers.slice(0, 2).forEach(item => add(item.route || 'mail', item.detail || item.label || 'A management response is required.'));
    const squad = Array.isArray(careerState.squad) ? careerState.squad : [];
    if (squad.length < TEAM_REQUIRED_STARTERS) add('market', `${TEAM_REQUIRED_STARTERS - squad.length} more operator${TEAM_REQUIRED_STARTERS - squad.length === 1 ? '' : 's'} required for deployment.`);
    if (typeof menuInjuryCount === 'function' && menuInjuryCount()) add('training', 'Review recovery programmes and current medical alerts.');
    if (typeof transferActivityCount === 'function' && transferActivityCount()) add('transfers', 'An offer or negotiation has new activity.');
    if (typeof sponsorshipPendingOffers === 'function' && sponsorshipPendingOffers().length) add('commercial', 'Commercial proposals are waiting for review.');
    if (careerState.pendingStoreCrate) add('store', 'A purchased Field Crate is ready to open.');
    const points = Math.max(0, Number(careerState.unspentPoints) || 0) + (typeof totalUnspentPlayerPoints === 'function' ? totalUnspentPlayerPoints() : 0);
    if (points || careerState.trainingRecommendation) add('training', points ? `${points} development point${points === 1 ? '' : 's'} can be allocated.` : 'Manager feedback recommends a training programme.');
    if (typeof clubLeagueMatchDue === 'function' && clubLeagueMatchDue()) add('tactics', 'A league fixture is due; review and confirm the match plan.');
    if (typeof clubUnreadMailCount === 'function' && clubUnreadMailCount()) add('mail', 'Unread club messages may contain decisions or match information.');
    if (output.length < 3) add('calendar', 'Review the next fixture, deadline and scheduled financial event.');
    if (output.length < 3) add('operators', 'Check readiness, fatigue and the active-operator order.');
    return output.slice(0, 4);
  }

  let commandIndexSearchQuery = '';

  function applyCommandIndexFilter(rawQuery = commandIndexSearchQuery) {
    commandIndexSearchQuery = String(rawQuery || '').trim().toLowerCase();
    const root = menuContentEl?.querySelector('.command-directory-panel');
    if (!root) return { query: commandIndexSearchQuery, visible: 0, total: 0 };
    const routes = Array.from(root.querySelectorAll('.command-directory-route'));
    let visible = 0;
    for (const button of routes) {
      const haystack = String(button.dataset.commandSearch || '').toLowerCase();
      const matches = !commandIndexSearchQuery || haystack.includes(commandIndexSearchQuery);
      button.hidden = !matches;
      if (matches) visible++;
    }
    for (const group of root.querySelectorAll('.command-directory-group')) {
      const groupVisible = Array.from(group.querySelectorAll('.command-directory-route')).some(button => !button.hidden);
      group.hidden = !groupVisible;
      if (groupVisible && commandIndexSearchQuery) group.open = true;
    }
    const count = root.querySelector('[data-command-search-count]');
    if (count) count.textContent = commandIndexSearchQuery ? `${visible} OF ${routes.length} PAGES` : `${routes.length} PAGES`;
    const empty = root.querySelector('[data-command-search-empty]');
    if (empty) empty.hidden = visible > 0;
    const clear = root.querySelector('[data-command-search-clear]');
    if (clear) clear.hidden = !commandIndexSearchQuery;
    return { query: commandIndexSearchQuery, visible, total: routes.length };
  }

  function handleCommandIndexInput(event) {
    const input = event.target.closest?.('[data-command-search]');
    if (!input) return false;
    applyCommandIndexFilter(input.value);
    return true;
  }

  function handleCommandIndexClick(event) {
    const clear = event.target.closest?.('[data-command-search-clear]');
    if (!clear) return false;
    const input = menuContentEl?.querySelector('[data-command-search]');
    if (input) input.value = '';
    applyCommandIndexFilter('');
    input?.focus({ preventScroll: true });
    return true;
  }

  function renderCommandFeatureDirectory() {
    const topLevelRoutes = Object.values(menuSections || {}).flatMap(section => section.routes || []).filter(route => !route.contextOnly);
    const groups = Object.entries(menuSections || {}).map(([sectionId, section], groupIndex) => {
      const routes = (section.routes || []).filter(route => !route.contextOnly);
      return `<details class="command-directory-group" ${groupIndex === 0 ? 'open' : ''}><summary><span>${String(groupIndex + 1).padStart(2, '0')}</span><strong>${escapeCareerHtml(section.label)}</strong><small>${routes.length} PAGE${routes.length === 1 ? '' : 'S'}</small></summary><div>${routes.map(route => {
        const availability = commandFeatureAvailability(route.id);
        const search = `${section.label} ${route.label} ${route.hint} ${availability.reason || ''}`;
        return `<button class="command-directory-route ${escapeCareerHtml(availability.state)}" data-team-route="${escapeCareerHtml(route.id)}" data-command-search="${escapeCareerHtml(search)}" ${availability.state === 'locked' ? 'disabled' : ''}><span><strong>${escapeCareerHtml(route.label)}</strong><small>${escapeCareerHtml(route.hint)}</small>${availability.reason ? `<i>${escapeCareerHtml(availability.reason)}</i>` : ''}</span><em>${escapeCareerHtml(availability.state === 'ready' ? commandFeatureStatus(route.id) : availability.label)}</em></button>`;
      }).join('')}</div></details>`;
    }).join('');
    const guidance = typeof firstMatchGuidance === 'function' ? firstMatchGuidance() : null;
    const recommendations = guidance ? [] : commandRecommendedRoutes();
    const recent = typeof menuRecentRouteIds === 'function' ? menuRecentRouteIds(5) : [];
    const recentMarkup = recent.length ? `<section class="command-directory-recent"><span>RECENTLY VISITED</span><div>${recent.map(id => { const route = menuRouteDefinition(id); return `<button data-team-route="${escapeCareerHtml(id)}"><strong>${escapeCareerHtml(route?.label || id)}</strong><small>${escapeCareerHtml(route?.sectionLabel || '')}</small></button>`; }).join('')}</div></section>` : '';
    return `<section class="command-directory-panel"><div class="career-section-head"><div><span>COMMAND INDEX</span><strong>FIND ANY CLUB SYSTEM</strong></div><p>Search by feature or purpose, use the recommended shortcuts, or open a section below. Context-only player pages stay attached to the selected player instead of cluttering the main navigation.</p></div>
      <div class="command-directory-search"><label><span>SEARCH COMMAND HQ</span><input type="search" value="${escapeCareerHtml(commandIndexSearchQuery)}" placeholder="Try training, contracts, cashflow…" data-command-search autocomplete="off" /></label><button type="button" data-command-search-clear ${commandIndexSearchQuery ? '' : 'hidden'}>CLEAR</button><strong data-command-search-count>${topLevelRoutes.length} PAGES</strong></div>
      ${recommendations.length ? `<section class="command-directory-recommended"><span>RECOMMENDED NEXT</span><div>${recommendations.map((item, index) => `<button data-team-route="${escapeCareerHtml(item.route)}"><b>${String(index + 1).padStart(2, '0')}</b><span><strong>${escapeCareerHtml(item.label)}</strong><small>${escapeCareerHtml(item.reason)}</small></span><em>${escapeCareerHtml(item.sectionLabel)}</em></button>`).join('')}</div></section>` : ''}
      ${recentMarkup}
      <div class="command-directory-groups">${groups}</div>
      <div class="command-directory-empty" data-command-search-empty hidden><strong>NO MATCHING PAGE</strong><p>Try a broader word such as team, money, match, player or training.</p></div>
    </section>`;
  }

  // Build 12.230: line icons for the Operations Today strip. Inline SVG on the
  // same 24-unit grid and stroke convention the onboarding pills already use,
  // so this adds no asset and no new drawing authority. `currentColor` lets a
  // glyph inherit whichever tone colour its column carries.
  const COMMAND_TODAY_ICONS = Object.freeze({
    calendar: '<rect x="3.5" y="5" width="17" height="15"></rect><path d="M3.5 10h17M8 3.2v3.6M16 3.2v3.6"></path>',
    squad: '<circle cx="9" cy="8.5" r="3"></circle><path d="M3.5 19.5c.6-3.9 2.6-5.8 5.5-5.8s4.9 1.9 5.5 5.8"></path><path d="M16 6.4a2.8 2.8 0 0 1 0 5.4M17.4 19.5c-.3-2.4-1-4-2.2-4.9"></path>',
    mail: '<rect x="3" y="5.5" width="18" height="13"></rect><path d="M3 7l9 6.2L21 7"></path>',
    ledger: '<path d="M7 4.5h10a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1z"></path><path d="M9.5 3.2h5v2.6h-5z"></path><path d="M9 11h6M9 15h4"></path>',
    advance: '<path d="M4 5.5l7 6.5-7 6.5zM13 5.5l7 6.5-7 6.5z"></path>',
    clock: '<circle cx="12" cy="12" r="8.2"></circle><path d="M12 7.2V12l3.2 2"></path>',
    star: '<path d="M12 3.8l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 17.2 6.7 20l1.1-5.9-4.3-4.1 5.9-.8z"></path>',
    check: '<circle cx="12" cy="12" r="8.2"></circle><path d="M8.2 12.2l2.7 2.7 5-5.4"></path>',
    alert: '<path d="M12 3.6l9 15.8H3z"></path><path d="M12 9.6v4M12 16.4v.1"></path>'
  });

  function commandTodayIcon(name) {
    const paths = COMMAND_TODAY_ICONS[name] || COMMAND_TODAY_ICONS.calendar;
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths}</svg>`;
  }

  function teamCommandTodayTimeline(fixture, squad, loan, wageBill) {
    const blockers = typeof clubEndDayBlockers === 'function' ? clubEndDayBlockers() : [];
    const unread = typeof clubUnreadMailCount === 'function' ? clubUnreadMailCount() : 0;
    const importantUnread = (careerState.mail || []).filter(item => !item.read && item.important).length;
    const points = Math.max(0, Number(careerState.unspentPoints) || 0) + (typeof totalUnspentPlayerPoints === 'function' ? totalUnspentPlayerPoints() : 0);
    const planConfirmed = typeof clubMatchPlanConfirmed === 'function' ? clubMatchPlanConfirmed() : false;
    const matchToday = !fixture.complete && fixture.daysLabel === 'TODAY';
    const trainingAttention = squad.medical.length > 0 || squad.fatigue >= 58 || points > 0 || Boolean(careerState.trainingRecommendation);
    const financeCommitment = Math.max(0, Math.round(Number(wageBill) || 0)) + (loan.active ? Math.max(0, Math.round(Number(loan.due) || 0)) : 0);
    const firstBlocker = blockers[0] || null;
    // Build 12.233: sentence case, matching the headline directly above it.
    // `fixture.location` stays all-caps because the fixture card and the guided
    // flow render it as a data tag; here it would be the only shouted line in
    // the strip.
    const fixtureMatchday = Math.max(0, Number(fixture.fixture?.matchday) || 0);
    const fixtureVenue = fixture.home ? 'Home' : 'Away';
    return [
      {
        id: 'fixture', label: 'FIXTURE', icon: 'calendar',
        title: fixture.complete ? 'Season review due' : matchToday ? `${fixture.title} today` : `${fixture.title} in ${fixture.daysLabel.toLowerCase()}`,
        // Build 12.230: the location and the plan state are two separate facts
        // and were previously run together into one dot-joined sentence. Split
        // so the column reads as a heading with a status beneath it.
        detail: fixture.complete
          ? 'Review the final table and next-season state.'
          : fixtureMatchday ? `${fixtureVenue} · Matchday ${fixtureMatchday}` : fixtureVenue,
        note: fixture.complete ? '' : planConfirmed ? 'Plan confirmed' : 'Plan not confirmed',
        value: fixture.complete ? 'REVIEW' : fixture.daysLabel,
        valueIcon: fixture.complete ? 'check' : matchToday ? 'alert' : 'clock',
        tone: fixture.complete ? 'complete' : matchToday ? (planConfirmed ? 'urgent' : 'attention') : 'scheduled',
        route: fixture.complete ? 'league' : matchToday ? 'tactics' : 'calendar'
      },
      {
        id: 'training', label: 'SQUAD', icon: 'squad',
        title: trainingAttention ? 'Readiness needs attention' : 'Active five ready',
        detail: `${squad.readiness} readiness · ${squad.fatigue}% fatigue`,
        note: `${squad.medical.length} medical flag${squad.medical.length === 1 ? '' : 's'}`,
        value: trainingAttention ? (points ? `${points} PTS` : 'CHECK') : 'READY',
        valueIcon: trainingAttention ? (points ? 'star' : 'alert') : 'check',
        tone: trainingAttention ? 'attention' : 'complete',
        route: trainingAttention ? 'training' : 'operators'
      },
      {
        id: 'mail', label: 'INBOX', icon: 'mail',
        title: unread ? `${unread} unread club message${unread === 1 ? '' : 's'}` : 'Inbox clear',
        detail: importantUnread ? `${importantUnread} marked important.` : unread ? 'New information is available.' : 'No unread decisions or reports.',
        note: '',
        value: unread ? String(unread) : 'CLEAR',
        valueIcon: unread ? (importantUnread ? 'alert' : 'mail') : 'check',
        tone: importantUnread ? 'attention' : unread ? 'scheduled' : 'complete',
        route: 'mail'
      },
      {
        id: 'finance', label: 'COMMITMENTS', icon: 'ledger',
        title: financeCommitment ? `${teamCredits(financeCommitment)} scheduled` : 'No scheduled collection',
        detail: loan.active ? `${teamCredits(loan.due)} loan · ${teamCredits(wageBill)} payroll` : `${teamCredits(wageBill)} weekly payroll`,
        note: '',
        value: loan.active ? escapeCareerHtml(loan.dueLabel) : 'PAYROLL',
        valueIcon: loan.active ? 'calendar' : 'ledger',
        tone: loan.tone === 'danger' ? 'urgent' : loan.tone === 'warning' ? 'attention' : 'scheduled',
        route: 'barracks'
      },
      {
        id: 'day', label: 'END DAY', icon: 'advance',
        title: blockers.length ? `Calendar locked by ${blockers.length} response${blockers.length === 1 ? '' : 's'}` : 'Calendar ready to advance',
        detail: blockers.length ? 'Use MUST RESPOND above for the authoritative action list.' : 'No mandatory decisions remain today.',
        note: '',
        value: blockers.length ? `${blockers.length} LOCK` : 'READY',
        valueIcon: blockers.length ? 'alert' : 'check',
        tone: blockers.length ? 'urgent' : 'complete',
        route: firstBlocker?.route || 'calendar'
      }
    ];
  }

  function renderTeamOperationsDashboard(roundNumberValue, scoreText, liveBlue, liveRed, viewedBot, zone, pauseMenu) {
    const ready = careerSquadReady();
    const wageBill = typeof clubTotalWageBill === 'function' ? clubTotalWageBill() : teamSquadWageBill();
    const squad = teamCommandSquadSnapshot();
    const fixture = teamCommandFixtureSnapshot();
    const loan = teamCommandLoanSnapshot(wageBill);
    const objectives = teamCommandObjectives(fixture, squad, loan, wageBill);
    const actions = teamCommandRecommendedActions(fixture, squad, loan);
    const recent = teamCommandRecentResults();
    const topAction = actions[0];
    const firstGuide = typeof firstMatchGuidance === 'function' ? firstMatchGuidance() : null;
    const positionLabel = fixture.user?.played ? teamCommandPositionLabel(fixture.user.position) : '—';
    const fixtureAction = fixture.complete
      ? '<button class="primary" data-team-route="league">REVIEW FINAL TABLE</button>'
      : fixture.daysLabel === 'TODAY' && ready && typeof clubMatchPlanConfirmed === 'function' && clubMatchPlanConfirmed() && !pauseMenu
        ? '<button class="primary" data-league-action="play-league">START MATCHMAKING</button>'
        : `<button class="primary" data-team-route="${ready ? 'tactics' : 'market'}">${ready ? 'PREPARE MATCH' : 'BUILD SQUAD'}</button>`;
    const lineup = squad.starters.length
      ? squad.starters.map((player, index) => {
          const medical = typeof playerMedicalAvailability === 'function' ? playerMedicalAvailability(player) : { label: 'AVAILABLE', className: 'fit' };
          return `<button class="command-lineup-player ${medical.className !== 'fit' ? 'medical' : ''}" data-team-profile="${player.id}">
            <span>${String(index + 1).padStart(2, '0')}</span>
            <div><strong>${escapeCareerHtml(player.name)}</strong><small>${teamRoleById(player.role).name} · PRI ${escapeCareerHtml(careerPlayerPrimaryWeaponId(player) ? getCareerWeapon(careerPlayerPrimaryWeaponId(player)).name : 'NONE')} · SIDE ${escapeCareerHtml(getCareerWeapon(careerPlayerSidearmId(player)).name)}</small></div>
            <em>${teamReadinessScore(player)}</em>
            <b class="${medical.className}">${escapeCareerHtml(medical.label)}</b>
          </button>`;
        }).join('')
      : '<div class="command-empty-lineup"><strong>NO ACTIVE OPERATORS SELECTED</strong><p>Recruit operators to populate the matchday readiness view.</p><button class="primary" data-team-route="market">OPEN RECRUITMENT</button></div>';
    const tutorialMarkup = renderTeamTutorialPanel();
    const calendarMarkup = typeof renderClubCalendarStrip === 'function' ? renderClubCalendarStrip() : '';
    const todayTimeline = teamCommandTodayTimeline(fixture, squad, loan, wageBill);
    // Build 12.230: the date and the week/season counter are separate facts and
    // are now presented as such, split by a rule, instead of one dot-joined
    // run-on. `clubCurrentDateLabel(false)` remains the fallback when the parts
    // helper is unavailable.
    const todayDateParts = typeof clubCurrentDateParts === 'function' ? clubCurrentDateParts() : null;
    const todayDateLine = todayDateParts
      ? escapeCareerHtml(todayDateParts.fullDate)
      : typeof clubCurrentDateLabel === 'function' ? escapeCareerHtml(clubCurrentDateLabel(false)) : `WEEK ${careerState.week}`;
    const todayMetaLine = todayDateParts
      ? `WEEK ${escapeCareerHtml(String(todayDateParts.week))} · SEASON ${escapeCareerHtml(String(todayDateParts.season))}`
      : '';
    // Build 12.233: the header's second slot used to explain that the strip
    // below covered the fixture, squad, inbox, commitments and end-day state —
    // which is exactly what the five labelled columns underneath already say.
    // It now reports how many of those columns want a decision, which is the
    // one thing the header can add that the columns cannot show at a glance.
    const todayOutstanding = todayTimeline.filter(item => item.tone === 'urgent' || item.tone === 'attention');
    const todayPulseTone = todayOutstanding.length
      ? (todayOutstanding.some(item => item.tone === 'urgent') ? 'urgent' : 'attention')
      : 'complete';
    const todayPulseLabel = todayOutstanding.length
      ? `${todayOutstanding.length} OF ${todayTimeline.length} NEED ATTENTION`
      : `ALL ${todayTimeline.length} AREAS CLEAR`;
    const todayTimelineMarkup = `<section class="command-today-panel" aria-label="Today at the club">
      <header class="command-today-head">
        <div class="command-today-when">
          <span>TODAY AT THE CLUB</span>
          <div class="command-today-datum"><strong>${todayDateLine}</strong>${todayMetaLine ? `<em>${todayMetaLine}</em>` : ''}</div>
        </div>
        <div class="command-today-pulse ${todayPulseTone}">${escapeCareerHtml(todayPulseLabel)}</div>
      </header>
      <div class="command-today-grid">${todayTimeline.map(item => `<button class="command-today-item ${escapeCareerHtml(item.tone)}" data-team-route="${escapeCareerHtml(item.route)}" data-today-item="${escapeCareerHtml(item.id)}">
        <span class="command-today-label">${commandTodayIcon(item.icon)}<i>${escapeCareerHtml(item.label)}</i></span>
        <strong>${escapeCareerHtml(item.title)}</strong>
        <small>${escapeCareerHtml(item.detail)}${item.note ? `<u>${escapeCareerHtml(item.note)}</u>` : ''}</small>
        <b>${commandTodayIcon(item.valueIcon)}<i>${escapeCareerHtml(item.value)}</i></b>
      </button>`).join('')}</div>
    </section>`;
    const heroMarkup = `<section class="command-centre-hero ${pauseMenu ? 'live' : ''} ${firstGuide ? 'guided-journey' : ''}">
        <div>
          <span>${pauseMenu ? (matchSimulationPaused ? 'LIVE MATCH PAUSED' : 'LIVE MATCH RUNNING') : 'MANAGER COMMAND CENTRE'}</span>
          <h2>${teamNameLockup(careerState.name)}</h2>
          <p>${escapeCareerHtml(firstGuide ? 'Use the First Match Guide above as the single next-action path. The full club dashboard returns automatically when onboarding is complete.' : (topAction?.detail || 'Review the club position and choose the next management action.'))}</p>
          <div class="command-hero-meta"><b>${typeof clubCurrentDateLabel === 'function' ? escapeCareerHtml(clubCurrentDateLabel(true)) : `WEEK ${careerState.week}`}</b><b>${positionLabel} IN ${escapeCareerHtml(typeof leagueCompetitionName === 'function' ? leagueCompetitionName() : 'DIVISION')}</b><button class="command-currency-link cash" data-team-route="barracks">${teamCredits(careerState.credits)} CASH</button><button class="command-currency-link gold" data-team-route="gold">${careerGoldCoins(careerState.goldCoins)}</button></div>
        </div>
        ${firstGuide ? '' : `<aside class="${topAction?.priority || 'standard'}"><span>NEXT MANAGER ACTION</span><strong>${escapeCareerHtml(topAction?.label || 'REVIEW CLUB')}</strong><button ${topAction?.leagueAction ? `data-league-action="${escapeCareerHtml(topAction.leagueAction)}"` : `data-team-route="${escapeCareerHtml(topAction?.route || 'calendar')}"`}>${topAction?.leagueAction ? 'START MATCHMAKING' : `OPEN ${escapeCareerHtml((topAction?.route || 'calendar').replace('barracks', 'finances').toUpperCase())}`}</button></aside>`}
      </section>`;
    const progressMarkup = `${renderCareerXpProgress()}${typeof renderFoundationPath === 'function' ? renderFoundationPath() : ''}`;
    if (firstGuide) {
      // During the guided match step the full dashboard is hidden, so the
      // fixture card with the launch/wait action must render here or the
      // first match cannot be started from the guided path.
      const guidePlanConfirmed = typeof clubMatchPlanConfirmed === 'function' && clubMatchPlanConfirmed();
      const matchDue = fixture.daysLabel === 'TODAY';
      const guidedMatchMarkup = firstGuide.id === 'match' && !fixture.complete
        ? `<section class="command-fixture-card ${fixture.threatTone}" data-management-target-id="operations:matchday">
            <header><div><span>YOUR FIRST FIXTURE</span><strong>${escapeCareerHtml(fixture.title)}</strong><small>${escapeCareerHtml(fixture.location)} · ${escapeCareerHtml(fixture.dateLabel)}</small></div><b>${escapeCareerHtml(fixture.daysLabel)}</b></header>
            <footer><button data-team-route="tactics">REVIEW MATCH PLAN</button>${matchDue && ready && guidePlanConfirmed && !pauseMenu ? '<button class="primary" data-league-action="play-league">START MATCHMAKING</button>' : `<button class="primary" data-team-route="calendar">MATCH ${escapeCareerHtml(fixture.daysLabel)} · USE END DAY</button>`}</footer>
          </section>`
        : '';
      return `${tutorialMarkup}${heroMarkup}${guidedMatchMarkup}${progressMarkup}`;
    }
    const boardMarkup = typeof renderBoardExpectations === 'function' ? renderBoardExpectations(true) : '';
    return `${tutorialMarkup}${calendarMarkup}${todayTimelineMarkup}${boardMarkup}${heroMarkup}${progressMarkup}
      <div class="command-overview-grid">
        <section class="command-fixture-card ${fixture.threatTone}" data-management-target-id="operations:matchday">
          <header><div><span>NEXT FIXTURE</span><strong>${escapeCareerHtml(fixture.title)}</strong><small>${escapeCareerHtml(fixture.location)} · ${escapeCareerHtml(fixture.dateLabel)}</small></div><b>${escapeCareerHtml(fixture.daysLabel)}</b></header>
          <div class="command-fixture-body">
            <div class="command-opponent-rating"><span>OPPONENT</span><strong>${fixture.opponentRating || '—'}</strong>${typeof leagueStrengthStarsMarkup === 'function' && fixture.opponentStrength ? leagueStrengthStarsMarkup(fixture.opponentStrength.stars, `${fixture.opponent?.name || 'Opponent'} team strength`) : ''}<small>${escapeCareerHtml(fixture.opponent?.style || 'TACTICAL PROFILE PENDING')} · ${escapeCareerHtml(fixture.opponentStrength?.trend || 'STABLE')}</small></div>
            <div class="command-threat"><span>SUPPORTER EXPECTATION</span><strong>${escapeCareerHtml(fixture.expectation?.headline || fixture.threatLabel)}</strong><p>${escapeCareerHtml(fixture.expectation ? `${fixture.expectation.label} · ${fixture.expectation.winChance}% public win chance.` : fixture.threatDetail)}</p></div>
            <div class="command-club-rating"><span>YOUR FIVE</span><strong>${fixture.userRating || '—'}</strong><small>${ready ? 'SUBMITTED STARTING RATING' : 'INCOMPLETE LINE-UP'}</small></div>
          </div>
          <footer><button data-team-route="league">OPPONENT & TABLE</button>${fixtureAction}</footer>
        </section>
        <div class="command-status-stack">
          <section class="command-status-card squad ${squad.tone}">
            <header><span>SQUAD READINESS</span><strong>${squad.readiness}</strong></header>
            <div class="command-status-meter"><i style="width:${clamp(squad.readiness, 0, 100)}%"></i></div>
            <dl><div><dt>READY STARTERS</dt><dd>${squad.readyCount} / ${TEAM_REQUIRED_STARTERS}</dd></div><div><dt>AVG FATIGUE</dt><dd>${squad.fatigue}%</dd></div><div><dt>MEDICAL FLAGS</dt><dd>${squad.medical.length}</dd></div><div><dt>HAPPINESS</dt><dd>${squad.happiness}%</dd></div></dl>
            <button data-team-route="${squad.medical.length || squad.fatigue >= 58 ? 'training' : 'operators'}">${squad.medical.length || squad.fatigue >= 58 ? 'OPEN TRAINING & RECOVERY' : 'REVIEW SQUAD'}</button>
          </section>
          <section class="command-status-card finance ${loan.tone}">
            <header><span>FOUNDATION LOAN</span><strong>${loan.active ? teamCredits(loan.balance) : 'SETTLED'}</strong></header>
            <dl><div><dt>NEXT COLLECTION</dt><dd>${loan.active ? teamCredits(loan.due) : '—'}</dd></div><div><dt>DUE</dt><dd>${escapeCareerHtml(loan.dueLabel)}</dd></div><div><dt>WEEKLY PAYROLL</dt><dd>${teamCredits(wageBill)}</dd></div><div><dt>AFTER BOTH</dt><dd>${teamCredits(loan.reserveAfter)}</dd></div></dl>
            <button data-team-route="barracks">OPEN FINANCES</button>
          </section>
        </div>
      </div>
      <div class="command-planning-grid">
        <section class="command-objectives-panel">
          <div class="career-section-head compact"><div><span>ACTIVE CLUB OBJECTIVES</span><strong>WHAT SUCCESS LOOKS LIKE NOW</strong></div><p>These goals update automatically from the live club state.</p></div>
          <div class="command-objective-list">${objectives.map((objective, index) => `<button class="command-objective ${objective.tone}" data-team-route="${objective.route}"><span>${String(index + 1).padStart(2, '0')}</span><div><strong>${escapeCareerHtml(objective.label)}</strong><small>${escapeCareerHtml(objective.detail)}</small></div><b>${escapeCareerHtml(objective.value)}</b><em>${escapeCareerHtml(objective.action)}</em></button>`).join('')}</div>
        </section>
        <section class="command-actions-panel">
          <div class="career-section-head compact"><div><span>RECOMMENDED ACTIONS</span><strong>MANAGER PRIORITY QUEUE</strong></div><p>Urgent decisions and the strongest next steps appear first.</p></div>
          <div class="command-action-list">${actions.map((action, index) => `<button class="command-action ${action.priority}" ${action.leagueAction ? `data-league-action="${escapeCareerHtml(action.leagueAction)}"` : `data-team-route="${escapeCareerHtml(action.route)}"`}><span>${String(index + 1).padStart(2, '0')}</span><div><strong>${escapeCareerHtml(action.label)}</strong><small>${escapeCareerHtml(action.detail)}</small></div><em>${action.leagueAction ? 'DEPLOY' : 'OPEN'}</em></button>`).join('')}</div>
        </section>
      </div>
      <section class="command-form-panel ${recent.tone}">
        <header><div><span>RECENT LEAGUE FORM</span><strong>CLUB MOMENTUM · ${escapeCareerHtml(recent.label)}</strong></div><aside><b>${careerState.matchWins} W</b><b>${careerState.totalMatches - careerState.matchWins} L</b><small>ALL COMPLETED MATCHES</small></aside></header>
        <div class="command-result-strip">${recent.fixtures.length ? recent.fixtures.map(item => `<button class="command-result ${item.won ? 'win' : 'loss'}" data-team-route="league"><span>MD${item.fixture.matchday} · ${item.home ? 'H' : 'A'}</span><strong>${item.won ? 'W' : 'L'} ${item.scored}–${item.conceded}</strong><small>${escapeCareerHtml(item.opponent?.short || item.opponent?.name || 'OPP')}</small></button>`).join('') : '<div class="command-no-results"><strong>NO RESULTS YET</strong><span>The first completed league fixture will begin the momentum record.</span></div>'}</div>
      </section>
      ${renderCommandFeatureDirectory()}
      ${typeof renderMatchPreparationPanel === 'function' ? renderMatchPreparationPanel() : ''}
      <section class="command-lineup-panel">
        <div class="career-section-head compact"><div><span>ACTIVE FIVE OPERATOR SNAPSHOT</span><strong>READINESS & MEDICAL STATUS</strong></div><p>Select a player for the full profile, telemetry and loadout links.</p></div>
        <div class="command-lineup-list">${lineup}</div>
        <footer><button data-team-route="operators">MANAGE ACTIVE OPERATORS</button><button data-team-route="training">TRAINING & RECOVERY</button><button data-team-route="loadout">OPEN ARMOURY</button></footer>
      </section>`;
  }

  function renderTeamMarketTab() {
    noteTeamManagementRoute('market');
    const wageBill = typeof clubTotalWageBill === 'function' ? clubTotalWageBill() : teamSquadWageBill();
    const rows = careerState.market || [];
    return `${renderTeamTutorialPanel()}${typeof renderClubCalendarStrip === 'function' ? renderClubCalendarStrip() : ''}
      <div class="menu-hero career-hero team-market-hero">
        <div class="menu-hero-main menu-briefing-panel"><div class="menu-kicker">GLOBAL RECRUITMENT NETWORK</div><h2>AVAILABLE OPERATORS // WEEK ${careerState.week}</h2><p>Generated candidates have persistent biographies, roles, wages, transfer values, personality traits and prior-season records. Open a profile before committing funds.</p><div class="menu-pill-row"><span class="menu-pill">${rows.length} SCOUTED PLAYERS</span><span class="menu-pill">${teamCredits(careerState.credits)} BALANCE</span><span class="menu-pill">${teamCredits(wageBill)} / ${teamCredits(careerState.wageBudget)} WAGE USE</span><span class="menu-pill">SQUAD ${careerState.squad.length} / ${TEAM_MAX_SQUAD}</span></div></div>
        <div class="menu-hero-side"><div class="menu-kicker">CURRENT SEARCH LEVEL</div><div class="menu-side-operator">D${typeof leagueDivisionTier === 'function' ? leagueDivisionTier() : 3}</div><p>${typeof leagueDivisionPoolLabel === 'function' ? escapeCareerHtml(leagueDivisionPoolLabel()) : 'DIVISION 3 POOL'} · higher pools require promotion.</p></div>
      </div>
      <section class="club-pool-control player-pool"><label><span>PLAYER SEARCH POOL</span><select disabled>${typeof clubCurrentPoolOptions === 'function' ? clubCurrentPoolOptions('players') : '<option>DIVISION 3 POOL</option>'}</select></label><p>The recruitment network is restricted to the club's current division. Promotion unlocks the next pool.</p><button data-team-refresh-market ${careerState.credits < TEAM_MARKET_REFRESH_COST ? 'disabled' : ''}>REFRESH · ${teamCredits(TEAM_MARKET_REFRESH_COST)}</button></section>
      <section class="recruitment-candidate-zone" data-guide-target="recruitment-candidates">
      ${recruitmentRoleGuideMarkup()}
      <div class="team-market-table-head"><span>PLAYER / ROLE</span><span>ABILITY</span><span>POTENTIAL</span><span>FEE</span><span>WAGE</span><span>ACTION</span></div>
      <section class="team-market-list">${rows.map(player => {
        const overall = teamPlayerOverall(player);
        const canAfford = careerState.credits >= player.fee && wageBill + player.wage <= careerState.wageBudget && careerState.squad.length < TEAM_MAX_SQUAD;
        return `<article class="team-market-row">
          <button class="team-market-player" data-team-profile="${player.id}"><strong>${escapeCareerHtml(player.name)}</strong><small>${teamRoleById(player.role).name} · ${escapeCareerHtml(player.nationality)} · AGE ${player.age}</small></button>
          <span class="team-market-rating"><strong>${overall}</strong>${typeof clubStarsMarkup === 'function' ? clubStarsMarkup(clubPlayerAbilityStars(player), 'ABILITY') : ''}<small>FORM ${player.form.toFixed(1)} · ${player.fatigue}% FAT</small></span>
          <span><strong>${player.potential}</strong>${typeof clubStarsMarkup === 'function' ? clubStarsMarkup(clubPlayerPotentialStars(player), 'POTENTIAL', 'potential') : ''}<small>${teamPotentialLabel(player)}</small></span>
          <span><strong>${teamCredits(player.fee)}</strong><small>VALUE ${teamCredits(player.value)}</small></span>
          <span><strong>${teamCredits(player.wage)}</strong><small>PER WEEK</small></span>
          <span class="team-market-actions"><button data-team-profile="${player.id}">PROFILE</button><button class="primary" data-transfer-start="${player.id}" ${careerState.squad.length < TEAM_MAX_SQUAD ? '' : 'disabled'}>NEGOTIATE</button></span>
        </article>`;
      }).join('')}</section>
      </section>`;
  }

  function renderTeamSquadTab() {
    noteTeamManagementRoute('operators');
    const squad = typeof workflowSquadForRead === 'function' ? workflowSquadForRead('operators') : (careerState.squad || []);
    const starters = squad.slice(0, TEAM_REQUIRED_STARTERS);
    const reserves = squad.slice(TEAM_REQUIRED_STARTERS);
    const wageBill = typeof clubTotalWageBill === 'function' ? clubTotalWageBill() : teamSquadWageBill();
    return `${renderTeamTutorialPanel()}${typeof renderClubCalendarStrip === 'function' ? renderClubCalendarStrip() : ''}${typeof renderWorkflowDraftBar === 'function' ? renderWorkflowDraftBar('operators', 'ACTIVE OPERATOR ORDER', 'Move operators freely, then save once the deployment order is correct.') : ''}
      <div class="menu-hero career-hero team-squad-hero"><div class="menu-hero-main menu-briefing-panel"><div class="menu-kicker">FIRST-TEAM MANAGEMENT</div><h2>${teamNameLockup(careerState.name)}<span class="team-heading-suffix">SQUAD</span></h2><p>Reorder operators to control the active five-player line-up. The first five operators deploy in matches, while reserves provide rotation options for fatigue, form and tactical roles.</p><div class="menu-pill-row"><span class="menu-pill">${squad.length} / ${TEAM_MAX_SQUAD} CONTRACTED</span><span class="menu-pill">${starters.length} / ${TEAM_REQUIRED_STARTERS} STARTERS</span><span class="menu-pill">${reserves.length} / ${TEAM_MAX_SQUAD - TEAM_REQUIRED_STARTERS} RESERVES</span><span class="menu-pill">${teamCredits(wageBill)} PAYROLL</span><span class="menu-pill">${teamCredits(careerState.wageBudget - wageBill)} HEADROOM</span></div></div><div class="menu-hero-side"><div class="menu-kicker">LINE-UP STATUS</div><div class="menu-side-operator">${careerSquadReady() ? 'VALID' : 'INCOMPLETE'}</div><p>${careerSquadReady() ? 'Eligible for matchmaking.' : 'Five players required.'}</p></div></div>
      ${typeof renderSquadDynamicsPanel === 'function' ? renderSquadDynamicsPanel() : ''}
      <section class="team-lineup-panel team-starters-panel" data-management-target-id="operators:active-five"><div class="career-section-head"><div><span>DEPLOYMENT ORDER 1–5</span><strong>ACTIVE FIVE OPERATORS</strong></div><p>These operators deploy into the next match. Use Move Up / Move Down to change selection and order.</p></div><div class="team-squad-grid">${starters.length ? starters.map((player, index) => renderTeamPlayerMini(player, index, true)).join('') : '<div class="team-empty-state"><strong>EMPTY SQUAD</strong><p>Your club currently owns no player contracts.</p><button class="primary" data-team-route="market">OPEN RECRUITMENT</button></div>'}</div></section>
      <section class="team-lineup-panel team-reserves-panel"><div class="career-section-head"><div><span>ROTATION OPTIONS 6–8</span><strong>RESERVES</strong></div><p>Move a reserve upward to place them in the active five.</p></div><div class="team-squad-grid">${reserves.length ? reserves.map((player, reserveIndex) => renderTeamPlayerMini(player, reserveIndex + TEAM_REQUIRED_STARTERS, true)).join('') : '<div class="team-empty-state compact"><strong>NO RESERVES CONTRACTED</strong><p>Recruit up to three additional operators for rotation and tactical depth.</p><button data-team-route="market">BROWSE RECRUITMENT</button></div>'}</div></section>`;
  }

  function renderTeamPlayerVoice(player) {
    const reflection = playerReflection(player);
    const last = player.lastMatch;
    const matchContext = last
      ? `Recorded after week ${last.week} · ${last.competition === 'league' ? 'league' : 'exhibition'} ${last.won ? 'victory' : 'defeat'} ${last.result}${last.opponentName ? ` vs ${last.opponentName}` : ''}`
      : 'Current thoughts before a competitive appearance.';
    const insightMeta = last
      ? `${last.kills} K / ${last.deaths} D · ${Math.round((last.accuracy || 0) * 100)}% ACC · ${Number(last.rating || 0).toFixed(2)} RATING`
      : 'Comments become performance-specific after the first match.';
    return `<section class="team-player-voice-panel">
      <div class="career-section-head"><div><span>PLAYER COMMENT</span><strong>PRIVATE MATCH REFLECTION</strong></div><p>${escapeCareerHtml(matchContext)}</p></div>
      <div class="team-player-voice-grid">
        ${teamExpandableButtonMarkup({ className: 'team-player-voice-card', tone: 'personal', kicker: 'OWN PERFORMANCE', title: `${player.name} · OWN PERFORMANCE`, preview: `“${reflection.personal}”`, body: reflection.personal, footer: matchContext })}
        ${teamExpandableButtonMarkup({ className: 'team-player-voice-card', tone: 'team', kicker: 'TEAM PERFORMANCE', title: `${player.name} · TEAM PERFORMANCE`, preview: `“${reflection.team}”`, body: reflection.team, footer: matchContext })}
        <button type="button" class="team-expand-card team-player-voice-card insight" data-team-expand="1" data-expand-tone="insight" data-expand-kicker="MANAGER INSIGHT" data-expand-title="${escapeCareerHtml(`${player.name} · MANAGER INSIGHT`)}" data-expand-body="${escapeCareerHtml(reflection.insight)}" data-expand-footer="${escapeCareerHtml(insightMeta)}" data-expand-actions="${escapeCareerHtml(teamTrainingActionMarkup(player, reflection))}"><span>MANAGER INSIGHT</span><strong>${escapeCareerHtml(reflection.insight)}</strong><small>${escapeCareerHtml(insightMeta)}</small></button>
      </div>
    </section>`;
  }

  function renderTeamLastMatchBreakdown() {
    const players = (careerState.squad || []).filter(player => player.lastMatch).slice(0, TEAM_REQUIRED_STARTERS);
    if (!players.length) return '';
    return `<section class="team-match-breakdown"><div class="career-section-head"><div><span>PLAYER PERFORMANCE</span><strong>ACTIVE OPERATOR DEBRIEF</strong></div><p>Individual ratings, condition changes and comments from the latest fixture.</p></div><div class="team-match-breakdown-grid">${players.map(player => {
      const last = player.lastMatch;
      const reflection = playerReflection(player);
      const weaponUse = Math.max(0, Number(last.sidearmDraws) || 0) > 0 ? `${Math.max(0, Number(last.sidearmDraws) || 0)} SIDEARM DRAWS` : 'PRIMARY/SIDEARM PLAN HELD';
      const summaryMeta = `${last.kills} K / ${last.deaths} D · ${Math.round((last.accuracy || 0) * 100)}% ACC · ${weaponUse} · ${player.fatigue}% FATIGUE · +${last.playerXpAward || 0} PLAYER XP`;
      return `<article><button class="team-debrief-player-head" data-team-profile="${player.id}"><span>${escapeCareerHtml(player.name)}</span><strong>${Number(last.rating || 0).toFixed(2)}</strong></button><div><b>${last.kills} K / ${last.deaths} D</b><b>${Math.round((last.accuracy || 0) * 100)}% ACC</b><b>${escapeCareerHtml(weaponUse)}</b><b>${player.fatigue}% FATIGUE</b><b>+${last.playerXpAward || 0} PLAYER XP</b></div>${teamExpandableButtonMarkup({ className: 'team-debrief-note', tone: 'debrief', kicker: 'PLAYER REFLECTION', title: `${player.name} · ACTIVE OPERATOR DEBRIEF`, preview: `“${reflection.personal}”`, body: `${reflection.personal}

Manager insight: ${reflection.insight}`, footer: summaryMeta, meta: reflection.insight, actionsHtml: teamTrainingActionMarkup(player, reflection) })}</article>`;
    }).join('')}</div></section>`;
  }

  function handleTeamNoteModalAction(event) {
    if (typeof handleWorkflowModalAction === 'function' && handleWorkflowModalAction(event)) return true;
    if (typeof handleMatchdayPlanWarningAction === 'function' && handleMatchdayPlanWarningAction(event)) return true;
    if (typeof handleTransferModalAction === 'function' && handleTransferModalAction(event)) return true;
    const trainingAction = event.target.closest?.('[data-team-note-action="open-training"]');
    if (!trainingAction) return false;
    const playerId = String(trainingAction.dataset.playerId || '').trim();
    const focusId = String(trainingAction.dataset.trainingFocus || '').trim();
    const player = teamPlayerById(playerId);
    const focus = TRAINING_FOCUS_DEFS?.[focusId];
    if (!player || !focus) return false;

    // Do not render the current telemetry/report route while the modal is still
    // open. On iOS that intermediate render could preserve a stale dynamic
    // viewport height and leave the lower part of Command HQ black.
    if (typeof workflowStageTrainingFocus === 'function') workflowStageTrainingFocus(playerId, focusId, { render: false });
    else if (typeof setPlayerTrainingFocus === 'function') setPlayerTrainingFocus(playerId, focusId, { render: false });
    else player.trainingFocus = focusId;
    careerState.selectedPlayerId = playerId;
    careerState.trainingRecommendation = {
      playerId,
      focusId,
      label: String(focus.label || focusId),
      insight: String(trainingAction.dataset.trainingInsight || playerReflection(player)?.insight || ''),
      createdDay: Number(careerState.calendar?.absoluteDay) || 0,
      seen: false
    };
    selectedTeamPlayerId = playerId;
    saveCareerState();
    // Release the modal close button before hiding the overlay. iOS Safari can
    // otherwise retain a focus-driven visual viewport after the native control
    // disappears, leaving the newly rendered Training route at half height.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    closeTeamNoteModal({ restoreFocus: false });
    setMenuRoute('training');
    if (typeof stabiliseMenuViewportAfterRoute === 'function') stabiliseMenuViewportAfterRoute('training');
    showStatus(`${player.name.toUpperCase()} · ${String(focus.label).toUpperCase()} STAGED · SAVE CHANGES`);
    return true;
  }

  function renderTeamPlayerProfileTab() {
    noteTeamManagementRoute('profile');
    const player = teamPlayerById(selectedTeamPlayerId) || careerState.market[0] || careerState.squad[0] || null;
    if (!player) return `${renderTeamTutorialPanel()}<div class="team-empty-state"><strong>NO PLAYER SELECTED</strong><p>Open Recruitment and select a candidate.</p><button class="primary" data-team-route="market">OPEN MARKET</button></div>`;
    selectedTeamPlayerId = player.id;
    careerState.selectedPlayerId = player.id;
    const inSquad = careerState.squad.some(candidate => candidate.id === player.id);
    const overall = teamPlayerOverall(player);
    const role = teamRoleById(player.role);
    const secondary = teamRoleById(player.secondaryRole);
    const canRecruit = !inSquad && careerState.credits >= player.fee && (typeof clubTotalWageBill === 'function' ? clubTotalWageBill() : teamSquadWageBill()) + player.wage <= careerState.wageBudget && careerState.squad.length < TEAM_MAX_SQUAD;
    const critical = typeof playerCriticalProfile === 'function' ? playerCriticalProfile(player) : { chance: 0.05, bonusDamage: 0.50, multiplier: 1.50 };
    const headshot = typeof playerHeadshotProfile === 'function' ? playerHeadshotProfile(player) : { chance: 0.035, multiplier: 2.80 };
    const history = player.history.length ? player.history.map(item => `<div class="team-history-row"><span>${escapeCareerHtml(item.season)}</span><strong>${escapeCareerHtml(item.team)}</strong><span>${item.apps}</span><span>${item.kills}</span><span>${item.deaths}</span><span>${item.accuracy}%</span><span>${Number(item.rating).toFixed(2)}</span></div>`).join('') : '<div class="team-history-empty">No senior history recorded. This player is entering their first professional season.</div>';
    return `${renderTeamTutorialPanel()}
      ${inSquad ? renderTeamPlayerContextBar(player, 'profile') : '<div class="team-page-backbar"><button data-team-route="market">← BACK TO RECRUITMENT</button><span>RECRUITMENT DOSSIER</span></div>'}
      <div class="menu-hero career-hero team-profile-hero"><div class="menu-hero-main menu-briefing-panel"><div class="menu-kicker">PLAYER DOSSIER // ${inSquad ? 'CONTRACTED' : 'RECRUITMENT TARGET'}</div><h2>${escapeCareerHtml(player.name)} ${player.nickname ? `“${escapeCareerHtml(player.nickname)}”` : ''}</h2><p>${role.description}</p><div class="menu-pill-row"><span class="menu-pill">${role.name}</span><span class="menu-pill">SECONDARY ${secondary.name}</span><span class="menu-pill">${escapeCareerHtml(player.nationality)} · AGE ${player.age}</span><span class="menu-pill">${escapeCareerHtml(player.personality)}</span><span class="menu-pill">PLAYER LEVEL ${player.level || 1}</span><span class="menu-pill">${player.unspentPoints || 0} STAT POINTS</span></div></div><div class="menu-hero-side team-profile-rating"><div class="menu-kicker">CURRENT ABILITY</div><div class="menu-side-operator">${overall}</div><p>POTENTIAL ${player.potential} · ${teamPotentialLabel(player)}</p></div></div>
      ${!inSquad ? recruitmentProfileRoleGuideMarkup(role.id, secondary.id) : ''}
      ${typeof renderPlayerDevelopmentPanel === 'function' ? renderPlayerDevelopmentPanel(player, inSquad) : ''}
      ${inSquad && typeof renderPlayerTelemetryProfileSection === 'function' ? renderPlayerTelemetryProfileSection(player) : ''}
      ${inSquad && typeof renderPlayerDynamicsPanel === 'function' ? renderPlayerDynamicsPanel(player) : ''}
      ${inSquad ? teamPerformanceTraitsMarkup(player) : ''}
      <div class="team-profile-grid">
        <section class="team-profile-panel team-attribute-allocation-card" data-management-target-id="player:${escapeCareerHtml(player.id)}"><div class="career-section-head compact"><div><span>TECHNICAL PROFILE</span><strong>ATTRIBUTES</strong></div><p>Values directly affect autonomous combat.</p></div>${inSquad && typeof renderPlayerStatPointBanner === 'function' ? renderPlayerStatPointBanner(player) : ''}${renderTeamAttributeRows(player, inSquad)}${inSquad && typeof renderPlayerStatAllocationActions === 'function' ? renderPlayerStatAllocationActions(player) : ''}</section>
        <section class="team-profile-panel"><div class="career-section-head compact"><div><span>CONTRACT & VALUE</span><strong>FINANCIAL DATA</strong></div></div><div class="team-profile-facts"><div><span>TRANSFER FEE</span><strong>${teamCredits(player.fee)}</strong></div><div><span>ESTIMATED VALUE</span><strong>${teamCredits(player.value)}</strong></div><div><span>WEEKLY WAGE</span><strong>${teamCredits(player.wage)}</strong></div><div><span>CONTRACT</span><strong>${player.contractWeeks} WEEKS</strong></div><div><span>MORALE</span><strong>${player.morale}%</strong></div><div><span>HAPPINESS</span><strong>${player.happiness}% · ${teamHappinessLabel(player)}</strong></div><div><span>FATIGUE</span><strong>${player.fatigue}% · ${teamFatigueLabel(player)}</strong></div><div><span>CONDITION</span><strong>${teamCondition(player)}%</strong></div><div><span>MATCH SHARPNESS</span><strong>${player.matchSharpness}%</strong></div><div><span>READINESS</span><strong>${teamReadinessScore(player)} · ${teamReadinessLabel(player)}</strong></div><div><span>FORM</span><strong>${player.form.toFixed(1)} / 10</strong></div><div><span>EFFECTIVE HEADSHOT CHANCE</span><strong>${Math.round(headshot.chance * 100)}% · 4M CONTROLLED</strong></div><div><span>HEADSHOT DAMAGE</span><strong>${headshot.multiplier.toFixed(2)}× · CAN ALSO CRIT</strong></div><div><span>EFFECTIVE CRIT CHANCE</span><strong>${Math.round(critical.chance * 100)}%</strong></div><div><span>CRIT BONUS DAMAGE</span><strong>+${Math.round(critical.bonusDamage * 100)}% · ${critical.multiplier.toFixed(2)}× TOTAL</strong></div><div><span>TRANSFER INTEREST</span><strong>${escapeCareerHtml(player.transferInterest?.label || 'LIMITED INTEREST')}</strong></div><div><span>MONITORING CLUBS</span><strong>${player.transferInterest?.clubs?.length ? escapeCareerHtml(player.transferInterest.clubs.join(' · ')) : 'NONE RECORDED'}</strong></div><div><span>INJURY VULNERABILITY</span><strong>${player.injuryVulnerability}% · ${escapeCareerHtml(typeof playerVulnerabilityLabel === 'function' ? playerVulnerabilityLabel(player) : 'MODERATE')}</strong></div><div><span>CURRENT MEDICAL STATUS</span><strong>${escapeCareerHtml(typeof playerInjuryLabel === 'function' ? playerInjuryLabel(player) : 'FIT')}</strong></div><div><span>LAST MATCH RISK</span><strong>${Math.round((player.lastInjuryRisk || 0) * 100)}%</strong></div></div><div class="team-profile-actions ${inSquad ? 'contracted-actions' : ''}">${inSquad ? `<button class="primary" data-team-armoury="${player.id}">OPEN PLAYER LOADOUT</button><button data-training-player="${player.id}">OPEN TRAINING</button><button data-team-route="transfers">OPEN TRANSFER CENTRE</button>` : `<button class="primary" data-transfer-start="${player.id}">NEGOTIATE CONTRACT & FEE</button>`}</div></section>
        <section class="team-profile-panel"><div class="career-section-head compact"><div><span>SCOUTING NOTES</span><strong>TRAITS & PERSONALITY</strong></div></div><div class="team-trait-list">${player.traits.map(trait => `<span>${escapeCareerHtml(trait)}</span>`).join('')}</div><p class="team-role-note"><strong>${role.name}</strong> · ${role.description}</p><p class="team-role-note"><strong>WEAPON PREFERENCE</strong> · ${escapeCareerHtml(getCareerWeapon(player.preferredWeaponId).name)}</p></section>
        <section class="team-profile-panel"><div class="career-section-head compact"><div><span>CAREER & HONOURS</span><strong>PERFORMANCE RECORD</strong></div></div><div class="team-profile-facts"><div><span>MATCHES</span><strong>${player.career.matches}</strong></div><div><span>WINS</span><strong>${player.career.wins}</strong></div><div><span>KILLS</span><strong>${player.career.kills}</strong></div><div><span>DEATHS</span><strong>${player.career.deaths}</strong></div><div><span>HEADSHOTS</span><strong>${player.career.headshots || 0}</strong></div><div><span>CRITICAL HITS</span><strong>${player.career.criticalHits || 0}</strong></div><div><span>DOUBLE KILLS</span><strong>${player.career.doubleKills || 0}</strong></div><div><span>TRIPLE KILLS</span><strong>${player.career.tripleKills || 0}</strong></div><div><span>ULTRA KILLS</span><strong>${player.career.ultraKills || 0}</strong></div><div><span>RAMPAGES</span><strong>${player.career.rampages || 0}</strong></div><div><span>K / D</span><strong>${(player.career.kills / Math.max(1, player.career.deaths)).toFixed(2)}</strong></div><div><span>AVG RATING</span><strong>${player.career.rating ? player.career.rating.toFixed(2) : '—'}</strong></div></div></section>
      </div>
      ${inSquad && typeof renderWorldPressPlayerAccolades === 'function' ? renderWorldPressPlayerAccolades(player) : ''}
      ${renderTeamPlayerVoice(player)}
      <section class="team-history-panel"><div class="career-section-head"><div><span>COMPETITIVE HISTORY</span><strong>SEASON-BY-SEASON RECORD</strong></div><p>Generated background history remains attached to the player profile.</p></div><div class="team-history-head"><span>SEASON</span><span>TEAM</span><span>APPS</span><span>K</span><span>D</span><span>ACC</span><span>RATING</span></div>${history}</section>`;
  }

  function teamFinanceAnalyticsSnapshot() {
    const history = Array.isArray(careerState.financeHistory) ? careerState.financeHistory : [];
    const income = history.filter(item => Number(item.amount) > 0).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const outgoings = Math.abs(history.filter(item => Number(item.amount) < 0).reduce((sum, item) => sum + Number(item.amount || 0), 0));
    const net = income - outgoings;
    const categories = new Map();
    for (const item of history) {
      const type = String(item.type || 'OTHER').toUpperCase();
      const current = categories.get(type) || { type, income: 0, expense: 0, count: 0 };
      const amount = Number(item.amount) || 0;
      if (amount >= 0) current.income += amount;
      else current.expense += Math.abs(amount);
      current.count += 1;
      categories.set(type, current);
    }
    const weekMap = new Map();
    for (const item of history) {
      const week = Math.max(1, Number(item.week) || 1);
      const entry = weekMap.get(week) || { week, income: 0, expense: 0, net: 0 };
      const amount = Number(item.amount) || 0;
      if (amount >= 0) entry.income += amount;
      else entry.expense += Math.abs(amount);
      entry.net += amount;
      weekMap.set(week, entry);
    }
    const weeks = Array.from(weekMap.values()).sort((a, b) => a.week - b.week).slice(-10);
    const chronological = history.slice().reverse();
    const retainedDelta = chronological.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    let running = Math.round(Number(careerState.credits) || 0) - retainedDelta;
    const balancePoints = [{ label: 'OPEN', balance: running }];
    for (const item of chronological) {
      running += Number(item.amount) || 0;
      balancePoints.push({ label: `W${Math.max(1, Number(item.week) || 1)}`, balance: running });
    }
    return { history, income, outgoings, net, categories: Array.from(categories.values()), weeks, balancePoints };
  }

  function renderFinanceCashflowChart(weeks = []) {
    if (!weeks.length) return '<div class="finance-chart-empty">Transactions will appear here after the club begins operating.</div>';
    const maxValue = Math.max(1, ...weeks.flatMap(item => [item.income, item.expense]));
    return `<div class="finance-cashflow-chart" role="img" aria-label="Weekly club income and outgoing cash flow">
      ${weeks.map(item => `<article><div><i class="income" style="height:${Math.max(item.income ? 6 : 0, Math.round(item.income / maxValue * 100))}%" title="Week ${item.week} income ${teamCredits(item.income)}"></i><i class="expense" style="height:${Math.max(item.expense ? 6 : 0, Math.round(item.expense / maxValue * 100))}%" title="Week ${item.week} outgoings ${teamCredits(item.expense)}"></i></div><b>W${item.week}</b><small>${item.net >= 0 ? '+' : '−'}${clubCalendarCompactCredits(Math.abs(item.net))}</small></article>`).join('')}
    </div><div class="finance-chart-legend"><span class="income">INCOME</span><span class="expense">OUTGOINGS</span><small>NET VALUE SHOWN BELOW EACH WEEK</small></div>`;
  }

  function renderFinanceBalanceChart(points = []) {
    if (points.length < 2) return '<div class="finance-chart-empty">The running-balance graph needs at least one transaction.</div>';
    const sampled = points.length > 24 ? points.filter((_, index) => index === 0 || index === points.length - 1 || index % Math.ceil(points.length / 22) === 0) : points;
    const values = sampled.map(point => Number(point.balance) || 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(1, max - min);
    const width = 600;
    const height = 190;
    const padX = 24;
    const padY = 20;
    const coords = sampled.map((point, index) => {
      const x = padX + (sampled.length === 1 ? 0 : index / (sampled.length - 1)) * (width - padX * 2);
      const y = height - padY - ((Number(point.balance) || 0) - min) / span * (height - padY * 2);
      return { x, y, point };
    });
    const line = coords.map((coord, index) => `${index ? 'L' : 'M'}${coord.x.toFixed(1)} ${coord.y.toFixed(1)}`).join(' ');
    const area = `${line} L${coords[coords.length - 1].x.toFixed(1)} ${(height - padY).toFixed(1)} L${coords[0].x.toFixed(1)} ${(height - padY).toFixed(1)} Z`;
    return `<div class="finance-balance-chart"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Running retained-ledger cash balance"><line x1="${padX}" y1="${padY}" x2="${padX}" y2="${height-padY}" class="axis"></line><line x1="${padX}" y1="${height-padY}" x2="${width-padX}" y2="${height-padY}" class="axis"></line><path d="${area}" class="area"></path><path d="${line}" class="line"></path>${coords.map(coord => `<circle cx="${coord.x.toFixed(1)}" cy="${coord.y.toFixed(1)}" r="4"><title>${escapeCareerHtml(coord.point.label)} · ${teamCredits(coord.point.balance)}</title></circle>`).join('')}</svg><div><span>${teamCredits(max)} HIGH</span><strong>${teamCredits(careerState.credits)} CURRENT</strong><span>${teamCredits(min)} LOW</span></div></div>`;
  }

  function renderFinanceCategoryBreakdown(categories = [], mode = 'expense') {
    const key = mode === 'income' ? 'income' : 'expense';
    const items = categories.filter(item => item[key] > 0).sort((a, b) => b[key] - a[key]);
    const total = items.reduce((sum, item) => sum + item[key], 0);
    if (!items.length) return `<div class="finance-chart-empty">No ${mode === 'income' ? 'income' : 'outgoing'} categories have been recorded.</div>`;
    return `<div class="finance-category-list">${items.map(item => {
      const percentage = total ? Math.round(item[key] / total * 100) : 0;
      return `<article><header><span>${escapeCareerHtml(item.type)}</span><strong>${teamCredits(item[key])}</strong><small>${percentage}%</small></header><i><b style="width:${percentage}%"></b></i><p>${item.count} retained transaction${item.count === 1 ? '' : 's'}</p></article>`;
    }).join('')}</div>`;
  }

  function renderTeamFinancesTab() {
    const playerWageBill = teamSquadWageBill();
    const staffWageBill = typeof clubStaffWageBill === 'function' ? clubStaffWageBill() : 0;
    const wageBill = playerWageBill + staffWageBill;
    const remaining = careerState.wageBudget - wageBill;
    const analytics = teamFinanceAnalyticsSnapshot();
    const transactions = analytics.history.slice(0, 30).map(item => `<div class="team-finance-row ${item.amount >= 0 ? 'income' : 'expense'}"><span>WEEK ${Math.max(1, Number(item.week) || 1)}${Number.isFinite(Number(item.day)) ? ` · DAY ${Math.max(0, Number(item.day) || 0) + 1}` : ''}<small>${escapeCareerHtml(String(item.type || 'OTHER'))}</small></span><strong>${escapeCareerHtml(item.label)}</strong><em>${item.amount >= 0 ? '+' : '−'}${teamCredits(Math.abs(item.amount))}</em></div>`).join('') || '<div class="team-history-empty">No transactions recorded.</div>';
    const winRate = careerState.totalMatches ? Math.round(careerState.matchWins / careerState.totalMatches * 100) : 0;
    const loan = typeof clubFinanceLoanState === 'function' ? clubFinanceLoanState() : careerState.financeLoan;
    const loanActive = Boolean(loan?.active && Number(loan.balance) > 0);
    const loanProgress = loan ? Math.round((1 - Number(loan.balance || 0) / Math.max(1, Number(loan.totalRepayable) || 1)) * 100) : 100;
    const loanPanel = loan ? `<section class="club-loan-panel ${loan.arrears > 0 ? 'overdue' : ''}"><header><div><span>FOUNDATION FINANCE</span><strong>${escapeCareerHtml(loan.lender || 'BANK')} CLUB START-UP LOAN</strong></div><b>${loanActive ? `${loanProgress}% REPAID` : 'SETTLED'}</b></header><div class="club-loan-facts"><div><span>ORIGINAL ADVANCE</span><strong>${teamCredits(loan.principal)}</strong></div><div><span>TOTAL REPAYABLE</span><strong>${teamCredits(loan.totalRepayable)}</strong></div><div><span>OUTSTANDING</span><strong>${teamCredits(loan.balance)}</strong></div><div><span>INSTALMENT</span><strong>${teamCredits(loan.installment)} / ${loan.intervalWeeks} WEEKS</strong></div><div><span>NEXT PAYMENT</span><strong>${loanActive ? `WEEK ${loan.nextPaymentWeek}` : 'COMPLETE'}</strong></div><div><span>ARREARS</span><strong>${teamCredits(loan.arrears || 0)}</strong></div></div><i><b style="width:${clamp(loanProgress, 0, 100)}%"></b></i><p>${loanActive ? `The initial ${teamCredits(loan.principal)} club balance was advanced as a bank loan. Scheduled repayments are taken automatically when the calendar enters the due week.` : 'The foundation loan has been repaid in full.'}</p></section>` : '';
    const flowTotal = analytics.income + analytics.outgoings;
    const incomeShare = flowTotal ? Math.round(analytics.income / flowTotal * 100) : 50;
    return `${renderTeamTutorialPanel()}
      <div class="menu-hero career-hero team-finance-hero"><div class="menu-hero-main menu-briefing-panel"><div class="menu-kicker">CLUB ADMINISTRATION // CASH ACCOUNT</div><h2>${teamNameLockup(careerState.name)}<span class="team-heading-suffix">FINANCES</span></h2><p>Use the analytics below to understand where club cash is coming from, which commitments are consuming it and whether the retained transaction window is producing a surplus or deficit.</p><div class="menu-pill-row"><span class="menu-pill">WEEK ${careerState.week}</span><span class="menu-pill">REPUTATION ${careerState.reputation}</span><span class="menu-pill">${careerState.totalMatches} MATCHES</span><span class="menu-pill">${winRate}% WIN RATE</span></div></div><div class="menu-hero-side"><div class="menu-kicker">AVAILABLE CASH</div><div class="menu-side-operator">${teamCredits(careerState.credits)}</div><p>${remaining >= 0 ? `${teamCredits(remaining)} wage headroom` : `${teamCredits(Math.abs(remaining))} over budget`}</p></div></div>
      <div class="currency-account-switcher" aria-label="Currency accounts"><button class="active" data-team-route="barracks">CASH FINANCES</button><button data-team-route="gold">GOLD COIN ACCOUNT</button><button data-team-route="commercial">COMMERCIAL INCOME</button></div>
      <div class="menu-dashboard finance-summary-dashboard">${menuTile('CASH BALANCE', teamCredits(careerState.credits), 'AVAILABLE FOR FEES & COSTS')}${menuTile('RETAINED INCOME', teamCredits(analytics.income), `${analytics.history.filter(item => item.amount > 0).length} CREDIT ENTRIES`)}${menuTile('RETAINED OUTGOINGS', teamCredits(analytics.outgoings), `${analytics.history.filter(item => item.amount < 0).length} DEBIT ENTRIES`)}${menuTile('RETAINED NET', `${analytics.net >= 0 ? '+' : '−'}${teamCredits(Math.abs(analytics.net))}`, analytics.net >= 0 ? 'POSITIVE CASHFLOW' : 'NEGATIVE CASHFLOW')}</div>
      <section class="finance-analytics-overview">
        <article class="finance-net-card ${analytics.net >= 0 ? 'positive' : 'negative'}"><span>RETAINED LEDGER POSITION</span><strong>${analytics.net >= 0 ? '+' : '−'}${teamCredits(Math.abs(analytics.net))}</strong><p>The latest ${analytics.history.length} transactions contain ${teamCredits(analytics.income)} income and ${teamCredits(analytics.outgoings)} outgoings.</p><div class="finance-flow-ring" style="--income-angle:${incomeShare * 3.6}deg"><i></i><b>${incomeShare}%<small>INCOME SHARE</small></b></div></article>
        <article class="finance-chart-panel"><div class="career-section-head compact"><div><span>WEEKLY CASHFLOW</span><strong>INCOME VS OUTGOINGS</strong></div><p>Up to the latest ten weeks represented in the retained ledger.</p></div>${renderFinanceCashflowChart(analytics.weeks)}</article>
      </section>
      <section class="finance-chart-panel"><div class="career-section-head compact"><div><span>RUNNING CASH POSITION</span><strong>BALANCE MOVEMENT</strong></div><p>The opening point is inferred from the current balance and retained transaction window.</p></div>${renderFinanceBalanceChart(analytics.balancePoints)}</section>
      <div class="finance-breakdown-grid"><section class="finance-chart-panel"><div class="career-section-head compact"><div><span>INCOME MIX</span><strong>SOURCES OF CASH</strong></div><p>Match, transfer, sponsor and decision income are grouped by ledger type.</p></div>${renderFinanceCategoryBreakdown(analytics.categories, 'income')}</section><section class="finance-chart-panel"><div class="career-section-head compact"><div><span>OUTGOING MIX</span><strong>WHERE CASH IS SPENT</strong></div><p>Wages, transfers, staff, scouting, bonuses and loan collections are grouped here.</p></div>${renderFinanceCategoryBreakdown(analytics.categories, 'expense')}</section></div>
      ${loanPanel}
      <section class="team-finance-panel"><div class="career-section-head"><div><span>CASH LEDGER</span><strong>RECENT TRANSACTIONS</strong></div><p>The retained ledger stores the latest 80 entries. Most recent activity appears first.</p></div>${transactions}</section>`;
  }

  function handleTeamManagementClick(event) {
    const playerStep = event.target.closest('[data-team-player-step]');
    if (playerStep) {
      selectAdjacentTeamPlayer(Number(playerStep.dataset.teamPlayerStep) || 0, playerStep.dataset.teamPlayerRoute || menuTab);
      return true;
    }
    const expand = event.target.closest('[data-team-expand]');
    if (expand) {
      openTeamNoteModalFromTrigger(expand);
      return true;
    }
    const route = event.target.closest('[data-team-route]');
    if (route) {
      const targetRoute = route.dataset.teamRoute;
      const scrollTarget = route.dataset.teamScrollTarget || '';
      if (typeof collapseMobileFirstMatchGuideAfterAction === 'function') collapseMobileFirstMatchGuideAfterAction(route);
      if (scrollTarget === 'recruitment-candidates' && typeof recruitmentState === 'function') {
        const state = recruitmentState();
        if (state.view !== 'market') {
          state.view = 'market';
          saveCareerState();
        }
      }
      const routed = setMenuRoute(targetRoute);
      if (routed && scrollTarget && typeof scrollMenuGuideTargetIntoView === 'function') {
        scrollMenuGuideTargetIntoView(scrollTarget, targetRoute, { behavior: 'smooth' });
      }
      return true;
    }
    const telemetryPlayer = event.target.closest('[data-team-telemetry-player]');
    if (telemetryPlayer) {
      selectedTeamPlayerId = telemetryPlayer.dataset.teamTelemetryPlayer;
      careerState.selectedPlayerId = selectedTeamPlayerId;
      saveCareerState();
      setMenuRoute('profile');
      return true;
    }
    const armoury = event.target.closest('[data-team-armoury]');
    if (armoury) {
      selectCareerArmouryPlayer(armoury.dataset.teamArmoury, true);
      return true;
    }
    const profile = event.target.closest('[data-team-profile]');
    if (profile) {
      if (typeof collapseMobileFirstMatchGuideAfterAction === 'function') collapseMobileFirstMatchGuideAfterAction(profile);
      selectedTeamPlayerId = profile.dataset.teamProfile;
      careerState.selectedPlayerId = selectedTeamPlayerId;
      careerState.tutorial.profileViewed = true;
      saveCareerState();
      setMenuRoute('profile');
      return true;
    }
    const recruit = event.target.closest('[data-team-recruit]');
    if (recruit) {
      const result = recruitTeamPlayer(recruit.dataset.teamRecruit);
      if (result.ok) showStatus(`${result.player.name.toUpperCase()} SIGNED`);
      else showManagementBlocked('PLAYER COULD NOT BE SIGNED', result.reason || 'The recruitment action is currently unavailable.', { route: /credit|budget|wage/i.test(result.reason || '') ? 'barracks' : 'market', routeLabel: /credit|budget|wage/i.test(result.reason || '') ? 'OPEN FINANCES' : 'RETURN TO RECRUITMENT', returnFocus: recruit });
      return true;
    }
    const sell = event.target.closest('[data-team-sell]');
    if (sell) {
      const result = sellTeamPlayer(sell.dataset.teamSell);
      if (result.ok) { showStatus(`${result.player.name.toUpperCase()} SOLD`); setMenuRoute('operators'); }
      else showManagementBlocked('PLAYER SALE UNAVAILABLE', result.reason || 'The player cannot be sold at this time.', { returnFocus: sell });
      return true;
    }
    const move = event.target.closest('[data-team-move]');
    if (move) {
      moveTeamPlayer(move.dataset.playerId, Number(move.dataset.teamMove));
      return true;
    }
    const refreshMarket = event.target.closest('[data-team-refresh-market]');
    if (refreshMarket) {
      const refreshed = refreshTeamMarket();
      if (refreshed) showStatus('RECRUITMENT MARKET REFRESHED');
      else showManagementBlocked('MARKET REFRESH UNAVAILABLE', 'The club needs sufficient credits and cannot refresh recruitment during a live match.', { route: 'barracks', routeLabel: 'OPEN FINANCES', returnFocus: refreshMarket });
      return true;
    }
    return false;
  }

  ensureTeamManagementState();
