const newsTicker = document.getElementById('news-ticker');
const newsContent = document.getElementById('news-content');
let newsTickerInterval;

// Example news stories
const newsStories = {
    cellsMilestone: "Congratulations! You've reached 100 cells!",
    tissuesUnlocked: "New Discovery! Tissues have been unlocked!",
    organsUnlocked: "Amazing! Organs are now available for creation!",
    organSystemsUnlocked: "Incredible! Organ Systems have been unlocked!"
};

// Track the last displayed milestone
let lastMilestoneDisplayed = null;

function triggerNews(storyKey) {
    const story = newsStories[storyKey];
    if (story && lastMilestoneDisplayed !== storyKey) {
        lastMilestoneDisplayed = storyKey;
        currentStory = story;

        newsContent.textContent = story;

        // Ensure the ticker remains visible
        newsTicker.classList.add('show');
        newsTicker.classList.remove('hidden');

        // Start the ticker loop
        startTickerLoop();
    }
}

function startTickerLoop() {
    // Reset and trigger the scrolling animation
    newsContent.style.animation = 'none'; // Reset animation
    newsContent.offsetHeight; // Trigger reflow

    // Calculate the full width the text needs to travel
    const tickerWidth = newsTicker.offsetWidth;
    const contentWidth = newsContent.scrollWidth;
    const totalDistance = tickerWidth + contentWidth; // Distance from start to off-screen left

    // Calculate the duration of the scrolling based on the distance
    const scrollDuration = totalDistance / 100 * 2; // Adjust multiplier for speed

    // Add a delay after the scroll completes
    const delayDuration = 6; // Additional seconds to wait before scrolling again

    // Set the animation properties
    newsContent.style.animation = `scroll ${scrollDuration + delayDuration}s linear infinite`;

    // Remove any previous keyframes to avoid duplication
    removePreviousKeyframes();

    // Set the keyframes for the scrolling animation
    const styleSheet = document.styleSheets[0];
    styleSheet.insertRule(`
        @keyframes scroll {
            0% {
                transform: translateX(${tickerWidth}px);
            }
            80% {
                transform: translateX(-${contentWidth}px);
            }
            100% {
                transform: translateX(-${contentWidth}px); /* Remain off-screen */
            }
        }
    `, styleSheet.cssRules.length);
}

function removePreviousKeyframes() {
    const styleSheet = document.styleSheets[0];
    const rules = styleSheet.cssRules || styleSheet.rules;
    for (let i = rules.length - 1; i >= 0; i--) {
        if (rules[i].name === 'scroll') {
            styleSheet.deleteRule(i);
        }
    }
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
    } else if (cells >= 100) {
        triggerNews('cellsMilestone');
    } else {
        stopTickerLoop(); // Stop the ticker if no milestones are active
    }
}

window.addEventListener('load', () => {
    loadGameState(); // Ensure game state is loaded
    checkNewsMilestones(); // Check for any news immediately on load
});
