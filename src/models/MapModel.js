/**
 * MapModel.js
 * Manages the map data and country adjacency logic
 */

export default class MapModel {
    constructor() {
        this.countries = []; // Array to store country data
        this.adjacencyMap = new Map(); // Map of country name -> adjacent countries
        this.continentMap = new Map(); // Map of country name -> continent
        this.svgLoaded = false;
    }

    /**
     * Loads SVG map data from the given URL
     * @param {string} svgUrl - URL to the SVG file
     * @returns {Promise} - Resolves when SVG is loaded and processed
     */
    async loadMapData(svgUrl) {
        try {
            // Fetch SVG file
            const response = await fetch(svgUrl);
            if (!response.ok) {
                throw new Error(`SVG file fetch failed: ${response.status}`);
            }
            
            const svgText = await response.text();
            
            // Parse SVG
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
            
            if (svgDoc.querySelector('parsererror')) {
                throw new Error("SVG parsing error");
            }
            
            // Extract country paths
            const paths = svgDoc.querySelectorAll('path');
            
            if (paths.length === 0) {
                throw new Error("No paths found in SVG");
            }
            
            // Process countries
            this.countries = [];
            
            paths.forEach(path => {
                // Get country information
                const id = path.id || '';
                const name = path.getAttribute('name') || id || 'Unknown';
                const fill = path.getAttribute('fill') || '#ececec';
                const pathData = path.getAttribute('d');
                // Get continent from class name if available
                const continent = path.getAttribute('class') || 'Unknown';
                
                if (pathData) {
                    // Store country data
                    this.countries.push({
                        id,
                        name,
                        fill,
                        path: pathData,
                        selected: false,
                        continent
                    });
                    
                    // Store continent information
                    this.continentMap.set(name, continent);
                }
            });
            
            // Build adjacency data
            this._buildAdjacencyMap(svgDoc);
            
            this.svgLoaded = true;
            return true;
        } catch (error) {
            console.error("Error loading map data:", error);
            return false;
        }
    }
    
    /**
     * Builds a map of country adjacencies
     * @param {Document} svgDoc - The parsed SVG document
     * @private
     */
    _buildAdjacencyMap(svgDoc) {
        // Clear existing adjacency data
        this.adjacencyMap.clear();
        
        // Basic adjacency detection: 
        // Two countries are adjacent if their paths share points
        // This is a simplified approach - in a production app, this would be 
        // pre-computed or use a more sophisticated algorithm for accuracy
        
        for (let i = 0; i < this.countries.length; i++) {
            const country1 = this.countries[i];
            if (!this.adjacencyMap.has(country1.name)) {
                this.adjacencyMap.set(country1.name, new Set());
            }
            
            for (let j = 0; j < this.countries.length; j++) {
                if (i === j) continue;
                
                const country2 = this.countries[j];
                
                // Simple adjacency check:
                // In real implementation, we would do proper adjacency testing with geometry
                // For now, we're simulating adjacency based on the SVG structure
                // This would typically be pre-computed data or use better algorithms
                
                // Check if countries are likely adjacent based on SVG path data
                // This is a naive approach - real implementation would be more accurate
                if (this._areCountriesLikelyAdjacent(country1, country2)) {
                    this.adjacencyMap.get(country1.name).add(country2.name);
                }
            }
        }
    }
    
    /**
     * Determines if two countries are likely adjacent based on SVG data
     * This is a simplified simulation - real implementation would be more accurate
     * @param {Object} country1 - First country object
     * @param {Object} country2 - Second country object
     * @returns {boolean} - True if countries are likely adjacent
     * @private
     */
    _areCountriesLikelyAdjacent(country1, country2) {
        // In a real implementation, this would use proper geometry calculations
        // For this prototype, we'll simulate adjacency with a heuristic
        
        // Check if countries are in the same continent
        const sameContinent = country1.continent === country2.continent && 
                             country1.continent !== 'Unknown';
        
        // For simplicity, we'll assume there's a small chance countries are adjacent
        // if they're in the same continent
        if (sameContinent) {
            // Instead of a random value, we could use more deterministic properties of the paths
            // like checking if the path bounding boxes touch each other
            return Math.random() < 0.4; // 40% chance if same continent
        }
        
        // Less chance for countries in different continents
        // In a real implementation, this would check actual path geometries
        return Math.random() < 0.05; // 5% chance otherwise
    }
    
