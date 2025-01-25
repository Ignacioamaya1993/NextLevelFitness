import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword, signOut } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
    const auth = getAuth(); // Inicializar la autenticación
    const db = getFirestore(); // Inicializar Firestore

    const emailField = document.getElementById("email");
    const form = document.getElementById("update-form");
    const phoneInput = document.getElementById("new-phone");

    phoneInput.addEventListener("input", (event) => {
        event.target.value = event.target.value.replace(/\D/g, ""); 
    });

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            emailField.textContent = user.email;

            const userDoc = doc(db, "usuarios", user.uid);
            const docSnap = await getDoc(userDoc);

            if (docSnap.exists()) {
                const data = docSnap.data();
                document.getElementById("full-name").textContent = `${data.nombre || ""} ${data.apellido || ""}`.trim() || "No especificado";
                document.getElementById("age").textContent = data.fechaNacimiento || "No especificada";
                document.getElementById("phone").textContent = data.celular || "No especificado";

                if (data.fechaNacimiento) {
                    const [year, month, day] = data.fechaNacimiento.split("-").map(Number);
                    const birthDate = new Date(year, month - 1, day);
                    const today = new Date();
                    let age = today.getFullYear() - birthDate.getFullYear();
                    if (today.getMonth() < birthDate.getMonth() || 
                        (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) {
                        age--;
                    }
                    document.getElementById("age").textContent = age;
                }
            }

            const logoutButton = document.getElementById("logout-btn");
            logoutButton.style.display = "block";
            logoutButton.addEventListener("click", async () => {
                const result = await Swal.fire({
                    title: "¿Estás seguro?",
                    text: "Cerrarás sesión y serás redirigido al login.",
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonText: "Sí, cerrar sesión",
                    cancelButtonText: "Cancelar",
                    reverseButtons: true,
                });

                if (result.isConfirmed) {
                    await signOut(auth);
                    window.location.href = "login.html";
                }
            });
        } else {
            window.location.href = "login.html";
        }
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById("new-password").value;
        const newPhone = document.getElementById("new-phone").value;

        const user = auth.currentUser;
        const userDoc = doc(db, "usuarios", user.uid);
        const docSnap = await getDoc(userDoc);

        if (!docSnap.exists()) {
            await Swal.fire("Error", "No se encontró el usuario en la base de datos.", "error");
            return;
        }

        const userData = docSnap.data();

        // Validación para la contraseña
        if (newPassword && newPassword === userData.password) {
            await Swal.fire({
                title: "Error",
                text: "La nueva contraseña debe ser diferente a la actual.",
                icon: "warning",  // Cambiado para que el icono sea de advertencia (¡)
            });
            return;
        }

        // Actualizar contraseña
        if (newPassword) {
            try {
                const { value: password } = await Swal.fire({
                    title: "Confirmar cambios",
                    input: "password",
                    inputLabel: "Ingrese su contraseña actual",
                    inputPlaceholder: "Contraseña",
                    inputAttributes: {
                        autocapitalize: "off",
                        autocorrect: "off",
                    },
                    showCancelButton: true,
                    confirmButtonText: "Confirmar",
                    cancelButtonText: "Cancelar",
                });

                if (!password) {
                    throw new Error("No se proporcionó la contraseña actual.");
                }

                const credential = EmailAuthProvider.credential(user.email, password);
                await reauthenticateWithCredential(user, credential);

                if (newPassword === password) {
                    await Swal.fire({
                        title: "Error",
                        text: "La nueva contraseña no puede ser igual a la actual.",
                        icon: "warning",
                    });
                    return;
                }

                await updatePassword(user, newPassword);
                await Swal.fire("Contraseña actualizada correctamente", "Se cerrará sesión.", "success");
                await signOut(auth);
                window.location.href = "login.html";
            } catch (error) {
                let errorMessage = error.message || "Ocurrió un error. Inténtalo de nuevo.";
                if (error.code === "auth/wrong-password") {
                    errorMessage = "La contraseña actual es incorrecta.";
                } else if (error.code === "auth/requires-recent-login") {
                    errorMessage = "Debes volver a iniciar sesión para realizar esta acción.";
                }
                await Swal.fire("Error", errorMessage, "error");
            }
        }

        // Validación para el número de celular
        if (newPhone && newPhone === userData.celular) { 
            await Swal.fire({
                title: "Error",
                text: "El número de celular es el mismo que el actual.",
                icon: "warning",  // Cambiado para que el icono sea de advertencia (¡)
            });
            return; // Detiene la ejecución si el número es el mismo
        }

        // Actualizar número de celular
        if (newPhone && newPhone.trim() !== "") { 
            if (newPhone.length < 10) {
                await Swal.fire("Error", "El número de celular debe tener al menos 10 dígitos.", "error");
                return; // Detiene la ejecución si el número es inválido
            }
            const userDocRef = doc(db, "usuarios", user.uid);
            await setDoc(userDocRef, { celular: newPhone }, { merge: true });
            await Swal.fire("Éxito", "Número de celular actualizado correctamente", "success");
            window.location.reload();
        }
    });
});