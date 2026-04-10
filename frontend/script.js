// ─────────────────────────────────────────────────────────────────
//  CONFIG
// ─────────────────────────────────────────────────────────────────
const BACKEND = "http://127.0.0.1:8000";

// ─────────────────────────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────────────────────────
let sessionActive    = false;
let emotionInterval  = null;
let quizAnswered     = false;
let correctIndex     = -1;
let ytPlayer         = null;
let pauseOverlayOpen = false;
let pauseQuizzes     = [];
let pauseAnswered    = [false, false];
let pauseCurrent     = 0;
let pauseDebounce    = null;
let pdfUploaded      = false;
let playerReady      = false;   // true once YT player fires onReady

// ─────────────────────────────────────────────────────────────────
//  YOUTUBE IFRAME API  — called automatically by YT script
// ─────────────────────────────────────────────────────────────────
function onYouTubeIframeAPIReady() {
  console.log("YT IFrame API ready");
}

// ─────────────────────────────────────────────────────────────────
//  START LECTURE
// ─────────────────────────────────────────────────────────────────
async function startLecture() {
  const topic = document.getElementById("topic").value.trim();
  if (!topic) { alert("Please enter a topic first."); return; }

  try {
    const res  = await fetch(`${BACKEND}/get_video?topic=${encodeURIComponent(topic)}`);
    const data = await res.json();

    // Extract video ID from embed URL
    const videoId = data.videoUrl.split("/embed/")[1]?.split("?")[0];
    if (!videoId) { console.error("No video ID"); return; }

    // Build the player container
    const container = document.getElementById("videoContainer");
    container.innerHTML = '<div id="ytPlayerEl" style="width:100%;height:100%;"></div>';

    // Destroy old player if exists
    if (ytPlayer && typeof ytPlayer.destroy === "function") {
      ytPlayer.destroy();
    }

    playerReady = false;

    // ── Create YT Player with enablejsapi ──
    // This is what makes onStateChange work for pause detection
    ytPlayer = new YT.Player("ytPlayerEl", {
      videoId: videoId,
      width:   "100%",
      height:  "100%",
      playerVars: {
        autoplay:       1,
        rel:            0,
        modestbranding: 1,
        enablejsapi:    1,   // ← REQUIRED for state change events
        origin:         window.location.origin,
      },
      events: {
        onReady:       onPlayerReady,
        onStateChange: onPlayerStateChange,
        onError:       onPlayerError,
      }
    });

    document.getElementById("sessionStatus").textContent = "Active";
    document.getElementById("sessionStatus").classList.add("active");
    sessionActive = true;

    // Start emotion polling every 8 seconds
    if (emotionInterval) clearInterval(emotionInterval);
    emotionInterval = setInterval(pollEmotion, 8000);

  } catch (err) {
    console.error("startLecture error:", err);
    alert("Could not load video. Check backend is running.");
  }
}

function onPlayerReady(event) {
  playerReady = true;
  console.log("YT Player ready");
  event.target.playVideo();
}

function onPlayerError(event) {
  console.error("YT Player error:", event.data);
}

// ─────────────────────────────────────────────────────────────────
//  YOUTUBE STATE CHANGE → PAUSE DETECTION
//  YT.PlayerState values:
//  -1 = unstarted, 0 = ended, 1 = playing, 2 = PAUSED, 3 = buffering
// ─────────────────────────────────────────────────────────────────
function onPlayerStateChange(event) {
  console.log("YT state:", event.data);

  if (!sessionActive || !playerReady) return;

  if (event.data === YT.PlayerState.PAUSED) {
    // Debounce: ignore if overlay already open or fired in last 2s
    if (pauseOverlayOpen) return;
    clearTimeout(pauseDebounce);
    pauseDebounce = setTimeout(() => {
      // Double-check player is still paused (not a seek)
      if (ytPlayer.getPlayerState() === YT.PlayerState.PAUSED) {
        console.log("Pause detected → triggering MCQ");
        triggerPauseQuiz();
      }
    }, 1000);
  }

  if (event.data === YT.PlayerState.PLAYING) {
    clearTimeout(pauseDebounce);
  }
}

