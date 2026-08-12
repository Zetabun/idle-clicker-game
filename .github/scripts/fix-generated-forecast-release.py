from pathlib import Path

root = Path(__file__).resolve().parents[2]
path = root / 'kerbside-trains.js'
text = path.read_text(encoding='utf-8')
old = "  return 'Live running evidence comes from National Rail Darwin with the app's configured fallbacks. Forecast v3 combines timetable demand, service spacing, events, calendar effects, DfT calibration and live Darwin evidence when available. Passenger-submitted crowding reports do not alter the Forecast v3 score. It is not ticket-sales data and not live occupancy.';"
new = '  return "Live running evidence comes from National Rail Darwin with the app\'s configured fallbacks. Forecast v3 combines timetable demand, service spacing, events, calendar effects, DfT calibration and live Darwin evidence when available. Passenger-submitted crowding reports do not alter the Forecast v3 score. It is not ticket-sales data and not live occupancy.";'
if text.count(old) != 1:
    raise SystemExit(f'generated provider notice did not match exactly once; found {text.count(old)}')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
