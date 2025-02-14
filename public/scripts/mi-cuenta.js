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
                    customClass: {
                        popup: "custom-popup",
                        title: "custom-title",
                        content: "custom-content",
                    }
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
            await Swal.fire({
                title: "Error",
                text: "No se encontró el usuario en la base de datos.",
                icon: "error",
                customClass: {
                    popup: "custom-popup",
                    title: "custom-title",
                    content: "custom-content",
                }
            });
            return;
        }        

        const userData = docSnap.data();

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
            customClass: {
                popup: "custom-popup",
            }
        });

        if (!password) {
            await Swal.fire({
                title: "Error",
                text: "No se proporcionó la contraseña actual.",
                icon: "error",
                customClass: {
                    popup: "custom-popup",
                    title: "custom-title",
                    content: "custom-content",
                }
            });
            return;
        }                

        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);

        // Validación: La nueva contraseña no debe ser igual a la actual
        if (newPassword === password) {
            await Swal.fire({
                title: "Error",
                text: "La nueva contraseña no puede ser igual a la actual.",
                icon: "warning",
                customClass: {
                    popup: "custom-popup",
                    title: "custom-title",
                    content: "custom-content",
                }
            });
            return;
        }

        await updatePassword(user, newPassword);
        await Swal.fire({
            title: "Contraseña actualizada correctamente",
            text: "Se cerrará sesión.",
            icon: "success",
            customClass: {
                popup: "custom-popup",
                title: "custom-title",
                content: "custom-content",
            }
        });

        await signOut(auth);
        window.location.href = "login.html";

    } catch (error) {
        let errorMessage = error.message || "Ocurrió un error. Inténtalo de nuevo.";
        if (error.code === "auth/wrong-password") {
            errorMessage = "La contraseña actual es incorrecta.";
        } else if (error.code === "auth/requires-recent-login") {
            errorMessage = "Debes volver a iniciar sesión para realizar esta acción.";
        }

        await Swal.fire({
            title: "Error",
            text: errorMessage,
            icon: "error",
            customClass: {
                popup: "custom-popup",
                title: "custom-title",
                content: "custom-content",
            }
        });
    }
}

// Validación para el número de celular
if (newPhone && newPhone === userData.celular) { 
    await Swal.fire({
        title: "Error",
        text: "El número de celular es el mismo que el actual.",
        icon: "warning",
        customClass: {
            popup: "custom-popup", // Aplica la clase CSS
            title: "custom-title", // Aplica la clase al título
            htmlContainer: "custom-text" // Aplica la clase al texto
        }
    });
    return; // Detiene la ejecución si el número es el mismo
}

// Actualizar número de celular
if (newPhone && newPhone.trim() !== "") { 
    if (newPhone.length < 10) {
        await Swal.fire({
            title: "Error",
            text: "El número de celular debe tener al menos 10 dígitos.",
            icon: "error",
            customClass: {
                popup: "custom-popup",
                title: "custom-title",
                content: "custom-content",
            }
        });
        return; // Detiene la ejecución si el número es inválido
    }
    
    const userDocRef = doc(db, "usuarios", user.uid);
    await setDoc(userDocRef, { celular: newPhone }, { merge: true });

    await Swal.fire({
        title: "Éxito",
        text: "Número de celular actualizado correctamente",
        icon: "success",
        customClass: {
            popup: "custom-popup",
            title: "custom-title",
            content: "custom-content",
        }
    });

    window.location.reload();
}

    });
});