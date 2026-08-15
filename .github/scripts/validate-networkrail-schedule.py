#!/usr/bin/env python3
"""Validate a generated Kerbside Network Rail SCHEDULE site before deployment."""
from __future__ import annotations

import argparse
import gzip
import json
from datetime import date, timedelta
from pathlib import Path
from typing import Any


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("site", type=Path)
    parser.add_argument("--expected-days", type=int, default=84)
    parser.add_argument("--max-asset-bytes", type=int, default=25 * 1024 * 1024)
    parser.add_argument("--max-files", type=int, default=20_000)
    return parser.parse_args()


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def load_gzip_json(path: Path) -> Any:
    with gzip.open(path, "rt", encoding="utf-8") as handle:
        return json.load(handle)


def assert_row(row: Any, stamp: str) -> None:
    if not isinstance(row, list) or len(row) != 6:
        raise AssertionError(f"{stamp}: malformed timetable row")
    calls = row[5]
    if not isinstance(calls, list) or len(calls) < 2:
        raise AssertionError(f"{stamp}: row has fewer than two advertised calls")
    for call in calls:
        if not isinstance(call, list) or len(call) != 5:
            raise AssertionError(f"{stamp}: malformed call")
        crs, public_arrival, public_departure, _platform, day_offset = call
        if not isinstance(crs, str) or len(crs) != 3:
            raise AssertionError(f"{stamp}: invalid CRS {crs!r}")
        if not (public_arrival or public_departure):
            raise AssertionError(f"{stamp}: non-advertised call leaked into output")
        if not isinstance(day_offset, int) or day_offset < 0:
            raise AssertionError(f"{stamp}: invalid day offset")


def direct_count(rows: list[Any], origin: str, destination: str) -> int:
    count = 0
    for row in rows:
        calls = row[5]
        origin_indexes = [i for i, call in enumerate(calls) if call[0] == origin and call[2]]
        destination_indexes = [i for i, call in enumerate(calls) if call[0] == destination and call[1]]
        if any(j > i for i in origin_indexes for j in destination_indexes):
            count += 1
    return count


def main() -> int:
    args = parse_args()
    site = args.site
    manifest_path = site / "manifest.json"
    locations_path = site / "locations.json"
    if not manifest_path.is_file() or not locations_path.is_file():
        raise SystemExit("Missing manifest.json or locations.json")

    manifest = load_json(manifest_path)
    dates = manifest.get("dates") or []
    if len(dates) != args.expected_days:
        raise SystemExit(f"Expected {args.expected_days} dates, found {len(dates)}")
    parsed_dates = [date.fromisoformat(stamp) for stamp in dates]
    for previous, current in zip(parsed_dates, parsed_dates[1:]):
        if current != previous + timedelta(days=1):
            raise SystemExit(f"Non-contiguous timetable dates: {previous} -> {current}")

    if manifest.get("source", "").find("Network Rail Open Data SCHEDULE") < 0:
        raise SystemExit("Manifest source is not Network Rail Open Data SCHEDULE")
    if int(manifest.get("windowDays") or 0) != args.expected_days:
        raise SystemExit("Manifest windowDays does not match expected window")

    locations = load_json(locations_path)
    for required_crs in ("BHM", "LOB", "BRI", "MAN", "LDS"):
        if required_crs not in locations:
            raise SystemExit(f"Reference data is missing {required_crs}")

    files = [path for path in site.rglob("*") if path.is_file()]
    if len(files) > args.max_files:
        raise SystemExit(f"File limit exceeded: {len(files)}")
    oversized = [path for path in files if path.stat().st_size >= args.max_asset_bytes]
    if oversized:
        raise SystemExit("Asset size limit exceeded: " + ", ".join(str(p) for p in oversized[:5]))

    total_rows = 0
    min_rows = None
    max_rows = 0
    sampled = {}
    probe_plan = {
        3: ("BHM", "LOB"),
        7: ("BHM", "BRI"),
        28: ("BHM", "MAN"),
        70: ("BHM", "LDS"),
    }
    for index, stamp in enumerate(dates):
        path = site / f"{stamp}.json.gz"
        if not path.is_file():
            raise SystemExit(f"Missing date file {path.name}")
        rows = load_gzip_json(path)
        if not isinstance(rows, list):
            raise SystemExit(f"{stamp}: date file is not a JSON array")
        for row in rows:
            assert_row(row, stamp)
        if not rows:
            raise SystemExit(f"{stamp}: no passenger service rows")
        total_rows += len(rows)
        min_rows = len(rows) if min_rows is None else min(min_rows, len(rows))
        max_rows = max(max_rows, len(rows))
        if index in probe_plan:
            origin, destination = probe_plan[index]
            sampled[f"+{index}d {origin}->{destination}"] = direct_count(rows, origin, destination)

    build_stats = manifest.get("buildStats") or {}
    for key in ("ambiguous_same_stp", "multiple_n_same_uid_date", "n_coexists_with_base_uid"):
        if int(build_stats.get(key) or 0):
            raise SystemExit(f"Unresolved STP diagnostic {key}={build_stats[key]}")

    # Route probes are deliberately informational rather than hard failures: a
    # legitimate engineering blockade can remove every direct train on a date.
    summary = {
        "timetableId": manifest.get("timetableId"),
        "dates": [dates[0], dates[-1]],
        "dateFiles": len(dates),
        "locations": len(locations),
        "rows": total_rows,
        "dailyRows": {"min": min_rows, "max": max_rows},
        "routeProbes": sampled,
        "files": len(files),
        "totalMiB": round(sum(path.stat().st_size for path in files) / 1024 / 1024, 2),
        "largestAssetMiB": round(max(path.stat().st_size for path in files) / 1024 / 1024, 2),
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
