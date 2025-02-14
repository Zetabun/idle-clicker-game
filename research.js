document.addEventListener("DOMContentLoaded", () => {
  let gameState = localStorage.getItem("neonAetherSave");
  if (!gameState) {
    alert("No saved game found. Please start the game first.");
    return;
  }
  let game = JSON.parse(gameState);

  // Ensure research object
  if (!game.research) {
    game.research = {};
  }
  // Car Paint Job
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

  const aetherElem = document.getElementById("researchAetherAmount");
  const neonCoresElem = document.getElementById("researchNeonCores");
  const prestigeCountElem = document.getElementById("researchPrestigeCount");
  const carPaintJobButton = document.getElementById("carPaintJobButton");
  const carPaintJobStatus = document.getElementById("carPaintJobStatus");
  const progressBar = document.getElementById("carPaintJobProgressBar");

  function formatNumber(num) {
    if (num < 1000) return num.toFixed(0);
    let exponent = Math.floor(Math.log10(num));
    let mantissa = num / Math.pow(10, exponent);
    return mantissa.toFixed(2) + "e" + exponent;
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  }

  function updateResourceDisplay() {
    aetherElem.textContent = formatNumber(game.aether);
    neonCoresElem.textContent = game.prestige.neonCores;
    prestigeCountElem.textContent = game.prestige.count;
  }

  function saveGame() {
    localStorage.setItem("neonAetherSave", JSON.stringify(game));
  }

  function updateCarPaintJobUI() {
    let cpj = game.research.carPaintJob;
    if (cpj.completed) {
      carPaintJobButton.disabled = true;
      carPaintJobButton.textContent = "Completed!";
      carPaintJobStatus.textContent = "You have a new paint job on your car!";
      game.carPaint.unlocked = true;
      progressBar.style.width = "100%";
      saveGame();
    } else if (cpj.inProgress) {
      carPaintJobButton.disabled = true;
      carPaintJobButton.textContent = "Researching...";
      carPaintJobStatus.textContent = `Time left: ${formatTime(cpj.timeLeft)}`;
      let progressPercent = ((cpj.timeRequired - cpj.timeLeft) / cpj.timeRequired) * 100;
      progressBar.style.width = progressPercent + "%";
    } else {
      carPaintJobButton.disabled = false;
      carPaintJobButton.textContent = "Start Research";
      carPaintJobStatus.textContent = "";
      progressBar.style.width = "0%";
    }
  }

  function startCarPaintJob() {
    let cpj = game.research.carPaintJob;
    if (game.aether < cpj.cost) {
      alert("Not enough Aether!");
      return;
    }
    if (game.car.miles < cpj.milesRequired) {
      alert(`You need at least ${cpj.milesRequired} miles traveled to start this research.`);
      return;
    }
    game.aether -= cpj.cost;
    cpj.inProgress = true;
    cpj.startTime = Date.now();
    cpj.timeLeft = cpj.timeRequired;
    updateResourceDisplay();
    updateCarPaintJobUI();
    saveGame();
    alert("Research started: Car Paint Job!");
  }

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
        saveGame();
      }
    }
  }

  carPaintJobButton.addEventListener("click", () => {
    let cpj = game.research.carPaintJob;
    if (!cpj.inProgress && !cpj.completed) {
      startCarPaintJob();
    }
  });

  updateResourceDisplay();
  updateCarPaintJobUI();

  // Update progress every second
  setInterval(updateResearchProgress, 1000);
});
