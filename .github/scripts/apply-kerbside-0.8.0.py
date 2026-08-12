#!/usr/bin/env python3
from pathlib import Path


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


def replace_once(path, old, new):
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one match, found {count}: {old[:140]!r}')
    write(path, text.replace(old, new, 1))


def replace_span(path, start, end, new):
    text = read(path)
    a = text.find(start)
    if a < 0:
        raise SystemExit(f'{path}: start marker not found: {start!r}')
    b = text.find(end, a)
    if b < 0:
        raise SystemExit(f'{path}: end marker not found: {end!r}')
    b += len(end)
    write(path, text[:a] + new + text[b:])


# ---------------------------------------------------------------------------
# Release/cache busting.
if read('VERSION').strip() != '0.7.46':
    raise SystemExit(f"VERSION: expected 0.7.46, found {read('VERSION').strip()!r}")
write('VERSION', '0.8.0\n')

bus = read('bus.html')
if "const APP_VERSION = '0.7.46';" not in bus:
    raise SystemExit('bus.html: expected APP_VERSION 0.7.46')
if '?v=0.7.46' not in bus:
    raise SystemExit('bus.html: expected 0.7.46 cache busters')
bus = bus.replace("const APP_VERSION = '0.7.46';", "const APP_VERSION = '0.8.0';", 1)
bus = bus.replace('?v=0.7.46', '?v=0.8.0')
write('bus.html', bus)
replace_once('kerbside-status.js', "const VERSION='0.7.46';", "const VERSION='0.8.0';")


# ---------------------------------------------------------------------------
# Timetable provider: direct + one-change journeys.
path = 'kerbside-train-timetable.js'
replace_once(
    path,
    "const MAX_RESULTS=24;\n",
    """const MAX_RESULTS=24;
const CONNECTION_MAX_WAIT=75;
const CONNECTION_MAX_TOTAL=360;
const CONNECTION_FIRST_LEGS=48;
const CONNECTION_SECOND_CHOICES=6;
/* The compact Darwin snapshot does not carry the official National Rail
   minimum-connection-time dataset. These are deliberately conservative
   Kerbside planning buffers: 10 minutes generally, 12 at the largest or
   more complex hubs. Cross-station transfers are never invented. */
const CONNECTION_HUB_MINUTES={
  BHM:12,MAN:12,LDS:12,EDB:12,GLC:12,GLQ:12,NCL:12,YRK:12,SHF:12,RDG:12,BRI:12,CDF:12,
  EUS:12,KGX:12,STP:12,PAD:12,WAT:12,VIC:12,LBG:12,LST:12,CHX:12,MYB:12,CLJ:12
};
"""
)

