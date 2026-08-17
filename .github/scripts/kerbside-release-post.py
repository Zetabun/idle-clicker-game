#!/usr/bin/env python3
from pathlib import Path

path = Path('kerbside-train-movement.js')
text = path.read_text(encoding='utf-8')
old = """  const sourceSignature=points.map(point=>`${normalisePlace(point.name)}|${point.when}|${point.cancelled}|${point.phase}`).join('||');
  if(calling.dataset.trainFullRouteSource!==sourceSignature){calling.dataset.trainFullRouteSource=sourceSignature;calling.dataset.trainProgressSignature='';calling.innerHTML=`<div class=\"train-detail-title\">Calling points</div>${points.map(point=>`<div class=\"train-call ${point.phase==='passed'?'passed':'ahead'}${point.cancelled?' cancelled':''}\"><i></i><span><b>${esc(point.name)}</b><small>${esc(point.when)}${point.cancelled?' · cancelled':''}</small></span></div>`).join('')}`;}
"""
new = """  const sourceSignature=points.map(point=>`${normalisePlace(point.name)}|${point.when}|${point.cancelled}|${point.phase}`).join('||');
  const routeSignature=points.map(point=>normalisePlace(point.name)).join('||'),domRouteSignature=timelineDomPoints(calling).map(point=>normalisePlace(point.name)).join('||');
  if(calling.dataset.trainFullRouteSource!==sourceSignature||domRouteSignature!==routeSignature){calling.dataset.trainFullRouteSource=sourceSignature;calling.dataset.trainProgressSignature='';calling.innerHTML=`<div class=\"train-detail-title\">Calling points</div>${points.map(point=>`<div class=\"train-call ${point.phase==='passed'?'passed':'ahead'}${point.cancelled?' cancelled':''}\"><i></i><span><b>${esc(point.name)}</b><small>${esc(point.when)}${point.cancelled?' · cancelled':''}</small></span></div>`).join('')}`;}
"""
if text.count(old) != 1:
    raise SystemExit(f'Expected one generated timeline fingerprint block, found {text.count(old)}')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
print('Hardened Kerbside 0.9.44 full-route timeline fingerprint against partial DOM rerenders.')
