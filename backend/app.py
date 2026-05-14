from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import os
import sqlite3
from auth import auth_bp
from database import (
    init_db, create_demo_users,
    insert_location_log, get_recent_logs, delete_old_logs,
    # New tracking DB helpers (database.db)
    init_tracking_db, insert_tracking_log, delete_old_tracking_logs,
    check_tracking_rate_limit, get_all_tracking_logs
)

from chatbot_engine import FloodLandslideChatbot
from voice_handler import VoiceHandler

chatbot = FloodLandslideChatbot()
voice_handler = VoiceHandler()

# Flask-Admin
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView
from flask_sqlalchemy import SQLAlchemy
import sqlalchemy as sa

# APScheduler for auto-cleanup
from apscheduler.schedulers.background import BackgroundScheduler
import atexit

app = Flask(__name__)

# Secret key required by Flask-Admin sessions
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'floodguard-admin-secret')

# SQLAlchemy connection to the same SQLite file (used ONLY by Flask-Admin)
DB_PATH = os.path.join(os.path.dirname(__file__), 'db.sqlite')
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{DB_PATH}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db_sa = SQLAlchemy(app)

# ── SQLAlchemy model (Admin-only, mirrors the existing table) ──────────────────
class LocationLog(db_sa.Model):
    __tablename__ = 'location_logs'
    id          = db_sa.Column(db_sa.Integer, primary_key=True)
    latitude    = db_sa.Column(db_sa.Float,   nullable=False)
    longitude   = db_sa.Column(db_sa.Float,   nullable=False)
    risk_level  = db_sa.Column(db_sa.String,  nullable=False)
    prediction  = db_sa.Column(db_sa.String,  nullable=False)
    timestamp   = db_sa.Column(db_sa.DateTime, server_default=sa.func.now())

    def __repr__(self):
        return f'<LocationLog {self.id} {self.risk_level}>'

# ── Flask-Admin setup ──────────────────────────────────────────────────────────
admin = Admin(app, name='FloodGuard Admin')
admin.add_view(ModelView(LocationLog, db_sa.session))

