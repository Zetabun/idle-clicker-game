// game.js
let cells = 0;
let cellReproductionUnits = 0; // Number of Cell Reproduction units owned

const initialReproductionCost = 10;
const reproductionCostFactor = 1.15;
const baseMultiplier = 1.1; // Base multiplier for each unit owned

// DOM Elements
const cellCountElement = document.getElementById('cell-count');
const clickerButton = document.getElementById('clicker-button');
const reproduceButton = document.getElementById('reproduce-button');
const resetGameButton = document.getElementById('reset-game'); // Reset button element

// Event Listeners
clickerButton.addEventListener('click', generateCell);
reproduceButton.addEventListener('click', purchaseReproductionUnit);
resetGameButton.addEventListener('click', resetGame); // Add event listener for reset

// Core Functions
function generateCell() {
    cells += 1;
    updateCellCount();
}

function updateCellCount() {
    cellCountElement.textContent = cells;
    updateReproductionButton();
    saveGameState(); // Call to save the game state
}

function calculateReproductionCost(units) {
    return Math.floor(initialReproductionCost * Math.pow(reproductionCostFactor, units));
}

function calculateMultiplier(units) {
    return 1 + (units * 0.1); // Each unit adds a 10% bonus to production
}

function calculateOutputPerTick() {
    const multiplier = calculateMultiplier(cellReproductionUnits);
    return Math.round(cellReproductionUnits * multiplier);
}

function updateReproductionButton() {
    const cost = calculateReproductionCost(cellReproductionUnits);
    const outputPerTick = calculateOutputPerTick();

    let buttonText = `Cell Reproduction (Cost: ${cost} Cells) - Output per Tick: ${outputPerTick} - Owned: ${cellReproductionUnits}`;

    reproduceButton.textContent = buttonText;
    reproduceButton.disabled = cells < cost;
}

function purchaseReproductionUnit() {
    const cost = calculateReproductionCost(cellReproductionUnits);
    if (cells >= cost) {
        cells -= cost;
        cellReproductionUnits += 1;
        updateCellCount();
        startAutomation(); // Call to start automation
    }
}


function resetGame() {
    const confirmReset = confirm("Are you sure you want to start a new game? This will erase all your progress.");
    if (confirmReset) {
        cells = 0;
        cellReproductionUnits = 0;
        resetAutomation(); // Reset automation state
        updateCellCount();
        localStorage.removeItem('alienGameSave'); // Clear saved game state
        alert("Game reset! You can start a new game.");
    }
}
