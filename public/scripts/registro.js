import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";  // Asegúrate de importar esta función
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

// Tu configuración de Firebase
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
const app = initializeApp(firebaseConfig);  // Asegúrate de inicializar Firebase
const auth = getAuth(app);
const db = getFirestore(app);


// Selección de elementos del formulario
const registroForm = document.getElementById("registro-form");
const mensaje = document.getElementById("mensaje");

// Manejar el envío del formulario
registroForm.addEventListener("submit", async (event) => {
    event.preventDefault(); // Evita que se recargue la página

    console.log("Formulario de registro enviado");  // Verificar si el formulario se está enviando


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
        // Registrar el usuario con correo y contraseña en Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        console.log("Usuario registrado:", user);  // Verificar que el usuario se haya registrado correctamente


        // Crear un nuevo usuario en la colección "usuarios" de Firestore
        const nuevoUsuario = {
            uid: user.uid,
            nombre,
            apellido,
            edad,
            genero,
            peso,
            email
        };

        // Guardar el nuevo usuario en Firestore
        await addDoc(collection(db, "usuarios"), nuevoUsuario);

        // Mostrar mensaje de éxito
        mostrarMensaje("Registro exitoso. ¡Ahora puedes iniciar sesión!", "success");

        // Reiniciar el formulario
        registroForm.reset();

    } catch (error) {
        console.error("Error al registrar al usuario:", error);
        mostrarMensaje("Hubo un problema al registrar al usuario. Intenta nuevamente.", "error");
    }
});

// Función para mostrar mensajes de error o éxito
function mostrarMensaje(texto, tipo) {
    mensaje.textContent = texto;
    mensaje.className = ""; // Resetear clases
    mensaje.classList.add(tipo); // Agregar clase correspondiente (success o error)
    mensaje.classList.remove("hidden");
}
