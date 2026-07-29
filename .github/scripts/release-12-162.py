from pathlib import Path
import json

root = Path('strikewatch-source')

def replace(path, old, new, count=1):
    p = root / path
    text = p.read_text(encoding='utf-8')
    if text.count(old) < count:
        raise SystemExit(f'{path}: missing expected text: {old[:80]!r}')
    p.write_text(text.replace(old, new, count), encoding='utf-8', newline='\n')

replace(Path('js/00-core.js'), "const BUILD_VERSION = '12.161';", "const BUILD_VERSION = '12.162';")
replace(Path('js/00-core.js'), "const BUILD_NAME = 'Recovery & Readability';", "const BUILD_NAME = 'Visible Geometry';")
replace(Path('js/00-core.js'), "const BUILD_ID = '12.161.0-recovery-readability';", "const BUILD_ID = '12.162.0-visible-geometry';")

index = root / 'index.html'
text = index.read_text(encoding='utf-8')
text = text.replace('Strikewatch 12.161: Recovery & Readability', 'Strikewatch 12.162: Visible Geometry')
text = text.replace('12.161.0-recovery-readability', '12.162.0-visible-geometry')
text = text.replace('>12.161</b>', '>12.162</b>')
index.write_text(text, encoding='utf-8', newline='\n')

(root / 'RELEASE.json').write_text(json.dumps({
    'version': '12.162',
    'name': 'Visible Geometry',
    'build_id': '12.162.0-visible-geometry'
}, indent=2) + '\n', encoding='utf-8', newline='\n')

renderer = root / 'js/60-renderer-core.js'
text = renderer.read_text(encoding='utf-8')
anchor = """  const STATIC_WORLD_BATCHING_ENABLED = (() => {
    try {
      return new URLSearchParams(window.location.search).get('staticBatching') !== '0';
    } catch (_) {
      return true;
    }
  })();
"""
addition = anchor + """  // Build 12.162: reject complete operator assemblies only when a generous
  // guard sphere is wholly outside the camera. `?dynamicCulling=0` is the
  // pixel-reference path and changes no simulation state.
  const DYNAMIC_ACTOR_CULLING_ENABLED = (() => {
    try {
      return new URLSearchParams(window.location.search).get('dynamicCulling') !== '0';
    } catch (_) {
      return true;
    }
  })();
"""
if anchor not in text:
    raise SystemExit('Static batching anchor missing')
text = text.replace(anchor, addition, 1)
text = text.replace("""    staticSourceDraws: 0,
    staticBatchDrawCalls: 0
""", """    staticSourceDraws: 0,
    staticBatchDrawCalls: 0,
    dynamicActorCandidates: 0,
    dynamicActorsCulled: 0
""", 1)
text = text.replace("""    staticSourceDraws: 0,
    staticBatchDrawCalls: 0,
    cullingEnabled: STATIC_WORLD_CULLING_ENABLED,
    batchingEnabled: STATIC_WORLD_BATCHING_ENABLED
""", """    staticSourceDraws: 0,
    staticBatchDrawCalls: 0,
    dynamicActorCandidates: 0,
    dynamicActorsCulled: 0,
    cullingEnabled: STATIC_WORLD_CULLING_ENABLED,
    batchingEnabled: STATIC_WORLD_BATCHING_ENABLED,
    dynamicActorCullingEnabled: DYNAMIC_ACTOR_CULLING_ENABLED
""", 1)
text = text.replace("""    rendererFrameStats.staticSourceDraws = 0;
    rendererFrameStats.staticBatchDrawCalls = 0;
""", """    rendererFrameStats.staticSourceDraws = 0;
    rendererFrameStats.staticBatchDrawCalls = 0;
    rendererFrameStats.dynamicActorCandidates = 0;
    rendererFrameStats.dynamicActorsCulled = 0;
""", 1)
text = text.replace("""    rendererLastFrameStats.staticSourceDraws = rendererFrameStats.staticSourceDraws;
    rendererLastFrameStats.staticBatchDrawCalls = rendererFrameStats.staticBatchDrawCalls;
    rendererLastFrameStats.cullingEnabled = STATIC_WORLD_CULLING_ENABLED;
    rendererLastFrameStats.batchingEnabled = STATIC_WORLD_BATCHING_ENABLED;
""", """    rendererLastFrameStats.staticSourceDraws = rendererFrameStats.staticSourceDraws;
    rendererLastFrameStats.staticBatchDrawCalls = rendererFrameStats.staticBatchDrawCalls;
    rendererLastFrameStats.dynamicActorCandidates = rendererFrameStats.dynamicActorCandidates;
    rendererLastFrameStats.dynamicActorsCulled = rendererFrameStats.dynamicActorsCulled;
    rendererLastFrameStats.cullingEnabled = STATIC_WORLD_CULLING_ENABLED;
    rendererLastFrameStats.batchingEnabled = STATIC_WORLD_BATCHING_ENABLED;
    rendererLastFrameStats.dynamicActorCullingEnabled = DYNAMIC_ACTOR_CULLING_ENABLED;
""", 1)
text = text.replace("""    document.body.dataset.rendererStaticBatchDrawCalls = String(rendererLastFrameStats.staticBatchDrawCalls);
    document.body.dataset.rendererStaticCulling = rendererLastFrameStats.cullingEnabled ? 'on' : 'off';
""", """    document.body.dataset.rendererStaticBatchDrawCalls = String(rendererLastFrameStats.staticBatchDrawCalls);
    document.body.dataset.rendererDynamicActorCandidates = String(rendererLastFrameStats.dynamicActorCandidates);
    document.body.dataset.rendererDynamicActorsCulled = String(rendererLastFrameStats.dynamicActorsCulled);
    document.body.dataset.rendererDynamicActorCulling = rendererLastFrameStats.dynamicActorCullingEnabled ? 'on' : 'off';
    document.body.dataset.rendererStaticCulling = rendererLastFrameStats.cullingEnabled ? 'on' : 'off';
""", 1)
marker = "  function drawMesh(mesh, colour, model, emissive = 0, alpha = 1, surface = 0, roughness = 0.76) {"
helper = """  function dynamicActorOutsideCameraView(worldX, worldY, worldZ, radius = 1.85) {
    rendererFrameStats.dynamicActorCandidates++;
    if (!DYNAMIC_ACTOR_CULLING_ENABLED) return false;
    const viewX = glView[0] * worldX + glView[4] * worldY + glView[8] * worldZ + glView[12];
    const viewY = glView[1] * worldX + glView[5] * worldY + glView[9] * worldZ + glView[13];
    const viewZ = glView[2] * worldX + glView[6] * worldY + glView[10] * worldZ + glView[14];
    const depth = -viewZ;
    const safeRadius = Math.max(0.01, Number(radius) || 1.85);
    let outside = depth + safeRadius < 0.025 || depth - safeRadius > GL_FAR;
    if (!outside) {
      const horizontalSlope = 1 / Math.max(0.0001, glProjection[0]);
      const verticalSlope = 1 / Math.max(0.0001, glProjection[5]);
      const horizontalAllowance = safeRadius * Math.hypot(1, horizontalSlope);
      const verticalAllowance = safeRadius * Math.hypot(1, verticalSlope);
      outside = Math.abs(viewX) > depth * horizontalSlope + horizontalAllowance
        || Math.abs(viewY) > depth * verticalSlope + verticalAllowance;
    }
    if (outside) rendererFrameStats.dynamicActorsCulled++;
    return outside;
  }

""" + marker
if marker not in text:
    raise SystemExit('drawMesh marker missing')
