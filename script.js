document.addEventListener('DOMContentLoaded', function () {
    const newGameIcon = document.getElementById('newGameIcon');
    const collectButton = document.getElementById('collectButton');
    const upgradeButton = document.getElementById('upgradeButton');
    const automateButton = document.getElementById('automateButton');
    const targetImage = document.getElementById('targetImage');
    const congratsMessage = document.getElementById('congratsMessage');
    
    // Add event listeners for touch and click
    newGameIcon.addEventListener('click', startNewGame);
    newGameIcon.addEventListener('touchend', startNewGame);

    collectButton.addEventListener('click', collect);
    collectButton.addEventListener('touchend', collect);

    upgradeButton.addEventListener('click', buyUpgrade);
    upgradeButton.addEventListener('touchend', buyUpgrade);

    automateButton.addEventListener('click', automate);
    automateButton.addEventListener('touchend', automate);

    targetImage.addEventListener('click', throwRock);
    targetImage.addEventListener('touchend', throwRock);

    congratsMessage.addEventListener('click', handleCongratsMessageClick);
    congratsMessage.addEventListener('touchend', handleCongratsMessageClick);

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
});

window.onbeforeunload = function () {
    saveGame();
};

let rocks = 0;
let points = 0;
let clickValue = 1;
let autoCollect = 0;
let automationEnabled = false;
let automationInterval = null;
let countdownComplete = false;

const rocksText = document.getElementById('rocksText');
const messageText = document.getElementById('messageText');
const pointsText = document.getElementById('pointsText');
const countdownText = document.getElementById('countdownText');
const clickToContinue = document.getElementById('clickToContinue');
const sliderContainer = document.getElementById('sliderContainer');
const arrow = document.getElementById('arrow');

let countdownTimer;
let countdownValue = 5;
let hasClickedAmmoTab = localStorage.getItem('hasClickedAmmoTab') === 'true';
let tutorialShown = localStorage.getItem('tutorialShown') === 'true';

function updateRocksText() {
    rocksText.textContent = `Rocks: ${rocks}`;
}

function throwRock() {
    const rockElement = document.createElement('div');
    rockElement.className = 'rock';
    
    rockElement.style.top = '70%';
    rockElement.style.left = '40%';
    document.body.appendChild(rockElement);

    requestAnimationFrame(() => {
        rockElement.classList.add('rock-animation');
    });

    setTimeout(() => {
        rockElement.remove();
    }, 600);

    setTimeout(() => {
        targetImage.classList.add('jiggle-effect');

        points += 1;
        updatePointsText();

        if (points >= 10 && !tutorialShown) {
            tutorialShown = true;
            localStorage.setItem('tutorialShown', 'true');
            window.location.href = "ammo.html";
        }

        if (points >= 10 && !hasClickedAmmoTab) {
            arrow.style.display = 'block';
        }

        setTimeout(() => {
            targetImage.classList.remove('jiggle-effect');
        }, 300);
    }, 500);
}

function updatePointsText() {
    pointsText.textContent = `Points: ${points}`;
    upgradeButton.style.display = points >= 10 ? 'inline-block' : 'none';
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

    localStorage.removeItem('tutorialShown');
    localStorage.removeItem('ammoTutorialShown');
    localStorage.removeItem('hasClickedAmmoTab');

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

function handleCongratsMessageClick() {
    if (countdownComplete) {
        congratsMessage.style.display = 'none';
        targetContainer.style.display = 'block';
    }
}

ammoTypesButton.addEventListener('click', function () {
    if (!hasClickedAmmoTab) {
        arrow.style.display = 'none';
        localStorage.setItem('hasClickedAmmoTab', 'true');
        hasClickedAmmoTab = true;
    }
});
