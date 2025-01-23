import app from './firebaseConfig.js';
import { getFirestore, collection, doc, getDocs, addDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
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

        function debounce(func, wait) {
            let timeout;
            return function (...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        }

        searchBar.addEventListener("input", debounce(async () => {
            const selectedCategory = categoryFilter.value;
            await loadExercises(db, exerciseGrid, selectedCategory, searchBar.value);
        }, 300));
    }

    async function loadCategories(db, categoryFilter) {
        try {
            const categoriesRef = collection(db, "categories");
            const categoriesSnapshot = await getDocs(categoriesRef);

            categoryFilter.innerHTML = "<option value='all'>Todas las categorías</option>";

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
            const exercises = [];

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

            const filteredExercises = exercises.filter((exercise) =>
                exercise.Nombre.toLowerCase().includes(searchQuery.toLowerCase())
            );

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

                const title = document.createElement("h3");
                title.textContent = exercise.Nombre;

                const image = document.createElement("img");
                image.src = exercise.Imagen;
                image.alt = exercise.Nombre;

                exerciseCard.appendChild(title);
                exerciseCard.appendChild(image);
                exerciseCard.appendChild(button);

                exerciseGrid.appendChild(exerciseCard); // Agregar el ejercicio al contenedor
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
                <!-- Contenido del popup -->
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
            width: 'auto',
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
                    const routinesRef = collection(db, "routines");
                    const routinesSnapshot = await getDocs(routinesRef);
                    const existingRoutineDoc = routinesSnapshot.docs.find(doc =>
                        doc.data().userId === user.uid && doc.data().day === dia
                    );

                    const exerciseId = crypto.randomUUID();

                    if (existingRoutineDoc) {
                        const routineData = existingRoutineDoc.data();
                        const updatedExercises = [...routineData.exercises, {
                            id: exerciseId,
                            name: nombre,
                            series,
                            repetitions: repeticiones,
                            weight: peso,
                            video,
                            instructions: instrucciones,
                            additionalData: adicionales,
                        }];

                        await updateDoc(doc(db, "routines", existingRoutineDoc.id), {
                            exercises: updatedExercises,
                        });

                        Swal.fire("Guardado", "El ejercicio se ha añadido a tu rutina para este día.", "success");
                    } else {
                        await addDoc(routinesRef, {
                            userId: user.uid,
                            day: dia,
                            exercises: [{
                                id: exerciseId,
                                name: nombre,
                                series,
                                repetitions: repeticiones,
                                weight: peso,
                                video,
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