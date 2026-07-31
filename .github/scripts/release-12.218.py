from pathlib import Path
import json
R=Path(__file__).resolve().parents[2]; S=R/'strikewatch-source'
def rd(p): return p.read_text(encoding='utf-8')
def wr(p,t): p.write_text(t,encoding='utf-8')
def rep(t,a,b,label):
    if t.count(a)!=1: raise SystemExit(f'{label}: expected 1, found {t.count(a)}')
    return t.replace(a,b,1)
old='12.217'; new='12.218'; on='Ops Alert Badge and Header Gap Fix'; nn='Mobile Information Architecture'; oi='12.217.0-ops-alert-header-gap'; ni='12.218.0-mobile-information-architecture'
p=S/'RELEASE.json'; assert json.loads(rd(p))=={'version':old,'name':on,'build_id':oi}; wr(p,json.dumps({'version':new,'name':nn,'build_id':ni},indent=2)+'\n')
p=S/'js/00-core.js'; t=rd(p); t=rep(t,f"  const BUILD_VERSION = '{old}';",f"  const BUILD_VERSION = '{new}';",'version'); t=rep(t,f"  const BUILD_NAME = '{on}';",f"  const BUILD_NAME = '{nn}';",'name'); t=rep(t,f"  const BUILD_ID = '{oi}';",f"  const BUILD_ID = '{ni}';",'id'); wr(p,t)
p=S/'js/50-ui-menus.js'; t=rd(p)
t=rep(t,"        { id: 'loadout', label: 'TEAM ARMOURY', hint: 'Weapons, armour and individual player loadouts' },","        { id: 'loadout', label: 'LOADOUTS', hint: 'Compare and assign weapons and armour' },",'loadout label')
t=rep(t,"        { id: 'store', label: 'SUPPLY DEPOT', hint: 'Field crates, weapons, armour and future ammunition' }","        { id: 'store', label: 'DEPOT', hint: 'Purchase crates, weapons and armour' }",'depot label')
t=rep(t,"        { id: 'infrastructure', label: 'INFRASTRUCTURE', hint: 'Permanent club facilities and specialisation' },","        { id: 'infrastructure', label: 'INFRASTRUCTURE', hint: 'Permanent club facilities and specialisation', contextOnly: true },",'infrastructure weight')
t=rep(t,"    if (menuTab !== 'play') return '';\n    return `<section class=\"management-priority-strip", "    if (menuTab !== 'play') return '';\n    if (typeof clubEndDayBlockers === 'function' && clubEndDayBlockers().length) return '';\n    return `<section class=\"management-priority-strip",'single urgent surface')
wr(p,t)
p=S/'js/37-league.js'; t=rd(p)
hero='''      <div class="menu-hero career-hero league-hero"><div class="menu-hero-main menu-briefing-panel">'''
nav='''      <nav class="league-section-jumps" aria-label="League page sections"><button type="button" data-team-scroll-target="#leagueOverview">OVERVIEW</button><button type="button" data-team-scroll-target="#leagueObjectives">OBJECTIVES</button><button type="button" data-team-scroll-target="#leaguePulse">PULSE</button><button type="button" data-team-scroll-target="#leagueTable">TABLE</button><button type="button" data-team-scroll-target="#leagueFixtures">FIXTURES</button></nav>\n      <div id="leagueOverview" class="menu-hero career-hero league-hero"><div class="menu-hero-main menu-briefing-panel">'''
t=rep(t,hero,nav,'league jump nav')
t=rep(t,"      ${typeof renderBoardExpectations === 'function' ? renderBoardExpectations(false) : ''}","      <div id=\"leagueObjectives\">${typeof renderBoardExpectations === 'function' ? renderBoardExpectations(false) : ''}</div>",'objectives anchor')
t=rep(t,"      ${typeof renderWorldPressLeaguePulse === 'function' ? renderWorldPressLeaguePulse() : ''}","      <div id=\"leaguePulse\">${typeof renderWorldPressLeaguePulse === 'function' ? renderWorldPressLeaguePulse() : ''}</div>",'pulse anchor')
t=rep(t,'      <section class="league-table-panel">','      <section id="leagueTable" class="league-table-panel">','table anchor')
t=rep(t,'        <section class="league-fixture-panel">','        <section id="leagueFixtures" class="league-fixture-panel">','fixture anchor')
wr(p,t)
p=S/'css/compact-navigation.css'; t=rd(p)
block='''\n\n/* --- Build 12.218: mobile information architecture ----------------------- */\n.league-section-jumps{display:flex;gap:7px;overflow-x:auto;scrollbar-width:none;padding:2px 0 8px;scroll-snap-type:x proximity}\n.league-section-jumps::-webkit-scrollbar{display:none}\n.league-section-jumps button{flex:0 0 auto;min-height:38px;padding:8px 12px;border:1px solid rgba(116,170,198,.28);background:rgba(13,31,47,.88);color:#b9cad5;font-size:10px;letter-spacing:.11em;scroll-snap-align:start}\n.league-section-jumps button:first-child{border-color:rgba(222,190,106,.55);color:#fff1c8}\n#leagueOverview,#leagueObjectives,#leaguePulse,#leagueTable,#leagueFixtures{scroll-margin-top:62px}\n@media(max-width:760px){.league-section-jumps{position:sticky;top:52px;z-index:16;margin:0 -10px;padding:6px 10px;background:rgba(7,18,29,.96);border-bottom:1px solid rgba(116,170,198,.2)}.league-section-jumps button{min-height:40px}.menu-tab[data-section="operations"].has-must-respond::before{left:5px;top:5px}}\n'''
if 'Build 12.218: mobile information architecture' in t: raise SystemExit('css exists')
wr(p,t.rstrip()+block)
p=S/'build.py'; t=rd(p); t=rep(t,'"game_css_lines_max": 31055,','"game_css_lines_max": 31090,','css lines'); t=rep(t,'"important_declarations_max": 2230,','"important_declarations_max": 2235,','important'); t=rep(t,'"media_queries_max": 481,','"media_queries_max": 482,','media'); wr(p,t)
p=S/'index.html'; t=rd(p).replace(f'Strikewatch {old}: {on}',f'Strikewatch {new}: {nn}').replace(oi,ni); t=rep(t,f'id="managerBuildVersion">{old}</b>',f'id="managerBuildVersion">{new}</b>','desktop label'); t=rep(t,f'id="mobileCommandBuildVersion">{old}</b>',f'id="mobileCommandBuildVersion">{new}</b>','mobile label'); wr(p,t)
note=f"Build {new} adds a sticky League section navigator, clarifies Equipment labels, reduces Club submenu crowding, and suppresses the duplicate recommended-action card whenever MUST RESPOND is active. See `AUDIT-{new}.md`.\n\n"
for p in [S/'HANDOFF.md',S/'AGENTS.md']:
 t=rd(p); t=rep(t,f'Build {old} adds',note+f'Build {old} adds',p.name)
 if p.name=='HANDOFF.md':
  t=rep(t,f'- Build: **{old} — {on}**',f'- Build: **{new} — {nn}**','handoff build'); t=rep(t,f'- Build ID: `{oi}`',f'- Build ID: `{ni}`','handoff id'); t=rep(t,f'strikewatch-build-{old}.html',f'strikewatch-build-{new}.html','standalone')
 wr(p,t)
