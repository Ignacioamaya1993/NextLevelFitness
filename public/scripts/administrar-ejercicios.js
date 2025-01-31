import app from './firebaseConfig.js';
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";

// Inicializar Firestore
const db = getFirestore(app);
const categoriesCollection = collection(db, "categories"); 
const exercisesCollection = collection(db, "exercises");

// Función para cargar categorías
async function loadCategories() {
  try {
    const querySnapshot = await getDocs(categoriesCollection);
    const categories = querySnapshot.docs.map(doc => doc.data());
    console.log("Categorías cargadas: ", categories);

    // Limpiar el selector de categorías
    categoryFilter.innerHTML = '';

    // Crear una opción por cada categoría
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category.name; // Asumiendo que 'name' es el campo que contiene el nombre de la categoría
      option.textContent = category.name;
      categoryFilter.appendChild(option);
    });

  } catch (error) {
    console.error("Error al cargar categorías:", error);
  }
}    

// Función para cargar ejercicios
async function loadExercises(category = "all") {
  const exerciseGrid = document.getElementById("exercise-grid");
  exerciseGrid.innerHTML = ""; // Limpiar la lista de ejercicios

  try {
    const exercisesSnapshot = category === "all" 
      ? await getDocs(exercisesCollection) 
      : await getDocs(collection(db, `categories/${category}/exercises`));

    renderExercises(exercisesSnapshot, exerciseGrid);
  } catch (error) {
    console.error("Error al cargar ejercicios:", error);
  }
}

function renderExercises(exercisesSnapshot, exerciseGrid) {
  exercisesSnapshot.forEach((doc) => {
    const exercise = doc.data();
    const exerciseCard = document.createElement("div");
    exerciseCard.classList.add("exercise-card");

    exerciseCard.innerHTML = `
      <h3>${exercise.Nombre}</h3>
      <img src="${exercise.Imagen}" alt="${exercise.Nombre}">
      <button class="edit-button" data-id="${doc.id}">Editar</button>
      <button class="delete-button" data-id="${doc.id}">Eliminar</button>
    `;

    exerciseCard.querySelector(".edit-button").addEventListener("click", () => {
      showEditExerciseForm(exercise, doc.id);
    });

    exerciseCard.querySelector(".delete-button").addEventListener("click", async () => {
      const confirmed = await Swal.fire({
        title: '¿Estás seguro?',
        text: "Este ejercicio será eliminado permanentemente.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
      });

      if (confirmed.isConfirmed) {
        await deleteExercise(doc.id);
      }
    });

    exerciseGrid.appendChild(exerciseCard);
  });
}

async function showAddExerciseForm() {
  const { value: formValues } = await Swal.fire({
    title: 'Agregar Ejercicio',
    html: `
      <label for="exercise-name">Nombre del ejercicio:</label>
      <input id="exercise-name" type="text" required>
      <label for="exercise-category">Categoría:</label>
      <input id="exercise-category" type="text" required>
      <label for="exercise-description">Descripción:</label>
      <textarea id="exercise-description" required></textarea>
      <label for="exercise-image">Imagen URL:</label>
      <input id="exercise-image" type="url" required>
      <label for="exercise-video">Video URL:</label>
      <input id="exercise-video" type="url">
    `,
    focusConfirm: false,
    preConfirm: async () => {
      const name = document.getElementById("exercise-name").value;
      const category = document.getElementById("exercise-category").value;
      const description = document.getElementById("exercise-description").value;
      const image = document.getElementById("exercise-image").value;
      const video = document.getElementById("exercise-video").value;

      if (!name || !category || !description || !image) {
        Swal.showValidationMessage("Por favor completa todos los campos.");
        return false;
      }

      try {
        await addExercise(name, category, description, image, video);
        Swal.fire('Ejercicio agregado', '', 'success');
        loadExercises(category); // Recargar ejercicios
      } catch (error) {
        console.error("Error al agregar ejercicio:", error);
        Swal.fire("Error", "Hubo un problema al agregar el ejercicio.", "error");
      }
    }
  });
}

