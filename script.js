(function() {
  "use strict";

  // ========== ADDED MISSING CONFIGURATIONS ==========
  const WEATHERS = [
    { name: "Clear", effect: null },
    { name: "Rain", effect: "speed reduction" },
    { name: "Snow", effect: "stuck chance" },
    { name: "Storm", effect: "severe speed reduction" },
    { name: "Fog", effect: "visibility reduction" }
  ];

  const ENVIRONMENTS = [
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

  // ========== ADDED MISSING FUNCTION ==========
  function getRandomEnvironmentComment(envName) {
    const env = ENVIRONMENTS.find(e => e.name === envName);
    if (!env || !env.comments) return null;
    return env.comments[Math.floor(Math.random() * env.comments.length)];
  }

  // ========== NEW: DEFINE MISSING RANDOM EVENTS FUNCTION ==========
  function checkCarRandomEvents(deltaTime) {
    // Placeholder for future random events; currently, no events are implemented.
    return;
  }

  // ========== ORIGINAL GAME CODE ==========
  let globalTime = 0;
  let autoTickProgress = 0;
  let lastLootMile = 0;

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
      offlineAetherGained = 0,
      lastFrameTime = Date.now(),
      lastHighScoreLogged = 0,
      rainDrops = [],
      snowFlakes = [],
      lightningTimer = 0,
      lastEnvChangeMiles = 0;

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

  const returnHomeButton = document.getElementById("returnHomeButton");
  const startJourneyButton = document.getElementById("startJourneyButton");
  const carInventoryButton = document.getElementById("carInventoryButton");
  const resetGameButton = document.getElementById("resetGameButton");
  const prestigeButton = document.getElementById("prestigeButton");

  function addLog(message, type) {
    const timestamp = new Date().toLocaleTimeString();
    let spanClass = "";
    if (type === "lootSpawn") spanClass = "log-green";
    else if (type === "lootCollect") spanClass = "log-gold";
    let line = document.createElement("div");
    line.innerHTML = `[${timestamp}] <span class="${spanClass}">${message}</span>`;
    gameLogElem.appendChild(line);
    game.log.push(`[${timestamp}] ${message}`);
    setTimeout(() => { line.scrollIntoView({ behavior: "smooth", block: "end" }); }, 0);
  }

  function loadExistingLog() {
    gameLogElem.innerHTML = "";
    game.log.forEach(lineText => {
      let div = document.createElement("div");
      div.innerHTML = lineText;
      gameLogElem.appendChild(div);
    });
    setTimeout(() => {
      if (gameLogElem.lastElementChild) {
        gameLogElem.lastElementChild.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }, 0);
  }

  function formatNumber(num) {
    if (num < 1000) return num.toFixed(0);
    let exponent = Math.floor(Math.log10(num));
    let mantissa = num / Math.pow(10, exponent);
    return mantissa.toFixed(2) + "e" + exponent;
  }

  function showEventMessage(msg) {
    eventMessageElem.textContent = msg;
    setTimeout(() => { eventMessageElem.textContent = ""; }, 5000);
    addLog(msg);
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

    let autoProduction = game.autoClickers * (1 + game.upgrades.autoEfficiency.level * 0.1);
    autoClickerProductionElem.textContent = formatNumber(autoProduction);

    document.getElementById("autoClickerDetails").style.display = game.autoClickers > 0 ? "block" : "none";
  }

  function gameClick() {
    let amount = game.clickValue * game.clickMultiplier * game.prestige.multiplier;
    game.aether += amount;
    game.totalAether += amount;
    game.stats.manualClicks += 1;
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
      game.aether = 0;
      game.totalAether = 0;
      game.clickMultiplier = 1;
      game.autoClickers = 0;
      game.autoClickerCost = 50;
      game.upgrades.clickEfficiency.level = 0;
      game.upgrades.clickEfficiency.cost = 10;
      game.upgrades.autoEfficiency.level = 0;
      game.upgrades.autoEfficiency.cost = 100;
      showEventMessage(
        "Transcendence achieved! You gained " +
          gained +
          " Neon Core(s). Production multiplier is now " +
          game.prestige.multiplier.toFixed(2) +
          "x."
      );
    } else {
      alert("You need at least 1,000,000 total Aether to Transcend.");
    }
  }

  function fuelCar() {
    if (game.aether >= 10) {
      if (game.car.fuel <= 0) {
        addLog("You <span class='log-positive'>refuel</span> the car. The journey begins!");
      }
      game.aether -= 10;
      game.car.fuel = Math.min(game.car.fuel + 10, game.car.maxFuel);
    }
  }

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
      showEventMessage("Snow Tyres equipped! Car won't get stuck in snow.");
    }
  }

  function buyRainTyres() {
    if (!game.car.rainTyres && game.car.techTokens >= game.car.rainTyresCost) {
      game.car.techTokens -= game.car.rainTyresCost;
      game.car.rainTyres = true;
      showEventMessage("Rain Tyres equipped! Rain slowdown negated.");
    }
  }

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

  startJourneyButton.addEventListener("click", function() {
    game.car.direction = 1;
    showEventMessage("Journey resumed.");
    startJourneyButton.style.display = "none";
    returnHomeButton.style.display = "inline-block";
  });

  function updateInventoryOverlay() {
    inventoryGrid.innerHTML = "";
    inventoryCarColour.textContent = game.carPaint.color;
    game.trunk.items.forEach(itemObj => {
      let slotDiv = document.createElement("div");
      slotDiv.className = "inventory-slot";
      slotDiv.innerHTML = `<p>${itemObj.name}</p><p>(In Transit)</p>`;
      inventoryGrid.appendChild(slotDiv);
    });
    let emptySlots = game.trunk.slots - game.trunk.items.length;
    for (let s = 0; s < emptySlots; s++) {
      let slotDiv = document.createElement("div");
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

  function spawnLootForNewMile() {
    let type = Math.random() < 0.5 ? "aether_crystal" : "computer_parts";
    let newLoot = createLootObject(type);
    game.roadLoot.push(newLoot);
    addLog(`Loot spawned: ${newLoot.name} has appeared on the road!`, "lootSpawn");
  }

  function createLootObject(type) {
    let loot = {
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
      let loot = game.roadLoot[i];
      loot.x -= effectiveSpeed * deltaTime * 50;
      if (loot.x < -50) {
        game.roadLoot.splice(i, 1);
      }
    }
  }

  canvas.addEventListener("click", function(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    for (let i = 0; i < game.roadLoot.length; i++) {
      let loot = game.roadLoot[i];
      let dx = mouseX - loot.x;
      let dy = mouseY - loot.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 20) {
        if (game.trunk.items.length < game.trunk.slots) {
          game.trunk.items.push({ name: loot.name, type: loot.type, amount: loot.amount });
          addLog(`You picked up ${loot.name}.`, "lootCollect");
          game.roadLoot.splice(i, 1);
        } else {
          addLog("Your car inventory is full! Return home to drop off loot.");
        }
        break;
      }
    }
  });

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

  function drawEnvironment() {
    let env = ENVIRONMENTS[game.car.environmentIndex];
    const width = canvas.width, height = canvas.height;
    if (env.img) {
      let imgWidth = env.img.width;
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
    const width = canvas.width, height = canvas.height;
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

  function drawBgItems() {
    // Reserved for any additional background items.
  }

  function drawCarCanvas() {
    const width = canvas.width, height = canvas.height;
    drawEnvironment();
    drawBgItems();
    simulateWeather();

    const roadY = 160, roadHeight = 50;
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, roadY, width, roadHeight);

    drawLoot();

    let envName = ENVIRONMENTS[game.car.environmentIndex].name;
    let currentWeather = WEATHERS[game.car.weatherIndex].name;
    ctx.font = "16px Arial";
    let hudText = `Miles: ${formatNumber(game.car.miles)} | Env: ${envName} | Weather: ${currentWeather}`;
    let textWidth = ctx.measureText(hudText).width;
    ctx.fillStyle = "rgba(50,50,50,0.8)";
    ctx.fillRect(5, 5, textWidth + 10, 28);
    ctx.fillStyle = "#fff";
    ctx.fillText(hudText, 10, 26);

    let highScore = updatePersonalScore();
    let highScoreText = `High Score: ${formatNumber(highScore)} miles`;
    let hsTextWidth = ctx.measureText(highScoreText).width;
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

    let effectiveSpeed = game.car.speed * game.car.tempSpeedModifier;
    if (game.car.fuel <= 0) effectiveSpeed = 0;
    let bobbingOffset = effectiveSpeed !== 0 ? 2 * Math.sin(globalTime * 2 * Math.PI) : 0;

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

  function drawCar(x, y) {
    const bodyWidth = 60,
          bodyHeight = 20,
          cabinWidth = 30,
          cabinHeight = 15,
          wheelRadius = 6;
    if (game.carPaint.unlocked) {
      switch (game.carPaint.color) {
        case "Red": ctx.fillStyle = "#ff0000"; break;
        case "Blue": ctx.fillStyle = "#0000ff"; break;
        case "Green": ctx.fillStyle = "#00ff00"; break;
        case "Neon Pink": ctx.fillStyle = "#ff69b4"; break;
        default: ctx.fillStyle = "#00ffff"; break;
      }
    } else {
      ctx.fillStyle = "#00ffff";
    }
    ctx.fillRect(x, y - bodyHeight, bodyWidth, bodyHeight);
    ctx.fillStyle = "#008080";
    ctx.fillRect(x + 10, y - bodyHeight - cabinHeight, cabinWidth, cabinHeight);
    ctx.fillStyle = "#222";
    let frontWheelX = x + 15,
        frontWheelY = y;
    ctx.beginPath();
    ctx.arc(frontWheelX, frontWheelY, wheelRadius, 0, Math.PI * 2);
    ctx.fill();
    let wheelAngle = game.car.fuel > 0 ? globalTime * 5 : 0;
    ctx.strokeStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(frontWheelX, frontWheelY);
    ctx.lineTo(frontWheelX + wheelRadius * Math.cos(wheelAngle), frontWheelY + wheelRadius * Math.sin(wheelAngle));
    ctx.stroke();
    let rearWheelX = x + bodyWidth - 15,
        rearWheelY = y;
    ctx.beginPath();
    ctx.arc(rearWheelX, rearWheelY, wheelRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(rearWheelX, rearWheelY);
    ctx.lineTo(rearWheelX + wheelRadius * Math.cos(wheelAngle), rearWheelY + wheelRadius * Math.sin(wheelAngle));
    ctx.stroke();
  }

  function gameLoop() {
    let now = Date.now();
    let deltaTime = (now - lastFrameTime) / 1000;
    lastFrameTime = now;
    globalTime += deltaTime;

    if (game.car.direction === 1 && Math.floor(game.car.miles) > lastLootMile) {
      spawnLootForNewMile();
      lastLootMile = Math.floor(game.car.miles);
    }

    updateWeather(deltaTime);

    autoTickProgress += deltaTime;
    document.getElementById("autoClickerProgressBar").style.width = (Math.min(autoTickProgress, 1) * 100) + "%";
    while (autoTickProgress >= 1) {
      let productionPerClicker = 1 * (1 + game.upgrades.autoEfficiency.level * 0.1);
      let totalAuto = game.autoClickers * productionPerClicker;
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
      if (game.car.direction === -1) {
        let effectiveSpeed = game.car.speed * game.car.tempSpeedModifier;
        let currentWeather = WEATHERS[game.car.weatherIndex].name;
        if (currentWeather === "Rain" && !game.car.rainTyres) effectiveSpeed *= 0.8;
        else if (currentWeather === "Storm") effectiveSpeed *= 0.7;
        let milesThisFrame = effectiveSpeed * deltaTime;
        game.car.miles = Math.max(game.car.miles - milesThisFrame, 0);
        game.car.environmentOffset -= effectiveSpeed * deltaTime * 50;
        if (game.car.miles === 0) {
          showEventMessage("Loot dropped off to the garage.");
          game.garage = game.garage.concat(game.trunk.items);
          game.trunk.items = [];
          startJourneyButton.style.display = "inline-block";
          returnHomeButton.style.display = "none";
        }
      } else {
        if (game.car.fuel > 0) {
          if (game.car.tempSpeedTimer > 0) {
            game.car.tempSpeedTimer -= deltaTime;
            if (game.car.tempSpeedTimer <= 0) game.car.tempSpeedModifier = 1;
          }
          let effectiveSpeed = game.car.speed * game.car.tempSpeedModifier;
          let currentWeather = WEATHERS[game.car.weatherIndex].name;
          if (currentWeather === "Rain" && !game.car.rainTyres) effectiveSpeed *= 0.8;
          else if (currentWeather === "Storm") effectiveSpeed *= 0.7;
          let milesThisFrame = effectiveSpeed * deltaTime;
          let effectiveConsumption = game.car.baseFuelConsumption *
                                   (1 - game.car.efficiencyUpgrade.level * game.car.efficiencyUpgrade.efficiencyBonus);
          let fuelConsumed = milesThisFrame * effectiveConsumption;
          if (fuelConsumed > game.car.fuel) {
            milesThisFrame = game.car.fuel / effectiveConsumption;
            fuelConsumed = game.car.fuel;
            game.car.fuel = 0;
            addLog("The car <span class='log-negative'>runs out of fuel</span> mid-journey!");
          } else {
            game.car.fuel -= fuelConsumed;
          }
          game.car.miles += milesThisFrame;
          game.car.tokenProgress += milesThisFrame;
          if (game.car.miles - lastEnvChangeMiles >= 50) {
            let newEnv;
            do { newEnv = Math.floor(Math.random() * ENVIRONMENTS.length); }
            while (newEnv === game.car.environmentIndex);
            game.car.environmentIndex = newEnv;
            lastEnvChangeMiles = game.car.miles;
            showEventMessage("Environment changed to " + ENVIRONMENTS[newEnv].name);
            let comment = getRandomEnvironmentComment(ENVIRONMENTS[newEnv].name);
            if (comment) addLog(comment);
          }
          if (Math.random() < 0.02 * milesThisFrame) {
            let envName = ENVIRONMENTS[game.car.environmentIndex].name;
            let comment = getRandomEnvironmentComment(envName);
            if (comment) addLog(comment);
          }
          if (game.car.tokenProgress >= game.car.tokenThreshold) {
            let tokensGained = Math.floor(game.car.tokenProgress / game.car.tokenThreshold);
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

  function saveGame() {
    game.lastUpdate = Date.now();
    localStorage.setItem("neonAetherSave", JSON.stringify(game));
  }

  function loadGame() {
    let savedGame = localStorage.getItem("neonAetherSave");
    if (savedGame) {
      try {
        let loaded = JSON.parse(savedGame);
        Object.assign(game, loaded);
        if (loaded.car) Object.assign(game.car, loaded.car);
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
      let autoProduction = game.autoClickers * 1 * (1 + game.upgrades.autoEfficiency.level * 0.1) * game.prestige.multiplier;
      let produced = autoProduction * offlineSeconds;
      offlineAetherGained = produced;
      game.aether += produced;
      game.totalAether += produced;
      applyCarOfflineProgress(offlineSeconds);
      game.lastUpdate = now;
      let storedHS = localStorage.getItem("neonAetherHighScore");
      if (storedHS) lastHighScoreLogged = Math.floor(parseFloat(storedHS));
    } else {
      game.car.weatherIndex = Math.floor(Math.random() * WEATHERS.length);
      game.car.environmentIndex = Math.floor(Math.random() * ENVIRONMENTS.length);
      addLog("New game started. The journey begins.");
    }
  }

  function applyCarOfflineProgress(offlineSeconds) {
    let effectiveSpeed = game.car.speed;
    let effectiveConsumption = game.car.baseFuelConsumption *
      (1 - game.car.efficiencyUpgrade.level * game.car.efficiencyUpgrade.efficiencyBonus);
    let potentialMiles = effectiveSpeed * offlineSeconds;
    let fuelNeeded = potentialMiles * effectiveConsumption;
    let milesTraveled = 0;
    if (fuelNeeded > game.car.fuel) {
      let travelTime = game.car.fuel / (effectiveConsumption * effectiveSpeed);
      milesTraveled = effectiveSpeed * travelTime;
      game.car.fuel = 0;
      addLog("Offline: The car <span class='log-negative'>runs out of fuel</span>.");
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

  function resetGame() {
    if (confirm("Are you sure you want to reset the game? This will clear all progress.")) {
      localStorage.removeItem("neonAetherSave");
      localStorage.removeItem("neonAetherHighScore");
      location.reload();
    }
  }

  // ========== EVENT LISTENERS ==========
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
