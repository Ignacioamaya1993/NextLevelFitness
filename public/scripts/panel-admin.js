// Importar los módulos necesarios desde Firebase
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import app from "../scripts/firebaseConfig.js"; // Asegúrate de que esta importación esté correcta

// Obtener la instancia de autenticación
const auth = getAuth(app);

// Verificar si el usuario está autenticado
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // Si no hay usuario autenticado, redirigir al login
        window.location.href = "login-admin.html";
    }
});

// Seleccionar el botón correctamente
const logoutButton = document.querySelector(".logout-button");

// Verificar si el botón existe antes de agregar el event listener
if (logoutButton) {
    logoutButton.addEventListener("click", () => {
        signOut(auth)
            .then(() => {
                window.location.href = "login-admin.html"; // Redirigir al login después de cerrar sesión
            })
            .catch((error) => {
                console.error("Error al cerrar sesión:", error);
            });
    });
} else {
    console.error("Botón de cerrar sesión no encontrado.");
}
