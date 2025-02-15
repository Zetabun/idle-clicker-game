(function () {
  "use strict";

  // ================= CONFIGURATION & INITIAL STATE =================
  const WEATHERS = [
    { name: "Clear", effect: null },
    { name: "Rain", effect: "speed reduction" },
    { name: "Snow", effect: "stuck chance" },
    { name: "Storm", effect: "severe speed reduction" },
    { name: "Fog", effect: "visibility reduction" }
  ];

  const ENVIRONMENTS = [
    { name: "City", fallbackColor: "#444", comments: ["Skyscrapers loom!", "Urban jungle."] },
    { name: "Desert", fallbackColor: "#EDC9Af", comments: ["Heat waves distort the horizon.", "Sandy vistas."] },
    { name: "Neon City", fallbackColor: "#2a0030", comments: ["Neon lights flicker.", "Glowing streets."] },
    { name: "Digital Wasteland", fallbackColor: "#330000", comments: ["Code remnants lie around.", "Glitches abound."] },
    { name: "Quantum Forest", fallbackColor: "#002200", comments: ["Trees shimmer.", "Nature reimagined."] }
  ];

  let lastFrameTime = Date.now();
  let globalTime = 0;
  let autoTickProgress = 0;
  let lastLootMile = 0;
  let offlineAetherGained = 0;
  let lastHighScoreLogged = 0;
  let fuelRanOutLogged = false;
  let dropOffLogged = false;

  // Main game state object
  const game = {
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
    log: [],
    stats: { manualClicks: 0, autoClicks: 0, hackingPoints: 0 },
    trunk: { slots: 4, items: [] },
    garage: [],
    roadLoot: [],
    car: {
      fuel: 0,
      maxFuel: 100,
      baseFuelConsumption: 5,
      miles: 0,
      speed: 0.2,
      techTokens: 0,
      tokenProgress: 0,
      tokenThreshold: 50,
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
      // direction: 1 = forward, -1 = return, 0 = stationary
      direction: 0
    },
    carPaint: { unlocked: false, color: "Default" },
    research: {}
  };

  // ================= HELPER FUNCTIONS =================

  // Format large numbers using scientific notation when needed
  function formatNumber(num) {
    if (num < 1000) return num.toFixed(0);
    const exponent = Math.floor(Math.log10(num));
    const mantissa = num / Math.pow(10, exponent);
    return mantissa.toFixed(2) + "e" + exponent;
  }

  // Positive modulus
  function mod(n, m) {
    return ((n % m) + m) % m;
  }

  // Logging function for game events
  function addLog(message, type) {
    const timestamp = new Date().toLocaleTimeString();
    let lineHtml = `[${timestamp}] ${message}`;
    // Optionally add different styling based on type
    game.log.push(lineHtml);
    const logElem = document.getElementById("gameLog");
    if (logElem) {
      const line = document.createElement("div");
      line.innerHTML = lineHtml;
      logElem.appendChild(line);
      setTimeout(() => line.scrollIntoView({ behavior: "smooth" }), 0);
    }
  }

  function showEventMessage(msg, type) {
    const eventElem = document.getElementById("eventMessage");
    if (eventElem) {
      eventElem.textContent = msg;
      setTimeout(() => { eventElem.textContent = ""; }, 5000);
    }
    addLog(msg, type);
  }

  // Returns a random environment comment
  function getRandomEnvironmentComment(envName) {
    const env = ENVIRONMENTS.find(e => e.name === envName);
    if (env && env.comments && env.comments.length) {
      return env.comments[Math.floor(Math.random() * env.comments.length)];
    }
    return "";
  }

  // ================= SAVE/LOAD & OFFLINE PROGRESS =================

  function saveGame() {
    game.lastUpdate = Date.now();
    localStorage.setItem("neonAetherSave", JSON.stringify(game));
  }

  function applyCarOfflineProgress(offlineSeconds) {
    const effectiveSpeed = game.car.speed;
    const consumptionRate =
      game.car.baseFuelConsumption *
      (1 - game.car.efficiencyUpgrade.level * game.car.efficiencyUpgrade.efficiencyBonus);
    const milesWanted = effectiveSpeed * offlineSeconds;
    const milesPossible = consumptionRate > 0 ? (game.car.fuel / consumptionRate) : 0;
    const milesTraveled = Math.min(milesWanted, milesPossible);
    if (milesTraveled < milesWanted && game.car.fuel > 0) {
      game.car.fuel = 0;
      addLog("Offline: The car <span class='log-negative'>runs out of fuel</span>.", "fuelOut");
    } else {
      game.car.fuel -= milesTraveled * consumptionRate;
    }
    game.car.miles += milesTraveled;
    game.car.tokenProgress += milesTraveled;
    if (game.car.tokenProgress >= game.car.tokenThreshold) {
      const tokensGained = Math.floor(game.car.tokenProgress / game.car.tokenThreshold);
      game.car.techTokens += tokensGained;
      game.car.tokenProgress -= tokensGained * game.car.tokenThreshold;
    }
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
      const now = Date.now();
      let offlineSeconds = (now - game.lastUpdate) / 1000;
      if (offlineSeconds > 3600) offlineSeconds = 3600;
      const autoProduction = game.autoClickers * (1 + game.upgrades.autoEfficiency.level * 0.1) * game.prestige.multiplier;
      const produced = autoProduction * offlineSeconds;
      offlineAetherGained = produced;
      game.aether += produced;
      game.totalAether += produced;
      applyCarOfflineProgress(offlineSeconds);
      game.lastUpdate = now;
      const storedHS = localStorage.getItem("neonAetherHighScore");
      if (storedHS) lastHighScoreLogged = Math.floor(parseFloat(storedHS));
    } else {
      game.car.weatherIndex = Math.floor(Math.random() * WEATHERS.length);
      game.car.environmentIndex = Math.floor(Math.random() * ENVIRONMENTS.length);
      addLog("New game started. The journey begins.");
      saveGame();
    }
    // Set UI for starting at garage if needed
    if (game.car.miles === 0) {
      document.getElementById("startJourneyButton").style.display = "inline-block";
      document.getElementById("returnHomeButton").style.display = "none";
      game.car.direction = 0;
    }
  }

  function resetGame() {
    if (confirm("Are you sure you want to reset the game? This will clear all progress.")) {
      localStorage.removeItem("neonAetherSave");
      localStorage.removeItem("neonAetherHighScore");
      location.reload();
    }
  }

  // ================= DISPLAY & DRAWING FUNCTIONS =================

  function updateDisplay() {
    // Update DOM elements using game state
    document.getElementById("statsAether").textContent = formatNumber(game.aether);
    document.getElementById("statsNeonCores").textContent = game.prestige.neonCores;
    document.getElementById("statsPrestigeCount").textContent = game.prestige.count;
    document.getElementById("statsMiles").textContent = formatNumber(game.car.miles);
    document.getElementById("statsManualClicks").textContent = game.stats.manualClicks;
    document.getElementById("statsAutoClicks").textContent = game.stats.autoClicks;
    // Additional UI updates (shop, car stats, etc.) as needed...
  }

  function drawCarCanvas() {
    const canvas = document.getElementById("carCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    // Draw background environment
    const env = ENVIRONMENTS[game.car.environmentIndex];
    ctx.fillStyle = env.fallbackColor;
    ctx.fillRect(0, 0, width, height);
    // Draw road, weather effects, loot, HUD, etc.
    // (Implement drawing logic similar to your original code.)
  }

  // ================= GAME LOOP =================

  function gameLoop() {
    const now = Date.now();
    const deltaTime = (now - lastFrameTime) / 1000;
    lastFrameTime = now;
    globalTime += deltaTime;

    // Spawn loot for new mile
    if (game.car.direction === 1 && Math.floor(game.car.miles) > lastLootMile) {
      spawnLootForNewMile();
      lastLootMile = Math.floor(game.car.miles);
    }

    updateWeather(deltaTime);

    // Handle auto-clickers production
    autoTickProgress += deltaTime;
    while (autoTickProgress >= 1) {
      const productionPerClicker = 1 * (1 + game.upgrades.autoEfficiency.level * 0.1);
      const totalAuto = game.autoClickers * productionPerClicker;
      game.aether += totalAuto;
      game.totalAether += totalAuto;
      game.stats.autoClicks += game.autoClickers;
      autoTickProgress -= 1;
    }

    // Update car movement based on direction and fuel consumption
    if (!game.car.isStuck) {
      if (game.car.direction === 1) {
        // Forward journey logic: update miles, fuel, environment offset, token progress, etc.
      } else if (game.car.direction === -1) {
        // Return home logic: update miles, fuel consumption and handle drop-off.
      }
    } else {
      game.car.stuckTimer -= deltaTime;
      if (game.car.stuckTimer <= 0) {
        game.car.isStuck = false;
        showEventMessage("Car is now unstuck.");
      }
    }

    checkCarRandomEvents(deltaTime);
    updateDisplay();
    drawCarCanvas();
    requestAnimationFrame(gameLoop);
  }

  // ================= EVENT LISTENERS =================

  // Harvest Aether on click
  function harvestAether() {
    const amount = game.clickValue * game.clickMultiplier;
    game.aether += amount;
    game.totalAether += amount;
    game.stats.manualClicks += 1;
    updateDisplay();
    saveGame();
  }
  document.getElementById("clickButton").addEventListener("click", harvestAether);

  // Return home button
  document.getElementById("returnHomeButton").addEventListener("click", function() {
    if (game.car.miles === 0) {
      alert("You are already home!");
      return;
    }
    if (game.car.direction === 1) {
      game.car.direction = -1;
      showEventMessage("Car is returning home...", "fuelAdd");
      this.style.display = "none";
    }
  });

  // Start journey button
  document.getElementById("startJourneyButton").addEventListener("click", function() {
    game.car.direction = 1;
    if (game.car.miles === 0) { game.car.miles = 0.01; dropOffLogged = false; }
    showEventMessage("Journey resumed.");
    this.style.display = "none";
    document.getElementById("returnHomeButton").style.display = "inline-block";
  });

  // Fuel car button
  document.getElementById("fuelCarButton").addEventListener("click", function() {
    const cost = 10;
    if (game.aether < cost) {
      alert("Not enough Aether to fuel the car!");
      return;
    }
    game.aether -= cost;
    game.car.fuel = Math.min(game.car.fuel + 10, game.car.maxFuel);
    fuelRanOutLogged = false;
    updateDisplay();
    saveGame();
    showEventMessage("Fueled car: +10 Fuel", "fuelAdd");
  });

  // Reset game button
  document.getElementById("resetGameButton").addEventListener("click", resetGame);

  // Canvas click event for loot collection and other interactions
  document.getElementById("carCanvas").addEventListener("click", function (e) {
    // Determine click position and collect loot if applicable.
    // (Implement loot collection logic here.)
  });

  // ================= INITIALIZATION =================

  loadGame();
  // Optionally load previous log entries into the UI
  // loadExistingLog();
  if (offlineAetherGained > 0) {
    addLog(`Offline Gains: You earned ${formatNumber(offlineAetherGained)} Aether while away!`);
  }
  updateDisplay();
  requestAnimationFrame(gameLoop);
  setInterval(saveGame, 5000);

  // ================= END OF CODE =================
})();
