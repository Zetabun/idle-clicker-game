from pathlib import Path
import json


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


bus_path = Path("bus.html")
bus = bus_path.read_text(encoding="utf-8")

bus = replace_once(
    bus,
    "const APP_VERSION = '0.6.4';",
    "const APP_VERSION = '0.6.5';",
    "app version",
)

bus = replace_once(
    bus,
    ".settings-heading{display:flex;align-items:center;gap:13px;min-width:0;flex:1;flex-wrap:wrap}",
    ".settings-heading{display:flex;align-items:center;column-gap:20px;row-gap:8px;min-width:0;flex:1;flex-wrap:wrap}",
    "desktop settings spacing",
)

bus = replace_once(
    bus,
    "  .settings-heading{gap:8px;flex-wrap:nowrap}",
    "  .settings-heading{column-gap:12px;row-gap:0;flex-wrap:nowrap}",
    "mobile settings spacing",
)

bus = replace_once(
    bus,
    ".leaflet-marker-icon.vehmark{transition:transform var(--glide,950ms) linear;will-change:transform}\n",
    ".leaflet-marker-icon.vehmark{transition:transform var(--glide,950ms) linear;will-change:transform}\n"
    "/* Keep two-finger page zoom off the controls and departure board.\n"
    "   The map remains the one surface where pinch gestures are enabled. */\n"
    "#topbar,#board,#viewbar,#scrim{touch-action:pan-x pan-y}\n"
    "#map{touch-action:auto}\n",
    "touch action styles",
)

pinch_guard = """function gestureIsOnMap(target){
  const el=target&&target.nodeType===1?target:target&&target.parentElement;
  return !!(el&&el.closest&&el.closest('#map'));
}
function stopUiPinch(event){
  if(event.touches&&event.touches.length>1&&!gestureIsOnMap(event.target)) event.preventDefault();
}
document.addEventListener('touchmove',stopUiPinch,{passive:false});
['gesturestart','gesturechange'].forEach(type=>{
  document.addEventListener(type,event=>{
    if(!gestureIsOnMap(event.target)) event.preventDefault();
  },{passive:false});
});

"""

bus = replace_once(
    bus,
    "window.addEventListener('resize',()=>map.invalidateSize());\n",
    pinch_guard + "window.addEventListener('resize',()=>map.invalidateSize());\n",
    "pinch gesture guard",
)

required = [
    "const APP_VERSION = '0.6.5';",
    "column-gap:20px",
    "column-gap:12px",
    "#topbar,#board,#viewbar,#scrim{touch-action:pan-x pan-y}",
    "document.addEventListener('touchmove',stopUiPinch,{passive:false})",
    "gestureIsOnMap(event.target)",
]
for marker in required:
    if marker not in bus:
        raise SystemExit(f"missing expected output: {marker}")

bus_path.write_text(bus, encoding="utf-8")

package_path = Path("kerbside-backend/package.json")
package = json.loads(package_path.read_text(encoding="utf-8"))
if package.get("version") != "0.6.4":
    raise SystemExit(f"unexpected package predecessor: {package.get('version')}")
package["version"] = "0.6.5"
package_path.write_text(json.dumps(package, indent=2) + "\n", encoding="utf-8")

readme_path = Path("kerbside-backend/README.md")
readme = readme_path.read_text(encoding="utf-8")
anchor = "\nThe Worker remains backwards-compatible for live data:\n"
addition = "\nKerbside 0.6.5 increases the visual separation between the Settings title and its tabs. It also suppresses two-finger browser zoom on the controls, departure board and settings dialog while preserving Leaflet pinch-zoom on the map.\n" + anchor
readme = replace_once(readme, anchor, addition, "README release note")
readme_path.write_text(readme, encoding="utf-8")

print("Prepared Kerbside 0.6.5")
