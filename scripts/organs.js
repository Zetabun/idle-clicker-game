let organs = 0;
let organReproductionUnits = 0; // Number of Organ Reproduction units owned
let organsUnlocked = false; // Flag to check if organs have been unlocked

const organInitialReproductionCost = 200; // Initial cost in cells
const organInitialOrganCost = 50; // Initial cost in organs
const organReproductionCostFactor = 1.2;
const organBaseMultiplier = 2; // Base multiplier for each organ unit owned
const organProductionMultiplier = 0.5; // Multiplier for organ production from automation

let organAutomationInterval;
let organAutomationProgress = 0;

// DOM Elements
const organClickerButton = document.getElementById('organ-clicker-button');
const organReproduceButton = document.getElementById('organ-reproduce-button');

if (organClickerButton) {
    organClickerButton.addEventListener('click', generateOrgan);
}

if (organReproduceButton) {
    organReproduceButton.addEventListener('click', purchaseOrganReproductionUnit);
}

// Core Functions
function generateOrgan() {
    organs += organBaseMultiplier; // Organs generated directly add to organ count
    updateOrganCount();
}

function updateOrganCount() {
    const organCountElement = document.getElementById('organ-count');
    if (organCountElement) {
        organCountElement.textContent = organs;
        updateOrganReproductionButton();
        saveGameState(); // Call to save the game state
    }
}

function calculateOrganReproductionCost(units) {
    return Math.round(organInitialReproductionCost * Math.pow(organReproductionCostFactor, units));
}

function calculateOrganMultiplier(units) {
    return 1 + (units * 0.2); // Each unit adds a 20% bonus to production
}

function calculateOrganOutputPerTick() {
    const baseOutput = organReproductionUnits * organProductionMultiplier;
    return organReproductionUnits > 0 ? Math.floor(baseOutput) : 0; // Use Math.floor
}

function calculateOrganCellOutputPerTick() {
    const multiplier = calculateOrganMultiplier(organReproductionUnits);
    return organReproductionUnits > 0 ? Math.floor(organReproductionUnits * multiplier * organBaseMultiplier) : 0; // Use Math.floor
}

function updateOrganReproductionButton() {
    const cellCost = calculateOrganReproductionCost(organReproductionUnits);
    const organCost = organInitialOrganCost; // Organ cost remains constant
    const organOutputPerTick = Math.floor(calculateOrganOutputPerTick()); // Rounded down to ensure whole numbers
    const cellOutputPerTick = Math.floor(calculateOrganCellOutputPerTick()); // Rounded down to ensure whole numbers

    // Updated button text to reflect current output and costs
    let buttonText = `Organ Reproduction (Cost: ${Math.round(cellCost)}C/${Math.round(organCost)}O) - Produces: ${cellOutputPerTick}C & ${organOutputPerTick}O per Tick - Owned: ${organReproductionUnits}`;

    if (organReproduceButton) {
        organReproduceButton.textContent = buttonText;
        organReproduceButton.disabled = cells < cellCost || organs < organCost; // Disable button if resources are insufficient
    }
}

function purchaseOrganReproductionUnit() {
    const cellCost = calculateOrganReproductionCost(organReproductionUnits);
    const organCost = organInitialOrganCost; // Constant organ cost

    if (cells >= cellCost && organs >= organCost) { // Require sufficient cells and organs
        cells -= cellCost;
        organs -= organCost;
        organReproductionUnits += 1;
        updateCellCount();
        updateOrganCount();
        startOrganAutomation(); // Call to start organ automation
    } else {
        alert(`You need at least ${Math.round(cellCost)} cells and ${Math.round(organCost)} organs to purchase organ automation.`); // Alert if requirements are not met
    }
}

function startOrganAutomation() {
    const organAutomationSection = document.getElementById('organ-automation-section');
    if (organReproductionUnits > 0 && organsUnlocked && organAutomationSection) { // Ensure organs are unlocked
        clearInterval(organAutomationInterval);
        organAutomationSection.classList.remove('hidden'); // Show organ automation section
        organAutomationInterval = setInterval(() => {
            organAutomationProgress += 10; // Progress increases by 10% every second

            if (organAutomationProgress >= 100) {
                organAutomationProgress = 0;
                const organOutputPerTick = Math.floor(calculateOrganOutputPerTick()); // Get the output per tick for organs
                const cellOutputPerTick = Math.floor(calculateOrganCellOutputPerTick()); // Get the output per tick

                organs += organOutputPerTick; // Add the output per tick to organs
                cells += cellOutputPerTick; // Add the output per tick to cells
                updateOrganCount();
                updateCellCount();
            }

            updateOrganAutomationProgress(); // Update the visual progress bar
        }, 1000); // 1-second interval for automation
    }
}

function updateOrganAutomationProgress() {
    const organAutomationProgressElement = document.getElementById('organ-automation-progress');
    if (organAutomationProgressElement) {
        organAutomationProgressElement.style.width = `${organAutomationProgress}%`;
    }
}

function resetOrganAutomation() {
    clearInterval(organAutomationInterval); // Stop any ongoing organ automation
    organAutomationProgress = 0;
    const organAutomationProgressElement = document.getElementById('organ-automation-progress');
    if (organAutomationProgressElement) {
        organAutomationProgressElement.style.width = `0%`; // Reset the progress bar
    }
    const organAutomationSection = document.getElementById('organ-automation-section');
    if (organAutomationSection) {
        organAutomationSection.classList.add('hidden'); // Hide the organ automation section
    }
    organReproductionUnits = 0; // Reset the number of organ reproduction units
    updateOrganReproductionButton(); // Update the UI for organ reproduction button
}

function checkOrgansUnlock() {
    if (cells >= 1000 && tissues >= 100 && tissueReproductionUnits > 0 && !organsUnlocked) {
        organsUnlocked = true; // Set flag to true once unlocked
        const organSection = document.getElementById('organs-section');
        const organClickerButton = document.getElementById('organ-clicker-button');

        if (organSection) {
            organSection.classList.remove('hidden');
        }
        if (organClickerButton) {
            organClickerButton.disabled = false;
        }
        startOrganAutomation(); // Start organ automation when unlocked
        saveGameState(); // Save the unlocked state
    }
}

// Ensure the organs functionality is initialized when the game loads
window.addEventListener('load', () => {
    const organSection = document.getElementById('organs-section');
    const organClickerButton = document.getElementById('organ-clicker-button');

    if ((organsUnlocked || (cells >= 1000 && tissues >= 100 && tissueReproductionUnits > 0)) && organSection) {
        organSection.classList.remove('hidden');
        if (organClickerButton) {
            organClickerButton.disabled = false;
        }
        startOrganAutomation(); // Ensure organ automation starts if conditions are met
    }
    checkOrgansUnlock(); // Check organs unlock status on load
});
