from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'strikewatch-source'
OLD = '12.228'
NEW = '12.229'
OLD_NAME = 'Desktop Inbox Badge Containment'
NEW_NAME = 'Configuration Access & Mobile Mail Dismissal'
OLD_ID = '12.228.0-desktop-inbox-badge-containment'
NEW_ID = '12.229.0-configuration-access-mobile-mail-dismissal'


def read(path: Path) -> str:
    return path.read_text(encoding='utf-8')


def write(path: Path, text: str) -> None:
    path.write_text(text, encoding='utf-8', newline='\n')


def write_new(path: Path, text: str) -> None:
    if path.exists():
        raise SystemExit(f'{path.name}: expected a new file')
    write(path, text)


def replace_one(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)


def replace_all_present(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count < 1:
        raise SystemExit(f'{label}: expected at least 1 match')
    return text.replace(old, new)


release = SRC / 'RELEASE.json'
expected_release = {'version': OLD, 'name': OLD_NAME, 'build_id': OLD_ID}
actual_release = json.loads(read(release))
if actual_release != expected_release:
    raise SystemExit(f'unexpected predecessor release: {actual_release!r}')
write(release, json.dumps({'version': NEW, 'name': NEW_NAME, 'build_id': NEW_ID}, indent=2) + '\n')

core = SRC / 'js/00-core.js'
text = read(core)
text = replace_one(text, f"  const BUILD_VERSION = '{OLD}';", f"  const BUILD_VERSION = '{NEW}';", 'source version')
text = replace_one(text, f"  const BUILD_NAME = '{OLD_NAME}';", f"  const BUILD_NAME = '{NEW_NAME}';", 'source name')
text = replace_one(text, f"  const BUILD_ID = '{OLD_ID}';", f"  const BUILD_ID = '{NEW_ID}';", 'source build id')
write(core, text)

menus = SRC / 'js/50-ui-menus.js'
text = read(menus)
text = replace_one(
    text,
    "        { id: 'settings', label: 'CONFIGURATION', hint: 'Display and audio', contextOnly: true }",
    "        { id: 'settings', label: 'CONFIGURATION', hint: 'Display and audio' }",
    'Configuration route visibility',
)
write(menus, text)

mail = SRC / 'js/39-club-operations.js'
text = read(mail)
old_handler = """      } else if (mail && modalAction.dataset.mailModalAction === 'mark-read') {
        mail.read = true;
        saveCareerState();
        closeTeamNoteModal();
        updateMenuUI();
        showStatus('EMAIL MARKED AS READ');
        requestAnimationFrame(() => clubMailRowElement(mail.id)?.focus({ preventScroll: true }));
        showStatus('MESSAGE RETURNED TO INBOX');
      }"""
new_handler = """      } else if (mail && modalAction.dataset.mailModalAction === 'mark-read') {
        mail.read = true;
        if (careerState.selectedMailId === mail.id) careerState.selectedMailId = null;
        saveCareerState();
        updateMenuUI();
        closeTeamNoteModal({ restoreFocus: false });
        showStatus('EMAIL MARKED AS READ');
      }"""
text = replace_one(text, old_handler, new_handler, 'compact mail dismissal handler')
write(mail, text)

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
handoff_anchor = 'Build 12.228 owns desktop Inbox row-status containment'
handoff_note = (
    'Build 12.229 restores Configuration as a normal Club route rather than a hidden context-only page, so it appears in the desktop subsection navigation, compact contextual navigation and Club overview cards. Compact/mobile MARK AS READ now clears the transient mail selection, refreshes the Inbox and closes the shared dialog afterwards with focus restoration disabled because the read row may no longer exist. The legacy second status message and removed-row focus attempt are gone. Desktop inline selection and automatic read behaviour remain unchanged. Save schema 19 and diagnostics schema 1 are unchanged. See `AUDIT-12.229.md`.\n\n'
)
text = replace_one(text, handoff_anchor, handoff_note + handoff_anchor, 'handoff release note')
write(handoff, text)

agents = SRC / 'AGENTS.md'
text = read(agents)
agents_anchor = 'Build 12.228 owns the desktop Inbox row-status slot'
agents_note = (
    'Build 12.229 owns normal Configuration-route visibility in `js/50-ui-menus.js` and compact mail dismissal in `js/39-club-operations.js`. Keep `settings` out of `contextOnly` so Club navigation and the section hub expose it on both presentation targets. In compact/mobile mail, MARK AS READ must clear a matching `selectedMailId`, save, refresh the Inbox, then close the dialog with `restoreFocus: false`; never focus the row after reading because the Inbox filter may remove it. Desktop inline mail keeps automatic read-on-selection. See `AUDIT-12.229.md`.\n\n'
)
text = replace_one(text, agents_anchor, agents_note + agents_anchor, 'agents release note')
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
    'Build 12.228 contains every desktop Inbox row-status indicator inside a shared inset slot, preventing decision, saved and important badges from clipping or covering message copy. See `HANDOFF.md` and `AUDIT-12.228.md`.',
    'Build 12.229 restores Configuration to normal Club navigation and makes compact/mobile MARK AS READ close its mail dialog after the Inbox refresh. See `HANDOFF.md` and `AUDIT-12.229.md`.',
    'project current release',
)
write(project, text)

