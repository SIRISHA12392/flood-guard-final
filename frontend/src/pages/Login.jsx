import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import './Login.css'

// ─── Flood Guard Login Page ────────────────────────────────────────────
// UI design: Stitch "Access Guardian Portal" design
// Logic: POST /api/auth/login → store token → navigate to /home
// ────────────────────────────────────────────────────────────────────────────

function Login({ onLogin }) {
  const [username, setUsername]         = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]               = useState('')
  const [loading, setLoading]           = useState(false)
  const navigate                        = useNavigate()

  // ── Form submission handler ──────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Input validation
    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password.')
      return
    }

    setLoading(true)

    try {
      // POST to Flask backend auth endpoint
      const response = await axios.post('/api/auth/login', {
        username: username.trim(),
        password: password,
      })

      if (response.data.success) {
        // Persist session — call parent handler from App.jsx
        onLogin(response.data.token, response.data.user)
        navigate('/home')
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Invalid username or password. Please try again.')
      } else if (err.response?.data?.error) {
        setError(err.response.data.error)
      } else {
        setError('Login failed. Please check your connection and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    // ── Full-page gradient background ────────────────────────────────────
    <main className="fg-login-bg">

      {/* Ambient blurred blobs */}
      <div className="fg-blob fg-blob-top" />
      <div className="fg-blob fg-blob-bottom" />

      <div className="fg-login-wrapper">

        {/* ── Branding Header ─────────────────────────────────────────── */}
        <div className="fg-brand">
          <h1 className="fg-brand-title">Flood Guard</h1>
          <p className="fg-brand-sub">REAL-TIME ENVIRONMENTAL INTELLIGENCE</p>
        </div>

        {/* ── Login Card ──────────────────────────────────────────────── */}
        <div className="fg-card">
          <div className="fg-card-header">
            <h2 className="fg-card-title">Access Guardian Portal</h2>
            <p className="fg-card-sub">Enter your credentials to monitor active risks.</p>
          </div>

          <form onSubmit={handleSubmit} className="fg-form" noValidate>

            {/* Error message banner */}
            {error && (
              <div className="fg-error-banner" role="alert">
                <span className="material-symbols-outlined fg-error-icon">error</span>
                {error}
              </div>
            )}

            {/* ── Username ──────────────────────────────────────────── */}
            <div className="fg-field-group">
              <label className="fg-label" htmlFor="username">Username</label>
              <div className="fg-input-wrap">
                <span className="material-symbols-outlined fg-input-icon">person</span>
                <input
                  id="username"
                  className="fg-input"
                  type="text"
                  placeholder="e.g. risk_officer_01"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            {/* ── Password ──────────────────────────────────────────── */}
            <div className="fg-field-group">
              <div className="fg-field-header">
                <label className="fg-label" htmlFor="password">Password</label>
                <a className="fg-forgot" href="#">Forgot Access?</a>
              </div>
              <div className="fg-input-wrap">
                <span className="material-symbols-outlined fg-input-icon">lock</span>
                <input
                  id="password"
                  className="fg-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="fg-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* ── Submit Button ─────────────────────────────────────── */}
            <div className="fg-btn-wrap">
              <button
                type="submit"
                className={`fg-btn-primary ${loading ? 'fg-btn-loading' : ''}`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="fg-spinner" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <span>Secure Sign In</span>
                    <span className="material-symbols-outlined fg-btn-arrow">arrow_forward</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* ── Card Footer ───────────────────────────────────────────── */}
          <div className="fg-card-footer">
            <p className="fg-footer-text">New to the monitoring system?</p>
            <Link to="/register" className="fg-signup-link">
              Sign Up for Alert Access
              <span className="fg-link-underline" />
            </Link>
          </div>
        </div>

        {/* ── Meta / Trust Badges ──────────────────────────────────────── */}
        <div className="fg-meta">
          <div className="fg-badges">
            <div className="fg-badge fg-badge-green">
              <span className="fg-pulse-dot" />
              <span>Network Secure</span>
            </div>
            <div className="fg-badge fg-badge-orange">
              <span className="material-symbols-outlined fg-shield-icon">verified_user</span>
              <span>ISO 27001</span>
            </div>
          </div>
          <p className="fg-copyright">© 2024 National Risk Division</p>
        </div>
      </div>

      {/* ── Decorative India Map (right side, large screens) ────────────── */}
      <div className="fg-deco-map">
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDj5yUU011F0TrmXlh1Rya3EqjyItHjxu3BSudaIYUtchdCUjxujyHAkS3ciiBPOXtHyMfNq_kokfxlZaD7u1gpsr66k43P6RFi6e1ly_q4gVTNylZIXPgKW6R-1syNpgbWNo-vlz_QKY7kkaBZc3E_fD2L0quLK2LnmApFfIo-OlZVZqm7Z_5MQ1usj_q8Qp5rQHCv0e_wcN10zpj1QJakkwH5LpiMTx0X-KdoDq0q_evpn8kH5T8B0xeJMQ6gxZG6SeavtWrDN4M"
          alt="Topographical map of India showing heat zones"
        />
      </div>
    </main>
  )
}

export default Login