// ─────────────────────────────────────────────────────────────────
//  TRIGGER PAUSE QUIZ OVERLAY
// ─────────────────────────────────────────────────────────────────
async function triggerPauseQuiz() {
  const topic = document.getElementById("topic").value.trim();
  if (!topic) return;

  pauseOverlayOpen = true;
  pauseAnswered    = [false, false];
  pauseCurrent     = 0;
  pauseQuizzes     = [];

  // Show overlay
  const overlay = document.getElementById("pauseOverlay");
  overlay.classList.add("active");
  setPoState("loading");

  try {
    const [q1, q2] = await Promise.all([
      fetchPauseQuestion(topic, 1),
      fetchPauseQuestion(topic, 2),
    ]);

    pauseQuizzes = [q1, q2];
    renderPauseQuestion(0);
    setPoState("quiz");

  } catch (err) {
    console.error("Pause quiz error:", err);
    closePauseOverlay();
    resumeVideo();
  }
}

async function fetchPauseQuestion(topic, num) {
  const prompt = `
Generate MCQ question ${num} of 2 for a student who just paused a lecture on: "${topic}".
Test understanding of a key concept from this topic.
Return ONLY valid JSON, no markdown, no explanation:
{"question":"...","options":["A text","B text","C text","D text"],"correctIndex":0,"explanation":"one sentence why correct"}
Rules: correctIndex is 0-based. All 4 options must be under 12 words each.
`.trim();

  const res  = await fetch(`${BACKEND}/ask`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ question: prompt }),
  });
  const data = await res.json();
  const raw  = data.answer.replace(/```json|```/g, "").trim();
  return JSON.parse(raw);
}

// ─────────────────────────────────────────────────────────────────
//  RENDER PAUSE QUESTION
// ─────────────────────────────────────────────────────────────────
function renderPauseQuestion(idx) {
  const q   = pauseQuizzes[idx];
  const ids = ["A", "B", "C", "D"];

  // Update dots
  document.querySelectorAll(".po-dot").forEach((d, i) => {
    d.classList.toggle("active",   i === idx);
    d.classList.toggle("answered", pauseAnswered[i]);
  });

  document.getElementById("poQ" + idx).textContent = q.question;

  const optsEl = document.getElementById("poOpts" + idx);
  optsEl.innerHTML = "";
  q.options.forEach((opt, i) => {
    const btn     = document.createElement("button");
    btn.className = "po-opt";
    btn.innerHTML = `<span class="po-opt-label">${ids[i]}</span> ${escHtml(opt)}`;
    btn.onclick   = () => answerPause(idx, i, q.correctIndex, q.explanation || "");
    optsEl.appendChild(btn);
  });

  document.getElementById("poRes" + idx).className   = "po-result";
  document.getElementById("poRes" + idx).textContent = "";

  document.getElementById("poQuiz0").style.display = idx === 0 ? "block" : "none";
  document.getElementById("poQuiz1").style.display = idx === 1 ? "block" : "none";
}

function answerPause(qIdx, chosen, correct, explanation) {
  const isCorrect      = chosen === correct;
  pauseAnswered[qIdx]  = true;

  const optsEl = document.getElementById("poOpts" + qIdx);
  optsEl.querySelectorAll(".po-opt").forEach((btn, i) => {
    btn.disabled = true;
    if (i === correct)                   btn.classList.add("correct");
    else if (i === chosen && !isCorrect) btn.classList.add("wrong");
  });

  const res       = document.getElementById("poRes" + qIdx);
  res.textContent = isCorrect ? "✓ Correct! " + explanation : "✗ " + explanation;
  res.className   = "po-result show " + (isCorrect ? "correct" : "wrong");

  const dots = document.querySelectorAll(".po-dot");
  dots[qIdx].classList.remove("active");
  dots[qIdx].classList.add("answered");

  if (qIdx === 0) {
    setTimeout(() => {
      renderPauseQuestion(1);
      document.getElementById("poQuiz0").style.display = "none";
      document.getElementById("poQuiz1").style.display = "block";
      dots[1].classList.add("active");
    }, 1200);
  } else {
    setTimeout(() => {
      setPoState("done");
      setTimeout(() => {
        closePauseOverlay();
        resumeVideo();
      }, 2000);
    }, 1200);
  }
}

function closePauseOverlay() {
  pauseOverlayOpen = false;
  document.getElementById("pauseOverlay").classList.remove("active");
}

function resumeVideo() {
  if (ytPlayer && typeof ytPlayer.playVideo === "function") {
    ytPlayer.playVideo();
  }
}

