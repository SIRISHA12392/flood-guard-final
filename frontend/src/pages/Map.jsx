import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import NavBar from '../components/NavBar'
import './Map.css'

// Use VITE_API_URL (set on Vercel/Render), fall back to localhost in dev
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// ── In-memory cache: ONLY non-empty results are stored ──────────────────────
const suggestionCache = {}

// ── Nominatim helpers ────────────────────────────────────────────────────────

// Build a concise, human-readable label from Nominatim address parts
function buildShortName(item) {
  const a = item.address || {}
  const n = item.namedetails || {}
  // name field from namedetails often contains the most accurate label
  const poiName = n.name || n['name:en'] || null
  const parts = [
    // POI / amenity layer
    a.amenity || a.office || a.building || a.leisure || a.tourism || a.shop || a.craft,
    // Street layer – covers roads, lanes, alleys, paths
    a.road || a.pedestrian || a.footway || a.path || a.cycleway || a.service,
    // House number (useful for precise street search)
    a['house_number'] ? `#${a['house_number']}` : null,
    // Locality
    a.suburb || a.neighbourhood || a.quarter || a.hamlet,
    // City
    a.city || a.town || a.village || a.municipality || a.county,
    // State + Country
    a.state,
    a.country_code ? a.country_code.toUpperCase() : a.country
  ].filter(Boolean)

  // If POI name differs from first address part, prepend it
  if (poiName && parts[0] !== poiName) parts.unshift(poiName)

  return parts.length ? parts.join(', ') : item.display_name
}

// Get icon category for a result (used in dropdown)
function getResultIcon(item) {
  const t = item.type || ''
  const cls = item.class || ''
  if (cls === 'highway' || t === 'road' || t === 'residential' || t === 'primary' || t === 'secondary' || t === 'tertiary' || t === 'street' || t === 'service') return 'route'
  if (cls === 'amenity' || t === 'school' || t === 'hospital' || t === 'university' || t === 'college') return 'school'
  if (cls === 'place' || t === 'city' || t === 'town' || t === 'village' || t === 'suburb') return 'location_city'
  if (cls === 'boundary') return 'map'
  if (t === 'water' || t === 'river') return 'water'
  return 'location_on'
}

// Build a free-text Nominatim URL
const nominatimURL = (q, extra = '') =>
  `https://nominatim.openstreetmap.org/search` +
  `?q=${encodeURIComponent(q)}&format=json&limit=8&addressdetails=1&namedetails=1${extra}`

// Build a STRUCTURED Nominatim URL (street + city split)
const nominatimStructuredURL = (street, city, extra = '') =>
  `https://nominatim.openstreetmap.org/search` +
  `?street=${encodeURIComponent(street)}&city=${encodeURIComponent(city)}` +
  `&format=json&limit=8&addressdetails=1&namedetails=1${extra}`

// Fetch one URL and parse results
async function queryNominatim(url) {
  try {
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
    if (!res.ok) return []
    const data = await res.json()
    return (data || []).map(item => ({
      lat:         parseFloat(item.lat),
      lon:         parseFloat(item.lon),
      displayName: item.display_name || '',
      shortName:   buildShortName(item),
      icon:        getResultIcon(item),
      type:        item.type || '',
      cls:         item.class || ''
    }))
  } catch {
    return []
  }
}

