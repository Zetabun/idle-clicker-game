#!/usr/bin/env python3
"""Build Kerbside's compact roadworks and disruption feed.

Reads the Department for Transport Bus Open Data Service SIRI-SX bulk archive and
writes `disruptions.json` for `bus.html`. The archive needs no API key, but it is a
single national XML download that sends no CORS header, so it cannot be fetched
from the browser. This script runs in GitHub Actions and publishes a small
same-origin copy alongside the app on GitHub Pages.

The output carries an ATCO stop index so the browser can match a disruption to a
route by exact stop code rather than by line name. Line names are not unique: most
are shared by several operators nationally, so name matching alone produces
alerts from the wrong end of the country.

Even when the disruption content is unchanged, the feed is republished at least
once per HEARTBEAT_HOURS. The browser deliberately rejects an old build, so a
fresh build timestamp is part of the feed's health rather than meaningless churn.
"""
import gzip
import json
import os
import re
import sys
import time
import urllib.request
import zipfile
from datetime import datetime, timedelta, timezone
from io import BytesIO

SOURCE = 'https://data.bus-data.dft.gov.uk/disruptions/download/bulk_archive'
OUTPUT = 'disruptions.json'
FORMAT_VERSION = 1

# Situations that ended before now are dropped. The archive contains a sizeable
# expired tail, and `<Progress>open</Progress>` does not mean currently active.
# Future ones are kept briefly so the app can show upcoming planned closures.
FUTURE_HORIZON_DAYS = 7
# The browser currently accepts a disruption build for 24 hours. Publish a much
# shorter heartbeat so an unchanged archive cannot age out silently.
HEARTBEAT_HOURS = 6
SUMMARY_MAX = 180
DETAIL_MAX = 400
MAX_STOPS_PER_SITUATION = 400

UA = 'Kerbside-disruptions-build/1.1 (+https://zetabun.github.io/idle-clicker-game/bus.html)'


def is_zip_payload(payload):
    return isinstance(payload, (bytes, bytearray)) and payload.startswith(
        (b'PK\x03\x04', b'PK\x05\x06', b'PK\x07\x08'))


def fetch(url, attempts=5):
    last = None
    request = urllib.request.Request(url, headers={'User-Agent': UA})
    for attempt in range(attempts):
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                payload = response.read()
                content_type = str(response.headers.get('Content-Type') or '')
            if is_zip_payload(payload):
                return payload
            preview = re.sub(rb'\s+', b' ', payload[:160]).decode('utf-8', 'replace')
            last = RuntimeError('expected ZIP, received %s (%s)' % (content_type or 'unknown content type', preview))
        except Exception as error:  # noqa: BLE001 - retried below
            last = error
        if attempt + 1 < attempts:
            time.sleep(min(8, 2 ** attempt))
    raise SystemExit('Could not download %s: %s' % (url, last))


def text(source, tag):
    match = re.search('<%s>([^<]*)</%s>' % (tag, tag), source)
    return match.group(1).strip() if match else ''


def unescape(value):
    return (value.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
            .replace('&quot;', '"').replace('&apos;', "'"))


def clean(value, limit):
    value = unescape(re.sub(r'\s+', ' ', value or '')).strip()
    return value[:limit]


def parse_time(value):
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def parse(xml, now):
    horizon = now + timedelta(days=FUTURE_HORIZON_DAYS)
    situations = []
    for block in re.findall(r'<PtSituationElement>.*?</PtSituationElement>', xml, re.S):
        end = parse_time(text(block, 'EndTime'))
        start = parse_time(text(block, 'StartTime'))
        if end and end < now:
            continue
        if start and start > horizon:
            continue
        if text(block, 'Progress') == 'closed':
            continue

        reason = (text(block, 'MiscellaneousReason') or text(block, 'EquipmentReason')
                  or text(block, 'EnvironmentReason') or text(block, 'PersonnelReason'))
        stops = []
        seen = set()
        for code in re.findall(r'<StopPointRef>([^<]+)<', block):
            code = code.strip()
            if code and code not in seen:
                seen.add(code)
                stops.append(code)
        if len(stops) > MAX_STOPS_PER_SITUATION:
            stops = stops[:MAX_STOPS_PER_SITUATION]

        summary = clean(text(block, 'Summary'), SUMMARY_MAX)
        detail = clean(text(block, 'Description') or text(block, 'Details'), DETAIL_MAX)
        if not summary and not detail:
            continue

        situations.append({
            'id': text(block, 'SituationNumber')[:36],
            'reason': reason,
            'severity': text(block, 'Severity'),
            'planned': text(block, 'Planned') == 'true',
            'summary': summary,
            'detail': detail if detail != summary else '',
            'from': text(block, 'StartTime'),
            'to': text(block, 'EndTime'),
            'stops': stops,
            'lines': sorted({clean(name, 24) for name in
                             re.findall(r'<PublishedLineName>([^<]+)<', block) if name.strip()}),
            'operators': sorted({code.strip() for code in
                                 re.findall(r'<OperatorRef>([^<]+)<', block) if code.strip()}),
            'source': text(block, 'ParticipantRef')[:40],
        })
    return situations


