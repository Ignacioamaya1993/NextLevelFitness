import app, { db } from "../scripts/firebaseConfig.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { collection, getDocs, doc, updateDoc, getDoc, query, where, setDoc, deleteDoc, orderBy, limit, startAfter } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

// Referencias del DOM
const usuariosContainer = document.getElementById("usuarios-container");
const searchInput = document.getElementById("search-input");
const paginacionContainer = document.getElementById("pagination-container");

let usuarios = [];
let paginaActual = 1;
let usuariosPorPagina = 12;
let ultimoDocumento = null; // Último documento de la consulta actual (para paginación)
let unsubscribe = null; // Para evitar múltiples suscripciones a Firestore

// Evento para búsqueda con debounce
let debounceTimeout;
searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(async () => {
        paginaActual = 1;
        ultimoDocumento = null;
        await cargarUsuarios(searchInput.value.trim());
    }, 300);
});

// Cargar usuarios al iniciar
cargarUsuarios();

async function cargarUsuarios(filtro = "", pagina = 1) {
    const auth = getAuth(app);

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "login-admin.html";
            return;
        }

        console.log("Usuario autenticado:", user.uid);

        const filtroLower = filtro.toLowerCase();
        let q;

        // Iniciar la consulta según la página
        if (filtro) {
            q = query(
                collection(db, "usuarios"),
                orderBy("nombre"),
                limit(usuariosPorPagina)
            );
        } else {
            if (pagina === 1) {
                console.log("Cargando página 1...");
                q = query(
                    collection(db, "usuarios"),
                    orderBy("nombre"),
                    limit(usuariosPorPagina)
                );
                ultimoDocumento = null; // Asegurarse de que se reinicia para la primera página
            } else {
                console.log("Cargando página", pagina, "con startAfter...");
                if (!ultimoDocumento) {
                    console.log("ERROR: No se ha encontrado el último documento en la página anterior");
                    return;
                }
                q = query(
                    collection(db, "usuarios"),
                    orderBy("nombre"),
                    startAfter(ultimoDocumento), 
                    limit(usuariosPorPagina)
                );
            }
        }

        // Limpiar suscripción anterior
        if (unsubscribe) unsubscribe();

        const usuariosSnapshot = await getDocs(q);
        let usuariosFiltrados = [];

        usuariosSnapshot.forEach(doc => {
            const userData = doc.data();
            if (!filtro || userData.nombre.toLowerCase().includes(filtroLower) || userData.apellido.toLowerCase().includes(filtroLower)) {
                usuariosFiltrados.push({
                    userId: doc.id,
                    nombre: userData.nombre || "Sin nombre",
                    apellido: userData.apellido || "Sin apellido",
                    email: userData.email || "No disponible",
                    celular: userData.celular || "No disponible",
                    fechaFormateada: userData.fechaNacimiento ? formatearFecha(userData.fechaNacimiento) : "No disponible",
                    edad: userData.fechaNacimiento ? calcularEdad(userData.fechaNacimiento) : "No disponible",
                    genero: userData.genero || "No disponible",
                    aprobado: userData.aprobado || false
                });
            }
        });

        usuarios = usuariosFiltrados;
        paginaActual = pagina;

        // Solo actualizar el último documento si hay resultados
        if (usuariosSnapshot.docs.length > 0) {
            ultimoDocumento = usuariosSnapshot.docs[usuariosSnapshot.docs.length - 1];
            console.log("Último documento actualizado:", ultimoDocumento.id);
        }else {
            console.log("No se encontraron más documentos.");
        }

        mostrarUsuarios(usuarios);
        mostrarPaginacion();
    });
}

async function cambiarEstadoUsuario(userId, button) {
    const usuarioRef = doc(db, "usuarios", userId);

    try {
        const usuarioSnapshot = await getDoc(usuarioRef);
        if (usuarioSnapshot.exists()) {
            const usuarioData = usuarioSnapshot.data();
            const nuevoEstado = !usuarioData.aprobado;

            await updateDoc(usuarioRef, { aprobado: nuevoEstado });

            button.textContent = nuevoEstado ? "Inhabilitar" : "Aprobar";
            button.parentElement.querySelector("p strong").textContent = nuevoEstado ? "Aprobado" : "Inhabilitado";

            setTimeout(() => {
                cargarUsuarios(searchInput.value.trim(), paginaActual); // Mantener la página actual
            }, 500);
        }
    } catch (error) {
        console.error("Error al cambiar el estado del usuario:", error);
    }
}

