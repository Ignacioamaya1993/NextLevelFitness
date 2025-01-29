import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAyyZYcW9s1REMP5kn0XZeISfLIjZQsCJU",
    authDomain: "next-level-fitness-52989.firebaseapp.com",
    projectId: "next-level-fitness-52989",
    storageBucket: "next-level-fitness-52989.appspot.com",
    messagingSenderId: "35987157867",
    appId: "1:35987157867:web:cbc810334c47aac36e522e",
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // Obtención de Firestore

// Habilitar caché local
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === "failed-precondition") {
      console.log("No se puede habilitar persistencia: Múltiples pestañas abiertas.");
    } else if (err.code === "unimplemented") {
      console.log("El navegador no soporta IndexedDB.");
    }
  });

export { db };  // Exporta solo la referencia de Firestore
export default app;
