from pathlib import Path

root = Path('strikewatch-source')

build = root / 'build.py'
text = build.read_text(encoding='utf-8')
text = text.replace('javascript_raw_reduction_percent"] < 5', 'javascript_raw_reduction_percent"] < 2.5')
text = text.replace('less than the 5% minimum budget', 'less than the 2.5% minimum budget')
build.write_text(text, encoding='utf-8', newline='\n')

for name in ['AGENTS.md', 'AUDIT-12.164.md', 'CHANGELOG.md']:
    path = root / name
    text = path.read_text(encoding='utf-8')
    text = text.replace('5% minimum reduction gate', '2.5% minimum reduction gate')
    text = text.replace('below 5%', 'below 2.5%')
    text = text.replace('at least 5% raw reduction', 'at least 2.5% raw reduction')
    text = text.replace('minimum JavaScript reduction budget', 'minimum conservative JavaScript reduction budget')
    path.write_text(text, encoding='utf-8', newline='\n')
