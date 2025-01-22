import app from './firebaseConfig.js';
import { getFirestore, collection, doc, getDocs, getDoc, addDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
    // Asegúrate de que este código solo se ejecute una vez
    if (window.__isInitialized) return;
    window.__isInitialized = true;

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

        await loadCategories(db, categoryFilter);
        await loadExercises(db, exerciseGrid);

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
    }

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

                    // Establecer CSS en el contenedor para que el botón se mantenga al final
                    exerciseCard.style.display = "flex";
                    exerciseCard.style.flexDirection = "column";
                    exerciseCard.style.justifyContent = "space-between";
                    exerciseCard.style.height = "100%";

                    // Crear botón y añadir listener
                    const button = document.createElement("button");
                    button.textContent = "Ver más";
                    button.addEventListener("click", () => showExerciseDetails(exercise.Nombre, exercise.Video, exercise.Instrucciones));

                    exerciseCard.innerHTML = `
                        <h3>${exercise.Nombre}</h3>
                        <img src="${exercise.Imagen}" alt="${exercise.Nombre}">
                    `;
                    exerciseCard.appendChild(button);

                    exerciseGrid.appendChild(exerciseCard);
                }
            }
        } catch (error) {
            console.error("Error al cargar ejercicios:", error);
        }
    }

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
                                <input type="number" id="series" min="1" required>
                            </div>
                            <div class="form-group">
                            <label for="repeticiones">Repeticiones: <span style="color: red;">*</span></label>
                                <input type="number" id="repeticiones" min="1" required>
                            </div>
                            <div class="form-group">
                            <label for="peso">Peso (kg): <span style="color: red;">*</span></label>
                                <input type="number" id="peso" min="0" step="0.1" required>
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
                popup: 'custom-popup'
            },
            width: 'auto', // Permite que el ancho se ajuste automáticamente

            preConfirm: async () => {
                const series = document.getElementById('series').value;
                const repeticiones = document.getElementById('repeticiones').value;
                const dia = document.getElementById('dias').value;
                const peso = document.getElementById('peso').value;
                const adicionales = document.getElementById('adicionales').value;
    
                if (!series || !repeticiones || !dia || !peso) {
                    Swal.showValidationMessage("Por favor, completa todos los campos obligatorios.");
                    return;
                }
                // Validar valores mínimos
                if (series <= 0 || repeticiones <= 0 || peso <= 0) {
                    Swal.showValidationMessage("Series, repeticiones y peso deben ser mayores a 0.");
                    return;
                }

                // Validar peso como número decimal positivo
                if (!/^\d+(\.\d+)?$/.test(peso)) {
                    Swal.showValidationMessage("Peso debe ser un número válido.");
                    return;
                }
                try {
                    const db = getFirestore(app);
                    const routinesRef = collection(db, "routines");
    
                    // Verificar si ya existe una rutina para ese día y usuario
                    const routinesSnapshot = await getDocs(routinesRef);
                    const existingRoutineDoc = routinesSnapshot.docs.find(doc => doc.data().userId === user.uid && doc.data().day === dia);
    
                    // Generar un ID único para el ejercicio
                    const exerciseId = crypto.randomUUID();
    
                    if (existingRoutineDoc) {
                        const routineData = existingRoutineDoc.data();
                        const updatedExercises = [...routineData.exercises, {
                            id: exerciseId, // ID único del ejercicio
                            name: nombre,
                            series: parseInt(series, 10),
                            repetitions: parseInt(repeticiones, 10),
                            weight: parseFloat(peso),
                            video: video,
                            instructions: instrucciones,
                            additionalData: adicionales,
                        }];
    
                        // Actualizar el documento existente
                        await updateDoc(doc(db, "routines", existingRoutineDoc.id), {
                            exercises: updatedExercises,
                        });
    
                        Swal.fire("Guardado", "El ejercicio se ha añadido a tu rutina para este día.", "success");
                    } else {
                        await addDoc(routinesRef, {
                            userId: user.uid,
                            day: dia,
                            exercises: [{
                                id: exerciseId, // ID único del ejercicio
                                name: nombre,
                                series: parseInt(series, 10),
                                repetitions: parseInt(repeticiones, 10),
                                weight: parseFloat(peso),
                                video: video,
                                instructions: instrucciones,
                                additionalData: adicionales,
                            }],
                        });
    
                        Swal.fire("Guardado", "El ejercicio se ha añadido a tu rutina para este día.", "success");
                    }
                } catch (error) {
                    console.error("Error al guardar el ejercicio:", error);
                    Swal.fire("Error", "No se pudo guardar el ejercicio.", "error");
                }
            }
        });
    }
});