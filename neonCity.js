// neonCity.js
// This module handles all Neon City functionality: building and neon sign creation, updating, and drawing.

export const NeonCity = {
  buildings: [],
  neonSigns: [],

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

      // Create the building object.
      // Note: when drawing, the building's top will be at (baseY - building.height),
      // so the building's x is xPos and its height is buildingHeight.
      let building = {
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
          y: 160 - building.height - signHeight,
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

    // Generate new buildings on the right
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
          y: 160 - building.height - signHeight,
          width: signWidth,
          height: signHeight,
          flashSpeed: 2 + Math.random() * 2,
          colors: chosenScheme
        };
      }

      this.buildings.push(building);
      lastBuilding = this.buildings[this.buildings.length - 1];
      lastWasGarage = (buildingType === "garage");
    }

    // Generate new buildings on the left
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
          y: 160 - building.height - signHeight,
          width: signWidth,
          height: signHeight,
          flashSpeed: 2 + Math.random() * 2,
          colors: chosenScheme
        };
      }

      this.buildings.unshift(building);
      firstBuilding = this.buildings[0];
      firstWasGarage = (buildingType === "garage");
    }
    localStorage.setItem("neonCityBuildings", JSON.stringify(this.buildings));
  },

  drawBuildings: function(offset, baseY, canvas, ctx) {
    for (let i = 0; i < this.buildings.length; i++) {
      let building = this.buildings[i];
      let xPos = building.x - offset;
      if (xPos + building.width > 0 && xPos < canvas.width) {
        this.drawBuilding(building, baseY, xPos, ctx);
      }
    }
  },

  drawBuilding: function(building, baseY, xPos, ctx) {
    if (building.buildingType === "garage") {
      this.drawGarageBuilding(building, baseY, xPos, ctx);
      return;
    }
    ctx.fillStyle = "#555";
    ctx.fillRect(xPos, baseY - building.height, building.width, building.height);
    ctx.fillStyle = "#333";
    ctx.fillRect(xPos - 5, baseY - building.height - 10, building.width + 10, 10);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.strokeRect(xPos, baseY - building.height, building.width, building.height);

    if (building.windowPattern.length > 0) {
      const cols = building.windowPattern[0].length;
      const rows = building.windowPattern.length;
      const windowPaddingX = building.width * 0.07;
      const windowPaddingY = building.height * 0.07;
      const windowWidth = (building.width - (cols + 1) * windowPaddingX) / cols;
      const windowHeight = (building.height - (rows + 1) * windowPaddingY) / rows;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          let wx = xPos + windowPaddingX + col * (windowWidth + windowPaddingX);
          let wy = (baseY - building.height) + windowPaddingY + row * (windowHeight + windowPaddingY);
          ctx.fillStyle = building.windowPattern[row][col] ? "#d9d96f" : "#333333";
          ctx.fillRect(wx, wy, windowWidth, windowHeight);
        }
      }
    }

    if (building.integratedSign) {
      let sign = building.integratedSign;
      let signX = sign.x;
      const legWidth = sign.width * 0.125;
      const legHeight = sign.height * 0.3;
      const leftLegX = signX + sign.width * 0.2;
      const rightLegX = signX + sign.width * 0.65;
      ctx.fillStyle = "#777";
      ctx.fillRect(leftLegX, sign.y + sign.height - legHeight, legWidth, legHeight);
      ctx.fillRect(rightLegX, sign.y + sign.height - legHeight, legWidth, legHeight);
      ctx.strokeStyle = sign.colors.borderBase + "1)";
      ctx.lineWidth = 4;
      ctx.strokeRect(signX, sign.y, sign.width, sign.height * 0.7);
      const inset = 2;
      ctx.fillStyle = sign.colors.fillBase + "1)";
      ctx.fillRect(signX + inset, sign.y + inset, sign.width - inset * 2, sign.height * 0.7 - inset * 2);
    }
  },

  drawGarageBuilding: function(building, baseY, xPos, ctx) {
    ctx.fillStyle = "#3b3b3b";
    ctx.fillRect(xPos, baseY - building.height, building.width, building.height);
    const signHeight = building.height * 0.15;
    const signY = baseY - building.height;
    ctx.fillStyle = "#444";
    ctx.fillRect(xPos, signY, building.width, signHeight);
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 2;
    ctx.strokeRect(xPos + 2, signY + 2, building.width - 4, signHeight - 4);
    const shutterHeight = building.height * 0.70;
    const shutterY = signY + signHeight;
    const shutterX = xPos + building.width * 0.1;
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
      const keypadX = xPos + building.width - keypadWidth - 6;
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

  // Modified neon signs initialization to create both free-floating and building-attached signs.
  initNeonSigns: function(canvas, pickNonOverlappingX) {
    const savedSigns = localStorage.getItem("neonCityNeonSigns");
    if (savedSigns) {
      this.neonSigns = JSON.parse(savedSigns);
      return;
    }
    this.neonSigns = [];
    const signCount = 3;
    const colorSchemes = [
      { borderBase: "rgba(255,0,255,", fillBase: "rgba(0,255,255," },
      { borderBase: "rgba(0,255,255,", fillBase: "rgba(255,0,255," },
      { borderBase: "rgba(0,255,0,",   fillBase: "rgba(255,255,0," },
      { borderBase: "rgba(255,255,0,", fillBase: "rgba(0,255,0," }
    ];
    
    for (let i = 0; i < signCount; i++) {
      // 50% chance to attach the sign to a building if available.
      if (Math.random() < 0.5 && this.buildings && this.buildings.length > 0) {
        const buildingIndex = Math.floor(Math.random() * this.buildings.length);
        const building = this.buildings[buildingIndex];
        const maxOffset = Math.max(0, building.width - 40);
        const offsetWithinBuilding = Math.random() * maxOffset;
        const totalSignHeight = 50 + Math.random() * 30;
        // Calculate y so that the sign sits just above the building.
        const signY = 160 - building.height - totalSignHeight - 5;
        const signWidth = 30 + Math.random() * 20;
        const randomIndex = Math.floor(Math.random() * colorSchemes.length);
        const chosenScheme = colorSchemes[randomIndex];

        this.neonSigns.push({
          attachedBuildingIndex: buildingIndex, // This sign is attached.
          offset: offsetWithinBuilding,
          y: signY,
          width: signWidth,
          height: totalSignHeight,
          flashSpeed: 2 + Math.random() * 2,
          colors: chosenScheme
        });
      } else {
        // Free-floating sign.
        const totalSignHeight = 50 + Math.random() * 30;
        const signY = 160 - totalSignHeight;
        const signX = pickNonOverlappingX();
        const signWidth = 30 + Math.random() * 20;
        const randomIndex = Math.floor(Math.random() * colorSchemes.length);
        const chosenScheme = colorSchemes[randomIndex];

        this.neonSigns.push({
          x: signX,
          y: signY,
          width: signWidth,
          height: totalSignHeight,
          flashSpeed: 2 + Math.random() * 2,
          colors: chosenScheme
        });
      }
    }
    localStorage.setItem("neonCityNeonSigns", JSON.stringify(this.neonSigns));
  },

 // In neonCity.js, update the updateNeonSigns function to add margins and clean up off–screen signs:

updateNeonSigns: function(environmentOffset, canvas, pickNonOverlappingX) {
  const leftBound = environmentOffset;
  const rightBound = environmentOffset + canvas.width;
  // Define a margin so we only add signs when needed and remove old ones
  const rightMargin = rightBound + 100;
  const leftMargin = leftBound - 100;

  let lastSign = this.neonSigns[this.neonSigns.length - 1];
  while (!lastSign || (lastSign.x < rightMargin)) {
    const spacing = 200 + Math.random() * 50;
    const newX = lastSign ? lastSign.x + spacing : leftBound;
    const totalSignHeight = 50 + Math.random() * 30;
    const signY = 160 - totalSignHeight;
    const signWidth = 30 + Math.random() * 20;
    const colorSchemes = [
      { borderBase: "rgba(255,0,255,", fillBase: "rgba(0,255,255," },
      { borderBase: "rgba(0,255,255,", fillBase: "rgba(255,0,255," },
      { borderBase: "rgba(0,255,0,",   fillBase: "rgba(255,255,0," },
      { borderBase: "rgba(255,255,0,", fillBase: "rgba(0,255,0," }
    ];
    const randomIndex = Math.floor(Math.random() * colorSchemes.length);
    const chosenScheme = colorSchemes[randomIndex];
    this.neonSigns.push({
      x: newX,
      y: signY,
      width: signWidth,
      height: totalSignHeight,
      flashSpeed: 2 + Math.random() * 2,
      colors: chosenScheme
    });
    lastSign = this.neonSigns[this.neonSigns.length - 1];
  }

  let firstSign = this.neonSigns[0];
  while (!firstSign || (firstSign.x > leftMargin)) {
    const spacing = 200 + Math.random() * 50;
    const newX = firstSign ? firstSign.x - spacing : leftBound - spacing;
    const totalSignHeight = 50 + Math.random() * 30;
    const signY = 160 - totalSignHeight;
    const signWidth = 30 + Math.random() * 20;
    const colorSchemes = [
      { borderBase: "rgba(255,0,255,", fillBase: "rgba(0,255,255," },
      { borderBase: "rgba(0,255,255,", fillBase: "rgba(255,0,255," },
      { borderBase: "rgba(0,255,0,",   fillBase: "rgba(255,255,0," },
      { borderBase: "rgba(255,255,0,", fillBase: "rgba(0,255,0," }
    ];
    const randomIndex = Math.floor(Math.random() * colorSchemes.length);
    const chosenScheme = colorSchemes[randomIndex];
    this.neonSigns.unshift({
      x: newX,
      y: signY,
      width: signWidth,
      height: totalSignHeight,
      flashSpeed: 2 + Math.random() * 2,
      colors: chosenScheme
    });
    firstSign = this.neonSigns[0];
  }

  // Clean up any signs that have moved too far off screen on the left.
  this.neonSigns = this.neonSigns.filter(sign => sign.x + sign.width >= leftMargin);

  localStorage.setItem("neonCityNeonSigns", JSON.stringify(this.neonSigns));
},


  // Modified drawNeonSigns to anchor building-attached signs.
  drawNeonSigns: function(environmentOffset, canvas, ctx, globalTime) {
    for (let j = 0; j < this.neonSigns.length; j++) {
      const sign = this.neonSigns[j];
      let xPos;
      // If the sign is attached to a building, calculate its x based on the building's x.
      if (typeof sign.attachedBuildingIndex !== "undefined") {
        const building = this.buildings[sign.attachedBuildingIndex];
        if (!building) continue;
        xPos = building.x + sign.offset - environmentOffset;
      } else {
        // Free-floating sign: use its own x coordinate.
        xPos = sign.x - environmentOffset;
      }
      if (xPos + sign.width > 0 && xPos < canvas.width) {
        const alpha = 0.5 + 0.5 * Math.abs(Math.sin(globalTime * sign.flashSpeed));
        this.drawNeonSign(sign, xPos, alpha, ctx);
      }
    }
  },

  drawNeonSign: function(sign, xPos, alpha, ctx) {
    const signHeight = sign.height * 0.7;
    const legHeight  = sign.height * 0.3;
    const legWidth   = sign.width * 0.125;
    const leftLegX   = xPos + sign.width * 0.2;
    const rightLegX  = xPos + sign.width * 0.65;
    ctx.fillStyle = "#444444";
    ctx.fillRect(xPos, sign.y, sign.width, signHeight);
    ctx.fillStyle = "#777";
    ctx.fillRect(leftLegX, sign.y + signHeight, legWidth, legHeight);
    ctx.fillRect(rightLegX, sign.y + signHeight, legWidth, legHeight);
    ctx.strokeStyle = sign.colors.borderBase + alpha + ")";
    ctx.lineWidth = 4;
    ctx.strokeRect(xPos, sign.y, sign.width, signHeight);
    const inset = 2;
    ctx.fillStyle = sign.colors.fillBase + alpha + ")";
    ctx.fillRect(xPos + inset, sign.y + inset, sign.width - inset * 2, signHeight - inset * 2);
  }
};
