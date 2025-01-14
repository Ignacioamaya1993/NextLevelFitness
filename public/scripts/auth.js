import app from "./firebaseConfig.js";
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";

// Obtener la instancia de autenticación de Firebase
const auth = getAuth(app);

// Configurar la persistencia del usuario
setPersistence(auth, browserLocalPersistence)
    .then(() => {
        console.log("Persistencia configurada correctamente.");
    })
    .catch((error) => {
        console.error("Error configurando persistencia:", error);
    });

// Esperar a que el DOM cargue
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM cargado.");

    // Obtener los elementos de los menús
    const miCuentaMenu = document.getElementById("mi-cuenta-link");
    const loginMenu = document.getElementById("iniciar-sesion-link");

    // Depuración: Verificar si los elementos están presentes en el DOM
    console.log("Elemento #mi-cuenta-link:", miCuentaMenu);
    console.log("Elemento #iniciar-sesion-link:", loginMenu);

    // Validar si los elementos existen
    if (!miCuentaMenu || !loginMenu) {
        console.error("No se encontraron los elementos del menú.");
        return;
    }

    // Estado inicial: Mostrar "Iniciar Sesión" y ocultar "Mi Cuenta"
    miCuentaMenu.style.display = "none";
    loginMenu.style.display = "inline-block";

    // Escuchar cambios en el estado de autenticación
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Usuario autenticado: Mostrar "Mi Cuenta" y ocultar "Iniciar Sesión"
            console.log("Usuario autenticado:", user.email);
            miCuentaMenu.style.display = "inline-block";
            loginMenu.style.display = "none";
        } else {
            // Usuario no autenticado: Mostrar "Iniciar Sesión" y ocultar "Mi Cuenta"
            console.log("No hay usuario autenticado.");
            miCuentaMenu.style.display = "none";
            loginMenu.style.display = "inline-block";
        }
    });
});