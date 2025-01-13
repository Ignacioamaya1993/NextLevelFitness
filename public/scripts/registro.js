import app from './firebaseConfig.js';
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import { sendEmailVerification } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";

const auth = getAuth(app);
const db = getFirestore(app);

// Selección de elementos del formulario
const registroForm = document.getElementById("registro-form");
const mensaje = document.getElementById("mensaje");

// Función para calcular la edad a partir de la fecha de nacimiento
const calcularEdad = (fechaNacimiento) => {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();

    // Ajustar si no ha cumplido años este año
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
    }
    return edad;
};

// Manejar el envío del formulario
registroForm.addEventListener("submit", async (event) => {
    event.preventDefault(); // Evita que se recargue la página
    console.log("Formulario de registro enviado");

    // Obtener los valores de los campos
    const nombre = document.getElementById("nombre").value.trim();
    const apellido = document.getElementById("apellido").value.trim();
    const fechaNacimiento = document.getElementById("fecha-nacimiento").value.trim();
    const genero = document.getElementById("genero").value;
    const peso = parseFloat(document.getElementById("peso").value.trim());
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmarPassword = document.getElementById("confirmar-password").value;

    // Validaciones básicas
    if (!nombre || !apellido || !fechaNacimiento || !genero || !peso || !email || !password || !confirmarPassword) {
        mostrarMensaje("Por favor, completa todos los campos.", "error");
        return;
    }

    if (password !== confirmarPassword) {
        mostrarMensaje("Las contraseñas no coinciden.", "error");
        return;
    }

    const edad = calcularEdad(fechaNacimiento);
    if (edad < 18) {
        mostrarMensaje("Debes tener al menos 18 años para registrarte.", "error");
        return;
    }

    try {
        // Registrar el usuario con Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user; // Obtener el usuario registrado
        console.log("Usuario registrado exitosamente:", user);

        // Enviar correo de verificación
        await sendEmailVerification(user);
        console.log("Correo de verificación enviado a:", user.email);

        // Mostrar mensaje indicando que el correo de verificación fue enviado
        mostrarMensaje("Registro exitoso. Verifica tu correo antes de iniciar sesión.", "success");

        // Crear un nuevo usuario en Firestore
        const nuevoUsuario = {
            uid: user.uid,
            nombre,
            apellido,
            fechaNacimiento,
            genero,
            peso,
            email,
        };

        await addDoc(collection(db, "usuarios"), nuevoUsuario);

        registroForm.reset();
    } catch (error) {
        console.error("Error al registrar al usuario:", error);

        // Manejo de errores comunes
        switch (error.code) {
            case "auth/email-already-in-use":
                mostrarMensaje("El correo ya está registrado. Por favor, inicia sesión.", "error");
                break;
            case "auth/invalid-email":
                mostrarMensaje("Correo inválido. Por favor, verifica y vuelve a intentarlo.", "error");
                break;
            case "auth/weak-password":
                mostrarMensaje("La contraseña es muy débil. Usa al menos 6 caracteres.", "error");
                break;
            default:
                mostrarMensaje("Hubo un problema al registrar al usuario. Intenta nuevamente.", "error");
        }
    }
});

// Función para mostrar mensajes de error o éxito
function mostrarMensaje(texto, tipo) {
    mensaje.textContent = texto;
    mensaje.className = ""; // Resetear clases
    mensaje.classList.add(tipo); // Agregar clase correspondiente (success o error)
    mensaje.classList.remove("hidden");
}

// Función para alternar la visibilidad de las contraseñas
document.querySelectorAll('.toggle-password').forEach(icon => {
    icon.addEventListener('click', () => {
        const targetId = icon.getAttribute('data-target'); // ID del campo asociado
        const passwordField = document.getElementById(targetId);
        const passwordType = passwordField.getAttribute('type');

        // Alternar entre 'password' y 'text'
        if (passwordType === 'password') {
            passwordField.setAttribute('type', 'text');
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        } else {
            passwordField.setAttribute('type', 'password');
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        }
    });
});