/*
 * Strikewatch source module: 20-navigation.js
 * Purpose: Grid navigation, path smoothing, endgame search helpers and movement clearance.
 *
 * This file is a source fragment. Run `python3 build.py` to regenerate
 * js/strikewatch.dev.js and the standalone release in dist/.
 */

  const NAV_RADIUS = BOT_RADIUS + 0.035;
  const SQRT2 = Math.SQRT2;
  const NAVIGATION_PLAN_BUDGET_PER_FRAME = 2;
  const NAVIGATION_URGENT_PLAN_BUDGET_PER_FRAME = 3;
  let navigationPlanningFrame = 0;
  let navigationPlansUsedThisFrame = 0;
  var navigationGraphCache = null;

  function invalidateNavigationGraphCache() {
    navigationGraphCache = null;
  }

  function rawNavigableCell(x, y, radius = NAV_RADIUS) {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H || MAP[y][x] !== '0') return false;
    return canStandForNavigation(x + CELL_CENTER, y + CELL_CENTER, radius);
  }

  function navigationStaticCellPenalty(x, y) {
    let blocked = 0;
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        if (!ox && !oy) continue;
        if (!rawNavigableCell(x + ox, y + oy, BOT_RADIUS + 0.01)) blocked++;
      }
    }
    return blocked * 0.025;
  }

  function navigationGraphSignature() {
    return `${activeArenaId}|${MAP_W}x${MAP_H}|${LEVEL_PROP_COLLIDERS.length}`;
  }

  function navigationGraphForActiveArena() {
    const signature = navigationGraphSignature();
    if (navigationGraphCache?.signature === signature) return navigationGraphCache;
    const buildStarted = performance.now();
    const nodes = [];
    const byKey = new Map();
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (!rawNavigableCell(x, y)) continue;
        const node = { id: nodes.length, x, y, key: keyOf(x, y), staticPenalty: navigationStaticCellPenalty(x, y), edges: [], component: -1 };
        nodes.push(node);
        byKey.set(node.key, node);
      }
    }
    const dirs = [
      [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
      [1, 1, SQRT2], [1, -1, SQRT2], [-1, 1, SQRT2], [-1, -1, SQRT2]
    ];
    let edgeCount = 0;
    for (const node of nodes) {
      const a = cellCentre(node);
      for (const [dx, dy, cost] of dirs) {
        const target = byKey.get(keyOf(node.x + dx, node.y + dy));
        if (!target) continue;
        if (dx && dy) {
          if (!byKey.has(keyOf(node.x + dx, node.y)) || !byKey.has(keyOf(node.x, node.y + dy))) continue;
        }
        const b = cellCentre(target);
        if (!segmentHasNavigationClearance(a, b, NAV_RADIUS)) continue;
        node.edges.push({ id: target.id, x: target.x, y: target.y, cost: cost + target.staticPenalty });
        edgeCount++;
      }
    }
    let componentCount = 0;
    for (const node of nodes) {
      if (node.component >= 0) continue;
      const queue = [node];
      node.component = componentCount;
      for (let index = 0; index < queue.length; index++) {
        const current = queue[index];
        for (const edge of current.edges) {
          const next = nodes[edge.id];
          if (!next || next.component >= 0) continue;
          next.component = componentCount;
          queue.push(next);
        }
      }
      componentCount++;
    }
    navigationGraphCache = {
      signature,
      arenaId: activeArenaId,
      nodes,
      byKey,
      edgeCount,
      componentCount,
      buildMs: performance.now() - buildStarted
    };
    return navigationGraphCache;
  }

  function navigationGraphSnapshot() {
    const graph = navigationGraphForActiveArena();
    return {
      arenaId: graph.arenaId,
      nodes: graph.nodes.length,
      edges: graph.edgeCount,
      components: graph.componentCount,
      buildMs: Number(graph.buildMs.toFixed(3))
    };
  }

  class NavigationMinHeap {
    constructor() { this.items = []; }
    get length() { return this.items.length; }
    push(entry) {
      const items = this.items;
      items.push(entry);
      let index = items.length - 1;
      while (index > 0) {
        const parent = (index - 1) >> 1;
        if (!NavigationMinHeap.before(items[index], items[parent])) break;
        [items[index], items[parent]] = [items[parent], items[index]];
        index = parent;
      }
    }
    pop() {
      const items = this.items;
      if (!items.length) return null;
      const first = items[0];
      const last = items.pop();
      if (items.length && last) {
        items[0] = last;
        let index = 0;
        while (true) {
          const left = index * 2 + 1;
          const right = left + 1;
          let best = index;
          if (left < items.length && NavigationMinHeap.before(items[left], items[best])) best = left;
          if (right < items.length && NavigationMinHeap.before(items[right], items[best])) best = right;
          if (best === index) break;
          [items[index], items[best]] = [items[best], items[index]];
          index = best;
        }
      }
      return first;
    }
    static before(a, b) {
      if (a.f !== b.f) return a.f < b.f;
      return a.sequence < b.sequence;
    }
  }

  function beginNavigationPlanningFrame() {
    navigationPlanningFrame++;
    navigationPlansUsedThisFrame = 0;
    return navigationPlanningFrame;
  }

  function consumeNavigationPlanSlot(bot = null, urgent = false) {
    const quality = typeof runtimeQualityTier === 'number' ? runtimeQualityTier : 2;
    const normalLimit = quality <= 0 ? 1 : NAVIGATION_PLAN_BUDGET_PER_FRAME;
    const urgentLimit = quality <= 0 ? 2 : (quality === 1 ? 2 : NAVIGATION_URGENT_PLAN_BUDGET_PER_FRAME);
    const limit = urgent ? urgentLimit : normalLimit;
    if (navigationPlansUsedThisFrame >= limit) {
      combatDebug.navigationPlanDeferrals++;
      if (bot) bot.navigationPlanDeferredFrame = navigationPlanningFrame;
      return false;
    }
    navigationPlansUsedThisFrame++;
    combatDebug.navigationPlansExecuted++;
    if (bot) bot.navigationPlanFrame = navigationPlanningFrame;
    return true;
  }

  function navigationPlannerSnapshot() {
    return {
      frame: navigationPlanningFrame,
      used: navigationPlansUsedThisFrame,
      normalBudget: (typeof runtimeQualityTier === 'number' && runtimeQualityTier <= 0) ? 1 : NAVIGATION_PLAN_BUDGET_PER_FRAME,
      urgentBudget: (typeof runtimeQualityTier === 'number' && runtimeQualityTier <= 0) ? 2 : ((typeof runtimeQualityTier === 'number' && runtimeQualityTier === 1) ? 2 : NAVIGATION_URGENT_PLAN_BUDGET_PER_FRAME),
      qualityTier: typeof runtimeQualityTier === 'number' ? runtimeQualityTier : 2,
      executed: Number(combatDebug.navigationPlansExecuted) || 0,
      deferred: Number(combatDebug.navigationPlanDeferrals) || 0,
      pathHoldReuses: Number(combatDebug.navigationPathHoldReuses) || 0,
      graph: navigationGraphSnapshot()
    };
  }

  function clearanceAlong(x, y, angle, maxDistance = 1.5, radius = BOT_RADIUS) {
    const step = 0.07;
    for (let d = step; d <= maxDistance; d += step) {
      if (!canStand(x + Math.cos(angle) * d, y + Math.sin(angle) * d, radius)) return d - step;
    }
    return maxDistance;
  }
  function toCell(x, y) { return { x: Math.floor(x), y: Math.floor(y) }; }
  function keyOf(x, y) { return `${x},${y}`; }
  function fromKey(key) {
    const [x, y] = key.split(',').map(Number);
    return { x, y };
  }
  function cellCentre(cell) {
    return { x: cell.x + CELL_CENTER, y: cell.y + CELL_CENTER };
  }
  function resolveNavigableCell(point, maxRadius = 5, linkRadius = BOT_RADIUS + 0.012, requiredComponent = null, requireLinkClearance = true) {
    const origin = toCell(point.x, point.y);
    const graph = navigationGraphForActiveArena();
    const candidates = [];
    for (let radius = 0; radius <= maxRadius; radius++) {
      for (let oy = -radius; oy <= radius; oy++) {
        for (let ox = -radius; ox <= radius; ox++) {
          if (radius > 0 && Math.abs(ox) !== radius && Math.abs(oy) !== radius) continue;
          const x = origin.x + ox;
          const y = origin.y + oy;
          const node = graph.byKey.get(keyOf(x, y));
          if (!node || (requiredComponent !== null && node.component !== requiredComponent)) continue;
          const centre = cellCentre(node);
          if (requireLinkClearance && !segmentHasNavigationClearance(point, centre, linkRadius)) continue;
          candidates.push({ x, y, id: node.id, component: node.component, distance: Math.hypot(centre.x - point.x, centre.y - point.y) });
        }
      }
      if (candidates.length) break;
    }
    candidates.sort((a, b) => a.distance - b.distance || a.id - b.id);
    return candidates.length ? candidates[0] : null;
  }
  function isNavigableCell(x, y, radius = NAV_RADIUS) {
    if (Math.abs(radius - NAV_RADIUS) > 0.0001) return rawNavigableCell(x, y, radius);
    return navigationGraphForActiveArena().byKey.has(keyOf(x, y));
  }
  function navigationTrafficPenalty(cell, mover = null) {
    let trafficPenalty = 0;
    if (mover && typeof bots !== 'undefined' && Array.isArray(bots)) {
      const centre = cellCentre(cell);
      const desiredGap = typeof mover.teamSpacingProfile === 'function'
        ? mover.teamSpacingProfile(Boolean(mover.target || mover.lastSeen)).desiredGap
        : 1.0;
      for (const other of bots) {
        if (!other || other === mover || !other.alive || other.team !== mover.team) continue;
        const separation = Math.hypot(centre.x - other.x, centre.y - other.y);
        if (separation < Math.max(0.62, desiredGap * 0.66)) trafficPenalty += 4.2;
        else if (separation < desiredGap + 0.42) trafficPenalty += (desiredGap + 0.42 - separation) * 1.65;
        const reserved = other.path && other.path.length && other.pathIndex < other.path.length
          ? other.path[Math.min(other.path.length - 1, other.pathIndex + 1)]
          : null;
        if (reserved) {
          const reservedSeparation = Math.hypot(centre.x - reserved.x, centre.y - reserved.y);
          if (reservedSeparation < Math.max(0.78, desiredGap * 0.78)) trafficPenalty += 0.78;
          else if (reservedSeparation < desiredGap + 0.28) trafficPenalty += 0.24;
        }
      }
    }
    return trafficPenalty;
  }
  function navigationCellPenalty(cell, mover = null) {
    const node = navigationGraphForActiveArena().byKey.get(keyOf(cell.x, cell.y));
    return (node?.staticPenalty || 0) + navigationTrafficPenalty(cell, mover);
  }
  function neighbors(cell, mover = null) {
    const graph = navigationGraphForActiveArena();
    const node = graph.byKey.get(keyOf(cell.x, cell.y));
    if (!node) return [];
    return node.edges.map(edge => ({ x: edge.x, y: edge.y, id: edge.id, cost: edge.cost + navigationTrafficPenalty(edge, mover) }));
  }
  function heuristic(a, b) {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    return Math.max(dx, dy) + (SQRT2 - 1) * Math.min(dx, dy);
  }
  function segmentHasClearance(a, b, radius = BOT_RADIUS + 0.085) {
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(2, Math.ceil(length / 0.10));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = lerp(a.x, b.x, t);
      const y = lerp(a.y, b.y, t);
      if (!canStand(x, y, radius)) return false;
    }
    return true;
  }
  function segmentHasNavigationClearance(a, b, radius = BOT_RADIUS + 0.085) {
    return canTravelBetweenForNavigation(a.x, a.y, b.x, b.y, radius);
  }
  function pathSegmentsHaveNavigationClearance(path, radius = NAV_RADIUS) {
    if (!path || path.length < 2) return true;
    for (let i = 1; i < path.length; i++) {
      if (!segmentHasNavigationClearance(path[i - 1], path[i], radius)) return false;
    }
    return true;
  }
  function smoothPath(path) {
    if (!path || path.length < 3) return path || [];
    const result = [path[0]];
    let anchor = 0;
    while (anchor < path.length - 1) {
      let furthest = -1;
      for (let i = path.length - 1; i > anchor; i--) {
        if (segmentHasNavigationClearance(path[anchor], path[i], NAV_RADIUS)) {
          furthest = i;
          break;
        }
      }
      // A smoothed path must never manufacture a floor transition that the raw
      // A* route did not contain. If no forward waypoint is directly reachable,
      // return the original validated route and let the caller preserve every
      // stair-centre waypoint.
      if (furthest <= anchor) return path.slice();
      result.push(path[furthest]);
      anchor = furthest;
    }
    return pathSegmentsHaveNavigationClearance(result, NAV_RADIUS) ? result : path.slice();
  }
  function safelySmoothPath(path) {
    const original = Array.isArray(path) ? path.slice() : [];
    if (original.length < 2) return original;
    const smoothed = smoothPath(original);
    if (pathSegmentsHaveNavigationClearance(smoothed, NAV_RADIUS)) return smoothed;
    return pathSegmentsHaveNavigationClearance(original, NAV_RADIUS) ? original : [];
  }
  function pathCrossesArenaElevation(path, arenaId = activeArenaId, threshold = 0.08) {
    if (!Array.isArray(path) || path.length < 2 || !arenaVerticalProfile(arenaId)) return false;
    let minimum = Infinity;
    let maximum = -Infinity;
    for (const point of path) {
      const elevation = arenaElevationAt(point.x, point.y, arenaId);
      minimum = Math.min(minimum, elevation);
      maximum = Math.max(maximum, elevation);
    }
    return maximum - minimum > threshold;
  }
  function prepareNavigationPath(path) {
    const original = Array.isArray(path) ? path.slice() : [];
    if (original.length < 2) return original;
    // Preserve the complete A* stair sequence whenever a route changes floor.
    // Removing intermediate cell centres can create a visually convincing but
    // physically invalid diagonal climb up the side of a platform.
    if (pathCrossesArenaElevation(original)) {
      return pathSegmentsHaveNavigationClearance(original, NAV_RADIUS) ? original : [];
    }
    return safelySmoothPath(original);
  }
  function pathDistance(path, startIndex = 0, fromPoint = null) {
    if (!path || !path.length || startIndex >= path.length) return 0;
    let total = 0;
    let previous = fromPoint || path[Math.max(0, startIndex - 1)] || path[0];
    for (let i = startIndex; i < path.length; i++) {
      total += Math.hypot(path[i].x - previous.x, path[i].y - previous.y);
      previous = path[i];
    }
    return total;
  }
  function pointAlongPath(path, distanceAhead, startIndex = 0, fromPoint = null) {
    if (!path || !path.length || startIndex >= path.length) return null;
    let previous = fromPoint || path[Math.max(0, startIndex - 1)] || path[0];
    let remaining = Math.max(0, distanceAhead);
    for (let i = startIndex; i < path.length; i++) {
      const point = path[i];
      const dx = point.x - previous.x;
      const dy = point.y - previous.y;
      const segmentLength = Math.hypot(dx, dy);
      if (segmentLength >= remaining && segmentLength > 0.0001) {
        const t = remaining / segmentLength;
        return { x: previous.x + dx * t, y: previous.y + dy * t, index: i };
      }
      remaining -= segmentLength;
      previous = point;
    }
    const last = path[path.length - 1];
    return last ? { x: last.x, y: last.y, index: path.length - 1 } : null;
  }
  function findPath(startPos, goalPos, mover = startPos && Number.isFinite(startPos.team) ? startPos : null) {
    const graph = navigationGraphForActiveArena();
    const startPoint = nearestWalkablePoint(startPos.x, startPos.y);
    const goalPoint = nearestWalkablePoint(goalPos.x, goalPos.y);
    const start = resolveNavigableCell(startPoint);
    if (!start) return null;
    // Resolve the destination inside the same static navigation component as
    // the mover. This replaces the old many-search fallback ring: unreachable
    // slivers now become one nearby reachable goal before A* starts.
    const goal = resolveNavigableCell(goalPoint, 7, BOT_RADIUS + 0.012, start.component, false);
    if (!goal) return null;

    const nodeCount = graph.nodes.length;
    const gScore = new Float64Array(nodeCount);
    const fScore = new Float64Array(nodeCount);
    const parent = new Int32Array(nodeCount);
    const closed = new Uint8Array(nodeCount);
    gScore.fill(Infinity);
    fScore.fill(Infinity);
    parent.fill(-1);
    gScore[start.id] = 0;
    fScore[start.id] = heuristic(start, goal);
    const open = new NavigationMinHeap();
    let sequence = 0;
    open.push({ id: start.id, f: fScore[start.id], sequence: sequence++ });
    let loops = 0;

    while (open.length && loops < 2200) {
      loops++;
      const entry = open.pop();
      if (!entry || closed[entry.id] || Math.abs(entry.f - fScore[entry.id]) > 0.000001) continue;
      const current = graph.nodes[entry.id];
      if (!current) continue;
      if (current.id === goal.id) {
        const path = [];
        let traceId = current.id;
        while (traceId >= 0) {
          path.unshift(cellCentre(graph.nodes[traceId]));
          traceId = parent[traceId];
        }
        const first = path[0];
        if (!first || Math.hypot(first.x - startPos.x, first.y - startPos.y) > 0.015) path.unshift({ x: startPos.x, y: startPos.y });
        else path[0] = { x: startPos.x, y: startPos.y };
        const resolvedGoalPoint = cellCentre(goal);
        const finalGoal = segmentHasNavigationClearance(resolvedGoalPoint, goalPoint, BOT_RADIUS + 0.012) ? goalPoint : resolvedGoalPoint;
        const last = path[path.length - 1];
        if (!last || Math.hypot(last.x - finalGoal.x, last.y - finalGoal.y) > 0.015) path.push({ x: finalGoal.x, y: finalGoal.y });
        else path[path.length - 1] = { x: finalGoal.x, y: finalGoal.y };
        const prepared = prepareNavigationPath(path);
        prepared.resolvedGoal = { x: finalGoal.x, y: finalGoal.y };
        return prepared;
      }
      closed[current.id] = 1;
      const currentG = gScore[current.id];
      for (const edge of neighbors(current, mover)) {
        if (closed[edge.id]) continue;
        const tentative = currentG + edge.cost;
        if (tentative + 0.000001 >= gScore[edge.id]) continue;
        parent[edge.id] = current.id;
        gScore[edge.id] = tentative;
        const nextF = tentative + heuristic(edge, goal);
        fScore[edge.id] = nextF;
        open.push({ id: edge.id, f: nextF, sequence: sequence++ });
      }
    }
    return null;
  }

  function totalAliveCount() {
    return bots.reduce((count, bot) => count + (bot.alive ? 1 : 0), 0);
  }

  function secondsSinceCombatContact() {
    return Math.max(0, simulationClock - lastCombatContactAt);
  }

  function registerCombatContact() {
    lastCombatContactAt = simulationClock;
    combatDebug.lateRoundContacts++;
  }

  function isLateRoundHuntActive() {
    if (roundEnding || matchEnding || roundFreezeTimer > 0) return false;
    const alive = totalAliveCount();
    if (alive <= 1) return false;
    const silence = secondsSinceCombatContact();
    const fieldReduced = alive <= 6;
    const clockPressure = roundTime <= 62;
    const threshold = clockPressure ? 3.4 : 4.8;
    return silence >= threshold && (fieldReduced || clockPressure);
  }

  function isUrgentHuntActive() {
    if (!isLateRoundHuntActive()) return false;
    return suddenHuntOvertime || totalAliveCount() === 2 || roundTime <= 34 || secondsSinceCombatContact() >= 13;
  }

  function deterministicNoise(seed) {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  }
