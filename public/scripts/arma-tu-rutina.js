import app from './firebaseConfig.js';
import { getFirestore, collection, doc, getDocs, getDoc, addDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

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

                // Crear botón y añadir listener
                const button = document.createElement("button");
                button.textContent = "Ver más";
                button.addEventListener("click", () => showExerciseDetails(exercise.Nombre, exercise.Video, exercise.Instrucciones));

                exerciseCard.innerHTML = `
                    <img src="${exercise.Imagen}" alt="${exercise.Nombre}">
                    <h3>${exercise.Nombre}</h3>
                `;
                exerciseCard.appendChild(button);

                exerciseGrid.appendChild(exerciseCard);
            }
        }
    } catch (error) {
        console.error("Error al cargar ejercicios:", error);
    }
}

// Modifica la función para incluir la lógica de guardar en Firestore
function showExerciseDetails(nombre, video, instrucciones) {
    const user = JSON.parse(localStorage.getItem("currentUser"));

    if (!user || !user.isLoggedIn) {
        Swal.fire("Error", "Debes estar logueado para guardar rutinas.", "error");
        return;
    }

    // Convertir la URL de YouTube Shorts a formato de embed
    let embedVideoUrl = "";
    if (video.includes("youtube.com/shorts/")) {
        embedVideoUrl = video.replace("youtube.com/shorts/", "youtube.com/embed/");
    } else if (video.includes("youtube.com/watch?v=")) {
        embedVideoUrl = video.replace("watch?v=", "embed/");
    } else {
        embedVideoUrl = video; // En caso de que ya sea un embed correcto
    }

    const contentHTML = `
    <div class="exercise-details">
        <h3>${nombre}</h3>
        <div class="video-container">
            <iframe width="560" height="315" src="${embedVideoUrl}" frameborder="0" allowfullscreen></iframe>
        </div>
        <p>${instrucciones}</p>

        <form id="exercise-form" class="exercise-form">
            <label for="series">Series:</label>
            <input type="number" id="series" min="1" required>

            <label for="repeticiones">Repeticiones:</label>
            <input type="number" id="repeticiones" min="1" required>

            <label for="peso">Peso (kg):</label>
            <input type="number" id="peso" min="0" step="0.1" required>

            <label for="dias">Día de la semana:</label>
            <select id="dias" required>
                <option value="lunes">Lunes</option>
                <option value="martes">Martes</option>
                <option value="miércoles">Miércoles</option>
                <option value="jueves">Jueves</option>
                <option value="viernes">Viernes</option>
                <option value="sábado">Sábado</option>
            </select>               
        </form>
    </div>
    `;

    Swal.fire({
        title: "Detalles del ejercicio",
        html: contentHTML,
        showCancelButton: true,
        confirmButtonText: "Guardar",
        cancelButtonText: "Cancelar",
        preConfirm: async () => {
            const series = document.getElementById('series').value;
            const repeticiones = document.getElementById('repeticiones').value;
            const dia = document.getElementById('dias').value;
            const peso = document.getElementById('peso').value;

            if (!series || !repeticiones || !dia || !peso) {
                Swal.showValidationMessage("Por favor, completa todos los campos.");
                return;
            }

            try {
                const db = getFirestore(app);
                const routinesRef = collection(db, "routines");

                await addDoc(routinesRef, {
                    userId: user.uid,
                    day: dia,
                    exercise: {
                        name: nombre,
                        series: parseInt(series, 10),
                        repetitions: parseInt(repeticiones, 10),
                        weight: parseFloat(peso),
                        video: video,
                        instructions: instrucciones,
                    },
                });

                Swal.fire("Guardado", "El ejercicio se ha añadido a tu rutina.", "success");
            } catch (error) {
                console.error("Error al guardar la rutina:", error);
                Swal.fire("Error", "Hubo un problema al guardar la rutina. Inténtalo de nuevo.", "error");
            }
        },
    });
}