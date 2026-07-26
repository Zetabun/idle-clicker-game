/*
 * Strikewatch source module: 32-tactical-minimap.js
 * Purpose: Mobile tactical minimap rendering and visibility controls for every arena.
 *
 * This file is a source fragment. Run `python3 build.py` to regenerate
 * js/strikewatch.dev.js and the standalone release in dist/.
 */

  let tacticalMinimapVisible = false;
  let tacticalMinimapLastRenderAt = -Infinity;
  let tacticalMinimapRenderCount = 0;

  const TACTICAL_MINIMAP_PROP_PRESENTATION = Object.freeze({
    officeFurniture: Object.freeze({ fill: 'rgba(198,210,214,.18)', stroke: 'rgba(222,232,235,.24)', lineWidth: 0.65, opacity: 0.18 }),
    officeRoundProp: Object.freeze({ fill: 'rgba(198,218,207,.24)', stroke: 'rgba(222,235,229,.28)', lineWidth: 0.65, opacity: 0.24 }),
    summitFurniture: Object.freeze({ fill: 'rgba(174,211,214,.28)', stroke: 'rgba(71,202,207,.34)', lineWidth: 0.65, opacity: 0.28 }),
    summitRoundProp: Object.freeze({ fill: 'rgba(238,177,82,.34)', stroke: 'rgba(255,202,111,.42)', lineWidth: 0.65, opacity: 0.34 }),
    desertFurniture: Object.freeze({ fill: 'rgba(112,72,38,.42)', stroke: 'rgba(224,178,105,.58)', lineWidth: 0.65, opacity: 0.42 }),
    desertRoundProp: Object.freeze({ fill: 'rgba(91,117,52,.46)', stroke: 'rgba(205,181,102,.66)', lineWidth: 0.65, opacity: 0.46 }),
    standardFurniture: Object.freeze({ fill: 'rgba(200,211,215,.32)', stroke: '', lineWidth: 0, opacity: 0.32 }),
    standardRoundProp: Object.freeze({ fill: 'rgba(210,224,224,.40)', stroke: '', lineWidth: 0, opacity: 0.40 }),
    dynamicDoor: Object.freeze({ fill: 'rgba(120,211,224,.72)', stroke: 'rgba(176,237,244,.82)', lineWidth: 0.75, opacity: 0.72 })
  });

  function tacticalMinimapPropPresentation(collider, arena = activeArenaMeta()) {
    if (collider?.dynamicDoor) return TACTICAL_MINIMAP_PROP_PRESENTATION.dynamicDoor;
    const round = collider?.shape === 'circle' || collider?.kind === 'tank';
    if (arena?.theme === 'office') {
      return round ? TACTICAL_MINIMAP_PROP_PRESENTATION.officeRoundProp : TACTICAL_MINIMAP_PROP_PRESENTATION.officeFurniture;
    }
    if (arena?.theme === 'summit') {
      return round ? TACTICAL_MINIMAP_PROP_PRESENTATION.summitRoundProp : TACTICAL_MINIMAP_PROP_PRESENTATION.summitFurniture;
    }
    if (arena?.theme === 'desert') {
      return round ? TACTICAL_MINIMAP_PROP_PRESENTATION.desertRoundProp : TACTICAL_MINIMAP_PROP_PRESENTATION.desertFurniture;
    }
    return round ? TACTICAL_MINIMAP_PROP_PRESENTATION.standardRoundProp : TACTICAL_MINIMAP_PROP_PRESENTATION.standardFurniture;
  }

  function tacticalMinimapPropPresentationSnapshot() {
    return Object.fromEntries(Object.entries(TACTICAL_MINIMAP_PROP_PRESENTATION).map(([key, value]) => [key, { ...value }]));
  }

  function tacticalMinimapGeometry(width = 360, height = 240) {
    const padding = Math.max(8, Math.min(width, height) * 0.045);
    const scale = Math.min((width - padding * 2) / MAP_W, (height - padding * 2) / MAP_H);
    const mapWidth = MAP_W * scale;
    const mapHeight = MAP_H * scale;
    return {
      width,
      height,
      padding,
      scale,
      mapWidth,
      mapHeight,
      originX: (width - mapWidth) * 0.5,
      originY: (height - mapHeight) * 0.5
    };
  }

  function tacticalMinimapPoint(x, y, geometry) {
    return {
      x: geometry.originX + clamp(Number(x) || 0, 0, MAP_W) * geometry.scale,
      y: geometry.originY + clamp(Number(y) || 0, 0, MAP_H) * geometry.scale
    };
  }

  function tacticalMinimapColour(team, alpha = 1) {
    return team === TEAM_BLUE ? `rgba(82,173,255,${alpha})` : `rgba(255,104,104,${alpha})`;
  }

  function resizeTacticalMinimapCanvas() {
    if (!tacticalMinimapCanvas) return null;
    const rect = tacticalMinimapCanvas.getBoundingClientRect();
    const cssWidth = Math.max(240, Math.round(rect.width || 360));
    const cssHeight = Math.max(160, Math.round(rect.height || cssWidth * MAP_H / MAP_W));
    const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const pixelWidth = Math.round(cssWidth * dpr);
    const pixelHeight = Math.round(cssHeight * dpr);
    if (tacticalMinimapCanvas.width !== pixelWidth || tacticalMinimapCanvas.height !== pixelHeight) {
      tacticalMinimapCanvas.width = pixelWidth;
      tacticalMinimapCanvas.height = pixelHeight;
    }
    const context = tacticalMinimapCanvas.getContext('2d');
    if (!context) return null;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { context, width: cssWidth, height: cssHeight };
  }

  function drawTacticalMinimap(force = false) {
    if (!tacticalMinimapVisible || !tacticalMinimapCanvas || !['match', 'free-roam'].includes(appState)) return false;
    const now = performance.now();
    if (!force && now - tacticalMinimapLastRenderAt < 90) return false;
    tacticalMinimapLastRenderAt = now;
    const surface = resizeTacticalMinimapCanvas();
    if (!surface) return false;
    const { context: ctx, width, height } = surface;
    const geometry = tacticalMinimapGeometry(width, height);
    const arena = activeArenaMeta();

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(3,10,15,.96)';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.beginPath();
    ctx.rect(geometry.originX, geometry.originY, geometry.mapWidth, geometry.mapHeight);
    ctx.clip();

    ctx.fillStyle = arena.theme === 'office' ? '#20282c' : arena.theme === 'summit' ? '#173037' : arena.theme === 'desert' ? '#4a3826' : '#182329';
    ctx.fillRect(geometry.originX, geometry.originY, geometry.mapWidth, geometry.mapHeight);

    for (const zone of LEVEL_ZONES.slice(0, -1)) {
      const a = tacticalMinimapPoint(zone.x1, zone.z1, geometry);
      const b = tacticalMinimapPoint(zone.x2, zone.z2, geometry);
      const light = zone.light || [0.5, 0.6, 0.7];
      ctx.fillStyle = `rgba(${Math.round(light[0] * 255)},${Math.round(light[1] * 255)},${Math.round(light[2] * 255)},.065)`;
      ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    }

    if (arena.theme === 'summit') {
      const vertical = arenaVerticalSnapshot('summit');
      for (const platform of vertical.platforms || []) {
        const a = tacticalMinimapPoint(platform.x1, platform.z1, geometry);
        const b = tacticalMinimapPoint(platform.x2, platform.z2, geometry);
        ctx.fillStyle = 'rgba(55,196,202,.105)';
        ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
        ctx.strokeStyle = 'rgba(105,231,234,.46)';
        ctx.lineWidth = 1;
        ctx.strokeRect(a.x + 0.5, a.y + 0.5, Math.max(0, b.x - a.x - 1), Math.max(0, b.y - a.y - 1));
      }
      for (const stair of arena.preview?.stairs || []) {
        const p = tacticalMinimapPoint(stair.x, stair.y, geometry);
        ctx.fillStyle = 'rgba(255,185,76,.92)';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 3.5);
        ctx.lineTo(p.x + 3.2, p.y + 2.8);
        ctx.lineTo(p.x - 3.2, p.y + 2.8);
        ctx.closePath();
        ctx.fill();
      }
    }

    for (const courtyard of LEVEL_DECOR_LAYOUT.courtyards || []) {
      const a = tacticalMinimapPoint(courtyard.x - courtyard.width * 0.5, courtyard.z - courtyard.depth * 0.5, geometry);
      const b = tacticalMinimapPoint(courtyard.x + courtyard.width * 0.5, courtyard.z + courtyard.depth * 0.5, geometry);
      ctx.fillStyle = 'rgba(80,139,91,.22)';
      ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
      ctx.strokeStyle = 'rgba(141,213,159,.42)';
      ctx.lineWidth = 1;
      ctx.strokeRect(a.x + 0.5, a.y + 0.5, b.x - a.x - 1, b.y - a.y - 1);
    }

    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (MAP[y]?.[x] === '0') continue;
        const p = tacticalMinimapPoint(x, y, geometry);
        ctx.fillStyle = arena.theme === 'office' ? '#718087' : arena.theme === 'summit' ? '#7e949b' : arena.theme === 'desert' ? '#a98655' : '#53656f';
        ctx.fillRect(p.x, p.y, geometry.scale + 0.35, geometry.scale + 0.35);
      }
    }

    ctx.strokeStyle = arena.theme === 'desert' ? 'rgba(239,206,145,.10)' : 'rgba(189,218,231,.10)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= MAP_W; x += 4) {
      const p = tacticalMinimapPoint(x, 0, geometry);
      ctx.beginPath(); ctx.moveTo(p.x, geometry.originY); ctx.lineTo(p.x, geometry.originY + geometry.mapHeight); ctx.stroke();
    }
    for (let y = 0; y <= MAP_H; y += 4) {
      const p = tacticalMinimapPoint(0, y, geometry);
      ctx.beginPath(); ctx.moveTo(geometry.originX, p.y); ctx.lineTo(geometry.originX + geometry.mapWidth, p.y); ctx.stroke();
    }

    for (const collider of allLevelPropColliders(true)) {
      const centre = tacticalMinimapPoint(collider.x, collider.y, geometry);
      const presentation = tacticalMinimapPropPresentation(collider, arena);
      ctx.fillStyle = presentation.fill;
      ctx.strokeStyle = presentation.stroke || 'transparent';
      ctx.lineWidth = presentation.lineWidth || 0;
      if (collider.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(centre.x, centre.y, Math.max(1.5, collider.radius * geometry.scale), 0, TAU);
        ctx.fill();
        if (presentation.stroke && presentation.lineWidth > 0) ctx.stroke();
      } else {
        const widthPx = collider.halfWidth * 2 * geometry.scale;
        const depthPx = collider.halfDepth * 2 * geometry.scale;
        ctx.save();
        ctx.translate(centre.x, centre.y);
        ctx.rotate(-(collider.yaw || 0));
        ctx.fillRect(-widthPx * 0.5, -depthPx * 0.5, widthPx, depthPx);
        if (presentation.stroke && presentation.lineWidth > 0) {
          ctx.strokeRect(-widthPx * 0.5 + 0.25, -depthPx * 0.5 + 0.25, Math.max(0, widthPx - 0.5), Math.max(0, depthPx - 0.5));
        }
        ctx.restore();
      }
    }

    const viewed = appState === 'free-roam' && typeof freeRoamCamera !== 'undefined' ? freeRoamCamera : bots[spectatorIndex];
    if (viewed && (appState === 'free-roam' || viewed.alive)) {
      const centre = tacticalMinimapPoint(viewed.x, viewed.y, geometry);
      const radius = geometry.scale * 4.2;
      ctx.fillStyle = appState === 'free-roam' ? 'rgba(92,232,220,.10)' : tacticalMinimapColour(viewed.team, 0.075);
      ctx.beginPath();
      ctx.moveTo(centre.x, centre.y);
      ctx.arc(centre.x, centre.y, radius, viewed.angle - 0.48, viewed.angle + 0.48);
      ctx.closePath();
      ctx.fill();
    }

    for (const bot of appState === 'free-roam' ? [] : bots) {
      const point = tacticalMinimapPoint(bot.x, bot.y, geometry);
      const markerRadius = Math.max(2.6, geometry.scale * 0.36);
      if (!bot.alive) {
        ctx.strokeStyle = tacticalMinimapColour(bot.team, 0.34);
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.moveTo(point.x - markerRadius, point.y - markerRadius);
        ctx.lineTo(point.x + markerRadius, point.y + markerRadius);
        ctx.moveTo(point.x + markerRadius, point.y - markerRadius);
        ctx.lineTo(point.x - markerRadius, point.y + markerRadius);
        ctx.stroke();
        continue;
      }
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.rotate(bot.angle || 0);
      ctx.beginPath();
      ctx.moveTo(markerRadius * 1.65, 0);
      ctx.lineTo(-markerRadius, markerRadius);
      ctx.lineTo(-markerRadius * 0.68, 0);
      ctx.lineTo(-markerRadius, -markerRadius);
      ctx.closePath();
      ctx.fillStyle = tacticalMinimapColour(bot.team, 0.96);
      ctx.fill();
      ctx.strokeStyle = 'rgba(2,8,12,.92)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
      if (bot === viewed) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(point.x, point.y, markerRadius * 2.15, 0, TAU);
        ctx.stroke();
      }
    }

    if (appState === 'free-roam' && viewed) {
      const point = tacticalMinimapPoint(viewed.x, viewed.y, geometry);
      const markerRadius = Math.max(3.2, geometry.scale * 0.42);
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.rotate(viewed.angle || 0);
      ctx.beginPath();
      ctx.moveTo(markerRadius * 1.9, 0);
      ctx.lineTo(-markerRadius, markerRadius);
      ctx.lineTo(-markerRadius * 0.65, 0);
      ctx.lineTo(-markerRadius, -markerRadius);
      ctx.closePath();
      ctx.fillStyle = 'rgba(93,238,224,.98)';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
    ctx.strokeStyle = 'rgba(126,203,244,.38)';
    ctx.lineWidth = 1;
    ctx.strokeRect(geometry.originX + 0.5, geometry.originY + 0.5, geometry.mapWidth - 1, geometry.mapHeight - 1);
    tacticalMinimapRenderCount++;
    if (tacticalMinimapTitleEl) tacticalMinimapTitleEl.textContent = appState === 'free-roam' ? `${arena.name} · FREE ROAM` : `${arena.name} · ROUND ${Math.max(1, roundNumber)}`;
    return true;
  }

  function syncTacticalMinimapPresentation() {
    const arena = activeArenaMeta();
    if (tacticalMinimapTitleEl) tacticalMinimapTitleEl.textContent = appState === 'free-roam' ? `${arena.name} · FREE ROAM` : `${arena.name} · ROUND ${Math.max(1, roundNumber)}`;
    return arena;
  }

  function setTacticalMinimapVisible(visible, announce = true) {
    tacticalMinimapVisible = Boolean(visible && ['match', 'free-roam'].includes(appState));
    if (tacticalMinimapVisible && typeof closeLiveCommandPulsePanel === 'function') closeLiveCommandPulsePanel();
    document.body.dataset.minimap = tacticalMinimapVisible ? 'visible' : 'hidden';
    if (tacticalMinimapPanelEl) {
      tacticalMinimapPanelEl.hidden = !tacticalMinimapVisible;
      tacticalMinimapPanelEl.setAttribute('aria-hidden', tacticalMinimapVisible ? 'false' : 'true');
    }
    if (minimapToggleBtn) {
      minimapToggleBtn.setAttribute('aria-pressed', tacticalMinimapVisible ? 'true' : 'false');
      minimapToggleBtn.setAttribute('aria-label', tacticalMinimapVisible ? 'Close tactical minimap' : 'Open tactical minimap');
      minimapToggleBtn.title = tacticalMinimapVisible ? 'Close tactical minimap' : 'Open tactical minimap';
    }
    if (tacticalMinimapVisible && typeof diagnosticOverlayVisible !== 'undefined' && diagnosticOverlayVisible && typeof setDiagnosticOverlayVisible === 'function') {
      setDiagnosticOverlayVisible(false);
    }
    syncTacticalMinimapPresentation();
    if (tacticalMinimapVisible) drawTacticalMinimap(true);
    if (announce) showStatus(tacticalMinimapVisible ? 'TACTICAL MAP OPEN' : 'TACTICAL MAP CLOSED');
    return tacticalMinimapVisible;
  }

  function toggleTacticalMinimap() {
    return setTacticalMinimapVisible(!tacticalMinimapVisible);
  }

  function updateTacticalMinimap(force = false) {
    if (!['match', 'free-roam'].includes(appState) && tacticalMinimapVisible) setTacticalMinimapVisible(false, false);
    return drawTacticalMinimap(force);
  }

  function tacticalMinimapForTest() {
    syncTacticalMinimapPresentation();
    const aliveByTeam = [TEAM_BLUE, TEAM_RED].map(team => bots.filter(bot => bot.team === team && bot.alive).length);
    return {
      visible: tacticalMinimapVisible,
      arenaId: activeArenaMeta().id,
      title: tacticalMinimapTitleEl?.textContent || '',
      aliveByTeam,
      markers: bots.length,
      walls: MAP.reduce((total, row) => total + [...row].filter(cell => cell !== '0').length, 0),
      props: allLevelPropColliders(true).length,
      doors: doorStateSnapshot(),
      courtyards: (LEVEL_DECOR_LAYOUT.courtyards || []).length,
      renderCount: tacticalMinimapRenderCount,
      geometry: tacticalMinimapGeometry(360, 240),
      propPresentation: tacticalMinimapPropPresentationSnapshot()
    };
  }

  function drawDeploymentTacticalOverlay(ctx, arena, preview, scale, originX, originY, cssWidth) {
    if (!ctx || !preview || !Array.isArray(preview.rows) || !preview.rows.length) return false;
    const spawns = arena.spawnPoints?.[TEAM_BLUE] || [];
    const spacingByPriority = { group: 0.82, trade: 1.12, hold: 1.38, flank: 1.72 };
    const engagementScale = preview.engagementId === 'long' ? 1.18 : (preview.engagementId === 'close' ? 0.88 : 1);
    const spacingRadius = (spacingByPriority[preview.priorityId] || 1.12) * engagementScale * scale;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    preview.rows.forEach((row, index) => {
      const spawn = spawns[index] || spawns[spawns.length - 1] || row.objective;
      const objective = row.objective || spawn;
      const sx = originX + (Number(spawn?.x) || 0) * scale;
      const sy = originY + (Number(spawn?.y) || 0) * scale;
      const ox = originX + (Number(objective?.x) || 0) * scale;
      const oy = originY + (Number(objective?.y) || 0) * scale;
      const role = String(row.roleId || 'flex');
      ctx.setLineDash(role === 'flanker' ? [5, 3] : role === 'anchor' ? [2, 3] : role === 'support' ? [7, 3] : []);
      ctx.strokeStyle = role === 'flanker' ? 'rgba(103,221,255,.94)' : role === 'anchor' ? 'rgba(122,173,255,.82)' : role === 'support' ? 'rgba(94,202,239,.84)' : 'rgba(82,173,255,.90)';
      ctx.lineWidth = role === 'entry' ? 2.1 : 1.45;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      const bend = (index - 2) * scale * 0.32;
      const midX = sx + (ox - sx) * 0.52;
      const midY = sy + (oy - sy) * 0.52 + bend;
      ctx.quadraticCurveTo(midX, midY, ox, oy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(82,173,255,.10)';
      ctx.strokeStyle = 'rgba(112,205,255,.38)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(ox, oy, Math.max(3.2, spacingRadius), 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#52adff';
      ctx.beginPath();
      ctx.arc(ox, oy, Math.max(3.1, scale * 0.34), 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#071018';
      ctx.font = `950 ${Math.max(6, Math.min(9, cssWidth / 43))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(index + 1), ox, oy + 0.2);
    });
    for (const objective of preview.redObjectives || []) {
      const x = originX + (Number(objective.x) || 0) * scale;
      const y = originY + (Number(objective.y) || 0) * scale;
      ctx.strokeStyle = 'rgba(255,104,104,.42)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(2.2, scale * 0.25), 0, TAU);
      ctx.stroke();
    }
    const centre = preview.contestedCentre || null;
    if (centre) {
      const cx = originX + (Number(centre.x) || 0) * scale;
      const cy = originY + (Number(centre.y) || 0) * scale;
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = 'rgba(255,212,104,.86)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(7, scale * 1.15), 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,221,133,.94)';
      ctx.font = `900 ${Math.max(6, Math.min(8.5, cssWidth / 45))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('LIKELY CONTACT', cx, cy - Math.max(8, scale * 1.3));
    }
    ctx.restore();
    return true;
  }

  function drawDeploymentArenaPreview(canvas, arenaId, tacticalPlan = null) {
    if (!canvas) return false;
    const arena = ARENA_LIBRARY[arenaId] || ARENA_LIBRARY.citadel;
    const layout = arena.layout || [];
    const widthCells = Math.max(1, layout[0]?.length || MAP_W);
    const heightCells = Math.max(1, layout.length || MAP_H);
    const rect = canvas.getBoundingClientRect();
    const cssWidth = Math.max(180, Math.round(rect.width || 320));
    const cssHeight = Math.max(112, Math.round(rect.height || 176));
    const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    ctx.fillStyle = arena.theme === 'office' ? '#182125' : arena.theme === 'summit' ? '#123039' : arena.theme === 'desert' ? '#352719' : '#111c22';
    ctx.fillRect(0, 0, cssWidth, cssHeight);
    const padding = 8;
    const scale = Math.min((cssWidth - padding * 2) / widthCells, (cssHeight - padding * 2) / heightCells);
    const originX = (cssWidth - widthCells * scale) * 0.5;
    const originY = (cssHeight - heightCells * scale) * 0.5;

    ctx.fillStyle = arena.theme === 'office' ? '#263136' : arena.theme === 'summit' ? '#23464c' : arena.theme === 'desert' ? '#5b452e' : '#1b292f';
    ctx.fillRect(originX, originY, widthCells * scale, heightCells * scale);
    for (const band of arena.preview?.bands || []) {
      const colour = Array.isArray(band.colour) ? band.colour : [0.5, 0.65, 0.75];
      const y1 = Math.max(0, Number(band.y1) || 0);
      const y2 = Math.min(heightCells, Number(band.y2) || heightCells);
      ctx.fillStyle = `rgba(${Math.round(colour[0] * 255)},${Math.round(colour[1] * 255)},${Math.round(colour[2] * 255)},.095)`;
      ctx.fillRect(originX, originY + y1 * scale, widthCells * scale, Math.max(0, y2 - y1) * scale);
      ctx.strokeStyle = `rgba(${Math.round(colour[0] * 255)},${Math.round(colour[1] * 255)},${Math.round(colour[2] * 255)},.30)`;
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(originX, originY + y1 * scale + 0.5);
      ctx.lineTo(originX + widthCells * scale, originY + y1 * scale + 0.5);
      ctx.stroke();
    }
    for (const courtyard of arena.decor?.courtyards || []) {
      ctx.fillStyle = 'rgba(72,132,82,.32)';
      ctx.fillRect(
        originX + (courtyard.x - courtyard.width * 0.5) * scale,
        originY + (courtyard.z - courtyard.depth * 0.5) * scale,
        courtyard.width * scale,
        courtyard.depth * scale
      );
    }
    for (let y = 0; y < heightCells; y++) {
      for (let x = 0; x < widthCells; x++) {
        if (layout[y]?.[x] === '0') continue;
        ctx.fillStyle = arena.theme === 'office' ? '#7d8b91' : arena.theme === 'summit' ? '#91a5aa' : arena.theme === 'desert' ? '#b5915c' : '#596c74';
        ctx.fillRect(originX + x * scale, originY + y * scale, scale + 0.25, scale + 0.25);
      }
    }
    const propGroups = arena.props || {};
    ctx.fillStyle = arena.theme === 'office' ? 'rgba(215,225,228,.24)' : arena.theme === 'summit' ? 'rgba(104,222,224,.42)' : arena.theme === 'desert' ? 'rgba(87,54,29,.58)' : 'rgba(215,225,228,.44)';
    for (const group of ['containers', 'machines', 'tanks']) {
      for (const prop of propGroups[group] || []) {
        const radius = Number(prop.radius) || 0;
        const width = Number(prop.width) || (radius ? radius * 2 : 0.72);
        const depth = Number(prop.depth) || (radius ? radius * 2 : 0.72);
        ctx.save();
        ctx.translate(originX + prop.x * scale, originY + prop.y * scale);
        ctx.rotate(-(Number(prop.yaw) || 0));
        if (radius) {
          ctx.beginPath();
          ctx.arc(0, 0, Math.max(1.5, radius * scale), 0, TAU);
          ctx.fill();
        } else {
          ctx.fillRect(-width * scale * 0.5, -depth * scale * 0.5, width * scale, depth * scale);
        }
        ctx.restore();
      }
    }
    for (const stair of arena.preview?.stairs || []) {
      ctx.save();
      ctx.translate(originX + stair.x * scale, originY + stair.y * scale);
      ctx.strokeStyle = arena.theme === 'summit' ? 'rgba(255,191,82,.92)' : 'rgba(235,246,250,.72)';
      ctx.fillStyle = arena.theme === 'summit' ? 'rgba(23,48,55,.88)' : 'rgba(4,14,20,.72)';
      ctx.lineWidth = 1;
      const size = Math.max(3.2, scale * 0.54);
      ctx.fillRect(-size, -size, size * 2, size * 2);
      ctx.strokeRect(-size + 0.5, -size + 0.5, size * 2 - 1, size * 2 - 1);
      ctx.beginPath();
      ctx.moveTo(-size * 0.46, size * 0.35);
      ctx.lineTo(0, -size * 0.38);
      ctx.lineTo(size * 0.46, size * 0.35);
      ctx.stroke();
      ctx.restore();
    }
    for (const team of [TEAM_BLUE, TEAM_RED]) {
      const colour = team === TEAM_BLUE ? '#52adff' : '#ff6868';
      ctx.fillStyle = colour;
      for (const spawn of arena.spawnPoints?.[team] || []) {
        ctx.beginPath();
        ctx.arc(originX + spawn.x * scale, originY + spawn.y * scale, Math.max(1.8, scale * 0.28), 0, TAU);
        ctx.fill();
      }
    }
    const tacticalPreview = tacticalPlan && typeof clubTacticalPreviewSnapshot === 'function' ? clubTacticalPreviewSnapshot(tacticalPlan, arena.id) : null;
    if (tacticalPreview) drawDeploymentTacticalOverlay(ctx, arena, tacticalPreview, scale, originX, originY, cssWidth);
    for (const band of arena.preview?.bands || []) {
      const colour = Array.isArray(band.colour) ? band.colour : [0.5, 0.65, 0.75];
      const y1 = Math.max(0, Number(band.y1) || 0);
      const y2 = Math.min(heightCells, Number(band.y2) || heightCells);
      const labelY = originY + ((y1 + y2) * 0.5) * scale;
      ctx.fillStyle = `rgba(${Math.round(colour[0] * 255)},${Math.round(colour[1] * 255)},${Math.round(colour[2] * 255)},.86)`;
      ctx.font = `900 ${Math.max(6, Math.min(9, cssWidth / 42))}px system-ui, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(band.label || '').toUpperCase(), originX + 5, labelY);
    }
    ctx.strokeStyle = arena.theme === 'desert' ? 'rgba(232,186,110,.62)' : 'rgba(151,211,238,.46)';
    ctx.lineWidth = 1;
    ctx.strokeRect(originX + 0.5, originY + 0.5, widthCells * scale - 1, heightCells * scale - 1);
    return true;
  }
