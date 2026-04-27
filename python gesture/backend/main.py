import cv2
import mediapipe as mp
import os
import urllib.request
import serial
import time
import threading
from flask import Flask, request, jsonify, Response
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from mediapipe.framework.formats import landmark_pb2

# MediaPipe Drawing Helpers
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles
mp_hands = mp.solutions.hands

# ── FLASK & SOCKETIO SETUP ───────────────────────────────────────
app = Flask(__name__)
CORS(app)
# Use 'threading' mode to avoid eventlet conflicts on Windows with OpenCV
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# ── CONFIG ───────────────────────────────────────────────────────
SERIAL_PORT  = "COM9"
BAUD_RATE    = 9600
CMD_INTERVAL = 0.15

# Get base directory of the script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "hand_landmarker.task")


USER_DETAILS = {
    "username": "admin",
    "password": "password123"
}

# ── GLOBALS ──────────────────────────────────────────────────────
arduino = None
last_frame = None
current_telemetry = {"cmd": "STOP", "speed": 0}
lock = threading.Lock()

# ── Connect to Arduino ──────────────────────────────────────────
try:
    arduino = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
    time.sleep(2)
    arduino.reset_input_buffer()
    print(f"Connected to Arduino on {SERIAL_PORT}")
except Exception as e:
    print(f"Serial connection failed: {e}")
    arduino = None

def send_command(cmd):
    if arduino and arduino.is_open:
        try:
            arduino.write(cmd.encode())
            arduino.flush()
        except:
            pass

# ── Download Model ────────────────────────────────────────────────
if not os.path.exists(MODEL_PATH):
    print("Downloading model...")
    urllib.request.urlretrieve(
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        MODEL_PATH
    )

# ── MediaPipe Helpers ─────────────────────────────────────────────
def fingers_up(landmarks):
    fingers = []
    fingers.append(1 if landmarks[4].x < landmarks[3].x else 0)
    for tip in [8, 12, 16, 20]:
        fingers.append(1 if landmarks[tip].y < landmarks[tip - 2].y else 0)
    return fingers

def classify_gesture(f):
    if f == [0, 1, 0, 0, 0]: return ("FORWARD",  "F", 200, (0, 255, 0))
    if f == [0, 1, 1, 0, 0]: return ("BACKWARD", "B", 180, (0, 0, 255))
    if f == [1, 1, 0, 0, 0]: return ("LEFT",     "L", 150, (255, 165, 0))
    if f == [1, 1, 1, 0, 0]: return ("RIGHT",    "R", 150, (255, 200, 0))
    return                           ("STOP",     "S", 0,   (0, 255, 255))

# ── Core Processing Thread ────────────────────────────────────────
def process_camera():
    global last_frame, current_telemetry
    
    options = vision.HandLandmarkerOptions(
        base_options=python.BaseOptions(model_asset_path=MODEL_PATH),
        num_hands=1,
        min_hand_detection_confidence=0.7, # Increased for stability
        min_hand_presence_confidence=0.7
    )
    detector = vision.HandLandmarker.create_from_options(options)
    
    cap = cv2.VideoCapture(0)
    last_sent_cmd = ""
    last_cmd_time = 0
    stable_cmd = "S"
    cmd_history = []
    STABILITY_THRESHOLD = 5 # Frames required for a gesture to trigger

    while True:
        ret, frame = cap.read()
        if not ret: continue

        frame = cv2.flip(frame, 1)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = detector.detect(mp_image)

        current_raw_cmd = "S"
        label, speed, color = "STOP", 0, (0, 255, 255)

        if result.hand_landmarks:
            for landmarks in result.hand_landmarks:
                # ── DRAW LANDMARKS & CONNECTIONS (Technical View) ──
                hand_landmarks_proto = landmark_pb2.NormalizedLandmarkList()
                hand_landmarks_proto.landmark.extend([
                    landmark_pb2.NormalizedLandmark(x=landmark.x, y=landmark.y, z=landmark.z) 
                    for landmark in landmarks
                ])
                
                # Draw the skeleton with a sleek aesthetic
                mp_drawing.draw_landmarks(
                    frame,
                    hand_landmarks_proto,
                    mp_hands.HAND_CONNECTIONS,
                    mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=2), # Points (Green)
                    mp_drawing.DrawingSpec(color=(255, 255, 255), thickness=2)            # Lines (White)
                )

                f = fingers_up(landmarks)
                label, cmd_char, speed, color = classify_gesture(f)
                current_raw_cmd = cmd_char
        else:
            # Immediate stop if no hand is visible
            current_raw_cmd = "S"
            label, speed, color = "STOP", 0, (0, 255, 255)

        # ── STABILITY FILTER ──
        cmd_history.append(current_raw_cmd)
        if len(cmd_history) > STABILITY_THRESHOLD:
            cmd_history.pop(0)
        
        # Check if history is unanimous
        if len(cmd_history) == STABILITY_THRESHOLD and all(x == cmd_history[0] for x in cmd_history):
            stable_cmd = cmd_history[0]
        else:
            # If jittery or changing, default to whatever was stable or STOP
            if current_raw_cmd == "S":
                stable_cmd = "S"

        # Serial Output
        now = time.time()
        if stable_cmd != last_sent_cmd or (now - last_cmd_time) > CMD_INTERVAL:
            send_command(stable_cmd)
            last_sent_cmd = stable_cmd
            last_cmd_time = now

        # Update Telemetry & emit
        current_telemetry = {"cmd": label, "speed": speed}
        socketio.emit('data', current_telemetry)

        # Draw HUD for the stream
        cv2.putText(frame, f"CORE: {label}", (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 1.2, color, 3)
        if stable_cmd != current_raw_cmd:
            cv2.putText(frame, "STABILIZING...", (10, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        
        with lock:
            last_frame = frame.copy()

        if cv2.waitKey(1) & 0xFF == ord('q'): break

    cap.release()

# ── API ROUTES ───────────────────────────────────────────────────
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    if data.get("username") == USER_DETAILS["username"] and \
       data.get("password") == USER_DETAILS["password"]:
        return jsonify({"token": "valid_session_token"}), 200
    return jsonify({"error": "Unauthorized"}), 401

@app.route('/video')
def video_feed():
    def gen():
        while True:
            with lock:
                if last_frame is None: continue
                _, buffer = cv2.imencode('.jpg', last_frame)
                frame = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
            time.sleep(0.03)
    return Response(gen(), mimetype='multipart/x-mixed-replace; boundary=frame')

@socketio.on('connect')
def handle_connect():
    print("CORE LINK ESTABLISHED WITH CLIENT")
    emit('data', current_telemetry)

@socketio.on('disconnect')
def handle_disconnect():
    print("CORE LINK TERMINATED")

@socketio.on('manual')
def handle_manual(data):
    # Support both raw strings and objects from frontend
    cmd = data['cmd'] if isinstance(data, dict) else data
    print(f"MANUAL OVERRIDE RECEIVED: {cmd}")
    send_command(cmd)

if __name__ == '__main__':
    # Start camera in background
    threading.Thread(target=process_camera, daemon=True).start()
    # Start web server
    print("SERVER STARTING ON PORT 5000...")
    socketio.run(app, host='0.0.0.0', port=5000, debug=False, use_reloader=False)
