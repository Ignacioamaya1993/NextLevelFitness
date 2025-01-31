import app from './firebaseConfig.js';
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    const auth = getAuth(app);
    const db = getFirestore(app);

    const categoryFilter = document.getElementById("category-filter");
    const exerciseGrid = document.getElementById("exercise-grid");
    const searchBar = document.getElementById("search-bar");
    const routineBuilder = document.getElementById("routine-builder");

    routineBuilder.classList.add("hidden"); // Ocultar el constructor de rutinas hasta autenticación

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            console.log("No estás autenticado. Redirigiendo a login.");
            alert("No estás autenticado. Redirigiendo a login.");
            window.location.href = "login-admin.html";
            return;
        }

        console.log("Usuario autenticado:", user.email);
        routineBuilder.classList.remove("hidden");

        await loadCategories(db, categoryFilter);
        await loadExercises(db, exerciseGrid); // Se pasa exerciseGrid como parámetro

        categoryFilter.addEventListener("change", async () => {
            await loadExercises(db, exerciseGrid, categoryFilter.value, searchBar.value);
        });

        let debounceTimeout;
        searchBar.addEventListener("input", async () => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(async () => {
                await loadExercises(db, exerciseGrid, categoryFilter.value, searchBar.value);
            }, 300);
        });
    });
});

// Función para cargar categorías
async function loadCategories(db, categoryFilter) {
    try {
        const categoriesRef = collection(db, "categories");
        const categoriesSnapshot = await getDocs(categoriesRef);

        if (categoriesSnapshot.empty) {
            console.log("No hay categorías disponibles.");
            return;
        }

        categoryFilter.innerHTML = "<option value='all'>Todas las categorías</option>";
        categoriesSnapshot.forEach((doc) => {
            const option = document.createElement("option");
            option.value = doc.id;
            option.textContent = doc.id;
            categoryFilter.appendChild(option);
        });

        console.log("Categorías actualizadas.");
    } catch (error) {
        console.error("Error al cargar categorías:", error);
    }
}

// Función para cargar ejercicios
async function loadExercises(db, exerciseGrid, category = "all", searchQuery = "") {
    exerciseGrid.innerHTML = ""; // Limpiar el grid antes de cargar nuevos ejercicios

    try {
        let exercises = []; // Array para almacenar los ejercicios

        if (category === "all") {
            const categoriesSnapshot = await getDocs(collection(db, "categories"));
            for (const categoryDoc of categoriesSnapshot.docs) {
                const exercisesSnapshot = await getDocs(collection(db, `categories/${categoryDoc.id}/exercises`));
                exercisesSnapshot.forEach((doc) => exercises.push(doc.data()));
            }
        } else {
            const exercisesSnapshot = await getDocs(collection(db, `categories/${category}/exercises`));
            exercisesSnapshot.forEach((doc) => exercises.push(doc.data()));
        }

        // Filtrar por búsqueda
        const filteredExercises = exercises.filter((exercise) =>
            exercise.Nombre.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // Renderizar ejercicios
        renderExercises(filteredExercises, exerciseGrid);

        console.log("Ejercicios cargados correctamente.");
    } catch (error) {
        console.error("Error al cargar ejercicios:", error);
    }
}

// Función para renderizar ejercicios
function renderExercises(exercises, exerciseGrid) {
    exercises.forEach((exercise) => {
        const exerciseCard = document.createElement("div");
        exerciseCard.classList.add("exercise-card");

        exerciseCard.innerHTML = `
            <h3>${exercise.Nombre}</h3>
            <img src="${exercise.Imagen}" alt="${exercise.Nombre}">
            <button onclick="showExerciseDetails('${exercise.Nombre}', '${exercise.Video}', '${exercise.Instrucciones}')">
                Seleccionar
            </button>
        `;

        exerciseGrid.appendChild(exerciseCard);
    });
}

// Función para mostrar detalles del ejercicio
function showExerciseDetails(nombre, video, instrucciones) {
    let embedVideoUrl = video.includes("youtube.com/shorts/") 
        ? video.replace("youtube.com/shorts/", "youtube.com/embed/") 
        : video.includes("youtube.com/watch?v=") 
            ? `https://www.youtube.com/embed/${video.split("v=")[1]?.split("&")[0]}` 
            : video;

    const contentHTML = `
        <div class="exercise-popup">
            <div class="popup-header">
                <h3 class="exercise-title">${nombre}</h3>
            </div>
            <div class="popup-content">
                <div class="popup-left">
                    <div class="video-container">
                        <iframe src="${embedVideoUrl}" frameborder="0" allowfullscreen></iframe>
                    </div>
                    <h4>Instrucciones</h4>
                    <p>${instrucciones}</p>
                </div>
                <div class="popup-right">
                    <form id="exercise-form">
                        <div class="form-group">
                            <label for="series">Series: <span style="color: red;">*</span></label>
                            <input type="number" id="series" min="1" placeholder="Ingrese las series" required>
                        </div>
                        <div class="form-group">
                            <label for="repeticiones">Repeticiones: <span style="color: red;">*</span></label>
                            <input type="number" id="repeticiones" min="1" placeholder="Ingrese las repeticiones" required>
                        </div>
                        <div class="form-group">
                            <label for="peso">Peso (kg): <span style="color: red;">*</span></label>
                            <input type="number" id="peso" min="0" step="0.1" placeholder="Ingrese el peso" required>
                        </div>
                        <div class="form-group">
                            <label for="dias">Día de la semana:</label>
                            <select id="dias" required>
                                <option value="lunes">Lunes</option>
                                <option value="martes">Martes</option>
                                <option value="miércoles">Miércoles</option>
                                <option value="jueves">Jueves</option>
                                <option value="viernes">Viernes</option>
                                <option value="sábado">Sábado</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="adicionales">Datos Adicionales:</label>
                            <textarea id="adicionales" rows="3" placeholder="Escribe aquí alguna aclaración..."></textarea>
                        </div>
                    </form>
                </div>
            </div>
        </div>`;

    Swal.fire({
        title: "Detalles del ejercicio",
        html: contentHTML,
        showCancelButton: true,
        confirmButtonText: "Guardar",
        cancelButtonText: "Cancelar",
        customClass: {
            popup: 'custom-popup',
            title: 'swal2-title' 
        },
        width: 'auto', 
        preConfirm: async () => {
            const series = parseInt(document.getElementById('series').value, 10);
            const repeticiones = parseInt(document.getElementById('repeticiones').value, 10);
            const peso = parseFloat(document.getElementById('peso').value);
            const dia = document.getElementById('dias').value;
            const adicionales = document.getElementById('adicionales').value;

            if (!series || series <= 0 || !repeticiones || repeticiones <= 0 || !peso || peso <= 0) {
                Swal.showValidationMessage("Por favor, ingrese datos válidos.");
                return;
            }

            try {
                const exerciseRef = collection(db, "users", user.uid, "rutinas");

                await addDoc(exerciseRef, {
                    nombre,
                    series,
                    repeticiones,
                    peso,
                    dia,
                    adicionales,
                });

                Swal.fire("Éxito", "Ejercicio agregado a tu rutina.", "success");
            } catch (error) {
                Swal.fire("Error", "Hubo un problema al guardar el ejercicio.", "error");
            }
        },
    });
}