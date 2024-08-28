let cells = 0;
let cellReproductionUnits = 0; // Number of Cell Reproduction units owned
let cps = 0;
let gameLoopInterval;
let featureUnlocked = false; // Added to track the feature unlock state
let cellFarmUnlocked = false; // Initialize as false


const initialReproductionCost = 10;
const reproductionCostFactor = 1.15;
const baseMultiplier = 1.1;

// DOM Elements
const cellCountElement = document.getElementById('cell-count');
const clickerButton = document.getElementById('clicker-button');
const reproduceButton = document.getElementById('reproduce-button');
const resetGameButton = document.getElementById('reset-game');

// Event Listeners
if (clickerButton) {
    clickerButton.addEventListener('click', generateCell);
}
if (reproduceButton) {
    reproduceButton.addEventListener('click', purchaseReproductionUnit);
}
if (resetGameButton) {
    resetGameButton.addEventListener('click', resetGame);
}

function generateCell() {
    cells += 1;
    updateCellCount();
}

function calculateOutputPerTick() {
    const multiplier = calculateMultiplier(cellReproductionUnits);
    return cellReproductionUnits > 0 ? Math.floor(cellReproductionUnits * multiplier) : 0;
}

function calculateCPS() {
    const cellCPS = calculateOutputPerTick();
    const tissueCPS = Math.floor(calculateTissueOutputPerTick());
    const organCPS = Math.floor(calculateOrganCellOutputPerTick());
    const organSystemCPS = Math.floor(calculateOrganSystemCellOutputPerTick());

    cps = cellCPS + tissueCPS + organCPS + organSystemCPS;

    if (cps < 1) {
        cps = 0;
    }

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
    checkTissuesUnlock();
    checkOrgansUnlock();   // Ensure organs unlock check happens immediately
    checkOrganSystemsUnlock();  // Ensure organ systems unlock check happens immediately
    calculateCPS();
    saveGameState();
    checkNewsMilestones(); // Call to check for news milestones
}

function updateReproductionButton() {
    const reproductionInfo = document.getElementById('reproduction-info');
    const owned = cellReproductionUnits; // The number of units the player currently owns
    const cost = calculateReproductionCost(owned); // Calculate the cost for the next unit
    const outputPerTick = calculateOutputPerTick(); // Existing function to calculate output per tick

    if (reproductionInfo) {
        reproductionInfo.innerHTML = `
            <b>Cell Reproduction</b> <br><span style="color: #f05454;">(Cost: ${cost} Cells)</span><br>
            <b>Output per Tick</b>${outputPerTick}<br>
            <b>Owned</b> ${owned}
        `;
    }

    reproduceButton.disabled = cells < cost; // Disable button if player can't afford the upgrade
}


function calculateReproductionCost(units) {
    return Math.round(initialReproductionCost * Math.pow(reproductionCostFactor, units));
}

function calculateMultiplier(units) {
    return 1 + (units * 0.1);
}

function purchaseReproductionUnit() {
    const cost = calculateReproductionCost(cellReproductionUnits);
    if (cells >= cost) {
        cells -= cost;
        cellReproductionUnits += 1;
        updateCellCount(); // Trigger immediate update after purchasing
        startAutomation();
    }
}

function resetGame() {
    const confirmReset = confirm("Are you sure you want to start a new game? This will erase all your progress.");
    if (confirmReset) {
        // Reset cells
        cells = 0;
        cellReproductionUnits = 0;
        resetAutomation();

        // Reset tissues
        tissues = 0;
        tissueReproductionUnits = 0;
        tissuesUnlocked = false;
        resetTissueAutomation();

        // Reset organs
        organs = 0;
        organReproductionUnits = 0;
        organsUnlocked = false;
        resetOrganAutomation();
        
        // Reset organ systems
        organSystems = 0;
        organSystemReproductionUnits = 0;
        organSystemsUnlocked = false;
        resetOrganSystemAutomation();

        // Reset clicks per second (cps)
        cps = 0;

        // Reset feature unlocked state
        featureUnlocked = false;

        // Update UI elements
        updateTissueCount();
        updateOrganCount();
        updateCellCount();
        updateOrganSystemCount();

        // Hide sections
        if (document.getElementById('tissues-section')) {
            document.getElementById('tissues-section').classList.add('hidden');
        }
        if (document.getElementById('organs-section')) {
            document.getElementById('organs-section').classList.add('hidden');
        }
        if (document.getElementById('organ-systems-section')) {
            document.getElementById('organ-systems-section').classList.add('hidden');
        }

        // Disable buttons
        if (document.getElementById('tissue-clicker-button')) {
            document.getElementById('tissue-clicker-button').disabled = true;
        }
        if (document.getElementById('organ-clicker-button')) {
            document.getElementById('organ-clicker-button').disabled = true;
        }
        if (document.getElementById('organ-system-clicker-button')) {
            document.getElementById('organ-system-clicker-button').disabled = true;
        }

        // Reset the unlock button
        const unlockButton = document.getElementById('unlock-button');
        if (unlockButton) {
            unlockButton.textContent = 'Cell Farm (Locked)';
            unlockButton.classList.add('locked');
            unlockButton.style.backgroundColor = '#555555'; // Re-lock the button visually
            unlockButton.disabled = false; // Keep it clickable for the alert
            unlockButton.removeEventListener('click', unlockFeature);
            unlockButton.addEventListener('click', showInsufficientResourcesMessage);
        }

        // Remove game save from localStorage
        localStorage.removeItem('alienGameSave');

        // Alert user that the game has been reset
        alert("Game reset! You can start a new game.");
    }
}

function startGameLoop() {
    loadGameState();
    calculateCPS();  // Ensure CPS is recalculated after loading the game state

    gameLoopInterval = setInterval(() => {
        cells += cps;
        if (cellCountElement) {
            cellCountElement.textContent = cells;
        }
        saveGameState();
    }, 1000);

    // Ensure UI checks happen on each game loop
    setInterval(() => {
        checkTissuesUnlock();
        checkOrgansUnlock();
        checkOrganSystemsUnlock();
        checkNewsMilestones();
    }, 1000); // Adjust interval as needed
}

window.addEventListener('load', () => {
    startGameLoop();
});


window.onload = function() {
    updateReproductionButton();
};