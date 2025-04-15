from flask import Flask, jsonify
import cv2
from gaze_tracking.gaze_tracking import GazeTracking

app = Flask(__name__)
gaze = GazeTracking()
camera = cv2.VideoCapture(0)  # Open webcam

# "http://localhost:5000/",
@app.route('/gaze', methods=['GET'])
def get_gaze():
    """Capture a frame, process gaze tracking, and return results"""
    _, frame = camera.read()
    gaze.refresh(frame)

    data = {
        "left": gaze.is_left(),
        "right": gaze.is_right(),
        "center": gaze.is_center(),
        "blinking": gaze.is_blinking()
    }
    return jsonify(data)

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000)