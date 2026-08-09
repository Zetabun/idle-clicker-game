from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
target = ROOT / "kerbside-backend/tests/browser-regression.mjs"
source = target.read_text(encoding="utf-8")
old = "assert.match(busSource, /if\\(S\\.hideAway && strength<0 && d>100 && !routeAhead && !journeyBearingOverride\\)\\{/);"
new = "assert.match(busSource, /if\\(S\\.hideAway && strength<0 && d>100 && !routeAhead && !journeyBearingOverride && !routeDirectionTrusted\\)\\{/);"
count = source.count(old)
if count != 1:
    raise RuntimeError(f"hideAway browser guard: expected exactly one stale assertion, found {count}")
target.write_text(source.replace(old, new, 1), encoding="utf-8")
Path(__file__).unlink()
print("Updated route-aware hideAway browser regression guard")
