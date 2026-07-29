# Build 12.164 — Lean Standalone

## Audit item

Addresses the next unresolved comprehensive-audit item: the roughly 4.7 MB monolithic standalone and the absence of repeatable release-size budgets.

## Implementation

`build.py` still emits the full readable development bundle. For the standalone only, it removes whole-line JavaScript/CSS comments and collapses redundant blank runs. It does not rename identifiers, compress expressions, alter strings, rewrite template literals, remove CSS declarations or change HTML structure.

A deterministic size report is written to `dist/strikewatch-build-12.164-size.json`, including raw and gzip sizes for the development bundle, release bundle, source/release CSS and final standalone. The build fails when JavaScript raw reduction is below 2.5%.

## Fidelity and behaviour

- Executable JavaScript tokens are unchanged.
- CSS declarations and selector order are unchanged.
- UI text, procedural geometry, materials, shaders, gameplay and persistence are unchanged.
- Source modules and the development bundle remain readable for maintenance.

## Verification gates

- Build succeeds twice and bundle, standalone and size-report hashes are identical.
- Every modular JavaScript file and the development bundle parse.
- Standalone inline JavaScript parses.
- Root `cod.html` is byte-identical to the standalone.
- Release JavaScript achieves at least 2.5% raw reduction against the development bundle.
