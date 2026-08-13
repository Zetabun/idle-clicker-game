#!/usr/bin/env python3
from __future__ import annotations

import subprocess
from pathlib import Path

VERSION = "0.8.8"


def replace_once(text: str, old: str, new: str, *, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one occurrence of {old!r}, found {count}")
    return text.replace(old, new, 1)


def main() -> None:
    Path("VERSION").write_text(VERSION + "\n", encoding="utf-8")

    bus_path = Path("bus.html")
    bus = bus_path.read_text(encoding="utf-8")
    bus = replace_once(
        bus,
        'href="kerbside-trains.css?v=0.8.7"',
        'href="kerbside-trains.css?v=0.8.8"',
        label="rail stylesheet cache buster",
    )
    bus = replace_once(
        bus,
        'src="kerbside-train-loading.js?v=0.8.7"',
        'src="kerbside-train-loading.js?v=0.8.8"',
        label="train-loading cache buster",
    )
    bus_path.write_text(bus, encoding="utf-8")

    css_path = Path("kerbside-trains.css")
    css = css_path.read_text(encoding="utf-8")
    marker = "/* Kerbside 0.8.7 — direct Darwin coach-loading evidence. */"
    start = css.find(marker)
    if start < 0:
        raise SystemExit("Could not find the 0.8.7 live-loading CSS block")
    replacement = r'''/* Kerbside 0.8.8 — class-aware live coach-loading guidance. */
.train-live-loading{margin:12px 0;padding:11px;border:1px solid var(--rule);border-radius:var(--radius);background:rgb(var(--ink-rgb) / .22)}
.train-loading-summary{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:5px 12px;margin:6px 0 9px}
.train-loading-summary strong{font-family:'Martian Mono',monospace;color:var(--led);font-size:13px}
.train-loading-summary>span{font-size:11px;color:var(--text-dim);text-align:right}
.train-loading-spread{grid-column:1 / -1;display:flex;flex-wrap:wrap;gap:5px;margin-top:2px}
.train-loading-spread span{padding:3px 6px;border:1px solid var(--rule);border-radius:999px;background:var(--ink-2);color:var(--text-mute);font-size:9px;line-height:1.2}
.train-loading-coaches{display:grid;grid-template-columns:repeat(auto-fit,minmax(104px,1fr));gap:6px}
.train-loading-coach{display:grid;gap:5px;padding:8px;border:1px solid var(--rule);border-radius:7px;background:var(--ink-2);min-width:0}
.train-loading-coach-head{display:flex;align-items:center;justify-content:space-between;gap:6px;min-width:0}
.train-loading-coach-head b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}
.train-loading-class{flex:0 0 auto;padding:2px 5px;border:1px solid var(--rule);border-radius:999px;color:var(--text-mute);font-size:8px;font-style:normal;line-height:1.2}
.train-loading-class.is-first{border-color:rgb(var(--led-rgb) / .35);color:var(--led)}
.train-loading-coach-value{display:flex;align-items:baseline;justify-content:space-between;gap:6px}
.train-loading-coach-value strong{font-family:'Martian Mono',monospace;font-size:13px;color:var(--text)}
.train-loading-coach-value small{font-size:9px;color:var(--text-dim)}
.train-loading-meter{display:block;height:5px;overflow:hidden;border-radius:999px;background:rgb(var(--rule-rgb) / .7)}
.train-loading-meter>i{display:block;height:100%;border-radius:inherit;background:var(--led)}
.train-loading-coach.crowd-quiet .train-loading-meter>i{background:var(--live)}
.train-loading-coach.crowd-busy .train-loading-meter>i{background:#FF8C42}
.train-loading-coach.crowd-very-busy .train-loading-meter>i{background:var(--warn)}
.train-loading-guidance{display:grid;gap:3px;margin:9px 0 0;padding:8px 9px;border:1px solid rgb(var(--live-rgb) / .25);border-radius:8px;background:rgb(var(--live-rgb) / .045);color:var(--text-dim);font-size:10.5px;line-height:1.45}
.train-loading-guidance strong{color:var(--live-soft);font-size:10.5px}
.train-loading-guidance small{color:var(--text-mute);font-size:9.5px;line-height:1.4}
.train-loading-class-note,.train-loading-note{margin:8px 0 0;font-size:10px;line-height:1.5;color:var(--text-dim)}
.train-loading-class-note{color:var(--text-mute)}
.train-connection-itinerary .train-live-loading{margin:0 0 8px 96px}
@media(max-width:520px){
  .train-loading-summary{grid-template-columns:1fr;align-items:start}
  .train-loading-summary>span{text-align:left}
  .train-loading-spread{grid-column:1}
  .train-loading-coaches{grid-template-columns:repeat(2,minmax(0,1fr))}
  .train-connection-itinerary .train-live-loading{margin-left:0}
}
@media(max-width:360px){.train-loading-coaches{grid-template-columns:1fr}}
'''
    css_path.write_text(css[:start] + replacement, encoding="utf-8")

    subprocess.run(["python3", ".github/scripts/sync-version.py"], check=True)
    print("Prepared Kerbside 0.8.8 release shell and cache/version updates.")


if __name__ == "__main__":
    main()
