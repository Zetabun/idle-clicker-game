/*
 * Strikewatch source module: 39-calendar-finance.js
 * Purpose: Foundation loan repayments, contract-expiry notices and the full club calendar route.
 *
 * This file shares the application scope with the other source fragments.
 */

  const CLUB_CALENDAR_VISIBLE_WEEKS = 6;
  const CLUB_CALENDAR_EVENT_LIMIT = 3;
  const CLUB_CALENDAR_AGENDA_DAYS = 84;
  let clubCalendarViewOffset = 0;

  function clubFinanceLoanState() {
    careerState.financeLoan = typeof normaliseFinanceLoan === 'function'
      ? normaliseFinanceLoan(careerState.financeLoan, Boolean(careerState.created), Math.max(1, Number(careerState.week) || 1))
      : (careerState.financeLoan || null);
    return careerState.financeLoan;
  }

  function clubEnsureFoundationLoanNotice() {
    if (!careerState.created) return false;
    const loan = clubFinanceLoanState();
    if (!loan || loan.noticeSent) return false;
    const migrationCopy = loan.migrated
      ? 'The original foundation balance has now been formalised as the club start-up loan. Your first repayment has been scheduled four weeks from this migration.'
      : `The club's opening ${teamCredits(loan.principal)} balance was advanced by ${loan.lender}.`;
    clubAddMail(
      'Foundation loan terms confirmed',
      `${migrationCopy} The total repayable amount is ${teamCredits(loan.totalRepayable)}, collected in ${loan.paymentCount} instalments of ${teamCredits(loan.installment)} every ${loan.intervalWeeks} weeks. The first payment is due in Week ${loan.nextPaymentWeek}. Full terms are available in Club Finances and all due dates are shown in the Calendar.`,
      'FINANCE',
      true,
      'barracks'
    );
    loan.noticeSent = true;
    saveCareerState();
    return true;
  }

  function clubProcessFoundationLoan() {
    if (!careerState.created) return [];
    const loan = clubFinanceLoanState();
    if (!loan?.active || loan.balance <= 0) return [];
    const currentWeek = Math.max(1, Math.round(Number(careerState.week) || 1));
    const results = [];
    let safety = 0;
    while (loan.active && loan.balance > 0 && loan.nextPaymentWeek <= currentWeek && safety++ < 24) {
      const scheduled = Math.min(loan.installment, loan.balance);
      const due = Math.min(loan.balance, scheduled + Math.max(0, Number(loan.arrears) || 0));
      const available = Math.max(0, Math.round(Number(careerState.credits) || 0));
      const paid = Math.min(available, due);
      if (paid > 0) {
        careerState.credits -= paid;
        loan.balance = Math.max(0, loan.balance - paid);
        teamFinanceTransaction('LOAN', -paid, `Week ${currentWeek} foundation loan repayment`);
      }
      loan.arrears = Math.max(0, due - paid);
      loan.paymentsProcessed = Math.max(0, Number(loan.paymentsProcessed) || 0) + 1;
      loan.lastPaymentWeek = currentWeek;
      loan.nextPaymentWeek += Math.max(1, Number(loan.intervalWeeks) || 4);
      if (paid < due) {
        careerState.reputation = clamp((Number(careerState.reputation) || 0) - 1, 0, 100);
        clubAddMail(
          'Foundation loan repayment incomplete',
          `${loan.lender} attempted to collect ${teamCredits(due)} in Week ${currentWeek}. The club paid ${teamCredits(paid)}, leaving ${teamCredits(loan.arrears)} in arrears. The outstanding amount will be added to the next scheduled instalment.`,
          'FINANCE',
          true,
          'barracks'
        );
      } else {
        clubAddMail(
          'Foundation loan repayment processed',
          `${teamCredits(paid)} has been paid to ${loan.lender}. The remaining loan balance is ${teamCredits(loan.balance)}. ${loan.balance > 0 ? `The next instalment is due in Week ${loan.nextPaymentWeek}.` : 'The foundation loan is now fully repaid.'}`,
          'FINANCE',
          false,
          'barracks'
        );
      }
      results.push({ week: currentWeek, due, paid, arrears: loan.arrears, balance: loan.balance });
      if (loan.balance <= 0) {
        loan.balance = 0;
        loan.arrears = 0;
        loan.active = false;
        clubAddMail('Foundation loan cleared', `${careerState.name} has repaid the foundation loan in full. No further bank instalments are scheduled.`, 'FINANCE', true, 'barracks');
      }
    }
    return results;
  }

  function clubNotifyExpiredContracts() {
    let changed = false;
    for (const player of careerState.squad || []) {
      const expired = Math.max(0, Math.round(Number(player.contractWeeks) || 0)) <= 0;
      if (!expired || player.contractExpiryNotified) continue;
      player.contractExpiryNotified = true;
      player.happiness = clamp((Number(player.happiness) || 50) - 8, 1, 100);
      clubAddMail(
        `${player.name} contract expired`,
        `${player.name}'s playing contract has reached zero weeks remaining. They remain visible in the squad while the club resolves their future, but the expiry is now flagged in the Calendar and Player Profile.`,
        'CONTRACTS',
        true,
        'profile'
      );
      changed = true;
    }
    return changed;
  }

  function clubCalendarEntityShort(value, fallback = 'EVENT') {
    const words = String(value || fallback).trim().split(/\s+/).filter(Boolean);
    const label = words[0] || fallback;
    return label.replace(/[^a-z0-9★-]/gi, '').slice(0, 12).toUpperCase() || fallback;
  }

  function clubCalendarPlayerShort(value, fallback = 'PLAYER') {
    const words = String(value || fallback).trim().split(/\s+/).filter(Boolean);
    const label = words[words.length - 1] || fallback;
    return label.replace(/[^a-z0-9'-]/gi, '').slice(0, 12).toUpperCase() || fallback;
  }

  function clubCalendarCompactCredits(value) {
    const amount = Math.max(0, Math.round(Number(value) || 0));
    if (amount >= 1000000) {
      const millions = amount / 1000000;
      return `${Number.isInteger(millions) ? millions.toFixed(0) : millions.toFixed(1)}M`;
    }
    if (amount >= 1000) {
      const thousands = amount / 1000;
      return `${Number.isInteger(thousands) ? thousands.toFixed(0) : thousands.toFixed(1)}K`;
    }
    return String(amount);
  }

  function clubCalendarEvent(day, type, short, title, detail, route = null, playerId = null, tone = '', compactTitle = '') {
    return {
      day: Math.max(0, Math.round(Number(day) || 0)),
      type,
      short,
      title,
      detail,
      route,
      playerId,
      tone: tone || type,
      compactTitle: compactTitle || short || title
    };
  }

  function clubCalendarUpcomingFixtures(startDay, endDay) {
    if (typeof ensureLeagueState !== 'function') return [];
    const league = ensureLeagueState();
    const fixtures = (league?.fixtures || [])
      .filter(fixture => !fixture.played && (fixture.homeId === LEAGUE_USER_CLUB_ID || fixture.awayId === LEAGUE_USER_CLUB_ID))
      .sort((a, b) => a.matchday - b.matchday);
    let fixtureDay = Math.max(clubCalendarState().absoluteDay, Number(clubCalendarState().nextLeagueDay) || 0);
    const events = [];
    for (const fixture of fixtures) {
      if (fixtureDay > endDay) break;
      if (fixtureDay >= startDay) {
        const opponentId = leagueFixtureOpponentId(fixture);
        const opponent = typeof leagueClubById === 'function' ? leagueClubById(opponentId) : null;
        const opponentName = opponent?.name || 'League opponent';
        const home = fixture.homeId === LEAGUE_USER_CLUB_ID;
        events.push(clubCalendarEvent(
          fixtureDay,
          'match',
          `MD${fixture.matchday}`,
          `${home ? 'Home fixture' : 'Away fixture'} vs ${opponentName}`,
          `${leagueDivisionDefinition().short} · Matchday ${fixture.matchday} · ${home ? 'Home' : 'Away'}`,
          'play',
          null,
          'match',
          `${home ? 'HOME' : 'AWAY'} · ${clubCalendarEntityShort(opponentName, 'OPPONENT')}`
        ));
      }
      fixtureDay += 7;
    }
    return events;
  }

  function clubCalendarEvents(startDay, endDay) {
    const calendar = clubCalendarState();
    const currentDay = calendar.absoluteDay;
    const events = [...clubCalendarUpcomingFixtures(startDay, endDay)];
    const loan = clubFinanceLoanState();
    if (loan?.active && loan.balance > 0) {
      if (loan.arrears > 0 && currentDay >= startDay && currentDay <= endDay) {
        events.push(clubCalendarEvent(
          currentDay,
          'loan-overdue',
          'DUE',
          'Foundation-loan arrears require attention',
          `${teamCredits(loan.arrears)} is overdue to ${loan.lender}. Open Finances to review the next collection.`,
          'barracks',
          null,
          'urgent',
          `BANK · ${clubCalendarCompactCredits(loan.arrears)} ARREARS`
        ));
      }
      for (let week = loan.nextPaymentWeek, safety = 0; week <= Math.floor(endDay / 7) + 1 && safety++ < 24; week += loan.intervalWeeks) {
        const day = (week - 1) * 7;
        if (day < startDay || day > endDay) continue;
        const amount = Math.min(loan.installment + loan.arrears, loan.balance);
        events.push(clubCalendarEvent(
          day,
          'loan',
          'LOAN',
          'Northstar Bank loan instalment',
          `${teamCredits(amount)} will be collected automatically. Outstanding balance: ${teamCredits(loan.balance)}.`,
          'barracks',
          null,
          'finance',
          `BANK · ${clubCalendarCompactCredits(amount)} DUE`
        ));
      }
    }

    const currentWeekStart = currentDay - calendar.dayOfWeek;
    for (const player of careerState.squad || []) {
      const weeks = Math.max(0, Math.round(Number(player.contractWeeks) || 0));
      const expiryDay = weeks <= 0 ? currentDay : currentWeekStart + weeks * 7;
      if (expiryDay >= startDay && expiryDay <= endDay) {
        const playerShort = clubCalendarPlayerShort(player.name, 'PLAYER');
        events.push(clubCalendarEvent(
          expiryDay,
          'contract',
          'CON',
          `${player.name}'s contract ${weeks <= 0 ? 'has expired' : 'expires'}`,
          weeks <= 0
            ? 'No contracted weeks remain. Review the player profile and resolve their future.'
            : `${weeks} week${weeks === 1 ? '' : 's'} currently remain on the agreement.`,
          'profile',
          player.id,
          weeks <= 1 ? 'urgent' : 'contract',
          `${playerShort} · ${weeks <= 0 ? 'EXPIRED' : 'CONTRACT END'}`
        ));
      }
      const recoveryDays = Math.max(0, Math.round(Number(player.injury?.recoveryDaysRemaining) || 0));
      if (recoveryDays > 0) {
        const returnDay = currentDay + recoveryDays;
        if (returnDay >= startDay && returnDay <= endDay) {
          const injuryName = player.injury?.name || 'current injury';
          events.push(clubCalendarEvent(
            returnDay,
            'medical',
            'FIT',
            `${player.name} projected to return`,
            `Medical staff expect clearance from ${injuryName.toLowerCase()} if recovery remains on schedule.`,
            'profile',
            player.id,
            'medical',
            `${clubCalendarPlayerShort(player.name, 'PLAYER')} · RETURN`
          ));
        }
      }
    }

    for (const assignment of careerState.recruitment?.assignments || []) {
      if (assignment.status !== 'active') continue;
      const dueDay = currentDay + Math.max(0, Math.round(Number(assignment.daysRemaining) || 0));
      if (dueDay >= startDay && dueDay <= endDay) {
        const roleLabel = assignment.roleId === 'any' ? 'all-role' : `${teamRoleById(assignment.roleId).name.toLowerCase()}`;
        events.push(clubCalendarEvent(
          dueDay,
          'scouting',
          'SCOUT',
          'Recruitment assignment report due',
          `The ${roleLabel} search completes and up to five recommended operators will be added to the report.`,
          'market',
          null,
          'scouting',
          'SCOUT REPORT DUE'
        ));
      }
    }

    for (const offer of careerState.sponsorship?.offers || []) {
      if (offer.status !== 'pending') continue;
      const expiryDay = Math.round(Number(offer.expiresDay) || -1);
      if (expiryDay < startDay || expiryDay > endDay) continue;
      const brand = typeof sponsorBrand === 'function' ? sponsorBrand(offer.brandId) : null;
      const brandName = brand?.name || offer.brandId || 'Commercial partner';
      events.push(clubCalendarEvent(
        expiryDay,
        'sponsor',
        'SPON',
        `${brandName} sponsorship decision deadline`,
        `Accept or decline the proposed commercial package before the offer expires.`,
        'commercial',
        null,
        'commercial',
        `${brand?.short || clubCalendarEntityShort(brandName, 'SPONSOR')} · DECIDE`
      ));
    }

    for (const offer of careerState.transfers?.outgoingOffers || []) {
      if (!['pending','countered'].includes(offer.status)) continue;
      const expiryDay = Math.round(Number(offer.expiresDay) || -1);
      if (expiryDay < startDay || expiryDay > endDay) continue;
      const player = typeof teamPlayerById === 'function' ? teamPlayerById(offer.playerId) : null;
      const playerName = player?.name || 'Squad player';
      events.push(clubCalendarEvent(
        expiryDay,
        'transfer',
        'BID',
        `${offer.clubName || 'Rival club'} bid for ${playerName} expires`,
        `${teamCredits(offer.amount || 0)} offer requires an accept, reject or counter decision.`,
        'transfers',
        null,
        'transfer',
        `${clubCalendarPlayerShort(playerName, 'PLAYER')} · BID DEADLINE`
      ));
    }

    const sponsor = careerState.sponsorship?.active;
    if (sponsor?.weekly > 0) {
      const brand = typeof sponsorBrand === 'function' ? sponsorBrand(sponsor.brandId) : null;
      for (let day = currentWeekStart + 7; day <= endDay; day += 7) {
        if (day < startDay) continue;
        events.push(clubCalendarEvent(
          day,
          'sponsor-income',
          'SPON',
          `${brand?.name || 'Sponsor'} weekly payment`,
          `${teamCredits(sponsor.weekly)} is scheduled to enter the club account.`,
          'commercial',
          null,
          'commercial',
          `${brand?.short || 'SPONSOR'} · +${clubCalendarCompactCredits(sponsor.weekly)}`
        ));
      }
    }
    return events.sort((a, b) => a.day - b.day || a.title.localeCompare(b.title));
  }

  function clubCalendarTodayEventCount() {
    const day = clubCalendarState().absoluteDay;
    return clubCalendarEvents(day, day).length;
  }

  function clubCalendarEarliestViewOffset() {
    const current = clubCurrentDateParts();
    const currentSerial = current.year * 12 + current.monthIndex;
    const epochSerial = CLUB_CALENDAR_EPOCH.year * 12 + CLUB_CALENDAR_EPOCH.monthIndex;
    return epochSerial - currentSerial;
  }

  function clubCalendarMonthRange(offset = clubCalendarViewOffset) {
    const current = clubCurrentDateParts();
    const first = new Date(Date.UTC(current.year, current.monthIndex + Math.round(Number(offset) || 0), 1));
    const year = first.getUTCFullYear();
    const monthIndex = first.getUTCMonth();
    const monthStartDay = clubAbsoluteDayForDate(year, monthIndex, 1);
    const monthStartParts = clubDatePartsForAbsoluteDay(monthStartDay);
    const startDay = monthStartDay - monthStartParts.weekdayIndex;
    const endDay = startDay + CLUB_CALENDAR_VISIBLE_WEEKS * 7 - 1;
    return {
      offset: Math.round(Number(offset) || 0),
      year,
      monthIndex,
      month: CLUB_MONTH_NAMES[monthIndex],
      shortMonth: CLUB_MONTH_SHORT_NAMES[monthIndex],
      monthStartDay,
      startDay,
      endDay
    };
  }

  function clubCalendarEventMarkup(event, compact = false) {
    const attrs = event.playerId
      ? `data-team-profile="${escapeCareerHtml(event.playerId)}"`
      : (event.route ? `data-team-route="${escapeCareerHtml(event.route)}"` : 'disabled');
    const label = compact ? event.compactTitle : event.title;
    const accessible = `${event.title}. ${event.detail}. ${clubDatePartsForAbsoluteDay(event.day).fullDate}.`;
    return `<button class="club-calendar-event ${escapeCareerHtml(event.tone)}" ${attrs} title="${escapeCareerHtml(event.title)} · ${escapeCareerHtml(event.detail)}" aria-label="${escapeCareerHtml(accessible)}"><b>${escapeCareerHtml(label)}</b>${compact ? '' : `<small>${escapeCareerHtml(event.detail)}</small>`}</button>`;
  }

  // Build 12.135: the agenda row already prints the event type, title and
  // detail. Reusing the calendar-grid button here repeated all of it a second
  // time inside the row, which read as duplicated ghost text at every width.
  // The agenda gets a short action label instead; the full description stays on
  // the accessible name and the tooltip.
  const CLUB_AGENDA_ACTION_LABELS = {
    match: 'OPEN MATCH',
    sponsor: 'REVIEW OFFER',
    loan: 'OPEN FINANCES',
    'loan-overdue': 'OPEN FINANCES',
    finance: 'OPEN FINANCES',
    medical: 'OPEN MEDICAL',
    contract: 'OPEN CONTRACT',
    transfer: 'OPEN TRANSFERS',
    training: 'OPEN TRAINING'
  };

  function clubCalendarAgendaActionMarkup(event) {
    const attrs = event.playerId
      ? `data-team-profile="${escapeCareerHtml(event.playerId)}"`
      : (event.route ? `data-team-route="${escapeCareerHtml(event.route)}"` : 'disabled');
    const label = CLUB_AGENDA_ACTION_LABELS[event.type] || (event.route || event.playerId ? 'OPEN' : 'SCHEDULED');
    const accessible = `${event.title}. ${event.detail}. ${clubDatePartsForAbsoluteDay(event.day).fullDate}.`;
    return `<button class="club-calendar-event club-calendar-agenda-action ${escapeCareerHtml(event.tone)}" ${attrs} title="${escapeCareerHtml(event.title)} · ${escapeCareerHtml(event.detail)}" aria-label="${escapeCareerHtml(accessible)}"><b>${escapeCareerHtml(label)}</b></button>`;
  }

  function clubCalendarAgendaMarkup(events, currentDay) {
    const agendaEvents = events.filter(event => event.day >= currentDay).slice(0, 18);
    if (!agendaEvents.length) return '<div class="team-history-empty">No scheduled club events in the next twelve weeks.</div>';
    return agendaEvents.map(event => {
      const date = clubDatePartsForAbsoluteDay(event.day);
      return `<article class="club-calendar-agenda-item ${escapeCareerHtml(event.tone)}"><time><b>${date.shortDay}</b><strong>${date.dayOfMonth}</strong><small>${date.shortMonth} ${date.year}</small></time><div><span>${escapeCareerHtml(event.type.replace(/-/g, ' ').toUpperCase())}</span><strong>${escapeCareerHtml(event.title)}</strong><small>${escapeCareerHtml(event.detail)}</small></div>${clubCalendarAgendaActionMarkup(event)}</article>`;
    }).join('');
  }

  function renderClubCalendarTab() {
    if (!careerState.created) return renderCareerCreationTab();
    clubEnsureFoundationLoanNotice();
    const calendar = clubCalendarState();
    const currentDay = calendar.absoluteDay;
    const currentDate = clubCurrentDateParts();
    const range = clubCalendarMonthRange();
    const visibleEvents = clubCalendarEvents(range.startDay, range.endDay);
    const agendaEvents = clubCalendarEvents(currentDay, currentDay + CLUB_CALENDAR_AGENDA_DAYS);
    const eventsByDay = new Map();
    for (const event of visibleEvents) {
      if (!eventsByDay.has(event.day)) eventsByDay.set(event.day, []);
      eventsByDay.get(event.day).push(event);
    }

    const days = [];
    for (let day = range.startDay; day <= range.endDay; day++) {
      const date = clubDatePartsForAbsoluteDay(day);
      const dayEvents = eventsByDay.get(day) || [];
      const week = Math.floor(day / 7) + 1;
      const isCurrent = day === currentDay;
      const isPast = day < currentDay;
      const outsideMonth = date.monthIndex !== range.monthIndex;
      const eventMarkup = dayEvents.slice(0, CLUB_CALENDAR_EVENT_LIMIT).map(event => clubCalendarEventMarkup(event, true)).join('');
      const extra = dayEvents.length > CLUB_CALENDAR_EVENT_LIMIT ? `<span class="club-calendar-more">+${dayEvents.length - CLUB_CALENDAR_EVENT_LIMIT} MORE</span>` : '';
      days.push(`<article class="club-calendar-day ${isCurrent ? 'current' : ''} ${isPast ? 'past' : ''} ${outsideMonth ? 'outside-month' : ''} ${dayEvents.length ? 'has-events' : ''}" aria-label="${escapeCareerHtml(date.fullDate)}"><header><span>${date.shortMonth}</span><strong>${date.dayOfMonth}</strong><small>W${week}</small></header><span class="club-calendar-mobile-date">${escapeCareerHtml(date.fullDate)}</span><div>${eventMarkup}${extra}</div></article>`);
    }

    const nextMajor = agendaEvents.find(event => event.day >= currentDay) || null;
    const daysUntil = nextMajor ? Math.max(0, nextMajor.day - currentDay) : null;
    const nextDate = nextMajor ? clubDatePartsForAbsoluteDay(nextMajor.day) : null;
    const agenda = clubCalendarAgendaMarkup(agendaEvents, currentDay);
    return `<div class="menu-hero career-hero club-calendar-hero"><div class="menu-hero-main menu-briefing-panel"><div class="menu-kicker">CLUB CALENDAR // ${escapeCareerHtml(range.month)} ${range.year}</div><h2>${escapeCareerHtml(currentDate.fullDate)}</h2><p>The calendar follows real month lengths and year changes. Fixtures, repayments, contracts, medical returns, scouting work and decision deadlines use the same simulated date.</p><div class="menu-pill-row"><span class="menu-pill">WEEK ${careerState.week}</span><span class="menu-pill">SEASON ${careerState.league?.season || calendar.seasonYear}</span><span class="menu-pill">${visibleEvents.length} EVENTS IN VIEW</span><span class="menu-pill">${clubCalendarTodayEventCount()} TODAY</span></div></div><div class="menu-hero-side"><div class="menu-kicker">NEXT MAJOR EVENT</div><div class="menu-side-operator">${daysUntil === null ? '—' : daysUntil === 0 ? 'TODAY' : `${daysUntil}D`}</div><p>${escapeCareerHtml(nextMajor ? `${nextMajor.title} · ${nextDate.compactDate}` : 'No scheduled event in the next twelve weeks')}</p></div></div>
      <section class="club-calendar-shell"><header class="club-calendar-monthbar"><button data-calendar-nav="-1" aria-label="Show previous month" ${range.offset <= clubCalendarEarliestViewOffset() ? 'disabled' : ''}>‹</button><div><span>MONTH VIEW</span><strong>${escapeCareerHtml(range.month)} ${range.year}</strong><small>${range.offset === 0 ? 'CURRENT CLUB MONTH' : `${Math.abs(range.offset)} MONTH${Math.abs(range.offset) === 1 ? '' : 'S'} ${range.offset > 0 ? 'AHEAD' : 'BACK'}`}</small></div><button data-calendar-nav="today">TODAY</button><button data-calendar-nav="1" aria-label="Show next month">›</button></header><header class="club-calendar-weekdays">${CLUB_DAY_NAMES.map(day => `<span>${day.slice(0, 3)}</span>`).join('')}</header><div class="club-calendar-grid">${days.join('')}</div></section>
      <section class="club-calendar-agenda"><div class="career-section-head"><div><span>NEXT 12 WEEKS</span><strong>EVENT AGENDA</strong></div><p>Descriptions show who or what is involved, the financial value or consequence and the required management action.</p></div><div>${agenda}</div></section>`;
  }

  function handleClubCalendarNavigation(action) {
    if (action === 'today') clubCalendarViewOffset = 0;
    else clubCalendarViewOffset = clamp(
      clubCalendarViewOffset + Math.sign(Number(action) || 0),
      clubCalendarEarliestViewOffset(),
      36
    );
    updateMenuUI();
    return true;
  }

  const baseHandleCareerMenuClickCalendar = handleCareerMenuClick;
  handleCareerMenuClick = function enhancedHandleCareerMenuClickCalendar(event) {
    const navigation = event.target.closest('[data-calendar-nav]');
    if (navigation) return handleClubCalendarNavigation(navigation.dataset.calendarNav);
    return baseHandleCareerMenuClickCalendar(event);
  };

  const baseClubWeeklyCalendarTasksFinance = clubWeeklyCalendarTasks;
  clubWeeklyCalendarTasks = function enhancedClubWeeklyCalendarTasksFinance() {
    const result = baseClubWeeklyCalendarTasksFinance();
    clubEnsureFoundationLoanNotice();
    clubProcessFoundationLoan();
    clubNotifyExpiredContracts();
    saveCareerState();
    return result;
  };

  if (careerState.created) clubEnsureFoundationLoanNotice();
