/**
 * GameController.js
 * Orchestrates the game flow, manages user input, and updates the Model & View
 */

export default class GameController {
    /**
     * Creates a new GameController
     * @param {MapModel} model - The map data model
     * @param {CanvasView} canvasView - The canvas view for rendering the map
     * @param {MenuView} menuView - The menu view for UI interactions
     */
    constructor(model, canvasView, menuView) {
        this.model = model;
        this.canvasView = canvasView;
        this.menuView = menuView;
        
        // Game state
        this.isGameActive = false;
        this.startCountry = null;
        this.endCountry = null;
        this.currentPath = [];
        this.gameStats = {
            moves: 0,
            errors: 0,
            startTime: null,
            endTime: null
        };
        
        // Bind event handlers
        this._bindEventListeners();
    }
    
    /**
     * Initializes the game
     * @param {string} svgUrl - URL to the SVG map file
     */
    async init(svgUrl) {
        // Show loading indicator
        this.canvasView.showLoading(true);
        
        try {
            // Load map data
            const success = await this.model.loadMapData(svgUrl);
            
            if (success) {
                // Render the map
                this.canvasView.renderMap(this.model.getAllCountriesForRendering());
                
                // Hide loading indicator
                this.canvasView.showLoading(false);
                
                // Set up menu view handlers
                this.menuView.setPlayButtonHandler(() => this.startGame());
                this.menuView.setCountryInputHandler((countryName) => this.handleCountryInput(countryName));
                
                console.log('Game initialized successfully');
            } else {
                console.error("Failed to load map data");
                this.canvasView.showLoading(false);
                // Show error message
                alert('Failed to load map data. Please refresh the page to try again.');
            }
        } catch (error) {
            console.error("Error initializing game:", error);
            this.canvasView.showLoading(false);
            alert('An error occurred while initializing the game. Please refresh the page to try again.');
        }
    }
    
    /**
     * Binds event listeners for the game
     * @private
     */
    _bindEventListeners() {
        // Listen for reset game event
        document.addEventListener('resetGame', () => this.resetGame());
    }
    
    /**
     * Starts a new game
     */
    startGame() {
        this.isGameActive = true;
        
        // Hide menu and show game UI
        this.menuView.showMenu(false).showGameUI(true);
        
        // Reset country highlights
        this.model.resetCountryHighlights();
        
        // Get a random country pair from our predefined valid pairs
        const countryPair = this.model.getRandomCountryPair();
        if (!countryPair) {
            console.error("Could not generate a valid country pair");
            return;
        }
        
        // Set start and end countries
        this.startCountry = countryPair.start;
        this.endCountry = countryPair.end;
        
        console.log(`Starting new game: ${this.startCountry} to ${this.endCountry}`);
        
        // Mark countries as start/end
        this.model.setCountryEndpoint(this.startCountry, 'start');
        this.model.setCountryEndpoint(this.endCountry, 'end');
        
        // Update UI with country names
        this.menuView.updateGameInfo(this.startCountry, this.endCountry);
        
        // Reset game state
        this.currentPath = [this.startCountry];
        this.gameStats = {
            moves: 0,
            errors: 0,
            startTime: Date.now(),
            endTime: null
        };
        
        // Highlight start country on the map
        this.model.setCountryHighlight(this.startCountry, true);
        
        // Update map view
        this.canvasView.renderMap(this.model.getAllCountriesForRendering());
        
        // Add start country to path list
        this.menuView.clearPath().addToPath(this.startCountry, 'correct');
        
        // Focus input
        this.menuView.clearInput();
    }
    
    /**
     * Handles country input from user
     * @param {string} countryName - Name of the country entered by user
     */
    handleCountryInput(countryName) {
        if (!this.isGameActive) return;
        
        // Clear input field for next entry
        this.menuView.clearInput();
        
        // Normalize input and validate
        countryName = this._normalizeCountryName(countryName);
        
        // Check if country exists in our data
        const country = this.model.getCountryByName(countryName);
        if (!country) {
            this._handleInvalidInput(countryName, 'not-found');
            return;
        }
        
        // Check if country is already in path
        if (this.currentPath.includes(countryName)) {
            this._handleInvalidInput(countryName, 'already-used');
            return;
        }
        
        // Get the last country in the current path
        const lastCountry = this.currentPath[this.currentPath.length - 1];
        
        // Check if the new country is adjacent to the last one using our adjacency JSON data
        if (!this.model.isAdjacent(lastCountry, countryName)) {
            this._handleInvalidInput(countryName, 'not-adjacent');
            return;
        }
        
        // Valid move - add country to path
        this.currentPath.push(countryName);
        this.gameStats.moves++;
        
        // Add to UI path list
        this.menuView.addToPath(countryName, 'correct');
        
        // Highlight country on map
        this.model.setCountryHighlight(countryName, true);
        this.canvasView.renderMap(this.model.getAllCountriesForRendering());
        
        // Check if player has reached the destination
        if (countryName === this.endCountry) {
            this._handleVictory();
        }
    }
    
    /**
     * Handles invalid country input
     * @param {string} countryName - Name of the country entered
     * @param {string} reason - Reason for invalid input ('not-found', 'already-used', 'not-adjacent')
     * @private
     */
    _handleInvalidInput(countryName, reason) {
        this.gameStats.errors++;
        
        // Show error in UI
        let errorMessage = '';
        
        switch (reason) {
            case 'not-found':
                errorMessage = 'Country not found';
                break;
            case 'already-used':
                errorMessage = 'Already in path';
                break;
            case 'not-adjacent':
                errorMessage = 'Not adjacent';
                break;
            default:
                errorMessage = 'Invalid input';
        }
        
        // Adding the error message to the country name
        this.menuView.addToPath(`${countryName} - ${errorMessage}`, 'error');
    }
    
    /**
     * Handles victory condition
     * @private
     */
    _handleVictory() {
        this.isGameActive = false;
        this.gameStats.endTime = Date.now();
        
        // Calculate time taken
        const timeTaken = (this.gameStats.endTime - this.gameStats.startTime) / 1000;
        
        // Log game stats
        console.log(`Game completed in ${timeTaken} seconds with ${this.gameStats.moves} moves and ${this.gameStats.errors} errors`);
        
        // Show victory message
        this.menuView.showVictory();
    }
    
    /**
     * Resets the current game
     */
    resetGame() {
        // Reset game state
        this.isGameActive = false;
        this.startCountry = null;
        this.endCountry = null;
        this.currentPath = [];
        
        // Reset UI
        this.menuView.clearPath();
        this.menuView.showGameUI(false).showMenu(true);
        
        // Reset country highlights on map
        this.model.resetCountryHighlights();
        
        // Update map view
        this.canvasView.renderMap(this.model.getAllCountriesForRendering());
    }
    
    /**
     * Normalizes country name for case-insensitive comparison
     * @param {string} name - Country name to normalize
     * @returns {string} - Normalized country name
     * @private
     */
    _normalizeCountryName(name) {
        // Basic normalization - in a production app, this would handle
        // diacritics, different spellings, etc.
        return name.trim();
    }
}