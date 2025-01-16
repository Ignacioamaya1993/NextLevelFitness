import app from "../scripts/firebaseConfig.js"; // Importa la instancia de Firebase desde firebaseConfig.js
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail, fetchSignInMethodsForEmail } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";

// Obtén la instancia de autenticación desde la app importada
const auth = getAuth(app);

// Selección de elementos del formulario
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

// Función para restablecer validaciones personalizadas
function resetCustomValidity(input) {
    input.setCustomValidity(""); // Limpia el mensaje de error personalizado
    input.reportValidity(); // Actualiza la validez del campo
}

// Restablecer la validación cuando el usuario interactúa nuevamente con el campo
emailInput.addEventListener("input", () => resetCustomValidity(emailInput));
passwordInput.addEventListener("input", () => resetCustomValidity(passwordInput));

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault(); // Evita que el formulario recargue la página

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    // Validar campos vacíos
    if (!email) {
        emailInput.setCustomValidity("Por favor, completa este campo.");
        emailInput.reportValidity();
        return;
    }

    if (!password) {
        passwordInput.setCustomValidity("Por favor, completa este campo.");
        passwordInput.reportValidity();
        return;
    }

    // Restablecer mensajes de validación personalizada
    resetCustomValidity(emailInput);
    resetCustomValidity(passwordInput);

    try {
        // Intentar iniciar sesión con las credenciales proporcionadas
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Verificar si el correo está verificado
        if (user.emailVerified) {
            console.log("Correo verificado: Continuando con la autenticación.");

            // Limpiar solo los datos necesarios en localStorage
            const currentUser = {
                isLoggedIn: true,
                email: user.email,
                uid: user.uid,
            };
            localStorage.setItem("currentUser", JSON.stringify(currentUser));

            // Redirigir a la página de tus rutinas
            window.location.href = "tus-rutinas.html";
        } else {
            // Solo muestra el mensaje de advertencia sin hacer signOut
            console.log("Correo no verificado, deteniendo el flujo");
            Swal.fire({
                icon: "warning",
                title: "Correo no verificado",
                text: "Por favor, verifica tu correo antes de iniciar sesión.",
                confirmButtonColor: "#6f42c1",
            });
        }
    } catch (error) {
        console.error("Error al iniciar sesión:", error);

        let errorMessage = "Ocurrió un error desconocido. Por favor, inténtalo de nuevo.";

        switch (error.code) {
            case "auth/invalid-credential":
                errorMessage = "Las credenciales proporcionadas son incorrectas. Por favor, verifica tu correo y contraseña e intenta nuevamente.";
                break;
            case "auth/user-not-found":
                errorMessage = `No existe una cuenta registrada con el correo: ${email}`;
                break;
            case "auth/wrong-password":
                errorMessage = "La contraseña es incorrecta. Por favor, intenta nuevamente.";
                break;
            default:
                console.warn("Error no controlado:", error.code);
        }

        Swal.fire({
            icon: "error",
            title: "Error",
            text: errorMessage,
            confirmButtonColor: "#6f42c1",
        });
    }
});

// Función para alternar la visibilidad de la contraseña
function togglePasswordVisibility() {
    const passwordType = passwordInput.getAttribute("type");
    passwordInput.setAttribute(
        "type",
        passwordType === "password" ? "text" : "password"
    );

    const toggleIcon = document.querySelector(".toggle-password i");
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
            // Verificar si el correo está registrado
            const methods = await fetchSignInMethodsForEmail(auth, email);
            if (methods.length === 0) {
                // Si no hay métodos de inicio de sesión asociados al correo, es decir, el correo no está registrado
                Swal.fire({
                    icon: "error",
                    title: "Correo no registrado",
                    text: "El correo ingresado no está asociado a ninguna cuenta. Verifica el correo e intenta nuevamente.",
                    confirmButtonColor: "#6f42c1",
                });
            } else {
                // Si el correo está registrado, proceder con el envío del enlace de recuperación
                await sendPasswordResetEmail(auth, email);
                Swal.fire({
                    icon: "success",
                    title: "Correo enviado",
                    text: "Hemos enviado un enlace para recuperar tu contraseña. Revisa tu bandeja de entrada.",
                    confirmButtonColor: "#6f42c1",
                });
            }
        } catch (error) {
            console.error("Error al enviar el correo de recuperación:", error);
            let message = "Hubo un problema al procesar tu solicitud. Intenta nuevamente más tarde.";

            switch (error.code) {
                case "auth/invalid-email":
                    message = "El correo ingresado no tiene un formato válido. Verifica e intenta nuevamente.";
                    break;
                case "auth/network-request-failed":
                    message = "Hubo un problema con la conexión. Verifica tu red e intenta nuevamente.";
                    break;
                default:
                    console.warn("Error no controlado:", error.code);
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