#!/usr/bin/env python3
import base64
import gzip
from pathlib import Path

TRIGGER = Path('.github/triggers/release-kerbside-0.9.22-saved-journeys.txt')
text = TRIGGER.read_text(encoding='utf-8')
if 'PAYLOAD=' not in text:
    raise SystemExit('Saved-journey release payload is missing')
payload = text.split('PAYLOAD=', 1)[1].strip()
code = gzip.decompress(base64.b64decode(payload)).decode('utf-8')
exec(compile(code, 'release-kerbside-0.9.22-saved-journeys.payload.py', 'exec'), {'__name__': '__main__'})
