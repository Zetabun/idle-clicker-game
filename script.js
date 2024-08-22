let rocks = 0;
let points = 0;
let clickValue = 1;
let autoCollect = 0;
let automationEnabled = false;
let automationInterval = null;
let flashTimeout = null;
let isSliding = false;
let startX;
let countdownComplete = false;
let ammoPageShown = localStorage.getItem('ammoPageShown') === 'true'; // Check if ammo page has been shown before

const rocksText = document.getElementById('rocksText');
const messageText = document.getElementById('messageText');
const collectButton = document.getElementById('collectButton');
const upgradeButton = document.getElementById('upgradeButton');
const automateButton = document.getElementById('automateButton');
const newGameIcon = document.getElementById('newGameIcon');
const congratsMessage = document.getElementById('congratsMessage');
const targetContainer = document.getElementById('targetContainer');
const targetImage = document.getElementById('targetImage');
const pointsText = document.getElementById('pointsText');
const countdownText = document.getElementById('countdownText');
const clickToContinue = document.getElementById('clickToContinue');
const sliderContainer = document.getElementById('sliderContainer');
const slider = document.getElementById('slider');
const sliderButton = document.getElementById('sliderButton');

let countdownTimer;
let countdownValue = 5;
let hasClickedAmmoTab = localStorage.getItem('hasClickedAmmoTab') === 'true';
let tutorialShown = localStorage.getItem('tutorialShown') === 'true';

window.onload = function () {
    loadGame();
    calculateOfflineProgress();
    updateRocksText();
    updatePointsText();
    checkTargetVisibility();

    if (automationEnabled) {
        startAutomation();
    }

    const selectedAmmo = localStorage.getItem('selectedAmmo');
    if (selectedAmmo) {
        messageText.textContent = `You have selected: ${selectedAmmo.charAt(0).toUpperCase() + selectedAmmo.slice(1)}`;
    }

    if (points >= 10 && !hasClickedAmmoTab) {
        arrow.style.display = 'block';
    }

    // Check if we should show the ammo page
    checkForAmmoPageTransition();
};

window.onbeforeunload = function () {
    saveGame();
};

function checkForAmmoPageTransition() {
    if (points >= 10 && !ammoPageShown) {
        ammoPageShown = true;
        localStorage.setItem('ammoPageShown', 'true');
        setTimeout(() => {
            window.location.href = "ammo.html"; // Redirect to the ammo page with the tutorial text
        }, 500); // Delay to allow any ongoing animations to finish before redirecting
    }
}

function updateRocksText() {
    rocksText.textContent = `Rocks: ${rocks}`;
}

function throwRock() {
    const rockElement = document.createElement('div');
    rockElement.className = 'rock';
    
    // Set the initial position before adding to the DOM
    rockElement.style.top = '70%';
    rockElement.style.left = '40%';
    
    document.body.appendChild(rockElement);

    // Start the animation
    requestAnimationFrame(() => {
        rockElement.classList.add('rock-animation');
    });

    // Remove the rock after the animation
    setTimeout(() => {
        rockElement.remove();
    }, 600); // Ensure this matches the duration of your throw-rock animation

    // Trigger the jiggle effect and points update after the rock hits the target
    setTimeout(() => {
        // Remove the jiggle-effect class before adding it again to restart the animation
        targetImage.classList.remove('jiggle-effect');

        // Use requestAnimationFrame to ensure the class is removed before it's added again
        requestAnimationFrame(() => {
            targetImage.classList.add('jiggle-effect');
        });

        // Update points only after the rock hits the target
        points += 1;
        updatePointsText();

        // Check if we should show the ammo page
        checkForAmmoPageTransition();

        setTimeout(() => {
            targetImage.classList.remove('jiggle-effect');
        }, 300); // Match the duration of the jiggle animation
    }, 500); // Ensure this matches the timing of the rock hitting the target
}

