#!/usr/bin/env python3
from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[2]; SRC=ROOT/'strikewatch-source'
OLD='12.210'; NEW='12.211'; OLD_NAME='League and Equipment Navigation'; NEW_NAME='Loading Screen and Collapsed Actions'; OLD_ID='12.210.0-league-equipment-navigation'; NEW_ID='12.211.0-loading-screen-collapsed-actions'
def r(p): return p.read_text(encoding='utf-8')
def w(p,t): p.write_text(t,encoding='utf-8')
def one(t,a,b,l):
    if t.count(a)!=1: raise SystemExit(f'{l}: found {t.count(a)}')
    return t.replace(a,b,1)
rel=SRC/'RELEASE.json'
if json.loads(r(rel))!={'version':OLD,'name':OLD_NAME,'build_id':OLD_ID}: raise SystemExit('unexpected predecessor')
w(rel,json.dumps({'version':NEW,'name':NEW_NAME,'build_id':NEW_ID},indent=2)+'\n')
core=SRC/'js/00-core.js'; t=r(core); t=one(t,f"  const BUILD_VERSION = '{OLD}';",f"  const BUILD_VERSION = '{NEW}';",'version'); t=one(t,f"  const BUILD_NAME = '{OLD_NAME}';",f"  const BUILD_NAME = '{NEW_NAME}';",'name'); t=one(t,f"  const BUILD_ID = '{OLD_ID}';",f"  const BUILD_ID = '{NEW_ID}';",'id'); w(core,t)
idx=SRC/'index.html'; t=r(idx).replace(f'Strikewatch {OLD}: {OLD_NAME}',f'Strikewatch {NEW}: {NEW_NAME}').replace(OLD_ID,NEW_ID); t=one(t,f'id="managerBuildVersion">{OLD}</b>',f'id="managerBuildVersion">{NEW}</b>','desktop'); t=one(t,f'id="mobileCommandBuildVersion">{OLD}</b>',f'id="mobileCommandBuildVersion">{NEW}</b>','mobile')
style='''<style id="bootScreenStyle">\n#strikeBootScreen{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;background:radial-gradient(circle at 50% 35%,#102638 0,#07131d 45%,#03080d 100%);color:#eef6fa;font-family:Arial,sans-serif;transition:opacity .28s ease,visibility .28s ease}#strikeBootScreen.done{opacity:0;visibility:hidden;pointer-events:none}#strikeBootScreen>div{width:min(82vw,420px);padding:28px 24px;border:1px solid rgba(117,190,223,.3);background:rgba(8,22,34,.86);text-align:center;box-shadow:0 22px 70px rgba(0,0,0,.45)}#strikeBootScreen span{display:block;font-size:11px;letter-spacing:.24em;color:#71c9ef}#strikeBootScreen strong{display:block;margin:10px 0 18px;font-size:24px;letter-spacing:.08em}#strikeBootScreen i{display:block;height:4px;overflow:hidden;background:rgba(255,255,255,.1)}#strikeBootScreen i:after{content:"";display:block;width:38%;height:100%;background:#d8b85f;animation:strikeBoot 1s ease-in-out infinite alternate}@keyframes strikeBoot{from{transform:translateX(-10%)}to{transform:translateX(190%)}}\n</style>\n'''
t=one(t,'</head>',style+'</head>','boot style')
boot='''<div id="strikeBootScreen" role="status" aria-live="polite"><div><span>STRIKEWATCH // INITIALISING</span><strong>LOADING COMMAND SYSTEMS</strong><i aria-hidden="true"></i></div></div>\n'''
t=one(t,'<body>','<body>\n'+boot,'boot markup')
script='''<script>\n(function(){var finish=function(){var el=document.getElementById('strikeBootScreen');if(!el)return;el.classList.add('done');setTimeout(function(){el.remove();var st=document.getElementById('bootScreenStyle');if(st)st.remove();},320);};window.addEventListener('load',function(){requestAnimationFrame(function(){requestAnimationFrame(finish);});},{once:true});setTimeout(finish,8000);}());\n</script>\n'''
t=one(t,'</body>',script+'</body>','boot script'); w(idx,t)
menus=SRC/'js/50-ui-menus.js'; t=r(menus)
anchor="  document.addEventListener('DOMContentLoaded', () => syncMobileContextualNavigationState());\n"
helper="""  function collapseMustRespondByDefault(root = document) {
    for (const details of root.querySelectorAll?.('details[open]') || []) {
      const summary = details.querySelector('summary');
      if (/MUST\\s+RESPOND/i.test(summary?.textContent || '')) details.removeAttribute('open');
    }
  }
  document.addEventListener('DOMContentLoaded', () => {
    syncMobileContextualNavigationState();
    collapseMustRespondByDefault();
    const target = document.getElementById('menuContent');
    if (target) new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) {
        if (node.nodeType === 1) collapseMustRespondByDefault(node.matches?.('details') ? node.parentElement : node);
      }
    }).observe(target, { childList: true, subtree: true });
  });
"""
t=one(t,anchor,helper,'collapsed required actions'); w(menus,t)
note=f"Build {NEW} adds a dedicated full-screen boot presentation that masks incomplete layout while assets initialise, and makes MUST RESPOND disclosures collapsed when first rendered on mobile and desktop. See `AUDIT-{NEW}.md`.\n\n"
for p in [SRC/'HANDOFF.md',SRC/'AGENTS.md']:
 t=r(p); t=one(t,f'Build {OLD} promotes',note+f'Build {OLD} promotes',p.name)
 if p.name=='HANDOFF.md': t=one(t,f'- Build: **{OLD} — {OLD_NAME}**',f'- Build: **{NEW} — {NEW_NAME}**','handoff build'); t=one(t,f'- Build ID: `{OLD_ID}`',f'- Build ID: `{NEW_ID}`','handoff id'); t=one(t,f'strikewatch-build-{OLD}.html',f'strikewatch-build-{NEW}.html','standalone')
 w(p,t)
readme=SRC/'README.md'; t=r(readme); t=one(t,f'# Strikewatch Source {OLD}',f'# Strikewatch Source {NEW}','readme'); t=one(t,f'dist/strikewatch-build-{OLD}.html',f'dist/strikewatch-build-{NEW}.html','readme dist'); w(readme,t)
proj=SRC/'PROJECT.md'; t=r(proj); t=one(t,f'Build {OLD} gives League a primary navigation slot and unifies Armoury and Supplies under Equipment without changing route or gameplay authority. See `HANDOFF.md` and `AUDIT-{OLD}.md`.',f'Build {NEW} masks startup layout with a dedicated loading screen and defaults MUST RESPOND disclosures to collapsed. See `HANDOFF.md` and `AUDIT-{NEW}.md`.','project'); w(proj,t)
w(SRC/f'AUDIT-{NEW}.md',f'''# Build {NEW} audit — {NEW_NAME}\n\n## Change\n- Added an immediate full-viewport loading screen before the game UI can paint partially initialised layouts.\n- Loading presentation clears after the window load event and includes an eight-second safety fallback.\n- MUST RESPOND details are collapsed when first inserted, while remaining manually expandable.\n- No blocker authority, route, gameplay or save behaviour changed.\n\n## Verification\nDeterministic double build, JavaScript parsing, loading-screen and collapse-handler assertions, and root/standalone byte identity are required. Save schema 19 and diagnostics schema 1 remain unchanged.\n''')
print('Applied 12.211')
