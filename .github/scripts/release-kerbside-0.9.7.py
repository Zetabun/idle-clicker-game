#!/usr/bin/env python3
from __future__ import annotations

import ast
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = (
    'https://raw.githubusercontent.com/Zetabun/idle-clicker-game/'
    'agent/kerbside-0.9.7-temporal-odm/.github/scripts/release-kerbside-0.9.7.py'
)


def