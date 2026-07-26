# Build 12.91 Audit — Natural-Height Desktop Sidebar

## Scope

- Corrected the inherited desktop sidebar flex/grid behaviour that stretched five navigation rows across the available height.
- Converted the desktop department rail into five compact 36-pixel one-line rows.
- Removed card borders and rounded tile styling from the department list.
- Kept the selected club crest at the top without a visual container.
- Moved access and lock badges into the same line as each department title.
- Mobile and compact-landscape navigation remain unchanged.

## Verification requirements

- The desktop `.menu-nav` must use natural content height rather than flexing to fill the sidebar.
- All five desktop menu rows must remain 36 pixels tall and tightly packed.
- Access badges must remain inline and not anchor at the bottom of a tall tile.
- The club crest must have no border, background card or shadow container.
- Mobile navigation must remain under its existing breakpoint authorities.

## Verification executed

- Read the current release and authority Markdown files before implementation.
- `python3 -m py_compile build.py` passed.
- Every modular JavaScript source file and the generated bundle passed `node --check`.
- `python3 build.py` generated `dist/strikewatch-build-12.91.html`.
- A synthetic desktop layout test at 1440 × 900 verified a 192-pixel navigation block (five 36-pixel rows plus four 3-pixel gaps), five fixed-height menu rows and inline badges.
- A second syntax/build verification pass completed after the final CSS and documentation edits.
