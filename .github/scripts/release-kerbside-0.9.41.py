#!/usr/bin/env python3
from pathlib import Path
import subprocess

TARGET_VERSION = "0.9.41"

ui_path = Path("kerbside-journey-planner-ui.js")
ui = ui_path.read_text(encoding="utf-8")

css_anchor = '''body.theme-crystal input[type="date"]::-webkit-calendar-picker-indicator,body.theme-crystal input[type="time"]::-webkit-calendar-picker-indicator{filter:none;opacity:.78}
@media(min-width:821px){'''
css_replacement = '''body.theme-crystal input[type="date"]::-webkit-calendar-picker-indicator,body.theme-crystal input[type="time"]::-webkit-calendar-picker-indicator{filter:none;opacity:.78}
/* Plan my journey owns the train content surface while its tab is active.
   Timetable/live modules are allowed to keep refreshing in the background,
   but they must not be able to unhide the current departure board into the
   planner. This keeps both desktop and stacked mobile views scoped to the
   selected planner route, date and time window. */
.train-sidebar.plan-view-active > :not(#trainViewTabs):not(#planJourneyForm){display:none!important}
.train-content.plan-view-active > :not(#planJourneySurface){display:none!important}
@media(min-width:821px){'''
if ui.count(css_anchor) != 1:
    raise SystemExit(f"{ui_path}: expected one plan visibility CSS anchor, found {ui.count(css_anchor)}")
ui = ui.replace(css_anchor, css_replacement, 1)

scroll_anchor = '''function resetTrainSidebarScroll(){
  const sidebar=document.querySelector('.train-sidebar');
  if(sidebar&&window.innerWidth>820)sidebar.scrollTop=0;
}
function restoreBaseTrainView(){'''
scroll_replacement = '''function resetTrainSidebarScroll(){
  const sidebar=document.querySelector('.train-sidebar');
  if(sidebar&&window.innerWidth>820)sidebar.scrollTop=0;
}
let planViewGuardObserver=null;
let planViewBootstrapObserver=null;
function syncPlanViewGuards(){
  const tabs=document.getElementById('trainViewTabs');
  const planButton=tabs&&tabs.querySelector('[data-train-view="plan"]');
  const active=!!(planButton&&planButton.getAttribute('aria-selected')==='true');
  const sidebar=document.querySelector('.train-sidebar');
  const content=document.querySelector('.train-content');
  if(sidebar)sidebar.classList.toggle('plan-view-active',active);
  if(content)content.classList.toggle('plan-view-active',active);
  return active;
}
function installPlanViewGuardObserver(){
  const tabs=document.getElementById('trainViewTabs');
  if(!tabs)return false;
  if(planViewBootstrapObserver){planViewBootstrapObserver.disconnect();planViewBootstrapObserver=null;}
  if(planViewGuardObserver)planViewGuardObserver.disconnect();
  planViewGuardObserver=new MutationObserver(()=>syncPlanViewGuards());
  planViewGuardObserver.observe(tabs,{subtree:true,attributes:true,attributeFilter:['aria-selected']});
  syncPlanViewGuards();
  return true;
}
function watchPlanViewGuards(){
  if(installPlanViewGuardObserver())return;
  if(planViewBootstrapObserver)return;
  planViewBootstrapObserver=new MutationObserver(()=>{if(installPlanViewGuardObserver())planViewBootstrapObserver=null;});
  planViewBootstrapObserver.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>{
    if(planViewBootstrapObserver){planViewBootstrapObserver.disconnect();planViewBootstrapObserver=null;}
  },15000);
}
function restoreBaseTrainView(){'''
if ui.count(scroll_anchor) != 1:
    raise SystemExit(f"{ui_path}: expected one scroll helper anchor, found {ui.count(scroll_anchor)}")
ui = ui.replace(scroll_anchor, scroll_replacement, 1)

click_anchor = '''    setTimeout(()=>{
      resetTrainSidebarScroll();
      if(view.dataset.trainView==='trains')restoreBaseTrainView();
    },0);
  },true);
  const settle=()=>setTimeout(()=>{resetTrainSidebarScroll();restoreBaseTrainView();},0);'''
click_replacement = '''    setTimeout(()=>{
      resetTrainSidebarScroll();
      if(view.dataset.trainView==='trains')restoreBaseTrainView();
      syncPlanViewGuards();
    },0);
  },true);
  const settle=()=>setTimeout(()=>{resetTrainSidebarScroll();restoreBaseTrainView();watchPlanViewGuards();syncPlanViewGuards();},0);'''
if ui.count(click_anchor) != 1:
    raise SystemExit(f"{ui_path}: expected one train-view click anchor, found {ui.count(click_anchor)}")
ui = ui.replace(click_anchor, click_replacement, 1)

load_anchor = '''  polish.addEventListener('load',()=>{
    setTimeout(()=>{resetTrainSidebarScroll();restoreBaseTrainView();},0);'''
load_replacement = '''  polish.addEventListener('load',()=>{
    setTimeout(()=>{resetTrainSidebarScroll();restoreBaseTrainView();watchPlanViewGuards();syncPlanViewGuards();},0);'''
if ui.count(load_anchor) != 1:
    raise SystemExit(f"{ui_path}: expected one planner load anchor, found {ui.count(load_anchor)}")
ui = ui.replace(load_anchor, load_replacement, 1)
ui_path.write_text(ui, encoding="utf-8")

