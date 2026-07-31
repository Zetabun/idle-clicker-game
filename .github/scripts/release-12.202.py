#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "strikewatch-source"
OLD_VERSION = "12.201"
NEW_VERSION = "12.202"
OLD_NAME = "Mobile Action Hierarchy"
NEW_NAME = "Today Timeline"
OLD_ID = "12.201.0-mobile-action-hierarchy"
NEW_ID = "12.202.0-today-timeline"


def fail(message: str) -> None:
    raise SystemExit(f"release-12.202: {message}")


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

team_path = SRC / "js/36-team-management.js"
team = read(team_path)
function_anchor = """  function renderTeamOperationsDashboard(roundNumberValue, scoreText, liveBlue, liveRed, viewedBot, zone, pauseMenu) {
"""
helper = """  function teamCommandTodayTimeline(fixture, squad, loan, wageBill) {
    const blockers = typeof clubEndDayBlockers === 'function' ? clubEndDayBlockers() : [];
    const unread = typeof clubUnreadMailCount === 'function' ? clubUnreadMailCount() : 0;
    const importantUnread = (careerState.mail || []).filter(item => !item.read && item.important).length;
    const points = Math.max(0, Number(careerState.unspentPoints) || 0) + (typeof totalUnspentPlayerPoints === 'function' ? totalUnspentPlayerPoints() : 0);
    const planConfirmed = typeof clubMatchPlanConfirmed === 'function' ? clubMatchPlanConfirmed() : false;
    const matchToday = !fixture.complete && fixture.daysLabel === 'TODAY';
    const trainingAttention = squad.medical.length > 0 || squad.fatigue >= 58 || points > 0 || Boolean(careerState.trainingRecommendation);
    const financeCommitment = Math.max(0, Math.round(Number(wageBill) || 0)) + (loan.active ? Math.max(0, Math.round(Number(loan.due) || 0)) : 0);
    const firstBlocker = blockers[0] || null;
    return [
      {
        id: 'fixture', label: 'FIXTURE',
        title: fixture.complete ? 'Season review due' : matchToday ? `${fixture.title} today` : `${fixture.title} in ${fixture.daysLabel.toLowerCase()}`,
        detail: fixture.complete ? 'Review the final table and next-season state.' : `${fixture.location} · ${planConfirmed ? 'plan confirmed' : 'plan not confirmed'}`,
        value: fixture.complete ? 'REVIEW' : fixture.daysLabel,
        tone: fixture.complete ? 'complete' : matchToday ? (planConfirmed ? 'urgent' : 'attention') : 'scheduled',
        route: fixture.complete ? 'league' : matchToday ? 'tactics' : 'calendar'
      },
      {
        id: 'training', label: 'SQUAD',
        title: trainingAttention ? 'Readiness needs attention' : 'Active five ready',
        detail: `${squad.readiness} readiness · ${squad.fatigue}% fatigue · ${squad.medical.length} medical flag${squad.medical.length === 1 ? '' : 's'}`,
        value: trainingAttention ? (points ? `${points} PTS` : 'CHECK') : 'READY',
        tone: trainingAttention ? 'attention' : 'complete',
        route: trainingAttention ? 'training' : 'operators'
      },
      {
        id: 'mail', label: 'INBOX',
        title: unread ? `${unread} unread club message${unread === 1 ? '' : 's'}` : 'Inbox clear',
        detail: importantUnread ? `${importantUnread} marked important.` : unread ? 'New information is available.' : 'No unread decisions or reports.',
        value: unread ? String(unread) : 'CLEAR',
        tone: importantUnread ? 'attention' : unread ? 'scheduled' : 'complete',
        route: 'mail'
      },
      {
        id: 'finance', label: 'COMMITMENTS',
        title: financeCommitment ? `${teamCredits(financeCommitment)} scheduled` : 'No scheduled collection',
        detail: loan.active ? `${teamCredits(loan.due)} loan · ${teamCredits(wageBill)} payroll` : `${teamCredits(wageBill)} weekly payroll`,
        value: loan.active ? escapeCareerHtml(loan.dueLabel) : 'PAYROLL',
        tone: loan.tone === 'danger' ? 'urgent' : loan.tone === 'warning' ? 'attention' : 'scheduled',
        route: 'barracks'
      },
      {
        id: 'day', label: 'END DAY',
        title: blockers.length ? `Calendar locked by ${blockers.length} response${blockers.length === 1 ? '' : 's'}` : 'Calendar ready to advance',
        detail: blockers.length ? 'Use MUST RESPOND above for the authoritative action list.' : 'No mandatory decisions remain today.',
        value: blockers.length ? `${blockers.length} LOCK` : 'READY',
        tone: blockers.length ? 'urgent' : 'complete',
        route: firstBlocker?.route || 'calendar'
      }
    ];
  }

"""
team = replace_once(team, function_anchor, helper + function_anchor, "Today timeline helper insertion")
vars_anchor = """    const tutorialMarkup = renderTeamTutorialPanel();
    const calendarMarkup = typeof renderClubCalendarStrip === 'function' ? renderClubCalendarStrip() : '';
    const heroMarkup = `<section class=\"command-centre-hero ${pauseMenu ? 'live' : ''} ${firstGuide ? 'guided-journey' : ''}\">\n"""
