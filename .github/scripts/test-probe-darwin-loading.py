#!/usr/bin/env python3
from __future__ import annotations

import base64
import gzip
import importlib.util
import json
import pathlib
import sys
import tempfile
import unittest

HERE = pathlib.Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("darwin_loading_probe", HERE / "probe-darwin-loading.py")
assert SPEC and SPEC.loader
probe = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = probe
SPEC.loader.exec_module(probe)


class DarwinLoadingProbeTests(unittest.TestCase):
    def test_formation_loading_is_realtime_coach_evidence_without_persisting_identity(self):
        xml = """<Pport xmlns='urn:test'>
          <uR>
            <TS rid='RID-A' toc='XC'/>
            <TS rid='RID-B' toc='VT'/>
            <formationLoading rid='RID-A' tpl='GTWK'>
              <loading coachNumber='A'>71</loading>
              <loading coachNumber='B'>43</loading>
            </formationLoading>
          </uR>
        </Pport>"""
        state = probe.ProbeState()
        state.observe_payload(xml)
        report = state.report(started_at="2026-08-13T00:00:00Z", finished_at="2026-08-13T00:08:00Z", sample_seconds=480)
        loading = report["loading"]
        realtime = loading["formation_loading"]
        provider = loading["service_loading"]
        self.assertEqual(loading["services_observed"], 2)
        self.assertEqual(realtime["services"], 1)
        self.assertEqual(realtime["services_with_coach_values"], 1)
        self.assertEqual(realtime["numeric_coach_values"], 2)
        self.assertEqual(provider["services"], 0)
        self.assertEqual(loading["operators"]["XC"]["services_with_realtime_formation_loading"], 1)
        self.assertEqual(loading["operators"]["XC"]["services_with_provider_service_loading"], 0)
        self.assertEqual(loading["operators"]["VT"]["services_with_realtime_formation_loading"], 0)
        serialised = json.dumps(report)
        self.assertNotIn("RID-A", serialised)
        self.assertNotIn("RID-B", serialised)
        self.assertNotIn("71", serialised)
        self.assertNotIn("43", serialised)
        self.assertFalse(report["privacy"]["raw_payloads_stored"])
        self.assertFalse(report["privacy"]["service_identifiers_stored"])
        self.assertFalse(report["privacy"]["per_service_loading_values_stored"])

    def test_timetable_fallback_attributes_operator_without_persisting_identity(self):
        xml = """<Pport><uR>
          <formationLoading rid='RID-FALLBACK' tpl='PADTLL'>
            <loading coachNumber='A'>52</loading>
            <loading coachNumber='B'>68</loading>
          </formationLoading>
        </uR></Pport>"""
        state = probe.ProbeState(timetable_rid_to_toc={"RID-FALLBACK": "GW"})
        state.observe_payload(xml)
        report = state.report(started_at="a", finished_at="b", sample_seconds=60)
        loading = report["loading"]
        self.assertEqual(loading["operators"]["GW"]["services_with_realtime_formation_loading"], 1)
        attribution = loading["operator_attribution"]
        self.assertEqual(attribution["realtime_formation_services_attributed"], 1)
        self.assertEqual(attribution["realtime_formation_services_unattributed"], 0)
        self.assertEqual(attribution["realtime_formation_sources"]["timetable_snapshot"], 1)
        self.assertEqual(attribution["realtime_formation_sources"]["live_message"], 0)
        self.assertNotIn("__unknown__", loading["operators"])
        serialised = json.dumps(report)
        self.assertNotIn("RID-FALLBACK", serialised)
        self.assertNotIn("52", serialised)
        self.assertNotIn("68", serialised)
        self.assertFalse(report["privacy"]["timetable_service_identifiers_stored"])

    def test_live_operator_wins_over_timetable_fallback(self):
        xml = """<Pport><uR>
          <TS rid='RID-DIRECT' toc='SE'/>
          <formationLoading rid='RID-DIRECT'>
            <loading coachNumber='1'>48</loading>
          </formationLoading>
        </uR></Pport>"""
        state = probe.ProbeState(timetable_rid_to_toc={"RID-DIRECT": "GW"})
        state.observe_payload(xml)
        report = state.report(started_at="a", finished_at="b", sample_seconds=60)
        loading = report["loading"]
        self.assertEqual(loading["operators"]["SE"]["services_with_realtime_formation_loading"], 1)
        self.assertNotIn("GW", loading["operators"])
        attribution = loading["operator_attribution"]
        self.assertEqual(attribution["realtime_formation_sources"]["live_message"], 1)
        self.assertEqual(attribution["realtime_formation_sources"]["timetable_snapshot"], 0)

    def test_compact_timetable_loader_reads_only_rid_to_toc(self):
        rows = [
            ["RID-ONE", "UID-ONE", "1A01", "XC", "2026-08-13", []],
            ["RID-TWO", "UID-TWO", "1A02", "GW", "2026-08-13", []],
            ["RID-BAD", "UID-BAD", "1A03", "", "2026-08-13", []],
        ]
        with tempfile.TemporaryDirectory() as directory:
            path = pathlib.Path(directory) / "today.json.gz"
            with gzip.open(path, "wt", encoding="utf-8") as handle:
                json.dump(rows, handle)
            result = probe.load_timetable_operator_map(path)
        self.assertEqual(result, {"RID-ONE": "XC", "RID-TWO": "GW"})

    def test_service_loading_is_provider_evidence_not_realtime(self):
        xml = """<Pport>
          <uR>
            <TS rid='RID-C' toc='SE'/>
            <serviceLoading rid='RID-C' tpl='CHX'>
              <loadingPercentage type='Typical'>64</loadingPercentage>
              <loadingCategory type='Expected'>Busy</loadingCategory>
            </serviceLoading>
          </uR>
        </Pport>"""
        state = probe.ProbeState()
        state.observe_payload(xml.encode("utf-8"))
        report = state.report(started_at="a", finished_at="b", sample_seconds=60)
        loading = report["loading"]
        realtime = loading["formation_loading"]
        provider = loading["service_loading"]
        self.assertEqual(realtime["services"], 0)
        self.assertEqual(realtime["services_with_coach_values"], 0)
        self.assertEqual(provider["services"], 1)
        self.assertEqual(provider["percentage_records"], 1)
        self.assertEqual(provider["category_records"], 1)
        self.assertEqual(provider["expected_services"], 1)
        self.assertEqual(provider["typical_services"], 1)
        row = loading["operators"]["SE"]
        self.assertEqual(row["services_with_realtime_formation_loading"], 0)
        self.assertEqual(row["services_with_provider_service_loading"], 1)
        serialised = json.dumps(report)
        self.assertNotIn("RID-C", serialised)
        self.assertNotIn("64", serialised)

    def test_json_base64_gzip_envelope_is_unwrapped_for_formation_loading(self):
        xml = b"<Pport><uR><TS rid='RID-D' toc='GR'/><formationLoading rid='RID-D' tpl='KGX'><loading coachNumber='1'>55</loading></formationLoading></uR></Pport>"
        packed = base64.b64encode(gzip.compress(xml)).decode("ascii")
        payload = json.dumps({"message": {"data": packed}}).encode("utf-8")
        state = probe.ProbeState()
        state.observe_payload(payload)
        report = state.report(started_at="a", finished_at="b", sample_seconds=60)
        self.assertEqual(report["messages"]["decode_failures"], 0)
        self.assertEqual(report["loading"]["formation_loading"]["services"], 1)
        self.assertEqual(report["loading"]["operators"]["GR"]["services_with_realtime_coach_loading"], 1)

    def test_generic_loading_element_is_not_misclassified(self):
        xml = "<Pport><uR><TS rid='RID-E' toc='GW'/><Loading rid='RID-E' value='72'/></uR></Pport>"
        state = probe.ProbeState()
        state.observe_payload(xml)
        report = state.report(started_at="a", finished_at="b", sample_seconds=60)
        self.assertEqual(report["loading"]["formation_loading"]["services"], 0)
        self.assertEqual(report["loading"]["service_loading"]["services"], 0)
        self.assertEqual(report["loading"]["services_with_any_loading"], 0)

    def test_non_xml_message_counts_as_decode_failure_without_crashing(self):
        state = probe.ProbeState()
        state.observe_payload(b"not xml and not json")
        report = state.report(started_at="a", finished_at="b", sample_seconds=60)
        self.assertEqual(report["messages"]["kafka_messages"], 1)
        self.assertEqual(report["messages"]["decode_failures"], 1)
        self.assertEqual(report["loading"]["formation_loading"]["services"], 0)
        self.assertEqual(report["loading"]["service_loading"]["services"], 0)


if __name__ == "__main__":
    unittest.main()
