// ============================================
// FLOOD & LANDSLIDE PREDICTION SYSTEM
// ============================================

// Prevent multiple script loads
if (!window.__floodAppLoaded) {
    window.__floodAppLoaded = true;
    console.log('✓ Loading Flood & Landslide Prediction System');

    // Prevent multiple initializations
    if (!window.AppState) {
        // Global state object - prevents conflicts
        window.AppState = {
            map: null,
            userMarker: null,
            riskCircle: null,
            isInitialized: false,
            lastLocation: null
        };
    }

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the entire application
 * Called once when page loads
 */
function initializeApp() {
    if (window.AppState.isInitialized) {
        console.warn('App already initialized, skipping');
        return;
    }

    console.log('Initializing Flood Prediction App');
    
    try {
        // Initialize map
        initializeMap();
        
        // Setup event listeners
        setupEventListeners();
        
        window.AppState.isInitialized = true;
        console.log('✓ App initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing app:', error);
        showError('Failed to initialize app: ' + error.message);
    }
}

/**
 * Initialize Leaflet map with proper checks
 */
function initializeMap() {
    try {
        // Remove existing map if it exists
        if (window.AppState.map) {
            console.log('Removing existing map instance');
            window.AppState.map.remove();
            window.AppState.map = null;
        }

        // Get map container
        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
            throw new Error('Map container #map not found');
        }

        // Initialize new map
        console.log('Creating new Leaflet map');
        window.AppState.map = L.map('map').setView([20, 77], 5);

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(window.AppState.map);

        // Setup right-click handler
        window.AppState.map.on('contextmenu', handleMapRightClick);

        // Setup left-click handler for alternative location selection
        window.AppState.map.on('click', handleMapLeftClick);

        console.log('✓ Map initialized successfully');
    } catch (error) {
        console.error('❌ Map initialization error:', error);
        throw error;
    }
}

/**
 * Setup event listeners for buttons and inputs
 */
function setupEventListeners() {
    try {
        // Search button
        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', searchPlace);
        }

        // Track location button
        const trackBtn = document.getElementById('trackBtn');
        if (trackBtn) {
            trackBtn.addEventListener('click', getUserLocation);
        }

        // Allow Enter key to trigger search
        const placeName = document.getElementById('placeName');
        if (placeName) {
            placeName.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    searchPlace();
                }
            });
        }
    } catch (error) {
        console.error('❌ Error setting up listeners:', error);
    }
}

// ============================================
// LOCATION SELECTION METHODS
// ============================================

/**
 * Search place by name (typing)
 * User types location name and clicks "Check Place"
 */
async function searchPlace() {
    const placeInput = document.getElementById('placeName');
    const placeName = placeInput ? placeInput.value.trim() : '';

    if (!placeName) {
        alert('❌ Please enter a place name');
        return;
    }

    console.log('Searching for place:', placeName);
    showLoadingState();

    try {
        // Use backend search endpoint
        const response = await fetch(`/api/search-location?q=${encodeURIComponent(placeName)}`);
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        // Read response as text first to detect HTML
        let text = await response.text();
        
        // Check if response is HTML instead of JSON
        if (text.includes('<!DOCTYPE') || text.includes('<html') || text.trim().startsWith('<')) {
            console.error('❌ Backend returned HTML instead of JSON');
            console.error('Response:', text.substring(0, 200));
            throw new Error('Server error: Invalid response');
        }

        // Parse JSON safely
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('❌ JSON parse error:', e);
            console.error('Text:', text);
            throw new Error('Invalid server response');
        }

        if (!data.success) {
            const errorMsg = data.error || 'Location not found';
            alert(`❌ ${errorMsg}\n\nTry:\n- Using full place name\n- Right-clicking the map\n- Using "Track My Location"`);
            hideResultPanel();
            return;
        }

        console.log('✓ Location found:', data);
        updateMapAndPrediction(data.lat, data.lon, data.display_name);
    } catch (error) {
        console.error('❌ Search error:', error);
        
        let errorMsg = 'Error searching location';
        if (error instanceof TypeError) {
            errorMsg = 'Network error. Check your connection';
        } else if (error instanceof SyntaxError) {
            errorMsg = 'Server returned invalid data';
        }
        
        alert(`❌ ${errorMsg}\n\nTry right-clicking the map or using "Track My Location"`);
        hideResultPanel();
    }
}

/**
 * Handle map left-click
 */
