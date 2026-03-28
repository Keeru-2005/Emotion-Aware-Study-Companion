async function generateQuiz(topic){

  const response = await fetch("http://127.0.0.1:8000/ask",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      question: `Generate a multiple choice question (MCQ) from the topic "${topic}".
      Give 4 options and mark correct answer clearly in JSON format:
      {question, options:[], correctIndex}`
    })
  });

  const data = await response.json();

  try{
    const quiz = JSON.parse(data.answer);

    document.getElementById('question').textContent = quiz.question;

    ['A','B','C','D'].forEach((id,i)=>{
      document.getElementById('text'+id).textContent = quiz.options[i];
    });

    correctIndex = quiz.correctIndex;

    document.getElementById('quizTrigger').style.display = 'none';
    document.getElementById('quizSection').classList.add('open');

  }catch{
    console.log("Parsing error", data.answer);
  }
}

const emotions = [
  { label: 'Focused',  state: 'Deep learning',   attention: 'High'   },
  { label: 'Curious',  state: 'Exploring',        attention: 'Medium' },
  { label: 'Confused', state: 'Needs support',    attention: 'Low'    },
  { label: 'Neutral',  state: 'Steady',           attention: 'Medium' }
];

let sessionActive  = false;
let emotionInterval = null;
let quizAnswered   = false;
let correctIndex   = -1;

// ── Start lecture ──────────────────────────────────────────────
async function startLecture(){

  const topic = document.getElementById("topic").value;

  console.log("Fetching video for:", topic);

  try{

    const res = await fetch(`http://127.0.0.1:8000/get_video?topic=${topic}`);
    const data = await res.json();

    const videoWrap = document.getElementById("videoContainer");

    videoWrap.innerHTML = `
      <iframe width="100%" height="100%"
        src="${data.videoUrl}"
        frameborder="0"
        allowfullscreen>
      </iframe>
    `;

    document.getElementById('sessionStatus').textContent = 'Active';

    sessionActive = true;

    simulateEmotion();
    if (emotionInterval) clearInterval(emotionInterval);
    emotionInterval = setInterval(simulateEmotion, 4000);

  }catch(err){
    console.log("Video error:", err);
  }
}

// ── Emotion simulation ─────────────────────────────────────────
async function simulateEmotion(){

  try{

    const response = await fetch("http://127.0.0.1:8000/detect_emotion");

    const data = await response.json();

    const emotion = data.emotion;

    let state="Steady";
    let attention="Medium";

    if(emotion==="happy"){
        state="Focused";
        attention="High";
    }

    if(emotion==="sad"){
        state="Stressed";
        attention="Low";
    }

    if(emotion==="fear" || emotion==="surprise"){
        state="Confused";
        attention="Low";
    }

    updateEmotion(emotion, state, attention);
    handleEmotionAction(emotion);

    async function handleEmotionAction(emotion){

    const video = document.querySelector("iframe");

    if(!video) return;

    // 🎯 CONFUSED → explanation
    if(emotion==="fear" || emotion==="surprise"){

      generateAIResponse(
       "Explain the current topic in a simple way with analogy and steps."
    );

}

// 😴 BORED → MCQ
else if(emotion==="neutral"){

    const topic = document.getElementById("topic").value;
    generateQuiz(topic);

}

// 😞 STRESSED → break motivation
else if(emotion==="sad"){

    generateAIResponse(
      "Give a short motivational break message for a stressed student. Make it inspiring and human."
    );

}

// 😎 FOCUSED → nothing
}

  }

  catch{

    updateEmotion("Neutral","Steady","Medium");

  }

}

async function generateAIResponse(prompt){

  const area = document.getElementById("diagramArea");

  area.innerHTML = "Generating...";

  const response = await fetch("http://127.0.0.1:8000/ask",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ question: prompt })
  });

  const data = await response.json();

  area.innerHTML = `<p>${data.answer}</p>`;
}

function updateEmotion(emotion, state, attention) {
  document.getElementById('emotionLabel').textContent   = emotion;
  document.getElementById('learningState').textContent  = state;
  document.getElementById('attention').textContent      = attention;
}

// ── Topic change ───────────────────────────────────────────────
function onTopicChange() {
  quizAnswered = false;
  document.getElementById('quizSection').classList.remove('open');
  document.getElementById('quizTrigger').style.display = 'block';
  document.getElementById('resultMsg').className = 'result-msg';
  ['A', 'B', 'C', 'D'].forEach(id => {
    document.getElementById(id).className = 'quiz-btn';
  });
}

// ── Show quiz ──────────────────────────────────────────────────
function showQuiz() {
  if (quizAnswered) return;

  const topic = document.getElementById('topic').value;

  generateQuiz(topic); // ✅ dynamic AI-generated quiz
}

