import app from './firebaseConfig.js';
import { getFirestore, collection, getDocs, getDoc, addDoc, updateDoc, doc, deleteDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { uploadToCloudinary } from "./cloudinary.js"; // Importamos la función de Cloudinary

document.addEventListener("DOMContentLoaded", () => {
    const auth = getAuth(app);
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "login-admin.html";
            return;
        }

        console.log("Usuario autenticado:", user.email);

        const routineBuilder = document.getElementById("routine-builder");
        const categoryFilter = document.getElementById("category-filter");
        const exerciseGrid = document.getElementById("exercise-grid");
        const searchBar = document.getElementById("search-bar");
        const addExerciseBtn = document.getElementById("add-exercise-btn");

        let currentPage = 1; // Página actual
        const itemsPerPage = 20; // Número de items por página

        routineBuilder.classList.remove("hidden");

        const db = getFirestore(app);

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

        // Botón para agregar nuevo ejercicio
        addExerciseBtn.addEventListener("click", async () => {
            await addNewExercise(db);
        });

        async function loadCategories() {
            try {
                const categoriesRef = collection(db, "categories");
        
                // Obtener desde caché sin esperar
                const cachePromise = getDocs(categoriesRef, { source: "cache" }).catch(() => null);
                const serverPromise = getDocs(categoriesRef, { source: "server" });
        
                let categoriesSnapshot = await cachePromise || await serverPromise; // Usar caché si está disponible
        
                if (!categoriesSnapshot || categoriesSnapshot.empty) {
                    console.log("No hay datos en caché, obteniendo desde Firestore...");
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

                const selectButton = document.createElement("button");
                selectButton.textContent = "Seleccionar";
                selectButton.addEventListener("click", () =>
                    showExerciseDetails(exercise.Nombre, exercise.Video, exercise.Instrucciones, exercise.Imagen, exercise)
                );

                // Botón para eliminar ejercicio
                const deleteButton = document.createElement("button");
                deleteButton.textContent = "Eliminar ejercicio";  // Cambiar texto del botón
                deleteButton.classList.add("delete-btn"); // Agregar la clase delete-btn
                deleteButton.addEventListener("click", () => {
                    Swal.fire({
                        title: '¿Estás seguro?',
                        text: "Esta acción no se puede deshacer.",
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Sí, eliminar',
                        cancelButtonText: 'Cancelar',
                        customClass: {
                            popup: "swal-custom-text" // Aplicar la clase para texto blanco
                        }
                    }).then(async (result) => {
                        if (result.isConfirmed) {
                            try {
                                // Eliminamos el ejercicio de Firestore
                                const exerciseRef = doc(db, `categories/${exercise.Categoria}/exercises/${exercise.id}`);
                                await deleteDoc(exerciseRef);
                                Swal.fire({
                                    title: '¡Eliminado!',
                                    text: 'El ejercicio ha sido eliminado.',
                                    icon: 'success',
                                    customClass: {
                                        popup: "swal-custom-text"
                                    }
                                });
                                loadExercises(db, exerciseGrid, page); // Volver a cargar los ejercicios
                            } catch (error) {
                                Swal.fire({
                                    title: 'Error',
                                    text: 'No se pudo eliminar el ejercicio.',
                                    icon: 'error',
                                    customClass: {
                                        popup: "swal-custom-text"
                                    }
                                });
                                console.error("Error al eliminar ejercicio:", error);
                            }
                        }
                    });
                });                

                exerciseCard.innerHTML = ` 
                    <h3>${exercise.Nombre}</h3>
                    <img src="${exercise.Imagen || 'default-image.jpg'}" alt="${exercise.Nombre}">
                `;

                const buttonContainer = document.createElement("div");
                buttonContainer.classList.add("buttonContainer");

                buttonContainer.appendChild(selectButton);
                buttonContainer.appendChild(deleteButton);  

                exerciseCard.appendChild(buttonContainer);
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

async function addNewExercise(db) {
    try {
        const categoriesRef = collection(db, "categories");
        const categoriesSnapshot = await getDocs(categoriesRef);

        let categories = [];
        categoriesSnapshot.forEach(doc => categories.push(doc.id));

        const { value: formValues } = await Swal.fire({
            title: "Agregar nuevo ejercicio",
            html: `
                <label for="category-select">Categoría:</label>
                <select id="category-select" class="swal2-select">
                    <option value="">-- Selecciona una categoría --</option>
                    ${categories.map(category => `<option value="${category}">${category}</option>`).join("")}
                    <option value="other">Otra (escribir nueva)</option>
                </select>
                <input id="new-exercise-category" class="swal2-input" placeholder="Nueva categoría">

                <label for="new-exercise-name">Nombre del ejercicio:</label>
                <input id="new-exercise-name" class="swal2-input" placeholder="Ejemplo: Press de banca">

                <label for="new-exercise-image">Imagen:</label>
                <input type="file" id="new-exercise-image" class="swal2-input">

                <label for="new-exercise-video">Video:</label>
                <input type="file" id="new-exercise-video" class="swal2-input">

                <label for="new-exercise-instructions">Instrucciones (opcional):</label>
                <textarea id="new-exercise-instructions" class="swal2-textarea" placeholder="Describe cómo se realiza el ejercicio..."></textarea>
            `,
            showCancelButton: true,
            confirmButtonText: "Agregar",
            preConfirm: async () => {
                const selectedCategory = document.getElementById("category-select").value;
                const newCategory = document.getElementById("new-exercise-category").value.trim();
                const exerciseName = document.getElementById("new-exercise-name").value.trim();
                const exerciseImage = document.getElementById("new-exercise-image").files[0]; // Archivo
                const exerciseVideo = document.getElementById("new-exercise-video").files[0]; // Archivo
                const exerciseInstructions = document.getElementById("new-exercise-instructions").value.trim();

                if (!exerciseName) return Swal.showValidationMessage("El nombre del ejercicio es obligatorio.");
                if (!selectedCategory && !newCategory) return Swal.showValidationMessage("Debes seleccionar o escribir una categoría.");
                if (!exerciseImage) return Swal.showValidationMessage("Debes subir una imagen.");
                if (!exerciseVideo) return Swal.showValidationMessage("Debes subir un video.");

                Swal.fire({
                    title: "Subiendo archivos...",
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                const imageUrl = await uploadToCloudinary(exerciseImage, "ejercicios");
                const videoUrl = await uploadToCloudinary(exerciseVideo, "ejercicios");

                return {
                    Nombre: exerciseName,
                    Categoria: selectedCategory === "other" ? newCategory : selectedCategory,
                    Imagen: imageUrl,
                    Video: videoUrl,
                    Instrucciones: exerciseInstructions
                };
            }
        });

        if (formValues) {
            const categoryRef = doc(db, `categories/${formValues.Categoria}`);
            const categorySnapshot = await getDoc(categoryRef);
            if (!categorySnapshot.exists()) await setDoc(categoryRef, {});

            const exercisesRef = collection(db, `categories/${formValues.Categoria}/exercises`);
            await addDoc(exercisesRef, formValues);

            Swal.fire("¡Ejercicio agregado!", "", "success");
            loadExercises(db, exerciseGrid);
        }
    } catch (error) {
        Swal.fire("Error", "No se pudo agregar el ejercicio.", "error");
        console.error("Error al agregar ejercicio:", error);
    }
}

function showExerciseDetails(Nombre, Video, Instrucciones, Imagen, exercise) {
    console.log("Ejercicio recibido:", exercise); // Verifica que exercise tenga datos

    Swal.fire({
        title: `Editar ejercicio: ${Nombre}`,
        html: `
            <div class="edit-popup">
                <!-- Columna izquierda (Imágenes) -->
                <div class="column">
                    <div class="input-group">
                        <label>Imagen actual:</label>
                        <input type="text" id="current-image" class="swal2-input" value="${Imagen || ''}" disabled>
                    </div>
                    <div class="input-group">
                        <label>Nueva imagen:</label>
                        <input type="file" id="new-image" class="swal2-file">
                    </div>
                </div>

                <!-- Columna derecha (Videos) -->
                <div class="column">
                    <div class="input-group">
                        <label>Video actual:</label>
                        <input type="text" id="current-video" class="swal2-input" value="${Video || ''}" disabled>
                    </div>
                    <div class="input-group">
                        <label>Nuevo video:</label>
                        <input type="file" id="new-video" class="swal2-file">
                    </div>
                </div>

                <!-- Instrucciones -->
                <div class="instructions-group">
                    <div class="input-group">
                        <label>Instrucciones actuales:</label>
                        <textarea id="current-instructions" class="swal2-textarea" disabled>${Instrucciones || ''}</textarea>
                    </div>
                    <div class="input-group">
                        <label>Nuevas instrucciones:</label>
                        <textarea id="new-instructions" class="swal2-textarea" placeholder="Escribe las nuevas instrucciones..."></textarea>
                    </div>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: "Guardar cambios",
        cancelButtonText: "Cancelar",
        customClass: {
            popup: "swal-wide"
        },
        preConfirm: async () => {
            const newImageFile = document.getElementById("new-image").files[0];
            const newVideoFile = document.getElementById("new-video").files[0];
            const newInstructions = document.getElementById("new-instructions").value.trim() || Instrucciones;

            // Mostrar el Swal de carga al iniciar la subida de archivos
            Swal.fire({
                title: "Subiendo archivos...",
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            try {
                const db = getFirestore();
                const category = exercise.Categoria || exercise.categoria;
                
                if (!category) {
                    throw new Error("La categoría del ejercicio no está definida.");
                }

                const exerciseRef = doc(db, `categories/${category}/exercises/${exercise.id}`);

                const docSnapshot = await getDoc(exerciseRef);
                if (!docSnapshot.exists()) {
                    throw new Error("No se pudo encontrar el ejercicio para actualizar.");
                }

                let newImageUrl = Imagen;
                let newVideoUrl = Video;

                // Subir imagen a Cloudinary si el usuario seleccionó un archivo nuevo
                if (newImageFile) {
                    newImageUrl = await uploadToCloudinary(newImageFile, "gym_images");
                }

                // Subir video a Cloudinary si el usuario seleccionó un archivo nuevo
                if (newVideoFile) {
                    newVideoUrl = await uploadToCloudinary(newVideoFile, "gym_videos");
                }

                // Actualizar en Firestore
                await updateDoc(exerciseRef, {
                    Imagen: newImageUrl,
                    Video: newVideoUrl,
                    Instrucciones: newInstructions
                });

                Swal.fire({
                    title: "¡Actualizado!",
                    text: "El ejercicio se ha actualizado correctamente.",
                    icon: "success",
                    customClass: {
                        popup: "swal-custom"
                    }
                }).then(() => {
                    window.location.reload();
                });

            } catch (error) {
                Swal.fire({
                    title: "Error",
                    text: `No se pudo actualizar el ejercicio: ${error.message}`,
                    icon: "error",
                    customClass: {
                        popup: "swal-custom"
                    }
                });
                console.error("Error al actualizar ejercicio:", error);
            }
        }
    });
}

    });
});