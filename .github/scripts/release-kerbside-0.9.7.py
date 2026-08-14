#!/usr/bin/env python3
from __future__ import annotations

import base64
import hashlib
import lzma
import re
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ASSET = ROOT / 'kerbside-orr-odm-2024-25.js'
ASSET_SHA256 = '9e7e47ffcf446e6d089d4d2db4a270512ef34af684081718585b3d5f583d4ae8'
ASSET_BYTES = 462_527
SOURCE_SHA256 = '07d41e44884911c48929e844ee51f0c5ef66f861842d36564bb89a3b29bdfd79'
STAGING = sorted((ROOT / '.github' / 'scripts').glob('odm-release-data-*.txt'))


def write(path: str, content: str) -> None:
    (ROOT / path).write_text(content, encoding='utf-8')


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one occurrence, found {count}: {old[:100]!r}')
    write(path, text.replace(old, new, 1))


def replace_regex(path: str, pattern: str, replacement: str) -> None:
    text = read(path)
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{path}: regex replacement matched {count} times')
    write(path, updated)


def bump(path: str) -> None:
    text = read(path)
    if '0.9.6' not in text:
        return
    write(path, text.replace('0.9.6', '0.9.7'))


def verify_asset() -> None:
    if not ASSET.exists():
        # Connector-only publishing cannot directly upload a local binary/text
        # artifact. The branch therefore carries repository-safe text staging:
        # 000-014 are the first 360 kB verbatim; 015+ are an xz+base64 tail.
        raw_parts = [ROOT / '.github' / 'scripts' / f'odm-release-data-{i:03d}.txt' for i in range(15)]
        if not all(path.exists() for path in raw_parts):
            raise SystemExit('ORR ODM asset is absent and raw staging is incomplete')
        tail_parts = [path for path in STAGING if int(path.stem.rsplit('-', 1)[1]) >= 15]
        if not tail_parts:
            raise SystemExit('ORR ODM compressed tail staging is absent')
        prefix = b''.join(path.read_bytes() for path in raw_parts)
        packed = ''.join(path.read_text(encoding='ascii').strip() for path in tail_parts)
        try:
            tail = lzma.decompress(base64.b64decode(packed, validate=True))
        except Exception as error:
            raise SystemExit(f'ORR ODM tail staging is invalid: {error}') from error
        ASSET.write_bytes(prefix + tail)

    payload = ASSET.read_bytes()
    digest = hashlib.sha256(payload).hexdigest()
    if len(payload) != ASSET_BYTES or digest != ASSET_SHA256:
        raise SystemExit(
            f'ORR ODM asset integrity failure: bytes={len(payload)} sha256={digest}; '
            f'expected bytes={ASSET_BYTES} sha256={ASSET_SHA256}'
        )
    text = payload.decode('utf-8')
    required = [
        "authority:'Office of Rail and Road'",
        "period:'2024-25'",
        "licence:'Open Government Licence v3.0'",
        "commercialUse:true",
        "completeMatrix:false",
        "directionality:'bidirectional-station-pair'",
        f"sourceSha256:'{SOURCE_SHA256}'",
        'minimumAnnualJourneys:100',
        'stationTopN:5',
    ]
    for marker in required:
        if marker not in text:
            raise SystemExit(f'ORR ODM asset metadata missing: {marker}')


verify_asset()

# App/release version. Forecast model remains v4; this is the app release.
write('VERSION', '0.9.7\n')
for path in [
    'bus.html',
    'kerbside-journey-planner-ui.js',
    'kerbside-status.js',
    'kerbside-backend/package.json',
    'kerbside-backend/src/worker.js',
    'kerbside-backend/test/worker.test.js',
    'kerbside-backend/tests/browser-regression.mjs',
]:
    bump(path)

