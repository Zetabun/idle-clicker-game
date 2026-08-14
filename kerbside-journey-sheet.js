/* Kerbside 0.9.0 — journey sheet.

   The expanded row was an inline drawer. On a 390px screen a one-change
   journey stacked six bordered cards into a column that was already
   indented under its own summary, so the itinerary, the recovery option,
   the watch control and the forecast all arrived at the same visual
   weight, the row above them stayed on screen competing for attention,
   and the "onward cancelled" verdict in the header sat four cards away
   from the leg it described.

   Both boards build their own rows - the live Darwin board in
   kerbside-trains.js and the timetable spine in
   kerbside-train-timetable.js - and the browser regression reads those
   rows by class. So rather than fork the markup, this promotes the
   existing .train-service-detail node to a full-screen sheet on small
   viewports and hangs a fixed header off <body> carrying the journey
   identity and a close control. Nothing moves in the DOM: refreshForecasts(),
   hydrateDetail() and both delegated toggle handlers keep working on the
   same nodes they always did, and CSS does the presentation.

   Closing always goes back through the owning board's own toggle button,
   so open/closed state stays in the board's state object rather than
   being duplicated here. */
(function(){
'use strict';
if(typeof window==='undefined'||typeof document==='undefined')return;

var BREAKPOINT='(max-width: 820px)';
var BOARD_IDS=['trainBoard','trainScheduledBoard'];
var TOGGLE_SELECTOR='[data-service-toggle],[data-scheduled-toggle]';
var FALLBACK_HEAD=104;

var media=typeof window.matchMedia==='function'?window.matchMedia(BREAKPOINT):null;
var chrome=null,parts=null,observer=null,observed=[],resizeWatch=null;
var current=null,scroller=null,scrollMemory=0,pushedState=false,queued=false;

function byId(id){return document.getElementById(id);}
function clean(node){return node?String(node.textContent||'').replace(/\s+/g,' ').trim():'';}
function narrow(){return media?media.matches:window.innerWidth<=820;}
function railMode(){return !!(document.body&&document.body.dataset&&document.body.dataset.transport==='train');}
function esc(value){
  return String(value==null?'':value).replace(/[&<>"']/g,function(character){
    return character==='&'?'&amp;':character==='<'?'&lt;':character==='>'?'&gt;':character==='"'?'&quot;':'&#39;';
  });
}
function minutesOf(value){var match=/^(\d{1,2}):(\d{2})$/.exec(String(value||'').trim());return match?Number(match[1])*60+Number(match[2]):null;}
function spanLabel(from,to){
  var start=minutesOf(from),end=minutesOf(to);
  if(start==null||end==null)return '';
  var span=end-start;
  while(span<0)span+=1440;
  if(!span)return '';
  var hours=Math.floor(span/60),minutes=span%60;
  return hours?hours+'h '+(minutes<10?'0':'')+minutes+'m':minutes+'m';
}
function tokenFrom(node,pattern){var match=pattern.exec(String(node&&node.className||''));return match?match[1]:'';}

/* The journey spine.

   Both boards build their own rows, so the origin/destination pair was
   previously restated as a four-cell facts grid in each of them. This is
   the one markup tree they now share: a dotted rail, the two stops with
   their times, and the journey's tags between them. Callers normalise
   their own service shape into {from,to,tags} and nothing about the
   presentation lives here - every difference between the dot-matrix and
   Crystal readings is a token or a body.theme-crystal override in
   kerbside-trains.css. */
function spineMarkup(journey){
  if(!journey)return '';
  var from=journey.from||{},to=journey.to||{};
  if(!from.name&&!to.name)return '';
  var tags=(journey.tags||[]).filter(Boolean).map(function(tag){
    var label=typeof tag==='string'?tag:tag&&tag.label;
    if(!label)return '';
    var accent=typeof tag==='object'&&tag&&tag.accent?' is-accent':'';
    return '<span class="train-spine-tag'+accent+'">'+esc(label)+'</span>';
  }).filter(Boolean).join('');
  return '<section class="train-spine">'
    +'<div class="train-spine-leg">'
    +'<span class="train-spine-rail" aria-hidden="true"><i class="train-spine-dot is-start"></i><i class="train-spine-dot is-end"></i></span>'
    +'<div class="train-spine-stop"><h4>'+esc(from.name||'Origin unavailable')+'</h4>'
    +(from.note?'<p>'+esc(from.note)+'</p>':'')+'</div>'
    +'<div class="train-spine-time">'+esc(from.time||'\u2014')+'</div>'
    +'<div class="train-spine-tags">'+tags+'</div>'
    +'<div class="train-spine-stop"><h4>'+esc(to.name||'Destination unavailable')+'</h4>'
    +(to.note?'<p>'+esc(to.note)+'</p>':'')+'</div>'
    +'<div class="train-spine-time">'+esc(to.time||'\u2014')+'</div>'
    +'</div></section>';
}

/* One header for the whole app rather than one per row: the sheet is
   modal, so only one journey can ever own it. */
function ensureChrome(){
  if(chrome)return chrome;
  chrome=document.createElement('div');
  chrome.id='kerbsideJourneySheet';
  chrome.className='kerbside-sheet-chrome';
  chrome.hidden=true;
  chrome.innerHTML='<div class="kerbside-sheet-bar">'
    +'<div class="kerbside-sheet-id">'
    +'<span class="kerbside-sheet-kicker" data-sheet-kicker>Journey</span>'
    +'<div class="kerbside-sheet-clock" data-sheet-clock></div>'
    +'<div class="kerbside-sheet-route" data-sheet-route></div>'
    +'</div>'
    +'<button type="button" class="kerbside-sheet-close" data-sheet-close aria-label="Close journey details">'
    +'<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M5.5 5.5l9 9M14.5 5.5l-9 9"/></svg>'
    +'</button>'
    +'</div>'
    +'<div class="kerbside-sheet-chips" data-sheet-chips hidden></div>';
  document.body.appendChild(chrome);
  parts={
    kicker:chrome.querySelector('[data-sheet-kicker]'),
    clock:chrome.querySelector('[data-sheet-clock]'),
    route:chrome.querySelector('[data-sheet-route]'),
    chips:chrome.querySelector('[data-sheet-chips]'),
    close:chrome.querySelector('[data-sheet-close]')
  };
  parts.close.addEventListener('click',function(event){event.preventDefault();requestClose();});
  if(typeof ResizeObserver==='function'){
    resizeWatch=new ResizeObserver(measure);
    resizeWatch.observe(chrome);
  }
  return chrome;
}

/* The sheet body pads itself clear of the header, and the header height
   moves with the chip row and with wrapped station names, so it is
   measured rather than guessed. */
function measure(){
  if(!chrome||chrome.hidden)return;
  var height=Math.round(chrome.getBoundingClientRect().height)||FALLBACK_HEAD;
  document.documentElement.style.setProperty('--kerbside-sheet-head',height+'px');
}

function facts(article){
  var statusEl=article.querySelector('.train-status');
  var crowdEl=article.querySelector('.train-crowding');
  var meta=clean(article.querySelector('.train-route small'));
  var arrival=/\barr\s+(\d{1,2}:\d{2})/i.exec(meta);
  var header=clean(byId('trainStationName'));
  var origin=header.indexOf('\u2192')>=0?header.split('\u2192')[0].trim():header;
  var destination=clean(article.querySelector('.train-route strong'));
  var depart=clean(article.querySelector('.train-time b'));
  var arrive=arrival?arrival[1]:'';
  var badges=[];
  Array.prototype.forEach.call(article.querySelectorAll('.train-journey-badges em'),function(node){
    var value=clean(node);
    if(value)badges.push(value);
  });
  return {
    depart:depart,
    arrive:arrive,
    duration:spanLabel(depart,arrive),
    origin:origin&&origin!==destination?origin:'',
    destination:destination||'Service detail',
    status:clean(statusEl),
    statusKey:tokenFrom(statusEl,/train-status-([a-z-]+)/),
    crowd:clean(crowdEl&&crowdEl.querySelector('b')),
    crowdKey:tokenFrom(crowdEl,/crowd-([a-z-]+)/),
    badges:badges,
    connection:article.classList.contains('train-connection-service')
  };
}

/* Every write is compared first. Forecast v4 rewrites the explain card in
   place and the live board replaces its detail node after hydration, both
   of which wake the observer below; an unguarded rewrite here would turn
   that into needless churn on every refresh. */
function setText(node,value){if(node&&node.textContent!==value)node.textContent=value;}
function setHtml(node,value){if(node&&node.innerHTML!==value)node.innerHTML=value;}

function render(article){
  var detail=facts(article);
  var clock='<b>'+esc(detail.depart||'\u2014')+'</b>';
  if(detail.arrive){
    clock+='<span class="kerbside-sheet-arrow" aria-hidden="true"></span><b>'+esc(detail.arrive)+'</b>';
    if(detail.duration)clock+='<em>'+esc(detail.duration)+'</em>';
  }
  var route=detail.origin
    ?esc(detail.origin)+'<span class="kerbside-sheet-hop" aria-hidden="true">\u2192</span>'+esc(detail.destination)
    :esc(detail.destination);
  var chips=[];
  if(detail.status){
    chips.push('<span class="kerbside-sheet-chip is-status train-status-'+esc(detail.statusKey||'timetabled')+'">'+esc(detail.status)+'</span>');
  }
  if(detail.crowd){
    chips.push('<span class="kerbside-sheet-chip is-crowd crowd-'+esc(detail.crowdKey||'unknown')+'"><i></i>'+esc(detail.crowd)+'</span>');
  }
  detail.badges.forEach(function(badge){chips.push('<span class="kerbside-sheet-chip">'+esc(badge)+'</span>');});
  setText(parts.kicker,detail.connection?'One-change journey':'Service detail');
  setHtml(parts.clock,clock);
  setHtml(parts.route,route);
  setHtml(parts.chips,chips.join(''));
  if(parts.chips.hidden===!!chips.length)parts.chips.hidden=!chips.length;
}

/* The board that is not in use is hidden rather than emptied, so an open
   row inside it must not claim the sheet. */
function openArticle(){
  for(var index=0;index<BOARD_IDS.length;index+=1){
    var board=byId(BOARD_IDS[index]);
    if(!board||board.hidden)continue;
    var article=board.querySelector('.train-service.open');
    if(article)return article;
  }
  return null;
}

function scrollerFor(node){
  var element=node&&node.parentElement;
  while(element&&element!==document.body){
    var style=window.getComputedStyle?window.getComputedStyle(element):null;
    var overflow=style?String(style.overflowY):'';
    if((overflow==='auto'||overflow==='scroll')&&element.scrollHeight>element.clientHeight+4)return element;
    element=element.parentElement;
  }
  return null;
}

function activate(article){
  if(current!==article){
    if(current)current.classList.remove('is-sheet');
    else{
      scroller=scrollerFor(article);
      scrollMemory=scroller?scroller.scrollTop:0;
    }
    current=article;
  }
  ensureChrome();
  if(!article.classList.contains('is-sheet'))article.classList.add('is-sheet');
  if(!document.body.classList.contains('kerbside-sheet-open'))document.body.classList.add('kerbside-sheet-open');
  if(chrome.hidden)chrome.hidden=false;
  render(article);
  measure();
  if(!pushedState&&window.history&&typeof window.history.pushState==='function'){
    try{window.history.pushState({kerbsideJourneySheet:true},'');pushedState=true;}catch(error){pushedState=false;}
  }
}

function deactivate(){
  var stale=document.querySelectorAll('.train-service.is-sheet');
  Array.prototype.forEach.call(stale,function(node){node.classList.remove('is-sheet');});
  current=null;
  document.body.classList.remove('kerbside-sheet-open');
  if(chrome)chrome.hidden=true;
  if(scroller){
    var target=scroller,memory=scrollMemory;
    var restore=function(){if(target.scrollHeight>target.clientHeight)target.scrollTop=memory;};
    restore();
    if(typeof window.requestAnimationFrame==='function')window.requestAnimationFrame(restore);
  }
  scroller=null;
  if(pushedState){
    pushedState=false;
    try{window.history.back();}catch(error){}
  }
}

function sync(){
  queued=false;
  attach();
  var article=railMode()&&narrow()?openArticle():null;
  if(article)activate(article);
  else if(current||document.querySelector('.train-service.is-sheet')||(chrome&&!chrome.hidden))deactivate();
}

function schedule(){
  if(queued)return;
  queued=true;
  if(typeof window.requestAnimationFrame==='function')window.requestAnimationFrame(function(){sync();});
  else setTimeout(sync,0);
}

/* childList only. The class this module writes lands on the article as an
   attribute mutation, so it can never re-enter the observer that watches
   for the boards being re-rendered underneath it. */
function attach(){
  if(typeof MutationObserver!=='function')return;
  if(!observer)observer=new MutationObserver(schedule);
  BOARD_IDS.forEach(function(id){
    var board=byId(id);
    if(!board||observed.indexOf(board)>=0)return;
    observed.push(board);
    observer.observe(board,{childList:true,subtree:true});
  });
}

function requestClose(){
  var article=current;
  if(!article)return;
  var toggle=article.querySelector(TOGGLE_SELECTOR);
  if(toggle)toggle.click();
  else{
    article.classList.remove('open');
    var detail=article.querySelector('.train-service-detail');
    if(detail)detail.hidden=true;
  }
  schedule();
}

document.addEventListener('click',function(){
  schedule();
  setTimeout(schedule,260);
},false);
document.addEventListener('keydown',function(event){
  if(!current)return;
  if(event.key==='Escape'||event.key==='Esc'){event.preventDefault();requestClose();}
});
document.addEventListener('kerbside:timetable-services-ready',schedule);
window.addEventListener('popstate',function(){
  if(!pushedState)return;
  pushedState=false;
  if(current)requestClose();
});
window.addEventListener('resize',function(){schedule();measure();});
window.addEventListener('orientationchange',function(){schedule();setTimeout(measure,220);});
if(media){
  if(typeof media.addEventListener==='function')media.addEventListener('change',schedule);
  else if(typeof media.addListener==='function')media.addListener(schedule);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule);
else schedule();

window.__KERBSIDE_JOURNEY_SHEET__={
  version:'0.9.7',
  sync:sync,
  spine:spineMarkup,
  close:requestClose,
  active:function(){return !!current;},
  element:function(){return chrome;}
};
})();
