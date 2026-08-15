#!/usr/bin/env python3
"""Build compact Kerbside timetable files from Network Rail SCHEDULE JSON.

The input is the gzip-compressed all-TOC full JSON extract (CIF_ALL_FULL_DAILY).
The builder streams the multi-GB decompressed source, keeps schedule metadata in a
small temporary SQLite database, resolves STP overlays/cancellations per service
date, and writes deterministic per-date gzip JSON files compatible with
Kerbside's existing timetable row shape:

    [rid, uid, train_id, atoc, service_start_date, calls]

where each call is:

    [crs, public_arrival, public_departure, platform, day_offset]

Only advertised station calls (public arrival/departure times plus a CRS code)
are exposed to the journey planner. Operational timing/pass points are used only
to calculate midnight offsets and are never surfaced as boardable calls.
"""
from __future__ import annotations

import argparse
import gzip
import json
import os
import sqlite3

try:
    import orjson
except ImportError:  # pragma: no cover - production Actions can still use stdlib JSON
    orjson = None
import tempfile
from collections import Counter, defaultdict, deque
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable

PASSENGER_STATUSES = {"P", "1"}
STP_BASE_TYPES = {"P", "O", "C"}
STP_TYPES = STP_BASE_TYPES | {"N"}
SCHEMA = 1


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="Network Rail toc-full.gz")
    parser.add_argument("output", type=Path, help="Output directory")
    parser.add_argument(
        "--start-date",
        type=date.fromisoformat,
        default=None,
        help="First published date (YYYY-MM-DD). Defaults to snapshot UTC date.",
    )
    parser.add_argument(
        "--days", type=int, default=84, help="Number of published dates (default: 84)"
    )
    parser.add_argument(
        "--toc-names-manifest",
        type=Path,
        default=None,
        help="Optional existing Kerbside manifest whose tocNames map is reused.",
    )
    parser.add_argument(
        "--keep-temp-db",
        action="store_true",
        help="Keep the temporary SQLite database beside the output for diagnostics.",
    )
    return parser.parse_args()


def json_loads(value: str | bytes) -> Any:
    return orjson.loads(value) if orjson is not None else json.loads(value)


def compact_json(value: Any) -> str:
    if orjson is not None:
        return orjson.dumps(value).decode("utf-8")
    return json.dumps(value, separators=(",", ":"), ensure_ascii=False)


def time_parts(value: str | None) -> tuple[int, bool] | None:
    """Return minute-of-day and whether the CIF time is on the half-minute."""
    raw = str(value or "").strip().upper()
    if not raw:
        return None
    half = raw.endswith("H")
    if half:
        raw = raw[:-1]
    if len(raw) != 4 or not raw.isdigit():
        return None
    hour, minute = int(raw[:2]), int(raw[2:])
    if hour > 23 or minute > 59:
        return None
    return hour * 60 + minute, half


def hhmm(value: str | None) -> str:
    parsed = time_parts(value)
    if parsed is None:
        return ""
    minute, _half = parsed
    return f"{minute // 60:02d}:{minute % 60:02d}"


def clock(minute: int) -> str:
    return "" if minute < 0 or minute >= 1440 else f"{minute // 60:02d}:{minute % 60:02d}"


def snapshot_id(timestamp: int | float | None) -> str:
    if not timestamp:
        return ""
    return datetime.fromtimestamp(float(timestamp), timezone.utc).strftime("%Y%m%d%H%M%S")


def runs_on(schedule: sqlite3.Row, run_date: date) -> bool:
    bits = schedule["days"] or ""
    return len(bits) >= 7 and bits[run_date.weekday()] == "1"


def load_toc_names(path: Path | None) -> dict[str, str]:
    if not path:
        return {}
    data = json_loads(path.read_bytes())
    raw = data.get("tocNames") if isinstance(data, dict) else None
    return {str(k): str(v) for k, v in (raw or {}).items()}


def setup_db(path: Path) -> sqlite3.Connection:
    db = sqlite3.connect(path)
    db.row_factory = sqlite3.Row
    db.executescript(
        """
        PRAGMA journal_mode=MEMORY;
        PRAGMA synchronous=OFF;
        PRAGMA locking_mode=EXCLUSIVE;
        PRAGMA temp_store=MEMORY;
        CREATE TABLE schedules (
            id INTEGER PRIMARY KEY,
            uid TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            days TEXT NOT NULL,
            stp TEXT NOT NULL,
            status TEXT,
            atoc TEXT,
            train_id TEXT,
            calls_json TEXT,
            max_call_offset INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX schedules_dates ON schedules(start_date, end_date);
        CREATE INDEX schedules_uid ON schedules(uid);
        """
    )
    return db


