import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import app from './firebaseConfig.js';

const db = getFirestore(app);

async function mostrarPrecios() {
    try {
    console.log("Buscando precios en Firestore...");
    const docRef = doc(db, "precios", "entrenamientos");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
    const precios = docSnap.data();
    console.log("Precios encontrados:", precios);

// Entrenamiento online
document.getElementById("precio-mensual").textContent = `$${precios.online.mensual.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
document.getElementById("precio-trimestral").textContent = `$${precios.online.trimestral.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

// Entrenamiento presencial
document.getElementById("precio-2x").textContent = `$${precios.presencial["2xsemana"].toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
document.getElementById("precio-3x").textContent = `$${precios.presencial["3xsemana"].toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
document.getElementById("precio-4x").textContent = `$${precios.presencial["4xsemana"].toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
document.getElementById("precio-5x").textContent = `$${precios.presencial["5xsemana"].toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

// Descuento grupal (asumo que es un número entero, si no cambia)
document.getElementById("descuento-grupal").textContent = `${precios.descuentoGrupal}%`;

    } else {
    console.error("No se encontró el documento 'precios/entrenamientos'");
    }
} catch (error) {
    console.error("Error obteniendo precios:", error);
}
}

window.addEventListener("DOMContentLoaded", () => {
mostrarPrecios();
});
