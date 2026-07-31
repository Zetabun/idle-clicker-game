from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'strikewatch-source'

RELEASE_OLD = {
    'version': '12.223',
    'name': 'Desktop Must Respond Layout',
    'build_id': '12.223.0-desktop-must-respond-layout',
}
SOURCE_OLD = '12.226'
SOURCE_OLD_NAME = 'Desktop Version Label and Submenu Sweep'
SOURCE_OLD_ID = '12.226.0-desktop-version-label-and-submenu-sweep'
NEW = '12.227'
NEW_NAME = 'Desktop Inbox Preview Stability'
NEW_ID = '12.227.0-desktop-inbox-preview-stability'


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
actual_release = json.loads(read(release))
if actual_release != RELEASE_OLD:
    raise SystemExit(
        'unexpected RELEASE.json predecessor: '
        f'expected {RELEASE_OLD!r}, found {actual_release!r}'
    )
write(release, json.dumps({'version': NEW, 'name': NEW_NAME, 'build_id': NEW_ID}, indent=2) + '\n')

core = SRC / 'js/00-core.js'
text = read(core)
text = replace_one(text, f"  const BUILD_VERSION = '{SOURCE_OLD}';", f"  const BUILD_VERSION = '{NEW}';", 'source version')
text = replace_one(text, f"  const BUILD_NAME = '{SOURCE_OLD_NAME}';", f"  const BUILD_NAME = '{NEW_NAME}';", 'source name')
text = replace_one(text, f"  const BUILD_ID = '{SOURCE_OLD_ID}';", f"  const BUILD_ID = '{NEW_ID}';", 'source build id')
write(core, text)

mail = SRC / 'js/39-club-operations.js'
text = read(mail)
old_selection = '''    careerState.selectedMailId = mail.id;
    if (inlineReader) {
      mail.read = true;
      saveCareerState();
      updateMenuUI();
      const restoreInlinePosition = () => {'''
new_selection = '''    careerState.selectedMailId = mail.id;
    if (inlineReader) {
      mail.read = true;
      saveCareerState();
      // Build 12.227: selectedMailId is transient UI state. Saving may
      // normalise or replace the persistent career object, so restore the
      // desktop selection before the Inbox filters read mail and rerenders.
      careerState.selectedMailId = mail.id;
      updateMenuUI();
      const restoreInlinePosition = () => {'''
text = replace_one(text, old_selection, new_selection, 'desktop inline mail selection')
write(mail, text)

index = SRC / 'index.html'
text = read(index)
text = replace_one(
    text,
    f'Strikewatch {SOURCE_OLD}: {SOURCE_OLD_NAME}',
    f'Strikewatch {NEW}: {NEW_NAME}',
    'document title',
)
text = replace_all_present(text, SOURCE_OLD_ID, NEW_ID, 'asset build id')
text = replace_one(text, f'id="managerBuildVersion">{SOURCE_OLD}</b>', f'id="managerBuildVersion">{NEW}</b>', 'desktop build label')
text = replace_one(text, f'id="mobileCommandBuildVersion">{SOURCE_OLD}</b>', f'id="mobileCommandBuildVersion">{NEW}</b>', 'mobile build label')
write(index, text)

handoff = SRC / 'HANDOFF.md'
text = read(handoff)
text = replace_one(text, f'- Build: **{SOURCE_OLD} — {SOURCE_OLD_NAME}**', f'- Build: **{NEW} — {NEW_NAME}**', 'handoff build')
text = replace_one(text, f'- Build ID: `{SOURCE_OLD_ID}`', f'- Build ID: `{NEW_ID}`', 'handoff build id')
text = replace_one(text, f'strikewatch-build-{SOURCE_OLD}.html', f'strikewatch-build-{NEW}.html', 'handoff standalone')
handoff_anchor = 'Build 12.226 raises the desktop version badge off a 7.5px floor and closes a responsive gap in the department submenu.'
handoff_note = (
    'Build 12.227 keeps the desktop Inbox selection alive across the read-state save, '
    'so a clicked email remains eligible for the inline list and renders in the preview pane. '
    "Compact/mobile dialogs retain Build 12.220's explicit MARK AS READ behaviour. "
    'The release also reconciles `RELEASE.json`, `README.md` and `PROJECT.md`, which still '
    'reported 12.223 while the source and playable artifact were already 12.226. '
    'Save schema 19 and diagnostics schema 1 are unchanged. See `AUDIT-12.227.md`.\n\n'
)
text = replace_one(text, handoff_anchor, handoff_note + handoff_anchor, 'handoff current release note')
write(handoff, text)

agents = SRC / 'AGENTS.md'
text = read(agents)
agents_anchor = 'Build 12.226 owns the compact navigation breakpoint and the desktop version\nbadge.'
agents_note = (
    'Build 12.227 owns desktop inline Inbox selection in `js/39-club-operations.js`. '
    'Preserve this order when a row is opened at 1024px and wider: select the mail, mark it '
    'read, save persistent career state, reassert the transient `selectedMailId`, then render. '
    'Read messages remain eligible only while selected through `clubMailVisibleInInbox()`. '
    "Do not move automatic read-on-open into compact/mobile: Build 12.220's modal must keep "
    'the message unread until MARK AS READ is pressed. Verify both presentation branches and '
    'the selected read-message filter together. Save schema 19 and diagnostics schema 1 are '
    'unchanged. See `AUDIT-12.227.md`.\n\n'
)
text = replace_one(text, agents_anchor, agents_note + agents_anchor, 'agents current release note')
write(agents, text)

