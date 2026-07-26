# Build 12.96 Audit — Streamlined Opponent Preparation

## Scope

- Reused the existing opponent-intelligence, response-template, fixture-focus and post-match evaluation systems rather than creating a duplicate counter mechanic.
- Replaced the default dense preparation presentation with a compact briefing containing one quick opponent read, one recommended response and one optional match focus.
- Removed the duplicate full opposition dossier and supporter-expectation panel from the Tactics route; those remain available on their dedicated League and Staff surfaces.
- Moved full scouting facts, alternative response plans and the complete focus list behind one explicit disclosure control.
- Kept real gameplay integration intact: response templates still stage formation, approach, engagement range and team priority; selected focuses still guide the post-match evidence review.
- Added no hidden win bonus, damage modifier or scripted outcome adjustment.

## Regression requirements

- Scouting uncertainty must still govern what opponent information is displayed.
- The compact view must remain useful at low report depth without inventing an exact weakness or formation.
- Applying the recommended response must stage the same tactical fields as the previous response cards.
- Expanding advanced analysis must preserve scroll position and remain open when selecting alternatives or focuses.
- The full post-match opponent-preparation review must remain unchanged in authority.
- Mobile and desktop layouts must avoid document-level horizontal overflow.

## Verification executed

- Read the current authority Markdown before implementation.
- `python3 -m py_compile build.py` passed.
- Every modular JavaScript file and the generated bundle passed `node --check`.
- `python3 build.py` rebuilt `js/strikewatch.dev.js` and `dist/strikewatch-build-12.96.html` successfully.
- Source inspection confirmed the compact view exposes only one recommendation and one optional focus by default.
- Source inspection confirmed alternatives and full scouting facts remain available through the advanced disclosure control.
- Source inspection confirmed response selection still calls the existing tactical-field staging path and no new combat/result modifier was introduced.
- Browser smoke tests passed at `390x844` and `1366x768`: the compact state hid all alternative cards, the disclosure revealed three response templates and four focus cards, selection rerenders preserved the expanded state, and document-level horizontal overflow remained zero.
- One-click recommendation and focus tests passed: applying the recommendation updated the current response, and adding the suggested focus updated the selected-focus count without opening the advanced section.
