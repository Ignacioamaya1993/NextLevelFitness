import app, { db } from "../scripts/firebaseConfig.js";
import { getAuth, onAuthStateChanged, updateEmail, sendEmailVerification } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { collection, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

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

// Función para actualizar el campo emailVerificado en Firestore
async function actualizarEmailVerificado() {
    const auth = getAuth(app);
    const user = auth.currentUser;

    if (user) {
        try {
            console.log("Verificando correo para el usuario:", user.email); // Log para verificar el estado del usuario
            // Esperar hasta que el correo esté verificado
            if (user.emailVerified) {
                // Actualizamos el campo 'emailVerificado' en Firestore (ahora como booleano)
                const userRef = doc(db, "usuarios", user.uid); // Obtener el documento del usuario autenticado
                console.log("Actualizando Firestore para el usuario:", user.uid); // Log del usuario
                await updateDoc(userRef, {
                    emailVerificado: true, // Usamos un valor booleano en lugar de una cadena
                });
                console.log("Campo 'emailVerificado' actualizado a 'true' en Firestore.");
            } else {
                console.log("El correo aún no está verificado.");
            }
        } catch (error) {
            console.error("Error al actualizar el campo 'emailVerificado' en Firestore:", error);
        }
    }
}

// Función para cargar usuarios si el usuario está autenticado
async function cargarUsuarios() {
    const auth = getAuth(app); // Usa la instancia de auth que depende de la app
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("Usuario autenticado:", user.email); // Log del usuario autenticado

            try {
                // Asegurarnos de que el estado 'emailVerificado' en Firestore se actualice
                await actualizarEmailVerificado();

                const usuariosSnapshot = await getDocs(collection(db, "usuarios"));
                
                if (usuariosSnapshot.empty) {
                    usuariosContainer.innerHTML = "<p>No hay usuarios registrados.</p>";
                    return;
                }

                let html = "";
                usuariosSnapshot.forEach(doc => {
                    const userData = doc.data();
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

                    // Comparar si el correo está verificado (en Firestore y en el usuario autenticado)
                    const emailVerificado = userData.emailVerificado ? "Sí" : "No"; // Usamos el valor booleano de Firestore y lo mostramos como cadena

                    // Log para ver el estado de emailVerified y los datos
                    console.log("Datos de Firestore para el usuario:", userData.email);
                    console.log("Estado de emailVerified del usuario autenticado:", user.emailVerified);
                    console.log("Resultado final email validado:", emailVerificado);

                    html += `
                        <div class="usuario-card">
                            <h2>${nombre} ${apellido}</h2>
                            <p><strong>Email:</strong> ${email}</p>
                            <p><strong>Celular:</strong> ${celular}</p>
                            <p><strong>Fecha de nacimiento:</strong> ${fechaFormateada}</p>
                            <p><strong>Edad:</strong> ${edad}</p>
                            <p><strong>Género:</strong> ${genero}</p>
                            <p><strong>Email validado:</strong> ${emailVerificado}</p>
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

// Cargar usuarios al cargar la página
cargarUsuarios();