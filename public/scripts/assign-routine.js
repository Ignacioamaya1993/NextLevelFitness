document.getElementById("search").addEventListener("input", (event) => {
    const query = event.target.value.toLowerCase();
    const users = [
        { name: "Agustín Soutrelle", email: "agustin@example.com" },
        { name: "María Pérez", email: "maria@example.com" },
    ]; // Datos simulados, reemplazar con Firebase

    const filteredUsers = users.filter(user => 
        user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query)
    );

    const userList = document.getElementById("user-list");
    userList.innerHTML = "";

    filteredUsers.forEach(user => {
        const li = document.createElement("li");
        li.textContent = `${user.name} (${user.email})`;
        li.addEventListener("click", () => selectUser(user));
        userList.appendChild(li);
    });
});

let selectedUser = null;

function selectUser(user) {
    selectedUser = user;
    alert(`Usuario seleccionado: ${user.name}`);
}

// Cargar ejercicios (simulado)
document.addEventListener("DOMContentLoaded", () => {
    const exercises = ["Sentadillas", "Flexiones", "Dominadas", "Plancha"]; // Datos simulados
    const exerciseList = document.getElementById("exercise-list");

    exercises.forEach(exercise => {
        const li = document.createElement("li");
        li.textContent = exercise;
        li.addEventListener("click", () => toggleExercise(li));
        exerciseList.appendChild(li);
    });
});

let selectedExercises = [];

function toggleExercise(li) {
    const exercise = li.textContent;
    if (selectedExercises.includes(exercise)) {
        selectedExercises = selectedExercises.filter(e => e !== exercise);
        li.style.backgroundColor = "";
    } else {
        selectedExercises.push(exercise);
        li.style.backgroundColor = "#d3f9d8";
    }
}

// Asignar rutina
document.getElementById("assign-routine-btn").addEventListener("click", () => {
    if (!selectedUser) {
        alert("Selecciona un usuario primero.");
        return;
    }

    if (selectedExercises.length === 0) {
        alert("Selecciona al menos un ejercicio.");
        return;
    }

    alert(`Rutina asignada a ${selectedUser.name}: ${selectedExercises.join(", ")}`);
    // Aquí se integrará Firebase para guardar los datos
});
