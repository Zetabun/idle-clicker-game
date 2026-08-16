from pathlib import Path
import gzip
import runpy

BASE = Path('.github/scripts/kerbside-release-post-base.py')
OLD_HIDDEN = ".plan-journey-form[hidden],.plan-journey-surface[hidden]{display:none!important}"
NEW_HIDDEN = ".train-sidebar>[hidden],.train-content>[hidden],.plan-journey-form[hidden],.plan-journey-surface[hidden]{display:none!important}"
real_decompress = gzip.decompress


def patched_decompress(data):
    raw = real_decompress(data)
    text = raw.decode('utf-8')
    count = text.count(OLD_HIDDEN)
    if count != 1:
        raise SystemExit(f'Expected one Plan My Journey hidden-style rule, found {count}')
    return text.replace(OLD_HIDDEN, NEW_HIDDEN, 1).encode('utf-8')


gzip.decompress = patched_decompress
try:
    runpy.run_path(str(BASE), run_name='__main__')
finally:
    BASE.unlink(missing_ok=True)
