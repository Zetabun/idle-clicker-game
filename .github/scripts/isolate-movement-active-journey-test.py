#!/usr/bin/env python3
from pathlib import Path

path = Path('kerbside-backend/tests/train-active-journey-regression.mjs')
text = path.read_text(encoding='utf-8')
old = """  await page.route('https://query.wikidata.org/**',route=>route.fulfill({status:200,contentType:'application/sparql-results+json',body:JSON.stringify({head:{vars:[]},results:{bindings:[]}})}));
  await page.route('https://raw.githubusercontent.com/openfootball/football.json/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({matches:[]})}));

  await page.goto(`http://127.0.0.1:${port}/bus.html`,{waitUntil:'domcontentloaded'});
"""
new = """  await page.route('https://query.wikidata.org/**',route=>route.fulfill({status:200,contentType:'application/sparql-results+json',body:JSON.stringify({head:{vars:[]},results:{bindings:[]}})}));
  await page.route('https://raw.githubusercontent.com/openfootball/football.json/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({matches:[]})}));
  await page.route('https://kerbside-train-movement.adambullas.workers.dev/**',route=>{
    const url=new URL(route.request().url());
    const results=Object.fromEntries(url.searchParams.getAll('ref').map(ref=>[ref,null]));
    return route.fulfill({
      status:200,
      contentType:'application/json',
      headers:{'Access-Control-Allow-Origin':'*','Cache-Control':'no-store'},
      body:JSON.stringify({ok:true,date:url.searchParams.get('date')||'',generatedAt:Date.now(),connected:false,lastMessageAt:null,results})
    });
  });

  await page.goto(`http://127.0.0.1:${port}/bus.html`,{waitUntil:'domcontentloaded'});
"""
count = text.count(old)
if count != 1:
    raise SystemExit(f'expected one Active Journey route-mock anchor, found {count}')
path.write_text(text.replace(old,new,1),encoding='utf-8')
print('Isolated Network Rail movement requests in train-active-journey regression.')
