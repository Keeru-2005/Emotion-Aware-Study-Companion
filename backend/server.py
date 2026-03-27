from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from pydantic import BaseModel
import openai

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

openai.api_key = "AIzaSyA3cbA12x6EfZC9VGuansAeeOPKT6_V154"

class Question(BaseModel):
    question: str

@app.post("/ask")
def ask_ai(q: Question):

    response = openai.ChatCompletion.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system",
             "content": "You are a helpful study assistant. Explain concepts clearly for students."},

            {"role": "user",
             "content": q.question}
        ]
    )

    answer = response["choices"][0]["message"]["content"]

    return {"answer": answer}