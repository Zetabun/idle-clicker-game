import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const readWorkflow = async relative => (await readFile(new URL(relative, import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
const releaseWorkflow = await readWorkflow('../../.github/workflows/kerbside-release.yml');
const productionWorkflow = await readWorkflow('../../.github/workflows/verify-kerbside-production.yml');

test('Kerbside release and production workflows guard deployment completeness', () => {
  assert.match(releaseWorkflow, /git diff --name-only -z HEAD/);
  assert.match(releaseWorkflow, /git ls-files --others --exclude-standard -z/);
  assert.match(releaseWorkflow, /Unexpected release path:/);
  assert.match(releaseWorkflow, /kerbside-backend\/\*/);
  assert.match(releaseWorkflow, /Release branch moved during validation/);
  assert.doesNotMatch(releaseWorkflow, /for path in \\\n\s+bus\.html/);

  assert.match(productionWorkflow, /\n  push:\n    branches:\n      - main/);
  assert.match(productionWorkflow, /playwright install --with-deps webkit/);
  assert.match(productionWorkflow, /Local production asset failed/);
  assert.match(productionWorkflow, /icon\.naturalWidth > 0/);
  assert.match(productionWorkflow, /#map\.leaflet-container/);
  assert.match(productionWorkflow, /document\.documentElement\.scrollWidth - window\.innerWidth/);
});
