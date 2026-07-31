#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
mkdir -p .github/diagnostics
LOG=.github/diagnostics/12.229.txt
: > "$LOG"
exec > >(tee -a "$LOG") 2>&1

echo '=== compile and apply release patch ==='
python3 -m py_compile .github/scripts/release-12.229.py
python3 .github/scripts/release-12.229.py
python3 -m py_compile .github/scripts/verify-12.229.py
python3 -m py_compile strikewatch-source/build.py

echo '=== first deterministic build ==='
(
  cd strikewatch-source
  python3 build.py
)
cp strikewatch-source/js/strikewatch.dev.js /tmp/strikewatch.dev.12.229.first.js
cp strikewatch-source/dist/strikewatch-build-12.229.html /tmp/strikewatch-build-12.229.first.html
cp strikewatch-source/dist/strikewatch-build-12.229-size.json /tmp/strikewatch-build-12.229-size.first.json
cp strikewatch-source/dist/strikewatch-build-12.229-css-debt.json /tmp/strikewatch-build-12.229-css-debt.first.json

echo '=== targeted and browser verification ==='
python3 .github/scripts/verify-12.229.py

echo '=== second deterministic build ==='
(
  cd strikewatch-source
  python3 build.py
)
cmp /tmp/strikewatch.dev.12.229.first.js strikewatch-source/js/strikewatch.dev.js
cmp /tmp/strikewatch-build-12.229.first.html strikewatch-source/dist/strikewatch-build-12.229.html
cmp /tmp/strikewatch-build-12.229-size.first.json strikewatch-source/dist/strikewatch-build-12.229-size.json
cmp /tmp/strikewatch-build-12.229-css-debt.first.json strikewatch-source/dist/strikewatch-build-12.229-css-debt.json

echo '=== publish verified standalone ==='
cp strikewatch-source/dist/strikewatch-build-12.229.html cod.html
cmp strikewatch-source/dist/strikewatch-build-12.229.html cod.html

echo '=== clean temporary release machinery ==='
rm -f \
  .github/scripts/release-12.229.py \
  .github/scripts/verify-12.229.py \
  .github/scripts/run-release-12.229.sh \
  .github/workflows/release-12.229.yml \
  .github/workflows/release-12.229-minimal.yml \
  .github/triggers/release-12.229.txt \
  .github/triggers/release-12.229-minimal.txt \
  .github/diagnostics/12.229.txt

echo '=== commit release ==='
git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git add -A
git commit -m 'Build 12.229: Configuration Access & Mobile Mail Dismissal'
git push origin HEAD:main
