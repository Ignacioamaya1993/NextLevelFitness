const adminEmail = "soutrelleagustin64@gmail.com"; // Correo del administrador
const adminPassword = "adminasoutrelle";  // Contraseña del administrador

document.getElementById("admin-login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const email = document.getElementById("admin-email").value;
    const password = document.getElementById("admin-password").value;

    try {
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        if (user.email === adminEmail) {
            window.location.href = "panel-admin.html"; // Redirige al panel de administración
        } else {
            document.getElementById("login-error").innerText = "Acceso denegado. No eres administrador.";
            firebase.auth().signOut(); // Cierra sesión si no es admin
        }
    } catch (error) {
        document.getElementById("login-error").innerText = "Error al iniciar sesión: " + error.message;
    }
});
