from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OLD_VERSION = "0.7.14"
NEW_VERSION = "0.7.15"

browser_test = ROOT / "kerbside-backend/tests/browser-regression.mjs"
source = browser_test.read_text(encoding="utf-8")
escaped_old = re.escape(OLD_VERSION)
escaped_new = re.escape(NEW_VERSION)
count = source.count(escaped_old)
if count != 1:
    raise RuntimeError(
        f"browser APP_VERSION assertion: expected exactly one escaped {OLD_VERSION} match, found {count}"
    )

browser_test.write_text(source.replace(escaped_old, escaped_new, 1), encoding="utf-8")

# This helper exists only to repair the release workspace. Removing it here keeps
# the atomically published main-branch release free of one-off release machinery.
Path(__file__).unlink()

print(f"Updated browser APP_VERSION regression assertion to {NEW_VERSION}")