# Load the measured station-pair matrix before the calibration module consumes it.
replace_once(
    'bus.html',
    '<script src="kerbside-rail-demand-v4.js?v=0.9.7"></script>\n<script src="kerbside-rail-calibration.js?v=0.9.7"></script>',
    '<script src="kerbside-rail-demand-v4.js?v=0.9.7"></script>\n'
    '<script src="kerbside-orr-odm-2024-25.js?v=0.9.7"></script>\n'
    '<script src="kerbside-rail-calibration.js?v=0.9.7"></script>',
)

# Keep the checked-in builder aligned with the production pruning level.
builder = read('.github/scripts/build-orr-odm.py')
builder = builder.replace('DEFAULT_THRESHOLD=25', 'DEFAULT_THRESHOLD=100')
write('.github/scripts/build-orr-odm.py', builder)

# Full ODM integration. Missing sparse pairs must remain unknown: Number(null)
# is zero in JS and would otherwise turn an omitted low-volume pair into false
# measured evidence.
replace_regex(
    'kerbside-rail-calibration.js',
    r"function odmFlow\(feed,from,to\)\{.*?\n\}\nfunction flowShareToTargets",
    """function odmFlow(feed,from,to){
  if(!feed)return null;
  const a=String(from||'').toUpperCase(),b=String(to||'').toUpperCase();
  if(!a||!b||a===b)return 0;
  let raw;
  try{if(typeof feed.flow==='function')raw=feed.flow(a,b);else{const direct=feed.flows&&feed.flows[`${a}|${b}`],nested=feed.flows&&feed.flows[a]&&feed.flows[a][b];raw=direct!=null?direct:nested;}}catch(error){return null;}
  if(raw==null)return null;
  const value=Number(raw);
  return Number.isFinite(value)&&value>=0?value:null;
}
function flowShareToTargets""",
)

replace_regex(
    'kerbside-rail-calibration.js',
    r"function flowShareToTargets\(from,targets,feed\)\{.*?\n\}\nfunction routeLoadSignal",
    """function flowShareToTargets(from,targets,feed){
  const code=String(from||'').toUpperCase(),row=stationUsageRecord({crs:code}),usage=Number(row&&row.usage)||0;
  if(!row||!targets||!targets.size)return null;
  let feedTotal=NaN;
  if(feed&&typeof feed.stationTotal==='function'){
    try{feedTotal=Number(feed.stationTotal(code));}catch(error){feedTotal=NaN;}
  }
  const denominator=Number.isFinite(feedTotal)&&feedTotal>0?feedTotal:usage;
  if(feed&&denominator>0){
    let journeys=0,known=0;
    targets.forEach(to=>{const value=odmFlow(feed,code,to);if(value!=null){journeys+=value;known++;}});
    if(known||feed.completeMatrix===true)return {share:clamp(journeys/denominator,0,.8),journeys,exact:true,row,known,total:denominator};
  }
  if(usage<=0)return null;
  const main=String(row.mainCrs||'').toUpperCase(),journeys=Number(row.mainJourneys)||0;
  if(main&&targets.has(main)&&journeys>0)return {share:clamp(journeys/usage,0,.8),journeys,exact:false,row,known:1,total:usage};
  return null;
}
function routeLoadSignal""",
)

