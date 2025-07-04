const writingArea = document.getElementById("text-input");
const fontSizeRef = document.getElementById("fontSize");
const toggleBtn = document.getElementById("alignmentToggleBtn");
const leftIcon = document.getElementById("alignLeftIcon");
const centerIcon = document.getElementById("alignCenterIcon");
const rightIcon = document.getElementById("alignRightIcon");

// Apply text formatting (bold, italic, underline)
document.querySelectorAll(".format-btn").forEach(button => {
  button.addEventListener("click", () => {
    const command = button.dataset.command;
    document.execCommand(command, false, null);
    button.classList.toggle("active");
  });
});

// Handle font size selection
fontSizeRef.addEventListener("change", (e) => {
  document.execCommand("fontSize", false, e.target.value);
});

let alignmentState = "left"; // current state

toggleBtn.addEventListener("click", () => {
  if (alignmentState === "left") {
    document.execCommand("justifyCenter");
    leftIcon.style.display = "none";
    centerIcon.style.display = "inline";
    rightIcon.style.display = "none";
    alignmentState = "center";
  } else if (alignmentState === "center") {
    document.execCommand("justifyRight");
    leftIcon.style.display = "none";
    centerIcon.style.display = "none";
    rightIcon.style.display = "inline";
    alignmentState = "right";
  } else {
    document.execCommand("justifyLeft");
    leftIcon.style.display = "inline";
    centerIcon.style.display = "none";
    rightIcon.style.display = "none";
    alignmentState = "left";
  }
});

// Save note to localStorage
function saveNote() {
  const content = writingArea.innerHTML.trim();
  if (!content) return;

  const timestamp = new Date().toISOString();
  const note = {
    id: timestamp,
    content
  };

  // Get existing notes from localStorage
  const notes = JSON.parse(localStorage.getItem("userNotesList") || "[]");

  // Add new note to the beginning
  notes.unshift(note);

  // Save updated list back to localStorage
  localStorage.setItem("userNotesList", JSON.stringify(notes));

  // Show confirmation message
  const messageDiv = document.getElementById("note-message");
  messageDiv.textContent = "Note saved successfully!";
  messageDiv.classList.add("show");
  setTimeout(() => messageDiv.classList.remove("show"), 2000);

  // Clear the note area
  writingArea.innerHTML = "";
}


// Load saved note on startup
window.addEventListener("DOMContentLoaded", () => {
  const savedNotes = localStorage.getItem("userNotes");
  // if (savedNotes) {
  //   writingArea.innerHTML = savedNotes;
  // }

  // Save button logic
  const saveBtn = document.getElementById("save-btn");
  if (saveBtn) {
    saveBtn.addEventListener("click", saveNote);
  }
});
