import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..','..');
const guidanceSource=await fs.readFile(path.join(root,'kerbside-train-loading-guidance.js'),'utf8');

class Element{
  constructor(tag,doc){this.tagName=tag.toUpperCase();this.ownerDocument=doc;this.children=[];this.parentNode=null;this.className='';this.attrs={};this.textContent='';this.title='';}
  get classList(){return {contains:name=>this.className.split(/\s+/).filter(Boolean).includes(name)};}
  get firstChild(){return this.children[0]||null;}
  setAttribute(name,value){this.attrs[name]=String(value);}
  getAttribute(name){return this.attrs[name]||'';}
  appendChild(child){child.parentNode=this;this.children.push(child);return child;}
  insertBefore(child,before){child.parentNode=this;const index=before?this.children.indexOf(before):-1;if(index<0)this.children.push(child);else this.children.splice(index,0,child);return child;}
  remove(){if(!this.parentNode)return;const index=this.parentNode.children.indexOf(this);if(index>=0)this.parentNode.children.splice(index,1);this.parentNode=null;}
  querySelector(selector){
    const className=selector.startsWith('.')?selector.slice(1):'';
    const stack=[...this.children];
    while(stack.length){const item=stack.shift();if(className&&item.classList.contains(className))return item;stack.unshift(...item.children);}
    return null;
  }
}
class Document{
  createElement(tag){return new Element(tag,this);}
}
function makeArticle(doc,id='svc-1'){
  const article=new Element('article',doc);article.className='train-scheduled-service';article.setAttribute('data-service-id',id);
  const route=article.appendChild(doc.createElement('span'));route.className='train-route';
  const badges=route.appendChild(doc.createElement('span'));badges.className='train-journey-badges';
  for(const label of ['Direct','Fastest']){const badge=badges.appendChild(doc.createElement('em'));badge.textContent=label;}
  const strong=route.appendChild(doc.createElement('strong'));strong.textContent='Plymouth';
  return {article,route,badges};
}
function api(service){
  const window={
    __KERBSIDE_TRAIN_LOADING__:{
      fromFormation(formation){if(!formation||!Array.isArray(formation.coaches)||!formation.coaches.length)return null;return {coaches:formation.coaches,average:45,headlineCoaches:formation.coaches.length,level:'moderate',label:'Moderate',score:2,sourceLabel:'Darwin live coach loading'};},
      bandFor(){return {level:'moderate'};}
    },
    __KERBSIDE_TRAIN_TIMETABLE__:{state:{services:[service]},serviceKey(){return 'svc-1';}}
  };
  const context={window,console};vm.createContext(context);vm.runInContext(guidanceSource,context);return window.__KERBSIDE_TRAIN_LOADING__;
}

test('live load badge appears first only while direct service has coach-loading evidence',()=>{
  const service={serviceID:'svc-1',formation:{coaches:[{number:'A',loading:35,loadingSpecified:true},{number:'B',loading:55,loadingSpecified:true}]}};
  const loading=api(service),doc=new Document(),{article,badges}=makeArticle(doc);
  const scope={querySelectorAll:selector=>selector==='.train-scheduled-service'?[article]:[]};
  assert.equal(loading.syncLiveBadges(scope),1);
  assert.equal(badges.children[0].textContent,'Live load');
  assert.equal(badges.children[0].className,'train-journey-live');
  assert.equal(badges.children[0].getAttribute('aria-label'),'Live coach loading available');
  assert.equal(badges.children[1].textContent,'Direct');
  assert.equal(loading.syncLiveBadges(scope),0,'repeated sync must not duplicate the badge');
  service.formation=null;
  assert.equal(loading.syncLiveBadges(scope),1);
  assert.equal(badges.children.some(child=>child.className==='train-journey-live'),false);
  assert.equal(badges.children[0].textContent,'Direct');
});

test('connection gets a live load badge when either leg has coach-loading evidence',()=>{
  const service={serviceID:'svc-1',legs:[{formation:null},{formation:{coaches:[{number:'1',loading:62,loadingSpecified:true}]}}]};
  const loading=api(service),doc=new Document(),{article,badges}=makeArticle(doc);
  const scope={querySelectorAll:()=>[article]};
  loading.syncLiveBadges(scope);
  assert.equal(badges.children[0].textContent,'Live load');
});
