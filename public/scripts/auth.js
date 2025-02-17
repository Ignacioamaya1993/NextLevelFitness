import app from "../scripts/firebaseConfig";
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";

// Obtener la instancia de autenticación de Firebase
const auth = getAuth(app);

// Configurar la persistencia del usuario
setPersistence(auth, browserLocalPersistence)
    .then(() => {
    })
    .catch((error) => {
        console.error("Error configurando persistencia:", error);
    });

// Esperar a que el DOM cargue
document.addEventListener("DOMContentLoaded", () => {

    // Obtener los elementos de los menús
    const miCuentaMenu = document.getElementById("mi-cuenta-link");
    const loginMenu = document.getElementById("iniciar-sesion-link");

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
            miCuentaMenu.style.display = "inline-block";
            loginMenu.style.display = "none";
        } else {
            // Usuario no autenticado: Mostrar "Iniciar Sesión" y ocultar "Mi Cuenta"
            miCuentaMenu.style.display = "none";
            loginMenu.style.display = "inline-block";
        }
    });
});