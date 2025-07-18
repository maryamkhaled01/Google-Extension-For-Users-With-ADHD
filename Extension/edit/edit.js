(() => {

  const annotationContainer = document.createElement("canvas");
  annotationContainer.id = "annotationContainer"

  if (document.getElementById("svgAnnotationOverlay")) {
    const toolbar = document.getElementById("toolbar");
    if (toolbar && toolbar.style.display === "none") {
      toolbar.style.display = "flex";
      enableEditMode();
      // document.body.style.cursor = `url('${chrome.runtime.getURL("edit/edit-icons/pencil.png")}') 4 4, auto`;
      svgOverlay.style.pointerEvents = "auto";
      return;
    }
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
  toolbar.appendChild(makeIcon("undoTool","undo.png","Undo"));
  toolbar.appendChild(makeIcon("clearTool","trash-bin.png","Clear"));
  toolbar.appendChild(makeIcon("exitTool","button.png","Exit"));
  

  // Add exit button
  // const exitButton = document.createElement("button");
  // exitButton.textContent = "Exit";
  // exitButton.id = "exitButton";
  // toolbar.appendChild(exitButton);


  // Add clear button
  // const clearButton = document.createElement("button");
  // clearButton.textContent = "Clear";
  // clearButton.id = "clearButton"
  // toolbar.appendChild(clearButton);

  document.body.appendChild(toolbar);

  // Create SVG overlay
  const svgOverlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svgOverlay.id = "svgAnnotationOverlay";
  svgOverlay.style.position = "absolute";
  svgOverlay.style.top = "0";
  svgOverlay.style.left = "0";
  svgOverlay.style.width = `${document.documentElement.scrollWidth}px`;
  svgOverlay.style.height = `${document.documentElement.scrollHeight}px`;
  svgOverlay.style.pointerEvents = "auto";   //auto
  svgOverlay.style.zIndex = "9998";
  document.body.appendChild(svgOverlay);

  // Track edit mode state
  let isEditMode = true;
  let drawing = false;
  let tool = "";
  let currentPath = null;
  let currentTextElement = null;
  const paths = [];

  // Tool switch handlers
  function updateToolStyles(activeToolId) {
    const icons = toolbar.querySelectorAll("img");
    icons.forEach(icon => {
      icon.classList.toggle("active", icon.id === activeToolId);
    });
  }

  function setToolCursor(toolType) {
    isEditMode = true;
    
    
    switch(toolType) {
      case "pen":
        document.body.style.cursor = `url('${chrome.runtime.getURL("edit/edit-icons/pencil.png")}') 4 4, auto`;
        break;
      case "highlighter":
        document.body.style.cursor = `url('${chrome.runtime.getURL("edit/edit-icons/oval.png")}') 4 4, auto`;
        break;
      case "eraser":
        document.body.style.cursor = `url('${chrome.runtime.getURL("edit/edit-icons/eraser-black.png")}') 4 4, auto`;
        break;
      case "text":
        document.body.style.cursor = `url('${chrome.runtime.getURL("edit/edit-icons/text-black.png")}') 4 4, auto`;
        svgOverlay.style.pointerEvents = "none";
        break;
      default:
        document.body.style.cursor = "auto";
    }
  }

  function enableEditMode() {
    isEditMode = true;
    toolbar.style.display = "flex";
    svgOverlay.style.pointerEvents = "auto";

    setToolCursor(tool);
  }

  function disableEditMode() {
    isEditMode = false;
    toolbar.style.display = "none";
    svgOverlay.style.pointerEvents = "none";
    document.body.style.cursor = "default";
    
    // Finalize any active text input
    if (currentTextElement) {
      const textDiv = currentTextElement.querySelector("div");
      if (textDiv && !textDiv.textContent.trim()) {
        svgOverlay.removeChild(currentTextElement);
      }
      currentTextElement = null;
    }
  }

  // Tool event handlers
  document.getElementById("penTool").onclick = () => {
    tool = "pen";
    updateToolStyles("penTool");
    setToolCursor("pen");
  };

  document.getElementById("highlighterTool").onclick = () => {
    tool = "highlighter";
    updateToolStyles("highlighterTool");
    setToolCursor("highlighter");
  };

  document.getElementById("eraserTool").onclick = () => {
    tool = "eraser";
    updateToolStyles("eraserTool");
    setToolCursor("eraser");
  };

  document.getElementById("textTool").onclick = () => {
    tool = "text";
    updateToolStyles("textTool");
    setToolCursor("text");
  };
// ======================
// CLICK EVENT HANDLER
// ======================

// 1. First, make sure the save button exists
// Save function
document.getElementById("saveTool").addEventListener("click", saveAsImage);

async function saveAsImage() {
  if(typeof html2canvas === 'undefined'){
    alert("Critical Error: html2canvas not loaded.\n\n1. Check your internet connection\n2. Disable ad-blockers\n3. Try Chrome/Firefox");
    return;
  }
  try {

    console.log("start capturing....");
    
    // 1. Get the webpage content (excluding toolbar)
    const pageCanvas = await html2canvas(document.body, {
      scale: 2,
      logging: true,
      useCORS: true,
      allowTaint: true,
      ignoreElements: (el) => ['toolbar', 'annotationContainer'].includes(el.id)
    });
    
    // 2. Get annotations
    // const annotationCanvas = document.getElementById("annotationContainer");
    if (!annotationCanvas) {
      throw new Error("Annotation canvas not found");
    }
    
    // 3. Create final canvas
    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = pageCanvas.width;
    finalCanvas.height = pageCanvas.height;
    const ctx = finalCanvas.getContext("2d");
    
    // 4. Combine both layers
    ctx.drawImage(pageCanvas, 0, 0);
    ctx.drawImage(annotationCanvas, 0, 0, 
                 pageCanvas.width, pageCanvas.height);
    
    // 5. Download
    const link = document.createElement("a");
    link.href = finalCanvas.toDataURL("image/png");
    // link.download = "webpage-with-annotations.png";
    link.download = `screenshot-${Date.now()}.png`;
    link.click();
    
    console.log("Image saved successfully");
  } catch (error) {
    console.error("Error saving image:", error);
    alert(`Save failed: ${error.message}\n\nTry:\n1. Disabling ad-blockers\n2. Using Chrome/Firefox\n3. Checking console (F12)`);
  }
}



async function saveAsPDF() {
    try {
        // 1. Convert page to canvas
        const canvas = await html2canvas(document.body);
        
        // 2. Create PDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: "portrait",
            unit: "px",
            format: [canvas.width, canvas.height]
        });
        
        // 3. Add canvas image to PDF
        pdf.addImage(canvas, "PNG", 0, 0, canvas.width, canvas.height);
        
        // 4. Download PDF
        pdf.save("edited-page.pdf");
    } catch (error) {
        console.error("PDF error:", error);
        alert("Failed to save PDF. Try the HTML download instead.");
    }
}


function saveAsHTML() {
    // 1. Get the current HTML of the page (including edits)
    const htmlContent = document.documentElement.outerHTML;
    
    // 2. Create a downloadable HTML file
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    
    // 3. Trigger download
    const a = document.createElement("a");
    a.href = url;
    a.download = "edited-page.html"; // Filename
    a.click();
    
    // 4. Clean up
    URL.revokeObjectURL(url);
}



// document.getElementById('saveTool').addEventListener('click', saveAnnotatedPage);
  document.getElementById("exitTool").onclick = () => {
    tool = "exit";
    updateToolStyles(exitTool);
    if(isEditMode){
      svgOverlay.style.pointerEvents = "none";
      disableEditMode();
    } else {
      svgOverlay.style.pointerEvents = "auto";
      enableEditMode();
    }
  } 


  document.getElementById("clearTool").onclick =() => {
    tool = "clear";
   updateToolStyles(clearTool);
    paths.forEach(path => {
      if (path.parentNode) {
        path.parentNode.removeChild(path);
      }
    });
    paths.length = 0;

  }

   document.getElementById("undoTool").onclick = () => {
    tool = "undo";
    updateToolStyles("undoTool");
    const lastPath = paths.pop();
    if (lastPath && lastPath.parentNode) {
      lastPath.parentNode.removeChild(lastPath);
    }

  };
  

   document.addEventListener("click", (e) => {
    if (tool !== "text" || !isEditMode) return;
    if (e.target.closest("#toolbar")) return;

    // Create editable div (like Edge does)
    const textBox = document.createElement("div");
    textBox.contentEditable = true;
    textBox.className = "annotation-text";
    textBox.style.position = "absolute";
    textBox.style.left = `${e.pageX}px`;
    textBox.style.top = `${e.pageY}px`;
    textBox.style.minWidth = "200px";
    textBox.style.minHeight = "30px";
    textBox.style.font = "16px Arial";
    textBox.style.border = "2px dashed #4285F4"; // Edge-like blue border
    textBox.style.borderRadius = "2px";
    textBox.style.padding = "6px";
    textBox.style.background = "rgba(255, 255, 255, 0.9)";
    textBox.style.color = "black";
    textBox.style.zIndex = "9999";
    textBox.style.outline = "none";
    textBox.style.whiteSpace = "pre-wrap"; // Critical for multi-line
    textBox.style.wordBreak = "break-word";
    textBox.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";

    // Placeholder implementation
    textBox.dataset.placeholder = "Type here...";
    if (!textBox.textContent) {
        textBox.textContent = textBox.dataset.placeholder;
        textBox.style.color = "#70757a";
    }

    const annotationContainer = document.createElement("div");
    annotationContainer.id = "annotationContainer";
    annotationContainer.style.position = "absolute";
    annotationContainer.style.top = "0";
    annotationContainer.style.left = "0";
    annotationContainer.style.width = "100%";
    annotationContainer.style.height = "100%";
    annotationContainer.style.zIndex = "9999";
    annotationContainer.style.pointerEvents = "none";
    document.body.appendChild(annotationContainer);

    annotationContainer.appendChild(textBox);



    // document.body.appendChild(textBox);
    textBox.focus();

    // Select all text if placeholder is present
    if (textBox.textContent === textBox.dataset.placeholder) {
        const range = document.createRange();
        range.selectNodeContents(textBox);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }

    // Handle placeholder
    textBox.addEventListener("input", () => {
        if (textBox.textContent === textBox.dataset.placeholder) {
            textBox.style.color = "#70757a";
        } else {
            textBox.style.color = "black";
        }
    });

    // Auto-resize functionality
    function autoResize() {
        textBox.style.height = "auto";
        textBox.style.height = `${textBox.scrollHeight}px`;
    }

    textBox.addEventListener("input", autoResize);
    autoResize();

    // Finalize text
    let isFinalized = false;

    function finalizeText() {
        if (isFinalized) return;
        isFinalized = true;

        const text = textBox.textContent.trim();
        if (!text || text === textBox.dataset.placeholder) {
            textBox.remove();
            return;
        }

        const staticText = document.createElement("div");
        staticText.className = "annotation-text";
        staticText.style.cssText = textBox.style.cssText;
        staticText.textContent = text;
        staticText.style.border = "none";
        staticText.style.background = "transparent";
        staticText.style.boxShadow = "none";
        staticText.style.pointerEvents = "none";
        staticText.style.whiteSpace = "pre-wrap";
        staticText.style.userSelect = "none";

        if (textBox.parentNode) {
            textBox.replaceWith(staticText);
        }
        // paths.push(text);
        paths.push(staticText);

        document.removeEventListener("keydown", handleKeyDown);
    }


    // Edge-like key handling
    function handleKeyDown(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            finalizeText();
        }
        // Escape key to cancel
        if (e.key === "Escape") {
            textBox.remove();
            document.removeEventListener("keydown", handleKeyDown);
        }
    }

    textBox.addEventListener("blur", finalizeText);
    document.addEventListener("keydown", handleKeyDown);

    // Prevent blur when clicking on the text box itself
    textBox.addEventListener("mousedown", (e) => {
        e.stopPropagation();
    });
});

  // Get coordinates relative to document
  function getDocumentCoordinates(e) {
    return {
      x: e.clientX + window.scrollX,
      y: e.clientY + window.scrollY
    };
  }

  // Event listeners
  function handleMouseDown(e) {
    // isEditMode= true
    if ( e.target.closest("#toolbar")) return;

    if (isEditMode) {
      svgOverlay.style.pointerEvents = "auto";
    } else {
      svgOverlay.style.pointerEvents = "none";
    }
    currentPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    
    if (tool === "text") {
      // handleTextTool(e);
      currentPath.setAttribute("border-radius","3px")
      return;
    }

    drawing = true;
    const point = getDocumentCoordinates(e);

    if (tool === "pen" || tool === "highlighter") {
      currentPath.setAttribute("fill", "none");
      currentPath.setAttribute("stroke-linecap", "round");
      currentPath.setAttribute("stroke-linejoin", "round");
      
      if (tool === "pen") {
        currentPath.setAttribute("stroke", "#00BFFF");
        currentPath.setAttribute("stroke-width", "2");
        currentPath.setAttribute("opacity", "1");
      } else {
        currentPath.setAttribute("stroke", "#ffff00");
        currentPath.setAttribute("stroke-width", "15");
        currentPath.setAttribute("opacity", "0.2");
      }
      
      currentPath.setAttribute("d", `M${point.x},${point.y}`);
      svgOverlay.appendChild(currentPath);
      paths.push(currentPath);
    }
  }

  function handleMouseMove(e) {
    if (!isEditMode || !drawing || !currentPath || tool === "text") return;
    
    const point = getDocumentCoordinates(e);
    
    const pathData = currentPath.getAttribute("d");
    currentPath.setAttribute("d", `${pathData} L${point.x},${point.y}`);
  }

  function handleMouseUp() {
    if (!isEditMode) return;
    drawing = false;
    currentPath = null;
  }

  // Eraser functionality
  // Eraser functionality
