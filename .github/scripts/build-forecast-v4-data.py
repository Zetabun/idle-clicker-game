#!/usr/bin/env python3
"""Build Kerbside Forecast v4's official demand dataset.

Usage:
  python3 .github/scripts/build-forecast-v4-data.py \
    rai0212.ods rai0213.ods rai0214.ods rai0215.ods rai0216.ods \
    orr-station-usage.csv kerbside-rail-demand-v4.js

Sources:
  DfT RAI0212/0213 - peak capacity, critical load and crowding by city/station
  DfT RAI0214/0215 - peak crowding by operator and city/station
  DfT RAI0216      - empirical peak overall-utilisation distribution
  ORR Table 1410   - annual station entries/exits/interchanges and main OD

DfT and ORR public statistics are reused under the Open Government Licence v3.
The generated file contains aggregate railway statistics only; no personal data.
"""
from __future__ import annotations

import csv
import json
import math
import re
import sys
import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET

YEAR='2025'
RELEASED='2026-07-28'
ORR_PERIOD='2024-25'
NS={'table':'urn:oasis:names:tc:opendocument:xmlns:table:1.0','text':'urn:oasis:names:tc:opendocument:xmlns:text:1.0'}
T=NS['table']

LONDON_CRS={
  'elephant and castle (for blackfriars)':'EPH',
  'euston':'EUS','fenchurch street':'FST',"king's cross":'KGX','kings cross':'KGX',
  'liverpool street':'LST','london bridge':'LBG','marylebone':'MYB','moorgate':'MOG',
  'paddington':'PAD','st pancras international':'STP','st. pancras international':'STP',
  'victoria':'VIC','waterloo':'WAT','vauxhall (for waterloo)':'VXH',
}
LOAD_CENTRES=[.05,.15,.25,.35,.45,.55,.65,.75,.85,.95,1.05,1.15,1.25]
LOAD_THRESHOLDS={'moderate':.32,'busy':.64,'veryBusy':.99}


def cell_text(cell):
    parts=[]
    for p in cell.findall('.//text:p',NS):
        value=''.join(p.itertext()).strip()
        if value: parts.append(value)
    return ' '.join(parts)


def sheet_rows(path:Path,sheet_name:str):
    with zipfile.ZipFile(path) as z: root=ET.fromstring(z.read('content.xml'))
    sheet=next((s for s in root.findall('.//table:table',NS) if s.attrib.get('{%s}name'%T)==sheet_name),None)
    if sheet is None: raise SystemExit(f'{path}: sheet {sheet_name!r} not found')
    rows=[]
    for row in sheet.findall('table:table-row',NS):
        values=[]
        for cell in row.findall('table:table-cell',NS):
            repeat=min(int(cell.attrib.get('{%s}number-columns-repeated'%T,'1')),60)
            values.extend([cell_text(cell)]*repeat)
        while values and not values[-1]: values.pop()
        if values: rows.append(values)
    return rows


def integer(value):
    raw=str(value or '').strip()
    if not raw or raw.startswith('['): return None
    m=re.search(r'-?\d[\d,]*',raw)
    return int(m.group(0).replace(',','')) if m else None


def percent(value):
    raw=str(value or '').strip()
    if not raw or raw.startswith('['): return None
    m=re.search(r'-?\d+(?:\.\d+)?',raw)
    return float(m.group(0))/100 if m else None


def norm(value):
    return re.sub(r'[^a-z0-9]+',' ',str(value or '').lower()).strip()


def compact(d):
    return {k:v for k,v in d.items() if v is not None}


