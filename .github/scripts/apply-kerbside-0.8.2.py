#!/usr/bin/env python3
from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


def replace_once(path, old, new):
    text=read(path); count=text.count(old)
    if count!=1:
        raise SystemExit(f'{path}: expected exactly one match, found {count}: {old[:140]!r}')
    write(path,text.replace(old,new,1))


def sub_once(path, pattern, repl, flags=0):
    text=read(path); out,count=re.subn(pattern,repl,text,count=1,flags=flags)
    if count!=1:
        raise SystemExit(f'{path}: regex expected exactly one match, found {count}: {pattern[:140]!r}')
    write(path,out)


def replace_span(path,start,end,new,include_end=False):
    text=read(path); a=text.find(start)
    if a<0: raise SystemExit(f'{path}: start marker missing: {start!r}')
    b=text.find(end,a)
    if b<0: raise SystemExit(f'{path}: end marker missing: {end!r}')
    if include_end: b+=len(end)
    write(path,text[:a]+new+text[b:])


# ---------------------------------------------------------------------------
# Version/cache wiring. sync-version.py handles the app/backend copies later.
if read('VERSION').strip()!='0.8.1':
    raise SystemExit(f"Expected VERSION 0.8.1, found {read('VERSION').strip()!r}")
write('VERSION','0.8.2\n')
replace_once('kerbside-status.js',"const VERSION='0.8.1';","const VERSION='0.8.2';")
bus=read('bus.html')
if '?v=0.8.1' not in bus: raise SystemExit('bus.html: expected 0.8.1 cache busters')
write('bus.html',bus.replace('?v=0.8.1','?v=0.8.2'))


# ---------------------------------------------------------------------------
# Live overlay: keep destination-filtered origin evidence, and add a separate
# index for onward trains from each interchange. These boards are not merged
# into the origin index, so an onward service can never accidentally match a
# direct/origin row simply because it has a similar time/headcode.
overlay='kerbside-train-live-overlay.js'
replace_once(
    overlay,
    "const state={crs:'',date:'',services:[],messages:[],index:null,updatedAt:0,status:'idle',error:'',seq:0,timer:null,includeConnections:false,connectionTargets:[]};",
    "const state={crs:'',date:'',services:[],messages:[],index:null,onwardIndexes:new Map(),updatedAt:0,status:'idle',error:'',seq:0,timer:null,includeConnections:false,connectionTargets:[],onwardTargets:[]};"
)

match_block=r'''function matchEntryIn(row,index){
  if(!index||!row)return null;
  const rid=text(row.serviceID||row.serviceId||row.rid);
  if(rid&&index.byRid.has(rid))return {entry:index.byRid.get(rid),via:'rid'};
  const uid=upper(row.uid);
  if(uid&&index.byUid.has(uid))return {entry:index.byUid.get(uid),via:'uid'};
  const head=upper(row.trainId||row.trainid),std=timeOf(row.std);
  if(head&&std&&index.byHead.has(`${head}|${std}`))return {entry:index.byHead.get(`${head}|${std}`),via:'headcode'};
  if(std){
    const key=`${std}|${upper(row.operatorCode)}|${destinationCrsOf(row)}`;
    if(index.byTime.has(key))return {entry:index.byTime.get(key),via:'time'};
  }
  return null;
}
function matchEntry(row){return matchEntryIn(row,state.index);}

function evidenceFromMatch(match){
  if(!match)return null;
  const service=match.entry.service;
  const previous=flattenCallingPoints(service.previousCallingPoints);
  const ahead=flattenCallingPoints(service.subsequentCallingPoints);
  return {
    via:match.via,index:match.entry.index,
    etd:text(service.etd)||'On time',eta:text(service.eta),platform:text(service.platform),
    isCancelled:!!service.isCancelled,cancelReason:text(service.cancelReason),delayReason:text(service.delayReason),length:Number(service.length)||0,
    operator:text(service.operator),serviceID:text(service.serviceID),serviceIdUrlSafe:text(service.serviceIdUrlSafe),serviceIdGuid:ridOf(service),
    previousCallingPoints:previous.length?service.previousCallingPoints:null,subsequentCallingPoints:ahead.length?service.subsequentCallingPoints:null,
    service
  };
}
/* Origin-board evidence for direct services and the first leg. */
function evidenceFor(row){return evidenceFromMatch(matchEntry(row));}
/* Interchange-board evidence for the onward leg and recovery candidates. */
function evidenceForOnward(row,fromCrs,toCrs){
  const key=`${upper(fromCrs)}|${upper(toCrs)}`,index=state.onwardIndexes.get(key);
  return evidenceFromMatch(matchEntryIn(row,index));
}

'''
replace_span(overlay,'function matchEntry(row){','/* Services Darwin knows about',match_block+'/* Services Darwin knows about')

