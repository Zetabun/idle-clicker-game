/*
 * Strikewatch source module: 34-squad-dynamics.js
 * Purpose: Passive squad partnerships, atmosphere reads and small positive-only coordination buffs.
 *
 * This file is a source fragment. Run `python3 build.py` to regenerate
 * js/strikewatch.dev.js and the standalone release in dist/.
 */

  const SQUAD_DYNAMICS_TIERS = Object.freeze([
    Object.freeze({ id: 'new', min: 0, label: 'NEW UNIT', short: 'NEW', level: 0, detail: 'Still learning one another\'s timing.' }),
    Object.freeze({ id: 'familiar', min: 15, label: 'FAMILIAR PAIR', short: 'FAMILIAR', level: 1, detail: 'Basic spacing and support habits are forming.' }),
    Object.freeze({ id: 'linked', min: 35, label: 'LINKED PAIR', short: 'LINKED', level: 2, detail: 'Reliable shared timing creates a small coordination buff.' }),
    Object.freeze({ id: 'trusted', min: 60, label: 'TRUSTED PAIR', short: 'TRUSTED', level: 3, detail: 'Strong familiarity improves support and role execution.' }),
    Object.freeze({ id: 'elite', min: 82, label: 'ELITE PARTNERSHIP', short: 'ELITE', level: 4, detail: 'An established partnership produces the maximum dynamics buff.' })
  ]);

  function makeDefaultSquadDynamicsState() {
    return { version: 1, pairs: {}, recentEvents: [], lastSettledMatch: 0, lastUpdate: null };
  }

  function squadDynamicsPairKey(firstId, secondId) {
    return [String(firstId || ''), String(secondId || '')].sort().join('::');
  }

  function normaliseSquadDynamics(raw, squad = []) {
    const fallback = makeDefaultSquadDynamicsState();
    if (!raw || typeof raw !== 'object') return fallback;
    const validIds = new Set((Array.isArray(squad) ? squad : []).map(player => String(player?.id || '')).filter(Boolean));
    const pairs = {};
    const sourcePairs = raw.pairs && typeof raw.pairs === 'object' && !Array.isArray(raw.pairs) ? raw.pairs : {};
    for (const [rawKey, value] of Object.entries(sourcePairs)) {
      if (!value || typeof value !== 'object') continue;
      const ids = Array.isArray(value.playerIds) ? value.playerIds.map(String).slice(0, 2) : String(rawKey || '').split('::').slice(0, 2);
      if (ids.length !== 2 || ids[0] === ids[1] || !validIds.has(ids[0]) || !validIds.has(ids[1])) continue;
      const key = squadDynamicsPairKey(ids[0], ids[1]);
      pairs[key] = {
        playerIds: key.split('::'),
        score: clamp(Math.round(Number(value.score) || 0), 0, 100),
        matches: Math.max(0, Math.round(Number(value.matches) || 0)),
        wins: Math.max(0, Math.round(Number(value.wins) || 0)),
        lastMatchNumber: Math.max(0, Math.round(Number(value.lastMatchNumber) || 0)),
        lastMatchDay: Number.isFinite(Number(value.lastMatchDay)) ? Math.max(0, Math.round(Number(value.lastMatchDay))) : -1,
        lastDelta: clamp(Math.round(Number(value.lastDelta) || 0), 0, 12),
        lastReason: String(value.lastReason || '').slice(0, 220),
        milestones: Array.isArray(value.milestones) ? value.milestones.map(String).filter(id => SQUAD_DYNAMICS_TIERS.some(tier => tier.id === id)).slice(0, 5) : []
      };
    }
    const events = Array.isArray(raw.recentEvents) ? raw.recentEvents.slice(0, 12).map((event, index) => ({
      id: String(event?.id || `DYN-${index}`),
      type: String(event?.type || 'partnership'),
      title: String(event?.title || 'Squad connection').slice(0, 90),
      detail: String(event?.detail || '').slice(0, 420),
      day: Number.isFinite(Number(event?.day)) ? Math.max(0, Math.round(Number(event.day))) : 0,
      matchNumber: Math.max(0, Math.round(Number(event?.matchNumber) || 0)),
      playerIds: Array.isArray(event?.playerIds) ? event.playerIds.map(String).filter(id => validIds.has(id)).slice(0, 2) : [],
      tierId: String(event?.tierId || ''),
      score: clamp(Math.round(Number(event?.score) || 0), 0, 100)
    })).filter(event => event.playerIds.length === 2) : [];
    return {
      version: 1,
      pairs,
      recentEvents: events,
      lastSettledMatch: Math.max(0, Math.round(Number(raw.lastSettledMatch) || 0)),
      lastUpdate: raw.lastUpdate && typeof raw.lastUpdate === 'object' ? {
        matchNumber: Math.max(0, Math.round(Number(raw.lastUpdate.matchNumber) || 0)),
        topPairKey: String(raw.lastUpdate.topPairKey || ''),
        gained: Math.max(0, Math.round(Number(raw.lastUpdate.gained) || 0)),
        milestoneCount: Math.max(0, Math.round(Number(raw.lastUpdate.milestoneCount) || 0))
      } : null
    };
  }

  function squadDynamicsState() {
    if (!careerState.squadDynamics || typeof careerState.squadDynamics !== 'object') careerState.squadDynamics = makeDefaultSquadDynamicsState();
    if (!careerState.squadDynamics.pairs || typeof careerState.squadDynamics.pairs !== 'object' || Array.isArray(careerState.squadDynamics.pairs)) careerState.squadDynamics.pairs = {};
    if (!Array.isArray(careerState.squadDynamics.recentEvents)) careerState.squadDynamics.recentEvents = [];
    return careerState.squadDynamics;
  }

  function squadDynamicsTier(score = 0) {
    const value = clamp(Math.round(Number(score) || 0), 0, 100);
    for (let index = SQUAD_DYNAMICS_TIERS.length - 1; index >= 0; index--) {
      if (value >= SQUAD_DYNAMICS_TIERS[index].min) return SQUAD_DYNAMICS_TIERS[index];
    }
    return SQUAD_DYNAMICS_TIERS[0];
  }

  function squadDynamicsNextTier(score = 0) {
    const current = squadDynamicsTier(score);
    return SQUAD_DYNAMICS_TIERS.find(tier => tier.min > current.min) || null;
  }

  function squadDynamicsPlayer(playerId) {
    return (careerState.squad || []).find(player => String(player.id) === String(playerId)) || null;
  }

  function squadDynamicsPairRecord(firstId, secondId, create = false) {
    const state = squadDynamicsState();
    const key = squadDynamicsPairKey(firstId, secondId);
    if (!key || key === '::') return null;
    if (!state.pairs[key] && create) {
      state.pairs[key] = { playerIds: key.split('::'), score: 0, matches: 0, wins: 0, lastMatchNumber: 0, lastMatchDay: -1, lastDelta: 0, lastReason: '', milestones: [] };
    }
    return state.pairs[key] || null;
  }

  function squadDynamicsPairArchetype(first, second) {
    const roles = new Set([String(first?.role || 'flex'), String(second?.role || 'flex')]);
    if (roles.has('entry') && (roles.has('support') || roles.has('caller'))) return { id: 'trade', label: 'ENTRY SUPPORT LINK', effect: 'Closer support spacing and more reliable trade reactions.' };
    if (roles.has('anchor') && roles.has('marksman')) return { id: 'crossfire', label: 'CROSSFIRE PAIR', effect: 'Improved awareness and steadier long-lane coordination.' };
    if (roles.has('entry') && roles.has('flanker')) return { id: 'pressure', label: 'PRESSURE PAIR', effect: 'More confident movement when collapsing from separate angles.' };
    if ((roles.has('support') || roles.has('caller')) && roles.has('anchor')) return { id: 'control', label: 'CONTROL PAIR', effect: 'Stronger group discipline around useful territory.' };
    if (roles.has('flanker') && roles.has('caller')) return { id: 'rotation', label: 'ROTATION LINK', effect: 'Cleaner route changes and flank timing.' };
    return { id: 'flex', label: 'FLEXIBLE LINK', effect: 'A small all-round coordination improvement.' };
  }

  function squadDynamicsPairSnapshot(record) {
    if (!record) return null;
    const first = squadDynamicsPlayer(record.playerIds?.[0]);
    const second = squadDynamicsPlayer(record.playerIds?.[1]);
    if (!first || !second) return null;
    const tier = squadDynamicsTier(record.score);
    const nextTier = squadDynamicsNextTier(record.score);
    return {
      key: squadDynamicsPairKey(first.id, second.id),
      record,
      first,
      second,
      tier,
      nextTier,
      archetype: squadDynamicsPairArchetype(first, second),
      progress: nextTier ? clamp(((record.score - tier.min) / Math.max(1, nextTier.min - tier.min)) * 100, 0, 100) : 100
    };
  }

  function squadDynamicsAllPairs() {
    return Object.values(squadDynamicsState().pairs).map(squadDynamicsPairSnapshot).filter(Boolean).sort((a, b) => b.record.score - a.record.score || b.record.matches - a.record.matches);
  }

  function squadDynamicsActivePairs() {
    const activeIds = new Set((careerState.squad || []).slice(0, TEAM_REQUIRED_STARTERS).map(player => String(player.id)));
    return squadDynamicsAllPairs().filter(pair => activeIds.has(String(pair.first.id)) && activeIds.has(String(pair.second.id)));
  }

  function squadDynamicsPairsForPlayer(playerId, activeOnly = false) {
    const source = activeOnly ? squadDynamicsActivePairs() : squadDynamicsAllPairs();
    return source.filter(pair => pair.record.playerIds.includes(String(playerId)));
  }

  function squadDynamicsMentorship() {
    const squad = careerState.squad || [];
    let best = null;
    for (const mentor of squad) {
      const experience = Math.max(0, Number(mentor?.career?.matches) || 0);
      if ((Number(mentor.age) || 0) < 27 && experience < 12) continue;
      for (const learner of squad) {
        if (learner.id === mentor.id || (Number(learner.age) || 99) > 23) continue;
        const potentialGap = Math.max(0, (Number(learner.potential) || 0) - (typeof teamPlayerOverall === 'function' ? teamPlayerOverall(learner) : 0));
        if (potentialGap < 7) continue;
        const roleFit = mentor.role === learner.role || mentor.secondaryRole === learner.role || learner.secondaryRole === mentor.role ? 8 : 0;
        const pair = squadDynamicsPairRecord(mentor.id, learner.id, false);
        const score = experience * 0.45 + Math.max(0, (Number(mentor.age) || 27) - 26) * 1.4 + potentialGap + roleFit + (Number(pair?.score) || 0) * 0.18;
        if (!best || score > best.score) best = { mentor, learner, score, pairScore: Number(pair?.score) || 0, multiplier: 1.06 };
      }
    }
    return best;
  }

  function squadDynamicsDevelopmentMultiplier(player) {
    const mentorship = squadDynamicsMentorship();
    return mentorship && mentorship.learner.id === player?.id ? mentorship.multiplier : 1;
  }

  function squadDynamicsAtmosphere() {
    const squad = careerState.squad || [];
    const active = squad.slice(0, TEAM_REQUIRED_STARTERS);
    const morale = active.length ? active.reduce((sum, player) => sum + clamp(Number(player.morale) || 70, 1, 100), 0) / active.length : 55;
    const happiness = active.length ? active.reduce((sum, player) => sum + clamp(Number(player.happiness) || 70, 1, 100), 0) / active.length : 55;
    const activePairs = squadDynamicsActivePairs();
    const cohesion = activePairs.length ? activePairs.reduce((sum, pair) => sum + pair.record.score, 0) / activePairs.length : 0;
    const score = Math.round(clamp(morale * 0.38 + happiness * 0.37 + cohesion * 0.25, 0, 100));
    if (score >= 82) return { score, label: 'UNITED', tone: 'elite', detail: 'The active five has strong confidence and established shared timing.', bonusScale: 1 };
    if (score >= 70) return { score, label: 'POSITIVE', tone: 'trusted', detail: 'The group is settled and beginning to coordinate naturally.', bonusScale: 0.68 };
    if (score >= 56) return { score, label: 'SETTLING', tone: 'linked', detail: 'The squad is stable, with partnerships still developing.', bonusScale: 0.35 };
    return { score, label: 'DEVELOPING', tone: 'new', detail: 'No penalty applies; the group simply has fewer positive dynamics buffs yet.', bonusScale: 0 };
  }

  function squadDynamicsSnapshot() {
    const state = squadDynamicsState();
    const allPairs = squadDynamicsAllPairs();
    const activePairs = squadDynamicsActivePairs();
    const atmosphere = squadDynamicsAtmosphere();
    const mentorship = squadDynamicsMentorship();
    const activeBuffs = activePairs.filter(pair => pair.tier.level >= 1).slice(0, 4);
    const developing = activePairs.filter(pair => pair.tier.level === 0).sort((a, b) => b.record.score - a.record.score).slice(0, 3);
    const reserves = (careerState.squad || []).slice(TEAM_REQUIRED_STARTERS);
    const rotationWatch = reserves.filter(player => Number(player.happiness) < 58 || player.playingTimePromiseUntil || (player.contractPromise && !player.contractPromise.reviewed)).slice(0, 3);
    return { state, allPairs, activePairs, activeBuffs, developing, atmosphere, mentorship, rotationWatch, topPair: allPairs[0] || null };
  }

  function squadDynamicsBuffForPlayer(player) {
    const activePairs = squadDynamicsPairsForPlayer(player?.id, true);
    const strongest = activePairs[0] || null;
    const tierLevel = strongest?.tier?.level || 0;
    const archetype = strongest?.archetype?.id || 'none';
    const atmosphere = squadDynamicsAtmosphere();
    const teamSkill = atmosphere.bonusScale * 0.008;
    const buff = {
      active: Boolean(strongest && tierLevel > 0),
      label: strongest ? `${strongest.tier.short} · ${strongest.archetype.label}` : 'NO ACTIVE PARTNERSHIP',
      partnerName: strongest ? (strongest.first.id === player?.id ? strongest.second.name : strongest.first.name) : '',
      score: strongest?.record?.score || 0,
      tierLevel,
      skillMultiplier: 1 + teamSkill,
      moveMultiplier: 1,
      speedMultiplier: 1,
      reactionReduction: 0,
      supportRadius: 0,
      tradeBias: 0,
      groupBias: 0,
      flankBias: 0,
      hearingBonus: 0,
      effect: strongest?.archetype?.effect || 'Partnership buffs unlock automatically through matches together.'
    };
    if (!strongest || tierLevel <= 0) return buff;
    buff.skillMultiplier += 0.0025 * tierLevel;
    if (archetype === 'trade') {
      buff.supportRadius += 0.08 * tierLevel;
      buff.tradeBias += 0.018 * tierLevel;
    } else if (archetype === 'crossfire') {
      buff.hearingBonus += 0.012 * tierLevel;
      buff.reactionReduction += 0.003 * tierLevel;
      buff.groupBias += 0.008 * tierLevel;
    } else if (archetype === 'pressure') {
      buff.moveMultiplier += 0.004 * tierLevel;
      buff.speedMultiplier += 0.003 * tierLevel;
      buff.flankBias += 0.012 * tierLevel;
    } else if (archetype === 'control') {
      buff.supportRadius += 0.07 * tierLevel;
      buff.groupBias += 0.018 * tierLevel;
    } else if (archetype === 'rotation') {
      buff.moveMultiplier += 0.003 * tierLevel;
      buff.flankBias += 0.015 * tierLevel;
      buff.reactionReduction += 0.002 * tierLevel;
    } else {
      buff.skillMultiplier += 0.002 * tierLevel;
      buff.supportRadius += 0.04 * tierLevel;
    }
    return buff;
  }

  function squadDynamicsBuffEffectText(buff) {
    if (!buff?.active) return 'No active partnership buff yet.';
    const effects = [];
    const execution = Math.max(0, (Number(buff.skillMultiplier) || 1) - 1);
    if (execution > 0.0005) effects.push(`+${(execution * 100).toFixed(1)}% role execution`);
    if (Number(buff.supportRadius) > 0.005) effects.push(`+${Number(buff.supportRadius).toFixed(2)}m support radius`);
    if (Number(buff.tradeBias) > 0.005) effects.push(`+${Math.round(Number(buff.tradeBias) * 100)}% trade priority`);
    if (Number(buff.groupBias) > 0.005) effects.push(`+${Math.round(Number(buff.groupBias) * 100)}% group discipline`);
    if (Number(buff.flankBias) > 0.005) effects.push(`+${Math.round(Number(buff.flankBias) * 100)}% flank coordination`);
    if (Number(buff.moveMultiplier) > 1.0005) effects.push(`+${((Number(buff.moveMultiplier) - 1) * 100).toFixed(1)}% movement execution`);
    if (Number(buff.reactionReduction) > 0.0005) effects.push(`${Math.round(Number(buff.reactionReduction) * 1000)}ms faster reaction`);
    return effects.join(' · ') || 'Small positive coordination buff.';
  }

  function applySquadDynamicsToBot(bot, player) {
    if (!bot || !player || !bot.isPlayerOwned) return bot;
    const buff = squadDynamicsBuffForPlayer(player);
    bot.squadDynamicsBuff = { ...buff };
    bot.skill *= buff.skillMultiplier;
    bot.moveSkill *= buff.moveMultiplier;
    bot.speed *= buff.speedMultiplier;
    bot.reactionDelay = clamp((Number(bot.reactionDelay) || 0.25) - buff.reactionReduction, 0.10, 0.46);
    bot.supportRadius = Math.max(2.8, (Number(bot.supportRadius) || 3.55) + buff.supportRadius);
    bot.tradeBias = clamp((Number(bot.tradeBias) || 0) + buff.tradeBias, 0, 1);
    bot.groupBias = clamp((Number(bot.groupBias) || 0) + buff.groupBias, 0, 1);
    bot.flankBias = clamp((Number(bot.flankBias) || 0) + buff.flankBias, 0, 1);
    bot.hearing = Math.max(0, (Number(bot.hearing) || 0) + buff.hearingBonus);
    return bot;
  }

  function squadDynamicsPairMatchDelta(first, second, won) {
    const firstMatch = first?.lastMatch || {};
    const secondMatch = second?.lastMatch || {};
    const combinedTrades = Math.max(0, Number(firstMatch.tradeKills) || 0) + Math.max(0, Number(secondMatch.tradeKills) || 0);
    const combinedSupport = Math.max(0, Number(firstMatch.supportedTime) || 0) + Math.max(0, Number(secondMatch.supportedTime) || 0);
    const combinedIsolation = Math.max(0, Number(firstMatch.isolatedTime) || 0) + Math.max(0, Number(secondMatch.isolatedTime) || 0);
    const supportShare = combinedSupport / Math.max(1, combinedSupport + combinedIsolation);
    const averageRating = ((Number(firstMatch.rating) || 0) + (Number(secondMatch.rating) || 0)) / 2;
    let delta = 3;
    const reasons = ['shared match experience'];
    if (won) { delta += 1; reasons.push('victory'); }
    if (combinedTrades >= 2) { delta += 2; reasons.push(`${combinedTrades} combined trades`); }
    else if (combinedTrades >= 1) { delta += 1; reasons.push('trade conversion'); }
    if (supportShare >= 0.58) { delta += 2; reasons.push('strong support spacing'); }
    else if (supportShare >= 0.42) { delta += 1; reasons.push('useful support time'); }
    if (averageRating >= 7.2) { delta += 1; reasons.push('strong joint performance'); }
    if (squadDynamicsPairArchetype(first, second).id !== 'flex') delta += 1;
    return { delta: clamp(delta, 2, 10), reason: reasons.join(', '), supportShare, combinedTrades, averageRating };
  }

  function settleSquadDynamicsAfterMatch(winner, summary = null) {
    if (!careerState.created || (careerState.squad || []).length < 2) return null;
    const state = squadDynamicsState();
    const matchNumber = Math.max(0, Math.round(Number(careerState.totalMatches) || 0));
    if (!matchNumber || state.lastSettledMatch === matchNumber) return state.lastUpdate;
    const starters = (careerState.squad || []).slice(0, TEAM_REQUIRED_STARTERS).filter(player => player?.lastMatch);
    const won = winner === CAREER_OWNED_TEAM;
    const day = typeof clubCalendarState === 'function' ? clubCalendarState().absoluteDay : Math.max(0, careerState.week * 7);
    const milestones = [];
    const changed = [];
    for (let firstIndex = 0; firstIndex < starters.length; firstIndex++) {
      for (let secondIndex = firstIndex + 1; secondIndex < starters.length; secondIndex++) {
        const first = starters[firstIndex];
        const second = starters[secondIndex];
        const record = squadDynamicsPairRecord(first.id, second.id, true);
        const before = record.score;
        const outcome = squadDynamicsPairMatchDelta(first, second, won);
        record.score = clamp(before + outcome.delta, 0, 100);
        record.matches += 1;
        record.wins += won ? 1 : 0;
        record.lastMatchNumber = matchNumber;
        record.lastMatchDay = day;
        record.lastDelta = record.score - before;
        record.lastReason = outcome.reason;
        changed.push({ key: squadDynamicsPairKey(first.id, second.id), first, second, before, after: record.score, delta: record.lastDelta, outcome, record });
        for (const tier of SQUAD_DYNAMICS_TIERS.filter(item => item.level > 0)) {
          if (before < tier.min && record.score >= tier.min && !record.milestones.includes(tier.id)) {
            record.milestones.push(tier.id);
            const archetype = squadDynamicsPairArchetype(first, second);
            const event = {
              id: `DYN-${matchNumber}-${milestones.length + 1}`,
              type: 'partnership',
              title: `${tier.label}: ${first.name} & ${second.name}`,
              detail: `${archetype.label}. ${tier.detail} ${archetype.effect}`,
              day,
              matchNumber,
              playerIds: [first.id, second.id],
              tierId: tier.id,
              score: record.score
            };
            state.recentEvents.unshift(event);
            milestones.push(event);
          }
        }
      }
    }
    state.recentEvents = state.recentEvents.slice(0, 12);
    state.lastSettledMatch = matchNumber;
    changed.sort((a, b) => b.delta - a.delta || b.after - a.after);
    state.lastUpdate = {
      matchNumber,
      topPairKey: changed[0]?.key || '',
      gained: changed[0]?.delta || 0,
      milestoneCount: milestones.length
    };
    const notable = milestones.slice().sort((a, b) => squadDynamicsTier(b.score).level - squadDynamicsTier(a.score).level)[0];
    if (notable && typeof clubAddMail === 'function' && squadDynamicsTier(notable.score).level >= 2) {
      clubAddMail(notable.title, `${notable.detail} This is an automatic positive squad effect; no response is required. Review Squad Dynamics for the exact active buff.`, 'SQUAD', false, 'operators');
    }
    const reportMilestones = milestones.slice().sort((a, b) => squadDynamicsTier(b.score).level - squadDynamicsTier(a.score).level || b.score - a.score).slice(0, 3);
    return { ...state.lastUpdate, milestones: reportMilestones.map(event => ({ ...event })), totalMilestones: milestones.length, topChange: changed[0] ? { pairKey: changed[0].key, playerIds: [changed[0].first.id, changed[0].second.id], delta: changed[0].delta, score: changed[0].after } : null };
  }

  function squadDynamicsBadgeMarkup(player) {
    const buff = squadDynamicsBuffForPlayer(player);
    if (!buff.active) return '<span class="squad-dynamics-mini-badge developing">DYNAMICS · DEVELOPING</span>';
    return `<span class="squad-dynamics-mini-badge tier-${buff.tierLevel}">${escapeCareerHtml(buff.label)} · ${escapeCareerHtml(buff.partnerName)}</span>`;
  }

  function renderSquadDynamicsPanel() {
    const snapshot = squadDynamicsSnapshot();
    const atmosphere = snapshot.atmosphere;
    const activeBuffs = snapshot.activeBuffs;
    const developing = snapshot.developing;
    const mentor = snapshot.mentorship;
    const activeMarkup = activeBuffs.length ? activeBuffs.map(pair => {
      const next = pair.nextTier ? `${pair.nextTier.min - pair.record.score} TO ${pair.nextTier.short}` : 'MAXIMUM BOND';
      return `<button type="button" class="squad-dynamics-pair tier-${pair.tier.level}" data-team-profile="${escapeCareerHtml(pair.first.id)}"><header><span>${escapeCareerHtml(pair.archetype.label)}</span><b>${pair.record.score}</b></header><strong>${escapeCareerHtml(pair.first.name)} + ${escapeCareerHtml(pair.second.name)}</strong><small>${escapeCareerHtml(pair.tier.label)} · ${pair.record.matches} MATCH${pair.record.matches === 1 ? '' : 'ES'} TOGETHER</small><i><em style="width:${pair.progress}%"></em></i><p>${escapeCareerHtml(pair.archetype.effect)}</p><footer>${escapeCareerHtml(next)} · OPEN PROFILE</footer></button>`;
    }).join('') : `<div class="squad-dynamics-empty"><strong>PARTNERSHIPS ARE FORMING</strong><p>Play operators together and their strongest positive links will unlock automatically. There are no relationship debuffs while the squad is developing.</p></div>`;
    const developingMarkup = developing.length ? `<section class="squad-dynamics-developing"><span>NEAREST NEW LINKS</span><div>${developing.map(pair => `<button data-team-profile="${escapeCareerHtml(pair.first.id)}"><strong>${escapeCareerHtml(pair.first.name)} + ${escapeCareerHtml(pair.second.name)}</strong><small>${pair.record.score} / ${pair.nextTier?.min || 15} · ${escapeCareerHtml(pair.archetype.label)}</small></button>`).join('')}</div></section>` : '';
    const mentorMarkup = mentor ? `<article class="squad-dynamics-mentor"><span>AUTOMATIC MENTOR LINK</span><strong>${escapeCareerHtml(mentor.mentor.name)} → ${escapeCareerHtml(mentor.learner.name)}</strong><p>${escapeCareerHtml(mentor.learner.name)} receives +${Math.round((mentor.multiplier - 1) * 100)}% training and match-development XP. No weekly meeting or manual assignment is required.</p><button data-team-profile="${escapeCareerHtml(mentor.learner.id)}">OPEN DEVELOPING OPERATOR</button></article>` : `<article class="squad-dynamics-mentor dormant"><span>MENTOR LINK</span><strong>NO NATURAL MATCH YET</strong><p>A suitable experienced operator will automatically support a high-potential younger team-mate when the squad contains one.</p></article>`;
    const rotationMarkup = snapshot.rotationWatch.length ? `<article class="squad-dynamics-rotation"><span>QUIET ROTATION WATCH</span><strong>${snapshot.rotationWatch.length} OPERATOR${snapshot.rotationWatch.length === 1 ? '' : 'S'} TO MONITOR</strong><p>${snapshot.rotationWatch.map(player => player.name).join(' · ')}. This is advisory only and never blocks End Day.</p></article>` : `<article class="squad-dynamics-rotation positive"><span>ROTATION WATCH</span><strong>NO IMMEDIATE CONCERNS</strong><p>The dynamics system will surface sustained playing-time or happiness issues here without creating routine pop-ups.</p></article>`;
    return `<section class="squad-dynamics-panel" data-management-target-id="operators:dynamics">
      <header class="squad-dynamics-head"><div><span>PASSIVE SQUAD SYSTEM</span><strong>SQUAD DYNAMICS</strong><p>Relationships grow from matches, support spacing, trades and shared results. Positive links create small coordination buffs; weak links never impose hidden penalties.</p></div><aside class="${atmosphere.tone}"><span>ATMOSPHERE</span><strong>${escapeCareerHtml(atmosphere.label)}</strong><b>${atmosphere.score}</b><small>${escapeCareerHtml(atmosphere.detail)}</small></aside></header>
      <div class="squad-dynamics-policy"><b>LOW-MAINTENANCE RULES</b><span>Automatic growth</span><span>Positive buffs only</span><span>No mandatory conversations</span><span>No End Day blockers</span></div>
      <div class="squad-dynamics-pairs">${activeMarkup}</div>
      ${developingMarkup}
      <div class="squad-dynamics-secondary">${mentorMarkup}${rotationMarkup}</div>
    </section>`;
  }

  function renderPlayerDynamicsPanel(player) {
    if (!player || !(careerState.squad || []).some(candidate => candidate.id === player.id)) return '';
    const pairs = squadDynamicsPairsForPlayer(player.id, false).slice(0, 4);
    const buff = squadDynamicsBuffForPlayer(player);
    const mentor = squadDynamicsMentorship();
    const mentorText = mentor?.learner?.id === player.id
      ? `${mentor.mentor.name} is providing an automatic +${Math.round((mentor.multiplier - 1) * 100)}% development link.`
      : mentor?.mentor?.id === player.id
        ? `${player.name} is automatically mentoring ${mentor.learner.name}.`
        : 'No automatic mentor relationship is currently active.';
    const pairMarkup = pairs.length ? pairs.map(pair => {
      const partner = pair.first.id === player.id ? pair.second : pair.first;
      return `<button data-team-profile="${escapeCareerHtml(partner.id)}" class="tier-${pair.tier.level}"><span>${escapeCareerHtml(pair.tier.label)}</span><strong>${escapeCareerHtml(partner.name)}</strong><small>${escapeCareerHtml(pair.archetype.label)} · ${pair.record.score} BOND · ${pair.record.matches} MATCH${pair.record.matches === 1 ? '' : 'ES'}</small></button>`;
    }).join('') : '<div class="squad-dynamics-profile-empty">This operator has not yet completed a match alongside another contracted operator.</div>';
    return `<section class="team-profile-panel squad-dynamics-profile"><div class="career-section-head compact"><div><span>PASSIVE RELATIONSHIPS</span><strong>SQUAD DYNAMICS</strong></div><p>These links grow automatically and never require routine responses.</p></div><div class="squad-dynamics-profile-buff ${buff.active ? `tier-${buff.tierLevel}` : 'developing'}"><span>CURRENT MATCH BUFF</span><strong>${escapeCareerHtml(buff.label)}</strong><small>${buff.active ? `${escapeCareerHtml(buff.partnerName)} · ${escapeCareerHtml(squadDynamicsBuffEffectText(buff))}` : 'No penalty. Continue selecting compatible operators together to build a positive link.'}</small></div><div class="squad-dynamics-profile-pairs">${pairMarkup}</div><p class="squad-dynamics-profile-mentor"><strong>MENTORSHIP</strong> · ${escapeCareerHtml(mentorText)}</p></section>`;
  }

  function renderSquadDynamicsMatchReport(summary) {
    const update = summary?.squadDynamicsUpdate || summary?.finance?.squadDynamics || null;
    if (!update) return '';
    const milestones = Array.isArray(update.milestones) ? update.milestones : [];
    const top = update.topChange;
    const topPlayers = top?.playerIds?.map(squadDynamicsPlayer).filter(Boolean) || [];
    return `<section class="career-report-dynamics"><div class="career-section-head compact"><div><span>SQUAD DYNAMICS</span><strong>RELATIONSHIPS DEVELOPED PASSIVELY</strong></div><p>No manager response is required.</p></div>${milestones.length ? `<div class="career-report-dynamics-milestones">${milestones.map(event => `<article><span>${escapeCareerHtml(squadDynamicsTier(event.score).label)}</span><strong>${escapeCareerHtml(event.title.replace(/^.*?:\s*/, ''))}</strong><small>${escapeCareerHtml(event.detail)}</small></article>`).join('')}</div>` : top && topPlayers.length === 2 ? `<article class="career-report-dynamics-progress"><span>STRONGEST GROWTH</span><strong>${escapeCareerHtml(topPlayers[0].name)} + ${escapeCareerHtml(topPlayers[1].name)} · +${top.delta}</strong><small>Bond now ${top.score}. Shared matches, support and trades build the next automatic buff tier.</small></article>` : '<p class="career-report-dynamics-quiet">The active five gained shared experience, but no single partnership stood out.</p>'}</section>`;
  }

  function squadDynamicsForTest() {
    const snapshot = squadDynamicsSnapshot();
    return {
      atmosphere: { ...snapshot.atmosphere },
      activePairs: snapshot.activePairs.map(pair => ({ key: pair.key, playerIds: [...pair.record.playerIds], score: pair.record.score, matches: pair.record.matches, tier: pair.tier.id, tierLevel: pair.tier.level, archetype: pair.archetype.id })),
      buffs: (careerState.squad || []).slice(0, TEAM_REQUIRED_STARTERS).map(player => ({ playerId: player.id, ...squadDynamicsBuffForPlayer(player) })),
      mentorship: snapshot.mentorship ? { mentorId: snapshot.mentorship.mentor.id, learnerId: snapshot.mentorship.learner.id, multiplier: snapshot.mentorship.multiplier } : null,
      rotationWatch: snapshot.rotationWatch.map(player => player.id),
      lastUpdate: snapshot.state.lastUpdate ? { ...snapshot.state.lastUpdate } : null
    };
  }
