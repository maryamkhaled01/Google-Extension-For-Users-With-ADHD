let currentPanel = "sidepanel.html"; // Default panel

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

chrome.idle.setDetectionInterval(15);  // 15 seconds



  chrome.runtime.onConnect.addListener(port => {
    console.log("Background script is active");
    port.onDisconnect.addListener(() => {
        console.log(" Background script may be unloaded soon.");
    });
});

 // Handle inactivity messages from content script
 let focusTracker = 0;

 chrome.storage.session.get("focusTracker").then((data) => {
    focusTracker = data.focusTracker || 0;
 })

 //Extension Activation
chrome.runtime.onMessage.addListener(async(message, sender,sendResponse) => {
  console.log("Message received in background.js:", message);
  if(message.action === "toggleExtension"){
    await chrome.storage.session.set({ isExtensionActive: message.state });
    console.log("Extension active state updated to:", message.state);
    sendResponse({ status: "saved" });
    return true;
  }

  //correction
   const { isExtensionActive } = await chrome.storage.session.get(["isExtensionActive"]);
//    chrome.storage.session.get(["isExtensionActive"]).then((result) => {
    // const isExtensionActive = result.isExtensionActive ?? false;
    console.log("🔍 Checking extension state before action:", isExtensionActive);

    if (!isExtensionActive) {
        console.log("🚫 Extension is turned off. Ignoring action.");
        sendResponse({ status: "ignored" });
        return true;
    }

    // Continue processing if the extension is active...
    if (message.action === "inactive") {
        console.log("User inactive");
        focusTracker++;
        chrome.storage.session.set({ focusTracker: focusTracker });
    
        
        console.log("Focus Tracker count: ",focusTracker)
        if(focusTracker < 5){
          chrome.tts.speak("You have been inactive. Time to refocus!", { rate: 1.0, pitch: 1.0, volume: 1.0 });
    
        }
        else {
          focusTracker = 0;
          chrome.storage.session.set({ focusTracker: 0 });
          chrome.runtime.onStartup.addListener(() => {
            console.log("🔄 Extension started. Waiting for active tab...");
        });
        
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === "inactive") {
                console.log("📢 User inactive, fetching nearest sentence...");
                findActiveTabAndExecute();
            }
        });
        
        function findActiveTabAndExecute() {
            chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
                if (!tabs || tabs.length === 0 || !tabs[0].id) {
                    console.warn("⚠️ No active tab found. Retrying in 1 second...");
                    setTimeout(findActiveTabAndExecute, 1000); // Retry after 1 second
                    return;
                }
                executeTTS(tabs[0].id);
            });
        }
        
        function executeTTS(tabId) {
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ["content.js"]
            }, () => {
                if (chrome.runtime.lastError) {
                    console.error("❌ Error injecting content script:", chrome.runtime.lastError);
                    return;
                }
        
                console.log("✅ Content script injected successfully.");
                chrome.storage.session.get(["isExtensionActive"]).then((data) => {
                  if (!data.isExtensionActive) {
                      console.log("🚫 Extension is turned OFF. Skipping nearest sentence detection.");
                      return;
                  }
              
                  chrome.tabs.sendMessage(tabId, { action: "getNearestSentence" }, (response) => {
                      if (chrome.runtime.lastError) {
                          console.error("❌ Error sending message:", chrome.runtime.lastError);
                          return;
                      }
              
                      if (response && response.text) {
                          console.log("🔊 Speaking nearest sentence:", response.text);
                          chrome.tts.speak(response.text, { rate: 1.0, pitch: 1.0, volume: 1.0 });
                      } else {
                          console.error("❌ Failed to get nearest sentence.");
                      }
                  });
              });
              
            });
        }
        
        
        
        
          //    chrome.runtime.sendMessage({ action: "getNearestSentence" }, (response) => {
          //     if (chrome.runtime.lastError) {
          //       console.error("❌ Error sending message:", chrome.runtime.lastError);
          //       return;
          //   }
          //     if (response && response.text) {
          //       console.log("🔊 Speaking nearest sentence:", response.text);
          //       chrome.tts.speak(response.text, { rate: 1.0, pitch: 1.0, volume: 1.0 });
          //     } else {
          //       console.error("Failed to get nearest sentence.");
          //   }
          //  });
          //       focusTracker = 0;
          //     chrome.storage.session.set({ focusTracker: 0 });
    
        }
    
    } else if (message.action === "focusLost") {
        console.log("Focus lost");
        chrome.tts.speak("Focus lost! Stay on task.", { rate: 1.0, pitch: 1.0, volume: 1.0 });
    }
    
    sendResponse({ status: "processed" });
      return true;
});




//TTS nearest sentence:



// chrome.idle.setDetectionInterval(15);  // 5 minutes, only accepts 15,30,60,300,600

// chrome.idle.onStateChanged.addListener((state) => {
//     if (state === "idle" || state === "locked") {
//         chrome.windows.create({
//             url: "popup.html",
//             type: "popup",
//             width: 400,
//             height: 300
//         });
//     }
// });
// Function to inject summarization script
function injectSummarizationScript(tabId) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ["summarization.js"]
    }).catch(error => console.error("Error injecting script:", error));
}

// Detect when a tab is updated (new page load or refresh)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url && tab.url.startsWith("http")) {
        console.log("Tab updated:", tab.url);
        injectSummarizationScript(tabId);
    }
});

// Detect when the user switches tabs
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab.url && tab.url.startsWith("http")) {
            console.log("Tab switched to:", tab.url);
            injectSummarizationScript(tab.id);
        }
    } catch (error) {
        console.error("Error switching tab:", error);
    }
});

// Listen for messages from summarization script and store the summary
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "togglePanel") {
      currentPanel = (currentPanel === "sidepanel.html") ? "summarysidepanel.html" : "sidepanel.html";
      console.log("Switching panel to:", currentPanel);

      chrome.sidePanel.setOptions({
          path: currentPanel,
          enabled: true
      }).catch((error) => console.error("Failed to switch side panel:", error));
    }
    if (message.summary) {
        chrome.storage.local.set({ summary: message.summary });
    }
});
