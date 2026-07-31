from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'strikewatch-source'
OLD = '12.221'
NEW = '12.222'
OLD_NAME = 'Desktop Management Layout Restoration'
NEW_NAME = 'League Fixtures Submenu'
OLD_ID = '12.221.0-desktop-management-layout-restoration'
NEW_ID = '12.222.0-league-fixtures-submenu'


def read(path):
    return path.read_text(encoding='utf-8')


def write(path, text):
    path.write_text(text, encoding='utf-8')


def replace_one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)


release = SRC / 'RELEASE.json'
expected = {'version': OLD, 'name': OLD_NAME, 'build_id': OLD_ID}
if json.loads(read(release)) != expected:
    raise SystemExit('unexpected predecessor release')
write(release, json.dumps({'version': NEW, 'name': NEW_NAME, 'build_id': NEW_ID}, indent=2) + '\n')

core = SRC / 'js/00-core.js'
text = read(core)
text = replace_one(text, f"  const BUILD_VERSION = '{OLD}';", f"  const BUILD_VERSION = '{NEW}';", 'version')
text = replace_one(text, f"  const BUILD_NAME = '{OLD_NAME}';", f"  const BUILD_NAME = '{NEW_NAME}';", 'name')
text = replace_one(text, f"  const BUILD_ID = '{OLD_ID}';", f"  const BUILD_ID = '{NEW_ID}';", 'build id')
write(core, text)

menus = SRC / 'js/50-ui-menus.js'
text = read(menus)
old_routes = """      routes: [
        { id: 'league', label: 'LEAGUE CENTRE', hint: 'Table, fixtures, results, pulse and objectives', overview: true }
      ]"""
new_routes = """      routes: [
        { id: 'league', label: 'OVERVIEW', hint: 'Table, opposition, pulse and objectives', overview: true },
        { id: 'fixtures', label: 'FIXTURES', hint: 'Full season schedule and results' }
      ]"""
text = replace_one(text, old_routes, new_routes, 'league routes')
text = replace_one(
    text,
    "    league: { title: 'LEAGUE SYSTEM', kicker: 'DIVISION COMPETITION' },",
    "    league: { title: 'LEAGUE SYSTEM', kicker: 'DIVISION COMPETITION' },\n    fixtures: { title: 'LEAGUE FIXTURES', kicker: 'SCHEDULE & RESULTS' },",
    'fixtures metadata'
)
text = replace_one(
    text,
    "      case 'league':\n        menuContentEl.innerHTML = renderLeagueTab();\n        break;",
    "      case 'league':\n        menuContentEl.innerHTML = renderLeagueTab();\n        break;\n      case 'fixtures':\n        menuContentEl.innerHTML = renderLeagueFixturesTab();\n        break;",
    'fixtures route renderer'
)
write(menus, text)

