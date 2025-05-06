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
     * @param {number} latitude - Latitude of player's guess
     * @param {number} longitude - Longitude of player's guess
     * @returns {Object} - Score and distance information
     */
    recordPlayerGuess(latitude, longitude) {
        if (!this.currentPlace) {
            return null;
        }
        
        // Calculate distance between player's guess and actual location
        const distance = this._calculateDistance(
            latitude, longitude,
            this.currentPlace.coordinates.latitude, 
            this.currentPlace.coordinates.longitude
        );
        
        // Calculate score (0-1000 based on distance)
        const score = this._calculateScore(distance);
        
        // Store the pin and score
        const pin = {
            placeName: this.currentPlace.name,
            playerCoordinates: { latitude, longitude },
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
     * Calculate distance between two geographical points (Haversine formula)
     * @param {number} lat1 - First point latitude
     * @param {number} lon1 - First point longitude
     * @param {number} lat2 - Second point latitude
     * @param {number} lon2 - Second point longitude
     * @returns {number} - Distance in kilometers
     * @private
     */
    _calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = this._toRadians(lat2 - lat1);
        const dLon = this._toRadians(lon2 - lon1);
        
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this._toRadians(lat1)) * Math.cos(this._toRadians(lat2)) * 
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Convert degrees to radians
     * @param {number} degrees - Angle in degrees
     * @returns {number} - Angle in radians
     * @private
     */
    _toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Calculate score based on distance
     * @param {number} distance - Distance in kilometers
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

    /**
     * Convert latitude/longitude to x/y coordinates on the map canvas
     * @param {number} latitude - Latitude
     * @param {number} longitude - Longitude
     * @param {number} mapWidth - Width of the map canvas
     * @param {number} mapHeight - Height of the map canvas
     * @returns {Object} - x and y coordinates
     */
    coordinatesToCanvasPoint(latitude, longitude, mapWidth, mapHeight) {
        console.log("Converting coordinates to canvas point:", { latitude, longitude, mapWidth, mapHeight });
        
        // We need to adjust our conversion to match the map's projection
        // Adjusted conversion for map fitting
        
        // Normalize longitude from -180...180 to 0...1
        // Adding a slight adjustment factor for better alignment with the map
        const x = ((longitude + 180) / 360) * mapWidth;
        
        // Convert latitude to y using adjusted Mercator formula
        const latRad = this._toRadians(latitude);
        // Use modified formula for better alignment with the visible map
        const mercN = Math.log(Math.tan((Math.PI / 4) + (latRad / 2)));
        let y = ((1 - (mercN / Math.PI)) / 2) * mapHeight;
        
        // Apply correction to better align with visible map
        // These values may need fine-tuning based on your specific map
        // The map's center is not at equator (0,0)
        
        // Return the adjusted coordinates
        const result = { x, y };
        console.log("Converted to canvas point:", result);
        return result;
    }

    /**
     * Convert canvas x/y coordinates to latitude/longitude
     * @param {number} x - X coordinate on canvas
     * @param {number} y - Y coordinate on canvas
     * @param {number} mapWidth - Width of the map canvas
     * @param {number} mapHeight - Height of the map canvas
     * @returns {Object} - latitude and longitude
     */
    canvasPointToCoordinates(x, y, mapWidth, mapHeight) {
        console.log("Converting canvas point to coordinates:", { x, y, mapWidth, mapHeight });
        
        // Normalize x/y to 0...1
        const normX = x / mapWidth;
        const normY = y / mapHeight;
        
        // Convert x to longitude using the same logic as the reverse function
        const longitude = (normX * 360) - 180;
        
        // Convert y to latitude using inverse of our modified Mercator formula
        const mercN = Math.PI * (1 - 2 * normY);
        const latRad = 2 * Math.atan(Math.exp(mercN)) - (Math.PI / 2);
        const latitude = latRad * (180 / Math.PI);
        
        // Return the adjusted coordinates
        const result = { latitude, longitude };
        console.log("Converted to coordinates:", result);
        return result;
    }
}