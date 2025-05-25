let controller = new AbortController();  // global controller


function safeSendMessage(message) {

    if (!chrome.runtime?.id) {
        console.warn("Extension context is not available.");
        return;
  }
  try {
      chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        console.warn("Runtime error:", chrome.runtime.lastError.message);
      }
    });
  } catch (err) {
    console.error("SendMessage failed:", err.message);
  }
}



console.log("ContentLoaded: summarization.js is active");

document.addEventListener('mousemove', () => {
    safeSendMessage({ action: "userActive" });
});

document.addEventListener('click', () => {
    safeSendMessage({ action: "userActive" });
});

document.addEventListener('keydown', () => {
    safeSendMessage({ action: "userActive" });
});
// Track text hover events
// document.addEventListener('mouseover', (event) => {
//     const target = event.target;

//     // Check if the hovered element is text (e.g., not an image/button)
//     if (target && target.nodeType === Node.ELEMENT_NODE && target.textContent.trim() !== "") {
//         const hoveredText = target.textContent.trim().substring(0, 100); // Limit to 100 chars
//         if (hoveredText) {
//             // Send text to background script
//             chrome.runtime.sendMessage({
//                 action: "saveHoveredText",
//                 text: hoveredText
//             });
//         }
//     }
// });

// New: Handle text retrieval requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Received message: text at position", message);

    if (message.action === "getTextAtPosition") {
        const { x, y } = message.position;
        
        // Convert page coordinates to viewport coordinates
        const clientX = x - window.scrollX;
        const clientY = y - window.scrollY;
        
        // Get elements at cursor position
        const elements = document.elementsFromPoint(clientX, clientY);
        
        // Extract text from the first valid element
        for (const element of elements) {
            const text = element.textContent?.trim().substring(0, 100); // Limit to 100 chars
            if (text) {
                sendResponse({ text });
                return;
            }
        }
        
        sendResponse({ text: null });
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "playAudio") {
        console.log("🎵 Playing audio received from background script");
        const audio = new Audio(message.audioData); // Create an audio element with the base64 data
        audio.play() // Play the audio
            .then(() => {
                console.log("✅ Audio playback started successfully");
            })
            .catch((error) => {
                console.error("❌ Error during audio playback:", error);
            });
    }
});

function extractText() {
    try {
        let textSections = [];

        document.querySelectorAll('article, main, section, p').forEach(el => {
            if (
                el.innerText.length > 50 &&
                !el.closest('nav, footer, aside, header, form, script, style, button, svg')
            ) {
                textSections.push(el.innerText.trim());
            }
        });

        let fullText = document.documentElement.innerText.trim();
        if (textSections.length === 0) {
            textSections.push(fullText);
        }

        const bannedPhrases = [
            "About Advertising Business",
            "Privacy Terms",
            "Search settings",
            "Your data in Search",
            "Advanced search",
            "How Search works",
            "Send feedback",
            "All rights reserved",
            "Browser version not recommended",
            "Your browser is outdated",
            "Sign in for the best experience"
        ];
        
        let currentDomain = window.location.hostname.replace("www.", "").split(".")[0];
        bannedPhrases.push(currentDomain.charAt(0).toUpperCase() + currentDomain.slice(1));
        bannedPhrases.push(currentDomain.toLowerCase());
        
        let filteredText = textSections
            .join("\n\n")
            .split("\n")
            .filter(line => 
                line.length > 30 &&
                !bannedPhrases.some(phrase => line.includes(phrase)) &&
                !/^the browser version/i.test(line.trim())  // Add this condition here
            )
            .join("\n");
    

        if (!filteredText || filteredText.trim().length < 50) {
            return "No relevant content available for summarization.";
        }

        return filteredText;
    } catch (error) {
        console.error("Text Extraction Error:", error.message);
        return `Error extracting text: ${error.message}`;
    }
}

async function summarizeText(text, percentage = 0.1) {
    console.log("Extracted Text:", text);

    const sentences = text.match(/[^.!?]+[.!?]/g) || [];
    if (sentences.length === 0) {
        console.log("No valid sentences found.");
        return ["No relevant content available for summarization."];
    }

    const words = text.split(/\s+/);
    const tfidf = {};
    words.forEach(word => {
        tfidf[word] = (tfidf[word] || 0) + 1;
    });

    const dtMatrix = sentences.map(sentence => 
        sentence.split(/\s+/).map(word => tfidf[word] || 0)
    );
    
    const similarityMatrix = dtMatrix.map(row => 
        dtMatrix.map(col => row.reduce((sum, val, i) => sum + val * col[i], 0))
    );

    const scores = new Array(sentences.length).fill(1);
    const d = 0.85, maxIter = 100, tol = 1e-5;
    for (let iter = 0; iter < maxIter; iter++) {
        let newScores = new Array(sentences.length).fill(0);
        let diff = 0;
        
        similarityMatrix.forEach((row, i) => {
            row.forEach((val, j) => {
                if (i !== j) {
                    newScores[i] += d * (val * scores[j]);
                }
            });
            newScores[i] += (1 - d);
            diff += Math.abs(newScores[i] - scores[i]);
        });
        
        scores.splice(0, scores.length, ...newScores);
        if (diff < tol) break;
    }

    // Filter out sentences that are too short/long
    const rankedSentences = scores.map((score, index) => ({
        sentence: sentences[index].trim(),
        wordCount: sentences[index].trim().split(/\s+/).length,
        index,
        score
    }))
    .filter(s => s.wordCount >= 10 && s.wordCount <= 30)
    .sort((a, b) => b.score - a.score);

    // Determine how many sentences to select
    const count = Math.max(1, Math.floor(rankedSentences.length * percentage)); // ensure at least 1
    const topSentences = rankedSentences.slice(0, count);

    // Optional: sort by original order (chronological flow)
    topSentences.sort((a, b) => a.index - b.index);

    const summary = topSentences.map(s => s.sentence);
    console.log("Generated Summary:", summary);
    return summary;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "abort" && controller) {
        controller.abort();
        console.log("📭 Abort message received.");
    }
});

async function summarizeWithAbortCheck(text, signal) {
    if (signal.aborted) return ["❌ Summarization aborted."];

    const summary = await summarizeText(text);
    if (signal.aborted) return ["❌ Summarization aborted."];

    return summary;
}

(async function () {
    const text = extractText();

    if (!text || text.trim().length < 20) {
        console.log("Extracted text is too short or empty.");
        return;
    }

    // chrome.runtime.sendMessage({ summary: ["⏳ Summarizing... please wait"] });

    try {
        const summaryList = await summarizeWithAbortCheck(text, controller.signal);
        chrome.runtime.sendMessage({ summary: summaryList });
    } catch (err) {
        if (err.name === 'AbortError') {
            console.log("Summarization aborted.");
        } else {
            console.error("Summarization error:", err);
        }
    }
})();





