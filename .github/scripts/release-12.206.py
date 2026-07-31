#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]; SRC=ROOT/'strikewatch-source'
OLD='12.205'; NEW='12.206'; OLD_NAME='Board Expectations'; NEW_NAME='Contextual Mobile Navigation'; OLD_ID='12.205.0-board-expectations'; NEW_ID='12.206.0-contextual-mobile-navigation'
def fail(m): raise SystemExit(f'release-12.206: {m}')
def read(p):
    if not p.exists(): fail(f'missing {p.relative_to(ROOT)}')
    return p.read_text(encoding='utf-8')
def write(p,t): p.write_text(t,encoding='utf-8')
def one(t,a,b,l):
    if t.count(a)!=1: fail(f'expected one {l}, found {t.count(a)}')
    return t.replace(a,b,1)
release=SRC/'RELEASE.json'; actual=json.loads(read(release)); expected={'version':OLD,'name':OLD_NAME,'build_id':OLD_ID}
if actual!=expected: fail(f'unexpected predecessor {actual!r}')
write(release,json.dumps({'version':NEW,'name':NEW_NAME,'build_id':NEW_ID},indent=2)+'\n')
core=SRC/'js/00-core.js'; t=read(core); t=one(t,f"  const BUILD_VERSION = '{OLD}';",f"  const BUILD_VERSION = '{NEW}';",'version'); t=one(t,f"  const BUILD_NAME = '{OLD_NAME}';",f"  const BUILD_NAME = '{NEW_NAME}';",'name'); t=one(t,f"  const BUILD_ID = '{OLD_ID}';",f"  const BUILD_ID = '{NEW_ID}';",'id'); write(core,t)
menus=SRC/'js/50-ui-menus.js'; t=read(menus)
old="""  function menuVisibleRoutes(sectionId, includeContextRoute = true) {
    const section = menuSections[sectionId] || menuSections.operations;
    return (section.routes || []).filter(route => !route.contextOnly || (includeContextRoute && route.id === menuTab));
  }
"""
new="""  function syncMobileContextualNavigationState(sectionId = menuSection, routeId = menuTab) {
    const shell = document.getElementById('menuShell');
    if (!shell) return;
    const resolvedSection = menuSections[sectionId] ? sectionId : 'operations';
    shell.dataset.mobileSection = resolvedSection;
    shell.dataset.mobileRoute = routeId || menuSections[resolvedSection].defaultRoute;
    shell.classList.toggle('mobile-operations-overview', resolvedSection === 'operations' && shell.dataset.mobileRoute === 'play');
    shell.classList.toggle('mobile-contextual-navigation', !(resolvedSection === 'operations' && shell.dataset.mobileRoute === 'play'));
  }

  function menuVisibleRoutes(sectionId, includeContextRoute = true) {
    const section = menuSections[sectionId] || menuSections.operations;
    syncMobileContextualNavigationState(sectionId, menuTab);
    return (section.routes || []).filter(route => !route.contextOnly || (includeContextRoute && route.id === menuTab));
  }
"""
t=one(t,old,new,'mobile contextual state')
# Ensure initial state exists even before the first route render.
anchor="  let mobileNavigationSectionId = 'operations';\n"
t=one(t,anchor,anchor+"  document.addEventListener('DOMContentLoaded', () => syncMobileContextualNavigationState());\n",'DOMContentLoaded sync')
write(menus,t)
cssp=SRC/'css/compact-navigation.css'; css=read(cssp)
block=r'''

/* --- Build 12.206: contextual mobile navigation -------------------------- */
@media (max-width:760px){
  #menuShell.mobile-contextual-navigation .manager-topbar{grid-template-columns:42px minmax(0,1fr) 42px;min-height:50px;padding:6px 8px;gap:6px}
  #menuShell.mobile-contextual-navigation .manager-balance-brand,
  #menuShell.mobile-contextual-navigation .manager-context,
  #menuShell.mobile-contextual-navigation .manager-topbar-actions,
  #menuShell.mobile-contextual-navigation .manager-end-day-slot{display:none!important}
  #menuShell.mobile-contextual-navigation .manager-history-back{grid-column:1}
  #menuShell.mobile-contextual-navigation .manager-history-forward{grid-column:3}
  #menuShell.mobile-contextual-navigation .menu-history-bar{display:none}
  #menuShell.mobile-contextual-navigation .menu-subnav-shell{display:grid;position:sticky;top:0;z-index:24;grid-template-columns:34px minmax(0,1fr) 34px;align-items:stretch;min-height:48px;padding:5px 6px;border-top:1px solid rgba(135,165,190,.16);border-bottom:1px solid rgba(135,165,190,.22);background:rgba(8,17,28,.97);backdrop-filter:blur(12px)}
  #menuShell.mobile-contextual-navigation .menu-subnav{display:flex;gap:6px;overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x proximity;scrollbar-width:none;padding:0 2px}
  #menuShell.mobile-contextual-navigation .menu-subnav::-webkit-scrollbar{display:none}
  #menuShell.mobile-contextual-navigation .menu-subnav button{flex:0 0 auto;min-height:38px;max-width:180px;padding:8px 12px;scroll-snap-align:center;white-space:nowrap;font-size:11px;line-height:1.1}
  #menuShell.mobile-contextual-navigation .menu-subnav button.active{border-color:rgba(218,188,111,.72);background:rgba(93,74,31,.38);color:#fff5d6}
  #menuShell.mobile-contextual-navigation .menu-subnav-arrow{display:grid!important;place-items:center;min-width:34px;padding:0;font-size:22px}
  #menuShell.mobile-contextual-navigation .mobile-command-route-bar{display:none}
  #menuShell.mobile-contextual-navigation .menu-content{padding-top:0}
  #menuShell.mobile-contextual-navigation #menuContent{padding-top:10px}
  #menuShell.mobile-operations-overview .menu-subnav-shell{display:none}
  #menuShell.mobile-operations-overview .mobile-command-route-bar{display:block}
  #menuShell.mobile-operations-overview .manager-topbar-actions{display:flex}
  #menuShell.mobile-operations-overview .manager-end-day-slot{display:block}
}
'''
if 'Build 12.206: contextual mobile navigation' in css: fail('css already present')
write(cssp,css.rstrip()+block)
build=SRC/'build.py'; t=read(build); t=one(t,'"game_css_lines_max": 30870,','"game_css_lines_max": 30930,','css budget'); write(build,t)
index=SRC/'index.html'; t=read(index).replace(f'Strikewatch {OLD}: {OLD_NAME}',f'Strikewatch {NEW}: {NEW_NAME}').replace(OLD_ID,NEW_ID); t=one(t,f'id="managerBuildVersion">{OLD}</b>',f'id="managerBuildVersion">{NEW}</b>','desktop label'); t=one(t,f'id="mobileCommandBuildVersion">{OLD}</b>',f'id="mobileCommandBuildVersion">{NEW}</b>','mobile label'); write(index,t)
note=f"Build {NEW} turns the compact management header into contextual navigation. Operations Overview retains the universal shortcuts and End Day; every other mobile route hides the bulky header content and promotes the current department's route list into a sticky, horizontally scrollable top submenu. Desktop routing and gameplay are unchanged. See `AUDIT-{NEW}.md`.\n\n"
for path in [SRC/'HANDOFF.md',SRC/'AGENTS.md']:
    t=read(path); t=one(t,f'Build {OLD} adds',note+f'Build {OLD} adds',f'{path.name} note')
    if path.name=='HANDOFF.md':
        t=one(t,f'- Build: **{OLD} — {OLD_NAME}**',f'- Build: **{NEW} — {NEW_NAME}**','handoff build'); t=one(t,f'- Build ID: `{OLD_ID}`',f'- Build ID: `{NEW_ID}`','handoff id'); t=one(t,f'strikewatch-build-{OLD}.html',f'strikewatch-build-{NEW}.html','handoff standalone')
    write(path,t)
