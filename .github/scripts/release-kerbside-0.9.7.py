#!/usr/bin/env python3
from __future__ import annotations

import ast
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = (
    'https://raw.githubusercontent.com/Zetabun/idle-clicker-game/'
    'agent/kerbside-0.9.7-temporal-odm/.github/scripts/release-kerbside-0.9.7.py'
)


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def write(path: str, content: str) -> None:
    (ROOT / path).write_text(content, encoding='utf-8')


with urllib.request.urlopen(SOURCE, timeout=30) as response:
    upstream = response.read().decode('utf-8')

tree = ast.parse(upstream, filename='kerbside-0.9.7-upstream.py')
kept = []
DROP_TEXT = (
    'kerbside-orr-odm-2024-25.js',
    '.github/scripts/build-orr-odm.py',
    'orr-odm-builder.test.mjs',
    '__KERBSIDE_ORR_ODM__',
    'odmSource',
    'bundled ORR 2024-25 ODM is licensed',
)
DROP_NAMES = {'builder', 'builder_test', 'odmSource', 'extra'}
for node in tree.body:
    segment = ast.get_source_segment(upstream, node) or ''
    names = {child.id for child in ast.walk(node) if isinstance(child, ast.Name)}
    is_verify_call = (
        isinstance(node, ast.Expr)
        and isinstance(node.value, ast.Call)
        and isinstance(node.value.func, ast.Name)
        and node.value.func.id == 'verify_asset'
    )
    if is_verify_call or any(token in segment for token in DROP_TEXT) or names.intersection(DROP_NAMES):
        continue
    kept.append(node)

module = ast.Module(body=kept, type_ignores=[])
ast.fix_missing_locations(module)
namespace = {'__file__': str(Path(__file__).resolve()), '__name__': '__main__'}
exec(compile(module, 'kerbside-0.9.7-temporal-filtered.py', 'exec'), namespace, namespace)

forecast_path = 'kerbside-train-forecast-v4.js'
forecast = read(forecast_path)
start = forecast.find('function isBankHoliday(date){')
if start < 0:
    raise SystemExit('forecast: isBankHoliday helper was not created by temporal patch')
end = forecast.find('\nfunction ', start + 10)
if end < 0:
    raise SystemExit('forecast: could not bound isBankHoliday helper')

bank_holiday_helpers = r'''function dftLondonYmd(date){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date instanceof Date?date:new Date(date));
  const out={};parts.forEach(part=>{if(part.type!=='literal')out[part.type]=Number(part.value);});return {year:out.year,month:out.month,day:out.day};
}
function dftYmdKey(year,month,day){return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;}
function dftUtcYmd(date){return {year:date.getUTCFullYear(),month:date.getUTCMonth()+1,day:date.getUTCDate()};}
function dftHolidayAdd(set,year,month,day,substitute=false){
  const actual=new Date(Date.UTC(year,month-1,day)),p=dftUtcYmd(actual),key=dftYmdKey(p.year,p.month,p.day),collision=set.has(key),weekend=actual.getUTCDay()===0||actual.getUTCDay()===6;set.add(key);
  if(!substitute||(!weekend&&!collision))return;
  const observed=new Date(actual);observed.setUTCDate(observed.getUTCDate()+1);
  while(observed.getUTCDay()===0||observed.getUTCDay()===6||set.has(dftYmdKey(observed.getUTCFullYear(),observed.getUTCMonth()+1,observed.getUTCDate())))observed.setUTCDate(observed.getUTCDate()+1);
  const q=dftUtcYmd(observed);set.add(dftYmdKey(q.year,q.month,q.day));
}
function dftNthMonday(year,month,n){const d=new Date(Date.UTC(year,month-1,1)),offset=(8-d.getUTCDay())%7;return 1+offset+(n-1)*7;}
function dftLastMonday(year,month){const d=new Date(Date.UTC(year,month,0)),back=(d.getUTCDay()+6)%7;return d.getUTCDate()-back;}
function dftEasterSunday(year){
  const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1;
  return new Date(Date.UTC(year,month-1,day));
}
const DFT_BANK_HOLIDAY_CACHE=new Map();
function dftBankHolidayKeys(year){
  if(DFT_BANK_HOLIDAY_CACHE.has(year))return DFT_BANK_HOLIDAY_CACHE.get(year);
  const set=new Set();
  dftHolidayAdd(set,year,1,1,true);dftHolidayAdd(set,year,1,2,true);
  const easter=dftEasterSunday(year),goodFriday=new Date(easter),easterMonday=new Date(easter);goodFriday.setUTCDate(goodFriday.getUTCDate()-2);easterMonday.setUTCDate(easterMonday.getUTCDate()+1);
  for(const date of [goodFriday,easterMonday]){const p=dftUtcYmd(date);dftHolidayAdd(set,p.year,p.month,p.day,false);}
  dftHolidayAdd(set,year,5,dftNthMonday(year,5,1),false);dftHolidayAdd(set,year,5,dftLastMonday(year,5),false);
  dftHolidayAdd(set,year,8,dftNthMonday(year,8,1),false);dftHolidayAdd(set,year,8,dftLastMonday(year,8),false);
  dftHolidayAdd(set,year,11,30,true);
  dftHolidayAdd(set,year,12,25,true);dftHolidayAdd(set,year,12,26,true);
  DFT_BANK_HOLIDAY_CACHE.set(year,set);return set;
}
function isBankHoliday(date){const p=dftLondonYmd(date);return dftBankHolidayKeys(p.year).has(dftYmdKey(p.year,p.month,p.day));}'''
forecast = forecast[:start] + bank_holiday_helpers + forecast[end:]
write(forecast_path, forecast)

for path in ['bus.html', 'kerbside-train-forecast-v4.js', 'kerbside-rail-calibration.js']:
    if 'kerbside-orr-odm-2024-25.js' in read(path):
        raise SystemExit(f'{path}: temporal release unexpectedly references unpublished ODM asset')

print('Kerbside 0.9.7 corrected temporal calibration patch applied')
