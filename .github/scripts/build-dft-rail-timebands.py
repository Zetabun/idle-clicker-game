#!/usr/bin/env python3
"""Build Kerbside's measured rail time-band calibration from DfT ODS tables.

Usage:
  python3 .github/scripts/build-dft-rail-timebands.py rai0202.ods rai0203.ods kerbside-rail-timebands.js

Sources:
  RAI0202 - city-centre arrivals/departures by time band
  RAI0203 - Central London arrivals/departures by station and time band

The source tables are Accredited Official Statistics and are reused under the
Open Government Licence v3.0. The generated browser file keeps the exact DfT
bands: 03:00-06:59, hourly 07:00-22:59, and 23:00-02:59. It does not invent
hourly values inside the two four-hour edge bands.
"""
from __future__ import annotations

import json
import re
import sys
import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET

YEAR = "2025"
RELEASED = "2026-07-28"
SOURCE = "DfT RAI0202/RAI0203 rail crowding time bands, autumn 2025 (OGL v3)"
NS = {
    "table": "urn:oasis:names:tc:opendocument:xmlns:table:1.0",
    "text": "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
}
TABLE_NS = NS["table"]

# RAI0203 describes the first Zone-1 cordon station. Keep those exact CRS
# identities so Forecast v3 can prefer station data over the London aggregate.
LONDON_CRS = {
    "Elephant and Castle (for Blackfriars)": "EPH",
    "Euston": "EUS",
    "Fenchurch Street": "FST",
    "King's Cross": "KGX",
    "Liverpool Street": "LST",
    "London Bridge": "LBG",
    "Marylebone": "MYB",
    "Old Street (for Moorgate)": "OLD",
    "Paddington": "PAD",
    "St. Pancras International": "STP",
    "Vauxhall (for Waterloo)": "VXH",
    "Victoria": "VIC",
}

BAND_LABELS = [
    "03:00-06:59",
    "07:00-07:59", "08:00-08:59", "09:00-09:59", "10:00-10:59",
    "11:00-11:59", "12:00-12:59", "13:00-13:59", "14:00-14:59",
    "15:00-15:59", "16:00-16:59", "17:00-17:59", "18:00-18:59",
    "19:00-19:59", "20:00-20:59", "21:00-21:59", "22:00-22:59",
    "23:00-02:59",
]
BAND_HOURS = [4] + [1] * 16 + [4]


def cell_text(cell: ET.Element) -> str:
    values = []
    for p in cell.findall(".//text:p", NS):
        value = "".join(p.itertext()).strip()
        if value:
            values.append(value)
    return " ".join(values)


def sheet_rows(path: Path, sheet_name: str) -> list[list[str]]:
    with zipfile.ZipFile(path) as archive:
        root = ET.fromstring(archive.read("content.xml"))
    sheet = next(
        (
            item
            for item in root.findall(".//table:table", NS)
            if item.attrib.get(f"{{{TABLE_NS}}}name") == sheet_name
        ),
        None,
    )
    if sheet is None:
        raise SystemExit(f"{path}: sheet {sheet_name!r} not found")
    rows: list[list[str]] = []
    for row in sheet.findall("table:table-row", NS):
        values: list[str] = []
        for cell in row.findall("table:table-cell", NS):
            repeat = int(cell.attrib.get(f"{{{TABLE_NS}}}number-columns-repeated", "1"))
            # Real data rows are short. Cap pathological ODS blank-column repeats.
            values.extend([cell_text(cell)] * min(repeat, 30))
        while values and not values[-1]:
            values.pop()
        if values:
            rows.append(values)
    return rows


def number(value: str) -> int | None:
    raw = str(value or "").strip()
    if not raw or raw.startswith("["):
        return None
    match = re.search(r"\d[\d,]*", raw)
    return int(match.group(0).replace(",", "")) if match else None


