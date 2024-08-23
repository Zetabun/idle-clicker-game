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

// cps
function calculateCPS() {
    const cellCPS = calculateOutputPerTick(); // Cells per second from Cells automation
    const tissueCPS = calculateTissueOutputPerTick(); // Cells per second from Tissues automation
    const totalCPS = cellCPS + tissueCPS; // Total Cells per second

    document.getElementById('cps-value').textContent = totalCPS;
}

function updateCellCount() {
    cellCountElement.textContent = cells;
    updateReproductionButton();
    checkTissuesUnlock(); // Check if Tissues section should be unlocked
    calculateCPS(); // Update CPS display
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

// game.js
function resetGame() {
    const confirmReset = confirm("Are you sure you want to start a new game? This will erase all your progress.");
    if (confirmReset) {
        // Reset Cells
        cells = 0;
        cellReproductionUnits = 0;
        resetAutomation(); // Reset cell automation state

        // Reset Tissues
        tissues = 0;
        tissueReproductionUnits = 0;
        tissuesUnlocked = false; // Reset tissues unlock state
        resetTissueAutomation(); // Reset tissue automation state
        updateTissueCount(); // Ensure tissue count is reset

        // Update UI
        updateCellCount();
        tissueSection.classList.add('hidden'); // Hide the tissues section
        tissueClickerButton.disabled = true; // Disable the tissues clicker button

        // Clear saved game state
        localStorage.removeItem('alienGameSave');
        alert("Game reset! You can start a new game.");
    }
}

