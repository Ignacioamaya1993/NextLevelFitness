// Selección de elementos del formulario
const registroForm = document.getElementById("registro-form");
const mensaje = document.getElementById("mensaje");

// Manejar el envío del formulario
registroForm.addEventListener("submit", (event) => {
    event.preventDefault(); // Evita que se recargue la página
    
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

    // Crear un nuevo usuario
    const nuevoUsuario = {
        nombre,
        apellido,
        edad,
        genero,
        peso,
        email,
        password
    };

    // Guardar en localStorage por ahora (simulación)
    guardarUsuario(nuevoUsuario);

    // Mostrar mensaje de éxito y reiniciar formulario
    mostrarMensaje("Registro exitoso. ¡Ahora puedes iniciar sesión!", "success");
    registroForm.reset();
});

// Función para guardar usuarios en localStorage
function guardarUsuario(usuario) {
    let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
    usuarios.push(usuario);
    localStorage.setItem("usuarios", JSON.stringify(usuarios));
}

// Función para mostrar mensajes de error o éxito
function mostrarMensaje(texto, tipo) {
    mensaje.textContent = texto;
    mensaje.className = ""; // Resetear clases
    mensaje.classList.add(tipo); // Agregar clase correspondiente (success o error)
    mensaje.classList.remove("hidden");
}