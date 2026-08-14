#!/usr/bin/env python3
import argparse, base64, csv, hashlib, json
from collections import defaultdict
from pathlib import Path

DEFAULT_THRESHOLD=25
DEFAULT_TOP_N=5

def put_varint(buf,n):
    n=int(n)
    while n>=128:
        buf.append((n&0x7f)|0x80); n >>= 7
    buf.append(n)

def file_sha256(path):
    h=hashlib.sha256()
    with Path(path).open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):
            h.update(chunk)
    return h.hexdigest()

def build(input_path, output_path, threshold=DEFAULT_THRESHOLD, top_n=DEFAULT_TOP_N, expected_sha256=''):
    input_path=Path(input_path); output_path=Path(output_path)
    digest=file_sha256(input_path)
    if expected_sha256 and digest.lower()!=expected_sha256.lower():
        raise SystemExit(f'ODM SHA-256 mismatch: expected {expected_sha256}, got {digest}')
    pairs={}; station_totals=defaultdict(int); codes=set(); rows=0; year=None
    with input_path.open(newline='',encoding='utf-8-sig') as f:
        reader=csv.DictReader(f)
        required={'Financial_Year','origin_tlc','destination_tlc','journeys'}
        missing=required-set(reader.fieldnames or [])
        if missing: raise SystemExit(f'missing ODM columns: {sorted(missing)}')
        for row in reader:
            rows+=1
            y=str(row['Financial_Year']).strip(); year=year or y
            if y!=year: raise SystemExit(f'mixed financial years: {year} and {y}')
            a=str(row['origin_tlc']).strip().upper(); b=str(row['destination_tlc']).strip().upper()
            if len(a)!=3 or len(b)!=3 or a==b: continue
            journeys=int(round(float(row['journeys'] or 0)))
            if journeys<0: raise SystemExit(f'negative journeys for {a}-{b}')
            codes.update((a,b)); station_totals[a]+=journeys
            # RDM ODM is deliberately symmetrical: retain one canonical station pair.
            if a<b:
                pairs[(a,b)]=journeys
            else:
                existing=pairs.get((b,a))
                if existing is not None and existing!=journeys:
                    raise SystemExit(f'asymmetric ODM pair {a}-{b}: {existing} vs {journeys}')
    codes=sorted(codes); code_index={c:i for i,c in enumerate(codes)}
    if len(codes)>=4096: raise SystemExit('12-bit station index no longer sufficient')
    by_station=defaultdict(list)
    for pair,j in pairs.items():
        a,b=pair; by_station[a].append((j,pair)); by_station[b].append((j,pair))
    keep={pair for pair,j in pairs.items() if j>=threshold}
    for values in by_station.values():
        values.sort(key=lambda item:(item[0],item[1]), reverse=True)
        keep.update(pair for _,pair in values[:top_n])
    records=[]
    for a,b in keep:
        ia,ib=code_index[a],code_index[b]
        key=(ia<<12)|ib
        records.append((key,pairs[(a,b)]))
    records.sort()
    record_bytes=bytearray(); prev=0
    for key,j in records:
        put_varint(record_bytes,key-prev); put_varint(record_bytes,j); prev=key
    total_bytes=bytearray()
    for code in codes: put_varint(total_bytes,station_totals[code])
    unique_total=sum(pairs.values()); retained_total=sum(pairs[p] for p in keep)
    coverage=retained_total/unique_total if unique_total else 0
    codes_text=''.join(codes)
    rec64=base64.b64encode(record_bytes).decode('ascii')
    tot64=base64.b64encode(total_bytes).decode('ascii')
    period='2024-25' if year=='20242025' else year
    js=f'''/* Generated from ORR Origin and Destination Matrix {period}.\n * Source file: {input_path.name}\n * Source SHA-256: {digest}\n * Licence: Open Government Licence v3.0.\n *\n * The published ODM contains the same journey estimate for A→B and B→A, so\n * Kerbside stores each station pair once and treats it as bidirectional demand\n * evidence. To keep the browser payload proportionate, every pair with at\n * least {threshold} annual journeys is retained plus the top {top_n} pairs for every\n * station. This preserves {coverage:.4%} of total ODM journey volume and still\n * gives all {len(codes)} stations route evidence. Omitted pairs are UNKNOWN, never zero.\n */\n(function(){{\n'use strict';\nconst CODES='{codes_text}';\nconst RECORD_COUNT={len(records)};\nconst RECORDS='{rec64}';\nconst TOTALS='{tot64}';\nconst INDEX=Object.create(null);\nfor(let i=0;i<CODES.length;i+=3)INDEX[CODES.slice(i,i+3)]=i/3;\nlet KEYS=null,VALUES=null,STATION_TOTALS=null;\nfunction bytes(text){{const raw=atob(text),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out;}}\nfunction varint(data,state){{let value=0,shift=0;while(state.i<data.length){{const b=data[state.i++];value|=(b&127)<<shift;if(!(b&128))return value>>>0;shift+=7;if(shift>28)throw new Error('ORR ODM varint overflow');}}throw new Error('ORR ODM truncated varint');}}\nfunction ensure(){{\n  if(KEYS)return;\n  const data=bytes(RECORDS),state={{i:0}};KEYS=new Uint32Array(RECORD_COUNT);VALUES=new Uint32Array(RECORD_COUNT);let key=0;\n  for(let i=0;i<RECORD_COUNT;i++){{key+=varint(data,state);KEYS[i]=key;VALUES[i]=varint(data,state);}}\n  if(state.i!==data.length)throw new Error('ORR ODM trailing record bytes');\n  const totals=bytes(TOTALS),ts={{i:0}},count=CODES.length/3;STATION_TOTALS=new Uint32Array(count);for(let i=0;i<count;i++)STATION_TOTALS[i]=varint(totals,ts);\n  if(ts.i!==totals.length)throw new Error('ORR ODM trailing station-total bytes');\n}}\nfunction codeIndex(code){{const key=String(code||'').trim().toUpperCase(),value=INDEX[key];return Number.isInteger(value)?value:-1;}}\nfunction flow(from,to){{\n  const a=codeIndex(from),b=codeIndex(to);if(a<0||b<0)return null;if(a===b)return 0;ensure();\n  const x=Math.min(a,b),y=Math.max(a,b),wanted=(x<<12)|y;let lo=0,hi=KEYS.length-1;\n  while(lo<=hi){{const mid=(lo+hi)>>1,key=KEYS[mid];if(key===wanted)return VALUES[mid];if(key<wanted)lo=mid+1;else hi=mid-1;}}\n  /* Sparse omissions are unknown, not measured zero. undefined also prevents\n     the legacy calibration adapter from coercing a missing flow through Number(null). */\n  return undefined;\n}}\nfunction stationTotal(code){{const i=codeIndex(code);if(i<0)return null;ensure();return STATION_TOTALS[i];}}\nwindow.__KERBSIDE_ORR_ODM__={{\n  authority:'Office of Rail and Road',publisher:'Office of Rail and Road',period:'{period}',\n  licence:'Open Government Licence v3.0',commercialUse:true,completeMatrix:false,\n  directionality:'bidirectional-station-pair',sourceFile:'{input_path.name}',sourceSha256:'{digest}',\n  sourceRows:{rows},stationCount:{len(codes)},fullPairCount:{len(pairs)},retainedPairCount:{len(records)},\n  minimumAnnualJourneys:{threshold},stationTopN:{top_n},coverageJourneyShare:{coverage:.12f},\n  fullJourneyVolume:{unique_total},retainedJourneyVolume:{retained_total},flow,stationTotal\n}};\n}})();\n'''
    output_path.write_text(js,encoding='utf-8')
    return {'sha256':digest,'rows':rows,'stations':len(codes),'full_pairs':len(pairs),'retained_pairs':len(records),'coverage':coverage,'full_volume':unique_total,'retained_volume':retained_total,'asset_bytes':len(js.encode())}

def main():
    ap=argparse.ArgumentParser(description='Build compact Kerbside ORR ODM browser asset')
    ap.add_argument('input');ap.add_argument('output');ap.add_argument('--threshold',type=int,default=DEFAULT_THRESHOLD);ap.add_argument('--top-n',type=int,default=DEFAULT_TOP_N)
    ap.add_argument('--expected-sha256',default='',help='Optional SHA-256 guard for the official source CSV')
    args=ap.parse_args();print(json.dumps(build(args.input,args.output,args.threshold,args.top_n,args.expected_sha256),indent=2))
if __name__=='__main__':main()
