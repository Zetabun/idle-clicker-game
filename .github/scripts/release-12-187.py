from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'strikewatch-source'


def replace_regex(path, pattern, replacement, label):
    text = path.read_text(encoding='utf-8')
    updated, count = re.subn(pattern, replacement, text, count=1)
    if count != 1:
        raise SystemExit(f'Could not update {label} in {path}')
    path.write_text(updated, encoding='utf-8', newline='\n')


# build.py reads canonical release metadata from js/00-core.js.
core_path = SRC / 'js' / '00-core.js'
replace_regex(core_path, r"const BUILD_VERSION = '[^']+'", "const BUILD_VERSION = '12.187'", 'BUILD_VERSION')
replace_regex(core_path, r"const BUILD_ID = '[^']+'", "const BUILD_ID = '12.187.0-report-xp-safety'", 'BUILD_ID')
core_text = core_path.read_text(encoding='utf-8')
if "const BUILD_NAME = '" in core_text:
    replace_regex(core_path, r"const BUILD_NAME = '[^']+'", "const BUILD_NAME = 'Report XP Safety'", 'BUILD_NAME')

career_path = SRC / 'js' / '35-career.js'
text = career_path.read_text(encoding='utf-8')
anchor = '  function renderCareerReportsTab() {'
helper = """  function careerSafeXpAward(summary = null) {\n    return Math.max(0, Math.round(Number(summary?.xpAward) || 0));\n  }\n\n  function careerReportXpSafetyForTest() {\n    const cases = [\n      { input: null, expected: 0 },\n      { input: {}, expected: 0 },\n      { input: { xpAward: undefined }, expected: 0 },\n      { input: { xpAward: '48' }, expected: 48 },\n      { input: { xpAward: -12 }, expected: 0 },\n      { input: { xpAward: 19.6 }, expected: 20 }\n    ];\n    const results = cases.map(test => ({ ...test, actual: careerSafeXpAward(test.input) }));\n    return { ok: results.every(test => test.actual === test.expected), results };\n  }\n\n"""
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
career_path.write_text(text, encoding='utf-8', newline='\n')

release = {
    'version': '12.187',
    'name': 'Report XP Safety',
    'build_id': '12.187.0-report-xp-safety'
}
(SRC / 'RELEASE.json').write_text(json.dumps(release, indent=2) + '\n', encoding='utf-8', newline='\n')

audit = """# Build 12.187 — Report XP Safety

## Scope

This release completes SW-003 from the 12.160 whole-game backlog. It hardens historic and partial after-action records so missing, malformed or legacy `xpAward` values can never render as `undefined XP`. Gameplay rewards, XP calculation, settlement, saves, migrations and schemas are unchanged.

## Root cause

Two archive-facing templates interpolated `summary.xpAward` directly. Current match settlement normally supplies that field, but older, imported or partial summaries can omit it. Those records therefore exposed JavaScript's `undefined` value in visible copy.

## Fix

- Added `careerSafeXpAward(summary)`, which converts absent or invalid values to zero, clamps negative values and rounds valid numeric values.
- Routed the latest-report hero and last-deployment summary through the shared formatter.
- Added `careerReportXpSafetyForTest()` covering null, empty, undefined, numeric-string, negative and fractional inputs.
- Kept the already-safe team-management reward card unchanged.

## Stable boundaries

Match XP calculation and settlement remain authoritative and unchanged. Save schema stays 19 and diagnostics schema stays 1. No persisted field changes shape and no migration is required.

## Verification

- `python3 -m py_compile build.py` passes.
- Every modular JavaScript file and the generated development bundle parse with Node.
- `careerReportXpSafetyForTest()` is present and its deterministic cases pass.
- No direct `${summary.xpAward}` or `${careerState.lastRound.xpAward}` interpolation remains in the owning career source.
- Two builds produce identical generated hashes.
- Root `cod.html` is byte-identical to the verified standalone.
"""
(SRC / 'AUDIT-12.187.md').write_text(audit, encoding='utf-8', newline='\n')

changelog = SRC / 'CHANGELOG.md'
ch = changelog.read_text(encoding='utf-8')
entry = """## 12.187 — Report XP Safety

- Completes SW-003 by preventing missing or malformed historic report XP values from rendering as `undefined XP`.
- Adds one shared XP formatter plus deterministic diagnostic coverage without changing reward calculation, saves or schemas.
- See `AUDIT-12.187.md`.

"""
if '## 12.187 — Report XP Safety' not in ch:
    pos = ch.find('## ')
    ch = ch[:pos] + entry + ch[pos:] if pos >= 0 else ch + '\n' + entry
changelog.write_text(ch, encoding='utf-8', newline='\n')

handoff = SRC / 'HANDOFF.md'
h = handoff.read_text(encoding='utf-8')
h = h.replace('- Build: **12.186 — Accurate Storage Reporting**', '- Build: **12.187 — Report XP Safety**', 1)
h = h.replace('- Build ID: `12.186.0-accurate-storage-reporting`', '- Build ID: `12.187.0-report-xp-safety`', 1)
h = h.replace('strikewatch-source/dist/strikewatch-build-12.186.html', 'strikewatch-source/dist/strikewatch-build-12.187.html', 1)
marker = 'Build 12.186 closes SW-002.'
paragraph = "Build 12.187 closes SW-003. Historic, imported and partial after-action summaries now pass visible XP through `careerSafeXpAward()`, preventing `undefined XP` while preserving the existing match-reward calculation and settlement path. Keep `careerReportXpSafetyForTest()` green. Save schema 19 and diagnostics schema 1 are unchanged. See `AUDIT-12.187.md`.\n\n"
if paragraph.strip() not in h:
    idx = h.find(marker)
    if idx < 0:
        raise SystemExit('Could not find HANDOFF release history anchor')
    h = h[:idx] + paragraph + h[idx:]
handoff.write_text(h, encoding='utf-8', newline='\n')

for name in ['AGENTS.md', 'README.md', 'PROJECT.md', '00-READ-FIRST-GPT.md']:
    path = SRC / name
    if not path.exists():
        continue
    value = path.read_text(encoding='utf-8')
    value = value.replace('12.186 — Accurate Storage Reporting', '12.187 — Report XP Safety')
    value = value.replace('12.186.0-accurate-storage-reporting', '12.187.0-report-xp-safety')
    value = value.replace('strikewatch-build-12.186.html', 'strikewatch-build-12.187.html')
    path.write_text(value, encoding='utf-8', newline='\n')

core_check = core_path.read_text(encoding='utf-8')
if "const BUILD_VERSION = '12.187'" not in core_check or "const BUILD_ID = '12.187.0-report-xp-safety'" not in core_check:
    raise SystemExit('Canonical build metadata verification failed')
print('Prepared Build 12.187 source and documentation changes.')
