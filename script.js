document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  /********************************************************************
   * NEON AETHER: DIGITAL ALCHEMY – CONSOLIDATED SCRIPT.JS
   * Enhanced: Persist environment change threshold and weather defaults.
   ********************************************************************/

  // Global Constants & Configurations
  const ENVIRONMENTS = [
    { name: "Forest", imageSrc: "images/forest.png", img: null, fallbackColor: "#228B22" },
    { name: "Desert", imageSrc: "images/desert.png", img: null, fallbackColor: "#EDC9AF" },
    { name: "City", imageSrc: "images/city.png", img: null, fallbackColor: "#777" },
    { name: "Mountains", imageSrc: "images/mountains.png", img: null, fallbackColor: "#708090" },
    { name: "Beach", imageSrc: "images/beach.png", img: null, fallbackColor: "#F4A460" }
  ];

  const WEATHERS = [
    { name: "Clear", imageSrc: "", img: null, alpha: 0.0 },
    { name: "Rain", imageSrc: "images/rain.png", img: null, alpha: 0.3 },
    { name: "Snow", imageSrc: "images/snow.png", img: null, alpha: 0.3 },
    { name: "Fog", imageSrc: "images/fog.png", img: null, alpha: 0.2 },
    { name: "Storm", imageSrc: "images/storm.png", img: null, alpha: 0.4 }
  ];

  const ENV_COMMENTS = {
    Forest: ["You spot a deer grazing among the trees.", "Birds chirp overhead in the canopy."],
    Desert: ["A tumbleweed rolls by.", "A distant oasis shimmers in the heat."],
    City: ["Skyscrapers loom in the distance.", "Neon lights flicker along the skyline."],
    Mountains: ["A cool wind brushes past rocky cliffs.", "An eagle soars above the peaks."],
    Beach: ["Waves crash gently on the shore.", "Seagulls cry as the breeze moves the palms."]
  };

  // Global variables for background items, timers, etc.
  let bgItems = [];
  let globalTime = 0;
  let autoTickProgress = 0;
  let weatherTimer = 0;
  let snowStuckTimer = 0;
  let offlineAetherGained = 0;
  let lastHighScoreLogged = 0;
  let rainDrops = [];
  let snowFlakes = [];
  let lightningTimer = 0;

  // DOM References
  const canvas = document.getElementById("carCanvas");
  const ctx = canvas ? canvas.getContext("2d") : null;
  const aetherAmountElem = document.getElementById("aetherAmount");
  const neonCoresElem = document.getElementById("neonCores");
  const prestigeCountElem = document.getElementById("prestigeCount");
  const clickUpgradeCostElem = document.getElementById("clickUpgradeCost");
  const clickUpgradeLevelElem = document.getElementById("clickUpgradeLevel");
  const autoClickerCostElem = document.getElementById("autoClickerCost");
  const autoClickerCountElem = document.getElementById("autoClickerCount");
  const autoEfficiencyCostElem = document.getElementById("autoEfficiencyCost");
  const autoEfficiencyLevelElem = document.getElementById("autoEfficiencyLevel");
  const carFuelElem = document.getElementById("carFuel");
  const carMaxFuelElem = document.getElementById("carMaxFuel");
  const carMilesElem = document.getElementById("carMiles");
  const techTokensElem = document.getElementById("techTokens");
  const eventMessageElem = document.getElementById("eventMessage");
  const weatherNotificationElem = document.getElementById("weatherNotification");
  const stuckNotificationElem = document.getElementById("stuckNotification");

  // -------------------------------
  // Game State Initialization
  // -------------------------------
  let game = {
    aether: 0,
    totalAether: 0,
    clickValue: 1,
    clickMultiplier: 1,
    autoClickers: 0,
    autoClickerCost: 50,
    autoClickerBaseProduction: 1,
    upgrades: {
      clickEfficiency: { level: 0, cost: 10, costMultiplier: 1.5 },
      autoEfficiency: { level: 0, cost: 100, costMultiplier: 1.7 }
    },
    prestige: {
      count: 0,
      neonCores: 0,
      multiplier: 1
    },
    lastUpdate: Date.now(),
    log: []
  };

  // Car simulation data, now with lastEnvChangeMiles stored
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
    lastEnvChangeMiles: 0 // Persist the last mileage at which the environment changed
  };

  // Car Paint (unlocked via research)
  game.carPaint = {
    unlocked: false,
    color: "Default"
  };

  // -------------------------------
  // Helper Functions
  // -------------------------------
  function formatNumber(num) {
    if (num < 1000) return num.toFixed(0);
    let exponent = Math.floor(Math.log10(num));
    let mantissa = num / Math.pow(10, exponent);
    return mantissa.toFixed(2) + "e" + exponent;
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  }

  function addLog(message) {
    const timestamp = new Date().toLocaleTimeString();
    if (message.startsWith("[+]")) {
      message = `<span class="log-positive">${message.substring(3).trim()}</span>`;
    } else if (message.startsWith("[-]")) {
      message = `<span class="log-negative">${message.substring(3).trim()}</span>`;
    } else if (message.startsWith("[!]")) {
      message = `<span class="log-theme">${message.substring(3).trim()}</span>`;
    }
    const line = `[${timestamp}] ${message}`;
    const gameLogElem = document.getElementById("gameLog");
    if (gameLogElem) {
      const lineDiv = document.createElement("div");
      lineDiv.innerHTML = line;
      gameLogElem.appendChild(lineDiv);
      game.log.push(line);
      lineDiv.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }

  function loadExistingLog() {
    const gameLogElem = document.getElementById("gameLog");
    if (gameLogElem) {
      gameLogElem.innerHTML = "";
      for (let line of game.log) {
        const div = document.createElement("div");
        div.innerHTML = line;
        gameLogElem.appendChild(div);
      }
      if (gameLogElem.lastElementChild) {
        gameLogElem.lastElementChild.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }
  }

  function updatePersonalScore() {
    let stored = localStorage.getItem("neonAetherHighScore");
    let highScore = stored ? parseFloat(stored) : 0;
    if (game.car.miles > highScore) {
      localStorage.setItem("neonAetherHighScore", game.car.miles);
      if (game.car.miles >= lastHighScoreLogged + 10) {
        addLog(`[+] High Score updated to ${formatNumber(game.car.miles)} miles!`);
        lastHighScoreLogged = Math.floor(game.car.miles);
      }
      return game.car.miles;
    }
    return highScore;
  }

  function updateDisplay() {
    if (aetherAmountElem) aetherAmountElem.textContent = formatNumber(game.aether);
    if (neonCoresElem) neonCoresElem.textContent = game.prestige.neonCores;
    if (prestigeCountElem) prestigeCountElem.textContent = game.prestige.count;
    if (clickUpgradeCostElem) clickUpgradeCostElem.textContent = game.upgrades.clickEfficiency.cost;
    if (clickUpgradeLevelElem) clickUpgradeLevelElem.textContent = game.upgrades.clickEfficiency.level;
    if (autoClickerCostElem) autoClickerCostElem.textContent = game.autoClickerCost;
    if (autoClickerCountElem) autoClickerCountElem.textContent = game.autoClickers;
    if (autoEfficiencyCostElem) autoEfficiencyCostElem.textContent = game.upgrades.autoEfficiency.cost;
    if (autoEfficiencyLevelElem) autoEfficiencyLevelElem.textContent = game.upgrades.autoEfficiency.level;
    if (carFuelElem) carFuelElem.textContent = Math.floor(game.car.fuel);
    if (carMaxFuelElem) carMaxFuelElem.textContent = game.car.maxFuel;
    if (carMilesElem) carMilesElem.textContent = formatNumber(game.car.miles);
    if (techTokensElem) techTokensElem.textContent = game.car.techTokens;
  }

  function updateAutoClickerDetails() {
    const detailsElem = document.getElementById("autoClickerDetails");
    if (!detailsElem) return;
    if (game.autoClickers > 0) {
      detailsElem.style.display = "block";
      let productionPerTick =
        game.autoClickers *
        game.autoClickerBaseProduction *
        (1 + game.upgrades.autoEfficiency.level * 0.1) *
        game.prestige.multiplier;
      const prodElem = document.getElementById("autoClickerProduction");
      const progressBarElem = document.getElementById("autoClickerProgressBar");
      if (prodElem) prodElem.textContent = productionPerTick.toFixed(2);
      if (progressBarElem) progressBarElem.style.width = (autoTickProgress * 100) + "%";
    } else {
      detailsElem.style.display = "none";
    }
  }

  // -------------------------------
  // Asset Loading
  // -------------------------------
  function loadAllImages() {
    ENVIRONMENTS.forEach(env => {
      if (!env.imageSrc) return;
      const img = new Image();
      img.src = env.imageSrc;
      img.onload = () => { env.img = img; };
      img.onerror = () => { console.error("Error loading image: " + env.imageSrc); env.img = null; };
    });
    WEATHERS.forEach(weather => {
      if (!weather.imageSrc) return;
      const wimg = new Image();
      wimg.src = weather.imageSrc;
      wimg.onload = () => { weather.img = wimg; };
      wimg.onerror = () => { console.error("Error loading weather image: " + weather.imageSrc); weather.img = null; };
    });
  }
  loadAllImages();

  // -------------------------------
  // Enhanced Background Items Functions
  // -------------------------------
  function spawnBgItem() {
    const envName = ENVIRONMENTS[game.car.environmentIndex].name;
    const canvasWidth = canvas ? canvas.width : 800;
    let yPos = 80 + Math.random() * 60;
    let variant = Math.floor(Math.random() * 3);
    if (envName === "Forest") {
      if (Math.random() < 0.6) {
        return {
          type: "tree",
          variant: variant,
          x: canvasWidth + Math.random() * 100,
          y: yPos,
          width: 20 + variant * 5,
          height: 40 + variant * 10,
          speedFactor: 0.6 + variant * 0.1
        };
      } else {
        return {
          type: "bush",
          variant: variant,
          x: canvasWidth + Math.random() * 100,
          y: yPos + 20,
          width: 25 + variant * 3,
          height: 15 + variant * 2,
          speedFactor: 0.5 + variant * 0.05
        };
      }
    } else if (envName === "Desert") {
      return {
        type: "cactus",
        variant: variant,
        x: canvasWidth + Math.random() * 100,
        y: yPos,
        width: 15 + variant * 2,
        height: 35 + variant * 5,
        speedFactor: 0.6
      };
    } else if (envName === "City") {
      return {
        type: "building",
        variant: variant,
        x: canvasWidth + Math.random() * 150,
        y: 30 + Math.random() * 30,
        width: 50 + Math.random() * 50 + variant * 10,
        height: 100 + Math.random() * 50 + variant * 15,
        speedFactor: 0.8
      };
    } else if (envName === "Mountains") {
      if (Math.random() < 0.6) {
        return {
          type: "pine",
          variant: variant,
          x: canvasWidth + Math.random() * 100,
          y: yPos,
          width: 15 + variant * 3,
          height: 35 + variant * 7,
          speedFactor: 0.7
        };
      } else {
        return {
          type: "rock",
          variant: variant,
          x: canvasWidth + Math.random() * 100,
          y: yPos + 10,
          width: 20 + variant * 2,
          height: 15 + variant * 2,
          speedFactor: 0.5
        };
      }
    } else if (envName === "Beach") {
      if (Math.random() < 0.5) {
        return {
          type: "palm",
          variant: variant,
          x: canvasWidth + Math.random() * 100,
          y: yPos,
          width: 20 + variant * 2,
          height: 40 + variant * 5,
          speedFactor: 0.6
        };
      } else {
        return {
          type: "bush",
          variant: variant,
          x: canvasWidth + Math.random() * 100,
          y: yPos + 20,
          width: 25 + variant * 3,
          height: 15 + variant * 2,
          speedFactor: 0.5
        };
      }
    }
    return null;
  }

  function updateBgItems(deltaTime, effectiveSpeed) {
    for (let i = bgItems.length - 1; i >= 0; i--) {
      let item = bgItems[i];
      item.x -= effectiveSpeed * deltaTime * 50;
      if (item.x + item.width < 0) {
        bgItems.splice(i, 1);
      }
    }
    if (bgItems.length < 5) {
      const newItem = spawnBgItem();
      if (newItem) bgItems.push(newItem);
    }
  }

  function drawBgItems() {
    bgItems.forEach(item => {
      ctx.save();
      switch (item.type) {
        case "tree":
          ctx.fillStyle = item.variant === 0 ? "#0a8f0a" : item.variant === 1 ? "#0c9f0c" : "#0eaf0e";
          ctx.beginPath();
          ctx.moveTo(item.x + item.width / 2, item.y - item.height);
          ctx.lineTo(item.x, item.y);
          ctx.lineTo(item.x + item.width, item.y);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#8B4513";
          ctx.fillRect(item.x + item.width / 2 - 3, item.y, 6, 10);
          break;
        case "bush":
          ctx.fillStyle = "#228B22";
          ctx.beginPath();
          ctx.arc(item.x + item.width / 2, item.y, item.height / 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        case "cactus":
          ctx.fillStyle = "#006400";
          ctx.fillRect(item.x, item.y - item.height, item.width, item.height);
          if (item.variant > 0) {
            ctx.fillRect(item.x + item.width, item.y - item.height / 2, item.width / 2, item.height / 2);
          }
          break;
        case "building":
          ctx.fillStyle = "#444";
          ctx.fillRect(item.x, canvas.height - item.height - 50, item.width, item.height);
          ctx.fillStyle = "#ffd700";
          let windowRows = 3 + item.variant;
          let windowCols = 2 + item.variant;
          for (let i = 0; i < windowRows; i++) {
            for (let j = 0; j < windowCols; j++) {
              ctx.fillRect(item.x + 5 + j * (item.width / windowCols), canvas.height - item.height - 50 + 10 + i * 25, 10, 15);
            }
          }
          break;
        case "pine":
          ctx.fillStyle = "#2E8B57";
          ctx.beginPath();
          ctx.moveTo(item.x + item.width / 2, item.y - item.height);
          ctx.lineTo(item.x, item.y);
          ctx.lineTo(item.x + item.width, item.y);
          ctx.closePath();
          ctx.fill();
          break;
        case "rock":
          ctx.fillStyle = item.variant === 0 ? "#696969" : item.variant === 1 ? "#777777" : "#888888";
          ctx.beginPath();
          ctx.ellipse(item.x + item.width / 2, item.y - item.height / 2, item.width / 2, item.height / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        case "palm":
          ctx.fillStyle = "#8B4513";
          ctx.fillRect(item.x + item.width / 2 - 2, item.y - item.height, 4, item.height);
          ctx.fillStyle = "#228B22";
          ctx.beginPath();
          ctx.arc(item.x + item.width / 2, item.y - item.height, item.width, 0, Math.PI, true);
          ctx.fill();
          break;
      }
      ctx.restore();
    });
  }

  // -------------------------------
  // Offline Progress Helpers
  // -------------------------------
  function applyCarOfflineProgress(offlineSeconds) {
    let effectiveSpeed = game.car.speed;
    let effectiveConsumption =
      game.car.baseFuelConsumption * (1 - game.car.efficiencyUpgrade.level * game.car.efficiencyUpgrade.efficiencyBonus);
    let potentialMiles = effectiveSpeed * offlineSeconds;
    let fuelNeeded = potentialMiles * effectiveConsumption;
    let milesTraveled = 0;
    if (fuelNeeded > game.car.fuel) {
      let travelTime = game.car.fuel / (effectiveConsumption * effectiveSpeed);
      milesTraveled = effectiveSpeed * travelTime;
      game.car.fuel = 0;
      addLog("[-] Offline: The car runs out of fuel.");
    } else {
      milesTraveled = potentialMiles;
      game.car.fuel -= fuelNeeded;
    }
    game.car.miles += milesTraveled;
    game.car.tokenProgress += milesTraveled;
    if (milesTraveled > 0) {
      let envName = ENVIRONMENTS[game.car.environmentIndex].name;
      let chunks = Math.floor(milesTraveled / 10);
      for (let i = 0; i < chunks; i++) {
        let comment = getRandomEnvironmentComment(envName);
        if (comment) addLog(comment);
      }
    }
    if (game.car.tokenProgress >= game.car.tokenThreshold) {
      let tokensGained = Math.floor(game.car.tokenProgress / game.car.tokenThreshold);
      game.car.techTokens += tokensGained;
      game.car.tokenProgress -= tokensGained * game.car.tokenThreshold;
    }
  }

  function getRandomEnvironmentComment(envName) {
    const comments = ENV_COMMENTS[envName];
    if (!comments) return "";
    return `<span class="log-theme">${comments[Math.floor(Math.random() * comments.length)]}</span>`;
  }

  // -------------------------------
  // Save & Load Functions
  // -------------------------------
  function saveGame() {
    game.lastUpdate = Date.now();
    localStorage.setItem("neonAetherSave", JSON.stringify(game));
  }

  function loadGame() {
    let savedGame = localStorage.getItem("neonAetherSave");
    if (savedGame) {
      try {
        let loaded = JSON.parse(savedGame);
        game = Object.assign(game, loaded);
        if (loaded.car) game.car = Object.assign(game.car, loaded.car);
        if (loaded.carPaint) game.carPaint = loaded.carPaint;
        if (loaded.log && Array.isArray(loaded.log)) game.log = loaded.log;
        game.lastUpdate = Number(game.lastUpdate);
      } catch (e) {
        console.error("Error parsing saved game data. Resetting game.", e);
        localStorage.removeItem("neonAetherSave");
      }
      let now = Date.now();
      let offlineSeconds = (now - game.lastUpdate) / 1000;
      if (offlineSeconds > 3600) offlineSeconds = 3600;
      let autoProduction =
        game.autoClickers *
        game.autoClickerBaseProduction *
        (1 + game.upgrades.autoEfficiency.level * 0.1) *
        game.prestige.multiplier;
      let produced = autoProduction * offlineSeconds;
      offlineAetherGained = produced;
      game.aether += produced;
      game.totalAether += produced;
      applyCarOfflineProgress(offlineSeconds);
      game.lastUpdate = now;
      let storedHS = localStorage.getItem("neonAetherHighScore");
      if (storedHS) lastHighScoreLogged = Math.floor(parseFloat(storedHS));
    } else {
      // For a new game, randomize environment only once and save it
      game.car.weatherIndex = Math.floor(Math.random() * WEATHERS.length);
      game.car.environmentIndex = Math.floor(Math.random() * ENVIRONMENTS.length);
      game.car.lastEnvChangeMiles = game.car.miles;
      addLog("[!] New game started. The journey begins.");
    }
  }

  // -------------------------------
  // Random Events
  // -------------------------------
  function checkCarRandomEvents(deltaTime) {
    if (game.car.fuel > 0 && game.car.eventCooldown <= 0) {
      let eventChance = 0.005;
      if (Math.random() < eventChance * deltaTime) {
        triggerRandomEvent();
        game.car.eventCooldown = 10;
      }
    } else if (game.car.eventCooldown > 0) {
      game.car.eventCooldown -= deltaTime;
    }
  }

  function triggerRandomEvent() {
    const events = [
      {
        name: "Lucky Fuel Dump",
        message: "[+] Lucky Fuel Dump: You found a fuel dump! +15 Fuel.",
        effect: () => { game.car.fuel = Math.min(game.car.fuel + 15, game.car.maxFuel); }
      },
      {
        name: "Road Rally",
        message: "[+] Road Rally: You earned 1 Tech Token.",
        effect: () => { game.car.techTokens += 1; }
      },
      {
        name: "Minor Accident",
        message: "[-] Minor Accident: You lost 10 Fuel.",
        effect: () => { game.car.fuel = Math.max(game.car.fuel - 10, 0); }
      },
      {
        name: "Engine Trouble",
        message: "[-] Engine Trouble: Speed reduced for 5 seconds.",
        effect: () => { game.car.tempSpeedModifier = 0.5; game.car.tempSpeedTimer = 5; }
      },
      {
        name: "Surprise Aether Boost",
        message: "[+] Surprise Aether Boost: +100 Aether.",
        effect: () => { game.aether += 100; game.totalAether += 100; }
      }
    ];
    let event = events[Math.floor(Math.random() * events.length)];
    event.effect();
    showEventMessage(event.message);
  }

  // -------------------------------
  // Weather & Car Stuck Handling
  // -------------------------------
  function updateWeather(deltaTime) {
    weatherTimer += deltaTime;
    if (weatherTimer >= 60) {
      if (Math.random() < 0.1) {
        let newIndex;
        do {
          newIndex = Math.floor(Math.random() * WEATHERS.length);
        } while (newIndex === game.car.weatherIndex);
        game.car.weatherIndex = newIndex;
        showEventMessage("[!] Weather changed to " + WEATHERS[newIndex].name);
      }
      weatherTimer = 0;
    }
    if (WEATHERS[game.car.weatherIndex].name === "Snow" && !game.car.snowTyres) {
      snowStuckTimer += deltaTime;
      if (snowStuckTimer >= 60 && !game.car.isStuck) {
        if (Math.random() < 0.05) {
          game.car.isStuck = true;
          game.car.stuckTimer = 600;
          showEventMessage("[-] Car is stuck in the snow! Immobilized for 10 minutes.");
        }
        snowStuckTimer = 0;
      }
    } else {
      snowStuckTimer = 0;
    }
  }

  // -------------------------------
  // Idle / Clicker & Upgrade Functions
  // -------------------------------
  function gameClick() {
    let amount = game.clickValue * game.clickMultiplier * game.prestige.multiplier;
    game.aether += amount;
    game.totalAether += amount;
  }

  function buyClickUpgrade() {
    let upgrade = game.upgrades.clickEfficiency;
    if (game.aether >= upgrade.cost) {
      game.aether -= upgrade.cost;
      upgrade.level++;
      game.clickMultiplier = 1 + upgrade.level * 0.5;
      upgrade.cost = Math.floor(upgrade.cost * upgrade.costMultiplier);
    }
  }

  function buyAutoClicker() {
    if (game.aether >= game.autoClickerCost) {
      game.aether -= game.autoClickerCost;
      game.autoClickers++;
      game.autoClickerCost = Math.floor(game.autoClickerCost * 1.15);
    }
  }

  function buyAutoEfficiency() {
    let upgrade = game.upgrades.autoEfficiency;
    if (game.aether >= upgrade.cost) {
      game.aether -= upgrade.cost;
      upgrade.level++;
      upgrade.cost = Math.floor(upgrade.cost * upgrade.costMultiplier);
    }
  }

  function prestige() {
    if (game.totalAether >= 1e6) {
      let gained = Math.floor(Math.sqrt(game.totalAether / 1e6));
      if (gained < 1) gained = 1;
      game.prestige.neonCores += gained;
      game.prestige.count++;
      game.prestige.multiplier = 1 + game.prestige.neonCores * 0.1;
      // Reset idle progress:
      game.aether = 0;
      game.totalAether = 0;
      game.clickMultiplier = 1;
      game.autoClickers = 0;
      game.autoClickerCost = 50;
      game.upgrades.clickEfficiency.level = 0;
      game.upgrades.clickEfficiency.cost = 10;
      game.upgrades.autoEfficiency.level = 0;
      game.upgrades.autoEfficiency.cost = 100;
      showEventMessage("[+] Transcendence achieved! You gained " + gained +
        " Neon Core(s). Production multiplier is now " + game.prestige.multiplier.toFixed(2) + "x.");
    } else {
      alert("You need at least 1,000,000 total Aether to Transcend.");
    }
  }

  function fuelCar() {
    if (game.aether >= 10) {
      if (game.car.fuel <= 0) {
        addLog("[+] You refuel the car. The journey begins!");
      }
      game.aether -= 10;
      game.car.fuel = Math.min(game.car.fuel + 10, game.car.maxFuel);
    }
  }

  // -------------------------------
  // Car Upgrade Functions
  // -------------------------------
  function buyEngineUpgrade() {
    let upgrade = game.car.engineUpgrade;
    if (game.car.techTokens >= upgrade.cost) {
      game.car.techTokens -= upgrade.cost;
      upgrade.level++;
      game.car.speed += upgrade.speedBonus;
      upgrade.cost = Math.floor(upgrade.cost * upgrade.costMultiplier);
    }
  }

  function buyEfficiencyUpgrade() {
    let upgrade = game.car.efficiencyUpgrade;
    if (game.car.techTokens >= upgrade.cost) {
      game.car.techTokens -= upgrade.cost;
      upgrade.level++;
      upgrade.cost = Math.floor(upgrade.cost * upgrade.costMultiplier);
    }
  }

  function buyTankUpgrade() {
    let upgrade = game.car.tankUpgrade;
    if (game.car.techTokens >= upgrade.cost) {
      game.car.techTokens -= upgrade.cost;
      upgrade.level++;
      game.car.maxFuel += upgrade.fuelBonus;
      upgrade.cost = Math.floor(upgrade.cost * upgrade.costMultiplier);
    }
  }

  function buySnowTyres() {
    if (!game.car.snowTyres && game.car.techTokens >= game.car.snowTyresCost) {
      game.car.techTokens -= game.car.snowTyresCost;
      game.car.snowTyres = true;
      showEventMessage("[+] Snow Tyres equipped! Car won't get stuck in snow.");
    }
  }

  function buyRainTyres() {
    if (!game.car.rainTyres && game.car.techTokens >= game.car.rainTyresCost) {
      game.car.techTokens -= game.car.rainTyresCost;
      game.car.rainTyres = true;
      showEventMessage("[+] Rain Tyres equipped! Rain slowdown negated.");
    }
  }

  // -------------------------------
  // Drawing Functions
  // -------------------------------
  function drawEnvironment() {
    const width = canvas ? canvas.width : 800,
          height = canvas ? canvas.height : 200;
    const env = ENVIRONMENTS[game.car.environmentIndex];
    if (env.img) {
      const imgWidth = env.img.width;
      let offset = -(game.car.environmentOffset % imgWidth);
      for (let x = offset; x < width; x += imgWidth) {
        ctx.drawImage(env.img, x, 0, imgWidth, height);
      }
    } else {
      ctx.fillStyle = env.fallbackColor;
      ctx.fillRect(0, 0, width, height);
    }
  }

  function simulateWeather() {
    const width = canvas ? canvas.width : 800,
          height = canvas ? canvas.height : 200;
    let currentWeather = WEATHERS[game.car.weatherIndex].name;
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
        drop.y += drop.speed * (1 / 60);
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
          ctx.fillStyle = "rgba(255,255,255," + (lightningTimer * 7) + ")";
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
        flake.y += flake.speed * (1 / 60);
        flake.x += flake.drift * (1 / 60);
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
    const bodyWidth = 60, bodyHeight = 20, cabinWidth = 30, cabinHeight = 15, wheelRadius = 6;
    if (game.carPaint.unlocked) {
      switch (game.carPaint.color) {
        case "Red": ctx.fillStyle = "#ff0000"; break;
        case "Blue": ctx.fillStyle = "#0000ff"; break;
        case "Green": ctx.fillStyle = "#00ff00"; break;
        case "Neon Pink": ctx.fillStyle = "#ff69b4"; break;
        default: ctx.fillStyle = "#00ffff";
      }
    } else {
      ctx.fillStyle = "#00ffff";
    }
    ctx.fillRect(x, y - bodyHeight, bodyWidth, bodyHeight);
    ctx.fillStyle = "#008080";
    ctx.fillRect(x + 10, y - bodyHeight - cabinHeight, cabinWidth, cabinHeight);
    ctx.fillStyle = "#222";
    let frontWheelX = x + 15, frontWheelY = y;
    ctx.beginPath();
    ctx.arc(frontWheelX, frontWheelY, wheelRadius, 0, Math.PI * 2);
    ctx.fill();
    let wheelAngle = (game.car.fuel > 0) ? (globalTime * 5) : 0;
    ctx.strokeStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(frontWheelX, frontWheelY);
    ctx.lineTo(frontWheelX + wheelRadius * Math.cos(wheelAngle), frontWheelY + wheelRadius * Math.sin(wheelAngle));
    ctx.stroke();
    let rearWheelX = x + bodyWidth - 15, rearWheelY = y;
    ctx.beginPath();
    ctx.arc(rearWheelX, rearWheelY, wheelRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(rearWheelX, rearWheelY);
    ctx.lineTo(rearWheelX + wheelRadius * Math.cos(wheelAngle), rearWheelY + wheelRadius * Math.sin(wheelAngle));
    ctx.stroke();
  }

  function drawCarCanvas() {
    const width = canvas ? canvas.width : 800,
          height = canvas ? canvas.height : 200;
    drawEnvironment();
    drawBgItems();
    simulateWeather();

    // Draw road
    const roadHeight = 50, roadY = 160;
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, roadY, width, roadHeight);

    // Prepare HUD
    const envName = ENVIRONMENTS[game.car.environmentIndex].name;
    ctx.font = "16px Arial";
    let currentWeather = WEATHERS[game.car.weatherIndex].name;
    let hudText = `Miles: ${formatNumber(game.car.miles)} | Env: ${envName} | Weather: ${currentWeather}`;
    let textWidth = ctx.measureText(hudText).width;
    ctx.fillStyle = "rgba(50,50,50,0.8)";
    ctx.fillRect(5, 5, textWidth + 10, 28);
    ctx.fillStyle = "#fff";
    ctx.fillText(hudText, 10, 26);

    // High Score HUD
    let highScore = updatePersonalScore();
    let highScoreText = `High Score: ${formatNumber(highScore)} miles`;
    let hsTextWidth = ctx.measureText(highScoreText).width;
    ctx.fillStyle = "rgba(50,50,50,0.8)";
    ctx.fillRect(width - hsTextWidth - 20, 5, hsTextWidth + 10, 28);
    ctx.fillStyle = "#fff";
    ctx.fillText(highScoreText, width - hsTextWidth - 15, 26);

    // Weather Notifications
    if (currentWeather === "Rain" && !game.car.rainTyres) {
      weatherNotificationElem.textContent = "Rain slowing you down (20% reduction).";
    } else {
      weatherNotificationElem.textContent = "";
    }
    if (game.car.isStuck) {
      stuckNotificationElem.textContent = `Car is stuck in the snow. Time until unstuck: ${Math.ceil(game.car.stuckTimer)} sec.`;
    } else {
      stuckNotificationElem.textContent = "";
    }

    // Bobbing effect for the car
    let effectiveSpeed = game.car.speed * game.car.tempSpeedModifier;
    if ((currentWeather === "Rain" || currentWeather === "Storm") && !game.car.rainTyres) {
      effectiveSpeed *= (currentWeather === "Storm") ? 0.7 : 0.8;
    }
    if (game.car.fuel <= 0) effectiveSpeed = 0;
    let bobbingOffset = effectiveSpeed > 0.01 ? 2 * Math.sin(globalTime * 2 * Math.PI) : 0;
    const carX = width * 0.1;
    const carY = roadY + 25 + bobbingOffset;
    drawCar(carX, carY);
  }

  // -------------------------------
  // Main Game Loop
  // -------------------------------
  let lastFrameTime = Date.now();
  function gameLoop() {
    const now = Date.now();
    const deltaTime = (now - lastFrameTime) / 1000;
    lastFrameTime = now;
    globalTime += deltaTime;
    autoTickProgress += deltaTime;
    if (autoTickProgress >= 1) autoTickProgress -= 1;

    updateWeather(deltaTime);

    if (game.car.isStuck) {
      game.car.stuckTimer -= deltaTime;
      if (game.car.stuckTimer <= 0) {
        game.car.isStuck = false;
        showEventMessage("[+] Car is now unstuck.");
      }
    } else {
      const autoProduction =
        game.autoClickers *
        game.autoClickerBaseProduction *
        (1 + game.upgrades.autoEfficiency.level * 0.1) *
        game.prestige.multiplier;
      const produced = autoProduction * deltaTime;
      game.aether += produced;
      game.totalAether += produced;

      if (game.car.fuel > 0) {
        if (game.car.tempSpeedTimer > 0) {
          game.car.tempSpeedTimer -= deltaTime;
          if (game.car.tempSpeedTimer <= 0) game.car.tempSpeedModifier = 1;
        }
        let effectiveSpeed = game.car.speed * game.car.tempSpeedModifier;
        let currentWeather = WEATHERS[game.car.weatherIndex].name;
        if ((currentWeather === "Rain" || currentWeather === "Storm") && !game.car.rainTyres) {
          effectiveSpeed *= (currentWeather === "Storm") ? 0.7 : 0.8;
        }
        let milesThisFrame = effectiveSpeed * deltaTime;
        let effectiveConsumption =
          game.car.baseFuelConsumption *
          (1 - game.car.efficiencyUpgrade.level * game.car.efficiencyUpgrade.efficiencyBonus);
        let fuelConsumed = milesThisFrame * effectiveConsumption;
        if (fuelConsumed > game.car.fuel) {
          milesThisFrame = game.car.fuel / effectiveConsumption;
          fuelConsumed = game.car.fuel;
          game.car.fuel = 0;
          addLog("[-] The car runs out of fuel mid-journey!");
        } else {
          game.car.fuel -= fuelConsumed;
        }
        if (milesThisFrame > 0) {
          game.car.miles += milesThisFrame;
          game.car.tokenProgress += milesThisFrame;
          if (game.car.miles - game.car.lastEnvChangeMiles >= 50) {
            let newEnv;
            do {
              newEnv = Math.floor(Math.random() * ENVIRONMENTS.length);
            } while (newEnv === game.car.environmentIndex);
            game.car.environmentIndex = newEnv;
            game.car.lastEnvChangeMiles = game.car.miles;
            showEventMessage("[!] Environment changed to " + ENVIRONMENTS[newEnv].name);
            const comment = getRandomEnvironmentComment(ENVIRONMENTS[newEnv].name);
            if (comment) addLog(comment);
          }
          if (Math.random() < 0.02 * milesThisFrame) {
            const envName = ENVIRONMENTS[game.car.environmentIndex].name;
            const comment = getRandomEnvironmentComment(envName);
            if (comment) addLog(comment);
          }
          if (game.car.tokenProgress >= game.car.tokenThreshold) {
            const tokensGained = Math.floor(game.car.tokenProgress / game.car.tokenThreshold);
            game.car.techTokens += tokensGained;
            game.car.tokenProgress -= tokensGained * game.car.tokenThreshold;
          }
          game.car.environmentOffset += effectiveSpeed * deltaTime * 50;
          updateBgItems(deltaTime, effectiveSpeed);
        }
      }
    }

    checkCarRandomEvents(deltaTime);
    updateDisplay();
    if (canvas) drawCarCanvas();
    updateAutoClickerDetails();
    updatePersonalScore();
    requestAnimationFrame(gameLoop);
  }

  function showEventMessage(msg) {
    if (eventMessageElem) {
      eventMessageElem.textContent = msg;
      setTimeout(() => { eventMessageElem.textContent = ""; }, 5000);
    }
    addLog(msg);
  }

  function resetGame() {
    if (confirm("Are you sure you want to reset the game? This will clear all progress (High Score is kept).")) {
      localStorage.removeItem("neonAetherSave");
      location.reload();
    }
  }

  // -------------------------------
  // Inventory Overlay Functions
  // -------------------------------
  const carInventoryButton = document.getElementById("carInventoryButton");
  const inventoryOverlay = document.getElementById("inventoryOverlay");
  const closeInventory = document.getElementById("closeInventory");
  const inventoryCarColour = document.getElementById("inventoryCarColour");

  function openInventory() {
    if (inventoryCarColour) {
      inventoryCarColour.textContent = game.carPaint.color;
    }
    if (inventoryOverlay) {
      inventoryOverlay.style.display = "block";
    }
  }
  function closeInventoryOverlay() {
    if (inventoryOverlay) {
      inventoryOverlay.style.display = "none";
    }
  }
  if (carInventoryButton) carInventoryButton.addEventListener("click", openInventory);
  if (closeInventory) closeInventory.addEventListener("click", closeInventoryOverlay);
  window.addEventListener("click", function (event) {
    if (event.target === inventoryOverlay) {
      inventoryOverlay.style.display = "none";
    }
  });

  // -------------------------------
  // Event Listeners for Game Buttons
  // -------------------------------
  if (document.getElementById("clickButton"))
    document.getElementById("clickButton").addEventListener("click", gameClick);
  if (document.getElementById("buyClickUpgradeButton"))
    document.getElementById("buyClickUpgradeButton").addEventListener("click", buyClickUpgrade);
  if (document.getElementById("buyAutoClickerButton"))
    document.getElementById("buyAutoClickerButton").addEventListener("click", buyAutoClicker);
  if (document.getElementById("buyAutoEfficiencyButton"))
    document.getElementById("buyAutoEfficiencyButton").addEventListener("click", buyAutoEfficiency);
  if (document.getElementById("prestigeButton"))
    document.getElementById("prestigeButton").addEventListener("click", prestige);
  if (document.getElementById("fuelCarButton"))
    document.getElementById("fuelCarButton").addEventListener("click", fuelCar);
  if (document.getElementById("buyEngineUpgradeButton"))
    document.getElementById("buyEngineUpgradeButton").addEventListener("click", buyEngineUpgrade);
  if (document.getElementById("buyEfficiencyUpgradeButton"))
    document.getElementById("buyEfficiencyUpgradeButton").addEventListener("click", buyEfficiencyUpgrade);
  if (document.getElementById("buyTankUpgradeButton"))
    document.getElementById("buyTankUpgradeButton").addEventListener("click", buyTankUpgrade);
  if (document.getElementById("buySnowTyresButton"))
    document.getElementById("buySnowTyresButton").addEventListener("click", buySnowTyres);
  if (document.getElementById("buyRainTyresButton"))
    document.getElementById("buyRainTyresButton").addEventListener("click", buyRainTyres);
  if (document.getElementById("resetGameButton"))
    document.getElementById("resetGameButton").addEventListener("click", resetGame);

  // -------------------------------
  // Start the Game
  // -------------------------------
  loadGame();
  loadExistingLog();
  if (offlineAetherGained > 0) {
    addLog(`[+] Offline Gains: You earned ${formatNumber(offlineAetherGained)} Aether while away!`);
  }
  updateDisplay();
  if (canvas) drawCarCanvas();
  requestAnimationFrame(gameLoop);
  setInterval(saveGame, 5000);
});
