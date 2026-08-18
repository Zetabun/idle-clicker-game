#!/usr/bin/env python3
from pathlib import Path
import subprocess

VERSION = '0.9.46'
CSS = Path('kerbside-trains.css')
TEST = Path('kerbside-backend/tests/train-mobile-layout-regression.mjs')


def replace_once(path, old, new, label):
    text = path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one {label}, found {count}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


css_anchor = """/* Kerbside 0.9.43 desktop rail width pass: avoid the cramped 260px desktop
   rail between the full desktop and stacked mobile layouts. */"""
mobile_forecast_css = """/* Kerbside 0.9.46 — mobile forecast readability.
   The forecast sheet is a reading surface, not a dense data table. On phones
   the previous 8.5-12px labels/body copy were visibly harder to scan, so keep
   the desktop hierarchy unchanged and raise only the stacked mobile sheet. */
@media (max-width:820px){
  .train-service.is-sheet .train-crowding-explain{padding:16px 14px}
  .train-service.is-sheet .train-forecast-status strong{font-size:18px}
  .train-service.is-sheet .train-forecast-meta{font-size:12px;line-height:1.45}
  .train-service.is-sheet .train-forecast-reasons>span,
  .train-service.is-sheet .train-forecast-calibration>span,
  .train-service.is-sheet .train-forecast-probabilities>span,
  .train-service.is-sheet .train-forecast-history>span,
  .train-service.is-sheet .train-forecast-method>summary{font-size:11.5px;line-height:1.45}
  .train-service.is-sheet .train-forecast-reasons ul{gap:10px;margin-top:11px}
  .train-service.is-sheet .train-forecast-reasons li{gap:4px 10px;font-size:14px;line-height:1.55}
  .train-service.is-sheet .train-forecast-flag{min-width:60px;padding:3px 8px;font-size:10px}
  .train-service.is-sheet .train-forecast-method,
  .train-service.is-sheet .train-forecast-calibration,
  .train-service.is-sheet .train-forecast-probabilities,
  .train-service.is-sheet .train-forecast-history{margin-top:15px;padding-top:15px}
  .train-service.is-sheet .train-forecast-method>p{font-size:13px;line-height:1.6}
  .train-service.is-sheet .train-forecast-calibration b,
  .train-service.is-sheet .train-forecast-history b,
  .train-service.is-sheet .train-forecast-probabilities>b{font-size:13px;line-height:1.55}
  .train-service.is-sheet .train-forecast-calibration i{font-size:11.5px;line-height:1.55}
  .train-service.is-sheet .train-forecast-legend>span,
  .train-service.is-sheet .train-forecast-legend b{font-size:11.5px}
}

"""
replace_once(CSS, css_anchor, mobile_forecast_css + css_anchor, 'mobile forecast readability insertion')


test_anchor = """  assert.ok(metrics.overflow<=1,`mobile page should not gain horizontal overflow: ${JSON.stringify(metrics)}`);
  assert.deepEqual(pageErrors,[],`unexpected page errors: ${pageErrors.join('\\n')}`);"""
