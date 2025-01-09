document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault(); // Evita que el formulario recargue la página

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        try {
            // Cargar el archivo JSON con fetch
            const response = await fetch("../data/usuarios.json");
            if (!response.ok) {
                throw new Error("No se pudo cargar el archivo de usuarios.");
            }

            const users = await response.json();

            // Buscar si el email existe
            const user = users.find((u) => u.email === email);

            if (user) {
                // Si el email existe, verificar la contraseña
                if (user.password === password) {
                    // Guardar información del usuario en localStorage
                    const currentUser = {
                        isLoggedIn: true,
                        routines: user.routines,
                    };
                    localStorage.setItem("currentUser", JSON.stringify(currentUser));

                    // Redirigir al usuario a "Tus Rutinas"
                    window.location.href = "tus-rutinas.html";
                } else {
                    // Contraseña incorrecta
                    Swal.fire({
                        icon: "error",
                        title: "Contraseña incorrecta",
                        text: "Por favor, verifica tu contraseña e intenta nuevamente.",
                        confirmButtonColor: "#6f42c1",
                    });
                }
            } else {
                // Usuario no encontrado
                Swal.fire({
                    icon: "warning",
                    title: "Usuario no encontrado",
                    text: `No existe una cuenta registrada con el correo: ${email}`,
                    confirmButtonColor: "#6f42c1",
                });
            }
        } catch (error) {
            console.error("Error al cargar el archivo JSON:", error);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "Hubo un problema al procesar tu solicitud. Intenta nuevamente más tarde.",
                confirmButtonColor: "#6f42c1",
            });
        }
    });
});


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
