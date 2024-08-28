const newsTicker = document.getElementById('news-ticker');
const newsContent = document.getElementById('news-content');
let newsTickerInterval;

// Example news stories
const newsStories = {
    cellsMilestone: "Congratulations! You've reached 100 cells!",
    tissuesUnlocked: "New Discovery! Tissues have been unlocked!",
    organsUnlocked: "Amazing! Organs are now available for creation!",
    organSystemsUnlocked: "Incredible! Organ Systems have been unlocked!",
    cellFarmUnlocked: "Fantastic! The Cell Farm has been unlocked!" // New entry for Cell Farm unlock
};

// Track the last displayed milestone
let lastMilestoneDisplayed = null;

function triggerNews(storyKey) {
    const story = newsStories[storyKey];
    if (story && lastMilestoneDisplayed !== storyKey) {
        lastMilestoneDisplayed = storyKey;
        newsContent.textContent = story;

        // Ensure the ticker is visible
        newsTicker.classList.add('show');
        newsTicker.classList.remove('hidden');

        // Restart the scrolling animation
        restartAnimation();
    }
}

function restartAnimation() {
    // Reset animation by removing and re-adding the class
    newsContent.classList.remove('scrolling');
    void newsContent.offsetWidth; // Trigger a reflow to restart the animation
    newsContent.classList.add('scrolling');
}

function stopTickerLoop() {
    clearInterval(newsTickerInterval);
    newsTicker.classList.remove('show');
    newsTicker.classList.add('hidden');
    lastMilestoneDisplayed = null;
}

function checkNewsMilestones() {
    if (organSystemsUnlocked) {
        triggerNews('organSystemsUnlocked');
    } else if (organsUnlocked) {
        triggerNews('organsUnlocked');
    } else if (tissuesUnlocked) {
        triggerNews('tissuesUnlocked');
    } else if (cellFarmUnlocked) { // Check if Cell Farm is unlocked
        triggerNews('cellFarmUnlocked'); // Trigger news for Cell Farm unlock
    } else if (cells >= 100) {
        triggerNews('cellsMilestone');
    } else {
        stopTickerLoop(); // Stop the ticker if no milestones are active
    }
}

window.addEventListener('DOMContentLoaded', () => {
    loadGameState(); // Ensure game state is loaded
    checkNewsMilestones(); // Check for any news immediately on load
});
