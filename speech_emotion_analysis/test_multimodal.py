from src.utils import record_audio
from src.predict import predict_emotion
from src.speech_to_text import transcribe_audio
from src.text_emotion import detect_text_emotion

def run_system():
    file = "temp.wav"

    # 🎤 Step 1: Record audio
    record_audio(file)

    # 🎧 Step 2: Tone-based emotion
    tone_emotion = predict_emotion(file)

    # 📝 Step 3: Speech-to-text
    text = transcribe_audio(file)

    # 🧠 Step 4: Text-based emotion
    text_emotion, confidence = detect_text_emotion(text)

    # 📊 OUTPUT
    print("\n--- RESULTS ---")
    print("Transcript:", text)
    print("Tone Emotion:", tone_emotion)
    print("Text Emotion:", text_emotion)
    print("Confidence:", round(confidence, 2))


if __name__ == "__main__":
    run_system()