import app from './firebaseConfig.js';
import { getFirestore, collection, doc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

// Se ejecuta cuando el DOM está completamente cargado
document.addEventListener("DOMContentLoaded", async () => {
    // Inicializamos la base de datos de Firebase
    const db = getFirestore(app);

    // Elementos del DOM
    const user = JSON.parse(localStorage.getItem("currentUser"));
    const restrictedMessage = document.getElementById("restricted-message");
    const routineBuilder = document.getElementById("routine-builder");
    const categoryFilter = document.getElementById("category-filter");
    const exerciseGrid = document.getElementById("exercise-grid");
    const searchBar = document.getElementById("search-bar");

    // Verificar si el usuario está logueado
    if (user && user.isLoggedIn) {
        restrictedMessage.classList.add("hidden");
        routineBuilder.classList.remove("hidden");

        // Cargar ejercicios desde Firestore
        await loadExercises(db, exerciseGrid);

        // Filtros de categoría y búsqueda
        categoryFilter.addEventListener("change", async () => {
            const selectedCategory = categoryFilter.value;
            await loadExercises(db, exerciseGrid, selectedCategory, searchBar.value);
        });

        searchBar.addEventListener("input", async () => {
            const selectedCategory = categoryFilter.value;
            await loadExercises(db, exerciseGrid, selectedCategory, searchBar.value);
        });
    } else {
        restrictedMessage.classList.remove("hidden");
        routineBuilder.classList.add("hidden");
    }
});

// Función para cargar los ejercicios desde Firestore
async function loadExercises(db, exerciseGrid, category = "all", searchQuery = "") {
    exerciseGrid.innerHTML = ""; // Limpiar ejercicios existentes

    const categoriesCollection = collection(db, "categories");
    let exercisesQuery;

    // Filtrar por categoría si no es "all"
    if (category !== "all") {
        exercisesQuery = query(categoriesCollection, where("__name__", "==", category));
    } else {
        exercisesQuery = categoriesCollection;
    }

    const categoryDocs = await getDocs(exercisesQuery);

    // Iterar sobre las categorías y sus ejercicios
    for (const categoryDoc of categoryDocs.docs) {
        const categoryName = categoryDoc.id;
        const exercisesRef = collection(db, `categories/${categoryName}`);
        const exerciseDocs = await getDocs(exercisesRef);

        exerciseDocs.forEach((exerciseDoc) => {
            const exercise = exerciseDoc.data();
            const exerciseName = exerciseDoc.id;

            // Filtrar por búsqueda
            if (searchQuery && !exerciseName.toLowerCase().includes(searchQuery.toLowerCase())) {
                return;
            }

            // Crear el elemento HTML para el ejercicio
            const exerciseCard = document.createElement("div");
            exerciseCard.classList.add("exercise-card");
            exerciseCard.innerHTML = `
                <img src="${exercise.imagen}" alt="${exercise.nombre}">
                <h3>${exercise.nombre}</h3>
                <button onclick="showExerciseDetails('${exercise.nombre}', '${exercise.video}', '${exercise.instrucciones}')">Ver más</button>
            `;
            exerciseGrid.appendChild(exerciseCard);
        });
    }
}

// Función para mostrar los detalles de un ejercicio
function showExerciseDetails(name, video, instructions) {
    Swal.fire({
        title: name,
        html: `
            <video controls>
                <source src="${video}" type="video/mp4">
                Tu navegador no soporta el video.
            </video>
            <p>${instructions}</p>
        `,
        confirmButtonText: "Cerrar",
    });
}