// Importar los módulos necesarios desde Firebase
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import app from "../scripts/firebaseConfig.js"; // Asegúrate de que esta importación esté correcta

// Cerrar sesión
document.getElementById("logout-button").addEventListener("click", () => {
    const auth = getAuth(app);  // Usamos la instancia de autenticación
    signOut(auth).then(() => {
        window.location.href = "login-admin.html"; // Redirigir al login
    }).catch((error) => {
        console.error("Error al cerrar sesión:", error);
    });
});