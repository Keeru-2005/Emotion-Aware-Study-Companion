from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import google.generativeai as genai
import PyPDF2
import os
import requests
import random

# from emotion_detection.detect_emotion import detect_emotion_from_camera

# Load env
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")

print("YT KEY:", YOUTUBE_API_KEY)

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-2.5-flash")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pdf_text = ""

class Question(BaseModel):
    question: str


# ───── CHATBOT ─────
@app.post("/ask")
def ask_ai(q: Question):

    global pdf_text

    prompt = f"""
    You are a helpful study assistant.

    If the question is related to the PDF, use it.
    Otherwise answer normally.

    PDF Content:
    {pdf_text[:3000]}

    Question: {q.question}
    """

    try:
        response = model.generate_content(prompt)
        return {"answer": response.text}
    except Exception as e:
        return {"answer": str(e)}


# ───── PDF UPLOAD ─────
@app.post("/upload_pdf")
async def upload_pdf(file: UploadFile = File(...)):
    global pdf_text

    reader = PyPDF2.PdfReader(file.file)

    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""

    pdf_text = text

    return {"message": "PDF uploaded"}


@app.post("/clear_pdf")
def clear_pdf():
    global pdf_text
    pdf_text = ""
    return {"message": "PDF cleared"}


# ───── EMOTION DETECTION ─────
@app.get("/detect_emotion")
def detect_emotion():
    return {"emotion": "happy"}

    # emotion = detect_emotion_from_camera()

    # if emotion in ["Sad", "Disgust"]:
    #     state = "sad"
    # elif emotion in ["Fear", "Angry"]:
    #     state = "fear"
    # elif emotion == "Surprise":
    #     state = "surprise"
    # else:
    #     state = "happy"

    # return {"emotion": state}


# ───── YOUTUBE VIDEO ─────

@app.get("/get_video")
def get_video(topic: str):

    try:
        # 🧠 AI query
        prompt = f"""
        Generate a UNIQUE YouTube search query for:
        Topic: {topic}

        Make it educational and beginner friendly.
        Return ONLY the query.
        """

        ai_query = model.generate_content(prompt).text.strip()

        print("AI Query:", ai_query)

        # 🎯 YouTube search
        url = f"https://www.googleapis.com/youtube/v3/search?part=snippet&q={ai_query}&type=video&maxResults=8&key={YOUTUBE_API_KEY}"

        res = requests.get(url).json()

        valid_videos = []

        for item in res['items']:
            title = item['snippet']['title'].lower()

            if topic.lower() not in title:
                continue

            if any(word in title for word in [
                "tutorial", "explained", "lecture", "introduction", "course"
            ]) and not any(word in title for word in [
                "song", "music", "official", "trailer"
            ]):
                valid_videos.append(item['id']['videoId'])

        if valid_videos:
            video_id = random.choice(valid_videos)
        else:
            video_id = res['items'][0]['id']['videoId']

        return {"videoUrl": f"https://www.youtube.com/embed/{video_id}"}

    except Exception as e:
        print("Error:", e)
        return {"videoUrl": "https://www.youtube.com/embed/aircAruvnKk"}