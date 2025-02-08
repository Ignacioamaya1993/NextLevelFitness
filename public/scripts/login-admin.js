import app from "../scripts/firebaseConfig.js"; 
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Obtener el documento del usuario desde Firestore
        const userDocRef = doc(db, "usuarios", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();

            // Verifica si el usuario es admin según el campo `isAdmin` en Firestore
            if (userData.isAdmin) {
                // Redirige al panel de administración si es admin
                window.location.href = "panel-admin.html";
            } else {
                // Muestra el mensaje de acceso denegado con SweetAlert
                await Swal.fire({
                    icon: 'error',
                    title: 'Acceso denegado',
                    text: 'No eres administrador.',
                });
                await signOut(auth); // Cierra sesión si no es admin
            }
        } else {
            // Si no se encuentra el usuario en Firestore
            await Swal.fire({
                icon: 'error',
                title: 'Usuario no encontrado',
                text: 'El usuario no existe en la base de datos.',
            });
            await signOut(auth); // Cierra sesión si no existe
        }
    } catch (error) {
        console.error("Error al iniciar sesión:", error);

        let errorMessage = "Ocurrió un error desconocido. Por favor, inténtalo de nuevo.";

        switch (error.code) {
            case "auth/invalid-credential":
                errorMessage = "Las credenciales proporcionadas son incorrectas.";
                break;
            }
        
        // Muestra el error de inicio de sesión con SweetAlert
        Swal.fire({
            icon: "error",
            title: "Error al Iniciar Sesion",
            text: errorMessage,
            confirmButtonColor: "#6f42c1",
        });
    }
});

function togglePasswordVisibility() {
    const passwordInput = document.getElementById("password");
    const toggleIcon = document.querySelector(".toggle-password i");
    
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        toggleIcon.classList.replace("fa-eye-slash", "fa-eye");
    } else {
        passwordInput.type = "password";
        toggleIcon.classList.replace("fa-eye", "fa-eye-slash");
    }
}

window.togglePasswordVisibility = togglePasswordVisibility;