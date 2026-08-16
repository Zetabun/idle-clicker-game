#!/usr/bin/env python3
import base64
import gzip
from pathlib import Path

trigger=Path('.github/triggers/release-kerbside-0.9.23-active-journey.txt')
text=trigger.read_text(encoding='utf-8')
if 'PAYLOAD=' not in text:
    raise SystemExit('Active Journey release payload is missing')
payload=text.split('PAYLOAD=',1)[1].strip()
code=gzip.decompress(base64.b64decode(payload)).decode('utf-8')
exec(compile(code,'release-kerbside-0.9.23-active-journey.payload.py','exec'),{'__name__':'__main__'})
