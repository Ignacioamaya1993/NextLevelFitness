import { db } from './firebaseConfig.js'; // Importa solo db
import { collection, getDocs, query, where, updateDoc, deleteDoc, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
    const user = JSON.parse(localStorage.getItem("currentUser"));
    const restrictedMessage = document.getElementById("restricted-message");
    const routineViewer = document.getElementById("routine-viewer");
    const noRoutinesMessage = document.getElementById("no-routines-message");
    const overlay = document.getElementById("overlay");
    const downloadButton = document.getElementById("download-pdf"); // Obtener el botón de descarga


    overlay.addEventListener("click", (e) => {
        e.stopPropagation(); // Evitar que el clic pase al fondo
    });

    if (user && user.isLoggedIn) {
        restrictedMessage.classList.add("hidden");
        routineViewer.classList.remove("hidden");

        // Mostrar el botón de descarga si el usuario está logueado
        downloadButton.style.display = "block";

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
        // Ocultar el botón de descarga si el usuario no está logueado
        downloadButton.style.display = "none";
    }
});

async function getUserRoutines(userId) {
    try {
        const routinesRef = collection(db, "routines");
        const q = query(routinesRef, where("userId", "==", userId));

        // Intentar obtener los datos desde caché primero
        let querySnapshot = await getDocs(q, { source: "cache" });

        if (querySnapshot.empty) {
            console.log("No hay datos en caché, obteniendo desde Firestore...");
            querySnapshot = await getDocs(q, { source: "server" }); // Consultar Firestore si la caché está vacía
        }

        const routines = [];
        querySnapshot.forEach((doc) => {
            routines.push({ ...doc.data(), id: doc.id });
        });

        return routines;
    } catch (error) {
        console.error("Error obteniendo rutinas:", error);
        return [];
    }
}

function groupRoutinesByDay(routines) {
    const daysOrder = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    const grouped = {};

    routines.forEach((routine) => {
        let day = routine.day || "Día no especificado";

        // Verificar si el día está en el array permitido
        if (!daysOrder.includes(day)) {
            day = "Día no especificado";
        }

        if (!grouped[day]) {
            grouped[day] = [];
        }
        const exercises = Array.isArray(routine.exercises) ? routine.exercises : [routine.exercises];
        grouped[day] = grouped[day].concat(exercises);
    });

    // Reordenar los días según el orden establecido
    return Object.keys(grouped)
        .sort((a, b) => {
            const indexA = daysOrder.indexOf(a);
            const indexB = daysOrder.indexOf(b);

            // Si un día no está en el array, lo dejamos al final
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;

            return indexA - indexB;
        })
        .reduce((acc, day) => {
            acc[day] = grouped[day];
            return acc;
        }, {});
}

