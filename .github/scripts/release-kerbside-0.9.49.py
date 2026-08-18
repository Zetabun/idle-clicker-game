from pathlib import Path
import re
import subprocess
import sys

NEW = "0.9.49"


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


def sub_once(path, pattern, replacement, label, flags=0):
    text = read(path)
    next_text, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one regex match in {path}, found {count}")
    write(path, next_text)


write("VERSION", NEW + "\n")
subprocess.run([sys.executable, ".github/scripts/sync-version.py"], check=True)

replace_once(
    "kerbside-train-timetable.js",
    "    const saveFollow=closest?closest('[data-save-follow-journey]'):null;\n    if(saveFollow&&board.contains(saveFollow)){event.preventDefault();event.stopPropagation();saveAndFollowJourneyByKey(saveFollow.getAttribute('data-save-follow-journey'));return;}",
    "    const saveFollow=closest?closest('[data-save-follow-journey]'):null;\n    if(saveFollow&&board.contains(saveFollow)){\n      event.preventDefault();event.stopPropagation();\n      if(saveFollow.disabled)return;\n      const previousLabel=saveFollow.textContent||'Save & follow';\n      saveFollow.disabled=true;saveFollow.textContent='Saving…';saveFollow.setAttribute('aria-busy','true');\n      Promise.resolve(saveAndFollowJourneyByKey(saveFollow.getAttribute('data-save-follow-journey'))).then(ok=>{\n        if(ok)return;\n        if(saveFollow.isConnected){saveFollow.disabled=false;saveFollow.textContent=previousLabel;saveFollow.removeAttribute('aria-busy');saveFollow.setAttribute('data-save-error','true');}\n      }).catch(()=>{if(saveFollow.isConnected){saveFollow.disabled=false;saveFollow.textContent=previousLabel;saveFollow.removeAttribute('aria-busy');saveFollow.setAttribute('data-save-error','true');}});\n      return;\n    }",
    "desktop save/follow click feedback",
)

sub_once(
    "kerbside-train-timetable.js",
    r"function saveAndFollowJourneyByKey\(key\)\{[\s\S]*?\n\}\n\nfunction durationLabel",
    """async function saveAndFollowJourneyByKey(key){
  const index=state.services.findIndex((service,i)=>serviceKey(service,i)===String(key||''));if(index<0)return false;
  const service=state.services[index],plan=window.__KERBSIDE_JOURNEY_PLANNER__,r=route();if(!plan||typeof plan.planSaveBoardService!=='function')return false;
  const saved=plan.planSaveBoardService(service,{date:r.date,from:r.from,to:r.to});if(!saved)return false;
  const today=!!(dateApi()&&typeof dateApi().isToday==='function'&&dateApi().isToday());
  if(today&&!watchMatches(service))persistJourneyWatch(journeyWatchPayload(service));
  let followed=!today;
  const savedApi=window.__KERBSIDE_SAVED_JOURNEYS_V2__;
  if(today&&savedApi&&typeof savedApi.followSavedJourney==='function'){
    try{followed=(await savedApi.followSavedJourney(saved.id))!==false;}catch(error){followed=false;}
  }
  if(today&&!followed){
    const activeApi=window.__KERBSIDE_ACTIVE_JOURNEY__;
    if(activeApi&&typeof activeApi.startByKey==='function')followed=!!activeApi.startByKey(key);
  }
  renderRows(state.services,{mode:state.mode,manifest:state.manifest});
  const verified=typeof plan.planBoardServiceSaved==='function'?plan.planBoardServiceSaved(service,{date:r.date,from:r.from,to:r.to}):saved;
  return !!verified&&(!today||followed||watchMatches(service));
}

function durationLabel""",
    "async save/follow implementation",
)

sub_once(
    "kerbside-train-timetable.js",
    r"function actionMarkup\(key,isActive\)\{[\s\S]*?\n\}\nasync function refresh\(\)",
    """function actionMarkup(key,isActive){return `<button type=\"button\" class=\"primary\" ${isActive?'data-active-stop':'data-active-start'}${isActive?'':`=\"${esc(key)}\"`}>${isActive?'End active journey':\"I'm taking this\"}</button>`;}
function injectActions(){
  const api=window.__KERBSIDE_TRAIN_TIMETABLE__,board=$('trainScheduledBoard');if(!api||!board)return false;const canStart=api.state.mode==='today'&&isTodayRoute();
  board.querySelectorAll('.train-scheduled-service').forEach((article,index)=>{
    const key=article.getAttribute('data-service-id')||'',service=(api.state.services||[]).find((row,i)=>String(api.serviceKey(row,i))===key)||(api.state.services||[])[index],watch=article.querySelector('.train-watch-card'),actions=watch&&watch.querySelector('.train-watch-actions');
    let slot=article.querySelector('.train-active-inline-action');
    if(!canStart||!watch||!actions){if(slot)slot.remove();return;}
    const active=!!(state.active&&service&&serviceIdentityMatches(state.active,service));
    if(!slot){slot=document.createElement('span');slot.className='train-active-inline-action';actions.appendChild(slot);}
    const signature=`${key}|${active?'1':'0'}`;if(slot.dataset.signature!==signature){slot.dataset.signature=signature;slot.innerHTML=actionMarkup(key,active);}
  });
  return true;
}
async function refresh()""",
    "inline active journey control",
)

