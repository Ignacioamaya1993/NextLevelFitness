import app from "../scripts/firebaseConfig.js"; // Importa la instancia de Firebase desde firebaseConfig.js
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
            
            // Referencia al documento del usuario dentro de la colección 'usuarios'
            const userDoc = doc(db, "usuarios", user.uid);
            const docSnap = await getDoc(userDoc);

            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log("Datos del documento:", data); // Verifica los datos
            
                // Mostrar el nombre completo
                const fullNameField = document.getElementById("full-name");
                const fullName = `${data.nombre || ""} ${data.apellido || ""}`.trim();
                fullNameField.textContent = fullName || "No especificado";
            
                // Verifica si el campo 'peso' está presente
                if (data.peso !== undefined) {
                    weightField.textContent = data.peso || "No especificado";
                } else {
                    weightField.textContent = "No especificado"; // Si no hay campo 'peso'
                }
            
                // Calcular y mostrar la edad
                const ageField = document.getElementById("age");
                if (data.fechaDeNacimiento) {
                    const birthDate = new Date(data.fechaDeNacimiento);
                    const age = new Date().getFullYear() - birthDate.getFullYear();
                    const monthDiff = new Date().getMonth() - birthDate.getMonth();
            
                    // Ajustar la edad si aún no ha cumplido años este año
                    const adjustedAge =
                        monthDiff < 0 || (monthDiff === 0 && new Date().getDate() < birthDate.getDate())
                            ? age - 1
                            : age;
                    ageField.textContent = adjustedAge;
                } else {
                    ageField.textContent = "No especificada";
                }
            } else {
                weightField.textContent = "No especificado"; // Si el documento no existe
                document.getElementById("full-name").textContent = "No especificado";
                document.getElementById("age").textContent = "No especificada";
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

                        // La redirección se manejará automáticamente desde el mensaje
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
        const newWeight = parseFloat(document.getElementById("new-weight").value);
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
                cancelButtonText: 'Cancelar',
                preConfirm: async (password) => {   
                    if (!password) {
                        throw new Error("La reautenticación fue cancelada.");
                    }

            // Reautenticación con la contraseña proporcionada
            const credential = EmailAuthProvider.credential(user.email, password);
            await reauthenticateWithCredential(user, credential);
    
            // Intentar actualizar el correo si el nuevo correo está definido
            if (newEmail) {
                try {
                    console.log("Intentando actualizar el correo...");
            
                    // Enviar correo de verificación al nuevo correo
                    await updateEmail(user, newEmail); // Cambiar correo aquí

                    // Mostrar el SweetAlert2 para enviar verificación
                    const result = await Swal.fire({
                        title: 'Correo actualizado',
                        text: "Ahora enviaremos un correo de verificación al nuevo correo. ¿Deseas enviarlo?",
                        icon: 'info',
                        showCancelButton: true,
                        confirmButtonText: 'Enviar Verificación',
                        cancelButtonText: 'Cancelar',
                    });

                    if (result.isConfirmed) {
                    // Enviar correo de verificación al nuevo correo
                    await user.sendEmailVerification();            
                    // Notificar al usuario que debe verificar el nuevo correo
                    Swal.fire("Correo de verificación enviado", "Por favor, revisa tu bandeja de entrada y verifica el nuevo correo antes de continuar.", "info");
                }
            } catch (error) {
                console.error("Error al actualizar el correo:", error);
                if (error.code === "auth/email-already-in-use") {
                    Swal.fire("Error", "El nuevo correo electrónico ya está siendo usado por otra cuenta.", "error");
                } else if (error.code === "auth/requires-recent-login") {
                    Swal.fire("Error", "Debes volver a iniciar sesión para realizar este cambio.", "error");
                } else {
                    Swal.fire("Error", "Ocurrió un error desconocido. Por favor, inténtalo de nuevo.", "error");
                }
            }
        }
    }
}).then((result) => result.value);

    if (!password) throw new Error("La reautenticación fue cancelada.");

            if (newPassword) {
                console.log("Nuevo password:", newPassword);
                await updatePassword(user, newPassword);
                await Swal.fire('Éxito', 'Contraseña actualizada correctamente', 'success');
                window.location.reload(); // Recargar la página

            }
    
            if (newWeight) {
                console.log("Nuevo peso:", newWeight);
                const userDoc = doc(db, "usuarios", user.uid);
                await setDoc(userDoc, { peso: parseFloat(newWeight) }, { merge: true });
                await Swal.fire('Éxito', 'Peso actualizado correctamente', 'success');
                window.location.reload(); // Recargar la página

            }
    
        } catch (error) {
            console.error("Error al actualizar datos:", error);
        
            // Verifica el código del error de Firebase
            let errorMessage = "Ocurrió un error desconocido. Por favor, inténtalo de nuevo.";
        
            if (error.code === "auth/invalid-credential") {
                errorMessage = "Contraseña incorrecta. Por favor, verifica tu contraseña e intenta nuevamente.";
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