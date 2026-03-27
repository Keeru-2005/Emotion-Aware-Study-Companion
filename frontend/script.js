const quizData = {
  'Introduction to AI': {
    question: 'What does AI stand for?',
    options: ['Artificial Intelligence', 'Automated Input', 'Analytical Interface', 'Augmented Information'],
    correct: 0
  },
  'Machine Learning Basics': {
    question: 'What is supervised learning?',
    options: ['Learning from labelled data', 'Learning without data', 'Random guessing', 'Manual programming'],
    correct: 0
  },
  'Neural Networks': {
    question: 'What is an activation function?',
    options: ['A network layer', 'A function introducing non-linearity', 'A loss metric', 'A learning rate'],
    correct: 1
  },
  'Data Structures': {
    question: 'What is RAM?',
    options: ['Temporary Memory', 'CPU', 'Hard Disk', 'Monitor'],
    correct: 0
  }
};

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
function startLecture() {
  sessionActive = true;

  const badge = document.getElementById('sessionStatus');
  badge.textContent = 'Active';
  badge.classList.add('active');

  const placeholder = document.getElementById('videoPlaceholder');
  const video       = document.getElementById('lectureVideo');
  placeholder.style.display = 'none';
  video.style.display = 'block';
  video.play().catch(() => {});

  simulateEmotion();
  if (emotionInterval) clearInterval(emotionInterval);
  emotionInterval = setInterval(simulateEmotion, 4000);
}

// ── Emotion simulation ─────────────────────────────────────────
function simulateEmotion() {
  const e = emotions[Math.floor(Math.random() * emotions.length)];
  updateEmotion(e.label, e.state, e.attention);
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
  const data  = quizData[topic];
  correctIndex = data.correct;

  document.getElementById('question').textContent = data.question;

  const ids = ['A', 'B', 'C', 'D'];
  ids.forEach((id, i) => {
    document.getElementById('text' + id).textContent = data.options[i];
    document.getElementById(id).className = 'quiz-btn';
  });

  document.getElementById('quizTrigger').style.display = 'none';
  document.getElementById('quizSection').classList.add('open');
  document.getElementById('resultMsg').className = 'result-msg';
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

        const response = await fetch("http://127.0.0.1:5000/ask",{

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

    const response = await fetch("http://localhost:5000/ask", {

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