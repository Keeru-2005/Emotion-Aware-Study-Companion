import joblib
import numpy as np
from src.feature_extraction import extract_features
from src.config import MODEL_PATH

model, le = joblib.load(MODEL_PATH)

def predict_emotion(file_path):
    features = extract_features(file_path)
    features = np.array(features).reshape(1, -1)

    prediction = model.predict(features)
    emotion = le.inverse_transform(prediction)

    return emotion[0]