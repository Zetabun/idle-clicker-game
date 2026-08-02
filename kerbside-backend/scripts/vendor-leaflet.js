import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(scriptDirectory, '..');
const packageRoot = path.join(backendRoot, 'node_modules', 'leaflet');
const targetRoot = path.join(backendRoot, 'vendor', 'leaflet');

const EXPECTED_VERSION = '1.9.4';
const EXPECTED_HASHES = new Map([
  ['dist/leaflet.js', '20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='],
  ['dist/leaflet.css', 'p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=']
]);

const FILES = [
  ['dist/leaflet.js', 'leaflet.js'],
  ['dist/leaflet.css', 'leaflet.css'],
  ['dist/images/layers.png', 'images/layers.png'],
  ['dist/images/layers-2x.png', 'images/layers-2x.png'],
  ['dist/images/marker-icon.png', 'images/marker-icon.png'],
  ['dist/images/marker-icon-2x.png', 'images/marker-icon-2x.png'],
  ['dist/images/marker-shadow.png', 'images/marker-shadow.png'],
  ['LICENSE', 'LICENSE']
];

function sha256Base64(buffer) {
  return createHash('sha256').update(buffer).digest('base64');
}

async function verifyPackage() {
  const packageJson = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'));
  if (packageJson.version !== EXPECTED_VERSION) {
    throw new Error(`Expected leaflet@${EXPECTED_VERSION}, found ${packageJson.version || 'unknown'}`);
  }

  for (const [relativePath, expected] of EXPECTED_HASHES) {
    const buffer = await readFile(path.join(packageRoot, relativePath));
    const actual = sha256Base64(buffer);
    if (actual !== expected) {
      throw new Error(`Leaflet integrity mismatch for ${relativePath}: expected ${expected}, found ${actual}`);
    }
  }
}

async function copyAssets() {
  await rm(targetRoot, { recursive: true, force: true });
  await mkdir(path.join(targetRoot, 'images'), { recursive: true });

  for (const [sourcePath, destinationPath] of FILES) {
    const source = path.join(packageRoot, sourcePath);
    const destination = path.join(targetRoot, destinationPath);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(source, destination);
  }

  const readme = `# Vendored Leaflet\n\n` +
    `These files are generated from the pinned npm package \`leaflet@${EXPECTED_VERSION}\` by \`scripts/vendor-leaflet.js\`.\n\n` +
    `The JavaScript and CSS are checked against the SHA-256 integrity values published on the official Leaflet download page before they are copied. Do not edit generated files directly.\n`;
  await writeFile(path.join(targetRoot, 'README.md'), readme, 'utf8');
}

async function verifyOutput() {
  for (const [sourcePath, destinationPath] of FILES) {
    const source = await readFile(path.join(packageRoot, sourcePath));
    const destination = await readFile(path.join(targetRoot, destinationPath));
    if (!source.equals(destination)) {
      throw new Error(`Vendored Leaflet file differs from its package source: ${destinationPath}`);
    }
  }
}

await verifyPackage();
await copyAssets();
await verifyOutput();
console.log(`Vendored Leaflet ${EXPECTED_VERSION} into ${path.relative(process.cwd(), targetRoot)}`);
