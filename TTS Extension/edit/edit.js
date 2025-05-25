(() => {
  if (document.getElementById("annotationCanvas")) {
    console.log("[Edit] UI already injected");
    return;
  }

  console.log("[Edit] Injecting drawing UI");

  // Inject CSS
  const cssLink = document.createElement("link");
  cssLink.rel = "stylesheet";
  cssLink.href = chrome.runtime.getURL("edit/edit.css");
  document.head.appendChild(cssLink);

  // Create toolbar
  const toolbar = document.createElement("div");
  toolbar.id = "toolbar";

  function makeIcon(id, file, title) {
    const img = document.createElement("img");
    img.id = id;
    img.src = chrome.runtime.getURL(`edit/edit-icons/${file}`);
    img.alt = title;
    img.title = title;
    return img;
  }

   toolbar.appendChild(makeIcon("penTool", "pen.png", "Pen"));
   toolbar.appendChild(makeIcon("highlighterTool", "highlighter.png", "Highlighter"));
   toolbar.appendChild(makeIcon("eraserTool", "eraser.png", "Eraser"));
   toolbar.appendChild(makeIcon("saveTool", "save.png", "Save"));
   toolbar.appendChild(makeIcon("textTool", "text.png", "Text"));

   let fontSize = 20;


  document.body.appendChild(toolbar);

  // Create canvas
  const canvas = document.createElement("canvas");
  canvas.id = "annotationCanvas";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.position = "fixed";
  canvas.style.top = 0;
  canvas.style.left = 0;
  canvas.style.zIndex = 9998;
  canvas.style.pointerEvents = "auto";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  ctx.lineCap = "round";

  // Drawing Logic
  let drawing = false;
  let tool = "pen";
  const penColor = "#00BFFF";
  const highlighterColor = "#ffff00";



   function updateToolStyles(activeToolId) {
  const icons = toolbar.querySelectorAll("img");
  icons.forEach(icon => {
    if (icon.id === activeToolId) {
      icon.style.filter = "none"; // active icon without filter
    //   body.style.cursor = "crosshair";
    } else {
      icon.style.filter = "grayscale(100%) brightness(1.2)"; // inactive icons
    //   body.style.cursor = "pointer";
    }
  });
}

  // Tool switch handlers
  document.getElementById("penTool").onclick = () => {
    tool = "pen";
    console.log("Switched to Pen");
    updateToolStyles("penTool");
  };

  document.getElementById("highlighterTool").onclick = () => {
    // document.getElementById("highlighterTool").style.filter = none ;
    tool = "highlighter";
    console.log("Switched to Highlighter");
    updateToolStyles("highlighterTool");
  };

  document.getElementById("eraserTool").onclick = () => {
    tool = "eraser";
    console.log("Switched to Eraser");
    updateToolStyles("eraserTool");
  };

  document.getElementById("textTool").onclick = () => {
    tool = "text";
    console.log("Switched to Text");
    updateToolStyles("textTool");
 };
  document.getElementById("saveTool").onclick = () => {
    saveImage();
    updateToolStyles("saveTool");
  };


  canvas.addEventListener("mousedown", (e) => {
    drawing = true;
    ctx.beginPath();
    ctx.moveTo(e.clientX, e.clientY);
  });

  canvas.addEventListener("mousemove", (e) => {
    if (!drawing) return;

    if (tool === "pen") {
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = penColor;
      ctx.lineWidth = 2;
      ctx.lineTo(e.clientX, e.clientY);
      ctx.stroke();
    } else if (tool === "highlighter") {
      ctx.globalAlpha = 0.05;
      ctx.strokeStyle = highlighterColor;
      ctx.lineWidth = 15;
      ctx.lineTo(e.clientX, e.clientY);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    } else if (tool === "eraser") {
      ctx.clearRect(e.clientX - 6, e.clientY - 6, 12, 12);
    }
  });

  canvas.addEventListener("click", (e) => {
  if (tool !== "text") return;

  const inputText = prompt("Enter text to add:");
  if (inputText) {
    ctx.fillStyle = color;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillText(inputText, e.clientX, e.clientY);
  }
});

  ["mouseup", "mouseleave"].forEach((event) =>
    canvas.addEventListener(event, () => {
      drawing = false;
    })
  );

  // Save Image
  function saveImage() {
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "annotation.png";
    a.click();
  }


 

})();
