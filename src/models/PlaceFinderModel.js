/**
 * PlaceFinderModel.js
 * Manages data for the "Find the Place" game mode
 */

export default class PlaceFinderModel {
    constructor() {
        this.places = [];
        this.currentPlace = null;
        this.currentRound = 0;
        this.totalRounds = 3;
        this.playerPins = []; // Store player's guess coordinates
        this.scores = []; // Store scores for each round
        this.maxDistance = 3000; // Max distance in km for scoring (adjusts range of scoring)
    }

    /**
     * Load places data from JSON file
     * @returns {Promise<boolean>} - True if data loaded successfully
     */
    async loadPlacesData() {
        try {
            const response = await fetch('data/places.json');
            if (!response.ok) {
                throw new Error(`Places data fetch failed: ${response.status}`);
            }
            
            const placesData = await response.json();
            
            if (placesData && placesData.places) {
                this.places = placesData.places;
                console.log(`Loaded ${this.places.length} places`);
                return true;
            } else {
                throw new Error('Invalid places data format');
            }
        } catch (error) {
            console.error("Error loading places data:", error);
            // Create fallback places if needed
            this._createFallbackPlaces();
            return this.places.length > 0;
        }
    }

    /**
     * Create fallback places data if loading fails
     * @private
     */
    _createFallbackPlaces() {
        // Hardcoded default place (Taj Mahal)
        this.places = [
            {
                name: "Taj Mahal",
                description: "Iconic marble mausoleum in Agra, India",
                image: "images/tajmahal.webp",
                coordinates: {
                    latitude: 27.1751,
                    longitude: 78.0421
                }
            }
        ];
        console.warn("Using fallback places data");
    }

    /**
     * Start a new game round
     * @returns {Object|null} - Current place data or null if game ended
     */
    startNewRound() {
        // Reset current round state
        this.currentPlace = null;
        
        // Check if we've completed all rounds
        if (this.currentRound >= this.totalRounds) {
            return null; // Game complete
        }
        
        // Select a random place that hasn't been used yet
        const availablePlaces = this.places.filter(place => 
            !this.playerPins.some(pin => pin.placeName === place.name)
        );
        
        if (availablePlaces.length === 0) {
            // If we've used all places, game is over
            return null;
        }
        
        // Select random place
        const randomIndex = Math.floor(Math.random() * availablePlaces.length);
        this.currentPlace = availablePlaces[randomIndex];
        
        // Increment round counter
        this.currentRound++;
        
        return this.currentPlace;
    }

    /**
     * Record player's pin placement for current round
     * @param {number} x - X coordinate of player's guess on the canvas
     * @param {number} y - Y coordinate of player's guess on the canvas
     * @returns {Object} - Score and distance information
     */
    recordPlayerGuess(x, y) {
        if (!this.currentPlace) {
            return null;
        }
        
        // Get the actual coordinates from the current place
        const actualX = this.currentPlace.coordinates.x;
        const actualY = this.currentPlace.coordinates.y;
        
        // Calculate distance between player's guess and actual location on the canvas
        const distance = this._calculateCanvasDistance(
            x, y,
            actualX, 
            actualY
        );
        
        // Calculate score (0-1000 based on distance)
        const score = this._calculateScore(distance);
        
        // Store the pin and score
        const pin = {
            placeName: this.currentPlace.name,
            playerCoordinates: { x, y },
            actualCoordinates: { ...this.currentPlace.coordinates },
            distance,
            score,
            round: this.currentRound
        };
        
        this.playerPins.push(pin);
        this.scores.push(score);
        
        return pin;
    }

    /**
     * Calculate distance between two points on the canvas (using Euclidean distance)
     * @param {number} x1 - First point x-coordinate
     * @param {number} y1 - First point y-coordinate
     * @param {number} x2 - Second point x-coordinate
     * @param {number} y2 - Second point y-coordinate
     * @returns {number} - Distance in pixels (scaled to approximate km for game purposes)
     * @private
     */
    _calculateCanvasDistance(x1, y1, x2, y2) {
        // Calculate Euclidean distance
        const distanceInPixels = Math.sqrt(
            Math.pow(x2 - x1, 2) + 
            Math.pow(y2 - y1, 2)
        );
        
        // Scale the distance to approximate kilometers for scoring purposes
        // This scaling factor can be adjusted to make the game more or less challenging
        const scalingFactor = 2.5; // pixels to km conversion factor
        
        return distanceInPixels * scalingFactor;
    }

    /**
     * Calculate score based on distance
     * @param {number} distance - Distance in pixels (scaled to km)
     * @returns {number} - Score (0-1000)
     * @private
     */
    _calculateScore(distance) {
        // Exponential decay scoring function - closer guesses score much higher
        // Score = 1000 * e^(-distance/maxDistance)
        const score = 1000 * Math.exp(-distance / this.maxDistance);
        
        // Round to nearest integer
        return Math.round(score);
    }

    /**
     * Get the current game state
     * @returns {Object} - Game state information
     */
    getGameState() {
        return {
            currentRound: this.currentRound,
            totalRounds: this.totalRounds,
            scores: this.scores,
            totalScore: this.scores.reduce((sum, score) => sum + score, 0),
            pins: this.playerPins,
            complete: this.currentRound >= this.totalRounds
        };
    }

    /**
     * Reset the game
     */
    resetGame() {
        this.currentPlace = null;
        this.currentRound = 0;
        this.playerPins = [];
        this.scores = [];
    }
}