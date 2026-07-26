/*
 * Strikewatch source module: 61-world-renderer.js
 * Purpose: Level geometry batching, landmarks, environment rendering and renderer initialisation.
 *
 * This file is a source fragment. Run `python3 build.py` to regenerate
 * js/strikewatch.dev.js and the standalone release in dist/.
 */

  const OFFICE_CARPET_PRESENTATION = Object.freeze({
    base: '#252f37',
    rowTones: [[0.145, 0.185, 0.215], [0.165, 0.205, 0.232]],
    seamMinor: [0.20, 0.24, 0.27],
    seamMajor: [0.11, 0.15, 0.18],
    roughness: 0.98,
    tileSize: 1
  });

  const ARENA_GEOMETRY_PRESENTATION = Object.freeze({
    door: Object.freeze({ tieOffset: 0.575, tieWidth: 0.19, tieHeight: 2.34, tieDepth: 0.16, thresholdWidth: 1.10, thresholdHeight: 0.055, thresholdDepth: 0.22 }),
    citadel: Object.freeze({
      stair: Object.freeze({ steps: 5, width: 0.70, treadDepth: 0.18, firstRise: 0.12, rise: 0.11, treadCapHeight: 0.022 }),
      walkway: Object.freeze({ deckThickness: 0.11, hangerFractions: Object.freeze([-0.42, -0.14, 0.14, 0.42]), hangerSideFactor: 0.42, hangerRadius: 0.018, ceilingPlateHeight: 0.060 }),
      tank: Object.freeze({ baseHeight: 0.12, topCapHeight: 0.10, nozzleRingHeight: 2.12 })
    }),
    office: Object.freeze({
      baffle: Object.freeze({ thickness: 0.055, drop: 0.18, hangerFractions: Object.freeze([-0.42, -0.14, 0.14, 0.42]), hangerRadius: 0.012 }),
      glass: Object.freeze({ centreY: 1.38, height: 1.86, channelY: Object.freeze([0.42, 2.34]), mullionFractions: Object.freeze([-0.50, 0, 0.50]) }),
      screen: Object.freeze({ railY: Object.freeze([1.10, 2.00]), racewayBottom: 0.38, racewayTop: 1.12 }),
      chair: Object.freeze({ seatY: 0.46, seatHeight: 0.12, backY: 0.69, backHeight: 0.46, stemBottom: 0.04, stemTop: 0.42, baseY: 0.065 }),
      bench: Object.freeze({ feet: 4, backSupports: 2 }),
      sofa: Object.freeze({ feet: 4 })
    }),
    dune: Object.freeze({
      canopy: Object.freeze({
        fabricY: DUNE_CANOPY_PRESENTATION.fabricY,
        fabricPitch: DUNE_CANOPY_PRESENTATION.fabricPitch,
        fabricThickness: 0.035,
        headerDrop: DUNE_CANOPY_PRESENTATION.headerDrop,
        headerRadius: 0.030,
        rafterDrop: 0.015,
        rafterRadius: 0.020,
        postTopExtension: 0.020,
        postWidthFactor: DUNE_CANOPY_PRESENTATION.postWidthFactor,
        postDepthFactor: DUNE_CANOPY_PRESENTATION.postDepthFactor,
        headerCount: 4,
        braceCount: 8,
        transverseRafterFractions: Object.freeze([-0.30, 0, 0.30]),
        braceBottomY: 1.96
      }),
      amphora: Object.freeze({ potsPerCluster: 3, handlesPerPot: 2, segmentsPerHandle: 2 }),
      marketStall: Object.freeze({ postCount: 4, headerCount: 4 })
    })
  });

  function officeCarpetPresentationSnapshot() {
    return {
      base: OFFICE_CARPET_PRESENTATION.base,
      rowTones: OFFICE_CARPET_PRESENTATION.rowTones.map(colour => colour.slice()),
      seamMinor: OFFICE_CARPET_PRESENTATION.seamMinor.slice(),
      seamMajor: OFFICE_CARPET_PRESENTATION.seamMajor.slice(),
      roughness: OFFICE_CARPET_PRESENTATION.roughness,
      tileSize: OFFICE_CARPET_PRESENTATION.tileSize,
      rowBands: MAP_H,
      seamLines: worldBatches.floorLines.length
    };
  }


  function officeBaffleMountGeometry(baffle, sceneWallHeight) {
    const width = Number(baffle.width) || 1;
    const depth = Number(baffle.depth) || 0.12;
    const localCeiling = worldBatches.lowCeilings.find(ceiling => (
      baffle.x - width * 0.5 >= ceiling.x - ceiling.width * 0.5 - 0.02
      && baffle.x + width * 0.5 <= ceiling.x + ceiling.width * 0.5 + 0.02
      && baffle.z - depth * 0.5 >= ceiling.z - ceiling.depth * 0.5 - 0.02
      && baffle.z + depth * 0.5 <= ceiling.z + ceiling.depth * 0.5 + 0.02
    ));
    const anchorY = localCeiling ? localCeiling.height - 0.045 : sceneWallHeight;
    const centreY = anchorY - ARENA_GEOMETRY_PRESENTATION.office.baffle.drop;
    const topY = centreY + ARENA_GEOMETRY_PRESENTATION.office.baffle.thickness * 0.5;
    return { anchorY, centreY, topY, localCeiling: localCeiling ? { x: localCeiling.x, z: localCeiling.z, height: localCeiling.height } : null };
  }

  function drawOfficeChair(x, z, yaw, width = 0.34, depth = 0.34, colour = [0.17, 0.24, 0.28]) {
    const spec = ARENA_GEOMETRY_PRESENTATION.office.chair;
    const chairWidth = clamp(Number(width) || 0.34, 0.28, 0.44);
    const chairDepth = clamp(Number(depth) || 0.34, 0.28, 0.42);
    const dark = [colour[0] * 0.58, colour[1] * 0.62, colour[2] * 0.64];
    const seatBottom = spec.seatY - spec.seatHeight * 0.5;
    const seatTop = spec.seatY + spec.seatHeight * 0.5;
    drawSegment({ x, y: spec.stemBottom, z }, { x, y: spec.stemTop, z }, 0.034, dark, 0, 1, 3, 0.30);
    for (let spoke = 0; spoke < 4; spoke++) {
      const angle = spoke * Math.PI * 0.5;
      const end = localToWorld(x, z, yaw, Math.cos(angle) * chairWidth * 0.43, Math.sin(angle) * chairDepth * 0.43);
      drawSegment({ x, y: spec.baseY + 0.015, z }, { x: end.x, y: spec.baseY, z: end.z }, 0.016, dark, 0, 1, 3, 0.31);
      mat4TRS(glModel, end.x, 0.045, end.z, yaw + angle, 0, 0, 0.055, 0.050, 0.075);
      drawMesh(glMeshes.cylinder, [0.10, 0.12, 0.13], glModel, 0, 1, 3, 0.34);
    }
    mat4TRS(glModel, x, spec.seatY, z, yaw, 0, 0, chairWidth, spec.seatHeight, chairDepth * 0.78);
    drawMesh(glMeshes.cube, colour, glModel, 0, 1, 3, 0.76);
    const back = localToWorld(x, z, yaw, 0, -chairDepth * 0.37);
    mat4TRS(glModel, back.x, spec.backY, back.z, yaw, -0.08, 0, chairWidth * 0.92, spec.backHeight, 0.085);
    drawMesh(glMeshes.cube, [colour[0] * 0.90, colour[1] * 0.92, colour[2] * 0.94], glModel, 0, 1, 3, 0.74);
    for (const side of [-1, 1]) {
      const lower = localToWorld(x, z, yaw, side * chairWidth * 0.31, -chairDepth * 0.20);
      const upper = localToWorld(x, z, yaw, side * chairWidth * 0.31, -chairDepth * 0.35);
      drawSegment({ x: lower.x, y: seatBottom + 0.005, z: lower.z }, { x: upper.x, y: Math.min(seatTop + 0.03, spec.backY - spec.backHeight * 0.35), z: upper.z }, 0.018, dark, 0, 1, 3, 0.31);
    }
  }

  // Splits an axis-aligned overhead run into the stretches that cross open
  // floor. `axis` is the axis the run travels along; `fixed` is the constant
  // coordinate on the other axis. Returns [start, end] world pairs, inset a
  // little so each stretch dies just short of the masonry it meets.
  function openRunSegments(axis, fixed, from, to, inset = 0.07) {
    const travelLimit = axis === 'x' ? MAP_W : MAP_H;
    const fixedCell = Math.max(0, Math.min((axis === 'x' ? MAP_H : MAP_W) - 1, Math.floor(fixed)));
    const first = Math.max(0, Math.floor(from));
    const last = Math.min(travelLimit, Math.ceil(to));
    const spans = [];
    let start = null;
    for (let cell = first; cell < last; cell++) {
      const open = axis === 'x' ? MAP[fixedCell]?.[cell] === '0' : MAP[cell]?.[fixedCell] === '0';
      if (open) {
        if (start === null) start = cell;
      } else if (start !== null) {
        spans.push([start, cell]);
        start = null;
      }
    }
    if (start !== null) spans.push([start, last]);
    return spans
      .map(span => [Math.max(from, span[0] + inset), Math.min(to, span[1] - inset)])
      .filter(span => span[1] - span[0] > 0.4);
  }

  // Suspended store and dock ceilings hang below the roof deck. Anything that
  // reaches upward from below one of them has to stop at the panel, or the
  // hanger visibly spears through the ceiling it is supposed to hang from.
  function localCeilingHeightAt(x, z, sceneWallHeight) {
    let height = sceneWallHeight;
    for (const ceiling of worldBatches.lowCeilings) {
      if (x < ceiling.x - ceiling.width * 0.5 || x > ceiling.x + ceiling.width * 0.5) continue;
      if (z < ceiling.z - ceiling.depth * 0.5 || z > ceiling.z + ceiling.depth * 0.5) continue;
      height = Math.min(height, ceiling.height - 0.05);
    }
    return height;
  }

  // Loading-bay outlines, gate thresholds and the plant-core exclusion ring.
  // Everything is drawn flush with the floor so it never intersects a prop.
  function drawCitadelHazardZone(zone) {
    const width = Math.max(0.4, Number(zone.width) || 1.2);
    const depth = Math.max(0.4, Number(zone.depth) || 1.2);
    const yaw = zone.yaw || 0;
    const kind = zone.kind || 'bay';
    const amber = [0.46, 0.34, 0.075];
    const dark = [0.055, 0.070, 0.078];
    const y = 0.016;
    if (kind === 'chevron') {
      const bars = Math.max(3, Math.round(width / 0.22));
      for (let index = 0; index < bars; index++) {
        const offset = (index + 0.5) / bars - 0.5;
        const p = localToWorld(zone.x, zone.z, yaw, offset * width, 0);
        mat4TRS(glModel, p.x, y, p.z, yaw, 0, 0, width / bars * 0.62, 0.014, depth);
        drawMesh(glMeshes.cube, index % 2 ? amber : dark, glModel, index % 2 ? 0.05 : 0, 1, 3, 0.66);
      }
      return;
    }
    const band = kind === 'ring' ? 0.20 : 0.13;
    for (const side of [-1, 1]) {
      const alongX = localToWorld(zone.x, zone.z, yaw, 0, side * (depth * 0.5 - band * 0.5));
      mat4TRS(glModel, alongX.x, y, alongX.z, yaw, 0, 0, width, 0.014, band);
      drawMesh(glMeshes.cube, amber, glModel, 0.045, 1, 3, 0.68);
      const alongZ = localToWorld(zone.x, zone.z, yaw, side * (width * 0.5 - band * 0.5), 0);
      mat4TRS(glModel, alongZ.x, y, alongZ.z, yaw, 0, 0, band, 0.014, depth - band * 2);
      drawMesh(glMeshes.cube, amber, glModel, 0.045, 1, 3, 0.68);
    }
    if (kind === 'ring') {
      // Hatch the border so the exclusion zone reads as a keep-clear marking
      // rather than a plain painted rectangle.
      const ticks = Math.max(4, Math.round(width / 0.34));
      for (let index = 0; index < ticks; index++) {
        const offset = (index + 0.5) / ticks - 0.5;
        for (const side of [-1, 1]) {
          const tick = localToWorld(zone.x, zone.z, yaw, offset * (width - band * 2), side * (depth * 0.5 - band * 0.5));
          mat4TRS(glModel, tick.x, y + 0.002, tick.z, yaw, 0, 0, band * 0.52, 0.012, band * 0.92);
          drawMesh(glMeshes.cube, dark, glModel, 0, 1, 3, 0.62);
        }
      }
    } else {
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const corner = localToWorld(zone.x, zone.z, yaw, sx * (width * 0.5 - band * 0.5), sz * (depth * 0.5 - band * 1.6));
          mat4TRS(glModel, corner.x, y + 0.002, corner.z, yaw, 0, 0, band * 0.9, 0.012, band * 1.5);
          drawMesh(glMeshes.cube, dark, glModel, 0, 1, 3, 0.62);
        }
      }
    }
  }

  function drawCitadelWalkwayStructure(walkway, rawCeilingHeight) {
    const spec = ARENA_GEOMETRY_PRESENTATION.citadel.walkway;
    const sceneWallHeight = localCeilingHeightAt(walkway.x, walkway.z, rawCeilingHeight);
    const deckTop = walkway.y + spec.deckThickness * 0.5;
    const deckBottom = walkway.y - spec.deckThickness * 0.5;
    const supportColour = [0.18, 0.23, 0.25];
    const bracketColour = [0.32, 0.37, 0.38];
    for (const fraction of spec.hangerFractions) {
      const x = walkway.x + walkway.width * fraction;
      const frontZ = walkway.z - walkway.depth * spec.hangerSideFactor;
      const backZ = walkway.z + walkway.depth * spec.hangerSideFactor;
      drawSegment({ x, y: deckBottom - 0.015, z: frontZ }, { x, y: deckBottom - 0.015, z: backZ }, 0.025, supportColour, 0, 1, 3, 0.31);
      for (const z of [frontZ, backZ]) {
        drawSegment({ x, y: deckTop - 0.01, z }, { x, y: sceneWallHeight, z }, spec.hangerRadius, supportColour, 0, 1, 3, 0.30);
        mat4TRS(glModel, x, deckTop + 0.015, z, 0, 0, 0, 0.085, 0.060, 0.085);
        drawMesh(glMeshes.cube, bracketColour, glModel, 0, 1, 3, 0.29);
        mat4TRS(glModel, x, sceneWallHeight - spec.ceilingPlateHeight * 0.5, z, 0, 0, 0, 0.12, spec.ceilingPlateHeight, 0.12);
        drawMesh(glMeshes.cube, bracketColour, glModel, 0, 1, 3, 0.29);
      }
    }
    drawSegment(
      { x: walkway.x - walkway.width * 0.49, y: deckBottom - 0.055, z: walkway.z },
      { x: walkway.x + walkway.width * 0.49, y: deckBottom - 0.055, z: walkway.z },
      0.030,
      supportColour,
      0,
      1,
      3,
      0.31
    );
    // Each deck end is bolted to the partition it spans between: a bearing
    // plate against the wall face and a gusset under the deck. Without these
    // the catwalk reads as floating even when the span itself is correct.
    for (const side of [-1, 1]) {
      const endX = walkway.x + side * walkway.width * 0.5;
      mat4TRS(glModel, endX - side * 0.055, walkway.y - 0.01, walkway.z, 0, 0, 0, 0.11, 0.44, walkway.depth * 1.28);
      drawMesh(glMeshes.cube, bracketColour, glModel, 0, 1, 3, 0.30);
      for (const bolt of [-1, 1]) {
        mat4TRS(glModel, endX - side * 0.115, walkway.y + bolt * 0.13, walkway.z + bolt * walkway.depth * 0.34, 0, 0, 0, 0.035, 0.035, 0.035);
        drawMesh(glMeshes.cube, [0.44, 0.48, 0.49], glModel, 0.02, 1, 3, 0.26);
      }
      drawSegment(
        { x: endX - side * 0.10, y: deckBottom - 0.015, z: walkway.z },
        { x: endX - side * 0.44, y: deckBottom - 0.30, z: walkway.z },
        0.026,
        supportColour,
        0,
        1,
        3,
        0.31
      );
    }
  }

  function drawCitadelStair(stair) {
    const spec = ARENA_GEOMETRY_PRESENTATION.citadel.stair;
    const width = Math.max(0.4, Number(stair.width) || spec.width);
    const flightRun = spec.steps * spec.treadDepth;
    const totalDepth = Math.max(flightRun, Number(stair.depth) || flightRun);
    const landingDepth = totalDepth - flightRun;
    const topRise = spec.firstRise + (spec.steps - 1) * spec.rise;
    // The authored origin is the centre of the whole assembly, so the flight
    // sits at the near end and the landing runs from the top tread out to the
    // wall face that carries the access hatch.
    const flightCentre = -totalDepth * 0.5 + flightRun * 0.5;
    for (let index = 0; index < spec.steps; index++) {
      const p = localToWorld(stair.x, stair.z, stair.yaw, 0, flightCentre + (index - (spec.steps - 1) * 0.5) * spec.treadDepth);
      const riserHeight = spec.firstRise + index * spec.rise;
      mat4TRS(glModel, p.x, riserHeight * 0.5, p.z, stair.yaw, 0, 0, width, riserHeight, spec.treadDepth);
      drawMesh(glMeshes.cube, [0.12, 0.16, 0.18], glModel, 0, 1, 3, 0.42);
      mat4TRS(glModel, p.x, riserHeight + spec.treadCapHeight * 0.5, p.z, stair.yaw, 0, 0, width * 0.95, spec.treadCapHeight, spec.treadDepth * 0.92);
      drawMesh(glMeshes.cube, [0.31, 0.36, 0.37], glModel, 0.015, 1, 3, 0.30);
      const nosing = localToWorld(p.x, p.z, stair.yaw, 0, spec.treadDepth * 0.43);
      mat4TRS(glModel, nosing.x, riserHeight + 0.018, nosing.z, stair.yaw, 0, 0, width * 0.90, 0.024, 0.028);
      drawMesh(glMeshes.cube, [0.52, 0.43, 0.20], glModel, 0.04, 1, 3, 0.30);
    }

    if (landingDepth > 0.05) {
      const landingCentre = totalDepth * 0.5 - landingDepth * 0.5;
      const deck = localToWorld(stair.x, stair.z, stair.yaw, 0, landingCentre);
      mat4TRS(glModel, deck.x, topRise - 0.024, deck.z, stair.yaw, 0, 0, width, 0.048, landingDepth);
      drawMesh(glMeshes.cube, [0.13, 0.175, 0.195], glModel, 0, 1, 3, 0.40);
      mat4TRS(glModel, deck.x, topRise + 0.012, deck.z, stair.yaw, 0, 0, width * 0.96, 0.022, landingDepth * 0.94);
      drawMesh(glMeshes.cube, [0.31, 0.36, 0.37], glModel, 0.015, 1, 3, 0.30);
      for (const side of [-1, 1]) {
        const leg = localToWorld(stair.x, stair.z, stair.yaw, side * width * 0.40, landingCentre + landingDepth * 0.26);
        drawSegment({ x: leg.x, y: 0.03, z: leg.z }, { x: leg.x, y: topRise - 0.05, z: leg.z }, 0.026, [0.17, 0.22, 0.24], 0, 1, 3, 0.32);
      }
      // The access hatch is what the flight exists to reach. It is recessed
      // into the wall face the landing meets, so the steps read as service
      // access rather than five treads stopping against blank masonry.
      const face = localToWorld(stair.x, stair.z, stair.yaw, 0, totalDepth * 0.5 - 0.055);
      mat4TRS(glModel, face.x, topRise + 0.90, face.z, stair.yaw, 0, 0, width * 1.02, 1.74, 0.070);
      drawMesh(glMeshes.cube, [0.115, 0.155, 0.175], glModel, 0, 1, 3, 0.36);
      mat4TRS(glModel, face.x, topRise + 0.88, face.z, stair.yaw, 0, 0, width * 0.78, 1.50, 0.098);
      drawMesh(glMeshes.cube, [0.175, 0.225, 0.245], glModel, 0, 1, 3, 0.44);
      for (const rail of [topRise + 0.34, topRise + 1.42]) {
        mat4TRS(glModel, face.x, rail, face.z, stair.yaw, 0, 0, width * 0.70, 0.032, 0.115);
        drawMesh(glMeshes.cube, [0.40, 0.33, 0.16], glModel, 0.05, 1, 3, 0.34);
      }
      const handle = localToWorld(face.x, face.z, stair.yaw, -width * 0.26, -0.062);
      mat4TRS(glModel, handle.x, topRise + 0.86, handle.z, stair.yaw, 0, 0, 0.030, 0.26, 0.026);
      drawMesh(glMeshes.cube, [0.52, 0.57, 0.58], glModel, 0.02, 1, 3, 0.28);
      const lamp = localToWorld(face.x, face.z, stair.yaw, width * 0.30, -0.058);
      mat4TRS(glModel, lamp.x, topRise + 1.70, lamp.z, stair.yaw, 0, 0, 0.080, 0.055, 0.030);
      drawMesh(glMeshes.cube, [0.92, 0.44, 0.20], glModel, 0.86, 1, 4, 0.10);
    }

    // A continuous stringer runs the pitch of the flight and levels off over
    // the landing, with stanchions so the handrail is visibly supported.
    for (const side of [-1, 1]) {
      const footLocal = -totalDepth * 0.5;
      const topLocal = -totalDepth * 0.5 + flightRun;
      const foot = localToWorld(stair.x, stair.z, stair.yaw, side * width * 0.47, footLocal);
      const crest = localToWorld(stair.x, stair.z, stair.yaw, side * width * 0.47, topLocal);
      drawSegment({ x: foot.x, y: 0.06, z: foot.z }, { x: crest.x, y: topRise + 0.86, z: crest.z }, 0.022, [0.19, 0.24, 0.25], 0, 1, 3, 0.32);
      if (landingDepth > 0.05) {
        const end = localToWorld(stair.x, stair.z, stair.yaw, side * width * 0.47, totalDepth * 0.5 - 0.04);
        drawSegment({ x: crest.x, y: topRise + 0.86, z: crest.z }, { x: end.x, y: topRise + 0.86, z: end.z }, 0.022, [0.19, 0.24, 0.25], 0, 1, 3, 0.32);
        drawSegment({ x: end.x, y: topRise + 0.86, z: end.z }, { x: end.x, y: topRise + 0.02, z: end.z }, 0.020, [0.17, 0.22, 0.24], 0, 1, 3, 0.32);
        drawSegment({ x: crest.x, y: topRise + 0.86, z: crest.z }, { x: crest.x, y: topRise + 0.02, z: crest.z }, 0.020, [0.17, 0.22, 0.24], 0, 1, 3, 0.32);
      }
    }
  }

  function drawDoorStructuralTies(door, officeTheme) {
    const spec = ARENA_GEOMETRY_PRESENTATION.door;
    const tieColour = officeTheme ? [0.42, 0.47, 0.49] : [0.18, 0.23, 0.25];
    const thresholdColour = officeTheme ? [0.52, 0.57, 0.59] : [0.32, 0.37, 0.38];
    for (const side of [-1, 1]) {
      const tie = localToWorld(door.x, door.z, door.yaw, side * spec.tieOffset, 0);
      mat4TRS(glModel, tie.x, spec.tieHeight * 0.5 + 0.01, tie.z, door.yaw, 0, 0, spec.tieWidth, spec.tieHeight, spec.tieDepth);
      drawMesh(glMeshes.cube, tieColour, glModel, officeTheme ? 0.015 : 0.006, 1, 3, officeTheme ? 0.34 : 0.38);
    }
    mat4TRS(glModel, door.x, spec.thresholdHeight * 0.5 + 0.007, door.z, door.yaw, 0, 0, spec.thresholdWidth, spec.thresholdHeight, spec.thresholdDepth);
    drawMesh(glMeshes.cube, thresholdColour, glModel, officeTheme ? 0.04 : 0.012, 1, 3, officeTheme ? 0.30 : 0.36);
  }

  function drawIndustrialTankGrounding(tank, radius) {
    const spec = ARENA_GEOMETRY_PRESENTATION.citadel.tank;
    mat4TRS(glModel, tank.x, spec.baseHeight * 0.5, tank.z, 0, 0, 0, radius * 2.14, spec.baseHeight, radius * 2.14);
    drawMesh(glMeshes.cylinder, [0.20, 0.24, 0.25], glModel, 0, 1, 3, 0.34);
    mat4TRS(glModel, tank.x, spec.nozzleRingHeight, tank.z, 0, 0, 0, 0.18, 0.060, 0.18);
    drawMesh(glMeshes.ring, [0.40, 0.45, 0.45], glModel, 0.01, 1, 3, 0.28);
    mat4TRS(glModel, tank.x, spec.nozzleRingHeight + spec.topCapHeight * 0.5, tank.z, 0, 0, 0, 0.14, spec.topCapHeight, 0.14);
    drawMesh(glMeshes.cylinder, [0.24, 0.29, 0.30], glModel, 0, 1, 3, 0.30);
    drawSegment({ x: tank.x - 0.12, y: spec.nozzleRingHeight + spec.topCapHeight, z: tank.z }, { x: tank.x + 0.12, y: spec.nozzleRingHeight + spec.topCapHeight, z: tank.z }, 0.018, [0.48, 0.53, 0.52], 0.01, 1, 3, 0.27);
  }

  function duneCanopyCorner(canopy, sx, sz) {
    const spec = ARENA_GEOMETRY_PRESENTATION.dune.canopy;
    const width = Number(canopy.width) || 3.0;
    const depth = Number(canopy.depth) || 2.4;
    return localToWorld(canopy.x, canopy.z, canopy.yaw || 0, sx * width * spec.postWidthFactor, sz * depth * spec.postDepthFactor);
  }

  function duneCanopyPlaneY(localZ, drop = 0) {
    const spec = ARENA_GEOMETRY_PRESENTATION.dune.canopy;
    return spec.fabricY - Math.sin(spec.fabricPitch) * localZ - drop;
  }

  function duneCanopyFramePoint(canopy, localX, localZ, drop = 0) {
    const point = localToWorld(canopy.x, canopy.z, canopy.yaw || 0, localX, localZ);
    return { x: point.x, y: duneCanopyPlaneY(localZ, drop), z: point.z };
  }

  function drawDuneCanopyFrame(canopy) {
    const spec = ARENA_GEOMETRY_PRESENTATION.dune.canopy;
    const yaw = canopy.yaw || 0;
    const width = Number(canopy.width) || 3.0;
    const depth = Number(canopy.depth) || 2.4;
    const timber = [0.27, 0.16, 0.09];
    const timberLight = [0.39, 0.24, 0.13];
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const localX = sx * width * spec.postWidthFactor;
        const localZ = sz * depth * spec.postDepthFactor;
        const post = duneCanopyFramePoint(canopy, localX, localZ, spec.headerDrop);
        drawSegment({ x: post.x, y: 0.06, z: post.z }, { x: post.x, y: post.y + spec.postTopExtension, z: post.z }, 0.045, timber, 0, 1, 7, 0.92);
        mat4TRS(glModel, post.x, 0.10, post.z, yaw, 0, 0, 0.15, 0.14, 0.15);
        drawMesh(glMeshes.cube, [0.50, 0.34, 0.20], glModel, 0, 1, 7, 0.98);
        mat4TRS(glModel, post.x, post.y, post.z, yaw, 0, 0, 0.13, 0.13, 0.13);
        drawMesh(glMeshes.cube, timberLight, glModel, 0, 1, 7, 0.92);
        const xBraceEnd = duneCanopyFramePoint(canopy, sx * width * 0.28, localZ, spec.headerDrop);
        const zBraceEnd = duneCanopyFramePoint(canopy, localX, sz * depth * 0.24, spec.headerDrop);
        drawSegment({ x: post.x, y: spec.braceBottomY, z: post.z }, xBraceEnd, 0.021, timberLight, 0, 1, 7, 0.90);
        drawSegment({ x: post.x, y: spec.braceBottomY, z: post.z }, zBraceEnd, 0.021, timberLight, 0, 1, 7, 0.90);
      }
    }
    for (const sz of [-1, 1]) {
      const localZ = sz * depth * spec.postDepthFactor;
      const left = duneCanopyFramePoint(canopy, -width * spec.postWidthFactor, localZ, spec.headerDrop);
      const right = duneCanopyFramePoint(canopy, width * spec.postWidthFactor, localZ, spec.headerDrop);
      drawSegment(left, right, spec.headerRadius, timberLight, 0, 1, 7, 0.92);
    }
    for (const sx of [-1, 1]) {
      const localX = sx * width * spec.postWidthFactor;
      const front = duneCanopyFramePoint(canopy, localX, -depth * spec.postDepthFactor, spec.headerDrop);
      const back = duneCanopyFramePoint(canopy, localX, depth * spec.postDepthFactor, spec.headerDrop);
      drawSegment(front, back, spec.headerRadius, timberLight, 0, 1, 7, 0.92);
    }
    const ridgeFront = duneCanopyFramePoint(canopy, 0, -depth * spec.postDepthFactor, spec.rafterDrop);
    const ridgeBack = duneCanopyFramePoint(canopy, 0, depth * spec.postDepthFactor, spec.rafterDrop);
    drawSegment(ridgeFront, ridgeBack, spec.rafterRadius, timberLight, 0, 1, 7, 0.90);
    for (const fraction of spec.transverseRafterFractions) {
      const localZ = depth * fraction;
      const left = duneCanopyFramePoint(canopy, -width * spec.postWidthFactor, localZ, spec.rafterDrop);
      const right = duneCanopyFramePoint(canopy, width * spec.postWidthFactor, localZ, spec.rafterDrop);
      drawSegment(left, right, 0.018, timberLight, 0, 1, 7, 0.90);
    }
  }

  function arenaGeometryPresentationSnapshot() {
    const arena = activeArenaMeta();
    const sceneWallHeight = Number(arena.ceilingHeight) || GL_WALL_HEIGHT;
    const base = { arenaId: arena.id, name: arena.name, build: BUILD_VERSION };
    if (arena.id === 'citadel') {
      const stairSpec = ARENA_GEOMETRY_PRESENTATION.citadel.stair;
      const stairCollider = PROP_COLLISION_PROFILES.stairs;
      const flightRun = stairSpec.steps * stairSpec.treadDepth;
      const wallAt = (x, z) => {
        const cx = Math.floor(x);
        const cz = Math.floor(z);
        return cz >= 0 && cz < MAP_H && cx >= 0 && cx < MAP_W && MAP[cz][cx] !== '0';
      };
      const stairs = (LEVEL_PROP_LAYOUT.stairs || []).map((stair, index) => {
        const width = Number(stair.width) || stairSpec.width;
        const depth = Number(stair.depth) || flightRun;
        const landingDepth = depth - flightRun;
        // A flight has to climb to something. The cell just past the landing
        // edge must be solid, because that is the wall carrying the hatch the
        // steps exist to reach.
        const beyond = propLocalPoint({ x: stair.x, y: stair.y, yaw: stair.yaw || 0 }, 0, depth * 0.5 + 0.12);
        return {
          index,
          x: stair.x,
          z: stair.y,
          width,
          depth,
          landingDepth: Number(landingDepth.toFixed(3)),
          grounded: stairSpec.firstRise > 0,
          solidRisers: true,
          continuousTreads: stairSpec.treadDepth > 0,
          hasLanding: landingDepth > 0.05,
          reachesWall: wallAt(beyond.x, beyond.y),
          insideCollider: (Number.isFinite(stair.width) ? true : stairSpec.width * 0.5 <= stairCollider.halfWidth + 0.001)
            && (Number.isFinite(stair.depth) ? true : flightRun * 0.5 <= stairCollider.halfDepth + 0.001)
        };
      });
      const walkwaySpec = ARENA_GEOMETRY_PRESENTATION.citadel.walkway;
      const walkways = worldBatches.walkways.map((walkway, index) => {
        // No part of a deck may pass over a wall column, and both ends must
        // die into a partition face rather than stopping in mid-air.
        const inner1 = walkway.x - walkway.width * 0.5 + 0.03;
        const inner2 = walkway.x + walkway.width * 0.5 - 0.03;
        let clearOfWalls = true;
        for (let sample = 0; sample <= 48; sample++) {
          if (wallAt(inner1 + (inner2 - inner1) * (sample / 48), walkway.z)) {
            clearOfWalls = false;
            break;
          }
        }
        return {
          index,
          hangerCount: walkwaySpec.hangerFractions.length * 2,
          crossBeamCount: walkwaySpec.hangerFractions.length,
          ceilingAnchorY: sceneWallHeight,
          deckTopY: walkway.y + walkwaySpec.deckThickness * 0.5,
          hangersMeetDeck: true,
          hangersMeetCeiling: sceneWallHeight > walkway.y + walkwaySpec.deckThickness * 0.5,
          clearOfWalls,
          anchoredBothEnds: wallAt(walkway.x - walkway.width * 0.5 - 0.12, walkway.z)
            && wallAt(walkway.x + walkway.width * 0.5 + 0.12, walkway.z)
        };
      });
      const doors = (LEVEL_PROP_LAYOUT.doors || []).map(door => ({
        id: door.id,
        wallTies: 2,
        threshold: true,
        // A gate must occupy a real opening: clear at its centre, solid on the
        // two faces the leaves close against.
        inOpening: !wallAt(door.x, door.y)
          && wallAt(propLocalPoint(door, -0.75, 0).x, propLocalPoint(door, -0.75, 0).y)
          && wallAt(propLocalPoint(door, 0.75, 0).x, propLocalPoint(door, 0.75, 0).y)
      }));
      const tanks = (LEVEL_PROP_LAYOUT.tanks || []).map((tank, index) => ({ index, x: tank.x, z: tank.y, groundedBase: true, cappedNozzle: true }));
      // Nothing authored may bury itself in masonry. This is sampled against
      // the same footprints the renderer draws.
      const propClearance = [
        ...(LEVEL_PROP_LAYOUT.containers || []).map(prop => ({ group: 'container', prop })),
        ...(LEVEL_PROP_LAYOUT.machines || []).map(prop => ({ group: 'machine', prop })),
        ...(LEVEL_PROP_LAYOUT.tanks || []).map(prop => ({ group: 'tank', prop }))
      ].map(entry => {
        const prop = entry.prop;
        const radius = Number(prop.radius) || 0.45;
        const halfWidth = (Number(prop.width) || (entry.group === 'tank' ? radius * 2.14 : 0.94)) * 0.5;
        const halfDepth = (Number(prop.depth) || (entry.group === 'tank' ? radius * 2.14 : 0.94)) * 0.5;
        let clear = true;
        for (const sx of [-1, 0, 1]) {
          for (const sz of [-1, 0, 1]) {
            const sample = propLocalPoint(prop, sx * halfWidth, sz * halfDepth);
            if (wallAt(sample.x, sample.y)) clear = false;
          }
        }
        return { group: entry.group, kind: prop.kind || entry.group, x: prop.x, z: prop.y, clear };
      });
      const hazardZones = (LEVEL_DECOR_LAYOUT.hazardZones || []).length;
      const pipeRuns = (LEVEL_DECOR_LAYOUT.pipeRuns || []).length;
      return {
        ...base,
        stairs,
        walkways,
        doors,
        tanks,
        propClearance,
        hazardZones,
        pipeRuns,
        lowCeilings: (LEVEL_DECOR_LAYOUT.lowCeilings || []).length,
        ok: stairs.length === 2
          && stairs.every(check => check.grounded && check.solidRisers && check.continuousTreads
            && check.insideCollider && check.hasLanding && check.reachesWall)
          && walkways.length === 2
          && walkways.every(check => check.hangerCount === 8 && check.crossBeamCount === 4
            && check.hangersMeetDeck && check.hangersMeetCeiling && check.clearOfWalls && check.anchoredBothEnds)
          && doors.length === 6 && doors.every(check => check.wallTies === 2 && check.threshold && check.inOpening)
          && tanks.length === 6 && tanks.every(check => check.groundedBase && check.cappedNozzle)
          && propClearance.length > 0 && propClearance.every(check => check.clear)
          && hazardZones > 0 && pipeRuns > 0
      };
    }
    if (arena.id === 'office') {
      const baffleSpec = ARENA_GEOMETRY_PRESENTATION.office.baffle;
      const baffles = (LEVEL_DECOR_LAYOUT.ceilingBaffles || []).map((baffle, index) => {
        const mount = officeBaffleMountGeometry(baffle, sceneWallHeight);
        return {
          index,
          x: baffle.x,
          z: baffle.z,
          hangerCount: baffleSpec.hangerFractions.length,
          anchorY: mount.anchorY,
          topY: mount.topY,
          ceilingType: mount.localCeiling ? 'local' : 'main',
          mounted: mount.anchorY > mount.topY
        };
      });
      const glass = (LEVEL_DECOR_LAYOUT.glassBands || []).map((band, index) => ({ index, x: band.x, z: band.z, channels: 2, mullions: ARENA_GEOMETRY_PRESENTATION.office.glass.mullionFractions.length }));
      const screens = (LEVEL_DECOR_LAYOUT.wallScreens || []).map((screen, index) => ({ index, label: screen.label || '', flushMount: Boolean(screen.flushMount), rails: 2, raceway: true }));
      let chairCount = 0;
      for (const machine of LEVEL_PROP_LAYOUT.machines || []) {
        if (machine.kind === 'workstation-pod') chairCount += 2;
        else if (machine.kind === 'breaktable') chairCount += 4;
        else if (machine.kind === 'conference') chairCount += 6;
        else if (machine.kind === 'desk') chairCount += 1;
      }
      const chairSpec = ARENA_GEOMETRY_PRESENTATION.office.chair;
      const chairConnections = {
        grounded: chairSpec.stemBottom <= 0.05,
        stemMeetsSeat: chairSpec.stemTop >= chairSpec.seatY - chairSpec.seatHeight * 0.5,
        backMeetsSeat: chairSpec.backY - chairSpec.backHeight * 0.5 <= chairSpec.seatY + chairSpec.seatHeight * 0.5
      };
      const benches = (LEVEL_PROP_LAYOUT.containers || []).filter(prop => prop.kind === 'bench').map((bench, index) => ({ index, x: bench.x, z: bench.y, feet: ARENA_GEOMETRY_PRESENTATION.office.bench.feet, backSupports: ARENA_GEOMETRY_PRESENTATION.office.bench.backSupports }));
      const sofas = (LEVEL_PROP_LAYOUT.containers || []).filter(prop => prop.kind === 'sofa').map((sofa, index) => ({ index, x: sofa.x, z: sofa.y, feet: ARENA_GEOMETRY_PRESENTATION.office.sofa.feet }));
      const doors = (LEVEL_PROP_LAYOUT.doors || []).map(door => ({ id: door.id, wallTies: 2, threshold: true }));
      const conferenceProp = (LEVEL_PROP_LAYOUT.machines || []).find(prop => prop.kind === 'conference') || null;
      const sampleOpenRectangle = (x, z, yaw, width, depth) => {
        const samples = [];
        for (const xFraction of [-0.50, -0.25, 0, 0.25, 0.50]) {
          for (const zFraction of [-0.50, -0.25, 0, 0.25, 0.50]) {
            const point = localToWorld(x, z, yaw, width * xFraction, depth * zFraction);
            samples.push({
              x: point.x,
              z: point.z,
              open: MAP[Math.floor(point.z)]?.[Math.floor(point.x)] === '0'
            });
          }
        }
        return samples;
      };
      let conference = null;
      if (conferenceProp) {
        const yaw = conferenceProp.yaw || 0;
        const width = Number(conferenceProp.width) || 1.18;
        const depth = Number(conferenceProp.depth) || 0.72;
        const tableSamples = sampleOpenRectangle(conferenceProp.x, conferenceProp.y, yaw, width, depth);
        const chairSamples = [];
        for (const side of [-1, 1]) {
          for (const offset of [-0.30, 0, 0.30]) {
            const centre = localToWorld(conferenceProp.x, conferenceProp.y, yaw, offset * width, side * depth * 0.78);
            const chairYaw = yaw + (side > 0 ? Math.PI : 0);
            chairSamples.push(...sampleOpenRectangle(centre.x, centre.z, chairYaw, Math.max(0.28, width * 0.20), 0.32));
          }
        }
        const collider = LEVEL_PROP_COLLIDERS.find(item => item.kind === 'conference'
          && Math.abs(item.x - conferenceProp.x) <= 0.001
          && Math.abs(item.y - conferenceProp.y) <= 0.001) || null;
        conference = {
          x: conferenceProp.x,
          z: conferenceProp.y,
          yaw,
          tableSamples: tableSamples.length,
          chairSamples: chairSamples.length,
          tableInsideOpenGeometry: tableSamples.every(sample => sample.open),
          chairsInsideOpenGeometry: chairSamples.every(sample => sample.open),
          colliderAligned: Boolean(collider && Math.abs((collider.yaw || 0) - yaw) <= 0.001)
        };
      }
      return {
        ...base,
        baffles,
        glass,
        screens,
        chairs: { count: chairCount, ...chairConnections },
        benches,
        sofas,
        doors,
        conference,
        ok: baffles.length === 4 && baffles.every(check => check.hangerCount === 4 && check.mounted)
          && glass.length === 4 && glass.every(check => check.channels === 2 && check.mullions === 3)
          && screens.length === 5 && screens.every(check => check.flushMount && check.rails === 2 && check.raceway)
          && chairCount === 20 && Object.values(chairConnections).every(Boolean)
          && benches.length === 2 && benches.every(check => check.feet === 4 && check.backSupports === 2)
          && sofas.length === 2 && sofas.every(check => check.feet === 4)
          && doors.length === 8 && doors.every(check => check.wallTies === 2 && check.threshold)
          && conference?.tableInsideOpenGeometry && conference?.chairsInsideOpenGeometry && conference?.colliderAligned
      };
    }
    if (arena.id === 'dune') {
      const canopySpec = ARENA_GEOMETRY_PRESENTATION.dune.canopy;
      const colliders = LEVEL_PROP_COLLIDERS.filter(collider => collider.kind === 'canopy-post');
      const canopies = (LEVEL_DECOR_LAYOUT.canopies || []).map((canopy, index) => {
        const width = Number(canopy.width) || 3.0;
        const depth = Number(canopy.depth) || 2.4;
        const frontLocalZ = -depth * canopySpec.postDepthFactor;
        const backLocalZ = depth * canopySpec.postDepthFactor;
        const frontHeader = duneCanopyFramePoint(canopy, 0, frontLocalZ, canopySpec.headerDrop);
        const backHeader = duneCanopyFramePoint(canopy, 0, backLocalZ, canopySpec.headerDrop);
        const expectedHeaderRise = -Math.sin(canopySpec.fabricPitch) * (backLocalZ - frontLocalZ);
        const actualHeaderRise = backHeader.y - frontHeader.y;
        const fabricHalfThicknessY = canopySpec.fabricThickness * 0.5 * Math.cos(canopySpec.fabricPitch);
        const headerFabricGap = Math.max(0, canopySpec.headerDrop - canopySpec.headerRadius - fabricHalfThicknessY);
        const rafterFabricGap = Math.max(0, canopySpec.rafterDrop - canopySpec.rafterRadius - fabricHalfThicknessY);
        const tabLocalZ = depth * 0.49;
        const tabEdgeY = duneCanopyPlaneY(tabLocalZ);
        const tabHeight = 0.20;
        const tabTopY = tabEdgeY - tabHeight * 0.5 + tabHeight * 0.5;
        const posts = [];
        for (const sx of [-1, 1]) {
          for (const sz of [-1, 1]) {
            const post = duneCanopyCorner(canopy, sx, sz);
            const localZ = sz * depth * canopySpec.postDepthFactor;
            const headerPoint = duneCanopyFramePoint(canopy, sx * width * canopySpec.postWidthFactor, localZ, canopySpec.headerDrop);
            const postTopY = headerPoint.y + canopySpec.postTopExtension;
            posts.push({
              x: post.x,
              z: post.z,
              headerY: headerPoint.y,
              postTopY,
              meetsHeader: postTopY >= headerPoint.y - canopySpec.headerRadius,
              colliderAligned: colliders.some(collider => Math.abs(collider.x - post.x) <= 0.002 && Math.abs(collider.y - post.z) <= 0.002)
            });
          }
        }
        const headersFollowPitch = Math.abs(actualHeaderRise - expectedHeaderRise) <= 0.000001;
        const headersTouchFabric = headerFabricGap <= 0.002;
        const raftersTouchFabric = rafterFabricGap <= 0.002;
        const tabsMeetFabric = Math.abs(tabTopY - tabEdgeY) <= 0.000001;
        return {
          index,
          posts,
          postCount: posts.length,
          headerCount: canopySpec.headerCount,
          braceCount: canopySpec.braceCount,
          rafterCount: canopySpec.transverseRafterFractions.length + 1,
          fabricPitch: canopySpec.fabricPitch,
          frontHeaderY: frontHeader.y,
          backHeaderY: backHeader.y,
          actualHeaderRise,
          expectedHeaderRise,
          headerFabricGap,
          rafterFabricGap,
          headersFollowPitch,
          headersTouchFabric,
          raftersTouchFabric,
          tabsMeetFabric,
          frameConnected: posts.every(post => post.colliderAligned && post.meetsHeader)
            && headersFollowPitch && headersTouchFabric && raftersTouchFabric && tabsMeetFabric
        };
      });
      const amphoraClusters = (LEVEL_PROP_LAYOUT.tanks || []).filter(tank => tank.kind === 'amphora-cluster').map((cluster, index) => ({
        index,
        x: cluster.x,
        z: cluster.y,
        pots: ARENA_GEOMETRY_PRESENTATION.dune.amphora.potsPerCluster,
        handles: ARENA_GEOMETRY_PRESENTATION.dune.amphora.potsPerCluster * ARENA_GEOMETRY_PRESENTATION.dune.amphora.handlesPerPot,
        handleSegments: ARENA_GEOMETRY_PRESENTATION.dune.amphora.potsPerCluster * ARENA_GEOMETRY_PRESENTATION.dune.amphora.handlesPerPot * ARENA_GEOMETRY_PRESENTATION.dune.amphora.segmentsPerHandle,
        closedLoops: ARENA_GEOMETRY_PRESENTATION.dune.amphora.segmentsPerHandle === 2
      }));
      const marketStalls = (LEVEL_PROP_LAYOUT.machines || []).filter(machine => machine.kind === 'market-stall').map((stall, index) => ({ index, x: stall.x, z: stall.y, posts: 4, headers: 4, connected: true }));
      const arches = (LEVEL_DECOR_LAYOUT.arches || []).map((arch, index) => ({ index, ...duneArchAttachmentSnapshot(arch) }));
      return {
        ...base,
        canopies,
        amphoraClusters,
        marketStalls,
        arches,
        ok: canopies.length === 4
          && colliders.length === 16
          && canopies.every(check => check.postCount === 4 && check.headerCount === 4 && check.braceCount === 8 && check.rafterCount === 4 && check.frameConnected)
          && amphoraClusters.length === 2 && amphoraClusters.every(check => check.pots === 3 && check.handles === 6 && check.handleSegments === 12 && check.closedLoops)
          && marketStalls.length >= 2 && marketStalls.every(check => check.posts === 4 && check.headers === 4 && check.connected)
          && arches.every(check => check.innerLintelAttached && check.landmarkBackingAttached && check.landmarkEmblemAttached)
      };
    }
    return { ...base, ok: false, reason: 'No presentation contract for arena.' };
  }

  function buildWorldBatches() {
    if (typeof resetStaticWorldGpuBatches === 'function') resetStaticWorldGpuBatches();
    for (const list of Object.values(worldBatches)) list.length = 0;
    const arena = activeArenaMeta();
    const officeTheme = arena.theme === 'office';
    const summitTheme = arena.theme === 'summit';
    const desertTheme = arena.theme === 'desert';
    const sceneWallHeight = Number(arena.ceilingHeight) || GL_WALL_HEIGHT;

    for (const rect of createWallRectangles()) {
      worldBatches.walls.push(rect);
      worldBatches.wallKickPlates.push({ ...rect, y: 0.38, height: 0.42, grow: 0.024 });
      worldBatches.trims.push({ ...rect, y: 0.18, height: 0.18, grow: 0.020 });
      worldBatches.trims.push({ ...rect, y: sceneWallHeight - 0.15, height: 0.12, grow: 0.020 });
      if (!officeTheme && !summitTheme && !desertTheme && (Math.floor(rect.x + rect.z) % 3) === 0) {
        worldBatches.hazards.push({ ...rect, y: 0.72, height: 0.085, grow: 0.026 });
      }
      // Ribbed columns break up long rectangular wall masses while staying
      // entirely inside collision cells.
      if (rect.width >= 2.0) {
        for (let x = rect.x - rect.width / 2 + 0.5; x < rect.x + rect.width / 2; x += 2.5) {
          worldBatches.columns.push({ x, z: rect.z, width: 0.16, depth: rect.depth + 0.04 });
        }
      }
      if (rect.depth >= 2.0) {
        for (let z = rect.z - rect.depth / 2 + 0.5; z < rect.z + rect.depth / 2; z += 2.5) {
          worldBatches.columns.push({ x: rect.x, z, width: rect.width + 0.04, depth: 0.16 });
        }
      }
    }

    for (let x = 0; x <= MAP_W; x += 1) worldBatches.floorLines.push({ x, z: MAP_H / 2, width: 0.012, depth: MAP_H, major: x % 4 === 0 });
    for (let z = 0; z <= MAP_H; z += 1) worldBatches.floorLines.push({ x: MAP_W / 2, z, width: MAP_W, depth: 0.012, major: z % 4 === 0 });

    // Large low-profile floor plates and lane strips add material variation
    // without creating new collision or expensive high-poly geometry.
    for (let y = 1; y < MAP_H - 1; y++) {
      for (let x = 1; x < MAP_W - 1; x++) {
        if (MAP[y][x] !== '0') continue;
        const detailSeed = (x * 19 + y * 29) % 37;
        if (detailSeed === 0 || detailSeed === 9 || detailSeed === 21) {
          worldBatches.floorPatches.push({
            x: x + 0.5,
            z: y + 0.5,
            width: detailSeed === 21 ? 0.82 : 0.66,
            depth: detailSeed === 9 ? 0.36 : 0.68,
            yaw: ((x + y) % 2) * Math.PI / 2,
            shade: detailSeed
          });
        }
        const horizontal = MAP[y][x - 1] === '0' && MAP[y][x + 1] === '0';
        const vertical = MAP[y - 1][x] === '0' && MAP[y + 1][x] === '0';
        if (!officeTheme && !desertTheme && (horizontal || vertical) && (x * 7 + y * 11) % 17 === 0) {
          worldBatches.laneStrips.push({ x: x + 0.5, z: y + 0.5, yaw: horizontal ? Math.PI / 2 : 0, warm: y > MAP_H * 0.58 });
        }
      }
    }

    if (officeTheme) {
      for (const courtyard of LEVEL_DECOR_LAYOUT.courtyards || []) worldBatches.officeCourtyards.push({ ...courtyard });
      for (const baffle of LEVEL_DECOR_LAYOUT.ceilingBaffles || []) worldBatches.officeCeilingBaffles.push({ ...baffle });
    } else if (desertTheme) {
      for (const canopy of LEVEL_DECOR_LAYOUT.canopies || []) worldBatches.desertCanopies.push({ ...canopy });
      for (const arch of LEVEL_DECOR_LAYOUT.arches || []) worldBatches.desertArches.push({ ...arch });
      for (const banner of LEVEL_DECOR_LAYOUT.banners || []) worldBatches.desertBanners.push({ ...banner });
      for (const mosaic of LEVEL_DECOR_LAYOUT.mosaics || []) worldBatches.desertMosaics.push({ ...mosaic });
      for (const rubble of LEVEL_DECOR_LAYOUT.rubble || []) worldBatches.desertRubble.push({ ...rubble });
      for (const torch of LEVEL_DECOR_LAYOUT.torches || []) worldBatches.desertTorches.push({ ...torch });

      // Crenellations are presentation-only and stay above authored wall cells.
      // Restrict them to perimeter-facing masonry so the silhouette is richer
      // without multiplying draw work across every internal partition.
      for (const wall of worldBatches.walls) {
        const perimeter = wall.x < 1.6 || wall.x > MAP_W - 1.6 || wall.z < 2.7 || wall.z > MAP_H - 2.7;
        if (!perimeter) continue;
        const horizontal = wall.width >= wall.depth;
        const length = horizontal ? wall.width : wall.depth;
        if (length < 1.6) continue;
        const count = Math.max(1, Math.floor(length / 1.35));
        for (let index = 0; index < count; index++) {
          const t = (index + 0.5) / count - 0.5;
          worldBatches.desertCrenels.push({
            x: wall.x + (horizontal ? t * length : 0),
            z: wall.z + (horizontal ? 0 : t * length),
            width: horizontal ? Math.min(0.54, length / count * 0.52) : Math.max(0.24, wall.width * 0.72),
            depth: horizontal ? Math.max(0.24, wall.depth * 0.72) : Math.min(0.54, length / count * 0.52),
            variant: (index + Math.floor(wall.x + wall.z)) % 3
          });
        }
      }

      // Low-poly skyline silhouettes sit outside the playable bounds and never
      // participate in collision, line of sight or navigation.
      const backdrop = [
        { kind: 'dune', x: -3.8, z: 3.0, width: 7.5, depth: 4.8, height: 1.35, yaw: 0.30 },
        { kind: 'dune', x: 39.8, z: 5.0, width: 8.0, depth: 5.2, height: 1.55, yaw: -0.28 },
        { kind: 'dune', x: 7.0, z: -4.8, width: 9.5, depth: 5.0, height: 1.35, yaw: -0.12 },
        { kind: 'dune', x: 29.0, z: -5.4, width: 10.0, depth: 5.4, height: 1.62, yaw: 0.16 },
        { kind: 'dune', x: 9.0, z: 29.0, width: 11.0, depth: 5.6, height: 1.45, yaw: 0.10 },
        { kind: 'dune', x: 28.0, z: 29.5, width: 10.5, depth: 5.2, height: 1.72, yaw: -0.18 },
        { kind: 'rock', x: -2.8, z: 18.0, width: 3.4, depth: 2.6, height: 2.4, yaw: 0.25 },
        { kind: 'rock', x: 38.6, z: 17.0, width: 3.6, depth: 2.8, height: 2.6, yaw: -0.20 },
        { kind: 'tower', x: -1.8, z: -1.8, width: 1.7, depth: 1.7, height: 4.1, yaw: 0 },
        { kind: 'tower', x: 37.8, z: -1.8, width: 1.7, depth: 1.7, height: 4.1, yaw: 0 }
      ];
      for (const item of backdrop) worldBatches.desertBackdrop.push(item);
    } else if (summitTheme) {
      // Summit is a clean passenger/research terminal rather than another
      // heavy industrial depot. Sparse roof ribs and broad luminous panels
      // replace pipes, cable trays and hazard-strip clutter.
      for (const z of [3.0, 8.0, 13.0, 18.0, 22.0]) {
        worldBatches.beams.push({ x: MAP_W / 2, z, width: MAP_W - 1.0, depth: 0.075, summit: true });
      }
    } else {
      // Roof steel and services stop where they meet masonry. Splitting each
      // run into the stretches that actually cross open floor keeps beams,
      // trays and pipes out of the top of every wall they used to pass over,
      // and gives each stretch a visible end plate against the wall it dies
      // into.
      for (let z = 1.5; z < MAP_H; z += 4) {
        for (const span of openRunSegments('x', z, 0.5, MAP_W - 0.5)) {
          worldBatches.beams.push({ x: (span[0] + span[1]) * 0.5, z, width: span[1] - span[0], depth: 0.11, capped: true });
          if (span[1] - span[0] > 1.7) {
            worldBatches.cableTrays.push({ x: (span[0] + span[1]) * 0.5, z: z + 0.24, width: span[1] - span[0] - 0.34, depth: 0.16 });
          }
        }
      }
      for (const run of [
        { x: MAP_W * 0.34, y: sceneWallHeight - 0.31, radius: 0.052, colour: [0.29, 0.36, 0.40] },
        { x: MAP_W * 0.68, y: sceneWallHeight - 0.39, radius: 0.043, colour: [0.49, 0.27, 0.10] }
      ]) {
        for (const span of openRunSegments('z', run.x, 0.7, MAP_H - 0.7)) {
          if (span[1] - span[0] < 1.2) continue;
          worldBatches.pipes.push({ x1: run.x, z1: span[0], x2: run.x, z2: span[1], y: run.y, radius: run.radius, colour: run.colour, capped: true, hangers: true });
        }
      }
    }

    for (let z = 2.5; z < MAP_H - 1; z += 4) {
      for (let x = 2.5; x < MAP_W - 1; x += 5) {
        if (!isWall(x, z) && !desertTheme) {
          worldBatches.lights.push({ x, z, warm: ((x + z) % 3) === 0 });
          worldBatches.ceilingPanels.push({ x, z });
        }
      }
    }

    for (let y = 1; y < MAP_H - 1; y++) {
      for (let x = 1; x < MAP_W - 1; x++) {
        if (MAP[y][x] !== '0') continue;
        const seed = (x * 31 + y * 17) % 17;
        if (!officeTheme && !summitTheme && !desertTheme && (seed === 0 || seed === 11)) worldBatches.grates.push({ x: x + 0.5, z: y + 0.5, yaw: (x + y) % 2 ? 0 : Math.PI / 2 });
        if (!officeTheme && !summitTheme && !desertTheme && (seed === 5 || ((x + y) % 11 === 0 && seed !== 3))) worldBatches.floorDecals.push({ x: x + 0.5, z: y + 0.5, yaw: ((x * 7 + y) % 4) * Math.PI / 2, kind: (x + y) % 2 });

        const neighbours = [
          { dx: 1, dz: 0, yaw: -Math.PI / 2 }, { dx: -1, dz: 0, yaw: Math.PI / 2 },
          { dx: 0, dz: 1, yaw: Math.PI }, { dx: 0, dz: -1, yaw: 0 }
        ];
        for (const n of neighbours) {
          if (MAP[y + n.dz][x + n.dx] === '0') continue;
          const wallX = x + 0.5 + n.dx * 0.486;
          const wallZ = y + 0.5 + n.dz * 0.486;
          if (officeTheme) {
            if (seed === 2 || seed === 7 || seed === 13) {
              worldBatches.wallPanels.push({ x: wallX, z: wallZ, yaw: n.yaw, variant: 20 + (seed % 3) });
            }
          } else if (summitTheme) {
            if (seed === 2 || seed === 7 || seed === 13 || seed === 4) {
              worldBatches.wallPanels.push({ x: wallX, z: wallZ, yaw: n.yaw, variant: 30 + (seed % 4) });
            }
          } else if (desertTheme) {
            if (seed === 2 || seed === 7 || seed === 13 || seed === 4 || seed === 14) {
              worldBatches.wallPanels.push({ x: wallX, z: wallZ, yaw: n.yaw, variant: 40 + (seed % 4) });
            }
          } else if (seed === 2 || seed === 7 || seed === 13) {
            worldBatches.wallPanels.push({ x: wallX, z: wallZ, yaw: n.yaw, variant: seed });
          } else if (seed === 4 || seed === 14) {
            worldBatches.vents.push({ x: wallX, z: wallZ, yaw: n.yaw });
          } else if (seed === 6) {
            worldBatches.warningLights.push({ x: wallX, z: wallZ, yaw: n.yaw, phase: x + y * 0.7 });
          } else if (seed === 8 || seed === 15) {
            worldBatches.conduits.push({ x: wallX, z: wallZ, yaw: n.yaw, variant: seed });
          } else if (seed === 9) {
            worldBatches.wallNumbers.push({ x: wallX, z: wallZ, yaw: n.yaw, digit: (x + y) % 5 });
          }
          break;
        }

        // Doorway/bulkhead frames sit around the outside of selected open cells;
        // the centre remains fully clear for the existing AI capsule.
        const horizontalCorridor = MAP[y][x - 1] === '0' && MAP[y][x + 1] === '0' && MAP[y - 1][x] !== '0' && MAP[y + 1][x] !== '0';
        const verticalCorridor = MAP[y - 1][x] === '0' && MAP[y + 1][x] === '0' && MAP[y][x - 1] !== '0' && MAP[y][x + 1] !== '0';
        if (!summitTheme && !desertTheme && (horizontalCorridor || verticalCorridor) && ((x * 5 + y * 3) % 13 === 0)) {
          worldBatches.bulkheads.push({ x: x + 0.5, z: y + 0.5, yaw: horizontalCorridor ? Math.PI / 2 : 0 });
        }
      }
    }

    // Distinct area treatments and landmarks make each route readable at a glance.
    for (const zone of LEVEL_ZONES.slice(0, -1)) {
      worldBatches.zoneFloors.push({
        x: (zone.x1 + zone.x2) * 0.5,
        z: (zone.z1 + zone.z2) * 0.5,
        width: zone.x2 - zone.x1,
        depth: zone.z2 - zone.z1,
        colour: zone.colour,
        light: zone.light
      });
      worldBatches.zoneBeacons.push({ x: zone.x1 + 0.8, z: zone.z1 + 0.8, colour: zone.light });
    }

    if (officeTheme) {
      worldBatches.lowCeilings.push({ x: 7.0, z: 5.2, width: 10.8, depth: 7.0, height: 2.58, colour: [0.72, 0.75, 0.76] });
      worldBatches.lowCeilings.push({ x: 29.0, z: 5.2, width: 10.8, depth: 7.0, height: 2.58, colour: [0.72, 0.75, 0.76] });
      worldBatches.lowCeilings.push({ x: 18.0, z: 18.5, width: 12.0, depth: 7.2, height: 2.62, colour: [0.67, 0.70, 0.72] });
      for (const rug of LEVEL_DECOR_LAYOUT.rugs || []) worldBatches.officeRugs.push({ ...rug });
      for (const screen of LEVEL_DECOR_LAYOUT.wallScreens || []) worldBatches.officeWallScreens.push({ ...screen });
      for (const glass of LEVEL_DECOR_LAYOUT.glassBands || []) worldBatches.officeGlassBands.push({ ...glass });
    } else if (!summitTheme && !desertTheme) {
      // Lower store and dock ceilings contrast with the tall central plant
      // hall. These are authored per arena so a ceiling can never hang over
      // a room it does not belong to.
      for (const ceiling of LEVEL_DECOR_LAYOUT.lowCeilings || []) worldBatches.lowCeilings.push({ ...ceiling });

      // Suspended catwalks are authored to span one bay wall-to-wall, so both
      // deck ends land on a partition face instead of stopping over a wall
      // column part way along.
      for (const walkway of LEVEL_DECOR_LAYOUT.walkways || []) worldBatches.walkways.push({ ...walkway });
      for (const walkway of worldBatches.walkways) {
        for (const side of [-1, 1]) {
          worldBatches.railings.push({ x1: walkway.x - walkway.width * 0.5 + 0.16, z1: walkway.z + side * walkway.depth * 0.42, x2: walkway.x + walkway.width * 0.5 - 0.16, z2: walkway.z + side * walkway.depth * 0.42, y: walkway.y + 0.24 });
        }
      }

      // Painted floor markings and authored service runs. Both are purely
      // visual: markings sit flush with the deck and pipe runs sit above head
      // height, so neither changes collision or navigation.
      for (const hazard of LEVEL_DECOR_LAYOUT.hazardZones || []) worldBatches.hazardZones.push({ ...hazard });
      for (const pipe of LEVEL_DECOR_LAYOUT.pipeRuns || []) worldBatches.pipes.push({ ...pipe, capped: true, hangers: true });
    }

    // Full collision cover cells become crates, machinery and a reactor core.
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (MAP[y][x] !== '2') continue;
        const cx = x + 0.5, cz = y + 0.5;
        if (x === 18 && y === 11) worldBatches.machines.push({ x: cx, z: cz, kind: 'reactor', colour: [0.16, 0.30, 0.19] });
        else if (y <= 8) worldBatches.containers.push({ x: cx, z: cz, yaw: (x + y) % 2 ? 0 : Math.PI / 2, colour: x < MAP_W / 2 ? [0.20, 0.28, 0.32] : [0.30, 0.22, 0.17] });
        else if (y >= 15) worldBatches.tanks.push({ x: cx, z: cz, colour: x < MAP_W / 2 ? [0.30, 0.20, 0.12] : [0.22, 0.16, 0.28] });
        else worldBatches.machines.push({ x: cx, z: cz, kind: 'console', colour: [0.12, 0.20, 0.24] });
      }
    }

    // Signature machinery and room dressing are sourced from the shared
    // collision layout in 00-core.js. This prevents visual props from drifting
    // away from the footprints used by movement and pathfinding.
    for (const prop of LEVEL_PROP_LAYOUT.machines) worldBatches.machines.push({ ...prop, z: prop.y });
    for (const prop of LEVEL_PROP_LAYOUT.containers) worldBatches.containers.push({ ...prop, z: prop.y });
    for (const prop of LEVEL_PROP_LAYOUT.tanks) worldBatches.tanks.push({ ...prop, z: prop.y });
    for (const prop of LEVEL_PROP_LAYOUT.doors) worldBatches.doors.push({ ...prop, z: prop.y });
    for (const prop of LEVEL_PROP_LAYOUT.stairs) worldBatches.stairs.push({ ...prop, z: prop.y });

    for (const spawn of spawnPoints[TEAM_BLUE]) worldBatches.signs.push({ x: spawn.x, z: spawn.y, team: TEAM_BLUE });
    for (const spawn of spawnPoints[TEAM_RED]) worldBatches.signs.push({ x: spawn.x, z: spawn.y, team: TEAM_RED });
  }

  function showRendererFailure(error) {
    console.error(error);
    document.body.dataset.renderer = 'error';
    showStatus('3D RENDERER UNAVAILABLE');
    const desc = document.querySelector('.mapTag .desc');
    if (desc) desc.textContent = 'WebGL could not initialise on this device';
  }

  function initWebGL() {
    try {
      gl = canvas.getContext('webgl2', {
        alpha: false,
        antialias: true,
        depth: true,
        stencil: false,
        powerPreference: 'high-performance'
      }) || canvas.getContext('webgl', {
        alpha: false,
        antialias: true,
        depth: true,
        stencil: false,
        powerPreference: 'high-performance'
      });
      if (!gl) throw new Error('This browser does not expose a WebGL context.');

      glProgram = createProgram();
      gl.useProgram(glProgram);
      glLocations.position = gl.getAttribLocation(glProgram, 'aPosition');
      glLocations.normal = gl.getAttribLocation(glProgram, 'aNormal');
      glLocations.projection = gl.getUniformLocation(glProgram, 'uProjection');
      glLocations.view = gl.getUniformLocation(glProgram, 'uView');
      glLocations.model = gl.getUniformLocation(glProgram, 'uModel');
      glLocations.colour = gl.getUniformLocation(glProgram, 'uColour');
      glLocations.cameraPosition = gl.getUniformLocation(glProgram, 'uCameraPosition');
      glLocations.fogColour = gl.getUniformLocation(glProgram, 'uFogColour');
      glLocations.emissive = gl.getUniformLocation(glProgram, 'uEmissive');
      glLocations.alpha = gl.getUniformLocation(glProgram, 'uAlpha');
      glLocations.surface = gl.getUniformLocation(glProgram, 'uSurface');
      glLocations.roughness = gl.getUniformLocation(glProgram, 'uRoughness');
      glLocations.time = gl.getUniformLocation(glProgram, 'uTime');

      // The locations must exist before the mesh buffers configure attributes.
      glMeshes.cube = makeCubeMesh();
      glMeshes.roundedBox = makeRoundedBoxMesh(14, 9, 0.42);
      glMeshes.softRoundedBox = makeRoundedBoxMesh(16, 10, 0.62);
      glMeshes.operatorTorso = makeOperatorTorsoMesh(16);
      glMeshes.operatorPelvis = makeOperatorPelvisMesh(16);
      glMeshes.operatorCarrier = makeOperatorCarrierMesh(16);
      glMeshes.operatorShoulderPad = makeOperatorShoulderPadMesh(16);
      glMeshes.operatorGlove = makeOperatorGloveMesh(14);
      glMeshes.operatorJointPad = makeOperatorJointPadMesh(14);
      glMeshes.operatorBoot = makeOperatorBootMesh(14);
      glMeshes.operatorHead = makeOperatorHeadMesh(20);
      glMeshes.operatorHelmet = makeOperatorHelmetMesh(20);
      glMeshes.operatorFaceCover = makeOperatorFaceCoverMesh(16);
      glMeshes.taperedCapsule = makeTaperedCapsuleMesh(14);
      glMeshes.sphere = makeSphereMesh(18, 12);
      glMeshes.cylinder = makeCylinderMesh(12);
      glMeshes.disc = makeDiscMesh(28, 0);
      glMeshes.ring = makeDiscMesh(32, 0.72);
      buildWorldBatches();

      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
      gl.clearColor(0.028, 0.044, 0.056, 1);
      glReady = true;
      document.body.dataset.renderer = 'webgl';
    } catch (error) {
      showRendererFailure(error);
    }
  }

  function portraitWindowedRenderMode() {
    return (appState === 'match' || appState === 'free-roam') && viewMode === 'windowed' && window.innerHeight >= window.innerWidth;
  }

  function renderDprCap() {
    if (portraitWindowedRenderMode()) return 1.35;
    if (viewMode === 'maximized') return 1.55;
    return 1.65;
  }

  function resize() {
    const nativeDpr = Math.max(1, Number(window.devicePixelRatio) || 1);
    const cap = renderDprCap();
    DPR = Math.max(0.82, Math.min(cap, nativeDpr) * clamp(renderResolutionScale, 0.72, 1));
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(canvas.clientWidth || rect.width || innerWidth));
    const h = Math.max(1, Math.round(canvas.clientHeight || rect.height || innerHeight));
    if (glReady) {
      const pixelWidth = Math.floor(w * DPR);
      const pixelHeight = Math.floor(h * DPR);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      mat4Perspective(glProjection, FOV, w / h, 0.025, GL_FAR);
    }
  }

  function spawnTracer(shooter, target, options = {}) {
    if (!shooter || !target) return;
    const miss = Boolean(options.miss);
    const headshot = Boolean(options.headshot);
    const spread = miss ? 0.28 : 0.025;
    const targetHeight = headshot
      ? 1.68 - (target.crouched ? 0.43 : 0)
      : 1.24 - (target.crouched ? 0.38 : 0);
    const shooterElevation = arenaElevationAt(shooter.x, shooter.y);
    const targetElevation = arenaElevationAt(target.x, target.y);
    tracers.push({
      x1: shooter.x, y1: shooterElevation + 1.30 - (shooter.crouched ? 0.43 : 0), z1: shooter.y,
      x2: target.x + (Math.random() - 0.5) * spread,
      y2: targetElevation + targetHeight + (Math.random() - 0.5) * spread * 0.55,
      z2: target.y + (Math.random() - 0.5) * spread,
      team: shooter.team,
      life: 0.085,
      maxLife: 0.085
    });
    if (tracers.length > 28) tracers.splice(0, tracers.length - 28);
  }

  function updateTracers(dt) {
    for (const tracer of tracers) tracer.life -= dt;
    for (let i = tracers.length - 1; i >= 0; i--) if (tracers[i].life <= 0) tracers.splice(i, 1);
  }

  function drawGroundGlow(x, z, sx, sz, colour, alpha, yaw = 0, emissive = 0.0) {
    mat4TRS(glModel, x, 0.010, z, yaw, 0, 0, sx, 1, sz);
    drawMesh(glMeshes.disc, colour, glModel, emissive, alpha, 4, 0.08);
  }

  function summitStairRailGeometry(ramp, profile = arenaVerticalProfile()) {
    const endpoints = [
      { x: Number(ramp.x1), z: Number(ramp.z1), elevation: Number(ramp.elevation1) || 0 },
      { x: Number(ramp.x2), z: Number(ramp.z2), elevation: Number(ramp.elevation2) || 0 }
    ];
    const highIndex = endpoints[1].elevation >= endpoints[0].elevation ? 1 : 0;
    const high = endpoints[highIndex];
    const low = endpoints[1 - highIndex];
    const highElevation = high.elevation;
    const platforms = Array.isArray(profile?.platforms) ? profile.platforms : [];
    const platform = platforms.find(candidate => {
      const elevation = Number(candidate.elevation) || 0;
      return Math.abs(elevation - highElevation) <= 0.04
        && high.x >= Number(candidate.x1) - 0.8 && high.x <= Number(candidate.x2) + 0.8
        && high.z >= Number(candidate.z1) - 0.8 && high.z <= Number(candidate.z2) + 0.8;
    }) || null;
    const width = Number(ramp.width) || 1;
    const sideOffset = Math.max(0.55, width * 0.50 + 0.05);
    const yaw = Math.atan2(high.x - low.x, high.z - low.z);
    if (!platform) return {
      rampId: ramp.id,
      low,
      high,
      join: { x: high.x, z: high.z },
      edge: null,
      edgeAxis: null,
      platformId: null,
      sideOffset,
      yaw,
      highElevation
    };

    const x1 = Number(platform.x1);
    const x2 = Number(platform.x2);
    const z1 = Number(platform.z1);
    const z2 = Number(platform.z2);
    const inside = point => point.x >= x1 && point.x <= x2 && point.z >= z1 && point.z <= z2;
    let outsideT = 0;
    let insideT = 1;
    if (inside(low)) outsideT = 1;
    else {
      for (let index = 0; index < 24; index++) {
        const t = (outsideT + insideT) * 0.5;
        const point = { x: lerp(low.x, high.x, t), z: lerp(low.z, high.z, t) };
        if (inside(point)) insideT = t;
        else outsideT = t;
      }
    }
    const boundary = { x: lerp(low.x, high.x, insideT), z: lerp(low.z, high.z, insideT) };
    const edgeDistances = [
      { edge: 'north', distance: Math.abs(boundary.z - z1) },
      { edge: 'south', distance: Math.abs(boundary.z - z2) },
      { edge: 'west', distance: Math.abs(boundary.x - x1) },
      { edge: 'east', distance: Math.abs(boundary.x - x2) }
    ].sort((a, b) => a.distance - b.distance);
    const edge = edgeDistances[0].edge;
    const inset = 0.10;
    let joinX = boundary.x;
    let joinZ = boundary.z;
    let t = insideT;
    if (edge === 'north' || edge === 'south') {
      joinZ = edge === 'north' ? z1 + inset : z2 - inset;
      if (Math.abs(high.z - low.z) > 0.0001) t = clamp((joinZ - low.z) / (high.z - low.z), 0, 1);
      joinX = lerp(low.x, high.x, t);
    } else {
      joinX = edge === 'west' ? x1 + inset : x2 - inset;
      if (Math.abs(high.x - low.x) > 0.0001) t = clamp((joinX - low.x) / (high.x - low.x), 0, 1);
      joinZ = lerp(low.z, high.z, t);
    }
    return {
      rampId: ramp.id,
      low,
      high,
      join: { x: joinX, z: joinZ },
      edge,
      edgeAxis: edge === 'north' || edge === 'south' ? 'x' : 'z',
      platformId: platform.id,
      sideOffset,
      yaw,
      highElevation
    };
  }

  function summitPlatformRailSegments(profile = arenaVerticalProfile()) {
    if (!profile?.platforms?.length) return [];
    const ramps = Array.isArray(profile.ramps) ? profile.ramps : [];
    const segments = [];
    const splitRange = (start, end, gaps, minimum = 0.34) => {
      let ranges = [[Math.min(start, end), Math.max(start, end)]];
      for (const gap of gaps) {
        const next = [];
        for (const range of ranges) {
          if (gap.end <= range[0] || gap.start >= range[1]) { next.push(range); continue; }
          if (gap.start - range[0] >= minimum) next.push([range[0], Math.max(range[0], gap.start)]);
          if (range[1] - gap.end >= minimum) next.push([Math.min(range[1], gap.end), range[1]]);
        }
        ranges = next;
      }
      return ranges.filter(range => range[1] - range[0] >= minimum);
    };
    for (const platform of profile.platforms) {
      const x1 = Number(platform.x1);
      const x2 = Number(platform.x2);
      const z1 = Number(platform.z1);
      const z2 = Number(platform.z2);
      const elevation = Number(platform.elevation) || 0;
      const stairMouths = [];
      for (const ramp of ramps) {
        const topIsEnd = Math.abs((Number(ramp.elevation2) || 0) - elevation) <= 0.04;
        const topIsStart = Math.abs((Number(ramp.elevation1) || 0) - elevation) <= 0.04;
        if (!topIsEnd && !topIsStart) continue;
        const rail = summitStairRailGeometry(ramp, profile);
        if (rail.platformId !== platform.id || !rail.edgeAxis) continue;
        stairMouths.push({ id: ramp.id, x: rail.join.x, z: rail.join.z, half: rail.sideOffset, edgeAxis: rail.edgeAxis });
      }
      const manualOpenings = (Array.isArray(platform.railOpenings) ? platform.railOpenings : [])
        .map(opening => ({
          id: String(opening.id || 'platform-opening'),
          edge: String(opening.edge || ''),
          start: Number(opening.start),
          end: Number(opening.end)
        }))
        .filter(opening => ['north', 'south', 'west', 'east'].includes(opening.edge)
          && Number.isFinite(opening.start) && Number.isFinite(opening.end) && opening.end > opening.start);
      const edgeDefs = [
        { edge: 'north', axis: 'x', fixed: z1 + 0.10, start: x1 + 0.20, end: x2 - 0.20, distance: mouth => Math.abs(mouth.z - z1), value: mouth => mouth.x },
        { edge: 'south', axis: 'x', fixed: z2 - 0.10, start: x1 + 0.20, end: x2 - 0.20, distance: mouth => Math.abs(mouth.z - z2), value: mouth => mouth.x },
        { edge: 'west', axis: 'z', fixed: x1 + 0.10, start: z1 + 0.20, end: z2 - 0.20, distance: mouth => Math.abs(mouth.x - x1), value: mouth => mouth.z },
        { edge: 'east', axis: 'z', fixed: x2 - 0.10, start: z1 + 0.20, end: z2 - 0.20, distance: mouth => Math.abs(mouth.x - x2), value: mouth => mouth.z }
      ];
      for (const edge of edgeDefs) {
        const stairGaps = stairMouths
          .filter(mouth => mouth.edgeAxis === edge.axis && edge.distance(mouth) <= 0.82 && edge.value(mouth) >= edge.start - 0.3 && edge.value(mouth) <= edge.end + 0.3)
          .map(mouth => ({ id: mouth.id, start: edge.value(mouth) - mouth.half, end: edge.value(mouth) + mouth.half }));
        const edgeOpenings = manualOpenings
          .filter(opening => opening.edge === edge.edge)
          .map(opening => ({
            id: opening.id,
            start: clamp(opening.start, edge.start, edge.end),
            end: clamp(opening.end, edge.start, edge.end)
          }))
          .filter(opening => opening.end > opening.start);
        const splitGaps = [...stairGaps, ...edgeOpenings];
        for (const range of splitRange(edge.start, edge.end, splitGaps)) {
          const segment = edge.axis === 'x'
            ? { x1: range[0], z1: edge.fixed, x2: range[1], z2: edge.fixed }
            : { x1: edge.fixed, z1: range[0], x2: edge.fixed, z2: range[1] };
          segments.push({
            ...segment,
            platformId: platform.id,
            edge: edge.edge,
            elevation,
            stairGaps: stairGaps.map(gap => gap.id),
            stairGapRanges: stairGaps.map(gap => ({ id: gap.id, start: gap.start, end: gap.end })),
            railOpenings: edgeOpenings.map(opening => ({ id: opening.id, start: opening.start, end: opening.end }))
          });
        }
      }
    }
    return segments;
  }

  function summitStairLandingGeometry(ramp, profile = arenaVerticalProfile()) {
    const rail = summitStairRailGeometry(ramp, profile);
    const width = Number(ramp.width) || 1;
    const stairWidth = width * 0.96;
    const landingLength = Math.max(0.16, Math.hypot(rail.high.x - rail.join.x, rail.high.z - rail.join.z));
    return {
      ...rail,
      stairWidth,
      landingLength,
      landingCentre: {
        x: (rail.join.x + rail.high.x) * 0.5,
        z: (rail.join.z + rail.high.z) * 0.5
      }
    };
  }

  function subtractSummitSupportRect(rect, cut) {
    const ix1 = Math.max(rect.x1, cut.x1);
    const iz1 = Math.max(rect.z1, cut.z1);
    const ix2 = Math.min(rect.x2, cut.x2);
    const iz2 = Math.min(rect.z2, cut.z2);
    if (ix2 <= ix1 || iz2 <= iz1) return [rect];
    const pieces = [];
    if (rect.z1 < iz1) pieces.push({ x1: rect.x1, z1: rect.z1, x2: rect.x2, z2: iz1 });
    if (iz2 < rect.z2) pieces.push({ x1: rect.x1, z1: iz2, x2: rect.x2, z2: rect.z2 });
    if (rect.x1 < ix1) pieces.push({ x1: rect.x1, z1: iz1, x2: ix1, z2: iz2 });
    if (ix2 < rect.x2) pieces.push({ x1: ix2, z1: iz1, x2: rect.x2, z2: iz2 });
    return pieces.filter(piece => piece.x2 - piece.x1 >= 0.055 && piece.z2 - piece.z1 >= 0.055);
  }

  function summitPlatformSupportGeometry(profile = arenaVerticalProfile()) {
    if (!profile?.platforms?.length) return { blocks: [], openings: [], fasciaSegments: [] };
    const ramps = Array.isArray(profile.ramps) ? profile.ramps : [];
    const railSegments = summitPlatformRailSegments(profile);
    const blocks = [];
    const openings = [];
    const fasciaSegments = [];
    for (const platform of profile.platforms) {
      const px1 = Number(platform.x1);
      const px2 = Number(platform.x2);
      const pz1 = Number(platform.z1);
      const pz2 = Number(platform.z2);
      const base = { x1: px1 + 0.055, z1: pz1 + 0.055, x2: px2 - 0.055, z2: pz2 - 0.055 };
      const cuts = [];
      for (const ramp of ramps) {
        const landing = summitStairLandingGeometry(ramp, profile);
        if (landing.platformId !== platform.id || !landing.edge) continue;
        const mouthHalf = landing.stairWidth * 0.5 + 0.10;
        let cut = null;
        if (landing.edge === 'south') {
          const depth = clamp(pz2 - landing.high.z + 0.24, 0.42, 1.20);
          cut = { x1: landing.join.x - mouthHalf, z1: pz2 - depth, x2: landing.join.x + mouthHalf, z2: pz2 + 0.01 };
        } else if (landing.edge === 'north') {
          const depth = clamp(landing.high.z - pz1 + 0.24, 0.42, 1.20);
          cut = { x1: landing.join.x - mouthHalf, z1: pz1 - 0.01, x2: landing.join.x + mouthHalf, z2: pz1 + depth };
        } else if (landing.edge === 'west') {
          const depth = clamp(landing.high.x - px1 + 0.24, 0.42, 1.20);
          cut = { x1: px1 - 0.01, z1: landing.join.z - mouthHalf, x2: px1 + depth, z2: landing.join.z + mouthHalf };
        } else if (landing.edge === 'east') {
          const depth = clamp(px2 - landing.high.x + 0.24, 0.42, 1.20);
          cut = { x1: px2 - depth, z1: landing.join.z - mouthHalf, x2: px2 + 0.01, z2: landing.join.z + mouthHalf };
        }
        if (!cut) continue;
        cut = {
          x1: clamp(cut.x1, base.x1, base.x2),
          z1: clamp(cut.z1, base.z1, base.z2),
          x2: clamp(cut.x2, base.x1, base.x2),
          z2: clamp(cut.z2, base.z1, base.z2)
        };
        cuts.push(cut);
        openings.push({
          rampId: ramp.id,
          platformId: platform.id,
          edge: landing.edge,
          x1: cut.x1,
          z1: cut.z1,
          x2: cut.x2,
          z2: cut.z2,
          stairHalf: landing.stairWidth * 0.5,
          mouthHalf
        });
      }
      let platformBlocks = [base];
      for (const cut of cuts) platformBlocks = platformBlocks.flatMap(block => subtractSummitSupportRect(block, cut));
      for (const block of platformBlocks) blocks.push({ ...block, platformId: platform.id });

      for (const segment of railSegments.filter(item => item.platformId === platform.id)) {
        const edge = segment.edge;
        if (edge === 'north' || edge === 'south') {
          fasciaSegments.push({
            platformId: platform.id,
            edge,
            x1: segment.x1,
            x2: segment.x2,
            z1: edge === 'north' ? pz1 + 0.045 : pz2 - 0.045,
            z2: edge === 'north' ? pz1 + 0.045 : pz2 - 0.045
          });
        } else {
          fasciaSegments.push({
            platformId: platform.id,
            edge,
            x1: edge === 'west' ? px1 + 0.045 : px2 - 0.045,
            x2: edge === 'west' ? px1 + 0.045 : px2 - 0.045,
            z1: segment.z1,
            z2: segment.z2
          });
        }
      }
    }
    return { blocks, openings, fasciaSegments };
  }

  function drawSummitGuardrailSegment(segment) {
    const dx = segment.x2 - segment.x1;
    const dz = segment.z2 - segment.z1;
    const length = Math.hypot(dx, dz);
    if (length < 0.30) return;
    const elevation = Number(segment.elevation) || 0;
    const topY = elevation + 0.86;
    const midY = elevation + 0.48;
    const baseY = elevation + 0.07;
    const colour = [0.16, 0.38, 0.42];
    const accent = [0.28, 0.72, 0.76];
    const a = { x: segment.x1, z: segment.z1 };
    const b = { x: segment.x2, z: segment.z2 };
    drawSegment({ ...a, y: topY }, { ...b, y: topY }, 0.026, colour, 0.035, 1, 3, 0.30);
    drawSegment({ ...a, y: midY }, { ...b, y: midY }, 0.017, accent, 0.045, 0.90, 3, 0.28);
    drawSegment({ ...a, y: baseY + 0.08 }, { ...b, y: baseY + 0.08 }, 0.020, colour, 0.02, 1, 3, 0.34);
    const postCount = Math.max(2, Math.ceil(length / 1.25) + 1);
    const posts = [];
    for (let index = 0; index < postCount; index++) {
      const t = postCount === 1 ? 0 : index / (postCount - 1);
      const post = { x: lerp(a.x, b.x, t), z: lerp(a.z, b.z, t) };
      posts.push(post);
      drawSegment({ ...post, y: elevation + 0.04 }, { ...post, y: topY }, 0.021, colour, 0.02, 1, 3, 0.30);
    }
    setBlendMode(true);
    for (let index = 0; index < posts.length - 1; index++) {
      const p1 = posts[index];
      const p2 = posts[index + 1];
      const panelLength = Math.hypot(p2.x - p1.x, p2.z - p1.z);
      const panelYaw = Math.atan2(p2.z - p1.z, p2.x - p1.x);
      mat4TRS(glModel, (p1.x + p2.x) * 0.5, elevation + 0.47, (p1.z + p2.z) * 0.5, -panelYaw, 0, 0, panelLength * 0.92, 0.48, 0.018);
      drawMesh(glMeshes.cube, [0.28, 0.70, 0.74], glModel, 0.10, 0.16, 4, 0.08);
    }
    setBlendMode(false);
  }

  function drawSummitStairRails(ramp) {
    const landing = summitStairLandingGeometry(ramp, arenaVerticalProfile());
    const low = landing.low;
    const join = landing.join;
    const highElevation = Number(landing.highElevation) || 0;
    const yaw = landing.yaw;
    const sideOffset = landing.sideOffset;
    const colour = [0.15, 0.35, 0.39];
    const highlight = String(ramp.id || '').includes('east') ? [0.92, 0.54, 0.20] : [0.20, 0.68, 0.72];
    const runLength = Math.hypot(join.x - low.x, join.z - low.z);
    const postCount = Math.max(4, Math.ceil(runLength / 0.48) + 1);
    const edgeTangent = landing.edgeAxis === 'x' ? { x: 1, z: 0 } : { x: 0, z: 1 };
    for (const side of [-1, 1]) {
      const start = localToWorld(low.x, low.z, yaw, side * sideOffset, 0);
      const end = localToWorld(join.x, join.z, yaw, side * sideOffset, 0);
      const landingReturn = localToWorld(join.x, join.z, yaw, side * sideOffset, 0.14);
      drawSegment({ x: start.x, y: low.elevation + 0.84, z: start.z }, { x: end.x, y: highElevation + 0.86, z: end.z }, 0.024, colour, 0.03, 1, 3, 0.30);
      drawSegment({ x: start.x, y: low.elevation + 0.42, z: start.z }, { x: end.x, y: highElevation + 0.48, z: end.z }, 0.015, highlight, 0.06, 0.92, 3, 0.28);
      drawSegment({ x: start.x, y: low.elevation + 0.13, z: start.z }, { x: end.x, y: highElevation + 0.15, z: end.z }, 0.028, colour, 0.015, 1, 3, 0.36);

      // Short level returns make the sloping rails visibly enter the landing
      // rather than appearing to stop just before the platform edge.
      drawSegment({ x: end.x, y: highElevation + 0.86, z: end.z }, { x: landingReturn.x, y: highElevation + 0.86, z: landingReturn.z }, 0.026, colour, 0.035, 1, 3, 0.30);
      drawSegment({ x: end.x, y: highElevation + 0.48, z: end.z }, { x: landingReturn.x, y: highElevation + 0.48, z: landingReturn.z }, 0.017, highlight, 0.05, 0.92, 3, 0.28);
      drawSegment({ x: end.x, y: highElevation + 0.15, z: end.z }, { x: landingReturn.x, y: highElevation + 0.15, z: landingReturn.z }, 0.020, colour, 0.02, 1, 3, 0.34);

      // The platform segment and the stair rail meet at a T-junction. A small
      // overlap along the platform edge removes visible line-cap gaps without
      // narrowing the usable stair opening or introducing collision.
      if (landing.edgeAxis) {
        const overlap = 0.105;
        const a = { x: end.x - edgeTangent.x * overlap, z: end.z - edgeTangent.z * overlap };
        const b = { x: end.x + edgeTangent.x * overlap, z: end.z + edgeTangent.z * overlap };
        drawSegment({ ...a, y: highElevation + 0.86 }, { ...b, y: highElevation + 0.86 }, 0.027, colour, 0.035, 1, 3, 0.30);
        drawSegment({ ...a, y: highElevation + 0.48 }, { ...b, y: highElevation + 0.48 }, 0.018, highlight, 0.05, 0.92, 3, 0.28);
        drawSegment({ ...a, y: highElevation + 0.15 }, { ...b, y: highElevation + 0.15 }, 0.021, colour, 0.02, 1, 3, 0.34);
      }

      // The platform guardrail draws the shared newel at t=1. Stair posts stop
      // short of that point, avoiding doubled posts while the return rails
      // overlap the existing newel and remain visually continuous.
      for (let index = 0; index < postCount - 1; index++) {
        const t = index / (postCount - 1);
        const centreX = lerp(low.x, join.x, t);
        const centreZ = lerp(low.z, join.z, t);
        const post = localToWorld(centreX, centreZ, yaw, side * sideOffset, 0);
        const elevation = lerp(low.elevation, highElevation, t);
        drawSegment({ x: post.x, y: elevation + 0.04, z: post.z }, { x: post.x, y: elevation + 0.84, z: post.z }, 0.019, colour, 0.02, 1, 3, 0.30);
      }
    }
  }

  function summitVisualPresentationSnapshot() {
    const arena = arenaMeta('summit');
    const profile = arenaVerticalSnapshot('summit');
    const railSegments = summitPlatformRailSegments(profile);
    const support = summitPlatformSupportGeometry(profile);
    const stairMouths = new Set();
    for (const segment of railSegments) for (const gap of segment.stairGaps || []) stairMouths.add(gap);
    const stairRailJoins = (profile.ramps || []).map(ramp => {
      const rail = summitStairRailGeometry(ramp, profile);
      const segment = railSegments.find(item => item.platformId === rail.platformId
        && item.edge === rail.edge
        && (item.stairGaps || []).includes(ramp.id));
      const range = segment?.stairGapRanges?.find(gap => gap.id === ramp.id) || null;
      const value = rail.edgeAxis === 'x' ? rail.join.x : rail.join.z;
      const fixed = rail.edgeAxis === 'x' ? rail.join.z : rail.join.x;
      const segmentFixed = segment
        ? (rail.edgeAxis === 'x' ? segment.z1 : segment.x1)
        : NaN;
      const endpointError = range
        ? Math.max(Math.abs(range.start - (value - rail.sideOffset)), Math.abs(range.end - (value + rail.sideOffset)))
        : Infinity;
      const landing = summitStairLandingGeometry(ramp, profile);
      const opening = (support.openings || []).find(item => item.rampId === ramp.id) || null;
      const landingPlatform = (profile.platforms || []).find(platform => platform.id === rail.platformId) || null;
      const desiredHalf = landing.stairWidth * 0.5 + 0.10;
      const supportMinimum = rail.edgeAxis === 'x' ? Number(landingPlatform?.x1) + 0.055 : Number(landingPlatform?.z1) + 0.055;
      const supportMaximum = rail.edgeAxis === 'x' ? Number(landingPlatform?.x2) - 0.055 : Number(landingPlatform?.z2) - 0.055;
      const expectedStart = clamp(value - desiredHalf, supportMinimum, supportMaximum);
      const expectedEnd = clamp(value + desiredHalf, supportMinimum, supportMaximum);
      const openingStart = opening ? (rail.edgeAxis === 'x' ? opening.x1 : opening.z1) : NaN;
      const openingEnd = opening ? (rail.edgeAxis === 'x' ? opening.x2 : opening.z2) : NaN;
      const supportCentreError = opening && Number.isFinite(expectedStart) && Number.isFinite(expectedEnd)
        ? Math.abs((openingStart + openingEnd) * 0.5 - (expectedStart + expectedEnd) * 0.5)
        : Infinity;
      const supportWidthError = opening && Number.isFinite(expectedStart) && Number.isFinite(expectedEnd)
        ? Math.max(Math.abs(openingStart - expectedStart), Math.abs(openingEnd - expectedEnd))
        : Infinity;
      return {
        rampId: ramp.id,
        platformId: rail.platformId,
        edge: rail.edge,
        join: { x: Number(rail.join.x.toFixed(3)), z: Number(rail.join.z.toFixed(3)) },
        sideOffset: Number(rail.sideOffset.toFixed(3)),
        stairWidth: Number(landing.stairWidth.toFixed(3)),
        landingLength: Number(landing.landingLength.toFixed(3)),
        railReturnLength: 0.14,
        fixedError: Number.isFinite(segmentFixed) ? Number(Math.abs(segmentFixed - fixed).toFixed(5)) : null,
        endpointError: Number.isFinite(endpointError) ? Number(endpointError.toFixed(5)) : null,
        supportCentreError: Number.isFinite(supportCentreError) ? Number(supportCentreError.toFixed(5)) : null,
        supportWidthError: Number.isFinite(supportWidthError) ? Number(supportWidthError.toFixed(5)) : null,
        connected: Boolean(range && Math.abs(segmentFixed - fixed) <= 0.001 && endpointError <= 0.001),
        supportAligned: Boolean(opening && supportCentreError <= 0.001 && supportWidthError <= 0.001 && landing.landingLength >= 0.16)
      };
    });
    return {
      theme: arena.theme,
      floorBase: '#586a70',
      zoneOverlayBlend: true,
      platformCount: profile.platforms.length,
      rampCount: profile.ramps.length,
      deckJoinCount: Array.isArray(profile.joins) ? profile.joins.length : 0,
      railSegmentCount: railSegments.length,
      stairMouthGapCount: stairMouths.size,
      supportBlockCount: support.blocks.length,
      supportOpeningCount: support.openings.length,
      fasciaSegmentCount: support.fasciaSegments.length,
      stairRailJoins,
      supportOpenings: support.openings.map(opening => ({
        rampId: opening.rampId,
        platformId: opening.platformId,
        edge: opening.edge,
        width: Number((opening.edge === 'north' || opening.edge === 'south' ? opening.x2 - opening.x1 : opening.z2 - opening.z1).toFixed(3)),
        depth: Number((opening.edge === 'north' || opening.edge === 'south' ? opening.z2 - opening.z1 : opening.x2 - opening.x1).toFixed(3))
      })),
      railSegments: railSegments.map(segment => ({
        platformId: segment.platformId,
        edge: segment.edge,
        length: Number(Math.hypot(segment.x2 - segment.x1, segment.z2 - segment.z1).toFixed(3)),
        stairGaps: segment.stairGaps.slice(),
        stairGapRanges: (segment.stairGapRanges || []).map(gap => ({ ...gap })),
        railOpenings: (segment.railOpenings || []).map(opening => ({ ...opening }))
      }))
    };
  }

  function drawArenaVerticalGeometry() {
    const profile = arenaVerticalProfile();
    const summitTheme = activeArenaMeta().theme === 'summit';
    if (!profile) return;
    const summitSupport = summitTheme ? summitPlatformSupportGeometry(profile) : null;
    for (const platform of profile.platforms || []) {
      const width = Math.max(0.1, Number(platform.x2) - Number(platform.x1));
      const depth = Math.max(0.1, Number(platform.z2) - Number(platform.z1));
      const x = (Number(platform.x1) + Number(platform.x2)) * 0.5;
      const z = (Number(platform.z1) + Number(platform.z2)) * 0.5;
      const elevation = Number(platform.elevation) || 0;
      const thickness = Number(platform.thickness) || 0.14;
      const upper = String(platform.id || '').includes('gallery');
      const supportHeight = Math.max(0.04, elevation - thickness);

      // Elevated decks remain structurally grounded, but Summit support is
      // segmented around every stair bay. This avoids a full rectangular
      // plinth protruding into the staircase and makes the underside line up
      // with the authored stair width and landing opening.
      if (supportHeight > 0.045) {
        const supportColour = summitTheme ? (upper ? [0.16, 0.24, 0.27] : [0.19, 0.27, 0.29]) : (upper ? [0.075, 0.105, 0.115] : [0.11, 0.095, 0.075]);
        const panelColour = summitTheme ? (upper ? [0.22, 0.40, 0.43] : [0.28, 0.36, 0.38]) : (upper ? [0.13, 0.17, 0.18] : [0.17, 0.145, 0.11]);
        if (summitTheme) {
          for (const block of (summitSupport?.blocks || []).filter(item => item.platformId === platform.id)) {
            const blockWidth = block.x2 - block.x1;
            const blockDepth = block.z2 - block.z1;
            mat4TRS(glModel, (block.x1 + block.x2) * 0.5, supportHeight * 0.5, (block.z1 + block.z2) * 0.5, 0, 0, 0, blockWidth, supportHeight, blockDepth);
            drawMesh(glMeshes.cube, supportColour, glModel, 0.012, 1, 3, 0.58);
          }
          for (const fascia of (summitSupport?.fasciaSegments || []).filter(item => item.platformId === platform.id)) {
            const fasciaWidth = Math.max(0.035, Math.hypot(fascia.x2 - fascia.x1, fascia.z2 - fascia.z1));
            const fasciaYaw = Math.atan2(fascia.z2 - fascia.z1, fascia.x2 - fascia.x1);
            mat4TRS(glModel, (fascia.x1 + fascia.x2) * 0.5, supportHeight * 0.53, (fascia.z1 + fascia.z2) * 0.5, -fasciaYaw, 0, 0, fasciaWidth, supportHeight * 0.72, 0.035);
            drawMesh(glMeshes.cube, panelColour, glModel, 0.006, 1, 3, 0.54);
          }
        } else {
          mat4TRS(glModel, x, supportHeight * 0.5, z, 0, 0, 0, width * 0.985, supportHeight, depth * 0.985);
          drawMesh(glMeshes.cube, supportColour, glModel, 0.005, 1, 3, 0.72);
          for (const edgeZ of [Number(platform.z1) + 0.045, Number(platform.z2) - 0.045]) {
            mat4TRS(glModel, x, supportHeight * 0.53, edgeZ, 0, 0, 0, width * 0.90, supportHeight * 0.72, 0.035);
            drawMesh(glMeshes.cube, panelColour, glModel, 0.006, 1, 3, 0.54);
          }
        }
      }

      mat4TRS(glModel, x, elevation - thickness * 0.5, z, 0, 0, 0, width, thickness, depth);
      drawMesh(glMeshes.cube, summitTheme ? (upper ? [0.55, 0.64, 0.66] : [0.48, 0.59, 0.62]) : (upper ? [0.17, 0.22, 0.24] : [0.22, 0.20, 0.17]), glModel, summitTheme ? 0.025 : 0.015, 1, 3, summitTheme ? 0.72 : 0.42);
      const topWidth = summitTheme ? Math.max(0.1, width - 0.06) : width * 0.98;
      const topDepth = summitTheme ? Math.max(0.1, depth - 0.06) : depth * 0.98;
      mat4TRS(glModel, x, elevation + 0.012, z, 0, 0, 0, topWidth, 0.018, topDepth);
      drawMesh(glMeshes.cube, summitTheme ? (upper ? [0.70, 0.78, 0.79] : [0.64, 0.73, 0.75]) : (upper ? [0.28, 0.34, 0.35] : [0.34, 0.30, 0.24]), glModel, summitTheme ? 0.035 : 0.018, 1, 3, summitTheme ? 0.84 : 0.34);
      if (!summitTheme) {
        const railY = elevation + 0.68;
        const railColour = [0.20, 0.25, 0.27];
        for (const edgeZ of [Number(platform.z1) + 0.10, Number(platform.z2) - 0.10]) {
          drawSegment({ x: Number(platform.x1) + 0.30, y: railY, z: edgeZ }, { x: Number(platform.x2) - 0.30, y: railY, z: edgeZ }, 0.022, railColour, 0, 0.82, 3, 0.28);
        }
      }
    }
    if (summitTheme) {
      // Joined deck sections use one shared cover strip and structural beam.
      // This removes the floor/fascia crack that previously appeared between
      // the gallery and skybridge after the redundant staircases were removed.
      for (const join of profile.joins || []) {
        const x1 = Number(join.x1) || 0;
        const z1 = Number(join.z1) || 0;
        const x2 = Number(join.x2) || 0;
        const z2 = Number(join.z2) || 0;
        const elevation = Number(join.elevation) || 0;
        const thickness = Number(join.thickness) || 0.18;
        const depth = Math.max(0.16, Number(join.depth) || 0.30);
        const length = Math.max(0.1, Math.hypot(x2 - x1, z2 - z1));
        const yaw = -Math.atan2(z2 - z1, x2 - x1);
        const cx = (x1 + x2) * 0.5;
        const cz = (z1 + z2) * 0.5;
        const supportHeight = Math.max(0.08, elevation - thickness);
        mat4TRS(glModel, cx, supportHeight * 0.5, cz, yaw, 0, 0, length, supportHeight, depth * 0.52);
        drawMesh(glMeshes.cube, [0.18, 0.29, 0.32], glModel, 0.012, 1, 3, 0.60);
        mat4TRS(glModel, cx, elevation - thickness * 0.5, cz, yaw, 0, 0, length, thickness, depth);
        drawMesh(glMeshes.cube, [0.52, 0.63, 0.65], glModel, 0.026, 1, 3, 0.74);
        mat4TRS(glModel, cx, elevation + 0.014, cz, yaw, 0, 0, length - 0.04, 0.020, depth - 0.04);
        drawMesh(glMeshes.cube, [0.68, 0.77, 0.78], glModel, 0.040, 1, 3, 0.86);
      }
      for (const segment of summitPlatformRailSegments(profile)) drawSummitGuardrailSegment(segment);
    }
    for (const ramp of profile.ramps || []) {
      const x1 = Number(ramp.x1);
      const z1 = Number(ramp.z1);
      const x2 = Number(ramp.x2);
      const z2 = Number(ramp.z2);
      const elevation1 = Number(ramp.elevation1) || 0;
      const elevation2 = Number(ramp.elevation2) || 0;
      const dx = x2 - x1;
      const dz = z2 - z1;
      const length = Math.hypot(dx, dz) || 0.1;
      const yaw = Math.atan2(dx, dz);
      const steps = Math.max(4, Math.round(Number(ramp.steps) || 7));
      const stepDepth = length / steps * 1.035;
      const stairWidth = (Number(ramp.width) || 1) * 0.96;
      const baseElevation = Math.min(elevation1, elevation2);
      for (let i = 0; i < steps; i++) {
        const t = (i + 0.5) / steps;
        const x = lerp(x1, x2, t);
        const z = lerp(z1, z2, t);
        const treadElevation = lerp(elevation1, elevation2, (i + 1) / steps);
        const riserHeight = Math.max(0.045, treadElevation - baseElevation);
        // Each tread is a solid riser down to the structural base. The earlier
        // thin floating plates exposed gaps and made diagonal stairs look
        // twisted even when their navigation profile was valid.
        mat4TRS(glModel, x, baseElevation + riserHeight * 0.5, z, yaw, 0, 0, stairWidth, riserHeight, stepDepth);
        drawMesh(glMeshes.cube, summitTheme ? [0.20, 0.30, 0.32] : [0.15, 0.19, 0.20], glModel, summitTheme ? 0.012 : 0.008, 1, 3, summitTheme ? 0.58 : 0.46);
        mat4TRS(glModel, x, treadElevation + 0.008, z, yaw, 0, 0, stairWidth * 0.95, 0.016, stepDepth * 0.94);
        drawMesh(glMeshes.cube, summitTheme ? [0.68, 0.75, 0.76] : [0.34, 0.38, 0.38], glModel, summitTheme ? 0.028 : 0.018, 1, 3, summitTheme ? 0.78 : 0.30);
        if (summitTheme) {
          const nosing = localToWorld(x, z, yaw, 0, stepDepth * 0.42);
          mat4TRS(glModel, nosing.x, treadElevation + 0.022, nosing.z, yaw, 0, 0, stairWidth * 0.90, 0.018, 0.035);
          drawMesh(glMeshes.cube, String(ramp.id).includes('east') ? [0.96, 0.62, 0.22] : [0.20, 0.74, 0.78], glModel, 0.18, 1, 4, 0.18);
        }
      }
      if (summitTheme) {
        const landing = summitStairLandingGeometry(ramp, profile);
        const landingDepth = landing.landingLength + 0.16;
        const landingPlatform = (profile.platforms || []).find(platform => platform.id === landing.platformId) || null;
        const landingThickness = Number(landingPlatform?.thickness) || 0.18;
        const cheekHeight = Math.max(0.18, landing.highElevation - landingThickness);
        mat4TRS(glModel, landing.landingCentre.x, landing.highElevation + 0.014, landing.landingCentre.z, yaw, 0, 0, landing.stairWidth, 0.028, landingDepth);
        drawMesh(glMeshes.cube, [0.66, 0.75, 0.76], glModel, 0.032, 1, 3, 0.80);

        // Slim side cheeks align the stair body, landing and platform support.
        // They replace the visually offset plinth corner previously visible
        // beside the upper tread while remaining outside the walkable width.
        for (const side of [-1, 1]) {
          const cheek = localToWorld(landing.landingCentre.x, landing.landingCentre.z, yaw, side * (landing.stairWidth * 0.5 + 0.045), 0);
          mat4TRS(glModel, cheek.x, cheekHeight * 0.5, cheek.z, yaw, 0, 0, 0.075, cheekHeight, landingDepth);
          drawMesh(glMeshes.cube, [0.18, 0.31, 0.34], glModel, 0.010, 1, 3, 0.60);
          const trim = localToWorld(landing.landingCentre.x, landing.landingCentre.z, yaw, side * (landing.stairWidth * 0.5 + 0.087), 0);
          mat4TRS(glModel, trim.x, landing.highElevation - landingThickness * 0.48, trim.z, yaw, 0, 0, 0.026, landingThickness * 0.82, landingDepth * 0.96);
          drawMesh(glMeshes.cube, [0.24, 0.50, 0.53], glModel, 0.025, 1, 4, 0.36);
        }
      }

      // Small flush thresholds make both ends read as deliberately connected
      // landings rather than a staircase terminating short of the floor.
      for (const landing of [
        { x: x1, z: z1, y: elevation1 },
        { x: x2, z: z2, y: elevation2 }
      ]) {
        mat4TRS(glModel, landing.x, landing.y + 0.012, landing.z, yaw, 0, 0, stairWidth, 0.024, Math.max(0.24, stepDepth * 0.82));
        drawMesh(glMeshes.cube, summitTheme ? [0.58, 0.68, 0.70] : [0.27, 0.31, 0.32], glModel, summitTheme ? 0.022 : 0.012, 1, 3, summitTheme ? 0.72 : 0.34);
      }
      if (summitTheme) drawSummitStairRails(ramp);
    }
  }

  function drawStaticWorld(time) {
    const arena = activeArenaMeta();
    const officeTheme = arena.theme === 'office';
    const summitTheme = arena.theme === 'summit';
    const desertTheme = arena.theme === 'desert';
    const sceneWallHeight = Number(arena.ceilingHeight) || GL_WALL_HEIGHT;
    const floorColour = officeTheme ? hexColour(OFFICE_CARPET_PRESENTATION.base) : desertTheme ? hexColour('#8f7755') : summitTheme ? hexColour('#586a70') : hexColour('#2e3940');
    const ceilingColour = officeTheme ? hexColour('#d7d9d6') : desertTheme ? hexColour('#d7b778') : summitTheme ? hexColour('#d3dde0') : hexColour('#0d151b');
    const wallA = officeTheme ? hexColour('#b8bdc0') : desertTheme ? hexColour('#c8a66c') : summitTheme ? hexColour('#aebcc1') : hexColour('#5b6d7a');
    const wallB = officeTheme ? hexColour('#8f989e') : desertTheme ? hexColour('#9a7448') : summitTheme ? hexColour('#73878f') : hexColour('#465560');
    const trimColour = officeTheme ? hexColour('#3b454c') : desertTheme ? hexColour('#6b4328') : summitTheme ? hexColour('#24434a') : hexColour('#162129');
    const hazardColour = officeTheme ? hexColour('#6d8794') : desertTheme ? hexColour('#7d2f21') : summitTheme ? hexColour('#23b9bd') : hexColour('#c0942f');
    const lineColour = officeTheme ? hexColour('#3a454d') : desertTheme ? hexColour('#6f573d') : summitTheme ? hexColour('#42555a') : hexColour('#233037');

    mat4TRS(glModel, MAP_W / 2, -0.035, MAP_H / 2, 0, 0, 0, MAP_W, 0.07, MAP_H);
    drawMesh(glMeshes.cube, floorColour, glModel, 0, 1, desertTheme ? 7 : 1, officeTheme ? 0.96 : desertTheme ? 0.98 : 0.78);
    if (officeTheme) {
      // Broad alternating carpet-tile bands create a soft woven office floor
      // without introducing hundreds of per-cell draw calls on mobile. Wall
      // geometry and the courtyard treatment cover the bands where required.
      for (let z = 0.5; z < MAP_H; z += 1) {
        const alternating = Math.floor(z) % 2 === 0;
        const carpetTone = OFFICE_CARPET_PRESENTATION.rowTones[alternating ? 0 : 1];
        mat4TRS(glModel, MAP_W * 0.5, 0.0015, z, 0, 0, 0, MAP_W, 0.006, 0.985);
        drawMesh(glMeshes.cube, carpetTone, glModel, 0, 0.58, 1, OFFICE_CARPET_PRESENTATION.roughness);
      }
      for (let x = 0.5; x < MAP_W; x += 2) {
        mat4TRS(glModel, x, 0.005, MAP_H * 0.5, 0, 0, 0, 0.010, 0.006, MAP_H);
        drawMesh(glMeshes.cube, [0.25, 0.30, 0.33], glModel, 0, 0.10, 3, 0.98);
      }
    }
    if (officeTheme && worldBatches.officeCourtyards.length) {
      const courtyard = worldBatches.officeCourtyards[0];
      const leftEdge = courtyard.x - courtyard.width * 0.5;
      const rightEdge = courtyard.x + courtyard.width * 0.5;
      const topEdge = courtyard.z - courtyard.depth * 0.5;
      const bottomEdge = courtyard.z + courtyard.depth * 0.5;
      const ceilingBlocks = [
        { x: MAP_W * 0.5, z: topEdge * 0.5, width: MAP_W, depth: topEdge },
        { x: MAP_W * 0.5, z: bottomEdge + (MAP_H - bottomEdge) * 0.5, width: MAP_W, depth: MAP_H - bottomEdge },
        { x: leftEdge * 0.5, z: courtyard.z, width: leftEdge, depth: courtyard.depth },
        { x: rightEdge + (MAP_W - rightEdge) * 0.5, z: courtyard.z, width: MAP_W - rightEdge, depth: courtyard.depth }
      ];
      for (const block of ceilingBlocks) {
        if (block.width <= 0 || block.depth <= 0) continue;
        mat4TRS(glModel, block.x, sceneWallHeight + 0.06, block.z, 0, 0, 0, block.width, 0.12, block.depth);
        drawMesh(glMeshes.cube, ceilingColour, glModel, 0.015, 1, 2, 0.94);
      }
      mat4TRS(glModel, courtyard.x, sceneWallHeight + 3.6, courtyard.z, 0, 0, 0, courtyard.width * 1.6, 0.12, courtyard.depth * 1.7);
      drawMesh(glMeshes.cube, [0.26, 0.54, 0.72], glModel, 0.72, 0.74, 4, 0.10);
    } else if (!desertTheme) {
      mat4TRS(glModel, MAP_W / 2, sceneWallHeight + 0.06, MAP_H / 2, 0, 0, 0, MAP_W, 0.12, MAP_H);
      drawMesh(glMeshes.cube, ceilingColour, glModel, summitTheme ? 0.035 : 0.015, 1, 2, summitTheme ? 0.82 : 0.94);
      if (summitTheme) {
        setBlendMode(true);
        for (const z of [4.6, 11.8, 19.0]) {
          mat4TRS(glModel, MAP_W * 0.5, sceneWallHeight + 0.125, z, 0, 0, 0, MAP_W * 0.58, 0.035, 1.15);
          drawMesh(glMeshes.cube, [0.34, 0.78, 0.85], glModel, 0.62, 0.46, 4, 0.08);
        }
        setBlendMode(false);
      }
    }

    if (summitTheme || desertTheme) setBlendMode(true);
    for (const zone of worldBatches.zoneFloors) {
      mat4TRS(glModel, zone.x, 0.001, zone.z, 0, 0, 0, zone.width, 0.006, zone.depth);
      drawMesh(glMeshes.cube, zone.colour, glModel, summitTheme ? 0.006 : desertTheme ? 0.002 : 0.012, officeTheme ? 0.11 : summitTheme ? 0.075 : desertTheme ? 0.065 : 0.26, desertTheme ? 7 : 1, officeTheme ? 0.96 : summitTheme ? 0.96 : desertTheme ? 0.98 : 0.78);
    }
    if (summitTheme || desertTheme) setBlendMode(false);
    drawArenaVerticalGeometry();
    if (summitTheme || desertTheme) setBlendMode(true);
    for (const patch of worldBatches.floorPatches) {
      const colour = officeTheme
        ? (patch.shade === 21 ? [0.13, 0.17, 0.20] : (patch.shade === 9 ? [0.19, 0.23, 0.26] : [0.15, 0.20, 0.23]))
        : desertTheme
          ? (patch.shade === 21 ? [0.44, 0.32, 0.20] : (patch.shade === 9 ? [0.62, 0.48, 0.30] : [0.54, 0.40, 0.25]))
          : summitTheme
            ? (patch.shade === 21 ? [0.40, 0.49, 0.51] : (patch.shade === 9 ? [0.48, 0.57, 0.59] : [0.43, 0.52, 0.54]))
            : (patch.shade === 21 ? [0.075, 0.105, 0.116] : (patch.shade === 9 ? [0.13, 0.145, 0.148] : [0.095, 0.12, 0.128]));
      const patchElevation = summitTheme ? arenaElevationAt(patch.x, patch.z) : 0;
      mat4TRS(glModel, patch.x, patchElevation + 0.008, patch.z, patch.yaw, 0, 0, patch.width, 0.010, patch.depth);
      drawMesh(glMeshes.cube, colour, glModel, summitTheme ? 0.004 : desertTheme ? 0.002 : 0, officeTheme ? 0.28 : summitTheme ? 0.22 : desertTheme ? 0.16 : 0.92, desertTheme ? 7 : 3, officeTheme ? 0.98 : summitTheme ? 0.94 : desertTheme ? 0.99 : 0.48);
    }
    if (summitTheme || desertTheme) setBlendMode(false);
    for (const strip of worldBatches.laneStrips) {
      const colour = summitTheme ? (strip.warm ? [0.96, 0.62, 0.22] : [0.16, 0.72, 0.76]) : (strip.warm ? [0.61, 0.39, 0.12] : [0.23, 0.48, 0.64]);
      for (const offset of [-0.13, 0.13]) {
        const p = localToWorld(strip.x, strip.z, strip.yaw, offset, 0);
        const stripElevation = summitTheme ? arenaElevationAt(p.x, p.z) : 0;
        mat4TRS(glModel, p.x, stripElevation + 0.014, p.z, strip.yaw, 0, 0, summitTheme ? 0.026 : 0.035, 0.012, 0.62);
        drawMesh(glMeshes.cube, colour, glModel, summitTheme ? 0.016 : 0.025, summitTheme ? 0.58 : 0.72, 3, summitTheme ? 0.72 : 0.52);
      }
    }

    if (officeTheme) {
      for (const courtyard of worldBatches.officeCourtyards) {
        mat4TRS(glModel, courtyard.x, 0.011, courtyard.z, 0, 0, 0, courtyard.width, 0.015, courtyard.depth);
        drawMesh(glMeshes.cube, courtyard.stone || [0.40, 0.43, 0.42], glModel, 0.01, 0.82, 1, 0.92);
        mat4TRS(glModel, courtyard.x, 0.022, courtyard.z, 0, 0, 0, courtyard.width - 0.52, 0.012, courtyard.depth - 0.52);
        drawMesh(glMeshes.cube, [0.30, 0.34, 0.33], glModel, 0.008, 0.90, 3, 0.88);
        for (let x = courtyard.x - courtyard.width * 0.42; x <= courtyard.x + courtyard.width * 0.42; x += 0.72) {
          mat4TRS(glModel, x, 0.031, courtyard.z, 0, 0, 0, 0.018, 0.008, courtyard.depth * 0.84);
          drawMesh(glMeshes.cube, [0.48, 0.51, 0.49], glModel, 0, 0.25, 3, 0.82);
        }
        for (let z = courtyard.z - courtyard.depth * 0.38; z <= courtyard.z + courtyard.depth * 0.38; z += 0.72) {
          mat4TRS(glModel, courtyard.x, 0.032, z, 0, 0, 0, courtyard.width * 0.86, 0.008, 0.018);
          drawMesh(glMeshes.cube, [0.48, 0.51, 0.49], glModel, 0, 0.25, 3, 0.82);
        }
        for (const side of [-1, 1]) {
          mat4TRS(glModel, courtyard.x + side * courtyard.width * 0.39, 0.045, courtyard.z, 0, 0, 0, courtyard.width * 0.12, 0.045, courtyard.depth * 0.72);
          drawMesh(glMeshes.cube, courtyard.grass || [0.15, 0.34, 0.20], glModel, 0.012, 0.78, 1, 0.90);
        }
        setBlendMode(true);
        mat4TRS(glModel, courtyard.x, sceneWallHeight - 0.065, courtyard.z, 0, 0, 0, courtyard.width * 0.92, 0.025, courtyard.depth * 0.90);
        drawMesh(glMeshes.cube, [0.34, 0.68, 0.82], glModel, 0.16, 0.18, 4, 0.08);
        mat4TRS(glModel, courtyard.x, sceneWallHeight * 0.48, courtyard.z, 0, 0, 0, courtyard.width * 0.78, sceneWallHeight * 0.78, courtyard.depth * 0.72);
        drawMesh(glMeshes.cube, [0.50, 0.76, 0.82], glModel, 0.03, 0.04, 4, 0.025);
        setBlendMode(false);
      }
      for (const rug of worldBatches.officeRugs) {
        mat4TRS(glModel, rug.x, 0.012, rug.z, 0, 0, 0, rug.width, 0.014, rug.depth);
        drawMesh(glMeshes.cube, rug.colour, glModel, 0.01, 0.76, 1, 0.92);
        for (let x = rug.x - rug.width * 0.42; x <= rug.x + rug.width * 0.42; x += 0.42) {
          mat4TRS(glModel, x, 0.021, rug.z, 0, 0, 0, 0.012, 0.008, rug.depth * 0.88);
          drawMesh(glMeshes.cube, [0.56, 0.61, 0.63], glModel, 0, 0.12, 3, 0.88);
        }
      }
      for (const baffle of worldBatches.officeCeilingBaffles) {
        const mount = officeBaffleMountGeometry(baffle, sceneWallHeight);
        const baffleSpec = ARENA_GEOMETRY_PRESENTATION.office.baffle;
        mat4TRS(glModel, baffle.x, mount.centreY, baffle.z, baffle.yaw || 0, 0, 0, baffle.width, baffleSpec.thickness, baffle.depth);
        drawMesh(glMeshes.cube, [0.30, 0.36, 0.39], glModel, 0, 1, 3, 0.58);
        for (const fraction of baffleSpec.hangerFractions) {
          const hanger = localToWorld(baffle.x, baffle.z, baffle.yaw || 0, fraction * baffle.width, 0);
          drawSegment({ x: hanger.x, y: mount.topY - 0.006, z: hanger.z }, { x: hanger.x, y: mount.anchorY, z: hanger.z }, baffleSpec.hangerRadius, [0.24, 0.29, 0.31], 0, 1, 3, 0.30);
          mat4TRS(glModel, hanger.x, mount.anchorY - 0.018, hanger.z, baffle.yaw || 0, 0, 0, 0.09, 0.036, 0.09);
          drawMesh(glMeshes.cube, [0.42, 0.47, 0.48], glModel, 0.01, 1, 3, 0.28);
          mat4TRS(glModel, hanger.x, mount.topY, hanger.z, baffle.yaw || 0, 0, 0, 0.075, 0.040, 0.075);
          drawMesh(glMeshes.cube, [0.38, 0.43, 0.45], glModel, 0.006, 1, 3, 0.30);
        }
      }
      setBlendMode(true);
      for (const glass of worldBatches.officeGlassBands) {
        const glassSpec = ARENA_GEOMETRY_PRESENTATION.office.glass;
        mat4TRS(glModel, glass.x, glassSpec.centreY, glass.z, glass.yaw || 0, 0, 0, glass.width, glassSpec.height, 0.028);
        drawMesh(glMeshes.cube, [0.50, 0.76, 0.84], glModel, 0.10, 0.24, 4, 0.08);
        for (const offset of glassSpec.mullionFractions) {
          const p = localToWorld(glass.x, glass.z, glass.yaw || 0, offset * glass.width, 0);
          mat4TRS(glModel, p.x, glassSpec.centreY, p.z, glass.yaw || 0, 0, 0, 0.030, glassSpec.height + 0.12, 0.052);
          drawMesh(glMeshes.cube, [0.28, 0.34, 0.37], glModel, 0, 0.75, 3, 0.30);
        }
        for (const channelY of glassSpec.channelY) {
          mat4TRS(glModel, glass.x, channelY, glass.z, glass.yaw || 0, 0, 0, glass.width + 0.10, 0.070, 0.060);
          drawMesh(glMeshes.cube, [0.30, 0.36, 0.39], glModel, 0, 0.86, 3, 0.30);
        }
      }
      setBlendMode(false);
      for (const screen of worldBatches.officeWallScreens) {
        // Wall displays are shallow architectural fixtures. Keep the casing and
        // face within a few centimetres of the authored wall plane rather than
        // using a deep black box that projects into a route.
        const wallYaw = screen.yaw || 0;
        const backing = localToWorld(screen.x, screen.z, wallYaw, 0, -0.012);
        mat4TRS(glModel, backing.x, 1.55, backing.z, wallYaw, 0, 0, screen.width + 0.10, 0.86, 0.022);
        drawMesh(glMeshes.cube, [0.12, 0.15, 0.17], glModel, 0, 1, 3, 0.34);
        const screenSpec = ARENA_GEOMETRY_PRESENTATION.office.screen;
        for (const railY of screenSpec.railY) {
          const rail = localToWorld(screen.x, screen.z, wallYaw, 0, -0.026);
          mat4TRS(glModel, rail.x, railY, rail.z, wallYaw, 0, 0, screen.width + 0.20, 0.055, 0.034);
          drawMesh(glMeshes.cube, [0.38, 0.44, 0.46], glModel, 0.01, 1, 3, 0.30);
        }
        const raceway = localToWorld(screen.x, screen.z, wallYaw, screen.width * 0.35, -0.028);
        mat4TRS(glModel, raceway.x, (screenSpec.racewayBottom + screenSpec.racewayTop) * 0.5, raceway.z, wallYaw, 0, 0, 0.070, screenSpec.racewayTop - screenSpec.racewayBottom, 0.036);
        drawMesh(glMeshes.cube, [0.34, 0.39, 0.41], glModel, 0.004, 1, 3, 0.32);
        const face = localToWorld(screen.x, screen.z, wallYaw, 0, 0.016);
        mat4TRS(glModel, face.x, 1.55, face.z, wallYaw, 0, 0, screen.width, 0.72, 0.010);
        drawMesh(glMeshes.cube, [0.14, 0.48, 0.63], glModel, 0.54, 1, 4, 0.10);
        for (let i = -1; i <= 1; i++) {
          const bar = localToWorld(screen.x, screen.z, wallYaw, i * screen.width * 0.23, 0.026);
          mat4TRS(glModel, bar.x, 1.50 + i * 0.12, bar.z, wallYaw, 0, 0, screen.width * 0.13, 0.035, 0.007);
          drawMesh(glMeshes.cube, [0.74, 0.90, 0.94], glModel, 0.36, 1, 4, 0.12);
        }
      }
    }


    if (desertTheme) {
      // Dune Bastion uses a bounded low-poly presentation pass: richer fortress
      // silhouettes and bazaar detail, but no external assets, hidden blockers
      // or decorative geometry inside the operator capsule height.
      for (const item of worldBatches.desertBackdrop) {
        const yaw = item.yaw || 0;
        if (item.kind === 'dune') {
          mat4TRS(glModel, item.x, item.height * 0.18 - 0.12, item.z, yaw, 0, 0, item.width, item.height, item.depth);
          drawMesh(glMeshes.sphere, [0.66, 0.49, 0.29], glModel, 0, 1, 7, 0.99);
          mat4TRS(glModel, item.x + Math.cos(yaw) * item.width * 0.12, item.height * 0.28 - 0.08, item.z - Math.sin(yaw) * item.width * 0.12, yaw, 0, 0, item.width * 0.58, item.height * 0.72, item.depth * 0.66);
          drawMesh(glMeshes.sphere, [0.76, 0.58, 0.34], glModel, 0, 1, 7, 0.99);
        } else if (item.kind === 'rock') {
          mat4TRS(glModel, item.x, item.height * 0.34, item.z, yaw, 0.12, -0.08, item.width, item.height, item.depth);
          drawMesh(glMeshes.cube, [0.42, 0.31, 0.22], glModel, 0, 1, 7, 1);
          mat4TRS(glModel, item.x + 0.5, item.height * 0.76, item.z - 0.3, yaw - 0.18, -0.10, 0.12, item.width * 0.52, item.height * 0.55, item.depth * 0.60);
          drawMesh(glMeshes.cube, [0.50, 0.36, 0.23], glModel, 0, 1, 7, 1);
        } else if (item.kind === 'tower') {
          mat4TRS(glModel, item.x, item.height * 0.5, item.z, yaw, 0, 0, item.width, item.height, item.depth);
          drawMesh(glMeshes.cube, [0.55, 0.40, 0.25], glModel, 0, 1, 7, 0.99);
          mat4TRS(glModel, item.x, item.height + 0.12, item.z, yaw, 0, 0, item.width * 1.18, 0.24, item.depth * 1.18);
          drawMesh(glMeshes.cube, [0.68, 0.51, 0.31], glModel, 0, 1, 7, 0.99);
          for (const sx of [-1, 1]) {
            for (const sz of [-1, 1]) {
              mat4TRS(glModel, item.x + sx * item.width * 0.43, item.height + 0.38, item.z + sz * item.depth * 0.43, yaw, 0, 0, 0.30, 0.52, 0.30);
              drawMesh(glMeshes.cube, [0.63, 0.46, 0.28], glModel, 0, 1, 7, 0.99);
            }
          }
        }
      }

      for (const mosaic of worldBatches.desertMosaics) {
        const yaw = mosaic.yaw || 0;
        const baseColour = mosaic.colour || [0.50, 0.34, 0.20];
        mat4TRS(glModel, mosaic.x, 0.010, mosaic.z, yaw, 0, 0, mosaic.width, 0.014, mosaic.depth);
        drawMesh(glMeshes.cube, baseColour, glModel, 0.004, 0.74, 7, 0.98);
        if (mosaic.kind === 'rug') {
          mat4TRS(glModel, mosaic.x, 0.022, mosaic.z, yaw, 0, 0, mosaic.width * 0.88, 0.010, mosaic.depth * 0.82);
          drawMesh(glMeshes.cube, [baseColour[0] * 0.68, baseColour[1] * 0.72, baseColour[2] * 0.82], glModel, 0.004, 0.88, 7, 0.98);
          for (const side of [-1, 1]) {
            for (let i = -4; i <= 4; i++) {
              const fringe = localToWorld(mosaic.x, mosaic.z, yaw, i * mosaic.width * 0.095, side * mosaic.depth * 0.48);
              mat4TRS(glModel, fringe.x, 0.027, fringe.z, yaw, 0, 0, 0.025, 0.008, mosaic.depth * 0.10);
              drawMesh(glMeshes.cube, [0.78, 0.61, 0.36], glModel, 0, 0.70, 7, 0.98);
            }
          }
          for (const offset of [-0.28, 0, 0.28]) {
            const stripe = localToWorld(mosaic.x, mosaic.z, yaw, offset * mosaic.width, 0);
            mat4TRS(glModel, stripe.x, 0.029, stripe.z, yaw, 0, 0, mosaic.width * 0.055, 0.008, mosaic.depth * 0.72);
            drawMesh(glMeshes.cube, [0.84, 0.62, 0.30], glModel, 0.004, 0.72, 7, 0.98);
          }
        } else if (mosaic.kind === 'gate') {
          for (const offset of [-0.42, -0.14, 0.14, 0.42]) {
            const line = localToWorld(mosaic.x, mosaic.z, yaw, offset * mosaic.width, 0);
            mat4TRS(glModel, line.x, 0.026, line.z, yaw, 0, 0, 0.035, 0.009, mosaic.depth * 0.90);
            drawMesh(glMeshes.cube, [0.70, 0.52, 0.30], glModel, 0, 0.62, 7, 0.98);
          }
          mat4TRS(glModel, mosaic.x, 0.030, mosaic.z, yaw + Math.PI / 4, 0, 0, 0.72, 0.009, 0.72);
          drawMesh(glMeshes.cube, [0.22, 0.40, 0.42], glModel, 0.01, 0.82, 7, 0.96);
          mat4TRS(glModel, mosaic.x, 0.036, mosaic.z, yaw + Math.PI / 4, 0, 0, 0.42, 0.008, 0.42);
          drawMesh(glMeshes.cube, [0.72, 0.30, 0.16], glModel, 0.01, 0.86, 7, 0.96);
        } else if (mosaic.kind === 'rampart') {
          for (let x = -4; x <= 4; x++) {
            const p = localToWorld(mosaic.x, mosaic.z, yaw, x * mosaic.width * 0.105, 0);
            mat4TRS(glModel, p.x, 0.025, p.z, yaw + (x % 2 ? 0.02 : -0.02), 0, 0, mosaic.width * 0.075, 0.008, mosaic.depth * 0.78);
            drawMesh(glMeshes.cube, x % 2 ? [0.62, 0.46, 0.28] : [0.70, 0.53, 0.32], glModel, 0, 0.52, 7, 0.99);
          }
        } else {
          mat4TRS(glModel, mosaic.x, 0.026, mosaic.z, yaw + Math.PI / 4, 0, 0, Math.min(mosaic.width, mosaic.depth) * 0.72, 0.009, Math.min(mosaic.width, mosaic.depth) * 0.72);
          drawMesh(glMeshes.cube, [0.68, 0.50, 0.28], glModel, 0, 0.54, 7, 0.98);
          mat4TRS(glModel, mosaic.x, 0.034, mosaic.z, yaw, 0, 0, Math.min(mosaic.width, mosaic.depth) * 0.28, 0.008, Math.min(mosaic.width, mosaic.depth) * 0.28);
          drawMesh(glMeshes.cube, [0.22, 0.42, 0.43], glModel, 0.01, 0.82, 7, 0.96);
        }
      }

      for (const rubble of worldBatches.desertRubble) {
        const scale = Number(rubble.scale) || 1;
        const yaw = rubble.yaw || 0;
        for (let index = 0; index < 4; index++) {
          const angle = yaw + index * 1.71;
          const distance = 0.10 + index * 0.045;
          const x = rubble.x + Math.cos(angle) * distance;
          const z = rubble.z + Math.sin(angle) * distance;
          const size = (0.07 + (index % 2) * 0.035) * scale;
          mat4TRS(glModel, x, size * 0.34, z, angle, 0.18 * (index % 2), 0.10, size * 1.35, size * 0.72, size);
          drawMesh(index % 2 ? glMeshes.cube : glMeshes.sphere, index % 2 ? [0.48, 0.35, 0.23] : [0.60, 0.44, 0.27], glModel, 0, 1, 7, 1);
        }
      }

      for (const crenel of worldBatches.desertCrenels) {
        const colour = crenel.variant === 0 ? [0.70, 0.54, 0.34] : (crenel.variant === 1 ? [0.62, 0.46, 0.28] : [0.76, 0.59, 0.37]);
        mat4TRS(glModel, crenel.x, sceneWallHeight + 0.20, crenel.z, 0, 0, 0, crenel.width, 0.40, crenel.depth);
        drawMesh(glMeshes.cube, colour, glModel, 0, 1, 7, 0.98);
        mat4TRS(glModel, crenel.x, sceneWallHeight + 0.415, crenel.z, 0, 0, 0, crenel.width * 1.06, 0.045, crenel.depth * 1.06);
        drawMesh(glMeshes.cube, [0.82, 0.66, 0.43], glModel, 0, 1, 7, 0.97);
      }

      // Open-air shade structures and masonry details give Dune Bastion a
      // distinct sun-baked fortress identity. Slender ground supports retain
      // matching authored colliders; cloth, ropes and lamps remain overhead.
      for (const canopy of worldBatches.desertCanopies) {
        const yaw = canopy.yaw || 0;
        const width = Number(canopy.width) || 3.0;
        const depth = Number(canopy.depth) || 2.4;
        const canopySpec = ARENA_GEOMETRY_PRESENTATION.dune.canopy;
        const fabricY = canopySpec.fabricY;
        const fabricPitch = canopySpec.fabricPitch;
        const trim = canopy.trim || [0.70, 0.49, 0.28];
        drawDuneCanopyFrame(canopy);
        mat4TRS(glModel, canopy.x, fabricY, canopy.z, yaw, fabricPitch, 0, width, canopySpec.fabricThickness, depth);
        drawMesh(glMeshes.cube, canopy.colour || [0.46, 0.22, 0.13], glModel, 0.015, 0.90, 7, 0.90);
        for (let stripe = -2; stripe <= 2; stripe++) {
          const strip = localToWorld(canopy.x, canopy.z, yaw, stripe * width * 0.18, 0);
          mat4TRS(glModel, strip.x, fabricY + 0.022, strip.z, yaw, fabricPitch, 0, width * 0.065, 0.012, depth * 0.96);
          drawMesh(glMeshes.cube, stripe % 2 ? trim : [0.78, 0.57, 0.31], glModel, 0.01, 0.88, 7, 0.92);
        }
        const tabLocalZ = depth * 0.49;
        const tabEdgeY = duneCanopyPlaneY(tabLocalZ);
        for (let tab = -4; tab <= 4; tab++) {
          const tabHeight = 0.20 + (Math.abs(tab) % 2) * 0.05;
          const front = localToWorld(canopy.x, canopy.z, yaw, tab * width * 0.105, tabLocalZ);
          mat4TRS(glModel, front.x, tabEdgeY - tabHeight * 0.5, front.z, yaw, 0, 0, width * 0.075, tabHeight, 0.025);
          drawMesh(glMeshes.cube, tab % 2 ? trim : canopy.colour, glModel, 0.01, 0.88, 7, 0.92);
        }
        const lamp = localToWorld(canopy.x, canopy.z, yaw, 0, 0);
        const lampAnchorY = duneCanopyPlaneY(0) - canopySpec.fabricThickness * 0.5;
        drawSegment({ x: lamp.x, y: lampAnchorY, z: lamp.z }, { x: lamp.x, y: 1.78, z: lamp.z }, 0.012, [0.22, 0.13, 0.07], 0, 1, 7, 0.90);
        mat4TRS(glModel, lamp.x, 1.70, lamp.z, yaw, 0, 0, 0.16, 0.18, 0.16);
        drawMesh(glMeshes.cylinder, [0.32, 0.20, 0.11], glModel, 0, 1, 7, 0.86);
        setBlendMode(true);
        mat4TRS(glModel, lamp.x, 1.70 + Math.sin(time * 2.2 + canopy.x) * 0.012, lamp.z, yaw, 0, 0, 0.07, 0.11, 0.07);
        drawMesh(glMeshes.sphere, [1.00, 0.52, 0.16], glModel, 1.35, 0.80, 4, 0.10);
        setBlendMode(false);
      }

      for (const arch of worldBatches.desertArches) {
        const yaw = arch.yaw || 0;
        const width = Number(arch.width) || 2.5;
        const height = arch.landmark ? 2.78 : 2.62;
        const postWidth = 0.22;
        for (const side of [-1, 1]) {
          const post = localToWorld(arch.x, arch.z, yaw, side * (width * 0.5 - postWidth * 0.5), 0);
          mat4TRS(glModel, post.x, height * 0.43, post.z, yaw, 0, 0, postWidth, height * 0.86, 0.32);
          drawMesh(glMeshes.cube, [0.67, 0.50, 0.31], glModel, 0, 1, 7, 0.98);
          mat4TRS(glModel, post.x, 0.11, post.z, yaw, 0, 0, postWidth * 1.55, 0.22, 0.42);
          drawMesh(glMeshes.cube, [0.54, 0.38, 0.23], glModel, 0, 1, 7, 0.99);
          mat4TRS(glModel, post.x, height * 0.84, post.z, yaw, 0, 0, postWidth * 1.52, 0.18, 0.40);
          drawMesh(glMeshes.cube, [0.78, 0.61, 0.39], glModel, 0, 1, 7, 0.98);
        }
        mat4TRS(glModel, arch.x, height - 0.15, arch.z, yaw, 0, 0, width, 0.28, 0.36);
        drawMesh(glMeshes.cube, [0.74, 0.57, 0.36], glModel, 0, 1, 7, 0.98);
        for (let block = -3; block <= 3; block++) {
          const localX = block * width * 0.105;
          const rise = (1 - Math.abs(block) / 4) * 0.22;
          const p = localToWorld(arch.x, arch.z, yaw, localX, 0.018);
          mat4TRS(glModel, p.x, height - 0.38 + rise, p.z, yaw, 0, block * -0.045, width * 0.105, 0.30, 0.38);
          drawMesh(glMeshes.cube, block === 0 ? [0.84, 0.66, 0.41] : [0.64 + (block % 2 ? 0.04 : 0), 0.47, 0.29], glModel, 0, 1, 7, 0.98);
        }
        // The recessed inner lintel now overlaps the main arch beam instead
        // of hanging beneath it with a visible air gap at oblique angles.
        mat4TRS(glModel, arch.x, height - DUNE_ARCH_PRESENTATION.innerLintelDrop, arch.z, yaw, 0, 0, width * 0.46, DUNE_ARCH_PRESENTATION.innerLintelHeight, 0.37);
        drawMesh(glMeshes.cube, [0.30, 0.19, 0.12], glModel, 0, 1, 7, 0.98);
        if (arch.landmark) {
          // Landmark emblems now sit as flush plaques on both vertical faces of
          // the lintel. They no longer protrude above the arch as isolated blocks.
          for (const faceSide of [-1, 1]) {
            const plaque = localToWorld(arch.x, arch.z, yaw, 0, faceSide * DUNE_ARCH_PRESENTATION.landmarkFaceOffset);
            mat4TRS(glModel, plaque.x, height - DUNE_ARCH_PRESENTATION.landmarkPlaqueDrop, plaque.z, yaw, 0, 0, 0.32, DUNE_ARCH_PRESENTATION.landmarkBackingHeight, 0.045);
            drawMesh(glMeshes.cube, [0.66, 0.49, 0.30], glModel, 0, 1, 7, 0.98);
            const emblem = localToWorld(arch.x, arch.z, yaw, 0, faceSide * (DUNE_ARCH_PRESENTATION.landmarkFaceOffset + 0.028));
            mat4TRS(glModel, emblem.x, height - DUNE_ARCH_PRESENTATION.landmarkPlaqueDrop, emblem.z, yaw + Math.PI / 4, 0, 0, 0.21, DUNE_ARCH_PRESENTATION.landmarkEmblemHeight, 0.035);
            drawMesh(glMeshes.cube, [0.24, 0.43, 0.44], glModel, 0.04, 1, 7, 0.90);
          }
        }
      }

      for (const banner of worldBatches.desertBanners) {
        const yaw = banner.yaw || 0;
        const face = localToWorld(banner.x, banner.z, yaw, 0, 0.025);
        const mast = duneBannerMastPoint(banner);
        const leftRod = localToWorld(face.x, face.z, yaw, -0.34, 0);
        const rightRod = localToWorld(face.x, face.z, yaw, 0.34, 0);

        // Every banner is a grounded standard: stone foot, full-height mast,
        // attached crossbar and a lower cloth tie. This removes the unsupported
        // horizontal rod/cloth silhouettes visible in the supplied Free Roam shots.
        mat4TRS(glModel, mast.x, 0.09, mast.y, yaw, 0, 0, 0.24, 0.18, 0.24);
        drawMesh(glMeshes.cube, [0.48, 0.34, 0.21], glModel, 0, 1, 7, 0.99);
        mat4TRS(glModel, mast.x, 0.20, mast.y, yaw, 0, 0, 0.15, 0.12, 0.15);
        drawMesh(glMeshes.cube, [0.62, 0.45, 0.27], glModel, 0, 1, 7, 0.98);
        drawSegment({ x: mast.x, y: 0.18, z: mast.y }, { x: mast.x, y: DUNE_BANNER_PRESENTATION.crossbarHeight + 0.15, z: mast.y }, 0.028, [0.24, 0.14, 0.09], 0, 1, 7, 0.88);
        mat4TRS(glModel, mast.x, DUNE_BANNER_PRESENTATION.crossbarHeight + 0.18, mast.y, yaw, 0, 0, 0.09, 0.09, 0.09);
        drawMesh(glMeshes.sphere, [0.58, 0.39, 0.20], glModel, 0.01, 1, 7, 0.86);
        drawSegment({ x: leftRod.x, y: DUNE_BANNER_PRESENTATION.crossbarHeight, z: leftRod.z }, { x: rightRod.x, y: DUNE_BANNER_PRESENTATION.crossbarHeight, z: rightRod.z }, 0.022, [0.24, 0.14, 0.09], 0, 1, 7, 0.88);
        drawSegment({ x: mast.x, y: DUNE_BANNER_PRESENTATION.crossbarHeight - 0.03, z: mast.y }, { x: face.x, y: DUNE_BANNER_PRESENTATION.crossbarHeight, z: face.z }, 0.018, [0.32, 0.19, 0.10], 0, 1, 7, 0.90);

        mat4TRS(glModel, face.x, DUNE_BANNER_PRESENTATION.clothCentreHeight, face.z, yaw, 0, 0, 0.54, 0.78, 0.022);
        drawMesh(glMeshes.cube, banner.colour || [0.50, 0.18, 0.12], glModel, 0.02, 0.96, 7, 0.88);
        const emblem = banner.emblem || [0.80, 0.62, 0.34];
        mat4TRS(glModel, face.x, 1.91, face.z, yaw + Math.PI / 4, 0, 0, 0.22, 0.22, 0.028);
        drawMesh(glMeshes.cube, emblem, glModel, 0.02, 0.92, 7, 0.88);
        mat4TRS(glModel, face.x, 1.91, face.z, yaw, 0, 0, 0.075, 0.28, 0.032);
        drawMesh(glMeshes.cube, [0.30, 0.19, 0.11], glModel, 0, 0.86, 7, 0.92);
        const lowerLeft = localToWorld(face.x, face.z, yaw, -0.28, 0);
        const lowerRight = localToWorld(face.x, face.z, yaw, 0.28, 0);
        drawSegment({ x: lowerLeft.x, y: 1.45, z: lowerLeft.z }, { x: lowerRight.x, y: 1.45, z: lowerRight.z }, 0.012, [0.30, 0.18, 0.10], 0, 1, 7, 0.90);
        drawSegment({ x: mast.x, y: 1.45, z: mast.y }, { x: face.x, y: 1.45, z: face.z }, 0.012, [0.30, 0.18, 0.10], 0, 1, 7, 0.90);
        for (const side of [-1, 1]) {
          const tail = localToWorld(face.x, face.z, yaw, side * 0.15, 0);
          const flutter = Math.sin(time * 1.6 + banner.x * 0.3 + side) * 0.025;
          mat4TRS(glModel, tail.x, 1.36, tail.z, yaw, 0, side * 0.05 + flutter, 0.20, 0.18, 0.020);
          drawMesh(glMeshes.cube, banner.colour || [0.50, 0.18, 0.12], glModel, 0.01, 0.92, 7, 0.90);
        }
      }

      for (const torch of worldBatches.desertTorches) {
        const yaw = torch.yaw || 0;
        const height = Number(torch.height) || 1.65;
        const wall = { x: torch.x, z: torch.z };
        const bowl = localToWorld(wall.x, wall.z, yaw, 0, 0.18);
        // A visible masonry-side mounting plate prevents the flame and bowl
        // from reading as a floating candle when viewed edge-on.
        mat4TRS(glModel, wall.x, height - 0.13, wall.z, yaw, 0, 0, 0.16, 0.28, 0.045);
        drawMesh(glMeshes.cube, [0.34, 0.22, 0.13], glModel, 0, 1, 7, 0.90);
        mat4TRS(glModel, wall.x, height - 0.13, wall.z, yaw + Math.PI / 4, 0, 0, 0.075, 0.075, 0.052);
        drawMesh(glMeshes.cube, [0.62, 0.42, 0.22], glModel, 0.01, 1, 7, 0.84);
        drawSegment({ x: wall.x, y: height - 0.12, z: wall.z }, { x: bowl.x, y: height, z: bowl.z }, 0.025, [0.22, 0.13, 0.07], 0, 1, 7, 0.90);
        mat4TRS(glModel, bowl.x, height, bowl.z, yaw, 0, 0, 0.20, 0.12, 0.20);
        drawMesh(glMeshes.cylinder, [0.28, 0.17, 0.09], glModel, 0, 1, 7, 0.84);
        mat4TRS(glModel, bowl.x, height + 0.075, bowl.z, yaw, 0, 0, 0.22, 0.035, 0.22);
        drawMesh(glMeshes.ring, [0.58, 0.38, 0.18], glModel, 0.02, 1, 7, 0.80);
        setBlendMode(true);
        const flicker = 1 + Math.sin(time * 8.2 + torch.x * 1.7 + torch.z) * 0.10;
        mat4TRS(glModel, bowl.x, height + 0.19, bowl.z, yaw, 0, 0, 0.10 * flicker, 0.27 * flicker, 0.10 * flicker);
        drawMesh(glMeshes.sphere, [1.00, 0.38, 0.08], glModel, 1.80, 0.88, 4, 0.08);
        mat4TRS(glModel, bowl.x, height + 0.20, bowl.z, yaw, 0, 0, 0.22, 0.38, 0.22);
        drawMesh(glMeshes.sphere, [1.00, 0.68, 0.24], glModel, 0.22, 0.10, 4, 0.05);
        setBlendMode(false);
      }
    }

    for (const ceiling of worldBatches.lowCeilings) {
      mat4TRS(glModel, ceiling.x, ceiling.height, ceiling.z, 0, 0, 0, ceiling.width, 0.09, ceiling.depth);
      drawMesh(glMeshes.cube, ceiling.colour, glModel, 0.012, 1, 2, 0.88);
      for (let x = ceiling.x - ceiling.width * 0.42; x <= ceiling.x + ceiling.width * 0.42; x += 2.4) {
        mat4TRS(glModel, x, ceiling.height - 0.055, ceiling.z, 0, 0, 0, 0.48, 0.035, ceiling.depth * 0.82);
        drawMesh(glMeshes.cube, [0.10, 0.14, 0.16], glModel, 0, 1, 3, 0.38);
      }
    }

    setBlendMode(true);
    for (const walkway of worldBatches.walkways) {
      drawGroundGlow(walkway.x, walkway.z, walkway.width * 0.98, walkway.depth * 2.1, [0.01, 0.014, 0.018], 0.16);
    }
    for (const container of worldBatches.containers) {
      setRenderElevationOffset(arenaElevationAt(container.x, container.z));
      drawGroundGlow(container.x, container.z, Number(container.width) || 0.94, Number(container.depth) || 0.66, desertTheme ? [0.09, 0.055, 0.025] : [0.01, 0.014, 0.018], desertTheme ? 0.16 : 0.24, container.yaw || 0);
      setRenderElevationOffset(0);
    }
    for (const machine of worldBatches.machines) {
      setRenderElevationOffset(arenaElevationAt(machine.x, machine.z));
      drawGroundGlow(machine.x, machine.z, machine.kind === 'reactor' ? 1.05 : (Number(machine.width) || 0.88), machine.kind === 'reactor' ? 1.05 : (Number(machine.depth) || 0.70), desertTheme ? [0.09, 0.055, 0.025] : [0.01, 0.014, 0.018], desertTheme ? 0.15 : (machine.kind === 'reactor' ? 0.28 : 0.22), machine.yaw || 0);
      setRenderElevationOffset(0);
    }
    for (const tank of worldBatches.tanks) {
      setRenderElevationOffset(arenaElevationAt(tank.x, tank.z));
      drawGroundGlow(tank.x, tank.z, (Number(tank.radius) || 0.45) * 2, (Number(tank.radius) || 0.45) * 2, desertTheme ? [0.09, 0.055, 0.025] : [0.01, 0.014, 0.018], desertTheme ? 0.15 : 0.24);
      setRenderElevationOffset(0);
    }
    for (const door of worldBatches.doors) drawGroundGlow(door.x, door.z, 1.16, 0.38, [0.01, 0.014, 0.018], 0.18, door.yaw);
    if (activeArenaId !== 'summit') for (const stair of worldBatches.stairs) drawGroundGlow(stair.x, stair.z, 0.86, 1.18, [0.01, 0.014, 0.018], 0.14, stair.yaw);
    setBlendMode(false);

    for (const walkway of worldBatches.walkways) {
      mat4TRS(glModel, walkway.x, walkway.y, walkway.z, 0, 0, 0, walkway.width, 0.11, walkway.depth);
      drawMesh(glMeshes.cube, walkway.colour, glModel, 0, 1, 3, 0.34);
      for (let x = walkway.x - walkway.width * 0.45; x < walkway.x + walkway.width * 0.45; x += 0.55) {
        mat4TRS(glModel, x, walkway.y + 0.065, walkway.z, 0, 0, 0, 0.028, 0.018, walkway.depth * 0.86);
        drawMesh(glMeshes.cube, [0.30, 0.34, 0.35], glModel, 0, 1, 3, 0.22);
      }
      drawCitadelWalkwayStructure(walkway, sceneWallHeight);
    }
    for (const rail of worldBatches.railings) {
      drawSegment({ x: rail.x1, y: rail.y, z: rail.z1 }, { x: rail.x2, y: rail.y, z: rail.z2 }, 0.025, [0.24, 0.29, 0.31], 0, 1, 3, 0.26);
      for (let t = 0; t <= 1.001; t += 0.2) {
        const x = lerp(rail.x1, rail.x2, t), z = lerp(rail.z1, rail.z2, t);
        drawSegment({ x, y: rail.y - 0.42, z }, { x, y: rail.y, z }, 0.020, [0.20, 0.25, 0.27], 0, 1, 3, 0.30);
      }
    }

    for (const container of worldBatches.containers) {
      setRenderElevationOffset(arenaElevationAt(container.x, container.z));
      if (desertTheme) {
        const width = Number(container.width) || 0.94;
        const depth = Number(container.depth) || 0.70;
        const yaw = container.yaw || 0;
        const wood = container.colour || [0.45, 0.30, 0.17];
        const darkWood = [wood[0] * 0.58, wood[1] * 0.52, wood[2] * 0.48];
        if (container.kind === 'sandbag') {
          const bagColour = container.colour || [0.62, 0.49, 0.32];
          const rows = [{ count: 5, y: 0.22, span: 0.82 }, { count: 4, y: 0.43, span: 0.64 }];
          for (const row of rows) {
            for (let i = 0; i < row.count; i++) {
              const offset = row.count === 1 ? 0 : -width * row.span * 0.5 + width * row.span * i / (row.count - 1);
              const bag = localToWorld(container.x, container.z, yaw, offset, 0);
              mat4TRS(glModel, bag.x, row.y + (i % 2) * 0.012, bag.z, yaw, 0, 0, width * 0.205, 0.27, depth * 0.90);
              drawMesh(glMeshes.sphere, bagColour, glModel, 0, 1, 7, 0.98);
              const seamA = localToWorld(bag.x, bag.z, yaw, -width * 0.065, depth * 0.38);
              const seamB = localToWorld(bag.x, bag.z, yaw, width * 0.065, depth * 0.38);
              drawSegment({ x: seamA.x, y: row.y + 0.015, z: seamA.z }, { x: seamB.x, y: row.y + 0.015, z: seamB.z }, 0.010, [0.40, 0.30, 0.20], 0, 1, 7, 0.76);
            }
          }
        } else if (container.kind === 'barrier') {
          mat4TRS(glModel, container.x, 0.34, container.z, yaw, 0, 0, width, 0.64, depth);
          drawMesh(glMeshes.cube, container.colour || [0.66, 0.48, 0.28], glModel, 0, 1, 7, 0.98);
          mat4TRS(glModel, container.x, 0.69, container.z, yaw, 0, 0, width * 0.91, 0.15, depth * 0.91);
          drawMesh(glMeshes.cube, [0.71, 0.53, 0.32], glModel, 0, 1, 7, 0.98);
          mat4TRS(glModel, container.x, 0.81, container.z, yaw, 0, 0, width * 1.06, 0.09, depth * 1.15);
          drawMesh(glMeshes.cube, [0.82, 0.65, 0.41], glModel, 0, 1, 7, 0.97);
          const badge = localToWorld(container.x, container.z, yaw, 0, depth * 0.52);
          mat4TRS(glModel, badge.x, 0.43, badge.z, yaw, 0, 0, width * 0.30, 0.28, 0.018);
          drawMesh(glMeshes.cube, [0.45, 0.25, 0.14], glModel, 0.02, 1, 7, 0.90);
          mat4TRS(glModel, badge.x, 0.43, badge.z + Math.cos(yaw) * 0.012, yaw, 0, Math.PI * 0.25, width * 0.13, 0.13, 0.022);
          drawMesh(glMeshes.cube, [0.88, 0.65, 0.32], glModel, 0.12, 1, 7, 0.82);
        } else {
          const stacked = container.kind === 'crate-stack';
          const crates = stacked
            ? [{ x: -width * 0.16, z: 0, y: 0.37, w: width * 0.72, h: 0.70, d: depth * 0.94, turn: 0 }, { x: width * 0.20, z: -depth * 0.04, y: 0.93, w: width * 0.62, h: 0.53, d: depth * 0.78, turn: 0.10 }]
            : [{ x: 0, z: 0, y: 0.52, w: width, h: 1.00, d: depth, turn: 0 }];
          for (const crate of crates) {
            const centre = localToWorld(container.x, container.z, yaw, crate.x, crate.z);
            const crateYaw = yaw + crate.turn;
            mat4TRS(glModel, centre.x, crate.y, centre.z, crateYaw, 0, 0, crate.w, crate.h, crate.d);
            drawMesh(glMeshes.cube, wood, glModel, 0, 1, 7, 0.92);
            mat4TRS(glModel, centre.x, crate.y + crate.h * 0.51, centre.z, crateYaw, 0, 0, crate.w * 1.04, 0.055, crate.d * 1.04);
            drawMesh(glMeshes.cube, [wood[0] * 1.15, wood[1] * 1.10, wood[2] * 1.05], glModel, 0, 1, 7, 0.91);
            for (const side of [-1, 1]) {
              const upright = localToWorld(centre.x, centre.z, crateYaw, side * crate.w * 0.38, crate.d * 0.515);
              drawSegment({ x: upright.x, y: crate.y - crate.h * 0.42, z: upright.z }, { x: upright.x, y: crate.y + crate.h * 0.42, z: upright.z }, 0.022, darkWood, 0, 1, 7, 0.90);
            }
            const braceA = localToWorld(centre.x, centre.z, crateYaw, -crate.w * 0.34, crate.d * 0.52);
            const braceB = localToWorld(centre.x, centre.z, crateYaw, crate.w * 0.34, crate.d * 0.52);
            drawSegment({ x: braceA.x, y: crate.y - crate.h * 0.34, z: braceA.z }, { x: braceB.x, y: crate.y + crate.h * 0.34, z: braceB.z }, 0.021, darkWood, 0, 1, 7, 0.90);
            for (const band of [-0.24, 0.24]) {
              const bandPoint = localToWorld(centre.x, centre.z, crateYaw, band * crate.w, 0);
              mat4TRS(glModel, bandPoint.x, crate.y, bandPoint.z, crateYaw, 0, 0, 0.025, crate.h * 1.02, crate.d * 1.04);
              drawMesh(glMeshes.cube, [0.24, 0.20, 0.15], glModel, 0.02, 1, 7, 0.72);
            }
          }
        }
      } else if (officeTheme) {
        const width = Number(container.width) || 0.94;
        const depth = Number(container.depth) || 0.94;
        if (container.kind === 'bench') {
          mat4TRS(glModel, container.x, 0.43, container.z, container.yaw || 0, 0, 0, width, 0.16, depth);
          drawMesh(glMeshes.cube, container.colour, glModel, 0, 1, 3, 0.72);
          const back = localToWorld(container.x, container.z, container.yaw || 0, 0, -depth * 0.42);
          mat4TRS(glModel, back.x, 0.70, back.z, container.yaw || 0, -0.10, 0, width, 0.48, 0.10);
          drawMesh(glMeshes.cube, [container.colour[0] * 0.86, container.colour[1] * 0.86, container.colour[2] * 0.86], glModel, 0, 1, 3, 0.70);
          for (const side of [-1, 1]) {
            for (const fore of [-1, 1]) {
              const leg = localToWorld(container.x, container.z, container.yaw || 0, side * width * 0.38, fore * depth * 0.25);
              drawSegment({ x: leg.x, y: 0.05, z: leg.z }, { x: leg.x, y: 0.38, z: leg.z }, 0.040, [0.20, 0.23, 0.24], 0, 1, 3, 0.34);
            }
            const lower = localToWorld(container.x, container.z, container.yaw || 0, side * width * 0.34, -depth * 0.18);
            const upper = localToWorld(container.x, container.z, container.yaw || 0, side * width * 0.34, -depth * 0.39);
            drawSegment({ x: lower.x, y: 0.38, z: lower.z }, { x: upper.x, y: 0.68, z: upper.z }, 0.026, [0.20, 0.23, 0.24], 0, 1, 3, 0.34);
          }
        } else if (container.kind === 'planter') {
          mat4TRS(glModel, container.x, 0.30, container.z, container.yaw || 0, 0, 0, width, 0.58, depth);
          drawMesh(glMeshes.cube, container.colour, glModel, 0, 1, 3, 0.70);
          mat4TRS(glModel, container.x, 0.60, container.z, container.yaw || 0, 0, 0, width * 0.90, 0.08, depth * 0.82);
          drawMesh(glMeshes.cube, [0.12, 0.10, 0.075], glModel, 0, 1, 3, 0.82);
          for (let i = -2; i <= 2; i++) {
            const shrub = localToWorld(container.x, container.z, container.yaw || 0, i * width * 0.18, 0);
            mat4TRS(glModel, shrub.x, 0.77 + Math.abs(i) * 0.025, shrub.z, container.yaw || 0, 0, 0, width * 0.17, 0.34, depth * 0.74);
            drawMesh(glMeshes.sphere, [0.20, 0.48, 0.25], glModel, 0.01, 1, 3, 0.86);
          }
        } else if (container.kind === 'sofa') {
          mat4TRS(glModel, container.x, 0.35, container.z, container.yaw || 0, 0, 0, width, 0.34, depth);
          drawMesh(glMeshes.cube, container.colour, glModel, 0, 1, 3, 0.82);
          const back = localToWorld(container.x, container.z, container.yaw || 0, 0, -depth * 0.42);
          mat4TRS(glModel, back.x, 0.70, back.z, container.yaw || 0, -0.08, 0, width, 0.72, 0.18);
          drawMesh(glMeshes.cube, container.colour, glModel, 0, 1, 3, 0.84);
          for (const offset of [-0.24, 0.24]) {
            const cushion = localToWorld(container.x, container.z, container.yaw || 0, offset * width, 0.04);
            mat4TRS(glModel, cushion.x, 0.56, cushion.z, container.yaw || 0, 0, 0, width * 0.42, 0.14, depth * 0.70);
            drawMesh(glMeshes.cube, [container.colour[0] * 1.12, container.colour[1] * 1.12, container.colour[2] * 1.12], glModel, 0, 1, 3, 0.90);
          }
          for (const side of [-1, 1]) {
            const arm = localToWorld(container.x, container.z, container.yaw || 0, side * width * 0.46, 0.02);
            mat4TRS(glModel, arm.x, 0.55, arm.z, container.yaw || 0, 0, 0, width * 0.10, 0.42, depth * 0.82);
            drawMesh(glMeshes.cube, [container.colour[0] * 0.91, container.colour[1] * 0.91, container.colour[2] * 0.91], glModel, 0, 1, 3, 0.76);
            for (const fore of [-1, 1]) {
              const foot = localToWorld(container.x, container.z, container.yaw || 0, side * width * 0.38, fore * depth * 0.30);
              drawSegment({ x: foot.x, y: 0.04, z: foot.z }, { x: foot.x, y: 0.20, z: foot.z }, 0.028, [0.16, 0.18, 0.19], 0, 1, 3, 0.32);
            }
          }
        } else if (container.kind === 'reception') {
          mat4TRS(glModel, container.x, 0.58, container.z, container.yaw || 0, 0, 0, width, 1.12, depth);
          drawMesh(glMeshes.cube, container.colour, glModel, 0, 1, 3, 0.66);
          const top = localToWorld(container.x, container.z, container.yaw || 0, 0, 0.02);
          mat4TRS(glModel, top.x, 1.18, top.z, container.yaw || 0, 0, 0, width * 1.08, 0.12, depth * 1.08);
          drawMesh(glMeshes.cube, [0.66, 0.57, 0.42], glModel, 0.02, 1, 3, 0.50);
          const panel = localToWorld(container.x, container.z, container.yaw || 0, 0, depth * 0.51);
          mat4TRS(glModel, panel.x, 0.66, panel.z, container.yaw || 0, 0, 0, width * 0.58, 0.18, 0.025);
          drawMesh(glMeshes.cube, [0.20, 0.55, 0.68], glModel, 0.42, 1, 4, 0.12);
        } else if (container.kind === 'storage-lockers') {
          mat4TRS(glModel, container.x, 0.88, container.z, container.yaw || 0, 0, 0, width, 1.72, depth);
          drawMesh(glMeshes.cube, container.colour, glModel, 0, 1, 3, 0.58);
          const columns = 4;
          for (let column = 0; column < columns; column++) {
            const offset = -width * 0.375 + column * width * 0.25;
            const face = localToWorld(container.x, container.z, container.yaw || 0, offset, depth * 0.51);
            mat4TRS(glModel, face.x, 0.90, face.z, container.yaw || 0, 0, 0, width * 0.22, 1.54, 0.018);
            drawMesh(glMeshes.cube, [0.32, 0.37, 0.40], glModel, 0, 1, 3, 0.48);
            for (let vent = -1; vent <= 1; vent++) {
              const slot = localToWorld(face.x, face.z, container.yaw || 0, 0, 0.02);
              mat4TRS(glModel, slot.x, 1.38 + vent * 0.06, slot.z, container.yaw || 0, 0, 0, width * 0.11, 0.018, 0.012);
              drawMesh(glMeshes.cube, [0.12, 0.15, 0.17], glModel, 0, 1, 3, 0.34);
            }
            const handle = localToWorld(face.x, face.z, container.yaw || 0, width * 0.055, 0.028);
            mat4TRS(glModel, handle.x, 0.92, handle.z, container.yaw || 0, 0, 0, 0.022, 0.16, 0.016);
            drawMesh(glMeshes.cube, [0.72, 0.76, 0.77], glModel, 0.02, 1, 3, 0.34);
          }
        } else if (container.kind === 'low-storage') {
          mat4TRS(glModel, container.x, 0.43, container.z, container.yaw || 0, 0, 0, width, 0.82, depth);
          drawMesh(glMeshes.cube, container.colour, glModel, 0, 1, 3, 0.64);
          const top = localToWorld(container.x, container.z, container.yaw || 0, 0, 0);
          mat4TRS(glModel, top.x, 0.87, top.z, container.yaw || 0, 0, 0, width * 1.04, 0.08, depth * 1.06);
          drawMesh(glMeshes.cube, [0.62, 0.55, 0.44], glModel, 0.01, 1, 3, 0.60);
          for (const offset of [-0.28, 0, 0.28]) {
            const face = localToWorld(container.x, container.z, container.yaw || 0, offset * width, depth * 0.51);
            mat4TRS(glModel, face.x, 0.46, face.z, container.yaw || 0, 0, 0, width * 0.25, 0.52, 0.018);
            drawMesh(glMeshes.cube, [0.35, 0.31, 0.27], glModel, 0, 1, 3, 0.58);
            const handle = localToWorld(face.x, face.z, container.yaw || 0, 0, 0.024);
            mat4TRS(glModel, handle.x, 0.52, handle.z, container.yaw || 0, 0, 0, width * 0.10, 0.025, 0.012);
            drawMesh(glMeshes.cube, [0.75, 0.72, 0.66], glModel, 0.02, 1, 3, 0.38);
          }
        } else {
          mat4TRS(glModel, container.x, 0.62, container.z, container.yaw || 0, 0, 0, width, 1.22, depth);
          drawMesh(glMeshes.cube, container.colour, glModel, 0, 1, 3, 0.64);
          for (const y of [0.30, 0.58, 0.86]) {
            const face = localToWorld(container.x, container.z, container.yaw || 0, 0, depth * 0.51);
            mat4TRS(glModel, face.x, y, face.z, container.yaw || 0, 0, 0, width * 0.78, 0.025, 0.018);
            drawMesh(glMeshes.cube, [0.20, 0.24, 0.27], glModel, 0, 1, 3, 0.42);
          }
        }
      } else {
        const width = Number(container.width) || 0.94;
        const depth = Number(container.depth) || 0.94;
        const yaw = container.yaw || 0;
        const barrier = container.kind === 'barrier';
        const height = barrier ? 0.84 : 1.84;
        for (const side of [-1, 1]) {
          const skid = localToWorld(container.x, container.z, yaw, side * width * 0.32, 0);
          mat4TRS(glModel, skid.x, 0.055, skid.z, yaw, 0, 0, width * 0.14, 0.11, depth * 1.02);
          drawMesh(glMeshes.cube, [0.12, 0.16, 0.18], glModel, 0, 1, 3, 0.38);
        }
        mat4TRS(glModel, container.x, height * 0.5, container.z, yaw, 0, 0, width, height, depth);
        drawMesh(glMeshes.cube, container.colour, glModel, 0, 1, 3, barrier ? 0.52 : 0.62);
        if (!barrier) {
          for (const stripe of [-0.28, 0.28]) {
            const p = localToWorld(container.x, container.z, yaw, stripe * width, depth * 0.49);
            mat4TRS(glModel, p.x, height * 0.5, p.z, yaw, 0, 0, Math.max(0.035, width * 0.06), height * 0.84, 0.018);
            drawMesh(glMeshes.cube, [0.52, 0.56, 0.54], glModel, 0.02, 1, 3, 0.46);
          }
          mat4TRS(glModel, container.x, height * 0.90, container.z, yaw, 0, 0, width * 0.76, 0.10, depth * 1.02);
          drawMesh(glMeshes.cube, [0.06, 0.075, 0.08], glModel, 0, 1, 3, 0.34);
        }
      }
      setRenderElevationOffset(0);
    }

    for (const machine of worldBatches.machines) {
      setRenderElevationOffset(arenaElevationAt(machine.x, machine.z));
      if (desertTheme) {
        const width = Number(machine.width) || 0.94;
        const depth = Number(machine.depth) || 0.68;
        const yaw = machine.yaw || 0;
        if (machine.kind === 'market-stall') {
          const timber = machine.colour || [0.46, 0.25, 0.15];
          mat4TRS(glModel, machine.x, 0.62, machine.z, yaw, 0, 0, width, 0.16, depth);
          drawMesh(glMeshes.cube, [timber[0] * 1.05, timber[1] * 1.04, timber[2] * 1.02], glModel, 0, 1, 7, 0.94);
          mat4TRS(glModel, machine.x, 0.40, machine.z, yaw, 0, 0, width * 0.88, 0.32, depth * 0.82);
          drawMesh(glMeshes.cube, timber, glModel, 0, 1, 7, 0.90);
          for (const side of [-1, 1]) {
            for (const front of [-1, 1]) {
              const post = localToWorld(machine.x, machine.z, yaw, side * width * 0.40, front * depth * 0.34);
              drawSegment({ x: post.x, y: 0.06, z: post.z }, { x: post.x, y: 1.42, z: post.z }, 0.027, [0.29, 0.16, 0.08], 0, 1, 7, 0.90);
              mat4TRS(glModel, post.x, 1.39, post.z, yaw, 0, 0, 0.085, 0.085, 0.085);
              drawMesh(glMeshes.cube, [0.48, 0.29, 0.14], glModel, 0, 1, 7, 0.90);
            }
          }
          for (const front of [-1, 1]) {
            const left = localToWorld(machine.x, machine.z, yaw, -width * 0.40, front * depth * 0.34);
            const right = localToWorld(machine.x, machine.z, yaw, width * 0.40, front * depth * 0.34);
            drawSegment({ x: left.x, y: 1.39, z: left.z }, { x: right.x, y: 1.39, z: right.z }, 0.024, [0.38, 0.22, 0.11], 0, 1, 7, 0.90);
          }
          for (const side of [-1, 1]) {
            const front = localToWorld(machine.x, machine.z, yaw, side * width * 0.40, -depth * 0.34);
            const back = localToWorld(machine.x, machine.z, yaw, side * width * 0.40, depth * 0.34);
            drawSegment({ x: front.x, y: 1.39, z: front.z }, { x: back.x, y: 1.39, z: back.z }, 0.024, [0.38, 0.22, 0.11], 0, 1, 7, 0.90);
          }
          mat4TRS(glModel, machine.x, 1.44, machine.z, yaw, 0, 0, width * 1.18, 0.07, depth * 1.18);
          drawMesh(glMeshes.cube, [0.68, 0.36, 0.18], glModel, 0, 1, 7, 0.88);
          for (const stripe of [-0.34, 0, 0.34]) {
            const awning = localToWorld(machine.x, machine.z, yaw, stripe * width, 0);
            mat4TRS(glModel, awning.x, 1.48, awning.z, yaw, 0, 0, width * 0.18, 0.025, depth * 1.24);
            drawMesh(glMeshes.cube, stripe === 0 ? [0.82, 0.59, 0.28] : [0.42, 0.19, 0.13], glModel, 0.04, 1, 7, 0.86);
          }
          for (let item = -1; item <= 1; item++) {
            const basket = localToWorld(machine.x, machine.z, yaw, item * width * 0.26, depth * 0.05);
            mat4TRS(glModel, basket.x, 0.79 + Math.abs(item) * 0.025, basket.z, yaw, 0, 0, width * 0.18, 0.19, depth * 0.42);
            drawMesh(glMeshes.cylinder, [0.50, 0.31, 0.14], glModel, 0, 1, 7, 0.90);
            for (let fruit = 0; fruit < 3; fruit++) {
              const fruitPos = localToWorld(basket.x, basket.z, yaw, (fruit - 1) * width * 0.045, 0);
              mat4TRS(glModel, fruitPos.x, 0.91 + (fruit % 2) * 0.035, fruitPos.z, 0, 0, 0, 0.065, 0.065, 0.065);
              drawMesh(glMeshes.sphere, item === 0 ? [0.82, 0.42, 0.14] : [0.34, 0.56, 0.19], glModel, 0.02, 1, 7, 0.92);
            }
          }
        } else if (machine.kind === 'supply-cart') {
          const timber = machine.colour || [0.40, 0.24, 0.14];
          mat4TRS(glModel, machine.x, 0.47, machine.z, yaw, 0, 0, width, 0.42, depth);
          drawMesh(glMeshes.cube, timber, glModel, 0, 1, 7, 0.94);
          mat4TRS(glModel, machine.x, 0.72, machine.z, yaw, 0, 0, width * 1.05, 0.08, depth * 1.05);
          drawMesh(glMeshes.cube, [0.60, 0.39, 0.20], glModel, 0, 1, 7, 0.92);
          for (const side of [-1, 1]) {
            const wheel = localToWorld(machine.x, machine.z, yaw, side * width * 0.42, 0);
            mat4TRS(glModel, wheel.x, 0.27, wheel.z, yaw, 0, Math.PI / 2, depth * 0.54, 0.10, depth * 0.54);
            drawMesh(glMeshes.ring, [0.22, 0.13, 0.075], glModel, 0, 1, 7, 0.88);
            for (let spoke = 0; spoke < 4; spoke++) {
              const a = spoke * Math.PI / 4;
              drawSegment({ x: wheel.x - Math.cos(yaw) * Math.cos(a) * depth * 0.21, y: 0.27 - Math.sin(a) * depth * 0.21, z: wheel.z + Math.sin(yaw) * Math.cos(a) * depth * 0.21 }, { x: wheel.x + Math.cos(yaw) * Math.cos(a) * depth * 0.21, y: 0.27 + Math.sin(a) * depth * 0.21, z: wheel.z - Math.sin(yaw) * Math.cos(a) * depth * 0.21 }, 0.011, [0.40, 0.24, 0.12], 0, 1, 7, 0.84);
            }
          }
          const handleA = localToWorld(machine.x, machine.z, yaw, -width * 0.30, -depth * 0.45);
          const handleB = localToWorld(machine.x, machine.z, yaw, -width * 0.30, -depth * 0.98);
          const handleC = localToWorld(machine.x, machine.z, yaw, width * 0.30, -depth * 0.45);
          const handleD = localToWorld(machine.x, machine.z, yaw, width * 0.30, -depth * 0.98);
          drawSegment({ x: handleA.x, y: 0.55, z: handleA.z }, { x: handleB.x, y: 0.74, z: handleB.z }, 0.018, [0.28, 0.16, 0.08], 0, 1, 7, 0.88);
          drawSegment({ x: handleC.x, y: 0.55, z: handleC.z }, { x: handleD.x, y: 0.74, z: handleD.z }, 0.018, [0.28, 0.16, 0.08], 0, 1, 7, 0.88);
          drawSegment({ x: handleB.x, y: 0.74, z: handleB.z }, { x: handleD.x, y: 0.74, z: handleD.z }, 0.018, [0.28, 0.16, 0.08], 0, 1, 7, 0.88);
          for (const offset of [-0.22, 0.04, 0.27]) {
            const sack = localToWorld(machine.x, machine.z, yaw, offset * width, 0);
            mat4TRS(glModel, sack.x, 0.87 + Math.abs(offset) * 0.13, sack.z, yaw, 0, 0, width * 0.24, 0.28, depth * 0.52);
            drawMesh(glMeshes.sphere, offset > 0.2 ? [0.54, 0.30, 0.16] : [0.65, 0.51, 0.33], glModel, 0, 1, 7, 0.94);
          }
        } else {
          mat4TRS(glModel, machine.x, 0.32, machine.z, yaw, 0, 0, width * 1.05, 0.58, depth * 1.06);
          drawMesh(glMeshes.cube, [0.49, 0.34, 0.22], glModel, 0, 1, 7, 0.98);
          mat4TRS(glModel, machine.x, 0.68, machine.z, yaw, 0, 0, width * 0.87, 0.18, depth * 0.88);
          drawMesh(glMeshes.cube, machine.colour || [0.58, 0.43, 0.28], glModel, 0, 1, 7, 0.98);
          mat4TRS(glModel, machine.x, 0.82, machine.z, yaw, 0, 0, width * 1.12, 0.10, depth * 1.14);
          drawMesh(glMeshes.cube, [0.80, 0.63, 0.40], glModel, 0, 1, 7, 0.98);
          const inset = localToWorld(machine.x, machine.z, yaw, 0, depth * 0.54);
          mat4TRS(glModel, inset.x, 0.43, inset.z, yaw, 0, Math.PI * 0.25, width * 0.18, 0.18, 0.022);
          drawMesh(glMeshes.cube, [0.85, 0.61, 0.28], glModel, 0.08, 1, 7, 0.88);
          mat4TRS(glModel, machine.x, 0.98, machine.z, yaw, 0, 0, width * 0.30, 0.22, depth * 0.30);
          drawMesh(glMeshes.cylinder, [0.48, 0.23, 0.13], glModel, 0, 1, 7, 0.94);
        }
      } else if (officeTheme) {
        const width = Number(machine.width) || 0.96;
        const depth = Number(machine.depth) || 0.78;
        const yaw = machine.yaw || 0;
        if (machine.kind === 'coffee-station') {
          mat4TRS(glModel, machine.x, 0.52, machine.z, yaw, 0, 0, width, 1.02, depth);
          drawMesh(glMeshes.cube, machine.colour, glModel, 0, 1, 3, 0.62);
          mat4TRS(glModel, machine.x, 1.08, machine.z, yaw, 0, 0, width * 1.04, 0.10, depth * 1.04);
          drawMesh(glMeshes.cube, [0.54, 0.50, 0.45], glModel, 0.02, 1, 3, 0.52);
          const machineFace = localToWorld(machine.x, machine.z, yaw, -width * 0.20, depth * 0.24);
          mat4TRS(glModel, machineFace.x, 1.31, machineFace.z, yaw, 0, 0, width * 0.34, 0.40, depth * 0.36);
          drawMesh(glMeshes.cube, [0.08, 0.10, 0.11], glModel, 0, 1, 3, 0.42);
          const display = localToWorld(machineFace.x, machineFace.z, yaw, 0, depth * 0.19);
          mat4TRS(glModel, display.x, 1.39, display.z, yaw, 0, 0, width * 0.16, 0.09, 0.012);
          drawMesh(glMeshes.cube, [0.20, 0.72, 0.82], glModel, 0.58, 1, 4, 0.10);
          for (const cupOffset of [0.18, 0.32]) {
            const cup = localToWorld(machine.x, machine.z, yaw, cupOffset * width, depth * 0.12);
            mat4TRS(glModel, cup.x, 1.19, cup.z, yaw, 0, 0, 0.08, 0.16, 0.08);
            drawMesh(glMeshes.cylinder, [0.82, 0.84, 0.82], glModel, 0, 1, 3, 0.84);
          }
        } else if (machine.kind === 'vending-machine') {
          mat4TRS(glModel, machine.x, 0.96, machine.z, yaw, 0, 0, width, 1.88, depth);
          drawMesh(glMeshes.cube, machine.colour, glModel, 0, 1, 3, 0.52);
          const face = localToWorld(machine.x, machine.z, yaw, 0, depth * 0.51);
          mat4TRS(glModel, face.x, 1.22, face.z, yaw, 0, 0, width * 0.74, 1.20, 0.024);
          drawMesh(glMeshes.cube, [0.05, 0.10, 0.14], glModel, 0.02, 1, 3, 0.32);
          for (let row = 0; row < 3; row++) {
            for (let col = -1; col <= 1; col++) {
              const product = localToWorld(face.x, face.z, yaw, col * width * 0.19, 0.025);
              mat4TRS(glModel, product.x, 1.48 - row * 0.27, product.z, yaw, 0, 0, width * 0.12, 0.15, 0.014);
              drawMesh(glMeshes.cube, [(row + 1) * 0.12, 0.34 + col * 0.05, 0.56 - row * 0.08], glModel, 0.10, 1, 4, 0.24);
            }
          }
          const keypad = localToWorld(machine.x, machine.z, yaw, width * 0.34, depth * 0.53);
          mat4TRS(glModel, keypad.x, 1.15, keypad.z, yaw, 0, 0, width * 0.13, 0.30, 0.026);
          drawMesh(glMeshes.cube, [0.12, 0.16, 0.18], glModel, 0, 1, 3, 0.30);
          const tray = localToWorld(machine.x, machine.z, yaw, 0, depth * 0.54);
          mat4TRS(glModel, tray.x, 0.34, tray.z, yaw, 0, 0, width * 0.52, 0.16, 0.028);
          drawMesh(glMeshes.cube, [0.08, 0.10, 0.11], glModel, 0, 1, 3, 0.30);
        } else if (machine.kind === 'kitchenette') {
          mat4TRS(glModel, machine.x, 0.48, machine.z, yaw, 0, 0, width, 0.92, depth);
          drawMesh(glMeshes.cube, machine.colour, glModel, 0, 1, 3, 0.62);
          mat4TRS(glModel, machine.x, 0.98, machine.z, yaw, 0, 0, width * 1.04, 0.08, depth * 1.08);
          drawMesh(glMeshes.cube, [0.64, 0.66, 0.64], glModel, 0.02, 1, 3, 0.52);
          const sink = localToWorld(machine.x, machine.z, yaw, -width * 0.22, 0);
          mat4TRS(glModel, sink.x, 1.01, sink.z, yaw, 0, 0, width * 0.28, 0.025, depth * 0.56);
          drawMesh(glMeshes.cube, [0.22, 0.26, 0.28], glModel, 0.02, 1, 3, 0.34);
          const tap = localToWorld(machine.x, machine.z, yaw, -width * 0.22, -depth * 0.22);
          drawSegment({ x: tap.x, y: 1.02, z: tap.z }, { x: tap.x, y: 1.28, z: tap.z }, 0.024, [0.58, 0.62, 0.64], 0.02, 1, 3, 0.28);
          const microwave = localToWorld(machine.x, machine.z, yaw, width * 0.27, 0);
          mat4TRS(glModel, microwave.x, 1.22, microwave.z, yaw, 0, 0, width * 0.34, 0.38, depth * 0.64);
          drawMesh(glMeshes.cube, [0.18, 0.20, 0.21], glModel, 0, 1, 3, 0.38);
          const microwaveFace = localToWorld(microwave.x, microwave.z, yaw, 0, depth * 0.34);
          mat4TRS(glModel, microwaveFace.x, 1.23, microwaveFace.z, yaw, 0, 0, width * 0.22, 0.24, 0.018);
          drawMesh(glMeshes.cube, [0.06, 0.08, 0.09], glModel, 0, 1, 3, 0.30);
        } else if (machine.kind === 'workstation-pod') {
          mat4TRS(glModel, machine.x, 0.76, machine.z, yaw, 0, 0, width, 0.14, depth);
          drawMesh(glMeshes.cube, machine.colour, glModel, 0, 1, 3, 0.58);
          const divider = localToWorld(machine.x, machine.z, yaw, 0, -depth * 0.38);
          mat4TRS(glModel, divider.x, 1.18, divider.z, yaw, 0, 0, width * 1.02, 0.72, 0.055);
          drawMesh(glMeshes.cube, [0.30, 0.38, 0.40], glModel, 0, 1, 3, 0.52);
          for (const side of [-1, 1]) {
            const station = localToWorld(machine.x, machine.z, yaw, side * width * 0.25, 0);
            const stand = localToWorld(station.x, station.z, yaw, 0, -depth * 0.20);
            drawSegment({ x: stand.x, y: 0.79, z: stand.z }, { x: stand.x, y: 1.02, z: stand.z }, 0.027, [0.20, 0.23, 0.25], 0, 1, 3, 0.28);
            const monitor = localToWorld(station.x, station.z, yaw, 0, -depth * 0.27);
            mat4TRS(glModel, monitor.x, 1.12, monitor.z, yaw, 0, 0, width * 0.29, 0.28, 0.032);
            drawMesh(glMeshes.cube, [0.045, 0.065, 0.078], glModel, 0, 1, 3, 0.26);
            const screen = localToWorld(monitor.x, monitor.z, yaw, 0, 0.024);
            mat4TRS(glModel, screen.x, 1.12, screen.z, yaw, 0, 0, width * 0.25, 0.22, 0.012);
            drawMesh(glMeshes.cube, side < 0 ? [0.18, 0.54, 0.68] : [0.24, 0.62, 0.48], glModel, 0.56, 1, 4, 0.10);
            const keyboard = localToWorld(station.x, station.z, yaw, 0, depth * 0.10);
            mat4TRS(glModel, keyboard.x, 0.85, keyboard.z, yaw, -0.05, 0, width * 0.24, 0.025, depth * 0.20);
            drawMesh(glMeshes.cube, [0.12, 0.14, 0.15], glModel, 0, 1, 3, 0.36);
            const chair = localToWorld(station.x, station.z, yaw, 0, depth * 0.74);
            drawOfficeChair(chair.x, chair.z, yaw + Math.PI, width * 0.22, 0.34, [0.15, 0.22, 0.26]);
          }
        } else if (machine.kind === 'copier') {
          mat4TRS(glModel, machine.x, 0.55, machine.z, yaw, 0, 0, width, 1.08, depth);
          drawMesh(glMeshes.cube, machine.colour, glModel, 0, 1, 3, 0.64);
          mat4TRS(glModel, machine.x, 1.17, machine.z, yaw, -0.05, 0, width * 0.92, 0.28, depth * 0.86);
          drawMesh(glMeshes.cube, [0.66, 0.69, 0.70], glModel, 0, 1, 3, 0.72);
          const control = localToWorld(machine.x, machine.z, yaw, width * 0.25, depth * 0.48);
          mat4TRS(glModel, control.x, 1.12, control.z, yaw, 0, 0, width * 0.24, 0.14, 0.025);
          drawMesh(glMeshes.cube, [0.16, 0.44, 0.58], glModel, 0.45, 1, 4, 0.12);
        } else if (machine.kind === 'server-rack') {
          mat4TRS(glModel, machine.x, 1.04, machine.z, yaw, 0, 0, width, 2.02, depth);
          drawMesh(glMeshes.cube, machine.colour, glModel, 0, 1, 3, 0.40);
          const face = localToWorld(machine.x, machine.z, yaw, 0, depth * 0.51);
          for (let row = 0; row < 6; row++) {
            mat4TRS(glModel, face.x, 0.36 + row * 0.27, face.z, yaw, 0, 0, width * 0.72, 0.12, 0.022);
            drawMesh(glMeshes.cube, [0.06, 0.08, 0.10], glModel, 0, 1, 3, 0.34);
            for (let led = -1; led <= 1; led++) {
              const light = localToWorld(face.x, face.z, yaw, led * width * 0.20, 0.02);
              mat4TRS(glModel, light.x, 0.36 + row * 0.27, light.z, yaw, 0, 0, 0.035, 0.035, 0.012);
              drawMesh(glMeshes.cube, led === 0 ? [0.22, 0.82, 0.52] : [0.18, 0.55, 0.92], glModel, 0.78, 1, 4, 0.08);
            }
          }
        } else if (machine.kind === 'breaktable') {
          mat4TRS(glModel, machine.x, 0.76, machine.z, yaw, 0, 0, width, 0.13, depth);
          drawMesh(glMeshes.cylinder, machine.colour, glModel, 0, 1, 3, 0.58);
          drawSegment({ x: machine.x, y: 0.12, z: machine.z }, { x: machine.x, y: 0.72, z: machine.z }, 0.10, [0.30, 0.34, 0.36], 0, 1, 3, 0.34);
          for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
            const chair = { x: machine.x + Math.cos(angle) * 0.72, z: machine.z + Math.sin(angle) * 0.72 };
            drawOfficeChair(chair.x, chair.z, -angle, 0.34, 0.34, [0.18, 0.25, 0.29]);
          }
        } else {
          const conference = machine.kind === 'conference';
          mat4TRS(glModel, machine.x, 0.76, machine.z, yaw, 0, 0, width, 0.14, depth);
          drawMesh(glMeshes.cube, machine.colour, glModel, 0, 1, 3, conference ? 0.52 : 0.60);
          for (const side of [-1, 1]) {
            const leg = localToWorld(machine.x, machine.z, yaw, side * width * 0.34, 0);
            mat4TRS(glModel, leg.x, 0.38, leg.z, yaw, 0, 0, 0.09, 0.70, depth * 0.60);
            drawMesh(glMeshes.cube, [0.24, 0.28, 0.30], glModel, 0, 1, 3, 0.40);
          }
          if (conference) {
            for (const side of [-1, 1]) {
              for (const offset of [-0.30, 0, 0.30]) {
                const chair = localToWorld(machine.x, machine.z, yaw, offset * width, side * (depth * 0.78));
                drawOfficeChair(chair.x, chair.z, yaw + (side > 0 ? Math.PI : 0), width * 0.20, 0.32, [0.17, 0.24, 0.28]);
              }
            }
          } else {
            const monitorBase = localToWorld(machine.x, machine.z, yaw, 0, -depth * 0.20);
            drawSegment({ x: monitorBase.x, y: 0.79, z: monitorBase.z }, { x: monitorBase.x, y: 1.04, z: monitorBase.z }, 0.035, [0.24, 0.27, 0.29], 0, 1, 3, 0.28);
            const monitor = localToWorld(machine.x, machine.z, yaw, 0, -depth * 0.26);
            mat4TRS(glModel, monitor.x, 1.15, monitor.z, yaw, 0, 0, width * 0.46, 0.34, 0.035);
            drawMesh(glMeshes.cube, [0.05, 0.08, 0.10], glModel, 0, 1, 3, 0.28);
            const screen = localToWorld(monitor.x, monitor.z, yaw, 0, 0.026);
            mat4TRS(glModel, screen.x, 1.15, screen.z, yaw, 0, 0, width * 0.40, 0.27, 0.012);
            drawMesh(glMeshes.cube, [0.16, 0.52, 0.66], glModel, 0.62, 1, 4, 0.10);
            const keyboard = localToWorld(machine.x, machine.z, yaw, -width * 0.08, depth * 0.10);
            mat4TRS(glModel, keyboard.x, 0.85, keyboard.z, yaw, -0.05, 0, width * 0.34, 0.026, depth * 0.20);
            drawMesh(glMeshes.cube, [0.12, 0.14, 0.15], glModel, 0, 1, 3, 0.34);
            const mouse = localToWorld(machine.x, machine.z, yaw, width * 0.28, depth * 0.12);
            mat4TRS(glModel, mouse.x, 0.86, mouse.z, yaw, 0, 0, 0.07, 0.035, 0.10);
            drawMesh(glMeshes.sphere, [0.10, 0.12, 0.13], glModel, 0, 1, 3, 0.34);
            const drawer = localToWorld(machine.x, machine.z, yaw, -width * 0.36, 0);
            mat4TRS(glModel, drawer.x, 0.43, drawer.z, yaw, 0, 0, width * 0.22, 0.56, depth * 0.58);
            drawMesh(glMeshes.cube, [0.30, 0.31, 0.30], glModel, 0, 1, 3, 0.48);
            const chair = localToWorld(machine.x, machine.z, yaw, 0, depth * 0.72);
            drawOfficeChair(chair.x, chair.z, yaw + Math.PI, width * 0.34, 0.34, [0.16, 0.23, 0.27]);
          }
        }
      } else if (machine.kind === 'reactor') {
        // The plant core scales to whatever footprint the arena authored, so
        // the rendered shell and its collider stay the same size. Riser pipes
        // carry the core up into the roof steel instead of leaving a drum
        // sitting on its own in the middle of the hall.
        const coreWidth = Math.max(0.6, Number(machine.width) || 0.94);
        const coreDepth = Math.max(0.6, Number(machine.depth) || coreWidth);
        const scale = coreWidth / 0.94;
        const shellHeight = Math.min(sceneWallHeight - 0.34, 1.84 + (scale - 1) * 0.42);
        mat4TRS(glModel, machine.x, shellHeight * 0.5 + 0.02, machine.z, 0, 0, 0, coreWidth * 0.94, shellHeight, coreDepth * 0.94);
        drawMesh(glMeshes.cylinder, [0.055, 0.10, 0.075], glModel, 0, 1, 3, 0.36);
        mat4TRS(glModel, machine.x, shellHeight * 0.56, machine.z, 0, 0, 0, 0.42 * scale, shellHeight * 0.66, 0.42 * scale);
        const previousBatchEligibility = setStaticWorldBatchEligibility(false);
        drawMesh(glMeshes.cylinder, [0.18, 0.92, 0.42], glModel, 1.8 + Math.sin(time * 2.1) * 0.25, 0.82, 4, 0.10);
        setStaticWorldBatchEligibility(previousBatchEligibility);
        for (const ring of [0.28, shellHeight - 0.24]) {
          mat4TRS(glModel, machine.x, ring, machine.z, 0, 0, 0, coreWidth * 0.90, 0.11, coreDepth * 0.90);
          drawMesh(glMeshes.ring, [0.24, 0.32, 0.28], glModel, 0.12, 1, 3, 0.30);
        }
        if (scale > 1.3) {
          mat4TRS(glModel, machine.x, shellHeight + 0.05, machine.z, 0, 0, 0, coreWidth * 0.62, 0.10, coreDepth * 0.62);
          drawMesh(glMeshes.cylinder, [0.13, 0.18, 0.16], glModel, 0, 1, 3, 0.34);
          for (const sx of [-1, 1]) {
            for (const sz of [-1, 1]) {
              const riser = { x: machine.x + sx * coreWidth * 0.31, z: machine.z + sz * coreDepth * 0.31 };
              drawSegment({ x: riser.x, y: shellHeight - 0.10, z: riser.z }, { x: riser.x, y: sceneWallHeight - 0.02, z: riser.z }, 0.040, [0.20, 0.26, 0.28], 0, 1, 3, 0.30);
              mat4TRS(glModel, riser.x, shellHeight + 0.06, riser.z, 0, 0, 0, 0.12, 0.075, 0.12);
              drawMesh(glMeshes.cube, [0.30, 0.35, 0.36], glModel, 0, 1, 3, 0.28);
            }
          }
          for (const sz of [-1, 1]) {
            const face = { x: machine.x, z: machine.z + sz * coreDepth * 0.47 };
            mat4TRS(glModel, face.x, 1.12, face.z, 0, 0, 0, coreWidth * 0.34, 0.26, 0.035);
            drawMesh(glMeshes.cube, [0.16, 0.72, 0.88], glModel, 0.68, 1, 4, 0.12);
          }
        }
      } else {
        const width = Number(machine.width) || 0.94;
        const depth = Number(machine.depth) || 0.94;
        const yaw = machine.yaw || 0;
        const height = machine.kind === 'terminal' ? 1.34 : (machine.kind === 'relay' ? 1.48 : 1.76);
        mat4TRS(glModel, machine.x, 0.065, machine.z, yaw, 0, 0, width * 1.04, 0.13, depth * 1.04);
        drawMesh(glMeshes.cube, [0.16, 0.20, 0.21], glModel, 0, 1, 3, 0.36);
        mat4TRS(glModel, machine.x, height * 0.5, machine.z, yaw, 0, 0, width, height, depth);
        drawMesh(glMeshes.cube, machine.colour, glModel, 0, 1, 3, 0.48);
        const face = localToWorld(machine.x, machine.z, yaw, 0, depth * 0.51);
        mat4TRS(glModel, face.x, height * 0.78, face.z, yaw, -0.18, 0, width * 0.68, Math.min(0.30, height * 0.22), 0.04);
        drawMesh(glMeshes.cube, machine.kind === 'generator' ? [0.32, 0.82, 0.38] : [0.18, 0.72, 0.92], glModel, 0.72, 1, 4, 0.12);
        for (let i = -2; i <= 2; i++) {
          const vent = localToWorld(machine.x, machine.z, yaw, i * width * 0.14, depth * 0.515);
          mat4TRS(glModel, vent.x, height * 0.35, vent.z, yaw, 0, 0, Math.max(0.025, width * 0.04), height * 0.22, 0.02);
          drawMesh(glMeshes.cube, [0.25, 0.29, 0.30], glModel, 0, 1, 3, 0.28);
        }
      }
      setRenderElevationOffset(0);
    }

    for (const tank of worldBatches.tanks) {
      setRenderElevationOffset(arenaElevationAt(tank.x, tank.z));
      if (desertTheme) {
        const radius = Number(tank.radius) || 0.36;
        if (tank.kind === 'palm') {
          mat4TRS(glModel, tank.x, 0.22, tank.z, 0, 0, 0, radius * 1.52, 0.40, radius * 1.52);
          drawMesh(glMeshes.cylinder, [0.50, 0.29, 0.14], glModel, 0, 1, 7, 0.90);
          const trunk = [
            { x: tank.x, y: 0.36, z: tank.z },
            { x: tank.x + 0.035, y: 0.88, z: tank.z - 0.015 },
            { x: tank.x - 0.025, y: 1.42, z: tank.z + 0.035 },
            { x: tank.x + 0.045, y: 2.10, z: tank.z + 0.015 }
          ];
          for (let i = 0; i < trunk.length - 1; i++) {
            drawSegment(trunk[i], trunk[i + 1], 0.083 - i * 0.009, [0.34 + i * 0.025, 0.20 + i * 0.014, 0.09], 0, 1, 7, 0.90);
            mat4TRS(glModel, trunk[i + 1].x, trunk[i + 1].y - 0.05, trunk[i + 1].z, 0, 0, 0, 0.18 - i * 0.022, 0.045, 0.18 - i * 0.022);
            drawMesh(glMeshes.ring, [0.46, 0.28, 0.13], glModel, 0, 1, 7, 0.86);
          }
          const crown = trunk[trunk.length - 1];
          for (let i = 0; i < 10; i++) {
            const a = i * TAU / 10 + 0.16;
            const reach = 0.72 + (i % 3) * 0.09;
            const mid = { x: crown.x + Math.cos(a) * reach * 0.48, y: crown.y + 0.13 - (i % 2) * 0.04, z: crown.z + Math.sin(a) * reach * 0.48 };
            const end = { x: crown.x + Math.cos(a) * reach, y: crown.y - 0.02 - (i % 2) * 0.10, z: crown.z + Math.sin(a) * reach };
            drawSegment(crown, mid, 0.041, tank.colour || [0.30, 0.48, 0.18], 0, 1, 7, 0.94);
            drawSegment(mid, end, 0.029, [0.25, 0.43, 0.16], 0, 1, 7, 0.94);
            for (let leaf = 1; leaf <= 3; leaf++) {
              const t = leaf / 4;
              const leafBase = { x: lerp(mid.x, end.x, t), y: lerp(mid.y, end.y, t), z: lerp(mid.z, end.z, t) };
              const tangentX = -(end.z - mid.z);
              const tangentZ = end.x - mid.x;
              const tangentLength = Math.max(0.001, Math.hypot(tangentX, tangentZ));
              for (const side of [-1, 1]) {
                drawSegment(leafBase, { x: leafBase.x + tangentX / tangentLength * side * 0.14, y: leafBase.y - 0.025, z: leafBase.z + tangentZ / tangentLength * side * 0.14 }, 0.014, [0.29, 0.49, 0.18], 0, 1, 7, 0.92);
              }
            }
          }
        } else if (tank.kind === 'well') {
          mat4TRS(glModel, tank.x, 0.29, tank.z, 0, 0, 0, radius * 2.04, 0.52, radius * 2.04);
          drawMesh(glMeshes.cylinder, tank.colour || [0.52, 0.39, 0.26], glModel, 0, 1, 7, 0.98);
          for (let stone = 0; stone < 10; stone++) {
            const a = stone * TAU / 10;
            const x = tank.x + Math.cos(a) * radius * 0.86;
            const z = tank.z + Math.sin(a) * radius * 0.86;
            mat4TRS(glModel, x, 0.56, z, -a, 0, 0, radius * 0.56, 0.20, radius * 0.30);
            drawMesh(glMeshes.cube, stone % 2 ? [0.72, 0.54, 0.33] : [0.63, 0.45, 0.27], glModel, 0, 1, 7, 0.97);
          }
          mat4TRS(glModel, tank.x, 0.48, tank.z, 0, 0, 0, radius * 1.38, 0.065, radius * 1.38);
          drawMesh(glMeshes.cylinder, [0.08, 0.13, 0.14], glModel, 0.02, 1, 3, 0.60);
          for (const side of [-1, 1]) {
            const supportX = tank.x + side * radius * 0.72;
            drawSegment({ x: supportX, y: 0.57, z: tank.z }, { x: supportX, y: 1.60, z: tank.z }, 0.055, [0.34, 0.20, 0.10], 0, 1, 7, 0.91);
          }
          drawSegment({ x: tank.x - radius * 0.78, y: 1.58, z: tank.z }, { x: tank.x + radius * 0.78, y: 1.58, z: tank.z }, 0.054, [0.39, 0.23, 0.11], 0, 1, 7, 0.91);
          mat4TRS(glModel, tank.x, 1.58, tank.z, 0, 0, Math.PI / 2, radius * 0.38, 0.14, radius * 0.38);
          drawMesh(glMeshes.cylinder, [0.42, 0.25, 0.12], glModel, 0, 1, 7, 0.91);
          drawSegment({ x: tank.x, y: 1.52, z: tank.z }, { x: tank.x, y: 0.84, z: tank.z }, 0.010, [0.32, 0.22, 0.13], 0, 1, 7, 0.84);
          mat4TRS(glModel, tank.x, 0.80, tank.z, 0, 0, 0, radius * 0.30, 0.22, radius * 0.30);
          drawMesh(glMeshes.cylinder, [0.40, 0.25, 0.14], glModel, 0, 1, 7, 0.90);
        } else if (tank.kind === 'amphora-cluster') {
          const offsets = [{ x: -0.12, z: 0.02, scale: 1.0 }, { x: 0.12, z: 0.06, scale: 0.82 }, { x: 0.02, z: -0.13, scale: 0.68 }];
          for (let index = 0; index < offsets.length; index++) {
            const pot = offsets[index];
            const x = tank.x + pot.x;
            const z = tank.z + pot.z;
            const r = radius * pot.scale;
            mat4TRS(glModel, x, r * 0.94, z, 0, 0, 0, r * 1.35, r * 1.75, r * 1.35);
            drawMesh(glMeshes.sphere, index === 1 ? [0.68, 0.36, 0.18] : (tank.colour || [0.55, 0.29, 0.17]), glModel, 0, 1, 7, 0.94);
            mat4TRS(glModel, x, r * 1.84, z, 0, 0, 0, r * 0.66, r * 0.44, r * 0.66);
            drawMesh(glMeshes.cylinder, [0.73, 0.42, 0.22], glModel, 0, 1, 7, 0.94);
            mat4TRS(glModel, x, r * 2.08, z, 0, 0, 0, r * 0.76, r * 0.10, r * 0.76);
            drawMesh(glMeshes.ring, [0.84, 0.54, 0.29], glModel, 0, 1, 7, 0.92);
            for (const side of [-1, 1]) {
              const handleStart = { x: x + side * r * 0.46, y: r * 1.55, z };
              const handleOuter = { x: x + side * r * 0.67, y: r * 1.88, z };
              const handleReturn = { x: x + side * r * 0.30, y: r * 1.94, z };
              drawSegment(handleStart, handleOuter, r * 0.11, [0.61, 0.31, 0.16], 0, 1, 7, 0.92);
              drawSegment(handleOuter, handleReturn, r * 0.11, [0.61, 0.31, 0.16], 0, 1, 7, 0.92);
            }
          }
        } else {
          mat4TRS(glModel, tank.x, 0.30, tank.z, 0, 0, 0, radius * 1.70, 0.56, radius * 1.70);
          drawMesh(glMeshes.cylinder, tank.colour || [0.56, 0.28, 0.16], glModel, 0, 1, 7, 0.94);
          mat4TRS(glModel, tank.x, 0.59, tank.z, 0, 0, 0, radius * 1.50, 0.07, radius * 1.50);
          drawMesh(glMeshes.ring, [0.78, 0.49, 0.26], glModel, 0, 1, 7, 0.92);
          drawSegment({ x: tank.x, y: 0.56, z: tank.z }, { x: tank.x, y: 1.18, z: tank.z }, 0.035, [0.28, 0.35, 0.15], 0, 1, 7, 0.88);
          for (let leaf = 0; leaf < 6; leaf++) {
            const a = leaf * TAU / 6;
            const end = { x: tank.x + Math.cos(a) * radius * 0.86, y: 0.88 + (leaf % 2) * 0.16, z: tank.z + Math.sin(a) * radius * 0.86 };
            drawSegment({ x: tank.x, y: 1.10, z: tank.z }, end, 0.025, [0.32, 0.48, 0.18], 0, 1, 7, 0.91);
          }
        }
      } else if (officeTheme && tank.kind === 'fountain') {
        const radius = Number(tank.radius) || 0.70;
        mat4TRS(glModel, tank.x, 0.22, tank.z, 0, 0, 0, radius * 2.0, 0.40, radius * 2.0);
        drawMesh(glMeshes.cylinder, [0.40, 0.43, 0.42], glModel, 0, 1, 3, 0.68);
        mat4TRS(glModel, tank.x, 0.43, tank.z, 0, 0, 0, radius * 1.62, 0.10, radius * 1.62);
        drawMesh(glMeshes.ring, [0.66, 0.69, 0.67], glModel, 0.02, 1, 3, 0.58);
        setBlendMode(true);
        mat4TRS(glModel, tank.x, 0.37, tank.z, 0, 0, 0, radius * 1.52, 0.035, radius * 1.52);
        drawMesh(glMeshes.cylinder, tank.colour, glModel, 0.48, 0.30, 4, 0.08);
        drawSegment({ x: tank.x, y: 0.40, z: tank.z }, { x: tank.x, y: 1.18 + Math.sin(time * 2.0) * 0.08, z: tank.z }, 0.035, [0.48, 0.82, 0.92], 0.52, 0.25, 4, 0.08);
        setBlendMode(false);
        mat4TRS(glModel, tank.x, 0.68, tank.z, 0, 0, 0, radius * 0.42, 0.62, radius * 0.42);
        drawMesh(glMeshes.cylinder, [0.44, 0.47, 0.45], glModel, 0, 1, 3, 0.62);
      } else if (officeTheme && tank.kind === 'plant') {
        const radius = Number(tank.radius) || 0.36;
        mat4TRS(glModel, tank.x, 0.28, tank.z, 0, 0, 0, radius * 1.45, 0.54, radius * 1.45);
        drawMesh(glMeshes.cylinder, [0.42, 0.31, 0.22], glModel, 0, 1, 3, 0.72);
        drawSegment({ x: tank.x, y: 0.50, z: tank.z }, { x: tank.x, y: 1.24, z: tank.z }, 0.055, [0.24, 0.35, 0.20], 0, 1, 3, 0.72);
        for (let i = 0; i < 7; i++) {
          const angle = i * TAU / 7 + (i % 2) * 0.25;
          const y = 0.78 + (i % 3) * 0.22;
          const x = tank.x + Math.cos(angle) * radius * 0.72;
          const z = tank.z + Math.sin(angle) * radius * 0.72;
          mat4TRS(glModel, x, y, z, -angle, 0, 0.42, radius * 0.74, 0.10, radius * 0.30);
          drawMesh(glMeshes.sphere, tank.colour, glModel, 0.02, 1, 3, 0.88);
        }
      } else {
        const radius = Number(tank.radius) || 0.45;
        drawIndustrialTankGrounding(tank, radius);
        mat4TRS(glModel, tank.x, 0.92, tank.z, 0, 0, 0, radius * 2, 1.80, radius * 2);
        drawMesh(glMeshes.cylinder, tank.colour, glModel, 0, 1, 3, 0.44);
        for (const y of [0.32, 0.94, 1.56]) {
          mat4TRS(glModel, tank.x, y, tank.z, 0, 0, 0, radius * 2.10, 0.075, radius * 2.10);
          drawMesh(glMeshes.ring, [0.29, 0.32, 0.31], glModel, 0, 1, 3, 0.30);
        }
        drawSegment({x:tank.x,y:1.82,z:tank.z},{x:tank.x,y:2.12,z:tank.z},0.055,[0.24,0.28,0.29],0,1,3,0.28);
      }
      setRenderElevationOffset(0);
    }

    const previousDoorBatchEligibility = setStaticWorldBatchEligibility(false);
    for (const door of worldBatches.doors) {
      const state = ACTIVE_DOOR_STATES.find(item => item.id === door.id) || { ...door, openAmount: 0 };
      const panels = visibleDoorPanelDescriptors(state);
      if (!summitTheme && !desertTheme) {
        // Structural returns and a flush threshold make the frame visibly part
        // of the surrounding wall instead of a free-standing portal prop.
        drawDoorStructuralTies(door, officeTheme);
      }
      for (const side of [-1, 1]) {
        const p = localToWorld(door.x, door.z, door.yaw, side * 0.48, 0);
        mat4TRS(glModel, p.x, 1.18, p.z, door.yaw, 0, 0, officeTheme ? 0.065 : 0.095, 2.32, officeTheme ? 0.08 : 0.10);
        drawMesh(glMeshes.cube, officeTheme ? [0.38, 0.44, 0.47] : [0.10, 0.14, 0.16], glModel, officeTheme ? 0.02 : 0, 1, 3, 0.30);
        mat4TRS(glModel, p.x, 1.58, p.z, door.yaw, 0, 0, officeTheme ? 0.075 : 0.11, 0.18, officeTheme ? 0.09 : 0.12);
        drawMesh(glMeshes.cube, door.colour, glModel, 0.55, 1, 4, 0.14);
      }
      mat4TRS(glModel, door.x, 2.30, door.z, door.yaw, 0, 0, 1.12, officeTheme ? 0.14 : 0.18, officeTheme ? 0.10 : 0.12);
      drawMesh(glMeshes.cube, officeTheme ? [0.40, 0.46, 0.49] : [0.11, 0.15, 0.17], glModel, officeTheme ? 0.025 : 0, 1, 3, 0.30);
      for (const panel of panels) {
        if (officeTheme) {
          mat4TRS(glModel, panel.x, 1.18, panel.y, panel.yaw, 0, 0, panel.width, 2.18, panel.depth);
          drawMesh(glMeshes.cube, [0.32, 0.40, 0.43], glModel, 0.02, 1, 3, 0.28);
          setBlendMode(true);
          mat4TRS(glModel, panel.x, 1.22, panel.y, panel.yaw, 0, 0, panel.width * 0.82, 1.84, panel.depth * 0.42);
          drawMesh(glMeshes.cube, [0.60, 0.82, 0.87], glModel, 0.16, 0.50, 4, 0.08);
          setBlendMode(false);
          mat4TRS(glModel, panel.x, 1.18, panel.y, panel.yaw, 0, 0, panel.width * 0.84, 0.055, panel.depth * 1.12);
          drawMesh(glMeshes.cube, door.colour, glModel, 0.12, 1, 4, 0.18);
          // The handle disappears into the pocket with the source panel. Do
          // not leave a detached sliver when only a narrow clipped edge remains.
          if ((Number(panel.clipRatio) || 0) > 0.58 && panel.width > 0.18) {
            const handle = localToWorld(panel.x, panel.y, panel.yaw, -panel.side * panel.width * 0.28, panel.depth * 0.55);
            mat4TRS(glModel, handle.x, 1.08, handle.z, panel.yaw, 0, 0, 0.025, 0.28, 0.018);
            drawMesh(glMeshes.cube, [0.76, 0.80, 0.81], glModel, 0.03, 1, 3, 0.32);
          }
        } else {
          mat4TRS(glModel, panel.x, 1.18, panel.y, panel.yaw, 0, 0, panel.width, 2.16, panel.depth);
          drawMesh(glMeshes.cube, [0.16, 0.21, 0.23], glModel, 0, 1, 3, 0.36);
          for (const y of [0.60, 1.18, 1.76]) {
            mat4TRS(glModel, panel.x, y, panel.y, panel.yaw, 0, 0, panel.width * 0.84, 0.045, panel.depth * 1.10);
            drawMesh(glMeshes.cube, door.colour, glModel, 0.12, 1, 3, 0.44);
          }
        }
      }
      const indicator = localToWorld(door.x, door.z, door.yaw, 0, 0.065);
      mat4TRS(glModel, indicator.x, 2.31, indicator.z, door.yaw, 0, 0, 0.15, 0.045, 0.018);
      const indicatorColour = (Number(state.openAmount) || 0) > 0.85 ? [0.22, 0.86, 0.52] : [0.92, 0.40, 0.22];
      drawMesh(glMeshes.cube, indicatorColour, glModel, 0.82, 1, 4, 0.10);
    }
    setStaticWorldBatchEligibility(previousDoorBatchEligibility);

    if (activeArenaId !== 'summit') {
      for (const stair of worldBatches.stairs) drawCitadelStair(stair);
    }

    // Painted markings sit just above the floor grid so they read as paint on
    // the deck rather than as another layer of geometry.
    for (const hazard of worldBatches.hazardZones) drawCitadelHazardZone(hazard);

    for (const beacon of worldBatches.zoneBeacons) {
      setBlendMode(true);
      mat4TRS(glModel, beacon.x, 0.015, beacon.z, 0, 0, 0, 0.72, 0.012, 0.72);
      drawMesh(glMeshes.ring, beacon.colour, glModel, 0.8, 0.24, 4, 0.10);
      setBlendMode(false);
    }

    for (const line of worldBatches.floorLines) {
      mat4TRS(glModel, line.x, 0.006, line.z, 0, 0, 0, line.width, 0.012, line.depth);
      const gridColour = officeTheme
        ? (line.major ? OFFICE_CARPET_PRESENTATION.seamMajor : OFFICE_CARPET_PRESENTATION.seamMinor)
        : desertTheme
          ? (line.major ? [0.34, 0.25, 0.17] : [0.42, 0.32, 0.22])
          : summitTheme
            ? (line.major ? [0.25, 0.33, 0.35] : lineColour)
            : (line.major ? [0.055, 0.072, 0.078] : lineColour);
      drawMesh(glMeshes.cube, gridColour, glModel, 0, officeTheme ? (line.major ? 0.18 : 0.12) : desertTheme ? (line.major ? 0.10 : 0.040) : 1, desertTheme ? 7 : 3, officeTheme ? OFFICE_CARPET_PRESENTATION.roughness : summitTheme ? 0.92 : desertTheme ? 0.99 : (line.major ? 0.42 : 0.58));
    }
    for (const edge of [
      { x: MAP_W * 0.5, z: 0.42, width: MAP_W - 1.1, depth: 0.026 },
      { x: MAP_W * 0.5, z: MAP_H - 0.42, width: MAP_W - 1.1, depth: 0.026 },
      { x: 0.42, z: MAP_H * 0.5, width: 0.026, depth: MAP_H - 1.1 },
      { x: MAP_W - 0.42, z: MAP_H * 0.5, width: 0.026, depth: MAP_H - 1.1 }
    ]) {
      mat4TRS(glModel, edge.x, 0.008, edge.z, 0, 0, 0, edge.width, 0.012, edge.depth);
      drawMesh(glMeshes.cube, officeTheme ? [0.46, 0.50, 0.52] : desertTheme ? [0.46, 0.32, 0.20] : [0.11, 0.14, 0.16], glModel, 0.02, 1, desertTheme ? 7 : 3, officeTheme ? 0.58 : desertTheme ? 0.96 : 0.34);
    }

    for (const wall of worldBatches.walls) {
      mat4TRS(glModel, wall.x, sceneWallHeight / 2, wall.z, 0, 0, 0, wall.width, sceneWallHeight, wall.depth);
      drawMesh(glMeshes.cube, wall.variant ? wallA : wallB, glModel, 0, 1, desertTheme ? 7 : 2, desertTheme ? 0.97 : 0.74);
    }
    for (const kick of worldBatches.wallKickPlates) {
      mat4TRS(glModel, kick.x, kick.y, kick.z, 0, 0, 0, kick.width + kick.grow, kick.height, kick.depth + kick.grow);
      drawMesh(glMeshes.cube, officeTheme ? [0.36, 0.40, 0.42] : desertTheme ? [0.52, 0.36, 0.22] : summitTheme ? [0.22, 0.38, 0.41] : [0.13, 0.18, 0.205], glModel, summitTheme ? 0.01 : 0, 1, desertTheme ? 7 : 3, officeTheme ? 0.62 : summitTheme ? 0.58 : desertTheme ? 0.98 : 0.42);
    }
    for (const trim of worldBatches.trims) {
      mat4TRS(glModel, trim.x, trim.y, trim.z, 0, 0, 0, trim.width + trim.grow, trim.height, trim.depth + trim.grow);
      drawMesh(glMeshes.cube, trimColour, glModel, 0, 1, desertTheme ? 7 : 3, desertTheme ? 0.96 : 0.34);
    }
    for (const hazard of worldBatches.hazards) {
      mat4TRS(glModel, hazard.x, hazard.y, hazard.z, 0, 0, 0, hazard.width + hazard.grow, hazard.height, hazard.depth + hazard.grow);
      drawMesh(glMeshes.cube, hazardColour, glModel, 0.10, 1, 3, 0.50);
      // Dark interruptions make the band read as industrial warning tape.
      const count = Math.max(1, Math.floor((hazard.width + hazard.depth) * 1.5));
      for (let i = 0; i < count; i++) {
        const alongX = hazard.width >= hazard.depth;
        const px = alongX ? hazard.x - hazard.width / 2 + (i + 0.5) * hazard.width / count : hazard.x;
        const pz = alongX ? hazard.z : hazard.z - hazard.depth / 2 + (i + 0.5) * hazard.depth / count;
        mat4TRS(glModel, px, hazard.y + 0.003, pz, alongX ? 0 : Math.PI / 2, 0, 0.55, 0.05, hazard.height + 0.006, 0.02);
        drawMesh(glMeshes.cube, [0.055, 0.065, 0.070], glModel, 0, 1, 3, 0.52);
      }
    }

    for (const column of worldBatches.columns) {
      mat4TRS(glModel, column.x, sceneWallHeight * 0.5, column.z, 0, 0, 0, column.width, sceneWallHeight, column.depth);
      drawMesh(glMeshes.cube, officeTheme ? [0.50, 0.54, 0.56] : desertTheme ? [0.70, 0.54, 0.34] : summitTheme ? [0.42, 0.57, 0.60] : [0.18, 0.24, 0.28], glModel, summitTheme ? 0.015 : 0, 1, desertTheme ? 7 : 3, officeTheme ? 0.60 : summitTheme ? 0.64 : desertTheme ? 0.97 : 0.36);
      mat4TRS(glModel, column.x, 0.33, column.z, 0, 0, 0, column.width + 0.035, 0.11, column.depth + 0.035);
      drawMesh(glMeshes.cube, officeTheme ? [0.30, 0.34, 0.36] : desertTheme ? [0.42, 0.28, 0.18] : summitTheme ? [0.18, 0.42, 0.46] : [0.08, 0.105, 0.12], glModel, summitTheme ? 0.02 : 0, 1, desertTheme ? 7 : 3, officeTheme ? 0.54 : summitTheme ? 0.50 : desertTheme ? 0.98 : 0.30);
    }

    for (const beam of worldBatches.beams) {
      mat4TRS(glModel, beam.x, sceneWallHeight - 0.11, beam.z, 0, 0, 0, beam.width, 0.16, beam.depth);
      drawMesh(glMeshes.cube, summitTheme ? [0.50, 0.61, 0.64] : [0.075, 0.11, 0.135], glModel, summitTheme ? 0.012 : 0, 1, 3, summitTheme ? 0.62 : 0.30);
      if (!beam.capped) continue;
      for (const side of [-1, 1]) {
        mat4TRS(glModel, beam.x + side * beam.width * 0.5, sceneWallHeight - 0.11, beam.z, 0, 0, 0, 0.055, 0.24, beam.depth * 2.1);
        drawMesh(glMeshes.cube, [0.115, 0.155, 0.175], glModel, 0, 1, 3, 0.32);
      }
    }
    for (const tray of worldBatches.cableTrays) {
      mat4TRS(glModel, tray.x, sceneWallHeight - 0.25, tray.z, 0, 0, 0, tray.width, 0.055, tray.depth);
      drawMesh(glMeshes.cube, [0.105, 0.135, 0.15], glModel, 0, 1, 3, 0.44);
      for (let i = -1; i <= 1; i++) {
        const a = { x: tray.x - tray.width * 0.5, y: sceneWallHeight - 0.225 + i * 0.018, z: tray.z + i * 0.035 };
        const b = { x: tray.x + tray.width * 0.5, y: sceneWallHeight - 0.225 + i * 0.018, z: tray.z + i * 0.035 };
        drawSegment(a, b, 0.013, i === 0 ? [0.40, 0.22, 0.08] : [0.045, 0.055, 0.06], 0, 1, 6, 0.82);
      }
    }
    for (const pipe of worldBatches.pipes) {
      drawSegment({ x: pipe.x1, y: pipe.y, z: pipe.z1 }, { x: pipe.x2, y: pipe.y, z: pipe.z2 }, pipe.radius, pipe.colour, 0.015, 1, 3, 0.28);
      if (!pipe.capped) continue;
      // A run that stops at a wall needs a visible termination flange, and a
      // run of any length needs support straps, or it reads as a floating
      // cylinder once the surrounding masonry no longer hides its ends.
      const length = Math.hypot(pipe.x2 - pipe.x1, pipe.z2 - pipe.z1);
      for (const end of [[pipe.x1, pipe.z1], [pipe.x2, pipe.z2]]) {
        mat4TRS(glModel, end[0], pipe.y, end[1], 0, 0, 0, pipe.radius * 3.1, pipe.radius * 2.4, pipe.radius * 3.1);
        drawMesh(glMeshes.cube, [0.28, 0.33, 0.35], glModel, 0, 1, 3, 0.30);
      }
      if (!pipe.hangers || length < 1.4) continue;
      const straps = Math.max(1, Math.floor(length / 2.6));
      for (let index = 1; index <= straps; index++) {
        const t = index / (straps + 1);
        const x = lerp(pipe.x1, pipe.x2, t);
        const z = lerp(pipe.z1, pipe.z2, t);
        const strapTop = localCeilingHeightAt(x, z, sceneWallHeight);
        if (strapTop <= pipe.y + pipe.radius + 0.04) continue;
        drawSegment({ x, y: pipe.y + pipe.radius, z }, { x, y: strapTop, z }, 0.013, [0.22, 0.27, 0.29], 0, 1, 3, 0.30);
        mat4TRS(glModel, x, pipe.y + pipe.radius * 0.4, z, 0, 0, 0, pipe.radius * 2.6, 0.032, pipe.radius * 2.6);
        drawMesh(glMeshes.cube, [0.30, 0.35, 0.36], glModel, 0, 1, 3, 0.28);
      }
    }

    for (const ceilingPanel of worldBatches.ceilingPanels) {
      mat4TRS(glModel, ceilingPanel.x, sceneWallHeight - 0.035, ceilingPanel.z, 0, 0, 0, 1.34, 0.035, 0.72);
      drawMesh(glMeshes.cube, officeTheme ? [0.66, 0.69, 0.70] : [0.075, 0.105, 0.125], glModel, officeTheme ? 0.02 : 0, 1, 3, officeTheme ? 0.76 : 0.42);
    }

    for (const panel of worldBatches.wallPanels) {
      if (officeTheme) {
        mat4TRS(glModel, panel.x, 1.40, panel.z, panel.yaw, 0, 0, 0.58, 0.72, 0.038);
        drawMesh(glMeshes.cube, [0.20, 0.24, 0.26], glModel, 0, 1, 3, 0.42);
        mat4TRS(glModel, panel.x, 1.40, panel.z, panel.yaw, 0, 0, 0.49, 0.61, 0.044);
        const artColour = panel.variant === 20 ? [0.20, 0.48, 0.58] : (panel.variant === 21 ? [0.50, 0.35, 0.20] : [0.29, 0.52, 0.36]);
        drawMesh(glMeshes.cube, artColour, glModel, 0.06, 1, 3, 0.76);
        for (const offset of [-0.22, 0, 0.22]) {
          const stripe = localToWorld(panel.x, panel.z, panel.yaw, offset, 0.031);
          mat4TRS(glModel, stripe.x, 1.40 + offset * 0.42, stripe.z, panel.yaw, 0, 0, 0.08, 0.45, 0.012);
          drawMesh(glMeshes.cube, [0.78, 0.82, 0.80], glModel, 0.04, 0.34, 3, 0.82);
        }
      } else if (desertTheme) {
        mat4TRS(glModel, panel.x, 1.34, panel.z, panel.yaw, 0, 0, 0.58, 0.76, 0.040);
        drawMesh(glMeshes.cube, [0.56, 0.38, 0.22], glModel, 0, 1, 7, 0.96);
        mat4TRS(glModel, panel.x, 1.34, panel.z, panel.yaw, 0, 0, 0.46, 0.62, 0.047);
        const tileColour = panel.variant % 2 ? [0.18, 0.38, 0.42] : [0.58, 0.20, 0.13];
        drawMesh(glMeshes.cube, tileColour, glModel, 0.04, 1, 7, 0.90);
        for (const offset of [-0.18, 0, 0.18]) {
          const tile = localToWorld(panel.x, panel.z, panel.yaw, offset, 0.052);
          mat4TRS(glModel, tile.x, 1.34 + offset * 0.7, tile.z, panel.yaw, 0, 0, 0.055, 0.44, 0.012);
          drawMesh(glMeshes.cube, [0.86, 0.70, 0.42], glModel, 0.02, 0.42, 7, 0.92);
        }
      } else {
        mat4TRS(glModel, panel.x, 1.22, panel.z, panel.yaw, 0, 0, 0.45, 0.62, 0.038);
        drawMesh(glMeshes.cube, panel.variant === 2 ? [0.18, 0.25, 0.29] : [0.13, 0.19, 0.22], glModel, 0.02, 1, 3, 0.34);
        mat4TRS(glModel, panel.x, 1.22, panel.z, panel.yaw, 0, 0, 0.37, 0.49, 0.044);
        drawMesh(glMeshes.cube, [0.055, 0.075, 0.085], glModel, 0, 1, 3, 0.50);
        const screen = localToWorld(panel.x, panel.z, panel.yaw, -0.06, 0.030);
        mat4TRS(glModel, screen.x, 1.34, screen.z, panel.yaw, 0, 0, 0.20, 0.14, 0.014);
        drawMesh(glMeshes.cube, panel.variant === 7 ? [0.16, 0.58, 0.80] : [0.18, 0.75, 0.48], glModel, 1.12, 1, 4, 0.12);
        const lamp = localToWorld(panel.x, panel.z, panel.yaw, 0.14, 0.031);
        mat4TRS(glModel, lamp.x, 1.04, lamp.z, panel.yaw, 0, 0, 0.045, 0.028, 0.012);
        drawMesh(glMeshes.cube, [0.95, 0.45, 0.12], glModel, 1.4, 1, 4, 0.12);
      }
    }

    for (const vent of worldBatches.vents) {
      mat4TRS(glModel, vent.x, 1.63, vent.z, vent.yaw, 0, 0, 0.52, 0.32, 0.034);
      drawMesh(glMeshes.cube, [0.095, 0.13, 0.15], glModel, 0, 1, 3, 0.40);
      for (let i = -3; i <= 3; i++) {
        const slat = localToWorld(vent.x, vent.z, vent.yaw, i * 0.064, 0.022);
        mat4TRS(glModel, slat.x, 1.63, slat.z, vent.yaw, 0, 0, 0.014, 0.25, 0.014);
        drawMesh(glMeshes.cube, [0.30, 0.35, 0.37], glModel, 0, 1, 3, 0.32);
      }
    }

    for (const conduit of worldBatches.conduits) {
      const offset = localToWorld(conduit.x, conduit.z, conduit.yaw, -0.12, 0.025);
      drawSegment({ x: offset.x, y: 0.52, z: offset.z }, { x: offset.x, y: 1.72, z: offset.z }, 0.025, conduit.variant === 15 ? [0.44, 0.26, 0.09] : [0.22, 0.30, 0.34], 0, 1, 3, 0.31);
      for (const y of [0.68, 1.18, 1.62]) {
        mat4TRS(glModel, offset.x, y, offset.z, conduit.yaw, 0, 0, 0.085, 0.055, 0.035);
        drawMesh(glMeshes.cube, [0.075, 0.095, 0.105], glModel, 0, 1, 3, 0.36);
      }
    }

    const previousWarningBatchEligibility = setStaticWorldBatchEligibility(false);
    for (const warning of worldBatches.warningLights) {
      const pulse = 0.52 + 0.48 * Math.max(0, Math.sin(time * 2.4 + warning.phase));
      mat4TRS(glModel, warning.x, 1.82, warning.z, warning.yaw, 0, 0, 0.16, 0.18, 0.045);
      drawMesh(glMeshes.cube, [0.11, 0.08, 0.055], glModel, 0, 1, 3, 0.38);
      const bulb = localToWorld(warning.x, warning.z, warning.yaw, 0, 0.036);
      mat4TRS(glModel, bulb.x, 1.84, bulb.z, warning.yaw, 0, 0, 0.075, 0.075, 0.032);
      drawMesh(glMeshes.sphere, [1.0, 0.20, 0.055], glModel, 0.65 + pulse * 1.5, 1, 4, 0.10);
    }
    setStaticWorldBatchEligibility(previousWarningBatchEligibility);

    for (const number of worldBatches.wallNumbers) {
      const stripe = localToWorld(number.x, number.z, number.yaw, 0, 0.024);
      mat4TRS(glModel, stripe.x, 1.20, stripe.z, number.yaw, 0, 0, 0.28, 0.32, 0.018);
      drawMesh(glMeshes.cube, [0.70, 0.73, 0.70], glModel, 0.04, 1, 3, 0.60);
      for (let i = 0; i <= number.digit; i++) {
        const mark = localToWorld(number.x, number.z, number.yaw, -0.16 + i * 0.065, 0.035);
        mat4TRS(glModel, mark.x, 1.20, mark.z, number.yaw, 0, 0, 0.022, 0.22, 0.012);
        drawMesh(glMeshes.cube, [0.12, 0.15, 0.16], glModel, 0, 1, 3, 0.52);
      }
    }

    for (const bulkhead of worldBatches.bulkheads) {
      for (const side of [-1, 1]) {
        const post = localToWorld(bulkhead.x, bulkhead.z, bulkhead.yaw, side * 0.43, 0);
        mat4TRS(glModel, post.x, 1.02, post.z, bulkhead.yaw, 0, 0, officeTheme ? 0.065 : 0.095, 2.02, officeTheme ? 0.070 : 0.095);
        drawMesh(glMeshes.cube, officeTheme ? [0.34, 0.40, 0.43] : [0.11, 0.15, 0.17], glModel, 0, 1, 3, officeTheme ? 0.42 : 0.32);
        if (!officeTheme) {
          mat4TRS(glModel, post.x, 0.63, post.z, bulkhead.yaw, 0, 0, 0.112, 0.10, 0.112);
          drawMesh(glMeshes.cube, hazardColour, glModel, 0.08, 1, 3, 0.46);
        }
      }
      mat4TRS(glModel, bulkhead.x, 2.02, bulkhead.z, bulkhead.yaw, 0, 0, 0.98, officeTheme ? 0.11 : 0.16, officeTheme ? 0.08 : 0.12);
      drawMesh(glMeshes.cube, officeTheme ? [0.40, 0.45, 0.47] : [0.095, 0.13, 0.15], glModel, 0, 1, 3, officeTheme ? 0.46 : 0.32);
    }

    for (const grate of worldBatches.grates) {
      mat4TRS(glModel, grate.x, 0.009, grate.z, grate.yaw, 0, 0, 0.56, 0.012, 0.27);
      drawMesh(glMeshes.cube, [0.055, 0.072, 0.08], glModel, 0, 1, 3, 0.25);
      for (let i = -3; i <= 3; i++) {
        const slat = localToWorld(grate.x, grate.z, grate.yaw, i * 0.070, 0);
        mat4TRS(glModel, slat.x, 0.017, slat.z, grate.yaw, 0, 0, 0.014, 0.012, 0.23);
        drawMesh(glMeshes.cube, [0.30, 0.34, 0.35], glModel, 0, 1, 3, 0.22);
      }
    }

    for (const decal of worldBatches.floorDecals) {
      const colour = decal.kind ? [0.62, 0.50, 0.16] : [0.58, 0.62, 0.60];
      for (let i = -1; i <= 1; i++) {
        const p = localToWorld(decal.x, decal.z, decal.yaw, i * 0.12, 0);
        mat4TRS(glModel, p.x, 0.013, p.z, decal.yaw, 0, 0, 0.055, 0.012, 0.48 - Math.abs(i) * 0.10);
        drawMesh(glMeshes.cube, colour, glModel, 0.03, 0.72, 3, 0.62);
      }
    }

    for (const sign of worldBatches.signs) {
      const colour = sign.team === TEAM_BLUE ? [0.10, 0.42, 0.82] : [0.78, 0.13, 0.12];
      mat4TRS(glModel, sign.x, 0.016, sign.z, 0, 0, 0, 0.50, 0.012, 0.50);
      drawMesh(glMeshes.ring, colour, glModel, 0.42, 0.42, 4, 0.18);
    }

    const previousLightBatchEligibility = setStaticWorldBatchEligibility(false);
    for (const light of worldBatches.lights) {
      const pulse = officeTheme ? 1.02 : summitTheme ? 1.04 : 0.94 + Math.sin(time * 1.1 + light.x) * 0.025;
      const colour = officeTheme ? [0.92, 0.96, 0.94] : summitTheme ? (light.warm ? [1.0, 0.78, 0.48] : [0.66, 0.96, 1.0]) : (light.warm ? [1.0, 0.70, 0.38] : [0.72, 0.88, 1.0]);
      const housing = officeTheme ? [0.58, 0.62, 0.63] : summitTheme ? [0.38, 0.50, 0.53] : (light.warm ? [0.22, 0.16, 0.10] : [0.11, 0.16, 0.20]);
      mat4TRS(glModel, light.x, sceneWallHeight - 0.055, light.z, 0, 0, 0, officeTheme ? 1.05 : 0.74, 0.06, officeTheme ? 0.34 : 0.24);
      drawMesh(glMeshes.cube, housing, glModel, 0, 1, 3, officeTheme ? 0.66 : 0.34);
      mat4TRS(glModel, light.x, sceneWallHeight - 0.055, light.z, 0, 0, 0, officeTheme ? 0.92 : 0.62, 0.035, officeTheme ? 0.25 : 0.17);
      drawMesh(glMeshes.cube, colour, glModel, pulse, 1, 4, 0.12);
    }
    setStaticWorldBatchEligibility(previousLightBatchEligibility);
    setBlendMode(true);
    const previousLightEffectBatchEligibility = setStaticWorldBatchEligibility(false);
    for (const light of worldBatches.lights) {
      const pulse = 0.92 + Math.sin(time * 1.1 + light.x) * 0.08;
      const beamColour = officeTheme ? [0.70, 0.82, 0.80] : summitTheme ? (light.warm ? [0.92, 0.56, 0.20] : [0.20, 0.70, 0.76]) : (light.warm ? [0.75, 0.38, 0.12] : [0.28, 0.50, 0.72]);
      mat4TRS(glModel, light.x, sceneWallHeight - 0.10, light.z, 0, 0, 0, 1.38, 0.012, 0.70);
      drawMesh(glMeshes.disc, beamColour, glModel, 0.58, 0.068, 4, 0.18);
      drawGroundGlow(light.x, light.z, 1.58, 1.12, beamColour, 0.085 + pulse * 0.02, 0, 0.14);
      drawGroundGlow(light.x, light.z, 0.92, 0.68, light.warm ? [1.0, 0.76, 0.32] : [0.68, 0.88, 1.0], 0.06 + pulse * 0.012, 0, 0.28);
      if (!officeTheme && !summitTheme) for (let i = 0; i < 2; i++) {
        const phase = time * (0.22 + i * 0.05) + light.x * 0.71 + light.z * 0.37 + i * 1.7;
        const driftX = Math.sin(phase * 1.7) * 0.11 + (i === 0 ? -0.08 : 0.09);
        const driftZ = Math.cos(phase * 1.3) * 0.08 + (i === 0 ? 0.04 : -0.05);
        const y = 0.42 + (Math.sin(phase) * 0.5 + 0.5) * 1.62;
        mat4TRS(glModel, light.x + driftX, y, light.z + driftZ, 0, 0, 0, 0.045 + i * 0.012, 0.045 + i * 0.012, 0.045 + i * 0.012);
        drawMesh(glMeshes.sphere, light.warm ? [1.0, 0.72, 0.30] : [0.72, 0.90, 1.0], glModel, 0.26, 0.055 + i * 0.015, 4, 0.08);
      }
    }
    setStaticWorldBatchEligibility(previousLightEffectBatchEligibility);
    setBlendMode(false);
  }
