"""
Demonstration of the GazeTracking library.
Check the README.md for complete documentation.
"""

import cv2
from gaze_tracking import GazeTracking

gaze = GazeTracking()
webcam = cv2.VideoCapture(0)

while True:
    # We get a new frame from the webcam
    _, frame = webcam.read()

    # We send this frame to GazeTracking to analyze it
    gaze.refresh(frame)

    frame = gaze.annotated_frame()
    text = ""

    if gaze.is_blinking():
        text = "Blinking"
    elif gaze.is_right():
        text = "Looking right"
    elif gaze.is_left():
        text = "Looking left"
    elif gaze.is_center():
        text = "Looking center"

    cv2.putText(frame, text, (90, 60), cv2.FONT_HERSHEY_DUPLEX, 1.6, (147, 58, 31), 2)

    left_pupil = gaze.pupil_left_coords()
    right_pupil = gaze.pupil_right_coords()

    cv2.putText(frame, "Left pupil:  " + str(left_pupil), (90, 130), cv2.FONT_HERSHEY_DUPLEX, 0.9, (147, 58, 31), 1)
    cv2.putText(frame, "Right pupil: " + str(right_pupil), (90, 165), cv2.FONT_HERSHEY_DUPLEX, 0.9, (147, 58, 31), 1)

    cv2.imshow("Demo", frame)

    if cv2.waitKey(1) == 27:
        break
   
webcam.release()
cv2.destroyAllWindows()

########################################################################
# """
# Demonstration of the GazeTracking library with proper error handling.
# """

# import cv2
# import sys
# import traceback
# from gaze_tracking import GazeTracking

# def main():
#     # Initialize
#     try:
#         gaze = GazeTracking()
#     except Exception as e:
#         print(f"Failed to initialize GazeTracking: {str(e)}")
#         print(traceback.format_exc())
#         return 1

#     # Video capture 
#     try:
#         webcam = cv2.VideoCapture(0)
#         if not webcam.isOpened():
#             raise IOError("Cannot open webcam")
#     except Exception as e:
#         print(f"Webcam initialization failed: {str(e)}")
#         return 1

#     try:
#         while True:
#             # Frame reading 
#             ret, frame = webcam.read()
#             if not ret:
#                 print("Failed to capture frame from webcam")
#                 break

#             try:
#                 # Gaze analysis 
#                 gaze.refresh(frame)
#                 frame = gaze.annotated_frame()
#                 text = ""

#                 if gaze.is_blinking():
#                     text = "Blinking"
#                 elif gaze.is_right():
#                     text = "Looking right"
#                 elif gaze.is_left():
#                     text = "Looking left"
#                 elif gaze.is_center():
#                     text = "Looking center"

#                 # Drawing operations 
#                 try:
#                     cv2.putText(frame, text, (90, 60), 
#                                cv2.FONT_HERSHEY_DUPLEX, 1.6, 
#                                (147, 58, 31), 2)

#                     left_pupil = gaze.pupil_left_coords()
#                     right_pupil = gaze.pupil_right_coords()
                    
#                     cv2.putText(frame, f"Left pupil: {left_pupil}", (90, 130), 
#                                cv2.FONT_HERSHEY_DUPLEX, 0.9, 
#                                (147, 58, 31), 1)
#                     cv2.putText(frame, f"Right pupil: {right_pupil}", (90, 165), 
#                                cv2.FONT_HERSHEY_DUPLEX, 0.9, 
#                                (147, 58, 31), 1)

#                     cv2.imshow("Demo", frame)
#                 except Exception as e:
#                     print(f"Frame processing error: {str(e)}")
#                     continue

#                 # Exit condition
#                 if cv2.waitKey(1) == 27:
#                     break

#             except Exception as e:
#                 print(f"Gaze analysis error: {str(e)}")
#                 continue

