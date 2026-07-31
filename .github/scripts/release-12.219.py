from pathlib import Path
import json
R=Path(__file__).resolve().parents[2]; S=R/'strikewatch-source'
def rd(p): return p.read_text(encoding='utf-8')
def wr(p,t): p.write_text(t,encoding='utf-8')
def rep(t,a,b,label):
    if t.count(a)!=1: raise SystemExit(f'{label}: expected 1, found {t.count(a)}')
    return t.replace(a,b,1)
old='12.218'; new='12.219'; on='Mobile Information Architecture'; nn='Ops Alert Indicator'; oi='12.218.0-mobile-information-architecture'; ni='12.219.0-ops-alert-indicator'
p=S/'RELEASE.json'; assert json.loads(rd(p))=={'version':old,'name':on,'build_id':oi}; wr(p,json.dumps({'version':new,'name':nn,'build_id':ni},indent=2)+'\n')
p=S/'js/00-core.js'; t=rd(p); t=rep(t,f"  const BUILD_VERSION = '{old}';",f"  const BUILD_VERSION = '{new}';",'version'); t=rep(t,f"  const BUILD_NAME = '{on}';",f"  const BUILD_NAME = '{nn}';",'name'); t=rep(t,f"  const BUILD_ID = '{oi}';",f"  const BUILD_ID = '{ni}';",'id'); wr(p,t)
p=S/'css/compact-navigation.css'; t=rd(p)
old_css='.menu-tab[data-section="operations"].has-must-respond::before{content:"!";position:absolute;left:7px;top:7px;z-index:4;display:grid;place-items:center;width:17px;height:17px;border:1px solid rgba(255,190,180,.9);border-radius:50%;background:#b83e35;color:#fff;font-size:12px;font-weight:900;line-height:1;box-shadow:0 0 0 2px rgba(7,19,29,.8),0 2px 8px rgba(0,0,0,.35)}'
new_css='.menu-tab[data-section="operations"].has-must-respond::before{content:"!";position:absolute;inset:6px auto auto 6px;z-index:4;display:flex;align-items:center;justify-content:center;box-sizing:border-box;inline-size:18px;block-size:18px;min-inline-size:18px;max-inline-size:18px;min-block-size:18px;max-block-size:18px;padding:0;border:1px solid #ffd0c9;border-radius:999px;background:#c84439;color:#fff;font:900 12px/1 Arial,sans-serif;letter-spacing:0;writing-mode:horizontal-tb;transform:none;box-shadow:0 0 0 2px #07131d,0 2px 7px rgba(0,0,0,.4)}'
t=rep(t,old_css,new_css,'badge geometry')
t=t.replace('.menu-tab[data-section="operations"].has-must-respond::before{left:5px;top:5px}', '.menu-tab[data-section="operations"].has-must-respond::before{inset:5px auto auto 5px}')
wr(p,t)
p=S/'index.html'; t=rd(p).replace(f'Strikewatch {old}: {on}',f'Strikewatch {new}: {nn}').replace(oi,ni); t=rep(t,f'id="managerBuildVersion">{old}</b>',f'id="managerBuildVersion">{new}</b>','desktop'); t=rep(t,f'id="mobileCommandBuildVersion">{old}</b>',f'id="mobileCommandBuildVersion">{new}</b>','mobile'); wr(p,t)
note=f"Build {new} replaces the stretched Ops blocker marker with a fixed 18px circular alert indicator that cannot inherit the navigation tile's stretching or writing geometry. See `AUDIT-{new}.md`.\n\n"
for p in [S/'HANDOFF.md',S/'AGENTS.md']:
 t=rd(p); t=rep(t,f'Build {old} adds',note+f'Build {old} adds',p.name)
 if p.name=='HANDOFF.md': t=rep(t,f'- Build: **{old} — {on}**',f'- Build: **{new} — {nn}**','handoff build'); t=rep(t,f'- Build ID: `{oi}`',f'- Build ID: `{ni}`','handoff id'); t=rep(t,f'strikewatch-build-{old}.html',f'strikewatch-build-{new}.html','standalone')
 wr(p,t)
p=S/'README.md'; t=rd(p); t=rep(t,f'# Strikewatch Source {old}',f'# Strikewatch Source {new}','readme'); t=rep(t,f'dist/strikewatch-build-{old}.html',f'dist/strikewatch-build-{new}.html','dist'); wr(p,t)
p=S/'PROJECT.md'; t=rd(p); t=rep(t,f'Build {old} improves mobile information architecture across League, Equipment, Club and Operations. See `HANDOFF.md` and `AUDIT-{old}.md`.',f'Build {new} replaces the malformed Ops blocker marker with a stable compact alert badge. See `HANDOFF.md` and `AUDIT-{new}.md`.','project'); wr(p,t)
wr(S/f'AUDIT-{new}.md',f'''# Build {new} audit — {nn}\n\n- Replaced the Ops blocker pseudo-element with a fixed 18px circular indicator.\n- Explicit inline/block dimensions, box sizing, writing mode, font shorthand and transform isolation prevent inherited stretching.\n- The indicator remains driven by the existing `clubEndDayBlockers()` authority and disappears when blockers clear.\n- Navigation, gameplay, save schema 19 and diagnostics schema 1 are unchanged.\n''')
print('Applied 12.219')
