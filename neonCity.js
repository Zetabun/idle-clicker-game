// neonCity.js
// This module handles all Neon City functionality: building and neon sign creation, updating, and drawing.

export const NeonCity = {
  buildings: [],
  neonSigns: [],
  lastSignUpdateOffset: 0, // tracks the last environment offset when neon signs were updated

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

      // Assign a unique id to the building.
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
        // Only consider buildings that don't already have an attached sign
        const availableBuildings = this.buildings.filter(b =>
          !this.neonSigns.some(sign => sign.attachedBuildingId === b.id)
        );
        if (availableBuildings.length > 0) {
          const building = availableBuildings[Math.floor(Math.random() * availableBuildings.length)];
          const maxOffset = Math.max(0, building.width - 40);
          const offsetWithinBuilding = Math.random() * maxOffset;
          const totalSignHeight = 50 + Math.random() * 30;
          // Calculate y so that the sign sits just above the building.
          const signY = 160 - building.height - totalSignHeight - 5;
          const signWidth = 30 + Math.random() * 20;
          const randomIndex = Math.floor(Math.random() * colorSchemes.length);
          const chosenScheme = colorSchemes[randomIndex];

          this.neonSigns.push({
            attachedBuildingId: building.id, // This sign is attached.
            offset: offsetWithinBuilding,
            y: signY,
            width: signWidth,
            height: totalSignHeight,
            flashSpeed: 2 + Math.random() * 2,
            colors: chosenScheme
          });
          continue;
        }
      }
      // Otherwise spawn a free-floating sign.
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
    localStorage.setItem("neonCityNeonSigns", JSON.stringify(this.neonSigns));
  },

  // Updated updateNeonSigns to anchor signs relative to the environment and avoid overlap.
  updateNeonSigns: function(environmentOffset, canvas, pickNonOverlappingX) {
    const threshold = 50; // Update only if environment offset changes by at least 50 pixels
    if (Math.abs(environmentOffset - this.lastSignUpdateOffset) < threshold) {
      // Not enough movement—skip update so signs remain in place.
      return;
    }
    this.lastSignUpdateOffset = environmentOffset;

    const leftBound = environmentOffset;
    const rightBound = environmentOffset + canvas.width;
    const rightMargin = rightBound + 100;
    const leftMargin = leftBound - 100;

    // Add new free-floating signs on the right as needed.
    let lastSign = this.neonSigns[this.neonSigns.length - 1];
    while (!lastSign || (lastSign.x !== undefined && lastSign.x < rightMargin)) {
      const spacing = 200 + Math.random() * 50;
      const newX = lastSign && lastSign.x !== undefined ? lastSign.x + spacing : leftBound;
      // Ensure no free-floating sign overlaps the new one
      let overlaps = this.neonSigns.some(sign => {
        if (sign.x !== undefined) {
          return Math.abs(sign.x - newX) < (sign.width + 30);
        }
        return false;
      });
      if (!overlaps) {
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
      }
      lastSign = this.neonSigns[this.neonSigns.length - 1];
    }

    // Add new free-floating signs on the left if needed.
    let firstSign = this.neonSigns[0];
    while (!firstSign || (firstSign.x !== undefined && firstSign.x > leftBound)) {
      const spacing = 200 + Math.random() * 50;
      const newX = firstSign && firstSign.x !== undefined ? firstSign.x - spacing : leftBound - spacing;
      let overlaps = this.neonSigns.some(sign => {
        if (sign.x !== undefined) {
          return Math.abs(sign.x - newX) < (sign.width + 30);
        }
        return false;
      });
      if (!overlaps) {
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
      }
      firstSign = this.neonSigns[0];
    }

    localStorage.setItem("neonCityNeonSigns", JSON.stringify(this.neonSigns));
  },

  // Modified drawNeonSigns to anchor building-attached signs.
  drawNeonSigns: function(environmentOffset, canvas, ctx, globalTime) {
    for (let j = 0; j < this.neonSigns.length; j++) {
      const sign = this.neonSigns[j];
      let xPos;
      // If the sign is attached to a building, look it up by id.
      if (typeof sign.attachedBuildingId !== "undefined") {
        const building = this.buildings.find(b => b.id === sign.attachedBuildingId);
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