provider_block = r'''function connectionMinimum(crs){return CONNECTION_HUB_MINUTES[String(crs||'').toUpperCase()]||10;}
function callMinute(baseDate,row,call,value){
  const minute=parseMinutes(value);if(minute==null)return null;
  const actual=actualCallDate(row,call),base=new Date(`${baseDate}T12:00:00Z`),at=new Date(`${actual}T12:00:00Z`);
  if(Number.isNaN(base.getTime())||Number.isNaN(at.getTime()))return minute;
  return Math.round((at-base)/86400000)*1440+minute;
}
function rowIdentity(row){return String(row&&((row[0]||row[1]||row[2]))||'');}
function legFromRow(row,fromIndex,toIndex,locations,manifest,date){
  const calls=Array.isArray(row&&row[5])?row[5]:[];
  if(fromIndex<0||toIndex<=fromIndex||toIndex>=calls.length)return null;
  const originCall=calls[fromIndex],targetCall=calls[toIndex],terminusCall=calls[calls.length-1];
  const dep=originCall[2]||originCall[1]||'',arr=targetCall[1]||targetCall[2]||'';
  const departureMinute=callMinute(date,row,originCall,dep),arrivalMinute=callMinute(date,row,targetCall,arr);
  if(departureMinute==null||arrivalMinute==null||arrivalMinute<=departureMinute)return null;
  const from=location(locations,originCall[0]),to=location(locations,targetCall[0]);
  const terminus=location(locations,terminusCall&&terminusCall[0]);
  const serviceOrigin=location(locations,calls[0]&&calls[0][0]);
  return {
    std:dep,departure:dep,arrival:arr,platform:originCall[3]||'',arrivalPlatform:targetCall[3]||'',
    operator:operatorName(manifest,row[3]),operatorCode:row[3]||'',serviceID:row[0]||'',serviceId:row[0]||'',uid:row[1]||'',trainId:row[2]||'',
    origin:[{locationName:serviceOrigin.name,crs:serviceOrigin.crs}],
    destination:[{locationName:terminus.name,crs:terminus.crs}],
    routeDestination:to,serviceTerminus:terminus,from,to,
    departureMinute,arrivalMinute,scheduledOnly:true,isCancelled:false,length:0
  };
}
function originIndexFor(row,fromCode,date){
  const calls=Array.isArray(row&&row[5])?row[5]:[];
  for(let i=0;i<calls.length-1;i++){
    const call=calls[i];
    if(call&&call[0]===fromCode&&actualCallDate(row,call)===date)return i;
  }
  return -1;
}
function destinationIndexAfter(row,toCode,start){
  const calls=Array.isArray(row&&row[5])?row[5]:[];
  for(let i=start+1;i<calls.length;i++)if(calls[i]&&calls[i][0]===toCode)return i;
  return -1;
}
function servicesFromRows(rows,locations,manifest,{from,to,date,departAfter}){
  const fromCode=String(from||'').toUpperCase(),toCode=String(to||'').toUpperCase(),after=parseMinutes(departAfter);
  if(!/^[A-Z0-9]{3}$/.test(fromCode)||!/^[A-Z0-9]{3}$/.test(toCode)||fromCode===toCode)return[];
  const found=[];
  for(const row of Array.isArray(rows)?rows:[]){
    const originIndex=originIndexFor(row,fromCode,date);if(originIndex<0)continue;
    const destinationIndex=destinationIndexAfter(row,toCode,originIndex);if(destinationIndex<0)continue;
    const leg=legFromRow(row,originIndex,destinationIndex,locations,manifest,date);if(!leg)continue;
    if(after!=null&&leg.departureMinute<after)continue;
    found.push({...leg,journeyType:'direct',changes:0,totalMinutes:leg.arrivalMinute-leg.departureMinute,rankScore:leg.arrivalMinute});
  }
  found.sort((a,b)=>a.departureMinute-b.departureMinute||a.arrivalMinute-b.arrivalMinute);
  return found.slice(0,MAX_RESULTS);
}
function departureIndexForRows(rows,date){
  const index=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const calls=Array.isArray(row&&row[5])?row[5]:[];
    for(let i=0;i<calls.length-1;i++){
      const call=calls[i],value=call&&(call[2]||call[1])||'',minute=callMinute(date,row,call,value);
      if(!call||minute==null||minute<0||minute>2879)continue;
      const code=String(call[0]||'').toUpperCase();if(!code)continue;
      const list=index.get(code)||[];list.push({row,callIndex:i,departureMinute:minute});index.set(code,list);
    }
  }
  for(const list of index.values())list.sort((a,b)=>a.departureMinute-b.departureMinute);
  return index;
}
function lowerBound(list,value){let lo=0,hi=list.length;while(lo<hi){const mid=(lo+hi)>>1;if(list[mid].departureMinute<value)lo=mid+1;else hi=mid;}return lo;}
function connectionRiskFor(minutes,minimum){
  if(!Number.isFinite(minutes))return'scheduled';
  if(minutes<minimum)return'at-risk';
  if(minutes<minimum+5)return'tight';
  return'good';
}
function connectionQuality(minutes,minimum){const margin=minutes-minimum;return margin<5?'tight':minutes>45?'long':'comfortable';}
function connectionsFromRows(rows,locations,manifest,{from,to,date,departAfter}){
  const fromCode=String(from||'').toUpperCase(),toCode=String(to||'').toUpperCase(),after=parseMinutes(departAfter);
  if(!/^[A-Z0-9]{3}$/.test(fromCode)||!/^[A-Z0-9]{3}$/.test(toCode)||fromCode===toCode)return[];
  const departures=departureIndexForRows(rows,date),first=[];
  for(const row of Array.isArray(rows)?rows:[]){
    const originIndex=originIndexFor(row,fromCode,date);if(originIndex<0)continue;
    const calls=Array.isArray(row&&row[5])?row[5]:[],call=calls[originIndex],dep=call&&(call[2]||call[1])||'';
    const departureMinute=callMinute(date,row,call,dep);if(departureMinute==null)continue;
    if(after!=null&&departureMinute<after)continue;
    first.push({row,calls,originIndex,departureMinute});
  }
  first.sort((a,b)=>a.departureMinute-b.departureMinute);
  const found=[],seen=new Set();
  for(const candidate of first.slice(0,CONNECTION_FIRST_LEGS)){
    let choices=0;
    for(let changeIndex=candidate.originIndex+1;changeIndex<candidate.calls.length;changeIndex++){
      const changeCall=candidate.calls[changeIndex],changeCode=String(changeCall&&changeCall[0]||'').toUpperCase();
      if(!changeCode||changeCode===fromCode||changeCode===toCode)continue;
      const arrivalValue=changeCall[1]||changeCall[2]||'',arrivalMinute=callMinute(date,candidate.row,changeCall,arrivalValue);
      if(arrivalMinute==null||arrivalMinute<=candidate.departureMinute||arrivalMinute-candidate.departureMinute>CONNECTION_MAX_TOTAL)continue;
      const minimum=connectionMinimum(changeCode),earliest=arrivalMinute+minimum,latest=arrivalMinute+CONNECTION_MAX_WAIT;
      const list=departures.get(changeCode)||[];let pos=lowerBound(list,earliest),examined=0;
      for(;pos<list.length&&list[pos].departureMinute<=latest&&examined<CONNECTION_SECOND_CHOICES;pos++,examined++){
        const second=list[pos];if(rowIdentity(second.row)===rowIdentity(candidate.row))continue;
        const destinationIndex=destinationIndexAfter(second.row,toCode,second.callIndex);if(destinationIndex<0)continue;
        const firstLeg=legFromRow(candidate.row,candidate.originIndex,changeIndex,locations,manifest,date);
        const secondLeg=legFromRow(second.row,second.callIndex,destinationIndex,locations,manifest,date);
        if(!firstLeg||!secondLeg)continue;
        const connectionMinutes=second.departureMinute-arrivalMinute,totalMinutes=secondLeg.arrivalMinute-candidate.departureMinute;
        if(connectionMinutes<minimum||connectionMinutes>CONNECTION_MAX_WAIT||totalMinutes<=0||totalMinutes>CONNECTION_MAX_TOTAL)continue;
        const key=`${firstLeg.serviceID}|${changeCode}|${secondLeg.serviceID}`;if(seen.has(key))continue;seen.add(key);
        const interchange=location(locations,changeCode),operators=[...new Set([firstLeg.operator,secondLeg.operator].filter(Boolean))];
        const margin=connectionMinutes-minimum,tightPenalty=margin<5?(5-margin)*4:0,longPenalty=connectionMinutes>45?(connectionMinutes-45)*.5:0;
        found.push({
          journeyType:'connection',changes:1,std:firstLeg.std,departure:firstLeg.std,arrival:secondLeg.arrival,
          platform:firstLeg.platform,arrivalPlatform:secondLeg.arrivalPlatform,
          operator:operators.join(' + ')||'Scheduled services',operatorCode:firstLeg.operatorCode||'',
          serviceID:`connection:${firstLeg.serviceID}:${changeCode}:${secondLeg.serviceID}`,
          serviceId:`connection:${firstLeg.serviceID}:${changeCode}:${secondLeg.serviceID}`,
          origin:firstLeg.origin,destination:[{locationName:secondLeg.routeDestination.name,crs:secondLeg.routeDestination.crs}],
          routeDestination:secondLeg.routeDestination,serviceTerminus:secondLeg.routeDestination,
          departureMinute:candidate.departureMinute,arrivalMinute:secondLeg.arrivalMinute,totalMinutes,
          connectionMinutes,minimumConnectionMinutes:minimum,
          interchange:{...interchange,arrival:firstLeg.arrival,departure:secondLeg.std,minutes:connectionMinutes,minimum,margin,quality:connectionQuality(connectionMinutes,minimum)},
          legs:[firstLeg,secondLeg],rankScore:secondLeg.arrivalMinute+12+tightPenalty+longPenalty,
          scheduledOnly:true,isCancelled:false,length:0
        });
        choices++;
        if(choices>=3)break;
      }
      if(choices>=3)break;
    }
  }
  found.sort((a,b)=>a.rankScore-b.rankScore||a.departureMinute-b.departureMinute);
  return found.slice(0,MAX_RESULTS);
}
function connectionDominated(connection,directs){
  return directs.some(direct=>{
    const depGap=direct.departureMinute-connection.departureMinute;
    return depGap>=-5&&depGap<=20&&direct.arrivalMinute<=connection.arrivalMinute+15;
  });
}
function journeysFromRows(rows,locations,manifest,options){
  const direct=servicesFromRows(rows,locations,manifest,options);
  const connections=connectionsFromRows(rows,locations,manifest,options).filter(item=>!connectionDominated(item,direct));
  return [...direct,...connections]
    .sort((a,b)=>a.departureMinute-b.departureMinute||a.changes-b.changes||a.rankScore-b.rankScore||a.arrivalMinute-b.arrivalMinute)
    .slice(0,MAX_RESULTS);
}

const timetableProvider={
  state:dataState,
  async getCoverage(options={}){return loadManifest(options);},
  async refreshCoverage(){return loadManifest({force:true});},
  async getServices({from,to,date,departAfter='00:00'}){
    const manifest=await loadManifest();
    if(!manifest||!Array.isArray(manifest.dates)||!manifest.dates.includes(date))return[];
    const [locations,rows]=await Promise.all([loadLocations(),loadDate(date)]);
    return journeysFromRows(rows,locations,manifest,{from,to,date,departAfter});
  },
  servicesFromRows,connectionsFromRows,journeysFromRows,connectionMinimum,connectionRiskFor
};
window.__KERBSIDE_TIMETABLE_PROVIDER__=timetableProvider;'''
replace_span(
    path,
    'function servicesFromRows(rows,locations,manifest,{from,to,date,departAfter}){',
    'window.__KERBSIDE_TIMETABLE_PROVIDER__=timetableProvider;',
    provider_block
)

