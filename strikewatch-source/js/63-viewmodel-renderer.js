/*
 * Strikewatch source module: 63-viewmodel-renderer.js
 * Purpose: First-person weapons, camera rendering and grid raycasting.
 *
 * This file is a source fragment. Run `python3 build.py` to regenerate
 * js/strikewatch.dev.js and the standalone release in dist/.
 */

  function viewmodelPhaseSmooth(start, end, value) {
    const x = clamp((value - start) / Math.max(0.0001, end - start), 0, 1);
    return x * x * (3 - 2 * x);
  }

  function firstPersonReloadPhases(progress = 0, active = false, emptyMagazine = false) {
    return careerWeaponReloadPhases(progress, active, emptyMagazine);
  }

  function drawFirstPersonWeapon(cam, eye, time) {
    // Render the viewmodel after clearing world depth so nearby walls cannot cut
    // through it. The rig itself still uses depth, allowing its parts to overlap
    // correctly and read as a single articulated object.
    gl.clear(gl.DEPTH_BUFFER_BIT);

    const dt = clamp(lastFrameDt || 1 / 60, 1 / 240, 0.05);
    const presentedAngle = Number.isFinite(cam.renderAimAngle) ? cam.renderAimAngle : cam.angle;
    if (!viewWeaponState.initialised) {
      viewWeaponState.initialised = true;
      viewWeaponState.lastAngle = presentedAngle;
    }
    const angularVelocity = angleDiff(presentedAngle, viewWeaponState.lastAngle) / dt;
    viewWeaponState.lastAngle = presentedAngle;
    const targetTurnSway = clamp(-angularVelocity * 0.0105, -0.075, 0.075);
    viewWeaponState.turnSway = lerp(
      viewWeaponState.turnSway,
      targetTurnSway,
      1 - Math.exp(-dt * 10.5)
    );
    const muzzleNow = clamp(muzzle || 0, 0, 1);
    const weaponPresentation = careerWeaponPresentation(cam.weapon);
    const visualKick = Number(cam.weapon?.recoilVisualKick) || Number(cam.weapon?.recoilKick) || 1;
    const visualRecovery = Number(cam.weapon?.recoilVisualRecovery) || 8;
    if (muzzleNow > 0.72 && viewWeaponState.lastMuzzle <= 0.32) {
      viewWeaponState.recoilImpulse = Math.min(1.75, Math.max(viewWeaponState.recoilImpulse, visualKick));
      const shotSide = ((cam.roundShotsFired || 0) % 2 ? 1 : -1);
      viewWeaponState.recoilRoll += shotSide * (Number(cam.weapon?.recoilRoll) || 0.022);
      viewWeaponState.smokeImpulse = Math.max(viewWeaponState.smokeImpulse, weaponPresentation.muzzleProfile.smokeScale);
    }
    viewWeaponState.lastMuzzle = muzzleNow;
    viewWeaponState.recoilImpulse *= Math.exp(-dt * visualRecovery);
    viewWeaponState.recoilRoll *= Math.exp(-dt * visualRecovery * 1.12);
    viewWeaponState.smokeImpulse *= Math.exp(-dt * 2.65);
    const recoilTarget = Math.max((cam.recoil || 0) * visualKick, viewWeaponState.recoilImpulse);
    const springStrength = 92;
    const springDamping = 15 + visualRecovery * 0.42;
    viewWeaponState.recoilVelocity += (recoilTarget - viewWeaponState.recoilSettle) * springStrength * dt;
    viewWeaponState.recoilVelocity *= Math.exp(-springDamping * dt);
    viewWeaponState.recoilSettle = Math.max(0, viewWeaponState.recoilSettle + viewWeaponState.recoilVelocity * dt);

    const motion = clamp(cam.motion || cam.visualMoveVelocity || cam.moveVelocity || 0, 0, 1);
    const crouch = clamp(cam.crouchBlend || 0, 0, 1);
    const step = cam.walkCycle || 0;
    const strafe = clamp(Number(cam.strafeBlend) || 0, -1, 1);
    const backpedal = clamp(Number(cam.backpedalBlend) || 0, 0, 1);
    const sprint = clamp(Number(cam.runBlend) || 0, 0, 1);
    const hitStrength = clamp(Number(cam.hitReactionStrength) || Number(cam.hitReaction) || 0, 0, 1.25);
    const hitAge = Math.max(0, Number(cam.hitReactionAge) || 0);
    const hitWave = hitStrength * Math.sin(clamp(hitAge / 0.34, 0, 1) * Math.PI);
    const hitSide = (Number(cam.hitDirection) || 1) * hitWave;
    const flinchDuration = Math.max(0.001, Number(cam.flinchDuration) || 0.18);
    const flinchWave = clamp(Number(cam.flinchStrength) || 0, 0, 1) * Math.sin(clamp((Number(cam.flinchAge) || 0) / flinchDuration, 0, 1) * Math.PI);
    const breathe = Math.sin(time * 1.45) * 0.0035 * (1 - sprint * 0.55);
    const targetBob = Math.sin(step * 0.5) * (0.015 + sprint * 0.010) * motion * (1 - crouch * 0.42);
    const targetLift = Math.abs(Math.sin(step)) * (0.013 + sprint * 0.009) * motion * (1 - crouch * 0.50);
    viewWeaponState.locomotionSide = lerp(viewWeaponState.locomotionSide || 0, targetBob + strafe * 0.010, 1 - Math.exp(-dt * 9));
    viewWeaponState.locomotionBob = lerp(viewWeaponState.locomotionBob || 0, targetLift, 1 - Math.exp(-dt * 8));
    const bobX = viewWeaponState.locomotionSide;
    const bobY = viewWeaponState.locomotionBob;
    const shoulderRoll = (Math.sin(step * 0.5) * 0.010 * motion + strafe * 0.012 - backpedal * 0.005) * (1 - crouch * 0.38);
    const recoil = viewWeaponState.recoilSettle;
    const kick = recoil * recoil;
    const yaw = Math.PI / 2 - presentedAngle;
    const reloadProgress = cam.reloadTimer > 0 ? clamp(cam.reloadProgress || 0, 0, 1) : 0;
    const reloadPhases = firstPersonReloadPhases(reloadProgress, cam.reloadTimer > 0, cam.magAmmo <= 0);
    const reloadLower = reloadPhases.lower;
    const reloadRack = reloadPhases.rack;
    const reloadWave = cam.reloadTimer > 0 ? Math.sin(reloadProgress * Math.PI) : 0;
    const swapProgress = cam.weaponSwapTimer > 0 ? 1 - cam.weaponSwapTimer / Math.max(0.001, cam.weaponSwapDuration) : 0;
    const swapWave = cam.weaponSwapTimer > 0 ? Math.sin(clamp(swapProgress, 0, 1) * Math.PI) : 0;

    const profiles = {
      'VX-7':       { length: 1.00, handguard: 1.00, barrel: 0.98, stock: 0.92, optic: 0, mag: 0.92, accent: [0.18, 0.30, 0.36], holdX: 0.00, holdY: 0.00, holdZ: 0.00, pitchBias: 0.000, rollBias: 0.000, foregrip: 0, opticHeight: 1.00 },
      'AR-12':      { length: 1.10, handguard: 1.10, barrel: 1.16, stock: 1.08, optic: 1, mag: 1.04, accent: [0.24, 0.22, 0.17], holdX: 0.010, holdY: 0.008, holdZ: 0.030, pitchBias: 0.012, rollBias: -0.004, foregrip: 2, opticHeight: 1.10 },
      'M8 CARBINE': { length: 0.94, handguard: 0.92, barrel: 0.88, stock: 0.90, optic: 2, mag: 0.94, accent: [0.29, 0.25, 0.18], holdX: -0.006, holdY: -0.010, holdZ: -0.010, pitchBias: -0.008, rollBias: 0.004, foregrip: 1, opticHeight: 1.02 },
      'KILO-9':     { length: 0.82, handguard: 0.78, barrel: 0.66, stock: 0.80, optic: 0, mag: 0.74, accent: [0.16, 0.20, 0.22], holdX: -0.012, holdY: -0.006, holdZ: -0.030, pitchBias: -0.014, rollBias: 0.008, foregrip: 1, opticHeight: 0.94 },
      'P12 SIDEARM':{ length: 0.50, handguard: 0.22, barrel: 0.30, stock: 0.08, optic: 0, mag: 0.52, accent: [0.12, 0.15, 0.17], pistol: true, holdX: 0.028, holdY: 0.018, holdZ: -0.055, pitchBias: -0.010, rollBias: -0.006 },
      'AR-4 RIFLE': { length: 0.96, handguard: 0.94, barrel: 0.92, stock: 0.96, optic: 0, mag: 0.86, accent: [0.09, 0.42, 0.68], sharedCareerModel: true, holdX: -0.010, holdY: -0.010, holdZ: 0.015, pitchBias: 0.004, rollBias: -0.004, foregrip: 1, opticHeight: 1.04 }
    };
    const profile = profiles[cam.weapon?.viewmodel || cam.weapon?.name] || profiles['VX-7'];
    const viewmodelVariant = cam.weapon?.modelClass || cam.weapon?.id || '';
    const variantPose = weaponPresentation.viewmodelPose;

    let pitch = -0.045 + kick * 0.122 + breathe + reloadLower * 0.31 + reloadRack * 0.08 + swapWave * 0.36 + hitWave * 0.105 + flinchWave * 0.045 + (profile.pitchBias || 0) + variantPose.pitch;
    let roll = -0.024 - shoulderRoll + viewWeaponState.turnSway * 0.58 + viewWeaponState.recoilRoll + reloadLower * 0.48 + reloadRack * 0.12 + swapWave * 0.82 + hitSide * 0.16 + flinchWave * (Number(cam.hitDirection) || 1) * 0.08 + (profile.rollBias || 0) + variantPose.roll;

    const forwardX = Math.cos(presentedAngle), forwardZ = Math.sin(presentedAngle);
    const rightX = -forwardZ, rightZ = forwardX;
    const shoulderShift = clamp(Number(cam.shoulderBlend) || 0, -1, 1) * 0.016;
    const baseForward = 0.435 - kick * 0.132 - reloadLower * 0.045 - backpedal * 0.010 + hitWave * 0.028 + (profile.holdZ || 0) + variantPose.z;
    const baseSide = 0.155 + bobX + viewWeaponState.turnSway + reloadLower * 0.060 + shoulderShift - hitSide * 0.022 + (profile.holdX || 0) + variantPose.x;
    const baseX = eye[0] + forwardX * baseForward + rightX * baseSide;
    const baseY = eye[1] - 0.315 - bobY - crouch * 0.018 + kick * 0.070 - reloadLower * 0.175 - swapWave * 0.46 - hitWave * 0.038 + (profile.holdY || 0) + variantPose.y;
    const baseZ = eye[2] + forwardZ * baseForward + rightZ * baseSide;


    const metalBlack = [0.020, 0.026, 0.031];
    const metalMid = [0.115, 0.132, 0.142];
    const metalEdge = [0.245, 0.275, 0.285];
    const polymer = [0.055, 0.068, 0.074];
    const rubber = [0.025, 0.030, 0.033];
    const brass = [0.58, 0.39, 0.12];
    const opticGlass = [0.09, 0.30, 0.31];
    const opticGlassBright = [0.18, 0.52, 0.48];
    const glove = cam.team === TEAM_BLUE ? [0.105, 0.145, 0.165] : [0.155, 0.115, 0.105];
    const sleeve = cam.team === TEAM_BLUE ? [0.095, 0.125, 0.135] : [0.135, 0.105, 0.095];
    const cuff = cam.team === TEAM_BLUE ? [0.070, 0.095, 0.108] : [0.102, 0.082, 0.076];
    const knit = cam.team === TEAM_BLUE ? [0.085, 0.115, 0.132] : [0.122, 0.094, 0.087];
    const teamTape = cam.team === TEAM_BLUE ? [0.16, 0.52, 0.72] : [0.72, 0.24, 0.18];

    // Rotate local weapon points by recoil pitch and procedural roll before
    // translating them into world space. This keeps all attachments rigidly
    // connected during bob, sway and recoil.
    const point = (lx, ly, lz) => {
      const cr = Math.cos(roll), sr = Math.sin(roll);
      const cp = Math.cos(pitch), sp = Math.sin(pitch);
      const rx = lx * cr - ly * sr;
      const ry0 = lx * sr + ly * cr;
      const ry = ry0 * cp - lz * sp;
      const rz = ry0 * sp + lz * cp;
      return worldPoint(baseX, baseY, baseZ, yaw, rx, ry, rz);
    };
    const box = (lx, ly, lz, sx, sy, sz, colour, emissive = 0, surface = 3, roughness = 0.30, extraPitch = 0, extraRoll = 0) => {
      const p = point(lx, ly, lz);
      mat4TRS(glModel, p.x, p.y, p.z, yaw, pitch + extraPitch, roll + extraRoll, sx, sy, sz);
      drawMesh(glMeshes.cube, colour, glModel, emissive, 1, surface, roughness);
      return p;
    };
    const sphere = (lx, ly, lz, sx, sy, sz, colour, emissive = 0, surface = 5, roughness = 0.54) => {
      const p = point(lx, ly, lz);
      mat4TRS(glModel, p.x, p.y, p.z, yaw, pitch, roll, sx, sy, sz);
      drawMesh(glMeshes.sphere, colour, glModel, emissive, 1, surface, roughness);
      return p;
    };
    const segment = (a, b, radius, colour, emissive = 0, surface = 3, roughness = 0.25, depthRadius = radius) => {
      drawSegment(point(...a), point(...b), radius, colour, emissive, 1, surface, roughness, depthRadius);
    };

    const sharedCareerLongGun = Boolean(profile.sharedCareerModel && careerWeaponUsesSharedLongGunModel(cam.weapon));
    if (profile.pistol || sharedCareerLongGun) {
      const pistolModel = viewmodelVariant || 'service-p12';
      const visualWeapon = cam.weapon || getCareerWeapon(pistolModel);
      const parts = careerWeaponVisualParts(visualWeapon);
      const bounds = careerWeaponVisualBounds(visualWeapon);
      const gripPart = careerWeaponGripPart(visualWeapon);
      const ejectionPart = careerWeaponVisualPart(visualWeapon, 'ejection-port');
      const compact = pistolModel === 'viper-9';
      const worn = pistolModel === 'scrap-p12';
      const emptySlideLock = -0.032 * reloadPhases.slideLock;
      const slideKick = (muzzle > 0 ? -0.024 * clamp(muzzle, 0, 1) : 0) + emptySlideLock - reloadRack * 0.050;
      const DEG = Math.PI / 180;
      const renderScale = careerWeaponRenderScaleProfile(visualWeapon, 'viewmodel');
      const {
        sharedLongGun: longGun,
        lengthScale,
        depthScale,
        verticalPositionScale,
        verticalSizeScale,
        forwardOffset
      } = renderScale;

      const partLocal = part => ({
        x: part.z * depthScale,
        y: -part.y * verticalPositionScale,
        z: part.x * lengthScale + forwardOffset
      });

      for (const part of parts) {
        const fit = careerWeaponPartFitOffset(part, 'viewmodel');
        const local = partLocal({
          ...part,
          x: part.x + fit.x,
          y: part.y + fit.y,
          z: part.z + fit.z
        });
        let localX = local.x;
        let localY = local.y;
        let localZ = local.z;
        let extraYaw = (Number(part.ry) || 0) * DEG;
        let extraPitch = (Number(part.rz) || 0) * DEG;
        let extraRoll = -(Number(part.rx) || 0) * DEG;
        if (careerWeaponPartMovesWithSlide(part)) localZ += slideKick;
        if (careerWeaponPartMovesWithMagazine(part) && cam.reloadTimer > 0) {
          if (reloadProgress < 0.47) {
            const release = reloadPhases.magazineRelease;
            localX -= release * 0.14;
            localY -= release * 0.44;
            localZ -= release * 0.055;
            extraRoll += release * 0.48;
          } else {
            const insert = reloadPhases.magazineInsert;
            localX -= (1 - insert) * 0.18;
            localY -= (1 - insert) * 0.50;
            localZ -= (1 - insert) * 0.070;
            extraRoll += (1 - insert) * 0.34;
          }
        }
        const style = careerWeaponMaterialStyle(part.material, visualWeapon.skinId);
        const p = point(localX, localY, localZ);
        const proceduralShape = String(part.shape || 'box');
        const cylindrical = proceduralShape === 'cylinder-length';
        const mesh = cylindrical
          ? (glMeshes.cylinder || glMeshes.cube)
          : proceduralShape === 'rounded'
            ? (glMeshes.roundedBox || glMeshes.cube)
            : glMeshes.cube;
        mat4TRS(
          glModel,
          p.x, p.y, p.z,
          yaw + extraYaw,
          pitch + extraPitch + (cylindrical ? Math.PI * 0.5 : 0),
          roll + extraRoll,
          Math.max(0.004, part.d * depthScale),
          Math.max(0.004, cylindrical ? part.w * lengthScale : part.h * verticalSizeScale),
          Math.max(0.004, cylindrical ? part.h * verticalSizeScale : part.w * lengthScale)
        );
        drawMesh(
          mesh,
          style.colour,
          glModel,
          style.emissive,
          1,
          style.surface,
          worn && part.className === 'slide' ? Math.max(style.roughness, 0.36) : style.roughness
        );
      }

      // Arms and hands are anchored to the shared grip geometry, so changing a
      // grip in the visual profile moves the held pose in every renderer.
      const gripFit = gripPart ? careerWeaponPartFitOffset(gripPart, 'viewmodel') : { x: 0, y: 0, z: 0 };
      const gripLocal = gripPart ? partLocal({ ...gripPart, x: gripPart.x + gripFit.x, y: gripPart.y + gripFit.y, z: gripPart.z + gripFit.z }) : { x: 0, y: -0.13, z: 0.07 };
      const supportPart = longGun ? careerWeaponSupportPart(visualWeapon) : null;
      const supportFit = supportPart ? careerWeaponPartFitOffset(supportPart, 'viewmodel') : { x: 0, y: 0, z: 0 };
      const supportLocal = supportPart ? partLocal({ ...supportPart, x: supportPart.x + supportFit.x, y: supportPart.y + supportFit.y, z: supportPart.z + supportFit.z }) : null;
      let supportX = supportLocal ? supportLocal.x - 0.015 : -0.050;
      let supportY = supportLocal ? supportLocal.y + 0.020 : gripLocal.y + 0.020;
      let supportZ = supportLocal ? supportLocal.z - 0.010 : gripLocal.z + (compact ? 0.045 : 0.055);
      if (cam.reloadTimer > 0) {
        const magazineTravel = reloadPhases.magazineTravel;
        supportX -= magazineTravel * 0.15;
        supportY -= magazineTravel * 0.34;
        supportZ -= magazineTravel * 0.035;
        const rackHand = reloadPhases.rackHand;
        supportX = lerp(supportX, -0.045, rackHand);
        supportY = lerp(supportY, 0.115, rackHand);
        supportZ = lerp(supportZ, 0.105, rackHand);
      }
      const rightElbow = point(longGun ? 0.255 : 0.228, longGun ? -0.390 : -0.432, longGun ? -0.090 : -0.145);
      const rightWrist = point(longGun ? 0.045 : 0.058, gripLocal.y - 0.018, gripLocal.z - 0.008);
      const leftElbow = point(longGun ? -0.255 : -0.226, longGun ? -0.360 : -0.408, longGun ? 0.065 : 0.012);
      const leftWrist = point(supportX, supportY, supportZ);
      drawSegment(rightElbow, rightWrist, 0.088, sleeve, 0, 1, 5, 0.90, 0.078);
      drawSegment(leftElbow, leftWrist, 0.090, sleeve, 0, 1, 5, 0.90, 0.080);
      sphere(0.222, -0.426, -0.140, 0.075, 0.080, 0.080, cuff, 0, 5, 0.84);
      sphere(-0.221, -0.402, 0.010, 0.075, 0.080, 0.080, cuff, 0, 5, 0.84);
      sphere(0.054, gripLocal.y - 0.005, gripLocal.z - 0.004, 0.091, 0.105, 0.105, glove, 0, 6, 0.82);
      sphere(supportX + 0.003, supportY + 0.010, supportZ, 0.094, 0.096, 0.112, glove, 0, 6, 0.82);
      box(0.034, gripLocal.y - 0.003, gripLocal.z + 0.004, 0.040, 0.032, 0.102, knit, 0, 6, 0.72, 0.08, -0.06);
      box(supportX + 0.020, supportY + 0.006, supportZ + 0.014, 0.048, 0.030, longGun ? 0.110 : (compact ? 0.082 : 0.092), knit, 0, 6, 0.72, -0.14, 0.10);
      box(0.072, gripLocal.y + 0.038, gripLocal.z + 0.040, 0.022, 0.020, 0.042, polymer, 0, 6, 0.64, 0.10);

      if (muzzle > 0.58) {
        const ejectionFit = ejectionPart ? careerWeaponPartFitOffset(ejectionPart, 'viewmodel') : { x: 0, y: 0, z: 0 };
        const ejectLocal = ejectionPart ? partLocal({ ...ejectionPart, x: ejectionPart.x + ejectionFit.x, y: ejectionPart.y + ejectionFit.y, z: ejectionPart.z + ejectionFit.z }) : { x: 0.10, y: 0.09, z: 0.16 };
        const eject = point(
          ejectLocal.x + 0.035 + (1 - muzzle) * 0.06,
          ejectLocal.y + 0.020 + (1 - muzzle) * 0.06,
          ejectLocal.z + slideKick - (1 - muzzle) * 0.02
        );
        const caseScale = weaponPresentation.muzzleProfile.caseScale;
        mat4TRS(glModel, eject.x, eject.y, eject.z, yaw - 0.48, pitch + 0.30, roll + 0.76, 0.010 * caseScale, 0.010 * caseScale, 0.030 * caseScale);
        drawMesh(glMeshes.cylinder, brass, glModel, 0.15, 1, 3, 0.18);
      }
      if (muzzle > 0) {
        const flashZ = bounds.maxX * lengthScale + forwardOffset + 0.040;
        const flash = point(0, 0.034, flashZ);
        setBlendMode(true);
        const pulse = clamp(muzzle, 0, 1);
        const flashScale = weaponPresentation.muzzleProfile.flashScale;
        mat4TRS(glModel, flash.x, flash.y, flash.z, yaw, pitch, roll, (0.075 + pulse * 0.04) * flashScale, (0.075 + pulse * 0.04) * flashScale, (0.13 + pulse * 0.09) * flashScale);
        drawMesh(glMeshes.sphere, [1.0, 0.62, 0.10], glModel, 3.0, pulse * 0.90, 4, 0.06);
        const flareA = point(0.055, 0.034, flashZ - 0.020);
        const flareB = point(-0.055, 0.034, flashZ - 0.020);
        drawSegment(flareA, flareB, 0.016 + pulse * 0.012, [1.0, 0.82, 0.28], 2.6, pulse * 0.70, 4, 0.06, 0.012);
        setBlendMode(false);
      }
      if (viewWeaponState.smokeImpulse > 0.035) {
        const smoke = clamp(viewWeaponState.smokeImpulse, 0, 1.45);
        const flashZ = bounds.maxX * lengthScale + forwardOffset + 0.055;
        setBlendMode(true);
        for (let index = 0; index < 3; index++) {
          const drift = index * 0.050 + (1 - smoke / 1.45) * 0.045;
          const cloud = point((index - 1) * 0.018, 0.055 + drift * 0.35, flashZ + drift);
          mat4TRS(glModel, cloud.x, cloud.y, cloud.z, yaw, pitch, roll, 0.040 + drift * 0.34, 0.034 + drift * 0.28, 0.050 + drift * 0.38);
          drawMesh(glMeshes.sphere, [0.48, 0.53, 0.55], glModel, 0.02, clamp(smoke * (0.14 - index * 0.025), 0, 0.18), 5, 0.92);
        }
        setBlendMode(false);
      }
      return;
    }

    const receiverLength = 0.355 * profile.length;
    const handguardLength = 0.285 * profile.handguard;
    const barrelLength = 0.255 * profile.barrel;
    const stockLength = 0.205 * profile.stock;
    const receiverCentre = 0.015;
    const handguardCentre = receiverCentre + receiverLength * 0.5 + handguardLength * 0.5 - 0.018;
    const handguardEnd = handguardCentre + handguardLength * 0.5;
    const muzzleZ = handguardEnd + barrelLength;

    // Stock and buffer assembly.
    box(0.005, 0.008, -receiverLength * 0.5 - stockLength * 0.48, 0.092, 0.095, stockLength, polymer, 0, 6, 0.62, -0.01);
    box(0.005, 0.055, -receiverLength * 0.5 - stockLength * 0.49, 0.078, 0.040, stockLength * 0.73, profile.accent, 0, 6, 0.52);
    box(0.005, -0.002, -receiverLength * 0.5 - stockLength * 0.97, 0.108, 0.132, 0.052, rubber, 0, 6, 0.86);
    segment([0.005, 0.018, -receiverLength * 0.53], [0.005, 0.018, -receiverLength * 0.60 - stockLength * 0.58], 0.022, metalMid, 0, 3, 0.22);

    // Upper and lower receiver with bevel-like layered silhouette.
    box(0, 0.018, receiverCentre, 0.118, 0.092, receiverLength, metalBlack, 0, 3, 0.20);
    box(0, 0.074, receiverCentre + 0.008, 0.105, 0.037, receiverLength * 0.93, metalMid, 0, 3, 0.18);
    box(0, -0.050, receiverCentre - 0.015, 0.102, 0.055, receiverLength * 0.72, polymer, 0, 6, 0.60, 0.015);
    box(0.061, 0.025, receiverCentre + 0.015, 0.010, 0.046, receiverLength * 0.42, metalEdge, 0, 3, 0.16);
    box(0.064, 0.032, receiverCentre + 0.055, 0.009, 0.030, receiverLength * 0.25, [0.055, 0.060, 0.062], 0, 3, 0.12);
    box(-0.054, 0.030, receiverCentre - 0.055, 0.012, 0.020, 0.082, profile.accent, 0, 6, 0.50);

    // Charging handle and bolt movement during the firing impulse.
    const boltTravel = muzzle > 0 ? -0.035 * clamp(muzzle, 0, 1) : 0;
    box(0.004, 0.098, receiverCentre - receiverLength * 0.28 + boltTravel, 0.055, 0.018, 0.055, metalEdge, 0, 3, 0.14);
    box(0.053, 0.045, receiverCentre + 0.072 + boltTravel, 0.010, 0.031, 0.085, [0.19, 0.20, 0.20], 0, 3, 0.10);
    box(0.034, 0.030, receiverCentre + 0.062, 0.036, 0.026, 0.092, metalMid, 0, 3, 0.16);
    box(0.044, 0.030, receiverCentre + 0.062, 0.006, 0.030, 0.054, metalBlack, 0, 3, 0.14);
    box(0.050, -0.015, receiverCentre - 0.055, 0.010, 0.040, 0.026, metalEdge, 0, 3, 0.10, 0.10);
    box(-0.046, -0.006, receiverCentre - 0.060, 0.010, 0.030, 0.052, profile.accent, 0, 6, 0.48, 0.12);

    // Pistol grip, trigger housing and curved two-piece magazine.
    box(0.010, -0.135, receiverCentre - 0.090, 0.075, 0.165, 0.082, polymer, 0, 6, 0.74, -0.28);
    box(0.006, -0.077, receiverCentre - 0.050, 0.070, 0.032, 0.095, metalBlack, 0, 3, 0.22);
    segment([0.000, -0.092, receiverCentre - 0.060], [0.000, -0.045, receiverCentre - 0.018], 0.011, metalMid, 0, 3, 0.14, 0.011);
    box(0.004 - reloadWave * 0.09, -0.168 - reloadWave * 0.22, receiverCentre + 0.020, 0.078, 0.185 * profile.mag, 0.112, metalBlack, 0, 3, 0.28, -0.18, reloadWave * 0.28);
    box(0.004 - reloadWave * 0.09, -0.273 * profile.mag - reloadWave * 0.22, receiverCentre + 0.055, 0.074, 0.105 * profile.mag, 0.105, [0.035, 0.042, 0.046], 0, 3, 0.34, -0.31, reloadWave * 0.28);
    box(0.004 - reloadWave * 0.09, -0.330 * profile.mag - reloadWave * 0.22, receiverCentre + 0.080, 0.081, 0.030, 0.108, rubber, 0, 6, 0.80, -0.31, reloadWave * 0.28);

    // Ventilated handguard with top/bottom rails and side slots.
    box(0, 0.020, handguardCentre, 0.096, 0.080, handguardLength, profile.accent, 0, 6, 0.45);
    box(0, 0.081, handguardCentre, 0.087, 0.019, handguardLength * 1.03, metalMid, 0, 3, 0.18);
    box(0, -0.041, handguardCentre, 0.075, 0.016, handguardLength * 0.92, metalBlack, 0, 3, 0.22);
    for (const side of [-1, 1]) {
      for (let i = -2; i <= 2; i++) {
        box(side * 0.054, 0.020, handguardCentre + i * handguardLength * 0.16, 0.008, 0.025, handguardLength * 0.085, metalBlack, 0, 3, 0.14);
      }
    }
    for (let i = -2; i <= 2; i++) {
      box(0, 0.098, handguardCentre + i * handguardLength * 0.18, 0.092, 0.010, handguardLength * 0.075, metalEdge, 0, 3, 0.12);
    }
    if (profile.foregrip === 1) {
      box(0.000, -0.090, handguardCentre + handguardLength * 0.12, 0.060, 0.110, 0.050, polymer, 0, 6, 0.72, -0.18);
      box(0.000, -0.132, handguardCentre + handguardLength * 0.12, 0.046, 0.020, 0.040, rubber, 0, 6, 0.86);
    } else if (profile.foregrip === 2) {
      box(0.000, -0.070, handguardCentre + handguardLength * 0.18, 0.082, 0.032, 0.090, polymer, 0, 6, 0.70, -0.06);
      box(0.000, -0.102, handguardCentre + handguardLength * 0.20, 0.040, 0.045, 0.040, rubber, 0, 6, 0.84);
    }

    // Barrel, gas block, front sight and muzzle brake.
    segment([0, 0.018, handguardEnd - 0.035], [0, 0.018, muzzleZ], 0.020, metalEdge, 0, 3, 0.16);
    box(0, 0.020, handguardEnd + 0.032, 0.055, 0.065, 0.060, metalBlack, 0, 3, 0.18);
    box(0, 0.084, handguardEnd + 0.040, 0.020, 0.085, 0.030, metalMid, 0, 3, 0.16);
    segment([0, 0.018, muzzleZ - 0.040], [0, 0.018, muzzleZ + 0.045], 0.031, metalBlack, 0, 3, 0.14, 0.026);
    box(0.034, 0.018, muzzleZ + 0.018, 0.012, 0.018, 0.025, metalEdge, 0, 3, 0.10);
    box(-0.034, 0.018, muzzleZ + 0.018, 0.012, 0.018, 0.025, metalEdge, 0, 3, 0.10);

    // Optic assembly varies slightly by weapon family.
    const opticZ = receiverCentre + 0.045;
    const opticMountY = 0.114 * (profile.opticHeight || 1);
    box(0, opticMountY, opticZ, 0.060, 0.025, 0.115, metalBlack, 0, 3, 0.18);
    if (profile.optic === 1) {
      segment([0, 0.170 * profile.opticHeight, opticZ - 0.060], [0, 0.170 * profile.opticHeight, opticZ + 0.085], 0.044, metalBlack, 0, 3, 0.16, 0.038);
      sphere(0, 0.170 * profile.opticHeight, opticZ + 0.093, 0.040, 0.040, 0.018, opticGlass, 0.25, 4, 0.08);
      sphere(0, 0.170 * profile.opticHeight, opticZ - 0.071, 0.038, 0.038, 0.014, opticGlassBright, 0.16, 4, 0.08);
      box(0.052, 0.171 * profile.opticHeight, opticZ - 0.025, 0.014, 0.042, 0.042, metalMid, 0, 3, 0.18);
      box(-0.052, 0.171 * profile.opticHeight, opticZ + 0.010, 0.014, 0.028, 0.028, metalMid, 0, 3, 0.18);
      box(0, 0.214 * profile.opticHeight, opticZ - 0.006, 0.018, 0.018, 0.024, metalMid, 0, 3, 0.16);
    } else {
      const bodyW = profile.optic === 2 ? 0.050 : 0.044;
      const bodyH = profile.optic === 2 ? 0.062 : 0.054;
      const bodyL = profile.optic === 2 ? 0.125 : 0.090;
      const bodyY = 0.165 * profile.opticHeight;
      box(0, bodyY, opticZ, bodyW, bodyH, bodyL, metalBlack, 0, 3, 0.16);
      sphere(0, bodyY, opticZ + (profile.optic === 2 ? 0.068 : 0.050), 0.038, 0.038, 0.018, opticGlass, 0.32, 4, 0.07);
      sphere(0, bodyY, opticZ - (profile.optic === 2 ? 0.072 : 0.050), 0.034, 0.034, 0.014, opticGlassBright, 0.16, 4, 0.07);
      box(0, (0.204 * profile.opticHeight), opticZ - 0.010, 0.012, 0.018, 0.028, [0.34, 0.12, 0.08], 0.18, 4, 0.15);
      box(0.034, bodyY, opticZ, 0.010, 0.036, 0.036, metalMid, 0, 3, 0.16);
    }

    // Side-mounted tactical light and understated team tape.
    box(0.074, -0.004, handguardCentre + handguardLength * 0.12, 0.032, 0.038, 0.125, metalBlack, 0, 3, 0.16);
    box(0.074, -0.018, handguardCentre + handguardLength * 0.08, 0.026, 0.010, 0.060, metalMid, 0, 3, 0.16);
    sphere(0.074, -0.004, handguardCentre + handguardLength * 0.19, 0.028, 0.028, 0.015, [0.70, 0.78, 0.72], 0.22, 4, 0.08);
    box(-0.056, 0.021, receiverCentre - 0.020, 0.011, 0.058, 0.085, teamTape, 0.05, 6, 0.52, 0, 0.08);
    box(-0.070, 0.010, receiverCentre - 0.118, 0.006, 0.040, 0.034, metalEdge, 0, 3, 0.12);

    // Articulated forearms and gloves. Their origins sit below the frame so the
    // hands look connected to the operator rather than floating beside the gun.
    const rightElbow = point(0.220, -0.430, -0.130);
    const rightWrist = point(0.078, -0.158, receiverCentre - 0.075);
    const leftElbow = point(-0.270, -0.400, 0.040);
    const leftWrist = point(-0.066 - reloadWave * 0.10, -0.055 - reloadWave * 0.22, handguardCentre + handguardLength * 0.06 - reloadWave * 0.24);
    drawSegment(rightElbow, rightWrist, 0.088, sleeve, 0, 1, 5, 0.90, 0.078);
    drawSegment(leftElbow, leftWrist, 0.090, sleeve, 0, 1, 5, 0.90, 0.080);
    sphere(0.220, -0.425, -0.128, 0.074, 0.078, 0.078, cuff, 0, 5, 0.84);
    sphere(-0.268, -0.395, 0.036, 0.074, 0.078, 0.078, cuff, 0, 5, 0.84);
    sphere(0.073, -0.142, receiverCentre - 0.078, 0.091, 0.105, 0.105, glove, 0, 6, 0.82);
    sphere(-0.063 - reloadWave * 0.10, -0.048 - reloadWave * 0.22, handguardCentre + handguardLength * 0.07 - reloadWave * 0.24, 0.094, 0.096, 0.112, glove, 0, 6, 0.82);
    box(0.108, -0.132, receiverCentre - 0.082, 0.040, 0.030, 0.095, knit, 0, 6, 0.74, 0.08, -0.08);
    box(0.078, -0.148, receiverCentre - 0.032, 0.028, 0.022, 0.045, polymer, 0, 6, 0.68, 0.12);
    box(-0.078 - reloadWave * 0.03, -0.025 - reloadWave * 0.04, handguardCentre + handguardLength * 0.12 - reloadWave * 0.20, 0.094, 0.036, 0.110, knit, 0, 6, 0.74, -0.10, 0.12);
    box(-0.060, -0.020, handguardCentre + handguardLength * 0.105, 0.086, 0.040, 0.105, rubber, 0, 6, 0.82, -0.08);
    box(-0.096, -0.066, handguardCentre + handguardLength * 0.12, 0.030, 0.080, 0.040, cuff, 0, 6, 0.78);

    // A small ejected case appears only during the strongest part of the firing
    // impulse. It is deliberately subtle to avoid creating a distracting flash.
    if (muzzle > 0.58) {
      const eject = point(0.105 + (1 - muzzle) * 0.08, 0.050 + (1 - muzzle) * 0.06, receiverCentre + 0.055 - (1 - muzzle) * 0.03);
      mat4TRS(glModel, eject.x, eject.y, eject.z, yaw - 0.5, pitch + 0.35, roll + 0.8, 0.010, 0.010, 0.036);
      drawMesh(glMeshes.cylinder, brass, glModel, 0.15, 1, 3, 0.18);
    }

    if (muzzle > 0) {
      const flash = point(0, 0.018, muzzleZ + 0.080);
      setBlendMode(true);
      const pulse = clamp(muzzle, 0, 1);
      mat4TRS(glModel, flash.x, flash.y, flash.z, yaw, pitch, roll, 0.085 + pulse * 0.045, 0.085 + pulse * 0.045, 0.175 + pulse * 0.12);
      drawMesh(glMeshes.sphere, [1.0, 0.62, 0.10], glModel, 3.2, pulse * 0.92, 4, 0.06);
      const sideFlashA = point(0.075, 0.018, muzzleZ + 0.065);
      const sideFlashB = point(-0.075, 0.018, muzzleZ + 0.065);
      const upFlashA = point(0.000, 0.095, muzzleZ + 0.065);
      const upFlashB = point(0.000, -0.060, muzzleZ + 0.065);
      drawSegment(sideFlashA, sideFlashB, 0.024 + pulse * 0.018, [1.0, 0.82, 0.28], 2.8, pulse * 0.72, 4, 0.06, 0.016);
      drawSegment(upFlashA, upFlashB, 0.016 + pulse * 0.012, [1.0, 0.72, 0.18], 2.2, pulse * 0.62, 4, 0.06, 0.012);
      setBlendMode(false);
    }
  }

  function renderWebGL(cam) {
    if (!glReady || !cam) return;
    beginRendererFrameStats();
    const inMenu = appState === 'menu';
    const inFreeRoam = appState === 'free-roam';
    const time = performance.now() / 1000;
    const zone = levelZoneAt(cam.x, cam.y);
    const motion = cam.alive ? clamp(cam.motion || cam.visualMoveVelocity || cam.moveVelocity || 0, 0, 1) : 0;
    const cameraAngle = Number.isFinite(cam.renderAimAngle) ? cam.renderAimAngle : cam.angle;
    const forwardX = Math.cos(cameraAngle), forwardZ = Math.sin(cameraAngle);
    const rightX = -forwardZ, rightZ = forwardX;
    const cameraCrouch = clamp(cam.crouchBlend || 0, 0, 1);
    const cameraRun = clamp(cam.runBlend || 0, 0, 1);
    const bobY = (Math.abs(Math.sin(cam.walkCycle)) - 0.35) * (0.030 + cameraRun * 0.010) * motion * (1 - cameraCrouch * 0.46);
    const bobSide = (Math.sin(cam.walkCycle * 0.5) * 0.010 * motion + (Number(cam.strafeBlend) || 0) * 0.006) * (1 - cameraCrouch * 0.38);
    const shakeSide = (Math.random() - 0.5) * shake * 0.04;
    const shakeHeight = (Math.random() - 0.5) * shake * 0.035;
    const cameraElevation = arenaElevationAt(cam.x, cam.y);
    const eye = [
      cam.x + rightX * (bobSide + shakeSide),
      cameraElevation + GL_EYE_HEIGHT - cameraCrouch * 0.43 + bobY + shakeHeight - clamp(Number(cam.hitReactionVertical) || 0, 0, 1) * 0.018,
      cam.y + rightZ * (bobSide + shakeSide)
    ];
    const cameraKick = Number(cam.weapon?.recoilVisualKick) || Number(cam.weapon?.recoilKick) || 1;
    const cameraHit = clamp(Number(cam.hitReactionStrength) || Number(cam.hitReaction) || 0, 0, 1.2);
    const cameraHitWave = cameraHit * Math.sin(clamp((Number(cam.hitReactionAge) || 0) / 0.34, 0, 1) * Math.PI);
    const pitch = -cam.recoil * 0.052 * cameraKick - cameraHitWave * 0.028 + (Math.random() - 0.5) * shake * 0.025;
    const freeLookPitch = inFreeRoam ? clamp(Number(cam.lookPitch) || 0, -0.78, 0.78) : 0;
    const target = [eye[0] + forwardX, eye[1] + pitch + Math.tan(freeLookPitch), eye[2] + forwardZ];
    mat4LookAt(glView, eye, target, [0, 1, 0]);

    const arenaTheme = activeArenaMeta().theme;
    // Build 12.143: the desert fog was a muddy brown that doubled as the sky.
    // The sky is now drawn properly below, so the fog can be the warm haze that
    // distant sandstone should actually fade into, matched to the sky horizon.
    const baseFog = arenaTheme === 'desert' ? [0.72, 0.62, 0.47] : [0.028, 0.044, 0.056];
    const zoneFog = zone ? [
      clamp(baseFog[0] * 0.72 + zone.colour[0] * 0.16 + zone.light[0] * 0.035, 0, 1),
      clamp(baseFog[1] * 0.72 + zone.colour[1] * 0.16 + zone.light[1] * 0.035, 0, 1),
      clamp(baseFog[2] * 0.72 + zone.colour[2] * 0.16 + zone.light[2] * 0.035, 0, 1)
    ] : baseFog;

    gl.useProgram(glProgram);
    gl.uniformMatrix4fv(glLocations.projection, false, glProjection);
    gl.uniformMatrix4fv(glLocations.view, false, glView);
    gl.uniform3fv(glLocations.cameraPosition, eye);
    gl.uniform3fv(glLocations.fogColour, zoneFog);
    if (glLocations.time) gl.uniform1f(glLocations.time, time);
    gl.clearColor(zoneFog[0] * 0.86, zoneFog[1] * 0.90, zoneFog[2] * 0.94, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // Open-air arenas replace the flat clear colour with a gradient sky. It is
    // drawn before any world geometry, with depth writes off, so it cannot
    // occlude the arena or affect collision, navigation or line of sight.
    if (typeof drawArenaSky === 'function') drawArenaSky(eye, target);
    setBlendMode(false);

    // Build 12.154: batching is no longer restricted to citadel. Every
    // time-dependent draw in `drawStaticWorld` is now wrapped in
    // `setStaticWorldBatchEligibility(false)` — the Dune lamp glow, banner
    // cloth and torch flame, and the coolant tank pulse were the four that were
    // not — so no animated decor can be baked into a batch and frozen.
    // `resetStaticWorldGpuBatches()` runs from `buildWorldBatches()`, so an
    // arena change discards the previous arena's batches before this rebuilds.
    if (STATIC_WORLD_BATCHING_ENABLED && !staticWorldGpuBatchesReady) {
      beginStaticWorldBatchCapture();
      staticWorldRenderActive = true;
      try {
        drawStaticWorld(time);
      } finally {
        staticWorldRenderActive = false;
      }
      finishStaticWorldBatchCapture();
      setBlendMode(false);
    }
    drawStaticWorldGpuBatches();
    staticWorldBatchMode = staticWorldGpuBatchesReady ? 'replay' : 'none';
    staticWorldRenderActive = true;
    try {
      drawStaticWorld(time);
    } finally {
      staticWorldRenderActive = false;
    }
    if (!inFreeRoam) {
      for (const bot of bots) {
        setRenderElevationOffset(arenaElevationAt(bot.x, bot.y));
        drawSoldier(bot, cam);
        setRenderElevationOffset(0);
      }
      if (!inMenu && !uiButtonsHidden) {
        for (const bot of bots) {
          setRenderElevationOffset(arenaElevationAt(bot.x, bot.y));
          drawHealthBar(bot, cam);
          setRenderElevationOffset(0);
        }
      }
    }

    // Surface marks are drawn after the world so they sit on the surface they
    // hit, and outside the static pass so batching can never bake them. Opaque,
    // so they need no blend state of their own.
    if (typeof drawImpactDecals === 'function') drawImpactDecals();
    if (typeof drawBloodDecals === 'function') drawBloodDecals();

    if (tracers.length) {
      setBlendMode(true);
      for (const tracer of tracers) drawTracer(tracer);
      setBlendMode(false);
    }

    // The viewmodel still takes model-space detail, but mode 2 keeps the
    // third-person silhouette lift off the weapon held in front of the camera.
    if (!inMenu && !inFreeRoam && cam.alive && !matchEnding) {
      withLocalSurfaceDetail(
        () => drawFirstPersonWeapon(cam, eye, time),
        OPERATOR_SILHOUETTE_LIGHTING.viewmodelMode
      );
    }
    if (gl.bindVertexArray) gl.bindVertexArray(null);
    finishRendererFrameStats();

    const damageOpacity = inMenu || inFreeRoam ? 0 : clamp((cam.hurt || 0) * 0.42 + shake * 0.16, 0, 0.58);
    damageOverlayEl.style.opacity = damageOpacity.toFixed(3);
    deathOverlayEl.classList.toggle('show', !inMenu && !inFreeRoam && !cam.alive && !roundEnding);
    crosshairEl.classList.toggle('hidden', inMenu || (!inFreeRoam && (!cam.alive || roundEnding || matchEnding)));
    const crosshairKick = clamp((cam.recoil || 0) * (Number(cam.weapon?.recoilVisualKick) || 1), 0, 1.8);
    crosshairEl.style.setProperty('--crosshair-gap', `${7 + crosshairKick * 9}px`);
    crosshairEl.classList.toggle('hit', hitPulse > 0.05);
    crosshairEl.style.setProperty('--hit-alpha', clamp(hitPulse, 0, 1).toFixed(3));
    document.body.dataset.frame = 'rendered';
  }


  function castRay(px, py, angle) {
    const rayDirX = Math.cos(angle);
    const rayDirY = Math.sin(angle);
    let mapX = Math.floor(px);
    let mapY = Math.floor(py);
    const deltaDistX = Math.abs(1 / (rayDirX || 1e-6));
    const deltaDistY = Math.abs(1 / (rayDirY || 1e-6));
    let sideDistX, sideDistY, stepX, stepY;

    if (rayDirX < 0) {
      stepX = -1;
      sideDistX = (px - mapX) * deltaDistX;
    } else {
      stepX = 1;
      sideDistX = (mapX + 1 - px) * deltaDistX;
    }
    if (rayDirY < 0) {
      stepY = -1;
      sideDistY = (py - mapY) * deltaDistY;
    } else {
      stepY = 1;
      sideDistY = (mapY + 1 - py) * deltaDistY;
    }

    let side = 0;
    let hit = false;
    while (!hit) {
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 0;
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 1;
      }
      if (mapX < 0 || mapY < 0 || mapX >= MAP_W || mapY >= MAP_H || MAP[mapY][mapX] !== '0') hit = true;
    }

    const perpWallDist = side === 0
      ? (mapX - px + (1 - stepX) / 2) / (rayDirX || 1e-6)
      : (mapY - py + (1 - stepY) / 2) / (rayDirY || 1e-6);
    const hitX = px + rayDirX * perpWallDist;
    const hitY = py + rayDirY * perpWallDist;
    const wallX = side === 0 ? hitY - Math.floor(hitY) : hitX - Math.floor(hitX);
    return {
      d: Math.max(0.001, perpWallDist),
      hitX,
      hitY,
      side,
      wallX,
      tex: (mapX + mapY) % 2 === 0 ? 'wall' : 'wallDark'
    };
  }
