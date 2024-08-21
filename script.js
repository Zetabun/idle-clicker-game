let rocks = 0;
let points = 0;
let clickValue = 1;
let autoCollect = 0;
let automationEnabled = false;
let automationInterval = null;
let flashTimeout = null;
let isSliding = false;
let startX;
let countdownComplete = false; // Flag to track if the countdown is complete

const rocksText = document.getElementById('rocksText');
const messageText = document.getElementById('messageText');
const collectButton = document.getElementById('collectButton');
const upgradeButton = document.getElementById('upgradeButton');
const automateButton = document.getElementById('automateButton');
const newGameButton = document.getElementById('newGameButton');
const congratsMessage = document.getElementById('congratsMessage');
const targetImage = document.getElementById('targetImage');
const pointsText = document.getElementById('pointsText');
const countdownText = document.getElementById('countdownText');
const clickToContinue = document.getElementById('clickToContinue');
const sliderContainer = document.getElementById('sliderContainer');
const slider = document.getElementById('slider');
const sliderButton = document.getElementById('sliderButton');

let countdownTimer;
let countdownValue = 5;

window.onload = function() {
    loadGame();
    calculateOfflineProgress();
    updateRocksText();
    updatePointsText();
    checkTargetVisibility(); // Check the visibility of the target image

    if (automationEnabled) {
        startAutomation();
    }
};

window.onbeforeunload = function() {
    saveGame();
};

function updateRocksText() {
    rocksText.textContent = `Rocks: ${rocks}`;
}

function updatePointsText() {
    pointsText.textContent = `Points: ${points}`;
    if (points >= 10) {
        upgradeButton.style.display = 'inline-block';
    } else {
        upgradeButton.style.display = 'none';
    }
}

function checkTargetVisibility() {
    if (rocks >= 10 && !targetImageVisible()) {
        congratsMessage.style.display = 'block';
    } else if (targetImageVisible()) {
        targetImage.style.display = 'block';
    }
}

function targetImageVisible() {
    return targetImage.style.display === 'block';
}

function collect() {
    rocks += clickValue;
    updateRocksText();

    if (rocks >= 10 && !targetImageVisible() && congratsMessage.style.display === 'none') {
        congratsMessage.style.display = 'block';
        countdownComplete = false; // Reset the countdown complete flag
        startCountdown();
    }
}

function startCountdown() {
    countdownValue = 5;
    clickToContinue.style.display = 'none';
    countdownText.style.display = 'block';
    
    countdownTimer = setInterval(() => {
        if (countdownValue > 0) {
            countdownText.textContent = `Continue in ${countdownValue}...`;
            countdownValue--;
        } else {
            clearInterval(countdownTimer);
            countdownText.style.display = 'none';
            clickToContinue.style.display = 'block';
            countdownComplete = true; // Set the countdown complete flag to true
        }
    }, 1000);
}

function buyUpgrade() {
    const upgradeCost = 10;
    if (rocks >= upgradeCost) {
        rocks -= upgradeCost;
        clickValue *= 2;
        messageText.textContent = `Upgrade bought! Each click now gives ${clickValue} rocks.`;
        updatePointsText();
    } else {
        messageText.textContent = "Not enough rocks to buy upgrade!";
    }
    updateRocksText();
}

function automate() {
    const automateCost = 50;
    if (rocks >= automateCost) {
        rocks -= automateCost;
        autoCollect += 1;
        automationEnabled = true;
        startAutomation();
        messageText.textContent = `Automation started! Collecting ${autoCollect} rocks every second.`;
    } else {
        messageText.textContent = "Not enough rocks to start automation!";
    }
    updateRocksText();
}

function startAutomation() {
    if (!automationInterval) {
        automationInterval = setInterval(() => {
            rocks += autoCollect;
            updateRocksText();
        }, 1000);
    }
}

function saveGame() {
    const gameState = {
        rocks: rocks,
        points: points,
        clickValue: clickValue,
        autoCollect: autoCollect,
        automationEnabled: automationEnabled,
        targetVisible: targetImageVisible(), // Save the visibility state of the target image
        lastSave: Date.now()
    };
    localStorage.setItem('idleGameState', JSON.stringify(gameState));
}

