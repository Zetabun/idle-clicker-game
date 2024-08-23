// tissues.js
let tissues = 0;
let tissueReproductionUnits = 0; // Number of Tissue Reproduction units owned
let tissuesUnlocked = false; // Flag to check if tissues have been unlocked

const tissueInitialReproductionCost = 100; // Initial cost in cells
const tissueInitialTissueCost = 50; // Initial cost in tissues
const tissueReproductionCostFactor = 1.2;
const tissueBaseMultiplier = 2; // Base multiplier for each tissue unit owned
const tissueProductionMultiplier = 0.5; // Multiplier for tissue production from automation

// DOM Elements for Tissues
const tissueSection = document.getElementById('tissues-section');
const tissueCountElement = document.getElementById('tissue-count');
const tissueClickerButton = document.getElementById('tissue-clicker-button');
const tissueReproduceButton = document.getElementById('tissue-reproduce-button');
const tissueAutomationSection = document.getElementById('tissue-automation-section');
const tissueAutomationProgressElement = document.getElementById('tissue-automation-progress');

// Event Listeners
tissueClickerButton.addEventListener('click', generateTissue);
tissueReproduceButton.addEventListener('click', purchaseTissueReproductionUnit);

// Core Functions
function generateTissue() {
    tissues += 1;
    cells += tissueBaseMultiplier; // Add tissues generated directly to the overall cell count
    updateTissueCount();
    updateCellCount();
}

function updateTissueCount() {
    tissueCountElement.textContent = tissues;
    updateTissueReproductionButton();
    saveGameState(); // Call to save the game state
}

function calculateTissueReproductionCost(units) {
    return Math.floor(tissueInitialReproductionCost * Math.pow(tissueReproductionCostFactor, units));
}

function calculateTissueMultiplier(units) {
    return 1 + (units * 0.2); // Each unit adds a 20% bonus to production
}

function calculateTissueOutputPerTick() {
    const multiplier = calculateTissueMultiplier(tissueReproductionUnits);
    return Math.round(tissueReproductionUnits * multiplier * tissueBaseMultiplier);
}

function calculateTissueProductionPerTick() {
    return Math.round(tissueReproductionUnits * tissueProductionMultiplier); // Calculate tissue production per tick
}

function updateTissueReproductionButton() {
    const cellCost = calculateTissueReproductionCost(tissueReproductionUnits);
    const tissueCost = tissueInitialTissueCost; // Tissue cost remains constant
    const cellOutputPerTick = calculateTissueOutputPerTick(); // Calculate cells per tick
    const tissueOutputPerTick = calculateTissueProductionPerTick(); // Calculate tissues per tick

    let buttonText = `Tissue Reproduction (Cost: ${cellCost}C/${tissueCost}T) - Output per Tick: ${cellOutputPerTick} Cells, ${tissueOutputPerTick} Tissues - Owned: ${tissueReproductionUnits}`;

    tissueReproduceButton.textContent = buttonText;
    tissueReproduceButton.disabled = cells < cellCost || tissues < tissueCost; // Disable button if resources are insufficient
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
        alert(`You need at least ${cellCost} cells and ${tissueCost} tissues to purchase tissue automation.`); // Alert if requirements are not met
    }
}

// Tissue Automation
let tissueAutomationInterval;
let tissueAutomationProgress = 0;

function startTissueAutomation() {
    if (tissueReproductionUnits > 0 && tissuesUnlocked) { // Ensure tissues are unlocked
        clearInterval(tissueAutomationInterval);
        tissueAutomationSection.classList.remove('hidden'); // Show tissue automation section
        tissueAutomationInterval = setInterval(() => {
            tissueAutomationProgress += 10; // Progress increases by 10% every second

            if (tissueAutomationProgress >= 100) {
                tissueAutomationProgress = 0;
                const cellOutputPerTick = calculateTissueOutputPerTick(); // Get the output per tick for cells
                const tissueOutputPerTick = calculateTissueProductionPerTick(); // Get the output per tick for tissues

                cells += cellOutputPerTick; // Add the output per tick to cells
                tissues += tissueOutputPerTick; // Add the output per tick to tissues
                updateCellCount();
                updateTissueCount();
            }

            updateTissueAutomationProgress(); // Update the visual progress bar
        }, 1000); // 1-second interval for automation
    }
}

function updateTissueAutomationProgress() {
    tissueAutomationProgressElement.style.width = `${tissueAutomationProgress}%`;
}

function resetTissueAutomation() {
    clearInterval(tissueAutomationInterval); // Stop any ongoing tissue automation
    tissueAutomationProgress = 0;
    tissueAutomationProgressElement.style.width = `0%`; // Reset the progress bar
    tissueAutomationSection.classList.add('hidden'); // Hide the tissue automation section
    tissueReproductionUnits = 0; // Reset the number of tissue reproduction units
    updateTissueReproductionButton(); // Update the UI for tissue reproduction button
}

function checkTissuesUnlock() {
    if (cells >= 100 && !tissuesUnlocked) {
        tissuesUnlocked = true; // Set flag to true once unlocked
        tissueSection.classList.remove('hidden');
        tissueClickerButton.disabled = false; // Enable the button once the section is visible
        saveGameState(); // Save the unlocked state
    }
}

// Ensure the tissues functionality is initialized when the game loads
window.addEventListener('load', () => {
    if (tissuesUnlocked || cells >= 100) { // Check if unlocked or cells >= 100
        tissueSection.classList.remove('hidden');
        tissueClickerButton.disabled = false;
    }
    checkTissuesUnlock(); // Check tissues unlock status on load
    if (tissueReproductionUnits > 0 && tissuesUnlocked) { // Ensure tissues are unlocked
        startTissueAutomation();
    }
});
