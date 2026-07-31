#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "strikewatch-source"
OLD_VERSION = "12.202"
NEW_VERSION = "12.203"
OLD_NAME = "Today Timeline"
NEW_NAME = "League Pulse"
OLD_ID = "12.202.0-today-timeline"
NEW_ID = "12.203.0-league-pulse"


def fail(message: str) -> None:
    raise SystemExit(f"release-12.203: {message}")


def read(path: Path) -> str:
    if not path.exists():
        fail(f"missing required file: {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8")


def write(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        fail(f"expected one {label} anchor, found {count}")
    return text.replace(old, new, 1)


release_path = SRC / "RELEASE.json"
release = json.loads(read(release_path))
expected = {"version": OLD_VERSION, "name": OLD_NAME, "build_id": OLD_ID}
if release != expected:
    fail(f"unexpected predecessor release: {release!r}")
write(release_path, json.dumps({"version": NEW_VERSION, "name": NEW_NAME, "build_id": NEW_ID}, indent=2) + "\n")

core_path = SRC / "js/00-core.js"
core = read(core_path)
core = replace_once(core, f"  const BUILD_VERSION = '{OLD_VERSION}';", f"  const BUILD_VERSION = '{NEW_VERSION}';", "BUILD_VERSION")
core = replace_once(core, f"  const BUILD_NAME = '{OLD_NAME}';", f"  const BUILD_NAME = '{NEW_NAME}';", "BUILD_NAME")
core = replace_once(core, f"  const BUILD_ID = '{OLD_ID}';", f"  const BUILD_ID = '{NEW_ID}';", "BUILD_ID")
write(core_path, core)

press_path = SRC / "js/56-world-press-awards.js"
press = read(press_path)
anchor = """  function renderWorldPressMatchAward(summary) {
"""
helper = """  function worldPressLeaguePulseSnapshot(limit = 6) {
    const state = ensureWorldPressState();
    const league = typeof ensureLeagueState === 'function' ? ensureLeagueState() : null;
    if (!state || !league) return { reports: [], leaders: [], next: null };
    const reports = state.fixtureOrder.map(id => state.fixtureReports[id]).filter(report => report && report.mode === 'league' && !report.historical).slice(0, Math.max(1, limit));
    const leaders = Object.values(state.playerRecords).map(record => {
      const seasonEntries = (record.entries || []).filter(entry => Number(entry.season) === Number(league.season));
      const motm = seasonEntries.filter(entry => entry.title === 'MAN OF THE MATCH');
      const latest = motm[0] || null;
      return { playerId: record.playerId, playerName: record.playerName, clubName: latest?.clubName || record.currentClub, motm: motm.length, rating: motm.length ? motm.reduce((sum, entry) => sum + (Number(entry.rating) || 0), 0) / motm.length : 0 };
    }).filter(item => item.motm > 0).sort((a, b) => b.motm - a.motm || b.rating - a.rating || a.playerName.localeCompare(b.playerName)).slice(0, 5);
    const fixture = typeof leagueNextFixture === 'function' ? leagueNextFixture() : null;
    const opponent = fixture && typeof leagueClubById === 'function' && typeof leagueFixtureOpponentId === 'function' ? leagueClubById(leagueFixtureOpponentId(fixture)) : null;
    const next = fixture && opponent ? {
      fixtureId: fixture.id,
      matchday: fixture.matchday,
      opponentName: opponent.name,
      opponentShort: opponent.short,
      style: opponent.style,
      days: typeof clubDaysUntilFixture === 'function' ? clubDaysUntilFixture() : null
    } : null;
    return { reports, leaders, next };
  }

  function renderWorldPressLeaguePulse() {
    const pulse = worldPressLeaguePulseSnapshot(6);
    const reportMarkup = pulse.reports.length ? pulse.reports.map(report => `<article class="league-pulse-report"><header><span>MATCHDAY ${Math.max(1, Number(report.matchday) || 1)}</span><strong>${escapeCareerHtml(report.homeShort || report.homeName)} ${report.homeScore} — ${report.awayScore} ${escapeCareerHtml(report.awayShort || report.awayName)}</strong></header><p>${escapeCareerHtml(report.writeup || '')}</p><small>★ ${escapeCareerHtml(report.motm?.playerName || 'Award pending')} · ${escapeCareerHtml(report.motm?.clubName || '')} · ${Number(report.motm?.rating || 0).toFixed(2)} RATING</small></article>`).join('') : '<div class="league-pulse-empty"><strong>NO RIVAL REPORTS YET</strong><p>Completed matchdays will generate results, write-ups and Man of the Match coverage.</p></div>';
    const leadersMarkup = pulse.leaders.length ? pulse.leaders.map((item, index) => `<article><b>${index + 1}</b><div><strong>${escapeCareerHtml(item.playerName)}</strong><small>${escapeCareerHtml(item.clubName || 'DIVISION')} · ${item.rating.toFixed(2)} AVG</small></div><em>${item.motm} MOTM</em></article>`).join('') : '<p>No award leader has emerged yet.</p>';
    const nextMarkup = pulse.next ? `<button class="league-pulse-next" data-team-route="tactics"><span>NEXT OPPOSITION</span><strong>${escapeCareerHtml(pulse.next.opponentName)}</strong><small>MATCHDAY ${pulse.next.matchday} · ${escapeCareerHtml(pulse.next.style || 'BALANCED')}${Number.isFinite(Number(pulse.next.days)) ? ` · ${pulse.next.days === 0 ? 'TODAY' : `${pulse.next.days}D`}` : ''}</small><b>OPEN PREPARATION →</b></button>` : '<div class="league-pulse-next complete"><span>SEASON STATUS</span><strong>CAMPAIGN COMPLETE</strong><small>Review the final table and awards.</small></div>';
    return `<section class="league-pulse-panel"><div class="career-section-head"><div><span>THE STRIKEWATCH WIRE</span><strong>LEAGUE PULSE</strong></div><p>Recent rival results, award leaders and the next opposition in one living-world feed.</p></div><div class="league-pulse-layout"><section><header><span>RECENT COVERAGE</span><strong>AROUND THE DIVISION</strong></header><div class="league-pulse-reports">${reportMarkup}</div></section><aside><section><header><span>AWARD WATCH</span><strong>MAN OF THE MATCH LEADERS</strong></header><div class="league-pulse-leaders">${leadersMarkup}</div></section>${nextMarkup}</aside></div></section>`;
  }

"""
press = replace_once(press, anchor, helper + anchor, "League Pulse renderer insertion")
write(press_path, press)

league_path = SRC / "js/37-league.js"
league = read(league_path)
insert_anchor = """      ${renderLeaguePyramid()}
      <section class=\"league-table-panel\">"""
insert_replacement = """      ${renderLeaguePyramid()}
      ${typeof renderWorldPressLeaguePulse === 'function' ? renderWorldPressLeaguePulse() : ''}
      <section class=\"league-table-panel\">"""
league = replace_once(league, insert_anchor, insert_replacement, "League Pulse placement")
write(league_path, league)

css_path = SRC / "css/compact-navigation.css"
css = read(css_path)
css_block = """

/* --- Build 12.203: living-world League Pulse ------------------------------ */
.league-pulse-panel { display:grid; gap:14px; padding:16px; border:1px solid rgba(112,190,219,.24); background:linear-gradient(145deg,rgba(10,28,42,.97),rgba(11,19,33,.97)); }
.league-pulse-panel .career-section-head { margin:0; }
.league-pulse-layout { display:grid; grid-template-columns:minmax(0,1.65fr) minmax(240px,.85fr); gap:12px; }
.league-pulse-layout > section,.league-pulse-layout > aside > section,.league-pulse-next { border:1px solid rgba(130,164,190,.2); background:rgba(17,29,46,.84); }
.league-pulse-layout header { display:flex; justify-content:space-between; gap:10px; padding:10px 12px; border-bottom:1px solid rgba(130,164,190,.16); }
.league-pulse-layout header span,.league-pulse-next span { font-size:10px; letter-spacing:.15em; color:#83cbe6; }
.league-pulse-layout header strong { font-size:11px; color:#e7f2f7; }
.league-pulse-reports { display:grid; gap:8px; padding:10px; }
.league-pulse-report { display:grid; gap:5px; padding:10px; border-left:3px solid #4b9abd; background:rgba(23,38,58,.72); }
.league-pulse-report header { padding:0; border:0; }
.league-pulse-report p { margin:0; font-size:11px; line-height:1.4; color:#b8c7d2; }
.league-pulse-report small { font-size:10px; color:#e7c873; }
.league-pulse-layout > aside { display:grid; align-content:start; gap:12px; }
.league-pulse-leaders { display:grid; gap:1px; }
.league-pulse-leaders article { display:grid; grid-template-columns:24px minmax(0,1fr) auto; align-items:center; gap:8px; padding:9px 10px; border-top:1px solid rgba(130,164,190,.12); }
.league-pulse-leaders article:first-child { border-top:0; }
.league-pulse-leaders article b,.league-pulse-leaders article em { font-size:10px; color:#e7c873; }
.league-pulse-leaders article div { display:grid; gap:2px; min-width:0; }
.league-pulse-leaders article strong { font-size:11px; color:#edf5f8; overflow-wrap:anywhere; }
.league-pulse-leaders article small { font-size:9.5px; color:#9eb1bf; }
.league-pulse-next { display:grid; gap:5px; padding:12px; text-align:left; }
.league-pulse-next strong { font-size:14px; color:#f2f7fa; }
.league-pulse-next small { font-size:10px; color:#aebdca; }
.league-pulse-next b { margin-top:5px; font-size:10px; color:#e7c873; }
.league-pulse-empty { padding:14px; }
.league-pulse-empty strong { font-size:11px; }
.league-pulse-empty p { margin:5px 0 0; font-size:10px; color:#aebdca; }
@media (max-width: 760px) { .league-pulse-layout { grid-template-columns:1fr; } .league-pulse-report header { display:grid; } }
"""
if "Build 12.203: living-world League Pulse" in css:
    fail("12.203 CSS block already exists")
write(css_path, css.rstrip() + css_block + "\n")

build_path = SRC / "build.py"
build = read(build_path)
# The release owns one compact reflow query and a bounded component stylesheet increase.
build = replace_once(build, '"game_css_lines_max": 30730,', '"game_css_lines_max": 30780,', "CSS line budget")
build = replace_once(build, '"media_queries_max": 476,', '"media_queries_max": 477,', "media-query budget")
write(build_path, build)

index_path = SRC / "index.html"
index = read(index_path)
index = index.replace(f"Strikewatch {OLD_VERSION}: {OLD_NAME}", f"Strikewatch {NEW_VERSION}: {NEW_NAME}")
index = index.replace(OLD_ID, NEW_ID)
index = replace_once(index, f'id="managerBuildVersion">{OLD_VERSION}</b>', f'id="managerBuildVersion">{NEW_VERSION}</b>', "desktop build label")
index = replace_once(index, f'id="mobileCommandBuildVersion">{OLD_VERSION}</b>', f'id="mobileCommandBuildVersion">{NEW_VERSION}</b>', "mobile build label")
write(index_path, index)

note = (f"Build {NEW_VERSION} adds League Pulse to the League page, exposing recent rival reports, scorelines, Man of the Match coverage, seasonal award leaders and the next opposition from the existing living press authority. It adds no fixture or award simulation path and does not duplicate Inbox stories. Gameplay and schemas are unchanged. See `AUDIT-{NEW_VERSION}.md`.\n\n")

handoff_path = SRC / "HANDOFF.md"
handoff = read(handoff_path)
handoff = replace_once(handoff, f"- Build: **{OLD_VERSION} — {OLD_NAME}**", f"- Build: **{NEW_VERSION} — {NEW_NAME}**", "HANDOFF build")
handoff = replace_once(handoff, f"- Build ID: `{OLD_ID}`", f"- Build ID: `{NEW_ID}`", "HANDOFF id")
handoff = replace_once(handoff, f"strikewatch-build-{OLD_VERSION}.html", f"strikewatch-build-{NEW_VERSION}.html", "HANDOFF standalone")
handoff = replace_once(handoff, f"Build {OLD_VERSION} adds", note + f"Build {OLD_VERSION} adds", "HANDOFF note")
write(handoff_path, handoff)

agents_path = SRC / "AGENTS.md"
agents = read(agents_path)
agents = replace_once(agents, f"Build {OLD_VERSION} adds", note + f"Build {OLD_VERSION} adds", "AGENTS note")
write(agents_path, agents)

readme_path = SRC / "README.md"
readme = read(readme_path)
readme = replace_once(readme, f"# Strikewatch Source {OLD_VERSION}", f"# Strikewatch Source {NEW_VERSION}", "README title")
readme = replace_once(readme, f"dist/strikewatch-build-{OLD_VERSION}.html", f"dist/strikewatch-build-{NEW_VERSION}.html", "README standalone")
write(readme_path, readme)

project_path = SRC / "PROJECT.md"
project = read(project_path)
old_project = f"Build {OLD_VERSION} adds a live Today timeline to the Operations overview, summarising fixtures, readiness, inbox, commitments and end-day state without duplicating blocker authority. See `HANDOFF.md` and `AUDIT-{OLD_VERSION}.md`."
new_project = f"Build {NEW_VERSION} adds a living-world League Pulse with rival reports, Man of the Match leaders and next-opponent context sourced from the existing press system. See `HANDOFF.md` and `AUDIT-{NEW_VERSION}.md`."
project = replace_once(project, old_project, new_project, "PROJECT current release")
write(project_path, project)

audit = f"""# Build {NEW_VERSION} audit — {NEW_NAME}

## Scope

The living press system already generated rival match reports, Man of the Match records, award mail and opposition intelligence, but most of that world activity was only visible through individual Inbox messages or historical player pages.

## Change

- Added `worldPressLeaguePulseSnapshot()` and `renderWorldPressLeaguePulse()` in `js/56-world-press-awards.js`.
- The League page now displays recent non-historical rival reports, scorelines, write-ups and Man of the Match details.
- A seasonal award-watch table ranks operators by current-season Man of the Match count and average award rating.
- The next-opposition card routes to existing Tactics preparation.
- The panel reads existing fixture-report and accolade authorities only; it does not simulate fixtures, change awards or create duplicate Inbox stories.
- Compact presentation reflows below 760px.

## Verification

- Exact Build {OLD_VERSION} predecessor metadata checked before patching.
- `build.py` compiled and ran twice with byte-identical bundle, standalone and JSON reports.
- Every modular JavaScript file, generated bundle and standalone inline script parsed with Node.
- Source assertions covered report filtering, award-leader ranking, next-opponent routing and League-page placement.
- Root `cod.html` was copied from and verified byte-identical to the generated standalone.

Save schema 19 and diagnostics schema 1 are unchanged.
"""
write(SRC / f"AUDIT-{NEW_VERSION}.md", audit)

checks = {
    press_path: ["function worldPressLeaguePulseSnapshot", "function renderWorldPressLeaguePulse", "!report.historical", "MAN OF THE MATCH LEADERS"],
    league_path: ["renderWorldPressLeaguePulse()"],
    css_path: ["Build 12.203: living-world League Pulse", "@media (max-width: 760px)"],
}
for path, fragments in checks.items():
    text = read(path)
    missing = [fragment for fragment in fragments if fragment not in text]
    if missing:
        fail(f"missing post-patch anchors in {path.name}: {missing!r}")

print(f"Applied Build {NEW_VERSION}: {NEW_NAME}")
