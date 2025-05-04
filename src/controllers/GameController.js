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
        this.currentGameMode = 'countryPath'; // Default game mode
        
        // Country Path game state
        this.startCountry = null;
        this.endCountry = null;
        this.currentPath = [];
        this.gameStats = {
            moves: 0,
            errors: 0,
            startTime: null,
            endTime: null
        };
        
        // Name Them All game state
        this.selectedRegion = null;
        this.regionCountries = [];
        this.namedCountries = new Set();
        
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
        
        // Listen for region selection event
        console.log('Binding selectRegion event listener');
        document.addEventListener('selectRegion', () => {
            console.log('selectRegion event received, showing region selection');
            this.showRegionSelection();
        });
    }
    
    /**
     * Starts a new Country Path game
     */
    startGame() {
        this.isGameActive = true;
        this.currentGameMode = 'countryPath';
        this.canvasView.gameMode = 'countryPath';
        
        // Make sure path list is visible for this game mode
        if (this.menuView.pathList) {
            this.menuView.pathList.style.display = '';
        }
        
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
        
        console.log(`Starting new Country Path game: ${this.startCountry} to ${this.endCountry}`);
        
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
        
        // Set input placeholder
        if (this.menuView.countryInput) {
            this.menuView.countryInput.placeholder = 'Type an adjacent country name';
        }
        
        // Focus input
        this.menuView.clearInput();
    }
    
    /**
     * Handles country input from user
     * @param {string} countryName - Name of the country entered by user
     * @param {string} gameMode - Current game mode
     */
    handleCountryInput(countryName, gameMode) {
        if (!this.isGameActive) return;
        
        // Clear input field for next entry
        this.menuView.clearInput();
        
        // Store original input for debugging
        const originalInput = countryName;
        
        // Normalize input and validate
        countryName = this._normalizeCountryName(countryName);
        console.log(`Input: "${originalInput}" normalized to "${countryName}"`);
        
        // Use different handling for Name Them All mode since we need case-sensitive matching
        if (gameMode === 'nameThemAll') {
            this._handleNameThemAllInput(countryName);
            return;
        }
        
        // For Country Path mode, check if country exists in our data
        const country = this.model.getCountryByName(countryName);
        if (!country) {
            this._handleInvalidInput(countryName, 'not-found');
            return;
        }
        
        // Handle Country Path input
        this._handleCountryPathInput(countryName);
    }
    
    /**
     * Handles country input for the Country Path game mode
     * @param {string} countryName - Name of the country entered by user
     * @private
     */
    _handleCountryPathInput(countryName) {
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
     * Handles country input for the Name Them All game mode
     * @param {string} countryName - Name of the country entered by user
     * @private
     */
    _handleNameThemAllInput(countryName) {
        console.log(`Handling input for "Name Them All": "${countryName}"`);
        console.log(`Current region: ${this.selectedRegion}`);
        console.log(`Countries in current region:`, this.model.getCurrentRegionCountries());
        
        // Check if the country is in the current region
        const isInRegion = this.model.isCountryInCurrentRegion(countryName);
        console.log(`Is ${countryName} in region? ${isInRegion}`);
        
        if (!isInRegion) {
            // Check if the country exists at all
            const country = this.model.getCountryByName(countryName);
            if (country) {
                console.log(`Country ${countryName} exists but not in region ${this.selectedRegion}`);
            } else {
                console.log(`Country ${countryName} does not exist in data`);
            }
            
            this._handleInvalidInput(countryName, 'not-in-region');
            return;
        }
        
        // Check if the country has already been named
        if (this.namedCountries.has(countryName)) {
            console.log(`Country ${countryName} already named`);
            this._handleInvalidInput(countryName, 'already-named');
            return;
        }
        
        // Valid country - mark it as named
        console.log(`Marking ${countryName} as named`);
        this.namedCountries.add(countryName);
        this.model.markCountryNamed(countryName);
        
        // Update the UI with progress
        const counts = this.model.getRemainingCountsForRegion();
        this.menuView.updateNameThemAllUI(this.selectedRegion, counts.named, counts.total);
        
        // Update the map
        this.canvasView.renderMap(this.model.getAllCountriesForRendering());
        
        // Check if all countries have been named
        if (this.model.areAllCountriesNamed()) {
            this._handleNameThemAllVictory();
        }
    }
    
    /**
     * Handles invalid country input
     * @param {string} countryName - Name of the country entered
     * @param {string} reason - Reason for invalid input ('not-found', 'already-used', 'not-adjacent', etc.)
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
            case 'not-in-region':
                errorMessage = 'Not in this region';
                break;
            case 'already-named':
                errorMessage = 'Already named';
                break;
            default:
                errorMessage = 'Invalid input';
        }
        
        // Different error display for different game modes
        if (this.currentGameMode === 'nameThemAll') {
            // For "Name Them All", just show a flash error in the input field
            this.menuView.clearInput();
            
            // Show the error for a brief moment as a placeholder
            this.menuView.countryInput.placeholder = `${errorMessage} - Try again`;
            setTimeout(() => {
                if (this.menuView.countryInput) {
                    this.menuView.countryInput.placeholder = 'Type a country name in this region';
                }
            }, 1500);
        } else {
            // For Country Path, add to the path list
            this.menuView.addToPath(`${countryName} - ${errorMessage}`, 'error');
        }
    }
    
    /**
     * Shows the region selection interface for "Name Them All" game
     */
    showRegionSelection() {
        console.log('showRegionSelection called');
        
        // Get available regions from the model
        const regions = this.model.getAvailableRegions();
        console.log('Available regions:', regions);
        
        // Show region selection interface
        this.menuView.showMenu(false).showRegionSelection(regions, (region) => {
            console.log('Region selected:', region);
            this.startNameThemAllGame(region);
        });
    }
    
    /**
     * Starts a new "Name Them All" game for the selected region
     * @param {string} region - The selected region
     */
    startNameThemAllGame(region) {
        console.log(`Starting "Name Them All" game for region: ${region}`);
        
        // Set game state
        this.isGameActive = true;
        this.currentGameMode = 'nameThemAll';
        this.selectedRegion = region;
        
        // Set the region in the model
        const regionSet = this.model.setRegion(region);
        if (!regionSet) {
            console.error(`Failed to set region ${region} in model`);
            // Try some alternatives
            if (region === 'Europe' && this.model.regionCountries.has('Europe')) {
                console.log('Attempting to manually set region to Europe');
                this.model.currentRegion = 'Europe';
            }
        }
        
        // Double-check that the region was set
        console.log(`Current region in model: ${this.model.currentRegion}`);
        
        // Check the countries available in this region
        const regionCountries = this.model.getCurrentRegionCountries();
        console.log(`Countries in ${region} (${regionCountries.length}):`, regionCountries);
        
        // Update the canvas view's game mode
        this.canvasView.gameMode = 'nameThemAll';
        
        // Clear named countries
        this.namedCountries.clear();
        this.model.resetNamedCountries();
        
        // Reset country highlights
        this.model.resetCountryHighlights();
        
        // Show the game UI
        this.menuView.showNameThemAllUI();
        
        // Get the country counts for this region
        const counts = this.model.getRemainingCountsForRegion();
        
        // Update the UI with progress
        this.menuView.updateNameThemAllUI(region, counts.named, counts.total);
        
        // Update the map
        this.canvasView.renderMap(this.model.getAllCountriesForRendering());
        
        console.log(`"Name Them All" game ready for region: ${region} with ${counts.total} countries`);
    }
    
    /**
     * Handles victory for "Name Them All" game
     * @private
     */
    _handleNameThemAllVictory() {
        this.isGameActive = false;
        
        // Get the final stats
        const counts = this.model.getRemainingCountsForRegion();
        
        // Show victory message
        this.menuView.showVictory('nameThemAll', {
            named: counts.named,
            total: counts.total
        });
        
        console.log(`"Name Them All" game completed for ${this.selectedRegion} region with ${counts.named}/${counts.total} countries named`);
    }
    
    /**
     * Handles victory condition for Country Path game
     * @private
     */
    _handleVictory() {
        this.isGameActive = false;
        this.gameStats.endTime = Date.now();
        
        // Calculate time taken
        const timeTaken = (this.gameStats.endTime - this.gameStats.startTime) / 1000;
        
        // Log game stats
        console.log(`Country Path game completed in ${timeTaken} seconds with ${this.gameStats.moves} moves and ${this.gameStats.errors} errors`);
        
        // Show victory message
        this.menuView.showVictory('countryPath');
    }
    
    /**
     * Resets the current game
     */
    resetGame() {
        // Reset common game state
        this.isGameActive = false;
        
        // Reset based on game mode
        if (this.currentGameMode === 'nameThemAll') {
            // Reset Name Them All game state
            this.selectedRegion = null;
            this.namedCountries.clear();
            this.model.resetNamedCountries();
            
            // Reset the path list display (restore if hidden)
            if (this.menuView.pathList) {
                this.menuView.pathList.style.display = '';
            }
        } else {
            // Reset Country Path game state
            this.startCountry = null;
            this.endCountry = null;
            this.currentPath = [];
            
            // Reset UI specific to Country Path
            this.menuView.clearPath();
        }
        
        // Reset to default game mode
        this.currentGameMode = 'countryPath';
        this.canvasView.gameMode = 'countryPath';
        
        // Reset UI
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
        if (!name) return '';
        
        // Basic normalization - trim and capitalize first letter of each word
        const trimmed = name.trim();
        return trimmed
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }
}