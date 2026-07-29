from pathlib import Path
import html as html_module
import json
import os
import re
import shutil
import subprocess
import sys

repo = Path.cwd()
source = repo / 'strikewatch-source'
branch = os.environ.get('RELEASE_BRANCH', '').strip()
if not branch:
    raise SystemExit('RELEASE_BRANCH is required')
if not (repo / '.github/release-12-186.trigger').is_file():
    print('Release marker absent; nothing to do.')
    raise SystemExit(0)


def run(*args, cwd=repo, env=None):
    command = [str(arg) for arg in args]
    print('+', ' '.join(command), flush=True)
    subprocess.run(command, cwd=cwd, env=env, check=True)


def read(path):
    return Path(path).read_text(encoding='utf-8')


expected = {
    'version': '12.185',
    'name': 'Blood Visibility & Deployment CSS Ownership',
    'build_id': '12.185.0-blood-visibility-deployment-css-ownership',
}
actual = json.loads(read(source / 'RELEASE.json'))
if actual != expected:
    raise SystemExit(f'Predecessor guard failed: expected {expected}, got {actual}')

patch_env = os.environ.copy()
patch_env['SW_RELEASE_APPLY_ONLY'] = '1'
run(sys.executable, '.github/scripts/release-12-186.py', env=patch_env)
run(sys.executable, '-m', 'py_compile', 'build.py', cwd=source)
run(sys.executable, 'build.py', cwd=source)

for path in sorted((source / 'js').glob('*.js')):
    if path.name == 'strikewatch.dev.js':
        continue
    run('node', '--check', path.name, cwd=source / 'js')
run('node', '--check', 'strikewatch.dev.js', cwd=source / 'js')

standalone_path = source / 'dist/strikewatch-build-12.186.html'
standalone = read(standalone_path)
scripts = re.findall(r'<script(?:\s[^>]*)?>(.*?)</script>', standalone, flags=re.S)
if not scripts:
    raise SystemExit('No standalone inline scripts found')
for index, script in enumerate(scripts):
    path = Path(f'/tmp/sw-12-186-inline-{index}.js')
    path.write_text(script, encoding='utf-8')
    run('node', '--check', path)

storage = read(source / 'js/81-career-indexeddb.js')
menus = read(source / 'js/50-ui-menus.js')
contracts = read(source / 'CONTRACTS.md')
bundle = read(source / 'js/strikewatch.dev.js')
index = read(source / 'index.html')
release = json.loads(read(source / 'RELEASE.json'))
expected_release = {
    'version': '12.186',
    'name': 'Accurate Storage Reporting',
    'build_id': '12.186.0-accurate-storage-reporting',
}
if release != expected_release:
    raise SystemExit(f'Release metadata mismatch: {release}')

required_storage = (
    "estimateStatus: 'idle'",
    "return 'MEASURING...'",
    'ALL SITE DATA',
    'function careerStorageRefreshOpenSettings()',
    'function careerStorageReportingForTest()',
    "originScope: 'Includes all storage used by this site origin",
    'careerStorageRefreshQuota({ refreshUi: false });',
)
missing = [token for token in required_storage if token not in storage]
if missing:
    raise SystemExit(f'Missing storage reporting source tokens: {missing}')
required_menu = (
    'CAREER SAVE FILE',
    'RECOVERY BACKUP',
    'LOCAL CAREER DATA',
    'BROWSER ORIGIN STORAGE',
    'PRIMARY SAVE TIER',
    'DURABLE MIRROR',
)
missing = [token for token in required_menu if token not in menus]
if missing:
    raise SystemExit(f'Missing Configuration labels: {missing}')
if 'BROWSER ALLOWANCE USED' in menus:
    raise SystemExit('Misleading browser allowance label remains')
if 'career-specific allowance' not in contracts:
    raise SystemExit('Storage scope contract was not documented')
for hook in ('careerStorageReportingForTest', 'careerIndexedDbForTest', 'careerIndexedDbRoundTripForTest'):
    if hook not in bundle:
        raise SystemExit(f'Missing retained persistence hook: {hook}')
