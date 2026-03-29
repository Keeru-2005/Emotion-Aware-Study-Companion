import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv2D, MaxPooling2D, Flatten, Dense, Dropout
from tensorflow.keras.utils import to_categorical
import joblib

from src.dataset_loader import load_dataset
from src.config import DATA_PATH

def build_model(input_shape, num_classes):
    model = Sequential([
        Conv2D(32, (3,3), activation='relu', input_shape=input_shape),
        MaxPooling2D(2,2),

        Conv2D(64, (3,3), activation='relu'),
        MaxPooling2D(2,2),

        Flatten(),
        Dense(128, activation='relu'),
        Dropout(0.3),
        Dense(num_classes, activation='softmax')
    ])

    model.compile(
        loss='categorical_crossentropy',
        optimizer='adam',
        metrics=['accuracy']
    )

    return model

def train_model():
    X, y = load_dataset(DATA_PATH)

    le = LabelEncoder()
    y = le.fit_transform(y)
    y = to_categorical(y)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

    model = build_model(X_train.shape[1:], y.shape[1])

    model.fit(X_train, y_train, epochs=50, batch_size=32)

    loss, acc = model.evaluate(X_test, y_test)
    print("Accuracy:", acc)

    model.save("models/cnn_model.h5")
    joblib.dump(le, "models/label_encoder.pkl")

if __name__ == "__main__":
    train_model()