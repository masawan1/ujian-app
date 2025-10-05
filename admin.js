import { auth, db } from "./firebaseConfig.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const loginSection = document.getElementById("login-section");
const dashboard = document.getElementById("dashboard");
const emailInput = document.getElementById("email");
const passInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

const qIdInput = document.getElementById("qId");
const qText = document.getElementById("qText");
const optionsWrapper = document.getElementById("options-wrapper");
const addOptionBtn = document.getElementById("add-option");
const btnSave = document.getElementById("btnSave");
const btnPreview = document.getElementById("btnPreview");
const questionList = document.getElementById("questionList");

const previewModal = document.getElementById("preview-modal");
const previewQ = document.getElementById("preview-question");
const previewOpts = document.getElementById("preview-options");
const closePreview = document.getElementById("closePreview");

let correctIndex = 0;

/* ========== LOGIN LOGIC ========== */
loginBtn.onclick = async () => {
  try {
    await signInWithEmailAndPassword(auth, emailInput.value, passInput.value);
  } catch (err) {
    alert("Login gagal: " + err.message);
  }
};

logoutBtn.onclick = async () => {
  await signOut(auth);
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginSection.classList.add("hidden");
    dashboard.classList.remove("hidden");
    loadQuestions();
  } else {
    loginSection.classList.remove("hidden");
    dashboard.classList.add("hidden");
  }
});

/* ========== SOAL MANAGEMENT ========== */
function makeOptionInput(value = "", index = null) {
  const idx = index ?? optionsWrapper.children.length;
  const wrap = document.createElement("div");
  wrap.className = "flex items-center gap-2";

  const radio = document.createElement("input");
  radio.type = "radio";
  radio.name = "correctOpt";
  radio.className = "h-4 w-4 text-indigo-600";
  radio.checked = idx === correctIndex;
  radio.onchange = () => (correctIndex = idx);

  const input = document.createElement("input");
  input.className = "input-field flex-1";
  input.placeholder = `Pilihan ${idx + 1}`;
  input.value = value;

  const del = document.createElement("button");
  del.textContent = "🗑️";
  del.className = "px-2 py-1 border rounded text-sm";
  del.onclick = () => {
    wrap.remove();
    rebuildIndexes();
  };

  wrap.append(radio, input, del);
  optionsWrapper.append(wrap);
}

function rebuildIndexes() {
  Array.from(optionsWrapper.children).forEach((div, i) => {
    const input = div.querySelector("input[type=text]");
    const radio = div.querySelector("input[type=radio]");
    input.placeholder = `Pilihan ${i + 1}`;
    radio.onchange = () => (correctIndex = i);
  });
}

function getOptionsValues() {
  return Array.from(optionsWrapper.querySelectorAll("input[type=text]")).map(i => i.value.trim());
}

addOptionBtn.onclick = () => makeOptionInput("");

makeOptionInput("");
makeOptionInput("");

btnSave.onclick = async () => {
  const text = qText.value.trim();
  const options = getOptionsValues();
  if (!text || options.some(o => o === "")) return alert("Lengkapi soal & pilihan!");
  const data = { questionText: text, options, correctIndex };

  try {
    if (qIdInput.value) {
      await updateDoc(doc(db, "questions", qIdInput.value), data);
      alert("Soal diperbarui!");
    } else {
      await addDoc(collection(db, "questions"), data);
      alert("Soal ditambahkan!");
    }
    clearForm();
    loadQuestions();
  } catch (err) {
    alert("Gagal menyimpan: " + err.message);
  }
};

async function loadQuestions() {
  questionList.innerHTML = "<p class='text-gray-500 text-sm'>Memuat soal...</p>";
  const query = await getDocs(collection(db, "questions"));
  questionList.innerHTML = "";
  query.forEach((docSnap) => {
    const q = docSnap.data();
    const div = document.createElement("div");
    div.className = "p-3 border rounded-md hover:bg-gray-50 text-left";
    div.innerHTML = `
      <p class="font-semibold">${q.questionText}</p>
      <p class="text-sm text-gray-600">Jawaban benar: <b>${q.options[q.correctIndex]}</b></p>
      <div class="flex gap-2 mt-2">
        <button class="px-2 py-1 border rounded text-sm text-blue-500" data-id="${docSnap.id}" data-action="edit">Edit</button>
        <button class="px-2 py-1 border rounded text-sm text-red-500" data-id="${docSnap.id}" data-action="delete">Hapus</button>
      </div>
    `;
    questionList.append(div);
  });

  questionList.querySelectorAll("button").forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const act = btn.dataset.action;
      if (act === "edit") {
        const snap = query.docs.find(d => d.id === id);
        const q = snap.data();
        qIdInput.value = id;
        qText.value = q.questionText;
        optionsWrapper.innerHTML = "";
        correctIndex = q.correctIndex;
        q.options.forEach((opt, i) => makeOptionInput(opt, i));
      } else if (act === "delete") {
        if (confirm("Hapus soal ini?")) {
          await deleteDoc(doc(db, "questions", id));
          loadQuestions();
        }
      }
    };
  });
}

function clearForm() {
  qIdInput.value = "";
  qText.value = "";
  optionsWrapper.innerHTML = "";
  correctIndex = 0;
  makeOptionInput("");
  makeOptionInput("");
}

/* ========== PREVIEW ========== */
btnPreview.onclick = () => {
  const text = qText.value.trim();
  const options = getOptionsValues();
  if (!text || options.some(o => o === "")) return alert("Isi soal & pilihan dulu!");
  previewQ.textContent = text;
  previewOpts.innerHTML = "";
  options.forEach((opt, i) => {
    const b = document.createElement("button");
    b.textContent = opt;
    b.className = "btn-primary w-full";
    if (i === correctIndex) b.classList.add("border-2", "border-green-400");
    previewOpts.append(b);
  });
  previewModal.classList.remove("hidden");
};

closePreview.onclick = () => {
  previewModal.classList.add("hidden");
};
