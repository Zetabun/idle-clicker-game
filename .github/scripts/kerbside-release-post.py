#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

subprocess.run([sys.executable,'.github/scripts/sync-version.py'],check=True)

path=Path('kerbside-train-timetable.js')
text=path.read_text(encoding='utf-8')
old="const alreadyWatched=typeof api.watchMatches==='function'&&api.watchMatches(service);write(payloadFor(service,{watchOwned:!alreadyWatched}));if(!alreadyWatched)ensureWatch(service);if(typeof api.requestOverlay==='function')api.requestOverlay();sync();return true;"
new="const alreadyWatched=typeof api.watchMatches==='function'&&api.watchMatches(service);write(payloadFor(service,{watchOwned:!alreadyWatched}));if(!alreadyWatched)ensureWatch(service);const sheet=window.__KERBSIDE_JOURNEY_SHEET__;if(sheet&&typeof sheet.close==='function'&&(!sheet.active||sheet.active()))sheet.close();if(typeof api.requestOverlay==='function')api.requestOverlay();sync();return true;"
count=text.count(old)
if count!=1:
    raise SystemExit(f'Expected one Active Journey start sequence, found {count}.')
text=text.replace(old,new,1)
path.write_text(text.rstrip()+'\n',encoding='utf-8')
print('Synchronized Kerbside 0.9.23 version markers, close the mobile journey sheet on Active Journey start, and normalized timetable EOF.')
