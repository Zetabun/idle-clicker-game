// saveLoad.js

function saveGameState() {
    const gameState = {
        cells: cells,
        cellReproductionUnits: cellReproductionUnits,
        automationProgress: automationProgress,
        tissues: tissues,
        tissueReproductionUnits: tissueReproductionUnits,
        tissueAutomationProgress: tissueAutomationProgress,
        tissuesUnlocked: tissuesUnlocked,
        organs: organs,
        organReproductionUnits: organReproductionUnits,
        organAutomationProgress: organAutomationProgress,
        organsUnlocked: organsUnlocked,
        cps: cps,
        lastSave: Date.now() // Save the current timestamp
    };
    console.log('Saving game state:', gameState); // Debug log
    localStorage.setItem('alienGameSave', JSON.stringify(gameState));
}

function loadGameState() {
    const savedState = JSON.parse(localStorage.getItem('alienGameSave'));
    if (savedState) {
        cells = savedState.cells || 0;
        cellReproductionUnits = savedState.cellReproductionUnits || 0;
        automationProgress = savedState.automationProgress || 0;
        tissues = savedState.tissues || 0;
        tissueReproductionUnits = savedState.tissueReproductionUnits || 0;
        tissueAutomationProgress = savedState.tissueAutomationProgress || 0;
        tissuesUnlocked = savedState.tissuesUnlocked || false;
        organs = savedState.organs || 0;
        organReproductionUnits = savedState.organReproductionUnits || 0;
        organAutomationProgress = savedState.organAutomationProgress || 0;
        organsUnlocked = savedState.organsUnlocked || false;
        cps = savedState.cps || 0;

        // Calculate offline progress
        const now = Date.now();
        const elapsed = now - savedState.lastSave;

        // Apply offline progress
        const offlineCells = Math.floor(elapsed / 1000) * cps;
        cells += offlineCells;

        const offlineTissues = Math.floor(elapsed / 1000) * calculateTissueOutputPerTick();
        tissues += offlineTissues;

        const offlineOrgans = Math.floor(elapsed / 1000) * calculateOrganOutputPerTick();
        organs += offlineOrgans;

        console.log('Loaded game state:', savedState); // Debug log

        // Update UI
        updateCellCount();
        updateTissueCount();
        updateOrganCount();
        calculateCPS();

        // Handle automation sections visibility
        if (cellReproductionUnits > 0) {
            document.getElementById('automation-section').classList.remove('hidden');
            startAutomation();
        }
        if (tissueReproductionUnits > 0 && tissuesUnlocked) {
            document.getElementById('tissue-automation-section').classList.remove('hidden');
            startTissueAutomation();
        }
        if (organReproductionUnits > 0 && organsUnlocked) {
            document.getElementById('organ-automation-section').classList.remove('hidden');
            startOrganAutomation();
        }

        // Handle sections unlock visibility
        if (tissuesUnlocked || cells >= 100) {
            document.getElementById('tissues-section').classList.remove('hidden');
            document.getElementById('tissue-clicker-button').disabled = false;
        } else {
            document.getElementById('tissues-section').classList.add('hidden');
        }

        if (organsUnlocked || (cells >= 1000 && tissues >= 100)) {
            document.getElementById('organs-section').classList.remove('hidden');
            document.getElementById('organ-clicker-button').disabled = false;
        } else {
            document.getElementById('organs-section').classList.add('hidden');
        }
    } else {
        // New game, ensure tissues and organs sections are hidden
        document.getElementById('tissues-section').classList.add('hidden');
        document.getElementById('organs-section').classList.add('hidden');
    }
}

// Ensure the game state is saved when the page is closed or refreshed
window.addEventListener('beforeunload', saveGameState);

// Load the game state when the page is loaded
window.addEventListener('load', loadGameState);
