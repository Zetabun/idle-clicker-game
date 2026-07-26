/*
 * Strikewatch source module: 00-core.js
 * Purpose: Core DOM references, build metadata, map data, shared state, utilities and line-of-sight helpers.
 *
 * This file is a source fragment. Run `python3 build.py` to regenerate
 * js/strikewatch.dev.js and the standalone release in dist/.
 */

  const canvas = document.getElementById('game');
  const matchViewEl = document.getElementById('matchView');
  const matchStageEl = document.getElementById('matchStage');
  const matchCommentaryDockEl = document.getElementById('matchCommentaryDock');
  const matchCommentaryContentEl = document.getElementById('matchCommentaryContent');
  const matchCommentaryRoundEl = document.getElementById('matchCommentaryRound');
  const matchCommentaryIdleEl = document.getElementById('matchCommentaryIdle');
  const maximizeViewBtn = document.getElementById('maximizeViewBtn');
  const restoreViewBtn = document.getElementById('restoreViewBtn');
  const landscapeRotationGateEl = document.getElementById('landscapeRotationGate');
  const landscapeReturnPortraitBtn = document.getElementById('landscapeReturnPortraitBtn');
  const feedEl = document.getElementById('feed');
  const multiKillBannerEl = document.getElementById('multiKillBanner');
  const multiKillKickerEl = document.getElementById('multiKillKicker');
  const multiKillTitleEl = document.getElementById('multiKillTitle');
  const multiKillDetailEl = document.getElementById('multiKillDetail');
  const spectatorNameEl = document.getElementById('spectatorName');
  const spectatorIntentEl = document.getElementById('spectatorIntent');
  const matchObjectiveEl = document.getElementById('matchObjective');
  const matchObjectiveTextEl = document.getElementById('matchObjectiveText');
  const matchPlanTextEl = document.getElementById('matchPlanText');
  const teamTextEl = document.getElementById('teamText');
  const kdTextEl = document.getElementById('kdText');
  const weaponTextEl = document.getElementById('weaponText');
  const mapModeEl = document.querySelector('.mapTag .mode');
  const mapNameEl = document.querySelector('.mapTag .name');
  const mapDescEl = document.querySelector('.mapTag .desc');
  const healthBarEl = document.getElementById('healthBar');
  const healthTextEl = document.getElementById('healthText');
  const armourHudEl = document.getElementById('armourHud');
  const armourBarEl = document.getElementById('armourBar');
  const armourTextEl = document.getElementById('armourText');
  const blueScoreEl = document.getElementById('blueScore');
  const redScoreEl = document.getElementById('redScore');
  const timerEl = document.getElementById('timer');
  const roundPanelEl = document.getElementById('roundPanel');
  const scoreboardOverlayEl = document.getElementById('scoreboardOverlay');
  const matchStageViewportEl = (() => {
    if (!matchStageEl) return null;
    const existing = matchStageEl.querySelector(':scope > .match-stage-viewport');
    if (existing) return existing;
    const topbar = matchStageEl.querySelector(':scope > .topbar');
    const objective = matchObjectiveEl && matchObjectiveEl.parentElement === matchStageEl
      ? matchObjectiveEl
      : matchStageEl.querySelector(':scope > .match-objective');
    if (!topbar || !objective) return null;
    const viewport = document.createElement('div');
    viewport.className = 'match-stage-viewport';
    viewport.setAttribute('data-match-stage-viewport', '1');
    objective.insertAdjacentElement('afterend', viewport);
    for (const child of [...matchStageEl.children]) {
      if (child === topbar || child === objective || child === viewport || child === scoreboardOverlayEl) continue;
      viewport.appendChild(child);
    }
    return viewport;
  })();
  const scoreboardCloseBtn = document.getElementById('scoreboardCloseBtn');
  const scoreboardTitleEl = document.getElementById('scoreboardTitle');
  const scoreboardCompetitionEl = document.getElementById('scoreboardCompetition');
  const scoreboardSummaryEl = document.getElementById('scoreboardSummary');
  const scoreboardBlueNameEl = document.getElementById('scoreboardBlueName');
  const scoreboardRedNameEl = document.getElementById('scoreboardRedName');
  const scoreboardBlueSummaryEl = document.getElementById('scoreboardBlueSummary');
  const scoreboardRedSummaryEl = document.getElementById('scoreboardRedSummary');
  const scoreboardBlueRowsEl = document.getElementById('scoreboardBlueRows');
  const scoreboardRedRowsEl = document.getElementById('scoreboardRedRows');
  const roundLabelEl = document.getElementById('roundLabel');
  const roundTargetEl = document.getElementById('roundTarget');
  const blueAliveEl = document.getElementById('blueAlive');
  const redAliveEl = document.getElementById('redAlive');
  const roundResultEl = document.getElementById('roundResult');
  const roundResultKickerEl = document.getElementById('roundResultKicker');
  const roundResultTitleEl = document.getElementById('roundResultTitle');
  const roundResultDetailEl = document.getElementById('roundResultDetail');
  const careerMatchMomentEl = document.getElementById('careerMatchMoment');
  const careerMatchMomentKickerEl = document.getElementById('careerMatchMomentKicker');
  const careerMatchMomentTitleEl = document.getElementById('careerMatchMomentTitle');
  const careerMatchMomentDetailEl = document.getElementById('careerMatchMomentDetail');
  const commandPulseBtn = document.getElementById('commandPulseBtn');
  const commandPulsePanelEl = document.getElementById('commandPulsePanel');
  const commandPulsePanelTitleEl = document.getElementById('commandPulsePanelTitle');
  const commandPulseStatusEl = document.getElementById('commandPulseStatus');
  const commandPulseOptionsEl = document.getElementById('commandPulseOptions');
  const commandPulseCloseBtn = document.getElementById('commandPulseCloseBtn');
  const careerMatchIntroEl = document.getElementById('careerMatchIntro');
  const careerMatchIntroKickerEl = document.getElementById('careerMatchIntroKicker');
  const careerMatchIntroTitleEl = document.getElementById('careerMatchIntroTitle');
  const careerMatchIntroMapEl = document.getElementById('careerMatchIntroMap');
  const careerMatchIntroBlueNameEl = document.getElementById('careerMatchIntroBlueName');
  const careerMatchIntroRedNameEl = document.getElementById('careerMatchIntroRedName');
  const careerMatchIntroBlueRosterEl = document.getElementById('careerMatchIntroBlueRoster');
  const careerMatchIntroRedRosterEl = document.getElementById('careerMatchIntroRedRoster');
  const careerMatchIntroPlanEl = document.getElementById('careerMatchIntroPlan');
  const careerMatchIntroStartBtn = document.getElementById('careerMatchIntroStartBtn');
  const betweenRoundTacticsEl = document.getElementById('betweenRoundTactics');
  const betweenRoundKickerEl = document.getElementById('betweenRoundKicker');
  const betweenRoundScoreEl = document.getElementById('betweenRoundScore');
  const betweenRoundChangeCountEl = document.getElementById('betweenRoundChangeCount');
  const betweenRoundInsightTitleEl = document.getElementById('betweenRoundInsightTitle');
  const betweenRoundInsightBodyEl = document.getElementById('betweenRoundInsightBody');
  const betweenRoundDiagnosisGridEl = document.getElementById('betweenRoundDiagnosisGrid');
  const betweenRoundOpponentReadEl = document.getElementById('betweenRoundOpponentRead');
  const betweenRoundRouteOptionsEl = document.getElementById('betweenRoundRouteOptions');
  const betweenRoundLimitEl = document.getElementById('betweenRoundLimit');
  const betweenRoundKeepBtn = document.getElementById('betweenRoundKeepBtn');
  const betweenRoundApplyBtn = document.getElementById('betweenRoundApplyBtn');
  const newPlayerDemoCoachEl = document.getElementById('newPlayerDemoCoach');
  const newPlayerDemoKickerEl = document.getElementById('newPlayerDemoKicker');
  const newPlayerDemoTitleEl = document.getElementById('newPlayerDemoTitle');
  const newPlayerDemoBodyEl = document.getElementById('newPlayerDemoBody');
  const newPlayerDemoFocusEl = document.getElementById('newPlayerDemoFocus');
  const newPlayerDemoSkipBtn = document.getElementById('newPlayerDemoSkipBtn');
  const newPlayerDemoNextBtn = document.getElementById('newPlayerDemoNextBtn');
  const sponsorRoundTransitionEl = document.getElementById('sponsorRoundTransition');
  const sponsorRoundLogoEl = document.getElementById('sponsorRoundLogo');
  const sponsorRoundClubEl = document.getElementById('sponsorRoundClub');
  const sponsorRoundTitleEl = document.getElementById('sponsorRoundTitle');
  const statusEl = document.getElementById('status');
  const damageNumbersEl = document.getElementById('damageNumbers');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const autoBtn = document.getElementById('autoBtn');
  const matchSpeedBtn = document.getElementById('matchSpeedBtn');
  const audioBtn = document.getElementById('audioBtn');
  const portraitAudioBtn = document.getElementById('portraitAudioBtn');
  const diagnosticExportBtn = document.getElementById('diagnosticExportBtn');
  const diagnosticOverlayEl = document.getElementById('diagnosticOverlay');
  const minimapToggleBtn = document.getElementById('minimapToggleBtn');
  const tacticalMinimapPanelEl = document.getElementById('tacticalMinimapPanel');
  const tacticalMinimapCanvas = document.getElementById('tacticalMinimapCanvas');
  const tacticalMinimapTitleEl = document.getElementById('tacticalMinimapTitle');
  const tacticalMinimapCloseBtn = document.getElementById('tacticalMinimapCloseBtn');
  const freeRoamOverlayEl = document.getElementById('freeRoamOverlay');
  const freeRoamMapNameEl = document.getElementById('freeRoamMapName');
  const freeRoamPositionEl = document.getElementById('freeRoamPosition');
  const freeRoamFloorEl = document.getElementById('freeRoamFloor');
  const freeRoamLookPadEl = document.getElementById('freeRoamLookPad');
  const freeRoamExitBtn = document.getElementById('freeRoamExitBtn');
  const freeRoamMapBtn = document.getElementById('freeRoamMapBtn');
  const freeRoamExportBtn = document.getElementById('freeRoamExportBtn');
  const menuBtn = document.getElementById('menuBtn');
  const uiToggleBtn = document.getElementById('uiToggleBtn');
  const showUiBtn = document.getElementById('showUiBtn');
  const menuShellEl = document.getElementById('menuShell');
  const menuContentEl = document.getElementById('menuContent');
  const menuCommandKickerEl = document.getElementById('menuCommandKicker');
  const menuCommandTitleEl = document.getElementById('menuCommandTitle');
  const menuCommandSubtitleEl = document.getElementById('menuCommandSubtitle');
  const menuClubBrandEl = document.getElementById('menuClubBrand');
  const menuClubBrandLogoEl = document.getElementById('menuClubBrandLogo');
  const menuClubBrandNameEl = document.getElementById('menuClubBrandName');
  const menuClubBrandMetaEl = document.getElementById('menuClubBrandMeta');
  const menuModeBadgeEl = document.getElementById('menuModeBadge');
  const menuHeaderTitleEl = document.getElementById('menuHeaderTitle');
  const menuRouteLocatorEl = document.getElementById('menuRouteLocator');
  const menuSubnavEl = document.getElementById('menuSubnav');
  const menuSubnavShellEl = document.getElementById('menuSubnavShell');
  const menuSubnavLeftBtn = document.getElementById('menuSubnavLeft');
  const menuSubnavRightBtn = document.getElementById('menuSubnavRight');
  const mobileCommandRouteBarEl = document.getElementById('mobileCommandRouteBar');
  const mobileNavigationOpenBtn = document.getElementById('mobileNavigationOpenBtn');
  const mobileCommandSectionLabelEl = document.getElementById('mobileCommandSectionLabel');
  const mobileCommandRouteLabelEl = document.getElementById('mobileCommandRouteLabel');
  const mobileCommandRouteHintEl = document.getElementById('mobileCommandRouteHint');
  const mobileCommandRoutePositionEl = document.getElementById('mobileCommandRoutePosition');
  const mobileCommandBuildVersionEl = document.getElementById('mobileCommandBuildVersion');
  const mobileNavigationOverlayEl = document.getElementById('mobileNavigationOverlay');
  const mobileNavigationCloseBtn = document.getElementById('mobileNavigationCloseBtn');
  const mobileNavigationTitleEl = document.getElementById('mobileNavigationTitle');
  const mobileNavigationContextEl = document.getElementById('mobileNavigationContext');
  const mobileNavigationSearchEl = document.getElementById('mobileNavigationSearch');
  const mobileNavigationSearchClearBtn = document.getElementById('mobileNavigationSearchClear');
  const mobileNavigationSectionsEl = document.getElementById('mobileNavigationSections');
  const mobileNavigationJourneyEl = document.getElementById('mobileNavigationJourney');
  const mobileNavigationListKickerEl = document.getElementById('mobileNavigationListKicker');
  const mobileNavigationListTitleEl = document.getElementById('mobileNavigationListTitle');
  const mobileNavigationRoutesEl = document.getElementById('mobileNavigationRoutes');
  const menuBackBtn = document.getElementById('menuBackBtn');
  const menuForwardBtn = document.getElementById('menuForwardBtn');
  const startMatchBtn = document.getElementById('startMatchBtn');
  const managerHelpToggleBtn = document.getElementById('managerHelpToggleBtn');
  const managerTopbarActionsEl = document.querySelector('.manager-topbar-actions');
  const legacyFreshGameBtn = document.getElementById('freshGameBtn');
  if (legacyFreshGameBtn) legacyFreshGameBtn.remove();
  if (startMatchBtn && !startMatchBtn.closest('.manager-topbar-actions') && managerTopbarActionsEl) {
    startMatchBtn.className = 'manager-topbar-action manager-match-btn';
    startMatchBtn.hidden = true;
    managerTopbarActionsEl.append(startMatchBtn);
  }
  const resumeBtn = document.getElementById('resumeBtn');
  const returnToMatchBtn = document.getElementById('returnToMatchBtn');
  const menuMatchPauseBtn = document.getElementById('menuMatchPauseBtn');
  const menuMatchSpeedBtn = document.getElementById('menuMatchSpeedBtn');
  const menuEndDayBtn = document.getElementById('menuEndDayBtn');
  const exitToMenuBtn = document.getElementById('exitToMenuBtn');
  const menuTabs = Array.from(document.querySelectorAll('.menu-tab'));
  const managerBreadcrumbEl = document.getElementById('managerBreadcrumb');
  const managerBuildVersionEl = document.getElementById('managerBuildVersion');
  const managerStatusTextEl = document.getElementById('managerStatusText');
  const managerMailBtn = document.getElementById('managerMailBtn');
  const managerMailBadgeEl = document.getElementById('managerMailBadge');
  const managerEndDayBlockBadgeEl = document.getElementById('managerEndDayBlockBadge');
  const managerCalendarBtn = document.getElementById('managerCalendarBtn');
  const managerCalendarBadgeEl = document.getElementById('managerCalendarBadge');
  const managerGoldBtn = document.getElementById('managerGoldBtn');
  const managerOperatorNameEl = document.getElementById('managerOperatorName');
  const managerOperatorLevelEl = document.getElementById('managerOperatorLevel');
  const managerDatePanelEl = document.getElementById('managerDatePanel');
  const managerDateDayEl = document.getElementById('managerDateDay');
  const managerDateMetaEl = document.getElementById('managerDateMeta');
  const matchmakingOverlayEl = document.getElementById('matchmakingOverlay');
  const newPlayerIntroOverlayEl = document.getElementById('newPlayerIntroOverlay');
  const newPlayerIntroSkipBtn = document.getElementById('newPlayerIntroSkipBtn');
  const newPlayerIntroStartBtn = document.getElementById('newPlayerIntroStartBtn');
  const deploymentSelectionEl = document.getElementById('deploymentSelection');
  const deploymentMapGridEl = document.getElementById('deploymentMapGrid');
  const deploymentRosterEl = document.getElementById('deploymentRoster');
  const deploymentTacticsEl = document.getElementById('deploymentTactics');
  const deploymentCancelBtn = document.getElementById('deploymentCancelBtn');
  const deploymentConfirmBtn = document.getElementById('deploymentConfirmBtn');
  const matchmakingSessionEl = document.getElementById('matchmakingSession');
  const matchmakingTitleEl = document.getElementById('matchmakingTitle');
  const matchmakingSubtitleEl = document.getElementById('matchmakingSubtitle');
  const matchmakingQueueTimeEl = document.getElementById('matchmakingQueueTime');
  const matchmakingRegionEl = document.getElementById('matchmakingRegion');
  const matchmakingPhaseLabelEl = document.getElementById('matchmakingPhaseLabel');
  const matchmakingPhaseDetailEl = document.getElementById('matchmakingPhaseDetail');
  const matchmakingEstimateEl = document.getElementById('matchmakingEstimate');
  const matchmakingLobbyCodeEl = document.getElementById('matchmakingLobbyCode');
  const matchmakingMapNameEl = document.getElementById('matchmakingMapName');
  const matchmakingBlueRosterEl = document.getElementById('matchmakingBlueRoster');
  const matchmakingRedRosterEl = document.getElementById('matchmakingRedRoster');
  const matchmakingBlueNameEl = document.getElementById('matchmakingBlueName');
  const matchmakingRedNameEl = document.getElementById('matchmakingRedName');
  const matchmakingBlueReadyEl = document.getElementById('matchmakingBlueReady');
  const matchmakingRedReadyEl = document.getElementById('matchmakingRedReady');
  const matchmakingStagesEl = document.getElementById('matchmakingStages');
  const matchmakingProgressBarEl = document.getElementById('matchmakingProgressBar');
  const matchmakingCountdownEl = document.getElementById('matchmakingCountdown');
  const matchmakingCancelBtn = document.getElementById('matchmakingCancelBtn');
  const careerCrateCanvas = document.getElementById('careerCrateCanvas');
  const careerCrateCanvasHomeEl = document.getElementById('careerCrateCanvasHome');
  const careerCrateRendererFallbackEl = document.getElementById('careerCrateRendererFallback');
  const teamNoteOverlayEl = document.getElementById('teamNoteOverlay');
  const teamNoteCloseBtn = document.getElementById('teamNoteCloseBtn');
  const teamNoteQuoteEl = document.getElementById('teamNoteQuote');
  const teamNoteKickerEl = document.getElementById('teamNoteKicker');
  const teamNoteTitleEl = document.getElementById('teamNoteTitle');
  const teamNoteBodyEl = document.getElementById('teamNoteBody');
  const teamNoteFooterEl = document.getElementById('teamNoteFooter');
  const teamNoteActionsEl = document.getElementById('teamNoteActions');
  const teamNoteDismissHintEl = document.getElementById('teamNoteDismissHint');
  const topbarEl = document.querySelector('.topbar');
  const mapTagEl = document.querySelector('.mapTag');
  const spectatorEl = document.querySelector('.spectator');
  const controlsEl = document.querySelector('.controls');
  const portraitSpectatorNameEl = document.getElementById('portraitSpectatorName');
  const portraitTeamTextEl = document.getElementById('portraitTeamText');
  const portraitHealthTextEl = document.getElementById('portraitHealthText');
  const portraitWeaponTextEl = document.getElementById('portraitWeaponText');
  const portraitRoundTextEl = document.getElementById('portraitRoundText');
  const portraitPrevBtn = document.getElementById('portraitPrevBtn');
  const portraitAutoBtn = document.getElementById('portraitAutoBtn');
  const portraitSpeedBtn = document.getElementById('portraitSpeedBtn');
  const portraitNextBtn = document.getElementById('portraitNextBtn');
  const portraitMenuBtn = document.getElementById('portraitMenuBtn');
  const portraitCommandPulseBtn = document.getElementById('portraitCommandPulseBtn');
  const portraitOwnedTelemetryEl = document.getElementById('portraitOwnedTelemetry');
  const portraitOwnedNameEl = document.getElementById('portraitOwnedName');
  const portraitOwnedStatusEl = document.getElementById('portraitOwnedStatus');
  const portraitOwnedMetricsEl = document.getElementById('portraitOwnedMetrics');
  const portraitOwnedReasonEl = document.getElementById('portraitOwnedReason');
  const ownedTelemetryEl = document.getElementById('ownedTelemetry');
  const ownedTelemetryNameEl = document.getElementById('ownedTelemetryName');
  const ownedTelemetryStatusEl = document.getElementById('ownedTelemetryStatus');
  const ownedTelemetryHealthEl = document.getElementById('ownedTelemetryHealth');
  const ownedTelemetryHealthBarEl = document.getElementById('ownedTelemetryHealthBar');
  const ownedTelemetryAccuracyEl = document.getElementById('ownedTelemetryAccuracy');
  const ownedTelemetryAccuracyBarEl = document.getElementById('ownedTelemetryAccuracyBar');
  const ownedTelemetryDamageEl = document.getElementById('ownedTelemetryDamage');
  const ownedTelemetryKdEl = document.getElementById('ownedTelemetryKd');
  const ownedTelemetryWeaponEl = document.getElementById('ownedTelemetryWeapon');
  const ownedTelemetryBehaviourEl = document.getElementById('ownedTelemetryBehaviour');
  const ownedDecisionActionEl = document.getElementById('ownedDecisionAction');
  const ownedDecisionReasonEl = document.getElementById('ownedDecisionReason');
  const ownedDecisionTargetEl = document.getElementById('ownedDecisionTarget');
  const ownedDecisionRangeEl = document.getElementById('ownedDecisionRange');
  const ownedDecisionInstructionEl = document.getElementById('ownedDecisionInstruction');
  const ownedDecisionRouteEl = document.getElementById('ownedDecisionRoute');

  const BUILD_VERSION = '12.116';
  const BUILD_NAME = 'DESKTOP HEADER SPLIT';
  const BUILD_ID = '12.116.0-desktop-header-split';
  window.__STRIKEWATCH_BUILD__ = BUILD_ID;
  document.documentElement.dataset.build = BUILD_ID;
  document.documentElement.dataset.buildVersion = BUILD_VERSION;
  document.title = `Strikewatch ${BUILD_VERSION}: ${BUILD_NAME}`;
  const buildStampEl = document.getElementById('buildStamp');
  if (buildStampEl) buildStampEl.textContent = `BUILD ${BUILD_VERSION} · ${BUILD_NAME}`;
  if (managerBuildVersionEl) managerBuildVersionEl.textContent = BUILD_VERSION;
  if (mobileCommandBuildVersionEl) mobileCommandBuildVersionEl.textContent = BUILD_VERSION;

  const TAU = Math.PI * 2;
  const FOV = Math.PI / 2.55;
  const MAX_VIEW = 26;
  const TEAM_BLUE = 0;
  const TEAM_RED = 1;
  const TEAM_COLOURS = ['#52adff', '#ff6868'];
  // Broad three-lane tactical layout. Most routes are two to five cells wide,
  // with a central atrium, upper/lower flanks and several cross-map rotations.
  const ARENA_LIBRARY = Object.freeze({
    citadel: {
      id: 'citadel',
      name: 'CITADEL DEPOT',
      short: 'CDT',
      theme: 'industrial',
      matchmakingBlurb: 'A covered freight depot: racked stores, a gated centre lane, a suspended catwalk bay and a tall plant hall on the map centre.',
      tagDescription: 'Storage racking, gated cross-lanes, loading bays and a central plant hall, mirrored so both halves play identically.',
      preview: {
        badge: 'SYMMETRIC',
        tags: ['ALPHA STORES', 'CORE PLANT', 'DELTA LOADING'],
        bands: [
          { y1: 1, y2: 9, label: 'STORES & LOADING', colour: [0.40, 0.70, 0.92] },
          { y1: 9, y2: 15, label: 'CORE PLANT', colour: [1.00, 0.48, 0.20] },
          { y1: 15, y2: 23, label: 'DOCKS & STORES', colour: [0.82, 0.42, 0.96] }
        ],
        stairs: []
      },
      // The depot is authored as its northern half and mirrored by a
      // 180-degree rotation about the map centre, so every wall mass,
      // prop and route has an identical twin on the opposite side.
      layout: [
        '111111111111111111111111111111111111',
        '100000000000010000000010011001100001',
        '100110111011010011110010011001100001',
        '100110111011010011110010011001100001',
        '100000000000000000000000011001100001',
        '100000000000010000000010000000000001',
        '100110111011010110011010000111100001',
        '100110111011000110011000000111100001',
        '100000000000010000000010000000000001',
        '100000000111011110011110111000000001',
        '100001110100000000000000001000000001',
        '100001110000000000000000001000000001',
        '100000000100000000000000000011100001',
        '100000000100000000000000001011100001',
        '100000000111011110011110111000000001',
        '100000000000010000000010000000000001',
        '100001111000000110011000110111011001',
        '100001111000010110011010110111011001',
        '100000000000010000000010000000000001',
        '100001100110000000000000000000000001',
        '100001100110010011110010110111011001',
        '100001100110010011110010110111011001',
        '100001100110010000000010000000000001',
        '111111111111111111111111111111111111'
      ],
      hotspots: [
        { x: 4.5, y: 4.5 }, { x: 9.5, y: 8.5 }, { x: 12.5, y: 4.5 },
        { x: 17.5, y: 4.5 }, { x: 17.5, y: 8.5 }, { x: 23.5, y: 4.5 },
        { x: 28.5, y: 2.5 }, { x: 32.5, y: 5.5 }, { x: 3.5, y: 11.5 },
        { x: 31.5, y: 19.5 }, { x: 26.5, y: 15.5 }, { x: 23.5, y: 19.5 },
        { x: 18.5, y: 19.5 }, { x: 18.5, y: 15.5 }, { x: 12.5, y: 19.5 },
        { x: 7.5, y: 21.5 }, { x: 3.5, y: 18.5 }, { x: 32.5, y: 12.5 }
      ],
      engagementPlans: [
        { id: 'alpha-stores', name: 'ALPHA STORES CLASH', zone: 'ALPHA', priority: 1.05, blue: [{ x: 4.5, y: 4.5 }, { x: 5.5, y: 6.5 }, { x: 2.5, y: 3.5 }, { x: 6.5, y: 8.5 }, { x: 3.5, y: 8.5 }], red: [{ x: 12.5, y: 4.5 }, { x: 12.5, y: 6.5 }, { x: 12.5, y: 2.5 }, { x: 11.5, y: 8.5 }, { x: 9.5, y: 8.5 }] },
        { id: 'upper-mid', name: 'UPPER MID CONTACT', zone: 'MID', priority: 1.2, blue: [{ x: 14.5, y: 4.5 }, { x: 14.5, y: 8.5 }, { x: 16.5, y: 4.5 }, { x: 15.5, y: 1.5 }, { x: 16.5, y: 8.5 }], red: [{ x: 21.5, y: 4.5 }, { x: 21.5, y: 8.5 }, { x: 19.5, y: 4.5 }, { x: 21.5, y: 1.5 }, { x: 19.5, y: 8.5 }] },
        { id: 'core-plant', name: 'CORE PLANT CONTEST', zone: 'CORE', priority: 1.35, blue: [{ x: 12.5, y: 11.5 }, { x: 14.5, y: 12.5 }, { x: 11.5, y: 13.5 }, { x: 16.5, y: 10.5 }, { x: 16.5, y: 13.5 }], red: [{ x: 23.5, y: 12.5 }, { x: 21.5, y: 11.5 }, { x: 24.5, y: 10.5 }, { x: 19.5, y: 13.5 }, { x: 19.5, y: 10.5 }] },
        { id: 'delta-loading', name: 'DELTA LOADING CONTACT', zone: 'DELTA', priority: 1.1, blue: [{ x: 23.5, y: 5.5 }, { x: 23.5, y: 2.5 }, { x: 24.5, y: 7.5 }, { x: 27.5, y: 5.5 }, { x: 23.5, y: 5.5 }], red: [{ x: 32.5, y: 5.5 }, { x: 33.5, y: 2.5 }, { x: 31.5, y: 7.5 }, { x: 28.5, y: 8.5 }, { x: 33.5, y: 5.5 }] },
        { id: 'lower-service', name: 'LOWER SERVICE SWEEP', zone: 'SERVICE', priority: 1.1, blue: [{ x: 3.5, y: 18.5 }, { x: 4.5, y: 21.5 }, { x: 4.5, y: 16.5 }, { x: 7.5, y: 19.5 }, { x: 2.5, y: 16.5 }], red: [{ x: 12.5, y: 18.5 }, { x: 12.5, y: 21.5 }, { x: 11.5, y: 16.5 }, { x: 8.5, y: 18.5 }, { x: 12.5, y: 15.5 }] }
      ],
      spawnPoints: {
        0: [{ x: 2.5, y: 2.5 }, { x: 2.5, y: 6.5 }, { x: 2.5, y: 11.5 }, { x: 2.5, y: 17.5 }, { x: 2.5, y: 21.5 }],
        1: [{ x: 33.5, y: 21.5 }, { x: 33.5, y: 17.5 }, { x: 33.5, y: 12.5 }, { x: 33.5, y: 6.5 }, { x: 33.5, y: 2.5 }]
      },
      zones: [
        { x1: 1, z1: 1, x2: 14, z2: 9, name: 'ALPHA STORES', short: 'ALPHA', colour: [0.30, 0.38, 0.42], light: [0.40, 0.70, 0.92] },
        { x1: 14, z1: 1, x2: 23, z2: 9, name: 'MID CATWALK', short: 'MID', colour: [0.31, 0.34, 0.30], light: [0.62, 0.92, 0.42] },
        { x1: 23, z1: 1, x2: 35, z2: 9, name: 'DELTA LOADING', short: 'DELTA', colour: [0.25, 0.34, 0.40], light: [0.22, 0.82, 1.00] },
        { x1: 1, z1: 15, x2: 14, z2: 23, name: 'SERVICE DOCKS', short: 'SERVICE', colour: [0.33, 0.29, 0.34], light: [0.82, 0.42, 0.96] },
        { x1: 14, z1: 15, x2: 23, z2: 23, name: 'LOWER CATWALK', short: 'LOWER', colour: [0.31, 0.34, 0.30], light: [0.58, 0.86, 0.50] },
        { x1: 23, z1: 15, x2: 35, z2: 23, name: 'ECHO STORES', short: 'ECHO', colour: [0.30, 0.38, 0.42], light: [0.46, 0.66, 0.94] },
        { x1: 10, z1: 10, x2: 26, z2: 14, name: 'CORE PLANT', short: 'CORE', colour: [0.39, 0.30, 0.25], light: [1.00, 0.48, 0.20] },
        { x1: 0, z1: 0, x2: 36, z2: 24, name: 'CENTRAL TRANSIT', short: 'TRANSIT', colour: [0.31, 0.35, 0.37], light: [0.74, 0.82, 0.88] }
      ],
      props: {
        containers: [
          // Freight and barriers are placed clear of every wall face so no
          // crate corner buries itself in masonry, and each one leaves the
          // route it covers passable on at least one side.
          { x: 5.5, y: 4.5, yaw: 0, colour: [0.18, 0.28, 0.34] },
          { x: 9.5, y: 5.5, yaw: Math.PI / 2, colour: [0.20, 0.26, 0.31] },
          { x: 14.5, y: 1.5, yaw: 0, colour: [0.22, 0.30, 0.35] },
          { x: 17.5, y: 5.5, yaw: 0, kind: 'barrier', colour: [0.34, 0.30, 0.16], width: 1.42, depth: 0.52 },
          { x: 27.5, y: 2.5, yaw: 0, colour: [0.34, 0.22, 0.15] },
          { x: 32.5, y: 2.5, yaw: 0, colour: [0.30, 0.20, 0.14] },
          { x: 32.5, y: 6.5, yaw: Math.PI / 2, colour: [0.28, 0.19, 0.14] },
          { x: 24, y: 5.5, yaw: Math.PI / 2, kind: 'barrier', colour: [0.32, 0.28, 0.15], width: 1.34, depth: 0.5 },
          { x: 30.5, y: 19.5, yaw: Math.PI, colour: [0.18, 0.28, 0.34] },
          { x: 26.5, y: 18.5, yaw: -Math.PI / 2, colour: [0.20, 0.26, 0.31] },
          { x: 21.5, y: 22.5, yaw: Math.PI, colour: [0.22, 0.30, 0.35] },
          { x: 18.5, y: 18.5, yaw: Math.PI, kind: 'barrier', colour: [0.34, 0.30, 0.16], width: 1.42, depth: 0.52 },
          { x: 8.5, y: 21.5, yaw: Math.PI, colour: [0.34, 0.22, 0.15] },
          { x: 3.5, y: 21.5, yaw: Math.PI, colour: [0.30, 0.20, 0.14] },
          { x: 3.5, y: 17.5, yaw: -Math.PI / 2, colour: [0.28, 0.19, 0.14] },
          { x: 12, y: 18.5, yaw: -Math.PI / 2, kind: 'barrier', colour: [0.32, 0.28, 0.15], width: 1.34, depth: 0.5 }
        ],
        machines: [
          // The plant core is a single two-by-two island on the map centre;
          // its collider matches the rendered shell exactly.
          { x: 9.5, y: 2.5, yaw: Math.PI / 2, kind: 'terminal', colour: [0.13, 0.20, 0.24] },
          { x: 8.5, y: 10.5, yaw: Math.PI / 2, kind: 'relay', colour: [0.14, 0.22, 0.18] },
          { x: 11.5, y: 11.5, yaw: 0, kind: 'generator', colour: [0.14, 0.22, 0.18] },
          { x: 28.5, y: 5.5, yaw: Math.PI, kind: 'console', colour: [0.12, 0.20, 0.24] },
          { x: 26.5, y: 21.5, yaw: -Math.PI / 2, kind: 'terminal', colour: [0.13, 0.20, 0.24] },
          { x: 27.5, y: 13.5, yaw: -Math.PI / 2, kind: 'relay', colour: [0.14, 0.22, 0.18] },
          { x: 24.5, y: 12.5, yaw: Math.PI, kind: 'generator', colour: [0.14, 0.22, 0.18] },
          { x: 7.5, y: 18.5, yaw: 0, kind: 'console', colour: [0.12, 0.20, 0.24] },
          { x: 18, y: 12, kind: 'reactor', colour: [0.16, 0.30, 0.19], width: 2, depth: 2 }
        ],
        tanks: [
          { x: 23.5, y: 7.5, colour: [0.34, 0.19, 0.10] },
          { x: 32.5, y: 7.5, colour: [0.26, 0.14, 0.30] },
          { x: 4.5, y: 8.5, colour: [0.20, 0.26, 0.34] },
          { x: 12.5, y: 16.5, colour: [0.34, 0.19, 0.10] },
          { x: 3.5, y: 16.5, colour: [0.26, 0.14, 0.30] },
          { x: 31.5, y: 15.5, colour: [0.20, 0.26, 0.34] }
        ],
        doors: [
          // Every gate sits in a genuine single-cell opening with solid wall
          // on both sides, so the frame reads as part of the partition.
          { id: 'citadel-alpha-gate', x: 13.5, y: 4.5, yaw: Math.PI / 2, colour: [0.44, 0.72, 0.42] },
          { id: 'citadel-mid-gate', x: 22.5, y: 4.5, yaw: Math.PI / 2, colour: [0.28, 0.68, 0.90] },
          { id: 'citadel-core-north-gate', x: 12.5, y: 9.5, yaw: 0, colour: [0.92, 0.54, 0.24] },
          { id: 'citadel-service-gate', x: 22.5, y: 19.5, yaw: -Math.PI / 2, colour: [0.66, 0.48, 0.86] },
          { id: 'citadel-delta-gate', x: 13.5, y: 19.5, yaw: -Math.PI / 2, colour: [0.30, 0.72, 0.88] },
          { id: 'citadel-core-south-gate', x: 23.5, y: 14.5, yaw: Math.PI, colour: [0.92, 0.54, 0.24] }
        ],
        stairs: [
          // Access steps run to a landing that meets a wall face carrying an
          // access hatch. `depth` covers the flight and the landing together,
          // and the origin is the centre of that combined footprint.
          { x: 14.5, y: 10.65, yaw: Math.PI, width: 0.86, depth: 1.3, landing: true },
          { x: 21.5, y: 13.35, yaw: 0, width: 0.86, depth: 1.3, landing: true }
        ]
      },
      decor: {
        courtyards: [],
        rugs: [],
        wallScreens: [],
        glassBands: [],
        ceilingBaffles: [],
        canopies: [],
        arches: [],
        banners: [],
        mosaics: [],
        rubble: [],
        torches: [],
        // Suspended catwalks span a bay wall-to-wall, so both ends land on a
        // partition face instead of stopping in mid-air over a wall column.
        walkways: [
          { x: 18, z: 8.5, width: 8, depth: 0.9, y: 2.2, colour: [0.12, 0.16, 0.18] },
          { x: 18, z: 15.5, width: 8, depth: 0.9, y: 2.2, colour: [0.12, 0.16, 0.18] }
        ],
        lowCeilings: [
          { x: 7, z: 4.5, width: 12.4, depth: 8.2, height: 2.34, colour: [0.07, 0.10, 0.12] },
          { x: 28.5, z: 4.5, width: 12.4, depth: 8.2, height: 2.46, colour: [0.07, 0.11, 0.14] },
          { x: 29, z: 19.5, width: 12.4, depth: 8.2, height: 2.34, colour: [0.07, 0.10, 0.12] },
          { x: 7.5, z: 19.5, width: 12.4, depth: 8.2, height: 2.46, colour: [0.07, 0.11, 0.14] }
        ],
        hazardZones: [
          { x: 27.5, z: 2.5, width: 1.7, depth: 3.6, yaw: 0, kind: 'bay' },
          { x: 32.5, z: 2.5, width: 3.6, depth: 3.6, yaw: 0, kind: 'bay' },
          { x: 13.5, z: 4.5, width: 1.1, depth: 1.5, yaw: Math.PI / 2, kind: 'chevron' },
          { x: 22.5, z: 4.5, width: 1.1, depth: 1.5, yaw: Math.PI / 2, kind: 'chevron' },
          { x: 12.5, z: 9.5, width: 1.1, depth: 1.5, yaw: 0, kind: 'chevron' },
          { x: 14.5, z: 10.9, width: 1.2, depth: 1, yaw: 0, kind: 'chevron' },
          { x: 8.5, z: 21.5, width: 1.7, depth: 3.6, yaw: Math.PI, kind: 'bay' },
          { x: 3.5, z: 21.5, width: 3.6, depth: 3.6, yaw: Math.PI, kind: 'bay' },
          { x: 22.5, z: 19.5, width: 1.1, depth: 1.5, yaw: -Math.PI / 2, kind: 'chevron' },
          { x: 13.5, z: 19.5, width: 1.1, depth: 1.5, yaw: -Math.PI / 2, kind: 'chevron' },
          { x: 23.5, z: 14.5, width: 1.1, depth: 1.5, yaw: Math.PI, kind: 'chevron' },
          { x: 21.5, z: 13.1, width: 1.2, depth: 1, yaw: Math.PI, kind: 'chevron' },
          { x: 18, z: 12, width: 3.7, depth: 3.7, yaw: 0, kind: 'ring' }
        ],
        pipeRuns: [
          { x1: 1.4, z1: 8.5, x2: 12.6, z2: 8.5, y: 2.1, radius: 0.055, colour: [0.29, 0.36, 0.40] },
          { x1: 34.6, z1: 15.5, x2: 23.4, z2: 15.5, y: 2.1, radius: 0.055, colour: [0.29, 0.36, 0.40] },
          { x1: 23.4, z1: 8.5, x2: 34.6, z2: 8.5, y: 2.1, radius: 0.048, colour: [0.49, 0.27, 0.10] },
          { x1: 12.6, z1: 15.5, x2: 1.4, z2: 15.5, y: 2.1, radius: 0.048, colour: [0.49, 0.27, 0.10] },
          { x1: 10.4, z1: 10.5, x2: 25.6, z2: 10.5, y: 2.46, radius: 0.062, colour: [0.30, 0.38, 0.42] },
          { x1: 25.6, z1: 13.5, x2: 10.4, z2: 13.5, y: 2.46, radius: 0.062, colour: [0.30, 0.38, 0.42] },
          { x1: 27.4, z1: 1.5, x2: 27.4, z2: 4.4, y: 2.16, radius: 0.044, colour: [0.42, 0.30, 0.14] },
          { x1: 8.6, z1: 22.5, x2: 8.6, z2: 19.6, y: 2.16, radius: 0.044, colour: [0.42, 0.30, 0.14] }
        ]
      }
    },
    dune: {
      id: 'dune',
      name: 'DUNE BASTION',
      short: 'DUN',
      theme: 'desert',
      ceilingHeight: 3.08,
      matchmakingBlurb: 'A symmetrical one-level desert stronghold with long rampart sightlines, shaded arcades, a contested central gate and close-range bazaar routes.',
      tagDescription: 'Single-level sandstone lanes balance long precision angles, medium courtyard fights and protected close-range flanks for current and future weapons.',
      preview: {
        badge: '1 FLOOR',
        tags: ['NORTH LONG LANE', 'CENTRAL GATE', 'SOUTH BAZAAR'],
        bands: [
          { y1: 2, y2: 8, label: 'NORTH RAMPART', colour: [0.90, 0.68, 0.38] },
          { y1: 8, y2: 16, label: 'CENTRAL GATE', colour: [0.76, 0.46, 0.26] },
          { y1: 16, y2: 22, label: 'SOUTH BAZAAR', colour: [0.54, 0.30, 0.20] }
        ],
        stairs: []
      },
      layout: [
        '111111111111111111111111111111111111',
        '111111111111111111111111111111111111',
        '111110000011000000000000110000011111',
        '100000000011000000000000110000000001',
        '100000000011000000000000110000000001',
        '100000000000001100001100000000000001',
        '100000000000001100001100000000000001',
        '100000110011000000000000110011000001',
        '100000110000000000000000000011000001',
        '100000000000000000000000000000000001',
        '100000001110000011110000011100000001',
        '100000001110000011110000011100000001',
        '100000001110000000000000011100000001',
        '100000001110000011110000011100000001',
        '100000000000000011110000000000000001',
        '100000110000000000000000000011000001',
        '100000110011000000000000110011000001',
        '100000000011100000000001110000000001',
        '100000000011100000000001110000000001',
        '100000000011100000000001110000000001',
        '100000000000000110011000000000000001',
        '111110000000000110011000000000011111',
        '111111111111111111111111111111111111',
        '111111111111111111111111111111111111'
      ],
      hotspots: [
        { x: 7.5, y: 3.5 }, { x: 13.5, y: 3.5 }, { x: 18.0, y: 4.5 }, { x: 22.5, y: 3.5 }, { x: 28.5, y: 3.5 },
        { x: 8.5, y: 8.5 }, { x: 13.5, y: 9.5 }, { x: 18.0, y: 12.5 }, { x: 22.5, y: 14.5 }, { x: 27.5, y: 8.5 },
        { x: 8.5, y: 20.5 }, { x: 14.0, y: 19.0 }, { x: 22.0, y: 19.0 }, { x: 27.5, y: 20.5 }
      ],
      engagementPlans: [
        { id: 'north-rampart', name: 'NORTH RAMPART DUEL', zone: 'NORTH', priority: 1.20, blue: [{ x: 7.5, y: 3.5 }, { x: 8.5, y: 5.5 }, { x: 13.5, y: 3.5 }, { x: 15.5, y: 4.5 }, { x: 13.5, y: 6.5 }], red: [{ x: 28.5, y: 3.5 }, { x: 27.5, y: 5.5 }, { x: 22.5, y: 3.5 }, { x: 20.5, y: 4.5 }, { x: 22.5, y: 6.5 }] },
        { id: 'central-gate', name: 'CENTRAL GATE CLASH', zone: 'GATE', priority: 1.35, blue: [{ x: 12.5, y: 9.5 }, { x: 14.5, y: 8.5 }, { x: 15.5, y: 12.5 }, { x: 13.5, y: 14.5 }, { x: 17.5, y: 12.5 }], red: [{ x: 23.5, y: 9.5 }, { x: 21.5, y: 8.5 }, { x: 20.5, y: 12.5 }, { x: 22.5, y: 14.5 }, { x: 18.5, y: 12.5 }] },
        { id: 'south-bazaar', name: 'SOUTH BAZAAR SWEEP', zone: 'BAZAAR', priority: 1.18, blue: [{ x: 8.5, y: 20.5 }, { x: 9.5, y: 17.0 }, { x: 13.5, y: 20.5 }, { x: 15.0, y: 18.5 }, { x: 15.5, y: 17.5 }], red: [{ x: 27.5, y: 20.5 }, { x: 26.5, y: 17.0 }, { x: 22.5, y: 20.5 }, { x: 21.0, y: 18.5 }, { x: 20.5, y: 17.5 }] },
        { id: 'west-courtyard', name: 'WEST COURTYARD CONTACT', zone: 'WEST', priority: 0.98, blue: [{ x: 5.5, y: 9.5 }, { x: 6.0, y: 12.5 }, { x: 7.5, y: 14.5 }, { x: 9.5, y: 8.5 }, { x: 11.5, y: 9.5 }], red: [{ x: 12.5, y: 9.5 }, { x: 13.5, y: 12.5 }, { x: 12.5, y: 14.5 }, { x: 14.5, y: 8.5 }, { x: 15.5, y: 12.5 }] },
        { id: 'east-courtyard', name: 'EAST COURTYARD CONTACT', zone: 'EAST', priority: 0.98, blue: [{ x: 20.5, y: 12.5 }, { x: 21.5, y: 8.5 }, { x: 23.5, y: 14.5 }, { x: 22.5, y: 12.5 }, { x: 23.5, y: 9.5 }], red: [{ x: 30.5, y: 14.5 }, { x: 30.0, y: 12.5 }, { x: 28.5, y: 9.5 }, { x: 26.5, y: 8.5 }, { x: 24.5, y: 12.5 }] },
        { id: 'arcade-flank', name: 'SHADED ARCADE FLANK', zone: 'GATE', priority: 1.10, blue: [{ x: 10.5, y: 8.5 }, { x: 12.0, y: 15.5 }, { x: 14.5, y: 12.5 }, { x: 15.5, y: 15.5 }, { x: 17.0, y: 9.5 }], red: [{ x: 25.5, y: 8.5 }, { x: 24.0, y: 15.5 }, { x: 21.5, y: 12.5 }, { x: 20.5, y: 15.5 }, { x: 19.0, y: 9.5 }] }
      ],
      spawnPoints: {
        0: [{ x: 2.5, y: 4.5 }, { x: 2.5, y: 7.5 }, { x: 2.5, y: 11.5 }, { x: 2.5, y: 15.5 }, { x: 2.5, y: 19.5 }],
        1: [{ x: 33.5, y: 19.5 }, { x: 33.5, y: 15.5 }, { x: 33.5, y: 11.5 }, { x: 33.5, y: 7.5 }, { x: 33.5, y: 4.5 }]
      },
      zones: [
        { x1: 1, z1: 3, x2: 12, z2: 20, name: 'WEST COURTYARD', short: 'WEST', colour: [0.46, 0.32, 0.20], light: [0.95, 0.70, 0.40] },
        { x1: 10, z1: 1, x2: 26, z2: 8, name: 'NORTH RAMPART', short: 'NORTH', colour: [0.54, 0.39, 0.24], light: [1.00, 0.80, 0.50] },
        { x1: 11, z1: 7, x2: 25, z2: 16, name: 'CENTRAL GATE', short: 'GATE', colour: [0.42, 0.27, 0.17], light: [0.94, 0.57, 0.28] },
        { x1: 10, z1: 16, x2: 26, z2: 23, name: 'SOUTH BAZAAR', short: 'BAZAAR', colour: [0.37, 0.24, 0.18], light: [0.78, 0.42, 0.24] },
        { x1: 24, z1: 3, x2: 35, z2: 20, name: 'EAST COURTYARD', short: 'EAST', colour: [0.46, 0.32, 0.20], light: [0.95, 0.70, 0.40] },
        { x1: 0, z1: 0, x2: 36, z2: 24, name: 'CENTRAL TRANSIT', short: 'TRANSIT', colour: [0.40, 0.29, 0.20], light: [0.90, 0.66, 0.40] }
      ],
      props: {
        containers: [
          // North Rampart cover stays low and offset from the precision lane.
          { x: 13.0, y: 4.8, yaw: 0, kind: 'sandbag', colour: [0.62, 0.49, 0.32], width: 1.45, depth: 0.46 },
          { x: 23.0, y: 4.8, yaw: 0, kind: 'sandbag', colour: [0.62, 0.49, 0.32], width: 1.45, depth: 0.46 },
          // Courtyard crate stacks create readable cover without sealing either flank.
          { x: 6.0, y: 13.9, yaw: Math.PI / 2, kind: 'crate-stack', colour: [0.43, 0.28, 0.16], width: 0.78, depth: 0.72 },
          { x: 30.0, y: 13.9, yaw: Math.PI / 2, kind: 'crate-stack', colour: [0.43, 0.28, 0.16], width: 0.78, depth: 0.72 },
          { x: 9.0, y: 18.0, yaw: Math.PI / 2, kind: 'crate', colour: [0.45, 0.30, 0.17], width: 0.92, depth: 0.72 },
          { x: 27.0, y: 18.0, yaw: Math.PI / 2, kind: 'crate', colour: [0.45, 0.30, 0.17], width: 0.92, depth: 0.72 },
          // Bazaar edge cover guides circulation around, rather than through, stalls.
          { x: 10.8, y: 20.0, yaw: 0, kind: 'sandbag', colour: [0.58, 0.45, 0.30], width: 1.18, depth: 0.42 },
          { x: 25.2, y: 20.0, yaw: 0, kind: 'sandbag', colour: [0.58, 0.45, 0.30], width: 1.18, depth: 0.42 },
          { x: 18.0, y: 12.0, yaw: 0, kind: 'barrier', colour: [0.66, 0.48, 0.28], width: 1.50, depth: 0.44 }
        ],
        machines: [
          { x: 5.2, y: 7.0, yaw: Math.PI / 2, kind: 'supply-cart', colour: [0.40, 0.24, 0.14], width: 0.82, depth: 0.54 },
          { x: 30.8, y: 7.0, yaw: -Math.PI / 2, kind: 'supply-cart', colour: [0.40, 0.24, 0.14], width: 0.82, depth: 0.54 },
          { x: 7.0, y: 12.0, yaw: 0, kind: 'market-stall', colour: [0.48, 0.24, 0.16], width: 0.92, depth: 0.64 },
          { x: 29.0, y: 12.0, yaw: Math.PI, kind: 'market-stall', colour: [0.48, 0.24, 0.16], width: 0.92, depth: 0.64 },
          { x: 13.0, y: 15.2, yaw: Math.PI / 2, kind: 'stone-plinth', colour: [0.58, 0.43, 0.28], width: 0.76, depth: 0.66 },
          { x: 23.0, y: 15.2, yaw: Math.PI / 2, kind: 'stone-plinth', colour: [0.58, 0.43, 0.28], width: 0.76, depth: 0.66 },
          { x: 14.0, y: 18.0, yaw: 0, kind: 'market-stall', colour: [0.42, 0.22, 0.15], width: 0.94, depth: 0.62 },
          { x: 22.0, y: 18.0, yaw: Math.PI, kind: 'market-stall', colour: [0.42, 0.22, 0.15], width: 0.94, depth: 0.62 }
        ],
        tanks: [
          { x: 7.4, y: 5.6, kind: 'palm', colour: [0.30, 0.48, 0.18], radius: 0.32 },
          { x: 28.6, y: 5.6, kind: 'palm', colour: [0.30, 0.48, 0.18], radius: 0.32 },
          { x: 5.2, y: 18.2, kind: 'amphora-cluster', colour: [0.55, 0.29, 0.17], radius: 0.28 },
          { x: 30.8, y: 18.2, kind: 'amphora-cluster', colour: [0.55, 0.29, 0.17], radius: 0.28 },
          { x: 7.4, y: 18.4, kind: 'pot', colour: [0.56, 0.28, 0.16], radius: 0.30 },
          { x: 28.6, y: 18.4, kind: 'pot', colour: [0.56, 0.28, 0.16], radius: 0.30 },
          { x: 18.0, y: 9.0, kind: 'well', colour: [0.52, 0.39, 0.26], radius: 0.58 }
        ],
        doors: [],
        stairs: []
      },
      decor: {
        courtyards: [],
        rugs: [],
        wallScreens: [],
        glassBands: [],
        ceilingBaffles: [],
        canopies: [
          { x: 6.8, z: 12.0, width: 3.5, depth: 3.0, yaw: 0, colour: [0.42, 0.18, 0.13], trim: [0.78, 0.54, 0.28] },
          { x: 29.2, z: 12.0, width: 3.5, depth: 3.0, yaw: 0, colour: [0.34, 0.16, 0.14], trim: [0.28, 0.55, 0.58] },
          { x: 14.0, z: 18.0, width: 3.0, depth: 2.3, yaw: 0, colour: [0.50, 0.27, 0.16], trim: [0.82, 0.60, 0.30] },
          { x: 22.0, z: 18.0, width: 3.0, depth: 2.3, yaw: 0, colour: [0.50, 0.27, 0.16], trim: [0.28, 0.54, 0.56] }
        ],
        arches: [
          { x: 11.5, z: 7.5, yaw: Math.PI / 2, width: 2.4 },
          { x: 24.5, z: 16.5, yaw: -Math.PI / 2, width: 2.4 },
          { x: 11.5, z: 16.5, yaw: Math.PI / 2, width: 2.4 },
          { x: 24.5, z: 7.5, yaw: -Math.PI / 2, width: 2.4 },
          { x: 18.0, z: 8.0, yaw: 0, width: 2.8, landmark: true },
          { x: 18.0, z: 16.0, yaw: Math.PI, width: 2.8, landmark: true }
        ],
        banners: [
          // These are freestanding courtyard standards rather than wall hangings.
          // The renderer, collision builder and audit all share the same grounded
          // mast location so no cloth or crossbar can read as unsupported.
          { x: 5.05, z: 9.5, yaw: Math.PI / 2, mount: 'standard', colour: [0.52, 0.17, 0.12], emblem: [0.86, 0.65, 0.32] },
          { x: 30.95, z: 9.5, yaw: -Math.PI / 2, mount: 'standard', colour: [0.18, 0.35, 0.42], emblem: [0.78, 0.65, 0.34] },
          { x: 5.05, z: 15.5, yaw: Math.PI / 2, mount: 'standard', colour: [0.18, 0.35, 0.42], emblem: [0.82, 0.62, 0.30] },
          { x: 30.95, z: 15.5, yaw: -Math.PI / 2, mount: 'standard', colour: [0.52, 0.17, 0.12], emblem: [0.86, 0.65, 0.32] },
          { x: 18.0, z: 6.98, yaw: 0, mount: 'standard', colour: [0.45, 0.23, 0.12], emblem: [0.88, 0.66, 0.34] },
          { x: 18.0, z: 17.02, yaw: Math.PI, mount: 'standard', colour: [0.18, 0.32, 0.38], emblem: [0.86, 0.63, 0.30] }
        ],
        mosaics: [
          { x: 18.0, z: 4.45, width: 9.4, depth: 1.25, yaw: 0, kind: 'rampart', colour: [0.54, 0.38, 0.22] },
          { x: 18.0, z: 12.0, width: 6.2, depth: 3.55, yaw: 0, kind: 'gate', colour: [0.47, 0.31, 0.19] },
          { x: 6.8, z: 12.0, width: 2.45, depth: 2.15, yaw: 0, kind: 'courtyard', colour: [0.50, 0.34, 0.20] },
          { x: 29.2, z: 12.0, width: 2.45, depth: 2.15, yaw: 0, kind: 'courtyard', colour: [0.50, 0.34, 0.20] },
          { x: 14.0, z: 18.0, width: 2.55, depth: 1.70, yaw: 0, kind: 'rug', colour: [0.42, 0.16, 0.12] },
          { x: 22.0, z: 18.0, width: 2.55, depth: 1.70, yaw: 0, kind: 'rug', colour: [0.14, 0.31, 0.36] }
        ],
        rubble: [
          { x: 3.8, z: 3.05, yaw: 0.2, scale: 0.86 }, { x: 32.2, z: 3.05, yaw: -0.2, scale: 0.86 },
          { x: 10.55, z: 6.15, yaw: 1.1, scale: 0.72 }, { x: 25.45, z: 6.15, yaw: -1.1, scale: 0.72 },
          { x: 8.55, z: 10.25, yaw: 0.6, scale: 0.68 }, { x: 27.45, z: 10.25, yaw: -0.6, scale: 0.68 },
          { x: 11.15, z: 17.1, yaw: 1.4, scale: 0.78 }, { x: 24.85, z: 17.1, yaw: -1.4, scale: 0.78 },
          { x: 5.65, z: 20.75, yaw: 0.35, scale: 0.72 }, { x: 30.35, z: 20.75, yaw: -0.35, scale: 0.72 }
        ],
        torches: [
          // Every brazier is authored on a real wall face. The yaw points the
          // bowl into open space while the renderer's mounting plate sits
          // against masonry, preventing isolated flames at oblique angles.
          { x: 11.03, z: 10.5, yaw: Math.PI / 2, height: 1.68 },
          { x: 24.97, z: 10.5, yaw: -Math.PI / 2, height: 1.68 },
          { x: 16.5, z: 9.97, yaw: Math.PI, height: 1.72 },
          { x: 19.5, z: 9.97, yaw: Math.PI, height: 1.72 },
          { x: 16.5, z: 15.03, yaw: 0, height: 1.72 },
          { x: 19.5, z: 15.03, yaw: 0, height: 1.72 },
          { x: 13.03, z: 18.5, yaw: Math.PI / 2, height: 1.60 },
          { x: 22.97, z: 18.5, yaw: -Math.PI / 2, height: 1.60 }
        ]
      }
    },

    office: {
      id: 'office',
      name: 'SKYLINE OFFICES',
      short: 'SKY',
      theme: 'office',
      matchmakingBlurb: 'Corporate offices surrounding a glass courtyard, with mixed sightlines, close rooms and deliberate flank routes.',
      tagDescription: 'Office wings wrap a central landscaped courtyard with close rooms, long lanes and flanking corridors.',
      layout: [
        '111111111111111111111111111111111111',
        '100001000000100000000100000010000001',
        '100001000000100111100100000010000001',
        '100001000000000000000000000010000001',
        '100001111011111100111111011110000001',
        '100000000000000000000000000000000001',
        '100110111001111000011110011110100001',
        '100100001001000000000010010000100001',
        '100100001001001111110010010000100001',
        '100100001001000000000010010000100001',
        '100111011001111000011110011101100001',
        '100000000000000000000000000000000001',
        '100000000000000000000000000000000001',
        '100110111001111000011110011110100001',
        '100100001001000000000010010000100001',
        '100100001001001111110010010000100001',
        '100100001001000000000010010000100001',
        '100111011001111000011110011101100001',
        '100000000000000000000000000000000001',
        '100000111101111110011111101111000001',
        '100000100000000000000000000001000001',
        '100000100000010011110010000001000001',
        '100000100000010000000010000001000001',
        '111111111111111111111111111111111111'
      ],
      hotspots: [
        { x: 5.5, y: 5.5 }, { x: 9.5, y: 11.5 }, { x: 14.5, y: 9.5 }, { x: 18.0, y: 5.5 },
        { x: 18.0, y: 11.5 }, { x: 18.0, y: 12.0 }, { x: 18.0, y: 18.5 }, { x: 21.5, y: 14.5 },
        { x: 26.5, y: 11.5 }, { x: 30.5, y: 6.5 }, { x: 30.5, y: 18.5 }
      ],
      engagementPlans: [
        { id: 'reception', name: 'RECEPTION BREACH', zone: 'RECEPTION', priority: 0.85, blue: [{ x: 5.5, y: 5.5 }, { x: 6.5, y: 5.5 }, { x: 5.5, y: 7.5 }, { x: 7.5, y: 5.5 }, { x: 9.5, y: 5.5 }], red: [{ x: 10.5, y: 5.5 }, { x: 9.5, y: 7.5 }, { x: 11.5, y: 5.5 }, { x: 10.5, y: 9.5 }, { x: 12.5, y: 5.5 }] },
        { id: 'north-office', name: 'OPEN OFFICE CONTACT', zone: 'OPEN', priority: 1.0, blue: [{ x: 13.5, y: 5.5 }, { x: 15.5, y: 7.5 }, { x: 16.5, y: 5.5 }, { x: 14.5, y: 9.5 }, { x: 17.5, y: 6.5 }], red: [{ x: 22.5, y: 5.5 }, { x: 20.5, y: 7.5 }, { x: 19.5, y: 5.5 }, { x: 19.5, y: 9.5 }, { x: 18.5, y: 6.5 }] },
        { id: 'courtyard', name: 'COURTYARD CROSSING', zone: 'COURTYARD', priority: 1.65, blue: [{ x: 13.5, y: 11.5 }, { x: 15.5, y: 12.5 }, { x: 20.5, y: 14.5 }, { x: 22.5, y: 11.5 }, { x: 16.5, y: 14.5 }], red: [{ x: 22.5, y: 11.5 }, { x: 22.5, y: 12.5 }, { x: 15.5, y: 14.5 }, { x: 13.5, y: 11.5 }, { x: 19.5, y: 14.5 }] },
        { id: 'atrium-rotation', name: 'ATRIUM ROTATION', zone: 'COURTYARD', priority: 1.35, blue: [{ x: 11.5, y: 11.5 }, { x: 13.5, y: 12.5 }, { x: 20.5, y: 14.5 }, { x: 22.5, y: 12.5 }, { x: 17.5, y: 14.5 }], red: [{ x: 24.5, y: 11.5 }, { x: 22.5, y: 12.5 }, { x: 15.5, y: 14.5 }, { x: 13.5, y: 12.5 }, { x: 18.5, y: 14.5 }] },
        { id: 'conference', name: 'CONFERENCE WING CLASH', zone: 'TRANSIT', priority: 1.10, blue: [{ x: 14.5, y: 18.5 }, { x: 15.5, y: 16.5 }, { x: 16.5, y: 18.5 }, { x: 13.5, y: 20.5 }, { x: 16.5, y: 20.5 }], red: [{ x: 21.5, y: 18.5 }, { x: 20.5, y: 16.5 }, { x: 19.5, y: 18.5 }, { x: 22.5, y: 20.5 }, { x: 19.5, y: 20.5 }] },
        { id: 'executive', name: 'EXECUTIVE WING PUSH', zone: 'EXEC', priority: 0.95, blue: [{ x: 25.5, y: 11.5 }, { x: 26.5, y: 9.5 }, { x: 27.5, y: 11.5 }, { x: 24.5, y: 14.5 }, { x: 27.5, y: 14.5 }], red: [{ x: 30.5, y: 11.5 }, { x: 31.5, y: 9.5 }, { x: 29.5, y: 11.5 }, { x: 31.5, y: 14.5 }, { x: 29.5, y: 14.5 }] },
        { id: 'break-room', name: 'BREAK ROOM ROTATION', zone: 'BREAK', priority: 0.90, blue: [{ x: 5.5, y: 18.5 }, { x: 6.5, y: 16.5 }, { x: 7.5, y: 18.5 }, { x: 5.5, y: 21.5 }, { x: 8.5, y: 21.5 }], red: [{ x: 11.5, y: 18.5 }, { x: 10.5, y: 16.5 }, { x: 9.5, y: 18.5 }, { x: 12.5, y: 20.5 }, { x: 9.5, y: 20.5 }] }
      ],
      spawnPoints: {
        0: [{ x: 2.5, y: 5.5 }, { x: 2.5, y: 9.5 }, { x: 3.0, y: 12.5 }, { x: 2.5, y: 16.5 }, { x: 2.5, y: 20.5 }],
        1: [{ x: 33.5, y: 18.5 }, { x: 33.0, y: 14.5 }, { x: 33.0, y: 11.5 }, { x: 33.0, y: 8.5 }, { x: 33.5, y: 4.5 }]
      },
      zones: [
        { x1: 1, z1: 1, x2: 10, z2: 9, name: 'RECEPTION', short: 'RECEPTION', colour: [0.26, 0.34, 0.40], light: [0.60, 0.82, 0.98] },
        { x1: 10, z1: 1, x2: 26, z2: 10, name: 'OPEN OFFICE', short: 'OPEN', colour: [0.28, 0.36, 0.34], light: [0.54, 0.82, 0.68] },
        { x1: 26, z1: 1, x2: 35, z2: 10, name: 'EXECUTIVE WING', short: 'EXEC', colour: [0.36, 0.31, 0.28], light: [0.96, 0.74, 0.46] },
        { x1: 10, z1: 9, x2: 26, z2: 15, name: 'CENTRAL COURTYARD', short: 'COURTYARD', colour: [0.30, 0.38, 0.32], light: [0.56, 0.92, 0.66] },
        { x1: 1, z1: 14, x2: 12, z2: 23, name: 'BREAK ROOM', short: 'BREAK', colour: [0.31, 0.28, 0.36], light: [0.78, 0.52, 0.94] },
        { x1: 0, z1: 0, x2: 36, z2: 24, name: 'CENTRAL TRANSIT', short: 'TRANSIT', colour: [0.32, 0.35, 0.37], light: [0.82, 0.88, 0.92] }
      ],
      props: {
        containers: [
          { x: 4.2, y: 3.8, yaw: 0, kind: 'filing', colour: [0.48, 0.52, 0.55], width: 0.54, depth: 1.12 },
          { x: 30.8, y: 3.8, yaw: 0, kind: 'filing', colour: [0.48, 0.52, 0.55], width: 0.54, depth: 1.12 },
          { x: 5.2, y: 20.2, yaw: 0, kind: 'sofa', colour: [0.20, 0.34, 0.42], width: 0.62, depth: 1.18 },
          { x: 30.8, y: 20.2, yaw: 0, kind: 'sofa', colour: [0.35, 0.27, 0.42], width: 0.62, depth: 1.18 },
          { x: 18.0, y: 3.5, yaw: Math.PI / 2, kind: 'reception', colour: [0.44, 0.35, 0.25], width: 0.84, depth: 0.56 },
          { x: 15.0, y: 11.4, yaw: 0, kind: 'bench', colour: [0.42, 0.32, 0.22], width: 1.55, depth: 0.42 },
          { x: 21.0, y: 12.6, yaw: 0, kind: 'bench', colour: [0.42, 0.32, 0.22], width: 1.55, depth: 0.42 },
          { x: 18.0, y: 10.55, yaw: 0, kind: 'planter', colour: [0.36, 0.38, 0.34], width: 1.45, depth: 0.48 },
          { x: 18.0, y: 13.45, yaw: 0, kind: 'planter', colour: [0.36, 0.38, 0.34], width: 1.45, depth: 0.48 },
          { x: 7.5, y: 22.35, yaw: 0, kind: 'storage-lockers', colour: [0.42, 0.47, 0.50], width: 1.42, depth: 0.42 },
          { x: 28.5, y: 20.35, yaw: 0, kind: 'low-storage', colour: [0.46, 0.42, 0.36], width: 1.28, depth: 0.42 }
        ],
        machines: [
          { x: 6.0, y: 8.5, yaw: 0, kind: 'desk', colour: [0.38, 0.31, 0.24], width: 1.10, depth: 0.72 },
          { x: 11.5, y: 3.5, yaw: Math.PI / 2, kind: 'desk', colour: [0.38, 0.31, 0.24], width: 1.12, depth: 0.72 },
          { x: 14.1, y: 3.55, yaw: 0, kind: 'desk', colour: [0.38, 0.31, 0.24], width: 0.96, depth: 0.58 },
          { x: 21.9, y: 3.55, yaw: Math.PI, kind: 'desk', colour: [0.38, 0.31, 0.24], width: 0.96, depth: 0.58 },
          { x: 23.2, y: 3.5, yaw: Math.PI / 2, kind: 'desk', colour: [0.38, 0.31, 0.24], width: 1.12, depth: 0.72 },
          { x: 27.5, y: 7.5, yaw: 0, kind: 'desk', colour: [0.38, 0.31, 0.24], width: 1.10, depth: 0.72 },
          { x: 18.0, y: 20.40, yaw: Math.PI / 2, kind: 'conference', colour: [0.40, 0.32, 0.22], width: 1.18, depth: 0.72 },
          { x: 6.0, y: 15.5, yaw: 0, kind: 'breaktable', colour: [0.46, 0.38, 0.28], width: 0.92, depth: 0.92 },
          { x: 8.5, y: 20.5, yaw: Math.PI / 2, kind: 'coffee-station', colour: [0.30, 0.28, 0.25], width: 0.78, depth: 0.54 },
          { x: 27.5, y: 16.5, yaw: 0, kind: 'server-rack', colour: [0.14, 0.18, 0.22], width: 0.78, depth: 0.90 },
          { x: 29.1, y: 16.5, yaw: 0, kind: 'server-rack', colour: [0.14, 0.18, 0.22], width: 0.78, depth: 0.90 },
          { x: 31.0, y: 12.5, yaw: Math.PI / 2, kind: 'copier', colour: [0.52, 0.55, 0.57], width: 0.70, depth: 0.72 },
          { x: 16.8, y: 2.8, yaw: 0, kind: 'workstation-pod', colour: [0.36, 0.31, 0.27], width: 1.18, depth: 0.60 },
          { x: 18.0, y: 7.15, yaw: Math.PI / 2, kind: 'workstation-pod', colour: [0.36, 0.31, 0.27], width: 1.08, depth: 0.54 },
          { x: 1.55, y: 16.5, yaw: Math.PI / 2, kind: 'vending-machine', colour: [0.18, 0.30, 0.42], width: 0.52, depth: 0.68 },
          { x: 10.5, y: 22.35, yaw: 0, kind: 'kitchenette', colour: [0.36, 0.35, 0.33], width: 1.20, depth: 0.48 }
        ],
        tanks: [
          { x: 4.4, y: 11.5, kind: 'plant', colour: [0.22, 0.46, 0.28], radius: 0.34 },
          { x: 31.6, y: 11.5, kind: 'plant', colour: [0.22, 0.46, 0.28], radius: 0.34 },
          { x: 18.0, y: 19.2, kind: 'plant', colour: [0.24, 0.50, 0.30], radius: 0.36 },
          { x: 14.1, y: 12.7, kind: 'plant', colour: [0.28, 0.54, 0.30], radius: 0.34 },
          { x: 21.9, y: 11.3, kind: 'plant', colour: [0.28, 0.54, 0.30], radius: 0.34 },
          { x: 18.0, y: 12.0, kind: 'fountain', colour: [0.22, 0.58, 0.70], radius: 0.70 }
        ],
        doors: [
          { id: 'office-reception-door', x: 5.5, y: 6.5, yaw: 0, colour: [0.74, 0.78, 0.82] },
          { id: 'office-open-west-door', x: 9.5, y: 4.5, yaw: 0, colour: [0.66, 0.80, 0.84] },
          { id: 'office-open-east-door', x: 24.5, y: 4.5, yaw: 0, colour: [0.66, 0.80, 0.84] },
          { id: 'office-executive-door', x: 29.5, y: 6.5, yaw: 0, colour: [0.80, 0.74, 0.64] },
          { id: 'office-courtyard-north-west', x: 14.5, y: 9.5, yaw: Math.PI / 2, colour: [0.68, 0.82, 0.86] },
          { id: 'office-courtyard-north-east', x: 19.5, y: 9.5, yaw: Math.PI / 2, colour: [0.68, 0.82, 0.86] },
          { id: 'office-break-room-door', x: 10.5, y: 19.5, yaw: 0, colour: [0.78, 0.68, 0.84] },
          { id: 'office-server-door', x: 25.5, y: 19.5, yaw: 0, colour: [0.62, 0.76, 0.88] }
        ],
        stairs: []
      },
      decor: {
        courtyards: [
          { x: 18.0, z: 12.0, width: 9.0, depth: 5.6, stone: [0.40, 0.43, 0.42], grass: [0.15, 0.34, 0.20], water: [0.22, 0.62, 0.76] }
        ],
        rugs: [
          { x: 5.8, z: 6.1, width: 4.8, depth: 2.6, colour: [0.12, 0.26, 0.34] },
          { x: 18.0, z: 18.5, width: 5.4, depth: 2.2, colour: [0.32, 0.22, 0.13] },
          { x: 30.2, z: 17.0, width: 4.4, depth: 2.5, colour: [0.23, 0.18, 0.31] }
        ],
        wallScreens: [
          { x: 5.97, z: 1.5, yaw: Math.PI / 2, width: 1.10, label: 'RECEPTION', flushMount: true },
          { x: 18.5, z: 5.025, yaw: 0, width: 1.8, label: 'OPERATIONS', flushMount: true },
          { x: 30.025, z: 20.5, yaw: Math.PI / 2, width: 1.5, label: 'SERVER', flushMount: true },
          { x: 17.025, z: 19.5, yaw: Math.PI / 2, width: 1.8, label: 'MEETING', flushMount: true },
          { x: 11.5, z: 11.025, yaw: 0, width: 1.4, label: 'COURTYARD', flushMount: true }
        ],
        glassBands: [
          { x: 13.0, z: 5.50, yaw: Math.PI / 2, width: 2.6 },
          { x: 23.0, z: 5.50, yaw: Math.PI / 2, width: 2.6 },
          { x: 13.0, z: 18.50, yaw: Math.PI / 2, width: 2.6 },
          { x: 23.0, z: 18.50, yaw: Math.PI / 2, width: 2.6 }
        ],
        ceilingBaffles: [
          { x: 8.0, z: 5.5, width: 8.0, depth: 0.12 },
          { x: 28.0, z: 5.5, width: 8.0, depth: 0.12 },
          { x: 8.0, z: 18.5, width: 8.0, depth: 0.12 },
          { x: 28.0, z: 18.5, width: 8.0, depth: 0.12 }
        ]
      }
    }
  });

  const MAP_W = 36;
  const MAP_H = 24;
  const CELL_CENTER = 0.5;
  const BOT_RADIUS = 0.245;
  const ROUND_DURATION = 115;
  const ROUND_FREEZE_TIME = 2.25;
  const ROUND_BREAK_TIME = 4.8;
  const MATCH_RESTART_TIME = 7.0;
  const REGULATION_TARGET = 3;

  let activeArenaId = 'citadel';
  let MAP = ARENA_LIBRARY[activeArenaId].layout.slice();
  let spawnPoints = {};
  let hotspots = [];
  let LEVEL_ZONES = [];
  let LEVEL_PROP_LAYOUT = { containers: [], machines: [], tanks: [], doors: [], stairs: [] };
  let LEVEL_DECOR_LAYOUT = { courtyards: [], rugs: [], wallScreens: [], glassBands: [], ceilingBaffles: [], canopies: [], arches: [], banners: [], mosaics: [], rubble: [], torches: [], walkways: [], lowCeilings: [], hazardZones: [], pipeRuns: [] };

  function cloneArenaList(list = []) {
    return Array.isArray(list) ? list.map(item => ({ ...item })) : [];
  }

  function cloneArenaDecor(decor = {}) {
    return {
      courtyards: cloneArenaList(decor.courtyards),
      rugs: cloneArenaList(decor.rugs),
      wallScreens: cloneArenaList(decor.wallScreens),
      glassBands: cloneArenaList(decor.glassBands),
      ceilingBaffles: cloneArenaList(decor.ceilingBaffles),
      canopies: cloneArenaList(decor.canopies),
      arches: cloneArenaList(decor.arches),
      banners: cloneArenaList(decor.banners),
      mosaics: cloneArenaList(decor.mosaics),
      rubble: cloneArenaList(decor.rubble),
      torches: cloneArenaList(decor.torches),
      // Citadel Depot's industrial dressing. Everything here is either
      // overhead or painted on the floor, so none of it takes part in
      // collision, navigation or line of sight.
      walkways: cloneArenaList(decor.walkways),
      lowCeilings: cloneArenaList(decor.lowCeilings),
      hazardZones: cloneArenaList(decor.hazardZones),
      pipeRuns: cloneArenaList(decor.pipeRuns)
    };
  }

  function cloneArenaProps(props = {}) {
    return {
      containers: cloneArenaList(props.containers),
      machines: cloneArenaList(props.machines),
      tanks: cloneArenaList(props.tanks),
      doors: cloneArenaList(props.doors),
      stairs: cloneArenaList(props.stairs)
    };
  }

  function arenaMeta(arenaId = activeArenaId) {
    const requested = String(arenaId || 'citadel');
    const resolved = requested === 'summit' ? 'dune' : requested;
    return ARENA_LIBRARY[resolved] || ARENA_LIBRARY.citadel;
  }

  function activeArenaMeta() {
    return arenaMeta(activeArenaId);
  }

  function arenaVerticalProfile(arenaId = activeArenaId) {
    return arenaMeta(arenaId)?.vertical || null;
  }

  function elevationOnRamp(x, z, ramp) {
    const dx = Number(ramp.x2) - Number(ramp.x1);
    const dz = Number(ramp.z2) - Number(ramp.z1);
    const lengthSq = dx * dx + dz * dz;
    if (lengthSq <= 0.0001) return null;
    const rawT = ((x - Number(ramp.x1)) * dx + (z - Number(ramp.z1)) * dz) / lengthSq;
    const length = Math.sqrt(lengthSq);
    const endpointMargin = Math.min(0.18, 0.15 / Math.max(0.1, length));
    if (rawT < -endpointMargin || rawT > 1 + endpointMargin) return null;
    const t = clamp(rawT, 0, 1);
    const px = Number(ramp.x1) + dx * t;
    const pz = Number(ramp.z1) + dz * t;
    const lateral = Math.hypot(x - px, z - pz);
    if (lateral > (Number(ramp.width) || 1) * 0.5) return null;
    return lerp(Number(ramp.elevation1) || 0, Number(ramp.elevation2) || 0, t);
  }

  function rampProjectionAt(x, z, ramp) {
    const x1 = Number(ramp.x1) || 0;
    const z1 = Number(ramp.z1) || 0;
    const dx = (Number(ramp.x2) || 0) - x1;
    const dz = (Number(ramp.z2) || 0) - z1;
    const lengthSq = dx * dx + dz * dz;
    if (lengthSq <= 0.0001) return null;
    const length = Math.sqrt(lengthSq);
    const rawT = ((Number(x) - x1) * dx + (Number(z) - z1) * dz) / lengthSq;
    const px = x1 + dx * rawT;
    const pz = z1 + dz * rawT;
    const alongX = dx / length;
    const alongZ = dz / length;
    return {
      rawT,
      t: clamp(rawT, 0, 1),
      length,
      longitudinal: rawT * length,
      lateral: (Number(x) - px) * -alongZ + (Number(z) - pz) * alongX
    };
  }

  function arenaElevationAt(x, z, arenaId = activeArenaId) {
    const profile = arenaVerticalProfile(arenaId);
    if (!profile) return 0;
    for (const ramp of profile.ramps || []) {
      const elevation = elevationOnRamp(Number(x) || 0, Number(z) || 0, ramp);
      if (elevation !== null) return elevation;
    }
    for (const platform of profile.platforms || []) {
      if (x >= platform.x1 && x <= platform.x2 && z >= platform.z1 && z <= platform.z2) return Number(platform.elevation) || 0;
    }
    return 0;
  }

  function arenaElevationTransitionAllowed(x1, z1, x2, z2, arenaId = activeArenaId) {
    const profile = arenaVerticalProfile(arenaId);
    if (!profile) return true;
    const elevation1 = arenaElevationAt(x1, z1, arenaId);
    const elevation2 = arenaElevationAt(x2, z2, arenaId);
    const elevationDelta = Math.abs(elevation2 - elevation1);
    if (elevationDelta <= 0.045) return true;

    // A change of floor is legal only while travelling along one authored
    // staircase/ramp. This prevents operators from entering the side of a
    // raised platform and being visually lifted onto it by the elevation map.
    for (const ramp of profile.ramps || []) {
      const first = rampProjectionAt(x1, z1, ramp);
      const second = rampProjectionAt(x2, z2, ramp);
      if (!first || !second) continue;
      const halfWidth = Math.max(0.12, (Number(ramp.width) || 1) * 0.5);
      const endpointAllowance = Math.min(0.16, 0.20 / Math.max(0.1, first.length));
      const firstInside = first.rawT >= -endpointAllowance && first.rawT <= 1 + endpointAllowance && Math.abs(first.lateral) <= halfWidth + 0.025;
      const secondInside = second.rawT >= -endpointAllowance && second.rawT <= 1 + endpointAllowance && Math.abs(second.lateral) <= halfWidth + 0.025;
      if (!firstInside || !secondInside) continue;
      const longitudinalTravel = Math.abs(second.longitudinal - first.longitudinal);
      const lateralTravel = Math.abs(second.lateral - first.lateral);
      if (longitudinalTravel < 0.002) continue;
      if (longitudinalTravel + 0.035 < lateralTravel * 1.12) continue;
      return true;
    }
    return false;
  }

  function arenaVerticalSnapshot(arenaId = activeArenaId) {
    const profile = arenaVerticalProfile(arenaId);
    return profile ? {
      platforms: cloneArenaList(profile.platforms),
      joins: cloneArenaList(profile.joins),
      ramps: cloneArenaList(profile.ramps)
    } : { platforms: [], joins: [], ramps: [] };
  }

  function arenaOptions() {
    return Object.values(ARENA_LIBRARY).map(arena => ({
      id: arena.id,
      name: arena.name,
      short: arena.short,
      description: arena.tagDescription,
      matchmakingBlurb: arena.matchmakingBlurb,
      theme: arena.theme,
      preview: arena.preview ? {
        badge: arena.preview.badge || '',
        tags: Array.isArray(arena.preview.tags) ? arena.preview.tags.slice() : []
      } : null
    }));
  }

  function syncArenaPresentation(force = false) {
    const arena = activeArenaMeta();
    if (mapModeEl && (force || !appState)) mapModeEl.textContent = 'TACTICAL ELIMINATION';
    if (mapNameEl && (force || !appState)) mapNameEl.textContent = arena.name;
    if (mapDescEl && (force || !appState)) mapDescEl.textContent = arena.tagDescription;
  }

  function applyArenaState(arenaId = activeArenaId) {
    const arena = arenaMeta(arenaId);
    activeArenaId = arena.id;
    MAP = arena.layout.slice();
    spawnPoints = {
      0: cloneArenaList(arena.spawnPoints?.[0]),
      1: cloneArenaList(arena.spawnPoints?.[1])
    };
    hotspots = cloneArenaList(arena.hotspots);
    LEVEL_ZONES = cloneArenaList(arena.zones);
    LEVEL_PROP_LAYOUT = cloneArenaProps(arena.props);
    LEVEL_DECOR_LAYOUT = cloneArenaDecor(arena.decor);
    resetDynamicDoors();
  }

  function levelZoneAt(x, z) {
    return LEVEL_ZONES.find(zone => zone.name !== 'CENTRAL TRANSIT' && x >= zone.x1 && x < zone.x2 && z >= zone.z1 && z < zone.z2) || LEVEL_ZONES[LEVEL_ZONES.length - 1];
  }

  function propLocalPoint(prop, localX, localY) {
    const c = Math.cos(prop.yaw || 0);
    const s = Math.sin(prop.yaw || 0);
    return {
      x: prop.x + c * localX + s * localY,
      y: prop.y - s * localX + c * localY
    };
  }

  const DUNE_CANOPY_PRESENTATION = Object.freeze({
    postWidthFactor: 0.46,
    postDepthFactor: 0.44,
    fabricY: 2.34,
    fabricPitch: -0.045,
    headerDrop: 0.045
  });

  const DUNE_BANNER_PRESENTATION = Object.freeze({
    mastLocalX: 0,
    mastLocalZ: 0,
    baseRadius: 0.12,
    crossbarHeight: 2.25,
    clothCentreHeight: 1.82
  });

  const DUNE_ARCH_PRESENTATION = Object.freeze({
    innerLintelDrop: 0.37,
    innerLintelHeight: 0.20,
    landmarkPlaqueDrop: 0.15,
    landmarkBackingHeight: 0.28,
    landmarkEmblemHeight: 0.21,
    landmarkFaceOffset: 0.205
  });

  function duneBannerMastPoint(banner) {
    const support = { x: banner.x, y: banner.z, yaw: banner.yaw || 0 };
    return propLocalPoint(support, DUNE_BANNER_PRESENTATION.mastLocalX, DUNE_BANNER_PRESENTATION.mastLocalZ);
  }

  function duneArchAttachmentSnapshot(arch) {
    const height = arch.landmark ? 2.78 : 2.62;
    const mainLintelBottom = height - 0.15 - 0.28 * 0.5;
    const innerLintelTop = height - DUNE_ARCH_PRESENTATION.innerLintelDrop + DUNE_ARCH_PRESENTATION.innerLintelHeight * 0.5;
    const mainLintelTop = height - 0.15 + 0.28 * 0.5;
    const backingBottom = height - DUNE_ARCH_PRESENTATION.landmarkPlaqueDrop - DUNE_ARCH_PRESENTATION.landmarkBackingHeight * 0.5;
    const backingTop = height - DUNE_ARCH_PRESENTATION.landmarkPlaqueDrop + DUNE_ARCH_PRESENTATION.landmarkBackingHeight * 0.5;
    const emblemBottom = height - DUNE_ARCH_PRESENTATION.landmarkPlaqueDrop - DUNE_ARCH_PRESENTATION.landmarkEmblemHeight * 0.5;
    const emblemTop = height - DUNE_ARCH_PRESENTATION.landmarkPlaqueDrop + DUNE_ARCH_PRESENTATION.landmarkEmblemHeight * 0.5;
    return {
      height,
      innerLintelAttached: innerLintelTop >= mainLintelBottom - 0.005,
      landmarkBackingAttached: !arch.landmark || (backingBottom >= mainLintelBottom - 0.005 && backingTop <= mainLintelTop + 0.005),
      landmarkEmblemAttached: !arch.landmark || (emblemBottom >= mainLintelBottom - 0.005 && emblemTop <= mainLintelTop + 0.005)
    };
  }

  const PROP_COLLISION_PROFILES = {
    container: { shape: 'box', halfWidth: 0.50, halfDepth: 0.50 },
    generator: { shape: 'box', halfWidth: 0.50, halfDepth: 0.50 },
    machine: { shape: 'box', halfWidth: 0.50, halfDepth: 0.50 },
    tank: { shape: 'circle', radius: 0.50 },
    stairs: { shape: 'box', halfWidth: 0.38, halfDepth: 0.51 },
    'door-post': { shape: 'box', halfWidth: 0.068, halfDepth: 0.078 },
    'door-panel': { shape: 'box', halfWidth: 0.215, halfDepth: 0.055 },
    'canopy-post': { shape: 'circle', radius: 0.055 },
    'arch-post': { shape: 'box', halfWidth: 0.11, halfDepth: 0.16 },
    'banner-post': { shape: 'circle', radius: DUNE_BANNER_PRESENTATION.baseRadius }
  };

  function makeLevelPropCollider(kind, prop, overrides = {}) {
    const profile = PROP_COLLISION_PROFILES[kind] || PROP_COLLISION_PROFILES.machine;
    const halfWidth = Number.isFinite(prop.width) ? prop.width * 0.5 : profile.halfWidth;
    const halfDepth = Number.isFinite(prop.depth) ? prop.depth * 0.5 : profile.halfDepth;
    const radius = Number.isFinite(prop.radius) ? prop.radius : profile.radius;
    const collider = { kind, ...profile, halfWidth, halfDepth, radius, x: prop.x, y: prop.y, yaw: prop.yaw || 0, ...overrides };
    collider._broadRadius = collider.shape === 'circle'
      ? Math.max(0, Number(collider.radius) || 0)
      : Math.hypot(Math.max(0, Number(collider.halfWidth) || 0), Math.max(0, Number(collider.halfDepth) || 0));
    collider._collisionQueryMark = 0;
    return collider;
  }

  function buildLevelPropColliders(layout = LEVEL_PROP_LAYOUT, decor = LEVEL_DECOR_LAYOUT) {
    const colliders = [];
    for (const prop of layout.containers || []) colliders.push(makeLevelPropCollider('container', prop));
    for (const prop of layout.machines || []) colliders.push(makeLevelPropCollider(prop.kind || 'machine', prop));
    for (const prop of layout.tanks || []) colliders.push(makeLevelPropCollider('tank', prop));
    for (const prop of layout.stairs || []) if (!prop.walkable) colliders.push(makeLevelPropCollider('stairs', prop));
    for (const prop of layout.doors || []) {
      for (const side of [-1, 1]) {
        const post = propLocalPoint(prop, side * 0.48, 0);
        colliders.push(makeLevelPropCollider('door-post', post, { yaw: prop.yaw || 0 }));
      }
    }

    // Dune Bastion's visible masonry and shade-support posts are genuine
    // physical structures. Keeping these small authored colliders aligned with
    // the rendered geometry prevents operators and Free Roam from passing
    // through objects that visually read as solid, without turning the shade
    // fabric or arch openings themselves into blockers.
    if (activeArenaMeta().theme === 'desert') {
      for (const canopy of decor.canopies || []) {
        const support = { x: canopy.x, y: canopy.z, yaw: canopy.yaw || 0 };
        const width = Number(canopy.width) || 3.0;
        const depth = Number(canopy.depth) || 2.4;
        for (const sx of [-1, 1]) {
          for (const sy of [-1, 1]) {
            const post = propLocalPoint(support, sx * width * DUNE_CANOPY_PRESENTATION.postWidthFactor, sy * depth * DUNE_CANOPY_PRESENTATION.postDepthFactor);
            colliders.push(makeLevelPropCollider('canopy-post', post));
          }
        }
      }
      for (const arch of decor.arches || []) {
        const support = { x: arch.x, y: arch.z, yaw: arch.yaw || 0 };
        const width = Number(arch.width) || 2.5;
        const postWidth = 0.22;
        for (const side of [-1, 1]) {
          const post = propLocalPoint(support, side * (width * 0.5 - postWidth * 0.5), 0);
          colliders.push(makeLevelPropCollider('arch-post', post, { yaw: arch.yaw || 0 }));
        }
      }
      for (const banner of decor.banners || []) {
        if ((banner.mount || 'standard') !== 'standard') continue;
        const mast = duneBannerMastPoint(banner);
        colliders.push(makeLevelPropCollider('banner-post', mast, { yaw: banner.yaw || 0 }));
      }
    }
    return colliders;
  }

  const LEVEL_PROP_COLLISION_GRID_SIZE = 2;
  let LEVEL_PROP_COLLIDERS = [];
  let LEVEL_PROP_COLLISION_GRID = new Map();
  let levelPropCollisionQueryMark = 0;
  let dynamicDoorColliderCache = [];
  let dynamicDoorColliderCacheSignature = '';

  function rebuildLevelPropCollisionGrid() {
    const grid = new Map();
    for (const collider of LEVEL_PROP_COLLIDERS) {
      const broadRadius = Math.max(0, Number(collider._broadRadius) || 0);
      const minX = Math.floor((collider.x - broadRadius) / LEVEL_PROP_COLLISION_GRID_SIZE);
      const maxX = Math.floor((collider.x + broadRadius) / LEVEL_PROP_COLLISION_GRID_SIZE);
      const minY = Math.floor((collider.y - broadRadius) / LEVEL_PROP_COLLISION_GRID_SIZE);
      const maxY = Math.floor((collider.y + broadRadius) / LEVEL_PROP_COLLISION_GRID_SIZE);
      for (let cellY = minY; cellY <= maxY; cellY++) {
        for (let cellX = minX; cellX <= maxX; cellX++) {
          const key = `${cellX},${cellY}`;
          const bucket = grid.get(key);
          if (bucket) bucket.push(collider);
          else grid.set(key, [collider]);
        }
      }
    }
    LEVEL_PROP_COLLISION_GRID = grid;
    levelPropCollisionQueryMark = 0;
  }
  let ACTIVE_DOOR_STATES = [];
  let currentEngagementPlan = null;
  const recentEngagementPlanByArena = {};
  const engagementPlanRotationByArena = {};
  const engagementPlanUsageByArena = {};

  function engagementPlanOptions(arenaId = activeArenaId) {
    return cloneArenaList(arenaMeta(arenaId).engagementPlans || []);
  }

  function selectRoundEngagementPlan(preferredId = '') {
    const plans = arenaMeta().engagementPlans || [];
    if (!plans.length) {
      currentEngagementPlan = null;
      return null;
    }
    const preferred = preferredId ? plans.find(plan => plan.id === preferredId) : null;
    const previousId = recentEngagementPlanByArena[activeArenaId] || '';
    const usage = engagementPlanUsageByArena[activeArenaId] = engagementPlanUsageByArena[activeArenaId] || {};
    let plan = preferred || null;
    if (!plan) {
      let rotation = engagementPlanRotationByArena[activeArenaId];
      const validRotation = Array.isArray(rotation) && rotation.length && rotation.every(id => plans.some(candidate => candidate.id === id));
      if (!validRotation) {
        rotation = plans.map(candidate => candidate.id);
        for (let index = rotation.length - 1; index > 0; index--) {
          const swap = Math.floor(Math.random() * (index + 1));
          [rotation[index], rotation[swap]] = [rotation[swap], rotation[index]];
        }
        if (rotation.length > 1 && rotation[0] === previousId) [rotation[0], rotation[1]] = [rotation[1], rotation[0]];
        engagementPlanRotationByArena[activeArenaId] = rotation;
      }
      const weightedRotation = rotation.map((id, index) => {
        const candidate = plans.find(planItem => planItem.id === id);
        if (!candidate) return null;
        const useCount = Number(usage[candidate.id]) || 0;
        const priority = Number(candidate.priority) || 0;
        return { id, index, score: useCount - priority * 0.55 + index * 0.015 + Math.random() * 0.09, candidate };
      }).filter(Boolean).sort((a, b) => a.score - b.score);
      const selectedId = (weightedRotation[0]?.id || rotation[0] || plans[0].id);
      plan = plans.find(candidate => candidate.id === selectedId) || plans[0];
      engagementPlanRotationByArena[activeArenaId] = rotation.filter(id => id !== selectedId);
    } else {
      const rotation = engagementPlanRotationByArena[activeArenaId];
      if (Array.isArray(rotation)) engagementPlanRotationByArena[activeArenaId] = rotation.filter(id => id !== plan.id);
    }
    usage[plan.id] = (Number(usage[plan.id]) || 0) + 1;
    currentEngagementPlan = {
      id: plan.id,
      name: plan.name,
      zone: plan.zone || null,
      arenaId: activeArenaId,
      blue: cloneArenaList(plan.blue),
      red: cloneArenaList(plan.red),
      selectedAtRound: Math.max(1, Number(roundNumber) || 1)
    };
    recentEngagementPlanByArena[activeArenaId] = plan.id;
    if (typeof combatDebug === 'object' && combatDebug) combatDebug.engagementPlansSelected++;
    return currentEngagementPlan;
  }

  function engagementPlanObjectiveForBot(plan, bot) {
    if (!bot || !plan) return null;
    const list = bot.team === TEAM_RED ? plan.red : plan.blue;
    const candidate = list?.[Math.max(0, Math.min(list.length - 1, Number(bot.slot) || 0))];
    if (!candidate) return null;
    return nearestWalkablePoint(candidate.x, candidate.y);
  }

  function openingObjectiveForBot(bot) {
    return engagementPlanObjectiveForBot(currentEngagementPlan, bot);
  }

  function resetDynamicDoors() {
    ACTIVE_DOOR_STATES = (LEVEL_PROP_LAYOUT.doors || []).map((door, index) => ({
      ...door,
      id: door.id || `${activeArenaId}-door-${index + 1}`,
      openAmount: 0,
      targetOpen: 0,
      lastPresenceAt: -999,
      lastState: 'closed',
      blockerKey: '',
      openedCount: 0,
      openedPermanently: false,
      openingSoundPlayed: false,
      openingEventRecorded: false
    }));
    dynamicDoorColliderCache = [];
    dynamicDoorColliderCacheSignature = '';
    return ACTIVE_DOOR_STATES;
  }

  function doorPanelDescriptors(state) {
    if (!state) return [];
    const open = clamp(Number(state.openAmount) || 0, 0, 1);
    const panelOffset = 0.215 + open * 0.47;
    return [-1, 1].map(side => {
      const point = propLocalPoint(state, side * panelOffset, 0);
      return {
        id: `${state.id}-panel-${side < 0 ? 'left' : 'right'}`,
        doorId: state.id,
        side,
        openAmount: open,
        x: point.x,
        y: point.y,
        yaw: state.yaw || 0,
        width: 0.43,
        depth: 0.11,
        colour: state.colour,
        dynamicDoor: true
      };
    });
  }

  // Sliding panels continue into wall pockets as a door opens. Rendering the
  // complete mesh after it had crossed the aperture made the concealed section
  // appear as a tall television or picture frame hanging off the wall. Clip the
  // presentation to the physical doorway opening while retaining the original
  // full panel descriptors for collision during the opening animation.
  function visibleDoorPanelDescriptors(state, apertureHalfWidth = 0.47) {
    if (!state) return [];
    const half = Math.max(0.1, Number(apertureHalfWidth) || 0.47);
    return doorPanelDescriptors(state).map(panel => {
      const sourceWidth = Number(panel.width) || 0.43;
      const localCentre = panel.side * (0.215 + panel.openAmount * 0.47);
      const sourceMin = localCentre - sourceWidth * 0.5;
      const sourceMax = localCentre + sourceWidth * 0.5;
      const visibleMin = Math.max(-half, sourceMin);
      const visibleMax = Math.min(half, sourceMax);
      const visibleWidth = Math.max(0, visibleMax - visibleMin);
      if (visibleWidth <= 0.004) return null;
      const visibleCentre = (visibleMin + visibleMax) * 0.5;
      const point = propLocalPoint(state, visibleCentre, 0);
      return {
        ...panel,
        x: point.x,
        y: point.y,
        width: visibleWidth,
        sourceWidth,
        localCentre: visibleCentre,
        clipRatio: clamp(visibleWidth / sourceWidth, 0, 1),
        pocketClipped: visibleWidth < sourceWidth - 0.002
      };
    }).filter(Boolean);
  }

  function dynamicDoorColliders() {
    const signature = ACTIVE_DOOR_STATES
      .map(state => `${state.id}:${Number(state.openAmount) || 0}`)
      .join('|');
    if (signature === dynamicDoorColliderCacheSignature) return dynamicDoorColliderCache;
    const colliders = [];
    for (const state of ACTIVE_DOOR_STATES) {
      if ((Number(state.openAmount) || 0) >= 0.92) continue;
      for (const panel of doorPanelDescriptors(state)) {
        colliders.push(makeLevelPropCollider('door-panel', panel, {
          id: panel.id,
          doorId: state.id,
          dynamicDoor: true,
          openAmount: panel.openAmount
        }));
      }
    }
    dynamicDoorColliderCache = colliders;
    dynamicDoorColliderCacheSignature = signature;
    return dynamicDoorColliderCache;
  }

  function allLevelPropColliders(includeDynamicDoors = true) {
    return includeDynamicDoors ? LEVEL_PROP_COLLIDERS.concat(dynamicDoorColliders()) : LEVEL_PROP_COLLIDERS;
  }

  function updateDynamicDoors(dt, extraActors = null) {
    if (!ACTIVE_DOOR_STATES.length) return;
    const aliveBots = Array.isArray(bots) ? bots.filter(bot => bot?.alive) : [];
    if (Array.isArray(extraActors)) {
      for (const actor of extraActors) {
        if (actor && Number.isFinite(actor.x) && Number.isFinite(actor.y)) aliveBots.push(actor);
      }
    }
    for (const state of ACTIVE_DOOR_STATES) {
      const nearby = aliveBots.filter(bot => Math.hypot(bot.x - state.x, bot.y - state.y) <= 1.38);
      const inThreshold = aliveBots.filter(bot => Math.hypot(bot.x - state.x, bot.y - state.y) <= 0.82);
      if (nearby.length) {
        state.lastPresenceAt = simulationClock;
        state.openedPermanently = true;
      }
      state.targetOpen = state.openedPermanently || inThreshold.length > 0 ? 1 : 0;
      state.blockerKey = inThreshold[0] ? `${inThreshold[0].team === TEAM_RED ? 'red' : 'blue'}-${inThreshold[0].slot}` : '';
      const previous = state.openAmount;
      const speed = 3.2;
      state.openAmount += Math.sign(state.targetOpen - state.openAmount) * Math.min(Math.abs(state.targetOpen - state.openAmount), Math.max(0, dt) * speed);
      const beganOpening = state.targetOpen === 1 && !state.openingEventRecorded && previous <= 0.001 && state.openAmount > previous;
      if (beganOpening) {
        state.openingEventRecorded = true;
        state.openedCount++;
        combatDebug.doorOpenEvents++;
        if (!state.openingSoundPlayed && typeof emitCosmeticSound === 'function') {
          emitCosmeticSound('doorOpen', state, 0.92, { radius: 10 });
          state.openingSoundPlayed = true;
          combatDebug.doorSoundEvents++;
        }
        if (typeof diagnosticLogEvent === 'function') {
          diagnosticLogEvent('door_opening', nearby[0] || null, { doorId: state.id, arenaId: activeArenaId, openAmount: Number(previous.toFixed(3)) });
        }
      }
      const nextState = state.openAmount >= 0.92 ? 'open' : (state.openAmount <= 0.08 ? 'closed' : (state.targetOpen ? 'opening' : 'closing'));
      if (nextState !== state.lastState) state.lastState = nextState;
    }
  }

  function doorStateSnapshot() {
    return ACTIVE_DOOR_STATES.map(state => ({
      id: state.id,
      x: state.x,
      y: state.y,
      yaw: state.yaw || 0,
      openAmount: Number((Number(state.openAmount) || 0).toFixed(3)),
      targetOpen: state.targetOpen,
      state: state.lastState,
      blockerKey: state.blockerKey || '',
      openedCount: state.openedCount || 0,
      openedPermanently: Boolean(state.openedPermanently),
      openingSoundPlayed: Boolean(state.openingSoundPlayed),
      openingEventRecorded: Boolean(state.openingEventRecorded)
    }));
  }

  function setActiveArena(arenaId = 'citadel') {
    applyArenaState(arenaId);
    LEVEL_PROP_COLLIDERS = buildLevelPropColliders(LEVEL_PROP_LAYOUT);
    rebuildLevelPropCollisionGrid();
    if (typeof invalidateNavigationGraphCache === 'function') invalidateNavigationGraphCache();
    resetDynamicDoors();
    currentEngagementPlan = null;
    syncArenaPresentation(true);
    try {
      if (typeof buildWorldBatches === 'function' && glReady) buildWorldBatches();
    } catch (_) {}
    return activeArenaMeta();
  }

  setActiveArena(activeArenaId);


  const weaponDefs = [
    { name: 'VX-7', reloadAudioProfile: 'rifle', damageMin: 18, damageMax: 27, fireRate: 0.11, accuracy: 0.82, range: 12.0, magSize: 28, reloadTime: 1.72 },
    { name: 'AR-12', reloadAudioProfile: 'rifle', damageMin: 22, damageMax: 31, fireRate: 0.15, accuracy: 0.78, range: 12.6, magSize: 24, reloadTime: 1.92 },
    { name: 'M8 CARBINE', reloadAudioProfile: 'carbine', damageMin: 17, damageMax: 25, fireRate: 0.10, accuracy: 0.79, range: 11.0, magSize: 30, reloadTime: 1.64 },
    { name: 'KILO-9', reloadAudioProfile: 'smg', damageMin: 16, damageMax: 24, fireRate: 0.09, accuracy: 0.74, range: 9.8, magSize: 32, reloadTime: 1.48 }
  ];
  const SIDEARM_DEF = { name: 'P12 SIDEARM', reloadAudioProfile: 'service-pistol', damageMin: 14, damageMax: 21, fireRate: 0.16, accuracy: 0.76, range: 8.2, magSize: 12, reloadTime: 1.28 };
  const names = {
    0: ['BLUE 01','BLUE 02','BLUE 03','BLUE 04','BLUE 05'],
    1: ['RED 01','RED 02','RED 03','RED 04','RED 05']
  };

  let bots = [];
  let blueScore = 0;
  let redScore = 0;
  let roundTime = ROUND_DURATION;
  let roundNumber = 0;
  let roundFreezeTimer = 0;
  let suddenHuntOvertime = false;
  let matchTarget = REGULATION_TARGET;
  let matchEnding = false;
  let matchRestartTimer = 0;
  let roundReason = '';
  let lastTime = performance.now();
  let spectatorIndex = 0;
  let autoSpectate = true;
  let autoTimer = 5;
  let spectatorDeathSwitchTimer = 0;
  let spectatorDeathSwitchKey = '';
  let hitPulse = 0;
  let matchSpeedMultiplier = 1;
  let hudRefreshAccumulator = 0;
  let lastMenuRenderAt = 0;
  let damageNumberSequence = 0;
  const damageNumberEffects = [];
  let statusTimer = 0;
  let shake = 0;
  let muzzle = 0;
  let feed = [];
  let roundEnding = false;
  let roundRestartTimer = 0;
  let DPR = 1;
  let renderResolutionScale = 1;
  let renderResolutionTarget = 1;
  let renderResolutionChanges = 0;
  let renderPerformancePressure = 0;
  let renderPerformanceRecovery = 0;
  let runtimeQualityPressure = 0;
  let runtimeQualityRecovery = 0;
  let runtimeQualityLastChangedAt = 0;
  const runtimeHardwareConcurrency = Math.max(1, Number(navigator.hardwareConcurrency) || 4);
  const runtimeDeviceMemoryGb = Number(navigator.deviceMemory) || 0;
  let runtimeQualityTier = runtimeHardwareConcurrency <= 2 || (runtimeDeviceMemoryGb > 0 && runtimeDeviceMemoryGb <= 2)
    ? 0
    : 2;
  let simulationClock = 0;

  function runtimeQualityLabel(tier = runtimeQualityTier) {
    return ['CONSTRAINED', 'BALANCED', 'FULL'][clamp(Math.round(Number(tier) || 0), 0, 2)];
  }

  function runtimePerceptionInterval(bot = null) {
    const combat = Boolean(bot && (bot.target || bot.sightCandidate || bot.lastSeen));
    const base = runtimeQualityTier <= 0 ? (combat ? 0.085 : 0.125)
      : runtimeQualityTier === 1 ? (combat ? 0.062 : 0.092)
        : (combat ? 0.045 : 0.068);
    const slotJitter = bot ? (Math.max(0, Number(bot.slot) || 0) % 5) * 0.004 : 0;
    return base + slotJitter;
  }

  function runtimeOperatorDetailTier(distance = 0) {
    const d = Math.max(0, Number(distance) || 0);
    if (runtimeQualityTier <= 0) return d < 5.5 ? 1 : 0;
    if (runtimeQualityTier === 1) return d < 4.5 ? 2 : (d < 10 ? 1 : 0);
    return d < 7.5 ? 2 : (d < 15 ? 1 : 0);
  }
  let soundEvents = [];
  let soundEventSequence = 0;
  let audioContext = null;
  let audioMaster = null;
  let audioCompressor = null;
  let audioEnabled = true;
  let audioUnlocked = false;
  let audioUnlockPromise = null;
  let audioLastGestureAttempt = 0;
  let audioResumeFailureCount = 0;
  let audioRecoveryTimer = 0;
  let audioLastHealthCheck = 0;
  let audioLastHealthyAt = 0;
  let pendingAudioEvents = [];
  const audioBuffers = {};
  let appState = 'match';
  let menuContext = 'main';
  let menuTab = 'play';
  let menuTime = 0;
  let canResumeMatch = false;
  let matchSimulationPaused = false;
  let liveMenuRefreshTimer = 0;
  let lastLiveMenuTab = 'play';
  let uiButtonsHidden = false;
  let scoreboardOpen = false;
  let fullViewRequested = false;
  let viewMode = 'windowed';
  let lastCombatContactAt = 0;
  let lateRoundMode = false;
  let lateRoundStatusShown = false;
  let lateRoundDirectorTick = 0;
  const combatDebug = {
    shotsFired: 0,
    blockedShotAttempts: 0,
    lastBlockedReason: '',
    pathFailures: 0,
    navigationRecoveries: 0,
    navigationPlansExecuted: 0,
    navigationPlanDeferrals: 0,
    navigationPathHoldReuses: 0,
    perceptionScanDeferrals: 0,
    tacticalDecisionDeferrals: 0,
    combatRouteSearches: 0,
    combatRoutePlanDeferrals: 0,
    combatRouteCandidateEvaluations: 0,
    teamSpacingCorrections: 0,
    teamLaneSeparations: 0,
    investigationsCompleted: 0,
    soundsHeard: 0,
    footstepsEmitted: 0,
    sprintFootstepsEmitted: 0,
    maxFootstepRadius: 0,
    gunshotsEmitted: 0,
    crouchTransitions: 0,
    audioUnlocks: 0,
    audioPlays: 0,
    audioQueued: 0,
    audioFailures: 0,
    audioResumeAttempts: 0,
    audioRecoveries: 0,
    audioStateChanges: 0,
    reloadAudioCues: 0,
    reloadAudioCueCounts: { release: 0, magazineOut: 0, magazineIn: 0, magazineSeat: 0, rack: 0 },
    lastReloadAudioCue: null,
    lateRoundGoals: 0,
    lateRoundContacts: 0,
    huntEvidenceGoals: 0,
    huntHypothesisGoals: 0,
    huntForcedMoves: 0,
    coverSelections: 0,
    coverPeeks: 0,
    tacticalPushes: 0,
    tacticalRetreats: 0,
    tacticalRepositions: 0,
    officeCourtyardRotations: 0,
    officeCourtyardCrossings: 0,
    summitLayerRotations: 0,
    summitLayerTraversals: 0,
    summitIllegalElevationTransitionsBlocked: 0,
    tacticalFlankRoutes: 0,
    stalemateBreaks: 0,
    targetSwitches: 0,
    closeThreatOverrides: 0,
    operatorBlockedShots: 0,
    operatorViewOcclusions: 0,
    friendlyViewClearances: 0,
    combatStallRecoveries: 0,
    combatApproachRoutes: 0,
    combatYieldActions: 0,
    combatRecoveryEscalations: 0,
    combatRecoverySuccesses: 0,
    crouchStallRecoveries: 0,
    coordinationWaitCommits: 0,
    safeReloads: 0,
    reloadCoverSeeks: 0,
    reloadCoverArrivals: 0,
    reloadCoverFallbacks: 0,
    flinchEvents: 0,
    flinchCooldownBlocks: 0,
    damageNumbersSpawned: 0,
    damageNumbersExpired: 0,
    criticalHitsDealt: 0,
    criticalHitsByTeam: [0, 0],
    criticalEliminationsByTeam: [0, 0],
    headshotsDealt: 0,
    headshotsByTeam: [0, 0],
    headshotEliminationsByTeam: [0, 0],
    criticalHeadshots: 0,
    fastForwardToggles: 0,
    injuriesRolled: 0,
    injuriesSustained: 0,
    doorOpenEvents: 0,
    doorSoundEvents: 0,
    spectatorAutoHandoffs: 0,
    engagementPlansSelected: 0
  };
  window.__strikewatchDebug = combatDebug;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function normaliseLeagueTier(value, fallback = 3) {
    const hasValue = value !== null && value !== undefined && value !== '';
    const hasFallback = fallback !== null && fallback !== undefined && fallback !== '';
    const numeric = hasValue ? Number(value) : NaN;
    const fallbackNumeric = hasFallback ? Number(fallback) : 3;
    const resolved = Number.isFinite(numeric) ? numeric : (Number.isFinite(fallbackNumeric) ? fallbackNumeric : 3);
    return clamp(Math.round(resolved), 0, 3);
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function angleDiff(a, b) {
    let d = (a - b + Math.PI) % TAU - Math.PI;
    return d < -Math.PI ? d + TAU : d;
  }
  function isWall(x, y) {
    const mx = Math.floor(x), my = Math.floor(y);
    return mx < 0 || my < 0 || mx >= MAP_W || my >= MAP_H || MAP[my][mx] !== '0';
  }
  function circleIntersectsLevelProp(x, y, radius, collider) {
    if (collider.shape === 'circle') {
      const combined = radius + collider.radius;
      const dx = x - collider.x;
      const dy = y - collider.y;
      return dx * dx + dy * dy < combined * combined;
    }
    const yaw = collider.yaw || 0;
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const dx = x - collider.x;
    const dy = y - collider.y;
    const localX = c * dx - s * dy;
    const localY = s * dx + c * dy;
    const closestX = clamp(localX, -collider.halfWidth, collider.halfWidth);
    const closestY = clamp(localY, -collider.halfDepth, collider.halfDepth);
    const ox = localX - closestX;
    const oy = localY - closestY;
    return ox * ox + oy * oy < radius * radius;
  }
  function collidesWithLevelProp(x, y, radius = 0, includeDynamicDoors = true) {
    const queryRadius = Math.max(0, Number(radius) || 0);
    levelPropCollisionQueryMark++;
    if (levelPropCollisionQueryMark >= 0x7fffffff) {
      levelPropCollisionQueryMark = 1;
      for (const collider of LEVEL_PROP_COLLIDERS) collider._collisionQueryMark = 0;
    }
    const queryMark = levelPropCollisionQueryMark;
    const minX = Math.floor((x - queryRadius) / LEVEL_PROP_COLLISION_GRID_SIZE);
    const maxX = Math.floor((x + queryRadius) / LEVEL_PROP_COLLISION_GRID_SIZE);
    const minY = Math.floor((y - queryRadius) / LEVEL_PROP_COLLISION_GRID_SIZE);
    const maxY = Math.floor((y + queryRadius) / LEVEL_PROP_COLLISION_GRID_SIZE);
    for (let cellY = minY; cellY <= maxY; cellY++) {
      for (let cellX = minX; cellX <= maxX; cellX++) {
        const bucket = LEVEL_PROP_COLLISION_GRID.get(`${cellX},${cellY}`);
        if (!bucket) continue;
        for (const collider of bucket) {
          if (collider._collisionQueryMark === queryMark) continue;
          collider._collisionQueryMark = queryMark;
          const combined = queryRadius + collider._broadRadius;
          const dx = x - collider.x;
          const dy = y - collider.y;
          if (dx * dx + dy * dy > combined * combined) continue;
          if (circleIntersectsLevelProp(x, y, queryRadius, collider)) return true;
        }
      }
    }
    if (includeDynamicDoors) {
      for (const collider of dynamicDoorColliders()) {
        const combined = queryRadius + collider._broadRadius;
        const dx = x - collider.x;
        const dy = y - collider.y;
        if (dx * dx + dy * dy > combined * combined) continue;
        if (circleIntersectsLevelProp(x, y, queryRadius, collider)) return true;
      }
    }
    return false;
  }
  function pointInsideLevelProp(x, y, padding = 0, includeDynamicDoors = true) {
    return collidesWithLevelProp(x, y, Math.max(0.0001, padding), includeDynamicDoors);
  }
  function segmentBlockedByLevelProp(a, b, padding = 0.025, includeDynamicDoors = true) {
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const lengthSquared = vx * vx + vy * vy;
    const colliders = includeDynamicDoors
      ? LEVEL_PROP_COLLIDERS.concat(dynamicDoorColliders())
      : LEVEL_PROP_COLLIDERS;
    const segmentMinX = Math.min(a.x, b.x) - padding;
    const segmentMaxX = Math.max(a.x, b.x) + padding;
    const segmentMinY = Math.min(a.y, b.y) - padding;
    const segmentMaxY = Math.max(a.y, b.y) + padding;
    for (const collider of colliders) {
      const broadRadius = collider._broadRadius;
      if (collider.x + broadRadius < segmentMinX || collider.x - broadRadius > segmentMaxX
        || collider.y + broadRadius < segmentMinY || collider.y - broadRadius > segmentMaxY) continue;
      if (collider.shape === 'circle') {
        const t = lengthSquared > 0.000001
          ? clamp(((collider.x - a.x) * vx + (collider.y - a.y) * vy) / lengthSquared, 0, 1)
          : 0;
        const px = a.x + vx * t;
        const py = a.y + vy * t;
        const combined = collider.radius + padding;
        const dx = px - collider.x;
        const dy = py - collider.y;
        if (dx * dx + dy * dy <= combined * combined) return true;
        continue;
      }

      const yaw = collider.yaw || 0;
      const c = Math.cos(yaw);
      const s = Math.sin(yaw);
      const transform = point => {
        const dx = point.x - collider.x;
        const dy = point.y - collider.y;
        return { x: c * dx - s * dy, y: s * dx + c * dy };
      };
      const start = transform(a);
      const end = transform(b);
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const halfWidth = collider.halfWidth + padding;
      const halfDepth = collider.halfDepth + padding;
      let tMin = 0;
      let tMax = 1;
      const axes = [
        [start.x, dx, -halfWidth, halfWidth],
        [start.y, dy, -halfDepth, halfDepth]
      ];
      let hit = true;
      for (const [origin, direction, minimum, maximum] of axes) {
        if (Math.abs(direction) < 0.000001) {
          if (origin < minimum || origin > maximum) { hit = false; break; }
          continue;
        }
        let near = (minimum - origin) / direction;
        let far = (maximum - origin) / direction;
        if (near > far) [near, far] = [far, near];
        tMin = Math.max(tMin, near);
        tMax = Math.min(tMax, far);
        if (tMin > tMax) { hit = false; break; }
      }
      if (hit && tMax >= 0 && tMin <= 1) return true;
    }
    return false;
  }
  function canStand(x, y, r = 0.22) {
    const clearOfMap = !isWall(x - r, y - r) && !isWall(x + r, y - r) && !isWall(x - r, y + r) && !isWall(x + r, y + r);
    return clearOfMap && !collidesWithLevelProp(x, y, r, true);
  }
  function canStandForNavigation(x, y, r = 0.22) {
    const clearOfMap = !isWall(x - r, y - r) && !isWall(x + r, y - r) && !isWall(x - r, y + r) && !isWall(x + r, y + r);
    return clearOfMap && !collidesWithLevelProp(x, y, r, false);
  }
  function canTravelBetween(x1, y1, x2, y2, radius = BOT_RADIUS, includeDynamicDoors = true) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.hypot(dx, dy);
    if (distance < 0.00001) return includeDynamicDoors ? canStand(x2, y2, radius) : canStandForNavigation(x2, y2, radius);
    const stepLength = Math.max(0.055, Math.min(0.12, radius * 0.42));
    const steps = Math.max(1, Math.ceil(distance / stepLength));
    let previousX = x1;
    let previousY = y1;
    for (let step = 1; step <= steps; step++) {
      const t = step / steps;
      const x = x1 + dx * t;
      const y = y1 + dy * t;
      if (!arenaElevationTransitionAllowed(previousX, previousY, x, y, activeArenaId)) return false;
      if (includeDynamicDoors ? !canStand(x, y, radius) : !canStandForNavigation(x, y, radius)) return false;
      previousX = x;
      previousY = y;
    }
    return true;
  }
  function canTravelBetweenForNavigation(x1, y1, x2, y2, radius = BOT_RADIUS) {
    return canTravelBetween(x1, y1, x2, y2, radius, false);
  }

  function auditLevelPropCollision() {
    // Rebuild the expected collider list from the same authored prop/decor
    // inputs used by runtime collision. This includes Dune Bastion's visible
    // canopy and arch supports as well as ordinary gameplay props.
    const expected = buildLevelPropColliders(LEVEL_PROP_LAYOUT, LEVEL_DECOR_LAYOUT).length;
    const issues = [];
    if (LEVEL_PROP_COLLIDERS.length !== expected) {
      issues.push(`Expected ${expected} colliders but found ${LEVEL_PROP_COLLIDERS.length}`);
    }
    let sweepChecks = 0;
    let sweepFailures = 0;
    for (let index = 0; index < LEVEL_PROP_COLLIDERS.length; index++) {
      const collider = LEVEL_PROP_COLLIDERS[index];
      if (!circleIntersectsLevelProp(collider.x, collider.y, 0.02, collider)) {
        issues.push(`Collider ${index} (${collider.kind}) does not block its centre`);
      }
      if (!Number.isFinite(collider.x) || !Number.isFinite(collider.y)) {
        issues.push(`Collider ${index} (${collider.kind}) has invalid coordinates`);
      }
      const extent = collider.shape === 'circle'
        ? collider.radius + BOT_RADIUS + 0.10
        : Math.max(collider.halfWidth, collider.halfDepth) + BOT_RADIUS + 0.10;
      for (const axis of [[1, 0], [0, 1]]) {
        const localA = { x: axis[0] * extent, y: axis[1] * extent };
        const localB = { x: -axis[0] * extent, y: -axis[1] * extent };
        const a = propLocalPoint(collider, localA.x, localA.y);
        const b = propLocalPoint(collider, localB.x, localB.y);
        if (!canStand(a.x, a.y, BOT_RADIUS) || !canStand(b.x, b.y, BOT_RADIUS)) continue;
        sweepChecks++;
        if (canTravelBetween(a.x, a.y, b.x, b.y, BOT_RADIUS)) {
          sweepFailures++;
          issues.push(`Swept movement crossed collider ${index} (${collider.kind})`);
        }
        break;
      }
    }
    let coverCells = 0;
    let unblockedCoverCells = 0;
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (MAP[y][x] !== '2') continue;
        coverCells++;
        if (!isWall(x + CELL_CENTER, y + CELL_CENTER)) unblockedCoverCells++;
      }
    }
    if (unblockedCoverCells > 0) issues.push(`${unblockedCoverCells} cover cells are not blocked`);
    return {
      ok: issues.length === 0,
      expected,
      colliderCount: LEVEL_PROP_COLLIDERS.length,
      coverCells,
      sweepChecks,
      sweepFailures,
      issues
    };
  }
  function auditLevelPropCollisionBroadphase() {
    const previousArena = activeArenaId;
    const radii = [0.001, 0.12, BOT_RADIUS, 0.40];
    const arenas = [];
    let checks = 0;
    const mismatches = [];
    try {
      for (const arenaId of Object.keys(ARENA_LIBRARY)) {
        setActiveArena(arenaId);
        const arenaStartChecks = checks;
        for (let y = 0.125; y < MAP_H; y += 0.25) {
          for (let x = 0.125; x < MAP_W; x += 0.25) {
            for (const radius of radii) {
              const expected = LEVEL_PROP_COLLIDERS.some(collider => circleIntersectsLevelProp(x, y, radius, collider));
              const actual = collidesWithLevelProp(x, y, radius, false);
              checks++;
              if (expected !== actual && mismatches.length < 20) {
                mismatches.push({ arenaId, x, y, radius, expected, actual });
              }
            }
          }
        }
        arenas.push({ arenaId, colliders: LEVEL_PROP_COLLIDERS.length, checks: checks - arenaStartChecks });
      }
    } finally {
      setActiveArena(previousArena);
    }
    return { ok: mismatches.length === 0, checks, mismatches, arenas };
  }
  function nearestWalkablePoint(x, y) {
    if (canStand(x, y, BOT_RADIUS + 0.02)) return { x, y };
    const cx = Math.floor(x);
    const cy = Math.floor(y);
    for (let radius = 0; radius <= 6; radius++) {
      for (let oy = -radius; oy <= radius; oy++) {
        for (let ox = -radius; ox <= radius; ox++) {
          if (Math.max(Math.abs(ox), Math.abs(oy)) !== radius) continue;
          const px = cx + ox + 0.5;
          const py = cy + oy + 0.5;
          if (canStand(px, py, BOT_RADIUS + 0.04)) return { x: px, y: py };
        }
      }
    }
    return { x: 1.5, y: 1.5 };
  }
  function randomSpawn(team) {
    // Try every team spawn in a random order and reject locations already
    // occupied by another living operator. Flat sprites concealed occasional
    // overlaps; true 3D bodies make spawn separation essential.
    const list = [...spawnPoints[team]].sort(() => Math.random() - 0.5);
    let fallback = nearestWalkablePoint(list[0].x, list[0].y);
    for (const selected of list) {
      const base = nearestWalkablePoint(selected.x, selected.y);
      fallback = base;
      for (let attempt = 0; attempt < 14; attempt++) {
        const candidate = {
          x: base.x + (Math.random() - 0.5) * 0.24,
          y: base.y + (Math.random() - 0.5) * 0.24
        };
        if (!canStand(candidate.x, candidate.y, BOT_RADIUS + 0.02)) continue;
        const clearOfPlayers = bots.every(other => !other.alive || Math.hypot(candidate.x - other.x, candidate.y - other.y) > 0.82);
        if (clearOfPlayers) return candidate;
      }
    }
    return fallback;
  }
  function hasLineOfSight(a, b) {
    if (!a || !b) return false;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.001) return true;

    const angle = Math.atan2(dy, dx);
    const dirX = dx / d;
    const dirY = dy / d;
    const perpX = -dirY;
    const perpY = dirX;

    // Use the same exact grid raycaster as the visible wall renderer. Three
    // parallel rays form a narrow line-of-fire corridor, preventing a bot from
    // firing through a diagonal wall corner when only a mathematical sliver is
    // open between two solid cells.
    const offsets = [0, -0.07, 0.07];
    const startInset = Math.min(BOT_RADIUS * 0.45, d * 0.08);
    const targetInset = Math.min(BOT_RADIUS * 0.62, d * 0.12);
    const requiredClearDistance = Math.max(0, d - startInset - targetInset);

    for (const offset of offsets) {
      const startX = a.x + dirX * startInset + perpX * offset;
      const startY = a.y + dirY * startInset + perpY * offset;
      if (isWall(startX, startY) || pointInsideLevelProp(startX, startY, 0.015)) return false;
      const endPoint = {
        x: b.x - dirX * targetInset + perpX * offset,
        y: b.y - dirY * targetInset + perpY * offset
      };
      if (segmentBlockedByLevelProp({ x: startX, y: startY }, endPoint, 0.022)) return false;
      const hit = castRay(startX, startY, angle);
      if (hit.d <= requiredClearDistance + 0.025) return false;
    }
    return true;
  }
  function clearRayBetween(a, b, targetInset = 0.01) {
    if (!a || !b) return false;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.001) return true;
    const dirX = dx / d;
    const dirY = dy / d;
    const angle = Math.atan2(dy, dx);
    const startInset = Math.min(BOT_RADIUS * 0.36, d * 0.06);
    const sx = a.x + dirX * startInset;
    const sy = a.y + dirY * startInset;
    const ex = b.x - dirX * Math.min(targetInset, d * 0.12);
    const ey = b.y - dirY * Math.min(targetInset, d * 0.12);
    if (isWall(sx, sy) || pointInsideLevelProp(sx, sy, 0.012)) return false;
    if (segmentBlockedByLevelProp({ x: sx, y: sy }, { x: ex, y: ey }, 0.018)) return false;
    const hit = castRay(sx, sy, angle);
    const requiredClearDistance = Math.max(0, Math.hypot(ex - sx, ey - sy));
    return hit.d > requiredClearDistance + 0.02;
  }
  function hasTargetExposure(a, b) {
    if (!a || !b) return false;
    if (hasLineOfSight(a, b)) return true;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.001) return true;
    const dirX = dx / d;
    const dirY = dy / d;
    const perpX = -dirY;
    const perpY = dirX;
    const lateral = b.crouched ? 0.11 : 0.145;
    const forward = b.crouched ? 0.025 : 0.05;
    const samples = [
      { x: b.x + dirX * forward, y: b.y + dirY * forward },
      { x: b.x - dirX * 0.04, y: b.y - dirY * 0.04 },
      { x: b.x + perpX * lateral, y: b.y + perpY * lateral },
      { x: b.x - perpX * lateral, y: b.y - perpY * lateral },
      { x: b.x + perpX * lateral * 0.7 + dirX * 0.03, y: b.y + perpY * lateral * 0.7 + dirY * 0.03 },
      { x: b.x - perpX * lateral * 0.7 + dirX * 0.03, y: b.y - perpY * lateral * 0.7 + dirY * 0.03 }
    ];
    for (const sample of samples) {
      if (clearRayBetween(a, sample, 0.005)) return true;
    }
    return false;
  }
