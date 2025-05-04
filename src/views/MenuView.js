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
        
        // High contrast mode
        this.isHighContrast = false;
        
        // Audio elements (for later implementation)
        this.clickSound = null;
        this.errorSound = null;
        this.successSound = null;
        
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
     */
    showVictory() {
        // Create victory message
        const victoryEl = document.createElement('div');
        victoryEl.className = 'victory-message';
        victoryEl.innerHTML = `
            <h2>Victory!</h2>
            <p>You found a valid path between the countries!</p>
            <button id="playAgainBtn" class="pixel-button">Play Again</button>
        `;
        
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
                        handler(countryName);
                    }
                }
            });
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