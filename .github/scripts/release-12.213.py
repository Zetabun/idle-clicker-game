from pathlib import Path
import json
R=Path(__file__).resolve().parents[2]; S=R/'strikewatch-source'
def rd(p): return p.read_text()
def wr(p,t): p.write_text(t)
def rep(t,a,b):
 assert t.count(a)==1,(a,t.count(a)); return t.replace(a,b,1)
old='12.212'; new='12.213'; on='Collapsed Must Respond'; nn='Section Content Optimisation'; oi='12.212.0-collapsed-must-respond'; ni='12.213.0-section-content-optimisation'
p=S/'RELEASE.json'; assert json.loads(rd(p))=={'version':old,'name':on,'build_id':oi}; wr(p,json.dumps({'version':new,'name':nn,'build_id':ni},indent=2)+'\n')
p=S/'js/00-core.js'; t=rd(p); t=rep(t,f"  const BUILD_VERSION = '{old}';",f"  const BUILD_VERSION = '{new}';"); t=rep(t,f"  const BUILD_NAME = '{on}';",f"  const BUILD_NAME = '{nn}';"); t=rep(t,f"  const BUILD_ID = '{oi}';",f"  const BUILD_ID = '{ni}';"); wr(p,t)
p=S/'js/50-ui-menus.js'; t=rd(p)
t=rep(t,"        { id: 'mail', label: 'INBOX', hint: 'Club messages and matchday mail' },\n        { id: 'telemetry', label: 'TEAM TELEMETRY', hint: 'Overall squad data' },\n        { id: 'reports', label: 'AFTER ACTION', hint: 'Team and player debrief' }","        { id: 'mail', label: 'INBOX', hint: 'Club messages and matchday mail' },\n        { id: 'reports', label: 'AFTER ACTION', hint: 'Team and player debrief' }")
t=rep(t,"        { id: 'tactics', label: 'TACTICS', hint: 'Formation and delegation' },\n        { id: 'market', label: 'RECRUITMENT', hint: 'Scout available players' },","        { id: 'tactics', label: 'TACTICS', hint: 'Formation and delegation' },\n        { id: 'telemetry', label: 'TELEMETRY', hint: 'Overall squad performance data' },\n        { id: 'market', label: 'RECRUITMENT', hint: 'Scout available players' },")
t=rep(t,"        { id: 'supplies-hub', label: 'SUPPLY OVERVIEW', hint: 'Balances, stock and purchasing shortcuts' },","        { id: 'supplies-hub', label: 'SUPPLY OVERVIEW', hint: 'Balances, stock and purchasing shortcuts', contextOnly: true },")
t=rep(t,"        { id: 'gold', label: 'GOLD COINS', hint: 'Earnings, spending and account history' },","        { id: 'gold', label: 'GOLD COINS', hint: 'Earnings, spending and account history', contextOnly: true },")
t=rep(t,"        { id: 'settings', label: 'CONFIGURATION', hint: 'Display and audio' }","        { id: 'settings', label: 'CONFIGURATION', hint: 'Display and audio', contextOnly: true }")
t=t.replace("description: 'Today, calendar, messages and immediate match review.'","description: 'Today, calendar, messages and immediate match review.'").replace("description: 'Squad building, tactics, recruitment and contract activity.'","description: 'Squad identity, tactics, telemetry, recruitment and contracts.'")
wr(p,t)
p=S/'index.html'; t=rd(p).replace(f'Strikewatch {old}: {on}',f'Strikewatch {new}: {nn}').replace(oi,ni); t=rep(t,f'id="managerBuildVersion">{old}</b>',f'id="managerBuildVersion">{new}</b>'); t=rep(t,f'id="mobileCommandBuildVersion">{old}</b>',f'id="mobileCommandBuildVersion">{new}</b>'); t=t.replace('Squad, tactics, recruitment and transfers','Squad, tactics, telemetry and recruitment'); wr(p,t)
note=f"Build {new} clarifies section ownership: Ops handles immediate day work, Team owns telemetry, Equipment removes the redundant Supply Overview from its normal submenu, and low-frequency Gold and Configuration pages no longer crowd Club. See `AUDIT-{new}.md`.\n\n"
for p in [S/'HANDOFF.md',S/'AGENTS.md']:
 t=rd(p); t=rep(t,f'Build {old} removes',note+f'Build {old} removes')
 if p.name=='HANDOFF.md': t=rep(t,f'- Build: **{old} — {on}**',f'- Build: **{new} — {nn}**'); t=rep(t,f'- Build ID: `{oi}`',f'- Build ID: `{ni}`'); t=rep(t,f'strikewatch-build-{old}.html',f'strikewatch-build-{new}.html')
 wr(p,t)
p=S/'README.md'; t=rd(p); t=rep(t,f'# Strikewatch Source {old}',f'# Strikewatch Source {new}'); t=rep(t,f'dist/strikewatch-build-{old}.html',f'dist/strikewatch-build-{new}.html'); wr(p,t)
p=S/'PROJECT.md'; t=rd(p); t=rep(t,f'Build {old} makes the authoritative MUST RESPOND disclosure render collapsed by default at source. See `HANDOFF.md` and `AUDIT-{old}.md`.',f'Build {new} clarifies section ownership and reduces redundant mobile submenu items. See `HANDOFF.md` and `AUDIT-{new}.md`.'); wr(p,t)
wr(S/f'AUDIT-{new}.md',f'''# Build {new} audit — {nn}\n\n- Ops now focuses on Overview, Calendar, Inbox and After Action.\n- Team now owns Telemetry.\n- Equipment keeps Overview, Team Armoury and Supply Depot as the normal flow; Supply Overview remains context-only.\n- Club keeps core management pages visible; Gold Coins and Configuration remain context-only.\n- League remains one authoritative centre to avoid duplicating standings or fixture authority.\n- Save schema 19 and diagnostics schema 1 are unchanged.\n''')
print('Applied 12.213')
