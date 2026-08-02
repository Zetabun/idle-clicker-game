from pathlib import Path
import json


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


bus_path = Path("bus.html")
bus = bus_path.read_text(encoding="utf-8")
bus = replace_once(bus, "const APP_VERSION = '0.6.7';", "const APP_VERSION = '0.6.8';", "app version")
bus = replace_once(bus, "html,body{width:100%;height:100%;min-height:100dvh}", "html,body{width:100%;height:100%;min-height:0}", "document viewport sizing")
bus = replace_once(
    bus,
    "#app{\n  display:flex;flex-direction:column;width:100%;\n  height:100vh;height:100dvh;min-height:100%;background:var(--ink);\n}",
    "#app{\n  position:fixed;inset:0;display:flex;flex-direction:column;width:100%;\n  height:auto;min-height:0;background:var(--ink);overflow:hidden;\n}",
    "fixed standalone shell",
)
bus = replace_once(
    bus,
    "#scrim{position:fixed;inset:0;background:rgba(5,8,12,.72);z-index:2000;display:none;align-items:center;justify-content:center;padding:18px}",
    "#scrim{position:fixed;inset:0;background:rgba(5,8,12,.72);z-index:2000;display:none;align-items:flex-start;justify-content:center;padding:calc(env(safe-area-inset-top) + 12px) 18px calc(env(safe-area-inset-bottom) + 12px)}",
    "safe settings scrim",
)
bus = replace_once(
    bus,
    "  max-height:88vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 30px 70px rgba(0,0,0,.6);",
    "  max-height:calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 24px);overflow:hidden;display:flex;flex-direction:column;box-shadow:0 30px 70px rgba(0,0,0,.6);",
    "safe settings height",
)
bus_path.write_text(bus, encoding="utf-8")

package_path = Path("kerbside-backend/package.json")
package = json.loads(package_path.read_text(encoding="utf-8"))
if package.get("version") != "0.6.7":
    raise SystemExit(f"unexpected package predecessor: {package.get('version')}")
package["version"] = "0.6.8"
package_path.write_text(json.dumps(package, indent=2) + "\n", encoding="utf-8")

readme_path = Path("kerbside-backend/README.md")
readme = readme_path.read_text(encoding="utf-8")
anchor = "Kerbside 0.6.7 corrects standalone iPhone safe-area layout. The top controls now sit below the status bar and Dynamic Island, the app shell uses the dynamic viewport height, and the outer page canvas matches the mobile navigation so no contrasting strip appears beneath it. The navigation remains above the home-indicator safety area rather than placing controls inside it.\n"
addition = anchor + "\nKerbside 0.6.8 pins the standalone app shell to all four viewport edges, removing the remaining iOS home-screen gap. The Settings overlay now starts beneath the status bar and constrains its height between the top and bottom safe areas, preventing its title and close control from being clipped.\n"
readme = replace_once(readme, anchor, addition, "README release note")
readme_path.write_text(readme, encoding="utf-8")

print("Prepared Kerbside 0.6.8 standalone viewport fix")
