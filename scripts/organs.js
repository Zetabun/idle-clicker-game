// organs.js
let organs = 0;
let organReproductionUnits = 0; // Number of Organ Reproduction units owned
let organsUnlocked = false; // Flag to check if organs have been unlocked

const organInitialReproductionCost = 200; // Initial cost in cells
const organInitialOrganCost = 50; // Initial cost in organs
const organReproductionCostFactor = 1.2;
const organBaseMultiplier = 2; // Base multiplier for each organ unit owned
const organProductionMultiplier = 0.5; // Multiplier for organ production from automation

// DOM Elements for Organs
const organSection = document.getElementById('organs-section');
const organCountElement = document.getElementById('organ-count');
const organClickerButton = document.getElementById('organ-clicker-button');
const organReproduceButton = document.getElementById('organ-reproduce-button');
const organAutomationSection = document.getElementById('organ-automation-section');
const organAutomationProgressElement = document.getElementById('organ-automation-progress');

// Organ Automation
let organAutomationInterval;
let organAutomationProgress = 0;

// Event Listeners
organClickerButton.addEventListener('click', generateOrgan);
organReproduceButton.addEventListener('click', purchaseOrganReproductionUnit);

// Core Functions
function generateOrgan() {
    organs += 1;
    cells += organBaseMultiplier; // Add organs generated directly to the overall cell count
    updateOrganCount();
    updateCellCount();
}

function updateOrganCount() {
    organCountElement.textContent = organs;
    updateOrganReproductionButton();
    saveGameState(); // Call to save the game state
}

function calculateOrganReproductionCost(units) {
    return Math.floor(organInitialReproductionCost * Math.pow(organReproductionCostFactor, units));
}

function calculateOrganMultiplier(units) {
    return 1 + (units * 0.2); // Each unit adds a 20% bonus to production
}

function calculateOrganOutputPerTick() {
    const multiplier = calculateOrganMultiplier(organReproductionUnits);
    return Math.round(organReproductionUnits * multiplier * organBaseMultiplier);
}

function calculateOrganProductionPerTick() {
    return Math.round(organReproductionUnits * organProductionMultiplier); // Calculate organs production per tick
}

function updateOrganReproductionButton() {
    const cellCost = calculateOrganReproductionCost(organReproductionUnits);
    const organCost = organInitialOrganCost; // Organ cost remains constant
    const cellOutputPerTick = calculateOrganOutputPerTick(); // Calculate cells per tick
    const organOutputPerTick = calculateOrganProductionPerTick(); // Calculate organs per tick

    let buttonText = `Organ Reproduction (Cost: ${cellCost}C/${organCost}O) - Output per Tick: ${cellOutputPerTick} Cells, ${organOutputPerTick} Organs - Owned: ${organReproductionUnits}`;

    organReproduceButton.textContent = buttonText;
    organReproduceButton.disabled = cells < cellCost || organs < organCost; // Disable button if resources are insufficient
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
        alert(`You need at least ${cellCost} cells and ${organCost} organs to purchase organ automation.`); // Alert if requirements are not met
    }
}

function startOrganAutomation() {
    if (organReproductionUnits > 0 && organsUnlocked) { // Ensure organs are unlocked
        clearInterval(organAutomationInterval);
        organAutomationSection.classList.remove('hidden'); // Show organ automation section
        organAutomationInterval = setInterval(() => {
            organAutomationProgress += 10; // Progress increases by 10% every second

            if (organAutomationProgress >= 100) {
                organAutomationProgress = 0;
                const cellOutputPerTick = calculateOrganOutputPerTick(); // Get the output per tick for cells
                const organOutputPerTick = calculateOrganProductionPerTick(); // Get the output per tick for organs

                cells += cellOutputPerTick; // Add the output per tick to cells
                organs += organOutputPerTick; // Add the output per tick to organs
                updateCellCount();
                updateOrganCount();
            }

            updateOrganAutomationProgress(); // Update the visual progress bar
        }, 1000); // 1-second interval for automation
    }
}

function updateOrganAutomationProgress() {
    organAutomationProgressElement.style.width = `${organAutomationProgress}%`;
}

function resetOrganAutomation() {
    clearInterval(organAutomationInterval); // Stop any ongoing organ automation
    organAutomationProgress = 0;
    organAutomationProgressElement.style.width = `0%`; // Reset the progress bar
    organAutomationSection.classList.add('hidden'); // Hide the organ automation section
    organReproductionUnits = 0; // Reset the number of organ reproduction units
    updateOrganReproductionButton(); // Update the UI for organ reproduction button
}

function checkOrgansUnlock() {
    if (cells >= 1000 && !organsUnlocked) { // Updated unlock condition
        organsUnlocked = true; // Set flag to true once unlocked
        organSection.classList.remove('hidden');
        organClickerButton.disabled = false; // Enable the button once the section is visible
        saveGameState(); // Save the unlocked state
    }
}

// Ensure the organs functionality is initialized when the game loads
window.addEventListener('load', () => {
    if (organsUnlocked || cells >= 1000) { // Check if unlocked or cells >= 1000
        organSection.classList.remove('hidden');
        organClickerButton.disabled = false;
    }
    checkOrgansUnlock(); // Check organs unlock status on load
    if (organReproductionUnits > 0 && organsUnlocked) { // Ensure organs are unlocked
        startOrganAutomation();
    }
});
