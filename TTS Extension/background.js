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

chrome.idle.onStateChanged.addListener((state) => {
    if (state === "idle" || state === "locked") {
        chrome.windows.create({
            url: "popup.html",
            type: "popup",
            width: 800,
            height: 600
        });
    }
});

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
