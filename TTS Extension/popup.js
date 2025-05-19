

document.addEventListener("DOMContentLoaded", async () => {
    // DOM Elements
    const contentDisplay = document.getElementById("contentDisplay");
    const speakContentButton = document.getElementById("speakContentButton");
    const showAnswerButton = document.getElementById("showAnswerButton");
    const answerDisplay = document.getElementById("answerDisplay");

    // Load CSV files
    async function loadCSV(file) {
        const response = await fetch(file);
        const text = await response.text();
        return text.split("\n").map(line => line.trim()).filter(line => line.length > 0);
    }

    const [Joke, Riddle, Exercise, RiddleAnswers] = await Promise.all([
        loadCSV(chrome.runtime.getURL("datasets/shortjokes.csv")),
        loadCSV(chrome.runtime.getURL("datasets/riddles.csv")),
        loadCSV(chrome.runtime.getURL("datasets/exercises.csv")),
        loadCSV(chrome.runtime.getURL("datasets/riddleAnswers.csv"))
    ]);

    const categories = {
        Exercise,
        Riddle,
        Joke 
    };

    let currentRiddleIndex = -1;

    function getRandomCategory() {
        const keys = Object.keys(categories);
        return keys[Math.floor(Math.random() * keys.length)];
    }
    
    function getRandomContent() {
        const category = getRandomCategory();
        const items = categories[category];
        const index = Math.floor(Math.random() * items.length);
        const content = items[index];
        
        if (category === "Riddle") {
            currentRiddleIndex = index;
        }
        
        return { category, content };
    }

    // Update UI based on content type
    function updateUI(category, content) {
        contentDisplay.textContent = `${category}: ${content}`;
        answerDisplay.classList.add("hidden");
        showAnswerButton.classList.add("hidden");
        
        if (category === "Riddle") {
            showAnswerButton.classList.remove("hidden");
            chrome.windows.getCurrent(window => {
                chrome.windows.update(window.id, {
                    width: 400,
                    height: 350,
                    left: Math.floor(screen.width - 450),
                    top: 100,
                    focused: true
                });
            });
        } else {
            chrome.windows.getCurrent(window => {
                chrome.windows.update(window.id, {
                    width: 400,
                    height: 250,
                    left: Math.floor(screen.width - 450),
                    top: 100,
                    focused: true
                });
            });
        }
    }

    // Initialize with random content
    const { category, content } = getRandomContent();
    updateUI(category, content);

    // Event Listeners
    speakContentButton.addEventListener("click", () => {
        chrome.tts.speak(contentDisplay.textContent, {
            rate: 1.0,
            pitch: 1.0,
            volume: 1.0
        });
    });

    showAnswerButton.addEventListener("click", () => {
        if (currentRiddleIndex >= 0 && currentRiddleIndex < RiddleAnswers.length) {
            answerDisplay.textContent = `Answer: ${RiddleAnswers[currentRiddleIndex]}`;
            answerDisplay.classList.remove("hidden");
            showAnswerButton.classList.add("hidden");
            chrome.windows.getCurrent(window => {
                chrome.windows.update(window.id, {
                    height: 350,
                    focused: true
                });
            });
        }
    });
});

