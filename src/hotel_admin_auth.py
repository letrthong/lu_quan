import jwt
import datetime
from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash

admin_auth = Blueprint('admin_auth', __name__, url_prefix='/api/hotelconnect/v1/admin')



# Password file path
PASSWORD_FILE = "/opt/key"

import json as _json

def load_users():
    try:
        with open(PASSWORD_FILE, 'r') as f:
            return _json.load(f)
    except Exception:
        # Default: 1 admin user
        return {"admin": generate_password_hash("admin123")}

def save_users(users):
    with open(PASSWORD_FILE, 'w') as f:
        _json.dump(users, f)

ADMIN_USER = "admin"

SECRET_KEY = "your-secret-key"  # Change this in production!


@admin_auth.route('/login', methods=['POST'])
def admin_login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({"error": "Missing username or password"}), 400
    users = load_users()
    user_hash = users.get(username)
    if not user_hash or not check_password_hash(user_hash, password):
        return jsonify({"error": "Invalid credentials"}), 401
    token = jwt.encode({
        'username': username,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=8)
    }, SECRET_KEY, algorithm='HS256')
    return jsonify({"token": token})

# Change password route
@admin_auth.route('/change-password', methods=['POST'])
@admin_required
def change_password():
    data = request.json
    old_password = data.get('old_password')
    new_password = data.get('new_password')
    if not old_password or not new_password:
        return jsonify({"error": "Missing old or new password"}), 400
    users = load_users()
    user_hash = users.get(request.admin_user)
    if not user_hash or not check_password_hash(user_hash, old_password):
        return jsonify({"error": "Old password incorrect"}), 401
    users[request.admin_user] = generate_password_hash(new_password)
    save_users(users)
    return jsonify({"message": "Password changed successfully"})

# List all users (admin only)
@admin_auth.route('/users', methods=['GET'])
@admin_required
def list_users():
    if request.admin_user != ADMIN_USER:
        return jsonify({"error": "Only admin can list users"}), 403
    users = load_users()
    return jsonify({"users": list(users.keys())})

# Add user (admin only)
@admin_auth.route('/users', methods=['POST'])
@admin_required
def add_user():
    if request.admin_user != ADMIN_USER:
        return jsonify({"error": "Only admin can add users"}), 403
    data = request.json
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({"error": "Missing username or password"}), 400
    users = load_users()
    if username in users:
        return jsonify({"error": "User already exists"}), 409
    users[username] = generate_password_hash(password)
    save_users(users)
    return jsonify({"message": f"User '{username}' added"})

# Delete user (admin only, cannot delete self)
@admin_auth.route('/users/<username>', methods=['DELETE'])
@admin_required
def delete_user(username):
    if request.admin_user != ADMIN_USER:
        return jsonify({"error": "Only admin can delete users"}), 403
    if username == ADMIN_USER:
        return jsonify({"error": "Cannot delete admin user"}), 400
    users = load_users()
    if username not in users:
        return jsonify({"error": "User not found"}), 404
    del users[username]
    save_users(users)
    return jsonify({"message": f"User '{username}' deleted"})

# Decorator to protect routes
from functools import wraps

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({"error": "Missing token"}), 401
        try:
            token = token.replace('Bearer ', '')
            data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            request.admin_user = data['username']
        except Exception as e:
            return jsonify({"error": "Invalid or expired token"}), 401
        return f(*args, **kwargs)
    return decorated

# Example protected route
@admin_auth.route('/profile', methods=['GET'])
@admin_required
def admin_profile():
    return jsonify({"user": request.admin_user})

# You can use @admin_required on any route you want to protect
