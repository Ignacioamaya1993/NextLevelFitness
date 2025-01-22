import app from "../scripts/firebaseConfig.js"; 
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail, fetchSignInMethodsForEmail } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";

const auth = getAuth(app);
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

// Función para restablecer validaciones personalizadas
function resetCustomValidity(input) {
    input.setCustomValidity(""); 
    input.reportValidity(); 
}

emailInput.addEventListener("input", () => resetCustomValidity(emailInput));
passwordInput.addEventListener("input", () => resetCustomValidity(passwordInput));

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

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

    resetCustomValidity(emailInput);
    resetCustomValidity(passwordInput);

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        if (user.emailVerified) {
            console.log("Correo verificado: Continuando con la autenticación.");
            const currentUser = {
                isLoggedIn: true,
                email: user.email,
                uid: user.uid,
            };
            localStorage.setItem("currentUser", JSON.stringify(currentUser));
            window.location.href = "tus-rutinas.html";
        } else {
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
        console.error("Código de error:", error.code); // Muestra el código de error
        console.error("Mensaje de error:", error.message); // Muestra el mensaje de error

        let errorMessage = "Ocurrió un error desconocido. Por favor, inténtalo de nuevo.";

        switch (error.code) {
            case "auth/invalid-credential":
                errorMessage = "Las credenciales proporcionadas son incorrectas. Por favor, verifica tu correo y contraseña e intenta nuevamente";
                break;
            case "auth/user-not-found":
                errorMessage = `No existe una cuenta registrada con el correo: ${email}`;
                break;
            case "auth/wrong-password":
                errorMessage = "La contraseña es incorrecta.";
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
        const cleanedEmail = email.trim().toLowerCase();
        console.log("Correo ingresado para recuperación:", cleanedEmail);

        try {
            console.log("Verificando métodos de inicio de sesión para el correo...");
            const methods = await fetchSignInMethodsForEmail(auth, cleanedEmail);
            console.log("Métodos de inicio de sesión disponibles:", methods);

            if (methods.length === 0) {
                console.log("El correo no está registrado:", cleanedEmail);
                Swal.fire({
                    icon: "error",
                    title: "Correo no registrado",
                    text: "El correo ingresado no está asociado a ninguna cuenta. Verifica el correo e intenta nuevamente.",
                    confirmButtonColor: "#6f42c1",
                });
            } else {
                console.log("Intentando enviar correo de recuperación...");
                await sendPasswordResetEmail(auth, cleanedEmail);
                console.log("Correo enviado correctamente.");
                Swal.fire({
                    icon: "success",
                    title: "Correo enviado",
                    text: "Hemos enviado un enlace para recuperar tu contraseña. Revisa tu bandeja de entrada.",
                    confirmButtonColor: "#6f42c1",
                });
            }
        } catch (error) {
            console.error("Error al procesar la solicitud:", error);
            console.error("Código de error:", error.code); // Muestra el código de error
            console.error("Mensaje de error:", error.message); // Muestra el mensaje de error

            Swal.fire({
                icon: "error",
                title: "Error",
                text: "Hubo un problema al procesar tu solicitud. Por favor, intenta nuevamente más tarde.",
                confirmButtonColor: "#6f42c1",
            });
        }
    } else {
        console.log("El usuario canceló el diálogo de recuperación.");
    }
});