// singleCell.js

document.addEventListener('DOMContentLoaded', (event) => {
    const isNewGame = localStorage.getItem('newGame');
    if (isNewGame === 'true') {
        resetCyberPetStats();
        localStorage.setItem('newGame', 'false'); // Reset the flag
    }
});

function resetCyberPetStats() {
    // Logic to reset the cyber pet or blob stats
    nutrientLevel = 0;
    growthPercentage = 0;
    advancedCells = 0;
    accumulatedTime = 0;
    updateStatusBars();
    updateBlobSize();
    updateAdvancedCellCounter();
    localStorage.removeItem('cyberPetSave');

    // Debugging: Log the reset action
    console.log('Cyber Pet Stats Reset - Nutrients, Growth Percentage, and Advanced Cells reset to 0');
}

// Initial setup
let nutrientLevel = 0; // Starts at 0
let growthPercentage = 0; // Start at 0
let lastUpdate = Date.now(); // For tracking time
let accumulatedTime = 0; // Accumulate time over multiple frames
let advancedCells = 0; // Count of advanced cells

// Canvas setup
const canvas = document.getElementById('blobCanvas');
const ctx = canvas.getContext('2d');
let angle = 0;
let centerX = canvas.width / 2;
let centerY = canvas.height / 2;
const maxBaseRadius = 80;  // Maximum size for the blob
const minBaseRadius = 30;  // Minimum size for the blob
let baseRadius = minBaseRadius;  // Start with the minimum size
const waveAmplitude = 10;  // Adjusted for a smaller blob

// Elements for updating the UI
const nutrientFill = document.getElementById('nutrientFill');
const nutrientValue = document.getElementById('nutrientValue');
const growthFill = document.getElementById('growthFill');
const growthValue = document.getElementById('growthValue');
const resetButton = document.getElementById('resetButton');
const advancedCellCounter = document.getElementById('advancedCellCounter');

function updateStatusBars() {
    nutrientFill.style.width = `${nutrientLevel}%`;
    nutrientValue.textContent = nutrientLevel;
    growthFill.style.width = `${growthPercentage}%`;
    growthValue.textContent = Math.round(growthPercentage);

    // Debugging: Log the updated status bars
    console.log(`Updated Status Bars - Nutrients: ${nutrientLevel}%, Growth: ${growthPercentage}%`);
}

function updateAdvancedCellCounter() {
    advancedCellCounter.textContent = `Advanced Cells: ${advancedCells}`;
    console.log(`Advanced Cells Updated: ${advancedCells}`);
}

function decreaseNutrientsAndIncreaseGrowth() {
    const now = Date.now();
    const elapsed = (now - lastUpdate) / 1000; // Time in seconds
    lastUpdate = now;

    accumulatedTime += elapsed; // Accumulate time over multiple frames

    if (accumulatedTime >= 10) { // Check if 10 seconds have accumulated
        const nutrientDecrease = Math.floor(accumulatedTime / 10);
        accumulatedTime -= nutrientDecrease * 10; // Reduce the accumulated time

        if (nutrientDecrease > 0 && nutrientLevel > 0 && growthPercentage < 100) {
            nutrientLevel = Math.max(0, nutrientLevel - nutrientDecrease);
            growthPercentage = Math.min(100, growthPercentage + nutrientDecrease); // Increase growth at the same rate

            // Debugging: Log the time, nutrient decrease, and growth increase
            console.log(`Elapsed Time: ${elapsed.toFixed(2)} seconds`);
            console.log(`Nutrient Decrease: -${nutrientDecrease}, New Nutrient Level: ${nutrientLevel}%`);
            console.log(`Growth Increase: +${nutrientDecrease}, New Growth Percentage: ${growthPercentage}%`);

            updateStatusBars();
            updateBlobSize();
        } else {
            // Debugging: Log if no change occurred
            console.log('No change in nutrients or growth. Either time elapsed was too short, nutrient level is zero, or growth is at 100%.');
        }
    } else {
        // Debugging: Log that not enough time has passed to update
        console.log(`Accumulated Time: ${accumulatedTime.toFixed(2)} seconds, waiting to reach 10 seconds`);
    }
}

function saveGameState() {
    const gameState = {
        nutrientLevel: nutrientLevel,
        growthPercentage: growthPercentage,
        advancedCells: advancedCells,
        lastSave: Date.now()  // Save the current timestamp
    };
    localStorage.setItem('cyberPetSave', JSON.stringify(gameState));

    // Debugging: Log the saved game state
    console.log('Game State Saved:', gameState);
}

