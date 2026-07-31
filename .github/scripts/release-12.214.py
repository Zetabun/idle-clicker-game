from pathlib import Path
import json
R=Path(__file__).resolve().parents[2]; S=R/'strikewatch-source'
def rd(p): return p.read_text()
def wr(p,t): p.write_text(t)
def rep(t,a,b):
 assert t.count(a)==1,(a,t.count(a)); return t.replace(a,b,1)
old='12.213'; new='12.214'; on='Section Content Optimisation'; nn='Operator-Only Required Action'; oi='12.213.0-section-content-optimisation'; ni='12.214.0-operator-only-required-action'
p=S/'RELEASE.json'; assert json.loads(rd(p))=={'version':old,'name':on,'build_id':oi}; wr(p,json.dumps({'version':new,'name':nn,'build_id':ni},indent=2)+'\n')
p=S/'js/00-core.js'; t=rd(p); t=rep(t,f"  const BUILD_VERSION = '{old}';",f"  const BUILD_VERSION = '{new}';"); t=rep(t,f"  const BUILD_NAME = '{on}';",f"  const BUILD_NAME = '{nn}';"); t=rep(t,f"  const BUILD_ID = '{oi}';",f"  const BUILD_ID = '{ni}';"); wr(p,t)
p=S/'js/39-club-operations.js'; t=rd(p); t=rep(t,"    if (!blockers.length || menuContext === 'pause') return '';","    if (!blockers.length || menuContext === 'pause' || menuTab !== 'operators') return '';"); wr(p,t)
p=S/'index.html'; t=rd(p).replace(f'Strikewatch {old}: {on}',f'Strikewatch {new}: {nn}').replace(oi,ni); t=rep(t,f'id="managerBuildVersion">{old}</b>',f'id="managerBuildVersion">{new}</b>'); t=rep(t,f'id="mobileCommandBuildVersion">{old}</b>',f'id="mobileCommandBuildVersion">{new}</b>'); wr(p,t)
note=f"Build {new} removes repeated red required-action panels from every route except Team > Squad (the operator page). The End Day lock and blocker authority remain global, but the detailed warning card now has one intentional home. See `AUDIT-{new}.md`.\n\n"
for p in [S/'HANDOFF.md',S/'AGENTS.md']:
 t=rd(p); t=rep(t,f'Build {old} clarifies',note+f'Build {old} clarifies')
 if p.name=='HANDOFF.md': t=rep(t,f'- Build: **{old} — {on}**',f'- Build: **{new} — {nn}**'); t=rep(t,f'- Build ID: `{oi}`',f'- Build ID: `{ni}`'); t=rep(t,f'strikewatch-build-{old}.html',f'strikewatch-build-{new}.html')
 wr(p,t)
p=S/'README.md'; t=rd(p); t=rep(t,f'# Strikewatch Source {old}',f'# Strikewatch Source {new}'); t=rep(t,f'dist/strikewatch-build-{old}.html',f'dist/strikewatch-build-{new}.html'); wr(p,t)
p=S/'PROJECT.md'; t=rd(p); t=rep(t,f'Build {old} clarifies section ownership and reduces redundant mobile submenu items. See `HANDOFF.md` and `AUDIT-{old}.md`.',f'Build {new} keeps the detailed required-action panel only on Team > Squad while preserving the global End Day lock. See `HANDOFF.md` and `AUDIT-{new}.md`.'); wr(p,t)
wr(S/f'AUDIT-{new}.md',f'''# Build {new} audit — {nn}\n\n## Change\n- The detailed red required-action / MUST RESPOND panel now renders only on Team > Squad (`operators`).\n- It no longer repeats on Overview, Tactics, Telemetry, League, Equipment, Club or other routes.\n- The top End Day lock, blocker count, blocker authority and action routes remain unchanged.\n- Save schema 19 and diagnostics schema 1 are unchanged.\n''')
print('Applied 12.214')
