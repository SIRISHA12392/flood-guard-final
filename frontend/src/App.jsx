import React, { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import Map from './pages/Map'
import Results from './pages/Results'
import Logs from './pages/Logs'
import Loading from './components/Loading'
import HydrologicalStability from './Hydrologicalstability'
import TerrainIntegrity from './TerrainIntegrity'
import SafeZones from "./SafeZones"; 
import BhuvanView from './pages/BhuvanView';
import ChatBot from './components/Chatbot/ChatBot'
import BottomNav from './components/BottomNav'
import { startLocationTracking } from './utils/location'
import { trackLocationAPI } from './services/api'
import './index.css'

// Configure API base URL (Vite uses import.meta.env, not process.env)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
window.__API_BASE_URL__ = API_BASE_URL

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const stopTrackingRef = useRef(null)   // holds the clearWatch cleanup fn
  const deferredPromptRef = useRef(null) // holds the beforeinstallprompt event
  const [showInstallBanner, setShowInstallBanner] = useState(false)

  // ── Location tracking ─────────────────────────────────────────────────────
  const startTracking = () => {
    if (stopTrackingRef.current) return  // already tracking
    localStorage.setItem('manual_tracking', 'true') // Force UI state when started globally
    const stop = startLocationTracking(
      async ({ lat, lon }) => {
        window.__lastBackgroundCoords = { latitude: lat, longitude: lon }
        try {
          if (typeof window.__handleBackgroundLocation === 'function' && window.__activeHomeMounted) {
            await window.__handleBackgroundLocation(lat, lon)
          } else {
            await trackLocationAPI.track(lat, lon)
          }
        } catch (err) {
          console.warn('Track-location error:', err.message)
        }
      },
      (errMsg) => console.warn('Geolocation error:', errMsg)
    )
    stopTrackingRef.current = stop
    window.__stopGlobalTrackingFn = stop
  }

  const stopTracking = () => {
    if (stopTrackingRef.current) {
      stopTrackingRef.current()
      stopTrackingRef.current = null
      window.__stopGlobalTrackingFn = null
      localStorage.setItem('manual_tracking', 'false')
    }
  }

  useEffect(() => {
    window.__startGlobalTracking = startTracking
    window.__stopGlobalTrackingFn = stopTracking
  }, [])

  // ── PWA Install Prompt ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      deferredPromptRef.current = e
      // Only show if user hasn't dismissed before this session
      if (!sessionStorage.getItem('pwa-install-dismissed')) {
        setShowInstallBanner(true)
      }
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Restore session from localStorage on mount
  useEffect(() => {
    // Apply theme from localStorage
    const savedTheme = localStorage.getItem('theme') || 'light'
    if (savedTheme === 'dark') {
      document.body.classList.add('dark', 'dark-mode')
      document.documentElement.classList.add('dark')
    } else {
      document.body.classList.remove('dark', 'dark-mode')
      document.documentElement.classList.remove('dark')
    }

    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser))
        setIsLoggedIn(true)
        startTracking()           // automatically track on page refresh
      } catch {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
    setLoading(false)
    return () => stopTracking()   // cleanup on unmount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    localStorage.setItem('manual_tracking', 'true') // start continuous tracking by default after login
    setUser(userData)
    setIsLoggedIn(true)
    startTracking()     // start GPS tracking after login
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setIsLoggedIn(false)
    stopTracking()      // stop GPS tracking after logout
  }

  if (loading) {
    return <Loading fullScreen message="Loading Application..." />
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={isLoggedIn ? <Navigate to="/home" replace /> : <Login onLogin={handleLogin} />}
        />
        <Route
          path="/register"
          element={isLoggedIn ? <Navigate to="/home" replace /> : <Register />}
        />

        {/* Protected routes */}
        <Route
          path="/home"
          element={isLoggedIn ? <Home user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/map"
          element={isLoggedIn ? <Map /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/results"
          element={isLoggedIn ? <Results /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/logs"
          element={isLoggedIn ? <Logs /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/hydrological-stability"
          element={isLoggedIn ? <HydrologicalStability /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/terrain-integrity"
          element={isLoggedIn ? <TerrainIntegrity /> : <Navigate to="/login" replace />}
        />
        <Route 
          path="/safe-zones" 
          element={<SafeZones />} />
        <Route
          path="/bhuvan"
          element={isLoggedIn ? <BhuvanView /> : <Navigate to="/login" replace />}
        />
 

        {/* Default redirect */}
        <Route
          path="/"
          element={<Navigate to={isLoggedIn ? "/home" : "/login"} replace />}
        />
        <Route
          path="*"
          element={<Navigate to={isLoggedIn ? "/home" : "/login"} replace />}
        />
      </Routes>
      
      {/* PWA Install Banner */}
      {showInstallBanner && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 99999,
            background: 'linear-gradient(135deg, #00666c, #00888e)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '12px 20px',
            boxShadow: '0 4px 20px rgba(0,102,108,0.35)',
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.88rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/pwa-192x192.png" alt="Flood Guard" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontWeight: 700 }}>Install Flood Guard on your device</p>
              <p style={{ margin: 0, fontSize: '0.78rem', opacity: 0.85 }}>Get instant access &amp; offline alerts</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button
              onClick={async () => {
                if (deferredPromptRef.current) {
                  deferredPromptRef.current.prompt()
                  const { outcome } = await deferredPromptRef.current.userChoice
                  if (outcome === 'accepted') setShowInstallBanner(false)
                  deferredPromptRef.current = null
                }
              }}
              style={{
                background: '#fff',
                color: '#00666c',
                border: 'none',
                borderRadius: 8,
                padding: '6px 16px',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              Install
            </button>
            <button
              onClick={() => {
                setShowInstallBanner(false)
                sessionStorage.setItem('pwa-install-dismissed', '1')
              }}
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 8,
                padding: '6px 12px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Global Chatbot UI */}
      <ChatBot />
      
      {/* Global Bottom Navigation */}
      <BottomNav />
      
    </BrowserRouter>
  )
}

export default App
