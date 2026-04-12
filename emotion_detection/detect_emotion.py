import cv2
import numpy as np
from tensorflow.keras.models import load_model
import os

# Load model
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "..", "models", "emotion_model.h5")

from tensorflow.keras.layers import Dense

old_init = Dense.__init__

def new_init(self, *args, **kwargs):
    kwargs.pop("quantization_config", None)
    old_init(self, *args, **kwargs)

Dense.__init__ = new_init
# Load trained model
model = load_model(MODEL_PATH, compile=False)

emotion_labels = [
    "Angry","Disgust","Fear","Happy",
    "Sad","Surprise","Neutral"
]

face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)

def detect_emotion_from_camera():

    cap = cv2.VideoCapture(0)
    ret, frame = cap.read()
    cap.release()

    if not ret:
        return "Neutral"

    # Use gray ONLY for detection
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)

    for (x,y,w,h) in faces:

        # ✅ Use COLOR face (not gray)
        face = frame[y:y+h, x:x+w]

        face = cv2.resize(face, (48,48))
        face = face / 255.0

        # ✅ Shape becomes (1,48,48,3)
        face = np.expand_dims(face, axis=0)

        prediction = model.predict(face)
        emotion = emotion_labels[np.argmax(prediction)]

        return emotion

    return "Neutral"