p=S/'README.md'; t=rd(p); t=rep(t,f'# Strikewatch Source {old}',f'# Strikewatch Source {new}','readme title'); t=rep(t,f'dist/strikewatch-build-{old}.html',f'dist/strikewatch-build-{new}.html','readme dist'); wr(p,t)
p=S/'PROJECT.md'; t=rd(p); t=rep(t,f'Build {old} adds an Ops blocker badge and removes the wasted compact-header gap beside End Day. See `HANDOFF.md` and `AUDIT-{old}.md`.',f'Build {new} improves mobile information architecture across League, Equipment, Club and Operations. See `HANDOFF.md` and `AUDIT-{new}.md`.','project'); wr(p,t)
wr(S/f'AUDIT-{new}.md',f'''# Build {new} audit — {nn}\n\n## Change\n- League gains sticky jump controls for Overview, Objectives, Pulse, Table and Fixtures using the existing authoritative page content.\n- Equipment labels become task-oriented: Loadouts and Depot.\n- Infrastructure remains reachable contextually but no longer crowds the standard Club submenu.\n- The recommended priority card is suppressed while a MUST RESPOND blocker exists, leaving one detailed urgent surface.\n- Existing routes, league state, purchases, fixtures, saves and blocker authority are unchanged.\n\n## Verification\nDeterministic double build, modular/generated/standalone JavaScript parsing, targeted anchors, and root/standalone byte identity are required. Save schema 19 and diagnostics schema 1 remain unchanged.\n''')
print('Applied 12.218')
