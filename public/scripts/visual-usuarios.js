import app, { db } from "../scripts/firebaseConfig.js";
import { getAuth, onAuthStateChanged, deleteUser, EmailAuthProvider, reauthenticateWithCredential, updateUser } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { collection, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

const usuariosContainer = document.getElementById("usuarios-container");

// Función para calcular la edad basada en la fecha de nacimiento
function calcularEdad(fechaNacimiento) {
    const [year, month, day] = fechaNacimiento.split("-").map(Number);
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    if (today.getMonth() < birthDate.getMonth() || 
        (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

// Función para formatear la fecha en formato DD/MM/YYYY
function formatearFecha(fecha) {
    const [year, month, day] = fecha.split("-").map(Number);
    return `${day < 10 ? '0' + day : day}/${month < 10 ? '0' + month : month}/${year}`;
}

// Función para cargar usuarios
async function cargarUsuarios() {
    const auth = getAuth(app);
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("Usuario autenticado:", user.email);

            try {
                const usuariosSnapshot = await getDocs(collection(db, "usuarios"));
                
                if (usuariosSnapshot.empty) {
                    usuariosContainer.innerHTML = "<p>No hay usuarios registrados.</p>";
                    return;
                }

                let html = "";
                usuariosSnapshot.forEach(doc => {
                    const userData = doc.data();
                    const userId = doc.id;  // Agregar el ID del usuario
                    const nombre = userData.nombre || "Sin nombre";
                    const apellido = userData.apellido || "Sin apellido";
                    const email = userData.email || "No disponible";
                    const celular = userData.celular || "No disponible";
                    const fechaNacimiento = userData.fechaNacimiento || "No disponible";
                    const genero = userData.genero || "No disponible";
                    
                    // Calcular edad si se tiene fecha de nacimiento
                    let edad = "No disponible";
                    if (fechaNacimiento !== "No disponible") {
                        edad = calcularEdad(fechaNacimiento);
                    }

                    // Formatear la fecha de nacimiento si está disponible
                    let fechaFormateada = "No disponible";
                    if (fechaNacimiento !== "No disponible") {
                        fechaFormateada = formatearFecha(fechaNacimiento);
                    }

                    html += `
                        <div class="usuario-card">
                            <h2>${nombre} ${apellido}</h2>
                            <p><strong>Email:</strong> ${email}</p>
                            <p><strong>Celular:</strong> ${celular}</p>
                            <p><strong>Fecha de nacimiento:</strong> ${fechaFormateada}</p>
                            <p><strong>Edad:</strong> ${edad}</p>
                            <p><strong>Género:</strong> ${genero}</p>

                            <button class="delete-btn" data-user-id="${userId}">Eliminar</button>
                            <button class="disable-btn" data-user-id="${userId}">Inhabilitar</button>
                            <button class="view-rutinas-btn" data-user-id="${userId}">Ver Rutinas</button>
                        </div>
                    `;
                });

                usuariosContainer.innerHTML = html;

                // Agregar eventos a los botones después de cargar los usuarios
                const eliminarButtons = document.querySelectorAll('.delete-btn');
                eliminarButtons.forEach(button => {
                    button.addEventListener('click', function() {
                        const userId = button.dataset.userId;
                        eliminarUsuario(userId);  // Llamar a la función eliminarUsuario
                    });
                });

                const inhabilitarButtons = document.querySelectorAll('.disable-btn');
                inhabilitarButtons.forEach(button => {
                    button.addEventListener('click', function() {
                        const userId = button.dataset.userId;
                        inhabilitarUsuario(userId);  // Llamar a la función inhabilitarUsuario
                    });
                });

                const verRutinasButtons = document.querySelectorAll('.view-rutinas-btn');
                verRutinasButtons.forEach(button => {
                    button.addEventListener('click', function() {
                        const userId = button.dataset.userId;
                        verRutinasUsuario(userId);  // Llamar a la función verRutinasUsuario
                    });
                });

            } catch (error) {
                console.error("Error al cargar usuarios:", error);
                usuariosContainer.innerHTML = `<p style="color:red;">Error al obtener los usuarios.</p>`;
            }
        } else {
            usuariosContainer.innerHTML = `<p style="color:red;">Por favor, inicia sesión para ver los usuarios.</p>`;
        }
    });
}

// Función para ver rutinas (redirige a una nueva página con el ID del usuario)
function verRutinasUsuario(userId) {
    window.location.href = `rutinas-usuario.html?userId=${userId}`;
}

// Función para inhabilitar (desautorizar) al usuario
async function inhabilitarUsuario(userId) {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
        Swal.fire({
            title: 'Error',
            text: "No se encontró un usuario autenticado.",
            icon: 'error',
            confirmButtonText: 'Aceptar'
        });
        return;
    }

    try {
        // Pedir la contraseña al usuario para reautenticación
        const password = prompt('Introduce tu contraseña para continuar.');

        if (!password) {
            throw new Error("Debes ingresar una contraseña para continuar.");
        }

        // Crear las credenciales del usuario autenticado
        const credential = EmailAuthProvider.credential(user.email, password);

        // Reautenticar al usuario
        await reauthenticateWithCredential(auth.currentUser, credential);

        // Deshabilitar la cuenta del usuario en Firebase Authentication
        await updateUser(user.uid, { disabled: true });

        console.log(`Usuario con ID ${userId} inhabilitado exitosamente.`);

        Swal.fire({
            title: 'Usuario inhabilitado',
            text: "El usuario ha sido inhabilitado y no podrá iniciar sesión.",
            icon: 'success',
            confirmButtonText: 'Aceptar'
        });

    } catch (error) {
        console.error("Error al inhabilitar el usuario:", error);

        Swal.fire({
            title: 'Error',
            text: "Hubo un error al inhabilitar el usuario. Es posible que necesite reautenticarse.",
            icon: 'error',
            confirmButtonText: 'Aceptar'
        });
    }
}

import { getAuth, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";

// Función para eliminar un usuario
async function eliminarUsuario() {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
        Swal.fire({
            title: 'Error',
            text: "No se encontró un usuario autenticado.",
            icon: 'error',
            confirmButtonText: 'Aceptar'
        });
        return;
    }

    try {
        // Pedir la contraseña al usuario para reautenticación
        const password = prompt('Introduce tu contraseña para confirmar la eliminación.');

        if (!password) {
            throw new Error("Debes ingresar una contraseña para continuar.");
        }

        // Crear las credenciales del usuario autenticado
        const credential = EmailAuthProvider.credential(user.email, password);

        // Reautenticar al usuario
        await reauthenticateWithCredential(auth.currentUser, credential);

        // Eliminar la cuenta del usuario
        await deleteUser(user);

        console.log(`Usuario ${user.email} eliminado exitosamente.`);

        Swal.fire({
            title: 'Usuario eliminado',
            text: "La cuenta ha sido eliminada permanentemente.",
            icon: 'success',
            confirmButtonText: 'Aceptar'
        });

    } catch (error) {
        console.error("Error al eliminar el usuario:", error);

        Swal.fire({
            title: 'Error',
            text: error.message.includes("auth/requires-recent-login")
                ? "Por seguridad, debes volver a iniciar sesión antes de eliminar la cuenta."
                : "Hubo un error al eliminar la cuenta.",
            icon: 'error',
            confirmButtonText: 'Aceptar'
        });
    }
}

// Cargar usuarios al cargar la página
cargarUsuarios();