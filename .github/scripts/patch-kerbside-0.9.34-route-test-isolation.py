#!/usr/bin/env python3
from pathlib import Path
import subprocess

path=Path('kerbside-backend/tests/train-route-filter-regression.mjs')
text=path.read_text(encoding='utf-8')
old="""  await page.route('https://kerbside-train-movement.adambullas.workers.dev/**', route=>{\n    const url = new URL(route.request().url());\n    const results = Object.fromEntries(url.searchParams.getAll('ref').map(ref=>[ref,null]));\n    diagnostics.requests.push(url.pathname);\n    return json(route,200,{\n      ok:true,\n      date:url.searchParams.get('date') || TODAY,\n      generatedAt:Date.now(),\n      connected:false,\n      lastMessageAt:null,\n      results\n    });\n  });\n"""
new="""  // Keep this route-filter regression independent from the production movement\n  // Worker. Around the London date rollover the fixture can become same-day and\n  // the movement overlay legitimately starts polling; context-level interception\n  // is more reliable in WebKit than a page glob for this cross-origin request.\n  await page.context().route(/^https:\\/\\/kerbside-train-movement\\.adambullas\\.workers\\.dev\\/movement\\//, route=>{\n    const request=route.request(),url=new URL(request.url());\n    diagnostics.requests.push(url.pathname);\n    const origin=`http://127.0.0.1:${port}`;\n    if(request.method()==='OPTIONS') return route.fulfill({\n      status:204,\n      headers:{\n        'access-control-allow-origin':origin,\n        'access-control-allow-methods':'GET,OPTIONS',\n        'access-control-allow-headers':'Accept,Content-Type'\n      }\n    });\n    const results=Object.fromEntries(url.searchParams.getAll('ref').map(ref=>[ref,null]));\n    return route.fulfill({\n      status:200,\n      contentType:'application/json',\n      headers:{'access-control-allow-origin':origin},\n      body:JSON.stringify({\n        ok:true,\n        date:url.searchParams.get('date') || TODAY,\n        generatedAt:Date.now(),\n        connected:false,\n        lastMessageAt:null,\n        results\n      })\n    });\n  });\n"""
count=text.count(old)
if count!=1:
    raise SystemExit(f'expected one movement mock block, found {count}')
path.write_text(text.replace(old,new,1),encoding='utf-8')
subprocess.run(['node','--check',str(path)],check=True)
print('route-filter movement isolation patched')