refresh_block=r'''function normaliseOnwardTargets(values){
  const out=[],seen=new Set();
  for(const item of Array.isArray(values)?values:[]){
    const from=upper(item&&item.from),to=upper(item&&item.to);if(!/^[A-Z0-9]{3}$/.test(from)||!/^[A-Z0-9]{3}$/.test(to)||from===to)continue;
    const key=`${from}|${to}`;if(seen.has(key))continue;seen.add(key);out.push({from,to});if(out.length>=4)break;
  }
  return out;
}
async function refresh({crs,date,force=false,connectionTargets=state.connectionTargets,onwardTargets=state.onwardTargets}={}){
  const code=upper(crs);
  if(!code||!isToday(date)){clear();return false;}
  const targets=[...new Set((Array.isArray(connectionTargets)?connectionTargets:[]).map(value=>upper(value)).filter(value=>/^[A-Z0-9]{3}$/.test(value)&&value!==code))].slice(0,4);
  const onward=normaliseOnwardTargets(onwardTargets),targetKey=targets.join(','),onwardKey=onward.map(item=>`${item.from}>${item.to}`).join(',');
  const wantsConnections=targets.length>0||onward.length>0;
  const fresh=state.crs===code&&state.status==='ready'&&state.connectionTargets.join(',')===targetKey&&state.onwardTargets.map(item=>`${item.from}>${item.to}`).join(',')===onwardKey&&Date.now()-state.updatedAt<FRESH_MS;
  if(fresh&&!force)return true;
  const seq=++state.seq;
  state.crs=code;state.date=String(date);state.includeConnections=wantsConnections;state.connectionTargets=targets;state.onwardTargets=onward;state.status='loading';
  try{
    const originBoards=await Promise.all([requestBoard(code),...targets.map(target=>requestBoard(code,undefined,{target}))]);
    const onwardBoards=await Promise.all(onward.map(item=>requestBoard(item.from,undefined,{target:item.to})));
    const json=originBoards.slice(1).reduce((merged,board)=>mergeBoards(merged,board),originBoards[0]||{});
    if(seq!==state.seq)return false;
    state.services=Array.isArray(json&&json.trainServices)?json.trainServices:[];
    state.messages=Array.isArray(json&&json.nrccMessages)?json.nrccMessages:[];
    state.index=buildIndex(state.services);
    state.onwardIndexes=new Map(onward.map((item,index)=>{
      const board=onwardBoards[index],services=Array.isArray(board&&board.trainServices)?board.trainServices:[];
      return [`${item.from}|${item.to}`,buildIndex(services)];
    }));
    state.updatedAt=Date.now();state.status='ready';state.error='';
    document.dispatchEvent(new CustomEvent('kerbside:live-overlay',{detail:{crs:code,date:state.date,count:state.services.length,onwardBoards:state.onwardIndexes.size}}));
    return true;
  }catch(error){
    if(seq!==state.seq)return false;
    state.status='error';state.error=error&&error.message?error.message:'unavailable';
    document.dispatchEvent(new CustomEvent('kerbside:live-overlay',{detail:{crs:code,date:String(date),error:state.error}}));
    return false;
  }
}

'''
replace_span(overlay,'async function refresh({crs,date,force=false,connectionTargets=state.connectionTargets}={}){','/* The live disruption text',refresh_block+'/* The live disruption text')

replace_once(
    overlay,
    "  state.crs='';state.date='';state.services=[];state.messages=[];state.index=null;state.updatedAt=0;state.status='idle';state.error='';state.includeConnections=false;state.connectionTargets=[];",
    "  state.crs='';state.date='';state.services=[];state.messages=[];state.index=null;state.onwardIndexes=new Map();state.updatedAt=0;state.status='idle';state.error='';state.includeConnections=false;state.connectionTargets=[];state.onwardTargets=[];"
)
replace_once(
    overlay,
    "refresh({crs:state.crs,date:state.date,force:true,connectionTargets:state.connectionTargets});",
    "refresh({crs:state.crs,date:state.date,force:true,connectionTargets:state.connectionTargets,onwardTargets:state.onwardTargets});"
)
replace_once(
    overlay,
    "if(timetable&&timetable.state&&timetable.state.mode==='today'&&state.crs)refresh({crs:state.crs,date:state.date,force:true,connectionTargets:state.connectionTargets});",
    "if(timetable&&timetable.state&&timetable.state.mode==='today'&&state.crs)refresh({crs:state.crs,date:state.date,force:true,connectionTargets:state.connectionTargets,onwardTargets:state.onwardTargets});"
)
replace_once(
    overlay,
    "  state,refresh,clear,start,stop,evidenceFor,extraServices,servesDestination,messages,\n  flattenCallingPoints,buildIndex,matchEntry,mergeBoards,isToday",
    "  state,refresh,clear,start,stop,evidenceFor,evidenceForOnward,extraServices,servesDestination,messages,\n  flattenCallingPoints,buildIndex,matchEntry,matchEntryIn,mergeBoards,isToday"
)


# ---------------------------------------------------------------------------
# Timetable/provider: official-MCT-ready policy, scheduled recovery options,
# journey labels, both-leg live evidence and recovery rendering.
tt='kerbside-train-timetable.js'
replace_once(
    tt,
    "const CONNECTION_DETOUR_REJECT_EXCESS=12;",
    """const CONNECTION_DETOUR_REJECT_EXCESS=12;
const CONNECTION_RECOVERY_WINDOW=120;
const CONNECTION_RECOVERY_CHOICES=3;"""
)

replace_once(
    tt,
    """function connectionMinimum(crs,graph=null){
  const code=String(crs||'').toUpperCase(),fixed=CONNECTION_HUB_MINUTES[code]||10,degree=graph&&graph.get(code)?graph.get(code).size:0;
  const topology=degree>=12?15:degree>=7?12:10;
  return Math.max(fixed,topology);
}""",
    """function connectionMinimumInfo(crs,graph=null){
  const code=String(crs||'').toUpperCase(),officialMap=window.__KERBSIDE_OFFICIAL_CONNECTION_TIMES__||{},official=Number(officialMap&&officialMap[code]);
  /* National Rail's CTI feed identifies connecting trains; it is not a
     substitute for the station minimum interchange times used by the Journey
     Planner. Until a licensed/machine-readable MCT source is loaded, Kerbside
     keeps an explicit conservative fallback instead of presenting guesses as
     official data. */
  if(Number.isFinite(official)&&official>=1&&official<=60)return {minutes:official,source:'official'};
  const fixed=CONNECTION_HUB_MINUTES[code]||10,degree=graph&&graph.get(code)?graph.get(code).size:0,topology=degree>=12?15:degree>=7?12:10;
  return {minutes:Math.max(fixed,topology),source:'kerbside-topology'};
}
function connectionMinimum(crs,graph=null){return connectionMinimumInfo(crs,graph).minutes;}"""
)

replace_once(
    tt,
    "const minimum=connectionMinimum(changeCode,graph),earliest=arrivalMinute+minimum,latest=arrivalMinute+CONNECTION_MAX_WAIT;",
    "const minimumInfo=connectionMinimumInfo(changeCode,graph),minimum=minimumInfo.minutes,earliest=arrivalMinute+minimum,latest=arrivalMinute+CONNECTION_MAX_WAIT;"
)

