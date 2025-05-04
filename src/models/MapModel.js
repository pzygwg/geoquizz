/**
 * MapModel.js
 * Manages the map data and country adjacency logic
 */

export default class MapModel {
    constructor() {
        this.countries = new Map(); // Map of country name -> country data with paths
        this.adjacencyMap = new Map(); // Map of country name -> adjacent countries
        this.continentMap = new Map(); // Map of country name -> continent
        this.countriesList = []; // List of unique country names
        this.validPairs = []; // List of valid country pairs for the game
        this.svgLoaded = false;
    }

    /**
     * Loads SVG map data and adjacency data
     * @param {string} svgUrl - URL to the SVG file
     * @returns {Promise} - Resolves when data is loaded and processed
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
            
            // Extract and process country paths (handling multiple paths per country)
            await this._processCountryPaths(svgDoc);
            
            // Load adjacency data from JSON
            await this._loadAdjacencyData();
            
            // Load valid country pairs from JSON
            await this._loadCountryPairs();
            
            this.svgLoaded = true;
            return true;
        } catch (error) {
            console.error("Error loading map data:", error);
            return false;
        }
    }
    
    /**
     * Processes all country paths from the SVG, handling multiple paths per country
     * @param {Document} svgDoc - The parsed SVG document
     * @private
     */
    async _processCountryPaths(svgDoc) {
        // Clear existing data
        this.countries.clear();
        this.continentMap.clear();
        
        // Extract country paths
        const paths = svgDoc.querySelectorAll('path');
        
        if (paths.length === 0) {
            throw new Error("No paths found in SVG");
        }
        
        // Process each path
        paths.forEach(path => {
            // Get country information
            const id = path.id || '';
            const name = path.getAttribute('name') || id || 'Unknown';
            const fill = path.getAttribute('fill') || '#ececec';
            const pathData = path.getAttribute('d');
            // Get continent from class name if available
            const continent = path.getAttribute('class') || 'Unknown';
            
            if (!pathData) return;
            
            // Check if we already have data for this country
            if (this.countries.has(name)) {
                // Add this path to the existing country
                const country = this.countries.get(name);
                country.paths.push(pathData);
            } else {
                // Create a new country entry
                this.countries.set(name, {
                    id,
                    name,
                    fill,
                    paths: [pathData], // Array of path data strings
                    selected: false,
                    isStart: false,
                    isEnd: false,
                    continent
                });
                
                // Store continent information
                this.continentMap.set(name, continent);
            }
        });
        
        // Create a list of unique country names
        this.countriesList = Array.from(this.countries.keys());
        
        console.log(`Processed ${this.countriesList.length} unique countries with ${paths.length} total paths`);
    }
    
    /**
     * Loads country adjacency data from JSON
     * @private
     */
    async _loadAdjacencyData() {
        try {
            const response = await fetch('data/country_adjacency.json');
            if (!response.ok) {
                throw new Error(`Adjacency data fetch failed: ${response.status}`);
            }
            
            const adjacencyData = await response.json();
            
            // Clear existing adjacency data
            this.adjacencyMap.clear();
            
            // Process adjacency data
            if (adjacencyData && adjacencyData.adjacency) {
                Object.entries(adjacencyData.adjacency).forEach(([country, neighbors]) => {
                    // Create a set of adjacent countries
                    this.adjacencyMap.set(country, new Set(neighbors));
                });
                
                console.log(`Loaded adjacency data for ${this.adjacencyMap.size} countries`);
            }
        } catch (error) {
            console.error("Error loading adjacency data:", error);
            // Fall back to a simplified approach
            this._generateFallbackAdjacency();
        }
    }
    
    /**
     * Generates fallback adjacency data if JSON loading fails
     * @private
     */
    _generateFallbackAdjacency() {
        console.warn("Using fallback adjacency generation");
        
        this.countriesList.forEach(countryName => {
            if (!this.adjacencyMap.has(countryName)) {
                this.adjacencyMap.set(countryName, new Set());
            }
            
            // Simple fallback: countries in the same continent might be adjacent
            const continent = this.continentMap.get(countryName);
            
            this.countriesList.forEach(otherName => {
                if (countryName === otherName) return;
                
                const otherContinent = this.continentMap.get(otherName);
                
                // Add some adjacencies for countries in the same continent
                if (continent === otherContinent && continent !== 'Unknown') {
                    // Add with some probability to avoid too many connections
                    if (Math.random() < 0.2) {
                        this.adjacencyMap.get(countryName).add(otherName);
                    }
                }
            });
        });
    }
    
