from pathlib import Path
import json


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)

bus_path = Path("bus.html")
bus = bus_path.read_text(encoding="utf-8")
bus = replace_once(bus, '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">', '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">', "viewport zoom lock")
bus = replace_once(bus, "const APP_VERSION = '0.6.8';", "const APP_VERSION = '0.6.9';", "app version")
bus = replace_once(bus, "#topbar,#board,#viewbar,#scrim{touch-action:pan-x pan-y}\n#map{touch-action:auto}", "#topbar,#board,#viewbar{touch-action:pan-x pan-y}\n#scrim{touch-action:none;overscroll-behavior:contain}\n#map{touch-action:auto}", "settings gesture containment")
bus = replace_once(bus, "@media (max-width:820px){\n  .sheet header{padding:11px 13px;gap:8px}", "@media (max-width:820px){\n  /* Safari zooms focused controls below 16px and can leave the standalone\n     visual viewport enlarged after Settings closes. */\n  input,select,textarea{font-size:16px!important}\n  .sheet header{padding:11px 13px;gap:8px}", "mobile form zoom prevention")
bus_path.write_text(bus, encoding="utf-8")

package_path = Path("kerbside-backend/package.json")
package = json.loads(package_path.read_text(encoding="utf-8"))
if package.get("version") != "0.6.8":
    raise SystemExit(f"unexpected package predecessor: {package.get('version')}")
package["version"] = "0.6.9"
package_path.write_text(json.dumps(package, indent=2) + "\n", encoding="utf-8")

readme_path = Path("kerbside-backend/README.md")
readme = readme_path.read_text(encoding="utf-8")
anchor = "Kerbside 0.6.8 pins the standalone app shell to all four viewport edges, removing the remaining iOS home-screen gap. The Settings overlay now starts beneath the status bar and constrains its height between the top and bottom safe areas, preventing its title and close control from being clipped. This keeps the same safe layout after reopening the saved home-screen app.\n"
addition = anchor + "\nKerbside 0.6.9 prevents iOS focus zoom inside Settings by keeping mobile form controls at 16px, locking browser-page scaling, and containing Settings gestures. Leaflet map pinch zoom remains handled by the map itself. This prevents the main standalone viewport remaining enlarged or shortened after the Settings sheet closes.\n"
readme = replace_once(readme, anchor, addition, "README release note")
readme_path.write_text(readme, encoding="utf-8")

print("Prepared Kerbside 0.6.9 iOS focus zoom fix")
