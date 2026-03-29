import os, numpy as np
from src.feature_extraction import extract_features
from src.config import EMOTION_MAP

def get_emotion_from_filename(filename):
    parts = filename.split("-")
    emotion_code = parts[2]
    return EMOTION_MAP[emotion_code]

def load_dataset(data_path):
    X = []
    y = []

    for root, _, files in os.walk(data_path):
        for file in files:
            if file.endswith(".wav"):
                path = os.path.join(root, file)

                features = extract_features(path)
                emotion = get_emotion_from_filename(file)

                X.append(features)
                y.append(emotion)

    # 🔥 FIX STARTS HERE
    X = np.array(X)
    y = np.array(y)

    # Add channel dimension for CNN
    X = X[..., np.newaxis]
    return X, y