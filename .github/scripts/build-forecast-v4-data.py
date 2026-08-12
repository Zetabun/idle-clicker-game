#!/usr/bin/env python3
"""Build Kerbside Forecast v4's official demand dataset.

Usage:
  python3 .github/scripts/build-forecast-v4-data.py \
    rai0212.ods rai0213.ods rai0214.ods rai0215.ods rai0216.ods \
    orr-station-usage.csv kerbside-rail-demand-v4.js

Sources are DfT RAI0212-RAI0216 (2025) and ORR Table 1410 (2024-25).
Both publishers make these public statistics reusable under the Open
Government Licence v3. The generated bundle contains aggregate railway
statistics only; no personal data.
"""
from __future__ import annotations
import csv,json,re,sys,zipfile
from pathlib import Path
import xml.etree.ElementTree as ET

YEAR='2025'; RELEASED='2026-07-28'; ORR_PERIOD='2024-25'
NS={'table':'urn:oasis:names:tc:opendocument:xmlns:table:1.0','text':'urn:oasis:names:tc:opendocument:xmlns:text:1.0'}; T=NS['table']
LONDON_CRS={'elephant and castle for blackfriars':'EPH','euston':'EUS','fenchurch street':'FST','king s cross':'KGX','kings cross':'KGX','liverpool street':'LST','london bridge':'LBG','marylebone':'MYB','moorgate':'MOG','paddington':'PAD','st pancras international':'STP','victoria':'VIC','waterloo':'WAT','vauxhall for waterloo':'VXH'}
LOAD_CENTRES=[.05,.15,.25,.35,.45,.55,.65,.75,.85,.95,1.05,1.15,1.25]
THRESH={'moderate':.32,'busy':.64,'veryBusy':.99}

def norm(v): return re.sub(r'[^a-z0-9]+',' ',str(v or '').lower()).strip()
def cell_text(c): return ' '.join(x for x in (''.join(p.itertext()).strip() for p in c.findall('.//text:p',NS)) if x)
def rows(path,sheet_name):
    with zipfile.ZipFile(path) as z: root=ET.fromstring(z.read('content.xml'))
    sheet=next((s for s in root.findall('.//table:table',NS) if s.attrib.get('{%s}name'%T)==sheet_name),None)
    if sheet is None: raise SystemExit(f'{path}: sheet {sheet_name} not found')
    out=[]
    for row in sheet.findall('table:table-row',NS):
        vals=[]
        for c in row.findall('table:table-cell',NS): vals += [cell_text(c)]*min(int(c.attrib.get('{%s}number-columns-repeated'%T,'1')),60)
        while vals and not vals[-1]: vals.pop()
        if vals: out.append(vals)
    return out

def integer(v):
    raw=str(v or '').strip()
    if not raw or raw.startswith('['): return None
    m=re.search(r'-?\d[\d,]*',raw); return int(m.group(0).replace(',','')) if m else None

def percent(v):
    raw=str(v or '').strip()
    if not raw or raw.startswith('['): return None
    m=re.search(r'-?\d+(?:\.\d+)?',raw); return float(m.group(0))/100 if m else None

def compact(d): return {k:v for k,v in d.items() if v is not None}
def find_col(header,prefix,contains=()):
    prefix=norm(prefix); contains=[norm(x) for x in contains]
    for i,name in enumerate(header):
        n=norm(name)
        if n.startswith(prefix) and all(x in n for x in contains): return i
    return None

def parse_peak(path,sheet,entity_name,station=False):
    rs=rows(path,sheet); h=next((r for r in rs if r and norm(r[0])=='year' and any(norm(x)==norm(entity_name) for x in r)),None)
    if not h: raise SystemExit(f'{path}: peak header not found')
    year_i=0; entity_i=next(i for i,x in enumerate(h) if norm(x)==norm(entity_name)); peak_i=find_col(h,'Peak'); type_i=find_col(h,'Type of peak')
    services_i=find_col(h,'Service provision Number of services'); seats_i=find_col(h,'Service provision Standard class seats'); capacity_i=find_col(h,'Service provision Standard class capacity'); critical_i=find_col(h,'Standard class critical load')
    pixc_i=next((i for i,x in enumerate(h) if 'passengers in excess of capacity pixc' in norm(x) and 'number' not in norm(x)),None)
    standing_i=next((i for i,x in enumerate(h) if norm(x).startswith('passengers standing') and 'number' not in norm(x)),None)
    svc_pixc_i=next((i for i,x in enumerate(h) if norm(x).startswith('services with pixc') and 'number' not in norm(x)),None)
    svc_stand_i=next((i for i,x in enumerate(h) if norm(x).startswith('services with passengers standing') and 'number' not in norm(x)),None)
    required={'peak':peak_i,'type':type_i,'services':services_i,'seats':seats_i}
    if any(v is None for v in required.values()): raise SystemExit(f'{path}: required peak columns missing {required}')
    out={}
    for r in rs:
        if len(r)<=max(entity_i,type_i) or not str(r[year_i]).startswith(YEAR) or norm(r[type_i])!='3 hour peak': continue
        entity=str(r[entity_i]).strip(); en=norm(entity)
        if station and en=='london total': continue
        key=LONDON_CRS.get(en) if station else entity
        if station and not key: raise SystemExit(f'{path}: unmapped London station {entity!r}')
        peak='am' if 'am peak' in norm(r[peak_i]) else 'pm' if 'pm peak' in norm(r[peak_i]) else ''
        if not peak: continue
        def get(i,fn): return fn(r[i]) if i is not None and i<len(r) else None
        rec=compact({'services':get(services_i,integer),'seats':get(seats_i,integer),'capacity':get(capacity_i,integer),'critical':get(critical_i,integer),'pixc':get(pixc_i,percent),'standing':get(standing_i,percent),'servicesPixc':get(svc_pixc_i,percent),'servicesStanding':get(svc_stand_i,percent)})
        out.setdefault(key,{'name':entity})[peak]=rec
    return out

