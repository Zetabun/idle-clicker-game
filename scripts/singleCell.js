// Initial setup
let nutrientLevel = 0; // Starts at 0
let growthPercentage = 0; // Start at 0
let lastUpdate = Date.now(); // For tracking time

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

function updateStatusBars() {
    nutrientFill.style.width = `${nutrientLevel}%`;
    nutrientValue.textContent = nutrientLevel;
    growthFill.style.width = `${growthPercentage}%`;
    growthValue.textContent = Math.round(growthPercentage);
}

function decreaseNutrientsAndIncreaseGrowth() {
    const now = Date.now();
    const elapsed = (now - lastUpdate) / 1000; // Time in seconds
    lastUpdate = now;

    const nutrientDecrease = Math.floor(elapsed / 10);
    if (nutrientDecrease > 0 && nutrientLevel > 0) {
        nutrientLevel = Math.max(0, nutrientLevel - nutrientDecrease);
        growthPercentage = Math.min(100, growthPercentage + nutrientDecrease); // Increase growth at the same rate
        updateStatusBars();
        updateBlobSize();
    }
}

function saveGameState() {
    const gameState = {
        nutrientLevel: nutrientLevel,
        growthPercentage: growthPercentage,
        lastSave: Date.now()  // Save the current timestamp
    };
    localStorage.setItem('cyberPetSave', JSON.stringify(gameState));
}

function loadGameState() {
    const savedState = JSON.parse(localStorage.getItem('cyberPetSave'));
    if (savedState) {
        const now = Date.now();
        const elapsed = (now - savedState.lastSave) / 1000; // Time in seconds

        nutrientLevel = savedState.nutrientLevel || 0;
        growthPercentage = savedState.growthPercentage || 0;

        const nutrientDecrease = Math.floor(elapsed / 10);
        if (nutrientDecrease > 0 && nutrientLevel > 0) {
            nutrientLevel = Math.max(0, nutrientLevel - nutrientDecrease);
            growthPercentage = Math.min(100, growthPercentage + nutrientDecrease); // Sync growth with offline nutrient decrease
        }

        lastUpdate = now;  // Update the last update time to now
        updateStatusBars();  // Update the UI with the loaded values
        updateBlobSize();  // Update the blob size based on the loaded growth percentage
    }
}

function updateBlobSize() {
    // Adjust the blob size based on growth percentage
    baseRadius = minBaseRadius + (growthPercentage / 100) * (maxBaseRadius - minBaseRadius);
}

function drawBlob() {
    decreaseNutrientsAndIncreaseGrowth();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#61dafb';
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

    angle += 0.03;
    updateStatusBars(); // Ensure the status bars are updated in real-time
    requestAnimationFrame(drawBlob);
}

// Interactivity: Make the blob move when clicked
canvas.addEventListener('click', () => {
    const maxOffset = 30;
    const randomOffsetX = Math.random() * maxOffset - maxOffset / 2;
    const randomOffsetY = Math.random() * maxOffset - maxOffset / 2;
    centerX += randomOffsetX;
    centerY += randomOffsetY;

    nutrientLevel = Math.min(100, nutrientLevel + 5); // Increase nutrients on click
    updateStatusBars();

    setTimeout(() => {
        centerX = canvas.width / 2;
        centerY = canvas.height / 2;
    }, 200);
});

// Ensure the game state is saved when the page is closed or refreshed
window.addEventListener('beforeunload', saveGameState);
window.addEventListener('load', loadGameState);

// Start the game
drawBlob();
