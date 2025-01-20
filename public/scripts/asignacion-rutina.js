import { db, auth } from './firebaseConfig.js'; // Importamos la configuración de Firebase
import { collection, query, where, getDocs } from 'firebase/firestore';

const searchButton = document.getElementById('search-button');
const searchInput = document.getElementById('search-input');
const noUserMessage = document.getElementById('no-user-message');
const routineViewer = document.getElementById('routine-viewer');
const userNameDisplay = document.getElementById('user-name');
const noRoutinesMessage = document.getElementById('no-routines-message');
const routineList = document.getElementById('routine-list');

// Función para buscar el usuario en Firestore
async function searchUser() {
    const queryText = searchInput.value.trim();

    if (!queryText) {
        alert('Por favor, ingresa un nombre o correo para buscar.');
        return;
    }

    // Ocultamos los mensajes previos
    noUserMessage.classList.add('hidden');
    routineViewer.classList.add('hidden');
    noRoutinesMessage.classList.add('hidden');

    try {
        // Hacemos la consulta para buscar el usuario por nombre o correo
        let userQuery;
        if (queryText.includes('@')) {
            // Si el input tiene un '@', lo tratamos como correo
            userQuery = query(
                collection(db, 'users'),
                where('email', '==', queryText) // Buscar por correo
            );
        } else {
            // Si no es correo, buscamos por nombre completo
            userQuery = query(
                collection(db, 'users'),
                where('fullName', '==', queryText) // Buscar por nombre completo
            );
        }

        const querySnapshot = await getDocs(userQuery);

        if (querySnapshot.empty) {
            // Si no encontramos el usuario, mostramos el mensaje
            console.log('No se encontró el usuario');
            noUserMessage.classList.remove('hidden');
            return;
        }

        // Si encontramos el usuario, mostramos su nombre y rutinas
        const userDoc = querySnapshot.docs[0]; // Asumimos que hay un solo resultado
        const userData = userDoc.data();
        console.log('Usuario encontrado:', userData);
        userNameDisplay.textContent = userData.fullName;

        // Verificamos si el usuario tiene rutinas asignadas
        const routines = userData.routines || [];
        if (routines.length === 0) {
            noRoutinesMessage.classList.remove('hidden');
        } else {
            displayRoutines(routines);
        }

        // Mostramos el contenedor de rutinas
        routineViewer.classList.remove('hidden');

    } catch (error) {
        console.error('Error buscando usuario:', error);
    }
}

// Función para mostrar las rutinas
function displayRoutines(routines) {
    routineList.innerHTML = ''; // Limpiamos la lista de rutinas antes de agregar nuevas

    routines.forEach(routine => {
        const routineDiv = document.createElement('div');
        routineDiv.classList.add('routine');

        const routineTitle = document.createElement('h3');
        routineTitle.textContent = routine.name;

        const routineDetails = document.createElement('p');
        routineDetails.textContent = `Series: ${routine.series}, Repeticiones: ${routine.repetitions}`;

        routineDiv.appendChild(routineTitle);
        routineDiv.appendChild(routineDetails);
        routineList.appendChild(routineDiv);
    });
}

// Evento al hacer clic en el botón de buscar
searchButton.addEventListener('click', searchUser);

// También permitimos que presionar "Enter" en el input dispare la búsqueda
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchUser();
    }
});