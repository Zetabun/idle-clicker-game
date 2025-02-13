document.addEventListener("DOMContentLoaded", function () {
  (function () {
    "use strict";

    console.log("Starting Neon Aether game...");

    /********************************************************************
     * FULL CONSOLIDATED SCRIPT.JS
     * Features:
     *  - Car logs events for: 
     *      * Starting movement (when fuel goes from 0 to >0)
     *      * Running out of fuel
     *      * Environment commentary
     *      * Environment changes every 50 miles
     *      * Offline progress simulation that also logs these events
     *  - Offline progress logs environment changes, commentary, 
     *    running out of fuel, etc.
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
      baseFuelConsumption: 5, // per mile
      miles: 0,
      speed: 0.2, // miles/sec
      techTokens: 0,
      tokenProgress: 0,
      tokenThreshold: 50,
      lastUpdate: Date.now(),
      eventCooldown: 0,
      tempSpeedModifier: 1,
      tempSpeedTimer: 0,
      isStuck: false,
      stuckTimer: 0, // seconds if stuck in snow

      // Car Upgrades (Tech Tokens)
      engineUpgrade: { level: 0, cost: 10, costMultiplier: 1.5, speedBonus: 0.05 },
      efficiencyUpgrade: { level: 0, cost: 10, costMultiplier: 1.5, efficiencyBonus: 0.05 },
      tankUpgrade: { level: 0, cost: 10, costMultiplier: 1.5, fuelBonus: 20 },

      // Tyre Upgrades
      snowTyres: false,
      snowTyresCost: 50,
      rainTyres: false,
      rainTyresCost: 50,

      // Environment & Weather
      environmentIndex: 0, 
      weatherIndex: 0,     
      environmentOffset: 0
    };

    // For environment changes and commentary
    let lastEnvChangeMiles = 0;
    let lastEnvCommentMiles = 0; // for random commentary
    const ENV_COMMENT_INTERVAL = 30; // e.g., every 30 miles we do a commentary

    // For offline progress display
    let offlineAetherGained = 0;

    // For the event log
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

    // Sample environment commentary lines
    const ENV_COMMENTS = {
      "Forest": [
        "The trees whisper in the breeze.",
        "A fox darts between the pines.",
        "You hear birds chirping overhead."
      ],
      "Desert": [
        "The sun beats down mercilessly.",
        "You spot a cactus swaying in the heat.",
        "Distant dunes shift in the wind."
      ],
      "City": [
        "Neon signs flicker among towering buildings.",
        "You pass busy streets full of honking cars.",
        "Skyscrapers loom above, reflecting the sky."
      ],
      "Mountains": [
        "Snow-capped peaks loom overhead.",
        "You hear a distant avalanche rumbling.",
        "The air is crisp and thin here."
      ],
      "Beach": [
        "Waves crash along the sandy shore.",
        "A salty breeze whips across the coast.",
        "Seagulls circle overhead, calling loudly."
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
      // logic omitted for brevity
      if (envName === "Forest") {
        if (Math.random() < 0.7) {
          return { type: "tree", x: canvasWidth + Math.random() * 100, y: yPos, width: 20, height: 40, speedFactor: 0.6 };
        } else {
          return { type: "bush", x: canvasWidth + Math.random() * 100, y: yPos + 20, width: 25, height: 15, speedFactor: 0.5 };
        }
      } 
      // etc. (same as before) ...
      // for brevity, we can keep the existing spawn logic
      return null;
    }

    function updateBgItems(deltaTime, effectiveSpeed) {
      // same as your existing logic
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
      // same as existing
    }

    /* =========================
       GLOBAL ANIMATION
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

    // If you have the log container:
    const gameLogElem = document.getElementById("gameLog");

    /* =========================
       LOGGING
    ========================= */
    function addLog(message) {
      let ts = new Date().toLocaleTimeString();
      if (!gameLogElem) return; // if no log container
      let line = document.createElement("div");
      line.textContent = `[${ts}] ${message}`;
      gameLogElem.appendChild(line);
      // auto scroll
      gameLogElem.scrollTop = gameLogElem.scrollHeight;
    }

    function showEventMessage(msg) {
      eventMessageElem.textContent = msg;
      setTimeout(() => {
        eventMessageElem.textContent = "";
      }, 5000);
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
    // We'll do a chunk-based simulation for offline so we can log environment changes, commentary, etc.
    function applyCarOfflineProgressDetailed(offlineSeconds) {
      // We break offlineSeconds into chunks so we can simulate step by step
      // in smaller increments. E.g., 1 mile increments or so.
      // For efficiency, we can do a while loop that moves in small increments.
      // But to keep it simpler, we can do a "simulate until we run out of time or fuel."
      // We'll also track environment changes every 50 miles and random commentary every 30 miles.
      let chunkDelta = 1; // We'll simulate 1 second chunks
      let timeLeft = offlineSeconds;
      let currentTime = 0;

      while (timeLeft > 0) {
        let dt = Math.min(chunkDelta, timeLeft);
        timeLeft -= dt;
        currentTime += dt;

        // Auto production in chunk
        let autoProduction = game.autoClickers * game.autoClickerBaseProduction *
          (1 + game.upgrades.autoEfficiency.level * 0.1) * game.prestige.multiplier;
        let produced = autoProduction * dt;
        game.aether += produced;
        game.totalAether += produced;

        // If the car is stuck, skip movement
        if (game.car.isStuck) {
          game.car.stuckTimer -= dt;
          if (game.car.stuckTimer <= 0) {
            game.car.isStuck = false;
            addLog("Car is now unstuck (offline).");
          }
          continue;
        }

        // If we have fuel, move
        if (game.car.fuel > 0) {
          let effectiveSpeed = game.car.speed * game.car.tempSpeedModifier;
          // no special weather slowdown offline for simplicity
          // but you can add if you like
          let milesThisChunk = effectiveSpeed * dt;
          let effectiveConsumption = game.car.baseFuelConsumption *
            (1 - game.car.efficiencyUpgrade.level * game.car.efficiencyUpgrade.efficiencyBonus);
          let fuelNeeded = milesThisChunk * effectiveConsumption;
          if (fuelNeeded > game.car.fuel) {
            // We run out of fuel mid-chunk
            let partialMiles = game.car.fuel / effectiveConsumption;
            game.car.miles += partialMiles;
            game.car.tokenProgress += partialMiles;
            addLog(`Ran out of fuel offline after traveling ${partialMiles.toFixed(2)} miles this chunk.`);
            game.car.fuel = 0;
            break; // no more movement possible offline
          } else {
            game.car.fuel -= fuelNeeded;
            game.car.miles += milesThisChunk;
            game.car.tokenProgress += milesThisChunk;
          }

          // Check environment changes every 50 miles
          if (game.car.miles - lastEnvChangeMiles >= 50) {
            let newEnv;
            do {
              newEnv = Math.floor(Math.random() * ENVIRONMENTS.length);
            } while (newEnv === game.car.environmentIndex);
            game.car.environmentIndex = newEnv;
            lastEnvChangeMiles = game.car.miles;
            addLog(`(Offline) Environment changed to ${ENVIRONMENTS[newEnv].name}.`);
          }

          // Check environment commentary every 30 miles
          if (game.car.miles - lastEnvCommentMiles >= ENV_COMMENT_INTERVAL) {
            let envName = ENVIRONMENTS[game.car.environmentIndex].name;
            let lines = ENV_COMMENTS[envName];
            if (lines && lines.length > 0) {
              let comment = lines[Math.floor(Math.random() * lines.length)];
              addLog(`(Offline) ${comment}`);
            }
            lastEnvCommentMiles = game.car.miles;
          }

          // Check token threshold
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

    let offlineInfoElem = document.getElementById("offlineInfo");
    function loadGame() {
      let savedGame = localStorage.getItem("neonAetherSave");
      if (savedGame) {
        try {
          let now = Date.now();
          let parsed = JSON.parse(savedGame);
          let oldLastUpdate = Number(parsed.lastUpdate) || now;
          let offlineSeconds = (now - oldLastUpdate) / 1000;
          if (offlineSeconds > 3600) offlineSeconds = 3600;

          game = parsed; // load
          game.lastUpdate = now;

          // We do a detailed offline simulation
          // but first do auto production calculation
          let autoProduction = game.autoClickers * game.autoClickerBaseProduction *
            (1 + game.upgrades.autoEfficiency.level * 0.1) * game.prestige.multiplier;
          let produced = autoProduction * offlineSeconds;
          offlineAetherGained = produced;

          // Add a log for offline
          if (offlineSeconds >= 1) {
            addLog(`You were away for ${Math.floor(offlineSeconds)}s, simulating offline progress...`);
          }

          // Actually simulate
          applyCarOfflineProgressDetailed(offlineSeconds);

          // Add final message
          if (offlineAetherGained > 0) {
            offlineInfoElem.textContent = `You earned ${formatNumber(offlineAetherGained)} Aether while away!`;
            addLog(`(Offline) Earned ${formatNumber(offlineAetherGained)} Aether from idle auto-clickers.`);
          } else {
            offlineInfoElem.textContent = "Welcome back! No offline Aether gained.";
          }

        } catch (e) {
          console.error("Error parsing saved game data. Resetting game.", e);
          localStorage.removeItem("neonAetherSave");
        }
      } else {
        // brand new game
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
        // 10% chance to change
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
      // If Snow & no snow tyres, stuck chance
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
    let wasFuelZero = true; // track if we were at 0 fuel
    function handleFuelState() {
      // If we just gained fuel from 0 -> >0, log that the journey starts
      if (wasFuelZero && game.car.fuel > 0) {
        addLog("Car starts its journey (fuel restored).");
      }
      // If we just dropped to 0 fuel, log that we ran out
      if (!wasFuelZero && game.car.fuel <= 0) {
        addLog("Car has run out of fuel.");
      }
      wasFuelZero = (game.car.fuel <= 0);
    }

    /* =========================
       DRAW
    ========================= */
    function drawEnvironment() {
      // omitted for brevity (same as above)
    }
    function simulateWeather() {
      // omitted for brevity (same as above)
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
      ctx.lineTo(
        frontWheelX + wheelRadius * Math.cos(wheelAngle),
        frontWheelY + wheelRadius * Math.sin(wheelAngle)
      );
      ctx.stroke();

      let rearWheelX = x + bodyWidth - 15, rearWheelY = y;
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

    /* =========================
       MAIN GAME LOOP
    ========================= */
    let lastFrameTime = Date.now();
    function gameLoop() {
      let now = Date.now();
      let deltaTime = (now - lastFrameTime) / 1000;
      lastFrameTime = now;
      globalTime += deltaTime;

      // Auto tick progress for auto clicker details
      autoTickProgress += deltaTime;
      if (autoTickProgress >= 1) {
        autoTickProgress -= 1;
      }

      // handle weather, etc.
      updateWeather(deltaTime);

      // handle stuck logic
      if (game.car.isStuck) {
        game.car.stuckTimer -= deltaTime;
        if (game.car.stuckTimer <= 0) {
          game.car.isStuck = false;
          showEventMessage("Car is now unstuck.");
        }
      } else {
        // auto production
        let autoProduction = game.autoClickers * game.autoClickerBaseProduction *
          (1 + game.upgrades.autoEfficiency.level * 0.1) * game.prestige.multiplier;
        let produced = autoProduction * deltaTime;
        game.aether += produced;
        game.totalAether += produced;

        // If we have fuel, we move
        if (game.car.fuel > 0) {
          // check if we just fueled from 0
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
            // we run out mid-frame
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

          // environment changes every 50 miles
          if (game.car.miles - lastEnvChangeMiles >= 50) {
            let newEnv;
            do {
              newEnv = Math.floor(Math.random() * ENVIRONMENTS.length);
            } while (newEnv === game.car.environmentIndex);
            game.car.environmentIndex = newEnv;
            lastEnvChangeMiles = game.car.miles;
            showEventMessage("Environment changed to " + ENVIRONMENTS[newEnv].name);
          }

          // environment commentary every 30 miles
          if (game.car.miles - lastEnvCommentMiles >= ENV_COMMENT_INTERVAL) {
            let envName = ENVIRONMENTS[game.car.environmentIndex].name;
            let lines = ENV_COMMENTS[envName];
            if (lines && lines.length > 0) {
              let comment = lines[Math.floor(Math.random() * lines.length)];
              addLog(comment);
            }
            lastEnvCommentMiles = game.car.miles;
          }

          // check token threshold
          if (game.car.tokenProgress >= game.car.tokenThreshold) {
            let tokensGained = Math.floor(game.car.tokenProgress / game.car.tokenThreshold);
            game.car.techTokens += tokensGained;
            game.car.tokenProgress -= tokensGained * game.car.tokenThreshold;
            addLog(`Gained ${tokensGained} Tech Tokens.`);
          }

          // environment offset
          game.car.environmentOffset += effectiveSpeed * deltaTime * 50;
          updateBgItems(deltaTime, effectiveSpeed);

        } else {
          // no fuel
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
       RESET GAME
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

    /* =========================
       START THE GAME
    ========================= */
    loadGame(); 
    if (offlineAetherGained > 0) {
      offlineInfoElem.textContent = `You earned ${formatNumber(offlineAetherGained)} Aether while away!`;
      addLog(`Offline: Gained ${formatNumber(offlineAetherGained)} Aether while away.`);
    } else {
      offlineInfoElem.textContent = "Welcome! Progress will be calculated upon loading.";
    }

    updateDisplay();
    drawCarCanvas();
    requestAnimationFrame(gameLoop);
    setInterval(saveGame, 5000);
  })();
});
