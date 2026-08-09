from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
target = ROOT / "kerbside-backend/tests/browser-regression.mjs"
source = target.read_text(encoding="utf-8")
old = r"assert.match(busSource, /originMatch:true,routeIdentityMatch:identityInfo\.strong/);"
new = r"assert.match(busSource, /originMatch:true,journeyDestinationWordingMismatch:wordingOnlyConflict,routeIdentityMatch:identityInfo\.strong/);"
count = source.count(old)
if count != 1:
    raise RuntimeError(f"origin-match browser guard: expected exactly one stale assertion, found {count}")
target.write_text(source.replace(old, new, 1), encoding="utf-8")
Path(__file__).unlink()
print("Updated 0.7.21 origin-match destination-wording browser regression guard")
