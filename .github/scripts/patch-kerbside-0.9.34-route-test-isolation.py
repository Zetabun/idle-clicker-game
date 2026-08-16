#!/usr/bin/env python3
from pathlib import Path
import subprocess

path=Path('kerbside-backend/tests/train-route-filter-regression.mjs')
text=path.read_text(encoding='utf-8')

def replace_once(old,new,label):
    global text
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    text=text.replace(old,new,1)

replace_once("  await page.route('**://huxley2.azurewebsites.net/**', handle);\n  await page.route('**://hux.azurewebsites.net/**', handle);",
             "  await page.context().route('**://huxley2.azurewebsites.net/**', handle);\n  await page.context().route('**://hux.azurewebsites.net/**', handle);",
             'Huxley context routes')

old="""  await page.route('https://kerbside-train-movement.adambullas.workers.dev/**', route=>{\n    const url = new URL(route.request().url());\n    const results = Object.fromEntries(url.searchParams.getAll('ref').map(ref=>[ref,null]));\n    diagnostics.requests.push(url.pathname);\n    return json(route,200,{\n      ok:true,\n      date:url.searchParams.get('date') || TODAY,\n      generatedAt:Date.now(),\n      connected:false,\n      lastMessageAt:null,\n      results\n    });\n  });\n"""
new="""  // Keep this route-filter regression independent from the production movement\n  // Worker. Around the London date rollover the fixture can become same-day and\n  // the movement overlay legitimately starts polling. Use the same wildcard-CORS\n  // response helper as the other mocked APIs because WebKit validates CORS on\n  // fulfilled cross-origin routes as well as real network responses.\n  await page.context().route(/^https:\\/\\/kerbside-train-movement\\.adambullas\\.workers\\.dev\\/movement\\//, route=>{\n    const request=route.request(),url=new URL(request.url());\n    diagnostics.requests.push(url.pathname);\n    if(request.method()==='OPTIONS') return route.fulfill({\n      status:204,\n      headers:{\n        'access-control-allow-origin':'*',\n        'access-control-allow-methods':'GET,OPTIONS',\n        'access-control-allow-headers':'Accept,Content-Type'\n      }\n    });\n    const results=Object.fromEntries(url.searchParams.getAll('ref').map(ref=>[ref,null]));\n    return json(route,200,{\n      ok:true,\n      date:url.searchParams.get('date') || TODAY,\n      generatedAt:Date.now(),\n      connected:false,\n      lastMessageAt:null,\n      results\n    });\n  });\n"""
replace_once(old,new,'movement mock')

replace_once("""  await page.route('https://raw.githubusercontent.com/openfootball/football.json/**', route=>\n    json(route,200,{matches:[]})\n  );\n""","""  await page.context().route('https://raw.githubusercontent.com/openfootball/football.json/**', route=>\n    json(route,200,{matches:[]})\n  );\n  await page.context().route('https://query.wikidata.org/**', route=>\n    json(route,200,{head:{vars:[]},results:{bindings:[]}})\n  );\n""",'context-only auxiliary mocks')

replace_once("""async function runDesktop(browser){\n  const page = await browser.newPage({viewport:{width:1280,height:800}});\n""","""async function runDesktop(browser){\n  // Playwright routing cannot intercept requests handled by a Service Worker.\n  // Block registrations in this network-mocked regression so reloads remain\n  // deterministic and never escape to production APIs.\n  const context = await browser.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'});\n  const page = await context.newPage();\n""",'desktop context')

replace_once("""async function runMobile(browser){\n  const page = await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});\n""","""async function runMobile(browser){\n  const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});\n  const page = await context.newPage();\n""",'mobile context')

close_count=text.count('  await page.close();')
if close_count!=2:
    raise SystemExit(f'page close: expected two matches, found {close_count}')
text=text.replace('  await page.close();','  await context.close();')

path.write_text(text,encoding='utf-8')
subprocess.run(['node','--check',str(path)],check=True)
print('route-filter external wildcard-CORS isolation patched')
