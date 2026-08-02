from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one post-release match, found {count}: {old[:100]!r}")
    file.write_text(text.replace(old, new, 1), encoding="utf-8")


replace_once(
    "bus.html",
    """  const vehicle=projectToPattern(pattern.points,v.lat,v.lon);
  const target=projectToPattern(pattern.points,stop.lat,stop.lon);
  if(!vehicle || !target || vehicle.metres>650 || target.metres>250) return null;
  const remaining=target.along-vehicle.along;""",
    """  const vehicle=projectToPattern(pattern.points,v.lat,v.lon);
  const ordered=orderedPatternStops(pattern), selectedIndex=selectedPatternStopIndex(ordered);
  const selected=selectedIndex>=0?ordered[selectedIndex]:null;
  const projectedTarget=projectToPattern(pattern.points,stop.lat,stop.lon);
  const target=selected
    ? {along:selected.along,metres:dist(selected.lat,selected.lon,stop.lat,stop.lon),total:vehicle&&vehicle.total}
    : projectedTarget;
  if(!vehicle || !target || vehicle.metres>650 || target.metres>250) return null;
  const remaining=target.along-vehicle.along;""",
)
replace_once(
    "bus.html",
    """  if(stops.length<2) return {pattern,vehicle,stops:[],nextIndex:-1,selectedIndex:-1,remainingStops:0,percent:Math.max(0,Math.min(100,vehicle.along/Math.max(1,vehicle.total)*100))};""",
    """  if(stops.length<2) return null;""",
)
replace_once(
    "bus.html",
    """      fillOpacity:selected||next?.95:.78,
      opacity:passed?.58:.9""",
    """      fillOpacity:(selected||next)?0.95:0.78,
      opacity:passed?0.58:0.9""",
)

print("Applied route progress safety corrections")
