import app from "../scripts/firebaseConfig.js"; 
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11';

const auth = getAuth(app);
const db = getFirestore(app);

document.getElementById("admin-login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const email = document.getElementById("admin-email").value.trim();
    const password = document.getElementById("admin-password").value.trim();

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Verificar el acceso usando Firestore (las reglas de seguridad validan si es admin)
        const userDoc = await getDoc(doc(db, "usuarios", user.uid)); // Obtener el documento del usuario

        if (userDoc.exists()) {
            // El usuario tiene acceso basado en las reglas de seguridad
            window.location.href = "panel-admin.html";
        } else {
            // En caso de no encontrar el usuario o si las reglas de seguridad lo bloquean
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