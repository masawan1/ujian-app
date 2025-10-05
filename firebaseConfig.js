// firebaseConfig.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyATMc_z-Q2qNsojqsl58AN14hL5Ldf4k3U",
  authDomain: "ujian-online-f9fc2.firebaseapp.com",
  projectId: "ujian-online-f9fc2",
  storageBucket: "ujian-online-f9fc2.appspot.com",
  messagingSenderId: "900820928505",
  appId: "1:900820928505:web:66fc8304c0fbbab6d51f28"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
