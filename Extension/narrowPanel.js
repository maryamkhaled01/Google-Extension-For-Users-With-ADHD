document.addEventListener('DOMContentLoaded', () => {
  const narrowPanel = document.getElementById('narrowPanel');
  const toggleButton = document.getElementById('toggleButton');
  const summaryBtn = document.getElementById('summarize');
  const editBtn = document.getElementById('edit');
  const notesBtn = document.getElementById('take-notes');
  const summaryPanel = document.getElementById('summaryPanel');
  const iconContainer = document.getElementById('icon-container');
  const container = document.getElementById('container');
  const notesListContainer = document.getElementById('saved-notes-list');

  let notesWindowId = null;
  let popupCooldown = false;

  // Validate required elements
  if (!iconContainer || !summaryPanel || !notesBtn || !notesListContainer) {
    console.error("❌ Missing one or more required DOM elements.");
    return;
  }

  // Show summarization panel
  summaryBtn.addEventListener("click", () => {
    iconContainer.style.display = "none";
    summaryPanel.style.display = "flex";
    container.style.display = "flex";
    notesListContainer.style.display = "none";
    chrome.runtime.sendMessage({ method: "summarize" });
  });

  // Restore toolbar when message is received
  window.addEventListener("message", (event) => {
    if (event.data.action === "showToolbar") {
      iconContainer.style.display = "block";
      summaryPanel.style.display = "none";
      container.style.display = "block";
      notesListContainer.style.display = "flex";
    }
  });

  // Activate annotation editor
  editBtn.addEventListener("click", () => {
    console.log("✏️[panel] Edit button clicked — sending message");
    chrome.runtime.sendMessage({ method: "activate_editor" });
  });

  // Display saved notes in the side panel
 function displaySavedNotes() {
  const container = document.getElementById("saved-notes-list");
  container.innerHTML = "";

  const notes = JSON.parse(localStorage.getItem("userNotesList") || "[]");

  if (notes.length === 0) {
    container.innerHTML = "<p style='color: #666;'>No saved notes yet.</p>";
    return;
  }

  notes.forEach((note, index) => {
    const div = document.createElement("div");
    div.className = "note-preview bounce-on-hover";
    div.innerHTML = `
      <div class="note-header">
        <strong class="note-title" style="cursor:pointer">${note.title || `Note ${index + 1}`}</strong>
        <div class="note-actions">
            <button class="rename-note note" data-index="${index}"><i class="fa-solid fa-pen"></i></button>
            <button class="delete-note note" data-index="${index}"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div class="note-content" style="display:none; white-space:pre-wrap;">${note.content}</div>
    `;
    container.appendChild(div);
  });

  container.querySelectorAll(".note-title").forEach((titleEl, i) => {
    titleEl.addEventListener("click", () => {
      const content = titleEl.parentElement.nextElementSibling;
      content.style.display = content.style.display === "none" ? "block" : "none";
    });
  });

  container.querySelectorAll(".delete-note").forEach(button => {
    button.addEventListener("click", (e) => {
      const buttonEl = e.target.closest("button");
      const idx = parseInt(buttonEl.dataset.index);
      notes.splice(idx, 1);
      localStorage.setItem("userNotesList", JSON.stringify(notes));
      displaySavedNotes();
    });
  });

  container.querySelectorAll(".rename-note").forEach(button => {
    button.addEventListener("click", (e) => {
      const buttonEl = e.target.closest("button");
      const idx = parseInt(buttonEl.dataset.index);
      const newTitle = prompt("Enter new note title:", notes[idx].title || `Note ${idx + 1}`);
      if (newTitle !== null) {
        notes[idx].title = newTitle;
        localStorage.setItem("userNotesList", JSON.stringify(notes));
        displaySavedNotes();
      }
    });
  });
}


function generateTitleFromContent(htmlContent) {
  const plainText = htmlContent
    .replace(/<[^>]*>/g, '')  // Remove HTML tags
    .replace(/\s+/g, ' ')     // Collapse whitespace
    .trim();

  if (!plainText) return "Untitled Note";

  return plainText.length > 30 ? plainText.slice(0, 30) + "..." : plainText;
}



  // Handle Notes Button
  notesBtn.addEventListener('click', () => {
    if (popupCooldown) return;
    popupCooldown = true;

    chrome.windows.create({
      url: chrome.runtime.getURL("taking-notes/taking-notes.html"),
      type: "popup",
      width: 360,
      height: 380,
      left: Math.round(screen.width / 2 - 180),
      top: Math.round(screen.height / 2 - 210)
    }, (window) => {
      if (window) {
        notesWindowId = window.id;
        console.log("Notes popup opened with ID:", notesWindowId);

        // Reset when closed
        const onWindowRemoved = (windowId) => {
          if (windowId === notesWindowId) {
            popupCooldown = false;
            notesWindowId = null;
            chrome.windows.onRemoved.removeListener(onWindowRemoved);
            console.log("Notes popup closed");
            displaySavedNotes(); // Refresh notes list after closing popup
          }
        };
        chrome.windows.onRemoved.addListener(onWindowRemoved);
      }
    });
  });

  // Display saved notes when panel loads
  displaySavedNotes();
});
