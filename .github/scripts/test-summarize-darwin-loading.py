#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import pathlib
import sys
import unittest

HERE = pathlib.Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("darwin_loading_summary", HERE / "summarize-darwin-loading.py")
assert SPEC and SPEC.loader
summary = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = summary
SPEC.loader.exec_module(summary)


class DarwinLoadingSummaryTests(unittest.TestCase):
    def test_v2_keeps_realtime_and_provider_loading_separate(self):
        report = {
            "schema_version": 2,
            "probe": "darwin-passenger-loading-coverage",
            "started_at": "a",
            "finished_at": "b",
            "sample_seconds": 60,
            "messages": {"kafka_messages": 10, "xml_documents": 10},
            "loading": {
                "services_observed": 10,
                "formation_loading": {"services": 2, "services_with_coach_values": 2, "records": 2, "numeric_coach_values": 8},
                "service_loading": {"services": 3, "expected_services": 1, "typical_services": 2, "records": 3},
                "operators": {
                    "XC": {
                        "services_observed": 10,
                        "services_with_realtime_formation_loading": 2,
                        "services_with_realtime_coach_loading": 2,
                        "realtime_formation_records": 2,
                        "realtime_coach_values": 8,
                        "services_with_provider_service_loading": 3,
                        "provider_expected_services": 1,
                        "provider_typical_services": 2,
                        "provider_service_loading_records": 3,
                    }
                },
            },
        }
        result = summary.combine([report])
        totals = result["totals"]
        self.assertEqual(totals["realtime_formation_loaded_observations"], 2)
        self.assertEqual(totals["provider_service_loaded_observations"], 3)
        self.assertEqual(totals["legacy_unclassified_loaded_observations"], 0)
        self.assertEqual(totals["realtime_formation_loading_coverage"], 0.2)
        self.assertEqual(totals["provider_service_loading_coverage"], 0.3)

    def test_v1_is_never_promoted_to_realtime(self):
        legacy = {
            "schema_version": 1,
            "probe": "darwin-passenger-loading-coverage",
            "started_at": "a",
            "finished_at": "b",
            "sample_seconds": 60,
            "messages": {"kafka_messages": 10, "xml_documents": 10},
            "loading": {
                "services_observed": 10,
                "services_with_loading": 4,
                "operators": {"SE": {"services_observed": 10, "services_with_loading": 4}},
            },
        }
        result = summary.combine([legacy])
        totals = result["totals"]
        self.assertEqual(totals["realtime_formation_loaded_observations"], 0)
        self.assertEqual(totals["provider_service_loaded_observations"], 0)
        self.assertEqual(totals["legacy_unclassified_loaded_observations"], 4)
        self.assertEqual(result["operators"]["SE"]["legacy_unclassified_loaded_observations"], 4)


if __name__ == "__main__":
    unittest.main()
