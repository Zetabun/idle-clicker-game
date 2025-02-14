document.addEventListener("DOMContentLoaded", () => {
  // Load game state from localStorage
  let gameState = localStorage.getItem("neonAetherSave");
  if (!gameState) {
    alert("No saved game found. Please start the game first.");
    return;
  }
  let game = JSON.parse(gameState);

  // Make sure game.garage array exists
  if (!Array.isArray(game.garage)) {
    game.garage = [];
  }

  // Display resources
  function formatNumber(num) {
    if (num < 1000) return num.toFixed(0);
    let exponent = Math.floor(Math.log10(num));
    let mantissa = num / Math.pow(10, exponent);
    return mantissa.toFixed(2) + "e" + exponent;
  }
  document.getElementById("inventoryAether").textContent = formatNumber(game.aether);
  document.getElementById("inventoryNeonCores").textContent = game.prestige.neonCores;
  document.getElementById("inventoryPrestigeCount").textContent = game.prestige.count;

  // Populate the 24 garage slots
  const maxSlots = 24;
  for (let i = 0; i < maxSlots; i++) {
    let slotDiv = document.getElementById("garageSlot" + i);
    if (i < game.garage.length) {
      let item = game.garage[i];
      slotDiv.innerHTML = `
        <p>${item.name}</p>
        <button>Use</button>
      `;
      // If user clicks Use, apply item effect
      slotDiv.querySelector("button").addEventListener("click", () => {
        if (item.type === "aether_crystal") {
          game.aether += item.amount;
          alert(`Used ${item.name}, gained 1000 Aether!`);
        } else if (item.type === "computer_parts") {
          game.stats.hackingPoints += item.amount;
          alert(`Used ${item.name}, gained 100 hacking points!`);
        }
        // Remove item from the garage
        game.garage.splice(i, 1);
        // Save and refresh
        localStorage.setItem("neonAetherSave", JSON.stringify(game));
        location.reload();
      });
    } else {
      slotDiv.innerHTML = ""; // Empty
    }
  }
});