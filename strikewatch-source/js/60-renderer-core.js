/*
 * Strikewatch source module: 60-renderer-core.js
 * Purpose: WebGL setup, shaders, matrix helpers, meshes and renderer-wide state.
 *
 * This file is a source fragment. Run `python3 build.py` to regenerate
 * js/strikewatch.dev.js and the standalone release in dist/.
 */

  // ---------------------------------------------------------------------------
  // True 3D WebGL renderer. The simulation above remains authoritative; this
  // layer only visualises its map, actors, combat and spectator camera.
  // ---------------------------------------------------------------------------
  const GL_WALL_HEIGHT = 2.82;
  const GL_EYE_HEIGHT = 1.49;
  const GL_FAR = 46;
  const OPERATOR_SKIN_MATERIAL = Object.freeze({
    revision: '12.57-light-natural-skin-material-1',
    surface: 8,
    roughness: 0.64,
    ambientLift: 0.42
  });
  let gl = null;
  let glProgram = null;
  let glReady = false;
  let glProjection = new Float32Array(16);
  let glView = new Float32Array(16);
  const glModel = new Float32Array(16);
  const glMeshes = {};
  const glLocations = {};
  const worldBatches = {
    walls: [], covers: [], trims: [], hazards: [], floorLines: [], lights: [],
    beams: [], wallPanels: [], vents: [], pipes: [], grates: [], signs: [],
    columns: [], bulkheads: [], ceilingPanels: [], cableTrays: [],
    conduits: [], warningLights: [], floorDecals: [], wallNumbers: [],
    floorPatches: [], floorTiles: [], laneStrips: [], wallKickPlates: [],
    zoneFloors: [], lowCeilings: [], walkways: [], railings: [], hazardZones: [],
    containers: [], machines: [], tanks: [], zoneBeacons: [], doors: [], stairs: [],
    officeCourtyards: [], officeRugs: [], officeWallScreens: [], officeGlassBands: [], officeCeilingBaffles: [], officeFloorMarkings: [],
    desertCanopies: [], desertArches: [], desertBanners: [], desertMosaics: [], desertRubble: [], desertTorches: [], desertCrenels: [], desertBackdrop: []
  };
  const STATIC_WORLD_CULLING_ENABLED = (() => {
    try {
      return new URLSearchParams(window.location.search).get('staticCulling') !== '0';
    } catch (_) {
      return true;
    }
  })();
  const STATIC_WORLD_BATCHING_ENABLED = (() => {
    try {
      return new URLSearchParams(window.location.search).get('staticBatching') !== '0';
    } catch (_) {
      return true;
    }
  })();
  let staticWorldRenderActive = false;
  let staticWorldBatchEligible = true;
  let staticWorldBatchMode = 'none';
  let staticWorldGpuBatchesReady = false;
  const staticWorldGpuBatches = [];
  const staticWorldGpuBatchGroups = new Map();
  let rendererStatsPublishCountdown = 0;
  const rendererFrameStats = {
    drawCalls: 0,
    staticCandidates: 0,
    staticDrawCalls: 0,
    staticCulled: 0,
    staticSourceDraws: 0,
    staticBatchDrawCalls: 0
  };
  const rendererLastFrameStats = {
    drawCalls: 0,
    staticCandidates: 0,
    staticDrawCalls: 0,
    staticCulled: 0,
    staticSourceDraws: 0,
    staticBatchDrawCalls: 0,
    cullingEnabled: STATIC_WORLD_CULLING_ENABLED,
    batchingEnabled: STATIC_WORLD_BATCHING_ENABLED
  };
  const tracers = [];
  let lastFrameDt = 1 / 60;
  const viewWeaponState = {
    initialised: false,
    lastAngle: 0,
    turnSway: 0,
    recoilSettle: 0,
    recoilVelocity: 0,
    recoilImpulse: 0,
    recoilRoll: 0,
    smokeImpulse: 0,
    lastMuzzle: 0,
    locomotionBob: 0,
    locomotionSide: 0
  };

  const damageOverlayEl = document.getElementById('damageOverlay');
  const deathOverlayEl = document.getElementById('deathOverlay');
  const crosshairEl = document.getElementById('crosshair');

  function hexColour(hex) {
    const value = Number.parseInt(String(hex).replace('#', ''), 16);
    return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
  }

  function mat4Perspective(out, fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    out.fill(0);
    out[0] = f / aspect;
    out[5] = f;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[14] = 2 * far * near * nf;
    return out;
  }

  function mat4LookAt(out, eye, centre, up) {
    let zx = eye[0] - centre[0];
    let zy = eye[1] - centre[1];
    let zz = eye[2] - centre[2];
    let len = Math.hypot(zx, zy, zz) || 1;
    zx /= len; zy /= len; zz /= len;

    let xx = up[1] * zz - up[2] * zy;
    let xy = up[2] * zx - up[0] * zz;
    let xz = up[0] * zy - up[1] * zx;
    len = Math.hypot(xx, xy, xz) || 1;
    xx /= len; xy /= len; xz /= len;

    const yx = zy * xz - zz * xy;
    const yy = zz * xx - zx * xz;
    const yz = zx * xy - zy * xx;

    out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0;
    out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0;
    out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0;
    out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
    out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
    out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
    out[15] = 1;
    return out;
  }

  // M = T * Ry * Rx * Rz * S, stored column-major for WebGL.
  function mat4TRS(out, tx, ty, tz, ry = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    const cy = Math.cos(ry), syy = Math.sin(ry);
    const cx = Math.cos(rx), sxx = Math.sin(rx);
    const cz = Math.cos(rz), szz = Math.sin(rz);

    const r00 = cy * cz + sxx * syy * szz;
    const r01 = -cy * szz + cz * sxx * syy;
    const r02 = cx * syy;
    const r10 = cx * szz;
    const r11 = cx * cz;
    const r12 = -sxx;
    const r20 = cy * sxx * szz - cz * syy;
    const r21 = cy * cz * sxx + syy * szz;
    const r22 = cx * cy;

    out[0] = r00 * sx; out[1] = r10 * sx; out[2] = r20 * sx; out[3] = 0;
    out[4] = r01 * sy; out[5] = r11 * sy; out[6] = r21 * sy; out[7] = 0;
    out[8] = r02 * sz; out[9] = r12 * sz; out[10] = r22 * sz; out[11] = 0;
    out[12] = tx; out[13] = ty; out[14] = tz; out[15] = 1;
    return out;
  }

  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader) || 'Unknown shader compilation error';
      gl.deleteShader(shader);
      throw new Error(log);
    }
    return shader;
  }

  function createProgram() {
    const vertexSource = `
      attribute vec3 aPosition;
      attribute vec3 aNormal;
      uniform mat4 uProjection;
      uniform mat4 uView;
      uniform mat4 uModel;
      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      void main() {
        vec4 world = uModel * vec4(aPosition, 1.0);
        vWorldPosition = world.xyz;
        vNormal = normalize(mat3(uModel) * aNormal);
        gl_Position = uProjection * uView * world;
      }
    `;
    const fragmentSource = `
      precision mediump float;
      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      uniform vec3 uColour;
      uniform vec3 uCameraPosition;
      uniform vec3 uFogColour;
      uniform float uEmissive;
      uniform float uAlpha;
      uniform float uSurface;
      uniform float uRoughness;
      uniform float uTime;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      // Smoothly interpolated value noise. Surfaces need gentle variation, not
      // the hard per-cell steps a raw hash gives.
      float valueNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float smoothGrid(vec2 p, float width) {
        vec2 g = abs(fract(p) - 0.5);
        return smoothstep(0.5 - width, 0.5, max(g.x, g.y));
      }

      void main() {
        vec3 normal = normalize(vNormal);
        vec3 base = uColour;
        // Build 12.145: the shared surface noise used to be
        // hash21(floor(xz * 5.0) + floor(xy * 2.0)) — two mismatched grids
        // summed and hashed, which produced hard blocky patches and made the
        // result depend on which axis a surface happened to face. Every
        // surface mode reads this term, so that single line was the quilted
        // mottling on office walls, industrial floors and metal alike.
        // Smoothly interpolated value noise on one coherent grid replaces it.
        vec2 noiseCoord = vWorldPosition.xz * 1.7 + vec2(vWorldPosition.y * 0.55);
        float noise = valueNoise(noiseCoord);
        float materialRoughness = clamp(uRoughness, 0.04, 1.0);
        float materialAmbientLift = 0.0;

        // Surface 1: sealed industrial floor with panel joins, aggregate,
        // oil staining and occasional damp patches that catch overhead light.
        if (uSurface > 0.5 && uSurface < 1.5) {
          float panel = smoothGrid(vWorldPosition.xz * 0.5, 0.035);
          float micro = smoothGrid(vWorldPosition.xz * 4.0, 0.018) * 0.12;
          float stainNoise = hash21(floor(vWorldPosition.xz * 0.72));
          float stain = smoothstep(0.72, 0.94, stainNoise) *
                        smoothstep(0.18, 0.82, sin(vWorldPosition.x * 0.42 + vWorldPosition.z * 0.31) * 0.5 + 0.5);
          float wet = smoothstep(0.79, 0.98, hash21(floor((vWorldPosition.xz + vec2(2.0, 7.0)) * 0.46)));
          base *= 0.86 + noise * 0.15;
          base = mix(base, base * 0.28, panel * 0.76);
          base = mix(base, base * 0.62, micro);
          base = mix(base, vec3(0.065, 0.085, 0.095), stain * 0.28);
          materialRoughness = mix(materialRoughness, 0.24, wet * 0.62);
        // Surface 2: modular wall panels with seams, vertical water streaks and
        // grime concentrated around the base and ceiling service zone.
        } else if (uSurface > 1.5 && uSurface < 2.5) {
          // Build 12.145: modular partition panels. The tone now varies per
          // panel module rather than per fragment, and the streaking that ran
          // at twelve cycles per world unit is gone — at office scale it read
          // as corduroy rather than as wear.
          float panelU = (vWorldPosition.x + vWorldPosition.z) * 0.5;
          float panelV = vWorldPosition.y * 1.65;
          float verticalSeam = smoothstep(0.955, 1.0, fract(panelU));
          float horizontalSeam = smoothstep(0.92, 1.0, fract(panelV));
          float lowerGrime = 1.0 - smoothstep(0.04, 0.82, vWorldPosition.y);
          float upperGrime = smoothstep(1.72, 2.30, vWorldPosition.y);
          float moduleTone = 0.972 + hash21(vec2(floor(panelU), floor(panelV))) * 0.050;
          base *= moduleTone * (0.975 + noise * 0.045);
          base = mix(base, base * 0.46, max(verticalSeam, horizontalSeam) * 0.52);
          base *= 1.0 - lowerGrime * (0.06 + noise * 0.05);
          base *= 1.0 - upperGrime * 0.05;
        // Surface 3: painted or exposed metal.
        } else if (uSurface > 2.5 && uSurface < 3.5) {
          // Build 12.145: 92 cycles per world unit aliased into visible bands
          // on anything larger than a handrail. A slower grain plus a broad
          // sheen reads as brushed metal at room scale.
          float brushed = 0.965 + 0.035 * sin(vWorldPosition.y * 26.0 + vWorldPosition.x * 3.0 + vWorldPosition.z * 2.0);
          float sheen = 0.98 + 0.02 * sin(vWorldPosition.y * 2.4);
          float edgeWear = smoothstep(0.80, 1.0, noise);
          base *= brushed * sheen;
          base = mix(base, min(base * 1.28, vec3(0.78)), edgeWear * 0.12);
        // Surface 4: lamps, displays and luminous paint.
        } else if (uSurface > 3.5 && uSurface < 4.5) {
          // Build 12.145: the scanline ran at 130 cycles per world unit with a
          // 6% swing, which turned every wall display into hard corduroy. A
          // slow roll at a third of the amplitude still reads as an emissive
          // panel without dominating the room.
          float scan = 0.982 + 0.018 * sin(vWorldPosition.y * 34.0 + uTime * 2.4);
          base *= scan;
          materialRoughness = 0.14;
        // Surface 5: tactical fabric and painted armour.
        } else if (uSurface > 4.5 && uSurface < 5.5) {
          float weave = 0.93 + 0.07 * sin(vWorldPosition.x * 95.0) * sin(vWorldPosition.y * 88.0);
          base *= weave * (0.96 + noise * 0.06);
          materialRoughness = max(materialRoughness, 0.72);
        // Surface 6: rubber, boots and soft polymer.
        } else if (uSurface > 5.5 && uSurface < 6.5) {
          base *= 0.86 + noise * 0.08;
          materialRoughness = max(materialRoughness, 0.88);
        // Surface 7: rough sandstone, packed earth and sun-weathered plaster.
        } else if (uSurface > 6.5 && uSurface < 7.5) {
          // Build 12.144: sandstone masonry. The previous version multiplied
          // two mismatched floor() noise grids (xz * 8 and xy * 3), which gave
          // a random patchwork that read as dirt rather than stone. Courses
          // now run horizontally in a running bond with soft mortar joints and
          // a much gentler per-block tone.
          float courseHeight = 0.44;
          float blockLength = 0.88;
          float course = floor(vWorldPosition.y / courseHeight);
          float bond = mod(course, 2.0) * 0.5;
          float along = (vWorldPosition.x + vWorldPosition.z) / blockLength + bond;
          float block = floor(along);

          float blockTone = 0.972 + hash21(vec2(block, course)) * 0.056;
          float courseTone = 0.980 + hash21(vec2(course * 1.7, 4.3)) * 0.040;

          // Mortar: darken where a course line or a block edge falls.
          float courseEdge = abs(fract(vWorldPosition.y / courseHeight) - 0.5) * 2.0;
          float blockEdge = abs(fract(along) - 0.5) * 2.0;
          float joint = max(smoothstep(0.90, 1.0, courseEdge), smoothstep(0.93, 1.0, blockEdge));

          // A slow warm gradient replaces the old high-frequency strata stripe.
          float bedding = 0.985 + 0.015 * sin(vWorldPosition.y * 2.6 + block * 0.6);
          float dust = smoothstep(0.64, 0.96, noise) * (1.0 - smoothstep(0.04, 0.58, vWorldPosition.y));

          base *= blockTone * courseTone * bedding;
          base = mix(base, base * 0.82, joint * 0.55);
          base = mix(base, vec3(0.54, 0.38, 0.23), dust * 0.12);
          materialRoughness = max(materialRoughness, 0.90);
        // Surface 8: exposed operator skin. Keep natural matte shading, but
        // retain enough ambient response for pale skin to remain readable under
        // helmets, goggles and armour collars without making it self-luminous.
        } else if (uSurface > 7.5 && uSurface < 8.5) {
          float skinVariation = 0.985 + 0.015 * sin(vWorldPosition.y * 31.0 + vWorldPosition.x * 17.0);
          base *= skinVariation;
          materialRoughness = max(materialRoughness, ${OPERATOR_SKIN_MATERIAL.roughness.toFixed(2)});
          materialAmbientLift = ${OPERATOR_SKIN_MATERIAL.ambientLift.toFixed(2)};
        }

        vec3 keyDirection = normalize(vec3(-0.42, 0.82, 0.34));
        vec3 fillDirection = normalize(vec3(0.58, 0.42, -0.56));
        float diffuse = max(dot(normal, keyDirection), 0.0);
        float fill = max(dot(normal, fillDirection), 0.0);
        float hemi = mix(0.20, 0.50, normal.y * 0.5 + 0.5);

        vec2 coolCell = abs(fract((vWorldPosition.xz - vec2(2.5)) / vec2(5.0, 4.0)) - 0.5);
        float coolPool = exp(-18.0 * dot(coolCell, coolCell));
        vec2 warmCell = abs(fract((vWorldPosition.xz + vec2(1.4, 0.6)) / vec2(8.0, 6.0)) - 0.5);
        float warmPool = exp(-30.0 * dot(warmCell, warmCell));
        float flicker = 0.96 + 0.04 * sin(uTime * 2.1 + floor(vWorldPosition.x * 0.2) * 1.7);
        float overhead = coolPool * (0.12 + max(normal.y, 0.0) * 0.34) * flicker;

        vec3 viewDirection = normalize(uCameraPosition - vWorldPosition);
        vec3 halfDirection = normalize(keyDirection + viewDirection);
        float specPower = mix(8.0, 68.0, 1.0 - materialRoughness);
        float specular = pow(max(dot(normal, halfDirection), 0.0), specPower) * (1.0 - materialRoughness) * 0.68;
        float rim = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.8) * 0.095;
        float groundAO = 0.76 + 0.24 * smoothstep(0.02, 0.42, vWorldPosition.y);

        vec3 lit = base * (hemi + diffuse * 0.66 + fill * 0.10 + overhead + materialAmbientLift + uEmissive);
        lit += vec3(0.66, 0.82, 0.98) * specular;
        lit += vec3(0.48, 0.18, 0.07) * warmPool * 0.14;
        lit += base * rim;
        lit *= groundAO;

        float distanceToCamera = distance(vWorldPosition, uCameraPosition);
        float fogAmount = smoothstep(16.0, 35.0, distanceToCamera);
        vec3 finalColour = mix(lit, uFogColour, fogAmount);
        gl_FragColor = vec4(finalColour, uAlpha);
      }
    `;
    const program = gl.createProgram();
    gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || 'Unable to link WebGL program');
    }
    return program;
  }

  function createMesh(positions, normals, indices, retainSource = true) {
    const vao = gl.createVertexArray ? gl.createVertexArray() : null;
    if (vao) gl.bindVertexArray(vao);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(glLocations.position);
    gl.vertexAttribPointer(glLocations.position, 3, gl.FLOAT, false, 0, 0);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(glLocations.normal);
    gl.vertexAttribPointer(glLocations.normal, 3, gl.FLOAT, false, 0, 0);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    if (vao) gl.bindVertexArray(null);

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let offset = 0; offset < positions.length; offset += 3) {
      minX = Math.min(minX, positions[offset]);
      minY = Math.min(minY, positions[offset + 1]);
      minZ = Math.min(minZ, positions[offset + 2]);
      maxX = Math.max(maxX, positions[offset]);
      maxY = Math.max(maxY, positions[offset + 1]);
      maxZ = Math.max(maxZ, positions[offset + 2]);
    }
    const centreX = (minX + maxX) * 0.5;
    const centreY = (minY + maxY) * 0.5;
    const centreZ = (minZ + maxZ) * 0.5;
    let radius = 0;
    for (let offset = 0; offset < positions.length; offset += 3) {
      radius = Math.max(radius, Math.hypot(
        positions[offset] - centreX,
        positions[offset + 1] - centreY,
        positions[offset + 2] - centreZ
      ));
    }

    return {
      vao,
      positionBuffer,
      normalBuffer,
      indexBuffer,
      count: indices.length,
      sourcePositions: retainSource ? Array.from(positions) : null,
      sourceNormals: retainSource ? Array.from(normals) : null,
      sourceIndices: retainSource ? Array.from(indices) : null,
      bounds: {
        centre: [centreX, centreY, centreZ],
        radius
      }
    };
  }

  function bindMesh(mesh) {
    if (mesh.vao && gl.bindVertexArray) {
      gl.bindVertexArray(mesh.vao);
      return;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.positionBuffer);
    gl.enableVertexAttribArray(glLocations.position);
    gl.vertexAttribPointer(glLocations.position, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer);
    gl.enableVertexAttribArray(glLocations.normal);
    gl.vertexAttribPointer(glLocations.normal, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
  }

  function makeCubeMesh() {
    const p = [
      -0.5,-0.5, 0.5,  0.5,-0.5, 0.5,  0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
       0.5,-0.5,-0.5, -0.5,-0.5,-0.5, -0.5, 0.5,-0.5,  0.5, 0.5,-0.5,
      -0.5, 0.5, 0.5,  0.5, 0.5, 0.5,  0.5, 0.5,-0.5, -0.5, 0.5,-0.5,
      -0.5,-0.5,-0.5,  0.5,-0.5,-0.5,  0.5,-0.5, 0.5, -0.5,-0.5, 0.5,
       0.5,-0.5, 0.5,  0.5,-0.5,-0.5,  0.5, 0.5,-0.5,  0.5, 0.5, 0.5,
      -0.5,-0.5,-0.5, -0.5,-0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5,-0.5
    ];
    const n = [
       0,0,1, 0,0,1, 0,0,1, 0,0,1,
       0,0,-1,0,0,-1,0,0,-1,0,0,-1,
       0,1,0,0,1,0,0,1,0,0,1,0,
       0,-1,0,0,-1,0,0,-1,0,0,-1,0,
       1,0,0,1,0,0,1,0,0,1,0,0,
      -1,0,0,-1,0,0,-1,0,0,-1,0,0
    ];
    const i = [];
    for (let face = 0; face < 6; face++) {
      const o = face * 4;
      i.push(o, o + 1, o + 2, o, o + 2, o + 3);
    }
    return createMesh(p, n, i);
  }

  function signedPower(value, exponent) {
    if (Math.abs(value) < 0.000001) return 0;
    return Math.sign(value) * Math.pow(Math.abs(value), exponent);
  }

  function makeSmoothIndexedMesh(positions, indices) {
    const normals = new Array(positions.length).fill(0);
    for (let index = 0; index < indices.length; index += 3) {
      const ia = indices[index] * 3;
      const ib = indices[index + 1] * 3;
      const ic = indices[index + 2] * 3;
      const abx = positions[ib] - positions[ia];
      const aby = positions[ib + 1] - positions[ia + 1];
      const abz = positions[ib + 2] - positions[ia + 2];
      const acx = positions[ic] - positions[ia];
      const acy = positions[ic + 1] - positions[ia + 1];
      const acz = positions[ic + 2] - positions[ia + 2];
      const nx = aby * acz - abz * acy;
      const ny = abz * acx - abx * acz;
      const nz = abx * acy - aby * acx;
      const area = Math.hypot(nx, ny, nz);
      if (area < 0.0000001) continue;
      for (const offset of [ia, ib, ic]) {
        normals[offset] += nx;
        normals[offset + 1] += ny;
        normals[offset + 2] += nz;
      }
    }
    for (let offset = 0; offset < normals.length; offset += 3) {
      const length = Math.hypot(normals[offset], normals[offset + 1], normals[offset + 2]) || 1;
      normals[offset] /= length;
      normals[offset + 1] /= length;
      normals[offset + 2] /= length;
    }
    return createMesh(positions, normals, indices);
  }

  function makeProfiledCharacterMesh(profile, segments = 16, modifier = null, capBottom = true, capTop = true) {
    const positions = [];
    const indices = [];
    const ringSize = segments + 1;
    for (let ring = 0; ring < profile.length; ring++) {
      const current = profile[ring];
      const ringT = profile.length > 1 ? ring / (profile.length - 1) : 0;
      for (let segment = 0; segment <= segments; segment++) {
        const angle = segment / segments * TAU;
        const point = {
          x: current.rx * Math.cos(angle),
          y: current.y,
          z: (Number(current.cz) || 0) + current.rz * Math.sin(angle),
          angle,
          ring,
          ringT
        };
        const shaped = modifier ? (modifier(point, current) || point) : point;
        positions.push(shaped.x, shaped.y, shaped.z);
      }
    }
    for (let ring = 0; ring < profile.length - 1; ring++) {
      for (let segment = 0; segment < segments; segment++) {
        const a = ring * ringSize + segment;
        const b = a + ringSize;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    if (capBottom) {
      const centre = positions.length / 3;
      const base = profile[0];
      positions.push(0, base.y, Number(base.cz) || 0);
      for (let segment = 0; segment < segments; segment++) indices.push(centre, segment, segment + 1);
    }
    if (capTop) {
      const centre = positions.length / 3;
      const top = profile[profile.length - 1];
      positions.push(0, top.y, Number(top.cz) || 0);
      const start = (profile.length - 1) * ringSize;
      for (let segment = 0; segment < segments; segment++) indices.push(centre, start + segment + 1, start + segment);
    }
    return makeSmoothIndexedMesh(positions, indices);
  }

  // Anatomical head profile with a tapered chin, cheek volume, brow plane and
  // restrained nose projection. The mesh stays deliberately readable at match
  // distance without reverting to a featureless sphere.
  function makeOperatorHeadMesh(segments = 20) {
    const profile = [
      { y: -0.50, rx: 0.07, rz: 0.07, cz:  0.040 },
      { y: -0.44, rx: 0.22, rz: 0.17, cz:  0.040 },
      { y: -0.33, rx: 0.36, rz: 0.29, cz:  0.034 },
      { y: -0.18, rx: 0.46, rz: 0.39, cz:  0.024 },
      { y: -0.02, rx: 0.50, rz: 0.45, cz:  0.014 },
      { y:  0.14, rx: 0.49, rz: 0.47, cz:  0.000 },
      { y:  0.30, rx: 0.44, rz: 0.43, cz: -0.014 },
      { y:  0.43, rx: 0.29, rz: 0.29, cz: -0.026 },
      { y:  0.50, rx: 0.07, rz: 0.07, cz: -0.030 }
    ];
    return makeProfiledCharacterMesh(profile, segments, point => {
      const front = Math.max(0, Math.sin(point.angle));
      const side = Math.abs(Math.cos(point.angle));
      const cheekWeight = Math.exp(-Math.pow((point.y + 0.075) / 0.19, 2));
      const eyeWeight = Math.exp(-Math.pow((point.y - 0.075) / 0.105, 2));
      const browWeight = Math.exp(-Math.pow((point.y - 0.185) / 0.10, 2));
      const noseWeight = Math.exp(-Math.pow((point.y - 0.015) / 0.16, 2));
      const chinWeight = Math.exp(-Math.pow((point.y + 0.355) / 0.13, 2));
      point.z += Math.pow(front, 4) * cheekWeight * 0.022;
      point.z -= Math.pow(front, 6) * eyeWeight * 0.018;
      point.z += Math.pow(front, 7) * browWeight * 0.014;
      point.z += Math.pow(front, 14) * noseWeight * 0.105;
      point.z += Math.pow(front, 8) * chinWeight * 0.030;
      point.x *= 1 + Math.pow(side, 5) * cheekWeight * 0.055;
      point.x *= 1 - Math.pow(side, 5) * browWeight * 0.025;
      if (Math.sin(point.angle) < 0) point.z -= Math.pow(-Math.sin(point.angle), 3) * 0.016;
      return point;
    }, true, true);
  }

  // Open-bottom combat helmet shell with a flatter brow, fuller temporal area
  // and a modest rear nape extension. It replaces the second spherical head.
  function makeOperatorHelmetMesh(segments = 20) {
    const profile = [
      { y: -0.50, rx: 0.34, rz: 0.28, cz: -0.010 },
      { y: -0.40, rx: 0.45, rz: 0.39, cz: -0.016 },
      { y: -0.22, rx: 0.50, rz: 0.47, cz: -0.024 },
      { y:  0.02, rx: 0.49, rz: 0.50, cz: -0.032 },
      { y:  0.23, rx: 0.42, rz: 0.44, cz: -0.040 },
      { y:  0.40, rx: 0.28, rz: 0.30, cz: -0.046 },
      { y:  0.50, rx: 0.08, rz: 0.08, cz: -0.048 }
    ];
    return makeProfiledCharacterMesh(profile, segments, point => {
      const sine = Math.sin(point.angle);
      const front = Math.max(0, sine);
      const rear = Math.max(0, -sine);
      const side = Math.abs(Math.cos(point.angle));
      const lower = clamp((0.10 - point.y) / 0.60, 0, 1);
      point.z -= Math.pow(front, 4) * lower * 0.045;
      point.z -= Math.pow(rear, 3) * lower * 0.052;
      point.x *= 1 + Math.pow(side, 4) * lower * 0.025;
      return point;
    }, false, true);
  }

  // Curved, tapered lower-face cover. Its rear half is deliberately shallow so
  // it nests into the anatomical head instead of reading as a floating box.
  function makeOperatorFaceCoverMesh(segments = 16) {
    const profile = [
      { y: -0.50, rx: 0.18, rz: 0.16, cz: 0.030 },
      { y: -0.33, rx: 0.34, rz: 0.28, cz: 0.026 },
      { y: -0.04, rx: 0.50, rz: 0.43, cz: 0.018 },
      { y:  0.28, rx: 0.46, rz: 0.40, cz: 0.020 },
      { y:  0.50, rx: 0.29, rz: 0.27, cz: 0.050 }
    ];
    return makeProfiledCharacterMesh(profile, segments, point => {
      const sine = Math.sin(point.angle);
      const front = Math.max(0, sine);
      if (sine < 0) point.z *= 0.56;
      const noseBridge = Math.exp(-Math.pow((point.y - 0.38) / 0.20, 2));
      point.z += Math.pow(front, 4) * 0.025;
      point.z += Math.pow(front, 10) * noseBridge * 0.070;
      return point;
    }, true, true);
  }

  function makeOperatorPelvisMesh(segments = 16) {
    const profile = [
      { y: -0.50, rx: 0.30, rz: 0.30, cz:  0.006 },
      { y: -0.34, rx: 0.42, rz: 0.40, cz:  0.004 },
      { y: -0.08, rx: 0.50, rz: 0.49, cz:  0.000 },
      { y:  0.22, rx: 0.48, rz: 0.46, cz: -0.004 },
      { y:  0.42, rx: 0.39, rz: 0.36, cz: -0.008 },
      { y:  0.50, rx: 0.32, rz: 0.29, cz: -0.010 }
    ];
    return makeProfiledCharacterMesh(profile, segments, null, true, true);
  }

  // Tapered live carrier shell. Class dimensions still come from
  // operatorArmourRenderProfile(); this mesh only removes the chest-slab look.
  function makeOperatorCarrierMesh(segments = 16) {
    const profile = [
      { y: -0.50, rx: 0.35, rz: 0.34 },
      { y: -0.32, rx: 0.44, rz: 0.43 },
      { y:  0.04, rx: 0.50, rz: 0.50 },
      { y:  0.34, rx: 0.47, rz: 0.45 },
      { y:  0.50, rx: 0.34, rz: 0.33 }
    ];
    return makeProfiledCharacterMesh(profile, segments, null, true, true);
  }


  // Tapered deltoid shell used for shoulder protection. The lower edge narrows
  // into the arm rather than ending as a rectangular block or a round ball.
  function makeOperatorShoulderPadMesh(segments = 16) {
    const profile = [
      { y: -0.50, rx: 0.27, rz: 0.30, cz: 0.010 },
      { y: -0.30, rx: 0.43, rz: 0.43, cz: 0.008 },
      { y:  0.02, rx: 0.50, rz: 0.50, cz: 0.000 },
      { y:  0.30, rx: 0.46, rz: 0.43, cz: -0.006 },
      { y:  0.50, rx: 0.31, rz: 0.28, cz: -0.012 }
    ];
    return makeProfiledCharacterMesh(profile, segments, point => {
      const front = Math.max(0, Math.sin(point.angle));
      point.z += Math.pow(front, 3) * 0.020;
      return point;
    }, true, true);
  }

  // Compact glove shape with a broad palm and tapered wrist. Rotation remains
  // controlled by the existing animation rig, so attachment behaviour is unchanged.
  function makeOperatorGloveMesh(segments = 14) {
    const profile = [
      { y: -0.50, rx: 0.31, rz: 0.34 },
      { y: -0.27, rx: 0.46, rz: 0.48 },
      { y:  0.16, rx: 0.50, rz: 0.50 },
      { y:  0.42, rx: 0.44, rz: 0.44 },
      { y:  0.50, rx: 0.30, rz: 0.29 }
    ];
    return makeProfiledCharacterMesh(profile, segments, point => {
      const front = Math.max(0, Math.sin(point.angle));
      point.z += Math.pow(front, 4) * 0.022;
      return point;
    }, true, true);
  }

  // Forward-profiled protective shell used by knees and elbows. It keeps the
  // same single draw as the old rounded box, but tapers into the limb at both
  // ends and carries its volume towards the exposed front face.
  function makeOperatorJointPadMesh(segments = 14) {
    const profile = [
      { y: -0.50, rx: 0.28, rz: 0.24, cz: -0.010 },
      { y: -0.32, rx: 0.43, rz: 0.40, cz:  0.000 },
      { y: -0.02, rx: 0.50, rz: 0.50, cz:  0.018 },
      { y:  0.27, rx: 0.45, rz: 0.42, cz:  0.010 },
      { y:  0.50, rx: 0.25, rz: 0.22, cz: -0.008 }
    ];
    return makeProfiledCharacterMesh(profile, segments, point => {
      const front = Math.max(0, Math.sin(point.angle));
      point.z += Math.pow(front, 3) * 0.055;
      return point;
    }, true, true);
  }

  // A boot authored along local Z with a rounded heel, instep and tapered toe.
  // It replaces the superellipsoid shoe without adding any per-operator draws.
  function makeOperatorBootMesh(segments = 14) {
    const profile = [
      { z: -0.50, width: 0.64, height: 0.66, cy:  0.08 },
      { z: -0.34, width: 0.88, height: 0.92, cy:  0.05 },
      { z: -0.08, width: 1.00, height: 1.00, cy:  0.02 },
      { z:  0.22, width: 0.96, height: 0.84, cy: -0.04 },
      { z:  0.43, width: 0.80, height: 0.62, cy: -0.10 },
      { z:  0.50, width: 0.50, height: 0.34, cy: -0.14 }
    ];
    const positions = [];
    const indices = [];
    const ringSize = segments + 1;
    for (let ring = 0; ring < profile.length; ring++) {
      const current = profile[ring];
      for (let segment = 0; segment <= segments; segment++) {
        const angle = segment / segments * TAU;
        positions.push(
          current.width * 0.5 * Math.cos(angle),
          current.cy + current.height * 0.5 * Math.sin(angle),
          current.z
        );
      }
    }
    for (let ring = 0; ring < profile.length - 1; ring++) {
      for (let segment = 0; segment < segments; segment++) {
        const a = ring * ringSize + segment;
        const b = a + ringSize;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    const addCap = (ring, reverse) => {
      const current = profile[ring];
      const centre = positions.length / 3;
      positions.push(0, current.cy, current.z);
      const start = ring * ringSize;
      for (let segment = 0; segment < segments; segment++) {
        if (reverse) indices.push(centre, start + segment + 1, start + segment);
        else indices.push(centre, start + segment, start + segment + 1);
      }
    };
    addCap(0, true);
    addCap(profile.length - 1, false);
    return makeSmoothIndexedMesh(positions, indices);
  }

  // Smooth superellipsoid used for armour, boots and other major character
  // forms. It keeps broad readable planes while rounding the hard cube edges.
  function makeRoundedBoxMesh(segments = 12, rings = 8, exponent = 0.42) {
    const positions = [], normals = [], indices = [];
    const normalExponent = Math.max(1, 2 / Math.max(0.12, exponent) - 1);
    for (let y = 0; y <= rings; y++) {
      const v = y / rings;
      const latitude = (v - 0.5) * Math.PI;
      const latitudeCos = Math.cos(latitude);
      const latitudeSin = Math.sin(latitude);
      for (let x = 0; x <= segments; x++) {
        const longitude = x / segments * TAU;
        const px = 0.5 * signedPower(latitudeCos, exponent) * signedPower(Math.cos(longitude), exponent);
        const py = 0.5 * signedPower(latitudeSin, exponent);
        const pz = 0.5 * signedPower(latitudeCos, exponent) * signedPower(Math.sin(longitude), exponent);
        positions.push(px, py, pz);
        let nx = signedPower(px, normalExponent);
        let ny = signedPower(py, normalExponent);
        let nz = signedPower(pz, normalExponent);
        const length = Math.hypot(nx, ny, nz) || 1;
        nx /= length; ny /= length; nz /= length;
        normals.push(nx, ny, nz);
      }
    }
    for (let y = 0; y < rings; y++) {
      for (let x = 0; x < segments; x++) {
        const a = y * (segments + 1) + x;
        const b = a + segments + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    return createMesh(positions, normals, indices);
  }

  // A low-cost tapered capsule. The local -Y end is broader than +Y, matching
  // the natural shoulder-to-elbow, hip-to-knee and knee-to-ankle silhouette.
  function makeTaperedCapsuleMesh(segments = 10) {
    const profile = [
      { y: -0.50, r: 0.00 },
      { y: -0.46, r: 0.27 },
      { y: -0.38, r: 0.47 },
      { y: -0.25, r: 0.50 },
      { y:  0.10, r: 0.46 },
      { y:  0.34, r: 0.37 },
      { y:  0.45, r: 0.22 },
      { y:  0.50, r: 0.00 }
    ];
    const positions = [], normals = [], indices = [];
    for (let ring = 0; ring < profile.length; ring++) {
      const current = profile[ring];
      const previous = profile[Math.max(0, ring - 1)];
      const next = profile[Math.min(profile.length - 1, ring + 1)];
      const radiusSlope = (next.r - previous.r) / Math.max(0.0001, next.y - previous.y);
      for (let segment = 0; segment <= segments; segment++) {
        const angle = segment / segments * TAU;
        const cosine = Math.cos(angle);
        const sine = Math.sin(angle);
        positions.push(cosine * current.r, current.y, sine * current.r);
        if (ring === 0) {
          normals.push(0, -1, 0);
        } else if (ring === profile.length - 1) {
          normals.push(0, 1, 0);
        } else {
          let nx = cosine;
          let ny = -radiusSlope;
          let nz = sine;
          const length = Math.hypot(nx, ny, nz) || 1;
          nx /= length; ny /= length; nz /= length;
          normals.push(nx, ny, nz);
        }
      }
    }
    for (let ring = 0; ring < profile.length - 1; ring++) {
      for (let segment = 0; segment < segments; segment++) {
        const a = ring * (segments + 1) + segment;
        const b = a + segments + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    return createMesh(positions, normals, indices);
  }

  // Shaped tactical torso with a narrower waist, fuller ribcage and sloped
  // shoulders. It replaces the single rectangular body block without adding
  // another draw call or changing any gameplay dimensions.
  function makeOperatorTorsoMesh(segments = 12) {
    const profile = [
      { y: -0.50, x: 0.56, z: 0.61, cz:  0.010 },
      { y: -0.39, x: 0.67, z: 0.72, cz:  0.012 },
      { y: -0.20, x: 0.78, z: 0.84, cz:  0.016 },
      { y:  0.03, x: 0.94, z: 0.93, cz:  0.014 },
      { y:  0.25, x: 1.00, z: 0.88, cz:  0.006 },
      { y:  0.41, x: 0.91, z: 0.77, cz: -0.006 },
      { y:  0.50, x: 0.70, z: 0.62, cz: -0.012 }
    ];
    const positions = [], normals = [], indices = [];
    for (let ring = 0; ring < profile.length; ring++) {
      const current = profile[ring];
      const previous = profile[Math.max(0, ring - 1)];
      const next = profile[Math.min(profile.length - 1, ring + 1)];
      const dx = 0.5 * (next.x - previous.x) / Math.max(0.0001, next.y - previous.y);
      const dz = 0.5 * (next.z - previous.z) / Math.max(0.0001, next.y - previous.y);
      const rx = current.x * 0.5;
      const rz = current.z * 0.5;
      for (let segment = 0; segment <= segments; segment++) {
        const angle = segment / segments * TAU;
        const cosine = Math.cos(angle);
        const sine = Math.sin(angle);
        positions.push(rx * cosine, current.y, (Number(current.cz) || 0) + rz * sine);
        let nx = rz * cosine;
        let ny = -(rz * dx * cosine * cosine + rx * dz * sine * sine);
        let nz = rx * sine;
        const length = Math.hypot(nx, ny, nz) || 1;
        nx /= length; ny /= length; nz /= length;
        normals.push(nx, ny, nz);
      }
    }
    for (let ring = 0; ring < profile.length - 1; ring++) {
      for (let segment = 0; segment < segments; segment++) {
        const a = ring * (segments + 1) + segment;
        const b = a + segments + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }

    const addCap = (profileIndex, normalY, reverse) => {
      const current = profile[profileIndex];
      const centre = positions.length / 3;
      positions.push(0, current.y, Number(current.cz) || 0);
      normals.push(0, normalY, 0);
      const start = positions.length / 3;
      for (let segment = 0; segment <= segments; segment++) {
        const angle = segment / segments * TAU;
        positions.push(current.x * 0.5 * Math.cos(angle), current.y, (Number(current.cz) || 0) + current.z * 0.5 * Math.sin(angle));
        normals.push(0, normalY, 0);
      }
      for (let segment = 0; segment < segments; segment++) {
        if (reverse) indices.push(centre, start + segment + 1, start + segment);
        else indices.push(centre, start + segment, start + segment + 1);
      }
    };
    addCap(0, -1, false);
    addCap(profile.length - 1, 1, true);
    return createMesh(positions, normals, indices);
  }

  function makeSphereMesh(segments = 10, rings = 7) {
    const positions = [], normals = [], indices = [];
    for (let y = 0; y <= rings; y++) {
      const v = y / rings;
      const phi = v * Math.PI;
      for (let x = 0; x <= segments; x++) {
        const u = x / segments;
        const theta = u * TAU;
        const nx = Math.sin(phi) * Math.cos(theta);
        const ny = Math.cos(phi);
        const nz = Math.sin(phi) * Math.sin(theta);
        positions.push(nx * 0.5, ny * 0.5, nz * 0.5);
        normals.push(nx, ny, nz);
      }
    }
    for (let y = 0; y < rings; y++) {
      for (let x = 0; x < segments; x++) {
        const a = y * (segments + 1) + x;
        const b = a + segments + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    return createMesh(positions, normals, indices);
  }

  function makeDiscMesh(segments = 24, innerRadius = 0) {
    const positions = [], normals = [], indices = [];
    if (innerRadius <= 0) {
      positions.push(0, 0, 0); normals.push(0, 1, 0);
      for (let i = 0; i <= segments; i++) {
        const a = i / segments * TAU;
        positions.push(Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5);
        normals.push(0, 1, 0);
      }
      for (let i = 1; i <= segments; i++) indices.push(0, i, i + 1);
    } else {
      for (let i = 0; i <= segments; i++) {
        const a = i / segments * TAU;
        const c = Math.cos(a), s = Math.sin(a);
        positions.push(c * 0.5, 0, s * 0.5, c * 0.5 * innerRadius, 0, s * 0.5 * innerRadius);
        normals.push(0, 1, 0, 0, 1, 0);
      }
      for (let i = 0; i < segments; i++) {
        const o = i * 2;
        indices.push(o, o + 2, o + 1, o + 2, o + 3, o + 1);
      }
    }
    return createMesh(positions, normals, indices);
  }

  function makeCylinderMesh(segments = 10) {
    const positions = [], normals = [], indices = [];
    for (let i = 0; i <= segments; i++) {
      const a = i / segments * TAU;
      const x = Math.cos(a) * 0.5;
      const z = Math.sin(a) * 0.5;
      positions.push(x, -0.5, z, x, 0.5, z);
      normals.push(Math.cos(a), 0, Math.sin(a), Math.cos(a), 0, Math.sin(a));
    }
    for (let i = 0; i < segments; i++) {
      const o = i * 2;
      indices.push(o, o + 1, o + 2, o + 1, o + 3, o + 2);
    }
    const bottomCentre = positions.length / 3;
    positions.push(0, -0.5, 0); normals.push(0, -1, 0);
    const topCentre = positions.length / 3;
    positions.push(0, 0.5, 0); normals.push(0, 1, 0);
    const bottomStart = positions.length / 3;
    for (let i = 0; i <= segments; i++) {
      const a = i / segments * TAU;
      positions.push(Math.cos(a) * 0.5, -0.5, Math.sin(a) * 0.5);
      normals.push(0, -1, 0);
    }
    const topStart = positions.length / 3;
    for (let i = 0; i <= segments; i++) {
      const a = i / segments * TAU;
      positions.push(Math.cos(a) * 0.5, 0.5, Math.sin(a) * 0.5);
      normals.push(0, 1, 0);
    }
    for (let i = 0; i < segments; i++) {
      indices.push(bottomCentre, bottomStart + i + 1, bottomStart + i);
      indices.push(topCentre, topStart + i, topStart + i + 1);
    }
    return createMesh(positions, normals, indices);
  }

  function mat4Segment(out, ax, ay, az, bx, by, bz, radius = 0.05, depthRadius = radius) {
    let yx = bx - ax, yy = by - ay, yz = bz - az;
    const length = Math.hypot(yx, yy, yz) || 0.0001;
    yx /= length; yy /= length; yz /= length;
    const hx = Math.abs(yy) < 0.92 ? 0 : 1;
    const hy = Math.abs(yy) < 0.92 ? 1 : 0;
    const hz = 0;
    let xx = hy * yz - hz * yy;
    let xy = hz * yx - hx * yz;
    let xz = hx * yy - hy * yx;
    let xLen = Math.hypot(xx, xy, xz) || 1;
    xx /= xLen; xy /= xLen; xz /= xLen;
    const zx = yy * xz - yz * xy;
    const zy = yz * xx - yx * xz;
    const zz = yx * xy - yy * xx;
    out[0] = xx * radius; out[1] = xy * radius; out[2] = xz * radius; out[3] = 0;
    out[4] = yx * length; out[5] = yy * length; out[6] = yz * length; out[7] = 0;
    out[8] = zx * depthRadius; out[9] = zy * depthRadius; out[10] = zz * depthRadius; out[11] = 0;
    out[12] = (ax + bx) * 0.5; out[13] = (ay + by) * 0.5; out[14] = (az + bz) * 0.5; out[15] = 1;
    return out;
  }

  function drawSegment(a, b, radius, colour, emissive = 0, alpha = 1, surface = 5, roughness = 0.82, depthRadius = radius) {
    mat4Segment(glModel, a.x, a.y, a.z, b.x, b.y, b.z, radius, depthRadius);
    drawMesh(glMeshes.cylinder, colour, glModel, emissive, alpha, surface, roughness);
  }

  function drawAnatomicalSegment(a, b, radius, colour, emissive = 0, alpha = 1, surface = 5, roughness = 0.82, depthRadius = radius) {
    mat4Segment(glModel, a.x, a.y, a.z, b.x, b.y, b.z, radius, depthRadius);
    drawMesh(glMeshes.taperedCapsule || glMeshes.cylinder, colour, glModel, emissive, alpha, surface, roughness);
  }

  function worldPoint(baseX, baseY, baseZ, yaw, lx, ly, lz) {
    const p = localToWorld(baseX, baseZ, yaw, lx, lz);
    return { x: p.x, y: baseY + ly, z: p.z };
  }

  function setBlendMode(transparent) {
    if (transparent) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
    } else {
      gl.disable(gl.BLEND);
      gl.depthMask(true);
    }
  }

  let renderElevationOffset = 0;

  function setRenderElevationOffset(value = 0) {
    renderElevationOffset = Number.isFinite(Number(value)) ? Number(value) : 0;
    return renderElevationOffset;
  }

  function setStaticWorldBatchEligibility(eligible) {
    const previous = staticWorldBatchEligible;
    staticWorldBatchEligible = Boolean(eligible);
    return previous;
  }

  function deleteRendererMesh(mesh) {
    if (!gl || !mesh) return;
    if (mesh.vao && gl.deleteVertexArray) gl.deleteVertexArray(mesh.vao);
    if (mesh.positionBuffer) gl.deleteBuffer(mesh.positionBuffer);
    if (mesh.normalBuffer) gl.deleteBuffer(mesh.normalBuffer);
    if (mesh.indexBuffer) gl.deleteBuffer(mesh.indexBuffer);
  }

  function resetStaticWorldGpuBatches() {
    for (const batch of staticWorldGpuBatches) deleteRendererMesh(batch.mesh);
    staticWorldGpuBatches.length = 0;
    staticWorldGpuBatchGroups.clear();
    staticWorldGpuBatchesReady = false;
    staticWorldBatchMode = 'none';
    staticWorldBatchEligible = true;
  }

  function staticWorldMaterialKey(colour, emissive, alpha, surface, roughness) {
    return [
      colour.map(value => Number(value).toFixed(6)).join(','),
      Number(emissive).toFixed(6),
      Number(alpha).toFixed(6),
      Number(surface).toFixed(3),
      Number(roughness).toFixed(6)
    ].join('|');
  }

  function staticWorldBatchGroup(colour, emissive, alpha, surface, roughness, incomingVertices) {
    const key = staticWorldMaterialKey(colour, emissive, alpha, surface, roughness);
    let groups = staticWorldGpuBatchGroups.get(key);
    if (!groups) {
      groups = [];
      staticWorldGpuBatchGroups.set(key, groups);
    }
    let group = groups[groups.length - 1] || null;
    if (!group || group.positions.length / 3 + incomingVertices > 64000) {
      group = {
        colour: colour.slice(),
        emissive,
        alpha,
        surface,
        roughness,
        positions: [],
        normals: [],
        indices: []
      };
      groups.push(group);
    }
    return group;
  }

  function captureStaticWorldMesh(mesh, colour, model, emissive, alpha, surface, roughness) {
    if (!mesh?.sourcePositions || !mesh?.sourceNormals || !mesh?.sourceIndices) return false;
    const sourcePositions = mesh.sourcePositions;
    const sourceNormals = mesh.sourceNormals;
    const vertexCount = sourcePositions.length / 3;
    const group = staticWorldBatchGroup(colour, emissive, alpha, surface, roughness, vertexCount);
    const baseVertex = group.positions.length / 3;
    for (let offset = 0; offset < sourcePositions.length; offset += 3) {
      const x = sourcePositions[offset];
      const y = sourcePositions[offset + 1];
      const z = sourcePositions[offset + 2];
      group.positions.push(
        model[0] * x + model[4] * y + model[8] * z + model[12],
        model[1] * x + model[5] * y + model[9] * z + model[13] + renderElevationOffset,
        model[2] * x + model[6] * y + model[10] * z + model[14]
      );
      const nx = model[0] * sourceNormals[offset] + model[4] * sourceNormals[offset + 1] + model[8] * sourceNormals[offset + 2];
      const ny = model[1] * sourceNormals[offset] + model[5] * sourceNormals[offset + 1] + model[9] * sourceNormals[offset + 2];
      const nz = model[2] * sourceNormals[offset] + model[6] * sourceNormals[offset + 1] + model[10] * sourceNormals[offset + 2];
      const normalLength = Math.hypot(nx, ny, nz) || 1;
      group.normals.push(nx / normalLength, ny / normalLength, nz / normalLength);
    }
    for (const index of mesh.sourceIndices) group.indices.push(baseVertex + index);
    return true;
  }

  function beginStaticWorldBatchCapture() {
    staticWorldGpuBatchGroups.clear();
    staticWorldBatchMode = 'capture';
    staticWorldBatchEligible = true;
  }

  function finishStaticWorldBatchCapture() {
    for (const groups of staticWorldGpuBatchGroups.values()) {
      for (const group of groups) {
        if (!group.indices.length) continue;
        staticWorldGpuBatches.push({
          mesh: createMesh(group.positions, group.normals, group.indices, false),
          colour: group.colour,
          emissive: group.emissive,
          alpha: group.alpha,
          surface: group.surface,
          roughness: group.roughness
        });
      }
    }
    staticWorldGpuBatchGroups.clear();
    staticWorldGpuBatchesReady = true;
    staticWorldBatchMode = 'replay';
  }

  function drawStaticWorldGpuBatches() {
    if (!staticWorldGpuBatchesReady) return;
    const previousActive = staticWorldRenderActive;
    staticWorldRenderActive = false;
    mat4TRS(glModel, 0, 0, 0, 0, 0, 0, 1, 1, 1);
    for (const batch of staticWorldGpuBatches) {
      rendererFrameStats.staticBatchDrawCalls++;
      drawMesh(batch.mesh, batch.colour, glModel, batch.emissive, batch.alpha, batch.surface, batch.roughness);
    }
    staticWorldRenderActive = previousActive;
  }

  function beginRendererFrameStats() {
    rendererFrameStats.drawCalls = 0;
    rendererFrameStats.staticCandidates = 0;
    rendererFrameStats.staticDrawCalls = 0;
    rendererFrameStats.staticCulled = 0;
    rendererFrameStats.staticSourceDraws = 0;
    rendererFrameStats.staticBatchDrawCalls = 0;
  }

  function finishRendererFrameStats() {
    rendererLastFrameStats.drawCalls = rendererFrameStats.drawCalls;
    rendererLastFrameStats.staticCandidates = rendererFrameStats.staticCandidates;
    rendererLastFrameStats.staticDrawCalls = rendererFrameStats.staticDrawCalls;
    rendererLastFrameStats.staticCulled = rendererFrameStats.staticCulled;
    rendererLastFrameStats.staticSourceDraws = rendererFrameStats.staticSourceDraws;
    rendererLastFrameStats.staticBatchDrawCalls = rendererFrameStats.staticBatchDrawCalls;
    rendererLastFrameStats.cullingEnabled = STATIC_WORLD_CULLING_ENABLED;
    rendererLastFrameStats.batchingEnabled = STATIC_WORLD_BATCHING_ENABLED;
    rendererStatsPublishCountdown--;
    if (rendererStatsPublishCountdown > 0 || !document.body) return;
    rendererStatsPublishCountdown = 30;
    document.body.dataset.rendererDrawCalls = String(rendererLastFrameStats.drawCalls);
    document.body.dataset.rendererStaticCandidates = String(rendererLastFrameStats.staticCandidates);
    document.body.dataset.rendererStaticDrawCalls = String(rendererLastFrameStats.staticDrawCalls);
    document.body.dataset.rendererStaticCulled = String(rendererLastFrameStats.staticCulled);
    document.body.dataset.rendererStaticSourceDraws = String(rendererLastFrameStats.staticSourceDraws);
    document.body.dataset.rendererStaticBatchDrawCalls = String(rendererLastFrameStats.staticBatchDrawCalls);
    document.body.dataset.rendererStaticCulling = rendererLastFrameStats.cullingEnabled ? 'on' : 'off';
    document.body.dataset.rendererStaticBatching = rendererLastFrameStats.batchingEnabled ? 'on' : 'off';
  }

  function staticMeshOutsideCameraView(mesh, model) {
    if (!STATIC_WORLD_CULLING_ENABLED || !mesh?.bounds) return false;
    const centre = mesh.bounds.centre;
    const worldX = model[0] * centre[0] + model[4] * centre[1] + model[8] * centre[2] + model[12];
    const worldY = model[1] * centre[0] + model[5] * centre[1] + model[9] * centre[2] + model[13] + renderElevationOffset;
    const worldZ = model[2] * centre[0] + model[6] * centre[1] + model[10] * centre[2] + model[14];
    const viewX = glView[0] * worldX + glView[4] * worldY + glView[8] * worldZ + glView[12];
    const viewY = glView[1] * worldX + glView[5] * worldY + glView[9] * worldZ + glView[13];
    const viewZ = glView[2] * worldX + glView[6] * worldY + glView[10] * worldZ + glView[14];
    const depth = -viewZ;
    const scaleX = Math.hypot(model[0], model[1], model[2]);
    const scaleY = Math.hypot(model[4], model[5], model[6]);
    const scaleZ = Math.hypot(model[8], model[9], model[10]);
    const radius = mesh.bounds.radius * Math.max(scaleX, scaleY, scaleZ);
    if (depth + radius < 0.025 || depth - radius > GL_FAR) return true;
    const horizontalSlope = 1 / Math.max(0.0001, glProjection[0]);
    const verticalSlope = 1 / Math.max(0.0001, glProjection[5]);
    const horizontalAllowance = radius * Math.hypot(1, horizontalSlope);
    const verticalAllowance = radius * Math.hypot(1, verticalSlope);
    return Math.abs(viewX) > depth * horizontalSlope + horizontalAllowance
      || Math.abs(viewY) > depth * verticalSlope + verticalAllowance;
  }

  function drawMesh(mesh, colour, model, emissive = 0, alpha = 1, surface = 0, roughness = 0.76) {
    if (!mesh || alpha <= 0.001) return;
    if (staticWorldRenderActive) {
      const batchable = STATIC_WORLD_BATCHING_ENABLED
        && activeArenaId === 'citadel'
        && staticWorldBatchEligible
        && alpha >= 0.999;
      if (staticWorldBatchMode === 'capture') {
        if (batchable) captureStaticWorldMesh(mesh, colour, model, emissive, alpha, surface, roughness);
        return;
      }
      if (staticWorldBatchMode === 'replay' && batchable) {
        rendererFrameStats.staticSourceDraws++;
        return;
      }
      rendererFrameStats.staticCandidates++;
      if (staticMeshOutsideCameraView(mesh, model)) {
        rendererFrameStats.staticCulled++;
        return;
      }
      rendererFrameStats.staticDrawCalls++;
    }
    rendererFrameStats.drawCalls++;
    bindMesh(mesh);
    const originalModelY = model[13];
    if (renderElevationOffset) model[13] = originalModelY + renderElevationOffset;
    gl.uniformMatrix4fv(glLocations.model, false, model);
    if (renderElevationOffset) model[13] = originalModelY;
    gl.uniform3fv(glLocations.colour, colour);
    gl.uniform1f(glLocations.emissive, emissive);
    gl.uniform1f(glLocations.alpha, alpha);
    gl.uniform1f(glLocations.surface, surface);
    gl.uniform1f(glLocations.roughness, roughness);
    gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
  }

  function localToWorld(baseX, baseZ, yaw, lx, lz) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    return { x: baseX + c * lx + s * lz, z: baseZ - s * lx + c * lz };
  }

  // Build 12.146: baked ambient occlusion.
  //
  // Enclosure is sampled once from the collision grid when the world batches
  // are built, never per frame, and is folded into the existing per-draw
  // colour. That costs no extra draw calls, no texture and no shader work — a
  // corridor simply resolves darker than an open room, which is most of what
  // makes a space read as lit.
  //
  // The value is quantised: the static batcher groups draws by exact material,
  // so a continuous factor would shatter one wall batch into hundreds.
  const STATIC_OCCLUSION_STEPS = 6;
  const STATIC_OCCLUSION_RADIUS = 2.6;

  // Build 12.153: the raw enclosure ratio is remapped before it is used. The
  // 12.146 version fed it straight in, so a typical wall came out around 0.34
  // and every surface in the arena darkened by a similar small amount — a flat
  // tint rather than shading, which is why it did not read. Below the floor
  // threshold a point counts as genuinely open and is not darkened at all;
  // above the ceiling threshold it is treated as fully enclosed. Only the
  // middle produces contrast, which is where corners and corridors live.
  //
  // The result is still quantised: the static batcher groups draws by exact
  // material, so a continuous factor would shatter one floor batch into
  // hundreds.
  const STATIC_OCCLUSION_OPEN = 0.20;
  const STATIC_OCCLUSION_ENCLOSED = 0.86;

  // The floor is quantised more coarsely than the walls on purpose. Every
  // distinct level becomes its own merged rectangle, so step count is what
  // decides the floor's draw-call cost: at six steps Citadel produced 294
  // rectangles, at four it produces far fewer for the same visible gradient,
  // because the extra levels were splitting bands only a cell or two wide.
  const STATIC_FLOOR_OCCLUSION_STEPS = 4;

  function staticOcclusionCurve(raw, steps = STATIC_OCCLUSION_STEPS) {
    const t = clamp((raw - STATIC_OCCLUSION_OPEN) / (STATIC_OCCLUSION_ENCLOSED - STATIC_OCCLUSION_OPEN), 0, 1);
    const shaped = t * t * (3 - 2 * t);
    return Math.round(shaped * steps) / steps;
  }

  function staticOcclusionRaw(x, z, radii = [STATIC_OCCLUSION_RADIUS * 0.45, STATIC_OCCLUSION_RADIUS]) {
    let blocked = 0;
    let total = 0;
    // Two rings give a cheap approximation of how enclosed a point is without
    // the cost of a real hemisphere sample.
    for (const radius of radii) {
      for (let step = 0; step < 12; step++) {
        const angle = (step / 12) * Math.PI * 2;
        total++;
        if (isWall(x + Math.cos(angle) * radius, z + Math.sin(angle) * radius)) blocked++;
      }
    }
    return total ? blocked / total : 0;
  }

  function staticOcclusionAt(x, z) {
    return staticOcclusionCurve(staticOcclusionRaw(x, z));
  }

  // The floor needs a much tighter reach than the walls do. At the 2.6-unit
  // radius above, a three-wide corridor is entirely within range of a wall, so
  // every cell in it darkens by the same amount and the result reads as the
  // corridor simply being dimmer — not as shading. Contact shading has to hug
  // the wall base, so the floor samples at well under a cell's width and the
  // curve is re-centred on the lower values that produces. Ground level is also
  // where a tight band is affordable: the floor is already shaded per cell.
  const STATIC_FLOOR_OCCLUSION_RADII = Object.freeze([0.72, 1.45]);
  const STATIC_FLOOR_OCCLUSION_OPEN = 0.08;
  const STATIC_FLOOR_OCCLUSION_ENCLOSED = 0.62;

  function staticFloorOcclusion(x, z) {
    const raw = staticOcclusionRaw(x, z, STATIC_FLOOR_OCCLUSION_RADII);
    const t = clamp((raw - STATIC_FLOOR_OCCLUSION_OPEN) / (STATIC_FLOOR_OCCLUSION_ENCLOSED - STATIC_FLOOR_OCCLUSION_OPEN), 0, 1);
    const shaped = t * t * (3 - 2 * t);
    return Math.round(shaped * STATIC_FLOOR_OCCLUSION_STEPS) / STATIC_FLOOR_OCCLUSION_STEPS;
  }

  // A wall rectangle's own centre is *inside* the wall, so sampling there
  // mostly measures how long the wall is rather than how enclosed the space in
  // front of it is. That is why Aurora's long straight walls all resolved to
  // the same value and the arena came out with three distinct levels across the
  // whole map. Sample the open cells that actually face the wall instead.
  function staticWallOcclusion(rect) {
    const halfWidth = rect.width / 2;
    const halfDepth = rect.depth / 2;
    let total = 0;
    let samples = 0;
    const probe = (x, z) => {
      if (isWall(x, z)) return;
      total += staticOcclusionRaw(x, z);
      samples++;
    };
    const spanX = Math.max(1, Math.round(rect.width));
    const spanZ = Math.max(1, Math.round(rect.depth));
    for (let index = 0; index < spanX; index++) {
      const x = rect.x - halfWidth + 0.5 + index;
      probe(x, rect.z - halfDepth - 0.5);
      probe(x, rect.z + halfDepth + 0.5);
    }
    for (let index = 0; index < spanZ; index++) {
      const z = rect.z - halfDepth + 0.5 + index;
      probe(rect.x - halfWidth - 0.5, z);
      probe(rect.x + halfWidth + 0.5, z);
    }
    // A rectangle with no open neighbour is buried inside a wall mass; nothing
    // can see it, so the value only has to be stable.
    if (!samples) return 1;
    return staticOcclusionCurve(total / samples);
  }

  // Occlusion darkens, it never brightens. With the curve above, open space
  // resolves to exactly zero and is left untouched, so raising the strength
  // deepens corners without dimming the arena as a whole.
  function applyStaticOcclusion(colour, occlusion, strength = 0.42) {
    const factor = 1 - clamp(Number(occlusion) || 0, 0, 1) * strength;
    return [colour[0] * factor, colour[1] * factor, colour[2] * factor];
  }

  // Build 12.153: the floor was a single draw spanning the whole map, so every
  // room had exactly the same ground tone however enclosed it was — and in a
  // first-person view the floor is most of what is on screen, which is the main
  // reason the 12.146 occlusion did not read as lighting.
  //
  // Each cell is shaded on its own and then merged, by the same greedy sweep
  // the walls use, into the fewest rectangles that each hold one occlusion
  // level. Quantisation is what makes that merge worth having: six levels
  // collapse 864 cells into a few dozen rectangles and leave the batcher with
  // six material groups instead of hundreds. Wall cells are shaded too rather
  // than skipped, so the floor stays gap-free under every wall base.
  function createFloorRectangles() {
    const levels = Array.from({ length: MAP_H }, (_, y) =>
      Array.from({ length: MAP_W }, (_, x) =>
        staticFloorOcclusion(x + 0.5, y + 0.5)));
    const visited = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(false));
    const rectangles = [];
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (visited[y][x]) continue;
        const level = levels[y][x];
        let width = 1;
        while (x + width < MAP_W && !visited[y][x + width] && levels[y][x + width] === level) width++;
        let height = 1;
        outer: while (y + height < MAP_H) {
          for (let xx = x; xx < x + width; xx++) {
            if (visited[y + height][xx] || levels[y + height][xx] !== level) break outer;
          }
          height++;
        }
        for (let yy = y; yy < y + height; yy++) {
          for (let xx = x; xx < x + width; xx++) visited[yy][xx] = true;
        }
        rectangles.push({
          x: x + width / 2,
          z: y + height / 2,
          width,
          depth: height,
          occlusion: level
        });
      }
    }
    return rectangles;
  }

  function createWallRectangles() {
    const visited = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(false));
    const rectangles = [];
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (visited[y][x] || MAP[y][x] !== '1') continue;
        let width = 1;
        while (x + width < MAP_W && !visited[y][x + width] && MAP[y][x + width] === '1') width++;
        let height = 1;
        outer: while (y + height < MAP_H) {
          for (let xx = x; xx < x + width; xx++) {
            if (visited[y + height][xx] || MAP[y + height][xx] !== '1') break outer;
          }
          height++;
        }
        for (let yy = y; yy < y + height; yy++) {
          for (let xx = x; xx < x + width; xx++) visited[yy][xx] = true;
        }
        rectangles.push({ x: x + width / 2, z: y + height / 2, width, depth: height, variant: (x + y) & 1 });
      }
    }
    return rectangles;
  }
