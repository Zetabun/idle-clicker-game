#!/usr/bin/env python3
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[2]; SRC=ROOT/'strikewatch-source'
OLD='12.208'; NEW='12.209'; OLD_NAME='Mobile Header Layout Fix'; NEW_NAME='Mobile Header Button Fix'; OLD_ID='12.208.0-mobile-header-layout-fix'; NEW_ID='12.209.0-mobile-header-button-fix'
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
old="""      nav.className = 'mobile-header-submenu';
      nav.setAttribute('aria-label', 'Current section pages');
      topbar.insertBefore(nav, topbar.querySelector('.manager-history-forward'));
"""
new="""      nav.className = 'mobile-header-submenu';
      nav.setAttribute('aria-label', 'Current section pages');
      nav.addEventListener('click', event => {
        const button = event.target.closest?.('[data-team-route]');
        if (!button || !nav.contains(button)) return;
        event.preventDefault();
        event.stopPropagation();
        setMenuRoute(String(button.dataset.teamRoute || ''));
      });
      topbar.insertBefore(nav, topbar.querySelector('.manager-history-forward'));
"""
t=one(t,old,new,'submenu click handler'); w(menus,t)
idx=SRC/'index.html'; t=r(idx).replace(f'Strikewatch {OLD}: {OLD_NAME}',f'Strikewatch {NEW}: {NEW_NAME}').replace(OLD_ID,NEW_ID); t=one(t,f'id="managerBuildVersion">{OLD}</b>',f'id="managerBuildVersion">{NEW}</b>','desktop'); t=one(t,f'id="mobileCommandBuildVersion">{OLD}</b>',f'id="mobileCommandBuildVersion">{NEW}</b>','mobile'); w(idx,t)
note=f"Build {NEW} wires the contextual mobile header buttons directly to the authoritative `setMenuRoute()` navigation path, so every visible submenu item now opens its intended page. See `AUDIT-{NEW}.md`.\n\n"
for p in [SRC/'HANDOFF.md',SRC/'AGENTS.md']:
    t=r(p); t=one(t,f'Build {OLD} corrects',note+f'Build {OLD} corrects',p.name)
    if p.name=='HANDOFF.md':
        t=one(t,f'- Build: **{OLD} — {OLD_NAME}**',f'- Build: **{NEW} — {NEW_NAME}**','handoff build'); t=one(t,f'- Build ID: `{OLD_ID}`',f'- Build ID: `{NEW_ID}`','handoff id'); t=one(t,f'strikewatch-build-{OLD}.html',f'strikewatch-build-{NEW}.html','standalone')
    w(p,t)
readme=SRC/'README.md'; t=r(readme); t=one(t,f'# Strikewatch Source {OLD}',f'# Strikewatch Source {NEW}','readme'); t=one(t,f'dist/strikewatch-build-{OLD}.html',f'dist/strikewatch-build-{NEW}.html','readme dist'); w(readme,t)
proj=SRC/'PROJECT.md'; t=r(proj); t=one(t,f'Build {OLD} fixes the compact contextual header layout so Back and Forward sit at the sides and the department submenu fully occupies the centre. See `HANDOFF.md` and `AUDIT-{OLD}.md`.',f'Build {NEW} makes the contextual mobile header buttons use the authoritative menu route handler so they open their intended pages. See `HANDOFF.md` and `AUDIT-{NEW}.md`.','project'); w(proj,t)
w(SRC/f'AUDIT-{NEW}.md',f'''# Build {NEW} audit — {NEW_NAME}\n\n## Problem\nThe 12.208 header layout was visually correct, but the newly injected submenu lived outside the existing delegated content click region, so its buttons did not navigate.\n\n## Fix\n- Add one delegated click handler directly to the contextual header nav.\n- Route clicks through the existing `setMenuRoute()` authority.\n- Prevent duplicate propagation while preserving active-route rendering and history.\n- No save, gameplay, or desktop changes.\n\n## Verification\nDeterministic double build, modular/generated/standalone JavaScript parsing, targeted click-handler assertions, and root/standalone byte identity are required. Save schema 19 and diagnostics schema 1 remain unchanged.\n''')
print('Applied 12.209')
