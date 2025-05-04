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
        
        // Colors
        this.defaultFill = '#55d6c2'; // Default country color
        this.highlightFill = '#ff6b6b'; // Color for highlighted countries
        this.startEndFill = '#55d688'; // Color for start/end countries
        this.hoverFill = '#ffcc66'; // Color for hovered countries
        
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
        
        // Find which country the mouse is over (using the model)
        const hoveredCountry = this._getHoveredCountry(mapCoords.x, mapCoords.y);
        
        // Update tooltip display
        if (hoveredCountry) {
            this.tooltip.style.opacity = 1;
            this.tooltipText.innerText = hoveredCountry.name;
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
     * Gets the country at a given point (hit detection)
     * This is a placeholder - the actual implementation would use the model
     * @param {number} x - X coordinate on the map
     * @param {number} y - Y coordinate on the map
     * @returns {Object|null} - Country object or null if none found
     * @private
     */
    _getHoveredCountry(x, y) {
        // This is a placeholder - in a real implementation, 
        // we would use the controller to get this information from the model
        
        // For now, we'll assume hit detection is handled by the controller
        // and this method would be linked to an external data source
        return null;
    }
    
    /**
     * Handles mouse wheel events for zooming
     * @param {WheelEvent} event - Wheel event
     * @private
     */
    _handleWheelZoom(event) {
        event.preventDefault(); // Prevent page scrolling
        
        const zoomIntensity = 0.1;
        const maxZoom = 10.0;
        const minZoom = 0.5;
        
        // Get mouse position relative to canvas
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        // Determine zoom direction
        const delta = event.deltaY > 0 ? -1 : 1; // -1 for zoom out, 1 for zoom in
        
        // Calculate new zoom level
        const newZoomLevel = Math.max(minZoom, Math.min(maxZoom, this.zoomLevel * (1 + delta * zoomIntensity)));
        
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
     * Renders the map on the canvas
     * @param {Array} countries - Array of country objects
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
        
        // Enable high-quality image scaling
        mapCtx.imageSmoothingEnabled = true;
        mapCtx.imageSmoothingQuality = 'high';
        
        // Draw each country
        countries.forEach(country => {
            try {
                const path = new Path2D(country.path);
                
                // Fill with appropriate color based on country state
                if (country.isStart || country.isEnd) {
                    mapCtx.fillStyle = this.startEndFill;
                } else if (country.selected) {
                    mapCtx.fillStyle = this.highlightFill;
                } else {
                    mapCtx.fillStyle = country.fill || this.defaultFill;
                }
                
                // Apply pixel-art style borders
                mapCtx.strokeStyle = '#000000';
                mapCtx.lineWidth = 1.5;
                
                // Fill and stroke the path
                mapCtx.fill(path);
                mapCtx.stroke(path);
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
        // This would be implemented to work with the model to highlight a country temporarily
        // For now, it's a placeholder for implementation via the controller
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