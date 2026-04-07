from transformers import pipeline

# Load once (important)
classifier = pipeline("text-classification", 
                      model="j-hartmann/emotion-english-distilroberta-base")

def detect_text_emotion(text):
    result = classifier(text)[0]

    return result['label'], result['score']