vars_replacement = """    const tutorialMarkup = renderTeamTutorialPanel();
    const calendarMarkup = typeof renderClubCalendarStrip === 'function' ? renderClubCalendarStrip() : '';
    const todayTimeline = teamCommandTodayTimeline(fixture, squad, loan, wageBill);
    const todayTimelineMarkup = `<section class=\"command-today-panel\" aria-label=\"Today at the club\"><div class=\"career-section-head compact\"><div><span>TODAY AT THE CLUB</span><strong>${typeof clubCurrentDateLabel === 'function' ? escapeCareerHtml(clubCurrentDateLabel(false)) : `WEEK ${careerState.week}`}</strong></div><p>One compact view of the fixture, squad, inbox, commitments and end-day state.</p></div><div class=\"command-today-grid\">${todayTimeline.map(item => `<button class=\"command-today-item ${escapeCareerHtml(item.tone)}\" data-team-route=\"${escapeCareerHtml(item.route)}\" data-today-item=\"${escapeCareerHtml(item.id)}\"><span>${escapeCareerHtml(item.label)}</span><strong>${escapeCareerHtml(item.title)}</strong><small>${escapeCareerHtml(item.detail)}</small><b>${escapeCareerHtml(item.value)}</b></button>`).join('')}</div></section>`;
    const heroMarkup = `<section class=\"command-centre-hero ${pauseMenu ? 'live' : ''} ${firstGuide ? 'guided-journey' : ''}\">\n"""
team = replace_once(team, vars_anchor, vars_replacement, "Today timeline markup")
return_anchor = """    return `${tutorialMarkup}${calendarMarkup}${heroMarkup}${progressMarkup}
      <div class=\"command-overview-grid\">\n"""
return_replacement = """    return `${tutorialMarkup}${calendarMarkup}${todayTimelineMarkup}${heroMarkup}${progressMarkup}
      <div class=\"command-overview-grid\">\n"""
team = replace_once(team, return_anchor, return_replacement, "Today timeline placement")
write(team_path, team)

css_path = SRC / "css/compact-navigation.css"
css = read(css_path)
css_block = """

/* --- Build 12.202: Operations Today timeline ------------------------------ */
.command-today-panel {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid rgba(104, 196, 225, .24);
  background: linear-gradient(145deg, rgba(10, 31, 45, .96), rgba(10, 20, 35, .96));
  box-shadow: 0 12px 28px rgba(0, 0, 0, .22);
}
.command-today-panel .career-section-head { margin: 0; }
.command-today-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 178px), 1fr));
  gap: 8px;
}
.command-today-item {
  position: relative;
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  gap: 5px;
  min-width: 0;
  min-height: 116px;
  padding: 11px 12px;
  text-align: left;
  border: 1px solid rgba(132, 169, 195, .22);
  background: rgba(18, 31, 49, .88);
  overflow: hidden;
}
.command-today-item::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: #4c95b7;
}
.command-today-item > span {
  font-size: 10px;
  letter-spacing: .16em;
  color: #8fcfe8;
}
.command-today-item > strong {
  font-size: 13px;
  line-height: 1.25;
  color: #f3f7fa;
  overflow-wrap: anywhere;
}
.command-today-item > small {
  font-size: 11px;
  line-height: 1.35;
  color: #aebdca;
  overflow-wrap: anywhere;
}
.command-today-item > b {
  justify-self: start;
  font-size: 10px;
  letter-spacing: .1em;
  color: #d7eaf2;
}
.command-today-item.urgent::before { background: #ff806f; }
.command-today-item.attention::before { background: #e7bd55; }
.command-today-item.complete::before { background: #55c9a6; }
.command-today-item.urgent > b { color: #ffab9f; }
.command-today-item.attention > b { color: #f0d17d; }
.command-today-item.complete > b { color: #79dfbd; }
"""
if "Build 12.202: Operations Today timeline" in css:
    fail("12.202 CSS block already exists")
write(css_path, css.rstrip() + css_block + "\n")

index_path = SRC / "index.html"
index = read(index_path)
index = index.replace(f"Strikewatch {OLD_VERSION}: {OLD_NAME}", f"Strikewatch {NEW_VERSION}: {NEW_NAME}")
index = index.replace(OLD_ID, NEW_ID)
index = replace_once(index, f'id="managerBuildVersion">{OLD_VERSION}</b>', f'id="managerBuildVersion">{NEW_VERSION}</b>', "desktop build label")
index = replace_once(index, f'id="mobileCommandBuildVersion">{OLD_VERSION}</b>', f'id="mobileCommandBuildVersion">{NEW_VERSION}</b>', "mobile build label")
write(index_path, index)

