// admin.js
import { auth, db } from "./firebaseConfig.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
  collection,
  getDocs,
  addDoc,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/* ---------- UI refs ---------- */
const loginCard = document.getElementById("login-card");
const panel = document.getElementById("admin-panel");
const emailSpan = document.getElementById("admin-email");
const btnLogout = document.getElementById("btn-logout");

const emailInput = document.getElementById("admin-email-input");
const passInput = document.getElementById("admin-pass-input");
const btnLogin = document.getElementById("btn-login");

const qIdInput = document.getElementById("q-id");
const qText = document.getElementById("q-text");
const optionsWrapper = document.getElementById("options-wrapper");
const addOptionBtn = document.getElementById("add-option");
const correctSelect = document.getElementById("correct-index");
const btnSave = document.getElementById("btn-save");
const btnClear = document.getElementById("btn-clear");
const questionsList = document.getElementById("questions-list");

/* ---------- helpers ---------- */
function makeOptionInput(value = "") {
  const idx = optionsWrapper.children.length;
  const wrap = document.createElement("div");
  wrap.className = "flex gap-2 items-center";
  const input = document.createElement("input");
  input.className = "input-field flex-1";
  input.value = value;
  input.placeholder = `Pilihan ${idx + 1}`;
  const del = document.createElement("button");
  del.className = "px-2 py-1 border rounded text-sm";
  del.textContent = "Hapus";
  del.onclick = () => {
    wrap.remove();
    rebuildCorrectSelect();
  };
  wrap.appendChild(input);
  wrap.appendChild(del);
  optionsWrapper.appendChild(wrap);
  rebuildCorrectSelect();
  return input;
}

function getOptionsValues() {
  return Array.from(optionsWrapper.querySelectorAll("input")).map(i => i.value.trim());
}

function rebuildCorrectSelect() {
  const opts = getOptionsValues();
  correctSelect.innerHTML = "";
  opts.forEach((o, i) => {
    const el = document.createElement("option");
    el.value = i;
    el.textContent = `Pilihan ${i + 1}`;
    correctSelect.appendChild(el);
  });
}

/* ---------- Auth & UI ---------- */

btnLogin.onclick = async () => {
  try {
    await signInWithEmailAndPassword(auth, emailInput.value, passInput.value);
  } catch (e) {
    alert("Login gagal: " + e.message);
  }
};

btnLogout.onclick = async () => {
  await signOut(auth);
};

onAuthStateChanged(auth, async (user) => {
  if (user) {
    // tampilkan panel admin
    loginCard.classList.add("hidden");
    panel.classList.remove("hidden");
    btnLogout.classList.remove("hidden");
    emailSpan.textContent = user.email;
    // load soal
    await loadQuestions();
  } else {
    panel.classList.add("hidden");
    loginCard.classList.remove("hidden");
    btnLogout.classList.add("hidden");
    emailSpan.textContent = "";
  }
});

/* ---------- Firestore CRUD ---------- */

async function loadQuestions() {
  questionsList.innerHTML = "<p class='text-sm text-gray-500'>Memuat soal...</p>";
  try {
    const snap = await getDocs(collection(db, "questions"));
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderQuestionsList(docs);
  } catch (e) {
    questionsList.innerHTML = "<p class='text-sm text-red-500'>Gagal memuat soal.</p>";
    console.error(e);
  }
}

function renderQuestionsList(docs) {
  if (docs.length === 0) {
    questionsList.innerHTML = "<p class='text-sm text-gray-500'>Belum ada soal.</p>";
    return;
  }
  questionsList.innerHTML = "";
  docs.forEach((q, idx) => {
    const wrap = document.createElement("div");
    wrap.className = "border rounded p-3 flex justify-between items-start";
    const left = document.createElement("div");
    left.innerHTML = `<div class="text-sm font-medium">${idx + 1}. ${escapeHtml(q.questionText)}</div>
                      <div class="text-xs text-gray-600 mt-2">${q.options?.map((o,i)=>`<div>${String.fromCharCode(65+i)}. ${escapeHtml(o)}</div>`).join("")}</div>`;
    const actions = document.createElement("div");
    actions.className = "flex flex-col gap-2";
    const btnEdit = document.createElement("button");
    btnEdit.className = "px-3 py-1 border rounded";
    btnEdit.textContent = "Edit";
    btnEdit.onclick = () => populateEditForm(q);
    const btnDel = document.createElement("button");
    btnDel.className = "px-3 py-1 bg-red-500 text-white rounded";
    btnDel.textContent = "Hapus";
    btnDel.onclick = async () => {
      if (!confirm("Hapus soal ini?")) return;
      try {
        await deleteDoc(doc(collection(db, "questions").parent ? collection(db, "questions").parent : doc(db, "dummy"), q.id));
      } catch (err) {
        // fallback: use doc ref properly
        await deleteDoc(doc(db, "questions", q.id));
      }
      await loadQuestions();
    };
    actions.appendChild(btnEdit);
    actions.appendChild(btnDel);
    wrap.appendChild(left);
    wrap.appendChild(actions);
    questionsList.appendChild(wrap);
  });
}

/* escape helper */
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* populate edit form */
function populateEditForm(q) {
  qIdInput.value = q.id;
  qText.value = q.questionText || "";
  optionsWrapper.innerHTML = "";
  (q.options || []).forEach(o => makeOptionInput(o));
  rebuildCorrectSelect();
  correctSelect.value = (q.correctIndex ?? 0);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* save new or update */
btnSave.onclick = async () => {
  const text = qText.value.trim();
  const options = getOptionsValues().filter(Boolean);
  const correctIndex = parseInt(correctSelect.value || "0", 10);
  if (!text) return alert("Teks soal harus diisi");
  if (options.length < 2) return alert("Tambahkan minimal 2 pilihan");
  const payload = {
    questionText: text,
    options,
    correctIndex,
    updatedAt: serverTimestamp()
  };
  try {
    if (qIdInput.value) {
      // update
      await setDoc(doc(db, "questions", qIdInput.value), { ...payload }, { merge: true });
      alert("Soal diperbarui");
    } else {
      // add
      await addDoc(collection(db, "questions"), {
        ...payload,
        createdAt: serverTimestamp()
      });
      alert("Soal disimpan");
    }
    clearForm();
    await loadQuestions();
  } catch (e) {
    alert("Gagal menyimpan: " + e.message);
  }
};

btnClear.onclick = () => clearForm();

function clearForm() {
  qIdInput.value = "";
  qText.value = "";
  optionsWrapper.innerHTML = "";
  makeOptionInput("");
  makeOptionInput("");
  rebuildCorrectSelect();
  correctSelect.value = "0";
}

/* add initial option inputs */
makeOptionInput("");
makeOptionInput("");

addOptionBtn.onclick = () => makeOptionInput("");

/* NOTE: deleteDoc fallback function fixed above; but we'll import doc/deleteDoc accordingly */
import { doc as docRef } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
