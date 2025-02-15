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

  // Utility function for positive modulus
  function mod(n, m) {
    return ((n % m) + m) % m;
  }

  function getRandomEnvironmentComment(envName) {
    const env = ENVIRONMENTS.find(e => e.name === envName);
    return env && env.comments ? env.comments[Math.floor(Math.random() * env.comments.length)] : null;
  }

  function checkCarRandomEvents(deltaTime) {
    // Placeholder for additional random events
  }

  // ========== GAME STATE ==========
  let globalTime = 0,
      autoTickProgress = 0,
      lastLootMile = 0,
      dropOffLogged = false; // flag to log drop-off only once

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
    trunk: { slots: 5, items: [] },
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
    direction: 1
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

  // New: trunk inventory display element (must be in your index.html)
  const trunkItemsElem = document.getElementById("trunkItems");

  const inventoryOverlay = document.getElementById("inventoryOverlay");
  const closeInventory = document.getElementById("closeInventory");
  const inventoryCarColour = document.getElementById("inventoryCarColour");
  const inventoryGrid = document.getElementById("inventoryGrid");

  const returnHomeButton = document.getElementById("returnHomeButton");
  const startJourneyButton = document.getElementById("startJourneyButton");
  const carInventoryButton = document.getElementById("carInventoryButton");
  const resetGameButton = document.getElementById("resetGameButton");
  const prestigeButton = document.getElementById("prestigeButton");
  const clickButton = document.getElementById("clickButton");
  const fuelCarButton = document.getElementById("fuelCarButton");

  // ========== HELPER FUNCTIONS ==========
  function formatNumber(num) {
    if (num < 1000) return num.toFixed(0);
    const exponent = Math.floor(Math.log10(num));
    const mantissa = num / Math.pow(10, exponent);
    return mantissa.toFixed(2) + "e" + exponent;
  }

  // Enhanced addLog: handles different log types (fuelAdd shows green)
  function addLog(message, type) {
    const timestamp = new Date().toLocaleTimeString();
    let spanClass = "";
    if (type === "lootSpawn") spanClass = "log-green";
    else if (type === "lootCollect") spanClass = "log-gold";
    else if (type === "fuelOut") spanClass = "log-negative";
    else if (type === "fuelAdd") spanClass = "log-green";
    if (message.toLowerCase().includes("returning home")) spanClass += " log-pink";
    const line = document.createElement("div");
    line.innerHTML = `[${timestamp}] <span class="${spanClass}">${message}</span>`;
    gameLogElem.appendChild(line);
    game.log.push(`[${timestamp}] ${message}`);
    setTimeout(() => { line.scrollIntoView({ behavior: "smooth", block: "end" }); }, 0);
  }

  function loadExistingLog() {
    gameLogElem.innerHTML = "";
    game.log.forEach(lineText => {
      const div = document.createElement("div");
      div.innerHTML = lineText;
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
    setTimeout(() => { eventMessageElem.textContent = ""; }, 5000);
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

  // New function: update the trunk display
  function updateTrunkDisplay() {
    if (trunkItemsElem) {
      trunkItemsElem.innerHTML = "";
      if (game.trunk.items.length > 0) {
        game.trunk.items.forEach(item => {
          const div = document.createElement("div");
          div.textContent = item.name;
          trunkItemsElem.appendChild(div);
        });
      } else {
        trunkItemsElem.textContent = "Empty";
      }
    }
  }

  // ========== CANVAS DRAWING FUNCTIONS ==========
  function drawBgItems() {
    const bgMultiplier = 1.5;
    const bgOffset = mod(game.car.environmentOffset * bgMultiplier, canvas.width);
    const env = ENVIRONMENTS[game.car.environmentIndex];
    if (env.name === "City") {
      ctx.fillStyle = "#AAAAAA";
      ctx.fillRect(mod(50 - bgOffset, canvas.width), 120, 25, 40);
      ctx.fillRect(mod(250 - bgOffset, canvas.width), 90, 20, 60);
    } else if (env.name === "Desert") {
      ctx.fillStyle = "#EDC9Af";
      ctx.fillRect(mod(100 - bgOffset, canvas.width), 140, 30, 10);
      ctx.fillRect(mod(300 - bgOffset, canvas.width), 130, 20, 10);
    } else if (env.name === "Neon City") {
      ctx.fillStyle = "#00ffff";
      ctx.fillRect(mod(50 - bgOffset, canvas.width), 100, 20, 40);
      ctx.fillRect(mod(200 - bgOffset, canvas.width), 80, 15, 50);
    } else if (env.name === "Digital Wasteland") {
      ctx.fillStyle = "#550000";
      ctx.fillRect(mod(100 - bgOffset, canvas.width), 150, 30, 10);
      ctx.fillRect(mod(300 - bgOffset, canvas.width), 140, 20, 10);
    } else if (env.name === "Quantum Forest") {
      ctx.fillStyle = "#003300";
      ctx.fillRect(mod(80 - bgOffset, canvas.width), 100, 10, 40);
      ctx.fillRect(mod(150 - bgOffset, canvas.width), 110, 10, 40);
    }
  }

  function drawEnvironment() {
    const env = ENVIRONMENTS[game.car.environmentIndex];
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

  function simulateWeather() {
    const width = canvas.width,
          height = canvas.height;
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
          ctx.fillStyle = "rgba(255,255,255," + (lightningTimer * 7) + ")";
          ctx.fillRect(0, 0, width, height);
          lightningTimer -= 1/60;
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
    // Front wheel
    const frontWheelX = x + 15,
          frontWheelY = y;
    ctx.beginPath();
    ctx.arc(frontWheelX, frontWheelY, wheelRadius, 0, Math.PI * 2);
    ctx.fill();
    const wheelAngle = (game.car.fuel > 0 && game.car.miles !== 0) ? globalTime * 5 : 0;
    ctx.strokeStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(frontWheelX, frontWheelY);
    ctx.lineTo(frontWheelX + wheelRadius * Math.cos(wheelAngle), frontWheelY + wheelRadius * Math.sin(wheelAngle));
    ctx.stroke();
    // Rear wheel
    const rearWheelX = x + bodyWidth - 15,
          rearWheelY = y;
    ctx.beginPath();
    ctx.arc(rearWheelX, rearWheelY, wheelRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(rearWheelX, rearWheelY);
    ctx.lineTo(rearWheelX + wheelRadius * Math.cos(wheelAngle), rearWheelY + wheelRadius * Math.sin(wheelAngle));
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

  function updateRoadLoot(deltaTime, effectiveSpeed) {
    for (let i = game.roadLoot.length - 1; i >= 0; i--) {
      const loot = game.roadLoot[i];
      loot.x -= effectiveSpeed * game.car.direction * deltaTime * 50;
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
      addLog(`Loot spawned: ${newLoot.name} has appeared on the road!`, "lootSpawn");
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

  // ========== GAME LOOP FUNCTIONS ==========
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
    document.getElementById("autoClickerDetails").style.display = game.autoClickers > 0 ? "block" : "none";
    statsHighScoreElem.textContent = formatNumber(updatePersonalScore());
    // Update trunk display on the main screen:
    updateTrunkDisplay();
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

    // Spawn loot when moving forward and miles have increased
    if (game.car.direction === 1 && Math.floor(game.car.miles) > lastLootMile) {
      spawnLootForNewMile();
      lastLootMile = Math.floor(game.car.miles);
    }

    updateWeather(deltaTime);
    autoTickProgress += deltaTime;
    document.getElementById("autoClickerProgressBar").style.width = (Math.min(autoTickProgress, 1) * 100) + "%";

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
    } else {
      if (game.car.direction === -1) {  // Return home branch
        let effectiveSpeed = game.car.speed * game.car.tempSpeedModifier;
        const currentWeather = WEATHERS[game.car.weatherIndex].name;
        if (currentWeather === "Rain" && !game.car.rainTyres) effectiveSpeed *= 0.8;
        else if (currentWeather === "Storm") effectiveSpeed *= 0.7;
        const milesThisFrame = effectiveSpeed * deltaTime;
        const effectiveConsumption = game.car.baseFuelConsumption * (1 - game.car.efficiencyUpgrade.level * game.car.efficiencyUpgrade.efficiencyBonus);
        let fuelConsumed = milesThisFrame * effectiveConsumption;
        if (fuelConsumed > game.car.fuel) {
          fuelConsumed = game.car.fuel;
          effectiveSpeed = 0;
          game.car.fuel = 0;
          if (!fuelRanOutLogged) {
            addLog("The car <span class='log-negative'>runs out of fuel</span> mid-journey!", "fuelOut");
            fuelRanOutLogged = true;
          }
        } else {
          fuelRanOutLogged = false;
          game.car.fuel -= fuelConsumed;
        }
        // Return home: decrease miles until reaching 0
        if (game.car.miles > 0) {
          game.car.miles = Math.max(game.car.miles - milesThisFrame, 0);
          game.car.environmentOffset -= effectiveSpeed * deltaTime * 50;
          updateRoadLoot(deltaTime, effectiveSpeed);
        }
        // Drop off loot only once per return
        if (game.car.miles === 0 && !dropOffLogged) {
          showEventMessage("Loot dropped off to the garage.");
          game.garage = game.garage.concat(game.trunk.items);
          game.trunk.items = [];
          dropOffLogged = true;
          startJourneyButton.style.display = "inline-block";
          returnHomeButton.style.display = "none";
        }
      } else {  // Forward branch
        if (game.car.fuel > 0) {
          if (game.car.tempSpeedTimer > 0) {
            game.car.tempSpeedTimer -= deltaTime;
            if (game.car.tempSpeedTimer <= 0) game.car.tempSpeedModifier = 1;
          }
          let effectiveSpeed = game.car.speed * game.car.tempSpeedModifier;
          const currentWeather = WEATHERS[game.car.weatherIndex].name;
          if (currentWeather === "Rain" && !game.car.rainTyres) effectiveSpeed *= 0.8;
          else if (currentWeather === "Storm") effectiveSpeed *= 0.7;
          const milesThisFrame = effectiveSpeed * deltaTime;
          const effectiveConsumption = game.car.baseFuelConsumption * (1 - game.car.efficiencyUpgrade.level * game.car.efficiencyUpgrade.efficiencyBonus);
          let fuelConsumed = milesThisFrame * effectiveConsumption;
          if (fuelConsumed > game.car.fuel) {
            fuelConsumed = game.car.fuel;
            effectiveSpeed = 0;
            game.car.fuel = 0;
            if (!fuelRanOutLogged) {
              addLog("The car <span class='log-negative'>runs out of fuel</span> mid-journey!", "fuelOut");
              fuelRanOutLogged = true;
            }
          } else {
            fuelRanOutLogged = false;
            game.car.fuel -= fuelConsumed;
          }
          // If car is at home, kick off movement by setting a tiny value
          if (game.car.miles === 0) {
            game.car.miles = 0.01;
            dropOffLogged = false; // reset drop-off flag when journey starts
          }
          game.car.miles += effectiveSpeed * deltaTime;
          game.car.tokenProgress += effectiveSpeed * deltaTime;
          if (game.car.miles - lastEnvChangeMiles >= 50) {
            let newEnv;
            do {
              newEnv = Math.floor(Math.random() * ENVIRONMENTS.length);
            } while (newEnv === game.car.environmentIndex);
            game.car.environmentIndex = newEnv;
            lastEnvChangeMiles = game.car.miles;
            showEventMessage("Environment changed to " + ENVIRONMENTS[newEnv].name);
            const comment = getRandomEnvironmentComment(ENVIRONMENTS[newEnv].name);
            if (comment) addLog(comment, "env");
          }
          if (Math.random() < 0.02 * effectiveSpeed * deltaTime) {
            const comment = getRandomEnvironmentComment(ENVIRONMENTS[game.car.environmentIndex].name);
            if (comment) addLog(comment, "env");
          }
          if (game.car.tokenProgress >= game.car.tokenThreshold) {
            const tokensGained = Math.floor(game.car.tokenProgress / game.car.tokenThreshold);
            game.car.techTokens += tokensGained;
            game.car.tokenProgress -= tokensGained * game.car.tokenThreshold;
          }
          game.car.environmentOffset += effectiveSpeed * deltaTime * 50;
          updateRoadLoot(deltaTime, effectiveSpeed);
        }
      }
    }

    checkCarRandomEvents(deltaTime);
    updateDisplay();
    drawCarCanvas();
    requestAnimationFrame(gameLoop);
  }

  function drawCarCanvas() {
    const width = canvas.width,
          height = canvas.height;
    drawEnvironment();
    drawBgItems();
    simulateWeather();

    // Draw road
    const roadY = 160,
          roadHeight = 50;
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, roadY, width, roadHeight);

    drawLoot();

    // HUD
    const envName = ENVIRONMENTS[game.car.environmentIndex].name;
    const currentWeather = WEATHERS[game.car.weatherIndex].name;
    ctx.font = "16px Arial";
    const hudText = `Miles: ${formatNumber(game.car.miles)} | Env: ${envName} | Weather: ${currentWeather}`;
    const textWidth = ctx.measureText(hudText).width;
    ctx.fillStyle = "rgba(50,50,50,0.8)";
    ctx.fillRect(5, 5, textWidth + 10, 28);
    ctx.fillStyle = "#fff";
    ctx.fillText(hudText, 10, 26);

    // High score
    const highScore = updatePersonalScore();
    const highScoreText = `High Score: ${formatNumber(highScore)} miles`;
    const hsTextWidth = ctx.measureText(highScoreText).width;
    ctx.fillStyle = "rgba(50,50,50,0.8)";
    ctx.fillRect(width - hsTextWidth - 20, 5, hsTextWidth + 10, 28);
    ctx.fillStyle = "#fff";
    ctx.fillText(highScoreText, width - hsTextWidth - 15, 26);

    // Weather and stuck notifications
    if (currentWeather === "Rain" && !game.car.rainTyres) {
      weatherNotificationElem.textContent = "Rain slowing you down (20% reduction).";
    } else if (currentWeather === "Storm") {
      weatherNotificationElem.textContent = game.car.rainTyres ? "Storm overhead, be cautious!" : "Storm slowing you down (30% reduction).";
    } else {
      weatherNotificationElem.textContent = "";
    }
    stuckNotificationElem.textContent = game.car.isStuck
      ? `Car is stuck in the snow. Time until unstuck: ${Math.ceil(game.car.stuckTimer)} sec.`
      : "";

    // Draw car with bobbing effect if moving
    const bobbingOffset = (game.car.fuel > 0 && game.car.miles !== 0)
      ? 2 * Math.sin(globalTime * 2 * Math.PI)
      : 0;
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

  // ========== SAVE / LOAD ==========
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
        if (loaded.log && Array.isArray(loaded.log)) game.log = loaded.log;
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
    // Show "Start Journey" button if car is at home
    if (game.car.miles === 0) {
      startJourneyButton.style.display = "inline-block";
      returnHomeButton.style.display = "none";
    }
  }

  function applyCarOfflineProgress(offlineSeconds) {
    const effectiveSpeed = game.car.speed;
    const effectiveConsumption = game.car.baseFuelConsumption * (1 - game.car.efficiencyUpgrade.level * game.car.efficiencyUpgrade.efficiencyBonus);
    const potentialMiles = effectiveSpeed * offlineSeconds;
    const fuelNeeded = potentialMiles * effectiveConsumption;
    let milesTraveled = 0;
    if (fuelNeeded > game.car.fuel) {
      const travelTime = game.car.fuel / (effectiveConsumption * effectiveSpeed);
      milesTraveled = effectiveSpeed * travelTime;
      game.car.fuel = 0;
      addLog("Offline: The car <span class='log-negative'>runs out of fuel</span>.", "fuelOut");
    } else {
      milesTraveled = potentialMiles;
      game.car.fuel -= fuelNeeded;
    }
    game.car.miles += milesTraveled;
    game.car.tokenProgress += milesTraveled;
    if (milesTraveled > 0) {
      const envName = ENVIRONMENTS[game.car.environmentIndex].name;
      const chunks = Math.floor(milesTraveled / 10);
      for (let i = 0; i < chunks; i++) {
        const comment = getRandomEnvironmentComment(envName);
        if (comment) addLog(comment, "env");
      }
    }
    if (game.car.tokenProgress >= game.car.tokenThreshold) {
      const tokensGained = Math.floor(game.car.tokenProgress / game.car.tokenThreshold);
      game.car.techTokens += tokensGained;
      game.car.tokenProgress -= tokensGained * game.car.tokenThreshold;
    }
  }

  // ========== RESET GAME ==========
  function resetGame() {
    if (confirm("Are you sure you want to reset the game? This will clear all progress.")) {
      localStorage.removeItem("neonAetherSave");
      localStorage.removeItem("neonAetherHighScore");
      location.reload();
    }
  }

  // ========== EVENT LISTENERS ==========
  // Harvest Aether on click
  function harvestAether() {
    const amount = 1;
    game.aether += amount;
    game.totalAether += amount;
    game.stats.manualClicks += 1;
    updateDisplay();
    saveGame();
  }
  clickButton.removeEventListener("click", harvestAether);
  clickButton.addEventListener("click", harvestAether);

  // Return Home Button
  returnHomeButton.addEventListener("click", function() {
    if (game.car.miles === 0) {
      alert("You are already home!");
      return;
    }
    if (game.car.direction === 1) {
      game.car.direction = -1;
      showEventMessage("Car is returning home...");
      returnHomeButton.style.display = "none";
    }
  });

  // Start Journey Button – when clicked, if the car is at home, set miles to a tiny nonzero value and reset dropOffLogged flag
  startJourneyButton.addEventListener("click", function() {
    game.car.direction = 1;
    if (game.car.miles === 0) {
      game.car.miles = 0.01;
      dropOffLogged = false;
    }
    showEventMessage("Journey resumed.");
    startJourneyButton.style.display = "none";
    returnHomeButton.style.display = "inline-block";
  });

  // Fuel Car Button (fuel addition logs green message)
  fuelCarButton.addEventListener("click", function() {
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

  // Canvas click event for loot collection
  canvas.addEventListener("click", function(e) {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    // Loop through loot items
    for (let i = 0; i < game.roadLoot.length; i++) {
      const loot = game.roadLoot[i];
      let collected = false;
      if (loot.type === "aether_crystal") {
        const dx = clickX - loot.x;
        const dy = clickY - loot.y;
        if (Math.sqrt(dx * dx + dy * dy) < 20) { // increased threshold to 20 pixels
          collected = true;
        }
      } else if (loot.type === "computer_parts") {
        if (clickX >= loot.x - 20 && clickX <= loot.x + 20 &&
            clickY >= loot.y - 20 && clickY <= loot.y + 20) {
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

  // Shop and Upgrade Event Listeners
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

  // Paint and Research Event Listeners
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
  });

  // Inventory Overlay Functions (for the garage page)
  function updateInventoryOverlay() {
    inventoryGrid.innerHTML = "";
    // Use garage inventory for the garage page
    game.garage.forEach(itemObj => {
      const slotDiv = document.createElement("div");
      slotDiv.className = "inventory-slot";
      slotDiv.innerHTML = `<p>${itemObj.name}</p><button>Use</button>`;
      slotDiv.querySelector("button").addEventListener("click", () => {
        if (itemObj.type === "aether_crystal") {
          game.aether += itemObj.amount;
          alert(`Used ${itemObj.name}, gained ${itemObj.amount} Aether!`);
        } else if (itemObj.type === "computer_parts") {
          game.stats.hackingPoints += itemObj.amount;
          alert(`Used ${itemObj.name}, gained ${itemObj.amount} hacking points!`);
        }
        const index = game.garage.indexOf(itemObj);
        if (index > -1) game.garage.splice(index, 1);
        localStorage.setItem("neonAetherSave", JSON.stringify(game));
        updateInventoryOverlay();
      });
      inventoryGrid.appendChild(slotDiv);
    });
    const emptySlots = 24 - game.garage.length;
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

  // Reset Game Button
  resetGameButton.addEventListener("click", resetGame);

  // ========== INITIALIZATION ==========
  loadGame();
  loadExistingLog();
  if (offlineAetherGained > 0) {
    addLog(`Offline Gains: You earned ${formatNumber(offlineAetherGained)} Aether while away!`);
  }
  updateDisplay();
  requestAnimationFrame(gameLoop);
  setInterval(saveGame, 5000);
})();
