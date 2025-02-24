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

chrome.idle.setDetectionInterval(15);  // 5 minutes, only accepts 15,30,60,300,600

chrome.idle.onStateChanged.addListener((state) => {
    if (state === "idle" || state === "locked") {
        chrome.windows.create({
            url: "popup.html",
            type: "popup",
            width: 400,
            height: 300
        });
    }
});
