document.addEventListener("DOMContentLoaded", () => {
    const textInput = document.getElementById("textInput");
    const playButton = document.getElementById("playButton");
    const resetButton = document.getElementById("resetButton");
    const contentDisplay = document.getElementById("contentDisplay");
    const speakContentButton = document.getElementById("speakContentButton");
   
    async function loadCSV(file) {
        const response = await fetch(file);
        const text = await response.text();
        return text.split("\n").map(line => line.trim()).filter(line => line.length > 0);
      }
      
    const jokes = loadCSV("datasets/shortjokes.csv")
    
  const categories = {
      equations: [
          "Solve: 5 + 3 × (8 ÷ 2) = ?",
          "What is the derivative of x²?",
          "If x + y = 10 and x - y = 4, find x and y."
      ],
      riddles: [
          "I speak without a mouth and hear without ears. What am I?",
          "The more you take, the more you leave behind. What am I?",
          "I have keys but open no locks. What am I?"
      ],
      exercises: [
          "Do 10 push-ups!",
          "Stretch your arms and legs for 30 seconds.",
          "Stand up and walk around for a minute."
      ],
      jokes
  };

 


  function getRandomCategory() {
      const keys = Object.keys(categories);
      return keys[Math.floor(Math.random() * keys.length)];
  }

  function getRandomContent() {
      const category = getRandomCategory();
      const items = categories[category];
      return items[Math.floor(Math.random() * items.length)];
  }

  const randomContent = getRandomContent();
  contentDisplay.textContent = randomContent;

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
