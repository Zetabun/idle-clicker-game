/*
 * Strikewatch source module: 55-opening-week.js
 * Purpose: Opening-week agenda, guided calendar access, next-event progression and day-change summaries.
 *
 * This module is presentation/workflow only. It does not change combat, recruitment balance,
 * save schema 19 or diagnostics schema 1.
 */

  const OPENING_WEEK_ADVANCE_LIMIT = 21;
  const OPENING_WEEK_TRAINING_MILESTONES = Object.freeze([25, 50, 75, 100]);
  let openingWeekAdvanceSummaryState = null;
  let openingWeekBatchAdvanceActive = false;

  function openingWeekTutorialDayRestriction() {
    if (!careerState.created || typeof firstMatchGuidance !== 'function') return null;
    const guide = firstMatchGuidance();
    if (!guide) return null;
    const days = typeof clubDaysUntilFixture === 'function' ? clubDaysUntilFixture() : null;
    const planConfirmed = typeof clubMatchPlanConfirmed === 'function' && clubMatchPlanConfirmed();
    const calendarNeeded = guide.id === 'match' && planConfirmed && Number(days) > 0;
    if (calendarNeeded) return null;
    return {
      active: true,
      id: guide.id,
      route: guide.route || 'play',
      label: guide.action || guide.label || 'CONTINUE THE FIRST MATCH GUIDE',
      title: 'END DAY IS NOT NEEDED YET',
      detail: `Complete the current First Match Guide objective first: ${guide.label}. The calendar unlocks automatically when advancing time becomes necessary.`
    };
  }

  const baseClubEndDayBlockersOpeningWeek = clubEndDayBlockers;
  clubEndDayBlockers = function clubEndDayBlockersOpeningWeek() {
    const blockers = baseClubEndDayBlockersOpeningWeek();
    const restriction = openingWeekTutorialDayRestriction();
    if (!restriction) return blockers;
    return [{
      id: `first-match-guide-${restriction.id}`,
      route: restriction.route,
      category: 'FIRST MATCH GUIDE',
      label: restriction.label,
      detail: restriction.detail,
      targetId: `guide:${restriction.id}`
    }, ...blockers];
  };

  function openingWeekCurrentOpponent() {
    const fixture = typeof leagueNextFixture === 'function' ? leagueNextFixture() : null;
    if (!fixture || typeof leagueClubById !== 'function' || typeof leagueFixtureOpponentId !== 'function') return null;
    return leagueClubById(leagueFixtureOpponentId(fixture));
  }

  function openingWeekOpponentDepth() {
    const opponent = openingWeekCurrentOpponent();
    const report = opponent && typeof oppositionReportForClub === 'function' ? oppositionReportForClub(opponent) : null;
    return clamp(Math.round(Number(report?.depth) || 0), 0, 100);
  }

  function openingWeekTrainingSnapshot() {
    const result = {};
    for (const player of careerState.squad || []) {
      const focus = String(player.trainingFocus || 'none');
      const progress = typeof playerTrainingProgress === 'function' ? playerTrainingProgress(player, focus) : Number(player.trainingProgress?.[focus]) || 0;
      result[player.id] = {
        id: player.id,
        name: player.name,
        focus,
        progress: Number(progress.toFixed(1)),
        stats: Object.fromEntries(Object.keys(CAREER_STAT_DEFS || {}).map(key => [key, Number(player.stats?.[key]) || 0]))
      };
    }
    return result;
  }

  function openingWeekAssignmentSignature() {
    return (careerState.recruitment?.assignments || [])
      .map(item => `${item.id}:${item.status}:${Math.max(0, Number(item.daysRemaining) || 0)}`)
      .sort()
      .join('|');
  }

  function openingWeekTransferSignature() {
    const state = typeof transferState === 'function' ? transferState() : null;
    const incoming = state?.activeIncoming ? `${state.activeIncoming.id}:${state.activeIncoming.status}` : 'none';
    const outgoing = (state?.outgoingOffers || []).map(item => `${item.id}:${item.status}`).sort().join('|');
    return `${incoming}::${outgoing}`;
  }

  function openingWeekClubSnapshot() {
    const starters = (careerState.squad || []).slice(0, TEAM_REQUIRED_STARTERS);
    const readiness = starters.length ? Math.round(starters.reduce((sum, player) => sum + teamReadinessScore(player), 0) / starters.length) : 0;
    const fatigue = starters.length ? Math.round(starters.reduce((sum, player) => sum + Math.max(0, Number(player.fatigue) || 0), 0) / starters.length) : 0;
    const medical = starters.filter(player => typeof playerInjuryActive === 'function' ? playerInjuryActive(player) : Boolean(player.injury?.active)).length;
    const suitability = typeof clubTacticalSuitabilityReport === 'function' ? clubTacticalSuitabilityReport() : null;
    const fixture = typeof teamCommandFixtureSnapshot === 'function' ? teamCommandFixtureSnapshot() : null;
    const reportDepth = openingWeekOpponentDepth();
    return {
      absoluteDay: Math.max(0, Number(careerState.calendar?.absoluteDay) || 0),
      date: typeof clubCurrentDateLabel === 'function' ? clubCurrentDateLabel(true) : `WEEK ${careerState.week}`,
      week: Math.max(1, Number(careerState.week) || 1),
      daysUntilFixture: typeof clubDaysUntilFixture === 'function' ? clubDaysUntilFixture() : null,
      credits: Math.round(Number(careerState.credits) || 0),
      readiness,
      fatigue,
      medical,
      lineupCount: starters.length,
      planFit: Math.round(Number(suitability?.overall) || 0),
      familiarity: Math.round(Number(suitability?.familiarity?.score) || 0),
      opponentDepth: reportDepth,
      winChance: Math.round(Number(fixture?.expectation?.winChance) || 0),
      training: openingWeekTrainingSnapshot(),
      blockers: (typeof clubEndDayBlockers === 'function' ? clubEndDayBlockers() : []).map(item => String(item.id || item.label)).sort(),
      unreadMailIds: (careerState.mail || []).filter(item => !item.read).map(item => String(item.id)).sort(),
      assignmentSignature: openingWeekAssignmentSignature(),
      transferSignature: openingWeekTransferSignature()
    };
  }

  function openingWeekMilestone(progress) {
    const value = Number(progress) || 0;
    let milestone = 0;
    for (const threshold of OPENING_WEEK_TRAINING_MILESTONES) if (value >= threshold) milestone = threshold;
    return milestone;
  }

  function openingWeekMeaningfulEvent(before, after) {
    const newBlockers = after.blockers.filter(id => !before.blockers.includes(id));
    if (newBlockers.length) return { type: 'decision', label: 'A MANAGEMENT DECISION REQUIRES ATTENTION', route: 'play' };
    if (after.daysUntilFixture === 0 && before.daysUntilFixture !== 0) return { type: 'fixture', label: 'THE NEXT LEAGUE FIXTURE IS READY', route: 'play' };
    if (after.medical < before.medical) return { type: 'medical', label: 'AN OPERATOR HAS BEEN CLEARED BY MEDICAL STAFF', route: 'training' };
    if (after.assignmentSignature !== before.assignmentSignature) return { type: 'scouting', label: 'A RECRUITMENT ASSIGNMENT HAS UPDATED', route: 'market' };
    if (after.transferSignature !== before.transferSignature) return { type: 'transfer', label: 'TRANSFER ACTIVITY HAS UPDATED', route: 'transfers' };
    if (Math.floor(after.opponentDepth / 20) > Math.floor(before.opponentDepth / 20)) return { type: 'opposition', label: 'OPPOSITION KNOWLEDGE REACHED A NEW LEVEL', route: 'league' };
    for (const [id, current] of Object.entries(after.training)) {
      const previous = before.training[id];
      if (!previous || current.focus === 'none') continue;
      const statImproved = Object.keys(current.stats).some(key => current.stats[key] > (previous.stats?.[key] || 0));
      if (statImproved) return { type: 'training', label: `${current.name.toUpperCase()} COMPLETED A TRAINING IMPROVEMENT`, route: 'training' };
      if (openingWeekMilestone(current.progress) > openingWeekMilestone(previous.progress)) return { type: 'training', label: `${current.name.toUpperCase()} REACHED A TRAINING MILESTONE`, route: 'training' };
    }
    return null;
  }

  function openingWeekSummaryRows(before, after) {
    const rows = [];
    const add = (label, value, detail, route, tone = 'neutral') => rows.push({ label, value, detail, route, tone });
    const readinessDelta = after.readiness - before.readiness;
    const fatigueDelta = after.fatigue - before.fatigue;
    const familiarityDelta = after.familiarity - before.familiarity;
    const depthDelta = after.opponentDepth - before.opponentDepth;
    if (readinessDelta) add('TEAM READINESS', `${before.readiness} → ${after.readiness}`, `${readinessDelta > 0 ? '+' : ''}${readinessDelta} across the active five.`, 'operators', readinessDelta > 0 ? 'positive' : 'warning');
    if (fatigueDelta) add('AVERAGE FATIGUE', `${before.fatigue}% → ${after.fatigue}%`, `${fatigueDelta < 0 ? Math.abs(fatigueDelta) + '% recovered' : '+' + fatigueDelta + '% fatigue'}.`, 'training', fatigueDelta < 0 ? 'positive' : 'warning');
    if (familiarityDelta) add('TACTICAL FAMILIARITY', `${before.familiarity} → ${after.familiarity}`, `${familiarityDelta > 0 ? '+' : ''}${familiarityDelta} plan familiarity.`, 'tactics', familiarityDelta > 0 ? 'positive' : 'neutral');
    if (depthDelta) add('OPPOSITION KNOWLEDGE', `${before.opponentDepth}% → ${after.opponentDepth}%`, `Scouting depth improved by ${depthDelta}%.`, 'league', 'positive');
    const trainingChanges = [];
    for (const [id, current] of Object.entries(after.training)) {
      const previous = before.training[id];
      if (!previous || current.focus === 'none') continue;
      const delta = current.progress - previous.progress;
      const statImproved = Object.keys(current.stats).find(key => current.stats[key] > (previous.stats?.[key] || 0));
      if (statImproved) trainingChanges.push(`${current.name}: ${CAREER_STAT_DEFS[statImproved]?.label || statImproved} improved`);
      else if (Math.abs(delta) >= 0.1) trainingChanges.push(`${current.name}: ${delta > 0 ? '+' : ''}${delta.toFixed(1)} training progress`);
    }
    if (trainingChanges.length) add('TRAINING', `${trainingChanges.length} UPDATE${trainingChanges.length === 1 ? '' : 'S'}`, trainingChanges.slice(0, 3).join(' · '), 'training', 'positive');
    const creditsDelta = after.credits - before.credits;
    if (creditsDelta) add('CLUB CASH', `${creditsDelta > 0 ? '+' : '−'}${teamCredits(Math.abs(creditsDelta))}`, creditsDelta > 0 ? 'Income was recorded while time advanced.' : 'Wages, repayments or other scheduled costs were processed.', 'barracks', creditsDelta > 0 ? 'positive' : 'warning');
    const newBlockers = after.blockers.filter(id => !before.blockers.includes(id));
    if (newBlockers.length) add('ACTION REQUIRED', `${newBlockers.length} ITEM${newBlockers.length === 1 ? '' : 'S'}`, 'Time progression stopped because a management response is now required.', 'play', 'urgent');
    if (!rows.length) add('CLUB STATUS', 'NO MAJOR CHANGE', 'Routine training, recovery and administration were processed.', 'calendar', 'neutral');
    return rows;
  }

  function openingWeekRecordAdvance(before, after, event = null, mode = 'day') {
    const days = Math.max(0, after.absoluteDay - before.absoluteDay);
    openingWeekAdvanceSummaryState = {
      mode,
      days,
      before,
      after,
      event,
      rows: openingWeekSummaryRows(before, after),
      createdAt: Date.now()
    };
    return openingWeekAdvanceSummaryState;
  }

  function openingWeekAdvanceToNextEvent() {
    const restriction = openingWeekTutorialDayRestriction();
    if (restriction) {
      if (typeof showManagementBlocked === 'function') showManagementBlocked(restriction.title, restriction.detail, { route: restriction.route, routeLabel: restriction.label });
      else showStatus(restriction.title);
      return false;
    }
    if (!careerState.created || appState === 'match' || menuContext === 'pause' || matchmakingState?.active) return false;
    const initialBlockers = typeof clubEndDayBlockers === 'function' ? clubEndDayBlockers() : [];
    if (initialBlockers.length) {
      if (typeof showManagementBlocked === 'function') showManagementBlocked('CALENDAR ADVANCE BLOCKED', initialBlockers[0].detail || initialBlockers[0].label, { route: initialBlockers[0].route || 'play', routeLabel: 'OPEN REQUIRED ACTION' });
      return false;
    }
    const before = openingWeekClubSnapshot();
    let previous = before;
    let event = null;
    let advanced = 0;
    openingWeekBatchAdvanceActive = true;
    try {
      while (advanced < OPENING_WEEK_ADVANCE_LIMIT) {
        if (typeof clubLeagueMatchDue === 'function' && clubLeagueMatchDue()) {
          event = { type: 'fixture', label: 'THE NEXT LEAGUE FIXTURE IS READY', route: 'play' };
          break;
        }
        const ok = advanceCareerDay();
        if (!ok) break;
        advanced++;
        const current = openingWeekClubSnapshot();
        event = openingWeekMeaningfulEvent(previous, current);
        previous = current;
        if (event) break;
      }
    } finally {
      openingWeekBatchAdvanceActive = false;
    }
    const after = openingWeekClubSnapshot();
    if (!advanced) return false;
    if (!event) event = { type: 'horizon', label: 'PLANNING HORIZON REACHED', route: 'calendar' };
    openingWeekRecordAdvance(before, after, event, 'event');
    updateMenuUI();
    showStatus(`${advanced} DAY${advanced === 1 ? '' : 'S'} ADVANCED · ${event.label}`);
    return true;
  }

  const baseAdvanceCareerDayOpeningWeek = advanceCareerDay;
  advanceCareerDay = function advanceCareerDayOpeningWeek() {
    const restriction = openingWeekTutorialDayRestriction();
    if (restriction) {
      if (typeof showManagementBlocked === 'function') showManagementBlocked(restriction.title, restriction.detail, { route: restriction.route, routeLabel: restriction.label });
      else showStatus(restriction.title);
      return false;
    }
    const before = openingWeekClubSnapshot();
    const ok = baseAdvanceCareerDayOpeningWeek();
    if (!ok) return false;
    const after = openingWeekClubSnapshot();
    if (!openingWeekBatchAdvanceActive) {
      openingWeekRecordAdvance(before, after, openingWeekMeaningfulEvent(before, after), 'day');
      updateMenuUI();
    }
    return true;
  };

  const baseClubCanEndDayOpeningWeek = clubCanEndDay;
  clubCanEndDay = function clubCanEndDayOpeningWeek() {
    return !openingWeekTutorialDayRestriction() && baseClubCanEndDayOpeningWeek();
  };

  function openingWeekPreparationChecks() {
    const starters = (careerState.squad || []).slice(0, TEAM_REQUIRED_STARTERS);
    const medicallyAvailable = starters.filter(player => !(typeof playerInjuryActive === 'function' ? playerInjuryActive(player) : Boolean(player.injury?.active))).length;
    const trainingActive = starters.filter(player => player.trainingFocus && player.trainingFocus !== 'none').length;
    const opponentDepth = openingWeekOpponentDepth();
    const planConfirmed = typeof clubMatchPlanConfirmed === 'function' && clubMatchPlanConfirmed();
    const rangeWarning = typeof clubWeaponRangeCompatibility === 'function' ? clubWeaponRangeCompatibility() : null;
    return [
      { label: 'Active Five selected', complete: starters.length >= TEAM_REQUIRED_STARTERS, route: 'operators', detail: `${starters.length} / ${TEAM_REQUIRED_STARTERS} places filled` },
      { label: 'Operators medically available', complete: medicallyAvailable >= TEAM_REQUIRED_STARTERS, route: 'training', detail: `${medicallyAvailable} / ${TEAM_REQUIRED_STARTERS} cleared` },
      { label: 'Training programmes active', complete: starters.length >= TEAM_REQUIRED_STARTERS && trainingActive >= TEAM_REQUIRED_STARTERS, route: 'training', detail: `${trainingActive} / ${TEAM_REQUIRED_STARTERS} assigned` },
      { label: 'Opposition partially scouted', complete: opponentDepth >= 40, route: 'league', detail: `${opponentDepth}% report depth` },
      { label: 'Tactical plan confirmed', complete: planConfirmed, route: 'tactics', detail: planConfirmed ? 'Plan locked' : 'Confirmation required' },
      { label: 'Weapons suit selected range', complete: starters.length >= TEAM_REQUIRED_STARTERS && !rangeWarning, route: 'loadout', detail: starters.length < TEAM_REQUIRED_STARTERS ? 'Complete the Active Five first' : rangeWarning ? rangeWarning.title : 'No major range conflict' }
    ];
  }

  function openingWeekAgendaGroups() {
    const blockers = typeof clubEndDayBlockers === 'function' ? clubEndDayBlockers() : [];
    const starters = (careerState.squad || []).slice(0, TEAM_REQUIRED_STARTERS);
    const trainingActive = starters.filter(player => player.trainingFocus && player.trainingFocus !== 'none').length;
    const medical = starters.filter(player => typeof playerInjuryActive === 'function' ? playerInjuryActive(player) : Boolean(player.injury?.active)).length;
    const reportDepth = openingWeekOpponentDepth();
    const planConfirmed = typeof clubMatchPlanConfirmed === 'function' && clubMatchPlanConfirmed();
    const days = typeof clubDaysUntilFixture === 'function' ? clubDaysUntilFixture() : null;
    const groups = { required: [], recommended: [], optional: [] };
    const add = (group, label, detail, route, tone = 'standard') => groups[group].push({ label, detail, route, tone });
    for (const blocker of blockers.slice(0, 4)) add('required', blocker.label, blocker.detail, blocker.route || 'play', 'urgent');
    if (starters.length < TEAM_REQUIRED_STARTERS) add('required', 'COMPLETE THE ACTIVE FIVE', `${TEAM_REQUIRED_STARTERS - starters.length} more operator${TEAM_REQUIRED_STARTERS - starters.length === 1 ? '' : 's'} required before deployment.`, 'market', 'urgent');
    if (days === 0 && !blockers.some(item => item.id === 'matchday')) add('required', 'PLAY TODAY\'S LEAGUE FIXTURE', 'The scheduled match is due before the club calendar can continue.', 'play', 'urgent');
    if (!trainingActive && starters.length) add('recommended', 'SET TRAINING PROGRAMMES', 'Daily development only progresses for operators with an active programme.', 'training', 'important');
    else if (trainingActive < starters.length) add('recommended', 'COMPLETE TRAINING ASSIGNMENTS', `${starters.length - trainingActive} active operator${starters.length - trainingActive === 1 ? '' : 's'} still lack a programme.`, 'training', 'important');
    if (medical) add('recommended', 'REVIEW FATIGUE & MEDICAL STATUS', `${medical} active operator${medical === 1 ? '' : 's'} carries a medical flag.`, 'training', 'important');
    if (!planConfirmed && starters.length >= TEAM_REQUIRED_STARTERS) add('recommended', 'CONFIRM THE MATCH PLAN', 'Lock the active five, roles, approach, range and priority before matchmaking.', 'tactics', 'important');
    if (reportDepth < 40) add('recommended', 'IMPROVE OPPOSITION KNOWLEDGE', `Current report depth is ${reportDepth}%. Employ or review opposition scouting.`, 'league', 'standard');
    add('optional', 'EXPLORE TRANSFERS', 'Review market opportunities and outgoing interest without delaying the current plan.', 'transfers');
    add('optional', 'REVIEW CLUB FINANCES', 'Check payroll, the foundation loan and projected cash reserves.', 'barracks');
    add('optional', 'BUILD THE BACKROOM TEAM', 'Assistant and opposition-scout appointments can improve weekly planning.', 'staff');
    return groups;
  }

  function openingWeekAdvanceSummaryMarkup() {
    const summary = openingWeekAdvanceSummaryState;
    if (!summary || !summary.days) return '';
    return `<section class="opening-week-change-summary"><header><div><span>${summary.mode === 'event' ? 'CALENDAR ADVANCE COMPLETE' : 'DAY COMPLETE'}</span><strong>${summary.days} DAY${summary.days === 1 ? '' : 'S'} ADVANCED</strong><small>${escapeCareerHtml(summary.before.date)} → ${escapeCareerHtml(summary.after.date)}${summary.event ? ` · ${escapeCareerHtml(summary.event.label)}` : ''}</small></div><button type="button" data-opening-week-dismiss-summary aria-label="Dismiss day summary">×</button></header><div>${summary.rows.map(row => `<button class="${escapeCareerHtml(row.tone)}" data-team-route="${escapeCareerHtml(row.route)}"><span>${escapeCareerHtml(row.label)}</span><strong>${escapeCareerHtml(row.value)}</strong><small>${escapeCareerHtml(row.detail)}</small></button>`).join('')}</div></section>`;
  }

  function openingWeekAgendaColumn(title, subtitle, items, className) {
    return `<section class="opening-week-agenda-column ${className}"><header><span>${escapeCareerHtml(subtitle)}</span><strong>${escapeCareerHtml(title)}</strong><b>${items.length}</b></header><div>${items.length ? items.map((item, index) => `<button class="${escapeCareerHtml(item.tone)}" data-team-route="${escapeCareerHtml(item.route)}"><i>${String(index + 1).padStart(2, '0')}</i><span><strong>${escapeCareerHtml(item.label)}</strong><small>${escapeCareerHtml(item.detail)}</small></span><em>OPEN</em></button>`).join('') : '<p>Nothing currently requires attention.</p>'}</div></section>`;
  }

  function openingWeekAgendaMarkup() {
    const groups = openingWeekAgendaGroups();
    const checks = openingWeekPreparationChecks();
    const complete = checks.filter(item => item.complete).length;
    const restriction = openingWeekTutorialDayRestriction();
    const days = typeof clubDaysUntilFixture === 'function' ? clubDaysUntilFixture() : null;
    return `${openingWeekAdvanceSummaryMarkup()}<section class="opening-week-command"><header><div><span>CLUB DAILY AGENDA</span><strong>${days === null ? 'SEASON TRANSITION' : days === 0 ? 'MATCHDAY' : `${days} DAY${days === 1 ? '' : 'S'} TO NEXT FIXTURE`}</strong><p>Required actions block progression. Recommended preparation improves readiness. Optional activity can be explored without losing the main thread.</p></div><div class="opening-week-advance-actions"><button type="button" data-team-route="calendar">OPEN CALENDAR</button><button type="button" class="primary" data-opening-week-advance ${restriction || groups.required.length ? 'disabled' : ''}>${restriction ? 'FOLLOW FIRST MATCH GUIDE' : groups.required.length ? 'RESOLVE REQUIRED ACTIONS' : 'ADVANCE TO NEXT EVENT'}</button></div></header><div class="opening-week-agenda-grid">${openingWeekAgendaColumn('REQUIRED BEFORE PROGRESSION', 'MUST RESPOND', groups.required, 'required')}${openingWeekAgendaColumn('RECOMMENDED PREPARATION', 'BEST NEXT STEPS', groups.recommended, 'recommended')}${openingWeekAgendaColumn('OPTIONAL CLUB ACTIVITY', 'EXPLORE WHEN READY', groups.optional, 'optional')}</div><section class="opening-week-preparation"><header><div><span>FIXTURE PREPARATION</span><strong>MATCH READINESS · ${complete} / ${checks.length}</strong><small>Advice only: deployment remains possible when the fixture is due, but unresolved weaknesses carry risk.</small></div><b>${Math.round(complete / checks.length * 100)}%</b></header><i><b style="width:${Math.round(complete / checks.length * 100)}%"></b></i><div>${checks.map(item => `<button class="${item.complete ? 'complete' : 'warning'}" data-team-route="${escapeCareerHtml(item.route)}"><span>${item.complete ? '✓' : '!'}</span><strong>${escapeCareerHtml(item.label)}</strong><small>${escapeCareerHtml(item.detail)}</small></button>`).join('')}</div></section></section>`;
  }

  const baseRenderFoundationPathOpeningWeek = renderFoundationPath;
  renderFoundationPath = function renderOpeningWeekFoundationPath() {
    if (!careerState.created) return '';
    if (typeof firstMatchGuidance === 'function' && firstMatchGuidance()) return '';
    return openingWeekAgendaMarkup();
  };

  const baseHandleTeamManagementClickOpeningWeek = handleTeamManagementClick;
  handleTeamManagementClick = function handleTeamManagementClickOpeningWeek(event) {
    const advance = event.target.closest?.('[data-opening-week-advance]');
    if (advance) return openingWeekAdvanceToNextEvent();
    const dismiss = event.target.closest?.('[data-opening-week-dismiss-summary]');
    if (dismiss) {
      openingWeekAdvanceSummaryState = null;
      updateMenuUI();
      return true;
    }
    return baseHandleTeamManagementClickOpeningWeek(event);
  };

  function openingWeekFlowForTest() {
    const restriction = openingWeekTutorialDayRestriction();
    const checks = openingWeekPreparationChecks();
    const groups = openingWeekAgendaGroups();
    const blockers = typeof clubEndDayBlockers === 'function' ? clubEndDayBlockers() : [];
    const restrictionRepresented = !restriction || blockers.some(item =>
      item.id === `first-match-guide-${restriction.id}` && item.detail === restriction.detail);
    const markup = openingWeekAgendaMarkup();
    return {
      ok: checks.length === 6 && restrictionRepresented && /ADVANCE TO NEXT EVENT|RESOLVE REQUIRED ACTIONS|FOLLOW FIRST MATCH GUIDE/.test(markup) && /REQUIRED BEFORE PROGRESSION/.test(markup) && /MATCH READINESS/.test(markup),
      restriction,
      restrictionRepresented,
      blockers: blockers.map(item => ({ ...item })),
      checks,
      groupCounts: Object.fromEntries(Object.entries(groups).map(([key, value]) => [key, value.length])),
      snapshot: openingWeekClubSnapshot(),
      summary: openingWeekAdvanceSummaryState ? { ...openingWeekAdvanceSummaryState, rows: openingWeekAdvanceSummaryState.rows.map(item => ({ ...item })) } : null
    };
  }
