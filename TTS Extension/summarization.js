// tool to abort asynchronous operations like fetch() requests.
let controller = new AbortController();  // global controller

// Detect user activity
document.addEventListener('mousemove', () => { // Mouse moved
    chrome.runtime.sendMessage({ action: "userActive" });
});

document.addEventListener('click', () => { // user clicks
    chrome.runtime.sendMessage({ action: "userActive" });
});

document.addEventListener('keydown', () => { // keyword pressed
    chrome.runtime.sendMessage({ action: "userActive" });
});

function getCleanTextFromElement(element) {
    const clone = element.cloneNode(true);

    // Remove unwanted tags
    clone.querySelectorAll('style, script, noscript').forEach(el => el.remove());

    // Remove CSS-style fragments more thoroughly
    clone.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'));
    clone.querySelectorAll('[class]').forEach(el => el.removeAttribute('class'));
    
    // Get clean text
    let text = clone.textContent.trim();

    // Remove CSS-style fragments more thoroughly
    text = text.replace(/\s+/g, ' ');
    text = text.replace(/\.?[\w\-]+\s*\{[^}]+\}/g, '').trim(); // Basic CSS rules
    text = text.replace(/@media\s+[^{]+\{[^}]+\}/g, '').trim(); // Media queries
    text = text.replace(/\/\*[^*]*\*+([^/*][^*]*\*+)*\//g, '').trim(); // CSS comments

    return text;
}

document.addEventListener('mouseover', (event) => {
    let target = event.target;

    while (target && target !== document.body) {
        const style = window.getComputedStyle(target);

        // Skip elements that are hidden or not displayed, or are transparent
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0' || style.color === 'transparent') {
            target = target.parentElement;
            continue;
        }

        const text = getCleanTextFromElement(target);

        // Skip if there's no meaningful text or it's too short
        if (text && text.length > 20 && !text.includes("Duration")) {
            // Additional check to skip text that's mostly CSS
            if (text.includes('{') || text.includes('}') || text.includes('@media')) {
                target = target.parentElement;
                continue;
            }

            const sentenceMatch = text.match(/^[\s\S]*?[.!?\[\]\n](\s|$)/);
            const hoveredText = sentenceMatch ? sentenceMatch[0].trim() : text.substring(0, 100).trim();

            if (hoveredText) {
                chrome.runtime.sendMessage({
                    action: "saveHoveredText",
                    text: hoveredText
                });
            }
            break;
        }
        target = target.parentElement;
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
    if (request.action === "getTextAtPosition") {
        const elementAtPosition = document.elementFromPoint(request.position.x, request.position.y);
        if (elementAtPosition) {
            const text = getCleanTextFromElement(elementAtPosition);
            sendResponse({ text: text });
        } else {
            // If no element is found at the position, try to find the nearest text
            let nearestText = findNearestText(request.position.x, request.position.y);
            sendResponse({ text: nearestText });
        }
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

// async function summarizeText(text) {
//   try {
//     const response = await fetch('http://localhost:5000/summarize', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify({ text })
//     });

//     const data = await response.json();
//     return data.summary;
//   } catch (error) {
//     console.error('Summarization error:', error);
//     return "Failed to summarize.";
//   }
// }


// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   if (request.action === 'summarize') {
//     const pageText = extractText();
//     summarizeContent(pageText).then(summary => {
//       sendResponse({ summary });
//     });
//     return true; // Indicates async response
//   }
// });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Abort handling
  if (message.action === "abort" && controller) {
      controller.abort();
      console.log("📭 Abort message received.");
      sendResponse({ success: true });
      return; // no need to keep port open
  }

//   // Text retrieval at mouse position
//   if (message.action === "getTextAtPosition") {
//       const { x, y } = message.position;
//       const clientX = x - window.scrollX;
//       const clientY = y - window.scrollY;
//       const elements = document.elementsFromPoint(clientX, clientY);

//       for (const element of elements) {
//           const text = element.textContent?.trim().substring(0, 100);
//           if (text) {
//               sendResponse({ text });
//               return;
//           }
//       }

//       sendResponse({ text: null });
//       return;
//   }

  // Summarization
  if (message.action === 'summarize') {
      const pageText = extractText();
      summarizeTest(pageText).then(summary => {
          sendResponse({ summary });
      }).catch(err => {
          console.error("Summarization failed:", err);
          sendResponse({ summary: "Error occurred." });
      });

      return true; // Keep the message port open
  }

  // Default response for unknown messages (optional)
  sendResponse({ success: false, message: "Unknown action." });
});


(async function () {
    const text = extractText();

    if (!text || text.trim().length < 20) {
        console.log("Extracted text is too short or empty.");
        return;
    }

    // chrome.runtime.sendMessage({ summary: ["⏳ Summarizing... please wait"] });

    try {
        const summaryList = await summarizeWithAbortCheck(text, controller.signal);
        chrome.storage.local.set({ summary: summaryList }, () => {
          console.log("✅ Summary stored in chrome.storage.local");
      });
      
    } catch (err) {
        if (err.name === 'AbortError') {
            console.log("Summarization aborted.");
        } else {
            console.error("Summarization error:", err);
        }
    }
})();



// async function summarizeText(text) {
//     console.log("Extracted Text:", text);

//     const sentences = text.match(/[^.!?]+[.!?]/g) || [];
//     if (sentences.length === 0) {
//         console.log("No valid sentences found.");
//         return ["No summary available."];
//     }

//     const words = text.split(/\s+/);
//     const tfidf = {};
//     words.forEach(word => {
//         tfidf[word] = (tfidf[word] || 0) + 1;
//     });

//     const dtMatrix = sentences.map(sentence => 
//         sentence.split(/\s+/).map(word => tfidf[word] || 0)
//     );
    
//     const similarityMatrix = dtMatrix.map(row => 
//         dtMatrix.map(col => row.reduce((sum, val, i) => sum + val * col[i], 0))
//     );

//     const scores = new Array(sentences.length).fill(1);
//     const d = 0.85, maxIter = 100, tol = 1e-5;
//     for (let iter = 0; iter < maxIter; iter++) {
//         let newScores = new Array(sentences.length).fill(0);
//         let diff = 0;
        
//         similarityMatrix.forEach((row, i) => {
//             row.forEach((val, j) => {
//                 if (i !== j) {
//                     newScores[i] += d * (val * scores[j]);
//                 }
//             });
//             newScores[i] += (1 - d);
//             diff += Math.abs(newScores[i] - scores[i]);
//         });
        
//         scores.splice(0, scores.length, ...newScores);
//         if (diff < tol) break;
//     }

//     const rankedSentences = scores.map((score, index) => ({
//         sentence: sentences[index].trim(),
//         wordCount: sentences[index].trim().split(/\s+/).length,
//         score
//     }))
//     .filter(s => s.wordCount >= 10 && s.wordCount <= 30)  // medium-length filter
//     .sort((a, b) => b.score - a.score);

//     const topSentences = rankedSentences.slice(0, 10).map(s => s.sentence);

//     console.log("Generated Summary:", topSentences);
//     return topSentences;
// }


// (async function () {
//     const text = extractText();
//     if (!text || text.trim().length < 50 || text === "No relevant content available for summarization.") {
//         chrome.runtime.sendMessage({ summary: ["No summary available."] });
//         return;
//     }

//     // Send loading message immediately
//     chrome.runtime.sendMessage({ summary: ["⏳ Summarizing... please wait"] });

//     const summaryList = await summarizeText(text);

//     // Then send the final summary
//     chrome.runtime.sendMessage({ summary: summaryList });
// })();


  // function extractText() {
  //   const paragraphs = Array.from(document.getElementsByTagName('p'));
  //   return paragraphs.map(p => p.innerText).join('\n');
  // }
  
  


