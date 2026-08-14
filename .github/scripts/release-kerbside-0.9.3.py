#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

OLD_VERSION = '0.9.2'
NEW_VERSION = '0.9.3'


def replace_once(path, old, new, label):
    target = Path(path)
    text = target.read_text(encoding='utf-8')
    if new in text and old not in text:
        return False
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one source block, found {count}')
    target.write_text(text.replace(old, new, 1), encoding='utf-8')
    return True


version_file = Path('VERSION')
version = version_file.read_text(encoding='utf-8').strip()
if version not in {OLD_VERSION, NEW_VERSION}:
    raise SystemExit(f'Expected Kerbside {OLD_VERSION} before release, found {version!r}')
if version == OLD_VERSION:
    version_file.write_text(NEW_VERSION + '\n', encoding='utf-8')

# Keep the Status page tied to the app release instead of its old module release.
replace_once(
    'kerbside-status.js',
    "const VERSION='0.8.5';",
    f"const VERSION='{NEW_VERSION}';",
    'status release version',
)

# Bust the wrapper's own dynamically-loaded planner and rail-health modules.
replace_once(
    'kerbside-journey-planner-ui.js',
    "const PLANNER_CORE_URL='kerbside-journey-planner-core.js?v=0.9.2';",
    f"const PLANNER_CORE_URL='kerbside-journey-planner-core.js?v={NEW_VERSION}';",
    'planner core cache key',
)
replace_once(
    'kerbside-journey-planner-ui.js',
    "const RAIL_HEALTH_URL='kerbside-rail-health.js?v=0.9.2';",
    f"const RAIL_HEALTH_URL='kerbside-rail-health.js?v={NEW_VERSION}';",
    'rail health cache key',
)

# The journey detail is made visible synchronously, while journey-sheet promotion
# is intentionally scheduled on the next animation frame. Chromium can reach the
# old assertion before that frame; wait for the actual sheet state instead.
replace_once(
    'kerbside-backend/tests/train-browser-core-regression.mjs',
    "  assert.equal(await page.locator('#kerbsideJourneySheet').isVisible(),true,'mobile detail should open as a journey sheet');\n",
    "  const journeySheet=page.locator('#kerbsideJourneySheet');\n"
    "  await journeySheet.waitFor({state:'visible'});\n"
    "  assert.equal(await journeySheet.isVisible(),true,'mobile detail should open as a journey sheet');\n",
    'journey sheet browser timing assertion',
)

# Give every isolated rail/status asset a single release cache key. This avoids
# mobile browsers reusing an old wrapper even after a fix is already on main.
bus = Path('bus.html')
text = bus.read_text(encoding='utf-8')
asset_versions = {
    'kerbside-trains.js': '0.8.7',
    'kerbside-train-routes.js': '0.8.7',
    'kerbside-train-date.js': '0.8.7',
    'kerbside-journey-planner-ui.js': '0.8.6',
    'kerbside-train-live-window.js': '0.8.7',
    'kerbside-train-live-overlay.js': '0.8.7',
    'kerbside-rail-timebands.js': '0.8.6',
    'kerbside-rail-demand-v4.js': '0.8.6',
    'kerbside-rail-calibration.js': '0.8.6',
    'kerbside-train-events.js': '0.8.7',
    'kerbside-train-loading.js': '0.8.7',
    'kerbside-train-loading-guidance.js': '0.8.8',
    'kerbside-train-forecast-v4.js': '0.9.2',
    'kerbside-journey-sheet.js': '0.9.1',
    'kerbside-status.js': '0.8.6',
}
for asset, old_version in asset_versions.items():
    old = f'<script src="{asset}?v={old_version}"></script>'
    new = f'<script src="{asset}?v={NEW_VERSION}"></script>'
    if new in text and old not in text:
        continue
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{asset} cache key: expected exactly one source block, found {count}')
    text = text.replace(old, new, 1)
bus.write_text(text, encoding='utf-8')

# Propagate VERSION through the app constant, Worker health response, package
# metadata and version assertions using the repository's canonical helper.
subprocess.run([sys.executable, '.github/scripts/sync-version.py'], check=True)

# Final release invariants.
if version_file.read_text(encoding='utf-8').strip() != NEW_VERSION:
    raise SystemExit('VERSION was not advanced')
if f"const VERSION='{NEW_VERSION}';" not in Path('kerbside-status.js').read_text(encoding='utf-8'):
    raise SystemExit('Status release version was not advanced')
for asset in asset_versions:
    expected = f'<script src="{asset}?v={NEW_VERSION}"></script>'
    if expected not in bus.read_text(encoding='utf-8'):
        raise SystemExit(f'{asset} was not cache-busted to {NEW_VERSION}')

print(f'Prepared Kerbside {NEW_VERSION} rail reliability release.')
