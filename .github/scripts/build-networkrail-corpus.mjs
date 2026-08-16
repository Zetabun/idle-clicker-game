#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { promisify } from 'node:util';

const gunzip = promisify(zlib.gunzip);

export function corpusRows(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  for (const key of ['TIPLOCDATA', 'tiplocData', 'locations', 'data']) {
    if (Array.isArray(value[key])) return value[key];
  }
  for (const child of Object.values(value)) if (Array.isArray(child)) return child;
  return [];
}

function clean(value) { return String(value == null ? '' : value).trim(); }
function stanox(value) { return clean(value).replace(/\.0$/, ''); }
function crs(value) { const v = clean(value).toUpperCase(); return /^[A-Z0-9]{3}$/.test(v) ? v : ''; }

function quality(row) {
  let score = 0;
  if (row[1]) score += 5;
  if (row[0]) score += 3;
  if (row[3]) score += 2;
  if (row[2]) score += 1;
  return score;
}

export function compactCorpus(value) {
  const map = {};
  for (const raw of corpusRows(value)) {
    if (!raw || typeof raw !== 'object') continue;
    const code = stanox(raw.STANOX ?? raw.stanox);
    if (!/^\d{5}$/.test(code)) continue;
    const row = [
      clean(raw.TIPLOC ?? raw.tiploc).toUpperCase(),
      crs(raw['3ALPHA'] ?? raw.crs ?? raw.CRS),
      clean(raw.NLC ?? raw.nlc),
      clean(raw.NLCDESC ?? raw.description ?? raw.name ?? raw.NLCDESC16)
    ];
    if (!map[code] || quality(row) > quality(map[code])) map[code] = row;
  }
  return map;
}

export function moduleText(map, source = 'Network Rail CORPUS') {
  const ordered = Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)));
  const meta = { generatedAt: new Date().toISOString(), count: Object.keys(ordered).length, source };
  return `// Generated from Network Rail CORPUS. Do not edit by hand.\nexport const CORPUS=${JSON.stringify(ordered)};\nexport const CORPUS_META=${JSON.stringify(meta)};\n`;
}

async function readJson(file) {
  let bytes = await fs.readFile(file);
  if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) bytes = await gunzip(bytes);
  return JSON.parse(bytes.toString('utf8'));
}

async function main() {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) {
    console.error('Usage: build-networkrail-corpus.mjs <CORPUSExtract.json[.gz]> <corpus.generated.js>');
    process.exitCode = 2; return;
  }
  const json = await readJson(input);
  const map = compactCorpus(json);
  const count = Object.keys(map).length;
  if (count < 1000) throw new Error(`CORPUS produced only ${count} STANOX rows; refusing to publish`);
  await fs.mkdir(path.dirname(path.resolve(output)), { recursive: true });
  await fs.writeFile(output, moduleText(map), 'utf8');
  console.log(`Built ${count} Network Rail CORPUS STANOX mappings.`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
