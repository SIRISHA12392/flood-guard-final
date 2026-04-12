"""
chatbot_engine.py  -  FloodGuard AI Disaster Awareness & Emergency Safety Assistant
=====================================================================================
Bilingual (English + Tamil) chatbot that:
  - Fetches LIVE weather & risk data from OpenWeatherMap
  - Uses tracking DB for the user's last known location
  - Remembers conversation context (no repetition)
  - Follows structured response format (What / Causes / Safety / Emergency)
  - NEVER fakes real-time data
  - Supports Gemini LLM when API key is configured
"""

import re
import os
import math
import sqlite3
import requests
from datetime import datetime, timedelta

# ── optional imports ─────────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    from google import genai as genai_client
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False

# ── constants ────────────────────────────────────────────────────────
OWM_API_KEY      = "f6b138f613d74536572ca7800d8b31f7"
DEFAULT_LAT      = 13.0827
DEFAULT_LON      = 80.2707
TRACKING_DB_PATH = os.path.join(os.path.dirname(__file__), 'database.db')
FLOODGUARD_DB    = os.path.join(os.path.dirname(__file__), 'floodguard.db')

LANDSLIDE_PRONE = {
    'himachal pradesh', 'uttarakhand', 'darjeeling', 'nilgiris', 'khasi hills',
    'mizoram', 'meghalaya', 'nagaland', 'manipur', 'arunachal pradesh',
    'assam', 'sikkim', 'tripura', 'munnar', 'ooty', 'kodaikanal', 'coorg',
    'tamil nadu', 'karnataka', 'western ghats', 'himalayas', 'kerala',
    'wayanad', 'idukki', 'kodagu',
}

RISK_ZONES = [
    {'lat': 13.0827, 'lon': 80.2707, 'type': 'Flood',     'radius': 2},
    {'lat': 11.0168, 'lon': 76.9558, 'type': 'Landslide', 'radius': 3},
    {'lat': 22.5726, 'lon': 88.3639, 'type': 'Flood',     'radius': 5},
    {'lat': 19.0760, 'lon': 72.8777, 'type': 'Flood',     'radius': 4},
    {'lat': 30.3165, 'lon': 78.0322, 'type': 'Landslide', 'radius': 4},
]

# Cities the user might mention — for location-aware responses
CITY_COORDS = {
    'chennai':      (13.0827, 80.2707),
    'mumbai':       (19.0760, 72.8777),
    'kolkata':      (22.5726, 88.3639),
    'delhi':        (28.6139, 77.2090),
    'bangalore':    (12.9716, 77.5946),
    'bengaluru':    (12.9716, 77.5946),
    'hyderabad':    (17.3850, 78.4867),
    'coimbatore':   (11.0168, 76.9558),
    'madurai':      (9.9252,  78.1198),
    'trichy':       (10.7905, 78.7047),
    'salem':        (11.6643, 78.1460),
    'dehradun':     (30.3165, 78.0322),
    'kochi':        (9.9312,  76.2673),
    'thiruvananthapuram': (8.5241, 76.9366),
    'pune':         (18.5204, 73.8567),
    'guwahati':     (26.1445, 91.7362),
    'jaipur':       (26.9124, 75.7873),
    'lucknow':      (26.8467, 80.9462),
    'patna':        (25.6093, 85.1376),
    'ooty':         (11.4102, 76.6950),
    'munnar':       (10.0889, 77.0595),
    'kodaikanal':   (10.2381, 77.4892),
}