test_replacement = """  assert.ok(metrics.overflow<=1,`mobile page should not gain horizontal overflow: ${JSON.stringify(metrics)}`);

  // Forecast detail is a long-form reading surface on phones. Keep the
  // explanatory copy comfortably above the tiny metadata sizes used on the
  // desktop board, and prove the larger labels do not create horizontal scroll.
  await page.evaluate(()=>{
    const fixture=document.createElement('article');
    fixture.id='mobileForecastFixture';
    fixture.className='train-service is-sheet';
    fixture.innerHTML=`<div class="train-service-detail"><section class="train-crowding-explain crowd-quiet">
      <div class="train-forecast-head"><span class="train-forecast-status"><i></i><strong>Quiet</strong></span><span class="train-forecast-meta">High confidence · Forecast v4 · Live-adjusted</span></div>
      <div class="train-forecast-reasons"><span>Why this forecast</span><ul>
        <li class="reason-down"><span class="train-forecast-flag">Quieter</span><span class="train-forecast-reason-text">Train starts at this station, so there is no carried load from earlier calls</span></li>
        <li class="reason-up"><span class="train-forecast-flag">Busier</span><span class="train-forecast-reason-text">London Euston is in the busiest 5% of GB stations in ORR usage</span></li>
      </ul></div>
      <details class="train-forecast-method" open><summary>How this is worked out</summary><p>Kerbside combines measured demand with the timetable, live evidence and the selected travel time.</p></details>
      <div class="train-forecast-calibration"><span>Measured baseline</span><b>DfT measured baseline: 16 passengers per 100 seats.</b><i>DfT rail passenger numbers and crowding, autumn 2025 (OGL v3)</i></div>
      <div class="train-forecast-probabilities"><span>Probability</span><b>Quiet 72% · Moderate 20% · Busy 8%</b></div>
    </section></div>`;
    document.body.appendChild(fixture);
  });

  const forecastType=await page.evaluate(()=>{
    const root=document.querySelector('#mobileForecastFixture .train-crowding-explain');
    const size=selector=>parseFloat(getComputedStyle(root.querySelector(selector)).fontSize)||0;
    return {
      meta:size('.train-forecast-meta'),
      heading:size('.train-forecast-reasons>span'),
      reason:size('.train-forecast-reason-text'),
      flag:size('.train-forecast-flag'),
      methodSummary:size('.train-forecast-method>summary'),
      methodBody:size('.train-forecast-method>p'),
      baseline:size('.train-forecast-calibration b'),
      source:size('.train-forecast-calibration i'),
      probability:size('.train-forecast-probabilities>b'),
      overflow:root.scrollWidth-root.clientWidth
    };
  });
  assert.ok(forecastType.meta>=12,`mobile forecast metadata should be readable: ${JSON.stringify(forecastType)}`);
  assert.ok(forecastType.heading>=11.5,`mobile forecast section labels should be readable: ${JSON.stringify(forecastType)}`);
  assert.ok(forecastType.reason>=14,`mobile forecast reasons should use body-sized text: ${JSON.stringify(forecastType)}`);
  assert.ok(forecastType.flag>=10,`mobile forecast direction pills should remain legible: ${JSON.stringify(forecastType)}`);
  assert.ok(forecastType.methodSummary>=11.5,`mobile forecast method heading should be readable: ${JSON.stringify(forecastType)}`);
  assert.ok(forecastType.methodBody>=13,`mobile forecast method copy should be readable: ${JSON.stringify(forecastType)}`);
  assert.ok(forecastType.baseline>=13,`mobile measured baseline should be readable: ${JSON.stringify(forecastType)}`);
  assert.ok(forecastType.source>=11.5,`mobile forecast source note should be readable: ${JSON.stringify(forecastType)}`);
  assert.ok(forecastType.probability>=13,`mobile probability copy should be readable: ${JSON.stringify(forecastType)}`);
  assert.ok(forecastType.overflow<=1,`larger mobile forecast type must not overflow: ${JSON.stringify(forecastType)}`);
  assert.deepEqual(pageErrors,[],`unexpected page errors: ${pageErrors.join('\\n')}`);"""
replace_once(TEST, test_anchor, test_replacement, 'mobile forecast typography regression')

Path('VERSION').write_text(VERSION + '\n', encoding='utf-8')
subprocess.run(['python3', '.github/scripts/sync-version.py'], check=True)

css = CSS.read_text(encoding='utf-8')
for needle in (
    'Kerbside 0.9.46 — mobile forecast readability.',
    '.train-service.is-sheet .train-forecast-reasons li{gap:4px 10px;font-size:14px;line-height:1.55}',
    '.train-service.is-sheet .train-forecast-method>p{font-size:13px;line-height:1.6}',
    '.train-service.is-sheet .train-forecast-calibration i{font-size:11.5px;line-height:1.55}',
):
    if needle not in css:
        raise SystemExit(f'missing mobile forecast CSS marker: {needle}')

test = TEST.read_text(encoding='utf-8')
for needle in ('mobileForecastFixture', 'forecastType.reason>=14', 'forecastType.overflow<=1'):
    if needle not in test:
        raise SystemExit(f'missing mobile forecast regression marker: {needle}')

print('Kerbside 0.9.46 mobile forecast readability release patch applied.')