def merge_public_calls(calls: list[list[Any]]) -> list[list[Any]]:
    merged: list[list[Any]] = []
    for call in calls:
        if merged and merged[-1][0] == call[0]:
            # Preserve public arrival/departure independently so pickup/set-down
            # restrictions are not erased by the import stage.
            if call[1]:
                merged[-1][1] = call[1]
            if call[2]:
                merged[-1][2] = call[2]
            if call[3]:
                merged[-1][3] = call[3]
            merged[-1][4] = max(int(merged[-1][4]), int(call[4]))
        else:
            merged.append(call)
    return merged


def public_calls_for_schedule(
    schedule: dict[str, Any], tiploc_to_crs: dict[str, str]
) -> tuple[list[list[Any]], int, int]:
    """Return advertised calls, max day offset, and public timed unknown TIPLOCs."""
    segment = schedule.get("schedule_segment") or {}
    raw_locations = segment.get("schedule_location") or []
    calls: list[list[Any]] = []
    day_offset = 0
    previous_clock: int | None = None
    unknown_public = 0

    for location in raw_locations:
        # Use working/pass time for chronology. Public times alone are not
        # enough because a train can originate non-publicly before midnight.
        timing_value = (
            location.get("departure")
            or location.get("arrival")
            or location.get("pass")
            or location.get("public_departure")
            or location.get("public_arrival")
        )
        parsed = time_parts(timing_value)
        if parsed is not None:
            current_clock = parsed[0]
            if previous_clock is not None and current_clock + 720 < previous_clock:
                day_offset += 1
            previous_clock = current_clock

        public_arrival = hhmm(location.get("public_arrival"))
        public_departure = hhmm(location.get("public_departure"))
        if not (public_arrival or public_departure):
            continue

        tiploc = str(location.get("tiploc_code") or "").strip().upper()
        crs = tiploc_to_crs.get(tiploc, "")
        if not crs:
            unknown_public += 1
            continue
        calls.append(
            [
                crs,
                public_arrival,
                public_departure,
                str(location.get("platform") or ""),
                day_offset,
            ]
        )

    calls = merge_public_calls(calls)
    return calls, max((int(c[4]) for c in calls), default=0), unknown_public


