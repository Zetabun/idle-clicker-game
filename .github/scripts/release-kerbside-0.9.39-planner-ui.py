from pathlib import Path
import subprocess


def read(path): return Path(path).read_text(encoding='utf-8')
def write(path, value): Path(path).write_text(value, encoding='utf-8')
def replace(path, old, new, count=1):
    value=read(path); found=value.count(old)
    if found!=count: raise SystemExit(f'{path}: expected {count} occurrence(s), found {found}: {old!r}')
    write(path,value.replace(old,new,count))
def run(*args): subprocess.run(args,check=True)

version=Path('VERSION').read_text(encoding='utf-8').strip()
if version not in {'0.9.38','0.9.39'}: raise SystemExit(f'Unexpected VERSION {version!r}')
Path('VERSION').write_text('0.9.39\n',encoding='utf-8')
run('python3','.github/scripts/sync-version.py')

# Slate-black dark theme; Crystal/light mode remains unchanged.
for old,new in {
'<meta name="theme-color" content="#0B1119">':'<meta name="theme-color" content="#0E0F11">',
'--ink:#0B1119;          /* night ground */':'--ink:#0E0F11;          /* slate-black night ground */',
'--ink-2:#111A26;        /* panel */':'--ink-2:#15171A;        /* panel */',
'--ink-3:#18232F;        /* raised */':'--ink-3:#1D2024;        /* raised */',
'--rule:#22303F;':'--rule:#30343A;', '--text:#DCE6F0;':'--text:#E4E7EB;', '--text-dim:#7D8FA3;':'--text-dim:#9AA3AE;',
'--ink-rgb:11 17 25;':'--ink-rgb:14 15 17;', '--ink-2-rgb:17 26 38;':'--ink-2-rgb:21 23 26;', '--ink-3-rgb:24 35 47;':'--ink-3-rgb:29 32 36;', '--rule-rgb:34 48 63;':'--rule-rgb:48 52 58;',
'--text-mute:#5C6B7D;':'--text-mute:#717984;', '--text-faint:#5E6E81;':'--text-faint:#7B848F;', '--dot-passed:#3F4D5D;':'--dot-passed:#454B53;', '--dot-idle:#4E607A;':'--dot-idle:#59616B;', '--map-canvas:#0A0F16;':'--map-canvas:#0A0B0D;'
}.items(): replace('bus.html',old,new)

# Make native clock icons follow the existing dark/light date-icon treatment.
replace('kerbside-journey-planner-ui.js',
'body:not(.theme-crystal) input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(1) brightness(1.45);opacity:.95}\nbody.theme-crystal input[type="date"]::-webkit-calendar-picker-indicator{filter:none;opacity:.78}',
'body:not(.theme-crystal) input[type="date"]::-webkit-calendar-picker-indicator,body:not(.theme-crystal) input[type="time"]::-webkit-calendar-picker-indicator{filter:invert(1) brightness(1.45);opacity:.95}\nbody.theme-crystal input[type="date"]::-webkit-calendar-picker-indicator,body.theme-crystal input[type="time"]::-webkit-calendar-picker-indicator{filter:none;opacity:.78}')

# The planner regression contains two synthetic timetable providers. Apply the
# same harmless argument capture to both so the post-patch remains deterministic.
post=Path('.github/scripts/kerbside-release-post.py')
post_text=post.read_text(encoding='utf-8')
needle="x(q,'    provider.getJourneyOptions=async()=>{\\n      const rows=[','    provider.getJourneyOptions=async options=>{\\n      window.__KERBSIDE_PLAN_TEST_ARGS__={...options};\\n      const rows=[')"
if needle not in post_text: raise SystemExit('Could not locate planner provider patch in release post script')
post_text=post_text.replace(needle,needle[:-1]+',2)',1)
# en-GB includes the punctuation after the weekday; assert the rendered value,
# rather than failing a healthy build over a test-only punctuation mismatch.
old_meta="assert.match(await page.locator('#planJourneyMeta').textContent(),/Wed 12 Aug 2026 · departures 09:00–11:00/);"
new_meta="assert.match(await page.locator('#planJourneyMeta').textContent(),/Wed, 12 Aug 2026 · departures 09:00–11:00/);"
if old_meta not in post_text: raise SystemExit('Could not locate planner date-window expectation')
post_text=post_text.replace(old_meta,new_meta,1)
post.write_text(post_text,encoding='utf-8')

run('git','diff','--check')
