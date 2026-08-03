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

test_path = ROOT / 'kerbside-backend/tests/browser-regression.mjs'
test = test_path.read_text(encoding='utf-8')
fixture_old = "state.dir='both';"
fixture_new = "state.dir='all';"
if test.count(fixture_old) != 1:
    raise SystemExit(f'Both-mode fixture: expected one match, found {test.count(fixture_old)}')
test_path.write_text(test.replace(fixture_old, fixture_new, 1), encoding='utf-8')
print('Applied ordered forward-movement direction guard and corrected Both-mode fixture.')
