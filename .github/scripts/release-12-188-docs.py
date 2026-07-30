from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'strikewatch-source'


def write(path, text):
    path.write_text(text, encoding='utf-8', newline='\n')


def replace_once(path, old, new, label):
    text = path.read_text(encoding='utf-8')
    if new in text:
        return
    if old not in text:
        raise SystemExit(f'Missing {label} in {path}')
    write(path, text.replace(old, new, 1))


readme = SRC / 'README.md'
replace_once(
    readme,
    '# Strikewatch Source 12.187',
    '# Strikewatch Source 12.188',
    'README release heading'
)

project = SRC / 'PROJECT.md'
replace_once(
    project,
    'Build 12.187 closes SW-003 by routing historic and partial after-action XP through one safe formatter, so absent or malformed values cannot render as `undefined XP`. Match rewards, settlement, persistence and schemas are unchanged. See `HANDOFF.md` and `AUDIT-12.187.md`.',
    'Build 12.188 improves armour presentation and Supply Depot performance by pulling large cached armour stills back for complete-set framing and replacing four live store armour rigs with forward-facing cached renders. The on-demand interactive inspector, gameplay, persistence and schemas are unchanged. See `HANDOFF.md` and `AUDIT-12.188.md`.',
    'PROJECT current release paragraph'
)

checks = {
    readme: ['# Strikewatch Source 12.188', 'dist/strikewatch-build-12.188.html'],
    project: ['Build 12.188 improves armour presentation', 'AUDIT-12.188.md'],
    SRC / '00-READ-FIRST-GPT.md': ['Current release: **Strikewatch Build 12.188 — Armour Preview Optimisation**.']
}
for path, required in checks.items():
    text = path.read_text(encoding='utf-8')
    missing = [value for value in required if value not in text]
    if missing:
        raise SystemExit(f'Missing documentation release identity in {path}: {missing}')

print('Updated Build 12.188 concise documentation.')
