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
            <button class="edit-button" data-day="${day}">Editar</button> 
            <button class="delete-button">Eliminar</button>
        `;

        routineList.appendChild(routineCard);
    });

    // Asegúrate de añadir los event listeners después de añadir los botones
    const editButtons = routineList.querySelectorAll(".edit-button");
    const deleteButtons = routineList.querySelectorAll(".delete-button");

    editButtons.forEach((button) =>
        button.addEventListener("click", (e) => {
            const day = e.target.dataset.day;
            console.log("Editando rutina para el día:", day); // Añadir un console.log para verificar
            openEditPopup(day, routines);
        })
    );

    deleteButtons.forEach((button) =>
        button.addEventListener("click", (e) => {
            alert("Eliminar rutina (falta implementar)");
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

// Función para abrir el popup de edición
function openEditPopup(day, routines) {
    const popup = document.getElementById("edit-popup");
    const popupContent = document.getElementById("popup-content");

    console.log("Abriendo popup para el día:", day); // Añadir log aquí

    // Filtrar las rutinas para obtener las correspondientes al día
    const routine = routines.find(routine => routine.day === day);
    console.log("Rutina encontrada:", routine); // Verifica que la rutina exista

    if (!routine || !routine.exercise || !Array.isArray(routine.exercise) || routine.exercise.length === 0) {
        popupContent.innerHTML = `<p>No hay ejercicios para la rutina de ${day}</p>`;
        popup.classList.remove("hidden");
        return;  // Salir de la función si no hay ejercicios
    }

    const exercises = routine.exercise;
    console.log("Ejercicios para editar:", exercises); // Verifica que los ejercicios estén presentes

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
    console.log("Popup debería estar visible ahora");

    // Eventos para eliminar un ejercicio
    const deleteButtons = popup.querySelectorAll(".delete-exercise");
    deleteButtons.forEach(button => {
        button.addEventListener("click", async (e) => {
            const index = e.target.dataset.index;
            await deleteExerciseFromRoutine(day, index, exercises);
        });
    });

    // Evento para guardar los cambios
    document.getElementById("save-changes").addEventListener("click", () => {
        saveChanges(day, exercises);
    });

    // Evento para cerrar el popup
    document.getElementById("close-popup").addEventListener("click", () => {
        popup.classList.add("hidden");
    });
}

// Eliminar ejercicio de la rutina
async function deleteExerciseFromRoutine(day, index, exercises) {
    const exercise = exercises[index];
    const user = JSON.parse(localStorage.getItem("currentUser"));
    const routinesRef = collection(db, "routines");
    const q = query(routinesRef, where("userId", "==", user.uid), where("day", "==", day));

    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(async (doc) => {
        const routineDoc = doc.id;
        await updateDoc(doc.ref, {
            exercise: arrayRemove(exercise)
        });
    });

    alert(`Ejercicio "${exercise.name}" eliminado`);
}

// Guardar cambios realizados en los ejercicios
async function saveChanges(day, exercises) {
    const user = JSON.parse(localStorage.getItem("currentUser"));
    const routinesRef = collection(db, "routines");
    const q = query(routinesRef, where("userId", "==", user.uid), where("day", "==", day));

    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(async (doc) => {
        const routineDoc = doc.id;
        const updatedExercises = exercises.map((exercise, index) => ({
            ...exercise,
            series: document.getElementById(`series-${index}`).value,
            repetitions: document.getElementById(`reps-${index}`).value,
            weight: document.getElementById(`weight-${index}`).value
        }));

        await updateDoc(doc.ref, {
            exercise: updatedExercises
        });
    });

    alert("Cambios guardados");
}