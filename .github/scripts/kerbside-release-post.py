from pathlib import Path


def read(path):
    return Path(path).read_text(encoding="utf-8")


def write(path, text):
    Path(path).write_text(text, encoding="utf-8")


def replace_once(path, old, new, label):
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match in {path}, found {count}")
    write(path, text.replace(old, new, 1))


# The timetable snapshot is the route spine. Darwin's previous/subsequent lists
# are live evidence and can be partial, so retain the scheduled full route and
# let the movement layer merge both sources rather than replacing one with the
# other.
replace_once(
    "kerbside-train-timetable.js",
    "function applyEvidence(target,evidence){\n  target.etd=evidence.etd;if(evidence.platform)target.platform=evidence.platform;target.isCancelled=evidence.isCancelled;target.length=evidence.length;target.formation=evidence&&evidence.service&&evidence.service.formation||null;",
    "function applyEvidence(target,evidence){\n  if(!target.scheduledPreviousCallingPoints&&target.previousCallingPoints)target.scheduledPreviousCallingPoints=target.previousCallingPoints;\n  if(!target.scheduledSubsequentCallingPoints&&target.subsequentCallingPoints)target.scheduledSubsequentCallingPoints=target.subsequentCallingPoints;\n  target.etd=evidence.etd;if(evidence.platform)target.platform=evidence.platform;target.isCancelled=evidence.isCancelled;target.length=evidence.length;target.formation=evidence&&evidence.service&&evidence.service.formation||null;",
    "preserve scheduled route before live evidence",
)

# Flatten both the preserved timetable route and the live Darwin route. The
# existing de-duplication and chronological sort then produce one complete
# timeline with the best live state layered over the static route.
replace_once(
    "kerbside-train-movement.js",
    "  add(detailData&&detailData.previousCallingPoints,'passed');add(leg&&leg.previousCallingPoints,'passed');add(leg&&leg.callingPoints);add(detailData&&detailData.subsequentCallingPoints);add(leg&&leg.subsequentCallingPoints);",
    "  add(leg&&leg.scheduledPreviousCallingPoints,'passed');add(detailData&&detailData.previousCallingPoints,'passed');add(leg&&leg.previousCallingPoints,'passed');add(leg&&leg.callingPoints);add(leg&&leg.scheduledSubsequentCallingPoints);add(detailData&&detailData.subsequentCallingPoints);add(leg&&leg.subsequentCallingPoints);",
    "merge preserved scheduled route into movement timeline",
)

# Initial opening still centres the live marker, but once the passenger moves
# the inner timeline themselves, refreshes must not snap it back every 15 s.
replace_once(
    "kerbside-train-movement.js",
    "function focusTimelineCurrent(calling){\n  if(!calling)return;const current=calling.querySelector('[data-train-progress-marker],.progress-current');if(!current)return;const signature=`${calling.dataset.trainProgressSignature||''}|${text(current.textContent)}`;if(calling.dataset.trainProgressFocus===signature)return;calling.dataset.trainProgressFocus=signature;\n  const apply=()=>{if(!calling.isConnected||calling.scrollHeight<=calling.clientHeight+4)return;const target=Math.max(0,current.offsetTop-Math.round(calling.clientHeight*.42));calling.scrollTop=target;};\n  if(typeof requestAnimationFrame==='function')requestAnimationFrame(apply);else setTimeout(apply,0);\n}",
    "function bindTimelineManualScroll(calling){\n  if(!calling||calling.dataset.trainProgressScrollBound)return;calling.dataset.trainProgressScrollBound='1';\n  const manual=()=>{calling.dataset.trainProgressManualScroll='1';};\n  calling.addEventListener('touchstart',manual,{passive:true});calling.addEventListener('pointerdown',manual,{passive:true});calling.addEventListener('wheel',manual,{passive:true});\n}\nfunction focusTimelineCurrent(calling){\n  if(!calling)return;bindTimelineManualScroll(calling);if(calling.dataset.trainProgressManualScroll==='1')return;const current=calling.querySelector('[data-train-progress-marker],.progress-current');if(!current)return;const signature=`${calling.dataset.trainProgressSignature||''}|${text(current.textContent)}`;if(calling.dataset.trainProgressFocus===signature)return;calling.dataset.trainProgressFocus=signature;\n  const apply=()=>{if(!calling.isConnected||calling.dataset.trainProgressManualScroll==='1'||calling.scrollHeight<=calling.clientHeight+4)return;const target=Math.max(0,current.offsetTop-Math.round(calling.clientHeight*.42));calling.scrollTop=target;};\n  if(typeof requestAnimationFrame==='function')requestAnimationFrame(apply);else setTimeout(apply,0);\n}",
    "respect manual movement timeline scrolling",
)

