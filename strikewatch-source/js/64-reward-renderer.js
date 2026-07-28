/*
 * Strikewatch source module: 64-reward-renderer.js
 * Purpose: Dedicated custom-WebGL renderer for the post-match field crate.
 *
 * The reward canvas uses the same primitive-mesh, shader-lighting and matrix
 * rendering approach as the live match. Run `python3 build.py` to regenerate
 * js/strikewatch.dev.js and the standalone release in dist/.
 */

  let rewardGl = null;
  let rewardProgram = null;
  let rewardReady = false;
  let rewardCubeMesh = null;
  const rewardLocations = {};
  const rewardProjection = new Float32Array(16);
  const rewardView = new Float32Array(16);
  const rewardModel = new Float32Array(16);
  // Build 12.141: the crate turns on its own while it is on screen. `spinBase`
  // carries the manager's own rotation across the automatic spin, so releasing
  // a drag resumes from where they left it instead of snapping back.
  const REWARD_CRATE_SPIN_RATE = 0.42;
  const rewardRendererState = {
    yaw: -0.48,
    targetYaw: -0.48,
    spinBase: -0.48,
    dragging: false,
    pointerId: null,
    lastX: 0,
    contextListenersBound: false,
    pointerListenersBound: false
  };

  function rewardCompileShader(context, type, source) {
    const shader = context.createShader(type);
    context.shaderSource(shader, source);
    context.compileShader(shader);
    if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
      const message = context.getShaderInfoLog(shader) || 'Reward renderer shader compilation failed';
      context.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  }

  function rewardCreateProgram(context) {
    const vertexSource = `
      attribute vec3 aPosition;
      attribute vec3 aNormal;
      uniform mat4 uProjection;
      uniform mat4 uView;
      uniform mat4 uModel;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      void main() {
        vec4 world = uModel * vec4(aPosition, 1.0);
        vWorldPosition = world.xyz;
        vNormal = normalize(mat3(uModel) * aNormal);
        gl_Position = uProjection * uView * world;
      }
    `;
    const fragmentSource = `
      precision mediump float;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      uniform vec3 uColour;
      uniform vec3 uCamera;
      uniform float uEmissive;
      uniform float uRoughness;
      uniform float uAlpha;
      uniform float uTime;
      void main() {
        vec3 normal = normalize(vNormal);
        vec3 key = normalize(vec3(-0.46, 0.82, 0.34));
        vec3 fill = normalize(vec3(0.62, 0.34, -0.54));
        vec3 viewDirection = normalize(uCamera - vWorldPosition);
        float diffuse = max(dot(normal, key), 0.0);
        float fillLight = max(dot(normal, fill), 0.0);
        float hemi = mix(0.22, 0.52, normal.y * 0.5 + 0.5);
        vec3 halfDirection = normalize(key + viewDirection);
        float specPower = mix(9.0, 72.0, 1.0 - clamp(uRoughness, 0.04, 1.0));
        float specular = pow(max(dot(normal, halfDirection), 0.0), specPower) * (1.0 - uRoughness) * 0.72;
        float edge = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.4);
        float brushed = 0.94 + 0.06 * sin(vWorldPosition.y * 84.0 + vWorldPosition.x * 13.0);
        vec3 base = uColour * brushed;
        vec3 lit = base * (hemi + diffuse * 0.68 + fillLight * 0.13 + uEmissive);
        lit += vec3(0.74, 0.86, 1.0) * specular;
        lit += base * edge * 0.12;
        float pulse = 0.96 + 0.04 * sin(uTime * 2.8);
        gl_FragColor = vec4(lit * pulse, uAlpha);
      }
    `;
    const program = context.createProgram();
    context.attachShader(program, rewardCompileShader(context, context.VERTEX_SHADER, vertexSource));
    context.attachShader(program, rewardCompileShader(context, context.FRAGMENT_SHADER, fragmentSource));
    context.linkProgram(program);
    if (!context.getProgramParameter(program, context.LINK_STATUS)) {
      throw new Error(context.getProgramInfoLog(program) || 'Reward renderer program link failed');
    }
    return program;
  }

  function rewardCreateCubeMesh(context) {
    const positions = [
      -0.5,-0.5, 0.5,  0.5,-0.5, 0.5,  0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
       0.5,-0.5,-0.5, -0.5,-0.5,-0.5, -0.5, 0.5,-0.5,  0.5, 0.5,-0.5,
      -0.5, 0.5, 0.5,  0.5, 0.5, 0.5,  0.5, 0.5,-0.5, -0.5, 0.5,-0.5,
      -0.5,-0.5,-0.5,  0.5,-0.5,-0.5,  0.5,-0.5, 0.5, -0.5,-0.5, 0.5,
       0.5,-0.5, 0.5,  0.5,-0.5,-0.5,  0.5, 0.5,-0.5,  0.5, 0.5, 0.5,
      -0.5,-0.5,-0.5, -0.5,-0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5,-0.5
    ];
    const normals = [
       0,0,1, 0,0,1, 0,0,1, 0,0,1,
       0,0,-1,0,0,-1,0,0,-1,0,0,-1,
       0,1,0, 0,1,0, 0,1,0, 0,1,0,
       0,-1,0,0,-1,0,0,-1,0,0,-1,0,
       1,0,0, 1,0,0, 1,0,0, 1,0,0,
      -1,0,0,-1,0,0,-1,0,0,-1,0,0
    ];
    const indices = [];
    for (let face = 0; face < 6; face++) {
      const offset = face * 4;
      indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
    }
    const positionBuffer = context.createBuffer();
    context.bindBuffer(context.ARRAY_BUFFER, positionBuffer);
    context.bufferData(context.ARRAY_BUFFER, new Float32Array(positions), context.STATIC_DRAW);
    const normalBuffer = context.createBuffer();
    context.bindBuffer(context.ARRAY_BUFFER, normalBuffer);
    context.bufferData(context.ARRAY_BUFFER, new Float32Array(normals), context.STATIC_DRAW);
    const indexBuffer = context.createBuffer();
    context.bindBuffer(context.ELEMENT_ARRAY_BUFFER, indexBuffer);
    context.bufferData(context.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), context.STATIC_DRAW);
    return { positionBuffer, normalBuffer, indexBuffer, count: indices.length };
  }

  function rewardBindCube() {
    rewardGl.bindBuffer(rewardGl.ARRAY_BUFFER, rewardCubeMesh.positionBuffer);
    rewardGl.enableVertexAttribArray(rewardLocations.position);
    rewardGl.vertexAttribPointer(rewardLocations.position, 3, rewardGl.FLOAT, false, 0, 0);
    rewardGl.bindBuffer(rewardGl.ARRAY_BUFFER, rewardCubeMesh.normalBuffer);
    rewardGl.enableVertexAttribArray(rewardLocations.normal);
    rewardGl.vertexAttribPointer(rewardLocations.normal, 3, rewardGl.FLOAT, false, 0, 0);
    rewardGl.bindBuffer(rewardGl.ELEMENT_ARRAY_BUFFER, rewardCubeMesh.indexBuffer);
  }

  function rewardDrawCube(x, y, z, sx, sy, sz, colour, yaw = 0, pitch = 0, roll = 0, emissive = 0, roughness = 0.68, alpha = 1) {
    mat4TRS(rewardModel, x, y, z, yaw, pitch, roll, sx, sy, sz);
    rewardGl.uniformMatrix4fv(rewardLocations.model, false, rewardModel);
    rewardGl.uniform3fv(rewardLocations.colour, colour);
    rewardGl.uniform1f(rewardLocations.emissive, emissive);
    rewardGl.uniform1f(rewardLocations.roughness, roughness);
    rewardGl.uniform1f(rewardLocations.alpha, alpha);
    rewardGl.depthMask(alpha >= 0.99);
    rewardGl.drawElements(rewardGl.TRIANGLES, rewardCubeMesh.count, rewardGl.UNSIGNED_SHORT, 0);
    rewardGl.depthMask(true);
  }

  function rewardRotatePoint(x, y, z, yaw = 0, pitch = 0, roll = 0) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cx = Math.cos(pitch), sx = Math.sin(pitch);
    const cz = Math.cos(roll), sz = Math.sin(roll);
    const r00 = cy * cz + sx * sy * sz;
    const r01 = -cy * sz + cz * sx * sy;
    const r02 = cx * sy;
    const r10 = cx * sz;
    const r11 = cx * cz;
    const r12 = -sx;
    const r20 = cy * sx * sz - cz * sy;
    const r21 = cy * cz * sx + sy * sz;
    const r22 = cx * cy;
    return {
      x: r00 * x + r01 * y + r02 * z,
      y: r10 * x + r11 * y + r12 * z,
      z: r20 * x + r21 * y + r22 * z
    };
  }

  function rewardDrawCubeLocal(parentX, parentY, parentZ, parentYaw, parentPitch, parentRoll, localX, localY, localZ, sx, sy, sz, colour, localYaw = 0, localPitch = 0, localRoll = 0, emissive = 0, roughness = 0.68, alpha = 1) {
    const rotated = rewardRotatePoint(localX, localY, localZ, parentYaw, parentPitch, parentRoll);
    rewardDrawCube(
      parentX + rotated.x,
      parentY + rotated.y,
      parentZ + rotated.z,
      sx, sy, sz, colour,
      parentYaw + localYaw,
      parentPitch + localPitch,
      parentRoll + localRoll,
      emissive, roughness, alpha
    );
  }

  function rewardTransformFromRootPivot(rootX, rootY, rootZ, rootYaw, pivotLocalX, pivotLocalY, pivotLocalZ, childLocalX, childLocalY, childLocalZ, childPitch = 0, childRoll = 0) {
    const pivotWorld = rewardRotatePoint(pivotLocalX, pivotLocalY, pivotLocalZ, rootYaw, 0, 0);
    const childWorld = rewardRotatePoint(childLocalX, childLocalY, childLocalZ, rootYaw, childPitch, childRoll);
    return {
      x: rootX + pivotWorld.x + childWorld.x,
      y: rootY + pivotWorld.y + childWorld.y,
      z: rootZ + pivotWorld.z + childWorld.z
    };
  }

  function rewardCrateLidPose(yaw, easedOpen, bodyY) {
    const lidPitch = -easedOpen * 1.05;
    const centre = rewardTransformFromRootPivot(
      0, bodyY, 0, yaw,
      0, 0.44, -0.79,
      0, 0.13, 0.79,
      lidPitch, 0
    );
    const pivot = rewardRotatePoint(0, 0.44, -0.79, yaw, 0, 0);
    return {
      x: centre.x,
      y: centre.y,
      z: centre.z,
      pitch: lidPitch,
      pivotX: pivot.x,
      pivotY: bodyY + pivot.y,
      pivotZ: pivot.z
    };
  }

  function rewardCrateRailPose(yaw, railPitch, bodyY, railX) {
    return rewardTransformFromRootPivot(
      0, bodyY, 0, yaw,
      0, 0.44, -0.70,
      railX, 0.17, 0.34,
      railPitch, 0
    );
  }

  function rewardCrateAttachmentAudit(yaw = -0.48, openingProgress = 0) {
    const boundedProgress = Math.max(0, Math.min(1, Number(openingProgress) || 0));
    const easedOpen = boundedProgress * boundedProgress * (3 - 2 * boundedProgress);
    const pose = rewardCrateLidPose(Number(yaw) || 0, easedOpen, 0.62);
    const reverseOffset = rewardRotatePoint(0, -0.13, -0.79, Number(yaw) || 0, pose.pitch, 0);
    const recoveredPivot = {
      x: pose.x + reverseOffset.x,
      y: pose.y + reverseOffset.y,
      z: pose.z + reverseOffset.z
    };
    const hingeGap = Math.hypot(
      recoveredPivot.x - pose.pivotX,
      recoveredPivot.y - pose.pivotY,
      recoveredPivot.z - pose.pivotZ
    );
    return {
      ok: hingeGap < 1e-6,
      yaw: Number(yaw) || 0,
      openingProgress: boundedProgress,
      lidPitch: pose.pitch,
      hingeGap,
      pivot: { x: pose.pivotX, y: pose.pivotY, z: pose.pivotZ },
      recoveredPivot
    };
  }

  function resizeCareerCrateRenderer() {
    if (!rewardReady || !careerCrateCanvas || !rewardGl) return;
    const rect = careerCrateCanvas.getBoundingClientRect();
    const dpr = Math.min(1.75, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round((careerCrateCanvas.clientWidth || rect.width || 320) * dpr));
    const height = Math.max(1, Math.round((careerCrateCanvas.clientHeight || rect.height || 220) * dpr));
    if (careerCrateCanvas.width !== width || careerCrateCanvas.height !== height) {
      careerCrateCanvas.width = width;
      careerCrateCanvas.height = height;
    }
    rewardGl.viewport(0, 0, width, height);
    mat4Perspective(rewardProjection, Math.PI / 4.2, width / Math.max(1, height), 0.05, 30);
  }

  function bindCareerCratePointerControls() {
    if (!careerCrateCanvas || rewardRendererState.pointerListenersBound) return;
    rewardRendererState.pointerListenersBound = true;
    careerCrateCanvas.addEventListener('pointerdown', event => {
      rewardRendererState.dragging = true;
      rewardRendererState.pointerId = event.pointerId;
      rewardRendererState.lastX = event.clientX;
      careerCrateCanvas.setPointerCapture?.(event.pointerId);
      careerCrateCanvas.classList.add('dragging');
    });
    careerCrateCanvas.addEventListener('pointermove', event => {
      if (!rewardRendererState.dragging || event.pointerId !== rewardRendererState.pointerId) return;
      const delta = event.clientX - rewardRendererState.lastX;
      rewardRendererState.lastX = event.clientX;
      rewardRendererState.targetYaw += delta * 0.012;
      rewardRendererState.spinBase += delta * 0.012;
    });
    const release = event => {
      if (!rewardRendererState.dragging || (event && event.pointerId !== rewardRendererState.pointerId)) return;
      rewardRendererState.dragging = false;
      rewardRendererState.pointerId = null;
      careerCrateCanvas.classList.remove('dragging');
    };
    careerCrateCanvas.addEventListener('pointerup', release);
    careerCrateCanvas.addEventListener('pointercancel', release);
  }

  function initCareerCrateRenderer() {
    if (!careerCrateCanvas) return;
    try {
      rewardGl = careerCrateCanvas.getContext('webgl2', {
        alpha: true,
        antialias: true,
        depth: true,
        stencil: false,
        powerPreference: 'high-performance'
      }) || careerCrateCanvas.getContext('webgl', {
        alpha: true,
        antialias: true,
        depth: true,
        stencil: false,
        powerPreference: 'high-performance'
      });
      if (!rewardGl) throw new Error('No WebGL context is available for the reward crate.');
      rewardProgram = rewardCreateProgram(rewardGl);
      rewardGl.useProgram(rewardProgram);
      rewardLocations.position = rewardGl.getAttribLocation(rewardProgram, 'aPosition');
      rewardLocations.normal = rewardGl.getAttribLocation(rewardProgram, 'aNormal');
      rewardLocations.projection = rewardGl.getUniformLocation(rewardProgram, 'uProjection');
      rewardLocations.view = rewardGl.getUniformLocation(rewardProgram, 'uView');
      rewardLocations.model = rewardGl.getUniformLocation(rewardProgram, 'uModel');
      rewardLocations.colour = rewardGl.getUniformLocation(rewardProgram, 'uColour');
      rewardLocations.camera = rewardGl.getUniformLocation(rewardProgram, 'uCamera');
      rewardLocations.emissive = rewardGl.getUniformLocation(rewardProgram, 'uEmissive');
      rewardLocations.roughness = rewardGl.getUniformLocation(rewardProgram, 'uRoughness');
      rewardLocations.alpha = rewardGl.getUniformLocation(rewardProgram, 'uAlpha');
      rewardLocations.time = rewardGl.getUniformLocation(rewardProgram, 'uTime');
      rewardCubeMesh = rewardCreateCubeMesh(rewardGl);
      rewardGl.enable(rewardGl.DEPTH_TEST);
      rewardGl.depthFunc(rewardGl.LEQUAL);
      rewardGl.enable(rewardGl.CULL_FACE);
      rewardGl.cullFace(rewardGl.BACK);
      rewardGl.enable(rewardGl.BLEND);
      rewardGl.blendFunc(rewardGl.SRC_ALPHA, rewardGl.ONE_MINUS_SRC_ALPHA);
      rewardReady = true;
      careerCrateRendererFallbackEl?.setAttribute('hidden', '');
      bindCareerCratePointerControls();
      resizeCareerCrateRenderer();
      if (!rewardRendererState.contextListenersBound) {
        rewardRendererState.contextListenersBound = true;
        careerCrateCanvas.addEventListener('webglcontextlost', event => {
          event.preventDefault();
          rewardReady = false;
          if (careerCrateRendererFallbackEl) careerCrateRendererFallbackEl.hidden = false;
        });
        careerCrateCanvas.addEventListener('webglcontextrestored', () => initCareerCrateRenderer());
      }
    } catch (error) {
      console.warn('Strikewatch reward renderer unavailable:', error);
      rewardReady = false;
      if (careerCrateRendererFallbackEl) careerCrateRendererFallbackEl.hidden = false;
    }
  }

  function resetCareerCrateRenderer() {
    rewardRendererState.yaw = -0.48;
    rewardRendererState.targetYaw = -0.48;
  }

  function syncCareerCrateCanvasHost() {
    if (!careerCrateCanvas) return null;
    const overlayVisible = Boolean(careerCrateOverlayEl && !careerCrateOverlayEl.hidden);
    const storeHost = !overlayVisible && appState === 'menu' && menuTab === 'store'
      ? menuContentEl?.querySelector('[data-store-crate-host]')
      : null;
    const desiredHost = storeHost || careerCrateCanvasHomeEl;
    if (desiredHost && careerCrateCanvas.parentElement !== desiredHost) desiredHost.prepend(careerCrateCanvas);
    const storeFallback = storeHost?.querySelector('[data-store-crate-fallback]');
    if (storeFallback) storeFallback.hidden = rewardReady;
    return { overlayVisible, storePreview: Boolean(storeHost), host: desiredHost };
  }

  function renderCareerCrate3D(timeSeconds) {
    if (!careerCrateCanvas) return;
    const hostState = syncCareerCrateCanvasHost();
    if (!hostState?.overlayVisible && !hostState?.storePreview) return;
    const phase = hostState.overlayVisible ? (careerCrateState?.phase || 'idle') : 'closed';
    // Build 12.141: once the reward is revealed the awarded weapon is the
    // subject. The crate is no longer drawn behind it — the canvas is hidden by
    // the overlay's `revealed`/`cycling` classes so no stale frame remains.
    if (!['closed', 'opening'].includes(phase)) return;
    if (!rewardReady) {
      if (!rewardGl) initCareerCrateRenderer();
      if (!rewardReady) return;
    }
    resizeCareerCrateRenderer();
    rewardRendererState.yaw += (rewardRendererState.targetYaw - rewardRendererState.yaw) * 0.11;
    if (!rewardRendererState.dragging) {
      // Drive the spin from the wall clock, not from a per-call increment: this
      // function is only invoked while the overlay is up and is throttled with
      // the animation frame, so a fixed step makes the rate frame-dependent.
      rewardRendererState.targetYaw = rewardRendererState.spinBase + timeSeconds * REWARD_CRATE_SPIN_RATE;
    }

    const openingProgress = phase === 'opening' ? clamp(1 - (careerCrateState.timer || 0) / 0.82, 0, 1) : (phase === 'revealed' ? 1 : 0);
    const easedOpen = openingProgress * openingProgress * (3 - 2 * openingProgress);
    const hover = Math.sin(timeSeconds * 1.35) * 0.025;
    const yaw = rewardRendererState.yaw;
    const eye = [4.35, 3.25, 5.2];
    const target = [0, 0.74, 0];
    mat4LookAt(rewardView, eye, target, [0, 1, 0]);

    rewardGl.useProgram(rewardProgram);
    rewardGl.uniformMatrix4fv(rewardLocations.projection, false, rewardProjection);
    rewardGl.uniformMatrix4fv(rewardLocations.view, false, rewardView);
    rewardGl.uniform3fv(rewardLocations.camera, eye);
    rewardGl.uniform1f(rewardLocations.time, timeSeconds);
    rewardGl.clearColor(0, 0, 0, 0);
    rewardGl.clear(rewardGl.COLOR_BUFFER_BIT | rewardGl.DEPTH_BUFFER_BIT);
    rewardBindCube();

    // Pedestal and illuminated inspection deck.
    rewardDrawCube(0, -0.18, 0, 3.75, 0.12, 2.7, [0.055, 0.080, 0.098], yaw, 0, 0, 0.02, 0.58, 1);
    rewardDrawCube(0, -0.10, 0, 2.95, 0.025, 2.05, [0.92, 0.58, 0.12], yaw, 0, 0, 0.72 + easedOpen * 0.48, 0.22, 0.38);
    rewardDrawCube(0, 0.02 + hover, 0, 3.15, 0.14, 2.18, [0.10, 0.14, 0.17], yaw, 0, 0, 0.03, 0.48, 1);

    const bodyY = 0.62 + hover;
    const bodyColour = phase === 'revealed' ? [0.17, 0.29, 0.25] : [0.20, 0.25, 0.28];
    const metal = [0.76, 0.48, 0.12];
    const darkMetal = [0.08, 0.10, 0.12];
    const latchMetal = [0.88, 0.68, 0.25];

    // Main reinforced body.
    rewardDrawCube(0, bodyY, 0, 2.62, 0.92, 1.58, bodyColour, yaw, 0, 0, 0.03, 0.66, 1);
    rewardDrawCubeLocal(0, bodyY, 0, yaw, 0, 0, 0, 0.12, 0.79, 2.42, 0.13, 0.09, darkMetal, 0, 0, 0, 0.02, 0.42, 1);
    rewardDrawCubeLocal(0, bodyY, 0, yaw, 0, 0, -1.30, 0, 0, 0.10, 0.82, 1.44, darkMetal, 0, 0, 0, 0.01, 0.48, 1);
    rewardDrawCubeLocal(0, bodyY, 0, yaw, 0, 0, 1.30, 0, 0, 0.10, 0.82, 1.44, darkMetal, 0, 0, 0, 0.01, 0.48, 1);
    for (const bandX of [-0.86, 0, 0.86]) {
      rewardDrawCubeLocal(0, bodyY, 0, yaw, 0, 0, bandX, 0, 0.805, 0.14, 0.91, 0.10, metal, 0, 0, 0, 0.08, 0.34, 1);
    }
    for (const latchX of [-0.54, 0.54]) {
      rewardDrawCubeLocal(0, bodyY, 0, yaw, 0, 0, latchX, 0.13, 0.88, 0.28, 0.34, 0.13, latchMetal, 0, 0, 0, 0.12, 0.30, 1);
      rewardDrawCubeLocal(0, bodyY, 0, yaw, 0, 0, latchX, 0.13, 0.96, 0.11, 0.17, 0.05, darkMetal, 0, 0, 0, 0.01, 0.74, 1);
    }
    // Side handles and lower bumpers.
    rewardDrawCubeLocal(0, bodyY, 0, yaw, 0, 0, -1.39, 0.02, 0, 0.12, 0.34, 0.62, metal, 0, 0, 0, 0.04, 0.40, 1);
    rewardDrawCubeLocal(0, bodyY, 0, yaw, 0, 0, 1.39, 0.02, 0, 0.12, 0.34, 0.62, metal, 0, 0, 0, 0.04, 0.40, 1);
    rewardDrawCubeLocal(0, bodyY, 0, yaw, 0, 0, -0.96, -0.50, 0, 0.42, 0.12, 1.38, darkMetal, 0, 0, 0, 0, 0.82, 1);
    rewardDrawCubeLocal(0, bodyY, 0, yaw, 0, 0, 0.96, -0.50, 0, 0.42, 0.12, 1.38, darkMetal, 0, 0, 0, 0, 0.82, 1);

    // Lid, hinge hardware and support rails use a true two-stage hierarchy:
    // rotate the body-local pivot with the dragged crate, then pitch the lid around it.
    const lidPose = rewardCrateLidPose(yaw, easedOpen, bodyY);
    const lidPitch = lidPose.pitch;
    const lidX = lidPose.x;
    const lidY = lidPose.y;
    const lidZ = lidPose.z;
    rewardDrawCube(lidX, lidY, lidZ, 2.72, 0.32, 1.66, [0.25, 0.30, 0.32], yaw, lidPitch, 0, 0.04, 0.56, 1);
    for (const bandX of [-0.88, 0, 0.88]) {
      rewardDrawCubeLocal(lidX, lidY, lidZ, yaw, lidPitch, 0, bandX, 0.00, 0.84, 0.15, 0.32, 0.09, metal, 0, 0, 0, 0.10, 0.32, 1);
    }
    rewardDrawCubeLocal(lidX, lidY, lidZ, yaw, lidPitch, 0, -0.70, -0.05, 0.83, 0.22, 0.18, 0.09, latchMetal, 0, 0, 0, 0.08, 0.30, 1);
    rewardDrawCubeLocal(lidX, lidY, lidZ, yaw, lidPitch, 0, 0.70, -0.05, 0.83, 0.22, 0.18, 0.09, latchMetal, 0, 0, 0, 0.08, 0.30, 1);

    // Rear hinge spine mounted to the body.
    rewardDrawCubeLocal(0, bodyY, 0, yaw, 0, 0, 0, 0.48, -0.82, 2.34, 0.10, 0.12, darkMetal, 0, 0, 0, 0.02, 0.52, 1);
    for (const hingeX of [-0.92, 0, 0.92]) {
      rewardDrawCubeLocal(0, bodyY, 0, yaw, 0, 0, hingeX, 0.50, -0.79, 0.18, 0.16, 0.20, latchMetal, 0, 0, 0, 0.06, 0.30, 1);
      rewardDrawCubeLocal(lidX, lidY, lidZ, yaw, lidPitch, 0, hingeX, -0.08, -0.80, 0.18, 0.12, 0.18, latchMetal, 0, 0, 0, 0.06, 0.30, 1);
    }

    // Short support rails visually bridge the body and lid while the lid animates open.
    const railPitch = lidPitch * 0.54;
    for (const railX of [-1.04, 1.04]) {
      const railPose = rewardCrateRailPose(yaw, railPitch, bodyY, railX);
      rewardDrawCube(railPose.x, railPose.y, railPose.z, 0.16, 0.16, 0.72, latchMetal, yaw, railPitch, 0, 0.08, 0.28, 1);
    }

    rewardDrawCubeLocal(0, bodyY, 0, yaw, 0, 0, -0.70, 0.55, -0.80, 0.34, 0.18, 0.18, latchMetal, 0, 0, 0, 0.05, 0.34, 1);
    rewardDrawCubeLocal(0, bodyY, 0, yaw, 0, 0, 0.70, 0.55, -0.80, 0.34, 0.18, 0.18, latchMetal, 0, 0, 0, 0.05, 0.34, 1);

    if (easedOpen > 0.02) {
      const glowAlpha = 0.12 + easedOpen * 0.26;
      rewardDrawCube(0, bodyY + 0.52, 0, 2.18, 0.12 + easedOpen * 0.22, 1.22, [0.96, 0.68, 0.20], yaw, 0, 0, 1.55, 0.16, glowAlpha);
      rewardDrawCube(0, bodyY + 0.68, 0, 1.72, 0.08, 0.94, [0.36, 0.94, 0.72], yaw, 0, 0, 1.35, 0.12, glowAlpha * 0.72);
    }
  }