league = SRC / 'js/37-league.js'
text = read(league)
fixture_function_anchor = """  function renderLeagueTab() {
"""
fixtures_route = """  function renderLeagueFixturesTab() {
    const league = ensureLeagueState();
    if (!league) return renderCareerCreationTab();
    const fixture = leagueNextFixture();
    const opponent = leagueClubById(leagueFixtureOpponentId(fixture));
    const userFixtures = (league.fixtures || []).filter(item => item.homeId === LEAGUE_USER_CLUB_ID || item.awayId === LEAGUE_USER_CLUB_ID);
    const played = userFixtures.filter(item => item.played).length;
    const remaining = Math.max(0, userFixtures.length - played);
    const homeCount = userFixtures.filter(item => item.homeId === LEAGUE_USER_CLUB_ID).length;
    const awayCount = Math.max(0, userFixtures.length - homeCount);
    const complete = !fixture;
    const nextTiming = complete
      ? 'SEASON COMPLETE'
      : (typeof clubDaysUntilFixture === 'function' && clubDaysUntilFixture() === 0
        ? 'TODAY'
        : `${typeof clubDaysUntilFixture === 'function' ? clubDaysUntilFixture() : 0}D`);
    return `${renderLeagueIntroduction()}
      <div class="menu-hero career-hero league-hero"><div class="menu-hero-main menu-briefing-panel"><div class="menu-kicker">${escapeCareerHtml(leagueCompetitionName())} · SEASON ${league.season}</div><h2>${complete ? 'FULL SEASON RESULTS' : `MATCHDAY ${fixture.matchday} · ${escapeCareerHtml(opponent?.name || 'TBD')}`}</h2><p>${complete ? 'The full campaign schedule and every recorded result are listed below.' : 'Review the complete home-and-away schedule without crowding the main League Overview.'}</p><div class="menu-pill-row"><span class="menu-pill">${played} PLAYED</span><span class="menu-pill">${remaining} REMAINING</span><span class="menu-pill">${homeCount} HOME</span><span class="menu-pill">${awayCount} AWAY</span></div></div><div class="menu-hero-side"><div class="menu-kicker">${complete ? 'CAMPAIGN STATUS' : 'NEXT FIXTURE'}</div><div class="menu-side-operator">${complete ? 'FT' : escapeCareerHtml(opponent?.short || 'TBD')}</div><p>${complete ? 'FINAL SCHEDULE' : `${escapeCareerHtml(opponent?.name || 'TBD')} · ${nextTiming}`}</p></div></div>
      <section class="league-fixture-panel league-fixtures-route-panel"><div class="career-section-head"><div><span>SEASON CALENDAR</span><strong>YOUR FIXTURES & RESULTS</strong></div><p>All ${userFixtures.length} league matches remain connected to the existing schedule and standings authority.</p></div><div class="league-match-actions"><button type="button" data-team-route="league">BACK TO LEAGUE OVERVIEW</button></div><div class="league-fixture-list">${renderLeagueFixtures()}</div></section>`;
  }

"""
text = replace_one(text, fixture_function_anchor, fixtures_route + fixture_function_anchor, 'fixtures route function')
text = replace_one(
    text,
    '<nav class="league-section-jumps" aria-label="League page sections"><button type="button" data-team-scroll-target="#leagueOverview">OVERVIEW</button><button type="button" data-team-scroll-target="#leagueObjectives">OBJECTIVES</button><button type="button" data-team-scroll-target="#leaguePulse">PULSE</button><button type="button" data-team-scroll-target="#leagueTable">TABLE</button><button type="button" data-team-scroll-target="#leagueFixtures">FIXTURES</button></nav>',
    '<nav class="league-section-jumps" aria-label="League overview sections"><button type="button" data-team-scroll-target="#leagueOverview">OVERVIEW</button><button type="button" data-team-scroll-target="#leagueObjectives">OBJECTIVES</button><button type="button" data-team-scroll-target="#leaguePulse">PULSE</button><button type="button" data-team-scroll-target="#leagueTable">TABLE</button></nav>',
    'overview jump navigation'
)
text = replace_one(
    text,
    '      <div class="league-detail-grid">\n        <section class="league-opponent-panel"',
    '      <section class="league-opponent-panel"',
    'overview detail wrapper start'
)
fixture_panel = '        <section id="leagueFixtures" class="league-fixture-panel"><div class="career-section-head compact"><div><span>SEASON CALENDAR</span><strong>YOUR FIXTURES</strong></div></div><div class="league-fixture-list">${renderLeagueFixtures()}</div></section>\n      </div>'
text = replace_one(text, fixture_panel, '', 'overview fixture panel removal')
write(league, text)

index = SRC / 'index.html'
text = read(index).replace(f'Strikewatch {OLD}: {OLD_NAME}', f'Strikewatch {NEW}: {NEW_NAME}').replace(OLD_ID, NEW_ID)
text = replace_one(text, f'id="managerBuildVersion">{OLD}</b>', f'id="managerBuildVersion">{NEW}</b>', 'desktop build label')
text = replace_one(text, f'id="mobileCommandBuildVersion">{OLD}</b>', f'id="mobileCommandBuildVersion">{NEW}</b>', 'mobile build label')
write(index, text)

