from pathlib import Path

path = Path("kerbside-backend/tests/train-browser-core-regression.mjs")
text = path.read_text(encoding="utf-8")
old = """  const useBackup=connectionDetail.getByRole('button',{name:'Use this backup'});\n  await useBackup.click();\n"""
new = """  // Save & follow re-renders the service row. Re-open the detail sheet if that\n  // render collapsed it before exercising the recovery action.\n  if(!(await connectionDetail.isVisible())){\n    await connection.locator('[data-scheduled-toggle]').click();\n    await connectionDetail.waitFor({state:'visible'});\n  }\n  const useBackup=connectionDetail.getByRole('button',{name:'Use this backup'});\n  await useBackup.waitFor({state:'visible',timeout:10000});\n  await useBackup.click();\n"""
count = text.count(old)
if count != 1:
    raise SystemExit(f"recovery regression refresh: expected exactly one match, found {count}")
path.write_text(text.replace(old, new, 1), encoding="utf-8")
print("Prepared Kerbside 0.9.49 recovery regression refresh handling.")
