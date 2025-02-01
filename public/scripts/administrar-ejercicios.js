import app from './firebaseConfig.js';
import { getFirestore, collection, getDocs, getDoc, addDoc, updateDoc, doc, query, where, deleteDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";

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
        const routineBuilder = document.getElementById("routine-builder");
        const categoryFilter = document.getElementById("category-filter");
        const exerciseGrid = document.getElementById("exercise-grid");
        const searchBar = document.getElementById("search-bar");

        routineBuilder.classList.remove("hidden");

        const db = getFirestore(app);

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

        async function loadCategories(db, categoryFilter) {
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

        // Función para cargar y mostrar los ejercicios
        async function loadExercises(db, exerciseGrid, category = "all", searchQuery = "") {
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

                    const selectButton = document.createElement("button");
                    selectButton.textContent = "Seleccionar";
                    selectButton.addEventListener("click", () =>
                        showExerciseDetails(exercise.Nombre, exercise.Video, exercise.Instrucciones, exercise.Imagen, exercise)
                    );

                    // Botón para eliminar ejercicio
                    const deleteButton = document.createElement("button");
                    deleteButton.textContent = "Eliminar ejercicio";  // Cambiar texto del botón
                    deleteButton.style.backgroundColor = "red";
                    deleteButton.style.color = "white";
                    deleteButton.style.border = "none";
                    deleteButton.style.padding = "8px 12px";
                    deleteButton.style.cursor = "pointer";
                    deleteButton.style.borderRadius = "5px";
                    deleteButton.addEventListener("click", () => {
                        Swal.fire({
                            title: '¿Estás seguro?',
                            text: "Esta acción no se puede deshacer.",
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonText: 'Sí, eliminar',
                            cancelButtonText: 'Cancelar'
                        }).then(async (result) => {
                            if (result.isConfirmed) {
                                try {
                                    // Eliminamos el ejercicio de Firestore
                                    const exerciseRef = doc(db, `categories/${exercise.Categoria}/exercises/${exercise.id}`);
                                    await deleteDoc(exerciseRef);
                                    Swal.fire('¡Eliminado!', 'El ejercicio ha sido eliminado.', 'success');
                                    loadExercises(db, exerciseGrid, category, searchQuery); // Volver a cargar los ejercicios
                                } catch (error) {
                                    Swal.fire('Error', 'No se pudo eliminar el ejercicio.', 'error');
                                    console.error("Error al eliminar ejercicio:", error);
                                }
                            }
                        });
                    });

                    exerciseCard.innerHTML = `
                        <h3>${exercise.Nombre}</h3>
                        <img src="${exercise.Imagen || 'default-image.jpg'}" alt="${exercise.Nombre}">
                    `;

                    // Añadimos ambos botones (Seleccionar y Eliminar) dentro de la misma tarjeta
                    const buttonContainer = document.createElement("div");
                    buttonContainer.style.display = "flex";
                    buttonContainer.style.gap = "10px";

                    buttonContainer.appendChild(selectButton);
                    buttonContainer.appendChild(deleteButton);  // Agregar el botón de eliminar

                    exerciseCard.appendChild(buttonContainer);
                    exerciseGrid.appendChild(exerciseCard);
                });

                console.log("Ejercicios cargados correctamente.");
            } catch (error) {
                console.error("Error al cargar ejercicios:", error);
            }
        }

        function showExerciseDetails(Nombre, Video, Instrucciones, Imagen, exercise) {
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
                                <input type="text" id="new-image" class="swal2-input" placeholder="Nueva URL de imagen">
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
                                <input type="text" id="new-video" class="swal2-input" placeholder="Nueva URL de video">
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
                    const newImage = document.getElementById("new-image").value.trim() || Imagen;
                    const newVideo = document.getElementById("new-video").value.trim() || Video;
                    const newInstructions = document.getElementById("new-instructions").value.trim() || Instrucciones;
        
                    try {
                        const db = getFirestore();
        
                        // Si el ejercicio tiene un campo 'categoria', usamos ese valor como referencia
                        const category = exercise.categoria;
        
                        if (!category) {
                            throw new Error("La categoría del ejercicio no está definida.");
                        }
        
                        // Obtener la referencia al documento del ejercicio en la colección correspondiente
                        const exerciseRef = doc(db, `categories/${category}/exercises/${exercise.id}`);
        
                        const docSnapshot = await getDoc(exerciseRef);
        
                        if (docSnapshot.exists()) {
                            // El documento existe, proceder con la actualización
                            await updateDoc(exerciseRef, {
                                Imagen: newImage,
                                Video: newVideo,
                                Instrucciones: newInstructions
                            });
                            Swal.fire("¡Actualizado!", "El ejercicio se ha actualizado correctamente.", "success");
                        } else {
                            // El documento no existe, manejar el error
                            Swal.fire("Error", "No se pudo encontrar el ejercicio para actualizar.", "error");
                            console.error("Documento no encontrado:", exerciseRef);
                        }
                    } catch (error) {
                        Swal.fire("Error", `No se pudo actualizar el ejercicio: ${error.message}`, "error");
                        console.error("Error al actualizar ejercicio:", error);
                    }
                }
            });
        }
        
    });
});