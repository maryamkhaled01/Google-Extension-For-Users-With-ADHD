// Vibrant palette of warm & cool tones
const colorPalette = [
    "#FF6B6B", // Soft red
    "#FFD93D", // Warm yellow
    "#6BCB77", // Pastel green
    "#4D96FF", // Bright blue
    "#C77DFF"  // Light purple
  ];
  

  function updateSummary() {
    chrome.storage.local.get("summary", (data) => {
        console.log("📥 Storage Data Retrieved:", data); // Debugging log

        const summaryContainer = document.getElementById("summaryText");
        summaryContainer.innerHTML = ""; // Clear old content

        if (data.summary && Array.isArray(data.summary) && data.summary.length > 0) {
            const ul = document.createElement("ul");

            data.summary.forEach(point => {
                const li = document.createElement("li");
                
                // Apply initial random styling
                const fontSize = Math.random() * 0.7 + 1; // 1rem - 1.7rem
                const randomColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];

                li.textContent = point;
                li.style.fontSize = `${fontSize}rem`;
                li.style.color = randomColor;
                li.style.fontWeight = "bold";
                li.style.marginBottom = "5px"; // Adds spacing
                // Add transition for smooth changes
                li.style.transition = "font-size 3s ease-in-out, color 3s ease-in-out";

                ul.appendChild(li);
            });

            summaryContainer.appendChild(ul);

            // Gradually update styles every 10 seconds
            setInterval(() => {
                const listItems = ul.querySelectorAll("li");
                listItems.forEach(li => {
                    const newFontSize = Math.random() * 0.7 + 1; // New font size between 1rem and 1.7rem
                    const newColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
                    li.style.fontSize = `${newFontSize}rem`;
                    li.style.color = newColor;
                });
            }, 10000); // Update every 10 seconds

        } else {
            summaryContainer.textContent = "❌ No summary available.";
            summaryContainer.style.fontSize = "1.5rem";
            summaryContainer.style.color = "red";
            summaryContainer.style.fontWeight = "bold";
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
