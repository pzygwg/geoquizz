/**
 * MenuView.js
 * Handles menu rendering and transitions between game states
 */

export default class MenuView {
    constructor() {
        // DOM elements
        this.menuContainer = document.getElementById('menuContainer');
        this.gameUIContainer = document.getElementById('gameUIContainer');
        this.playButton = document.getElementById('playButton');
        this.resetButton = document.getElementById('resetButton');
        this.startCountryEl = document.querySelector('#startCountry span');
        this.endCountryEl = document.querySelector('#endCountry span');
        this.countryInput = document.getElementById('countryInput');
        this.pathList = document.getElementById('pathList');
        
        // State management
        this.isMenuVisible = true;
        this.isGameUIVisible = false;
        this.currentGameMode = 'countryPath'; // Default game mode
        
        // Region selection for "Name Them All" mode
        this.regionSelectionContainer = null;
        this.selectedRegion = null;
        
        // Name Them All stats
        this.namedCountriesCount = 0;
        this.totalCountriesCount = 0;
        
        // High contrast mode
        this.isHighContrast = false;
        
        // Audio elements (for later implementation)
        this.clickSound = null;
        this.errorSound = null;
        this.successSound = null;
        
        // Create game mode buttons if they don't exist
        this._createNameThemAllButton();
        
        // After creating the buttons, initialize event listeners
        this.nameThemAllButton = document.getElementById('nameThemAllButton');
        this.findPlaceButton = document.getElementById('findPlaceButton');
        
        // Initialize event listeners for menu buttons
        this._initEventListeners();
    }
    
    /**
     * Initialize event listeners for menu components
     * @private
     */
    _initEventListeners() {
        // Reset button click handler
        if (this.resetButton) {
            this.resetButton.addEventListener('click', () => {
                // Use a custom event to communicate with the controller
                const event = new CustomEvent('resetGame');
                document.dispatchEvent(event);
            });
        }
        
        // Name Them All button click handler
        if (this.nameThemAllButton) {
            console.log('Adding click listener to Name Them All button');
            this.nameThemAllButton.addEventListener('click', (event) => {
                event.preventDefault();
                console.log('Name Them All button clicked');
                
                // Play click sound if available
                if (this.clickSound) {
                    this.clickSound.currentTime = 0;
                    this.clickSound.play().catch(e => console.log('Error playing sound:', e));
                }
                
                // Set game mode
                this.currentGameMode = 'nameThemAll';
                
                // Trigger region selection
                console.log('Dispatching selectRegion event');
                const selectRegionEvent = new CustomEvent('selectRegion');
                document.dispatchEvent(selectRegionEvent);
            });
        } else {
            console.error('Name Them All button not found in DOM');
        }
        
        // Find the Place button click handler
        if (this.findPlaceButton) {
            console.log('Adding click listener to Find the Place button');
            this.findPlaceButton.addEventListener('click', (event) => {
                event.preventDefault();
                console.log('Find the Place button clicked');
                
                // Play click sound if available
                if (this.clickSound) {
                    this.clickSound.currentTime = 0;
                    this.clickSound.play().catch(e => console.log('Error playing sound:', e));
                }
                
                // Set game mode
                this.currentGameMode = 'findPlace';
                
                // Trigger game start event
                console.log('Dispatching startFindPlace event');
                const startFindPlaceEvent = new CustomEvent('startFindPlace');
                document.dispatchEvent(startFindPlaceEvent);
            });
        } else {
            console.error('Find the Place button not found in DOM');
        }
    }
    
