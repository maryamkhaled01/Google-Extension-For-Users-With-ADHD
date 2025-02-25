import { getRandomEquation } from './equations.js';

document.addEventListener("DOMContentLoaded", async () => {
    const textInput = document.getElementById("textInput");
    const playButton = document.getElementById("playButton");
    const resetButton = document.getElementById("resetButton");
    const contentDisplay = document.getElementById("contentDisplay");
    const speakContentButton = document.getElementById("speakContentButton");
    // const toggleSwitch = document.getElementById("flexSwitchCheckDefault")


   // Load the saved toggle state and update UI
   const { isExtensionActive } = await chrome.storage.session.get(["isExtensionActive"]);
   toggleSwitch.checked = isExtensionActive ?? false;

   // Listen for toggle switch changes
   toggleSwitch.addEventListener("change", async () => {
       const isActive = toggleSwitch.checked;

       // Save the new state
       await chrome.storage.session.set({ isExtensionActive: isActive });

       // Notify background script about the toggle change
       await chrome.runtime.sendMessage({ action: "toggleExtension", state: isActive });

       console.log("🔄 Extension toggled:", isActive);
   });
   
    async function loadCSV(file) {
        const response = await fetch(file);
        const text = await response.text();
        return text.split("\n").map(line => line.trim()).filter(line => line.length > 0);
    }

    // Load from CSV
    const Joke = await loadCSV(chrome.runtime.getURL("datasets/shortjokes.csv"));

    const Riddle = await loadCSV(chrome.runtime.getURL("datasets/riddles.csv"));

    const Exercise = await loadCSV(chrome.runtime.getURL("datasets/exercises.csv"));

    const categories = {
        Equation : Array.from({ length: 5 }, () => getRandomEquation()), // Generate 5 random equations
        Exercise,
        Riddle,
        Joke 
    };

    function getRandomCategory() {
        const keys = Object.keys(categories);
        return keys[Math.floor(Math.random() * keys.length)];
    }
    
    function getRandomContent() {
        const category = getRandomCategory();
        const items = categories[category];
        const content = items[Math.floor(Math.random() * items.length)];
        return { category, content }; // Return both category and content
    }
    
    // Display random content with category
    const { category, content } = getRandomContent();
    contentDisplay.textContent = `${category}: ${content}`; // Show category name along with content

    // Read the random content aloud
    speakContentButton.addEventListener("click", () => {
        chrome.tts.speak(contentDisplay.textContent, {
            rate: 1.0,
            pitch: 1.0,
            volume: 1.0
        });
    });

    // TTS for user input text
    playButton.addEventListener("click", () => {
        const text = textInput.value;
        if (text.trim() === "") {
            alert("Please enter some text!");
            return;
        }
        chrome.tts.speak(text, {
            rate: 1.0,
            pitch: 1.0,
            volume: 1.0
        });
    });

    resetButton.addEventListener("click", () => {
        textInput.value = "";
    });
});