# Build 12.225 — Match Surface Gesture Containment

Blocks browser pinch zoom on the play surface, and corrects the audit that had
been claiming to check for it.

## What was actually wrong

Build 12.224 reported `typographyConsistencyForTest()` failing on a single
check, `pinchZoomDisabled`, and recorded it as a false alarm on the grounds that
Build 12.161 deliberately restored pinch zoom. That was half right. Looking
properly turned up three separate problems.

**1. The check could not do its job.** It tested the viewport meta string:

```js
pinchZoomDisabled: /user-scalable\s*=\s*no/i.test(viewport)
  && /maximum-scale\s*=\s*1(?:\D|$)/i.test(viewport)
```

iOS Safari has ignored both `user-scalable=no` and `maximum-scale` since iOS 10,
deliberately, as an accessibility decision. Satisfying this check by adding
those attributes would have turned the gate green while iPhones carried on
pinch-zooming the arena — a gate that lies, which is worse than one that fails
honestly.

**2. The arena really was zoomable.** `#game` had no `touch-action` of its own,
so it inherited `body { touch-action: manipulation }` from `css/game.css`.
Despite the name, `manipulation` suppresses only double-tap zoom; **pinch zoom
is fully enabled under it**. The `touch-action: none` rules that already existed
are all on menu 3D inspectors — loadout preview, inspector stage, crate canvas,
armour inspector — where they are needed for drag-to-rotate. The play surface
had nothing. On a phone you could pinch-zoom the match.

**3. There was an unresolved intent conflict in the repo.** Build 12.161's
SW-011 restored browser pinch zoom, but the check asserting the opposite was
left in place, so the gate had been red ever since without describing a real
fault. A build reversed a requirement and left the audit asserting the old one.

## The fix

`css/match-gestures.css`, last in `CSS_PATHS` and `index.html`.

```css
#game { touch-action: pan-y; }

body[data-app-state='match'][data-view-mode='maximized'] #game,
body[data-app-state='free-roam'] #game { touch-action: none; }
```

Two states, for a reason. **The windowed match page scrolls** — Build 12.128 put
commentary in normal document flow beneath the arena, and
`body[data-app-state='match']` deliberately does not set `overflow: hidden`
(only `free-roam` does). A blanket `touch-action: none` would therefore have
broken drag-to-scroll from the arena area in portrait. `pan-y` keeps the
vertical page scroll and still removes pinch, because any `touch-action` value
that is neither `auto` nor `manipulation`, and does not name `pinch-zoom`,
disables the zoom gesture.

Maximised match and free roam have nothing to scroll, so they take every touch;
free roam additionally drives look control from drag and needs the browser to
stop claiming the gesture.

**Scope is the play surface only.** `body` stays on `manipulation`, so menus,
league tables and dense report copy remain zoomable. Blocking zoom app-wide is a
WCAG 2.1 SC 1.4.4 failure and there was no product reason for it — the problem
was only ever the arena moving under a stray two-finger touch mid-match. The
viewport meta is unchanged at
`width=device-width,initial-scale=1,viewport-fit=cover`.

## The corrected check

`pinchZoomDisabled` is replaced by `matchSurfacePinchBlocked`, backed by
`matchSurfacePinchState()` in `js/70-runtime.js`. It reads the computed
`touch-action` on `#game` — the property browsers actually honour — rather than
a declaration Safari discards. `matchGestureForTest()` exposes the same state.

Measured across every state:

| State | Computed `touch-action` | Pinch blocked | Page can scroll |
| --- | --- | --- | --- |
| Menu (no match) | `pan-y` | yes | yes |
| Match, windowed | `pan-y` | yes | yes |
| Match, maximised | `none` | yes | n/a |
| Free roam | `none` | yes | n/a (overflow hidden) |

`body` computed `touch-action` remains `manipulation` in all four, so menu zoom
is untouched.

## Result

`typographyConsistencyForTest()` returns **`ok: true`** — green for the first
time in many builds, and green because the underlying fault is fixed rather than
because the assertion was weakened. Build 12.140 recorded this gate as "failing
for several builds"; it was never actually resolved, only noted.

## Gates

Green: `typographyConsistencyForTest`, `matchGestureForTest`,
`imageGradeForTest`, `ceilingLightForTest`, `staticOcclusionForTest`,
`dynamicActorCullingForTest`, `allArenaGeometryIntegrityForTest`,
`operatorEnvironmentalLightPickupForTest`, `operatorSilhouetteSeparationForTest`,
`operatorMuzzleLightResponseForTest`, `operatorContactShadowForTest`,
`operatorTracerOriginForTest`, `spectatorDirectorForTest`,
`spectatorHandoffPresentationForTest`, `bloodSurfaceAttachmentForTest`,
`impactDecalForTest`, `simulationQualityIndependenceForTest`,
`matchClockIntegrityForTest`, `loadoutStillForTest`, `ar4WeaponModelForTest`,
`weaponGeometryIntegrityForTest`.

`mobileInterfaceAuditForTest()` totals are unchanged from 12.223 and 12.224 at a
matched 833px viewport: overlapping 0, collapsed 0, overflow 0, tinyText 143,
smallTargets 0.

All 45 modular files and both standalone inline scripts parse. Two builds
produced identical dev-bundle and standalone hashes. Root `cod.html` is
byte-identical to `dist/strikewatch-build-12.225.html`. Save schema 19 and
diagnostics schema 1 are unchanged.

## Do not

- Do not "fix" this by adding `user-scalable=no` or `maximum-scale=1` to the
  viewport meta. iOS Safari ignores both; it would make the gate green without
  changing behaviour on the platform that matters most.
- Do not move the block to `body` or `html`. Menus must stay zoomable — that is
  an accessibility requirement, not a preference.
- Do not set `touch-action: none` on `#game` unconditionally. The windowed match
  page scrolls, and that would strand the commentary below the arena in
  portrait.
- Do not assume `manipulation` restricts pinch. It does not; it only suppresses
  double-tap zoom. That misreading is what left the arena zoomable for every
  build up to this one.