def build_index(situations):
    """ATCO stop code -> indices of the situations naming it."""
    index = {}
    for position, situation in enumerate(situations):
        for code in situation['stops']:
            index.setdefault(code, []).append(position)
    return index


def comparable_document(document):
    """Return stable JSON for semantic comparison, excluding build heartbeat."""
    if not isinstance(document, dict):
        return ''
    copy = dict(document)
    copy.pop('built', None)
    return json.dumps(copy, separators=(',', ':'), ensure_ascii=False, sort_keys=True)


def heartbeat_due(previous, now):
    """True when an unchanged checked-in feed needs a fresh build timestamp."""
    if not isinstance(previous, dict):
        return True
    built = parse_time(previous.get('built'))
    if not built:
        return True
    return now - built >= timedelta(hours=HEARTBEAT_HOURS)


def publish_decision(previous, current, now):
    """Return (should_commit, reason) for the generated feed."""
    if not isinstance(previous, dict) or not previous:
        return True, 'initial'
    if comparable_document(previous) != comparable_document(current):
        return True, 'content'
    if heartbeat_due(previous, now):
        return True, 'heartbeat'
    return False, 'unchanged'


def load_previous(path=OUTPUT):
    if not os.path.exists(path):
        return None
    try:
        with open(path, encoding='utf-8') as handle:
            data = json.load(handle)
        return data if isinstance(data, dict) else None
    except Exception:  # noqa: BLE001 - a corrupt previous file is replaced
        return None


def main():
    now = datetime.now(timezone.utc)
    archive = fetch(SOURCE)
    with zipfile.ZipFile(BytesIO(archive)) as bundle:
        names = [name for name in bundle.namelist() if name.lower().endswith('.xml')]
        if not names:
            raise SystemExit('The BODS disruptions archive contained no XML')
        xml = bundle.read(names[0]).decode('utf-8', 'replace')

    total = xml.count('<PtSituationElement>')
    situations = parse(xml, now)
    if total and not situations:
        raise SystemExit('Parsed %d situations from the archive but kept none' % total)

    index = build_index(situations)
    document = {
        'version': FORMAT_VERSION,
        'scope': 'kerbside-disruptions',
        'built': now.replace(microsecond=0).isoformat().replace('+00:00', 'Z'),
        'source': 'Department for Transport Bus Open Data Service (SIRI-SX)',
        'licence': 'Open Government Licence v3.0',
        'published': total,
        'count': len(situations),
        'situations': situations,
        'byStop': index,
    }

    previous = load_previous()
    changed, reason = publish_decision(previous, document, now)
    payload = json.dumps(document, separators=(',', ':'), ensure_ascii=False)

    with open(OUTPUT, 'w', encoding='utf-8', newline='\n') as handle:
        handle.write(payload + '\n')

    raw = len(payload.encode('utf-8'))
    print('published situations in archive : %d' % total)
    print('kept (current or upcoming)      : %d' % len(situations))
    print('distinct affected stop codes    : %d' % len(index))
    print('with stop codes / with lines    : %d / %d'
          % (sum(1 for s in situations if s['stops']),
             sum(1 for s in situations if s['lines'])))
    print('output                          : %.0f KB (%.0f KB gzipped)'
          % (raw / 1024, len(gzip.compress(payload.encode('utf-8'), 9)) / 1024))
    print('publish required                : %s (%s)' % ('yes' if changed else 'no', reason))

    marker = os.environ.get('GITHUB_OUTPUT')
    if marker:
        with open(marker, 'a', encoding='utf-8') as handle:
            handle.write('changed=%s\n' % ('true' if changed else 'false'))
            handle.write('reason=%s\n' % reason)
            handle.write('count=%d\n' % len(situations))
    return 0


if __name__ == '__main__':
    sys.exit(main())
