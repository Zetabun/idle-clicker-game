import { DayNightCycle } from './dayNightCycle.js';
import { NeonCity } from './neonCity.js';

// Draws the entire car canvas including background, road, car, HUD, and weather.
export function drawCarCanvas(deltaTime, deps) {
  const {
    canvas,
    ctx,
    game,
    globalTime,
    snowAccumulation,
    ENVIRONMENTS,
    WEATHERS,
    updatePersonalScore,
    formatNumber,
    weatherNotificationElem,
    stuckNotificationElem,
    pickNonOverlappingX
  } = deps;

  // Clear the canvas each frame
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1) Draw environment + background items
  drawEnvironment(deps);
  drawBgItems(deps);

  // 2) Draw the road
  const roadY = 160;
  const roadHeight = 50;
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, roadY, canvas.width, roadHeight);

  // 3) Draw snow on the road
  if (snowAccumulation > 0) {
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    const heightToDraw = Math.min(snowAccumulation, roadHeight);
    ctx.fillRect(0, roadY + (roadHeight - heightToDraw), canvas.width, heightToDraw);
  }

  // 4) Draw loot
  drawLoot(deps);

  // 5) Draw the car with a bobbing effect if moving
  let bobbingOffset = 0;
  if (game.car.direction !== 0 && game.car.fuel > 0 && game.car.miles !== 0) {
    bobbingOffset = 2 * Math.sin(globalTime * 2 * Math.PI);
  }
  ctx.save();
  if (game.car.direction === -1) {
    // Flip horizontally when returning home
    ctx.translate(canvas.width * 0.1 + 30, 0);
    ctx.scale(-1, 1);
    drawCar(0, roadY + 25 + bobbingOffset, deps);
  } else {
    drawCar(canvas.width * 0.1, roadY + 25 + bobbingOffset, deps);
  }
  ctx.restore();

  // Apply a dark overlay based on brightness (for day/night effects)
  ctx.save();
  const brightness = DayNightCycle.getBrightness(); // Value between 0.2 and 1
  ctx.fillStyle = `rgba(0, 0, 0, ${1 - brightness})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  // Draw headlights if moving forward
  if (game.car.direction === 1) {
    DayNightCycle.drawHeadlights(ctx, canvas.width * 0.1, roadY + 25 + bobbingOffset);
  }

  // 6) Precipitation effects (rain, snow, fog)
  simulateWeather(deltaTime, deps);

  // 7) HUD Display
  const envName = ENVIRONMENTS[game.car.environmentIndex].name;
  const currentWeather = WEATHERS[game.car.weatherIndex].name;
  ctx.font = "16px Arial";
  const hudText = `Miles: ${formatNumber(game.car.miles)} | Env: ${envName} | Weather: ${currentWeather} | Time: ${DayNightCycle.getDigitalTime()}`;
  const textWidth = ctx.measureText(hudText).width;
  ctx.fillStyle = "rgba(50,50,50,0.8)";
  ctx.fillRect(5, 5, textWidth + 10, 28);
  ctx.fillStyle = "#fff";
  ctx.fillText(hudText, 10, 26);

  const highScore = updatePersonalScore();
  const highScoreText = `High Score: ${formatNumber(highScore)} miles`;
  const hsTextWidth = ctx.measureText(highScoreText).width;
  ctx.fillStyle = "rgba(50,50,50,0.8)";
  ctx.fillRect(canvas.width - hsTextWidth - 20, 5, hsTextWidth + 10, 28);
  ctx.fillStyle = "#fff";
  ctx.fillText(highScoreText, canvas.width - hsTextWidth - 15, 26);

  // Update weather and stuck notifications (assumes these DOM elements are provided)
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
}


function drawEnvironment(deps) {
  const { canvas, ctx, game, ENVIRONMENTS } = deps;
  let envIndex = game.car.environmentIndex;
  if (ENVIRONMENTS[envIndex]) {
    const env = ENVIRONMENTS[envIndex];
    if (env.img) {
      const imgWidth = env.img.width;
      const offset = -(game.car.environmentOffset % imgWidth);
      for (let x = offset; x < canvas.width; x += imgWidth) {
        ctx.drawImage(env.img, x, 0, imgWidth, canvas.height);
      }
    } else {
      ctx.fillStyle = env.fallbackColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }
}

function drawBgItems(deps) {
  const { canvas, ctx, game, ENVIRONMENTS, mod, pickNonOverlappingX, NeonCity, globalTime } = deps;
  const bgMultiplier = 1.5;
  const bgOffset = mod(game.car.environmentOffset * bgMultiplier, canvas.width);
  const env = ENVIRONMENTS[game.car.environmentIndex];

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
  } else if (env.name === "Digital Wasteland") {
    ctx.fillStyle = "#550000";
    ctx.fillRect(mod(100 - bgOffset, canvas.width), 150, 30, 10);
    ctx.fillRect(mod(300 - bgOffset, canvas.width), 140, 20, 10);
  } else if (env.name === "Neon City") {
    // Using deps.currentNeonCityEnv and deps.environmentHistory to track Neon City state
    if (deps.currentNeonCityEnv !== "Neon City") {
      NeonCity.buildings = [];
      NeonCity.neonSigns = [];
      NeonCity.initBuildings(canvas);
      deps.environmentHistory = [{ start: 0, env: game.car.environmentIndex }];
      deps.currentNeonCityEnv = "Neon City";
    }
    NeonCity.updateBuildings(game.car.environmentOffset, canvas);
    NeonCity.updateNeonSigns(game.car.environmentOffset, canvas, pickNonOverlappingX);
    NeonCity.drawBuildings(game.car.environmentOffset, 160, canvas, ctx);
    NeonCity.drawNeonSigns(game.car.environmentOffset, canvas, ctx, globalTime);
  }
}

function drawLoot(deps) {
  const { ctx, game } = deps;
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

function drawCar(x, y, deps) {
  const { ctx, game, globalTime, formatNumber } = deps;
  const bodyWidth = 60,
        bodyHeight = 20,
        cabinWidth = 30,
        cabinHeight = 15,
        wheelRadius = 6;

  // Car body color based on paint unlock and selection
  ctx.fillStyle = game.carPaint.unlocked
    ? (game.carPaint.color === "Red" ? "#ff0000" :
       game.carPaint.color === "Blue" ? "#0000ff" :
       game.carPaint.color === "Green" ? "#00ff00" :
       game.carPaint.color === "Neon Pink" ? "#ff69b4" : "#00ffff")
    : "#00ffff";
  ctx.fillRect(x, y - bodyHeight, bodyWidth, bodyHeight);

  // Car cabin
  ctx.fillStyle = "#008080";
  ctx.fillRect(x + 10, y - bodyHeight - cabinHeight, cabinWidth, cabinHeight);

  // Wheels and rotation animation
  ctx.fillStyle = "#222";
  let wheelAngle = 0;
  if (game.car.direction !== 0 && game.car.fuel > 0 && game.car.miles !== 0) {
    wheelAngle = globalTime * 5;
  }
  // Front wheel
  const frontWheelX = x + 15, frontWheelY = y;
  ctx.beginPath();
  ctx.arc(frontWheelX, frontWheelY, wheelRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(frontWheelX, frontWheelY);
  ctx.lineTo(frontWheelX + wheelRadius * Math.cos(wheelAngle), frontWheelY + wheelRadius * Math.sin(wheelAngle));
  ctx.stroke();
  
  // Rear wheel
  const rearWheelX = x + bodyWidth - 15, rearWheelY = y;
  ctx.beginPath();
  ctx.arc(rearWheelX, rearWheelY, wheelRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(rearWheelX, rearWheelY);
  ctx.lineTo(rearWheelX + wheelRadius * Math.cos(wheelAngle), rearWheelY + wheelRadius * Math.sin(wheelAngle));
  ctx.stroke();
  
  // Draw headlights via DayNightCycle
  DayNightCycle.drawHeadlights(ctx, x, y);
}

export function simulateWeather(deltaTime, deps) {
  const { canvas, ctx, game, WEATHERS } = deps;
  const currentWeather = WEATHERS[game.car.weatherIndex].name;

  // Rain/Storm effects
  if (currentWeather === "Rain" || currentWeather === "Storm") {
    if (deps.rainDrops.length === 0) {
      for (let i = 0; i < 100; i++) {
        deps.rainDrops.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          speed: 300 + Math.random() * 200,
          length: 15 + Math.random() * 10
        });
      }
    }
    ctx.strokeStyle = "rgba(0,0,255,0.5)";
    ctx.lineWidth = 2;
    deps.rainDrops.forEach(drop => {
      drop.y += drop.speed * deltaTime;
      if (drop.y > canvas.height) {
        drop.y = -drop.length;
        drop.x = Math.random() * canvas.width;
      }
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x, drop.y + drop.length);
      ctx.stroke();
    });
    if (currentWeather === "Storm") {
      if (deps.lightningTimer <= 0 && Math.random() < 0.005) {
        deps.lightningTimer = 0.1;
      }
      if (deps.lightningTimer > 0) {
        ctx.fillStyle = `rgba(255,255,255,${deps.lightningTimer * 7})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        deps.lightningTimer -= deltaTime;
      }
    }
  } else {
    deps.rainDrops = [];
  }

  // Snow effects
  if (currentWeather === "Snow") {
    if (deps.snowFlakes.length === 0) {
      for (let i = 0; i < 50; i++) {
        deps.snowFlakes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          speed: 30 + Math.random() * 30,
          radius: 2 + Math.random() * 2,
          drift: (Math.random() - 0.5) * 20
        });
      }
    }
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    deps.snowFlakes.forEach(flake => {
      flake.y += flake.speed * deltaTime;
      flake.x += flake.drift * deltaTime;
      if (flake.y > canvas.height) {
        flake.y = -flake.radius;
        flake.x = Math.random() * canvas.width;
      }
      ctx.beginPath();
      ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    deps.snowAccumulation += deltaTime * 2;
    if (deps.snowAccumulation > 30) {
      deps.snowAccumulation = 30;
    }
  } else {
    if (deps.snowAccumulation > 0) {
      deps.snowAccumulation -= deltaTime;
      if (deps.snowAccumulation < 0) deps.snowAccumulation = 0;
    }
    deps.snowFlakes = [];
  }

  // Fog effect
  if (currentWeather === "Fog") {
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}


export function updateRoadLoot(deltaTime, distanceTraveled, deps) {
  const { game, mod, canvas } = deps;
  const shift = distanceTraveled * 50 * game.car.direction;
  for (let i = game.roadLoot.length - 1; i >= 0; i--) {
    const loot = game.roadLoot[i];
    loot.x -= shift;
    if ((game.car.direction === 1 && loot.x < -50) ||
        (game.car.direction === -1 && loot.x > canvas.width + 50)) {
      game.roadLoot.splice(i, 1);
    }
  }
}

export function updateDisplay(deps) {
  const {
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
    // Added statsHighScoreElem to fix the undefined error.
    statsHighScoreElem,
    startJourneyButton,
    returnHomeButton,
    updateInventoryOverlay,
    updatePersonalScore,
    game,
    formatNumber
  } = deps;
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
