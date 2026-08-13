#!/usr/bin/env python3
"""Combine privacy-safe Darwin loading probe artifacts across many runs."""
from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path
from typing import Any


def add(a: int | float | None, b: int | float | None) -> int | float:
    return (a or 0) + (b or 0)


def load_reports(paths: list[Path]) -> list[dict[str, Any]]:
    reports: list[dict[str, Any]] = []
    for path in paths:
        value = json.loads(path.read_text(encoding="utf-8"))
        if value.get("probe") != "darwin-passenger-loading-coverage":
            raise ValueError(f"{path} is not a Darwin loading probe report")
        reports.append(value)
    if not reports:
        raise ValueError("No reports supplied")
    return reports


def combine(reports: list[dict[str, Any]]) -> dict[str, Any]:
    operators: dict[str, dict[str, int]] = defaultdict(lambda: {
        "service_observations": 0,
        "loaded_service_observations": 0,
        "coach_loaded_service_observations": 0,
        "loading_records": 0,
        "coach_loading_records": 0,
    })
    totals = {
        "kafka_messages": 0,
        "xml_documents": 0,
        "decode_failures": 0,
        "xml_parse_failures": 0,
        "service_observations": 0,
        "loaded_service_observations": 0,
        "coach_loaded_service_observations": 0,
        "loading_records": 0,
        "coach_loading_records": 0,
    }
    for report in reports:
        messages = report.get("messages", {})
        loading = report.get("loading", {})
        totals["kafka_messages"] += int(messages.get("kafka_messages") or 0)
        totals["xml_documents"] += int(messages.get("xml_documents") or 0)
        totals["decode_failures"] += int(messages.get("decode_failures") or 0)
        totals["xml_parse_failures"] += int(messages.get("xml_parse_failures") or 0)
        totals["service_observations"] += int(loading.get("services_observed") or 0)
        totals["loaded_service_observations"] += int(loading.get("services_with_loading") or 0)
        totals["coach_loaded_service_observations"] += int(loading.get("services_with_coach_loading") or 0)
        totals["loading_records"] += int(loading.get("loading_records") or 0)
        totals["coach_loading_records"] += int(loading.get("coach_loading_records") or 0)
        for operator, row in (loading.get("operators") or {}).items():
            dest = operators[str(operator)]
            dest["service_observations"] += int(row.get("services_observed") or 0)
            dest["loaded_service_observations"] += int(row.get("services_with_loading") or 0)
            dest["coach_loaded_service_observations"] += int(row.get("services_with_coach_loading") or 0)
            dest["loading_records"] += int(row.get("loading_records") or 0)
            dest["coach_loading_records"] += int(row.get("coach_loading_records") or 0)

    for row in operators.values():
        observed = row["service_observations"]
        loaded = row["loaded_service_observations"]
        row["sampled_loading_coverage"] = round(loaded / observed, 4) if observed else None
        row["coach_share_of_loaded_services"] = round(row["coach_loaded_service_observations"] / loaded, 4) if loaded else None

    observed = totals["service_observations"]
    loaded = totals["loaded_service_observations"]
    return {
        "schema_version": 1,
        "summary": "darwin-passenger-loading-coverage",
        "runs": len(reports),
        "first_started_at": min(str(r.get("started_at") or "") for r in reports),
        "last_finished_at": max(str(r.get("finished_at") or "") for r in reports),
        "sample_seconds": sum(int(r.get("sample_seconds") or 0) for r in reports),
        "totals": {
            **totals,
            "sampled_loading_coverage": round(loaded / observed, 4) if observed else None,
            "coach_share_of_loaded_services": round(totals["coach_loaded_service_observations"] / loaded, 4) if loaded else None,
        },
        "operators": dict(sorted(operators.items())),
        "interpretation": "Counts are service observations across sample windows. The same physical service may appear in more than one run; this is a coverage study, not a unique-train census.",
    }


def print_markdown(summary: dict[str, Any]) -> None:
    totals = summary["totals"]
    print("# Darwin passenger-loading coverage")
    print()
    print(f"Runs: {summary['runs']} · sampled time: {summary['sample_seconds'] / 60:.1f} minutes")
    print(f"Service observations: {totals['service_observations']}")
    print(f"Loaded service observations: {totals['loaded_service_observations']} ({totals['sampled_loading_coverage']})")
    print(f"Coach-level loaded observations: {totals['coach_loaded_service_observations']} ({totals['coach_share_of_loaded_services']})")
    print()
    print("| Operator | Observed | With loading | Coverage | Coach-level | Coach share |")
    print("|---|---:|---:|---:|---:|---:|")
    for operator, row in summary["operators"].items():
        print(
            f"| {operator} | {row['service_observations']} | {row['loaded_service_observations']} | "
            f"{row['sampled_loading_coverage']} | {row['coach_loaded_service_observations']} | "
            f"{row['coach_share_of_loaded_services']} |"
        )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("reports", nargs="+", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--markdown", action="store_true")
    args = parser.parse_args()
    reports = load_reports(args.reports)
    summary = combine(reports)
    if args.output:
        args.output.write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    if args.markdown:
        print_markdown(summary)
    elif not args.output:
        print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
