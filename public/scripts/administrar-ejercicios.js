import app from './firebaseConfig.js';
import { getFirestore, doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
    const auth = getAuth(app);
    const db = getFirestore(app); // Asegúrate de definir db aquí
    
    // Verificamos si el usuario está autenticado
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            console.log("No estás autenticado. Redirigiendo a login.");
            alert("No estás autenticado. Redirigiendo a login.");
            window.location.href = "login-admin.html";
            return;
        }

        console.log("Usuario autenticado:", user.email);

        // Verificamos si el usuario tiene permisos de administrador según las reglas de Firestore
        const userDocRef = doc(db, "usuarios", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            // Verificar si el usuario tiene permisos de administrador
            if (userData.isAdmin) { // Si el usuario tiene el campo isAdmin en Firestore
                console.log("El usuario es administrador.");
                // Hacer visible el panel de administración
                const adminPanel = document.getElementById("adminPanel");
                if (adminPanel) {
                    adminPanel.style.display = "block"; // Mostrar panel de administración
                }
            } else {
                console.log("El usuario no es administrador.");
                Swal.fire("Error", "Solo los administradores pueden acceder a esta sección.", "error");
                window.location.href = "panel-admin.html"; // Redirigir a otra página si no es admin
            }
        } else {
            console.log("Documento de usuario no encontrado.");
            alert("No se encontró el usuario en la base de datos.");
        }

        // Lógica para el panel de administración de ejercicios
        if (window.__isInitializedAdmin) return; // Evita la inicialización múltiple
        window.__isInitializedAdmin = true;

        const categoryFilter = document.getElementById("admin-category-filter");
        const exerciseTable = document.getElementById("exercise-table");
        const addExerciseBtn = document.getElementById("add-exercise-btn");

        // Cargar categorías y ejercicios
        await loadCategories();
        await loadExercises();

        // Filtrar por categoría
        categoryFilter.addEventListener("change", async () => {
            const selectedCategory = categoryFilter.value;
            await loadExercises(db, exerciseTable, selectedCategory);
        });

        let debounceTimeout;
        const searchBar = document.getElementById("search-bar");
        searchBar.addEventListener("input", async () => {
            const selectedCategory = categoryFilter.value;
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(async () => {
                await loadExercises(db, exerciseTable, selectedCategory, searchBar.value);
            }, 300);
        });

        // Botón para agregar un nuevo ejercicio
        addExerciseBtn.addEventListener("click", () => {
            openExerciseModal(null); // Sin datos = Nuevo ejercicio
        });

        // Función auxiliar para renderizar las categorías
        async function loadCategories() {
            const categoriesSnapshot = await getDocs(collection(db, "categories"));
            renderCategories(categoriesSnapshot);
        }

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

        async function showExerciseDetails(nombre, video, instrucciones) {
            const user = JSON.parse(localStorage.getItem("user"));

            // Verificar si el usuario está autenticado y es administrador
            if (!user || !user.isAdmin) {
                Swal.fire("Error", "Debes estar logueado como administrador para guardar rutinas.", "error");
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
                    </div>
                </div>`;

            Swal.fire({
                title: "Detalles del ejercicio",
                html: contentHTML,
                showCancelButton: true,
                confirmButtonText: "Cerrar",
                customClass: {
                    popup: 'custom-popup',
                    title: 'swal2-title'
                },
                width: 'auto'
            });
        }
    })
});