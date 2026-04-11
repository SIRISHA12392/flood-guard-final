import sqlite3
 
conn = sqlite3.connect('floodguard.db')
c = conn.cursor()
 
c.execute('''CREATE TABLE IF NOT EXISTS sensor_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    river_level REAL DEFAULT 72.0,
    rainfall_mm REAL DEFAULT 94.0,
    sensors_online INTEGER DEFAULT 84,
    sensors_total INTEGER DEFAULT 89,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)''')
 
c.execute('''CREATE TABLE IF NOT EXISTS shelters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    area TEXT,
    capacity INTEGER DEFAULT 500,
    current_occupancy INTEGER DEFAULT 0,
    distance_km REAL DEFAULT 1.0,
    status TEXT DEFAULT 'open',
    lat REAL,
    lng REAL,
    type TEXT DEFAULT 'hall'
)''')
 
c.execute('''CREATE TABLE IF NOT EXISTS flood_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT DEFAULT 'info',
    message TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)''')
 
c.execute('''CREATE TABLE IF NOT EXISTS evacuation_routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    risk_level TEXT DEFAULT 'low',
    est_time TEXT,
    distance TEXT,
    via_description TEXT,
    status TEXT DEFAULT 'clear'
)''')
 
# Insert sample shelters
c.executemany('INSERT INTO shelters (name,area,capacity,current_occupancy,distance_km,status,lat,lng,type) VALUES (?,?,?,?,?,?,?,?,?)', [
    ('Government Higher Secondary School', 'Sathankulam', 500, 120, 1.2, 'open', 8.409, 77.913, 'school'),
    ('Tirunelveli District Collector Office', 'Tirunelveli', 800, 340, 3.8, 'open', 8.727, 77.693, 'govt'),
    ('NDRF Relief Camp - Palayamkottai', 'Palayamkottai', 1200, 450, 6.3, 'open', 8.711, 77.755, 'ndrf'),
])
 
# Insert sample alerts
c.executemany('INSERT INTO flood_alerts (level, message) VALUES (?,?)', [
    ('critical', 'Flash flood warning issued for Tamirabarani River basin. Water level at 92% capacity.'),
    ('warning', 'Landslide risk elevated in Kalakad hills due to 180mm rainfall in last 6 hours.'),
    ('info', 'NDRF team deployed at Palayamkottai. 4 rescue boats operational.'),
])
 
# Insert sample routes
c.executemany('INSERT INTO evacuation_routes (name,risk_level,est_time,distance,via_description,status) VALUES (?,?,?,?,?,?)', [
    ('Route A – NH44 Bypass', 'low', '12 min', '8.4 km', 'Palayamkottai Road → NH44', 'clear'),
    ('Route B – East Coast Road', 'medium', '18 min', '11.2 km', 'ECR → Coastal Highway', 'caution'),
    ('Route C – Bypass via Nellai', 'high', '31 min', '16.8 km', 'Old Nellai Road', 'blocked'),
])
 
conn.commit()
conn.close()
print("Database initialized!")