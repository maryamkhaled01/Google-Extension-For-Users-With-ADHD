
console.log("AI Summary Extension Background Loaded!");

const blockedSites = ["youtube.com", "facebook.com", "tiktok.com"];
const dummyText = "This is a dummy text for TTS to read when changing tabs.";

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    if (blockedSites.some(site => tab.url.includes(site))) {
      chrome.tabs.update(tabId, { url: chrome.runtime.getURL("blocked.html") });
    } else {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => chrome.runtime.sendMessage({ action: "generateSummary" })
      });
    }
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Received Message in Background:", request);

  if (request.action === "generateSummary") {
    console.log("Processing Summary Request...");
    getMainText().then(text => {
      console.log("Extracted Text:", text);
      summarizeText(text).then(summary => {
        console.log("Summary Generated:", summary);
        chrome.storage.local.set({ summary }, () => {
          sendResponse({ status: "Summary generated", summary });
        });
      }).catch(error => {
        console.error("Error generating summary:", error);
        sendResponse({ status: "Error generating summary", error });
      });
    }).catch(error => {
      console.error("Error extracting text:", error);
      sendResponse({ status: "Error extracting text", error });
    });
    
    return true; // Keep the message channel open for sendResponse
  }

  if (request.action === "triggerTTS") {
    console.log("Processing TTS Request...");
    chrome.storage.local.get("summary", (data) => {
      if (data.summary) {
        chrome.tts.speak(data.summary);
        sendResponse({ status: "TTS triggered" });
      } else {
        chrome.tts.speak(dummyText);
        sendResponse({ status: "No summary available, using dummy text" });
      }
    });
    return true; // Keep the message channel open for sendResponse
  }

  return true; // Keeps sendResponse alive for async calls
});

async function getMainText(tabId) {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        const body = document.body;
        let textContent = '';

        // Try to get text from the body, common article tags, etc.
        if (body) {
          textContent = body.innerText || '';
        }

        // Alternatively, if specific article content exists (for news sites, for example)
        const article = document.querySelector('article');
        if (article) {
          textContent = article.innerText;
        } else {
          // Try other common main content selectors
          const mainContent = document.querySelector('main');
          if (mainContent) {
            textContent = mainContent.innerText;
          }
        }

        // Clean up any unwanted parts of the text if necessary
        textContent = textContent.trim();
        return textContent;
      }
    }, (results) => {
      if (chrome.runtime.lastError || !results || !results[0]) {
        reject(chrome.runtime.lastError || new Error("Failed to extract text"));
      } else {
        resolve(results[0].result);
      }
    });
  });
}

// Implementation for summarizeText
async function summarizeText(text) {
  const sentences = text.split('. ');
  const summary = sentences.slice(0, 3).join('. ') + '.';
  return summary;
}



  