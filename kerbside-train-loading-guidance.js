(function(){
'use strict';

const base=window.__KERBSIDE_TRAIN_LOADING__;
if(!base||typeof base.fromFormation!=='function'||typeof base.bandFor!=='function')return;

const VERSION=2;
const MULTI_COACH_GAP=15;
const TWO_COACH_GAP=20;
const originalFromFormation=base.fromFormation;

function text(value){return String(value==null?'':value).trim();}
function esc(value){return text(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function round1(value){return Math.round(Number(value)*10)/10;}
function average(rows){return rows.length?round1(rows.reduce((sum,row)=>sum+Number(row.loading||0),0)/rows.length):null;}
function classLabel(row){if(row&&row.firstClass)return'First class';if(row&&row.standardClass)return'Standard';return text(row&&row.coachClass);}
function coachList(numbers){const values=(numbers||[]).map(value=>`Coach ${value}`);if(values.length<=1)return values[0]||'';if(values.length===2)return `${values[0]} and ${values[1]}`;return `${values.slice(0,-1).join(', ')} and ${values[values.length-1]}`;}

function headlineRows(live){
  const coaches=(live&&live.coaches||[]).map((row,index)=>({...row,position:index}));
  const standard=coaches.filter(row=>row.standardClass),nonFirst=coaches.filter(row=>!row.firstClass);
  return {coaches,headline:standard.length?standard:(nonFirst.length?nonFirst:coaches),basis:standard.length?'standard-class':(nonFirst.length<coaches.length?'non-first-class':'all-reported')};
}
function spreadFor(rows){
  if(!rows.length)return null;
  const values=rows.map(row=>Number(row.loading)),minimum=Math.min(...values),maximum=Math.max(...values),range=round1(maximum-minimum);
  return {minimum:round1(minimum),maximum:round1(maximum),range,variation:range<8?'Very even':range<18?'Mostly even':range<35?'Mixed':'Large variation'};
}
function lowerCluster(rows){
  if(rows.length<2)return null;
  const sorted=rows.slice().sort((a,b)=>a.loading-b.loading||a.position-b.position),required=rows.length===2?TWO_COACH_GAP:MULTI_COACH_GAP;
  let split=-1,largest=-1;
  for(let i=0;i<sorted.length-1;i++){
    const gap=round1(sorted[i+1].loading-sorted[i].loading);
    if(gap>largest){largest=gap;split=i;}
  }
  if(split<0||largest<required)return null;
  const lower=sorted.slice(0,split+1),higher=sorted.slice(split+1),lowerAverage=average(lower),higherAverage=average(higher);
  if(higherAverage-lowerAverage<required)return null;
  const ordered=lower.slice().sort((a,b)=>a.position-b.position);
  return {numbers:ordered.map(row=>row.number),lowerAverage,higherAverage,separatingGap:largest};
}
function enhance(live){
  if(!live)return null;
  const rows=headlineRows(live),first=rows.coaches.filter(row=>row.firstClass).length,standard=rows.coaches.filter(row=>row.standardClass).length;
  return {...live,coaches:rows.coaches,classBasis:rows.basis,classCounts:{standard,first,other:rows.coaches.length-standard-first},spread:spreadFor(rows.headline),quieter:lowerCluster(rows.headline)};
}
function fromFormation(formation){return enhance(originalFromFormation(formation));}
function evidenceFor(service){return fromFormation(service&&service.formation);}
function applyToForecast(fallback,service){
  const live=evidenceFor(service);if(!live)return fallback;
  const previous=Array.isArray(fallback&&fallback.reasons)?fallback.reasons:[],basis=live.classBasis==='standard-class'?'standard-class':live.classBasis==='non-first-class'?'non-first-class':'reported';
  const reasons=[
    `Darwin reports estimated coach loading averaging ${live.average}% across ${live.headlineCoaches} ${basis} coach${live.headlineCoaches===1?'':'es'}`,
    live.spread&&live.spread.range?`Reported ${basis} coach loading ranges from ${live.spread.minimum}% to ${live.spread.maximum}%`:'',
    live.quieter?`${coachList(live.quieter.numbers)} form${live.quieter.numbers.length===1?'s':''} a meaningfully lower-loaded reported group`:''
  ].filter(Boolean).concat(previous).slice(0,6);
  return {...(fallback||{}),level:live.level,label:live.label,score:live.score,confidence:'High',evidenceKind:'live-train-loading',evidenceLabel:live.sourceLabel,liveLoading:live,reasons,forecastFallback:fallback||null};
}
function coachMarkup(result){
  const live=result&&result.liveLoading;if(!live)return'';
  const coaches=live.coaches.map(row=>{const band=base.bandFor(row.loading),kind=classLabel(row),suffix=kind?` · ${kind}`:'';return `<span class="train-loading-coach crowd-${esc(band&&band.level||'unknown')}"><b>${esc(`Coach ${row.number}`)}</b><small>${esc(`${row.loading}%${suffix}`)}</small></span>`;}).join('');
  const spread=live.spread?`${live.spread.minimum}–${live.spread.maximum}% reported range · ${live.spread.range}-point spread · ${live.spread.variation}`:'';
  const guidance=live.quieter?`<p class="train-loading-tip"><strong>Relatively lower-loaded ${live.quieter.numbers.length===1?'coach':'coaches'}:</strong> ${esc(coachList(live.quieter.numbers))}. The lower and higher reported groups are separated by ${esc(live.quieter.separatingGap)} percentage points. Loading can change quickly and this does not guarantee seats.</p>`:'';
  const classNote=live.classBasis==='standard-class'&&live.classCounts.first?'<p class="train-loading-note">Headline and guidance use reported standard-class coaches; first-class loading is shown separately.</p>':'';
  return `<div class="train-live-loading"><div class="train-detail-title">Live coach loading</div><div class="train-loading-summary"><strong>${esc(live.label)}</strong><span>${esc(`${live.average}% estimated average · ${spread}`)}</span></div><div class="train-loading-coaches">${coaches}</div>${guidance}${classNote}<p class="train-loading-note">Darwin operator-supplied estimated loading. Kerbside maps percentages into its own crowding bands. It is not a passenger count, ticket-sales figure or National Rail crowding label.</p></div>`;
}
function explainMarkup(result){
  const live=result&&result.liveLoading;if(!live)return'';
  const items=(result.reasons||[]).map(reason=>`<li>${esc(reason)}</li>`).join(''),range=live.spread?` · ${live.spread.minimum}–${live.spread.maximum}% range`:'';
  return `<div class="train-forecast-head"><span class="train-forecast-status"><i></i><strong>${esc(result.label)}</strong></span><span class="train-forecast-meta">${esc(result.evidenceLabel||'Live train-loading evidence')} · ${esc(`${live.average}% estimated${range}`)}</span></div><div class="train-forecast-reasons"><span>Why this crowding level</span><ul>${items}</ul></div>${coachMarkup(result)}<div class="train-forecast-method">Direct Darwin coach-loading evidence takes priority for this train only. Relative coach guidance appears only when reported loading forms meaningfully separated groups. If direct evidence disappears, Kerbside falls back to Forecast v4 rather than assuming the train is quiet.</div>`;
}

window.__KERBSIDE_TRAIN_LOADING__={...base,VERSION,MULTI_COACH_GAP,TWO_COACH_GAP,spreadFor,fromFormation,evidenceFor,applyToForecast,coachMarkup,explainMarkup};
})();