def parse_operator(path,sheet,entity_name,station=False):
    rs=rows(path,sheet); h=next((r for r in rs if r and norm(r[0])=='year' and any(norm(x)==norm(entity_name) for x in r) and any(norm(x)=='train operator' for x in r)),None)
    if not h: raise SystemExit(f'{path}: operator header not found')
    entity_i=next(i for i,x in enumerate(h) if norm(x)==norm(entity_name)); op_i=next(i for i,x in enumerate(h) if norm(x)=='train operator')
    am_services=find_col(h,'AM peak arrivals',('number of services',)); am_pixc=find_col(h,'AM peak arrivals',('pixc',)); am_stand=find_col(h,'AM peak arrivals',('passengers standing',))
    pm_services=find_col(h,'PM peak departures',('number of services',)); pm_pixc=find_col(h,'PM peak departures',('pixc',)); pm_stand=find_col(h,'PM peak departures',('passengers standing',))
    cols=[am_services,am_pixc,am_stand,pm_services,pm_pixc,pm_stand]
    if any(v is None for v in cols): raise SystemExit(f'{path}: operator columns changed {cols}')
    out={}
    for r in rs:
        if len(r)<=max(cols+[entity_i,op_i]) or not str(r[0]).startswith(YEAR): continue
        entity=str(r[entity_i]).strip(); en=norm(entity)
        if station:
            if en=='london total': continue
            key=LONDON_CRS.get(en)
            if not key: raise SystemExit(f'{path}: unmapped London operator station {entity!r}')
        else: key=entity
        operator=str(r[op_i]).strip(); opkey='_total' if norm(operator)=='total' else norm(operator)
        out.setdefault(key,{'name':entity,'operators':{}})['operators'][opkey]={'name':operator,'am':compact({'services':integer(r[am_services]),'pixc':percent(r[am_pixc]),'standing':percent(r[am_stand])}),'pm':compact({'services':integer(r[pm_services]),'pixc':percent(r[pm_pixc]),'standing':percent(r[pm_stand])})}
    return out

def parse_util(path):
    rs=rows(path,'RAI0216'); h=next((r for r in rs if r and norm(r[0])=='year' and any(norm(x)=='utilisation rate' for x in r)),None)
    if not h: raise SystemExit(f'{path}: utilisation header not found')
    groups={'london':2,'longDistance':3,'regional':4,'all':5}; counts={k:[] for k in groups}; labels=[]
    for r in rs:
        if len(r)<6 or str(r[0]).strip()!=YEAR: continue
        labels.append(str(r[1]).strip())
        for k,i in groups.items(): counts[k].append(integer(r[i]) or 0)
    if len(labels)!=13: raise SystemExit(f'{path}: expected 13 utilisation bands, got {len(labels)}')
    priors={}; means={}
    for k,vals in counts.items():
        cats=[0,0,0,0]; total=sum(vals)
        for n,c in zip(vals,LOAD_CENTRES):
            q=0 if c<THRESH['moderate'] else 1 if c<THRESH['busy'] else 2 if c<THRESH['veryBusy'] else 3; cats[q]+=n
        priors[k]=[round(x/total,6) if total else .25 for x in cats]; means[k]=round(sum(n*c for n,c in zip(vals,LOAD_CENTRES))/total,6) if total else None
    return {'labels':labels,'centres':LOAD_CENTRES,'counts':counts,'priors':priors,'means':means}

