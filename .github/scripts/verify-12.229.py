from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
import html
import json
import os
import re
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'strikewatch-source'
VERSION = '12.229'
BUILD_ID = '12.229.0-configuration-access-mobile-mail-dismissal'


def run(command: list[str], *, cwd: Path | None = None, stdout=None) -> None:
    print('+', ' '.join(command), flush=True)
    subprocess.run(command, cwd=cwd or ROOT, check=True, stdout=stdout)


def parse_standalone_scripts() -> None:
    class Collector(HTMLParser):
        def __init__(self) -> None:
            super().__init__(convert_charrefs=False)
            self.scripts: list[str] = []
            self.current: list[str] | None = None

        def handle_starttag(self, tag, attrs):
            if tag.lower() == 'script':
                self.current = []

        def handle_data(self, data):
            if self.current is not None:
                self.current.append(data)

        def handle_endtag(self, tag):
            if tag.lower() == 'script' and self.current is not None:
                self.scripts.append(''.join(self.current))
                self.current = None

    source = (SRC / 'dist' / f'strikewatch-build-{VERSION}.html').read_text(encoding='utf-8')
    parser = Collector()
    parser.feed(source)
    assert parser.scripts, 'standalone contains no inline scripts'
    for index, script in enumerate(parser.scripts):
        path = Path(f'/tmp/standalone-{VERSION}-{index}.js')
        path.write_text(script, encoding='utf-8')
        run(['node', '--check', str(path)])


def source_contracts() -> None:
    menus = (SRC / 'js/50-ui-menus.js').read_text(encoding='utf-8')
    visible = "{ id: 'settings', label: 'CONFIGURATION', hint: 'Display and audio' }"
    hidden = "{ id: 'settings', label: 'CONFIGURATION', hint: 'Display and audio', contextOnly: true }"
    assert menus.count(visible) == 1
    assert hidden not in menus
    assert 'filter(item => !item.contextOnly)' in menus
    assert 'filter(route => !route.overview && !route.contextOnly)' in menus

    mail = (SRC / 'js/39-club-operations.js').read_text(encoding='utf-8')
    start = mail.index("      } else if (mail && modalAction.dataset.mailModalAction === 'mark-read') {")
    end = mail.index('\n      }', start) + len('\n      }')
    handler = mail[start:end]
    required = (
        'mail.read = true;',
        'careerState.selectedMailId = null;',
        'saveCareerState();',
        'updateMenuUI();',
        'closeTeamNoteModal({ restoreFocus: false });',
        "showStatus('EMAIL MARKED AS READ');",
    )
    for value in required:
        assert value in handler, value
    assert handler.index('saveCareerState();') < handler.index('updateMenuUI();') < handler.index('closeTeamNoteModal({ restoreFocus: false });')
    assert 'clubMailRowElement' not in handler
    assert 'MESSAGE RETURNED TO INBOX' not in handler
    assert 'data-mail-modal-action="mark-read"' in mail
    assert "if (inlineReader) {\n      mail.read = true;" in mail

    release = json.loads((SRC / 'RELEASE.json').read_text(encoding='utf-8'))
    assert release == {
        'version': VERSION,
        'name': 'Configuration Access & Mobile Mail Dismissal',
        'build_id': BUILD_ID,
    }
    debt = json.loads((SRC / 'dist' / f'strikewatch-build-{VERSION}-css-debt.json').read_text(encoding='utf-8'))
    assert debt['within_budget'] is True
    assert debt['media_queries'] == 484, debt['media_queries']

    standalone = (SRC / 'dist' / f'strikewatch-build-{VERSION}.html').read_text(encoding='utf-8')
    for value in (BUILD_ID, visible, 'closeTeamNoteModal({ restoreFocus: false });'):
        assert value in standalone, value

    required_docs = (
        SRC / 'HANDOFF.md', SRC / 'AGENTS.md', SRC / 'PROJECT.md',
        SRC / 'CONTRACTS.md', SRC / 'CHANGELOG.md', SRC / f'AUDIT-{VERSION}.md',
    )
    for path in required_docs:
        text = path.read_text(encoding='utf-8')
        assert text.strip(), f'{path.name} is empty'
        assert VERSION in text, f'{path.name} does not record {VERSION}'


