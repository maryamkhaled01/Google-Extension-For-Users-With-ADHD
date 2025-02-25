import { getRandomEquation } from './equations.js';

document.addEventListener("DOMContentLoaded", async () => {
    const contentDisplay = document.getElementById("contentDisplay");
    // const toggleSwitch = document.getElementById("flexSwitchCheckDefault")


   
   
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

   
 
});