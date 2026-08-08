#!/usr/bin/env python3
from pathlib import Path

browser = Path('kerbside-backend/tests/browser-regression.mjs')
text = browser.read_text(encoding='utf-8')

browser_replacements = [
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
    (
        "    window.fetch=async () => {calls++;if(calls===1)return new Response(empty,{status:200,headers:{'Content-Type':'application/xml'}});throw new TypeError('offline');};",
        "    window.fetch=async url => {\n"
        "      if(String(url).includes('/matched')) return new Response('{\"vehicles\":[]}',{status:200,headers:{'Content-Type':'application/json'}});\n"
        "      calls++;if(calls===1)return new Response(empty,{status:200,headers:{'Content-Type':'application/xml'}});throw new TypeError('offline');\n"
        "    };",
        'partial SIRI coverage mock boundary',
    ),
]

for old, new, label in browser_replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{browser}: {label}: expected exactly one target, found {count}')
    text = text.replace(old, new, 1)

browser.write_text(text, encoding='utf-8')

audit = Path('kerbside-backend/tests/audit-regression.mjs')
audit_text = audit.read_text(encoding='utf-8')
old = "  assert.equal(result.reasonOriginNoBus, 'no bus is working this departure yet');"
new = "  assert.equal(result.reasonOriginNoBus, 'no matching live bus yet');"
count = audit_text.count(old)
if count != 1:
    raise SystemExit(f'{audit}: current schedule wording assertion: expected exactly one target, found {count}')
audit.write_text(audit_text.replace(old, new, 1), encoding='utf-8')

print('Updated browser mocks and audit wording for the matched-identity release.')
