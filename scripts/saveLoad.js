// saveLoad.js

function saveGameState() {
    const gameState = {
        cells: cells,
        cellReproductionUnits: cellReproductionUnits,
        automationProgress: automationProgress,
        tissues: tissues, // Save tissues data
        tissueReproductionUnits: tissueReproductionUnits, // Save tissue reproduction units
        tissueAutomationProgress: tissueAutomationProgress, // Save tissue automation progress
        tissuesUnlocked: tissuesUnlocked, // Save tissues unlocked flag
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
        tissuesUnlocked = savedState.tissuesUnlocked || false; // Load tissues unlocked flag

        // Calculate offline progress
        const now = Date.now();
        const elapsed = now - savedState.lastSave;
        const offlineCells = Math.floor(elapsed / 10000) * (cellReproductionUnits + tissueReproductionUnits); // Cells generated while offline
        cells += offlineCells;

        // Update UI elements if they exist
        if (document.getElementById('automation-section')) {
            if (cellReproductionUnits > 0) {
                automationSection.classList.remove('hidden');
                startAutomation();
            } else {
                automationSection.classList.add('hidden');
            }
        }

        if (document.getElementById('tissue-automation-section')) {
            if (tissueReproductionUnits > 0 && tissuesUnlocked) {
                tissueAutomationSection.classList.remove('hidden');
                startTissueAutomation();
            } else {
                tissueAutomationSection.classList.add('hidden');
            }
        }

        if (document.getElementById('tissues-section')) {
            if (tissuesUnlocked || cells >= 100) {
                tissueSection.classList.remove('hidden');
                tissueClickerButton.disabled = false;
            } else {
                tissueSection.classList.add('hidden');
            }
        }

        // Always update these common elements
        updateCellCount();
        if (typeof updateTissueCount === 'function') {
            updateTissueCount();
        }
        calculateCPS(); // Calculate CPS on load

        // Update automation progress if element exists
        if (document.getElementById('automation-progress')) {
            updateAutomationProgress();
        }
        if (document.getElementById('tissue-automation-progress')) {
            updateTissueAutomationProgress();
        }
    } else {
        // New game, ensure tissues section remains hidden until unlocked
        if (document.getElementById('tissues-section')) {
            tissueSection.classList.add('hidden');
        }
    }
}

// Ensure the game state is saved when the page is closed or refreshed
window.addEventListener('beforeunload', saveGameState);

// Load the game state when the page is loaded
window.addEventListener('load', loadGameState);
