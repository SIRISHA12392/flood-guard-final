import React, { useState, useEffect } from 'react'
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

  // Initialize map on component mount
  useEffect(() => {
    loadLeaflet()
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
        console.log('Leaflet loaded')
      }
      document.head.appendChild(leafletScript)
    }
  }

  // Get user's current location
  const handleGetLocation = () => {
    if (navigator.geolocation) {
      setLoading(true)
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          setLatitude(latitude)
          setLongitude(longitude)

          // Get location name
          try {
            const response = await axios.get(`${API_BASE_URL}/api/reverse-geocode`, {
              params: { lat: latitude, lon: longitude },
            })
            setLocationName(response.data.place || 'Current Location')
            Toast.success('📍 Location detected! Click "Check Place" to predict')
            setLoading(false)
          } catch (error) {
            setLocationName('Current Location')
            Toast.info('Location retrieved (name unavailable)')
            setLoading(false)
          }
        },
        (error) => {
          setLoading(false)
          Toast.error('❌ Unable to access your location. Please enable location services.')
        }
      )
    } else {
      Toast.error('❌ Geolocation is not supported by your browser.')
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
        setLatitude(response.data.lat)
        setLongitude(response.data.lon)
        setLocationName(response.data.display_name)
        Toast.success(`📍 Found: ${response.data.display_name}`)
        setSearching(false)
      } else {
        Toast.error('❌ Location not found. Please try another place.')
        setSearching(false)
      }
    } catch (error) {
      Toast.error('❌ Error searching location. Please try again.')
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

      // Show toast based on risk level
      if (data.risk === 'High') {
        Toast.error('🚨 HIGH RISK DETECTED! Take precautions immediately.')
      } else if (data.risk === 'Medium') {
        Toast.warning('⚠️ Moderate risk detected. Stay alert.')
      } else {
        Toast.success('✅ Low risk area. Safe to visit.')
      }

      setLoading(false)

      // Navigate to results after 1 second
      setTimeout(() => {
        navigate('/results', { state: { prediction: data, location: locationName, lat: latitude, lon: longitude } })
      }, 1500)
    } catch (error) {
      setLoading(false)
      Toast.error('❌ Error getting prediction. Please try again.')
      console.error('Prediction error:', error)
    }
  }

  const handleLogoutClick = () => {
    onLogout()
    navigate('/login')
    Toast.info('👋 Logged out successfully')
  }

  return (
    <div className="home-container">
      {/* Header Navigation */}
      <header className="sticky top-0 z-50 bg-surface shadow-md">
        <nav className="flex justify-between items-center w-full px-6 py-4 max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-black bg-gradient-to-r from-primary to-primary-fixed bg-clip-text text-transparent">
              FloodGuard India
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {user && <span className="text-on-surface-variant">👤 {user.username}</span>}
            <button
              onClick={handleLogoutClick}
              className="bg-error text-white px-4 py-2 rounded-md font-bold text-sm hover:bg-error-dim transition"
            >
              Logout
            </button>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-screen-2xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <section className="mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-8">
              <h1 className="text-5xl font-bold text-on-surface leading-tight">
                Your Intelligence Against <span className="text-primary">Environmental Risk</span>
              </h1>
              <p className="text-xl text-on-surface-variant max-w-2xl">
                Assess real-time flood and landslide threats across India with high-precision ML predictions and live weather data.
              </p>

              {/* Location Input Section */}
              <div className="space-y-4">
                <div className="bg-surface-container-low p-2 rounded-2xl flex flex-col md:flex-row gap-2">
                  <div className="flex-grow flex items-center px-4 gap-3 bg-surface-container-lowest rounded-xl border-b-2 border-outline-variant/30 focus-within:border-primary transition-all">
                    <span>📍</span>
                    <input
                      type="text"
                      placeholder="Enter a location (city/district)"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearchLocation()}
                      className="w-full py-4 bg-transparent border-none focus:outline-none text-lg placeholder:text-outline/60"
                      disabled={searching || loading}
                    />
                  </div>
                  <button
                    onClick={handleSearchLocation}
                    disabled={searching || loading}
                    className="bg-gradient-to-br from-primary to-primary-container text-white px-8 py-4 rounded-xl font-bold hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {searching ? 'Searching...' : 'Search'}
                  </button>
                </div>

                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={handleGetLocation}
                    disabled={loading || searching}
                    className="flex items-center gap-3 bg-primary-container text-on-primary-container px-6 py-4 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <span>📍</span>
                    {loading ? 'Detecting...' : 'My Location'}
                  </button>
                </div>
              </div>

              {/* Selected Location Display */}
              {latitude !== null && longitude !== null && (
                <div className="bg-primary-container p-6 rounded-xl">
                  <p className="text-on-primary-container font-bold">
                    📍 Selected: <span className="text-lg">{locationName}</span>
                  </p>
                  <p className="text-on-primary-container/80 text-sm mt-2">
                    Coordinates: {latitude.toFixed(4)}°N, {longitude.toFixed(4)}°E
                  </p>
                  <button
                    onClick={handlePrediction}
                    disabled={loading}
                    className="mt-4 w-full bg-on-primary-container text-primary-container px-6 py-3 rounded-lg font-bold hover:brightness-90 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {loading ? '⏳ Predicting...' : '🔮 Get Prediction'}
                  </button>
                </div>
              )}
            </div>

            {/* Map Preview */}
            <div className="lg:col-span-5">
              <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDtcz3RizqxXdllongXEgUA36QZAU7Y9h5ac2dk0VRGTndUKcx0aVY8ZPajsIoK4UTO8epbBT8nH3OLxjtkgkLNmpZ-khYRw3NOIm8na4e4mMQLQTFo-ezmQHbcOYRiT523e8_-tD-wsjw-PmzmDRBvOEVgQmF08p0h1RhsRITPsTppxz0Qecn7puNnGC8YD6JOnzz-dxtEoULUBTbWArpyDOeWOPE1whCi0m0LXrgzYBUqfjts6MpPSPJluoVPYi6VitPBkA-RKOs"
                  alt="India Map"
                  className="w-full h-96 object-cover opacity-90"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Assessment Cards */}
        <section className="space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-on-surface">Flood & Landslide Assessment</h2>
            <p className="text-on-surface-variant">Understand the risks in your area</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Flood Risk Card */}
            <div className="bg-primary-container p-8 rounded-2xl flex flex-col justify-between min-h-[300px] shadow-lg">
              <div className="space-y-4">
                <div className="text-4xl">💧</div>
                <h3 className="text-2xl font-bold text-on-primary-container">Hydrological Stability</h3>
                <p className="text-on-primary-container/80">Real-time water level monitoring and flood prediction powered by weather APIs.</p>
              </div>
            </div>

            {/* Landslide Risk Card */}
            <div className="bg-secondary-container p-8 rounded-2xl flex flex-col justify-between min-h-[300px] shadow-lg">
              <div className="space-y-4">
                <div className="text-4xl">🏔️</div>
                <h3 className="text-2xl font-bold text-on-secondary-container">Terrain Integrity</h3>
                <p className="text-on-secondary-container/80">Geological stress detection and landslide risk analysis for high-slope areas.</p>
              </div>
            </div>

            {/* Safety Card */}
            <div className="bg-tertiary-container p-8 rounded-2xl flex flex-col justify-between min-h-[300px] shadow-lg">
              <div className="space-y-4">
                <div className="text-4xl">🛡️</div>
                <h3 className="text-2xl font-bold text-on-tertiary-container">Safe Zones</h3>
                <p className="text-on-tertiary-container/80">Evacuation routes and emergency shelter information for your protection.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Loading Overlay */}
      {loading && <Loading fullScreen message="Processing prediction..." />}
    </div>
  )
}

export default Home
