import app, { db } from "../scripts/firebaseConfig.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { collection, getDocs, doc, updateDoc, query, where, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

// Llamar a la función para cargar el usuario al iniciar
cargarUsuarios();

const usuariosContainer = document.getElementById("usuarios-container");
const searchInput = document.getElementById("search-input"); // Campo de búsqueda
const clearSearchButton = document.getElementById("clear-search"); // Botón de limpiar búsqueda

let usuarios = [];

// Función para obtener usuarios desde Firestore
async function obtenerUsuarios() {
    const usuariosRef = collection(db, "usuarios");
    const snapshot = await getDocs(usuariosRef);
    const usuarios = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
    mostrarUsuarios(usuarios);
}

async function cargarUsuarios() {
    const auth = getAuth(app);
    // Verificar si el usuario está autenticado
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            // Si no hay usuario autenticado, redirigir al login
            window.location.href = "login-admin.html";
            return;
        }

        // Usuario autenticado
        console.log("Usuario autenticado:", user.email);

        try {
            const usuariosSnapshot = await getDocs(collection(db, "usuarios"));

            if (usuariosSnapshot.empty) {
                usuariosContainer.innerHTML = "<p>No hay usuarios registrados.</p>";
                return;
            }

            usuarios = [];

            usuariosSnapshot.forEach(doc => {
                const userData = doc.data();
                const userId = doc.id;
                const nombre = userData.nombre || "Sin nombre";
                const apellido = userData.apellido || "Sin apellido";
                const email = userData.email || "No disponible";
                const celular = userData.celular || "No disponible";
                const fechaNacimiento = userData.fechaNacimiento || "No disponible";
                const genero = userData.genero || "No disponible";

                let edad = "No disponible";
                if (fechaNacimiento !== "No disponible") {
                    edad = calcularEdad(fechaNacimiento);
                }

                let fechaFormateada = "No disponible";
                if (fechaNacimiento !== "No disponible") {
                    fechaFormateada = formatearFecha(fechaNacimiento);
                }

                usuarios.push({
                    userId,
                    nombre,
                    apellido,
                    email,
                    celular,
                    fechaFormateada,
                    edad,
                    genero,
                    aprobado: userData.aprobado || false // Asegurar que 'aprobado' tenga un valor por defecto
                });
            });

            mostrarUsuarios(usuarios);

            searchInput.addEventListener("input", () => {
                const searchTerm = searchInput.value.toLowerCase();
                const filteredUsers = usuarios.filter(user =>
                    user.nombre.toLowerCase().includes(searchTerm) ||
                    user.apellido.toLowerCase().includes(searchTerm)
                );
                mostrarUsuarios(filteredUsers);
            });

        } catch (error) {
            console.error("Error al cargar usuarios:", error);
            usuariosContainer.innerHTML = `<p style="color:red;">Error al obtener los usuarios.</p>`;
        }
    });
}

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

// Función para mostrar usuarios
function mostrarUsuarios(users) {
    let html = "";
    users.forEach(user => {
        html += `
            <div class="usuario-card">
                <h2>${user.nombre} ${user.apellido}</h2>
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Celular:</strong> ${user.celular}</p>
                <p><strong>Fecha de nacimiento:</strong> ${user.fechaFormateada}</p>
                <p><strong>Edad:</strong> ${user.edad}</p>
                <p><strong>Género:</strong> ${user.genero}</p>
                <p><strong>Estado:</strong> ${user.aprobado ? "Aprobado" : "Pendiente"}</p>
                <button class="view-rutinas-btn" data-user-id="${user.userId}">Ver Rutinas</button>
                <button class="assign-rutina-btn" data-user-id="${user.userId}">Armar Rutina</button>
                <button class="transfer-rutina-btn" data-user-id="${user.userId}">Traspasar Rutina</button>
                <button class="aprobar-btn" data-id="${user.userId}" ${user.aprobado ? "disabled" : ""}>
                ${user.aprobado ? "Aprobado" : "Aprobar"}
                </button>
            </div>
        `;
    });

    // Asignar el HTML al contenedor
    usuariosContainer.innerHTML = html;

    // Llamar a la función para agregar los eventos de aprobación después de asignar el HTML
    agregarEventosAprobacion();

    // Agregar eventos a otros botones
    document.querySelectorAll('.view-rutinas-btn').forEach(button => {
        button.addEventListener('click', function() {
            const userId = button.dataset.userId;
            verRutinasUsuario(userId);
        });
    });

    document.querySelectorAll('.assign-rutina-btn').forEach(button => {
        button.addEventListener('click', function() {
            const userId = button.dataset.userId;
            asignarRutinaUsuario(userId);
        });
    });

    document.querySelectorAll('.transfer-rutina-btn').forEach(button => {
        button.addEventListener('click', function() {
            const userId = button.dataset.userId;
            traspasarRutinaUsuario(userId);
        });
    });
}

