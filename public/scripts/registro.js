import app from "../scripts/firebaseConfig.js"; // Importa la instancia de Firebase desde firebaseConfig.js
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import { sendEmailVerification } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { signOut } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

// Selección de elementos del formulario
const registroForm = document.getElementById("registro-form");

// Modificar el HTML de los campos del formulario para incluir el asterisco rojo
const formularioCampos = [
    { id: "nombre", label: "Nombre" },
    { id: "apellido", label: "Apellido" },
    { id: "fecha-nacimiento", label: "Fecha de Nacimiento" },
    { id: "genero", label: "Género" },
    { id: "celular", label: "Celular" },
    { id: "email", label: "Correo Electrónico" },
    { id: "password", label: "Contraseña" },
    { id: "confirmar-password", label: "Confirmar Contraseña" }
];

// Modificar el formulario agregando el * rojo
formularioCampos.forEach(campo => {
    const label = document.querySelector(`label[for="${campo.id}"]`);
    if (label) {
        const span = document.createElement("span");
        span.classList.add("required");
        span.textContent = "*";
        label.appendChild(span);
    }
});

const celularInput = document.getElementById("celular");

celularInput.addEventListener("input", (event) => {
    event.target.value = event.target.value.replace(/\D/g, ""); // Elimina cualquier caracter que no sea número
});

// Manejar el envío del formulario
registroForm.addEventListener("submit", async (event) => {
    event.preventDefault(); // Evita que se recargue la página
    console.log("Formulario de registro enviado");

    // Obtener los valores de los campos
    const nombre = document.getElementById("nombre").value.trim();
    const apellido = document.getElementById("apellido").value.trim();
    const fechaNacimiento = document.getElementById("fecha-nacimiento").value.trim();
    const genero = document.getElementById("genero").value;
    const celular = document.getElementById("celular").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmarPassword = document.getElementById("confirmar-password").value;

    // Validaciones básicas
    if (!nombre || !apellido || !fechaNacimiento || !genero || !celular || !email || !password || !confirmarPassword) {
        mostrarMensaje("Por favor, completa todos los campos.", "error");
        return;
    }

    if (password !== confirmarPassword) {
        mostrarMensaje("Las contraseñas no coinciden.", "error");
        return;
    }

    // Validar número de celular (Ejemplo: solo números y de 10 dígitos)
    if (!/^\d{10}$/.test(celular)) {
        mostrarMensaje("Por favor, ingresa un número de celular válido (10 dígitos).", "error");
        return;
    }

    try {
        // Registrar el usuario
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("Usuario registrado exitosamente:", user);
    
        // Mostrar mensaje de registro exitoso
        mostrarMensaje("Registro exitoso. Verifica tu correo antes de iniciar sesión.", "success");
    
        // Enviar correo de verificación
        await sendEmailVerification(user);
    
        // Guardar el usuario en Firestore usando su UID como ID del documento
        const nuevoUsuario = {
            uid: user.uid,
            nombre,
            apellido,
            fechaNacimiento,
            genero,
            celular,
            email,
            emailVerificado: user.emailVerified,
        };
    
        await setDoc(doc(db, "usuarios", user.uid), nuevoUsuario); // Usar el UID como ID del documento
        console.log("Usuario guardado en Firestore correctamente.");
    
        // Cerrar sesión después de registrar
        await signOut(auth);
        console.log("Usuario desconectado después del registro.");
        
        registroForm.reset();
    } catch (error) {
        console.error("Error al registrar al usuario:", error);
    
        // Manejo de errores
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
        } finally {
            // Volver a habilitar el botón y restaurar el texto
            registroButton.disabled = false;
            registroButton.textContent = "Registrarse";
        }
    });

// Función para mostrar mensajes de error o éxito con SweetAlert
function mostrarMensaje(texto, tipo) {
    Swal.fire({
        icon: tipo, // 'success' o 'error'
        title: tipo === 'success' ? 'Éxito' : 'Error',
        text: texto,
        confirmButtonText: 'Aceptar'
    });
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