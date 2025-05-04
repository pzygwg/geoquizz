/**
 * main.js
 * Entry point for the GeoQuizz application
 * Bootstraps the MVC architecture and initializes the game
 */

// Import MVC components
import MapModel from './models/MapModel.js';
import CanvasView from './views/CanvasView.js';
import MenuView from './views/MenuView.js';
import GameController from './controllers/GameController.js';

/**
 * Initializes the application when the DOM is fully loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('GeoQuizz application starting...');
    
    // Initialize Model
    const mapModel = new MapModel();
    
    // Initialize Views
    const canvasView = new CanvasView('mapCanvas', 'tooltip');
    const menuView = new MenuView();
    
    // Initialize Controller
    const gameController = new GameController(mapModel, canvasView, menuView);
    
    // Initialize the game with the SVG map path
    gameController.init('assets/world.svg').catch(error => {
        console.error('Error initializing game:', error);
    });
    
    // Enable accessibility toggle (optional feature)
    // Add an event listener to a contrast toggle button (if added to HTML)
    const contrastToggle = document.getElementById('contrastToggle');
    if (contrastToggle) {
        contrastToggle.addEventListener('click', () => {
            menuView.toggleHighContrast();
            canvasView.redraw(); // Redraw map with new colors
        });
    }
    
    // Add keyboard shortcuts for accessibility
    document.addEventListener('keydown', (event) => {
        // Alt+H for high contrast toggle
        if (event.altKey && event.key === 'h') {
            menuView.toggleHighContrast();
            canvasView.redraw();
        }
    });
    
    console.log('GeoQuizz application initialized');
});