def parse_peak(path:Path,sheet_name:str,entity_col:str,station=False):
    rows=sheet_rows(path,sheet_name)
    header=next((r for r in rows if r and r[0]=='Year' and entity_col in r),None)
    if not header: raise SystemExit(f'{path}: expected header not found')
    ix={name:i for i,name in enumerate(header)}
    required=['Year',entity_col,'Peak','Type of peak','Service provision - Number of services','Service provision - Standard class seats']
    for name in required:
        if name not in ix: raise SystemExit(f'{path}: missing {name}')
    def col_starts(prefix):
        return next((i for i,name in enumerate(header) if str(name).startswith(prefix)),None)
    capacity_i=col_starts('Service provision - Standard class capacity')
    critical_i=col_starts('Standard class critical load')
    pixc_pct_i=next((i for i,name in enumerate(header) if 'Passengers in excess of capacity (PiXC)' in str(name) and ('Per cent' in str(name) or '[note 3]' in str(name)) and 'Number' not in str(name)),None)
    standing_pct_i=next((i for i,name in enumerate(header) if str(name).startswith('Passengers standing') and ('Per cent' in str(name) or '[note' in str(name)) and 'Number' not in str(name)),None)
    svc_pixc_pct_i=next((i for i,name in enumerate(header) if str(name).startswith('Services with PiXC') and ('Per cent' in str(name) or '[note' in str(name)) and 'Number' not in str(name)),None)
    svc_stand_pct_i=next((i for i,name in enumerate(header) if str(name).startswith('Services with passengers standing') and ('Per cent' in str(name) or '[note' in str(name)) and 'Number' not in str(name)),None)
    out={}
    for row in rows:
        if not row or not str(row[0]).startswith(YEAR) or len(row)<=max(ix[entity_col],ix['Type of peak']): continue
        if str(row[ix['Type of peak']]).strip().lower()!='3 hour peak': continue
        entity=str(row[ix[entity_col]]).strip()
        if entity.lower()=='london total' and station: continue
        key=LONDON_CRS.get(norm(entity),entity) if station else entity
        if station and key==entity: raise SystemExit(f'{path}: unmapped 2025 London station {entity!r}')
        peak='am' if 'AM ' in str(row[ix['Peak']]) else 'pm' if 'PM ' in str(row[ix['Peak']]) else ''
        if not peak: continue
        def val(i,fn): return fn(row[i]) if i is not None and i<len(row) else None
        record=compact({
          'services':val(ix['Service provision - Number of services'],integer),
          'seats':val(ix['Service provision - Standard class seats'],integer),
          'capacity':val(capacity_i,integer),'critical':val(critical_i,integer),
          'pixc':val(pixc_pct_i,percent),'standing':val(standing_pct_i,percent),
          'servicesPixc':val(svc_pixc_pct_i,percent),'servicesStanding':val(svc_stand_pct_i,percent),
        })
        out.setdefault(key,{'name':entity})[peak]=record
    return out


def parse_operator(path:Path,sheet_name:str,entity_col:str,station=False):
    rows=sheet_rows(path,sheet_name)
    header=next((r for r in rows if r and r[0]=='Year' and entity_col in r and 'Train operator' in r),None)
    if not header: raise SystemExit(f'{path}: operator header not found')
    out={}
    for row in rows:
        if len(row)<9 or not str(row[0]).startswith(YEAR): continue
        entity=str(row[1]).strip(); operator=str(row[2]).strip()
        if station:
            key=LONDON_CRS.get(norm(entity))
            if not key:
                if norm(entity)=='london total': continue
                raise SystemExit(f'{path}: unmapped 2025 London operator station {entity!r}')
        else: key=entity
        opkey='_total' if norm(operator)=='total' else norm(operator)
        rec={
          'name':operator,
          'am':compact({'services':integer(row[3]),'pixc':percent(row[4]),'standing':percent(row[5])}),
          'pm':compact({'services':integer(row[6]),'pixc':percent(row[7]),'standing':percent(row[8])}),
        }
        out.setdefault(key,{'name':entity,'operators':{}})['operators'][opkey]=rec
    return out


def parse_utilisation(path:Path):
    rows=sheet_rows(path,'RAI0216')
    header=next((r for r in rows if r and r[0]=='Year' and 'Utilisation rate' in r),None)
    if not header: raise SystemExit(f'{path}: utilisation header not found')
    groups={'london':2,'longDistance':3,'regional':4,'all':5}
    counts={k:[] for k in groups}; labels=[]
    for row in rows:
        if len(row)<6 or str(row[0]).strip()!=YEAR: continue
        labels.append(str(row[1]).strip())
        for key,i in groups.items(): counts[key].append(integer(row[i]) or 0)
    if len(labels)!=13: raise SystemExit(f'{path}: expected 13 utilisation bands, got {len(labels)}')
    priors={}; means={}
    for key,values in counts.items():
        cats=[0,0,0,0]; total=sum(values)
        for n,centre in zip(values,LOAD_CENTRES):
            idx=0 if centre<LOAD_THRESHOLDS['moderate'] else 1 if centre<LOAD_THRESHOLDS['busy'] else 2 if centre<LOAD_THRESHOLDS['veryBusy'] else 3
            cats[idx]+=n
        priors[key]=[round(v/total,6) if total else .25 for v in cats]
        means[key]=round(sum(n*c for n,c in zip(values,LOAD_CENTRES))/total,6) if total else None
    return {'labels':labels,'centres':LOAD_CENTRES,'counts':counts,'priors':priors,'means':means}


