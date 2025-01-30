// Importar los módulos necesarios desde Firebase
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import app from "../scripts/firebaseConfig.js"; // Asegúrate de que esta importación esté correcta

// Seleccionar el botón correctamente
const logoutButton = document.querySelector(".logout-button");

// Verificar si el botón existe antes de agregar el event listener
if (logoutButton) {
    logoutButton.addEventListener("click", () => {
        const auth = getAuth(app);  // Obtener la instancia de autenticación
        signOut(auth).then(() => {
            window.location.href = "login-admin.html"; // Redirigir al login después de cerrar sesión
        }).catch((error) => {
            console.error("Error al cerrar sesión:", error);
        });
    });
} else {
    console.error("Botón de cerrar sesión no encontrado.");
}