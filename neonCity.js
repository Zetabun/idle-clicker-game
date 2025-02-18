// neonCity.js
// This module handles all Neon City functionality: building and neon sign creation, updating, and drawing.

export const NeonCity = {
  buildings: [],
  neonSigns: [],
  lastSignUpdateOffset: 0, // track environment offset at last sign update

  initBuildings: function(canvas) {
    const savedBuildings = localStorage.getItem("neonCityBuildings");
    if (savedBuildings) {
      this.buildings = JSON.parse(savedBuildings);
      return;
    }
    this.buildings = [];
    let xPos = 0;
    let lastWasGarage = false;

    while (xPos < canvas.width) {
      const buildingRand = Math.random();
      let buildingType;
      if (lastWasGarage) {
        buildingType = (buildingRand < 0.5) ? "integrated" : "normal";
      } else {
        if (buildingRand < 0.33) {
          buildingType = "integrated";
        } else if (buildingRand < 0.66) {
          buildingType = "garage";
        } else {
          buildingType = "normal";
        }
      }

      let buildingWidth = 60 + Math.random() * 90;
      let buildingHeight, cols, rows, windowPattern = [];

      if (buildingType === "integrated") {
        buildingHeight = 80 + Math.random() * 40;
        cols = 3;
        rows = 1 + Math.floor(Math.random() * 2);
        for (let r = 0; r < rows; r++) {
          let rowPattern = [];
          for (let c = 0; c < cols; c++) {
            rowPattern.push(Math.random() >= 0.2);
          }
          windowPattern.push(rowPattern);
        }
      } else if (buildingType === "garage") {
        const minGarageWidth = 100;
        buildingWidth = Math.max(60 + Math.random() * 90, minGarageWidth);
        buildingHeight = 90 + Math.random() * 30;
        rows = 0;
        cols = 0;
      } else {
        // normal
        buildingHeight = 120 + Math.random() * 80;
        cols = 4;
        rows = 5;
        for (let r = 0; r < rows; r++) {
          let rowPattern = [];
          for (let c = 0; c < cols; c++) {
            rowPattern.push(Math.random() >= 0.2);
          }
          windowPattern.push(rowPattern);
        }
      }

      // Each building gets a unique ID for anchoring signs
      let building = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        x: xPos,
        width: buildingWidth,
        height: buildingHeight,
        windowPattern: windowPattern,
        buildingType: buildingType
      };

      if (buildingType === "integrated") {
        const signWidth = buildingWidth * (0.5 + Math.random() * 0.3);
        const signHeight = 20 + Math.random() * 10;
        const signX = xPos + (buildingWidth - signWidth) / 2;
        const colorSchemes = [
          { borderBase: "rgba(255,0,255,", fillBase: "rgba(0,255,255," },
          { borderBase: "rgba(0,255,255,", fillBase: "rgba(255,0,255," },
          { borderBase: "rgba(0,255,0,",   fillBase: "rgba(255,255,0," },
          { borderBase: "rgba(255,255,0,", fillBase: "rgba(0,255,0," }
        ];
        const randomIndex = Math.floor(Math.random() * colorSchemes.length);
        const chosenScheme = colorSchemes[randomIndex];
        building.integratedSign = {
          x: signX,
          y: 160 - buildingHeight - signHeight,
          width: signWidth,
          height: signHeight,
          flashSpeed: 2 + Math.random() * 2,
          colors: chosenScheme
        };
      }

      this.buildings.push(building);
      lastWasGarage = (buildingType === "garage");

      let gap = 10 + Math.random() * 40;
      xPos += buildingWidth + gap;
    }
    localStorage.setItem("neonCityBuildings", JSON.stringify(this.buildings));
  },

  updateBuildings: function(offset, canvas) {
    const leftBound = offset;
    const rightBound = offset + canvas.width;
    let lastBuilding = this.buildings[this.buildings.length - 1];
    let lastWasGarage = (lastBuilding && lastBuilding.buildingType === "garage");

    // Expand to the right
    while (!lastBuilding || (lastBuilding.x + lastBuilding.width < rightBound)) {
      let gap = 10 + Math.random() * 40;
      const newX = lastBuilding ? lastBuilding.x + lastBuilding.width + gap : leftBound;

      let buildingType;
      const buildingRand = Math.random();
      if (lastWasGarage) {
        buildingType = (buildingRand < 0.5) ? "integrated" : "normal";
      } else {
        if (buildingRand < 0.10) {
          buildingType = "garage";
        } else if (buildingRand < 0.55) {
          buildingType = "integrated";
        } else {
          buildingType = "normal";
        }
      }

      let buildingWidth = 60 + Math.random() * 90;
      let buildingHeight, cols, rows, windowPattern = [];
      if (buildingType === "integrated") {
        buildingHeight = 80 + Math.random() * 40;
        cols = 3;
        rows = 1 + Math.floor(Math.random() * 2);
        for (let r = 0; r < rows; r++) {
          let rowPattern = [];
          for (let c = 0; c < cols; c++) {
            rowPattern.push(Math.random() >= 0.2);
          }
          windowPattern.push(rowPattern);
        }
      } else if (buildingType === "garage") {
        const minGarageWidth = 100;
        buildingWidth = Math.max(60 + Math.random() * 90, minGarageWidth);
        buildingHeight = 90 + Math.random() * 30;
        rows = 0;
        cols = 0;
      } else {
        buildingHeight = 120 + Math.random() * 80;
        cols = 4;
        rows = 5;
        for (let r = 0; r < rows; r++) {
          let rowPattern = [];
          for (let c = 0; c < cols; c++) {
            rowPattern.push(Math.random() >= 0.2);
          }
          windowPattern.push(rowPattern);
        }
      }

      let building = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        x: newX,
        width: buildingWidth,
        height: buildingHeight,
        windowPattern: windowPattern,
        buildingType: buildingType
      };

      if (buildingType === "integrated") {
        const signWidth = buildingWidth * (0.5 + Math.random() * 0.3);
        const signHeight = 20 + Math.random() * 10;
        const signX = newX + (buildingWidth - signWidth) / 2;
        const colorSchemes = [
          { borderBase: "rgba(255,0,255,", fillBase: "rgba(0,255,255," },
          { borderBase: "rgba(0,255,255,", fillBase: "rgba(255,0,255," },
          { borderBase: "rgba(0,255,0,",   fillBase: "rgba(255,255,0," },
          { borderBase: "rgba(255,255,0,", fillBase: "rgba(0,255,0," }
        ];
        const randomIndex = Math.floor(Math.random() * colorSchemes.length);
        const chosenScheme = colorSchemes[randomIndex];
        building.integratedSign = {
          x: signX,
          y: 160 - buildingHeight - signHeight,
          width: signWidth,
          height: signHeight,
          flashSpeed: 2 + Math.random() * 2,
          colors: chosenScheme
        };
      }

      this.buildings.push(building);
      lastBuilding = building;
      lastWasGarage = (buildingType === "garage");
    }

    // Expand to the left
    let firstBuilding = this.buildings[0];
    let firstWasGarage = (firstBuilding && firstBuilding.buildingType === "garage");
    while (!firstBuilding || (firstBuilding.x > leftBound)) {
      let gap = 10 + Math.random() * 40;
      const newX = firstBuilding
        ? firstBuilding.x - (gap + (60 + Math.random() * 90))
        : leftBound - 60;

      let buildingType;
      const buildingRand = Math.random();
      if (firstWasGarage) {
        buildingType = (buildingRand < 0.5) ? "integrated" : "normal";
      } else {
        if (buildingRand < 0.10) {
          buildingType = "garage";
        } else if (buildingRand < 0.55) {
          buildingType = "integrated";
        } else {
          buildingType = "normal";
        }
      }

      let buildingWidth = 60 + Math.random() * 90;
      let buildingHeight, cols, rows, windowPattern = [];
      if (buildingType === "integrated") {
        buildingHeight = 80 + Math.random() * 40;
        cols = 3;
        rows = 1 + Math.floor(Math.random() * 2);
        for (let r = 0; r < rows; r++) {
          let rowPattern = [];
          for (let c = 0; c < cols; c++) {
            rowPattern.push(Math.random() >= 0.2);
          }
          windowPattern.push(rowPattern);
        }
      } else if (buildingType === "garage") {
        buildingHeight = 90 + Math.random() * 30;
        rows = 0;
        cols = 0;
      } else {
        buildingHeight = 120 + Math.random() * 80;
        cols = 4;
        rows = 5;
        for (let r = 0; r < rows; r++) {
          let rowPattern = [];
          for (let c = 0; c < cols; c++) {
            rowPattern.push(Math.random() >= 0.2);
          }
          windowPattern.push(rowPattern);
        }
      }

      let building = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        x: newX,
        width: buildingWidth,
        height: buildingHeight,
        windowPattern: windowPattern,
        buildingType: buildingType
      };

      if (buildingType === "integrated") {
        const signWidth = buildingWidth * (0.5 + Math.random() * 0.3);
        const signHeight = 20 + Math.random() * 10;
        const signX = newX + (buildingWidth - signWidth) / 2;
        const colorSchemes = [
          { borderBase: "rgba(255,0,255,", fillBase: "rgba(0,255,255," },
          { borderBase: "rgba(0,255,255,", fillBase: "rgba(255,0,255," },
          { borderBase: "rgba(0,255,0,",   fillBase: "rgba(255,255,0," },
          { borderBase: "rgba(255,255,0,", fillBase: "rgba(0,255,0," }
        ];
        const randomIndex = Math.floor(Math.random() * colorSchemes.length);
        const chosenScheme = colorSchemes[randomIndex];
        building.integratedSign = {
          x: signX,
          y: 160 - buildingHeight - signHeight,
          width: signWidth,
          height: signHeight,
          flashSpeed: 2 + Math.random() * 2,
          colors: chosenScheme
        };
      }

      this.buildings.unshift(building);
      firstBuilding = building;
      firstWasGarage = (buildingType === "garage");
    }
    localStorage.setItem("neonCityBuildings", JSON.stringify(this.buildings));
  },

  drawBuildings: function(offset, baseY, canvas, ctx) {
    // Render each building at (building.x - offset, baseY - building.height)
    for (let i = 0; i < this.buildings.length; i++) {
      let b = this.buildings[i];
      let screenX = b.x - offset;
      if (screenX + b.width > 0 && screenX < canvas.width) {
        if (b.buildingType === "garage") {
          this.drawGarageBuilding(b, baseY, screenX, ctx);
        } else {
          this.drawBuilding(b, baseY, screenX, ctx);
        }
      }
    }
  },

  drawBuilding: function(building, baseY, screenX, ctx) {
    ctx.fillStyle = "#555";
    ctx.fillRect(screenX, baseY - building.height, building.width, building.height);
    ctx.fillStyle = "#333";
    ctx.fillRect(screenX - 5, baseY - building.height - 10, building.width + 10, 10);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.strokeRect(screenX, baseY - building.height, building.width, building.height);

    if (building.windowPattern.length > 0) {
      const cols = building.windowPattern[0].length;
      const rows = building.windowPattern.length;
      const padX = building.width * 0.07;
      const padY = building.height * 0.07;
      const wWidth = (building.width - (cols + 1) * padX) / cols;
      const wHeight = (building.height - (rows + 1) * padY) / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let wx = screenX + padX + c * (wWidth + padX);
          let wy = (baseY - building.height) + padY + r * (wHeight + padY);
          ctx.fillStyle = building.windowPattern[r][c] ? "#d9d96f" : "#333333";
          ctx.fillRect(wx, wy, wWidth, wHeight);
        }
      }
    }

    // If the building has an integratedSign for decoration
    if (building.integratedSign) {
      const sign = building.integratedSign;
      // The building’s absolute X is building.x, but sign.x is also an absolute coordinate
      const signScreenX = sign.x - building.x + screenX;
      const legWidth = sign.width * 0.125;
      const legHeight = sign.height * 0.3;
      const leftLegX = signScreenX + sign.width * 0.2;
      const rightLegX = signScreenX + sign.width * 0.65;
      ctx.fillStyle = "#777";
      ctx.fillRect(leftLegX, sign.y + sign.height - legHeight, legWidth, legHeight);
      ctx.fillRect(rightLegX, sign.y + sign.height - legHeight, legWidth, legHeight);
      ctx.strokeStyle = sign.colors.borderBase + "1)";
      ctx.lineWidth = 4;
      ctx.strokeRect(signScreenX, sign.y, sign.width, sign.height * 0.7);
      const inset = 2;
      ctx.fillStyle = sign.colors.fillBase + "1)";
      ctx.fillRect(signScreenX + inset, sign.y + inset,
                   sign.width - inset * 2, sign.height * 0.7 - inset * 2);
    }
  },

  drawGarageBuilding: function(building, baseY, screenX, ctx) {
    ctx.fillStyle = "#3b3b3b";
    ctx.fillRect(screenX, baseY - building.height, building.width, building.height);
    const signHeight = building.height * 0.15;
    const signY = baseY - building.height;
    ctx.fillStyle = "#444";
    ctx.fillRect(screenX, signY, building.width, signHeight);
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 2;
    ctx.strokeRect(screenX + 2, signY + 2, building.width - 4, signHeight - 4);
    const shutterHeight = building.height * 0.70;
    const shutterY = signY + signHeight;
    const shutterX = screenX + building.width * 0.1;
    const shutterWidth = building.width * 0.8;
    ctx.fillStyle = "#555";
    ctx.fillRect(shutterX, shutterY, shutterWidth, shutterHeight);
    const slatCount = 8;
    ctx.beginPath();
    for (let i = 1; i < slatCount; i++) {
      let yLine = shutterY + (shutterHeight * (i / slatCount));
      ctx.moveTo(shutterX, yLine);
      ctx.lineTo(shutterX + shutterWidth, yLine);
    }
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.strokeRect(shutterX, shutterY, shutterWidth, shutterHeight);
    if (building.width > 120) {
      const keypadWidth = 14;
      const keypadHeight = 20;
      const keypadX = screenX + building.width - keypadWidth - 6;
      const keypadY = shutterY + 10;
      ctx.fillStyle = "#222";
      ctx.fillRect(keypadX, keypadY, keypadWidth, keypadHeight);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1;
      ctx.strokeRect(keypadX, keypadY, keypadWidth, keypadHeight);
      ctx.fillStyle = "#555";
      const buttonSize = 3;
      const margin = 2;
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          let bx = keypadX + margin + col * (buttonSize + margin);
          let by = keypadY + margin + row * (buttonSize + margin);
          ctx.fillRect(bx, by, buttonSize, buttonSize);
        }
      }
    }
  },

  // For NEON SIGNS: now each sign has worldX, worldY so it moves with environmentOffset
  initNeonSigns: function(canvas) {
    const saved = localStorage.getItem("neonCityNeonSigns");
    if (saved) {
      this.neonSigns = JSON.parse(saved);
      return;
    }
    this.neonSigns = [];

    // We'll spawn 6 signs initially
    const signCount = 6;
    for (let i = 0; i < signCount; i++) {
      // 50% chance to attach to a building
      if (Math.random() < 0.5 && this.buildings.length > 0) {
        // pick a building that doesn't have a sign
        const availableBuildings = this.buildings.filter(b =>
          !this.neonSigns.some(s => s.attachedBuildingId === b.id)
        );
        if (availableBuildings.length > 0) {
          const b = availableBuildings[Math.floor(Math.random() * availableBuildings.length)];
          const signWidth = 40 + Math.random() * 30; // larger sign
          const signHeight = 30 + Math.random() * 20;
          // place sign near building base
          const signY = 160 - signHeight - 2; 
          const offsetWithinBuilding = Math.random() * (b.width - signWidth);
          this.neonSigns.push({
            attachedBuildingId: b.id,
            offset: offsetWithinBuilding,
            width: signWidth,
            height: signHeight,
            worldY: signY,
            // color scheme
            ...this.randomNeonColor()
          });
          continue;
        }
      }
      // otherwise, free-floating sign at roadside
      const signWidth = 50 + Math.random() * 40; // bigger roadside sign
      const signHeight = 40 + Math.random() * 20;
      const signY = 120 + Math.random() * 20; // near road but above it
      const signX = Math.random() * canvas.width; // place them in the initial region
      this.neonSigns.push({
        worldX: signX,
        worldY: signY,
        width: signWidth,
        height: signHeight,
        ...this.randomNeonColor()
      });
    }
    localStorage.setItem("neonCityNeonSigns", JSON.stringify(this.neonSigns));
  },

  randomNeonColor() {
    const colorSchemes = [
      { borderBase: "rgba(255,0,255,", fillBase: "rgba(0,255,255," },
      { borderBase: "rgba(0,255,255,", fillBase: "rgba(255,0,255," },
      { borderBase: "rgba(0,255,0,",   fillBase: "rgba(255,255,0," },
      { borderBase: "rgba(255,255,0,", fillBase: "rgba(0,255,0," }
    ];
    const randomIndex = Math.floor(Math.random() * colorSchemes.length);
    const chosen = colorSchemes[randomIndex];
    return {
      borderBase: chosen.borderBase,
      fillBase: chosen.fillBase,
      flashSpeed: 2 + Math.random() * 2
    };
  },

  updateNeonSigns: function(environmentOffset, canvas) {
    // only spawn new signs if we've moved a decent chunk
    if (Math.abs(environmentOffset - this.lastSignUpdateOffset) < 50) {
      return;
    }
    this.lastSignUpdateOffset = environmentOffset;

    // We'll try to spawn a new sign on the right if we have space
    const rightEdge = environmentOffset + canvas.width;
    let lastSign = this.neonSigns[this.neonSigns.length - 1];
    while (!lastSign || (lastSign.worldX !== undefined && lastSign.worldX < rightEdge)) {
      const spacing = 200 + Math.random() * 100;
      const newX = lastSign && lastSign.worldX !== undefined
        ? lastSign.worldX + spacing
        : rightEdge;
      // random roadside sign
      const signWidth = 50 + Math.random() * 40;
      const signHeight = 40 + Math.random() * 20;
      const signY = 120 + Math.random() * 20;
      this.neonSigns.push({
        worldX: newX,
        worldY: signY,
        width: signWidth,
        height: signHeight,
        ...this.randomNeonColor()
      });
      lastSign = this.neonSigns[this.neonSigns.length - 1];
    }

    // We'll do the same for the left
    let firstSign = this.neonSigns[0];
    const leftEdge = environmentOffset;
    while (!firstSign || (firstSign.worldX !== undefined && firstSign.worldX > leftEdge)) {
      const spacing = 200 + Math.random() * 100;
      const newX = firstSign && firstSign.worldX !== undefined
        ? firstSign.worldX - spacing
        : leftEdge - spacing;
      const signWidth = 50 + Math.random() * 40;
      const signHeight = 40 + Math.random() * 20;
      const signY = 120 + Math.random() * 20;
      this.neonSigns.unshift({
        worldX: newX,
        worldY: signY,
        width: signWidth,
        height: signHeight,
        ...this.randomNeonColor()
      });
      firstSign = this.neonSigns[0];
    }

    localStorage.setItem("neonCityNeonSigns", JSON.stringify(this.neonSigns));
  },

  drawNeonSigns: function(environmentOffset, canvas, ctx, globalTime) {
    for (let i = 0; i < this.neonSigns.length; i++) {
      const sign = this.neonSigns[i];
      let screenX, screenY;

      if (typeof sign.attachedBuildingId !== "undefined") {
        // find the building
        const building = this.buildings.find(b => b.id === sign.attachedBuildingId);
        if (!building) continue;
        // building.x is world coordinate
        const worldX = building.x + (sign.offset || 0);
        screenX = worldX - environmentOffset;
        screenY = sign.worldY; // we set sign.worldY as the base
      } else {
        // free-floating sign: just subtract environmentOffset
        screenX = (sign.worldX || 0) - environmentOffset;
        screenY = sign.worldY || 130;
      }

      if (screenX + sign.width < 0 || screenX > canvas.width) {
        // off screen, skip
        continue;
      }

      const alpha = 0.5 + 0.5 * Math.abs(Math.sin(globalTime * (sign.flashSpeed || 2)));
      this.drawNeonSign(ctx, screenX, screenY, sign.width, sign.height,
                        sign.borderBase, sign.fillBase, alpha);
    }
  },

  drawNeonSign: function(ctx, x, y, w, h, borderBase, fillBase, alpha) {
    // We'll do the "main sign" as the top 70% of h
    const mainHeight = h * 0.7;
    const legHeight = h * 0.3;
    const legWidth = w * 0.125;

    // main rectangle
    ctx.fillStyle = "#444";
    ctx.fillRect(x, y, w, mainHeight);

    // legs
    const leftLegX = x + w * 0.2;
    const rightLegX = x + w * 0.65;
    ctx.fillStyle = "#777";
    ctx.fillRect(leftLegX, y + mainHeight, legWidth, legHeight);
    ctx.fillRect(rightLegX, y + mainHeight, legWidth, legHeight);

    // neon border
    ctx.strokeStyle = borderBase + alpha + ")";
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, w, mainHeight);

    // neon fill
    const inset = 2;
    ctx.fillStyle = fillBase + alpha + ")";
    ctx.fillRect(x + inset, y + inset, w - inset * 2, mainHeight - inset * 2);
  }
};
