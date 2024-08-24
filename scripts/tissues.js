let tissues = 0;
let tissueReproductionUnits = 0; // Number of Tissue Reproduction units owned
let tissuesUnlocked = false; // Flag to check if tissues have been unlocked

const tissueInitialReproductionCost = 100; // Initial cost in cells
const tissueInitialTissueCost = 50; // Initial cost in tissues
const tissueReproductionCostFactor = 1.2;
const tissueBaseMultiplier = 2; // Base multiplier for each tissue unit owned
const tissueProductionMultiplier = 0.5; // Multiplier for tissue production from automation

let tissueAutomationInterval;
let tissueAutomationProgress = 0;

// DOM Elements for Tissues
const tissueClickerButton = document.getElementById('tissue-clicker-button');
const tissueReproduceButton = document.getElementById('tissue-reproduce-button');

if (tissueClickerButton) {
    tissueClickerButton.addEventListener('click', generateTissue);
}

if (tissueReproduceButton) {
    tissueReproduceButton.addEventListener('click', purchaseTissueReproductionUnit);
}

// Core Functions
function generateTissue() {
    tissues += tissueBaseMultiplier; // Tissues generated directly add to tissue count
    updateTissueCount();
}

function updateTissueCount() {
    const tissueCountElement = document.getElementById('tissue-count');
    if (tissueCountElement) {
        tissueCountElement.textContent = tissues;
        updateTissueReproductionButton();
        saveGameState(); // Call to save the game state
    }
}

function calculateTissueReproductionCost(units) {
    return Math.round(tissueInitialReproductionCost * Math.pow(tissueReproductionCostFactor, units));
}

function calculateTissueMultiplier(units) {
    return 1 + (units * 0.2); // Each unit adds a 20% bonus to production
}

function calculateTissueOutputPerTick() {
    const multiplier = calculateTissueMultiplier(tissueReproductionUnits);
    return tissueReproductionUnits > 0 ? Math.floor(tissueReproductionUnits * multiplier * tissueBaseMultiplier) : 0; // Use Math.floor
}

function calculateTissueProductionPerTick() {
    return tissueReproductionUnits > 0 ? Math.floor(tissueReproductionUnits * tissueProductionMultiplier) : 0; // Use Math.floor
}

function updateTissueReproductionButton() {
    const cellCost = calculateTissueReproductionCost(tissueReproductionUnits);
    const tissueCost = tissueInitialTissueCost; // Tissue cost remains constant
    const tissueOutputPerTick = Math.floor(calculateTissueProductionPerTick()); // Rounded down to ensure whole numbers
    const cellOutputPerTick = Math.floor(calculateTissueOutputPerTick()); // Rounded down to ensure whole numbers

    let buttonText = `Tissue Reproduction (Cost: ${Math.round(cellCost)}C/${Math.round(tissueCost)}T) - Output per Tick: ${cellOutputPerTick}C/${tissueOutputPerTick}T - Owned: ${tissueReproductionUnits}`; // Removed .toFixed(2)

    if (tissueReproduceButton) {
        tissueReproduceButton.textContent = buttonText;
        tissueReproduceButton.disabled = cells < cellCost || tissues < tissueCost; // Disable button if resources are insufficient
    }
}

function purchaseTissueReproductionUnit() {
    const cellCost = calculateTissueReproductionCost(tissueReproductionUnits);
    const tissueCost = tissueInitialTissueCost; // Constant tissue cost

    if (cells >= cellCost && tissues >= tissueCost) { // Require sufficient cells and tissues
        cells -= cellCost;
        tissues -= tissueCost;
        tissueReproductionUnits += 1;
        updateCellCount();
        updateTissueCount();
        startTissueAutomation(); // Call to start tissue automation
    } else {
        alert(`You need at least ${Math.round(cellCost)} cells and ${Math.round(tissueCost)} tissues to purchase tissue automation.`); // Alert if requirements are not met
    }
}

function startTissueAutomation() {
    const tissueAutomationSection = document.getElementById('tissue-automation-section');
    if (tissueReproductionUnits > 0 && tissuesUnlocked && tissueAutomationSection) { // Ensure tissues are unlocked
        clearInterval(tissueAutomationInterval);
        tissueAutomationSection.classList.remove('hidden'); // Show tissue automation section
        tissueAutomationInterval = setInterval(() => {
            tissueAutomationProgress += 10; // Progress increases by 10% every second

            if (tissueAutomationProgress >= 100) {
                tissueAutomationProgress = 0;
                const tissueOutputPerTick = Math.floor(calculateTissueProductionPerTick()); // Get the output per tick for tissues
                const cellOutputPerTick = Math.floor(calculateTissueOutputPerTick()); // Get the output per tick for cells

                tissues += tissueOutputPerTick; // Add the output per tick to tissues
                cells += cellOutputPerTick; // Add the output per tick to cells
                updateTissueCount();
                updateCellCount();
            }

            updateTissueAutomationProgress(); // Update the visual progress bar
        }, 1000); // 1-second interval for automation
    }
}

function updateTissueAutomationProgress() {
    const tissueAutomationProgressElement = document.getElementById('tissue-automation-progress');
    if (tissueAutomationProgressElement) {
        tissueAutomationProgressElement.style.width = `${tissueAutomationProgress}%`;
    }
}

function resetTissueAutomation() {
    clearInterval(tissueAutomationInterval); // Stop any ongoing tissue automation
    tissueAutomationProgress = 0;
    const tissueAutomationProgressElement = document.getElementById('tissue-automation-progress');
    if (tissueAutomationProgressElement) {
        tissueAutomationProgressElement.style.width = `0%`; // Reset the progress bar
    }
    const tissueAutomationSection = document.getElementById('tissue-automation-section');
    if (tissueAutomationSection) {
        tissueAutomationSection.classList.add('hidden'); // Hide the tissue automation section
    }
    tissueReproductionUnits = 0; // Reset the number of tissue reproduction units
    updateTissueReproductionButton(); // Update the UI for tissue reproduction button
}

function checkTissuesUnlock() {
    if (cells >= 100 && !tissuesUnlocked) {
        tissuesUnlocked = true; // Set flag to true once unlocked
        const tissueSection = document.getElementById('tissues-section');
        const tissueClickerButton = document.getElementById('tissue-clicker-button');

        if (tissueSection) {
            tissueSection.classList.remove('hidden');
        }
        if (tissueClickerButton) {
            tissueClickerButton.disabled = false;
        }
        startTissueAutomation(); // Start tissue automation when unlocked
        saveGameState(); // Save the unlocked state
    }
}

// Ensure the tissues functionality is initialized when the game loads
window.addEventListener('load', () => {
    const tissueSection = document.getElementById('tissues-section');
    const tissueClickerButton = document.getElementById('tissue-clicker-button');

    if ((tissuesUnlocked || cells >= 100) && tissueSection) {
        tissueSection.classList.remove('hidden');
        if (tissueClickerButton) {
            tissueClickerButton.disabled = false;
        }
        startTissueAutomation(); // Ensure tissue automation starts if conditions are met
    }
    checkTissuesUnlock(); // Check tissues unlock status on load
});
