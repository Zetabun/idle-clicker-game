from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'strikewatch-source'
OLD = '12.219'
NEW = '12.220'
OLD_NAME = 'Ops Alert Indicator'
NEW_NAME = 'Mobile Mail Read Control'
OLD_ID = '12.219.0-ops-alert-indicator'
NEW_ID = '12.220.0-mobile-mail-read-control'


def read(path):
    return path.read_text(encoding='utf-8')


def write(path, text):
    path.write_text(text, encoding='utf-8')


def replace_one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)


release = SRC / 'RELEASE.json'
expected = {'version': OLD, 'name': OLD_NAME, 'build_id': OLD_ID}
if json.loads(read(release)) != expected:
    raise SystemExit('unexpected predecessor release')
write(release, json.dumps({'version': NEW, 'name': NEW_NAME, 'build_id': NEW_ID}, indent=2) + '\n')

core = SRC / 'js/00-core.js'
text = read(core)
text = replace_one(text, f"  const BUILD_VERSION = '{OLD}';", f"  const BUILD_VERSION = '{NEW}';", 'version')
text = replace_one(text, f"  const BUILD_NAME = '{OLD_NAME}';", f"  const BUILD_NAME = '{NEW_NAME}';", 'name')
text = replace_one(text, f"  const BUILD_ID = '{OLD_ID}';", f"  const BUILD_ID = '{NEW_ID}';", 'build id')
write(core, text)

mail = SRC / 'js/39-club-operations.js'
text = read(mail)
old_markup = '''    return `${decisionMarkup}<footer class="team-note-mail-toolbar"><button type="button" class="${mail.saved ? 'saved' : ''}" data-mail-modal-action="toggle-save" data-mail-id="${escapeCareerHtml(mail.id)}">${mail.saved ? '★ SAVED EMAIL' : '☆ SAVE EMAIL'}</button><button type="button" data-mail-modal-action="mark-unread" data-mail-id="${escapeCareerHtml(mail.id)}">MARK AS UNREAD</button>${relatedRoute ? `<button type="button" class="primary" data-mail-modal-route="${escapeCareerHtml(relatedRoute)}">OPEN RELATED PAGE</button>` : ''}</footer>`;'''
new_markup = '''    return `${decisionMarkup}<footer class="team-note-mail-toolbar"><button type="button" class="${mail.saved ? 'saved' : ''}" data-mail-modal-action="toggle-save" data-mail-id="${escapeCareerHtml(mail.id)}">${mail.saved ? '★ SAVED EMAIL' : '☆ SAVE EMAIL'}</button><button type="button" data-mail-modal-action="mark-read" data-mail-id="${escapeCareerHtml(mail.id)}" ${mail.read ? 'disabled' : ''}>MARK AS READ</button>${relatedRoute ? `<button type="button" class="primary" data-mail-modal-route="${escapeCareerHtml(relatedRoute)}">OPEN RELATED PAGE</button>` : ''}</footer>`;'''
text = replace_one(text, old_markup, new_markup, 'mobile modal toolbar')
text = replace_one(text, '  function openClubMailModal(mailId, returnFocus = null, markRead = true) {', '  function openClubMailModal(mailId, returnFocus = null, markRead = false) {', 'modal default read state')
old_select = '''    careerState.selectedMailId = mail.id;
    mail.read = true;
    saveCareerState();
    updateMenuUI();
    if (inlineReader) {
      const restoreInlinePosition = () => {'''
new_select = '''    careerState.selectedMailId = mail.id;
    if (inlineReader) {
      mail.read = true;
      saveCareerState();
      updateMenuUI();
      const restoreInlinePosition = () => {'''
text = replace_one(text, old_select, new_select, 'mobile read deferral')
old_return = '''      return true;
    }
    return openClubMailModal(mail.id, clubMailRowElement(mail.id) || fallbackTrigger, false);'''
new_return = '''      return true;
    }
    saveCareerState();
    return openClubMailModal(mail.id, clubMailRowElement(mail.id) || fallbackTrigger, false);'''
text = replace_one(text, old_return, new_return, 'mobile selected mail persistence')
old_handler = '''      } else if (mail && modalAction.dataset.mailModalAction === 'mark-unread') {
        mail.read = false;
        clubMailView = 'inbox';
        saveCareerState();
        closeTeamNoteModal();
        updateMenuUI();'''
