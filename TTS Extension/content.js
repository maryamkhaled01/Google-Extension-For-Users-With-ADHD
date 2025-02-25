// content.js - Detect user inactivity and send message to background script

let inactivityTime = 6000; // 1 minute
let TTSTime = inactivityTime*5;
let timer;

function resetTimer() {
    clearTimeout(timer);
    timer = setTimeout(() => {
        chrome.runtime.sendMessage({ action: "inactive" }, (response) => {
            if (chrome.runtime.lastError) {
                console.error(" Error sending message:", chrome.runtime.lastError);
                console.log(" Retrying in 1 second...");
                setTimeout(resetTimer, 1000);
            } else {
                console.log(" Message sent successfully:", response);
            }
        });
    }, inactivityTime);
}

const blockedSites = [
    "tiktok.com",
    "facebook.com",
    "instagram.com"
];

// Redirect if on a blocked site
blockedSites.forEach((site) => {
    if (window.location.hostname.includes(site)) {
        document.body.innerHTML = "<h1 style='text-align:center; margin-top:20%;'>Focus Mode Active 🚀</h1>";
    }
});

function getNearestSentence() {
    let selection = window.getSelection();
    if (!selection.rangeCount) return "No text found.";
  
    let range = selection.getRangeAt(0);
    let node = range.startContainer;
    
    // Ensure we have a text node
    while (node.nodeType !== Node.TEXT_NODE) {
        node = node.firstChild || node.nextSibling;
        if (!node) return "No text found.";
    }
  
    let text = node.textContent || "";
    
    // Split text into sentences using regex
    let sentences = text.match(/[^.!?]+[.!?]/g) || [text];
  
    // Return the closest sentence
    return sentences.length ? sentences[0].trim() : "No sentence found.";
  }

// Track activity
document.addEventListener("mousemove", resetTimer);
document.addEventListener("keydown", resetTimer);
document.addEventListener("scroll", resetTimer);
resetTimer();


// Detect focus loss
document.addEventListener("visibilitychange", () => {
    console.log("Visibility changed: ", document.hidden);
    if (document.hidden) {
        console.log("Sending focusLost message");
        chrome.runtime.sendMessage({ action: "focusLost" }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error sending message:", chrome.runtime.lastError);
            } else {
                console.log("Message sent successfully:", response);
            }
        });
    }
});

async function loadCSV(file) {
    const response = await fetch(file);
    const text = await response.text();
    return text.split("\n").map(line => line.trim()).filter(line => line.length > 0);
}

async function getRandomContent() {
    // Load datasets
    const Joke = await loadCSV(chrome.runtime.getURL("datasets/shortjokes.csv"));
    const Riddle = await loadCSV(chrome.runtime.getURL("datasets/riddles.csv"));
    const Exercise = await loadCSV(chrome.runtime.getURL("datasets/exercises.csv"));
    
    const categories = {
        Equation: Array.from({ length: 5 }, () => getRandomEquation()), // Generate 5 random equations
        Exercise,
        Riddle,
        Joke
    };

    const keys = Object.keys(categories);
    const category = keys[Math.floor(Math.random() * keys.length)];
    const items = categories[category];
    const content = items[Math.floor(Math.random() * items.length)];

    return { category, content };
}

async function showFocusPopup() {
    console.log("📢 Attempting to open focus popup...");

    const { category, content } = await getRandomContent();

    const popup = window.open("", "Focus Reminder", "width=400,height=300");
    if (!popup || popup.closed || typeof popup.closed === "undefined") {
        console.error("❌ Popup blocked by Chrome. Ensure popups are allowed.");
        alert("⚠️ Chrome blocked the popup. Please allow popups for this extension.");

        return;
    }
    
    
        popup.document.write(`
            <html>
            <head>
                <title>Focus Reminder</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
                    h2 { color: red; }
                    p { font-size: 18px; }
                    button { padding: 10px; margin-top: 20px; font-size: 16px; }
                </style>
            </head>
            <body>
                <h2>Time to Refocus! 🚀</h2>
                <p><strong>${category}</strong>: ${content}</p>
                <button onclick="window.close()">Got It!</button>
            </body>
            </html>
        `);
        console.log("✅ Popup displayed successfully.");

    
}

// Listen for messages from background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("📩 Message received in content.js:", message);

    if (message.action === "focusWarning") {
        console.log("✅ Popup function executed");
        showFocusPopup();
        sendResponse({ status: "popup displayed" });
    } else {
        console.error("❌ Unrecognized action:", message.action);
    }

    return true; // Ensures async responses are handled
});








chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getNearestSentence") {
        let sentence = getNearestSentence();
        console.log("📢 Nearest sentence detected:", sentence);
        sendResponse({ text: sentence });
        return true; // ✅ Ensures the response is processed asynchronously
    }
});





// function getNearestSentence() {
//     const selection = window.getSelection();
//     if (!selection.rangeCount) return "No text found.";
    
//     const range = selection.getRangeAt(0);
//     const node = range.startContainer;
//     const text = node.textContent || "";
    
//     // Split text into sentences
//     const sentences = text.match(/[^.!?]+[.!?]/g) || [text];
//     return sentences.length ? sentences[0] : "No sentence found.";
// }

// Listen for messages from background.js
// chrome.runtime.onMessage.addListener((message) => {
//     if (message.action === "readNearestSentence") {
//         const sentence = getNearestSentence();
//         speechSynthesis.speak(new SpeechSynthesisUtterance(sentence));
//     }
// });
