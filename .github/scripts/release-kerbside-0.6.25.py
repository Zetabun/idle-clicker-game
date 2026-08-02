from pathlib import Path


def replace_once(path, old, new):
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one occurrence, found {count}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_once('bus.html', "const APP_VERSION = '0.6.24';", "const APP_VERSION = '0.6.25';")
replace_once('kerbside-backend/package.json', '"version": "0.6.24"', '"version": "0.6.25"')
replace_once('kerbside-backend/src/worker.js', "version: '0.6.24',", "version: '0.6.25',")
replace_once('kerbside-backend/test/worker.test.js', "assert.equal(body.version, '0.6.24');", "assert.equal(body.version, '0.6.25');")

replace_once(
    'bus.html',
    "const ABBREV = {rd:'Road',st:'Street',sq:'Square',ave:'Avenue',av:'Avenue',ln:'Lane',",
    "const ABBREV = {rd:'Road',sq:'Square',ave:'Avenue',av:'Avenue',ln:'Lane',"
)
replace_once(
    'bus.html',
    """    const bare = w.replace(/[^A-Za-z]/g,'').toLowerCase();
    if(ABBREV[bare] && bare.length>=2) return ABBREV[bare];
""",
    """    const bare = w.replace(/[^A-Za-z]/g,'').toLowerCase();
    // `St` is ambiguous: it can mean Saint or Street. Keeping the readable
    // abbreviation avoids corrupting place names such as St Helens and
    // Bury St Edmunds while still displaying street names clearly.
    if(bare==='st') return 'St';
    if(ABBREV[bare] && bare.length>=2) return ABBREV[bare];
"""
)
replace_once(
    'bus.html',
    """  }).join(' ');
}
/* \"002\" and \"0002\" are the same bus as \"2\" */
""",
    """  }).join(' ');
}
if(typeof window!=='undefined'&&(location.hostname==='127.0.0.1'||location.hostname==='localhost')){
  window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),cleanName};
}
/* \"002\" and \"0002\" are the same bus as \"2\" */
"""
)

replace_once(
    'bus.html',
    "Version 0.6.24 also isolates locally learned speed and route-detour data by operator, route reference and displayed line, so unrelated services sharing a number cannot influence one another's ETA fallback.",
    "Version 0.6.25 also preserves ambiguous `St` place-name abbreviations instead of expanding them blindly to `Street`, preventing destinations such as St Helens and Bury St Edmunds from being corrupted."
)

readme_marker = "Kerbside 0.6.24 isolates local ETA learning by service identity. Learned detour factors and speeds now use a composite operator, route-reference and displayed-line key instead of the line number alone. The unsafe version-1 cache is discarded rather than migrated, preventing a route `9` in one city or operator from affecting another route `9` elsewhere.\n"
readme_addition = readme_marker + "\nKerbside 0.6.25 corrects ambiguous `St` name cleanup. The app no longer expands every standalone `St` token to `Street`; it keeps the readable abbreviation instead, preserving place names such as St Helens and Bury St Edmunds while still normalising unambiguous road suffixes.\n"
replace_once('kerbside-backend/README.md', readme_marker, readme_addition)

replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.24'/);",
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.25'/);"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.doesNotMatch(busSource, /LINES\\[v\\.line\\]/);",
    """assert.doesNotMatch(busSource, /LINES\\[v\\.line\\]/);
assert.doesNotMatch(busSource, /st:'Street'/);
assert.match(busSource, /if\\(bare==='st'\\) return 'St'/);"""
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    """  assert.equal(new Set(learningKeys).size, 3);

  await page.locator('#setBtn').click();
""",
    """  assert.equal(new Set(learningKeys).size, 3);
  const cleanedNames = await page.evaluate(() => {
    const clean=window.__KERBSIDE_TEST__.cleanName;
    return [clean('ST HELENS'), clean('BURY ST EDMUNDS'), clean('HIGH ST')];
  });
  assert.deepEqual(cleanedNames, ['St Helens', 'Bury St Edmunds', 'High St']);

  await page.locator('#setBtn').click();
"""
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.6.24'));",
    "await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.6.25'));"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.24', bods: true })",
    "body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.25', bods: true })"
)

print('Prepared Kerbside 0.6.25 place-name cleanup.')