replace_once(
    "kerbside-train-timetable.js",
    ".train-active-actions button,.train-active-action-card button{min-height:38px;padding:8px 12px;border:1px solid var(--rule);border-radius:9px;background:var(--ink-3);font-size:10.5px;font-weight:800}",
    ".train-active-actions button,.train-active-inline-action button{min-height:38px;padding:8px 12px;border:1px solid var(--rule);border-radius:9px;background:var(--ink-3);font-size:10.5px;font-weight:800}",
    "inline active button base style",
)
replace_once(
    "kerbside-train-timetable.js",
    ".train-active-actions button:hover,.train-active-action-card button:hover{border-color:var(--led);color:var(--led)}.train-active-actions .primary,.train-active-action-card .primary{border-color:var(--live);background:rgb(var(--live-rgb) / .10);color:var(--live)}",
    ".train-active-actions button:hover,.train-active-inline-action button:hover{border-color:var(--led);color:var(--led)}.train-active-actions .primary,.train-active-inline-action .primary{border-color:var(--live);background:rgb(var(--live-rgb) / .10);color:var(--live)}.train-active-inline-action{display:contents}",
    "inline active button interactive style",
)
replace_once(
    "kerbside-train-timetable.js",
    "@media(max-width:820px){.train-active-journey{margin:8px 9px 6px;padding:12px}.train-active-head h3{font-size:15px}.train-active-step{grid-template-columns:54px minmax(0,1fr)}.train-active-step small{grid-column:2;text-align:left}.train-active-action-card{align-items:flex-start;flex-direction:column}.train-active-action-card button{width:100%}}",
    "@media(max-width:820px){.train-active-journey{margin:8px 9px 6px;padding:12px}.train-active-head h3{font-size:15px}.train-active-step{grid-template-columns:54px minmax(0,1fr)}.train-active-step small{grid-column:2;text-align:left}.train-watch-actions{flex-wrap:wrap}.train-active-inline-action button{width:100%}}",
    "mobile inline active action layout",
)

replace_once(
    "kerbside-backend/test/train-journey-ux.test.mjs",
    "  assert.match(timetable,/followSavedJourney\\(saved\\.id\\)/);\n});",
    "  assert.match(timetable,/await savedApi\\.followSavedJourney\\(saved\\.id\\)/);\n  assert.match(timetable,/Saving…/);\n  assert.match(timetable,/train-active-inline-action/);\n  assert.match(timetable,/actions\\.appendChild\\(slot\\)/);\n});",
    "journey UX save/follow static regression",
)

replace_once(
    "kerbside-backend/tests/train-active-journey-regression.mjs",
    "  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});",
    "  const page=await browser.newPage({viewport:{width:1440,height:900},isMobile:false,hasTouch:false});",
    "active journey desktop viewport",
)
replace_once(
    "kerbside-backend/tests/train-active-journey-regression.mjs",
    "  await page.waitForFunction(()=>document.querySelector('#trainScheduledBoard [data-service-id=\"ACTIVE-1\"] .train-active-action-card'),null,{timeout:10000});",
    "  await page.waitForFunction(()=>document.querySelector('#trainScheduledBoard [data-service-id=\"ACTIVE-1\"] .train-watch-card [data-active-start]'),null,{timeout:10000});\n  assert.equal(await page.locator('#trainScheduledBoard [data-service-id=\"ACTIVE-1\"] .train-active-action-card').count(),0,'Active Journey should not render as a separate card');",
    "active journey inline browser wait",
)
replace_once(
    "kerbside-backend/tests/train-active-journey-regression.mjs",
    "    watchHidden:[...document.querySelectorAll('#trainScheduledBoard .train-watch-card')].every(node=>node.hidden),",
    "    watchVisible:[...document.querySelectorAll('#trainScheduledBoard .train-watch-card')].every(node=>!node.hidden),",
    "active journey saved card visibility metric",
)
replace_once(
    "kerbside-backend/tests/train-active-journey-regression.mjs",
    "  assert.equal(activeState.watchHidden,true,'separate Journey Watch controls should hide while an active journey owns the watch slot');\n  assert.ok(activeState.panelBox.width<=390,'Active Journey panel overflows the mobile viewport');",
    "  assert.equal(activeState.watchVisible,true,'Saved Journey controls should remain visible while the journey is active');\n  assert.ok(activeState.panelBox.width<=1440,'Active Journey panel overflows the desktop viewport');",
    "active journey desktop assertions",
)

print(f"Prepared Kerbside {NEW} desktop save/follow and Saved Journey active-action patch.")
