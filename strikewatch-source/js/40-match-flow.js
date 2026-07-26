/*
 * Strikewatch source module: 40-match-flow.js
 * Purpose: Rounds, scoring, spawning, elimination flow, feed messages and spectator selection.
 *
 * This file is a source fragment. Run `python3 build.py` to regenerate
 * js/strikewatch.dev.js and the standalone release in dist/.
 */

  const betweenRoundTacticsState = {
    open: false,
    resolved: true,
    sourceRound: 0,
    winner: null,
    reason: '',
    base: null,
    draft: null,
    roundStats: null,
    insight: null,
    diagnoses: [],
    opponentAdaptation: null,
    message: ''
  };

  const NEW_PLAYER_CONCEPT_KEY = 'new-player-concept';
  const NEW_PLAYER_DEMO_COMPLETE_KEY = 'new-player-demo-complete';
  const NEW_PLAYER_DEMO_SKIPPED_KEY = 'new-player-demo-skipped';
  const NEW_PLAYER_DEMO_COMPLETE_BODY = 'This round was for orientation only: it did not change your record, finances, operator condition or league position. In the real career you will recruit your own five operators, prepare them and play first-to-three matches.';
  const NEW_PLAYER_DEMO_COMPLETE_FOCUS = 'NEXT: OPEN RECRUITMENT AND BUILD YOUR OWN ACTIVE FIVE OPERATORS.';
  const newPlayerDemoState = {
    active: false,
    paused: false,
    stage: 0,
    elapsed: 0,
    roundFinished: false,
    winner: null,
    reason: '',
    priorArenaId: null
  };

  const careerMatchMomentState = {
    queue: [],
    current: null,
    timer: 0,
    seen: new Set(),
    aliveKey: '',
    pendingAdjustment: null,
    firstCareerMatch: false,
    roundLiveElapsed: 0,
    roundEliminations: 0,
    roundMomentCount: 0
  };

  function resetCareerMatchMoments() {
    careerMatchMomentState.queue.length = 0;
    careerMatchMomentState.current = null;
    careerMatchMomentState.timer = 0;
    careerMatchMomentState.seen = new Set();
    careerMatchMomentState.aliveKey = '';
    careerMatchMomentState.pendingAdjustment = null;
    careerMatchMomentState.firstCareerMatch = Boolean(!newPlayerDemoState.active && Number(careerState.totalMatches || 0) === 0);
    careerMatchMomentState.roundLiveElapsed = 0;
    careerMatchMomentState.roundEliminations = 0;
    careerMatchMomentState.roundMomentCount = 0;
    if (careerMatchMomentEl) {
      careerMatchMomentEl.hidden = true;
      careerMatchMomentEl.className = 'career-match-moment';
    }
    if (typeof updateMatchCommentaryPresentation === 'function') updateMatchCommentaryPresentation();
  }

  function showNextCareerMatchMoment() {
    if (careerMatchMomentState.current || !careerMatchMomentState.queue.length || !careerMatchMomentEl) return false;
    const moment = careerMatchMomentState.queue.shift();
    careerMatchMomentState.current = moment;
    careerMatchMomentState.timer = Math.max(1.8, Number(moment.duration) || 3.1);
    if (careerMatchMomentKickerEl) careerMatchMomentKickerEl.textContent = moment.kicker || 'MATCH MOMENT';
    if (careerMatchMomentTitleEl) careerMatchMomentTitleEl.textContent = moment.title || 'TACTICAL UPDATE';
    if (careerMatchMomentDetailEl) careerMatchMomentDetailEl.textContent = moment.detail || '';
    careerMatchMomentEl.className = `career-match-moment show ${String(moment.tone || 'neutral').replace(/[^a-z-]/g, '')}`;
    careerMatchMomentEl.hidden = false;
    if (typeof updateMatchCommentaryPresentation === 'function') updateMatchCommentaryPresentation();
    if (typeof playMatchMomentCue === 'function') playMatchMomentCue(moment.tone || 'neutral');
    return true;
  }

  function queueCareerMatchMoment(key, kicker, title, detail, tone = 'neutral', duration = 3.1, priority = false) {
    if (newPlayerDemoState.active || !careerState.created || careerMatchMomentState.seen.has(key)) return false;
    careerMatchMomentState.seen.add(key);
    const item = { key, kicker, title, detail, tone, duration };
    if (priority) careerMatchMomentState.queue.unshift(item);
    else careerMatchMomentState.queue.push(item);
    showNextCareerMatchMoment();
    return true;
  }


  function recordCareerMatchHighlight(event = {}) {
    if (newPlayerDemoState.active || !careerState.created || !careerMatchStats) return null;
    const entry = {
      id: String(event.id || `${event.type || 'moment'}:${roundNumber}:${Number(simulationClock || 0).toFixed(2)}`),
      type: String(event.type || 'moment'),
      label: String(event.label || event.kicker || 'MATCH MOMENT'),
      title: String(event.title || 'TACTICAL MOMENT'),
      detail: String(event.detail || ''),
      tone: String(event.tone || 'neutral'),
      round: Math.max(1, Math.round(Number(event.round) || Number(roundNumber) || 1)),
      at: Number.isFinite(Number(event.at)) ? Number(event.at) : Number(Number(simulationClock || 0).toFixed(2)),
      playerId: event.playerId ? String(event.playerId) : null,
      playerName: event.playerName ? String(event.playerName) : null,
      team: Number.isFinite(Number(event.team)) ? Number(event.team) : null,
      priority: Math.max(0, Math.round(Number(event.priority) || 0)),
      evidence: event.evidence && typeof event.evidence === 'object' ? { ...event.evidence } : {}
    };
    careerMatchStats.matchMoments = Array.isArray(careerMatchStats.matchMoments) ? careerMatchStats.matchMoments : [];
    if (!careerMatchStats.matchMoments.some(item => item.id === entry.id)) careerMatchStats.matchMoments.push(entry);
    careerMatchStats.matchMoments = careerMatchStats.matchMoments.slice(-48);
    return entry;
  }

  function queueCareerEvidenceMoment(key, kicker, title, detail, tone = 'neutral', duration = 3.1, priority = false, evidence = {}) {
    const recorded = recordCareerMatchHighlight({
      id: key,
      type: evidence.type || 'moment',
      label: kicker,
      title,
      detail,
      tone,
      round: evidence.round || roundNumber,
      at: evidence.at,
      playerId: evidence.playerId,
      playerName: evidence.playerName,
      team: evidence.team,
      priority: evidence.priority || (priority ? 70 : 45),
      evidence
    });
    const queued = queueCareerMatchMoment(key, kicker, title, detail, tone, duration, priority);
    return recorded || queued;
  }

  function careerEliminationDistance(killer, victim) {
    if (!killer || !victim) return 0;
    return Math.hypot((Number(killer.x) || 0) - (Number(victim.x) || 0), (Number(killer.y) || 0) - (Number(victim.y) || 0));
  }

  function recordCareerEliminationMoment(killer, victim, hit = null, tradeKill = false) {
    if (!killer || !victim || newPlayerDemoState.active || !careerState.created) return null;
    careerMatchMomentState.roundEliminations += 1;
    const ownedKill = killer.team === CAREER_OWNED_TEAM && Boolean(killer.isPlayerOwned);
    const opening = careerMatchMomentState.roundEliminations === 1;
    const distance = careerEliminationDistance(killer, victim);
    const weapon = killer.weapon || killer.primaryWeapon || null;
    const rangeBand = typeof careerWeaponPresentation === 'function' ? String(careerWeaponPresentation(weapon).rangeBand || '') : '';
    const longRange = distance >= 12.5 && /LONG|RANGE|MARKSMAN|DISTANCE/i.test(`${rangeBand} ${weapon?.category || ''}`);
    const flankKill = ownedKill && (/flank/i.test(String(killer.combatApproachKind || '')) || /flank|wide route|second angle/i.test(String(killer.combatApproachReason || killer.tacticalReason || '')));
    const ownedAlive = typeof teamAliveCount === 'function' ? teamAliveCount(CAREER_OWNED_TEAM) : 0;
    const oppositionTeam = CAREER_OWNED_TEAM === TEAM_BLUE ? TEAM_RED : TEAM_BLUE;
    const oppositionAlive = typeof teamAliveCount === 'function' ? teamAliveCount(oppositionTeam) : 0;
    const clutchWin = ownedKill && ownedAlive === 1 && oppositionAlive === 0;
    const baseEvidence = {
      playerId: killer.playerProfileId || null,
      playerName: killer.name || 'Operator',
      team: killer.team,
      victimName: victim.name || 'Opposition operator',
      distance: Number(distance.toFixed(1)),
      weaponId: weapon?.id || null,
      weaponName: weapon?.name || null,
      headshot: Boolean(hit?.headshot),
      critical: Boolean(hit?.critical),
      opening,
      tradeKill: Boolean(tradeKill),
      flankKill,
      longRange,
      clutchWin
    };
    const candidates = [];
    if (opening) candidates.push({ type: 'opening', kicker: ownedKill ? 'OPENING ELIMINATION' : 'EARLY SETBACK', title: ownedKill ? 'FIRST CONTACT WON' : 'OPPOSITION STRIKES FIRST', detail: ownedKill ? `${String(killer.name || 'OPERATOR').toUpperCase()} GIVES YOUR ACTIVE FIVE THE EARLY ADVANTAGE` : `${String(victim.name || 'YOUR OPERATOR').toUpperCase()} FALLS IN THE FIRST CONTACT`, tone: ownedKill ? 'advantage' : 'danger', priority: 58 });
    if (ownedKill && tradeKill) candidates.push({ type: 'trade', kicker: 'TRADE CONVERTED', title: 'IMMEDIATE RESPONSE', detail: `${String(killer.name || 'OPERATOR').toUpperCase()} ANSWERS A TEAM-MATE LOSS BEFORE THE OPPOSITION CAN RESET`, tone: 'advantage', priority: 76 });
    if (flankKill) candidates.push({ type: 'flank', kicker: 'FLANK SUCCESS', title: 'SECOND ANGLE CONNECTS', detail: `${String(killer.name || 'OPERATOR').toUpperCase()} CONVERTS A WIDE ROUTE INTO AN ELIMINATION`, tone: 'advantage', priority: 72 });
    if (ownedKill && longRange) candidates.push({ type: 'long-range', kicker: 'LONG-RANGE ELIMINATION', title: `${distance.toFixed(1)}M PICK`, detail: `${String(killer.name || 'OPERATOR').toUpperCase()} USES ${String(weapon?.name || 'THE EQUIPPED WEAPON').toUpperCase()} AT ITS INTENDED DISTANCE`, tone: 'coach', priority: 68 });
    if (clutchWin) candidates.push({ type: 'clutch', kicker: 'CLUTCH WON', title: 'LAST OPERATOR CLOSES THE ROUND', detail: `${String(killer.name || 'OPERATOR').toUpperCase()} SURVIVES THE FINAL DUEL AND SECURES THE ROUND`, tone: 'clutch', priority: 100 });
    for (const candidate of candidates) {
      recordCareerMatchHighlight({
        id: `${candidate.type}:${roundNumber}:${killer.playerProfileId || killer.name}:${careerMatchMomentState.roundEliminations}`,
        type: candidate.type,
        label: candidate.kicker,
        title: candidate.title,
        detail: candidate.detail,
        tone: candidate.tone,
        playerId: killer.playerProfileId || null,
        playerName: killer.name || null,
        team: killer.team,
        priority: candidate.priority,
        evidence: baseEvidence
      });
    }
    const live = candidates.slice().sort((a, b) => b.priority - a.priority)[0] || null;
    if (live && careerMatchMomentState.roundMomentCount < 3) {
      careerMatchMomentState.roundMomentCount += 1;
      queueCareerMatchMoment(`live:${live.type}:${roundNumber}:${careerMatchMomentState.roundEliminations}`, live.kicker, live.title, live.detail, live.tone, live.type === 'clutch' ? 3.8 : 3.0, live.priority >= 76);
    }
    return { ...baseEvidence, candidates: candidates.map(item => item.type) };
  }

  function careerRoundDecision(stats = {}, winner = null) {
    const draw = winner !== TEAM_BLUE && winner !== TEAM_RED;
    const won = winner === CAREER_OWNED_TEAM;
    const supported = Math.max(0, Number(stats.supportedTime) || 0);
    const isolated = Math.max(0, Number(stats.isolatedTime) || 0);
    const supportRate = supported + isolated > 0 ? supported / (supported + isolated) : 0.5;
    const shots = Math.max(0, Number(stats.shotsFired) || 0);
    const accuracy = shots > 0 ? Math.max(0, Number(stats.shotsHit) || 0) / shots : 0;
    const tradeAttempts = Math.max(0, Math.round(Number(stats.tradeAttempts) || 0));
    const tradeKills = Math.max(0, Math.round(Number(stats.tradeKills) || 0));
    const tradeRate = tradeAttempts > 0 ? tradeKills / tradeAttempts : 0;
    const damageDealt = Math.max(0, Number(stats.damageDealt) || 0);
    const damageTaken = Math.max(0, Number(stats.damageTaken) || 0);
    const survivors = Math.max(0, Math.round(Number(stats.survivors) || 0));
    let decision;
    if (draw) decision = { title: 'EVEN MARGINS', detail: 'Neither active five converted the final engagement before the round ended.', tone: 'neutral', factor: 'draw' };
    else if (won && survivors === 1) decision = { title: 'LAST-OPERATOR COMPOSURE', detail: 'One operator survived the decisive final contact.', tone: 'clutch', factor: 'clutch' };
    else if (won && tradeKills >= 2 && tradeRate >= 0.40) decision = { title: 'COORDINATED TRADES', detail: `${tradeKills} trade eliminations stopped the opposition from building momentum.`, tone: 'advantage', factor: 'trade' };
    else if (won && supportRate >= 0.62) decision = { title: 'SUPPORTED PRESSURE', detail: `${Math.round(supportRate * 100)}% supported movement kept nearby responses available.`, tone: 'advantage', factor: 'support' };
    else if (won && shots >= 8 && accuracy >= 0.42) decision = { title: 'CLEANER ENGAGEMENTS', detail: `${Math.round(accuracy * 100)}% accuracy converted the better firing windows.`, tone: 'advantage', factor: 'accuracy' };
    else if (won && damageDealt > damageTaken * 1.15) decision = { title: 'DAMAGE CONTROL', detail: `${Math.round(damageDealt)} damage dealt against ${Math.round(damageTaken)} received.`, tone: 'advantage', factor: 'damage' };
    else if (!won && supportRate < 0.44) decision = { title: 'ISOLATED CONTACTS', detail: `Supported movement fell to ${Math.round(supportRate * 100)}%, leaving too many deaths difficult to answer.`, tone: 'danger', factor: 'isolation' };
    else if (!won && tradeAttempts >= 2 && tradeRate < 0.30) decision = { title: 'MISSED TRADE WINDOWS', detail: `${tradeKills} of ${tradeAttempts} trade opportunities became eliminations.`, tone: 'danger', factor: 'trade' };
    else if (!won && shots >= 8 && accuracy < 0.31) decision = { title: 'LOW-QUALITY SHOTS', detail: `${Math.round(accuracy * 100)}% accuracy limited damage during contested contacts.`, tone: 'danger', factor: 'accuracy' };
    else if (!won && damageTaken > damageDealt * 1.18) decision = { title: 'HEALTH TRADES LOST', detail: `${Math.round(damageTaken)} damage received against ${Math.round(damageDealt)} dealt.`, tone: 'danger', factor: 'damage' };
    else decision = { title: won ? 'MARGINS CONTROLLED' : 'MARGINS LOST', detail: won ? 'No single factor dominated; the team won more of the decisive engagements.' : 'No single system failed; a small number of engagements decided the round.', tone: won ? 'advantage' : 'neutral', factor: 'margins' };
    const entry = { ...decision, round: roundNumber, won, draw, supportRate: Math.round(supportRate * 100), tradeAttempts, tradeKills, accuracy: Math.round(accuracy * 100), damageDealt: Math.round(damageDealt), damageTaken: Math.round(damageTaken), survivors };
    careerMatchStats.roundDecisions = Array.isArray(careerMatchStats.roundDecisions) ? careerMatchStats.roundDecisions : [];
    careerMatchStats.roundDecisions.push(entry);
    recordCareerMatchHighlight({
      id: `round-decision:${roundNumber}`,
      type: 'round-decision',
      label: draw ? 'ROUND DRAWN' : (won ? 'ROUND WON' : 'ROUND LOST'),
      title: entry.title,
      detail: entry.detail,
      tone: entry.tone,
      priority: entry.factor === 'clutch' ? 92 : entry.tone === 'danger' ? 64 : 60,
      evidence: { ...entry }
    });
    return entry;
  }

  function updateCareerMatchMoment(dt) {
    if (careerMatchMomentState.current) {
      careerMatchMomentState.timer = Math.max(0, careerMatchMomentState.timer - Math.max(0, Number(dt) || 0));
      if (careerMatchMomentState.timer <= 0) {
        careerMatchMomentState.current = null;
        if (careerMatchMomentEl) careerMatchMomentEl.classList.remove('show');
        if (!showNextCareerMatchMoment() && careerMatchMomentEl) careerMatchMomentEl.hidden = true;
        if (typeof updateMatchCommentaryPresentation === 'function') updateMatchCommentaryPresentation();
      }
    } else showNextCareerMatchMoment();
  }

  function firstMatchViewedOperator() {
    const viewed = bots[spectatorIndex];
    if (viewed?.team === CAREER_OWNED_TEAM) return viewed;
    return bots.find(bot => bot.team === CAREER_OWNED_TEAM && bot.alive) || bots.find(bot => bot.team === CAREER_OWNED_TEAM) || null;
  }

  function updateCareerMatchContextMoments(blueAlive, redAlive, dt) {
    if (newPlayerDemoState.active || roundEnding || matchEnding || roundFreezeTimer > 0) return;
    careerMatchMomentState.roundLiveElapsed += Math.max(0, Number(dt) || 0);
    const ownedAlive = CAREER_OWNED_TEAM === TEAM_BLUE ? blueAlive : redAlive;
    const oppositionAlive = CAREER_OWNED_TEAM === TEAM_BLUE ? redAlive : blueAlive;
    const aliveKey = `${roundNumber}:${ownedAlive}:${oppositionAlive}`;
    if (aliveKey !== careerMatchMomentState.aliveKey) {
      careerMatchMomentState.aliveKey = aliveKey;
      if (ownedAlive === 1 && oppositionAlive === 1) {
        queueCareerMatchMoment(`duel:${roundNumber}`, 'FINAL DUEL', 'CLUTCH OPPORTUNITY', '1 VS 1 · ONE ELIMINATION DECIDES THE ROUND', 'clutch', 3.5, true);
      } else if (ownedAlive === 1 && oppositionAlive > 1) {
        queueCareerMatchMoment(`last:${roundNumber}`, 'LAST OPERATOR', `1 VS ${oppositionAlive}`, 'YOUR FINAL OPERATOR MUST SURVIVE AND ELIMINATE THE REMAINING OPPOSITION', 'danger', 3.7, true);
      } else if (oppositionAlive === 1 && ownedAlive > 1) {
        queueCareerMatchMoment(`close:${roundNumber}`, 'CLOSE OUT THE ROUND', `${ownedAlive} VS 1`, 'MAINTAIN SEPARATE LANES AND DENY THE LAST OPPOSING OPERATOR A CLUTCH', 'advantage', 3.2, true);
      }
    }
    if (roundNumber === 1) {
      const plan = typeof clubActiveMatchPlan === 'function' ? clubActiveMatchPlan() : null;
      const preparation = plan?.opponentPreparation || null;
      if (preparation && careerMatchMomentState.roundLiveElapsed >= 4.2) {
        const scoutingRead = preparation.planRevealed === false
          ? `${String(preparation.identityName || 'OPPOSITION PROFILE').toUpperCase()} · EXACT SHAPE AND TEMPO REMAIN UNCONFIRMED.`
          : `${String(preparation.identityName || 'OPPOSITION PROFILE').toUpperCase()} · EXPECTED ${String(preparation.expectedApproach || 'BALANCED').toUpperCase()} TEMPO AND ${String(preparation.expectedEngagement || 'MIXED').toUpperCase()} RANGE.`;
        queueCareerMatchMoment('opponent-watch', 'OPPOSITION WATCH', preparation.expectedRoute || 'MIXED ROUTES', scoutingRead, 'coach', 4.1);
      }
      if (preparation && careerMatchMomentState.roundLiveElapsed >= 12.5) {
        queueCareerMatchMoment('response-plan', 'MANAGER RESPONSE', String(preparation.response?.title || 'CUSTOM PLAN').toUpperCase(), `${String(preparation.response?.upside || 'THE ACTIVE FIVE OPERATORS ARE EXECUTING THE CONFIRMED RESPONSE.').toUpperCase()}`, 'advantage', 4.0);
      }
    }
    if (careerMatchMomentState.firstCareerMatch && roundNumber === 1) {
      const bot = firstMatchViewedOperator();
      const player = bot?.playerProfileId ? teamPlayerById(bot.playerProfileId) : null;
      const role = player ? clubMatchRoleForPlayer(player) : teamRoleById(bot?.assignedRole || 'flex');
      const weapon = bot?.weapon || bot?.primaryWeapon || getCareerWeapon(player ? careerPlayerActiveWeaponId(player) : 'scrap-p12');
      const presentation = careerWeaponPresentation(weapon);
      if (careerMatchMomentState.roundLiveElapsed >= 1.2) {
        queueCareerMatchMoment('first-role', 'ROLE IN ACTION', `${String(role?.name || 'FLEX').toUpperCase()} RESPONSIBILITY`, `${String(bot?.name || player?.name || 'THIS OPERATOR').toUpperCase()} IS CHOOSING POSITION AND CONTACTS THROUGH THE ${String(role?.name || 'FLEX').toUpperCase()} ROLE YOU ASSIGNED.`, 'coach', 4.2);
      }
      if (careerMatchMomentState.roundLiveElapsed >= 8.5) {
        queueCareerMatchMoment('first-range', 'WEAPON RANGE', `${String(presentation.rangeBand || 'ADAPTIVE RANGE').toUpperCase()}`, `${String(weapon?.name || 'THE EQUIPPED WEAPON').toUpperCase()} SHAPES WHICH DISTANCES THIS OPERATOR SEEKS, HOLDS OR TRIES TO CLOSE.`, 'coach', 4.2);
      }
      if (careerMatchMomentState.roundLiveElapsed >= 16.0) {
        const plan = typeof clubActiveMatchPlan === 'function' ? clubActiveMatchPlan() : null;
        queueCareerMatchMoment('first-response', 'TACTICAL RESPONSE', 'THE PLAN GUIDES · THE OPERATOR REACTS', `${String(plan?.approachName || 'BALANCED').toUpperCase()} AND ${String(plan?.priorityName || 'TRADE ELIMINATIONS').toUpperCase()} SHAPE THE DECISION, BUT VISIBLE ENEMIES, SOUND AND DANGER CAN CHANGE THE ROUTE.`, 'coach', 4.6);
      }
    }
  }

  const NEW_PLAYER_DEMO_STEPS = [
    {
      title: 'YOU ARE THE MANAGER, NOT THE SHOOTER',
      body: 'You watch the match through one operator\'s viewpoint. The operators control their own movement, aiming and shooting.',
      focus: 'LOOK AT THE SPECTATOR NAME, HEALTH, WEAPON AND LIVE INTENTION.',
      action: 'SHOW THE ROUND GOAL',
      paused: true
    },
    {
      title: 'WIN THE ROUND BY ELIMINATING THE OTHER FIVE',
      body: 'Each team deploys five operators and there are no respawns during the round. A normal match is first to three round wins; this orientation ends after one round.',
      focus: 'THE TOP SCOREBOARD SHOWS THE ROUND, ALIVE OPERATORS, SCORE AND CLOCK.',
      action: 'WATCH THE OPERATORS MOVE',
      paused: true
    },
    {
      title: 'YOUR PREPARATION SHAPES THEIR DECISIONS',
      body: 'Roles, weapons, armour and the tactical plan affect where operators move, which fights they seek and how closely they support team-mates. They still react independently to what they can see and hear.',
      focus: 'THE ROUND OBJECTIVE SUMMARISES THE PLAN YOUR OPERATORS ARE EXECUTING.',
      action: 'EXPLAIN THE LIVE INTENTION',
      paused: true
    },
    {
      title: 'THE LIVE INTENTION EXPLAINS WHAT YOU ARE WATCHING',
      body: 'The intention label changes as the spectated operator advances, holds cover, investigates sound, reloads, switches weapon or engages a visible enemy.',
      focus: 'USE THE LEFT AND RIGHT SPECTATOR BUTTONS TO FOLLOW ANOTHER LIVING OPERATOR.',
      action: 'WATCH THE ROUND',
      paused: true
    }
  ];

  function ensureNewPlayerTutorialFlags() {
    careerState.tutorial = careerState.tutorial && typeof careerState.tutorial === 'object'
      ? careerState.tutorial
      : makeDefaultCareerTutorialState();
    careerState.tutorial.contextSeen = careerState.tutorial.contextSeen && typeof careerState.tutorial.contextSeen === 'object' && !Array.isArray(careerState.tutorial.contextSeen)
      ? careerState.tutorial.contextSeen
      : {};
    return careerState.tutorial.contextSeen;
  }

  function newPlayerTutorialFlag(key) {
    return Boolean(careerState.tutorial?.contextSeen?.[key]);
  }

  function setNewPlayerTutorialFlag(key, value = true) {
    ensureNewPlayerTutorialFlags()[key] = Boolean(value);
    saveCareerState();
  }

  function newPlayerIntroEligible() {
    return Boolean(
      careerState.created &&
      Number(careerState.totalMatches || 0) === 0 &&
      (careerState.squad || []).length === 0 &&
      !newPlayerTutorialFlag(NEW_PLAYER_DEMO_COMPLETE_KEY) &&
      !newPlayerTutorialFlag(NEW_PLAYER_DEMO_SKIPPED_KEY) &&
      !newPlayerDemoState.active
    );
  }

  function openNewPlayerIntro() {
    if (!newPlayerIntroOverlayEl || !newPlayerIntroEligible() || appState !== 'menu' || menuContext !== 'main') return false;
    newPlayerIntroOverlayEl.hidden = false;
    newPlayerIntroOverlayEl.setAttribute('aria-hidden', 'false');
    document.body.dataset.newPlayerIntro = 'open';
    newPlayerIntroStartBtn?.focus({ preventScroll: true });
    return true;
  }

  function closeNewPlayerIntro(skipped = false) {
    if (newPlayerIntroOverlayEl) {
      newPlayerIntroOverlayEl.hidden = true;
      newPlayerIntroOverlayEl.setAttribute('aria-hidden', 'true');
    }
    delete document.body.dataset.newPlayerIntro;
    setNewPlayerTutorialFlag(NEW_PLAYER_CONCEPT_KEY, true);
    if (skipped) {
      setNewPlayerTutorialFlag(NEW_PLAYER_DEMO_SKIPPED_KEY, true);
      if (typeof setMenuRoute === 'function') setMenuRoute('market');
      showStatus('OPEN RECRUITMENT AND BUILD YOUR ACTIVE FIVE OPERATORS');
    }
  }

  function newPlayerDemoSimulationPaused() {
    return Boolean(newPlayerDemoState.active && newPlayerDemoState.paused);
  }

  function renderNewPlayerDemoCoach() {
    if (!newPlayerDemoCoachEl || !newPlayerDemoState.active) return false;
    const finalStep = newPlayerDemoState.roundFinished;
    if (finalStep) {
      const won = newPlayerDemoState.winner === CAREER_OWNED_TEAM;
      if (newPlayerDemoKickerEl) newPlayerDemoKickerEl.textContent = 'GUIDED DEMO ROUND · COMPLETE';
      if (newPlayerDemoTitleEl) newPlayerDemoTitleEl.textContent = won ? 'YOUR DEMO TEAM WON THE ROUND' : 'THE DEMO ROUND IS COMPLETE';
      if (newPlayerDemoBodyEl) newPlayerDemoBodyEl.textContent = NEW_PLAYER_DEMO_COMPLETE_BODY;
      if (newPlayerDemoFocusEl) newPlayerDemoFocusEl.textContent = NEW_PLAYER_DEMO_COMPLETE_FOCUS;
      if (newPlayerDemoNextBtn) newPlayerDemoNextBtn.textContent = 'START RECRUITING OPERATORS';
      if (newPlayerDemoSkipBtn) {
        newPlayerDemoSkipBtn.hidden = true;
        newPlayerDemoSkipBtn.setAttribute('aria-hidden', 'true');
      }
    } else {
      const step = NEW_PLAYER_DEMO_STEPS[clamp(newPlayerDemoState.stage, 0, NEW_PLAYER_DEMO_STEPS.length - 1)];
      if (newPlayerDemoKickerEl) newPlayerDemoKickerEl.textContent = `GUIDED DEMO ROUND · ${newPlayerDemoState.stage + 1} / ${NEW_PLAYER_DEMO_STEPS.length}`;
      if (newPlayerDemoTitleEl) newPlayerDemoTitleEl.textContent = step.title;
      if (newPlayerDemoBodyEl) newPlayerDemoBodyEl.textContent = step.body;
      if (newPlayerDemoFocusEl) newPlayerDemoFocusEl.textContent = step.focus;
      if (newPlayerDemoNextBtn) newPlayerDemoNextBtn.textContent = step.action;
      if (newPlayerDemoSkipBtn) {
        newPlayerDemoSkipBtn.hidden = false;
        newPlayerDemoSkipBtn.setAttribute('aria-hidden', 'false');
        newPlayerDemoSkipBtn.textContent = 'SKIP ORIENTATION';
      }
    }
    newPlayerDemoCoachEl.hidden = false;
    newPlayerDemoCoachEl.setAttribute('aria-hidden', 'false');
    newPlayerDemoCoachEl.dataset.stage = finalStep ? 'complete' : String(newPlayerDemoState.stage + 1);
    return true;
  }

  function hideNewPlayerDemoCoach() {
    if (!newPlayerDemoCoachEl) return;
    newPlayerDemoCoachEl.hidden = true;
    newPlayerDemoCoachEl.setAttribute('aria-hidden', 'true');
    if (newPlayerDemoSkipBtn) {
      newPlayerDemoSkipBtn.hidden = false;
      newPlayerDemoSkipBtn.setAttribute('aria-hidden', 'false');
      newPlayerDemoSkipBtn.textContent = 'SKIP ORIENTATION';
    }
    delete newPlayerDemoCoachEl.dataset.stage;
  }

  function startNewPlayerDemoMatch() {
    if (!newPlayerIntroEligible() || newPlayerDemoState.active) return false;
    closeNewPlayerIntro(false);
    newPlayerDemoState.active = true;
    newPlayerDemoState.paused = true;
    newPlayerDemoState.stage = 0;
    newPlayerDemoState.elapsed = 0;
    newPlayerDemoState.roundFinished = false;
    newPlayerDemoState.winner = null;
    newPlayerDemoState.reason = '';
    newPlayerDemoState.priorArenaId = activeArenaMeta().id;
    document.body.dataset.newPlayerDemo = 'active';
    canResumeMatch = false;
    menuContext = 'main';
    matchSimulationPaused = false;
    setMatchSpeed(1, false);
    setActiveArena('citadel');
    setAppState('match');
    stabiliseMatchRenderViewport();
    createMatch();
    spectatorIndex = bots.findIndex(bot => bot.team === CAREER_OWNED_TEAM && bot.alive);
    if (spectatorIndex < 0) spectatorIndex = 0;
    autoSpectate = false;
    autoTimer = 999;
    renderNewPlayerDemoCoach();
    updateHud();
    showStatus('GUIDED DEMO · PAUSED');
    lastTime = performance.now();
    return true;
  }

  function advanceNewPlayerDemo() {
    if (!newPlayerDemoState.active) return false;
    if (newPlayerDemoState.roundFinished) {
      completeNewPlayerDemo(false);
      return true;
    }
    if (newPlayerDemoState.stage < NEW_PLAYER_DEMO_STEPS.length - 1) {
      newPlayerDemoState.stage++;
      const step = NEW_PLAYER_DEMO_STEPS[newPlayerDemoState.stage];
      newPlayerDemoState.paused = Boolean(step.paused);
      renderNewPlayerDemoCoach();
      showStatus(newPlayerDemoState.paused ? 'GUIDED DEMO · PAUSED' : 'GUIDED DEMO · LIVE');
      return true;
    }
    newPlayerDemoState.paused = false;
    hideNewPlayerDemoCoach();
    showStatus('WATCH THE ROUND · OPERATORS ACT AUTONOMOUSLY');
    return true;
  }

  function finishNewPlayerDemoRound(winner, reason = '') {
    if (!newPlayerDemoState.active) return false;
    newPlayerDemoState.roundFinished = true;
    newPlayerDemoState.paused = true;
    newPlayerDemoState.winner = winner;
    newPlayerDemoState.reason = String(reason || 'Round complete');
    careerBetweenRounds = false;
    careerMatchComplete = false;
    renderNewPlayerDemoCoach();
    newPlayerDemoNextBtn?.focus({ preventScroll: true });
    return true;
  }

  function completeNewPlayerDemo(skipped = false) {
    if (!newPlayerDemoState.active && !skipped) return false;
    if (skipped) setNewPlayerTutorialFlag(NEW_PLAYER_DEMO_SKIPPED_KEY, true);
    else setNewPlayerTutorialFlag(NEW_PLAYER_DEMO_COMPLETE_KEY, true);
    setNewPlayerTutorialFlag(NEW_PLAYER_CONCEPT_KEY, true);
    newPlayerDemoState.active = false;
    newPlayerDemoState.paused = false;
    newPlayerDemoState.stage = 0;
    newPlayerDemoState.elapsed = 0;
    newPlayerDemoState.roundFinished = false;
    newPlayerDemoState.winner = null;
    newPlayerDemoState.reason = '';
    hideNewPlayerDemoCoach();
    delete document.body.dataset.newPlayerDemo;
    const returnArena = arenaMeta(careerState?.tactics?.arenaId || newPlayerDemoState.priorArenaId || 'citadel').id;
    newPlayerDemoState.priorArenaId = null;
    setActiveArena(returnArena);
    createMatch();
    canResumeMatch = false;
    menuContext = 'main';
    matchSimulationPaused = false;
    setAppState('menu');
    if (typeof setMenuRoute === 'function') setMenuRoute('market', { ignoreProgressiveLock: true });
    else {
      menuTab = 'market';
      updateMenuUI();
      resetMenuScroll();
    }
    showStatus(skipped ? 'DEMO SKIPPED · OPEN RECRUITMENT' : 'DEMO COMPLETE · RECRUIT YOUR ACTIVE FIVE OPERATORS');
    lastTime = performance.now();
    return true;
  }

  function skipNewPlayerDemo() {
    if (!newPlayerDemoState.active) return false;
    return completeNewPlayerDemo(true);
  }

  function updateNewPlayerDemo(dt) {
    if (!newPlayerDemoState.active || newPlayerDemoState.paused || newPlayerDemoState.roundFinished) return;
    newPlayerDemoState.elapsed += Math.max(0, Number(dt) || 0);
  }

  function resetBetweenRoundTacticsState() {
    betweenRoundTacticsState.open = false;
    betweenRoundTacticsState.resolved = true;
    betweenRoundTacticsState.sourceRound = 0;
    betweenRoundTacticsState.winner = null;
    betweenRoundTacticsState.reason = '';
    betweenRoundTacticsState.base = null;
    betweenRoundTacticsState.draft = null;
    betweenRoundTacticsState.roundStats = null;
    betweenRoundTacticsState.insight = null;
    betweenRoundTacticsState.diagnoses = [];
    betweenRoundTacticsState.opponentAdaptation = null;
    betweenRoundTacticsState.message = '';
    if (betweenRoundTacticsEl) {
      betweenRoundTacticsEl.hidden = true;
      betweenRoundTacticsEl.setAttribute('aria-hidden', 'true');
    }
  }

  function betweenRoundPlanValue(type, plan = betweenRoundTacticsState.draft) {
    if (!plan) return '';
    if (type === 'approach') return plan.approachId || 'balanced';
    if (type === 'engagement') return plan.engagementId || 'mixed';
    if (type === 'priority') return plan.priorityId || 'trade';
    if (type === 'route') return plan.roundPlanId || plan.openingPlanId || currentEngagementPlan?.id || '';
    return '';
  }

  function betweenRoundChangeTypes(draft = betweenRoundTacticsState.draft, base = betweenRoundTacticsState.base) {
    if (!draft || !base) return [];
    return ['approach', 'engagement', 'priority', 'route'].filter(type => betweenRoundPlanValue(type, draft) !== betweenRoundPlanValue(type, base));
  }

  function betweenRoundRoutePlans() {
    const plans = engagementPlanOptions(activeArenaId);
    const currentId = betweenRoundPlanValue('route', betweenRoundTacticsState.base);
    const insightZone = String(betweenRoundTacticsState.insight?.routeZone || '').toUpperCase();
    return plans
      .map(plan => ({ ...plan, current: plan.id === currentId, recommended: Boolean(insightZone && String(plan.zone || '').toUpperCase() === insightZone) }))
      .sort((a, b) => Number(b.current) - Number(a.current) || Number(b.recommended) - Number(a.recommended) || (Number(b.priority) || 0) - (Number(a.priority) || 0))
      .slice(0, 4);
  }

  function betweenRoundScoutingAccuracy(base = null) {
    const preparation = base?.opponentPreparation || null;
    if (!preparation) return { tone: 'neutral', label: 'NO PRE-MATCH REPORT', title: 'SCOUTING WAS NOT AVAILABLE', detail: 'Use the live round evidence rather than assuming an opponent profile.' };
    if (preparation.planRevealed === false) return { tone: 'neutral', label: 'LIMITED SCOUTING', title: 'THE REPORT REMAINED A BROAD PROFILE', detail: 'Exact shape and route were intentionally unconfirmed, so judge the preparation by whether it kept your options open.' };
    const actual = typeof oppositionIdentityForClub === 'function' ? oppositionIdentityForClub(null, betweenRoundTacticsState.sourceRound) : null;
    const matches = [
      String(preparation.expectedApproach || '').toLowerCase() === String(actual?.approach || '').toLowerCase(),
      String(preparation.expectedEngagement || '').toLowerCase() === String(actual?.engagement || '').toLowerCase(),
      String(preparation.expectedPriority || '').toLowerCase() === String(actual?.priority || '').toLowerCase()
    ].filter(Boolean).length;
    if (matches >= 2) return { tone: 'positive', label: 'SCOUTING ACCURACY', title: 'THE PRE-MATCH READ HELD UP', detail: `${matches} of 3 revealed tactical tendencies matched the round. The response can be adjusted without discarding the report.` };
    if (matches === 1) return { tone: 'action', label: 'SCOUTING ACCURACY', title: 'THE REPORT WAS ONLY PARTLY CONFIRMED', detail: 'One revealed tendency matched. Treat the live round as stronger evidence for the next instruction.' };
    return { tone: 'danger', label: 'SCOUTING ACCURACY', title: 'THE OPPONENT DID NOT FOLLOW THE EXPECTED PLAN', detail: 'The revealed shape, range and support tendency all differed. Consider abandoning the original counter rather than forcing it.' };
  }

  function betweenRoundCoachingDiagnoses(stats = {}, winner = null, insight = null, adaptation = null, base = null) {
    const shots = Math.max(0, Number(stats.shotsFired) || 0);
    const accuracy = shots > 0 ? Math.max(0, Number(stats.shotsHit) || 0) / shots : 0;
    const supported = Math.max(0, Number(stats.supportedTime) || 0);
    const isolated = Math.max(0, Number(stats.isolatedTime) || 0);
    const supportRate = supported + isolated > 0 ? supported / (supported + isolated) : 0.5;
    const tradeAttempts = Math.max(0, Number(stats.tradeAttempts) || 0);
    const tradeRate = tradeAttempts > 0 ? Math.max(0, Number(stats.tradeKills) || 0) / tradeAttempts : null;
    const isDraw = winner !== TEAM_BLUE && winner !== TEAM_RED;
    const result = winner === CAREER_OWNED_TEAM ? 'ROUND WON' : isDraw ? 'ROUND DRAWN' : 'ROUND LOST';
    const executionTone = winner === CAREER_OWNED_TEAM ? 'positive' : isDraw ? 'neutral' : 'danger';
    const executionDetail = `${Math.round(accuracy * 100)}% accuracy · ${Math.round(supportRate * 100)}% supported movement${tradeRate === null ? '' : ` · ${Math.round(tradeRate * 100)}% trade conversion`}.`;
    return [
      { tone: executionTone, label: 'ROUND EXECUTION', title: result, detail: executionDetail },
      betweenRoundScoutingAccuracy(base),
      adaptation?.changed
        ? { tone: 'action', label: 'OPPONENT RESPONSE FORECAST', title: adaptation.trigger, detail: adaptation.reason }
        : { tone: 'neutral', label: 'OPPONENT RESPONSE FORECAST', title: adaptation?.trigger || 'PLAN LIKELY RETAINED', detail: adaptation?.reason || 'No clear opposition change has been identified.' }
    ];
  }

  function betweenRoundExpectedEffect(changes = [], draft = null) {
    const labels = [];
    if (changes.includes('approach')) {
      if (draft?.approachId === 'cautious') labels.push('earlier cover and lower opening exposure');
      else if (draft?.approachId === 'aggressive') labels.push('faster pressure with greater isolation risk');
      else labels.push('more balanced commitment timing');
    }
    if (changes.includes('engagement')) {
      if (draft?.engagementId === 'long') labels.push('more protected sightlines and wider spacing');
      else if (draft?.engagementId === 'close') labels.push('quicker distance-closing and compact fights');
      else labels.push('weapon-led contact distances');
    }
    if (changes.includes('priority')) {
      if (draft?.priorityId === 'group') labels.push('closer support at the cost of lane congestion');
      else if (draft?.priorityId === 'trade') labels.push('faster responses after a nearby loss');
      else if (draft?.priorityId === 'flank') labels.push('a clearer second angle with isolation risk');
      else labels.push('more deliberate territory protection');
    }
    if (changes.includes('route')) {
      const route = engagementPlanOptions(activeArenaId).find(item => item.id === betweenRoundPlanValue('route', draft));
      labels.push(`the opening fight redirected towards ${String(route?.zone || route?.name || 'a new sector').toUpperCase()}`);
    }
    return labels.length ? `${labels.join(' · ')}.` : 'The current plan remains in place to preserve familiarity.';
  }

  function evaluateBetweenRoundAdjustmentForRound(plan, stats = {}, winner = null) {
    if (!plan || !Array.isArray(plan.adjustments)) return null;
    const adjustment = [...plan.adjustments].reverse().find(item => Number(item?.appliedForRound) === Number(roundNumber) && !item.result);
    if (!adjustment) return null;
    const supported = Math.max(0, Number(stats.supportedTime) || 0);
    const isolated = Math.max(0, Number(stats.isolatedTime) || 0);
    const supportRate = supported + isolated > 0 ? supported / (supported + isolated) : 0.5;
    const shots = Math.max(0, Number(stats.shotsFired) || 0);
    const accuracy = shots > 0 ? Math.max(0, Number(stats.shotsHit) || 0) / shots : 0;
    const tradeAttempts = Math.max(0, Number(stats.tradeAttempts) || 0);
    const tradeRate = tradeAttempts > 0 ? Math.max(0, Number(stats.tradeKills) || 0) / tradeAttempts : 0;
    let score = winner === CAREER_OWNED_TEAM ? 2 : -1;
    for (const change of adjustment.changes || []) {
      if (change.type === 'priority' && change.to === 'group') score += supportRate >= 0.55 ? 2 : -1;
      if (change.type === 'priority' && change.to === 'trade') score += tradeAttempts >= 2 && tradeRate >= 0.35 ? 2 : -1;
      if (change.type === 'engagement' && change.to === 'long') score += accuracy >= 0.34 ? 2 : -1;
      if (change.type === 'approach' && change.to === 'cautious') score += Number(stats.damageTaken || 0) <= Number(stats.damageDealt || 0) * 1.15 ? 2 : -1;
      if (change.type === 'approach' && change.to === 'aggressive') score += Number(stats.kills || 0) >= 3 ? 2 : -1;
      if (change.type === 'route') score += Number(stats.routeReplans || 0) <= 3 ? 1 : -1;
    }
    const tone = score >= 3 ? 'positive' : score <= 0 ? 'danger' : 'neutral';
    adjustment.result = {
      tone,
      title: tone === 'positive' ? 'ADJUSTMENT IMPROVED CONTROL' : tone === 'danger' ? 'ADJUSTMENT DID NOT SOLVE THE ROUND' : 'ADJUSTMENT PRODUCED A MIXED RESULT',
      evidence: `${winner === CAREER_OWNED_TEAM ? 'Round won' : (winner !== TEAM_BLUE && winner !== TEAM_RED) ? 'Round drawn' : 'Round lost'} · ${Math.round(supportRate * 100)}% supported · ${Math.round(accuracy * 100)}% accuracy · ${Math.round(tradeRate * 100)}% trade conversion.`
    };
    if (tone === 'positive') {
      recordCareerMatchHighlight({
        id: `tactical-change:${roundNumber}:${adjustment.afterRound || roundNumber - 1}`,
        type: 'tactical-change',
        label: 'TACTICAL CHANGE',
        title: adjustment.result.title,
        detail: adjustment.result.evidence,
        tone: 'adjustment',
        priority: 84,
        evidence: { changes: (adjustment.changes || []).map(change => ({ ...change })), expectedEffect: adjustment.expectedEffect || '', result: { ...adjustment.result } }
      });
    }
    return adjustment.result;
  }

  function betweenRoundCoachingInsight(stats = {}, winner = null) {
    const shots = Math.max(0, Number(stats.shotsFired) || 0);
    const accuracy = shots > 0 ? Math.max(0, Number(stats.shotsHit) || 0) / shots : 0;
    const supported = Math.max(0, Number(stats.supportedTime) || 0);
    const isolated = Math.max(0, Number(stats.isolatedTime) || 0);
    const supportRate = supported + isolated > 0 ? supported / (supported + isolated) : 0.5;
    const tradeAttempts = Math.max(0, Number(stats.tradeAttempts) || 0);
    const tradeRate = tradeAttempts > 0 ? Math.max(0, Number(stats.tradeKills) || 0) / tradeAttempts : 0;
    const won = winner === CAREER_OWNED_TEAM;
    if (supportRate < 0.43) return { type: 'priority', value: 'group', title: 'THE TEAM BECAME TOO ISOLATED', body: `Only ${Math.round(supportRate * 100)}% of tracked movement time had useful support nearby. Staying Grouped should improve trade distance, but may increase lane congestion.` };
    if (tradeAttempts >= 2 && tradeRate < 0.30) return { type: 'priority', value: 'trade', title: 'TRADE RESPONSES ARRIVED TOO LATE', body: `${Math.round(tradeRate * 100)}% of ${Math.round(tradeAttempts)} trade opportunities became eliminations. Keep a second operator closer without forcing the whole team into one lane.` };
    if (shots >= 8 && accuracy < 0.31) return { type: 'engagement', value: 'long', title: 'SHOT QUALITY WAS TOO LOW', body: `${Math.round(accuracy * 100)}% accuracy suggests rushed or poorly spaced firing windows. Longer engagement distance can create more controlled bursts.` };
    if ((Number(stats.damageTaken) || 0) > (Number(stats.damageDealt) || 0) * 1.18) return { type: 'approach', value: 'cautious', title: 'THE TEAM LOST TOO MUCH HEALTH EARLY', body: `${Math.round(Number(stats.damageTaken) || 0)} damage received against ${Math.round(Number(stats.damageDealt) || 0)} dealt. A cautious tempo encourages earlier cover use rather than reducing raw weapon output.` };
    if (!won && (Number(stats.kills) || 0) <= 1) return { type: 'approach', value: 'aggressive', title: 'THE ROUND LACKED DECISIVE PRESSURE', body: 'The team created too few eliminations to control the round. More aggression may seize initiative, but increases isolation and medical risk.' };
    if ((Number(stats.routeReplans) || 0) >= 4) {
      const alternative = engagementPlanOptions(activeArenaId).find(plan => plan.id !== currentEngagementPlan?.id && String(plan.zone || '') !== String(currentEngagementPlan?.zone || ''));
      return { type: alternative ? 'route' : 'priority', value: alternative?.id || 'flank', routeZone: alternative?.zone || '', title: 'ROUTES BECAME CROWDED OR UNCLEAR', body: `${Math.round(Number(stats.routeReplans) || 0)} route replans indicate repeated congestion or abandoned lanes. ${alternative ? `Redirecting the opening towards ${String(alternative.zone || alternative.name).toUpperCase()} gives the team a cleaner first objective.` : 'Creating Flanks gives operators clearer separate responsibilities.'}` };
    }
    return { type: '', value: '', title: won ? 'THE CURRENT PLAN HELD TOGETHER' : 'NO SINGLE FAILURE DOMINATED THE ROUND', body: won ? 'Spacing, pressure and shot selection were stable enough to avoid a forced change. Retaining the plan preserves familiarity.' : 'The evidence is mixed. A limited adjustment is available, but changing nothing may be better than reacting to one result.' };
  }

  function prepareBetweenRoundTactics(stats, winner, reason = '') {
    const active = typeof clubActiveMatchPlan === 'function' ? clubActiveMatchPlan() : null;
    if (!careerState.created || !active) {
      betweenRoundTacticsState.resolved = true;
      return false;
    }
    betweenRoundTacticsState.open = false;
    betweenRoundTacticsState.resolved = false;
    betweenRoundTacticsState.sourceRound = roundNumber;
    betweenRoundTacticsState.winner = winner;
    betweenRoundTacticsState.reason = String(reason || 'Round complete');
    const livePlan = careerState.tactics?.activeMatchPlan || active;
    evaluateBetweenRoundAdjustmentForRound(livePlan, stats, winner);
    const opponentAdaptation = typeof prepareOpponentMatchAdaptation === 'function'
      ? prepareOpponentMatchAdaptation(stats, winner, livePlan, roundNumber)
      : null;
    if (opponentAdaptation) {
      livePlan.opponentAdjustments = [...(Array.isArray(livePlan.opponentAdjustments) ? livePlan.opponentAdjustments : []), JSON.parse(JSON.stringify(opponentAdaptation))].slice(-8);
    }
    const currentOpponentIdentity = typeof oppositionIdentityForClub === 'function' ? oppositionIdentityForClub(null, roundNumber) : null;
    livePlan.roundReviews = [...(Array.isArray(livePlan.roundReviews) ? livePlan.roundReviews : []), {
      round: roundNumber,
      won: winner === CAREER_OWNED_TEAM,
      drawn: winner !== TEAM_BLUE && winner !== TEAM_RED,
      routeId: currentEngagementPlan?.id || '',
      routeName: currentEngagementPlan?.name || 'DYNAMIC CONTACT',
      opponent: currentOpponentIdentity ? {
        formation: currentOpponentIdentity.formation,
        approach: currentOpponentIdentity.approach,
        engagement: currentOpponentIdentity.engagement,
        priority: currentOpponentIdentity.priority,
        phase: currentOpponentIdentity.phase
      } : null,
      stats: {
        kills: Math.max(0, Number(stats?.kills) || 0),
        deaths: Math.max(0, Number(stats?.deaths) || 0),
        shotsFired: Math.max(0, Number(stats?.shotsFired) || 0),
        shotsHit: Math.max(0, Number(stats?.shotsHit) || 0),
        damageDealt: Math.max(0, Math.round(Number(stats?.damageDealt) || 0)),
        damageTaken: Math.max(0, Math.round(Number(stats?.damageTaken) || 0)),
        supportedTime: Math.max(0, Number(stats?.supportedTime) || 0),
        isolatedTime: Math.max(0, Number(stats?.isolatedTime) || 0),
        tradeAttempts: Math.max(0, Number(stats?.tradeAttempts) || 0),
        tradeKills: Math.max(0, Number(stats?.tradeKills) || 0),
        routeReplans: Math.max(0, Number(stats?.routeReplans) || 0)
      }
    }].slice(-8);
    careerState.tactics.activeMatchPlan = livePlan;
    saveCareerState();
    const baseline = JSON.parse(JSON.stringify(livePlan));
    baseline.roundPlanId = currentEngagementPlan?.id || baseline.roundPlanId || baseline.openingPlanId || '';
    baseline.roundPlanName = currentEngagementPlan?.name || baseline.roundPlanName || baseline.openingPlanName || 'DYNAMIC CONTACT';
    baseline.roundPlanZone = currentEngagementPlan?.zone || baseline.roundPlanZone || baseline.openingPlanZone || '';
    betweenRoundTacticsState.base = baseline;
    betweenRoundTacticsState.draft = JSON.parse(JSON.stringify(baseline));
    betweenRoundTacticsState.roundStats = { ...(stats || {}) };
    betweenRoundTacticsState.insight = betweenRoundCoachingInsight(stats, winner);
    betweenRoundTacticsState.opponentAdaptation = opponentAdaptation;
    betweenRoundTacticsState.diagnoses = betweenRoundCoachingDiagnoses(stats, winner, betweenRoundTacticsState.insight, opponentAdaptation, baseline);
    betweenRoundTacticsState.message = '';
    return true;
  }

  function escapeBetweenRoundHtml(value) {
    if (typeof escapeCareerHtml === 'function') return escapeCareerHtml(value);
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function renderBetweenRoundTactics() {
    if (!betweenRoundTacticsEl || !betweenRoundTacticsState.draft || !betweenRoundTacticsState.base) return false;
    const changes = betweenRoundChangeTypes();
    const isDraw = betweenRoundTacticsState.winner !== TEAM_BLUE && betweenRoundTacticsState.winner !== TEAM_RED;
    if (betweenRoundKickerEl) betweenRoundKickerEl.textContent = `ROUND ${betweenRoundTacticsState.sourceRound} REVIEW · ${betweenRoundTacticsState.winner === CAREER_OWNED_TEAM ? 'WON' : isDraw ? 'DRAWN' : 'LOST'}`;
    if (betweenRoundScoreEl) betweenRoundScoreEl.textContent = `${matchTeamIdentity(TEAM_BLUE).name} ${blueScore} — ${redScore} ${matchTeamIdentity(TEAM_RED).name}`;
    if (betweenRoundChangeCountEl) betweenRoundChangeCountEl.textContent = `${changes.length} / 2 CHANGES`;
    if (betweenRoundInsightTitleEl) betweenRoundInsightTitleEl.textContent = betweenRoundTacticsState.insight?.title || 'KEEP THE PLAN STABLE';
    if (betweenRoundInsightBodyEl) betweenRoundInsightBodyEl.textContent = betweenRoundTacticsState.insight?.body || 'Make a limited adjustment only when the evidence supports it.';

    if (betweenRoundDiagnosisGridEl) {
      betweenRoundDiagnosisGridEl.innerHTML = (betweenRoundTacticsState.diagnoses || []).map(item => `
        <article class="${escapeBetweenRoundHtml(item.tone || 'neutral')}">
          <span>${escapeBetweenRoundHtml(item.label || 'ROUND EVIDENCE')}</span>
          <strong>${escapeBetweenRoundHtml(item.title || 'MIXED SIGNAL')}</strong>
          <p>${escapeBetweenRoundHtml(item.detail || '')}</p>
        </article>`).join('');
    }

    if (betweenRoundOpponentReadEl) {
      const adaptation = betweenRoundTacticsState.opponentAdaptation;
      const changed = Boolean(adaptation?.changed);
      betweenRoundOpponentReadEl.className = `between-round-opponent-read ${changed ? 'action' : 'neutral'}`;
      betweenRoundOpponentReadEl.innerHTML = `
        <div>
          <span>OPPONENT ADAPTATION READ</span>
          <strong>${escapeBetweenRoundHtml(adaptation?.trigger || 'PLAN LIKELY RETAINED')}</strong>
          <p>${escapeBetweenRoundHtml(adaptation?.reason || 'The opposition has not shown a repeatable reason to change shape.')}</p>
        </div>
        <aside>
          <span>MANAGER COUNTERPOINT</span>
          <p>${escapeBetweenRoundHtml(adaptation?.counterHint || 'Keep the core plan stable and respond only to clear round evidence.')}</p>
          <small>${changed ? 'Analyst forecast — not guaranteed' : 'No forced reaction recommended'}</small>
        </aside>`;
    }

    if (betweenRoundRouteOptionsEl) {
      betweenRoundRouteOptionsEl.innerHTML = betweenRoundRoutePlans().map(plan => `
        <button type="button" data-between-round-type="route" data-between-round-value="${escapeBetweenRoundHtml(plan.id)}">
          <strong>${escapeBetweenRoundHtml(plan.name || 'DYNAMIC ROUTE')}</strong>
          <small>${escapeBetweenRoundHtml(String(plan.zone || 'MIXED TERRITORY').toUpperCase())}</small>
        </button>`).join('');
    }

    betweenRoundTacticsEl.querySelectorAll('[data-between-round-type][data-between-round-value]').forEach(button => {
      const type = button.dataset.betweenRoundType;
      const value = button.dataset.betweenRoundValue;
      const active = betweenRoundPlanValue(type) === value;
      const baseline = betweenRoundPlanValue(type, betweenRoundTacticsState.base) === value;
      const recommended = betweenRoundTacticsState.insight?.type === type && betweenRoundTacticsState.insight?.value === value;
      button.classList.toggle('active', active);
      button.classList.toggle('baseline', baseline);
      button.classList.toggle('recommended', recommended);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    if (betweenRoundLimitEl) {
      betweenRoundLimitEl.textContent = betweenRoundTacticsState.message || (changes.length ? `${changes.length} category change${changes.length === 1 ? '' : 's'} staged. ${betweenRoundExpectedEffect(changes, betweenRoundTacticsState.draft)}` : 'Choose up to two categories. Unchanged instructions retain familiarity and reduce tactical churn.');
      betweenRoundLimitEl.classList.toggle('warning', Boolean(betweenRoundTacticsState.message));
    }
    if (betweenRoundApplyBtn) {
      betweenRoundApplyBtn.disabled = changes.length <= 0;
      betweenRoundApplyBtn.textContent = changes.length ? `APPLY ${changes.length} CHANGE${changes.length === 1 ? '' : 'S'} & START ROUND` : 'NO CHANGES STAGED';
    }
    return true;
  }

  function openBetweenRoundTactics() {
    if (betweenRoundTacticsState.resolved || betweenRoundTacticsState.open) return false;
    if (!betweenRoundTacticsEl) {
      betweenRoundTacticsState.resolved = true;
      startRound();
      return false;
    }
    if (betweenRoundTacticsEl.parentElement !== document.body) document.body.appendChild(betweenRoundTacticsEl);
    hideRoundResult();
    if (typeof hideSponsorRoundBumper === 'function') hideSponsorRoundBumper();
    betweenRoundTacticsState.open = true;
    betweenRoundTacticsEl.hidden = false;
    betweenRoundTacticsEl.setAttribute('aria-hidden', 'false');
    renderBetweenRoundTactics();
    betweenRoundKeepBtn?.focus({ preventScroll: true });
    return true;
  }

  function selectBetweenRoundTactic(type, value) {
    if (!betweenRoundTacticsState.open || !betweenRoundTacticsState.draft) return false;
    let previous = '';
    if (type === 'route') {
      const route = engagementPlanOptions(activeArenaId).find(item => item.id === value);
      if (!route) return false;
      previous = betweenRoundTacticsState.draft.roundPlanId || '';
      betweenRoundTacticsState.draft.roundPlanId = route.id;
      betweenRoundTacticsState.draft.roundPlanName = route.name || 'DYNAMIC CONTACT';
      betweenRoundTacticsState.draft.roundPlanZone = route.zone || '';
    } else {
      const map = { approach: CLUB_APPROACHES, engagement: CLUB_ENGAGEMENTS, priority: CLUB_PRIORITIES };
      if (!map[type]?.[value]) return false;
      const field = `${type}Id`;
      previous = betweenRoundTacticsState.draft[field];
      betweenRoundTacticsState.draft[field] = value;
    }
    const changes = betweenRoundChangeTypes();
    if (changes.length > 2) {
      if (type === 'route') {
        const previousRoute = engagementPlanOptions(activeArenaId).find(item => item.id === previous);
        betweenRoundTacticsState.draft.roundPlanId = previous;
        betweenRoundTacticsState.draft.roundPlanName = previousRoute?.name || betweenRoundTacticsState.base.roundPlanName || 'DYNAMIC CONTACT';
        betweenRoundTacticsState.draft.roundPlanZone = previousRoute?.zone || betweenRoundTacticsState.base.roundPlanZone || '';
      } else {
        betweenRoundTacticsState.draft[`${type}Id`] = previous;
      }
      betweenRoundTacticsState.message = 'Only two instruction categories can change between rounds. Revert one staged category before adding another.';
      renderBetweenRoundTactics();
      return false;
    }
    betweenRoundTacticsState.message = '';
    renderBetweenRoundTactics();
    return true;
  }

  function betweenRoundDisplayValue(type, value) {
    if (type === 'approach') return CLUB_APPROACHES[value]?.name || value;
    if (type === 'engagement') return CLUB_ENGAGEMENTS[value]?.name || value;
    if (type === 'priority') return CLUB_PRIORITIES[value]?.name || value;
    if (type === 'route') return engagementPlanOptions(activeArenaId).find(item => item.id === value)?.name || value;
    return value;
  }

  function commitBetweenRoundTactics(applyChanges = true) {
    if (betweenRoundTacticsState.resolved || !betweenRoundTacticsState.base) return false;
    const changes = applyChanges ? betweenRoundChangeTypes() : [];
    if (applyChanges && !changes.length) return false;
    if (applyChanges) {
      const draft = betweenRoundTacticsState.draft;
      const base = betweenRoundTacticsState.base;
      const plan = JSON.parse(JSON.stringify(base));
      plan.approachId = draft.approachId;
      plan.approachName = CLUB_APPROACHES[plan.approachId]?.name || 'BALANCED';
      plan.engagementId = draft.engagementId;
      plan.engagementName = CLUB_ENGAGEMENTS[plan.engagementId]?.name || 'MIXED RANGE';
      plan.priorityId = draft.priorityId;
      plan.priorityName = CLUB_PRIORITIES[plan.priorityId]?.name || 'TRADE ELIMINATIONS';
      plan.roundPlanId = draft.roundPlanId || base.roundPlanId || base.openingPlanId || '';
      plan.roundPlanName = draft.roundPlanName || engagementPlanOptions(activeArenaId).find(item => item.id === plan.roundPlanId)?.name || base.roundPlanName || 'DYNAMIC CONTACT';
      plan.roundPlanZone = draft.roundPlanZone || engagementPlanOptions(activeArenaId).find(item => item.id === plan.roundPlanId)?.zone || base.roundPlanZone || '';
      if (typeof clubTacticalSuitabilityReport === 'function' && typeof tacticalSuitabilitySnapshot === 'function') {
        plan.suitability = tacticalSuitabilitySnapshot(clubTacticalSuitabilityReport({
          formationId: plan.formationId,
          approachId: plan.approachId,
          engagementId: plan.engagementId,
          priorityId: plan.priorityId
        }));
      }
      const adjustment = {
        afterRound: betweenRoundTacticsState.sourceRound,
        appliedForRound: betweenRoundTacticsState.sourceRound + 1,
        coachingRead: betweenRoundTacticsState.insight?.title || '',
        expectedEffect: betweenRoundExpectedEffect(changes, draft),
        opponentForecast: betweenRoundTacticsState.opponentAdaptation ? {
          trigger: betweenRoundTacticsState.opponentAdaptation.trigger || '',
          changed: Boolean(betweenRoundTacticsState.opponentAdaptation.changed),
          counterHint: betweenRoundTacticsState.opponentAdaptation.counterHint || ''
        } : null,
        changes: changes.map(type => ({
          type,
          from: betweenRoundPlanValue(type, base),
          to: betweenRoundPlanValue(type, draft),
          fromLabel: betweenRoundDisplayValue(type, betweenRoundPlanValue(type, base)),
          toLabel: betweenRoundDisplayValue(type, betweenRoundPlanValue(type, draft))
        }))
      };
      plan.adjustments = [...(Array.isArray(base.adjustments) ? base.adjustments : []), adjustment].slice(-6);
      careerState.tactics.activeMatchPlan = plan;
      saveCareerState();
      const adjustmentLabels = adjustment.changes.map(change => `${String(change.type).toUpperCase()} ${String(change.fromLabel).toUpperCase()} → ${String(change.toLabel).toUpperCase()}`);
      careerMatchMomentState.pendingAdjustment = `${adjustmentLabels.join(' · ')} · EXPECTED: ${adjustment.expectedEffect}`;
      addSystemFeed(`MANAGER ADJUSTMENT · ${changes.map(type => type.toUpperCase()).join(' + ')}`);
    } else {
      addSystemFeed('MANAGER RETAINS CURRENT PLAN');
    }
    betweenRoundTacticsState.resolved = true;
    betweenRoundTacticsState.open = false;
    if (betweenRoundTacticsEl) {
      betweenRoundTacticsEl.hidden = true;
      betweenRoundTacticsEl.setAttribute('aria-hidden', 'true');
    }
    startRound();
    return true;
  }

  function teamAliveCount(team) {
    return bots.reduce((count, bot) => count + (bot.team === team && bot.alive ? 1 : 0), 0);
  }

  function teamHealthTotal(team) {
    return bots.reduce((total, bot) => total + (bot.team === team && bot.alive ? Math.max(0, bot.health) : 0), 0);
  }

  function showRoundResult(kicker, title, detail) {
    roundResultKickerEl.textContent = kicker;
    roundResultTitleEl.textContent = title;
    roundResultDetailEl.textContent = detail;
    roundResultEl.classList.add('show');
  }

  function hideRoundResult() {
    roundResultEl.classList.remove('show');
  }

  function createMatch() {
    resetCareerMatchFlow();
    resetBetweenRoundTacticsState();
    if (typeof resetLiveCommandPulseMatch === 'function') resetLiveCommandPulseMatch();
    if (typeof resetOpponentMatchAdaptation === 'function') resetOpponentMatchAdaptation();
    if (typeof resetCareerMatchIntro === 'function') resetCareerMatchIntro();
    resetCareerMatchMoments();
    if (typeof diagnosticResetMatch === 'function') diagnosticResetMatch();
    bots = [];
    blueScore = 0;
    redScore = 0;
    roundNumber = 0;
    matchTarget = newPlayerDemoState.active ? 1 : REGULATION_TARGET;
    matchEnding = false;
    matchRestartTimer = 0;
    roundEnding = false;
    roundRestartTimer = 0;
    feed = [];
    soundEvents = [];
    soundEventSequence = 0;
    lastCombatContactAt = simulationClock;
    lateRoundMode = false;
    lateRoundStatusShown = false;
    lateRoundDirectorTick = 0;
    renderFeed();
    resetMultiKillBanner(true);
    hideRoundResult();
    if (typeof hideSponsorRoundBumper === 'function') hideSponsorRoundBumper();
    // Build the static navigation graph before operators enter the live update
    // loop. This moves the one-time arena analysis out of the first active frame.
    if (typeof navigationGraphForActiveArena === 'function') navigationGraphForActiveArena();
    for (let team = 0; team < 2; team++) {
      for (let i = 0; i < 5; i++) bots.push(new Bot(team, i));
    }
    startRound();
  }

  function startRound() {
    if (betweenRoundTacticsEl) {
      betweenRoundTacticsEl.hidden = true;
      betweenRoundTacticsEl.setAttribute('aria-hidden', 'true');
    }
    betweenRoundTacticsState.open = false;
    roundNumber++;
    roundTime = ROUND_DURATION;
    roundFreezeTimer = ROUND_FREEZE_TIME;
    suddenHuntOvertime = false;
    roundEnding = false;
    roundRestartTimer = 0;
    roundReason = '';
    tracers.length = 0;
    soundEvents = [];
    lastCombatContactAt = simulationClock;
    lateRoundMode = false;
    lateRoundStatusShown = false;
    lateRoundDirectorTick = 0;
    careerMatchMomentState.roundLiveElapsed = 0;
    careerMatchMomentState.aliveKey = '';
    careerMatchMomentState.roundEliminations = 0;
    careerMatchMomentState.roundMomentCount = 0;
    hideRoundResult();
    if (typeof hideSponsorRoundBumper === 'function') hideSponsorRoundBumper();
    hideStatus();
    clearDamageNumbers();
    const activePlan = typeof clubActiveMatchPlan === 'function' ? clubActiveMatchPlan() : null;
    const preferredRoundPlanId = roundNumber === 1
      ? String(activePlan?.openingPlanId || '')
      : String(activePlan?.roundPlanId || activePlan?.openingPlanId || '');
    selectRoundEngagementPlan(preferredRoundPlanId);
    resetDynamicDoors();

    // Disable everyone first so sequential reset calls can choose separated
    // spawn points without stale living positions from the previous round.
    for (const bot of bots) bot.alive = false;
    for (const bot of bots) bot.reset(false);
    if (typeof prepareSummitOpeningTransitions === 'function') prepareSummitOpeningTransitions();

    const firstLiving = bots.findIndex(bot => bot.team === CAREER_OWNED_TEAM && bot.alive);
    const firstOwned = bots.findIndex(bot => bot.team === CAREER_OWNED_TEAM);
    spectatorIndex = firstLiving >= 0 ? firstLiving : (firstOwned >= 0 ? firstOwned : 0);
    autoTimer = 3.5;
    spectatorDeathSwitchTimer = 0;
    spectatorDeathSwitchKey = '';
    beginCareerRound();
    if (typeof resetLiveCommandPulseForRound === 'function') resetLiveCommandPulseForRound();
    if (typeof diagnosticRoundStarted === 'function') diagnosticRoundStarted();
    if (roundNumber === 1) {
      const blueClub = matchTeamIdentity(TEAM_BLUE);
      const redClub = matchTeamIdentity(TEAM_RED);
      addSystemFeed(`${matchCompetitionLabel()} · ${blueClub.name} VS ${redClub.name}`);
    }
    addSystemFeed(`ROUND ${roundNumber} — ${currentEngagementPlan?.name || 'DYNAMIC CONTACT'} · NO RESPAWNS`);
    const opponentAdaptation = typeof opponentMatchAdaptationForRound === 'function' ? opponentMatchAdaptationForRound(roundNumber) : null;
    if (roundNumber > 1 && opponentAdaptation) {
      addSystemFeed(`OPPONENT RESPONSE · ${opponentAdaptation.trigger || 'PLAN RETAINED'}`);
      if (opponentAdaptation.changed) {
        queueCareerMatchMoment(`opponent-adjustment:${roundNumber}`, 'OPPONENT ADAPTS', opponentAdaptation.trigger || 'TACTICAL RESPONSE', `${opponentAdaptation.reason || 'The opposition appears to be changing its approach.'} ${opponentAdaptation.counterHint || ''}`, 'coach', 4.2, true);
      }
    }
    if (careerMatchMomentState.pendingAdjustment) {
      const adjustment = careerMatchMomentState.pendingAdjustment;
      queueCareerMatchMoment(`adjustment:${roundNumber}`, 'MANAGER TACTICAL CHANGE', `ROUND ${roundNumber} PLAN UPDATED`, adjustment, 'adjustment', 4.0, true);
      careerMatchMomentState.pendingAdjustment = null;
    }
    if (blueScore === matchTarget - 1 || redScore === matchTarget - 1) {
      const ownedScore = CAREER_OWNED_TEAM === TEAM_BLUE ? blueScore : redScore;
      const opponentScore = CAREER_OWNED_TEAM === TEAM_BLUE ? redScore : blueScore;
      const title = ownedScore === matchTarget - 1 ? 'MATCH POINT · WIN THIS ROUND' : 'MATCH POINT · MUST RESPOND';
      queueCareerMatchMoment(`match-point:${roundNumber}`, 'MATCH POINT', title, `${matchScoreLine(blueScore, redScore, true)} · FIRST TO ${matchTarget}`, ownedScore === matchTarget - 1 ? 'advantage' : 'danger', 3.4, true);
    }
    if (newPlayerDemoState.active) {
      addSystemFeed('GUIDED ORIENTATION · ONE ROUND ONLY · NO CAREER RESULT');
      addSystemFeed('WATCH THE LIVE INTENTION TO UNDERSTAND EACH OPERATOR DECISION');
      showStatus('GUIDED DEMO · PAUSED');
    } else if (roundNumber === 1) {
      const plan = typeof clubActiveMatchPlan === 'function' ? clubActiveMatchPlan() : null;
      addSystemFeed(`YOUR FIVE OPERATORS ACT AUTONOMOUSLY · ${plan?.approachName || 'BALANCED'} · ${plan?.engagementName || 'MIXED RANGE'} · ${plan?.priorityName || 'TRADE ELIMINATIONS'}`);
      if (plan?.opponentPreparation) addSystemFeed(`OPPOSITION PREPARATION · ${plan.opponentPreparation.response?.title || 'CUSTOM PLAN'} · WATCH ${plan.opponentPreparation.expectedRoute || 'MIXED ROUTES'}`);
      showStatus('ROUND 1 · OPERATORS EXECUTING YOUR PLAN');
    } else {
      showStatus(`ROUND ${roundNumber}`);
    }
  }

  function finishMatch(winner) {
    careerMatchComplete = true;
    betweenRoundTacticsState.resolved = true;
    betweenRoundTacticsState.open = false;
    if (betweenRoundTacticsEl) {
      betweenRoundTacticsEl.hidden = true;
      betweenRoundTacticsEl.setAttribute('aria-hidden', 'true');
    }
    if (typeof hideSponsorRoundBumper === 'function') hideSponsorRoundBumper();
    matchEnding = true;
    roundEnding = true;
    roundRestartTimer = 0;
    matchRestartTimer = 0;
    const winnerClub = matchTeamIdentity(winner);
    const title = `${winnerClub.name.toUpperCase()} WINS THE MATCH`;
    const rewardState = winner === CAREER_OWNED_TEAM ? 'victory rewards and debrief authorised' : 'performance rewards and debrief authorised';
    const detail = `${matchScoreLine(blueScore, redScore, true)} · first to ${matchTarget} · ${rewardState}`;
    showRoundResult('MATCH COMPLETE', title, detail);
    showStatus('MATCH COMPLETE');
    addSystemFeed(title);
    if (typeof diagnosticCompleteMatch === 'function') diagnosticCompleteMatch(winner);
    completeCareerMatch(winner);
  }

  function finishRound(winner, reason = 'Opposition eliminated') {
    if (roundEnding || matchEnding) return;
    roundEnding = true;
    roundReason = reason;
    const liveCommandOutcome = typeof completeLiveCommandPulse === 'function'
      ? completeLiveCommandPulse('round-end', winner)
      : null;

    if (winner === TEAM_BLUE) blueScore++;
    if (winner === TEAM_RED) redScore++;

    const isDraw = winner !== TEAM_BLUE && winner !== TEAM_RED;
    const title = isDraw ? 'ROUND DRAW' : `${matchTeamIdentity(winner).name.toUpperCase()} WINS`;
    const detail = `${reason} · ${matchScoreLine(blueScore, redScore, true)}`;
    showRoundResult(`ROUND ${roundNumber} COMPLETE`, title, detail);
    showStatus(title);
    addSystemFeed(title);

    if (typeof diagnosticRoundFinished === 'function') diagnosticRoundFinished(winner, reason);
    if (newPlayerDemoState.active) {
      finishNewPlayerDemoRound(winner, reason);
      return;
    }
    const completedRound = recordCareerRoundResult(winner);
    if (liveCommandOutcome) completedRound.liveCommand = JSON.parse(JSON.stringify(liveCommandOutcome));
    const roundDecision = careerRoundDecision(completedRound, winner);
    completedRound.decision = { ...roundDecision };
    const decisionDetail = `${reason} · ${matchScoreLine(blueScore, redScore, true)} · ${roundDecision.title}: ${roundDecision.detail}`;
    showRoundResult(`ROUND ${roundNumber} COMPLETE`, title, decisionDetail);
    addSystemFeed(`ROUND READ · ${roundDecision.title} · ${roundDecision.detail}`);
    const winningScore = winner === TEAM_BLUE ? blueScore : redScore;
    if (!isDraw && winningScore >= matchTarget) {
      const livePlan = careerState.tactics?.activeMatchPlan || (typeof clubActiveMatchPlan === 'function' ? clubActiveMatchPlan() : null);
      if (livePlan) {
        evaluateBetweenRoundAdjustmentForRound(livePlan, completedRound, winner);
        careerState.tactics.activeMatchPlan = livePlan;
        saveCareerState();
      }
      finishMatch(winner);
      return;
    }
    careerBetweenRounds = true;
    prepareBetweenRoundTactics(completedRound, winner, reason);
    const sponsorBumperScheduled = typeof scheduleSponsorRoundBumper === 'function'
      ? scheduleSponsorRoundBumper(roundNumber + 1)
      : false;
    roundRestartTimer = sponsorBumperScheduled && typeof sponsorRoundBumperTotalDuration === 'function'
      ? sponsorRoundBumperTotalDuration()
      : 3.4;
  }

  function beginSuddenHuntOvertime() {
    suddenHuntOvertime = true;
    roundTime = 45;
    lastCombatContactAt = Math.min(lastCombatContactAt, simulationClock - 14);
    lateRoundMode = true;
    for (const bot of bots) {
      if (!bot.alive) continue;
      bot.clearCombatCover();
      bot.crouched = false;
      bot.crouchHoldTimer = 0;
      bot.tacticalDecisionTimer = 0;
      bot.tacticalModeTimer = 0;
      bot.combatRepositionRequested = false;
      bot.lateRoundGoalTimer = 0;
      bot.lateRoundGoalAge = 99;
      bot.pathRefreshNeeded = true;
      bot.repathTimer = 0;
    }
    addSystemFeed('SUDDEN HUNT — ELIMINATION REQUIRED');
    showStatus('SUDDEN HUNT · 00:45');
  }

  function resolveTimeLimit() {
    const blueAlive = teamAliveCount(TEAM_BLUE);
    const redAlive = teamAliveCount(TEAM_RED);
    if (blueAlive !== redAlive) {
      finishRound(blueAlive > redAlive ? TEAM_BLUE : TEAM_RED, 'Time expired · more operators survived');
      return;
    }
    const blueHealth = teamHealthTotal(TEAM_BLUE);
    const redHealth = teamHealthTotal(TEAM_RED);
    if (Math.abs(blueHealth - redHealth) > 0.5) {
      finishRound(blueHealth > redHealth ? TEAM_BLUE : TEAM_RED, 'Time expired · health advantage');
      return;
    }
    finishRound(null, 'Time expired · teams inseparable');
  }

  let multiKillBannerQueue = [];
  let multiKillBannerTimer = 0;
  let multiKillBannerCurrent = null;

  function resetMultiKillBanner(clearQueue = true) {
    if (clearQueue) multiKillBannerQueue.length = 0;
    multiKillBannerTimer = 0;
    multiKillBannerCurrent = null;
    if (multiKillBannerEl) {
      multiKillBannerEl.hidden = true;
      multiKillBannerEl.classList.remove('show', 'double', 'triple', 'ultra', 'rampage');
    }
  }

  function showNextMultiKillBanner() {
    if (multiKillBannerCurrent || !multiKillBannerQueue.length || !multiKillBannerEl) return false;
    const event = multiKillBannerQueue.shift();
    const tier = careerMultiKillTier(event.count);
    if (!tier) return false;
    multiKillBannerCurrent = event;
    multiKillBannerTimer = 2.65;
    multiKillKickerEl.textContent = event.count >= 5 ? 'TEAM RAMPAGE' : 'MULTI-KILL';
    multiKillTitleEl.textContent = tier.title;
    multiKillDetailEl.textContent = `${String(event.playerName || 'OPERATOR').toUpperCase()} · +${tier.goldCoins} GC · +${tier.xp} XP · +${teamCredits(tier.credits)}`;
    multiKillBannerEl.className = `multi-kill-banner show ${tier.key}`;
    multiKillBannerEl.hidden = false;
    return true;
  }

  function queueMultiKillBanner(event) {
    multiKillBannerQueue.push({ ...event });
    showNextMultiKillBanner();
  }

  function updateMultiKillBanner(dt) {
    if (!multiKillBannerCurrent) {
      showNextMultiKillBanner();
      return;
    }
    multiKillBannerTimer = Math.max(0, multiKillBannerTimer - Math.max(0, Number(dt) || 0));
    if (multiKillBannerTimer > 0) return;
    if (multiKillBannerEl) multiKillBannerEl.classList.remove('show');
    multiKillBannerCurrent = null;
    multiKillBannerTimer = 0;
    if (multiKillBannerQueue.length) showNextMultiKillBanner();
    else if (multiKillBannerEl) multiKillBannerEl.hidden = true;
  }

  function registerOwnedMultiKill(killer) {
    if (!killer || killer.team !== CAREER_OWNED_TEAM || !killer.isPlayerOwned) return null;
    const previousAt = Number.isFinite(Number(killer.multiKillLastAt)) ? Number(killer.multiKillLastAt) : -999;
    const elapsed = simulationClock - previousAt;
    killer.multiKillCount = elapsed <= CAREER_MULTI_KILL_WINDOW ? Math.max(1, Number(killer.multiKillCount) || 1) + 1 : 1;
    killer.multiKillLastAt = simulationClock;
    const tier = careerMultiKillTier(killer.multiKillCount);
    if (!tier) return null;
    const event = {
      count: tier.count, key: tier.key, title: tier.title,
      playerId: killer.playerProfileId || null,
      playerName: killer.name || 'Operator',
      round: roundNumber,
      at: Number(simulationClock.toFixed(2))
    };
    careerMatchStats.multiKillEvents = Array.isArray(careerMatchStats.multiKillEvents) ? careerMatchStats.multiKillEvents : [];
    careerMatchStats.multiKillEvents.push(event);
    recordCareerMatchHighlight({
      id: `multi-kill:${roundNumber}:${killer.playerProfileId || killer.name}:${tier.count}`,
      type: 'multi-kill',
      label: tier.count >= 5 ? 'TEAM RAMPAGE' : 'MULTI-KILL',
      title: tier.title,
      detail: `${String(killer.name || 'OPERATOR').toUpperCase()} CHAINS ${tier.count} ELIMINATIONS INSIDE ${CAREER_MULTI_KILL_WINDOW} SECONDS`,
      tone: tier.count >= 4 ? 'clutch' : 'advantage',
      playerId: killer.playerProfileId || null,
      playerName: killer.name || null,
      team: killer.team,
      priority: 78 + tier.count * 3,
      evidence: { count: tier.count, window: CAREER_MULTI_KILL_WINDOW }
    });
    if (killer.playerProfileId && teamMatchPlayerStats?.[killer.playerProfileId]) {
      const tracked = teamMatchPlayerStats[killer.playerProfileId];
      tracked.multiKillEvents = Array.isArray(tracked.multiKillEvents) ? tracked.multiKillEvents : [];
      tracked.multiKillEvents.push({ ...event });
      tracked.highestMultiKill = Math.max(Number(tracked.highestMultiKill) || 0, tier.count);
    }
    queueMultiKillBanner(event);
    addSystemFeed(`${String(killer.name || 'Operator').toUpperCase()} · ${tier.title}`);
    return event;
  }

  function addFeed(killer, victim, critical = false, headshot = false) {
    if (!killer || !victim) return false;
    const killerTeam = killer.team === TEAM_RED ? TEAM_RED : TEAM_BLUE;
    const victimTeam = victim.team === TEAM_RED ? TEAM_RED : TEAM_BLUE;
    const killerName = escapeCareerHtml(String(killer.name || 'Unknown operator'));
    const victimName = escapeCareerHtml(String(victim.name || 'Unknown operator'));
    const weaponName = escapeCareerHtml(String(killer.weapon?.name || killer.primaryWeapon?.name || 'SERVICE WEAPON'));
    const headshotMarker = headshot ? '<span class="feed-headshot" aria-label="Headshot elimination"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="3.2"></circle><path d="M7.6 18.2c.7-3 2.2-4.6 4.4-4.6s3.7 1.6 4.4 4.6"></path><path d="M12 2.2v2M12 13.8v2M4.8 9h2M17.2 9h2"></path></svg></span>' : '';
    const criticalMarker = critical ? '<span class="feed-critical" aria-label="Critical elimination">CRIT</span>' : '';
    feed.unshift({
      html: `<b class="feed-killer" style="color:${TEAM_COLOURS[killerTeam] || '#dce8ef'}">${killerName}</b><span class="weapon">${weaponName}</span>${headshotMarker}${criticalMarker}<span class="feed-arrow" aria-hidden="true">◆</span><b class="feed-victim" style="color:${TEAM_COLOURS[victimTeam] || '#dce8ef'}">${victimName}</b>`,
      life: 6,
      maxLife: 6,
      system: false,
      critical: Boolean(critical),
      headshot: Boolean(headshot),
      killerTeam,
      victimTeam
    });
    feed = feed.slice(0, 6);
    renderFeed();
    return true;
  }
  function addSystemFeed(text) {
    const message = String(text || '').trim();
    if (!message) return;
    feed.unshift({ html: `<span>${message}</span>`, life: 5, maxLife: 5, system: true, killerTeam: null, victimTeam: null });
    feed = feed.slice(0, 6);
    renderFeed();
  }
  function renderFeed() {
    feed = feed.filter(item => item && item.life > 0 && typeof item.html === 'string' && item.html.trim());
    if (!feedEl) return;
    const html = feed.map((item, index) => {
      const killerClass = item.killerTeam === TEAM_BLUE ? ' killer-blue' : (item.killerTeam === TEAM_RED ? ' killer-red' : '');
      const accent = item.killerTeam === TEAM_BLUE ? TEAM_COLOURS[TEAM_BLUE] : (item.killerTeam === TEAM_RED ? TEAM_COLOURS[TEAM_RED] : '#f4b942');
      const duration = Math.max(1, item.maxLife || item.life || 5);
      return `<div class="feed-row${item.system ? ' system' : ''}${item.critical ? ' critical' : ''}${item.headshot ? ' headshot' : ''}${killerClass}" style="--feed-accent:${accent};--feed-duration:${duration}s;--feed-index:${index}">${item.html}</div>`;
    }).join('');
    feedEl.innerHTML = html;
    const hasContent = html.trim().length > 0;
    feedEl.hidden = !hasContent;
    feedEl.classList.toggle('show', hasContent);
    if (typeof updateMatchCommentaryPresentation === 'function') updateMatchCommentaryPresentation();
  }

  function hideStatus() {
    statusEl.classList.remove('show');
    statusEl.textContent = '';
    statusEl.hidden = true;
    statusTimer = 0;
  }
  function showStatus(text) {
    const message = String(text || '').trim();
    if (!message) {
      hideStatus();
      return;
    }
    statusEl.textContent = message;
    statusEl.hidden = false;
    statusEl.classList.add('show');
    statusTimer = roundEnding || matchEnding ? 3.2 : 1.2;
  }

  function clearDamageNumbers() {
    for (const effect of damageNumberEffects) effect.element?.remove();
    damageNumberEffects.length = 0;
    if (damageNumbersEl) damageNumbersEl.textContent = '';
  }

  function damageNumberScreenPosition(camera, subject, incoming = false) {
    if (!camera || !subject) return { x: 50, y: incoming ? 54 : 42 };
    const bearing = Math.atan2(subject.y - camera.y, subject.x - camera.x);
    const relative = clamp(angleDiff(bearing, camera.angle) / (FOV * 0.5), -1, 1);
    const distance = Math.hypot(subject.x - camera.x, subject.y - camera.y);
    return {
      x: incoming ? 50 + relative * 18 : 50 + relative * 38,
      y: incoming ? 55 : clamp(44 - distance * 0.36, 28, 44)
    };
  }

  function spawnDamageNumber(shooter, target, amount, fatal = false, critical = false, headshot = false) {
    if (!damageNumbersEl || !shooter || !target || !(amount > 0)) return false;
    const viewed = bots[spectatorIndex];
    let kind = '';
    let subject = null;
    if (shooter === viewed && target.team !== viewed.team) {
      kind = 'dealt';
      subject = target;
      hitPulse = Math.max(hitPulse, fatal ? 1 : (headshot ? 0.98 : (critical ? 0.9 : 0.7)));
    } else if (target === viewed && shooter.team !== viewed.team) {
      kind = 'incoming';
      subject = shooter;
    } else {
      return false;
    }
    const position = damageNumberScreenPosition(viewed, subject, kind === 'incoming');
    const element = document.createElement('span');
    const rounded = Math.max(1, Math.round(amount));
    element.className = `damage-number ${kind}${fatal ? ' fatal' : ''}${critical ? ' critical' : ''}${headshot ? ' headshot' : ''}${rounded >= 30 ? ' heavy' : ''}`;
    const tag = headshot
      ? (critical ? (fatal ? 'CRIT HEADSHOT DOWN' : 'CRIT HEADSHOT') : (fatal ? 'HEADSHOT DOWN' : 'HEADSHOT'))
      : (critical ? (fatal ? 'CRIT DOWN' : 'CRIT') : (fatal ? 'DOWN' : (kind === 'incoming' ? 'HIT' : 'DMG')));
    element.innerHTML = `<span class="damage-number-value">${kind === 'incoming' ? '−' : '+'}${rounded}</span><span class="damage-number-tag">${tag}</span>`;
    element.style.left = `${position.x + (Math.random() - 0.5) * 2.5}%`;
    element.style.top = `${position.y + (Math.random() - 0.5) * 2}%`;
    damageNumbersEl.appendChild(element);
    const lifetime = fatal ? 1.12 : (headshot ? 1.04 : (critical ? 0.98 : 0.82));
    damageNumberEffects.push({ id: ++damageNumberSequence, element, life: lifetime, maxLife: lifetime, rise: fatal ? 36 : (headshot ? 34 : (critical ? 31 : 25)) });
    while (damageNumberEffects.length > 18) {
      const oldest = damageNumberEffects.shift();
      oldest?.element?.remove();
      combatDebug.damageNumbersExpired++;
    }
    combatDebug.damageNumbersSpawned++;
    return true;
  }

  function updateDamageNumbers(dt) {
    for (let i = damageNumberEffects.length - 1; i >= 0; i--) {
      const effect = damageNumberEffects[i];
      effect.life -= dt;
      const progress = clamp(1 - effect.life / effect.maxLife, 0, 1);
      if (effect.element) {
        effect.element.style.transform = `translate(-50%, calc(-50% - ${progress * effect.rise}px)) scale(${1 + Math.sin(progress * Math.PI) * 0.08})`;
        effect.element.style.opacity = `${clamp(1 - Math.max(0, progress - 0.56) / 0.44, 0, 1)}`;
      }
      if (effect.life <= 0) {
        effect.element?.remove();
        damageNumberEffects.splice(i, 1);
        combatDebug.damageNumbersExpired++;
      }
    }
  }
  function selectLiving(direction = 1) {
    const ownedIndices = bots
      .map((bot, index) => ({ bot, index }))
      .filter(entry => entry.bot.team === CAREER_OWNED_TEAM && entry.bot.alive)
      .map(entry => entry.index);
    if (!ownedIndices.length) return false;
    const currentPosition = ownedIndices.indexOf(spectatorIndex);
    const step = direction < 0 ? -1 : 1;
    const start = currentPosition >= 0 ? currentPosition : (step > 0 ? -1 : 0);
    spectatorIndex = ownedIndices[(start + step + ownedIndices.length) % ownedIndices.length];
    autoTimer = 5.2;
    spectatorDeathSwitchTimer = 0;
    spectatorDeathSwitchKey = '';
    updateHud();
    return true;
  }