text = text.replace(marker, helper, 1)
renderer.write_text(text, encoding='utf-8', newline='\n')

characters = root / 'js/62-character-renderer.js'
text = characters.read_text(encoding='utf-8')
text = text.replace("""    const corpseDistance = Math.hypot(dx, dz);
    const detailTier = typeof runtimeOperatorDetailTier === 'function' ? runtimeOperatorDetailTier(corpseDistance) : 2;
""", """    const corpseDistance = Math.hypot(dx, dz);
    if (dynamicActorOutsideCameraView(bot.x, 0.82, bot.y, 1.85)) return;
    const detailTier = typeof runtimeOperatorDetailTier === 'function' ? runtimeOperatorDetailTier(corpseDistance) : 2;
""", 1)
text = text.replace("""    const operatorDistance = Math.hypot(dx, dz);
    const detailTier = typeof runtimeOperatorDetailTier === 'function' ? runtimeOperatorDetailTier(operatorDistance) : 2;
""", """    const operatorDistance = Math.hypot(dx, dz);
    if (dynamicActorOutsideCameraView(bot.x, 0.92, bot.y, 1.85)) return;
    const detailTier = typeof runtimeOperatorDetailTier === 'function' ? runtimeOperatorDetailTier(operatorDistance) : 2;
""", 1)
characters.write_text(text, encoding='utf-8', newline='\n')

checkpoints = root / 'js/79-save-checkpoints.js'
text = checkpoints.read_text(encoding='utf-8')
marker = "  // Reports the baked occlusion actually assigned to the current arena's wall"
hook = """  window.__strikeDebug.dynamicActorCullingForTest = () => {
    const savedView = new Float32Array(glView);
    const savedProjection = new Float32Array(glProjection);
    const savedCandidates = rendererFrameStats.dynamicActorCandidates;
    const savedCulled = rendererFrameStats.dynamicActorsCulled;
    try {
      mat4LookAt(glView, [0, 1, 0], [0, 1, -1], [0, 1, 0]);
      mat4Perspective(glProjection, Math.PI / 3, 16 / 9, 0.025, GL_FAR);
      rendererFrameStats.dynamicActorCandidates = 0;
      rendererFrameStats.dynamicActorsCulled = 0;
      const cases = {
        centred: dynamicActorOutsideCameraView(0, 1, -6, 1.85),
        edgeGuard: dynamicActorOutsideCameraView(5, 1, -6, 1.85),
        behind: dynamicActorOutsideCameraView(0, 1, 6, 1.85),
        farSide: dynamicActorOutsideCameraView(30, 1, -6, 1.85),
        beyondFar: dynamicActorOutsideCameraView(0, 1, -(GL_FAR + 4), 1.85)
      };
      return {
        ok: !cases.centred && !cases.edgeGuard && cases.behind && cases.farSide && cases.beyondFar,
        enabled: DYNAMIC_ACTOR_CULLING_ENABLED,
        cases,
        candidates: rendererFrameStats.dynamicActorCandidates,
        culled: rendererFrameStats.dynamicActorsCulled,
        conservativeRadius: 1.85
      };
    } finally {
      glView.set(savedView);
      glProjection.set(savedProjection);
      rendererFrameStats.dynamicActorCandidates = savedCandidates;
      rendererFrameStats.dynamicActorsCulled = savedCulled;
    }
  };
  // Build 12.162: deterministic whole-actor frustum guard.
""" + marker
if marker not in text:
    raise SystemExit('Diagnostic marker missing')
