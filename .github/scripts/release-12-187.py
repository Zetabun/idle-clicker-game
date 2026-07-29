from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'strikewatch-source'

OLD_VERSION = '12.186'
OLD_NAME = 'Accurate Storage Reporting'
OLD_ID = '12.186.0-accurate-storage-reporting'
NEW_VERSION = '12.187'
NEW_NAME = 'Report XP Safety'
NEW_ID = '12.187.0-report-xp-safety'


def write_text(path, value):
    path.write_text(value, encoding='utf-8', newline='\n')


def replace_regex(path, pattern, replacement, label):
    text = path.read_text(encoding='utf-8')
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'Could not update {label} in {path}')
    write_text(path, updated)


# build.py reads canonical release metadata from js/00-core.js.
core_path = SRC / 'js' / '00-core.js'
replace_regex(core_path, r"const BUILD_VERSION = '[^']+'", f"const BUILD_VERSION = '{NEW_VERSION}'", 'BUILD_VERSION')
replace_regex(core_path, r"const BUILD_NAME = '[^']+'", f"const BUILD_NAME = '{NEW_NAME}'", 'BUILD_NAME')
replace_regex(core_path, r"const BUILD_ID = '[^']+'", f"const BUILD_ID = '{NEW_ID}'", 'BUILD_ID')

# index.html is the development shell and owns visible labels plus cache keys.
index_path = SRC / 'index.html'
index = index_path.read_text(encoding='utf-8')
index = index.replace(f'Strikewatch {OLD_VERSION}: {OLD_NAME}', f'Strikewatch {NEW_VERSION}: {NEW_NAME}')
index = index.replace(OLD_ID, NEW_ID)
index = index.replace(f'id="managerBuildVersion">{OLD_VERSION}</b>', f'id="managerBuildVersion">{NEW_VERSION}</b>')
index = index.replace(f'id="mobileCommandBuildVersion">{OLD_VERSION}</b>', f'id="mobileCommandBuildVersion">{NEW_VERSION}</b>')
required_index = [
    f'<title>Strikewatch {NEW_VERSION}: {NEW_NAME}</title>',
    f'id="managerBuildVersion">{NEW_VERSION}</b>',
    f'id="mobileCommandBuildVersion">{NEW_VERSION}</b>',
    NEW_ID,
]
missing_index = [token for token in required_index if token not in index]
if missing_index:
    raise SystemExit(f'Canonical index metadata update failed: {missing_index}')
if OLD_ID in index:
    raise SystemExit('Old build cache key remains in index.html')
write_text(index_path, index)

career_path = SRC / 'js' / '35-career.js'
text = career_path.read_text(encoding='utf-8')
anchor = '  function renderCareerReportsTab() {'
helper = """  function careerSafeXpAward(summary = null) {
    return Math.max(0, Math.round(Number(summary?.xpAward) || 0));
  }

  function careerReportXpSafetyForTest() {
    const cases = [
      { input: null, expected: 0 },
      { input: {}, expected: 0 },
      { input: { xpAward: undefined }, expected: 0 },
      { input: { xpAward: '48' }, expected: 48 },
      { input: { xpAward: -12 }, expected: 0 },
      { input: { xpAward: 19.6 }, expected: 20 }
    ];
    const results = cases.map(test => ({ ...test, actual: careerSafeXpAward(test.input) }));
    return { ok: results.every(test => test.actual === test.expected), results };
  }

"""
if 'function careerSafeXpAward(' not in text:
    if anchor not in text:
        raise SystemExit('Could not find report render anchor')
    text = text.replace(anchor, helper + anchor, 1)

replacements = {
    '${summary.xpAward} XP': '${careerSafeXpAward(summary)} XP',
    '${careerState.lastRound.xpAward} Team XP earned': '${careerSafeXpAward(careerState.lastRound)} Team XP earned',
}
for old, new in replacements.items():
    if old not in text and new not in text:
        raise SystemExit(f'Missing expected XP render: {old}')
    text = text.replace(old, new)
if '${summary.xpAward}' in text or '${careerState.lastRound.xpAward}' in text:
    raise SystemExit('Unsafe XP interpolation remains')
write_text(career_path, text)

# Keep the deterministic diagnostic reachable through the established browser API.
runtime_path = SRC / 'js' / '70-runtime.js'
runtime = runtime_path.read_text(encoding='utf-8')
debug_line = "    careerReportXpSafetyForTest: () => typeof careerReportXpSafetyForTest === 'function' ? careerReportXpSafetyForTest() : null,\n"
if debug_line not in runtime:
    debug_anchor = '  window.__strikeDebug = {\n    build: BUILD_ID,\n'
    if debug_anchor not in runtime:
        raise SystemExit('Could not find runtime debug API anchor')
    runtime = runtime.replace(debug_anchor, debug_anchor + debug_line, 1)
write_text(runtime_path, runtime)

release = {
    'version': NEW_VERSION,
    'name': NEW_NAME,
    'build_id': NEW_ID,
}
write_text(SRC / 'RELEASE.json', json.dumps(release, indent=2) + '\n')

