from pathlib import Path
import json
import re
import shutil

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'strikewatch-source'
VERSION = '12.197'
NAME = 'Device-Independent Match Simulation'
BUILD_ID = '12.197.0-device-independent-match-simulation'


def read(path):
    return path.read_text(encoding='utf-8')


def write(path, text):
    path.write_text(text, encoding='utf-8', newline='\n')


def one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'Expected one {label}; found {count}')
    return text.replace(old, new, 1)


def regex_one(text, pattern, replacement, label, flags=0):
    updated, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f'Expected one {label}; found {count}')
    return updated


release_path = SRC / 'RELEASE.json'
expected_predecessor = {
    'version': '12.196',
    'name': 'Clean Spectator Handoffs',
    'build_id': '12.196.0-clean-spectator-handoffs'
}
predecessor = json.loads(read(release_path))
if predecessor != expected_predecessor:
    raise SystemExit(f'Unexpected predecessor release: {predecessor!r}')

core = SRC / 'js' / '00-core.js'
text = read(core)
text = regex_one(text, r"const BUILD_VERSION = '[^']+'", f"const BUILD_VERSION = '{VERSION}'", 'BUILD_VERSION')
text = regex_one(text, r"const BUILD_ID = '[^']+'", f"const BUILD_ID = '{BUILD_ID}'", 'BUILD_ID')
text = regex_one(text, r"const BUILD_NAME = '[^']+'", f"const BUILD_NAME = '{NAME}'", 'BUILD_NAME')
old_quality = '''  let runtimeQualityPressure = 0;
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
'''
new_quality = r'''  let runtimeQualityPressure = 0;
  let runtimeQualityRecovery = 0;
  let runtimeQualityLastChangedAt = 0;
  const runtimeHardwareConcurrency = Math.max(1, Number(navigator.hardwareConcurrency) || 4);
  const runtimeDeviceMemoryGb = Number(navigator.deviceMemory) || 0;
  // Build 12.197: this tier is render-only. Device pressure may reduce
  // resolution and actor detail, but it must never weaken match intelligence.
  let runtimeQualityTier = runtimeHardwareConcurrency <= 2 || (runtimeDeviceMemoryGb > 0 && runtimeDeviceMemoryGb <= 2)
    ? 0
    : 2;
  const SIMULATION_WORK_POLICY = Object.freeze({
    revision: '12.197-device-independent-simulation-1',
    windowSeconds: 0.033,
    perceptionIdleSeconds: 0.068,
    perceptionCombatSeconds: 0.045,
    perceptionSlotJitterSeconds: 0.004,
    perceptionPerWindow: 4,
    tacticalPerWindow: 4,
    navigationNormalPerWindow: 2,
    navigationUrgentPerWindow: 3
  });
  let simulationClock = 0;
  let simulationWorkWindowIndex = -1;
  let simulationWorkWindowResets = 0;
  let simulationWorkWindowReason = 'initial';

  function runtimeQualityLabel(tier = runtimeQualityTier) {
    return ['CONSTRAINED', 'BALANCED', 'FULL'][clamp(Math.round(Number(tier) || 0), 0, 2)];
  }

  function simulationWorkPolicySnapshot() {
    const policy = SIMULATION_WORK_POLICY;
    return {
      revision: policy.revision,
      windowSeconds: policy.windowSeconds,
      windowHz: Number((1 / policy.windowSeconds).toFixed(3)),
      perception: {
        idleSeconds: policy.perceptionIdleSeconds,
        combatSeconds: policy.perceptionCombatSeconds,
        slotJitterSeconds: policy.perceptionSlotJitterSeconds,
        perWindow: policy.perceptionPerWindow
      },
      tactical: { perWindow: policy.tacticalPerWindow },
      navigation: {
        normalPerWindow: policy.navigationNormalPerWindow,
        urgentPerWindow: policy.navigationUrgentPerWindow
      },
      windowIndex: simulationWorkWindowIndex,
      resets: simulationWorkWindowResets,
      reason: simulationWorkWindowReason,
      renderQualityTier: runtimeQualityTier,
      renderQualityLabel: runtimeQualityLabel()
    };
  }

  function simulationWorkWindowIndexForTime(time = simulationClock) {
    return Math.floor((Math.max(0, Number(time) || 0) + 1e-9) / SIMULATION_WORK_POLICY.windowSeconds);
  }

  function resetSimulationWorkWindow(reason = 'reset') {
    simulationWorkWindowIndex = -1;
    simulationWorkWindowReason = String(reason || 'reset');
    return simulationWorkPolicySnapshot();
  }

  function beginSimulationWorkWindow() {
    const nextIndex = simulationWorkWindowIndexForTime(simulationClock);
    if (nextIndex === simulationWorkWindowIndex) return false;
    simulationWorkWindowIndex = nextIndex;
    simulationWorkWindowResets++;
    simulationWorkWindowReason = 'simulation-time';
    if (typeof beginNavigationPlanningFrame === 'function') beginNavigationPlanningFrame();
    if (typeof beginBotWorkFrame === 'function') beginBotWorkFrame();
    return true;
  }

  function runtimePerceptionInterval(bot = null) {
    const combat = Boolean(bot && (bot.target || bot.sightCandidate || bot.lastSeen));
    const base = combat ? SIMULATION_WORK_POLICY.perceptionCombatSeconds : SIMULATION_WORK_POLICY.perceptionIdleSeconds;
    const slotJitter = bot ? (Math.max(0, Number(bot.slot) || 0) % 5) * SIMULATION_WORK_POLICY.perceptionSlotJitterSeconds : 0;
    return base + slotJitter;
  }

  function runtimeOperatorDetailTier(distance = 0, tier = runtimeQualityTier) {
    const d = Math.max(0, Number(distance) || 0);
    const renderTier = clamp(Math.round(Number(tier) || 0), 0, 2);
    if (renderTier <= 0) return d < 5.5 ? 1 : 0;
    if (renderTier === 1) return d < 4.5 ? 2 : (d < 10 ? 1 : 0);
    return d < 7.5 ? 2 : (d < 15 ? 1 : 0);
  }

  function simulationQualityIndependenceForTest() {
    const policy = SIMULATION_WORK_POLICY;
    const fixedSimulation = {
      windowSeconds: policy.windowSeconds,
      perceptionIdleSeconds: policy.perceptionIdleSeconds,
      perceptionCombatSeconds: policy.perceptionCombatSeconds,
      perceptionPerWindow: policy.perceptionPerWindow,
      tacticalPerWindow: policy.tacticalPerWindow,
      navigationNormalPerWindow: policy.navigationNormalPerWindow,
      navigationUrgentPerWindow: policy.navigationUrgentPerWindow
    };
    const profiles = [0, 1, 2].map(tier => ({
      renderTier: tier,
      renderLabel: runtimeQualityLabel(tier),
      operatorDetail: [3, 6, 12, 16].map(distance => runtimeOperatorDetailTier(distance, tier)),
      simulation: { ...fixedSimulation }
    }));
    const simulationFingerprints = profiles.map(profile => JSON.stringify(profile.simulation));
    const renderFingerprints = profiles.map(profile => JSON.stringify(profile.operatorDetail));
    const sameSimulation = simulationFingerprints.every(value => value === simulationFingerprints[0]);
    const renderStillAdaptive = new Set(renderFingerprints).size === profiles.length;
    return {
      ok: sameSimulation
        && renderStillAdaptive
        && policy.windowSeconds === 0.033
        && policy.perceptionCombatSeconds === 0.045
        && policy.perceptionIdleSeconds === 0.068
        && policy.perceptionPerWindow === 4
        && policy.tacticalPerWindow === 4
        && policy.navigationNormalPerWindow === 2
        && policy.navigationUrgentPerWindow === 3,
      revision: policy.revision,
      workWindowHz: Number((1 / policy.windowSeconds).toFixed(3)),
      profiles,
      renderQualityStillAdaptive: renderStillAdaptive,
      simulationDependsOnRenderTier: !sameSimulation,
      simulationClockAuthority: true,
      saveSchemaChanged: false,
      diagnosticsSchemaChanged: false
    };
  }
'''
text = one(text, old_quality, new_quality, 'quality and simulation policy block')
write(core, text)