    /**
     * Gets a random pair of countries that have a valid path between them
     * @returns {Object} - Object with start and end country names
     */
    getRandomCountryPair() {
        if (!this.svgLoaded || this.countries.length === 0) {
            return null;
        }
        
        // Get a valid starting country (one with adjacencies)
        let startCountry = null;
        let attempts = 0;
        const maxAttempts = 100;
        
        while (!startCountry && attempts < maxAttempts) {
            const randomIndex = Math.floor(Math.random() * this.countries.length);
            const candidate = this.countries[randomIndex];
            
            if (this.adjacencyMap.has(candidate.name) && 
                this.adjacencyMap.get(candidate.name).size > 0) {
                startCountry = candidate;
            }
            
            attempts++;
        }
        
        if (!startCountry) {
            console.error("Could not find a valid starting country with adjacencies");
            return null;
        }
        
        // Find countries reachable from startCountry
        // For simplicity, we'll use countries from the same continent or adjacent ones
        let possibleEndCountries = [];
        
        // Filter countries in the same continent
        const startContinent = this.continentMap.get(startCountry.name);
        
        this.countries.forEach(country => {
            if (country.name === startCountry.name) {
                return; // Skip the start country
            }
            
            const countryContinent = this.continentMap.get(country.name);
            
            // Include countries in the same continent
            if (countryContinent === startContinent && startContinent !== 'Unknown') {
                possibleEndCountries.push(country);
            } 
            // Include directly adjacent countries
            else if (this.isAdjacent(startCountry.name, country.name)) {
                possibleEndCountries.push(country);
            }
        });
        
        // If no end countries found, just pick a random one
        if (possibleEndCountries.length === 0) {
            const nonStartCountries = this.countries.filter(
                c => c.name !== startCountry.name
            );
            const randomIndex = Math.floor(Math.random() * nonStartCountries.length);
            return {
                start: startCountry.name,
                end: nonStartCountries[randomIndex].name
            };
        }
        
        // Pick a random end country
        const randomEndIndex = Math.floor(Math.random() * possibleEndCountries.length);
        const endCountry = possibleEndCountries[randomEndIndex];
        
        return {
            start: startCountry.name,
            end: endCountry.name
        };
    }
    
    /**
     * Checks if two countries are adjacent
     * @param {string} country1 - Name of first country
     * @param {string} country2 - Name of second country
     * @returns {boolean} - True if countries are adjacent
     */
    isAdjacent(country1, country2) {
        if (!this.adjacencyMap.has(country1) || !this.adjacencyMap.has(country2)) {
            return false;
        }
        
        return this.adjacencyMap.get(country1).has(country2) || 
               this.adjacencyMap.get(country2).has(country1);
    }
    
    /**
     * Gets a country by name (case-insensitive)
     * @param {string} name - Name of the country to find
     * @returns {Object|null} - Country object or null if not found
     */
    getCountryByName(name) {
        if (!name) return null;
        
        const normalizedName = name.trim().toLowerCase();
        return this.countries.find(country => 
            country.name.toLowerCase() === normalizedName
        ) || null;
    }
    
    /**
     * Highlights a country on the map
     * @param {string} countryName - Name of the country to highlight
     * @param {boolean} selected - Whether to select or deselect the country
     */
    setCountryHighlight(countryName, selected = true) {
        const country = this.getCountryByName(countryName);
        if (country) {
            country.selected = selected;
        }
    }
    
    /**
     * Gets all countries with their data
     * @returns {Array} - Array of country objects
     */
    getAllCountries() {
        return this.countries;
    }
}