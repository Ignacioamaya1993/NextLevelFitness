import app from "../scripts/firebaseConfig.js"; // Importa la instancia de Firebase desde firebaseConfig.js
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";

// Obtén la instancia de autenticación desde la app importada
const auth = getAuth(app);

// Selección de elementos del formulario
const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault(); // Evita que el formulario recargue la página

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        // Iniciar sesión con Firebase Authentication
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
    
        // Verificar si el correo está verificado
        if (!user.emailVerified) {
            Swal.fire({
                icon: "warning",
                title: "Correo no verificado",
                text: "Por favor, verifica tu correo antes de iniciar sesión.",
                confirmButtonColor: "#6f42c1",
            });
            return;
        }
    
        // Guardar información del usuario en localStorage
        const currentUser = {
            isLoggedIn: true,
            email: user.email,
            uid: user.uid,
        };
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
    
        // Redirigir al usuario a "Tus Rutinas"
        window.location.href = "tus-rutinas.html";
    } catch (error) {
        console.error("Error al iniciar sesión:", error); // Agregado para depuración
    
        let message;
        switch (error.code) {
            case "auth/wrong-password":
                message = "Contraseña incorrecta. Verifica tu contraseña e intenta nuevamente.";
                break;
            case "auth/user-not-found":
                message = `No existe una cuenta registrada con el correo: ${email}`;
                break;
            default:
                message = "Hubo un problema al procesar tu solicitud. Intenta nuevamente más tarde.";
                break;
        }
    
        Swal.fire({
            icon: error.code === "auth/user-not-found" ? "warning" : "error",
            title: "Error",
            text: message,
            confirmButtonColor: "#6f42c1",
        });
    }
    
// Función para alternar la visibilidad de la contraseña
function togglePasswordVisibility() {
    const passwordInput = document.getElementById("password");
    const toggleIcon = document.querySelector(".toggle-password i");

    const passwordType = passwordInput.getAttribute("type");
    passwordInput.setAttribute(
        "type",
        passwordType === "password" ? "text" : "password"
    );

    toggleIcon.classList.toggle("fa-eye");
    toggleIcon.classList.toggle("fa-eye-slash");
}

window.togglePasswordVisibility = togglePasswordVisibility;

// Recuperación de contraseña
const forgotPasswordLink = document.getElementById("forgotPassword");

forgotPasswordLink.addEventListener("click", async () => {
    const { value: email } = await Swal.fire({
        title: "Recuperar contraseña",
        input: "email",
        inputLabel: "Ingresa tu correo electrónico",
        inputPlaceholder: "ejemplo@correo.com",
        confirmButtonText: "Enviar",
        showCancelButton: true,
        cancelButtonText: "Cancelar",
        inputValidator: (value) => {
            if (!value) {
                return "¡Debes ingresar un correo!";
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                return "Por favor, ingresa un correo válido.";
            }
        },
    });

    if (email) {
        try {
            await sendPasswordResetEmail(auth, email);
            Swal.fire({
                icon: "success",
                title: "Correo enviado",
                text: "Hemos enviado un enlace para recuperar tu contraseña. Revisa tu bandeja de entrada.",
                confirmButtonColor: "#6f42c1",
            });
        } catch (error) {
            console.error("Error al enviar el correo de recuperación:", error);
            let message = "Hubo un problema al procesar tu solicitud. Intenta nuevamente más tarde.";
            if (error.code === "auth/user-not-found") {
                message = `No existe una cuenta registrada con el correo: ${email}`;
            }
            Swal.fire({
                icon: "error",
                title: "Error",
                text: message,
                confirmButtonColor: "#6f42c1",
            });
        }
    }
});