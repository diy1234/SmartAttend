from flask import Blueprint, request, jsonify
import sqlite3
import hashlib
import os
from datetime import datetime

auth_bp = Blueprint('auth', __name__)

# Only this email may be an admin. Make configurable via environment.
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@smartattend.com').lower()

def get_db():
    conn = sqlite3.connect('smartattend.db')
    conn.row_factory = sqlite3.Row
    return conn

def has_column(table: str, column: str) -> bool:
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(f"PRAGMA table_info({table})")
        cols = [r[1] for r in cur.fetchall()]
        return column in cols
    finally:
        cur.close()
        conn.close()

def hash_password(password: str) -> str:
    salt = "smartattend_salt_2024"
    return hashlib.sha256((password + salt).encode()).hexdigest()

def check_password(hashed_password: str, password: str) -> bool:
    return hashed_password == hash_password(password)

def _try_import_password_reset():
    try:
        from password_reset import create_and_send_reset_link, verify_token, mark_token_used
        return create_and_send_reset_link, verify_token, mark_token_used
    except Exception:
        return None, None, None

@auth_bp.route('/auth/signup', methods=['POST'])
def signup():
    data = request.get_json(silent=True) or {}
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    role = (data.get('role') or 'student').lower()
    department = data.get('department')

    if not name or not email or not password:
        return jsonify({'error': 'Name, email, and password are required'}), 400

    # Disallow creating an admin account via signup
    if role == 'admin':
        return jsonify({'error': 'Creating an admin account via signup is not allowed'}), 403

    conn = get_db()
    cur = conn.cursor()
    
    # Check if user already exists
    cur.execute('SELECT id FROM users WHERE email = ?', (email,))
    if cur.fetchone():
        cur.close()
        conn.close()
        return jsonify({'error': 'User already exists with this email'}), 400

    hashed_pw = hash_password(password)

    # Insert user with department if column exists
    if has_column('users', 'department'):
        cur.execute(
            'INSERT INTO users (name, email, password_hash, role, department, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
            (name, email, hashed_pw, role, department)
        )
    else:
        cur.execute(
            'INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
            (name, email, hashed_pw, role)
        )

    user_id = cur.lastrowid

    # Create role-specific entries
    try:
        if role == 'student':
            enrollment_no = f'ENR{user_id:06d}'
            if has_column('students', 'department'):
                cur.execute('INSERT INTO students (user_id, student_name, email, enrollment_no, department) VALUES (?, ?, ?, ?, ?)',
                            (user_id, name, email, enrollment_no, department))
            else:
                cur.execute('INSERT INTO students (user_id, student_name, email, enrollment_no) VALUES (?, ?, ?, ?)',
                            (user_id, name, email, enrollment_no))
        elif role in ('teacher', 'faculty'):
            faculty_id = f'F{datetime.now().year}{user_id:04d}'
            if has_column('faculty', 'faculty_id'):
                if has_column('faculty', 'department'):
                    cur.execute('INSERT INTO faculty (user_id, faculty_name, email, faculty_id, department) VALUES (?, ?, ?, ?, ?)',
                                (user_id, name, email, faculty_id, department))
                else:
                    cur.execute('INSERT INTO faculty (user_id, faculty_name, email, faculty_id) VALUES (?, ?, ?, ?)',
                                (user_id, name, email, faculty_id))
            else:
                if has_column('faculty', 'email'):
                    cur.execute('INSERT INTO faculty (user_id, faculty_name, email, department) VALUES (?, ?, ?, ?)',
                                (user_id, name, email, department))
    except Exception:
        # Ignore role-specific insertion errors
        pass

    conn.commit()
    
    # Fetch created user
    query = 'SELECT id, name, email, role{} FROM users WHERE id = ?'.format(', department' if has_column('users', 'department') else '')
    cur.execute(query, (user_id,))
    user = cur.fetchone()
    cur.close()
    conn.close()

    return jsonify({'message': 'User created successfully', 'user': dict(user)}), 201

@auth_bp.route('/auth/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    email = data.get('email')
    password = data.get('password')
    requested_role = (data.get('role') or '').lower()

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    conn = get_db()
    cur = conn.cursor()
    cur.execute('SELECT * FROM users WHERE email = ?', (email,))
    user = cur.fetchone()

    if not user or not check_password(user['password_hash'], password):
        cur.close()
        conn.close()
        return jsonify({'error': 'Invalid email or password'}), 401

    # If account is admin, only allow login if it matches the configured ADMIN_EMAIL
    db_role = user['role'].lower()
    user_email_lower = user['email'].lower() if 'email' in user.keys() else ''
    if db_role == 'admin' and user_email_lower != ADMIN_EMAIL:
        cur.close()
        conn.close()
        return jsonify({'error': 'Admin login is restricted'}), 403

    if requested_role and db_role != requested_role:
        cur.close()
        conn.close()
        return jsonify({'error': f'This account is not registered as a {requested_role}'}), 401

    response_user = {k: user[k] for k in user.keys()}
    cur.close()
    conn.close()
    return jsonify({'message': 'Login successful', 'user': response_user}), 200

@auth_bp.route('/auth/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json(silent=True) or {}
    email = data.get('email')
    if not email:
        return jsonify({'error': 'Email is required'}), 400

    create_and_send_reset_link, _, _ = _try_import_password_reset()
    if create_and_send_reset_link:
        try:
            create_and_send_reset_link(email=email)
        except Exception:
            pass

    return jsonify({'message': 'If the email exists, a reset link has been sent.'}), 200

@auth_bp.route('/auth/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json(silent=True) or {}
    token = data.get('token')
    new_password = data.get('new_password')
    if not token or not new_password:
        return jsonify({'error': 'Token and new password are required'}), 400

    _, verify_token, mark_token_used = _try_import_password_reset()
    if not verify_token:
        return jsonify({'error': 'Password reset not available'}), 500

    ok, info = verify_token(token)
    if not ok:
        return jsonify({'error': f'Token invalid: {info}'}), 400

    email = info.get('email') if isinstance(info, dict) else None
    if not email:
        return jsonify({'error': 'Invalid token payload'}), 400

    conn = get_db()
    hashed_pw = hash_password(new_password)
    cursor = conn.execute('UPDATE users SET password_hash = ? WHERE email = ?', (hashed_pw, email))
    if cursor.rowcount == 0:
        conn.close()
        return jsonify({'error': 'User not found'}), 404
    conn.commit()
    conn.close()

    try:
        if mark_token_used:
            mark_token_used(token)
    except Exception:
        pass

    return jsonify({'message': 'Password reset successfully'}), 200

@auth_bp.route('/auth/verify-reset-token', methods=['POST'])
def verify_reset_token():
    data = request.get_json(silent=True) or {}
    token = data.get('token')
    if not token:
        return jsonify({'error': 'Token is required'}), 400

    _, verify_token, _ = _try_import_password_reset()
    if not verify_token:
        return jsonify({'valid': False, 'error': 'Password reset not available'}), 200

    ok, info = verify_token(token)
    if ok:
        email = info.get('email') if isinstance(info, dict) else None
        return jsonify({'valid': True, 'email': email}), 200
    return jsonify({'valid': False, 'error': info}), 200