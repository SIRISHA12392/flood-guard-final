import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import Loading from '../components/Loading'
import Toast from '../utils/toast'
import { useNavigate } from 'react-router-dom'
import './Home.css'

function Home({ user, onLogout }) {
  const navigate = useNavigate()
  const API_BASE_URL = window.__API_BASE_URL__ || 'http://localhost:5000'

  const [locationInput, setLocationInput] = useState('')
  const [latitude, setLatitude] = useState(null)
  const [longitude, setLongitude] = useState(null)
  const [locationName, setLocationName] = useState('')
  const [predictionData, setPredictionData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [map, setMap] = useState(null)
  const [marker, setMarker] = useState(null)
  const [isTracking, setIsTracking] = useState(false)
  const trackingIntervalRef = useRef(null)

  // Initialize Leaflet Map
  useEffect(() => {
    loadLeaflet()
  }, [])

  // Ask for notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission()
    }
  }, [])

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current)
      }
    }
  }, [])

  const loadLeaflet = () => {
    // Load Leaflet CSS
    if (!document.querySelector('link[href*="leaflet.css"]')) {
      const leafletCSS = document.createElement('link')
      leafletCSS.rel = 'stylesheet'
      leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(leafletCSS)
    }

    // Load Leaflet JS
    if (!window.L) {
      const leafletScript = document.createElement('script')
      leafletScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      leafletScript.async = true
      leafletScript.onload = () => {
        initializeMap()
      }
      document.head.appendChild(leafletScript)
    } else {
      initializeMap()
    }
  }

  const initializeMap = () => {
    const mapElement = document.getElementById('map')
    if (!mapElement || window.mapInitialized) return

    window.mapInitialized = true

    // Initialize map centered on India
    const mapInstance = window.L.map('map').setView([20.5937, 78.9629], 5)

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapInstance)

    setMap(mapInstance)

    // Add click handler for map
    mapInstance.on('click', (e) => {
      handleMapClick(e.latlng.lat, e.latlng.lng)
    })
  }

  const handleMapClick = async (lat, lon) => {
    setLatitude(lat)
    setLongitude(lon)

    // Remove old marker
    if (marker) {
      map.removeLayer(marker)
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/track-location`, {
        user_id: user ? user.username : 'anonymous',
        latitude: lat,
        longitude: lon
      })
      
      const data = response.data
      const locName = data.location_name || 'Selected Location'
      setLocationName(locName)
      
      // Determine marker color
      let markerColor = 'green'
      if (data.risk_level === 'High') markerColor = 'red'
      else if (data.risk_level === 'Medium' || data.risk_level === 'Moderate') markerColor = 'yellow'

      const customIcon = window.L.icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${markerColor}.png`,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      })

      const newMarker = window.L.marker([lat, lon], { icon: customIcon }).addTo(map)
      setMarker(newMarker)
      map.setView([lat, lon], 15) // high zoom

      newMarker.bindPopup(`
        <div style="font-family: sans-serif; min-width: 150px;">
          <strong style="display:block; margin-bottom: 4px;">Location: ${locName}</strong>
          Risk Status: ${data.risk_status}<br/>
          Risk Level: <b style="color: ${markerColor === 'yellow' ? '#d9a400' : markerColor};">${data.risk_level}</b>
        </div>
      `).openPopup()

      // Save for View Map page
      localStorage.setItem('latest_tracking_data', JSON.stringify({
         lat, lon, 
         location_name: locName, 
         risk_status: data.risk_status, 
         risk_level: data.risk_level,
         markerColor
      }))

      Toast.success(`📍 Location tracked: ${locName}`)
    } catch (error) {
      const newMarker = window.L.marker([lat, lon]).addTo(map)
      setMarker(newMarker)
      map.setView([lat, lon], 15)
      newMarker.bindPopup(`📍 Selected Location`).openPopup()
      setLocationName('Selected Location')
      Toast.info('Location captured (Offline mode)')
    }
  }

  // Get user's current location
  const handleGetLocation = () => {
    if (navigator.geolocation) {
      setLoading(true)
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          handleMapClick(latitude, longitude)
          setLoading(false)
        },
        (error) => {
          setLoading(false)
          Toast.error('❌ Unable to access your location')
        }
      )
    } else {
      Toast.error('❌ Geolocation not supported')
    }
  }

  const showBrowserNotification = (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body })
    }
  }

  const sendTrackingData = async (lat, lon) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/track-location`, {
        user_id: user ? user.username : 'anonymous',
        latitude: lat,
        longitude: lon
      })
      if (response.data.status === 'success') {
        if (response.data.alert) {
          Toast.error(`🚨 HIGH RISK! ${response.data.message}`, { autoClose: false })
          showBrowserNotification("🚨 FLOOD/LANDSLIDE ALERT", response.data.message)
        } else {
          console.log('Location safely tracked: ' + response.data.message)
        }
      }
    } catch (error) {
      console.error('Error tracking location', error)
    }
  }

  const toggleLiveTracking = () => {
    if (isTracking) {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current)
        trackingIntervalRef.current = null
      }
      setIsTracking(false)
      Toast.info('🛑 Live Tracking Stopped')
    } else {
      if (!navigator.geolocation) {
        Toast.error('❌ Geolocation not supported')
        return
      }
      setIsTracking(true)
      Toast.success('🟢 Live Tracking Started')
      
      const captureAndSend = () => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude: lat, longitude: lon } = position.coords
            sendTrackingData(lat, lon)
            handleMapClick(lat, lon) // Update the map visualization
          },
          (error) => {
            console.error('Live tracking error:', error)
          }
        )
      }

      // Execute immediately
      captureAndSend()
      // Then set interval for 5 minutes (300000 ms)
      trackingIntervalRef.current = setInterval(captureAndSend, 300000)
    }
  }

  // Search for location by name
  const handleSearchLocation = async () => {
    if (!locationInput.trim()) {
      Toast.warning('⚠️ Please enter a location name')
      return
    }

    setSearching(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/api/search-location`, {
        params: { q: locationInput.trim() },
      })

      if (response.data.success) {
        const lat = response.data.lat
        const lon = response.data.lon
        handleMapClick(lat, lon)
        setSearching(false)
      } else {
        Toast.error('❌ Location not found')
        setSearching(false)
      }
    } catch (error) {
      Toast.error('❌ Error searching location')
      setSearching(false)
    }
  }

  // Get prediction for location
  const handlePrediction = async () => {
    if (latitude === null || longitude === null) {
      Toast.warning('⚠️ Please select a location first')
      return
    }

    setLoading(true)
    try {
      const response = await axios.post(`${API_BASE_URL}/api/predict`, {
        lat: latitude,
        lon: longitude,
        location_name: locationName,
      })

      const data = response.data
      setPredictionData(data)

      // Show results in panel and toast
      displayPredictionResults(data)

      // Show toast based on risk
      if (data.risk === 'High') {
        Toast.error('🚨 HIGH RISK!')
      } else if (data.risk === 'Medium') {
        Toast.warning('⚠️ Moderate risk')
      } else {
        Toast.success('✅ Low risk')
      }

      setLoading(false)
    } catch (error) {
      setLoading(false)
      Toast.error('❌ Error getting prediction')
      console.error('Prediction error:', error)
    }
  }

  const displayPredictionResults = (data) => {
    const resultPanel = document.getElementById('resultPanel')
    if (!resultPanel) return

    // Update result values
    document.getElementById('resultLocation').textContent = locationName
    document.getElementById('resultFloodRisk').textContent = data.risk || 'N/A'
    document.getElementById('resultRainfall').textContent = data.rainfall + ' cm'
    document.getElementById('resultRainfallStatus').textContent = data.rainfall_category || 'N/A'
    document.getElementById('resultLandslide').textContent = data.landslide || 'N/A'
    document.getElementById('resultTemp').textContent = data.temperature + '°C'
    document.getElementById('resultHumidity').textContent = data.humidity + '%'
    document.getElementById('recommendationText').textContent = data.recommendation || 'N/A'

    // Show panel
    resultPanel.classList.remove('hidden')

    // Scroll to results
    setTimeout(() => {
      resultPanel.scrollIntoView({ behavior: 'smooth' })
    }, 200)
  }

  const handleLogoutClick = () => {
    onLogout()
    navigate('/login')
    Toast.info('👋 Logged out')
  }

  return (
    <div className="home-container">
      {/* Header */}
      <header className="home-header">
        <div className="header-left">
          <h1>🌊 Flood & Landslide Risk Prediction System</h1>
          <p>Get real-time risk alerts based on your location</p>
        </div>
        <div className="header-right">
          {user && (
            <div className="user-info">
              <span className="user-greeting">👤 {user.username}</span>
              <button className="btn-logout" onClick={handleLogoutClick}>
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="app-wrapper">
        {/* Controls */}
        <div className="controls">
          <div className="input-section">
            <input
              type="text"
              id="placeName"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchLocation()}
              placeholder="Enter place name (e.g., Madhanur, Munnar, Delhi)"
              disabled={searching || loading}
            />
            <button
              onClick={handleSearchLocation}
              className="btn-primary"
              disabled={searching || loading}
            >
              {searching ? '🔍 Searching...' : 'Check Place'}
            </button>
          </div>

          <div className="button-section">
            <button
              onClick={handleGetLocation}
              className="btn-info"
              disabled={loading || searching}
            >
              {loading ? '📍 Detecting...' : '📍 Get Current Location'}
            </button>
            <button
              onClick={toggleLiveTracking}
              className={`btn-info ${isTracking ? 'btn-danger' : ''}`}
              style={isTracking ? { backgroundColor: '#dc3545', marginLeft: '10px' } : { marginLeft: '10px' }}
            >
              {isTracking ? '🛑 Stop Live Tracking' : '🟢 Start Live Tracking (5 mins)'}
            </button>
            <button
              onClick={() => navigate('/map', { state: { lat: latitude, lon: longitude } })}
              className="btn-info"
              style={{ marginLeft: '10px', backgroundColor: '#00666c', color: 'white' }}
            >
              🗺️ View Map
            </button>
            <p className="hint">💡 Tip: Click on map to select location or Search above</p>
          </div>
        </div>

        {/* Map Container */}
        <div
          id="map"
          style={{
            width: '100%',
            height: '500px',
            borderRadius: '8px',
            marginBottom: '20px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          }}
        ></div>

        {/* Selected Location Info */}
        {latitude !== null && longitude !== null && (
          <div className="location-info">
            <div className="info-item">
              <strong>📍 Location:</strong> {locationName}
            </div>
            <div className="info-item">
              <strong>📊 Coordinates:</strong> {latitude.toFixed(4)}°N, {longitude.toFixed(4)}°E
            </div>
            <button
              onClick={handlePrediction}
              className="btn-predict"
              disabled={loading}
            >
              {loading ? '⏳ Predicting...' : '🔮 Get Prediction'}
            </button>
          </div>
        )}

        {/* Results Panel */}
        <div id="resultPanel" className="result-panel hidden">
          <div className="result-content">
            <h2>📊 Prediction Results</h2>
            <div className="result-grid">
              <div className="result-item">
                <span className="label">Location:</span>
                <span id="resultLocation" className="value">
                  -
                </span>
              </div>
              <div className="result-item">
                <span className="label">Flood Risk:</span>
                <span id="resultFloodRisk" className="value">
                  -
                </span>
              </div>
              <div className="result-item">
                <span className="label">Rainfall:</span>
                <span id="resultRainfall" className="value">
                  -
                </span>
              </div>
              <div className="result-item">
                <span className="label">Rainfall Status:</span>
                <span id="resultRainfallStatus" className="value">
                  -
                </span>
              </div>
              <div className="result-item">
                <span className="label">Landslide Risk:</span>
                <span id="resultLandslide" className="value">
                  -
                </span>
              </div>
              <div className="result-item">
                <span className="label">Temperature:</span>
                <span id="resultTemp" className="value">
                  -
                </span>
              </div>
              <div className="result-item">
                <span className="label">Humidity:</span>
                <span id="resultHumidity" className="value">
                  -
                </span>
              </div>
            </div>
            <div id="recommendation" className="recommendation">
              <strong>💡 Recommendation:</strong> <span id="recommendationText">-</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer>
          <p>
            Data powered by OpenWeatherMap & OpenStreetMap | ⚠️ Stay Safe & Alert!
          </p>
        </footer>
      </div>

      {/* Loading Overlay */}
      {loading && <Loading fullScreen message="Processing..." />}
    </div>
  )
}

export default Home