targetImage.addEventListener('click', function () {
    const selectedAmmo = localStorage.getItem('selectedAmmo');
    if (rocks >= 1 && selectedAmmo === 'rocks') {
        rocks -= 1;
        updateRocksText();
        messageText.textContent = "";

        throwRock();
    } else if (rocks < 1) {
        messageText.textContent = "No rocks";
    }
});

function updatePointsText() {
    pointsText.textContent = `Points: ${points}`;
    if (points >= 10) {
        upgradeButton.style.display = 'inline-block';
    } else {
        upgradeButton.style.display = 'none';
    }
}

function checkTargetVisibility() {
    if (rocks >= 10 && !targetContainerVisible()) {
        congratsMessage.style.display = 'block';
    } else if (targetContainerVisible()) {
        targetContainer.style.display = 'block';
    }
}

function targetContainerVisible() {
    return targetContainer.style.display === 'block';
}

function collect() {
    rocks += clickValue;
    updateRocksText();

    if (rocks >= 10 && !targetContainerVisible() && congratsMessage.style.display === 'none') {
        congratsMessage.style.display = 'block';
        countdownComplete = false;
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
            countdownComplete = true;
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
        targetVisible: targetContainerVisible(),
        lastSave: Date.now(),
        ammoPageShown: ammoPageShown // Save the flag to prevent re-showing ammo page
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
        ammoPageShown = gameState.ammoPageShown || false; // Load the ammo page shown flag

        if (gameState.targetVisible) {
            targetContainer.style.display = 'block';
        } else {
            targetContainer.style.display = 'none';
        }
    }
    updatePointsText();
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

    // Reset tutorial and ammo page flags
    localStorage.removeItem('tutorialShown');
    localStorage.removeItem('ammoTutorialShown');
    localStorage.removeItem('hasClickedAmmoTab');
    localStorage.removeItem('ammoPageShown');
    ammoPageShown = false; // Reset flag for showing ammo page

    saveGame();
    updateRocksText();
    updatePointsText();
    targetContainer.style.display = 'none';
    messageText.textContent = "New game started! All progress has been reset.";
    setTimeout(() => {
        messageText.textContent = "";
    }, 3000);

    upgradeButton.style.display = 'none';
    automateButton.style.display = 'none';
    congratsMessage.style.display = 'none';
    targetContainer.style.display = 'none';
    countdownText.style.display = 'block';
    clickToContinue.style.display = 'none';

    sliderContainer.style.display = 'none';
    sliderButton.style.left = '0';
    sliderButton.classList.remove('active');
}

newGameIcon.addEventListener('click', startNewGame);

congratsMessage.addEventListener('click', function () {
    if (countdownComplete) {
        congratsMessage.style.display = 'none';
        targetContainer.style.display = 'block';
    }
});

collectButton.addEventListener('click', collect);
upgradeButton.addEventListener('click', buyUpgrade);
automateButton.addEventListener('click', automate);

sliderButton.addEventListener('mousedown', (e) => {
    isSliding = true;
    startX = e.clientX;
    e.preventDefault();
});

sliderButton.addEventListener('touchstart', (e) => {
    isSliding = true;
    startX = e.touches[0].clientX;
    e.preventDefault();
});

window.addEventListener('mousemove', (e) => {
    if (isSliding) {
        let newX = e.clientX - startX;
        if (newX < 0) newX = 0;
        if (newX > slider.clientWidth - sliderButton.clientWidth) newX = slider.clientWidth - sliderButton.clientWidth;
        sliderButton.style.left = newX + 'px';
        e.preventDefault();

        if (newX >= slider.clientWidth - sliderButton.clientWidth) {
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
        e.preventDefault();

        if (newX >= slider.clientWidth - sliderButton.clientWidth) {
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

window.addEventListener('touchend', (e) => {
    isSliding = false;
    if (!sliderButton.classList.contains('active')) {
        sliderButton.style.left = '0';
    }
    e.preventDefault();
});
