from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'strikewatch-source'
VERSION = '12.191'
NAME = 'Operator Silhouette Separation'
BUILD_ID = '12.191.0-operator-silhouette-separation'

if not SRC.is_dir():
    raise SystemExit(f'Could not locate source tree from {__file__}')


def read(path):
    return path.read_text(encoding='utf-8')


def write(path, text):
    path.write_text(text, encoding='utf-8',