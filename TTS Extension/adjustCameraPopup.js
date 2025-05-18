const video = document.getElementById('video');

// Start webcam
navigator.mediaDevices.getUserMedia({ video: true })
  .then((stream) => {
    video.srcObject = stream;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    // Send a snapshot every 2 seconds
    setInterval(() => {
      if (video.videoWidth === 0) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const base64Image = canvas.toDataURL('image/jpeg').split(',')[1];

      fetch('https://web-production-020c8.up.railway.app/gaze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image })
      })
        .then(res => res.json())
        .then(data => {
          console.log('Gaze data:', data);
          // You can now act on gaze data (e.g., show arrows or highlight UI)
          chrome.runtime.sendMessage({
            action: "gazeResult",
            data: gazeData  // { left, right, center, blinking }
          });
          
        })
        .catch(err => console.error('Error:', err));
    }, 2000);

  })
  .catch((err) => {
    console.error('Could not start webcam:', err);
  });
