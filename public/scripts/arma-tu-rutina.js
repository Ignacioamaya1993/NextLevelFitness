import app from './firebaseConfig.js';
import { getFirestore, collection, doc, getDocs, getDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

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

        // Limpiar opciones previas
        categoryFilter.innerHTML = "<option value='all'>Todas las categorías</option>";

        // Agregar categorías al filtro
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

    const categoriesRef = collection(db, "categories");

    try {
        let categoriesQuerySnapshot;
        if (category === "all") {
            // Recuperar todas las categorías
            categoriesQuerySnapshot = await getDocs(categoriesRef);
        } else {
            // Recuperar una categoría específica
            const categoryDocRef = doc(categoriesRef, category);
            const categoryDocSnapshot = await getDoc(categoryDocRef);

            if (!categoryDocSnapshot.exists()) {
                console.error(`Categoría ${category} no encontrada.`);
                return;
            }

            // Simular una lista con un solo documento para la iteración
            categoriesQuerySnapshot = { docs: [categoryDocSnapshot] };
        }

        // Iterar sobre las categorías
        for (const categoryDoc of categoriesQuerySnapshot.docs) {
            const categoryId = categoryDoc.id;

            // Obtener las subcolecciones de ejercicios
            const exercisesSnapshot = await getDocs(collection(db, `categories/${categoryId}/exercises`));

            for (const exerciseDoc of exercisesSnapshot.docs) {
                const exerciseId = exerciseDoc.id;

                // Acceder al documento dentro de la subcolección
                const exerciseDataSnapshot = await getDoc(doc(db, `categories/${categoryId}/exercises`, exerciseId));

                if (!exerciseDataSnapshot.exists()) continue;

                const exercise = exerciseDataSnapshot.data();

                // Filtrar por búsqueda
                if (searchQuery && !exercise.Nombre.toLowerCase().includes(searchQuery.toLowerCase())) {
                    continue;
                }

                // Crear el elemento HTML para el ejercicio
                const exerciseCard = document.createElement("div");
                exerciseCard.classList.add("exercise-card");
                exerciseCard.innerHTML = `
                    <img src="${exercise.Imagen}" alt="${exercise.Nombre}">
                    <h3>${exercise.Nombre}</h3>
                    <button onclick="showExerciseDetails('${exercise.Nombre}', '${exercise.Video}', '${exercise.Instrucciones}')">Ver más</button>
                `;
                exerciseGrid.appendChild(exerciseCard);
            }
        }
    } catch (error) {
        console.error("Error al cargar ejercicios:", error);
    }
}

function showExerciseDetails(name, videoUrl, imageUrl, instructions) {
    // Crear el contenido del pop-up
    const content = `
        <h2>${name}</h2>
        <img src="${imageUrl}" alt="${name}" style="max-width: 100%; height: auto;">
        <div>
            <video controls style="width: 100%; height: auto;">
                <source src="${videoUrl}" type="video/mp4">
                Tu navegador no soporta el elemento de video.
            </video>
        </div>
        <p><strong>Instrucciones:</strong><br>${instructions}</p>
        <form id="exercise-form">
            <label for="series">Series:</label>
            <input type="number" id="series" name="series" required min="1"><br><br>

            <label for="repeticiones">Repeticiones:</label>
            <input type="number" id="repeticiones" name="repeticiones" required min="1"><br><br>

            <label for="dia">Día:</label>
            <select id="dia" name="dia" required>
                <option value="lunes">Lunes</option>
                <option value="martes">Martes</option>
                <option value="miércoles">Miércoles</option>
                <option value="jueves">Jueves</option>
                <option value="viernes">Viernes</option>
                <option value="sábado">Sábado</option>
                <option value="domingo">Domingo</option>
            </select><br><br>

            <button type="submit">Guardar en rutina</button>
        </form>
    `;

    // Mostrar el pop-up usando SweetAlert
    Swal.fire({
        html: content,
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cerrar',
        focusConfirm: false,
        preConfirm: () => {
            const form = document.getElementById("exercise-form");
            const series = document.getElementById("series").value;
            const repeticiones = document.getElementById("repeticiones").value;
            const dia = document.getElementById("dia").value;

            // Aquí deberías manejar el guardado de los datos (en Firestore o en el lugar que prefieras)
            console.log('Ejercicio guardado:', { name, series, repeticiones, dia });
        }
    });
}