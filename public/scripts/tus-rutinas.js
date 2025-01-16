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
    routineList.innerHTML = "";

    routines.forEach((routine, index) => {
        // Verifica si 'days' y 'exercises' son arreglos antes de procesarlos
        if (Array.isArray(routine.days) && Array.isArray(routine.exercises)) {
            const routineCard = document.createElement("div");
            routineCard.classList.add("routine-card");

            routineCard.innerHTML = `
                <h3>Rutina para ${routine.days.join(", ")}</h3>
                <p>Fecha: ${routine.date}</p>
                <ul>
                    ${routine.exercises
                        .map(
                            (exercise) => ` 
                        <li>
                            ${exercise.name} - ${exercise.series} series, ${exercise.repetitions} reps, ${exercise.weight} kg
                        </li>`
                        )
                        .join("")}
                </ul>
                <button class="edit-button" data-index="${index}">Editar</button>
                <button class="delete-button" data-index="${index}">Eliminar</button>
            `;

            routineList.appendChild(routineCard);
        } else {
            console.log("Datos de rutina incompletos o mal formateados");
        }
    });

    // Agregar funcionalidad a los botones de editar y eliminar
    const editButtons = routineList.querySelectorAll(".edit-button");
    const deleteButtons = routineList.querySelectorAll(".delete-button");

    editButtons.forEach((button) =>
        button.addEventListener("click", (e) => {
            const index = e.target.dataset.index;
            alert(`Editar rutina en posición ${index}`);
        })
    );

    deleteButtons.forEach((button) =>
        button.addEventListener("click", (e) => {
            const index = e.target.dataset.index;
            alert(`Eliminar rutina en posición ${index}`);
        })
    );
}
