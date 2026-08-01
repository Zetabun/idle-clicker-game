# Build 12.238 — Natural Operator Silhouette

## User-visible outcome

Third-person operators now read as clothed tactical people rather than rounded
parts assembled around visible ball joints. The permanent shoulder volume is an
inset fabric deltoid/sleeve blended into the torso. Actual shoulder armour still
appears only on armour classes that own it. Arm and leg segments retain volume
through elbows, knees, wrists and ankles; the face covering also occupies more
of the lower head, closer to the supplied masked-operator reference.

## Implementation

- `js/60-renderer-core.js`
  - Reprofiled the shared shoulder mesh into a shallow cloth sleeve.
  - Rebuilt the shared anatomical limb mesh with 0.76 proximal and 0.60 distal
    endpoint radii and closed caps.
- `js/62-character-renderer.js`
  - Insets the sleeve 0.070m into the torso and renders it with cloth material.
  - Keeps armour-class shoulder plates on their existing conditional path.
  - Flattens elbow protection and expands the curved lower-face cover.
  - Adds `OPERATOR_BODY_PRESENTATION` and an audited torso-overlap calculation.
- `js/70-runtime.js`
  - Exposes `operatorBodySilhouetteForTest()`.

Living and fallen operators share these changes. No body draw was added or
removed; existing draw calls now consume the revised meshes/material. Gameplay
collision, hit detection, navigation, AI and animation anchors are unchanged.

## Verification

- `py -3 build.py`: pass. JavaScript raw reduction 3.28%; CSS debt remains
  within budget at 2269/2270 flagged declarations and 484/484 media queries.
- Deterministic rebuild: pass. Development bundle SHA-256
  `E669D18E69B9EC69F9BF89799343F34C0DD5169B16F3229CD1544906DFDAEFD9`;
  standalone SHA-256
  `ACF8E8B75A305C87F61F4F7704A82CE10568E727BC7DE01DA8ABB065A735FE37`.
- JavaScript parse: 45 modular/generated files pass; both standalone inline
  scripts pass.
- `operatorBodySilhouetteForTest()`: pass. All five checks true; measured
  sleeve/ribcage overlap 0.0909m.
- `operatorModel()`: body audit pass; living and corpse leg-segment lengths
  stable.
- Operator regressions: environmental pickup, silhouette separation, muzzle
  response, contact shadow, tracer origin, culling, weapon attachment and held
  pose all pass. AO reports every contact material darker, no added render cost
  and shared living/corpse palette.
- `corpsePresentationForTest()`: pass across its distance/pose matrix.
- Staged 12.237/12.238 match captures: the always-on shoulder balls are replaced
  by short, wide sleeves blended into the upper torso; arm and leg ends remain
  connected without the rejected doubled-limb bulk from the first tuning pass.
- Browser console: no operator-change error. The existing `menuSection` startup
  fault reproduced on both 12.237 and 12.238 and is outside this scoped render
  change.
- Root `cod.html`: byte-identical to the standalone at the SHA-256 above.

Save schema remains 19. Diagnostics schema remains 1.
