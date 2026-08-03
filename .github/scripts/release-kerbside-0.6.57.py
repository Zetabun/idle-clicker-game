from pathlib import Path

OLD = "0.6.56"
NEW = "0.6.57"


def read(path):
    return Path(path).read_text(encoding="utf-8")


def write(path, text):
    Path(path).write_text(text, encoding="utf-8")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


bus = read("bus.html")
bus = replace_once(bus, f"const APP_VERSION = '{OLD}';", f"const APP_VERSION = '{NEW}';", "browser version")

old_brand_css = """.brand .dot{width:7px;height:7px;border-radius:50%;background:var(--led);box-shadow:0 0 8px var(--led)}
.brand small{color:var(--text-dim);font-size:11px;letter-spacing:.08em;text-transform:uppercase}
"""
new_brand_css = """.brand .dot{width:7px;height:7px;border-radius:50%;background:var(--led);box-shadow:0 0 8px var(--led)}
.brand small{color:var(--text-dim);font-size:11px;letter-spacing:.08em;text-transform:uppercase}
.brand-icon{display:none}
"""
bus = replace_once(bus, old_brand_css, new_brand_css, "desktop-hidden app icon")

old_mobile_header = """  #topbar{padding:calc(8px + env(safe-area-inset-top)) 11px 8px;gap:8px}
  .brand small{display:none}
  .brand h1{font-size:14px}
  .dirswitch{margin-left:auto}
  .dirswitch button{padding:6px 10px;font-size:12px;gap:4px}
  .lbl{display:none}
  .lblshort{display:inline}
  #setBtn{flex:0 0 auto}
  .searchwrap{order:3;flex-basis:100%}
"""
new_mobile_header = """  #topbar{
    display:grid;grid-template-columns:minmax(0,1fr) auto 44px;
    grid-template-areas:\"brand brand brand\" \"search directions settings\";
    align-items:stretch;column-gap:7px;row-gap:8px;
    padding:calc(10px + env(safe-area-inset-top)) 10px 9px;
  }
  .brand{
    grid-area:brand;width:100%;min-width:0;margin:0;padding:1px 3px 9px;
    align-items:center;gap:9px;border-bottom:1px solid rgba(34,48,63,.65);
  }
  .brand-icon{display:block;width:38px;height:38px;flex:0 0 38px;border-radius:9px;object-fit:cover}
  .brand .dot,.brand small{display:none}
  .brand h1{font-size:22px;line-height:1;letter-spacing:-.055em}
  .searchwrap{grid-area:search;order:initial;flex:none;min-width:0;width:100%;height:46px}
  .searchwrap input{height:46px;border-radius:10px;padding:10px 72px 10px 39px;font-size:16px}
  .searchwrap .pin{left:12px}
  .searchwrap .pin svg{width:20px;height:20px}
  .searchwrap .go{right:36px;padding:6px 4px;font-size:12px}
  .searchwrap .locate{right:7px;padding:5px}
  .searchwrap .locate svg{width:19px;height:19px}
  .dirswitch{grid-area:directions;margin:0;align-self:stretch;min-width:0;border-radius:10px}
  .dirswitch button{height:38px;padding:0 8px;font-size:12px;gap:3px}
  .dirswitch button .arrow{font-size:12px}
  .lbl{display:none}
  .lblshort{display:inline}
  #setBtn{
    grid-area:settings;display:grid;place-items:center;width:44px;height:46px;
    padding:0;border-radius:10px;align-self:stretch;
  }
  #setBtn svg{width:20px;height:20px}
"""
bus = replace_once(bus, old_mobile_header, new_mobile_header, "mobile header layout")

old_brand_html = '<div class="brand"><span class="dot"></span><h1>Kerbside</h1><small>live buses</small></div>'
new_brand_html = '<div class="brand"><img class="brand-icon" src="kerbside-backend/icons/kerbside-192.png" alt="" width="38" height="38"><span class="dot"></span><h1>Kerbside</h1><small>live buses</small></div>'
bus = replace_once(bus, old_brand_html, new_brand_html, "mobile app icon brand")
write("bus.html", bus)

package = read("kerbside-backend/package.json")
package = replace_once(package, f'"version": "{OLD}"', f'"version": "{NEW}"', "package version")
write("kerbside-backend/package.json", package)

