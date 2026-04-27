import cv2
import mediapipe as mp
import requests
import time

# 🔧 Replace with your ESP32 IP
ESP32_IP = "http://172.20.10.5"

# Initialize MediaPipe
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(max_num_hands=1)
mp_draw = mp.solutions.drawing_utils

# Camera
cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
time.sleep(2)

cap.set(3, 640)
cap.set(4, 480)

last_command = "none"

while True:
    ret, frame = cap.read()

    if not ret or frame is None:
        print("❌ Camera not working")
        continue

    frame = cv2.flip(frame, 1)  # mirror view
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    results = hands.process(rgb)

    h, w, _ = frame.shape
    command = "stop"

    if results.multi_hand_landmarks:
        for handLms in results.multi_hand_landmarks:
            mp_draw.draw_landmarks(frame, handLms, mp_hands.HAND_CONNECTIONS)

            # Get center of hand (using wrist landmark)
            cx = int(handLms.landmark[0].x * w)

            if cx < w // 3:
                command = "left"
            elif cx > 2 * w // 3:
                command = "right"
            else:
                command = "forward"

            break
    else:
        command = "stop"

    # Send only if changed
    if command != last_command:
        try:
            requests.get(f"{ESP32_IP}/{command}", timeout=0.5)
            print(f"➡️ Sent: {command}")
            last_command = command
        except Exception as e:
            print("⚠️ ESP32 not reachable:", e)

    # Display
    cv2.putText(frame, f"Command: {command}", (20, 40),
                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

    cv2.imshow("Hand Gesture Robot", frame)

    if cv2.waitKey(1) & 0xFF == 27:
        try:
            requests.get(f"{ESP32_IP}/stop", timeout=0.5)
        except:
            pass
        break

    time.sleep(0.1)

cap.release()
cv2.destroyAllWindows()