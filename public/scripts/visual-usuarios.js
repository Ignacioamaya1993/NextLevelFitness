import app, { db } from "../scripts/firebaseConfig.js";
import { getAuth, onAuthStateChanged, deleteUser } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
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
    try {
        // Obtener el usuario actualmente autenticado
        const user = await auth.getUser(userId);  // Aquí no es necesario, ya que userId debería ser el uid

        // Deshabilitar la cuenta del usuario en Firebase Authentication
        await auth.updateUser(user.uid, { disabled: true });
        console.log(`Usuario con ID ${userId} deshabilitado exitosamente.`);

        alert("El usuario ha sido deshabilitado y no podrá iniciar sesión.");
    } catch (error) {
        console.error("Error al inhabilitar el usuario:", error);
        alert("Hubo un error al inhabilitar el usuario.");
    }
}

// Funcion para eliminar completamente al usuario
async function eliminarUsuario(userId) {
    const auth = getAuth();
    try {
        // Obtener el usuario actualmente autenticado
        const user = await auth.getUser(userId);  // Aquí no es necesario, ya que userId debería ser el uid
        
        // Eliminar la cuenta del usuario
        await deleteUser(user);
        console.log(`Usuario con ID ${userId} eliminado de Firebase Authentication.`);

        // Eliminar el documento del usuario en Firestore
        await deleteDoc(doc(db, "usuarios", userId));
        console.log(`Documento de usuario con ID ${userId} eliminado de Firestore.`);

        alert("El usuario ha sido completamente eliminado.");
    } catch (error) {
        console.error("Error al eliminar el usuario:", error);
        alert("Hubo un error al eliminar el usuario.");
    }
}

// Cargar usuarios al cargar la página
cargarUsuarios();