def parse_table(path: Path, sheet_name: str, entity_kind: str) -> dict[str, dict]:
    rows = sheet_rows(path, sheet_name)
    try:
        header = next(row for row in rows if row and row[0] == "Year")
    except StopIteration as exc:
        raise SystemExit(f"{path}: data header not found") from exc
    if len(header) < 23 or header[4].lower().find("start of service") < 0:
        raise SystemExit(f"{path}: unexpected DfT time-band layout")

    records: dict[str, dict] = {}
    for row in rows:
        if len(row) < 23 or not str(row[0]).startswith(YEAR):
            continue
        direction = str(row[1]).strip().lower()
        entity = str(row[2]).strip()
        metric = str(row[3]).strip().lower()
        if direction not in {"arrivals", "departures"}:
            continue
        if metric not in {"passengers", "total seats"}:
            continue
        if entity_kind == "station":
            if entity == "London total":
                continue
            key = LONDON_CRS.get(entity)
            if not key:
                raise SystemExit(f"Unmapped 2025 RAI0203 station: {entity}")
        else:
            key = entity
        values = [number(value) for value in row[4:22]]
        total = number(row[22])
        if len(values) != 18:
            raise SystemExit(f"{path}: {entity} has {len(values)} time bands, expected 18")
        record = records.setdefault(key, {"name": entity})
        short_direction = "a" if direction == "arrivals" else "d"
        short_metric = "p" if metric == "passengers" else "s"
        record[f"{short_direction}{short_metric}"] = values
        record[f"{short_direction}{short_metric}t"] = total

    complete = {}
    for key, record in records.items():
        if not all(field in record for field in ("ap", "as", "dp", "ds")):
            raise SystemExit(f"{path}: incomplete 2025 record for {key}: {sorted(record)}")
        complete[key] = record
    return complete


def js_json(value) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True)


def build(city_ods: Path, london_ods: Path, output: Path) -> None:
    cities = parse_table(city_ods, "RAI0202", "city")
    stations = parse_table(london_ods, "RAI0203", "station")
    expected_cities = {
        "Birmingham", "Brighton", "Bristol", "Cambridge", "Cardiff", "Leeds",
        "Leicester", "Liverpool", "London", "Manchester", "Newcastle", "Nottingham",
        "Reading", "Sheffield",
    }
    if set(cities) != expected_cities:
        raise SystemExit(f"Unexpected RAI0202 2025 cities: {sorted(cities)}")
    if set(stations) != set(LONDON_CRS.values()):
        raise SystemExit(f"Unexpected RAI0203 2025 CRS set: {sorted(stations)}")

    text = f"""/* Generated from official DfT RAI0202/RAI0203 ODS tables.\n * Source year: {YEAR}; published 28 July 2026; Open Government Licence v3.0.\n * Rebuild with .github/scripts/build-dft-rail-timebands.py.\n */\n(function(){{\n'use strict';\nconst YEAR={int(YEAR)};\nconst RELEASED='{RELEASED}';\nconst SOURCE={js_json(SOURCE)};\nconst BAND_LABELS={js_json(BAND_LABELS)};\nconst BAND_HOURS={js_json(BAND_HOURS)};\nconst CITY={js_json(cities)};\nconst STATION={js_json(stations)};\nfunction bandIndex(minute){{\n  const value=Number(minute);if(!Number.isFinite(value))return -1;\n  const m=((Math.floor(value)%1440)+1440)%1440;\n  if(m>=1380||m<180)return 17;\n  if(m<420)return 0;\n  return 1+Math.floor((m-420)/60);\n}}\nfunction recordFor(station,city){{\n  const crs=String(station&&station.crs||station||'').toUpperCase();\n  if(crs&&STATION[crs])return {{scope:'station',key:crs,...STATION[crs]}};\n  const name=String(city||'').trim();\n  if(name&&CITY[name])return {{scope:'city',key:name,...CITY[name]}};\n  return null;\n}}\nwindow.__KERBSIDE_DFT_TIME_BANDS__={{year:YEAR,released:RELEASED,source:SOURCE,bandLabels:BAND_LABELS,bandHours:BAND_HOURS,city:CITY,station:STATION,bandIndex,recordFor}};\n}})();\n"""
    output.write_text(text, encoding="utf-8")
    print(
        json.dumps(
            {
                "year": int(YEAR),
                "cities": len(cities),
                "stations": len(stations),
                "bands": len(BAND_LABELS),
                "output": str(output),
            },
            indent=2,
        )
    )


def main() -> int:
    if len(sys.argv) != 4:
        print(__doc__.strip(), file=sys.stderr)
        return 2
    build(Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
