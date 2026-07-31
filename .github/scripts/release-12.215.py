from pathlib import Path
import json
R=Path(__file__).resolve().parents[2]; S=R/'strikewatch-source'
def rd(p): return p.read_text()
def wr(p,t): p.write_text(t)
def rep(t,a,b):
 assert t.count(a)==1,(a,t.count(a)); return t.replace(a,b,1)
old='12.214'; new='12.215'; on='Operator-Only Required Action'; nn='Ops-Only Required Action'; oi='12.214.0-operator-only-required-action'; ni='12.215.0-ops-only-required-action'
p=S/'RELEASE.json'; assert json.loads(rd(p))=={'version':old,'name':on,'build_id':oi}; wr(p,json.dumps({'version':new,'name':nn,'build_id':ni},indent=2)+'\n')
p=S/'js/00-core.js'; t=rd(p); t=rep(t,f"  const BUILD_VERSION = '{old}';",f"  const BUILD_VERSION = '{new}';"); t=rep(t,f"  const BUILD_NAME = '{on}';",f"  const BUILD_NAME = '{nn}';"); t=rep(t,f"  const BUILD_ID = '{oi}';",f"  const BUILD_ID = '{ni}';"); wr(p,t)
p=S/'js/39-club-operations.js'; t=rd(p); t=rep(t,"    if (!blockers.length || menuContext === 'pause' || menuTab !== 'operators') return '';","    if (!blockers.length || menuContext === 'pause' || menuTab !== 'play') return '';"); wr(p,t)
p=S/'index.html'; t=rd(p).replace(f'Strikewatch {old}: {on}',f'Strikewatch {new}: {nn}').replace(oi,ni); t=rep(t,f'id="managerBuildVersion">{old}</b>',f'id="managerBuildVersion">{new}</b>'); t=rep(t,f'id="mobileCommandBuildVersion">{old}</b>',f'id="mobileCommandBuildVersion">{new}</b>'); wr(p,t)
note=f"Build {new} keeps the collapsible MUST RESPOND panel on Operations Overview only. It starts collapsed and no longer repeats on Team, League, Equipment, Club or their subpages; the global End Day lock and blocker authority remain unchanged. See `AUDIT-{new}.md`.\n\n"
for p in [S/'HANDOFF.md',S/'AGENTS.md']:
 t=rd(p); t=rep(t,f'Build {old} removes',note+f'Build {old} removes')
 if p.name=='HANDOFF.md': t=rep(t,f'- Build: **{old} — {on}**',f'- Build: **{new} — {nn}**'); t=rep(t,f'- Build ID: `{oi}`',f'- Build ID: `{ni}`'); t=rep(t,f'strikewatch-build-{old}.html',f'strikewatch-build-{new}.html')
 wr(p,t)
p=S/'README.md'; t=rd(p); t=rep(t,f'# Strikewatch Source {old}',f'# Strikewatch Source {new}'); t=rep(t,f'dist/strikewatch-build-{old}.html',f'dist/strikewatch-build-{new}.html'); wr(p,t)
p=S/'PROJECT.md'; t=rd(p); t=rep(t,f'Build {old} keeps the detailed required-action panel only on Team > Squad while preserving the global End Day lock. See `HANDOFF.md` and `AUDIT-{old}.md`.',f'Build {new} keeps the collapsible required-action panel only on Operations Overview while preserving the global End Day lock. See `HANDOFF.md` and `AUDIT-{new}.md`.'); wr(p,t)
wr(S/f'AUDIT-{new}.md',f'''# Build {new} audit — {nn}\n\n## Change\n- The collapsible red MUST RESPOND panel now renders only on Operations Overview (`play`).\n- It remains collapsed by default and can be expanded manually.\n- It no longer repeats on Team, League, Equipment, Club or their subpages.\n- The top End Day lock, response count, blocker authority and action routes remain global and unchanged.\n- Save schema 19 and diagnostics schema 1 are unchanged.\n''')
print('Applied 12.215')