recovery_insert="""        const recoveryOptions=[];
        const recoveryLimit=second.departureMinute+CONNECTION_RECOVERY_WINDOW;
        for(let recoveryPos=pos+1;recoveryPos<list.length&&recoveryOptions.length<CONNECTION_RECOVERY_CHOICES;recoveryPos++){
          const alternative=list[recoveryPos];if(alternative.departureMinute>recoveryLimit)break;
          if(rowIdentity(alternative.row)===rowIdentity(candidate.row)||rowIdentity(alternative.row)===rowIdentity(second.row))continue;
          const alternativeDestination=destinationIndexAfter(alternative.row,toCode,alternative.callIndex);if(alternativeDestination<0)continue;
          const alternativeLeg=legFromRow(alternative.row,alternative.callIndex,alternativeDestination,locations,manifest,date);if(!alternativeLeg)continue;
          const alternativeQuality=connectionRouteQuality(candidate.row,candidate.originIndex,changeIndex,alternative.row,alternative.callIndex,alternativeDestination,graph,shortest);if(alternativeQuality.reject)continue;
          recoveryOptions.push({...alternativeLeg,routeQuality:alternativeQuality});
        }
"""
replace_once(tt,"        const margin=connectionMinutes-minimum,tightPenalty=margin<CONNECTION_COMFORT_MARGIN?(CONNECTION_COMFORT_MARGIN-margin)*6:0,longPenalty=connectionMinutes>CONNECTION_LONG_WAIT?(connectionMinutes-CONNECTION_LONG_WAIT)*.8:0,routePenalty=Number(routeQuality.penalty)||0;\n        found.push({", "        const margin=connectionMinutes-minimum,tightPenalty=margin<CONNECTION_COMFORT_MARGIN?(CONNECTION_COMFORT_MARGIN-margin)*6:0,longPenalty=connectionMinutes>CONNECTION_LONG_WAIT?(connectionMinutes-CONNECTION_LONG_WAIT)*.8:0,routePenalty=Number(routeQuality.penalty)||0;\n"+recovery_insert+"        found.push({")
replace_once(
    tt,
    "          connectionMinutes,minimumConnectionMinutes:minimum,\n          interchange:{...interchange,arrival:firstLeg.arrival,departure:secondLeg.std,minutes:connectionMinutes,minimum,margin,quality:connectionQuality(connectionMinutes,minimum),routeQuality},",
    "          connectionMinutes,minimumConnectionMinutes:minimum,minimumConnectionSource:minimumInfo.source,recoveryOptions,\n          interchange:{...interchange,arrival:firstLeg.arrival,departure:secondLeg.std,minutes:connectionMinutes,minimum,margin,quality:connectionQuality(connectionMinutes,minimum),routeQuality},"
)

journey_block=r'''function connectionVariantDominated(connection,all){
  const first=connection&&connection.legs&&connection.legs[0],change=connection&&connection.interchange&&connection.interchange.crs;
  if(!first||!change)return false;
  return all.some(other=>other!==connection&&other&&other.legs&&other.legs[0]&&other.legs[0].serviceID===first.serviceID&&other.interchange&&other.interchange.crs===change&&other.arrivalMinute<=connection.arrivalMinute&&other.rankScore<=connection.rankScore);
}
function addJourneyLabel(service,label){if(!service||!label)return;const list=Array.isArray(service.journeyLabels)?service.journeyLabels:(service.journeyLabels=[]);if(!list.includes(label))list.push(label);}
function applyJourneyLabels(items){
  const list=Array.isArray(items)?items:[];if(!list.length)return list;
  list.forEach(item=>{item.journeyLabels=[];if(item.changes===0)addJourneyLabel(item,'Direct');});
  const fastest=list.reduce((best,item)=>!best||item.arrivalMinute<best.arrivalMinute?item:best,null);if(fastest)addJourneyLabel(fastest,'Fastest');
  const connections=list.filter(item=>item.journeyType==='connection');
  if(connections.length){
    const best=connections.reduce((winner,item)=>!winner||item.rankScore<winner.rankScore?item:winner,null);if(best)addJourneyLabel(best,'Best connection');
    const safest=connections.reduce((winner,item)=>!winner||(Number(item.interchange&&item.interchange.margin)||0)>(Number(winner.interchange&&winner.interchange.margin)||0)?item:winner,null);
    if(safest&&safest!==best&&(Number(safest.interchange&&safest.interchange.margin)||0)>=(Number(best&&best.interchange&&best.interchange.margin)||0)+5)addJourneyLabel(safest,'Safer change');
  }
  return list;
}
function journeysFromRows(rows,locations,manifest,options){
  const direct=servicesFromRows(rows,locations,manifest,options);
  const rawConnections=connectionsFromRows(rows,locations,manifest,options);
  const connections=rawConnections.filter(item=>!connectionVariantDominated(item,rawConnections)&&!connectionDominated(item,direct));
  const ranked=[...direct,...connections]
    .sort((a,b)=>a.departureMinute-b.departureMinute||a.changes-b.changes||a.rankScore-b.rankScore||a.arrivalMinute-b.arrivalMinute)
    .slice(0,MAX_RESULTS);
  return applyJourneyLabels(ranked);
}

'''
replace_span(tt,'function journeysFromRows(rows,locations,manifest,options){','\nconst timetableProvider=',journey_block+'const timetableProvider=')
replace_once(
    tt,
    "  servicesFromRows,connectionsFromRows,journeysFromRows,connectionMinimum,connectionRiskFor,buildStationGraph,shortestNetworkStops,connectionRouteQuality",
    "  servicesFromRows,connectionsFromRows,journeysFromRows,connectionMinimum,connectionMinimumInfo,connectionRiskFor,buildStationGraph,shortestNetworkStops,connectionRouteQuality"
)

replace_once(
    tt,
    "    liveConnectionMinutes:null,liveInterchangeArrival:'',connectionRisk:'scheduled',\n    scheduledOnly:true,liveEvidence:false,liveVia:'',cancelReason:'',delayReason:''",
    "    liveConnectionMinutes:null,liveInterchangeArrival:'',connectionRisk:'scheduled',secondLiveEvidence:false,onwardCancelled:false,\n    recoveryOptions:connection?(item.recoveryOptions||[]).map(normaliseLeg):[],recoveryChoice:null,minimumConnectionSource:item.minimumConnectionSource||'kerbside-topology',journeyLabels:Array.isArray(item.journeyLabels)?item.journeyLabels.slice():[],\n    scheduledOnly:true,liveEvidence:false,liveVia:'',cancelReason:'',delayReason:''"
)

