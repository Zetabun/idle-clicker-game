from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding="utf-8")


def write(path, text):
    Path(path).write_text(text, encoding="utf-8")


bus = read("bus.html")
explicit_helper = "function mapVehicleVisible(v,shown,now=Date.now()){if(shown) return true;const ts=Number(v&&v.ts),age=now-ts;return Number.isFinite(ts)&&Number.isFinite(age)&&age>=0&&age<=4*60*1000;}"
bus, helper_count = re.subn(
    r"function mapVehicleVisible\(v,shown,now=Date\.now\(\)\)\{.*?\}",
    explicit_helper,
    bus,
    count=1,
)
if helper_count != 1:
    raise SystemExit(f"post release: expected one map visibility helper, found {helper_count}")
if bus.count("function mapVehicleVisible(") != 1:
    raise SystemExit(f"post release: expected one emitted map visibility helper, found {bus.count('function mapVehicleVisible(')}")
if "boardRefreshCanRender" not in bus or "feedRefreshing:false" not in bus:
    raise SystemExit("post release: background refresh gate was not emitted")
write("bus.html", bus)
print("Emitted map helper:", explicit_helper)

browser = read("kerbside-backend/tests/browser-regression.mjs")
old_return = "      return {direction,recent,synthetic,staleMap,heldMap,loading,html,primary:plan.primary,fallback:plan.fallback};"
new_return = "      return {direction,recent,synthetic,staleMap,heldMap,loading,html,primary:plan.primary,fallback:plan.fallback,mapHelper:api.mapVehicleVisible.toString(),mapAge:now-(now-5*60000),mapTimestamp:now-5*60000,now};"
if browser.count(old_return) != 1:
    raise SystemExit(f"post release: expected one resilience return, found {browser.count(old_return)}")
browser = browser.replace(old_return, new_return, 1)

browser, stale_count = re.subn(
    r"assert\.equal\(resilience\.staleMap,false(?:,JSON\.stringify\(resilience\))?\);",
    "assert.equal(resilience.staleMap,false,JSON.stringify(resilience));",
    browser,
    count=1,
)
if stale_count != 1:
    raise SystemExit(f"post release: expected one stale-map assertion, found {stale_count}")
browser, held_count = re.subn(
    r"assert\.equal\(resilience\.heldMap,true(?:,JSON\.stringify\(resilience\))?\);",
    "assert.equal(resilience.heldMap,true,JSON.stringify(resilience));",
    browser,
    count=1,
)
if held_count != 1:
    raise SystemExit(f"post release: expected one held-map assertion, found {held_count}")
write("kerbside-backend/tests/browser-regression.mjs", browser)
