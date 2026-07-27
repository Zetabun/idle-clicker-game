from pathlib import Path

root = Path('strikewatch-source')

core = root / 'js' / '00-core.js'
text = core.read_text(encoding='utf-8')
replacements = {
    "const BUILD_VERSION = '12.130';": "const BUILD_VERSION = '12.131';",
    "const BUILD_NAME = 'Aurora Terminal';": "const BUILD_NAME = 'Calendar Clarity';",
    "const BUILD_ID = '12.130.0-aurora-terminal';": "const BUILD_ID = '12.131.0-calendar-clarity';",
}
for old, new in replacements.items():
    if old not in text:
        if new in text:
            continue
        raise SystemExit(f'Missing core metadata: {old}')
    text = text.replace(old, new, 1)
core.write_text(text, encoding='utf-8')

index = root / 'index.html'
text = index.read_text(encoding='utf-8')
index_replacements = {
    '<title>Strikewatch 12.130: Aurora Terminal</title>': '<title>Strikewatch 12.131: Calendar Clarity</title>',
    'css/game.css?v=12.130.0-aurora-terminal': 'css/game.css?v=12.131.0-calendar-clarity',
    'js/strikewatch.dev.js?v=12.130.0-aurora-terminal': 'js/strikewatch.dev.js?v=12.131.0-calendar-clarity',
    'id="managerBuildVersion">12.130</b>': 'id="managerBuildVersion">12.131</b>',
    'id="mobileCommandBuildVersion">12.130</b>': 'id="mobileCommandBuildVersion">12.131</b>',
}
for old, new in index_replacements.items():
    if old not in text:
        if new in text:
            continue
        raise SystemExit(f'Missing index metadata: {old}')
    text = text.replace(old, new, 1)
index.write_text(text, encoding='utf-8')

hotfix = root / 'js' / '75-ui-clarity-hotfix.js'
text = hotfix.read_text(encoding='utf-8')
text = text.replace('12.130 release', '12.131 release')
text = text.replace('strikewatch-12-130-ui-clarity', 'strikewatch-12-131-ui-clarity')
start = text.index('      .manager-end-day-primary,')
end = text.index('      @media (max-width: 1023px)', start)
css = """      .manager-end-day-primary,
      .manager-end-day-primary.blocked,
      .manager-end-day-primary.matchday,
      .manager-end-day-primary:disabled,
      .manager-end-day-primary[aria-disabled='true'] {
        opacity: 1 !important;
        filter: none !important;
        background: linear-gradient(180deg, rgba(30, 39, 55, .99), rgba(22, 29, 43, .99)) !important;
        border: 1px solid rgba(135, 163, 181, .42) !important;
        color: #f7fbff !important;
        box-shadow: inset 0 1px rgba(255,255,255,.07), 0 0 0 1px rgba(0,0,0,.30), 0 8px 22px rgba(0,0,0,.22) !important;
        text-shadow: 0 1px 2px rgba(0,0,0,.76) !important;
      }

      .manager-end-day-primary span,
      .manager-end-day-primary strong,
      .manager-end-day-primary small,
      .manager-end-day-primary.blocked span,
      .manager-end-day-primary.blocked strong,
      .manager-end-day-primary.blocked small,
      .manager-end-day-primary.matchday span,
      .manager-end-day-primary.matchday strong,
      .manager-end-day-primary.matchday small,
      .manager-end-day-primary:disabled span,
      .manager-end-day-primary:disabled strong,
      .manager-end-day-primary:disabled small,
      .manager-end-day-primary[aria-disabled='true'] span,
      .manager-end-day-primary[aria-disabled='true'] strong,
      .manager-end-day-primary[aria-disabled='true'] small {
        opacity: 1 !important;
      }

      .manager-end-day-primary span,
      .manager-end-day-primary small {
        color: #a9d2bf !important;
      }

      .manager-end-day-primary strong {
        color: #ffffff !important;
      }

      .manager-end-day-primary .manager-end-day-block-badge {
        background: #ec7444 !important;
        border-color: #ff9b72 !important;
        color: #17202b !important;
        text-shadow: none !important;
      }

"""
text = text[:start] + css + text[end:]
hotfix.write_text(text, encoding='utf-8')

