#!/usr/bin/env python3
from pathlib import Path
path = Path('strikewatch-source/build.py')
text = path.read_text(encoding='utf-8')
replacements = {
    '"important_declarations_max": 2182,': '"important_declarations_max": 2184,',
    '"media_queries_max": 477,': '"media_queries_max": 478,',
}
for old, new in replacements.items():
    if text.count(old) != 1:
        raise SystemExit(f'Expected one budget anchor: {old!r}; found {text.count(old)}')
    text = text.replace(old, new, 1)
path.write_text(text, encoding='utf-8')
print('Adjusted Build 12.206 CSS declaration and media-query budgets')
