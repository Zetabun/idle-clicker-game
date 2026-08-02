from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    return text.replace(old, new, 1)


bus_path = 'bus.html'
bus = read(bus_path)
bus = replace_once(bus, "const APP_VERSION = '0.6.41';", "const APP_VERSION = '0.6.42';", 'browser version')
bus = replace_once(
    bus,
    "Version 0.6.41 also supplements incomplete national stop-tile responses with OpenStreetMap, avoids week-long caching of partial results and uses a finer location key so nearby searches do not incorrectly share stop lists.",
    "Version 0.6.42 also treats ordinary OpenStreetMap stop refs as local labels rather than global identities, preventing unrelated stops that both use labels such as A from being merged.",
    'coverage release note'
)
old_identity = """function discoveredStopCodes(stop){
  return new Set([stop&&stop.timetableId,stop&&stop.atco,stop&&stop.naptan,stop&&stop.code]
    .map(value=>String(value||'').trim().toLowerCase()).filter(Boolean));
}
function sameDiscoveredStop(a,b){
  const codesA=discoveredStopCodes(a), codesB=discoveredStopCodes(b);
  if([...codesA].some(code=>codesB.has(code))) return true;
  if(!a||!b||!isFinite(a.lat)||!isFinite(a.lon)||!isFinite(b.lat)||!isFinite(b.lon)) return false;
  const indA=normName(a.ind||''), indB=normName(b.ind||'');
  if(indA&&indB&&indA!==indB) return false;
  return dist(a.lat,a.lon,b.lat,b.lon)<=12 && nameSimilarity(a.name||'',b.name||'')>=.6;
}
"""
new_identity = """function discoveredStopCodes(stop){
  const values=[stop&&stop.timetableId,stop&&stop.atco,stop&&stop.naptan];
  // OSM `ref` is frequently only a local stand label such as A or B. It is
  // not safe as a cross-source identity unless the stop is official or the
  // value itself has the structure of an ATCO identifier.
  if(stop&&(stop.source==='official'||looksLikeAtco(stop.code))) values.push(stop.code);
  return new Set(values.map(value=>String(value||'').trim().toLowerCase()).filter(Boolean));
}
function sameDiscoveredStop(a,b){
  const idA=String(a&&a.id||''), idB=String(b&&b.id||'');
  if(idA&&idA===idB) return true;
  const codesA=discoveredStopCodes(a), codesB=discoveredStopCodes(b);
  if([...codesA].some(code=>codesB.has(code))) return true;
  if(!a||!b||!isFinite(a.lat)||!isFinite(a.lon)||!isFinite(b.lat)||!isFinite(b.lon)) return false;
  const indA=normName(a.ind||''), indB=normName(b.ind||'');
  if(indA&&indB&&indA!==indB) return false;
  return dist(a.lat,a.lon,b.lat,b.lon)<=12 && nameSimilarity(a.name||'',b.name||'')>=.6;
}
"""
bus = replace_once(bus, old_identity, new_identity, 'trusted stop identities')
write(bus_path, bus)

package_path = 'kerbside-backend/package.json'
write(package_path, replace_once(read(package_path), '"version": "0.6.41"', '"version": "0.6.42"', 'package version'))
worker_path = 'kerbside-backend/src/worker.js'
write(worker_path, replace_once(read(worker_path), "version: '0.6.41'", "version: '0.6.42'", 'Worker health version'))
worker_test_path = 'kerbside-backend/test/worker.test.js'
write(worker_test_path, replace_once(read(worker_test_path), "assert.equal(body.version, '0.6.41');", "assert.equal(body.version, '0.6.42');", 'Worker test version'))

