/**
 * GameController.js
 * Orchestrates the game flow, manages user input, and updates the Model & View
 */

import PlaceFinderModel from '../models/PlaceFinderModel.js';
import ImageView from '../views/ImageView.js';

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
        
        // Find the Place game state
        this.placeFinderModel = new PlaceFinderModel();
        this.imageView = null; // Will be initialized when needed
        
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
        
        // Listen for Find the Place game events
        document.addEventListener('startFindPlace', () => {
            console.log('startFindPlace event received, starting Find the Place game');
            this.startFindPlaceGame();
        });
        
        document.addEventListener('pinPlaced', (event) => {
            console.log('pinPlaced event received, handling pin placement');
            this._handlePinPlaced(event.detail.x, event.detail.y);
        });
        
        document.addEventListener('continueFindPlace', () => {
            console.log('continueFindPlace event received, continuing to next round');
            this._startNextFindPlaceRound();
        });
        
        // Listen for pin mode toggle event
        document.addEventListener('togglePinMode', () => {
            console.log('togglePinMode event received');
            if (this.currentGameMode === 'findPlace') {
                // Toggle pin mode in the canvas view
                this.canvasView.togglePinMode();
                
                // Update the button state to match
                this._updatePinModeButtonState();
            }
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
        
        // Get the current game mode if not explicitly passed
        gameMode = gameMode || this.currentGameMode;
        console.log(`Current game mode: ${gameMode}`);
        
        // Use different handling for Name Them All mode
        if (gameMode === 'nameThemAll') {
            this._handleNameThemAllInput(originalInput); // Pass original input for "Name Them All"
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
        
        // Normalize the country name to improve matching
        const normalizedCountryName = this._normalizeCountryName(countryName);
        console.log(`Normalized country name: ${normalizedCountryName}`);
        
        console.log(`Countries in current region:`, this.model.getCurrentRegionCountries());
        
        // Check if the country is in the current region
        const isInRegion = this.model.isCountryInCurrentRegion(normalizedCountryName);
        console.log(`Is ${normalizedCountryName} in region? ${isInRegion}`);
        
        if (!isInRegion) {
            // Check if the country exists at all
            const country = this.model.getCountryByName(normalizedCountryName);
            if (country) {
                console.log(`Country ${normalizedCountryName} exists but not in region ${this.selectedRegion}`);
            } else {
                console.log(`Country ${normalizedCountryName} does not exist in data`);
            }
            
            this._handleInvalidInput(normalizedCountryName, 'not-in-region');
            return;
        }
        
        // Check if the country has already been named
        if (this.namedCountries.has(normalizedCountryName)) {
            console.log(`Country ${normalizedCountryName} already named`);
            this._handleInvalidInput(normalizedCountryName, 'already-named');
            return;
        }
        
        // Valid country - mark it as named
        console.log(`Marking ${normalizedCountryName} as named`);
        this.namedCountries.add(normalizedCountryName);
        this.model.markCountryNamed(normalizedCountryName);
        
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
     * Starts the "Find the Place" game
     */
    async startFindPlaceGame() {
        // Initialize the Find the Place game
        this.isGameActive = true;
        this.currentGameMode = 'findPlace';
        this.canvasView.gameMode = 'findPlace';
        
        // Create ImageView if it doesn't exist
        if (!this.imageView) {
            this.imageView = new ImageView('imageContainer');
        }
        
        // Load places data
        const dataLoaded = await this.placeFinderModel.loadPlacesData();
        if (!dataLoaded) {
            console.error("Could not load places data");
            alert('Error loading places data. Please try again.');
            return;
        }
        
        // Reset the game model
        this.placeFinderModel.resetGame();
        
        // Hide menu and show game UI
        this.menuView.showMenu(false);
        
        // Start the first round
        this._startNextFindPlaceRound();
    }
    
    /**
     * Starts the next round of the Find the Place game
     * @private
     */
    _startNextFindPlaceRound() {
        console.log("Starting next Find the Place round");
        
        // Get the next place
        const currentPlace = this.placeFinderModel.startNewRound();
        
        // Check if the game is complete
        if (!currentPlace) {
            console.log("Game is complete - no more places available");
            this._handleFindPlaceGameComplete();
            return;
        }
        
        console.log("Current place:", currentPlace.name);
        
        // Show the place image
        const gameState = this.placeFinderModel.getGameState();
        this.imageView.showImage(currentPlace, gameState.currentRound, gameState.totalRounds);
        
        // Update the UI
        this.menuView.showFindPlaceUI(gameState.currentRound, gameState.totalRounds);
        
        // Enable pin placement on the map
        console.log("Enabling pin placement");
        this.canvasView.enablePinPlacement();
        console.log("Pin placement enabled:", this.canvasView.isPlacingPin);
        
        // Reset any existing pins
        this.canvasView.resetPins();
        
        // Update pin mode button state to match the canvas view state
        this._updatePinModeButtonState();
    }
    
    /**
     * Updates the pin mode button state to reflect the canvas view state
     * @private 
     */
    _updatePinModeButtonState() {
        const pinModeBtn = document.getElementById('pinModeToggle');
        if (pinModeBtn) {
            console.log("Updating pin mode button state:", this.canvasView.isPinMode);
            if (this.canvasView.isPinMode) {
                pinModeBtn.classList.add('active');
                pinModeBtn.textContent = 'Pin Mode Active';
            } else {
                pinModeBtn.classList.remove('active');
                pinModeBtn.textContent = 'Toggle Pin Mode';
            }
        }
    }
    
    /**
     * Handles pin placement for the Find the Place game
     * @param {number} x - X coordinate on the map
     * @param {number} y - Y coordinate on the map
     * @private
     */
    _handlePinPlaced(x, y) {
        console.log("_handlePinPlaced called with coordinates:", x, y);
        
        // Get the actual dimensions of the pre-rendered map
        const mapCanvas = this.canvasView.hitCanvas || this.canvasView.preRenderedMap;
        const mapWidth = parseFloat(this.canvasView.canvas.dataset.mapWidth || (mapCanvas ? mapCanvas.width : 4000));
        const mapHeight = parseFloat(this.canvasView.canvas.dataset.mapHeight || (mapCanvas ? mapCanvas.height : 2000));
        
        // Log detailed coordinates for debugging and easy copy-paste
        console.log(`
=========== MAP POSITION DEBUG ===========
CLICK COORDINATES:
  Canvas X,Y: ${x}, ${y}
  
SUGGESTED JSON FORMAT:
{
  "x": ${Math.round(x)},
  "y": ${Math.round(y)}
}
=========================================
        `);
        
        // Record the guess and get results using direct canvas coordinates
        const result = this.placeFinderModel.recordPlayerGuess(x, y);
        
        if (!result) {
            console.error("Failed to record guess");
            return;
        }
        
        console.log("Guess recorded:", result);
        
        // Get the current place data
        const currentPlace = this.placeFinderModel.currentPlace;
        console.log("Actual place coordinates:", currentPlace.coordinates);
        
        // Use actual coordinates directly from the place data
        const actualPoint = {
            x: currentPlace.coordinates.x,
            y: currentPlace.coordinates.y
        };
        
        console.log("Actual location point on canvas:", actualPoint.x, actualPoint.y);
        
        // Set the actual pin on the map
        this.canvasView.setActualPin(actualPoint.x, actualPoint.y);
        
        // Update the image view with results
        this.imageView.showResult(currentPlace, result);
        
        // Update the menu view with score
        this.menuView.updateFindPlaceUI(result);
    }
    
    /**
     * Handles the completion of the Find the Place game
     * @private
     */
    _handleFindPlaceGameComplete() {
        // Get final game state
        const gameState = this.placeFinderModel.getGameState();
        
        // Show final results
        this.imageView.showFinalResults(gameState);
        
        // End the game
        this.isGameActive = false;
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
        } else if (this.currentGameMode === 'findPlace') {
            // Reset Find the Place game state
            this.placeFinderModel.resetGame();
            
            // Hide the image view
            if (this.imageView) {
                this.imageView.hide();
            }
            
            // Reset pins and pin mode
            this.canvasView.togglePinMode(false);
            this.canvasView.resetPins();
            
            // Remove any Find the Place specific UI elements
            const instruction = document.getElementById('findPlaceInstruction');
            if (instruction) {
                instruction.remove();
            }
            
            const continueButton = document.getElementById('continueButton');
            if (continueButton) {
                continueButton.remove();
            }
            
            const pinModeToggle = document.getElementById('pinModeToggle');
            if (pinModeToggle) {
                pinModeToggle.remove();
            }
            
            // Show country input again if it was hidden
            if (this.menuView.countryInput) {
                this.menuView.countryInput.style.display = '';
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