let organSystems = 0;
let organSystemReproductionUnits = 0; // Number of Organ System Reproduction units owned
let organSystemsUnlocked = false; // Flag to check if organ systems have been unlocked

const organSystemInitialReproductionCost = 500; // Initial cost in cells
const organSystemInitialOrganCost = 100; // Initial cost in organs
const organSystemReproductionCostFactor = 1.2;
const organSystemBaseMultiplier = 3; // Base multiplier for each organ system unit owned
const organSystemProductionMultiplier = 0.5; // Multiplier for organ system production from automation

let organSystemAutomationInterval;
let organSystemAutomationProgress = 0;

// DOM Elements
const organSystemClickerButton = document.getElementById('organ-system-clicker-button');
const organSystemReproduceButton = document.getElementById('organ-system-reproduce-button');

if (organSystemClickerButton) {
    organSystemClickerButton.addEventListener('click', generateOrganSystem);
}

if (organSystemReproduceButton) {
    organSystemReproduceButton.addEventListener('click', purchaseOrganSystemReproductionUnit);
}

// Core Functions
function generateOrganSystem() {
    organSystems += organSystemBaseMultiplier; // Organ systems generated directly add to organ system count
    updateOrganSystemCount();
    checkOrganSystemsUnlock(); // Ensure UI updates immediately after generation
}

function updateOrganSystemCount() {
    const organSystemCountElement = document.getElementById('organ-system-count');
    if (organSystemCountElement) {
        organSystemCountElement.textContent = organSystems;
        updateOrganSystemReproductionButton();
        saveGameState(); // Call to save the game state
    }
}

function calculateOrganSystemReproductionCost(units) {
    return Math.round(organSystemInitialReproductionCost * Math.pow(organSystemReproductionCostFactor, units));
}

function calculateOrganSystemMultiplier(units) {
    return 1 + (units * 0.2); // Each unit adds a 20% bonus to production
}

function calculateOrganSystemOutputPerTick() {
    const baseOutput = organSystemReproductionUnits * organSystemProductionMultiplier;
    return organSystemReproductionUnits > 0 ? Math.floor(baseOutput) : 0; // Use Math.floor
}

function calculateOrganSystemCellOutputPerTick() {
    const multiplier = calculateOrganSystemMultiplier(organSystemReproductionUnits);
    return organSystemReproductionUnits > 0 ? Math.floor(organSystemReproductionUnits * multiplier * organSystemBaseMultiplier) : 0; // Use Math.floor
}

function updateOrganSystemReproductionButton() {
    const cellCost = calculateOrganSystemReproductionCost(organSystemReproductionUnits);
    const organCost = organSystemInitialOrganCost; // Organ cost remains constant
    const organSystemOutputPerTick = Math.floor(calculateOrganSystemOutputPerTick());
    const cellOutputPerTick = Math.floor(calculateOrganSystemCellOutputPerTick());

    let buttonText = `Organ System Reproduction (Cost: ${Math.round(cellCost)}C/${Math.round(organCost)}O) - Produces: ${cellOutputPerTick}C & ${organSystemOutputPerTick}OS per Tick - Owned: ${organSystemReproductionUnits}`;

    if (organSystemReproduceButton) {
        organSystemReproduceButton.textContent = buttonText;
        organSystemReproduceButton.disabled = cells < cellCost || organs < organCost; // Disable button if resources are insufficient
    }
}

function purchaseOrganSystemReproductionUnit() {
    const cellCost = calculateOrganSystemReproductionCost(organSystemReproductionUnits);
    const organCost = organSystemInitialOrganCost;

    if (cells >= cellCost && organs >= organCost) {
        cells -= cellCost;
        organs -= organCost;
        organSystemReproductionUnits += 1;
        updateCellCount();
        updateOrganSystemCount();
        startOrganSystemAutomation();
        checkOrganSystemsUnlock(); // Ensure unlock status is checked immediately after purchase
    } else {
        alert(`You need at least ${Math.round(cellCost)} cells and ${Math.round(organCost)} organs to purchase organ system automation.`);
    }
}

function startOrganSystemAutomation() {
    const organSystemAutomationSection = document.getElementById('organ-system-automation-section');
    if (organSystemReproductionUnits > 0 && organSystemsUnlocked && organSystemAutomationSection) {
        clearInterval(organSystemAutomationInterval);
        organSystemAutomationSection.classList.remove('hidden');
        organSystemAutomationInterval = setInterval(() => {
            organSystemAutomationProgress += 10;

            if (organSystemAutomationProgress >= 100) {
                organSystemAutomationProgress = 0;
                const organSystemOutputPerTick = Math.floor(calculateOrganSystemOutputPerTick());
                const cellOutputPerTick = Math.floor(calculateOrganSystemCellOutputPerTick());

                organSystems += organSystemOutputPerTick;
                cells += cellOutputPerTick;
                updateOrganSystemCount();
                updateCellCount();
            }

            updateOrganSystemAutomationProgress();
        }, 1000);
    }
}

function updateOrganSystemAutomationProgress() {
    const organSystemAutomationProgressElement = document.getElementById('organ-system-automation-progress');
    if (organSystemAutomationProgressElement) {
        organSystemAutomationProgressElement.style.width = `${organSystemAutomationProgress}%`;
    }
}

function resetOrganSystemAutomation() {
    clearInterval(organSystemAutomationInterval);
    organSystemAutomationProgress = 0;
    const organSystemAutomationProgressElement = document.getElementById('organ-system-automation-progress');
    if (organSystemAutomationProgressElement) {
        organSystemAutomationProgressElement.style.width = `0%`;
    }
    const organSystemAutomationSection = document.getElementById('organ-system-automation-section');
    if (organSystemAutomationSection) {
        organSystemAutomationSection.classList.add('hidden');
    }
    organSystemReproductionUnits = 0;
    updateOrganSystemReproductionButton();
}

function checkOrganSystemsUnlock() {
    if (cells >= 1000 && organs >= 100 && organReproductionUnits > 0 && !organSystemsUnlocked) {
        organSystemsUnlocked = true;
        const organSystemSection = document.getElementById('organ-systems-section');
        const organSystemClickerButton = document.getElementById('organ-system-clicker-button');

        if (organSystemSection) {
            organSystemSection.classList.remove('hidden');
        }
        if (organSystemClickerButton) {
            organSystemClickerButton.disabled = false;
        }
        startOrganSystemAutomation();
        saveGameState();
    }
}

// Initial load check
window.addEventListener('load', () => {
    const organSystemSection = document.getElementById('organ-systems-section');
    const organSystemClickerButton = document.getElementById('organ-system-clicker-button');

    if ((organSystemsUnlocked || (cells >= 1000 && organs >= 100 && organReproductionUnits > 0)) && organSystemSection) {
        organSystemSection.classList.remove('hidden');
        if (organSystemClickerButton) {
            organSystemClickerButton.disabled = false;
        }
        startOrganSystemAutomation();
    }
    checkOrganSystemsUnlock();
});
