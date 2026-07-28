/*
 * Strikewatch source module: 39-workflow-integrity.js
 * Purpose: exact action routing, arrival banners and reversible management drafts.
 *
 * This file shares the application scope with the other source fragments.
 * Run `python3 build.py` to regenerate the development bundle and standalone.
 */

  let workflowTacticsDraft = null;
  let workflowLineupDraft = null;
  let workflowLoadoutDraft = null;
  let workflowTrainingDrafts = new Map();
  let workflowPendingAction = null;
  let managementArrival = null;

  function workflowClone(value) {
    if (value === undefined) return undefined;
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; }
  }

  function workflowStable(value) {
    if (Array.isArray(value)) return value.map(workflowStable);
    if (!value || typeof value !== 'object') return value;
    return Object.keys(value).sort().reduce((out, key) => {
      out[key] = workflowStable(value[key]);
      return out;
    }, {});
  }

  function workflowEqual(a, b) {
    return JSON.stringify(workflowStable(a)) === JSON.stringify(workflowStable(b));
  }

  function workflowPersistentTacticsSnapshot() {
    const tactics = typeof clubTacticsState === 'function' ? clubTacticsState() : (careerState.tactics || {});
    return {
      formationId: CLUB_FORMATIONS?.[tactics.formationId] ? tactics.formationId : 'balanced',
      lineupMode: tactics.lineupMode === 'assistant' ? 'assistant' : 'manual',
      approachId: CLUB_APPROACHES?.[tactics.approachId] ? tactics.approachId : 'balanced',
      engagementId: CLUB_ENGAGEMENTS?.[tactics.engagementId] ? tactics.engagementId : 'mixed',
      priorityId: CLUB_PRIORITIES?.[tactics.priorityId] ? tactics.priorityId : 'trade',
      arenaId: typeof arenaMeta === 'function' ? arenaMeta(tactics.arenaId).id : (tactics.arenaId || 'citadel'),
      assignments: { ...(tactics.assignments || {}) }
    };
  }

  function workflowEnsureTacticsDraft() {
    if (!workflowTacticsDraft) {
      const original = workflowPersistentTacticsSnapshot();
      workflowTacticsDraft = { original: workflowClone(original), values: workflowClone(original) };
    }
    return workflowTacticsDraft;
  }

  function workflowTacticsReadState() {
    const persistent = typeof clubTacticsState === 'function' ? clubTacticsState() : (careerState.tactics || {});
    if (!workflowTacticsDraft || menuTab !== 'tactics') return persistent;
    return {
      ...persistent,
      ...workflowTacticsDraft.values,
      assignments: { ...(workflowTacticsDraft.values.assignments || {}) }
    };
  }

  function workflowTacticsDirty() {
    return Boolean(workflowTacticsDraft && !workflowEqual(workflowTacticsDraft.original, workflowTacticsDraft.values));
  }

  function workflowSetTacticsField(field, value, options = {}) {
    const allowed = new Set(['formationId', 'lineupMode', 'approachId', 'engagementId', 'priorityId', 'arenaId']);
    if (!allowed.has(field)) return false;
    const draft = workflowEnsureTacticsDraft();
    draft.values[field] = value;
    if (options.render !== false) updateMenuUI();
    return true;
  }

  function workflowSetTacticsAssignment(playerId, roleId, options = {}) {
    const player = (careerState.squad || []).find(item => item.id === playerId);
    if (!player || !TEAM_ROLES.some(role => role.id === roleId)) return false;
    const draft = workflowEnsureTacticsDraft();
    draft.values.assignments = { ...(draft.values.assignments || {}), [playerId]: roleId };
    if (options.render !== false) updateMenuUI();
    return true;
  }

  function workflowPersistentSquadIds() {
    return (careerState.squad || []).map(player => player.id);
  }

  function workflowNormaliseLineupIds(ids) {
    const squad = careerState.squad || [];
    const valid = new Set(squad.map(player => player.id));
    const seen = new Set();
    const output = [];
    for (const id of Array.isArray(ids) ? ids : []) {
      if (!valid.has(id) || seen.has(id)) continue;
      seen.add(id);
      output.push(id);
    }
    for (const player of squad) {
      if (seen.has(player.id)) continue;
      seen.add(player.id);
      output.push(player.id);
    }
    return output;
  }

  function workflowEnsureLineupDraft() {
    if (!workflowLineupDraft) {
      const originalIds = workflowPersistentSquadIds();
      workflowLineupDraft = { originalIds: [...originalIds], ids: [...originalIds] };
    } else {
      workflowLineupDraft.ids = workflowNormaliseLineupIds(workflowLineupDraft.ids);
      workflowLineupDraft.originalIds = workflowNormaliseLineupIds(workflowLineupDraft.originalIds);
    }
    return workflowLineupDraft;
  }

  function workflowLineupDirty() {
    return Boolean(workflowLineupDraft && !workflowEqual(workflowLineupDraft.originalIds, workflowLineupDraft.ids));
  }

  function workflowSquadForRead(route = menuTab) {
    const squad = careerState.squad || [];
    if (!workflowLineupDraft || !['operators', 'tactics'].includes(route)) return squad;
    const byId = new Map(squad.map(player => [player.id, player]));
    return workflowNormaliseLineupIds(workflowLineupDraft.ids).map(id => byId.get(id)).filter(Boolean);
  }

  function workflowMoveLineupPlayer(playerId, direction, options = {}) {
    if (menuContext === 'pause') return false;
    const draft = workflowEnsureLineupDraft();
    const index = draft.ids.indexOf(playerId);
    const target = clamp(index + (Number(direction) < 0 ? -1 : 1), 0, draft.ids.length - 1);
    if (index < 0 || target === index) return false;
    [draft.ids[index], draft.ids[target]] = [draft.ids[target], draft.ids[index]];
    if (options.render !== false) updateMenuUI();
    return true;
  }

  function workflowSwapLineupPlayer(playerId, starterIndex, options = {}) {
    if (menuContext === 'pause' || appState === 'match') return false;
    const draft = workflowEnsureLineupDraft();
    const reserveIndex = draft.ids.indexOf(playerId);
    const targetIndex = clamp(Math.round(Number(starterIndex) || 0), 0, TEAM_REQUIRED_STARTERS - 1);
    if (reserveIndex < TEAM_REQUIRED_STARTERS || reserveIndex >= draft.ids.length || !draft.ids[targetIndex]) return false;
    [draft.ids[targetIndex], draft.ids[reserveIndex]] = [draft.ids[reserveIndex], draft.ids[targetIndex]];
    if (options.render !== false) updateMenuUI();
    return true;
  }

  function workflowStageAssistantLineup(options = {}) {
    const assistant = typeof clubAssistantManager === 'function' ? clubAssistantManager() : null;
    if (!assistant || (careerState.squad || []).length < TEAM_REQUIRED_STARTERS) return false;
    const tactics = workflowTacticsReadState();
    const formation = CLUB_FORMATIONS?.[tactics.formationId] || CLUB_FORMATIONS.balanced;
    const original = [...(careerState.squad || [])];
    const ranked = original.slice().sort((a, b) => clubPlayerSelectionScore(b, formation, assistant) - clubPlayerSelectionScore(a, formation, assistant));
    const starters = ranked.slice(0, TEAM_REQUIRED_STARTERS);
    const starterIds = new Set(starters.map(player => player.id));
    const reserves = original.filter(player => !starterIds.has(player.id));
    const draft = workflowEnsureLineupDraft();
    draft.ids = [...starters, ...reserves].map(player => player.id);
    if (options.render !== false) updateMenuUI();
    return true;
  }

  function workflowApplyLineupDraft() {
    if (!workflowLineupDirty()) {
      workflowLineupDraft = null;
      return false;
    }
    const squad = careerState.squad || [];
    const byId = new Map(squad.map(player => [player.id, player]));
    const order = workflowNormaliseLineupIds(workflowLineupDraft.ids).map(id => byId.get(id)).filter(Boolean);
    careerState.squad = order;
    workflowLineupDraft = null;
    if (typeof syncCareerFirstStarterWeapon === 'function') syncCareerFirstStarterWeapon();
    return true;
  }

  function workflowApplyTacticsDraft() {
    if (!workflowTacticsDirty()) {
      workflowTacticsDraft = null;
      return false;
    }
    const values = workflowClone(workflowTacticsDraft.values);
    const tactics = typeof clubTacticsState === 'function' ? clubTacticsState() : (careerState.tactics ||= {});
    tactics.formationId = values.formationId;
    tactics.lineupMode = values.lineupMode;
    tactics.approachId = values.approachId;
    tactics.engagementId = values.engagementId;
    tactics.priorityId = values.priorityId;
    tactics.arenaId = values.arenaId;
    tactics.assignments = { ...(values.assignments || {}) };
    workflowTacticsDraft = null;
    return true;
  }

  function workflowSaveMatchSetupDrafts(options = {}) {
    const lineupChanged = workflowApplyLineupDraft();
    const tacticsChanged = workflowApplyTacticsDraft();
    if (!lineupChanged && !tacticsChanged) return false;
    if (typeof clubInvalidateMatchPlan === 'function') clubInvalidateMatchPlan('Saved match setup changes require the plan to be confirmed again.');
    if (careerState.tactics?.lineupMode === 'assistant' && typeof clubAssistantManager === 'function' && clubAssistantManager() && typeof clubApplyAssistantLineup === 'function') {
      clubApplyAssistantLineup(false);
    }
    saveCareerState();
    if (options.render !== false) updateMenuUI();
    return true;
  }

  function workflowSaveLineupDraft(options = {}) {
    const changed = workflowApplyLineupDraft();
    if (!changed) return false;
    if (typeof clubInvalidateMatchPlan === 'function') clubInvalidateMatchPlan('Saved active-operator order requires the plan to be confirmed again.');
    saveCareerState();
    if (options.render !== false) updateMenuUI();
    return true;
  }

  function workflowSaveTacticsDraft(options = {}) {
    const changed = workflowApplyTacticsDraft();
    if (!changed) return false;
    if (typeof clubInvalidateMatchPlan === 'function') clubInvalidateMatchPlan('Saved tactical changes require the plan to be confirmed again.');
    if (careerState.tactics?.lineupMode === 'assistant' && typeof clubAssistantManager === 'function' && clubAssistantManager() && typeof clubApplyAssistantLineup === 'function') {
      clubApplyAssistantLineup(false);
    }
    saveCareerState();
    if (options.render !== false) updateMenuUI();
    return true;
  }

  function workflowDiscardMatchSetupDrafts(options = {}) {
    const dirty = workflowTacticsDirty() || workflowLineupDirty();
    workflowTacticsDraft = null;
    workflowLineupDraft = null;
    if (dirty && options.render !== false) updateMenuUI();
    return dirty;
  }

  function workflowDiscardLineupDraft(options = {}) {
    const dirty = workflowLineupDirty();
    workflowLineupDraft = null;
    if (dirty && options.render !== false) updateMenuUI();
    return dirty;
  }

  function workflowDiscardTacticsDraft(options = {}) {
    const dirty = workflowTacticsDirty();
    workflowTacticsDraft = null;
    if (dirty && options.render !== false) updateMenuUI();
    return dirty;
  }

  function workflowTrainingFocusForPlayer(player) {
    if (!player) return 'none';
    const draft = workflowTrainingDrafts.get(player.id);
    return draft?.focusId || player.trainingFocus || 'none';
  }

  function workflowStageTrainingFocus(playerId, focusId, options = {}) {
    const player = (careerState.squad || []).find(candidate => candidate.id === playerId) || null;
    if (!player || !TRAINING_FOCUS_DEFS?.[focusId]) return false;
    const existing = workflowTrainingDrafts.get(playerId) || { originalFocusId: player.trainingFocus || 'none', focusId: player.trainingFocus || 'none' };
    existing.focusId = focusId;
    if (existing.focusId === existing.originalFocusId) workflowTrainingDrafts.delete(playerId);
    else workflowTrainingDrafts.set(playerId, existing);
    if (options.render !== false) updateMenuUI();
    return true;
  }

  function workflowTrainingDirty() {
    return workflowTrainingDrafts.size > 0;
  }

  function workflowSaveTrainingDrafts(options = {}) {
    if (!workflowTrainingDrafts.size) return false;
    let changed = false;
    // Build 12.139: setPlayerTrainingFocus refuses while a match is live. The
    // result must be honoured — clearing the drafts regardless reported a save
    // that never happened and silently reverted every selection.
    const rejected = new Map();
    for (const [playerId, draft] of workflowTrainingDrafts.entries()) {
      const player = (careerState.squad || []).find(candidate => candidate.id === playerId);
      if (!player || !TRAINING_FOCUS_DEFS?.[draft.focusId]) continue;
      let applied = true;
      if (typeof setPlayerTrainingFocus === 'function') {
        applied = setPlayerTrainingFocus(playerId, draft.focusId, { render: false, save: false }) !== false;
      } else {
        player.trainingFocus = draft.focusId;
      }
      if (applied) changed = true;
      else rejected.set(playerId, draft);
    }
    workflowTrainingDrafts = rejected;
    if (rejected.size && typeof showStatus === 'function') {
      showStatus('TRAINING PROGRAMMES CANNOT CHANGE DURING A LIVE MATCH');
    }
    if (changed) {
      if (careerState.trainingRecommendation) {
        const player = (careerState.squad || []).find(item => item.id === careerState.trainingRecommendation.playerId);
        if (player && player.trainingFocus === careerState.trainingRecommendation.focusId) careerState.trainingRecommendation.seen = true;
      }
      saveCareerState();
    }
    if (options.render !== false) updateMenuUI();
    return changed;
  }

  function workflowDiscardTrainingDrafts(options = {}) {
    const dirty = workflowTrainingDirty();
    workflowTrainingDrafts = new Map();
    if (dirty && options.render !== false) updateMenuUI();
    return dirty;
  }

  function workflowStageLoadout(playerId, weaponId, options = {}) {
    const player = (careerState.squad || []).find(candidate => candidate.id === playerId) || null;
    const weapon = CAREER_WEAPON_CATALOG?.[weaponId] || null;
    if (!player || !weapon || !(careerState.inventory || []).includes(weaponId)) return false;
    const slot = options.slot === 'primary' || options.slot === 'sidearm'
      ? options.slot
      : (typeof careerWeaponSlotType === 'function' ? careerWeaponSlotType(weapon) : (weapon.category === 'pistol' ? 'sidearm' : 'primary'));
    const originalWeaponId = slot === 'primary'
      ? (typeof careerPlayerPrimaryWeaponId === 'function' ? careerPlayerPrimaryWeaponId(player) : player.equippedPrimaryWeaponId)
      : (typeof careerPlayerSidearmId === 'function' ? careerPlayerSidearmId(player) : player.equippedSidearmId);
    if (weaponId === originalWeaponId) workflowLoadoutDraft = null;
    else workflowLoadoutDraft = { playerId, weaponId, originalWeaponId, slot };
    selectedCareerWeaponId = weaponId;
    if (typeof selectedCareerWeaponSlot !== 'undefined') selectedCareerWeaponSlot = slot;
    if (options.render !== false) updateMenuUI();
    return true;
  }

  function workflowLoadoutDirty() {
    return Boolean(workflowLoadoutDraft && workflowLoadoutDraft.weaponId !== workflowLoadoutDraft.originalWeaponId);
  }

  function workflowLoadoutWeaponId(player, slot = null) {
    const requestedSlot = slot || workflowLoadoutDraft?.slot || (typeof selectedCareerWeaponSlot !== 'undefined' ? selectedCareerWeaponSlot : null);
    if (player && workflowLoadoutDraft?.playerId === player.id && (!requestedSlot || workflowLoadoutDraft.slot === requestedSlot)) return workflowLoadoutDraft.weaponId;
    if (requestedSlot === 'primary') return typeof careerPlayerPrimaryWeaponId === 'function' ? careerPlayerPrimaryWeaponId(player) : (player?.equippedPrimaryWeaponId || null);
    if (requestedSlot === 'sidearm') return typeof careerPlayerSidearmId === 'function' ? careerPlayerSidearmId(player) : (player?.equippedSidearmId || 'scrap-p12');
    return typeof careerPlayerEquippedWeaponId === 'function' ? careerPlayerEquippedWeaponId(player) : (player?.equippedWeaponId || 'scrap-p12');
  }

  function workflowSaveLoadoutDraft(options = {}) {
    if (!workflowLoadoutDirty()) return false;
    const draft = { ...workflowLoadoutDraft };
    const player = (careerState.squad || []).find(item => item.id === draft.playerId);
    if (!player) {
      workflowLoadoutDraft = null;
      if (options.render !== false) updateMenuUI();
      return false;
    }
    selectedTeamPlayerId = player.id;
    careerState.selectedPlayerId = player.id;
    workflowLoadoutDraft = null;
    const equipped = typeof equipCareerWeapon === 'function' ? equipCareerWeapon(draft.weaponId, { render: false, save: false, slot: draft.slot }) : false;
    if (equipped) saveCareerState();
    if (options.render !== false) updateMenuUI();
    return Boolean(equipped);
  }

  function workflowDiscardLoadoutDraft(options = {}) {
    const dirty = workflowLoadoutDirty();
    if (workflowLoadoutDraft?.playerId) {
      const player = (careerState.squad || []).find(item => item.id === workflowLoadoutDraft.playerId);
      if (player) {
        selectedCareerWeaponId = workflowLoadoutDraft.slot === 'primary'
          ? (typeof careerPlayerPrimaryWeaponId === 'function' ? careerPlayerPrimaryWeaponId(player) : player.equippedPrimaryWeaponId)
          : (typeof careerPlayerSidearmId === 'function' ? careerPlayerSidearmId(player) : player.equippedSidearmId);
      }
    }
    workflowLoadoutDraft = null;
    if (dirty && options.render !== false) updateMenuUI();
    return dirty;
  }

  function workflowDraftKindForRoute(route = menuTab) {
    if (route === 'tactics') return 'match-setup';
    if (route === 'operators') return 'lineup';
    if (route === 'training') return 'training';
    return '';
  }

  function workflowRouteDirty(route = menuTab) {
    const kind = workflowDraftKindForRoute(route);
    if (kind === 'match-setup') return workflowTacticsDirty() || workflowLineupDirty();
    if (kind === 'lineup') return workflowLineupDirty();
    if (kind === 'training') return workflowTrainingDirty();
    if (kind === 'loadout') return workflowLoadoutDirty();
    return false;
  }

  function workflowSaveForRoute(route = menuTab, options = {}) {
    const kind = workflowDraftKindForRoute(route);
    if (kind === 'match-setup') return workflowSaveMatchSetupDrafts(options);
    if (kind === 'lineup') return workflowSaveLineupDraft(options);
    if (kind === 'training') return workflowSaveTrainingDrafts(options);
    if (kind === 'loadout') return workflowSaveLoadoutDraft(options);
    return false;
  }

  function workflowDiscardForRoute(route = menuTab, options = {}) {
    const kind = workflowDraftKindForRoute(route);
    if (kind === 'match-setup') return workflowDiscardMatchSetupDrafts(options);
    if (kind === 'lineup') return workflowDiscardLineupDraft(options);
    if (kind === 'training') return workflowDiscardTrainingDrafts(options);
    if (kind === 'loadout') return workflowDiscardLoadoutDraft(options);
    return false;
  }

  function workflowHasDirtyMatchSetupDrafts() {
    return workflowTacticsDirty() || workflowLineupDirty();
  }

  function workflowDraftCountForRoute(route = menuTab) {
    if (route === 'tactics') return Number(workflowTacticsDirty()) + Number(workflowLineupDirty());
    if (route === 'operators') return workflowLineupDirty() ? 1 : 0;
    if (route === 'training') return workflowTrainingDrafts.size;
    return 0;
  }

  function renderWorkflowDraftBar(route, title, detail) {
    const dirty = workflowRouteDirty(route);
    const count = workflowDraftCountForRoute(route);
    return `<section class="workflow-save-bar ${dirty ? 'dirty' : 'clean'}" data-workflow-route="${escapeCareerHtml(route)}">
      <div><span>${dirty ? 'UNSAVED CHANGES' : 'CHANGE SAFETY'}</span><strong>${escapeCareerHtml(title)}</strong><small>${escapeCareerHtml(dirty ? `${count} pending change${count === 1 ? '' : 's'} · ${detail}` : detail)}</small></div>
      <div><button type="button" data-workflow-discard="${escapeCareerHtml(route)}" ${dirty ? '' : 'disabled'}>REMOVE CHANGES</button><button type="button" class="primary" data-workflow-save="${escapeCareerHtml(route)}" ${dirty ? '' : 'disabled'}>SAVE CHANGES</button></div>
    </section>`;
  }

  function workflowPendingActionCopy(action) {
    return action && typeof action === 'object' ? { ...action, options: { ...(action.options || {}) } } : null;
  }

  function workflowRequestDiscardConfirmation(action, title = 'UNSAVED MANAGEMENT CHANGES') {
    if (!workflowRouteDirty(menuTab)) return false;
    workflowPendingAction = workflowPendingActionCopy(action);
    const count = workflowDraftCountForRoute(menuTab);
    const actionsHtml = `<footer class="team-note-management-actions workflow-navigation-actions"><button type="button" data-workflow-modal-action="stay">KEEP EDITING</button><button type="button" data-workflow-modal-action="discard">DISCARD & LEAVE</button><button type="button" class="primary" data-workflow-modal-action="save">SAVE & LEAVE</button></footer>`;
    openTeamNoteModal({
      kicker: 'UNSAVED CHANGES',
      title,
      body: `${count} pending change${count === 1 ? '' : 's'} will be lost unless you save. Choose whether to keep editing, discard the draft or save it before continuing.`,
      footer: 'Nothing has been written to the career save yet.',
      tone: 'warning', mode: 'workflow', glyph: '!', actionsHtml,
      dismissHint: 'CHOOSE AN OPTION TO CONTINUE'
    });
    return true;
  }

  function workflowGuardRouteChange(route, options = {}) {
    if (options.skipDraftGuard || route === menuTab || !workflowRouteDirty(menuTab)) return false;
    return workflowRequestDiscardConfirmation({ type: 'route', route, options });
  }

  function workflowGuardHistoryChange(index, options = {}) {
    if (options.skipDraftGuard || !workflowRouteDirty(menuTab)) return false;
    return workflowRequestDiscardConfirmation({ type: 'history', index, options });
  }

  function workflowGuardLoadoutPlayerChange(playerId, navigate = false, options = {}) {
    // Build 11.86: loadout changes autosave immediately, so player switching never requires a draft warning.
    return false;
  }

  function workflowExecutePendingAction() {
    const action = workflowPendingAction;
    workflowPendingAction = null;
    if (!action) return false;
    if (action.type === 'route') {
      setMenuRoute(action.route, { ...(action.options || {}), skipDraftGuard: true });
      return true;
    }
    if (action.type === 'history') {
      applyMenuNavigationHistory(action.index, { ...(action.options || {}), skipDraftGuard: true });
      return true;
    }
    if (action.type === 'loadout-player') {
      selectCareerArmouryPlayer(action.playerId, Boolean(action.navigate), { ...(action.options || {}), skipDraftGuard: true });
      return true;
    }
    return false;
  }

  function handleWorkflowModalAction(event) {
    const button = event.target.closest?.('[data-workflow-modal-action]');
    if (!button) return false;
    const action = button.dataset.workflowModalAction;
    if (action === 'stay') {
      workflowPendingAction = null;
      closeTeamNoteModal({ restoreFocus: false });
      return true;
    }
    if (action === 'save') workflowSaveForRoute(menuTab, { render: false });
    else if (action === 'discard') workflowDiscardForRoute(menuTab, { render: false });
    closeTeamNoteModal({ restoreFocus: false });
    workflowExecutePendingAction();
    return true;
  }

  function workflowResetIntegrityState() {
    workflowTacticsDraft = null;
    workflowLineupDraft = null;
    workflowLoadoutDraft = null;
    workflowTrainingDrafts = new Map();
    workflowPendingAction = null;
    managementArrival = null;
  }

  function managementActionIdForBlocker(blocker) {
    return `blocker:${String(blocker?.id || 'unknown')}`;
  }

  function managementActionPriorityRank(priority) {
    return priority === 'blocking' ? 0 : priority === 'urgent' ? 1 : priority === 'important' ? 2 : 3;
  }

  function managementActionItems() {
    if (!careerState.created) return [];
    const items = [];
    const seen = new Set();
    const add = item => {
      if (!item?.id || seen.has(item.id)) return;
      seen.add(item.id);
      items.push({ priority: 'standard', category: 'CLUB', ...item });
    };

    const blockers = typeof clubEndDayBlockers === 'function' ? clubEndDayBlockers() : [];
    for (const blocker of blockers) {
      add({
        id: managementActionIdForBlocker(blocker),
        blockerId: blocker.id,
        route: blocker.route || 'play',
        label: blocker.label || 'MANAGEMENT RESPONSE REQUIRED',
        detail: blocker.detail || 'Resolve this item before ending the day.',
        category: blocker.category || 'REQUIRED',
        priority: 'blocking',
        playerId: blocker.playerId || null,
        mailId: blocker.mailId || null,
        decisionId: blocker.decisionId || null,
        offerId: blocker.offerId || null,
        incomingId: blocker.incomingId || null,
        sponsorOfferId: blocker.sponsorOfferId || null,
        targetId: blocker.targetId || null
      });
    }

    for (const player of careerState.squad || []) {
      const points = Math.max(0, Math.round(Number(player.unspentPoints) || 0));
      if (points) add({ id: `stat:${player.id}`, route: 'profile', label: `${points} STAT POINT${points === 1 ? '' : 'S'} AVAILABLE`, detail: `Open ${player.name}'s attributes and allocate points. Changes remain reversible until saved.`, category: 'PLAYER DEVELOPMENT', priority: 'important', playerId: player.id, targetId: `player:${player.id}` });
      const injured = typeof playerInjuryActive === 'function' ? playerInjuryActive(player) : Boolean(player?.injury?.active);
      if (injured) add({ id: `injury:${player.id}`, route: 'profile', label: `${player.name.toUpperCase()} · MEDICAL REVIEW`, detail: typeof playerInjuryLabel === 'function' ? playerInjuryLabel(player) : 'Review the active injury and recovery status.', category: 'MEDICAL', priority: 'urgent', playerId: player.id, targetId: `player:${player.id}` });
    }

    const teamPoints = Math.max(0, Math.round(Number(careerState.unspentPoints) || 0));
    if (teamPoints) add({ id: 'team-development', route: 'training', label: `${teamPoints} TEAM DEVELOPMENT POINT${teamPoints === 1 ? '' : 'S'}`, detail: 'Allocate a permanent club benefit from the Training Facility.', category: 'CLUB DEVELOPMENT', priority: 'important', targetId: 'training:team-benefits' });

    const recommendation = careerState.trainingRecommendation;
    if (recommendation?.playerId && !recommendation.seen) {
      const player = (careerState.squad || []).find(item => item.id === recommendation.playerId);
      if (player) add({ id: `training-recommendation:${player.id}`, route: 'training', label: `TRAINING RECOMMENDATION · ${player.name.toUpperCase()}`, detail: recommendation.insight || recommendation.label || 'Review the manager-recommended programme.', category: 'TRAINING', priority: 'important', playerId: player.id, targetId: `training:${player.id}` });
    }

    if (careerState.pendingStoreCrate) add({ id: 'crate:pending', route: 'store', label: 'FIELD CRATE READY TO OPEN', detail: 'A purchased crate is waiting in the Supply Depot.', category: 'SUPPLIES', priority: 'important', targetId: 'crate:pending' });
    if (careerState.lastRound && !careerState.lastRound.reportReviewed) add({ id: 'report:latest', route: 'reports', label: 'NEW AFTER-ACTION REPORT', detail: 'Review the latest team result, player ratings and tactical analysis.', category: 'MATCH REVIEW', priority: 'standard', targetId: 'report:latest' });

    const blockedMailIds = new Set(items.map(item => item.mailId).filter(Boolean));
    for (const mail of (careerState.mail || []).filter(item => !item.read).slice(0, 12)) {
      if (blockedMailIds.has(mail.id)) continue;
      add({ id: `mail:${mail.id}`, route: 'mail', label: mail.subject?.toUpperCase() || 'UNREAD CLUB MESSAGE', detail: String(mail.body || '').slice(0, 150), category: mail.category || 'INBOX', priority: mail.important ? 'important' : 'standard', mailId: mail.id, targetId: `mail:${mail.id}` });
    }

    return items.sort((a, b) => managementActionPriorityRank(a.priority) - managementActionPriorityRank(b.priority) || String(a.label).localeCompare(String(b.label)));
  }

  function managementActionById(id) {
    return managementActionItems().find(item => item.id === id) || null;
  }

  function managementActionsForRoute(route) {
    return managementActionItems().filter(item => item.route === route);
  }

  function managementPrimaryActionForRoute(route) {
    return managementActionsForRoute(route)[0] || null;
  }

  function managementActionStillActive(action) {
    return Boolean(action?.id && managementActionById(action.id));
  }

  function managementSetArrival(action, fromRoute = menuTab) {
    if (!action) return false;
    managementArrival = { ...workflowClone(action), fromRoute, openedAt: Date.now() };
    return true;
  }

  function openManagementAction(actionId, options = {}) {
    const action = managementActionById(actionId);
    if (!action) return false;
    if (typeof restoreCommandViewportOrigin === 'function') restoreCommandViewportOrigin();
    const fromRoute = options.fromRoute || menuTab;
    if (action.playerId) {
      selectedTeamPlayerId = action.playerId;
      careerState.selectedPlayerId = action.playerId;
    }
    if (action.mailId) careerState.selectedMailId = action.mailId;
    if (action.offerId && careerState.transfers) careerState.transfers.selectedOfferId = action.offerId;
    managementSetArrival(action, fromRoute);
    const bypassProgressiveLock = action.priority === 'blocking';
    let opened = true;
    if (menuTab === action.route) updateMenuUI();
    else opened = setMenuRoute(action.route, { ignoreProgressiveLock: bypassProgressiveLock });
    if (!opened) {
      managementArrival = null;
      return false;
    }
    if (typeof stabiliseMenuViewportAfterRoute === 'function') {
      stabiliseMenuViewportAfterRoute(action.route, { preserveMenuScroll: true });
    }
    return true;
  }

  function renderManagementArrivalBanner() {
    if (!managementArrival || managementArrival.route !== menuTab) return '';
    const active = managementActionStillActive(managementArrival);
    const tone = active ? managementArrival.priority : 'resolved';
    const state = active ? 'ACTION OPENED' : 'ACTION RESOLVED';
    const detail = active ? managementArrival.detail : 'This item is no longer pending. Return to the previous page or continue managing the club.';
    return `<section class="management-arrival-banner ${escapeCareerHtml(tone)}" data-management-arrival="${escapeCareerHtml(managementArrival.id)}">
      <div><span>${escapeCareerHtml(state)} · ${escapeCareerHtml(managementArrival.category || 'CLUB')}</span><strong>${escapeCareerHtml(managementArrival.label)}</strong><small>${escapeCareerHtml(detail)}</small></div>
      <div><button type="button" data-management-arrival-dismiss="1">DISMISS</button>${managementArrival.fromRoute && managementArrival.fromRoute !== menuTab ? '<button type="button" class="primary" data-management-arrival-back="1">BACK TO PREVIOUS</button>' : ''}</div>
    </section>`;
  }

  function managementTargetSelector(targetId) {
    if (!targetId) return '';
    return `[data-management-target-id="${String(targetId).replace(/"/g, '\\"')}"]`;
  }

  function applyManagementArrivalAfterRender() {
    if (!managementArrival || managementArrival.route !== menuTab) return;
    const action = managementActionById(managementArrival.id) || managementArrival;
    requestAnimationFrame(() => {
      const mailAlreadyInline = action.mailId
        && typeof clubMailUsesInlineReader === 'function'
        && clubMailUsesInlineReader()
        && careerState.selectedMailId === action.mailId;
      if (action.mailId && !mailAlreadyInline && menuTab === 'mail' && typeof selectClubMailAndOpen === 'function' && (teamNoteOverlayEl?.hidden ?? true)) {
        const trigger = menuContentEl?.querySelector(`[data-club-mail="${String(action.mailId).replace(/"/g, '\\"')}"]`) || null;
        selectClubMailAndOpen(action.mailId, trigger);
        return;
      }
      if (action.targetId) {
        const target = menuContentEl?.querySelector(managementTargetSelector(action.targetId));
        if (target) {
          target.classList.add('management-arrival-target');
          if (typeof scrollCommandContentTargetIntoView === 'function') {
            scrollCommandContentTargetIntoView(target, { block: 'center', behavior: 'auto' });
          }
        }
      }
      if (menuTab === 'training' && typeof scrollTrainingRecommendationIntoView === 'function') scrollTrainingRecommendationIntoView();
    });
  }

  function handleWorkflowIntegrityClick(event) {
    const managementAction = event.target.closest?.('[data-management-action-id]');
    if (managementAction) {
      openManagementAction(managementAction.dataset.managementActionId);
      return true;
    }
    const save = event.target.closest?.('[data-workflow-save]');
    if (save) {
      const route = save.dataset.workflowSave || menuTab;
      const changed = workflowSaveForRoute(route);
      showStatus(changed ? 'MANAGEMENT CHANGES SAVED' : 'NO CHANGES TO SAVE');
      return true;
    }
    const discard = event.target.closest?.('[data-workflow-discard]');
    if (discard) {
      const route = discard.dataset.workflowDiscard || menuTab;
      const changed = workflowDiscardForRoute(route);
      showStatus(changed ? 'UNSAVED CHANGES REMOVED' : 'NO UNSAVED CHANGES');
      return true;
    }
    const arrivalDismiss = event.target.closest?.('[data-management-arrival-dismiss]');
    if (arrivalDismiss) {
      managementArrival = null;
      updateMenuUI();
      return true;
    }
    const arrivalBack = event.target.closest?.('[data-management-arrival-back]');
    if (arrivalBack) {
      const target = managementArrival?.fromRoute || 'play';
      managementArrival = null;
      setMenuRoute(target);
      return true;
    }
    return false;
  }

  function workflowIntegritySnapshot() {
    return {
      route: menuTab,
      tacticsDirty: workflowTacticsDirty(),
      persistentTactics: workflowPersistentTacticsSnapshot(),
      tacticsDraft: workflowTacticsDraft ? workflowClone(workflowTacticsDraft) : null,
      lineupDirty: workflowLineupDirty(),
      persistentLineupIds: workflowPersistentSquadIds(),
      lineupDraft: workflowLineupDraft ? workflowClone(workflowLineupDraft) : null,
      trainingDirty: workflowTrainingDirty(),
      trainingDrafts: [...workflowTrainingDrafts.entries()].map(([playerId, draft]) => ({ playerId, ...draft })),
      loadoutDirty: workflowLoadoutDirty(),
      loadoutDraft: workflowLoadoutDraft ? { ...workflowLoadoutDraft } : null,
      currentRouteDirty: workflowRouteDirty(menuTab),
      arrival: managementArrival ? { ...managementArrival } : null,
      pendingAction: workflowPendingAction ? { ...workflowPendingAction } : null
    };
  }
