import gzip
import subprocess

BASE_COMMIT = 'ef20c001baa76ece056e33d24cd6b811c6db4079'
BASE_PATH = '.github/scripts/kerbside-release-post.py'
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


base_source = subprocess.check_output(
    ['git', 'show', f'{BASE_COMMIT}:{BASE_PATH}'],
    text=True,
)
gzip.decompress = patched_decompress
namespace = {'__name__': '__main__', '__file__': BASE_PATH}
exec(compile(base_source, BASE_PATH, 'exec'), namespace)
