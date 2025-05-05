/**
 * ImageView.js
 * Handles rendering of place images for the "Find the Place" game mode
 */

export default class ImageView {
    constructor(containerId) {
        // Get the container element
        this.container = document.getElementById(containerId);
        
        // Create required elements
        if (!this.container) {
            console.error(`Container with ID ${containerId} not found`);
            this._createContainer(containerId);
        }
        
        // Create image elements
        this._createImageElements();
        
        // Game state
        this.isImageVisible = false;
    }
    
    /**
     * Creates container if it doesn't exist
     * @param {string} containerId - ID for the container
     * @private
     */
    _createContainer(containerId) {
        // Create container
        this.container = document.createElement('div');
        this.container.id = containerId;
        this.container.className = 'image-container';
        
        // Add to the game container
        const gameContainer = document.getElementById('gameContainer');
        if (gameContainer) {
            gameContainer.appendChild(this.container);
        } else {
            document.body.appendChild(this.container);
        }
    }
    
    /**
     * Creates image elements inside the container
     * @private
     */
    _createImageElements() {
        // Clear container
        this.container.innerHTML = '';
        
        // Create wrapper for styling
        const wrapper = document.createElement('div');
        wrapper.className = 'image-wrapper';
        
        // Create image element
        this.imageElement = document.createElement('img');
        this.imageElement.className = 'place-image';
        this.imageElement.alt = 'Find this place';
        
        // Create caption element
        this.captionElement = document.createElement('div');
        this.captionElement.className = 'image-caption';
        
        // Create round indicator
        this.roundElement = document.createElement('div');
        this.roundElement.className = 'round-indicator';
        
        // Append elements
        wrapper.appendChild(this.imageElement);
        wrapper.appendChild(this.captionElement);
        wrapper.appendChild(this.roundElement);
        this.container.appendChild(wrapper);
    }
    
    /**
     * Displays an image for the current round
     * @param {Object} placeData - Place data with image and name
     * @param {number} currentRound - Current round number
     * @param {number} totalRounds - Total number of rounds
     */
    showImage(placeData, currentRound, totalRounds) {
        if (!placeData || !placeData.image) {
            console.error('Invalid place data provided');
            return;
        }
        
        // Set image source
        this.imageElement.src = `assets/${placeData.image}`;
        
        // Set caption (won't reveal location name)
        this.captionElement.textContent = 'Where is this place?';
        
        // Update round indicator
        this.roundElement.textContent = `Round ${currentRound} of ${totalRounds}`;
        
        // Make container visible
        this.container.style.display = 'block';
        this.isImageVisible = true;
        
        // Apply entrance animation
        this.container.classList.add('fade-in');
        setTimeout(() => {
            this.container.classList.remove('fade-in');
        }, 500);
    }
    
    /**
     * Shows the result after a guess
     * @param {Object} placeData - Place data
     * @param {Object} guessResult - Player's guess result with score and distance
     */
    showResult(placeData, guessResult) {
        if (!placeData || !guessResult) {
            return;
        }
        
        // Update caption with location name and result
        this.captionElement.innerHTML = `
            <h3>${placeData.name}</h3>
            <p>${placeData.description}</p>
            <div class="result-info">
                <div>Distance: ${Math.round(guessResult.distance)} km</div>
                <div>Score: ${guessResult.score} points</div>
            </div>
        `;
        
        // Apply highlight animation
        this.container.classList.add('highlight');
        setTimeout(() => {
            this.container.classList.remove('highlight');
        }, 1000);
    }
    
    /**
     * Shows the final game results
     * @param {Object} gameState - Final game state with scores and pins
     */
    showFinalResults(gameState) {
        // Clear container
        this.container.innerHTML = '';
        
        // Create results content
        const resultsElement = document.createElement('div');
        resultsElement.className = 'final-results';
        
        let roundResults = '';
        gameState.pins.forEach((pin, index) => {
            roundResults += `
                <div class="round-result">
                    <div class="round-title">Round ${index + 1}: ${pin.placeName}</div>
                    <div class="round-details">
                        <span>Distance: ${Math.round(pin.distance)} km</span>
                        <span>Score: ${pin.score} points</span>
                    </div>
                </div>
            `;
        });
        
        resultsElement.innerHTML = `
            <h2>Game Complete!</h2>
            <div class="total-score">Total Score: ${gameState.totalScore} points</div>
            <div class="rounds-summary">
                ${roundResults}
            </div>
            <button id="newGameBtn" class="pixel-button">Play Again</button>
        `;
        
        // Add to container
        this.container.appendChild(resultsElement);
        
        // Add event listener to new game button
        document.getElementById('newGameBtn').addEventListener('click', () => {
            // Use custom event for controller to handle
            const event = new CustomEvent('resetGame');
            document.dispatchEvent(event);
        });
    }
    
    /**
     * Hides the image container
     */
    hide() {
        // Fade out animation
        this.container.classList.add('fade-out');
        
        setTimeout(() => {
            this.container.style.display = 'none';
            this.container.classList.remove('fade-out');
            this.isImageVisible = false;
        }, 300);
    }
    
    /**
     * Shows a message in the image area
     * @param {string} message - Message to display
     */
    showMessage(message) {
        // Create/update message element
        if (!this.messageElement) {
            this.messageElement = document.createElement('div');
            this.messageElement.className = 'image-message';
            this.container.appendChild(this.messageElement);
        }
        
        this.messageElement.textContent = message;
        this.messageElement.style.display = 'block';
        
        // Make container visible if not already
        this.container.style.display = 'block';
    }
}