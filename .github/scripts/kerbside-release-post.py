from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

bus = ROOT / "bus.html"
bus_source = bus.read_text(encoding="utf-8")
stale_constant = "const ROUTE_CONTINUITY_MAX_STOP_RETREAT = 250;\n"
constant_count = bus_source.count(stale_constant)
if constant_count != 1:
    raise RuntimeError(
        f"route continuity retreat constant: expected exactly one stale declaration, found {constant_count}"
    )
bus.write_text(bus_source.replace(stale_constant, "", 1), encoding="utf-8")

target = ROOT / "kerbside-backend/tests/browser-regression.mjs"
source = target.read_text(encoding="utf-8")
old = "assert.match(busSource, /if\\(S\\.hideAway && strength<0 && d>100 && !routeAhead && !journeyBearingOverride\\)\\{/);"
new = "assert.match(busSource, /if\\(S\\.hideAway && strength<0 && d>100 && !routeAhead && !journeyBearingOverride && !routeDirectionTrusted\\)\\{/);"
count = source.count(old)
if count != 1:
    raise RuntimeError(f"hideAway browser guard: expected exactly one stale assertion, found {count}")
target.write_text(source.replace(old, new, 1), encoding="utf-8")

Path(__file__).unlink()
print("Removed stale route-retreat constant and updated route-aware browser regression guard")
