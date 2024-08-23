// automation.js
let automationInterval;
let automationProgress = 0;

const automationSection = document.getElementById('automation-section');
const automationProgressElement = document.getElementById('automation-progress');

function startAutomation() {
    if (cellReproductionUnits > 0) {
        clearInterval(automationInterval);
        automationSection.classList.remove('hidden'); // Show automation section
        automationInterval = setInterval(() => {
            automationProgress += 10; // Progress increases by 10% every second

            if (automationProgress >= 100) {
                automationProgress = 0;
                const outputPerTick = calculateOutputPerTick(); // Get the output per tick
                cells += outputPerTick; // Add the output per tick to cells
                updateCellCount();
            }

            updateAutomationProgress(); // Update the visual progress bar
        }, 1000); // 1-second interval for automation
    }
}

function updateAutomationProgress() {
    automationProgressElement.style.width = `${automationProgress}%`;
}

function resetAutomation() {
    clearInterval(automationInterval); // Stop any ongoing automation
    automationProgress = 0;
    automationProgressElement.style.width = `0%`; // Reset the progress bar
    automationSection.classList.add('hidden'); // Hide the automation section
}