async function obtenerTotalUsuarios() {
    console.log("Obteniendo total de usuarios...");
    const snapshot = await getDocs(collection(db, "usuarios"));
    return snapshot.size; // Total de documentos en la colección
}

async function mostrarPaginacion() {
    console.log("Mostrando paginación...");
    paginacionContainer.innerHTML = "";

    const totalUsuarios = await obtenerTotalUsuarios();
    const totalPages = Math.ceil(totalUsuarios / usuariosPorPagina);

    if (totalPages <= 1) return;

    if (paginaActual > 1) {
        const prevButton = document.createElement("button");
        prevButton.textContent = "Anterior";
        prevButton.addEventListener("click", () => cambiarPagina(paginaActual - 1));
        paginacionContainer.appendChild(prevButton);
        console.log("Botón de Anterior agregado.");
    }

    for (let i = 1; i <= totalPages; i++) {
        if (i === paginaActual || i === 1 || i === totalPages) { 
            const pageButton = document.createElement("button");
            pageButton.textContent = i;
            if (i === paginaActual) pageButton.classList.add("active");
            pageButton.addEventListener("click", () => cambiarPagina(i));
            paginacionContainer.appendChild(pageButton);
            console.log("Botón de página agregado:", i);
        }
    }

    if (paginaActual < totalPages) {
        const nextButton = document.createElement("button");
        nextButton.textContent = "Siguiente";
        nextButton.addEventListener("click", () => cambiarPagina(paginaActual + 1));
        paginacionContainer.appendChild(nextButton);
        console.log("Botón de Siguiente agregado.");
    }
}

function cambiarPagina(pagina) {
    console.log("Cambiando a la página:", pagina);
    if (pagina < 1) return;
    paginaActual = pagina;
    ultimoDocumento = null; // Resetear la paginación al cambiar de página
    cargarUsuarios(searchInput.value.trim(), pagina);  // Pasar la página correcta
}

// Variable global para el filtro
let filtroActivado = false;

// Evento del botón para activar/desactivar el filtro
document.getElementById("filterButton").addEventListener("click", () => {
    filtroActivado = !filtroActivado; // Alternar estado del filtro
    cargarUsuarios(searchInput.value.trim(), paginaActual); // Recargar usuarios con el nuevo filtro
});

// Función para mostrar usuarios
function mostrarUsuarios(users) {
    let html = "";
    let usuariosParaMostrar = users;

    // Filtrar usuarios si el filtro está activado
    if (filtroActivado) {
        usuariosParaMostrar = usuarios.filter(usuario => usuario.aprobado === false); // Filtrar inhabilitados
    }

    // Crear el HTML para mostrar los usuarios
    usuariosParaMostrar.forEach(user => {
        html += `
            <div class="usuario-card">
                <h2>${user.nombre} ${user.apellido}</h2>
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Celular:</strong> ${user.celular}</p>
                <p><strong>Fecha de nacimiento:</strong> ${user.fechaFormateada}</p>
                <p><strong>Edad:</strong> ${user.edad}</p>
                <p><strong>Género:</strong> ${user.genero}</p>
                <p><strong>Estado:</strong> ${user.aprobado ? "Aprobado" : "Inhabilitado"}</p>
                <button class="view-rutinas-btn" data-user-id="${user.userId}">Ver Rutinas</button>
                <button class="assign-rutina-btn" data-user-id="${user.userId}">Armar Rutina</button>
                <button class="transfer-rutina-btn" data-user-id="${user.userId}">Traspasar Rutina</button>
                <button class="aprobar-btn" data-id="${user.userId}">
                    ${user.aprobado ? "Inhabilitar" : "Aprobar"}
                </button>
            </div>
        `;
    });

    // Asignar el HTML al contenedor de usuarios
    usuariosContainer.innerHTML = html;

    // Agregar eventos a los botones de aprobar/inabilitar
    document.querySelectorAll('.aprobar-btn').forEach(button => {
        button.addEventListener('click', function() {
            const userId = button.dataset.id;
            cambiarEstadoUsuario(userId, button); // Cambiar estado dependiendo del usuario
        });
    });

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
    XLSX.writeFile(wb, "Usuarios.xlsx");  // Cambié 'writeFile' a 'XLSX.writeFile'
}

// Agregar el evento de clic al botón de descarga
document.getElementById("download-excel").addEventListener("click", descargarExcel);

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