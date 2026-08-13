#!/usr/bin/env python3
"""Passive coverage probe for Darwin Push Port passenger-loading messages.

The probe is intentionally measurement-only. It consumes a short live window at
Kafka's latest edge, keeps service identifiers only in memory, and writes
aggregate counters. Raw Darwin payloads, RIDs, train IDs, station identifiers
and per-service loading values are never written to the report.

Darwin exposes two materially different loading message families and they must
not be conflated:

* formationLoading: real-time estimated percentage loading per coach for a
  specific service/formation/location.
* serviceLoading: provider-supplied typical/expected loading for the whole
  service at a location. It is useful evidence, but it is not live occupancy.

Operator attribution is also privacy-safe. A TOC seen directly on any Darwin
message for a RID wins. If Darwin does not repeat the TOC during the short sample,
the probe can use Kerbside's current compact Darwin timetable shard as a
RID-to-TOC fallback. Both maps exist only in runner memory and only aggregate
operator counts are written.

Runtime credentials are supplied by GitHub Actions secrets for the Rail Data
Marketplace Darwin Real Time Train Information PubSub product.
"""
from __future__ import annotations

import argparse
import base64
import collections
import datetime as dt
import gzip
import json
import os
import re
import sys
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable
from zoneinfo import ZoneInfo

SCHEMA_VERSION = 3
UNKNOWN_OPERATOR = "__unknown__"
XML_KEYS = ("payload", "body", "value", "message", "data", "content")
RID_KEYS = ("rid", "RID", "serviceRid", "serviceRID")
TOC_KEYS = ("toc", "tocCode", "operatorCode", "atoc", "trainOperator")


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def gb_date_stamp(moment: dt.datetime | None = None) -> str:
    value = moment or dt.datetime.now(dt.timezone.utc)
    if value.tzinfo is None:
        value = value.replace(tzinfo=dt.timezone.utc)
    return value.astimezone(ZoneInfo("Europe/London")).date().isoformat()


def local_name(tag: str) -> str:
    return str(tag or "").rsplit("}", 1)[-1].rsplit(":", 1)[-1]


def first_attr(element: ET.Element, names: Iterable[str]) -> str:
    for name in names:
        value = element.attrib.get(name)
        if value:
            return str(value).strip()
    lowered = {str(k).lower(): v for k, v in element.attrib.items()}
    for name in names:
        value = lowered.get(str(name).lower())
        if value:
            return str(value).strip()
    return ""


def safe_operator(value: str) -> str:
    text = re.sub(r"[^A-Za-z0-9_-]", "", str(value or "").upper())
    return text[:12] if text else UNKNOWN_OPERATOR


def looks_like_xml(text: str) -> bool:
    stripped = str(text or "").lstrip("\ufeff \t\r\n")
    return stripped.startswith("<") and ">" in stripped[:512]


def maybe_base64_xml(text: str) -> str | None:
    candidate = str(text or "").strip()
    if len(candidate) < 16 or len(candidate) % 4:
        return None
    try:
        decoded = base64.b64decode(candidate, validate=True)
    except Exception:
        return None
    try:
        if decoded[:2] == b"\x1f\x8b":
            decoded = gzip.decompress(decoded)
        decoded_text = decoded.decode("utf-8")
    except Exception:
        return None
    return decoded_text if looks_like_xml(decoded_text) else None


def xml_candidates_from_json(value: Any) -> list[str]:
    found: list[str] = []
    if isinstance(value, dict):
        preferred = [value[k] for k in XML_KEYS if k in value]
        others = [v for k, v in value.items() if k not in XML_KEYS]
        for item in preferred + others:
            found.extend(xml_candidates_from_json(item))
    elif isinstance(value, list):
        for item in value:
            found.extend(xml_candidates_from_json(item))
    elif isinstance(value, str):
        if looks_like_xml(value):
            found.append(value)
        else:
            decoded = maybe_base64_xml(value)
            if decoded:
                found.append(decoded)
    return found


def decode_xml_candidates(raw: bytes | str | None) -> list[str]:
    if raw is None:
        return []
    if isinstance(raw, str):
        text = raw
    else:
        data = bytes(raw)
        try:
            if data[:2] == b"\x1f\x8b":
                data = gzip.decompress(data)
            text = data.decode("utf-8")
        except Exception:
            return []
    if looks_like_xml(text):
        return [text]
    try:
        parsed = json.loads(text)
    except Exception:
        decoded = maybe_base64_xml(text)
        return [decoded] if decoded else []
    return xml_candidates_from_json(parsed)


