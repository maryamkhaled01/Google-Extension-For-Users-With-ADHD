// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    // Load summary immediately
    updateSummary();
    
    // Set up back button if it exists
    const backBtn = document.getElementById("back-btn");
    if (backBtn) {
        backBtn.addEventListener("click", () => {
            parent.postMessage({ action: "showToolbar" }, "*");
        });
    }
    
    // Listen for summary updates
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (changes.summary) {
            updateSummary();
        }
    });
});

// Update summary display
function updateSummary() {
    chrome.storage.local.get("summary", (data) => {
        const summaryContainer = document.getElementById("summaryText");
        
        // Clear existing content
        summaryContainer.innerHTML = "";
        summaryContainer.className = "";
        
        if (data.summary && Array.isArray(data.summary) && data.summary.length > 0) {
            const ul = document.createElement("ul");
            
            data.summary.forEach(point => {
                if (point.trim()) { // Only add non-empty points
                    const li = document.createElement("li");
                    li.textContent = point.trim();
                    ul.appendChild(li);
                }
            });
            
            summaryContainer.appendChild(ul);
        } else {
            summaryContainer.textContent = "No summary available.";
            summaryContainer.className = "no-summary";
        }
    });
}