#!/usr/bin/env python3
from pathlib import Path
import subprocess

Path("VERSION").write_text("0.8.8\n", encoding="utf-8")

bus_path = Path("bus.html")
bus = bus_path.read_text(encoding="utf-8")
old = '<script src="kerbside-train-loading.js?v=0.8.7"></script>'
new = old + '\n<script src="kerbside-train-loading-guidance.js?v=0.8.8"></script>'
if bus.count(old) != 1:
    raise SystemExit("live-loading script anchor changed")
bus_path.write_text(bus.replace(old, new, 1), encoding="utf-8")

wrangler_path = Path("kerbside-backend/wrangler.toml")
wrangler = wrangler_path.read_text(encoding="utf-8")
old_marker = "# Production alignment marker for Kerbside 0.8.7 Live Loading, 2026-08-13."
new_marker = "# Production alignment marker for Kerbside 0.8.8 Coach Guidance, 2026-08-13."
if wrangler.count(old_marker) != 1:
    raise SystemExit("Worker release marker changed")
wrangler_path.write_text(wrangler.replace(old_marker, new_marker, 1), encoding="utf-8")

subprocess.run(["python3", ".github/scripts/sync-version.py"], check=True)
