from pathlib import Path

root = Path('strikewatch-source')
checkpoint_path = root / 'js/79-save-checkpoints.js'
text = checkpoint_path.read_text(encoding='utf-8')
anchor = "  window.__strikeDebug.bloodSplatterCountForTest = () => ({ count: bloodDecals.length, spots: bloodDecals.reduce((total, splatter) => total + splatter.spots.length, 0), limit: BLOOD_DECAL_LIMIT });\n"
addition = anchor + """  window.__strikeDebug.bloodDecalDrawPassForTest = () => {
    if (typeof drawBloodDecals !== 'function' || !gl) return { ok: false, reason: 'Blood draw pass unavailable.' };
    const spots = bloodDecals.reduce((total, splatter) => total + splatter.spots.length, 0);
    const before = rendererFrameStats.drawCalls;
    drawBloodDecals();
    const drawCalls = rendererFrameStats.drawCalls - before;
    return {
      ok: drawCalls === spots,
      events: bloodDecals.length,
      spots,
      drawCalls,
      limit: BLOOD_DECAL_LIMIT
    };
  };
"""
if text.count(anchor) != 1:
    raise SystemExit('Blood count hook insertion point missing')
checkpoint_path.write_text(text.replace(anchor, addition, 1), encoding='utf-8', newline='\n')

audit_path = root / 'AUDIT-12.185.md'
audit = audit_path.read_text(encoding='utf-8')
audit = audit.replace('at 390px, 833px and 1440px', 'at 500px, 833px and 1440px')
audit = audit.replace('compact portrait renderer probe', '500px compact renderer probe')
audit = audit.replace('renderer draw-call growth stays within that bounded spot count', 'the direct blood render pass reports exactly one draw per bounded procedural spot')
if 'at 390px, 833px and 1440px' in audit or 'compact portrait renderer probe' in audit:
    raise SystemExit('Audit viewport wording was not fully corrected')
audit_path.write_text(audit, encoding='utf-8', newline='\n')
