# 🧠 FocusFlow – AI-Powered Chrome Extension for ADHD Support

**FocusFlow** is a smart Chrome extension designed to help users—especially those with ADHD—stay focused while browsing the web. It uses gaze tracking, inactivity detection, and creative re-engagement techniques to gently bring the user back when focus is lost.

---

## 🎯 What It Does

- 📸 **Calibrates Camera Position**  
  Upon activation, the extension opens a calibration page to help the user adjust their webcam position for accurate gaze tracking. It also clearly communicates camera usage and requests permission.

- 🔍 **Detects Inactivity**  
  After calibration, the extension monitors user activity (cursor movement, scrolling, clicks). If no activity is detected for a certain duration (e.g. 1 minute), gaze detection is triggered.

- 👀 **Analyzes Gaze Focus**  
  Using the GazeTracking library, it checks if the user is visually focused on the screen.

- 🔔 **Re-engagement Strategies**  
  If the user is distracted, FocusFlow gently re-engages them using:
  - Popups with puzzles, jokes, or exercise prompts
  - Audio feedback ("Hey, wake up!") or reading aloud the last hovered content
  - Encouraging creativity and interaction

- ✍️ **Tools Tab for Notes**  
  Includes a drawing and annotation tab with tools for:
  - Highlighting content
  - Writing quick notes on the page
  - Saving session content (until the page is refreshed)

---

## 🧪 Key Features

| Feature                    | Description |
|----------------------------|-------------|
| 👁️ Gaze Tracking           | Checks focus using the webcam (GazeTracking library) |
| 🖱️ Inactivity Detection     | Detects lack of cursor, scroll, or click activity |
| 📄 Smart Summarization     | Summarizes the page after calibration |
| 🔊 TTS Playback            | Reads summaries aloud using FastSpeech2 via Flask |
| 🎨 Drawing Tools           | Lets users annotate/highlight content in-session |
| 💡 Re-engagement Prompts   | Uses fun, personalized techniques to bring back attention |

---

## 🚀 Tech Stack

| Frontend (Extension)       | Backend (Server)       |
|----------------------------|------------------------|
| JavaScript, HTML, CSS      | Python, Flask          |
| html2canvas, Audio API     | FastSpeech2 (TTS model)|
| Chrome Extension APIs      | GazeTracking Library   |
| Canvas Drawing Tools       | Railway (Deployment)   |

---

## 🧭 How It Works

1. **User opens the extension** → Calibration page is shown
2. **User adjusts webcam** → Gaze tracking is aligned and permission is granted
3. **System summarizes page** → Summary is generated and ready for playback
4. **Inactivity Timer** starts → If no activity for 1 minute:
   - Gaze is analyzed
   - If distracted → show prompt / read aloud / pop-up
5. **Tools Tab** always available → User can annotate or highlight live on the page

---

---

### ✅ Backend Checklist

- ✔️ **FastSpeech2** must be set up and ready to infer audio from text  
- ✔️ **Flask** runs a `/speak` endpoint that returns WAV audio as a stream (in-memory)  
- ✔️ **GazeTracking** runs locally and processes camera frames sent from the extension  

---

### 🧩 Chrome Extension Setup

1. Open `chrome://extensions` in your browser  
2. Enable **Developer Mode** (top right)  
3. Click **Load Unpacked**  
4. Select the `extension/` folder from the repo  

---

### 🎥 Live Demo  
▶️ [Watch Demo on Google Drive](https://drive.google.com/file/d/1ZT9dwi_dJ1VvWW3et2r1aRMyR7Ntbtvx/view?usp=sharing)

---

### 📸 Screenshots

<p float="left">
  <img width="403" alt="Calibration" src="https://github.com/user-attachments/assets/3836d171-d0cd-4b37-8caf-4ee1443e837e" />
  <img width="1266" alt="Gaze Detection" src="https://github.com/user-attachments/assets/37727e09-8310-4bfa-9f68-0c1cbc4f7c01" />
  <img width="304" alt="Re-engagement Popup" src="https://github.com/user-attachments/assets/95844623-eed2-47e8-bf2c-f1b72d078287" />
  <img width="1109" alt="Tools Tab" src="https://github.com/user-attachments/assets/f43483e9-2b6c-4669-9ced-daf831eda5da" />
</p>

---

### 👩‍💻 Contributors

| Name            | GitHub                                     
|-----------------|--------------------------------------------
| Salma Ahmed     | [@salmaaa9](https://github.com/salmaaa9)   
| Rowan Ahmed     | [@Rawan-AbdElmoneim](https://github.com/Rawan-AbdElmoneim) 
| [Teammate 2]    | [@username2](https://github.com/username2) 
| [Teammate 3]    | [@username3](https://github.com/username3) 



---

### 📜 License

This project was developed as part of a graduation requirement. Educational and research use is encouraged. Contributions are welcome with attribution.


## 🧑‍💻 Setup Instructions

### 🔧 Backend (Flask + FastSpeech2)
```bash
git clone https://github.com/YOUR_USERNAME/focusflow-extension.git
cd server
pip install -r requirements.txt
python app.py
---
---


