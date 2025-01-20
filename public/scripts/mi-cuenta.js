import app from "../scripts/firebaseConfig.js"; // Importa la instancia de Firebase desde firebaseConfig.js
import {
    getAuth,
    updateEmail,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    signOut
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
    const auth = getAuth(app);
    const db = getFirestore(app);

    const emailField = document.getElementById("email");
    const form = document.getElementById("update-form");

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            emailField.textContent = user.email;

            if (!user.emailVerified) {
                const verifyEmailButton = document.getElementById("verify-email-btn");
                verifyEmailButton.classList.remove("hidden");

                verifyEmailButton.addEventListener("click", async () => {
                    try {
                        await user.sendEmailVerification();
                        Swal.fire(
                            "Correo de Verificación Enviado",
                            "Revisa tu bandeja de entrada y sigue las instrucciones para verificar tu correo electrónico.",
                            "info"
                        );
                    } catch (error) {
                        Swal.fire(
                            "Error",
                            "No se pudo enviar el correo de verificación. Inténtalo más tarde.",
                            "error"
                        );
                    }
                });
            }

            const userDoc = doc(db, "usuarios", user.uid);
            const docSnap = await getDoc(userDoc);

            if (docSnap.exists()) {
                const data = docSnap.data();

                // Mostrar el nombre completo
                const fullNameField = document.getElementById("full-name");
                if (data.nombre && data.apellido) {
                    fullNameField.textContent = `${data.nombre} ${data.apellido}`;
                } else if (data.nombreCompleto) {
                    fullNameField.textContent = data.nombreCompleto;
                } else {
                    fullNameField.textContent = "No especificado";
                }

                // Mostrar la edad
                const ageField = document.getElementById("age");
                if (data.fechaNacimiento) {
                    const [year, month, day] = data.fechaNacimiento.split("-").map(Number);
                    const birthDate = new Date(year, month - 1, day);
                    const today = new Date();
                    let age = today.getFullYear() - birthDate.getFullYear();
                    if (
                        today.getMonth() < birthDate.getMonth() ||
                        (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())
                    ) {
                        age--;
                    }
                    ageField.textContent = age;
                } else {
                    ageField.textContent = "No especificada";
                }

                // Mostrar el celular
                const phoneField = document.getElementById("phone");
                phoneField.textContent = data.celular || "No especificado";
            }

            const logoutButton = document.getElementById("logout-btn");
            logoutButton.style.display = "block";
            logoutButton.addEventListener("click", async () => {
                const result = await Swal.fire({
                    title: "¿Estás seguro?",
                    text: "¡Cerrarás sesión y serás redirigido al login!",
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonText: "Sí, cerrar sesión",
                    cancelButtonText: "Cancelar",
                    reverseButtons: true,
                });

                if (result.isConfirmed) {
                    await signOut(auth);
                    await Swal.fire({
                        title: "Sesión cerrada",
                        text: "Has cerrado sesión exitosamente. Serás redirigido al login.",
                        icon: "success",
                        confirmButtonText: "OK",
                    });
                    window.location.href = "login.html";
                }
            });
        } else {
            window.location.href = "login.html";
        }
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const newEmail = document.getElementById("new-email").value;
        const newPassword = document.getElementById("new-password").value;
        const newPhone = document.getElementById("new-phone").value;

        const user = auth.currentUser;

        try {
            // Validar si el correo ingresado es diferente al actual
            if (newEmail && newEmail === user.email) {
                throw new Error("El correo nuevo debe ser diferente al actual.");
            }

            // Solicitar la contraseña para reautenticarse
            const password = await Swal.fire({
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
                preConfirm: async (password) => {
                    if (!password) throw new Error("La reautenticación fue cancelada.");

                    const credential = EmailAuthProvider.credential(user.email, password);
                    await reauthenticateWithCredential(user, credential);
                },
            }).then((result) => result.value);

            if (!password) throw new Error("La reautenticación fue cancelada.");

            if (newEmail) {
                try {
                    // Cambiar el correo y enviar correo de verificación
                    await updateEmail(user, newEmail);

                    // Enviar correo de verificación al nuevo correo
                    await user.sendEmailVerification();
                    await Swal.fire("Correo de verificación enviado", "Revisa tu bandeja de entrada y verifica tu nuevo correo.", "info");

                    // Recargar la página después de que el correo haya sido verificado
                    window.location.reload();
                } catch (error) {
                    if (error.code === "auth/email-already-in-use") {
                        throw new Error("El nuevo correo ya está en uso.");
                    }
                    if (error.code === "auth/operation-not-allowed") {
                        throw new Error("Este método no está habilitado en Firebase.");
                    }
                    throw error;
                }
            }

            if (newPhone) {
                const userDocRef = doc(db, "usuarios", user.uid);
                await setDoc(userDocRef, { celular: newPhone }, { merge: true });
                await Swal.fire("Éxito", "Número de celular actualizado correctamente", "success");

                // Recargar la página
                window.location.reload();
            }

            if (newPassword) {
                await updatePassword(user, newPassword);
                await Swal.fire("Éxito", "Contraseña actualizada correctamente", "success");

                // Recargar la página
                window.location.reload();
            }
        } catch (error) {
            let errorMessage = error.message || "Ocurrió un error desconocido. Por favor, inténtalo de nuevo.";
            if (error.code === "auth/invalid-credential") {
                errorMessage = "Contraseña incorrecta. Verifica tu contraseña.";
            } else if (error.code === "auth/email-already-in-use") {
                errorMessage = "El correo ya está en uso.";
            } else if (error.code === "auth/weak-password") {
                errorMessage = "La contraseña es demasiado débil.";
            } else if (error.code === "auth/requires-recent-login") {
                errorMessage = "Debes volver a iniciar sesión.";
            }

            await Swal.fire("Error", errorMessage, "error");
        }
    });
});