navigation = SRC / 'js' / '20-navigation.js'
text = read(navigation)
text = one(
    text,
    '''  const NAVIGATION_PLAN_BUDGET_PER_FRAME = 2;\n  const NAVIGATION_URGENT_PLAN_BUDGET_PER_FRAME = 3;''',
    '''  // Fixed per simulation-time window. Render quality may not change routes.\n  const NAVIGATION_PLAN_BUDGET_PER_FRAME = SIMULATION_WORK_POLICY.navigationNormalPerWindow;\n  const NAVIGATION_URGENT_PLAN_BUDGET_PER_FRAME = SIMULATION_WORK_POLICY.navigationUrgentPerWindow;''',
    'navigation budget constants'
)
old_consume = '''  function consumeNavigationPlanSlot(bot = null, urgent = false) {
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
'''
new_consume = '''  function consumeNavigationPlanSlot(bot = null, urgent = false) {
    const limit = urgent ? NAVIGATION_URGENT_PLAN_BUDGET_PER_FRAME : NAVIGATION_PLAN_BUDGET_PER_FRAME;
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
      workWindow: typeof simulationWorkWindowIndex === 'number' ? simulationWorkWindowIndex : -1,
      used: navigationPlansUsedThisFrame,
      normalBudget: NAVIGATION_PLAN_BUDGET_PER_FRAME,
      urgentBudget: NAVIGATION_URGENT_PLAN_BUDGET_PER_FRAME,
      policyRevision: SIMULATION_WORK_POLICY.revision,
      renderQualityTier: typeof runtimeQualityTier === 'number' ? runtimeQualityTier : 2,
      executed: Number(combatDebug.navigationPlansExecuted) || 0,
      deferred: Number(combatDebug.navigationPlanDeferrals) || 0,
      pathHoldReuses: Number(combatDebug.navigationPathHoldReuses) || 0,
      graph: navigationGraphSnapshot()
    };
  }
'''
text = one(text, old_consume, new_consume, 'navigation work policy')
write(navigation, text)