function loadGameState() {
    const savedState = JSON.parse(localStorage.getItem('cyberPetSave'));
    if (savedState) {
        const now = Date.now();
        const elapsed = (now - savedState.lastSave) / 1000; // Time in seconds

        nutrientLevel = savedState.nutrientLevel || 0;
        growthPercentage = savedState.growthPercentage || 0;
        advancedCells = savedState.advancedCells || 0;

        const nutrientDecrease = Math.floor(elapsed / 10);
        if (nutrientDecrease > 0 && nutrientLevel > 0 && growthPercentage < 100) {
            nutrientLevel = Math.max(0, nutrientLevel - nutrientDecrease);
            growthPercentage = Math.min(100, growthPercentage + nutrientDecrease); // Sync growth with offline nutrient decrease
        }

        lastUpdate = now;  // Update the last update time to now
        updateStatusBars();  // Update the UI with the loaded values
        updateBlobSize();  // Update the blob size based on the loaded growth percentage
        updateAdvancedCellCounter();  // Update the advanced cell counter

        // Debugging: Log the loaded game state and the applied changes
        console.log('Game State Loaded:', savedState);
        console.log(`Offline Progress - Elapsed Time: ${elapsed.toFixed(2)} seconds`);
        console.log(`Nutrient Decrease: -${nutrientDecrease}, New Nutrient Level: ${nutrientLevel}%`);
        console.log(`Growth Increase: +${nutrientDecrease}, New Growth Percentage: ${growthPercentage}%`);
    } else {
        console.log('No saved game state found.');
    }
}

function updateBlobSize() {
    // Adjust the blob size based on growth percentage
    baseRadius = minBaseRadius + (growthPercentage / 100) * (maxBaseRadius - minBaseRadius);

    // Debugging: Log the updated blob size
    console.log(`Updated Blob Size - Base Radius: ${baseRadius}`);
}

function drawBlob() {
    decreaseNutrientsAndIncreaseGrowth();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw outer circle with a dynamic gradient
    const outerRadius = baseRadius + 20;
    const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius, centerX, centerY, outerRadius);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(1, `rgba(0, 200, 255, 0.5)`);

    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Apply a glowing effect to the blob
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ffffff';

    // Adjust the opacity for a pulsating effect
    let opacity = 0.8 + 0.2 * Math.sin(angle);
    if (growthPercentage === 100) {
        opacity = 1 + 0.5 * Math.sin(angle * 10); // Stronger pulsation when fully grown
    }
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;

    // Draw the blob itself
    ctx.beginPath();
    ctx.moveTo(
        centerX + Math.cos(0) * (baseRadius + Math.sin(angle) * waveAmplitude),
        centerY + Math.sin(0) * (baseRadius + Math.cos(angle) * waveAmplitude)
    );

    for (let i = 0; i <= Math.PI * 2; i += 0.1) {
        const x = centerX + Math.cos(i) * (baseRadius + Math.sin(i * 5 + angle) * waveAmplitude);
        const y = centerY + Math.sin(i) * (baseRadius + Math.cos(i * 5 + angle) * waveAmplitude);
        ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.fill();

    // Draw inner circle for a layered effect
    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius - 10, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, 0.5)`;
    ctx.lineWidth = 2;
    ctx.stroke();

    angle += 0.03;
    requestAnimationFrame(drawBlob); // Ensures continuous updates

    // Debugging: Log the animation frame
    console.log('Animation Frame Updated');
}

// Interactivity: Make the blob move when clicked
canvas.addEventListener('click', () => {
    if (growthPercentage === 100) {
        advancedCells += 1; // Award an advanced cell
        updateAdvancedCellCounter(); // Update the UI
        resetBlob(); // Reset the blob
    } else {
        const maxOffset = 30;
        const randomOffsetX = Math.random() * maxOffset - maxOffset / 2;
        const randomOffsetY = Math.random() * maxOffset - maxOffset / 2;
        centerX += randomOffsetX;
        centerY += randomOffsetY;

        nutrientLevel = Math.min(100, nutrientLevel + 5); // Increase nutrients on click
        updateStatusBars();

        // Debugging: Log the click interaction and nutrient increase
        console.log('Blob Clicked - Nutrient Level Increased:', nutrientLevel);

        setTimeout(() => {
            centerX = canvas.width / 2;
            centerY = canvas.height / 2;

            // Debugging: Log the reset of the blob position
            console.log('Blob Position Reset');
        }, 200);
    }
});

// Reset function
function resetBlob() {
    nutrientLevel = 0;
    growthPercentage = 0;
    accumulatedTime = 0;
    updateStatusBars();
    updateBlobSize();

    // Debugging: Log the reset action
    console.log('Blob Reset - Nutrient Level and Growth Percentage reset to 0');
}

// Add event listener to the reset button
resetButton.addEventListener('click', () => {
    resetBlob();
    localStorage.removeItem('cyberPetSave'); // Clear saved game state
    advancedCells = 0; // Reset advanced cells
    updateAdvancedCellCounter(); // Update the UI

    // Debugging: Log the reset button action
    console.log('Game Reset - All data cleared');
});

// Ensure the game state is saved when the page is closed or refreshed
window.addEventListener('beforeunload', saveGameState);
window.addEventListener('load', loadGameState);

// Start the game
drawBlob();
