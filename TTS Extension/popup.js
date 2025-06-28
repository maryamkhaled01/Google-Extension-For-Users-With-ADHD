

document.addEventListener("DOMContentLoaded", async () => {

    // ===== ADD THE RESIZE CODE HERE =====
    chrome.windows.getCurrent(window => {
        chrome.windows.update(window.id, {
            width: 500,
            height: 450,
            left: Math.floor(screen.width - 550), // Optional: keeps right-aligned
            top: 100 // Optional: keeps near top
        });
        
    });
    // ===== END OF RESIZE CODE =====

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

    // Emoji mapping
    const categoryEmojis = {
        Exercise: "💪",
        Riddle: "🤔",
        Joke: "😂"
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
        

        // Add emoji to the content
        const emoji = categoryEmojis[category];
        return { 
            category, 
            content: `${emoji} ${content}` // Format: "💪 Do 10 pushups!"
        };

        //return { category, content };
    }

    // Initialize with random content
    const { category, content } = getRandomContent();
    contentDisplay.textContent = `${category}: ${content}`;

    // Toggle answer button visibility based on content type
    showAnswerButton.classList.toggle("hidden", category !== "Riddle");

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
        }
    });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "playAudio" && message.audioData) {
    const audio = new Audio(message.audioData);
    audio.play()
      .then(() => {
        console.log("✅ Audio played successfully in popup.");
        sendResponse({ success: true });
      })
      .catch(err => {
        console.error("❌ Audio playback failed:", err);
        sendResponse({ success: false, error: err.message });
      });

    // This line should be outside .then() to prevent message channel errors
    return true;
  }
});

});