normalise_block = r'''function normaliseLeg(item){
  const routeTarget=item.routeDestination||item.to||null;
  return {
    std:item.std||item.departure||'',etd:item.etd||'',arrival:item.arrival||'',platform:item.platform||'',scheduledPlatform:item.platform||'',arrivalPlatform:item.arrivalPlatform||'',
    destination:item.destination||[],displayDestination:item.serviceTerminus||((item.destination&&item.destination[0])||routeTarget)||null,
    origin:item.origin||[],operator:item.operator||'',operatorCode:item.operatorCode||'',length:Number(item.length)||0,isCancelled:!!item.isCancelled,
    serviceID:item.serviceID||item.serviceId||item.uid||'',uid:item.uid||'',trainId:item.trainId||'',from:item.from||null,to:item.to||routeTarget||null,
    departureMinute:Number(item.departureMinute),arrivalMinute:Number(item.arrivalMinute),scheduledOnly:true,liveEvidence:false,liveVia:'',cancelReason:'',delayReason:''
  };
}
function normalise(item){
  const routeTarget=item.routeDestination||null,connection=item.journeyType==='connection'||(Number(item.changes)===1&&Array.isArray(item.legs));
  const legs=connection?(item.legs||[]).map(normaliseLeg):[];
  return {
    /* etd stays empty until the overlay supplies one. The old build
       hardcoded 'On time', which told Forecast v3 that a train three days
       out was running to time and made the row indistinguishable from a
       live one. */
    std:item.std||item.departure||item.departureTime||'',etd:'',arrival:item.arrival||'',platform:item.platform||'',
    scheduledPlatform:item.platform||'',arrivalPlatform:item.arrivalPlatform||'',
    destination:routeTarget?[{locationName:routeTarget.name||routeTarget.locationName||'',crs:routeTarget.crs||''}]:(item.destination||[{locationName:item.destinationName||'',crs:item.destinationCrs||''}]),
    displayDestination:connection?(routeTarget||item.serviceTerminus||null):(item.serviceTerminus||((item.destination&&item.destination[0])||routeTarget)||null),
    origin:item.origin||[],operator:item.operator||item.operatorName||'',operatorCode:item.operatorCode||'',length:Number(item.length)||0,
    isCancelled:!!item.isCancelled,serviceID:item.serviceID||item.serviceId||item.uid||'',uid:item.uid||'',trainId:item.trainId||'',
    journeyType:connection?'connection':'direct',changes:connection?1:0,legs,interchange:item.interchange?{...item.interchange}:null,
    connectionMinutes:Number(item.connectionMinutes)||0,minimumConnectionMinutes:Number(item.minimumConnectionMinutes)||0,totalMinutes:Number(item.totalMinutes)||0,
    departureMinute:Number(item.departureMinute),arrivalMinute:Number(item.arrivalMinute),rankScore:Number(item.rankScore)||0,
    liveConnectionMinutes:null,liveInterchangeArrival:'',connectionRisk:'scheduled',
    scheduledOnly:true,liveEvidence:false,liveVia:'',cancelReason:'',delayReason:''
  };
}'''
replace_span(path, 'function normalise(item){', '\n/* A live-only service:', normalise_block + '\n/* A live-only service:')

forecast_block = r'''function forecastOne(service,index,services,station=route().from,messages=liveMessages()){const v3=window.__KERBSIDE_FORECAST_V3__,api=window.__KERBSIDE_TRAINS__,date=new Date(`${route().date}T12:00:00`);if(v3&&typeof v3.forecast==='function')return v3.forecast(service,index,services,{station,referenceDate:date,messages});if(api&&typeof api.crowdingForecast==='function')return api.crowdingForecast(service,index,services,{station,referenceDate:date,messages});return {label:'Moderate',level:'moderate',confidence:'Low',reasons:['service time and route demand baseline']};}
function confidenceFloor(results){const rank={Low:0,Medium:1,'Medium-high':2,High:3};let best=3;for(const result of results){const value=rank[result&&result.confidence];if(Number.isFinite(value))best=Math.min(best,value);}return Object.keys(rank).find(key=>rank[key]===best)||'Low';}
function forecastConnection(service){
  const legs=Array.isArray(service&&service.legs)?service.legs:[];if(!legs.length)return forecastOne(service,0,[service]);
  const results=legs.map((leg,index)=>forecastOne(leg,index,legs,leg.from||route().from,index===0?liveMessages():[]));
  if(results[0]&&results[0].cancelled)return {...results[0],reasons:['the first train in this connection is cancelled'],journeyLegResults:results,peakLeg:0};
  let peakLeg=0,peakScore=-Infinity;results.forEach((result,index)=>{const score=Number(result&&result.score);if(Number.isFinite(score)&&score>peakScore){peakScore=score;peakLeg=index;}});
  const peak=results[peakLeg]||results[0],leg=legs[peakLeg]||{},from=displayName(leg.from,'first leg'),to=displayName(leg.to,'interchange');
  return {...peak,confidence:confidenceFloor(results),reasons:[`Peak crowding is forecast on ${from} → ${to}`,...(peak.reasons||[])].slice(0,6),journeyLegResults:results,peakLeg};
}
function forecast(service,index,services){return service&&service.journeyType==='connection'?forecastConnection(service):forecastOne(service,index,services);}'''
replace_span(path, 'function forecast(service,index,services){', '\nfunction coverageNote(', forecast_block + '\nfunction coverageNote(')

