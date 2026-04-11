import axios from 'axios'

// API Configuration (Vite uses import.meta.env, not process.env)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// API Methods
export const authAPI = {
  login: (username, password) =>
    api.post('/api/auth/login', { username, password }),

  register: (username, email, password) =>
    api.post('/api/auth/register', { username, email, password }),

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  },
}

export const predictionAPI = {
  // Get prediction based on latitude and longitude
  predict: (latitude, longitude, location_name = '') =>
    api.post('/api/predict', {
      lat: latitude,
      lon: longitude,
      location_name: location_name,
    }),

  // Search for location by name
  searchLocation: (placeName) =>
    api.get('/api/search-location', {
      params: { q: placeName },
    }),

  // Reverse geocode (get place name from coordinates)
  reverseGeocode: (latitude, longitude) =>
    api.get('/api/reverse-geocode', {
      params: { lat: latitude, lon: longitude },
    }),
}

// ── NEW: Real-time tracking ────────────────────────────────────────────────────
export const trackLocationAPI = {
  /**
   * Send GPS coordinates to the backend for ML prediction + logging.
   * @param {number} latitude
   * @param {number} longitude
   */
  track: (latitude, longitude) => {
    const userStr = localStorage.getItem('user')
    let userId = 'guest'
    if (userStr) {
      try {
        const u = JSON.parse(userStr)
        userId = u.username || u.id || 'guest'
      } catch(e) {}
    }
    return api.post('/track-location', { user_id: userId, latitude, longitude })
  },
}

// ── NEW: Logs dashboard ────────────────────────────────────────────────────────
export const logsAPI = {
  /** Fetch recent location tracking logs from database.db */
  getAll: (limit = 100) => api.get(`/api/location-logs?limit=${limit}`),
}

export default api
