// newsTicker.js

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

// Example usage (trigger these functions when milestones are reached):
if (cells >= 100) {
    triggerNews('cellsMilestone');
}

if (tissuesUnlocked && !previouslyTriggered) {
    triggerNews('tissuesUnlocked');
}

if (organsUnlocked && !previouslyTriggered) {
    triggerNews('organsUnlocked');
}