# Presentation helpers and live-aware connection itinerary.
replace_once(
    tt,
    "function connectionChangeText(service){const live=Number.isFinite(service&&service.liveConnectionMinutes)?service.liveConnectionMinutes:null,value=live==null?Number(service&&service.connectionMinutes)||0:live;return `${live==null?'': 'live '}${value}m change`;}\n",
    """function connectionChangeText(service){const live=Number.isFinite(service&&service.liveConnectionMinutes)?service.liveConnectionMinutes:null,value=live==null?Number(service&&service.connectionMinutes)||0:live;return `${live==null?'': 'live '}${value}m change`;}
function journeyBadgesMarkup(service){const labels=Array.isArray(service&&service.journeyLabels)?service.journeyLabels:[];return labels.length?`<span class=\"train-journey-badges\">${labels.map(label=>`<em>${esc(label)}</em>`).join('')}</span>`:'';}
function recoverySummary(service){const choice=service&&service.recoveryChoice;if(!choice)return'';return `Backup ${choice.departure||choice.std||'—'} → ${choice.arrival||'—'}${choice.live?' · live':''}`;}
"""
)

warning_block=r'''function connectionWarning(service){
  if(!service||service.journeyType!=='connection')return'';
  const change=displayName(service.interchange,'the interchange'),minimum=Number(service.minimumConnectionMinutes)||10,minutes=Number.isFinite(service.liveConnectionMinutes)?service.liveConnectionMinutes:Number(service.connectionMinutes)||0,arrival=service.liveInterchangeArrival?` at ${service.liveInterchangeArrival}`:'',backup=recoverySummary(service);
  if(service.connectionRisk==='first-cancelled')return `The first train is cancelled, so Kerbside cannot assume you can reach ${change}. Re-plan from the origin rather than relying on the onward leg.`;
  if(service.connectionRisk==='onward-cancelled')return `The planned onward train from ${change} is cancelled.${backup?` ${backup} is the next workable timetable option Kerbside found.`:''}`;
  if(service.connectionRisk==='at-risk')return `Live evidence reaches ${change}${arrival}, leaving ${minutes} minutes for the change — below the ${minimum}-minute planning buffer.${backup?` ${backup} is the next workable option if this connection is missed.`:''}`;
  if(service.connectionRisk==='tight')return `Live evidence leaves ${minutes} minutes at ${change}, only ${minutes-minimum} minutes above the ${minimum}-minute planning buffer.`;
  return'';
}
function recoveryMarkup(service){
  if(!service||service.journeyType!=='connection'||!['at-risk','onward-cancelled'].includes(service.connectionRisk))return'';
  const choice=service.recoveryChoice;
  if(!choice)return `<div class="train-recovery-card train-recovery-none"><span>Recovery</span><strong>No later workable onward train found</strong><small>Kerbside checked the loaded timetable recovery window. Refresh as live information changes.</small></div>`;
  const platform=choice.platform?` · Plat ${choice.platform}`:'',live=choice.live?'Live Darwin evidence':'Scheduled timetable';
  return `<div class="train-recovery-card"><span>Backup if missed</span><strong>${esc(`${choice.departure||choice.std||'—'} → ${choice.arrival||'—'}`)}</strong><small>${esc(`${choice.operator||'Onward service'}${platform} · ${live}`)}</small></div>`;
}
'''
replace_span(tt,'function connectionWarning(service){','function connectionItineraryMarkup',warning_block+'function connectionItineraryMarkup')

itinerary_block=r'''function connectionItineraryMarkup(service,result){
  if(!service||service.journeyType!=='connection'||!Array.isArray(service.legs))return'';
  const results=Array.isArray(result&&result.journeyLegResults)?result.journeyLegResults:[];
  const legs=service.legs.map((leg,index)=>{
    const crowd=results[index]||{label:'Forecast pending',level:'unknown',confidence:'Low'};
    const from=displayName(leg.from,'Departure'),to=displayName(leg.to,'Destination'),live=!!leg.liveEvidence;
    const depart=live&&/^\d{1,2}:\d{2}$/.test(String(leg.etd||''))?leg.etd:leg.std,arrive=leg.liveArrival||leg.arrival;
    const platform=leg.platform?`Plat ${leg.platform}`:'Plat TBC',train=leg.trainId?` · ${leg.trainId}`:'';
    return `<div class="train-connection-leg"><span class="train-connection-time"><b>${esc(depart||'—')}</b><small>${esc(arrive||'—')}${live?' · live':''}</small></span><span class="train-connection-route"><b>${esc(`${from} → ${to}`)}</b><small>${esc(`${leg.operator||'Scheduled service'}${train} · ${platform} · ${live?'live':'scheduled'}`)}</small></span><span class="train-connection-crowd crowd-${esc(crowd.level||'unknown')}"><i></i><b>${esc(crowd.label||'Forecast pending')}</b><small>${esc(`${crowd.confidence||'Low'} confidence`)}</small></span></div>`;
  });
  const change=service.interchange||{},minutes=Number.isFinite(service.liveConnectionMinutes)?service.liveConnectionMinutes:Number(service.connectionMinutes)||0,minimum=Number(service.minimumConnectionMinutes)||10,risk=service.connectionRisk||change.quality||'scheduled';
  const quality=service.connectionRisk==='at-risk'?'At risk':service.connectionRisk==='tight'?'Tight':service.connectionRisk==='onward-cancelled'?'Onward cancelled':service.connectionRisk==='first-cancelled'?'First train cancelled':String(change.quality||'comfortable').replace(/^./,c=>c.toUpperCase());
  const evidence=service.secondLiveEvidence?' · live evidence on both legs':service.liveEvidence?' · live first-leg evidence':'';
  const source=service.minimumConnectionSource==='official'?'official station minimum':'Kerbside fallback minimum';
  const changeRow=`<div class="train-connection-change connection-risk-${esc(risk)}"><span>Change at ${esc(displayName(change,'interchange'))}</span><b>${esc(`${minutes} min`)}</b><small>${esc(`${quality} connection · ${source}: ${minimum} min${evidence}`)}</small></div>`;
  return `<div class="train-connection-itinerary"><div class="train-detail-title">Journey plan</div>${legs[0]||''}${changeRow}${legs[1]||''}</div>`;
}
'''
replace_span(tt,'function connectionItineraryMarkup(service,result){','\n\n/* ------------------------------------------------------------------\n   Overlay merge.',itinerary_block+'\n\n/* ------------------------------------------------------------------\n   Overlay merge.')

