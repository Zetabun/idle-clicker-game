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
text = text.replace(old, new, 1)

narrow_old = """@media (max-width:360px){
  #topbar{grid-template-columns:minmax(0,1fr) auto 42px;column-gap:5px}
  .searchwrap .pin{display:none}
  .searchwrap input{padding-left:10px;padding-right:62px}
  .searchwrap .go{right:29px;padding-left:2px;padding-right:2px;font-size:11px}
  .searchwrap .locate{right:2px}
  .dirswitch button{padding-left:6px;padding-right:6px}
  #setBtn{width:42px}
}
"""
narrow_new = """@media (max-width:360px){
  #topbar{grid-template-columns:minmax(125px,1fr) auto 38px;column-gap:4px;padding-left:8px;padding-right:8px}
  .searchwrap .pin{display:none}
  .searchwrap input{padding-left:10px;padding-right:58px}
  .searchwrap .go{right:27px;padding-left:1px;padding-right:1px;font-size:10.5px}
  .searchwrap .locate{right:1px}
  .dirswitch{padding-left:2px;padding-right:2px;gap:0}
  .dirswitch button{padding-left:4px;padding-right:4px;font-size:11px}
  .dirswitch button .arrow{display:none}
  #setBtn{width:38px}
}
"""
if text.count(narrow_old) != 1:
    raise SystemExit(f'narrow header block: expected one match, found {text.count(narrow_old)}')
text = text.replace(narrow_old, narrow_new, 1)
path.write_text(text, encoding='utf-8')

test_path = ROOT / 'kerbside-backend/tests/browser-regression.mjs'
test = test_path.read_text(encoding='utf-8')
fixture_old = "state.dir='both';"
fixture_new = "state.dir='all';"
if test.count(fixture_old) != 1:
    raise SystemExit(f'Both-mode fixture: expected one match, found {test.count(fixture_old)}')
test_path.write_text(test.replace(fixture_old, fixture_new, 1), encoding='utf-8')
print('Applied forward-route direction guard, corrected Both-mode fixture and compacted the 320px header.')