function isMobileDevice() {
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function displayUserRoutines(routines) {
    const routineList = document.getElementById("routine-list");
    routineList.innerHTML = "";

    // Agrupar las rutinas por día
    const groupedRoutines = groupRoutinesByDay(routines);
    let today = new Date().toLocaleDateString("es-ES", { weekday: "long" }).toLowerCase();

    if (isMobileDevice() && groupedRoutines[today]) {
        // En móvil, mostrar el día actual primero con diseño especial
        const todayRoutineCard = document.createElement("div");
        todayRoutineCard.classList.add("routine-card", "today-routine");

        const todayExercisesList = groupedRoutines[today]
            .map(exercise => {
                const name = exercise.name || "Ejercicio sin nombre";
                const exerciseId = exercise.id; // Agregar el ID del ejercicio
                const series = exercise.series || 0;
                const reps = exercise.repetitions || 0;
                const weight = exercise.weight || 0;
                const additionalData = exercise.additionalData || "Sin información adicional";
                return `<li>${name} - ${series} series, ${reps} reps, ${weight} kg, ${additionalData},
                data-id="${exerciseId}" class="exercise-item">${name}</li>`;
                
            })
            .join("");

        todayRoutineCard.innerHTML = `
            <h2 class="highlight-title">Esta es tu rutina para hoy (${today})</h2>
            <ul class="exercise-list">
                ${todayExercisesList}
            </ul>
            <button class="edit-button" data-day="${today}">Editar</button>
            <button class="delete-button" data-day="${today}">Eliminar</button>
        `;

        routineList.appendChild(todayRoutineCard);
        delete groupedRoutines[today]; // Eliminar el día actual de la lista para no repetirlo
    }

    // En escritorio, resaltar el día actual sin cambiar el orden
    Object.keys(groupedRoutines).forEach(day => {
        const routineCard = document.createElement("div");
        routineCard.classList.add("routine-card");

        // Si es el día actual, agregar la clase para resaltarlo en escritorio
        if (!isMobileDevice() && day === today) {
            routineCard.classList.add("today-routine");
        }

        const exercisesList = groupedRoutines[day]
            .map(exercise => {
                const name = exercise.name || "Ejercicio sin nombre";
                const exerciseId = exercise.id; // Agregar el ID del ejercicio
                const series = exercise.series || 0;
                const reps = exercise.repetitions || 0;
                const weight = exercise.weight || 0;
                const additionalData = exercise.additionalData || "Sin información adicional";
                return `<li>${name} - ${series} series, ${reps} reps, ${weight} kg, ${additionalData},
                data-id="${exerciseId}" class="exercise-item">${name}</li>`;
            })
            .join("");

        routineCard.innerHTML = `
            <h3>${day === today ? `Esta es tu rutina para hoy (${today})` : `Rutina para el día ${day}`}</h3>
            <ul class="exercise-list">
                ${exercisesList}
            </ul>
            <button class="edit-button" data-day="${day}">Editar</button>
            <button class="delete-button" data-day="${day}">Eliminar</button>
        `;

        routineList.appendChild(routineCard);
    });

    // Agregar event listener para los ejercicios
    document.querySelectorAll('.exercise-item').forEach(item => {
        item.addEventListener('click', async (e) => {
            const exerciseId = e.target.getAttribute('data-id');
            const exerciseDetails = await getExerciseDetails(exerciseId);
            if (exerciseDetails) {
                showExerciseDetails(exerciseDetails.name, exerciseDetails.video, exerciseDetails.instructions);
            }
        });
    });
}

async function getExerciseDetails(exerciseId) {
    try {
        const exerciseRef = collection(db, "categories");
        const q = query(exerciseRef, where("id", "==", exerciseId));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const exerciseDoc = querySnapshot.docs[0].data();
            return {
                name: exerciseDoc.name,
                video: exerciseDoc.video,
                instructions: exerciseDoc.instructions
            };
        } else {
            console.error("Ejercicio no encontrado");
            return null;
        }
    } catch (error) {
        console.error("Error obteniendo los detalles del ejercicio:", error);
        return null;
    }
}

    // Llamar a la función de descarga solo después de que las rutinas estén disponibles
    const downloadButton = document.getElementById("download-pdf");
    downloadButton.addEventListener("click", () => {
        downloadRoutinesAsPDF(groupedRoutines); // Pasar las rutinas agrupadas como parámetro
    });

    // Asignar los event listeners después de que el contenido se haya cargado
    addEventListenersToButtons();

    // Función que agrega los event listeners
    function addEventListenersToButtons() {
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

    // Función que genera y descarga el PDF
    function downloadRoutinesAsPDF(groupedRoutines) {
        const { jsPDF } = window.jspdf; // Usar jsPDF

        const doc = new jsPDF();
        let yPosition = 10;
        doc.setFontSize(16);
        doc.text("Rutinas de Ejercicio", 10, yPosition);

        // Para cada día de la rutina
        for (const day in groupedRoutines) {
            const exercises = groupedRoutines[day];

            // Título del día
            yPosition += 10;
            doc.setFontSize(12);
            doc.text(`Rutina para el día ${day}`, 10, yPosition);

            // Agregar los ejercicios
            exercises.forEach(exercise => {
                yPosition += 8;
                doc.setFontSize(10);
                const name = exercise.name || "Ejercicio sin nombre";
                const series = exercise.series || 0;
                const reps = exercise.repetitions || 0;
                const weight = exercise.weight || 0;
                const additionalData = exercise.additionalData || "Sin información adicional";
                doc.text(`${name} - ${series} series, ${reps} reps, ${weight} kg, ${additionalData}`, 10, yPosition);
            });

            // Si el contenido se está saliendo de la página, añadir una nueva página
            if (yPosition > 270) {
                doc.addPage();
                yPosition = 10;
            }
        }

        // Descargar el archivo PDF
        doc.save("rutinas.pdf");
    }

function openEditPopup(day, routines) {
    const popup = document.getElementById("edit-popup");
    const popupContent = document.getElementById("popup-content");

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !popup.classList.contains("hidden")) {
            closePopup();
        }
    
        if (event.key === "Enter" && !popup.classList.contains("hidden")) {
            event.preventDefault();  // Previene el comportamiento por defecto
            saveChanges();  // Guarda los cambios
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

    closeButton.addEventListener("click", () => {
        console.log("Botón cancelar presionado");
        closePopup();
    });
    
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

    exercises.forEach((_, index) => {
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

async function guardarHistorialPeso(userId, ejercicioID, nuevoPeso) {
    try {
        const historialRef = collection(db, `usuarios/${userId}/historialPesos`);

        await addDoc(historialRef, {
            ejercicioID: ejercicioID,
            peso: nuevoPeso,
            fecha: Timestamp.now()
        });

        console.log(`Historial guardado: Usuario ${userId}, Ejercicio ${ejercicioID}, Peso ${nuevoPeso} kg.`);
    } catch (error) {
        console.error("Error al guardar el historial de peso:", error);
    }
}

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
            
                const seriesInput = document.getElementById(`series-${index}`);
                const repsInput = document.getElementById(`reps-${index}`);
                const weightInput = document.getElementById(`weight-${index}`);
            
                if (!seriesInput || !repsInput || !weightInput) {
                    console.error(`No se encontraron los elementos de entrada para el ejercicio en el índice ${index}`);
                    return; // Salta este ejercicio y pasa al siguiente
                }
            
                const newSeries = parseInt(seriesInput.value, 10);
                const newReps = parseInt(repsInput.value, 10);
                const newWeight = parseFloat(weightInput.value);
                const newAdditionalData = exercise.additionalData;

                // Valores actuales en la base de datos
                const existingExercise = existingExercises[index] || {};
                const existingSeries = existingExercise.series || 0;
                const existingReps = existingExercise.repetitions || 0;
                const existingWeight = existingExercise.weight || 0;
                const existingAdditionalData = existingExercise.additionalData || "";

                // Mostrar en consola los valores antes y después de la modificación
                console.log(`Ejercicio ${index + 1}:`);
                console.log(`  Series: ${existingSeries} -> ${newSeries}`);
                console.log(`  Repeticiones: ${existingReps} -> ${newReps}`);
                console.log(`  Peso: ${existingWeight} -> ${newWeight}`);
                console.log(`  Información adicional: "${existingAdditionalData}" -> "${newAdditionalData}"`);

                // Verificar si algún valor ha cambiado
                if (
                    newSeries !== existingSeries ||
                    newReps !== existingReps ||
                    newWeight !== existingWeight ||
                    newAdditionalData !== existingAdditionalData
                ) {
                    hasChanges = true;
                }

                // Actualizar los valores en el objeto exercises
                exercise.series = newSeries;
                exercise.repetitions = newReps;
                exercise.weight = newWeight;
                exercise.additionalData = newAdditionalData;
            });

            if (!hasChanges) {
                console.warn("No se detectaron cambios en los ejercicios.");
                Swal.fire("Sin cambios", "No se han realizado modificaciones.", "info");
                return;
            }

            console.log("Se detectaron cambios, procediendo con la actualización...");

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
        // Elimina el ejercicio de la lista
        exercises.splice(index, 1);

        const routinesRef = collection(db, "routines");
        const q = query(routinesRef, where("day", "==", day));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.size === 1) {
            const routineDoc = querySnapshot.docs[0];

            if (exercises.length === 0) {
                // Si no quedan ejercicios, eliminar la rutina completa
                await deleteDoc(routineDoc.ref);
                Swal.fire("Éxito", "La rutina ha sido eliminada porque no tenía más ejercicios.", "success").then(() => {
                    location.reload(); // Espera a que el usuario haga clic en OK
                });
            } else {
                // Si aún hay ejercicios, actualizar Firestore
                await updateDoc(routineDoc.ref, { exercises });
                Swal.fire("Éxito", "El ejercicio ha sido eliminado correctamente.", "success").then(() => {
                    location.reload(); // Espera a que el usuario haga clic en OK
                });
            }
        } else {
            Swal.fire("Error", "No se encontró la rutina para actualizar.", "error");
        }
    } catch (error) {
        console.error("Error al eliminar el ejercicio:", error);
        Swal.fire("Error", "No se pudo eliminar el ejercicio. Revisa la consola para más detalles.", "error");
    }
}

// Función para eliminar la rutina
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