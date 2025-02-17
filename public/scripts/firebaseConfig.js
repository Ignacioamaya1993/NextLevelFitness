import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDU6pLvhH9TjyaIW2pjY-aaPc_4XvoyraE",
  authDomain: "equipo-fpt.firebaseapp.com",
  projectId: "equipo-fpt",
  storageBucket: "equipo-fpt.firebasestorage.app",
  messagingSenderId: "884544819482",
  appId: "1:884544819482:web:98457ba765b5f4c5575ca3",
  measurementId: "G-FN7EB5EP9C"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // Obtención de Firestore

// Habilitar caché local
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === "failed-precondition") {
    } else if (err.code === "unimplemented") {
    }
  });

export { db };  // Exporta solo la referencia de Firestore
export default app;