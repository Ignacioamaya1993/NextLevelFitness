import { db } from './firebaseConfig.js'; // Importa solo db
import { collection, getDocs, query, where, updateDoc, arrayRemove, deleteDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
    const user = JSON.parse(localStorage.getItem("currentUser"));
    const restrictedMessage = document.getElementById("restricted-message");
    const routineViewer = document.getElementById("routine-viewer");
    const noRoutinesMessage = document.getElementById("no-routines-message");

    if (user && user.isLoggedIn) {
        restrictedMessage.classList.add("hidden");
        routineViewer.classList.remove("hidden");

        try {
            const routines = await getUserRoutines(user.uid);
            if (routines && routines.length > 0) {
                noRoutinesMessage.classList.add("hidden");
                displayUserRoutines(routines);
            } else {
                noRoutinesMessage.classList.remove("hidden");
            }
        } catch (error) {
            console.error("Error al obtener las rutinas: ", error);
        }
    } else {
        restrictedMessage.classList.remove("hidden");
        routineViewer.classList.add("hidden");
    }
});

async function getUserRoutines(userId) {
    const routinesRef = collection(db, "routines");
    const q = query(routinesRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    const routines = [];
    querySnapshot.forEach((doc) => {
        routines.push({ ...doc.data(), id: doc.id });
    });

    return routines;
}

function displayUserRoutines(routines) {
    const routineList = document.getElementById("routine-list");
    routineList.innerHTML = "";

    const groupedRoutines = groupRoutinesByDay(routines);

    Object.keys(groupedRoutines).forEach(day => {
        const routineCard = document.createElement("div");
        routineCard.classList.add("routine-card");

        const exercisesList = groupedRoutines[day].map(exercise => {
            const name = exercise.name || "Ejercicio sin nombre";
            const series = exercise.series || 0;
            const reps = exercise.repetitions || 0;
            const weight = exercise.weight || 0;
            return `<li>${name} - ${series} series, ${reps} reps, ${weight} kg</li>`;
        }).join('');

        routineCard.innerHTML = `
            <h3>Rutina para ${day}</h3>
            <ul>
                ${exercisesList}
            </ul>
            <button class="edit-button" data-day="${day}">Editar</button>
            <button class="delete-button" data-day="${day}">Eliminar</button>
        `;

        routineList.appendChild(routineCard);
    });

    const editButtons = routineList.querySelectorAll(".edit-button");
    const deleteButtons = routineList.querySelectorAll(".delete-button");

    editButtons.forEach((button) =>
        button.addEventListener("click", (e) => {
            const day = e.target.dataset.day;
            openEditPopup(day, routines);
        })
    );

    deleteButtons.forEach((button) =>
        button.addEventListener("click", (e) => {
            const day = e.target.dataset.day;
            const confirmDelete = confirm(`¿Estás seguro de eliminar la rutina para el día ${day}?`);
            if (confirmDelete) {
                deleteRoutine(day);
            }
        })
    );
}

function groupRoutinesByDay(routines) {
    const grouped = {};

    routines.forEach(routine => {
        const day = routine.day || "Día no especificado";

        if (!grouped[day]) {
            grouped[day] = [];
        }

        if (Array.isArray(routine.exercise)) {
            grouped[day] = grouped[day].concat(routine.exercise);
        } else if (routine.exercise) {
            grouped[day].push(routine.exercise);
        }
    });

    return grouped;
}

function openEditPopup(day, routines) {
    const popup = document.getElementById("edit-popup");
    const popupContent = document.getElementById("popup-content");

    // Encuentra la rutina correspondiente al día seleccionado
    const routine = routines.find(routine => routine.day === day);

    if (!routine || !routine.exercise) {
        popupContent.innerHTML = `<p>No hay ejercicios para la rutina de ${day}</p>`;
        popup.classList.remove("hidden");
        return;
    }

    // Asegurarse de que los ejercicios estén en un arreglo
    const exercises = Array.isArray(routine.exercise) ? routine.exercise : [routine.exercise];

    // Renderiza todos los ejercicios en el popup
    popupContent.innerHTML = `
        <h3>Editar Rutina para ${day}</h3>
        <ul id="exercises-list">
            ${exercises.map((exercise, index) => `
                <li>
                    <div>
                        <span>${exercise.name || "Ejercicio sin nombre"}</span>
                        <input type="number" value="${exercise.series || 0}" id="series-${index}" placeholder="Series">
                        <input type="number" value="${exercise.repetitions || 0}" id="reps-${index}" placeholder="Repeticiones">
                        <input type="number" value="${exercise.weight || 0}" id="weight-${index}" placeholder="Peso">
                        <button class="delete-exercise" data-index="${index}">Eliminar</button>
                    </div>
                </li>
            `).join('')}
        </ul>
        <button id="save-changes">Guardar cambios</button>
        <button id="close-popup">Cerrar</button>
    `;

    popup.classList.remove("hidden");

    // Configurar eventos para eliminar ejercicios
    const deleteButtons = popup.querySelectorAll(".delete-exercise");
    deleteButtons.forEach(button => {
        button.addEventListener("click", async (e) => {
            const index = e.target.dataset.index;
            await deleteExerciseFromRoutine(day, index, exercises);
        });
    });

    // Guardar cambios en los ejercicios
    document.getElementById("save-changes").addEventListener("click", () => {
        saveChanges(day, exercises);
    });

    // Cerrar el popup
    document.getElementById("close-popup").addEventListener("click", () => {
        popup.classList.add("hidden");
    });
}


async function deleteExerciseFromRoutine(day, index, exercises) {
    const exercise = exercises[index];
    const user = JSON.parse(localStorage.getItem("currentUser"));
    const routinesRef = collection(db, "routines");
    const q = query(routinesRef, where("userId", "==", user.uid), where("day", "==", day));

    try {
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(async (doc) => {
            // Actualiza la rutina eliminando el ejercicio
            await updateDoc(doc.ref, {
                exercise: arrayRemove(exercise),
            });

            // Verifica si la rutina quedó sin ejercicios
            const updatedRoutine = await getDocs(query(doc.ref));
            const updatedExercises = updatedRoutine.docs[0]?.data()?.exercise || [];

            if (updatedExercises.length === 0) {
                // Si no quedan ejercicios, elimina la rutina completa
                await deleteDoc(doc.ref);
                alert(`La rutina para el día "${day}" ha sido eliminada porque no tiene ejercicios.`);
            } else {
                alert(`Ejercicio "${exercise.name}" eliminado correctamente.`);
            }
        });

        location.reload(); // Actualiza la página
    } catch (error) {
        console.error("Error al eliminar ejercicio:", error);
        alert("No se pudo eliminar el ejercicio.");
    }
}

async function deleteRoutine(day) {
    const user = JSON.parse(localStorage.getItem("currentUser"));
    const routinesRef = collection(db, "routines");
    const q = query(routinesRef, where("userId", "==", user.uid), where("day", "==", day));

    try {
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(async (doc) => {
            await deleteDoc(doc.ref);
        });

        alert(`Rutina para el día "${day}" eliminada correctamente.`);

        // Actualiza dinámicamente la interfaz para eliminar la rutina del DOM
        const routineCard = document.querySelector(`.routine-card [data-day="${day}"]`).parentElement;
        routineCard.remove();

        // Opcional: muestra el mensaje "No hay rutinas" si ya no quedan rutinas
        const routineList = document.getElementById("routine-list");
        if (!routineList.children.length) {
            document.getElementById("no-routines-message").classList.remove("hidden");
        }
    } catch (error) {
        console.error("Error al eliminar rutina:", error);
        alert("No se pudo eliminar la rutina.");
    }
}

async function saveChanges(day, exercises) {
    const user = JSON.parse(localStorage.getItem("currentUser"));
    const routinesRef = collection(db, "routines");
    const q = query(routinesRef, where("userId", "==", user.uid), where("day", "==", day));

    try {
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(async (doc) => {
            const updatedExercises = exercises.map((exercise, index) => ({
                ...exercise,
                series: parseInt(document.getElementById(`series-${index}`).value),
                repetitions: parseInt(document.getElementById(`reps-${index}`).value),
                weight: parseInt(document.getElementById(`weight-${index}`).value),
            }));

            await updateDoc(doc.ref, {
                exercise: updatedExercises,
            });
        });

        alert("Cambios guardados correctamente.");
    } catch (error) {
        console.error("Error al guardar los cambios:", error);
        alert("Ocurrió un error al guardar los cambios.");
    }
}