// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// 🔴 AQUÍ PEGARÁS TU CONFIG DE FIREBASE (luego te digo dónde sacarla)
const firebaseConfig = {
  apiKey: "AIzaSyDld_UHHytc0huKUD9bxHUnDACKFqlQMJo",
  authDomain: "impostor-futbolistas-6eb94.firebaseapp.com",
  projectId: "impostor-futbolistas-6eb94",
  storageBucket: "impostor-futbolistas-6eb94.firebasestorage.app",
  messagingSenderId: "536914780412",
  appId: "1:536914780412:web:0cacf60a16559b5c90f779",
  measurementId: "G-H3Q85PLHE7"
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
