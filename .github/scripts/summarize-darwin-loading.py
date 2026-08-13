#!/usr/bin/env python3
"""Combine privacy-safe Darwin loading probe artifacts across many runs.

Schema v2 separates real-time ``formationLoading`` from provider-supplied
``serviceLoading``. Older v1 reports are retained only as legacy unclassified
loading observations; they are never promoted to real-time evidence.
"""
from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path
from typing import Any


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


def empty_operator() -> dict[str, int | float | None]:
    return {
        "service_observations": 0,
        "realtime_formation_loaded_observations": 0,
        "realtime_coach_loaded_observations": 0,
        "realtime_formation_records": 0,
        "realtime_coach_values": 0,
        "provider_service_loaded_observations": 0,
        "provider_expected_observations": 0,
        "provider_typical_observations": 0,
        "provider_service_loading_records": 0,
        "legacy_unclassified_loaded_observations": 0,
    }


def combine(reports: list[dict[str, Any]]) -> dict[str, Any]:
    operators: dict[str, dict[str, int | float | None]] = defaultdict(empty_operator)
    totals: dict[str, int | float | None] = {
        "kafka_messages": 0,
        "xml_documents": 0,
        "decode_failures": 0,
        "xml_parse_failures": 0,
        "service_observations": 0,
        "realtime_formation_loaded_observations": 0,
        "realtime_coach_loaded_observations": 0,
        "realtime_formation_records": 0,
        "realtime_coach_values": 0,
        "provider_service_loaded_observations": 0,
        "provider_expected_observations": 0,
        "provider_typical_observations": 0,
        "provider_service_loading_records": 0,
        "legacy_unclassified_loaded_observations": 0,
    }

    for report in reports:
        messages = report.get("messages", {})
        loading = report.get("loading", {})
        schema = int(report.get("schema_version") or 1)
        totals["kafka_messages"] = int(totals["kafka_messages"] or 0) + int(messages.get("kafka_messages") or 0)
        totals["xml_documents"] = int(totals["xml_documents"] or 0) + int(messages.get("xml_documents") or 0)
        totals["decode_failures"] = int(totals["decode_failures"] or 0) + int(messages.get("decode_failures") or 0)
        totals["xml_parse_failures"] = int(totals["xml_parse_failures"] or 0) + int(messages.get("xml_parse_failures") or 0)
        totals["service_observations"] = int(totals["service_observations"] or 0) + int(loading.get("services_observed") or 0)

        if schema >= 2 and isinstance(loading.get("formation_loading"), dict):
            formation = loading.get("formation_loading") or {}
            provider = loading.get("service_loading") or {}
            totals["realtime_formation_loaded_observations"] = int(totals["realtime_formation_loaded_observations"] or 0) + int(formation.get("services") or 0)
            totals["realtime_coach_loaded_observations"] = int(totals["realtime_coach_loaded_observations"] or 0) + int(formation.get("services_with_coach_values") or 0)
            totals["realtime_formation_records"] = int(totals["realtime_formation_records"] or 0) + int(formation.get("records") or 0)
            totals["realtime_coach_values"] = int(totals["realtime_coach_values"] or 0) + int(formation.get("numeric_coach_values") or 0)
            totals["provider_service_loaded_observations"] = int(totals["provider_service_loaded_observations"] or 0) + int(provider.get("services") or 0)
            totals["provider_expected_observations"] = int(totals["provider_expected_observations"] or 0) + int(provider.get("expected_services") or 0)
            totals["provider_typical_observations"] = int(totals["provider_typical_observations"] or 0) + int(provider.get("typical_services") or 0)
            totals["provider_service_loading_records"] = int(totals["provider_service_loading_records"] or 0) + int(provider.get("records") or 0)

            for operator, row in (loading.get("operators") or {}).items():
                dest = operators[str(operator)]
                dest["service_observations"] = int(dest["service_observations"] or 0) + int(row.get("services_observed") or 0)
                dest["realtime_formation_loaded_observations"] = int(dest["realtime_formation_loaded_observations"] or 0) + int(row.get("services_with_realtime_formation_loading") or 0)
                dest["realtime_coach_loaded_observations"] = int(dest["realtime_coach_loaded_observations"] or 0) + int(row.get("services_with_realtime_coach_loading") or 0)
                dest["realtime_formation_records"] = int(dest["realtime_formation_records"] or 0) + int(row.get("realtime_formation_records") or 0)
                dest["realtime_coach_values"] = int(dest["realtime_coach_values"] or 0) + int(row.get("realtime_coach_values") or 0)
                dest["provider_service_loaded_observations"] = int(dest["provider_service_loaded_observations"] or 0) + int(row.get("services_with_provider_service_loading") or 0)
                dest["provider_expected_observations"] = int(dest["provider_expected_observations"] or 0) + int(row.get("provider_expected_services") or 0)
                dest["provider_typical_observations"] = int(dest["provider_typical_observations"] or 0) + int(row.get("provider_typical_services") or 0)
                dest["provider_service_loading_records"] = int(dest["provider_service_loading_records"] or 0) + int(row.get("provider_service_loading_records") or 0)
        else:
            legacy = int(loading.get("services_with_loading") or 0)
            totals["legacy_unclassified_loaded_observations"] = int(totals["legacy_unclassified_loaded_observations"] or 0) + legacy
            for operator, row in (loading.get("operators") or {}).items():
                dest = operators[str(operator)]
                dest["service_observations"] = int(dest["service_observations"] or 0) + int(row.get("services_observed") or 0)
                dest["legacy_unclassified_loaded_observations"] = int(dest["legacy_unclassified_loaded_observations"] or 0) + int(row.get("services_with_loading") or 0)

    observed = int(totals["service_observations"] or 0)
    realtime = int(totals["realtime_formation_loaded_observations"] or 0)
    provider = int(totals["provider_service_loaded_observations"] or 0)
    totals["realtime_formation_loading_coverage"] = round(realtime / observed, 4) if observed else None
    totals["provider_service_loading_coverage"] = round(provider / observed, 4) if observed else None

    for row in operators.values():
        operator_observed = int(row["service_observations"] or 0)
        operator_realtime = int(row["realtime_formation_loaded_observations"] or 0)
        operator_provider = int(row["provider_service_loaded_observations"] or 0)
        row["realtime_formation_loading_coverage"] = round(operator_realtime / operator_observed, 4) if operator_observed else None
        row["provider_service_loading_coverage"] = round(operator_provider / operator_observed, 4) if operator_observed else None

    return {
        "schema_version": 2,
        "summary": "darwin-passenger-loading-coverage",
        "runs": len(reports),
        "first_started_at": min(str(r.get("started_at") or "") for r in reports),
        "last_finished_at": max(str(r.get("finished_at") or "") for r in reports),
        "sample_seconds": sum(int(r.get("sample_seconds") or 0) for r in reports),
        "totals": totals,
        "operators": dict(sorted(operators.items())),
        "interpretation": (
            "Counts are service observations across sample windows. formationLoading is real-time per-coach evidence; "
            "serviceLoading is provider typical/expected evidence and is not live occupancy. Legacy v1 loading remains "
            "unclassified and is never counted as real-time. The same physical service may appear in more than one run."
        ),
    }


