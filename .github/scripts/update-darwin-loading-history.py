#!/usr/bin/env python3
"""Maintain a privacy-safe rolling history of Darwin loading coverage summaries.

The input is the aggregate output from summarize-darwin-loading.py, never a raw
Darwin payload. The history stores only aggregate counts and operator coverage
so it can be committed to the repository without retaining service identity.
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

HISTORY_SCHEMA = 1
HISTORY_NAME = "darwin-passenger-loading-coverage-history"
DEFAULT_KEEP = 180

TOTAL_FIELDS = (
    "service_observations",
    "realtime_formation_loaded_observations",
    "realtime_coach_loaded_observations",
    "provider_service_loaded_observations",
    "realtime_formation_loading_coverage",
    "provider_service_loading_coverage",
    "decode_failures",
    "xml_parse_failures",
)
OPERATOR_FIELDS = (
    "service_observations",
    "realtime_formation_loaded_observations",
    "realtime_coach_loaded_observations",
    "provider_service_loaded_observations",
    "realtime_formation_loading_coverage",
    "provider_service_loading_coverage",
)


def parse_stamp(value: str | None) -> datetime:
    if value:
        text = str(value).strip()
        if text.endswith("Z"):
            text = text[:-1] + "+00:00"
        parsed = datetime.fromisoformat(text)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    return datetime.now(timezone.utc)


def iso_stamp(value: str | None = None) -> str:
    return parse_stamp(value).isoformat(timespec="seconds").replace("+00:00", "Z")


def empty_history() -> dict[str, Any]:
    return {
        "schema_version": HISTORY_SCHEMA,
        "history": HISTORY_NAME,
        "retention_snapshots": DEFAULT_KEEP,
        "snapshots": [],
    }


def load_history(path: Path) -> dict[str, Any]:
    if not path.exists():
        return empty_history()
    value = json.loads(path.read_text(encoding="utf-8"))
    if value.get("history") != HISTORY_NAME:
        raise ValueError(f"{path} is not a Darwin loading coverage history")
    if int(value.get("schema_version") or 0) != HISTORY_SCHEMA:
        raise ValueError(f"Unsupported Darwin loading history schema: {value.get('schema_version')}")
    if not isinstance(value.get("snapshots"), list):
        raise ValueError("Darwin loading history snapshots must be a list")
    return value


def load_summary(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if value.get("summary") != "darwin-passenger-loading-coverage":
        raise ValueError(f"{path} is not a Darwin loading coverage summary")
    return value


def pick(source: dict[str, Any], fields: tuple[str, ...]) -> dict[str, Any]:
    return {field: source.get(field) for field in fields}


def snapshot_from_summary(summary: dict[str, Any], generated_at: str | None = None) -> dict[str, Any]:
    stamp = iso_stamp(generated_at)
    operators = {
        str(name): pick(row, OPERATOR_FIELDS)
        for name, row in sorted((summary.get("operators") or {}).items())
        if isinstance(row, dict)
    }
    return {
        "date": stamp[:10],
        "generated_at": stamp,
        "window": {
            "runs": int(summary.get("runs") or 0),
            "sample_seconds": int(summary.get("sample_seconds") or 0),
            "first_started_at": summary.get("first_started_at"),
            "last_finished_at": summary.get("last_finished_at"),
        },
        "totals": pick(summary.get("totals") or {}, TOTAL_FIELDS),
        "operators": operators,
    }


def update(history: dict[str, Any], summary: dict[str, Any], generated_at: str | None = None, keep: int = DEFAULT_KEEP) -> dict[str, Any]:
    if keep < 1:
        raise ValueError("keep must be at least 1")
    snapshot = snapshot_from_summary(summary, generated_at)
    snapshots = [row for row in history.get("snapshots", []) if isinstance(row, dict) and row.get("date") != snapshot["date"]]
    snapshots.append(snapshot)
    snapshots.sort(key=lambda row: (str(row.get("date") or ""), str(row.get("generated_at") or "")))
    snapshots = snapshots[-keep:]
    return {
        "schema_version": HISTORY_SCHEMA,
        "history": HISTORY_NAME,
        "retention_snapshots": keep,
        "updated_at": snapshot["generated_at"],
        "snapshots": snapshots,
    }


def percent(value: Any) -> str:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return "—"
    return f"{number * 100:.1f}%"


def markdown(history: dict[str, Any]) -> str:
    snapshots = [row for row in history.get("snapshots", []) if isinstance(row, dict)]
    lines = [
        "# Darwin passenger-loading coverage history",
        "",
        "Privacy-safe daily snapshots built from the hourly GitHub Actions probe. No RIDs, train IDs, station IDs or per-service loading values are stored here.",
        "",
    ]
    if not snapshots:
        lines.extend(["No snapshots have been recorded yet.", ""])
        return "\n".join(lines)

    recent = snapshots[-30:]
    lines.extend([
        "## Overall coverage",
        "",
        "| Date | Probe runs | Services observed | Real-time formation | Provider service |",
        "|---|---:|---:|---:|---:|",
    ])
    for row in recent:
        totals = row.get("totals") or {}
        window = row.get("window") or {}
        lines.append(
            f"| {row.get('date','')} | {int(window.get('runs') or 0)} | {int(totals.get('service_observations') or 0)} | "
            f"{percent(totals.get('realtime_formation_loading_coverage'))} | {percent(totals.get('provider_service_loading_coverage'))} |"
        )

    trend_rows = snapshots[-14:]
    operator_names = sorted({name for row in trend_rows for name in (row.get("operators") or {})})
    lines.extend([
        "",
        "## Operator trend",
        "",
        "The final columns make drop-outs visible without retaining any individual service identity.",
        "",
        "| Operator | Latest observed | Latest RT coverage | Previous RT coverage | RT present in last 14 snapshots |",
        "|---|---:|---:|---:|---:|",
    ])
    for name in operator_names:
        series = [(row.get("operators") or {}).get(name) for row in trend_rows]
        series = [row for row in series if isinstance(row, dict)]
        if not series:
            continue
        latest = series[-1]
        previous = series[-2] if len(series) > 1 else {}
        days_with_rt = sum(1 for row in series if int(row.get("realtime_formation_loaded_observations") or 0) > 0)
        lines.append(
            f"| {name} | {int(latest.get('service_observations') or 0)} | {percent(latest.get('realtime_formation_loading_coverage'))} | "
            f"{percent(previous.get('realtime_formation_loading_coverage'))} | {days_with_rt}/{len(series)} |"
        )
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("summary", type=Path)
    parser.add_argument("--history", type=Path, required=True)
    parser.add_argument("--markdown", type=Path)
    parser.add_argument("--generated-at")
    parser.add_argument("--keep", type=int, default=DEFAULT_KEEP)
    args = parser.parse_args()

    history = load_history(args.history)
    summary = load_summary(args.summary)
    next_history = update(history, summary, args.generated_at, args.keep)
    args.history.parent.mkdir(parents=True, exist_ok=True)
    args.history.write_text(json.dumps(next_history, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    if args.markdown:
        args.markdown.parent.mkdir(parents=True, exist_ok=True)
        args.markdown.write_text(markdown(next_history), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