if 'Strikewatch 12.186: Accurate Storage Reporting' not in index:
    raise SystemExit('Development title was not updated')
if index.count('12.186.0-accurate-storage-reporting') < 20:
    raise SystemExit('Development cache keys were not updated')
if re.search(r'<link rel="stylesheet" href="css/', standalone):
    raise SystemExit('Standalone retained an external stylesheet')

size_report = json.loads(read(source / 'dist/strikewatch-build-12.186-size.json'))
css_report = json.loads(read(source / 'dist/strikewatch-build-12.186-css-debt.json'))
if not css_report.get('within_budget'):
    raise SystemExit(f'CSS report outside budget: {css_report}')
if size_report.get('version') != '12.186' or css_report.get('version') != '12.186':
    raise SystemExit('Generated reports carry the wrong version')

first = {
    'bundle': read(source / 'js/strikewatch.dev.js'),
    'standalone': read(standalone_path),
    'size': read(source / 'dist/strikewatch-build-12.186-size.json'),
    'css': read(source / 'dist/strikewatch-build-12.186-css-debt.json'),
}
run(sys.executable, 'build.py', cwd=source)
second = {
    'bundle': read(source / 'js/strikewatch.dev.js'),
    'standalone': read(standalone_path),
    'size': read(source / 'dist/strikewatch-build-12.186-size.json'),
    'css': read(source / 'dist/strikewatch-build-12.186-css-debt.json'),
}
if first != second:
    raise SystemExit('Deterministic rebuild mismatch')

chrome = next((shutil.which(name) for name in ('google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser') if shutil.which(name)), None)
if not chrome:
    raise SystemExit('No headless Chrome binary is available')

storage_start = storage.index('  const careerStorageReport = {')
storage_end = storage.index('  function careerIndexedDbAuditForTest() {', storage_start)
storage_logic = storage[storage_start:storage_end].replace('navigator.storage', 'window.__storageApi')
style_blocks = re.findall(r'<style(?:\s[^>]*)?>(.*?)</style>', standalone, flags=re.S)
if not style_blocks:
    raise SystemExit('Standalone CSS was not found for the browser probe')
release_css = '\n'.join(style_blocks)

probe_script = r'''
window.__swReleaseFaults=[];
window.addEventListener('error',event=>window.__swReleaseFaults.push(String(event.message||event.error||'window error')));
const __swConsoleError=console.error.bind(console);
console.error=(...args)=>{window.__swReleaseFaults.push(args.map(String).join(' '));__swConsoleError(...args);};
const CAREER_STORAGE_KEY='career';
const CAREER_BACKUP_STORAGE_KEY='backup';
const CAREER_SAVE_META_STORAGE_KEY='meta';
const __swRecords={career:'{"version":19,"name":"Storage Probe"}',backup:'{"version":19}',meta:'{"saveSequence":2}'};
function careerStorageValue(key){return __swRecords[key]??null;}
const careerIdbState={supported:true,failedWrites:0,writes:1,primaryTier:'localStorage'};
let menuTab='settings';
let __swRefreshes=0;
function updateMenuUI(){__swRefreshes++;}
let __swResolveEstimate;
window.__storageApi={estimate:()=>new Promise(resolve=>{__swResolveEstimate=resolve;})};
'''

probe_after = r'''
(async()=>{
  const finish=value=>{document.getElementById('sw-release-result').textContent=JSON.stringify(value);};
  try{
    const initial=careerStorageSummary();
    const diagnostic=careerStorageReportingForTest();
    __swResolveEstimate({usage:2097152,quota:104857600});
    await careerStorageEstimatePromise;
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const settled=careerStorageSummary({refresh:false});
    const card=document.getElementById('sw-storage-card-probe');
    const rows=[...card.querySelectorAll('.menu-setting-row')];
    const contained=card.scrollWidth<=card.clientWidth+1&&rows.every(row=>row.scrollWidth<=row.clientWidth+1);
    finish({
      ok:Boolean(diagnostic.ok)
        &&initial.originUsageStatus==='loading'
        &&initial.originUsageLabel==='MEASURING...'
        &&settled.originUsageStatus==='ready'
        &&settled.originUsageLabel.includes('ALL SITE DATA')
        &&settled.originScope.includes('not a career-specific allowance')
        &&settled.fastTierSize===settled.totalSize
        &&__swRefreshes>=1
        &&contained
        &&window.__swReleaseFaults.length===0,
      initial,settled,diagnostic,contained,refreshes:__swRefreshes,width:innerWidth,faults:window.__swReleaseFaults
    });
  }catch(error){finish({ok:false,reason:String(error&&error.stack||error),width:innerWidth,faults:window.__swReleaseFaults});}
})();
'''