# Enable CORS – allow the Vercel frontend in production, everything in dev
FRONTEND_URL = os.environ.get('FRONTEND_URL', '*')
CORS(app, origins=[FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5173'])

# Register auth blueprint (provides /api/auth/login, /api/auth/register, etc.)
app.register_blueprint(auth_bp)

# Initialize database on startup (creates users table + location_logs if not exists)
with app.app_context():
    init_db()
    create_demo_users()
    db_sa.create_all()   # ensure SQLAlchemy sees the tables
    init_tracking_db()   # create database.db + location_logs table + indexes

# ── APScheduler: delete old logs ─────────────────────────────────────────────
def cleanup_old_logs():
    """Remove entries older than 1 h from the legacy location_logs (db.sqlite)."""
    count = delete_old_logs(hours=1)
    if count:
        print(f'[Scheduler] Deleted {count} old db.sqlite log(s)')

def cleanup_old_tracking_logs():
    """Remove entries older than 24 h from database.db tracking table."""
    count = delete_old_tracking_logs(hours=24)
    if count:
        print(f'[Scheduler] Deleted {count} old tracking log(s) from database.db')

scheduler = BackgroundScheduler()
scheduler.add_job(func=cleanup_old_logs,          trigger='interval', hours=1)
scheduler.add_job(func=cleanup_old_tracking_logs, trigger='interval', hours=24)
scheduler.start()
atexit.register(lambda: scheduler.shutdown())


# ── Haversine distance helper ─────────────────────────────────────────────────
import math

def _haversine(lat1, lon1, lat2, lon2):
    """
    Return the great-circle distance in kilometres between two (lat, lon) points.
    """
    R = 6371.0  # Earth radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi  = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ── Risk zones (extend this list as needed) ────────────────────────────────────
RISK_ZONES = [
    {'lat': 13.0827, 'lon': 80.2707, 'type': 'Flood',     'radius': 2},  # Chennai
    {'lat': 11.0168, 'lon': 76.9558, 'type': 'Landslide', 'radius': 3},  # Coimbatore hills
    {'lat': 22.5726, 'lon': 88.3639, 'type': 'Flood',     'radius': 5},  # Kolkata
    {'lat': 19.0760, 'lon': 72.8777, 'type': 'Flood',     'radius': 4},  # Mumbai
    {'lat': 30.3165, 'lon': 78.0322, 'type': 'Landslide', 'radius': 4},  # Dehradun
]

def _detect_risk(latitude, longitude):
    """
    Check whether the given coordinate falls inside any known risk zone.
    Returns (risk_status, risk_level).
    """
    for zone in RISK_ZONES:
        distance = _haversine(latitude, longitude, zone['lat'], zone['lon'])
        if distance <= zone['radius']:
            return zone['type'], 'High'
    return 'Safe', 'Low'


# Base directory for all DB files (resolves correctly on Render/cloud hosts)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# OpenWeatherMap API key
API_KEY = "f6b138f613d74536572ca7800d8b31f7"

# Hardcoded landslide-prone regions (districts/areas in India)
LANDSLIDE_PRONE_REGIONS = {
    'himachal pradesh', 'uttarakhand', 'darjeeling', 'nilgiris', 'khasi hills',
    'mizoram', 'meghalaya', 'nagaland', 'manipur', 'arunachal pradesh',
    'assam', 'sikkim', 'tripura', 'munnar', 'ooty', 'kodaikanal', 'coorg',
    'madras', 'tamil nadu', 'karnataka', 'western ghats', 'himalayas'
}

def get_rainfall_category(rainfall_mm):
    """Classify rainfall intensity"""
    if rainfall_mm < 5:
        return "Low", False
    elif rainfall_mm < 15:
        return "Moderate", False
    elif rainfall_mm < 20:
        return "Heavy", False
    else:
        return "OverRainfall Warning", True

def predict_landslide(rainfall_mm, location_name, humidity):
    """Predict landslide risk based on rainfall, location, and humidity"""
    location_lower = location_name.lower()
    
    # Check if location is in landslide-prone regions
    is_hilly = any(region in location_lower for region in LANDSLIDE_PRONE_REGIONS)
    
    # Landslide prediction logic
    if rainfall_mm > 20 and is_hilly:
        return "Predicted"
    elif rainfall_mm > 15 and is_hilly and humidity > 75:
        return "Predicted"
    elif rainfall_mm > 20 and humidity > 85:
        return "Likely"
    else:
        return "Nil"

def get_reverse_geocode(lat, lon):
    """Get place name from coordinates using OpenWeatherMap, fallback to Nominatim"""
    try:
        url = f"http://api.openweathermap.org/geo/1.0/reverse?lat={lat}&lon={lon}&limit=1&appid={API_KEY}"
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()
        if data and len(data) > 0:
            best = data[0]
            parts = []
            if "name" in best:
                parts.append(best["name"])
            if "state" in best and best["state"] != best.get("name"):
                parts.append(best["state"])
            if "country" in best:
                parts.append(best["country"])
            if parts:
                return ", ".join(parts)
    except Exception as e:
        print(f"OWM reverse geocode error: {e}")
        
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}"
        headers = {'User-Agent': 'FloodLandslidePredictor/1.0', 'Accept-Language': 'en'}
        response = requests.get(url, headers=headers, timeout=5)
        response.raise_for_status()
        data = response.json()
        address = data.get("address", {})
        
        parts = []
        suburb = address.get("suburb") or address.get("neighbourhood") or address.get("residential")
        city = address.get("city") or address.get("town") or address.get("village") or address.get("county")
        state = address.get("state")
        country = address.get("country")
        
        if suburb: parts.append(suburb)
        if city and city != suburb: parts.append(city)
        if state and state != city: parts.append(state)
        if country: parts.append(country)
        
        if parts:
            return ", ".join(parts)
            
        return "Unknown Location"
    except Exception as e:
        print(f"Reverse geocode error: {e}")
        return "Unknown Location"

@app.route('/')
def home():
    """Serve the Flask app"""
    return render_template('index.html')

@app.route('/api/predict', methods=['POST'])
def predict():
    """Enhanced prediction endpoint with rainfall and landslide analysis"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "risk": "Error",
                "rainfall": 0,
                "rainfall_category": "Unknown",
                "over_rainfall": False,
                "landslide": "Nil",
                "recommendation": "No data received",
                "humidity": 0,
                "temperature": 0
            })
        
        lat = data.get("lat")
        lon = data.get("lon")
        location_name = data.get("location_name", "Unknown")

        print(f"\n[INFO] Processing prediction for [Lat: {lat}, Lon: {lon}, Location: {location_name}]")

        if lat is None or lon is None:
            return jsonify({
                "risk": "Error",
                "rainfall": 0,
                "rainfall_category": "Unknown",
                "over_rainfall": False,
                "landslide": "Nil",
                "recommendation": "Missing latitude or longitude",
                "humidity": 0,
                "temperature": 0
            })

        # Fetch weather data from OpenWeatherMap
        try:
            weather_url = f"http://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={API_KEY}&units=metric"
            weather_response = requests.get(weather_url, timeout=5)
            weather_response.raise_for_status()
            weather_data = weather_response.json()
        except requests.exceptions.RequestException as api_error:
            print(f"Weather API error: {api_error}")
            # Return safe default if API fails
            return jsonify({
                "risk": "Low",
                "rainfall": 0,
                "rainfall_category": "Unknown",
                "over_rainfall": False,
                "landslide": "Nil",
                "recommendation": "Unable to fetch real-time data",
                "humidity": 0,
                "temperature": 0
            }), 200
        
        # Extract rainfall data (convert from mm to cm for display)
        rain_1h = weather_data.get("rain", {}).get("1h", 0)
        rain_3h = weather_data.get("rain", {}).get("3h", 0)
        rainfall_mm = max(rain_1h, rain_3h) * 10  # Convert to mm (approximate)
        rainfall_cm = rainfall_mm / 10
        
        humidity = weather_data.get("main", {}).get("humidity", 0)
        temperature = weather_data.get("main", {}).get("temp", 0)
        pressure = weather_data.get("main", {}).get("pressure", 1013)
        
        # Get rainfall category
        rainfall_category, over_rainfall = get_rainfall_category(rainfall_cm)
        
        # Flood risk calculation (improved)
        if rainfall_cm >= 20 or humidity > 85 or pressure < 980:
            flood_risk = "High"
        elif rainfall_cm >= 5 or humidity > 70:
            flood_risk = "Medium"
        else:
            flood_risk = "Low"
        
        # Landslide prediction
        landslide_risk = predict_landslide(rainfall_cm, location_name, humidity)
        
        # Generate recommendation
        if flood_risk == "High" or landslide_risk in ["Predicted", "Likely"]:
            recommendation = "⚠️ Avoid this area. Severe risks detected!"
        elif flood_risk == "Medium" or landslide_risk == "Predicted":
            recommendation = "⚠️ Exercise caution. Moderate risks present."
        else:
            recommendation = "✅ Safe to visit."
        
        return jsonify({
            "risk": flood_risk,
            "rainfall": round(rainfall_cm, 2),
            "rainfall_category": rainfall_category,
            "over_rainfall": over_rainfall,
            "landslide": landslide_risk,
            "recommendation": recommendation,
            "humidity": int(humidity),
            "temperature": round(float(temperature), 2)
        })
    
    except Exception as e:
        print(f"Predict error: {str(e)}")
        return jsonify({
            "risk": "Error",
            "rainfall": 0,
            "rainfall_category": "Unknown",
            "over_rainfall": False,
            "landslide": "Nil",
            "recommendation": f"Error: {str(e)[:50]}",
            "humidity": 0,
            "temperature": 0
        })

@app.route('/api/reverse-geocode', methods=['GET'])
def reverse_geocode():
    """Reverse geocoding endpoint"""
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    
    if not lat or not lon:
        return jsonify({"error": "Missing coordinates"}), 400
    
    try:
        place_name = get_reverse_geocode(float(lat), float(lon))
        return jsonify({"place": place_name})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/search-location', methods=['GET', 'POST'])
def search_location():
    """Search for location coordinates from place name"""
    try:
        # Get from query params or JSON body
        place_name = request.args.get("q") or (request.get_json() or {}).get("q")
        
        if not place_name or not place_name.strip():
            return jsonify({"success": False, "error": "Missing place name"}), 400
        
        place_name = place_name.strip()
        
        # Try OpenWeatherMap API first (more reliable)
        try:
            weather_url = f"http://api.openweathermap.org/geo/1.0/direct?q={place_name},IN&limit=5&appid={API_KEY}"
            weather_response = requests.get(weather_url, timeout=8)
            weather_response.raise_for_status()
            weather_data = weather_response.json()
            
            if weather_data and len(weather_data) > 0:
                best = weather_data[0]
                return jsonify({
                    "success": True,
                    "lat": float(best['lat']),
                    "lon": float(best['lon']),
                    "display_name": f"{best['name']}, {best.get('state', 'India')}"
                }), 200
        except requests.exceptions.RequestException as weather_error:
            print(f"OpenWeatherMap error: {weather_error}")
        
        # Fallback to Nominatim if OpenWeatherMap has no results
        try:
            headers = {
                'User-Agent': 'FloodLandslidePredictor/1.0',
                'Accept': 'application/json'
            }
            nominatim_url = f"https://nominatim.openstreetmap.org/search?q={place_name},India&format=json&limit=5&addressdetails=1"
            nominatim_response = requests.get(nominatim_url, headers=headers, timeout=8)
            nominatim_response.raise_for_status()
            nominatim_data = nominatim_response.json()
            
            if nominatim_data and len(nominatim_data) > 0:
                best_result = nominatim_data[0]
                return jsonify({
                    "success": True,
                    "lat": float(best_result['lat']),
                    "lon": float(best_result['lon']),
                    "display_name": best_result.get('display_name', place_name)
                }), 200
        except requests.exceptions.RequestException as nom_error:
            print(f"Nominatim error: {nom_error}")
        
        # If both APIs fail, return error
        return jsonify({
            "success": False,
            "error": f"Location '{place_name}' not found. Try another place."
        }), 404
        
    except Exception as e:
        print(f"Search location error: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Search error occurred"
        }), 500

@app.route('/static/<path:filename>')
def serve_static(filename):
    """Serve static files"""
    return send_from_directory('static', filename)


# ── NEW: Real-time location tracking ──────────────────────────────────────────

@app.route('/api/track-location', methods=['POST'])
def track_location():
    """
    Receive a GPS coordinate from the frontend, run ML prediction,
    store the result in location_logs, and return risk info.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data'}), 400

        latitude  = data.get('latitude')
        longitude = data.get('longitude')

        if latitude is None or longitude is None:
            return jsonify({'error': 'Missing latitude or longitude'}), 400

        # --- Run same prediction logic used by /api/predict ---
        try:
            weather_url = (
                f"http://api.openweathermap.org/data/2.5/weather"
                f"?lat={latitude}&lon={longitude}&appid={API_KEY}&units=metric"
            )
            weather_response = requests.get(weather_url, timeout=5)
            weather_response.raise_for_status()
            weather_data = weather_response.json()

            rain_1h      = weather_data.get('rain', {}).get('1h', 0)
            rain_3h      = weather_data.get('rain', {}).get('3h', 0)
            rainfall_mm  = max(rain_1h, rain_3h) * 10
            rainfall_cm  = rainfall_mm / 10
            humidity     = weather_data.get('main', {}).get('humidity', 0)
            pressure     = weather_data.get('main', {}).get('pressure', 1013)

            # Flood risk
            if rainfall_cm >= 20 or humidity > 85 or pressure < 980:
                risk_level = 'High'
            elif rainfall_cm >= 5 or humidity > 70:
                risk_level = 'Medium'
            else:
                risk_level = 'Low'

            # Prediction label (Flood / Landslide / Safe)
            # High rainfall + steep-terrain humidity → likely landslide
            if rainfall_cm > 10 and humidity > 80:
                prediction = 'Landslide'
            elif risk_level in ('High', 'Medium'):
                prediction = 'Flood'
            else:
                prediction = 'Safe'

        except Exception as weather_err:
            print(f'Track-location weather error: {weather_err}')
            # Fallback: low risk when weather API fails
            risk_level = 'Low'
            prediction = 'Safe'

        # Persist to DB
        insert_location_log(latitude, longitude, risk_level, prediction)

        alert = risk_level in ('High', 'Medium')
        return jsonify({
            'risk_level': risk_level,
            'prediction': prediction,
            'alert':      alert
        }), 200

    except Exception as e:
        print(f'track_location error: {e}')
        return jsonify({'error': str(e)}), 500


@app.route('/api/logs', methods=['GET'])
def get_logs():
    """Return location logs from the last 1 hour, sorted newest-first."""
    try:
        logs = get_recent_logs(hours=1)
        return jsonify({'logs': logs, 'count': len(logs)}), 200
    except Exception as e:
        print(f'get_logs error: {e}')
        return jsonify({'error': str(e)}), 500

@app.route('/api/location-logs', methods=['GET'])
def get_location_logs():
    """Return recent location tracking logs from database.db."""
    try:
        limit = int(request.args.get('limit', 100))
        logs = get_all_tracking_logs(limit)
        return jsonify({'status': 'success', 'logs': logs, 'count': len(logs)}), 200
    except Exception as e:
        print(f'get_location_logs error: {e}')
        return jsonify({'status': 'error', 'error': str(e)}), 500


# ══════════════════════════════════════════════════════════════════════════════
#  /track-location  – Real-time user tracking with structured SQLite logging
# ══════════════════════════════════════════════════════════════════════════════

@app.route('/track-location', methods=['POST'])
def track_location_v2():
    """
    Receive a user's GPS coordinate, run reverse geocoding to get a human-
    readable location name, run zone-based risk detection using the Haversine
    formula, store everything in database.db › location_logs, and return a
    structured JSON response with alert information.

    Request JSON:
        { "user_id": "user123", "latitude": 13.0827, "longitude": 80.2707 }

    Response JSON (high risk):
        {
            "status": "success",
            "location_name": "Chennai",
            "risk_status": "Flood",
            "risk_level": "High",
            "alert": true,
            "message": "⚠️ You are in a high-risk flood-prone area near Chennai"
        }

    Response JSON (safe):
        {
            "status": "success",
            "location_name": "Coimbatore",
            "risk_status": "Safe",
            "risk_level": "Low",
            "alert": false,
            "message": "✅ You are currently in a safe zone near Coimbatore"
        }
    """
    try:
        data = request.get_json(force=True, silent=True)
        if not data:
            return jsonify({'status': 'error', 'error': 'Request body must be JSON'}), 400

        # ── Validate fields ───────────────────────────────────────────────────
        user_id   = data.get('user_id', '').strip()
        latitude  = data.get('latitude')
        longitude = data.get('longitude')

        print(f"\n[INFO] Processing location tracking for User: {user_id} [Lat: {latitude}, Lon: {longitude}]")

        if not user_id:
            return jsonify({'status': 'error', 'error': 'user_id is required'}), 400

        if latitude is None or longitude is None:
            return jsonify({'status': 'error', 'error': 'latitude and longitude are required'}), 400

        try:
            latitude  = float(latitude)
            longitude = float(longitude)
        except (TypeError, ValueError):
            return jsonify({'status': 'error', 'error': 'latitude and longitude must be numeric'}), 400

        if not (-90 <= latitude <= 90):
            return jsonify({'status': 'error', 'error': 'latitude must be between -90 and 90'}), 400

        if not (-180 <= longitude <= 180):
            return jsonify({'status': 'error', 'error': 'longitude must be between -180 and 180'}), 400

        # ── Reverse geocoding: lat/lon → human-readable city/place ────────────
        location_name = get_reverse_geocode(latitude, longitude)

        # ── Risk detection (Haversine zone check) ─────────────────────────────
        risk_status, risk_level = _detect_risk(latitude, longitude)

        # ── Persist to database.db (only if 5 mins have passed) ───────────────
        if check_tracking_rate_limit(user_id):
            ist_time_str = insert_tracking_log(user_id, latitude, longitude, location_name, risk_status, risk_level)
            print(f"[INFO] Location parsed as: '{location_name}'")
            print(f"[INFO] Risk detected -> Status: {risk_status}, Level: {risk_level}")
            print(f"[INFO] Tracking data saved to database at {ist_time_str}")
        else:
            print(f"[track-location] Skipped DB insert for {user_id} (rate limit active)")

        # ── Build structured alert response ───────────────────────────────────
        alert = (risk_level == 'High')
        if alert:
            message = f'⚠️ You are in a high-risk {str(risk_status).lower()}-prone area near {location_name}'
        else:
            message = f'✅ You are currently in a safe zone near {location_name}'

        return jsonify({
            'status':        'success',
            'location_name': location_name,
            'risk_status':   risk_status,
            'risk_level':    risk_level,
            'alert':         alert,
            'message':       message,
        }), 200

    except Exception as e:
        print(f'[track-location] Unexpected error: {e}')
        return jsonify({'status': 'error', 'error': 'Internal server error'}), 500


# ── GET /api/sensor-status ────────────────────────────────────────────────
@app.route('/api/sensor-status', methods=['GET'])
def sensor_status():
    """Returns live river level, rainfall and sensor count from DB."""
    try:
        conn = sqlite3.connect(os.path.join(BASE_DIR, 'floodguard.db'))
        cursor = conn.cursor()
        # Fetch latest sensor reading
        cursor.execute("""
            SELECT river_level, rainfall_mm, sensors_online, sensors_total
            FROM sensor_readings
            ORDER BY timestamp DESC LIMIT 1
        """)
        row = cursor.fetchone()
        conn.close()
        if row:
            return jsonify({
                "river_level": round(row[0], 1),
                "rainfall_mm": round(row[1], 1),
                "sensors_online": row[2],
                "sensors_total": row[3]
            })
        # Fallback mock data if no DB rows yet
        return jsonify({"river_level": 72.0, "rainfall_mm": 94.0, "sensors_online": 84, "sensors_total": 89})
    except Exception as e:
        return jsonify({"river_level": 72.0, "rainfall_mm": 94.0, "sensors_online": 84, "sensors_total": 89})
 
 
# ── GET /api/shelters ─────────────────────────────────────────────────────
@app.route('/api/shelters', methods=['GET'])
def get_shelters():
    """Returns list of emergency shelters with occupancy."""
    try:
        conn = sqlite3.connect(os.path.join(BASE_DIR, 'floodguard.db'))
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, name, area, capacity, current_occupancy, distance_km, status, lat, lng, type
            FROM shelters
            ORDER BY status ASC, distance_km ASC
        """)
        rows = cursor.fetchall()
        conn.close()
        shelters = [{
            "id": r[0], "name": r[1], "area": r[2], "capacity": r[3],
            "current": r[4], "dist": f"{r[5]} km", "status": r[6],
            "lat": r[7], "lng": r[8], "type": r[9]
        } for r in rows]
        return jsonify(shelters)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
 
 
# ── GET /api/flood-alerts ─────────────────────────────────────────────────
@app.route('/api/flood-alerts', methods=['GET'])
def get_flood_alerts():
    """Returns active flood/landslide alerts."""
    try:
        conn = sqlite3.connect(os.path.join(BASE_DIR, 'floodguard.db'))
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, level, message, created_at
            FROM flood_alerts
            WHERE is_active = 1
            ORDER BY created_at DESC LIMIT 10
        """)
        rows = cursor.fetchall()
        conn.close()
        alerts = [{"id": r[0], "level": r[1], "msg": r[2], "time": r[3]} for r in rows]
        return jsonify(alerts)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
 


 