note = f"Build {NEW} gives League a dedicated Fixtures submenu on both compact/mobile and desktop. The main League Overview keeps its next-opponent summary, objectives, pulse and table while the full 38-match schedule and results move to one focused route backed by the same league state. See `AUDIT-{NEW}.md`.\n\n"
for path in (SRC / 'HANDOFF.md', SRC / 'AGENTS.md'):
    text = read(path)
    text = replace_one(text, f'Build {OLD} restores', note + f'Build {OLD} restores', path.name)
    if path.name == 'HANDOFF.md':
        text = replace_one(text, f'- Build: **{OLD} — {OLD_NAME}**', f'- Build: **{NEW} — {NEW_NAME}**', 'handoff build')
        text = replace_one(text, f'- Build ID: `{OLD_ID}`', f'- Build ID: `{NEW_ID}`', 'handoff id')
        text = replace_one(text, f'strikewatch-build-{OLD}.html', f'strikewatch-build-{NEW}.html', 'handoff standalone')
    write(path, text)

readme = SRC / 'README.md'
text = read(readme)
text = replace_one(text, f'# Strikewatch Source {OLD}', f'# Strikewatch Source {NEW}', 'readme title')
text = replace_one(text, f'dist/strikewatch-build-{OLD}.html', f'dist/strikewatch-build-{NEW}.html', 'readme standalone')
write(readme, text)

project = SRC / 'PROJECT.md'
text = read(project)
text = replace_one(
    text,
    f'Build {OLD} restores the desktop management interface to a full-width sidebar/content layout while preserving the compact/mobile presentation. See `HANDOFF.md` and `AUDIT-{OLD}.md`.',
    f'Build {NEW} moves the full league fixture calendar into its own responsive submenu while preserving the single league schedule and standings authority. See `HANDOFF.md` and `AUDIT-{NEW}.md`.',
    'project release note'
)
write(project, text)

write(SRC / f'AUDIT-{NEW}.md', f'''# Build {NEW} audit — {NEW_NAME}

## Problem
The League Overview contained the entire 38-match fixture calendar beneath the standings, objectives, League Pulse and opposition brief. This made the main page unnecessarily long on both mobile and desktop.

## Change
- League now exposes two standard routes: Overview and Fixtures.
- Compact/mobile receives both routes through the existing contextual header submenu.
- Desktop receives both routes through the existing section navigation.
- The Overview retains the competition summary, pyramid, board objectives, League Pulse, table and next-opponent controls.
- The full season calendar and recorded results move to `renderLeagueFixturesTab()`.
- The dedicated page summarises played/remaining and home/away counts before the existing fixture list.
- The old in-page Fixtures jump and duplicate fixture panel are removed from Overview.
- `renderLeagueFixtures()` and the existing fixture, result and standings authorities are reused unchanged.
- No CSS or breakpoint rules are changed, so the Build 12.221 desktop restoration and established compact/mobile presentation remain intact.
- Save schema 19 and diagnostics schema 1 are unchanged.

## Verification
The release requires deterministic double builds; parsing of modular, generated and standalone JavaScript; targeted assertions for both League routes and single-source fixture rendering; preservation of the 1024px desktop guard and compact contextual navigation; and byte identity between the standalone and root `cod.html`.
''')

menus_text = read(menus)
league_text = read(league)
if "{ id: 'fixtures', label: 'FIXTURES'" not in menus_text:
    raise SystemExit('fixtures route missing')
if "case 'fixtures':" not in menus_text or 'renderLeagueFixturesTab()' not in menus_text:
    raise SystemExit('fixtures route renderer missing')
if 'function renderLeagueFixturesTab()' not in league_text:
    raise SystemExit('fixtures tab function missing')
fixtures_block = league_text.split('function renderLeagueFixturesTab()', 1)[1].split('function renderLeagueTab()', 1)[0]
overview_block = league_text.split('function renderLeagueTab()', 1)[1].split('function handleLeagueClick', 1)[0]
if '${renderLeagueFixtures()}' not in fixtures_block:
    raise SystemExit('dedicated fixtures page does not use authoritative fixture renderer')
if '${renderLeagueFixtures()}' in overview_block or '#leagueFixtures' in overview_block:
    raise SystemExit('fixtures still render on League Overview')

print(f'Applied Build {NEW}: {NEW_NAME}')
