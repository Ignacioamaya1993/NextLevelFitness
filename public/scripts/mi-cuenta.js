import app from "./firebaseconfig.js"; // Ajusta la ruta según tu estructura
import { getAuth, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
    const auth = getAuth(app); // Usa la instancia de Firebase ya inicializada
    const db = getFirestore(app);

    const emailField = document.getElementById("email");
    const weightField = document.getElementById("weight");
    const form = document.getElementById("update-form");

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            emailField.textContent = user.email;

            if (!user.emailVerified) {
                const verifyEmailButton = document.getElementById("verify-email-btn");
                verifyEmailButton.style.display = "block";
            
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
            
            // Referencia al documento del usuario dentro de la colección 'usuarios'
            const userDoc = doc(db, "usuarios", user.uid);
            const docSnap = await getDoc(userDoc);

            if (docSnap.exists()) {
                const data = docSnap.data();
                // Muestra el peso desde Firestore
                weightField.textContent = data.peso || "No especificado";
            } else {
                // Crear documento en caso de no existir (muy raro si ya están los datos)
                await setDoc(userDoc, { peso: 0 });
            }

            // Mostrar el botón de logout
            const logoutButton = document.getElementById("logout-btn");
            logoutButton.style.display = "block";
            logoutButton.addEventListener("click", async () => {
                // Mostrar el SweetAlert2 de confirmación de cierre de sesión
                const result = await Swal.fire({
                    title: '¿Estás seguro?',
                    text: "¡Cerrarás sesión y serás redirigido al login!",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, cerrar sesión',
                    cancelButtonText: 'Cancelar',
                    reverseButtons: true
                });

                // Si el usuario confirma el cierre de sesión
                if (result.isConfirmed) {
                    try {
                        await signOut(auth);
                        // Muestra el SweetAlert2 de éxito con un botón "OK"
                        await Swal.fire({
                            title: 'Sesión cerrada',
                            text: 'Has cerrado sesión exitosamente. Serás redirigido al login.',
                            icon: 'success',
                            confirmButtonText: 'OK'
                        });

                        // Redirige al login
                        window.location.href = "login.html"; 
                    } catch (error) {
                        console.error("Error al cerrar sesión:", error);
                        Swal.fire("Error", "No se pudo cerrar sesión. Intenta de nuevo.", "error");
                    }
                }
            });

        } else {
            // Redirige al login si no hay usuario autenticado
            window.location.href = "login.html";
        }
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const newEmail = document.getElementById("new-email").value;
        const newWeight = document.getElementById("new-weight").value;
        const newPassword = document.getElementById("new-password").value;
    
        const user = auth.currentUser;
    
        try {
            // Reautenticación si es necesario
            const password = await Swal.fire({
                title: 'Confirmar cambios',
                input: 'password',
                inputLabel: 'Ingrese su contraseña actual',
                inputPlaceholder: 'Contraseña',
                inputAttributes: {
                    autocapitalize: 'off',
                    autocorrect: 'off'
                },
                showCancelButton: true,
                confirmButtonText: 'Confirmar',
                cancelButtonText: 'Cancelar'
            }).then((result) => result.value); // Obtiene el valor ingresado
    
            if (!password) throw new Error("La reautenticación fue cancelada.");
    
            const credential = EmailAuthProvider.credential(user.email, password);
            await reauthenticateWithCredential(user, credential);
    
            if (newEmail) {
                // Verifica si el email actual está verificado
                console.log("Correo actual verificado:", user.emailVerified);

                if (!user.emailVerified) {
                    await Swal.fire(
                        "Error",
                        "Debes verificar tu correo electrónico actual antes de poder cambiarlo. Revisa tu bandeja de entrada.",
                        "error"
                    );
                } else {
                    // Verifica que el nuevo correo no esté vacío
                    console.log("Nuevo correo:", newEmail);
                    if (!newEmail || newEmail === user.email) {
                        console.error("El nuevo correo no es válido o no ha cambiado.");
                        throw new Error("El nuevo correo no es válido o no ha cambiado.");
                    }

                    // Intenta actualizar el email
                    try {
                        console.log("Intentando actualizar el correo...");
                        await updateEmail(user, newEmail);
                        
                        // Enviar correo de verificación al nuevo email
                        await user.sendEmailVerification();
                        console.log("Correo actualizado, se envió correo de verificación.");
                        Swal.fire("Éxito", "Email actualizado correctamente. Revisa tu bandeja de entrada para verificar el nuevo correo.", "success");
                    } catch (error) {
                        console.error("Error al actualizar el correo:", error);
                        if (error.code === "auth/email-already-in-use") {
                            Swal.fire(
                                "Error",
                                "El nuevo correo electrónico ya está siendo usado por otra cuenta.",
                                "error"
                            );
                        } else if (error.code === "auth/requires-recent-login") {
                            Swal.fire(
                                "Error",
                                "Debes volver a iniciar sesión para realizar este cambio.",
                                "error"
                            );
                        } else {
                            Swal.fire(
                                "Error",
                                "Ocurrió un error desconocido. Por favor, inténtalo de nuevo.",
                                "error"
                            );
                        }
                    }
                }
            }

            if (newPassword) {
                console.log("Nuevo password:", newPassword);
                await updatePassword(user, newPassword);
                await Swal.fire('Éxito', 'Contraseña actualizada correctamente', 'success');
            }
    
            if (newWeight) {
                console.log("Nuevo peso:", newWeight);
                const userDoc = doc(db, "usuarios", user.uid);
                await setDoc(userDoc, { peso: parseFloat(newWeight) }, { merge: true });
                await Swal.fire('Éxito', 'Peso actualizado correctamente', 'success');
            }
    
        } catch (error) {
            console.error("Error al actualizar datos:", error);
        
            // Verifica el código del error de Firebase
            let errorMessage = "Ocurrió un error desconocido. Por favor, inténtalo de nuevo.";
        
            if (error.code === "auth/invalid-credential") {
                errorMessage = "Contraseña incorrecta. Por favor, verifica tus credenciales.";
            } else if (error.code === "auth/email-already-in-use") {
                errorMessage = "El email ya está siendo usado por otra cuenta.";
            } else if (error.code === "auth/weak-password") {
                errorMessage = "La contraseña es demasiado débil. Usa una más segura.";
            } else if (error.code === "auth/requires-recent-login") {
                errorMessage = "Debes volver a iniciar sesión para realizar este cambio.";
            }
        
            // Muestra el mensaje personalizado con SweetAlert2
            await Swal.fire('Error', errorMessage, 'error');
        }
    });
});