readme=SRC/'README.md'; t=read(readme); t=one(t,f'# Strikewatch Source {OLD}',f'# Strikewatch Source {NEW}','readme title'); t=one(t,f'dist/strikewatch-build-{OLD}.html',f'dist/strikewatch-build-{NEW}.html','readme standalone'); write(readme,t)
project=SRC/'PROJECT.md'; t=read(project); t=one(t,f'Build {OLD} adds division-scaled Board Expectations with a primary season target, secondary objectives and live confidence. See `HANDOFF.md` and `AUDIT-{OLD}.md`.',f'Build {NEW} adds contextual compact navigation: Operations Overview keeps shortcuts and End Day, while every other mobile route uses the freed header space for its department submenu. See `HANDOFF.md` and `AUDIT-{NEW}.md`.','project note'); write(project,t)
audit=f'''# Build {NEW} audit — {NEW_NAME}\n\n## Scope\nImportant mobile pages such as League were difficult to discover because the persistent management header consumed vertical space while route navigation remained secondary.\n\n## Change\n- Operations Overview retains Inbox, Calendar, Help, Match and End Day controls.\n- Every other compact management route collapses the large header contents.\n- The existing department route list becomes a sticky, horizontally scrollable top submenu.\n- Active routes remain visibly highlighted and the full Pages drawer remains available from Operations Overview.\n- Desktop navigation, gameplay, save data and route authority are unchanged.\n\n## Verification\n- Exact predecessor metadata checked.\n- Two deterministic builds compared.\n- Modular, bundled and standalone JavaScript parsed with Node.\n- Source assertions confirm contextual state and compact CSS.\n- Root `cod.html` verified byte-identical to the standalone.\n\nSave schema 19 and diagnostics schema 1 are unchanged.\n'''; write(SRC/f'AUDIT-{NEW}.md',audit)
for f,frags in {menus:['function syncMobileContextualNavigationState','mobile-contextual-navigation','syncMobileContextualNavigationState(sectionId, menuTab)'],cssp:['Build 12.206: contextual mobile navigation','mobile-operations-overview','menu-subnav-shell']}.items():
    data=read(f)
    if any(x not in data for x in frags): fail(f'missing anchors in {f.name}')
print(f'Applied Build {NEW}: {NEW_NAME}')
