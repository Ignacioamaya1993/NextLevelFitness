import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";

// Tu configuración de Firebase (la misma que usas en el registro)
const firebaseConfig = {
    apiKey: "AIzaSyAyyZYcW9s1REMP5kn0XZeISfLIjZQsCJU",
    authDomain: "next-level-fitness-52989.firebaseapp.com",
    projectId: "next-level-fitness-52989",
    storageBucket: "next-level-fitness-52989.firebasestorage.app",
    messagingSenderId: "35987157867",
    appId: "1:35987157867:web:cbc810334c47aac36e522e",
    measurementId: "G-T1HDKGPH2S"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig); // Asegúrate de inicializar Firebase aquí
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

        // Si la autenticación es exitosa, guarda la información en localStorage
        const currentUser = {
            isLoggedIn: true,
            email: user.email,
            uid: user.uid,
        };
        localStorage.setItem("currentUser", JSON.stringify(currentUser));

        // Verificar si la información se guardó correctamente
        console.log(localStorage.getItem("currentUser"));  // Aquí agregas la línea

        // Redirigir al usuario a "Tus Rutinas"
        window.location.href = "tus-rutinas.html";

    } catch (error) {
        console.error("Error al iniciar sesión:", error);
        if (error.code === "auth/wrong-password") {
            Swal.fire({
                icon: "error",
                title: "Contraseña incorrecta",
                text: "Por favor, verifica tu contraseña e intenta nuevamente.",
                confirmButtonColor: "#6f42c1",
            });
        } else if (error.code === "auth/user-not-found") {
            Swal.fire({
                icon: "warning",
                title: "Usuario no encontrado",
                text: `No existe una cuenta registrada con el correo: ${email}`,
                confirmButtonColor: "#6f42c1",
            });
        } else {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "Hubo un problema al procesar tu solicitud. Intenta nuevamente más tarde.",
                confirmButtonColor: "#6f42c1",
            });
        }
    }
});

// Función para alternar la visibilidad de la contraseña
function togglePasswordVisibility() {
    const passwordInput = document.getElementById("password");
    const toggleIcon = document.querySelector(".toggle-password i");

    // Alternar el tipo de entrada entre 'password' y 'text'
    const passwordType = passwordInput.getAttribute("type");
    passwordInput.setAttribute(
        "type",
        passwordType === "password" ? "text" : "password"
    );

    // Cambiar el ícono del ojo
    if (passwordType === "password") {
        toggleIcon.classList.remove("fa-eye-slash");
        toggleIcon.classList.add("fa-eye");
    } else {
        toggleIcon.classList.remove("fa-eye");
        toggleIcon.classList.add("fa-eye-slash");
    }
}