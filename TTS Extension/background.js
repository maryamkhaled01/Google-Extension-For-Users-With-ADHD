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

// Listen for messages from summarization script and store the summary
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.summary && sender.tab && sender.tab.url) {
        const url = new URL(sender.tab.url).href;
        chrome.storage.local.set({ [url]: message.summary });
        chrome.storage.local.set({ summary: message.summary }); // Also update current display
    }

    if (message.action === "togglePanel") {
        chrome.sidePanel.setOptions({
            path: "sidepanel.html",
            enabled: true
        }).catch((error) => console.error("Failed to open side panel:", error));
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



async function checkGaze() {
    console.log("Checking gaze...");
    try {
        let response = await fetch("http://localhost:5000/gaze");
        // console.log("Response from gaze tracking server:", response);
        
        let data = await response.json();
        
        if (!data) {
            console.error("❌ No gaze data received from server");
            return;
        }
        // console.log("Gaze data:", data);
        
        if (data.left == null || data.right == null || data.center == null || data.blinking == null) {
            console.warn("please readjust the camera!!!", data);
            notifyUser("Please readjust the camera!");
            chrome.tts.speak("Please readjust the camera!");
            return;
        }

        if (data.left || data.right) {
            console.log("❌ User is not focused!");
            triggerPopupOnce(); // Call the function to trigger the popup
        }
        else {
            console.log("✅ User is focused!");
        }

        // if (data.left) {
        //     console.log("👀 User is looking left!");
        // } else if (data.right) {
        //     console.log("👀 User is looking right!");
        // } else if (data.center) {
            
        // } else if (data.blinking) {
        //     console.log("😴 User is blinking!");
        // }
    
    } catch (error) {
        console.error("❌ Gaze tracking server is not running", error);
    }
}

// Check gaze every second
setInterval(checkGaze, 1 * 60 * 1000);
