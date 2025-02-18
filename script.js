import { DayNightCycle } from './dayNightCycle.js';
import { NeonCity } from './neonCity.js';
import { drawCarCanvas, updateDisplay, updateRoadLoot, simulateWeather } from './display.js';




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

  // Global variables for Neon City state
  let currentNeonCityEnv = "";
  let environmentHistory = [];
  let fuelRanOutLogged = false;

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
  let rainDrops = [], snowFlakes = [], lightningTimer = 0;
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

  // ========== INVENTORY & GARAGE OVERLAYS ==========
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
        updateDisplay(getDeps());
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

  // Garage Overlay Functions
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
          updateDisplay(getDeps());
        });
      } else {
        slotDiv.textContent = "Empty Slot";
      }
      garageGrid.appendChild(slotDiv);
    }
  }

  // ========== PERSISTENCE FUNCTIONS ==========
  function saveGame() {
    game.lastUpdate = Date.now();
    game.snowAccumulation = snowAccumulation;
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
    DayNightCycle.update(offlineSeconds);

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

    if (WEATHERS[game.car.weatherIndex].name === "Snow") {
      let offlineSnowAcc = offlineSeconds * 2;
      snowAccumulation = Math.min(snowAccumulation + offlineSnowAcc, 30);
    } else {
      let offlineMelting = offlineSeconds * 1;
      snowAccumulation = Math.max(snowAccumulation - offlineMelting, 0);
    }

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

    updateDisplay(getDeps());

    fuelCarButton.removeEventListener("click", fuelCarHandler);
    fuelCarButton.addEventListener("click", fuelCarHandler);

    clickButton.removeEventListener("click", harvestAether);
    clickButton.addEventListener("click", harvestAether);

    if (game.research && game.research.carPaintJob &&
        (game.research.carPaintJob.inProgress || game.research.carPaintJob.completed)) {
      document.getElementById("carPaintJobButton").disabled = true;
    }
  }

  function fuelCarHandler() {
    const cost = 10;
    if (game.aether < cost) {
      showCustomAlert("Not enough Aether to fuel the car!");
      return;
    }
    game.aether -= cost;
    game.car.fuel = Math.min(game.car.fuel + 10, game.car.maxFuel);
    fuelRanOutLogged = false;
    updateDisplay(getDeps());
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
        updateDisplay(getDeps());
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
    updateDisplay(getDeps());
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
        updateDisplay(getDeps());
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
      updateDisplay(getDeps());
      saveGame();
    }
  });

  document.getElementById("shopBuyAutoClickerButton").addEventListener("click", function() {
    if (game.aether >= game.autoClickerCost) {
      game.aether -= game.autoClickerCost;
      game.autoClickers++;
      game.autoClickerCost = Math.floor(game.autoClickerCost * 1.15);
      updateDisplay(getDeps());
      saveGame();
    }
  });

  document.getElementById("shopBuyAutoEfficiencyButton").addEventListener("click", function() {
    const upgrade = game.upgrades.autoEfficiency;
    if (game.aether >= upgrade.cost) {
      game.aether -= upgrade.cost;
      upgrade.level++;
      upgrade.cost = Math.floor(upgrade.cost * upgrade.costMultiplier);
      updateDisplay(getDeps());
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
      updateDisplay(getDeps());
      saveGame();
    }
  });

  document.getElementById("shopBuyEfficiencyUpgradeButton").addEventListener("click", function() {
    const upgrade = game.car.efficiencyUpgrade;
    if (game.car.techTokens >= upgrade.cost) {
      game.car.techTokens -= upgrade.cost;
      upgrade.level++;
      upgrade.cost = Math.floor(upgrade.cost * upgrade.costMultiplier);
      updateDisplay(getDeps());
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
      updateDisplay(getDeps());
      saveGame();
    }
  });

  document.getElementById("shopBuySnowTyresButton").addEventListener("click", function() {
    if (!game.car.snowTyres && game.car.techTokens >= game.car.snowTyresCost) {
      game.car.techTokens -= game.car.snowTyresCost;
      game.car.snowTyres = true;
      showEventMessage("Snow Tyres equipped! Car won't get stuck in snow.");
      updateDisplay(getDeps());
      saveGame();
    }
  });

  document.getElementById("shopBuyRainTyresButton").addEventListener("click", function() {
    if (!game.car.rainTyres && game.car.techTokens >= game.car.rainTyresCost) {
      game.car.techTokens -= game.car.rainTyresCost;
      game.car.rainTyres = true;
      showEventMessage("Rain Tyres equipped! Rain slowdown negated.");
      updateDisplay(getDeps());
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
    updateDisplay(getDeps());
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
    updateDisplay(getDeps());
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
    updateDisplay(getDeps());
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
    updateDisplay(getDeps());
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
      timeRequired: 600, // 10 minutes
      inProgress: true,
      startTime: Date.now(),
      timeLeft: 600,
      completed: false
    };
    updateDisplay(getDeps());
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
    addLog(`Offline Gains: You earned <span style="color: #00FFFF;">${formatNumber(offlineAetherGained)} Aether</span> while away!`);
  }
  updateDisplay(getDeps());
  requestAnimationFrame(gameLoop);
  setInterval(saveGame, 5000);
  setInterval(updateResearchCountdown, 1000);

  // ========== MAIN GAME LOOP ==========
  function gameLoop() {
    const now = Date.now();
    const deltaTime = (now - lastFrameTime) / 1000;
    lastFrameTime = now;
    globalTime += deltaTime;

    DayNightCycle.update(deltaTime);
    document.getElementById("hudTime").textContent = DayNightCycle.getDigitalTime();

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
        if (game.car.miles === 0) {
          game.garage = game.garage.concat(game.trunk.items);
          game.trunk.items = [];
          addLog("Loot dropped off at the garage.", "env");
          game.car.direction = 1;
          showEventMessage("Car has dropped off loot and is resuming journey.", "fuelAdd");
        }
      }

      // Neon City environment transitions
      if (ENVIRONMENTS[game.car.environmentIndex].name === "Neon City") {
        if (direction === 1 && Math.floor(game.car.miles / 50) !== Math.floor(lastLootMile / 50)) {
          let newEnv;
          do {
            newEnv = Math.floor(Math.random() * ENVIRONMENTS.length);
          } while (newEnv === game.car.environmentIndex);
          game.car.environmentIndex = newEnv;
          lastLootMile = Math.floor(game.car.miles);
          environmentHistory.push({ start: game.car.miles, env: newEnv });
          showEventMessage(`Environment changed to ${ENVIRONMENTS[newEnv].name}`);
          const comment = getRandomEnvironmentComment(ENVIRONMENTS[newEnv].name);
          if (comment) addLog(comment, "env");
        }
        if (direction === -1 &&
            environmentHistory.length > 1 &&
            game.car.miles < environmentHistory[environmentHistory.length - 1].start) {
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
    updateDisplay(getDeps());
    drawCarCanvas(deltaTime);
    requestAnimationFrame(gameLoop);
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
  
  
    function getDeps() {
  return {
    canvas,
    ctx,
    game,
    globalTime,
    ENVIRONMENTS,
    WEATHERS,
    aetherAmountElem,
    neonCoresElem,
    prestigeCountElem,
    clickUpgradeCostElem,
    clickUpgradeLevelElem,
    autoClickerCostElem,
    autoClickerCountElem,
    autoEfficiencyCostElem,
    autoEfficiencyLevelElem,
    carFuelElem,
    carMaxFuelElem,
    carMilesElem,
    techTokensElem,
    statsMilesElem,
    statsManualClicksElem,
    statsAutoClicksElem,
    statsHackingPointsElem,
    autoClickerProductionElem,
    startJourneyButton,
    returnHomeButton,
    updateInventoryOverlay, // function defined in script.js
    updatePersonalScore,     // function defined in script.js
    formatNumber,            // function defined in script.js
    mod,                     // function defined in script.js
    pickNonOverlappingX,     // function defined in script.js
    NeonCity,
    rainDrops,               // array used in simulateWeather
    lightningTimer,          // variable used in simulateWeather
    snowFlakes,              // array used in simulateWeather
    snowAccumulation         // current snow accumulation
  };
}


})();
