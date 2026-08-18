#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import pathlib
import sys
import unittest

HERE = pathlib.Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("darwin_loading_history", HERE / "update-darwin-loading-history.py")
assert SPEC and SPEC.loader
history_mod = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = history_mod
SPEC.loader.exec_module(history_mod)


def summary(operator: str = "XC", observed: int = 10, realtime: int = 2) -> dict:
    coverage = realtime / observed if observed else None
    return {
        "schema_version": 2,
        "summary": "darwin-passenger-loading-coverage",
        "runs": 24,
        "first_started_at": "2026-08-17T02:00:00Z",
        "last_finished_at": "2026-08-18T01:59:00Z",
        "sample_seconds": 24 * 480,
        "totals": {
            "service_observations": observed,
            "realtime_formation_loaded_observations": realtime,
            "realtime_coach_loaded_observations": realtime,
            "provider_service_loaded_observations": 3,
            "realtime_formation_loading_coverage": coverage,
            "provider_service_loading_coverage": 0.3 if observed else None,
            "decode_failures": 0,
            "xml_parse_failures": 0,
        },
        "operators": {
            operator: {
                "service_observations": observed,
                "realtime_formation_loaded_observations": realtime,
                "realtime_coach_loaded_observations": realtime,
                "provider_service_loaded_observations": 3,
                "realtime_formation_loading_coverage": coverage,
                "provider_service_loading_coverage": 0.3 if observed else None,
            }
        },
    }


class DarwinLoadingHistoryTests(unittest.TestCase):
    def test_same_day_snapshot_is_replaced_not_duplicated(self):
        first = history_mod.update(history_mod.empty_history(), summary(realtime=2), "2026-08-18T02:47:00Z")
        second = history_mod.update(first, summary(realtime=5), "2026-08-18T03:10:00Z")
        self.assertEqual(len(second["snapshots"]), 1)
        self.assertEqual(second["snapshots"][0]["totals"]["realtime_formation_loaded_observations"], 5)
        self.assertEqual(second["snapshots"][0]["generated_at"], "2026-08-18T03:10:00Z")

    def test_retention_keeps_only_latest_snapshots(self):
        value = history_mod.empty_history()
        for day in range(1, 5):
            value = history_mod.update(value, summary(), f"2026-08-0{day}T02:47:00Z", keep=2)
        self.assertEqual([row["date"] for row in value["snapshots"]], ["2026-08-03", "2026-08-04"])
        self.assertEqual(value["retention_snapshots"], 2)

    def test_markdown_makes_operator_dropout_visible(self):
        value = history_mod.empty_history()
        value = history_mod.update(value, summary(realtime=4), "2026-08-17T02:47:00Z")
        value = history_mod.update(value, summary(realtime=0), "2026-08-18T02:47:00Z")
        text = history_mod.markdown(value)
        self.assertIn("Operator trend", text)
        self.assertIn("| XC | 10 | 0.0% | 40.0% | 1/2 |", text)
        self.assertNotIn("RID", "\n".join(str(value).splitlines()))


if __name__ == "__main__":
    unittest.main()
