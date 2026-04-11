import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Toast } from '../utils/toast'
import './Results.css'

function Results() {
  const location = useLocation()
  const navigate = useNavigate()
  const [downloadLoading, setDownloadLoading] = useState(false)

  const state = location.state || {}
  const prediction = state.prediction || {}
  const locationName = state.location || 'Unknown Location'
  const latitude = state.lat || 0
  const longitude = state.lon || 0

  if (!prediction || !prediction.risk) {
    return (
      <div className="results-container">
        <div className="error-message">
          <h2>No prediction data available</h2>
          <button onClick={() => navigate('/home')} className="btn-primary">
            Go Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'High':
        return '#fb5151'
      case 'Medium':
        return '#ffc69a'
      case 'Low':
        return '#82ff99'
      default:
        return '#76eef9'
    }
  }

  const getRiskIcon = (risk) => {
    switch (risk) {
      case 'High':
        return '🚨'
      case 'Medium':
        return '⚠️'
      case 'Low':
        return '✅'
      default:
        return '❓'
    }
  }

  const handleDownloadReport = () => {
    setDownloadLoading(true)
    setTimeout(() => {
      const report = `
FLOOD & LANDSLIDE RISK ASSESSMENT REPORT
========================================

Location: ${locationName}
Latitude: ${latitude.toFixed(4)}°N
Longitude: ${longitude.toFixed(4)}°E

RISK ASSESSMENT
===============
Flood Risk Level: ${prediction.risk || 'N/A'}
Landslide Risk: ${prediction.landslide || 'N/A'}

WEATHER CONDITIONS
==================
Rainfall: ${prediction.rainfall || 0} cm
Rainfall Category: ${prediction.rainfall_category || 'N/A'}
Temperature: ${prediction.temperature || 0}°C
Humidity: ${prediction.humidity || 0}%

RECOMMENDATION
===============
${prediction.recommendation || 'No specific recommendation available'}

IMPORTANT SAFETY INFORMATION
============================
- In case of emergency, contact local disaster management authorities
- Follow evacuation instructions issued by government agencies
- Download offline maps for emergency navigation
- Keep emergency contacts saved

Generated: ${new Date().toLocaleString()}
Source: Flood Guard - Real-time Environmental Intelligence
      `.trim()

      const element = document.createElement('a')
      element.setAttribute(
        'href',
        'data:text/plain;charset=utf-8,' + encodeURIComponent(report)
      )
      element.setAttribute('download', `flood-risk-report-${Date.now()}.txt`)
      element.style.display = 'none'
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)

      Toast.success('📥 Report downloaded successfully!')
      setDownloadLoading(false)
    }, 500)
  }

  return (
    <div className="results-container">
      {/* Header */}
      <header className="results-header">
        <button onClick={() => navigate('/home')} className="back-button">
          ← Back to Home
        </button>
        <h1>📊 Environmental Analysis Report</h1>
      </header>

      {/* Main Content */}
      <main className="results-main">
        {/* Hero Risk Card */}
        <section className="risk-hero">
          <div
            className="risk-card"
            style={{
              border: `4px solid ${getRiskColor(prediction.risk)}`,
              background: `${getRiskColor(prediction.risk)}20`,
            }}
          >
            <div className="risk-icon">{getRiskIcon(prediction.risk)}</div>
            <h2 className="risk-title">
              Flood Risk: <span className="risk-value">{prediction.risk}</span>
            </h2>
            <p className="risk-description">
              {prediction.risk === 'High' &&
                'IMMEDIATE ACTION REQUIRED! Severe flood risk detected.'}
              {prediction.risk === 'Medium' &&
                'EXERCISE CAUTION. Moderate flood risk present.'}
              {prediction.risk === 'Low' && 'Area appears safe for now.'}
            </p>
          </div>

          <div className="location-card">
            <h3>📍 Location Details</h3>
            <div className="location-info grid-2">
              <div>
                <label>Place Name:</label>
                <p className="value">{locationName}</p>
              </div>
              <div>
                <label>Coordinates:</label>
                <p className="value mono">
                  {latitude.toFixed(4)}°N, {longitude.toFixed(4)}°E
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Weather Metrics */}
        <section className="metrics-grid">
          <h3>🌦️ Weather Conditions</h3>
          <div className="grid-4">
            <div className="metric-card">
              <div className="metric-icon">💧</div>
              <label>Rainfall</label>
              <p className="metric-value">{prediction.rainfall || 0} cm</p>
              <small>{prediction.rainfall_category || 'N/A'}</small>
            </div>

            <div className="metric-card">
              <div className="metric-icon">🌡️</div>
              <label>Temperature</label>
              <p className="metric-value">{prediction.temperature || 0}°C</p>
            </div>

            <div className="metric-card">
              <div className="metric-icon">💨</div>
              <label>Humidity</label>
              <p className="metric-value">{prediction.humidity || 0}%</p>
            </div>

            <div className="metric-card">
              <div className="metric-icon">🏔️</div>
              <label>Landslide Risk</label>
              <p className="metric-value">{prediction.landslide || 'N/A'}</p>
            </div>
          </div>
        </section>

        {/* Recommendations */}
        <section className="recommendations">
          <h3>💡 AI Safety Recommendations</h3>
          <div className="recommendation-box">
            <p>{prediction.recommendation || 'Please monitor weather updates.'}</p>
          </div>

          {prediction.risk !== 'Low' && (
            <div className="safety-tips">
              <h4>🛡️ Safety Precautions:</h4>
              <ul>
                <li>Monitor local weather forecasts continuously</li>
                <li>Keep emergency contact numbers saved</li>
                <li>Prepare evacuation plan with family</li>
                <li>Stock essential supplies (water, food, medicines)</li>
                <li>Download offline maps for navigation</li>
                <li>Stay away from flood-prone areas</li>
              </ul>
            </div>
          )}
        </section>

        {/* Action Buttons */}
        <section className="action-section">
          <button
            onClick={handleDownloadReport}
            className="btn-download"
            disabled={downloadLoading}
          >
            {downloadLoading ? '📥 Downloading...' : '📥 Download Report'}
          </button>
          <button onClick={() => navigate('/home')} className="btn-primary">
            🔙 New Prediction
          </button>
        </section>

        {/* Data Info */}
        <section className="data-info">
          <p>
            <strong>Data Source:</strong> OpenWeatherMap API | Real-time analysis |
            Last updated: {new Date().toLocaleTimeString()}
          </p>
          <p>
            <strong>Disclaimer:</strong> This is an AI-powered prediction system for
            informational purposes. Always follow official government announcements and
            disaster management guidelines for critical decisions.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="results-footer">
        <p>© 2024 Flood Guard | Real-time Environmental Intelligence</p>
      </footer>
    </div>
  )
}

export default Results
