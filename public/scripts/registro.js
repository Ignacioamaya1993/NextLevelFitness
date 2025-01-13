import app from './firebaseConfig.js';
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import { sendEmailVerification } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";


const auth = getAuth(app);
const db = getFirestore(app);

// Selección de elementos del formulario
const registroForm = document.getElementById("registro-form");
const mensaje = document.getElementById("mensaje");

// Manejar el envío del formulario
registroForm.addEventListener("submit", async (event) => {
    event.preventDefault(); // Evita que se recargue la página
    console.log("Formulario de registro enviado");

    // Obtener los valores de los campos
    const nombre = document.getElementById("nombre").value.trim();
    const apellido = document.getElementById("apellido").value.trim();
    const edad = parseInt(document.getElementById("edad").value.trim(), 10);
    const genero = document.getElementById("genero").value;
    const peso = parseFloat(document.getElementById("peso").value.trim());
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmarPassword = document.getElementById("confirmar-password").value;

    // Validaciones básicas
    if (!nombre || !apellido || !edad || !genero || !peso || !email || !password || !confirmarPassword) {
        mostrarMensaje("Por favor, completa todos los campos.", "error");
        return;
    }

    if (password !== confirmarPassword) {
        mostrarMensaje("Las contraseñas no coinciden.", "error");
        return;
    }

    try {
        // Registrar el usuario con Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Verificar si userCredential contiene un objeto válido
    if (!userCredential || !userCredential.user) {
        throw new Error("Error al registrar el usuario: Credenciales inválidas.");
    }

    const user = userCredential.user; // Obtener el usuario registrado
    console.log("Usuario registrado exitosamente:", user);

    // Intentar enviar el correo de verificación
    await sendEmailVerification(user);
    console.log("Correo de verificación enviado a:", user.email);

    // Mostrar mensaje indicando que el correo de verificación fue enviado
    mostrarMensaje("Registro exitoso. Verifica tu correo antes de iniciar sesión.", "success");

        // Crear un nuevo usuario en Firestore
        const nuevoUsuario = {
            uid: user.uid,
            nombre,
            apellido,
            edad,
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