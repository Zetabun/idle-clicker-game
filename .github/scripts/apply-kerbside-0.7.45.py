#!/usr/bin/env python3
from pathlib import Path


def replace_once(path, old, new):
    p=Path(path)
    text=p.read_text(encoding='utf-8')
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{path}: expected exactly one match, found {count}: {old[:120]!r}')
    p.write_text(text.replace(old,new,1),encoding='utf-8')

# Future service rows: show the selected travel date directly under the
# timetabled status. Today stays unchanged. The row already represents the
# selected origin call date, including overnight services, because the provider
# only accepts calls whose actualCallDate(row, originCall) matches the query.
timetable='kerbside-train-timetable.js'
replace_once(
    timetable,
    "function modeLabel(mode){if(mode!=='today')return'Advance timetable';return liveOverlayEligible()?'Live-adjusted':'Same-day timetable';}",
    "function modeLabel(mode){if(mode!=='today')return'Advance timetable';return liveOverlayEligible()?'Live-adjusted':'Same-day timetable';}\nfunction serviceDateLabel(mode,date=state.sourceDate||route().date){return mode==='advance'&&date?dateLabel(date,{short:true}).replace(/,/g,''):'';}"
)
replace_once(
    timetable,
    "  const formation=Number(service.length)||0;\n  const rightLabel=formation?`${formation} coach${formation===1?'':'es'}`:(duration||'—');",
    "  const formation=Number(service.length)||0;\n  const serviceDate=serviceDateLabel(mode);\n  const rightLabel=formation?`${formation} coach${formation===1?'':'es'}`:(duration||'—');"
)
replace_once(
    timetable,
    "        <span class=\"train-time\"><b>${esc(service.std||'—')}</b><small class=\"train-status train-status-${esc(status.cls)}\">${esc(status.label)}</small></span>",
    "        <span class=\"train-time\"><b>${esc(service.std||'—')}</b><small class=\"train-status train-status-${esc(status.cls)}\">${esc(status.label)}</small>${serviceDate?`<small class=\"train-service-date\">${esc(serviceDate)}</small>`:''}</span>"
)
replace_once(
    timetable,
    "window.__KERBSIDE_TRAIN_TIMETABLE__={state,load,loadSameDay,sync,renderServices,renderUnavailable,setHeader,refreshForecasts,refreshEdgeManifest,toggleService,serviceKey,journeyMode,mergeOverlay,statusFor,requestOverlay,coverageIncludesTime,provider:timetableProvider};",
    "window.__KERBSIDE_TRAIN_TIMETABLE__={state,load,loadSameDay,sync,renderServices,renderUnavailable,setHeader,refreshForecasts,refreshEdgeManifest,toggleService,serviceKey,journeyMode,mergeOverlay,statusFor,serviceDateLabel,requestOverlay,coverageIncludesTime,provider:timetableProvider};"
)

css='kerbside-trains.css'
replace_once(
    css,
    ".train-scheduled-service .train-time small{\n  font-family:'Martian Mono',ui-monospace,monospace;\n  font-size:8.5px;letter-spacing:.06em;text-transform:uppercase;\n}",
    ".train-scheduled-service .train-time small{\n  font-family:'Martian Mono',ui-monospace,monospace;\n  font-size:8.5px;letter-spacing:.06em;text-transform:uppercase;\n}\n.train-scheduled-service .train-service-date{\n  margin-top:3px;color:var(--text-mute);font-size:8px;letter-spacing:.035em;text-transform:none;white-space:nowrap;\n}"
)

bus=Path('bus.html')
text=bus.read_text(encoding='utf-8')
if "const APP_VERSION = '0.7.44';" not in text:
    raise SystemExit('bus.html: expected APP_VERSION 0.7.44')
if '?v=0.7.44' not in text:
    raise SystemExit('bus.html: expected 0.7.44 cache busters')
text=text.replace("const APP_VERSION = '0.7.44';","const APP_VERSION = '0.7.45';",1)
text=text.replace('?v=0.7.44','?v=0.7.45')
bus.write_text(text,encoding='utf-8')
Path('VERSION').write_text('0.7.45\n',encoding='utf-8')
replace_once('kerbside-status.js',"const VERSION='0.7.44';","const VERSION='0.7.45';")

test_path=Path('kerbside-backend/test/train-timetable-provider.test.js')
test_text=test_path.read_text(encoding='utf-8')
addition="""

test('future timetable rows expose their selected travel date while same-day rows do not',()=>{
  const {api}=loadPriorityRuntime({today:false,liveMode:'planning',departAfter:'09:00'});
  const future=api.serviceDateLabel('advance','2026-08-13');
  assert.match(future,/13 Aug/);
  assert.match(future,/Thu/);
  assert.equal(api.serviceDateLabel('today','2026-08-13'),'');
});
"""
if "future timetable rows expose their selected travel date" not in test_text:
    test_path.write_text(test_text+addition,encoding='utf-8')

print('Applied Kerbside 0.7.45 future train row date labels.')
