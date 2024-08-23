// saveLoad.js

function saveGameState() {
    const gameState = {
        cells: cells,
        cellReproductionUnits: cellReproductionUnits,
        automationProgress: automationProgress,
        tissues: tissues, // Save tissues data
        tissueReproductionUnits: tissueReproductionUnits, // Save tissue reproduction units
        tissueAutomationProgress: tissueAutomationProgress, // Save tissue automation progress
        lastSave: Date.now()
    };
    localStorage.setItem('alienGameSave', JSON.stringify(gameState));
}

function loadGameState() {
    const savedState = JSON.parse(localStorage.getItem('alienGameSave'));
    if (savedState) {
        cells = savedState.cells || 0;
        cellReproductionUnits = savedState.cellReproductionUnits || 0;
        automationProgress = savedState.automationProgress || 0;
        tissues = savedState.tissues || 0; // Load tissues data
        tissueReproductionUnits = savedState.tissueReproductionUnits || 0; // Load tissue reproduction units
        tissueAutomationProgress = savedState.tissueAutomationProgress || 0; // Load tissue automation progress

        // Calculate offline progress
        const now = Date.now();
        const elapsed = now - savedState.lastSave;
        const offlineCells = Math.floor(elapsed / 10000) * (cellReproductionUnits + tissueReproductionUnits); // Cells generated while offline
        cells += offlineCells;

        if (cellReproductionUnits > 0) {
            automationSection.classList.remove('hidden');
            startAutomation();
        } else {
            automationSection.classList.add('hidden');
        }

        if (tissueReproductionUnits > 0) {
            tissueAutomationSection.classList.remove('hidden');
            startTissueAutomation();
        } else {
            tissueAutomationSection.classList.add('hidden');
        }

        updateAutomationProgress();
        updateTissueAutomationProgress();
        updateCellCount();
        updateTissueCount();
        calculateCPS(); // Calculate CPS on load
        checkTissuesUnlock(); // Ensure tissues section is hidden or shown correctly
    } else {
        // New game, ensure tissues section remains hidden until unlocked
        tissueSection.classList.add('hidden');
    }
}

// Ensure the game state is saved when the page is closed or refreshed
window.addEventListener('beforeunload', saveGameState);

// Load the game state when the page is loaded
window.addEventListener('load', loadGameState);
