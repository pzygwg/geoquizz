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
        
        // For "Name Them All" game mode
        this.regionCountries = new Map(); // Map of region name -> array of countries
        this.namedCountries = new Set(); // Set of countries already named
        this.currentRegion = null; // Current selected region
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
            
            // Load countries by region for "Name Them All" game
            await this._loadRegionCountries();
            
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
     * Loads country regions data from JSON for "Name Them All" game
     * @private
     */
    async _loadRegionCountries() {
        try {
            const response = await fetch('data/countries_by_region.json');
            if (!response.ok) {
                throw new Error(`Region data fetch failed: ${response.status}`);
            }
            
            const regionData = await response.json();
            
            // Process regions data
            if (regionData && regionData.regions) {
                // Clear existing region data
                this.regionCountries.clear();
                
                // Process each region
                Object.entries(regionData.regions).forEach(([region, countries]) => {
                    // Filter to only include countries that exist in our SVG map
                    const validCountries = countries.filter(country => 
                        this.countries.has(country)
                    );
                    
                    this.regionCountries.set(region, validCountries);
                });
                
                // Add "World" as all countries in our map
                if (!this.regionCountries.has("World")) {
                    this.regionCountries.set("World", [...this.countriesList]);
                }
                
                console.log(`Loaded region data with ${this.regionCountries.size} regions`);
            }
        } catch (error) {
            console.error("Error loading region data:", error);
            // Create fallback regions based on continents if needed
            this._generateFallbackRegions();
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
        
        // Try direct match first
        for (const [countryName, countryData] of this.countries.entries()) {
            if (countryName.toLowerCase() === normalizedName) {
                console.log(`Found exact match for country: ${countryName}`);
                return countryData;
            }
        }
        
        // Special cases for common country names
        // Maps common names or abbreviations to official names
        const specialCases = {
            'usa': 'United States',
            'united states of america': 'United States',
            'uk': 'United Kingdom',
            'great britain': 'United Kingdom',
            'england': 'United Kingdom',
            'holland': 'Netherlands',
            'macedonia': 'North Macedonia',
            'czechia': 'Czech Republic',
            'russia': 'Russia',
            'america': 'United States',
            'uae': 'United Arab Emirates'
        };
        
        // Check if we have a special case match
        if (specialCases[normalizedName]) {
            const officialName = specialCases[normalizedName];
            const countryData = this.countries.get(officialName);
            if (countryData) {
                console.log(`Found special case match for country: ${normalizedName} -> ${officialName}`);
                return countryData;
            }
        }
        
        // Check with exact capitalization from countries_by_region.json
        if (this.regionCountries.has('Europe')) {
            // Try to find the country in any region with more lenient matching
            for (const [region, countries] of this.regionCountries.entries()) {
                for (const countryName of countries) {
                    if (countryName.toLowerCase() === normalizedName) {
                        const countryData = this.countries.get(countryName);
                        if (countryData) {
                            console.log(`Found region-based match for country: ${normalizedName} -> ${countryName}`);
                            return countryData;
                        }
                    }
                }
            }
        }
        
        console.log(`No match found for country: ${normalizedName}`);
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
    
    /**
     * Generates fallback regions if JSON loading fails
     * @private
     */
    _generateFallbackRegions() {
        console.warn("Using fallback region generation");
        
        // Create basic regions based on continents from existing data
        const europeanCountries = [];
        const americanCountries = [];
        const asianCountries = [];
        const africanCountries = [];
        const otherCountries = [];
        
        this.countriesList.forEach(countryName => {
            const continent = this.continentMap.get(countryName) || '';
            const continentLower = continent.toLowerCase();
            
            if (continentLower.includes('europe')) {
                europeanCountries.push(countryName);
            } else if (continentLower.includes('america') || 
                    continentLower.includes('north') || 
                    continentLower.includes('south') || 
                    continentLower.includes('caribbean')) {
                americanCountries.push(countryName);
            } else if (continentLower.includes('asia') || 
                    continentLower.includes('middle east')) {
                asianCountries.push(countryName);
            } else if (continentLower.includes('africa')) {
                africanCountries.push(countryName);
            } else {
                otherCountries.push(countryName);
            }
        });
        
        // Set up regions
        this.regionCountries.set('Europe', europeanCountries);
        this.regionCountries.set('America', americanCountries);
        this.regionCountries.set('Asia', asianCountries);
        this.regionCountries.set('Africa', africanCountries);
        this.regionCountries.set('World', this.countriesList);
    }
    
    /**
     * Sets the current region for "Name Them All" game
     * @param {string} region - Name of the region to set
     * @returns {boolean} - True if the region was found and set
     */
    setRegion(region) {
        console.log(`Setting region to ${region}`);
        
        // Check if the region exists directly in our regionCountries map
        if (this.regionCountries.has(region)) {
            console.log(`Found region ${region} directly in regionCountries`);
            this.currentRegion = region;
            // Reset named countries when changing regions
            this.namedCountries.clear();
            return true;
        }
        
        // Special case for metaregions
        if (region === 'World') {
            console.log('Setting special World region');
            this.currentRegion = 'World';
            this.namedCountries.clear();
            
            // If we don't already have World as a region, make sure it's added
            if (!this.regionCountries.has('World')) {
                console.log('Adding World region with all countries');
                this.regionCountries.set('World', [...this.countriesList]);
            }
            
            return true;
        }
        
        console.log(`Failed to set region ${region}`);
        return false;
    }
    
    /**
     * Gets all available regions for the game
     * @returns {Array} - Array of region names
     */
    getAvailableRegions() {
        // Make sure we have regions loaded
        if (this.regionCountries.size === 0) {
            console.warn('No regions loaded, using fallback regions');
            // Fallback regions if data wasn't loaded properly
            return ['Europe', 'America', 'Asia', 'Africa', 'World'];
        }
        
        const regions = Array.from(this.regionCountries.keys());
        console.log('Available regions from model:', regions);
        return regions;
    }
    
    /**
     * Gets countries for the current region
     * @returns {Array} - Array of country names in the current region
     */
    getCurrentRegionCountries() {
        if (!this.currentRegion || !this.regionCountries.has(this.currentRegion)) {
            return [];
        }
        return this.regionCountries.get(this.currentRegion);
    }
    
    /**
     * Checks if a country is in the current region
     * @param {string} countryName - Name of the country to check
     * @returns {boolean} - True if the country is in the current region
     */
    isCountryInCurrentRegion(countryName) {
        if (!this.currentRegion) {
            console.warn('No current region set');
            return false;
        }
        
        // Normalize the input country name
        const normalizedInput = countryName.trim().toLowerCase();
        
        // Special handling for World region (contains all countries)
        if (this.currentRegion === 'World') {
            console.log(`World region selected, checking if ${countryName} exists in any region`);
            // For World region, check if the country exists in any region
            for (const regions of this.regionCountries.values()) {
                for (const regionCountry of regions) {
                    if (regionCountry.toLowerCase() === normalizedInput) {
                        console.log(`Found match for ${countryName} in World region`);
                        return true;
                    }
                }
            }
            
            // Also check if it exists in our countries list
            for (const countryKey of this.countriesList) {
                if (countryKey.toLowerCase() === normalizedInput) {
                    console.log(`Found match for ${countryName} in World region (from countriesList)`);
                    return true;
                }
            }
            
            console.log(`No match for ${countryName} in World region`);
            return false;
        }
        
        // Handle metaregions (like "World" which includes multiple regions)
        let regionCountries = [];
        if (this.regionCountries.get(this.currentRegion)) {
            regionCountries = this.regionCountries.get(this.currentRegion);
        }
        
        console.log(`Checking if ${countryName} is in region ${this.currentRegion}`);
        
        // Case-insensitive check
        for (const regionCountry of regionCountries) {
            if (regionCountry.toLowerCase() === normalizedInput) {
                console.log(`Found match for ${countryName} in region ${this.currentRegion}`);
                return true;
            }
        }
        
        // No match found
        console.log(`No match for ${countryName} in region ${this.currentRegion}`);
        return false;
    }
    
    /**
     * Marks a country as named in the "Name Them All" game
     * @param {string} countryName - Name of the country to mark
     * @returns {boolean} - True if the country was valid and marked
     */
    markCountryNamed(countryName) {
        console.log(`Attempting to mark ${countryName} as named`);
        
        // First check if country is in current region and not already named
        if (this.isCountryInCurrentRegion(countryName) && !this.namedCountries.has(countryName)) {
            // Find the exact matching country name from the list (preserving case)
            let exactCountryName = countryName;
            
            // For World region, search all regions for exact match
            if (this.currentRegion === 'World') {
                const normalizedInput = countryName.trim().toLowerCase();
                
                // Search through all regions for the exact case country name
                for (const regions of this.regionCountries.values()) {
                    for (const regionCountry of regions) {
                        if (regionCountry.toLowerCase() === normalizedInput) {
                            exactCountryName = regionCountry;
                            break;
                        }
                    }
                }
                
                // Also search the countries list
                for (const country of this.countriesList) {
                    if (country.toLowerCase() === normalizedInput) {
                        exactCountryName = country;
                        break;
                    }
                }
            } else {
                // For standard regions, search just that region
                const normalizedInput = countryName.trim().toLowerCase();
                const regionCountries = this.regionCountries.get(this.currentRegion) || [];
                
                for (const regionCountry of regionCountries) {
                    if (regionCountry.toLowerCase() === normalizedInput) {
                        exactCountryName = regionCountry;
                        break;
                    }
                }
            }
            
            console.log(`Adding country ${exactCountryName} to named countries`);
            this.namedCountries.add(exactCountryName);
            
            // Also highlight the country on the map
            this.setCountryHighlight(exactCountryName, true);
            return true;
        }
        
        console.log(`Failed to mark ${countryName} as named`);
        return false;
    }
    
    /**
     * Gets all named countries for the current region
     * @returns {Array} - Array of named country names
     */
    getNamedCountries() {
        return Array.from(this.namedCountries);
    }
    
    /**
     * Gets the count of remaining countries to name
     * @returns {Object} - Object with named, total, and remaining counts
     */
    getRemainingCountsForRegion() {
        if (!this.currentRegion) {
            return { named: 0, total: 0, remaining: 0 };
        }
        
        const regionCountries = this.regionCountries.get(this.currentRegion) || [];
        const namedCount = this.namedCountries.size;
        const totalCount = regionCountries.length;
        
        return {
            named: namedCount,
            total: totalCount,
            remaining: totalCount - namedCount
        };
    }
    
    /**
     * Checks if all countries in the current region have been named
     * @returns {boolean} - True if all countries have been named
     */
    areAllCountriesNamed() {
        if (!this.currentRegion) return false;
        
        const regionCountries = this.regionCountries.get(this.currentRegion) || [];
        return this.namedCountries.size === regionCountries.length;
    }
    
    /**
     * Resets the named countries for a new game
     */
    resetNamedCountries() {
        this.namedCountries.clear();
    }
}