def ingest(
    source: Path,
    db: sqlite3.Connection,
    overlap_start: date,
    overlap_end: date,
) -> tuple[dict[str, list[str]], dict[str, Any], Counter]:
    tiploc_to_crs: dict[str, str] = {}
    crs_locations: dict[str, list[str]] = {}
    header: dict[str, Any] = {}
    stats: Counter = Counter()
    seen_schedule = False
    insert_sql = """
        INSERT INTO schedules
            (uid,start_date,end_date,days,stp,status,atoc,train_id,calls_json,max_call_offset)
        VALUES (?,?,?,?,?,?,?,?,?,?)
    """
    pending: list[tuple[Any, ...]] = []

    def flush_pending() -> None:
        if not pending:
            return
        db.executemany(insert_sql, pending)
        pending.clear()

    with gzip.open(source, "rb") as handle:
        for line_number, line in enumerate(handle, 1):
            # Associations account for a large chunk of the file and are not
            # required by Kerbside's current point-to-point/one-change planner.
            # Skip them before JSON decoding to keep the daily job fast.
            if line.startswith(b'{"JsonAssociationV1"'):
                stats["associations_skipped"] += 1
                continue

            record = json_loads(line)
            if "JsonTimetableV1" in record:
                header = record["JsonTimetableV1"] or {}
                stats["headers"] += 1
                continue

            if "TiplocV1" in record:
                if seen_schedule:
                    stats["tiplocs_after_schedules"] += 1
                item = record["TiplocV1"] or {}
                tiploc = str(item.get("tiploc_code") or "").strip().upper()
                crs = str(item.get("crs_code") or "").strip().upper()
                if tiploc and crs:
                    name = (
                        str(item.get("tps_description") or "").strip()
                        or str(item.get("description") or "").strip()
                        or crs
                    )
                    tiploc_to_crs[tiploc] = crs
                    crs_locations.setdefault(crs, [name, tiploc, ""])
                stats["tiplocs"] += 1
                continue

            schedule = record.get("JsonScheduleV1")
            if schedule is None:
                stats["other_records"] += 1
                continue

            seen_schedule = True
            stats["schedule_records"] += 1
            if str(schedule.get("transaction_type") or "").lower() != "create":
                stats["non_create_skipped"] += 1
                continue
            try:
                start = date.fromisoformat(str(schedule.get("schedule_start_date") or ""))
                end = date.fromisoformat(str(schedule.get("schedule_end_date") or ""))
            except ValueError:
                stats["bad_schedule_dates"] += 1
                continue
            if end < overlap_start or start > overlap_end:
                stats["outside_window"] += 1
                continue

            stp = str(schedule.get("CIF_stp_indicator") or "").strip().upper()
            if stp not in STP_TYPES:
                stats["unknown_stp"] += 1
                continue
            uid = str(schedule.get("CIF_train_uid") or "").strip().upper()
            days = str(schedule.get("schedule_days_runs") or "")
            if not uid or len(days) < 7:
                stats["invalid_schedule_key"] += 1
                continue

            status = str(schedule.get("train_status") or "").strip().upper()
            segment = schedule.get("schedule_segment") or {}
            calls: list[list[Any]] = []
            max_offset = 0
            if stp != "C" and status in PASSENGER_STATUSES:
                calls, max_offset, unknown_public = public_calls_for_schedule(
                    schedule, tiploc_to_crs
                )
                stats["public_timed_unknown_tiploc"] += unknown_public
                if len(calls) >= 2:
                    stats["public_candidate_schedules"] += 1
                else:
                    calls = []
                    max_offset = 0
                    stats["passenger_without_two_public_calls"] += 1

            pending.append(
                (
                    uid,
                    start.isoformat(),
                    end.isoformat(),
                    days[:7],
                    stp,
                    status,
                    str(schedule.get("atoc_code") or "").strip().upper(),
                    str(segment.get("signalling_id") or "").strip(),
                    compact_json(calls) if calls else "",
                    max_offset,
                )
            )
            stats["stored_schedules"] += 1
            stats[f"stored_stp_{stp}"] += 1
            stats[f"stored_status_{status or '?'}"] += 1
            if max_offset > stats["max_public_call_offset"]:
                stats["max_public_call_offset"] = max_offset

            if len(pending) >= 5000:
                flush_pending()
            if stats["stored_schedules"] % 50000 == 0:
                flush_pending()
                db.commit()

    flush_pending()
    db.commit()
    return crs_locations, header, stats


def applicable_rows(db: sqlite3.Connection, run_date: date) -> Iterable[sqlite3.Row]:
    bit = run_date.weekday() + 1
    stamp = run_date.isoformat()
    return db.execute(
        f"""
        SELECT * FROM schedules
        WHERE start_date <= ? AND end_date >= ?
          AND substr(days, {bit}, 1) = '1'
        ORDER BY uid, stp, start_date DESC, id
        """,
        (stamp, stamp),
    )


def select_schedule_group(rows: list[sqlite3.Row], stats: Counter) -> list[sqlite3.Row]:
    """Resolve P/O/C for one UID; keep N schedules as standalone STP services."""
    base = [row for row in rows if row["stp"] in STP_BASE_TYPES]
    new = [row for row in rows if row["stp"] == "N"]
    selected: list[sqlite3.Row] = []

    if base:
        winning_stp = min(row["stp"] for row in base)
        winners = [row for row in base if row["stp"] == winning_stp]
        if len(winners) > 1:
            stats["ambiguous_same_stp"] += 1
        # Full snapshots should not normally have ambiguous overlapping versions.
        # Latest validity start is the safest deterministic tie-breaker.
        winners.sort(key=lambda row: (row["start_date"], row["id"]), reverse=True)
        selected.append(winners[0])
        if winning_stp == "C":
            stats["planned_cancellations_applied"] += 1
        elif winning_stp == "O":
            stats["overlays_applied"] += 1

    if new:
        if len(new) > 1:
            stats["multiple_n_same_uid_date"] += 1
        if base:
            stats["n_coexists_with_base_uid"] += 1
        # N schedules are standalone STP schedules and are not overlays.
        selected.extend(new)
    return selected


