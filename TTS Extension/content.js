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
