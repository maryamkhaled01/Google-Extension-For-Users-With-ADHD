document.addEventListener("DOMContentLoaded", function () {
    const toggleButton = document.getElementById("togglePanelButton");

    if (toggleButton) {
        toggleButton.addEventListener("click", () => {
            chrome.runtime.sendMessage({ action: "togglePanel" });
        });
    } else {
        console.error("Toggle button not found!");
    }


});