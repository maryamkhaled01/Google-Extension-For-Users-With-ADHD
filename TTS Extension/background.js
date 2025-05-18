// let currentPanel = "sidepanel.html"; // Default panel
let tabControllers = {};

function injectSummarizationScript(tabId) {
    // Send a message to the content script to abort the previous summarization
    chrome.tabs.sendMessage(tabId, { action: "abort" }, () => {
        // Ignore any errors — may happen if script wasn't already injected
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ["summarization.js"]
        }).catch(error => console.error("Error injecting script:", error));
    });

    // Optionally set status text in side panel
    chrome.storage.local.set({ summary: ["⏳ Summarizing new tab..."] });
}

async function handleTabActivationOrUpdate(tabId, url) {
    if (!url || !url.startsWith("http")) {
        // Clear summary when it's a restricted or unsupported page
        console.log("🚫 Unsupported page, clearing summary:", url);
        chrome.storage.local.set({ summary: ["⚠️ No relevant content available for summarization."] });
        return;
    }

    const cached = await chrome.storage.local.get(url);
    if (cached[url]) {
        console.log("✅ Loaded cached summary for:", url);
        chrome.storage.local.set({ summary: cached[url] });
    } else {
        console.log("🔄 No cache found, summarizing:", url);
        injectSummarizationScript(tabId);
        chrome.storage.local.set({ summary: ["⏳ Summarizing... please wait"] });
    }
}


chrome.tabs.onActivated.addListener(async ({ tabId }) => {
    const tab = await chrome.tabs.get(tabId);
    handleTabActivationOrUpdate(tab.id, tab.url);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url) {
        handleTabActivationOrUpdate(tabId, tab.url);
    }
});


chrome.action.onClicked.addListener(() => {
    chrome.windows.getCurrent((window) => {
        if (window) {
            console.log("Current window ID:", window.id);
            chrome.sidePanel.open({ windowId: window.id }).catch((error) => {
                console.error("Failed to open side panel:", error);
            });
        } else {
            console.error("No active window found.");
        }
    });
});


// chrome.idle.setDetectionInterval(15);  // 15 seconds

// chrome.idle.onStateChanged.addListener((state) => {
//     if (state === "idle" || state === "locked") {
//         chrome.windows.create({
//             url: "popup.html",
//             type: "popup",
//             width: 800,
//             height: 600
//         });
//         chrome.tts.speak("fun time", {
//             rate: 1.0,
//             pitch: 2.0,
//             volume: 1.0
//         });
//     }
// });
const ttsCache = {};

async function speakText(text) {
    try {
        console.log("💬 Initiating TTS for text:", text);

        // Check if the text is already cached
        if (ttsCache[text]) {
            console.log("✅ Using cached audio for text:", text);
            await playAudio(ttsCache[text]);
            return;
        }

        console.log("⏳ Fetching new audio from server for text:", text);

        // Fetch the audio file from the server
        const response = await fetch("http://localhost:5000/speak", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text })
        });

        if (!response.ok) {
            throw new Error(`Server TTS failed: ${response.statusText}`);
        }

        const blob = await response.blob();
        console.log("✅ Successfully generated .wav file for text:", text);

        // Convert the Blob to a base64-encoded string
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
            const base64Audio = reader.result;

            // Cache the base64 audio data
            ttsCache[text] = base64Audio;
            console.log("💾 Cached audio for text:", text);

            // Play the audio
            await playAudio(base64Audio);
        };
    } catch (error) {
        console.error("❌ Error during TTS:", error);

        // Fallback to Chrome TTS if the server fails
        console.log("⚠️ Falling back to Chrome TTS for text:", text);
        chrome.tts.speak(text, {
            rate: 1.0,
            pitch: 2.0,
            volume: 1.0
        });
    }
}

// Function to play audio based on the context
async function playAudio(base64Audio) {
    console.log("🎵 Opening hidden popup for audio playback");

    // Open a hidden popup window
    chrome.windows.create({
        url: "hidden_popup.html",
        type: "popup",
        width: 1,
        height: 1,
        left: -1000, // Off-screen
        top: -1000
    }, (window) => {
        if (chrome.runtime.lastError) {
            console.error("❌ Error opening hidden popup:", chrome.runtime.lastError.message);
            return;
        }

        // Send the audio data to the hidden popup
        setTimeout(() => {
            chrome.runtime.sendMessage({
                action: "playAudio",
                audioData: base64Audio
            });
        }, 500); // Wait for the popup to load
    });
}

// Listen for messages from summarization script and store the summary
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.summary && sender.tab && sender.tab.url) {
        const url = new URL(sender.tab.url).href;
        chrome.storage.local.set({ [url]: message.summary });
        chrome.storage.local.set({ summary: message.summary }); // Also update current display
    }
});