def print_markdown(summary: dict[str, Any]) -> None:
    totals = summary["totals"]
    print("# Darwin passenger-loading coverage")
    print()
    print(f"Runs: {summary['runs']} · sampled time: {summary['sample_seconds'] / 60:.1f} minutes")
    print(f"Service observations: {totals['service_observations']}")
    print(
        "Real-time formationLoading observations: "
        f"{totals['realtime_formation_loaded_observations']} ({totals['realtime_formation_loading_coverage']})"
    )
    print(f"Real-time services with coach values: {totals['realtime_coach_loaded_observations']}")
    print(
        "Provider serviceLoading observations (not live occupancy): "
        f"{totals['provider_service_loaded_observations']} ({totals['provider_service_loading_coverage']})"
    )
    if totals["legacy_unclassified_loaded_observations"]:
        print(f"Legacy unclassified loading observations: {totals['legacy_unclassified_loaded_observations']}")
    print()
    print("| Operator | Observed | Real-time formation | RT coverage | Coach values | Provider service | Provider coverage | Legacy unclassified |")
    print("|---|---:|---:|---:|---:|---:|---:|---:|")
    for operator, row in summary["operators"].items():
        print(
            f"| {operator} | {row['service_observations']} | {row['realtime_formation_loaded_observations']} | "
            f"{row['realtime_formation_loading_coverage']} | {row['realtime_coach_loaded_observations']} | "
            f"{row['provider_service_loaded_observations']} | {row['provider_service_loading_coverage']} | "
            f"{row['legacy_unclassified_loaded_observations']} |"
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
