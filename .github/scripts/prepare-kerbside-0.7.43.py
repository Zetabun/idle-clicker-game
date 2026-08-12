#!/usr/bin/env python3
from pathlib import Path

path=Path('.github/scripts/apply-kerbside-0.7.43.py')
text=path.read_text(encoding='utf-8')
old='''replace_once(\n    planner,\n    """    if(!(await resolveDestination()))return;\n    await finishJourney();\n""",\n    """    if(!(await resolveDestination({reload:false})))return;\n    await finishJourney({reload:true});\n"""\n)'''
new='''planner_text = read(planner)\nfind_flow_old = """    if(!(await resolveDestination()))return;\n    await finishJourney();\n"""\nfind_flow_new = """    if(!(await resolveDestination({reload:false})))return;\n    await finishJourney({reload:true});\n"""\nif find_flow_old not in planner_text:\n    raise SystemExit('kerbside-journey-planner-ui.js: Find journey completion block not found')\nwrite(planner, planner_text.replace(find_flow_old, find_flow_new, 1))'''
count=text.count(old)
if count!=1:
    raise SystemExit(f'expected one ambiguous patch call in release script, found {count}')
path.write_text(text.replace(old,new,1),encoding='utf-8')
print('Prepared unambiguous 0.7.43 patcher.')