function handleMapLeftClick(event) {
    if (event && typeof event.latlng === 'object') {
        let lat = event.latlng.lat;
        let lng = event.latlng.lng;
        
        // Normalize longitude to -180 to 180 range
        while (lng > 180) {
            lng -= 360;
        }
        while (lng < -180) {
            lng += 360;
        }
        
        console.log('Map left-clicked at:', lat, lng);
        
        // Validate coordinates
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            console.error('Invalid coordinates:', lat, lng);
            return;
        }
        
        reverseGeocode(lat, lng).then(placeName => {
            handleLocationSelected(lat, lng, placeName);
        });
    }
}

/**
 * Handle map right-click
 */
function handleMapRightClick(event) {
    if (event && event.originalEvent) {
        event.originalEvent.preventDefault();
    }
    
    if (event && typeof event.latlng === 'object') {
        let lat = event.latlng.lat;
        let lng = event.latlng.lng;
        
        // Normalize longitude to -180 to 180 range
        while (lng > 180) {
            lng -= 360;
        }
        while (lng < -180) {
            lng += 360;
        }
        
        console.log('Map right-clicked at:', lat, lng);
        
        // Validate coordinates
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            console.error('Invalid coordinates:', lat, lng);
            alert('Invalid map coordinates. Please try again.');
            return;
        }
        
        showLoadingState();

        reverseGeocode(lat, lng).then(placeName => {
            handleLocationSelected(lat, lng, placeName);
        });
    }
}

/**
 * Get user's geolocation
 */
function getUserLocation() {
    if (!navigator.geolocation) {
        alert('❌ Geolocation not supported by your browser');
        return;
    }

    console.log('Requesting user geolocation');
    showLoadingState();

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            const accuracy = position.coords.accuracy;

            console.log(`✓ Location received: ${lat}, ${lon} (±${Math.round(accuracy)}m)`);
            
            reverseGeocode(lat, lon).then(placeName => {
                handleLocationSelected(lat, lon, `${placeName} (GPS)`);
            });
        },
        (error) => {
            console.error('❌ Geolocation error:', error);
            alert(`❌ Could not get location: ${error.message}`);
            hideResultPanel();
        }
    );
}

/**
 * Reverse geocode coordinates to place name
 */
async function reverseGeocode(lat, lon) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
        const data = await response.json();

        const place = 
            data.address?.city || 
            data.address?.town || 
            data.address?.village || 
            data.address?.county || 
            data.address?.district ||
            data.address?.state || 
            'Selected Location';

        return place;
    } catch (error) {
        console.error('❌ Reverse geocoding error:', error);
        return 'Selected Location';
    }
}

/**
 * Handle location selection from any source
 */
function handleLocationSelected(lat, lon, placeName) {
    console.log(`Location selected: ${placeName} (${lat}, ${lon})`);

    // Update input field
    const placeInput = document.getElementById('placeName');
    if (placeInput) {
        placeInput.value = placeName;
    }

    // Update map and get prediction
    updateMapAndPrediction(lat, lon, placeName);
}

/**
 * Update map view and fetch prediction
 */
function updateMapAndPrediction(lat, lon, placeName) {
    try {
        // Validate and normalize coordinates
        lat = parseFloat(lat);
        lon = parseFloat(lon);
        
        // Wrap longitude to -180 to 180
        while (lon > 180) {
            lon -= 360;
        }
        while (lon < -180) {
            lon += 360;
        }
        
        if (isNaN(lat) || isNaN(lon)) {
            throw new Error('Invalid coordinates - NaN values');
        }
        
        if (lat < -90 || lat > 90) {
            throw new Error(`Invalid latitude: ${lat}`);
        }
        
        if (lon < -180 || lon > 180) {
            throw new Error(`Invalid longitude: ${lon}`);
        }
        
        if (!window.AppState.map) {
            throw new Error('Map not initialized');
        }

        console.log('Updating map to:', lat, lon);

        // Move map to location
        window.AppState.map.setView([lat, lon], 12);

        // Remove old marker
        if (window.AppState.userMarker) {
            window.AppState.map.removeLayer(window.AppState.userMarker);
            window.AppState.userMarker = null;
        }

        // Add new marker
        window.AppState.userMarker = L.marker([lat, lon])
            .bindPopup(`<b>${placeName}</b><br>Lat: ${lat.toFixed(4)}<br>Lon: ${lon.toFixed(4)}`)
            .addTo(window.AppState.map)
            .openPopup();

        console.log('✓ Marker placed');

        // Store location
        window.AppState.lastLocation = { lat, lon, name: placeName };

        // Fetch prediction
        fetchPrediction(lat, lon, placeName);
    } catch (error) {
        console.error('❌ Error updating map:', error);
        showError('Failed to update map: ' + error.message);
    }
}

