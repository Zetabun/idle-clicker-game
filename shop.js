document.addEventListener("DOMContentLoaded", () => {
  // Load game state from localStorage
  let gameState = localStorage.getItem("neonAetherSave");
  if (!gameState) {
    alert("No saved game found. Please start the game first.");
    return;
  }
  let game = JSON.parse(gameState);

  // Helper: update shop display with upgrade values, resource info, and enable/disable buttons.
  function updateShopDisplay() {
    // Resource info at top
    document.getElementById("shopAetherAmount").textContent = formatNumber(game.aether);
    document.getElementById("shopNeonCores").textContent = game.prestige.neonCores;
    document.getElementById("shopPrestigeCount").textContent = game.prestige.count;

    // Idle Upgrades
    document.getElementById("shopClickUpgradeCost").textContent = game.upgrades.clickEfficiency.cost;
    document.getElementById("shopClickUpgradeLevel").textContent = game.upgrades.clickEfficiency.level;
    document.getElementById("shopAutoClickerCost").textContent = game.autoClickerCost;
    document.getElementById("shopAutoClickerCount").textContent = game.autoClickers;
    document.getElementById("shopAutoEfficiencyCost").textContent = game.upgrades.autoEfficiency.cost;
    document.getElementById("shopAutoEfficiencyLevel").textContent = game.upgrades.autoEfficiency.level;

    // Enable/disable idle upgrade buttons based on Aether
    const clickUpgradeButton = document.getElementById("shopBuyClickUpgradeButton");
    if (game.aether < game.upgrades.clickEfficiency.cost) {
      clickUpgradeButton.disabled = true;
      clickUpgradeButton.classList.add("disabled");
    } else {
      clickUpgradeButton.disabled = false;
      clickUpgradeButton.classList.remove("disabled");
    }
    const autoClickerButton = document.getElementById("shopBuyAutoClickerButton");
    if (game.aether < game.autoClickerCost) {
      autoClickerButton.disabled = true;
      autoClickerButton.classList.add("disabled");
    } else {
      autoClickerButton.disabled = false;
      autoClickerButton.classList.remove("disabled");
    }
    const autoEfficiencyButton = document.getElementById("shopBuyAutoEfficiencyButton");
    if (game.aether < game.upgrades.autoEfficiency.cost) {
      autoEfficiencyButton.disabled = true;
      autoEfficiencyButton.classList.add("disabled");
    } else {
      autoEfficiencyButton.disabled = false;
      autoEfficiencyButton.classList.remove("disabled");
    }

    // Car Upgrades
    document.getElementById("shopEngineUpgradeCost").textContent = game.car.engineUpgrade.cost;
    document.getElementById("shopEngineUpgradeLevel").textContent = game.car.engineUpgrade.level;
    document.getElementById("shopEfficiencyUpgradeCost").textContent = game.car.efficiencyUpgrade.cost;
    document.getElementById("shopEfficiencyUpgradeLevel").textContent = game.car.efficiencyUpgrade.level;
    document.getElementById("shopTankUpgradeCost").textContent = game.car.tankUpgrade.cost;
    document.getElementById("shopTankUpgradeLevel").textContent = game.car.tankUpgrade.level;

    const engineUpgradeButton = document.getElementById("shopBuyEngineUpgradeButton");
    if (game.car.techTokens < game.car.engineUpgrade.cost) {
      engineUpgradeButton.disabled = true;
      engineUpgradeButton.classList.add("disabled");
    } else {
      engineUpgradeButton.disabled = false;
      engineUpgradeButton.classList.remove("disabled");
    }
    const fuelEfficiencyButton = document.getElementById("shopBuyEfficiencyUpgradeButton");
    if (game.car.techTokens < game.car.efficiencyUpgrade.cost) {
      fuelEfficiencyButton.disabled = true;
      fuelEfficiencyButton.classList.add("disabled");
    } else {
      fuelEfficiencyButton.disabled = false;
      fuelEfficiencyButton.classList.remove("disabled");
    }
    const fuelTankButton = document.getElementById("shopBuyTankUpgradeButton");
    if (game.car.techTokens < game.car.tankUpgrade.cost) {
      fuelTankButton.disabled = true;
      fuelTankButton.classList.add("disabled");
    } else {
      fuelTankButton.disabled = false;
      fuelTankButton.classList.remove("disabled");
    }

    // Tyre Upgrades
    document.getElementById("shopSnowTyresCost").textContent = game.car.snowTyresCost;
    document.getElementById("shopSnowTyresStatus").textContent = game.car.snowTyres ? "Equipped" : "Not Equipped";
    document.getElementById("shopRainTyresCost").textContent = game.car.rainTyresCost;
    document.getElementById("shopRainTyresStatus").textContent = game.car.rainTyres ? "Equipped" : "Not Equipped";

    const snowTyresButton = document.getElementById("shopBuySnowTyresButton");
    if (game.car.snowTyres || game.car.techTokens < game.car.snowTyresCost) {
      snowTyresButton.disabled = true;
      snowTyresButton.classList.add("disabled");
    } else {
      snowTyresButton.disabled = false;
      snowTyresButton.classList.remove("disabled");
    }
    const rainTyresButton = document.getElementById("shopBuyRainTyresButton");
    if (game.car.rainTyres || game.car.techTokens < game.car.rainTyresCost) {
      rainTyresButton.disabled = true;
      rainTyresButton.classList.add("disabled");
    } else {
      rainTyresButton.disabled = false;
      rainTyresButton.classList.remove("disabled");
    }

    // Paint Options
    const redPaintButton = document.getElementById("shopBuyRedPaintButton");
    const bluePaintButton = document.getElementById("shopBuyBluePaintButton");
    const greenPaintButton = document.getElementById("shopBuyGreenPaintButton");
    const pinkPaintButton = document.getElementById("shopBuyPinkPaintButton");

    if (game.carPaint && game.carPaint.unlocked) {
      redPaintButton.disabled = game.aether < 200;
      bluePaintButton.disabled = game.aether < 200;
      greenPaintButton.disabled = game.aether < 200;
      pinkPaintButton.disabled = game.aether < 500;
      redPaintButton.classList.toggle("disabled", redPaintButton.disabled);
      bluePaintButton.classList.toggle("disabled", bluePaintButton.disabled);
      greenPaintButton.classList.toggle("disabled", greenPaintButton.disabled);
      pinkPaintButton.classList.toggle("disabled", pinkPaintButton.disabled);
    } else {
      redPaintButton.disabled = true;
      bluePaintButton.disabled = true;
      greenPaintButton.disabled = true;
      pinkPaintButton.disabled = true;
      redPaintButton.classList.add("disabled");
      bluePaintButton.classList.add("disabled");
      greenPaintButton.classList.add("disabled");
      pinkPaintButton.classList.add("disabled");
    }
  }

  function formatNumber(num) {
    if (num < 1000) return num.toFixed(0);
    let exponent = Math.floor(Math.log10(num));
    let mantissa = num / Math.pow(10, exponent);
    return mantissa.toFixed(2) + "e" + exponent;
  }

  function saveGame() {
    localStorage.setItem("neonAetherSave", JSON.stringify(game));
  }

  // Idle Upgrades
  document.getElementById("shopBuyClickUpgradeButton").addEventListener("click", () => {
    if (game.aether >= game.upgrades.clickEfficiency.cost) {
      game.aether -= game.upgrades.clickEfficiency.cost;
      game.upgrades.clickEfficiency.level++;
      game.clickMultiplier = 1 + game.upgrades.clickEfficiency.level * 0.5;
      game.upgrades.clickEfficiency.cost = Math.floor(game.upgrades.clickEfficiency.cost * game.upgrades.clickEfficiency.costMultiplier);
      updateShopDisplay();
      saveGame();
      alert("Click Efficiency upgraded!");
    } else {
      alert("Not enough Aether!");
    }
  });

  document.getElementById("shopBuyAutoClickerButton").addEventListener("click", () => {
    if (game.aether >= game.autoClickerCost) {
      game.aether -= game.autoClickerCost;
      game.autoClickers++;
      game.autoClickerCost = Math.floor(game.autoClickerCost * 1.15);
      updateShopDisplay();
      saveGame();
      alert("Auto-Clicker purchased!");
    } else {
      alert("Not enough Aether!");
    }
  });

  document.getElementById("shopBuyAutoEfficiencyButton").addEventListener("click", () => {
    if (game.aether >= game.upgrades.autoEfficiency.cost) {
      game.aether -= game.upgrades.autoEfficiency.cost;
      game.upgrades.autoEfficiency.level++;
      game.upgrades.autoEfficiency.cost = Math.floor(game.upgrades.autoEfficiency.cost * game.upgrades.autoEfficiency.costMultiplier);
      updateShopDisplay();
      saveGame();
      alert("Auto Efficiency upgraded!");
    } else {
      alert("Not enough Aether!");
    }
  });

  document.getElementById("shopBuyEngineUpgradeButton").addEventListener("click", () => {
    if (game.car.techTokens >= game.car.engineUpgrade.cost) {
      game.car.techTokens -= game.car.engineUpgrade.cost;
      game.car.engineUpgrade.level++;
      game.car.speed += game.car.engineUpgrade.speedBonus;
      game.car.engineUpgrade.cost = Math.floor(game.car.engineUpgrade.cost * game.car.engineUpgrade.costMultiplier);
      updateShopDisplay();
      saveGame();
      alert("Engine upgraded!");
    } else {
      alert("Not enough Tech Tokens!");
    }
  });

  document.getElementById("shopBuyEfficiencyUpgradeButton").addEventListener("click", () => {
    if (game.car.techTokens >= game.car.efficiencyUpgrade.cost) {
      game.car.techTokens -= game.car.efficiencyUpgrade.cost;
      game.car.efficiencyUpgrade.level++;
      game.car.efficiencyUpgrade.cost = Math.floor(game.car.efficiencyUpgrade.cost * game.car.efficiencyUpgrade.costMultiplier);
      updateShopDisplay();
      saveGame();
      alert("Fuel Efficiency upgraded!");
    } else {
      alert("Not enough Tech Tokens!");
    }
  });

  document.getElementById("shopBuyTankUpgradeButton").addEventListener("click", () => {
    if (game.car.techTokens >= game.car.tankUpgrade.cost) {
      game.car.techTokens -= game.car.tankUpgrade.cost;
      game.car.tankUpgrade.level++;
      game.car.maxFuel += game.car.tankUpgrade.fuelBonus;
      game.car.tankUpgrade.cost = Math.floor(game.car.tankUpgrade.cost * game.car.tankUpgrade.costMultiplier);
      updateShopDisplay();
      saveGame();
      alert("Fuel Tank upgraded!");
    } else {
      alert("Not enough Tech Tokens!");
    }
  });

  document.getElementById("shopBuySnowTyresButton").addEventListener("click", () => {
    if (!game.car.snowTyres && game.car.techTokens >= game.car.snowTyresCost) {
      game.car.techTokens -= game.car.snowTyresCost;
      game.car.snowTyres = true;
      updateShopDisplay();
      saveGame();
      alert("Snow Tyres equipped!");
    } else {
      alert("Snow Tyres are already equipped or insufficient Tech Tokens!");
    }
  });

  document.getElementById("shopBuyRainTyresButton").addEventListener("click", () => {
    if (!game.car.rainTyres && game.car.techTokens >= game.car.rainTyresCost) {
      game.car.techTokens -= game.car.rainTyresCost;
      game.car.rainTyres = true;
      updateShopDisplay();
      saveGame();
      alert("Rain Tyres equipped!");
    } else {
      alert("Rain Tyres are already equipped or insufficient Tech Tokens!");
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
    updateShopDisplay();
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
    updateShopDisplay();
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
    updateShopDisplay();
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
    updateShopDisplay();
    saveGame();
    alert("Your car is now Neon Pink!");
  });

  updateShopDisplay();

  // Utility function: Format numbers
  function formatNumber(num) {
    if (num < 1000) return num.toFixed(0);
    let exponent = Math.floor(Math.log10(num));
    let mantissa = num / Math.pow(10, exponent);
    return mantissa.toFixed(2) + "e" + exponent;
  }
});
