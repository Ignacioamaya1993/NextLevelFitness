import app from './firebaseConfig.js';
import {
    getFirestore,
    collection,
    getDocs,
    doc,
    deleteDoc,
    setDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";

const db = getFirestore(app);
const auth = getAuth(app);

const list = document.getElementById("categories-list");
const addBtn = document.getElementById("add-category-btn");

// 🔐 Verificar login
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login-admin.html";
        return;
    }

    loadCategories();
});

// ➕ Crear categoría
addBtn.addEventListener("click", async () => {
const { value } = await Swal.fire({
    title: "Nueva categoría",
    input: "text",
    inputPlaceholder: "Ej: Pecho",
    showCancelButton: true,
    confirmButtonText: "Crear",
    cancelButtonText: "Cancelar",
    customClass: { popup: "swal-custom-text" }
});

    if (!value) return;

    const newCategory = value.trim();

    if (!newCategory) {
        Swal.fire("Error", "El nombre no puede estar vacío", "error");
        return;
    }

    // evitar duplicados (case insensitive)
    const snapshot = await getDocs(collection(db, "categories"));
    const exists = snapshot.docs.some(doc => doc.id.toLowerCase() === newCategory.toLowerCase());

    if (exists) {
        Swal.fire("Error", "Ya existe una categoría con ese nombre", "error");
        return;
    }

    await setDoc(doc(db, "categories", newCategory), {});
    Swal.fire("Creada", "Categoría creada correctamente", "success");

    loadCategories();
});

// 📦 Cargar categorías
async function loadCategories() {
    list.innerHTML = "<p>Cargando...</p>";

    try {
        const snapshot = await getDocs(collection(db, "categories"));

        if (snapshot.empty) {
            list.innerHTML = "<p>No hay categorías creadas.</p>";
            return;
        }

        list.innerHTML = "";

        for (const catDoc of snapshot.docs) {
            const category = catDoc.id;

            // 🔢 contar ejercicios
            const exercisesSnap = await getDocs(
                collection(db, `categories/${category}/exercises`)
            );

            const count = exercisesSnap.size;

            const div = document.createElement("div");
            div.className = "category-card";

            div.innerHTML = `
                <span><strong>${category}</strong> (${count} ejercicios)</span>
                <div class="actions">
                    <button class="edit-btn">✏️</button>
                    <button class="delete-btn">🗑</button>
                </div>
            `;

            // ✏️ Renombrar
            div.querySelector(".edit-btn").addEventListener("click", () => {
                renameCategory(category);
            });

            // 🗑 Eliminar
            div.querySelector(".delete-btn").addEventListener("click", () => {
                deleteCategory(category, count);
            });

            list.appendChild(div);
        }

    } catch (error) {
        console.error(error);
        list.innerHTML = "<p>Error al cargar categorías</p>";
    }
}

// 🗑 Eliminar categoría (solo si está vacía)
async function deleteCategory(category, count) {

    if (count > 0) {
        Swal.fire({
            icon: "warning",
            title: "No se puede eliminar",
            text: "La categoría tiene ejercicios. Debes moverlos antes.",
            customClass: { popup: "swal-custom-text" }
        });
        return;
    }

    const confirm = await Swal.fire({
        title: `Eliminar "${category}"?`,
        text: "Esta acción no se puede deshacer",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
        customClass: { popup: "swal-custom-text" }
    });

    if (!confirm.isConfirmed) return;

    try {
        await deleteDoc(doc(db, "categories", category));

        Swal.fire({
            title: "Eliminada",
            icon: "success",
            customClass: { popup: "swal-custom-text" }
        });

        loadCategories();

    } catch (error) {
        console.error(error);
        Swal.fire("Error", "No se pudo eliminar", "error");
    }
}

// ✏️ Renombrar categoría (con migración)
async function renameCategory(oldName) {

const { value: newNameRaw } = await Swal.fire({
    title: "Renombrar categoría",
    input: "text",
    inputValue: oldName,
    showCancelButton: true,
    confirmButtonText: "Guardar",
    cancelButtonText: "Cancelar",
    customClass: { popup: "swal-custom-text" }
});
    if (!newNameRaw) return;

    const newName = newNameRaw.trim();

    if (!newName || newName === oldName) return;

    try {
        // validar duplicados
        const snapshot = await getDocs(collection(db, "categories"));
        const exists = snapshot.docs.some(doc => doc.id.toLowerCase() === newName.toLowerCase());

        if (exists) {
            Swal.fire("Error", "Ya existe una categoría con ese nombre", "error");
            return;
        }

        Swal.fire({
            title: "Renombrando...",
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        // crear nueva categoría
        await setDoc(doc(db, "categories", newName), {});

        // mover ejercicios
        const exercisesSnap = await getDocs(
            collection(db, `categories/${oldName}/exercises`)
        );

        for (const ex of exercisesSnap.docs) {
            const data = ex.data();

            // crear en nueva
            await setDoc(
                doc(db, `categories/${newName}/exercises/${ex.id}`),
                { ...data, Categoria: newName }
            );

            // borrar viejo
            await deleteDoc(
                doc(db, `categories/${oldName}/exercises/${ex.id}`)
            );
        }

        // eliminar categoría vieja
        await deleteDoc(doc(db, "categories", oldName));

        Swal.fire({
            title: "Renombrada",
            icon: "success",
            customClass: { popup: "swal-custom-text" }
        });

        loadCategories();

    } catch (error) {
        console.error(error);
        Swal.fire("Error", "No se pudo renombrar", "error");
    }
}