merge_helpers=r'''function resetLegLive(leg){
  if(!leg)return;leg.etd='';leg.platform=leg.scheduledPlatform||leg.platform;leg.isCancelled=false;leg.length=0;leg.liveEvidence=false;leg.liveVia='';leg.liveArrival='';leg.cancelReason='';leg.delayReason='';leg.previousCallingPoints=null;leg.subsequentCallingPoints=null;
}
function clearConnectionLive(service){
  if(!service||service.journeyType!=='connection')return false;
  const had=!!(service.liveEvidence||service.secondLiveEvidence||Number.isFinite(service.liveConnectionMinutes)||service.connectionRisk!=='scheduled'||service.recoveryChoice);
  (service.legs||[]).forEach(resetLegLive);(service.recoveryOptions||[]).forEach(resetLegLive);
  service.etd='';service.platform=service.scheduledPlatform||service.platform;service.isCancelled=false;service.length=0;service.liveEvidence=false;service.secondLiveEvidence=false;service.onwardCancelled=false;service.liveVia='';service.cancelReason='';service.delayReason='';service.liveConnectionMinutes=null;service.liveInterchangeArrival='';service.connectionRisk='scheduled';service.recoveryChoice=null;
  return had;
}
function applyEvidence(target,evidence){
  target.etd=evidence.etd;if(evidence.platform)target.platform=evidence.platform;target.isCancelled=evidence.isCancelled;target.length=evidence.length;
  target.cancelReason=evidence.cancelReason;target.delayReason=evidence.delayReason;target.serviceIdUrlSafe=evidence.serviceIdUrlSafe;target.serviceIdGuid=evidence.serviceIdGuid;
  if(evidence.serviceID)target.liveServiceID=evidence.serviceID;if(evidence.previousCallingPoints)target.previousCallingPoints=evidence.previousCallingPoints;if(evidence.subsequentCallingPoints)target.subsequentCallingPoints=evidence.subsequentCallingPoints;
  target.liveEvidence=true;target.liveVia=evidence.via;
}
function evidenceArrivalAt(overlay,evidence,crs,fallback=''){
  const points=overlay&&evidence?overlay.flattenCallingPoints(evidence.subsequentCallingPoints):[],code=String(crs||'').toUpperCase(),point=points.find(item=>String(item&&item.crs||'').toUpperCase()===code);
  return String(point&&(point.at||point.et||point.st)||fallback||'').trim();
}
function liveDepartureFor(leg){const etd=String(leg&&leg.etd||'').trim();return /^\d{1,2}:\d{2}$/.test(etd)?etd:String(leg&&leg.std||'').trim();}
function updateRecoveryChoice(service,overlay,toCrs,interchangeArrival){
  service.recoveryChoice=null;const change=String(service.interchange&&service.interchange.crs||'').toUpperCase(),minimum=Number(service.minimumConnectionMinutes)||10;
  for(const option of service.recoveryOptions||[]){
    const evidence=overlay&&typeof overlay.evidenceForOnward==='function'?overlay.evidenceForOnward(option,change,toCrs):null;
    if(evidence)applyEvidence(option,evidence);else resetLegLive(option);
    if(option.isCancelled)continue;
    const departure=liveDepartureFor(option),gap=interchangeArrival?connectionBufferMinutes(interchangeArrival,departure):null;
    if(interchangeArrival&&(!Number.isFinite(gap)||gap<minimum))continue;
    const arrival=evidenceArrivalAt(overlay,evidence,toCrs,option.arrival);
    service.recoveryChoice={serviceID:option.serviceID,std:option.std,departure,arrival,operator:option.operator,platform:option.platform,trainId:option.trainId,live:!!evidence};return;
  }
}
function mergeOverlay(){
  const overlay=window.__KERBSIDE_TRAIN_OVERLAY__;
  if(!overlay||state.mode!=='today'||!liveOverlayEligible()||!state.services.length)return false;
  if(overlay.state.status!=='ready'||!overlayMatchesRoute(overlay))return false;
  const r=route(),toCrs=r.to&&r.to.crs||'';
  const matched=[];let changed=false;
  state.services.forEach(service=>{
    if(service.liveOnly)return;
    if(service.journeyType==='connection'){
      const first=service.legs&&service.legs[0],second=service.legs&&service.legs[1],change=String(service.interchange&&service.interchange.crs||'').toUpperCase();
      const firstEvidence=first?overlay.evidenceFor(first):null,secondEvidence=second&&typeof overlay.evidenceForOnward==='function'?overlay.evidenceForOnward(second,change,toCrs):null;
      if(!firstEvidence&&!secondEvidence){if(clearConnectionLive(service))changed=true;return;}
      if(firstEvidence)matched.push(firstEvidence.index);
      const before=JSON.stringify([service.etd,service.platform,service.isCancelled,service.liveConnectionMinutes,service.connectionRisk,service.secondLiveEvidence,service.recoveryChoice&&service.recoveryChoice.serviceID,first&&first.etd,second&&second.etd,second&&second.isCancelled]);
      if(firstEvidence){applyEvidence(first,firstEvidence);service.etd=first.etd;if(firstEvidence.platform)service.platform=firstEvidence.platform;service.isCancelled=first.isCancelled;service.length=first.length;service.cancelReason=first.cancelReason;service.delayReason=first.delayReason;}
      else resetLegLive(first);
      if(secondEvidence){applyEvidence(second,secondEvidence);second.liveArrival=evidenceArrivalAt(overlay,secondEvidence,toCrs,second.arrival);}else resetLegLive(second);
      const firstArrival=firstEvidence?evidenceArrivalAt(overlay,firstEvidence,change,first&&first.arrival):String(first&&first.arrival||''),secondDeparture=second?liveDepartureFor(second):'',hasLiveTiming=!!(firstEvidence||secondEvidence),minutes=firstArrival&&secondDeparture&&hasLiveTiming?connectionBufferMinutes(firstArrival,secondDeparture):null,minimum=Number(service.minimumConnectionMinutes)||10;
      if(first)first.liveArrival=firstArrival;
      service.liveInterchangeArrival=firstArrival;service.liveConnectionMinutes=Number.isFinite(minutes)?minutes:null;service.secondLiveEvidence=!!secondEvidence;service.onwardCancelled=!!(second&&second.isCancelled);service.liveEvidence=!!(firstEvidence||secondEvidence);
      service.liveVia=firstEvidence&&secondEvidence?'both-legs':firstEvidence?`first-leg-${firstEvidence.via}`:`onward-${secondEvidence&&secondEvidence.via||'live'}`;
      service.connectionRisk=first&&first.isCancelled?'first-cancelled':second&&second.isCancelled?'onward-cancelled':liveConnectionRiskFor(minutes,minimum);
      if(['at-risk','onward-cancelled'].includes(service.connectionRisk))updateRecoveryChoice(service,overlay,toCrs,firstArrival);else service.recoveryChoice=null;
      const after=JSON.stringify([service.etd,service.platform,service.isCancelled,service.liveConnectionMinutes,service.connectionRisk,service.secondLiveEvidence,service.recoveryChoice&&service.recoveryChoice.serviceID,first&&first.etd,second&&second.etd,second&&second.isCancelled]);if(before!==after)changed=true;
      return;
    }
    const evidence=overlay.evidenceFor(service);
    if(!evidence){
      if(service.liveEvidence){service.liveEvidence=false;service.liveVia='';service.etd='';service.platform=service.scheduledPlatform||service.platform;service.isCancelled=false;service.length=0;service.cancelReason='';service.delayReason='';changed=true;}
      return;
    }
    matched.push(evidence.index);
    const before=`${service.etd}|${service.platform}|${service.isCancelled}|${service.length}`;applyEvidence(service,evidence);if(before!==`${service.etd}|${service.platform}|${service.isCancelled}|${service.length}`)changed=true;
  });
  const existing=new Set(state.services.filter(s=>s.liveOnly).map(s=>String(s.serviceID||'')));
  const extras=overlay.extraServices(matched,toCrs).map(({service})=>normaliseLive(service,toCrs)).filter(row=>row.std&&!existing.has(String(row.serviceID||'')));
  if(extras.length){state.services=state.services.concat(extras).sort((a,b)=>(parseMinutes(a.std)??9999)-(parseMinutes(b.std)??9999));changed=true;}
  return changed;
}
'''
replace_span(tt,'function clearConnectionLive(service){','\n\n/* The status line under the departure time.',merge_helpers+'\n\n/* The status line under the departure time.')

