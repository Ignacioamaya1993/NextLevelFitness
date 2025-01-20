// Selección de elementos
const menuToggle = document.querySelector('.menu-toggle');
const navMenu = document.querySelector('.nav-menu');
const body = document.body;

// Manejo del menú desplegable
menuToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active'); // Muestra u oculta el menú
    body.classList.toggle('menu-open'); // Desactiva el scroll en el body
});
