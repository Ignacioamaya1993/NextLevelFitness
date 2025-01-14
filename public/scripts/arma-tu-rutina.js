import app from './firebaseConfig.js';
import { getFirestore, collection, doc, getDocs, query } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
    const db = getFirestore(app);

    const user = JSON.parse(localStorage.getItem("currentUser"));
    const restrictedMessage = document.getElementById("restricted-message");
    const routineBuilder = document.getElementById("routine-builder");
    const categoryFilter = document.getElementById("category-filter");
    const exerciseGrid = document.getElementById("exercise-grid");
    const searchBar = document.getElementById("search-bar");

    if (user && user.isLoggedIn) {
        restrictedMessage.classList.add("hidden");
        routineBuilder.classList.remove("hidden");

        // Cargar categorías en el filtro
        await loadCategories(db, categoryFilter);

        // Cargar ejercicios iniciales
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

async function loadCategories(db, categoryFilter) {
    try {
        const categoriesRef = collection(db, "categories");
        const categoriesSnapshot = await getDocs(categoriesRef);

        categoriesSnapshot.forEach((categoryDoc) => {
            const categoryName = categoryDoc.id;
            const option = document.createElement("option");
            option.value = categoryName;
            option.textContent = categoryName;
            categoryFilter.appendChild(option);
        });

        console.log("Categorías cargadas correctamente.");
    } catch (error) {
        console.error("Error al cargar categorías:", error);
    }
}

async function loadExercises(db, exerciseGrid, category = "all", searchQuery = "") {
    exerciseGrid.innerHTML = ""; // Limpiar ejercicios existentes

    try {
        const categoriesRef = collection(db, "categories");
        const categoriesSnapshot = await getDocs(categoriesRef);

        for (const categoryDoc of categoriesSnapshot.docs) {
            const categoryName = categoryDoc.id;

            if (category !== "all" && category !== categoryName) {
                continue;
            }

            const exercisesRef = collection(db, `categories/${categoryName}`);
            const exercisesSnapshot = await getDocs(exercisesRef);

            exercisesSnapshot.forEach((exerciseDoc) => {
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

        console.log("Ejercicios cargados correctamente.");
    } catch (error) {
        console.error("Error al cargar ejercicios:", error);
    }
}