status_block=r'''function statusFor(service){
  if(service.journeyType==='connection'){
    if(service.connectionRisk==='first-cancelled')return {label:'First train cancelled',cls:'cancelled'};
    if(service.connectionRisk==='onward-cancelled')return {label:'Onward cancelled',cls:'cancelled'};
    if(service.connectionRisk==='at-risk')return {label:'Connection at risk',cls:'late'};
    if(service.connectionRisk==='tight')return {label:'Tight change',cls:'late'};
    return {label:'1 change',cls:'connection'};
  }
  if(service.isCancelled)return {label:'Cancelled',cls:'cancelled'};
  if(!service.liveEvidence)return {label:'Timetabled',cls:'timetabled'};
  const etd=String(service.etd||'').trim();
  if(!etd||/^on time$/i.test(etd))return {label:'On time',cls:'ontime'};
  if(/^\d{1,2}:\d{2}$/.test(etd)){
    const late=parseMinutes(etd),planned=parseMinutes(service.std);let delay=late!=null&&planned!=null?late-planned:null;if(delay!=null&&delay<-720)delay+=1440;if(delay!=null&&delay>720)delay-=1440;
    return {label:`Expected ${etd}`,cls:delay!=null&&delay>=5?'late':'ontime'};
  }
  if(/delay/i.test(etd))return {label:etd,cls:'late'};
  return {label:etd,cls:'ontime'};
}
'''
replace_span(tt,'function statusFor(service){','function modeNote(mode){',status_block+'function modeNote(mode){')

source_block=r'''function sourceNote(service){
  if(service.liveOnly)return 'Added by National Rail Darwin after this timetable snapshot was published. Live evidence only.';
  if(service.journeyType==='connection'){
    const minimum=Number(service.minimumConnectionMinutes)||10,minimumText=service.minimumConnectionSource==='official'?`the official ${minimum}-minute station minimum`:`Kerbside's conservative ${minimum}-minute fallback buffer`;
    if(service.secondLiveEvidence)return `Both legs are timetabled from the National Rail Darwin Timetable Files and both have been matched to live Darwin evidence. The connection uses ${minimumText}.`;
    if(service.liveEvidence)return `Both legs are timetabled from the National Rail Darwin Timetable Files. Live Darwin evidence is currently available for one leg; the other remains scheduled. The connection uses ${minimumText}.`;
    return `Both legs are timetabled from the National Rail Darwin Timetable Files. This one-change result uses ${minimumText}; Kerbside does not treat the Connecting Train Identifiers feed as a station minimum-time source.`;
  }
  if(service.liveEvidence)return `Timetabled from the National Rail Darwin Timetable Files, matched to live Darwin data by ${service.liveVia==='rid'?'service ID':service.liveVia==='uid'?'schedule UID':service.liveVia==='headcode'?'headcode':'departure time'}.`;
  return 'Timetabled from the National Rail Darwin Timetable Files. Live expected times, platform changes, cancellations and formation are added automatically once this service enters the live Darwin window.';
}
'''
replace_span(tt,'function sourceNote(service){','function serviceMarkup(',source_block+'function serviceMarkup(')

replace_once(
    tt,
    "  const rightLabel=connection?`${service.connectionMinutes}m`:(formation?`${formation} coach${formation===1?'':'es'}`:(duration||'—'));\n  const rightNote=connection?'scheduled change':(formation?'formation':(duration?'journey time':'duration unknown'));",
    "  const shownChange=connection&&Number.isFinite(service.liveConnectionMinutes)?service.liveConnectionMinutes:service.connectionMinutes;\n  const rightLabel=connection?`${shownChange}m`:(formation?`${formation} coach${formation===1?'':'es'}`:(duration||'—'));\n  const rightNote=connection?(Number.isFinite(service.liveConnectionMinutes)?'live change':'scheduled change'):(formation?'formation':(duration?'journey time':'duration unknown'));"
)
replace_once(
    tt,
    "        <span class=\"train-route\"><strong>${esc(terminus)}</strong><small>${esc(line.join(' · '))}</small></span>",
    "        <span class=\"train-route\">${journeyBadgesMarkup(service)}<strong>${esc(terminus)}</strong><small>${esc(line.join(' · '))}</small></span>"
)
replace_once(
    tt,
    "        ${connection?connectionItineraryMarkup(service,forecastResult):''}\n        <div class=\"train-crowding-explain crowd-${esc(forecastResult.level)}\">${explain}</div>",
    "        ${connection?connectionItineraryMarkup(service,forecastResult):''}\n        ${connection?recoveryMarkup(service):''}\n        <div class=\"train-crowding-explain crowd-${esc(forecastResult.level)}\">${explain}</div>"
)
replace_once(
    tt,
    "Scheduled journey options come from National Rail Darwin Timetable Files. One-change results use conservative Kerbside interchange buffers rather than the official minimum-connection-time dataset. Live delays, cancellations and formations take precedence when LDB data is available.",
    "Scheduled journey options come from National Rail Darwin Timetable Files. Where an authoritative station minimum is not loaded, one-change results use an explicit conservative Kerbside fallback; CTI is not treated as a minimum-time feed. Live Darwin evidence can update both legs and recovery options."
)

