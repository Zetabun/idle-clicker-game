# Build 12.92 Audit — Aligned Desktop Sidebar & Readable Labels

## Scope

- Enlarged desktop department labels, icons and inline access badges while retaining compact one-line navigation rows.
- Aligned the desktop sidebar boundary with the header division after Back and Gold Balance.
- Used a 232-pixel rail from 1024–1279px and a 266-pixel rail at 1280px and wider, matching the corresponding header grid columns.
- Removed the layout gap between the rail and content so the vertical boundary is continuous.
- Retained the unboxed club crest and left mobile/compact-landscape navigation unchanged.

## Verification requirements

- At 1024–1279px, sidebar width must equal 48px + 184px = 232px.
- At 1280px and wider, sidebar width must equal 52px + 214px = 266px.
- Menu labels must render at 10px with 19px icons and remain on one line.
- Five department rows must remain content-sized at 42px each with four 4px gaps.
- Mobile navigation rules below 1024px must remain unchanged.

## Verification executed

- Read the current release and authority Markdown files before implementation.
- `python3 -m py_compile build.py` passed.
- Every modular JavaScript file and the generated bundle passed `node --check`.
- `python3 build.py` generated `dist/strikewatch-build-12.92.html`.
- Browser geometry checks at 1024 × 768 and 1366 × 768 confirmed the sidebar edge matched the corresponding header division and menu rows retained natural height.
- A second syntax/build and browser regression pass completed after final documentation edits.