def resolve_origin_date(
    db: sqlite3.Connection, run_date: date, stats: Counter
) -> list[tuple[list[Any], set[int]]]:
    services: list[tuple[list[Any], set[int]]] = []
    current_uid = None
    group: list[sqlite3.Row] = []

    def flush(rows: list[sqlite3.Row]) -> None:
        if not rows:
            return
        for selected in select_schedule_group(rows, stats):
            if selected["stp"] == "C":
                continue
            if selected["status"] not in PASSENGER_STATUSES or not selected["calls_json"]:
                stats["resolved_non_public"] += 1
                continue
            calls = json_loads(selected["calls_json"])
            if len(calls) < 2:
                continue
            rid = (
                f"NR:{selected['uid']}:{selected['stp']}:"
                f"{selected['start_date']}:{run_date.isoformat()}"
            )
            row = [
                rid,
                selected["uid"],
                selected["train_id"] or "",
                selected["atoc"] or "",
                run_date.isoformat(),
                calls,
            ]
            # Mirror the Darwin builder: a row belongs to each calendar date on
            # which it has a usable non-final passenger call.
            departure_offsets = {
                int(call[4]) for call in calls[:-1] if call[2] or call[1]
            }
            if departure_offsets:
                services.append((row, departure_offsets))
                stats["resolved_public_service_instances"] += 1

    for row in applicable_rows(db, run_date):
        uid = row["uid"]
        if current_uid is None:
            current_uid = uid
        if uid != current_uid:
            flush(group)
            group = []
            current_uid = uid
        group.append(row)
    flush(group)
    return services


def minute_on_output_date(row: list[Any], call: list[Any], output_date: date) -> int | None:
    value = call[2] or call[1]
    parsed = time_parts(str(value).replace(":", ""))
    if parsed is None:
        return None
    service_start = date.fromisoformat(row[4])
    actual = service_start + timedelta(days=int(call[4] or 0))
    if actual != output_date:
        return None
    return parsed[0]


def write_gzip_json(path: Path, value: Any) -> tuple[int, int]:
    raw = compact_json(value).encode("utf-8")
    with path.open("wb") as raw_target:
        with gzip.GzipFile(
            filename="",
            mode="wb",
            compresslevel=7,
            fileobj=raw_target,
            mtime=0,
        ) as target:
            target.write(raw)
    return len(raw), path.stat().st_size