replace_regex(
    'kerbside-rail-calibration.js',
    r"function routeLoadSignal\(service,station\)\{.*?\n\}\nconst CROWD_RANK",
    """function routeLoadSignal(service,station){
  const current=crsOf(station),before=routeCallCrs(service&&service.previousCallingPoints),after=routeCallCrs(service&&service.subsequentCallingPoints);
  const destination=destinationCrs(service);if(destination&&!after.includes(destination))after.push(destination);
  if(!current||!after.length)return {amount:0,reasons:[],measured:false,source:'none'};
  const downstream=new Set(after.filter(code=>code&&code!==current)),feed=orrOdmDataset(),board=flowShareToTargets(current,downstream,feed);
  let retained=0,alighting=0,retainedStations=0,alightingStations=0,exactEvidence=!!(board&&board.exact);
  before.slice(feed?-24:-10).forEach(code=>{
    const onward=flowShareToTargets(code,downstream,feed);if(onward){retained+=onward.share;if(onward.share>=.015)retainedStations++;exactEvidence=exactEvidence||onward.exact;}
    const here=flowShareToTargets(code,new Set([current]),feed);if(here){alighting+=here.share;if(here.share>=.015)alightingStations++;exactEvidence=exactEvidence||here.exact;}
  });
  const boardShare=Number(board&&board.share)||0,matched=boardShare>0||retained>0||alighting>0;
  if(!matched&&!exactEvidence)return {amount:0,reasons:[],measured:false,source:'none'};
  let amount=0;const reasons=[];
  if(boardShare>0){amount+=clamp(.08+boardShare*1.2,.08,.35);reasons.push(feed?`ORR 2024-25 station-pair demand from this stop matches this train's remaining calling pattern`:`ORR identifies this train direction as this station’s strongest measured origin/destination flow`);}
  if(retained>0){amount+=clamp(retained*.7,.05,.45);reasons.push(feed?`ORR 2024-25 station-pair demand from ${retainedStations||1} earlier call${retainedStations===1?'':'s'} also matches stops beyond here`:`ORR strongest-flow evidence from ${retainedStations||1} earlier call${retainedStations===1?'':'s'} points further along this train`);}
  if(alighting>0){amount-=clamp(alighting*.35,.03,.18);reasons.push(feed?`ORR 2024-25 station-pair demand suggests some route demand finishes at this stop`:`ORR strongest-flow evidence suggests some accumulated demand leaves the train here`);}
  return {amount:clamp(amount,-.2,.7),reasons,measured:true,source:feed?'orr-odm':'orr-main-flow-proxy',boardShare,retainedPressure:retained,alightingPressure:alighting,licence:feed?String(feed.licence||feed.license||''):'Open Government Licence v3.0 station-usage aggregate',coverageJourneyShare:feed?Number(feed.coverageJourneyShare)||null:null,directionality:feed?String(feed.directionality||''):''};
}
const CROWD_RANK""",
)

# Give a real station-pair lookup slightly more evidence than the old strongest-
# destination proxy, without changing the score weight itself or model version.
forecast = read('kerbside-train-forecast-v4.js')
old = "+(routeLoad.measured?.5:0)+(operatorCrowding.measured?1:0)"
new = "+(routeLoad.source==='orr-odm'?1:(routeLoad.measured?.5:0))+(operatorCrowding.measured?1:0)"
if old not in forecast:
    raise SystemExit('forecast evidence expression not found')
write('kerbside-train-forecast-v4.js', forecast.replace(old, new, 1))

