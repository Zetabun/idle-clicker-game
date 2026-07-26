# Build 12.85 Audit — Onboarding Focus & Saved Mail

## Scope

- Simplified the Operations Command Centre whenever the existing First Match Journey is active.
- During onboarding, retained the journey, optional context, compact club identity and Team XP while withholding the normal calendar strip, fixture/status dashboard, objectives, priority queue, form/momentum panel, command directory, match-preparation dashboard and line-up snapshot.
- Restored the complete Command Centre automatically when `firstMatchGuidance()` returns no active step; no new onboarding completion state was introduced.
- Changed Inbox behaviour so read unsaved messages leave the active Inbox immediately.
- Added a Saved Mail folder and save/unsave actions to the reader and full-email modal.
- Kept unresolved decision mail visible in Inbox until its decision is resolved, regardless of read state.
- Added retention priority for saved mail and unresolved decision mail when the mail store is trimmed.
- Added the per-message `saved` boolean additively under save schema 19; the selected folder remains transient UI state.

## Regression requirements

- The normal Command Centre dashboard must remain complete outside onboarding.
- Onboarding must continue to use the existing First Match Journey and progressive-access authorities.
- Opening an ordinary unsaved email must reduce the Inbox count by one while leaving the full-email modal readable.
- Saving a read email must make it available in Saved Mail; unsaving it must remove it from Saved Mail without returning it to Inbox unless marked unread.
- Unresolved decision mail must remain discoverable until answered.
- Mail generation, decisions, End Day blockers, topbar unread count, desktop two-pane spacing and mobile row readability must remain functional.
- No document or management-pane horizontal overflow may be introduced.

## Verification executed

- Read the current release documents and relevant onboarding, Command Centre and Inbox audits before implementation.
- `python3 -m py_compile build.py` passed.
- Every modular JavaScript source file and the generated bundle passed `node --check`.
- `python3 build.py` rebuilt `js/strikewatch.dev.js` and `dist/strikewatch-build-12.85.html` successfully.
- Browser tests using the complete standalone build passed at `390x844` and `1366x768`.
- Onboarding Command Centre tests confirmed the calendar strip, normal overview grid, planning grid, form panel, command directory and line-up panel were absent while the First Match Journey and Command Centre hero remained visible.
- Inbox tests began with five messages; opening one unsaved message reduced the Inbox list to four while the full-email modal remained open.
- Save tests changed the modal action from `☆ SAVE EMAIL` to `★ SAVED EMAIL`, placed the read message in Saved Mail, and retained its message ID.
- Unsave tests removed the message from Saved Mail and did not return the already-read message to Inbox.
- Mobile and desktop mail tests recorded zero page errors, zero document horizontal overflow and zero management-pane horizontal overflow.
- A second complete syntax/build pass was run after the final documentation and styling updates.
