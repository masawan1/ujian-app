// student.js
import { auth, db } from "./firebaseConfig.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
  collection,
  getDocs,
  addDoc,
  doc,
  setDoc,
  serverTimestamp,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/* UI refs */
const loginSec = document.getElementById("login-sec");
const examSec = document.getElementById("exam-sec");
const stuEmail = document.getElementById("stu-email");
const stuPass = document.getElementById("stu-pass");
const stuLogin = document.getElementById("stu-login");

const examTitle = document.getElementById("exam-title");
const examMeta = document.getElementById("exam-meta");
const stuInfo = document.getElementById("stu-info");

const qBody = document.getElementById("q-body");
const qOpts = document.getElementById("q-opts");
const timerEl = document.getElementById("timer");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const submitBtn = document.getElementById("submit-btn");
const resultCard = document.getElementById("result-card");
const resultText = document.getElementById("result-text");

/* state */
let questions = [];
let current = 0;
let answers = {};
let timeLeft = 60; // default seconds
let timerInterval = null;

/* login */
stuLogin.onclick = async () => {
  try {
    await signInWithEmailAndPassword(auth, stuEmail.value, stuPass.value);
  } catch (e) {
    alert("Login gagal: " + e.message);
  }
};

onAuthStateChanged(auth, async (user) => {
  if (user) {
    loginSec.classList.add("hidden");
    examSec.classList.remove("hidden");
    stuInfo.textContent = user.email;
    await loadExam(); // for simplicity: load all questions as one exam
    startTimer();
    renderQuestion();
  } else {
    loginSec.classList.remove("hidden");
    examSec.classList.add("hidden");
  }
});

/* load questions */
async function loadExam() {
  const snap = await getDocs(collection(db, "questions"));
  questions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  examTitle.textContent = "Ujian - " + (questions.length ? `(${questions.length} soal)` : "");
  examMeta.textContent = "Durasi: 1 menit per sesi (bisa diupdate)";
  timeLeft = Math.max(60, questions.length * 30); // contoh: 30 detik per soal
}

/* render question */
function renderQuestion() {
  if (!questions.length) {
    qBody.innerHTML = "<p class='text-gray-500'>Belum ada soal.</p>";
    qOpts.innerHTML = "";
    return;
  }
  if (current < 0) current = 0;
  if (current >= questions.length) current = questions.length - 1;
  const q = questions[current];
  qBody.innerHTML = `<div class="text-sm font-medium">${current + 1}. ${escapeHtml(q.questionText)}</div>`;
  qOpts.innerHTML = "";
  (q.options || []).forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className = (answers[q.id] === i) ? "btn-primary w-full py-2 rounded" : "w-full py-2 border rounded";
    btn.style.textAlign = "left";
    btn.textContent = `${String.fromCharCode(65+i)}. ${opt}`;
    btn.onclick = () => {
      answers[q.id] = i;
      renderQuestion();
      autosave();
    };
    qOpts.appendChild(btn);
  });
}

/* navigation */
prevBtn.onclick = () => {
  if (current > 0) { current--; renderQuestion(); }
};
nextBtn.onclick = () => {
  if (current < questions.length - 1) { current++; renderQuestion(); }
};

/* timer */
function startTimer() {
  timerEl.textContent = `⏰ Waktu tersisa: ${formatTime(timeLeft)}`;
  timerInterval = setInterval(() => {
    timeLeft--;
    timerEl.textContent = `⏰ Waktu tersisa: ${formatTime(timeLeft)}`;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      submitExam();
    }
  }, 1000);
}

/* format */
function formatTime(sec) {
  const m = Math.floor(sec/60);
  const s = sec % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

/* autosave (merge draft) */
async function autosave() {
  const user = auth.currentUser;
  if (!user) return;
  const id = `draft_${user.uid}`;
  try {
    await setDoc(doc(db, "exam_results", id), {
      userId: user.uid,
      answers,
      savedAt: serverTimestamp()
    }, { merge: true });
  } catch(e) {
    console.error("Autosave error", e);
  }
}

/* submit final */
submitBtn.onclick = submitExam;

async function submitExam() {
  if (!confirm("Kirim jawaban sekarang?")) return;
  // hitung skor
  let correct = 0;
  for (const q of questions) {
    const sel = answers[q.id];
    if (sel !== undefined && q.correctIndex === sel) correct++;
  }
  const score = Math.round((correct / Math.max(1, questions.length)) * 100);
  const user = auth.currentUser;
  if (!user) return;
  const id = `exam_${user.uid}_${Date.now()}`;
  try {
    await addDoc(collection(db, "exam_results"), {
      userId: user.uid,
      score,
      correct,
      total: questions.length,
      answers,
      finishedAt: serverTimestamp()
    });
    // show result
    resultCard.classList.remove("hidden");
    resultText.textContent = `Skor: ${score} — benar ${correct} dari ${questions.length}`;
    // stop timer
    clearInterval(timerInterval);
    // optional: sign out
    // await signOut(auth);
  } catch (e) {
    alert("Gagal submit: " + e.message);
  }
}

/* safe escape */
function escapeHtml(str = "") {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
