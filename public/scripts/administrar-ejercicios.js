import app from './firebaseConfig.js';
import { getFirestore, collection, getDocs, addDoc, updateDoc, query, where } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";

// Declaramos las variables globales fuera del bloque `DOMContentLoaded`
let categoryFilter, exerciseGrid, searchBar;

document.addEventListener("DOMContentLoaded", () => {
    const auth = getAuth(app);

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            console.log("No estás autenticado. Redirigiendo a login.");
            alert("No estás autenticado. Redirigiendo a login.");
            window.location.href = "login-admin.html";
            return;
        }

        console.log("Usuario autenticado:", user.email);

        // Inicialización de variables DOM
        categoryFilter = document.getElementById("category-filter");
        exerciseGrid = document.getElementById("exercise-grid");
        searchBar = document.getElementById("search-bar");
        const routineBuilder = document.getElementById("routine-builder");
        
        routineBuilder.classList.remove("hidden");

        const db = getFirestore(app);

        await loadCategories(db);
        await loadExercises(db);

        categoryFilter.addEventListener("change", async () => {
            const selectedCategory = categoryFilter.value;
            await loadExercises(db, exerciseGrid, selectedCategory, searchBar.value);
        });

        let debounceTimeout;

        searchBar.addEventListener("input", async () => {
            const selectedCategory = categoryFilter.value;
        
            // Cancelar cualquier llamada anterior que aún no se haya ejecutado
            clearTimeout(debounceTimeout);
        
            // Crear un nuevo retraso de 300ms antes de realizar la búsqueda
            debounceTimeout = setTimeout(async () => {
                await loadExercises(db, exerciseGrid, selectedCategory, searchBar.value);
            }, 300); // 300ms es un buen tiempo para debounce, ajusta si es necesario
        });
    });
});

// Función para cargar categorías
async function loadCategories(db) {
    try {
        const categoriesRef = collection(db, "categories");

        // Intentar cargar desde caché primero
        let categoriesSnapshot = await getDocs(categoriesRef, { source: "cache" });

        if (categoriesSnapshot.empty) {
            console.log("No hay datos en caché, obteniendo desde Firestore...");
            categoriesSnapshot = await getDocs(categoriesRef, { source: "server" });
        }

        renderCategories(categoriesSnapshot);

    } catch (error) {
        console.error("Error al cargar categorías:", error);
    }
}

// Función auxiliar para renderizar las categorías
function renderCategories(snapshot) {
    categoryFilter.innerHTML = "<option value='all'>Todas las categorías</option>";

    snapshot.forEach((doc) => {
        const option = document.createElement("option");
        option.value = doc.id;
        option.textContent = doc.id;
        categoryFilter.appendChild(option);
    });

    console.log("Categorías actualizadas.");
}

// Función para cargar ejercicios
async function loadExercises(db, category = "all", searchQuery = "") {
    exerciseGrid.innerHTML = ""; // Limpiar ejercicios existentes

    try {
        const exercises = []; // Array para almacenar todos los ejercicios
        let exercisesSnapshot;

        if (category === "all") {
            const categoriesSnapshot = await getDocs(collection(db, "categories"));
            for (const categoryDoc of categoriesSnapshot.docs) {
                exercisesSnapshot = await getDocs(collection(db, `categories/${categoryDoc.id}/exercises`), { source: "cache" });
                if (exercisesSnapshot.empty) {
                    exercisesSnapshot = await getDocs(collection(db, `categories/${categoryDoc.id}/exercises`), { source: "server" });
                }
                exercisesSnapshot.forEach((doc) => {
                    const exercise = doc.data();
                    exercises.push(exercise);
                });
            }
        } else {
            exercisesSnapshot = await getDocs(collection(db, `categories/${category}/exercises`), { source: "cache" });
            if (exercisesSnapshot.empty) {
                exercisesSnapshot = await getDocs(collection(db, `categories/${category}/exercises`), { source: "server" });
            }
            exercisesSnapshot.forEach((doc) => {
                const exercise = doc.data();
                exercises.push(exercise);
            });
        }

        // Filtrar ejercicios por búsqueda
        const filteredExercises = exercises.filter((exercise) =>
            exercise.Nombre.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // Renderizar los ejercicios filtrados
        filteredExercises.forEach((exercise) => {
            const exerciseCard = document.createElement("div");
            exerciseCard.classList.add("exercise-card");

            exerciseCard.style.display = "flex";
            exerciseCard.style.flexDirection = "column";
            exerciseCard.style.justifyContent = "space-between";
            exerciseCard.style.height = "100%";

            const button = document.createElement("button");
            button.textContent = "Seleccionar";
            button.addEventListener("click", () =>
                showExerciseDetails(exercise.Nombre, exercise.Video, exercise.Instrucciones)
            );

            exerciseCard.innerHTML = `
                <h3>${exercise.Nombre}</h3>
                <img src="${exercise.Imagen}" alt="${exercise.Nombre}">
            `;
            exerciseCard.appendChild(button);
            exerciseGrid.appendChild(exerciseCard);
        });

        console.log("Ejercicios cargados correctamente.");

    } catch (error) {
        console.error("Error al cargar ejercicios:", error);
    }
}

// Función para mostrar detalles del ejercicio
async function showExerciseDetails(nombre, video, instrucciones) {
    const user = JSON.parse(localStorage.getItem("currentUser"));
    if (!user || !user.isLoggedIn) {
        Swal.fire("Error", "Debes estar logueado para guardar rutinas.", "error");
        return;
    }

    let embedVideoUrl = "";
    if (video.includes("youtube.com/shorts/")) {
        embedVideoUrl = video.replace("youtube.com/shorts/", "youtube.com/embed/");
    } else if (video.includes("youtube.com/watch?v=")) {
        const videoId = video.split("v=")[1]?.split("&")[0];
        embedVideoUrl = `https://www.youtube.com/embed/${videoId}`;
    }

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