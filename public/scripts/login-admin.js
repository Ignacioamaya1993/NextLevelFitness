import app from "../scripts/firebaseConfig.js"; 
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";

const auth = getAuth(app);

// Lista de correos de administradores
const adminEmails = ["ignacioamaya04@gmail.com", "soutrelleagustin64@gmail.com"];

document.getElementById("admin-login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const email = document.getElementById("admin-email").value.trim();
    const password = document.getElementById("admin-password").value.trim();

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        if (adminEmails.includes(user.email)) {
            // Redirige al panel de administración
            window.location.href = "panel-admin.html";
        } else {
            document.getElementById("login-error").innerText = "Acceso denegado. No eres administrador.";
            await signOut(auth); // Cierra sesión si no es admin
        }
    } catch (error) {
        document.getElementById("login-error").innerText = "Error al iniciar sesión: " + error.message;
    }
});