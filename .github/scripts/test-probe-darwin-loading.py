#!/usr/bin/env python3
from __future__ import annotations

import base64
import gzip
import importlib.util
import json
import pathlib
import sys
import unittest

HERE = pathlib.Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("darwin_loading_probe", HERE / "probe-darwin-loading.py")
assert SPEC and SPEC.loader
probe = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = probe
SPEC.loader.exec_module(probe)


class DarwinLoadingProbeTests(unittest.TestCase):
    def test_coach_loading_is_counted_by_operator_without_persisting_identity(self):
        xml = """<Pport xmlns='urn:test'>
          <uR>
            <TS rid='RID-A' toc='XC'/>
            <TS rid='RID-B' toc='VT'/>
            <Loading rid='RID-A'>
              <coach coachNumber='A' loading='71'/>
              <coach coachNumber='B' loading='43'/>
            </Loading>
          </uR>
        </Pport>"""
        state = probe.ProbeState()
        state.observe_payload(xml)
        report = state.report(started_at="2026-08-13T00:00:00Z", finished_at="2026-08-13T00:08:00Z", sample_seconds=480)
        loading = report["loading"]
        self.assertEqual(loading["services_observed"], 2)
        self.assertEqual(loading["services_with_loading"], 1)
        self.assertEqual(loading["services_with_coach_loading"], 1)
        self.assertEqual(loading["coach_loading_records"], 1)
        self.assertEqual(loading["numeric_values_seen"], 2)
        self.assertEqual(loading["operators"]["XC"]["services_with_loading"], 1)
        self.assertEqual(loading["operators"]["VT"]["services_with_loading"], 0)
        serialised = json.dumps(report)
        self.assertNotIn("RID-A", serialised)
        self.assertNotIn("RID-B", serialised)
        self.assertNotIn("71", serialised)
        self.assertFalse(report["privacy"]["raw_payloads_stored"])
        self.assertFalse(report["privacy"]["service_identifiers_stored"])

    def test_whole_train_loading_and_unknown_operator_are_kept_as_aggregate(self):
        xml = "<Pport><uR><TS rid='RID-C'/><Loading rid='RID-C' value='0.64'/></uR></Pport>"
        state = probe.ProbeState()
        state.observe_payload(xml.encode("utf-8"))
        report = state.report(started_at="a", finished_at="b", sample_seconds=60)
        loading = report["loading"]
        self.assertEqual(loading["whole_train_loading_records"], 1)
        self.assertEqual(loading["services_with_coach_loading"], 0)
        self.assertEqual(loading["operators"][probe.UNKNOWN_OPERATOR]["services_with_loading"], 1)

    def test_json_base64_gzip_envelope_is_unwrapped(self):
        xml = b"<Pport><uR><TS rid='RID-D' toc='GR'/><Loading rid='RID-D'><coach id='1' loading='55'/></Loading></uR></Pport>"
        packed = base64.b64encode(gzip.compress(xml)).decode("ascii")
        payload = json.dumps({"message": {"data": packed}}).encode("utf-8")
        state = probe.ProbeState()
        state.observe_payload(payload)
        report = state.report(started_at="a", finished_at="b", sample_seconds=60)
        self.assertEqual(report["messages"]["decode_failures"], 0)
        self.assertEqual(report["loading"]["operators"]["GR"]["services_with_coach_loading"], 1)

    def test_non_xml_message_counts_as_decode_failure_without_crashing(self):
        state = probe.ProbeState()
        state.observe_payload(b"not xml and not json")
        report = state.report(started_at="a", finished_at="b", sample_seconds=60)
        self.assertEqual(report["messages"]["kafka_messages"], 1)
        self.assertEqual(report["messages"]["decode_failures"], 1)
        self.assertEqual(report["loading"]["services_with_loading"], 0)


if __name__ == "__main__":
    unittest.main()
