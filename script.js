document.addEventListener("DOMContentLoaded", function () {
  (function () {
    "use strict";

    console.log("Starting Neon Aether game...");

    /********************************************************************
     * FULL CONSOLIDATED SCRIPT.JS
     * Features:
     *  - Environment only randomizes on new game (and then changes every 50 miles)
     *  - Offline progress is simulated in small chunks so we can log events
     *  - Journey events (starting movement after refuel, running out of fuel, environment changes, commentary) are logged with timestamps
     ********************************************************************/

    /* =========================
       GAME STATE & SETTINGS
    ========================= */
    let game = {
      // Idle / Clicker
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
      lastUpdate: Date.now()
    };

    // Car simulation & environment data
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
      environmentOffset: 0
    };

    // For environment changes every 50 miles and commentary every 30 miles:
    let lastEnvChangeMiles = 0;
    let lastEnvCommentMiles = 0;
    const ENV_COMMENT_INTERVAL = 30;

    // Offline progress display
    let offlineAetherGained = 0;

    // For auto tick progress (for auto clicker details)
    let autoTickProgress = 0;

    /* =========================
       TIMERS FOR WEATHER & SNOW STUCK
    ========================= */
    let weatherTimer = 0;
    let snowStuckTimer = 0;

    /* =========================
       ENVIRONMENTS & WEATHERS
    ========================= */
    const ENVIRONMENTS = [
      { name: "Forest",    imageSrc: "images/forest.png",    img: null, fallbackColor: "#228B22" },
      { name: "Desert",    imageSrc: "images/desert.png",    img: null, fallbackColor: "#EDC9AF" },
      { name: "City",      imageSrc: "images/city.png",      img: null, fallbackColor: "#777" },
      { name: "Mountains", imageSrc: "images/mountains.png", img: null, fallbackColor: "#708090" },
      { name: "Beach",     imageSrc: "images/beach.png",     img: null, fallbackColor: "#F4A460" }
    ];

    const WEATHERS = [
      { name: "Clear", imageSrc: "",            img: null, alpha: 0.0 },
      { name: "Rain",  imageSrc: "images/rain.png",  img: null, alpha: 0.3 },
      { name: "Snow",  imageSrc: "images/snow.png",  img: null, alpha: 0.3 },
      { name: "Fog",   imageSrc: "images/fog.png",   img: null, alpha: 0.2 },
      { name: "Storm", imageSrc: "images/storm.png", img: null, alpha: 0.4 }
    ];

    // Environment commentary
    const ENV_COMMENTS = {
      "Forest": [
        "The trees whisper in the breeze.",
        "A fox darts between the pines.",
        "Birds chirp melodiously in the forest."
      ],
      "Desert": [
        "The sun beats down mercilessly.",
        "A lone cactus stands resilient under the blazing sun.",
        "The shifting dunes create ever-changing patterns."
      ],
      "City": [
        "Neon signs flicker among towering skyscrapers.",
        "The bustling streets hum with activity.",
        "City lights reflect off wet pavement in the night."
      ],
      "Mountains": [
        "Snow-capped peaks loom in the distance.",
        "The crisp mountain air fills your lungs.",
        "A distant rumble hints at an avalanche."
      ],
      "Beach": [
        "Waves crash along the sandy shore.",
        "A salty breeze refreshes you as you drive.",
        "Seagulls cry overhead while the tide rolls in."
      ]
    };

    /* =========================
       BACKGROUND ITEMS
    ========================= */
    let bgItems = [];

    function spawnBgItem() {
      const envName = ENVIRONMENTS[game.car.environmentIndex].name;
      const canvasWidth = canvas.width;
      let yPos = 80 + Math.random() * 60;
      if (envName === "Forest") {
        if (Math.random() < 0.7) {
          return { type: "tree", x: canvasWidth + Math.random() * 100, y: yPos, width: 20, height: 40, speedFactor: 0.6 };
        } else {
          return { type: "bush", x: canvasWidth + Math.random() * 100, y: yPos + 20, width: 25, height: 15, speedFactor: 0.5 };
        }
      } else if (envName === "Desert") {
        return { type: "cactus", x: canvasWidth + Math.random() * 100, y: yPos, width: 15, height: 35, speedFactor: 0.6 };
      } else if (envName === "City") {
        return { type: "building", x: canvasWidth + Math.random() * 150, y: 30 + Math.random() * 30, width: 50 + Math.random() * 50, height: 100 + Math.random() * 50, speedFactor: 0.8 };
      } else if (envName === "Mountains") {
        if (Math.random() < 0.6) {
          return { type: "pine", x: canvasWidth + Math.random() * 100, y: yPos, width: 15, height: 35, speedFactor: 0.7 };
        } else {
          return { type: "rock", x: canvasWidth + Math.random() * 100, y: yPos + 10, width: 20, height: 15, speedFactor: 0.5 };
        }
      } else if (envName === "Beach") {
        if (Math.random() < 0.5) {
          return { type: "palm", x: canvasWidth + Math.random() * 100, y: yPos, width: 20, height: 40, speedFactor: 0.6 };
        } else {
          return { type: "bush", x: canvasWidth + Math.random() * 100, y: yPos + 20, width: 25, height: 15, speedFactor: 0.5 };
        }
      }
      return null;
    }

    function updateBgItems(deltaTime, effectiveSpeed) {
      for (let i = bgItems.length - 1; i >= 0; i--) {
        let item = bgItems[i];
        item.x -= effectiveSpeed * deltaTime * item.speedFactor;
        if (item.x + item.width < 0) {
          bgItems.splice(i, 1);
        }
      }
      if (bgItems.length < 5) {
        let newItem = spawnBgItem();
        if (newItem) bgItems.push(newItem);
      }
    }

    function drawBgItems() {
      for (let item of bgItems) {
        ctx.save();
        if (item.type === "tree") {
          ctx.fillStyle = "#0a8f0a";
          ctx.beginPath();
          ctx.moveTo(item.x + item.width / 2, item.y - item.height);
          ctx.lineTo(item.x, item.y);
          ctx.lineTo(item.x + item.width, item.y);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#8B4513";
          ctx.fillRect(item.x + item.width / 2 - 3, item.y, 6, 10);
        } else if (item.type === "bush") {
          ctx.fillStyle = "#228B22";
          ctx.beginPath();
          ctx.arc(item.x + item.width / 2, item.y, item.height / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (item.type === "cactus") {
          ctx.fillStyle = "#006400";
          ctx.fillRect(item.x, item.y - item.height, item.width, item.height);
        } else if (item.type === "building") {
          ctx.fillStyle = "#444";
          ctx.fillRect(item.x, canvas.height - item.height - 50, item.width, item.height);
          ctx.fillStyle = "#ffd700";
          for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 2; j++) {
              ctx.fillRect(item.x + 5 + j * 20, canvas.height - item.height - 50 + 10 + i * 25, 10, 15);
            }
          }
        } else if (item.type === "pine") {
          ctx.fillStyle = "#2E8B57";
          ctx.beginPath();
          ctx.moveTo(item.x + item.width / 2, item.y - item.height);
          ctx.lineTo(item.x, item.y);
          ctx.lineTo(item.x + item.width, item.y);
          ctx.closePath();
          ctx.fill();
        } else if (item.type === "rock") {
          ctx.fillStyle = "#696969";
          ctx.beginPath();
          ctx.ellipse(item.x + item.width / 2, item.y - item.height / 2, item.width / 2, item.height / 2, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (item.type === "palm") {
          ctx.fillStyle = "#8B4513";
          ctx.fillRect(item.x + item.width / 2 - 2, item.y - item.height, 4, item.height);
          ctx.fillStyle = "#228B22";
          ctx.beginPath();
          ctx.arc(item.x + item.width / 2, item.y - item.height, item.width, 0, Math.PI, true);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    /* =========================
       GLOBAL ANIMATION VARIABLE
    ========================= */
    let globalTime = 0;

    /* =========================
       RAIN / SNOW ARRAYS
    ========================= */
    let rainDrops = [];
    let snowFlakes = [];
    let lightningTimer = 0;

    /* =========================
       DOM ELEMENTS
    ========================= */
    const aetherAmountElem = document.getElementById("aetherAmount");
    const neonCoresElem = document.getElementById("neonCores");
    const prestigeCountElem = document.getElementById("prestigeCount");
    const clickUpgradeCostElem = document.getElementById("clickUpgradeCost");
    const clickUpgradeLevelElem = document.getElementById("clickUpgradeLevel");
    const autoClickerCostElem = document.getElementById("autoClickerCost");
    const autoClickerCountElem = document.getElementById("autoClickerCount");
    const autoEfficiencyCostElem = document.getElementById("autoEfficiencyCost");
    const autoEfficiencyLevelElem = document.getElementById("autoEfficiencyLevel");
    const offlineInfoElem = document.getElementById("offlineInfo");

    const carFuelElem = document.getElementById("carFuel");
    const carMaxFuelElem = document.getElementById("carMaxFuel");
    const carMilesElem = document.getElementById("carMiles");
    const techTokensElem = document.getElementById("techTokens");
    const eventMessageElem = document.getElementById("eventMessage");
    const weatherNotificationElem = document.getElementById("weatherNotification");
    const stuckNotificationElem = document.getElementById("stuckNotification");

    const engineUpgradeCostElem = document.getElementById("engineUpgradeCost");
    const engineUpgradeLevelElem = document.getElementById("engineUpgradeLevel");
    const efficiencyUpgradeCostElem = document.getElementById("efficiencyUpgradeCost");
    const efficiencyUpgradeLevelElem = document.getElementById("efficiencyUpgradeLevel");
    const tankUpgradeCostElem = document.getElementById("tankUpgradeCost");
    const tankUpgradeLevelElem = document.getElementById("tankUpgradeLevel");

    const snowTyresCostElem = document.getElementById("snowTyresCost");
    const snowTyresStatusElem = document.getElementById("snowTyresStatus");
    const rainTyresCostElem = document.getElementById("rainTyresCost");
    const rainTyresStatusElem = document.getElementById("rainTyresStatus");

    const canvas = document.getElementById("carCanvas");
    const ctx = canvas.getContext("2d");

    // Log container from index.html
    const gameLogElem = document.getElementById("gameLog");

    /* =========================
       LOGGING FUNCTIONS
    ========================= */
    function addLog(message) {
      let ts = new Date().toLocaleTimeString();
      if (!gameLogElem) return;
      let line = document.createElement("div");
      line.textContent = `[${ts}] ${message}`;
      gameLogElem.appendChild(line);
      gameLogElem.scrollTop = gameLogElem.scrollHeight;
    }

    function showEventMessage(msg) {
      eventMessageElem.textContent = msg;
      setTimeout(() => { eventMessageElem.textContent = ""; }, 5000);
      addLog(msg);
    }

    function formatNumber(num) {
      if (num < 1000) return num.toFixed(0);
      let exponent = Math.floor(Math.log10(num));
      let mantissa = num / Math.pow(10, exponent);
      return mantissa.toFixed(2) + "e" + exponent;
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
    }

    function updateAutoClickerDetails() {
      let detailsElem = document.getElementById("autoClickerDetails");
      if (!detailsElem) return;
      if (game.autoClickers > 0) {
        detailsElem.style.display = "block";
        let productionPerTick = game.autoClickers * game.autoClickerBaseProduction *
          (1 + game.upgrades.autoEfficiency.level * 0.1) * game.prestige.multiplier;
        document.getElementById("autoClickerProduction").textContent = productionPerTick.toFixed(2);
        document.getElementById("autoClickerProgressBar").style.width = (autoTickProgress * 100) + "%";
      } else {
        detailsElem.style.display = "none";
      }
    }

    /* =========================
       OFFLINE PROGRESSION
    ========================= */
    function applyCarOfflineProgressDetailed(offlineSeconds) {
      let chunkDelta = 1;
      let timeLeft = offlineSeconds;
      while (timeLeft > 0) {
        let dt = Math.min(chunkDelta, timeLeft);
        timeLeft -= dt;
        let autoProduction = game.autoClickers * game.autoClickerBaseProduction *
          (1 + game.upgrades.autoEfficiency.level * 0.1) * game.prestige.multiplier;
        let produced = autoProduction * dt;
        game.aether += produced;
        game.totalAether += produced;
        if (game.car.isStuck) {
          game.car.stuckTimer -= dt;
          if (game.car.stuckTimer <= 0) {
            game.car.isStuck = false;
            addLog("Car is now unstuck (offline).");
          }
          continue;
        }
        if (game.car.fuel > 0) {
          let effectiveSpeed = game.car.speed * game.car.tempSpeedModifier;
          let milesThisChunk = effectiveSpeed * dt;
          let effectiveConsumption = game.car.baseFuelConsumption *
            (1 - game.car.efficiencyUpgrade.level * game.car.efficiencyUpgrade.efficiencyBonus);
          let fuelNeeded = milesThisChunk * effectiveConsumption;
          if (fuelNeeded > game.car.fuel) {
            let partialMiles = game.car.fuel / effectiveConsumption;
            game.car.miles += partialMiles;
            game.car.tokenProgress += partialMiles;
            addLog(`Ran out of fuel offline after ${partialMiles.toFixed(2)} miles.`);
            game.car.fuel = 0;
            break;
          } else {
            game.car.fuel -= fuelNeeded;
            game.car.miles += milesThisChunk;
            game.car.tokenProgress += milesThisChunk;
          }
          if (game.car.miles - lastEnvChangeMiles >= 50) {
            let newEnv;
            do {
              newEnv = Math.floor(Math.random() * ENVIRONMENTS.length);
            } while (newEnv === game.car.environmentIndex);
            game.car.environmentIndex = newEnv;
            lastEnvChangeMiles = game.car.miles;
            addLog(`(Offline) Environment changed to ${ENVIRONMENTS[newEnv].name}.`);
          }
          if (game.car.miles - lastEnvCommentMiles >= ENV_COMMENT_INTERVAL) {
            let envName = ENVIRONMENTS[game.car.environmentIndex].name;
            let lines = ENV_COMMENTS[envName];
            if (lines && lines.length > 0) {
              let comment = lines[Math.floor(Math.random() * lines.length)];
              addLog(`(Offline) ${comment}`);
            }
            lastEnvCommentMiles = game.car.miles;
          }
          if (game.car.tokenProgress >= game.car.tokenThreshold) {
            let tokensGained = Math.floor(game.car.tokenProgress / game.car.tokenThreshold);
            game.car.techTokens += tokensGained;
            game.car.tokenProgress -= tokensGained * game.car.tokenThreshold;
            addLog(`(Offline) Gained ${tokensGained} Tech Tokens.`);
          }
        }
      }
    }

    /* =========================
       SAVE & LOAD
    ========================= */
    function saveGame() {
      game.lastUpdate = Date.now();
      localStorage.setItem("neonAetherSave", JSON.stringify(game));
    }

    function loadGame() {
      let savedGame = localStorage.getItem("neonAetherSave");
      if (savedGame) {
        try {
          let now = Date.now();
          let parsed = JSON.parse(savedGame);
          let oldLastUpdate = Number(parsed.lastUpdate) || now;
          let offlineSeconds = (now - oldLastUpdate) / 1000;
          if (offlineSeconds > 3600) offlineSeconds = 3600;
          game = parsed;
          game.lastUpdate = now;
          let autoProduction = game.autoClickers * game.autoClickerBaseProduction *
            (1 + game.upgrades.autoEfficiency.level * 0.1) * game.prestige.multiplier;
          let produced = autoProduction * offlineSeconds;
          offlineAetherGained = produced;
          if (offlineSeconds >= 1) {
            addLog(`You were away for ${Math.floor(offlineSeconds)}s; simulating offline progress...`);
          }
          applyCarOfflineProgressDetailed(offlineSeconds);
          if (offlineAetherGained > 0) {
            offlineInfoElem.textContent = `You earned ${formatNumber(offlineAetherGained)} Aether while away!`;
            addLog(`(Offline) Earned ${formatNumber(offlineAetherGained)} Aether.`);
          } else {
            offlineInfoElem.textContent = "Welcome back! No offline Aether gained.";
          }
        } catch (e) {
          console.error("Error parsing saved game data. Resetting game.", e);
          localStorage.removeItem("neonAetherSave");
        }
      } else {
        game.car.weatherIndex = Math.floor(Math.random() * WEATHERS.length);
        game.car.environmentIndex = Math.floor(Math.random() * ENVIRONMENTS.length);
        addLog("New game started. Environment: " + ENVIRONMENTS[game.car.environmentIndex].name);
      }
    }

    /* =========================
       RANDOM EVENTS
    ========================= */
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
          message: "You found a fuel dump! +15 Fuel.",
          effect: () => {
            game.car.fuel = Math.min(game.car.fuel + 15, game.car.maxFuel);
          }
        },
        {
          name: "Road Rally",
          message: "Road rally! You earned 1 Tech Token.",
          effect: () => {
            game.car.techTokens += 1;
          }
        },
        {
          name: "Minor Accident",
          message: "Minor accident! -10 Fuel.",
          effect: () => {
            game.car.fuel = Math.max(game.car.fuel - 10, 0);
          }
        },
        {
          name: "Engine Trouble",
          message: "Engine trouble! Speed reduced for 5 seconds.",
          effect: () => {
            game.car.tempSpeedModifier = 0.5;
            game.car.tempSpeedTimer = 5;
          }
        },
        {
          name: "Surprise Aether Boost",
          message: "Surprise boost! +100 Aether.",
          effect: () => {
            game.aether += 100;
            game.totalAether += 100;
          }
        }
      ];
      let event = events[Math.floor(Math.random() * events.length)];
      event.effect();
      showEventMessage(event.message);
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

    /* =========================
       JOURNEY LOGIC
    ========================= */
    let wasFuelZero = true;
    function handleFuelState() {
      if (wasFuelZero && game.car.fuel > 0) {
        addLog("Car starts its journey (fuel restored).");
      }
      if (!wasFuelZero && game.car.fuel <= 0) {
        addLog("Car has run out of fuel.");
      }
      wasFuelZero = (game.car.fuel <= 0);
    }

    /* =========================
       DRAWING FUNCTIONS
    ========================= */
    function drawEnvironment() {
      const width = canvas.width;
      const height = canvas.height;
      let env = ENVIRONMENTS[game.car.environmentIndex];
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
      const width = canvas.width;
      const height = canvas.height;
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
        for (let drop of rainDrops) {
          drop.y += drop.speed * (1 / 60);
          if (drop.y > height) {
            drop.y = -drop.length;
            drop.x = Math.random() * width;
          }
          ctx.beginPath();
          ctx.moveTo(drop.x, drop.y);
          ctx.lineTo(drop.x, drop.y + drop.length);
          ctx.stroke();
        }
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
        for (let flake of snowFlakes) {
          flake.y += flake.speed * (1 / 60);
          flake.x += flake.drift * (1 / 60);
          if (flake.y > height) {
            flake.y = -flake.radius;
            flake.x = Math.random() * width;
          }
          ctx.beginPath();
          ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        snowFlakes = [];
      }
      if (currentWeather === "Fog") {
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillRect(0, 0, width, height);
      }
    }

    function drawCarCanvas() {
      const width = canvas.width;
      const height = canvas.height;
      drawEnvironment();
      drawBgItems();
      simulateWeather();

      const roadHeight = 50;
      const roadY = 160;
      ctx.fillStyle = "#808080";
      ctx.fillRect(0, roadY, width, roadHeight);

      let currentWeather = WEATHERS[game.car.weatherIndex].name;
      ctx.font = "16px Arial";
      let hudText = `Miles: ${formatNumber(game.car.miles)}    Weather: ${currentWeather}`;
      let textWidth = ctx.measureText(hudText).width;
      ctx.fillStyle = "rgba(50,50,50,0.8)";
      ctx.fillRect(5, 5, textWidth + 10, 28);
      ctx.fillStyle = "#fff";
      ctx.fillText(hudText, 10, 26);

      if (currentWeather === "Rain" && !game.car.rainTyres) {
        weatherNotificationElem.textContent = "Rain slowing you down (20% reduction).";
      } else {
        weatherNotificationElem.textContent = "";
      }
      if (game.car.isStuck) {
        stuckNotificationElem.textContent =
          `Car is stuck in the snow. Time until unstuck: ${Math.ceil(game.car.stuckTimer)} sec.`;
      } else {
        stuckNotificationElem.textContent = "";
      }

      let effectiveSpeed = game.car.speed * game.car.tempSpeedModifier;
      if (currentWeather === "Rain" && !game.car.rainTyres) {
        effectiveSpeed *= 0.8;
      }
      if (game.car.fuel <= 0) {
        effectiveSpeed = 0;
      }
      let bobbingOffset = 0;
      if (effectiveSpeed > 0.01) {
        bobbingOffset = 2 * Math.sin(globalTime * 2 * Math.PI);
      }

      const carX = width * 0.1;
      const carY = roadY + 25 + bobbingOffset;
      drawCar(carX, carY);
    }

    function drawCar(x, y) {
      const bodyWidth = 60, bodyHeight = 20, cabinWidth = 30, cabinHeight = 15, wheelRadius = 6;
      ctx.fillStyle = "#00ffff";
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
      ctx.lineTo(frontWheelX + wheelRadius * Math.cos(wheelAngle),
                 frontWheelY + wheelRadius * Math.sin(wheelAngle));
      ctx.stroke();

      let rearWheelX = x + bodyWidth - 15, rearWheelY = y;
      ctx.beginPath();
      ctx.arc(rearWheelX, rearWheelY, wheelRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(rearWheelX, rearWheelY);
      ctx.lineTo(rearWheelX + wheelRadius * Math.cos(wheelAngle),
                 rearWheelY + wheelRadius * Math.sin(wheelAngle));
      ctx.stroke();
    }

    /* =========================
       MAIN GAME LOOP
    ========================= */
    let lastFrameTime = Date.now();
    function gameLoop() {
      let now = Date.now();
      let deltaTime = (now - lastFrameTime) / 1000;
      lastFrameTime = now;
      globalTime += deltaTime;

      autoTickProgress += deltaTime;
      if (autoTickProgress >= 1) {
        autoTickProgress -= 1;
      }

      updateWeather(deltaTime);

      if (game.car.isStuck) {
        game.car.stuckTimer -= deltaTime;
        if (game.car.stuckTimer <= 0) {
          game.car.isStuck = false;
          showEventMessage("Car is now unstuck.");
        }
      } else {
        let autoProduction = game.autoClickers * game.autoClickerBaseProduction *
          (1 + game.upgrades.autoEfficiency.level * 0.1) * game.prestige.multiplier;
        let produced = autoProduction * deltaTime;
        game.aether += produced;
        game.totalAether += produced;

        if (game.car.fuel > 0) {
          handleFuelState();

          if (game.car.tempSpeedTimer > 0) {
            game.car.tempSpeedTimer -= deltaTime;
            if (game.car.tempSpeedTimer <= 0) {
              game.car.tempSpeedModifier = 1;
            }
          }
          let effectiveSpeed = game.car.speed * game.car.tempSpeedModifier;
          let currentWeather = WEATHERS[game.car.weatherIndex].name;
          if (currentWeather === "Rain" && !game.car.rainTyres) {
            effectiveSpeed *= 0.8;
          }
          let milesThisFrame = effectiveSpeed * deltaTime;
          let effectiveConsumption = game.car.baseFuelConsumption *
            (1 - game.car.efficiencyUpgrade.level * game.car.efficiencyUpgrade.efficiencyBonus);
          let fuelConsumed = milesThisFrame * effectiveConsumption;
          if (fuelConsumed > game.car.fuel) {
            let partialMiles = game.car.fuel / effectiveConsumption;
            game.car.miles += partialMiles;
            game.car.tokenProgress += partialMiles;
            game.car.fuel = 0;
            addLog("Car has run out of fuel mid-journey!");
          } else {
            game.car.fuel -= fuelConsumed;
            game.car.miles += milesThisFrame;
            game.car.tokenProgress += milesThisFrame;
          }

          if (game.car.miles - lastEnvChangeMiles >= 50) {
            let newEnv;
            do {
              newEnv = Math.floor(Math.random() * ENVIRONMENTS.length);
            } while (newEnv === game.car.environmentIndex);
            game.car.environmentIndex = newEnv;
            lastEnvChangeMiles = game.car.miles;
            showEventMessage("Environment changed to " + ENVIRONMENTS[newEnv].name);
          }

          if (game.car.miles - lastEnvCommentMiles >= ENV_COMMENT_INTERVAL) {
            let envName = ENVIRONMENTS[game.car.environmentIndex].name;
            let lines = ENV_COMMENTS[envName];
            if (lines && lines.length > 0) {
              let comment = lines[Math.floor(Math.random() * lines.length)];
              addLog(comment);
            }
            lastEnvCommentMiles = game.car.miles;
          }

          if (game.car.tokenProgress >= game.car.tokenThreshold) {
            let tokensGained = Math.floor(game.car.tokenProgress / game.car.tokenThreshold);
            game.car.techTokens += tokensGained;
            game.car.tokenProgress -= tokensGained * game.car.tokenThreshold;
            addLog(`Gained ${tokensGained} Tech Tokens.`);
          }

          game.car.environmentOffset += effectiveSpeed * deltaTime * 50;
          updateBgItems(deltaTime, effectiveSpeed);
        } else {
          handleFuelState();
        }
      }

      checkCarRandomEvents(deltaTime);

      updateDisplay();
      drawCarCanvas();
      updateAutoClickerDetails();

      requestAnimationFrame(gameLoop);
    }

    /* =========================
       BUY FUNCTIONS
    ========================= */
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

    function fuelCar() {
      if (game.aether >= 10) {
        game.aether -= 10;
        game.car.fuel = Math.min(game.car.fuel + 10, game.car.maxFuel);
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
          "Transcendence achieved! You gained " + gained +
          " Neon Core(s). Production multiplier is now " + game.prestige.multiplier.toFixed(2) + "x."
        );
      } else {
        alert("You need at least 1,000,000 total Aether to Transcend.");
      }
    }

    /* =========================
       EVENT LISTENERS
    ========================= */
    document.getElementById("clickButton").addEventListener("click", function () {
      let amount = game.clickValue * game.clickMultiplier * game.prestige.multiplier;
      game.aether += amount;
      game.totalAether += amount;
    });
    document.getElementById("buyClickUpgradeButton").addEventListener("click", function () {
      let upgrade = game.upgrades.clickEfficiency;
      if (game.aether >= upgrade.cost) {
        game.aether -= upgrade.cost;
        upgrade.level++;
        game.clickMultiplier = 1 + upgrade.level * 0.5;
        upgrade.cost = Math.floor(upgrade.cost * upgrade.costMultiplier);
      }
    });
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

    /* =========================
       MAIN GAME LOOP
    ========================= */
    let lastFrameTime = Date.now();
    function gameLoop() {
      let now = Date.now();
      let deltaTime = (now - lastFrameTime) / 1000;
      lastFrameTime = now;
      globalTime += deltaTime;

      autoTickProgress += deltaTime;
      if (autoTickProgress >= 1) {
        autoTickProgress -= 1;
      }

      updateWeather(deltaTime);

      if (game.car.isStuck) {
        game.car.stuckTimer -= deltaTime;
        if (game.car.stuckTimer <= 0) {
          game.car.isStuck = false;
          showEventMessage("Car is now unstuck.");
        }
      } else {
        let autoProduction = game.autoClickers * game.autoClickerBaseProduction *
          (1 + game.upgrades.autoEfficiency.level * 0.1) * game.prestige.multiplier;
        let produced = autoProduction * deltaTime;
        game.aether += produced;
        game.totalAether += produced;

        if (game.car.fuel > 0) {
          handleFuelState();

          if (game.car.tempSpeedTimer > 0) {
            game.car.tempSpeedTimer -= deltaTime;
            if (game.car.tempSpeedTimer <= 0) {
              game.car.tempSpeedModifier = 1;
            }
          }
          let effectiveSpeed = game.car.speed * game.car.tempSpeedModifier;
          let currentWeather = WEATHERS[game.car.weatherIndex].name;
          if (currentWeather === "Rain" && !game.car.rainTyres) {
            effectiveSpeed *= 0.8;
          }
          let milesThisFrame = effectiveSpeed * deltaTime;
          let effectiveConsumption = game.car.baseFuelConsumption *
            (1 - game.car.efficiencyUpgrade.level * game.car.efficiencyUpgrade.efficiencyBonus);
          let fuelConsumed = milesThisFrame * effectiveConsumption;
          if (fuelConsumed > game.car.fuel) {
            let partialMiles = game.car.fuel / effectiveConsumption;
            game.car.miles += partialMiles;
            game.car.tokenProgress += partialMiles;
            game.car.fuel = 0;
            addLog("Car has run out of fuel mid-journey!");
          } else {
            game.car.fuel -= fuelConsumed;
            game.car.miles += milesThisFrame;
            game.car.tokenProgress += milesThisFrame;
          }

          if (game.car.miles - lastEnvChangeMiles >= 50) {
            let newEnv;
            do {
              newEnv = Math.floor(Math.random() * ENVIRONMENTS.length);
            } while (newEnv === game.car.environmentIndex);
            game.car.environmentIndex = newEnv;
            lastEnvChangeMiles = game.car.miles;
            showEventMessage("Environment changed to " + ENVIRONMENTS[newEnv].name);
          }

          if (game.car.miles - lastEnvCommentMiles >= ENV_COMMENT_INTERVAL) {
            let envName = ENVIRONMENTS[game.car.environmentIndex].name;
            let lines = ENV_COMMENTS[envName];
            if (lines && lines.length > 0) {
              let comment = lines[Math.floor(Math.random() * lines.length)];
              addLog(comment);
            }
            lastEnvCommentMiles = game.car.miles;
          }

          if (game.car.tokenProgress >= game.car.tokenThreshold) {
            let tokensGained = Math.floor(game.car.tokenProgress / game.car.tokenThreshold);
            game.car.techTokens += tokensGained;
            game.car.tokenProgress -= tokensGained * game.car.tokenThreshold;
            addLog(`Gained ${tokensGained} Tech Tokens.`);
          }

          game.car.environmentOffset += effectiveSpeed * deltaTime * 50;
          updateBgItems(deltaTime, effectiveSpeed);
        } else {
          handleFuelState();
        }
      }

      checkCarRandomEvents(deltaTime);

      updateDisplay();
      drawCarCanvas();
      updateAutoClickerDetails();

      requestAnimationFrame(gameLoop);
    }

    /* =========================
       RESET GAME FUNCTION
    ========================= */
    function resetGame() {
      if (confirm("Are you sure you want to reset the game? This will clear all progress.")) {
        localStorage.removeItem("neonAetherSave");
        location.reload();
      }
    }

    /* =========================
       EVENT LISTENERS
    ========================= */
    document.getElementById("clickButton").addEventListener("click", function () {
      let amount = game.clickValue * game.clickMultiplier * game.prestige.multiplier;
      game.aether += amount;
      game.totalAether += amount;
    });
    document.getElementById("buyClickUpgradeButton").addEventListener("click", function () {
      let upgrade = game.upgrades.clickEfficiency;
      if (game.aether >= upgrade.cost) {
        game.aether -= upgrade.cost;
        upgrade.level++;
        game.clickMultiplier = 1 + upgrade.level * 0.5;
        upgrade.cost = Math.floor(upgrade.cost * upgrade.costMultiplier);
      }
    });
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

    /* =========================
       START THE GAME
    ========================= */
    loadGame();
    if (offlineAetherGained > 0) {
      offlineInfoElem.textContent = `You earned ${formatNumber(offlineAetherGained)} Aether while away!`;
      addLog(`Offline: Earned ${formatNumber(offlineAetherGained)} Aether while away.`);
    } else {
      offlineInfoElem.textContent = "Welcome! Progress will be calculated upon loading.";
    }
    updateDisplay();
    drawCarCanvas();
    requestAnimationFrame(gameLoop);
    setInterval(saveGame, 5000);
  })();
});