# Add connection presentation helpers immediately after serviceDateLabel.
replace_once(
    path,
    "function serviceDateLabel(mode,date=state.sourceDate||route().date){return mode==='advance'&&date?dateLabel(date,{short:true}).replace(/,/g,''):'';}\n",
    r'''function serviceDateLabel(mode,date=state.sourceDate||route().date){return mode==='advance'&&date?dateLabel(date,{short:true}).replace(/,/g,''):'';}
function connectionBufferMinutes(arrival,departure){const a=parseMinutes(arrival),d=parseMinutes(departure);if(a==null||d==null)return null;let span=d-a;while(span<0)span+=1440;return span;}
function connectionRiskFor(minutes,minimum){return timetableProvider.connectionRiskFor(minutes,minimum);}
function connectionChangeText(service){const live=Number.isFinite(service&&service.liveConnectionMinutes)?service.liveConnectionMinutes:null,value=live==null?Number(service&&service.connectionMinutes)||0:live;return `${live==null?'': 'live '}${value}m change`;}
function connectionWarning(service){
  if(!service||service.journeyType!=='connection'||!Number.isFinite(service.liveConnectionMinutes))return'';
  const change=displayName(service.interchange,'the interchange'),minimum=Number(service.minimumConnectionMinutes)||10,minutes=service.liveConnectionMinutes,arrival=service.liveInterchangeArrival?` at ${service.liveInterchangeArrival}`:'';
  if(service.connectionRisk==='at-risk')return `Live first-leg evidence reaches ${change}${arrival}, leaving ${minutes} minutes for the change — below Kerbside's ${minimum}-minute planning buffer. The onward train is still timetabled, so treat this connection as at risk.`;
  if(service.connectionRisk==='tight')return `Live first-leg evidence leaves ${minutes} minutes at ${change}, only ${minutes-minimum} minutes above Kerbside's ${minimum}-minute planning buffer.`;
  return'';
}
function connectionItineraryMarkup(service,result){
  if(!service||service.journeyType!=='connection'||!Array.isArray(service.legs))return'';
  const results=Array.isArray(result&&result.journeyLegResults)?result.journeyLegResults:[];
  const legs=service.legs.map((leg,index)=>{
    const crowd=results[index]||{label:'Forecast pending',level:'unknown',confidence:'Low'};
    const from=displayName(leg.from,'Departure'),to=displayName(leg.to,'Destination');
    const platform=leg.platform?`Plat ${leg.platform}`:'Plat TBC';
    const train=leg.trainId?` · ${leg.trainId}`:'';
    return `<div class="train-connection-leg"><span class="train-connection-time"><b>${esc(leg.std||'—')}</b><small>${esc(leg.arrival||'—')}</small></span><span class="train-connection-route"><b>${esc(`${from} → ${to}`)}</b><small>${esc(`${leg.operator||'Scheduled service'}${train} · ${platform}`)}</small></span><span class="train-connection-crowd crowd-${esc(crowd.level||'unknown')}"><i></i><b>${esc(crowd.label||'Forecast pending')}</b><small>${esc(`${crowd.confidence||'Low'} confidence`)}</small></span></div>`;
  });
  const change=service.interchange||{},minutes=Number.isFinite(service.liveConnectionMinutes)?service.liveConnectionMinutes:Number(service.connectionMinutes)||0,minimum=Number(service.minimumConnectionMinutes)||10,risk=service.connectionRisk||change.quality||'scheduled';
  const changeRow=`<div class="train-connection-change connection-risk-${esc(risk)}"><span>Change at ${esc(displayName(change,'interchange'))}</span><b>${esc(`${minutes} min`)}</b><small>Kerbside planning buffer: ${esc(`${minimum} min minimum`)}${Number.isFinite(service.liveConnectionMinutes)?' · live first-leg arrival':''}</small></div>`;
  return `<div class="train-connection-itinerary"><div class="train-detail-title">Journey plan</div>${legs[0]||''}${changeRow}${legs[1]||''}</div>`;
}
'''
)

merge_block = r'''function clearConnectionLive(service){
  if(!service||service.journeyType!=='connection')return false;const first=service.legs&&service.legs[0];
  const had=!!(service.liveEvidence||Number.isFinite(service.liveConnectionMinutes)||service.connectionRisk!=='scheduled');
  if(first){first.etd='';first.platform=first.scheduledPlatform||first.platform;first.isCancelled=false;first.length=0;first.liveEvidence=false;first.liveVia='';first.cancelReason='';first.delayReason='';first.previousCallingPoints=null;first.subsequentCallingPoints=null;}
  service.etd='';service.platform=service.scheduledPlatform||service.platform;service.isCancelled=false;service.length=0;service.liveEvidence=false;service.liveVia='';service.cancelReason='';service.delayReason='';service.liveConnectionMinutes=null;service.liveInterchangeArrival='';service.connectionRisk='scheduled';
  return had;
}
function applyEvidence(target,evidence){
  target.etd=evidence.etd;if(evidence.platform)target.platform=evidence.platform;target.isCancelled=evidence.isCancelled;target.length=evidence.length;
  target.cancelReason=evidence.cancelReason;target.delayReason=evidence.delayReason;target.serviceIdUrlSafe=evidence.serviceIdUrlSafe;target.serviceIdGuid=evidence.serviceIdGuid;
  if(evidence.serviceID)target.liveServiceID=evidence.serviceID;if(evidence.previousCallingPoints)target.previousCallingPoints=evidence.previousCallingPoints;if(evidence.subsequentCallingPoints)target.subsequentCallingPoints=evidence.subsequentCallingPoints;
  target.liveEvidence=true;target.liveVia=evidence.via;
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
      const first=service.legs&&service.legs[0],second=service.legs&&service.legs[1],evidence=first?overlay.evidenceFor(first):null;
      if(!evidence){if(clearConnectionLive(service))changed=true;return;}
      matched.push(evidence.index);
      const before=`${service.etd}|${service.platform}|${service.isCancelled}|${service.length}|${service.liveConnectionMinutes}|${service.connectionRisk}`;
      applyEvidence(first,evidence);service.etd=first.etd;if(evidence.platform)service.platform=evidence.platform;service.isCancelled=first.isCancelled;service.length=first.length;service.cancelReason=first.cancelReason;service.delayReason=first.delayReason;service.liveEvidence=true;service.liveVia=`first-leg-${evidence.via}`;
      const points=overlay.flattenCallingPoints(evidence.subsequentCallingPoints),crs=String(service.interchange&&service.interchange.crs||'').toUpperCase(),point=points.find(item=>String(item&&item.crs||'').toUpperCase()===crs);
      const expected=String(point&&(point.at||point.et||point.st)||'').trim(),minutes=second&&expected?connectionBufferMinutes(expected,second.std):null,minimum=Number(service.minimumConnectionMinutes)||10;
      service.liveInterchangeArrival=expected;service.liveConnectionMinutes=Number.isFinite(minutes)?minutes:null;service.connectionRisk=service.isCancelled?'at-risk':connectionRiskFor(minutes,minimum);
      if(before!==`${service.etd}|${service.platform}|${service.isCancelled}|${service.length}|${service.liveConnectionMinutes}|${service.connectionRisk}`)changed=true;
      return;
    }
    const evidence=overlay.evidenceFor(service);
    if(!evidence){
      if(service.liveEvidence){service.liveEvidence=false;service.liveVia='';service.etd='';service.platform=service.scheduledPlatform||service.platform;service.isCancelled=false;service.length=0;service.cancelReason='';service.delayReason='';changed=true;}
      return;
    }
    matched.push(evidence.index);
    const before=`${service.etd}|${service.platform}|${service.isCancelled}|${service.length}`;
    applyEvidence(service,evidence);
    if(before!==`${service.etd}|${service.platform}|${service.isCancelled}|${service.length}`)changed=true;
  });
  /* Short-notice additions Darwin is running but the snapshot predates.
     extraServices() only returns those whose calling points prove they
     reach the destination, so an unfiltered fallback board cannot inject
     trains that never go there. */
  const existing=new Set(state.services.filter(s=>s.liveOnly).map(s=>String(s.serviceID||'')));
  const extras=overlay.extraServices(matched,toCrs)
    .map(({service})=>normaliseLive(service,toCrs))
    .filter(row=>row.std&&!existing.has(String(row.serviceID||'')));
  if(extras.length){
    state.services=state.services.concat(extras)
      .sort((a,b)=>(parseMinutes(a.std)??9999)-(parseMinutes(b.std)??9999));
    changed=true;
  }
  return changed;
}'''
replace_span(path, 'function mergeOverlay(){', '\n\n/* The status line under the departure time.', merge_block + '\n\n/* The status line under the departure time.')

