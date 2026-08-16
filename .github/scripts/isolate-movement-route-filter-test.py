#!/usr/bin/env python3
from pathlib import Path

path = Path('kerbside-backend/tests/train-route-filter-regression.mjs')
text = path.read_text(encoding='utf-8')
old = """  await page.route('**://huxley2.azurewebsites.net/**', handle);
  await page.route('**://hux.azurewebsites.net/**', handle);
  await page.route('https://raw.githubusercontent.com/openfootball/football.json/**', route=>
    json(route,200,{matches:[]})
  );
"""
new = """  await page.route('**://huxley2.azurewebsites.net/**', handle);
  await page.route('**://hux.azurewebsites.net/**', handle);
  await page.route('https://kerbside-train-movement.adambullas.workers.dev/**', route=>{
    const url = new URL(route.request().url());
    const results = Object.fromEntries(url.searchParams.getAll('ref').map(ref=>[ref,null]));
    diagnostics.requests.push(url.pathname);
    return json(route,200,{
      ok:true,
      date:url.searchParams.get('date') || TODAY,
      generatedAt:Date.now(),
      connected:false,
      lastMessageAt:null,
      results
    });
  });
  await page.route('https://raw.githubusercontent.com/openfootball/football.json/**', route=>
    json(route,200,{matches:[]})
  );
"""
if text.count(old) != 1:
    raise SystemExit(f'expected one route mock anchor, found {text.count(old)}')
path.write_text(text.replace(old,new,1),encoding='utf-8')
print('Isolated Network Rail movement requests in train-route-filter regression.')