function setPoState(state) {
  document.getElementById("poLoading").style.display =
    state === "loading" ? "flex" : "none";
  document.getElementById("poQuiz0").style.display =
    (state === "quiz" && pauseCurrent === 0) ? "block" : "none";
  document.getElementById("poQuiz1").style.display = "none";
  document.getElementById("poDone").style.display  =
    state === "done" ? "block" : "none";
}

// ─────────────────────────────────────────────────────────────────
//  EMOTION POLLING
// ─────────────────────────────────────────────────────────────────
async function pollEmotion() {
  if (!sessionActive) return;
  try {
    const res    = await fetch(`${BACKEND}/detect_emotion`);
    const data   = await res.json();
    const emotion = data.emotion;

    let state = "Steady", attention = "Medium";
    if (emotion === "happy")                             { state = "Focused";      attention = "High";   }
    else if (emotion === "neutral")                      { state = "Bored";        attention = "Low";    }
    else if (emotion === "sad")                          { state = "Stressed";     attention = "Low";    }
    else if (emotion === "fear" || emotion === "fear")   { state = "Confused";     attention = "Low";    }

    updateEmotion(emotion, state, attention);
    handleEmotionAction(emotion);

  } catch {
    updateEmotion("Neutral", "Steady", "Medium");
  }
}

function updateEmotion(emotion, state, attention) {
  document.getElementById("emotionLabel").textContent  = emotion;
  document.getElementById("learningState").textContent = state;
  document.getElementById("attention").textContent     = attention;
}

// ─────────────────────────────────────────────────────────────────
//  EMOTION ACTIONS
// ─────────────────────────────────────────────────────────────────
async function handleEmotionAction(emotion) {
  if (!sessionActive) return;

  if (emotion === "fear") {
    // CONFUSED → explanation
    if (ytPlayer) ytPlayer.pauseVideo();
    const topic = document.getElementById("topic").value;
    const res   = await fetch(`${BACKEND}/ask`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        question: `Explain "${topic}" in the simplest way possible using a real-life analogy. Max 4 sentences.`
      }),
    });
    const data = await res.json();
    showActionCard("confused", "😕 You seem confused", data.answer);

  } else if (emotion === "neutral") {
    // BORED → pause + MCQ overlay
    if (!pauseOverlayOpen) {
      if (ytPlayer) ytPlayer.pauseVideo();
      setTimeout(triggerPauseQuiz, 500);
    }

  } else if (emotion === "sad") {
    // STRESSED → break message
    if (ytPlayer) ytPlayer.pauseVideo();
    const res  = await fetch(`${BACKEND}/ask`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        question: "Give a short warm motivational message for a student who feels stressed. Under 3 sentences."
      }),
    });
    const data = await res.json();
    showActionCard("stressed", "😣 Take a short break", data.answer);
  }
  // "happy" → do nothing, keep playing
}

function showActionCard(type, label, message) {
  const card = document.getElementById("emotionActionCard");
  document.getElementById("actionCardLabel").textContent = label;
  document.getElementById("actionCardBody").innerHTML =
    `<div class="action-msg ${type}">${escHtml(message)}</div>`;
  card.style.display = "block";
  setTimeout(() => { card.style.display = "none"; }, 12000);
}

// ─────────────────────────────────────────────────────────────────
//  MANUAL QUIZ (sidebar)
// ─────────────────────────────────────────────────────────────────
async function generateQuiz(topic) {
  document.getElementById("quizTrigger").innerHTML =
    `<div style="font-size:12px;color:#888;padding:8px">Generating question…</div>`;

  const res  = await fetch(`${BACKEND}/ask`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      question: `Generate a multiple choice question (MCQ) about "${topic}".
Return ONLY valid JSON, no markdown:
{"question":"...","options":["A","B","C","D"],"correctIndex":0}`
    }),
  });

  const data = await res.json();

  try {
    const raw  = data.answer.replace(/```json|```/g, "").trim();
    const quiz = JSON.parse(raw);

    document.getElementById("question").textContent = quiz.question;
    ["A","B","C","D"].forEach((id, i) => {
      document.getElementById("text" + id).textContent = quiz.options[i];
      const btn = document.getElementById(id);
      btn.className = "quiz-btn";
      btn.disabled  = false;
    });

    correctIndex = quiz.correctIndex;
    quizAnswered = false;

    document.getElementById("quizTrigger").style.display = "none";
    document.getElementById("quizSection").classList.add("open");
    document.getElementById("resultMsg").className = "result-msg";

  } catch (e) {
    console.error("Quiz parse error:", data.answer);
    document.getElementById("quizTrigger").innerHTML =
      `<button class="show-quiz-btn" onclick="showQuiz()">Generate quiz for this topic →</button>`;
  }
}

