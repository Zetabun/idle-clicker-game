import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'..','..');
const bandsSource=await fs.readFile(path.join(root,'kerbside-rail-timebands.js'),'utf8');
const calibrationSource=await fs.readFile(path.join(root,'kerbside-rail-calibration.js'),'utf8');
function load(){const context={window:{},console,Date,Intl,Math};vm.createContext(context);vm.runInContext(bandsSource,context);vm.runInContext(calibrationSource,context);return {bands:context.window.__KERBSIDE_DFT_TIME_BANDS__,cal:context.window.__KERBSIDE_CALIBRATION__};}
test('DfT importer preserves the exact 2025 table coverage and edge bands',()=>{const {bands}=load();assert.equal(bands.year,2025);assert.equal(Object.keys(bands.city).length,14);assert.equal(Object.keys(bands.station).length,12);assert.equal(bands.bandLabels.length,18);assert.equal(bands.bandIndex(120),17);assert.equal(bands.bandIndex(300),0);assert.equal(bands.bandIndex(17*60),11);});
test('measured Birmingham evening demand is stronger than midday',()=>{const {cal}=load(),date=new Date('2026-08-12T12:00:00Z'),station={crs:'BHM'};const noon=cal.measuredBand(station,12*60),evening=cal.measuredBand(station,17*60);assert.equal(noon.scope,'city');assert.equal(evening.passengers,15923);assert.ok(evening.share>noon.share);assert.ok(cal.demandShape(station,17*60,date).amount>cal.demandShape(station,12*60,date).amount);});
test('London stations prefer RAI0203 station data over the London city aggregate',()=>{const {cal}=load();const euston=cal.measuredBand({crs:'EUS'},17*60);assert.equal(euston.scope,'station');assert.equal(euston.name,'Euston');assert.equal(euston.passengers,10038);});
test('Kerbside score bands are explicitly anchored to measured seat utilisation',()=>{const {cal}=load(),t=cal.scoreThresholds();assert.deepEqual({...t},{moderate:1.5,busy:2.65,veryBusy:3.85});assert.equal(cal.measuredCrowdingBand(.2),'quiet');assert.equal(cal.measuredCrowdingBand(.5),'moderate');assert.equal(cal.measuredCrowdingBand(.8),'busy');assert.equal(cal.measuredCrowdingBand(1.02),'very-busy');});
