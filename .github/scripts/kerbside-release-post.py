from pathlib import Path

path=Path('kerbside-journey-planner-core.js')
source=path.read_text(encoding='utf-8')
replacements=[
    (
        "async function checkCoverageSnapshot({force=false}={}){const api=provider();",
        "async function checkCoverageSnapshot({force=false}={}){syncSaved({render:false});if(!state.saved.length)return false;const api=provider();",
    ),
    (
        "async function refreshAll({force=false,reason='auto',ids=null}={}){if(state.refreshAllPromise)return state.refreshAllPromise;syncSaved({render:false});const targets=(Array.isArray(ids)&&ids.length?ids:state.saved.map(item=>item.id)).filter(Boolean);",
        "async function refreshAll({force=false,reason='auto',ids=null}={}){if(state.refreshAllPromise)return state.refreshAllPromise;syncSaved({render:false});const targets=(Array.isArray(ids)&&ids.length?ids:state.saved.map(item=>item.id)).filter(Boolean);if(!targets.length)return false;",
    ),
]
for old,new in replacements:
    count=source.count(old)
    if count!=1:
        raise SystemExit(f'Expected one Saved Journeys post-release anchor, found {count}: {old[:80]}')
    source=source.replace(old,new,1)
path.write_text(source,encoding='utf-8')