function showQuiz() {
  const topic = document.getElementById("topic").value.trim();
  if (!topic) { alert("Please enter a topic first."); return; }
  generateQuiz(topic);
}

function answer(option) {
  if (quizAnswered) return;
  quizAnswered = true;

  const ids       = ["A","B","C","D"];
  const chosen    = ids.indexOf(option);
  const isCorrect = chosen === correctIndex;

  ids.forEach((id, i) => {
    const btn   = document.getElementById(id);
    btn.disabled = true;
    if (i === correctIndex)               btn.classList.add("correct");
    else if (id === option && !isCorrect) btn.classList.add("wrong");
  });

  const msg       = document.getElementById("resultMsg");
  msg.textContent = isCorrect
    ? "✓ Correct! Great work."
    : "✗ Not quite — the correct answer is highlighted.";
  msg.className   = "result-msg show " + (isCorrect ? "correct" : "wrong");
}

// ─────────────────────────────────────────────────────────────────
//  CHAT
// ─────────────────────────────────────────────────────────────────
async function sendMessage() {
  const input    = document.getElementById("userInput");
  const chat     = document.getElementById("chatBox");
  const question = input.value.trim();
  if (!question) return;

  chat.innerHTML += `<div class="user-msg">${escHtml(question)}</div>`;
  input.value     = "";
  const thinkingEl = document.createElement("div");
  thinkingEl.className   = "bot-msg";
  thinkingEl.textContent = "🤖 Thinking…";
  chat.appendChild(thinkingEl);
  chat.scrollTop = chat.scrollHeight;

  try {
    const res  = await fetch(`${BACKEND}/ask`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ question }),
    });
    const data = await res.json();
    thinkingEl.textContent = data.answer;

    if (question.toLowerCase().includes("neural")) generateFlowchart();

  } catch {
    thinkingEl.textContent = "⚠️ Server not connected";
  }

  chat.scrollTop = chat.scrollHeight;
}

// ─────────────────────────────────────────────────────────────────
//  MIC
// ─────────────────────────────────────────────────────────────────
function startMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert("Use Chrome for mic support."); return; }
  const r = new SR();
  r.lang = "en-US";
  r.start();
  r.onresult = (e) => {
    document.getElementById("userInput").value = e.results[0][0].transcript;
  };
}

// ─────────────────────────────────────────────────────────────────
//  PDF
// ─────────────────────────────────────────────────────────────────
document.getElementById("pdfUpload").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append("file", file);
  await fetch(`${BACKEND}/upload_pdf`, { method: "POST", body: formData });
  const chat = document.getElementById("chatBox");
  chat.innerHTML += `<div class="bot-msg">📄 PDF uploaded: ${escHtml(file.name)}</div>`;
  chat.scrollTop  = chat.scrollHeight;
});

async function clearPDF() {
  await fetch(`${BACKEND}/clear_pdf`, { method: "POST" });
  const chat = document.getElementById("chatBox");
  chat.innerHTML += `<div class="bot-msg">📄 PDF removed.</div>`;
}

// ─────────────────────────────────────────────────────────────────
//  FLOWCHART
// ─────────────────────────────────────────────────────────────────
function generateFlowchart() {
  document.getElementById("diagramArea").innerHTML = `
    <svg width="250" height="120">
      <rect x="20" y="10" width="80" height="30" fill="#E6F1FB"/>
      <text x="30" y="30" font-size="12">Input</text>
      <rect x="20" y="60" width="80" height="30" fill="#EAF3DE"/>
      <text x="25" y="80" font-size="12">Hidden Layer</text>
      <rect x="150" y="35" width="80" height="30" fill="#FCEBEB"/>
      <text x="165" y="55" font-size="12">Output</text>
      <line x1="100" y1="25" x2="150" y2="50" stroke="black"/>
      <line x1="100" y1="75" x2="150" y2="50" stroke="black"/>
    </svg>`;
}

// ─────────────────────────────────────────────────────────────────
//  UTILS
// ─────────────────────────────────────────────────────────────────
function escHtml(s) {
  return String(s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
