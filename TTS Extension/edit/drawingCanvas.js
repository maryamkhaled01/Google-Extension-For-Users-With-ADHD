// Avoid re-injecting
(() => {
  if (document.getElementById("annotationCanvas")) return;

// Create canvas overlay
const canvas = document.createElement("canvas");
canvas.id = "annotationCanvas";
canvas.style.cssText = `
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  z-index: 999999;
  pointer-events: auto;
`;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
document.body.appendChild(canvas);

const ctx = canvas.getContext("2d");
ctx.lineCap = "round";
ctx.strokeStyle = "red";
ctx.lineWidth = 2;

let tool = "pencil";
let isDrawing = false;
let startX, startY;

// Toolbar UI
const toolbar = document.createElement("div");
toolbar.style.cssText = `
  position: fixed;
  top: 20px; left: 20px;
  background: white;
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 8px;
  z-index: 1000000;
  display: flex;
  gap: 6px;
  font-family: sans-serif;
`;

const tools = ["✏️", "📏", "⬛", "🧽", "💾"];
tools.forEach((label, i) => {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.title = ["Pencil", "Line", "Rectangle", "Eraser", "Save"][i];
  btn.onclick = () => tool = ["pencil", "line", "rect", "eraser", "save"][i];
  toolbar.appendChild(btn);
});
document.body.appendChild(toolbar);

// Drawing logic
canvas.addEventListener("mousedown", (e) => {
  isDrawing = true;
  startX = e.clientX;
  startY = e.clientY;
  if (tool === "pencil" || tool === "eraser") {
    ctx.beginPath();
    ctx.moveTo(startX, startY);
  }
});

canvas.addEventListener("mousemove", (e) => {
  if (!isDrawing) return;
  const x = e.clientX, y = e.clientY;

  if (tool === "pencil") {
    ctx.strokeStyle = "red";
    ctx.lineTo(x, y);
    ctx.stroke();
  } else if (tool === "eraser") {
    ctx.strokeStyle = "white";
    ctx.lineTo(x, y);
    ctx.stroke();
  }
});

canvas.addEventListener("mouseup", (e) => {
  if (!isDrawing) return;
  isDrawing = false;
  const x = e.clientX, y = e.clientY;

  if (tool === "line") {
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(x, y);
    ctx.stroke();
  } else if (tool === "rect") {
    ctx.strokeRect(startX, startY, x - startX, y - startY);
  } else if (tool === "save") {
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "annotation.png";
    link.click();
  }
});





const link = document.createElement("link");
link.href = "https://fonts.googleapis.com/css2?family=Inter&display=swap";
link.rel = "stylesheet";
document.head.appendChild(link);

})();