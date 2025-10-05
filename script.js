import { auth, db } from "./firebaseConfig.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const loginSection = document.getElementById("login-section");
const examSection = document.getElementById("exam-section");
const resultSection = document.getElementById("result-section");
const emailInput = document.getElementById("email");
const passInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const questionText = document.getElementById("questionText");
const optionsDiv = document.getElementById("options");
const nextBtn = document.getElementById("nextBtn");
const timerDiv = document.getElementById("timer");
const scoreEl = document.getElementById("score");

let questions = [];
let index = 0;
let correct = 0;
let timeLeft = 60; // detik

// Login user
loginBtn.onclick = async () => {
  try {
    await signInWithEmailAndPassword(auth, emailInput.value, passInput.value);
  } catch (err) {
    alert("Login gagal: " + err.message);
  }
};

// Cek login state
onAuthStateChanged(auth, async (user) => {
  if (user) {
    loginSection.classList.add("hidden");
    examSection.classList.remove("hidden");
    await loadQuestions();
    showQuestion();
    startTimer();
  }
});

// Ambil soal dari Firestore
async function loadQuestions() {
  const querySnapshot = await getDocs(collection(db, "questions"));
  questions = querySnapshot.docs.map((d) => d.data());
}

// Tampilkan soal
function showQuestion() {
  if (index >= questions.length) {
    endExam();
    return;
  }

  const q = questions[index];
  questionText.textContent = q.questionText;
  optionsDiv.innerHTML = "";
  q.options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.textContent = opt;
    btn.onclick = () => checkAnswer(opt, q.correctAnswer);
    optionsDiv.appendChild(btn);
  });
}

function checkAnswer(selected, correctAns) {
  if (selected === correctAns) correct++;
  index++;
  showQuestion();
}

// Timer
function startTimer() {
  const timer = setInterval(() => {
    timeLeft--;
    timerDiv.textContent = "Waktu: " + timeLeft + " detik";
    if (timeLeft <= 0) {
      clearInterval(timer);
      endExam();
    }
  }, 1000);
}

// Selesai ujian
async function endExam() {
  examSection.classList.add("hidden");
  resultSection.classList.remove("hidden");
  const nilai = Math.round((correct / questions.length) * 100);
  scoreEl.textContent = `Nilai kamu: ${nilai}`;
  const user = auth.currentUser;
  if (user) {
    await addDoc(collection(db, "exam_results"), {
      userId: user.uid,
      score: nilai,
      correct,
      total: questions.length,
      createdAt: serverTimestamp()
    });
  }
}
