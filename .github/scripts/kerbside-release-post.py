from pathlib import Path

path=Path('kerbside-journey-planner-core.js')
source=path.read_text(encoding='utf-8')
old="async function checkCoverageSnapshot({force=false}={}){const api=provider();"
new="async function checkCoverageSnapshot({force=false}={}){syncSaved({render:false});if(!state.saved.length)return false;const api=provider();"
count=source.count(old)
if count!=1:
    raise SystemExit(f'Expected one Saved Journeys coverage function, found {count}')
path.write_text(source.replace(old,new,1),encoding='utf-8')
