#!/usr/bin/env python3
from pathlib import Path

path=Path('kerbside-journey-planner-core.js')
text=path.read_text(encoding='utf-8')
replacements={
"function planConstraintLabel(settings=planState.constraints){const value=normalisePlanConstraints(settings),changes=value.maxChanges===0?'Direct only':'Up to 1 change',buffer=value.connectionBuffer?`+${value.connectionBuffer} min connection buffer`:'recommended connection minimum';return `${changes} · ${buffer}`;}":
"function planConstraintLabel(settings=planState.constraints){const value=normalisePlanConstraints(settings);if(value.maxChanges===0)return'Direct only';const buffer=value.connectionBuffer?`+${value.connectionBuffer} min connection buffer`:'base connection minimum';return `Up to 1 change · ${buffer}`;}",
">Recommended minimum</option>":">Base minimum</option>",
"The connection buffer is added to Kerbside's station-specific recommended minimum. It never shortens the recommended change time.":
"The connection buffer is added on top of the minimum already used by Kerbside. That is a licensed station rule where available, otherwise Kerbside's conservative planning buffer; the extra buffer never shortens it."
}
for old,new in replacements.items():
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'kerbside-journey-planner-core.js: expected one post-release anchor, found {count}: {old[:70]}')
    text=text.replace(old,new,1)
path.write_text(text,encoding='utf-8')
print('Corrected Plan My Journey minimum-connection wording.')