def parse_orr(path:Path):
    with path.open(encoding='utf-8-sig',newline='') as f: rows=list(csv.reader(f))
    hi=next((i for i,row in enumerate(rows) if row and row[0].strip()=='Station name'),None)
    if hi is None: raise SystemExit(f'{path}: ORR station header not found')
    header=[str(v).strip().replace('\n',' ') for v in rows[hi]]
    def col(prefix):
        return next((i for i,name in enumerate(header) if name.startswith(prefix)),None)
    idx={
      'name':0,'usage':col('Entries and exits: All tickets'),'rank':col('Entries and exits: Rank'),
      'interchanges':col('Interchanges'),'main':col('Main origin or destination station'),
      'mainJourneys':col('Number of journeys to or from main origin or destination station'),
      'tlc':col('Three Letter Code'),'region':col('Region'),'sfo':col('Station facility owner')
    }
    if any(v is None for v in idx.values()): raise SystemExit(f'{path}: ORR columns changed: {idx}')
    raw=[]
    for row in rows[hi+1:]:
        if len(row)<=idx['tlc']: continue
        tlc=str(row[idx['tlc']]).strip().upper()
        if not re.fullmatch(r'[A-Z0-9]{3}',tlc): continue
        raw.append({'name':row[idx['name']].strip(),'usage':integer(row[idx['usage']]) or 0,'rank':integer(row[idx['rank']]),'interchanges':integer(row[idx['interchanges']]) or 0,'mainName':row[idx['main']].strip(),'mainJourneys':integer(row[idx['mainJourneys']]) or 0,'tlc':tlc,'region':row[idx['region']].strip(),'sfo':row[idx['sfo']].strip()})
    by_name={norm(r['name']):r['tlc'] for r in raw}
    n=max(1,len(raw)-1); out={}
    for r in raw:
        rank=r['rank'] or len(raw)
        out[r['tlc']]=compact({'name':r['name'],'usage':r['usage'],'rank':rank,'percentile':round(max(0,min(1,1-(rank-1)/n)),6),'interchanges':r['interchanges'],'mainName':r['mainName'],'mainCrs':by_name.get(norm(r['mainName'])),'mainJourneys':r['mainJourneys'],'region':r['region'],'sfo':r['sfo']})
    if len(out)<2400: raise SystemExit(f'{path}: only {len(out)} ORR stations parsed')
    return out


def js(value): return json.dumps(value,ensure_ascii=False,separators=(',',':'),sort_keys=True)


def main():
    if len(sys.argv)!=8:
        print(__doc__.strip(),file=sys.stderr); return 2
    p=[Path(v) for v in sys.argv[1:]]
    city_peak=parse_peak(p[0],'RAI0212','City')
    station_peak=parse_peak(p[1],'RAI0213','Station',True)
    city_operator=parse_operator(p[2],'RAI0214','City')
    station_operator=parse_operator(p[3],'RAI0215','Station',True)
    utilisation=parse_utilisation(p[4])
    stations=parse_orr(p[5])
    output=p[6]
    if len(city_peak)<10 or len(station_peak)<10 or len(city_operator)<10 or len(station_operator)<10:
        raise SystemExit('Official DfT dataset unexpectedly sparse')
    text=f"""/* Generated from official DfT 2025 rail crowding and ORR 2024-25 station-usage data.\n * DfT published {RELEASED}; ORR period {ORR_PERIOD}; Open Government Licence v3.0.\n * Rebuild with .github/scripts/build-forecast-v4-data.py.\n */\n(function(){{\n'use strict';\nconst YEAR=2025,RELEASED='{RELEASED}',ORR_PERIOD='{ORR_PERIOD}';\nconst CITY_PEAK={js(city_peak)};\nconst STATION_PEAK={js(station_peak)};\nconst CITY_OPERATOR={js(city_operator)};\nconst STATION_OPERATOR={js(station_operator)};\nconst UTILISATION={js(utilisation)};\nconst STATIONS={js(stations)};\nconst norm=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();\nfunction station(crs){{return STATIONS[String(crs||'').toUpperCase()]||null;}}\nfunction cityPeak(city){{return CITY_PEAK[String(city||'')]||null;}}\nfunction stationPeak(crs){{return STATION_PEAK[String(crs||'').toUpperCase()]||null;}}\nfunction cityOperator(city){{return CITY_OPERATOR[String(city||'')]||null;}}\nfunction stationOperator(crs){{return STATION_OPERATOR[String(crs||'').toUpperCase()]||null;}}\nwindow.__KERBSIDE_RAIL_DEMAND_V4__={{year:YEAR,released:RELEASED,orrPeriod:ORR_PERIOD,cityPeak,stationPeak,cityOperator,stationOperator,station,norm,utilisation:UTILISATION,stations:STATIONS,cityPeaks:CITY_PEAK,stationPeaks:STATION_PEAK,cityOperators:CITY_OPERATOR,stationOperators:STATION_OPERATOR}};\n}})();\n"""
    output.write_text(text,encoding='utf-8')
    print(json.dumps({'cities':len(city_peak),'londonStations':len(station_peak),'cityOperatorAreas':len(city_operator),'stationOperatorAreas':len(station_operator),'orrStations':len(stations),'utilisationBands':len(utilisation['labels']),'output':str(output)},indent=2))
    return 0

if __name__=='__main__': raise SystemExit(main())
