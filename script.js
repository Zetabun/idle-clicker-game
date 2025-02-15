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

  // Global timing and state variables
  let lastFrameTime = Date.now();
  let globalTime = 0;
  let autoTickProgress = 0;
  let lastLootMile = 0;
  let offlineAetherGained = 0;
  let lastHighScoreLogged = 0;
  let fuelRanOutLogged = false;
  let dropOffLogged = false;
  let weatherTimer = 0;
  let snowStuckTimer = 0;
  let lightningTimer = 0; // for storm lightning effects

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
      // direction: 1 = forward, -1 = return, 0 = stationary (garage)
      direction: 0
    },
    carPaint: { unlocked: false, color: "Default" },
    research: {}
  };

  // ================= HELPER FUNCTIONS =================

  // Formats numbers with scientific notation for large values.
  function formatNumber(num) {
    if (num < 1000) return num.toFixed(0);
    const exponent = Math.floor(Math.log10(num));
    const mantissa = num / Math.pow(10, exponent);
    return mantissa.toFixed(2) + "e" + exponent;
  }

  // Returns positive modulus.
  function mod(n, m) {
    return ((n % m) + m) % m;
  }

  // Logs a message with a timestamp to the game log.
  function addLog(message, type) {
    const timestamp = new Date().toLocaleTimeString();
    const lineHtml = `[${timestamp}] ${message}`;
    game.log.push(lineHtml);
    const logElem = document.getElementById("gameLog");
    if (logElem) {
      const line = document.createElement("div");
      line.innerHTML = lineHtml;
      logElem.appendChild(line);
      setTimeout(() => line.scrollIntoView({ behavior: "smooth" }), 0);
    }
  }

  // Displays an event message for a few seconds and logs it.
  function showEventMessage(msg, type) {
    const eventElem = document.getElementById("eventMessage");
    if (eventElem) {
      eventElem.textContent = msg;
      setTimeout(() => { eventElem.textContent = ""; }, 5000);
    }
    addLog(msg, type);
  }

  // Returns a random comment for the current environment.
  function getRandomEnvironmentComment(envName) {
    const env = ENVIRONMENTS.find(e => e.name === envName);
    if (env && env.comments && env.comments.length) {
      return env.comments[Math.floor(Math.random() * env.comments.length)];
    }
    return "";
  }

  // ================= WEATHER & ENVIRONMENT FUNCTIONS =================

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
          game.car.stuckTimer = 600; // 10 minutes
          showEventMessage("Car is stuck in the snow! Immobilized for 10 minutes.");
        }
        snowStuckTimer = 0;
      }
    } else {
      snowStuckTimer = 0;
    }
    if (WEATHERS[game.car.weatherIndex].name === "Storm") {
      if (lightningTimer <= 0 && Math.random() < 0.005) {
        lightningTimer = 0.1;
      }
      if (lightningTimer > 0) {
        lightningTimer -= deltaTime;
      }
    }
  }

  function drawEnvironment(ctx, width, height) {
    const env = ENVIRONMENTS[game.car.environmentIndex];
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

  function drawBgItems(ctx, width) {
    const bgMultiplier = 1.5;
    const bgOffset = mod(game.car.environmentOffset * bgMultiplier, width);
    const env = ENVIRONMENTS[game.car.environmentIndex];
    if (env.name === "City") {
      ctx.fillStyle = "#AAAAAA";
      ctx.fillRect(mod(50 - bgOffset, width), 120, 25, 40);
      ctx.fillRect(mod(250 - bgOffset, width), 90, 20, 60);
    } else if (env.name === "Desert") {
      ctx.fillStyle = "#EDC9Af";
      ctx.fillRect(mod(100 - bgOffset, width), 140, 30, 10);
      ctx.fillRect(mod(300 - bgOffset, width), 130, 20, 10);
    } else if (env.name === "Neon City") {
      ctx.fillStyle = "#00ffff";
      ctx.fillRect(mod(50 - bgOffset, width), 100, 20, 40);
      ctx.fillRect(mod(200 - bgOffset, width), 80, 15, 50);
    } else if (env.name === "Digital Wasteland") {
      ctx.fillStyle = "#550000";
      ctx.fillRect(mod(100 - bgOffset, width), 150, 30, 10);
      ctx.fillRect(mod(300 - bgOffset, width), 140, 20, 10);
    } else if (env.name === "Quantum Forest") {
      ctx.fillStyle = "#003300";
      ctx.fillRect(mod(80 - bgOffset, width), 100, 10, 40);
      ctx.fillRect(mod(150 - bgOffset, width), 110, 10, 40);
    }
  }

  function simulateWeather(ctx, width, height) {
    const currentWeather = WEATHERS[game.car.weatherIndex].name;
    if (currentWeather === "Rain" || currentWeather === "Storm") {
      if (!window.rainDrops || window.rainDrops.length === 0) {
        window.rainDrops = [];
        for (let i = 0; i < 100; i++) {
          window.rainDrops.push({
            x: Math.random() * width,
            y: Math.random() * height,
            speed: 300 + Math.random() * 200,
            length: 15 + Math.random() * 10
          });
        }
      }
      ctx.strokeStyle = "rgba(0,0,255,0.5)";
      ctx.lineWidth = 2;
      window.rainDrops.forEach(drop => {
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
      if (currentWeather === "Storm" && lightningTimer > 0) {
        ctx.fillStyle = `rgba(255,255,255,${lightningTimer * 7})`;
        ctx.fillRect(0, 0, width, height);
      }
    } else {
      window.rainDrops = [];
    }
    if (currentWeather === "Snow") {
      if (!window.snowFlakes || window.snowFlakes.length === 0) {
        window.snowFlakes = [];
        for (let i = 0; i < 50; i++) {
          window.snowFlakes.push({
            x: Math.random() * width,
            y: Math.random() * height,
            speed: 30 + Math.random() * 30,
            radius: 2 + Math.random() * 2,
            drift: (Math.random() - 0.5) * 20
          });
        }
      }
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      window.snowFlakes.forEach(flake => {
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
      window.snowFlakes = [];
    }
    if (currentWeather === "Fog") {
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillRect(0, 0, width, height);
    }
  }

  // ================= DRAWING FUNCTIONS =================

  function drawCar(ctx, x, y) {
    const bodyWidth = 60, bodyHeight = 20, cabinWidth = 30, cabinHeight = 15, wheelRadius = 6;
    ctx.fillStyle = game.carPaint.unlocked 
      ? (game.carPaint.color === "Red" ? "#ff0000" :
         game.carPaint.color === "Blue" ? "#0000ff" :
         game.carPaint.color === "Green" ? "#00ff00" :
         game.carPaint.color === "Neon Pink" ? "#ff69b4" : "#00ffff")
      : "#00ffff";
    ctx.fillRect(x, y - bodyHeight, bodyWidth, bodyHeight);
    ctx.fillStyle = "#008080";
    ctx.fillRect(x + 10, y - bodyHeight - cabinHeight, cabinWidth, cabinHeight);
    // Draw wheels with rotation based on global time if moving.
    let wheelAngle = (game.car.direction !== 0 && game.car.fuel > 0 && game.car.miles !== 0)
      ? globalTime * 5 : 0;
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

  function drawLoot(ctx) {
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
          (game.car.direction === -1 && loot.x > document.getElementById("carCanvas").width + 50)) {
        game.roadLoot.splice(i, 1);
      }
    }
  }

  function spawnLootForNewMile() {
    const type = Math.random() < 0.5 ? "aether_crystal" : "computer_parts";
    const newLoot = createLootObject(type);
    game.roadLoot.push(newLoot);
    setTimeout(() => {
      addLog(`Loot spawned: ${newLoot.name} has appeared on the road!`, "lootSpawn");
    }, 500);
  }

  function createLootObject(type) {
    const canvas = document.getElementById("carCanvas");
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

  // ================= DISPLAY & UPDATE FUNCTIONS =================

  function updateDisplay() {
    document.getElementById("statsAether").textContent = formatNumber(game.aether);
    document.getElementById("statsNeonCores").textContent = game.prestige.neonCores;
    document.getElementById("statsPrestigeCount").textContent = game.prestige.count;
    document.getElementById("statsMiles").textContent = formatNumber(game.car.miles);
    document.getElementById("statsManualClicks").textContent = game.stats.manualClicks;
    document.getElementById("statsAutoClicks").textContent = game.stats.autoClicks;
    // Additional UI updates for shop details, car stats, etc.
  }

  function drawCarCanvas() {
    const canvas = document.getElementById("carCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width, height = canvas.height;
    
    // Draw environment background
    drawEnvironment(ctx, width, height);
    drawBgItems(ctx, width);
    simulateWeather(ctx, width, height);

    // Draw road
    const roadY = 160;
    const roadHeight = 50;
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, roadY, width, roadHeight);

    // Draw loot on road
    drawLoot(ctx);

    // Draw HUD text
    ctx.font = "16px Arial";
    const envName = ENVIRONMENTS[game.car.environmentIndex].name;
    const currentWeather = WEATHERS[game.car.weatherIndex].name;
    const hudText = `Miles: ${formatNumber(game.car.miles)} | Env: ${envName} | Weather: ${currentWeather}`;
    const textWidth = ctx.measureText(hudText).width;
    ctx.fillStyle = "rgba(50,50,50,0.8)";
    ctx.fillRect(5, 5, textWidth + 10, 28);
    ctx.fillStyle = "#fff";
    ctx.fillText(hudText, 10, 26);

    // Draw high score HUD
    const highScore = lastHighScoreLogged;
    const highScoreText = `High Score: ${formatNumber(highScore)} miles`;
    const hsTextWidth = ctx.measureText(highScoreText).width;
    ctx.fillStyle = "rgba(50,50,50,0.8)";
    ctx.fillRect(width - hsTextWidth - 20, 5, hsTextWidth + 10, 28);
    ctx.fillStyle = "#fff";
    ctx.fillText(highScoreText, width - hsTextWidth - 15, 26);

    // Calculate bobbing effect for car if moving
    let bobbingOffset = (game.car.direction !== 0 && game.car.fuel > 0 && game.car.miles !== 0)
      ? 2 * Math.sin(globalTime * 2 * Math.PI) : 0;

    ctx.save();
    if (game.car.direction === -1) {
      ctx.translate(width * 0.1 + 30, 0);
      ctx.scale(-1, 1);
      drawCar(ctx, 0, roadY + 25 + bobbingOffset);
    } else {
      drawCar(ctx, width * 0.1, roadY + 25 + bobbingOffset);
    }
    ctx.restore();
  }

  // ================= SAVE/LOAD & OFFLINE PROGRESS FUNCTIONS =================

  function saveGame() {
    game.lastUpdate = Date.now();
    localStorage.setItem("neonAetherSave", JSON.stringify(game));
  }

  function applyCarOfflineProgress(offlineSeconds) {
    const effectiveSpeed = game.car.speed;
    const consumptionRate =
      game.car.baseFuelConsumption * (1 - game.car.efficiencyUpgrade.level * game.car.efficiencyUpgrade.efficiencyBonus);
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

  // ================= GAME LOOP =================

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
    while (autoTickProgress >= 1) {
      const productionPerClicker = 1 * (1 + game.upgrades.autoEfficiency.level * 0.1);
      const totalAuto = game.autoClickers * productionPerClicker;
      game.aether += totalAuto;
      game.totalAether += totalAuto;
      game.stats.autoClicks += game.autoClickers;
      autoTickProgress -= 1;
    }

    if (!game.car.isStuck) {
      if (game.car.direction === 1) {
        // Forward journey
        let effectiveSpeed = game.car.speed * game.car.tempSpeedModifier;
        if (WEATHERS[game.car.weatherIndex].name === "Rain" && !game.car.rainTyres) {
          effectiveSpeed *= 0.8;
        } else if (WEATHERS[game.car.weatherIndex].name === "Storm") {
          effectiveSpeed *= 0.7;
        }
        const consumptionRate = game.car.baseFuelConsumption * (1 - game.car.efficiencyUpgrade.level * game.car.efficiencyUpgrade.efficiencyBonus);
        const milesThisFrame = effectiveSpeed * deltaTime;
        const milesPossible = consumptionRate > 0 ? (game.car.fuel / consumptionRate) : 0;
        let actualMiles = milesThisFrame > milesPossible ? milesPossible : milesThisFrame;
        if (actualMiles < milesThisFrame) {
          game.car.fuel = 0;
          if (!fuelRanOutLogged) {
            addLog("The car <span class='log-negative'>runs out of fuel</span> mid-journey!", "fuelOut");
            fuelRanOutLogged = true;
          }
        } else {
          game.car.fuel -= actualMiles * consumptionRate;
          fuelRanOutLogged = false;
        }
        if (game.car.miles === 0) {
          game.car.miles = 0.01;
          dropOffLogged = false;
        }
        game.car.miles += actualMiles;
        game.car.tokenProgress += actualMiles;
        if (game.car.miles - lastLootMile >= 50) {
          let newEnv;
          do {
            newEnv = Math.floor(Math.random() * ENVIRONMENTS.length);
          } while (newEnv === game.car.environmentIndex);
          game.car.environmentIndex = newEnv;
          lastLootMile = game.car.miles;
          showEventMessage("Environment changed to " + ENVIRONMENTS[newEnv].name, "env");
          const comment = getRandomEnvironmentComment(ENVIRONMENTS[newEnv].name);
          if (comment) addLog(comment, "env");
        }
        game.car.environmentOffset += actualMiles * 50;
        updateRoadLoot(deltaTime, actualMiles);
      } else if (game.car.direction === -1) {
        const consumptionRate = game.car.baseFuelConsumption * (1 - game.car.efficiencyUpgrade.level * game.car.efficiencyUpgrade.efficiencyBonus);
        let milesThisFrame = game.car.speed * deltaTime;
        const milesPossible = consumptionRate > 0 ? (game.car.fuel / consumptionRate) : 0;
        if (milesThisFrame > milesPossible) {
          milesThisFrame = milesPossible;
          game.car.fuel = 0;
          if (!fuelRanOutLogged) {
            addLog("The car <span class='log-negative'>runs out of fuel</span> mid-journey!", "fuelOut");
            fuelRanOutLogged = true;
          }
        } else {
          game.car.fuel -= milesThisFrame * consumptionRate;
          fuelRanOutLogged = false;
        }
        if (game.car.miles > 0) {
          game.car.miles = Math.max(game.car.miles - milesThisFrame, 0);
          game.car.environmentOffset -= milesThisFrame * 50;
          updateRoadLoot(deltaTime, milesThisFrame);
        }
        if (game.car.miles === 0 && !dropOffLogged) {
          showEventMessage("Loot dropped off to the garage.");
          game.garage = game.garage.concat(game.trunk.items);
          game.trunk.items = [];
          dropOffLogged = true;
          game.car.direction = 0;
          document.getElementById("startJourneyButton").style.display = "inline-block";
          document.getElementById("returnHomeButton").style.display = "none";
        }
      }
    } else {
      game.car.stuckTimer -= deltaTime;
      if (game.car.stuckTimer <= 0) {
        game.car.isStuck = false;
        showEventMessage("Car is now unstuck.");
      }
    }

    // Additional random event checks if needed.
    updateDisplay();
    drawCarCanvas();
    requestAnimationFrame(gameLoop);
  }

  // ================= EVENT LISTENERS =================

  function harvestAether() {
    const amount = game.clickValue * game.clickMultiplier;
    game.aether += amount;
    game.totalAether += amount;
    game.stats.manualClicks += 1;
    updateDisplay();
    saveGame();
  }
  document.getElementById("clickButton").addEventListener("click", harvestAether);

  document.getElementById("returnHomeButton").addEventListener("click", function () {
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

  document.getElementById("startJourneyButton").addEventListener("click", function () {
    game.car.direction = 1;
    if (game.car.miles === 0) { game.car.miles = 0.01; dropOffLogged = false; }
    showEventMessage("Journey resumed.");
    this.style.display = "none";
    document.getElementById("returnHomeButton").style.display = "inline-block";
  });

  document.getElementById("fuelCarButton").addEventListener("click", function () {
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

  document.getElementById("resetGameButton").addEventListener("click", resetGame);

  document.getElementById("carCanvas").addEventListener("click", function (e) {
    // Determine click coordinates and check for loot collection.
    const rect = this.getBoundingClientRect();
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

  // ================= INITIALIZATION =================

  loadGame();
  if (offlineAetherGained > 0) {
    addLog(`Offline Gains: You earned ${formatNumber(offlineAetherGained)} Aether while away!`);
  }
  updateDisplay();
  requestAnimationFrame(gameLoop);
  setInterval(saveGame, 5000);

  // ================= END OF CODE =================
})();
