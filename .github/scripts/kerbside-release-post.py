from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
path = ROOT / 'kerbside-backend/tests/browser-regression.mjs'
text = path.read_text(encoding='utf-8')
old = "assert.match(busSource, /DATA_TILE_CACHE\\.clear\\(\\); DATA_DEPARTURE_CACHE\\.clear\\(\\); PATTERN_CACHE\\.clear\\(\\);/);"
new = "assert.match(busSource, /DATA_TILE_CACHE\\.clear\\(\\); DATA_DEPARTURE_CACHE\\.clear\\(\\); DATA_PATTERN_SHARD_CACHE\\.clear\\(\\); DATA_PATTERN_RETRY\\.clear\\(\\); PATTERN_CACHE\\.clear\\(\\);/);"
count = text.count(old)
if count != 1:
    raise SystemExit(f'pattern cache reset assertion: expected one match, found {count}')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
print('Updated pattern cache reset assertion')
