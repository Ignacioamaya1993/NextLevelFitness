document.addEventListener("DOMContentLoaded", () => {
    const user = JSON.parse(localStorage.getItem("currentUser"));
    const restrictedMessage = document.getElementById("restricted-message");
    const routineViewer = document.getElementById("routine-viewer");
    const noRoutinesMessage = document.getElementById("no-routines-message");

    if (user && user.isLoggedIn) {
        // Usuario logueado: mostrar la sección de rutinas
        restrictedMessage.classList.add("hidden");
        routineViewer.classList.remove("hidden");

        if (user.routines && user.routines.length > 0) {
            // Mostrar rutinas creadas
            noRoutinesMessage.classList.add("hidden");
            displayUserRoutines(user.routines);
        } else {
            // Mostrar mensaje: no hay rutinas creadas
            noRoutinesMessage.classList.remove("hidden");
        }
    } else {
        // Usuario no logueado: mostrar mensaje restrictivo
        restrictedMessage.classList.remove("hidden");
        routineViewer.classList.add("hidden");
    }
});

function displayUserRoutines(routines) {
    const routineList = document.getElementById("routine-list");
    routineList.innerHTML = "";

    routines.forEach((routine, index) => {
        const routineCard = document.createElement("div");
        routineCard.classList.add("routine-card");

        routineCard.innerHTML = `
            <h3>Rutina para ${routine.days.join(", ")}</h3>
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
    });

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