// Función para descargar los usuarios en formato Excel
function descargarExcel() {
    const usuariosParaExportar = usuarios.map(user => ({
        NombreCompleto: `${user.nombre} ${user.apellido}`,
        celular: user.celular
    }));

    const ws = XLSX.utils.json_to_sheet(usuariosParaExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Usuarios");
    // Descargar el archivo Excel
    XLSX.writeFile(wb, "usuarios.xlsx");  // Cambié 'writeFile' a 'XLSX.writeFile'
}

// Agregar el evento de clic al botón de descarga
document.getElementById("download-excel").addEventListener("click", descargarExcel);

// Agregar eventos a los botones de aprobación
function agregarEventosAprobacion() {
    const botones = document.querySelectorAll(".aprobar-btn");
    botones.forEach(boton => {
        boton.addEventListener("click", () => {
            const id = boton.dataset.id;
            if (id) aprobarUsuario(id);
        });
    });
}

// Función para aprobar un usuario
async function aprobarUsuario(id) {
    try {
        const usuarioRef = doc(db, "usuarios", id);
        await updateDoc(usuarioRef, { aprobado: true });

        obtenerUsuarios(); // Recargar la lista después de aprobar
    } catch (error) {
        console.error("Error al aprobar usuario:", error);
    }
}

    usuariosContainer.innerHTML = html;

    document.querySelectorAll('.view-rutinas-btn').forEach(button => {
        button.addEventListener('click', function() {
            const userId = button.dataset.userId;
            verRutinasUsuario(userId);
        });
    });

    document.querySelectorAll('.assign-rutina-btn').forEach(button => {
        button.addEventListener('click', function() {
            const userId = button.dataset.userId;
            asignarRutinaUsuario(userId);
        });
    });

    document.querySelectorAll('.transfer-rutina-btn').forEach(button => {
        button.addEventListener('click', function() {
            const userId = button.dataset.userId;
            traspasarRutinaUsuario(userId);
        });
    });

// Cargar usuarios al iniciar
obtenerUsuarios();

// Agregar el evento de clic a la "X"
clearSearchButton.addEventListener("click", () => {
    searchInput.value = ""; 
    searchInput.focus();
    mostrarUsuarios(usuarios);
});

// Función para ver rutinas (redirige a una nueva página con el ID del usuario)
function verRutinasUsuario(userId) {
    localStorage.setItem("selectedUserId", userId);
    window.location.href = "ver-rutinas.html";
}

// Función para redirigir a la página de asignar rutinas
function asignarRutinaUsuario(userId) {
    localStorage.setItem("selectedUserId", userId);
    window.location.href = "asignar-rutinas.html";
}

async function traspasarRutinaUsuario(userId) {
    Swal.fire({
        title: "Traspasar Rutina",
        html: `
            <label for="user-select">Seleccione un usuario:</label>
            <select id="user-select" class="swal2-input">
                <option value="" disabled selected>Seleccione un usuario</option>
            </select>
            <br>
            <label for="email-field">Email del usuario seleccionado:</label>
            <input type="text" id="email-field" class="swal2-input" readonly>
        `,
        showCancelButton: true,
        confirmButtonText: "Traspasar",
        cancelButtonText: "Cancelar",
        didOpen: async () => {
            const userSelect = document.getElementById("user-select");
            const emailField = document.getElementById("email-field");

            try {
                const usuariosSnapshot = await getDocs(collection(db, "usuarios"));
                let optionsHTML = "";

                usuariosSnapshot.forEach(doc => {
                    const userData = doc.data();
                    const uid = doc.id;
                    const nombre = userData.nombre || "Sin nombre";
                    const apellido = userData.apellido || "Sin apellido";
                    const email = userData.email || "No disponible";

                    if (uid !== userId) { // No permitir transferirse a sí mismo
                        optionsHTML += `<option value="${uid}" data-email="${email}">${nombre} ${apellido}</option>`;
                    }
                });

                userSelect.innerHTML += optionsHTML;

                userSelect.addEventListener("change", function() {
                    const selectedOption = userSelect.options[userSelect.selectedIndex];
                    emailField.value = selectedOption.dataset.email || "No disponible";
                });

            } catch (error) {
                console.error("Error al cargar usuarios:", error);
                Swal.showValidationMessage("Error al obtener los usuarios.");
            }
        },
        preConfirm: () => {
            const selectedUserId = document.getElementById("user-select").value;
            if (!selectedUserId) {
                Swal.showValidationMessage("Debe seleccionar un usuario.");
                return false;
            }
            return selectedUserId;
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            const newUserId = result.value;
            try {
                // Eliminar todas las rutinas del usuario destino (newUserId)
                const userRutinasDestinoSnapshot = await getDocs(query(collection(db, "routines"), where("userId", "==", newUserId)));

                // Eliminar rutinas del usuario destino
                for (let rutinaDoc of userRutinasDestinoSnapshot.docs) {
                    await deleteDoc(doc(db, "routines", rutinaDoc.id));
                }

                // Obtener las rutinas del usuario origen
                const userRutinas = await getDocs(query(collection(db, "routines"), where("userId", "==", userId)));

                if (userRutinas.size === 0) {
                    Swal.fire("Error", "El usuario no tiene rutinas para traspasar.", "error");
                    return;
                }

                // Copiar las rutinas del usuario origen al usuario destino
                for (let rutinaDoc of userRutinas.docs) {
                    const rutinaData = rutinaDoc.data();
                    // Asegúrate de actualizar el `userId` del documento con el nuevo usuario
                    await setDoc(doc(db, "routines", rutinaDoc.id), {
                        ...rutinaData,
                        userId: newUserId // Reemplaza el userId con el nuevo
                    });
                }

                Swal.fire("Éxito", "La rutina fue traspasada correctamente.", "success");

            } catch (error) {
                console.error("Error al traspasar rutina:", error);
                Swal.fire("Error", "Hubo un problema al traspasar la rutina.", "error");
            }
        }
    });
}