replace_once(
    tt,
    "  const pending=overlay.refresh({crs:r.from.crs,date:r.date,connectionTargets:[...new Set(state.services.filter(service=>service&&service.journeyType==='connection').map(service=>service.interchange&&service.interchange.crs).filter(Boolean))]});",
    "  const connections=state.services.filter(service=>service&&service.journeyType==='connection'),connectionTargets=[...new Set(connections.map(service=>service.interchange&&service.interchange.crs).filter(Boolean))],onwardTargets=connections.map(service=>({from:service.interchange&&service.interchange.crs,to:r.to&&r.to.crs})).filter(item=>item.from&&item.to);\n  const pending=overlay.refresh({crs:r.from.crs,date:r.date,connectionTargets,onwardTargets});"
)
replace_once(
    tt,
    "window.__KERBSIDE_TRAIN_TIMETABLE__={state,load,loadSameDay,sync,renderServices,renderUnavailable,setHeader,refreshForecasts,refreshEdgeManifest,toggleService,serviceKey,journeyMode,mergeOverlay,statusFor,serviceDateLabel,requestOverlay,coverageIncludesTime,connectionBufferMinutes,connectionRiskFor,provider:timetableProvider};",
    "window.__KERBSIDE_TRAIN_TIMETABLE__={state,load,loadSameDay,sync,renderServices,renderUnavailable,setHeader,refreshForecasts,refreshEdgeManifest,toggleService,serviceKey,journeyMode,mergeOverlay,statusFor,serviceDateLabel,requestOverlay,coverageIncludesTime,connectionBufferMinutes,connectionRiskFor,recoverySummary,provider:timetableProvider};"
)


# ---------------------------------------------------------------------------
# Compact labels and recovery card styles.
css='kerbside-trains.css'
replace_once(
    css,
    ".train-connection-service .train-formation b{color:var(--led)}",
    """.train-connection-service .train-formation b{color:var(--led)}
.train-journey-badges{display:flex;flex-wrap:wrap;gap:4px;margin:0 0 4px}
.train-journey-badges em{display:inline-block;padding:2px 5px;border:1px solid var(--rule);border-radius:999px;background:var(--ink-2);color:var(--text-dim);font-size:7.5px;font-style:normal;font-weight:800;letter-spacing:.035em;text-transform:uppercase;line-height:1.2}
.train-journey-badges em:first-child{color:var(--live-soft)}
.train-recovery-card{display:grid;gap:3px;margin:0 0 12px;padding:10px 11px;border:1px solid rgb(var(--live-rgb) / .28);border-radius:9px;background:rgb(var(--live-rgb) / .055)}
.train-recovery-card>span{color:var(--live-soft);font-family:'Martian Mono',ui-monospace,monospace;font-size:8px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
.train-recovery-card>strong{font-size:12px;color:var(--text)}
.train-recovery-card>small{font-size:9.5px;line-height:1.4;color:var(--text-dim)}
.train-recovery-card.train-recovery-none{border-color:var(--rule);background:var(--ink-2)}
.train-recovery-card.train-recovery-none>span{color:var(--text-mute)}"""
)


# ---------------------------------------------------------------------------
# Deterministic provider fixtures: a later onward service becomes the recovery
# option but is not listed as a duplicate top-level connection.
testp='kerbside-backend/test/train-timetable-provider.test.js'
replace_once(
    testp,
    "  ['rid-change-b','uid-change-b','1G02','XC','2026-08-12',[[\"CNM\",\"\",\"10:00\",\"4\",0],[\"GLO\",\"10:32\",\"\",\"1\",0]]]\n];",
    "  ['rid-change-b','uid-change-b','1G02','XC','2026-08-12',[[\"CNM\",\"\",\"10:00\",\"4\",0],[\"GLO\",\"10:32\",\"\",\"1\",0]]],\n  ['rid-change-recovery','uid-change-recovery','1G03','XC','2026-08-12',[[\"CNM\",\"\",\"10:20\",\"5\",0],[\"GLO\",\"10:52\",\"\",\"2\",0]]]\n];"
)
replace_once(
    testp,
    "  assert.equal(journey.legs.some(leg=>leg.serviceID==='rid-change-tight'),false,'7-minute change must be rejected');",
    "  assert.equal(journey.legs.some(leg=>leg.serviceID==='rid-change-tight'),false,'7-minute change must be rejected');\n  assert.equal(journey.recoveryOptions.length,1);\n  assert.equal(journey.recoveryOptions[0].serviceID,'rid-change-recovery');\n  assert.equal(journey.recoveryOptions[0].std,'10:20');\n  assert.ok(journey.journeyLabels.includes('Fastest'));\n  assert.ok(journey.journeyLabels.includes('Best connection'));"
)
replace_once(
    testp,
    "  assert.equal(provider.connectionMinimum('BHM'),15);",
    "  assert.equal(provider.connectionMinimum('BHM'),15);\n  assert.deepEqual({...provider.connectionMinimumInfo('CNM')},{minutes:10,source:'kerbside-topology'});"
)


