document.addEventListener('DOMContentLoaded', () => {
  const narrowPanel = document.getElementById('narrowPanel');
  const toggleButton = document.getElementById('toggleButton');
  const summaryBtn = document.getElementById('summarize');
  const editBtn = document.getElementById('edit');
  const notesBtn = document.getElementById('take-notes');
  const summaryPanel = document.getElementById('summaryPanel')
  const iconContainer = document.getElementById('icon-container')
  const container = document.getElementById('container')
  // Toggle panel expansion


  // toggleButton.addEventListener('click', () => {
  //   narrowPanel.classList.toggle('expanded');
  // });





  if (!iconContainer || !summaryPanel) {
    console.error("❌ One or more elements are missing.");
    return;
  }

  summaryBtn.addEventListener("click", () => {
    iconContainer.style.display = "none";
    summaryPanel.style.display = "flex";
    container.style.display = "flex";
  });


//  // Summary button functionality
//   summaryBtn.addEventListener('click', () => {
//     // Implement logic to display the summary panel
//     console.log('Summary button clicked');
//     // const isVisible = summaryPanel.style.display === "block";
//     // summaryPanel.style.display = isVisible ? "none" : "block";

//     document.getElementById("icon-container").style.display = "none";
//     document.getElementById("summaryPanel").style.display = "block";
//   });

  window.addEventListener("message", (event) => {
  if (event.data.action === "showToolbar") {
    iconContainer.style.display = "flex";
    summaryPanel.style.display = "none";
    container.style.display = "block";
  }
});


  // Edit button functionality
  editBtn.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const url = tabs[0].url;
  if (!url.startsWith('http') && !url.startsWith('https')) {
    alert('Drawing tools cannot be used on this page.');
    return;
  }

  // Inject only if not already injected
  chrome.scripting.executeScript({
    target: { tabId: tabs[0].id },
    files: ["edit/edit.js"]
  });
});

});


  // Add this at the top with other variables
let notesWindowId = null;
let popupCooldown = false;

// Modified notes button functionality
notesBtn.addEventListener('click', () => {
    // Prevent multiple popups
    if (popupCooldown) return;
    popupCooldown = true;
    
    // Create the popup window
    chrome.windows.create({
        url: chrome.runtime.getURL("taking-notes/taking-notes.html"),
        type: "popup",
        width: 800,
        height: 600,
        left: Math.round(screen.width / 2 - 400), // Center horizontally
        top: Math.round(screen.height / 2 - 300)  // Center vertically
    }, (window) => {
        if (window) {
            notesWindowId = window.id;
            console.log("Notes popup opened with ID:", notesWindowId);

            // Listen for window close to reset cooldown
            const onWindowRemoved = (windowId) => {
                if (windowId === notesWindowId) {
                    popupCooldown = false;
                    notesWindowId = null;
                    chrome.windows.onRemoved.removeListener(onWindowRemoved);
                    console.log("Notes popup closed");
                }
            };
            chrome.windows.onRemoved.addListener(onWindowRemoved);
        }
    });
});
});