#     except KeyboardInterrupt:
#         print("\nProgram interrupted by user")
#     except Exception as e:
#         print(f"Unexpected error: {str(e)}")
#         print(traceback.format_exc())
#     finally:
#         # Cleanup resources
#         webcam.release()
#         cv2.destroyAllWindows()
#         print("Resources released")
    
#     return 0

# if __name__ == "__main__":
#     sys.exit(main())


################################################

# """
# Enhanced GazeTracking with Dynamic Focus Detection
# """

# import cv2
# import sys
# import traceback
# import numpy as np
# import time
# from gaze_tracking import GazeTracking

# class FocusDetector:
#     def __init__(self, frame_width, frame_height):
#         # Focus zone size relative to face size
#         self.focus_zone_scale = 0.8  # Zone size relative to face
#         self.min_focus_duration = 1.2  # Seconds of stable gaze to be focused
#         self.max_glance_duration = 0.5  # Allowed brief glance away
        
#         # State tracking
#         self.currently_focused = False
#         self.focus_start_time = time.time()
#         self.last_face_position = None
#         self.last_face_size = None
#         self.frame_size = (frame_width, frame_height)

#     def _estimate_face(self, frame):
#         """Detect face position and size"""
#         try:
#             face_cascade = cv2.CascadeClassifier(
#                 cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
#             gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
#             faces = face_cascade.detectMultiScale(gray, 1.3, 5)
            
#             if len(faces) > 0:
#                 x, y, w, h = faces[0]
#                 center = (x + w//2, y + h//2)
#                 return center, (w, h)
#             return None, None
#         except Exception as e:
#             print(f"Face detection error: {str(e)}")
#             return None, None

#     def _get_focus_zone(self):
#         """Calculate focus zone based on current face position"""
#         if not self.last_face_position or not self.last_face_size:
#             return None
            
#         face_w, face_h = self.last_face_size
#         zone_w = int(face_w * self.focus_zone_scale)
#         zone_h = int(face_h * self.focus_zone_scale)
        
#         x_min = self.last_face_position[0] - zone_w//2
#         x_max = self.last_face_position[0] + zone_w//2
#         y_min = self.last_face_position[1] - zone_h//2
#         y_max = self.last_face_position[1] + zone_h//2
        
#         # Constrain to frame boundaries
#         x_min = max(0, x_min)
#         x_max = min(self.frame_size[0], x_max)
#         y_min = max(0, y_min)
#         y_max = min(self.frame_size[1], y_max)
        
#         return (x_min, y_min, x_max, y_max)

#     def update(self, gaze_data, frame):
#         """Update focus state based on current frame"""
#         try:
#             # Update face position
#             face_center, face_size = self._estimate_face(frame)
#             if face_center:
#                 self.last_face_position = face_center
#                 self.last_face_size = face_size
            
#             # Get gaze points
#             left_pupil = gaze_data.pupil_left_coords()
#             right_pupil = gaze_data.pupil_right_coords()
            
#             if not left_pupil or not right_pupil or not self.last_face_position:
#                 return False, None
                
#             # Calculate average gaze point
#             avg_gaze = ((left_pupil[0] + right_pupil[0]) / 2, 
#                        (left_pupil[1] + right_pupil[1]) / 2)
            
#             # Check if gaze is within focus zone
#             focus_zone = self._get_focus_zone()
#             if not focus_zone:
#                 return False, None
                
#             x_min, y_min, x_max, y_max = focus_zone
#             in_zone = (x_min < avg_gaze[0] < x_max and 
#                       y_min < avg_gaze[1] < y_max)
            
#             # Update focus state with temporal filtering
#             current_time = time.time()
#             if in_zone:
#                 if not self.currently_focused:
#                     self.focus_start_time = current_time
#                 self.currently_focused = (current_time - self.focus_start_time) > self.min_focus_duration
#             else:
#                 if self.currently_focused:
#                     if (current_time - self.focus_start_time) > self.max_glance_duration:
#                         self.currently_focused = False
            
#             return self.currently_focused, focus_zone
            
#         except Exception as e:
#             print(f"Focus detection error: {str(e)}")
#             return False, None

