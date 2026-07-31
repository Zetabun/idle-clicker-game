from pathlib import Path
import json
R=Path(__file__).resolve().parents[2]; S=R/'strikewatch-source'
def rd(p): return p.read_text()
def wr(p,t): p.write_text(t)
def rep(t,a,b):
 assert t.count(a)==1,(a,t.count(a)); return t.replace(a,b,1)
old='12.215'; new='12.216'; on='Ops-Only Required Action'; nn='Ops-Only Priority Card'; oi='12.215.0-ops-only-required-action'; ni='12.216.0-ops-only-priority-card'
p=S/'RELEASE.json'; assert json.loads(rd(p))=={'version':old,'name':on,'build_id':oi}; wr(p,json.dumps({'version':new,'name':nn,'build_id':ni},indent=2)+'\n')
p=S/'js/00-core.js'; t=rd(p); t=rep(t,f"  const BUILD_VERSION = '{old}';",f"  const BUILD_VERSION = '{new}';"); t=rep(t,f"  const BUILD_NAME = '{on}';",f"  const BUILD_NAME = '{nn}';"); t=rep(t,f"  const BUILD_ID = '{oi}';",f"  const BUILD_ID = '{ni}';"); wr(p,t)
p=S/'js/50-ui-menus.js'; t=rd(p)
needle='    return `<section class="management-priority-strip ${escapeCareerHtml(primary.kind)} ${guidance ? \'first-match-guide\' : \'\'} ${guideCollapsed ? \'is-collapsed\' : \'\'}">'
replacement="    if (menuTab !== 'play') return '';\n"+needle
t=rep(t,needle,replacement); wr(p,t)
p=S/'index.html'; t=rd(p).replace(f'Strikewatch {old}: {on}',f'Strikewatch {new}: {nn}').replace(oi,ni); t=rep(t,f'id="managerBuildVersion">{old}</b>',f'id="managerBuildVersion">{new}</b>'); t=rep(t,f'id="mobileCommandBuildVersion">{old}</b>',f'id="mobileCommandBuildVersion">{new}</b>'); wr(p,t)
note=f"Build {new} removes the separate global Required Action priority card from every non-Ops page. Both the priority card and the collapsible MUST RESPOND panel now have one home on Operations Overview only. See `AUDIT-{new}.md`.\n\n"
for p in [S/'HANDOFF.md',S/'AGENTS.md']:
 t=rd(p); t=rep(t,f'Build {old} keeps',note+f'Build {old} keeps')
 if p.name=='HANDOFF.md': t=rep(t,f'- Build: **{old} — {on}**',f'- Build: **{new} — {nn}**'); t=rep(t,f'- Build ID: `{oi}`',f'- Build ID: `{ni}`'); t=rep(t,f'strikewatch-build-{old}.html',f'strikewatch-build-{new}.html')
 wr(p,t)
p=S/'README.md'; t=rd(p); t=rep(t,f'# Strikewatch Source {old}',f'# Strikewatch Source {new}'); t=rep(t,f'dist/strikewatch-build-{old}.html',f'dist/strikewatch-build-{new}.html'); wr(p,t)
p=S/'PROJECT.md'; t=rd(p); t=rep(t,f'Build {old} keeps the collapsible required-action panel only on Operations Overview while preserving the global End Day lock. See `HANDOFF.md` and `AUDIT-{old}.md`.',f'Build {new} keeps both required-action presentations exclusively on Operations Overview. See `HANDOFF.md` and `AUDIT-{new}.md`.'); wr(p,t)
wr(S/f'AUDIT-{new}.md',f'''# Build {new} audit — {nn}\n\n## Problem\nThe collapsible MUST RESPOND strip was correctly limited to Ops, but a separate management priority card still rendered globally and repeated the same required action on Team and other pages.\n\n## Fix\n- The management priority card now renders only when `menuTab === 'play'`.\n- The collapsible MUST RESPOND strip remains Ops-only and collapsed by default.\n- Team, League, Equipment, Club and their subpages no longer show either large warning card.\n- The End Day lock, response count and blocker authority remain global.\n- Save schema 19 and diagnostics schema 1 are unchanged.\n''')
print('Applied 12.216')
