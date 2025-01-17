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
    routineList.innerHTML = ""; // Limpiar lista de rutinas

    const dayOrder = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

    // Ordenar rutinas por el orden de los días
    const sortedRoutines = routines.sort((a, b) => {
        return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
    });

    sortedRoutines.forEach((routine) => {
        const routineCard = document.createElement("div");
        routineCard.classList.add("routine-card");

        routineCard.innerHTML = `
            <h3>${routine.day}</h3>
            <ul>
                ${routine.exercises
                    .map(
                        (exercise) =>
                            `<li>${exercise.name} - ${exercise.series} series, ${exercise.repetitions} reps, ${exercise.weight} kg</li>`
                    )
                    .join("")}
            </ul>
            <button class="edit-button" data-day="${routine.day}">Editar</button>
            <button class="delete-button" data-day="${routine.day}">Eliminar</button>
        `;

        routineList.appendChild(routineCard);
    });

    // Event listeners para los botones de editar
    const editButtons = routineList.querySelectorAll(".edit-button");
    editButtons.forEach((button) =>
        button.addEventListener("click", (e) => {
            const day = e.target.dataset.day;
            openEditPopup(day, routines);
        })
    );

       // Event listeners para los botones de eliminar
       const deleteButtons = routineList.querySelectorAll(".delete-button");
       deleteButtons.forEach((button) =>
           button.addEventListener("click", (e) => {
               const day = e.target.dataset.day;
               alert(`Eliminar rutina para el día: ${day}`);
           })
       );
   }

// Función para abrir el popup de edición
function openEditPopup(day, routines) {
    const popup = document.getElementById("edit-popup");
    if (!popup) {
        console.error("El elemento popup no se encuentra en el DOM");
        return;
    }

    const popupContent = document.getElementById("popup-content");
    const routine = routines.find(routine => routine.day === day);

    if (!routine || !Array.isArray(routine.exercises)) {
        popupContent.innerHTML = `<p>No hay ejercicios para la rutina de ${day}</p>`;
        popup.classList.remove("hidden");
        return;
    }

    const exercises = routine.exercises;

    popupContent.innerHTML = `
        <h3>Editar Rutina para ${day}</h3>
        <ul id="exercises-list">
            ${exercises.map((exercise, index) => `
                <li>
                    <div>
                        <span>${exercise.name}</span>
                        <input type="number" value="${exercise.series}" id="series-${index}" placeholder="Series">
                        <input type="number" value="${exercise.repetitions}" id="reps-${index}" placeholder="Repeticiones">
                        <input type="number" value="${exercise.weight}" id="weight-${index}" placeholder="Peso">
                        <button class="delete-exercise" data-index="${index}">Eliminar</button>
                    </div>
                </li>
            `).join('')}
        </ul>
        <button id="save-changes">Guardar cambios</button>
        <button id="close-popup">Cerrar</button>
    `;

    popup.classList.remove("hidden");

    const deleteButtons = popup.querySelectorAll(".delete-exercise");
    deleteButtons.forEach(button => {
        button.addEventListener("click", (e) => {
            const index = e.target.dataset.index;
            exercises.splice(index, 1); // Eliminar ejercicio del array local
            openEditPopup(day, routines); // Reabrir popup para reflejar los cambios
        });
    });

    document.getElementById("save-changes").addEventListener("click", () => {
        saveChanges(day, exercises);
    });

    document.getElementById("close-popup").addEventListener("click", () => {
        popup.classList.add("hidden");
    });
}

// Eventos para eliminar un ejercicio
const deleteButtons = popup.querySelectorAll(".delete-exercise");
deleteButtons.forEach(button => {
    button.addEventListener("click", async (e) => {
        const index = e.target.dataset.index;
        exercises.splice(index, 1); // Eliminar ejercicio del array local
        openEditPopup(day, routines); // Reabrir popup para reflejar los cambios
    });
});alert(`Ejercicio "${exercise.name}" eliminado`);

// Guardar cambios realizados en los ejercicios
async function saveChanges(day, exercises) {
    const user = JSON.parse(localStorage.getItem("currentUser"));
    const routinesRef = collection(db, "routines");
    const q = query(routinesRef, where("userId", "==", user.uid), where("day", "==", day));

    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(async (doc) => {
        const updatedExercises = exercises.map((exercise, index) => ({
            ...exercise,
            series: document.getElementById(`series-${index}`).value,
            repetitions: document.getElementById(`reps-${index}`).value,
            weight: document.getElementById(`weight-${index}`).value
        }));

        await updateDoc(doc.ref, {
            exercises: updatedExercises
        });
    });

    alert("Cambios guardados");
}