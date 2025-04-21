let debounceTimeout;

document.addEventListener("mousemove", (event) => {
    // Check if extension is still valid
    if (!chrome.runtime?.id) {
        console.log("Extension context invalid, removing listener.");
        document.removeEventListener("mousemove", arguments.callee);
        return;
    }

    clearTimeout(debounceTimeout);

    debounceTimeout = setTimeout(() => {
        const element = document.elementFromPoint(event.clientX, event.clientY);
        if (!element) return;

        let text = element.innerText || element.textContent || "";
        text = text.trim();
        if (!text) return;

        if (text.length > 300) {
            text = text.substring(0, 300) + "...";
        }

        chrome.runtime.sendMessage({
            action: "saveHoveredText",
            text: text
        }, (response) => {
            // Handle errors (e.g., extension disconnected)
            if (chrome.runtime.lastError) {
                console.log("Extension context invalid, removing listener.");
                document.removeEventListener("mousemove", arguments.callee);
            }
        });
    }, 100);
});