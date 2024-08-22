// saveLoad.js
function saveGameState() {
    const gameState = {
        cells: cells,
        cellReproductionUnits: cellReproductionUnits,
        automationProgress: automationProgress,
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

        // Calculate offline progress
        const now = Date.now();
        const elapsed = now - savedState.lastSave;
        const offlineCells = Math.floor(elapsed / 10000) * cellReproductionUnits; // Cells generated while offline
        cells += offlineCells;

        if (cellReproductionUnits > 0) {
            automationSection.classList.remove('hidden');
            startAutomation();
        } else {
            automationSection.classList.add('hidden'); // Ensure it's hidden if no units
        }
        updateAutomationProgress();
    }
    updateCellCount();
}


// Load game state when the page loads
window.addEventListener('load', loadGameState);
