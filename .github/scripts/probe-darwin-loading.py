#!/usr/bin/env python3
"""Passive coverage probe for Darwin Push Port passenger-loading messages.

The probe is intentionally measurement-only. It consumes a short live window at
Kafka's latest edge, keeps service identifiers only in memory, and writes
aggregate counters. Raw Darwin payloads, RIDs, train IDs, station identifiers
and per-service loading values are never written to the report.

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

SCHEMA_VERSION = 1
UNKNOWN_OPERATOR = "__unknown__"
XML_KEYS = ("payload", "body", "value", "message", "data", "content")
RID_KEYS = ("rid", "RID", "serviceRid", "serviceRID")
TOC_KEYS = ("toc", "tocCode", "operatorCode", "atoc", "trainOperator")
COACH_HINTS = ("coach", "carriage", "vehicle")
LOADING_HINTS = ("loading", "load")


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


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


def is_loading_element(element: ET.Element) -> bool:
    name = local_name(element.tag).lower()
    return name == "loading" or name.endswith("loading") or name in {"load", "trainload"}


def has_coach_hint(element: ET.Element) -> bool:
    for item in element.iter():
        name = local_name(item.tag).lower()
        if any(hint in name for hint in COACH_HINTS):
            return True
        for key in item.attrib:
            low = str(key).lower()
            if any(hint in low for hint in COACH_HINTS):
                return True
    return False


def numeric_loading_values(element: ET.Element) -> list[float]:
    values: list[float] = []
    for item in element.iter():
        name = local_name(item.tag).lower()
        for key, raw in item.attrib.items():
            low = str(key).lower()
            if not any(hint in low for hint in LOADING_HINTS) and low not in {"value", "percentage", "percent", "count"}:
                continue
            try:
                values.append(float(raw))
            except (TypeError, ValueError):
                pass
        if item.text and ("loading" in name or name in {"value", "percentage", "percent", "count"}):
            try:
                values.append(float(item.text.strip()))
            except (TypeError, ValueError):
                pass
    return values


@dataclass
class ProbeState:
    messages: int = 0
    kafka_errors: int = 0
    decode_failures: int = 0
    xml_documents: int = 0
    xml_parse_failures: int = 0
    loading_messages: int = 0
    loading_records: int = 0
    coach_loading_records: int = 0
    whole_train_loading_records: int = 0
    numeric_loading_records: int = 0
    numeric_values_seen: int = 0
    element_types: collections.Counter[str] = field(default_factory=collections.Counter)
    rid_to_toc: dict[str, str] = field(default_factory=dict)
    services_seen: set[str] = field(default_factory=set)
    loading_services: set[str] = field(default_factory=set)
    coach_loading_services: set[str] = field(default_factory=set)
    loading_records_by_rid: collections.Counter[str] = field(default_factory=collections.Counter)
    coach_records_by_rid: collections.Counter[str] = field(default_factory=collections.Counter)

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

        loading_nodes = [node for node in root.iter() if is_loading_element(node)]
        if not loading_nodes:
            return
        self.loading_messages += 1
        for node in loading_nodes:
            rid, toc = self._identity_for(node, parent)
            self.loading_records += 1
            coach = has_coach_hint(node)
            values = numeric_loading_values(node)
            if values:
                self.numeric_loading_records += 1
                self.numeric_values_seen += len(values)
            if coach:
                self.coach_loading_records += 1
            else:
                self.whole_train_loading_records += 1
            if rid:
                self.services_seen.add(rid)
                self.loading_services.add(rid)
                self.loading_records_by_rid[rid] += 1
                if coach:
                    self.coach_loading_services.add(rid)
                    self.coach_records_by_rid[rid] += 1
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

    def report(self, *, started_at: str, finished_at: str, sample_seconds: int) -> dict[str, Any]:
        service_groups: collections.defaultdict[str, set[str]] = collections.defaultdict(set)
        loading_groups: collections.defaultdict[str, set[str]] = collections.defaultdict(set)
        coach_groups: collections.defaultdict[str, set[str]] = collections.defaultdict(set)
        record_groups: collections.Counter[str] = collections.Counter()
        coach_record_groups: collections.Counter[str] = collections.Counter()

        for rid in self.services_seen:
            operator = self.rid_to_toc.get(rid, UNKNOWN_OPERATOR)
            service_groups[operator].add(rid)
        for rid in self.loading_services:
            operator = self.rid_to_toc.get(rid, UNKNOWN_OPERATOR)
            loading_groups[operator].add(rid)
            record_groups[operator] += self.loading_records_by_rid[rid]
        for rid in self.coach_loading_services:
            operator = self.rid_to_toc.get(rid, UNKNOWN_OPERATOR)
            coach_groups[operator].add(rid)
            coach_record_groups[operator] += self.coach_records_by_rid[rid]

        operators: dict[str, Any] = {}
        for operator in sorted(set(service_groups) | set(loading_groups)):
            observed = len(service_groups[operator])
            loaded = len(loading_groups[operator])
            coach_loaded = len(coach_groups[operator])
            operators[operator] = {
                "services_observed": observed,
                "services_with_loading": loaded,
                "sampled_service_loading_coverage": round(loaded / observed, 4) if observed else None,
                "services_with_coach_loading": coach_loaded,
                "coach_share_of_loaded_services": round(coach_loaded / loaded, 4) if loaded else None,
                "loading_records": int(record_groups[operator]),
                "coach_loading_records": int(coach_record_groups[operator]),
            }

        observed = len(self.services_seen)
        loaded = len(self.loading_services)
        coach_loaded = len(self.coach_loading_services)
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
                "messages_with_loading": self.loading_messages,
                "loading_records": self.loading_records,
                "coach_loading_records": self.coach_loading_records,
                "whole_train_loading_records": self.whole_train_loading_records,
                "numeric_loading_records": self.numeric_loading_records,
                "numeric_values_seen": self.numeric_values_seen,
                "services_observed": observed,
                "services_with_loading": loaded,
                "sampled_service_loading_coverage": round(loaded / observed, 4) if observed else None,
                "services_with_coach_loading": coach_loaded,
                "coach_share_of_loaded_services": round(coach_loaded / loaded, 4) if loaded else None,
                "denominator_note": "Coverage is distinct service RIDs observed in this sample window, not every train running on the network.",
                "operators": operators,
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


def run_probe(seconds: int, output: Path) -> dict[str, Any]:
    try:
        from confluent_kafka import Consumer  # type: ignore
    except Exception as exc:
        raise RuntimeError("confluent-kafka is required for live probing") from exc

    settings = config_from_env()
    topic = settings.pop("topic")
    state = ProbeState()
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
    print(f"Darwin loading probe: {report['messages']['kafka_messages']} Kafka messages")
    print(f"Services observed: {loading['services_observed']}")
    print(f"Services with loading: {loading['services_with_loading']}")
    print(f"Coach-level services: {loading['services_with_coach_loading']}")
    print(f"Sampled loading coverage: {loading['sampled_service_loading_coverage']}")
    for operator, row in sorted(loading["operators"].items()):
        print(
            f"  {operator}: {row['services_with_loading']}/{row['services_observed']} loaded; "
            f"coach={row['services_with_coach_loading']}"
        )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seconds", type=int, default=480, help="Live sample duration in seconds")
    parser.add_argument("--output", type=Path, default=Path("darwin-loading-report.json"))
    args = parser.parse_args()
    if not 30 <= args.seconds <= 1800:
        parser.error("--seconds must be between 30 and 1800")
    try:
        report = run_probe(args.seconds, args.output)
    except Exception as exc:
        print(f"probe failed: {exc}", file=sys.stderr)
        return 1
    print_summary(report)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
