from pathlib import Path
import subprocess
import sys

version_path = Path('VERSION')
current = version_path.read_text(encoding='utf-8').strip()
if current != '0.9.17':
    raise SystemExit(f'Expected VERSION 0.9.17 before corrective release, found {current!r}')

version_path.write_text('0.9.18\n', encoding='utf-8')
subprocess.run([sys.executable, '.github/scripts/sync-version.py'], check=True)