bot_ai = SRC / 'js' / '30-bot-ai.js'
text = read(bot_ai)
old_bot_limits = '''  const BOT_WORK_LIMITS = Object.freeze({
    full: Object.freeze({ perception: 4, tactical: 4 }),
    balanced: Object.freeze({ perception: 3, tactical: 3 }),
    constrained: Object.freeze({ perception: 2, tactical: 2 })
  });
  let botWorkFrame = 0;
  let botPerceptionScansUsedThisFrame = 0;
  let botTacticalDecisionsUsedThisFrame = 0;

  function botWorkLimits() {
    const tier = typeof runtimeQualityTier === 'number' ? runtimeQualityTier : 2;
    return tier <= 0 ? BOT_WORK_LIMITS.constrained : (tier === 1 ? BOT_WORK_LIMITS.balanced : BOT_WORK_LIMITS.full);
  }
'''
new_bot_limits = '''  // Fixed per simulation-time window. Visual pressure cannot reduce awareness or tactics.
  const BOT_WORK_LIMITS = Object.freeze({
    perception: SIMULATION_WORK_POLICY.perceptionPerWindow,
    tactical: SIMULATION_WORK_POLICY.tacticalPerWindow
  });
  let botWorkFrame = 0;
  let botPerceptionScansUsedThisFrame = 0;
  let botTacticalDecisionsUsedThisFrame = 0;

  function botWorkLimits() {
    return BOT_WORK_LIMITS;
  }
'''
text = one(text, old_bot_limits, new_bot_limits, 'bot work limits')
old_bot_snapshot = '''  function botWorkBudgetSnapshot() {
    const limits = botWorkLimits();
    return {
      frame: botWorkFrame,
      qualityTier: typeof runtimeQualityTier === 'number' ? runtimeQualityTier : 2,
      perception: { used: botPerceptionScansUsedThisFrame, budget: limits.perception },
      tactical: { used: botTacticalDecisionsUsedThisFrame, budget: limits.tactical },
      perceptionDeferrals: Number(combatDebug.perceptionScanDeferrals) || 0,
      tacticalDeferrals: Number(combatDebug.tacticalDecisionDeferrals) || 0
    };
  }
'''
new_bot_snapshot = '''  function botWorkBudgetSnapshot() {
    const limits = botWorkLimits();
    return {
      frame: botWorkFrame,
      workWindow: typeof simulationWorkWindowIndex === 'number' ? simulationWorkWindowIndex : -1,
      policyRevision: SIMULATION_WORK_POLICY.revision,
      renderQualityTier: typeof runtimeQualityTier === 'number' ? runtimeQualityTier : 2,
      perception: { used: botPerceptionScansUsedThisFrame, budget: limits.perception },
      tactical: { used: botTacticalDecisionsUsedThisFrame, budget: limits.tactical },
      perceptionDeferrals: Number(combatDebug.perceptionScanDeferrals) || 0,
      tacticalDeferrals: Number(combatDebug.tacticalDecisionDeferrals) || 0
    };
  }
'''
text = one(text, old_bot_snapshot, new_bot_snapshot, 'bot work snapshot')
write(bot_ai, text)

