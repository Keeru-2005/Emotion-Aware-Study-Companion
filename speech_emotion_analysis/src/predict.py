import numpy as np
from tensorflow.keras.models import load_model
import joblib

from src.feature_extraction import extract_features

model = None
le = None

def load_resources():
    global model, le
    if model is None:
        from tensorflow.keras.models import load_model
        import joblib

        model = load_model("models/cnn_model.h5", compile=False)
        le = joblib.load("models/label_encoder.pkl")

def predict_emotion(file_path):
    load_resources()

    features = extract_features(file_path)

    features = np.array(features)[..., np.newaxis]
    features = features.reshape(1, 40, 130, 1)

    prediction = model.predict(features)

    emotion = le.inverse_transform([np.argmax(prediction)])

    return emotion[0]