# Extend the existing movement browser regression with the exact failure mode:
# scheduled full-route points survive partial live evidence, and a touch/drag
# marks the timeline as user-controlled so subsequent focusing is a no-op.
replace_once(
    "kerbside-backend/tests/train-movement-browser-regression.mjs",
    "    const scheduled={...service,uid:'C21373',trainId:'5F25',serviceID:'20260816C21373',from:{crs:'BHM',name:'Birmingham New Street'},to:{crs:'BRI',name:'Bristol Temple Meads'},previousCallingPoints:[{callingPoint:[{locationName:'Wolverhampton',crs:'WVH',st:'19:55',at:'19:56',isCancelled:false}]}],subsequentCallingPoints:[{callingPoint:[{locationName:'University',crs:'UNI',st:'20:20',et:'20:22',isCancelled:false},{locationName:'Cheltenham Spa',crs:'CNM',st:'21:00',et:'21:02',isCancelled:false},{locationName:'Bristol Temple Meads',crs:'BRI',st:'21:33',et:'21:35',isCancelled:false}]}]};",
    "    const scheduled={...service,uid:'C21373',trainId:'5F25',serviceID:'20260816C21373',from:{crs:'BHM',name:'Birmingham New Street'},to:{crs:'BRI',name:'Bristol Temple Meads'},previousCallingPoints:[{callingPoint:[{locationName:'Lichfield Trent Valley',crs:'LTV',st:'19:20',isCancelled:false},{locationName:'Sutton Coldfield',crs:'SUT',st:'19:42',isCancelled:false},{locationName:'Wylde Green',crs:'WYL',st:'19:47',isCancelled:false},{locationName:'Wolverhampton',crs:'WVH',st:'19:55',at:'19:56',isCancelled:false}]}],subsequentCallingPoints:[{callingPoint:[{locationName:'University',crs:'UNI',st:'20:20',et:'20:22',isCancelled:false},{locationName:'Cheltenham Spa',crs:'CNM',st:'21:00',et:'21:02',isCancelled:false},{locationName:'Bristol Temple Meads',crs:'BRI',st:'21:33',et:'21:35',isCancelled:false}]}]};",
    "movement fixture includes earlier scheduled stops",
)
replace_once(
    "kerbside-backend/tests/train-movement-browser-regression.mjs",
    "  assert.match(result.scheduledTimeline,/Five Ways/i);\n  assert.match(result.scheduledTimeline,/University/i);",
    "  assert.match(result.scheduledTimeline,/Five Ways/i);\n  assert.match(result.scheduledTimeline,/University/i);",
    "keep existing scheduled timeline assertions stable",
)
replace_once(
    "kerbside-backend/tests/train-movement-browser-regression.mjs",
    "  assert.ok(timelineScroll.names.indexOf('Wolverhampton')>=0&&timelineScroll.names.indexOf('Wolverhampton')<timelineScroll.names.findIndex(name=>/Between Birmingham New Street and University/i.test(name)),`previous calling points should remain above the current train marker: ${JSON.stringify(timelineScroll.names)}`);",
    "  assert.ok(timelineScroll.names.indexOf('Wolverhampton')>=0&&timelineScroll.names.indexOf('Wolverhampton')<timelineScroll.names.findIndex(name=>/Between Birmingham New Street and University/i.test(name)),`previous calling points should remain above the current train marker: ${JSON.stringify(timelineScroll.names)}`);\n  const manualScroll=await page.locator('#trainBoard .train-calling').evaluate(node=>{node.scrollTop=Math.max(0,node.scrollTop-80);node.dispatchEvent(new Event('touchstart',{bubbles:true}));const before=node.scrollTop;window.__KERBSIDE_TRAIN_MOVEMENT__.decorate();return {before,after:node.scrollTop,manual:node.dataset.trainProgressManualScroll};});\n  assert.equal(manualScroll.manual,'1','touching the live timeline should opt out of automatic re-centring');\n  assert.equal(manualScroll.after,manualScroll.before,'live refresh decoration must preserve a passenger-selected timeline scroll position');",
    "manual timeline scroll survives live decoration",
)

# Static source checks make the route-preservation contract obvious even before
# the browser suite runs.
path = Path("kerbside-backend/test/train-journey-ux.test.mjs")
text = path.read_text(encoding="utf-8")
needle = "test('forecast baseline is nested under methodology and timetabled label is small',()=>{"
if needle not in text:
    raise SystemExit("journey UX regression insertion point missing")
addition = """test('live calling evidence preserves the scheduled full route and manual scroll',()=>{\n  assert.match(timetable,/scheduledPreviousCallingPoints/);\n  assert.match(timetable,/scheduledSubsequentCallingPoints/);\n});\n\n"""
path.write_text(text.replace(needle, addition + needle, 1), encoding="utf-8")

print("Prepared Kerbside 0.9.48 previous-stop timeline regression patch.")
