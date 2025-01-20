import { auth, db } from "./firebaseConfig.js"; // Asegúrate de tener la configuración

const userList = document.getElementById("user-list");
const exerciseList = document.getElementById("exercise-list");
const assignBtn = document.getElementById("assign-routine-btn");

let selectedUser = null;
let selectedExercises = [];

// 🔹 Obtener usuarios desde Firebase
function loadUsers() {
    db.collection("users").get().then((snapshot) => {
        userList.innerHTML = ""; // Limpiar lista antes de mostrar nuevos datos
        snapshot.forEach((doc) => {
            const user = doc.data();
            const li = document.createElement("li");
            li.textContent = `${user.name} (${user.email})`;
            li.addEventListener("click", () => selectUser(user, doc.id));
            userList.appendChild(li);
        });
    }).catch(error => console.error("Error al obtener usuarios:", error));
}

// 🔹 Seleccionar usuario
function selectUser(user, id) {
    selectedUser = { ...user, id };
    alert(`Usuario seleccionado: ${user.name}`);
}

// 🔹 Obtener ejercicios desde Firebase
function loadExercises() {
    db.collection("exercises").get().then((snapshot) => {
        exerciseList.innerHTML = ""; // Limpiar lista
        snapshot.forEach((doc) => {
            const exercise = doc.data();
            const li = document.createElement("li");
            li.textContent = exercise.name;
            li.addEventListener("click", () => toggleExercise(li, doc.id));
            exerciseList.appendChild(li);
        });
    }).catch(error => console.error("Error al obtener ejercicios:", error));
}

// 🔹 Seleccionar ejercicios
function toggleExercise(li, id) {
    const exerciseName = li.textContent;
    const exerciseData = { id, name: exerciseName };

    if (selectedExercises.some(e => e.id === id)) {
        selectedExercises = selectedExercises.filter(e => e.id !== id);
        li.style.backgroundColor = "";
    } else {
        selectedExercises.push(exerciseData);
        li.style.backgroundColor = "#d3f9d8";
    }
}

// 🔹 Asignar rutina en Firebase
assignBtn.addEventListener("click", () => {
    if (!selectedUser) {
        alert("Selecciona un usuario primero.");
        return;
    }

    if (selectedExercises.length === 0) {
        alert("Selecciona al menos un ejercicio.");
        return;
    }

    const routineData = {
        userId: selectedUser.id,
        userName: selectedUser.name,
        exercises: selectedExercises,
        createdAt: new Date()
    };

    db.collection("routines").add(routineData)
        .then(() => alert(`Rutina asignada a ${selectedUser.name}`))
        .catch(error => console.error("Error al asignar rutina:", error));
});

// 🔹 Cargar datos al inicio
document.addEventListener("DOMContentLoaded", () => {
    loadUsers();
    loadExercises();
});