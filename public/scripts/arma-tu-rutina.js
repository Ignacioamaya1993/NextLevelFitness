import app from './firebaseConfig.js';
import { getFirestore, collection, doc, getDocs, addDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import { query, where } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

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

    let currentPage = 1; // Página actual
    const itemsPerPage = 24; // Número de items por página

    if (user && user.isLoggedIn) {
        restrictedMessage.classList.add("hidden");
        routineBuilder.classList.remove("hidden");

        await loadCategories(db, categoryFilter);
        await loadExercises(db, exerciseGrid);
        
        categoryFilter.addEventListener("change", async () => {
            const selectedCategory = categoryFilter.value || "all"; // Si es vacío, usar "all"
            await loadExercises(db, exerciseGrid, 1, selectedCategory, searchBar.value);
        });
        

        let debounceTimeout;

        searchBar.addEventListener("input", async () => {
            const selectedCategory = categoryFilter.value;
        
            // Cancelar cualquier llamada anterior que aún no se haya ejecutado
            clearTimeout(debounceTimeout);
        
            // Crear un nuevo retraso de 300ms antes de realizar la búsqueda
            debounceTimeout = setTimeout(async () => {
                await loadExercises(db, exerciseGrid, currentPage, selectedCategory, searchBar.value);
            }, 300); // 300ms es un buen tiempo para debounce, ajusta si es necesario
        });
    }

    async function loadCategories() {
        try {
            const categoriesRef = collection(db, "categories");
    
            // Obtener desde caché sin esperar
            const cachePromise = getDocs(categoriesRef, { source: "cache" }).catch(() => null);
            const serverPromise = getDocs(categoriesRef, { source: "server" });
    
            let categoriesSnapshot = await cachePromise || await serverPromise; // Usar caché si está disponible
    
            if (!categoriesSnapshot || categoriesSnapshot.empty) {
            categoriesSnapshot = await serverPromise; // Si no hay datos en caché, ir al servidor
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
    }
    

async function loadExercises(db, exerciseGrid, page = 1, category = "all", searchQuery = "") {
    let latestSearchId = 0; // Variable global para rastrear la búsqueda más reciente
    const searchId = ++latestSearchId; // Incrementa el ID de búsqueda

    exerciseGrid.innerHTML = ""; // Limpiar ejercicios existentes

    try {
        const exercises = []; // Array para almacenar todos los ejercicios
        let exercisesSnapshot;

        if (!category || category === "all") { // Verificar si category está vacío o es "all"
            const categoriesSnapshot = await getDocs(collection(db, "categories"));
            for (const categoryDoc of categoriesSnapshot.docs) {
                const categoryId = categoryDoc.id; // Obtener el ID correctamente
                exercisesSnapshot = await getDocs(collection(db, `categories/${categoryId}/exercises`), { source: "cache" });

                if (exercisesSnapshot.empty) {
                    exercisesSnapshot = await getDocs(collection(db, `categories/${categoryId}/exercises`), { source: "server" });
                }

                exercisesSnapshot.forEach((doc) => {
                    const exercise = doc.data();
                    exercises.push({ ...exercise, id: doc.id }); // Agregar el id del documento
                });
            }
        } else {
            // Verificar si el valor de category es válido
            if (category.trim() !== "") { 
                exercisesSnapshot = await getDocs(collection(db, `categories/${category}/exercises`), { source: "cache" });

                if (exercisesSnapshot.empty) {
                    exercisesSnapshot = await getDocs(collection(db, `categories/${category}/exercises`), { source: "server" });
                }

                exercisesSnapshot.forEach((doc) => {
                    const exercise = doc.data();
                    exercises.push({ ...exercise, id: doc.id }); // Agregar el id del documento
                });
            } else {
                console.warn("Categoría inválida:", category);
            }
        }

        // Verifica si esta es la búsqueda más reciente antes de actualizar la UI
        if (searchId === latestSearchId) {
            exerciseGrid.innerHTML = ""; // Limpia antes de agregar nuevos elementos

            // Filtrar ejercicios por búsqueda
            const filteredExercises = exercises.filter((exercise) =>
                exercise.Nombre.toLowerCase().includes(searchQuery.toLowerCase())
            );

            // Ordenar ejercicios alfabéticamente por nombre
            filteredExercises.sort((a, b) => a.Nombre.localeCompare(b.Nombre));

            // Paginación: mostrar solo los ejercicios de la página actual
            const startIndex = (page - 1) * itemsPerPage;
            const paginatedExercises = filteredExercises.slice(startIndex, startIndex + itemsPerPage);

            // Renderizar los ejercicios filtrados y ordenados
            paginatedExercises.forEach((exercise) => {
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

            // Mostrar la paginación
            renderPagination(filteredExercises.length, page);
        }
    } catch (error) {
        console.error("Error al cargar ejercicios:", error);
    }
}    

// Función para renderizar la paginación
function renderPagination(totalItems, currentPage) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginationContainer = document.getElementById("pagination-container");

    // Limpiar la paginación existente
    paginationContainer.innerHTML = "";

    // Botón de página anterior
    if (currentPage > 1) {
        const prevButton = document.createElement("button");
        prevButton.textContent = "Anterior";
        prevButton.addEventListener("click", () => {
            currentPage--;
            loadExercises(db, exerciseGrid, currentPage, categoryFilter.value, searchBar.value);
        });
        paginationContainer.appendChild(prevButton);
    }

    // Botones de páginas numeradas
    for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement("button");
        pageButton.textContent = i;
        pageButton.addEventListener("click", () => {
            currentPage = i;
            loadExercises(db, exerciseGrid, currentPage, categoryFilter.value, searchBar.value);
        });
        if (i === currentPage) pageButton.classList.add("active");
        paginationContainer.appendChild(pageButton);
    }

    // Botón de página siguiente
    if (currentPage < totalPages) {
        const nextButton = document.createElement("button");
        nextButton.textContent = "Siguiente";
        nextButton.addEventListener("click", () => {
            currentPage++;
            loadExercises(db, exerciseGrid, currentPage, categoryFilter.value, searchBar.value);
        });
        paginationContainer.appendChild(nextButton);
    }
}

async function showExerciseDetails(nombre, video, instrucciones) {
    console.log("Ejecutando showExerciseDetails...");
    console.log("Video recibido:", video);

    let embedVideoUrl = "";
    let isYouTube = false;

    if (video.includes("youtube.com/shorts/")) {
        const videoId = video.split("shorts/")[1]?.split("?")[0];
        embedVideoUrl = `https://www.youtube.com/embed/${videoId}`;
        isYouTube = true;
        console.log("Detectado como YouTube Shorts. ID:", videoId);
    } else if (video.includes("youtube.com/watch?v=")) {
        const videoId = video.split("v=")[1]?.split("&")[0];
        embedVideoUrl = `https://www.youtube.com/embed/${videoId}`;
        isYouTube = true;
        console.log("Detectado como YouTube watch. ID:", videoId);
    } else if (video.includes("youtu.be/")) {
        const videoId = video.split("youtu.be/")[1]?.split("?")[0];
        embedVideoUrl = `https://www.youtube.com/embed/${videoId}`;
        isYouTube = true;
        console.log("Detectado como YouTube shortlink. ID:", videoId);
    } else if (video.includes("youtube.com/embed/")) {
        // ya viene en formato embed
        embedVideoUrl = video;
        isYouTube = true;
        console.log("Video ya en formato embed:", embedVideoUrl);
    } else {
        console.log("Video no es de YouTube. Mostrando como video local.");
    }

    console.log("Embed URL final:", embedVideoUrl);
    console.log("¿Es YouTube?:", isYouTube);

    const contentHTML = `
        <div class="exercise-popup">
            <div class="popup-header">
                <h3 class="exercise-title">${nombre}</h3>
            </div>
            <div class="popup-content">
                <div class="popup-left">
                    <div class="video-container">
                        ${isYouTube
                            ? `<iframe width="100%" height="315" src="${embedVideoUrl}" frameborder="0" allowfullscreen></iframe>`
                            : `<video controls width="100%">
                                <source src="${video}" type="video/mp4">
                                Tu navegador no soporta el formato de video.
                            </video>`
                        }
                    </div>
                    <h4>Instrucciones</h4>
                    <p>${instrucciones.replace(/\n/g, "<br>")}</p>
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

            console.log("HTML generado para el popup:", contentHTML);

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

            if (!series || series <= 0) {
                Swal.showValidationMessage("Por favor, ingresa un valor válido para las series.");
                return;
            }

            if (!repeticiones || repeticiones <= 0) {
                Swal.showValidationMessage("Por favor, ingresa un valor válido para las repeticiones.");
                return;
            }

            if (!peso || peso <= 0) {
                Swal.showValidationMessage("Por favor, ingresa un valor válido para el peso.");
                return;
            }

            if (!dia) {
                Swal.showValidationMessage("Por favor, selecciona un día de la semana.");
                return;
            }

            try {
                const db = getFirestore(app);
                const routinesRef = collection(db, "routines");

                const q = query(routinesRef, where("userId", "==", user.uid), where("day", "==", dia));
                const querySnapshot = await getDocs(q);

                let existingRoutineDoc = null;
                if (!querySnapshot.empty) {
                existingRoutineDoc = querySnapshot.docs[0];
                }

                const exerciseId = crypto.randomUUID();

                const exerciseData = {
                    id: exerciseId,
                    name: nombre,
                    series: parseInt(series, 10),
                    repetitions: parseInt(repeticiones, 10),
                    weight: parseFloat(peso),
                    video: video,
                    instructions: instrucciones,
                    additionalData: adicionales,
                };

                if (existingRoutineDoc) {
                    const routineData = existingRoutineDoc.data();
                    const updatedExercises = [...routineData.exercises, exerciseData];
                    await updateDoc(doc(db, "routines", existingRoutineDoc.id), {
                        exercises: updatedExercises,
                    });
                } else {
                    await addDoc(routinesRef, {
                        userId: user.uid,
                        day: dia,
                        exercises: [exerciseData],
                    });
                }

                Swal.fire("Guardado", "El ejercicio se ha añadido a tu rutina para este día.", "success");
            } catch (error) {
                console.error("Error al guardar el ejercicio:", error);
                Swal.fire("Error", "No se pudo guardar el ejercicio.", "error");
            }
        }
    });

    }
});