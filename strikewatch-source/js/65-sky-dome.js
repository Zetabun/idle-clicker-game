/*
 * Strikewatch source module: 65-sky-dome.js
 * Purpose: Procedural gradient sky for open-air arenas.
 *
 * Dune Bastion has no ceiling, so everything above the ramparts was whatever
 * `gl.clearColor` happened to be — and that was derived from the fog colour,
 * which for the desert theme was [0.25, 0.18, 0.10]. The result was a flat
 * muddy brown where the sky should be.
 *
 * This draws a real gradient before the world: a full-screen triangle whose
 * fragment colour is chosen from the view ray's elevation, so looking up gives
 * deep sky and looking toward the ramparts gives warm horizon haze. It runs
 * with depth writes and depth testing off and touches no world geometry, so it
 * cannot affect collision, navigation or line of sight.
 *
 * Run `python3 build.py` to regenerate js/strikewatch.dev.js and dist/.
 */

  const SKY_THEME_PRESETS = Object.freeze({
    desert: Object.freeze({
      zenith: [0.13, 0.30, 0.58],
      upper: [0.30, 0.50, 0.76],
      horizon: [0.88, 0.78, 0.60],
      ground: [0.40, 0.30, 0.20],
      sun: [1.00, 0.88, 0.66],
      sunDirection: [0.42, 0.26, -0.87],
      sunSharpness: 26.0,
      sunStrength: 0.62,
      hazeLift: 0.30
    })
  });

  let glSkyProgram = null;
  let glSkyBuffer = null;
  let glSkyVao = null;
  const glSkyLocations = {};
  let skyInitFailed = false;

  function skyPresetForArena(arena) {
    return SKY_THEME_PRESETS[arena?.theme] || null;
  }

  function arenaUsesSkyDome(arena = activeArenaMeta()) {
    return Boolean(skyPresetForArena(arena));
  }

  function createSkyProgram() {
    const vertexSource = `
      attribute vec2 aClip;
      varying vec2 vClip;
      void main() {
        vClip = aClip;
        gl_Position = vec4(aClip, 0.999999, 1.0);
      }
    `;
    const fragmentSource = `
      precision mediump float;
      varying vec2 vClip;
      uniform vec3 uForward;
      uniform vec3 uRight;
      uniform vec3 uUp;
      uniform vec2 uSlope;
      uniform vec3 uZenith;
      uniform vec3 uUpper;
      uniform vec3 uHorizon;
      uniform vec3 uGround;
      uniform vec3 uSun;
      uniform vec3 uSunDirection;
      uniform float uSunSharpness;
      uniform float uSunStrength;
      uniform float uHazeLift;
      void main() {
        vec3 dir = normalize(uForward + uRight * (vClip.x * uSlope.x) + uUp * (vClip.y * uSlope.y));
        float elevation = dir.y;

        // Warm haze hugs the horizon, cool sky opens up overhead. Keeping the
        // two bands separate stops the whole dome washing out to one tone.
        float horizonBand = 1.0 - smoothstep(0.0, 0.22, elevation);
        float upperBand = smoothstep(0.10, 0.42, elevation);
        float zenithBand = smoothstep(0.38, 0.92, elevation);

        vec3 colour = mix(uHorizon, uUpper, upperBand);
        colour = mix(colour, uZenith, zenithBand);
        colour = mix(colour, uHorizon, horizonBand * 0.85);

        // Below the horizon the dome reads as distant ground haze rather than
        // sky, so the ramparts do not appear to float.
        float belowHorizon = smoothstep(0.0, -0.16, elevation);
        colour = mix(colour, uGround, belowHorizon);

        // A broad low sun warms one side of the sky and anchors the time of day.
        float sunDot = max(dot(dir, normalize(uSunDirection)), 0.0);
        float sunGlow = pow(sunDot, uSunSharpness) * uSunStrength;
        float sunWash = pow(sunDot, 2.2) * 0.20;
        colour += uSun * (sunGlow + sunWash) * (1.0 - belowHorizon);

        // Gentle banding break-up so the gradient does not show steps on
        // 8-bit displays.
        float dither = fract(sin(dot(vClip, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
        colour += dither * 0.006;

        colour = mix(colour, colour + vec3(0.04, 0.03, 0.02), uHazeLift * horizonBand);
        gl_FragColor = vec4(clamp(colour, 0.0, 1.0), 1.0);
      }
    `;
    const program = gl.createProgram();
    gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || 'Unable to link sky program');
    }
    return program;
  }

  function ensureSkyResources() {
    if (glSkyProgram || skyInitFailed) return Boolean(glSkyProgram);
    try {
      glSkyProgram = createSkyProgram();
      glSkyLocations.clip = gl.getAttribLocation(glSkyProgram, 'aClip');
      for (const name of ['uForward', 'uRight', 'uUp', 'uSlope', 'uZenith', 'uUpper', 'uHorizon', 'uGround', 'uSun', 'uSunDirection', 'uSunSharpness', 'uSunStrength', 'uHazeLift']) {
        glSkyLocations[name] = gl.getUniformLocation(glSkyProgram, name);
      }
      // One oversized triangle covers the viewport with no clipping seam.
      glSkyVao = gl.createVertexArray ? gl.createVertexArray() : null;
      if (glSkyVao) gl.bindVertexArray(glSkyVao);
      glSkyBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, glSkyBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(glSkyLocations.clip);
      gl.vertexAttribPointer(glSkyLocations.clip, 2, gl.FLOAT, false, 0, 0);
      if (glSkyVao) gl.bindVertexArray(null);
      return true;
    } catch (error) {
      // A missing sky must never take the match renderer down with it.
      skyInitFailed = true;
      glSkyProgram = null;
      return false;
    }
  }

  // `eye` and `target` are the same vectors handed to mat4LookAt, so the sky
  // ray always agrees with the camera the world is drawn through.
  function drawArenaSky(eye, target) {
    const preset = skyPresetForArena(activeArenaMeta());
    if (!preset || !gl || !eye || !target) return false;
    if (!ensureSkyResources()) return false;

    let fx = target[0] - eye[0];
    let fy = target[1] - eye[1];
    let fz = target[2] - eye[2];
    const flen = Math.hypot(fx, fy, fz) || 1;
    fx /= flen; fy /= flen; fz /= flen;

    // right = normalize(forward × worldUp) with worldUp = (0, 1, 0), which
    // reduces to (-fz, 0, fx). Taking the cross the other way round mirrors the
    // sky and puts the sun on the wrong side.
    let rx = -fz;
    let ry = 0;
    let rz = fx;
    const rlen = Math.hypot(rx, ry, rz) || 1;
    rx /= rlen; ry /= rlen; rz /= rlen;

    // up = right × forward, giving a true camera up even when pitched.
    const ux = ry * fz - rz * fy;
    const uy = rz * fx - rx * fz;
    const uz = rx * fy - ry * fx;

    const horizontalSlope = 1 / Math.max(0.0001, glProjection[0]);
    const verticalSlope = 1 / Math.max(0.0001, glProjection[5]);

    const previousDepthTest = gl.isEnabled(gl.DEPTH_TEST);
    const previousCull = gl.isEnabled(gl.CULL_FACE);
    gl.useProgram(glSkyProgram);
    if (glSkyVao) gl.bindVertexArray(glSkyVao);
    else {
      gl.bindBuffer(gl.ARRAY_BUFFER, glSkyBuffer);
      gl.enableVertexAttribArray(glSkyLocations.clip);
      gl.vertexAttribPointer(glSkyLocations.clip, 2, gl.FLOAT, false, 0, 0);
    }
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.depthMask(false);

    gl.uniform3f(glSkyLocations.uForward, fx, fy, fz);
    gl.uniform3f(glSkyLocations.uRight, rx, ry, rz);
    gl.uniform3f(glSkyLocations.uUp, ux, uy, uz);
    gl.uniform2f(glSkyLocations.uSlope, horizontalSlope, verticalSlope);
    gl.uniform3fv(glSkyLocations.uZenith, preset.zenith);
    gl.uniform3fv(glSkyLocations.uUpper, preset.upper);
    gl.uniform3fv(glSkyLocations.uHorizon, preset.horizon);
    gl.uniform3fv(glSkyLocations.uGround, preset.ground);
    gl.uniform3fv(glSkyLocations.uSun, preset.sun);
    gl.uniform3fv(glSkyLocations.uSunDirection, preset.sunDirection);
    gl.uniform1f(glSkyLocations.uSunSharpness, preset.sunSharpness);
    gl.uniform1f(glSkyLocations.uSunStrength, preset.sunStrength);
    gl.uniform1f(glSkyLocations.uHazeLift, preset.hazeLift);

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (glSkyVao) gl.bindVertexArray(null);
    gl.depthMask(true);
    if (previousDepthTest) gl.enable(gl.DEPTH_TEST);
    if (previousCull) gl.enable(gl.CULL_FACE);
    gl.useProgram(glProgram);
    return true;
  }

  // Draws the sky and reads it back inside the same task. The canvas has no
  // preserveDrawingBuffer, so sampling after the frame has been presented
  // returns an empty buffer — the draw and the read have to share a turn.
  function skyDomeSampleForTest(direction = [0, 0, -1]) {
    const preset = skyPresetForArena(activeArenaMeta());
    if (!preset) return { ok: false, reason: 'Active arena does not use a sky dome.' };
    if (!gl || !glReady) return { ok: false, reason: 'WebGL renderer is not ready.' };
    const eye = [MAP_W * 0.5, 1.6, MAP_H * 0.5];
    const target = [eye[0] + direction[0], eye[1] + direction[1], eye[2] + direction[2]];
    const drawn = drawArenaSky(eye, target);
    if (!drawn) return { ok: false, reason: 'Sky pass did not run.' };
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    const at = (fx, fy) => {
      const pixel = new Uint8Array(4);
      gl.readPixels(Math.floor(w * fx), Math.floor(h * fy), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      return [pixel[0], pixel[1], pixel[2]];
    };
    // GL reads bottom-up, so a high fy is the top of the screen.
    const top = at(0.5, 0.96);
    const upper = at(0.5, 0.74);
    const middle = at(0.5, 0.52);
    const lower = at(0.5, 0.18);
    const luminance = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    const blueBias = c => c[2] - c[0];
    return {
      ok: true,
      width: w,
      height: h,
      top,
      upper,
      middle,
      lower,
      // A sky must not be uniform, and must be cooler overhead than at the
      // horizon. Both were false when the clear colour was doing this job.
      hasVerticalGradient: Math.abs(luminance(top) - luminance(lower)) > 6,
      coolerOverhead: blueBias(top) > blueBias(lower),
      notFlatBrown: !(Math.abs(luminance(top) - luminance(middle)) < 2 && blueBias(top) < 0)
    };
  }

  function skyDomeForTest() {
    const arena = activeArenaMeta();
    const preset = skyPresetForArena(arena);
    return {
      arenaId: arena?.id || null,
      theme: arena?.theme || null,
      usesSkyDome: Boolean(preset),
      programReady: Boolean(glSkyProgram),
      initFailed: skyInitFailed,
      preset: preset ? { zenith: [...preset.zenith], horizon: [...preset.horizon], ground: [...preset.ground] } : null
    };
  }