card_markup = '''<section id="sw-storage-card-probe" class="menu-setting-card career-recovery-card" style="position:relative;margin:12px;max-width:calc(100vw - 24px)">
<div class="menu-kicker">SAVE &amp; RECOVERY</div><h3>PROTECT THIS CAREER</h3>
<div class="menu-setting-row"><span>CAREER SAVE FILE</span><strong>12.0 KB</strong></div>
<div class="menu-setting-row"><span>RECOVERY BACKUP</span><strong>11.9 KB</strong></div>
<div class="menu-setting-row"><span>LOCAL CAREER DATA</span><strong>24.0 KB</strong></div>
<div class="menu-setting-row"><span>BROWSER ORIGIN STORAGE</span><strong>2.00 MB OF 100.00 MB · ALL SITE DATA</strong></div>
<div class="menu-setting-row"><span>PRIMARY SAVE TIER</span><strong>LOCALSTORAGE</strong></div>
<div class="menu-setting-row"><span>DURABLE MIRROR</span><strong>INDEXEDDB ACTIVE</strong></div>
<small>Includes all storage used by this site origin, not only this career and not a career-specific allowance.</small></section>
<pre id="sw-release-result">WAITING</pre>'''

for width in (500, 1440):
    probe_document = f'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>{release_css}</style></head><body>{card_markup}<script>{probe_script}\n{storage_logic}\n{probe_after}</script></body></html>'''
    probe_path = Path(f'/tmp/sw-12-186-probe-{width}.html')
    dump_path = Path(f'/tmp/sw-12-186-probe-{width}-dump.html')
    probe_path.write_text(probe_document, encoding='utf-8')
    with dump_path.open('w', encoding='utf-8') as output:
        subprocess.run([
            chrome, '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
            '--allow-file-access-from-files', f'--window-size={width},1000', '--virtual-time-budget=5000',
            '--dump-dom', probe_path.as_uri()
        ], stdout=output, stderr=subprocess.STDOUT, check=True)
    dumped = dump_path.read_text(encoding='utf-8')
    match = re.search(r'<pre id="sw-release-result">(.*?)</pre>', dumped, flags=re.S)
    if not match:
        raise SystemExit(f'Browser result missing at {width}px')
    result = json.loads(html_module.unescape(match.group(1)))
    print(json.dumps(result, indent=2))
    if not result.get('ok') or abs(int(result.get('width', 0)) - width) > 1:
        raise SystemExit(f'Browser storage probe failed at {width}px: {result}')

shutil.copyfile(standalone_path, repo / 'cod.html')
if read(standalone_path) != read(repo / 'cod.html'):
    raise SystemExit('Root cod.html is not byte-identical to standalone')

for path in (
    repo / '.github/scripts/release-12-186.py',
    repo / '.github/scripts/run-release-12-186.py',
    repo / '.github/workflows/release-12-186.yml',
    repo / '.github/workflows/release-12-186-dispatch.yml',
    repo / '.github/workflows/release-12-186-pr-runner.yml',
    repo / '.github/release-12-186.trigger',
):
    path.unlink(missing_ok=True)

run('git', 'add', '-A', '--', 'strikewatch-source', 'cod.html', '.github')
run('git', 'config', 'user.name', 'github-actions[bot]')
run('git', 'config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com')
run('git', 'commit', '-m', 'Build 12.186: fix storage reporting')
run('git', 'push', 'origin', f'HEAD:{branch}')