handoff = root / 'HANDOFF.md'
text = handoff.read_text(encoding='utf-8')
text = text.replace('- Build: **12.130 — Aurora Terminal**', '- Build: **12.131 — Calendar Clarity**', 1)
text = text.replace('- Build ID: `12.130.0-aurora-terminal`', '- Build ID: `12.131.0-calendar-clarity`', 1)
text = text.replace('strikewatch-source/dist/strikewatch-build-12.130.html', 'strikewatch-source/dist/strikewatch-build-12.131.html', 1)
anchor = 'Build 12.130 adds the fourth arena'
note = 'Build 12.131 consolidates the tactical UI clarity fixes into a numbered release and gives the desktop End Day / Next Day control one persistent high-contrast slate treatment across enabled, locked, blocked and matchday states. The button keeps white primary copy, mint calendar/status copy and its orange response badge, preventing inherited disabled-state opacity from making it unreadable. Tactical summary tags and Active Operator Match Roles retain the 12.130 UI hotfix alignment improvements. See `AUDIT-12.131.md`.\n\n'
if note not in text:
    text = text.replace(anchor, note + anchor, 1)
handoff.write_text(text, encoding='utf-8')

agents = root / 'AGENTS.md'
text = agents.read_text(encoding='utf-8')
anchor = 'Build 12.130 owns the Aurora Terminal arena'
note = 'Build 12.131 owns the consolidated tactical clarity presentation and persistent End Day / Next Day contrast. Keep every calendar-control state on the same readable slate surface with white primary copy, mint supporting copy and full opacity; preserve the existing button lock, blocker and progression behaviour. See `AUDIT-12.131.md`.\n\n'
if note not in text:
    text = text.replace(anchor, note + anchor, 1)
agents.write_text(text, encoding='utf-8')

changelog = root / 'CHANGELOG.md'
if changelog.exists():
    text = changelog.read_text(encoding='utf-8')
    entry = '## 12.131 — Calendar Clarity\n\n- Promotes the tactical summary-tag and Active Operator Match Roles alignment fixes into a numbered release.\n- Keeps End Day / Next Day readable with one consistent slate, white and mint colour scheme across enabled, locked, blocked and matchday states.\n- Presentation-only release; save schema, gameplay, calendar progression and match simulation are unchanged.\n- Evidence: `AUDIT-12.131.md`.\n\n'
    if '## 12.131 — Calendar Clarity' not in text:
        pos = text.find('\n', text.find('#')) + 1
        text = text[:pos] + '\n' + entry + text[pos:]
    changelog.write_text(text, encoding='utf-8')

(root / 'AUDIT-12.131.md').write_text('''# Build 12.131 — Calendar Clarity audit

## Scope

- Publish the existing tactical-summary and Active Operator Match Roles presentation fixes as a correctly numbered release.
- Make the desktop End Day / Next Day control retain one readable colour scheme in every state, including enabled, locked, blocked, disabled and matchday variants.
- Keep gameplay, calendar blockers, progression, saves, tactical calculations and match simulation unchanged.

## Implementation

- Build metadata is aligned to `12.131`, `Calendar Clarity` and `12.131.0-calendar-clarity` in the source constants, document title, asset queries, desktop build label and mobile Help-bar build label.
- `js/75-ui-clarity-hotfix.js` remains the scoped presentation authority for the tactical tags and role rows. Its calendar-control rules now cover the base, `.blocked`, `.matchday`, `:disabled` and `[aria-disabled=true]` states with `!important` only where necessary to defeat older release layers.
- The calendar control uses a dark slate gradient, visible border, white primary copy, mint supporting copy, full opacity and an orange response badge in every state. Behaviour and disabled semantics are untouched.

## Verification gates

- `python3 build.py` succeeds twice with byte-identical bundle and standalone hashes.
- Every modular JavaScript source file and the generated bundle pass `node --check`.
- The standalone inline JavaScript parses successfully.
- Release metadata and both visible version labels resolve to 12.131.
- Root `cod.html` is byte-identical to `dist/strikewatch-build-12.131.html`.
- Source, concise documentation, generated artifacts and the distributable ZIP are produced together.

## Responsive review targets

Manual visual checks should cover 390, 430, 1024, 1366 and 1920 CSS pixels, with particular attention to all calendar-control states.
''', encoding='utf-8')