// Deduplicate by rounded lat/lon (~50 m grid)
function dedupe(results) {
  const seen = new Set()
  return results.filter(r => {
    const key = `${r.lat.toFixed(3)},${r.lon.toFixed(3)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// Smart query parser: splits "street city" into { street, city } if possible
function splitStreetCity(q) {
  // Common Indian city/area keywords at end
  const words = q.trim().split(/\s+/)
  if (words.length < 2) return null
  // Try last 1 word as city, rest as street
  return {
    street: words.slice(0, -1).join(' '),
    city:   words[words.length - 1]
  }
}

function Map() {
  const navigate = useNavigate()
  const location = useLocation()

  // ── State ──────────────────────────────────────────────────────────────────
  const [coords, setCoords] = useState({
    lat: location.state?.lat || 20.5937,
    lon: location.state?.lon || 78.9629
  })
  const [loading, setLoading]           = useState(false)
  const [locating, setLocating]         = useState(false)   // GPS spinner
  const [riskData, setRiskData]         = useState({
    percentage: 15,
    floodRisk: 'LOW',
    landslideRisk: 'LOW',
    safetyPulse: 'ACTIVE',
    color: '#006a2c'
  })
  const [locationName, setLocationName] = useState('Central India')

  // Search bar state
  const [searchInput, setSearchInput]   = useState('')
  const [suggestions, setSuggestions]   = useState([])
  const [sugLoading, setSugLoading]     = useState(false)
  const [noResults, setNoResults]       = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  // Refs
  const mapRef        = useRef(null)
  const markerRef     = useRef(null)
  const debounceTimer = useRef(null)
  const searchBarRef  = useRef(null)

  // ── Fetch autocomplete suggestions – multi-strategy ─────────────────────
  const fetchSuggestions = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setSuggestions([])
      setShowDropdown(false)
      setNoResults(false)
      return
    }
    const q = query.trim()

    // Cache hit (only non-empty results are ever stored)
    if (suggestionCache[q]) {
      setSuggestions(suggestionCache[q])
      setNoResults(false)
      setShowDropdown(true)
      return
    }

    setSugLoading(true)
    setNoResults(false)
    try {
      const words = q.trim().split(/\s+/).filter(Boolean)
      const sc    = splitStreetCity(q)  // { street, city } split

      // ── Run all strategies in PARALLEL ────────────────────────────────────
      const promises = [
        // S1: full free-text, India-biased, all layers
        queryNominatim(nominatimURL(q, '&countrycodes=in')),

        // S2: full free-text with explicit address layer (best for streets)
        queryNominatim(nominatimURL(q, '&countrycodes=in&layer=address,poi,manmade')),

        // S3: structured search – street + city split (great for "road name city")
        sc ? queryNominatim(nominatimStructuredURL(sc.street, sc.city, '&countrycodes=in')) : Promise.resolve([]),

        // S4: global fallback (non-India addresses)
        queryNominatim(nominatimURL(q)),
      ]

      const allArrays = await Promise.all(promises)
      let results = dedupe(allArrays.flat())

      // ── Fallback strategies (only if still empty/sparse) ──────────────────
      if (results.length < 2 && words.length > 2) {
        // S5: drop first word (POI prefix) and search rest
        const withoutFirst = words.slice(1).join(' ')
        const s5 = await queryNominatim(
          nominatimURL(withoutFirst, '&countrycodes=in&layer=address,poi')
        )
        results = dedupe([...results, ...s5])
      }

      if (results.length < 2 && words.length >= 2) {
        // S6: try each pair of consecutive words as a street query
        const pairQueries = []
        for (let i = 0; i < words.length - 1; i++) {
          pairQueries.push(
            queryNominatim(nominatimURL(`${words[i]} ${words[i + 1]}`, '&countrycodes=in&layer=address'))
          )
        }
        const pairResults = (await Promise.all(pairQueries)).flat()
        results = dedupe([...results, ...pairResults])
      }

      if (results.length === 0) {
        // S7: last resort – settlement/city only search
        const s7 = await queryNominatim(
          nominatimURL(q, '&countrycodes=in&featuretype=settlement')
        )
        results = dedupe([...results, ...s7])
      }

      // ── Rank: streets/roads first, then POI, then areas ───────────────────
      results.sort((a, b) => {
        const roadCls = ['highway', 'road']
        const aIsRoad = roadCls.includes(a.cls)
        const bIsRoad = roadCls.includes(b.cls)
        if (aIsRoad && !bIsRoad) return -1
        if (!aIsRoad && bIsRoad) return 1
        return 0
      })

      const final = results.slice(0, 8)

      // Cache only non-empty results
      if (final.length > 0) suggestionCache[q] = final

      setSuggestions(final)
      setNoResults(final.length === 0)
      setShowDropdown(true)
    } catch {
      setSuggestions([])
      setNoResults(false)
    } finally {
      setSugLoading(false)
    }
  }, [])

  // ── Debounced input handler ───────────────────────────────────────────────
  const handleSearchChange = (e) => {
    const val = e.target.value
    setSearchInput(val)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => fetchSuggestions(val), 350)
  }

  // ── Select a suggestion → update map immediately ──────────────────────────
  const handleSelectSuggestion = (item) => {
    setSearchInput(item.shortName)
    setSuggestions([])
    setShowDropdown(false)
    setNoResults(false)
    recalculateRisk(item.lat, item.lon)
  }

  // ── Manual search (Enter / Analyze button) ────────────────────────────────
  const searchPlace = async () => {
    if (!searchInput.trim()) return
    setSuggestions([])
    setShowDropdown(false)
    setLoading(true)
    try {
      const res  = await fetch(
        `${API_BASE_URL}/api/search-location?q=${encodeURIComponent(searchInput.trim())}`
      )
      const data = await res.json()
      if (!data.success) {
        setNoResults(true)
        setLoading(false)
        return
      }
      await recalculateRisk(data.lat, data.lon)
    } catch (err) {
      console.error('Search error:', err)
      setNoResults(true)
      setLoading(false)
    }
  }

  // ── Risk calculation + map update ─────────────────────────────────────────
  const recalculateRisk = async (lat, lon) => {
    setLoading(true)
    try {
      const res  = await fetch(`${API_BASE_URL}/track-location`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ user_id: 'anonymous', latitude: lat, longitude: lon })
      })
      const data = await res.json()
      updateUIWithData({
        lat, lon,
        location_name: data.location_name,
        risk_status:   data.risk_status,
        risk_level:    data.risk_level,
        markerColor:
          data.risk_level === 'High'
            ? 'red'
            : data.risk_level === 'Medium' || data.risk_level === 'Moderate'
            ? 'yellow'
            : 'green'
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setLocating(false)
    }
  }

  // ── Update React state + Leaflet map ─────────────────────────────────────
  const updateUIWithData = (data) => {
    setCoords({ lat: data.lat, lon: data.lon })
    setLocationName(data.location_name || 'Selected Location')

    let color = '#00666c'
    let val   = 15
    if (data.risk_level === 'High' || data.risk_level === 'Severe') {
      color = '#b31b25'; val = 95
    } else if (data.risk_level === 'Medium' || data.risk_level === 'Moderate') {
      color = '#d9a400'; val = 60
    }

    setRiskData({
      percentage:    val,
      floodRisk:     data.risk_status?.includes('Flood')     ? data.risk_level : 'LOW',
      landslideRisk: data.risk_status?.includes('Landslide') ? data.risk_level : 'LOW',
      safetyPulse:   data.risk_level === 'High' ? 'DANGER' : 'ACTIVE',
      color
    })

    if (!mapRef.current) return

    // Remove old marker
    if (markerRef.current) {
      mapRef.current.removeLayer(markerRef.current)
      markerRef.current = null
    }

    const markerColor = data.markerColor || 'blue'
    const customIcon  = window.L.icon({
      iconUrl:   `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${markerColor}.png`,
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize:  [25, 41],
      iconAnchor:[12, 41],
      popupAnchor:[1, -34],
      shadowSize:[41, 41]
    })

    markerRef.current = window.L.marker([data.lat, data.lon], { icon: customIcon })
      .addTo(mapRef.current)

    markerRef.current.bindPopup(`
      <div style="font-family:Arial,sans-serif;min-width:160px;">
        <strong style="display:block;margin-bottom:4px;">${data.location_name || 'Location'}</strong>
        Risk: ${data.risk_status || 'Safe'}<br/>
        Level: <b style="color:${markerColor === 'yellow' ? '#d9a400' : markerColor};">${data.risk_level || 'Low'}</b>
      </div>
    `).openPopup()

    // Smooth fly-to animation
    mapRef.current.flyTo([data.lat, data.lon], 14, { animate: true, duration: 1.2 })
  }

  // ── Initialize Leaflet map ────────────────────────────────────────────────
  useEffect(() => {
    const initMap = () => {
      if (!window.L) return
      const container = document.getElementById('full-interactive-map')
      if (!container || mapRef.current) return

      const mapInstance = window.L.map('full-interactive-map', { zoomControl: false })
        .setView([coords.lat, coords.lon], 5)

      window.L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri',
          maxZoom: 19
        }
      ).addTo(mapInstance)

      window.L.control.zoom({ position: 'topleft' }).addTo(mapInstance)
      mapRef.current = mapInstance

      // Restore saved tracking data or default risk
      const saved = localStorage.getItem('latest_tracking_data')
      if (saved) {
        try {
          updateUIWithData(JSON.parse(saved))
        } catch {
          recalculateRisk(coords.lat, coords.lon)
        }
      } else {
        recalculateRisk(coords.lat, coords.lon)
      }

      // Click on map → recalculate risk
      mapInstance.on('click', (e) => {
        recalculateRisk(e.latlng.lat, e.latlng.lng)
      })
    }

    if (!document.querySelector('link[href*="leaflet.css"]')) {
      const link = document.createElement('link')
      link.rel   = 'stylesheet'
      link.href  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }
    if (!window.L) {
      const script    = document.createElement('script')
      script.src      = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.async    = true
      script.onload   = () => setTimeout(initMap, 100)
      document.head.appendChild(script)
    } else {
      setTimeout(initMap, 100)
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Close dropdown when clicking outside search bar ───────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (searchBarRef.current && !searchBarRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── "Use my location" ─────────────────────────────────────────────────────
  const locateUser = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude } }) => {
        recalculateRisk(latitude, longitude)
      },
      (err) => {
        console.error('Geolocation error:', err)
        alert("Couldn't retrieve location. Please allow permissions.")
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // ── Circular gauge values ─────────────────────────────────────────────────
  const r   = 48
  const circ = 2 * Math.PI * r

  return (
    <div className="bg-surface text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container">
      <NavBar />

      <main className="relative h-[calc(100vh-68px)] w-full">
        {/* ── Map Canvas ── */}
        <div id="full-interactive-map" className="absolute inset-0 z-0" />

        {/* ── Top Search Bar ── */}
        <div
          ref={searchBarRef}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] w-[92%] max-w-xl"
        >
          {/* Input row */}
          <div className="bg-white rounded-2xl shadow-2xl flex items-center px-4 py-2 border border-gray-200 gap-2">
            <span className="material-symbols-outlined text-gray-400 text-[20px]">search</span>
            <input
              type="text"
              className="flex-grow bg-transparent border-none outline-none focus:ring-0 text-sm py-1 font-body text-gray-800 placeholder-gray-400"
              placeholder="Enter any place (e.g. Saidapet, Vellore)"
              value={searchInput}
              onChange={handleSearchChange}
              onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') searchPlace()
                if (e.key === 'Escape') setShowDropdown(false)
              }}
              aria-label="Location search"
            />
            {/* inline spinner while fetching suggestions */}
            {sugLoading && (
              <span className="w-4 h-4 border-2 border-[#00666c] border-t-transparent rounded-full animate-spin flex-shrink-0" />
            )}
            <button
              onClick={searchPlace}
              className="bg-[#00666c] text-white px-4 py-1.5 rounded-xl font-bold text-sm tracking-wide hover:bg-[#004d52] transition-colors flex-shrink-0"
            >
              Analyze
            </button>
          </div>

          {/* ── Dropdown suggestions ── */}
          {showDropdown && (suggestions.length > 0 || noResults) && (
            <div className="bg-white mt-1 rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-dropdown">
              {noResults ? (
                <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500">
                  <span className="material-symbols-outlined text-[18px]">location_off</span>
                  No results found — try partial name, street or city.
                </div>
              ) : (
                suggestions.map((item, idx) => {
                  // Decide badge label + color
                  const cls = item.cls || ''
                  const type = item.type || ''
                  let badge = null
                  let badgeColor = 'bg-gray-100 text-gray-500'
                  if (cls === 'highway' || type.match(/road|residential|primary|secondary|tertiary|service|street|unclassified/)) {
                    badge = 'Street'; badgeColor = 'bg-blue-50 text-blue-600'
                  } else if (cls === 'amenity' || type.match(/school|hospital|university|college|church|mosque|temple|bank|restaurant/)) {
                    badge = 'Place'; badgeColor = 'bg-purple-50 text-purple-600'
                  } else if (cls === 'place' || type.match(/city|town|village|suburb|hamlet|locality/)) {
                    badge = 'City'; badgeColor = 'bg-green-50 text-green-600'
                  } else if (cls === 'boundary') {
                    badge = 'Area'; badgeColor = 'bg-yellow-50 text-yellow-700'
                  }

                  return (
                    <button
                      key={idx}
                      className="w-full text-left px-4 py-2.5 flex items-start gap-3 hover:bg-[#f0fafa] active:bg-[#e0f5f5] transition-colors border-b border-gray-50 last:border-0 group"
                      onClick={() => handleSelectSuggestion(item)}
                    >
                      {/* Dynamic icon by result type */}
                      <span className="material-symbols-outlined text-[#00666c] text-[18px] mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform">
                        {item.icon || 'location_on'}
                      </span>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-sm text-gray-800 leading-snug line-clamp-2 font-medium">
                          {item.shortName}
                        </span>
                        {badge && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md w-fit uppercase tracking-wide ${badgeColor}`}>
                            {badge}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>

        {/* ── Bottom Coordinates Pill ── */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#e8ebe6]/95 backdrop-blur-md px-6 py-3 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center gap-4 md:gap-8 border border-white/40 z-[500]">
          <div className="flex items-center gap-2 text-[#2a4540]">
            <span className="material-symbols-outlined text-lg">touch_app</span>
            <span className="text-sm font-semibold tracking-wide">Click on map to select a location</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-[#627a75] uppercase tracking-widest leading-tight">Latitude</span>
              <span className="text-sm font-black text-[#1b3b36] font-mono">
                {coords.lat.toFixed(4)}° {coords.lat >= 0 ? 'N' : 'S'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-[#627a75] uppercase tracking-widest leading-tight">Longitude</span>
              <span className="text-sm font-black text-[#1b3b36] font-mono">
                {coords.lon.toFixed(4)}° {coords.lon >= 0 ? 'E' : 'W'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Legend ── */}
        <div className="absolute top-[5.5rem] left-4 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-outline-variant/30 z-[500]">
          <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">Risk Legend</h3>
          <div className="flex flex-col gap-2">
            {[
              { color: 'bg-green-500',  label: 'Low Risk' },
              { color: 'bg-yellow-400', label: 'Medium Risk' },
              { color: 'bg-red-600',    label: 'High Risk' }
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${color} shadow-sm border border-white`} />
                <span className="text-sm font-bold text-on-surface">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Left Controls ── */}
        <div className="absolute top-[5.5rem] left-4 mt-32 flex flex-col gap-3 z-[500]">
          {/* My Location button */}
          <div className="bg-white/70 backdrop-blur-[20px] p-2 rounded-xl shadow-2xl border border-white/30">
            <button
              onClick={locateUser}
              disabled={locating}
              title="Use my current location"
              className="w-12 h-12 flex items-center justify-center rounded-lg bg-primary-container text-on-primary-container hover:bg-[#00666c] hover:text-white transition-all shadow-sm disabled:opacity-60"
            >
              {locating
                ? <span className="w-5 h-5 border-2 border-[#00666c] border-t-transparent rounded-full animate-spin" />
                : <span className="material-symbols-outlined">my_location</span>
              }
            </button>
          </div>

          {/* Layer / overlay controls */}
          <div className="bg-white/70 backdrop-blur-[20px] p-2 rounded-xl flex flex-col gap-2 shadow-2xl border border-white/30">
            <button className="w-12 h-12 flex items-center justify-center rounded-lg bg-surface-container-lowest text-primary hover:bg-primary hover:text-white transition-all shadow-sm">
              <span className="material-symbols-outlined" title="Map Layers">layers</span>
            </button>
            <button className="w-12 h-12 flex items-center justify-center rounded-lg bg-surface-container-lowest text-tertiary hover:bg-tertiary hover:text-white transition-all shadow-sm">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }} title="Flood Risk">water_drop</span>
            </button>
          </div>
        </div>

        {/* ── Right Analytics Panel ── */}
        <div className="absolute top-4 right-4 w-[320px] flex-col gap-4 pointer-events-none hidden md:flex z-[500]">
          {/* Local Risk Profile */}
          <div className="bg-[#e4e4dd]/95 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-white/50 pointer-events-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-['Plus_Jakarta_Sans'] font-extrabold text-[#112a46] text-[1.05rem]">
                Local Risk Profile
              </h2>
              <span className="text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter bg-[#8aff8a] text-[#004d00]">
                Live Status
              </span>
            </div>

            {/* Circular Gauge */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative w-[130px] h-[130px] flex items-center justify-center bg-white/40 rounded-full shadow-[inset_0_2px_8px_rgba(0,0,0,0.05)]">
                <svg className="w-[110px] h-[110px] -rotate-90">
                  <circle cx="55" cy="55" r={r} fill="transparent" stroke="white" strokeWidth="8" />
                  <circle
                    cx="55" cy="55" r={r} fill="transparent"
                    stroke={riskData.color}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    strokeDashoffset={circ - (riskData.percentage / 100) * circ}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ color: riskData.color }}>
                  <span className="text-3xl font-black">{riskData.percentage}%</span>
                  <span className="text-[8px] font-extrabold uppercase tracking-widest opacity-80 -mt-1">Saturation</span>
                </div>
              </div>
            </div>

            {/* Risk rows */}
            <div className="space-y-3 w-full">
              <div className="bg-[#7defea] px-4 py-3 rounded-xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3 text-[#004d40]">
                  <span className="material-symbols-outlined text-[20px]">water</span>
                  <span className="text-[13px] font-extrabold">Flood Risk</span>
                </div>
                <span className="text-[9px] font-black px-2 py-1.5 rounded bg-white/60 text-[#004d40] tracking-wider uppercase">
                  {riskData.floodRisk?.toUpperCase() || 'LOW'}
                </span>
              </div>

              <div className="bg-[#ffcda7] px-4 py-3 rounded-xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3 text-[#7a3b00]">
                  <span className="material-symbols-outlined text-[20px]">landscape</span>
                  <span className="text-[13px] font-extrabold">Landslide</span>
                </div>
                <span className="text-[9px] font-black px-2 py-1.5 rounded bg-white/60 text-[#7a3b00] tracking-wider uppercase">
                  {riskData.landslideRisk?.toUpperCase() || 'LOW'}
                </span>
              </div>

              <div className="bg-[#8aff8a] px-4 py-3 rounded-xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3 text-[#004d00]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#004d00] shadow-[0_0_0_3px_rgba(0,77,0,0.15)] ml-1 mr-1" />
                  <span className="text-[13px] font-extrabold">Safety Pulse</span>
                </div>
                <span className="text-[10px] font-black px-2 py-1.5 text-[#004d00] tracking-wider uppercase">
                  {riskData.safetyPulse || 'ACTIVE'}
                </span>
              </div>
            </div>
          </div>

          {/* Regional Intelligence */}
          <div className="bg-[#dce0d9]/95 backdrop-blur-md p-5 rounded-3xl shadow-xl border border-white/40 pointer-events-auto">
            <h3 className="text-[10px] font-extrabold text-[#526066] uppercase tracking-[0.15em] mb-4">Regional Intelligence</h3>
            <div className="flex items-start gap-4">
              <div className="w-[52px] h-[52px] rounded-xl bg-gray-400 overflow-hidden flex-shrink-0 shadow-inner">
                <img
                  src="https://images.unsplash.com/photo-1527482797697-8795b05a13fe?q=80&w=120&auto=format&fit=crop"
                  alt="Storm"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col gap-1.5 justify-center mt-1">
                <p className="text-[12px] font-extrabold text-[#112a46] leading-[1.3]">
                  Pre-monsoon system developing in Bay of Bengal
                </p>
                <p className="text-[9px] font-bold text-[#526066]">Updated 14 mins ago</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Full Loading Overlay (risk analysis) ── */}
      {loading && (
        <div className="fixed inset-0 bg-[#112a46]/20 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-[#f4f6ff] px-10 py-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#00666c] border-t-transparent rounded-full animate-spin" />
            <p className="font-headline font-bold text-[#112a46]">Analyzing Risk Data…</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Map
