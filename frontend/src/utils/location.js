/**
 * location.js — Smart location tracking utilities
 *
 * Rules for sending a backend update:
 *  a) Distance from last known position > 200 m, OR
 *  b) More than 5 minutes have elapsed since the last update
 *
 * Additional guards:
 *  - Exact-duplicate coordinates are silently dropped (no network call)
 *  - watchPosition errors are surfaced cleanly via onError()
 */

const DISTANCE_THRESHOLD_M = 200       // metres — must move this far to trigger early update
const TIME_THRESHOLD_MS    = 5 * 60 * 1000  // 5 minutes in ms

/**
 * Haversine formula — great-circle distance between two lat/lon points.
 * @param {{ lat: number, lon: number }} prev
 * @param {{ lat: number, lon: number }} current
 * @returns {number} distance in metres
 */
export function getDistance(prev, current) {
  const R = 6371000 // Earth radius in metres
  const toRad = (deg) => (deg * Math.PI) / 180

  const dLat = toRad(current.lat - prev.lat)
  const dLon = toRad(current.lon - prev.lon)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(prev.lat)) *
      Math.cos(toRad(current.lat)) *
      Math.sin(dLon / 2) ** 2

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Determines whether the new position warrants a backend update.
 * @param {{ lat: number, lon: number }|null} lastPos
 * @param {number|null} lastTimestamp  — ms since epoch of last backend update
 * @param {{ lat: number, lon: number }} currentPos
 * @returns {boolean}
 */
export function shouldSendUpdate(lastPos, lastTimestamp, currentPos) {
  // First-ever reading → always send
  if (!lastPos || !lastTimestamp) return true

  // Exact duplicate — same coordinates to 6 decimal places → skip
  if (
    Math.abs(currentPos.lat - lastPos.lat) < 0.000001 &&
    Math.abs(currentPos.lon - lastPos.lon) < 0.000001
  ) {
    return false
  }

  const elapsed  = Date.now() - lastTimestamp
  const distance = getDistance(lastPos, currentPos)

  return distance > DISTANCE_THRESHOLD_M || elapsed > TIME_THRESHOLD_MS
}

/**
 * Start watchPosition-based location tracking.
 *
 * The returned cleanup function MUST be called when tracking should stop
 * (e.g. on logout or component unmount) to prevent memory/GPS leaks.
 *
 * @param {function({ lat, lon }): void} onUpdate  — called with new coords when update is needed
 * @param {function(string): void}       onError   — called with a human-readable error string
 * @returns {function} stopTracking — call this to halt GPS polling and clear timers
 */
export function startLocationTracking(onUpdate, onError) {
  if (!navigator.geolocation) {
    onError('Geolocation is not supported by this browser.')
    return () => {}
  }

  let lastPos       = null  // last position seen by watchPosition (updated every fix)
  let lastSentPos   = null  // last position actually sent to backend
  let lastTimestamp = null  // timestamp of last backend update

  // ── watchPosition callback ─────────────────────────────────────────────────
  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      const current = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
      }

      // Always track the latest position (for the interval fallback below)
      lastPos = current

      if (shouldSendUpdate(lastSentPos, lastTimestamp, current)) {
        lastSentPos   = current
        lastTimestamp = Date.now()
        onUpdate(current)
      }
      // else: position updated internally but no backend call needed yet
    },
    (err) => {
      // Map browser GeolocationPositionError codes to friendly messages
      const MESSAGES = {
        1: 'Location permission denied. Please allow location access in your browser settings.',
        2: 'Position unavailable. Your device could not determine its location.',
        3: 'Location request timed out. Please check your GPS signal.',
      }
      onError(MESSAGES[err.code] || err.message || 'Location access failed.')
    },
    {
      enableHighAccuracy: true,
      timeout:            15000,   // 15 s per fix attempt
      maximumAge:         30000,   // accept a cached fix up to 30 s old
    }
  )

  // ── 5-minute keepalive interval ────────────────────────────────────────────
  // Forces a backend ping even when the user is stationary and watchPosition
  // has not fired a new event since the last update.
  const intervalId = setInterval(() => {
    if (lastPos) {
      const elapsed = Date.now() - (lastTimestamp || 0)
      if (elapsed >= TIME_THRESHOLD_MS) {
        lastSentPos   = lastPos
        lastTimestamp = Date.now()
        onUpdate(lastPos)
      }
    }
  }, TIME_THRESHOLD_MS)

  // ── Cleanup function ───────────────────────────────────────────────────────
  return () => {
    navigator.geolocation.clearWatch(watchId)
    clearInterval(intervalId)
  }
}
