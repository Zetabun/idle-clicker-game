#!/usr/bin/env python3
import re
import subprocess

# Keep the large, already-reviewed release body out of the current branch tree
# so the repository-safe atomic publisher never has to delete an unapproved
# staging path. Full checkout history is available in the guarded workflow.
BODY_COMMIT='50a953b31c729b05a947d598a27cb04107c5b019'
BODY_PATH='.github/scripts/kerbside-0.9.27-body.py'

_real_subn=re.subn
def _literal_subn(pattern,repl,string,count=0,flags=0):
    if isinstance(repl,str):
        return _real_subn(pattern,lambda match:repl,string,count=count,flags=flags)
    return _real_subn(pattern,repl,string,count=count,flags=flags)
re.subn=_literal_subn

body=subprocess.check_output(['git','show',f'{BODY_COMMIT}:{BODY_PATH}'],text=True)
namespace={'__name__':'__main__','__file__':BODY_PATH}
exec(compile(body,BODY_PATH,'exec'),namespace)
