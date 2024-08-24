const newsTicker = document.getElementById('news-ticker');
const newsContent = document.getElementById('news-content');
let newsQueue = [];
let newsTickerInterval;

// Example news stories
const newsStories = {
    cellsMilestone: "Congratulations! You've reached 100 cells!",
    tissuesUnlocked: "New Discovery! Tissues have been unlocked!",
    organsUnlocked: "Amazing! Organs are now available for creation!"
};

function triggerNews(storyKey) {
    const story = newsStories[storyKey];
    if (story) {
        newsQueue.push(story);
        if (!newsTickerInterval) {
            showNextNews();
        }
    }
}

function showNextNews() {
    if (newsQueue.length > 0) {
        const nextStory = newsQueue.shift();
        newsContent.textContent = nextStory;
        newsTicker.classList.add('show');
        newsTicker.classList.remove('hidden');

        // Start scrolling animation
        newsContent.style.animation = 'none'; // Reset animation
        newsContent.offsetHeight; // Trigger reflow
        newsContent.style.animation = ''; // Apply animation

        newsTickerInterval = setTimeout(() => {
            newsTicker.classList.remove('show');
            newsTicker.classList.add('hidden');
            clearTimeout(newsTickerInterval);
            newsTickerInterval = null;
            showNextNews(); // Show the next news if there's more in the queue
        }, 5000); // Show each news story for 5 seconds
    }
}

// Ensure story triggering happens only when conditions are met and avoid multiple triggers
function checkNewsMilestones() {
    if (cells >= 100) {
        triggerNews('cellsMilestone');
    }

    if (tissuesUnlocked && !previouslyTriggeredTissues) {
        triggerNews('tissuesUnlocked');
        previouslyTriggeredTissues = true;
    }

    if (organsUnlocked && !previouslyTriggeredOrgans) {
        triggerNews('organsUnlocked');
        previouslyTriggeredOrgans = true;
    }
}

// Run the check at appropriate points in the game logic, like after major updates or during the game loop
