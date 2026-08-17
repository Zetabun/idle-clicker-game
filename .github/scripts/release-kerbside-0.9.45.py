#!/usr/bin/env python3
from pathlib import Path
import re
import subprocess

VERSION = '0.9.45'
CORE = Path('kerbside-journey-planner-core.js')
TEST = Path('kerbside-backend/tests/train-journey-planner-regression.mjs')


def replace_once(path, old, new, label):
    text = path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one {label}, found {count}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


def replace_regex(path, pattern, replacement, label):
    text = path.read_text(encoding='utf-8')
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{path}: expected one {label}, found {count}')
    path.write_text(updated, encoding='utf-8')


# ---------------------------------------------------------------------------
# Re-skin the separate Plan my journey form with the same card/route language
# as the main Trains view. The route gets the same hollow/filled markers,
# connector and swap affordance; date/time and preferences become grouped
# cards instead of one long stack of unrelated controls.
# ---------------------------------------------------------------------------
replace_once(
    CORE,
    ".plan-saved-actions button:first-child{color:var(--led)}\n@media(max-width:820px){",
    ".plan-saved-actions button:first-child{color:var(--led)}\n\n/* Plan my journey uses the same visual grammar as the main Trains controls. */\n.plan-journey-form>.plan-ui-card{display:grid;gap:11px;margin:0;padding:14px;border-radius:var(--radius-lg,16px);box-shadow:0 6px 18px rgb(var(--shadow-rgb) / .10)}\n.plan-journey-form>.plan-ui-card .train-card-title{margin:0 0 2px;font-size:14px}\n.plan-route-card .train-where-grid{grid-template-columns:24px minmax(0,1fr) auto}\n.plan-route-card .plan-route-field{min-width:0;margin:0}\n.plan-route-card .plan-route-field>span{position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap}\n.plan-route-card .plan-route-field input{width:100%;padding:13px 12px;border:1px solid var(--rule);border-radius:12px;background:var(--ink-2);color:var(--text);font-size:16px;font-weight:700;line-height:1.25}\n.plan-route-card .plan-route-field input::placeholder{color:var(--text-faint);font-weight:500}\n.plan-route-card .plan-route-field input:focus{border-color:var(--led);outline:2px solid rgb(var(--led-rgb) / .18);outline-offset:1px}\n.plan-route-card .train-suggest{top:calc(100% + 6px);z-index:1800}\n.plan-journey-swap{border:0!important}\n.plan-when-card .plan-field input,.plan-options-card .plan-field select{padding:12px;border-radius:12px;background:var(--ink-2)}\n.plan-when-card .plan-time-grid,.plan-options-card .plan-constraint-grid{gap:9px}\n.plan-options-card .plan-preference-note,.plan-options-card .plan-constraint-note{margin:0 1px;color:var(--text-mute);font-size:10.5px;line-height:1.5}\n.plan-options-card .plan-constraint-note{padding-top:1px}\n.plan-journey-form>.plan-search{margin-top:1px;min-height:50px;border-radius:14px;font-size:15px}\n@media(min-width:821px){.plan-journey-form>.plan-ui-card{padding:16px}.plan-route-card .plan-route-field input{padding:14px 13px}.plan-journey-form>.plan-search{min-height:52px}}\n@media(max-width:820px){",
    'planner card skin insertion',
)
replace_once(
    CORE,
    "@media(max-width:820px){.train-view-tabs{margin:0 0 8px}.plan-journey-form{gap:9px}.plan-journey-form h2{display:block!important;font-size:18px}.plan-journey-form>p{font-size:11px}.plan-journey-surface{flex:0 0 auto}",
    "@media(max-width:820px){.train-view-tabs{margin:0 0 8px}.plan-journey-form{gap:9px}.plan-journey-form h2{display:block!important;font-size:18px}.plan-journey-form>p{font-size:11px}.plan-journey-form>.plan-ui-card{padding:11px;border-radius:15px;box-shadow:none}.plan-route-card .train-where-grid{grid-template-columns:22px minmax(0,1fr) auto}.plan-route-card .plan-route-field input{padding:12px 11px}.plan-journey-surface{flex:0 0 auto}",
    'planner mobile card skin',
)