# ════════════════════════════════════════════════════════════════════
class FloodLandslideChatbot:
# ════════════════════════════════════════════════════════════════════

    def __init__(self):
        self.current_language     = "english"
        self.conversation_history = []
        self.topics_covered       = set()   # tracks what we already explained

        # Gemini LLM (optional)
        raw_key = os.environ.get("GEMINI_API_KEY", "").strip().strip('"')
        self.api_key = raw_key
        self.use_llm = False
        if HAS_GENAI and raw_key and "your-google" not in raw_key:
            self._genai_client = genai_client.Client(api_key=raw_key)
            self.use_llm = True

    # ─────────────────────────────────────────────────────────────────
    #  LANGUAGE DETECTION
    # ─────────────────────────────────────────────────────────────────
    def detect_language(self, text: str) -> str:
        if re.search(r'[\u0B80-\u0BFF]', text):
            return "tamil"
        return "english"

    # ─────────────────────────────────────────────────────────────────
    #  LOCATION EXTRACTION  (from user text)
    # ─────────────────────────────────────────────────────────────────
    def extract_city(self, text: str):
        """Return (lat, lon, city_name) if a known city is mentioned, else None."""
        t = text.lower()
        for city, (lat, lon) in CITY_COORDS.items():
            if city in t:
                return lat, lon, city.title()
        return None

    # ─────────────────────────────────────────────────────────────────
    #  LAST TRACKED LOCATION (from database.db)
    # ─────────────────────────────────────────────────────────────────
    def get_last_location(self):
        try:
            if not os.path.exists(TRACKING_DB_PATH):
                return DEFAULT_LAT, DEFAULT_LON, "Chennai"
            conn = sqlite3.connect(TRACKING_DB_PATH)
            conn.row_factory = sqlite3.Row
            cur  = conn.cursor()
            cur.execute(
                "SELECT latitude, longitude, location_name "
                "FROM location_logs ORDER BY id DESC LIMIT 1"
            )
            row = cur.fetchone()
            conn.close()
            if row:
                return float(row['latitude']), float(row['longitude']), row['location_name'] or "Your Location"
        except Exception:
            pass
        return DEFAULT_LAT, DEFAULT_LON, "Chennai"

    # ─────────────────────────────────────────────────────────────────
    #  LIVE WEATHER
    # ─────────────────────────────────────────────────────────────────
    def get_weather(self, lat, lon):
        try:
            url = (
                f"http://api.openweathermap.org/data/2.5/weather"
                f"?lat={lat}&lon={lon}&appid={OWM_API_KEY}&units=metric"
            )
            r = requests.get(url, timeout=6)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            print(f"[weather] {e}")
            return None

    # ─────────────────────────────────────────────────────────────────
    #  DB ALERTS (from floodguard.db)
    # ─────────────────────────────────────────────────────────────────
    def get_db_alerts(self):
        alerts = []
        try:
            if os.path.exists(FLOODGUARD_DB):
                conn = sqlite3.connect(FLOODGUARD_DB)
                cur  = conn.cursor()
                cur.execute(
                    "SELECT level, message, created_at FROM flood_alerts "
                    "WHERE is_active = 1 ORDER BY created_at DESC LIMIT 5"
                )
                for row in cur.fetchall():
                    alerts.append({'level': row[0], 'message': row[1], 'time': row[2]})
                conn.close()
        except Exception:
            pass
        return alerts

    # ─────────────────────────────────────────────────────────────────
    #  HAVERSINE + ZONE RISK
    # ─────────────────────────────────────────────────────────────────
    @staticmethod
    def _haversine(lat1, lon1, lat2, lon2):
        R = 6371.0
        p1, p2 = math.radians(lat1), math.radians(lat2)
        dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
        a = math.sin(dp/2)**2 + math.cos(p1) * math.cos(p2) * math.sin(dl/2)**2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    def _zone_risk(self, lat, lon):
        for z in RISK_ZONES:
            if self._haversine(lat, lon, z['lat'], z['lon']) <= z['radius']:
                return z['type'], 'High'
        return 'Safe', 'Low'

    # ─────────────────────────────────────────────────────────────────
    #  PREDICTION LOGIC
    # ─────────────────────────────────────────────────────────────────
    def predict_conditions(self, weather, lat, lon, location_name):
        rain_1h  = weather.get("rain", {}).get("1h", 0)
        rain_3h  = weather.get("rain", {}).get("3h", 0)
        rain_mm  = max(rain_1h, rain_3h) * 10
        rain_cm  = rain_mm / 10

        humidity  = weather.get("main", {}).get("humidity", 0)
        temp      = weather.get("main", {}).get("temp", 0)
        pressure  = weather.get("main", {}).get("pressure", 1013)
        desc      = weather.get("weather", [{}])[0].get("description", "clear sky")

        # Rainfall category
        if rain_cm < 0.5:   rain_cat = "No rain"
        elif rain_cm < 5:   rain_cat = "Light rain"
        elif rain_cm < 15:  rain_cat = "Moderate rain"
        elif rain_cm < 20:  rain_cat = "Heavy rain"
        else:               rain_cat = "Extreme rainfall"

        # Flood risk
        if rain_cm >= 20 or humidity > 85 or pressure < 980:
            flood_risk = "High"
        elif rain_cm >= 5 or humidity > 70:
            flood_risk = "Medium"
        else:
            flood_risk = "Low"

        # Landslide risk
        loc_lower = location_name.lower()
        is_hilly  = any(r in loc_lower for r in LANDSLIDE_PRONE)
        zone_type, zone_level = self._zone_risk(lat, lon)

        if (rain_cm > 20 and is_hilly) or (rain_cm > 15 and is_hilly and humidity > 75):
            landslide_risk = "High"
            landslide_note = "Landslide likely in hilly terrain"
        elif rain_cm > 20 and humidity > 85:
            landslide_risk = "Medium"
            landslide_note = "Possible landslide due to heavy rain and moisture"
        elif zone_type == "Landslide" and zone_level == "High":
            landslide_risk = "High"
            landslide_note = "Known landslide-prone zone"
        else:
            landslide_risk = "Low"
            landslide_note = "No immediate landslide threat"

        return {
            "rain_mm":         round(rain_mm, 2),
            "rain_cm":         round(rain_cm, 2),
            "rain_cat":        rain_cat,
            "humidity":        int(humidity),
            "temperature":     round(float(temp), 1),
            "pressure":        int(pressure),
            "description":     desc,
            "flood_risk":      flood_risk,
            "landslide_risk":  landslide_risk,
            "landslide_note":  landslide_note,
        }

    # ─────────────────────────────────────────────────────────────────
    #  INTENT DETECTION
    # ─────────────────────────────────────────────────────────────────
    def detect_intent(self, text: str) -> str:
        t = text.lower().strip().rstrip('?!.,;')

        # Greetings
        if any(k in t for k in ["hi", "hello", "hey", "who are you", "what can you do",
                                 "help me", "start", "begin"]):
            return "greeting"

        # Live / real-time queries
        if any(k in t for k in ["current", "right now", "now", "today", "live",
                                 "real time", "realtime", "real-time",
                                 "my area", "my location", "where i am", "here",
                                 "how is the weather", "what is the weather",
                                 "is it raining", "is there rain", "any alert",
                                 "is it safe", "am i safe", "status"]):
            return "live_query"

        # Flood
        if any(k in t for k in ["flood", "flooding", "water level", "river overflow",
                                 "inundation", "what is flood"]):
            if any(k in t for k in ["prevent", "avoid", "protection", "safe", "precaution",
                                     "before", "during", "after", "what to do", "prepare"]):
                return "flood_safety"
            return "flood_info"

        # Landslide
        if any(k in t for k in ["landslide", "land slide", "mudslide", "rockfall",
                                 "slope", "soil erosion"]):
            if any(k in t for k in ["prevent", "avoid", "safe", "precaution", "what to do"]):
                return "landslide_safety"
            return "landslide_info"

        # Cyclone
        if any(k in t for k in ["cyclone", "hurricane", "storm", "storm surge"]):
            return "cyclone"

        # Rainfall
        if any(k in t for k in ["rain", "rainfall", "raining", "monsoon", "precipitation"]):
            return "rainfall"

        # Weather
        if any(k in t for k in ["weather", "temperature", "temp", "humidity", "pressure"]):
            return "live_query"

        # Risk / danger / safe
        if any(k in t for k in ["risk", "danger", "safe", "threat", "warning", "alert"]):
            return "live_query"

        # Evacuation
        if any(k in t for k in ["evacuate", "evacuation", "escape", "leave", "run",
                                 "shelter", "safe place", "refuge", "higher ground"]):
            return "evacuation"

        # Prevention / preparation
        if any(k in t for k in ["prevent", "avoid", "protection", "prepare", "ready",
                                 "precaution", "before", "minimize"]):
            return "prevention"

        # Emergency
        if any(k in t for k in ["emergency", "sos", "call", "helpline", "number",
                                 "contact", "rescue", "112", "1078", "phone"]):
            return "emergency"

        # Emergency Kit
        if any(k in t for k in ["kit", "bag", "pack", "supplies", "checklist",
                                 "essentials", "carry"]):
            return "kit"

        # First Aid
        if any(k in t for k in ["first aid", "injured", "wound", "drowning", "cpr",
                                 "medical", "sick", "hypothermia"]):
            return "first_aid"

        # Water safety
        if any(k in t for k in ["water", "drink", "clean water", "purify", "boil",
                                 "contaminated"]):
            return "water_safety"

        # Vulnerable groups
        if any(k in t for k in ["child", "children", "elderly", "pregnant", "disabled",
                                 "baby", "kids", "senior", "old people"]):
            return "vulnerable"

        # How prediction works
        if any(k in t for k in ["how does", "predict", "model", "machine learning",
                                 "sensor", "algorithm", "forecast", "how do you know"]):
            return "prediction"

        # Climate
        if any(k in t for k in ["climate", "global warming", "sea level"]):
            return "climate"

        # Default: try live data
        return "live_query"

    # ─────────────────────────────────────────────────────────────────
    #  RESOLVE LOCATION (city in text > last tracked > default)
    # ─────────────────────────────────────────────────────────────────
    def resolve_location(self, text: str):
        city_match = self.extract_city(text)
        if city_match:
            return city_match
        return self.get_last_location()

    # ─────────────────────────────────────────────────────────────────
    #  BUILD LIVE CONDITIONS RESPONSE
    # ─────────────────────────────────────────────────────────────────
    def build_live_response(self, text: str, lang: str) -> str:
        lat, lon, loc = self.resolve_location(text)
        weather = self.get_weather(lat, lon)

        if not weather:
            return self._no_live_data(lang)

        d = self.predict_conditions(weather, lat, lon, loc)
        alerts = self.get_db_alerts()

        if lang == "tamil":
            return self._live_tamil(loc, d, alerts)
        return self._live_english(loc, d, alerts)

    def _no_live_data(self, lang):
        if lang == "tamil":
            return (
                "I currently don't have live weather data.\n"
                "தற்போது நேரடி வானிலை தரவு கிடைக்கவில்லை.\n\n"
                "For real-time updates, please check:\n"
                "- IMD: mausam.imd.gov.in\n"
                "- Tamil Nadu Disaster Management Authority\n\n"
                "For emergencies, call 112."
            )
        return (
            "I currently don't have live weather data.\n\n"
            "For real-time updates, please check official sources:\n"
            "- IMD: mausam.imd.gov.in\n"
            "- National Disaster Management Authority: ndma.gov.in\n\n"
            "For emergencies, call 112."
        )

    def _live_english(self, loc, d, alerts):
        lines = []
        lines.append(f"Current Conditions - {loc}")
        lines.append("")
        lines.append(f"Weather: {d['description'].capitalize()}")
        lines.append(f"Temperature: {d['temperature']}C")
        lines.append(f"Humidity: {d['humidity']}%")
        lines.append(f"Pressure: {d['pressure']} hPa")

        if d['rain_mm'] > 0:
            lines.append(f"Rainfall: {d['rain_mm']} mm ({d['rain_cat']})")
        else:
            lines.append("Rainfall: No active rainfall")

        lines.append("")
        lines.append(f"Flood Risk: {d['flood_risk']}")
        lines.append(f"Landslide Risk: {d['landslide_risk']} - {d['landslide_note']}")

        # Active alerts from DB
        if alerts:
            lines.append("")
            lines.append("Active Alerts:")
            for a in alerts:
                lines.append(f"  {a['level'].upper()}: {a['message']}")

        # Advice
        lines.append("")
        if d['flood_risk'] == 'High' or d['landslide_risk'] == 'High':
            lines.append("HIGH RISK - Take action NOW!")
            lines.append("- Move to higher ground immediately")
            lines.append("- Avoid low-lying roads and river banks")
            lines.append("- Call 112 (National Emergency) or 1078 (Disaster Helpline)")
        elif d['flood_risk'] == 'Medium' or d['landslide_risk'] == 'Medium':
            lines.append("MODERATE RISK - Stay alert")
            lines.append("- Prepare your emergency kit")
            lines.append("- Monitor local weather updates")
            lines.append("- Keep emergency numbers ready: 112 / 1078")
        else:
            lines.append("Conditions look safe. Stay informed via FloodGuard dashboard.")
            lines.append("Check IMD for official forecasts: mausam.imd.gov.in")

        # Tamil summary
        lines.append("")
        lines.append("Tamil:")
        if d['flood_risk'] == 'High' or d['landslide_risk'] == 'High':
            lines.append("அதிக அபாயம்! உயரமான இடத்துக்கு உடனே செல்லுங்கள். 112 அழைக்கவும்.")
        elif d['flood_risk'] == 'Medium' or d['landslide_risk'] == 'Medium':
            lines.append("மிதமான அபாயம் - எச்சரிக்கையாக இருங்கள். அவசரகால கிட் தயார் செய்யுங்கள்.")
        else:
            lines.append("தற்போது பாதுகாப்பான நிலை. FloodGuard dashboard-ல் கண்காணியுங்கள்.")

        return "\n".join(lines)

    def _live_tamil(self, loc, d, alerts):
        lines = []
        lines.append(f"தற்போதைய நிலை - {loc}")
        lines.append("")
        lines.append(f"வானிலை: {d['description']}")
        lines.append(f"வெப்பநிலை: {d['temperature']}C")
        lines.append(f"ஈரப்பதம்: {d['humidity']}%")
        lines.append(f"அழுத்தம்: {d['pressure']} hPa")

        if d['rain_mm'] > 0:
            lines.append(f"மழைப்பொழிவு: {d['rain_mm']} மிமீ ({d['rain_cat']})")
        else:
            lines.append("மழைப்பொழிவு: தற்போது மழை இல்லை")

        lines.append("")
        flood_map = {"High": "அதிகம்", "Medium": "மிதமானது", "Low": "குறைவு"}
        lines.append(f"வெள்ள அபாயம்: {flood_map.get(d['flood_risk'], d['flood_risk'])}")
        lines.append(f"நிலச்சரிவு அபாயம்: {flood_map.get(d['landslide_risk'], d['landslide_risk'])}")

        if alerts:
            lines.append("")
            lines.append("எச்சரிக்கைகள்:")
            for a in alerts:
                lines.append(f"  {a['level'].upper()}: {a['message']}")

        lines.append("")
        if d['flood_risk'] == 'High' or d['landslide_risk'] == 'High':
            lines.append("அதிக அபாயம்! உடனடி நடவடிக்கை எடுங்கள்!")
            lines.append("- உயரமான இடத்துக்கு உடனே செல்லுங்கள்")
            lines.append("- ஆற்றங்கரைகளை தவிர்க்கவும்")
            lines.append("- 112 அல்லது 1078 அழைக்கவும்")
        elif d['flood_risk'] == 'Medium' or d['landslide_risk'] == 'Medium':
            lines.append("மிதமான அபாயம் - எச்சரிக்கையாக இருங்கள்")
            lines.append("- அவசரகால கிட் தயார் செய்யுங்கள்")
            lines.append("- உள்ளூர் வானிலையை கண்காணியுங்கள்")
        else:
            lines.append("தற்போது பாதுகாப்பான நிலை.")
            lines.append("IMD தளத்தை சரிபார்க்கவும்: mausam.imd.gov.in")

        return "\n".join(lines)

    # ─────────────────────────────────────────────────────────────────
    #  TOPIC RESPONSES  (structured, bilingual, context-aware)
    # ─────────────────────────────────────────────────────────────────
    def build_topic_response(self, intent: str, lang: str) -> str:
        """
        Build a structured response. If the topic was already covered in this
        session, give a shorter follow-up instead of repeating everything.
        """
        is_repeat = intent in self.topics_covered
        self.topics_covered.add(intent)

        method = getattr(self, f'_topic_{intent}', None)
        if method:
            return method(is_repeat)

        # Fallback
        return self._topic_fallback()

    # ── GREETING ─────────────────────────────────────────────────────
    def _topic_greeting(self, is_repeat=False):
        if is_repeat:
            return (
                "I'm still here! Ask me anything about floods, landslides, rainfall, "
                "or emergency safety.\n\n"
                "நான் இங்கே இருக்கிறேன்! வெள்ளம், நிலச்சரிவு பற்றி கேளுங்கள்."
            )
        return (
            "Hello! I'm FloodGuard AI - your disaster safety assistant.\n\n"
            "I can help you with:\n"
            "- Live flood & landslide risk at your location\n"
            "- Current rainfall, temperature & weather\n"
            "- Flood & landslide safety tips\n"
            "- Emergency contacts & evacuation guides\n"
            "- Emergency kit preparation\n\n"
            "Try asking:\n"
            "- 'What is the current flood risk?'\n"
            "- 'Is it raining in Chennai?'\n"
            "- 'How to stay safe during floods?'\n"
            "- 'Emergency contacts'\n\n"
            "Tamil:\n"
            "வணக்கம்! நான் FloodGuard AI உதவியாளர்.\n"
            "வெள்ளம், நிலச்சரிவு, பாதுகாப்பு பற்றி கேளுங்கள்!\n"
            "எடுத்துக்காட்டு: 'தற்போதைய வெள்ள அபாயம் என்ன?'"
        )

    # ── FLOOD INFO ───────────────────────────────────────────────────
    def _topic_flood_info(self, is_repeat=False):
        if is_repeat:
            return (
                "You already asked about floods. Would you like to know:\n"
                "- Flood safety tips?\n"
                "- Current flood risk at your location?\n"
                "- How to evacuate?\n\n"
                "Just ask and I'll help!"
            )
        return (
            "What is a Flood?\n"
            "A flood happens when water covers normally dry land due to heavy "
            "rainfall, river overflow, or storm surge.\n\n"
            "Tamil:\n"
            "வெள்ளம் என்பது கனமழை, நதி கரை மீறுதல் அல்லது புயல் அலை "
            "காரணமாக நிலத்தை நீர் மூழ்கடிக்கும் நிலை.\n\n"
            "Types of Floods:\n"
            "- Flash Floods - occur within 6 hours of heavy rain (most deadly)\n"
            "- River Floods - river banks overflow after sustained rain\n"
            "- Coastal Floods - caused by storm surge, cyclones\n"
            "- Urban Floods - poor city drainage overwhelmed by rain\n\n"
            "Causes:\n"
            "- Heavy or prolonged rainfall\n"
            "- River/dam overflow\n"
            "- Poor drainage systems\n"
            "- Cyclone storm surge\n\n"
            "Tamil:\n"
            "காரணங்கள்:\n"
            "- கனமழை\n"
            "- நதி கரை மீறுதல்\n"
            "- மோசமான வடிகால் வசதி\n\n"
            "Where in India:\n"
            "Chennai, Mumbai, Kolkata, Brahmaputra valley, Bihar, Assam, "
            "and coastal regions are most flood-prone.\n\n"
            "Warning Signs:\n"
            "- Rapidly rising water levels\n"
            "- Hours of continuous heavy rain\n"
            "- River banks looking unusually full\n\n"
            "Want to know the current flood risk at your location? Just ask!"
        )

    # ── FLOOD SAFETY ─────────────────────────────────────────────────
    def _topic_flood_safety(self, is_repeat=False):
        if is_repeat:
            return (
                "Quick flood safety reminder:\n"
                "Before: Pack emergency kit, charge phone\n"
                "During: Move to higher ground, avoid flood water\n"
                "After: Don't drink tap water, avoid low areas\n"
                "Emergency: Call 112\n\n"
                "Tamil:\n"
                "முன்: கிட் தயார், போன் சார்ஜ்\n"
                "போது: உயரமான இடத்துக்கு செல்லுங்கள்\n"
                "பிறகு: குழாய் நீர் குடிக்காதீர்கள்\n"
                "அவசரம்: 112 அழைக்கவும்"
            )
        return (
            "Flood Safety - Complete Guide\n\n"
            "BEFORE a Flood:\n"
            "- Prepare emergency kit (water, food, medicines, torch, documents)\n"
            "- Move valuables to upper floors\n"
            "- Charge all phones and power banks\n"
            "- Know your nearest evacuation route\n"
            "- Unplug electrical appliances\n\n"
            "Tamil - முன்:\n"
            "- அவசரகால கிட் தயார் செய்யுங்கள்\n"
            "- மதிப்புமிக்க பொருட்களை மேல் தளத்துக்கு மாற்றுங்கள்\n"
            "- போன் சார்ஜ் செய்யுங்கள்\n\n"
            "DURING a Flood:\n"
            "- NEVER walk or drive through flood water\n"
            "- Move to the highest point in your building\n"
            "- Do NOT touch electrical switches if floor is wet\n"
            "- Avoid bridges over fast-flowing rivers\n"
            "- Call 112 or 1078 for help\n\n"
            "Tamil - போது:\n"
            "- வெள்ள நீரில் நடக்கவோ ஓட்டவோ வேண்டாம்\n"
            "- உயரமான இடத்துக்கு செல்லுங்கள்\n"
            "- 112 அல்லது 1078 அழைக்கவும்\n\n"
            "AFTER a Flood:\n"
            "- Wait for official all-clear before returning\n"
            "- Do NOT drink tap water - it may be contaminated\n"
            "- Watch for downed power lines\n"
            "- Disinfect everything that touched flood water\n\n"
            "Tamil - பிறகு:\n"
            "- அதிகாரப்பூர்வ அனுமதிக்கு காத்திருங்கள்\n"
            "- குழாய் நீரை குடிக்காதீர்கள்\n"
            "- மின் கம்பிகளை கவனமாக இருங்கள்"
        )

    # ── LANDSLIDE INFO ───────────────────────────────────────────────
    def _topic_landslide_info(self, is_repeat=False):
        if is_repeat:
            return (
                "You already asked about landslides. Would you like to know:\n"
                "- Current landslide risk?\n"
                "- Landslide safety tips?\n"
                "- How to evacuate?"
            )
        return (
            "What is a Landslide?\n"
            "A landslide is the movement of rock, earth, or debris down a slope, "
            "often triggered by heavy rainfall.\n\n"
            "Tamil:\n"
            "நிலச்சரிவு என்பது மழை காரணமாக சரிவில் பாறை, மண் "
            "நகர்வதாகும்.\n\n"
            "Causes:\n"
            "- Heavy or prolonged rainfall (most common in India)\n"
            "- Earthquake vibrations\n"
            "- Deforestation / loss of tree roots\n"
            "- Construction on unstable slopes\n"
            "- Mining and quarrying\n\n"
            "Tamil - காரணங்கள்:\n"
            "- கனமழை\n"
            "- நிலநடுக்கம்\n"
            "- காடழிப்பு\n"
            "- நிலையற்ற சரிவுகளில் கட்டுமானம்\n\n"
            "Where in India:\n"
            "Western Ghats (Kerala, Karnataka, Tamil Nadu hills), "
            "Himalayas (Uttarakhand, Himachal), Northeast India (Assam, Meghalaya)\n\n"
            "Warning Signs:\n"
            "- Cracks appearing in walls or ground\n"
            "- Tilting trees, poles, or fences\n"
            "- Unusual rumbling or cracking sounds\n"
            "- Water seeping through soil\n"
            "- Streams suddenly turning muddy\n\n"
            "Tamil - எச்சரிக்கை அறிகுறிகள்:\n"
            "- சுவர்கள் அல்லது தரையில் விரிசல்கள்\n"
            "- மரங்கள் சாய்தல்\n"
            "- அசாதாரண சத்தங்கள்\n"
            "- நீர் ஊடுருவல்"
        )

    # ── LANDSLIDE SAFETY ─────────────────────────────────────────────
    def _topic_landslide_safety(self, is_repeat=False):
        if is_repeat:
            return (
                "Landslide safety reminder:\n"
                "- Move perpendicular to the slope (sideways, not downhill)\n"
                "- Get to flat, open ground\n"
                "- Call 112 immediately\n\n"
                "Tamil:\n"
                "- சரிவுக்கு குறுக்காக நகரவும்\n"
                "- தட்டையான இடத்துக்கு செல்லுங்கள்\n"
                "- 112 அழைக்கவும்"
            )
        return (
            "Landslide Safety Guide\n\n"
            "If you suspect a landslide:\n"
            "- Evacuate immediately\n"
            "- Move perpendicular to the slope (sideways, NOT downhill)\n"
            "- Get to flat, open area far from valleys\n"
            "- Call 112 or 1078 immediately\n"
            "- Alert your neighbours\n\n"
            "If trapped:\n"
            "- Cover your head to protect from debris\n"
            "- Signal for help with whistle or bright cloth\n"
            "- Stay calm and conserve energy\n\n"
            "Prevention:\n"
            "- Avoid building near steep slopes\n"
            "- Plant trees to stabilise soil\n"
            "- Watch for warning signs (cracks, tilting trees)\n"
            "- Evacuate early during heavy rain in hilly areas\n\n"
            "Tamil:\n"
            "உடனடி நடவடிக்கைகள்:\n"
            "- உடனடியாக வெளியேறுங்கள்\n"
            "- சரிவுக்கு குறுக்காக நகரவும் (கீழ் நோக்கி அல்ல)\n"
            "- 112 அல்லது 1078 அழைக்கவும்\n\n"
            "சிக்கினால்:\n"
            "- தலையை பாதுகாக்கவும்\n"
            "- உதவி கோருங்கள்"
        )

    # ── CYCLONE ──────────────────────────────────────────────────────
    def _topic_cyclone(self, is_repeat=False):
        if is_repeat:
            return (
                "Cyclone safety reminder:\n"
                "- Stay indoors, away from windows\n"
                "- Avoid coastal areas\n"
                "- Follow evacuation orders\n"
                "- Call 112 for emergencies\n\n"
                "Tamil:\n"
                "- வீட்டில் இருங்கள்\n"
                "- கடலோர பகுதிகளை தவிர்க்கவும்\n"
                "- 112 அழைக்கவும்"
            )
        return (
            "Cyclone Safety Guide\n\n"
            "What is a Cyclone?\n"
            "A tropical cyclone is a powerful storm with strong winds and heavy rain, "
            "common in the Bay of Bengal (Oct-Dec).\n\n"
            "Tamil:\n"
            "சுழற்காற்று என்பது வலுவான காற்று மற்றும் கனமழையுடன் கூடிய "
            "சக்திவாய்ந்த புயல் ஆகும்.\n\n"
            "Before a Cyclone:\n"
            "- Stock up on water, food, medicines\n"
            "- Secure loose objects outside\n"
            "- Charge phones and power banks\n"
            "- Know evacuation routes\n\n"
            "During a Cyclone:\n"
            "- Stay indoors, away from windows\n"
            "- Avoid coastal areas and beaches\n"
            "- Do NOT go outside during the eye of the storm\n"
            "- Follow evacuation orders immediately\n\n"
            "After a Cyclone:\n"
            "- Wait for official all-clear\n"
            "- Avoid downed power lines\n"
            "- Beware of flooding in low-lying areas\n\n"
            "Tamil:\n"
            "- புயலின் போது வீட்டில் இருங்கள்\n"
            "- கடலோர பகுதிகளை தவிர்க்கவும்\n"
            "- வெளியேற்ற உத்தரவுகளை உடனே பின்பற்றுங்கள்\n\n"
            "Most vulnerable: Tamil Nadu coast, Andhra Pradesh, Odisha, West Bengal.\n"
            "Check IMD cyclone tracking: mausam.imd.gov.in"
        )

    # ── RAINFALL ─────────────────────────────────────────────────────
    def _topic_rainfall(self, is_repeat=False):
        # Always try to fetch live data for rainfall questions
        lat, lon, loc = self.resolve_location("")
        weather = self.get_weather(lat, lon)
        if weather:
            d = self.predict_conditions(weather, lat, lon, loc)
            return (
                f"Rainfall Info - {loc}\n\n"
                f"Current conditions:\n"
                f"- Weather: {d['description'].capitalize()}\n"
                f"- Rainfall: {d['rain_mm']} mm ({d['rain_cat']})\n"
                f"- Humidity: {d['humidity']}%\n"
                f"- Temperature: {d['temperature']}C\n\n"
                f"Flood Risk: {d['flood_risk']}\n\n"
                "India Monsoon Seasons:\n"
                "- Southwest Monsoon: June to September (main rainy season)\n"
                "- Northeast Monsoon: October to December (Tamil Nadu, south coast)\n\n"
                "For official forecasts, check IMD: mausam.imd.gov.in\n\n"
                "Tamil:\n"
                f"- தற்போதைய மழை: {d['rain_mm']} மிமீ ({d['rain_cat']})\n"
                "- அதிகாரப்பூர்வ முன்னறிவிப்பு: mausam.imd.gov.in"
            )
        return (
            "India Monsoon Seasons:\n"
            "- Southwest Monsoon: June to September (main rainy season)\n"
            "- Northeast Monsoon: October to December (Tamil Nadu, south coast)\n\n"
            "For live rainfall data, check IMD: mausam.imd.gov.in\n\n"
            "Tamil:\n"
            "- தென்மேற்கு பருவமழை: ஜூன் - செப்டம்பர்\n"
            "- வடகிழக்கு பருவமழை: அக்டோபர் - டிசம்பர் (தமிழ்நாடு)\n"
            "- நேரடி மழை தரவு: mausam.imd.gov.in"
        )

    # ── EVACUATION ───────────────────────────────────────────────────
    def _topic_evacuation(self, is_repeat=False):
        if is_repeat:
            return (
                "Evacuation steps (quick reminder):\n"
                "1. Stay calm\n"
                "2. Grab emergency kit\n"
                "3. Move to higher ground\n"
                "4. Follow official routes\n"
                "5. Call 112 if needed\n\n"
                "Tamil:\n"
                "1. அமைதியாக இருங்கள்\n"
                "2. அவசரகால கிட் எடுங்கள்\n"
                "3. உயரமான இடத்துக்கு செல்லுங்கள்\n"
                "4. 112 அழைக்கவும்"
            )
        return (
            "Evacuation Guide - Step by Step\n\n"
            "1. Stay calm - Do not panic\n"
            "2. Listen to official alerts (radio, TV, government apps)\n"
            "3. Pack essentials:\n"
            "   - Water (3 litres per person)\n"
            "   - Ready-to-eat food\n"
            "   - Important documents (Aadhaar, insurance)\n"
            "   - Medicines\n"
            "   - Phone charger / power bank\n"
            "   - Torch with batteries\n"
            "   - Cash (ATMs may be down)\n"
            "4. Wear sturdy footwear\n"
            "5. Move to higher / safer ground\n"
            "6. NEVER walk through flood water\n"
            "7. NEVER drive on flooded roads\n"
            "8. Follow police-directed evacuation routes\n"
            "9. Help children, elderly, and disabled persons first\n"
            "10. Call 112 if you need rescue\n\n"
            "Tamil:\n"
            "1. அமைதியாக இருங்கள்\n"
            "2. அதிகாரப்பூர்வ எச்சரிக்கைகளை கேளுங்கள்\n"
            "3. அத்தியாவசிய பொருட்கள் எடுங்கள்:\n"
            "   - நீர், உணவு, ஆவணங்கள், மருந்துகள்\n"
            "4. உறுதியான காலணி அணியுங்கள்\n"
            "5. உயரமான இடத்துக்கு செல்லுங்கள்\n"
            "6. வெள்ள நீரில் நடக்காதீர்கள்\n"
            "7. குழந்தைகள், முதியோருக்கு முதலில் உதவுங்கள்\n"
            "8. 112 அழைக்கவும்"
        )

    # ── PREVENTION ───────────────────────────────────────────────────
    def _topic_prevention(self, is_repeat=False):
        if is_repeat:
            return (
                "Prevention reminder:\n"
                "- Keep drains clear\n"
                "- Prepare emergency kit\n"
                "- Know evacuation routes\n"
                "- Monitor IMD updates\n\n"
                "Tamil:\n"
                "- வடிகால்களை சுத்தமாக வையுங்கள்\n"
                "- அவசரகால கிட் தயார் செய்யுங்கள்"
            )
        return (
            "Flood & Landslide Prevention Tips\n\n"
            "Flood Prevention:\n"
            "- Clear gutters and drains around your home\n"
            "- Do not throw garbage in drains or waterways\n"
            "- Move valuables to upper floors during monsoon\n"
            "- Install non-return valves on drains\n"
            "- Keep sandbags ready if in a flood-prone area\n\n"
            "Landslide Prevention:\n"
            "- Avoid building on steep slopes or unstable hills\n"
            "- Plant trees and vegetation to stabilise soil\n"
            "- Build proper retaining walls\n"
            "- Do not cut slopes without expert guidance\n"
            "- Report cracks in hills to local authorities\n\n"
            "General Preparedness:\n"
            "- Prepare a 72-hour emergency kit\n"
            "- Know your nearest shelter and evacuation route\n"
            "- Keep emergency contacts saved on phone\n"
            "- Monitor IMD forecasts during monsoon: mausam.imd.gov.in\n\n"
            "Tamil:\n"
            "வெள்ள தடுப்பு:\n"
            "- வடிகால்களை சுத்தமாக வையுங்கள்\n"
            "- குப்பைகளை நீர்நிலைகளில் போடாதீர்கள்\n\n"
            "நிலச்சரிவு தடுப்பு:\n"
            "- செங்குத்தான சரிவுகளில் கட்டாதீர்கள்\n"
            "- மரங்கள் நடுங்கள்\n\n"
            "பொதுவான தயாரிப்பு:\n"
            "- 72 மணி நேர அவசரகால கிட் தயார் செய்யுங்கள்\n"
            "- அருகிலுள்ள தங்குமிடம் தெரிந்துகொள்ளுங்கள்"
        )

    # ── EMERGENCY CONTACTS ───────────────────────────────────────────
    def _topic_emergency(self, is_repeat=False):
        return (
            "Emergency Contacts - India\n\n"
            "National:\n"
            "- All Emergencies: 112\n"
            "- National Disaster: 1078\n"
            "- Police: 100\n"
            "- Fire Department: 101\n"
            "- Ambulance: 108\n"
            "- Women Helpline: 1091\n"
            "- Child Helpline: 1098\n\n"
            "Disaster Management:\n"
            "- NDRF Helpline: 011-24363260\n"
            "- NDMA: 011-26701728\n\n"
            "Tamil Nadu Specific:\n"
            "- TN Disaster Helpline: 1070\n"
            "- TN Relief Commissioner: 044-28519999\n"
            "- Chennai Flood Control: 044-25384510\n\n"
            "In IMMEDIATE danger? Call 112 RIGHT NOW!\n\n"
            "Tamil:\n"
            "அவசரகால தொடர்பு எண்கள்:\n"
            "- அனைத்து அவசரகாலம்: 112\n"
            "- தேசிய பேரிடர்: 1078\n"
            "- காவல்துறை: 100\n"
            "- ஆம்புலன்ஸ்: 108\n"
            "- தமிழ்நாடு பேரிடர் உதவி: 1070\n\n"
            "உடனடி ஆபத்தில் இருந்தால் 112 அழைக்கவும்!"
        )

    # ── EMERGENCY KIT ────────────────────────────────────────────────
    def _topic_kit(self, is_repeat=False):
        if is_repeat:
            return (
                "Emergency kit essentials:\n"
                "Water, food, medicines, documents, torch, phone charger, cash, "
                "first aid kit, rope.\n\n"
                "Tamil:\n"
                "நீர், உணவு, மருந்துகள், ஆவணங்கள், டார்ச், சார்ஜர், பணம்."
            )
        return (
            "Emergency Kit Checklist\n\n"
            "Documents (waterproof bag):\n"
            "- Aadhaar card / ID proof\n"
            "- Insurance papers\n"
            "- Medical prescriptions\n\n"
            "Food & Water:\n"
            "- 3 litres of water per person per day (3-day supply)\n"
            "- Ready-to-eat food, biscuits, dry fruits\n"
            "- Personal medicines (7-day supply)\n\n"
            "Tools & Equipment:\n"
            "- Torch + extra batteries\n"
            "- Battery-powered radio\n"
            "- Fully charged power bank\n"
            "- Rope (for emergency rescue)\n"
            "- First aid kit + antiseptic\n\n"
            "Other:\n"
            "- Extra clothing in waterproof bag\n"
            "- Fully charged phone\n"
            "- Cash (ATMs may be down)\n"
            "- Whistle (to signal for help)\n\n"
            "Keep this kit packed and ready at ALL times!\n\n"
            "Tamil:\n"
            "அவசரகால கிட்:\n"
            "- நீர் (நாளுக்கு நபருக்கு 3 லிட்டர்)\n"
            "- உணவு, மருந்துகள்\n"
            "- ஆவணங்கள் (நீர்புகாத பையில்)\n"
            "- டார்ச், பவர் பேங்க்\n"
            "- முதலுதவி பெட்டி\n"
            "- பணம், கயிறு\n\n"
            "எப்போதும் தயாராக வையுங்கள்!"
        )

    # ── FIRST AID ────────────────────────────────────────────────────
    def _topic_first_aid(self, is_repeat=False):
        if is_repeat:
            return (
                "First aid reminder:\n"
                "- Drowning: Call 112, throw floating object, CPR if needed\n"
                "- Hypothermia: Remove wet clothes, wrap in blankets\n"
                "- Wounds: Clean with antiseptic, cover with bandage\n\n"
                "Tamil:\n"
                "- 112 அழைக்கவும்\n"
                "- CPR தொடங்கவும்\n"
                "- காயங்களை கிருமிநாசினியால் சுத்தம் செய்யுங்கள்"
            )
        return (
            "First Aid During Floods\n\n"
            "Drowning - Immediate Steps:\n"
            "1. Call 112 immediately\n"
            "2. Do NOT enter deep water unless trained\n"
            "3. Throw a rope, life jacket, or floating object\n"
            "4. Once safe: check breathing\n"
            "5. If not breathing: start CPR\n"
            "   (30 chest compressions, 2 rescue breaths, repeat)\n\n"
            "Hypothermia (too cold):\n"
            "- Move to warm shelter immediately\n"
            "- Remove wet clothes, wrap in dry blankets\n"
            "- Do NOT rub limbs\n\n"
            "Flood Water Diseases:\n"
            "- Cholera: vomiting, severe diarrhoea\n"
            "- Leptospirosis: fever, muscle pain after flood contact\n"
            "- Typhoid: sustained fever, abdominal pain\n"
            "- Malaria: fever, chills after mosquito bite\n\n"
            "Disinfect all wounds exposed to flood water immediately.\n\n"
            "Tamil:\n"
            "முதலுதவி:\n"
            "- 112 அழைக்கவும்\n"
            "- கயிறு அல்லது life jacket எறியுங்கள்\n"
            "- சுவாசிக்கவில்லை என்றால் CPR தொடங்கவும்\n"
            "- ஈரமான ஆடைகளை கழற்றி போர்வையால் மூடுங்கள்"
        )

    # ── WATER SAFETY ─────────────────────────────────────────────────
    def _topic_water_safety(self, is_repeat=False):
        if is_repeat:
            return (
                "Water safety reminder:\n"
                "- NEVER drink flood water\n"
                "- Boil water for 1 minute before drinking\n"
                "- Use sealed bottled water if available\n\n"
                "Tamil:\n"
                "- வெள்ள நீரை குடிக்காதீர்கள்\n"
                "- 1 நிமிடம் கொதிக்க வையுங்கள்"
            )
        return (
            "Safe Water During Floods\n\n"
            "NEVER drink:\n"
            "- Flood water (even if clear - it is contaminated)\n"
            "- Well water that was submerged in flood\n"
            "- Tap water until officially declared safe\n\n"
            "Safe sources:\n"
            "- Sealed bottled water\n"
            "- Government-supplied water tankers\n\n"
            "How to Purify Water:\n"
            "1. Boiling: Full rolling boil for 1 minute\n"
            "2. Chlorination: 2 drops of liquid bleach per 1 litre, wait 30 min\n"
            "3. Tablets: 1 chlorine purification tablet per 1 litre\n"
            "4. Solar: Fill clear bottle, place in sun for 6 hours\n\n"
            "Tamil:\n"
            "குடிக்க வேண்டாம்:\n"
            "- வெள்ள நீர்\n"
            "- மூழ்கிய கிணற்று நீர்\n\n"
            "சுத்திகரிப்பு:\n"
            "- 1 நிமிடம் கொதிக்க வையுங்கள்\n"
            "- குளோரின் மாத்திரை பயன்படுத்துங்கள்"
        )

    # ── VULNERABLE GROUPS ────────────────────────────────────────────
    def _topic_vulnerable(self, is_repeat=False):
        if is_repeat:
            return (
                "Protecting vulnerable people:\n"
                "- Help children and elderly evacuate FIRST\n"
                "- Keep medicines ready for seniors\n"
                "- Pregnant women should evacuate early\n\n"
                "Tamil:\n"
                "- குழந்தைகள், முதியோரை முதலில் வெளியேற்றுங்கள்\n"
                "- கர்ப்பிணிகள் முன்கூட்டியே வெளியேற வேண்டும்"
            )
        return (
            "Safety for Children, Elderly & Vulnerable People\n\n"
            "Children:\n"
            "- Never leave children alone during flood\n"
            "- Teach them to call 112 and say their home address\n"
            "- Keep them away from flood water (drowning risk)\n"
            "- Watch for hypothermia signs: shivering, confusion\n\n"
            "Elderly:\n"
            "- Help them evacuate FIRST\n"
            "- Assist with medications\n"
            "- Higher risk of hypothermia - keep warm\n"
            "- Ensure they drink enough water\n\n"
            "Pregnant Women:\n"
            "- Evacuate EARLY - do not wait\n"
            "- Keep prenatal documents in emergency kit\n\n"
            "Disabled Individuals:\n"
            "- Plan accessible evacuation route in advance\n"
            "- Keep mobility aids near exit\n\n"
            "Tamil:\n"
            "குழந்தைகள்:\n"
            "- தனியாக விடாதீர்கள்\n"
            "- 112 அழைக்க கற்றுக்கொடுங்கள்\n\n"
            "முதியோர்:\n"
            "- முதலில் வெளியேற உதவுங்கள்\n"
            "- மருந்துகள் தயாராக வையுங்கள்\n\n"
            "கர்ப்பிணிகள்:\n"
            "- முன்கூட்டியே வெளியேறுங்கள்"
        )

    # ── PREDICTION METHOD ────────────────────────────────────────────
    def _topic_prediction(self, is_repeat=False):
        return (
            "How FloodGuard Predicts Floods\n\n"
            "Live Data Sources:\n"
            "- OpenWeatherMap API: real-time rainfall, humidity, pressure\n"
            "- GPS location tracking of users\n"
            "- Known risk zone database (Haversine distance checks)\n\n"
            "Prediction Parameters:\n"
            "- Rainfall (mm/hr): primary flood trigger\n"
            "- Humidity (%): soil saturation indicator\n"
            "- Pressure (hPa): low pressure = storm systems\n"
            "- Temperature: affects evaporation and storm intensity\n\n"
            "Risk Thresholds:\n"
            "- LOW: Rainfall < 5 cm/day, Humidity < 70%\n"
            "- MEDIUM: Rainfall 5-20 cm/day, Humidity 70-85%\n"
            "- HIGH: Rainfall > 20 cm/day OR Humidity > 85% OR Pressure < 980 hPa\n\n"
            "Landslide prediction adds:\n"
            "- Location type (hilly/coastal terrain)\n"
            "- Known landslide-prone zone detection\n"
            "- Combined rainfall + humidity analysis\n\n"
            "Tamil:\n"
            "FloodGuard எவ்வாறு வெள்ளத்தை முன்கணிக்கிறது:\n"
            "- நேரடி மழை, ஈரப்பதம், அழுத்தம் தரவு\n"
            "- GPS இருப்பிட கண்காணிப்பு\n"
            "- அறியப்பட்ட அபாய மண்டலங்கள்"
        )

    # ── CLIMATE ──────────────────────────────────────────────────────
    def _topic_climate(self, is_repeat=False):
        return (
            "Climate Change & Floods in India\n\n"
            "Why floods are getting worse:\n"
            "- Global warming intensifies rainfall events\n"
            "- Sea level rise increases coastal flooding\n"
            "- More frequent and intense Bay of Bengal cyclones\n"
            "- Erratic monsoons - both drought and extreme rain\n\n"
            "Most Vulnerable Regions:\n"
            "- Coastal India: cyclones, storm surge\n"
            "- Himalayas: glacial lake outburst floods (GLOF)\n"
            "- Brahmaputra basin: annual mega-floods\n"
            "- Mumbai, Chennai: urban flash floods\n\n"
            "Stay informed:\n"
            "- IMD: mausam.imd.gov.in\n"
            "- NDMA: ndma.gov.in\n\n"
            "Tamil:\n"
            "காலநிலை மாற்றம் மற்றும் வெள்ளம்:\n"
            "- புவி வெப்பமடைதல் மழையை தீவிரப்படுத்துகிறது\n"
            "- கடல் மட்ட உயர்வு கடலோர வெள்ளத்தை அதிகரிக்கிறது\n"
            "- வங்கக்கடலில் சுழற்காற்றுகள் அதிகரிப்பு"
        )

    # ── FALLBACK ─────────────────────────────────────────────────────
    def _topic_fallback(self):
        return (
            "I'm your flood and disaster safety assistant. "
            "I can help you with:\n\n"
            "- Current flood & landslide risk (ask 'current risk')\n"
            "- Live rainfall & weather data (ask 'is it raining?')\n"
            "- Flood safety tips (ask 'flood safety')\n"
            "- Landslide information (ask 'what is landslide?')\n"
            "- Emergency contacts (ask 'emergency contacts')\n"
            "- Evacuation guide (ask 'how to evacuate?')\n"
            "- Emergency kit list (ask 'emergency kit')\n\n"
            "Try asking your question again, or pick one of the topics above!\n\n"
            "Tamil:\n"
            "நான் உங்கள் பேரிடர் பாதுகாப்பு உதவியாளர். "
            "வெள்ளம், நிலச்சரிவு, பாதுகாப்பு குறிப்புகள் பற்றி கேளுங்கள்!"
        )

    # ─────────────────────────────────────────────────────────────────
    #  GEMINI LLM (optional)
    # ─────────────────────────────────────────────────────────────────
    def build_live_context_string(self, text: str) -> str:
        lat, lon, loc = self.resolve_location(text)
        weather = self.get_weather(lat, lon)
        if not weather:
            return f"Location: {loc}. Weather data unavailable."
        d = self.predict_conditions(weather, lat, lon, loc)
        alerts = self.get_db_alerts()

        ctx = (
            f"Location: {loc} (lat={lat:.4f}, lon={lon:.4f})\n"
            f"Temperature: {d['temperature']}C\n"
            f"Humidity: {d['humidity']}%\n"
            f"Pressure: {d['pressure']} hPa\n"
            f"Rainfall: {d['rain_mm']} mm - {d['rain_cat']}\n"
            f"Weather: {d['description']}\n"
            f"Flood Risk: {d['flood_risk']}\n"
            f"Landslide Risk: {d['landslide_risk']} - {d['landslide_note']}\n"
        )
        if alerts:
            ctx += "Active Alerts:\n"
            for a in alerts:
                ctx += f"  {a['level'].upper()}: {a['message']}\n"
        return ctx

    def get_llm_response(self, text, lang, live_ctx):
        lang_name = "Tamil and English (bilingual)" if lang == "tamil" else "English with short Tamil translations for key points"
        prompt = (
            f"You are FloodGuard AI - an expert Disaster Awareness & Emergency Safety "
            f"Assistant for India, especially Tamil Nadu.\n\n"
            f"RULES:\n"
            f"- Respond in {lang_name}.\n"
            f"- Use simple, clear language. Avoid technical jargon.\n"
            f"- Keep responses short and scannable (bullet points, short headings).\n"
            f"- Use the LIVE DATA below when answering about current conditions.\n"
            f"- NEVER fake or guess real-time data.\n"
            f"- If risk is High, urge the user to call 112.\n"
            f"- Include Tamil translation for key safety points.\n"
            f"- Do not use markdown asterisks or hashtags.\n"
            f"- If unrelated question, politely redirect to disaster safety.\n\n"
            f"LIVE DATA:\n{live_ctx}\n\n"
            f"CONVERSATION HISTORY (last 3):\n"
        )
        for entry in self.conversation_history[-3:]:
            prompt += f"  User: {entry.get('user', '')}\n"
            if 'bot' in entry:
                prompt += f"  Bot: {entry['bot'][:100]}...\n"

        prompt += f"\nUser question: \"{text}\"\n"

        try:
            resp = self._genai_client.models.generate_content(
                model='gemini-1.5-flash',
                contents=prompt
            )
            return resp.text.replace('*', '').replace('#', '').strip()
        except Exception as e:
            print(f"[Gemini] {e}")
            return None

    # ─────────────────────────────────────────────────────────────────
    #  MAIN ENTRY POINT
    # ─────────────────────────────────────────────────────────────────
    def get_response(self, text: str) -> str:
        try:
            lang   = self.detect_language(text)
            self.current_language = lang
            intent = self.detect_intent(text)

            self.conversation_history.append({"user": text, "language": lang})

            # ── A) Gemini LLM (if configured) ────────────────────────
            if self.use_llm:
                live_ctx = self.build_live_context_string(text)
                reply    = self.get_llm_response(text, lang, live_ctx)
                if reply:
                    self.conversation_history[-1]["bot"] = reply
                    return reply
                # Fall through if Gemini failed

            # ── B) Live data query ────────────────────────────────────
            if intent == "live_query":
                reply = self.build_live_response(text, lang)
                self.conversation_history[-1]["bot"] = reply
                return reply

            # ── C) Topic-based response (context-aware) ──────────────
            reply = self.build_topic_response(intent, lang)
            self.conversation_history[-1]["bot"] = reply
            return reply

        except Exception as e:
            print(f"[chatbot] error: {e}")
            if self.current_language == "tamil":
                return (
                    "An error occurred. Please try again.\n"
                    "ஒரு பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.\n"
                    "For emergencies, call 112.\n"
                    "அவசரத்திற்கு 112 அழைக்கவும்."
                )
            return (
                "An error occurred. Please try again.\n"
                "For emergencies, call 112."
            )


# ── Quick test ───────────────────────────────────────────────────────
if __name__ == "__main__":
    bot = FloodLandslideChatbot()
    # Only test intent detection (avoids emoji encoding issue on Windows terminal)
    tests = [
        "what is the current flood risk?",
        "is it raining now?",
        "how to prevent flood?",
        "what is landslide?",
        "emergency contacts",
        "how to evacuate?",
        "what is a flood?",
        "rainfall in Chennai",
    ]
    for q in tests:
        intent = bot.detect_intent(q)
        print(f"Q: {q:40s} -> intent: {intent}")
