import app, { db } from "../scripts/firebaseConfig.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { collection, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

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

// Función para cargar usuarios si el usuario está autenticado
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
                    const userId = doc.id;  // Obtenemos el ID del usuario
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

                    // Agregar los botones
                    html += `
                        <div class="usuario-card">
                            <h2>${nombre} ${apellido}</h2>
                            <p><strong>Email:</strong> ${email}</p>
                            <p><strong>Celular:</strong> ${celular}</p>
                            <p><strong>Fecha de nacimiento:</strong> ${fechaFormateada}</p>
                            <p><strong>Edad:</strong> ${edad}</p>
                            <p><strong>Género:</strong> ${genero}</p>
                            <div class="user-actions">
                                <button onclick="verRutinas('${userId}')">Ver Rutinas</button>
                                <button onclick="inhabilitarUsuario('${userId}')">Inhabilitar</button>
                                <button onclick="eliminarUsuario('${userId}')">Eliminar</button>
                            </div>
                        </div>
                    `;
                });

                usuariosContainer.innerHTML = html;
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
function verRutinas(userId) {
    window.location.href = `rutinas-usuario.html?userId=${userId}`;
}

// Función para inhabilitar un usuario (cambiar estado)
async function inhabilitarUsuario(userId) {
    try {
        const userRef = doc(db, "usuarios", userId);
        await updateDoc(userRef, { estado: "inhabilitado" });  // Cambiar el estado del usuario
        alert("El usuario ha sido inhabilitado.");
        cargarUsuarios();  // Recargar la lista de usuarios
    } catch (error) {
        console.error("Error al inhabilitar usuario:", error);
        alert("Hubo un error al inhabilitar al usuario.");
    }
}

// Función para eliminar un usuario
async function eliminarUsuario(userId) {
    const confirmacion = confirm("¿Estás seguro de que deseas eliminar este usuario?");
    if (confirmacion) {
        try {
            const userRef = doc(db, "usuarios", userId);
            await deleteDoc(userRef);  // Eliminar el usuario
            alert("El usuario ha sido eliminado.");
            cargarUsuarios();  // Recargar la lista de usuarios
        } catch (error) {
            console.error("Error al eliminar usuario:", error);
            alert("Hubo un error al eliminar al usuario.");
        }
    }
}

// Cargar usuarios al cargar la página
cargarUsuarios();