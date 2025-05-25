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


  // Notes button functionality
  notesBtn.addEventListener('click', () => {
    // Implement logic to open notes popup
    console.log('Notes button clicked');
  });
});
