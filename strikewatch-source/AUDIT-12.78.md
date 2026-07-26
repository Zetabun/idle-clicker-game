# Build 12.78 Audit — Desktop Inbox Spacing & Readability

## Scope

- Removed the obsolete desktop `78px` fixed height that clipped enlarged sender, subject and preview copy inside Inbox rows.
- Made desktop message rows content-aware with enough room for metadata, a two-line subject and a two-line preview.
- Allowed the desktop message list to use the available mail-column height instead of being capped to two rows.
- Removed duplicate desktop padding from the mail reader while retaining the existing header, subject, body and action-section padding.
- Tightened desktop subject sizing and wrapping so long email titles remain inside the reader column.
- Mobile Inbox presentation, mail data, decisions, gameplay, economy, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

## Regression requirements

- Desktop mail rows must contain their rendered copy without overlapping adjacent rows.
- The desktop list must no longer be capped at `156px` or two fixed rows.
- The reader must use zero outer padding and retain its internal message-section spacing.
- Long subjects and previews must remain contained without document-level horizontal overflow.
- Mobile Inbox sizing and stacking must remain unchanged.

## Verification executed

- Read the required Markdown files before implementation.
- `python3 -m py_compile build.py` passed.
- Every modular JavaScript file and the generated bundle passed `node --check`.
- `python3 build.py` rebuilt `js/strikewatch.dev.js` and `dist/strikewatch-build-12.78.html` successfully.
- Browser checks passed at `390x844`, `1024x768`, `1366x768` and `1600x900` using the complete standalone build.
- Desktop checks confirmed rows of at least `104px`, zero row overlap, a list taller than `200px`, zero reader outer padding and contained message subjects.
- All tested sizes recorded zero page errors and zero document/menu horizontal overflow.
- A second syntax/build pass was completed after browser verification.
