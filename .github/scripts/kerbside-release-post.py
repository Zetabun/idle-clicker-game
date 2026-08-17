#!/usr/bin/env python3
from pathlib import Path

path=Path("kerbside-trains.css")
text=path.read_text(encoding="utf-8")
old='''  body[data-transport="train"] .train-sidebar{\n    padding:26px 22px 32px;\n  }'''
new='''  body[data-transport="train"] .train-sidebar{\n    padding:22px 22px 32px;\n  }'''
count=text.count(old)
if count != 1:
    raise SystemExit(f"Expected one 0.9.43 desktop sidebar padding block, found {count}")
path.write_text(text.replace(old,new,1),encoding="utf-8")
print("Kept desktop train tabs within the established sticky top offset.")
