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

    // Agrupar rutinas por día
    const groupedRoutines = groupRoutinesByDay(routines);

    // Iterar sobre los días y mostrar los ejercicios agrupados
    Object.keys(groupedRoutines).forEach(day => {
        const routineCard = document.createElement("div");
        routineCard.classList.add("routine-card");

        // Título con el día de la rutina
        const exercisesList = groupedRoutines[day].map(exercise => {
            return `<li>
                        ${exercise.name} - ${exercise.series} series, ${exercise.repetitions} reps, ${exercise.weight} kg
                    </li>`;
        }).join('');

        routineCard.innerHTML = `
            <h3>Rutina para ${day}</h3>
            <ul>
                ${exercisesList}
            </ul>
            <button class="edit-button">Editar</button>
            <button class="delete-button">Eliminar</button>
        `;

        routineList.appendChild(routineCard);
    });

    const editButtons = routineList.querySelectorAll(".edit-button");
    const deleteButtons = routineList.querySelectorAll(".delete-button");

    editButtons.forEach((button) =>
        button.addEventListener("click", (e) => {
            alert(`Editar rutina para ${e.target.closest('.routine-card').querySelector('h3').textContent}`);
        })
    );

    deleteButtons.forEach((button) =>
        button.addEventListener("click", (e) => {
            alert(`Eliminar rutina para ${e.target.closest('.routine-card').querySelector('h3').textContent}`);
        })
    );
}

function groupRoutinesByDay(routines) {
    const grouped = {};

    routines.forEach(routine => {
        const day = routine.day || "Día no especificado"; // Si no tiene día, asignar un valor por defecto

        if (!grouped[day]) {
            grouped[day] = [];
        }

        // Añadir el ejercicio al grupo correspondiente
        grouped[day].push(routine.exercise);
    });

    return grouped;
}