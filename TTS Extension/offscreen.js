chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "checkGaze") {
    captureWebcamFrameAndSend().then(result => {
      sendResponse(result);
    }).catch(error => {
      console.error("Gaze error:", error);
      sendResponse({ error: error.message });
    });

    return true; // Important: keeps the response channel open
  }
});

// Function to capture and send a webcam frame
async function captureWebcamFrameAndSend() {
  try {
    // 1. Open webcam
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const video = document.createElement("video");
    video.srcObject = stream;

    await new Promise(resolve => {
      video.onloadedmetadata = () => {
        video.play();
      };
      video.onplaying = resolve; // Resolve when video starts playing
    });

    // 2. Draw current frame on canvas
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageBase64 = canvas.toDataURL("image/jpeg");

    // 3. Stop camera stream
    stream.getTracks().forEach(track => track.stop());

    // 4. Send to Flask server
    const response = await fetch("https://web-production-020c8.up.railway.app/gaze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ image: imageBase64 })
    });

    const data = await response.json();
    console.log("🎯 Gaze Tracking Result:", data);

    return data;

  } catch (err) {
    console.error("Webcam capture error:", err);
    throw err;
  }
}
