#!/usr/bin/env python3
"""Regression coverage for the generated Kerbside disruption feed builder."""
from datetime import datetime, timedelta, timezone
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / '.github' / 'scripts' / 'build-disruptions.py'
SPEC = importlib.util.spec_from_file_location('kerbside_build_disruptions', SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(MODULE)

NOW = datetime(2026, 8, 8, 0, 0, tzinfo=timezone.utc)


def document(*, built, count=1, summary='Roadworks'):
    return {
        'version': 1,
        'scope': 'kerbside-disruptions',
        'built': built,
        'source': 'Department for Transport Bus Open Data Service (SIRI-SX)',
        'licence': 'Open Government Licence v3.0',
        'published': count,
        'count': count,
        'situations': [{'id': 'one', 'summary': summary, 'stops': ['1800TEST']}],
        'byStop': {'1800TEST': [0]},
    }


fresh = document(built=(NOW - timedelta(hours=1)).isoformat())
current = document(built=NOW.isoformat())
changed, reason = MODULE.publish_decision(fresh, current, NOW)
assert changed is False and reason == 'unchanged', (changed, reason)

old = document(built=(NOW - timedelta(hours=7)).isoformat())
changed, reason = MODULE.publish_decision(old, current, NOW)
assert changed is True and reason == 'heartbeat', (changed, reason)

changed_content = document(built=NOW.isoformat(), summary='Diversion')
changed, reason = MODULE.publish_decision(fresh, changed_content, NOW)
assert changed is True and reason == 'content', (changed, reason)

missing_timestamp = document(built='')
changed, reason = MODULE.publish_decision(missing_timestamp, current, NOW)
assert changed is True and reason == 'heartbeat', (changed, reason)

changed, reason = MODULE.publish_decision(None, current, NOW)
assert changed is True and reason == 'initial', (changed, reason)

assert MODULE.comparable_document(fresh) == MODULE.comparable_document(current)
assert MODULE.heartbeat_due(old, NOW) is True
assert MODULE.heartbeat_due(fresh, NOW) is False

assert MODULE.is_xml_payload(b'<?xml version="1.0"?><Siri/>') is True
assert MODULE.is_xml_payload(b'<Siri/>') is True
assert MODULE.is_xml_payload(b'<siri:Siri xmlns:siri="x"/>') is True
assert MODULE.is_xml_payload(b'<!DOCTYPE html><title>Problem with the service</title>') is False

namespaced_xml = '''<?xml version="1.0"?>
<siri:Siri xmlns:siri="http://www.siri.org.uk/siri">
  <siri:PtSituationElement>
    <siri:SituationNumber>one</siri:SituationNumber>
    <siri:ParticipantRef>WestofEngland</siri:ParticipantRef>
    <siri:Progress>open</siri:Progress>
    <siri:Planned>true</siri:Planned>
    <siri:Summary>Roadworks</siri:Summary>
    <siri:Description>Road closed</siri:Description>
    <siri:StopPointRef>1800TEST</siri:StopPointRef>
    <siri:PublishedLineName>5</siri:PublishedLineName>
    <siri:OperatorRef>OP</siri:OperatorRef>
  </siri:PtSituationElement>
</siri:Siri>'''
assert len(MODULE.situation_blocks(namespaced_xml)) == 1
parsed = MODULE.parse(namespaced_xml, NOW)
assert len(parsed) == 1
assert parsed[0]['id'] == 'one'
assert parsed[0]['stops'] == ['1800TEST']
assert parsed[0]['lines'] == ['5']
assert parsed[0]['operators'] == ['OP']
assert parsed[0]['source'] == 'WestofEngland'

try:
    MODULE.fetch_api('')
except SystemExit as error:
    assert 'BODS_KEY is required' in str(error)
else:
    raise AssertionError('missing BODS_KEY must fail closed')

print('Kerbside disruption build regression checks passed.')