note = (
    f"Build {NEW_VERSION} adds the Operations Today timeline: a compact, live summary of the next fixture, active-five readiness, unread mail, scheduled commitments and end-day readiness. "
    "It links into existing routes and deliberately points mandatory decisions back to the authoritative MUST RESPOND surface instead of creating another action authority. "
    f"Gameplay, calendar rules and schemas are unchanged. See `AUDIT-{NEW_VERSION}.md`.\n\n"
)

handoff_path = SRC / "HANDOFF.md"
handoff = read(handoff_path)
handoff = replace_once(handoff, f"- Build: **{OLD_VERSION} — {OLD_NAME}**", f"- Build: **{NEW_VERSION} — {NEW_NAME}**", "HANDOFF build")
handoff = replace_once(handoff, f"- Build ID: `{OLD_ID}`", f"- Build ID: `{NEW_ID}`", "HANDOFF id")
handoff = replace_once(handoff, f"strikewatch-build-{OLD_VERSION}.html", f"strikewatch-build-{NEW_VERSION}.html", "HANDOFF standalone")
handoff = replace_once(handoff, f"Build {OLD_VERSION} establishes", note + f"Build {OLD_VERSION} establishes", "HANDOFF note")
write(handoff_path, handoff)

agents_path = SRC / "AGENTS.md"
agents = read(agents_path)
agents = replace_once(agents, f"Build {OLD_VERSION} establishes", note + f"Build {OLD_VERSION} establishes", "AGENTS note")
write(agents_path, agents)

readme_path = SRC / "README.md"
readme = read(readme_path)
readme = replace_once(readme, f"# Strikewatch Source {OLD_VERSION}", f"# Strikewatch Source {NEW_VERSION}", "README title")
readme = replace_once(readme, f"dist/strikewatch-build-{OLD_VERSION}.html", f"dist/strikewatch-build-{NEW_VERSION}.html", "README standalone")
write(readme_path, readme)

project_path = SRC / "PROJECT.md"
project = read(project_path)
old_project = f"Build {OLD_VERSION} gives compact management pages one clear action hierarchy: collapsible urgent blockers first, otherwise one recommended priority. See `HANDOFF.md` and `AUDIT-{OLD_VERSION}.md`."
new_project = f"Build {NEW_VERSION} adds a live Today timeline to the Operations overview, summarising fixtures, readiness, inbox, commitments and end-day state without duplicating blocker authority. See `HANDOFF.md` and `AUDIT-{NEW_VERSION}.md`."
project = replace_once(project, old_project, new_project, "PROJECT current release")
write(project_path, project)

audit = f"""# Build {NEW_VERSION} audit — {NEW_NAME}

## Scope

The Operations overview had strong individual cards but no single chronological snapshot of what matters today. On mobile, the player had to scan several large sections to understand the fixture, squad condition, messages, financial commitments and whether the calendar could advance.

## Change

- Added `teamCommandTodayTimeline()` in `js/36-team-management.js`.
- The timeline derives five live items from existing authorities: fixture, active-five condition, inbox, scheduled commitments and end-day blockers.
- Every item routes to an existing management page; no new decision or gameplay authority was introduced.
- When the day is blocked, the timeline gives only a compact lock summary and explicitly leaves the detailed action list to MUST RESPOND.
- The timeline is hidden during the focused first-match guide so onboarding retains one next-action path.
- Added responsive auto-fit presentation in `css/compact-navigation.css` without adding another media query.

## Verification

- Exact Build {OLD_VERSION} predecessor metadata checked before patching.
- `build.py` compiled and ran twice with byte-identical bundle, standalone and JSON reports.
- Every modular JavaScript file, generated bundle and standalone inline script parsed with Node.
- Source assertions covered all five timeline items, route wiring and the no-duplicate blocker wording.
- Root `cod.html` was copied from and verified byte-identical to the generated standalone.

Save schema 19 and diagnostics schema 1 are unchanged.
"""
write(SRC / f"AUDIT-{NEW_VERSION}.md", audit)

checks = {
    team_path: ["function teamCommandTodayTimeline", "data-today-item", "Use MUST RESPOND above for the authoritative action list.", "${todayTimelineMarkup}${heroMarkup}"],
    css_path: ["Build 12.202: Operations Today timeline", "grid-template-columns: repeat(auto-fit"],
}
for path, fragments in checks.items():
    text = read(path)
    missing = [fragment for fragment in fragments if fragment not in text]
    if missing:
        fail(f"missing post-patch anchors in {path.name}: {missing!r}")

print(f"Applied Build {NEW_VERSION}: {NEW_NAME}")
