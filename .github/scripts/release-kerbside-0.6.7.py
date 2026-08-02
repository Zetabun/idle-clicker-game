from pathlib import Path
import json


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


bus_path = Path("bus.html")
bus = bus_path.read_text(encoding="utf-8")
bus = replace_once(bus, "const APP_VERSION = '0.6.6';", "const APP_VERSION = '0.6.7';", "app version")

old_root = """*{box-sizing:border-box}
html,body{height:100%}
body{
  margin:0;background:var(--ink);color:var(--text);
  font-family:'Archivo',system-ui,-apple-system,'Segoe UI',sans-serif;
  font-size:15px;line-height:1.45;overflow:hidden;
  -webkit-font-smoothing:antialiased;
}
"""
new_root = """*{box-sizing:border-box}
html,body{width:100%;height:100%;min-height:100dvh}
/* iOS may expose a small area outside the standalone layout viewport.
   Match that outer canvas to the fixed mobile navigation rather than
   leaving a visually separate dark strip. */
html,body{background:var(--ink-2)}
body{
  margin:0;color:var(--text);
  font-family:'Archivo',system-ui,-apple-system,'Segoe UI',sans-serif;
  font-size:15px;line-height:1.45;overflow:hidden;
  -webkit-font-smoothing:antialiased;
}
"""
bus = replace_once(bus, old_root, new_root, "root viewport styles")

old_shell = """#app{display:flex;flex-direction:column;height:100%}
#topbar{
  display:flex;align-items:center;gap:10px;padding:10px 14px;
"""
new_shell = """#app{
  display:flex;flex-direction:column;width:100%;
  height:100vh;height:100dvh;min-height:100%;background:var(--ink);
}
#topbar{
  display:flex;align-items:center;gap:10px;
  padding:calc(10px + env(safe-area-inset-top)) 14px 10px;
"""
bus = replace_once(bus, old_shell, new_shell, "standalone app shell")

bus = replace_once(
    bus,
    "  #topbar{padding:8px 11px;gap:8px}\n",
    "  #topbar{padding:calc(8px + env(safe-area-inset-top)) 11px 8px;gap:8px}\n",
    "mobile top safe area",
)

required = (
    "height:100dvh",
    "env(safe-area-inset-top)",
    "env(safe-area-inset-bottom)",
    "html,body{background:var(--ink-2)}",
)
for marker in required:
    if marker not in bus:
        raise SystemExit(f"missing required iOS layout marker: {marker}")

bus_path.write_text(bus, encoding="utf-8")

package_path = Path("kerbside-backend/package.json")
package = json.loads(package_path.read_text(encoding="utf-8"))
if package.get("version") != "0.6.6":
    raise SystemExit(f"unexpected package predecessor: {package.get('version')}")
package["version"] = "0.6.7"
package_path.write_text(json.dumps(package, indent=2) + "\n", encoding="utf-8")

readme_path = Path("kerbside-backend/README.md")
readme = readme_path.read_text(encoding="utf-8")
anchor = "Kerbside 0.6.6 adds dedicated Apple touch and PWA icons plus an installable web-app manifest. iPhone and iPad home-screen saves use the 180px Kerbside icon, while other supported browsers can use the 192px and 512px icons and launch the app in standalone mode.\n"
addition = anchor + "\nKerbside 0.6.7 corrects standalone iPhone safe-area layout. The top controls now sit below the status bar and Dynamic Island, the app shell uses the dynamic viewport height, and the outer page canvas matches the mobile navigation so no contrasting strip appears beneath it.\n"
readme = replace_once(readme, anchor, addition, "README release note")
readme_path.write_text(readme, encoding="utf-8")

print("Prepared Kerbside 0.6.7 with iOS safe-area sizing")
