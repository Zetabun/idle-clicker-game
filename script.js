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
  

  let currentNeonCityEnv = ""; // <--- ADD THIS

  // Global for environment history (for persistent environments in Neon City)
  let environmentHistory = [];

  // Prevent logging multiple "ran out of fuel" messages
  let fuelRanOutLogged = false;

  // --- Neon City Module ---
  // Consolidates all Neon City functionality (buildings and neon signs)
  const NeonCity = {
    buildings: [],
    neonSigns: [],

    // Initialize buildings with fixed window patterns.
    // Occasionally create a small building with an integrated neon sign.
    initBuildings: function() {
      this.buildings = [];
      let xPos = 0;
      // Continue generating buildings until we cover the entire canvas width.
      while (xPos < canvas.width) {
        // Decide whether to spawn a "small building with sign" (20% chance)
        const integratedChance = 0.2;
        let integrated = Math.random() < integratedChance;
        let buildingWidth = 60 + Math.random() * 90; // 60-150
        let buildingHeight, cols, rows, windowPattern;

        if (integrated) {
          // For a small building with an integrated sign:
          // Make it shorter (80-120 pixels tall) and only 1 or 2 rows of windows.
          buildingHeight = 80 + Math.random() * 40; // 80-120
          cols = 3; // you can choose fewer columns as well if desired
          rows = 1 + Math.floor(Math.random() * 2); // either 1 or 2 rows
          // Generate the window pattern:
          windowPattern = [];
          for (let r = 0; r < rows; r++) {
            let rowPattern = [];
            for (let c = 0; c < cols; c++) {
              // For small buildings, still use 80% chance on
              rowPattern.push(Math.random() >= 0.2);
            }
            windowPattern.push(rowPattern);
          }
        } else {
          // Regular building:
          buildingHeight = 120 + Math.random() * 80; // 120-200
          cols = 4;
          rows = 5;
          windowPattern = [];
          for (let r = 0; r < rows; r++) {
            let rowPattern = [];
            for (let c = 0; c < cols; c++) {
              rowPattern.push(Math.random() >= 0.2);
            }
            windowPattern.push(rowPattern);
          }
        }

        // Create building object; if integrated, add a property for the sign.
        let building = {
          x: xPos,
          width: buildingWidth,
          height: buildingHeight,
          windowPattern: windowPattern
        };

        if (integrated) {
          // Create integrated neon sign that will appear centered on the building's roof.
          // For example, sign width is 50%-80% of buildingWidth and sign height is fixed (say, 20-30px)
          const signWidth = buildingWidth * (0.5 + Math.random() * 0.3);
          const signHeight = 20 + Math.random() * 10;
          const signX = xPos + (buildingWidth - signWidth) / 2;
          // We'll use a similar color scheme as before.
          const colorSchemes = [
            { borderBase: "rgba(255,0,255,", fillBase: "rgba(0,255,255," },
            { borderBase: "rgba(0,255,255,", fillBase: "rgba(255,0,255," },
            { borderBase: "rgba(0,255,0,",   fillBase: "rgba(255,255,0," },
            { borderBase: "rgba(255,255,0,", fillBase: "rgba(0,255,0," }
          ];
          const randomIndex = Math.floor(Math.random() * colorSchemes.length);
          const chosenScheme = colorSchemes[randomIndex];
          building.integratedSign = {
            x: signX, // absolute x position for drawing later
            y: 160 - building.height - signHeight, // sign will appear on top of the building roof
            width: signWidth,
            height: signHeight,
            flashSpeed: 2 + Math.random() * 2,
            colors: chosenScheme
          };
        }

        this.buildings.push(building);
        // Instead of a fixed spacing, use the building's width plus a gap between 10 and 50 pixels.
        let gap = 10 + Math.random() * 40;
        xPos += buildingWidth + gap;
      }
      localStorage.setItem("neonCityBuildings", JSON.stringify(this.buildings));
    },

    // Ensure buildings exist across the visible region.
    updateBuildings: function(offset) {
      const leftBound = offset;
      const rightBound = offset + canvas.width;

      // Generate new buildings on the right if needed.
      let lastBuilding = this.buildings[this.buildings.length - 1];
      while (!lastBuilding || (lastBuilding.x + lastBuilding.width < rightBound)) {
        let gap = 10 + Math.random() * 40;
        const newX = lastBuilding ? lastBuilding.x + lastBuilding.width + gap : leftBound;
        // Decide again if this new building is integrated or not.
        const integrated = Math.random() < 0.2;
        let buildingWidth = 60 + Math.random() * 90;
        let buildingHeight, cols, rows, windowPattern;
        if (integrated) {
          buildingHeight = 80 + Math.random() * 40;
          cols = 3;
          rows = 1 + Math.floor(Math.random() * 2);
          windowPattern = [];
          for (let r = 0; r < rows; r++) {
            let rowPattern = [];
            for (let c = 0; c < cols; c++) {
              rowPattern.push(Math.random() >= 0.2);
            }
            windowPattern.push(rowPattern);
          }
        } else {
          buildingHeight = 120 + Math.random() * 80;
          cols = 4;
          rows = 5;
          windowPattern = [];
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
          windowPattern: windowPattern
        };
        if (integrated) {
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
      }

      // Generate new buildings on the left if needed.
      let firstBuilding = this.buildings[0];
      while (!firstBuilding || (firstBuilding.x > leftBound)) {
        let gap = 10 + Math.random() * 40;
        const newX = firstBuilding ? firstBuilding.x - (gap + (60 + Math.random() * 90)) : leftBound - 60;
        // Decide for integrated building on left side
        const integrated = Math.random() < 0.2;
        let buildingWidth, buildingHeight, cols, rows, windowPattern;
        if (integrated) {
          buildingWidth = 60 + Math.random() * 90;
          buildingHeight = 80 + Math.random() * 40;
          cols = 3;
          rows = 1 + Math.floor(Math.random() * 2);
          windowPattern = [];
          for (let r = 0; r < rows; r++) {
            let rowPattern = [];
            for (let c = 0; c < cols; c++) {
              rowPattern.push(Math.random() >= 0.2);
            }
            windowPattern.push(rowPattern);
          }
        } else {
          buildingWidth = 60 + Math.random() * 90;
          buildingHeight = 120 + Math.random() * 80;
          cols = 4;
          rows = 5;
          windowPattern = [];
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
          windowPattern: windowPattern
        };
        if (integrated) {
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
      }
    },

    // Draw all buildings based on the current environment offset.
    drawBuildings: function(offset, baseY) {
      for (let i = 0; i < this.buildings.length; i++) {
        let building = this.buildings[i];
        let xPos = building.x - offset;
        if (xPos + building.width > 0 && xPos < canvas.width) {
          this.drawBuilding(building, baseY, xPos);
        }
      }
    },

    // Draw a single building using its fixed window pattern.
    // If the building has an integrated sign, draw that on top.
    drawBuilding: function(building, baseY, xPos) {
      // Draw building structure
      ctx.fillStyle = "#555";
      ctx.fillRect(xPos, baseY - building.height, building.width, building.height);
      ctx.fillStyle = "#333";
      ctx.fillRect(xPos - 5, baseY - building.height - 10, building.width + 10, 10);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.strokeRect(xPos, baseY - building.height, building.width, building.height);

      // Draw windows using stored pattern
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
          if (building.windowPattern[row][col]) {
            ctx.fillStyle = "#ffff00";
          } else {
            ctx.fillStyle = "#333333";
          }
          ctx.fillRect(wx, wy, windowWidth, windowHeight);
        }
      }

      // If this is a small building with an integrated sign, draw it.
      if (building.integratedSign) {
        let sign = building.integratedSign;
        // Adjust the sign's x position by subtracting the car's environment offset.
        let signX = sign.x - game.car.environmentOffset;
        // Draw sign legs (if desired)
        const legWidth = sign.width * 0.125;
        const legHeight = sign.height * 0.3;
        const leftLegX = signX + sign.width * 0.2;
        const rightLegX = signX + sign.width * 0.65;
        const legsY = sign.y + sign.height * 0.7;
        ctx.fillStyle = "#777";
        ctx.fillRect(leftLegX, sign.y + sign.height - legHeight, legWidth, legHeight);
        ctx.fillRect(rightLegX, sign.y + sign.height - legHeight, legWidth, legHeight);
        // Draw sign frame and fill
        ctx.strokeStyle = sign.colors.borderBase + "1)";
        ctx.lineWidth = 4;
        ctx.strokeRect(signX, sign.y, sign.width, sign.height * 0.7);
        const inset = 2;
        ctx.fillStyle = sign.colors.fillBase + "1)";
        ctx.fillRect(signX + inset, sign.y + inset, sign.width - inset * 2, sign.height * 0.7 - inset * 2);
      }
    },

    // Initialize neon signs (for areas not occupied by integrated-sign buildings).
    initNeonSigns: function() {
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
        const signY = 160 - totalSignHeight; // Pin bottom to y=160 (road line)
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

    // Update neon signs to cover the visible area.
    updateNeonSigns: function(offset) {
      const leftBound = offset;
      const rightBound = offset + canvas.width;
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
    },

    // Draw neon signs with flashing effect.
    drawNeonSigns: function(offset) {
      for (let j = 0; j < this.neonSigns.length; j++) {
        const sign = this.neonSigns[j];
        let xPos = sign.x - offset;
        if (xPos + sign.width > 0 && xPos < canvas.width) {
          const alpha = 0.5 + 0.5 * Math.abs(Math.sin(globalTime * sign.flashSpeed));
          this.drawNeonSign(sign, xPos, alpha);
        }
      }
    },

    // Draw a single neon sign.
    drawNeonSign: function(sign, xPos, alpha) {
      const signHeight = sign.height * 0.7;
      const legHeight  = sign.height * 0.3;
      const legWidth = sign.width * 0.125;
      const leftLegX  = xPos + sign.width * 0.2;
      const rightLegX = xPos + sign.width * 0.65;
      const legsY     = sign.y + sign.height * 0.7;
      
      ctx.fillStyle = "#777"; 
      ctx.fillRect(leftLegX, legsY, legWidth, legHeight);
      ctx.fillRect(rightLegX, legsY, legWidth, legHeight);
      
      ctx.strokeStyle = sign.colors.borderBase + alpha + ")";
      ctx.lineWidth = 4;
      ctx.strokeRect(xPos, sign.y, sign.width, sign.height * 0.7);
      
      const inset = 2;
      ctx.fillStyle = sign.colors.fillBase + alpha + ")";
      ctx.fillRect(xPos + inset, sign.y + inset, sign.width - inset * 2, sign.height * 0.7 - inset * 2);
    }
  };

  // ========== GLOBAL HELPER FUNCTIONS ==========
  // Helper to pick an x position that doesn't overlap any building (for neon signs).
  function pickNonOverlappingX() {
    for (let attempt = 0; attempt < 100; attempt++) {
      const candidateX = Math.random() * canvas.width;
      // Ensure a 10px gap from any building
      let overlapsBuilding = NeonCity.buildings.some(b => candidateX >= (b.x - 10) && candidateX <= (b.x + b.width + 10));
      // Also ensure a 10px gap from any existing neon sign
      let overlapsSign = NeonCity.neonSigns.some(s => candidateX >= (s.x - 10) && candidateX <= (s.x + s.width + 10));
      if (!overlapsBuilding && !overlapsSign) {
        return candidateX;
      }
    }
    return 10; // Fallback
  }

  // Checks if xCandidate overlaps any building in NeonCity.buildings.
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

  // Format large numbers
  function formatNumber(num) {
    if (num < 1000) return num.toFixed(0);
    const suffixes = ["K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
    let exponent = Math.floor(Math.log10(num) / 3);
    let mantissa = num / Math.pow(1000, exponent);
    return mantissa.toFixed(2) + suffixes[exponent - 1];
  }

  // Utility for positive modulus
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
    // Placeholder for additional random events
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
    direction: 1 // 1 = forward, -1 = returning home, 0 = stationary
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
  function addLog(message, type) {
    const timestamp = new Date().toLocaleTimeString();
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

  if (carInventoryButton) carInventoryButton.addEventListener("click", openInventoryOverlay);
  if (closeInventory) closeInventory.addEventListener("click", closeInventoryOverlay);
  window.addEventListener("click", function(e) {
    if (e.target === inventoryOverlay) {
      inventoryOverlay.style.display = "none";
    }
  });

  // ========== CANVAS DRAWING FUNCTIONS ==========
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

  // --- Garage Overlay Functions ---
  const garageOverlay = document.getElementById("garageOverlay");
  const closeGarage = document.getElementById("closeGarage");

  garageButton.addEventListener("click", openGarageOverlay);
  closeGarage.addEventListener("click", closeGarageOverlay);
  window.addEventListener("click", function(e) {
    if (e.target === garageOverlay) {
      closeGarageOverlay();
    }
  });

  function openGarageOverlay() {
    updateGarageOverlay();
    garageOverlay.style.display = "block";
  }

  function closeGarageOverlay() {
    garageOverlay.style.display = "none";
  }

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

    // For City, Desert, Quantum Forest, and Digital Wasteland environments:
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
      // For Neon City, use the persistent NeonCity module.
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
      
      // Draw buildings and neon signs.
      NeonCity.drawBuildings(game.car.environmentOffset, 160);
      NeonCity.drawNeonSigns(game.car.environmentOffset);
    }
  }

  // PERSISTENCE FUNCTIONS

  function saveGame() {
    game.lastUpdate = Date.now();
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
    applyCarOfflineProgress(offlineSeconds);
    let offlineWeatherCycles = Math.floor(offlineSeconds / 60);
    for (let i = 0; i < offlineWeatherCycles; i++) {
      if (Math.random() < 0.1) {
        let newIndex;
        do {
          newIndex = Math.floor(Math.random() * WEATHERS.length);
        } while (newIndex === game.car.weatherIndex);
        game.car.weatherIndex = newIndex;
        addLog(`Offline: Weather changed to ${WEATHERS[newIndex].name}.`, "env");
      }
    }
    weatherTimer = offlineSeconds % 60;
    if (WEATHERS[game.car.weatherIndex].name === "Snow" && !game.car.snowTyres) {
      snowStuckTimer += offlineSeconds;
      while (snowStuckTimer >= 60 && !game.car.isStuck) {
        snowStuckTimer -= 60;
        if (Math.random() < 0.05) {
          game.car.isStuck = true;
          game.car.stuckTimer = 600;
          addLog("Offline: Car got stuck in the snow! Immobilized for 10 minutes.", "fuelOut");
        }
      }
    } else {
      snowStuckTimer = 0;
    }
    let autoTickCount = Math.floor(offlineSeconds);
    if (autoTickCount > 0 && game.autoClickers > 0) {
      const productionPerClicker = 1 * (1 + game.upgrades.autoEfficiency.level * 0.1);
      const totalAutoProduction = game.autoClickers * productionPerClicker * autoTickCount;
      game.aether += totalAutoProduction;
      game.totalAether += totalAutoProduction;
      game.stats.autoClicks += game.autoClickers * autoTickCount;
      addLog(`Offline: Auto clickers produced ${totalAutoProduction} Aether over ${autoTickCount} seconds.`, "lootCollect");
    }
    game.lastUpdate = Date.now();
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
    if (game.research && game.research.carPaintJob &&
        (game.research.carPaintJob.inProgress || game.research.carPaintJob.completed)) {
      document.getElementById("carPaintJobButton").disabled = true;
    }
    clickButton.addEventListener("click", harvestAether);
    let fuelCooldown = false;
    fuelCarButton.addEventListener("click", function () {
      if (fuelCooldown) {
        showCustomAlert("Please wait before fueling again!");
        return;
      }
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
      fuelCooldown = true;
      setTimeout(() => {
        fuelCooldown = false;
      }, 500);
    });
  }

  function applyCarOfflineProgress(offlineSeconds) {
    const direction = game.car.direction;
    const effectiveSpeed = game.car.speed;
    const consumptionRate =
      game.car.baseFuelConsumption * (1 - game.car.efficiencyUpgrade.level * game.car.efficiencyUpgrade.efficiencyBonus);
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

  // Helper to force a full reload (cache-busting)
  function forceReload() {
    const baseUrl = location.href.split('?')[0];
    location.href = baseUrl + '?_=' + new Date().getTime();
  }

  // ========== RESET GAME ==========
  function resetGame() {
    if (confirm("Are you sure you want to reset the game? This will clear all progress.")) {
      localStorage.removeItem("neonAetherSave");
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
  clickButton.addEventListener("click", harvestAether);

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
      dropOffLogged = false;
      // Initialize environment history for Neon City.
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
        if (clickX >= loot.x - 25 && clickX <= loot.x + 25 &&
            clickY >= loot.y - 25 && clickY <= loot.y + 25) {
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
    if (game.research && game.research.carPaintJob && (game.research.carPaintJob.inProgress || game.research.carPaintJob.completed)) {
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
      timeRequired: 600, // 10 minutes
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

  // ========== INITIALIZATION ==========
  loadGame();
  loadExistingLog();
  if (offlineAetherGained > 0) {
    addLog(`Offline Gains: You earned ${formatNumber(offlineAetherGained)} Aether while away!`);
  }
  updateDisplay();
  requestAnimationFrame(gameLoop);
  setInterval(saveGame, 5000);
  setInterval(updateResearchCountdown, 1000);

  // ========= END OF CODE ==========
  
  // Update & Draw functions
  function drawCarCanvas() {
    const width = canvas.width;
    const height = canvas.height;
    drawEnvironment();
    drawBgItems();
    simulateWeather();
    const roadY = 160;
    const roadHeight = 50;
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, roadY, width, roadHeight);
    drawLoot();
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
    let bobbingOffset = 0;
    if (game.car.direction !== 0 && game.car.fuel > 0 && game.car.miles !== 0) {
      bobbingOffset = 2 * Math.sin(globalTime * 2 * Math.PI);
    }
    ctx.save();
    if (game.car.direction === -1) {
      ctx.translate(canvas.width * 0.1 + 30, 0);
      ctx.scale(-1, 1);
      drawCar(0, roadY + 25 + bobbingOffset);
    } else {
      drawCar(canvas.width * 0.1, roadY + 25 + bobbingOffset);
    }
    ctx.restore();
  }

  function simulateWeather() {
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
          ctx.fillStyle = `rgba(255,255,255,${(lightningTimer * 7)})`;
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
    } else {
      snowFlakes = [];
    }
    if (currentWeather === "Fog") {
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillRect(0, 0, width, height);
    }
  }

  function drawCar(x, y) {
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
    ctx.lineTo(frontWheelX + wheelRadius * Math.cos(wheelAngle),
               frontWheelY + wheelRadius * Math.sin(wheelAngle));
    ctx.stroke();
    const rearWheelX = x + bodyWidth - 15, rearWheelY = y;
    ctx.beginPath();
    ctx.arc(rearWheelX, rearWheelY, wheelRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(rearWheelX, rearWheelY);
    ctx.lineTo(rearWheelX + wheelRadius * Math.cos(wheelAngle),
               rearWheelY + wheelRadius * Math.sin(wheelAngle));
    ctx.stroke();
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

    if (game.car.direction === 1 && Math.floor(game.car.miles) > lastLootMile) {
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
    } else if (game.car.direction === 0) {
      // Do nothing
    } else {
      const direction = game.car.direction;
      let effectiveSpeed = game.car.speed * game.car.tempSpeedModifier;
      const milesWanted = effectiveSpeed * deltaTime;
      const consumptionRate =
        game.car.baseFuelConsumption * (1 - game.car.efficiencyUpgrade.level * game.car.efficiencyUpgrade.efficiencyBonus);
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
      if (direction === 1 && Math.random() < 0.02 * effectiveSpeed * deltaTime) {
        const comment = getRandomEnvironmentComment(ENVIRONMENTS[game.car.environmentIndex].name);
        if (comment) addLog(comment, "env");
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
    drawCarCanvas();
    requestAnimationFrame(gameLoop);
  }

})();