readme = SRC / 'README.md'
text = read(readme)
text = replace_one(text, '# Strikewatch Source 12.223', f'# Strikewatch Source {NEW}', 'readme title')
text = replace_one(text, 'dist/strikewatch-build-12.223.html', f'dist/strikewatch-build-{NEW}.html', 'readme standalone')
write(readme, text)

project = SRC / 'PROJECT.md'
text = read(project)
text = replace_one(
    text,
    'Build 12.223 repairs the expanded desktop MUST RESPOND disclosure while preserving the existing compact/mobile presentation and blocker authority. See `HANDOFF.md` and `AUDIT-12.223.md`.',
    'Build 12.227 preserves a clicked desktop email through the read-state save so it appears in the inline preview pane, while retaining compact/mobile explicit read control. See `HANDOFF.md` and `AUDIT-12.227.md`.',
    'project release note',
)
write(project, text)

changelog = SRC / 'CHANGELOG.md'
text = read(changelog)
changelog_anchor = '## 12.226 — Desktop Version Label and Submenu Sweep'
changelog_note = '''## 12.227 — Desktop Inbox Preview Stability

- Keeps the clicked desktop email selected after its automatic read-state save.
- Ensures the selected read message remains in the Inbox list long enough to populate the inline preview pane.
- Preserves compact/mobile dialogs and their explicit MARK AS READ action from Build 12.220.
- Reconciles stale release metadata that still reported 12.223 while source and playable artifacts were 12.226.
- Leaves mail persistence, decisions, saved messages, save schema 19 and diagnostics schema 1 unchanged.
- See `AUDIT-12.227.md`.

'''
text = replace_one(text, changelog_anchor, changelog_note + changelog_anchor, 'changelog release entry')
write(changelog, text)

audit = SRC / f'AUDIT-{NEW}.md'
write_new(audit, f'''# Build {NEW} audit — {NEW_NAME}

## Problem
On the desktop inline Inbox, selecting an unread message marked it read and saved the career before rebuilding the mail layout. Inbox visibility normally excludes read messages and permits one only while its transient `selectedMailId` remains active. If the save boundary normalised or replaced the persistent career object, that transient selection was lost before `renderMailTab()` resolved the preview. The clicked row therefore disappeared and the preview pane stayed empty.

The compact/mobile branch is intentionally different: Build 12.220 keeps a modal-opened message unread until the player presses MARK AS READ.

## Change
- Desktop selection is reasserted immediately after `saveCareerState()` and before `updateMenuUI()`.
- The clicked message therefore remains eligible through `clubMailVisibleInInbox()` even though it has just become read.
- The existing inline reader renders the full sender, subject, body and actions without creating a second mail authority.
- Desktop automatic read-on-selection is preserved.
- Compact/mobile modal opening, explicit MARK AS READ, Saved mail, decision controls, related-page routes and mail persistence are unchanged.
- Stale `RELEASE.json`, `README.md` and `PROJECT.md` metadata is reconciled from 12.223 to this release while the source predecessor is independently verified as 12.226.
- Save schema 19 and diagnostics schema 1 are unchanged.

## Verification
The release checks the exact desktop selection/save/reselection/render order and the selected-read visibility clause, while also asserting the compact/mobile modal still defaults to unread and exposes MARK AS READ. It then compiles `build.py`, builds twice, parses every modular JavaScript file, the generated bundle and every standalone inline script with Node, compares deterministic bundle/standalone/report outputs, copies the verified standalone to root `cod.html`, confirms byte identity and removes the temporary release files before committing to `main`.
''')

# Targeted patch-time assertions. These fail here, before the expensive build,
# if the live source has drifted away from the intended contract.
updated_mail = read(mail)
function_start = updated_mail.index('  function selectClubMailAndOpen(')
function_end = updated_mail.index('\n  function handleClubMailModalClick(', function_start)
selection_block = updated_mail[function_start:function_end]
ordered = [
    'careerState.selectedMailId = mail.id;',
    'if (inlineReader) {',
    'mail.read = true;',
    'saveCareerState();',
    'Build 12.227: selectedMailId is transient UI state.',
    'careerState.selectedMailId = mail.id;',
    'updateMenuUI();',
]
position = -1
for anchor in ordered:
    next_position = selection_block.find(anchor, position + 1)
    if next_position < 0:
        raise SystemExit(f'desktop selection order missing: {anchor}')
    position = next_position
if selection_block.count('careerState.selectedMailId = mail.id;') != 2:
    raise SystemExit('desktop selection must be assigned exactly before and after save')
for anchor in (
    '(clubMailUsesInlineReader() && careerState.selectedMailId === mail.id)',
    'function openClubMailModal(mailId, returnFocus = null, markRead = false)',
    'data-mail-modal-action="mark-read"',
    "modalAction.dataset.mailModalAction === 'mark-read'",
    "showStatus('EMAIL MARKED AS READ')",
):
    if anchor not in updated_mail:
        raise SystemExit(f'mail contract missing: {anchor}')
if 'data-mail-modal-action="mark-unread"' in updated_mail:
    raise SystemExit('legacy compact/mobile mark-unread action returned')

expected_new_release = {'version': NEW, 'name': NEW_NAME, 'build_id': NEW_ID}
if json.loads(read(release)) != expected_new_release:
    raise SystemExit('new RELEASE.json metadata does not match the build')
for path in (core, index, handoff, agents, readme, project, changelog, audit):
    if NEW not in read(path):
        raise SystemExit(f'{path.name}: new version is missing')

print(f'Applied Build {NEW}: {NEW_NAME}')