form_pattern = r'''form\.innerHTML=`<div class="train-kicker">Journey planner</div>.*?<details id="planSavedPanel" class="plan-saved-panel"><summary>Saved journeys <span id="planSavedCount">0</span></summary><div id="planSavedJourneys" class="plan-saved-list"></div></details>`;'''
form_markup = r'''form.innerHTML=`<div class="train-kicker">Journey planner</div><h2>Plan my journey</h2><p>Compare trains in a time window and rank them by what matters to you.</p>
    <section class="train-card plan-ui-card plan-route-card" aria-labelledby="planJourneyWhereTitle"><h3 id="planJourneyWhereTitle" class="train-card-title">Where</h3><div class="train-where-grid">
      <span class="train-where-marker from" aria-hidden="true"></span><label class="plan-field plan-route-field"><span>From</span><input id="planJourneyFrom" type="text" autocomplete="off" spellcheck="false" aria-autocomplete="list" aria-controls="planJourneyFromSuggest" placeholder="Birmingham New Street"><div id="planJourneyFromSuggest" class="train-suggest" role="listbox" hidden></div></label><span aria-hidden="true"></span>
      <span class="train-where-link" aria-hidden="true"></span><span class="train-where-gap" aria-hidden="true"></span><span aria-hidden="true"></span>
      <span class="train-where-marker to" aria-hidden="true"></span><label class="plan-field plan-route-field"><span>To</span><input id="planJourneyTo" type="text" autocomplete="off" spellcheck="false" aria-autocomplete="list" aria-controls="planJourneyToSuggest" placeholder="Bristol Temple Meads"><div id="planJourneyToSuggest" class="train-suggest" role="listbox" hidden></div></label><button id="planJourneySwap" class="train-where-swap plan-journey-swap" type="button" aria-label="Swap origin and destination" title="Swap origin and destination">${SWAP_ICON}</button>
    </div></section>
    <section class="train-card plan-ui-card plan-when-card" aria-labelledby="planJourneyWhenTitle"><h3 id="planJourneyWhenTitle" class="train-card-title">When</h3><label class="plan-field"><span>Date</span><input id="planJourneyDate" type="date" value="${esc(selectedDate)}"></label><div class="plan-time-grid"><label class="plan-field"><span>From time</span><input id="planJourneyStart" type="time" step="60" value="${esc(windowValue.start)}"></label><label class="plan-field"><span>Until</span><input id="planJourneyEnd" type="time" step="60" value="${esc(windowValue.end)}"></label></div></section>
    <section class="train-card plan-ui-card plan-options-card" aria-labelledby="planJourneyOptionsTitle"><h3 id="planJourneyOptionsTitle" class="train-card-title">Journey options</h3><label class="plan-field"><span>Preference</span><select id="planJourneyPreference">${Object.entries(PLAN_PREFERENCES).map(([value,item])=>`<option value="${value}"${value===planState.preference?' selected':''}>${item.label}</option>`).join('')}</select></label>
      <div class="plan-constraint-grid"><label class="plan-field"><span>Changes</span><select id="planJourneyMaxChanges"><option value="1"${planState.constraints.maxChanges===1?' selected':''}>Up to 1 change</option><option value="0"${planState.constraints.maxChanges===0?' selected':''}>Direct only</option></select></label><label class="plan-field"><span>Connection buffer</span><select id="planJourneyConnectionBuffer"><option value="0"${planState.constraints.connectionBuffer===0?' selected':''}>Base minimum</option><option value="5"${planState.constraints.connectionBuffer===5?' selected':''}>+5 minutes</option><option value="10"${planState.constraints.connectionBuffer===10?' selected':''}>+10 minutes</option><option value="15"${planState.constraints.connectionBuffer===15?' selected':''}>+15 minutes</option></select></label></div>
      <p class="plan-constraint-note">The connection buffer is added on top of the minimum already used by Kerbside. That is a licensed station rule where available, otherwise Kerbside's conservative planning buffer; the extra buffer never shortens it.</p><p class="plan-preference-note">Your preference and journey constraints are saved on this device. All options still use the same official timetable and Forecast v4 evidence.</p>
    </section>
    <button id="planJourneySearch" class="plan-search" type="button">Compare journeys</button><div id="planJourneyMessage" class="plan-message" aria-live="polite"></div><details id="planSavedPanel" class="plan-saved-panel"><summary>Saved journeys <span id="planSavedCount">0</span></summary><div id="planSavedJourneys" class="plan-saved-list"></div></details>`;'''
replace_regex(CORE, form_pattern, lambda _match: form_markup, 'Plan my journey form markup')

