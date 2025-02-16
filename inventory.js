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
      let innerHTML = "";

      // Check the item type and display accordingly
      if (item.type === "aether_crystal") {
        // Display the aether icon with scaling properties
        innerHTML = `<img src="images/aether.png" alt="${item.name}" class="inventory-item-image">`;
        // If more than one, add the quantity overlay
        if (item.amount > 1) {
          innerHTML += `<span class="inventory-item-count">${item.amount}</span>`;
        }
      } else {
        // For other items, display as text
        innerHTML = `<p>${item.name}</p>`;
      }

      // Add the "Use" button after the item display
      innerHTML += `<button>Use</button>`;
      slotDiv.innerHTML = innerHTML;

      // Attach the event listener to the "Use" button
      slotDiv.querySelector("button").addEventListener("click", () => {
        if (item.type === "aether_crystal") {
          game.aether += item.amount;
          alert(`Used ${item.name}, gained ${item.amount} Aether!`);
        } else if (item.type === "computer_parts") {
          game.stats.hackingPoints += item.amount;
          alert(`Used ${item.name}, gained 100 hacking points!`);
        }
        // Remove the item from the garage inventory
        game.garage.splice(i, 1);
        // Save changes and refresh the UI
        localStorage.setItem("neonAetherSave", JSON.stringify(game));
        location.reload();
      });
    } else {
      slotDiv.innerHTML = ""; // Empty slot
    }
  }
});