    /**
     * Loads valid country pairs from JSON
     * @private
     */
    async _loadCountryPairs() {
        try {
            const response = await fetch('data/country_pairs.json');
            if (!response.ok) {
                throw new Error(`Country pairs fetch failed: ${response.status}`);
            }
            
            const pairsData = await response.json();
            
            if (pairsData && pairsData.validPairs) {
                this.validPairs = pairsData.validPairs;
                console.log(`Loaded ${this.validPairs.length} valid country pairs`);
            }
        } catch (error) {
            console.error("Error loading country pairs data:", error);
            // Will fall back to random pairs in getRandomCountryPair
        }
    }
    
    /**
     * Gets a random pair of countries that have a valid path between them
     * Uses predefined pairs if available, otherwise generates a random pair
     * @returns {Object} - Object with start and end country names
     */
    getRandomCountryPair() {
        if (!this.svgLoaded || this.countries.size === 0) {
            return null;
        }
        
        // Use predefined pairs if available
        if (this.validPairs.length > 0) {
            const randomIndex = Math.floor(Math.random() * this.validPairs.length);
            const pair = this.validPairs[randomIndex];
            
            // Make sure both countries exist in our data
            if (this.countries.has(pair.start) && this.countries.has(pair.end)) {
                return {
                    start: pair.start,
                    end: pair.end
                };
            }
        }
        
        // Fallback to random selection
        return this._generateRandomCountryPair();
    }
    
    /**
     * Generates a random country pair as a fallback
     * @returns {Object} - Object with start and end country names
     * @private
     */
    _generateRandomCountryPair() {
        // Get a valid starting country
        let startCountryName = null;
        let attempts = 0;
        const maxAttempts = 100;
        
        while (!startCountryName && attempts < maxAttempts) {
            const randomIndex = Math.floor(Math.random() * this.countriesList.length);
            const candidateName = this.countriesList[randomIndex];
            
            if (this.adjacencyMap.has(candidateName) && 
                this.adjacencyMap.get(candidateName).size > 0) {
                startCountryName = candidateName;
            }
            
            attempts++;
        }
        
        if (!startCountryName) {
            console.error("Could not find a valid starting country with adjacencies");
            // Just pick any two countries as a last resort
            if (this.countriesList.length >= 2) {
                return {
                    start: this.countriesList[0],
                    end: this.countriesList[1]
                };
            }
            return null;
        }
        
        // Find a suitable end country
        let possibleEndCountries = [];
        
        // Filter countries in the same continent
        const startContinent = this.continentMap.get(startCountryName);
        
        this.countriesList.forEach(countryName => {
            if (countryName === startCountryName) {
                return; // Skip the start country
            }
            
            const countryContinent = this.continentMap.get(countryName);
            
            // Include countries in the same continent or adjacent ones
            if ((countryContinent === startContinent && startContinent !== 'Unknown') ||
                this.isAdjacent(startCountryName, countryName)) {
                possibleEndCountries.push(countryName);
            }
        });
        
        // If no end countries found, just pick a random one
        if (possibleEndCountries.length === 0) {
            const nonStartCountries = this.countriesList.filter(
                name => name !== startCountryName
            );
            
            if (nonStartCountries.length === 0) {
                return null;
            }
            
            const randomIndex = Math.floor(Math.random() * nonStartCountries.length);
            return {
                start: startCountryName,
                end: nonStartCountries[randomIndex]
            };
        }
        
        // Pick a random end country
        const randomEndIndex = Math.floor(Math.random() * possibleEndCountries.length);
        const endCountryName = possibleEndCountries[randomEndIndex];
        
        return {
            start: startCountryName,
            end: endCountryName
        };
    }
    
    /**
     * Checks if two countries are adjacent using the adjacency data
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
        
        // Find the country by normalized name
        for (const [countryName, countryData] of this.countries.entries()) {
            if (countryName.toLowerCase() === normalizedName) {
                return countryData;
            }
        }
        
        return null;
    }
    
    /**
     * Sets highlight status for a country
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
     * Sets a country as the start or end point
     * @param {string} countryName - Name of the country
     * @param {string} type - 'start' or 'end'
     */
    setCountryEndpoint(countryName, type) {
        const country = this.getCountryByName(countryName);
        if (country) {
            if (type === 'start') {
                country.isStart = true;
            } else if (type === 'end') {
                country.isEnd = true;
            }
        }
    }
    
    /**
     * Gets all country data for rendering
     * @returns {Array} - Array of country objects ready for rendering
     */
    getAllCountriesForRendering() {
        // Create a flat array of country objects with rendering information
        const renderData = [];
        
        this.countries.forEach(country => {
            renderData.push({
                name: country.name,
                paths: country.paths,  // All paths for this country
                fill: country.fill,
                selected: country.selected,
                isStart: country.isStart,
                isEnd: country.isEnd
            });
        });
        
        return renderData;
    }
    
    /**
     * Resets all country highlights and endpoints
     */
    resetCountryHighlights() {
        this.countries.forEach(country => {
            country.selected = false;
            country.isStart = false;
            country.isEnd = false;
        });
    }
}