(function() {
  "use strict";

  // ========== CONFIGURATIONS ==========

  const WEATHERS = [
    { name: "Clear", effect: null },
    { name: "Rain", effect: "speed reduction" },
    { name: "Snow", effect: "stuck chance" },
    { name: "Storm", effect: "severe speed reduction" },
    { name: "Fog", effect: "visibility reduction" }
  ];

  const ENVIRONMENTS = [
    {
      name: "City",
      fallbackColor: "#444444",
      comments: [
        "The urban sprawl buzzes with activity",
        "Skyscrapers loom over busy streets"
      ]
    },
    {
      name: "Desert",
      fallbackColor: "#EDC9Af",
      comments: [
        "The scorching desert stretches out endlessly",
        "Heat waves distort the horizon"
      ]
    },
    {
      name: "Neon City",
      fallbackColor: "#2a0030",
      comments: [
        "Neon lights flicker in the distance",
        "You pass by a glowing data terminal"
      ]
    },
    {
      name: "Digital Wasteland",
      fallbackColor: "#330000",
      comments: [
        "Corrupted data streams flicker across cracked monitors",
        "You find remnants of ancient code etched into obsidian slabs"
      ]
    },
    {
      name: "Quantum Forest",
      fallbackColor: "#002200",
      comments: [
        "Trees shimmer with probability waves",
        "Schrödinger's cat watches from a branch"
      ]
    }
  ];

  // Track whether we've already initialized Neon City
  let currentNeonCityEnv = "";

  // Global environment history for Neon City transitions
  let environmentHistory = [];

  // Prevent multiple "ran out of fuel" logs
  let fuelRanOutLogged = false;

  // --- Neon City Module ---
  // Consolidates all Neon City functionality (buildings and neon signs).
  const NeonCity = {
    buildings: [],
    neonSigns: [],

    // Initialize buildings with fixed window patterns.
    initBuildings: function() {
      const savedBuildings = localStorage.getItem("neonCityBuildings");
      if (savedBuildings) {
        this.buildings = JSON.parse(savedBuildings);
        return;
      }
      this.buildings = [];
      let xPos = 0;
      let lastWasGarage = false;  // Track if previous building was garage

      while (xPos < canvas.width) {
        // Original spawn chance
        const buildingRand = Math.random();
        let buildingType;

        // If last building was a garage, force integrated or normal:
        if (lastWasGarage) {
          if (buildingRand < 0.5) buildingType = "integrated";
          else buildingType = "normal";
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

    // Keep building coverage across visible region
    updateBuildings: function(offset) {
      const leftBound = offset;
      const rightBound = offset + canvas.width;
      let lastBuilding = this.buildings[this.buildings.length - 1];
      let lastWasGarage = (lastBuilding && lastBuilding.buildingType === "garage");

      while (!lastBuilding || (lastBuilding.x + lastBuilding.width < rightBound)) {
        let gap = 10 + Math.random() * 40;
        const newX = lastBuilding ? lastBuilding.x + lastBuilding.width + gap : leftBound;
        let buildingType;
        const buildingRand = Math.random();
        if (lastWasGarage) {
          if (buildingRand < 0.5) buildingType = "integrated";
          else buildingType = "normal";
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
          if (buildingRand < 0.5) buildingType = "integrated";
          else buildingType = "normal";
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

    // Draw all buildings
    drawBuildings: function(offset, baseY) {
      for (let i = 0; i < this.buildings.length; i++) {
        let building = this.buildings[i];
        let xPos = building.x - offset;
        if (xPos + building.width > 0 && xPos < canvas.width) {
          this.drawBuilding(building, baseY, xPos);
        }
      }
    },

    // Draw a single building
    drawBuilding: function(building, baseY, xPos) {
      if (building.buildingType === "garage") {
        this.drawGarageBuilding(building, baseY, xPos);
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
        let signX = sign.x - game.car.environmentOffset;
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

    // Draw the garage building as a shuttered shopfront
    drawGarageBuilding: function(building, baseY, xPos) {
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

    // ================== NEON SIGN CODE ==================
    initNeonSigns: function() {
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
        const totalSignHeight = 50 + Math.random() * 30;
        const signY = 160 - totalSignHeight;
        const signX = pickNonOverlappingX();
        const randomIndex = Math.floor(Math.random() * colorSchemes.length);
        const chosenScheme = colorSchemes[randomIndex];
        this.neonSigns.push({
          x: signX,
          y: signY,
          width: 30 + Math.random() * 20,
          height: totalSignHeight,
          flashSpeed: 2 + Math.random() * 2,
          colors: chosenScheme
        });
      }
      localStorage.setItem("neonCityNeonSigns", JSON.stringify(this.neonSigns));
    },

    updateNeonSigns: function(environmentOffset) {
      const leftBound = environmentOffset;
      const rightBound = environmentOffset + canvas.width;
      let lastSign = this.neonSigns[this.neonSigns.length - 1];
      while (!lastSign || (lastSign.x < rightBound)) {
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
      while (!firstSign || (firstSign.x > leftBound)) {
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
      localStorage.setItem("neonCityNeonSigns", JSON.stringify(this.neonSigns));
    },

    drawNeonSigns: function(environmentOffset) {
      for (let j = 0; j < this.neonSigns.length; j++) {
        const sign = this.neonSigns[j];
        const xPos = sign.x - environmentOffset;
        if (xPos + sign.width > 0 && xPos < canvas.width) {
          const alpha = 0.5 + 0.5 * Math.abs(Math.sin(globalTime * sign.flashSpeed));
          this.drawNeonSign(sign, xPos, alpha);
        }
      }
    },

    drawNeonSign: function(sign, xPos, alpha) {
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

  // ========== DAY-NIGHT CYCLE ==========
  // 120-second full cycle (60 sec day, 60 sec night)
  const DAY_NIGHT_CYCLE = 120;
  let dayNightTimer = 0;
  let prevBrightness = 0.5 + 0.5 * Math.cos(2 * Math.PI * (dayNightTimer / DAY_NIGHT_CYCLE));

  function updateDayNight(deltaTime) {
    dayNightTimer = (dayNightTimer + deltaTime) % DAY_NIGHT_CYCLE;
    let brightness = 0.5 + 0.5 * Math.cos(2 * Math.PI * (dayNightTimer / DAY_NIGHT_CYCLE));
    if (prevBrightness > 0.5 && brightness <= 0.5) {
      addLog("Sunset: The sun is setting, darkness falls.", "env");
    } else if (prevBrightness < 0.5 && brightness >= 0.5) {
      addLog("Sunrise: The sun is rising, light returns.", "env");
    }
    prevBrightness = brightness;
    return brightness;
  }

  // ========== GLOBAL HELPER FUNCTIONS ==========
  function pickNonOverlappingX() {
    const leftEnv = game.car.environmentOffset;
    const rightEnv = game.car.environmentOffset + canvas.width;
    for (let attempt = 0; attempt < 100; attempt++) {
      const candidateX = leftEnv + Math.random() * (rightEnv - leftEnv);
      let overlapsBuilding = NeonCity.buildings.some(b =>
        candidateX >= (b.x - 10) && candidateX <= (b.x + b.width + 10)
      );
      let overlapsSign = NeonCity.neonSigns.some(s =>
        candidateX >= (s.x - 10) && candidateX <= (s.x + s.width + 10)
      );
      if (!overlapsBuilding && !overlapsSign) {
        return candidateX;
      }
    }
    return leftEnv + 10;
  }

  function overlapsAnyBuilding(xCandidate) {
    for (let b of NeonCity.buildings) {
      const leftEdge  = b.x;
      const rightEdge = b.x + b.width;
      if (xCandidate >= leftEdge && xCandidate <= rightEdge) {
        return true;
      }
    }
    return false;
  }

  function formatNumber(num) {
    if (num < 1000) return num.toFixed(0);
    const suffixes = ["K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
    let exponent = Math.floor(Math.log10(num) / 3);
    let mantissa = num / Math.pow(1000, exponent);
    return mantissa.toFixed(2) + suffixes[exponent - 1];
  }

  function mod(n, m) {
    return ((n % m) + m) % m;
  }

  function getRandomEnvironmentComment(envName) {
    const env = ENVIRONMENTS.find(e => e.name === envName);
    return env && env.comments
      ? env.comments[Math.floor(Math.random() * env.comments.length)]
      : null;
  }

  function checkCarRandomEvents(deltaTime) {
    // Placeholder for future random events
  }

  function showCustomAlert(msg) {
    const overlay = document.getElementById("customAlertOverlay");
    const messageElem = document.getElementById("customAlertMessage");
    messageElem.textContent = msg;
    overlay.style.display = "block";
  }

  // ========== GAME STATE ==========
  let globalTime = 0,
      autoTickProgress = 0,
      lastLootMile = 0,
      dropOffLogged = false;

  let game = {
    aether: 0,
    totalAether: 0,
    clickValue: 1,
    clickMultiplier: 1,
    autoClickers: 0,
    autoClickerCost: 50,
    upgrades: {
      clickEfficiency: { level: 0, cost: 10, costMultiplier: 1.5 },
      autoEfficiency: { level: 0, cost: 100, costMultiplier: 1.7 }
    },
    prestige: { count: 0, neonCores: 0, multiplier: 1 },
    lastUpdate: Date.now(),
    log: [],
    stats: { manualClicks: 0, autoClicks: 0, hackingPoints: 0 },
    trunk: { slots: 4, items: [] },
    garage: [],
    roadLoot: []
  };

  game.car = {
    fuel: 0,
    maxFuel: 100,
    baseFuelConsumption: 5,
    miles: 0,
    speed: 0.2,
    techTokens: 0,
    tokenProgress: 0,
    tokenThreshold: 50,
    lastUpdate: Date.now(),
    eventCooldown: 0,
    tempSpeedModifier: 1,
    tempSpeedTimer: 0,
    isStuck: false,
    stuckTimer: 0,
    engineUpgrade: { level: 0, cost: 10, costMultiplier: 1.5, speedBonus: 0.05 },
    efficiencyUpgrade: { level: 0, cost: 10, costMultiplier: 1.5, efficiencyBonus: 0.05 },
    tankUpgrade: { level: 0, cost: 10, costMultiplier: 1.5, fuelBonus: 20 },
    snowTyres: false,
    snowTyresCost: 50,
    rainTyres: false,
    rainTyresCost: 50,
    environmentIndex: 0,
    weatherIndex: 0,
    environmentOffset: 0,
    direction: 1 // 1 = forward, -1 = returning, 0 = stationary
  };

  game.carPaint = { unlocked: false, color: "Default" };

  let weatherTimer = 0,
      snowStuckTimer = 0,
      offlineAetherGained = 0;
  let lastFrameTime = Date.now(),
      lastHighScoreLogged = 0;
  let rainDrops = [],
      snowFlakes = [],
      lightningTimer = 0,
      lastEnvChangeMiles = 0;

  // Additional snow accumulation tracking
  let snowAccumulation = 0;

  // ========== DOM ELEMENTS ==========
  const aetherAmountElem = document.getElementById("statsAether");
  const neonCoresElem = document.getElementById("statsNeonCores");
  const prestigeCountElem = document.getElementById("statsPrestigeCount");
  const clickUpgradeCostElem = document.getElementById("shopClickUpgradeCost");
  const clickUpgradeLevelElem = document.getElementById("shopClickUpgradeLevel");
  const autoClickerCostElem = document.getElementById("shopAutoClickerCost");
  const autoClickerCountElem = document.getElementById("shopAutoClickerCount");
  const autoEfficiencyCostElem = document.getElementById("shopAutoEfficiencyCost");
  const autoEfficiencyLevelElem = document.getElementById("shopAutoEfficiencyLevel");
  const autoClickerProductionElem = document.getElementById("autoClickerProduction");

  const statsMilesElem = document.getElementById("statsMiles");
  const statsManualClicksElem = document.getElementById("statsManualClicks");
  const statsAutoClicksElem = document.getElementById("statsAutoClicks");
  const statsHackingPointsElem = document.getElementById("statsHackingPoints");
  const statsHighScoreElem = document.getElementById("statsHighScore");

  const carFuelElem = document.getElementById("carFuel");
  const carMaxFuelElem = document.getElementById("carMaxFuel");
  const carMilesElem = document.getElementById("carMiles");
  const techTokensElem = document.getElementById("techTokens");
  const eventMessageElem = document.getElementById("eventMessage");
  const weatherNotificationElem = document.getElementById("weatherNotification");
  const stuckNotificationElem = document.getElementById("stuckNotification");

  const canvas = document.getElementById("carCanvas");
  const ctx = canvas.getContext("2d");
  const gameLogElem = document.getElementById("gameLog");

  const inventoryOverlay = document.getElementById("inventoryOverlay");
  const closeInventory = document.getElementById("closeInventory");
  const inventoryCarColour = document.getElementById("inventoryCarColour");
  const inventoryGrid = document.getElementById("inventoryGrid");

  // Buttons
  const returnHomeButton = document.getElementById("returnHomeButton");
  const startJourneyButton = document.getElementById("startJourneyButton");
  const carInventoryButton = document.getElementById("carInventoryButton");
  const resetGameButton = document.getElementById("resetGameButton");
  const prestigeButton = document.getElementById("prestigeButton");
  const clickButton = document.getElementById("clickButton");
  const fuelCarButton = document.getElementById("fuelCarButton");
  const garageButton = document.getElementById("garageButton");

  if (garageButton) {
    garageButton.addEventListener("click", openGarageOverlay);
  }

  // ========== HELPER FUNCTIONS ==========
  function addLog(message, type, simulatedTimestamp) {
    const timestamp = simulatedTimestamp
      ? new Date(simulatedTimestamp).toLocaleTimeString()
      : new Date().toLocaleTimeString();
    let spanClass = "";
    if (type === "lootSpawn") spanClass = "log-green";
    else if (type === "lootCollect") spanClass = "log-gold";
    else if (type === "fuelOut") spanClass = "log-negative";
    else if (type === "fuelAdd") spanClass = "log-green";
    if (message.toLowerCase().includes("returning home")) {
      spanClass += " log-pink";
    }
    const lineHtml = `[${timestamp}] <span class="${spanClass}">${message}</span>`;
    const line = document.createElement("div");
    line.innerHTML = lineHtml;
    gameLogElem.appendChild(line);
    game.log.push(lineHtml);
    setTimeout(() => {
      line.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 0);
  }

  function loadExistingLog() {
    gameLogElem.innerHTML = "";
    game.log.forEach(lineHtml => {
      const div = document.createElement("div");
      div.innerHTML = lineHtml;
      gameLogElem.appendChild(div);
    });
    setTimeout(() => {
      if (gameLogElem.lastElementChild) {
        gameLogElem.lastElementChild.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }, 0);
  }

  function showEventMessage(msg, type) {
    eventMessageElem.textContent = msg;
    setTimeout(() => {
      eventMessageElem.textContent = "";
    }, 5000);
    addLog(msg, type);
  }

  function updatePersonalScore() {
    let stored = localStorage.getItem("neonAetherHighScore");
    let highScore = stored ? parseFloat(stored) : 0;
    if (game.car.miles > highScore) {
      localStorage.setItem("neonAetherHighScore", game.car.miles);
      if (game.car.miles >= lastHighScoreLogged + 10) {
        addLog(`High Score updated to ${formatNumber(game.car.miles)} miles!`);
        lastHighScoreLogged = Math.floor(game.car.miles);
      }
      return game.car.miles;
    }
    return highScore;
  }

  function updateInventoryOverlay() {
    inventoryGrid.innerHTML = "";
    game.trunk.items.forEach(itemObj => {
      const slotDiv = document.createElement("div");
      slotDiv.className = "inventory-slot";
      if (itemObj.type === "aether_crystal") {
        slotDiv.innerHTML = `<img src="images/aether.png" alt="${itemObj.name}" class="inventory-item-image">`;
        if (itemObj.amount > 1) {
          slotDiv.innerHTML += `<span class="inventory-item-count">${itemObj.amount}</span>`;
        }
      } else {
        slotDiv.innerHTML = `<p>${itemObj.name}</p>`;
      }
      slotDiv.innerHTML += `<button></button>`;
      inventoryGrid.appendChild(slotDiv);
      slotDiv.querySelector("button").addEventListener("click", () => {
        if (itemObj.type === "aether_crystal") {
          game.aether += itemObj.amount;
          showEventMessage(`Used ${itemObj.name}, gained ${itemObj.amount} Aether!`, "lootCollect");
        } else if (itemObj.type === "computer_parts") {
          game.stats.hackingPoints += itemObj.amount;
          showEventMessage(`Used ${itemObj.name}, gained ${itemObj.amount} hacking points!`, "lootCollect");
        }
        const index = game.trunk.items.indexOf(itemObj);
        if (index > -1) {
          game.trunk.items.splice(index, 1);
        }
        localStorage.setItem("neonAetherSave", JSON.stringify(game));
        updateInventoryOverlay();
        updateDisplay();
      });
    });
    const emptySlots = game.trunk.slots - game.trunk.items.length;
    for (let s = 0; s < emptySlots; s++) {
      const slotDiv = document.createElement("div");
      slotDiv.className = "inventory-slot";
      slotDiv.textContent = "Empty Slot";
      inventoryGrid.appendChild(slotDiv);
    }
  }

  function openInventoryOverlay() {
    updateInventoryOverlay();
    inventoryOverlay.style.display = "block";
  }

  function closeInventoryOverlay() {
    inventoryOverlay.style.display = "none";
  }

  if (carInventoryButton) {
    carInventoryButton.addEventListener("click", openInventoryOverlay);
  }
  if (closeInventory) {
    closeInventory.addEventListener("click", closeInventoryOverlay);
  }
  window.addEventListener("click", function(e) {
    if (e.target === inventoryOverlay) {
      inventoryOverlay.style.display = "none";
    }
  });

  // --- Garage Overlay Functions ---
  const garageOverlay = document.getElementById("garageOverlay");
  const closeGarage = document.getElementById("closeGarage");

  function openGarageOverlay() {
    updateGarageOverlay();
    garageOverlay.style.display = "block";
  }

  function closeGarageOverlay() {
    garageOverlay.style.display = "none";
  }

  if (garageButton) {
    garageButton.addEventListener("click", openGarageOverlay);
  }
  if (closeGarage) {
    closeGarage.addEventListener("click", closeGarageOverlay);
  }
  window.addEventListener("click", function(e) {
    if (e.target === garageOverlay) {
      closeGarageOverlay();
    }
  });

  function updateGarageOverlay() {
    const garageGrid = document.getElementById("garageInventoryGrid");
    garageGrid.innerHTML = "";
    const maxSlots = 24;
    for (let i = 0; i < maxSlots; i++) {
      const slotDiv = document.createElement("div");
      slotDiv.className = "inventory-slot";
      if (i < game.garage.length) {
        let item = game.garage[i];
        let innerHTML = "";
        if (item.type === "aether_crystal") {
          innerHTML = `<img src="images/aether.png" alt="${item.name}" class="inventory-item-image">`;
          if (item.amount > 1) {
            innerHTML += `<span class="inventory-item-count">${item.amount}</span>`;
          }
        } else {
          innerHTML = `<p>${item.name}</p>`;
        }
        innerHTML += `<button>Use</button>`;
        slotDiv.innerHTML = innerHTML;
        slotDiv.querySelector("button").addEventListener("click", () => {
          if (item.type === "aether_crystal") {
            game.aether += item.amount;
            showEventMessage(`Used ${item.name}, gained ${item.amount} Aether!`, "lootCollect");
          } else if (item.type === "computer_parts") {
            game.stats.hackingPoints += item.amount;
            showEventMessage(`Used ${item.name}, gained ${item.amount} hacking points!`, "lootCollect");
          }
          game.garage.splice(i, 1);
          localStorage.setItem("neonAetherSave", JSON.stringify(game));
          updateGarageOverlay();
          updateDisplay();
        });
      } else {
        slotDiv.textContent = "Empty Slot";
      }
      garageGrid.appendChild(slotDiv);
    }
  }

  // --- Background Items ---
  function drawBgItems() {
    const bgMultiplier = 1.5;
    const bgOffset = mod(game.car.environmentOffset * bgMultiplier, canvas.width);
    const env = ENVIRONMENTS[game.car.environmentIndex];
    if (env.name === "City") {
      ctx.fillStyle = "#888888";
      ctx.fillRect(mod(50 - bgOffset, canvas.width), 100, 40, 60);
      ctx.fillRect(mod(250 - bgOffset, canvas.width), 80, 30, 70);
      ctx.fillRect(mod(400 - bgOffset, canvas.width), 90, 50, 90);
    } else if (env.name === "Desert") {
      ctx.fillStyle = "#EDC9Af";
      ctx.fillRect(mod(100 - bgOffset, canvas.width), 140, 30, 10);
      ctx.fillRect(mod(300 - bgOffset, canvas.width), 130, 20, 10);
      ctx.fillStyle = "#8B4513";
      ctx.fillRect(mod(150 - bgOffset, canvas.width), 120, 5, 30);
      ctx.fillStyle = "#228B22";
      ctx.beginPath();
      ctx.arc(mod(152 - bgOffset, canvas.width), 110, 10, 0, Math.PI * 2);
      ctx.fill();
    } else if (env.name === "Quantum Forest") {
      ctx.fillStyle = "#003300";
      ctx.fillRect(mod(80 - bgOffset, canvas.width), 100, 10, 40);
      ctx.fillRect(mod(150 - bgOffset, canvas.width), 110, 10, 40);
      ctx.beginPath();
      ctx.arc(mod(85 - bgOffset, canvas.width), 95, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(mod(155 - bgOffset, canvas.width), 100, 15, 0, Math.PI * 2);
      ctx.fill();
    } else if (env.name === "Digital Wasteland") {
      ctx.fillStyle = "#550000";
      ctx.fillRect(mod(100 - bgOffset, canvas.width), 150, 30, 10);
      ctx.fillRect(mod(300 - bgOffset, canvas.width), 140, 20, 10);
    } else if (env.name === "Neon City") {
      if (currentNeonCityEnv !== "Neon City") {
        NeonCity.buildings = [];
        NeonCity.neonSigns = [];
        NeonCity.initBuildings();
        NeonCity.initNeonSigns();
        environmentHistory = [{ start: 0, env: game.car.environmentIndex }];
        currentNeonCityEnv = "Neon City";
      }
      NeonCity.updateBuildings(game.car.environmentOffset);
      NeonCity.updateNeonSigns(game.car.environmentOffset);
      NeonCity.drawBuildings(game.car.environmentOffset, 160);
      NeonCity.drawNeonSigns(game.car.environmentOffset);
    }
  }

  // PERSISTENCE FUNCTIONS
  function saveGame() {
    game.lastUpdate = Date.now();
    game.snowAccumulation = snowAccumulation;
    game.dayNightTimer = dayNightTimer;
    localStorage.setItem("neonAetherSave", JSON.stringify(game));
  }

  function loadGame() {
    const savedGame = localStorage.getItem("neonAetherSave");
    if (savedGame) {
      try {
        const loaded = JSON.parse(savedGame);
        Object.assign(game, loaded);
        if (loaded.car) Object.assign(game.car, loaded.car);
        if (loaded.carPaint) game.carPaint = loaded.carPaint;
        if (Array.isArray(loaded.log)) game.log = loaded.log;
        game.lastUpdate = Number(game.lastUpdate);
        if (typeof loaded.snowAccumulation !== "undefined") {
          snowAccumulation = loaded.snowAccumulation;
        }
        if (typeof loaded.dayNightTimer !== "undefined") {
          dayNightTimer = loaded.dayNightTimer;
          prevBrightness = 0.5 + 0.5 * Math.cos(2 * Math.PI * (dayNightTimer / DAY_NIGHT_CYCLE));
        }
      } catch (e) {
        console.error("Error parsing saved game data. Resetting game.", e);
        localStorage.removeItem("neonAetherSave");
      }
    } else {
      game.car.weatherIndex = Math.floor(Math.random() * WEATHERS.length);
      game.car.environmentIndex = Math.floor(Math.random() * ENVIRONMENTS.length);
      game.car.miles = 0;
      saveGame();
    }
    let offlineSeconds = (Date.now() - game.lastUpdate) / 1000;
    let offlineTicks = Math.floor(offlineSeconds);
    if (offlineTicks > 0 && game.autoClickers > 0) {
      const productionPerClicker = 1 * (1 + game.upgrades.autoEfficiency.level * 0.1);
      const totalAutoProduction = game.autoClickers * productionPerClicker;
      const autoAetherGained = offlineTicks * totalAutoProduction;
      game.aether += autoAetherGained;
      game.totalAether += autoAetherGained;
      offlineAetherGained = autoAetherGained;
      addLog(`Offline: Auto-clickers produced ${autoAetherGained.toFixed(0)} Aether while away.`, "env");
    }
    let oldMiles = game.car.miles;
    applyCarOfflineProgress(offlineSeconds);
    let offlineMilesGained = game.car.miles - oldMiles;
    if (offlineMilesGained > 0) {
      addLog(`Offline: You traveled ${offlineMilesGained.toFixed(2)} miles while away.`, "env");
    }
    if (game.car.isStuck) {
      let remainingBefore = game.car.stuckTimer;
      game.car.stuckTimer -= offlineSeconds;
      if (game.car.stuckTimer <= 0) {
        game.car.isStuck = false;
        let unstuckSimulatedTime = game.lastUpdate + remainingBefore * 1000;
        addLog("Offline: Car is now unstuck.", "env", unstuckSimulatedTime);
      }
    }
    let offlineWeatherCycles = Math.floor(offlineSeconds / 60);
    for (let i = 0; i < offlineWeatherCycles; i++) {
      if (Math.random() < 0.1) {
        let newIndex;
        do {
          newIndex = Math.floor(Math.random() * WEATHERS.length);
        } while (newIndex === game.car.weatherIndex);
        game.car.weatherIndex = newIndex;
        let weatherEventSimulatedTime = game.lastUpdate + ((i + 1) * 60000);
        addLog(`Offline: Weather changed to ${WEATHERS[newIndex].name}.`, "env", weatherEventSimulatedTime);
      }
    }
    weatherTimer = offlineSeconds % 60;
    let oldDayNight = dayNightTimer || 0;
    let newDayNight = oldDayNight + offlineSeconds;
    let oldTransitions = Math.floor(oldDayNight / 60);
    let newTransitions = Math.floor(newDayNight / 60);
    for (let i = oldTransitions + 1; i <= newTransitions; i++) {
      if (i % 2 === 1) {
        addLog("Offline: Sunset: The sun is setting, darkness falls.", "env", game.lastUpdate + i * 60000);
      } else {
        addLog("Offline: Sunrise: The sun is rising, light returns.", "env", game.lastUpdate + i * 60000);
      }
    }
    dayNightTimer = newDayNight % DAY_NIGHT_CYCLE;
    prevBrightness = 0.5 + 0.5 * Math.cos(2 * Math.PI * (dayNightTimer / DAY_NIGHT_CYCLE));
    if (game.car.miles === 0) {
      startJourneyButton.textContent = "Start Journey";
      startJourneyButton.style.display = "inline-block";
      returnHomeButton.style.display = "none";
      game.car.direction = 0;
    } else {
      startJourneyButton.textContent = "Resume Journey";
      startJourneyButton.style.display = "none";
      returnHomeButton.style.display = "inline-block";
    }
    updateDisplay();
    fuelCarButton.removeEventListener("click", fuelCarHandler);
    fuelCarButton.addEventListener("click", fuelCarHandler);
    clickButton.removeEventListener("click", harvestAether);
    clickButton.addEventListener("click", harvestAether);
    if (game.research && game.research.carPaintJob &&
        (game.research.carPaintJob.inProgress || game.research.carPaintJob.completed)) {
      document.getElementById("carPaintJobButton").disabled = true;
    }
  }

  // Basic fueling function
  function fuelCarHandler() {
    const cost = 10;
    if (game.aether < cost) {
      showCustomAlert("Not enough Aether to fuel the car!");
      return;
    }
    game.aether -= cost;
    game.car.fuel = Math.min(game.car.fuel + 10, game.car.maxFuel);
    fuelRanOutLogged = false;
    updateDisplay();
    saveGame();
    showEventMessage("Fueled car: +10 Fuel", "fuelAdd");
  }

  function applyCarOfflineProgress(offlineSeconds) {
    const direction = game.car.direction;
    const effectiveSpeed = game.car.speed;
    const consumptionRate =
      game.car.baseFuelConsumption *
      (1 - game.car.efficiencyUpgrade.level * game.car.efficiencyUpgrade.efficiencyBonus);
    let milesWanted = effectiveSpeed * offlineSeconds;
    const milesPossible = consumptionRate > 0 ? (game.car.fuel / consumptionRate) : 0;
    let milesTraveled = Math.min(milesWanted, milesPossible);
    if (milesTraveled < milesWanted && game.car.fuel > 0) {
      game.car.fuel = 0;
      addLog("Offline: The car <span class='log-negative'>runs out of fuel</span>.", "fuelOut");
    } else {
      game.car.fuel -= milesTraveled * consumptionRate;
    }
    if (direction === 1) {
      game.car.miles += milesTraveled;
      game.car.tokenProgress += milesTraveled;
      game.car.environmentOffset += milesTraveled * 50;
    } else if (direction === -1) {
      game.car.miles = Math.max(game.car.miles - milesTraveled, 0);
      game.car.environmentOffset -= milesTraveled * 50;
    }
    if (direction === 1 && game.car.tokenProgress >= game.car.tokenThreshold) {
      const tokensGained = Math.floor(game.car.tokenProgress / game.car.tokenThreshold);
      game.car.techTokens += tokensGained;
      game.car.tokenProgress -= tokensGained * game.car.tokenThreshold;
    }
  }

  function forceReload() {
    const baseUrl = location.href.split('?')[0];
    location.href = baseUrl + '?_=' + new Date().getTime();
  }

  function resetGame() {
    if (confirm("Are you sure you want to reset the game? This will clear all progress.")) {
      game.car.direction = 0;
      game.car.miles = 0;
      game.car.fuel = game.car.maxFuel;
      localStorage.removeItem("neonAetherSave");
      localStorage.removeItem("neonCityBuildings");
      localStorage.removeItem("neonCityNeonSigns");
      forceReload();
    }
  }

  function updateResearchCountdown() {
    if (game.research && game.research.carPaintJob && game.research.carPaintJob.inProgress) {
      const now = Date.now();
      const elapsed = Math.floor((now - game.research.carPaintJob.startTime) / 1000);
      let remaining = game.research.carPaintJob.timeRequired - elapsed;
      if (remaining < 0) {
        remaining = 0;
        game.research.carPaintJob.inProgress = false;
        game.research.carPaintJob.completed = true;
        alert("Car Paint Job research completed!");
        game.carPaint.unlocked = true;
        updateDisplay();
      }
      game.research.carPaintJob.timeLeft = remaining;
      const statusElem = document.getElementById("carPaintJobStatus");
      if (statusElem) {
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        statusElem.textContent = `Time Left: ${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
      }
    } else {
      const statusElem = document.getElementById("carPaintJobStatus");
      if (statusElem) {
        statusElem.textContent = "";
      }
    }
  }

  function harvestAether() {
    const amount = game.clickValue * game.clickMultiplier;
    game.aether += amount;
    game.totalAether += amount;
    game.stats.manualClicks += 1;
    updateDisplay();
    saveGame();
  }

  returnHomeButton.addEventListener("click", function() {
    if (game.car.miles === 0) {
      alert("You are already home!");
      return;
    }
    if (game.car.direction === 1) {
      game.car.direction = -1;
      showEventMessage("Car is returning home...", "fuelAdd");
      returnHomeButton.style.display = "none";
    }
  });

  startJourneyButton.addEventListener("click", function() {
    game.car.direction = 1;
    if (game.car.miles === 0) {
      game.car.miles = 0.01;
      environmentHistory = [{ start: 0, env: game.car.environmentIndex }];
      lastEnvChangeMiles = 0;
    }
    startJourneyButton.textContent = "Resume Journey";
    startJourneyButton.style.display = "none";
    returnHomeButton.style.display = "inline-block";
    showEventMessage("Journey started.");
  });

  canvas.addEventListener("click", function(e) {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    for (let i = 0; i < game.roadLoot.length; i++) {
      const loot = game.roadLoot[i];
      let collected = false;
      if (loot.type === "aether_crystal") {
        const dx = clickX - loot.x;
        const dy = clickY - loot.y;
        if (Math.sqrt(dx * dx + dy * dy) < 25) {
          collected = true;
        }
      } else if (loot.type === "computer_parts") {
        if (
          clickX >= loot.x - 25 &&
          clickX <= loot.x + 25 &&
          clickY >= loot.y - 25 &&
          clickY <= loot.y + 25
        ) {
          collected = true;
        }
      }
      if (collected) {
        if (game.trunk.items.length < game.trunk.slots) {
          game.trunk.items.push(loot);
          addLog(`Collected ${loot.name} and added to trunk.`, "lootCollect");
        } else {
          alert("Trunk is full! Return home to unload your loot.");
        }
        game.roadLoot.splice(i, 1);
        updateDisplay();
        saveGame();
        return;
      }
    }
  });

  // Shop Buttons
  document.getElementById("shopBuyClickUpgradeButton").addEventListener("click", function() {
    const upgrade = game.upgrades.clickEfficiency;
    if (game.aether >= upgrade.cost) {
      game.aether -= upgrade.cost;
      upgrade.level++;
      game.clickMultiplier = 1 + upgrade.level * 0.5;
      upgrade.cost = Math.floor(upgrade.cost * upgrade.costMultiplier);
      updateDisplay();
      saveGame();
    }
  });

  document.getElementById("shopBuyAutoClickerButton").addEventListener("click", function() {
    if (game.aether >= game.autoClickerCost) {
      game.aether -= game.autoClickerCost;
      game.autoClickers++;
      game.autoClickerCost = Math.floor(game.autoClickerCost * 1.15);
      updateDisplay();
      saveGame();
    }
  });

  document.getElementById("shopBuyAutoEfficiencyButton").addEventListener("click", function() {
    const upgrade = game.upgrades.autoEfficiency;
    if (game.aether >= upgrade.cost) {
      game.aether -= upgrade.cost;
      upgrade.level++;
      upgrade.cost = Math.floor(upgrade.cost * upgrade.costMultiplier);
      updateDisplay();
      saveGame();
    }
  });

  document.getElementById("shopBuyEngineUpgradeButton").addEventListener("click", function() {
    const upgrade = game.car.engineUpgrade;
    if (game.car.techTokens >= upgrade.cost) {
      game.car.techTokens -= upgrade.cost;
      upgrade.level++;
      game.car.speed += upgrade.speedBonus;
      upgrade.cost = Math.floor(upgrade.cost * upgrade.costMultiplier);
      updateDisplay();
      saveGame();
    }
  });

  document.getElementById("shopBuyEfficiencyUpgradeButton").addEventListener("click", function() {
    const upgrade = game.car.efficiencyUpgrade;
    if (game.car.techTokens >= upgrade.cost) {
      game.car.techTokens -= upgrade.cost;
      upgrade.level++;
      upgrade.cost = Math.floor(upgrade.cost * upgrade.costMultiplier);
      updateDisplay();
      saveGame();
    }
  });

  document.getElementById("shopBuyTankUpgradeButton").addEventListener("click", function() {
    const upgrade = game.car.tankUpgrade;
    if (game.car.techTokens >= upgrade.cost) {
      game.car.techTokens -= upgrade.cost;
      upgrade.level++;
      game.car.maxFuel += upgrade.fuelBonus;
      upgrade.cost = Math.floor(upgrade.cost * upgrade.costMultiplier);
      updateDisplay();
      saveGame();
    }
  });

  document.getElementById("shopBuySnowTyresButton").addEventListener("click", function() {
    if (!game.car.snowTyres && game.car.techTokens >= game.car.snowTyresCost) {
      game.car.techTokens -= game.car.snowTyresCost;
      game.car.snowTyres = true;
      showEventMessage("Snow Tyres equipped! Car won't get stuck in snow.");
      updateDisplay();
      saveGame();
    }
  });

  document.getElementById("shopBuyRainTyresButton").addEventListener("click", function() {
    if (!game.car.rainTyres && game.car.techTokens >= game.car.rainTyresCost) {
      game.car.techTokens -= game.car.rainTyresCost;
      game.car.rainTyres = true;
      showEventMessage("Rain Tyres equipped! Rain slowdown negated.");
      updateDisplay();
      saveGame();
    }
  });

  // Paint shop
  document.getElementById("shopBuyRedPaintButton").addEventListener("click", () => {
    const cost = 200;
    if (!game.carPaint.unlocked) {
      alert("You must complete the Car Paint Job research first!");
      return;
    }
    if (game.aether < cost) {
      alert("Not enough Aether!");
      return;
    }
    game.aether -= cost;
    game.carPaint.color = "Red";
    updateDisplay();
    saveGame();
    alert("Your car is now Red!");
  });

  document.getElementById("shopBuyBluePaintButton").addEventListener("click", () => {
    const cost = 200;
    if (!game.carPaint.unlocked) {
      alert("You must complete the Car Paint Job research first!");
      return;
    }
    if (game.aether < cost) {
      alert("Not enough Aether!");
      return;
    }
    game.aether -= cost;
    game.carPaint.color = "Blue";
    updateDisplay();
    saveGame();
    alert("Your car is now Blue!");
  });

  document.getElementById("shopBuyGreenPaintButton").addEventListener("click", () => {
    const cost = 200;
    if (!game.carPaint.unlocked) {
      alert("You must complete the Car Paint Job research first!");
      return;
    }
    if (game.aether < cost) {
      alert("Not enough Aether!");
      return;
    }
    game.aether -= cost;
    game.carPaint.color = "Green";
    updateDisplay();
    saveGame();
    alert("Your car is now Green!");
  });

  document.getElementById("shopBuyPinkPaintButton").addEventListener("click", () => {
    const cost = 500;
    if (!game.carPaint.unlocked) {
      alert("You must complete the Car Paint Job research first!");
      return;
    }
    if (game.aether < cost) {
      alert("Not enough Aether!");
      return;
    }
    game.aether -= cost;
    game.carPaint.color = "Neon Pink";
    updateDisplay();
    saveGame();
    alert("Your car is now Neon Pink!");
  });

  document.getElementById("carPaintJobButton").addEventListener("click", () => {
    if (
      game.research &&
      game.research.carPaintJob &&
      (game.research.carPaintJob.inProgress || game.research.carPaintJob.completed)
    ) {
      alert("Research already started!");
      return;
    }
    if (game.aether < 1000) {
      alert("Not enough Aether!");
      return;
    }
    if (game.car.miles < 10) {
      alert("You need at least 10 miles traveled to start this research.");
      return;
    }
    game.aether -= 1000;
    game.research = game.research || {};
    game.research.carPaintJob = {
      cost: 1000,
      milesRequired: 10,
      timeRequired: 600,
      inProgress: true,
      startTime: Date.now(),
      timeLeft: 600,
      completed: false
    };
    updateDisplay();
    saveGame();
    alert("Car Paint Job research started!");
    document.getElementById("carPaintJobButton").disabled = true;
  });

  resetGameButton.addEventListener("click", resetGame);

  document.getElementById("customAlertClose").addEventListener("click", () => {
    document.getElementById("customAlertOverlay").style.display = "none";
  });
  document.getElementById("customAlertOkButton").addEventListener("click", () => {
    document.getElementById("customAlertOverlay").style.display = "none";
  });

  // ========== CAR DRAWING WITH LIGHTS & DARKENING ==========
  // The drawCar function now takes brightness to apply a slight darkening effect on the car.
  // Also, the positions of the light dots have been moved upward.
  function drawCar(x, y, brightness) {
    const bodyWidth = 60,
          bodyHeight = 20,
          cabinWidth = 30,
          cabinHeight = 15,
          wheelRadius = 6;
    ctx.fillStyle = game.carPaint.unlocked
      ? (game.carPaint.color === "Red" ? "#ff0000" :
         game.carPaint.color === "Blue" ? "#0000ff" :
         game.carPaint.color === "Green" ? "#00ff00" :
         game.carPaint.color === "Neon Pink" ? "#ff69b4" : "#00ffff")
      : "#00ffff";
    ctx.fillRect(x, y - bodyHeight, bodyWidth, bodyHeight);
    ctx.fillStyle = "#008080";
    ctx.fillRect(x + 10, y - bodyHeight - cabinHeight, cabinWidth, cabinHeight);
    let carDarkness = Math.max(0, 1 - Math.min(1, brightness + 0.2));
    ctx.fillStyle = "rgba(0,0,0," + carDarkness + ")";
    ctx.fillRect(x, y - bodyHeight - cabinHeight, bodyWidth, bodyHeight + cabinHeight);
    ctx.fillStyle = "#222";
    let wheelAngle = 0;
    if (game.car.direction !== 0 && game.car.fuel > 0 && game.car.miles !== 0) {
      wheelAngle = globalTime * 5;
    }
    const frontWheelX = x + 15, frontWheelY = y;
    ctx.beginPath();
    ctx.arc(frontWheelX, frontWheelY, wheelRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(frontWheelX, frontWheelY);
    ctx.lineTo(
      frontWheelX + wheelRadius * Math.cos(wheelAngle),
      frontWheelY + wheelRadius * Math.sin(wheelAngle)
    );
    ctx.stroke();
    const rearWheelX = x + bodyWidth - 15, rearWheelY = y;
    ctx.beginPath();
    ctx.arc(rearWheelX, rearWheelY, wheelRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(rearWheelX, rearWheelY);
    ctx.lineTo(
      rearWheelX + wheelRadius * Math.cos(wheelAngle),
      rearWheelY + wheelRadius * Math.sin(wheelAngle)
    );
    ctx.stroke();
    // Adjusted light dot positions upward
    const lightRadius = 3;
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(x + 5, y - bodyHeight/2 - 3, lightRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 5, y - bodyHeight/2 + 2, lightRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "yellow";
    ctx.beginPath();
    ctx.arc(x + bodyWidth - 5, y - bodyHeight/2 - 3, lightRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + bodyWidth - 5, y - bodyHeight/2 + 2, lightRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // ========== MAIN GAME LOOP & DRAWING ==========
  function drawCarCanvas(deltaTime) {
    const width = canvas.width;
    const height = canvas.height;
    const brightness = updateDayNight(deltaTime);
    drawEnvironment();
    drawBgItems();
    const roadY = 160;
    const roadHeight = 50;
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, roadY, width, roadHeight);
	  // <-- Move your snow-on-ground snippet here:
  if (snowAccumulation > 0) {
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillRect(0, roadY + (roadHeight - snowAccumulation), width, snowAccumulation);
  }
    drawLoot();
    // Determine overlay darkness:
    let overlayAlpha = 1 - brightness;
    // If it's storm and daytime, add extra darkness (e.g., 0.3 additional, clamped to 1)
    if (WEATHERS[game.car.weatherIndex].name === "Storm" && brightness >= 0.7) {
      overlayAlpha = Math.min(1, overlayAlpha + 0.3);
    }
    if (overlayAlpha > 0) {
      ctx.fillStyle = "rgba(0,0,0," + overlayAlpha + ")";
      ctx.fillRect(0, 0, width, height);
    }
    ctx.save();
    let bobbingOffset = 0;
    if (game.car.direction !== 0 && game.car.fuel > 0 && game.car.miles !== 0) {
      bobbingOffset = 2 * Math.sin(globalTime * 2 * Math.PI);
    }
    let carX, carY;
    if (game.car.direction === -1) {
      ctx.translate(canvas.width * 0.1 + 30, 0);
      ctx.scale(-1, 1);
      carX = 0;
      carY = roadY + 25 + bobbingOffset;
      drawCar(carX, carY, brightness);
    } else {
      carX = canvas.width * 0.1;
      carY = roadY + 25 + bobbingOffset;
      drawCar(carX, carY, brightness);
    }
    ctx.restore();
	
    // Draw headlight cone:
if (
  game.car.direction === 1 &&
  (brightness < 0.7 || WEATHERS[game.car.weatherIndex].name === "Storm")
) {
  ctx.fillStyle = "rgba(255,255,224,0.3)";
  ctx.beginPath();

  // Offset to move everything up
  const offsetY = 5;

  // Apex (tip) near the front of the car – subtract offsetY
  const apexX = carX + 50;
  const apexY = carY - offsetY;

  ctx.moveTo(apexX, apexY);

  // Ellipse parameters: also adjust centerY by subtracting offsetY
  const centerX = apexX + 80;
  const centerY = apexY;
  const radiusX = 80;
  const radiusY = 40;
  const rotation = 0;
  const startAngle = -Math.PI / 6;
  const endAngle = Math.PI / 6;

  ctx.ellipse(centerX, centerY, radiusX, radiusY, rotation, startAngle, endAngle, false);
  ctx.closePath();
  ctx.fill();
}

    simulateWeather(deltaTime);
    const envName = ENVIRONMENTS[game.car.environmentIndex].name;
    const currentWeather = WEATHERS[game.car.weatherIndex].name;
    ctx.font = "16px Arial";
    const hudText = `Miles: ${formatNumber(game.car.miles)} | Env: ${envName} | Weather: ${currentWeather}`;
    const textWidth = ctx.measureText(hudText).width;
    ctx.fillStyle = "rgba(50,50,50,0.8)";
    ctx.fillRect(5, 5, textWidth + 10, 28);
    ctx.fillStyle = "#fff";
    ctx.fillText(hudText, 10, 26);
    const highScore = updatePersonalScore();
    const highScoreText = `High Score: ${formatNumber(highScore)} miles`;
    const hsTextWidth = ctx.measureText(highScoreText).width;
    ctx.fillStyle = "rgba(50,50,50,0.8)";
    ctx.fillRect(width - hsTextWidth - 20, 5, hsTextWidth + 10, 28);
    ctx.fillStyle = "#fff";
    ctx.fillText(highScoreText, width - hsTextWidth - 15, 26);
    if (currentWeather === "Rain" && !game.car.rainTyres) {
      weatherNotificationElem.textContent = "Rain slowing you down (20% reduction).";
    } else if (currentWeather === "Storm") {
      weatherNotificationElem.textContent = game.car.rainTyres
        ? "Storm overhead, be cautious!"
        : "Storm slowing you down (30% reduction).";
    } else {
      weatherNotificationElem.textContent = "";
    }
    stuckNotificationElem.textContent = game.car.isStuck
      ? `Car is stuck in the snow. Time until unstuck: ${Math.ceil(game.car.stuckTimer)} sec.` 
      : "";
  }

  function drawEnvironment() {
    let envIndex = game.car.environmentIndex;
    if (ENVIRONMENTS[envIndex]) {
      const env = ENVIRONMENTS[envIndex];
      const width = canvas.width, height = canvas.height;
      if (env.img) {
        const imgWidth = env.img.width;
        const offset = -(game.car.environmentOffset % imgWidth);
        for (let x = offset; x < width; x += imgWidth) {
          ctx.drawImage(env.img, x, 0, imgWidth, height);
        }
      } else {
        ctx.fillStyle = env.fallbackColor;
        ctx.fillRect(0, 0, width, height);
      }
    }
  }

  function simulateWeather(deltaTime) {
    const width = canvas.width, height = canvas.height;
    const currentWeather = WEATHERS[game.car.weatherIndex].name;
    if (currentWeather === "Rain" || currentWeather === "Storm") {
      if (rainDrops.length === 0) {
        for (let i = 0; i < 100; i++) {
          rainDrops.push({
            x: Math.random() * width,
            y: Math.random() * height,
            speed: 300 + Math.random() * 200,
            length: 15 + Math.random() * 10
          });
        }
      }
      ctx.strokeStyle = "rgba(0,0,255,0.5)";
      ctx.lineWidth = 2;
      rainDrops.forEach(drop => {
        drop.y += drop.speed / 60;
        if (drop.y > height) {
          drop.y = -drop.length;
          drop.x = Math.random() * width;
        }
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x, drop.y + drop.length);
        ctx.stroke();
      });
      if (currentWeather === "Storm") {
        if (lightningTimer <= 0 && Math.random() < 0.005) {
          lightningTimer = 0.1;
        }
        if (lightningTimer > 0) {
          ctx.fillStyle = `rgba(255,255,255,${lightningTimer * 7})`;
          ctx.fillRect(0, 0, width, height);
          lightningTimer -= 1 / 60;
        }
      }
    } else {
      rainDrops = [];
    }
    if (currentWeather === "Snow") {
      if (snowFlakes.length === 0) {
        for (let i = 0; i < 50; i++) {
          snowFlakes.push({
            x: Math.random() * width,
            y: Math.random() * height,
            speed: 30 + Math.random() * 30,
            radius: 2 + Math.random() * 2,
            drift: (Math.random() - 0.5) * 20
          });
        }
      }
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      snowFlakes.forEach(flake => {
        flake.y += flake.speed / 60;
        flake.x += flake.drift / 60;
        if (flake.y > height) {
          flake.y = -flake.radius;
          flake.x = Math.random() * width;
        }
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      snowAccumulation += deltaTime * 2;
      if (snowAccumulation > 30) {
        snowAccumulation = 30;
      }
    } else {
      if (snowAccumulation > 0) {
        snowAccumulation -= deltaTime * 1;
        if (snowAccumulation < 0) snowAccumulation = 0;
      }
      snowFlakes = [];
    }
    if (currentWeather === "Fog") {
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillRect(0, 0, width, height);
    }
  }
  

  function drawLoot() {
    game.roadLoot.forEach(item => {
      ctx.save();
      if (item.type === "aether_crystal") {
        ctx.fillStyle = "#00ffff";
        ctx.beginPath();
        ctx.arc(item.x, item.y, 10, 0, Math.PI * 2);
        ctx.fill();
      } else if (item.type === "computer_parts") {
        ctx.fillStyle = "#ff00ff";
        ctx.fillRect(item.x - 10, item.y - 10, 20, 20);
      }
      ctx.restore();
    });
  }

  function updateRoadLoot(deltaTime, distanceTraveled) {
    const shift = distanceTraveled * 50 * game.car.direction;
    for (let i = game.roadLoot.length - 1; i >= 0; i--) {
      const loot = game.roadLoot[i];
      loot.x -= shift;
      if ((game.car.direction === 1 && loot.x < -50) ||
          (game.car.direction === -1 && loot.x > canvas.width + 50)) {
        game.roadLoot.splice(i, 1);
      }
    }
  }

  function spawnLootForNewMile() {
    const type = Math.random() < 0.5 ? "aether_crystal" : "computer_parts";
    const newLoot = createLootObject(type);
    game.roadLoot.push(newLoot);
    setTimeout(() => {
      const itemNameStyled = `<span style="color: gold">${newLoot.name}</span>`;
      addLog(`Loot spawned: ${itemNameStyled} has appeared on the road!`, "lootSpawn");
    }, 500);
  }

  function createLootObject(type) {
    const loot = {
      id: Date.now() + "_" + Math.floor(Math.random() * 1000),
      x: canvas.width + 50,
      y: 160 + Math.random() * 50,
      type: type
    };
    if (type === "aether_crystal") {
      loot.name = "Aether Crystal";
      loot.amount = 1000;
    } else {
      loot.name = "Computer Parts";
      loot.amount = 100;
    }
    return loot;
  }

  function updateDisplay() {
    aetherAmountElem.textContent = formatNumber(game.aether);
    neonCoresElem.textContent = game.prestige.neonCores;
    prestigeCountElem.textContent = game.prestige.count;
    clickUpgradeCostElem.textContent = game.upgrades.clickEfficiency.cost;
    clickUpgradeLevelElem.textContent = game.upgrades.clickEfficiency.level;
    autoClickerCostElem.textContent = game.autoClickerCost;
    autoClickerCountElem.textContent = game.autoClickers;
    autoEfficiencyCostElem.textContent = game.upgrades.autoEfficiency.cost;
    autoEfficiencyLevelElem.textContent = game.upgrades.autoEfficiency.level;
    carFuelElem.textContent = Math.floor(game.car.fuel);
    carMaxFuelElem.textContent = game.car.maxFuel;
    carMilesElem.textContent = formatNumber(game.car.miles);
    techTokensElem.textContent = game.car.techTokens;
    statsMilesElem.textContent = formatNumber(game.car.miles);
    statsManualClicksElem.textContent = game.stats.manualClicks;
    statsAutoClicksElem.textContent = formatNumber(game.stats.autoClicks);
    statsHackingPointsElem.textContent = formatNumber(game.stats.hackingPoints);
    const autoProduction = game.autoClickers * (1 + game.upgrades.autoEfficiency.level * 0.1);
    autoClickerProductionElem.textContent = formatNumber(autoProduction);
    document.getElementById("autoClickerDetails").style.display =
      game.autoClickers > 0 ? "block" : "none";
    statsHighScoreElem.textContent = formatNumber(updatePersonalScore());
    if (game.car.miles === 0) {
      startJourneyButton.style.display = "inline-block";
      returnHomeButton.style.display = "none";
    } else if (game.car.direction === 1) {
      startJourneyButton.style.display = "none";
      returnHomeButton.style.display = "inline-block";
    }
    updateInventoryOverlay();
  }

  function updateWeather(deltaTime) {
    weatherTimer += deltaTime;
    if (weatherTimer >= 60) {
      if (Math.random() < 0.1) {
        let newIndex;
        do {
          newIndex = Math.floor(Math.random() * WEATHERS.length);
        } while (newIndex === game.car.weatherIndex);
        game.car.weatherIndex = newIndex;
        showEventMessage("Weather changed to " + WEATHERS[newIndex].name);
      }
      weatherTimer = 0;
    }
    if (WEATHERS[game.car.weatherIndex].name === "Snow" && !game.car.snowTyres) {
      snowStuckTimer += deltaTime;
      if (snowStuckTimer >= 60 && !game.car.isStuck) {
        if (Math.random() < 0.05) {
          game.car.isStuck = true;
          game.car.stuckTimer = 600;
          showEventMessage("Car is stuck in the snow! Immobilized for 10 minutes.");
        }
        snowStuckTimer = 0;
      }
    } else {
      snowStuckTimer = 0;
    }
  }

  function gameLoop() {
    const now = Date.now();
    const deltaTime = (now - lastFrameTime) / 1000;
    lastFrameTime = now;
    globalTime += deltaTime;
    if (game.car.direction === 1 && game.car.fuel > 0 && Math.floor(game.car.miles) > lastLootMile) {
      spawnLootForNewMile();
      lastLootMile = Math.floor(game.car.miles);
    }
    updateWeather(deltaTime);
    autoTickProgress += deltaTime;
    document.getElementById("autoClickerProgressBar").style.width =
      (Math.min(autoTickProgress, 1) * 100) + "%";
    while (autoTickProgress >= 1) {
      const productionPerClicker = 1 * (1 + game.upgrades.autoEfficiency.level * 0.1);
      const totalAuto = game.autoClickers * productionPerClicker;
      game.aether += totalAuto;
      game.totalAether += totalAuto;
      game.stats.autoClicks += game.autoClickers;
      autoTickProgress -= 1;
    }
    if (game.car.isStuck) {
      game.car.stuckTimer -= deltaTime;
      if (game.car.stuckTimer <= 0) {
        game.car.isStuck = false;
        showEventMessage("Car is now unstuck.");
      }
    } else if (game.car.direction !== 0) {
      const direction = game.car.direction;
      let effectiveSpeed = game.car.speed * game.car.tempSpeedModifier;
      const milesWanted = effectiveSpeed * deltaTime;
      const consumptionRate =
        game.car.baseFuelConsumption *
        (1 - game.car.efficiencyUpgrade.level * game.car.efficiencyUpgrade.efficiencyBonus);
      const milesPossible = consumptionRate > 0 ? (game.car.fuel / consumptionRate) : 0;
      let milesThisFrame = Math.min(milesWanted, milesPossible);
      if (milesThisFrame < milesWanted && game.car.fuel > 0) {
        game.car.fuel = 0;
        if (!fuelRanOutLogged) {
          addLog("The car <span class='log-negative'>runs out of fuel</span> mid-journey!", "fuelOut");
          fuelRanOutLogged = true;
        }
      } else {
        game.car.fuel -= milesThisFrame * consumptionRate;
        fuelRanOutLogged = false;
      }
      if (direction === 1) {
        game.car.miles += milesThisFrame;
        game.car.tokenProgress += milesThisFrame;
        game.car.environmentOffset += milesThisFrame * 50;
      } else if (direction === -1) {
        game.car.miles = Math.max(game.car.miles - milesThisFrame, 0);
        game.car.environmentOffset -= milesThisFrame * 50;
      }
      if (direction === 1 && milesThisFrame > 0 && Math.random() < 0.02 * effectiveSpeed * deltaTime) {
        const comment = getRandomEnvironmentComment(ENVIRONMENTS[game.car.environmentIndex].name);
        if (comment) addLog(comment, "env");
      }
      if (ENVIRONMENTS[game.car.environmentIndex].name === "Neon City") {
        if (direction === 1 && Math.floor(game.car.miles / 50) !== Math.floor(lastEnvChangeMiles / 50)) {
          let newEnv;
          do {
            newEnv = Math.floor(Math.random() * ENVIRONMENTS.length);
          } while (newEnv === game.car.environmentIndex);
          game.car.environmentIndex = newEnv;
          lastEnvChangeMiles = Math.floor(game.car.miles);
          environmentHistory.push({ start: game.car.miles, env: newEnv });
          showEventMessage(`Environment changed to ${ENVIRONMENTS[newEnv].name}`);
          const comment = getRandomEnvironmentComment(ENVIRONMENTS[newEnv].name);
          if (comment) addLog(comment, "env");
        }
        if (direction === -1 && environmentHistory.length > 1 && game.car.miles < environmentHistory[environmentHistory.length - 1].start) {
          environmentHistory.pop();
          game.car.environmentIndex = environmentHistory[environmentHistory.length - 1].env;
          showEventMessage(`Environment reverted to ${ENVIRONMENTS[game.car.environmentIndex].name}`, "env");
        }
      }
      if (direction === 1 && game.car.tokenProgress >= game.car.tokenThreshold) {
        const tokensGained = Math.floor(game.car.tokenProgress / game.car.tokenThreshold);
        game.car.techTokens += tokensGained;
        game.car.tokenProgress -= tokensGained * game.car.tokenThreshold;
      }
      updateRoadLoot(deltaTime, milesThisFrame);
    }
    checkCarRandomEvents(deltaTime);
    updateDisplay();
    drawCarCanvas(deltaTime);
    requestAnimationFrame(gameLoop);
  }

  loadGame();
  loadExistingLog();
  if (offlineAetherGained > 0) {
    addLog(`Offline Gains: You earned <span style="color: #00FFFF;">${formatNumber(offlineAetherGained)} Aether</span> while away!`);
  }
  updateDisplay();
  requestAnimationFrame(gameLoop);
  setInterval(saveGame, 5000);
  setInterval(updateResearchCountdown, 1000);
})();