worker = read("kerbside-backend/src/worker.js")
worker = replace_once(worker, f"version: '{OLD}'", f"version: '{NEW}'", "worker version")
write("kerbside-backend/src/worker.js", worker)

worker_test = read("kerbside-backend/test/worker.test.js")
worker_test = replace_once(worker_test, f"assert.equal(body.version, '{OLD}');", f"assert.equal(body.version, '{NEW}');", "worker test version")
write("kerbside-backend/test/worker.test.js", worker_test)

browser = read("kerbside-backend/tests/browser-regression.mjs")
browser = replace_once(
    browser,
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.56'/);",
    """assert.match(busSource, /const APP_VERSION = '0\\.6\\.57'/);
assert.match(busSource, /class=\"brand-icon\" src=\"kerbside-backend\\/icons\\/kerbside-192\\.png\"/);
assert.match(busSource, /\\.brand-icon\\{display:none\\}/);
assert.match(busSource, /grid-template-areas:\"brand brand brand\" \"search directions settings\"/);
assert.match(busSource, /\\.brand-icon\\{display:block;width:38px;height:38px/);
assert.doesNotMatch(busSource, /\\.searchwrap\\{order:3;flex-basis:100%\\}/);""",
    "browser mobile header source guards",
)

layout_anchor = """  assert.equal(await page.locator('#setBtn').isVisible(), true);
  const viewportContent=await page.locator('meta[name=\"viewport\"]').getAttribute('content');"""
layout_test = """  assert.equal(await page.locator('#setBtn').isVisible(), true);
  const mobileHeader = await page.evaluate(() => {
    const topbar=document.getElementById('topbar');
    const brand=topbar.querySelector('.brand');
    const icon=topbar.querySelector('.brand-icon');
    const search=topbar.querySelector('.searchwrap');
    const directions=topbar.querySelector('.dirswitch');
    const settings=document.getElementById('setBtn');
    const rect=element=>{const r=element.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    const b=rect(brand),s=rect(search),d=rect(directions),g=rect(settings);
    const controlTop=Math.min(s.top,d.top,g.top);
    return {
      topDisplay:getComputedStyle(topbar).display,
      iconDisplay:getComputedStyle(icon).display,
      iconSrc:new URL(icon.getAttribute('src'),location.href).pathname,
      brandAbove:b.bottom<=controlTop+2,
      controlsAligned:Math.max(s.top,d.top,g.top)-controlTop<=2,
      controlsOrdered:s.left<d.left&&d.right<=g.left,
      withinViewport:g.right<=innerWidth,
      searchHeight:Math.round(s.height),
      settingsHeight:Math.round(g.height)
    };
  });
  assert.deepEqual(mobileHeader,{
    topDisplay:'grid',iconDisplay:'block',iconSrc:'/kerbside-backend/icons/kerbside-192.png',
    brandAbove:true,controlsAligned:true,controlsOrdered:true,withinViewport:true,
    searchHeight:46,settingsHeight:46
  });
  const viewportContent=await page.locator('meta[name=\"viewport\"]').getAttribute('content');"""
browser = replace_once(browser, layout_anchor, layout_test, "mobile header geometry regression")
browser = replace_once(
    browser,
    "textContent.includes('app 0.6.56')",
    "textContent.includes('app 0.6.57')",
    "settings version expectation",
)
write("kerbside-backend/tests/browser-regression.mjs", browser)

readme = read("kerbside-backend/README.md")
release_note = """Kerbside 0.6.57 redesigns only the mobile top header to match the supplied two-row reference: the existing installed-app icon now sits beside the Kerbside wordmark on a dedicated brand row, while location search, compact In/Out/Both direction controls and Settings align on one control row beneath it. The desktop header remains on its existing layout. WebKit regression verifies the mobile grid, icon, vertical hierarchy, control alignment, viewport fit and 46-pixel touch targets.

"""
readme = replace_once(
    readme,
    "The Worker remains backwards-compatible for live data:",
    release_note + "The Worker remains backwards-compatible for live data:",
    "release note",
)
write("kerbside-backend/README.md", readme)

print(f"Prepared Kerbside {NEW} mobile header release.")