def parse_orr(path):
    with path.open(encoding='utf-8-sig',newline='') as f: rs=list(csv.reader(f))
    hi=next((i for i,r in enumerate(rs) if r and norm(r[0])=='station name'),None)
    if hi is None: raise SystemExit(f'{path}: ORR header not found')
    h=[re.sub(r'\s+',' ',str(x).strip()) for x in rs[hi]]
    def col(parts):
        parts=[norm(x) for x in parts]
        return next((i for i,x in enumerate(h) if all(p in norm(x) for p in parts)),None)
    idx={'name':0,'usage':col(['entries and exits','all tickets']),'rank':col(['entries and exits','rank']),'interchanges':col(['interchanges']),'main':col(['main origin or destination station']),'mainJourneys':col(['number of journeys to or from main origin']),'tlc':col(['three letter code']),'region':col(['region']),'sfo':col(['station facility owner'])}
    if any(v is None for v in idx.values()): raise SystemExit(f'{path}: ORR columns changed {idx}')
    raw=[]
    for r in rs[hi+1:]:
        if len(r)<=max(idx.values()): continue
        tlc=str(r[idx['tlc']]).strip().upper()
        if not re.fullmatch(r'[A-Z0-9]{3}',tlc): continue
        raw.append({'name':r[idx['name']].strip(),'usage':integer(r[idx['usage']]) or 0,'rank':integer(r[idx['rank']]),'interchanges':integer(r[idx['interchanges']]) or 0,'mainName':r[idx['main']].strip(),'mainJourneys':integer(r[idx['mainJourneys']]) or 0,'tlc':tlc,'region':r[idx['region']].strip(),'sfo':r[idx['sfo']].strip()})
    if len(raw)<2400: raise SystemExit(f'{path}: only {len(raw)} stations parsed')
    by_name={norm(r['name']):r['tlc'] for r in raw}; denom=max(1,len(raw)-1); out={}
    for r in raw:
        rank=r['rank'] or len(raw); out[r['tlc']]=compact({'name':r['name'],'usage':r['usage'],'rank':rank,'percentile':round(max(0,min(1,1-(rank-1)/denom)),6),'interchanges':r['interchanges'],'mainName':r['mainName'],'mainCrs':by_name.get(norm(r['mainName'])),'mainJourneys':r['mainJourneys'],'region':r['region'],'sfo':r['sfo']})
    return out

def js(v): return json.dumps(v,ensure_ascii=False,separators=(',',':'),sort_keys=True)
def main():
    if len(sys.argv)!=8: print(__doc__.strip(),file=sys.stderr); return 2
    p=[Path(x) for x in sys.argv[1:]]
    city_peak=parse_peak(p[0],'RAI0212','City'); station_peak=parse_peak(p[1],'RAI0213','Station',True); city_op=parse_operator(p[2],'RAI0214','City'); station_op=parse_operator(p[3],'RAI0215','Station',True); util=parse_util(p[4]); stations=parse_orr(p[5]); output=p[6]
    if min(len(city_peak),len(station_peak),len(city_op),len(station_op))<10: raise SystemExit('Official DfT data unexpectedly sparse')
    text=f"""/* Generated from DfT 2025 rail crowding + ORR 2024-25 station usage.\n * Open Government Licence v3. Rebuild with build-forecast-v4-data.py. */\n(function(){{'use strict';\nconst YEAR=2025,RELEASED='{RELEASED}',ORR_PERIOD='{ORR_PERIOD}';\nconst CITY_PEAK={js(city_peak)},STATION_PEAK={js(station_peak)},CITY_OPERATOR={js(city_op)},STATION_OPERATOR={js(station_op)},UTILISATION={js(util)},STATIONS={js(stations)};\nconst norm=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();\nconst station=crs=>STATIONS[String(crs||'').toUpperCase()]||null,cityPeak=city=>CITY_PEAK[String(city||'')]||null,stationPeak=crs=>STATION_PEAK[String(crs||'').toUpperCase()]||null,cityOperator=city=>CITY_OPERATOR[String(city||'')]||null,stationOperator=crs=>STATION_OPERATOR[String(crs||'').toUpperCase()]||null;\nwindow.__KERBSIDE_RAIL_DEMAND_V4__={{year:YEAR,released:RELEASED,orrPeriod:ORR_PERIOD,norm,station,cityPeak,stationPeak,cityOperator,stationOperator,utilisation:UTILISATION,stations:STATIONS,cityPeaks:CITY_PEAK,stationPeaks:STATION_PEAK,cityOperators:CITY_OPERATOR,stationOperators:STATION_OPERATOR}};\n}})();\n"""; output.write_text(text,encoding='utf-8')
    print(json.dumps({'cities':len(city_peak),'londonStations':len(station_peak),'cityOperatorAreas':len(city_op),'stationOperatorAreas':len(station_op),'orrStations':len(stations),'utilisationBands':len(util['labels']),'output':str(output)},indent=2)); return 0
if __name__=='__main__': raise SystemExit(main())
