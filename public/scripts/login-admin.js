import app from "../scripts/firebaseConfig.js"; 
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";

const auth = getAuth(app);

// No es necesario mantener los correos de los administradores aquí si ya los manejas desde las reglas de seguridad
document.getElementById("admin-login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const email = document.getElementById("admin-email").value.trim();
    const password = document.getElementById("admin-password").value.trim();

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Verifica si el usuario es administrador (esto lo puedes manejar en las reglas de Firebase)
        if (user.email === "ignacioamaya04@gmail.com" || user.email === "soutrelleagustin64@gmail.com") {
            // Redirige al panel de administración
            window.location.href = "panel-admin.html";
        } else {
            // Muestra el mensaje de acceso denegado con SweetAlert
            await Swal.fire({
                icon: 'error',
                title: 'Acceso denegado',
                text: 'No eres administrador.',
            });
            await signOut(auth); // Cierra sesión si no es admin
        }
    } catch (error) {
        // Muestra el error de inicio de sesión con SweetAlert
        await Swal.fire({
            icon: 'error',
            title: 'Error al iniciar sesión',
            text: error.message,
        });
    }
});