status_block = r'''function statusFor(service){
  if(service.isCancelled)return {label:'Cancelled',cls:'cancelled'};
  if(service.journeyType==='connection'){
    if(service.connectionRisk==='at-risk')return {label:'Connection at risk',cls:'late'};
    if(service.connectionRisk==='tight')return {label:'Tight change',cls:'late'};
    return {label:'1 change',cls:'connection'};
  }
  if(!service.liveEvidence)return {label:'Timetabled',cls:'timetabled'};
  const etd=String(service.etd||'').trim();
  if(!etd||/^on time$/i.test(etd))return {label:'On time',cls:'ontime'};
  if(/^\d{1,2}:\d{2}$/.test(etd)){
    const late=parseMinutes(etd),planned=parseMinutes(service.std);
    let delay=late!=null&&planned!=null?late-planned:null;
    if(delay!=null&&delay<-720)delay+=1440;
    if(delay!=null&&delay>720)delay-=1440;
    return {label:`Expected ${etd}`,cls:delay!=null&&delay>=5?'late':'ontime'};
  }
  if(/delay/i.test(etd))return {label:etd,cls:'late'};
  return {label:etd,cls:'ontime'};
}'''
replace_span(path, 'function statusFor(service){', '\nfunction modeNote(mode){', status_block + '\nfunction modeNote(mode){')

calling_block = r'''function callingMarkup(service){
  const overlay=window.__KERBSIDE_TRAIN_OVERLAY__,target=service&&service.journeyType==='connection'&&service.legs&&service.legs[0]?service.legs[0]:service;
  if(!overlay||!target||!target.liveEvidence)return '';
  const ahead=overlay.flattenCallingPoints(target.subsequentCallingPoints);
  if(!ahead.length)return '';
  const rows=ahead.slice(0,12).map(point=>{
    const when=String(point.et||point.st||'').trim();
    const cancelled=!!point.isCancelled;
    return `<div class="train-call ahead${cancelled?' cancelled':''}"><i></i><span><b>${esc(point.locationName||point.crs||'Station')}</b><small>${esc(when)}${cancelled?' · cancelled':''}</small></span></div>`;
  }).join('');
  return `<div class="train-calling"><div class="train-detail-title">First-leg calling points</div>${rows}</div>`;
}'''
replace_span(path, 'function callingMarkup(service){', '\nfunction sourceNote(service){', calling_block + '\nfunction sourceNote(service){')

source_block = r'''function sourceNote(service){
  if(service.liveOnly)return 'Added by National Rail Darwin after this timetable snapshot was published. Live evidence only.';
  if(service.journeyType==='connection'){
    const minimum=Number(service.minimumConnectionMinutes)||10;
    if(service.liveEvidence)return `Both legs are timetabled from the National Rail Darwin Timetable Files. Live Darwin evidence is applied to the first train from the departure station; the onward train remains scheduled. The connection uses Kerbside's ${minimum}-minute planning buffer, not an official National Rail minimum-connection-time feed.`;
    return `Both legs are timetabled from the National Rail Darwin Timetable Files. This one-change result uses Kerbside's conservative ${minimum}-minute planning buffer; official station minimum connection times are not included in this snapshot.`;
  }
  if(service.liveEvidence)return `Timetabled from the National Rail Darwin Timetable Files, matched to live Darwin data by ${service.liveVia==='rid'?'service ID':service.liveVia==='uid'?'schedule UID':service.liveVia==='headcode'?'headcode':'departure time'}.`;
  return 'Timetabled from the National Rail Darwin Timetable Files. Live expected times, platform changes, cancellations and formation are added automatically once this service enters the live Darwin window.';
}'''
replace_span(path, 'function sourceNote(service){', '\nfunction serviceMarkup(', source_block + '\nfunction serviceMarkup(')