function loadGame() {
    const savedState = localStorage.getItem('idleGameState');
    if (savedState) {
        const gameState = JSON.parse(savedState);
        rocks = gameState.rocks || 0;
        points = gameState.points || 0;
        clickValue = gameState.clickValue || 1;
        autoCollect = gameState.autoCollect || 0;
        automationEnabled = gameState.automationEnabled || false;

        // Restore target image visibility based on saved state
        if (gameState.targetVisible) {
            targetImage.style.display = 'block';
        } else {
            targetImage.style.display = 'none';
        }
    }
    updatePointsText(); // Update the UI based on loaded points
}

function calculateOfflineProgress() {
    const savedState = localStorage.getItem('idleGameState');
    if (savedState) {
        const gameState = JSON.parse(savedState);
        const lastSaveTime = gameState.lastSave || Date.now();
        const timeElapsed = (Date.now() - lastSaveTime) / 1000;

        const offlineRocks = timeElapsed * autoCollect;
        rocks += Math.floor(offlineRocks);

        if (offlineRocks > 0) {
            messageText.textContent = `Welcome back! You gained ${Math.floor(offlineRocks)} rocks while you were away.`;
        }
    }
}

function startNewGame() {
    sliderContainer.style.display = 'block';
}

function confirmNewGame() {
    rocks = 0;
    points = 0;
    clickValue = 1;
    autoCollect = 0;
    automationEnabled = false;
    automationInterval = null;
    clearTimeout(flashTimeout);
    clearInterval(countdownTimer);
    countdownValue = 5;
    saveGame();
    updateRocksText();
    updatePointsText();
    targetImage.style.display = 'none'; // Reset the visibility state
    messageText.textContent = "New game started! All progress has been reset.";
    setTimeout(() => {
        messageText.textContent = "";
    }, 3000);

    upgradeButton.style.display = 'none';
    automateButton.style.display = 'none';
    congratsMessage.style.display = 'none';
    targetImage.style.display = 'none';
    countdownText.style.display = 'block';
    clickToContinue.style.display = 'none';

    sliderContainer.style.display = 'none';
    sliderButton.style.left = '0';
    sliderButton.classList.remove('active');
}

newGameButton.addEventListener('click', startNewGame);

congratsMessage.addEventListener('click', function() {
    if (countdownComplete) { // Only allow clicking if the countdown is complete
        congratsMessage.style.display = 'none';
        targetImage.style.display = 'block'; // Show the target image
    }
});

targetImage.addEventListener('click', function() {
    if (rocks >= 1) {
        rocks -= 1;
        points += 1;
        updateRocksText();
        updatePointsText();
        messageText.textContent = "";

        // Add jiggle effect
        targetImage.classList.add('jiggle-effect');

        // Remove the class after the animation completes so it can be triggered again
        setTimeout(() => {
            targetImage.classList.remove('jiggle-effect');
        }, 300);
    } else {
        messageText.textContent = "No rocks";
    }
});

collectButton.addEventListener('click', collect);
upgradeButton.addEventListener('click', buyUpgrade);
automateButton.addEventListener('click', automate);

// Handle the sliding confirmation for new game
sliderButton.addEventListener('mousedown', (e) => {
    isSliding = true;
    startX = e.clientX;
});

sliderButton.addEventListener('touchstart', (e) => {
    isSliding = true;
    startX = e.touches[0].clientX;
});

window.addEventListener('mousemove', (e) => {
    if (isSliding) {
        let newX = e.clientX - startX;
        if (newX < 0) newX = 0;
        if (newX > slider.clientWidth - sliderButton.clientWidth) newX = slider.clientWidth - sliderButton.clientWidth;
        sliderButton.style.left = newX + 'px';

        if (newX >= slider.clientWidth - sliderButton.clientWidth) {
            sliderButton.classList.add('active');
            isSliding = false;
            confirmNewGame();
        }
    }
});

window.addEventListener('touchmove', (e) => {
    if (isSliding) {
        let newX = e.touches[0].clientX - startX;
        if (newX < 0) newX = 0;
        if (newX > slider.clientWidth - sliderButton.clientWidth) newX = slider.clientWidth - sliderButton.clientWidth;
        sliderButton.style.left = newX + 'px';

        if (newX >= slider.clientWidth - sliderButton.clientWidth) {
            sliderButton.classList.add('active');
            isSliding = false;
            confirmNewGame();
        }
    }
});

window.addEventListener('mouseup', () => {
    isSliding = false;
    if (!sliderButton.classList.contains('active')) {
        sliderButton.style.left = '0';
    }
});

window.addEventListener('touchend', () => {
    isSliding = false;
    if (!sliderButton.classList.contains('active')) {
        sliderButton.style.left = '0';
    }
});
