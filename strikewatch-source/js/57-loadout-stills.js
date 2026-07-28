/*
 * Strikewatch source module: 57-loadout-stills.js
 * Purpose: Rasterise weapon and armour models to still images for the loadout
 * surfaces, so only the item being inspected costs a live CSS-3D rig.
 *
 * This file is a source fragment. Run `python3 build.py` to regenerate
 * js/strikewatch.dev.js and the standalone distribution.
 *
 * The Armoury drew every model as CSS-3D: the weapon inspector, the armour
 * inspector and every inventory thumbnail at once, a bit over a thousand face
 * elements between them, each one a 3D quad the browser has to transform and
 * sort on any repaint. Nothing on that page rotates unless the manager asks it
 * to, so almost all of that work produced a picture that never changed.
 *
 * A still is the same geometry drawn once into a canvas and handed over as an
 * image. It reads identically at a fixed angle and costs one element.
 *
 * Two rules hold this together:
 *
 *  - Geometry still has exactly one authority. This consumes
 *    `careerWeaponVisualParts()` and `careerArmour3dParts()` like every other
 *    renderer; it never forks a part list.
 *  - Materials are not duplicated either. Rather than copying the palette out
 *    of `css/game.css` into a table that would drift the first time a colour
 *    changed, the gradient stops and the per-face `filter` values are read back
 *    from the live stylesheet through a hidden probe element and cached. If a
 *    material changes in CSS, the stills change with it.
 */

  const LOADOUT_STILL_CACHE = new Map();
  const LOADOUT_STILL_MATERIAL_CACHE = new Map();
  let loadoutStillProbe = null;

  // A still is only worth caching while the palette it was drawn from is the
  // palette on screen. Nothing invalidates mid-session today, but a skin change
  // produces a different cache key rather than a stale hit.
  function resetLoadoutStillCaches() {
    LOADOUT_STILL_CACHE.clear();
    LOADOUT_STILL_MATERIAL_CACHE.clear();
  }

  function loadoutStillProbeElement() {
    if (loadoutStillProbe && loadoutStillProbe.isConnected) return loadoutStillProbe;
    const host = document.createElement('div');
    // Off-screen rather than display:none — a hidden subtree has no computed
    // background to read.
    host.style.cssText = 'position:fixed;left:-9999px;top:0;width:0;height:0;overflow:hidden;pointer-events:none';
    host.setAttribute('aria-hidden', 'true');
    host.innerHTML = '<div class="career-armour-model-system" data-still-armour-root>'
      + '<div class="career-weapon-rig" data-still-rig>'
      + '<span class="career-weapon-cuboid" data-still-cuboid><i class="face" data-still-face></i></span>'
      + '<span class="career-weapon-cylinder" data-still-cylinder><i class="cylinder-face side" data-still-cylinder-face></i></span>'
      + '</div></div>';
    document.body.appendChild(host);
    loadoutStillProbe = host;
    return host;
  }

  function parseStillFilter(value) {
    const text = String(value || '');
    const brightness = /brightness\(([\d.]+)\)/.exec(text);
    const saturate = /saturate\(([\d.]+)\)/.exec(text);
    return {
      brightness: brightness ? Number(brightness[1]) : 1,
      saturate: saturate ? Number(saturate[1]) : 1
    };
  }

  // Pull every `rgb()`/`rgba()` stop out of whatever background the material
  // resolved to. Works for the plain gradients, and for the repeating gradients
  // the rubber and picatinny materials use — those simply yield more stops,
  // which average into the right tone at still resolution.
  function parseStillStops(background) {
    const stops = [];
    const pattern = /rgba?\(([^)]+)\)/g;
    let match = pattern.exec(background);
    while (match) {
      const parts = match[1].split(',').map(part => Number(part.trim()));
      if (parts.length >= 3 && parts.every(Number.isFinite)) {
        const alpha = parts.length > 3 ? parts[3] : 1;
        if (alpha > 0.05) stops.push([parts[0], parts[1], parts[2]]);
      }
      match = pattern.exec(background);
    }
    return stops;
  }

  function applyStillFilter(rgb, filter) {
    const [r, g, b] = rgb;
    // Rec. 601 luma, matching the CSS saturate() filter matrix.
    const luma = 0.213 * r + 0.715 * g + 0.072 * b;
    const s = filter.saturate;
    const k = filter.brightness;
    return [
      clamp((luma + (r - luma) * s) * k, 0, 255),
      clamp((luma + (g - luma) * s) * k, 0, 255),
      clamp((luma + (b - luma) * s) * k, 0, 255)
    ];
  }

  const LOADOUT_STILL_FACES = ['front', 'back', 'left', 'right', 'top', 'bottom'];

  function loadoutStillMaterial(material, face, armour, cylinder = false) {
    const key = `${armour ? 'a' : 'w'}|${cylinder ? 'c' : 'b'}|${material}|${face}`;
    const cached = LOADOUT_STILL_MATERIAL_CACHE.get(key);
    if (cached) return cached;
    const host = loadoutStillProbeElement();
    const root = host.querySelector('[data-still-armour-root]');
    const shell = host.querySelector(cylinder ? '[data-still-cylinder]' : '[data-still-cuboid]');
    const faceEl = host.querySelector(cylinder ? '[data-still-cylinder-face]' : '[data-still-face]');
    // The armour filters live under `.career-armour-model-system`, the weapon
    // ones under `.career-weapon-rig`, so the probe's ancestor chain decides
    // which rules win — exactly as it does on a real rig.
    root.className = armour ? 'career-armour-model-system' : 'career-armour-still-neutral';
    shell.className = `${cylinder ? 'career-weapon-cylinder' : 'career-weapon-cuboid'} ${material}`;
    faceEl.className = cylinder ? `cylinder-face ${face}` : `face ${face}`;
    const computed = getComputedStyle(faceEl);
    const stops = parseStillStops(computed.backgroundImage && computed.backgroundImage !== 'none'
      ? computed.backgroundImage
      : computed.backgroundColor);
    const filter = parseStillFilter(computed.filter);
    const resolved = {
      stops: (stops.length ? stops : [[110, 118, 124]]).map(stop => applyStillFilter(stop, filter)),
      border: computed.borderTopColor || 'rgba(255,255,255,.05)'
    };
    LOADOUT_STILL_MATERIAL_CACHE.set(key, resolved);
    return resolved;
  }

  const STILL_DEG = Math.PI / 180;

  function loadoutStillRotate(point, rx, ry, rz) {
    let { x, y, z } = point;
    let c = Math.cos(rz * STILL_DEG);
    let s = Math.sin(rz * STILL_DEG);
    [x, y] = [x * c - y * s, x * s + y * c];
    c = Math.cos(ry * STILL_DEG);
    s = Math.sin(ry * STILL_DEG);
    [x, z] = [x * c + z * s, -x * s + z * c];
    c = Math.cos(rx * STILL_DEG);
    s = Math.sin(rx * STILL_DEG);
    [y, z] = [y * c - z * s, y * s + z * c];
    return { x, y, z };
  }

  // Which corners make up each face, and the face's outward normal in the
  // part's own space. Index order matches the cube corner table below.
  const LOADOUT_STILL_FACE_GEOMETRY = {
    front: [0, 1, 2, 3, [0, 0, -1]],
    back: [5, 4, 7, 6, [0, 0, 1]],
    left: [4, 0, 3, 7, [-1, 0, 0]],
    right: [1, 5, 6, 2, [1, 0, 0]],
    top: [4, 5, 1, 0, [0, -1, 0]],
    bottom: [3, 2, 6, 7, [0, 1, 0]]
  };

  const LOADOUT_STILL_CORNERS = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
  ];

  function loadoutStillQuads(parts, yaw, pitch, armour) {
    const quads = [];
    for (const part of parts) {
      const w = Math.max(1, Number(part.w) || 1);
      const h = Math.max(1, Number(part.h) || 1);
      const d = Math.max(1, Number(part.d) || 1);
      const rx = Number(part.rx) || 0;
      const ry = Number(part.ry) || 0;
      const rz = Number(part.rz) || 0;
      const material = part.material || 'metal';
      const cylinder = String(part.shape || '') === 'cylinder-length';
      // Cylinders are drawn as the same ten-strip prism the CSS builds, so a
      // barrel keeps its round silhouette instead of turning into a box.
      const faces = cylinder
        ? ['side-0', 'side-1', 'side-2', 'side-3', 'side-4', 'side-5', 'side-6', 'side-7', 'side-8', 'side-9', 'cap-start', 'cap-end']
        : careerWeaponCuboidFaces(part);
      for (const face of faces) {
        let corners;
        let normal;
        if (cylinder) {
          const radius = Math.min(h, d) / 2;
          if (face.startsWith('cap')) {
            const end = face === 'cap-end' ? 1 : -1;
            corners = [];
            for (let step = 0; step < 10; step++) {
              const angle = (step / 10) * Math.PI * 2;
              corners.push({ x: end * w / 2, y: Math.cos(angle) * radius, z: Math.sin(angle) * radius });
            }
            if (end < 0) corners.reverse();
            normal = { x: end, y: 0, z: 0 };
          } else {
            const index = Number(face.split('-')[1]);
            const a0 = (index / 10) * Math.PI * 2;
            const a1 = ((index + 1) / 10) * Math.PI * 2;
            corners = [
              { x: -w / 2, y: Math.cos(a0) * radius, z: Math.sin(a0) * radius },
              { x: w / 2, y: Math.cos(a0) * radius, z: Math.sin(a0) * radius },
              { x: w / 2, y: Math.cos(a1) * radius, z: Math.sin(a1) * radius },
              { x: -w / 2, y: Math.cos(a1) * radius, z: Math.sin(a1) * radius }
            ];
            const mid = (a0 + a1) / 2;
            normal = { x: 0, y: Math.cos(mid), z: Math.sin(mid) };
          }
        } else {
          const geometry = LOADOUT_STILL_FACE_GEOMETRY[face];
          if (!geometry) continue;
          corners = [geometry[0], geometry[1], geometry[2], geometry[3]].map(index => {
            const [sx, sy, sz] = LOADOUT_STILL_CORNERS[index];
            return { x: sx * w / 2, y: sy * h / 2, z: sz * d / 2 };
          });
          normal = { x: geometry[4][0], y: geometry[4][1], z: geometry[4][2] };
        }
        const projected = corners.map(corner => {
          const local = loadoutStillRotate(corner, rx, ry, rz);
          return loadoutStillRotate({
            x: local.x + (Number(part.x) || 0),
            y: local.y + (Number(part.y) || 0),
            z: local.z + (Number(part.z) || 0)
          }, pitch, yaw, 0);
        });
        const worldNormal = loadoutStillRotate(loadoutStillRotate(normal, rx, ry, rz), pitch, yaw, 0);
        // The camera looks along +z, so a face pointing away from it is hidden.
        if (worldNormal.z > 0.02) continue;
        const cylinderFace = cylinder
          ? (face.startsWith('cap') ? (face === 'cap-end' ? 'cap end' : 'cap start') : `side`)
          : face;
        quads.push({
          points: projected,
          material,
          face: cylinderFace,
          cylinder,
          armour,
          depth: projected.reduce((total, point) => total + point.z, 0) / projected.length
        });
      }
    }
    quads.sort((a, b) => a.depth - b.depth);
    return quads;
  }

  function loadoutStillPaint(context, quads, scale, originX, originY) {
    for (const quad of quads) {
      const material = loadoutStillMaterial(quad.material, quad.face, quad.armour, quad.cylinder);
      const screen = quad.points.map(point => ({ x: originX + point.x * scale, y: originY + point.y * scale }));
      context.beginPath();
      screen.forEach((point, index) => (index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y)));
      context.closePath();
      const stops = material.stops;
      if (stops.length === 1) {
        context.fillStyle = `rgb(${stops[0].map(Math.round).join(',')})`;
      } else {
        let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
        for (const point of screen) {
          minX = Math.min(minX, point.x); maxX = Math.max(maxX, point.x);
          minY = Math.min(minY, point.y); maxY = Math.max(maxY, point.y);
        }
        // The CSS gradients run at 145deg inside each face; across a projected
        // quad the bounding diagonal is the closest honest equivalent.
        const gradient = context.createLinearGradient(minX, minY, maxX, maxY);
        stops.forEach((stop, index) => {
          gradient.addColorStop(stops.length === 1 ? 0 : index / (stops.length - 1), `rgb(${stop.map(Math.round).join(',')})`);
        });
        context.fillStyle = gradient;
      }
      context.fill();
      context.strokeStyle = material.border;
      context.lineWidth = 0.6;
      context.stroke();
    }
  }

  // Both viewers open on these angles, so a still matches what the interactive
  // rig shows on its first frame: a weapon side-on with a little turn, armour
  // square to the camera.
  const LOADOUT_STILL_WEAPON_VIEW = Object.freeze({ yaw: -28, pitch: -10 });
  const LOADOUT_STILL_ARMOUR_VIEW = Object.freeze({ yaw: 0, pitch: -6 });

  function loadoutStillRender(parts, options) {
    const quads = loadoutStillQuads(parts, options.yaw, options.pitch, Boolean(options.armour));
    if (!quads.length) return null;
    let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
    for (const quad of quads) {
      for (const point of quad.points) {
        minX = Math.min(minX, point.x); maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y); maxY = Math.max(maxY, point.y);
      }
    }
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const width = Math.max(32, Math.round(Number(options.width) || 320));
    const requested = Math.max(32, Math.round(Number(options.height) || 180));
    // The canvas takes the model's own proportions rather than a fixed frame.
    // A pistol and a rifle have very different aspect ratios, and forcing both
    // into one box leaves whichever is squarer floating in empty space — the
    // frame is sized to the subject instead, and the panel centres it.
    const height = options.fixedHeight
      ? requested
      : clamp(Math.round((width * spanY) / spanX), Math.round(requested * 0.45), requested);
    const density = Math.min(2, Math.max(1, Number(window.devicePixelRatio) || 1));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * density);
    canvas.height = Math.round(height * density);
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.scale(density, density);
    const margin = Number.isFinite(Number(options.margin)) ? Number(options.margin) : 0.94;
    const scale = Math.min((width * margin) / spanX, (height * margin) / spanY);
    loadoutStillPaint(context, quads, scale, width / 2 - (minX + maxX) * 0.5 * scale, height / 2 - (minY + maxY) * 0.5 * scale);
    return canvas.toDataURL('image/png');
  }

  function loadoutStillDataUrl(key, build) {
    const cached = LOADOUT_STILL_CACHE.get(key);
    if (cached !== undefined) return cached;
    let result = null;
    try {
      result = build();
    } catch (error) {
      result = null;
    }
    LOADOUT_STILL_CACHE.set(key, result);
    return result;
  }

  function careerWeaponStillDataUrl(weapon, options = {}) {
    if (typeof careerWeaponVisualParts !== 'function') return null;
    const modelClass = weapon?.modelClass || 'service-p12';
    const width = Number(options.width) || 320;
    const height = Number(options.height) || 150;
    const thumbnail = Boolean(options.thumbnail);
    const key = `w|${modelClass}|${options.skinId || ''}|${width}x${height}|${thumbnail ? 't' : 'd'}`;
    return loadoutStillDataUrl(key, () => loadoutStillRender(
      thumbnail && typeof careerWeaponThumbnailParts === 'function'
        ? careerWeaponThumbnailParts(weapon)
        : careerWeaponVisualParts(weapon),
      { width, height, fixedHeight: thumbnail, yaw: LOADOUT_STILL_WEAPON_VIEW.yaw, pitch: LOADOUT_STILL_WEAPON_VIEW.pitch, armour: false }
    ));
  }

  function careerArmourStillDataUrl(armour, options = {}) {
    if (typeof careerArmour3dParts !== 'function') return null;
    const id = armour?.id || 'none';
    const width = Number(options.width) || 240;
    const height = Number(options.height) || 260;
    const thumbnail = Boolean(options.thumbnail);
    const key = `a|${id}|${width}x${height}|${thumbnail ? 't' : 'd'}`;
    return loadoutStillDataUrl(key, () => loadoutStillRender(
      thumbnail && typeof careerArmourThumbnailParts === 'function'
        ? careerArmourThumbnailParts(armour)
        : careerArmour3dParts(armour),
      { width, height, fixedHeight: thumbnail, yaw: LOADOUT_STILL_ARMOUR_VIEW.yaw, pitch: LOADOUT_STILL_ARMOUR_VIEW.pitch, armour: true }
    ));
  }

  function careerWeaponStillMarkup(weapon, options = {}) {
    const url = careerWeaponStillDataUrl(weapon, options);
    const label = `${escapeCareerHtml(weapon?.name || 'Weapon')} still image`;
    const extra = options.className ? ` ${options.className}` : '';
    if (!url) return `<span class="career-loadout-still fallback${extra}" role="img" aria-label="${label}"></span>`;
    return `<img class="career-loadout-still${extra}" src="${url}" alt="${label}" draggable="false">`;
  }

  function careerArmourStillMarkup(armour, options = {}) {
    const url = careerArmourStillDataUrl(armour, options);
    const label = `${escapeCareerHtml(armour?.name || 'Armour')} still image`;
    const extra = options.className ? ` ${options.className}` : '';
    if (!url) return `<span class="career-loadout-still fallback${extra}" role="img" aria-label="${label}"></span>`;
    return `<img class="career-loadout-still${extra}" src="${url}" alt="${label}" draggable="false">`;
  }

  function loadoutStillAuditForTest() {
    const weapons = typeof CAREER_WEAPON_CATALOG === 'object' ? Object.values(CAREER_WEAPON_CATALOG || {}) : [];
    const armours = typeof CAREER_ARMOUR_CATALOG === 'object' ? Object.values(CAREER_ARMOUR_CATALOG || {}) : [];
    const weaponResults = weapons.map(weapon => {
      const url = careerWeaponStillDataUrl(weapon, { width: 320, height: 150 });
      return { id: weapon.id, modelClass: weapon.modelClass, rendered: Boolean(url), bytes: url ? url.length : 0 };
    });
    const armourResults = armours.map(armour => {
      const url = careerArmourStillDataUrl(armour, { width: 240, height: 260 });
      return { id: armour.id, rendered: Boolean(url), bytes: url ? url.length : 0 };
    });
    // A still that renders as an empty or near-empty PNG means the palette
    // probe failed, which is the one failure mode that would look like a blank
    // panel rather than an error.
    const minimumBytes = 900;
    const ok = weaponResults.length > 0
      && armourResults.length > 0
      && weaponResults.every(entry => entry.rendered && entry.bytes > minimumBytes)
      && armourResults.every(entry => entry.rendered && entry.bytes > minimumBytes);
    return {
      ok,
      weapons: weaponResults,
      armour: armourResults,
      cachedStills: LOADOUT_STILL_CACHE.size,
      cachedMaterials: LOADOUT_STILL_MATERIAL_CACHE.size
    };
  }
