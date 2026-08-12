from pathlib import Path

path = Path(__file__).resolve().parent / 'kerbside-forecast-v3-audit-release.py'
text = path.read_text(encoding='utf-8')
old = '''def replace_between(path, start, end, new):
    text = read(path)
    count = text.count(start)
    if count != 1:
        raise SystemExit(f'{path}: start marker count was {count}: {start[:120]!r}')
    i = text.index(start)
    j = text.index(end, i)
    write(path, text[:i] + new + text[j:])
'''
new = '''def replace_between(path, start, end, new):
    text = read(path)
    try:
        j = text.index(end)
    except ValueError:
        raise SystemExit(f'{path}: end marker not found: {end[:120]!r}')
    i = text.rfind(start, 0, j)
    if i < 0:
        raise SystemExit(f'{path}: start marker not found before end: {start[:120]!r}')
    write(path, text[:i] + new + text[j:])
'''
if text.count(old) != 1:
    raise SystemExit('release helper block did not match exactly once')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
