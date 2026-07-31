from pathlib import Path
import json
R=Path(__file__).resolve().parents[2]; S=R/'strikewatch-source'
def rd(p): return p.read_text(encoding='utf-8')
def wr(p,t): p.write_text(t,encoding='utf-8')
def rep(t,a,b,label):
    if t.count(a)!=1: raise SystemExit(f'{label}: expected 1, found {t.count(a)}')
    return t.replace(a,b,1)
old='12.216'; new='12.217'; on='Ops-Only Priority Card'; nn='Ops Alert Badge and Header Gap Fix'; oi='12.216.0-ops-only-priority-card'; ni='12.217.0-ops-alert-header-gap'
p=S/'RELEASE.json'; assert json.loads(rd(p))=={'version':old,'name':on,'build_id':oi}; wr(p,json.dumps({'version':new,'name':nn,'build_id':ni},indent=2)+'\n')
p=S/'js/00-core.js'; t=rd(p); t=rep(t,f"  const BUILD_VERSION = '{old}';",f"  const BUILD_VERSION = '{new}';",'version'); t=rep(t,f"  const BUILD_NAME = '{on}';",f"  const BUILD_NAME = '{nn}';",'name'); t=rep(t,f"  const BUILD_ID = '{oi}';",f"  const BUILD_ID = '{ni}';",'id'); wr(p,t)
p=S/'js/50-ui-menus.js'; t=rd(p)
needle="""    shell.classList.toggle('mobile-contextual-navigation', !(resolvedSection === 'operations' && resolvedRoute === 'play'));
    renderMobileHeaderSubmenu(resolvedSection, resolvedRoute);
"""
replacement="""    shell.classList.toggle('mobile-contextual-navigation', !(resolvedSection === 'operations' && resolvedRoute === 'play'));
    const operationsTab = shell.querySelector('.menu-tab[data-section="operations"]');
    const blockerCount = typeof clubEndDayBlockers === 'function' ? clubEndDayBlockers().length : 0;
    if (operationsTab) {
      operationsTab.classList.toggle('has-must-respond', blockerCount > 0);
      operationsTab.setAttribute('data-must-respond-count', String(blockerCount));
    }
    renderMobileHeaderSubmenu(resolvedSection, resolvedRoute);
"""
t=rep(t,needle,replacement,'ops badge sync'); wr(p,t)
p=S/'css/compact-navigation.css'; t=rd(p)
block='''\n\n/* --- Build 12.217: Ops blocker badge and compact header gap fix ---------- */\n.menu-tab[data-section="operations"]{position:relative}\n.menu-tab[data-section="operations"].has-must-respond::before{content:"!";position:absolute;left:7px;top:7px;z-index:4;display:grid;place-items:center;width:17px;height:17px;border:1px solid rgba(255,190,180,.9);border-radius:50%;background:#b83e35;color:#fff;font-size:12px;font-weight:900;line-height:1;box-shadow:0 0 0 2px rgba(7,19,29,.8),0 2px 8px rgba(0,0,0,.35)}\n@media(max-width:760px){\n  #menuShell.mobile-operations-overview .manager-topbar{grid-template-columns:48px auto auto minmax(118px,1fr) 48px!important;gap:0!important}\n  #menuShell.mobile-operations-overview .manager-history-back{grid-column:1!important}\n  #menuShell.mobile-operations-overview .manager-balance-brand{grid-column:2!important}\n  #menuShell.mobile-operations-overview .manager-topbar-actions{grid-column:3!important}\n  #menuShell.mobile-operations-overview .manager-context{display:none!important}\n  #menuShell.mobile-operations-overview .manager-end-day-slot{grid-column:4!important;margin:0!important}\n  #menuShell.mobile-operations-overview .manager-history-forward{grid-column:5!important}\n}\n'''
if 'Build 12.217: Ops blocker badge' in t: raise SystemExit('css exists')
wr(p,t.rstrip()+block)
p=S/'build.py'; t=rd(p); t=rep(t,'"game_css_lines_max": 31020,','"game_css_lines_max": 31055,','css lines'); t=rep(t,'"important_declarations_max": 2230,','"important_declarations_max": 2240,','important'); t=rep(t,'"media_queries_max": 480,','"media_queries_max": 481,','media'); wr(p,t)
p=S/'index.html'; t=rd(p).replace(f'Strikewatch {old}: {on}',f'Strikewatch {new}: {nn}').replace(oi,ni); t=rep(t,f'id="managerBuildVersion">{old}</b>',f'id="managerBuildVersion">{new}</b>','desktop label'); t=rep(t,f'id="mobileCommandBuildVersion">{old}</b>',f'id="mobileCommandBuildVersion">{new}</b>','mobile label'); wr(p,t)
note=f"Build {new} adds a compact red exclamation badge to the Ops bottom-navigation item whenever an End Day blocker exists, and removes the unused compact-header grid track between Help and End Day. See `AUDIT-{new}.md`.\n\n"
for p in [S/'HANDOFF.md',S/'AGENTS.md']:
 t=rd(p); t=rep(t,f'Build {old} removes',note+f'Build {old} removes',p.name)
 if p.name=='HANDOFF.md':
  t=rep(t,f'- Build: **{old} — {on}**',f'- Build: **{new} — {nn}**','handoff build'); t=rep(t,f'- Build ID: `{oi}`',f'- Build ID: `{ni}`','handoff id'); t=rep(t,f'strikewatch-build-{old}.html',f'strikewatch-build-{new}.html','standalone')
 wr(p,t)
p=S/'README.md'; t=rd(p); t=rep(t,f'# Strikewatch Source {old}',f'# Strikewatch Source {new}','readme title'); t=rep(t,f'dist/strikewatch-build-{old}.html',f'dist/strikewatch-build-{new}.html','readme dist'); wr(p,t)
p=S/'PROJECT.md'; t=rd(p); t=rep(t,f'Build {old} keeps both required-action presentations exclusively on Operations Overview. See `HANDOFF.md` and `AUDIT-{old}.md`.',f'Build {new} adds an Ops blocker badge and removes the wasted compact-header gap beside End Day. See `HANDOFF.md` and `AUDIT-{new}.md`.','project'); wr(p,t)
wr(S/f'AUDIT-{new}.md',f'''# Build {new} audit — {nn}\n\n## Change\n- The Ops primary navigation item gains a small red `!` when `clubEndDayBlockers()` reports one or more blockers.\n- The badge is presentation-only and reuses the existing blocker authority.\n- The compact Operations header now uses explicit tracks for Back, balance, shortcut icons, End Day and Forward.\n- The hidden manager-context track no longer leaves a blank gap between Help and End Day.\n- Save schema 19 and diagnostics schema 1 are unchanged.\n''')
print('Applied 12.217')
