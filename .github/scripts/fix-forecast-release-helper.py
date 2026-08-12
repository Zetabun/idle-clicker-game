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
    positions=[]
    offset=0
    while True:
        i=text.find(start, offset)
        if i < 0:
            break
        try:
            j=text.index(end, i + len(start))
        except ValueError:
            offset=i+1
            continue
        positions.append((j-i, i, j))
        offset=i+1
    if not positions:
        raise SystemExit(f'{path}: no ordered marker pair found: {start[:80]!r} -> {end[:80]!r}')
    _,i,j=min(positions)
    write(path, text[:i] + new + text[j:])
'''
if text.count(old) != 1:
    raise SystemExit('release helper block did not match exactly once')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
