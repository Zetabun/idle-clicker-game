(function(){
'use strict';

/*
  Kerbside live train-loading interpreter.

  The RDM/LDB formation object can carry a numeric loading value per coach.
  A value is direct evidence only when `loadingSpecified === true`. Missing
  loading never means quiet and never changes Forecast v4.

  The four labels below are Kerbside presentation bands applied to Darwin's
  0-100 estimated coach-loading values; they are not National Rail labels and
  are not physical passenger counts. Where coach class is explicit, the
  headline is based on standard-class coaches because that is the useful
  default for most travellers. First-class values remain visible in detail.
*/

const VERSION=1;
const LEVELS=[
  {max:35,level:'quiet',label:'Quiet',score:0.9},
  {max:65,level:'moderate',label:'Moderate',score:2.0},
  {max:85,level:'busy',label:'Busy',score:3.3},
  {max:101,level:'very-busy',label:'Very Busy',score:4.5}
];
const QUIETER_GAP=15;

function number(value){
  const n=Number(value);
  return Number.isFinite(n)&&n>=0&&n<=100?n:null;
}
function text(value){return String(value==null?'':value).trim();}
function esc(value){return text(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function isFirstClass(value){const v=text(value).toLowerCase();return /^(f|1)$/.test(v)||/first|1st/.test(v);}
function isStandardClass(value){const v=text(value).toLowerCase();return /^(s|2)$/.test(v)||/standard|second|2nd/.test(v);}
function bandFor(value){const n=number(value);if(n==null)return null;return LEVELS.find(row=>n<row.max)||LEVELS[LEVELS.length-1];}
function round1(value){return Math.round(Number(value)*10)/10;}

function coachEvidence(coach,index){
  if(!coach||coach.loadingSpecified!==true)return null;
  const loading=number(coach.loading);if(loading==null)return null;
  const numberLabel=text(coach.number||coach.coachNumber||coach.carriage||coach.vehicle)||String(index+1);
  const coachClass=text(coach.coachClass||coach.class||'');
  return {number:numberLabel,coachClass,loading:round1(loading),firstClass:isFirstClass(coachClass),standardClass:isStandardClass(coachClass)};
}

function fromFormation(formation){
  if(!formation||typeof formation!=='object')return null;
  const coaches=(Array.isArray(formation.coaches)?formation.coaches:[]).map(coachEvidence).filter(Boolean);
  if(!coaches.length)return null;

  const explicitStandard=coaches.filter(row=>row.standardClass);
  const nonFirst=coaches.filter(row=>!row.firstClass);
  const headlineCoaches=explicitStandard.length?explicitStandard:(nonFirst.length?nonFirst:coaches);
  const average=round1(headlineCoaches.reduce((sum,row)=>sum+row.loading,0)/headlineCoaches.length);
  const band=bandFor(average);if(!band)return null;
  const sorted=headlineCoaches.slice().sort((a,b)=>a.loading-b.loading||String(a.number).localeCompare(String(b.number)));
  const lowest=sorted[0],highest=sorted[sorted.length-1];
  const quieter=sorted.length>=2&&highest.loading-lowest.loading>=QUIETER_GAP?{
    number:lowest.number,loading:lowest.loading,gap:round1(highest.loading-lowest.loading)
  }:null;
  return {
    available:true,source:'darwin-formation-loading',sourceLabel:'Live train-loading evidence',
    average,level:band.level,label:band.label,score:band.score,
    reportedCoaches:coaches.length,headlineCoaches:headlineCoaches.length,
    classBasis:explicitStandard.length?'standard-class':(nonFirst.length<coaches.length?'non-first-class':'all-reported'),
    coaches,quieter
  };
}

function evidenceFor(service){return fromFormation(service&&service.formation);}

function applyToForecast(base,service){
  const live=evidenceFor(service);if(!live)return base;
  const previous=Array.isArray(base&&base.reasons)?base.reasons:[];
  const reasons=[
    `Darwin reports estimated coach loading averaging ${live.average}% across ${live.headlineCoaches} relevant coach${live.headlineCoaches===1?'':'es'}`,
    live.quieter?`Coach ${live.quieter.number} currently has the lowest reported loading`:''
  ].filter(Boolean).concat(previous).slice(0,6);
  return {
    ...(base||{}),
    level:live.level,label:live.label,score:live.score,confidence:'High',
    evidenceKind:'live-train-loading',evidenceLabel:live.sourceLabel,
    liveLoading:live,reasons,
    forecastFallback:base||null
  };
}

function sourceText(result,{peak=false}={}){
  if(result&&result.liveLoading)return `${result.evidenceLabel||'Live train-loading evidence'}${peak?' · peak leg':''}`;
  return `${result&&result.confidence||'Low'} confidence${peak?' · peak leg':''}`;
}

function coachMarkup(result){
  const live=result&&result.liveLoading;if(!live)return'';
  const coaches=live.coaches.map(row=>{
    const band=bandFor(row.loading),classText=row.coachClass?` · ${row.coachClass}`:'';
    return `<span class="train-loading-coach crowd-${esc(band&&band.level||'unknown')}"><b>${esc(`Coach ${row.number}`)}</b><small>${esc(`${row.loading}%${classText}`)}</small></span>`;
  }).join('');
  const quieter=live.quieter?`<p class="train-loading-tip"><strong>Quieter option:</strong> Coach ${esc(live.quieter.number)} currently has the lowest reported loading (${esc(live.quieter.loading)}%).</p>`:'';
  return `<div class="train-live-loading"><div class="train-detail-title">Live coach loading</div><div class="train-loading-summary"><strong>${esc(live.label)}</strong><span>${esc(`${live.average}% estimated average · ${live.headlineCoaches} relevant coach${live.headlineCoaches===1?'':'es'}`)}</span></div><div class="train-loading-coaches">${coaches}</div>${quieter}<p class="train-loading-note">Darwin operator-supplied estimated loading. Kerbside maps the percentage into its own Quiet / Moderate / Busy / Very Busy bands. It is not a passenger count, ticket-sales figure or National Rail crowding label.</p></div>`;
}

function explainMarkup(result){
  const live=result&&result.liveLoading;if(!live)return'';
  const items=(result.reasons||[]).map(reason=>`<li>${esc(reason)}</li>`).join('');
  return `<div class="train-forecast-head"><span class="train-forecast-status"><i></i><strong>${esc(result.label)}</strong></span><span class="train-forecast-meta">${esc(result.evidenceLabel||'Live train-loading evidence')} · ${esc(`${live.average}% estimated`)}</span></div><div class="train-forecast-reasons"><span>Why this crowding level</span><ul>${items}</ul></div>${coachMarkup(result)}<div class="train-forecast-method">Direct Darwin coach-loading evidence takes priority for this train only. If that evidence disappears or is not supplied, Kerbside falls back to Forecast v4 rather than assuming the train is quiet.</div>`;
}

window.__KERBSIDE_TRAIN_LOADING__={VERSION,LEVELS,QUIETER_GAP,bandFor,fromFormation,evidenceFor,applyToForecast,sourceText,coachMarkup,explainMarkup};
})();
