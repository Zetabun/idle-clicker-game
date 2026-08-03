import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const releaseWorkflow = await readFile(new URL('../../.github/workflows/kerbside-release.yml', import.meta.url), 'utf8');
const productionWorkflow = await readFile(new URL('../../.github/workflows/verify-kerbside-production.yml', import.meta.url), 'utf8');

test('Kerbside release and production workflows guard deployment completeness', () => {
  assert.match(releaseWorkflow, /git diff --name-only -z HEAD --/);
  assert.match(releaseWorkflow, /git ls-files --others --exclude-standard -z/);
  assert.match(releaseWorkflow, /Unexpected release path:/);
  assert.match(releaseWorkflow, /kerbside-backend\/\*/);
  assert.match(releaseWorkflow, /Release branch moved during validation/);
  assert.match(releaseWorkflow, /EXPECTED_SOURCE_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
  assert.match(releaseWorkflow, /cancel-in-progress: true/);
  assert.match(releaseWorkflow, /NO_RELEASE=true/);
  assert.match(releaseWorkflow, /if: env\.NO_RELEASE != 'true'/);
  assert.match(releaseWorkflow, /test_path="\$\{RELEASE_SCRIPT%\.py\}\.test\.py"/);
  assert.match(releaseWorkflow, /actions\/upload-artifact@v4/);
  assert.match(releaseWorkflow, /git diff --cached --check/);
  assert.match(releaseWorkflow, /git commit -m "Release Kerbside browser update"/);
  assert.match(releaseWorkflow, /git push origin "HEAD:refs\/heads\/\$\{RELEASE_BRANCH\}"/);
  assert.doesNotMatch(releaseWorkflow, /git push --force/);
  assert.doesNotMatch(releaseWorkflow, /for path in \\\n\s+bus\.html/);

  assert.match(productionWorkflow, /\n  push:\n    branches:\n      - main/);
  assert.match(productionWorkflow, /playwright install --with-deps webkit/);
  assert.match(productionWorkflow, /Local production asset failed/);
  assert.match(productionWorkflow, /icon\.naturalWidth > 0/);
  assert.match(productionWorkflow, /#map\.leaflet-container/);
  assert.match(productionWorkflow, /document\.documentElement\.scrollWidth - window\.innerWidth/);
});