    /**
     * Creates the game mode buttons if they don't already exist
     * @private
     */
    _createNameThemAllButton() {
        // Add the "Name Them All" button
        if (!document.getElementById('nameThemAllButton')) {
            // Create button
            const button = document.createElement('button');
            button.id = 'nameThemAllButton';
            button.className = 'pixel-button';
            button.textContent = 'Name Them All';
            
            // Add to menu container after the play button
            if (this.playButton && this.menuContainer) {
                // Add some spacing
                const spacer = document.createElement('div');
                spacer.style.height = '15px';
                this.menuContainer.insertBefore(spacer, this.playButton.nextSibling);
                
                // Add the button after the spacer
                this.menuContainer.insertBefore(button, spacer.nextSibling);
                
                console.log('Created "Name Them All" button');
            } else {
                console.error('Could not find play button or menu container to add "Name Them All" button');
            }
        } else {
            console.log('"Name Them All" button already exists');
        }
        
        // Add the "Find the Place" button
        if (!document.getElementById('findPlaceButton')) {
            // Create button
            const button = document.createElement('button');
            button.id = 'findPlaceButton';
            button.className = 'pixel-button';
            button.textContent = 'Find the Place';
            
            // Add to menu container after the Name Them All button
            const nameThemAllButton = document.getElementById('nameThemAllButton');
            if (nameThemAllButton && this.menuContainer) {
                // Add some spacing
                const spacer = document.createElement('div');
                spacer.style.height = '15px';
                this.menuContainer.insertBefore(spacer, nameThemAllButton.nextSibling);
                
                // Add the button after the spacer
                this.menuContainer.insertBefore(button, spacer.nextSibling);
                
                console.log('Created "Find the Place" button');
            } else {
                console.error('Could not find Name Them All button or menu container to add "Find the Place" button');
            }
        } else {
            console.log('"Find the Place" button already exists');
        }
    }
    
    /**
     * Shows or hides the main menu
     * @param {boolean} show - Whether to show the menu
     */
    showMenu(show = true) {
        this.isMenuVisible = show;
        
        // Apply CSS transitions for smooth animation
        if (show) {
            this.menuContainer.classList.remove('hidden');
            
            // Fade in animation
            setTimeout(() => {
                this.menuContainer.style.opacity = '1';
                this.menuContainer.style.transform = 'translate(-50%, -50%) scale(1)';
            }, 10);
        } else {
            // Fade out animation
            this.menuContainer.style.opacity = '0';
            this.menuContainer.style.transform = 'translate(-50%, -50%) scale(0.9)';
            
            // Remove from DOM after animation completes
            setTimeout(() => {
                this.menuContainer.classList.add('hidden');
            }, 300);
        }
        
        return this; // Allow chaining
    }
    
    /**
     * Shows or hides the game UI
     * @param {boolean} show - Whether to show the game UI
     */
    showGameUI(show = true) {
        this.isGameUIVisible = show;
        
        if (show) {
            this.gameUIContainer.classList.remove('hidden');
            
            // Slide down animation
            setTimeout(() => {
                this.gameUIContainer.style.opacity = '1';
                this.gameUIContainer.style.transform = 'translateY(0)';
            }, 10);
        } else {
            // Slide up animation
            this.gameUIContainer.style.opacity = '0';
            this.gameUIContainer.style.transform = 'translateY(-20px)';
            
            // Remove from DOM after animation completes
            setTimeout(() => {
                this.gameUIContainer.classList.add('hidden');
            }, 300);
        }
        
        return this; // Allow chaining
    }
    
    /**
     * Updates the game info section with start and end countries
     * @param {string} startCountry - Name of the starting country
     * @param {string} endCountry - Name of the ending country
     */
    updateGameInfo(startCountry, endCountry) {
        if (this.startCountryEl) {
            this.startCountryEl.textContent = startCountry;
        }
        
        if (this.endCountryEl) {
            this.endCountryEl.textContent = endCountry;
        }
        
        return this; // Allow chaining
    }
    
    /**
     * Adds a country to the path list with styling
     * @param {string} countryName - Name of the country to add
     * @param {string} status - Status of the country ('correct', 'error')
     */
    addToPath(countryName, status = 'correct') {
        const itemEl = document.createElement('div');
        itemEl.className = `path-item ${status}`;
        itemEl.textContent = countryName;
        
        // Add to the path list
        this.pathList.appendChild(itemEl);
        
        // Scroll to bottom of path list
        this.pathList.scrollTop = this.pathList.scrollHeight;
        
        // Add shake animation for errors
        if (status === 'error') {
            this._playErrorAnimation(itemEl);
            
            // Remove after a delay
            setTimeout(() => {
                itemEl.remove();
            }, 2000);
        }
        
        return this; // Allow chaining
    }
    
    /**
     * Clears the current path list
     */
    clearPath() {
        if (this.pathList) {
            this.pathList.innerHTML = '';
        }
        
        return this; // Allow chaining
    }
    
    /**
     * Clears the input field and focuses it
     */
    clearInput() {
        if (this.countryInput) {
            this.countryInput.value = '';
            this.countryInput.focus();
        }
        
        return this; // Allow chaining
    }
    