service_markup = r'''function serviceMarkup(service,index,forecastResult,{mode,destinationFallback,explains}){
  const key=serviceKey(service,index),open=!!state.openId&&state.openId===key,connection=service.journeyType==='connection';
  const explain=explainMarkup(forecastResult,mode);
  if(Array.isArray(explains))explains.push(explain);
  const terminus=connection?displayName(service.displayDestination,destinationFallback):terminusText(service,destinationFallback);
  const duration=service.totalMinutes?durationLabel('00:00',`${String(Math.floor(service.totalMinutes/60)%24).padStart(2,'0')}:${String(service.totalMinutes%60).padStart(2,'0')}`):durationLabel(service.std,service.arrival);
  const status=statusFor(service),line=[];
  if(connection){
    line.push(`via ${displayName(service.interchange,'interchange')}`);
    line.push(connectionChangeText(service));
    if(service.arrival)line.push(`arr ${service.arrival}`);
  }else{
    line.push(service.operator||'Scheduled service');
    if(service.arrival)line.push(`arr ${service.arrival}`);
    line.push(service.platform?`Plat ${service.platform}`:'Plat TBC');
    if(service.liveOnly)line.push('extra service');
  }
  const arrivesLabel=duration?`Arrives · ${duration}`:'Arrives';
  const warning=connection?connectionWarning(service):'';
  const disruption=service.isCancelled
    ?`This service is cancelled.${service.cancelReason?` ${service.cancelReason}.`:''} Its knock-on demand is included in the trains either side of it.`
    :(warning||(service.delayReason?`${service.delayReason}.`:''));
  const formation=Number(service.length)||0;
  const serviceDate=serviceDateLabel(mode);
  const rightLabel=connection?`${service.connectionMinutes}m`:(formation?`${formation} coach${formation===1?'':'es'}`:(duration||'—'));
  const rightNote=connection?'scheduled change':(formation?'formation':(duration?'journey time':'duration unknown'));
  const crowdNote=service.isCancelled?'service cancelled':connection?`${forecastResult.confidence} confidence · peak leg`:`${forecastResult.confidence} confidence`;
  const detailGrid=connection
    ?`<div class="train-detail-grid"><div><span>Depart</span><b>${esc(`${service.std||'—'} · ${displayName(service.legs&&service.legs[0]&&service.legs[0].from,'Departure')}`)}</b></div><div><span>Change</span><b>${esc(displayName(service.interchange,'Interchange'))}</b></div><div><span>Connection</span><b>${esc(connectionChangeText(service))}</b></div><div><span>Arrive</span><b>${esc(`${service.arrival||'—'} · ${destinationFallback}`)}</b></div></div>`
    :`<div class="train-detail-grid"><div><span>From</span><b>${esc(originText(service))}</b></div><div><span>Operator</span><b>${esc(service.operator||'Unknown')}</b></div><div><span>Platform</span><b>${esc(service.platform||'TBC')}</b></div><div><span>${esc(arrivesLabel)}</span><b>${esc(service.arrival||'Not timetabled')}</b></div></div>`;
  return `<article class="train-service train-scheduled-service${connection?' train-connection-service':''}${open?' open':''}" data-service-id="${esc(key)}">
      <button class="train-service-summary" type="button" data-scheduled-toggle="${esc(key)}" aria-expanded="${open?'true':'false'}" aria-controls="train-scheduled-detail-${esc(key)}">
        <span class="train-time"><b>${esc(service.std||'—')}</b><small class="train-status train-status-${esc(status.cls)}">${esc(status.label)}</small>${serviceDate?`<small class="train-service-date">${esc(serviceDate)}</small>`:''}</span>
        <span class="train-route"><strong>${esc(terminus)}</strong><small>${esc(line.join(' · '))}</small></span>
        <span class="train-crowding crowd-${esc(forecastResult.level)}" title="${esc((forecastResult.reasons||[]).join(', '))}"><i></i><b>${esc(forecastResult.label)}</b><small>${esc(crowdNote)}</small></span>
        <span class="train-formation"><b>${esc(rightLabel)}</b><small>${esc(rightNote)}</small></span>
        <span class="train-chevron" aria-hidden="true">⌄</span>
      </button>
      <div class="train-service-detail" id="train-scheduled-detail-${esc(key)}"${open?'':' hidden'}>
        ${detailGrid}
        ${connection?connectionItineraryMarkup(service,forecastResult):''}
        <div class="train-crowding-explain crowd-${esc(forecastResult.level)}">${explain}</div>
        ${disruption?`<div class="train-detail-note train-detail-warn">${esc(disruption)}</div>`:''}
        ${callingMarkup(service)}
        <div class="train-detail-note">${esc(sourceNote(service))}</div>
      </div>
    </article>`;
}'''
replace_span(path, 'function serviceMarkup(service,index,forecastResult,{mode,destinationFallback,explains}){', '\nfunction renderServices(', service_markup + '\nfunction renderServices(')

# Empty state and provenance now describe both direct and one-change results.
replace_once(path, '<strong>No scheduled direct services found</strong><span>${esc(coverage||\'The timetable snapshot returned no matching direct trains for this journey, date and departure time.\')}</span>', '<strong>No suitable direct or one-change journeys found</strong><span>${esc(coverage||\'The timetable snapshot returned no matching journeys for this date and departure time.\')}</span>')
replace_once(path, 'Scheduled services come from National Rail Darwin Timetable Files. Live delays, cancellations and formations take precedence when LDB data is available.', "Scheduled journey options come from National Rail Darwin Timetable Files. One-change results use conservative Kerbside interchange buffers rather than the official minimum-connection-time dataset. Live delays, cancellations and formations take precedence when LDB data is available.")

# Refresh the connection-specific crowding labels when Forecast v3 inputs land.
replace_once(
    path,
    """      if(crowd.title!==title){crowd.title=title;changed=true;}\n    }\n    const explain=article.querySelector('.train-crowding-explain');\n""",
    """      if(crowd.title!==title){crowd.title=title;changed=true;}\n    }\n    if(service.journeyType==='connection'&&Array.isArray(result.journeyLegResults)){\n      article.querySelectorAll('.train-connection-crowd').forEach((legEl,legIndex)=>{\n        const legResult=result.journeyLegResults[legIndex];if(!legResult)return;\n        const cls=`train-connection-crowd crowd-${legResult.level||'unknown'}`,b=legEl.querySelector('b'),small=legEl.querySelector('small');\n        if(legEl.className!==cls){legEl.className=cls;changed=true;}\n        if(b&&b.textContent!==legResult.label){b.textContent=legResult.label;changed=true;}\n        const note=`${legResult.confidence||'Low'} confidence`;if(small&&small.textContent!==note){small.textContent=note;changed=true;}\n      });\n    }\n    const explain=article.querySelector('.train-crowding-explain');\n"""
)
replace_once(
    path,
    "const conf=service.isCancelled?'service cancelled':`${result.confidence} confidence`;",
    "const conf=service.isCancelled?'service cancelled':service.journeyType==='connection'?`${result.confidence} confidence · peak leg`:`${result.confidence} confidence`;"
)

