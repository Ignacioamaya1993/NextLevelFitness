firebase.auth().onAuthStateChanged((user) => {
    if (!user || user.email !== "admin@tudominio.com") {
        window.location.href = "login-admin.html"; // Redirige si no es administrador
    }
});

// Cerrar sesión
document.getElementById("logout").addEventListener("click", () => {
    firebase.auth().signOut().then(() => {
        window.location.href = "login-admin.html";
    });
});