new_handler = '''      } else if (mail && modalAction.dataset.mailModalAction === 'mark-read') {
        mail.read = true;
        saveCareerState();
        closeTeamNoteModal();
        updateMenuUI();
        showStatus('EMAIL MARKED AS READ');'''
text = replace_one(text, old_handler, new_handler, 'mobile mark read handler')
write(mail, text)

index = SRC / 'index.html'
text = read(index).replace(f'Strikewatch {OLD}: {OLD_NAME}', f'Strikewatch {NEW}: {NEW_NAME}').replace(OLD_ID, NEW_ID)
text = replace_one(text, f'id="managerBuildVersion">{OLD}</b>', f'id="managerBuildVersion">{NEW}</b>', 'desktop label')
text = replace_one(text, f'id="mobileCommandBuildVersion">{OLD}</b>', f'id="mobileCommandBuildVersion">{NEW}</b>', 'mobile label')
write(index, text)

note = f"Build {NEW} changes compact/mobile email dialogs to preserve unread state until the player explicitly presses MARK AS READ. Desktop inline mail continues to mark a selected message as read automatically. See `AUDIT-{NEW}.md`.\n\n"
for path in (SRC / 'HANDOFF.md', SRC / 'AGENTS.md'):
    text = read(path)
    text = replace_one(text, f'Build {OLD} replaces', note + f'Build {OLD} replaces', path.name)
    if path.name == 'HANDOFF.md':
        text = replace_one(text, f'- Build: **{OLD} — {OLD_NAME}**', f'- Build: **{NEW} — {NEW_NAME}**', 'handoff build')
        text = replace_one(text, f'- Build ID: `{OLD_ID}`', f'- Build ID: `{NEW_ID}`', 'handoff id')
        text = replace_one(text, f'strikewatch-build-{OLD}.html', f'strikewatch-build-{NEW}.html', 'handoff standalone')
    write(path, text)

readme = SRC / 'README.md'
text = read(readme)
text = replace_one(text, f'# Strikewatch Source {OLD}', f'# Strikewatch Source {NEW}', 'readme title')
text = replace_one(text, f'dist/strikewatch-build-{OLD}.html', f'dist/strikewatch-build-{NEW}.html', 'readme dist')
write(readme, text)

project = SRC / 'PROJECT.md'
text = read(project)
text = replace_one(
    text,
    f'Build {OLD} replaces the malformed Ops blocker marker with a stable compact alert badge. See `HANDOFF.md` and `AUDIT-{OLD}.md`.',
    f'Build {NEW} gives compact/mobile email dialogs an explicit Mark as Read action instead of automatically reading messages on open. See `HANDOFF.md` and `AUDIT-{NEW}.md`.',
    'project release note'
)
write(project, text)

write(SRC / f'AUDIT-{NEW}.md', f'''# Build {NEW} audit — {NEW_NAME}

## Problem
Compact/mobile email dialogs marked a message as read as soon as it opened, then offered a counter-intuitive MARK AS UNREAD control.

## Change
- Compact/mobile mail now remains unread when its dialog opens.
- The dialog toolbar now provides MARK AS READ.
- Pressing MARK AS READ updates the authoritative mail record, closes the dialog and refreshes the Inbox counters.
- Already-read messages opened from Saved mail show the same disabled action rather than an unread toggle.
- Desktop inline mail keeps its established automatic read-on-selection behaviour.
- Decision controls, Saved mail, related-page routes and inbox persistence are unchanged.

## Verification
The release requires deterministic bundle and standalone builds, parsing of every modular JavaScript file plus generated/standalone JavaScript, targeted source assertions for the mobile action, and root/standalone byte identity. Save schema 19 and diagnostics schema 1 remain unchanged.
''')

updated = read(mail)
required = [
    'data-mail-modal-action="mark-read"',
    '>MARK AS READ</button>',
    "modalAction.dataset.mailModalAction === 'mark-read'",
    "showStatus('EMAIL MARKED AS READ')",
    'if (inlineReader) {\n      mail.read = true;'
]
for anchor in required:
    if anchor not in updated:
        raise SystemExit(f'missing expected anchor: {anchor}')
if 'data-mail-modal-action="mark-unread"' in updated:
    raise SystemExit('legacy modal mark-unread action remains')

print(f'Applied Build {NEW}: {NEW_NAME}')
