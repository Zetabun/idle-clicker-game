from pathlib import Path

path = Path("kerbside-backend/src/worker.js")
text = path.read_text(encoding="utf-8")
old = r"""  const siri = /<(?:[A-Za-z0-9_.-]+:)?Siri(?:\s|>)/i.test(text);
  const vehicleDelivery = /<(?:[A-Za-z0-9_.-]+:)?VehicleMonitoringDelivery(?:\s|>)/i.test(text);"""
new = r"""  const siri = /<(?:[A-Za-z0-9_.-]+:)?Siri(?=[\s/>])/i.test(text);
  const vehicleDelivery = /<(?:[A-Za-z0-9_.-]+:)?VehicleMonitoringDelivery(?=[\s/>])/i.test(text);"""
count = text.count(old)
if count != 1:
    raise SystemExit(f"SIRI boundary fix: expected exactly one match, found {count}")
path.write_text(text.replace(old, new, 1), encoding="utf-8")
print("Applied Kerbside 0.6.51 SIRI self-closing tag fix")
