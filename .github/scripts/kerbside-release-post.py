from pathlib import Path

path = Path('kerbside-train-timetable.js')
source = path.read_text(encoding='utf-8')
old = "provider.getCoverage=async options=>(await loadCoverage({force:!!options.force})).combined;"
new = "provider.getCoverage=async(options={})=>(await loadCoverage({force:!!options.force})).combined;"
if source.count(old) != 1:
    raise SystemExit(f'Expected one dual-source coverage wrapper, found {source.count(old)}')
source = source.replace(old, new, 1)

old_source_name = "function timetableSourceName(){return state.scheduleSource==='network-rail'?'Network Rail Open Data SCHEDULE':'National Rail Darwin Timetable Files';}"
new_source_name = "function timetableSourceName(){return state.scheduleSource==='network-rail'?'Network Rail Open Data SCHEDULE':'the National Rail Darwin Timetable Files';}"
if source.count(old_source_name) != 1:
    raise SystemExit(f'Expected one timetable source-name helper, found {source.count(old_source_name)}')
source = source.replace(old_source_name, new_source_name, 1)
path.write_text(source, encoding='utf-8')

test_path = Path('kerbside-backend/test/train-timetable-provider.test.js')
test_source = test_path.read_text(encoding='utf-8')
old_test = """test('Darwin timetable provider exposes snapshot coverage',async()=>{\n  const provider=loadProvider();\n  const value=await provider.getCoverage();\n  assert.equal(value.source,'National Rail Darwin Timetable Files');\n  assert.equal(value.timetableId,'20260811020500');\n  assert.deepEqual({...value.coverage['2026-08-12']},{from:'00:01',partial:false,to:'23:59'});\n});"""
new_test = """test('combined timetable provider preserves Darwin snapshot coverage',async()=>{\n  const provider=loadProvider();\n  const value=await provider.getCoverage();\n  assert.equal(value.source,'Kerbside combined rail timetable');\n  assert.equal(value.timetableId,'20260811020500');\n  assert.equal(value.sources.darwin.source,'National Rail Darwin Timetable Files');\n  assert.deepEqual({...value.coverage['2026-08-12']},{from:'00:01',partial:false,to:'23:59'});\n});"""
if test_source.count(old_test) != 1:
    raise SystemExit(f'Expected one legacy Darwin coverage regression, found {test_source.count(old_test)}')
test_path.write_text(test_source.replace(old_test, new_test, 1), encoding='utf-8')

status_path = Path('kerbside-status.js')
status_source = status_path.read_text(encoding='utf-8')
old_status_version = "const VERSION='0.9.16';"
new_status_version = "const VERSION='0.9.17';"
if status_source.count(old_status_version) != 1:
    raise SystemExit(f'Expected one Kerbside status version marker, found {status_source.count(old_status_version)}')
status_path.write_text(status_source.replace(old_status_version, new_status_version, 1), encoding='utf-8')