# def main():
#     # Initialize
#     try:
#         gaze = GazeTracking()
#     except Exception as e:
#         print(f"Failed to initialize GazeTracking: {str(e)}")
#         print(traceback.format_exc())
#         return 1

#     # Video capture 
#     try:
#         webcam = cv2.VideoCapture(0)
#         if not webcam.isOpened():
#             raise IOError("Cannot open webcam")
        
#         # Get frame dimensions
#         ret, frame = webcam.read()
#         if not ret:
#             raise IOError("Cannot get initial frame dimensions")
            
#         focus_detector = FocusDetector(frame.shape[1], frame.shape[0])
#     except Exception as e:
#         print(f"Initialization failed: {str(e)}")
#         return 1

#     try:
#         while True:
#             # Frame reading 
#             ret, frame = webcam.read()
#             if not ret:
#                 print("Failed to capture frame from webcam")
#                 break

#             try:
#                 # Gaze analysis 
#                 gaze.refresh(frame)
#                 frame = gaze.annotated_frame()
#                 text = ""

#                 if gaze.is_blinking():
#                     text = "Blinking"
#                 elif gaze.is_right():
#                     text = "Looking right"
#                 elif gaze.is_left():
#                     text = "Looking left"
#                 elif gaze.is_center():
#                     text = "Looking center"

#                 # Focus detection
#                 is_focused, focus_zone = focus_detector.update(gaze, frame)

#                 # Drawing operations 
#                 try:
#                     # Original gaze information
#                     cv2.putText(frame, text, (90, 60), 
#                                cv2.FONT_HERSHEY_DUPLEX, 1.6, 
#                                (147, 58, 31), 2)

#                     left_pupil = gaze.pupil_left_coords()
#                     right_pupil = gaze.pupil_right_coords()
                    
#                     cv2.putText(frame, f"Left pupil: {left_pupil}", (90, 130), 
#                                cv2.FONT_HERSHEY_DUPLEX, 0.9, 
#                                (147, 58, 31), 1)
#                     cv2.putText(frame, f"Right pupil: {right_pupil}", (90, 165), 
#                                cv2.FONT_HERSHEY_DUPLEX, 0.9, 
#                                (147, 58, 31), 1)

#                     # Focus visualization
#                     if focus_zone:
#                         x_min, y_min, x_max, y_max = focus_zone
#                         cv2.rectangle(frame, 
#                                     (int(x_min), int(y_min)),
#                                     (int(x_max), int(y_max)),
#                                     (0, 255, 0) if is_focused else (0, 0, 255), 
#                                     2)
                        
#                         # Draw face center
#                         if focus_detector.last_face_position:
#                             cv2.circle(frame, 
#                                       (int(focus_detector.last_face_position[0]), 
#                                        int(focus_detector.last_face_position[1])),
#                                       5, (255, 0, 0), -1)

#                     # Status text
#                     status_text = f"Focus: {'YES' if is_focused else 'NO'}"
#                     cv2.putText(frame, status_text, (20, frame.shape[0] - 30), 
#                                cv2.FONT_HERSHEY_SIMPLEX, 1, 
#                                (0, 255, 0) if is_focused else (0, 0, 255), 
#                                2)

#                     cv2.imshow("Gaze Tracking Demo", frame)
#                 except Exception as e:
#                     print(f"Frame processing error: {str(e)}")
#                     continue

#                 # Exit condition
#                 if cv2.waitKey(1) == 27:
#                     break

#             except Exception as e:
#                 print(f"Gaze analysis error: {str(e)}")
#                 continue

#     except KeyboardInterrupt:
#         print("\nProgram interrupted by user")
#     except Exception as e:
#         print(f"Unexpected error: {str(e)}")
#         print(traceback.format_exc())
#     finally:
#         # Cleanup resources
#         webcam.release()
#         cv2.destroyAllWindows()
#         print("Resources released")
    
#     return 0

# if __name__ == "__main__":
#     sys.exit(main())

    