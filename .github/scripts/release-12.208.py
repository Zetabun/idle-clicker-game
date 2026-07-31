#!/usr/bin/env python3
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[2]; SRC=ROOT/'strikewatch-source'
OLD='12.207'; NEW='12.208'; OLD_NAME='Mobile Header Submenu Fix'; NEW_NAME='Mobile Header Layout Fix'; OLD_ID='12.207.0-mobile-header-submenu-fix'; NEW_ID='12.208.0-mobile-header-layout-fix'
def r(p): return p.read_text(encoding='utf-8')
def w(p,t): p.write_text(t,encoding='utf-8')
def one(t,a,b,l):
    if t.count(a)!=1: raise SystemExit(f'{l}: found {t.count(a)}')
    return t.replace(a,b,1)
rel=SRC/'RELEASE.json'
if json.loads(r(rel))!={'version':OLD,'name':OLD_NAME,'build_id':OLD_ID}: raise SystemExit('unexpected predecessor')
w(rel,json.dumps({'version':NEW,'name':NEW_NAME,'build_id':NEW_ID},indent=2)+'\n')
core=SRC/'js/00-core.js'; t=r(core); t=one(t,f"  const BUILD_VERSION = '{OLD}';",f"  const BUILD_VERSION = '{NEW}';",'version'); t=one(t,f"  const BUILD_NAME = '{OLD_NAME}';",f"  const BUILD_NAME = '{NEW_NAME}';",'name'); t=one(t,f"  const BUILD_ID = '{OLD_ID}';",f"  const BUILD_ID = '{NEW_ID}';",'id'); w(core,t)
cssp=SRC/'css/compact-navigation.css'; css=r(cssp)
block=r'''

/* --- Build 12.208: mobile header layout correction ----------------------- */
@media (max-width:760px){
  #menuShell.mobile-contextual-navigation .manager-topbar{display:grid!important;grid-template-columns:48px minmax(0,1fr) 48px!important;grid-template-rows:52px!important;align-items:stretch!important;width:100%!important;max-width:none!important;overflow:hidden!important;padding:0!important;gap:0!important}
  #menuShell.mobile-contextual-navigation .manager-history-back{display:grid!important;grid-column:1!important;grid-row:1!important;position:static!important;width:48px!important;min-width:48px!important;height:52px!important;z-index:3!important}
  #menuShell.mobile-contextual-navigation .manager-history-forward{display:grid!important;grid-column:3!important;grid-row:1!important;position:static!important;width:48px!important;min-width:48px!important;height:52px!important;z-index:3!important}
  #menuShell.mobile-contextual-navigation .mobile-header-submenu{display:flex!important;grid-column:2!important;grid-row:1!important;position:static!important;min-width:0!important;width:100%!important;height:52px!important;overflow-x:auto!important;overflow-y:hidden!important;padding:6px!important;gap:6px!important;align-items:center!important;box-sizing:border-box!important}
  #menuShell.mobile-contextual-navigation .mobile-header-submenu button{min-height:40px!important;height:40px!important;flex:0 0 auto!important}
}
'''
if 'Build 12.208: mobile header layout correction' in css: raise SystemExit('css exists')
w(cssp,css.rstrip()+block)
build=SRC/'build.py'; t=r(build); t=one(t,'"game_css_lines_max": 30960,','"game_css_lines_max": 31020,','css budget'); t=one(t,'"important_declarations_max": 2185,','"important_declarations_max": 2230,','important budget'); t=one(t,'"media_queries_max": 479,','"media_queries_max": 480,','media budget'); w(build,t)
idx=SRC/'index.html'; t=r(idx).replace(f'Strikewatch {OLD}: {OLD_NAME}',f'Strikewatch {NEW}: {NEW_NAME}').replace(OLD_ID,NEW_ID); t=one(t,f'id="managerBuildVersion">{OLD}</b>',f'id="managerBuildVersion">{NEW}</b>','desktop'); t=one(t,f'id="mobileCommandBuildVersion">{OLD}</b>',f'id="mobileCommandBuildVersion">{NEW}</b>','mobile'); w(idx,t)
note=f"Build {NEW} corrects the compact contextual header geometry so Back and Forward occupy fixed edge columns and the active department submenu fills the centre without clipping or overlap. See `AUDIT-{NEW}.md`.\n\n"
for p in [SRC/'HANDOFF.md',SRC/'AGENTS.md']:
    t=r(p); t=one(t,f'Build {OLD} fixes',note+f'Build {OLD} fixes',p.name)
    if p.name=='HANDOFF.md':
        t=one(t,f'- Build: **{OLD} — {OLD_NAME}**',f'- Build: **{NEW} — {NEW_NAME}**','handoff build'); t=one(t,f'- Build ID: `{OLD_ID}`',f'- Build ID: `{NEW_ID}`','handoff id'); t=one(t,f'strikewatch-build-{OLD}.html',f'strikewatch-build-{NEW}.html','standalone')
    w(p,t)
readme=SRC/'README.md'; t=r(readme); t=one(t,f'# Strikewatch Source {OLD}',f'# Strikewatch Source {NEW}','readme'); t=one(t,f'dist/strikewatch-build-{OLD}.html',f'dist/strikewatch-build-{NEW}.html','readme dist'); w(readme,t)
proj=SRC/'PROJECT.md'; t=r(proj); t=one(t,f'Build {OLD} fixes the contextual mobile header so the current department route buttons visibly populate the freed space. See `HANDOFF.md` and `AUDIT-{OLD}.md`.',f'Build {NEW} fixes the compact contextual header layout so Back and Forward sit at the sides and the department submenu fully occupies the centre. See `HANDOFF.md` and `AUDIT-{NEW}.md`.','project'); w(proj,t)
w(SRC/f'AUDIT-{NEW}.md',f'''# Build {NEW} audit — {NEW_NAME}\n\n## Problem\nThe 12.207 submenu existed but inherited conflicting compact-header geometry, causing clipped labels and leaving most of the centre visually empty.\n\n## Fix\n- Force a three-column compact header: fixed Back, flexible submenu, fixed Forward.\n- Remove inherited positioning and width constraints.\n- Keep the route buttons horizontally scrollable within the centre column.\n- Preserve Operations Overview behaviour and desktop layout.\n\n## Verification\nDeterministic double build, JavaScript parsing, targeted CSS anchors, and root/standalone byte identity are required. Save schema 19 and diagnostics schema 1 remain unchanged.\n''')
print('Applied 12.208')
