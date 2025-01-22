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
            if (routines.length > 0) {
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

    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
}

function displayUserRoutines(routines) {
    const routineList = document.getElementById("routine-list");
    routineList.innerHTML = "";

    const groupedRoutines = groupRoutinesByDay(routines);
    
    Object.keys(groupedRoutines).forEach(day => {
        const routineCard = document.createElement("div");
        routineCard.classList.add("routine-card");

        const exercisesList = groupedRoutines[day].map(exercise => `
            <li>${exercise.name || "Ejercicio sin nombre"} - 
                ${exercise.series || 0} series, 
                ${exercise.repetitions || 0} reps, 
                ${exercise.weight || 0} kg, 
                ${exercise.additionalData || "Sin información adicional"}
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

    document.querySelectorAll(".edit-button").forEach(button =>
        button.addEventListener("click", (e) => openEditPopup(e.target.dataset.day, routines))
    );

    document.querySelectorAll(".delete-button").forEach(button =>
        button.addEventListener("click", async (e) => {
            const day = e.target.dataset.day;
            const confirm = await Swal.fire({
                title: `¿Estás seguro de eliminar la rutina para el día ${day}?`,
                text: "Esta acción no se puede deshacer.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Sí, eliminar",
                cancelButtonText: "Cancelar"
            });
            if (confirm.isConfirmed) deleteRoutine(day);
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

    popupContent.innerHTML = routine ? `
        <h3>Editar Rutina para el día ${day}</h3>
        <select id="exercise-select">
            ${routine.exercises.map((exercise, index) => `<option value="${index}">${exercise.name || `Ejercicio ${index + 1}`}</option>`).join('')}
        </select>
        <div id="edit-fields-container"></div>
        <button id="save-changes">Guardar cambios</button>
        <button id="close-popup">Cancelar</button>
    ` : `<p>No se encontró la rutina para el día ${day}</p>`;

    if (!routine) return popup.classList.remove("hidden");

    const editFieldsContainer = document.getElementById("edit-fields-container");
    const exerciseSelect = document.getElementById("exercise-select");
    
    function updateFields() {
        const index = parseInt(exerciseSelect.value, 10);
        renderEditFields(editFieldsContainer, routine.exercises[index], index, day, routine.exercises);
    }

    exerciseSelect.addEventListener("change", updateFields);
    updateFields();

    document.getElementById("save-changes").addEventListener("click", () => {
        saveChanges(day, routine.exercises);
        popup.classList.add("hidden");
    });

    document.getElementById("close-popup").addEventListener("click", () => popup.classList.add("hidden"));
    
    popup.classList.remove("hidden");
}

function renderEditFields(container, exercise, index, day, exercises) {
    container.innerHTML = `
        <label>Series:</label>
        <input type="number" id="series" value="${exercise.series || 0}" min="0">
        <label>Repeticiones:</label>
        <input type="number" id="repetitions" value="${exercise.repetitions || 0}" min="0">
        <label>Peso (kg):</label>
        <input type="number" id="weight" value="${exercise.weight || 0}" min="0">
        <label>Datos adicionales:</label>
        <input type="text" id="additionalData" value="${exercise.additionalData || ''}">
    `;

    document.getElementById("save-changes").onclick = function () {
        exercises[index] = {
            ...exercise,
            series: parseInt(document.getElementById("series").value, 10),
            repetitions: parseInt(document.getElementById("repetitions").value, 10),
            weight: parseFloat(document.getElementById("weight").value),
            additionalData: document.getElementById("additionalData").value
        };
        saveChanges(day, exercises);
    };
}

async function saveChanges(day, exercises) {
    try {
        const routinesRef = collection(db, "routines");
        const q = query(routinesRef, where("day", "==", day));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            await updateDoc(querySnapshot.docs[0].ref, { exercises });
            Swal.fire("Éxito", "La rutina se actualizó correctamente.", "success").then(() => location.reload());
        }
    } catch (error) {
        Swal.fire("Error", "No se pudo guardar la rutina.", "error");
        console.error("Error:", error);
    }
}

   // Configurar evento para eliminar ejercicio
   const deleteButton = container.querySelector(".delete-exercise");
   deleteButton.addEventListener("click", () => {
       Swal.fire({
           title: '¿Estás seguro de eliminar el ejercicio "${exercise.name}"?',
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
    const q = query(collection(db, "routines"), where("userId", "==", user.uid), where("day", "==", day));

    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        await deleteDoc(querySnapshot.docs[0].ref);
        Swal.fire("Éxito", `Rutina del día ${day} eliminada.`, "success").then(() => location.reload());
    }
}