# Expose the connection helpers to deterministic tests.
replace_once(
    path,
    'window.__KERBSIDE_TRAIN_TIMETABLE__={state,load,loadSameDay,sync,renderServices,renderUnavailable,setHeader,refreshForecasts,refreshEdgeManifest,toggleService,serviceKey,journeyMode,mergeOverlay,statusFor,serviceDateLabel,requestOverlay,coverageIncludesTime,provider:timetableProvider};',
    'window.__KERBSIDE_TRAIN_TIMETABLE__={state,load,loadSameDay,sync,renderServices,renderUnavailable,setHeader,refreshForecasts,refreshEdgeManifest,toggleService,serviceKey,journeyMode,mergeOverlay,statusFor,serviceDateLabel,requestOverlay,coverageIncludesTime,connectionBufferMinutes,connectionRiskFor,provider:timetableProvider};'
)


# ---------------------------------------------------------------------------
# Connection itinerary styles. Summary rows retain the 0.7.46 spacing fix.
css = 'kerbside-trains.css'
replace_once(css, '.train-status-timetabled{color:var(--text-mute)}\n', '.train-status-timetabled{color:var(--text-mute)}\n.train-status-connection{color:var(--led)}\n')
replace_once(
    css,
    ".train-detail-warn{color:var(--warn-soft)!important}\n",
    r'''.train-detail-warn{color:var(--warn-soft)!important}
.train-connection-itinerary{
  display:grid;gap:8px;margin:0 0 12px;padding:12px;border:1px solid var(--rule);border-radius:10px;background:var(--ink)
}
.train-connection-itinerary .train-detail-title{margin-bottom:1px}
.train-connection-leg{display:grid;grid-template-columns:58px minmax(0,1fr) minmax(115px,.45fr);gap:10px;align-items:center;min-width:0}
.train-connection-time,.train-connection-route,.train-connection-crowd{display:flex;flex-direction:column;min-width:0}
.train-connection-time b{font-family:'Martian Mono',ui-monospace,monospace;font-size:12px;color:var(--text)}
.train-connection-time small,.train-connection-route small,.train-connection-crowd small{margin-top:2px;color:var(--text-dim);font-size:9.5px;line-height:1.35}
.train-connection-route b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text);font-size:11.5px}
.train-connection-crowd{position:relative;padding-left:13px}
.train-connection-crowd>i{position:absolute;left:0;top:5px;width:7px;height:7px;border-radius:50%}
.train-connection-crowd b{font-size:10.5px;color:var(--text)}
.train-connection-change{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 10px;margin-left:28px;padding:8px 10px;border-left:2px solid var(--rule);background:var(--ink-2);color:var(--text-dim)}
.train-connection-change span{font-size:10px;font-weight:700;color:var(--text)}
.train-connection-change b{font-family:'Martian Mono',ui-monospace,monospace;font-size:10px;color:var(--text)}
.train-connection-change small{grid-column:1 / -1;font-size:9px;line-height:1.35;color:var(--text-mute)}
.train-connection-change.connection-risk-tight,.train-connection-change.connection-risk-at-risk{border-left-color:var(--warn)}
.train-connection-service .train-formation b{color:var(--led)}
'''
)
replace_once(
    css,
    "  .train-crowding-explain{padding:12px 11px}\n",
    """  .train-crowding-explain{padding:12px 11px}\n  .train-connection-itinerary{padding:10px;gap:7px}\n  .train-connection-leg{grid-template-columns:50px minmax(0,1fr);gap:8px}\n  .train-connection-crowd{grid-column:2;flex-direction:row;align-items:center;gap:5px;padding-left:12px}\n  .train-connection-crowd>i{top:5px}\n  .train-connection-crowd small{margin-top:0}\n  .train-connection-change{margin-left:20px}\n"""
)


# ---------------------------------------------------------------------------
# Unit coverage for one-change construction, buffers and ranking.
test_path='kerbside-backend/test/train-timetable-provider.test.js'
replace_once(
    test_path,
    "const locations={BHM:['Birmingham New Street','BHAMNWS',''],BRI:['Bristol Temple Meads','BRSTLTM',''],PLY:['Plymouth','PLYMTH','']};",
    "const locations={BHM:['Birmingham New Street','BHAMNWS',''],BRI:['Bristol Temple Meads','BRSTLTM',''],PLY:['Plymouth','PLYMTH',''],CNM:['Cheltenham Spa','CHLTNHM',''],GLO:['Gloucester','GLOSTER','']};"
)
replace_once(
    test_path,
    """  ['rid-2','uid-2','1A02','XC','2026-08-12',[[\"BHM\",\"\",\"08:42\",\"10\",0],[\"BRI\",\"10:02\",\"10:04\",\"4\",0],[\"PLY\",\"11:50\",\"\",\"\",0]]]\n];\n""",
    """  ['rid-2','uid-2','1A02','XC','2026-08-12',[[\"BHM\",\"\",\"08:42\",\"10\",0],[\"BRI\",\"10:02\",\"10:04\",\"4\",0],[\"PLY\",\"11:50\",\"\",\"\",0]]],\n  ['rid-change-a','uid-change-a','1C10','XC','2026-08-12',[[\"BHM\",\"\",\"09:05\",\"8\",0],[\"CNM\",\"09:45\",\"\",\"2\",0]]],\n  ['rid-change-tight','uid-change-tight','1G01','XC','2026-08-12',[[\"CNM\",\"\",\"09:52\",\"4\",0],[\"GLO\",\"10:25\",\"\",\"1\",0]]],\n  ['rid-change-b','uid-change-b','1G02','XC','2026-08-12',[[\"CNM\",\"\",\"10:00\",\"4\",0],[\"GLO\",\"10:32\",\"\",\"1\",0]]]\n];\n"""
)
insert_after = """test('direct services use schedule calls and respect depart-after',async()=>{\n  const provider=loadProvider();\n  const services=await provider.getServices({from:'BHM',to:'BRI',date:'2026-08-12',departAfter:'09:00'});\n  assert.equal(services.length,1);\n  assert.equal(services[0].std,'09:12');\n  assert.equal(services[0].arrival,'10:33');\n  assert.equal(services[0].operator,'CrossCountry');\n  assert.equal(services[0].routeDestination.crs,'BRI');\n  assert.equal(services[0].serviceTerminus.crs,'PLY');\n  assert.equal(services[0].scheduledOnly,true);\n});\n"""
new_tests = insert_after + r'''

test('one-change journeys use a conservative same-station interchange buffer',async()=>{
  const provider=loadProvider();
  const services=await provider.getServices({from:'BHM',to:'GLO',date:'2026-08-12',departAfter:'09:00'});
  assert.equal(services.length,1);
  const journey=services[0];
  assert.equal(journey.journeyType,'connection');
  assert.equal(journey.changes,1);
  assert.equal(journey.interchange.crs,'CNM');
  assert.equal(journey.connectionMinutes,15);
  assert.equal(journey.minimumConnectionMinutes,10);
  assert.equal(journey.legs[0].std,'09:05');
  assert.equal(journey.legs[0].arrival,'09:45');
  assert.equal(journey.legs[1].std,'10:00');
  assert.equal(journey.arrival,'10:32');
  assert.equal(journey.legs.some(leg=>leg.serviceID==='rid-change-tight'),false,'7-minute change must be rejected');
});

test('connection buffer status distinguishes safe, tight and at-risk changes',()=>{
  const provider=loadProvider();
  assert.equal(provider.connectionMinimum('CNM'),10);
  assert.equal(provider.connectionMinimum('BHM'),12);
  assert.equal(provider.connectionRiskFor(18,10),'good');
  assert.equal(provider.connectionRiskFor(12,10),'tight');
  assert.equal(provider.connectionRiskFor(8,10),'at-risk');
});
'''
replace_once(test_path, insert_after, new_tests)


