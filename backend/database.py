import sqlite3
import os
import bcrypt
from datetime import datetime, timedelta

# ── Existing auth DB (db.sqlite) ──────────────────────────────────────────────
DB_PATH = os.path.join(os.path.dirname(__file__), 'db.sqlite')

# ── New real-time tracking DB (database.db) ───────────────────────────────────
TRACKING_DB_PATH = os.path.join(os.path.dirname(__file__), 'database.db')

def get_db_connection():
    """Create and return a database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize the database with users and location_logs tables + indexes."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            phone TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Migration: add phone if missing
    existing_users = [r[1] for r in cursor.execute('PRAGMA table_info(users)').fetchall()]
    if 'phone' not in existing_users:
        cursor.execute('ALTER TABLE users ADD COLUMN phone TEXT')

    # location_logs table — stores IST-readable timestamp + ISO UTC timestamp for querying
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS location_logs (
            id         INTEGER  PRIMARY KEY AUTOINCREMENT,
            latitude   REAL     NOT NULL,
            longitude  REAL     NOT NULL,
            risk_level TEXT     NOT NULL,
            prediction TEXT     NOT NULL,
            timestamp  TEXT,
            ts_utc     DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Migration: add ts_utc column if this db was created before it existed
    existing = [r[1] for r in cursor.execute('PRAGMA table_info(location_logs)').fetchall()]
    if 'ts_utc' not in existing:
        # SQLite ALTER TABLE cannot use CURRENT_TIMESTAMP as a non-constant default;
        # the column is populated explicitly in every INSERT, so NULL default is fine.
        cursor.execute('ALTER TABLE location_logs ADD COLUMN ts_utc DATETIME')

    # Index for fast time-range queries
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_loc_logs_ts_utc
        ON location_logs(ts_utc)
    ''')

    conn.commit()
    conn.close()


def hash_password(password):
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password, hashed_password):
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_user(username, password, phone=''):
    """Create a new user in the database"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        hashed_password = hash_password(password)
        cursor.execute(
            'INSERT INTO users (username, password, phone) VALUES (?, ?, ?)',
            (username, hashed_password, phone)
        )
        
        conn.commit()
        conn.close()
        return True
    except sqlite3.IntegrityError:
        return False  # Username already exists

def get_user_by_username(username):
    """Get user from database by username"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
    user = cursor.fetchone()
    
    conn.close()
    return user

def authenticate_user(username, password):
    """Authenticate user and return user data if valid"""
    user = get_user_by_username(username)
    
    if user and verify_password(password, user['password']):
        # sqlite3.Row doesn't support .get() — use try/except for optional columns
        try:
            phone = user['phone']
        except (IndexError, KeyError):
            phone = ''
        return {'id': user['id'], 'username': user['username'], 'phone': phone or ''}
    
    return None

# Create demo users on first run
def create_demo_users():
    """Create demo users for testing"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if users already exist
    cursor.execute('SELECT COUNT(*) FROM users')
    count = cursor.fetchone()[0]
    
    if count == 0:
        # Create demo users
        demo_users = [
            ('demo', 'demo123'),
            ('user1', 'password1'),
        ]
        
        for username, password in demo_users:
            hashed_password = hash_password(password)
            try:
                cursor.execute(
                    'INSERT INTO users (username, password) VALUES (?, ?)',
                    (username, hashed_password)
                )
            except sqlite3.IntegrityError:
                pass
        
        conn.commit()
    
    conn.close()


# ── Location Logs helpers ──────────────────────────────────────────────────────