match_flow = SRC / 'js' / '40-match-flow.js'
text = read(match_flow)
text = one(
    text,
    '''  function startRound() {
    if (betweenRoundTacticsEl) {''',
    '''  function startRound() {
    if (typeof resetSimulationWorkWindow === 'function') resetSimulationWorkWindow('round-start');
    if (betweenRoundTacticsEl) {''',
    'round simulation work reset'
)
write(match_flow, text)

runtime = SRC / 'js' / '70-runtime.js'
text = read(runtime)
text = one(
    text,
    '''  function updateMatchStep(dt) {
    simulationClock += dt;''',
    '''  function updateMatchStep(dt) {
    beginSimulationWorkWindow();
    simulationClock += dt;''',
    'simulation work window entry'
)
old_frame_budget = '''        // One navigation budget spans every fixed simulation substep produced by
        // this rendered frame, preventing catch-up updates or higher match speed
        // from concentrating several full A* searches into the same frame.
        if (typeof beginNavigationPlanningFrame === 'function') beginNavigationPlanningFrame();
        if (typeof beginBotWorkFrame === 'function') beginBotWorkFrame();
        let remaining = dt * matchSpeedMultiplier;
'''
new_frame_budget = '''        // AI and route work reset from simulationClock inside updateMatchStep().
        // Display refresh rate and render pressure therefore cannot change budgets.
        let remaining = dt * matchSpeedMultiplier;
'''
text = one(text, old_frame_budget, new_frame_budget, 'render-frame work reset block')
profile_pattern = r'''    runtimeQualityProfileForTest: \(\) => \{.*?\n    \},\n    adaptiveResolutionForTest:'''
profile_replacement = '''    runtimeQualityProfileForTest: () => simulationQualityIndependenceForTest(),
    simulationQualityIndependenceForTest: () => simulationQualityIndependenceForTest(),
    simulationWorkPolicyForTest: () => simulationWorkPolicySnapshot(),
    adaptiveResolutionForTest:'''
text = regex_one(text, profile_pattern, profile_replacement, 'runtime quality profile hook', flags=re.S)
write(runtime, text)

