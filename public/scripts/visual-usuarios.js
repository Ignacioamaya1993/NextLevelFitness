import app, { db } from "../scripts/firebaseConfig.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

const usuariosContainer = document.getElementById("usuarios-container");
const searchInput = document.getElementById("searchInput"); // Campo de búsqueda

// Función para calcular la edad basada en la fecha de nacimiento
function calcularEdad(fechaNacimiento) {
    if (!fechaNacimiento) return "No disponible";
    
    const [year, month, day] = fechaNacimiento.split("-").map(Number);
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    
    let edad = today.getFullYear() - birthDate.getFullYear();
    if (today.getMonth() < birthDate.getMonth() || 
        (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) {
        edad--;
    }
    return edad;
}

// Función para formatear la fecha en formato DD/MM/YYYY
function formatearFecha(fecha) {
    if (!fecha) return "No disponible";

    const [year, month, day] = fecha.split("-").map(Number);
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

// Función para cargar usuarios
async function cargarUsuarios() {
    const auth = getAuth(app);
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            usuariosContainer.innerHTML = `<p style="color:red;">Por favor, inicia sesión para ver los usuarios.</p>`;
            return;
        }

        console.log("Usuario autenticado:", user.email);

        try {
            const usuariosSnapshot = await getDocs(collection(db, "usuarios"));
            
            if (usuariosSnapshot.empty) {
                usuariosContainer.innerHTML = "<p>No hay usuarios registrados.</p>";
                return;
            }

            // Guardamos todos los usuarios en una variable
            const usuarios = usuariosSnapshot.docs.map(doc => {
                const userData = doc.data();
                const userId = doc.id;
                const nombre = userData.nombre || "Sin nombre";
                const apellido = userData.apellido || "Sin apellido";
                const email = userData.email || "No disponible";
                const celular = userData.celular || "No disponible";
                const fechaNacimiento = userData.fechaNacimiento;
                const genero = userData.genero || "No disponible";
                
                const edad = calcularEdad(fechaNacimiento);
                const fechaFormateada = formatearFecha(fechaNacimiento);

                return {
                    userId,
                    nombre,
                    apellido,
                    email,
                    celular,
                    fechaFormateada,
                    edad,
                    genero
                };
            });

            // Función para mostrar usuarios
            const mostrarUsuarios = (usuarios) => {
                usuariosContainer.innerHTML = usuarios.map(user => {
                    return `
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
                }).join("");
            };

            // Mostrar todos los usuarios inicialmente
            mostrarUsuarios(usuarios);

            // Filtrar usuarios cuando el campo de búsqueda cambia
            searchInput.addEventListener("input", () => {
                const query = searchInput.value.toLowerCase();
                const filteredUsuarios = usuarios.filter(user => {
                    return user.nombre.toLowerCase().includes(query) || user.apellido.toLowerCase().includes(query);
                });
                mostrarUsuarios(filteredUsuarios); // Mostrar los usuarios filtrados
            });

        } catch (error) {
            console.error("Error al cargar usuarios:", error);
            usuariosContainer.innerHTML = `<p style="color:red;">Error al obtener los usuarios.</p>`;
        }
    });
}

// Delegación de eventos para los botones "Ver Rutinas"
usuariosContainer.addEventListener("click", (event) => {
    if (event.target.classList.contains("view-rutinas-btn")) {
        const userId = event.target.dataset.userId;
        verRutinasUsuario(userId);
    }
});

// Función para ver rutinas (redirige a una nueva página con el ID del usuario)
function verRutinasUsuario(userId) {
    localStorage.setItem("selectedUserId", userId); // Guarda el ID del usuario
    window.location.href = "ver-rutinas.html"; // Redirige sin parámetros en la URL
}

// Cargar usuarios al cargar la página
cargarUsuarios();