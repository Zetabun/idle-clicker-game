#!/usr/bin/env python3
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[2]; SRC=ROOT/'strikewatch-source'
OLD='12.206'; NEW='12.207'; OLD_NAME='Contextual Mobile Navigation'; NEW_NAME='Mobile Header Submenu Fix'; OLD_ID='12.206.0-contextual-mobile-navigation'; NEW_ID='12.207.0-mobile-header-submenu-fix'
def r(p): return p.read_text(encoding='utf-8')
def w(p,t): p.write_text(t,encoding='utf-8')
def one(t,a,b,l):
    if t.count(a)!=1: raise SystemExit(f'{l}: found {t.count(a)}')
    return t.replace(a,b,1)
rel=SRC/'RELEASE.json'
if json.loads(r(rel))!={'version':OLD,'name':OLD_NAME,'build_id':OLD_ID}: raise SystemExit('unexpected predecessor')
w(rel,json.dumps({'version':NEW,'name':NEW_NAME,'build_id':NEW_ID},indent=2)+'\n')
core=SRC/'js/00-core.js'; t=r(core); t=one(t,f"  const BUILD_VERSION = '{OLD}';",f"  const BUILD_VERSION = '{NEW}';",'version'); t=one(t,f"  const BUILD_NAME = '{OLD_NAME}';",f"  const BUILD_NAME = '{NEW_NAME}';",'name'); t=one(t,f"  const BUILD_ID = '{OLD_ID}';",f"  const BUILD_ID = '{NEW_ID}';",'id'); w(core,t)
menus=SRC/'js/50-ui-menus.js'; t=r(menus)
old="""  function syncMobileContextualNavigationState(sectionId = menuSection, routeId = menuTab) {
    const shell = document.getElementById('menuShell');
    if (!shell) return;
    const resolvedSection = menuSections[sectionId] ? sectionId : 'operations';
    shell.dataset.mobileSection = resolvedSection;
    shell.dataset.mobileRoute = routeId || menuSections[resolvedSection].defaultRoute;
    shell.classList.toggle('mobile-operations-overview', resolvedSection === 'operations' && shell.dataset.mobileRoute === 'play');
    shell.classList.toggle('mobile-contextual-navigation', !(resolvedSection === 'operations' && shell.dataset.mobileRoute === 'play'));
  }
"""
new="""  function renderMobileHeaderSubmenu(sectionId, routeId) {
    const topbar = document.querySelector('#menuShell .manager-topbar');
    if (!topbar) return;
    let nav = topbar.querySelector('.mobile-header-submenu');
    if (!nav) {
      nav = document.createElement('nav');
      nav.className = 'mobile-header-submenu';
      nav.setAttribute('aria-label', 'Current section pages');
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
"""
t=one(t,old,new,'sync function'); w(menus,t)
cssp=SRC/'css/compact-navigation.css'; css=r(cssp)
block=r'''

/* --- Build 12.207: populate contextual mobile header --------------------- */
@media (max-width:760px){
  #menuShell .mobile-header-submenu{display:none}
  #menuShell.mobile-contextual-navigation .manager-topbar{grid-template-columns:42px minmax(0,1fr) 42px}
  #menuShell.mobile-contextual-navigation .mobile-header-submenu{display:flex;grid-column:2;grid-row:1;min-width:0;gap:6px;overflow-x:auto;scrollbar-width:none;overscroll-behavior-x:contain;padding:1px 2px;align-items:center}
  #menuShell.mobile-contextual-navigation .mobile-header-submenu::-webkit-scrollbar{display:none}
  #menuShell.mobile-contextual-navigation .mobile-header-submenu button{flex:0 0 auto;min-height:38px;padding:8px 11px;border:1px solid rgba(127,163,190,.24);background:rgba(15,31,47,.88);color:#aabac6;font-size:10px;line-height:1;letter-spacing:.08em;white-space:nowrap}
  #menuShell.mobile-contextual-navigation .mobile-header-submenu button.active{border-color:rgba(222,190,106,.68);background:rgba(88,69,29,.52);color:#fff3cf}
  #menuShell.mobile-contextual-navigation .menu-subnav-shell{display:none!important}
}
'''
w(cssp,css.rstrip()+block)
build=SRC/'build.py'; t=r(build); t=one(t,'"game_css_lines_max": 30930,','"game_css_lines_max": 30960,','css lines'); t=one(t,'"important_declarations_max": 2184,','"important_declarations_max": 2185,','important budget'); t=one(t,'"media_queries_max": 478,','"media_queries_max": 479,','media budget'); w(build,t)
idx=SRC/'index.html'; t=r(idx).replace(f'Strikewatch {OLD}: {OLD_NAME}',f'Strikewatch {NEW}: {NEW_NAME}').replace(OLD_ID,NEW_ID); t=one(t,f'id="managerBuildVersion">{OLD}</b>',f'id="managerBuildVersion">{NEW}</b>','desktop'); t=one(t,f'id="mobileCommandBuildVersion">{OLD}</b>',f'id="mobileCommandBuildVersion">{NEW}</b>','mobile'); w(idx,t)
note=f"Build {NEW} fixes the empty compact header introduced in 12.206 by rendering the active department's real route buttons directly between the Back and Forward controls. The active page is centred and highlighted; Operations Overview still retains its original shortcut header. See `AUDIT-{NEW}.md`.\n\n"
for p in [SRC/'HANDOFF.md',SRC/'AGENTS.md']:
 t=r(p); t=one(t,f'Build {OLD} turns',note+f'Build {OLD} turns',p.name)
 if p.name=='HANDOFF.md': t=one(t,f'- Build: **{OLD} — {OLD_NAME}**',f'- Build: **{NEW} — {NEW_NAME}**','handoff build'); t=one(t,f'- Build ID: `{OLD_ID}`',f'- Build ID: `{NEW_ID}`','handoff id'); t=one(t,f'strikewatch-build-{OLD}.html',f'strikewatch-build-{NEW}.html','standalone')
 w(p,t)
readme=SRC/'README.md'; t=r(readme); t=one(t,f'# Strikewatch Source {OLD}',f'# Strikewatch Source {NEW}','readme'); t=one(t,f'dist/strikewatch-build-{OLD}.html',f'dist/strikewatch-build-{NEW}.html','readme dist'); w(readme,t)
proj=SRC/'PROJECT.md'; t=r(proj); t=one(t,f'Build {OLD} adds contextual compact navigation: Operations Overview keeps shortcuts and End Day, while every other mobile route uses the freed header space for its department submenu. See `HANDOFF.md` and `AUDIT-{OLD}.md`.',f'Build {NEW} fixes the contextual mobile header so the current department route buttons visibly populate the freed space. See `HANDOFF.md` and `AUDIT-{NEW}.md`.','project'); w(proj,t)
w(SRC/f'AUDIT-{NEW}.md',f'''# Build {NEW} audit — {NEW_NAME}\n\n## Problem\nBuild 12.206 removed the bulky mobile header correctly, but the reused secondary navigation remained hidden by earlier compact-layout rules, leaving an empty band.\n\n## Fix\n- Render the current department route buttons directly inside the mobile manager header.\n- Keep Back and Forward controls at the edges.\n- Highlight and centre the active route.\n- Preserve the original Operations Overview shortcut and End Day header.\n- Hide the redundant legacy subnav on compact contextual routes.\n\n## Verification\nDeterministic double build, modular/generated/standalone JavaScript parsing, source anchors, and root/standalone byte identity are required. Save schema 19 and diagnostics schema 1 remain unchanged.\n''')
print('Applied 12.207')
