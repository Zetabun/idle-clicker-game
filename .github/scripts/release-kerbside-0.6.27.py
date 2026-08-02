from pathlib import Path


def replace_once(path, old, new):
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one occurrence, found {count}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_once('bus.html', "const APP_VERSION = '0.6.26';", "const APP_VERSION = '0.6.27';")
replace_once('kerbside-backend/package.json', '"version": "0.6.26"', '"version": "0.6.27"')
replace_once('kerbside-backend/src/worker.js', "version: '0.6.26',", "version: '0.6.27',")
replace_once('kerbside-backend/test/worker.test.js', "assert.equal(body.version, '0.6.26');", "assert.equal(body.version, '0.6.27');")

replace_once('bus.html', "if(!active.length) return 'operator GPS unavailable';", "if(!active.length) return 'no fresh GPS found nearby';")
replace_once('bus.html', "if(!sameLine.length) return 'no GPS matched';", "if(!sameLine.length) return 'no fresh GPS for this route';")
replace_once('bus.html', "if(!sameBranch.length) return 'GPS branch uncertain';", "if(!sameBranch.length) return 'destination match uncertain';")
replace_once('bus.html', "if(liveTrip.items.length) return 'GPS received · filtered';", "if(liveTrip.items.length) return 'possible GPS match was filtered';")
replace_once('bus.html', "return 'journey uncertain';", "return 'no unique journey match';")
replace_once('bus.html', "const reason=r.liveReason||'no live match';", "const reason=r.liveReason||'no fresh GPS match';")

replace_once(
    'bus.html',
    "Version 0.6.26 also keeps a fired leave alert through a brief two-minute missing-GPS gap, preventing the same bus from generating duplicate notifications when it disappears for one poll and returns.",
    "Version 0.6.27 also makes timetable-only explanations evidence-based: the board now reports whether fresh GPS, route, destination or a unique journey match was missing without claiming the operator has no GPS service."
)

readme_marker = "Kerbside 0.6.26 adds a leave-alert disappearance grace period. Once an alert has fired for a particular vehicle or journey, a missing live row is retained for up to two minutes rather than resetting immediately. The alert still resets for a genuinely different vehicle or after the grace period, preventing duplicate notifications caused by one missed GPS poll.\n"
readme_addition = readme_marker + "\nKerbside 0.6.27 makes schedule-only explanations evidence-based. The app now distinguishes no fresh GPS in the fetched area, no fresh GPS for the route, an uncertain destination, a filtered possible match, an ambiguous alias and no unique journey match. It no longer infers that an operator's GPS service is unavailable from an empty or filtered local snapshot.\n"
replace_once('kerbside-backend/README.md', readme_marker, readme_addition)

replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.26'/);",
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.27'/);"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.match(busSource, /operator GPS unavailable/);",
    """assert.doesNotMatch(busSource, /operator GPS unavailable/);
assert.doesNotMatch(busSource, /GPS received · filtered/);
assert.match(busSource, /no fresh GPS found nearby/);
assert.match(busSource, /no fresh GPS for this route/);
assert.match(busSource, /destination match uncertain/);
assert.match(busSource, /possible GPS match was filtered/);
assert.match(busSource, /no unique journey match/);"""
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.6.26'));",
    "await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.6.27'));"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.26', bods: true })",
    "body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.27', bods: true })"
)

print('Prepared Kerbside 0.6.27 evidence-based schedule wording.')
