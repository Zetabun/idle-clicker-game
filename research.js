document.addEventListener("DOMContentLoaded", () => {
  // Load game state from localStorage
  let gameState = localStorage.getItem("neonAetherSave");
  if (!gameState) {
    alert("No saved game found. Please start the game first.");
    return;
  }
  let game = JSON.parse(gameState);

  // We'll store some research states in an object, if not present
  if (!game.research) {
    game.research = {};
  }
  // Car Paint Job: cost 1000 Aether, requires 10 miles + 10 minutes
  if (!game.research.carPaintJob) {
    game.research.carPaintJob = {
      cost: 1000,
      milesRequired: 10,
      timeRequired: 600, // 10 minutes in seconds
      inProgress: false,
      startTime: 0,
      timeLeft: 0,
      completed: false
    };
  }

  // DOM references
  const aetherElem = document.getElementById("researchAetherAmount");
  const neonCoresElem = document.getElementById("researchNeonCores");
  const prestigeCountElem = document.getElementById("researchPrestigeCount");
  const carPaintJobButton = document.getElementById("carPaintJobButton");
  const carPaintJobStatus = document.getElementById("carPaintJobStatus");

  // Update top resource display
  function updateResourceDisplay() {
    aetherElem.textContent = formatNumber(game.aether);
    neonCoresElem.textContent = game.prestige.neonCores;
    prestigeCountElem.textContent = game.prestige.count;
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

  // Car Paint Job logic
  function updateCarPaintJobUI() {
    let cpj = game.research.carPaintJob;
    if (cpj.completed) {
      carPaintJobButton.disabled = true;
      carPaintJobButton.textContent = "Completed!";
      carPaintJobStatus.textContent = "You have a new paint job on your car!";
    } else if (cpj.inProgress) {
      carPaintJobButton.disabled = true;
      carPaintJobButton.textContent = "Researching...";
      let minutes = Math.ceil(cpj.timeLeft / 60);
      carPaintJobStatus.textContent = `Time left: ${minutes} min`;
    } else {
      // not in progress, not completed
      carPaintJobButton.disabled = false;
      carPaintJobButton.textContent = "Start Research";
      carPaintJobStatus.textContent = "";
    }
  }

  function startCarPaintJob() {
    let cpj = game.research.carPaintJob;
    // Check requirements:
    if (game.aether < cpj.cost) {
      alert("Not enough Aether!");
      return;
    }
    if (game.car.miles < cpj.milesRequired) {
      alert(`You need at least ${cpj.milesRequired} miles traveled to start this research.`);
      return;
    }
    // Deduct cost, start timer
    game.aether -= cpj.cost;
    cpj.inProgress = true;
    cpj.startTime = Date.now();
    cpj.timeLeft = cpj.timeRequired; // 600 seconds
    updateResourceDisplay();
    updateCarPaintJobUI();
    saveGame();
    alert("Research started: Car Paint Job!");
  }

  // We'll run a small loop to update the timeLeft if in progress
  function updateResearchProgress() {
    let cpj = game.research.carPaintJob;
    if (cpj.inProgress && !cpj.completed) {
      let now = Date.now();
      let elapsed = Math.floor((now - cpj.startTime) / 1000);
      let remain = cpj.timeRequired - elapsed;
      if (remain <= 0) {
        cpj.inProgress = false;
        cpj.completed = true;
        cpj.timeLeft = 0;
        updateCarPaintJobUI();
        saveGame();
        alert("Car Paint Job research completed! Enjoy your new paint job!");
      } else {
        cpj.timeLeft = remain;
        updateCarPaintJobUI();
      }
    }
  }

  // Event listener for Car Paint Job button
  carPaintJobButton.addEventListener("click", () => {
    let cpj = game.research.carPaintJob;
    if (!cpj.inProgress && !cpj.completed) {
      startCarPaintJob();
    }
  });

  // On load
  updateResourceDisplay();
  updateCarPaintJobUI();
  // small loop to update the countdown every second
  setInterval(() => {
    updateResearchProgress();
  }, 1000);

  // also update the top resource display every 2s in case user is
  // passively gaining resources from offline/other pages
  setInterval(() => {
    // re-load the game from localStorage in case user gained resources in index page
    let updated = localStorage.getItem("neonAetherSave");
    if (updated) {
      game = JSON.parse(updated);
      // re-check if research changed
    }
    updateResourceDisplay();
    updateCarPaintJobUI();
  }, 2000);
});

