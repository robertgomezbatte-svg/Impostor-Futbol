import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDld_UHHytc0huKUD9bxHUnDACKFqlQMJo",
  authDomain: "impostor-futbolistas-6eb94.firebaseapp.com",

  databaseURL: "https://impostor-futbolistas-6eb94-default-rtdb.europe-west1.firebasedatabase.app/",

  projectId: "impostor-futbolistas-6eb94",
  storageBucket: "impostor-futbolistas-6eb94.firebasestorage.app",
  messagingSenderId: "536914780412",
  appId: "1:536914780412:web:0cacf60a16559b5c90f779",
  measurementId: "G-H3Q85PLHE7"
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// Helper para detectar configuración mala (lo usa online.js)
export function validateDatabaseURL() {
  const url = firebaseConfig.databaseURL || "";
  if (!url || url.includes("PON_AQUI_TU_DATABASE_URL_REAL")) {
    throw new Error(
      "Firebase mal configurado: falta databaseURL real de Realtime Database. " +
      "Ve a Firebase Console → Realtime Database → (Data) y copia la URL del endpoint."
    );
  }
  if (url.includes("console.firebase.google.com")) {
    throw new Error(
      "Firebase mal configurado: databaseURL apunta a la consola (console.firebase.google.com). " +
      "Debes poner el endpoint de Realtime Database (termina en firebaseio.com o firebasedatabase.app)."
    );
  }
}