replace_once(
    CORE,
    "function planDefaultWindow(){const start=$('trainDepartAfter')?.value||storedTime()||'09:00',minute=planTimeMinutes(start);return {start,end:planClock(Math.min(1439,(minute==null?540:minute)+120))};}",
    """function swapPlanJourneyStations(){
  const fromInput=$('planJourneyFrom'),toInput=$('planJourneyTo');if(!fromInput||!toInput)return false;
  const fromState=planState.from?planStation(planState.from):null,toState=planState.to?planStation(planState.to):null,fromValue=fromInput.value,toValue=toInput.value;
  planState.from=toState;planState.to=fromState;fromInput.value=toState?toState.name:toValue;toInput.value=fromState?fromState.name:fromValue;
  for(const kind of ['from','to']){const box=planSuggestionBox(kind);if(box){box.hidden=true;box.innerHTML='';}}
  planState.draftTouched=true;planSetMessage('');return true;
}
function planDefaultWindow(){const start=$('trainDepartAfter')?.value||storedTime()||'09:00',minute=planTimeMinutes(start);return {start,end:planClock(Math.min(1439,(minute==null?540:minute)+120))};}""",
    'planner route swap function',
)
replace_once(
    CORE,
    "bindPlanAutocomplete('from');bindPlanAutocomplete('to');['planJourneyFrom','planJourneyTo','planJourneyDate','planJourneyStart','planJourneyEnd','planJourneyPreference','planJourneyMaxChanges','planJourneyConnectionBuffer'].forEach",
    "bindPlanAutocomplete('from');bindPlanAutocomplete('to');$('planJourneySwap')?.addEventListener('click',swapPlanJourneyStations);['planJourneyFrom','planJourneyTo','planJourneyDate','planJourneyStart','planJourneyEnd','planJourneyPreference','planJourneyMaxChanges','planJourneyConnectionBuffer'].forEach",
    'planner swap binding',
)

# ---------------------------------------------------------------------------
# Browser regression: prove the separate planner has the same route-card
# anatomy on desktop and that the new swap affordance swaps resolved stations
# without losing them.
# ---------------------------------------------------------------------------
replace_once(
    TEST,
    "  assert.match(await page.locator('#planJourneyFrom').inputValue(),/Birmingham New Street/);\n  assert.match(await page.locator('#planJourneyTo').inputValue(),/Bristol Temple Meads/);",
    """  assert.match(await page.locator('#planJourneyFrom').inputValue(),/Birmingham New Street/);
  assert.match(await page.locator('#planJourneyTo').inputValue(),/Bristol Temple Meads/);
  await page.setViewportSize({width:1280,height:900});
  const planChrome=await page.locator('#planJourneyForm').evaluate(form=>{const card=form.querySelector('.plan-route-card'),swap=form.querySelector('#planJourneySwap'),box=card?.getBoundingClientRect(),swapBox=swap?.getBoundingClientRect();return {cards:form.querySelectorAll(':scope > .plan-ui-card').length,markers:card?.querySelectorAll('.train-where-marker').length||0,connector:!!card?.querySelector('.train-where-link'),swap:!!swap,cardWidth:box?.width||0,swapWidth:swapBox?.width||0};});
  assert.equal(planChrome.cards,3,'Plan my journey should group route, timing and options into train-style cards');
  assert.equal(planChrome.markers,2,'Plan my journey route card should use the same origin/destination markers as Trains');
  assert.equal(planChrome.connector,true,'Plan my journey route card should keep the visual route connector');
  assert.equal(planChrome.swap,true,'Plan my journey should expose the same route swap affordance as Trains');
  assert.ok(planChrome.cardWidth>300&&planChrome.swapWidth>=36,`desktop planner chrome should remain comfortably sized: ${JSON.stringify(planChrome)}`);
  await page.click('#planJourneySwap');
  assert.match(await page.locator('#planJourneyFrom').inputValue(),/Bristol Temple Meads/);
  assert.match(await page.locator('#planJourneyTo').inputValue(),/Birmingham New Street/);
  await page.click('#planJourneySwap');
  assert.match(await page.locator('#planJourneyFrom').inputValue(),/Birmingham New Street/);
  assert.match(await page.locator('#planJourneyTo').inputValue(),/Bristol Temple Meads/);
  await page.setViewportSize({width:390,height:844});""",
    'planner train-style card regression',
)

# Version the release through the repository's single version source.
Path('VERSION').write_text(VERSION + '\n', encoding='utf-8')
subprocess.run(['python3', '.github/scripts/sync-version.py'], check=True)

# Fast static sanity checks before the release workflow installs browsers.
core = CORE.read_text(encoding='utf-8')
for needle in (
    'plan-route-card', 'planJourneySwap', 'swapPlanJourneyStations',
    'plan-when-card', 'plan-options-card', 'Swap origin and destination'
):
    if needle not in core:
        raise SystemExit(f'missing planner UI marker: {needle}')
print('Kerbside 0.9.45 Plan my journey UI release patch applied.')
