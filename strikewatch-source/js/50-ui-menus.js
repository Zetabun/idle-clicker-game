/*
 * Strikewatch source module: 50-ui-menus.js
 * Purpose: Main/pause menus, compact HUD, scoreboard, UI visibility and HUD updates.
 *
 * This file is a source fragment. Run `python3 build.py` to regenerate
 * js/strikewatch.dev.js and the standalone release in dist/.
 */

  function lerpAngle(a, b, t) {
    let d = (b - a + Math.PI) % TAU - Math.PI;
    if (d < -Math.PI) d += TAU;
    return a + d * t;
  }

  const menuFlyPoints = [
    { x: 5.0, y: 4.6, angle: 0.10 },
    { x: 11.8, y: 4.8, angle: 0.46 },
    { x: 18.4, y: 8.1, angle: 1.02 },
    { x: 27.6, y: 8.6, angle: 2.88 },
    { x: 28.2, y: 15.4, angle: -2.56 },
    { x: 20.0, y: 18.5, angle: -2.98 },
    { x: 10.2, y: 18.2, angle: -0.28 },
    { x: 7.2, y: 12.4, angle: -0.82 }
  ];

  const menuSections = {
    operations: {
      label: 'OPERATIONS',
      commandKicker: 'STRIKEWATCH // MATCH OPERATIONS',
      commandTitle: 'OPERATIONS DECK',
      description: 'Today, messages, telemetry and match review.',
      defaultRoute: 'play',
      routes: [
        { id: 'play', label: 'OVERVIEW', hint: 'Club overview and next actions', overview: true },
        { id: 'calendar', label: 'CALENDAR', hint: 'Matches, deadlines and club events' },
        { id: 'mail', label: 'INBOX', hint: 'Club messages and matchday mail' },
        { id: 'telemetry', label: 'TEAM TELEMETRY', hint: 'Overall squad data' },
        { id: 'reports', label: 'AFTER ACTION', hint: 'Team and player debrief' }
      ]
    },
    career: {
      label: 'TEAM',
      commandKicker: 'STRIKEWATCH // TEAM DEPARTMENT',
      commandTitle: 'TEAM DEPARTMENT',
      description: 'Squad building, tactics, recruitment and contract activity.',
      defaultRoute: 'team-hub',
      routes: [
        { id: 'team-hub', label: 'OVERVIEW', hint: 'Team status and direct shortcuts', overview: true },
        { id: 'operators', label: 'SQUAD', hint: 'Line-up and contracts' },
        { id: 'tactics', label: 'TACTICS', hint: 'Formation and delegation' },
        { id: 'market', label: 'RECRUITMENT', hint: 'Scout available players' },
        { id: 'transfers', label: 'TRANSFERS', hint: 'Offers and negotiations' },
        { id: 'honours', label: 'HONOURS', hint: 'Awards, milestones and club records' },
        { id: 'profile', label: 'PLAYER PROFILE', hint: 'History and full data', contextOnly: true }
      ]
    },
    league: {
      label: 'LEAGUE',
      commandKicker: 'STRIKEWATCH // DIVISION COMPETITION',
      commandTitle: 'LEAGUE CENTRE',
      description: 'Standings, fixtures, rivals, objectives and promotion progress.',
      defaultRoute: 'league',
      routes: [
        { id: 'league', label: 'LEAGUE CENTRE', hint: 'Table, fixtures, results, pulse and objectives', overview: true }
      ]
    },
    armoury: {
      label: 'EQUIPMENT',
      commandKicker: 'STRIKEWATCH // EQUIPMENT & SUPPLY',
      commandTitle: 'EQUIPMENT CONTROL',
      description: 'Inventory, operator loadouts, purchasing and field crates.',
      defaultRoute: 'armoury-hub',
      routes: [
        { id: 'armoury-hub', label: 'OVERVIEW', hint: 'Inventory and issue status', overview: true },
        { id: 'loadout', label: 'TEAM ARMOURY', hint: 'Weapons, armour and individual player loadouts' },
        { id: 'supplies-hub', label: 'SUPPLY OVERVIEW', hint: 'Balances, stock and purchasing shortcuts' },
        { id: 'store', label: 'SUPPLY DEPOT', hint: 'Field crates, weapons, armour and future ammunition' }
      ]
    },
    systems: {
      label: 'CLUB',
      commandKicker: 'STRIKEWATCH // CLUB ADMINISTRATION',
      commandTitle: 'CLUB OFFICE',
      description: 'Development, staff, accounts, partners and configuration.',
      defaultRoute: 'club-hub',
      routes: [
        { id: 'club-hub', label: 'OVERVIEW', hint: 'Club systems and current priorities', overview: true },
        { id: 'training', label: 'TRAINING', hint: 'Player and team development' },
        { id: 'infrastructure', label: 'INFRASTRUCTURE', hint: 'Permanent club facilities and specialisation' },
        { id: 'staff', label: 'STAFF', hint: 'Assistant manager recruitment' },
        { id: 'barracks', label: 'FINANCES', hint: 'Cashflow, analytics and ledger' },
        { id: 'gold', label: 'GOLD COINS', hint: 'Earnings, spending and account history' },
        { id: 'commercial', label: 'COMMERCIAL', hint: 'Sponsors and partner income' },
        { id: 'supporters', label: 'FANS', hint: 'Supporter expectations, popularity and reactions' },
        { id: 'settings', label: 'CONFIGURATION', hint: 'Display and audio' }
      ]
    }
  };

  const menuTabMeta = {
    play: { title: 'COMMAND CENTRE', kicker: 'CLUB OVERVIEW & PRIORITIES' },
    league: { title: 'LEAGUE SYSTEM', kicker: 'DIVISION COMPETITION' },
    calendar: { title: 'CLUB CALENDAR', kicker: 'MATCHES & DEADLINES' },
    mail: { title: 'CLUB INBOX', kicker: 'MESSAGES & CALENDAR' },
    telemetry: { title: 'TEAM TELEMETRY', kicker: 'OVERALL SQUAD LINK' },
    reports: { title: 'AFTER ACTION REPORT', kicker: 'COMBAT DEBRIEF' },
    'team-hub': { title: 'TEAM OVERVIEW', kicker: 'SQUAD, TACTICS & RECRUITMENT' },
    'armoury-hub': { title: 'ARMOURY OVERVIEW', kicker: 'INVENTORY & ASSIGNMENTS' },
    'supplies-hub': { title: 'SUPPLIES OVERVIEW', kicker: 'BALANCE, STOCK & EXCHANGE' },
    'club-hub': { title: 'CLUB OVERVIEW', kicker: 'DEVELOPMENT, STAFF & ACCOUNTS' },
    loadout: { title: 'INDIVIDUAL LOADOUTS', kicker: 'TEAM ARMOURY' },
    operators: { title: 'SQUAD MANAGEMENT', kicker: 'FIRST TEAM' },
    tactics: { title: 'TACTICS & SELECTION', kicker: 'FORMATION CONTROL' },
    market: { title: 'RECRUITMENT MARKET', kicker: 'SCOUTING NETWORK' },
    transfers: { title: 'TRANSFER CENTRE', kicker: 'OFFERS & NEGOTIATIONS' },
    honours: { title: 'CLUB HONOURS', kicker: 'AWARDS, MILESTONES & RECORDS' },
    profile: { title: 'PLAYER PROFILE', kicker: 'FULL DOSSIER' },
    training: { title: 'TRAINING FACILITY', kicker: 'TEAM & PLAYER DEVELOPMENT' },
    infrastructure: { title: 'CLUB INFRASTRUCTURE', kicker: 'PERMANENT FACILITIES & SPECIALISATION' },
    staff: { title: 'BACKROOM STAFF', kicker: 'ASSISTANT MANAGER' },
    barracks: { title: 'CLUB FINANCES', kicker: 'CASHFLOW & ANALYTICS' },
    gold: { title: 'GOLD COIN ACCOUNT', kicker: 'EARNINGS & SUPPLY SPEND' },
    commercial: { title: 'COMMERCIAL DEPARTMENT', kicker: 'SPONSORSHIP & PARTNERS' },
    supporters: { title: 'SUPPORTER CULTURE', kicker: 'FANS, EXPECTATIONS & POPULARITY' },
    store: { title: 'SUPPLY DEPOT', kicker: 'FIELD CRATES, WEAPONS & AMMUNITION' },
    settings: { title: 'SYSTEM STATUS', kicker: 'LIVE CONFIGURATION' }
  };


  function menuRouteDefinition(routeId) {
    for (const [sectionId, section] of Object.entries(menuSections)) {
      const route = (section.routes || []).find(item => item.id === routeId);
      if (route) return { ...route, sectionId, sectionLabel: section.label };
    }
    return null;
  }

  function renderMobileHeaderSubmenu(sectionId, routeId) {
    const topbar = document.querySelector('#menuShell .manager-topbar');
    if (!topbar) return;
    let nav = topbar.querySelector('.mobile-header-submenu');
    if (!nav) {
      nav = document.createElement('nav');
      nav.className = 'mobile-header-submenu';
      nav.setAttribute('aria-label', 'Current section pages');
      nav.addEventListener('click', event => {
        const button = event.target.closest?.('[data-team-route]');
        if (!button || !nav.contains(button)) return;
        event.preventDefault();
        event.stopPropagation();
        setMenuRoute(String(button.dataset.teamRoute || ''));
      });
      topbar.insertBefore(nav, topbar.querySelector('.manager-history-forward'));
    }
    const section = menuSections[sectionId] || menuSections.operations;
    nav.innerHTML = (section.routes || []).filter(item => !item.contextOnly).map(item => `<button type="button" data-team-route="${escapeCareerHtml(item.id)}" class="${item.id === routeId ? 'active' : ''}" aria-current="${item.id === routeId ? 'page' : 'false'}">${escapeCareerHtml(item.label)}</button>`).join('');
    requestAnimationFrame(() => nav.querySelector('button.active')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'auto' }));
  }

  function syncMobileContextualNavigationState(sectionId = menuSection, routeId = menuTab) {
    const shell = document.getElementById('menuShell');
    if (!shell) return;
    const resolvedSection = menuSections[sectionId] ? sectionId : 'operations';
    const resolvedRoute = routeId || menuSections[resolvedSection].defaultRoute;
    shell.dataset.mobileSection = resolvedSection;
    shell.dataset.mobileRoute = resolvedRoute;
    shell.classList.toggle('mobile-operations-overview', resolvedSection === 'operations' && resolvedRoute === 'play');
    shell.classList.toggle('mobile-contextual-navigation', !(resolvedSection === 'operations' && resolvedRoute === 'play'));
    renderMobileHeaderSubmenu(resolvedSection, resolvedRoute);
  }

  function menuVisibleRoutes(sectionId, includeContextRoute = true) {
    const section = menuSections[sectionId] || menuSections.operations;
    syncMobileContextualNavigationState(sectionId, menuTab);
    return (section.routes || []).filter(route => !route.contextOnly || (includeContextRoute && route.id === menuTab));
  }

  let mobileNavigationSectionId = 'operations';
  document.addEventListener('DOMContentLoaded', () => syncMobileContextualNavigationState());
  let mobileNavigationQuery = '';
  let mobileNavigationLastFocus = null;
  let mobileFirstMatchGuideCollapsed = false;

  const INTERFACE_BACKGROUND_STORAGE_KEY = 'strikewatch.interfaceBackgroundColour.v1';
  const INTERFACE_BACKGROUND_DEFAULT = '#07131d';
  const INTERFACE_BACKGROUND_PRESETS = [
    { colour: '#07131d', label: 'Command Navy' },
    { colour: '#082027', label: 'Deep Teal' },
    { colour: '#101a15', label: 'Forest' },
    { colour: '#17130d', label: 'Warm Black' },
    { colour: '#15111d', label: 'Plum' },
    { colour: '#111820', label: 'Slate' }
  ];

  function normaliseInterfaceBackgroundColour(value) {
    const candidate = String(value || '').trim();
    return /^#[0-9a-f]{6}$/i.test(candidate) ? candidate.toLowerCase() : INTERFACE_BACKGROUND_DEFAULT;
  }

  function shadeInterfaceBackgroundColour(value, amount = 0) {
    const colour = normaliseInterfaceBackgroundColour(value);
    const target = amount < 0 ? 0 : 255;
    const ratio = Math.min(1, Math.abs(Number(amount) || 0) / 100);
    const channels = [1, 3, 5].map(index => parseInt(colour.slice(index, index + 2), 16));
    const mixed = channels.map(channel => Math.round(channel + (target - channel) * ratio));
    return `#${mixed.map(channel => channel.toString(16).padStart(2, '0')).join('')}`;
  }

  function loadInterfaceBackgroundColour() {
    try {
      return normaliseInterfaceBackgroundColour(localStorage.getItem(INTERFACE_BACKGROUND_STORAGE_KEY));
    } catch (error) {
      return INTERFACE_BACKGROUND_DEFAULT;
    }
  }

  let interfaceBackgroundColour = loadInterfaceBackgroundColour();

  function syncInterfaceBackgroundControls() {
    const colour = normaliseInterfaceBackgroundColour(interfaceBackgroundColour);
    for (const input of document.querySelectorAll('[data-interface-background-input]')) input.value = colour;
    for (const value of document.querySelectorAll('[data-interface-background-value]')) value.textContent = colour.toUpperCase();
    for (const preview of document.querySelectorAll('[data-interface-background-preview]')) {
      preview.style.setProperty('--interface-background-preview-top', shadeInterfaceBackgroundColour(colour, 8));
      preview.style.setProperty('--interface-background-preview-bottom', shadeInterfaceBackgroundColour(colour, -18));
    }
    for (const button of document.querySelectorAll('[data-interface-background-preset]')) {
      const selected = normaliseInterfaceBackgroundColour(button.dataset.interfaceBackgroundPreset) === colour;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    }
    const reset = document.querySelector('[data-interface-background-reset]');
    if (reset) reset.disabled = colour === INTERFACE_BACKGROUND_DEFAULT;
  }

  function applyInterfaceBackgroundColour(value, options = {}) {
    const colour = normaliseInterfaceBackgroundColour(value);
    interfaceBackgroundColour = colour;
    document.documentElement.style.setProperty('--manager-page-background', colour);
    document.documentElement.style.setProperty('--manager-page-background-top', shadeInterfaceBackgroundColour(colour, 8));
    document.documentElement.style.setProperty('--manager-page-background-bottom', shadeInterfaceBackgroundColour(colour, -18));
    document.body.dataset.interfaceBackground = colour.slice(1);
    if (options.persist !== false) {
      try {
        localStorage.setItem(INTERFACE_BACKGROUND_STORAGE_KEY, colour);
      } catch (error) {
        // Appearance still updates for this session when browser storage is unavailable.
      }
    }
    syncInterfaceBackgroundControls();
    if (options.announce) showStatus(options.reset ? 'PAGE BACKGROUND RESET' : 'PAGE BACKGROUND UPDATED');
    return colour;
  }

  function renderInterfaceBackgroundSettingCard() {
    const colour = normaliseInterfaceBackgroundColour(interfaceBackgroundColour);
    const presetMarkup = INTERFACE_BACKGROUND_PRESETS.map(preset => {
      const selected = preset.colour === colour;
      return `<button type="button" class="interface-background-preset ${selected ? 'active' : ''}" data-interface-background-preset="${preset.colour}" aria-pressed="${selected}" style="--interface-background-swatch:${preset.colour}"><span>${escapeCareerHtml(preset.label)}</span><small>${preset.colour.toUpperCase()}</small></button>`;
    }).join('');
    return `<article class="menu-setting-card interface-background-card">
      <div class="menu-kicker">APPEARANCE</div>
      <h3>PAGE BACKGROUND</h3>
      <p>Changes the large canvas behind management panels and cards. Panel colours, text and route accents stay unchanged.</p>
      <div class="interface-background-preview" data-interface-background-preview style="--interface-background-preview-top:${shadeInterfaceBackgroundColour(colour, 8)};--interface-background-preview-bottom:${shadeInterfaceBackgroundColour(colour, -18)}"><span>BACKGROUND PREVIEW</span><strong data-interface-background-value>${colour.toUpperCase()}</strong><i></i><i></i><i></i></div>
      <label class="interface-background-picker"><span>CUSTOM COLOUR</span><input type="color" value="${colour}" data-interface-background-input aria-label="Choose management page background colour"><output data-interface-background-value>${colour.toUpperCase()}</output></label>
      <div class="interface-background-presets" aria-label="Background colour presets">${presetMarkup}</div>
      <button type="button" class="interface-background-reset" data-interface-background-reset ${colour === INTERFACE_BACKGROUND_DEFAULT ? 'disabled' : ''}>RESET TO DEFAULT</button>
      <small>Darker colours are recommended so the management panels remain easy to read.</small>
    </article>`;
  }

  function handleInterfaceBackgroundClick(event) {
    const preset = event.target.closest?.('[data-interface-background-preset]');
    if (preset) {
      event.preventDefault();
      applyInterfaceBackgroundColour(preset.dataset.interfaceBackgroundPreset, { announce: true });
      return true;
    }
    const reset = event.target.closest?.('[data-interface-background-reset]');
    if (reset) {
      event.preventDefault();
      applyInterfaceBackgroundColour(INTERFACE_BACKGROUND_DEFAULT, { announce: true, reset: true });
      return true;
    }
    return false;
  }

  function handleInterfaceBackgroundInput(event) {
    const input = event.target.closest?.('[data-interface-background-input]');
    if (!input) return false;
    applyInterfaceBackgroundColour(input.value, { announce: event.type === 'change' });
    return true;
  }

  applyInterfaceBackgroundColour(interfaceBackgroundColour, { persist: false });

  const MOBILE_PAGE_HELP_STORAGE_KEY = 'strikewatch.mobilePageHelpVisible';
  let mobilePageHelpVisible = false;
  try {
    mobilePageHelpVisible = localStorage.getItem(MOBILE_PAGE_HELP_STORAGE_KEY) === '1';
  } catch (error) {
    mobilePageHelpVisible = false;
  }

  function mobileNavigationEnabled() {
    return typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 1023px)').matches;
  }

  function syncMobilePageHelp(options = {}) {
    const visible = Boolean(mobilePageHelpVisible);
    if (menuShellEl) menuShellEl.dataset.mobileHelp = visible ? 'visible' : 'hidden';
    if (mobileCommandRouteBarEl) mobileCommandRouteBarEl.setAttribute('aria-hidden', visible ? 'false' : 'true');
    if (managerHelpToggleBtn) {
      managerHelpToggleBtn.classList.toggle('active', visible);
      managerHelpToggleBtn.setAttribute('aria-pressed', visible ? 'true' : 'false');
      managerHelpToggleBtn.setAttribute('aria-expanded', visible ? 'true' : 'false');
      const label = visible ? 'Hide page help' : 'Show page help';
      managerHelpToggleBtn.setAttribute('aria-label', label);
      managerHelpToggleBtn.title = label;
    }
    if (options.persist !== false) {
      try {
        localStorage.setItem(MOBILE_PAGE_HELP_STORAGE_KEY, visible ? '1' : '0');
      } catch (error) {
        // Storage is an optional convenience; the toggle still works in memory.
      }
    }
    if (options.announce) showStatus(visible ? 'PAGE HELP SHOWN' : 'PAGE HELP HIDDEN');
    return visible;
  }

  function setMobilePageHelpVisible(visible, options = {}) {
    mobilePageHelpVisible = Boolean(visible);
    return syncMobilePageHelp(options);
  }

  function toggleMobilePageHelp() {
    return setMobilePageHelpVisible(!mobilePageHelpVisible, { announce: true });
  }

  function syncMobileFirstMatchGuideCollapse(strip = null) {
    const target = strip || menuContentEl?.querySelector('.management-priority-strip.first-match-guide');
    if (!target) return mobileFirstMatchGuideCollapsed;
    const collapsed = Boolean(mobileFirstMatchGuideCollapsed);
    target.classList.toggle('is-collapsed', collapsed);
    const toggle = target.querySelector('[data-first-match-guide-toggle]');
    if (toggle) {
      toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      toggle.setAttribute('aria-label', collapsed ? 'Expand first match guide' : 'Collapse first match guide');
      toggle.title = collapsed ? 'Expand first match guide' : 'Collapse first match guide';
    }
    return collapsed;
  }

  function setMobileFirstMatchGuideCollapsed(collapsed, options = {}) {
    mobileFirstMatchGuideCollapsed = Boolean(collapsed);
    syncMobileFirstMatchGuideCollapse(options.strip || null);
    if (options.announce) showStatus(mobileFirstMatchGuideCollapsed ? 'FIRST MATCH GUIDE COLLAPSED' : 'FIRST MATCH GUIDE EXPANDED');
    return mobileFirstMatchGuideCollapsed;
  }

  function collapseMobileFirstMatchGuideAfterAction(source) {
    if (!mobileNavigationEnabled() || !source?.closest?.('.management-priority-strip.first-match-guide')) return false;
    setMobileFirstMatchGuideCollapsed(true);
    return true;
  }

  function handleMobileFirstMatchGuideClick(event) {
    const toggle = event.target.closest?.('[data-first-match-guide-toggle]');
    if (!toggle || !mobileNavigationEnabled()) return false;
    event.preventDefault();
    event.stopPropagation();
    const strip = toggle.closest('.management-priority-strip.first-match-guide');
    setMobileFirstMatchGuideCollapsed(!mobileFirstMatchGuideCollapsed, { strip, announce: true });
    return true;
  }

  function mobileNavigationIsOpen() {
    return Boolean(mobileNavigationOverlayEl && !mobileNavigationOverlayEl.hidden);
  }

  function mobileNavigationRouteEntries() {
    const query = String(mobileNavigationQuery || '').trim().toLowerCase();
    if (!query) {
      return menuVisibleRoutes(mobileNavigationSectionId, true).map(route => ({
        ...route,
        sectionId: mobileNavigationSectionId,
        sectionLabel: menuSections[mobileNavigationSectionId]?.label || 'OPERATIONS'
      }));
    }
    return Object.entries(menuSections).flatMap(([sectionId, section]) => menuVisibleRoutes(sectionId, true)
      .map(route => ({ ...route, sectionId, sectionLabel: section.label }))
      .filter(route => `${route.sectionLabel} ${route.label} ${route.hint}`.toLowerCase().includes(query)));
  }

  function renderMobileNavigationSections() {
    if (!mobileNavigationSectionsEl) return;
    mobileNavigationSectionsEl.innerHTML = Object.entries(menuSections).map(([sectionId, section], index) => {
      const signal = typeof menuSectionNotification === 'function' ? menuSectionNotification(sectionId) : { count: 0, tone: 'progress' };
      const access = typeof progressiveSectionAccess === 'function' ? progressiveSectionAccess(sectionId) : { state: 'ready', label: 'OPEN', reason: '' };
      const current = sectionId === mobileNavigationSectionId;
      const badge = signal.count > 0
        ? `<b class="mobile-navigation-section-badge ${escapeCareerHtml(signal.tone || 'progress')}">${signal.count > 99 ? '99+' : signal.count}</b>`
        : access.state !== 'ready' ? `<b class="mobile-navigation-section-badge access">${escapeCareerHtml(access.state === 'locked' ? 'LOCK' : access.label)}</b>` : '';
      const compactLabel = { operations: 'OPS', career: 'TEAM', league: 'LEAGUE', armoury: 'EQUIP', systems: 'CLUB' }[sectionId] || section.label;
      return `<button type="button" class="mobile-navigation-section ${current ? 'active' : ''} ${escapeCareerHtml(access.state || 'ready')}" data-mobile-nav-section="${escapeCareerHtml(sectionId)}" aria-pressed="${current ? 'true' : 'false'}" title="${escapeCareerHtml(access.state === 'ready' ? section.description : access.reason)}"><span>${String(index + 1).padStart(2, '0')}</span><strong><i class="mobile-navigation-section-label-full">${escapeCareerHtml(section.label)}</i><i class="mobile-navigation-section-label-short">${escapeCareerHtml(compactLabel)}</i></strong>${badge}</button>`;
    }).join('');
  }

  function renderMobileNavigationJourney() {
    if (!mobileNavigationJourneyEl) return;
    const guidance = typeof firstMatchGuidance === 'function' ? firstMatchGuidance() : null;
    if (!guidance) {
      mobileNavigationJourneyEl.hidden = true;
      mobileNavigationJourneyEl.replaceChildren();
      return;
    }
    mobileNavigationJourneyEl.hidden = false;
    mobileNavigationJourneyEl.innerHTML = `<button type="button" data-mobile-nav-route="${escapeCareerHtml(guidance.route)}"><span>FIRST MATCH JOURNEY · ${guidance.milestoneIndex + 1}/${guidance.milestoneTotal}</span><strong>${escapeCareerHtml(guidance.label)}</strong><small>${escapeCareerHtml(guidance.detail)}</small><em>${escapeCareerHtml(guidance.action || 'OPEN')}</em></button>`;
  }

  function renderMobileNavigationRoutes() {
    if (!mobileNavigationRoutesEl) return;
    const entries = mobileNavigationRouteEntries();
    const query = String(mobileNavigationQuery || '').trim();
    const selectedSection = menuSections[mobileNavigationSectionId] || menuSections.operations;
    if (mobileNavigationListKickerEl) mobileNavigationListKickerEl.textContent = query ? 'SEARCH RESULTS' : `${selectedSection.label} PAGES`;
    if (mobileNavigationListTitleEl) mobileNavigationListTitleEl.textContent = entries.length ? `${entries.length} DESTINATION${entries.length === 1 ? '' : 'S'}` : 'NO MATCHING PAGES';
    mobileNavigationRoutesEl.innerHTML = entries.length ? entries.map((route, index) => {
      const access = typeof progressiveRouteAccess === 'function' ? progressiveRouteAccess(route.id) : { locked: false, unlockLabel: '', reason: '' };
      const signal = access.locked || typeof menuRouteNotification !== 'function' ? { count: 0, label: '', tone: 'progress' } : menuRouteNotification(route.id);
      const active = menuTab === route.id;
      const status = access.locked ? `LOCKED · ${access.unlockLabel || 'PROGRESS REQUIRED'}` : active ? 'CURRENT PAGE' : signal.count ? `${signal.count > 99 ? '99+' : signal.count} ${signal.label}` : 'OPEN';
      const aria = access.locked ? `${route.label}, locked, ${access.reason}` : `${route.label}, ${route.hint}${active ? ', current page' : ''}`;
      return `<button type="button" class="mobile-navigation-route ${active ? 'active' : ''} ${access.locked ? 'locked' : ''}" data-mobile-nav-route="${escapeCareerHtml(route.id)}" ${access.locked ? 'disabled' : ''} aria-current="${active ? 'page' : 'false'}" aria-label="${escapeCareerHtml(aria)}"><span class="mobile-navigation-route-index">${String(index + 1).padStart(2, '0')}</span><span class="mobile-navigation-route-copy"><small>${escapeCareerHtml(query ? route.sectionLabel : route.overview ? 'SECTION OVERVIEW' : 'CLUB PAGE')}</small><strong>${escapeCareerHtml(route.label)}</strong><em>${escapeCareerHtml(route.hint)}</em>${access.locked && access.reason ? `<i>${escapeCareerHtml(access.reason)}</i>` : ''}</span><span class="mobile-navigation-route-status ${escapeCareerHtml(access.locked ? 'locked' : signal.tone || 'progress')}">${escapeCareerHtml(status)}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"></path></svg></button>`;
    }).join('') : `<div class="mobile-navigation-empty"><strong>NO PAGE FOUND</strong><p>Try a broader word such as team, money, match, player or training.</p></div>`;
  }

  function renderMobileNavigation() {
    const activeSection = menuSectionForRoute();
    const section = menuSections[activeSection] || menuSections.operations;
    const route = menuRouteDefinition(menuTab) || section.routes[0];
    const visibleRoutes = menuVisibleRoutes(activeSection, true);
    const routeIndex = Math.max(0, visibleRoutes.findIndex(item => item.id === menuTab));
    if (!mobileNavigationIsOpen()) mobileNavigationSectionId = activeSection;
    if (mobileCommandSectionLabelEl) mobileCommandSectionLabelEl.textContent = section.label;
    if (mobileCommandRouteLabelEl) mobileCommandRouteLabelEl.textContent = menuTabMeta[menuTab]?.title || route.label;
    if (mobileCommandRouteHintEl) mobileCommandRouteHintEl.textContent = route.hint || section.description;
    if (mobileCommandRoutePositionEl) mobileCommandRoutePositionEl.textContent = `${routeIndex + 1} OF ${visibleRoutes.length}`;
    if (mobileNavigationContextEl) mobileNavigationContextEl.textContent = `${section.label} · ${menuTabMeta[menuTab]?.title || route.label}`;
    if (mobileNavigationOpenBtn) mobileNavigationOpenBtn.setAttribute('aria-label', `Open club navigation. Current page: ${section.label}, ${menuTabMeta[menuTab]?.title || route.label}`);
    renderMobileNavigationSections();
    renderMobileNavigationJourney();
    renderMobileNavigationRoutes();
  }

  function openMobileNavigation(sectionId = menuSectionForRoute()) {
    if (!mobileNavigationEnabled() || !mobileNavigationOverlayEl) return false;
    mobileNavigationSectionId = menuSections[sectionId] ? sectionId : menuSectionForRoute();
    mobileNavigationQuery = '';
    if (mobileNavigationSearchEl) mobileNavigationSearchEl.value = '';
    if (mobileNavigationSearchClearBtn) mobileNavigationSearchClearBtn.hidden = true;
    mobileNavigationLastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : mobileNavigationOpenBtn;
    mobileNavigationOverlayEl.hidden = false;
    mobileNavigationOverlayEl.setAttribute('aria-hidden', 'false');
    mobileNavigationOpenBtn?.setAttribute('aria-expanded', 'true');
    document.body.classList.add('mobile-navigation-open');
    renderMobileNavigation();
    requestAnimationFrame(() => {
      mobileNavigationCloseBtn?.focus({ preventScroll: true });
      const active = mobileNavigationRoutesEl?.querySelector('.mobile-navigation-route.active');
      active?.scrollIntoView({ block: 'center', behavior: 'auto' });
    });
    return true;
  }

  function closeMobileNavigation(options = {}) {
    if (!mobileNavigationOverlayEl || mobileNavigationOverlayEl.hidden) return false;
    mobileNavigationOverlayEl.hidden = true;
    mobileNavigationOverlayEl.setAttribute('aria-hidden', 'true');
    mobileNavigationOpenBtn?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('mobile-navigation-open');
    mobileNavigationQuery = '';
    if (mobileNavigationSearchEl) mobileNavigationSearchEl.value = '';
    if (mobileNavigationSearchClearBtn) mobileNavigationSearchClearBtn.hidden = true;
    if (options.restoreFocus !== false && mobileNavigationLastFocus?.isConnected) mobileNavigationLastFocus.focus({ preventScroll: true });
    mobileNavigationLastFocus = null;
    return true;
  }

  function selectMobileNavigationSection(sectionId) {
    if (!menuSections[sectionId]) return false;
    mobileNavigationSectionId = sectionId;
    mobileNavigationQuery = '';
    if (mobileNavigationSearchEl) mobileNavigationSearchEl.value = '';
    if (mobileNavigationSearchClearBtn) mobileNavigationSearchClearBtn.hidden = true;
    renderMobileNavigationSections();
    renderMobileNavigationRoutes();
    mobileNavigationRoutesEl?.scrollTo({ top: 0, behavior: 'auto' });
    return true;
  }

  function updateMobileNavigationSearch(value) {
    mobileNavigationQuery = String(value || '').trim();
    if (mobileNavigationSearchClearBtn) mobileNavigationSearchClearBtn.hidden = !mobileNavigationQuery;
    renderMobileNavigationRoutes();
  }

  function menuInjuryCount() {
    if (!careerState.created || !Array.isArray(careerState.squad)) return 0;
    return careerState.squad.filter(player => typeof playerInjuryActive === 'function' ? playerInjuryActive(player) : Boolean(player?.injury?.active)).length;
  }

  function menuUnassignedWeaponCopyCount() {
    if (!careerState.created || typeof careerOwnedWeaponIds !== 'function') return 0;
    return careerOwnedWeaponIds().reduce((sum, id) => {
      if (typeof careerWeaponUsesFiniteCopies !== 'function' || !careerWeaponUsesFiniteCopies(id)) return sum;
      return sum + Math.max(0, typeof careerWeaponAvailableCount === 'function' ? careerWeaponAvailableCount(id) : 0);
    }, 0);
  }

  function menuRouteNotification(routeId) {
    if (!careerState.created) return { count: 0, label: '', tone: 'progress' };
    let count = 0;
    let label = '';
    let tone = 'progress';
    if (routeId === 'mail' && typeof clubUnreadMailCount === 'function') {
      count = clubUnreadMailCount(); label = 'unread messages'; tone = 'mail';
    } else if (routeId === 'calendar' && typeof clubCalendarTodayEventCount === 'function') {
      count = clubCalendarTodayEventCount(); label = 'events today'; tone = 'progress';
    } else if (routeId === 'transfers' && typeof transferActivityCount === 'function') {
      count = transferActivityCount(); label = 'transfer updates'; tone = 'decision';
    } else if (routeId === 'commercial' && typeof sponsorshipPendingOffers === 'function') {
      count = sponsorshipPendingOffers().length; label = 'sponsor offers'; tone = 'decision';
    } else if (routeId === 'training') {
      count = Math.max(0, Number(careerState.unspentPoints) || 0) + (typeof totalUnspentPlayerPoints === 'function' ? totalUnspentPlayerPoints() : 0);
      label = 'development points'; tone = 'progress';
      if (!count && careerState.trainingRecommendation) { count = 1; label = 'manager recommendation'; tone = 'decision'; }
    } else if (routeId === 'operators') {
      count = menuInjuryCount(); label = 'medical alerts'; tone = 'danger';
    } else if (routeId === 'loadout') {
      count = menuUnassignedWeaponCopyCount(); label = 'unissued weapon copies'; tone = 'progress';
    } else if (routeId === 'store') {
      count = careerState.pendingStoreCrate ? 1 : 0; label = 'crate ready to open'; tone = 'decision';
    } else if (routeId === 'reports') {
      count = careerState.lastRound && !careerState.lastRound.reportReviewed ? 1 : 0; label = 'new report'; tone = 'progress';
    }
    return { count: Math.max(0, Math.round(Number(count) || 0)), label, tone };
  }

  function menuSectionNotification(sectionId) {
    const section = menuSections[sectionId] || menuSections.operations;
    const signals = (section.routes || [])
      .filter(route => !route.contextOnly)
      .filter(route => typeof progressiveRouteAccess !== 'function' || !progressiveRouteAccess(route.id).locked)
      .map(route => menuRouteNotification(route.id));
    const count = signals.reduce((sum, item) => sum + item.count, 0);
    const tone = signals.some(item => item.count && item.tone === 'danger') ? 'danger'
      : signals.some(item => item.count && item.tone === 'decision') ? 'decision'
        : signals.some(item => item.count && item.tone === 'mail') ? 'mail' : 'progress';
    return { count, tone };
  }

  function menuRecentRouteIds(limit = 5) {
    const seen = new Set();
    const routes = [];
    const history = Array.isArray(menuNavigationHistory) ? menuNavigationHistory.slice(0, Math.max(0, menuNavigationIndex + 1)).reverse() : [];
    for (const entry of [{ route: menuTab }, ...history]) {
      const id = entry?.route;
      const definition = menuRouteDefinition(id);
      if (!definition || definition.contextOnly || definition.overview || seen.has(id)) continue;
      seen.add(id);
      routes.push(id);
      if (routes.length >= limit) break;
    }
    return routes;
  }

  function renderMenuRouteLocator() {
    // Build 11.75 removes the redundant locator strip. Persistent subsection
    // navigation and page headings already communicate location while using
    // substantially less vertical space on phones.
    if (menuRouteLocatorEl) menuRouteLocatorEl.replaceChildren();
  }

  function updateMenuPrimaryBadges() {
    for (const button of menuTabs) {
      const sectionId = button.dataset.section || 'operations';
      const signal = menuSectionNotification(sectionId);
      const sectionAccess = progressiveSectionAccess(sectionId);
      let badge = button.querySelector('.menu-tab-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'menu-tab-badge';
        button.append(badge);
      }
      badge.hidden = signal.count <= 0;
      badge.textContent = signal.count > 99 ? '99+' : String(signal.count);
      badge.dataset.tone = signal.tone;
      const section = menuSections[sectionId] || menuSections.operations;
      const attention = signal.count ? `, ${signal.count} item${signal.count === 1 ? '' : 's'} need attention` : '';
      const access = sectionAccess.state === 'ready' ? '' : `, ${sectionAccess.label.toLowerCase()}, ${sectionAccess.reason}`;
      button.setAttribute('aria-label', `${section.label}${attention}${access}`);
    }
  }

  function sectionHubMetrics(sectionId) {
    const squad = Array.isArray(careerState.squad) ? careerState.squad : [];
    const trainingPoints = Math.max(0, Number(careerState.unspentPoints) || 0) + (typeof totalUnspentPlayerPoints === 'function' ? totalUnspentPlayerPoints() : 0);
    if (sectionId === 'career') return [
      ['CONTRACTED', `${squad.length} / 8`, 'SQUAD PLACES'],
      ['ACTIVE OPERATORS', `${Math.min(5, squad.length)} / 5`, squad.length >= 5 ? 'DEPLOYMENT READY' : 'RECRUITMENT REQUIRED'],
      ['MEDICAL', menuInjuryCount(), menuInjuryCount() ? 'PLAYER ALERTS' : 'NO ACTIVE INJURIES'],
      ['TRANSFERS', typeof transferActivityCount === 'function' ? transferActivityCount() : 0, 'ACTIVE UPDATES']
    ];
    if (sectionId === 'armoury') {
      const ids = typeof careerOwnedWeaponIds === 'function' ? careerOwnedWeaponIds() : [];
      const totalCopies = ids.reduce((sum, id) => sum + (typeof careerWeaponUsesFiniteCopies === 'function' && careerWeaponUsesFiniteCopies(id) ? Math.max(0, careerWeaponOwnedCount(id)) : 0), 0);
      const issued = ids.reduce((sum, id) => sum + (typeof careerWeaponAssignmentCount === 'function' ? careerWeaponAssignmentCount(id) : 0), 0);
      return [['MODELS', ids.length, 'OWNED WEAPON TYPES'], ['DROPPED COPIES', totalCopies, 'FINITE CLUB STOCK'], ['ISSUED', issued, 'PLAYER ASSIGNMENTS'], ['AVAILABLE', menuUnassignedWeaponCopyCount(), 'FREE COPIES']];
    }
    if (sectionId === 'supplies') return [
      ['GOLD BALANCE', careerGoldCoins(careerState.goldCoins), 'SUPPLY CURRENCY'],
      ['FIELD CRATE', `${CAREER_GOLD_COIN_CRATE_PRICE} GC`, 'CURRENT EXCHANGE'],
      ['READY', careerState.pendingStoreCrate ? 1 : 0, careerState.pendingStoreCrate ? 'CRATE WAITING' : 'NO PENDING CRATE'],
      ['OPENED', Math.max(0, Number(careerState.cratesOpened) || 0), 'CAREER TOTAL']
    ];
    if (sectionId === 'systems') return [
      ['CASH', teamCredits(careerState.credits), 'AVAILABLE BALANCE'],
      ['TEAM LEVEL', Math.max(1, Number(careerState.level) || 1), 'CLUB DEVELOPMENT'],
      ['DEV POINTS', trainingPoints, 'READY TO SPEND'],
      ['INFRASTRUCTURE', typeof clubInfrastructureStatusLabel === 'function' ? clubInfrastructureStatusLabel() : '0/8 CAPACITY', 'PERMANENT FACILITIES'],
      ['PARTNERS', typeof sponsorshipPendingOffers === 'function' ? sponsorshipPendingOffers().length : 0, 'PENDING OFFERS']
    ];
    return [];
  }

  function sectionHubPriorityCards(sectionId) {
    const squad = Array.isArray(careerState.squad) ? careerState.squad : [];
    const starters = squad.slice(0, TEAM_REQUIRED_STARTERS);
    const injuries = menuInjuryCount();
    const averageFatigue = starters.length
      ? Math.round(starters.reduce((sum, player) => sum + clamp(Number(player.fatigue) || 0, 0, 100), 0) / starters.length)
      : 0;
    const planConfirmed = typeof clubMatchPlanConfirmed === 'function' && clubMatchPlanConfirmed();
    const transferUpdates = typeof transferActivityCount === 'function' ? transferActivityCount() : 0;
    const freeWeapons = menuUnassignedWeaponCopyCount();
    const starterWeapons = starters.filter(player => !careerPlayerPrimaryWeaponId(player) && careerPlayerSidearmId(player) === 'scrap-p12').length;
    const issuedRanges = starters.map(player => Number(getCareerWeapon(careerPlayerActiveWeaponId(player)).range) || 0).filter(Boolean);
    const minRange = issuedRanges.length ? Math.min(...issuedRanges).toFixed(1) : '—';
    const maxRange = issuedRanges.length ? Math.max(...issuedRanges).toFixed(1) : '—';
    const pendingSponsors = typeof sponsorshipPendingOffers === 'function' ? sponsorshipPendingOffers().length : 0;
    const trainingPoints = Math.max(0, Number(careerState.unspentPoints) || 0) + (typeof totalUnspentPlayerPoints === 'function' ? totalUnspentPlayerPoints() : 0);
    const wageBill = typeof clubTotalWageBill === 'function' ? clubTotalWageBill() : 0;
    const assistant = typeof clubAssistantManager === 'function' ? clubAssistantManager() : null;
    const cratePrice = Math.max(1, Number(CAREER_GOLD_COIN_CRATE_PRICE) || 60);
    const gold = Math.max(0, Math.round(Number(careerState.goldCoins) || 0));
    const cards = [];
    const add = (kicker, title, detail, value, route, action, tone = 'ready') => cards.push({ kicker, title, detail, value, route, action, tone });

    if (sectionId === 'career') {
      if (squad.length < TEAM_REQUIRED_STARTERS) add('REQUIRED', 'COMPLETE THE ACTIVE OPERATOR LINE-UP', `${TEAM_REQUIRED_STARTERS - squad.length} more operator${TEAM_REQUIRED_STARTERS - squad.length === 1 ? '' : 's'} must be recruited before deployment.`, `${squad.length}/5`, 'market', 'RECRUIT', 'urgent');
      else add('MATCHDAY', planConfirmed ? 'PLAN READY FOR DEPLOYMENT' : 'CONFIRM THE MATCH PLAN', planConfirmed ? 'The active five, roles and team instructions are locked for the next fixture.' : 'Review role fit, engagement range and team instructions before matchmaking.', planConfirmed ? 'LOCKED' : 'OPEN', 'tactics', planConfirmed ? 'REVIEW' : 'PREPARE', planConfirmed ? 'positive' : 'important');
      add('CONDITION', injuries ? 'MEDICAL ATTENTION REQUIRED' : averageFatigue >= 58 ? 'FATIGUE IS BUILDING' : 'SQUAD CONDITION STABLE', `${injuries} active medical flag${injuries === 1 ? '' : 's'} · ${averageFatigue}% active-line-up fatigue.`, injuries ? `${injuries} ALERT${injuries === 1 ? '' : 'S'}` : `${averageFatigue}%`, injuries ? 'training' : 'operators', injuries || averageFatigue >= 58 ? 'RECOVERY' : 'REVIEW', injuries ? 'urgent' : averageFatigue >= 58 ? 'important' : 'ready');
      add('CONTRACTS', transferUpdates ? 'TRANSFER ACTIVITY WAITING' : 'NO ACTIVE TRANSFER PRESSURE', transferUpdates ? `${transferUpdates} negotiation or offer update${transferUpdates === 1 ? '' : 's'} need review.` : 'Recruitment and contract activity can be opened when squad depth needs changing.', transferUpdates || 'CLEAR', transferUpdates ? 'transfers' : 'market', transferUpdates ? 'RESPOND' : 'SCOUT', transferUpdates ? 'important' : 'ready');
    } else if (sectionId === 'armoury') {
      add('ISSUE STATUS', freeWeapons ? 'UNISSUED WEAPONS AVAILABLE' : 'CLUB STOCK IS FULLY ISSUED', freeWeapons ? `${freeWeapons} finite weapon cop${freeWeapons === 1 ? 'y is' : 'ies are'} not assigned to an operator.` : 'Every finite weapon copy is currently assigned or no spare copy is owned.', freeWeapons || 'CLEAR', 'loadout', freeWeapons ? 'ISSUE' : 'REVIEW', freeWeapons ? 'important' : 'ready');
      add('ACTIVE FIVE OPERATORS', starterWeapons ? 'STARTER SIDEARMS STILL IN USE' : 'SPECIALIST LOADOUTS ACTIVE', `${starterWeapons} of the current five use the unlimited Scrapline. Compare range and magazine trade-offs before changing assignments.`, `${starterWeapons}/5`, 'loadout', 'COMPARE', starterWeapons >= 3 ? 'important' : 'ready');
      add('ENGAGEMENT RANGE', 'CURRENT FIVE RANGE SPREAD', `Issued weapons cover approximately ${minRange} to ${maxRange} metres. Match this spread to the selected map and engagement instruction.`, `${minRange}–${maxRange}M`, 'tactics', 'CHECK FIT', 'ready');
    } else if (sectionId === 'supplies') {
      add('FIELD CRATE', careerState.pendingStoreCrate ? 'PURCHASED CRATE READY' : gold >= cratePrice ? 'ENOUGH GOLD FOR A CRATE' : 'BUILDING TOWARD NEXT CRATE', careerState.pendingStoreCrate ? 'Open the waiting crate before buying another.' : `${Math.max(0, cratePrice - gold)} more Gold Coin${Math.max(0, cratePrice - gold) === 1 ? '' : 's'} needed at the current price.`, careerState.pendingStoreCrate ? 'READY' : `${gold}/${cratePrice}`, 'store', careerState.pendingStoreCrate ? 'OPEN' : gold >= cratePrice ? 'PURCHASE' : 'VIEW', careerState.pendingStoreCrate || gold >= cratePrice ? 'important' : 'ready');
      add('CLUB STOCK', freeWeapons ? 'SPARE WEAPON COPIES OWNED' : 'NO SPARE FINITE WEAPONS', freeWeapons ? `${freeWeapons} available cop${freeWeapons === 1 ? 'y can' : 'ies can'} be issued from the Armoury.` : 'Future weapon drops will create assignable copies unless the reward is a duplicate cosmetic.', freeWeapons || '0', 'loadout', freeWeapons ? 'ISSUE' : 'ARMOURY', freeWeapons ? 'important' : 'ready');
      add('ACCOUNT', 'GOLD COIN LEDGER', 'Review match awards, crate spending and the exact reward formula without mixing Gold Coins with club cash.', careerGoldCoins(gold), 'gold', 'OPEN ACCOUNT', 'ready');
    } else if (sectionId === 'systems') {
      const reserve = Number(careerState.credits) - wageBill;
      add('CASHFLOW', reserve < 0 ? 'PAYROLL RISK' : 'NEXT PAYROLL COVERED', `${teamCredits(wageBill)} weekly payroll leaves approximately ${teamCredits(reserve)} before loan collections and other spending.`, teamCredits(careerState.credits), 'barracks', 'FINANCES', reserve < 0 ? 'urgent' : reserve < wageBill ? 'important' : 'ready');
      add('DEVELOPMENT', trainingPoints ? 'DEVELOPMENT POINTS AVAILABLE' : 'TRAINING PROGRAMMES ACTIVE', trainingPoints ? `${trainingPoints} immediate point${trainingPoints === 1 ? '' : 's'} can be assigned across team and player development.` : 'Daily programmes continue when the calendar advances.', trainingPoints || 'ACTIVE', 'training', trainingPoints ? 'ALLOCATE' : 'REVIEW', trainingPoints ? 'important' : 'ready');
      if (typeof clubInfrastructureState === 'function') { const infrastructure = clubInfrastructureState(); const activeProject = infrastructure.activeProject; add('INFRASTRUCTURE', activeProject ? 'CAPITAL PROJECT UNDER CONSTRUCTION' : 'PERMANENT FACILITY CAPACITY AVAILABLE', activeProject ? `${CLUB_INFRASTRUCTURE_BRANCHES[activeProject.branchId]?.label || 'Club project'} completes in ${clubInfrastructureDaysRemaining()} day${clubInfrastructureDaysRemaining() === 1 ? '' : 's'}.` : `${clubInfrastructureRemainingCapacity()} permanent capacity slot${clubInfrastructureRemainingCapacity() === 1 ? '' : 's'} remain at the current division level.`, typeof clubInfrastructureStatusLabel === 'function' ? clubInfrastructureStatusLabel() : 'FACILITIES', 'infrastructure', activeProject ? 'REVIEW BUILD' : 'CHOOSE PROJECT', activeProject ? 'important' : 'ready'); }
      add('CLUB SUPPORT', pendingSponsors ? 'SPONSOR OFFER WAITING' : assistant ? 'ASSISTANT MANAGER EMPLOYED' : 'BACKROOM SUPPORT AVAILABLE', pendingSponsors ? `${pendingSponsors} commercial proposal${pendingSponsors === 1 ? '' : 's'} need review.` : assistant ? `${assistant.name} is available for selection and tactical support.` : 'Recruiting an assistant unlocks delegated line-up support and additional guidance.', pendingSponsors || (assistant ? 'STAFFED' : 'VACANT'), pendingSponsors ? 'commercial' : 'staff', pendingSponsors ? 'RESPOND' : assistant ? 'REVIEW' : 'RECRUIT', pendingSponsors ? 'important' : assistant ? 'ready' : 'neutral');
      if (typeof supporterState === 'function') { const fans = supporterState(); add('SUPPORTERS', fans.confidence < 38 ? 'SUPPORTERS GROWING RESTLESS' : 'SUPPORTER CULTURE', `${Number(fans.fanbase || 0).toLocaleString('en-GB')} active supporters · ${fans.popularity}/100 popularity · ${fans.confidence}/100 confidence.`, `${fans.confidence}/100`, 'supporters', 'OPEN FANS', fans.confidence < 38 ? 'important' : 'ready'); }
    }
    return cards.slice(0, sectionId === 'systems' ? 5 : 3);
  }

  function renderFoundationPath() {
    if (!careerState.created || (careerState.totalMatches >= 2 && Number(careerState.calendar?.absoluteDay) >= 7)) return '';
    // The nine-step First Match Guide is the only visible opening progress tracker.
    // The compact Foundation handoff returns only after that guide has finished.
    if (typeof firstMatchGuidance === 'function' && firstMatchGuidance()) return '';
    const squad = Array.isArray(careerState.squad) ? careerState.squad : [];
    const reportReviewed = Boolean(careerState.lastRound?.reportReviewed);
    const trainingSet = squad.some(player => player.trainingFocus && player.trainingFocus !== 'none');
    const steps = [
      { label: 'CREATE THE CLUB', complete: careerState.created, route: 'play' },
      { label: 'RECRUIT FIVE OPERATORS', complete: squad.length >= TEAM_REQUIRED_STARTERS, route: 'market' },
      { label: 'CONFIRM THE MATCH PLAN', complete: typeof clubMatchPlanConfirmed === 'function' && clubMatchPlanConfirmed(), route: 'tactics' },
      { label: 'PLAY THE FIRST MATCH', complete: careerState.totalMatches > 0, route: 'play' },
      { label: 'REVIEW THE DEBRIEF', complete: reportReviewed, route: 'reports' },
      { label: 'SET A TRAINING FOCUS', complete: trainingSet, route: 'training' },
      { label: 'ADVANCE THE CLUB DAY', complete: Number(careerState.calendar?.absoluteDay) > 0, route: 'calendar' }
    ];
    const nextIndex = steps.findIndex(step => !step.complete);
    const completeCount = steps.filter(step => step.complete).length;
    return `<section class="foundation-path foundation-handoff"><header><div><span>FIRST MATCH GUIDE COMPLETE</span><strong>OPENING WEEK HANDOFF</strong><p>The guided journey is finished. This smaller checklist now hands control back to the normal club priorities.</p></div><b>${completeCount}/${steps.length}</b></header><div>${steps.map((step, index) => `<button class="${step.complete ? 'complete' : index === nextIndex ? 'current' : 'future'}" data-team-route="${escapeCareerHtml(step.route)}"><i>${step.complete ? '✓' : String(index + 1).padStart(2, '0')}</i><span>${escapeCareerHtml(step.label)}</span><em>${step.complete ? 'DONE' : index === nextIndex ? 'NEXT' : 'LATER'}</em></button>`).join('')}</div></section>`;
  }

  function firstMatchRecommendedProfileId() {
    const market = Array.isArray(careerState.market) ? careerState.market : [];
    if (!market.length) return null;
    if (typeof recruitmentRecommendationMap === 'function' && typeof recruitmentBeginnerCandidates === 'function') {
      const recommended = recruitmentBeginnerCandidates(market, recruitmentRecommendationMap(market), 6);
      if (recommended.length) return recommended[0].id;
    }
    return market[0]?.id || null;
  }

  function firstMatchGuidance() {
    if (!careerState.created) return null;
    const squad = Array.isArray(careerState.squad) ? careerState.squad : [];
    const tutorial = careerState.tutorial || {};
    const reportReviewed = Boolean(careerState.lastRound?.reportReviewed);
    const trainingSet = squad.some(player => player.trainingFocus && player.trainingFocus !== 'none');
    const planConfirmed = typeof clubMatchPlanConfirmed === 'function' && clubMatchPlanConfirmed();
    const firstCareerMatchPlayed = Number(careerState.totalMatches) > 0;
    const daysToFixture = typeof clubDaysUntilFixture === 'function' ? clubDaysUntilFixture() : null;
    const matchWaitDays = planConfirmed && Number(daysToFixture) > 0 ? Number(daysToFixture) : 0;
    // Steps only ever move forward: viewing flags are also satisfied by the
    // outcome they teach (a signed operator implies the market and a candidate
    // report were used; a confirmed plan implies the line-up was reviewed).
    const steps = [
      { id: 'recruitment', complete: Boolean(tutorial.marketViewed) || squad.length > 0, route: 'market', label: 'OPEN OPERATOR RECRUITMENT', detail: 'Start with the six recommended candidates. You need five contracted operators before a match can begin.', action: 'OPEN RECRUITMENT' },
      { id: 'profile', complete: Boolean(tutorial.profileViewed) || squad.length > 0, route: 'profile', playerId: firstMatchRecommendedProfileId(), label: 'INSPECT ONE OPERATOR PROFILE', detail: 'Open a report to understand the role, strongest attributes, estimated fee and what the operator would add to your current Active Five.', action: 'VIEW PROFILE' },
      { id: 'first-signing', complete: squad.length > 0, route: 'market', scrollTarget: 'recruitment-candidates', label: 'RECRUIT YOUR FIRST OPERATOR', detail: 'Select two recommended candidates, read Best Current Fit and Main Trade-off, then negotiate with the one you prefer. The transfer fee leaves Club Cash immediately and the weekly wage uses wage headroom.', action: 'RECRUIT OPERATOR' },
      { id: 'active-five', complete: squad.length >= TEAM_REQUIRED_STARTERS, route: 'market', scrollTarget: 'recruitment-candidates', label: squad.length ? `RECRUIT ${TEAM_REQUIRED_STARTERS - squad.length} MORE OPERATOR${TEAM_REQUIRED_STARTERS - squad.length === 1 ? '' : 'S'}` : 'BUILD THE ACTIVE FIVE', detail: `${squad.length} of ${TEAM_REQUIRED_STARTERS} deployment places are filled. Follow the remaining team needs, compare two candidates at a time and keep enough Club Cash for fees, wages and loan repayments.`, action: 'CONTINUE RECRUITING' },
      { id: 'lineup', complete: Boolean(tutorial.squadViewed) || planConfirmed || firstCareerMatchPlayed, route: 'operators', label: 'REVIEW THE ACTIVE FIVE', detail: 'The first five squad positions deploy. Check readiness, roles and equipment, then reorder the line-up only when needed.', action: 'OPEN ACTIVE LINE-UP' },
      { id: 'plan', complete: planConfirmed || firstCareerMatchPlayed, route: 'tactics', label: 'CONFIRM ONE MATCH PLAN', detail: 'Choose operator roles, approach, engagement range and team priority, then lock the plan for the match.', action: 'PREPARE TACTICS' },
      matchWaitDays
        ? { id: 'match', complete: firstCareerMatchPlayed, route: 'calendar', label: `ADVANCE ${matchWaitDays} DAY${matchWaitDays === 1 ? '' : 'S'} TO MATCHDAY`, detail: `The match plan is locked and the fixture is ${matchWaitDays} day${matchWaitDays === 1 ? '' : 's'} away. Use END DAY to advance the club calendar — it stays unlocked until matchday.`, action: 'OPEN CALENDAR' }
        : { id: 'match', complete: firstCareerMatchPlayed, route: 'play', leagueAction: 'play-league', label: 'WATCH YOUR FIRST MATCH', detail: 'Your five operators move, aim and fight autonomously. Start matchmaking and watch how well they execute the plan in a first-to-three match.', action: 'START MATCHMAKING' },
      { id: 'debrief', complete: reportReviewed, route: 'reports', label: 'REVIEW WHAT HAPPENED', detail: 'Read What Worked, Biggest Issue and Next Manager Action before changing the squad or tactics.', action: 'OPEN DEBRIEF' },
      // The programme selects sit below the development hero and Team XP
      // benefits, so the final step must scroll to Training Squad the same way
      // the signing steps scroll to the candidate list. Without it the guide
      // lands on a screen that contains no way to complete the objective.
      { id: 'training', complete: trainingSet, route: 'training', scrollTarget: 'training-programmes', label: 'SET ONE TRAINING FOCUS', detail: 'Open Programme Selection on one operator in Training Squad, choose an improvement, then press Save Changes to make it active.', action: 'OPEN TRAINING' }
    ];
    const index = steps.findIndex(step => !step.complete);
    if (index < 0) return null;
    const step = steps[index];
    const milestones = [
      { id: 'active-five', label: 'BUILD ACTIVE FIVE', stepIds: ['recruitment', 'profile', 'first-signing', 'active-five'] },
      { id: 'lineup', label: 'REVIEW LINE-UP', stepIds: ['lineup'] },
      { id: 'prepare', label: 'PREPARE TEAM', stepIds: ['plan'] },
      { id: 'watch', label: 'WATCH MATCH', stepIds: ['match'] },
      { id: 'review', label: 'REVIEW MATCH', stepIds: ['debrief'] },
      { id: 'improve', label: 'IMPROVE TEAM', stepIds: ['training'] }
    ];
    const milestoneIndex = Math.max(0, milestones.findIndex(item => item.stepIds.includes(step.id)));
    const milestone = milestones[milestoneIndex];
    const milestoneStepIndex = Math.max(0, milestone.stepIds.indexOf(step.id));
    return {
      ...step,
      index,
      total: steps.length,
      section: menuSectionForRoute(step.route),
      milestoneId: milestone.id,
      milestoneLabel: milestone.label,
      milestoneIndex,
      milestoneTotal: milestones.length,
      milestoneStep: milestoneStepIndex + 1,
      milestoneStepTotal: milestone.stepIds.length,
      journeyProgress: (index + 1) / steps.length
    };
  }


  const FIRST_MATCH_OVERVIEW_ROUTES = new Set(['play', 'team-hub', 'armoury-hub', 'supplies-hub', 'club-hub']);

  function firstMatchInterfaceFacts() {
    const squad = Array.isArray(careerState.squad) ? careerState.squad : [];
    const reportReviewed = Boolean(careerState.lastRound?.reportReviewed);
    const trainingSet = squad.some(player => player.trainingFocus && player.trainingFocus !== 'none');
    const guide = firstMatchGuidance();
    const withinOpeningWindow = Number(careerState.totalMatches) < 2;
    return {
      active: Boolean(careerState.created && guide && withinOpeningWindow),
      guide,
      withinOpeningWindow,
      squadCount: squad.length,
      activeFiveReady: squad.length >= TEAM_REQUIRED_STARTERS,
      planConfirmed: typeof clubMatchPlanConfirmed === 'function' && clubMatchPlanConfirmed(),
      firstMatchComplete: Number(careerState.totalMatches) > 0,
      reportReviewed,
      trainingSet
    };
  }

  function progressiveRouteAccess(routeId, factsOverride = null) {
    const definition = menuRouteDefinition(routeId);
    if (!definition) return { locked: false, state: 'ready', label: 'OPEN', unlockLabel: '', reason: '' };
    const facts = factsOverride || firstMatchInterfaceFacts();
    if (!careerState.created && !factsOverride) {
      const available = routeId === 'play';
      return available
        ? { locked: false, state: 'ready', label: 'OPEN', unlockLabel: '', reason: '' }
        : { locked: true, state: 'locked', label: 'CREATE CLUB', unlockLabel: 'CREATE CLUB', reason: 'Create your club in the Command Centre first.' };
    }
    if (!facts.active || FIRST_MATCH_OVERVIEW_ROUTES.has(routeId) || ['market', 'mail', 'settings', 'profile'].includes(routeId)) {
      return { locked: false, state: 'ready', label: 'OPEN', unlockLabel: '', reason: '' };
    }
    if (facts.guide?.route === routeId) {
      return { locked: false, state: 'ready', label: 'NEXT', unlockLabel: '', reason: '' };
    }
    const recruitmentNegotiationOpen = Boolean(careerState.transfers?.activeIncoming);
    const recruitmentGuideNeedsNegotiation = ['recruitment', 'profile', 'first-signing', 'active-five'].includes(facts.guide?.id);
    if (routeId === 'transfers' && recruitmentNegotiationOpen && recruitmentGuideNeedsNegotiation) {
      return { locked: false, state: 'ready', label: 'NEGOTIATE', unlockLabel: '', reason: '' };
    }
    const pendingSponsorDecision = routeId === 'commercial'
      && typeof sponsorshipPendingOffers === 'function'
      && sponsorshipPendingOffers().length > 0;
    if (pendingSponsorDecision) {
      return { locked: false, state: 'ready', label: 'RESPOND', unlockLabel: '', reason: 'A live sponsorship offer requires an accept or decline decision.' };
    }

    const locked = (unlockLabel, reason) => ({ locked: true, state: 'locked', label: 'LOCKED', unlockLabel, reason });
    if (['operators', 'tactics', 'loadout'].includes(routeId) && !facts.activeFiveReady) {
      return locked('5 OPERATORS', 'Unlocks when five operators are contracted for the active line-up.');
    }
    if (['league', 'calendar'].includes(routeId) && !facts.planConfirmed) {
      return locked('CONFIRM PLAN', 'Unlocks after the active five operators have a confirmed match plan.');
    }
    if (['telemetry', 'reports', 'store'].includes(routeId) && !facts.firstMatchComplete) {
      return locked('FIRST MATCH', 'Unlocks after your first complete match.');
    }
    if (routeId === 'training' && !facts.reportReviewed) {
      return locked('REVIEW DEBRIEF', 'Unlocks after the first After Action Report has been reviewed.');
    }
    if (['transfers', 'staff', 'infrastructure', 'barracks', 'gold', 'commercial', 'supporters'].includes(routeId) && !(facts.firstMatchComplete && facts.reportReviewed && facts.trainingSet)) {
      return locked('FINISH GUIDE', 'Unlocks after the first match, debrief and one operator training focus are complete.');
    }
    return { locked: false, state: 'ready', label: 'OPEN', unlockLabel: '', reason: '' };
  }

  function progressiveSectionAccess(sectionId, factsOverride = null) {
    const section = menuSections[sectionId] || menuSections.operations;
    const facts = factsOverride || firstMatchInterfaceFacts();
    if (!facts.active) return { state: 'ready', locked: false, label: 'OPEN', reason: '', available: 0, total: 0 };
    const featureRoutes = (section.routes || []).filter(route => !route.overview && !route.contextOnly);
    const routeStates = featureRoutes.map(route => ({ route, access: progressiveRouteAccess(route.id, facts) }));
    const available = routeStates.filter(item => !item.access.locked).length;
    const lockedItems = routeStates.filter(item => item.access.locked);
    if (!lockedItems.length) return { state: 'ready', locked: false, label: 'OPEN', reason: '', available, total: featureRoutes.length, lockedRoutes: [] };
    const state = available ? 'partial' : 'locked';
    return {
      state,
      locked: state === 'locked',
      label: state === 'locked' ? 'FEATURES LOCKED' : `${available}/${featureRoutes.length} OPEN`,
      reason: lockedItems[0]?.access.reason || 'Complete the next objective to unlock more club systems.',
      available,
      total: featureRoutes.length,
      lockedRoutes: lockedItems.map(item => ({ id: item.route.id, label: item.route.label, ...item.access }))
    };
  }

  function progressiveLockedRouteMessage(routeId) {
    const access = progressiveRouteAccess(routeId);
    if (!access.locked) return false;
    const route = menuRouteDefinition(routeId);
    showStatus(`LOCKED · ${route?.label || 'FEATURE'} · ${access.reason}`);
    return true;
  }

  function renderProgressiveSectionGate(sectionId) {
    const sectionAccess = progressiveSectionAccess(sectionId);
    if (sectionAccess.state === 'ready') return '';
    const section = menuSections[sectionId] || menuSections.operations;
    const lockedNames = sectionAccess.lockedRoutes.slice(0, 5).map(item => `<span><i aria-hidden="true"></i>${escapeCareerHtml(item.label)}</span>`).join('');
    const extra = Math.max(0, sectionAccess.lockedRoutes.length - 5);
    return `<section class="progressive-section-gate ${escapeCareerHtml(sectionAccess.state)}"><div class="progressive-section-lock" aria-hidden="true"><i></i></div><div><span>OPENING WEEK ACCESS</span><strong>${escapeCareerHtml(section.label)} UNLOCKS IN STAGES</strong><p>${escapeCareerHtml(sectionAccess.reason)}</p><div class="progressive-section-locked-list">${lockedNames}${extra ? `<span>+${extra} MORE</span>` : ''}</div></div><b>${escapeCareerHtml(sectionAccess.label)}</b></section>`;
  }

  function menuPriorityItems() {
    if (!careerState.created) return [{ kind: 'required', label: 'CREATE YOUR CLUB', detail: 'Name the club, choose an identity and begin the guided foundation setup.', route: 'play' }];
    const items = [];
    const add = (kind, route, label, detail, leagueAction = null) => {
      if (!route || items.some(item => item.route === route && item.leagueAction === leagueAction)) return;
      items.push({ kind, route, label, detail, leagueAction });
    };
    const blockers = typeof clubEndDayBlockers === 'function' ? clubEndDayBlockers() : [];
    blockers.slice(0, 2).forEach(blocker => {
      const isMatchday = blocker.id === 'matchday';
      const ready = careerSquadReady() && typeof clubMatchPlanConfirmed === 'function' && clubMatchPlanConfirmed();
      add('required', isMatchday && ready ? 'play' : (blocker.route || 'mail'), isMatchday && !ready ? 'COMPLETE MATCHDAY PREPARATION' : blocker.label, isMatchday && !ready ? 'Confirm the line-up, roles and tactical plan before today’s fixture can begin.' : blocker.detail, isMatchday && ready ? 'play-league' : null);
    });
    const squad = Array.isArray(careerState.squad) ? careerState.squad : [];
    if (squad.length < TEAM_REQUIRED_STARTERS) add('required', 'market', 'COMPLETE THE ACTIVE OPERATOR LINE-UP', `${TEAM_REQUIRED_STARTERS - squad.length} more operator${TEAM_REQUIRED_STARTERS - squad.length === 1 ? '' : 's'} required for deployment.`);
    const recommended = typeof commandRecommendedRoutes === 'function' ? commandRecommendedRoutes() : [];
    recommended.forEach((item, index) => add(index === 0 && !items.length ? 'recommended' : 'optional', item.route, item.label, item.reason));
    if (!items.length) add('recommended', 'calendar', 'REVIEW THE CLUB CALENDAR', 'No urgent decision is blocking progress. Check upcoming events, then use End Day when ready.');
    return items.slice(0, 3);
  }

  function renderMenuPriorityStrip() {
    if (!careerState.created) return '';
    const guidance = firstMatchGuidance();
    const items = menuPriorityItems();
    const primary = guidance ? { kind: 'required', ...guidance } : items[0];
    if (!primary) return '';
    const actionAttribute = primary.playerId
      ? `data-team-profile="${escapeCareerHtml(primary.playerId)}"`
      : primary.leagueAction
        ? `data-league-action="${escapeCareerHtml(primary.leagueAction)}"`
        : `data-team-route="${escapeCareerHtml(primary.route)}"`;
    const secondaryCase = value => {
      const text = String(value || '').trim().toLowerCase();
      return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : '';
    };
    const milestoneLabel = guidance ? secondaryCase(guidance.milestoneLabel) : '';
    const kicker = guidance ? `First match journey · ${guidance.milestoneIndex + 1}/${guidance.milestoneTotal} · ${milestoneLabel}` : (primary.kind === 'required' ? 'Required action' : primary.kind === 'recommended' ? 'Recommended next' : 'Next opportunity');
    const progress = guidance ? `<div class="first-match-progress" aria-label="First match journey progress ${guidance.milestoneIndex + 1} of ${guidance.milestoneTotal}"><i style="width:${Math.round(guidance.journeyProgress * 100)}%"></i></div>${guidance.milestoneStepTotal > 1 ? `<em class="first-match-milestone-step">Step ${guidance.milestoneStep} of ${guidance.milestoneStepTotal} in this milestone</em>` : ''}` : '';
    const scrollAttribute = guidance?.scrollTarget ? ` data-team-scroll-target="${escapeCareerHtml(guidance.scrollTarget)}"` : '';
    const guideCollapsed = Boolean(guidance && mobileFirstMatchGuideCollapsed);
    const guideToggle = guidance ? `<button type="button" class="first-match-guide-toggle" data-first-match-guide-toggle aria-expanded="${guideCollapsed ? 'false' : 'true'}" aria-label="${guideCollapsed ? 'Expand' : 'Collapse'} first match guide" title="${guideCollapsed ? 'Expand' : 'Collapse'} first match guide"><span class="first-match-guide-summary"><b>First match ${guidance.milestoneIndex + 1}/${guidance.milestoneTotal}</b><strong>${escapeCareerHtml(primary.label)}</strong><em>${guidance.milestoneStepTotal > 1 ? `Step ${guidance.milestoneStep}/${guidance.milestoneStepTotal}` : escapeCareerHtml(milestoneLabel)}</em></span><i aria-hidden="true"></i></button>` : '';
    return `<section class="management-priority-strip ${escapeCareerHtml(primary.kind)} ${guidance ? 'first-match-guide' : ''} ${guideCollapsed ? 'is-collapsed' : ''}"><div class="management-priority-main"><span>${escapeCareerHtml(kicker)}</span><strong>${escapeCareerHtml(primary.label)}</strong><small>${escapeCareerHtml(primary.detail)}</small>${progress}</div><button type="button" class="management-priority-action" ${actionAttribute}${scrollAttribute}>${escapeCareerHtml(primary.action || 'OPEN')}</button>${guideToggle}${!guidance && items.length > 1 ? `<details><summary>View plan</summary><div>${items.slice(1).map(item => `<button type="button" ${item.leagueAction ? `data-league-action="${escapeCareerHtml(item.leagueAction)}"` : `data-team-route="${escapeCareerHtml(item.route)}"`}><span>${escapeCareerHtml(secondaryCase(item.kind))}</span><strong>${escapeCareerHtml(item.label)}</strong><small>${escapeCareerHtml(item.detail)}</small></button>`).join('')}</div></details>` : ''}</section>`;
  }

  function renderSectionHub(sectionId) {
    const section = menuSections[sectionId] || menuSections.operations;
    if (!careerState.created) return `${renderTeamTutorialPanel()}<div class="team-empty-state"><strong>CREATE YOUR TEAM FIRST</strong><p>${escapeCareerHtml(section.description || 'Create a club to unlock this section.')}</p><button class="primary" data-team-route="play">OPEN TEAM CREATION</button></div>`;
    const metrics = sectionHubMetrics(sectionId);
    const routes = (section.routes || []).filter(route => !route.overview && !route.contextOnly);
    const recent = menuRecentRouteIds(4).filter(id => menuSectionForRoute(id) === sectionId);
    const priorityCards = sectionHubPriorityCards(sectionId);
    return `<section class="section-hub-hero"><div><span>${escapeCareerHtml(section.label)} SECTION</span><h2>${escapeCareerHtml(section.label)} OVERVIEW</h2><p>${escapeCareerHtml(section.description || '')}</p></div><button type="button" data-team-route="play">COMMAND CENTRE</button></section>
      ${renderProgressiveSectionGate(sectionId)}
      <div class="section-hub-metrics">${metrics.map(([label, value, meta]) => `<article><span>${escapeCareerHtml(String(label))}</span><strong>${escapeCareerHtml(String(value))}</strong><small>${escapeCareerHtml(String(meta))}</small></article>`).join('')}</div>
      ${sectionId === 'career' ? renderFoundationPath() : ''}
      <section class="section-hub-priorities"><div class="career-section-head compact"><div><span>LIVE SECTION STATUS</span><strong>WHAT NEEDS ATTENTION</strong></div><p>Each card shows one useful conclusion and one direct action. Open the full page only when you need the detail.</p></div><div>${priorityCards.map(card => `<article class="section-priority-card ${escapeCareerHtml(card.tone)}"><header><span>${escapeCareerHtml(card.kicker)}</span><b>${escapeCareerHtml(String(card.value))}</b></header><strong>${escapeCareerHtml(card.title)}</strong><p>${escapeCareerHtml(card.detail)}</p><button type="button" data-team-route="${escapeCareerHtml(card.route)}">${escapeCareerHtml(card.action)}</button></article>`).join('')}</div></section>
      <details class="section-hub-pages"><summary><span>ALL ${escapeCareerHtml(section.label)} PAGES</span><strong>${routes.length} DESTINATION${routes.length === 1 ? '' : 'S'}</strong><i>›</i></summary><div class="section-hub-route-list">${routes.map(route => {
        const signal = menuRouteNotification(route.id);
        const availability = typeof commandFeatureAvailability === 'function' ? commandFeatureAvailability(route.id) : { state: 'ready', label: 'OPEN', reason: '' };
        return `<button class="section-hub-route ${escapeCareerHtml(availability.state || 'ready')}" data-team-route="${escapeCareerHtml(route.id)}" ${availability.state === 'locked' ? 'disabled' : ''}><span><strong>${escapeCareerHtml(route.label)}</strong><small>${escapeCareerHtml(route.hint)}</small>${availability.reason ? `<em>${escapeCareerHtml(availability.reason)}</em>` : ''}</span><b>${signal.count ? `${signal.count > 99 ? '99+' : signal.count} ${escapeCareerHtml(signal.label).toUpperCase()}` : escapeCareerHtml(availability.label || (typeof commandFeatureStatus === 'function' ? commandFeatureStatus(route.id) : 'OPEN'))}</b><i aria-hidden="true">›</i></button>`;
      }).join('')}</div></details>
      ${recent.length ? `<section class="section-hub-recent"><span>RECENT IN THIS SECTION</span><div>${recent.map(id => { const route = menuRouteDefinition(id); return `<button data-team-route="${escapeCareerHtml(id)}">${escapeCareerHtml(route?.label || id)}</button>`; }).join('')}</div></section>` : ''}`;
  }

  function handleMenuRouteLocatorClick(event) {
    const button = event.target.closest?.('[data-menu-section-jump]');
    if (!button) return false;
    setMenuSection(button.dataset.menuSectionJump || 'operations');
    return true;
  }

  const MENU_CONTEXT_TUTORIALS = Object.freeze({
    calendar: {
      title: 'READING THE CLUB CALENDAR',
      body: 'Move between months with the arrow controls, use TODAY to return to the active club date and review the agenda below for full event detail.',
      points: ['FIXTURES & DEADLINES', 'EVENTS OPEN THEIR ROUTE']
    },
    tactics: {
      title: 'BUILDING A MATCH PLAN',
      body: 'Plan Fit combines the five active operators, assigned roles, familiarity, readiness and opponent style. Confirm the plan before deployment so the captured setup reaches the live match.',
      points: ['COMPARE FIT BEFORE SELECTING', 'CONFIRM TO LOCK MATCHDAY PLAN']
    },
    transfers: {
      title: 'MANAGING NEGOTIATIONS',
      body: 'Incoming and outgoing offers can expire or block End Day when a response is required. Check fee, wage, contract and squad capacity before committing.',
      points: ['WATCH EXPIRY DATES', 'COUNTERS CAN CHANGE TERMS']
    },
    training: {
      title: 'TURNING XP INTO DEVELOPMENT',
      body: 'XP is progress, not spending money. Player XP levels individual operators and awards Stat Points; Team XP levels the club and awards Team Points. Daily training focus is a separate gradual process advanced by End Day.',
      points: ['PLAYER XP → STAT POINTS', 'TEAM XP → TEAM POINTS']
    },
    barracks: {
      title: 'READING CLUB FINANCES',
      body: 'This page is the detailed Club Cash account. Use the cashflow and running-balance charts to check whether match, sponsor and transfer income can cover payroll, purchases and the next foundation-loan collection.',
      points: ['WAGE BUDGET IS A LIMIT', 'PAYROLL STILL LEAVES CLUB CASH']
    },
    gold: {
      title: 'READING THE GOLD COIN ACCOUNT',
      body: 'This ledger shows the participation, rounds-won, victory, sweep and multi-kill parts of each Gold Coin award. Gold Coins remain restricted to Tactical Field Crates in the Supply Depot.',
      points: ['REVIEW THE AWARD FORMULA', 'TRACK CRATE SPENDING']
    },
    store: {
      title: 'TWO WAYS TO BUY SUPPLIES',
      body: 'Club Cash buys the named weapon or armour copy shown on a store card. Gold Coins buy a random Tactical Field Crate. A victory Match Crate is a free reward and does not consume either balance.',
      points: ['CASH → NAMED EQUIPMENT', 'GOLD COINS → RANDOM CRATE']
    },
    infrastructure: {
      title: 'FACILITIES CREATE A PERMANENT CLUB IDENTITY',
      body: 'Each completed level consumes one permanent capacity slot and cannot be refunded. Only one project can be built at a time, so improve the systems that best match the club you want to create.',
      points: ['ONE PROJECT AT A TIME', 'NO REFUNDS OR RESPECS']
    },
    commercial: {
      title: 'SPONSOR TERMS AFFECT FUTURE INCOME',
      body: 'Compare signing payments, weekly income, match bonuses, duration and objectives before accepting. Pending decisions can become End Day blockers.',
      points: ['CHECK OBJECTIVES', 'ACTIVE DEALS FEED THE LEDGER']
    },
    loadout: {
      title: 'EQUIP THE RIGHT OPERATOR',
      body: 'Choose a player first, then issue one owned weapon and one owned armour copy. Armour protects torso hits, headshots bypass it, penetration reduces its effect, and a copy that reaches zero integrity is permanently discarded.',
      points: ['ONE COPY PROTECTS ONE PLAYER', 'HEAVIER ARMOUR COSTS MOBILITY']
    },
    staff: {
      title: 'STAFF CHANGE WHAT YOU KNOW AND DELEGATE',
      body: 'The Assistant Manager supports management workflows, while the Opposition Scout develops increasingly detailed reports on the next rival. Better staff improve information and execution support without applying hidden combat bonuses.',
      points: ['COMPARE APPOINTMENT FEES & WAGES', 'SCOUT REPORTS DEVELOP OVER CLUB DAYS']
    },
    supporters: {
      title: 'SUPPORTERS JUDGE RESULTS IN CONTEXT',
      body: 'Season expectations, public team strength and club decisions shape confidence, popularity and long-term fan growth. Reactions are gradual and reflect whether results, signings and sponsorships match the club’s circumstances.',
      points: ['CHECK THE SEASON EXPECTATION', 'FOLLOW REACTION & FANBASE TRENDS']
    },
    reports: {
      title: 'TURN THE LAST MATCH INTO A DECISION',
      body: 'The After Action report explains what worked, the biggest issue and the next useful adjustment. Export Diagnostics downloads the most recently completed match report for troubleshooting, even after returning from the spectator view.',
      points: ['READ THE THREE CONCLUSIONS FIRST', 'EXPORT THE COMPLETED MATCH WHEN NEEDED']
    }
  });

  function renderMenuContextTutorial(route = menuTab) {
    const item = MENU_CONTEXT_TUTORIALS[route];
    if (!item || !careerState.created) return '';
    // Do not stack a one-time section tutorial on top of the authoritative
    // First Match Guide. It becomes eligible after the opening journey ends.
    if (typeof firstMatchGuidance === 'function' && firstMatchGuidance()) return '';
    const tutorial = careerState.tutorial || {};
    if (!tutorial.completed && !tutorial.dismissed) return '';
    if (tutorial.contextSeen?.[route]) return '';
    const points = (item.points || []).map(point => `<span>${escapeCareerHtml(point)}</span>`).join('');
    return `<section class="menu-context-tutorial" data-context-tutorial="${escapeCareerHtml(route)}">
      <div class="menu-context-tutorial-mark" aria-hidden="true">?</div>
      <div class="menu-context-tutorial-copy"><span>ONE-TIME SECTION GUIDE</span><strong>${escapeCareerHtml(item.title)}</strong><p>${escapeCareerHtml(item.body)}</p><div>${points}</div></div>
      <button type="button" data-context-tutorial-dismiss="${escapeCareerHtml(route)}">GOT IT</button>
    </section>`;
  }

  function dismissMenuContextTutorial(route) {
    if (!MENU_CONTEXT_TUTORIALS[route] || !careerState.created) return false;
    careerState.tutorial = careerState.tutorial && typeof careerState.tutorial === 'object' ? careerState.tutorial : makeDefaultCareerTutorialState();
    careerState.tutorial.contextSeen = careerState.tutorial.contextSeen && typeof careerState.tutorial.contextSeen === 'object' && !Array.isArray(careerState.tutorial.contextSeen) ? careerState.tutorial.contextSeen : {};
    careerState.tutorial.contextSeen[route] = true;
    saveCareerState();
    updateMenuUI();
    return true;
  }

  function handleMenuContextTutorialClick(event) {
    const button = event.target.closest?.('[data-context-tutorial-dismiss]');
    if (!button) return false;
    dismissMenuContextTutorial(String(button.dataset.contextTutorialDismiss || ''));
    return true;
  }

  const MENU_HISTORY_LIMIT = 36;
  let menuNavigationHistory = [];
  let menuNavigationIndex = -1;

  function menuHistoryScroller() {
    // The scrolling element differs by presentation target: the desktop Command
    // Centre scrolls the `.menu-content` section, while the compact interface
    // scrolls `#menuContent` inside it. Returning the section unconditionally
    // made guided scroll targets and history restore no-ops below 1024px, so
    // prefer whichever element can actually scroll.
    const section = menuContentEl?.closest('.menu-content') || null;
    if (menuContentEl && menuContentEl.scrollHeight - menuContentEl.clientHeight > 1) return menuContentEl;
    if (section && section.scrollHeight - section.clientHeight > 1) return section;
    return section || menuContentEl || null;
  }

  function menuHistorySnapshot(route = menuTab) {
    return {
      route,
      playerId: selectedTeamPlayerId || careerState.selectedPlayerId || null,
      mailId: careerState.selectedMailId || null,
      offerId: careerState.transfers?.selectedOfferId || null,
      scrollTop: Math.max(0, Math.round(menuHistoryScroller()?.scrollTop || 0))
    };
  }

  function menuHistoryKey(entry) {
    return [entry?.route || '', entry?.playerId || '', entry?.mailId || '', entry?.offerId || ''].join('|');
  }

  function saveCurrentMenuHistoryState() {
    if (menuNavigationIndex < 0 || !menuNavigationHistory[menuNavigationIndex]) return;
    menuNavigationHistory[menuNavigationIndex] = {
      ...menuNavigationHistory[menuNavigationIndex],
      ...menuHistorySnapshot(menuNavigationHistory[menuNavigationIndex].route)
    };
  }

  function reachableMenuHistoryIndex(direction) {
    const step = direction < 0 ? -1 : 1;
    for (let index = menuNavigationIndex + step; index >= 0 && index < menuNavigationHistory.length; index += step) {
      const entry = menuNavigationHistory[index];
      if (entry && menuTabMeta[entry.route] && !progressiveLockedRouteMessage(entry.route)) return index;
    }
    return -1;
  }

  function syncMenuHistoryControls() {
    const backIndex = reachableMenuHistoryIndex(-1);
    const forwardIndex = reachableMenuHistoryIndex(1);
    const canBack = backIndex >= 0;
    const canForward = forwardIndex >= 0;
    if (menuBackBtn) {
      menuBackBtn.disabled = !canBack;
      const target = canBack ? menuNavigationHistory[backIndex] : null;
      const label = target ? (menuTabMeta[target.route]?.title || target.route) : 'previous page';
      menuBackBtn.setAttribute('aria-label', canBack ? `Go back to ${label}` : 'No previous available page');
      menuBackBtn.title = canBack ? `Back · ${label}` : 'No previous available page';
    }
    if (menuForwardBtn) {
      menuForwardBtn.disabled = !canForward;
      const target = canForward ? menuNavigationHistory[forwardIndex] : null;
      const label = target ? (menuTabMeta[target.route]?.title || target.route) : 'next page';
      menuForwardBtn.setAttribute('aria-label', canForward ? `Go forward to ${label}` : 'No next available page');
      menuForwardBtn.title = canForward ? `Forward · ${label}` : 'No next available page';
    }
  }

  function resetMenuNavigationHistory(route = menuTab) {
    menuNavigationHistory = [menuHistorySnapshot(route)];
    menuNavigationIndex = 0;
    syncMenuHistoryControls();
  }

  function pushMenuNavigationHistory(route = menuTab) {
    const entry = menuHistorySnapshot(route);
    if (menuNavigationIndex < 0) {
      menuNavigationHistory = [entry];
      menuNavigationIndex = 0;
      syncMenuHistoryControls();
      return;
    }
    const current = menuNavigationHistory[menuNavigationIndex];
    if (menuHistoryKey(current) === menuHistoryKey(entry)) {
      menuNavigationHistory[menuNavigationIndex] = { ...current, ...entry, scrollTop: 0 };
      syncMenuHistoryControls();
      return;
    }
    menuNavigationHistory = menuNavigationHistory.slice(0, menuNavigationIndex + 1);
    menuNavigationHistory.push({ ...entry, scrollTop: 0 });
    if (menuNavigationHistory.length > MENU_HISTORY_LIMIT) menuNavigationHistory.shift();
    menuNavigationIndex = menuNavigationHistory.length - 1;
    syncMenuHistoryControls();
  }

  function applyMenuNavigationHistory(index, options = {}) {
    if (typeof workflowGuardHistoryChange === 'function' && workflowGuardHistoryChange(index, options)) return false;
    const nextIndex = clamp(Math.round(Number(index) || 0), 0, Math.max(0, menuNavigationHistory.length - 1));
    const entry = menuNavigationHistory[nextIndex];
    if (!entry || !menuTabMeta[entry.route]) return false;
    if (!options.ignoreProgressiveLock && progressiveLockedRouteMessage(entry.route)) return false;
    saveCurrentMenuHistoryState();
    menuNavigationIndex = nextIndex;
    if (entry.playerId) {
      selectedTeamPlayerId = entry.playerId;
      careerState.selectedPlayerId = entry.playerId;
    }
    if (entry.mailId) careerState.selectedMailId = entry.mailId;
    if (careerState.transfers && entry.offerId) careerState.transfers.selectedOfferId = entry.offerId;
    menuTab = entry.route;
    if (menuContext === 'pause' && menuSectionForRoute(entry.route) === 'operations') lastLiveMenuTab = entry.route;
    noteTeamManagementRoute(entry.route);
    updateMenuUI();
    requestAnimationFrame(() => {
      const scroller = menuHistoryScroller();
      if (scroller) scroller.scrollTop = Math.max(0, Number(entry.scrollTop) || 0);
    });
    syncMenuHistoryControls();
    return true;
  }

  function navigateMenuHistory(direction) {
    const target = reachableMenuHistoryIndex(direction);
    if (target < 0) return false;
    return applyMenuNavigationHistory(target);
  }

  const MATCHMAKING_STAGE_DATA = [
    { at: 0, label: 'SEARCHING NETWORK', detail: 'Evaluating available tactical servers', title: 'FINDING TACTICAL LOBBY' },
    { at: 1.15, label: 'SERVER RESERVED', detail: 'Selected arena simulation node allocated', title: 'SERVER CONNECTION ESTABLISHED' },
    { at: 2.25, label: 'ASSEMBLING ROSTER', detail: 'Synchronising ten autonomous operators', title: 'BUILDING PROVISIONAL LOBBY' },
    { at: 3.45, label: 'READY CHECK', detail: 'Validating loadouts and operator profiles', title: 'CONFIRMING PARTICIPANTS' },
    { at: 4.85, label: 'DEPLOYMENT LOCKED', detail: 'All operators ready for insertion', title: 'MATCH FOUND' }
  ];
  const MATCHMAKING_TOTAL_TIME = 7.85;
  let matchmakingState = {
    active: false,
    elapsed: 0,
    stage: 0,
    lastRosterKey: '',
    serverCode: '',
    ping: 24
  };
  let deploymentSelectionState = {
    active: false,
    selectedArenaId: 'citadel'
  };

  function matchmakingStageAt(elapsed) {
    let stage = 0;
    for (let i = 1; i < MATCHMAKING_STAGE_DATA.length; i++) {
      if (elapsed >= MATCHMAKING_STAGE_DATA[i].at) stage = i;
    }
    return stage;
  }

  function matchmakingRosterSource(team) {
    const existing = bots.filter(bot => bot.team === team).slice(0, 5);
    return Array.from({ length: 5 }, (_, slot) => {
      const squadPlayer = team === TEAM_BLUE
        ? careerMatchPlayerForSlot(slot)
        : (typeof leagueOpponentPlayerForSlot === 'function' ? leagueOpponentPlayerForSlot(slot) : null);
      const bot = existing[slot];
      const club = matchTeamIdentity(team);
      const name = squadPlayer?.name || bot?.name || `${club.short} ${String(slot + 1).padStart(2, '0')}`;
      const weaponId = squadPlayer ? careerPlayerActiveWeaponId(squadPlayer) : (bot?.primaryWeapon?.id || bot?.weapon?.id);
      const weaponProfile = squadPlayer ? getCareerWeapon(weaponId) : (bot?.primaryWeapon || bot?.weapon || getCareerWeapon('scrap-p12'));
      const sidearmProfile = squadPlayer ? getCareerWeapon(careerPlayerSidearmId(squadPlayer)) : (bot?.secondaryWeapon || getCareerWeapon('scrap-p12'));
      const weapon = squadPlayer && careerPlayerPrimaryWeaponId(squadPlayer) ? `${weaponProfile.name} + ${sidearmProfile.name}` : (weaponProfile.name || 'P12 SCRAPLINE');
      const presentation = careerWeaponPresentation(weaponProfile);
      const condition = squadPlayer ? `${squadPlayer.fatigue}% FAT · ${teamReadinessScore(squadPlayer)} READY` : '';
      return { name, weapon, weaponId: weaponProfile.id, weaponSummary: presentation.summary, condition, slot, player: squadPlayer || null };
    });
  }

  function matchmakingReadyCount(team, stage, elapsed) {
    if (stage < 3) return 0;
    if (stage >= 4) return 5;
    const local = Math.max(0, elapsed - MATCHMAKING_STAGE_DATA[3].at);
    const offset = team === TEAM_BLUE ? 0.02 : 0.13;
    return clamp(Math.floor((local + offset) / 0.22), 0, 5);
  }

  function renderMatchmakingRoster(team, stage, elapsed) {
    const roster = matchmakingRosterSource(team);
    const foundCount = stage <= 0 ? 0 : (stage === 1 ? 2 : 5);
    const readyCount = matchmakingReadyCount(team, stage, elapsed);
    return roster.map((member, index) => {
      const found = index < foundCount;
      const ready = index < readyCount;
      const ping = matchmakingState.ping + member.slot * 3 + (team === TEAM_RED ? 4 : 0);
      return `
        <div class="matchmaking-roster-row ${found ? 'found' : 'searching'} ${ready ? 'ready' : ''}">
          <span class="matchmaking-slot">${String(index + 1).padStart(2, '0')}</span>
          <div><strong>${found ? escapeCareerHtml(member.name) : 'SEARCHING…'}</strong><small>${found ? `${escapeCareerHtml(member.weapon)} · ${escapeCareerHtml(member.weaponSummary)}${member.condition ? ` · ${escapeCareerHtml(member.condition)}` : ''}` : 'OPEN NETWORK SLOT'}</small></div>
          <span class="matchmaking-ping">${found ? `${ping} MS` : '—'}</span>
          <b>${ready ? 'READY' : (found ? (stage >= 3 ? 'CHECKING' : 'CONNECTED') : 'OPEN')}</b>
        </div>`;
    }).join('');
  }

  function updateMatchmakingUI(force = false) {
    if (!matchmakingState.active || !matchmakingOverlayEl) return;
    const elapsed = matchmakingState.elapsed;
    const stage = matchmakingStageAt(elapsed);
    matchmakingState.stage = stage;
    const data = MATCHMAKING_STAGE_DATA[stage];
    const queueSeconds = Math.max(0, Math.floor(elapsed));
    const progress = clamp(elapsed / MATCHMAKING_TOTAL_TIME, 0, 1);
    const blueReady = matchmakingReadyCount(TEAM_BLUE, stage, elapsed);
    const redReady = matchmakingReadyCount(TEAM_RED, stage, elapsed);
    const rosterKey = `${stage}:${blueReady}:${redReady}`;

    const blueClub = matchTeamIdentity(TEAM_BLUE);
    const redClub = matchTeamIdentity(TEAM_RED);
    if (matchmakingBlueNameEl) matchmakingBlueNameEl.textContent = `${blueClub.side} · ${blueClub.name}`;
    if (matchmakingRedNameEl) matchmakingRedNameEl.textContent = `${redClub.side} · ${redClub.name}`;

    if (matchmakingTitleEl) matchmakingTitleEl.textContent = data.title;
    if (matchmakingSubtitleEl) {
      const competition = typeof leagueMatchmakingTitle === 'function' ? leagueMatchmakingTitle() : null;
      const arena = arenaMeta(matchmakingState.arenaId || activeArenaMeta().id);
      matchmakingSubtitleEl.textContent = stage >= 4
        ? `${competition ? `${competition}. ` : ''}Preparing the live spectator link for ${arena.name}.`
        : (competition ? `${competition}. ` : '') + `Searching for a balanced ${arena.name.toLowerCase()} session.`;
    }
    if (matchmakingQueueTimeEl) matchmakingQueueTimeEl.textContent = `00:${String(queueSeconds).padStart(2, '0')}`;
    if (matchmakingRegionEl) matchmakingRegionEl.textContent = `EU WEST · ${matchmakingState.ping} MS`;
    if (matchmakingPhaseLabelEl) matchmakingPhaseLabelEl.textContent = data.label;
    if (matchmakingPhaseDetailEl) matchmakingPhaseDetailEl.textContent = data.detail;
    if (matchmakingEstimateEl) matchmakingEstimateEl.textContent = stage >= 4 ? 'SESSION LOCKED · DEPLOYMENT IMMINENT' : 'ESTIMATED WAIT · UNDER 10 SECONDS';
    if (matchmakingLobbyCodeEl) matchmakingLobbyCodeEl.textContent = stage >= 1 ? matchmakingState.serverCode : 'ALLOCATING…';
    if (matchmakingMapNameEl) matchmakingMapNameEl.textContent = arenaMeta(matchmakingState.arenaId || activeArenaMeta().id).name;
    if (matchmakingProgressBarEl) matchmakingProgressBarEl.style.width = `${Math.round(progress * 100)}%`;
    if (matchmakingCountdownEl) {
      if (stage >= 4) matchmakingCountdownEl.textContent = `DEPLOYING IN ${Math.max(1, Math.ceil(MATCHMAKING_TOTAL_TIME - elapsed))}`;
      else matchmakingCountdownEl.textContent = `${Math.round(progress * 100)}% MATCHED`;
    }
    if (matchmakingCancelBtn) {
      matchmakingCancelBtn.disabled = stage >= 4;
      matchmakingCancelBtn.textContent = stage >= 4 ? 'SESSION LOCKED' : 'CANCEL SEARCH';
    }
    if (matchmakingStagesEl) {
      matchmakingStagesEl.querySelectorAll('[data-matchmaking-stage]').forEach(node => {
        const index = Number(node.dataset.matchmakingStage) || 0;
        node.classList.toggle('active', index === stage);
        node.classList.toggle('complete', index < stage);
      });
    }
    if (force || rosterKey !== matchmakingState.lastRosterKey) {
      matchmakingState.lastRosterKey = rosterKey;
      if (matchmakingBlueRosterEl) matchmakingBlueRosterEl.innerHTML = renderMatchmakingRoster(TEAM_BLUE, stage, elapsed);
      if (matchmakingRedRosterEl) matchmakingRedRosterEl.innerHTML = renderMatchmakingRoster(TEAM_RED, stage, elapsed);
      if (matchmakingBlueReadyEl) matchmakingBlueReadyEl.textContent = `${blueReady} / 5 READY`;
      if (matchmakingRedReadyEl) matchmakingRedReadyEl.textContent = `${redReady} / 5 READY`;
    }
  }

  function deploymentRosterMarkup() {
    const roster = matchmakingRosterSource(TEAM_BLUE);
    return roster.map((member, index) => {
      const player = member.player;
      const role = player ? clubMatchRoleForPlayer(player) : teamRoleById('flex');
      const weapon = getCareerWeapon(member.weaponId);
      const presentation = careerWeaponPresentation(weapon);
      const portrait = player && typeof teamPlayerVisualMarkup === 'function'
        ? teamPlayerVisualMarkup(player, role)
        : `<i class="deployment-role-glyph role-${escapeCareerHtml(role.id || 'flex')}" aria-hidden="true"><b></b><em></em></i>`;
      return `<article class="deployment-operator-row"><span>${String(index + 1).padStart(2, '0')}</span>${portrait}<div><strong>${escapeCareerHtml(member.name)}</strong><small>${escapeCareerHtml(role.name)} · ${escapeCareerHtml(weapon.name)}</small></div><div><b>${escapeCareerHtml(presentation.rangeBand)}</b><small>${escapeCareerHtml(presentation.recoilLabel)} · ${escapeCareerHtml(presentation.reloadLabel)}</small></div></article>`;
    }).join('');
  }

  function deploymentTacticalPreviewMarkup(plan, arena) {
    if (!plan || typeof clubTacticalPreviewSnapshot !== 'function') return '';
    const preview = clubTacticalPreviewSnapshot(plan, arena.id);
    const laneRows = preview.rows.map((row, index) => `<article class="deployment-lane-row role-${escapeCareerHtml(row.roleId || 'flex')}">
      <span>${String(index + 1).padStart(2, '0')}</span>
      <div><strong>${escapeCareerHtml(row.playerName || `OPERATOR ${index + 1}`)}</strong><small>${escapeCareerHtml(row.roleName || 'FLEX')} · ${escapeCareerHtml(row.weaponName || '')}</small></div>
      <div><b>${escapeCareerHtml(row.zone || 'TRANSIT')}</b><small>${escapeCareerHtml(row.rangeBand || '')}</small></div>
    </article>`).join('');
    const warnings = preview.warnings.map(item => `<article class="deployment-plan-warning ${escapeCareerHtml(item.tone || 'warning')}"><span>${escapeCareerHtml(item.title)}</span><p>${escapeCareerHtml(item.detail)}</p></article>`).join('');
    return `<section class="deployment-tactical-preview">
      <header><div><span>FIRST-ROUND TACTICAL PREVIEW</span><strong>${escapeCareerHtml(preview.openingPlanName)}</strong><small>The numbered routes on the selected map are the actual opening objectives assigned for round one. Later rounds can vary or be changed between rounds.</small></div><b>${escapeCareerHtml(preview.openingZone)}</b></header>
      <div class="deployment-preview-legend"><span><i class="entry"></i>ENTRY / FLEX</span><span><i class="support"></i>SUPPORT</span><span><i class="flanker"></i>FLANKER</span><span><i class="contact"></i>LIKELY CONTACT</span></div>
      <div class="deployment-lane-grid">${laneRows}</div>
      <div class="deployment-plan-warnings">${warnings}</div>
    </section>`;
  }

  const careerMatchIntroState = { active: false };

  function careerMatchIntroRosterMarkup(team) {
    return matchmakingRosterSource(team).map((member, index) => {
      const player = member.player;
      const role = player ? (team === TEAM_BLUE ? clubMatchRoleForPlayer(player) : teamRoleById(player.role)) : teamRoleById('flex');
      const visual = player && typeof teamPlayerVisualMarkup === 'function'
        ? teamPlayerVisualMarkup(player, role)
        : `<i class="career-match-intro-role role-${escapeCareerHtml(role.id || 'flex')}" aria-hidden="true"></i>`;
      return `<article class="career-match-intro-operator">${visual}<span><strong>${escapeCareerHtml(member.name)}</strong><small>${escapeCareerHtml(role.name)} · ${escapeCareerHtml(member.weapon)}</small></span><b>${String(index + 1).padStart(2, '0')}</b></article>`;
    }).join('');
  }

  function careerMatchIntroActive() {
    return Boolean(careerMatchIntroState.active && careerMatchIntroEl && !careerMatchIntroEl.hidden);
  }

  function showCareerMatchIntro() {
    if (!careerMatchIntroEl || newPlayerDemoState.active) return false;
    if (careerMatchIntroEl.parentElement !== document.body) document.body.appendChild(careerMatchIntroEl);
    const blueClub = matchTeamIdentity(TEAM_BLUE);
    const redClub = matchTeamIdentity(TEAM_RED);
    const arena = activeArenaMeta();
    const plan = typeof clubActiveMatchPlan === 'function' ? clubActiveMatchPlan() : null;
    const competition = matchCompetitionLabel();
    careerMatchIntroState.active = true;
    careerMatchIntroEl.hidden = false;
    careerMatchIntroEl.setAttribute('aria-hidden', 'false');
    if (careerMatchIntroKickerEl) careerMatchIntroKickerEl.textContent = `${competition} · FIRST TO ${matchTarget}`;
    if (careerMatchIntroTitleEl) careerMatchIntroTitleEl.textContent = `${blueClub.name.toUpperCase()} VS ${redClub.name.toUpperCase()}`;
    if (careerMatchIntroMapEl) careerMatchIntroMapEl.textContent = `${arena.name.toUpperCase()} · TACTICAL ELIMINATION · NO RESPAWNS`;
    if (careerMatchIntroBlueNameEl) careerMatchIntroBlueNameEl.textContent = blueClub.name;
    if (careerMatchIntroRedNameEl) careerMatchIntroRedNameEl.textContent = redClub.name;
    if (careerMatchIntroBlueRosterEl) careerMatchIntroBlueRosterEl.innerHTML = careerMatchIntroRosterMarkup(TEAM_BLUE);
    if (careerMatchIntroRedRosterEl) careerMatchIntroRedRosterEl.innerHTML = careerMatchIntroRosterMarkup(TEAM_RED);
    if (careerMatchIntroPlanEl) careerMatchIntroPlanEl.innerHTML = `<article><span>FORMATION</span><strong>${escapeCareerHtml(plan?.formationName || 'BALANCED')}</strong></article><article><span>APPROACH</span><strong>${escapeCareerHtml(plan?.approachName || 'BALANCED')}</strong></article><article><span>ENGAGEMENT</span><strong>${escapeCareerHtml(plan?.engagementName || 'MIXED RANGE')}</strong></article><article><span>PRIORITY</span><strong>${escapeCareerHtml(plan?.priorityName || 'TRADE ELIMINATIONS')}</strong></article>`;
    careerMatchIntroStartBtn?.focus({ preventScroll: true });
    return true;
  }

  function dismissCareerMatchIntro() {
    if (!careerMatchIntroState.active) return false;
    careerMatchIntroState.active = false;
    if (careerMatchIntroEl) {
      careerMatchIntroEl.hidden = true;
      careerMatchIntroEl.setAttribute('aria-hidden', 'true');
    }
    showStatus('ROUND 1 · OPERATORS EXECUTING YOUR PLAN');
    addSystemFeed('MATCH LIVE · YOUR PREPARATION NOW SHAPES AUTONOMOUS DECISIONS');
    lastTime = performance.now();
    return true;
  }

  function resetCareerMatchIntro() {
    careerMatchIntroState.active = false;
    if (careerMatchIntroEl) {
      careerMatchIntroEl.hidden = true;
      careerMatchIntroEl.setAttribute('aria-hidden', 'true');
    }
  }

  function renderDeploymentSelection() {
    if (!deploymentSelectionState.active) return;
    const selectedArena = arenaMeta(deploymentSelectionState.selectedArenaId);
    const opponent = typeof clubOpponentBriefing === 'function' ? clubOpponentBriefing() : { name: 'OPPOSITION', style: 'TACTICAL ELIMINATION' };
    const plan = typeof clubTacticalPlanSnapshot === 'function' ? clubTacticalPlanSnapshot() : null;
    if (matchmakingTitleEl) matchmakingTitleEl.textContent = 'CONFIRM DEPLOYMENT';
    if (matchmakingSubtitleEl) matchmakingSubtitleEl.textContent = `${opponent.name} · Select the battleground and review your active five operators before entering matchmaking.`;
    if (matchmakingQueueTimeEl) matchmakingQueueTimeEl.textContent = 'READY';
    if (matchmakingRegionEl) matchmakingRegionEl.textContent = 'FINAL PRE-MATCH CHECK';
    if (deploymentMapGridEl) {
      deploymentMapGridEl.innerHTML = arenaOptions().map(arena => {
        const previewTags = Array.isArray(arena.preview?.tags) && arena.preview.tags.length
          ? `<span class="deployment-map-features">${arena.preview.tags.map(tag => `<i>${escapeCareerHtml(tag)}</i>`).join('')}</span>`
          : '';
        const previewBadge = arena.preview?.badge ? `<mark>${escapeCareerHtml(arena.preview.badge)}</mark>` : '';
        return `<button type="button" class="deployment-map-card ${arena.id === selectedArena.id ? 'active' : ''} ${arena.preview ? 'featured' : ''}" data-deployment-map="${arena.id}" aria-pressed="${arena.id === selectedArena.id ? 'true' : 'false'}"><span class="deployment-map-visual"><canvas width="320" height="176" aria-label="Top-down preview of ${escapeCareerHtml(arena.name)}"></canvas>${previewBadge}</span><span><b>${escapeCareerHtml(arena.name)}</b><small>${escapeCareerHtml(arena.matchmakingBlurb)}</small>${previewTags}</span><em>${arena.id === selectedArena.id ? 'SELECTED' : 'CHOOSE MAP'}</em></button>`;
      }).join('');
      requestAnimationFrame(() => deploymentMapGridEl.querySelectorAll('[data-deployment-map]').forEach(card => drawDeploymentArenaPreview(card.querySelector('canvas'), card.dataset.deploymentMap, card.dataset.deploymentMap === selectedArena.id ? plan : null)));
    }
    if (deploymentRosterEl) deploymentRosterEl.innerHTML = deploymentRosterMarkup();
    if (deploymentTacticsEl && plan) {
      const foundation = typeof leagueFoundationBalanceProfile === 'function' ? leagueFoundationBalanceProfile() : null;
      const openingParity = foundation?.eligible
        ? `<article class="foundation-parity"><span>OPENING MATCHUP · MATCHDAY ${foundation.matchday || 1}</span><strong>${foundation.adjustmentRequired ? 'FOUNDATION PARITY ACTIVE' : 'NATURALLY BALANCED'}</strong><small>The opening protection ramps from +1 to +3 above your active-operator rating across the first three Division 3 fixtures. Tactics and Plan Fit still matter.</small></article>`
        : '';
      const rangeWarning = typeof tacticalRangeWarningMarkup === 'function' ? tacticalRangeWarningMarkup(plan.engagementId, true) : '';
      const fixture = typeof leagueNextFixture === 'function' ? leagueNextFixture() : null;
      const opponentClub = typeof leagueActiveOpponentClub === 'function' ? (leagueActiveOpponentClub() || (fixture && typeof leagueClubById === 'function' && typeof leagueFixtureOpponentId === 'function' ? leagueClubById(leagueFixtureOpponentId(fixture)) : null)) : null;
      const expectation = opponentClub && typeof leagueFixtureExpectationSnapshot === 'function' ? leagueFixtureExpectationSnapshot(fixture, opponentClub) : null;
      const opponentStars = typeof leagueStrengthStarsMarkup === 'function' && expectation?.opposition ? leagueStrengthStarsMarkup(expectation.opposition.stars, `${opponent.name} team strength`) : '';
      const matchup = `<section class="deployment-matchup-brief"><article><span>OPPOSITION</span><strong>${escapeCareerHtml(opponent.name)}</strong><small>${escapeCareerHtml(opponent.style || opponent.detail || 'TACTICAL PROFILE')}</small></article><article><span>TEAM STRENGTH</span><strong>${expectation?.opposition?.rating || opponent.rating || '—'}</strong>${opponentStars}<small>${expectation ? `${expectation.winChance}% PUBLIC WIN CHANCE · ±${expectation.uncertainty}%` : 'SCOUTING ESTIMATE'}</small></article><article class="expectation ${escapeCareerHtml(expectation?.tone || 'even')}"><span>SUPPORTER EXPECTATION</span><strong>${escapeCareerHtml(expectation?.headline || 'COMPETE FOR THE WIN')}</strong><small>${escapeCareerHtml(expectation?.label || 'FANS EXPECT A COMPETITIVE MATCH')}${expectation?.expectedScore ? ` · EXPECTED ${escapeCareerHtml(expectation.expectedScore)}` : ''}</small></article><article><span>MATCH FORMAT</span><strong>FIRST TO 3 ROUNDS</strong><small>FIVE VS FIVE · NO RESPAWNS · ${escapeCareerHtml(selectedArena.name)}</small></article></section>`;
      deploymentTacticsEl.innerHTML = `${matchup}<div class="deployment-tactic-summary"><article><span>FORMATION</span><strong>${escapeCareerHtml(plan.formationName)}</strong></article><article><span>APPROACH</span><strong>${escapeCareerHtml(plan.approachName)}</strong></article><article><span>ENGAGEMENT</span><strong>${escapeCareerHtml(plan.engagementName)}</strong></article><article><span>PRIORITY</span><strong>${escapeCareerHtml(plan.priorityName)}</strong></article><article><span>PLAN FIT</span><strong>${Math.round(Number(plan.suitability?.overall) || 0)}/100</strong></article></div>${rangeWarning}${openingParity}${deploymentTacticalPreviewMarkup(plan, selectedArena)}`;
    }
    if (deploymentConfirmBtn) deploymentConfirmBtn.textContent = 'DEPLOY ACTIVE FIVE OPERATORS';
  }

  function openDeploymentSelection() {
    if (matchmakingState.active || !careerState.created || !careerSquadReady() || !matchmakingOverlayEl) return false;
    deploymentSelectionState.active = true;
    deploymentSelectionState.selectedArenaId = arenaMeta(careerState?.tactics?.arenaId || activeArenaMeta().id).id;
    matchmakingOverlayEl.hidden = false;
    if (deploymentSelectionEl) deploymentSelectionEl.hidden = false;
    if (matchmakingSessionEl) matchmakingSessionEl.hidden = true;
    document.body.dataset.matchmaking = 'deployment';
    menuShellEl?.setAttribute('aria-hidden', 'true');
    renderDeploymentSelection();
    lastTime = performance.now();
    return true;
  }

  function beginMatchmaking() {
    return openDeploymentSelection();
  }

  function chooseDeploymentArena(arenaId) {
    if (!deploymentSelectionState.active) return false;
    deploymentSelectionState.selectedArenaId = arenaMeta(arenaId).id;
    renderDeploymentSelection();
    return true;
  }

  function confirmDeploymentSelection() {
    if (!deploymentSelectionState.active) return false;
    careerState.tactics.arenaId = arenaMeta(deploymentSelectionState.selectedArenaId).id;
    saveCareerState();
    startMatchmakingSearch();
    return true;
  }

  function startMatchmakingSearch() {
    if (matchmakingState.active || !careerState.created || !careerSquadReady() || !matchmakingOverlayEl) return;
    // Build 12.135: only reuse a stored league context while it still resolves
    // to an unplayed fixture. A stale activeMode used to skip preparation and
    // send the manager into a "league" match that could not be settled.
    const contextUsable = typeof leaguePreparedContextValid === 'function'
      ? leaguePreparedContextValid()
      : Boolean(careerState.league?.activeMode);
    if (typeof prepareCareerMatchContext === 'function' && !contextUsable) {
      const prepared = prepareCareerMatchContext();
      if (!prepared?.ok) {
        deploymentSelectionState.active = true;
        showStatus(String(prepared?.reason || 'LEAGUE FIXTURE UNAVAILABLE').toUpperCase());
        renderDeploymentSelection();
        return;
      }
    }
    deploymentSelectionState.active = false;
    if (typeof clubCaptureActiveMatchPlan === 'function') clubCaptureActiveMatchPlan();
    ensureAudio();
    const selectedArenaId = arenaMeta(deploymentSelectionState.selectedArenaId || careerState?.tactics?.arenaId || activeArenaMeta().id).id;
    careerState.tactics.arenaId = selectedArenaId;
    saveCareerState();
    setActiveArena(selectedArenaId);
    matchmakingState = {
      active: true,
      elapsed: 0,
      stage: 0,
      arenaId: selectedArenaId,
      lastRosterKey: '',
      serverCode: `SW-EU-${String(4100 + ((careerState.totalMatches * 137 + careerState.level * 29) % 5800)).padStart(4, '0')}`,
      ping: 20 + ((careerState.level * 7 + careerState.totalMatches * 3) % 17)
    };
    matchmakingOverlayEl.hidden = false;
    if (deploymentSelectionEl) deploymentSelectionEl.hidden = true;
    if (matchmakingSessionEl) matchmakingSessionEl.hidden = false;
    document.body.dataset.matchmaking = 'active';
    menuShellEl?.setAttribute('aria-hidden', 'true');
    updateMatchmakingUI(true);
    lastTime = performance.now();
  }

  function cancelMatchmaking() {
    if (deploymentSelectionState.active) {
      deploymentSelectionState.active = false;
      if (matchmakingOverlayEl) matchmakingOverlayEl.hidden = true;
      if (deploymentSelectionEl) deploymentSelectionEl.hidden = true;
      delete document.body.dataset.matchmaking;
      menuShellEl?.removeAttribute('aria-hidden');
      if (typeof cancelPreparedCareerMatch === 'function') cancelPreparedCareerMatch();
      updateMenuUI();
      lastTime = performance.now();
      return;
    }
    if (!matchmakingState.active || matchmakingState.stage >= 4) return;
    matchmakingState.active = false;
    if (matchmakingOverlayEl) matchmakingOverlayEl.hidden = true;
    delete document.body.dataset.matchmaking;
    menuShellEl?.removeAttribute('aria-hidden');
    if (typeof cancelPreparedCareerMatch === 'function') cancelPreparedCareerMatch();
    updateMenuUI();
    lastTime = performance.now();
  }

  function stabiliseMatchRenderViewport() {
    if (typeof resize !== 'function') return;
    resize();
    requestAnimationFrame(() => {
      resize();
      requestAnimationFrame(() => resize());
    });
    window.setTimeout(() => resize(), 120);
  }

  function completeMatchmaking() {
    if (!matchmakingState.active) return;
    matchmakingState.active = false;
    if (matchmakingOverlayEl) matchmakingOverlayEl.hidden = true;
    delete document.body.dataset.matchmaking;
    menuShellEl?.removeAttribute('aria-hidden');
    canResumeMatch = true;
    menuContext = 'pause';
    matchSimulationPaused = false;
    setMatchSpeed(1, false);
    // Apply the match layout and DPR cap before creating the round. Diagnostics
    // therefore start with the real portrait match buffer instead of briefly
    // inheriting the much larger Command HQ canvas.
    setAppState('match');
    stabiliseMatchRenderViewport();
    createMatch();
    spectatorIndex = ownedOperatorIndex();
    autoSpectate = false;
    autoTimer = 999;
    queueAudioRecovery(260);
    updateMenuUI();
    if (!showCareerMatchIntro()) showStatus('MATCH LIVE');
    lastTime = performance.now();
  }

  function updateMatchmaking(dt) {
    if (!matchmakingState.active) return;
    matchmakingState.elapsed = Math.max(0, matchmakingState.elapsed + Math.max(0, Number(dt) || 0));
    updateMatchmakingUI();
    if (matchmakingState.elapsed >= MATCHMAKING_TOTAL_TIME) completeMatchmaking();
  }

  function menuSectionForRoute(route = menuTab) {
    return Object.entries(menuSections).find(([, section]) => section.routes.some(item => item.id === route))?.[0] || 'operations';
  }

  function setMenuSection(sectionId) {
    const section = menuSections[sectionId] || menuSections.operations;
    setMenuRoute(section.defaultRoute);
  }

  function setMenuRoute(route, options = {}) {
    if (route === 'player-telemetry') route = 'profile';
    if (!menuTabMeta[route]) return false;
    if (!options.ignoreProgressiveLock && progressiveLockedRouteMessage(route)) return false;
    if (typeof workflowGuardRouteChange === 'function' && workflowGuardRouteChange(route, options)) return false;
    if (!options.fromHistory) {
      if (menuNavigationIndex < 0) resetMenuNavigationHistory(menuTab);
      else saveCurrentMenuHistoryState();
    }
    if (route !== 'settings') careerWipeConfirmOpen = false;
    menuTab = route;
    if (mobileNavigationIsOpen() && !options.keepMobileNavigation) closeMobileNavigation({ restoreFocus: false });
    if (route === 'reports' && careerState.lastRound && !careerState.lastRound.reportReviewed) {
      careerState.lastRound.reportReviewed = true;
      saveCareerState();
    }
    if (menuContext === 'pause' && menuSectionForRoute(route) === 'operations') lastLiveMenuTab = route;
    noteTeamManagementRoute(route);
    if (!options.fromHistory) pushMenuNavigationHistory(route);
    updateMenuUI();
    if (!options.preserveScroll) resetMenuScroll();
    return true;
  }

  function restoreCommandViewportOrigin() {
    const scrollingElement = document.scrollingElement || document.documentElement;
    if (scrollingElement) {
      scrollingElement.scrollTop = 0;
      scrollingElement.scrollLeft = 0;
    }
    if (menuShellEl) {
      menuShellEl.scrollTop = 0;
      menuShellEl.scrollLeft = 0;
    }
    const layout = menuShellEl?.querySelector('.menu-layout') || null;
    if (layout) {
      layout.scrollTop = 0;
      layout.scrollLeft = 0;
    }
    if ((window.scrollX || window.scrollY || window.pageXOffset || window.pageYOffset) && typeof window.scrollTo === 'function') {
      window.scrollTo(0, 0);
    }
  }

  function resetMenuScroll() {
    if (!menuContentEl) return;
    const scrollContainer = menuContentEl.closest('.menu-content');
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
      scrollContainer.scrollLeft = 0;
    }
    menuContentEl.scrollTop = 0;
    restoreCommandViewportOrigin();
  }

  function scrollCommandContentTargetIntoView(target, options = {}) {
    const scroller = menuHistoryScroller();
    if (!target?.isConnected || !scroller?.isConnected) return false;
    restoreCommandViewportOrigin();
    const scrollerRect = scroller.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const currentTop = Math.max(0, Number(scroller.scrollTop) || 0);
    const targetTop = currentTop + targetRect.top - scrollerRect.top;
    const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    const stickyReserve = Math.min(112, Math.max(0, scroller.clientHeight * 0.22));
    const usableHeight = Math.max(80, scroller.clientHeight - stickyReserve);
    const block = options.block === 'start' ? 'start' : 'center';
    const desiredTop = block === 'start'
      ? targetTop - stickyReserve - 12
      : targetTop - stickyReserve - Math.max(12, (usableHeight - Math.min(targetRect.height, usableHeight)) * 0.42);
    scroller.scrollTo({
      top: clamp(desiredTop, 0, maxScroll),
      left: 0,
      behavior: options.behavior === 'smooth' ? 'smooth' : 'auto'
    });
    requestAnimationFrame(restoreCommandViewportOrigin);
    return true;
  }

  let menuGuideScrollRequest = 0;

  function scrollMenuGuideTargetIntoView(targetId, expectedRoute = menuTab, options = {}) {
    const targetKey = String(targetId || '').trim();
    if (!targetKey) return false;
    const requestId = ++menuGuideScrollRequest;
    const escapedTarget = targetKey.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const selectors = [
      `[data-guide-target="${escapedTarget}"]`,
      `[data-management-target-id="${escapedTarget}"]`
    ];
    let completed = false;
    const apply = () => {
      if (completed || requestId !== menuGuideScrollRequest || (expectedRoute && menuTab !== expectedRoute)) return false;
      const target = selectors.map(selector => menuContentEl?.querySelector(selector) || null).find(Boolean) || null;
      if (!target) return false;
      completed = scrollCommandContentTargetIntoView(target, {
        block: options.block === 'center' ? 'center' : 'start',
        behavior: options.behavior === 'auto' ? 'auto' : 'smooth'
      });
      if (completed) {
        target.classList.add('guide-scroll-arrival');
        window.setTimeout(() => {
          if (target.isConnected) target.classList.remove('guide-scroll-arrival');
        }, 1600);
      }
      return completed;
    };
    requestAnimationFrame(() => {
      if (!apply()) requestAnimationFrame(apply);
    });
    window.setTimeout(apply, 180);
    return true;
  }

  function stabiliseMenuViewportAfterRoute(expectedRoute = menuTab, options = {}) {
    let initialised = false;
    const preserveMenuScroll = Boolean(options.preserveMenuScroll);
    const apply = ({ restoreRecommendation = false } = {}) => {
      if (expectedRoute && menuTab !== expectedRoute) return;
      const visualHeight = Number(window.visualViewport?.height) || 0;
      const layoutHeight = Math.max(
        Number(window.innerHeight) || 0,
        Number(document.documentElement.clientHeight) || 0,
        visualHeight,
        1
      );
      document.documentElement.style.setProperty('--strike-visual-viewport-height', `${Math.round(layoutHeight)}px`);
      document.documentElement.style.setProperty('--strike-visual-viewport-top', '0px');
      const appEl = document.getElementById('app');
      if (appEl) {
        appEl.style.removeProperty('max-height');
        void appEl.offsetHeight;
      }
      if (menuShellEl) {
        menuShellEl.style.removeProperty('max-height');
        void menuShellEl.offsetHeight;
      }
      if (!initialised) {
        if (!preserveMenuScroll) resetMenuScroll();
        else restoreCommandViewportOrigin();
        initialised = true;
      } else {
        restoreCommandViewportOrigin();
      }
      if (restoreRecommendation && expectedRoute === 'training' && typeof scrollTrainingRecommendationIntoView === 'function') {
        scrollTrainingRecommendationIntoView({ behavior: 'auto' });
      }
    };
    apply();
    requestAnimationFrame(() => {
      apply();
      requestAnimationFrame(() => apply({ restoreRecommendation: expectedRoute === 'training' }));
    });
    window.setTimeout(() => apply({ restoreRecommendation: expectedRoute === 'training' }), 220);
  }

  function updateMenuSubnavOverflow() {
    if (!menuSubnavEl) return;
    const maxScroll = Math.max(0, menuSubnavEl.scrollWidth - menuSubnavEl.clientWidth);
    const canLeft = menuSubnavEl.scrollLeft > 6;
    const canRight = menuSubnavEl.scrollLeft < maxScroll - 6;
    if (menuSubnavLeftBtn) menuSubnavLeftBtn.hidden = !canLeft;
    if (menuSubnavRightBtn) menuSubnavRightBtn.hidden = !canRight;
    if (menuSubnavShellEl) {
      menuSubnavShellEl.classList.toggle('can-scroll-left', canLeft);
      menuSubnavShellEl.classList.toggle('can-scroll-right', canRight);
    }
  }

  let lastMenuSubnavRouteKey = '';

  function renderMenuSubnav() {
    if (!menuSubnavEl) return;
    const sectionId = menuSectionForRoute();
    const routes = menuVisibleRoutes(sectionId, true);
    const routeKey = `${sectionId}:${menuTab}`;
    const guidance = firstMatchGuidance();
    const routeChanged = routeKey !== lastMenuSubnavRouteKey;
    menuSubnavEl.dataset.section = sectionId;
    menuSubnavEl.innerHTML = routes.map(route => {
      const access = progressiveRouteAccess(route.id);
      const signal = access.locked ? { count: 0, label: '', tone: 'progress' } : menuRouteNotification(route.id);
      const primaryAction = !access.locked && typeof managementPrimaryActionForRoute === 'function' ? managementPrimaryActionForRoute(route.id) : null;
      const badgeText = signal.count > 99 ? '99+' : String(signal.count);
      const buttonLabel = access.locked
        ? `${route.label}, locked, ${access.reason}`
        : signal.count ? `${route.label}, ${signal.count} ${signal.label}` : route.label;
      const actionAttribute = primaryAction ? `data-management-action-id="${escapeCareerHtml(primaryAction.id)}"` : `data-menu-route="${route.id}"`;
      const supportCopy = access.locked ? `LOCKED · ${access.unlockLabel}` : route.hint;
      return `
      <button class="menu-subtab ${menuTab === route.id ? 'active' : ''} ${guidance?.route === route.id ? 'guided-target' : ''} ${access.locked ? 'foundation-locked' : ''} ${route.contextOnly ? 'context-route' : ''}" ${actionAttribute} aria-current="${menuTab === route.id ? 'page' : 'false'}" aria-disabled="${access.locked ? 'true' : 'false'}" aria-label="${escapeCareerHtml(buttonLabel)}" title="${escapeCareerHtml(access.locked ? access.reason : route.hint)}">
        <strong class="menu-subtab-heading"><span class="menu-subtab-label">${escapeCareerHtml(route.label)}</span>${access.locked ? '<span class="menu-subtab-lock" aria-hidden="true">LOCK</span>' : signal.count ? `<span class="menu-subtab-notification ${escapeCareerHtml(signal.tone)}" aria-hidden="true">${badgeText}</span>` : ''}</strong><small>${escapeCareerHtml(supportCopy)}</small>
      </button>`;
    }).join('');
    requestAnimationFrame(() => {
      if (routeChanged) {
        const activeTab = menuSubnavEl.querySelector('.menu-subtab.active');
        if (activeTab) {
          const maxScroll = Math.max(0, menuSubnavEl.scrollWidth - menuSubnavEl.clientWidth);
          const desiredLeft = activeTab.offsetLeft - Math.max(0, (menuSubnavEl.clientWidth - activeTab.offsetWidth) * 0.5);
          menuSubnavEl.scrollTo({ left: clamp(desiredLeft, 0, maxScroll), top: 0, behavior: 'auto' });
        }
        restoreCommandViewportOrigin();
        lastMenuSubnavRouteKey = routeKey;
      }
      updateMenuSubnavOverflow();
      requestAnimationFrame(updateMenuSubnavOverflow);
    });
  }

  function getViewedBot() {
    return bots[spectatorIndex] || bots[0] || null;
  }

  function teamSummary(team) {
    const members = bots.filter(bot => bot.team === team);
    return {
      members,
      alive: members.filter(bot => bot.alive).length,
      kills: members.reduce((sum, bot) => sum + bot.kills, 0),
      deaths: members.reduce((sum, bot) => sum + bot.deaths, 0)
    };
  }

  function getWeaponUsage(limit = 6) {
    const counts = new Map();
    for (const bot of bots) {
      const descriptor = bot.weapon ? weaponRangeDescriptor(bot.weapon).label : 'UNASSIGNED';
      const name = bot.weapon ? `${bot.weapon.name} · ${descriptor}` : 'UNASSIGNED';
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
      .slice(0, limit);
  }

  function getTopFraggers(limit = 3) {
    return bots.slice().sort((a, b) => (b.kills - a.kills) || (a.deaths - b.deaths) || (b.health - a.health)).slice(0, limit);
  }

  function menuTile(label, value, meta = '', tone = '') {
    return `<article class="menu-info-tile ${tone}"><div class="menu-kicker">${label}</div><div class="menu-stat">${value}</div>${meta ? `<div class="menu-meta">${meta}</div>` : ''}</article>`;
  }

  function menuCard(label, title, body, extra = '') {
    return `<article class="menu-card"><div class="menu-kicker">${label}</div><h3>${title}</h3><p>${body}</p>${extra}</article>`;
  }

  function renderWeaponRows() {
    const rows = getWeaponUsage().map(([name, count]) => `
      <div class="menu-weapon-row">
        <span class="weapon-name">${name}</span>
        <span class="weapon-count">${count} OPERATOR${count === 1 ? '' : 'S'}</span>
      </div>
    `).join('');
    return `<div class="menu-weapon-list">${rows}</div>`;
  }

  function renderRosterGroup(team, title, accentClass) {
    const members = bots
      .filter(bot => bot.team === team)
      .slice()
      .sort((a, b) => Number(b.alive) - Number(a.alive) || (b.kills - a.kills) || a.name.localeCompare(b.name));
    return `
      <section class="menu-roster-group ${accentClass}">
        <div class="menu-roster-head"><span>${title}</span><span>${members.filter(bot => bot.alive).length} ALIVE</span></div>
        <div class="menu-roster-cols"><span>OPERATOR</span><span>K / D</span><span>HP</span><span>STATUS</span></div>
        ${members.map(bot => `
          <div class="menu-roster-row ${bot.alive ? '' : 'dead'}">
            <div class="menu-roster-name"><strong>${escapeCareerHtml(bot.name)}</strong><small>${escapeCareerHtml(bot.weapon ? `${bot.weapon.name} · ${weaponRangeDescriptor(bot.weapon).label}` : 'UNASSIGNED')}</small></div>
            <span>${bot.kills} / ${bot.deaths}</span>
            <span>${bot.alive ? Math.max(0, Math.ceil(bot.health)) : 0}</span>
            <span class="state ${bot.alive ? 'alive' : 'down'}">${botTacticalStatus(bot, true)}</span>
          </div>
        `).join('')}
      </section>
    `;
  }

  function renderPlayTab(roundNumberValue, scoreText, liveBlue, liveRed, viewedBot, zone, pauseMenu, actionHint) {
    return renderCareerOperationsTab(roundNumberValue, scoreText, liveBlue, liveRed, viewedBot, zone, pauseMenu);
  }

  function renderCalendarRouteTab() {
    return typeof renderClubCalendarTab === 'function' ? renderClubCalendarTab() : renderCareerCreationTab();
  }

  function renderMailRouteTab() {
    return typeof renderMailTab === 'function' ? renderMailTab() : renderCareerCreationTab();
  }

  function renderTacticsRouteTab() {
    return typeof renderTacticsTab === 'function' ? renderTacticsTab() : renderCareerCreationTab();
  }

  function renderStaffRouteTab() {
    return typeof renderStaffTab === 'function' ? renderStaffTab() : renderCareerCreationTab();
  }

  function renderTelemetryTab() {
    return renderCareerTelemetryTab();
  }

  function renderPlayerTelemetryTab() {
    return renderCareerPlayerTelemetryTab();
  }

  function renderReportsTab() {
    return renderCareerReportsTab();
  }

  function renderLoadoutTab(viewedBot) {
    return renderCareerLoadoutTab();
  }

  function renderOperatorsTab(liveBlue, liveRed) {
    return renderTeamSquadTab();
  }

  function renderMarketTab() {
    return renderTeamMarketTab();
  }

  function renderProfileTab() {
    return renderTeamPlayerProfileTab();
  }

  function renderHonoursTab() {
    return renderCareerRecordsTab();
  }

  function renderTrainingTab() {
    return renderTrainingFacilityTab();
  }

  function renderBarracksTab(roundNumberValue) {
    return renderTeamFinancesTab();
  }

  function renderCommercialRouteTab() {
    return typeof renderCommercialTab === 'function' ? renderCommercialTab() : renderBarracksTab(roundNumber);
  }

  function renderStoreTab() {
    return renderAmmunitionStoreTab();
  }

  function renderSettingsTab() {
    const rendererState = document.body.dataset.renderer === 'lost' ? 'RECOVERING' : 'ONLINE';
    const audioState = audioDisplayState();
    const audioActionLabel = audioEnabled && audioContext?.state === 'running' ? 'MUTE SOUND' : 'ENABLE / TEST SOUND';
    const backupReady = typeof careerBackupAvailable === 'function' && careerBackupAvailable();
    const saveLabel = typeof careerSaveTimeLabel === 'function' ? careerSaveTimeLabel() : 'UNKNOWN';
    // Build 12.159: measured on every render of this page. The quota figure is
    // asynchronous, so it reports the last estimate the browser returned.
    const storage = typeof careerStorageSummary === 'function'
      ? careerStorageSummary()
      : { saveSize: 'UNKNOWN', backupSize: 'UNKNOWN', totalSize: 'UNKNOWN', usageLabel: 'UNKNOWN', durableTier: 'UNKNOWN' };
    const dataNotice = careerDataNotice
      ? `<aside class="career-data-notice ${escapeCareerHtml(careerDataNotice.tone)}"><div><span>${escapeCareerHtml(careerDataNotice.title)}</span><p>${escapeCareerHtml(careerDataNotice.detail)}</p></div><button type="button" data-career-action="dismiss-data-notice" aria-label="Dismiss career data message">×</button></aside>`
      : '';
    return `
      ${dataNotice}
      <div class="menu-hero">
        <div class="menu-hero-main menu-briefing-panel">
          <div class="menu-kicker">SYSTEM STATUS</div>
          <h2>LIVE CONFIGURATION</h2>
          <p>Review appearance, audio, spectator, renderer, input, recovery and isolated map-inspection tools without altering career or match results.</p>
          <div class="menu-pill-row">
            <span class="menu-pill">AUDIO ${audioState}</span>
            <span class="menu-pill">AUTO ${autoSpectate ? 'ON' : 'OFF'}</span>
            <span class="menu-pill">HUD PANELS ${uiButtonsHidden ? 'HIDDEN' : 'VISIBLE'}</span>
            <span class="menu-pill">RENDERER ${rendererState}</span>
            <span class="menu-pill">BACKGROUND ${escapeCareerHtml(interfaceBackgroundColour.toUpperCase())}</span>
          </div>
        </div>
        <div class="menu-hero-side">
          <div class="menu-kicker">QUICK REFERENCE</div>
          <div class="menu-leader-row"><span>SOUND STATUS</span><span>${audioState}</span></div>
          <div class="menu-leader-row"><span>MENU BUTTON</span><span>PAUSE / FRONT-END</span></div>
          <div class="menu-leader-row"><span>SHOW / HIDE UI</span><span>${uiButtonsHidden ? 'HIDDEN' : 'VISIBLE'}</span></div>
          <div class="menu-leader-row"><span>PAGE BACKGROUND</span><span>${escapeCareerHtml(interfaceBackgroundColour.toUpperCase())}</span></div>
          <div class="menu-leader-row"><span>ESC / H</span><span>SHORTCUT SUPPORT</span></div>
        </div>
      </div>
      <div class="menu-settings-grid">
        <article class="menu-setting-card"><div class="menu-kicker">AUDIO</div><h3>SPATIAL SOUND</h3><div class="menu-setting-row"><span>MASTER STATE</span><strong>${audioState}</strong></div><div class="menu-setting-row"><span>RECOVERY WATCHDOG</span><strong>ACTIVE</strong></div><div class="menu-setting-row"><span>FOOTSTEPS</span><strong>LAYERED CONCRETE CONTACTS</strong></div><div class="menu-setting-row"><span>WEAPON SFX</span><strong>CLASS VARIATION ENABLED</strong></div><button class="menu-audio-action ${audioEnabled && audioContext?.state === 'running' ? '' : 'primary'}" data-audio-action="toggle">${audioActionLabel}</button></article>
        <article class="menu-setting-card"><div class="menu-kicker">SPECTATOR</div><h3>CAMERA FLOW</h3><div class="menu-setting-row"><span>AUTO SPECTATE</span><strong>${autoSpectate ? 'ON' : 'OFF'}</strong></div><div class="menu-setting-row"><span>HUD PANELS</span><strong>${uiButtonsHidden ? 'HIDDEN' : 'VISIBLE'}</strong></div><div class="menu-setting-row"><span>SCORE STRIP</span><strong>ALWAYS VISIBLE</strong></div></article>
        <article class="menu-setting-card"><div class="menu-kicker">RENDERER</div><h3>VISUAL STATUS</h3><div class="menu-setting-row"><span>WEBGL CORE</span><strong>${rendererState}</strong></div><div class="menu-setting-row"><span>KILL FEED</span><strong>TRANSLUCENT PANELS</strong></div><div class="menu-setting-row"><span>OPERATOR BODIES</span><strong>TACTICAL MODEL SILHOUETTES</strong></div></article>
        ${renderInterfaceBackgroundSettingCard()}
        <article class="menu-setting-card"><div class="menu-kicker">INPUT</div><h3>ACTIVE SHORTCUTS</h3><div class="menu-setting-row"><span>ESC</span><strong>${canResumeMatch ? 'OPEN / CLOSE COMMAND HQ' : 'OPEN COMMAND HQ'}</strong></div><div class="menu-setting-row"><span>P / SPACE</span><strong>${canResumeMatch ? 'PAUSE / RESUME BACKGROUND MATCH' : 'AVAILABLE DURING LIVE MATCH'}</strong></div><div class="menu-setting-row"><span>H / U</span><strong>SHOW OR HIDE PANELS</strong></div></article>
        ${typeof renderFreeRoamConfigurationCard === 'function' ? renderFreeRoamConfigurationCard() : ''}
        <article class="menu-setting-card career-recovery-card">
          <div class="menu-kicker">SAVE &amp; RECOVERY</div>
          <h3>PROTECT THIS CAREER</h3>
          <p>Strikewatch autosaves locally. Export a portable file before clearing browser data or moving to another device.</p>
          <div class="menu-setting-row"><span>LAST AUTOSAVE</span><strong>${escapeCareerHtml(saveLabel)}</strong></div>
          <div class="menu-setting-row"><span>CAREER SCHEMA</span><strong>VERSION ${Math.max(0, Number(careerState.version) || 0)}</strong></div>
          <div class="menu-setting-row"><span>RESTORE POINT</span><strong>${backupReady ? 'AVAILABLE' : 'CREATED AFTER NEXT CHANGE'}</strong></div>
          <div class="menu-setting-row"><span>CAREER SAVE FILE</span><strong>${escapeCareerHtml(storage.saveSize)}</strong></div>
          <div class="menu-setting-row"><span>RECOVERY BACKUP</span><strong>${escapeCareerHtml(storage.backupSize)}</strong></div>
          <div class="menu-setting-row"><span>LOCAL CAREER DATA</span><strong>${escapeCareerHtml(storage.fastTierSize)}</strong></div>
          <div class="menu-setting-row"><span>BROWSER ORIGIN STORAGE</span><strong>${escapeCareerHtml(storage.originUsageLabel)}</strong></div>
          <div class="menu-setting-row"><span>PRIMARY SAVE TIER</span><strong>${escapeCareerHtml(storage.primaryTier === 'indexedDB' ? 'INDEXEDDB' : 'LOCAL STORAGE')}</strong></div>
          <div class="menu-setting-row"><span>DURABLE MIRROR</span><strong>${escapeCareerHtml(storage.durableTier)}</strong></div>
          <small>${escapeCareerHtml(storage.originScope)}</small>
          <div class="career-recovery-actions"><button class="primary" type="button" data-career-action="export-save" ${careerState.created ? '' : 'disabled'}>EXPORT CAREER</button><button type="button" data-career-action="import-save">IMPORT CAREER</button><button type="button" data-career-action="restore-backup" ${backupReady ? '' : 'disabled'}>RESTORE BACKUP</button></div>
          <small>Importing or restoring first preserves the active career as the next backup, so the replacement can be undone once.</small>
        </article>
        <article class="menu-setting-card menu-danger-card">
          <div class="menu-kicker">CAREER DATA</div>
          <h3>${careerWipeConfirmOpen ? 'CONFIRM FRESH GAME' : 'NEW TEAM / RESET'}</h3>
          ${careerWipeConfirmOpen
            ? `<p>This permanently removes the team, player contracts, credits, wages, XP, unlocked weapons, records and current match progress stored on this device.</p><div class="menu-danger-actions"><button class="menu-danger-confirm" data-career-action="confirm-wipe">WIPE ALL DATA</button><button class="menu-danger-cancel" data-career-action="cancel-wipe">CANCEL</button></div>`
            : `<p>Return Strikewatch to the initial team-creation screen and remove all locally saved club, squad, finance and career progress.</p><button class="menu-danger-trigger" data-career-action="request-wipe" ${careerState.created ? '' : 'disabled'}>NEW TEAM / RESET</button>`}
        </article>
      </div>
    `;
  }


  function renderMenuContent() {
    if (!menuContentEl) return;
    const scoreText = matchScoreLine(blueScore, redScore);
    const liveBlue = teamAliveCount(TEAM_BLUE);
    const liveRed = teamAliveCount(TEAM_RED);
    const viewedBot = getViewedBot();
    const zone = viewedBot ? levelZoneAt(viewedBot.x, viewedBot.y) : { name: 'Citadel Depot', short: 'CTRL' };
    const pauseMenu = menuContext === 'pause';
    const actionHint = pauseMenu
      ? (matchSimulationPaused
        ? 'The live match is manually paused. Use Resume Match to continue it in the background or Return to Match to re-enter the spectator feed.'
        : 'The match is continuing live in the background. Use Pause Match when you need time to review telemetry without the round advancing.')
      : 'Review the live state, then deploy into a new match or browse the current systems and roster information.';

    switch (menuTab) {
      case 'team-hub':
        menuContentEl.innerHTML = renderSectionHub('career');
        break;
      case 'armoury-hub':
        menuContentEl.innerHTML = renderSectionHub('armoury');
        break;
      case 'supplies-hub':
        menuContentEl.innerHTML = renderSectionHub('supplies');
        break;
      case 'club-hub':
        menuContentEl.innerHTML = renderSectionHub('systems');
        break;
      case 'league':
        menuContentEl.innerHTML = renderLeagueTab();
        break;
      case 'calendar':
        menuContentEl.innerHTML = renderCalendarRouteTab();
        break;
      case 'mail':
        menuContentEl.innerHTML = renderMailRouteTab();
        break;
      case 'telemetry':
        menuContentEl.innerHTML = renderTelemetryTab();
        break;
      case 'player-telemetry':
        menuContentEl.innerHTML = renderPlayerTelemetryTab();
        break;
      case 'reports':
        menuContentEl.innerHTML = renderReportsTab();
        break;
      case 'loadout':
        menuContentEl.innerHTML = renderLoadoutTab(viewedBot);
        break;
      case 'operators':
        menuContentEl.innerHTML = renderOperatorsTab(liveBlue, liveRed);
        break;
      case 'tactics':
        menuContentEl.innerHTML = renderTacticsRouteTab();
        break;
      case 'market':
        menuContentEl.innerHTML = renderMarketTab();
        break;
      case 'transfers':
        menuContentEl.innerHTML = typeof renderTransferCentreTab === 'function' ? renderTransferCentreTab() : renderMarketTab();
        break;
      case 'profile':
        menuContentEl.innerHTML = renderProfileTab();
        break;
      case 'honours':
        menuContentEl.innerHTML = renderHonoursTab();
        break;
      case 'training':
        menuContentEl.innerHTML = renderTrainingTab();
        break;
      case 'infrastructure':
        menuContentEl.innerHTML = typeof renderInfrastructureTab === 'function' ? renderInfrastructureTab() : renderSectionHub('systems');
        break;
      case 'staff':
        menuContentEl.innerHTML = renderStaffRouteTab();
        break;
      case 'barracks':
        menuContentEl.innerHTML = renderBarracksTab(roundNumber);
        break;
      case 'gold':
        menuContentEl.innerHTML = typeof renderGoldCoinOverviewTab === 'function' ? renderGoldCoinOverviewTab() : renderStoreTab();
        break;
      case 'commercial':
        menuContentEl.innerHTML = renderCommercialRouteTab();
        break;
      case 'supporters':
        menuContentEl.innerHTML = typeof renderSupportersTab === 'function' ? renderSupportersTab() : renderSectionHub('systems');
        break;
      case 'store':
        menuContentEl.innerHTML = renderStoreTab();
        break;
      case 'settings':
        menuContentEl.innerHTML = renderSettingsTab();
        break;
      case 'play':
      default:
        menuContentEl.innerHTML = renderPlayTab(roundNumber, scoreText, liveBlue, liveRed, viewedBot, zone, pauseMenu, actionHint);
        break;
    }
    const contextTutorial = renderMenuContextTutorial(menuTab);
    const mustRespond = menuTab === 'play' && typeof renderClubMustRespondStrip === 'function' ? renderClubMustRespondStrip() : '';
    const priorityStrip = mustRespond ? '' : renderMenuPriorityStrip();
    if (priorityStrip) menuContentEl.insertAdjacentHTML('afterbegin', priorityStrip);
    if (contextTutorial) menuContentEl.insertAdjacentHTML('afterbegin', contextTutorial);
    if (mustRespond) {
      menuContentEl.insertAdjacentHTML('afterbegin', mustRespond);
      const blockerLabels = new Set((typeof clubEndDayBlockers === 'function' ? clubEndDayBlockers() : []).map(item => String(item?.label || '').trim().toUpperCase()).filter(Boolean));
      for (const candidate of menuContentEl.querySelectorAll('.management-priority-strip, .career-next-action, .manager-next-action, [data-management-priority]')) {
        if (candidate.closest('.club-must-respond-strip')) continue;
        const candidateLabel = String(candidate.querySelector('strong')?.textContent || '').trim().toUpperCase();
        if (candidateLabel && blockerLabels.has(candidateLabel)) candidate.remove();
      }
    }
    const urgentSurface = menuContentEl.querySelector('[data-management-action-rank="urgent"]');
    const recommendedSurface = urgentSurface ? null : menuContentEl.querySelector('.management-priority-strip');
    menuContentEl.classList.toggle('has-urgent-management-action', Boolean(urgentSurface));
    menuContentEl.classList.toggle('has-recommended-management-action', Boolean(recommendedSurface));
    if (recommendedSurface) recommendedSurface.dataset.managementActionRank = 'recommended';
    const arrivalBanner = typeof renderManagementArrivalBanner === 'function' ? renderManagementArrivalBanner() : '';
    if (arrivalBanner) menuContentEl.insertAdjacentHTML('afterbegin', arrivalBanner);
    if (typeof applyManagementArrivalAfterRender === 'function') applyManagementArrivalAfterRender();
    if (menuTab === 'training' && typeof scrollTrainingRecommendationIntoView === 'function') scrollTrainingRecommendationIntoView();
    if (menuTab === 'play' && typeof applyCommandIndexFilter === 'function') requestAnimationFrame(() => applyCommandIndexFilter(commandIndexSearchQuery));
  }

  function isPortraitViewport() {
    return window.matchMedia ? window.matchMedia('(orientation: portrait)').matches : innerHeight >= innerWidth;
  }

  function syncViewMode() {
    const portraitViewport = isPortraitViewport();
    const interactiveView = appState === 'match' || appState === 'free-roam';
    const waitingForLandscape = Boolean(fullViewRequested && portraitViewport && interactiveView);
    viewMode = (!portraitViewport || fullViewRequested) ? 'maximized' : 'windowed';
    document.body.dataset.viewMode = viewMode;
    document.body.dataset.fullView = fullViewRequested ? 'requested' : 'idle';
    document.body.dataset.orientationGate = waitingForLandscape ? 'visible' : 'hidden';
    if (landscapeRotationGateEl) {
      landscapeRotationGateEl.hidden = !waitingForLandscape;
      landscapeRotationGateEl.setAttribute('aria-hidden', waitingForLandscape ? 'false' : 'true');
    }
    if (waitingForLandscape) {
      if (typeof tacticalMinimapVisible !== 'undefined' && tacticalMinimapVisible && typeof setTacticalMinimapVisible === 'function') setTacticalMinimapVisible(false, false);
      if (typeof diagnosticOverlayVisible !== 'undefined' && diagnosticOverlayVisible && typeof setDiagnosticOverlayVisible === 'function') setDiagnosticOverlayVisible(false);
    }
    if (restoreViewBtn) {
      const showRestore = fullViewRequested && interactiveView && !waitingForLandscape;
      restoreViewBtn.hidden = !showRestore;
      restoreViewBtn.setAttribute('aria-hidden', showRestore ? 'false' : 'true');
    }
    if (maximizeViewBtn) {
      maximizeViewBtn.setAttribute('aria-pressed', fullViewRequested ? 'true' : 'false');
    }
    if (typeof syncMatchCommentaryDockPlacement === 'function') syncMatchCommentaryDockPlacement();
    requestAnimationFrame(() => resize());
  }

  async function maximizeGameView() {
    // Start/resume Web Audio before fullscreen and orientation APIs can suspend
    // Safari's context during the portrait-to-landscape transition.
    resumeAudioFromGesture();
    fullViewRequested = true;
    syncViewMode();
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      }
    } catch (error) {
      // The rotated in-page fallback remains active when fullscreen is unavailable.
    }
    try {
      if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');
    } catch (error) {
      // Orientation locking is optional and is not available in every mobile browser.
    }
    queueAudioRecovery(320);
    lastTime = performance.now();
    requestAnimationFrame(() => resize());
  }

  async function restoreWindowedView() {
    resumeAudioFromGesture();
    fullViewRequested = false;
    try {
      if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
    } catch (error) {
      // Ignore browsers that expose a partial Screen Orientation API.
    }
    try {
      if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen();
    } catch (error) {
      // The CSS layout still returns to portrait windowed mode.
    }
    syncViewMode();
    queueAudioRecovery(180);
    lastTime = performance.now();
  }

  function setAppState(nextState) {
    const previousState = appState;
    appState = nextState;
    document.body.dataset.appState = appState;
    document.body.dataset.menuContext = menuContext;
    if (menuShellEl) menuShellEl.hidden = appState !== 'menu';
    if (buildStampEl) buildStampEl.hidden = appState === 'match' || appState === 'free-roam' || menuContext === 'pause';
    if (freeRoamOverlayEl) {
      const freeRoamActive = appState === 'free-roam';
      freeRoamOverlayEl.hidden = !freeRoamActive;
      freeRoamOverlayEl.setAttribute('aria-hidden', freeRoamActive ? 'false' : 'true');
    }
    if (appState !== 'match') {
      closeScoreboard();
      if (typeof closeLiveCommandPulsePanel === 'function') closeLiveCommandPulsePanel();
    }
    if (showUiBtn) {
      showUiBtn.hidden = true;
      showUiBtn.setAttribute('aria-hidden', 'true');
    }
    syncViewMode();
    if (appState === 'match' && previousState !== 'match') {
      queueAudioRecovery(220);
    }
  }

  function liveMatchMenuActive() {
    return menuContext === 'pause' && canResumeMatch;
  }

  function formatLiveMatchClock() {
    const total = Math.max(0, Math.ceil(roundTime));
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  function liveMatchMenuStatus() {
    if (!liveMatchMenuActive()) return careerBetweenRounds ? (typeof betweenRoundTacticsState !== 'undefined' && !betweenRoundTacticsState.resolved ? 'TACTICAL INTERVENTION REQUIRED' : 'ROUND TRANSITION') : 'PRE-MATCH HEADQUARTERS';
    if (matchEnding) return `MATCH COMPLETE · ${matchScoreLine(blueScore, redScore)}`;
    const blueAlive = teamAliveCount(TEAM_BLUE);
    const redAlive = teamAliveCount(TEAM_RED);
    const state = matchSimulationPaused ? 'PAUSED' : 'LIVE';
    return `${state} · ${matchSpeedMultiplier}× · R${Math.max(1, roundNumber)} · ${matchScoreLine(blueScore, redScore)} · ${blueAlive}v${redAlive} · ${formatLiveMatchClock()}`;
  }

  function syncMatchSpeedControls() {
    const accelerated = matchSpeedMultiplier > 1;
    document.body.dataset.matchSpeed = String(matchSpeedMultiplier);
    const label = `SPEED ${matchSpeedMultiplier}×`;
    for (const button of [matchSpeedBtn, portraitSpeedBtn, menuMatchSpeedBtn]) {
      if (!button) continue;
      button.textContent = label;
      button.classList.toggle('active', accelerated);
      button.setAttribute('aria-pressed', accelerated ? 'true' : 'false');
      button.setAttribute('aria-label', accelerated ? 'Return match speed to normal' : 'Fast forward match to double speed');
    }
    if (menuMatchSpeedBtn) {
      const unavailable = !liveMatchMenuActive() || matchEnding;
      menuMatchSpeedBtn.hidden = unavailable;
      menuMatchSpeedBtn.disabled = unavailable;
    }
  }

  function setMatchSpeed(multiplier = 1, announce = true) {
    const next = Number(multiplier) >= 2 ? 2 : 1;
    if (matchSpeedMultiplier === next) {
      syncMatchSpeedControls();
      return matchSpeedMultiplier;
    }
    if (typeof resetMatchClockAccumulator === 'function') resetMatchClockAccumulator('speed-change');
    matchSpeedMultiplier = next;
    combatDebug.fastForwardToggles++;
    syncMatchSpeedControls();
    syncLiveMenuControls();
    if (announce) showStatus(matchSpeedMultiplier > 1 ? 'FAST FORWARD · 2×' : 'MATCH SPEED · NORMAL');
    lastTime = performance.now();
    return matchSpeedMultiplier;
  }

  function toggleMatchSpeed() {
    if (matchEnding || (!canResumeMatch && appState !== 'match')) return matchSpeedMultiplier;
    return setMatchSpeed(matchSpeedMultiplier > 1 ? 1 : 2, true);
  }

  function syncLiveMenuControls() {
    const liveMenu = liveMatchMenuActive();
    syncMatchSpeedControls();
    document.body.dataset.matchSimulation = liveMenu ? (matchSimulationPaused ? 'paused' : 'running') : 'inactive';
    if (menuModeBadgeEl) menuModeBadgeEl.textContent = liveMenu ? (matchSimulationPaused ? 'PAUSED' : 'LIVE') : 'MAIN';
    if (managerStatusTextEl) managerStatusTextEl.textContent = liveMatchMenuStatus();
    if (menuMatchPauseBtn) {
      const unavailable = !liveMenu || matchEnding;
      menuMatchPauseBtn.hidden = unavailable;
      menuMatchPauseBtn.disabled = unavailable;
      menuMatchPauseBtn.classList.toggle('paused', matchSimulationPaused);
      menuMatchPauseBtn.setAttribute('aria-pressed', matchSimulationPaused ? 'true' : 'false');
      menuMatchPauseBtn.setAttribute('aria-label', matchSimulationPaused ? 'Resume live match' : 'Pause live match');
      menuMatchPauseBtn.textContent = matchSimulationPaused ? '▶  RESUME' : 'Ⅱ  PAUSE';
    }
  }

  function toggleMatchSimulationPause() {
    if (!liveMatchMenuActive() || matchEnding) return;
    matchSimulationPaused = !matchSimulationPaused;
    if (typeof resetMatchClockAccumulator === 'function') resetMatchClockAccumulator(matchSimulationPaused ? 'manual-pause' : 'manual-resume');
    liveMenuRefreshTimer = 0;
    syncLiveMenuControls();
    renderMenuContent();
    showStatus(matchSimulationPaused ? 'MATCH PAUSED' : 'MATCH LIVE');
    lastTime = performance.now();
  }

  function refreshLiveMenuTelemetry(dt) {
    if (!liveMatchMenuActive()) return;
    liveMenuRefreshTimer -= dt;
    syncLiveMenuControls();
    if (liveMenuRefreshTimer > 0) return;
    liveMenuRefreshTimer = 0.45;
    if (!['play', 'telemetry', 'profile'].includes(menuTab)) return;
    const scroller = menuContentEl?.closest('.menu-content');
    const scrollTop = scroller?.scrollTop || 0;
    renderMenuContent();
    if (scroller) scroller.scrollTop = scrollTop;
  }

  function updateMenuClubBrand(activeSectionMeta = null) {
    if (!menuClubBrandEl) return;
    const created = Boolean(careerState?.created);
    const sectionMeta = activeSectionMeta || (menuSections[menuSectionForRoute()] || menuSections.operations);
    const clubName = created ? String(careerState?.name || 'YOUR CLUB') : 'NEW CLUB';
    if (menuClubBrandLogoEl) menuClubBrandLogoEl.innerHTML = teamLogoSvg(careerState?.teamIdentity, 'menu-club-brand-logo-art');
    if (menuClubBrandNameEl) menuClubBrandNameEl.textContent = clubName;
    if (menuClubBrandMetaEl) menuClubBrandMetaEl.textContent = created ? (sectionMeta?.label || 'CLUB NAVIGATION') : 'CREATE TEAM';
    menuClubBrandEl.dataset.created = created ? 'true' : 'false';
    menuClubBrandEl.setAttribute('aria-label', created ? `${clubName} club identity` : 'Create your club identity');
  }

  function updateMenuUI() {
    const activeSection = menuSectionForRoute();
    if (menuShellEl) {
      menuShellEl.dataset.menuRoute = menuTab;
      menuShellEl.dataset.menuSection = activeSection;
      menuShellEl.dataset.tutorialStage = careerState.created && typeof teamTutorialStage === 'function' ? String(teamTutorialStage()) : '0';
    }
    const activeSectionMeta = menuSections[activeSection] || menuSections.operations;
    if (menuCommandKickerEl) menuCommandKickerEl.textContent = activeSectionMeta.commandKicker || `STRIKEWATCH // ${activeSectionMeta.label}`;
    if (menuCommandTitleEl) menuCommandTitleEl.textContent = activeSectionMeta.commandTitle || activeSectionMeta.label;
    if (menuCommandSubtitleEl) menuCommandSubtitleEl.textContent = activeSectionMeta.description;
    updateMenuClubBrand(activeSectionMeta);
    const guidance = firstMatchGuidance();
    const guidedSection = guidance?.section || '';
    if (menuShellEl) menuShellEl.dataset.guidedSection = guidedSection;
    menuTabs.forEach(btn => {
      const sectionId = btn.dataset.section || 'operations';
      const sectionAccess = progressiveSectionAccess(sectionId);
      const isGuided = Boolean(guidedSection) && sectionId === guidedSection;
      btn.classList.toggle('active', sectionId === activeSection);
      btn.classList.toggle('guided-target', isGuided);
      btn.classList.toggle('guided-muted', Boolean(guidedSection) && !isGuided && sectionId !== activeSection);
      btn.classList.toggle('foundation-locked', sectionAccess.state === 'locked');
      btn.classList.toggle('foundation-partial', sectionAccess.state === 'partial');
      let accessBadge = btn.querySelector('.menu-tab-access');
      if (!accessBadge) {
        accessBadge = document.createElement('span');
        accessBadge.className = 'menu-tab-access';
        btn.append(accessBadge);
      }
      accessBadge.hidden = sectionAccess.state === 'ready' || isGuided;
      accessBadge.textContent = sectionAccess.state === 'locked' ? 'LOCKED' : sectionAccess.label;
      accessBadge.dataset.state = sectionAccess.state;
      const section = menuSections[sectionId] || menuSections.operations;
      const accessContext = sectionAccess.state === 'ready' ? '' : `, ${sectionAccess.label.toLowerCase()}, ${sectionAccess.reason}`;
      btn.setAttribute('aria-label', `${section.label}${accessContext}`);
      btn.title = sectionAccess.state === 'ready' ? section.description : `${sectionAccess.label} · ${sectionAccess.reason}`;
    });
    updateMenuPrimaryBadges();
    renderMenuRouteLocator();
    renderMenuSubnav();
    renderMobileNavigation();
    const pauseMenu = liveMatchMenuActive();
    document.body.dataset.menuContext = menuContext;
    const menuMeta = menuTabMeta[menuTab] || menuTabMeta.play;
    if (menuHeaderTitleEl) menuHeaderTitleEl.textContent = menuMeta.title;
    if (managerBreadcrumbEl) managerBreadcrumbEl.textContent = `${menuSections[activeSection]?.label || 'OPERATIONS'} › ${menuMeta.title}`;
    syncLiveMenuControls();
    const blockers = careerState.created && typeof clubEndDayBlockers === 'function' ? clubEndDayBlockers() : [];
    const due = careerState.created && typeof clubLeagueMatchDue === 'function' && clubLeagueMatchDue();
    const tutorialDayRestriction = careerState.created && typeof openingWeekTutorialDayRestriction === 'function' ? openingWeekTutorialDayRestriction() : null;
    if (!pauseMenu && blockers.length && managerStatusTextEl) managerStatusTextEl.textContent = `MUST RESPOND · ${blockers.length} ITEM${blockers.length === 1 ? '' : 'S'}`;
    if (menuEndDayBtn) {
      const unavailable = pauseMenu || !careerState.created || appState === 'match' || matchmakingState?.active || Boolean(tutorialDayRestriction);
      menuEndDayBtn.hidden = pauseMenu;
      menuEndDayBtn.disabled = unavailable;
      menuEndDayBtn.classList.toggle('matchday', due && !blockers.length && !tutorialDayRestriction);
      menuEndDayBtn.classList.toggle('blocked', !unavailable && blockers.length > 0);
      menuEndDayBtn.classList.toggle('guided-lock', Boolean(tutorialDayRestriction));
      menuEndDayBtn.setAttribute('aria-disabled', unavailable ? 'true' : 'false');
      const currentDate = typeof clubCurrentDateLabel === 'function' ? clubCurrentDateLabel() : 'Current club day';
      const actionLabel = !careerState.created
        ? 'Create a team to begin the club calendar'
        : tutorialDayRestriction
          ? `${tutorialDayRestriction.title} · ${tutorialDayRestriction.detail}`
          : blockers.length
            ? `End day locked · open Operations overview · ${typeof clubEndDayBlockSummary === 'function' ? clubEndDayBlockSummary() : blockers[0].label}`
            : `End day · advance from ${currentDate}`;
      menuEndDayBtn.setAttribute('aria-label', actionLabel);
      menuEndDayBtn.title = actionLabel;
      if (managerDateDayEl) managerDateDayEl.textContent = tutorialDayRestriction ? 'NEXT DAY' : blockers.length ? 'END DAY LOCKED' : 'END DAY';
      const compactHeaderDate = typeof clubCurrentDateLabel === 'function' ? clubCurrentDateLabel(true) : currentDate;
      if (managerDateMetaEl) managerDateMetaEl.textContent = !careerState.created
        ? 'CREATE TEAM FIRST'
        : tutorialDayRestriction
          ? 'FINISH GUIDE'
          : blockers.length
            ? `${blockers.length} RESPONSE${blockers.length === 1 ? '' : 'S'}`
            : compactHeaderDate;
      if (managerEndDayBlockBadgeEl) {
        managerEndDayBlockBadgeEl.hidden = tutorialDayRestriction || blockers.length <= 0;
        managerEndDayBlockBadgeEl.textContent = blockers.length > 9 ? '9+' : String(blockers.length);
      }
    }
    if (managerMailBtn) {
      const unreadMail = careerState.created && typeof clubUnreadMailCount === 'function' ? clubUnreadMailCount() : 0;
      managerMailBtn.disabled = !careerState.created;
      managerMailBtn.classList.toggle('has-unread', unreadMail > 0);
      managerMailBtn.classList.toggle('active', menuTab === 'mail');
      managerMailBtn.setAttribute('aria-label', unreadMail > 0 ? `Open club inbox · ${unreadMail} unread` : 'Open club inbox');
      managerMailBtn.title = unreadMail > 0 ? `${unreadMail} unread club message${unreadMail === 1 ? '' : 's'}` : 'Open club inbox';
      if (managerMailBadgeEl) {
        managerMailBadgeEl.hidden = unreadMail <= 0;
        managerMailBadgeEl.textContent = unreadMail > 99 ? '99+' : String(unreadMail);
      }
    }
    if (managerCalendarBtn) {
      const todayEvents = careerState.created && typeof clubCalendarTodayEventCount === 'function' ? clubCalendarTodayEventCount() : 0;
      managerCalendarBtn.disabled = !careerState.created;
      managerCalendarBtn.classList.toggle('active', menuTab === 'calendar');
      managerCalendarBtn.classList.toggle('has-events', todayEvents > 0);
      managerCalendarBtn.setAttribute('aria-label', todayEvents > 0 ? `Open club calendar · ${todayEvents} event${todayEvents === 1 ? '' : 's'} today` : 'Open club calendar');
      managerCalendarBtn.title = todayEvents > 0 ? `${todayEvents} calendar event${todayEvents === 1 ? '' : 's'} today` : 'Open club calendar';
      if (managerCalendarBadgeEl) {
        managerCalendarBadgeEl.hidden = todayEvents <= 0;
        managerCalendarBadgeEl.textContent = todayEvents > 9 ? '9+' : String(todayEvents);
      }
    }
    if (managerOperatorNameEl) managerOperatorNameEl.textContent = careerState.created ? careerGoldCoins(careerState.goldCoins) : '0 GC';
    if (managerOperatorLevelEl) managerOperatorLevelEl.textContent = careerState.created ? 'TAP FOR ACCOUNT & LEDGER' : 'CREATE TEAM TO EARN COINS';
    if (managerGoldBtn) {
      managerGoldBtn.disabled = !careerState.created;
      managerGoldBtn.classList.toggle('active', menuTab === 'gold');
      managerGoldBtn.setAttribute('aria-label', careerState.created ? `Open Gold Coin account · ${careerGoldCoins(careerState.goldCoins)} available` : 'Create a team to earn Gold Coins');
      managerGoldBtn.title = careerState.created ? 'Open Gold Coin earnings and spending account' : 'Create a team to earn Gold Coins';
    }
    if (resumeBtn) resumeBtn.hidden = !pauseMenu;
    if (returnToMatchBtn) returnToMatchBtn.hidden = !pauseMenu;
    if (startMatchBtn) {
      const deployLabel = careerDeployLabel();
      // Build 12.140: the truthful state used to live only in the title
      // attribute, which is invisible on touch and easy to miss on desktop, so
      // the control read as "MATCH" even when it could only refuse. Show it.
      const launch = typeof careerMatchLaunchState === 'function' ? careerMatchLaunchState() : { ready: true, short: '' };
      startMatchBtn.hidden = pauseMenu || !careerState.created;
      startMatchBtn.classList.toggle('needs-squad', careerState.created && !careerSquadReady());
      startMatchBtn.classList.toggle('matchday', Boolean(due));
      startMatchBtn.classList.toggle('active', menuTab === 'play');
      startMatchBtn.classList.toggle('blocked', careerState.created && !launch.ready);
      startMatchBtn.setAttribute('aria-label', deployLabel);
      startMatchBtn.title = deployLabel;
      const stateLabel = startMatchBtn.querySelector('.manager-topbar-action-state');
      if (stateLabel) {
        stateLabel.textContent = careerState.created ? launch.short : '';
        stateLabel.hidden = !careerState.created || !launch.short;
      }
    }
    syncMobilePageHelp({ persist: false });
    if (exitToMenuBtn) exitToMenuBtn.hidden = !pauseMenu;
    if (menuNavigationIndex < 0) resetMenuNavigationHistory(menuTab);
    else syncMenuHistoryControls();
    renderMenuContent();
    if (typeof syncCareerCrateCanvasHost === 'function') syncCareerCrateCanvasHost();
  }

  function openPauseMenu(requestedPlayerId = null) {
    if (typeof newPlayerDemoState !== 'undefined' && newPlayerDemoState.active) {
      renderNewPlayerDemoCoach();
      showStatus('FINISH OR SKIP THE GUIDED DEMO FIRST');
      return;
    }
    ensureAudio();
    menuContext = 'pause';
    canResumeMatch = true;
    matchSimulationPaused = false;
    const viewedBot = bots[spectatorIndex] || null;
    const requestedPlayer = requestedPlayerId ? (careerState.squad || []).find(player => player.id === requestedPlayerId) || null : null;
    const viewedPlayer = requestedPlayer || (viewedBot?.team === CAREER_OWNED_TEAM && viewedBot.playerProfileId
      ? (careerState.squad || []).find(player => player.id === viewedBot.playerProfileId) || null
      : null);
    if (viewedPlayer) {
      selectedTeamPlayerId = viewedPlayer.id;
      careerState.selectedPlayerId = viewedPlayer.id;
      menuTab = 'profile';
      lastLiveMenuTab = 'profile';
      saveCareerState();
    } else {
      menuTab = ['play', 'telemetry', 'reports', 'profile'].includes(lastLiveMenuTab) ? lastLiveMenuTab : 'play';
    }
    liveMenuRefreshTimer = 0;
    hideStatus();
    roundResultEl.classList.remove('show');
    setAppState('menu');
    resetMenuNavigationHistory(menuTab);
    updateMenuUI();
    resetMenuScroll();
    lastTime = performance.now();
  }

  function resumeMatch() {
    resumeAudioFromGesture();
    if (typeof resetMatchClockAccumulator === 'function') resetMatchClockAccumulator('resume-match');
    matchSimulationPaused = false;
    document.body.dataset.matchSimulation = 'running';
    setAppState('match');
    stabiliseMatchRenderViewport();
    updateMenuUI();
    lastTime = performance.now();
  }

  function exitToMainMenu() {
    if (typeof resetMatchClockAccumulator === 'function') resetMatchClockAccumulator('exit-match');
    createMatch();
    menuContext = 'main';
    canResumeMatch = false;
    matchSimulationPaused = false;
    setMatchSpeed(1, false);
    menuTab = 'play';
    setAppState('menu');
    updateMenuUI();
    resetMenuScroll();
    lastTime = performance.now();
  }

  function startNewMatch(modeOverride = null) {
    if (!careerState.created) {
      menuTab = 'play';
      updateMenuUI();
      return;
    }
    if (!careerSquadReady()) {
      setMenuRoute('market');
      showStatus(`RECRUIT ${TEAM_REQUIRED_STARTERS - careerState.squad.length} MORE OPERATOR${TEAM_REQUIRED_STARTERS - careerState.squad.length === 1 ? '' : 'S'}`, { tone: 'blocked' });
      return;
    }
    if (matchmakingState.active || deploymentSelectionState.active) return;
    if (typeof clubApplyAssistantLineup === 'function' && careerState.tactics?.lineupMode === 'assistant' && careerState.tactics?.autoApplyBeforeMatch !== false) {
      clubApplyAssistantLineup(false);
    }
    if (!(careerBetweenRounds && !careerMatchComplete) && typeof clubMatchPlanConfirmed === 'function' && !clubMatchPlanConfirmed()) {
      setMenuRoute('tactics');
      showStatus('CONFIRM YOUR MATCH PLAN BEFORE MATCHMAKING CAN BEGIN', { tone: 'blocked' });
      return;
    }
    resumeAudioFromGesture();
    if (careerBetweenRounds && !careerMatchComplete) {
      if (!betweenRoundTacticsState.resolved) {
        canResumeMatch = true;
        menuContext = 'pause';
        matchSimulationPaused = false;
        setAppState('match');
        stabiliseMatchRenderViewport();
        openBetweenRoundTactics();
        updateMenuUI();
        lastTime = performance.now();
        return;
      }
      startRound();
      spectatorIndex = ownedOperatorIndex();
      autoSpectate = false;
      autoTimer = 999;
      canResumeMatch = true;
      menuContext = 'pause';
      matchSimulationPaused = false;
      setAppState('match');
      stabiliseMatchRenderViewport();
      updateMenuUI();
      lastTime = performance.now();
      return;
    }
    if (typeof prepareCareerMatchContext === 'function') {
      const prepared = prepareCareerMatchContext(modeOverride);
      if (!prepared?.ok) {
        // Build 12.140: send the manager to the control that clears the
        // blocker. Routing every refusal to the league table left the actual
        // requirement — usually END DAY — unstated and unreachable.
        const launch = typeof careerMatchLaunchState === 'function' ? careerMatchLaunchState() : null;
        setMenuRoute(launch && !launch.ready ? launch.route : 'league');
        showStatus(String(launch && !launch.ready ? launch.reason : (prepared?.reason || 'LEAGUE FIXTURE UNAVAILABLE')).toUpperCase(), { tone: 'blocked' });
        return;
      }
    }
    completeTeamTutorialOnDeploy();
    beginMatchmaking();
  }

  function updateMenu(dt) {
    menuTime += dt;
    // Build 12.137: re-offer a victory crate that was never claimed. Held back
    // while the after-action report is on screen so it still arrives in its
    // normal place in the flow.
    if (typeof queuePendingMatchCrate === 'function' && careerReportState.phase === 'idle') queuePendingMatchCrate();
    updateMatchmaking(dt);
    updateCareerWeaponViewer(dt);
    updateCareerArmourViewer(dt);
    refreshLiveMenuTelemetry(dt);
  }

  function getMenuCamera() {
    const points = menuFlyPoints;
    if (!points.length) {
      return { x: MAP_W * 0.5, y: MAP_H * 0.5, angle: 0, alive: false, motion: 0, moveVelocity: 0, walkCycle: 0, recoil: 0, crouchBlend: 0, hurt: 0 };
    }
    const safeMenuTime = Number.isFinite(menuTime) ? menuTime : 0;
    const scaled = ((safeMenuTime * 0.085) % points.length + points.length) % points.length;
    const index = Math.floor(scaled) % points.length;
    const nextIndex = (index + 1) % points.length;
    const t = scaled - Math.floor(scaled);
    const eased = t * t * (3 - 2 * t);
    const a = points[index] || points[0];
    const b = points[nextIndex] || a;
    return {
      x: lerp(a.x, b.x, eased),
      y: lerp(a.y, b.y, eased),
      angle: lerpAngle(a.angle, b.angle, eased),
      alive: false,
      motion: 0,
      moveVelocity: 0,
      walkCycle: menuTime * 0.4,
      recoil: 0,
      crouchBlend: 0,
      hurt: 0
    };
  }

  function sortTeamForScoreboard(team) {
    return bots
      .filter(bot => bot.team === team)
      .slice()
      .sort((a, b) => (b.kills - a.kills) || (a.deaths - b.deaths) || (b.health - a.health) || a.name.localeCompare(b.name));
  }

  function renderScoreboardRows(container, team) {
    if (!container) return;
    const rows = sortTeamForScoreboard(team).map(bot => {
      const status = bot.alive ? botTacticalStatus(bot, true) : 'ELIMINATED';
      const hp = bot.alive ? Math.max(0, Math.ceil(bot.health)) : 0;
      const botIndex = bots.indexOf(bot);
      const selected = botIndex === spectatorIndex;
      const ownTeam = team === CAREER_OWNED_TEAM;
      const selectable = ownTeam && Boolean(bot.playerProfileId);
      const interactive = selectable ? ' role="button" tabindex="0"' : '';
      const title = selectable ? `Open telemetry for ${escapeCareerHtml(bot.name)}` : (bot.alive ? `${escapeCareerHtml(bot.name)} is opposition` : `${escapeCareerHtml(bot.name)} is eliminated`);
      return `<div class="scoreboard-row ${bot.alive ? 'alive' : 'dead'} ${selectable ? 'selectable' : 'opposition'} ${selected ? 'spectating' : ''}" data-scoreboard-team="${team}" data-scoreboard-slot="${bot.slot}" aria-label="${title}"${interactive}>
        <span class="name"><i class="scoreboard-life-indicator ${bot.alive ? 'alive' : 'dead'}" aria-label="${bot.alive ? 'Alive' : 'Eliminated'}"></i><b>${escapeCareerHtml(bot.name)}</b></span>
        <span>${bot.kills}</span>
        <span>${bot.deaths}</span>
        <span>${hp}</span>
        <span class="status">${status}</span>
        <span class="weapon">${escapeCareerHtml(bot.weapon ? `${bot.weapon.name} · ${weaponRangeDescriptor(bot.weapon).label}` : '—')}</span>
      </div>`;
    }).join('');
    container.innerHTML = rows;
  }

  function selectScoreboardOperator(team, slot) {
    const targetTeam = Number(team) === TEAM_RED ? TEAM_RED : TEAM_BLUE;
    if (targetTeam !== CAREER_OWNED_TEAM) return false;
    const targetSlot = clamp(Math.floor(Number(slot) || 0), 0, 4);
    const index = bots.findIndex(bot => bot.team === targetTeam && bot.slot === targetSlot);
    const bot = index >= 0 ? bots[index] : null;
    const playerId = bot?.playerProfileId || careerState.squad?.[targetSlot]?.id || null;
    if (!playerId || !(careerState.squad || []).some(player => player.id === playerId)) return false;
    if (bot?.alive) spectatorIndex = index;
    autoSpectate = false;
    autoTimer = 999;
    if (autoBtn) autoBtn.textContent = 'AUTO: OFF';
    closeScoreboard();
    openPauseMenu(playerId);
    return true;
  }

  function updateScoreboard() {
    if (!scoreboardTitleEl) return;
    const blueAlive = teamAliveCount(TEAM_BLUE);
    const redAlive = teamAliveCount(TEAM_RED);
    const blueKills = bots.filter(b => b.team === TEAM_BLUE).reduce((sum, b) => sum + b.kills, 0);
    const redKills = bots.filter(b => b.team === TEAM_RED).reduce((sum, b) => sum + b.kills, 0);
    const blueCriticals = bots.filter(b => b.team === TEAM_BLUE).reduce((sum, b) => sum + (b.roundCriticalHits || 0), 0);
    const redCriticals = bots.filter(b => b.team === TEAM_RED).reduce((sum, b) => sum + (b.roundCriticalHits || 0), 0);
    const blueClub = matchTeamIdentity(TEAM_BLUE);
    const redClub = matchTeamIdentity(TEAM_RED);
    const m = Math.max(0, Math.floor(roundTime / 60)).toString().padStart(2, '0');
    const s = Math.max(0, Math.floor(roundTime % 60)).toString().padStart(2, '0');
    if (scoreboardCompetitionEl) scoreboardCompetitionEl.textContent = matchCompetitionShortLabel();
    scoreboardTitleEl.textContent = `${matchScoreLine(blueScore, redScore)} · ROUND ${Math.max(1, roundNumber)}`;
    scoreboardSummaryEl.textContent = suddenHuntOvertime
      ? `SUDDEN HUNT ${m}:${s} · elimination required · select a player from your club to open telemetry`
      : `Time remaining ${m}:${s} · first to ${matchTarget} · select a player from your club to open telemetry`;
    if (scoreboardBlueNameEl) {
      const blueLabel = `${blueClub.side} · ${blueClub.name}`;
      scoreboardBlueNameEl.innerHTML = careerState?.created && typeof teamLogoSvg === 'function'
        ? `${teamLogoSvg(careerState.teamIdentity, 'scoreboard-team-logo')}<span>${escapeCareerHtml(blueLabel)}</span>`
        : escapeCareerHtml(blueLabel);
    }
    if (scoreboardRedNameEl) scoreboardRedNameEl.textContent = `${redClub.side} · ${redClub.name}`;
    scoreboardBlueSummaryEl.textContent = `${blueAlive} ALIVE · ${blueKills} KILLS · ${blueCriticals} CRITS`;
    scoreboardRedSummaryEl.textContent = `${redAlive} ALIVE · ${redKills} KILLS · ${redCriticals} CRITS`;
    renderScoreboardRows(scoreboardBlueRowsEl, TEAM_BLUE);
    renderScoreboardRows(scoreboardRedRowsEl, TEAM_RED);
  }

  function setUiButtonsHidden(hidden, announce = false) {
    uiButtonsHidden = !!hidden;
    document.body.dataset.uiButtons = uiButtonsHidden ? 'hidden' : 'visible';
    if (showUiBtn) {
      showUiBtn.hidden = true;
      showUiBtn.setAttribute('aria-hidden', 'true');
    }
    if (uiToggleBtn) {
      uiToggleBtn.textContent = uiButtonsHidden ? 'SHOW UI' : 'HIDE UI';
      uiToggleBtn.setAttribute('aria-pressed', uiButtonsHidden ? 'true' : 'false');
      uiToggleBtn.setAttribute('aria-label', uiButtonsHidden ? 'Show spectator panels' : 'Hide spectator panels');
    }
    if (uiButtonsHidden) {
      closeScoreboard();
      if (announce) showStatus('SPECTATOR PANELS HIDDEN');
    } else if (announce) {
      showStatus('SPECTATOR PANELS RESTORED');
    }
  }

  function openScoreboard() {
    if (appState !== 'match') return;
    if (typeof closeLiveCommandPulsePanel === 'function') closeLiveCommandPulsePanel();
    scoreboardOpen = true;
    document.body.dataset.scoreboard = 'open';
    updateScoreboard();
    if (scoreboardOverlayEl) scoreboardOverlayEl.hidden = false;
  }

  function closeScoreboard() {
    scoreboardOpen = false;
    document.body.dataset.scoreboard = 'closed';
    if (scoreboardOverlayEl) scoreboardOverlayEl.hidden = true;
  }

  function toggleUiButtons() {
    setUiButtonsHidden(!uiButtonsHidden, true);
  }

  function updateOwnedOperatorTelemetry() {
    if (!ownedTelemetryEl) return;
    // The live stat card must always describe the camera subject. It previously
    // preferred the player selected in Command HQ, which could leave one name in
    // PLAYER LINK while the spectator card and camera followed somebody else.
    const viewed = bots[spectatorIndex] || null;
    const owned = viewed && viewed.team === CAREER_OWNED_TEAM ? viewed : null;
    const visible = appState === 'match' && careerState.created && Boolean(owned);
    ownedTelemetryEl.hidden = !visible;
    ownedTelemetryEl.dataset.playerId = owned?.playerProfileId || '';
    ownedTelemetryEl.setAttribute('aria-label', visible ? `${owned.name} live spectator telemetry` : 'Spectated player live telemetry');
    if (portraitOwnedTelemetryEl) {
      portraitOwnedTelemetryEl.hidden = !visible;
      portraitOwnedTelemetryEl.dataset.playerId = owned?.playerProfileId || '';
    }
    if (!visible) return;
    const maxHealth = Math.max(1, owned.maxHealth || 100);
    const health = owned.alive ? Math.max(0, Math.ceil(owned.health)) : 0;
    const shots = owned.roundShotsFired || 0;
    const hits = owned.roundShotsHit || 0;
    const accuracy = shots > 0 ? Math.round(hits / shots * 100) : 0;
    const roundKills = Math.max(0, owned.kills || 0);
    const roundDeaths = Math.max(0, owned.deaths || 0);
    if (ownedTelemetryNameEl) ownedTelemetryNameEl.textContent = owned.name;
    if (ownedTelemetryStatusEl) {
      ownedTelemetryStatusEl.textContent = ownedOperatorBehaviour(owned);
      ownedTelemetryStatusEl.classList.toggle('down', !owned.alive);
    }
    if (ownedTelemetryHealthEl) {
      const armourText = owned.armourId && owned.armourId !== 'none' ? ` · ARM ${Math.ceil(owned.armourDurability || 0)}/${Math.ceil(owned.armourMaxDurability || 0)}` : '';
      ownedTelemetryHealthEl.textContent = `${health} / ${maxHealth}${armourText}`;
    }
    if (ownedTelemetryHealthBarEl) ownedTelemetryHealthBarEl.style.width = `${Math.round(clamp(health / maxHealth, 0, 1) * 100)}%`;
    if (ownedTelemetryAccuracyEl) ownedTelemetryAccuracyEl.textContent = `${accuracy}%`;
    if (ownedTelemetryAccuracyBarEl) ownedTelemetryAccuracyBarEl.style.width = `${accuracy}%`;
    if (ownedTelemetryDamageEl) ownedTelemetryDamageEl.textContent = Math.round(owned.roundDamageDealt || 0);
    if (ownedTelemetryKdEl) ownedTelemetryKdEl.textContent = `${roundKills} / ${roundDeaths}`;
    if (ownedTelemetryWeaponEl) ownedTelemetryWeaponEl.textContent = owned.weapon?.name || getCareerWeapon().name;
    if (ownedTelemetryBehaviourEl) ownedTelemetryBehaviourEl.textContent = owned.target ? `${botTacticalStatus(owned, true)} · ${owned.target.name}` : `${botTacticalStatus(owned, true)} · ${levelZoneAt(owned.x, owned.y).short}`;
    const decision = typeof botDecisionExplanation === 'function' ? botDecisionExplanation(owned) : null;
    if (decision) {
      if (ownedDecisionActionEl) ownedDecisionActionEl.textContent = decision.action;
      if (ownedDecisionReasonEl) ownedDecisionReasonEl.textContent = decision.reason;
      if (ownedDecisionTargetEl) ownedDecisionTargetEl.textContent = decision.target;
      if (ownedDecisionRangeEl) ownedDecisionRangeEl.textContent = decision.range;
      if (ownedDecisionInstructionEl) ownedDecisionInstructionEl.textContent = decision.instruction;
      if (ownedDecisionRouteEl) ownedDecisionRouteEl.textContent = decision.route;
    }
    if (portraitOwnedTelemetryEl) portraitOwnedTelemetryEl.hidden = false;
    if (portraitOwnedNameEl) portraitOwnedNameEl.textContent = owned.name;
    if (portraitOwnedStatusEl) portraitOwnedStatusEl.textContent = ownedOperatorBehaviour(owned);
    if (portraitOwnedMetricsEl) {
      const armourText = owned.armourId && owned.armourId !== 'none' ? ` · ${owned.armourBroken ? 'ARM BROKEN' : `ARM ${Math.ceil(owned.armourDurability || 0)}`}` : '';
      portraitOwnedMetricsEl.textContent = `${health} HP${armourText} · ${Math.round(owned.roundDamageDealt || 0)} DMG · ${accuracy}% ACC`;
    }
    if (portraitOwnedReasonEl && decision) portraitOwnedReasonEl.textContent = `${decision.action} · ${decision.route}`;
  }

  function botSpecialityLabel(bot) {
    if (!bot || typeof teamRoleById !== 'function') return 'OPERATOR';
    const ownedProfile = bot.team === CAREER_OWNED_TEAM ? careerState.squad?.[bot.slot] : null;
    const roleId = bot.playerRole || ownedProfile?.role || bot.simulatedProfile?.role || bot.simulatedProfile?.primaryRole || '';
    if (!roleId) return 'OPERATOR';
    const role = teamRoleById(roleId);
    return role?.name ? role.name.toUpperCase() : 'OPERATOR';
  }
  function spectatorHealthColour(current, maximum = 100) {
    const ratio = clamp(Number(current) / Math.max(1, Number(maximum) || 100), 0, 1);
    if (ratio >= 0.5) {
      const t = (ratio - 0.5) / 0.5;
      const r = Math.round(244 + (103 - 244) * t);
      const g = Math.round(185 + (215 - 185) * t);
      const b = Math.round(66 + (155 - 66) * t);
      return `rgb(${r}, ${g}, ${b})`;
    }
    const t = ratio / 0.5;
    const r = Math.round(255 + (244 - 255) * t);
    const g = Math.round(104 + (185 - 104) * t);
    const b = Math.round(104 + (66 - 104) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }
  function spectatorIntentLabel(bot) {
    if (!bot) return 'NO OPERATOR LINK';
    if (!bot.alive) return 'ELIMINATED · WAITING FOR NEXT ROUND';
    if (bot.weaponSwapTimer > 0) return `SWITCHING TO ${bot.weaponSwapTarget ? 'SIDEARM' : 'PRIMARY WEAPON'}`;
    if (bot.reloadTimer > 0) return bot.reloadCoverRequired || bot.reloadCoverCommitActive ? 'RELOADING WHILE SEEKING COVER' : 'RELOADING WEAPON';
    if (bot.target) return `ENGAGING KNOWN OPPONENT · ${Math.max(1, Math.round(dist(bot, bot.target)))}M`;
    if (bot.lastSeen) return 'REPOSITIONING TO LAST KNOWN CONTACT';
    if (bot.heardSound) return `INVESTIGATING ${String(bot.heardSound.type || 'TACTICAL SOUND').toUpperCase()}`;
    if (bot.reloadCoverCommitActive) return 'MOVING TO PROTECTED COVER';
    if (bot.lateRoundGoal || suddenHuntOvertime) return 'SEARCHING FOR THE LAST OPPOSING OPERATOR';
    if (bot.mapRotationGoal) return 'ROTATING ALONG THE OPENING PLAN';
    if (bot.playerRole === 'flanker' && Array.isArray(bot.path) && bot.path.length > bot.pathIndex + 1) return 'TAKING A WIDE FLANKING ROUTE';
    if (bot.coverHoldTimer > 0 || bot.crouched) return 'HOLDING COVER AND WATCHING AN ANGLE';
    if (bot.objective) {
      const zone = levelZoneAt(bot.objective.x, bot.objective.y);
      return `MOVING TO ASSIGNED ZONE · ${String(zone?.short || zone?.name || 'TACTICAL POSITION').toUpperCase()}`;
    }
    return 'MAINTAINING TEAM SHAPE';
  }

  function liveMatchObjectiveText() {
    const blueAlive = teamAliveCount(CAREER_OWNED_TEAM);
    const enemyTeam = CAREER_OWNED_TEAM === TEAM_BLUE ? TEAM_RED : TEAM_BLUE;
    const redAlive = teamAliveCount(enemyTeam);
    if (typeof newPlayerDemoState !== 'undefined' && newPlayerDemoState.active && newPlayerDemoState.roundFinished) return 'DEMO ROUND COMPLETE · CONTINUE TO RECRUITMENT';
    if (matchEnding) return redAlive <= 0 ? 'MATCH WON · REVIEW THE AFTER ACTION REPORT' : 'MATCH COMPLETE · REVIEW THE AFTER ACTION REPORT';
    if (roundEnding) return 'ROUND COMPLETE · REVIEW THE RESULT';
    if (suddenHuntOvertime) return `SUDDEN HUNT · FIND ${redAlive || 1} REMAINING OPPONENT${redAlive === 1 ? '' : 'S'}`;
    if (blueAlive <= 1 && redAlive > 1) return `SURVIVE THE CLUTCH · ${blueAlive} VS ${redAlive}`;
    if (redAlive <= 1) return `LOCATE AND ELIMINATE THE LAST OPPOSING OPERATOR`;
    return `ELIMINATE ALL FIVE OPPOSING OPERATORS · ${redAlive} REMAIN`;
  }

  function liveMatchPlanText() {
    if (typeof newPlayerDemoState !== 'undefined' && newPlayerDemoState.active) {
      return 'GUIDED ORIENTATION · WATCH HOW AUTONOMOUS OPERATORS MOVE, AIM, TAKE COVER AND ENGAGE';
    }
    const plan = typeof clubActiveMatchPlan === 'function' ? clubActiveMatchPlan() : null;
    const opening = currentEngagementPlan?.name || plan?.openingPlanName || 'DYNAMIC OPENING';
    const approach = plan?.approachName || 'BALANCED';
    const engagement = plan?.engagementName || 'MIXED RANGE';
    const priority = plan?.priorityName || 'TRADE ELIMINATIONS';
    return `AUTONOMOUS OPERATORS · ${String(opening).toUpperCase()} · ${String(approach).toUpperCase()} · ${String(engagement).toUpperCase()} · ${String(priority).toUpperCase()}`;
  }

  function updateHud() {
    const b = bots[spectatorIndex];
    if (!b) return;
    autoBtn.textContent = `AUTO: ${autoSpectate ? 'ON' : 'OFF'}`;
    spectatorNameEl.textContent = b.name;
    if (spectatorIntentEl) spectatorIntentEl.textContent = spectatorIntentLabel(b);
    if (matchObjectiveTextEl) matchObjectiveTextEl.textContent = liveMatchObjectiveText();
    if (matchPlanTextEl) matchPlanTextEl.textContent = liveMatchPlanText();
    if (matchObjectiveEl) matchObjectiveEl.hidden = false;
    spectatorNameEl.style.color = TEAM_COLOURS[b.team];
    spectatorEl.style.setProperty('--team-colour', TEAM_COLOURS[b.team]);
    const viewedClub = matchTeamIdentity(b.team);
    const blueClub = matchTeamIdentity(TEAM_BLUE);
    const redClub = matchTeamIdentity(TEAM_RED);
    const specialityLabel = botSpecialityLabel(b);
    teamTextEl.textContent = `${viewedClub.name} · ${specialityLabel}`;
    kdTextEl.textContent = `${b.kills} K / ${b.deaths} D`;
    const ammoText = Number.isFinite(b.magAmmo) ? ` · ${b.magAmmo}/${b.currentReserve()}` : '';
    const rangeLabel = weaponRangeDescriptor(b.weapon).label;
    const weaponSlotLabel = b.hasDedicatedPrimary ? (b.usingSecondary ? 'SIDEARM' : 'PRIMARY') : 'SIDEARM';
    weaponTextEl.textContent = `${weaponSlotLabel} · ${b.weapon.name} · ${rangeLabel}${ammoText}${b.reloadTimer > 0 ? ' · RELOADING' : (b.crouched ? ' · CROUCHED' : '')}`;
    const zone = levelZoneAt(b.x, b.y);
    if (mapModeEl) mapModeEl.textContent = matchCompetitionShortLabel();
    if (mapNameEl) mapNameEl.textContent = zone.name;
    if (mapDescEl) mapDescEl.textContent = `${viewedClub.short} · ${activeArenaMeta().name} · ${zone.short} · BUILD ${BUILD_VERSION}`;
    const healthRatio = clamp(b.health / Math.max(1, b.maxHealth || 100), 0, 1);
    const healthColour = spectatorHealthColour(b.health, b.maxHealth || 100);
    healthBarEl.style.transform = `scaleX(${healthRatio})`;
    healthBarEl.style.background = `linear-gradient(90deg, ${healthColour}, ${healthColour})`;
    if (healthTextEl) {
      healthTextEl.textContent = `${Math.max(0, Math.ceil(b.health))} HP`;
      healthTextEl.style.color = healthColour;
    }
    if (armourHudEl && armourBarEl && armourTextEl) {
      const hasArmour = Boolean(b.armourId && b.armourId !== 'none');
      armourHudEl.hidden = !hasArmour;
      if (hasArmour) {
        const armourMax = Math.max(1, Number(b.armourMaxDurability) || 1);
        const armourCurrent = Math.max(0, Number(b.armourDurability) || 0);
        const armourRatio = clamp(armourCurrent / armourMax, 0, 1);
        armourTextEl.textContent = b.armourBroken ? 'ARMOUR BROKEN' : `${Math.ceil(armourCurrent)} / ${Math.ceil(armourMax)} ARMOUR`;
        armourBarEl.style.transform = `scaleX(${armourRatio})`;
        armourBarEl.style.background = b.armourBroken || armourRatio <= 0.2
          ? 'linear-gradient(90deg,#d94242,#f28f66)'
          : armourRatio <= 0.5
            ? 'linear-gradient(90deg,#d39a45,#f2c14e)'
            : 'linear-gradient(90deg,#4f93bf,#8fd7ff)';
        armourHudEl.title = `${b.armourName || 'Body armour'} · torso protection · integrity persists across rounds`;
      }
    }
    blueScoreEl.textContent = blueScore;
    redScoreEl.textContent = redScore;
    const blueAlive = teamAliveCount(TEAM_BLUE);
    const redAlive = teamAliveCount(TEAM_RED);
    const alivePips = count => `${'●'.repeat(count)}${'○'.repeat(Math.max(0, 5 - count))}`;
    blueAliveEl.textContent = `${alivePips(blueAlive)}  ${blueAlive}`;
    redAliveEl.textContent = `${redAlive}  ${alivePips(redAlive)}`;
    blueAliveEl.setAttribute('aria-label', `${blueAlive} ${blueClub.name} operators alive`);
    redAliveEl.setAttribute('aria-label', `${redAlive} ${redClub.name} operators alive`);
    if (roundPanelEl) roundPanelEl.title = `${blueClub.name} vs ${redClub.name} · tap to open scoreboard`;
    roundLabelEl.textContent = `ROUND ${Math.max(1, roundNumber)}`;
    roundTargetEl.textContent = suddenHuntOvertime
      ? 'SUDDEN HUNT'
      : (typeof newPlayerDemoState !== 'undefined' && newPlayerDemoState.active ? 'DEMO · ONE ROUND' : `FIRST TO ${matchTarget}`);
    const matchPoint = Math.max(blueScore, redScore) === matchTarget - 1;
    roundPanelEl.classList.toggle('match-point', matchPoint);
    const m = Math.max(0, Math.floor(roundTime / 60));
    const s = Math.max(0, Math.floor(roundTime % 60)).toString().padStart(2, '0');
    timerEl.textContent = `${m.toString().padStart(2, '0')}:${s}`;
    if (portraitSpectatorNameEl) {
      portraitSpectatorNameEl.textContent = b.name;
      portraitSpectatorNameEl.style.color = TEAM_COLOURS[b.team];
    }
    if (portraitTeamTextEl) portraitTeamTextEl.textContent = `${viewedClub.name} · ${specialityLabel}`;
    if (portraitHealthTextEl) {
      const armourText = b.armourId && b.armourId !== 'none' ? ` · ${b.armourBroken ? 'ARM BROKEN' : `ARM ${Math.ceil(b.armourDurability || 0)}`}` : '';
      portraitHealthTextEl.textContent = `${Math.max(0, Math.ceil(b.health))} HP${armourText}`;
      portraitHealthTextEl.style.color = healthColour;
    }
    if (portraitWeaponTextEl) portraitWeaponTextEl.textContent = weaponTextEl.textContent;
    if (portraitRoundTextEl) portraitRoundTextEl.textContent = `${suddenHuntOvertime ? 'SUDDEN HUNT' : `ROUND ${Math.max(1, roundNumber)}`} · ${matchScoreLine(blueScore, redScore)} · ${m.toString().padStart(2, '0')}:${s}`;
    if (portraitAutoBtn) portraitAutoBtn.textContent = `AUTO: ${autoSpectate ? 'ON' : 'OFF'}`;
    updateOwnedOperatorTelemetry();
    syncMatchSpeedControls();
    if (scoreboardOpen) updateScoreboard();
  }
