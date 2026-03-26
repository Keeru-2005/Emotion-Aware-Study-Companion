import cv2
import numpy as np
from tensorflow.keras.models import load_model


# Load trained model
model = load_model("../models/emotion_model.h5")

# Emotion labels (same order as training)
emotion_labels = [
    "Angry","Disgust","Fear","Happy",
    "Sad","Surprise","Neutral"
]

# Map emotion → learning state
learning_state_map = {
    "Neutral": "Focused",
    "Happy": "Focused",
    "Sad": "Bored",
    "Disgust": "Bored",
    "Fear": "Stressed",
    "Surprise": "Confused",
    "Angry": "Stressed"
}

# Load face detector
face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)

# Start webcam
cap = cv2.VideoCapture(0)

while True:

    ret, frame = cap.read()

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.3,
        minNeighbors=5
    )

    for (x,y,w,h) in faces:

        face = frame[y:y+h, x:x+w]

        face = cv2.resize(face,(48,48))

        face = face / 255.0

        face = np.expand_dims(face, axis=0)

        prediction = model.predict(face)
        emotion = emotion_labels[np.argmax(prediction)]

        learning_state = learning_state_map[emotion]

        cv2.rectangle(frame,(x,y),(x+w,y+h),(255,0,0),2)

        cv2.putText(
            frame,
            learning_state,
            (x,y-10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.9,
            (0,255,0),
            2
        )

    cv2.imshow("Student Emotion Detector",frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()