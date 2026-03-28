from emotion_detection.detect_emotion import detect_emotion_from_camera
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from google import genai
import os
import requests

client = genai.Client(api_key="AIzaSyAWeb8aN5g91TSNBO6pC0eXHW-x4mj_Fz4")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Question(BaseModel):
    question: str

@app.post("/ask")
def ask_ai(q: Question):
    try:
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=q.question
        )
        return {"answer": response.text}
    except Exception as e:
        return {"answer": str(e)}

@app.get("/detect_emotion")
def detect_emotion():

    emotion = detect_emotion_from_camera()

    if emotion in ["Sad", "Disgust"]:
        state = "bored"
    elif emotion in ["Fear", "Angry"]:
        state = "stressed"
    elif emotion == "Surprise":
        state = "confused"
    else:
        state = "focused"

    return {"emotion": state}

YOUTUBE_API_KEY = os.getenv("AIzaSyDwmv-h2yFibyBWYtc8XXuXAHCIDCFOEBM")

@app.get("/get_video")
def get_video(topic: str):

    try:
        url = f"https://www.googleapis.com/youtube/v3/search?part=snippet&q={topic} lecture&type=video&key={YOUTUBE_API_KEY}"

        res = requests.get(url).json()

        video_id = res['items'][0]['id']['videoId']

        return {"videoUrl": f"https://www.youtube.com/embed/{video_id}"}

    except:
        return {"videoUrl": "https://www.youtube.com/embed/dQw4w9WgXcQ"}