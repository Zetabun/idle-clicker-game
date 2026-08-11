import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function loadLiveWindow(hostname='zetabun.github.io'){
  const source=fs.readFileSync(new URL('../kerbside-train-live-window.js',import.meta.url),'utf8');
  const context={
    URL,AbortController,setTimeout,clearTimeout,Intl,Date,console,
    location:{href:`https://${hostname}/idle-clicker-game/bus.html`,hostname},
    document:{readyState:'loading',addEventListener(){},getElementById(){return null;},querySelector(){return null;}},
    window:{
      __KERBSIDE_TRAINS__:{state:{station:{name:'Birmingham New Street',crs:'BHM'}}},
      __KERBSIDE_TRAIN_ROUTES__:{state:{destination:{name:'Bristol Temple Meads',crs:'BRI'}}}
    }
  };
  vm.createContext(context);
  vm.runInContext(source,context);
  return context.window.__KERBSIDE_TRAIN_LIVE_WINDOW__;
}

test('maps the existing Huxley-shaped request to the private official Worker',()=>{
  const api=loadLiveWindow();
  assert.equal(api.OFFICIAL,'https://kerbside-rail.adambullas.workers.dev');
  assert.equal(api.OFFICIAL_ATTEMPT_MS,1500);
  assert.equal(api.PROVIDER_ATTEMPT_MS,4000);
  assert.equal(api.officialEnabled(),true);
  const official=api.officialBoardUrl(new URL('https://huxley2.azurewebsites.net/departures/BHM/9?expand=true&timeOffset=53&timeWindow=120'));
  assert.equal(official.origin,'https://kerbside-rail.adambullas.workers.dev');
  assert.equal(official.pathname,'/departures/BHM/to/BRI/9');
  assert.equal(official.searchParams.get('expand'),'true');
  assert.equal(official.searchParams.get('timeOffset'),'53');
  assert.equal(official.searchParams.get('timeWindow'),'120');
});

test('keeps the existing community provider order as the fallback path',()=>{
  const api=loadLiveWindow();
  assert.deepEqual(Array.from(api.providerOrder(new URL('https://huxley2.azurewebsites.net/departures/BHM/9'))),[
    'https://huxley2.azurewebsites.net','https://hux.azurewebsites.net'
  ]);
});

test('does not contact production official Worker from localhost regression runs',()=>{
  assert.equal(loadLiveWindow('127.0.0.1').officialEnabled(),false);
  assert.equal(loadLiveWindow('localhost').officialEnabled(),false);
});