# ── GET /api/evacuation-routes ────────────────────────────────────────────
@app.route('/api/evacuation-routes', methods=['GET'])
def get_evacuation_routes():
    """Returns current evacuation route statuses."""
    try:
        conn = sqlite3.connect(os.path.join(BASE_DIR, 'floodguard.db'))
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, name, risk_level, est_time, distance, via_description, status
            FROM evacuation_routes
            ORDER BY risk_level ASC
        """)
        rows = cursor.fetchall()
        conn.close()
        routes = [{"id": r[0], "name": r[1], "risk": r[2], "time": r[3], "distance": r[4], "via": r[5], "status": r[6]} for r in rows]
        return jsonify(routes)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
 



# ── Chatbot API Routes ────────────────────────────────────────────────────────
@app.route('/chatbot/message', methods=['POST'])
def chatbot_message():
    data = request.get_json(silent=True) or {}
    text = data.get('message', '').strip()
    voice_enabled = data.get('voice', False)

    if not text:
        return jsonify({'success': False, 'error': 'No message provided'}), 400

    language = chatbot.detect_language(text)
    intent   = chatbot.detect_intent(text)
    # ✅ FIX: use get_response(text) — generate_response() does not exist
    response_text = chatbot.get_response(text)

    result = {
        'success':  True,
        'response': response_text,
        'language': language,
        'intent':   intent
    }

    if voice_enabled:
        audio_result = voice_handler.text_to_speech(response_text, language)
        if audio_result.get('success'):
            result['audio'] = {
                'audio_base64': audio_result.get('audio_base64'),
                'format':       audio_result.get('format')
            }

    return jsonify(result), 200

@app.route('/chatbot/clear', methods=['POST'])
def chatbot_clear():
    chatbot.conversation_history = []
    return jsonify({'success': True}), 200

@app.route('/chatbot/set_language', methods=['POST'])
def chatbot_set_language():
    data = request.get_json(silent=True) or {}
    lang = data.get('language', 'english')
    chatbot.current_language = lang
    return jsonify({'success': True}), 200

@app.route('/chatbot/tts', methods=['POST'])
def chatbot_tts():
    data = request.get_json(silent=True) or {}
    text = data.get('text', '')
    lang = data.get('language', 'english')
    
    audio_result = voice_handler.text_to_speech(text, lang)
    if audio_result.get('success'):
        return jsonify({
            'success': True,
            'audio_base64': audio_result.get('audio_base64'),
            'format': audio_result.get('format')
        }), 200
    else:
         return jsonify({'success': False, 'error': audio_result.get('error')}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)
