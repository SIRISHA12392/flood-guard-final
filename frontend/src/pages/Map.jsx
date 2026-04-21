import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import NavBar from '../components/NavBar'
import './Map.css'

function Map() {
  const navigate = useNavigate()
  const location = useLocation()
  
  // Default values
  const [coords, setCoords] = useState({ 
    lat: location.state?.lat || 20.5937, 
    lon: location.state?.lon || 78.9629 
  })
  
  const [loading, setLoading] = useState(false)
  
  const [riskData, setRiskData] = useState({
    percentage: 15,
    floodRisk: 'LOW',
    landslideRisk: 'LOW',
    safetyPulse: 'ACTIVE',
    color: '#006a2c'
  })
  
  const [locationName, setLocationName] = useState('Central India')
  const [searchInput, setSearchInput] = useState('')
  
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  const searchPlace = async () => {
    if (!searchInput.trim()) return;
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/search-location?q=${encodeURIComponent(searchInput.trim())}`);
      const data = await response.json();
      if (!data.success) {
        alert(data.error || 'Location not found');
        setLoading(false);
        return;
      }
      await recalculateRisk(data.lat, data.lon);
    } catch (err) {
      console.error('Search error:', err);
      alert('Error searching location');
      setLoading(false);
    }
  }

  // Recalculate Mock Risk for manual clicks
  const recalculateRisk = async (lat, lon) => {
    setLoading(true)
    try {
      const response = await fetch(`http://localhost:5000/track-location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: 'anonymous', latitude: lat, longitude: lon })
      })
      const data = await response.json()
      updateUIWithData({
        lat, lon,
        location_name: data.location_name,
        risk_status: data.risk_status,
        risk_level: data.risk_level,
        markerColor: data.risk_level === 'High' ? 'red' : (data.risk_level === 'Medium' || data.risk_level === 'Moderate' ? 'yellow' : 'green')
      })
    } catch(err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const updateUIWithData = (data) => {
    setCoords({ lat: data.lat, lon: data.lon })
    setLocationName(data.location_name || 'Selected Location')
    
    let color = '#00666c' // primary low limit
    let val = 15;
    if (data.risk_level === 'High' || data.risk_level === 'Severe') { 
        color = '#b31b25'; val = 95; 
    }
    else if (data.risk_level === 'Medium' || data.risk_level === 'Moderate') { 
        color = '#d9a400'; val = 60; 
    }

    setRiskData({
      percentage: val,
      floodRisk: data.risk_status?.includes('Flood') ? data.risk_level : 'LOW',
      landslideRisk: data.risk_status?.includes('Landslide') ? data.risk_level : 'LOW',
      safetyPulse: data.risk_level === 'High' ? 'DANGER' : 'ACTIVE',
      color: color
    })

    if (!mapRef.current) return;
    
    if (markerRef.current) {
      mapRef.current.removeLayer(markerRef.current)
    }
    
    let markerColor = data.markerColor || 'blue'
    
    const customIcon = window.L.icon({
      iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${markerColor}.png`,
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    })

    markerRef.current = window.L.marker([data.lat, data.lon], { icon: customIcon }).addTo(mapRef.current)
    
    markerRef.current.bindPopup(`
      <div style="font-family: Arial, sans-serif; min-width: 150px;">
        <strong style="display:block; margin-bottom: 4px;">Location: ${data.location_name}</strong>
        Risk Status: ${data.risk_status || 'Safe'}<br/>
        Risk Level: <b style="color: ${markerColor === 'yellow' ? '#d9a400' : markerColor};">${data.risk_level || 'Low'}</b>
      </div>
    `).openPopup()

    mapRef.current.setView([data.lat, data.lon], 16)
  }

  useEffect(() => {
    let mapInstance = null

    const initMap = () => {
      if (!window.L) return
      
      const mapContainer = document.getElementById('full-interactive-map')
      if (!mapContainer || mapRef.current) return

      // Setup map
      mapInstance = window.L.map('full-interactive-map', {
        zoomControl: false 
      }).setView([coords.lat, coords.lon], 5)

      window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19
      }).addTo(mapInstance)

      window.L.control.zoom({ position: 'topleft' }).addTo(mapInstance)
      mapRef.current = mapInstance

      // Read from LocalStorage FIRST for synchronization
      const savedData = localStorage.getItem('latest_tracking_data')
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData)
          updateUIWithData(parsed)
        } catch (e) {
          recalculateRisk(coords.lat, coords.lon)
        }
      } else {
        recalculateRisk(coords.lat, coords.lon)
      }

      // Map Click Handler
      mapInstance.on('click', async (e) => {
        const newLat = e.latlng.lat
        const newLon = e.latlng.lng
        recalculateRisk(newLat, newLon)
      })
    }

    if (!document.querySelector('link[href*="leaflet.css"]')) {
      const leafletCSS = document.createElement('link')
      leafletCSS.rel = 'stylesheet'
      leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(leafletCSS)
    }

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
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  const locateUser = () => {
    if (navigator.geolocation && mapRef.current) {
      setLoading(true)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          recalculateRisk(latitude, longitude)
        },
        (error) => {
          console.error("Error detecting location", error)
          alert("Couldn't retrieve location. Please allow permissions.")
          setLoading(false)
        }
      )
    } else {
      alert("Geolocation is not supported by your browser.")
    }
  }

  const radius = 56
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (riskData.percentage / 100) * circumference

  return (
    <div className="bg-surface text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container">
      {/* Top Navigation Bar */}
      <NavBar />

      <main className="relative h-[calc(100vh-68px)] w-full">
        {/* Main Map Canvas */}
        <div id="full-interactive-map" className="absolute inset-0 z-0"></div>

        {/* Top Search Bar Overlay */}
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-white rounded-full shadow-2xl flex items-center px-4 py-2 border border-gray-200 z-[500] w-[90%] max-w-lg">
          <span className="material-symbols-outlined text-gray-400 mr-2">search</span>
          <input
            type="text"
            className="flex-grow bg-transparent border-none outline-none focus:ring-0 text-sm py-1 font-body text-gray-800"
            placeholder="enter the place"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') searchPlace() }}
          />
          <button
            onClick={searchPlace}
            className="bg-[#00666c] text-white px-5 py-1.5 rounded-full font-bold text-sm tracking-wide ml-2 hover:bg-[#004d52] transition-colors"
          >
            Analyze
          </button>
        </div>

        {/* Bottom floating pill */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-[#e8ebe6]/95 backdrop-blur-md px-6 py-3 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center gap-4 md:gap-8 border border-white/40 z-[500]">
          <div className="flex items-center gap-2 text-[#2a4540]">
            <span className="material-symbols-outlined text-lg">mouse</span>
            <span className="text-sm font-semibold tracking-wide">Right-click on map to select a location</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-[#627a75] uppercase tracking-widest leading-tight">Latitude</span>
              <span className="text-sm font-black text-[#1b3b36] font-mono">{coords.lat.toFixed(4)}° {coords.lat >= 0 ? 'N' : 'S'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-[#627a75] uppercase tracking-widest leading-tight">Longitude</span>
              <span className="text-sm font-black text-[#1b3b36] font-mono">{coords.lon.toFixed(4)}° {coords.lon >= 0 ? 'E' : 'W'}</span>
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="absolute top-8 left-16 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-outline-variant/30 z-[500]">
          <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">Risk Legend</h3>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500 shadow-sm border border-white"></span>
              <span className="text-sm font-bold text-on-surface">Low Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-400 shadow-sm border border-white"></span>
              <span className="text-sm font-bold text-on-surface">Medium Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-600 shadow-sm border border-white"></span>
              <span className="text-sm font-bold text-on-surface">High Risk</span>
            </div>
          </div>
        </div>

        {/* Floating UI Overlays */}
        <div className="absolute top-48 left-8 flex flex-col gap-4 z-[500]">
          <div className="bg-white/70 backdrop-blur-[20px] p-2 rounded-xl flex flex-col gap-2 shadow-2xl border border-white/30">
            <button onClick={locateUser} className="w-12 h-12 flex items-center justify-center rounded-lg bg-primary-container text-on-primary-container hover:bg-primary hover:text-white transition-all shadow-sm">
              <span className="material-symbols-outlined" title="Locate Me">my_location</span>
            </button>
          </div>
          <div className="bg-white/70 backdrop-blur-[20px] p-2 rounded-xl flex flex-col gap-2 shadow-2xl border border-white/30">
            <button className="w-12 h-12 flex items-center justify-center rounded-lg bg-surface-container-lowest text-primary hover:bg-primary hover:text-white transition-all shadow-sm">
              <span className="material-symbols-outlined" title="Map Layers">layers</span>
            </button>
            <button className="w-12 h-12 flex items-center justify-center rounded-lg bg-surface-container-lowest text-tertiary hover:bg-tertiary hover:text-white transition-all shadow-sm">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }} title="Flood Risk">water_drop</span>
            </button>
          </div>
        </div>
        
        {/* Right Side: Analytics Panel */}
        <div className="absolute top-8 right-8 w-[340px] flex flex-col gap-4 pointer-events-none hidden md:flex z-[500]">
          {/* Local Risk Profile Card */}
          <div className="bg-[#e4e4dd]/95 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-white/50 pointer-events-auto mix-blend-normal">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-['Plus_Jakarta_Sans'] font-extrabold text-[#112a46] text-[1.1rem]">Local Risk Profile</h2>
              <span className="text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter bg-[#8aff8a] text-[#004d00]">Live Status</span>
            </div>
            
            <div className="flex flex-col items-center mb-8">
              <div className="relative w-[130px] h-[130px] flex items-center justify-center bg-white/40 rounded-full shadow-[inset_0_2px_8px_rgba(0,0,0,0.05)]">
                <svg className="w-[110px] h-[110px] transform -rotate-90">
                  <circle className="text-white" cx="55" cy="55" fill="transparent" r="48" stroke="currentColor" strokeWidth="8"></circle>
                  <circle 
                    className="transition-all duration-1000 ease-out" 
                    cx="55" cy="55" fill="transparent" r="48" 
                    stroke={riskData.color || "#00666c"} 
                    strokeDasharray={2 * Math.PI * 48} 
                    strokeDashoffset={(2 * Math.PI * 48) - ((riskData.percentage || 72) / 100) * (2 * Math.PI * 48)} 
                    strokeWidth="8"
                    strokeLinecap="round"
                   ></circle>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center mt-1" style={{ color: riskData.color || '#112a46' }}>
                  <span className="text-3xl font-black">{riskData.percentage || 72}%</span>
                  <span className="text-[8px] font-extrabold uppercase tracking-widest opacity-80 -mt-1">Saturation</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3 w-full">
              {/* Flood */}
              <div className="bg-[#7defea] px-4 py-3 rounded-xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3 text-[#004d40]">
                  <span className="material-symbols-outlined text-[20px]">water</span>
                  <span className="text-[13px] font-extrabold">Flood Risk</span>
                </div>
                <span className="text-[9px] font-black px-2 py-1.5 rounded bg-white/60 text-[#004d40] tracking-wider uppercase">
                  {riskData.floodRisk?.toUpperCase() || 'MODERATE'}
                </span>
              </div>
              
              {/* Landslide */}
              <div className="bg-[#ffcda7] px-4 py-3 rounded-xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3 text-[#7a3b00]">
                  <span className="material-symbols-outlined text-[20px]">landscape</span>
                  <span className="text-[13px] font-extrabold">Landslide</span>
                </div>
                <span className="text-[9px] font-black px-2 py-1.5 rounded bg-white/60 text-[#7a3b00] tracking-wider uppercase">
                  {riskData.landslideRisk?.toUpperCase() || 'LOW'}
                </span>
              </div>
              
              {/* Safety Pulse */}
              <div className="bg-[#8aff8a] px-4 py-3 rounded-xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3 text-[#004d00]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#004d00] shadow-[0_0_0_3px_rgba(0,77,0,0.15)] ml-1 mr-1"></span>
                  <span className="text-[13px] font-extrabold">Safety Pulse</span>
                </div>
                <span className="text-[10px] font-black px-2 py-1.5 text-[#004d00] tracking-wider uppercase">
                  {riskData.safetyPulse || 'ACTIVE'}
                </span>
              </div>
            </div>
          </div>

          {/* Regional Intelligence Card */}
          <div className="bg-[#dce0d9]/95 backdrop-blur-md p-5 rounded-3xl shadow-xl border border-white/40 pointer-events-auto">
            <h3 className="text-[10px] font-extrabold text-[#526066] uppercase tracking-[0.15em] mb-4">Regional Intelligence</h3>
            <div className="flex items-start gap-4">
              <div className="w-[52px] h-[52px] rounded-xl bg-gray-400 overflow-hidden flex-shrink-0 shadow-inner">
                 <img src="https://images.unsplash.com/photo-1527482797697-8795b05a13fe?q=80&w=120&auto=format&fit=crop" alt="Storm" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col gap-1.5 justify-center mt-1">
                <p className="text-[12px] font-extrabold text-[#112a46] leading-[1.3]">Pre-monsoon system developing in Bay of Bengal</p>
                <p className="text-[9px] font-bold text-[#526066]">Updated 14 mins ago</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-[#112a46]/20 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-[#f4f6ff] p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#00666c] border-t-transparent rounded-full animate-spin"></div>
            <p className="font-headline font-bold text-[#112a46]">Analyzing Risk Data...</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Map
