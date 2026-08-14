import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'..','..');
const source=await fs.readFile(path.join(root,'kerbside-train-forecast-v4.js'),'utf8');
class FixedDate extends Date{constructor(...args){super(...args);}static now(){return new Date('2026-08-12T08:00:00Z').getTime();}}
const document={readyState:'loading',addEventListener(){},getElementById(){return null;},createElement(){return {innerHTML:'',textContent:''};}};
const window={addEventListener(){},dispatchEvent(){},__KERBSIDE_CALIBRATION__:{},__KERBSIDE_TRAINS__:{state:{}}};
const context={window,document,Date:FixedDate,Intl,console,localStorage:{getItem(){return null;},setItem(){},removeItem(){}},setTimeout,clearTimeout,setInterval,clearInterval,AbortController,Blob,Response,TextDecoder,DecompressionStream,requestAnimationFrame(){return 1;},MutationObserver:class{observe(){}disconnect(){}}};
vm.createContext(context);vm.runInContext(source,context);
const v4=context.window.__KERBSIDE_FORECAST_V4__;
test('weekday fixed holidays do not invent an extra substitute day',()=>{
  assert.equal(v4.isBankHoliday(new FixedDate('2026-11-30T12:00:00Z')),true);
  assert.equal(v4.isBankHoliday(new FixedDate('2026-12-01T12:00:00Z')),false);
  assert.equal(v4.isBankHoliday(new FixedDate('2026-12-28T12:00:00Z')),true);
  assert.equal(v4.isBankHoliday(new FixedDate('2026-12-29T12:00:00Z')),false);
});
