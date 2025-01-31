import app, { db } from "../scripts/firebaseConfig.js";
import { getFirestore, collection, doc, getDocs, addDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import { query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
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

        // Tu lógica para el panel de administración de ejercicios
        if (window.__isInitializedAdmin) return;
        window.__isInitializedAdmin = true;

    const db = getFirestore(app);
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));  // Renombrado aquí
    const categoryFilter = document.getElementById("admin-category-filter");
    const exerciseTable = document.getElementById("exercise-table");
    const addExerciseBtn = document.getElementById("add-exercise-btn");

    if (!currentUser || !currentUser.isAdmin) {  // Cambiado a currentUser
        adminPanel.innerHTML = "<p>Acceso denegado. Solo administradores pueden ver esta sección.</p>";
        return;
    }

    // Cargar categorías y ejercicios
    await loadCategories();
    await loadExercises();

     // Filtrar por categoría
     categoryFilter.addEventListener("change", async () => {
        const selectedCategory = categoryFilter.value;
        await loadExercises(db, exerciseTable, selectedCategory, searchBar.value);
    });

    let debounceTimeout;
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

    async function loadCategories() {
        try {
            const categoriesRef = collection(db, "categories");
            let categoriesSnapshot = await getDocs(categoriesRef, { source: "cache" });

            if (categoriesSnapshot.empty) {
                console.log("No hay datos en caché, obteniendo desde Firestore...");
                categoriesSnapshot = await getDocs(categoriesRef, { source: "server" });
            }

            renderCategories(categoriesSnapshot);

            onSnapshot(categoriesRef, (snapshot) => {
                console.log("Actualización en Firestore detectada...");
                renderCategories(snapshot);
            });

        } catch (error) {
            console.error("Error al cargar categorías:", error);
        }
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
        exerciseGrid.innerHTML = "";

        try {
            const exercises = [];
            let exercisesSnapshot;

            if (category === "all") {
                const categoriesSnapshot = await getDocs(collection(db, "categories"));
                for (const categoryDoc of categoriesSnapshot.docs) {
                    exercisesSnapshot = await getDocs(collection(db, `categories/${categoryDoc.id}/exercises`), { source: "cache" });
                    if (exercisesSnapshot.empty) {
                        exercisesSnapshot = await getDocs(collection(db, `categories/${categoryDoc.id}/exercises`), { source: "server" });
                    }
                    exercisesSnapshot.forEach((doc) => {
                        exercises.push(doc.data());
                    });
                }
            } else {
                exercisesSnapshot = await getDocs(collection(db, `categories/${category}/exercises`), { source: "cache" });
                if (exercisesSnapshot.empty) {
                    exercisesSnapshot = await getDocs(collection(db, `categories/${category}/exercises`), { source: "server" });
                }
                exercisesSnapshot.forEach((doc) => {
                    exercises.push(doc.data());
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

                exerciseCard.innerHTML = `
                    <h3>${exercise.Nombre}</h3>
                    <img src="${exercise.Imagen}" alt="${exercise.Nombre}">
                `;
                exerciseCard.appendChild(button);
                exerciseGrid.appendChild(exerciseCard);
            });

            console.log("Ejercicios cargados correctamente.");

            const categoryRef = category === "all" ? collection(db, "categories") : collection(db, `categories/${category}/exercises`);
            onSnapshot(categoryRef, (snapshot) => {
                console.log("Actualización en Firestore detectada...");
                loadExercises(db, exerciseGrid, category, searchQuery);
            });

        } catch (error) {
            console.error("Error al cargar ejercicios:", error);
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
})