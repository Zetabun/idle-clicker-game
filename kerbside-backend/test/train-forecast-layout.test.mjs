import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..','..');
const css=await fs.readFile(path.join(root,'kerbside-trains.css'),'utf8');
const forecast=await fs.readFile(path.join(root,'kerbside-train-forecast-v4.js'),'utf8');

test('measured baseline source is not constrained to forecast-dot geometry',()=>{
  assert.match(forecast,/train-forecast-calibration[^\n]+<i>/,'calibration source should still render inside its semantic source element');
  assert.match(forecast,/<p>\$\{esc\(method\)\}<\/p>\$\{calibrationMarkup\}<\/details>\$\{probabilityMarkup\}/,'measured baseline should be grouped inside How this is worked out');
  assert.doesNotMatch(forecast,/<\/details>\$\{calibrationMarkup\}/,'measured baseline must not remain a standalone top-level forecast block');
  const rule=css.match(/\.train-forecast-calibration i\{([^}]*)\}/);
  assert.ok(rule,'calibration source CSS rule should exist');
  const body=rule[1].replace(/\s+/g,'');
  assert.match(body,/display:block/);
  assert.match(body,/width:auto/);
  assert.match(body,/height:auto/);
  assert.match(body,/border-radius:0/);
});

test('forecast dots keep their compact dot geometry',()=>{
  assert.match(css,/\.crowd-dot,\.train-crowding>i,\.train-crowding-explain i\{display:inline-block;width:7px;height:7px;border-radius:50%\}/);
});
