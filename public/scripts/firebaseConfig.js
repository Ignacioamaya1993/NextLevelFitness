import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";

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

export default app;