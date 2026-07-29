from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'strikewatch-source'


def replace(path, old, new):
    text = path.read_text(encoding='utf-8')
    if old in text:
        text = text.replace(old, new)
    elif new not in text:
        raise SystemExit(f'Missing expected token in {path}: {old}')
    path.write_text