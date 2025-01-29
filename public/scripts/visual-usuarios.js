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

//funcion para eliminar usuario
async function eliminarUsuario(uid) {
    if (confirm("¿Estás seguro de que quieres eliminar este usuario?")) {
        try {
            await deleteDoc(doc(db, "usuarios", uid));
            alert("Usuario eliminado correctamente.");
            cargarUsuarios();
        } catch (error) {
            console.error("Error al eliminar usuario:", error);
            alert("Error al eliminar usuario.");
        }
    }
}

//funcion para inhabilitar usuario
async function inhabilitarUsuario(uid) {
    try {
        await updateDoc(doc(db, "usuarios", uid), { inhabilitado: true });
        alert("Usuario inhabilitado correctamente.");
        cargarUsuarios();
    } catch (error) {
        console.error("Error al inhabilitar usuario:", error);
        alert("Error al inhabilitar usuario.");
    }
}

function verRutina(uid) {
    window.location.href = `rutina.html?uid=${uid}`;
}

// Función para formatear la fecha en formato DD/MM/YYYY
function formatearFecha(fecha) {
    const [year, month, day] = fecha.split("-").map(Number);
    return `${day < 10 ? '0' + day : day}/${month < 10 ? '0' + month : month}/${year}`;
}

// Función para cargar usuarios si el usuario está autenticado
async function cargarUsuarios() {
    const auth = getAuth(app); // Usa la instancia de auth que depende de la app
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("Usuario autenticado:", user.email); // Log del usuario autenticado

            try {
                const usuariosSnapshot = await getDocs(collection(db, "usuarios"));
                
                if (usuariosSnapshot.empty) {
                    usuariosContainer.innerHTML = "<p>No hay usuarios registrados.</p>";
                    return;
                }

                let html = "";
                usuariosSnapshot.forEach(doc => {
                    const userData = doc.data();
                    const uid = docSnap.id;
                    const nombre = userData.nombre || "Sin nombre";
                    const apellido = userData.apellido || "Sin apellido";
                    const email = userData.email || "No disponible";
                    const celular = userData.celular || "No disponible";
                    const fechaNacimiento = userData.fechaNacimiento || "No disponible";
                    const genero = userData.genero || "No disponible";
                    const inhabilitado = userData.inhabilitado ? "Sí" : "No";

                    
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
                            <div class="usuario-card" id="usuario-${uid}">
                            <h2>${nombre} ${apellido}</h2>
                            <p><strong>Email:</strong> ${email}</p>
                            <p><strong>Celular:</strong> ${celular}</p>
                            <p><strong>Fecha de nacimiento:</strong> ${fechaFormateada}</p>
                            <p><strong>Edad:</strong> ${edad}</p>
                            <p><strong>Género:</strong> ${genero}</p>
                            <p><strong>Inhabilitado:</strong> ${inhabilitado}</p>
                            <button onclick="eliminarUsuario('${uid}')">Eliminar</button>
                            <button onclick="inhabilitarUsuario('${uid}')">Inhabilitar</button>
                            <button onclick="verRutina('${uid}')">Ver Rutina</button>
                        </div>
                    `;
                });

                usuariosContainer.innerHTML = html;

                // Asignar eventos a los botones después de renderizar el HTML
                document.querySelectorAll(".btn-eliminar").forEach(button => {
                    button.addEventListener("click", () => eliminarUsuario(button.dataset.uid));
                });

                document.querySelectorAll(".btn-inhabilitar").forEach(button => {
                    button.addEventListener("click", () => inhabilitarUsuario(button.dataset.uid));
                });

                document.querySelectorAll(".btn-ver-rutina").forEach(button => {
                    button.addEventListener("click", () => {
                        window.location.href = `rutina.html?uid=${button.dataset.uid}`;
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

// Cargar usuarios al cargar la página
cargarUsuarios();