#!/usr/bin/env python3
from pathlib import Path

path = Path('kerbside-backend/tests/browser-regression.mjs')
text = path.read_text(encoding='utf-8')

replacements = [
    (
        "assert.match(busSource, /fetchLive,ingest,relevant,liveState:S/);",
        "assert.match(busSource, /fetchLive,fetchMatchedBatch,applyMatchedIdentities,retainMatchedIdentity,ingest,relevant,liveState:S/);",
        'expanded matched-identity test API assertion',
    ),
    (
        "      window.fetch=async()=>{ n++; return new Response(bodyFor(n),{status:200,headers:{'Content-Type':'application/xml'}}); };",
        "      window.fetch=async url=>{\n"
        "        if(String(url).includes('/matched')) return new Response('{\"vehicles\":[]}',{status:200,headers:{'Content-Type':'application/json'}});\n"
        "        n++; return new Response(bodyFor(n),{status:200,headers:{'Content-Type':'application/xml'}});\n"
        "      };",
        'malformed SIRI coverage mock boundary',
    ),
]

for old, new, label in replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: {label}: expected exactly one target, found {count}')
    text = text.replace(old, new, 1)

path.write_text(text, encoding='utf-8')
print('Updated browser regressions for the auxiliary matched-feed request path.')
