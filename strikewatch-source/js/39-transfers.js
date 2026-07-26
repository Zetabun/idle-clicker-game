/*
 * Strikewatch source module: 39-transfers.js
 * Purpose: Incoming player negotiations, rival transfer offers and transfer-centre UI.
 *
 * This file shares the application scope with the other source fragments.
 * Run `python3 build.py` to regenerate the development bundle and standalone.
 */

  const TRANSFER_STATE_VERSION = 1;
  const TRANSFER_CONTRACT_OPTIONS = [52, 78, 104, 156];

  function transferState() {
    careerState.transfers = careerState.transfers && typeof careerState.transfers === 'object' ? careerState.transfers : {};
    const state = careerState.transfers;
    state.version = TRANSFER_STATE_VERSION;
    state.sequence = Math.max(0, Math.round(Number(state.sequence) || 0));
    state.activeIncoming = state.activeIncoming && typeof state.activeIncoming === 'object' ? { ...state.activeIncoming } : null;
    state.outgoingOffers = Array.isArray(state.outgoingOffers) ? state.outgoingOffers.slice(0, 30).map(item => ({ ...item })) : [];
    state.selectedOfferId = state.selectedOfferId || null;
    state.lastOfferDay = Number.isFinite(Number(state.lastOfferDay)) ? Math.round(Number(state.lastOfferDay)) : -3;
    return state;
  }

  function transferNextId(prefix = 'TR') {
    const state = transferState();
    state.sequence++;
    return `${prefix}-${state.sequence}`;
  }

  function transferPendingOutgoingCount() {
    return transferState().outgoingOffers.filter(item => ['pending','countered','agreed'].includes(item.status)).length;
  }

  function transferActivityCount() {
    return transferPendingOutgoingCount() + (transferState().activeIncoming ? 1 : 0);
  }

  function transferPlayerPointAlertCount() {
    return (careerState.squad || []).reduce((sum, player) => sum + Math.max(0, Math.round(Number(player.unspentPoints) || 0)), 0);
  }

  function transferMarketPlayer(id) {
    return (careerState.market || []).find(player => player.id === id) || null;
  }

  function transferSquadPlayer(id) {
    return (careerState.squad || []).find(player => player.id === id) || null;
  }

  function transferRivalClubByName(name) {
    return (careerState.league?.clubs || []).find(club => !club.isUser && club.id !== LEAGUE_USER_CLUB_ID && club.name === name) || null;
  }

  function transferRivalClubs() {
    return (careerState.league?.clubs || []).filter(club => club.id !== LEAGUE_USER_CLUB_ID);
  }

  function transferRoundMoney(value, step = 1000) {
    return Math.max(step, Math.round((Number(value) || 0) / step) * step);
  }

  function transferIncomingDemands(player) {
    const freeAgent = String(player?.currentTeam || '').toLowerCase() === 'free agent';
    const academyProspect = Boolean(player?.clubAcademyProspect);
    const askingFee = academyProspect ? 0 : freeAgent ? Math.max(5000, transferRoundMoney(player.value * 0.16)) : Math.max(5000, transferRoundMoney(player.fee || player.value));
    const requestedWage = Math.max(900, transferRoundMoney(player.wage || 1800, 100));
    const requestedContractWeeks = player.age <= 23 ? 156 : player.age >= 31 ? 78 : 104;
    return { askingFee, requestedWage, requestedContractWeeks, freeAgent, academyProspect };
  }

  function startIncomingTransferNegotiation(playerId) {
    if (menuContext === 'pause' || appState === 'match') return { ok: false, reason: 'Negotiations are locked during a live match.' };
    const player = transferMarketPlayer(playerId);
    if (!player) return { ok: false, reason: 'This player is no longer available.' };
    if ((careerState.squad || []).length >= TEAM_MAX_SQUAD) return { ok: false, reason: `The squad limit is ${TEAM_MAX_SQUAD}.` };
    const demands = transferIncomingDemands(player);
    transferState().activeIncoming = {
      id: transferNextId('IN'),
      playerId: player.id,
      status: 'draft',
      round: 1,
      askingFee: demands.askingFee,
      requestedWage: demands.requestedWage,
      requestedContractWeeks: demands.requestedContractWeeks,
      offeredFee: demands.academyProspect ? 0 : transferRoundMoney(demands.askingFee * 0.86),
      offeredWage: transferRoundMoney(demands.requestedWage * 0.92, 100),
      offeredContractWeeks: demands.requestedContractWeeks,
      freeAgent: demands.freeAgent,
      academyProspect: demands.academyProspect,
      message: demands.academyProspect
        ? 'Prepare the first senior contract. No transfer fee is required; the prospect will judge the wage and contract length.'
        : 'Prepare an opening package. The selling club and player will judge the fee, wage and contract together.'
    };
    careerState.selectedPlayerId = player.id;
    selectedTeamPlayerId = player.id;
    saveCareerState();
    const routed = setMenuRoute('transfers');
    const targetId = `transfer:${transferState().activeIncoming.id || player.id}`;
    if (routed && typeof scrollMenuGuideTargetIntoView === 'function') {
      scrollMenuGuideTargetIntoView(targetId, 'transfers', { behavior: 'smooth', block: 'start' });
    }
    return { ok: true, player, targetId };
  }

  function adjustIncomingTransfer(field, direction) {
    const deal = transferState().activeIncoming;
    if (!deal || !['draft','countered'].includes(deal.status)) return false;
    const sign = direction < 0 ? -1 : 1;
    if (field === 'fee') {
      if (deal.academyProspect) return false;
      deal.offeredFee = Math.max(0, transferRoundMoney(deal.offeredFee + sign * 5000));
    }
    else if (field === 'wage') deal.offeredWage = Math.max(500, transferRoundMoney(deal.offeredWage + sign * 250, 100));
    else if (field === 'contract') {
      const current = TRANSFER_CONTRACT_OPTIONS.indexOf(deal.offeredContractWeeks);
      deal.offeredContractWeeks = TRANSFER_CONTRACT_OPTIONS[clamp(current + sign, 0, TRANSFER_CONTRACT_OPTIONS.length - 1)];
    } else return false;
    deal.status = 'draft';
    saveCareerState();
    updateMenuUI();
    return true;
  }

  function submitIncomingTransferOffer() {
    const deal = transferState().activeIncoming;
    const player = deal ? transferMarketPlayer(deal.playerId) : null;
    if (!deal || !player || !['draft','countered'].includes(deal.status)) return { ok: false, reason: 'No active negotiation.' };
    deal.lastSubmitted = {
      round: deal.round,
      fee: deal.offeredFee,
      wage: deal.offeredWage,
      contractWeeks: deal.offeredContractWeeks
    };
    const feeRatio = deal.freeAgent || deal.academyProspect ? 1 : deal.offeredFee / Math.max(1, deal.askingFee);
    const wageRatio = deal.offeredWage / Math.max(1, deal.requestedWage);
    const contractScore = deal.offeredContractWeeks >= deal.requestedContractWeeks ? 1 : deal.offeredContractWeeks / deal.requestedContractWeeks;
    const score = feeRatio * 0.52 + wageRatio * 0.36 + contractScore * 0.12;
    if (score >= 0.97) {
      deal.status = 'agreed';
      deal.message = `${player.name} and the selling club have accepted the package. Complete the registration to sign the player.`;
      clubAddMail(`Terms agreed with ${player.name}`, `A fee of ${teamCredits(deal.offeredFee)}, ${teamCredits(deal.offeredWage)} per week and a ${deal.offeredContractWeeks}-week contract have been accepted.`, 'TRANSFERS', true, 'transfers');
    } else if (deal.round >= 3 && score < 0.78) {
      deal.status = 'rejected';
      deal.message = 'The negotiation has broken down after repeated low offers. You may withdraw and begin again later.';
    } else {
      deal.round++;
      deal.status = 'countered';
      deal.askingFee = deal.freeAgent || deal.academyProspect ? deal.askingFee : transferRoundMoney(Math.max(deal.offeredFee, deal.askingFee * (0.94 - deal.round * 0.015)));
      deal.requestedWage = transferRoundMoney(Math.max(deal.offeredWage, deal.requestedWage * (0.97 - deal.round * 0.01)), 100);
      deal.requestedContractWeeks = Math.min(deal.requestedContractWeeks, deal.offeredContractWeeks >= 104 ? deal.offeredContractWeeks : deal.requestedContractWeeks);
      deal.message = `Counter-offer received: ${teamCredits(deal.askingFee)} fee, ${teamCredits(deal.requestedWage)} per week and ${deal.requestedContractWeeks} weeks.`;
    }
    deal.lastResponseStatus = deal.status;
    deal.lastResponseMessage = deal.message;
    saveCareerState();
    updateMenuUI();
    return { ok: deal.status === 'agreed', status: deal.status, submitted: { ...deal.lastSubmitted }, message: deal.message };
  }

  function completeIncomingTransfer() {
    const deal = transferState().activeIncoming;
    const player = deal ? transferMarketPlayer(deal.playerId) : null;
    if (!deal || !player || deal.status !== 'agreed') return { ok: false, reason: 'Terms have not been agreed.' };
    if ((careerState.squad || []).length >= TEAM_MAX_SQUAD) return { ok: false, reason: `The squad limit is ${TEAM_MAX_SQUAD}.` };
    if (careerState.credits < deal.offeredFee) return { ok: false, reason: 'Insufficient credits to complete the transfer.' };
    const currentWages = typeof clubTotalWageBill === 'function' ? clubTotalWageBill() : teamSquadWageBill();
    if (currentWages + deal.offeredWage > careerState.wageBudget) return { ok: false, reason: 'The agreed wage would exceed the weekly budget.' };
    const marketIndex = careerState.market.findIndex(item => item.id === player.id);
    if (marketIndex < 0) return { ok: false, reason: 'The player is no longer available.' };
    careerState.credits -= deal.offeredFee;
    player.fee = deal.offeredFee;
    player.wage = deal.offeredWage;
    player.contractWeeks = deal.offeredContractWeeks;
    player.joinedWeek = careerState.week;
    player.currentTeam = careerState.name;
    player.happiness = clamp(player.happiness + 4, 1, 100);
    careerState.squad.push(player);
    careerState.market.splice(marketIndex, 1);
    teamFinanceTransaction('TRANSFER', -deal.offeredFee, `Signed ${player.name} after negotiation`);
    transferState().activeIncoming = null;
    selectedTeamPlayerId = player.id;
    careerState.selectedPlayerId = player.id;
    syncCareerFirstStarterWeapon();
    if (typeof updatePlayerMarketProfile === 'function') updatePlayerMarketProfile(player);
    clubAddMail(`${player.name} joins the club`, `${player.name} has completed a ${deal.offeredContractWeeks}-week contract on ${teamCredits(deal.offeredWage)} per week.`, 'TRANSFERS', true, 'operators');
    if (typeof supporterReactToSigning === 'function') supporterReactToSigning(player, { fee: deal.offeredFee, wage: deal.offeredWage, source: 'negotiation' });
    saveCareerState();
    updateMenuUI();
    return { ok: true, player };
  }

  function acceptIncomingTransferCounter() {
    const deal = transferState().activeIncoming;
    const player = deal ? transferMarketPlayer(deal.playerId) : null;
    if (!deal || !player || deal.status !== 'countered') return { ok: false, reason: 'There is no active counter-offer to accept.' };
    deal.offeredFee = Math.max(0, Number(deal.askingFee) || 0);
    deal.offeredWage = Math.max(0, Number(deal.requestedWage) || 0);
    deal.offeredContractWeeks = Math.max(1, Math.round(Number(deal.requestedContractWeeks) || 104));
    deal.status = 'agreed';
    deal.lastResponseStatus = 'agreed';
    deal.message = `${player.name} and the selling club have accepted the counter-offer. Complete the registration to sign the player.`;
    deal.lastResponseMessage = deal.message;
    clubAddMail(`Terms agreed with ${player.name}`, `The counter-offer of ${teamCredits(deal.offeredFee)}, ${teamCredits(deal.offeredWage)} per week and a ${deal.offeredContractWeeks}-week contract has been accepted.`, 'TRANSFERS', true, 'transfers');
    saveCareerState();
    updateMenuUI();
    return { ok: true, status: deal.status, player, deal: { ...deal }, message: deal.message };
  }

  function incomingTransferTermsLine(deal, counter = false) {
    if (!deal) return '';
    const fee = counter ? deal.askingFee : deal.offeredFee;
    const wage = counter ? deal.requestedWage : deal.offeredWage;
    const contract = counter ? deal.requestedContractWeeks : deal.offeredContractWeeks;
    const signingBonus = Math.max(0, Number(deal.signingBonus) || 0);
    const appearanceBonus = Math.max(0, Number(deal.appearanceBonus) || 0);
    const statusLabels = { prospect: 'PROSPECT', rotation: 'ROTATION', starter: 'REGULAR STARTER', key: 'KEY PLAYER' };
    const extras = [
      signingBonus > 0 ? `${teamCredits(signingBonus)} SIGNING BONUS` : '',
      appearanceBonus > 0 ? `${teamCredits(appearanceBonus)}/MATCH` : '',
      `${statusLabels[deal.squadStatus] || 'ROTATION'} STATUS`
    ].filter(Boolean).join(' · ');
    return `${teamCredits(fee)} FEE · ${teamCredits(wage)}/W · ${Math.max(1, Math.round(Number(contract) || 0))} WEEKS${extras ? ` · ${extras}` : ''}`;
  }

  function incomingTransferModalActions(type = 'counter') {
    if (type === 'counter') {
      return `<footer class="team-note-management-actions transfer-modal-actions"><button type="button" data-transfer-modal-action="return-negotiation">BACK TO NEGOTIATION</button><button type="button" class="primary" data-transfer-modal-action="accept-counter">ACCEPT COUNTER-OFFER</button></footer>`;
    }
    if (type === 'agreed') {
      return `<footer class="team-note-management-actions transfer-modal-actions"><button type="button" data-transfer-modal-action="return-negotiation">BACK TO NEGOTIATION</button><button type="button" class="primary" data-transfer-modal-action="complete-signing">COMPLETE SIGNING</button></footer>`;
    }
    if (type === 'complete') {
      return `<footer class="team-note-management-actions transfer-modal-actions"><button type="button" data-transfer-modal-action="dismiss">CLOSE</button><button type="button" class="primary" data-transfer-modal-action="open-squad">VIEW SQUAD</button></footer>`;
    }
    if (type === 'finance') {
      return `<footer class="team-note-management-actions transfer-modal-actions"><button type="button" data-transfer-modal-action="return-negotiation">BACK TO NEGOTIATION</button><button type="button" class="primary" data-transfer-modal-action="open-finances">OPEN FINANCES</button></footer>`;
    }
    if (type === 'blocked') {
      return `<footer class="team-note-management-actions transfer-modal-actions"><button type="button" data-transfer-modal-action="dismiss">CLOSE</button><button type="button" class="primary" data-transfer-modal-action="return-negotiation">BACK TO NEGOTIATION</button></footer>`;
    }
    return `<footer class="team-note-management-actions transfer-modal-actions"><button type="button" data-transfer-modal-action="dismiss">CLOSE</button><button type="button" class="primary" data-transfer-modal-action="open-recruitment">RETURN TO RECRUITMENT</button></footer>`;
  }

  function showIncomingTransferResponseModal(result = {}, returnFocus = null) {
    const deal = transferState().activeIncoming;
    const player = deal ? transferMarketPlayer(deal.playerId) : null;
    if (!deal || !player || typeof openTeamNoteModal !== 'function') return false;
    const status = String(result.status || deal.status || 'draft');
    if (status === 'countered') {
      return openTeamNoteModal({
        kicker: 'COUNTER-OFFER RECEIVED',
        title: `${player.name.toUpperCase()} · REVISED TERMS`,
        body: result.message || deal.message || 'The selling club and player have proposed revised terms.',
        footer: incomingTransferTermsLine(deal, true),
        tone: 'warning', mode: 'management', glyph: '↔',
        actionsHtml: incomingTransferModalActions('counter'),
        dismissHint: 'ACCEPT THE COUNTER-OFFER OR RETURN TO NEGOTIATION',
        returnFocus
      });
    }
    if (status === 'agreed') {
      return openTeamNoteModal({
        kicker: 'TERMS AGREED',
        title: `${player.name.toUpperCase()} · READY TO SIGN`,
        body: result.message || deal.message || 'The package has been accepted. Complete the registration to add the player to the squad.',
        footer: incomingTransferTermsLine(deal, false),
        tone: 'success', mode: 'management', glyph: '✓',
        actionsHtml: incomingTransferModalActions('agreed'),
        dismissHint: 'COMPLETE THE SIGNING NOW OR RETURN TO NEGOTIATION',
        returnFocus
      });
    }
    return openTeamNoteModal({
      kicker: 'NEGOTIATION CLOSED',
      title: `${player.name.toUpperCase()} · OFFER REJECTED`,
      body: result.message || deal.message || 'The representatives have ended this negotiation.',
      footer: result.submitted ? `${teamCredits(result.submitted.fee)} FEE · ${teamCredits(result.submitted.wage)}/W · ${result.submitted.contractWeeks} WEEKS` : '',
      tone: 'danger', mode: 'management', glyph: '×',
      actionsHtml: incomingTransferModalActions('rejected'),
      dismissHint: 'CLOSE OR RETURN TO RECRUITMENT',
      returnFocus
    });
  }

  function showIncomingTransferCompletionModal(result = {}, returnFocus = null) {
    if (typeof openTeamNoteModal !== 'function') return false;
    if (result.ok && result.player) {
      const completedExtras = [
        Number(result.signingBonus) > 0 ? `${teamCredits(result.signingBonus)} SIGNING BONUS` : '',
        Number(result.appearanceBonus ?? result.player.appearanceBonus) > 0 ? `${teamCredits(result.appearanceBonus ?? result.player.appearanceBonus)}/MATCH` : '',
        result.squadStatusLabel ? `${result.squadStatusLabel} STATUS` : ''
      ].filter(Boolean).join(' · ');
      return openTeamNoteModal({
        kicker: 'CONTRACT COMPLETED',
        title: `${result.player.name.toUpperCase()} HAS SIGNED`,
        body: `${result.player.name} has joined ${careerState.name}. The transfer fee and complete contract package have been registered, and the player is now available for squad selection.`,
        footer: `${teamCredits(result.player.fee)} FEE · ${teamCredits(result.player.wage)}/W · ${result.player.contractWeeks} WEEKS${completedExtras ? ` · ${completedExtras}` : ''}`,
        tone: 'success', mode: 'management', glyph: '✓',
        actionsHtml: incomingTransferModalActions('complete'),
        dismissHint: 'CLOSE OR OPEN THE SQUAD',
        returnFocus
      });
    }
    const financeIssue = /credit|budget|wage/i.test(result.reason || '');
    return openTeamNoteModal({
      kicker: 'SIGNING COULD NOT BE COMPLETED',
      title: financeIssue ? 'FINANCIAL APPROVAL REQUIRED' : 'REGISTRATION BLOCKED',
      body: result.reason || 'The transfer cannot be registered yet.',
      footer: financeIssue ? 'Review available cash and weekly wage headroom before trying again.' : '',
      tone: 'danger', mode: 'management', glyph: '!',
      actionsHtml: incomingTransferModalActions(financeIssue ? 'finance' : 'blocked'),
      dismissHint: financeIssue ? 'RETURN TO NEGOTIATION OR OPEN FINANCES' : 'RETURN TO THE NEGOTIATION',
      returnFocus
    });
  }

  function closeTransferModalToRoute(route) {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    if (typeof closeTeamNoteModal === 'function') closeTeamNoteModal({ restoreFocus: false });
    if (route) setMenuRoute(route);
    if (typeof stabiliseMenuViewportAfterRoute === 'function') stabiliseMenuViewportAfterRoute(route || menuTab);
  }

  function handleTransferModalAction(event) {
    const action = event.target.closest?.('[data-transfer-modal-action]');
    if (!action) return false;
    const id = String(action.dataset.transferModalAction || '');
    if (id === 'return-negotiation') {
      closeTransferModalToRoute('transfers');
    } else if (id === 'accept-counter') {
      const result = acceptIncomingTransferCounter();
      if (result.ok) {
        showStatus('COUNTER-OFFER ACCEPTED');
        showIncomingTransferResponseModal(result, action);
      } else {
        showIncomingTransferCompletionModal(result, action);
      }
    } else if (id === 'complete-signing') {
      const result = completeIncomingTransfer();
      if (result.ok) showStatus(`${result.player.name.toUpperCase()} SIGNED`);
      showIncomingTransferCompletionModal(result, action);
    } else if (id === 'open-squad') {
      closeTransferModalToRoute('operators');
    } else if (id === 'open-finances') {
      closeTransferModalToRoute('barracks');
    } else if (id === 'open-recruitment') {
      closeTransferModalToRoute('market');
    } else if (id === 'dismiss') {
      if (typeof closeTeamNoteModal === 'function') closeTeamNoteModal({ restoreFocus: false });
    } else {
      return false;
    }
    return true;
  }

  function withdrawIncomingTransfer() {
    if (!transferState().activeIncoming) return false;
    transferState().activeIncoming = null;
    saveCareerState();
    updateMenuUI();
    return true;
  }

  function transferOfferClubForPlayer(player, day) {
    const interestedNames = player.transferInterest?.clubs || [];
    const preferred = interestedNames.map(transferRivalClubByName).filter(Boolean);
    const pool = preferred.length ? preferred : transferRivalClubs();
    if (!pool.length) return null;
    const random = teamRng(teamSeedFromString(`${player.id}:${day}:offer-club`));
    return pool[Math.floor(random() * pool.length) % pool.length];
  }

  function generateOutgoingTransferOffers() {
    const state = transferState();
    const day = clubCalendarState().absoluteDay;
    if (day - state.lastOfferDay < 2 || (careerState.squad || []).length < TEAM_REQUIRED_STARTERS) return [];
    if (state.outgoingOffers.filter(item => ['pending','countered','agreed'].includes(item.status)).length >= 4) return [];
    const eligible = (careerState.squad || [])
      .filter(player => (player.transferInterest?.score || 0) >= 44)
      .filter(player => !state.outgoingOffers.some(offer => offer.playerId === player.id && ['pending','countered','agreed'].includes(offer.status)))
      .sort((a, b) => (b.transferInterest?.score || 0) - (a.transferInterest?.score || 0));
    if (!eligible.length) return [];
    const random = teamRng(teamSeedFromString(`${careerState.name}:${day}:transfer-offers`));
    const trigger = random();
    const best = eligible[0];
    const chance = clamp(0.18 + (best.transferInterest.score - 44) / 130, 0.18, 0.58);
    if (trigger > chance) return [];
    const player = eligible[Math.floor(random() * Math.min(3, eligible.length))];
    const club = transferOfferClubForPlayer(player, day);
    if (!club) return [];
    const interest = clamp(player.transferInterest.score || 50, 0, 100);
    const amount = transferRoundMoney(player.value * (0.78 + interest / 260 + random() * 0.08));
    const maxAmount = transferRoundMoney(amount * (1.08 + interest / 520));
    const offer = {
      id: transferNextId('OUT'), playerId: player.id, clubId: club.id, clubName: club.name,
      amount, counterAmount: transferRoundMoney(amount * 1.10), maxAmount,
      status: 'pending', day, expiresDay: day + 4,
      message: `${club.name} have submitted an opening bid for ${player.name}.`
    };
    state.outgoingOffers.unshift(offer);
    state.lastOfferDay = day;
    clubAddMail(`Transfer bid for ${player.name}`, `${club.name} have offered ${teamCredits(amount)}. Open the Transfer Centre to accept, reject or negotiate.`, 'TRANSFERS', true, 'transfers');
    return [offer];
  }

  function transferExpireOffers() {
    const day = clubCalendarState().absoluteDay;
    for (const offer of transferState().outgoingOffers) {
      if (['pending','countered'].includes(offer.status) && day > offer.expiresDay) {
        offer.status = 'expired';
        offer.message = `${offer.clubName} withdrew the bid after receiving no response.`;
      }
    }
  }

  function transferProcessDay() {
    if (!careerState.created) return [];
    for (const player of careerState.squad || []) if (typeof updatePlayerMarketProfile === 'function') updatePlayerMarketProfile(player);
    transferExpireOffers();
    return generateOutgoingTransferOffers();
  }

  function transferSelectedOutgoingOffer() {
    const state = transferState();
    return state.outgoingOffers.find(item => item.id === state.selectedOfferId) || state.outgoingOffers.find(item => ['pending','countered','agreed'].includes(item.status)) || state.outgoingOffers[0] || null;
  }

  function selectOutgoingTransferOffer(id) {
    if (!transferState().outgoingOffers.some(item => item.id === id)) return false;
    transferState().selectedOfferId = id;
    saveCareerState();
    updateMenuUI();
    return true;
  }

  function adjustOutgoingCounter(id, direction) {
    const offer = transferState().outgoingOffers.find(item => item.id === id);
    if (!offer || !['pending','countered'].includes(offer.status)) return false;
    offer.counterAmount = Math.max(5000, transferRoundMoney((offer.counterAmount || offer.amount) + (direction < 0 ? -5000 : 5000)));
    saveCareerState();
    updateMenuUI();
    return true;
  }

  function submitOutgoingCounter(id) {
    const offer = transferState().outgoingOffers.find(item => item.id === id);
    const player = offer ? transferSquadPlayer(offer.playerId) : null;
    if (!offer || !player || !['pending','countered'].includes(offer.status)) return { ok: false, reason: 'Offer unavailable.' };
    offer.lastCounterSubmitted = offer.counterAmount;
    offer.lastCounterSubmittedDay = typeof clubCalendarState === 'function' ? clubCalendarState().absoluteDay : 0;
    if (offer.counterAmount <= offer.maxAmount) {
      offer.amount = offer.counterAmount;
      offer.status = 'agreed';
      offer.message = `${offer.clubName} accepted your counter-offer of ${teamCredits(offer.amount)}.`;
      clubAddMail(`Counter accepted for ${player.name}`, `${offer.clubName} have agreed to pay ${teamCredits(offer.amount)}. Confirm the sale in the Transfer Centre.`, 'TRANSFERS', true, 'transfers');
    } else if (offer.counterAmount <= offer.maxAmount * 1.12) {
      offer.amount = offer.maxAmount;
      offer.counterAmount = offer.maxAmount;
      offer.status = 'countered';
      offer.message = `${offer.clubName} will go no higher than ${teamCredits(offer.maxAmount)}.`;
    } else {
      offer.status = 'rejected';
      offer.message = `${offer.clubName} withdrew after considering the requested price unrealistic.`;
    }
    offer.lastCounterResponse = offer.message;
    saveCareerState();
    updateMenuUI();
    return { ok: offer.status === 'agreed', status: offer.status, submittedAmount: offer.lastCounterSubmitted, message: offer.message, clubName: offer.clubName, playerName: player.name };
  }

  function rejectOutgoingTransferOffer(id) {
    const offer = transferState().outgoingOffers.find(item => item.id === id);
    if (!offer || !['pending','countered','agreed'].includes(offer.status)) return false;
    offer.status = 'rejected';
    offer.message = 'The club rejected this transfer bid.';
    saveCareerState();
    updateMenuUI();
    return true;
  }

  function acceptOutgoingTransferOffer(id) {
    const offer = transferState().outgoingOffers.find(item => item.id === id);
    const player = offer ? transferSquadPlayer(offer.playerId) : null;
    if (!offer || !player || !['pending','countered','agreed'].includes(offer.status)) return { ok: false, reason: 'Offer unavailable.' };
    const squadIndex = careerState.squad.findIndex(item => item.id === player.id);
    if (squadIndex < 0) return { ok: false, reason: 'Player no longer contracted.' };
    careerState.squad.splice(squadIndex, 1);
    careerState.credits += offer.amount;
    teamFinanceTransaction('TRANSFER', offer.amount, `Sold ${player.name} to ${offer.clubName}`);
    player.currentTeam = offer.clubName;
    player.joinedWeek = careerState.week;
    const buyer = leagueClubById(offer.clubId);
    if (buyer?.roster) {
      buyer.roster.push(player);
      buyer.roster.sort((a, b) => teamPlayerOverall(b) - teamPlayerOverall(a));
      buyer.roster = buyer.roster.slice(0, TEAM_MAX_SQUAD);
    }
    offer.status = 'completed';
    offer.message = `${player.name} completed a transfer to ${offer.clubName} for ${teamCredits(offer.amount)}.`;
    for (const other of transferState().outgoingOffers) {
      if (other.playerId === player.id && other.id !== offer.id && ['pending','countered','agreed'].includes(other.status)) other.status = 'withdrawn';
    }
    selectedTeamPlayerId = careerState.squad[0]?.id || careerState.market[0]?.id || null;
    careerState.selectedPlayerId = selectedTeamPlayerId;
    syncCareerFirstStarterWeapon();
    clubAddMail(`${player.name} sold`, `${player.name} has joined ${offer.clubName}. The club received ${teamCredits(offer.amount)}.`, 'TRANSFERS', true, 'operators');
    if (typeof supporterReactToDeparture === 'function') supporterReactToDeparture(player, offer.amount);
    saveCareerState();
    updateMenuUI();
    return { ok: true, player, amount: offer.amount };
  }

  function renderTransferValueControl(label, field, value, stepLabel = '') {
    return `<div class="transfer-value-control"><span>${label}</span><div><button data-transfer-adjust="${field}" data-transfer-direction="-1" aria-label="Reduce ${label.toLowerCase()}">−</button><strong>${value}</strong><button data-transfer-adjust="${field}" data-transfer-direction="1" aria-label="Increase ${label.toLowerCase()}">+</button></div>${stepLabel ? `<small>${stepLabel}</small>` : ''}</div>`;
  }

  function renderIncomingNegotiation() {
    const deal = transferState().activeIncoming;
    if (!deal) return `<section class="transfer-empty-panel"><strong>NO ACTIVE PLAYER NEGOTIATION</strong><p>Open a player from Recruitment and choose Negotiate to prepare a fee, wage and contract package.</p><button class="primary" data-team-route="market">OPEN RECRUITMENT</button></section>`;
    const player = transferMarketPlayer(deal.playerId);
    if (!player) return `<section class="transfer-empty-panel"><strong>PLAYER UNAVAILABLE</strong><p>This negotiation can no longer be completed.</p><button data-transfer-action="withdraw-incoming">CLOSE NEGOTIATION</button></section>`;
    const locked = !['draft','countered'].includes(deal.status);
    const agreed = deal.status === 'agreed';
    const lastSubmitted = deal.lastSubmitted && typeof deal.lastSubmitted === 'object' ? deal.lastSubmitted : null;
    const responseTitle = deal.status === 'agreed' ? 'TERMS ACCEPTED' : deal.status === 'rejected' ? 'NEGOTIATION CLOSED' : deal.status === 'countered' ? 'COUNTER-OFFER RECEIVED' : 'OFFER SUBMITTED';
    const submissionFeedback = lastSubmitted ? `<div class="transfer-submission-feedback ${escapeCareerHtml(deal.lastResponseStatus || deal.status)}"><span>OFFER SENT · ROUND ${lastSubmitted.round}</span><strong>${responseTitle}</strong><small>${teamCredits(lastSubmitted.fee)} FEE · ${teamCredits(lastSubmitted.wage)}/W · ${lastSubmitted.contractWeeks} WEEKS</small></div>` : '';
    return `<section class="transfer-negotiation-card ${deal.status}" data-management-target-id="transfer:${escapeCareerHtml(deal.id || deal.playerId)}">
      <header><div><span>INCOMING NEGOTIATION · ROUND ${deal.round}</span><strong>${escapeCareerHtml(player.name)}</strong><div class="transfer-player-scouting"><span class="transfer-player-role">${teamRoleById(player.role).name}</span>${clubStarsMarkup(clubPlayerAbilityStars(player), 'ABILITY')}${clubStarsMarkup(clubPlayerPotentialStars(player), 'POTENTIAL', 'potential')}</div></div><b>${deal.status.toUpperCase()}</b></header>
      ${submissionFeedback}
      <div class="workflow-contract-safety"><span>NEGOTIATION SAFETY</span><strong>EDIT UNTIL SUBMITTED · SIGN ONLY WHEN COMPLETED</strong><small>Counter-offers and agreed terms remain inside this active negotiation. No player joins the squad until Complete Signing is pressed.</small></div>
      <p>${escapeCareerHtml(deal.message)}</p>
      <div class="transfer-demand-row"><span>SELLER / PLAYER REQUEST</span><strong>${teamCredits(deal.askingFee)} · ${teamCredits(deal.requestedWage)}/W · ${deal.requestedContractWeeks} WEEKS</strong></div>
      <div class="transfer-value-grid">
        ${renderTransferValueControl('TRANSFER FEE', 'fee', teamCredits(deal.offeredFee), '5,000 CR STEPS')}
        ${renderTransferValueControl('WEEKLY WAGE', 'wage', `${teamCredits(deal.offeredWage)}/W`, '250 CR STEPS')}
        ${renderTransferValueControl('CONTRACT', 'contract', `${deal.offeredContractWeeks} WEEKS`, '52–156 WEEKS')}
      </div>
      <footer><button data-transfer-action="withdraw-incoming">WITHDRAW</button>${agreed ? '<button class="primary" data-transfer-action="complete-incoming">COMPLETE SIGNING</button>' : `<button class="primary" data-transfer-action="submit-incoming" ${locked ? 'disabled' : ''}>${lastSubmitted ? 'SUBMIT REVISED OFFER' : 'SUBMIT OFFER'}</button>`}</footer>
    </section>`;
  }

  function renderOutgoingOffers() {
    const offers = transferState().outgoingOffers;
    const selected = transferSelectedOutgoingOffer();
    const statusLabel = status => ({
      pending: 'PENDING RESPONSE',
      countered: 'COUNTER RECEIVED',
      agreed: 'AGREED',
      rejected: 'REJECTED',
      withdrawn: 'WITHDRAWN',
      expired: 'EXPIRED'
    }[status] || String(status || '').toUpperCase());
    const rows = offers.length ? offers.map(offer => {
      const player = transferSquadPlayer(offer.playerId);
      return `<button class="transfer-offer-row ${selected?.id === offer.id ? 'active' : ''} ${offer.status}" data-transfer-offer="${offer.id}" data-management-target-id="transfer:${escapeCareerHtml(offer.id)}"><span>${escapeCareerHtml(offer.clubName)}</span><strong>${escapeCareerHtml(player?.name || 'Former player')}</strong><small>${teamCredits(offer.amount)} <i class="transfer-status-chip ${offer.status}">${escapeCareerHtml(statusLabel(offer.status))}</i></small></button>`;
    }).join('') : '<div class="team-empty-state compact"><strong>NO OFFERS RECEIVED</strong><p>Rival clubs may submit bids as player value, form and transfer interest increase.</p></div>';
    const detail = selected ? (() => {
      const player = transferSquadPlayer(selected.playerId);
      const canNegotiate = Boolean(player && ['pending','countered'].includes(selected.status));
      const canRespond = Boolean(player && ['pending','countered','agreed'].includes(selected.status));
      const counterFeedback = selected.lastCounterSubmitted ? `<div class="transfer-counter-feedback ${escapeCareerHtml(selected.status)}"><span>COUNTER-OFFER SENT</span><strong>${teamCredits(selected.lastCounterSubmitted)} SUBMITTED</strong><small>${escapeCareerHtml(selected.lastCounterResponse || selected.message || 'The buying club reviewed your requested fee.')}</small></div>` : '';
      return `<article class="transfer-offer-detail ${selected.status}" data-management-target-id="transfer:${escapeCareerHtml(selected.id)}"><span>${escapeCareerHtml(selected.clubName)} <i class="transfer-status-chip ${selected.status}">${escapeCareerHtml(statusLabel(selected.status))}</i></span><h3>${escapeCareerHtml(player?.name || 'TRANSFER COMPLETED')}</h3>${counterFeedback}<p>${escapeCareerHtml(selected.message || '')}</p><div class="transfer-offer-amount"><small>CURRENT BID</small><strong>${teamCredits(selected.amount)}</strong></div>${canNegotiate ? `<div class="transfer-counter-control"><span>YOUR COUNTER</span><div><button data-transfer-counter="${selected.id}" data-transfer-direction="-1">−</button><strong>${teamCredits(selected.counterAmount || selected.amount)}</strong><button data-transfer-counter="${selected.id}" data-transfer-direction="1">+</button></div></div>` : ''}${canRespond ? `<footer class="${canNegotiate ? 'three-actions' : 'two-actions'}"><button class="menu-danger-trigger" data-transfer-reject="${selected.id}">REJECT</button>${canNegotiate ? `<button data-transfer-submit-counter="${selected.id}">SEND COUNTER-OFFER</button>` : ''}<button class="primary" data-transfer-accept="${selected.id}">ACCEPT ${teamCredits(selected.amount)}</button></footer>` : ''}</article>`;
    })() : '<article class="transfer-offer-detail"><strong>SELECT AN OFFER</strong><p>Review incoming bids from rival clubs here.</p></article>';
    return `<section class="transfer-outgoing-panel"><div class="career-section-head"><div><span>RIVAL CLUB INTEREST</span><strong>OFFERS FOR YOUR PLAYERS</strong></div><p>Offers expire after several simulated days. Pending responses now carry a highlighted action-required status so they stand out from resolved bids.</p></div><div class="transfer-offer-layout"><div class="transfer-offer-list">${rows}</div>${detail}</div></section>`;
  }

  function renderTransferCentreTab() {
    ensureTransferState();
    const incoming = transferState().activeIncoming;
    const pending = transferPendingOutgoingCount();
    return `${renderClubCalendarStrip()}<div class="menu-hero career-hero transfer-centre-hero"><div class="menu-hero-main menu-briefing-panel"><div class="menu-kicker">PLAYER TRADING & CONTRACT TALKS</div><h2>TRANSFER CENTRE</h2><p>Negotiate incoming fees, wages and contract length, then respond to bids for your own squad. Nothing is completed until you confirm the final agreement.</p><div class="menu-pill-row"><span class="menu-pill">${incoming ? '1 ACTIVE NEGOTIATION' : 'NO ACTIVE NEGOTIATION'}</span><span class="menu-pill">${pending} ACTIVE BID${pending === 1 ? '' : 'S'}</span><span class="menu-pill">${teamCredits(careerState.credits)} BALANCE</span><span class="menu-pill">${teamCredits(clubTotalWageBill())} / ${teamCredits(careerState.wageBudget)} WAGES</span></div></div><div class="menu-hero-side"><div class="menu-kicker">TRANSFER WINDOW</div><div class="menu-side-operator">OPEN</div><p>${leagueDivisionDefinition().short} market access</p></div></div>
      <section class="transfer-incoming-panel"><div class="career-section-head"><div><span>RECRUITMENT TALKS</span><strong>INCOMING PLAYER</strong></div><p>Balance transfer fee, weekly wage and contract length. Stronger overall packages are more likely to be accepted.</p></div>${renderIncomingNegotiation()}</section>
      ${renderOutgoingOffers()}`;
  }

  function handleTransferClick(event) {
    const start = event.target.closest('[data-transfer-start]');
    if (start) {
      const result = startIncomingTransferNegotiation(start.dataset.transferStart);
      if (result.ok) showStatus('NEGOTIATION OPENED');
      else showManagementBlocked('NEGOTIATION COULD NOT OPEN', result.reason || 'This player negotiation is currently unavailable.', { returnFocus: start });
      return true;
    }
    const adjust = event.target.closest('[data-transfer-adjust]');
    if (adjust) { adjustIncomingTransfer(adjust.dataset.transferAdjust, Number(adjust.dataset.transferDirection)); return true; }
    const action = event.target.closest('[data-transfer-action]');
    if (action) {
      const id = action.dataset.transferAction;
      if (id === 'submit-incoming') {
        const result = submitIncomingTransferOffer();
        if (!result.status) {
          showManagementBlocked('OFFER COULD NOT BE SUBMITTED', result.reason || 'There is no active player negotiation to submit.', { returnFocus: action });
        } else {
          const title = result.status === 'agreed' ? 'TERMS AGREED' : result.status === 'rejected' ? 'NEGOTIATION REJECTED' : 'COUNTER-OFFER RECEIVED';
          showStatus(title);
          showIncomingTransferResponseModal(result, action);
        }
      } else if (id === 'complete-incoming') {
        const result = completeIncomingTransfer();
        if (result.ok) showStatus(`${result.player.name.toUpperCase()} SIGNED`);
        showIncomingTransferCompletionModal(result, action);
      } else if (id === 'withdraw-incoming') {
        withdrawIncomingTransfer();
        showStatus('NEGOTIATION CLOSED');
      }
      return true;
    }
    const offer = event.target.closest('[data-transfer-offer]');
    if (offer) { selectOutgoingTransferOffer(offer.dataset.transferOffer); return true; }
    const counter = event.target.closest('[data-transfer-counter]');
    if (counter) { adjustOutgoingCounter(counter.dataset.transferCounter, Number(counter.dataset.transferDirection)); return true; }
    const submitCounter = event.target.closest('[data-transfer-submit-counter]');
    if (submitCounter) {
      const result = submitOutgoingCounter(submitCounter.dataset.transferSubmitCounter);
      if (!result.status) {
        showManagementBlocked('COUNTER-OFFER UNAVAILABLE', result.reason || 'This transfer offer can no longer be negotiated.', { returnFocus: submitCounter });
      } else {
        const title = result.status === 'agreed' ? 'COUNTER-OFFER ACCEPTED' : result.status === 'rejected' ? 'BID WITHDRAWN' : 'FINAL COUNTER RECEIVED';
        showStatus(title);
        showManagementNotice({ kicker: 'COUNTER-OFFER SENT', title, body: result.message || `${result.clubName || 'The buying club'} reviewed your counter-offer.`, footer: result.submittedAmount ? `${teamCredits(result.submittedAmount)} REQUESTED FOR ${String(result.playerName || 'PLAYER').toUpperCase()}` : '', tone: result.status === 'agreed' ? 'success' : result.status === 'rejected' ? 'danger' : 'warning', glyph: result.status === 'agreed' ? '✓' : '↗', returnFocus: submitCounter });
      }
      return true;
    }
    const reject = event.target.closest('[data-transfer-reject]');
    if (reject) {
      const rejected = rejectOutgoingTransferOffer(reject.dataset.transferReject);
      if (rejected) showStatus('TRANSFER BID REJECTED');
      else showManagementBlocked('OFFER UNAVAILABLE', 'This bid has expired, been withdrawn or already been resolved.', { returnFocus: reject });
      return true;
    }
    const accept = event.target.closest('[data-transfer-accept]');
    if (accept) {
      const result = acceptOutgoingTransferOffer(accept.dataset.transferAccept);
      if (result.ok) showStatus(`${result.player.name.toUpperCase()} SOLD`);
      else showManagementBlocked('TRANSFER COULD NOT BE COMPLETED', result.reason || 'This offer can no longer be accepted.', { returnFocus: accept });
      return true;
    }
    return false;
  }

  function ensureTransferState() {
    if (!careerState.created) return null;
    transferState();
    transferExpireOffers();
    return careerState.transfers;
  }

  ensureTransferState();