# Official-data tests now load the production ODM before calibration.
test_path = 'kerbside-backend/test/train-forecast-v4-official-data.test.mjs'
test = read(test_path)
test = test.replace(
    "const [trainsSource,timebandsSource,demandSource,calibrationSource,forecastSource]=await Promise.all([",
    "const [trainsSource,timebandsSource,demandSource,odmSource,calibrationSource,forecastSource]=await Promise.all([",
    1,
)
test = test.replace(
    "  fs.readFile(path.join(root,'kerbside-rail-demand-v4.js'),'utf8'),\n  fs.readFile(path.join(root,'kerbside-rail-calibration.js'),'utf8'),",
    "  fs.readFile(path.join(root,'kerbside-rail-demand-v4.js'),'utf8'),\n  fs.readFile(path.join(root,'kerbside-orr-odm-2024-25.js'),'utf8'),\n  fs.readFile(path.join(root,'kerbside-rail-calibration.js'),'utf8'),",
    1,
)
test = test.replace(
    "vm.runInContext(trainsSource,context);vm.runInContext(timebandsSource,context);vm.runInContext(demandSource,context);vm.runInContext(calibrationSource,context);vm.runInContext(forecastSource,context);",
    "vm.runInContext(trainsSource,context);vm.runInContext(timebandsSource,context);vm.runInContext(demandSource,context);vm.runInContext(odmSource,context);vm.runInContext(calibrationSource,context);vm.runInContext(forecastSource,context);",
    1,
)
# Preserve the explicit strongest-flow fallback test now that production normally
# has full station-pair evidence loaded.
test = test.replace(
    "  const c=load(),data=c.window.__KERBSIDE_RAIL_DEMAND_V4__,cal=c.window.__KERBSIDE_CALIBRATION__;\n  const pair=Object.entries(data.stations).find(([,row])=>row.mainCrs&&row.mainJourneys>1000);assert.ok(pair);\n  const [from,row]=pair,service={destination:[{crs:row.mainCrs}],subsequentCallingPoints:[{callingPoint:[{crs:row.mainCrs}]}],previousCallingPoints:[]};",
    "  const c=load(),data=c.window.__KERBSIDE_RAIL_DEMAND_V4__,cal=c.window.__KERBSIDE_CALIBRATION__;delete c.window.__KERBSIDE_ORR_ODM__;\n  const pair=Object.entries(data.stations).find(([,row])=>row.mainCrs&&row.mainJourneys>1000);assert.ok(pair);\n  const [from,row]=pair,service={destination:[{crs:row.mainCrs}],subsequentCallingPoints:[{callingPoint:[{crs:row.mainCrs}]}],previousCallingPoints:[]};",
    1,
)
extra = r'''

test('bundled ORR 2024-25 ODM is licensed, symmetric and sparse-safe',()=>{
  const c=load(),feed=c.window.__KERBSIDE_ORR_ODM__;
  assert.equal(feed.authority,'Office of Rail and Road');assert.equal(feed.period,'2024-25');
  assert.equal(feed.licence,'Open Government Licence v3.0');assert.equal(feed.commercialUse,true);assert.equal(feed.completeMatrix,false);
  assert.equal(feed.directionality,'bidirectional-station-pair');assert.equal(feed.sourceSha256,'07d41e44884911c48929e844ee51f0c5ef66f861842d36564bb89a3b29bdfd79');
  assert.ok(feed.coverageJourneyShare>.988,feed.coverageJourneyShare);assert.equal(feed.flow('BHM','BRI'),76929);assert.equal(feed.flow('BRI','BHM'),76929);
  assert.equal(feed.flow('CHL','BHM'),undefined);assert.equal(feed.stationTotal('BHM'),18311855);assert.equal(feed.stationTotal('BRI'),5438712);
});

test('production ODM feeds actual calling-pattern board, retained and alighting pressure',()=>{
  const c=load(),cal=c.window.__KERBSIDE_CALIBRATION__;
  const board=cal.routeLoadSignal({destination:[{crs:'BRI'}],subsequentCallingPoints:[{callingPoint:[{crs:'BRI'}]}],previousCallingPoints:[]},{crs:'BHM'});
  assert.equal(board.source,'orr-odm');assert.equal(board.measured,true);assert.ok(board.boardShare>0,board);assert.ok(board.coverageJourneyShare>.988,board);
  const through=cal.routeLoadSignal({destination:[{crs:'BRI'}],previousCallingPoints:[{callingPoint:[{crs:'EUS'}]}],subsequentCallingPoints:[{callingPoint:[{crs:'BRI'}]}]},{crs:'BHM'});
  assert.equal(through.source,'orr-odm');assert.ok(through.retainedPressure>=0,through);assert.ok(through.alightingPressure>=0,through);
});

test('sparse ODM omissions remain unknown rather than false zero evidence',()=>{
  const c=load(),cal=c.window.__KERBSIDE_CALIBRATION__,feed=c.window.__KERBSIDE_ORR_ODM__;
  assert.equal(feed.flow('CHL','BHM'),undefined);assert.equal(cal.odmFlow(feed,'CHL','BHM'),null);
  const sparse=cal.routeLoadSignal({destination:[{crs:'BHM'}],subsequentCallingPoints:[{callingPoint:[{crs:'BHM'}]}],previousCallingPoints:[]},{crs:'CHL'});
  assert.ok(['none','orr-main-flow-proxy','orr-odm'].includes(sparse.source),sparse);if(sparse.source==='orr-odm')assert.ok(sparse.boardShare>0,sparse);
});
'''
if "bundled ORR 2024-25 ODM is licensed" not in test:
    test += extra
