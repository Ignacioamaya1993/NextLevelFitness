import { db } from './firebaseConfig.js';  // Importa solo db
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
    const user = JSON.parse(localStorage.getItem("currentUser"));
    const restrictedMessage = document.getElementById("restricted-message");
    const routineViewer = document.getElementById("routine-viewer");
    const noRoutinesMessage = document.getElementById("no-routines-message");

    if (user && user.isLoggedIn) {
        // Usuario logueado: mostrar la sección de rutinas
        restrictedMessage.classList.add("hidden");
        routineViewer.classList.remove("hidden");

        try {
            const routines = await getUserRoutines(user.uid);
            if (routines && routines.length > 0) {
                // Mostrar rutinas creadas
                noRoutinesMessage.classList.add("hidden");
                displayUserRoutines(routines);
            } else {
                // Mostrar mensaje: no hay rutinas creadas
                noRoutinesMessage.classList.remove("hidden");
            }
        } catch (error) {
            console.error("Error al obtener las rutinas: ", error);
        }
    } else {
        // Usuario no logueado: mostrar mensaje restrictivo
        restrictedMessage.classList.remove("hidden");
        routineViewer.classList.add("hidden");
    }
});

async function getUserRoutines(userId) {
    const routinesRef = collection(db, "routines"); // Asegúrate de que la colección se llama "routines"
    const q = query(routinesRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    const routines = [];
    querySnapshot.forEach((doc) => {
        routines.push(doc.data());
    });

    return routines;
}

function displayUserRoutines(routines) {
    const routineList = document.getElementById("routine-list");
    routineList.innerHTML = "";

    routines.forEach((routine, index) => {
        const routineCard = document.createElement("div");
        routineCard.classList.add("routine-card");

        // Cambiar el acceso a 'day' (ahora es una cadena, no un arreglo)
        const daysText = routine.day ? routine.day : "Día no especificado";

        // Cambiar el acceso a 'exercise' (ahora es un objeto, no un arreglo)
        const exercisesList = routine.exercise ? 
            `<ul>
                <li>
                    ${routine.exercise.name} - ${routine.exercise.series} series, ${routine.exercise.repetitions} reps, ${routine.exercise.weight} kg
                </li>
            </ul>` : 
            "<p>No hay ejercicios disponibles.</p>";

        routineCard.innerHTML = `
            <h3>Rutina para ${daysText}</h3>
            <p>Fecha: ${routine.date}</p>
            ${exercisesList}
            <button class="edit-button" data-index="${index}">Editar</button>
            <button class="delete-button" data-index="${index}">Eliminar</button>
        `;

        routineList.appendChild(routineCard);
    });

    const editButtons = routineList.querySelectorAll(".edit-button");
    const deleteButtons = routineList.querySelectorAll(".delete-button");

    editButtons.forEach((button) =>
        button.addEventListener("click", (e) => {
            const index = e.target.dataset.index;
            alert(`Editar rutina en posición ${index}`);
        })
    );

    deleteButtons.forEach((button) =>
        button.addEventListener("click", (e) => {
            const index = e.target.dataset.index;
            alert(`Eliminar rutina en posición ${index}`);
        })
    );
}