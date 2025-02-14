document.addEventListener("DOMContentLoaded", () => {
  // Load game state from localStorage
  let gameState = localStorage.getItem("neonAetherSave");
  if (!gameState) {
    alert("No saved game found. Please start the game first.");
    return;
  }
  let game = JSON.parse(gameState);

  // Helper: update shop display with upgrade values and resource info
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

    // Car Upgrades
    document.getElementById("shopEngineUpgradeCost").textContent = game.car.engineUpgrade.cost;
    document.getElementById("shopEngineUpgradeLevel").textContent = game.car.engineUpgrade.level;
    document.getElementById("shopEfficiencyUpgradeCost").textContent = game.car.efficiencyUpgrade.cost;
    document.getElementById("shopEfficiencyUpgradeLevel").textContent = game.car.efficiencyUpgrade.level;
    document.getElementById("shopTankUpgradeCost").textContent = game.car.tankUpgrade.cost;
    document.getElementById("shopTankUpgradeLevel").textContent = game.car.tankUpgrade.level;

    // Tyre Upgrades
    document.getElementById("shopSnowTyresCost").textContent = game.car.snowTyresCost;
    document.getElementById("shopSnowTyresStatus").textContent = game.car.snowTyres ? "Equipped" : "Not Equipped";
    document.getElementById("shopRainTyresCost").textContent = game.car.rainTyresCost;
    document.getElementById("shopRainTyresStatus").textContent = game.car.rainTyres ? "Equipped" : "Not Equipped";

    // Paint Options: disable if Car Paint not unlocked
    const redButton = document.getElementById("shopBuyRedPaintButton");
    const blueButton = document.getElementById("shopBuyBluePaintButton");
    const greenButton = document.getElementById("shopBuyGreenPaintButton");
    const pinkButton = document.getElementById("shopBuyPinkPaintButton");
    if (game.carPaint && game.carPaint.unlocked) {
      redButton.disabled = false;
      blueButton.disabled = false;
      greenButton.disabled = false;
      pinkButton.disabled = false;
    } else {
      redButton.disabled = true;
      blueButton.disabled = true;
      greenButton.disabled = true;
      pinkButton.disabled = true;
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

  // Car Upgrades
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

  // Tyre Upgrades
  document.getElementById("shopBuySnowTyresButton").addEventListener("click", () => {
    if (!game.car.snowTyres) {
      if (game.car.techTokens >= game.car.snowTyresCost) {
        game.car.techTokens -= game.car.snowTyresCost;
        game.car.snowTyres = true;
        updateShopDisplay();
        saveGame();
        alert("Snow Tyres equipped!");
      } else {
        alert("Not enough Tech Tokens!");
      }
    } else {
      alert("Snow Tyres are already equipped!");
    }
  });

  document.getElementById("shopBuyRainTyresButton").addEventListener("click", () => {
    if (!game.car.rainTyres) {
      if (game.car.techTokens >= game.car.rainTyresCost) {
        game.car.techTokens -= game.car.rainTyresCost;
        game.car.rainTyres = true;
        updateShopDisplay();
        saveGame();
        alert("Rain Tyres equipped!");
      } else {
        alert("Not enough Tech Tokens!");
      }
    } else {
      alert("Rain Tyres are already equipped!");
    }
  });

  // Paint Options (require Car Paint research to be complete)
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
});