// Clear summary on extension start to avoid showing stale data
chrome.runtime.onStartup.addListener(() => {
    console.log("🔄 Extension started, clearing summary...");
    // chrome.storage.local.set({ summary: ["📄 No page summarized yet."] });
});

chrome.runtime.onInstalled.addListener(() => {
    console.log("🆕 Extension installed, clearing summary...");
    // chrome.sidePanel.setOptions({
    //     enabled: true,
    //     path: "summarysidepanel.html"
    // });
});

/////////////////////////////////////////////////////////////////////////////////
/////// cursor tracking

// background.js
let latestHoveredText = "";
let latestCursorPosition = { x: 0, y: 0 };
let inactivityTimer = null;
const INACTIVITY_THRESHOLD = 1 * 30 * 1000; // 15 seconds

// Reset timer when user is active
function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(triggerIdleActions, INACTIVITY_THRESHOLD);
}

// Listen for activity messages from content script
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "userActive") {
        console.log("User is active, resetting inactivity timer.");
        resetInactivityTimer();
    }
});

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "saveHoveredText") {
        if (message.text && message.text.trim()) {
            latestHoveredText = message.text.trim();
        }
    }
});


function triggerIdleActions() {
    checkGaze(); // Check gaze status
    resetInactivityTimer(); // Reset the timer for the next check
    console.log("User is idle, checking gaze status...");
}

function getTextNearCursor() {
    return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            // Add return here to exit early
            if (!tabs[0]?.id) return resolve(null);
            
            chrome.tabs.sendMessage(
                tabs[0].id,
                { action: "getTextAtPosition", position: latestCursorPosition },
                (response) => {
                    resolve(response?.text || null);
                }
            );
        });
    });
}

async function speakSavedText() {
    let message;
    
    if (latestHoveredText) {
        // Use hovered text if available
        message = `You were looking at: "${latestHoveredText}"`;
        latestHoveredText = "";
    } else {
        // Request text near cursor position from content script
        const textNearCursor = await getTextNearCursor();
        console.log("Text near cursor:", textNearCursor);
        message = `Hey, wake up! "${textNearCursor}"`; 
    }
    
    console.log("📢 Preparing to speak saved text:", message);
    await speakText(message); // Use server-based TTS
}
////////////////////////////////////////////////////////////////////////////////
/// gaze track

function triggerPopupOnce() {
    
    popupCooldown = true;
    
    chrome.windows.create({
        url: "popup.html",
        type: "popup",
        width: 800,
        height: 600
    });

    chrome.tts.speak("fun time", {
        rate: 1.0,
        pitch: 2.0,
        volume: 1.0
    });
}


function notifyUser(message) {
    chrome.notifications.create({
        type: "basic",
        iconUrl: chrome.runtime.getURL("icon.png"),
        title: "⚠️ Focus Alert",
        message: message
    }, (notificationId) => {
        if (chrome.runtime.lastError) {
            console.error("Notification error:", chrome.runtime.lastError.message);
        } else {
            console.log("✅ Notification shown:", notificationId);
        }
    });
}

///////////////// GAZE TRACKING ///////////////////////////////////////


async function ensureOffscreen() {
    const exists = await chrome.offscreen.hasDocument();
    if(exists) return;
    if (!exists) {
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Text-to-speech and checking gaze while idle'
      });
    }
  }


async function checkGaze() {
  try {
    await ensureOffscreen();

    chrome.runtime.sendMessage({ action: "checkGaze" }, async (data) => {
      if (chrome.runtime.lastError) {
        console.error("❌ Message error:", chrome.runtime.lastError.message);
        return;
      }

      if (!data || data.left == null || data.right == null || data.center == null || data.blinking == null) {
        console.warn("Please readjust the camera!", data);
        notifyUser("Please readjust the camera!");
        chrome.tts.speak("Please readjust the camera!");
        chrome.windows.create({
          url: "adjustCameraPopup.html",
          type: "popup",
          width: 800,
          height: 600
        });
        return;
      }

      if (data.left || data.right) {
        console.log("❌ User is not focused!");
        // notifyUser("You seem distracted!");
        // chrome.tts.speak("You seem distracted!");
        const randomAction = Math.random() < 0.5 ? "popup" : "tts";
            
            if (randomAction === "popup") {
                triggerPopupOnce();
            } else {
                await speakSavedText(); // Wait for TTS to finish
            }
      } else {
        console.log("✅ User is focused!");
      }
    });
  } catch (error) {
    console.error("❌ Gaze tracking error:", error);
  }
}

// Check gaze every second
// setInterval(checkGaze, 1 * 60 * 1000);





