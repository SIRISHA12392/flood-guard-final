import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import NavBar from '../components/NavBar'
import ProfileMenu from '../components/ProfileMenu'
import './Home.css'

// ── helpers ───────────────────────────────────────────────────────────────────
/**
 * Returns a debounced version of `fn` that only fires after `delay` ms of silence.
 * Used to throttle rapid GPS state updates so React doesn't re-render every fix.
 */
function debounce(fn, delay) {
  let timer = null
  const debounced = (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
  debounced.cancel = () => clearTimeout(timer)
  return debounced
}

function Home({ user, onLogout }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const API_BASE_URL = window.__API_BASE_URL__ || 'http://localhost:5000'

  const [locationInput, setLocationInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [predictionData, setPredictionData] = useState(null)
  const [locationName, setLocationName] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [activeMonitoring, setActiveMonitoring] = useState({ name: 'Mumbai Metropolitan', status: 'Stable' })
  const [hasUnreadAlerts, setHasUnreadAlerts] = useState(false)
  const [assessmentTab, setAssessmentTab] = useState('all') // 'all' | 'live'
  // ── Settings / Theme state ───────────────────────────────────────────────
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [currentTheme, setCurrentTheme] = useState(localStorage.getItem('theme') || 'light')

  const toggleTheme = (newTheme) => {
    setCurrentTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    if (newTheme === 'dark') {
      document.body.classList.add('dark', 'dark-mode')
      document.documentElement.classList.add('dark')
    } else {
      document.body.classList.remove('dark', 'dark-mode')
      document.documentElement.classList.remove('dark')
    }
    setShowSettingsMenu(false)
  }  // ── Emergency modal state ────────────────────────────────────────────────
  const [showEmergencyModal, setShowEmergencyModal] = useState(false)
  const [nearbyPlaces, setNearbyPlaces]     = useState([])   // [{name, type, lat, lon, phone, dist}]
  const [nearbyLoading, setNearbyLoading]   = useState(false)
  const [nearbyError, setNearbyError]       = useState(null)
  
  // Derive registered SOS phone from stored user object
  const sosPhone = React.useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}')
      return u.phone ? '+' + u.phone : 'Not Registered'
    } catch { return 'Not Registered' }
  }, [])




  // Continuous-tracking state
  const [isTracking, setIsTracking] = useState(localStorage.getItem('manual_tracking') === 'true')
  const [trackingToast, setTrackingToast] = useState(null)   // { message, type: 'safe'|'danger' }
  const [gpsError, setGpsError] = useState(null)             // GPS / permission error string
  const lastCoordsRef   = useRef(null)
  // Debounce ref — prevents rapid GPS events from flooding React state updates
  const uiDebounceRef = useRef(null)
  // Stable ref so closures in window.__handleBackgroundLocation always call
  // the LATEST version of pingTrackingBackend without stale capture issues
  const pingTrackingBackendRef = useRef(null)

  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  // Single persistent marker — we MOVE it instead of destroying + recreating it
  // Recreating a Leaflet marker on every GPS tick causes mouse-hover lag/flicker
  const markerRef = useRef(null)

  // Initialize Leaflet map
  useEffect(() => {
    const initMap = () => {
      if (!window.L) return

      const mapContainer = document.getElementById('dashboardMap')
      if (!mapContainer || mapInstanceRef.current) return

      mapInstanceRef.current = window.L.map('dashboardMap').setView([20, 77], 5)

      window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19
      }).addTo(mapInstanceRef.current)

      // Right-click handler
      mapInstanceRef.current.on('contextmenu', (e) => {
        if (e.originalEvent) e.originalEvent.preventDefault()
        handleMapClick(e.latlng.lat, e.latlng.lng)
      })

      // Left-click handler
      mapInstanceRef.current.on('click', (e) => {
        handleMapClick(e.latlng.lat, e.latlng.lng)
      })

      setMapReady(true)
    }

    // Load Leaflet JS if not loaded
    if (!window.L) {
      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.async = true
      script.onload = () => setTimeout(initMap, 100)
      document.head.appendChild(script)
    } else {
      setTimeout(initMap, 100)
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // ── Emergency helpers ────────────────────────────────────────────────────

  /**
   * Haversine distance in km between two lat/lon pairs.
   * Used to sort Overpass results by proximity.
   */
  const haversineKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  /**
   * Fetch up to 3 nearest hospitals AND 3 nearest police stations
   * within 10 km using the free Overpass API (no key needed).
   * Falls back to static national helplines if the API fails.
   */
  const fetchNearbyEmergencyPlaces = async (lat, lon) => {
    setNearbyLoading(true)
    setNearbyError(null)
    setNearbyPlaces([])

    const radius = 10000  // 10 km in metres
    const query = `
      [out:json][timeout:15];
      (
        node["amenity"="hospital"](around:${radius},${lat},${lon});
        way["amenity"="hospital"](around:${radius},${lat},${lon});
        node["amenity"="police"](around:${radius},${lat},${lon});
        way["amenity"="police"](around:${radius},${lat},${lon});
      );
      out center 20;
    `

    const endpoints = [
      'https://overpass-api.de/api/interpreter',
      'https://lz4.overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter'
    ];

    let data = null;
    let success = false;

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          body: query,
          signal: AbortSignal.timeout(15000)
        });
        if (res.ok) {
          data = await res.json();
          success = true;
          break;
        }
      } catch (err) {
        console.warn(`Overpass fetch failed for ${url}:`, err.message);
      }
    }

    try {
      if (!success) {
        throw new Error('All Overpass API endpoints failed');
      }

      const elements = data.elements || []

      const places = elements
        .map((el) => {
          const elLat = el.lat ?? el.center?.lat
          const elLon = el.lon ?? el.center?.lon
          if (!elLat || !elLon) return null
          return {
            id:    el.id,
            name:  el.tags?.name || (el.tags?.amenity === 'hospital' ? 'Hospital' : 'Police Station'),
            type:  el.tags?.amenity,   // 'hospital' | 'police'
            lat:   elLat,
            lon:   elLon,
            phone: el.tags?.['contact:phone'] || el.tags?.phone || null,
            dist:  haversineKm(lat, lon, elLat, elLon),
          }
        })
        .filter(Boolean)

      // Sort by distance, then take top 3 of each type
      const hospitals = places
        .filter(p => p.type === 'hospital')
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 3)
      const police = places
        .filter(p => p.type === 'police')
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 3)

      setNearbyPlaces([...hospitals, ...police])

      if (hospitals.length === 0 && police.length === 0) {
        setNearbyError('No results found within 10 km. Try from a more populated area.')
      }
    } catch (err) {
      console.warn('Overpass fetch failed:', err.message)
      setNearbyError('Could not reach the location service. Check your internet connection.')
    } finally {
      setNearbyLoading(false)
    }
  }

  /**
   * Helper function to format the text and open the WhatsApp URL
   * @param {string|null} contactNumber
   * @param {number|null} lat
   * @param {number|null} lng
   */
  const triggerWhatsAppUrl = (contactNumber, lat, lng) => {
    let mapLink = 'Location not available'
    if (lat && lng) {
      mapLink = `https://maps.google.com/?q=${lat},${lng}`
    }
    const msg = encodeURIComponent(
      `🚨 SOS EMERGENCY ALERT 🚨\n` +
      `I am in an emergency situation!\n` +
      `📍 My current location: ${mapLink}\n` +
      `Sent from Flood Guard — please call or help immediately.`
    )
    const waUrl = contactNumber
      ? `https://wa.me/${contactNumber}?text=${msg}`
      : `https://wa.me/?text=${msg}`
    window.open(waUrl, '_blank', 'noopener,noreferrer')
  }

  /** Gets location accurately, then triggers WA for a single contact (used for the empty state) */
  const openSosWhatsApp = async (contactNumber) => {
    if (window.__lastBackgroundCoords) {
      triggerWhatsAppUrl(contactNumber, window.__lastBackgroundCoords.latitude, window.__lastBackgroundCoords.longitude)
      return
    }
    
    // Fallback if background tracker hasn't fired yet
    try {
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true }))
      triggerWhatsAppUrl(contactNumber, pos.coords.latitude, pos.coords.longitude)
    } catch (e) {
      console.warn("SOS location fetch failed:", e)
      triggerWhatsAppUrl(contactNumber, null, null)
    }
  }

  /** Gets location once, then sends to the registered SOS phone number */
  const sendSosToAll = async () => {
    const userStr = localStorage.getItem('user');
    let phoneNum = null;
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        phoneNum = u.phone;
      } catch(e) {}
    }
    
    if (!phoneNum) {
      alert("No emergency phone number found. Please register an SOS number.");
      openSosWhatsApp(null);
      return;
    }
    
    let lat = null
    let lng = null

    // Get live coordinates dynamically first
    if (window.__lastBackgroundCoords) {
      lat = window.__lastBackgroundCoords.latitude
      lng = window.__lastBackgroundCoords.longitude
    } else {
      try {
        const pos = await new Promise((res, rej) => {
          navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 5000 })
        })
        lat = pos.coords.latitude
        lng = pos.coords.longitude
      } catch (err) {
        console.warn("SOS location fetch failed:", err)
      }
    }
    
    triggerWhatsAppUrl(phoneNum, lat, lng);
  }



  /** Open the emergency modal and begin fetching nearby places */
  const openEmergencyModal = () => {
    setShowEmergencyModal(true)
    const coords = window.__lastBackgroundCoords
    if (coords) {
      fetchNearbyEmergencyPlaces(coords.latitude, coords.longitude)
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchNearbyEmergencyPlaces(pos.coords.latitude, pos.coords.longitude),
        () => setNearbyError('Could not get your location. Enable GPS and try again.')
      )
    } else {
      setNearbyError('Geolocation not supported by your browser.')
    }
  }

  // ── Handle PWA shortcut ?sos=1 deep-link ────────────────────────────────
  useEffect(() => {
    if (searchParams.get('sos') === '1') {
      // Small delay so the map/page initializes first
      setTimeout(() => openEmergencyModal(), 500)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Listen for SOS event from BottomNav ──────────────────────────────────
  useEffect(() => {
    const handler = () => openEmergencyModal()
    window.addEventListener('openEmergencyModal', handler)
    window.openEmergencyModal = openEmergencyModal
    return () => {
      window.removeEventListener('openEmergencyModal', handler)
      delete window.openEmergencyModal
    }
  })

  // Reverse geocode
  const reverseGeocode = async (lat, lon) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/reverse-geocode?lat=${lat}&lon=${lon}`)
      const data = await res.json()
      return data.place || 'Selected Location'
    } catch {
      return 'Selected Location'
    }
  }

  // Handle map click
  const handleMapClick = async (lat, lng) => {
    while (lng > 180) lng -= 360
    while (lng < -180) lng += 360
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90) return

    setLoading(true)
    const placeName = await reverseGeocode(lat, lng)
    setLocationInput(placeName)
    updateMapMarker(lat, lng, placeName)
    await fetchPrediction(lat, lng, placeName)
  }

  // ── Update map marker ─────────────────────────────────────────────────────
  // CRITICAL BUG FIX: We REUSE the existing marker by calling setLatLng().
  // The old pattern removed + recreated the marker on every GPS update which
  // caused Leaflet to re-attach DOM event listeners mid-hover, resulting in
  // mouse lag / flicker / unexpected popup behaviour.
  const updateMapMarker = useCallback((lat, lon, name, color = null) => {
    if (!mapInstanceRef.current || !window.L) return

    mapInstanceRef.current.setView([lat, lon], 12)

    if (markerRef.current) {
      // Move existing marker in-place — no DOM mutation, no event re-binding
      markerRef.current.setLatLng([lat, lon])
      markerRef.current.setPopupContent(
        `<b>${name}</b><br>Lat: ${lat.toFixed(4)}<br>Lon: ${lon.toFixed(4)}`
      )
      // Only update icon if an explicit color is given (avoids unnecessary repaint)
      if (color) {
        const icon = _buildIcon(color)
        markerRef.current.setIcon(icon)
      }
    } else {
      // First use — create the marker once
      markerRef.current = window.L.marker([lat, lon])
        .bindPopup(`<b>${name}</b><br>Lat: ${lat.toFixed(4)}<br>Lon: ${lon.toFixed(4)}`)
        .addTo(mapInstanceRef.current)
        .openPopup()
    }

    setActiveMonitoring(prev =>
      prev.name === name && prev.status === 'Analyzing...'
        ? prev  // avoid spurious re-render when nothing changed
        : { name, status: 'Analyzing...' }
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Build a Leaflet icon object for the given colour name */
  function _buildIcon(color) {
    return window.L.icon({
      iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize:    [25, 41],
      iconAnchor:  [12, 41],
      popupAnchor: [1, -34],
      shadowSize:  [41, 41],
    })
  }

  // ── Fetch prediction from backend (user-initiated only) ──────────────────
  const fetchPrediction = async (lat, lon, locName, silent = false) => {
    if (!silent) setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lon, location_name: locName })
      })

      if (!response.ok) throw new Error(`Server error: ${response.status}`)

      const text = await response.text()
      if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        throw new Error('Server returned HTML instead of JSON')
      }

      const data = JSON.parse(text)
      setPredictionData(data)
      setLocationName(locName)
      setShowResults(true)

      // Derive marker colour and monitoring status from prediction data
      const risk = data.risk || 'Unknown'
      const landslideRisk = data.landslide || 'Nil'
      let status = 'Stable'
      
      const isHighRisk = risk.toLowerCase().includes('high') || risk.toLowerCase().includes('danger') || 
                         landslideRisk.toLowerCase().includes('high') || landslideRisk.toLowerCase().includes('danger');
      const isModerateRisk = risk.toLowerCase().includes('moderate') || risk.toLowerCase().includes('medium') || 
                             landslideRisk.toLowerCase().includes('moderate') || landslideRisk.toLowerCase().includes('medium');

      if (isHighRisk) {
        status = 'High Risk'
        setHasUnreadAlerts(true)
        if (!silent) {
            alert(`🚨 CRITICAL WARNING 🚨\n\nHigh risk detected in ${locName}!\n\nFlood Risk: ${risk}\nLandslide Risk: ${landslideRisk}\n\nPlease monitor notifications immediately.`);
        }
      }
      else if (isModerateRisk) status = 'Moderate'
      else if (risk.toLowerCase().includes('low') || landslideRisk.toLowerCase().includes('low')) status = 'Low Risk'
      
      setActiveMonitoring({ name: locName, status })

      let markerColor = 'green'
      if (status === 'High Risk') markerColor = 'red'
      else if (status === 'Moderate') markerColor = 'yellow'

      // ✅ FIX: reuse existing marker — setIcon() / setPopupContent() only
      if (markerRef.current) {
        markerRef.current.setIcon(_buildIcon(markerColor))
        const isLandslide = data.landslide && data.landslide !== 'Nil'
        markerRef.current.setPopupContent(`
          <div style="font-family: sans-serif; min-width: 150px;">
            <strong style="display:block; margin-bottom: 4px;">Location: ${locName}</strong>
            Risk Status: ${isLandslide ? 'Landslide Risk' : 'Flood Risk'}<br/>
            Risk Level: <b style="color: ${markerColor === 'yellow' ? '#d9a400' : markerColor};">${data.risk}</b>
          </div>
        `)
      }

      localStorage.setItem('latest_tracking_data', JSON.stringify({
         lat, lon,
         location_name: locName,
         risk_status: (data.landslide && data.landslide !== 'Nil') ? 'Landslide Risk' : 'Flood Risk',
         risk_level: data.risk,
         markerColor
      }))
    } catch (error) {
      console.error('Prediction error:', error)
      // Show inline error banner instead of blocking alert()
      setGpsError('❌ Failed to fetch prediction: ' + error.message)
      setTimeout(() => setGpsError(null), 6000)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  // Search place by name
  const searchPlace = async () => {
    if (!locationInput.trim()) {
      alert('❌ Please enter a place name')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/search-location?q=${encodeURIComponent(locationInput.trim())}`)
      if (!response.ok) throw new Error(`Server error: ${response.status}`)

      const text = await response.text()
      if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        throw new Error('Server returned HTML instead of JSON')
      }

      const data = JSON.parse(text)
      if (!data.success) {
        alert(`❌ ${data.error || 'Location not found'}\n\nTry:\n- Using full place name\n- Using "Track My Location"`)
        setLoading(false)
        return
      }

      setLocationInput(data.display_name || locationInput)
      updateMapMarker(data.lat, data.lon, data.display_name || locationInput)
      await fetchPrediction(data.lat, data.lon, data.display_name || locationInput)
    } catch (error) {
      console.error('Search error:', error)
      alert('❌ Error searching location: ' + error.message)
      setLoading(false)
    }
  }

  // ── Show a dismissible toast with the tracking alert message ──────────────
  const showTrackingToast = useCallback((message, isAlert) => {
    setTrackingToast({ message, type: isAlert ? 'danger' : 'safe' })
    setTimeout(() => setTrackingToast(null), 8000)
  }, [])

  // ── Ping /track-location backend with latest GPS coords ───────────────────
  // PERFORMANCE FIX: removed the fetchPrediction() call that was fired on every
  // GPS update. That triggered a full weather API chain + 4 setState calls and
  // caused cascading re-renders whenever the live location updated.
  // The prediction panel is now only populated on explicit user-initiated actions
  // ("Check Place" / "Track My Location" button click).
  const pingTrackingBackend = useCallback(async (lat, lon) => {
    if (!user) return
    try {
      const res = await fetch(`${API_BASE_URL}/track-location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.username || user.id || 'guest',
          latitude: lat,
          longitude: lon,
        }),
      })
      if (!res.ok) return
      const data = await res.json()
      if (data.status !== 'success') return

      // ── Debounced UI update ──────────────────────────────────────────────
      // Clears any pending debounce first so rapid successive GPS fixes
      // only trigger ONE React render instead of many.
      if (uiDebounceRef.current) clearTimeout(uiDebounceRef.current)
      uiDebounceRef.current = setTimeout(() => {
        const liveLabel = `${data.location_name} (Live)`
        const status = data.alert
          ? 'High Risk'
          : data.risk_level === 'Low' ? 'Low Risk' : 'Moderate'

        setLocationInput(liveLabel)
        setActiveMonitoring(prev =>
          prev.name === liveLabel && prev.status === status
            ? prev  // exact match — skip re-render
            : { name: liveLabel, status }
        )
        showTrackingToast(data.message, data.alert)

        // ✅ FIX: update marker icon + popup in-place — no remove/add cycle
        let markerColor = 'green'
        if (data.risk_level === 'High') markerColor = 'red'
        else if (data.risk_level === 'Medium' || data.risk_level === 'Moderate') markerColor = 'yellow'

        if (markerRef.current) {
          markerRef.current.setIcon(_buildIcon(markerColor))
          markerRef.current.setPopupContent(`
            <div style="font-family: sans-serif; min-width: 150px;">
              <strong style="display:block; margin-bottom: 4px;">Location: ${data.location_name}</strong>
              Risk Status: ${data.risk_status}<br/>
              Risk Level: <b style="color: ${markerColor === 'yellow' ? '#d9a400' : markerColor}">${data.risk_level}</b>
            </div>
          `)
        }

        localStorage.setItem('latest_tracking_data', JSON.stringify({
          lat, lon,
          location_name: data.location_name,
          risk_status: data.risk_status,
          risk_level: data.risk_level,
          markerColor,
        }))

        // Restore the prediction panel seamlessly
        fetchPrediction(lat, lon, liveLabel, true)
      }, 300) // 300 ms debounce — coalesces rapid GPS fixes into one render

    } catch (_) { /* silent – live tracking is best-effort */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, showTrackingToast])

  // ── Stop continuous tracking ───────────────────────────────────────────────
  const stopTracking = useCallback(() => {
    if (window.__stopGlobalTrackingFn) {
      window.__stopGlobalTrackingFn()
    }
    // Cancel any pending debounced UI update
    if (uiDebounceRef.current) clearTimeout(uiDebounceRef.current)
    lastCoordsRef.current = null
    setIsTracking(false)
    setGpsError(null)
    localStorage.setItem('manual_tracking', 'false')
    setTrackingToast(null)
    setLocationInput(prev => prev ? prev.replace(' (Live)', '') : '')
    setActiveMonitoring(prev => ({
      ...prev,
      name: prev.name.replace(' (Live)', ''),
      status: 'Stable',
    }))
    // Strip '(Live)' from marker popup without destroying/recreating it
    if (markerRef.current) {
      const popup = markerRef.current.getPopup()
      if (popup) {
        const content = popup.getContent()
        if (typeof content === 'string') {
          markerRef.current.setPopupContent(content.replace(' (Live)', ''))
        }
      }
    }
  }, [])

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      window.__activeHomeMounted = false
      if (uiDebounceRef.current) clearTimeout(uiDebounceRef.current)
      // Do NOT stop GPS tracking on unmount — it continues globally in App.jsx
    }
  }, [])

  // ── Tab visibility — log when tracking runs in background ─────────────────
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isTracking) {
        // Re-sync UI with the last known coords when user returns to tab
        const lastCoords = window.__lastBackgroundCoords
        if (lastCoords && window.__handleBackgroundLocation) {
          window.__handleBackgroundLocation(
            lastCoords.latitude,
            lastCoords.longitude
          ).catch(() => {})
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [isTracking])

  // Auto-resume tracking logic if it was enabled before component remount
  // Uses pingTrackingBackendRef so __handleBackgroundLocation never captures a
  // stale reference to pingTrackingBackend across re-renders.
  useEffect(() => {
    pingTrackingBackendRef.current = pingTrackingBackend
  }, [pingTrackingBackend])

  useEffect(() => {
    window.__activeHomeMounted = true

    window.__handleBackgroundLocation = async (lat, lon) => {
      lastCoordsRef.current = { latitude: lat, longitude: lon }
      window.__lastBackgroundCoords = { latitude: lat, longitude: lon }

      if (window.__activeHomeMounted) {
        // Update map position immediately (no re-render overhead)
        updateMapMarker(lat, lon, 'Live Location')
        // Send to backend with debounced UI update (via ref to avoid stale closure)
        if (pingTrackingBackendRef.current) {
          await pingTrackingBackendRef.current(lat, lon)
        }
        setIsTracking(true)
      } else {
        // Home not mounted — fire a silent background ping only
        const userIdStr = user?.username || user?.id || 'guest'
        fetch(`${API_BASE_URL}/track-location`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userIdStr, latitude: lat, longitude: lon }),
        }).catch(() => {})
      }
    }

    if (localStorage.getItem('manual_tracking') === 'true') {
      setIsTracking(true)
      if (window.__lastBackgroundCoords) {
        window.__handleBackgroundLocation(
          window.__lastBackgroundCoords.latitude,
          window.__lastBackgroundCoords.longitude
        ).catch(() => {})
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // ── Start continuous GPS tracking ─────────────────────────────────────────
  const getUserLocation = (silentResume = false) => {
    if (!navigator.geolocation) {
      setGpsError('❌ Geolocation is not supported by your browser. Please use Chrome or Firefox.')
      return
    }

    // Toggle off if already tracking (and not a silent resume)
    if (isTracking && !silentResume) {
      localStorage.setItem('manual_tracking', 'false')
      stopTracking()
      return
    }

    setGpsError(null)   // clear any previous error
    localStorage.setItem('manual_tracking', 'true')
    setIsTracking(true)
    setLoading(true)

    if (window.__startGlobalTracking) {
      window.__startGlobalTracking()
    }

    if (window.__lastBackgroundCoords) {
      const { latitude, longitude } = window.__lastBackgroundCoords
      if (window.__handleBackgroundLocation) {
        window.__handleBackgroundLocation(latitude, longitude)
          .catch(() => {})
          .finally(() => setLoading(false))
      }
    } else {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude
          const lon = pos.coords.longitude
          window.__lastBackgroundCoords = { latitude: lat, longitude: lon }
          if (window.__handleBackgroundLocation) {
            window.__handleBackgroundLocation(lat, lon)
              .catch(() => {})
              .finally(() => setLoading(false))
          }
        },
        (err) => {
          // Friendly error messages instead of browser alert()
          const MESSAGES = {
            1: '⛔ Location permission denied. Please click the lock icon in your browser bar and allow location access.',
            2: '📡 Position unavailable. Check that your device GPS is enabled.',
            3: '⏱ Location request timed out. Move to an area with better GPS signal.',
          }
          setGpsError(MESSAGES[err.code] || `❌ ${err.message}`)
          setIsTracking(false)
          localStorage.setItem('manual_tracking', 'false')
          setLoading(false)
        },
        { enableHighAccuracy: true, timeout: 15000 }
      )
    }
  }

  // Handle Enter key in search
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') searchPlace()
  }

  // Risk color helpers
  const getRiskColor = (risk) => {
    if (!risk) return 'text-outline'
    const r = risk.toLowerCase()
    if (r.includes('high') || r.includes('danger') || r.includes('severe')) return 'text-error'
    if (r.includes('moderate') || r.includes('medium')) return 'text-secondary'
    if (r.includes('low')) return 'text-tertiary'
    return 'text-primary'
  }

  const getStatusColor = (status) => {
    if (status === 'High Risk') return 'text-error'
    if (status === 'Moderate') return 'text-secondary'
    if (status === 'Low Risk' || status === 'Stable') return 'text-tertiary'
    return 'text-primary'
  }

  const getStatusDotColor = (status) => {
    if (status === 'High Risk') return 'bg-error'
    if (status === 'Moderate') return 'bg-secondary'
    if (status === 'Low Risk' || status === 'Stable') return 'bg-tertiary'
    return 'bg-primary'
  }

  return (
    <div className="bg-surface text-on-surface min-h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── GPS / Permission Error Banner ── */}
      {gpsError && (
        <div
          role="alert"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] flex items-start gap-3 px-6 py-4 rounded-2xl shadow-2xl max-w-lg w-full mx-4"
          style={{
            background: 'rgba(186,26,26,0.95)',
            color: '#fff',
            backdropFilter: 'blur(12px)',
          }}
        >
          <span className="material-symbols-outlined text-2xl mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>gps_off</span>
          <p className="flex-1 text-sm font-body leading-snug">{gpsError}</p>
          <button
            onClick={() => setGpsError(null)}
            aria-label="Dismiss error"
            className="opacity-70 hover:opacity-100 transition-opacity text-lg leading-none"
          >✕</button>
        </div>
      )}

      {/* ── Tracking Toast Notification ── */}
      {trackingToast && (
        <div
          className={`fixed top-20 right-6 z-[99999] flex items-start gap-3 px-5 py-4 rounded-2xl shadow-2xl max-w-sm animate-[slideInRight_0.35s_ease-out] ${
            trackingToast.type === 'danger'
              ? 'bg-error text-on-error'
              : 'bg-tertiary text-on-tertiary'
          }`}
          style={{ backdropFilter: 'blur(12px)' }}
        >
          <span className="material-symbols-outlined text-2xl mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
            {trackingToast.type === 'danger' ? 'warning' : 'check_circle'}
          </span>
          <div className="flex-1">
            <p className="font-headline font-bold text-sm leading-tight">
              {trackingToast.type === 'danger' ? 'Risk Alert' : 'Safe Zone'}
            </p>
            <p className="text-xs opacity-90 mt-1 font-body">{trackingToast.message}</p>
          </div>
          <button
            onClick={() => setTrackingToast(null)}
            className="opacity-70 hover:opacity-100 transition-opacity text-lg leading-none"
          >✕</button>
        </div>
      )}
      {/* ── Shared Navigation Bar ── */}
      <NavBar
        rightSlot={
          <>
            {/* Quick search */}
            <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-surface-container-low rounded-xl">
              <span className="material-symbols-outlined text-outline">search</span>
              <input
                className="bg-transparent border-none focus:ring-0 text-sm w-48 font-body"
                placeholder="Quick search..."
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') searchPlace() }}
              />
            </div>

            {/* Emergency Call */}
            <button
              id="emergency-call-btn"
              onClick={openEmergencyModal}
              className="bg-error text-on-error px-4 py-2 rounded-xl font-headline font-bold text-sm flex items-center gap-2 hover:bg-red-700 transition-all active:scale-95 duration-150 shadow-lg hover:shadow-red-400/40"
            >
              <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>emergency</span>
              Emergency Call
            </button>

            {/* Notifications icon */}
            <button 
              onClick={() => {
                setHasUnreadAlerts(false);
                setShowEmergencyModal(true);
              }}
              className="p-2 hover:bg-[#ecf1ff] dark:hover:bg-slate-800 rounded-md transition-all text-[#242f41] dark:text-white relative"
            >
              <span className="material-symbols-outlined">notifications</span>
              {hasUnreadAlerts && (
                <span className="absolute top-1 right-2 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600 border border-white dark:border-[#1e293b]"></span>
                </span>
              )}
            </button>

            {/* Settings icon + Theme Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                className={`p-2 rounded-md transition-all ${showSettingsMenu ? 'bg-[#ecf1ff] text-primary' : 'hover:bg-[#ecf1ff] text-[#242f41] dark:text-white'}`}
              >
                <span className="material-symbols-outlined" style={{ transition: 'transform 0.3s', transform: showSettingsMenu ? 'rotate(60deg)' : 'rotate(0deg)' }}>settings</span>
              </button>

              {showSettingsMenu && (
                <>
                  {/* Backdrop to close on outside click */}
                  <div className="fixed inset-0 z-40" onClick={() => setShowSettingsMenu(false)} />

                  {/* Dropdown */}
                  <div
                    className="settings-dropdown absolute right-0 top-full mt-2 z-50 w-56 rounded-2xl overflow-hidden"
                    style={{
                      background: currentTheme === 'dark' ? '#1e293b' : '#ffffff',
                      border: `1px solid ${currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                      boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                      animation: 'fadeIn 0.2s ease-out',
                    }}
                  >
                    {/* Header */}
                    <div
                      style={{
                        padding: '12px 16px',
                        borderBottom: `1px solid ${currentTheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: currentTheme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
                      }}
                    >
                      Theme
                    </div>

                    {/* Light Theme option */}
                    <button
                      onClick={() => toggleTheme('light')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        width: '100%',
                        padding: '12px 16px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.88rem',
                        fontWeight: currentTheme === 'light' ? 700 : 500,
                        background: currentTheme === 'light'
                          ? (currentTheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,102,108,0.06)')
                          : 'transparent',
                        color: currentTheme === 'light'
                          ? '#00666c'
                          : (currentTheme === 'dark' ? 'rgba(255,255,255,0.8)' : '#333'),
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { if (currentTheme !== 'light') e.target.style.background = currentTheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
                      onMouseLeave={e => { if (currentTheme !== 'light') e.target.style.background = 'transparent' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>light_mode</span>
                      <span style={{ flex: 1, textAlign: 'left' }}>Light Theme</span>
                      {currentTheme === 'light' && (
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#00666c' }}>check_circle</span>
                      )}
                    </button>

                    {/* Dark Theme option */}
                    <button
                      onClick={() => toggleTheme('dark')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        width: '100%',
                        padding: '12px 16px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.88rem',
                        fontWeight: currentTheme === 'dark' ? 700 : 500,
                        background: currentTheme === 'dark'
                          ? 'rgba(255,255,255,0.08)'
                          : 'transparent',
                        color: currentTheme === 'dark'
                          ? '#60a5fa'
                          : (currentTheme === 'dark' ? 'rgba(255,255,255,0.8)' : '#333'),
                        borderRadius: '0 0 16px 16px',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { if (currentTheme !== 'dark') e.target.style.background = currentTheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
                      onMouseLeave={e => { if (currentTheme !== 'dark') e.target.style.background = 'transparent' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>dark_mode</span>
                      <span style={{ flex: 1, textAlign: 'left' }}>Dark Theme</span>
                      {currentTheme === 'dark' && (
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#60a5fa' }}>check_circle</span>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Profile avatar + dropdown */}
            <ProfileMenu
              user={user}

              onLogout={onLogout}
            />
          </>
        }
      />

      <main className="max-w-screen-2xl mx-auto px-6 py-12 pb-bottom-nav">
        {/* Hero Input Section */}
        <section className="mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-8">
              {predictionData ? (
                <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
                  <div className="space-y-2">
                    <span className="text-xs font-label font-bold text-primary uppercase tracking-[0.2em]">CURRENT LOCATION</span>
                    <h1 className="text-[3rem] leading-[1.1] font-headline font-extrabold text-on-surface flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-4xl">location_on</span>
                      {locationName}
                    </h1>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Flood Risk */}
                    <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10 shadow-sm flex flex-col items-center text-center">
                      <span className="material-symbols-outlined text-primary text-2xl mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>water_drop</span>
                      <span className="text-[0.65rem] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Flood Risk</span>
                      <span className={`text-xl font-headline font-extrabold ${getRiskColor(predictionData.risk)}`}>{predictionData.risk || 'N/A'}</span>
                    </div>

                    {/* Landslide */}
                    <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10 shadow-sm flex flex-col items-center text-center">
                      <span className="material-symbols-outlined text-secondary text-2xl mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>landscape</span>
                      <span className="text-[0.65rem] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Landslide</span>
                      <span className={`text-xl font-headline font-extrabold ${getRiskColor(predictionData.landslide)}`}>{predictionData.landslide || 'Nil'}</span>
                    </div>

                    {/* Rainfall */}
                    <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10 shadow-sm flex flex-col items-center text-center">
                      <span className="material-symbols-outlined text-primary text-2xl mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>rainy</span>
                      <span className="text-[0.65rem] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Rainfall</span>
                      <span className="text-xl font-headline font-extrabold text-on-surface">{predictionData.rainfall || 0}<span className="text-sm font-normal ml-1">cm</span></span>
                    </div>

                    {/* Temperature/Humidity */}
                    <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10 shadow-sm flex flex-col items-center text-center">
                      <span className="material-symbols-outlined text-tertiary text-2xl mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>thermostat</span>
                      <span className="text-[0.65rem] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Weather</span>
                      <span className="text-xl font-headline font-extrabold text-on-surface">{predictionData.temperature || 0}<span className="text-sm font-normal ml-1">°C</span></span>
                      <span className="text-[0.65rem] font-bold text-on-surface-variant mt-1">Humidity: {predictionData.humidity || 0}%</span>
                    </div>
                  </div>

                  {/* Recommendation */}
                  {predictionData.recommendation && (
                    <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10 flex items-start gap-3">
                      <span className="material-symbols-outlined text-primary mt-0.5 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>tips_and_updates</span>
                      <p className="text-sm text-on-surface-variant font-body leading-relaxed">{predictionData.recommendation}</p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <h1 className="text-[3.5rem] leading-[1.1] font-headline font-extrabold text-on-surface" style={{ letterSpacing: '-0.02em' }}>
                    Your Intelligence Against <br />
                    <span className="text-primary">Environmental Risk</span>
                  </h1>
                  <p className="text-xl font-body text-on-surface-variant max-w-2xl leading-relaxed">
                    Assess real-time flood and landslide threats across the Indian subcontinent with high-precision sensory data and chromatic risk mapping.
                  </p>
                </>
              )}

              {/* Search Input */}
              <div className="bg-surface-container-low p-2 rounded-2xl flex flex-col md:flex-row gap-2 shadow-[0_12px_32px_rgba(36,47,65,0.04)]">
                <div className="flex-grow flex items-center px-4 gap-3 bg-surface-container-lowest rounded-xl border-b-2 border-outline-variant/30 focus-within:border-primary transition-all">
                  <span className="material-symbols-outlined text-primary">location_on</span>
                  <input
                    className="w-full py-4 bg-transparent border-none focus:ring-0 text-lg font-body placeholder:text-outline/60"
                    placeholder="Enter a location across India"
                    type="text"
                    id="placeName"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                  />
                </div>
                <button
                  onClick={searchPlace}
                  disabled={loading}
                  className="bg-gradient-to-br from-primary to-primary-container text-on-primary-container px-8 py-4 rounded-xl font-headline font-bold text-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? 'Searching...' : 'Check Place'}
                </button>
              </div>

              <div className="flex flex-wrap gap-4">

                <button
                  onClick={() => navigate('/map')}
                  className="flex items-center gap-3 px-6 py-4 rounded-xl font-headline font-extrabold text-lg bg-surface-container-lowest border-2 border-primary text-primary hover:bg-primary hover:text-white shadow-[0_8px_24px_rgba(0,102,108,0.15)] hover:scale-[1.02] active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>map</span>
                  View Map
                </button>
                <div className="flex items-center gap-2 text-on-surface-variant px-4">
                  <span className="material-symbols-outlined text-tertiary">verified_user</span>
                  <span className="text-sm font-label font-bold tracking-wider uppercase">Secure Data Access</span>
                </div>
              </div>
            </div>

            {/* Map Preview */}
            <div className="lg:col-span-5 relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent rounded-[2rem] -rotate-3 scale-105 -z-10"></div>
              <div className="bg-surface-container-lowest rounded-[2rem] overflow-hidden shadow-2xl relative">
                <div className="w-full" style={{ height: '480px' }}>
                  <div id="dashboardMap" className="w-full h-full rounded-[2rem]" style={{ zIndex: 1 }}></div>
                  <div className="absolute bottom-6 left-6 right-6 p-6 backdrop-blur-md bg-surface-container-lowest/70 rounded-2xl border border-white/20" style={{ zIndex: 1000 }}>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs font-label font-bold text-primary uppercase tracking-[0.1em] mb-1">Active Monitoring</p>
                        <h3 className="text-2xl font-headline font-bold text-on-surface">{activeMonitoring.name}</h3>
                      </div>
                      <div className={`flex items-center gap-1 ${getStatusColor(activeMonitoring.status)}`}>
                        <div className={`w-3 h-3 ${getStatusDotColor(activeMonitoring.status)} rounded-full animate-pulse`}></div>
                        <span className="text-sm font-bold">{activeMonitoring.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-on-surface/20 backdrop-blur-sm flex items-center justify-center z-[9999]">
            <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="font-headline font-bold text-on-surface">Analyzing Risk Data...</p>
            </div>
          </div>
        )}



        {/* Assessment Grid */}
        <section className="space-y-8">
          <div className="flex items-end justify-between">
            <div className="space-y-2">
              <span className="text-xs font-label font-bold text-primary uppercase tracking-[0.2em]">Risk Parameters</span>
              <h2 className="text-[1.75rem] font-headline font-bold text-on-surface">Flood &amp; Landslide Assessment</h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setAssessmentTab('all')}
                className={`px-4 py-1.5 rounded-full text-xs font-label font-bold transition-all duration-200 cursor-pointer border-none outline-none ${
                  assessmentTab === 'all'
                    ? 'bg-primary text-on-primary shadow-md'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-highest'
                }`}
              >
                All Regions
              </button>
              <button
                onClick={() => setAssessmentTab('live')}
                className={`px-4 py-1.5 rounded-full text-xs font-label font-bold transition-all duration-200 cursor-pointer border-none outline-none ${
                  assessmentTab === 'live'
                    ? 'bg-primary text-on-primary shadow-md'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-highest'
                }`}
              >
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>sensors</span>
                  Live Sensors
                </span>
              </button>
            </div>
          </div>

          {/* ── TAB: All Regions ─────────────────────────────────────────── */}
          {assessmentTab === 'all' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Flood Risk Card */}
            <div
              className="bg-primary-container p-8 rounded-[2rem] flex flex-col justify-between min-h-[320px] shadow-[0_20px_40px_rgba(0,102,108,0.08)] group hover:-translate-y-1 transition-transform cursor-pointer"
              onClick={() => navigate('/hydrological-stability')}
            >
              <div className="space-y-4">
                <div className="w-16 h-16 bg-on-primary-fixed flex items-center justify-center rounded-2xl text-primary-fixed">
                  <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>water_drop</span>
                </div>
                <h3 className="text-2xl font-headline font-extrabold text-on-primary-container">Hydrological Stability</h3>
                <p className="text-on-primary-container/80 leading-relaxed font-body">Real-time water level monitoring and surge prediction modeling based on current precipitation.</p>
              </div>
              <div className="pt-6 flex items-center justify-between border-t border-on-primary-container/10">
                <span className="text-sm font-bold font-label uppercase tracking-widest text-on-primary-container">Check Status</span>
                <span className="material-symbols-outlined text-on-primary-container group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </div>
            </div>

            {/* Landslide Risk Card */}
            <div
              className="bg-secondary-container p-8 rounded-[2rem] flex flex-col justify-between min-h-[320px] shadow-[0_20px_40px_rgba(140,74,0,0.08)] group hover:-translate-y-1 transition-transform cursor-pointer"
              onClick={() => navigate('/terrain-integrity')}
            >
              <div className="space-y-4">
                <div className="w-16 h-16 bg-on-secondary-fixed flex items-center justify-center rounded-2xl text-secondary-fixed">
                  <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>landscape</span>
                </div>
                <h3 className="text-2xl font-headline font-extrabold text-on-secondary-container">Terrain Integrity</h3>
                <p className="text-on-secondary-container/80 leading-relaxed font-body">Geological stress detection and soil moisture analysis for landslide prevention in high-slope areas.</p>
              </div>
              <div className="pt-6 flex items-center justify-between border-t border-on-secondary-container/10">
                <span className="text-sm font-bold font-label uppercase tracking-widest text-on-secondary-container">View Metrics</span>
                <span className="material-symbols-outlined text-on-secondary-container group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </div>
            </div>

            {/* Safety Zone Card */}
            <div className="bg-tertiary-container p-8 rounded-[2rem] flex flex-col justify-between min-h-[320px] shadow-[0_20px_40px_rgba(0,106,44,0.08)] group hover:-translate-y-1 transition-transform cursor-pointer"
                 onClick={() => navigate('/safe-zones')} >
              <div className="space-y-4">
                <div className="w-16 h-16 bg-on-tertiary-fixed flex items-center justify-center rounded-2xl text-tertiary-fixed">
                  <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>health_and_safety</span>
                </div>
                <h3 className="text-2xl font-headline font-extrabold text-on-tertiary-container">Safe Zones &amp; Protocols</h3>
                <p className="text-on-tertiary-container/80 leading-relaxed font-body">Validated evacuation routes and nearest emergency shelters identified by municipal authorities.</p>
              </div>
              <div className="pt-6 flex items-center justify-between border-t border-on-tertiary-container/10">
                <span className="text-sm font-bold font-label uppercase tracking-widest text-on-tertiary-container">Locate Shelters</span>
                <span className="material-symbols-outlined text-on-tertiary-container group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </div>
            </div>
          </div>
          )}

          {/* ── TAB: Live Sensors ────────────────────────────────────────── */}
          {assessmentTab === 'live' && (
          <div className="space-y-6">
            {/* Live status indicator */}
            <div className="flex items-center gap-3 bg-surface-container-low px-5 py-3 rounded-2xl">
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isTracking ? 'bg-tertiary' : 'bg-outline'}`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isTracking ? 'bg-tertiary' : 'bg-outline'}`}></span>
              </span>
              <span className="text-sm font-label font-bold text-on-surface">
                {isTracking ? 'Sensors Active — Receiving Live Data' : 'Sensors Inactive — Start Tracking to Activate'}
              </span>
            </div>

            {predictionData ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Rainfall */}
                <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>water_drop</span>
                    <span className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-wider">Rainfall</span>
                  </div>
                  <p className="text-2xl font-headline font-extrabold text-on-surface">{predictionData.rainfall ?? predictionData.precipitation ?? '—'}</p>
                  <p className="text-xs text-on-surface-variant mt-1">mm (current)</p>
                </div>

                {/* Temperature */}
                <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>thermostat</span>
                    <span className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-wider">Temperature</span>
                  </div>
                  <p className="text-2xl font-headline font-extrabold text-on-surface">{predictionData.temperature ?? '—'}</p>
                  <p className="text-xs text-on-surface-variant mt-1">°C</p>
                </div>

                {/* Humidity */}
                <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>humidity_percentage</span>
                    <span className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-wider">Humidity</span>
                  </div>
                  <p className="text-2xl font-headline font-extrabold text-on-surface">{predictionData.humidity ?? '—'}</p>
                  <p className="text-xs text-on-surface-variant mt-1">%</p>
                </div>

                {/* Wind Speed */}
                <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>air</span>
                    <span className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-wider">Wind Speed</span>
                  </div>
                  <p className="text-2xl font-headline font-extrabold text-on-surface">{predictionData.wind_speed ?? '—'}</p>
                  <p className="text-xs text-on-surface-variant mt-1">km/h</p>
                </div>

                {/* Flood Risk */}
                <div className={`p-6 rounded-2xl border border-outline-variant/10 hover:shadow-lg transition-shadow ${
                  (predictionData.risk || '').toLowerCase().includes('high') ? 'bg-error-container' :
                  (predictionData.risk || '').toLowerCase().includes('moderate') ? 'bg-secondary-container' : 'bg-surface-container-lowest'
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>flood</span>
                    <span className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-wider">Flood Risk</span>
                  </div>
                  <p className={`text-2xl font-headline font-extrabold ${getRiskColor(predictionData.risk)}`}>{predictionData.risk || '—'}</p>
                  <p className="text-xs text-on-surface-variant mt-1">ML Prediction</p>
                </div>

                {/* Landslide Risk */}
                <div className={`p-6 rounded-2xl border border-outline-variant/10 hover:shadow-lg transition-shadow ${
                  (predictionData.landslide || '').toLowerCase().includes('high') ? 'bg-error-container' :
                  (predictionData.landslide || '').toLowerCase().includes('moderate') ? 'bg-secondary-container' : 'bg-surface-container-lowest'
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>landslide</span>
                    <span className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-wider">Landslide Risk</span>
                  </div>
                  <p className={`text-2xl font-headline font-extrabold ${getRiskColor(predictionData.landslide)}`}>{predictionData.landslide || 'Nil'}</p>
                  <p className="text-xs text-on-surface-variant mt-1">Terrain Analysis</p>
                </div>
              </div>
            ) : (
              /* No data yet — prompt user to search or track */
              <div className="bg-surface-container-low rounded-[2rem] p-12 text-center">
                <span className="material-symbols-outlined text-6xl text-outline mb-4" style={{ fontVariationSettings: "'FILL' 0" }}>sensors_off</span>
                <h3 className="text-xl font-headline font-bold text-on-surface mb-2">No Sensor Data Yet</h3>
                <p className="text-on-surface-variant font-body mb-6">Search for a location or start GPS tracking to activate live sensor readings.</p>
                <button
                  onClick={() => getUserLocation()}
                  className="bg-primary text-on-primary px-6 py-3 rounded-full font-label font-bold text-sm border-none cursor-pointer hover:shadow-lg transition-shadow"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>my_location</span>
                    Start Live Tracking
                  </span>
                </button>
              </div>
            )}
          </div>
          )}
        </section>

        {/* Asymmetric Data Section */}
        <section className="mt-24">
          <div className="flex flex-col lg:flex-row gap-12 items-stretch">
            <div className="lg:w-1/3 bg-surface-container-low rounded-[2rem] p-10 flex flex-col justify-center">
              <h2 className="text-4xl font-headline font-extrabold text-on-surface mb-6 leading-tight">National Risk <br /> Overview</h2>
              <p className="text-on-surface-variant font-body mb-8">Current state of environmental hazards across major Indian climatic zones monitored by the Chromatic Guardian system.</p>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <span className="text-3xl font-headline font-black text-primary">84</span>
                  <div className="flex-grow">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-label font-bold uppercase tracking-wider">Active Sensors</span>
                      <span className="text-xs font-bold text-tertiary">98% Online</span>
                    </div>
                    <div className="h-2 bg-outline-variant/20 rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: '98%' }}></div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-3xl font-headline font-black text-secondary">12</span>
                  <div className="flex-grow">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-label font-bold uppercase tracking-wider">Watch Areas</span>
                      <span className="text-xs font-bold text-secondary">Pre-Alert</span>
                    </div>
                    <div className="h-2 bg-outline-variant/20 rounded-full overflow-hidden">
                      <div className="h-full bg-secondary" style={{ width: '45%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-surface-container-lowest p-8 rounded-[2rem] flex flex-col justify-between border border-outline-variant/10">
                <div>
                  <span className="material-symbols-outlined text-primary-dim mb-4">cloud_sync</span>
                  <h4 className="text-xl font-headline font-bold text-on-surface">Satellite Integration</h4>
                  <p className="text-sm text-on-surface-variant mt-2 font-body">Hourly spectral imagery updates from ISRO datasets for atmospheric water vapor analysis.</p>
                </div>
                <button 
                  onClick={() => window.open('https://bhuvan.nrsc.gov.in/home/index.php', '_blank', 'noopener,noreferrer')}
                  className="mt-8 text-sm font-bold text-primary flex items-center gap-2 hover:underline cursor-pointer"
                >
                  Explore data methodology
                </button>
              </div>
              <div className="bg-surface-container-lowest p-8 rounded-[2rem] flex flex-col justify-between border border-outline-variant/10">
                <div>
                  <span className="material-symbols-outlined text-secondary-dim mb-4">analytics</span>
                  <h4 className="text-xl font-headline font-bold text-on-surface">Predictive Modeling</h4>
                  <p className="text-sm text-on-surface-variant mt-2 font-body">Our proprietary AI calculates flood probabilities with 94% accuracy for next 24-hour windows.</p>
                </div>
                <button 
                  onClick={() => navigate('/hydrological')}
                  className="mt-8 text-sm font-bold text-primary flex items-center gap-2 hover:underline cursor-pointer"
                >
                  View case studies
                </button>
              </div>
              <div className="bg-surface-container-lowest p-8 rounded-[2rem] flex flex-col justify-between border border-outline-variant/10">
                <div>
                  <span className="material-symbols-outlined text-tertiary-dim mb-4">broadcast_on_home</span>
                  <h4 className="text-xl font-headline font-bold text-on-surface">Community Alerts</h4>
                  <p className="text-sm text-on-surface-variant mt-2 font-body">Direct-to-mobile SMS broadcasts for immediate risk areas, ensuring zero lag in communication.</p>
                </div>
                <button 
                  onClick={() => {
                    const granted = window.Notification && Notification.permission === "granted";
                    if (granted) {
                      alert("Community SMS & Browser Alerts are currently active for your number: " + sosPhone);
                    } else if (window.Notification) {
                      Notification.requestPermission().then(p => {
                        if (p === 'granted') alert("Community Alerts successfully enabled!");
                      });
                    } else {
                      alert("SMS alerts enabled for: " + sosPhone);
                    }
                  }}
                  className="mt-8 text-sm font-bold text-primary flex items-center gap-2 hover:underline cursor-pointer"
                >
                  Setup alerts
                </button>
              </div>
              <div className="bg-surface-container-lowest p-8 rounded-[2rem] flex flex-col justify-between border border-outline-variant/10">
                <div>
                  <span className="material-symbols-outlined text-on-surface-variant mb-4">policy</span>
                  <h4 className="text-xl font-headline font-bold text-on-surface">Policy Compliance</h4>
                  <p className="text-sm text-on-surface-variant mt-2 font-body">All reporting strictly adheres to NDMA (National Disaster Management Authority) standards.</p>
                </div>
                <button 
                  onClick={() => window.open('https://ndma.gov.in/sites/default/files/PDF/Guidelines/Floods.pdf', '_blank')}
                  className="mt-8 text-sm font-bold text-primary flex items-center gap-2 hover:underline cursor-pointer"
                >
                  Read framework
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#a2adc4]/15 dark:border-white/5 bg-[#ecf1ff] dark:bg-[#111827] mt-20 transition-colors duration-300">
        <div className="flex flex-col md:flex-row justify-between items-center px-8 py-12 gap-6 w-full max-w-screen-2xl mx-auto">
          <div className="space-y-2">
            <span className="font-headline font-bold text-[#00666c] dark:text-[#76eef9] text-xl">Flood Guard</span>
            <p className="font-body text-sm text-[#242f41] dark:text-slate-400 opacity-80">© 2024 Flood Guard. Real-time Environmental Intelligence.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            <a className="font-body text-sm text-[#242f41] dark:text-slate-400 opacity-80 hover:opacity-100 transition-opacity hover:text-[#00666c] dark:hover:text-[#76eef9]" href="#">Safety Protocols</a>
            <a className="font-body text-sm text-[#242f41] dark:text-slate-400 opacity-80 hover:opacity-100 transition-opacity hover:text-[#00666c] dark:hover:text-[#76eef9]" href="#">Emergency Contacts</a>
            <a className="font-body text-sm text-[#242f41] dark:text-slate-400 opacity-80 hover:opacity-100 transition-opacity hover:text-[#00666c] dark:hover:text-[#76eef9]" href="#">Data Methodology</a>
            <a className="font-body text-sm text-[#242f41] dark:text-slate-400 opacity-80 hover:opacity-100 transition-opacity hover:text-[#00666c] dark:hover:text-[#76eef9]" href="#">Privacy Policy</a>
          </div>
        </div>
      </footer>
      {/* ────────────────────────────────────────────────────────────────────
          EMERGENCY MODAL
          Layer 2: Nearest hospitals & police stations via Overpass API
          Layer 3: WhatsApp SOS with live GPS link
      ──────────────────────────────────────────────────────────────────── */}
      {showEmergencyModal && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Emergency Services"
          className="fixed inset-0 z-[100000] flex items-center justify-center p-4"
          style={{ background: 'rgba(10,10,20,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowEmergencyModal(false) }}
        >
          <div
            className="bg-white dark:bg-[#1a1f2e] rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            style={{ border: '1.5px solid rgba(186,26,26,0.25)' }}
          >
            {/* ── Header ── */}
            <div className="bg-gradient-to-r from-red-600 to-red-800 rounded-t-3xl px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-white text-3xl animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>emergency</span>
                <div>
                  <h2 className="text-white font-headline font-extrabold text-xl leading-tight">Emergency Services</h2>
                  <p className="text-red-200 text-xs mt-0.5">
                    {window.__lastBackgroundCoords
                      ? `📍 Using your live GPS location`
                      : '📍 Getting your location...'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEmergencyModal(false)}
                aria-label="Close emergency modal"
                className="text-white opacity-80 hover:opacity-100 text-2xl leading-none transition-opacity"
              >✕</button>
            </div>

            <div className="px-6 py-5 space-y-6">

              {/* ── Static National Helplines ── */}
              <section>
                <p className="text-xs font-label font-bold uppercase tracking-widest text-red-600 mb-3">National Helplines</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Police',       number: '100',           icon: 'local_police',  color: '#1a56db' },
                    { label: 'Ambulance',    number: '108',           icon: 'ambulance',     color: '#057a55' },
                    { label: 'Fire',         number: '101',           icon: 'local_fire_department', color: '#e3a008' },
                    { label: 'Flood / NDMA', number: '1078',          icon: 'flood',         color: '#0891b2' },
                  ].map(({ label, number, icon, color }) => (
                    <a
                      key={number}
                      href={`tel:${number}`}
                      id={`helpline-${number}`}
                      className="flex items-center gap-3 p-3 rounded-2xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all active:scale-95"
                      style={{ background: `${color}12` }}
                    >
                      <span
                        className="material-symbols-outlined text-2xl"
                        style={{ color, fontVariationSettings: "'FILL' 1" }}
                      >{icon}</span>
                      <div>
                        <p className="font-headline font-bold text-sm text-gray-900 dark:text-white">{label}</p>
                        <p className="font-mono font-bold text-xs mt-0.5" style={{ color }}>{number}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </section>

              {/* ── Overpass API: Nearby Places ── */}
              <section>
                <p className="text-xs font-label font-bold uppercase tracking-widest text-red-600 mb-3">
                  Nearest Hospitals &amp; Police Stations
                </p>

                {nearbyLoading && (
                  <div className="flex items-center gap-3 py-4 text-gray-500">
                    <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm">Finding nearby services...</span>
                  </div>
                )}

                {nearbyError && !nearbyLoading && (
                  <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
                    ⚠️ {nearbyError}
                  </div>
                )}

                {!nearbyLoading && nearbyPlaces.length > 0 && (
                  <div className="space-y-2">
                    {nearbyPlaces.map((place) => (
                      <div
                        key={place.id}
                        className="flex items-center justify-between p-3 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="material-symbols-outlined text-2xl flex-shrink-0"
                            style={{
                              color: place.type === 'hospital' ? '#057a55' : '#1a56db',
                              fontVariationSettings: "'FILL' 1",
                            }}
                          >
                            {place.type === 'hospital' ? 'local_hospital' : 'local_police'}
                          </span>
                          <div className="min-w-0">
                            <p className="font-headline font-bold text-sm text-gray-900 dark:text-white truncate">{place.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {place.type === 'hospital' ? '🏥 Hospital' : '🚔 Police'}
                              {' · '}
                              <span className="font-bold">{place.dist.toFixed(1)} km away</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0 ml-2">
                          {/* Directions button */}
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Get directions"
                            className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 hover:bg-blue-200 transition-colors"
                          >
                            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>directions</span>
                          </a>
                          {/* Call button (only if phone available) */}
                          {place.phone ? (
                            <a
                              href={`tel:${place.phone}`}
                              title={`Call ${place.phone}`}
                              className="p-2 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 hover:bg-green-200 transition-colors"
                            >
                              <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>call</span>
                            </a>
                          ) : (
                            <span
                              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                              title="Phone number not available"
                            >
                              <span className="material-symbols-outlined text-lg">call_end</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Retry button */}
                {!nearbyLoading && (
                  <button
                    onClick={openEmergencyModal}
                    className="mt-2 text-xs text-red-600 hover:underline font-bold"
                  >
                    🔄 Refresh nearby results
                  </button>
                )}
              </section>

              {/* ── WhatsApp SOS ── */}
              <section className="border-t border-gray-200 dark:border-gray-700 pt-5">
                <p className="text-xs font-label font-bold uppercase tracking-widest text-red-600 mb-3">SOS — Share My Location</p>

                {/* Saved Contact Manager */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 mb-3">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-gray-500 font-body">Registered Emergency Contact:</p>
                  </div>

                  <div className="flex items-center justify-between bg-white dark:bg-gray-900 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-bold text-gray-800 dark:text-white">
                      {sosPhone}
                    </span>
                    <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                  </div>
                </div>

                {/* SOS Buttons */}
                <div className="flex flex-col gap-2">
                  <button
                    id="whatsapp-sos-btn"
                    onClick={sendSosToAll}
                    className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl font-headline font-extrabold text-white text-sm transition-all active:scale-95 hover:brightness-110"
                    style={{ background: 'linear-gradient(135deg, #25d366, #128c7e)' }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Send SOS via WhatsApp
                  </button>
                  <p className="text-xs text-center text-gray-400 font-body mt-1">
                    Sends your live GPS location as a Google Maps link.
                  </p>
                </div>
              </section>

            </div>{/* end px-6 */}
          </div>
        </div>
      , document.body)}

    </div>
  )
}

export default Home