text = text.replace(marker, hook, 1)
checkpoints.write_text(text, encoding='utf-8', newline='\n')

handoff = root / 'HANDOFF.md'
text = handoff.read_text(encoding='utf-8')
text = text.replace('Build: **12.161 — Recovery & Readability**', 'Build: **12.162 — Visible Geometry**', 1)
text = text.replace('Build ID: `12.161.0-recovery-readability`', 'Build ID: `12.162.0-visible-geometry`', 1)
text = text.replace('strikewatch-build-12.161.html', 'strikewatch-build-12.162.html', 1)
anchor = 'Build 12.161 fixes the returning-career startup migration crash'
position = text.find(anchor)
if position < 0:
    raise SystemExit('HANDOFF anchor missing')
note = 'Build 12.162 adds conservative whole-operator frustum culling before procedural body, armour and weapon assembly. A 1.85-unit guard sphere must be wholly outside the camera before any draw is skipped. Use `?dynamicCulling=0` as the visual reference and keep `dynamicActorCullingForTest()` green. See `AUDIT-12.162.md`.\n\n'
text = text[:position] + note + text[position:]
handoff.write_text(text, encoding='utf-8', newline='\n')

agents = root / 'AGENTS.md'
text = agents.read_text(encoding='utf-8')
anchor = 'Build 12.160 owns the surface-detail coordinate space.'
position = text.find(anchor)
if position < 0:
    raise SystemExit('AGENTS anchor missing')
note = 'Build 12.162 owns whole-operator frustum culling. Keep the 1.85-unit guard radius conservative; `?dynamicCulling=0` is the reference path and `dynamicActorCullingForTest()` is the deterministic guard. See `AUDIT-12.162.md`.\n\n'
text = text[:position] + note + text[position:]
agents.write_text(text, encoding='utf-8', newline='\n')

contracts = root / 'CONTRACTS.md'
text = contracts.read_text(encoding='utf-8')
anchor = '- Static world batching bakes model matrices at capture time.'
position = text.find(anchor)
if position < 0:
    raise SystemExit('CONTRACTS anchor missing')
note = '- Dynamic actor culling is presentation-only. The complete living/fallen silhouette, shadow and equipped weapon must remain inside a conservative guard sphere, and the sphere must be wholly outside the camera before draws are skipped. `?dynamicCulling=0` is the visual reference.\n'
text = text[:position] + note + text[position:]
contracts.write_text(text, encoding='utf-8', newline='\n')

for name in ['README.md', 'PROJECT.md', '00-READ-FIRST-GPT.md']:
    p = root / name
    text = p.read_text(encoding='utf-8')
    text = text.replace('12.161', '12.162', 1)
    p.write_text(text, encoding='utf-8', newline='\n')

changelog = root / 'CHANGELOG.md'
text = changelog.read_text(encoding='utf-8')
text = text.replace('# Strikewatch changelog\n', '# Strikewatch changelog\n\n## 12.162 — Visible Geometry\n\n- Conservative whole-operator frustum culling before procedural draw assembly.\n- No geometry, materials, gameplay, persistence, collision, navigation or AI changes.\n- See `AUDIT-12.162.md`.\n', 1)
changelog.write_text(text, encoding='utf-8', newline='\n')

(root / 'AUDIT-12.162.md').write_text("""# Build 12.162 — Visible Geometry

## Scope

Adds conservative whole-operator camera-frustum culling before procedural body, armour, shadow and weapon assembly. Operators are skipped only when a 1.85-unit guard sphere is wholly outside the camera.

## Visual fidelity

No meshes, materials, shaders, transforms, animation, LOD thresholds or colours changed. `?dynamicCulling=0` disables only this optimisation and remains the visual-reference path. Actors intersecting the viewport guard band continue to render.

## Behaviour boundaries

AI, collision, hit detection, navigation, line of sight, match simulation, saves and gameplay state are untouched. Living and fallen operators use the same conservative radius.

## Verification

- `dynamicActorCullingForTest()` covers centred, edge-guard, behind-camera, side and far-plane cases.
- Modular, generated and standalone JavaScript parse.
- Two builds are byte-identical.
- Root `cod.html` is byte-identical to the standalone.
""", encoding='utf-8', newline='\n')
