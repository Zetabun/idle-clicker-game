from pathlib import Path

path = Path("kerbside-journey-planner-core.js")
text = path.read_text(encoding="utf-8")
marker = "function planSavedLocatorForCandidate(row,preserve=null){"
if text.count(marker) != 1:
    raise SystemExit(f"expected one planner locator marker, found {text.count(marker)}")
if "function planMatchSavedJourney(locator,candidates,{allowClosest=true}={}){" in text:
    raise SystemExit("planner helpers already present; narrow the release patch instead of duplicating them")

helpers = """function planSyncSavedWorkspace({savedId='',refresh=false}={}){
  const workspace=window.__KERBSIDE_SAVED_JOURNEYS_V2__;if(!workspace||typeof workspace.syncSaved!=='function')return null;
  const rows=workspace.syncSaved({sourceHint:planState.source||''});
  if(refresh&&savedId&&typeof workspace.refreshSavedJourney==='function')Promise.resolve(workspace.refreshSavedJourney(savedId,{force:true,reason:'planner-save'})).catch(()=>{});
  return rows;
}
function planCandidateKey(row){if(!row)return'';if(row.journeyType==='connection'){const first=row.legs&&row.legs[0],onward=row.legs&&row.legs[1],change=String(row.interchange&&row.interchange.crs||'').toUpperCase();return `connection:${planSavedSelectorKey(planSavedSelector(first))}:${change}:${planSavedSelectorKey(planSavedSelector(onward))}`;}return `direct:${planSavedSelectorKey(planSavedSelector(row))}:${String(row.std||row.departure||'')}`;}
function planSelectorMatchStrength(saved,current){const wanted=normaliseSavedSelector(saved),candidate=normaliseSavedSelector(current);if(wanted.serviceID&&candidate.serviceID&&wanted.serviceID===candidate.serviceID)return 0;if(wanted.uid&&candidate.uid&&wanted.uid===candidate.uid)return 1;if(wanted.trainId&&candidate.trainId&&wanted.trainId===candidate.trainId)return 2;return null;}
function planSavedRouteMatches(saved){return !!(saved&&planState.from&&planState.to&&String(saved.date||'')===planDateValue()&&saved.from.crs===planState.from.crs&&saved.to.crs===planState.to.crs);}
function planMatchSavedJourney(locator,candidates,{allowClosest=true}={}){
  const saved=normaliseSavedJourney(locator);if(!saved)return null;const list=Array.isArray(candidates)?candidates:[],strong=[];
  for(const candidate of list){if(!candidate)continue;const type=candidate.journeyType==='connection'?'connection':'direct';if(type!==saved.journeyType)continue;let strength=null;
    if(type==='connection'){
      const change=String(candidate.interchange&&candidate.interchange.crs||'').toUpperCase();if(saved.change&&change!==saved.change)continue;
      const top=planSelectorMatchStrength(saved.service,planSavedSelector(candidate)),first=planSelectorMatchStrength(saved.first,planSavedSelector(candidate.legs&&candidate.legs[0])),onward=planSelectorMatchStrength(saved.onward,planSavedSelector(candidate.legs&&candidate.legs[1]));
      if(top===0)strength=0;else if(first!=null&&onward!=null)strength=1+first+onward;
    }else strength=planSelectorMatchStrength(saved.service,planSavedSelector(candidate));
    if(strength!=null){const dep=Math.abs((Number(candidate.departureMinute)||0)-(planTimeMinutes(saved.scheduledDeparture)||0));strong.push({candidate,strength,dep});}
  }
  if(strong.length){strong.sort((a,b)=>a.strength-b.strength||a.dep-b.dep);const best=strong[0];return {candidate:best.candidate,confidence:best.strength===0?'exact':'identity',departureShift:best.dep};}
  if(!allowClosest)return null;
  const wantedDeparture=planTimeMinutes(saved.scheduledDeparture),wantedArrival=planTimeMinutes(saved.scheduledArrival);if(wantedDeparture==null)return null;let best=null;
  for(const candidate of list){if(!candidate)continue;const type=candidate.journeyType==='connection'?'connection':'direct';if(type!==saved.journeyType)continue;if(type==='connection'&&saved.change&&String(candidate.interchange&&candidate.interchange.crs||'').toUpperCase()!==saved.change)continue;const dep=Math.abs((Number(candidate.departureMinute)||0)-wantedDeparture),arrival=Number(candidate.arrivalMinute),arr=wantedArrival==null||!Number.isFinite(arrival)?0:Math.abs(arrival-wantedArrival);if(dep>30||arr>90)continue;const score=dep*3+arr;if(!best||score<best.score)best={candidate,score,dep};}
  return best?{candidate:best.candidate,confidence:'closest',departureShift:best.dep}:null;
}
"""

text = text.replace(marker, helpers + marker, 1)
for required in [
    "function planSyncSavedWorkspace(",
    "function planCandidateKey(",
    "function planSelectorMatchStrength(",
    "function planSavedRouteMatches(",
    "function planMatchSavedJourney(",
]:
    if text.count(required) != 1:
        raise SystemExit(f"planner helper restoration failed for {required}: {text.count(required)}")
path.write_text(text, encoding="utf-8")

forecast_test = Path("kerbside-backend/tests/train-forecast-v3-dual-timetable.mjs")
forecast_text = forecast_test.read_text(encoding="utf-8")
old = "  const overlayServices=[{length:8},{length:8},{length:8}];"
new = "  const overlayServices=[service({length:8}),service({length:8}),service({length:8})];"
if forecast_text.count(old) != 1:
    raise SystemExit(f"expected one legacy formation fixture, found {forecast_text.count(old)}")
forecast_text = forecast_text.replace(old, new, 1)
forecast_test.write_text(forecast_text, encoding="utf-8")

print("Restored planner helpers and aligned the formation enrichment regression with comparable peers.")
