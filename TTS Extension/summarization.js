// tool to abort asynchronous operations like fetch() requests.
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


///////// speech listener ////////
chrome.runtime.sendMessage({ action: "tts_ready" });

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "playAudioFromBase64") {
    console.log("🔊 Received base64 audio message");

    const audioBlob = new Blob(
      [Uint8Array.from(atob(message.audio), c => c.charCodeAt(0))],
      { type: "audio/wav" }
    );

    const audioUrl = URL.createObjectURL(audioBlob);
    console.log("🎧 Audio URL created:", audioUrl);

    const audio = new Audio(audioUrl);

    audio.onloadedmetadata = () => {
      console.log("✅ Audio metadata loaded, duration:", audio.duration);
    };

    audio.onplay = () => console.log("▶️ Audio started playing");
    audio.onended = () => console.log("✅ Playback finished");
    audio.onerror = (e) => console.error("❌ Audio playback error", e);

    audio.play().catch((err) => {
      console.error("⚠️ Playback failed:", err);
    });
  }
});
//////////  end speech   //////



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


(async function summarizeCurrentPage() {

  // if (window.opener || window.innerWidth < 600 || window.innerHeight < 600) {
  //   console.log("🛑 Skipping summarization: likely a popup.");
  //   return;
  // }
  // ✅ Extra filtering: skip if not the top-level frame
  if (window.self !== window.top) {
    console.log("🛑 Skipping summarization: inside an iframe.");
    return;
  }

  
  /////////////////////////////////////////////////////////
  const currentUrl = window.location.href;

  try {
    const response = await fetch("https://summary-server-production.up.railway.app/bart-summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: currentUrl })
    });

    const data = await response.json();
    if (typeof data.summary === "string") {
      const bulletPoints = data.summary.split(/(?<=[.!?])\s+/).filter(Boolean);
      chrome.storage.local.set({ summary: bulletPoints }, () => {
        console.log("✅ Summary stored.");
        console.log("Server response:", data);

      });
    } else {
      console.warn("❌ Summarization error from server:", data.error || data.details);
      chrome.storage.local.set({ summary: ["Failed to summarize page."] });
    }
  } catch (err) {
    console.error("Fetch error:", err);
    chrome.storage.local.set({ summary: ["Server unreachable."] });
  }
})();





