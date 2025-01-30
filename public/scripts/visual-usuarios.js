import app, { db } from "../scripts/firebaseConfig.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

const usuariosContainer = document.getElementById("usuarios-container");
const searchInput = document.getElementById("search-input"); // Campo de búsqueda

// Variable global para almacenar todos los usuarios
let usuarios = [];

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

                // Reiniciar la lista de usuarios y agregar los usuarios nuevos
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
                        genero
                    });
                });

                // Mostrar todos los usuarios inicialmente
                mostrarUsuarios(usuarios);

                // Filtrar usuarios mientras se escribe en el campo de búsqueda
                searchInput.addEventListener("input", () => {
                    const searchTerm = searchInput.value.toLowerCase();
                    const filteredUsers = usuarios.filter(user => 
                        user.nombre.toLowerCase().includes(searchTerm) || 
                        user.apellido.toLowerCase().includes(searchTerm)
                    );
                    mostrarUsuarios(filteredUsers);
                });

                // Función para mostrar usuarios
                function mostrarUsuarios(users) {
                    html = "";
                    users.forEach(user => {
                        html += `
                            <div class="usuario-card">
                                <h2>${user.nombre} ${user.apellido}</h2>
                                <p><strong>Email:</strong> ${user.email}</p>
                                <p><strong>Celular:</strong> ${user.celular}</p>
                                <p><strong>Fecha de nacimiento:</strong> ${user.fechaFormateada}</p>
                                <p><strong>Edad:</strong> ${user.edad}</p>
                                <p><strong>Género:</strong> ${user.genero}</p>
                                <button class="view-rutinas-btn" data-user-id="${user.userId}">Ver Rutinas</button>
                            </div>
                        `;
                    });
                    usuariosContainer.innerHTML = html;

                    // Agregar eventos a los botones de "Ver Rutinas"
                    const verRutinasButtons = document.querySelectorAll('.view-rutinas-btn');
                    verRutinasButtons.forEach(button => {
                        button.addEventListener('click', function() {
                            const userId = button.dataset.userId;
                            verRutinasUsuario(userId);
                        });
                    });
                }

            } catch (error) {
                console.error("Error al cargar usuarios:", error);
                usuariosContainer.innerHTML = `<p style="color:red;">Error al obtener los usuarios.</p>`;
            }
        } else {
            usuariosContainer.innerHTML = `<p style="color:red;">Por favor, inicia sesión para ver los usuarios.</p>`;
        }
    });
}

// Seleccionamos el botón de borrar búsqueda
const clearSearchButton = document.getElementById("clear-search");

// Agregar el evento de clic a la "X"
clearSearchButton.addEventListener("click", () => {
    searchInput.value = ""; // Limpiar el campo de búsqueda
    searchInput.focus(); // Poner el foco en el campo de búsqueda
    
    // Mostrar todos los usuarios nuevamente
    mostrarUsuarios(usuarios);
});

// Función para ver rutinas (redirige a una nueva página con el ID del usuario)
function verRutinasUsuario(userId) {
    localStorage.setItem("selectedUserId", userId); // Guarda el ID del usuario
    window.location.href = "ver-rutinas.html"; // Redirige sin parámetros en la URL
}

// Cargar usuarios al cargar la página
cargarUsuarios();