document.addEventListener("DOMContentLoaded",async ()=>{
    const toggleSwitch = document.getElementById("flexSwitchCheckDefault")

    
const { isExtensionActive } = await chrome.storage.session.get(["isExtensionActive"]);
toggleSwitch.checked = isExtensionActive ?? false;

toggleSwitch.addEventListener("change", async () => {
    const isActive = toggleSwitch.checked;

    // Save the new state
    await chrome.storage.session.set({ isExtensionActive: isActive });

    // Notify background script about the toggle change
    await chrome.runtime.sendMessage({ action: "toggleExtension", state: isActive });

    console.log("🔄 Extension toggled:", isActive);
});


})



// Listen for toggle switch changes
//correction
// toggleSwitch.addEventListener("change", async () => {
//     const isActive = toggleSwitch.checked;

//     // Save the new state
//     await chrome.storage.session.set({ isExtensionActive: isActive });

//     // Notify background script about the toggle change
//     await chrome.runtime.sendMessage({ action: "toggleExtension", state: isActive });

//     console.log("🔄 Extension toggled:", isActive);
// });



function updateSummary() {
    chrome.storage.local.get("summary", (data) => {
        console.log("Storage Data Retrieved:", data); // Debugging log

        const summaryContainer = document.getElementById("summary");
        summaryContainer.innerHTML = ""; // Clear old content

        if (data.summary && Array.isArray(data.summary) && data.summary.length > 0) {
            const ul = document.createElement("ul");
            data.summary.forEach(point => {
                const li = document.createElement("li");
                li.textContent = point;
                ul.appendChild(li);
            });
            summaryContainer.appendChild(ul);
        } else {
            summaryContainer.textContent = "No summary available.";
        }
    });
}

// Call once on page load
updateSummary();

// Listen for storage updates
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (changes.summary) {
        console.log("Storage Updated:", changes.summary.newValue); // Debugging log
        updateSummary();
    }
});
