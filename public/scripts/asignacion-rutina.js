import { db } from './firebaseConfig.js';
import { collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js';

document.addEventListener('DOMContentLoaded', () => {
    const auth = getAuth();
    let currentUser = null;

    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            console.log('✅ Usuario autenticado:', user.email);
        } else {
            alert('No tienes permiso para acceder. Inicia sesión.');
            window.location.href = 'login-admin.html';
        }
    });

    const searchButton = document.getElementById('search-button');
    const searchInput = document.getElementById('search-input');
    const noUserMessage = document.getElementById('no-user-message');
    const routineViewer = document.getElementById('routine-viewer');
    const userNameDisplay = document.getElementById('user-name');
    const noRoutinesMessage = document.getElementById('no-routines-message');
    const routineList = document.getElementById('routine-list');

    async function searchUser() {
        if (!currentUser) {
            alert('Debes estar autenticado para buscar usuarios.');
            return;
        }
    
        const queryText = searchInput.value.trim();
        if (!queryText) {
            alert('Por favor, ingresa un nombre o correo para buscar.');
            return;
        }
    
        // Ocultamos mensajes previos y limpiamos la lista
        noUserMessage.classList.add('hidden'); // Aseguramos que el mensaje de "No se encontró" esté oculto
        routineViewer.classList.add('hidden');
        noRoutinesMessage.classList.add('hidden');
        routineList.innerHTML = '';
    
        try {
            let userQuery;
            if (queryText.includes('@')) {
                userQuery = query(collection(db, 'usuarios'), where('email', '==', queryText));
                console.log(`📧 Búsqueda por correo: ${queryText}`);
            } else {
                const [firstName, lastName] = queryText.split(' ');
                userQuery = query(
                    collection(db, 'usuarios'),
                    where('nombre', '==', firstName.toLowerCase()),
                    where('apellido', '==', lastName.toLowerCase())
                );
                console.log(`📑 Búsqueda por nombre: ${firstName} ${lastName}`);
            }
    
            const querySnapshot = await getDocs(userQuery);
    
            if (querySnapshot.empty) {
                noUserMessage.classList.remove('hidden');
                console.log('🔍 No se encontró un usuario.');
                return;
            }
    
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();
            const userId = userDoc.id;
    
            userNameDisplay.textContent = `${userData.nombre} ${userData.apellido}`;
    
            // **Buscar rutinas del usuario**
            const routinesQuery = query(collection(db, 'routines'), where('userId', '==', userId));
            const routinesSnapshot = await getDocs(routinesQuery);
            const routines = routinesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    
            if (routines.length === 0) {
                noRoutinesMessage.classList.remove('hidden');
            } else {
                displayRoutines(routines);
            }
    
            routineViewer.classList.remove('hidden');
            console.log('👀 Vista de rutinas activada.');
    
        } catch (error) {
            console.error('Error buscando usuario o rutinas:', error);
        }
    }

    function displayRoutines(routines) {
        routineList.innerHTML = ''; // Limpiar lista previa
        console.log('🔧 Mostrando rutinas:', routines); // Ver qué rutinas se están pasando a la función
    
        routines.forEach((routineDoc) => {
            const { day, exercise } = routineDoc;
            console.log(`📅 Día de la rutina: ${day}`); // Verificar día
            console.log('🏋️‍♂️ Ejercicio:', exercise); // Verificar ejercicios
    
            // Título del día
            const dayTitle = document.createElement('h2');
            dayTitle.textContent = `Día: ${day || 'Sin día especificado'}`;
            routineList.appendChild(dayTitle);
    
            if (Array.isArray(exercise)) {
                // Procesar exercise como array
                exercise.forEach((routine, i) => displayRoutineDetails(routine, i + 1));
            } else if (typeof exercise === 'object') {
                // Procesar exercise como objeto
                displayRoutineDetails(exercise, 1); // Muestra el ejercicio del objeto
            } else {
                // Caso donde no hay ejercicios válidos
                const noExerciseMessage = document.createElement('p');
                noExerciseMessage.textContent = 'No hay ejercicios registrados para este día.';
                routineList.appendChild(noExerciseMessage);
            }
        });
    
        routineViewer.classList.remove('hidden');
        console.log('👀 Vista de rutinas activada.');
    }

    // **Función para mostrar los detalles de un ejercicio**
    function displayRoutineDetails(routine, index) {
        console.log(`🔧 Detalles del ejercicio ${index}:`, routine);
        
        const routineDiv = document.createElement('div');
        routineDiv.classList.add('routine');

        const routineTitle = document.createElement('h3');
        routineTitle.textContent = `Ejercicio ${index}: ${routine.name || 'Sin nombre'}`;

        const routineDetails = document.createElement('p');
        routineDetails.textContent = `Series: ${routine.series || 'N/A'}, 
            Repeticiones: ${routine.repetitions || 'N/A'}, 
            Peso: ${routine.weight || 'N/A'} kg
        `;

        routineDiv.appendChild(routineTitle);
        routineDiv.appendChild(routineDetails);
        routineList.appendChild(routineDiv);
    }

    // **Eventos de búsqueda**
    searchButton.addEventListener('click', searchUser);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchUser();
    });
});