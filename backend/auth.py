from flask import Blueprint, request, jsonify
import jwt
import datetime
import os
from database import authenticate_user, create_user, get_user_by_username

# Create auth blueprint
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# Secret key for JWT - change this in production
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
TOKEN_EXPIRY_HOURS = 24

def generate_token(user_id, username, phone=''):
    """Generate JWT token for authenticated user"""
    payload = {
        'user_id': user_id,
        'username': username,
        'phone': phone,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=TOKEN_EXPIRY_HOURS),
        'iat': datetime.datetime.utcnow()
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

def verify_token(token):
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None  # Token expired
    except jwt.InvalidTokenError:
        return None  # Invalid token

def get_token_from_request():
    """Extract token from Authorization header"""
    auth_header = request.headers.get('Authorization', '')
    
    if not auth_header:
        return None
    
    # Expected format: "Bearer <token>"
    parts = auth_header.split()
    if len(parts) == 2 and parts[0] == 'Bearer':
        return parts[1]
    
    return None

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login endpoint - authenticate user and return JWT token"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No JSON data provided'}), 400
    
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    
    # Validate input
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    
    # Authenticate user
    user = authenticate_user(username, password)
    
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401
    
    # Generate JWT token
    token = generate_token(user['id'], user['username'], user.get('phone', ''))
    
    return jsonify({
        'success': True,
        'token': token,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'phone': user.get('phone', '')
        }
    }), 200

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register endpoint - create new user"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No JSON data provided'}), 400
    
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    phone = data.get('phone', '').strip()
    
    # Validate input
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
        
    if not phone:
        return jsonify({'error': 'Phone number is required for emergency alerts'}), 400
    
    if len(username) < 3:
        return jsonify({'error': 'Username must be at least 3 characters'}), 400
    
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    
    # Check if user already exists
    if get_user_by_username(username):
        return jsonify({'error': 'Username already exists'}), 409
    
    # Create new user
    if create_user(username, password, phone):
        user = authenticate_user(username, password)
        token = generate_token(user['id'], user['username'], user.get('phone', ''))
        
        return jsonify({
            'success': True,
            'token': token,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'phone': user.get('phone', '')
            }
        }), 201
    
    return jsonify({'error': 'Failed to create user'}), 500

@auth_bp.route('/verify', methods=['POST'])
def verify():
    """Verify endpoint - check if token is valid"""
    token = get_token_from_request()
    
    if not token:
        return jsonify({'error': 'No token provided'}), 401
    
    payload = verify_token(token)
    
    if not payload:
        return jsonify({'error': 'Invalid or expired token'}), 401
    
    return jsonify({
        'success': True,
        'user': {
            'id': payload.get('user_id'),
            'username': payload.get('username'),
            'phone': payload.get('phone', '')
        }
    }), 200

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Logout endpoint - token is removed from client side"""
    return jsonify({'success': True, 'message': 'Logged out successfully'}), 200