def parse_number(value: Any) -> float | None:
    try:
        number = float(str(value).strip())
    except (TypeError, ValueError):
        return None
    return number if 0 <= number <= 100 else None


def child_nodes(element: ET.Element, name: str) -> list[ET.Element]:
    target = name.lower()
    return [item for item in element.iter() if item is not element and local_name(item.tag).lower() == target]


def load_timetable_operator_map(path: Path | None) -> dict[str, str]:
    """Load only RID -> TOC from a compact Kerbside timetable shard.

    The returned identifiers are deliberately kept in memory only. Missing or
    unreadable shards are treated as an unavailable fallback rather than a
    failure of the live Kafka probe.
    """
    if path is None or not path.is_file():
        return {}
    try:
        with gzip.open(path, "rt", encoding="utf-8") as handle:
            rows = json.load(handle)
    except (OSError, UnicodeError, json.JSONDecodeError):
        return {}
    result: dict[str, str] = {}
    if not isinstance(rows, list):
        return result
    for row in rows:
        if not isinstance(row, list) or len(row) < 4:
            continue
        rid = str(row[0] or "").strip()
        toc = safe_operator(str(row[3] or ""))
        if rid and toc != UNKNOWN_OPERATOR:
            result[rid] = toc
    return result


def default_timetable_path() -> Path:
    return Path("kerbside-rail-timetable") / f"{gb_date_stamp()}.json.gz"


