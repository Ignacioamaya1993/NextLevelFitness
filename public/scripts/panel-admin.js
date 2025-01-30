// Cerrar sesión
document.getElementById("logout").addEventListener("click", () => {
    firebase.auth().signOut().then(() => {
        window.location.href = "login-admin.html";
    });
});