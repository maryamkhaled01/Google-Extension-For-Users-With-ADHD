

let tabControllers = {};
// background.js
// let currentPanel = "sidepanel.html"; // Default panel
let cameraWindowId = null;

function injectSummarizationScript(tabId) {
    // Send a message to the content script to abort the previous summarization
   chrome.tabs.sendMessage(tabId, { action: "abort" }, () => {
  if (chrome.runtime.lastError) {
    console.warn("⚠️ No content script yet, injecting summarization.js now:", chrome.runtime.lastError.message);
  } else {
    console.log("✅ Content script responded, continuing...");
  }

  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ["summarization.js"]
  }).catch(error => console.error("❌ Script injection failed:", error));
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





////////////////////// Text-to-Speech (TTS) Functionality //////////////////////
let lastUsableTabId = null;

// In content.js on load
chrome.runtime.sendMessage({ action: "tts_ready" });

// In background.js
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.action === "tts_ready") {
    lastUsableTabId = sender.tab.id;
    console.log("✅ TTS content script ready on tab", sender.tab.id);
  }
});


const ttsCache = {};

async function speakText(text) {
    try {
        console.log("💬 Initiating TTS for text:", text);

        //Check if the text is already cached
        if (ttsCache[text]) {
            console.log("✅ Using cached audio for text:", text);
            return playBase64Audio(ttsCache[text]);
        }

        console.log("⏳ Fetching new audio from server for text:", text);

        // Fetch the audio file from the server
        const response = await fetch("https://ttsserver-production.up.railway.app/speak", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({text})
        });

        if (!response.ok) {
            throw new Error(`Server TTS failed: ${response.statusText}`);
        }

        const blob = await response.blob();
        console.log("✅ Successfully generated .wav file for text:", text);

        // Cache the audio blob
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        let binary = "";
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        const base64Audio = btoa(binary);

        ttsCache[text] = base64Audio;
        console.log("💾 Audio cached for:", text);

        // Play the audio
        console.log("🎵 Audio playback initiated for text:", text);
        return playBase64Audio(base64Audio);      
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

function playBase64Audio(base64Audio) {

// Later when sending audio
if (lastUsableTabId) {
  chrome.tabs.sendMessage(lastUsableTabId, {
    action: "playAudioFromBase64",
    audio: base64Audio
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn("❌ Message send failed:", chrome.runtime.lastError.message);
    }
  });
} else {
  console.warn("⚠️ No usable tab to send audio to.");
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
//////////////  tts end   //////////////////////


// Listen for messages from summarization script and store the summary
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.summary && sender.tab && sender.tab.url) {
        const url = new URL(sender.tab.url).href;
        chrome.storage.local.set({ [url]: message.summary });
        chrome.storage.local.set({ summary: message.summary }); // Also update current display
    }
});


function injectSummarizationIntoAllTabs() {
  chrome.tabs.query({ url: ["http://*/*", "https://*/*"] }, (tabs) => {
    for (const tab of tabs) {
      if (!tab.id) continue;
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["summarization.js"]
      }, () => {
        if (chrome.runtime.lastError) {
          console.warn("Injection failed in tab", tab.id, chrome.runtime.lastError.message);
        } else {
          console.log("✅ Injected summarization.js into tab", tab.id);
        }
      });
    }
  });
}

// Clear summary on extension start to avoid showing stale data
chrome.runtime.onStartup.addListener(() => {
    console.log("🔄 Extension started, clearing summary...");
    injectSummarizationIntoAllTabs();
    // chrome.storage.local.set({ summary: ["📄 No page summarized yet."] });
});

chrome.runtime.onInstalled.addListener(() => {
    console.log("🆕 Extension installed, clearing summary...");
    injectSummarizationIntoAllTabs();
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
            console.log("Saved hovered text:", latestHoveredText);
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
        message = `Hey, wake up! `;    
    }
    
    console.log("📢 Preparing to speak saved text:", message);
    await speakText(message); // Use server-based TTS

    // chrome.tts.speak(message, {
    //     rate: 1.0,
    //     pitch: 1.0,
    //     volume: 1.0
    // });
}

////////////////////////////////////////////////////////////////////////////////
/// popup

let popupWindowId = null;
let popupInProgress = false;

async function triggerPopupOnce() {
  if (popupWindowId !== null) {
    console.log("⚠️ Existing popup detected. Closing it before creating a new one.");

    chrome.windows.remove(popupWindowId, () => {
      if (chrome.runtime.lastError) {
        console.warn("❌ Failed to close popup:", chrome.runtime.lastError.message);
      } else {
        console.log("✅ Previous popup closed.");
      }

      popupWindowId = null;
      popupCooldown = false;

      // Now try again AFTER the old popup is closed
      triggerPopupOnce();
    });

    return; // ⛔ Don't continue this call
  }

  // ✅ Now safe to create a new popup
  popupCooldown = true;

  await speakText("Hey, It's time for some fun!");

  chrome.windows.create({
    url: "popup.html",
    type: "popup",
    width: 800,
    height: 600
  }, (window) => {
    if (!window) return;

    popupWindowId = window.id;
    console.log("🆕 New popup created, ID:", popupWindowId);

    // Track closure
    chrome.windows.onRemoved.addListener(function onRemoved(id) {
      if (id === popupWindowId) {
        popupCooldown = false;
        popupWindowId = null;
        console.log("🧹 Popup closed, cooldown reset.");
        chrome.windows.onRemoved.removeListener(onRemoved);
      }
    });
  });

  // Failsafe timeout (just in case)
setTimeout(() => {
  if (popupWindowId !== null) {
    chrome.windows.remove(popupWindowId, () => {
      console.log("🕓 Timeout: closed lingering popup.");
      popupWindowId = null;
    });
  }
}, 30000); // 30 sec



  // chrome.tts.speak("fun time", {
  //   rate: 1.0,
  //   pitch: 1.0,
  //   volume: 1.0
  // });
}

