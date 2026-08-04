#!/usr/bin/env python3
"""Build Kerbside's stop-attribute shards from the national NaPTAN register.

Reads the Department for Transport NaPTAN CSV and writes `naptan/<area>.json`
beside `bus.html`. NaPTAN needs no API key, but it is a single 101 MB national
CSV, so the browser cannot read it directly. This job runs in GitHub Actions and
publishes small same-origin shards alongside the app on GitHub Pages.

The register carries what the timetable feed does not: which way a bus faces at
a stop, whether there is a pole to wait at, and which stops are timing points.
The first two are the point of the feature — a stop name alone does not tell
somebody they are standing on the wrong side of the road.

Shards are keyed by the first three characters of the ATCO code, which is the
administrative area. That is the natural boundary: sharding on four characters
produces the same 144 files, because the fourth character does not vary within
an area.
"""
import csv
import hashlib
import io
import json
import os
import shutil
import sys
import urllib.request
from datetime import datetime, timezone

SOURCE = 'https://naptan.api.dft.gov.uk/v1/access-nodes?dataFormat=csv'
OUTPUT_DIR = 'naptan'
INDEX = os.path.join(OUTPUT_DIR, 'index.json')
FORMAT_VERSION = 1

# BCT is a roadside bus stop, BCS a bay or stand within a station. Everything
# else in the register is rail, tram, ferry or an entrance node.
BUS_STOP_TYPES = {'BCT', 'BCS'}
PREFIX_LENGTH = 3
STREET_MAX = 40

# MKD (a marked stop with a pole) is the overwhelming majority, so it is the
# implied default and is not stored. The rest change what a passenger must do.
STOP_TYPE_CODES = {'CUS': 'C', 'HAR': 'H', 'FLX': 'F'}

UA = 'Kerbside-naptan-build/1.0 (+https://zetabun.github.io/idle-clicker-game/bus.html)'


def fetch(url, attempts=4):
    last = None
    request = urllib.request.Request(url, headers={'User-Agent': UA})
    for _ in range(attempts):
        try:
            with urllib.request.urlopen(request, timeout=600) as response:
                payload = response.read()
            if payload:
                return payload
        except Exception as error:  # noqa: BLE001 - retried below
            last = error
    raise SystemExit('Could not download %s: %s' % (url, last))


def clean_street(value):
    street = (value or '').strip()
    if not street or street.lower() in {'-', 'n/a', 'na', 'unknown', 'none'}:
        return ''
    return street[:STREET_MAX]


def build_shards(payload):
    text = payload.decode('utf-8-sig', errors='replace')
    reader = csv.DictReader(io.StringIO(text))
    required = {'ATCOCode', 'StopType', 'Status'}
    missing = required - set(reader.fieldnames or ())
    if missing:
        raise SystemExit('NaPTAN CSV is missing columns: %s' % ', '.join(sorted(missing)))

    shards = {}
    kept = 0
    for row in reader:
        if row.get('StopType') not in BUS_STOP_TYPES:
            continue
        if (row.get('Status') or '').strip() != 'active':
            continue
        atco = (row.get('ATCOCode') or '').strip()
        if len(atco) <= PREFIX_LENGTH:
            continue

        record = {}
        bearing = (row.get('Bearing') or '').strip().upper()
        if bearing in {'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'}:
            record['b'] = bearing
        code = STOP_TYPE_CODES.get((row.get('BusStopType') or '').strip())
        if code:
            record['t'] = code
        street = clean_street(row.get('Street'))
        if street:
            record['s'] = street
        if (row.get('TimingStatus') or '').strip() == 'PTP':
            record['p'] = 1

        # A stop with nothing to say is left out entirely; the browser treats a
        # missing entry and an empty one identically.
        if not record:
            continue
        shards.setdefault(atco[:PREFIX_LENGTH], {})[atco] = record
        kept += 1
    return shards, kept


def digest_of(shards):
    """A stable fingerprint of the stop data alone.

    The build timestamp is deliberately excluded: NaPTAN is republished daily
    but stop infrastructure barely moves, and hashing the timestamp in would
    commit an identical register every week.
    """
    hasher = hashlib.sha256()
    for prefix in sorted(shards):
        hasher.update(prefix.encode('utf-8'))
        for atco, record in sorted(shards[prefix].items()):
            hasher.update(atco.encode('utf-8'))
            hasher.update(json.dumps(record, sort_keys=True, separators=(',', ':')).encode('utf-8'))
    return hasher.hexdigest()


def write_shards(shards, built, digest):
    if os.path.isdir(OUTPUT_DIR):
        shutil.rmtree(OUTPUT_DIR)
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    areas = {}
    for prefix in sorted(shards):
        stops = shards[prefix]
        document = {
            'version': FORMAT_VERSION,
            'scope': 'kerbside-naptan',
            'area': prefix,
            'built': built,
            'stops': dict(sorted(stops.items())),
        }
        path = os.path.join(OUTPUT_DIR, '%s.json' % prefix)
        with open(path, 'w', encoding='utf-8', newline='\n') as handle:
            json.dump(document, handle, separators=(',', ':'), sort_keys=False)
            handle.write('\n')
        areas[prefix] = len(stops)

    index = {
        'version': FORMAT_VERSION,
        'scope': 'kerbside-naptan-index',
        'built': built,
        'source': SOURCE,
        'licence': 'Open Government Licence v3.0',
        'prefixLength': PREFIX_LENGTH,
        'digest': digest,
        'count': sum(areas.values()),
        'areas': areas,
    }
    with open(INDEX, 'w', encoding='utf-8', newline='\n') as handle:
        json.dump(index, handle, separators=(',', ':'), sort_keys=False)
        handle.write('\n')
    return index


def emit(name, value):
    target = os.environ.get('GITHUB_OUTPUT')
    if not target:
        return
    with open(target, 'a', encoding='utf-8') as handle:
        handle.write('%s=%s\n' % (name, value))


def main():
    previous = ''
    if os.path.isfile(INDEX):
        try:
            with open(INDEX, encoding='utf-8') as handle:
                previous = str(json.load(handle).get('digest') or '')
        except Exception:  # noqa: BLE001 - a corrupt index just forces a rebuild
            previous = ''

    payload = fetch(SOURCE)
    shards, kept = build_shards(payload)
    if kept < 200000:
        raise SystemExit('Only %d stops survived filtering; refusing to publish a short register.' % kept)

    digest = digest_of(shards)
    count = sum(len(stops) for stops in shards.values())
    if digest == previous:
        print('NaPTAN register is unchanged (%d stops); leaving the published shards alone.' % count)
        emit('count', count)
        emit('areas', len(shards))
        emit('changed', 'false')
        return 0

    built = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    index = write_shards(shards, built, digest)
    print('NaPTAN: %d active bus stops across %d areas' % (index['count'], len(index['areas'])))
    emit('count', index['count'])
    emit('areas', len(index['areas']))
    emit('changed', 'true')
    return 0


if __name__ == '__main__':
    sys.exit(main())
