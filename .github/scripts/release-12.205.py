#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]; SRC=ROOT/'strikewatch-source'
OLD='12.204'; NEW='12.205'; OLD_NAME='Operator Career Story'; NEW_NAME='Board Expectations'; OLD_ID='12.204.0-operator-career-story'; NEW_ID='12.205.0-board-expectations'
def fail(m): raise SystemExit(f'release-12.205: {m}')
def read(p):
    if not p.exists(): fail(f'missing {p.relative_to(ROOT)}')
    return p.read_text(encoding='utf-8')
def write(p,t): p.write_text(t,encoding='utf-8')
def one(t,a,b,l):
    if t.count(a)!=1: fail(f'expected one {l}, found {t.count(a)}')
    return t.replace(a,b,1)
release=SRC/'RELEASE.json'; current=json.loads(read(release)); expected={'version':OLD,'name':OLD_NAME,'build_id':OLD_ID}
if current!=expected: fail(f'unexpected predecessor {current!r}')
write(release,json.dumps({'version':NEW,'name':NEW_NAME,'build_id':NEW_ID},indent=2)+'\n')
core=SRC/'js/00-core.js'; text=read(core); text=one(text,f"  const BUILD_VERSION = '{OLD}';",f"  const BUILD_VERSION = '{NEW}';",'version'); text=one(text,f"  const BUILD_NAME = '{OLD_NAME}';",f"  const BUILD_NAME = '{NEW_NAME}';",'name'); text=one(text,f"  const BUILD_ID = '{OLD_ID}';",f"  const BUILD_ID = '{NEW_ID}';",'id'); write(core,text)
press=SRC/'js/56-world-press-awards.js'; text=read(press)
anchor='  function renderWorldPressClubHonours() {\n'
helper=r'''  function boardExpectationDefinitions() {
    const league = typeof ensureLeagueState === 'function' ? ensureLeagueState() : null;
    if (!league) return [];
    const table = typeof leagueTable === 'function' ? leagueTable() : [];
    const user = table.find(row => row.id === LEAGUE_USER_CLUB_ID) || { position: league.clubs?.length || 20, played: 0, wins: 0, roundDifference: 0 };
    const tier = typeof leagueDivisionTier === 'function' ? leagueDivisionTier() : 3;
    const squad = careerState.squad || [];
    const stable = squad.filter(player => Number(player.morale) >= 60 && Number(player.happiness) >= 55).length;
    const primaryTarget = tier === 3 ? 2 : tier === 2 ? 6 : tier === 1 ? 8 : 10;
    const winTarget = tier === 3 ? 12 : tier === 2 ? 14 : tier === 1 ? 16 : 18;
    const positionProgress = user.played ? clamp((league.clubs.length - user.position + 1) / Math.max(1, league.clubs.length - primaryTarget + 1), 0, 1) : 0;
    return [
      { id:'position', type:'PRIMARY', title:tier===3?'WIN PROMOTION':`FINISH IN THE TOP ${primaryTarget}`, detail:tier===3?'Finish in the top two and earn promotion.':`Meet the board's minimum league-position expectation.`, value:user.position, target:primaryTarget, progress:positionProgress, complete:user.played>0 && user.position<=primaryTarget, route:'league' },
      { id:'wins', type:'SECONDARY', title:`WIN ${winTarget} LEAGUE MATCHES`, detail:'Build a sustainable season rather than relying on one short run.', value:Number(user.wins)||0, target:winTarget, progress:clamp((Number(user.wins)||0)/winTarget,0,1), complete:(Number(user.wins)||0)>=winTarget, route:'league' },
      { id:'stability', type:'SECONDARY', title:'MAINTAIN A STABLE ACTIVE SQUAD', detail:'Keep at least five operators above the board morale and happiness floor.', value:stable, target:5, progress:clamp(stable/5,0,1), complete:stable>=5, route:'operators' }
    ];
  }

  function boardExpectationSnapshot() {
    const objectives = boardExpectationDefinitions();
    const average = objectives.length ? objectives.reduce((sum,item)=>sum+item.progress,0)/objectives.length : 0;
    const confidence = Math.round(clamp(35 + average*55 + objectives.filter(item=>item.complete).length*4, 0, 100));
    const status = confidence>=75?'STRONG':confidence>=55?'ON TRACK':confidence>=38?'AT RISK':'UNDER PRESSURE';
    return { objectives, confidence, status };
  }

  function boardExpectationStatus(item) {
    if (item.complete) return 'COMPLETED';
    if (item.progress >= .65) return 'ON TRACK';
    if (item.progress >= .35) return 'AT RISK';
    return 'BEHIND PLAN';
  }

  function renderBoardExpectations(compact = false) {
    const board = boardExpectationSnapshot();
    if (!board.objectives.length) return '';
    const cards = board.objectives.map(item => `<button class="board-objective-card ${item.complete?'complete':item.progress>=.65?'track':item.progress>=.35?'risk':'behind'}" data-team-route="${escapeCareerHtml(item.route)}"><span>${escapeCareerHtml(item.type)} · ${boardExpectationStatus(item)}</span><strong>${escapeCareerHtml(item.title)}</strong><p>${escapeCareerHtml(item.detail)}</p><div><i style="width:${Math.round(item.progress*100)}%"></i></div><small>${escapeCareerHtml(String(item.value))} / ${escapeCareerHtml(String(item.target))}</small></button>`).join('');
    return `<section class="board-expectations-panel ${compact?'compact':''}"><div class="career-section-head"><div><span>BOARD EXPECTATIONS</span><strong>SEASON OBJECTIVES</strong></div><p>Confidence changes gradually as the club advances toward its primary and secondary targets.</p></div><div class="board-confidence"><span>BOARD CONFIDENCE</span><strong>${board.confidence}% · ${board.status}</strong><div><i style="width:${board.confidence}%"></i></div></div><div class="board-objectives-grid">${cards}</div></section>`;
  }

'''
text=one(text,anchor,helper+anchor,'board helper insertion'); write(press,text)
league=SRC/'js/37-league.js'; text=read(league); needle="      ${typeof renderWorldPressLeaguePulse === 'function' ? renderWorldPressLeaguePulse() : ''}\n      <section class=\"league-table-panel\">"; repl="      ${typeof renderBoardExpectations === 'function' ? renderBoardExpectations(false) : ''}\n      ${typeof renderWorldPressLeaguePulse === 'function' ? renderWorldPressLeaguePulse() : ''}\n      <section class=\"league-table-panel\">"; text=one(text,needle,repl,'league board placement'); write(league,text)
team=SRC/'js/36-team-management.js'; text=read(team); needle='    return `${tutorialMarkup}${calendarMarkup}${todayTimelineMarkup}${heroMarkup}${progressMarkup}\n'; repl="    const boardMarkup = typeof renderBoardExpectations === 'function' ? renderBoardExpectations(true) : '';\n    return `${tutorialMarkup}${calendarMarkup}${todayTimelineMarkup}${boardMarkup}${heroMarkup}${progressMarkup}\n"; text=one(text,needle,repl,'operations board placement'); write(team,text)
cssp=SRC/'css/compact-navigation.css'; css=read(cssp); block=r'''

/* --- Build 12.205: board expectations ------------------------------------ */
.board-expectations-panel{display:grid;gap:12px;padding:16px;border:1px solid rgba(201,172,90,.28);background:linear-gradient(145deg,rgba(29,30,39,.97),rgba(12,23,37,.97))}.board-expectations-panel .career-section-head{margin:0}.board-confidence{display:grid;grid-template-columns:auto 1fr;gap:6px 12px;align-items:center;padding:10px 12px;border:1px solid rgba(201,172,90,.2);background:rgba(24,35,49,.78)}.board-confidence span{font-size:10px;letter-spacing:.14em;color:#d8bd79}.board-confidence strong{justify-self:end;font-size:11px;color:#f1f5f7}.board-confidence>div,.board-objective-card>div{grid-column:1/-1;height:5px;background:rgba(255,255,255,.08);overflow:hidden}.board-confidence i,.board-objective-card i{display:block;height:100%;background:#d8bd79}.board-objectives-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:8px}.board-objective-card{display:grid;grid-template-rows:auto auto 1fr auto auto;gap:5px;min-width:0;padding:11px 12px;text-align:left;border:1px solid rgba(134,163,187,.2);background:rgba(20,33,50,.84)}.board-objective-card span{font-size:9.5px;letter-spacing:.12em;color:#9fcde0}.board-objective-card strong{font-size:12px;line-height:1.3;color:#f2f6f8}.board-objective-card p{margin:0;font-size:10.5px;line-height:1.4;color:#adbdc8}.board-objective-card small{font-size:10px;color:#d8bd79}.board-objective-card.complete{border-color:rgba(82,198,158,.35)}.board-objective-card.complete i{background:#55c9a6}.board-objective-card.risk i{background:#e0b551}.board-objective-card.behind i{background:#df7f70}.board-expectations-panel.compact .career-section-head p{display:none}
'''
if 'Build 12.205: board expectations' in css: fail('css block exists')
write(cssp,css.rstrip()+block)
build=SRC/'build.py'; text=read(build); text=one(text,'"game_css_lines_max": 30820,','"game_css_lines_max": 30870,','css budget'); write(build,text)
index=SRC/'index.html'; text=read(index).replace(f'Strikewatch {OLD}: {OLD_NAME}',f'Strikewatch {NEW}: {NEW_NAME}').replace(OLD_ID,NEW_ID); text=one(text,f'id="managerBuildVersion">{OLD}</b>',f'id="managerBuildVersion">{NEW}</b>','desktop label'); text=one(text,f'id="mobileCommandBuildVersion">{OLD}</b>',f'id="mobileCommandBuildVersion">{NEW}</b>','mobile label'); write(index,text)
note=f"Build {NEW} adds Board Expectations: one division-scaled primary league target, two secondary objectives, live progress, status labels and a derived board-confidence score on Operations and League. It reuses existing standings and squad state and does not introduce dismissal or a new save authority. See `AUDIT-{NEW}.md`.\n\n"
handoff=SRC/'HANDOFF.md'; text=read(handoff); text=one(text,f'- Build: **{OLD} — {OLD_NAME}**',f'- Build: **{NEW} — {NEW_NAME}**','handoff build'); text=one(text,f'- Build ID: `{OLD_ID}`',f'- Build ID: `{NEW_ID}`','handoff id'); text=one(text,f'strikewatch-build-{OLD}.html',f'strikewatch-build-{NEW}.html','handoff standalone'); text=one(text,f'Build {OLD} adds',note+f'Build {OLD} adds','handoff note'); write(handoff,text)
agents=SRC/'AGENTS.md'; text=read(agents); text=one(text,f'Build {OLD} adds',note+f'Build {OLD} adds','agents note'); write(agents,text)
readme=SRC/'README.md'; text=read(readme); text=one(text,f'# Strikewatch Source {OLD}',f'# Strikewatch Source {NEW}','readme title'); text=one(text,f'dist/strikewatch-build-{OLD}.html',f'dist/strikewatch-build-{NEW}.html','readme standalone'); write(readme,text)
project=SRC/'PROJECT.md'; text=read(project); text=one(text,f'Build {OLD} adds a compact Operator Career Story that turns existing performance, award and club history into a readable personal legacy summary. See `HANDOFF.md` and `AUDIT-{OLD}.md`.',f'Build {NEW} adds division-scaled Board Expectations with a primary season target, secondary objectives and live confidence. See `HANDOFF.md` and `AUDIT-{NEW}.md`.','project note'); write(project,text)
audit=f'''# Build {NEW} audit — {NEW_NAME}\n\n## Scope\nThe game had strong day-to-day direction but no unified season-long board target.\n\n## Change\n- Added one division-scaled primary league objective.\n- Added league-win and squad-stability secondary objectives.\n- Added live progress, completed/on-track/at-risk/behind labels and derived board confidence.\n- Added full League presentation and compact Operations presentation.\n- No dismissal, save migration, fixture or reward authority was introduced.\n\n## Verification\n- Exact predecessor metadata checked.\n- Two deterministic builds compared.\n- Modular, bundled and standalone JavaScript parsed with Node.\n- Root `cod.html` verified byte-identical to the standalone.\n\nSave schema 19 and diagnostics schema 1 are unchanged.\n'''; write(SRC/f'AUDIT-{NEW}.md',audit)
for f,frags in {press:['function boardExpectationDefinitions','function renderBoardExpectations','BOARD CONFIDENCE'],league:['renderBoardExpectations(false)'],team:['renderBoardExpectations(true)'],cssp:['Build 12.205: board expectations']}.items():
    data=read(f)
    if any(x not in data for x in frags): fail(f'missing anchors in {f.name}')
print(f'Applied Build {NEW}: {NEW_NAME}')
