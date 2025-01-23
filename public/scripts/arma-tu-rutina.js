import app from './firebaseConfig.js';
import { getFirestore, collection, doc, getDocs, addDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

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
    
        try {
            const exercises = []; // Array para almacenar todos los ejercicios
    
            if (category === "all") {
                const categoriesSnapshot = await getDocs(collection(db, "categories"));
    
                for (const categoryDoc of categoriesSnapshot.docs) {
                    const exercisesSnapshot = await getDocs(collection(db, `categories/${categoryDoc.id}/exercises`));
                    exercisesSnapshot.forEach((doc) => {
                        const exercise = doc.data();
                        exercises.push(exercise);
                    });
                }
            } else {
                const exercisesSnapshot = await getDocs(collection(db, `categories/${category}/exercises`));
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
                                <input type="number" id="series" min="1" placeholder="Ingrese las series"required>
                            </div>
                            <div class="form-group">
                            <label for="repeticiones">Repeticiones: <span style="color: red;">*</span></label>
                                <input type="number" id="repeticiones" min="1" placeholder="Ingrese las repeteciones"required>
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