import { getFirestore, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import app from './firebaseConfig.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";

const db = getFirestore(app);
const form = document.getElementById("form-precios");
const submitBtn = form.querySelector("button");
let valoresOriginales = {};

document.addEventListener("DOMContentLoaded", () => {
  const auth = getAuth(app);
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "login-admin.html";
      return;
    }
    await cargarPrecios(); // Cargar precios iniciales
    agregarListeners(); // Escuchar cambios
  });
});

// Cargar precios actuales
async function cargarPrecios() {
  try {
    const docRef = doc(db, "precios", "entrenamientos");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const precios = docSnap.data();
      valoresOriginales = {
        "online-mensual": precios.online.mensual,
        "online-trimestral": precios.online.trimestral,
        "presencial-2x": precios.presencial["2xsemana"],
        "presencial-3x": precios.presencial["3xsemana"],
        "presencial-4x": precios.presencial["4xsemana"],
        "presencial-5x": precios.presencial["5xsemana"],
        "descuento-grupal": precios.descuentoGrupal,
      };

      for (const id in valoresOriginales) {
        document.getElementById(id).value = valoresOriginales[id];
      }

      // Botón deshabilitado por defecto
      submitBtn.disabled = true;
      submitBtn.style.opacity = 0.5;
      submitBtn.style.cursor = 'not-allowed';
    } else {
      console.error("No se encontró el documento de precios.");
    }
  } catch (error) {
    console.error("Error al cargar precios:", error);
  }
}

// Verifica si hay cambios respecto a los valores originales
function verificarCambios() {
  for (const id in valoresOriginales) {
    const currentValue = parseInt(document.getElementById(id).value);
    if (currentValue !== valoresOriginales[id]) {
      habilitarBoton(true);
      return;
    }
  }
  habilitarBoton(false);
}

// Activa o desactiva el botón de submit
function habilitarBoton(estado) {
  submitBtn.disabled = !estado;
  submitBtn.style.opacity = estado ? 1 : 0.5;
  submitBtn.style.cursor = estado ? 'pointer' : 'not-allowed';
}

// Agrega listeners a los inputs
function agregarListeners() {
  for (const id in valoresOriginales) {
    document.getElementById(id).addEventListener("input", verificarCambios);
  }
}

// Guardar nuevos precios
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nuevosValores = {
    "online.mensual": parseInt(document.getElementById("online-mensual").value),
    "online.trimestral": parseInt(document.getElementById("online-trimestral").value),
    "presencial.2xsemana": parseInt(document.getElementById("presencial-2x").value),
    "presencial.3xsemana": parseInt(document.getElementById("presencial-3x").value),
    "presencial.4xsemana": parseInt(document.getElementById("presencial-4x").value),
    "presencial.5xsemana": parseInt(document.getElementById("presencial-5x").value),
    descuentoGrupal: parseInt(document.getElementById("descuento-grupal").value),
  };

  try {
    const preciosRef = doc(db, "precios", "entrenamientos");
    await updateDoc(preciosRef, nuevosValores);

    Swal.fire({
      icon: 'success',
      title: '¡Listo!',
      text: 'Los precios se actualizaron correctamente.',
      confirmButtonText: 'OK',
      background: '#333', // color de fondo
      didOpen: () => {
        const content = Swal.getHtmlContainer();
        if (content) content.style.color = 'white'; // forzar color blanco al texto
      }
    });

    // Guardar nuevos valores como originales
    for (const key in valoresOriginales) {
      valoresOriginales[key] = parseInt(document.getElementById(key).value);
    }
    habilitarBoton(false);
  } catch (error) {
    console.error("Error al actualizar precios:", error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se pudieron actualizar los precios. Intenta de nuevo.',
      background: '#333',
      didOpen: () => {
        const content = Swal.getHtmlContainer();
        if (content) content.style.color = 'white';
      }
    });
  }
});