index = SRC / 'index.html'
text = read(index)
text = one(text, '<title>Strikewatch 12.196: Clean Spectator Handoffs</title>', f'<title>Strikewatch {VERSION}: {NAME}</title>', 'index title')
if '12.196.0-clean-spectator-handoffs' not in text or '12.196' not in text:
    raise SystemExit('Current index release identity is missing')
text = text.replace('12.196.0-clean-spectator-handoffs', BUILD_ID).replace('12.196', VERSION)
write(index, text)
write(release_path, json.dumps({'version': VERSION, 'name': NAME, 'build_id': BUILD_ID}, indent=2) + '\n')

write(SRC / f'AUDIT-{VERSION}.md', f'''# Build {VERSION} — {NAME}

## Scope

The adaptive runtime tier previously controlled both presentation cost and match intelligence. Under frame pressure, Constrained mode increased perception intervals, reduced perception/tactical work from 4/4 to 2/2 and reduced normal navigation plans from two to one per rendered frame. Because those counters reset from the display loop, device refresh rate and thermal performance could change operator awareness and routing opportunities.

## Changes

- Added the fixed `SIMULATION_WORK_POLICY` in `js/00-core.js`: 33ms simulation windows, 45ms combat perception, 68ms idle perception, four perception scans, four tactical decisions, two normal route plans and three urgent route plans per window.
- `runtimeQualityTier` remains adaptive but is now render-only. It still controls operator LOD and resolution floors; it no longer enters perception, tactical or navigation policy.
- Added `simulationWorkWindowIndexForTime()`, `beginSimulationWorkWindow()` and `resetSimulationWorkWindow()`. Work budgets reset from `simulationClock`, not `requestAnimationFrame` frequency.
- `updateMatchStep()` now opens the relevant simulation-time window before advancing the match. The display-loop reset was removed, and round starts explicitly invalidate the prior work window.
- `js/30-bot-ai.js` and `js/20-navigation.js` consume only the fixed policy. Their snapshots report the current simulation window, policy revision and render tier separately.
- Added `simulationQualityIndependenceForTest()` plus `simulationWorkPolicyForTest()`. The legacy `runtimeQualityProfileForTest()` now routes to the independence diagnostic.

## Behaviour boundaries

The former Full-tier intelligence policy becomes the one match policy on every device. Weapon values, player statistics, tactics, movement rules, path scoring, line of sight, damage, rewards, saves and schemas are unchanged. Slow devices may still lower resolution and model detail, and the existing 33ms frame-delta cap may slow wall-clock match progress rather than skipping simulation work.

## Verification

- The independence diagnostic proves all three render tiers expose identical perception, tactical and navigation policy while operator detail remains tier-sensitive.
- Source gates prove `runtimeQualityTier` is absent from perception, bot-budget and route-budget decision functions.
- The simulation window is opened only from `updateMatchStep()` and the old display-frame budget reset is absent.
- Every modular JavaScript file, generated bundle and standalone inline script parses with Node.
- Existing spectator, renderer, navigation, arena, persistence and loadout hooks remain present.
- Two builds produce identical outputs and root `cod.html` is byte-identical to the standalone.
''')

changelog = SRC / 'CHANGELOG.md'
text = read(changelog)
entry = f'''## {VERSION} — {NAME}

- Separates adaptive render quality from match intelligence and route planning.
- Uses one fixed Full-policy perception/tactical/navigation budget on every device.
- Resets AI work from 33ms simulation-time windows instead of displayed frames.
- Adds `simulationQualityIndependenceForTest()` and preserves adaptive resolution/LOD.
- See `AUDIT-{VERSION}.md`.

'''
if f'## {VERSION} — {NAME}' in text:
    raise SystemExit('Build 12.197 changelog already exists')
pos = text.find('## ')
if pos < 0:
    raise SystemExit('Could not locate changelog insertion anchor')