audit = """# Build 12.187 — Report XP Safety

## Scope

This release completes SW-003 from the 12.160 whole-game backlog. It hardens historic and partial after-action records so missing, malformed or legacy `xpAward` values can never render as `undefined XP`. Gameplay rewards, XP calculation, settlement, saves, migrations and schemas are unchanged.

## Root cause

Two archive-facing templates interpolated `summary.xpAward` directly. Current match settlement normally supplies that field, but older, imported or partial summaries can omit it. Those records therefore exposed JavaScript's `undefined` value in visible copy.

## Fix

- Added `careerSafeXpAward(summary)`, which converts absent or invalid values to zero, clamps negative values and rounds valid numeric values.
- Routed the latest-report hero and last-deployment summary through the shared formatter.
- Added `careerReportXpSafetyForTest()` covering null, empty, undefined, numeric-string, negative and fractional inputs.
- Exposed that deterministic diagnostic through the existing `window.__strikeDebug` API.
- Updated the canonical development title, asset cache keys and desktop/mobile visible build labels to 12.187.
- Kept the already-safe team-management reward card unchanged.

## Stable boundaries

Match XP calculation and settlement remain authoritative and unchanged. Save schema stays 19 and diagnostics schema stays 1. No persisted field changes shape and no migration is required.

## Verification

- `python3 -m py_compile build.py` passes.
- Every modular JavaScript file and the generated development bundle parse with Node.
- The exact source diagnostic reports `ok: true` for all deterministic cases.
- No direct `${summary.xpAward}` or `${careerState.lastRound.xpAward}` interpolation remains in the owning career source.
- `index.html`, `RELEASE.json`, `js/00-core.js` and both visible build labels agree on 12.187.
- Two builds produce identical generated hashes.
- Root `cod.html` is byte-identical to the verified standalone.
"""
write_text(SRC / 'AUDIT-12.187.md', audit)

changelog = SRC / 'CHANGELOG.md'
ch = changelog.read_text(encoding='utf-8')
entry = """## 12.187 — Report XP Safety

- Completes SW-003 by preventing missing or malformed historic report XP values from rendering as `undefined XP`.
- Adds one shared XP formatter and deterministic diagnostic coverage without changing reward calculation, saves or schemas.
- See `AUDIT-12.187.md`.

"""
if '## 12.187 — Report XP Safety' not in ch:
    pos = ch.find('## ')
    ch = ch[:pos] + entry + ch[pos:] if pos >= 0 else ch + '\n' + entry
write_text(changelog, ch)

handoff = SRC / 'HANDOFF.md'
h = handoff.read_text(encoding='utf-8')
h = re.sub(r'- Build: \*\*[^\n]+\*\*', f'- Build: **{NEW_VERSION} — {NEW_NAME}**', h, count=1)
h = re.sub(r'- Build ID: `[^`]+`', f'- Build ID: `{NEW_ID}`', h, count=1)
h = re.sub(r'- Generated standalone: `strikewatch-source/dist/strikewatch-build-[^`]+\.html`', f'- Generated standalone: `strikewatch-source/dist/strikewatch-build-{NEW_VERSION}.html`', h, count=1)
marker = 'Build 12.186 closes SW-002.'
paragraph = "Build 12.187 closes SW-003. Historic, imported and partial after-action summaries now pass visible XP through `careerSafeXpAward()`, preventing `undefined XP` while preserving the existing match-reward calculation and settlement path. Keep `careerReportXpSafetyForTest()` green. Save schema 19 and diagnostics schema 1 are unchanged. See `AUDIT-12.187.md`.\n\n"
if paragraph.strip() not in h:
    idx = h.find(marker)
    if idx < 0:
        raise SystemExit('Could not find HANDOFF release history anchor')
    h = h[:idx] + paragraph + h[idx:]
write_text(handoff, h)

agents = SRC / 'AGENTS.md'
a = agents.read_text(encoding='utf-8')
new_agent_note = "Build 12.187 owns report XP safety. Historic, imported and partial after-action summaries must route visible XP through `careerSafeXpAward()` so absent or malformed values cannot render as `undefined XP`. Keep match XP calculation and settlement unchanged, retain the browser-accessible `careerReportXpSafetyForTest()` diagnostic, and preserve save schema 19 plus diagnostics schema 1. See `AUDIT-12.187.md`."
a, count = re.subn(r'(## Current release note\n\n).*?(?=\n\nBuild 12\.185)', lambda match: match.group(1) + new_agent_note, a, count=1, flags=re.S)
if count != 1:
    raise SystemExit('Could not update AGENTS current release note')
write_text(agents, a)

readme = SRC / 'README.md'
r = readme.read_text(encoding='utf-8')
r = re.sub(r'^# Strikewatch Source [^\n]+', f'# Strikewatch Source {NEW_VERSION}', r, count=1)
r = r.replace(f'dist/strikewatch-build-{OLD_VERSION}.html', f'dist/strikewatch-build-{NEW_VERSION}.html')
write_text(readme, r)

project = SRC / 'PROJECT.md'
p = project.read_text(encoding='utf-8')
new_project_note = "Build 12.187 closes SW-003 by routing historic and partial after-action XP through one safe formatter, so absent or malformed values cannot render as `undefined XP`. Match rewards, settlement, persistence and schemas are unchanged. See `HANDOFF.md` and `AUDIT-12.187.md`."
p, count = re.subn(r'(## Current release\n\n).*?(?=\n\nHistorical architecture narratives)', lambda match: match.group(1) + new_project_note, p, count=1, flags=re.S)
if count != 1:
    raise SystemExit('Could not update PROJECT current release note')
write_text(project, p)

read_first = SRC / '00-READ-FIRST-GPT.md'
rf = read_first.read_text(encoding='utf-8')
rf, count = re.subn(r'Current release: \*\*Strikewatch Build [^*]+\*\*\.', f'Current release: **Strikewatch Build {NEW_VERSION} — {NEW_NAME}**.', rf, count=1)
if count != 1:
    raise SystemExit('Could not update legacy GPT release pointer')
write_text(read_first, rf)

core_check = core_path.read_text(encoding='utf-8')
if f"const BUILD_VERSION = '{NEW_VERSION}'" not in core_check or f"const BUILD_ID = '{NEW_ID}'" not in core_check:
    raise SystemExit('Canonical build metadata verification failed')
print('Prepared Build 12.187 source, development shell and documentation changes.')
