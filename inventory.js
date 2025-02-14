document.addEventListener("DOMContentLoaded", () => {
  // Load game state from localStorage
  let gameState = localStorage.getItem("neonAetherSave");
  if (!gameState) {
    alert("No saved game found. Please start the game first.");
    return;
  }
  let game = JSON.parse(gameState);

  function formatNumber(num) {
    if (num < 1000) return num.toFixed(0);
    let exponent = Math.floor(Math.log10(num));
    let mantissa = num / Math.pow(10, exponent);
    return mantissa.toFixed(2) + "e" + exponent;
  }

  document.getElementById("inventoryAetherAmount").textContent = formatNumber(game.aether);
  document.getElementById("inventoryNeonCores").textContent = game.prestige.neonCores;
  document.getElementById("inventoryPrestigeCount").textContent = game.prestige.count;
});
