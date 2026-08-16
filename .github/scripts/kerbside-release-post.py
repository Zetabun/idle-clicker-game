#!/usr/bin/env python3
from pathlib import Path

path=Path('kerbside-train-timetable.js')
text=path.read_text(encoding='utf-8')
path.write_text(text.rstrip()+'\n',encoding='utf-8')
print('Normalized Active Journey timetable EOF.')
