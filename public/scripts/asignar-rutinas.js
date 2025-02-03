import app, { db } from "../scripts/firebaseConfig.js";
import { getFirestore, collection, doc, getDocs, getDoc, addDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import { query, where } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
    const auth = getAuth(app);
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "login-admin.html";
            return;
        }

        console.log("Usuario autenticado:", user.email);

        const selectedUserId = localStorage.getItem("selectedUserId");

        // Verificar si se ha obtenido el userId correctamente
        if (selectedUserId) {
            console.log("User seleccionado:", selectedUserId);
        } else {
            console.error("No se ha encontrado el userId en localStorage.");
        }

    // Función para cargar los datos del usuario seleccionado
    async function cargarUsuario() {
        try {
            // Reemplazar 'userId' con el ID del usuario que deseas cargar (por ejemplo, el ID obtenido desde la sesión de login)
            const usuarioRef = doc(db, "usuarios", selectedUserId);
            const usuarioSnap = await getDoc(usuarioRef);

            if (usuarioSnap.exists()) {
                const usuarioData = usuarioSnap.data();
                const nombreCompleto = `${usuarioData.nombre} ${usuarioData.apellido}`;
                
                // Actualizar el título en el HTML con el nombre completo del usuario
                const tituloRutinas = document.getElementById("titulo-rutinas");
                tituloRutinas.textContent = `Asignar rutina para ${nombreCompleto}`;
            } else {
                // Si el usuario no existe, mostrar un mensaje adecuado
                const tituloRutinas = document.getElementById("titulo-rutinas");
                tituloRutinas.textContent = "Rutinas del Usuario No Encontrado";
            }
        } catch (error) {
            console.error("Error al obtener el usuario:", error);
            // Si hay un error, mostrar un mensaje adecuado
            const tituloRutinas = document.getElementById("titulo-rutinas");
            tituloRutinas.textContent = "Error al cargar usuario";
        }
    }

    // Llamar a la función para cargar el usuario al iniciar
    cargarUsuario();

    const routineBuilder = document.getElementById("routine-builder");
    const categoryFilter = document.getElementById("category-filter");
    const exerciseGrid = document.getElementById("exercise-grid");
    const searchBar = document.getElementById("search-bar");

    let currentPage = 1; // Página actual
    const itemsPerPage = 18; // Número de items por página

    routineBuilder.classList.remove("hidden");

    await loadCategories(db, categoryFilter);
    await loadExercises(db, exerciseGrid, currentPage);

    categoryFilter.addEventListener("change", async () => {
        const selectedCategory = categoryFilter.value;
        await loadExercises(db, exerciseGrid, currentPage, selectedCategory, searchBar.value);
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

    async function loadCategories() {
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
    
// Función para cargar y mostrar los ejercicios con paginación
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
                exercisesSnapshot = await getDocs(collection(db, `categories/${categoryDoc.id}/exercises`), { source: "cache" });
                if (exercisesSnapshot.empty) {
                    exercisesSnapshot = await getDocs(collection(db, `categories/${categoryDoc.id}/exercises`), { source: "server" });
                }
                exercisesSnapshot.forEach((doc) => {
                    const exercise = doc.data();
                    exercises.push({ ...exercise, id: doc.id }); // Agregar el id del documento
                });
            }
        } else {
            exercisesSnapshot = await getDocs(collection(db, `categories/${category}/exercises`), { source: "cache" });
            if (exercisesSnapshot.empty) {
                exercisesSnapshot = await getDocs(collection(db, `categories/${category}/exercises`), { source: "server" });
            }
            exercisesSnapshot.forEach((doc) => {
                const exercise = doc.data();
                exercises.push({ ...exercise, id: doc.id }); // Agregar el id del documento
            });
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

            console.log("Ejercicios cargados correctamente.");
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
                                <input type="number" id="series" min="1" placeholder="Ingrese las series"required>
                            </div>
                            <div class="form-group">
                            <label for="repeticiones">Repeticiones: <span style="color: red;">*</span></label>
                                <input type="number" id="repeticiones" min="1" placeholder="Ingrese las repeticiones"required>
                            </div>
                            <div class="form-group">
                            <label for="peso">Peso (kg): <span style="color: red;">*</span></label>
                                <input type="number" id="peso" min="0" step="0.1" placeholder="Ingrese el peso"required>
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
                title: 'swal2-title' // Agregar la clase personalizada
            },
            width: 'auto', // Permite que el ancho se ajuste automáticamente

            preConfirm: async () => {
                const series = parseInt(document.getElementById('series').value, 10);
                const repeticiones = parseInt(document.getElementById('repeticiones').value, 10);
                const peso = parseFloat(document.getElementById('peso').value);
                const dia = document.getElementById('dias').value;
                const adicionales = document.getElementById('adicionales').value;
            
                if (!series || series <= 0 || !repeticiones || repeticiones <= 0 || !peso || peso <= 0) {
                    Swal.showValidationMessage("Por favor, ingresa valores válidos para series, repeticiones y peso.");
                    return;
                }

                try {
                    const db = getFirestore(app);
                    const routinesRef = collection(db, "routines");
                
                    // Consulta Firestore para buscar una rutina con el mismo usuario y día
                    const q = query(routinesRef, where("userId", "==", user.uid), where("day", "==", dia));
                    const querySnapshot = await getDocs(q);
                
                    let existingRoutineDoc = null;
                
                    if (!querySnapshot.empty) {
                        existingRoutineDoc = querySnapshot.docs[0]; // Debería haber solo uno
                    }

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
                        // Crear una nueva rutina si no existe
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
})