#!/usr/bin/env python3
"""Build compact Kerbside browser data from Darwin PPTimetable XML gzip files.

Usage:
  python3 .github/scripts/build-darwin-timetable.py \
    20260811020500_v8.xml.gz \
    20260811020500_ref_v4.xml.gz \
    kerbside-rail-timetable
"""
from __future__ import annotations

import gzip
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import date, timedelta
from pathlib import Path
import xml.etree.ElementTree as ET

TIME_RE = re.compile(r"^(\d{1,2}):(\d{2})(?::(\d{2}))?$")
BUS_OR_FERRY_STATUS = {"B", "5", "S"}


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def minutes(value: str) -> int | None:
    match = TIME_RE.match(value or "")
    if not match:
        return None
    return int(match.group(1)) * 60 + int(match.group(2)) + (
        1 if match.group(3) and int(match.group(3)) >= 30 else 0
    )


def hhmm(value: str) -> str:
    match = TIME_RE.match(value or "")
    return f"{int(match.group(1)):02d}:{int(match.group(2)):02d}" if match else ""


def day_stamp(service_start: str, offset: int) -> str:
    return (date.fromisoformat(service_start) + timedelta(days=offset)).isoformat()


def clock(value: int) -> str:
    return "" if value < 0 or value >= 1440 else f"{value // 60:02d}:{value % 60:02d}"


def root_timetable_id(path: Path) -> str:
    with gzip.open(path, "rb") as handle:
        for _, element in ET.iterparse(handle, events=("start",)):
            return (
                element.attrib.get("timetableID")
                or element.attrib.get("timetableId")
                or ""
            ).strip()
    return ""


def load_reference(path: Path):
    locations = {}
    toc_names = {}
    reference_id = ""
    with gzip.open(path, "rb") as handle:
        for event, element in ET.iterparse(handle, events=("start", "end")):
            tag = local_name(element.tag)
            if event == "start" and not reference_id:
                reference_id = (
                    element.attrib.get("timetableID")
                    or element.attrib.get("timetableId")
                    or ""
                ).strip()
                continue
            if event != "end":
                continue
            attrs = element.attrib
            if tag == "LocationRef":
                tpl = (attrs.get("tpl") or "").strip()
                if tpl:
                    locations[tpl] = (
                        (attrs.get("crs") or "").strip().upper(),
                        (attrs.get("locname") or "").strip(),
                        (attrs.get("toc") or "").strip().upper(),
                    )
            elif tag == "TocRef":
                code = (attrs.get("toc") or "").strip().upper()
                if code:
                    toc_names[code] = (attrs.get("tocname") or "").strip() or code
            element.clear()
    return reference_id, locations, toc_names


