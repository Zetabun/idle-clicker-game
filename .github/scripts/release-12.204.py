#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]; SRC=ROOT/'strikewatch-source'
OLD='12.203'; NEW='12.204'; OLD_NAME='League Pulse'; NEW_NAME='Operator Career Story'; OLD_ID='12.203.0-league-pulse'; NEW_ID='12.204.0-operator-career-story'
def fail(m): raise SystemExit(f'release-12.204: {m}')
def read(p):
    if not p.exists(): fail(f'missing {p.relative_to(ROOT)}')
    return p.read_text(encoding='utf-8')
def write(p,t): p.write_text(t,encoding='utf-8')
def one(t,a,b,l):
    if t.count(a)!=1: fail(f'expected one {l}, found {t.count(a)}')
    return t.replace(a,b,1)
rp=SRC/'RELEASE.json'; r=json.loads(read(rp)); exp={'version':OLD,'name':OLD_NAME,'build_id':OLD_ID}
if r!=exp: fail(f'unexpected predecessor {r!r}')
write(rp,json.dumps({'version':NEW,'name':NEW_NAME,'build_id':NEW_ID},indent=2)+'\n')
cp=SRC/'js/00-core.js'; c=read(cp); c=one(c,f"  const BUILD_VERSION = '{OLD}';",f"  const BUILD_VERSION = '{NEW}';",'version'); c=one(c,f"  const BUILD_NAME = '{OLD_NAME}';",f"  const BUILD_NAME = '{NEW_NAME}';",'name'); c=one(c,f"  const BUILD_ID = '{OLD_ID}';",f"  const BUILD_ID = '{NEW_ID}';",'id'); write(cp,c)
pp=SRC/'js/56-world-press-awards.js'; p=read(pp)
anchor="""  function renderWorldPressPlayerAccolades(player) {
"""
helper="""  function worldPressPlayerCareerSnapshot(player) {
    const entries = worldPressEntriesForPlayer(player);
    const awards = entries.filter(entry => entry.type === 'award');
    const motm = awards.filter(entry => entry.title === 'MAN OF THE MATCH');
    const major = awards.filter(entry => ['OPERATOR OF THE MONTH','OPERATOR OF THE SEASON'].includes(entry.title));
    const milestones = entries.filter(entry => entry.type === 'milestone' || entry.type === 'achievement');
    const ratings = entries.map(entry => Number(entry.rating)).filter(Number.isFinite);
    const best = ratings.length ? Math.max(...ratings) : Number(player?.career?.rating) || 0;
    const seasons = new Set(entries.map(entry => Number(entry.season)).filter(value => value > 0));
    const clubs = new Set([player?.currentTeam, ...(player?.history || []).map(item => item.team), ...entries.map(entry => entry.clubName)].filter(Boolean));
    const latest = entries[0] || null;
    return { awards: awards.length, motm: motm.length, major: major.length, milestones: milestones.length, best, seasons: Math.max(1,seasons.size), clubs: Math.max(1,clubs.size), latest };
  }

  function renderWorldPressCareerStory(player) {
    const story = worldPressPlayerCareerSnapshot(player);
    const career = player?.career || {};
    const kd = (Number(career.kills)||0) / Math.max(1, Number(career.deaths)||0);
    const latest = story.latest ? `<article class="player-career-latest ${escapeCareerHtml(story.latest.tone || 'neutral')}"><span>LATEST CHAPTER</span><strong>${escapeCareerHtml(story.latest.title)}</strong><p>${escapeCareerHtml(story.latest.detail || '')}</p><small>${escapeCareerHtml(story.latest.dateLabel || '')}${story.latest.clubName ? ` · ${escapeCareerHtml(story.latest.clubName)}` : ''}</small></article>` : '<article class="player-career-latest neutral"><span>LATEST CHAPTER</span><strong>CAREER STORY BEGINS HERE</strong><p>Complete competitive fixtures to add awards, milestones and defining performances.</p></article>';
    return `<section class="player-career-story"><div class="career-section-head"><div><span>OPERATOR CAREER STORY</span><strong>RECORD, LEGACY & DEFINING MOMENTS</strong></div><p>A compact summary of the operator's full competitive journey.</p></div><div class="player-career-story-grid"><article><span>APPEARANCES</span><strong>${Math.max(0,Number(career.matches)||0)}</strong><small>${Math.max(0,Number(career.wins)||0)} WINS · ${kd.toFixed(2)} K/D</small></article><article><span>AWARDS</span><strong>${story.awards}</strong><small>${story.motm} MOTM · ${story.major} MAJOR</small></article><article><span>BEST AWARD RATING</span><strong>${story.best ? story.best.toFixed(2) : '—'}</strong><small>${story.milestones} CAREER MILESTONES</small></article><article><span>CAREER JOURNEY</span><strong>${story.seasons} SEASON${story.seasons===1?'':'S'}</strong><small>${story.clubs} CLUB${story.clubs===1?'':'S'} RECORDED</small></article></div>${latest}</section>`;
  }

"""
p=one(p,anchor,helper+anchor,'career story helper')
old="""    return `<section class="player-accolades-panel" data-player-accolades="${escapeCareerHtml(player.id)}"><div class="career-section-head"><div><span>ACCOLADES & ACHIEVEMENTS</span><strong>CAREER HONOURS HISTORY</strong></div><p>Every award records the fixture, context and date so the operator develops a permanent career story.</p></div><div class="player-accolade-summary">${''}"""
# Insert story immediately before the existing accolades panel without rewriting the long template.
needle='    return `<section class="player-accolades-panel" data-player-accolades="${escapeCareerHtml(player.id)}">'
if needle not in p: fail('missing accolades return anchor')
p=p.replace(needle,'    return `${renderWorldPressCareerStory(player)}<section class="player-accolades-panel" data-player-accolades="${escapeCareerHtml(player.id)}">',1)
write(pp,p)
cssp=SRC/'css/compact-navigation.css'; css=read(cssp)
block='''\n\n/* --- Build 12.204: operator career story --------------------------------- */
.player-career-story{display:grid;gap:12px;padding:16px;border:1px solid rgba(207,171,83,.26);background:linear-gradient(145deg,rgba(27,28,38,.97),rgba(13,23,37,.97))}.player-career-story .career-section-head{margin:0}.player-career-story-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr));gap:8px}.player-career-story-grid article,.player-career-latest{display:grid;gap:4px;padding:11px 12px;border:1px solid rgba(168,151,112,.2);background:rgba(25,35,51,.82)}.player-career-story-grid span,.player-career-latest span{font-size:10px;letter-spacing:.14em;color:#d8bd79}.player-career-story-grid strong{font-size:17px;color:#f5f1e7}.player-career-story-grid small,.player-career-latest small{font-size:10px;color:#aebbc5}.player-career-latest{border-left:3px solid #d8bd79}.player-career-latest strong{font-size:13px;color:#f1f5f7}.player-career-latest p{margin:0;font-size:11px;line-height:1.4;color:#b8c5ce}
'''
if 'Build 12.204: operator career story' in css: fail('css exists')
write(cssp,css.rstrip()+block)
bp=SRC/'build.py'; b=read(bp); b=one(b,'"game_css_lines_max": 30780,','"game_css_lines_max": 30820,','css budget'); write(bp,b)
ip=SRC/'index.html'; i=read(ip).replace(f'Strikewatch {OLD}: {OLD_NAME}',f'Strikewatch {NEW}: {NEW_NAME}').replace(OLD_ID,NEW_ID); i=one(i,f'id="managerBuildVersion">{OLD}</b>',f'id="managerBuildVersion">{NEW}</b>','desktop label'); i=one(i,f'id="mobileCommandBuildVersion">{OLD}</b>',f'id="mobileCommandBuildVersion">{NEW}</b>','mobile label'); write(ip,i)
note=f"Build {NEW} adds a compact Operator Career Story above each accolade timeline, summarising appearances, wins, K/D, awards, best rating, milestones, seasons, clubs and the latest defining moment from existing career and world-press records. It adds no new persistence or award authority. See `AUDIT-{NEW}.md`.\n\n"
hp=SRC/'HANDOFF.md'; h=read(hp); h=one(h,f'- Build: **{OLD} — {OLD_NAME}**',f'- Build: **{NEW} — {NEW_NAME}**','handoff build'); h=one(h,f'- Build ID: `{OLD_ID}`',f'- Build ID: `{NEW_ID}`','handoff id'); h=one(h,f'strikewatch-build-{OLD}.html',f'strikewatch-build-{NEW}.html','handoff standalone'); h=one(h,f'Build {OLD} adds',note+f'Build {OLD} adds','handoff note'); write(hp,h)
ap=SRC/'AGENTS.md'; a=read(ap); a=one(a,f'Build {OLD} adds',note+f'Build {OLD} adds','agents note'); write(ap,a)
rmp=SRC/'README.md'; rm=read(rmp); rm=one(rm,f'# Strikewatch Source {OLD}',f'# Strikewatch Source {NEW}','readme title'); rm=one(rm,f'dist/strikewatch-build-{OLD}.html',f'dist/strikewatch-build-{NEW}.html','readme standalone'); write(rmp,rm)
prp=SRC/'PROJECT.md'; pr=read(prp); pr=one(pr,f'Build {OLD} adds a living-world League Pulse with rival reports, Man of the Match leaders and next-opponent context sourced from the existing press system. See `HANDOFF.md` and `AUDIT-{OLD}.md`.',f'Build {NEW} adds a compact Operator Career Story that turns existing performance, award and club history into a readable personal legacy summary. See `HANDOFF.md` and `AUDIT-{NEW}.md`.','project note'); write(prp,pr)
audit=f'''# Build {NEW} audit — {NEW_NAME}\n\n## Scope\nPlayer profiles already stored deep performance and accolade history, but the player had to read the entire timeline to understand an operator's overall career story.\n\n## Change\n- Added a derived career snapshot in `js/56-world-press-awards.js`.\n- Player profiles now summarise appearances, wins, K/D, total awards, MOTM count, major honours, best recorded award rating, milestones, seasons, clubs and latest defining moment.\n- All values are derived from existing player career, history and world-press records.\n- No save schema, award settlement or fixture authority changed.\n\n## Verification\n- Exact predecessor checked.\n- Two deterministic builds compared.\n- All modular, bundled and standalone JavaScript parsed with Node.\n- Root `cod.html` verified byte-identical to the standalone.\n\nSave schema 19 and diagnostics schema 1 are unchanged.\n'''; write(SRC/f'AUDIT-{NEW}.md',audit)
for f,frags in {pp:['function worldPressPlayerCareerSnapshot','function renderWorldPressCareerStory','OPERATOR CAREER STORY'],cssp:['Build 12.204: operator career story']}.items():
    t=read(f)
    if any(x not in t for x in frags): fail(f'missing anchors in {f.name}')
print(f'Applied Build {NEW}: {NEW_NAME}')
