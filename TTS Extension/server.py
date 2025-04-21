from flask import Flask, jsonify, Response, render_template_string
import cv2
from gaze_tracking import GazeTracking
import threading
import time

app = Flask(__name__)
gaze = GazeTracking()
camera = cv2.VideoCapture(0)
camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)  # Default: 640x480
camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

# Thread lock for camera access
lock = threading.Lock()

def generate_frames():
    
    """Generate MJPEG video stream from webcam"""
    
    last_time = time.time()
    target_fps = 15
    while True:
        # Calculate time since last frame
        elapsed = time.time() - last_time
        if elapsed < 1.0 / target_fps:
            time.sleep(0.001)  # Sleep briefly to avoid busy-waiting
            continue
        last_time = time.time()
        with lock:
            success, frame = camera.read()
            if not success:
                break
            # Process gaze tracking
            gaze.refresh(frame)
            annotated_frame = gaze.annotated_frame()
            # Encode frame as JPEG
            ret, buffer = cv2.imencode('.jpg', annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 50])
            if not ret:
                continue
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')

@app.route('/gaze', methods=['GET'])
def get_gaze():
    """Return gaze tracking data"""
    with lock:
        success, frame = camera.read()
        if not success:
            return jsonify({"error": "Failed to capture frame"})
        gaze.refresh(frame)
    
    return jsonify({
        "left": gaze.is_left(),
        "right": gaze.is_right(),
        "center": gaze.is_center(),
        "blinking": gaze.is_blinking()
    })

@app.route('/adjust')
def adjust_gaze():
    """Serve HTML page with live webcam feed"""
    return render_template_string('''
        <html>
            <head>
                <title>Adjust Camera</title>
                <style>
                    #videoFeed { width: 640px; height: 480px; }
                </style>
            </head>
            <body>
                <h2>Adjust Your Camera</h2>
                <img id="videoFeed" src="/video_feed" alt="Live Feed">
            </body>
        </html>
    ''')

@app.route('/video_feed')
def video_feed():
    """Stream video feed to browser"""
    return Response(
        generate_frames(),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )

if __name__ == '__main__':
    try:
        app.run(host='0.0.0.0', port=5000)
    finally:
        camera.release()