// ── Answer ─────────────────────────────────────────────────────
function answer(option) {
  if (quizAnswered) return;
  quizAnswered = true;

  const ids       = ['A', 'B', 'C', 'D'];
  const chosen    = ids.indexOf(option);
  const isCorrect = chosen === correctIndex;

  ids.forEach((id, i) => {
    if (i === correctIndex) {
      document.getElementById(id).classList.add('correct');
    } else if (id === option && !isCorrect) {
      document.getElementById(id).classList.add('wrong');
    }
  });

  const msg = document.getElementById('resultMsg');
  msg.textContent = isCorrect
    ? '✓ Correct! Great work.'
    : '✗ Not quite — the correct answer is highlighted above.';
  msg.className = 'result-msg show ' + (isCorrect ? 'correct' : 'wrong');
}

// ───── CHAT SYSTEM ─────

async function sendMessage(){

    const input = document.getElementById("userInput");
    const chat = document.getElementById("chatBox");

    const question = input.value;

    if(question === "") return;

    chat.innerHTML += `<div class="user-msg">${question}</div>`;

    input.value="";

    chat.innerHTML += `<div class="bot-msg">Thinking...</div>`;

    try{

        const response = await fetch("http://127.0.0.1:8000/ask",{

            method:"POST",

            headers:{
                "Content-Type":"application/json"
            },

            body:JSON.stringify({
                question:question
            })

        });

        const data = await response.json();

        chat.innerHTML += `<div class="bot-msg">${data.answer}</div>`;

    }

    catch{

        chat.innerHTML += `<div class="bot-msg">Server not connected</div>`;

    }

}


// Simulated AI response (real GenAI later)

// ───── REAL GENAI API CALL ─────

async function generateAnswer(question){

  const chat = document.getElementById("chatBox");

  // show thinking message
  chat.innerHTML += `<div class="bot-msg">🤖 Thinking...</div>`;
  chat.scrollTop = chat.scrollHeight;

  try {

    const response = await fetch("http://localhost:8000/ask", {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        question: question
      })

    });

    const data = await response.json();

    const answer = data.answer;

    chat.innerHTML += `<div class="bot-msg">${answer}</div>`;

    if(question.toLowerCase().includes("neural")){
      generateFlowchart();
    }


    chat.scrollTop = chat.scrollHeight;

  } catch(error){

    chat.innerHTML += `<div class="bot-msg">⚠️ AI server not running</div>`;

  }

}


// ───── Flowchart generation (visual explanation) ─────

function generateFlowchart(){

  const area = document.getElementById("diagramArea");

  area.innerHTML = `
  <svg width="250" height="120">

  <rect x="20" y="10" width="80" height="30" fill="#E6F1FB"/>
  <text x="30" y="30" font-size="12">Input</text>

  <rect x="20" y="60" width="80" height="30" fill="#EAF3DE"/>
  <text x="25" y="80" font-size="12">Hidden Layer</text>

  <rect x="150" y="35" width="80" height="30" fill="#FCEBEB"/>
  <text x="165" y="55" font-size="12">Output</text>

  <line x1="100" y1="25" x2="150" y2="50" stroke="black"/>
  <line x1="100" y1="75" x2="150" y2="50" stroke="black"/>

  </svg>
  `;

}


// ───── MIC INPUT ─────

function startMic(){

  const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

const recognition = new SpeechRecognition();

  recognition.lang="en-US";

  recognition.start();

  recognition.onresult = function(event){

  const text = event.results[0][0].transcript;

  document.getElementById("userInput").value=text;

  };

}
document.getElementById("userInput").addEventListener("keypress", function(e) {
  if (e.key === "Enter") {
    sendMessage();
  }
}); 

function handleEmotionAction(emotion){

const video = document.getElementById("lectureVideo");

if(!video) return;

if(emotion==="fear" || emotion==="surprise"){

    video.pause();

    generateExplanation();

}

else if(emotion==="neutral"){

    video.pause();

    showQuiz();

}

else if(emotion==="sad"){

    video.pause();

    showBreakMessage();

}

}

async function showBreakMessage(){

const area = document.getElementById("diagramArea");

area.innerHTML="Generating break suggestion...";

const response = await fetch("http://127.0.0.1:8000/ask",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
question:"Generate a short motivational break message for a stressed student."
})

})

const data = await response.json();

area.innerHTML=`<p>${data.answer}</p>`;

}

async function uploadPDF(){

  const file = document.getElementById("pdfUpload").files[0];

  if(!file){
    alert("Upload a PDF first");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  await fetch("http://127.0.0.1:8000/upload_pdf", {
    method: "POST",
    body: formData
  });

  alert("PDF uploaded!");
}

async function clearPDF(){

  await fetch("http://127.0.0.1:8000/clear_pdf", {
    method: "POST"
  });

  alert("PDF removed!");
}