write(test_path, test)

# Builder regression: tiny synthetic symmetric matrix, sparse unknown semantics,
# station totals, and asymmetry rejection.
builder_test = r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
const execFileAsync=promisify(execFile),here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'..','..'),builder=path.join(root,'.github','scripts','build-orr-odm.py');
const header='Financial_Year,origin_tlc,destination_tlc,journeys\n';
async function build(rows,args=[]){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'kerbside-odm-'));const input=path.join(dir,'odm.csv'),output=path.join(dir,'odm.js');await fs.writeFile(input,header+rows);await execFileAsync('python3',[builder,input,output,'--threshold','100','--top-n','1',...args]);const source=await fs.readFile(output,'utf8'),context={window:{},atob};vm.createContext(context);vm.runInContext(source,context);return {dir,feed:context.window.__KERBSIDE_ORR_ODM__,source};}
test('ODM builder canonicalises symmetric pairs and keeps sparse misses unknown',async t=>{const built=await build('20242025,AAA,BBB,250\n20242025,BBB,AAA,250\n20242025,AAA,CCC,5\n20242025,CCC,AAA,5\n');t.after(()=>fs.rm(built.dir,{recursive:true,force:true}));const f=built.feed;assert.equal(f.flow('AAA','BBB'),250);assert.equal(f.flow('BBB','AAA'),250);assert.equal(f.flow('BBB','CCC'),undefined);assert.equal(f.stationTotal('AAA'),255);assert.equal(f.stationTotal('BBB'),250);assert.equal(f.stationTotal('CCC'),5);assert.equal(f.completeMatrix,false);assert.equal(f.directionality,'bidirectional-station-pair');});
test('ODM builder rejects asymmetric reverse rows',async()=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'kerbside-odm-bad-'));try{const input=path.join(dir,'bad.csv'),output=path.join(dir,'bad.js');await fs.writeFile(input,header+'20242025,AAA,BBB,250\n20242025,BBB,AAA,249\n');await assert.rejects(execFileAsync('python3',[builder,input,output]));}finally{await fs.rm(dir,{recursive:true,force:true});}});
'''
write('kerbside-backend/test/orr-odm-builder.test.mjs', builder_test)

# Browser regression should explicitly protect script order as well as the 0.9.7 cache bust.
browser = read('kerbside-backend/tests/browser-regression.mjs')
if 'kerbside-orr-odm-2024-25.js?v=0.9.7' not in browser:
    browser += "\n// 0.9.7: the ODM must execute before calibration consumes window.__KERBSIDE_ORR_ODM__.\n" \
        "assert.ok(html.indexOf('kerbside-orr-odm-2024-25.js?v=0.9.7')>html.indexOf('kerbside-rail-demand-v4.js?v=0.9.7'));\n" \
        "assert.ok(html.indexOf('kerbside-orr-odm-2024-25.js?v=0.9.7')<html.indexOf('kerbside-rail-calibration.js?v=0.9.7'));\n"
write('kerbside-backend/tests/browser-regression.mjs', browser)

# Release-only payload staging never belongs in the resulting commit.
for path in STAGING:
    path.unlink(missing_ok=True)

print('Kerbside 0.9.7 ORR ODM release patch applied')
