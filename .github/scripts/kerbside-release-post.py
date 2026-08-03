from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
path = ROOT / 'bus.html'
text = path.read_text(encoding='utf-8')
old = """    const dir=inferDirection(v), gpsMoveDir=gpsMovementDirection(v);
    const routeAhead=!!(geometry&&!geometry.passed&&geometry.remaining>=-120);
    if(S.dir!=='all'){
"""
new = """    const dir=inferDirection(v), gpsMoveDir=gpsMovementDirection(v);
    const orderedMovement=geometry?routePatternMovementFit(geometry.pattern,v,S.stop):null;
    const routeAhead=!!(geometry&&!geometry.passed&&geometry.remaining>=-120&&orderedMovement);
    if(S.dir!=='all'){
"""
if text.count(old) != 1:
    raise SystemExit(f'forward route direction guard: expected one match, found {text.count(old)}')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
print('Applied ordered forward-movement direction guard.')
