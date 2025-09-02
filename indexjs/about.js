const aboutBtn = document.getElementById("aboutBtn");
const popup = document.getElementById("popup");
const scrollContainer = document.getElementById("scroll-container");
const scrollContent = document.getElementById("scroll-content");

let animationId = null;
let lastTimestamp = 0;
let scrollPosition = 0;
let contentHeight = 0;
let containerHeight = 0;
let isPaused = false;
let pauseEndTime = 0;
let pauseElements = [];
let currentPauseIndex = 0;
let pauseElementCache = null;

function setupScrolling() {
    // Calculate heights
    contentHeight = scrollContent.scrollHeight;
    containerHeight = scrollContainer.clientHeight;

    // Start with content positioned at the bottom (just about to enter)
    scrollPosition = containerHeight;
    scrollContent.style.transform = `translateY(${scrollPosition}px)`;

    // Find all elements with pause markers and calculate their positions
    pauseElements = [];
    const pauseItems = scrollContent.querySelectorAll('[data-pause]');

    pauseItems.forEach(element => {
        // Calculate the position from the top of the scroll-content
        let topPos = 0;
        let prev = element.previousElementSibling;

        while (prev) {
            topPos += prev.offsetHeight + 20; // 20px is the margin-bottom
            prev = prev.previousElementSibling;
        }

        const pauseDuration = parseInt(element.getAttribute('data-pause')) || 2000;
        // Trigger pause when element reaches middle of container
        const triggerPosition = containerHeight - topPos - (element.offsetHeight / 2);

        pauseElements.push({
            element,
            triggerPosition,
            pauseDuration,
            triggered: false
        });
    });

    // Sort by trigger position (from highest to lowest since we're scrolling up)
    pauseElements.sort((a, b) => b.triggerPosition - a.triggerPosition);
    currentPauseIndex = 0;
}

function autoScrollLoop(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;

    if (isPaused) {
        if (timestamp >= pauseEndTime) {
            isPaused = false;
            if (pauseElementCache) {
                pauseElementCache.classList.remove('pause-highlight');
                pauseElementCache = null;
            }
            lastTimestamp = timestamp; // Reset timestamp after pause
        } else {
            animationId = requestAnimationFrame(autoScrollLoop);
            return; // Skip scrolling while paused
        }
    }

    const elapsed = timestamp - lastTimestamp;

    if (elapsed > 16) { // Approximately 60fps
        scrollPosition -= 0.8; // Slower speed for smoother animation
        lastTimestamp = timestamp;

        // Check if we've reached a pause point
        if (currentPauseIndex < pauseElements.length) {
            const nextPause = pauseElements[currentPauseIndex];

            if (scrollPosition <= nextPause.triggerPosition && !nextPause.triggered) {
                isPaused = true;
                pauseEndTime = timestamp + nextPause.pauseDuration;
                nextPause.triggered = true;
                currentPauseIndex++;

                // Visual feedback for paused element
                pauseElementCache = nextPause.element;
                pauseElementCache.classList.add('pause-highlight');
            }
        }

        // If all content has scrolled out of view at the top
        if (scrollPosition < -contentHeight) {
            // Reset to just below the container
            scrollPosition = containerHeight;
            // Reset pause triggers for the next loop
            pauseElements.forEach(p => p.triggered = false);
            currentPauseIndex = 0;
        }

        // Apply the scroll effect using CSS transform for better performance
        scrollContent.style.transform = `translateY(${scrollPosition}px)`;
    }

    animationId = requestAnimationFrame(autoScrollLoop);
}

function startScrolling() {
    lastTimestamp = 0;
    isPaused = false;
    animationId = requestAnimationFrame(autoScrollLoop);
}

function stopScrolling() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

function showAboutPopup() {
    // Setup the scroll content
    setupScrolling();

    // Stop any existing scrolls
    stopScrolling();

    popup.style.display = "flex";
    requestAnimationFrame(() => {
        popup.classList.add("show");
    });

    // Start scrolling after a delay
    setTimeout(startScrolling, 20);
}

function hideAboutPopup() {
    popup.classList.remove("show");

    // Stop scrolling
    stopScrolling();

    popup.addEventListener("transitionend", function handler() {
        popup.style.display = "none";
        popup.removeEventListener("transitionend", handler);
    });
}

aboutBtn.addEventListener("click", showAboutPopup);

// This handles clicking outside the popup to close it
window.addEventListener("click", (e) => {
    if (e.target === popup) {
        hideAboutPopup();
    }
});

// Initialize on load
window.addEventListener('load', function() {
    // Pre-setup the scrolling measurements
    setTimeout(setupScrolling, 100);
});