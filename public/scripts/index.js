import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } from "firebase/auth";

document.addEventListener("DOMContentLoaded", () => {
    // Obtener el elemento del menú de cuenta
    const accountLink = document.getElementById("account-link");

    // Inicializar Firebase Auth
    const auth = getAuth();

    // Establecer persistencia para que el usuario permanezca logueado
    setPersistence(auth, browserLocalPersistence)
        .then(() => {
            // Escuchar cambios en el estado de autenticación
            onAuthStateChanged(auth, (user) => {
                if (user) {
                    console.log("Usuario autenticado:", user.email);
                    // Si el usuario está autenticado, mostrar "Mi Cuenta"
                    accountLink.innerHTML = `<a href="pages/mi-cuenta.html">Mi Cuenta</a>`;
                } else {
                    console.log("No hay usuario autenticado.");
                    // Si no hay usuario, mostrar "Iniciar Sesión"
                    accountLink.innerHTML = `<a href="pages/login.html">Iniciar Sesión</a>`;
                }
            });
        })
        .catch((error) => {
            console.error("Error configurando persistencia:", error);
        });
});