chrome.runtime.onStartup.addListener(() => {
  if (popupWindowId !== null) {
    chrome.windows.remove(popupWindowId).catch(() => {});
    popupWindowId = null;
    console.log("🧹 Cleaned up popup on startup");
  }
});





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


// async function checkGaze() {
//   try {
//     await ensureOffscreen();

//     chrome.runtime.sendMessage({ action: "checkGaze" }, async (data) => {
//       if (chrome.runtime.lastError) {
//         console.error("❌ Message error:", chrome.runtime.lastError.message);
//         return;
//       }

//       if (!data || data.left == null || data.right == null || data.center == null || data.blinking == null) {
//         console.warn("Please readjust the camera!", data);
//         notifyUser("Please readjust the camera!");
//         chrome.tts.speak("Please readjust the camera!");

//         chrome.windows.create({
//           url: "adjustCameraPopup.html",
//           type: "popup",
//           width: 800,
//           height: 600
//         });
//         return;
//       }

//       if (data.left || data.right) {
//         console.log("❌ User is not focused!");
//         // notifyUser("You seem distracted!");
//         // chrome.tts.speak("You seem distracted!");
//         const randomAction = Math.random() < 0.5 ? "popup" : "tts";
            
//             if (randomAction === "popup") {
//                 triggerPopupOnce();
//             } else {
//                 await speakSavedText(); // Wait for TTS to finish
//             }
//       } else {
//         console.log("✅ User is focused!");
//       }
//     });
//   } catch (error) {
//     console.error("❌ Gaze tracking error:", error);
//   }
// }



chrome.storage.local.get("cameraAdjusted", (result) => {
  if (!result.cameraAdjusted) {
    // Show the camera adjustment popup
    chrome.windows.create({
      url: "adjustCameraPopup.html",
      type: "popup",
      width: 800,
      height: 600
    }, (window) => {
      if (window) {
        cameraWindowId = window.id;
        console.log("📷 New camera window ID:", cameraWindowId);
      }
    });

    // Mark the camera as adjusted once the user completes the setup
    chrome.storage.local.set({ cameraAdjusted: true });
  }
});

let gazeRetries = 0;
const MAX_GAZE_RETRIES = 5;

async function checkGaze() {
  try {
    await ensureOffscreen();

    chrome.runtime.sendMessage({ action: "checkGaze" }, async (data) => {
      if (chrome.runtime.lastError) {
        console.error("❌ Message error:", chrome.runtime.lastError.message);
        return;
      }

      if (data.left == null || data.right == null || data.center == null || data.blinking == null) {

        gazeRetries++;

        if (gazeRetries >= MAX_GAZE_RETRIES) {
            console.warn("❌ Too many gaze tracking errors, showing camera adjustment popup.");
            notifyUser("Please readjust the camera!");
            await speakText("Please readjust the camera!"); // Use server-based TTS
            //chrome.tts.speak("Please readjust the camera!");

            if (cameraWindowId !== null) {
            try {
                await chrome.windows.remove(cameraWindowId);
                console.log("✅ Closed previous camera window");
            } catch (error) {
                console.error("Failed to close previous camera window:", error);
            }
            }
    
            // Show the camera adjustment popup
            chrome.windows.create({
                url: "adjustCameraPopup.html",
                type: "popup",
                width: 800,
                height: 600
            }, (window) => {
                if (window) {
                cameraWindowId = window.id;
                console.log("📷 New camera window ID:", cameraWindowId);
                }
            });
    
            gazeRetries = 0; // Reset retries after showing the popup
        }else{
            console.log("❌ User is not focused!",data);
            const randomAction = Math.random() < 0.5 ? "popup" : "tts";
            
            if (randomAction === "popup") {
            triggerPopupOnce();
            } else {
                await speakSavedText();
            }
        }
        
        } else {
        gazeRetries = 0; // Reset retries on successful gaze data
        console.log("✅ User is focused!",data);
        }
        
    });
  } catch (error) {
    console.error("❌ Gaze tracking error:", error);
  }
  //////////////////////////////////EDIT BTN//////////////////////////

  chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === "capturePage") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      // Send the image data back to the content script
      chrome.tabs.sendMessage(sender.tab.id, {
        action: "downloadImage",
        dataUrl: dataUrl
      });
    });
  }
});



}

// Clean up any existing camera window when extension starts

chrome.runtime.onStartup.addListener(() => {
  if (cameraWindowId !== null) {
    chrome.windows.remove(cameraWindowId).catch(() => {});
    cameraWindowId = null;
    console.log("🧹 Cleaned up camera window on startup");
  }
  // clear camera check from local storage
    chrome.storage.local.remove("cameraAdjusted", () => {
        console.log("🧹 Cleared camera adjustment flag on startup");
    });
});





// Check gaze every second
// setInterval(checkGaze, 1 * 60 * 1000);