def build(source: Path, output: Path, start: date | None, days: int, toc_manifest: Path | None, keep_db: bool) -> dict[str, Any]:
    if days < 1 or days > 366:
        raise SystemExit("--days must be between 1 and 366")
    if not source.is_file():
        raise SystemExit(f"Input not found: {source}")

    # Read just the header to establish the default snapshot date.
    with gzip.open(source, "rb") as handle:
        first = json_loads(handle.readline())
    header = first.get("JsonTimetableV1") or {}
    snapshot_timestamp = header.get("timestamp")
    snapshot_date = (
        datetime.fromtimestamp(float(snapshot_timestamp), timezone.utc).date()
        if snapshot_timestamp
        else date.today()
    )
    window_start = start or snapshot_date
    window_end = window_start + timedelta(days=days - 1)

    # Include origin dates just before the publication window for overnight
    # services. Two days is intentionally conservative; the ingest pass records
    # the real maximum and the build fails if the dataset exceeds this bound.
    origin_padding_days = 2
    overlap_start = window_start - timedelta(days=origin_padding_days)
    overlap_end = window_end

    output_parent = output.parent.resolve()
    output_parent.mkdir(parents=True, exist_ok=True)
    temp_db_path = output_parent / f".{output.name}.networkrail.tmp.sqlite"
    if temp_db_path.exists():
        temp_db_path.unlink()
    db = setup_db(temp_db_path)

    try:
        locations, parsed_header, stats = ingest(
            source, db, overlap_start=overlap_start, overlap_end=overlap_end
        )
        if parsed_header:
            header = parsed_header
        max_offset = int(stats["max_public_call_offset"] or 0)
        if max_offset > origin_padding_days:
            raise SystemExit(
                f"Passenger schedule crosses {max_offset} calendar days; "
                f"increase origin_padding_days before publishing."
            )

        temp_output = Path(
            tempfile.mkdtemp(prefix=f".{output.name}.build-", dir=str(output_parent))
        )
        toc_names = load_toc_names(toc_manifest)
        dates: list[str] = []
        journey_counts: dict[str, int] = {}
        coverage: dict[str, dict[str, Any]] = {}
        sizes: dict[str, dict[str, int]] = {}

        # Seed origin-date cache for services that began before the first output day.
        cache: deque[tuple[date, list[tuple[list[Any], set[int]]]]] = deque()
        for offset in range(max_offset, 0, -1):
            origin = window_start - timedelta(days=offset)
            cache.append((origin, resolve_origin_date(db, origin, stats)))

        for day_index in range(days):
            output_date = window_start + timedelta(days=day_index)
            current = resolve_origin_date(db, output_date, stats)
            cache.append((output_date, current))

            rows: list[list[Any]] = []
            min_minute, max_minute = 1440, -1
            for origin_date, services in cache:
                offset = (output_date - origin_date).days
                if offset < 0 or offset > max_offset:
                    continue
                for row, departure_offsets in services:
                    if offset not in departure_offsets:
                        continue
                    rows.append(row)
                    for call in row[5][:-1]:
                        minute = minute_on_output_date(row, call, output_date)
                        if minute is None:
                            continue
                        min_minute = min(min_minute, minute)
                        max_minute = max(max_minute, minute)

            # Deterministic ordering by first usable time on the output date, then UID/RID.
            def row_key(row: list[Any]) -> tuple[int, str, str]:
                values = [
                    minute_on_output_date(row, call, output_date)
                    for call in row[5][:-1]
                ]
                usable = [v for v in values if v is not None]
                return (min(usable) if usable else 9999, str(row[1]), str(row[0]))

            rows.sort(key=row_key)
            stamp = output_date.isoformat()
            raw_size, gzip_size = write_gzip_json(temp_output / f"{stamp}.json.gz", rows)
            dates.append(stamp)
            journey_counts[stamp] = len(rows)
            sizes[stamp] = {"jsonBytes": raw_size, "gzipBytes": gzip_size}
            coverage[stamp] = {
                "from": clock(min_minute),
                "to": clock(max_minute),
                "partial": min_minute > 15 or max_minute < 1425,
            }

            while cache and (output_date - cache[0][0]).days >= max_offset:
                cache.popleft()

        (temp_output / "locations.json").write_text(
            compact_json(dict(sorted(locations.items()))), encoding="utf-8"
        )

        timetable_id = snapshot_id(header.get("timestamp"))
        manifest = {
            "schema": SCHEMA,
            "source": "Network Rail Open Data SCHEDULE (CIF_ALL_FULL_DAILY JSON)",
            "timetableId": timetable_id,
            "networkRailSequence": (header.get("Metadata") or {}).get("sequence"),
            "snapshotTimestamp": header.get("timestamp"),
            "windowDays": days,
            "dates": dates,
            "journeyCounts": journey_counts,
            "coverage": coverage,
            "tocNames": toc_names,
            "journeys": sum(journey_counts.values()),
            "buildStats": dict(stats),
            "sizes": sizes,
        }
        (temp_output / "manifest.json").write_text(
            compact_json(manifest), encoding="utf-8"
        )

        # Atomic-ish directory replacement: keep production untouched until every
        # date has been written successfully.
        backup = output_parent / f".{output.name}.previous"
        if backup.exists():
            if backup.is_dir():
                for child in backup.iterdir():
                    if child.is_file():
                        child.unlink()
                backup.rmdir()
            else:
                backup.unlink()
        if output.exists():
            output.rename(backup)
        temp_output.rename(output)
        if backup.exists():
            for child in backup.iterdir():
                if child.is_file():
                    child.unlink()
            backup.rmdir()

        if keep_db:
            kept = output_parent / f"{output.name}.networkrail.sqlite"
            db.close()
            db = None
            if kept.exists():
                kept.unlink()
            temp_db_path.rename(kept)
        return manifest
    finally:
        if db is not None:
            db.close()
        if temp_db_path.exists() and not keep_db:
            temp_db_path.unlink()


def main() -> int:
    args = parse_args()
    manifest = build(
        source=args.input,
        output=args.output,
        start=args.start_date,
        days=args.days,
        toc_manifest=args.toc_names_manifest,
        keep_db=args.keep_temp_db,
    )
    summary = {
        "source": manifest["source"],
        "timetableId": manifest["timetableId"],
        "dates": [manifest["dates"][0], manifest["dates"][-1]],
        "windowDays": manifest["windowDays"],
        "journeys": manifest["journeys"],
        "buildStats": manifest["buildStats"],
        "totalGzipBytes": sum(v["gzipBytes"] for v in manifest["sizes"].values()),
        "largestDailyGzipBytes": max(v["gzipBytes"] for v in manifest["sizes"].values()),
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
