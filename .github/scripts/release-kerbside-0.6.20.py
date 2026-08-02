from pathlib import Path


def replace_once(path, old, new):
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one occurrence, found {count}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_once('bus.html', "const APP_VERSION = '0.6.19';", "const APP_VERSION = '0.6.20';")
replace_once('kerbside-backend/package.json', '"version": "0.6.19"', '"version": "0.6.20"')
replace_once("kerbside-backend/src/worker.js", "version: '0.6.19',", "version: '0.6.20',")
replace_once("kerbside-backend/test/worker.test.js", "assert.equal(body.version, '0.6.19');", "assert.equal(body.version, '0.6.20');")

replace_once(
    'bus.html',
    "  if(!wide) return [boxAround(c,S.radius+MAX_VEH_DIST)];",
    "  // Stop discovery radius affects only which stops are offered. Routine\n  // live polling remains a fixed 9 km area around the selected stop.\n  if(!wide) return [boxAround(c,MAX_VEH_DIST)];"
)

replace_once(
    'bus.html',
    "Version 0.6.19 also requires fuzzy live and timetable trip references to resolve to one uniquely strongest journey before they receive exact-journey matching privileges.",
    "Version 0.6.20 also keeps routine live GPS polling fixed to 9 km around the selected stop, so widening the stop-search radius no longer downloads a much larger BODS feed every fifteen seconds."
)

readme_marker = "Kerbside 0.6.19 makes compatible journey-reference matching uniqueness-safe. Literal, compact, prefix/suffix and shared-token matches are ranked; only one uniquely strongest timetable trip may receive exact-journey privileges, distant-bus admission or exact pattern geometry. Ambiguous aliases fall back to route-level evidence, are excluded from timetable ETA blending, and are reported explicitly. The WebKit regression suite now executes the matching helpers with exact, compact, unique-alias and ambiguous fixtures instead of checking source strings alone.\n"
readme_addition = readme_marker + "\nKerbside 0.6.20 separates stop discovery from live-feed coverage. The selectable 800 m to 6 km radius controls which nearby stops are loaded, but routine BODS polling is now always the existing 9 km vehicle area around the selected stop. The deliberate 18 km exact-journey scan remains periodic. This prevents a 6 km stop-search setting from expanding every normal live request to roughly 15 km and reduces XML size, mobile parsing work and upstream traffic.\n"
replace_once('kerbside-backend/README.md', readme_marker, readme_addition)

replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.19'/);",
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.20'/);"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.match(busSource, /function bboxes\\(wide\\)/);",
    """assert.match(busSource, /function bboxes\\(wide\\)/);
assert.match(busSource, /if\\(!wide\\) return \\[boxAround\\(c,MAX_VEH_DIST\\)\\]/);
assert.doesNotMatch(busSource, /S\\.radius\\+MAX_VEH_DIST/);"""
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.6.19'));",
    "await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.6.20'));"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.19', bods: true })",
    "body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.20', bods: true })"
)

print('Prepared Kerbside 0.6.20 live request scope fix.')
