document.addEventListener("DOMContentLoaded", () => {
    const user = JSON.parse(localStorage.getItem("currentUser"));
    const restrictedMessage = document.getElementById("restricted-message");
    const routineBuilder = document.getElementById("routine-builder");

    if (user && user.isLoggedIn) {
        // Mostrar la sección de creación de rutinas
        restrictedMessage.classList.add("hidden");
        routineBuilder.classList.remove("hidden");
    } else {
        // Mostrar mensaje restrictivo
        restrictedMessage.classList.remove("hidden");
        routineBuilder.classList.add("hidden");
    }
});