def insert_location_log(latitude, longitude, risk_level, prediction):
    """
    Insert a new tracking result into location_logs.
    Stores both a human-readable IST timestamp and an ISO UTC timestamp
    so that time-range queries work correctly with SQLite's datetime().
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    ist_time = (datetime.utcnow() + timedelta(hours=5, minutes=30)).strftime('%d-%m-%Y %I:%M:%S %p')
    utc_now  = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')   # ISO format for SQLite queries
    cursor.execute(
        'INSERT INTO location_logs (latitude, longitude, risk_level, prediction, timestamp, ts_utc) VALUES (?, ?, ?, ?, ?, ?)',
        (latitude, longitude, risk_level, prediction, ist_time, utc_now)
    )
    conn.commit()
    conn.close()


def get_recent_logs(hours=1):
    """
    Return logs from the last `hours` hours, newest first.
    Queries on the ISO UTC ts_utc column which SQLite's datetime() understands.
    Falls back gracefully if ts_utc column does not exist yet (pre-migration).
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Check if ts_utc column exists (handles old databases)
    cols = [r[1] for r in cursor.execute('PRAGMA table_info(location_logs)').fetchall()]
    if 'ts_utc' in cols:
        cursor.execute(
            '''
            SELECT id, latitude, longitude, risk_level, prediction, timestamp
            FROM location_logs
            WHERE ts_utc >= datetime('now', ? || ' hours')
            ORDER BY ts_utc DESC
            ''',
            (f'-{hours}',)
        )
    else:
        # Legacy fallback — return ALL logs (no time filter possible without ts_utc)
        cursor.execute(
            'SELECT id, latitude, longitude, risk_level, prediction, timestamp FROM location_logs ORDER BY id DESC LIMIT 100'
        )

    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def delete_old_logs(hours=1):
    """
    Delete logs older than `hours` hours from db.sqlite (used by scheduler).
    Uses ts_utc for reliable datetime comparison if available.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cols = [r[1] for r in cursor.execute('PRAGMA table_info(location_logs)').fetchall()]
    time_col = 'ts_utc' if 'ts_utc' in cols else 'timestamp'
    cursor.execute(
        f"DELETE FROM location_logs WHERE {time_col} < datetime('now', ? || ' hours')",
        (f'-{hours}',)
    )
    conn.commit()
    deleted = cursor.rowcount
    conn.close()
    return deleted


# ══════════════════════════════════════════════════════════════════════════════
#  REAL-TIME TRACKING DB  (database.db)
#  Separate SQLite file so logs are clearly visible in DB Browser for SQLite
# ══════════════════════════════════════════════════════════════════════════════

def get_tracking_db_connection():
    """Return a connection to the real-time tracking database (database.db)."""
    conn = sqlite3.connect(TRACKING_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_tracking_db():
    """
    Create location_logs table (with user_id + location_name + risk_status)
    and optimised indexes inside database.db if they do not already exist.
    Also migrates older databases that are missing the location_name column.
    """
    conn = get_tracking_db_connection()
    cursor = conn.cursor()

    # Main tracking table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS location_logs (
            id            INTEGER  PRIMARY KEY AUTOINCREMENT,
            user_id       TEXT     NOT NULL,
            latitude      REAL     NOT NULL,
            longitude     REAL     NOT NULL,
            location_name TEXT,
            risk_status   TEXT,
            risk_level    TEXT,
            timestamp     TEXT,
            ts_utc        DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Migration: add columns that didn't exist in earlier schema versions
    existing_cols = [row[1] for row in cursor.execute('PRAGMA table_info(location_logs)').fetchall()]
    if 'location_name' not in existing_cols:
        cursor.execute('ALTER TABLE location_logs ADD COLUMN location_name TEXT')
    if 'ts_utc' not in existing_cols:
        # SQLite ALTER TABLE cannot use non-constant defaults; we populate ts_utc in every INSERT
        cursor.execute('ALTER TABLE location_logs ADD COLUMN ts_utc DATETIME')

    # Indexes for fast per-user and time-range lookups
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_user_id
        ON location_logs(user_id)
    ''')
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_ts_utc
        ON location_logs(ts_utc)
    ''')
    # Composite index for the most common query pattern (user + recent time)
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_user_ts
        ON location_logs(user_id, ts_utc)
    ''')

    conn.commit()
    conn.close()


def check_tracking_rate_limit(user_id):
    """
    Return True if the user has NOT logged a location in the last 4 min 55 sec.
    Uses ts_utc (ISO format) when available for reliable SQLite datetime comparison;
    falls back to IST string parsing for legacy rows.
    """
    conn = get_tracking_db_connection()
    cursor = conn.cursor()

    # Prefer ts_utc column if it exists (always ISO format, SQLite-safe)
    cols = [r[1] for r in cursor.execute('PRAGMA table_info(location_logs)').fetchall()]
    if 'ts_utc' in cols:
        cursor.execute(
            "SELECT ts_utc FROM location_logs WHERE user_id = ? ORDER BY id DESC LIMIT 1",
            (user_id,)
        )
        row = cursor.fetchone()
        conn.close()
        if not row or not row['ts_utc']:
            return True
        try:
            last_time = datetime.strptime(row['ts_utc'], '%Y-%m-%d %H:%M:%S')
            if (datetime.utcnow() - last_time).total_seconds() < 295:
                return False
            return True
        except Exception:
            return True

    # Legacy fallback: parse IST string timestamp
    cursor.execute(
        "SELECT timestamp FROM location_logs WHERE user_id = ? ORDER BY id DESC LIMIT 1",
        (user_id,)
    )
    row = cursor.fetchone()
    conn.close()

    if not row or not row['timestamp']:
        return True

    try:
        try:
            last_time = datetime.strptime(row['timestamp'], '%d-%m-%Y %I:%M:%S %p')
        except ValueError:
            last_time = datetime.strptime(row['timestamp'], '%Y-%m-%d %H:%M:%S')
        ist_now = datetime.utcnow() + timedelta(hours=5, minutes=30)
        if (ist_now - last_time).total_seconds() < 295:
            return False
        return True
    except Exception as e:
        print(f"Rate limiting parse error: {e}")
        return True

def insert_tracking_log(user_id, latitude, longitude, location_name, risk_status, risk_level):
    """
    Insert one real-time tracking record into database.db › location_logs.
    Stores both an IST-readable timestamp and an ISO UTC timestamp (ts_utc)
    for reliable SQLite datetime() comparisons and DB Browser readability.
    """
    conn = get_tracking_db_connection()
    cursor = conn.cursor()
    ist_time = (datetime.utcnow() + timedelta(hours=5, minutes=30)).strftime('%d-%m-%Y %I:%M:%S %p')
    utc_now  = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')

    # Check if ts_utc column exists (handles old schema)
    cols = [r[1] for r in cursor.execute('PRAGMA table_info(location_logs)').fetchall()]
    if 'ts_utc' in cols:
        cursor.execute(
            '''
            INSERT INTO location_logs
                (user_id, latitude, longitude, location_name, risk_status, risk_level, timestamp, ts_utc)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''',
            (user_id, latitude, longitude, location_name, risk_status, risk_level, ist_time, utc_now)
        )
    else:
        cursor.execute(
            '''
            INSERT INTO location_logs
                (user_id, latitude, longitude, location_name, risk_status, risk_level, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ''',
            (user_id, latitude, longitude, location_name, risk_status, risk_level, ist_time)
        )
    conn.commit()
    conn.close()
    return ist_time


def delete_old_tracking_logs(hours=24):
    """
    Delete tracking logs older than `hours` hours from database.db.
    Default retention = 24 hours. Prefers ts_utc column for reliable comparison.
    Returns number of rows deleted.
    """
    conn = get_tracking_db_connection()
    cursor = conn.cursor()
    cols = [r[1] for r in cursor.execute('PRAGMA table_info(location_logs)').fetchall()]
    time_col = 'ts_utc' if 'ts_utc' in cols else 'timestamp'
    cursor.execute(
        f"DELETE FROM location_logs WHERE {time_col} < datetime('now', ? || ' hours')",
        (f'-{hours}',)
    )
    conn.commit()
    deleted = cursor.rowcount
    conn.close()
    return deleted

def get_all_tracking_logs(limit=100):
    """Fetch the latest tracking logs from database.db."""
    conn = get_tracking_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, user_id, latitude, longitude, location_name, risk_status, risk_level, timestamp "
        "FROM location_logs ORDER BY id DESC LIMIT ?",
        (limit,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]
