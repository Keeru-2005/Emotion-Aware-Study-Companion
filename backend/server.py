from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import google.generativeai as genai
import PyPDF2
import os
import requests
import random

import random
import sys
from pathlib import Path

# Add the root directory to sys.path specifically for relative imports
sys.path.append(str(Path(__file__).parent.parent))
from emotion_detection.detect_emotion import detect_emotion_from_camera

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

class ActivityMetrics(BaseModel):
    active_tab: bool
    last_mouse_move: float
    last_keystroke: float


# ───── CHATBOT ─────

# ───── CHATBOT ─────
@app.post("/ask")
def ask_ai(q: Question):

    global pdf_text

    prompt = ""
    if pdf_text.strip():
        prompt += f"Context from PDF document:\n{pdf_text[:3000]}\n\n"
        prompt += "If the user's question relates to the PDF context above, use it to answer.\n"
    
    prompt += f"You are a helpful study assistant. Provide a concise and accurate answer.\n\nQuestion: {q.question}"

    try:
        response = model.generate_content(prompt)
        return {"answer": response.text}
    except Exception as e:
        return {"answer": str(e)}


# ───── PDF ─────
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
# Returns simulated emotions in rotation for demo purposes.
# To use real camera detection, uncomment the import at top
# and replace the body with: emotion = detect_emotion_from_camera()

emotion_cycle = ["happy", "happy", "happy", "neutral", "happy", "sad", "happy", "fear"]
emotion_index = 0

@app.post("/detect_emotion")
def detect_emotion(metrics: ActivityMetrics):
    # ── ACTIVITY CHECK ──
    import time
    now = time.time() * 1000
    idle_mouse = (now - metrics.last_mouse_move) > 30000
    idle_keyboard = (now - metrics.last_keystroke) > 30000

    if not metrics.active_tab:
        return {"emotion": "distracted"}
    if idle_mouse and idle_keyboard:
        return {"emotion": "idle"}

    # ── REAL camera ──
    try:
        emotion = detect_emotion_from_camera()
    except Exception as e:
        print("Camera Error:", e)
        emotion = "neutral"
        
    return {"emotion": emotion}


# ───── YOUTUBE VIDEO ─────
@app.get("/get_video")
def get_video(topic: str):
    try:
        # Simple, direct search query — no AI filtering that drops results
        search_query = f"{topic} lecture tutorial explained"

        url = (
            f"https://www.googleapis.com/youtube/v3/search"
            f"?part=snippet"
            f"&q={requests.utils.quote(search_query)}"
            f"&type=video"
            f"&videoCategoryId=27"   # Education category
            f"&maxResults=10"
            f"&relevanceLanguage=en"
            f"&key={YOUTUBE_API_KEY}"
        )

        res  = requests.get(url).json()
        items = res.get("items", [])

        if not items:
            # Fallback: search without category filter
            url2 = (
                f"https://www.googleapis.com/youtube/v3/search"
                f"?part=snippet"
                f"&q={requests.utils.quote(search_query)}"
                f"&type=video"
                f"&maxResults=10"
                f"&key={YOUTUBE_API_KEY}"
            )
            res   = requests.get(url2).json()
            items = res.get("items", [])

        if not items:
            return {"videoUrl": "https://www.youtube.com/embed/aircAruvnKk"}

        # ── Score videos by relevance ──
        # Prefer videos whose title contains the topic keywords
        topic_words = topic.lower().split()

        def score(item):
            title = item["snippet"]["title"].lower()
            desc  = item["snippet"]["description"].lower()
            s = 0
            for word in topic_words:
                if word in title: s += 3
                if word in desc:  s += 1
            # Bonus for educational keywords
            for kw in ["lecture", "tutorial", "explained", "introduction", "course", "learn"]:
                if kw in title: s += 2
            # Penalty for clearly off-topic content
            for bad in ["song", "music", "trailer", "movie", "funny", "meme", "vlog"]:
                if bad in title: s -= 5
            return s

        scored = sorted(items, key=score, reverse=True)
        video_id = scored[0]["id"]["videoId"]

        print(f"Topic: {topic} → Video: {scored[0]['snippet']['title']}")
        return {"videoUrl": f"https://www.youtube.com/embed/{video_id}"}

    except Exception as e:
        print("Video error:", e)
        return {"videoUrl": "https://www.youtube.com/embed/aircAruvnKk"}
