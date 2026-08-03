import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const releaseWorkflow = await readFile(new URL('../../.github/workflows/kerbside-release.yml', import.meta.url), 'utf8');
const productionWorkflow = await readFile(new URL('../../.github/workflows/verify-kerbside-production.yml', import.meta.url), 'utf8');

test('Kerbside release and production workflows guard deployment completeness', () => {
  assert.match(releaseWorkflow, /\['git', 'diff', '--name-only', '-z', 'HEAD', '--'\]/);
  assert.match(releaseWorkflow, /\['git', 'ls-files', '--others', '--exclude-standard', '-z'\]/);
  assert.match(releaseWorkflow, /Unexpected release path\(s\):/);
  assert.match(releaseWorkflow, /path\.startswith\('kerbside-backend\/'\)/);
  assert.match(releaseWorkflow, /Release branch moved during validation/);
  assert.match(releaseWorkflow, /Release branch moved before publication/);
  assert.match(releaseWorkflow, /cancel-in-progress: true/);
  assert.match(releaseWorkflow, /NO_RELEASE=true/);
  assert.match(releaseWorkflow, /if: env\.NO_RELEASE != 'true'/);
  assert.match(releaseWorkflow, /test_path="\$\{RELEASE_SCRIPT%\.py\}\.test\.py"/);
  assert.match(releaseWorkflow, /actions\/upload-artifact@v4/);
  assert.match(releaseWorkflow, /transient_statuses = \{429, 500, 502, 503, 504\}/);
  assert.match(releaseWorkflow, /api\('POST', '\/git\/blobs'/);
  assert.match(releaseWorkflow, /api\('POST', '\/git\/trees'/);
  assert.match(releaseWorkflow, /api\('POST', '\/git\/commits'/);
  assert.match(releaseWorkflow, /api\('PATCH', update_ref_path, \{'sha': commit\['sha'\], 'force': False\}\)/);
  assert.doesNotMatch(releaseWorkflow, /git push --force/);
  assert.doesNotMatch(releaseWorkflow, /git push origin/);
  assert.doesNotMatch(releaseWorkflow, /for path in \\\n\s+bus\.html/);

  assert.match(productionWorkflow, /\n  push:\n    branches:\n      - main/);
  assert.match(productionWorkflow, /playwright install --with-deps webkit/);
  assert.match(productionWorkflow, /Local production asset failed/);
  assert.match(productionWorkflow, /icon\.naturalWidth > 0/);
  assert.match(productionWorkflow, /#map\.leaflet-container/);
  assert.match(productionWorkflow, /document\.documentElement\.scrollWidth - window\.innerWidth/);
});