def make_fixture() -> Path:
    menus = (SRC / 'js/50-ui-menus.js').read_text(encoding='utf-8')
    mail = (SRC / 'js/39-club-operations.js').read_text(encoding='utf-8')
    menu_start = menus.index('  const menuSections = {')
    menu_end = menus.index('\n\n  const menuTabMeta = {', menu_start)
    menu_block = menus[menu_start:menu_end]
    handler_start = mail.index('  function handleClubMailModalClick(event) {')
    handler_end = mail.index('\n  function ', handler_start + 12)
    handler_block = mail[handler_start:handler_end]

    fixture = SRC / '.configuration-mail-audit.html'
    fixture.write_text(f'''<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body>
<nav id="club-nav"></nav>
<div id="team-note" data-mode="mail" data-mail-id="mail-1">
<button id="mark-read" data-mail-modal-action="mark-read" data-mail-id="mail-1">MARK AS READ</button>
</div>
<pre id="audit-result"></pre>
<script>
{menu_block}
{handler_block}
const calls=[];
const mailRecord={{id:'mail-1',read:false,saved:false}};
const careerState={{selectedMailId:'mail-1'}};
const teamNoteOverlayEl=document.getElementById('team-note');
teamNoteOverlayEl.hidden=false;
let closeOptions=null;
function clubMailById(id){{return id===mailRecord.id?mailRecord:null;}}
function clubMailDecisionForMessage(){{return null;}}
function clubResolveDecision(){{return false;}}
function openClubMailModal(){{throw new Error('modal should not reopen');}}
function clubTrimMailStore(){{throw new Error('save toggle branch should not run');}}
function saveCareerState(){{calls.push('save');}}
function updateMenuUI(){{calls.push('update');}}
function closeTeamNoteModal(options={{}}){{closeOptions=options;calls.push('close');teamNoteOverlayEl.hidden=true;teamNoteOverlayEl.dataset.mode='';delete teamNoteOverlayEl.dataset.mailId;}}
function showStatus(message){{calls.push(`status:${{message}}`);}}
function clubMailRowElement(){{throw new Error('removed mail row must not be focused');}}
function setMenuRoute(){{throw new Error('route branch should not run');}}
const visibleRoutes=menuSections.systems.routes.filter(route=>!route.contextOnly);
const nav=document.getElementById('club-nav');
nav.innerHTML=visibleRoutes.map(route=>`<button data-route="${{route.id}}">${{route.label}}</button>`).join('');
const handled=handleClubMailModalClick({{target:document.getElementById('mark-read')}});
const result={{
 viewport:innerWidth,
 configurationVisible:visibleRoutes.some(route=>route.id==='settings'),
 configurationButtonVisible:Boolean(nav.querySelector('[data-route="settings"]')),
 handled,
 mailRead:mailRecord.read===true,
 selectionCleared:careerState.selectedMailId===null,
 modalHidden:teamNoteOverlayEl.hidden===true,
 modalModeCleared:teamNoteOverlayEl.dataset.mode==='',
 restoreFocusDisabled:closeOptions?.restoreFocus===false,
 exactOrder:JSON.stringify(calls)===JSON.stringify(['save','update','close','status:EMAIL MARKED AS READ']),
 calls
}};
document.getElementById('audit-result').textContent=JSON.stringify(result);
</script></body></html>''', encoding='utf-8', newline='\n')
    return fixture


def browser_contracts() -> None:
    browser = next((shutil.which(name) for name in ('google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser') if shutil.which(name)), None)
    assert browser, 'no Chromium browser found'
    fixture = make_fixture()

    class ResultParser(HTMLParser):
        def __init__(self) -> None:
            super().__init__()
            self.inside = False
            self.parts: list[str] = []

        def handle_starttag(self, tag, attrs):
            if dict(attrs).get('id') == 'audit-result':
                self.inside = True

        def handle_endtag(self, tag):
            if self.inside and tag == 'pre':
                self.inside = False

        def handle_data(self, data):
            if self.inside:
                self.parts.append(data)

    try:
        for width, height in ((390, 844), (1440, 900)):
            output = Path(f'/tmp/configuration-mail-{width}x{height}.html')
            with output.open('wb') as stream:
                run([
                    browser, '--headless=new', '--no-sandbox', '--disable-gpu',
                    '--allow-file-access-from-files', '--run-all-compositor-stages-before-draw',
                    '--virtual-time-budget=1000', f'--window-size={width},{height}', '--dump-dom',
                    fixture.resolve().as_uri(),
                ], stdout=stream)
            parser = ResultParser()
            parser.feed(output.read_text(encoding='utf-8'))
            payload = html.unescape(''.join(parser.parts)).strip()
            assert payload, f'{width}x{height}: browser result missing'
            result = json.loads(payload)
            for key in (
                'configurationVisible', 'configurationButtonVisible', 'handled',
                'mailRead', 'selectionCleared', 'modalHidden', 'modalModeCleared',
                'restoreFocusDisabled', 'exactOrder',
            ):
                assert result[key], f'{width}x{height} failed {key}: {result}'
            print(json.dumps(result, indent=2))
    finally:
        fixture.unlink(missing_ok=True)


def main() -> None:
    for file in sorted((SRC / 'js').glob('*.js')):
        run(['node', '--check', str(file)])
    parse_standalone_scripts()
    source_contracts()
    browser_contracts()
    print('Build 12.229 verification passed')


if __name__ == '__main__':
    main()
