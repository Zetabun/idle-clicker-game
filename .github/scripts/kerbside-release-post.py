from pathlib import Path

path = Path('kerbside-train-timetable.js')
source = path.read_text(encoding='utf-8')
old = "provider.getCoverage=async options=>(await loadCoverage({force:!!options.force})).combined;"
new = "provider.getCoverage=async(options={})=>(await loadCoverage({force:!!options.force})).combined;"
if source.count(old) != 1:
    raise SystemExit(f'Expected one dual-source coverage wrapper, found {source.count(old)}')
path.write_text(source.replace(old, new, 1), encoding='utf-8')
