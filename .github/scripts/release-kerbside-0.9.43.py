#!/usr/bin/env python3
from pathlib import Path
import subprocess

TARGET_VERSION = "0.9.43"


def replace_once(path, old, new, label):
    path = Path(path)
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one {label}, found {count}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


def append_once(path, marker, block):
    path = Path(path)
    text = path.read_text(encoding="utf-8")
    if marker in text:
        raise SystemExit(f"{path}: desktop rail width marker already present")
    path.write_text(text.rstrip() + "\n\n" + block.strip() + "\n", encoding="utf-8")


# Desktop rail layout: the old <=1000px breakpoint compressed the left rail
# from 360px to 260px while still keeping the two-pane desktop layout. That
# left the controls with roughly phone-width content in a desktop shell. Keep
# the desktop rail fluid instead, with 360px as a hard floor and more breathing
# room on ordinary laptop/desktop widths. Mobile remains unchanged <=820px.
css_marker = "Kerbside 0.9.43 desktop rail width pass"
css_block = r'''
/* Kerbside 0.9.43 desktop rail width pass: avoid the cramped 260px desktop
   rail between the full desktop and stacked mobile layouts. */
@media (min-width:821px){
  body[data-transport="train"] .train-shell{
    grid-template-columns:clamp(360px,30vw,460px) minmax(0,1fr);
  }
  body[data-transport="train"] .train-sidebar{
    padding:26px 22px 32px;
  }
  body[data-transport="train"] .train-view-tabs{
    gap:4px;margin-bottom:18px;padding:4px;border-radius:12px;
  }
  body[data-transport="train"] .train-view-tabs button{
    min-height:42px;padding:9px 10px;font-size:12.5px;line-height:1.2;
  }
  body[data-transport="train"] .train-sidebar .train-kicker{
    font-size:11px;line-height:1.4;
  }
  body[data-transport="train"] .train-sidebar h2{
    font-size:28px;line-height:1.12;
  }
  body[data-transport="train"] .train-intro{
    margin-bottom:24px;font-size:13.5px;line-height:1.6;
  }
  body[data-transport="train"] .train-sidebar .train-planner{
    gap:14px;margin-top:6px;margin-bottom:18px;
  }
  body[data-transport="train"] .train-sidebar .train-card{
    padding:16px;border-radius:14px;
  }
  body[data-transport="train"] .train-sidebar .train-card-title{
    margin-bottom:12px;font-size:15px;
  }
  body[data-transport="train"] .train-sidebar .train-where-grid .train-search-box input{
    padding:14px 13px;
  }
  body[data-transport="train"] .train-sidebar .train-card .train-date-row input,
  body[data-transport="train"] .train-sidebar .train-planner-time input{
    padding:13px;
  }
  body[data-transport="train"] .train-sidebar .train-card .train-date-today{
    min-height:48px;padding-left:18px!important;padding-right:18px!important;font-size:14px;
  }
  body[data-transport="train"] .train-sidebar .train-journey-go{
    min-height:54px;font-size:16px!important;
  }
  body[data-transport="train"] .train-sidebar .train-model-card{
    padding:16px;font-size:12.5px;line-height:1.6;
  }
  body[data-transport="train"] .train-sidebar .train-model-card .train-model-label{
    font-size:10px;
  }
  body[data-transport="train"] .train-sidebar .train-model-card strong{
    font-size:14px;
  }
}
@media (min-width:821px) and (max-width:1000px){
  body[data-transport="train"] .train-sidebar{
    padding-left:18px;padding-right:18px;
  }
}
'''
append_once("kerbside-trains.css", css_marker, css_block)

# Regression: validate the large desktop width and, critically, the former
# 260px middle breakpoint at a 980px viewport in both browser engines.
test_path = "kerbside-backend/tests/train-desktop-ui-regression.mjs"
anchor = """  const trainPlanner=page.locator('#trainPlanner');
  await trainPlanner.waitFor({state:'visible',timeout:10000});

  await page.click('#trainViewTabs [data-train-view=\"plan\"]');
"""
replacement = """  const trainPlanner=page.locator('#trainPlanner');
  await trainPlanner.waitFor({state:'visible',timeout:10000});

  const roomyDesktop=await page.evaluate(()=>{
    const sidebar=document.querySelector('.train-sidebar'),card=document.querySelector('.train-sidebar .train-card'),tab=document.querySelector('#trainViewTabs button');
    return {sidebarWidth:sidebar.getBoundingClientRect().width,cardPadding:parseFloat(getComputedStyle(card).paddingLeft)||0,tabHeight:tab.getBoundingClientRect().height};
  });
  assert.ok(roomyDesktop.sidebarWidth>=420,`1440px desktop rail should have breathing room: ${JSON.stringify(roomyDesktop)}`);
  assert.ok(roomyDesktop.cardPadding>=15,`desktop train cards should keep comfortable padding: ${JSON.stringify(roomyDesktop)}`);
  assert.ok(roomyDesktop.tabHeight>=41,`desktop train tabs should not feel compressed: ${JSON.stringify(roomyDesktop)}`);

  await page.setViewportSize({width:980,height:900});
  await page.waitForTimeout(80);
  const compactDesktop=await page.evaluate(()=>{
    const shell=document.querySelector('.train-shell'),sidebar=document.querySelector('.train-sidebar'),content=document.querySelector('.train-content'),card=document.querySelector('.train-sidebar .train-card');
    return {display:getComputedStyle(shell).display,sidebarWidth:sidebar.getBoundingClientRect().width,contentWidth:content.getBoundingClientRect().width,cardWidth:card.getBoundingClientRect().width};
  });
  assert.equal(compactDesktop.display,'grid','980px should remain the two-pane desktop train layout');
  assert.ok(compactDesktop.sidebarWidth>=350,`sub-1000 desktop rail must not collapse back to 260px: ${JSON.stringify(compactDesktop)}`);
  assert.ok(compactDesktop.contentWidth>=500,`wider desktop rail must still leave a usable train board: ${JSON.stringify(compactDesktop)}`);
  assert.ok(compactDesktop.cardWidth>=310,`desktop train cards should retain usable content width: ${JSON.stringify(compactDesktop)}`);
  await page.setViewportSize({width:1440,height:900});
  await page.waitForTimeout(80);

  await page.click('#trainViewTabs [data-train-view=\"plan\"]');
"""
replace_once(test_path, anchor, replacement, "desktop rail geometry regression anchor")

# Version bump last so patch failures cannot leave a partial browser release.
version_path = Path("VERSION")
current = version_path.read_text(encoding="utf-8").strip()
if current != "0.9.42":
    raise SystemExit(f"Expected VERSION 0.9.42 before release, found {current}")
version_path.write_text(TARGET_VERSION + "\n", encoding="utf-8")
subprocess.run(["python3", ".github/scripts/sync-version.py"], check=True)
subprocess.run(["python3", ".github/scripts/sync-version.py", "--check"], check=True)

print("Prepared Kerbside 0.9.43: fluid desktop rail width and roomier desktop controls.")