@dataclass
class ProbeState:
    timetable_rid_to_toc: dict[str, str] = field(default_factory=dict)
    messages: int = 0
    kafka_errors: int = 0
    decode_failures: int = 0
    xml_documents: int = 0
    xml_parse_failures: int = 0
    element_types: collections.Counter[str] = field(default_factory=collections.Counter)
    rid_to_toc: dict[str, str] = field(default_factory=dict)
    services_seen: set[str] = field(default_factory=set)

    formation_loading_messages: int = 0
    formation_loading_records: int = 0
    formation_numeric_values: int = 0
    formation_loading_services: set[str] = field(default_factory=set)
    formation_coach_services: set[str] = field(default_factory=set)
    formation_records_by_rid: collections.Counter[str] = field(default_factory=collections.Counter)
    formation_values_by_rid: collections.Counter[str] = field(default_factory=collections.Counter)

    service_loading_messages: int = 0
    service_loading_records: int = 0
    service_loading_percentage_records: int = 0
    service_loading_category_records: int = 0
    service_loading_services: set[str] = field(default_factory=set)
    service_loading_expected_services: set[str] = field(default_factory=set)
    service_loading_typical_services: set[str] = field(default_factory=set)
    service_records_by_rid: collections.Counter[str] = field(default_factory=collections.Counter)

    def observe_payload(self, raw: bytes | str | None) -> None:
        self.messages += 1
        candidates = decode_xml_candidates(raw)
        if not candidates:
            self.decode_failures += 1
            return
        for text in candidates:
            try:
                root = ET.fromstring(text)
            except ET.ParseError:
                self.xml_parse_failures += 1
                continue
            self.xml_documents += 1
            self._observe_tree(root)

    def _observe_tree(self, root: ET.Element) -> None:
        parent: dict[ET.Element, ET.Element] = {child: node for node in root.iter() for child in node}
        for node in root.iter():
            self.element_types[local_name(node.tag)] += 1
            rid = first_attr(node, RID_KEYS)
            toc = first_attr(node, TOC_KEYS)
            if rid:
                self.services_seen.add(rid)
                if toc:
                    self.rid_to_toc[rid] = safe_operator(toc)

        formation_nodes = [node for node in root.iter() if local_name(node.tag).lower() == "formationloading"]
        service_nodes = [node for node in root.iter() if local_name(node.tag).lower() == "serviceloading"]
        if formation_nodes:
            self.formation_loading_messages += 1
        if service_nodes:
            self.service_loading_messages += 1

        for node in formation_nodes:
            rid, toc = self._identity_for(node, parent)
            self.formation_loading_records += 1
            loads = child_nodes(node, "loading")
            valid_values = 0
            has_coach = False
            for load in loads:
                coach = first_attr(load, ("coachNumber", "coach", "carriage", "vehicle"))
                if coach:
                    has_coach = True
                number = parse_number(load.text)
                if number is None:
                    for key in ("loading", "value", "percentage", "percent"):
                        number = parse_number(load.attrib.get(key))
                        if number is not None:
                            break
                if number is not None:
                    valid_values += 1
            self.formation_numeric_values += valid_values
            if rid:
                self.services_seen.add(rid)
                self.formation_loading_services.add(rid)
                self.formation_records_by_rid[rid] += 1
                self.formation_values_by_rid[rid] += valid_values
                if has_coach:
                    self.formation_coach_services.add(rid)
                if toc:
                    self.rid_to_toc[rid] = toc

        for node in service_nodes:
            rid, toc = self._identity_for(node, parent)
            self.service_loading_records += 1
            percentage_nodes = child_nodes(node, "loadingPercentage")
            category_nodes = child_nodes(node, "loadingCategory")
            self.service_loading_percentage_records += len(percentage_nodes)
            self.service_loading_category_records += len(category_nodes)
            kinds: set[str] = set()
            for child in percentage_nodes + category_nodes:
                kind = str(child.attrib.get("type") or "Typical").strip().lower()
                kinds.add("expected" if kind == "expected" else "typical")
            if not kinds:
                kinds.add("typical")
            if rid:
                self.services_seen.add(rid)
                self.service_loading_services.add(rid)
                self.service_records_by_rid[rid] += 1
                if "expected" in kinds:
                    self.service_loading_expected_services.add(rid)
                if "typical" in kinds:
                    self.service_loading_typical_services.add(rid)
                if toc:
                    self.rid_to_toc[rid] = toc

    def _identity_for(self, node: ET.Element, parent: dict[ET.Element, ET.Element]) -> tuple[str, str]:
        current: ET.Element | None = node
        rid = ""
        toc = ""
        while current is not None:
            rid = rid or first_attr(current, RID_KEYS)
            toc = toc or first_attr(current, TOC_KEYS)
            if rid and toc:
                break
            current = parent.get(current)
        if rid and not toc:
            toc = self.rid_to_toc.get(rid, "")
        return rid, safe_operator(toc) if toc else ""

    def operator_for_rid(self, rid: str) -> tuple[str, str]:
        direct = self.rid_to_toc.get(rid, "")
        if direct and direct != UNKNOWN_OPERATOR:
            return direct, "live_message"
        timetable = self.timetable_rid_to_toc.get(rid, "")
        if timetable and timetable != UNKNOWN_OPERATOR:
            return timetable, "timetable_snapshot"
        return UNKNOWN_OPERATOR, "unknown"

    def _attribution_counts(self, rids: Iterable[str]) -> dict[str, int]:
        counts = collections.Counter(self.operator_for_rid(rid)[1] for rid in rids)
        return {
            "live_message": int(counts["live_message"]),
            "timetable_snapshot": int(counts["timetable_snapshot"]),
            "unknown": int(counts["unknown"]),
        }

    def report(self, *, started_at: str, finished_at: str, sample_seconds: int) -> dict[str, Any]:
        service_groups: collections.defaultdict[str, set[str]] = collections.defaultdict(set)
        formation_groups: collections.defaultdict[str, set[str]] = collections.defaultdict(set)
        formation_coach_groups: collections.defaultdict[str, set[str]] = collections.defaultdict(set)
        service_loading_groups: collections.defaultdict[str, set[str]] = collections.defaultdict(set)
        service_expected_groups: collections.defaultdict[str, set[str]] = collections.defaultdict(set)
        service_typical_groups: collections.defaultdict[str, set[str]] = collections.defaultdict(set)
        formation_record_groups: collections.Counter[str] = collections.Counter()
        formation_value_groups: collections.Counter[str] = collections.Counter()
        service_record_groups: collections.Counter[str] = collections.Counter()

        for rid in self.services_seen:
            operator, _source = self.operator_for_rid(rid)
            service_groups[operator].add(rid)
        for rid in self.formation_loading_services:
            operator, _source = self.operator_for_rid(rid)
            formation_groups[operator].add(rid)
            formation_record_groups[operator] += self.formation_records_by_rid[rid]
            formation_value_groups[operator] += self.formation_values_by_rid[rid]
        for rid in self.formation_coach_services:
            operator, _source = self.operator_for_rid(rid)
            formation_coach_groups[operator].add(rid)
        for rid in self.service_loading_services:
            operator, _source = self.operator_for_rid(rid)
            service_loading_groups[operator].add(rid)
            service_record_groups[operator] += self.service_records_by_rid[rid]
        for rid in self.service_loading_expected_services:
            operator, _source = self.operator_for_rid(rid)
            service_expected_groups[operator].add(rid)
        for rid in self.service_loading_typical_services:
            operator, _source = self.operator_for_rid(rid)
            service_typical_groups[operator].add(rid)

        operators: dict[str, Any] = {}
        all_operators = set(service_groups) | set(formation_groups) | set(service_loading_groups)
        for operator in sorted(all_operators):
            observed = len(service_groups[operator])
            formation = len(formation_groups[operator])
            provider = len(service_loading_groups[operator])
            any_loaded = len(formation_groups[operator] | service_loading_groups[operator])
            operators[operator] = {
                "services_observed": observed,
                "services_with_any_loading": any_loaded,
                "services_with_realtime_formation_loading": formation,
                "realtime_formation_loading_coverage": round(formation / observed, 4) if observed else None,
                "services_with_realtime_coach_loading": len(formation_coach_groups[operator]),
                "realtime_formation_records": int(formation_record_groups[operator]),
                "realtime_coach_values": int(formation_value_groups[operator]),
                "services_with_provider_service_loading": provider,
                "provider_service_loading_coverage": round(provider / observed, 4) if observed else None,
                "provider_expected_services": len(service_expected_groups[operator]),
                "provider_typical_services": len(service_typical_groups[operator]),
                "provider_service_loading_records": int(service_record_groups[operator]),
            }

        observed = len(self.services_seen)
        formation = len(self.formation_loading_services)
        provider = len(self.service_loading_services)
        any_loaded = len(self.formation_loading_services | self.service_loading_services)
        coach = len(self.formation_coach_services)
        attribution = self._attribution_counts(self.services_seen)
        formation_attribution = self._attribution_counts(self.formation_loading_services)
        attributed = observed - attribution["unknown"]
        formation_attributed = formation - formation_attribution["unknown"]
        return {
            "schema_version": SCHEMA_VERSION,
            "probe": "darwin-passenger-loading-coverage",
            "started_at": started_at,
            "finished_at": finished_at,
            "sample_seconds": sample_seconds,
            "privacy": {
                "raw_payloads_stored": False,
                "service_identifiers_stored": False,
                "station_identifiers_stored": False,
                "per_service_loading_values_stored": False,
                "timetable_service_identifiers_stored": False,
            },
            "messages": {
                "kafka_messages": self.messages,
                "kafka_errors": self.kafka_errors,
                "decode_failures": self.decode_failures,
                "xml_documents": self.xml_documents,
                "xml_parse_failures": self.xml_parse_failures,
                "top_element_names": dict(self.element_types.most_common(20)),
            },
            "loading": {
                "services_observed": observed,
                "services_with_any_loading": any_loaded,
                "services_with_loading": any_loaded,
                "sampled_service_loading_coverage": round(any_loaded / observed, 4) if observed else None,
                "services_with_coach_loading": coach,
                "operator_attribution": {
                    "meaning": "TOC from a live Darwin message for the RID, then current compact Darwin timetable RID-to-TOC fallback; identifiers remain memory-only",
                    "timetable_snapshot_available": bool(self.timetable_rid_to_toc),
                    "timetable_services_indexed": len(self.timetable_rid_to_toc),
                    "services_attributed": attributed,
                    "services_unattributed": attribution["unknown"],
                    "coverage": round(attributed / observed, 4) if observed else None,
                    "sources": attribution,
                    "realtime_formation_services_attributed": formation_attributed,
                    "realtime_formation_services_unattributed": formation_attribution["unknown"],
                    "realtime_formation_coverage": round(formation_attributed / formation, 4) if formation else None,
                    "realtime_formation_sources": formation_attribution,
                },
                "operators": operators,
                "formation_loading": {
                    "meaning": "real-time estimated percentage loading per coach for a specific service, formation and location",
                    "messages": self.formation_loading_messages,
                    "records": self.formation_loading_records,
                    "numeric_coach_values": self.formation_numeric_values,
                    "services": formation,
                    "coverage": round(formation / observed, 4) if observed else None,
                    "services_with_coach_values": coach,
                },
                "service_loading": {
                    "meaning": "provider-supplied typical/expected whole-service loading; not live occupancy",
                    "messages": self.service_loading_messages,
                    "records": self.service_loading_records,
                    "percentage_records": self.service_loading_percentage_records,
                    "category_records": self.service_loading_category_records,
                    "services": provider,
                    "coverage": round(provider / observed, 4) if observed else None,
                    "expected_services": len(self.service_loading_expected_services),
                    "typical_services": len(self.service_loading_typical_services),
                },
                "denominator_note": "Coverage is distinct service RIDs observed in this sample window, not every train running on the network.",
            },
        }


