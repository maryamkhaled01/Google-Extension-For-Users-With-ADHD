chrome.idle.setDetectionInterval(50); // 5 minutes

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
