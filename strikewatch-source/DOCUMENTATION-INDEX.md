# Documentation index

The documentation is intentionally layered to minimise GPT startup context.

## Default reading

1. `HANDOFF.md` — current release, workflow and task routing.
2. `AGENTS.md` — concise coding and documentation rules.

That is the complete default set. Do not automatically load the remaining
documents.

## Task-specific references

| Document | Load when |
| --- | --- |
| `CONTRACTS.md` | A task touches behavioural, responsive, persistence, economy, match or rendering invariants |
| `ARCHITECTURE.md` | Locating implementation ownership, dependencies or state |
| `PROJECT.md` | A short product/technical overview is useful |
| `README.md` | Build/start instructions or developer-facing summary |
| `CHANGELOG.md` | Locating one historical regression record |
| `AUDIT-12.120.md` | Changing or verifying the current release |
| other `AUDIT-*.md` | A specific historical system/regression requires it |

`00-READ-FIRST-GPT.md` and `GPT-HANDOFF-PROMPT.txt` are concise compatibility
entry points. They redirect to the same default set and are not additional
required reading.

## Current release

- Build 12.120 — Mobile Flow & Accessibility Fix
- Standalone: `dist/strikewatch-build-12.120.html`
- Live artifact: root `cod.html`
- Save schema 19
- Diagnostics schema 1

## Historical lookup

Use `CHANGELOG.md` or:

```text
rg -l "system, feature or function" AUDIT-*.md
```

Read the newest matching audit first. Never load all audits simply because
they exist.

## Maintenance

- Put current operational state in `HANDOFF.md`.
- Put stable cross-release rules in one `CONTRACTS.md` section.
- Put ownership changes in `ARCHITECTURE.md`.
- Put release-specific evidence in one audit.
- Avoid copying the same release description into multiple files.
- When history is superseded, keep it in its audit and Git history rather than
  in the default-read documents.
