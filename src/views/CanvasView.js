/**
 * CanvasView.js
 * Handles rendering the map on the canvas and visual feedback
 */

export default class CanvasView {
    constructor(canvasId, tooltipId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.tooltip = document.getElementById(tooltipId);
        this.tooltipText = document.getElementById('tooltipText');
        
        // Map rendering state
        this.zoomLevel = 1.0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.baseScale = 1.0;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        // Pre-rendered map
        this.preRenderedMap = null;
        this.countryHitMap = new Map(); // Map for hit testing
        
        // Colors - Pixel art style colors
        this.defaultFill = '#55d6c2'; // Default country color
        this.highlightFill = '#ff6b6b'; // Color for highlighted countries
        this.startEndFill = '#55d688'; // Color for start/end countries
        this.hoverFill = '#ffcc66'; // Color for hovered countries
        this.namedFill = '#ffcc00'; // Yellow color for named countries in Name Them All
        
        // Game mode
        this.gameMode = 'countryPath'; // Default game mode
        
        // Initialize event listeners
        this._initEventListeners();
        
        // Set initial canvas size
        this._resizeCanvas();
    }
    
    /**
     * Initializes canvas event listeners
     * @private
     */
    _initEventListeners() {
        // Handle window resize
        window.addEventListener('resize', () => this._resizeCanvas());
        
        // Handle hover/tooltip effect
        this.canvas.addEventListener('mousemove', (event) => this._handleCanvasMouseMove(event));
        
        // Handle zooming
        this.canvas.addEventListener('wheel', (event) => this._handleWheelZoom(event), { passive: false });
        
        // Handle panning
        this.canvas.addEventListener('mousedown', (event) => this._handleMouseDown(event));
        this.canvas.addEventListener('mouseup', () => this._handleMouseUp());
        this.canvas.addEventListener('mouseleave', () => this._handleMouseUp());
    }
    
    /**
     * Resizes canvas to match container size with high-DPI support
     * @private
     */
    _resizeCanvas() {
        // Get the device pixel ratio
        const dpr = window.devicePixelRatio || 1;
        
        // Get the container rect
        const rect = this.canvas.parentElement.getBoundingClientRect();
        
        // Set CSS dimensions
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        // Set canvas attributes to match its CSS size × device pixel ratio
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        
        // Scale the context to maintain the same visual size
        this.ctx.scale(dpr, dpr);
        
        // Store the DPI for other functions to use
        this.canvas.dataset.dpr = dpr;
        
        // Redraw the map
        this.redraw();
    }
    