def config_from_env() -> dict[str, str]:
    required = {
        "bootstrap.servers": os.environ.get("RDM_DARWIN_KAFKA_BOOTSTRAP", "").strip(),
        "group.id": os.environ.get("RDM_DARWIN_KAFKA_GROUP_ID", "").strip(),
        "sasl.username": os.environ.get("RDM_DARWIN_KAFKA_USERNAME", "").strip(),
        "sasl.password": os.environ.get("RDM_DARWIN_KAFKA_PASSWORD", "").strip(),
    }
    missing = [key for key, value in required.items() if not value]
    topic = os.environ.get("RDM_DARWIN_KAFKA_TOPIC", "").strip()
    if not topic:
        missing.append("topic")
    if missing:
        raise RuntimeError("Missing Darwin Kafka configuration: " + ", ".join(missing))
    config = {
        **required,
        "security.protocol": "SASL_SSL",
        "sasl.mechanism": "PLAIN",
        "auto.offset.reset": "latest",
        "enable.auto.commit": False,
        "client.id": "kerbside-loading-probe",
    }
    ca = os.environ.get("RDM_DARWIN_KAFKA_CA_LOCATION", "").strip()
    if ca:
        config["ssl.ca.location"] = ca
    else:
        try:
            import certifi  # type: ignore
            config["ssl.ca.location"] = certifi.where()
        except Exception:
            pass
    return {"topic": topic, **config}


