#!/usr/bin/env python3
import re, runpy

_real_subn=re.subn
def _literal_subn(pattern,repl,string,count=0,flags=0):
    if isinstance(repl,str):
        return _real_subn(pattern,lambda match:repl,string,count=count,flags=flags)
    return _real_subn(pattern,repl,string,count=count,flags=flags)
re.subn=_literal_subn
runpy.run_path('.github/scripts/kerbside-0.9.27-body.py',run_name='__main__')