    /**
     * Plays error animation on an element
     * @param {HTMLElement} element - Element to animate
     * @private
     */
    _playErrorAnimation(element) {
        // Shake animation is defined in CSS
        
        // Play error sound if available
        if (this.errorSound) {
            this.errorSound.currentTime = 0;
            this.errorSound.play().catch(e => console.log('Error playing sound:', e));
        }
    }
    
    /**
     * Shows a victory message
     * @param {string} gameMode - The game mode 'countryPath' or 'nameThemAll'
     * @param {Object} stats - Game statistics (optional)
     */
    showVictory(gameMode = 'countryPath', stats = null) {
        // Create victory message
        const victoryEl = document.createElement('div');
        victoryEl.className = 'victory-message';
        
        // Different message based on game mode
        if (gameMode === 'nameThemAll') {
            victoryEl.innerHTML = `
                <h2>Victory!</h2>
                <p>You named all ${stats?.total || ''} countries in the ${this.selectedRegion || 'selected'} region!</p>
                <button id="playAgainBtn" class="pixel-button">Play Again</button>
            `;
        } else {
            victoryEl.innerHTML = `
                <h2>Victory!</h2>
                <p>You found a valid path between the countries!</p>
                <button id="playAgainBtn" class="pixel-button">Play Again</button>
            `;
        }
        
        // Append to game container
        document.getElementById('gameContainer').appendChild(victoryEl);
        
        // Add event listener to play again button
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            // Remove victory message
            victoryEl.remove();
            
            // Trigger reset event
            const event = new CustomEvent('resetGame');
            document.dispatchEvent(event);
        });
        
        // Play success sound if available
        if (this.successSound) {
            this.successSound.currentTime = 0;
            this.successSound.play().catch(e => console.log('Error playing sound:', e));
        }
        
        return this; // Allow chaining
    }
    
    /**
     * Shows the region selection interface for "Name Them All" game
     * @param {Array} regions - Available regions to choose from
     * @param {Function} selectionHandler - Function to handle region selection
     */
    showRegionSelection(regions, selectionHandler) {
        // Remove any existing region selection
        this.removeRegionSelection();
        
        // Create region selection container
        this.regionSelectionContainer = document.createElement('div');
        this.regionSelectionContainer.className = 'region-selection';
        this.regionSelectionContainer.innerHTML = `
            <h2>Choose a Region</h2>
            <div class="region-buttons"></div>
        `;
        
        const buttonContainer = this.regionSelectionContainer.querySelector('.region-buttons');
        
        // Create buttons for each region
        regions.forEach(region => {
            const button = document.createElement('button');
            button.className = 'pixel-button region-button';
            button.textContent = region;
            button.dataset.region = region;
            
            button.addEventListener('click', () => {
                this.selectedRegion = region;
                
                // Play click sound if available
                if (this.clickSound) {
                    this.clickSound.currentTime = 0;
                    this.clickSound.play().catch(e => console.log('Error playing sound:', e));
                }
                
                // Call the selection handler
                selectionHandler(region);
                
                // Remove region selection UI
                this.removeRegionSelection();
            });
            
            buttonContainer.appendChild(button);
        });
        
        // Append to game container
        document.getElementById('gameContainer').appendChild(this.regionSelectionContainer);
        
        return this; // Allow chaining
    }
    
    /**
     * Removes the region selection interface
     */
    removeRegionSelection() {
        if (this.regionSelectionContainer) {
            this.regionSelectionContainer.remove();
            this.regionSelectionContainer = null;
        }
        
        return this; // Allow chaining
    }
    
    /**
     * Sets up play button click handler
     * @param {Function} handler - Click handler function
     */
    setPlayButtonHandler(handler) {
        if (this.playButton) {
            this.playButton.addEventListener('click', (event) => {
                event.preventDefault();
                
                // Play click sound if available
                if (this.clickSound) {
                    this.clickSound.currentTime = 0;
                    this.clickSound.play().catch(e => console.log('Error playing sound:', e));
                }
                
                handler();
            });
        }
        
        return this; // Allow chaining
    }
    
    /**
     * Sets up country input handler
     * @param {Function} handler - Input handler function
     */
    setCountryInputHandler(handler) {
        if (this.countryInput) {
            this.countryInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    const countryName = this.countryInput.value.trim();
                    
                    if (countryName) {
                        handler(countryName, this.currentGameMode);
                    }
                }
            });
        }
        
        return this; // Allow chaining
    }
    
    /**
     * Updates the UI for "Name Them All" game mode
     * @param {string} region - Selected region name
     * @param {number} named - Number of named countries
     * @param {number} total - Total number of countries in region
     */
    updateNameThemAllUI(region, named, total) {
        this.namedCountriesCount = named;
        this.totalCountriesCount = total;
        
        // Update the game info section
        if (this.startCountryEl) {
            this.startCountryEl.textContent = `Region: ${region}`;
        }
        
        if (this.endCountryEl) {
            this.endCountryEl.textContent = `Progress: ${named}/${total} countries`;
        }
        
        return this; // Allow chaining
    }
    
    /**
     * Shows the Name Them All UI
     */
    showNameThemAllUI() {
        // Hide path list since we don't need it for this mode
        if (this.pathList) {
            this.pathList.style.display = 'none';
        }
        
        // Show game UI
        this.showGameUI(true);
        
        // Set input placeholder
        if (this.countryInput) {
            this.countryInput.placeholder = 'Type a country name in this region';
        }
        
        return this; // Allow chaining
    }
    
    /**
     * Shows the Find the Place game UI
     * @param {number} currentRound - Current round number
     * @param {number} totalRounds - Total number of rounds
     */
    showFindPlaceUI(currentRound, totalRounds) {
        // Hide path list since we don't need it for this mode
        if (this.pathList) {
            this.pathList.style.display = 'none';
        }
        
        // Hide country input field if visible
        if (this.countryInput) {
            this.countryInput.style.display = 'none';
        }
        
        // Update the game info section
        if (this.startCountryEl) {
            this.startCountryEl.textContent = `Round: ${currentRound}/${totalRounds}`;
        }
        
        if (this.endCountryEl) {
            this.endCountryEl.textContent = `Click on the map to place your pin`;
        }
        
        // Show game UI
        this.showGameUI(true);
        
        // Create instruction element
        const instruction = document.createElement('div');
        instruction.id = 'findPlaceInstruction';
        instruction.className = 'find-place-instruction';
        instruction.textContent = 'Where is this place? Click on the map to place your pin.';
        
        // Add to game UI if not already there
        if (!document.getElementById('findPlaceInstruction') && this.gameUIContainer) {
            this.gameUIContainer.appendChild(instruction);
        }
        
        return this; // Allow chaining
    }
    
    /**
     * Updates the Find the Place game UI after a guess
     * @param {Object} guessResult - Result of the player's guess
     */
    updateFindPlaceUI(guessResult) {
        if (!guessResult) return this;
        
        // Update the game info section with score
        if (this.endCountryEl) {
            this.endCountryEl.textContent = `Score: ${guessResult.score} (${Math.round(guessResult.distance)} km)`;
        }
        
        // Update instruction
        const instruction = document.getElementById('findPlaceInstruction');
        if (instruction) {
            instruction.textContent = 'Click "Continue" to proceed to the next round.';
        }
        
        // Add continue button if not already there
        if (!document.getElementById('continueButton') && this.gameUIContainer) {
            const continueBtn = document.createElement('button');
            continueBtn.id = 'continueButton';
            continueBtn.className = 'pixel-button';
            continueBtn.textContent = 'Continue';
            
            // Add event listener
            continueBtn.addEventListener('click', () => {
                // Remove the button
                continueBtn.remove();
                
                // Dispatch continue event
                const continueEvent = new CustomEvent('continueFindPlace');
                document.dispatchEvent(continueEvent);
            });
            
            this.gameUIContainer.appendChild(continueBtn);
        }
        
        return this; // Allow chaining
    }
    
    /**
     * Toggles high contrast mode for accessibility
     * @param {boolean} enable - Whether to enable high contrast mode
     */
    toggleHighContrast(enable) {
        this.isHighContrast = enable === undefined ? !this.isHighContrast : enable;
        
        // Toggle high-contrast class on body
        if (this.isHighContrast) {
            document.body.classList.add('high-contrast');
        } else {
            document.body.classList.remove('high-contrast');
        }
        
        return this; // Allow chaining
    }
    
    /**
     * Initializes sound effects for the game
     * Can be implemented later as a stretch goal
     */
    initSounds() {
        // Sound initialization can be implemented in the future
        return this; // Allow chaining
    }
}