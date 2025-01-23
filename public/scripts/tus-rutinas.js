import { db } from './firebaseConfig.js'; // Importa solo db
import { collection, getDocs, query, where, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
    const user = JSON.parse(localStorage.getItem("currentUser"));
    const restrictedMessage = document.getElementById("restricted-message");
    const routineViewer = document.getElementById("routine-viewer");
    const noRoutinesMessage = document.getElementById("no-routines-message");
    const overlay = document.getElementById("overlay");
    overlay.addEventListener("click", (e) => {
    e.stopPropagation(); // Evitar que el clic pase al fondo
});

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
    console.log('Rutinas agrupadas por día:', groupedRoutines);
    
    Object.keys(groupedRoutines).forEach(day => {
        const routineCard = document.createElement("div");
        routineCard.classList.add("routine-card");

        const exercisesList = groupedRoutines[day].map(exercise => {
            const name = exercise.name || "Ejercicio sin nombre";
            const series = exercise.series || 0;
            const reps = exercise.repetitions || 0;
            const weight = exercise.weight || 0;
            const additionalData = exercise.additionalData || "Sin información adicional";
            return `<li>${name} - ${series} series, ${reps} reps, ${weight} kg, ${additionalData}</li>`;
        }).join('');

        routineCard.innerHTML = `
            <h3>Rutina para el día ${day}</h3>
            <ul class="exercise-list">
                ${exercisesList}
            </ul>
            <button class="edit-button" data-day="${day}">Editar</button>
            <button class="delete-button" data-day="${day}">Eliminar</button>
        `;
        console.log('HTML de la rutina:', routineCard.innerHTML);

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
            Swal.fire({
                title: `¿Estás seguro de eliminar la rutina para el día ${day}?`,
                text: "Esta acción no se puede deshacer.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Sí, eliminar",
                cancelButtonText: "Cancelar"
            }).then((result) => {
                if (result.isConfirmed) {
                    // Llamar a la función para eliminar la rutina solo después de confirmar
                    deleteRoutine(day);
                }
            });
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

        // Asegúrate de que exercise sea siempre un array
        const exercises = Array.isArray(routine.exercises) ? routine.exercises : [routine.exercises];
        grouped[day] = grouped[day].concat(exercises);
    });

    return grouped;
}

function openEditPopup(day, routines) {
    const popup = document.getElementById("edit-popup");
    const popupContent = document.getElementById("popup-content");

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !popup.classList.contains("hidden")) {
            closePopup();
        }
    });

    popupContent.innerHTML = "";

    const routine = routines.find(routine => routine.day === day);

    if (!routine) {
        popupContent.innerHTML = `<p>No se encontró la rutina para el día ${day}</p>`;
        showPopup();
        return;
    }

    if (!routine.exercises || !Array.isArray(routine.exercises)) {
        popupContent.innerHTML = `<p>No hay ejercicios disponibles para la rutina de ${day}</p>`;
        showPopup();
        return;
    }

    const exercises = routine.exercises;

    const header = document.createElement("h3");
    header.textContent = `Editar Rutina para el día ${day}`;
    popupContent.appendChild(header);

    const exerciseSelect = document.createElement("select");
    exerciseSelect.id = "exercise-select";

    if (exercises.length > 0) {
        exerciseSelect.innerHTML = exercises.map((exercise, index) => `
            <option value="${index}">${exercise.name || `Ejercicio ${index + 1}`}</option>
        `).join('');
    }

    popupContent.appendChild(exerciseSelect);

    const editFieldsContainer = document.createElement("div");
    editFieldsContainer.id = "edit-fields-container";
    popupContent.appendChild(editFieldsContainer);

    const saveButton = document.createElement("button");
    saveButton.id = "save-changes";
    saveButton.textContent = "Guardar cambios";
    popupContent.appendChild(saveButton);

    const closeButton = document.createElement("button");
    closeButton.id = "close-popup";
    closeButton.textContent = "Cancelar";
    popupContent.appendChild(closeButton);

    showPopup();

    exerciseSelect.addEventListener("change", () => {
        const selectedIndex = parseInt(exerciseSelect.value, 10);
        const selectedExercise = exercises[selectedIndex];
        renderEditFields(editFieldsContainer, selectedExercise, selectedIndex, day, exercises);
    });

    renderEditFields(editFieldsContainer, exercises[0], 0, day, exercises);

    saveButton.addEventListener("click", () => {
        saveChanges(day, exercises);
        closePopup();
    });

    closeButton.addEventListener("click", closePopup);

    // Cerrar el popup al hacer clic fuera del contenido
    popup.addEventListener("click", (e) => {
        if (e.target === popup) {
            closePopup();
        }
    });
}

