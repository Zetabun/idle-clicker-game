from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'strikewatch-source'
OLD = '12.227'
NEW = '12.228'
OLD_NAME = 'Desktop Inbox Preview Stability'
NEW_NAME = 'Desktop Inbox Badge Containment'
OLD_ID = '12.227.0-desktop-inbox-preview-stability'
NEW_ID = '12.228.0-desktop-inbox-badge-containment'


def read(path: Path) -> str:
    return path.read_text(encoding='utf-8')


def write(path: Path, text: str) -> None:
    path.write_text(text, encoding='utf-8', newline='\n')


def write_new(path: Path, text: str) -> None:
    if path.exists():
        raise SystemExit(f'{path.name}: expected a new file, but it already exists')
    write(path, text)


def replace_one(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)


def replace_all_present(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count < 1:
        raise SystemExit(f'{label}: expected at least 1 match, found 0')
    return text.replace(old, new)


release = SRC / 'RELEASE.json'
expected_release = {'version': OLD, 'name': OLD_NAME, 'build_id': OLD_ID}
actual_release = json.loads(read(release))
if actual_release != expected_release:
    raise SystemExit(
        'unexpected predecessor release: '
        f'expected {expected_release!r}, found {actual_release!r}'
    )
write(release, json.dumps({'version': NEW, 'name': NEW_NAME, 'build_id': NEW_ID}, indent=2) + '\n')

core = SRC / 'js/00-core.js'
text = read(core)
text = replace_one(text, f"  const BUILD_VERSION = '{OLD}';", f"  const BUILD_VERSION = '{NEW}';", 'source version')
text = replace_one(text, f"  const BUILD_NAME = '{OLD_NAME}';", f"  const BUILD_NAME = '{NEW_NAME}';", 'source name')
text = replace_one(text, f"  const BUILD_ID = '{OLD_ID}';", f"  const BUILD_ID = '{NEW_ID}';", 'source build id')
write(core, text)

inbox_css = SRC / 'css/inbox-scroll.css'
text = read(inbox_css)
marker = 'Build 12.228: desktop Inbox status-badge containment'
if marker in text:
    raise SystemExit('desktop Inbox status-badge correction is already present')
text = replace_one(
    text,
    '/* Inbox nested-scroll arming and overflow signposting ownership.\n   Extracted from the Build 12.133 tail in Build 12.183 without changing declarations. */',
    '/* Inbox nested-scroll arming, overflow signposting and desktop row-status containment.\n   Scroll ownership was extracted from the Build 12.133 tail in Build 12.183. */',
    'inbox stylesheet ownership',
)
text = text.rstrip() + '''

/* --- Build 12.228: desktop Inbox status-badge containment -----------------
   Inline desktop rows previously inherited an edge-positioned badge with no
   protected space in the copy column. The row clips its contents, so DECISION
   could be cut by the right border. Keep every status in one inset slot and
   reserve only the width each state needs. Compact/modal mail is untouched. */
.club-mail-client[data-mail-presentation='inline'] .club-mail-row.saved,
.club-mail-client[data-mail-presentation='inline'] .club-mail-row.important {
  position: relative;
  box-sizing: border-box;
  padding-inline-end: 52px;
}

.club-mail-client[data-mail-presentation='inline'] .club-mail-row.decision-required {
  position: relative;
  box-sizing: border-box;
  padding-inline-end: 96px;
}

.club-mail-client[data-mail-presentation='inline'] .club-mail-row > .club-mail-row-copy {
  min-width: 0;
  max-width: 100%;
}

.club-mail-client[data-mail-presentation='inline'] .club-mail-row > .club-mail-decision-badge,
.club-mail-client[data-mail-presentation='inline'] .club-mail-row > .club-mail-saved-badge,
.club-mail-client[data-mail-presentation='inline'] .club-mail-row > .club-mail-important {
  position: absolute;
  left: auto;
  right: 12px;
  inset-inline-start: auto;
  inset-inline-end: 12px;
  top: 50%;
  bottom: auto;
  box-sizing: border-box;
  max-width: calc(100% - 24px);
  margin: 0;
  transform: translateY(-50%);
  white-space: nowrap;
  z-index: 1;
}
'''
write(inbox_css, text)

index = SRC / 'index.html'
text = read(index)
text = replace_one(text, f'Strikewatch {OLD}: {OLD_NAME}', f'Strikewatch {NEW}: {NEW_NAME}', 'document title')
text = replace_all_present(text, OLD_ID, NEW_ID, 'asset build id')
text = replace_one(text, f'id="managerBuildVersion">{OLD}</b>', f'id="managerBuildVersion">{NEW}</b>', 'desktop build label')
text = replace_one(text, f'id="mobileCommandBuildVersion">{OLD}</b>', f'id="mobileCommandBuildVersion">{NEW}</b>', 'mobile build label')
write(index, text)

handoff = SRC / 'HANDOFF.md'
text = read(handoff)
text = replace_one(text, f'- Build: **{OLD} — {OLD_NAME}**', f'- Build: **{NEW} — {NEW_NAME}**', 'handoff build')
text = replace_one(text, f'- Build ID: `{OLD_ID}`', f'- Build ID: `{NEW_ID}`', 'handoff build id')
text = replace_one(text, f'strikewatch-build-{OLD}.html', f'strikewatch-build-{NEW}.html', 'handoff standalone')
handoff_anchor = 'Build 12.227 keeps the desktop Inbox selection alive across the read-state save'
handoff_note = (
    'Build 12.228 owns desktop Inbox row-status containment in `css/inbox-scroll.css`. '
    'The DECISION chip, saved star and important star now share an inset right-edge slot, '
    'while decision rows reserve the wider label space and star rows reserve only their '
    'smaller icon space. The correction is scoped to `data-mail-presentation="inline"`, '
    'so compact/mobile modal mail is unchanged. Verify all three states at 1024, 1280, '
    '1440 and 1920px with no badge clipping, copy overlap or horizontal overflow. Save '
    'schema 19 and diagnostics schema 1 are unchanged. See `AUDIT-12.228.md`.\n\n'
)
text = replace_one(text, handoff_anchor, handoff_note + handoff_anchor, 'handoff current release note')
write(handoff, text)

agents = SRC / 'AGENTS.md'
text = read(agents)
agents_anchor = 'Build 12.227 owns desktop inline Inbox selection in `js/39-club-operations.js`.'
agents_note = (
    'Build 12.228 owns the desktop Inbox row-status slot in `css/inbox-scroll.css`. '
    'Keep DECISION, saved and important indicators inside the row border, vertically '
    'centred and separated from `.club-mail-row-copy`; never solve one status with a '
    'one-off offset. Scope the rule to the inline desktop presentation so Build 12.220 '\
    'compact/modal behaviour remains untouched. Verify computed geometry for all three '
    'states across the supported desktop widths. See `AUDIT-12.228.md`.\n\n'
)
text = replace_one(text, agents_anchor, agents_note + agents_anchor, 'agents current release note')
write(agents, text)

readme = SRC / 'README.md'
text = read(readme)
text = replace_one(text, f'# Strikewatch Source {OLD}', f'# Strikewatch Source {NEW}', 'readme title')
text = replace_one(text, f'dist/strikewatch-build-{OLD}.html', f'dist/strikewatch-build-{NEW}.html', 'readme standalone')
write(readme, text)

project = SRC / 'PROJECT.md'
text = read(project)
text = replace_one(
    text,
    'Build 12.227 preserves a clicked desktop email through the read-state save so it appears in the inline preview pane, while retaining compact/mobile explicit read control. See `HANDOFF.md` and `AUDIT-12.227.md`.',
    'Build 12.228 contains every desktop Inbox row-status indicator inside a shared inset slot, preventing decision, saved and important badges from clipping or covering message copy. See `HANDOFF.md` and `AUDIT-12.228.md`.',
    'project release note',
)
write(project, text)

architecture = SRC / 'ARCHITECTURE.md'
text = read(architecture)
text = replace_one(
    text,
    '| `css/inbox-scroll.css` | Inbox nested-scroll arming, overscroll containment and overflow mask |',
    '| `css/inbox-scroll.css` | Inbox nested-scroll arming, overflow mask and desktop row-status containment |',
    'architecture Inbox ownership',
)
write(architecture, text)

changelog = SRC / 'CHANGELOG.md'
text = read(changelog)
changelog_anchor = '## 12.227 — Desktop Inbox Preview Stability'
changelog_note = '''## 12.228 — Desktop Inbox Badge Containment

- Moves the desktop DECISION chip fully inside the mail-row border.
- Gives decision, saved and important states one shared inset status slot instead of unrelated edge offsets.
- Reserves 96px for decision labels and 52px for star indicators so message copy cannot run underneath them.
- Scopes the change to the inline desktop Inbox; compact/mobile modal mail remains unchanged.
- Verifies all three row states at 1024, 1280, 1440 and 1920px with computed browser geometry and no horizontal overflow.
- Leaves mail state, decisions, save schema 19 and diagnostics schema 1 unchanged.
- See `AUDIT-12.228.md`.

'''
text = replace_one(text, changelog_anchor, changelog_note + changelog_anchor, 'changelog release entry')
write(changelog, text)

audit = SRC / f'AUDIT-{NEW}.md'
write_new(audit, f'''# Build {NEW} audit — {NEW_NAME}

## Problem
The desktop Inbox row placed its status indicator at the extreme right edge without reserving a matching area in the message-copy layout. Because the row clips its contents, the wider gold DECISION chip could cross the card boundary and lose its right edge. The saved and important stars use the same structural slot, so correcting only the decision chip would leave the underlying layout hazard in place.

## Change
- `css/inbox-scroll.css` now owns desktop mail-row status containment as well as Inbox scrolling.
- Decision rows reserve 96px at the inline end; saved and important rows reserve 52px.
- DECISION, saved and important indicators share one absolute status slot inset 12px from the row edge.
- The slot is vertically centred, bounded by the row width and separated from `.club-mail-row-copy`.
- The selector is restricted to `.club-mail-client[data-mail-presentation='inline']`, leaving compact/mobile modal mail unchanged.
- No JavaScript, mail state, decision authority or persistence path changes.
- Save schema 19 and diagnostics schema 1 are unchanged.

## Verification
The release compiles `build.py`, builds twice, parses every modular JavaScript file, the generated bundle and every standalone inline script with Node, and compares the deterministic bundle, standalone and report outputs. A focused headless-Chrome fixture loads the real ordered stylesheet cascade and renders decision, saved and important rows at 1024, 1280, 1440 and 1920px. For every state it requires the indicator to remain at least 8px inside the row, avoid the copy rectangle, stay vertically centred and create no row or document horizontal overflow. The verified standalone is copied to root `cod.html` and checked byte-for-byte before the temporary release files are removed.
''')

updated_css = read(inbox_css)
required_css = [
    marker,
    ".club-mail-client[data-mail-presentation='inline'] .club-mail-row.saved,",
    ".club-mail-client[data-mail-presentation='inline'] .club-mail-row.important {",
    ".club-mail-client[data-mail-presentation='inline'] .club-mail-row.decision-required {",
    'padding-inline-end: 52px;',
    'padding-inline-end: 96px;',
    '> .club-mail-decision-badge,',
    '> .club-mail-saved-badge,',
    '> .club-mail-important {',
    'right: 12px;',
    'inset-inline-end: 12px;',
    'transform: translateY(-50%);',
]
for anchor in required_css:
    if anchor not in updated_css:
        raise SystemExit(f'Inbox CSS contract missing: {anchor}')
if '@media' in updated_css:
    raise SystemExit('Inbox status containment must not add a new media query')

mail_source = read(SRC / 'js/39-club-operations.js')
row_start = mail_source.index('return `<button class="club-mail-row')
row_end = mail_source.index('</button>`;', row_start)
row_markup = mail_source[row_start:row_end]
for class_name in ('club-mail-decision-badge', 'club-mail-saved-badge', 'club-mail-important'):
    if row_markup.count(class_name) != 1:
        raise SystemExit(f'{class_name}: expected exactly one mail-row status use')
if 'decisionRequired ?' not in row_markup or 'item.saved ?' not in row_markup or 'item.important ?' not in row_markup:
    raise SystemExit('mail-row status precedence changed unexpectedly')

expected_new_release = {'version': NEW, 'name': NEW_NAME, 'build_id': NEW_ID}
if json.loads(read(release)) != expected_new_release:
    raise SystemExit('new RELEASE.json metadata does not match the build')
for path in (core, inbox_css, index, handoff, agents, readme, project, architecture, changelog, audit):
    if NEW not in read(path):
        raise SystemExit(f'{path.name}: new version is missing')

print(f'Applied Build {NEW}: {NEW_NAME}')
