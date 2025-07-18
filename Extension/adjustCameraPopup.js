document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('video');
  const button = document.getElementById('startButton');
  const statusMessage = document.getElementById('statusMessage');

  button.addEventListener('click', () => {
    button.style.display = 'none';
    video.style.display = 'block';
    statusMessage.style.display = 'block';

    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        video.srcObject = stream;

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        let isWindowClosed = false;

        const closeWindow = () => {
          if (!isWindowClosed) {
            isWindowClosed = true;
            stream.getTracks().forEach(track => track.stop());
            window.close();
          }
        };

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

              // Only close if valid data is returned
              if (data && (data.left !== null || data.right !== null || data.center !== null || data.blinking !== null)) {
                console.log('✅ Valid gaze data received. Closing the window...');
                chrome.runtime.sendMessage({ action: "gazeResult", data });
                closeWindow();
              }
            })
            .catch(err => console.error('❌ Error:', err));

        }, 2000);

      })
      .catch((err) => {
        console.error('❌ Could not start webcam:', err);
        statusMessage.textContent = "❌ Failed to access webcam: " + err.message;
        statusMessage.style.color = 'red';
      });
  });
});