contracts = SRC / 'CONTRACTS.md'
text = read(contracts)
contract_anchor = "- Primary navigation, subsection navigation, previous/next history, Inbox,\n  Calendar, End Day and Help controls must remain reachable.\n"
contract_note = (
    contract_anchor
    + '- Club Configuration is a normal Club subsection route and section-hub destination on both presentation targets; do not hide it as context-only without another visible entry point.\n'
    + '- In compact/mobile mail dialogs, MARK AS READ writes the mail state, clears a matching transient selection, refreshes the Inbox and then closes the dialog without restoring focus to a row that may have been filtered out. Desktop inline mail retains automatic read-on-selection.\n'
)
text = replace_one(text, contract_anchor, contract_note, 'responsive interface contracts')
write(contracts, text)

changelog = SRC / 'CHANGELOG.md'
text = read(changelog)
changelog_anchor = '## 12.228 — Desktop Inbox Badge Containment'
changelog_note = '''## 12.229 — Configuration Access & Mobile Mail Dismissal

- Restores Configuration as a normal Club route in desktop and compact/mobile navigation.
- Returns Configuration to the Club overview route cards instead of leaving it reachable only through hidden context state.
- Makes compact/mobile MARK AS READ clear the transient selected message, refresh the Inbox and then dismiss the mail dialog.
- Removes the stale removed-row focus attempt and contradictory MESSAGE RETURNED TO INBOX status.
- Preserves desktop inline mail selection and automatic read-on-open behaviour.
- Leaves mail persistence, gameplay, save schema 19 and diagnostics schema 1 unchanged.
- See `AUDIT-12.229.md`.

'''
text = replace_one(text, changelog_anchor, changelog_note + changelog_anchor, 'changelog entry')
write(changelog, text)

audit = SRC / f'AUDIT-{NEW}.md'
write_new(audit, f'''# Build {NEW} audit — {NEW_NAME}

## Problems

1. Configuration still existed and rendered correctly, but its Club route was marked `contextOnly`. Every normal Club navigation surface filters context-only routes, so Configuration disappeared from the desktop subsection navigation, compact contextual navigation and Club overview cards.
2. Compact/mobile MARK AS READ closed the dialog before refreshing the Inbox, retained the selected mail id, then attempted to focus the row after the read filter could remove it. The same branch also emitted the contradictory legacy status MESSAGE RETURNED TO INBOX.

## Changes

- `js/50-ui-menus.js` removes `contextOnly` from the `settings` route. Configuration now uses the established route renderer and appears wherever normal Club routes are listed.
- `js/39-club-operations.js` clears `careerState.selectedMailId` when it points to the message being read, saves, refreshes the Inbox, then closes the shared mail dialog with `restoreFocus: false`.
- The stale row-focus request and MESSAGE RETURNED TO INBOX status are removed.
- Desktop inline mail still marks selected mail read automatically and keeps its Build 12.227 selection-restoration order.
- No renderer, economy, match, mail-decision or persistence schema authority changes.
- Save schema 19 and diagnostics schema 1 are unchanged.

## Verification

The release builds twice and requires byte-identical bundles, standalone files and generated reports. Every modular JavaScript file, the generated bundle and all standalone inline scripts parse with Node. Targeted source checks evaluate the real `menuSections` object and compact mail handler. A headless-Chrome fixture runs at 390px and 1440px using those extracted source blocks: Configuration must render among normal Club routes, while clicking the real MARK AS READ branch must mark the mail read, clear selection, call save then Inbox refresh then dialog close, pass `restoreFocus: false`, emit one status and leave the modal hidden. Root `cod.html` must be byte-identical to the verified standalone.
''')

menus_text = read(menus)
settings_line = "{ id: 'settings', label: 'CONFIGURATION', hint: 'Display and audio' }"
if menus_text.count(settings_line) != 1:
    raise SystemExit('Configuration route is not uniquely visible')
if "{ id: 'settings', label: 'CONFIGURATION', hint: 'Display and audio', contextOnly: true }" in menus_text:
    raise SystemExit('Configuration remains context-only')

mail_text = read(mail)
handler_start = mail_text.index("      } else if (mail && modalAction.dataset.mailModalAction === 'mark-read') {")
handler_end = mail_text.index("\n      }", handler_start) + len("\n      }")
handler = mail_text[handler_start:handler_end]
for required in (
    'mail.read = true;',
    'careerState.selectedMailId = null;',
    'saveCareerState();',
    'updateMenuUI();',
    'closeTeamNoteModal({ restoreFocus: false });',
    "showStatus('EMAIL MARKED AS READ');",
):
    if required not in handler:
        raise SystemExit(f'mark-read handler missing {required}')
if handler.index('saveCareerState();') > handler.index('updateMenuUI();'):
    raise SystemExit('mail must save before Inbox refresh')
if handler.index('updateMenuUI();') > handler.index('closeTeamNoteModal({ restoreFocus: false });'):
    raise SystemExit('dialog must close after Inbox refresh')
if 'clubMailRowElement' in handler or 'MESSAGE RETURNED TO INBOX' in handler:
    raise SystemExit('legacy removed-row handling remains')
if 'data-mail-modal-action="mark-read"' not in mail_text:
    raise SystemExit('compact MARK AS READ button missing')
if "if (inlineReader) {\n      mail.read = true;" not in mail_text:
    raise SystemExit('desktop inline automatic-read branch changed')

expected_new_release = {'version': NEW, 'name': NEW_NAME, 'build_id': NEW_ID}
if json.loads(read(release)) != expected_new_release:
    raise SystemExit('new release metadata mismatch')
for path in (core, menus, mail, index, handoff, agents, readme, project, contracts, changelog, audit):
    if not path.exists() or not read(path).strip():
        raise SystemExit(f'{path.name}: missing or empty')

print(f'Applied Build {NEW}: {NEW_NAME}')