test_path = Path("kerbside-backend/tests/listing-reliability-regression.mjs")
test = test_path.read_text(encoding="utf-8")
test_anchor = '''  assert.equal(result.averageModel.mode, 'average');
  assert.equal(result.averageModel.dwell, 0);
  assert.deepEqual(pageErrors, []);
'''
test_replacement = '''  assert.equal(result.averageModel.mode, 'average');
  assert.equal(result.averageModel.dwell, 0);

  // A live/timetable refresh can remove the hidden attribute from the normal
  // departure board after Plan my journey has taken over the content surface.
  // The planner guard must keep that current board out of both desktop and
  // stacked mobile layouts so only date/time/station-scoped planner results
  // are visible.
  await page.waitForFunction(() => Boolean(window.__KERBSIDE_JOURNEY_PLANNER__?.planState && document.getElementById('trainViewTabs')), null, { timeout: 20000 });
  await page.evaluate(() => {
    const main = document.getElementById('trainMain');
    if (main) main.setAttribute('aria-hidden', 'false');
    window.__KERBSIDE_JOURNEY_PLANNER__.setPlanView(true);
  });
  await page.waitForFunction(() => document.querySelector('.train-content')?.classList.contains('plan-view-active'));

  const desktopPlanGuard = await page.evaluate(() => {
    const content = document.querySelector('.train-content');
    const sidebar = document.querySelector('.train-sidebar');
    const surface = document.getElementById('planJourneySurface');
    const board = content?.querySelector(':scope > .train-board');
    const basePlanner = document.getElementById('trainPlanner');
    if (board) board.hidden = false;
    if (basePlanner) basePlanner.hidden = false;
    return {
      contentActive: !!content?.classList.contains('plan-view-active'),
      sidebarActive: !!sidebar?.classList.contains('plan-view-active'),
      boardDisplay: board ? getComputedStyle(board).display : '',
      basePlannerDisplay: basePlanner ? getComputedStyle(basePlanner).display : '',
      surfaceDisplay: surface ? getComputedStyle(surface).display : '',
      topGap: content && surface ? Math.abs(surface.getBoundingClientRect().top - content.getBoundingClientRect().top) : 999
    };
  });
  assert.equal(desktopPlanGuard.contentActive, true);
  assert.equal(desktopPlanGuard.sidebarActive, true);
  assert.equal(desktopPlanGuard.boardDisplay, 'none');
  assert.equal(desktopPlanGuard.basePlannerDisplay, 'none');
  assert.notEqual(desktopPlanGuard.surfaceDisplay, 'none');
  assert.ok(desktopPlanGuard.topGap <= 1, `Planner surface should start at the top of desktop content; gap was ${desktopPlanGuard.topGap}px`);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobilePlanGuard = await page.evaluate(() => {
    const content = document.querySelector('.train-content');
    const surface = document.getElementById('planJourneySurface');
    const board = content?.querySelector(':scope > .train-board');
    if (board) board.hidden = false;
    return {
      boardDisplay: board ? getComputedStyle(board).display : '',
      surfaceDisplay: surface ? getComputedStyle(surface).display : ''
    };
  });
  assert.equal(mobilePlanGuard.boardDisplay, 'none');
  assert.notEqual(mobilePlanGuard.surfaceDisplay, 'none');
  await page.evaluate(() => window.__KERBSIDE_JOURNEY_PLANNER__.setPlanView(false));

  assert.deepEqual(pageErrors, []);
'''
if test.count(test_anchor) != 1:
    raise SystemExit(f"{test_path}: expected one planner regression anchor, found {test.count(test_anchor)}")
test_path.write_text(test.replace(test_anchor, test_replacement, 1), encoding="utf-8")

core = Path("kerbside-journey-planner-core.js").read_text(encoding="utf-8")
required = [
    "const candidates=await getter({from:from.crs,to:to.crs,date,departAfter:start,departBefore:end,maxResults:PLAN_MAX_CANDIDATES});",
    "minute!=null&&minute>=startMinute&&minute<=endMinute",
    "planState.filter={date,start,end};",
]
missing = [item for item in required if item not in core]
if missing:
    raise SystemExit(f"Planner date/time/route filtering invariant missing: {missing}")

version_path = Path("VERSION")
current = version_path.read_text(encoding="utf-8").strip()
if current != "0.9.40":
    raise SystemExit(f"Expected VERSION 0.9.40 before release, found {current}")
version_path.write_text(TARGET_VERSION + "\n", encoding="utf-8")
subprocess.run(["python3", ".github/scripts/sync-version.py"], check=True)
subprocess.run(["python3", ".github/scripts/sync-version.py", "--check"], check=True)

css = Path("kerbside-trains.css").read_text(encoding="utf-8")
if ".train-shell{display:grid;grid-template-columns:360px minmax(0,1fr);" not in css:
    raise SystemExit("PR #224 desktop sidebar width is not present in the release branch")
if "@media (max-width:1000px){\n  .train-shell{grid-template-columns:260px minmax(0,1fr)}" not in css:
    raise SystemExit("Compact train sidebar breakpoint changed unexpectedly")
if ".train-content.plan-view-active > :not(#planJourneySurface){display:none!important}" not in ui_path.read_text(encoding="utf-8"):
    raise SystemExit("Planner content visibility guard was not written")

print("Prepared Kerbside 0.9.41: wider desktop sidebar plus planner-only scoped results surface.")
