#!/usr/bin/env python3
from pathlib import Path

path = Path('kerbside-backend/tests/browser-regression.mjs')
text = path.read_text(encoding='utf-8')
old = "      window.fetch=async()=>{ n++; return new Response(bodyFor(n),{status:200,headers:{'Content-Type':'application/xml'}}); };"
new = """      window.fetch=async input=>{
        const url=String(input&&input.url||input||'');
        if(url.includes('/gtfsrt')) return new Response(JSON.stringify({version:1,vehicles:[]}),{status:200,headers:{'Content-Type':'application/json'}});
        n++;
        return new Response(bodyFor(n),{status:200,headers:{'Content-Type':'application/xml'}});
      };"""
if text.count(old) != 1:
    raise SystemExit(f'Expected exactly one malformed-coverage fetch mock, found {text.count(old)}')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
print('Kept the malformed SIRI coverage regression isolated from the parallel GTFS-RT identity request.')
