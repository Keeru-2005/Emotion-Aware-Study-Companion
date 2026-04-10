from src.utils import record_audio
from src.predict import predict_emotion

def test_live():
    file = "temp.wav"

    record_audio(file)

    emotion = predict_emotion(file)

    print("Detected Emotion:", emotion)

if __name__ == "__main__":
    test_live()