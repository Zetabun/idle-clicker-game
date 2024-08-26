// Function to save the game state to local storage
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
        organSystems: organSystems,
        organSystemReproductionUnits: organSystemReproductionUnits,
        organSystemsUnlocked: organSystemsUnlocked,
        cps: cps,
        growth: growth,  // Save growth
        nutrients: nutrients,  // Save nutrients
        advancedCells: advancedCells,  // Save advanced cells
        featureUnlocked: featureUnlocked || false, // Save the featureUnlocked state
        lastSave: Date.now() // Save the current timestamp
    };
    console.log('Saving game state:', gameState); // Debug log
    localStorage.setItem('alienGameSave', JSON.stringify(gameState));
}

// Function to load the game state from local storage
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
        organSystems = savedState.organSystems || 0;
        organSystemReproductionUnits = savedState.organSystemReproductionUnits || 0;
        organSystemsUnlocked = savedState.organSystemsUnlocked || false;
        cps = savedState.cps || 0;
        growth = savedState.growth || 0;  // Load growth
        nutrients = savedState.nutrients || 0;  // Load nutrients
        advancedCells = savedState.advancedCells || 0;  // Load advanced cells
        featureUnlocked = savedState.featureUnlocked || false; // Load the featureUnlocked state

        // Calculate offline progress
        const now = Date.now();
        const elapsed = now - savedState.lastSave;

        // Apply offline progress
        const offlineCells = Math.floor((elapsed / 1000) * cps);
        cells += offlineCells;

        const offlineTissues = Math.floor((elapsed / 1000) * calculateTissueOutputPerTick());
        tissues += offlineTissues;

        const offlineOrgans = Math.floor((elapsed / 1000) * calculateOrganOutputPerTick());
        organs += offlineOrgans;

        const offlineOrganSystems = Math.floor((elapsed / 1000) * calculateOrganSystemOutputPerTick()); 
        organSystems += offlineOrganSystems;

        console.log('Loaded game state:', savedState); // Debug log
        console.log(`Offline progress: ${offlineCells} cells, ${offlineTissues} tissues, ${offlineOrgans} organs, ${offlineOrganSystems} organ systems`);

        // Update UI elements if they exist
        if (document.getElementById('cell-count')) {
            document.getElementById('cell-count').textContent = cells;
        }
        if (document.getElementById('cps-value')) {
            document.getElementById('cps-value').textContent = calculateCPS();
        }
        if (document.getElementById('tissue-count')) {
            updateTissueCount();
        }
        if (document.getElementById('organ-count')) {
            updateOrganCount();
        }
        if (document.getElementById('organ-system-count')) {
            updateOrganSystemCount();
        }

        // Handle automation sections visibility if elements exist
        if (cellReproductionUnits > 0 && document.getElementById('automation-section')) {
            document.getElementById('automation-section').classList.remove('hidden');
            startAutomation();
        }
        if (tissueReproductionUnits > 0 && tissuesUnlocked && document.getElementById('tissue-automation-section')) {
            document.getElementById('tissue-automation-section').classList.remove('hidden');
            startTissueAutomation();
        }
        if (organReproductionUnits > 0 && organsUnlocked && document.getElementById('organ-automation-section')) {
            document.getElementById('organ-automation-section').classList.remove('hidden');
            startOrganAutomation();
        }
        if (organSystemReproductionUnits > 0 && organSystemsUnlocked && document.getElementById('organ-system-automation-section')) {
            document.getElementById('organ-system-automation-section').classList.remove('hidden');
            startOrganSystemAutomation();
        }

        // Handle sections unlock visibility
        if ((tissuesUnlocked || cells >= 100) && document.getElementById('tissues-section')) {
            document.getElementById('tissues-section').classList.remove('hidden');
            document.getElementById('tissue-clicker-button').disabled = false;
        } else if (document.getElementById('tissues-section')) {
            document.getElementById('tissues-section').classList.add('hidden');
        }

        if ((organsUnlocked || (cells >= 1000 && tissues >= 100 && tissueReproductionUnits > 0)) && document.getElementById('organs-section')) {
            document.getElementById('organs-section').classList.remove('hidden');
            document.getElementById('organ-clicker-button').disabled = false;
        } else if (document.getElementById('organs-section')) {
            document.getElementById('organs-section').classList.add('hidden');
        }

        if ((organSystemsUnlocked || (cells >= 1000 and organs >= 100 and organReproductionUnits > 0)) and document.getElementById('organ-systems-section')) {
            document.getElementById('organ-systems-section').classList.remove('hidden');
            document.getElementById('organ-system-clicker-button').disabled = false;
        } else if (document.getElementById('organ-systems-section')) {
            document.getElementById('organ-systems-section').classList.add('hidden');
        }

        // Check if the feature has been unlocked previously and update the button state
        if (featureUnlocked && document.getElementById('unlock-button')) {
            const unlockButton = document.getElementById('unlock-button');
            unlockButton.textContent = 'Cell Farm (Unlocked)';
            unlockButton.disabled = true;
            unlockButton.classList.remove('locked');
            unlockButton.style.backgroundColor = ''; // Reset color to indicate it's unlocked
        }
    } else {
        // New game, ensure tissues, organs, and organ systems sections are hidden if elements exist
        if (document.getElementById('tissues-section')) {
            document.getElementById('tissues-section').classList.add('hidden');
        }
        if (document.getElementById('organs-section')) {
            document.getElementById('organs-section').classList.add('hidden');
        }
        if (document.getElementById('organ-systems-section')) {
            document.getElementById('organ-systems-section').classList.add('hidden');
        }
    }
}

// Ensure the game state is saved when the page is closed or refreshed
window.addEventListener('beforeunload', saveGameState);

// Load the game state when the page is loaded
window.addEventListener('load', loadGameState);
