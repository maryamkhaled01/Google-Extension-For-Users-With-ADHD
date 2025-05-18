from flask import Flask, jsonify, Response, render_template_string
import cv2
from gaze_tracking import GazeTracking
import threading
import time
from synth_wrapper import synthesize_text
import os
from flask import request, send_file
import logging

# Configure Flask logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
    print("Received /gaze request")
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

@app.route("/speak", methods=["POST"])
def speak():
    data = request.get_json()
    if not data or "text" not in data:
        return {"error": "Missing text"}, 400

    text = data["text"]

    # Run TTS synthesis
    try:
        synthesize_text(text)
    except Exception as e:
        return {"error": str(e)}, 500

    # Dynamically find the latest generated WAV file
     # Define the result directory
    base_dir = os.path.dirname(os.path.abspath(__file__))
    result_dir = os.path.join(base_dir, "FastSpeech2", "output", "result", "LJSpeech")
    print(f"Checking result directory: {result_dir}")
    app.logger.info(f"Checking result directory: {result_dir}")  # Log the path

    if not os.path.exists(result_dir):
        return {"error": f"Result directory not found: {result_dir}"}, 404

    # Get the list of all WAV files in the directory
    wav_files = [f for f in os.listdir(result_dir) if f.endswith(".wav")]
    app.logger.info(f"Found WAV files: {wav_files}")  # Log the files

    if not wav_files:
        return {"error": "No WAV files found"}, 404

    # Sort by modification time to find the latest file
    latest_wav = max(
        [os.path.join(result_dir, f) for f in wav_files],
        key=os.path.getmtime
    )

    app.logger.info(f"Serving latest WAV file: {latest_wav}")  # Log the file being served
    return send_file(latest_wav, mimetype="audio/wav")


if __name__ == '__main__':
    try:
        app.run(host='0.0.0.0', port=5000)
    finally:
        camera.release()