def build(timetable: Path, reference: Path, output: Path) -> None:
    timetable_id = root_timetable_id(timetable)
    reference_id, locations, toc_names = load_reference(reference)
    if not timetable_id:
        raise SystemExit(f"Could not read Darwin timetable ID from {timetable.name}")
    if reference_id and reference_id != timetable_id:
        raise SystemExit(
            f"Darwin timetable/reference mismatch: {timetable_id} != {reference_id}"
        )

    by_date = defaultdict(list)
    counts = Counter()
    coverage = defaultdict(lambda: {"min": 1440, "max": -1})
    journey_count = 0

    with gzip.open(timetable, "rb") as handle:
        for _, element in ET.iterparse(handle, events=("end",)):
            if local_name(element.tag) != "Journey":
                continue
            attrs = element.attrib
            if (
                attrs.get("isPassengerSvc") == "false"
                or attrs.get("status") in BUS_OR_FERRY_STATUS
            ):
                element.clear()
                continue
            service_start = attrs.get("ssd") or ""
            if not service_start:
                element.clear()
                continue

            calls = []
            day_offset = 0
            previous = None
            for child in element:
                if local_name(child.tag) not in {"OR", "IP", "DT"}:
                    continue
                call = child.attrib
                crs, _name, _toc = locations.get(
                    call.get("tpl") or "", ("", "", "")
                )
                if not crs:
                    continue
                departure = hhmm(call.get("ptd") or call.get("wtd") or "")
                arrival = hhmm(call.get("pta") or call.get("wta") or "")
                current = minutes(departure or arrival)
                if current is None:
                    continue
                if previous is not None and current + 720 < previous:
                    day_offset += 1
                previous = current
                calls.append(
                    [crs, arrival, departure, call.get("plat") or "", day_offset]
                )

            merged = []
            for call in calls:
                if merged and merged[-1][0] == call[0]:
                    if call[1]:
                        merged[-1][1] = call[1]
                    if call[2]:
                        merged[-1][2] = call[2]
                    if call[3]:
                        merged[-1][3] = call[3]
                    merged[-1][4] = max(merged[-1][4], call[4])
                else:
                    merged.append(call)
            calls = merged
            if len(calls) < 2:
                element.clear()
                continue

            journey_count += 1
            row = [
                attrs.get("rid") or "",
                attrs.get("uid") or "",
                attrs.get("trainId") or "",
                (attrs.get("toc") or "").upper(),
                service_start,
                calls,
            ]
            departure_days = sorted(
                {call[4] for call in calls[:-1] if call[2] or call[1]}
            )
            for offset in departure_days:
                stamp = day_stamp(service_start, offset)
                by_date[stamp].append(row)
                counts[stamp] += 1

            for call in calls[:-1]:
                value = call[2] or call[1]
                minute = minutes(value)
                if minute is None:
                    continue
                stamp = day_stamp(service_start, call[4])
                coverage[stamp]["min"] = min(coverage[stamp]["min"], minute)
                coverage[stamp]["max"] = max(coverage[stamp]["max"], minute)
            element.clear()

    snapshot_date = (
        f"{timetable_id[:4]}-{timetable_id[4:6]}-{timetable_id[6:8]}"
    )
    valid_dates = sorted(stamp for stamp in by_date if stamp >= snapshot_date)
    if not valid_dates:
        raise SystemExit(
            f"No passenger timetable dates found on or after {snapshot_date}"
        )

    output.mkdir(parents=True, exist_ok=True)
    for stamp in valid_dates:
        rows = by_date[stamp]
        raw = json.dumps(
            rows, separators=(",", ":"), ensure_ascii=False
        ).encode("utf-8")
        with open(output / f"{stamp}.json.gz", "wb") as raw_target:
            with gzip.GzipFile(
                filename="",
                mode="wb",
                compresslevel=9,
                fileobj=raw_target,
                mtime=0,
            ) as target:
                target.write(raw)

    crs_locations = {}
    for tpl, (crs, name, toc) in locations.items():
        if crs and crs not in crs_locations:
            crs_locations[crs] = [name or crs, tpl, toc]
    (output / "locations.json").write_text(
        json.dumps(
            crs_locations,
            separators=(",", ":"),
            ensure_ascii=False,
            sort_keys=True,
        ),
        encoding="utf-8",
    )

    manifest = {
        "schema": 1,
        "source": "National Rail Darwin Timetable Files",
        "timetableId": timetable_id,
        "dates": valid_dates,
        "journeyCounts": {stamp: counts[stamp] for stamp in valid_dates},
        "coverage": {
            stamp: {
                "from": clock(coverage[stamp]["min"]),
                "to": clock(coverage[stamp]["max"]),
                "partial": coverage[stamp]["min"] > 15
                or coverage[stamp]["max"] < 1425,
            }
            for stamp in valid_dates
        },
        "tocNames": toc_names,
        "journeys": journey_count,
    }
    (output / "manifest.json").write_text(
        json.dumps(
            manifest,
            separators=(",", ":"),
            ensure_ascii=False,
            sort_keys=True,
        ),
        encoding="utf-8",
    )
    print(json.dumps(manifest, indent=2))


def main() -> int:
    if len(sys.argv) != 4:
        print(__doc__.strip(), file=sys.stderr)
        return 2
    build(Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