write(changelog, text[:pos] + entry + text[pos:])

handoff = SRC / 'HANDOFF.md'
text = read(handoff)
text = one(text, '- Build: **12.196 — Clean Spectator Handoffs**', f'- Build: **{VERSION} — {NAME}**', 'HANDOFF build')
text = one(text, '- Build ID: `12.196.0-clean-spectator-handoffs`', f'- Build ID: `{BUILD_ID}`', 'HANDOFF build id')
text = one(text, 'strikewatch-source/dist/strikewatch-build-12.196.html', f'strikewatch-source/dist/strikewatch-build-{VERSION}.html', 'HANDOFF standalone path')
anchor = 'Build 12.196 owns clean first-person subject handoffs across `js/60-renderer-core.js` and `js/63-viewmodel-renderer.js`.'
note = f'''Build {VERSION} owns the device-independent simulation-work boundary across `js/00-core.js`, `js/20-navigation.js`, `js/30-bot-ai.js`, `js/40-match-flow.js` and `js/70-runtime.js`. Preserve `SIMULATION_WORK_POLICY`, the 0.033-second simulation window, fixed former-Full perception/tactical/navigation limits, render-only `runtimeQualityTier`, round invalidation and `simulationQualityIndependenceForTest()`. Budget resets must originate from `updateMatchStep()`/`simulationClock`, never the display frame. Adaptive resolution and operator LOD may vary by device; match intelligence may not. Save schema 19 and diagnostics schema 1 are unchanged. See `AUDIT-{VERSION}.md`.

'''
text = one(text, anchor, note + anchor, 'HANDOFF current release anchor')
write(handoff, text)

agents = SRC / 'AGENTS.md'
text = read(agents)
anchor = 'Build 12.196 owns clean spectator subject handoffs in `js/60-renderer-core.js` and `js/63-viewmodel-renderer.js`.'
note = f'''Build {VERSION} owns device-independent match work scheduling. `runtimeQualityTier` is render-only; do not use it in perception intervals, bot work limits, tactical decisions or navigation limits. Keep `SIMULATION_WORK_POLICY` fixed at the former Full policy and reset work through `beginSimulationWorkWindow()` from `updateMatchStep()`, with `startRound()` invalidating the old window. Verify `simulationQualityIndependenceForTest()`, `runtimeQualityGovernorForTest()`, navigation/bot snapshots and adjacent gameplay gates. Save schema 19 and diagnostics schema 1 remain unchanged. See `AUDIT-{VERSION}.md`.

'''
text = one(text, anchor, note + anchor, 'AGENTS current release anchor')
write(agents, text)

contracts = SRC / 'CONTRACTS.md'
text = read(contracts)
anchor = '- First-person spectator presentation belongs to the currently viewed camera object.'
contract = '''- Adaptive device quality is presentation-only. Resolution, render LOD and other visual cost may respond to frame pressure, but perception cadence, tactical work and navigation planning use one fixed policy scheduled from simulation time. Their work windows must not reset from `requestAnimationFrame`, refresh rate, hardware concurrency, device memory or render tier. An overloaded device may display fewer frames or advance wall-clock match time more slowly; it must not receive weaker operator intelligence.\n'''
text = one(text, anchor, contract + anchor, 'simulation quality contract anchor')
write(contracts, text)

architecture = SRC / 'ARCHITECTURE.md'
text = read(architecture)
text = one(text, '| `00-core.js` | Build metadata, constants, maps, zones, decor, props, weapons, shared state and utilities |', '| `00-core.js` | Build metadata, constants, maps, shared state, render-quality policy and fixed simulation-work policy |', 'core ownership')
text = one(text, '| `20-navigation.js` | Navigation-grid construction, paths, support geometry and doors |', '| `20-navigation.js` | Navigation-grid construction, paths, doors and fixed simulation-window planning budgets |', 'navigation ownership')
text = one(text, '| `30-bot-ai.js` | Operator state, perception, movement, tactics, combat decisions and animation state |', '| `30-bot-ai.js` | Operator state, perception, movement, tactics, combat and fixed simulation-window work budgets |', 'bot ownership')
text = one(text, '| `70-runtime.js` | DOM binding, main loop, input, startup and public test hooks |', '| `70-runtime.js` | DOM binding, main loop, simulation-time work-window coordination, input, startup and public test hooks |', 'runtime ownership')
write(architecture, text)