async function addExercise(name, category, description, image, video) {
  const exerciseRef = collection(db, `categories/${category}/exercises`);
  await addDoc(exerciseRef, {
    Nombre: name,
    Categoria: category,
    Descripcion: description,
    Imagen: image,
    Video: video || ''
  });
}

async function showEditExerciseForm(exercise, exerciseId) {
  const { value: formValues } = await Swal.fire({
    title: 'Editar Ejercicio',
    html: `
      <label for="edit-exercise-name">Nombre del ejercicio:</label>
      <input id="edit-exercise-name" value="${exercise.Nombre}" required>
      <label for="edit-exercise-category">Categoría:</label>
      <input id="edit-exercise-category" value="${exercise.Categoria}" required>
      <label for="edit-exercise-description">Descripción:</label>
      <textarea id="edit-exercise-description" required>${exercise.Descripcion}</textarea>
      <label for="edit-exercise-image">Imagen URL:</label>
      <input id="edit-exercise-image" value="${exercise.Imagen}" required>
      <label for="edit-exercise-video">Video URL:</label>
      <input id="edit-exercise-video" value="${exercise.Video}">
    `,
    focusConfirm: false,
    preConfirm: async () => {
      const name = document.getElementById("edit-exercise-name").value;
      const category = document.getElementById("edit-exercise-category").value;
      const description = document.getElementById("edit-exercise-description").value;
      const image = document.getElementById("edit-exercise-image").value;
      const video = document.getElementById("edit-exercise-video").value;

      if (!name || !category || !description || !image) {
        Swal.showValidationMessage("Por favor completa todos los campos.");
        return false;
      }

      try {
        await updateExercise(exerciseId, name, category, description, image, video);
        Swal.fire('Ejercicio actualizado', '', 'success');
        loadExercises(category); // Recargar ejercicios
      } catch (error) {
        console.error("Error al editar ejercicio:", error);
        Swal.fire("Error", "Hubo un problema al editar el ejercicio.", "error");
      }
    }
  });
}

async function updateExercise(exerciseId, name, category, description, image, video) {
  const exerciseRef = doc(db, `categories/${category}/exercises`, exerciseId);
  await updateDoc(exerciseRef, {
    Nombre: name,
    Categoria: category,
    Descripcion: description,
    Imagen: image,
    Video: video || ''
  });
}

async function deleteExercise(exerciseId) {
  const exerciseRef = doc(db, `categories/${categoryFilter.value}/exercises`, exerciseId);
  try {
    await deleteDoc(exerciseRef);
    Swal.fire("Eliminado", "El ejercicio ha sido eliminado.", "success");
    loadExercises(categoryFilter.value); // Recargar ejercicios
  } catch (error) {
    console.error("Error al eliminar ejercicio:", error);
    Swal.fire("Error", "No se pudo eliminar el ejercicio.", "error");
  }
}

// Verificar si el usuario está autenticado
const auth = getAuth(app);
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("Usuario autenticado: ", user.email);
    loadCategories();  // Llamar a la función después de verificar la autenticación
    loadExercises();   // Llamar a la función después de verificar la autenticación
  } else {
    console.log("Usuario no autenticado");
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  const user = JSON.parse(localStorage.getItem("currentUser"));
  const exerciseGrid = document.getElementById("exercise-grid");
  const categoryFilter = document.getElementById("category-filter");
  if (categoryFilter) {
      categoryFilter.addEventListener("change", async () => {
          const selectedCategory = categoryFilter.value;
          await loadExercises(selectedCategory);
      });
  } else {
      console.error("El selector de categorías no se encuentra en el DOM.");
  }
    const addExerciseButton = document.getElementById("add-exercise-button");

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

  // Cargar categorías
  await loadCategories();

  // Cargar ejercicios
  await loadExercises();

  // Evento de filtro por categoría
  categoryFilter.addEventListener("change", async () => {
    const selectedCategory = categoryFilter.value;
    await loadExercises(selectedCategory);
  });

  // Evento para agregar ejercicio
  addExerciseButton.addEventListener("click", () => {
    showAddExerciseForm();
  });
});
})
})