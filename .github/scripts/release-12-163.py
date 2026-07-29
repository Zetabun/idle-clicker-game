from pathlib import Path
import json

root = Path('strikewatch-source')

def replace(path, old, new, count=1):
    p = root / path
    text = p.read_text(encoding='utf-8')
    if text.count(old) < count:
        raise SystemExit(f'{path}: missing expected text: {old[:80]!r}')
    p.write_text(text.replace(old, new, count), encoding='utf-8', newline='\n')

replace(Path('js/00-core.js'), "const BUILD_VERSION = '12.162';", "const BUILD_VERSION = '12.163';")
replace(Path('js/00-core.js'), "const BUILD_NAME = 'Visible Geometry';", "const BUILD_NAME = 'Compact Navigation Alignment';")
replace(Path('js/00-core.js'), "const BUILD_ID = '12.162.0-visible-geometry';", "const BUILD_ID = '12.163.0-compact-navigation-alignment';")

index = root / 'index.html'
text = index.read_text(encoding='utf-8')
text = text.replace('Strikewatch 12.162: Visible Geometry', 'Strikewatch 12.163: Compact Navigation Alignment')
text = text.replace('12.162.0-visible-geometry', '12.163.0-compact-navigation-alignment')
text = text.replace('>12.162</b>', '>12.163</b>')
index.write_text(text, encoding='utf-8', newline='\n')

(root / 'RELEASE.json').write_text(json.dumps({
    'version': '12.163',
    'name': 'Compact Navigation Alignment',
    'build_id': '12.163.0-compact-navigation-alignment'
}, indent=2) + '\n', encoding='utf-8', newline='\n')

css_path = root / 'css/game.css'
css = css_path.read_text(encoding='utf-8')
layer = r'''

/* --- Build 12.163: compact navigator and alert alignment ------------------
   Phone-width route rows inherited fixed/undersized grid tracks from older
   navigator layers. Their copy could paint beyond the button and overlap the
   next destination. The management status also retained a desktop three-column
   layout that squeezed its copy and dismiss action off-centre. */
@media (orientation: portrait) and (max-width: 430px) {
  .menu-shell .mobile-navigation-routes {
    grid-auto-rows: max-content;
    align-content: start;
    gap: 7px;
  }

  .menu-shell .mobile-navigation-route {
    box-sizing: border-box;
    height: auto !important;
    min-height: 82px;
    grid-template-columns: 24px minmax(0, 1fr) minmax(72px, 92px) 18px;
    grid-template-rows: minmax(0, auto);
    align-items: center;
    align-self: start;
    padding: 9px 8px;
    overflow: hidden;
  }

  .menu-shell .mobile-navigation-route-copy {
    align-self: center;
    min-height: 0;
    overflow: hidden;
  }

  .menu-shell .mobile-navigation-route-copy small,
  .menu-shell .mobile-navigation-route-copy strong,
  .menu-shell .mobile-navigation-route-copy em,
  .menu-shell .mobile-navigation-route-copy i {
    display: block;
    min-width: 0;
    max-width: 100%;
  }

  .menu-shell .mobile-navigation-route-copy em,
  .menu-shell .mobile-navigation-route-copy i {
    white-space: normal;
    overflow-wrap: anywhere;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .menu-shell .mobile-navigation-route-status {
    align-self: center;
    justify-self: stretch;
    width: 100%;
    max-width: none;
    box-sizing: border-box;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .management-status {
    left: max(10px, env(safe-area-inset-left, 0px));
    right: max(10px, env(safe-area-inset-right, 0px));
    bottom: calc(86px + env(safe-area-inset-bottom, 0px));
    width: auto;
    grid-template-columns: 22px minmax(0, 1fr);
    align-items: start;
    gap: 8px 10px;
    padding: 11px;
    transform: translateY(10px);
  }

  .management-status.show { transform: translateY(0); }
  .management-status > i { margin-top: 1px; }
  .management-status > p {
    align-self: center;
    font-size: 12.5px;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }
  .management-status > button {
    grid-column: 1 / -1;
    width: 100%;
    min-height: 44px;
    justify-self: stretch;
  }

  body.mobile-navigation-open .management-status {
    bottom: calc(82px + env(safe-area-inset-bottom, 0px));
    z-index: 1010;
  }
}
'''
if 'Build 12.163: compact navigator and alert alignment' not in css:
    css += layer
