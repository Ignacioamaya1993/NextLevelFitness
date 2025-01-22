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

        const exercises = Array.isArray(routine.exercises) ? routine.exercises : [routine.exercises];
        grouped[day] = grouped[day].concat(exercises);
    });

    return grouped;
}

function openEditPopup(day, routines) {
    const popup = document.getElementById("edit-popup");
    const popupContent = document.getElementById("popup-content");
    const routine = routines.find(routine => routine.day === day);

    if (!routine) {
        popupContent.innerHTML = `<p>No se encontró la rutina para el día ${day}</p>`;
        popup.classList.remove("hidden");
        return;
    }

    const exercises = routine.exercises || [];
    popupContent.innerHTML = `
        <h3>Editar Rutina para el día ${day}</h3>
        <div id="edit-fields-container"></div>
        <button id="save-changes">Guardar cambios</button>
        <button id="close-popup">Cancelar</button>
    `;

    const editFieldsContainer = document.getElementById("edit-fields-container");
    exercises.forEach((exercise, index) => {
        renderEditFields(editFieldsContainer, exercise, index, day, exercises);
    });

    document.getElementById("save-changes").addEventListener("click", () => {
        saveChanges(day, exercises);
        popup.classList.add("hidden");
    });

    document.getElementById("close-popup").addEventListener("click", () => {
        popup.classList.add("hidden");
    });

    popup.classList.remove("hidden");
}

function renderEditFields(container, exercise, index, day, exercises) {
    const fieldSet = document.createElement("fieldset");
    fieldSet.innerHTML = `
        <legend>Ejercicio ${index + 1}</legend>
        <div>
            <label>Series:</label>
            <input type="number" value="${exercise.series || 1}" id="series-${index}" min="1">
        </div>
        <div>
            <label>Repeticiones:</label>
            <input type="number" value="${exercise.repetitions || 1}" id="reps-${index}" min="1">
        </div>
        <div>
            <label>Peso (kg):</label>
            <input type="number" value="${exercise.weight || 1}" id="weight-${index}" min="1">
        </div>
        <div>
            <label>Información adicional:</label>
            <textarea id="additionalData-${index}">${exercise.additionalData || ''}</textarea>
        </div>
        <button class="delete-exercise" data-index="${index}">Eliminar ejercicio</button>
    `;

    container.appendChild(fieldSet);

    fieldSet.querySelector(".delete-exercise").addEventListener("click", () => {
        Swal.fire({
            title: `¿Estás seguro de eliminar el ejercicio?`,
            text: "Esta acción no se puede deshacer.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar"
        }).then((result) => {
            if (result.isConfirmed) {
                exercises.splice(index, 1);
                fieldSet.remove();
            }
        });
    });
}

async function deleteRoutine(day) {
    const routineRef = query(collection(db, "routines"), where("day", "==", day));
    const querySnapshot = await getDocs(routineRef);

    querySnapshot.forEach(async (doc) => {
        await deleteDoc(doc.ref);
    });

    Swal.fire("Éxito", `La rutina para el día ${day} ha sido eliminada.`, "success");
    location.reload();
}

async function saveChanges(day, exercises) {
    const routineRef = query(collection(db, "routines"), where("day", "==", day));
    const querySnapshot = await getDocs(routineRef);

    querySnapshot.forEach(async (doc) => {
        await updateDoc(doc.ref, { exercises });
    });

    Swal.fire("Éxito", "Los cambios han sido guardados.", "success");
    location.reload();
}