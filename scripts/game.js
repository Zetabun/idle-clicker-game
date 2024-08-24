let cells = 0;
let cellReproductionUnits = 0; // Number of Cell Reproduction units owned
let cps = 0;
let gameLoopInterval;

const initialReproductionCost = 10;
const reproductionCostFactor = 1.15;
const baseMultiplier = 1.1; // Base multiplier for each unit owned

// DOM Elements
const cellCountElement = document.getElementById('cell-count');
const clickerButton = document.getElementById('clicker-button');
const reproduceButton = document.getElementById('reproduce-button');
const resetGameButton = document.getElementById('reset-game'); // Reset button element

// Event Listeners
if (clickerButton) {
    clickerButton.addEventListener('click', generateCell);
}
if (reproduceButton) {
    reproduceButton.addEventListener('click', purchaseReproductionUnit);
}
if (resetGameButton) {
    resetGameButton.addEventListener('click', resetGame); // Add event listener for reset
}

// Core Functions
function generateCell() {
    cells += 1;
    updateCellCount();
}

function calculateOutputPerTick() {
    const multiplier = calculateMultiplier(cellReproductionUnits);
    return cellReproductionUnits > 0 ? Math.floor(cellReproductionUnits * multiplier) : 0; // Use Math.floor to ensure whole numbers
}

function calculateCPS() {
    const cellCPS = calculateOutputPerTick(); // Not rounded
    const tissueCPS = Math.floor(calculateTissueOutputPerTick()); // Rounded down to ensure whole numbers
    const organCPS = Math.floor(calculateOrganCellOutputPerTick()); // Rounded down to ensure whole numbers
    
    cps = cellCPS + tissueCPS + organCPS; // Ensure organCPS is added

    // Ensure cps is not rounded up from 0 to 1
    if (cps < 1) {
        cps = 0;
    }

    console.log(`cellCPS: ${cellCPS}, tissueCPS: ${tissueCPS}, organCPS: ${organCPS}, total cps: ${cps}`);

    if (document.getElementById('cps-value')) {
        document.getElementById('cps-value').textContent = cps;
    }

    return cps;
}

function updateCellCount() {
    if (cellCountElement) {
        cellCountElement.textContent = cells;
    }
    updateReproductionButton();
    checkTissuesUnlock(); // Check if Tissues section should be unlocked
    checkOrgansUnlock(); // Check if Organs section should be unlocked
    calculateCPS(); // Update CPS display
    saveGameState(); // Call to save the game state
}

function calculateReproductionCost(units) {
    return Math.round(initialReproductionCost * Math.pow(reproductionCostFactor, units));
}

function calculateMultiplier(units) {
    return 1 + (units * 0.1); // Each unit adds a 10% bonus to production
}

function updateReproductionButton() {
    const cost = calculateReproductionCost(cellReproductionUnits);
    const outputPerTick = calculateOutputPerTick();

    let buttonText = `Cell Reproduction (Cost: ${cost} Cells) - Output per Tick: ${outputPerTick} - Owned: ${cellReproductionUnits}`; // Removed .toFixed(2)

    if (reproduceButton) { // Check if element exists
        reproduceButton.textContent = buttonText;
        reproduceButton.disabled = cells < cost;
    }
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
        // Reset Cells
        cells = 0;
        cellReproductionUnits = 0;
        resetAutomation(); // Reset cell automation state

        // Reset Tissues and Organs
        tissues = 0;
        tissueReproductionUnits = 0;
        tissuesUnlocked = false;
        resetTissueAutomation(); // Reset tissue automation state

        organs = 0; // Ensure organs are reset to 0
        organReproductionUnits = 0;
        organsUnlocked = false;
        resetOrganAutomation(); // Reset organ automation state

        cps = 0; // Ensure CPS is reset to 0

        updateTissueCount(); // Ensure tissue count is reset
        updateOrganCount(); // Ensure organ count is reset
        updateCellCount(); // Ensure cell count is reset

        // Update UI
        if (document.getElementById('tissues-section')) {
            document.getElementById('tissues-section').classList.add('hidden'); // Hide the tissues section
        }
        if (document.getElementById('organs-section')) {
            document.getElementById('organs-section').classList.add('hidden'); // Hide the organs section
        }
        if (document.getElementById('tissue-clicker-button')) {
            document.getElementById('tissue-clicker-button').disabled = true; // Disable the tissues clicker button
        }
        if (document.getElementById('organ-clicker-button')) {
            document.getElementById('organ-clicker-button').disabled = true; // Disable the organs clicker button
        }

        // Clear saved game state
        localStorage.removeItem('alienGameSave');
        alert("Game reset! You can start a new game.");
    }
}

function startGameLoop() {
    loadGameState(); // Load the game state when the game starts

    gameLoopInterval = setInterval(() => {
        cells += cps; // Increase cells based on CPS
        if (cellCountElement) {
            cellCountElement.textContent = cells;
        }
        saveGameState(); // Save the game state at regular intervals
    }, 1000); // Update every 1 second
}

// Use a single load event listener for game initialization
window.addEventListener('load', () => {
    startGameLoop();
    checkTissuesUnlock();
    checkOrgansUnlock();
});
