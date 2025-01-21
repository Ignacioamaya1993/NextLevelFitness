import { db } from './firebaseConfig.js'; // Importa solo db
import { collection, getDocs, query, where, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

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
            <h3>Rutina para ${day}</h3>
            <ul>
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
        const popup = document.getElementById("edit-popup");
        if (event.key === "Escape" && !popup.classList.contains("hidden")) {
            popup.classList.add("hidden");
        }
    });    

    // Limpia el contenido previo del popup
    popupContent.innerHTML = "";

    // Encuentra la rutina correspondiente al día seleccionado
    const routine = routines.find(routine => routine.day === day);

    console.log('Rutina seleccionada:', routine);  // Verifica qué contiene la rutina

    if (!routine) {
        popupContent.innerHTML = `<p>No se encontró la rutina para el día ${day}</p>`;
        popup.classList.remove("hidden");
        return;
    }

    // Verifica si exercises existe y es un array
    if (!routine.exercises || !Array.isArray(routine.exercises)) {
        console.error("No se encontraron ejercicios en la rutina:", routine);
        popupContent.innerHTML = `<p>No hay ejercicios disponibles para la rutina de ${day}</p>`;
        popup.classList.remove("hidden");
        return;
    }

    const exercises = routine.exercises;  // Accede a los ejercicios si es un array

    console.log('Ejercicios de la rutina:', exercises);  // Verifica los ejercicios

    // Crear encabezado
    const header = document.createElement("h3");
    header.textContent = `Editar Rutina para ${day}`;
    popupContent.appendChild(header);

    // Crear selector de ejercicios con todos los ejercicios de la rutina
    const exerciseSelect = document.createElement("select");
    exerciseSelect.id = "exercise-select";

    // Verifica si hay ejercicios y genera las opciones
    if (exercises.length > 0) {
        exerciseSelect.innerHTML = exercises.map((exercise, index) => `
            <option value="${index}">${exercise.name || `Ejercicio ${index + 1}`}</option>
        `).join('');
    }

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
    closeButton.textContent = "Cancelar";
    popupContent.appendChild(closeButton);

    // Mostrar el popup
    popup.classList.remove("hidden");

    // Mostrar campos de edición al seleccionar un ejercicio
    exerciseSelect.addEventListener("change", () => {
        const selectedIndex = parseInt(exerciseSelect.value, 10);
        const selectedExercise = exercises[selectedIndex];
        renderEditFields(editFieldsContainer, selectedExercise, selectedIndex, day, exercises);
    });

    // Inicializar con el primer ejercicio
    renderEditFields(editFieldsContainer, exercises[0], 0, day, exercises);

    saveButton.addEventListener("click", () => {
        exercises.forEach((exercise, index) => {
            exercise.series = parseInt(document.getElementById(`series-${index}`).value, 10);
            exercise.repetitions = parseInt(document.getElementById(`reps-${index}`).value, 10);
            exercise.weight = parseFloat(document.getElementById(`weight-${index}`).value);
            exercise.additionalData = document.getElementById(`additionalData-${index}`).value;
        });

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
                <input type="number" value="${exercise.series != null ? exercise.series : 1}" id="series-${index}" min="1">
            </div>
            <div>
                <label>Repeticiones:</label>
                <input type="number" value="${exercise.repetitions != null ? exercise.repetitions : 1}" id="reps-${index}" min="1">
            </div>
            <div>
                <label>Peso (kg):</label>
                <input type="number" value="${exercise.weight != null ? exercise.weight : 1}" id="weight-${index}" min="1" step="0.01">
            </div>
            <div>
                <label>Información adicional:</label>
                <input type="text" value="${exercise.additionalData != null ? exercise.additionalData : ''}" id="additionalData-${index}">
            </div>
        <button class="delete-exercise" data-index="${index}">Eliminar ejercicio</button>
    `;

    // Configurar evento para eliminar ejercicio
    const deleteButton = container.querySelector(".delete-exercise");
    deleteButton.addEventListener("click", () => {
        Swal.fire({
            title: `¿Estás seguro de eliminar el ejercicio "${exercise.name}"?`,
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

function preventNegativeValues(index) {
    const seriesInput = document.getElementById(`series-${index}`);
    const repsInput = document.getElementById(`reps-${index}`);
    const weightInput = document.getElementById(`weight-${index}`);

    [seriesInput, repsInput, weightInput].forEach((input) => {
        if (input) {
            // Eliminar el carácter '-' mientras el usuario escribe
            input.addEventListener("input", () => {
                if (input.value.includes("-")) {
                    input.value = input.value.replace("-", "");
                }
            });

            // Validar el valor al salir del campo (blur)
            input.addEventListener("blur", () => {
                if (input.value === "" || parseFloat(input.value) <= 0) {
                    Swal.fire({
                        title: "Error",
                        text: "El valor debe ser mayor a 0.",
                        icon: "error",
                    });
                    input.value = 1; // Reestablece el valor a 1 si es inválido
                }
            });
        }
    });
}

async function saveChanges(day, exercises) {
    const user = JSON.parse(localStorage.getItem("currentUser"));
    const routinesRef = collection(db, "routines");
    const q = query(routinesRef, where("userId", "==", user.uid), where("day", "==", day));

    try {
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const routineDoc = querySnapshot.docs[0];
            console.log("Documento encontrado:", routineDoc);
            console.log("Ejercicios a guardar:", exercises);

            const validExercises = [];
            let hasErrors = false;
            let hasChanges = false;

            exercises.forEach((exercise, index) => {
                preventNegativeValues(index); // Prevenir valores negativos

                const seriesInput = document.getElementById(`series-${index}`);
                const repsInput = document.getElementById(`reps-${index}`);
                const weightInput = document.getElementById(`weight-${index}`);
                const additionalDataInput = document.getElementById(`additionalData-${index}`);

                if (seriesInput && repsInput && weightInput && additionalDataInput) {
                    const series = parseInt(seriesInput.value, 10) || 0;
                    const repetitions = parseInt(repsInput.value, 10) || 0;
                    const weight = parseFloat(weightInput.value) || 0;
                    const additionalData = additionalDataInput.value || "";

                    // Validar si los valores son válidos
                    if (series <= 0 || repetitions <= 0 || weight <= 0) {
                        if (series <= 0) seriesInput.setCustomValidity("El valor de series debe ser mayor a 0.");
                        if (repetitions <= 0) repsInput.setCustomValidity("El valor de repeticiones debe ser mayor a 0.");
                        if (weight <= 0) weightInput.setCustomValidity("El valor de peso debe ser mayor a 0.");
                        hasErrors = true;
                        return; // Detener el procesamiento de este ejercicio
                    }

                    // Comparar los valores iniciales con los actuales solo si al menos uno de los campos cambia
                    if (
                        series !== exercise.series ||
                        repetitions !== exercise.repetitions ||
                        weight !== exercise.weight ||
                        additionalData !== (exercise.additionalData || "")
                    ) {
                        hasChanges = true; // Detectar si hubo algún cambio
                    }

                    // Actualizar el objeto ejercicio con los nuevos valores
                    exercise.series = series;
                    exercise.repetitions = repetitions;
                    exercise.weight = weight;
                    exercise.additionalData = additionalData;
                    validExercises.push(exercise);
                } else {
                    console.warn(`Faltan inputs para el ejercicio ${index}, se omitirá.`);
                }
            });

            if (hasErrors) {
                Swal.fire({
                    title: "Error",
                    text: "Por favor corrige los campos con valores inválidos.",
                    icon: "error",
                });
                return; // Si hay errores, no continuar con la actualización
            }

            if (!hasChanges) {
                // Mostrar mensaje si no hubo cambios
                Swal.fire({
                    title: "Sin cambios",
                    text: "No se detectaron modificaciones en los campos.",
                    icon: "info",
                });
                return;
            }

            console.log("Ejercicios válidos a actualizar:", validExercises);

            if (validExercises.length > 0) {
                await updateDoc(routineDoc.ref, { exercises: validExercises });
                Swal.fire({
                    title: "Éxito",
                    text: "Cambios guardados exitosamente.",
                    icon: "success",
                }).then(() => location.reload());
            } else {
                Swal.fire({
                    title: "Sin cambios",
                    text: "No hay ejercicios válidos para guardar.",
                    icon: "info",
                });
            }
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
            text: "Ocurrió un error al guardar los cambios.",
            icon: "error",
        });
        console.error("Error al guardar cambios:", error);
    }
}

// Para depuración, imprime todos los elementos con ID `series-`
document.addEventListener("DOMContentLoaded", () => {
    console.log(
        "IDs de series generados en el DOM:",
        [...document.querySelectorAll('[id^="series-"]')].map(el => el.id)
    );
});

async function deleteExerciseFromRoutine(day, index, exercises) {
    const user = JSON.parse(localStorage.getItem("currentUser"));
    const routinesRef = collection(db, "routines");
    const q = query(routinesRef, where("userId", "==", user.uid), where("day", "==", day));

    try {
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const routineDoc = querySnapshot.docs[0];
            exercises.splice(index, 1);

            if (exercises.length === 0) {
                // Si no hay ejercicios restantes, eliminar la rutina completa
                Swal.fire({
                    title: `¿Estás seguro de eliminar la rutina para el día ${day}?`,
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonText: "Sí, eliminar",
                    cancelButtonText: "Cancelar",
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        await deleteDoc(routineDoc.ref);
                        Swal.fire({
                            title: "Éxito",
                            text: `La rutina para el día ${day} ha sido eliminada.`,
                            icon: "success",
                        }).then(() => location.reload());
                    }
                });
            } else {
                // Si quedan ejercicios, actualizar la rutina con la lista modificada
                await updateDoc(routineDoc.ref, { exercises: exercises });
                Swal.fire({
                    title: "Éxito",
                    text: "Ejercicio eliminado correctamente.",
                    icon: "success",
                }).then(() => location.reload());
            }
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
            text: "Ocurrió un error al eliminar el ejercicio o la rutina.",
            icon: "error",
        });
        console.error("Error al eliminar el ejercicio o la rutina:", error);
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

            // Confirmar eliminación
            Swal.fire({
                title: `¿Estás seguro de eliminar la rutina completa para el día ${day}?`,
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Sí, eliminar",
                cancelButtonText: "Cancelar",
            }).then(async (result) => {
                if (result.isConfirmed) {
                    await deleteDoc(routineDoc.ref);
                    Swal.fire({
                        title: "Éxito",
                        text: `La rutina para el día ${day} ha sido eliminada.`,
                        icon: "success",
                    }).then(() => location.reload());
                }
            });
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