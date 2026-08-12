(function(){
'use strict';

/* ------------------------------------------------------------------
   Live overlay.

   Kerbside used to run two separate boards: a live Darwin departure
   board for the next ~4 hours, and a scheduled timetable board for
   anything beyond it. Crossing that line swapped the entire list, and
   because the live board is capped at 9 rows (Darwin rejects numRows
   above 9 for any *WithDetails call) the list actually got SHORTER as
   departure approached.

   The timetable snapshot is now the spine for every journey, and this
   module is the overlay: it fetches the live board once, matches each
   live service onto its timetabled row, and hands over the evidence
   that only Darwin has - expected times, platform changes, cancellations,
   formation length and calling points.

   Matching is exact rather than heuristic. The Darwin Timetable Files
   and LDB describe the same services with the same identifiers:

     row[0] "202608128769304"  = RID       = LDB serviceIdGuid
     row[1] "W69304"           = UID       = LDB uid
     row[2] "2J12"             = headcode  = LDB trainid

   Those are tried in that order, with departure time plus operator as a
   last resort. A row that matches nothing simply stays timetabled.

   Requests go through the plain Huxley URL on purpose:
   kerbside-train-live-window.js patches window.fetch and rewrites any
   /departures/ request onto the official Rail Data Marketplace worker,
   applying the destination filter and timeOffset/timeWindow, with the
   community providers as fallback. Reusing that URL shape inherits the
   whole resilience chain for free.
------------------------------------------------------------------ */

const PROVIDER_BASE='https://huxley2.azurewebsites.net';
const FRESH_MS=40000;
const REFRESH_MS=60000;
const DETAILED_ROWS=9;
const PLAIN_ROWS=20;

const state={crs:'',date:'',services:[],messages:[],index:null,updatedAt:0,status:'idle',error:'',seq:0,timer:null,includeConnections:false,connectionTargets:[]};

function londonStamp(date){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date||new Date());const map=Object.fromEntries(parts.map(p=>[p.type,p.value]));return `${map.year}-${map.month}-${map.day}`;}
function isToday(date){return String(date||'')===londonStamp();}
function text(value){return String(value==null?'':value).trim();}
function upper(value){return text(value).toUpperCase();}
function timeOf(value){const m=text(value).match(/^(\d{1,2}):(\d{2})$/);return m?`${String(Number(m[1])).padStart(2,'0')}:${m[2]}`:'';}

function ridOf(service){return text(service&&(service.serviceIdGuid||service.serviceIdGuId||service.rid));}
function uidOf(service){return upper(service&&(service.uid||service.serviceUid));}
function headcodeOf(service){return upper(service&&(service.trainid||service.trainId||service.headcode));}
function operatorOf(service){return upper(service&&(service.operatorCode||service.toc));}
function departureOf(service){return timeOf(service&&(service.std||service.departure||service.sta));}

/* ------------------------------------------------------------------
   Calling points. Needed for two jobs: proving a live-only service
   actually reaches the chosen destination before it is added to a
   journey list, and feeding Forecast v3's journeyShapeSignal, which
   scores how loaded a through train already is when it reaches you.
------------------------------------------------------------------ */
function flattenCallingPoints(groups){
  const out=[];
  (Array.isArray(groups)?groups:[]).forEach(group=>{
    const points=Array.isArray(group&&group.callingPoint)?group.callingPoint
      :Array.isArray(group&&group.callingPoints)?group.callingPoints
      :Array.isArray(group)?group:[];
    points.forEach(point=>{if(point)out.push(point);});
  });
  return out;
}
function servesDestination(service,toCrs){
  const target=upper(toCrs);
  if(!target)return true;
  const ahead=flattenCallingPoints(service&&service.subsequentCallingPoints);
  /* No expanded calling points means no proof. A community fallback board
     is not filtered by destination, so an unproven service is dropped
     rather than guessed onto a journey it may never make. */
  if(!ahead.length)return false;
  return ahead.some(point=>upper(point&&point.crs)===target);
}
function destinationCrsOf(service){
  const item=Array.isArray(service&&service.destination)?service.destination.find(Boolean):null;
  return upper(item&&item.crs);
}

function buildIndex(services){
  const byRid=new Map(),byUid=new Map(),byHead=new Map(),byTime=new Map();
  (services||[]).forEach((service,index)=>{
    const entry={service,index};
    const rid=ridOf(service);if(rid&&!byRid.has(rid))byRid.set(rid,entry);
    const uid=uidOf(service);if(uid&&!byUid.has(uid))byUid.set(uid,entry);
    const head=headcodeOf(service),std=departureOf(service);
    if(head&&std&&!byHead.has(`${head}|${std}`))byHead.set(`${head}|${std}`,entry);
    if(std){
      const key=`${std}|${operatorOf(service)}|${destinationCrsOf(service)}`;
      if(!byTime.has(key))byTime.set(key,entry);
    }
  });
  return {byRid,byUid,byHead,byTime};
}

/* A timetabled row, as produced by kerbside-train-timetable.js, carries
   serviceID (RID), uid and trainId straight from the snapshot. */
function matchEntry(row){
  if(!state.index||!row)return null;
  const rid=text(row.serviceID||row.serviceId||row.rid);
  if(rid&&state.index.byRid.has(rid))return {entry:state.index.byRid.get(rid),via:'rid'};
  const uid=upper(row.uid);
  if(uid&&state.index.byUid.has(uid))return {entry:state.index.byUid.get(uid),via:'uid'};
  const head=upper(row.trainId||row.trainid),std=timeOf(row.std);
  if(head&&std&&state.index.byHead.has(`${head}|${std}`))return {entry:state.index.byHead.get(`${head}|${std}`),via:'headcode'};
  if(std){
    const key=`${std}|${upper(row.operatorCode)}|${destinationCrsOf(row)}`;
    if(state.index.byTime.has(key))return {entry:state.index.byTime.get(key),via:'time'};
  }
  return null;
}

/* The evidence a timetable row cannot know on its own. Returns null when
   Darwin has nothing to say about this service, which is the normal case
   for anything beyond the live window. */
function evidenceFor(row){
  const match=matchEntry(row);
  if(!match)return null;
  const service=match.entry.service;
  const previous=flattenCallingPoints(service.previousCallingPoints);
  const ahead=flattenCallingPoints(service.subsequentCallingPoints);
  return {
    via:match.via,
    index:match.entry.index,
    etd:text(service.etd)||'On time',
    eta:text(service.eta),
    platform:text(service.platform),
    isCancelled:!!service.isCancelled,
    cancelReason:text(service.cancelReason),
    delayReason:text(service.delayReason),
    length:Number(service.length)||0,
    operator:text(service.operator),
    serviceID:text(service.serviceID),
    serviceIdUrlSafe:text(service.serviceIdUrlSafe),
    serviceIdGuid:ridOf(service),
    previousCallingPoints:previous.length?service.previousCallingPoints:null,
    subsequentCallingPoints:ahead.length?service.subsequentCallingPoints:null,
    service
  };
}

/* Services Darwin knows about that the snapshot does not - short-notice
   additions and VSTP schedules created after the snapshot was built.
   Only returned when the calling points prove they reach the destination. */
function extraServices(matchedIndexes,toCrs){
  const taken=new Set(matchedIndexes||[]);
  return state.services
    .map((service,index)=>({service,index}))
    .filter(({service,index})=>!taken.has(index)&&!!departureOf(service)&&servesDestination(service,toCrs));
}

async function requestBoard(crs,signal,{target=''}={}){
  const to=String(target||'').trim().toUpperCase();
  const route=to?`/departures/${encodeURIComponent(crs)}/to/${encodeURIComponent(to)}`:`/departures/${encodeURIComponent(crs)}`;
  const detailed=`${PROVIDER_BASE}${route}/${DETAILED_ROWS}?expand=true`;
  try{
    const response=await fetch(detailed,{signal,headers:{Accept:'application/json'}});
    if(response&&response.ok)return response.json();
  }catch(error){if(signal&&signal.aborted)throw error;}
  /* Same fallback kerbside-trains.js uses: the detailed board caps at 9
     rows and some providers do not implement expand at all. A plain
     20-row board still carries times, platforms and cancellations. */
  const plain=`${PROVIDER_BASE}${route}/${PLAIN_ROWS}`;
  const response=await fetch(plain,{signal,headers:{Accept:'application/json'}});
  if(!response||!response.ok)throw new Error(`Departure board returned ${response?response.status:'no response'}`);
  return response.json();
}
function serviceIdentity(service){return ridOf(service)||uidOf(service)||(headcodeOf(service)&&departureOf(service)?`${headcodeOf(service)}|${departureOf(service)}`:'')||`${departureOf(service)}|${operatorOf(service)}|${destinationCrsOf(service)}`;}
function mergeBoards(primary,origin){
  const services=[],seen=new Set();
  for(const board of [primary,origin])for(const service of (board&&Array.isArray(board.trainServices)?board.trainServices:[])){
    const key=serviceIdentity(service);if(key&&seen.has(key))continue;if(key)seen.add(key);services.push(service);
  }
  const messages=[];for(const board of [primary,origin])for(const message of (board&&Array.isArray(board.nrccMessages)?board.nrccMessages:[])){
    const key=JSON.stringify(message);if(!messages.some(item=>JSON.stringify(item)===key))messages.push(message);
  }
  return {...(primary||origin||{}),trainServices:services,nrccMessages:messages};
}

async function refresh({crs,date,force=false,connectionTargets=state.connectionTargets}={}){
  const code=upper(crs);
  if(!code||!isToday(date)){clear();return false;}
  const targets=[...new Set((Array.isArray(connectionTargets)?connectionTargets:[]).map(value=>String(value||'').trim().toUpperCase()).filter(value=>/^[A-Z0-9]{3}$/.test(value)&&value!==code))].slice(0,4);
  const targetKey=targets.join(',');
  const wantsConnections=targets.length>0;
  const fresh=state.crs===code&&state.status==='ready'&&state.connectionTargets.join(',')===targetKey&&Date.now()-state.updatedAt<FRESH_MS;
  if(fresh&&!force)return true;
  const seq=++state.seq;
  state.crs=code;
  state.date=String(date);
  state.includeConnections=wantsConnections;
  state.connectionTargets=targets;
  state.status='loading';
  try{
    const boards=await Promise.all([requestBoard(code),...targets.map(target=>requestBoard(code,undefined,{target}))]);
    const json=boards.slice(1).reduce((merged,board)=>mergeBoards(merged,board),boards[0]||{});
    if(seq!==state.seq)return false;
    state.services=Array.isArray(json&&json.trainServices)?json.trainServices:[];
    /* Darwin's NRCC messages are the network's own words about disruption -
       "reduced service", "severe delays" - and the model already scores them.
       Keep them here so the journey board can pass them on. */
    state.messages=Array.isArray(json&&json.nrccMessages)?json.nrccMessages:[];
    state.index=buildIndex(state.services);
    state.updatedAt=Date.now();
    state.status='ready';
    state.error='';
    document.dispatchEvent(new CustomEvent('kerbside:live-overlay',{detail:{crs:code,date:state.date,count:state.services.length}}));
    return true;
  }catch(error){
    if(seq!==state.seq)return false;
    state.status='error';
    state.error=error&&error.message?error.message:'unavailable';
    /* A failed overlay is not a failed board. The timetabled rows stand
       on their own; they simply stay marked as scheduled. */
    document.dispatchEvent(new CustomEvent('kerbside:live-overlay',{detail:{crs:code,date:String(date),error:state.error}}));
    return false;
  }
}

/* The live disruption text for the station currently overlaid, or nothing
   when the overlay is stale or was never loaded. */
function messages(){return state.status==='ready'&&Array.isArray(state.messages)?state.messages:[];}
function clear(){
  if(state.status==='idle'&&!state.services.length)return;
  state.seq++;
  state.crs='';state.date='';state.services=[];state.messages=[];state.index=null;state.updatedAt=0;state.status='idle';state.error='';state.includeConnections=false;state.connectionTargets=[];
}

function start(){
  stop();
  state.timer=setInterval(()=>{
    if(document.hidden)return;
    const timetable=window.__KERBSIDE_TRAIN_TIMETABLE__;
    if(!timetable||!timetable.state||timetable.state.mode!=='today')return;
    refresh({crs:state.crs,date:state.date,force:true,connectionTargets:state.connectionTargets});
  },REFRESH_MS);
}
function stop(){if(state.timer){clearInterval(state.timer);state.timer=null;}}

document.addEventListener('visibilitychange',()=>{
  if(document.hidden)return;
  const timetable=window.__KERBSIDE_TRAIN_TIMETABLE__;
  if(timetable&&timetable.state&&timetable.state.mode==='today'&&state.crs)refresh({crs:state.crs,date:state.date,force:true,connectionTargets:state.connectionTargets});
});

window.__KERBSIDE_TRAIN_OVERLAY__={
  state,refresh,clear,start,stop,evidenceFor,extraServices,servesDestination,messages,
  flattenCallingPoints,buildIndex,matchEntry,mergeBoards,isToday
};
})();
