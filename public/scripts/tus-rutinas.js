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

        // Limpia el contenido previo del popup
        popupContent.innerHTML = "";

        // Encuentra la rutina correspondiente al día seleccionado
        const routine = routines.find(routine => routine.day === day);

        if (!routine || !routine.exercise) {
            popupContent.innerHTML = `<p>No hay ejercicios para la rutina de ${day}</p>`;
            popup.classList.remove("hidden");
            return;
        }

        const exercises = Array.isArray(routine.exercise) ? routine.exercise : [routine.exercise];

        // Crear encabezado
        const header = document.createElement("h3");
        header.textContent = `Editar Rutina para ${day}`;
        popupContent.appendChild(header);

        // Selector de ejercicios
        const exerciseSelect = document.createElement("select");
        exerciseSelect.id = "exercise-select";
        exerciseSelect.innerHTML = exercises.map((exercise, index) => `
            <option value="${index}">${exercise.name || `Ejercicio ${index + 1}`}</option>
        `).join('');
        popupContent.appendChild(exerciseSelect);

        // Contenedor para los campos de edición
        const editFieldsContainer = document.createElement("div");
        editFieldsContainer.id = "edit-fields-container";
        popupContent.appendChild(editFieldsContainer);

        // Botón para guardar cambios
        const saveButton = document.createElement("button");
        saveButton.id = "save-changes";
        saveButton.textContent = "Guardar cambios";
        popupContent.appendChild(saveButton);

        // Botón para cerrar
        const closeButton = document.createElement("button");
        closeButton.id = "close-popup";
        closeButton.textContent = "Cerrar";
        popupContent.appendChild(closeButton);

        // Evento para escuchar la tecla Escape
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                const popup = document.getElementById('edit-popup');
                if (!popup.classList.contains('hidden')) { // Solo cierra si el popup está visible
                    popup.classList.add('hidden');
        }
    }
});

        // Mostrar el popup
        popup.classList.remove("hidden");

        // Mostrar campos de edición al seleccionar un ejercicio
        exerciseSelect.addEventListener("change", () => {
            const selectedIndex = parseInt(exerciseSelect.value, 10);
            const selectedExercise = exercises[selectedIndex];
            renderEditFields(editFieldsContainer, selectedExercise, selectedIndex, day, exercises, routine);
        });

        // Inicializar con el primer ejercicio
        renderEditFields(editFieldsContainer, exercises[0], 0, day, exercises, routine);

        // Guardar cambios
        saveButton.addEventListener("click", () => {
            saveChanges(day, exercises);
            popup.classList.add("hidden");
        });

        // Cerrar popup
        closeButton.addEventListener("click", () => {
            popup.classList.add("hidden");
        });
    }

function renderEditFields(container, exercise, index, day, exercises) {
    container.innerHTML = `
        <div>
            <label>Series:</label>
            <input type="number" value="${exercise.series || 0}" id="series-${index}">
        </div>
        <div>
            <label>Repeticiones:</label>
            <input type="number" value="${exercise.repetitions || 0}" id="reps-${index}">
        </div>
        <div>
            <label>Peso (kg):</label>
                <input type="number" value="${exercise.weight || 0}" id="weight-${index}">
                </div>
        <button class="delete-exercise" data-index="${index}">Eliminar ejercicio</button>
    `;

    // Configurar evento para eliminar ejercicio
    const deleteButton = container.querySelector(".delete-exercise");
    deleteButton.addEventListener("click", () => {
        const confirmDelete = confirm(`¿Estás seguro de eliminar el ejercicio "${exercise.name}"?`);
        if (confirmDelete) {
            deleteExerciseFromRoutine(day, index, exercises);
        }
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