from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.svm import SVC
from sklearn.metrics import classification_report
import joblib

from src.dataset_loader import load_dataset
from src.config import DATA_PATH, MODEL_PATH

def train_model():
    X, y = load_dataset(DATA_PATH)

    le = LabelEncoder()
    y = le.fit_transform(y)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

    model = SVC(kernel='rbf', probability=True)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)

    print(classification_report(y_test, y_pred))

    joblib.dump((model, le), MODEL_PATH)

    print("Model saved!")

if __name__ == "__main__":
    train_model()