browser_test_path = 'kerbside-backend/tests/browser-regression.mjs'
browser_test = read(browser_test_path)
browser_test = replace_once(browser_test, "assert.match(busSource, /const APP_VERSION = '0\\.6\\.41'/);", "assert.match(busSource, /const APP_VERSION = '0\\.6\\.42'/);", 'browser static version')
browser_test = replace_once(
    browser_test,
    "assert.doesNotMatch(busSource, /kerbside\\.stops\\.v5/);",
    "assert.doesNotMatch(busSource, /kerbside\\.stops\\.v5/);\nassert.match(busSource, /stop\\.source===\'official\'\\|\\|looksLikeAtco\\(stop\\.code\\)/);\nassert.match(busSource, /if\\(idA&&idA===idB\\) return true/);\nassert.doesNotMatch(busSource, /stop&&stop\\.code\\]\\n    \\.map/);",
    'stop identity static checks'
)
browser_test = replace_once(browser_test, "version: '0.6.41'", "version: '0.6.42'", 'browser mocked Worker version')
browser_test = replace_once(browser_test, "includes('app 0.6.41')", "includes('app 0.6.42')", 'browser settings version')
old_fixture = """    const otherSide={id:123457,name:'High Street',ind:'Stop B',lat:52.50018,lon:-2.1};
    const merged=api.mergeDiscoveredStops([official],[duplicate,otherSide],52.5,-2.1);
    return {
"""
new_fixture = """    const otherSide={id:123457,name:'High Street',ind:'Stop B',lat:52.50018,lon:-2.1};
    const localRefA={id:2001,name:'Market Street',code:'A',lat:52.5,lon:-2.1};
    const localRefElsewhere={id:2002,name:'Market Street',code:'A',lat:52.503,lon:-2.1};
    const closeDuplicate={id:2003,name:'Market Street',code:'A',lat:52.50004,lon:-2.10001};
    const sameIdElsewhere={id:2001,name:'Renamed Market Street',code:'B',lat:52.51,lon:-2.1};
    const merged=api.mergeDiscoveredStops([official],[duplicate,otherSide],52.5,-2.1);
    return {
"""
browser_test = replace_once(browser_test, old_fixture, new_fixture, 'stop identity fixture setup')
browser_test = replace_once(
    browser_test,
    "      otherSideSame:api.sameDiscoveredStop(official,otherSide),\n      count:merged.length,",
    "      otherSideSame:api.sameDiscoveredStop(official,otherSide),\n      repeatedLocalRefSame:api.sameDiscoveredStop(localRefA,localRefElsewhere),\n      closeLocalDuplicate:api.sameDiscoveredStop(localRefA,closeDuplicate),\n      stableIdSame:api.sameDiscoveredStop(localRefA,sameIdElsewhere),\n      count:merged.length,",
    'stop identity fixture results'
)
browser_test = replace_once(
    browser_test,
    "    cacheA:undefined,cacheB:undefined,sameCode:true,otherSideSame:false,count:2,\n    ids:['123457','490G00012345'],officialSource:'official',officialIndicator:'Stop A'",
    "    cacheA:undefined,cacheB:undefined,sameCode:true,otherSideSame:false,\n    repeatedLocalRefSame:false,closeLocalDuplicate:true,stableIdSame:true,count:2,\n    ids:['123457','490G00012345'],officialSource:'official',officialIndicator:'Stop A'",
    'stop identity fixture assertions'
)
write(browser_test_path, browser_test)

readme_path = 'kerbside-backend/README.md'
readme = read(readme_path)
readme_note = "Kerbside 0.6.42 tightens stop identity merging. Official timetable IDs, ATCO codes and NaPTAN/SMS codes remain authoritative across national and OpenStreetMap sources. A generic OSM `ref`, however, is treated only as a local stand label and no longer merges geographically separate stops that both happen to use values such as `A`. Exact source IDs still match, while close same-name coordinates can merge genuine duplicates. WebKit verifies official-code matching, repeated local refs, close duplicates, stable IDs and opposite-side stops.\n\n"
readme = replace_once(readme, 'The Worker remains backwards-compatible for live data:\n', readme_note + 'The Worker remains backwards-compatible for live data:\n', 'README release note')
write(readme_path, readme)

print('Prepared Kerbside 0.6.42 stop identity release')