// ============================================
// PREDICTION API
// ============================================

/**
 * Fetch prediction from backend
 */
async function fetchPrediction(lat, lon, locationName) {
    try {
        // Validate coordinates
        lat = parseFloat(lat);
        lon = parseFloat(lon);
        
        if (isNaN(lat) || isNaN(lon)) {
            throw new Error('Invalid coordinates - NaN values');
        }
        
        if (lat < -90 || lat > 90) {
            throw new Error(`Invalid latitude: ${lat}. Must be between -90 and 90`);
        }
        
        if (lon < -180 || lon > 180) {
            throw new Error(`Invalid longitude: ${lon}. Must be between -180 and 180`);
        }
        
        console.log('Fetching prediction for:', locationName, `(${lat}, ${lon})`);

        const response = await fetch('/api/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                lat: lat,
                lon: lon,
                location_name: locationName
            })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        // Parse response carefully and detect HTML
        let text = await response.text();
        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
            console.error('❌ Backend returned HTML instead of JSON');
            throw new Error('Server error: Invalid response format');
        }

        let data;
        try {
            data = JSON.parse(text);
        } catch (parseError) {
            console.error('❌ JSON parsing error:', parseError);
            console.error('Response text:', text);
            throw new Error('Server returned invalid JSON');
        }

        console.log('✓ Prediction received:', data);
        displayResults(locationName, lat, lon, data);
    } catch (error) {
        console.error('❌ Prediction error:', error);
        showError('Failed to fetch prediction: ' + error.message);
    }
}

// ============================================
// RESULT DISPLAY
// ============================================

/**
 * Display prediction results
 */
function displayResults(location, lat, lon, data) {
    try {
        console.log('Displaying results for:', location);

        // Show result panel
        const panel = document.getElementById('resultPanel');
        if (panel) {
            panel.classList.remove('hidden');
        }

        // Set title back to "Prediction Results"
        const title = panel?.querySelector('.result-content h2');
        if (title) title.textContent = 'Prediction Results';

        // Update location
        const locationEl = document.getElementById('resultLocation');
        if (locationEl) locationEl.textContent = location;

        // Update flood risk
        const floodEl = document.getElementById('resultFloodRisk');
        if (floodEl) floodEl.textContent = data.risk || '-';

        // Update rainfall
        const rainfallEl = document.getElementById('resultRainfall');
        if (rainfallEl) rainfallEl.textContent = (data.rainfall || 0) + ' cm';

        // Update rainfall status
        const statusEl = document.getElementById('resultRainfallStatus');
        if (statusEl) statusEl.textContent = data.rainfall_category || 'Unknown';

        // Update landslide risk
        const landslideEl = document.getElementById('resultLandslide');
        if (landslideEl) landslideEl.textContent = data.landslide || 'Nil';

        // Update temperature
        const tempEl = document.getElementById('resultTemp');
        if (tempEl) tempEl.textContent = (data.temperature || 0) + '°C';

        // Update humidity
        const humidityEl = document.getElementById('resultHumidity');
        if (humidityEl) humidityEl.textContent = (data.humidity || 0) + '%';

        // Update recommendation
        const recEl = document.getElementById('recommendationText');
        if (recEl) recEl.textContent = data.recommendation || 'N/A';

        console.log('✓ Results displayed successfully');
    } catch (error) {
        console.error('❌ Error displaying results:', error);
        showError('Failed to display results');
    }
}

// ============================================
// UI HELPER FUNCTIONS
// ============================================

/**
 * Show loading state
 */
function showLoadingState() {
    const panel = document.getElementById('resultPanel');
    if (panel) {
        panel.classList.remove('hidden');
        const content = panel.querySelector('.result-content h2');
        if (content) {
            content.textContent = 'Loading...';
        }
    }
}

/**
 * Hide result panel
 */
function hideResultPanel() {
    const panel = document.getElementById('resultPanel');
    if (panel) {
        panel.classList.add('hidden');
    }
}

/**
 * Show error message
 */
function showError(message) {
    const panel = document.getElementById('resultPanel');
    if (panel) {
        panel.classList.remove('hidden');
    }
    
    // Show alert with error
    alert('❌ ' + message);
}

// ============================================
// AUTO-INITIALIZATION
// ============================================

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        initializeApp();
    }

    console.log('✓ Script loaded successfully');
} // Close the if (!window.__floodAppLoaded) block
