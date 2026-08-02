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
    '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">',
    "iOS standalone viewport",
)
bus = replace_once(
    bus,
    '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
    '<meta name="apple-mobile-web-app-status-bar-style" content="black">',
    "iOS standalone status bar",
)
bus = replace_once(bus, "const APP_VERSION = '0.6.9';", "const APP_VERSION = '0.6.10';", "app version")
if "viewport-fit=cover" in bus:
    raise SystemExit("viewport-fit=cover remains in bus.html")
if 'apple-mobile-web-app-status-bar-style" content="black-translucent' in bus:
    raise SystemExit("black-translucent status bar remains in bus.html")
bus_path.write_text(bus, encoding="utf-8")

package_path = Path("kerbside-backend/package.json")
package = json.loads(package_path.read_text(encoding="utf-8"))
if package.get("version") != "0.6.9":
    raise SystemExit(f"unexpected package predecessor: {package.get('version')}")
package["version"] = "0.6.10"
package_path.write_text(json.dumps(package, indent=2) + "\n", encoding="utf-8")

readme_path = Path("kerbside-backend/README.md")
readme = readme_path.read_text(encoding="utf-8")
anchor = "Kerbside 0.6.9 prevents iOS focus zoom inside Settings by keeping mobile form controls at 16px, locking browser-page scaling, and containing Settings gestures. Leaflet map pinch zoom remains handled by the map itself. This prevents the main standalone viewport remaining enlarged or shortened after the Settings sheet closes.\n"
addition = anchor + "\nKerbside 0.6.10 avoids the WebKit installed-app viewport gap by removing `viewport-fit=cover` and switching from the translucent status bar to Apple's normally inset black standalone status bar. The saved iOS app now receives a stable viewport below the status bar instead of relying on the broken edge-to-edge height calculation; map pinch zoom remains available.\n"
readme = replace_once(readme, anchor, addition, "README release note")
readme_path.write_text(readme, encoding="utf-8")

print("Prepared Kerbside 0.6.10 iOS standalone viewport fix")