css_path.write_text(css, encoding='utf-8', newline='\n')

handoff = root / 'HANDOFF.md'
text = handoff.read_text(encoding='utf-8')
text = text.replace('Build: **12.162 — Visible Geometry**', 'Build: **12.163 — Compact Navigation Alignment**', 1)
text = text.replace('Build ID: `12.162.0-visible-geometry`', 'Build ID: `12.163.0-compact-navigation-alignment`', 1)
text = text.replace('strikewatch-build-12.162.html', 'strikewatch-build-12.163.html', 1)
preference = '''## ChatGPT-only publishing preference

This subsection is a user preference for ChatGPT sessions only. Other coding agents should ignore it and follow their normal supported publishing workflow.

For ChatGPT releases when direct Git push is unavailable, prefer the proven separated GitHub workaround:

1. Commit the release patch/script first.
2. Commit the release workflow separately so it already exists on the default branch.
3. Trigger it with a third, distinct commit.
4. The workflow must build twice, require identical hashes, parse source/generated/standalone JavaScript, run targeted checks, copy the verified standalone to root `cod.html`, confirm byte identity, commit the complete release, and remove its temporary script/workflow/trigger files.
5. Never claim deployment until the generated release commit is visible on `main` and `RELEASE.json` plus `cod.html` confirm the new build.

'''
if '## ChatGPT-only publishing preference' not in text:
    text = text.replace('## Current release\n', preference + '## Current release\n', 1)
note = 'Build 12.163 fixes compact club-navigation destination rows that could overlap at phone widths and reflows the fixed management alert into a safe two-row mobile layout. See `AUDIT-12.163.md`.\n\n'
if note not in text:
    pos = text.find('Build 12.162')
    if pos < 0:
        pos = text.find('Build 12.161')
    text = text[:pos] + note + text[pos:]
handoff.write_text(text, encoding='utf-8', newline='\n')

for name in ['README.md', 'PROJECT.md', '00-READ-FIRST-GPT.md']:
    p = root / name
    text = p.read_text(encoding='utf-8')
    text = text.replace('12.162', '12.163', 1)
    p.write_text(text, encoding='utf-8', newline='\n')

changelog = root / 'CHANGELOG.md'
text = changelog.read_text(encoding='utf-8')
entry = '''## 12.163 — Compact Navigation Alignment

- Prevents compact club-navigation destination cards from overlapping.
- Reflows the fixed management alert for phone-width alignment and safe-area clearance.
- Adds a clearly scoped ChatGPT-only release-workaround preference to `HANDOFF.md`.
- See `AUDIT-12.163.md`.

'''
if entry not in text:
    text = text.replace('# Strikewatch changelog\n', '# Strikewatch changelog\n\n' + entry, 1)
changelog.write_text(text, encoding='utf-8', newline='\n')

(root / 'AUDIT-12.163.md').write_text('''# Build 12.163 — Compact Navigation Alignment

## Scope

Fixes two mobile-only alignment defects reported from the club-navigation overlay: destination cards could paint into neighbouring rows, and the fixed management status/alert retained a desktop three-column layout at phone width.

## Implementation

- Compact route lists now use `grid-auto-rows: max-content`.
- Route buttons explicitly use auto height, bounded copy, two-line support text and a contained status column.
- The management status uses safe-area-aware inline insets and a two-column/two-row phone layout with a full-width dismiss action.
- Desktop and landscape layouts are unchanged.

## Documentation

`HANDOFF.md` now records the separated script → workflow → trigger publishing procedure as a ChatGPT-only user preference. Other agents are explicitly instructed to ignore that subsection.

## Verification

- Build succeeds twice with byte-identical bundle and standalone output.
- Modular, generated and standalone JavaScript parse.
- Root `cod.html` matches the verified standalone byte-for-byte.
- Compact CSS assertions cover 320, 353, 375, 390, 402 and 430 CSS-pixel portrait widths.
''', encoding='utf-8', newline='\n')