read_first = SRC / '00-READ-FIRST-GPT.md'
text = read(read_first)
text = one(text, 'Current release: **Strikewatch Build 12.196 — Clean Spectator Handoffs**.', f'Current release: **Strikewatch Build {VERSION} — {NAME}**.', 'read-first release')
write(read_first, text)

readme = SRC / 'README.md'
text = read(readme)
text = one(text, '# Strikewatch Source 12.196', f'# Strikewatch Source {VERSION}', 'README heading')
text = one(text, 'dist/strikewatch-build-12.196.html', f'dist/strikewatch-build-{VERSION}.html', 'README standalone path')
write(readme, text)

project = SRC / 'PROJECT.md'
text = read(project)
old_project = 'Build 12.196 resets transient first-person weapon and camera-response presentation whenever the viewed operator changes, then applies a reduced-motion-aware canvas handoff while preserving selection timing, gameplay, persistence and schemas. See `HANDOFF.md` and `AUDIT-12.196.md`.'
new_project = f'Build {VERSION} separates adaptive presentation quality from match intelligence, using fixed simulation-time perception, tactical and navigation budgets on every device while preserving adaptive resolution, persistence and schemas. See `HANDOFF.md` and `AUDIT-{VERSION}.md`.'
text = one(text, old_project, new_project, 'PROJECT current release')
write(project, text)

shutil.rmtree(ROOT / '.github' / 'scripts' / '__pycache__', ignore_errors=True)
shutil.rmtree(SRC / '__pycache__', ignore_errors=True)

core_text = read(core)
nav_text = read(navigation)
bot_text = read(bot_ai)
flow_text = read(match_flow)
runtime_text = read(runtime)
required_core = [
    "revision: '12.197-device-independent-simulation-1'",
    'windowSeconds: 0.033',
    'perceptionIdleSeconds: 0.068',
    'perceptionCombatSeconds: 0.045',
    'perceptionPerWindow: 4',
    'tacticalPerWindow: 4',
    'navigationNormalPerWindow: 2',
    'navigationUrgentPerWindow: 3',
    'function beginSimulationWorkWindow()',
    'function simulationQualityIndependenceForTest()'
]
missing = [item for item in required_core if item not in core_text]
if missing:
    raise SystemExit(f'Missing simulation-quality requirements: {missing}')
if "const base = combat ? SIMULATION_WORK_POLICY.perceptionCombatSeconds" not in core_text:
    raise SystemExit('Perception interval is not fixed to simulation policy')
if 'return BOT_WORK_LIMITS;' not in bot_text:
    raise SystemExit('Bot work limits are not fixed')
if 'const limit = urgent ? NAVIGATION_URGENT_PLAN_BUDGET_PER_FRAME : NAVIGATION_PLAN_BUDGET_PER_FRAME;' not in nav_text:
    raise SystemExit('Navigation limits are not fixed')
if "resetSimulationWorkWindow('round-start')" not in flow_text:
    raise SystemExit('Round start does not invalidate the simulation work window')
if runtime_text.count('beginSimulationWorkWindow();') != 1:
    raise SystemExit('Simulation work window entry is missing or duplicated')
if 'One navigation budget spans every fixed simulation substep' in runtime_text:
    raise SystemExit('Legacy display-frame work reset survived')
if 'simulationQualityIndependenceForTest: () => simulationQualityIndependenceForTest()' not in runtime_text:
    raise SystemExit('Public simulation independence hook is missing')
