from pathlib import Path
import base64
import json
import struct


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def png_size(data):
    if data[:8] != b"\x89PNG\r\n\x1a\n" or data[12:16] != b"IHDR":
        raise SystemExit("icon asset is not a valid PNG")
    return struct.unpack(">II", data[16:24])


bus_path = Path("bus.html")
bus = bus_path.read_text(encoding="utf-8")
bus = replace_once(bus, "const APP_VERSION = '0.6.5';", "const APP_VERSION = '0.6.6';", "app version")

head_anchor = '<meta name="description" content="A route-aware live bus board using BODS vehicle positions and optional timetable validation.">\n'
head_addition = head_anchor + (
    '<meta name="mobile-web-app-capable" content="yes">\n'
    '<meta name="apple-mobile-web-app-capable" content="yes">\n'
    '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n'
    '<meta name="apple-mobile-web-app-title" content="Kerbside">\n'
    '<link rel="apple-touch-icon" sizes="180x180" href="kerbside-backend/icons/kerbside-180.png">\n'
    '<link rel="icon" type="image/png" sizes="192x192" href="kerbside-backend/icons/kerbside-192.png">\n'
    '<link rel="manifest" href="kerbside-backend/kerbside.webmanifest">\n'
)
bus = replace_once(bus, head_anchor, head_addition, "web app head metadata")
bus_path.write_text(bus, encoding="utf-8")

backend = Path("kerbside-backend")
icons_dir = backend / "icons"
icons_dir.mkdir(parents=True, exist_ok=True)
for target in (180, 192, 512):
    sources = sorted(Path(".github/triggers").glob(f"kerbside-icon-{target}*.b64"))
    if not sources:
        raise SystemExit(f"missing encoded {target}px icon source")
    encoded = "".join(source.read_text(encoding="ascii") for source in sources)
    path = icons_dir / f"kerbside-{target}.png"
    path.write_bytes(base64.b64decode(encoded))
    if png_size(path.read_bytes()) != (target, target):
        raise SystemExit(f"failed to create {target}px icon")
    for source in sources:
        source.unlink()

manifest = {
    "name": "Kerbside — Live Buses",
    "short_name": "Kerbside",
    "description": "Live and scheduled bus information with official stop matching.",
    "start_url": "../bus.html",
    "scope": "../",
    "display": "standalone",
    "orientation": "any",
    "background_color": "#0B1119",
    "theme_color": "#0B1119",
    "icons": [
        {"src": "icons/kerbside-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable"},
        {"src": "icons/kerbside-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"},
    ],
}
manifest_path = backend / "kerbside.webmanifest"
manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
json.loads(manifest_path.read_text(encoding="utf-8"))

package_path = backend / "package.json"
package = json.loads(package_path.read_text(encoding="utf-8"))
if package.get("version") != "0.6.5":
    raise SystemExit(f"unexpected package predecessor: {package.get('version')}")
package["version"] = "0.6.6"
package_path.write_text(json.dumps(package, indent=2) + "\n", encoding="utf-8")

readme_path = backend / "README.md"
readme = readme_path.read_text(encoding="utf-8")
anchor = "Kerbside 0.6.5 increases the visual separation between the Settings title and its tabs. It suppresses two-finger browser zoom on the controls, departure board and settings dialog while preserving pinch-to-zoom on the Leaflet map.\n"
addition = anchor + "\nKerbside 0.6.6 adds dedicated Apple touch and PWA icons plus an installable web-app manifest. iOS home-screen saves use the 180px Kerbside icon, while other supported browsers can use the 192px and 512px icons and launch the app in standalone mode.\n"
readme = replace_once(readme, anchor, addition, "README release note")
readme_path.write_text(readme, encoding="utf-8")

print("Prepared Kerbside 0.6.6 with iOS and PWA icons")