def run_probe(seconds: int, output: Path, timetable: Path | None = None) -> dict[str, Any]:
    try:
        from confluent_kafka import Consumer  # type: ignore
    except Exception as exc:
        raise RuntimeError("confluent-kafka is required for live probing") from exc

    settings = config_from_env()
    topic = settings.pop("topic")
    timetable_map = load_timetable_operator_map(timetable)
    state = ProbeState(timetable_rid_to_toc=timetable_map)
    consumer = Consumer(settings)
    started_at = utc_now()
    deadline = time.monotonic() + seconds
    try:
        consumer.subscribe([topic])
        while time.monotonic() < deadline:
            msg = consumer.poll(1.0)
            if msg is None:
                continue
            if msg.error() is not None:
                state.kafka_errors += 1
                continue
            state.observe_payload(msg.value())
    finally:
        consumer.close()
    finished_at = utc_now()
    report = state.report(started_at=started_at, finished_at=finished_at, sample_seconds=seconds)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    if state.messages == 0:
        raise RuntimeError("Darwin Kafka connection produced no messages during the sample window")
    return report


def print_summary(report: dict[str, Any]) -> None:
    loading = report["loading"]
    formation = loading["formation_loading"]
    service = loading["service_loading"]
    attribution = loading.get("operator_attribution") or {}
    sources = attribution.get("sources") or {}
    formation_sources = attribution.get("realtime_formation_sources") or {}
    print(f"Darwin loading probe: {report['messages']['kafka_messages']} Kafka messages")
    print(f"Services observed: {loading['services_observed']}")
    print(
        "Operator attribution: "
        f"{attribution.get('services_attributed', 0)}/{loading['services_observed']} "
        f"({attribution.get('coverage')}); live={sources.get('live_message', 0)}; "
        f"timetable={sources.get('timetable_snapshot', 0)}; unknown={sources.get('unknown', 0)}"
    )
    print(
        "Real-time formation loading: "
        f"{formation['services']} services; coach-values={formation['services_with_coach_values']}; "
        f"coverage={formation['coverage']}; operator-attributed={attribution.get('realtime_formation_services_attributed', 0)}; "
        f"live-map={formation_sources.get('live_message', 0)}; timetable-map={formation_sources.get('timetable_snapshot', 0)}; "
        f"unknown={formation_sources.get('unknown', 0)}"
    )
    print(
        "Provider service loading (not live occupancy): "
        f"{service['services']} services; expected={service['expected_services']}; "
        f"typical={service['typical_services']}; coverage={service['coverage']}"
    )
    for operator, row in sorted(loading["operators"].items()):
        if row["services_with_realtime_formation_loading"] or row["services_with_provider_service_loading"]:
            print(
                f"  {operator}: observed={row['services_observed']}; "
                f"realtime={row['services_with_realtime_formation_loading']}; "
                f"provider={row['services_with_provider_service_loading']}"
            )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seconds", type=int, default=480, help="Live sample duration in seconds")
    parser.add_argument("--output", type=Path, default=Path("darwin-loading-report.json"))
    parser.add_argument(
        "--timetable",
        type=Path,
        default=default_timetable_path(),
        help="Optional compact Kerbside timetable shard used only for in-memory RID-to-TOC attribution",
    )
    args = parser.parse_args()
    if not 30 <= args.seconds <= 1800:
        parser.error("--seconds must be between 30 and 1800")
    try:
        report = run_probe(args.seconds, args.output, args.timetable)
    except Exception as exc:
        print(f"probe failed: {exc}", file=sys.stderr)
        return 1
    print_summary(report)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
