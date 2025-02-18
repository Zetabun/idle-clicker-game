// neonCity.js
// This module handles all Neon City functionality: building and neon sign creation, updating, and drawing.

export const NeonCity = {
  buildings: [],
  neonSigns: [],
  lastSignUpdateOffset: 0, // Tracks environment offset when signs were last updated

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
      // Each building gets a unique id for anchoring signs.
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
    // Expand to the right.
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
    // Expand to the left.
    let firstBuilding = this.buildings[0];
    while (!firstBuilding || (firstBuilding.x > leftBound)) {
      let gap = 10 + Math.random() * 40;
      const newX = firstBuilding ? firstBuilding.x - (gap + (60 + Math.random() * 90)) : leftBound - 60;
      let buildingType;
      const buildingRand = Math.random();
      if (firstBuilding && firstBuilding.buildingType === "garage") {
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
    }
    localStorage.setItem("neonCityBuildings", JSON.stringify(this.buildings));
  },

  drawBuildings: function(offset, baseY, canvas, ctx) {
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
    if (building.integratedSign) {
      const sign = building.integratedSign;
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
      ctx.fillRect(signScreenX + inset, sign.y + inset, sign.width - inset * 2, sign.height * 0.7 - inset * 2);
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

  // Neon Signs use world coordinates so they move with the environment.
  initNeonSigns: function(canvas) {
    const saved = localStorage.getItem("neonCityNeonSigns");
    if (saved) {
      this.neonSigns = JSON.parse(saved);
      return;
    }
    this.neonSigns = [];
    // Spawn 6 initial signs: a mix of attached and free-standing.
    const signCount = 6;
    for (let i = 0; i < signCount; i++) {
      if (Math.random() < 0.5 && this.buildings.length > 0) {
        const available = this.buildings.filter(b =>
          !this.neonSigns.some(s => s.attachedBuildingId === b.id)
        );
        if (available.length > 0) {
          const b = available[Math.floor(Math.random() * available.length)];
          const signWidth = 50 + Math.random() * 20;
          const signHeight = 30 + Math.random() * 20;
          const signY = 160 - signHeight - 5;
          const offsetWithin = Math.random() * (b.width - signWidth);
          this.neonSigns.push({
            attachedBuildingId: b.id,
            offset: offsetWithin,
            width: signWidth,
            height: signHeight,
            worldY: signY,
            ...this.randomNeonColor()
          });
          continue;
        }
      }
      const signWidth = 50 + Math.random() * 20;  // Adjusted to be similar to road size
      const signHeight = 40 + Math.random() * 20;
      const signY = 60 + Math.random() * 20;
      const signX = Math.random() * canvas.width;
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

  randomNeonColor: function() {
    const schemes = [
      { borderBase: "rgba(255,0,255,", fillBase: "rgba(0,255,255," },
      { borderBase: "rgba(0,255,255,", fillBase: "rgba(255,0,255," },
      { borderBase: "rgba(0,255,0,",   fillBase: "rgba(255,255,0," },
      { borderBase: "rgba(255,255,0,", fillBase: "rgba(0,255,0," }
    ];
    const idx = Math.floor(Math.random() * schemes.length);
    const chosen = schemes[idx];
    return {
      borderBase: chosen.borderBase,
      fillBase: chosen.fillBase,
      flashSpeed: 2 + Math.random() * 2
    };
  },

  updateNeonSigns: function(environmentOffset, canvas) {
    // Only update if environmentOffset has changed by at least 100px to prevent constant spawning.
    if (Math.abs(environmentOffset - this.lastSignUpdateOffset) < 100) {
      return;
    }
    this.lastSignUpdateOffset = environmentOffset;
    const leftEdge = environmentOffset;
    const rightEdge = environmentOffset + canvas.width;
    // Add new free-standing signs on the right if needed
    let lastSign = this.neonSigns[this.neonSigns.length - 1];
    while (!lastSign || (lastSign.worldX !== undefined && lastSign.worldX < rightEdge + 300)) {
      const spacing = 150 + Math.random() * 100;
      const newX = lastSign && lastSign.worldX !== undefined ? lastSign.worldX + spacing : rightEdge + spacing;
      const signWidth = 50 + Math.random() * 20;  // Fixed to be similar to road size
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
    // Add new free-standing signs on the left if needed
    let firstSign = this.neonSigns[0];
    while (!firstSign || (firstSign.worldX !== undefined && firstSign.worldX > leftEdge - 300)) {
      const spacing = 150 + Math.random() * 100;
      const newX = firstSign && firstSign.worldX !== undefined ? firstSign.worldX - spacing : leftEdge - spacing;
      const signWidth = 50 + Math.random() * 20;
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
        const building = this.buildings.find(b => b.id === sign.attachedBuildingId);
        if (!building) continue;
        const worldX = building.x + (sign.offset || 0);
        screenX = worldX - environmentOffset;
        screenY = sign.worldY || 130;
      } else {
        screenX = (sign.worldX || 0) - environmentOffset;
        screenY = sign.worldY || 130;
      }
      if (screenX + sign.width < 0 || screenX > canvas.width) continue;
      const alpha = 0.5 + 0.5 * Math.abs(Math.sin(globalTime * (sign.flashSpeed || 2)));
      this.drawNeonSign(ctx, screenX, screenY, sign.width, sign.height,
                        sign.borderBase, sign.fillBase, alpha);
    }
  },

  drawNeonSign: function(ctx, x, y, w, h, borderBase, fillBase, alpha) {
    const mainHeight = h * 0.7;
    const legHeight = h * 0.3;
    const legWidth = w * 0.125;
    ctx.fillStyle = "#444";
    ctx.fillRect(x, y, w, mainHeight);
    const leftLegX = x + w * 0.2;
    const rightLegX = x + w * 0.65;
    ctx.fillStyle = "#777";
    ctx.fillRect(leftLegX, y + mainHeight, legWidth, legHeight);
    ctx.fillRect(rightLegX, y + mainHeight, legWidth, legHeight);
    ctx.strokeStyle = borderBase + alpha + ")";
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, w, mainHeight);
    const inset = 2;
    ctx.fillStyle = fillBase + alpha + ")";
    ctx.fillRect(x + inset, y + inset, w - inset * 2, mainHeight - inset * 2);
  }
};
