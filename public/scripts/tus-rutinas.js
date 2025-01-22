import { db } from './firebaseConfig.js';
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

    Object.keys(groupedRoutines).forEach(day => {
        const routineCard = document.createElement("div");
        routineCard.classList.add("routine-card");

        const exercisesList = groupedRoutines[day].map((exercise, index) => `
            <li>${exercise.name || "Ejercicio sin nombre"} - 
                ${exercise.series || 0} series, 
                ${exercise.repetitions || 0} reps, 
                ${exercise.weight || 0} kg
            </li>
        `).join('');

        routineCard.innerHTML = `
            <h3>Rutina para el día ${day}</h3>
            <ul>${exercisesList}</ul>
            <button class="edit-button" data-day="${day}">Editar</button>
            <button class="delete-button" data-day="${day}">Eliminar</button>
        `;

        routineList.appendChild(routineCard);
    });

    document.querySelectorAll(".edit-button").forEach((button) =>
        button.addEventListener("click", (e) => {
            openEditPopup(e.target.dataset.day, routines);
        })
    );

    document.querySelectorAll(".delete-button").forEach((button) =>
        button.addEventListener("click", async (e) => {
            const day = e.target.dataset.day;
            Swal.fire({
                title: `¿Eliminar rutina para el día ${day}?`,
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

function openEditPopup(day, routines) {
    const popup = document.getElementById("edit-popup");
    const popupContent = document.getElementById("popup-content");

    const routine = routines.find(routine => routine.day === day);
    if (!routine || !routine.exercises) {
        popupContent.innerHTML = `<p>No se encontró la rutina para el día ${day}</p>`;
        popup.classList.remove("hidden");
        return;
    }

    popupContent.innerHTML = `
        <h3>Editar Rutina para el día ${day}</h3>
        <select id="exercise-select">
            ${routine.exercises.map((exercise, index) => `<option value="${index}">${exercise.name || `Ejercicio ${index + 1}`}</option>`).join('')}
        </select>
        <div id="edit-fields-container"></div>
        <button id="save-changes">Guardar cambios</button>
        <button id="close-popup">Cancelar</button>
    `;

    const exerciseSelect = document.getElementById("exercise-select");
    const editFieldsContainer = document.getElementById("edit-fields-container");

    exerciseSelect.addEventListener("change", () => {
        renderEditFields(editFieldsContainer, routine.exercises[exerciseSelect.value], exerciseSelect.value, day, routine.exercises);
    });

    renderEditFields(editFieldsContainer, routine.exercises[0], 0, day, routine.exercises);

    document.getElementById("save-changes").addEventListener("click", () => {
        saveChanges(day, routine.exercises);
        popup.classList.add("hidden");
    });

    document.getElementById("close-popup").addEventListener("click", () => {
        popup.classList.add("hidden");
    });

    popup.classList.remove("hidden");
}

function renderEditFields(container, exercise, index, day, exercises) {
    container.innerHTML = `
        <label>Series:</label>
        <input type="number" id="series-${index}" value="${exercise.series || ''}" min="1">
        <span id="error-series-${index}" class="error-message"></span>

        <label>Repeticiones:</label>
        <input type="number" id="reps-${index}" value="${exercise.repetitions || ''}" min="1">
        <span id="error-reps-${index}" class="error-message"></span>

        <label>Peso (kg):</label>
        <input type="number" id="weight-${index}" value="${exercise.weight || ''}" min="1">
        <span id="error-weight-${index}" class="error-message"></span>

        <button class="delete-exercise" data-index="${index}">Eliminar ejercicio</button>
    `;

    document.querySelector(".delete-exercise").addEventListener("click", () => {
        deleteExerciseFromRoutine(day, index, exercises);
    });

    document.querySelectorAll("input[type='number']").forEach(input => {
        input.addEventListener("input", (event) => {
            if (event.target.value < 1) {
                event.target.value = 1;
            }
        });
    });
}

async function deleteExerciseFromRoutine(day, index, exercises) {
    exercises.splice(index, 1);
    await saveChanges(day, exercises);
    location.reload();
}

async function saveChanges(day, exercises) {
    try {
        const routinesRef = collection(db, "routines");
        const q = query(routinesRef, where("day", "==", day));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.size === 1) {
            await updateDoc(querySnapshot.docs[0].ref, { exercises });
            Swal.fire("Éxito", "Rutina actualizada.", "success").then(() => location.reload());
        }
    } catch (error) {
        console.error("Error al guardar cambios:", error);
    }
}