# ---------------------------------------------------------------------------
# Real browser fixture: both legs have live Darwin evidence, the first-leg
# delay makes the 11:00 connection unsafe, and the 11:20 train is offered as
# the automatic recovery option.
browser='kerbside-backend/tests/train-browser-core-regression.mjs'
replace_once(
    browser,
    "  [`rid-change-b-${date}`,`uid-change-b-${date}`,'1G02','GW',date,[['CNM','','11:00','4',0],['GLO','11:32','','1',0]]]\n];}",
    "  [`rid-change-b-${date}`,`uid-change-b-${date}`,'1G02','GW',date,[['CNM','','11:00','4',0],['GLO','11:32','','1',0]]],\n  [`rid-change-recovery-${date}`,`uid-change-recovery-${date}`,'1G03','GW',date,[['CNM','','11:20','5',0],['GLO','11:52','','2',0]]]\n];}"
)

live_service_block=r'''const liveService=(kind)=>{
  if(kind==='connection')return {
    origin:[{locationName:'Birmingham New Street',crs:'BHM'}],destination:[{locationName:'Cheltenham Spa',crs:'CNM'}],
    serviceIdGuid:`rid-change-a-${TODAY}`,uid:`uid-change-a-${TODAY}`,trainid:'1C10',serviceIdUrlSafe:'live-change-a',
    std:'10:05',etd:'10:12',platform:'8',operator:'CrossCountry',operatorCode:'XC',length:4,isCancelled:false,
    subsequentCallingPoints:[{callingPoint:[{locationName:'Cheltenham Spa',crs:'CNM',st:'10:45',et:'10:53',isCancelled:false}]}]
  };
  if(kind==='onward')return {
    origin:[{locationName:'Cheltenham Spa',crs:'CNM'}],destination:[{locationName:'Gloucester',crs:'GLO'}],
    serviceIdGuid:`rid-change-b-${TODAY}`,uid:`uid-change-b-${TODAY}`,trainid:'1G02',serviceIdUrlSafe:'live-change-b',
    std:'11:00',etd:'On time',platform:'4',operator:'Great Western Railway',operatorCode:'GW',length:3,isCancelled:false,
    subsequentCallingPoints:[{callingPoint:[{locationName:'Gloucester',crs:'GLO',st:'11:32',et:'11:32',isCancelled:false}]}]
  };
  if(kind==='recovery')return {
    origin:[{locationName:'Cheltenham Spa',crs:'CNM'}],destination:[{locationName:'Gloucester',crs:'GLO'}],
    serviceIdGuid:`rid-change-recovery-${TODAY}`,uid:`uid-change-recovery-${TODAY}`,trainid:'1G03',serviceIdUrlSafe:'live-change-recovery',
    std:'11:20',etd:'On time',platform:'5',operator:'Great Western Railway',operatorCode:'GW',length:5,isCancelled:false,
    subsequentCallingPoints:[{callingPoint:[{locationName:'Gloucester',crs:'GLO',st:'11:52',et:'11:52',isCancelled:false}]}]
  };
  if(kind==='direct')return {
    origin:[{locationName:'Birmingham New Street',crs:'BHM'}],destination:[{locationName:'Bristol Temple Meads',crs:'BRI'}],
    serviceIdGuid:`rid-forward-${TODAY}`,uid:`uid-forward-${TODAY}`,trainid:'1A01',serviceIdUrlSafe:'live-forward',
    std:'10:42',etd:'On time',platform:'7',operator:'CrossCountry',operatorCode:'XC',length:8,isCancelled:false
  };
  return {
    origin:[{locationName:'Bristol Temple Meads',crs:'BRI'}],destination:[{locationName:'Birmingham New Street',crs:'BHM'}],
    serviceIdGuid:`rid-reverse-${TODAY}`,uid:`uid-reverse-${TODAY}`,trainid:'1A02',serviceIdUrlSafe:'live-reverse',
    std:'10:50',etd:'On time',platform:'3',operator:'CrossCountry',operatorCode:'XC',length:8,isCancelled:false
  };
};
const liveBoard=(crs,filter='')=>({
  generatedAt:new Date().toISOString(),locationName:crs==='BRI'?'Bristol Temple Meads':crs==='CNM'?'Cheltenham Spa':'Birmingham New Street',crs,nrccMessages:[],
  trainServices:crs==='BRI'?[liveService('reverse')]:crs==='CNM'&&filter==='GLO'?[liveService('onward'),liveService('recovery')]:filter==='BRI'?[liveService('direct')]:filter==='CNM'?[liveService('connection')]:filter==='GLO'?[]:[liveService('connection'),liveService('direct')]
});
'''
replace_span(browser,'const liveService=(kind)=>', '\n\nasync function mockExternal',live_service_block+'\nasync function mockExternal')

replace_once(
    browser,
    "  assert.match(await connection.textContent(),/Cheltenham Spa/);",
    "  assert.match(await connection.textContent(),/Cheltenham Spa/);\n  assert.match(await connection.textContent(),/Fastest/);\n  assert.match(await connection.textContent(),/Best connection/);"
)
replace_once(
    browser,
    "  assert.ok(diagnostics.railRequests.some(value=>/^\\/departures\\/BHM\\/to\\/CNM\\/9\\?/.test(value)),'connection overlay should request a BHM → CNM interchange board');",
    "  assert.ok(diagnostics.railRequests.some(value=>/^\\/departures\\/BHM\\/to\\/CNM\\/9\\?/.test(value)),'connection overlay should request a BHM → CNM first-leg board');\n  assert.ok(diagnostics.railRequests.some(value=>/^\\/departures\\/CNM\\/to\\/GLO\\/9\\?/.test(value)),'connection overlay should request a CNM → GLO onward board');\n  const connectionState=await page.evaluate(()=>window.__KERBSIDE_TRAIN_TIMETABLE__.state.services.find(service=>service.journeyType==='connection'));\n  assert.equal(connectionState.secondLiveEvidence,true,'onward leg should carry live Darwin evidence');\n  assert.equal(connectionState.recoveryChoice?.serviceID,`rid-change-recovery-${TODAY}`);"
)
replace_once(
    browser,
    "  assert.match(await connectionDetail.textContent(),/below Kerbside's 10-minute planning buffer/);",
    "  assert.match(await connectionDetail.textContent(),/10-minute planning buffer/);\n  assert.match(await connectionDetail.textContent(),/live evidence on both legs/i);\n  assert.match(await connectionDetail.textContent(),/Backup if missed/);\n  assert.match(await connectionDetail.textContent(),/11:20 → 11:52/);"
)

print('Applied Kerbside 0.8.2 connection intelligence and recovery.')