function showPopup() {
    const popup = document.getElementById("edit-popup");
    const overlay = document.getElementById("overlay");

    popup.classList.remove("hidden");
    overlay.classList.add("active");
    document.body.style.overflow = "hidden"; // Deshabilitar scroll
}

function closePopup() {
    const popup = document.getElementById("edit-popup");
    const overlay = document.getElementById("overlay");

    popup.classList.add("hidden");
    overlay.classList.remove("active");
    document.body.style.overflow = ""; // Restaurar scroll
}

function renderEditFields(container, exercise, index, day, exercises) {
    container.innerHTML = `
        <div>
            <label>Series: <span class="required">*</span></label>
            <input type="number" value="${exercise.series != null ? exercise.series : 1}" id="series-${index}" min="1">
            <span class="error-message" id="error-series-${index}"></span>
        </div>
        <div>
            <label>Repeticiones: <span class="required">*</span></label>
            <input type="number" value="${exercise.repetitions != null ? exercise.repetitions : 1}" id="reps-${index}" min="1">
            <span class="error-message" id="error-reps-${index}"></span>
        </div>
        <div>
            <label>Peso (kg): <span class="required">*</span></label>
            <input type="number" value="${exercise.weight != null ? exercise.weight : 1}" id="weight-${index}" min="1" step="0.01">
            <span class="error-message" id="error-weight-${index}"></span>
        </div>
        <div>
            <label>Información adicional:</label>
            <textarea id="additionalData-${index}" rows="4">${exercise.additionalData || ''}</textarea>
        </div>
        <button class="delete-exercise" data-index="${index}">Eliminar ejercicio</button>
    `;

    // Obtener los inputs
    const seriesInput = document.getElementById(`series-${index}`);
    const repsInput = document.getElementById(`reps-${index}`);
    const weightInput = document.getElementById(`weight-${index}`);
    const errorSeries = document.getElementById(`error-series-${index}`);
    const errorReps = document.getElementById(`error-reps-${index}`);
    const errorWeight = document.getElementById(`error-weight-${index}`);
    const saveButton = document.getElementById("save-changes");

    // Función de validación
    const validateInput = (input, errorSpan, fieldName) => {
        if (parseFloat(input.value) <= 0 || input.value === "") {
            errorSpan.textContent = `El campo ${fieldName} no puede ser vacío, 0 o negativo.`;
            input.classList.add("input-error");
        } else {
            errorSpan.textContent = "";
            input.classList.remove("input-error");
        }
    };

    // Validación en tiempo real
    seriesInput.addEventListener("input", () => validateInput(seriesInput, errorSeries, "Series"));
    repsInput.addEventListener("input", () => validateInput(repsInput, errorReps, "Repeticiones"));
    weightInput.addEventListener("input", () => validateInput(weightInput, errorWeight, "Peso (kg)"));

    // Función para habilitar/deshabilitar el botón de guardar
    const toggleSaveButton = () => {
        const isValid = 
            parseFloat(seriesInput.value) > 0 &&
            parseFloat(repsInput.value) > 0 &&
            parseFloat(weightInput.value) > 0;
        saveButton.disabled = !isValid; // Deshabilitar si no es válido
    };

    // Llamar a la función de validación y habilitar el botón al inicio
    toggleSaveButton();

    // Llamar a la función para validar en tiempo real
    seriesInput.addEventListener("input", toggleSaveButton);
    repsInput.addEventListener("input", toggleSaveButton);
    weightInput.addEventListener("input", toggleSaveButton);

    // Configurar evento para eliminar ejercicio
    const deleteButton = container.querySelector(".delete-exercise");
    deleteButton.addEventListener("click", () => {
        Swal.fire({
            title: `¿Estás seguro de eliminar el ejercicio "${exercise.name}"?`,
            text: 'No podrás deshacer esta acción.',
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar",
        }).then((result) => {
            if (result.isConfirmed) {
                deleteExerciseFromRoutine(day, index, exercises);
            }
        });
    });
}

