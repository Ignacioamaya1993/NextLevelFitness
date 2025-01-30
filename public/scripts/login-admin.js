import app from "../scripts/firebaseConfig.js"; 
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

document.getElementById("admin-login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const email = document.getElementById("admin-email").value.trim();
    const password = document.getElementById("admin-password").value.trim();

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Verificar si el usuario tiene permisos de administrador a través de Firestore
        const userDoc = await getDoc(doc(db, "usuarios", user.uid)); // Asumiendo que cada usuario tiene un documento en "usuarios"
        
        if (userDoc.exists() && userDoc.data().isAdmin) {
            // Redirige al panel de administración si el usuario es admin
            window.location.href = "panel-admin.html";
        } else {
            // Muestra un mensaje de acceso denegado con SweetAlert
            await Swal.fire({
                icon: 'error',
                title: 'Acceso denegado',
                text: 'No eres administrador.',
            });
            await signOut(auth); // Cierra sesión si no es admin
        }
    } catch (error) {
        // Muestra el error de inicio de sesión con SweetAlert
        await Swal.fire({
            icon: 'error',
            title: 'Error al iniciar sesión',
            text: error.message,
        });
    }
});