// Eraser functionality
function handleEraserMove(e) {
    if (!isEditMode || !drawing || tool !== "eraser") return;
    
    const point = getDocumentCoordinates(e);
    const eraserRadius = 20; // Increased radius for better usability

    // Handle SVG paths
    const svgPaths = svgOverlay.querySelectorAll('path');
    svgPaths.forEach((path) => {
        if (typeof path.getTotalLength === "function") {
            const pathLength = path.getTotalLength();
            for (let i = 0; i < pathLength; i += 5) {
                const pointOnPath = path.getPointAtLength(i);
                const distance = Math.sqrt(
                    Math.pow(pointOnPath.x - point.x, 2) + 
                    Math.pow(pointOnPath.y - point.y, 2)
                );
                
                if (distance < eraserRadius) {
                    path.parentNode.removeChild(path);
                    // Remove from paths array
                    const index = paths.indexOf(path);
                    if (index > -1) {
                        paths.splice(index, 1);
                    }
                    break;
                }
            }
        }
    });

    // Handle text elements
    const textElements = document.querySelectorAll('.annotation-text:not([contenteditable="true"])');
    textElements.forEach((textElement) => {
        const rect = textElement.getBoundingClientRect();
        const elementCenter = {
            x: rect.left + rect.width / 2 + window.scrollX,
            y: rect.top + rect.height / 2 + window.scrollY
        };
        
        const distance = Math.sqrt(
            Math.pow(elementCenter.x - point.x, 2) + 
            Math.pow(elementCenter.y - point.y, 2)
        );
        
        // Check if eraser is near the text element
        if (distance < eraserRadius * 2) { // Larger radius for text
            textElement.remove();
            // Remove from paths array
            const index = paths.indexOf(textElement);
            if (index > -1) {
                paths.splice(index, 1);
            }
        }
    });
}

  // Add event listeners
  document.addEventListener("mousedown", handleMouseDown);
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
  document.addEventListener("mousemove", handleEraserMove);






  // Initialize in edit mode
  enableEditMode();

})();