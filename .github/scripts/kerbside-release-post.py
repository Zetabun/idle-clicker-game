#!/usr/bin/env python3
from pathlib import Path

path=Path('kerbside-rail-calibration.js')
text=path.read_text(encoding='utf-8')
old="  try{raw=typeof feed.flow==='function'?feed.flow(a,b):(feed.flows&&feed.flows[`${a}|${b}`]??feed.flows&&feed.flows[a]&&feed.flows[a][b]);}catch(error){return null;}"
new="  try{if(typeof feed.flow==='function')raw=feed.flow(a,b);else{const direct=feed.flows&&feed.flows[`${a}|${b}`],nested=feed.flows&&feed.flows[a]&&feed.flows[a][b];raw=direct!=null?direct:nested;}}catch(error){return null;}"
if text.count(old)!=1:
    raise SystemExit('route-load adapter expression not found exactly once')
path.write_text(text.replace(old,new,1),encoding='utf-8')