    /**
     * Handles mouse movement over the canvas
     * Shows country name tooltip on hover
     * Handles panning when dragging
     * @param {MouseEvent} event - Mouse event
     * @private
     */
    _handleCanvasMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        
        // Get mouse position in canvas coordinates
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Handle panning
        if (this.isDragging) {
            const dx = event.clientX - this.lastMouseX;
            const dy = event.clientY - this.lastMouseY;
            this.offsetX += dx;
            this.offsetY += dy;
            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
            this.redraw(); // Redraw during panning
        } else {
            // Only update tooltip if not panning
            this._updateTooltip(x, y, event.clientX, event.clientY);
        }
    }
    
    /**
     * Updates the tooltip based on mouse position
     * @param {number} canvasX - X position in canvas
     * @param {number} canvasY - Y position in canvas
     * @param {number} clientX - X position in client coordinates
     * @param {number} clientY - Y position in client coordinates
     * @private
     */
    _updateTooltip(canvasX, canvasY, clientX, clientY) {
        // Update tooltip position
        this.tooltip.style.top = clientY - 40 + 'px';
        this.tooltip.style.left = clientX + 10 + 'px';
        
        // Convert to map coordinates
        const mapCoords = this._screenToMapCoords(canvasX, canvasY);
        
        // Find which country the mouse is over and its selected state
        const hoveredCountryInfo = this._getHoveredCountryInfo(mapCoords.x, mapCoords.y);
        
        // Update tooltip display
        if (hoveredCountryInfo) {
            this.tooltip.style.opacity = 1;
            
            // If in game mode and country not yet discovered, show "?" instead of name
            if ((this.gameMode === 'nameThemAll' && !hoveredCountryInfo.selected) || 
                (this.gameMode === 'countryPath' && !hoveredCountryInfo.isEndpoint && !hoveredCountryInfo.selected)) {
                this.tooltipText.innerText = "?";
            } else {
                this.tooltipText.innerText = hoveredCountryInfo.name;
            }
        } else {
            this.tooltip.style.opacity = 0;
        }
    }
    
    /**
     * Converts screen coordinates to map coordinates
     * @param {number} screenX - X position in screen coordinates
     * @param {number} screenY - Y position in screen coordinates
     * @returns {Object} - Object with x and y map coordinates
     * @private
     */
    _screenToMapCoords(screenX, screenY) {
        // Inverse transformation: screen -> map
        const mapX = (screenX - this.offsetX) / (this.baseScale * this.zoomLevel);
        const mapY = (screenY - this.offsetY) / (this.baseScale * this.zoomLevel);
        
        return { x: mapX, y: mapY };
    }
    
    /**
     * Gets the country and its state at a given point using the hit map
     * @param {number} x - X coordinate on the map
     * @param {number} y - Y coordinate on the map
     * @returns {Object|null} - Country info or null if none found
     * @private
     */
    _getHoveredCountryInfo(x, y) {
        // Check if we have a hit map
        if (!this.hitCanvas) {
            return null;
        }
        
        // Get the hit testing context
        const hitCtx = this.hitCanvas.getContext('2d');
        
        // Check if point is within any country
        try {
            // Get pixel data at mouse position
            const pixel = hitCtx.getImageData(x, y, 1, 1).data;
            // Convert pixel color to ID
            const colorKey = `${pixel[0]},${pixel[1]},${pixel[2]}`;
            
            // Look up country name by color key
            const countryName = this.countryHitMap.get(colorKey);
            
            if (!countryName) return null;
            
            // Look up country state from countries map
            const countryIndex = this.countryStateMap.get(countryName);
            
            if (countryIndex !== undefined) {
                return {
                    name: countryName,
                    selected: this.countriesState[countryIndex].selected,
                    isEndpoint: this.countriesState[countryIndex].isStart || this.countriesState[countryIndex].isEnd
                };
            }
            
            // If we don't have state info, just return the name
            return { name: countryName, selected: false, isEndpoint: false };
        } catch (e) {
            // This happens if the point is outside the canvas
            return null;
        }
    }
    
    /**
     * Gets just the country name at a given point (for backward compatibility)
     * @param {number} x - X coordinate on the map
     * @param {number} y - Y coordinate on the map
     * @returns {string|null} - Country name or null if none found
     * @private
     */
    _getHoveredCountry(x, y) {
        const info = this._getHoveredCountryInfo(x, y);
        return info ? info.name : null;
    }
    
    /**
     * Handles mouse wheel events for zooming
     * @param {WheelEvent} event - Wheel event
     * @private
     */
    _handleWheelZoom(event) {
        event.preventDefault(); // Prevent page scrolling
        
        // Reduced zoom intensity for slower zooming
        const zoomIntensity = 0.04; // Was 0.1, now much slower
        const maxZoom = 10.0;
        const minZoom = 0.5;
        
        // Get mouse position relative to canvas
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        // Normalize wheel delta for better cross-browser compatibility
        // Apply a factor to make zooming more consistent
        const normalizedDelta = -Math.sign(event.deltaY) * 0.5; // Smoothen the zoom
        
        // Calculate new zoom level with smoother factor
        const newZoomLevel = Math.max(
            minZoom, 
            Math.min(
                maxZoom, 
                this.zoomLevel * (1 + normalizedDelta * zoomIntensity)
            )
        );
        
        // Calculate the point on the map under the mouse before zoom
        const mapCoords = this._screenToMapCoords(mouseX, mouseY);
        
        // Update offsets to keep the point under the mouse stationary
        this.offsetX = mouseX - mapCoords.x * this.baseScale * newZoomLevel;
        this.offsetY = mouseY - mapCoords.y * this.baseScale * newZoomLevel;
        
        // Update zoom level
        this.zoomLevel = newZoomLevel;
        
        // Redraw the map
        this.redraw();
    }
    
    /**
     * Handles mouse down event for panning
     * @param {MouseEvent} event - Mouse event
     * @private
     */
    _handleMouseDown(event) {
        this.isDragging = true;
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
        this.canvas.style.cursor = 'grabbing';
    }
    
    /**
     * Handles mouse up event for panning
     * @private
     */
    _handleMouseUp() {
        this.isDragging = false;
        this.canvas.style.cursor = 'grab';
    }
    
    /**
     * Renders the map on the canvas, handling countries with multiple paths
     * @param {Array} countries - Array of country objects with multiple paths
     */
    renderMap(countries) {
        if (!countries || countries.length === 0) {
            return;
        }
        
        // Get the device pixel ratio
        const dpr = parseFloat(this.canvas.dataset.dpr || 1);
        
        // Pre-render the map for better performance
        const mapCanvas = document.createElement('canvas');
        mapCanvas.width = 4000; // High resolution for quality
        mapCanvas.height = 2000;
        const mapCtx = mapCanvas.getContext('2d');
        
        // Create a canvas for hit testing
        this.hitCanvas = document.createElement('canvas');
        this.hitCanvas.width = mapCanvas.width;
        this.hitCanvas.height = mapCanvas.height;
        const hitCtx = this.hitCanvas.getContext('2d');
        
        // Clear the hit map
        this.countryHitMap = new Map();
        this.countryStateMap = new Map();
        this.countriesState = countries;
        
        // Enable high-quality image scaling
        mapCtx.imageSmoothingEnabled = true;
        mapCtx.imageSmoothingQuality = 'high';
        
        // Draw each country
        countries.forEach((country, index) => {
            try {
                // Create a unique color for hit testing based on index
                const r = (index & 0xFF);
                const g = ((index >> 8) & 0xFF);
                const b = ((index >> 16) & 0xFF);
                const colorKey = `${r},${g},${b}`;
                
                // Store country name by color key for hit testing
                this.countryHitMap.set(colorKey, country.name);
                
                // Store index for state lookup
                this.countryStateMap.set(country.name, index);
                
                // Choose fill color based on country state and game mode
                if (this.gameMode === 'nameThemAll') {
                    // For "Name Them All" game mode, named countries are yellow
                    if (country.selected) {
                        mapCtx.fillStyle = this.namedFill; // Yellow for correctly named countries
                    } else {
                        mapCtx.fillStyle = country.fill || this.defaultFill;
                    }
                } else {
                    // For "Country Path" game mode
                    if (country.isStart) {
                        mapCtx.fillStyle = this.startEndFill;
                    } else if (country.isEnd) {
                        mapCtx.fillStyle = '#55d6c2'; // Different color for end country
                    } else if (country.selected) {
                        mapCtx.fillStyle = this.highlightFill;
                    } else {
                        mapCtx.fillStyle = country.fill || this.defaultFill;
                    }
                }
                
                // Set stroke style
                mapCtx.strokeStyle = '#000000';
                mapCtx.lineWidth = 1.5;
                
                // Set hit testing color
                hitCtx.fillStyle = `rgb(${r},${g},${b})`;
                
                // Draw all paths for this country
                if (country.paths && Array.isArray(country.paths)) {
                    country.paths.forEach(pathData => {
                        const path = new Path2D(pathData);
                        
                        // Draw on the visible map
                        mapCtx.fill(path);
                        mapCtx.stroke(path);
                        
                        // Draw on the hit testing canvas (no stroke needed)
                        hitCtx.fill(path);
                    });
                } else if (country.path) {
                    // Backward compatibility for single path
                    const path = new Path2D(country.path);
                    mapCtx.fill(path);
                    mapCtx.stroke(path);
                    hitCtx.fill(path);
                }
            } catch (e) {
                console.error("Error drawing country:", country.name, e);
            }
        });
        
        // Store the pre-rendered map
        this.preRenderedMap = mapCanvas;
        
        // Calculate initial scale if not already done
        if (this.baseScale === 1.0) {
            const canvasWidth = this.canvas.width / dpr;
            const canvasHeight = this.canvas.height / dpr;
            
            this.baseScale = Math.min(
                canvasWidth / mapCanvas.width,
                canvasHeight / mapCanvas.height
            ) * 0.9; // 90% of available space
            
            // Center the map initially
            this.offsetX = (canvasWidth - mapCanvas.width * this.baseScale) / 2;
            this.offsetY = (canvasHeight - mapCanvas.height * this.baseScale) / 2;
        }
        
        // Redraw the map on the main canvas
        this.redraw();
    }
    
    /**
     * Redraws the pre-rendered map on the main canvas
     */
    redraw() {
        if (!this.preRenderedMap) {
            return;
        }
        
        // Get the device pixel ratio
        const dpr = parseFloat(this.canvas.dataset.dpr || 1);
        
        // Clear canvas
        this.ctx.resetTransform(); // Reset any previous transforms
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.scale(dpr, dpr); // Reapply the DPR scaling
        
        // Get canvas dimensions in CSS pixels
        const canvasWidth = this.canvas.width / dpr;
        const canvasHeight = this.canvas.height / dpr;
        
        // Set pixel-art style background
        this.ctx.fillStyle = '#4a3a7a'; // Dark purple background from CSS
        this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Apply zoom and pan transformations
        this.ctx.translate(this.offsetX, this.offsetY);
        const currentScale = this.baseScale * this.zoomLevel;
        
        // Enable high-quality image scaling
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        
        // Draw the pre-rendered map canvas, scaled and positioned
        this.ctx.drawImage(
            this.preRenderedMap, 
            0, 0, 
            this.preRenderedMap.width * currentScale, 
            this.preRenderedMap.height * currentScale
        );
        
        // Store map position and scale for hit detection
        this.canvas.dataset.mapX = this.offsetX;
        this.canvas.dataset.mapY = this.offsetY;
        this.canvas.dataset.mapScale = currentScale;
        this.canvas.dataset.mapWidth = this.preRenderedMap.width;
        this.canvas.dataset.mapHeight = this.preRenderedMap.height;
    }
    
    /**
     * Flashes a country on the map for visual feedback
     * @param {string} countryName - Name of the country to flash
     * @param {string} type - Type of flash ('start', 'end', 'correct', 'error')
     */
    flashCountry(countryName, type = 'correct') {
        // This would be implemented to work with the controller
        // For a complete implementation, we'd need to:
        // 1. Temporarily change the country's color
        // 2. Redraw the map
        // 3. Set a timeout to revert to the original color
        // 4. Redraw again
    }
    
    /**
     * Shows the loading indicator
     * @param {boolean} show - Whether to show or hide the loading indicator
     */
    showLoading(show = true) {
        const loadingEl = document.getElementById('loadingMessage');
        if (loadingEl) {
            loadingEl.style.display = show ? 'block' : 'none';
        }
    }
}