// Modificar el evento de guardar cambios para validar antes de cerrar el popup
saveButton.addEventListener("click", () => {
    let valid = true;

    exercises.forEach((exercise, index) => {
        const seriesInput = document.getElementById(`series-${index}`);
        const repsInput = document.getElementById(`reps-${index}`);
        const weightInput = document.getElementById(`weight-${index}`);

        if (parseFloat(seriesInput.value) <= 0 || parseFloat(repsInput.value) <= 0 || parseFloat(weightInput.value) <= 0) {
            valid = false;
        }
    });

    if (valid) {
        saveChanges(day, exercises);
        popup.classList.add("hidden");
    } else {
        Swal.fire("Error", "Corrige los valores en 0 o negativos antes de guardar.", "error");
    }
});

const inputElement = document.getElementById("my-input");
inputElement.addEventListener("input", preventNegativeValues);

async function saveChanges(day, exercises) {
    try {
        const routinesRef = collection(db, "routines");
        const q = query(routinesRef, where("day", "==", day));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.size === 1) {
            const routineDoc = querySnapshot.docs[0];
            const existingExercises = routineDoc.data().exercises || [];

            let hasChanges = false; // Bandera para verificar si hubo cambios

            exercises.forEach((exercise, index) => {
                const additionalDataInput = document.getElementById(`additionalData-${index}`);
                if (additionalDataInput) {
                    exercise.additionalData = additionalDataInput.value || "";
                }

                // Comparar cada campo con el valor actual en la base de datos
                const existingExercise = existingExercises[index] || {};
                if (
                    exercise.series !== existingExercise.series ||
                    exercise.repetitions !== existingExercise.repetitions ||
                    exercise.weight !== existingExercise.weight ||
                    exercise.additionalData !== existingExercise.additionalData
                ) {
                    hasChanges = true;
                }
            });

            if (!hasChanges) {
                Swal.fire("Sin cambios", "No se han realizado modificaciones.", "info");
                return;
            }

            await updateDoc(routineDoc.ref, { exercises });

            Swal.fire("Éxito", "La rutina se actualizó correctamente.", "success").then(() => {
                location.reload();
            });
        } else {
            console.error(`Se encontraron ${querySnapshot.size} documentos para el día ${day}`);
            Swal.fire("Error", "No se pudo actualizar la rutina.", "error");
        }
    } catch (error) {
        console.error("Error al guardar los cambios en la rutina:", error);
        Swal.fire("Error", "No se pudo guardar la rutina. Revisa la consola para más detalles.", "error");
    }
}

async function deleteExerciseFromRoutine(day, index, exercises) {
    try {
        // Elimina el ejercicio de la lista de ejercicios
        exercises.splice(index, 1);

        // Actualiza la rutina en Firestore
        await saveChanges(day, exercises);

        // Notificar al usuario sobre el éxito de la operación
        await Swal.fire({
            title: "Éxito",
            text: "El ejercicio ha sido eliminado.",
            icon: "success",
        });

        // Recargar la página después de la confirmación
        location.reload();
    } catch (error) {
        console.error("Error al eliminar el ejercicio:", error);
        Swal.fire("Error", "No se pudo eliminar el ejercicio. Revisa la consola para más detalles.", "error");
    }
}

async function deleteRoutine(day) {
    const user = JSON.parse(localStorage.getItem("currentUser"));
    const routinesRef = collection(db, "routines");
    const q = query(routinesRef, where("userId", "==", user.uid), where("day", "==", day));

    try {
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const routineDoc = querySnapshot.docs[0];

            // Eliminar la rutina directamente sin pedir confirmación nuevamente
            await deleteDoc(routineDoc.ref);

            // Notificar al usuario sobre el éxito de la operación
            Swal.fire({
                title: "Éxito",
                text: `La rutina para el día ${day} ha sido eliminada.`,
                icon: "success",
            }).then(() => location.reload()); // Recarga la página después de eliminar la rutina
        } else {
            Swal.fire({
                title: "Error",
                text: "No se encontró la rutina para el día especificado.",
                icon: "error",
            });
        }
    } catch (error) {
        Swal.fire({
            title: "Error",
            text: "Ocurrió un error al eliminar la rutina.",
            icon: "error",
        });
        console.error("Error al eliminar la rutina:", error);
    }
}