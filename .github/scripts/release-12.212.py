#!/usr/bin/env python3
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[2]; SRC=ROOT/'strikewatch-source'
OLD='12.211'; NEW='12.212'; OLD_NAME='Loading Screen and Collapsed Actions'; NEW_NAME='Collapsed Must Respond'; OLD_ID='12.211.0-loading-screen-collapsed-actions'; NEW_ID='12.212.0-collapsed-must-respond'
def r(p): return p.read_text(encoding='utf-8')
def w(p,t): p.write_text(t,encoding='utf-8')
def one(t,a,b,l):
    if t.count(a)!=1: raise SystemExit(f'{l}: found {t.count(a)}')
    return t.replace(a,b,1)
rel=SRC/'RELEASE.json'
if json.loads(r(rel))!={'version':OLD,'name':OLD_NAME,'build_id':OLD_ID}: raise SystemExit('unexpected predecessor')
w(rel,json.dumps({'version':NEW,'name':NEW_NAME,'build_id':NEW_ID},indent=2)+'\n')
core=SRC/'js/00-core.js'; t=r(core); t=one(t,f"  const BUILD_VERSION = '{OLD}';",f"  const BUILD_VERSION = '{NEW}';",'version'); t=one(t,f"  const BUILD_NAME = '{OLD_NAME}';",f"  const BUILD_NAME = '{NEW_NAME}';",'name'); t=one(t,f"  const BUILD_ID = '{OLD_ID}';",f"  const BUILD_ID = '{NEW_ID}';",'id'); w(core,t)
ops=SRC/'js/39-club-operations.js'; t=r(ops)
old='return `<details class="club-must-respond-strip" data-management-action-rank="urgent" aria-label="Actions required before ending the day" open><summary>'
new='return `<details class="club-must-respond-strip" data-management-action-rank="urgent" aria-label="Actions required before ending the day"><summary>'
t=one(t,old,new,'must respond default open'); w(ops,t)
idx=SRC/'index.html'; t=r(idx).replace(f'Strikewatch {OLD}: {OLD_NAME}',f'Strikewatch {NEW}: {NEW_NAME}').replace(OLD_ID,NEW_ID); t=one(t,f'id="managerBuildVersion">{OLD}</b>',f'id="managerBuildVersion">{NEW}</b>','desktop'); t=one(t,f'id="mobileCommandBuildVersion">{OLD}</b>',f'id="mobileCommandBuildVersion">{NEW}</b>','mobile'); w(idx,t)
note=f"Build {NEW} removes the authored `open` state from the authoritative MUST RESPOND disclosure, so it is genuinely collapsed on first render rather than relying on a post-render observer. See `AUDIT-{NEW}.md`.\n\n"
for p in [SRC/'HANDOFF.md',SRC/'AGENTS.md']:
 t=r(p); t=one(t,f'Build {OLD} adds',note+f'Build {OLD} adds',p.name)
 if p.name=='HANDOFF.md': t=one(t,f'- Build: **{OLD} — {OLD_NAME}**',f'- Build: **{NEW} — {NEW_NAME}**','handoff build'); t=one(t,f'- Build ID: `{OLD_ID}`',f'- Build ID: `{NEW_ID}`','handoff id'); t=one(t,f'strikewatch-build-{OLD}.html',f'strikewatch-build-{NEW}.html','standalone')
 w(p,t)
readme=SRC/'README.md'; t=r(readme); t=one(t,f'# Strikewatch Source {OLD}',f'# Strikewatch Source {NEW}','readme'); t=one(t,f'dist/strikewatch-build-{OLD}.html',f'dist/strikewatch-build-{NEW}.html','readme dist'); w(readme,t)
proj=SRC/'PROJECT.md'; t=r(proj); t=one(t,f'Build {OLD} masks startup layout with a dedicated loading screen and defaults MUST RESPOND disclosures to collapsed. See `HANDOFF.md` and `AUDIT-{OLD}.md`.',f'Build {NEW} makes the authoritative MUST RESPOND disclosure render collapsed by default at source. See `HANDOFF.md` and `AUDIT-{NEW}.md`.','project'); w(proj,t)
w(SRC/f'AUDIT-{NEW}.md',f'''# Build {NEW} audit — {NEW_NAME}\n\n## Problem\nBuild 12.211 attempted to collapse MUST RESPOND after insertion, but the authoritative markup itself still included the native `open` attribute, so the expanded state could paint and persist.\n\n## Fix\n- Removed `open` from the source markup returned by `renderClubMustRespondStrip()`.\n- The urgent summary remains visible and can still be expanded manually.\n- Blocker authority, end-day locking and action routes are unchanged.\n\n## Verification\nThe release requires deterministic double builds, modular/generated/standalone JavaScript parsing, an assertion that the MUST RESPOND source has no authored open state, and root/standalone byte identity. Save schema 19 and diagnostics schema 1 remain unchanged.\n''')
print('Applied 12.212')
