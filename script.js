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

  // Prevent logging multiple "ran out of fuel" messages
  let fuelRanOutLogged = false;

  // Format large numbers
  function formatNumber(num) {
    if (num < 1000) return num.toFixed(0); // Below 1,000, show full number

    const suffixes = ["K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
    let exponent = Math.floor(Math.log10(num) / 3); // Find the order of magnitude
    let mantissa = num / Math.pow(1000, exponent);  // Scale number down

    return mantissa.toFixed(2) + suffixes[exponent - 1]; // Attach correct suffix
  }

  // Utility function for positive modulus
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
  
  // custom alert message
  function showCustomAlert(msg) {
    // Grab the overlay and the message element
    const overlay = document.getElementById("customAlertOverlay");
    const messageElem = document.getElementById("customAlertMessage");
    // Set the text and display the overlay
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
    // Store colored log lines
    log: [],
    stats: { manualClicks: 0, autoClicks: 0, hackingPoints: 0 },
    trunk: { slots: 4, items: [] },
    garage: [],
    roadLoot: []
  };

  // Car object
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
    // direction: 1 => forward, -1 => returning home, 0 => stationary (at garage)
    direction: 1
  };

  // Car paint info
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

  // ========== HELPER FUNCTIONS ==========

  // Log functions store colored HTML snippets
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

  // Update trunk overlay (without a "Use" button)
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

  function drawBgItems() {
    const bgMultiplier = 1.5;
    const bgOffset = mod(game.car.environmentOffset * bgMultiplier, canvas.width);
    const env = ENVIRONMENTS[game.car.environmentIndex];

    ctx.fillStyle = "#000";
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
    } else if (env.name === "Neon City") {
      ctx.fillStyle = "#00ffff";
      ctx.fillRect(mod(50 - bgOffset, canvas.width), 100, 20, 40);
      ctx.fillRect(mod(200 - bgOffset, canvas.width), 80, 15, 50);
    } else if (env.name === "Digital Wasteland") {
      ctx.fillStyle = "#550000";
      ctx.fillRect(mod(100 - bgOffset, canvas.width), 150, 30, 10);
      ctx.fillRect(mod(300 - bgOffset, canvas.width), 140, 20, 10);
    }
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
      if (
        (game.car.direction === 1 && loot.x < -50) ||
        (game.car.direction === -1 && loot.x > canvas.width + 50)
      ) {
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

  // ========== UPDATE & DISPLAY ==========
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

  // ========== GAME LOOP ==========
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
      // do nothing
    } else if (game.car.direction === -1) {
      let effectiveSpeed = game.car.speed * game.car.tempSpeedModifier;
      const milesWanted = effectiveSpeed * deltaTime;
      const consumptionRate =
        game.car.baseFuelConsumption *
        (1 - game.car.efficiencyUpgrade.level * game.car.efficiencyUpgrade.efficiencyBonus);
      const milesPossible = consumptionRate > 0 ? (game.car.fuel / consumptionRate) : 0;
      let milesThisFrame = milesWanted;

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

      if (game.car.miles <= 0.01 && !dropOffLogged) {
        showEventMessage("Loot dropped off to the garage. Resuming journey automatically.", "fuelAdd");
        game.garage = game.garage.concat(game.trunk.items);
        game.trunk.items = [];
        dropOffLogged = true;
        game.car.miles = 0.01;
        game.car.direction = 1;
        startJourneyButton.style.display = "none";
        returnHomeButton.style.display = "inline-block";
      }
    } else if (game.car.direction === 1) {
      if (game.car.fuel > 0) {
        if (game.car.tempSpeedTimer > 0) {
          game.car.tempSpeedTimer -= deltaTime;
          if (game.car.tempSpeedTimer <= 0) {
            game.car.tempSpeedModifier = 1;
          }
        }
        let effectiveSpeed = game.car.speed * game.car.tempSpeedModifier;
        const currentWeather = WEATHERS[game.car.weatherIndex].name;
        if (currentWeather === "Rain" && !game.car.rainTyres) {
          effectiveSpeed *= 0.8;
        } else if (currentWeather === "Storm") {
          effectiveSpeed *= 0.7;
        }
        const consumptionRate =
          game.car.baseFuelConsumption *
          (1 - game.car.efficiencyUpgrade.level * game.car.efficiencyUpgrade.efficiencyBonus);
        const milesWanted = effectiveSpeed * deltaTime;
        const milesPossible = consumptionRate > 0 ? (game.car.fuel / consumptionRate) : 0;
        let milesThisFrame = milesWanted;
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

        if (game.car.miles === 0) {
          game.car.miles = 0.01;
          dropOffLogged = false;
        }

        game.car.miles += milesThisFrame;
        game.car.tokenProgress += milesThisFrame;

        if (Math.floor(game.car.miles / 50) !== Math.floor(lastEnvChangeMiles / 50)) {
          let newEnv;
          do {
            newEnv = Math.floor(Math.random() * ENVIRONMENTS.length);
          } while (newEnv === game.car.environmentIndex);
          game.car.environmentIndex = newEnv;
          lastEnvChangeMiles = Math.floor(game.car.miles);
          showEventMessage(`Environment changed to ${ENVIRONMENTS[newEnv].name}`);
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

        game.car.environmentOffset += milesThisFrame * 50;
        updateRoadLoot(deltaTime, milesThisFrame);
      }
    }

    checkCarRandomEvents(deltaTime);
    updateDisplay();
    drawCarCanvas();
    requestAnimationFrame(gameLoop);
  }

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

    // --- NEW: Offline Weather Progression ---
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

    // --- Offline Snow Stuck Timer Update ---
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

    // --- NEW: Offline Auto Clicker Progression ---
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

    // ---- New snippet: Disable research button if research is already in progress or completed ----
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
    const effectiveSpeed = game.car.speed;
    const consumptionRate =
      game.car.baseFuelConsumption *
      (1 - game.car.efficiencyUpgrade.level * game.car.efficiencyUpgrade.efficiencyBonus);
    const milesWanted = effectiveSpeed * offlineSeconds;
    const milesPossible = consumptionRate > 0 ? (game.car.fuel / consumptionRate) : 0;
    let milesTraveled = Math.min(milesWanted, milesPossible);
    if (milesTraveled < milesWanted && game.car.fuel > 0) {
      game.car.fuel = 0;
      addLog("Offline: The car <span class='log-negative'>runs out of fuel</span>.", "fuelOut");
    } else {
      game.car.fuel -= milesTraveled * consumptionRate;
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
    // ---- New section: Update stuck timer offline progress ----
    if (game.car.isStuck) {
      game.car.stuckTimer = Math.max(game.car.stuckTimer - offlineSeconds, 0);
      if (game.car.stuckTimer === 0) {
        game.car.isStuck = false;
      }
    }
  }

  // Helper function to force a full reload (cache-busting)
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

  // Research Countdown: Updates the Car Paint Job research timer display.
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

  // ========== EVENT LISTENERS ==========
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
          clickX >= loot.x - 25 && clickX <= loot.x + 25 &&
          clickY >= loot.y - 25 && clickY <= loot.y + 25
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
    // Check if research is already in progress or completed
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
    // Deduct the cost and start the research
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
    // Disable the button so it cannot be clicked again
    document.getElementById("carPaintJobButton").disabled = true;
  });

  // Hook up resetGame
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
})();
