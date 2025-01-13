import { getAuth, onAuthStateChanged } from "firebase/auth";

const auth = getAuth();
const miCuentaMenu = document.querySelector('a[href="/public/pages/mi-cuenta.html"]'); // Selecciona el enlace "Mi Cuenta"
const loginMenu = document.querySelector('a[href="/public/pages/login.html"]'); // Selecciona el enlace "Iniciar Sesión"

onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuario está logueado
        miCuentaMenu.style.display = "inline-block"; // Mostrar "Mi Cuenta"
        loginMenu.style.display = "none"; // Ocultar "Iniciar Sesión"
    } else {
        // Usuario no está logueado
        miCuentaMenu.style.display = "none"; // Ocultar "Mi Cuenta"
        loginMenu.style.display = "inline-block"; // Mostrar "Iniciar Sesión"
    }
});