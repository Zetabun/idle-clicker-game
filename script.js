(function() {
  "use strict";

  // Global variables for animation and auto-tick progress
  let globalTime = 0;
  let autoTickProgress = 0;  // Accumulates seconds until next auto-click tick
  let lastLootMile = 0;      // Last mile at which loot was spawned

  // New car direction: 1 for outbound, -1 for returning home.
  // Initially, car is on an outbound journey.
  gameInit();
  function gameInit() {
    // Initialize car direction to outbound.
    game.car.direction = 1;
    // Initialize garage storage array.
    game.garage = [];
  }

  // Helper: Event log with colored text based on type.
  function addLog(message, type) {
    // type can be "lootSpawn" (green), "lootCollect" (gold) or undefined (default)
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

  // Helper functions for environment comments and random events
  function getRandomEnvironmentComment(envName) {
    const comments = {
      "Forest": ["The forest is alive with mystery.", "Birds chirp softly in the woods."],
      "Desert": ["The desert is vast and unforgiving.", "The heat blurs the horizon."],
      "City": ["The city pulses with energy.", "Bright neon lights guide your way."],
      "Mountains": ["The mountains stand majestic and tall.", "The crisp air invigorates you."],
      "Beach": ["The sound of waves calms your mind.", "The salty breeze refreshes you."]
    };
    let arr = comments[envName];
    return (arr && arr.length > 0) ? arr[Math.floor(Math.random() * arr.length)] : "";
  }
  function checkCarRandomEvents(deltaTime) {
    // Placeholder for any additional random events.
  }

  // Data & Initialization
  const ENVIRONMENTS = [
    { name: "Forest",    imageSrc: "images/forest.png",    img: null, fallbackColor: "#228B22" },
    { name: "Desert",    imageSrc: "images/desert.png",    img: null, fallbackColor: "#EDC9AF" },
    { name: "City",      imageSrc: "images/city.png",      img: null, fallbackColor: "#777" },
    { name: "Mountains", imageSrc: "images/mountains.png", img: null, fallbackColor: "#708090" },
    { name: "Beach",     imageSrc: "images/beach.png",     img: null, fallbackColor: "#F4A460" }
  ];
  const WEATHERS = [
    { name: "Clear", imageSrc: "",            img: null, alpha: 0 },
    { name: "Rain",  imageSrc: "images/rain.png",  img: null, alpha: 0.3 },
    { name: "Snow",  imageSrc: "images/snow.png",  img: null, alpha: 0.3 },
    { name: "Fog",   imageSrc: "images/fog.png",   img: null, alpha: 0.2 },
    { name: "Storm", imageSrc: "images/storm.png", img: null, alpha: 0.4 }
  ];

  // Main game object
  let game = {
    aether: 0,
    totalAether: 0,
    clickValue: 1,
    clickMultiplier: 1,
    autoClickers: 0,
    autoClickerCost: 50,
    autoClickerBaseProduction: 1, // Each auto-clicker gives 1 aether per tick (before efficiency)
    upgrades: {
      clickEfficiency: { level: 0, cost: 10, costMultiplier: 1.5 },
      autoEfficiency: { level: 0, cost: 100, costMultiplier: 1.7 }
    },
    prestige: { count: 0, neonCores: 0, multiplier: 1 },
    lastUpdate: Date.now(),
    log: [],
    stats: { manualClicks: 0, autoClicks: 0, hackingPoints: 0 },
    trunk: { slots: 5, items: [] }, // Temporary car inventory
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
    direction: 1  // 1 = outbound, -1 = returning home
  };
  game.carPaint = { unlocked: false, color: "Default" };

  let weatherTimer = 0, snowStuckTimer = 0;
  let offlineAetherGained = 0, lastFrameTime = Date.now(), lastHighScoreLogged = 0;
  let rainDrops = [], snowFlakes = [], lightningTimer = 0;

  // DOM References
  const aetherAmountElem = document.getElementById("statsAether");
  const neonCoresElem = document.getElementById("statsNeonCores");
  const prestigeCountElem = document.getElementById("statsPrestigeCount");
  const clickUpgradeCostElem = document.getElementById("clickUpgradeCost");
  const clickUpgradeLevelElem = document.getElementById("clickUpgradeLevel");
  const autoClickerCostElem = document.getElementById("autoClickerCost");
  const autoClickerCountElem = document.getElementById("autoClickerCount");
  const autoEfficiencyCostElem = document.getElementById("autoEfficiencyCost");
  const autoEfficiencyLevelElem = document.getElementById("autoEfficiencyLevel");
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
  const carInventoryButton = document.getElementById("carInventoryButton");
  const returnHomeButton = document.getElementById("returnHomeButton");
  const startJourneyButton = document.getElementById("startJourneyButton");
  const garageButton = document.getElementById("garageButton");

  // IMAGE LOADING
  function loadAllImages() {
    ENVIRONMENTS.forEach(env => {
      if (!env.imageSrc) return;
      let img = new Image();
      img.src = env.imageSrc;
      img.onload = () => { env.img = img; };
      img.onerror = () => { env.img = null; };
    });
    WEATHERS.forEach(weather => {
      if (!weather.imageSrc) return;
      let wimg = new Image();
      wimg.src = weather.imageSrc;
      wimg.onload = () => { weather.img = wimg; };
      wimg.onerror = () => { weather.img = null; };
    });
  }
  loadAllImages();

  // LOGGING FUNCTIONS
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

  // DISPLAY & UPGRADES
  function updateDisplay() {
    aetherAmountElem.textContent = formatNumber(game.aether);
    neonCoresElem.textContent = game.prestige.neonCores;
    prestigeCountElem.textContent = game.prestige.count;
    if (clickUpgradeCostElem) clickUpgradeCostElem.textContent = game.upgrades.clickEfficiency.cost;
    if (clickUpgradeLevelElem) clickUpgradeLevelElem.textContent = game.upgrades.clickEfficiency.level;
    if (autoClickerCostElem) autoClickerCostElem.textContent = game.autoClickerCost;
    if (autoClickerCountElem) autoClickerCountElem.textContent = game.autoClickers;
    if (autoEfficiencyCostElem) autoEfficiencyCostElem.textContent = game.upgrades.autoEfficiency.cost;
    if (autoEfficiencyLevelElem) autoEfficiencyLevelElem.textContent = game.upgrades.autoEfficiency.level;

    carFuelElem.textContent = Math.floor(game.car.fuel);
    carMaxFuelElem.textContent = game.car.maxFuel;
    carMilesElem.textContent = formatNumber(game.car.miles);
    techTokensElem.textContent = game.car.techTokens;

    statsMilesElem.textContent = formatNumber(game.car.miles);
    statsManualClicksElem.textContent = game.stats.manualClicks;
    statsAutoClicksElem.textContent = formatNumber(game.stats.autoClicks);
    statsHackingPointsElem.textContent = formatNumber(game.stats.hackingPoints);

    // Update auto-clicker production: each auto-clicker produces 1 aether per tick, modified by efficiency.
    if (autoClickerProductionElem) {
      let autoProduction = game.autoClickers * (1 + game.upgrades.autoEfficiency.level * 0.1);
      autoClickerProductionElem.textContent = formatNumber(autoProduction);
    }
    // Show progress bar if auto-clickers exist
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

  // CAR FUNCTIONS
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

  // AUTO CLICKER SIMULATION integrated into game loop:
  // autoTickProgress accumulates time; every full second, each auto-clicker produces 1 aether (modified by efficiency)
  // and the auto-click stat increases by 1 per auto-clicker.
  // The progress bar width is updated accordingly.
  
  // ROAD LOOT & CANVAS INTERACTION
  // Instead of random spawn timing, loot spawns each time a new whole mile is reached.
  function spawnLootForNewMile() {
    let type = Math.random() < 0.5 ? "aether_crystal" : "computer_parts";
    let newLoot = createLootObject(type);
    game.roadLoot.push(newLoot);
    addLog(`Loot spawned: ${newLoot.name} has appeared on the road!`, "lootSpawn");
  }
  // Loot spawns at a random vertical position along the road (y between 160 and 210)
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
        // Use a bright magenta so it contrasts with the road.
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
      if (loot.x < -50) { game.roadLoot.splice(i, 1); }
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
        // When collected, log in gold.
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

  // For car inventory (trunk), remove the "Use" option.
  function updateInventoryOverlay() {
    inventoryGrid.innerHTML = "";
    inventoryCarColour.textContent = game.carPaint.color;
    // Simply list items (non-usable) in trunk
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

  // NEW: Return Home and Start Journey functionality.
  // When Return Home is clicked, set car direction to -1.
  returnHomeButton.addEventListener("click", function() {
    if (game.car.direction === 1) {
      game.car.direction = -1;
      showEventMessage("Car is returning home...");
      returnHomeButton.style.display = "none";
    }
  });
  // When Start Journey is clicked, set car direction to 1.
  startJourneyButton.addEventListener("click", function() {
    game.car.direction = 1;
    showEventMessage("Journey resumed.");
    startJourneyButton.style.display = "none";
    returnHomeButton.style.display = "inline-block";
  });
  // Garage button navigates to inventory.html (the permanent storage)
  garageButton.addEventListener("click", function() {
    window.location.href = "inventory.html";
  });

  // WEATHER & ENVIRONMENT
  function updateWeather(deltaTime) {
    weatherTimer += deltaTime;
    if (weatherTimer >= 60) {
      if (Math.random() < 0.1) {
        let newIndex;
        do { newIndex = Math.floor(Math.random() * WEATHERS.length); }
        while (newIndex === game.car.weatherIndex);
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
    } else { snowStuckTimer = 0; }
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
        if (lightningTimer <= 0 && Math.random() < 0.005) { lightningTimer = 0.1; }
        if (lightningTimer > 0) {
          ctx.fillStyle = "rgba(255,255,255," + (lightningTimer * 7) + ")";
          ctx.fillRect(0, 0, width, height);
          lightningTimer -= 1 / 60;
        }
      }
    } else { rainDrops = []; }
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
    } else { snowFlakes = []; }
    if (currentWeather === "Fog") {
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillRect(0, 0, width, height);
    }
  }
  function drawBgItems() { /* Reserved for additional background items */ }
  function drawCarCanvas() {
    const width = canvas.width, height = canvas.height;
    drawEnvironment();
    drawBgItems();
    simulateWeather();
    const roadY = 160, roadHeight = 50;
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, roadY, width, roadHeight);
    drawLoot();
    const envName = ENVIRONMENTS[game.car.environmentIndex].name;
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

    weatherNotificationElem.textContent = (currentWeather === "Rain" && !game.car.rainTyres)
      ? "Rain slowing you down (20% reduction)."
      : (currentWeather === "Storm" ? (game.car.rainTyres ? "Storm overhead, be cautious!" : "Storm slowing you down (30% reduction).") : "");
    stuckNotificationElem.textContent = game.car.isStuck ? `Car is stuck in the snow. Time until unstuck: ${Math.ceil(game.car.stuckTimer)} sec.` : "";

    let effectiveSpeed = game.car.speed * game.car.tempSpeedModifier;
    // Adjust speed based on weather
    if (currentWeather === "Rain" && !game.car.rainTyres) { effectiveSpeed *= 0.8; }
    else if (currentWeather === "Storm") { effectiveSpeed *= 0.7; }
    if (game.car.fuel <= 0) { effectiveSpeed = 0; }
    
    // Reverse direction if returning home
    effectiveSpeed *= game.car.direction;
    
    // Bobbing effect remains unaffected
    let bobbingOffset = effectiveSpeed !== 0 ? 2 * Math.sin(globalTime * 2 * Math.PI) : 0;
    
    // Draw the car. If returning home, flip horizontally.
    const carX = canvas.width * 0.1;
    const carY = roadY + 25 + bobbingOffset;
    ctx.save();
    if (game.car.direction === -1) {
      // Flip horizontally around the car's x-position
      ctx.translate(carX + 30, 0);
      ctx.scale(-1, 1);
      drawCar(0, carY);
    } else {
      drawCar(carX, carY);
    }
    ctx.restore();
  }
  function drawCar(x, y) {
    const bodyWidth = 60, bodyHeight = 20, cabinWidth = 30, cabinHeight = 15, wheelRadius = 6;
    if (game.carPaint.unlocked) {
      switch (game.carPaint.color) {
        case "Red": ctx.fillStyle = "#ff0000"; break;
        case "Blue": ctx.fillStyle = "#0000ff"; break;
        case "Green": ctx.fillStyle = "#00ff00"; break;
        case "Neon Pink": ctx.fillStyle = "#ff69b4"; break;
        default: ctx.fillStyle = "#00ffff"; break;
      }
    } else { ctx.fillStyle = "#00ffff"; }
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

  // MAIN GAME LOOP
  function gameLoop() {
    let now = Date.now();
    let deltaTime = (now - lastFrameTime) / 1000;
    lastFrameTime = now;
    globalTime += deltaTime;

    // Spawn loot every time a new whole mile is reached (only when going outbound)
    if (game.car.direction === 1 && Math.floor(game.car.miles) > lastLootMile) {
      spawnLootForNewMile();
      lastLootMile = Math.floor(game.car.miles);
    }

    updateWeather(deltaTime);

    // AUTO CLICKER SIMULATION via autoTickProgress:
    autoTickProgress += deltaTime;
    document.getElementById("autoClickerProgressBar").style.width = (Math.min(autoTickProgress, 1) * 100) + "%";
    while (autoTickProgress >= 1) {
      let productionPerClick = 1 * (1 + game.upgrades.autoEfficiency.level * 0.1);
      let totalAuto = game.autoClickers * productionPerClick;
      game.aether += totalAuto;
      game.totalAether += totalAuto;
      game.stats.autoClicks += game.autoClickers;
      autoTickProgress -= 1;
    }

    // If car is returning home, subtract miles instead of adding
    if (game.car.direction === -1) {
      // Move car toward home
      let effectiveSpeed = game.car.speed * game.car.tempSpeedModifier;
      let currentWeather = WEATHERS[game.car.weatherIndex].name;
      if (currentWeather === "Rain" && !game.car.rainTyres) { effectiveSpeed *= 0.8; }
      else if (currentWeather === "Storm") { effectiveSpeed *= 0.7; }
      let milesThisFrame = effectiveSpeed * deltaTime;
      // Subtract miles (but not below 0)
      game.car.miles = Math.max(game.car.miles - milesThisFrame, 0);
      // Reverse environment offset
      game.car.environmentOffset -= effectiveSpeed * deltaTime * 50;
      // When miles reach 0, drop off loot:
      if (game.car.miles === 0) {
        showEventMessage("Loot dropped off to the garage.");
        // Transfer trunk items to garage storage
        game.garage = game.garage.concat(game.trunk.items);
        game.trunk.items = [];
        // Show Start Journey button; hide Return Home button.
        startJourneyButton.style.display = "inline-block";
        returnHomeButton.style.display = "none";
      }
    } else {
      // Outbound journey
      if (game.car.fuel > 0) {
        if (game.car.tempSpeedTimer > 0) {
          game.car.tempSpeedTimer -= deltaTime;
          if (game.car.tempSpeedTimer <= 0) { game.car.tempSpeedModifier = 1; }
        }
        let effectiveSpeed = game.car.speed * game.car.tempSpeedModifier;
        let currentWeather = WEATHERS[game.car.weatherIndex].name;
        if (currentWeather === "Rain" && !game.car.rainTyres) { effectiveSpeed *= 0.8; }
        else if (currentWeather === "Storm") { effectiveSpeed *= 0.7; }
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
        if (loaded.log && Array.isArray(loaded.log)) { game.log = loaded.log; }
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
      if (storedHS) { lastHighScoreLogged = Math.floor(parseFloat(storedHS)); }
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

  // EVENT LISTENERS
  document.getElementById("clickButton").addEventListener("click", gameClick);
  document.getElementById("buyClickUpgradeButton").addEventListener("click", buyClickUpgrade);
  document.getElementById("buyAutoClickerButton").addEventListener("click", buyAutoClicker);
  document.getElementById("buyAutoEfficiencyButton").addEventListener("click", buyAutoEfficiency);
  document.getElementById("prestigeButton").addEventListener("click", prestige);
  document.getElementById("fuelCarButton").addEventListener("click", fuelCar);
  document.getElementById("buyEngineUpgradeButton").addEventListener("click", buyEngineUpgrade);
  document.getElementById("buyEfficiencyUpgradeButton").addEventListener("click", buyEfficiencyUpgrade);
  document.getElementById("buyTankUpgradeButton").addEventListener("click", buyTankUpgrade);
  document.getElementById("buySnowTyresButton").addEventListener("click", buySnowTyres);
  document.getElementById("buyRainTyresButton").addEventListener("click", buyRainTyres);
  document.getElementById("resetGameButton").addEventListener("click", resetGame);
  if (carInventoryButton) { carInventoryButton.addEventListener("click", openInventoryOverlay); }
  if (closeInventory) { closeInventory.addEventListener("click", closeInventoryOverlay); }
  window.addEventListener("click", function(e) {
    if (e.target === inventoryOverlay) { inventoryOverlay.style.display = "none"; }
  });

  // Shop Section Event Listeners (front–page shop)
  document.getElementById("shopBuyClickUpgradeButton").addEventListener("click", function() {
    buyClickUpgrade();
  });
  document.getElementById("shopBuyAutoClickerButton").addEventListener("click", function() {
    buyAutoClicker();
  });
  document.getElementById("shopBuyAutoEfficiencyButton").addEventListener("click", function() {
    buyAutoEfficiency();
  });
  document.getElementById("shopBuyEngineUpgradeButton").addEventListener("click", function() {
    buyEngineUpgrade();
  });
  document.getElementById("shopBuyEfficiencyUpgradeButton").addEventListener("click", function() {
    buyEfficiencyUpgrade();
  });
  document.getElementById("shopBuyTankUpgradeButton").addEventListener("click", function() {
    buyTankUpgrade();
  });
  document.getElementById("shopBuySnowTyresButton").addEventListener("click", function() {
    buySnowTyres();
  });
  document.getElementById("shopBuyRainTyresButton").addEventListener("click", function() {
    buyRainTyres();
  });
  document.getElementById("shopBuyRedPaintButton").addEventListener("click", function() {
    const cost = 200;
    if (!game.carPaint.unlocked) { alert("You must complete the Car Paint Job research first!"); return; }
    if (game.aether < cost) { alert("Not enough Aether!"); return; }
    game.aether -= cost;
    game.carPaint.color = "Red";
    updateDisplay();
    saveGame();
    alert("Your car is now Red!");
  });
  document.getElementById("shopBuyBluePaintButton").addEventListener("click", function() {
    const cost = 200;
    if (!game.carPaint.unlocked) { alert("You must complete the Car Paint Job research first!"); return; }
    if (game.aether < cost) { alert("Not enough Aether!"); return; }
    game.aether -= cost;
    game.carPaint.color = "Blue";
    updateDisplay();
    saveGame();
    alert("Your car is now Blue!");
  });
  document.getElementById("shopBuyGreenPaintButton").addEventListener("click", function() {
    const cost = 200;
    if (!game.carPaint.unlocked) { alert("You must complete the Car Paint Job research first!"); return; }
    if (game.aether < cost) { alert("Not enough Aether!"); return; }
    game.aether -= cost;
    game.carPaint.color = "Green";
    updateDisplay();
    saveGame();
    alert("Your car is now Green!");
  });
  document.getElementById("shopBuyPinkPaintButton").addEventListener("click", function() {
    const cost = 500;
    if (!game.carPaint.unlocked) { alert("You must complete the Car Paint Job research first!"); return; }
    if (game.aether < cost) { alert("Not enough Aether!"); return; }
    game.aether -= cost;
    game.carPaint.color = "Neon Pink";
    updateDisplay();
    saveGame();
    alert("Your car is now Neon Pink!");
  });
  // Research Section Event Listener
  document.getElementById("carPaintJobButton").addEventListener("click", function() {
    if (game.aether < 1000) { alert("Not enough Aether!"); return; }
    if (game.car.miles < 10) { alert("You need at least 10 miles to start this research."); return; }
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

  // MAIN LOOP INIT
  loadGame();
  loadExistingLog();
  if (offlineAetherGained > 0) {
    addLog(`Offline Gains: You earned ${formatNumber(offlineAetherGained)} Aether while away!`);
  }
  updateDisplay();
  requestAnimationFrame(gameLoop);
  setInterval(saveGame, 5000);
})();
