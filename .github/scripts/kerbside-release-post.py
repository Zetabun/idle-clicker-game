from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


worker_path = Path("kerbside-backend/src/worker.js")
worker = worker_path.read_text(encoding="utf-8")
worker = replace_once(
    worker,
    r"""  const siri = /<(?:[A-Za-z0-9_.-]+:)?Siri(?:\s|>)/i.test(text);
  const vehicleDelivery = /<(?:[A-Za-z0-9_.-]+:)?VehicleMonitoringDelivery(?:\s|>)/i.test(text);""",
    r"""  const siri = /<(?:[A-Za-z0-9_.-]+:)?Siri(?=[\s/>])/i.test(text);
  const vehicleDelivery = /<(?:[A-Za-z0-9_.-]+:)?VehicleMonitoringDelivery(?=[\s/>])/i.test(text);""",
    "SIRI boundary fix",
)
worker_path.write_text(worker, encoding="utf-8")

browser_path = Path("kerbside-backend/tests/browser-regression.mjs")
browser = browser_path.read_text(encoding="utf-8")
browser = replace_once(
    browser,
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.50'/);",
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.51'/);",
    "browser release version assertion",
)
browser = replace_once(
    browser,
    "assert.match(busSource, /scheduledJourneyDirection\\(est\\.schedule\\)/);",
    "assert.match(busSource, /const directionSchedule=est\\.schedule\\|\\|matchedRow/);\nassert.match(busSource, /scheduledJourneyDirection\\(directionSchedule\\)/);",
    "matched timetable direction assertion",
)
browser_path.write_text(browser, encoding="utf-8")

print("Applied Kerbside 0.6.51 post-release guard fixes")