# ---------------------------------------------------------------------------
# Current browser regression: add a route that only works with one change.
browser='kerbside-backend/tests/train-browser-core-regression.mjs'
replace_once(browser, "  tocNames:{XC:'CrossCountry'}\n", "  tocNames:{XC:'CrossCountry',GW:'Great Western Railway'}\n")
replace_once(
    browser,
    """const locations={\n  BHM:['Birmingham New Street','BHAMNWS',''],\n  BRI:['Bristol Temple Meads','BRSTLTM','']\n};\nfunction rowsFor(date){return [\n  [`rid-forward-${date}`,`uid-forward-${date}`,'1A01','XC',date,[['BHM','','10:42','7',0],['BRI','12:07','','3',0]]],\n  [`rid-reverse-${date}`,`uid-reverse-${date}`,'1A02','XC',date,[['BRI','','10:50','3',0],['BHM','12:15','','7',0]]]\n];}\n""",
    """const locations={\n  BHM:['Birmingham New Street','BHAMNWS',''],\n  BRI:['Bristol Temple Meads','BRSTLTM',''],\n  CNM:['Cheltenham Spa','CHLTNHM',''],\n  GLO:['Gloucester','GLOSTER','']\n};\nfunction rowsFor(date){return [\n  [`rid-forward-${date}`,`uid-forward-${date}`,'1A01','XC',date,[['BHM','','10:42','7',0],['BRI','12:07','','3',0]]],\n  [`rid-reverse-${date}`,`uid-reverse-${date}`,'1A02','XC',date,[['BRI','','10:50','3',0],['BHM','12:15','','7',0]]],\n  [`rid-change-a-${date}`,`uid-change-a-${date}`,'1C10','XC',date,[['BHM','','10:05','8',0],['CNM','10:45','','2',0]]],\n  [`rid-change-tight-${date}`,`uid-change-tight-${date}`,'1G01','GW',date,[['CNM','','10:52','4',0],['GLO','11:25','','1',0]]],\n  [`rid-change-b-${date}`,`uid-change-b-${date}`,'1G02','GW',date,[['CNM','','11:00','4',0],['GLO','11:32','','1',0]]]\n];}\n"""
)
replace_once(
    browser,
    """const stations=[\n  {stationName:'Birmingham New Street',crsCode:'BHM'},\n  {stationName:'Bristol Temple Meads',crsCode:'BRI'}\n];\n""",
    """const stations=[\n  {stationName:'Birmingham New Street',crsCode:'BHM'},\n  {stationName:'Bristol Temple Meads',crsCode:'BRI'},\n  {stationName:'Cheltenham Spa',crsCode:'CNM'},\n  {stationName:'Gloucester',crsCode:'GLO'}\n];\n"""
)
anchor = """  await page.click('#trainRouteSwap');\n  await waitRoute(page,'BHM','BRI');\n  assert.equal(await page.locator('#trainStationQuery').inputValue(),'Birmingham New Street');\n  assert.equal(await page.locator('#trainDestinationQuery').inputValue(),'Bristol Temple Meads');\n\n  // Tomorrow uses the same timetable spine, does not need a live board request,\n"""
connection_browser = """  await page.click('#trainRouteSwap');\n  await waitRoute(page,'BHM','BRI');\n  assert.equal(await page.locator('#trainStationQuery').inputValue(),'Birmingham New Street');\n  assert.equal(await page.locator('#trainDestinationQuery').inputValue(),'Bristol Temple Meads');\n\n  // A route with no through train should now produce a conservative one-change\n  // itinerary. The 10:52 connection is only seven minutes and must be absent;\n  // the 11:00 departure leaves a 15-minute buffer and is accepted.\n  await findJourney(page,'BHM','GLO');\n  assert.equal((await page.locator('#trainStationName').textContent()).trim(),'Birmingham New Street → Gloucester');\n  assert.equal(await page.locator('#trainScheduledBoard .train-connection-service').count(),1);\n  const connection=page.locator('#trainScheduledBoard .train-connection-service').first();\n  assert.match(await connection.textContent(),/1 change/);\n  assert.match(await connection.textContent(),/Cheltenham Spa/);\n  assert.match(await connection.textContent(),/15m change/);\n  await connection.locator('[data-scheduled-toggle]').click();\n  const connectionDetail=connection.locator('.train-service-detail');\n  await connectionDetail.waitFor({state:'visible'});\n  assert.match(await connectionDetail.textContent(),/Journey plan/);\n  assert.match(await connectionDetail.textContent(),/Great Western Railway/);\n  assert.match(await connectionDetail.textContent(),/10 min minimum/);\n  assert.doesNotMatch(await connectionDetail.textContent(),/10:52/);\n\n  // Restore the direct journey before exercising the date-mode transition.\n  await findJourney(page,'BHM','BRI');\n\n  // Tomorrow uses the same timetable spine, does not need a live board request,\n"""
replace_once(browser, anchor, connection_browser)


# Make the mobile geometry regression version-independent so future releases do
# not become stale merely because the cache-buster changed.
mobile='kerbside-backend/tests/train-mobile-layout-regression.mjs'
replace_once(
    mobile,
    "const browserType=browserName==='chromium'?chromium:webkit;\n",
    "const browserType=browserName==='chromium'?chromium:webkit;\nconst appVersion=(await fs.readFile(path.join(root,'VERSION'),'utf8')).trim();\n"
)
replace_once(
    mobile,
    "  await page.waitForFunction(()=>!!document.querySelector('link[href*=\"kerbside-trains.css?v=0.7.46\"]'));\n",
    "  await page.waitForFunction(version=>!!document.querySelector(`link[href*=\"kerbside-trains.css?v=${version}\"]`),appVersion);\n"
)

print('Applied Kerbside 0.8.0 one-change journey planning, connection UI and regressions.')
