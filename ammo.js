window.onload = function() {
    const ammoTutorial = document.getElementById('ammoTutorial');
    const continueButton = document.getElementById('continueButton');

    // Check if the tutorial has been shown before
    let tutorialShown = localStorage.getItem('ammoTutorialShown') === 'true';

    if (!tutorialShown) {
        // Show the tutorial if it hasn't been shown before
        ammoTutorial.style.display = 'block';
    }

    continueButton.addEventListener('click', function() {
        // Hide the tutorial and mark it as shown
        ammoTutorial.style.display = 'none';
        localStorage.setItem('ammoTutorialShown', 'true');
    });

    // Functionality for selecting ammo
    const rockAmmo = document.getElementById('rockAmmo');

    rockAmmo.addEventListener('change', function() {
        if (rockAmmo.checked) {
            localStorage.setItem('selectedAmmo', 'rocks');
        }
    });

    // Pre-select the previously selected ammo
    const selectedAmmo = localStorage.getItem('selectedAmmo');
    if (selectedAmmo === 'rocks') {
        rockAmmo.checked = true;
    }
};
