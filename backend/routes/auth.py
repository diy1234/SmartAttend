from flask import Blueprint, request, jsonify
import random
import string
from datetime import datetime, timedelta
import os
import logging
from models.users import create_user, get_user_by_credentials, check_email_exists, admin_exists
from email_service import send_verification_email
from models.email_parser import email_parser
from models.database import get_db_connection, hash_password 

auth_bp = Blueprint('auth', __name__)


# Store verification codes (in production, use database)
verification_codes = {}

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    try:
        data = request.get_json()
        email = data.get('email')

        logging.info("Forgot password requested for: %s", email)
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        # Check if email exists in the system
        email_exists = check_email_exists(email)
        logging.info("Email exists in system: %s", email_exists)
        
        # For security, don't reveal if email exists, but only send email if it exists
        if email_exists:
            # Generate a 6-digit verification code
            verification_code = ''.join(random.choices(string.digits, k=6))
            
            # Store the code with email and expiry (10 minutes)
            verification_codes[email] = {
                'code': verification_code,
                'expires_at': datetime.now() + timedelta(minutes=10),
                'attempts': 0
            }
            
            logging.info("Generated verification code: %s for email: %s", verification_code, email)
            logging.info("Verification codes state: %s", verification_codes)
            
            logging.info("Attempting to send verification email to: %s", email)

            # Use the centralized email service (returns True/False)
            email_sent = send_verification_email(email, verification_code)

            logging.info("Email send result for %s: %s", email, email_sent)
            
            if not email_sent:
                logging.error("Failed to send email but email_exists check passed. This shouldn't happen.")

            if not email_sent:
                logging.error("Failed to send verification email to: %s", email)
                return jsonify({
                    'error': 'Failed to send verification email. Please try again later.'
                }), 500
            
        else:
            logging.info("Email %s not found in system, skipping email send", email)
        
        # Always return the same message for security
        return jsonify({
            'message': 'If the email exists in our system, a verification code has been sent.',
            'method': 'email'
        }), 200
        
    except Exception as e:
        logging.exception("Error in forgot_password: %s", str(e))
        return jsonify({'error': 'An internal server error occurred'}), 500

@auth_bp.route('/verify-code', methods=['POST'])
def verify_code():
    try:
        data = request.get_json()
        email = data.get('email')
        code = data.get('code')
        
        if not all([email, code]):
            return jsonify({'error': 'Email and verification code are required'}), 400
        
        # Check if we have a code for this email
        if email not in verification_codes:
            return jsonify({'error': 'No verification code found for this email. Please request a new one.'}), 400
        
        code_data = verification_codes[email]
        
        # Check if code is expired
        if datetime.now() > code_data['expires_at']:
            del verification_codes[email]
            return jsonify({'error': 'Verification code has expired. Please request a new one.'}), 400
        
        # Check if too many attempts
        if code_data['attempts'] >= 3:
            del verification_codes[email]
            return jsonify({'error': 'Too many failed attempts. Please request a new verification code.'}), 400
        
        # Verify the code
        if code != code_data['code']:
            code_data['attempts'] += 1
            return jsonify({'error': 'Invalid verification code'}), 400
        
        # Code is valid - mark email as verified for reset
        verification_codes[email]['verified'] = True
        
        return jsonify({
            'message': 'Verification successful. You can now reset your password.',
            'verified': True
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    try:
        data = request.get_json()
        email = data.get('email')
        new_password = data.get('new_password')
        
        if not all([email, new_password]):
            return jsonify({'error': 'Email and new password are required'}), 400
        
        # Check if email is verified for password reset
        if email not in verification_codes or not verification_codes[email].get('verified'):
            return jsonify({'error': 'Please verify your email first before resetting password.'}), 400
        
        # Update password in database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        hashed_pwd = hash_password(new_password)
        cursor.execute(
            'UPDATE users SET password_hash = ? WHERE email = ?',
            (hashed_pwd, email)
        )
        
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'error': 'User not found'}), 404
        
        # Remove verification data
        del verification_codes[email]
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': 'Password has been reset successfully. You can now login with your new password.'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')
        role = data.get('role')
        
        if not all([name, email, password]):
            return jsonify({'error': 'Name, email, and password are required'}), 400
        
        # Check if email exists
        if check_email_exists(email):
            return jsonify({'error': 'Email already exists'}), 400
        
        # Prevent multiple admins
        if role == 'admin' and admin_exists():
            return jsonify({'error': 'Admin already exists. Only one admin is allowed.'}), 400
        
        # Use Domain AI for automatic role detection if not admin
        if role != 'admin':
            email_info = email_parser.parse_email(email)
            detected_role = email_info['role']
            detected_course = email_info.get('course')
            detected_department = email_info.get('department')
            detected_domain = email_info.get('domain')
        else:
            detected_role = 'admin'
            detected_course = None
            detected_department = None
            detected_domain = None
        
        # Create user
        user_id = create_user(
            name=name,
            email=email,
            password=password,
            role=detected_role,
            course=detected_course,
            department=detected_department,
            domain=detected_domain
        )
        
        return jsonify({
            'message': 'User created successfully',
            'user': {
                'id': user_id,
                'name': name,
                'email': email,
                'role': detected_role,
                'course': detected_course,
                'department': detected_department,
                'domain': detected_domain
            }
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        role = data.get('role')
        
        if not all([email, password, role]):
            return jsonify({'error': 'Email, password, and role are required'}), 400
        
        user = get_user_by_credentials(email, password, role)
        
        if not user:
            return jsonify({'error': 'Invalid credentials or role mismatch'}), 401
        
        return jsonify({
            'message': 'Login successful',
            'user': user
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/admin/exists', methods=['GET'])
def check_admin_exists():
    """Check if admin already exists (for frontend)"""
    exists = admin_exists()
    return jsonify({'admin_exists': exists})

@auth_bp.route('/debug-all-users', methods=['GET'])
def debug_all_users():
    """Temporary route to see all users in system"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT id, name, email, role FROM users')
        users = cursor.fetchall()
        conn.close()
        
        users_list = []
        for user in users:
            users_list.append({
                'id': user[0],
                'name': user[1],
                'email': user[2],
                'role': user[3]
            })
        
        print("DEBUG: All users in system:", users_list)
        return jsonify({'users': users_list}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@auth_bp.route('/test-email', methods=['POST'])
def test_email():
    """Test email sending directly"""
    try:
        data = request.get_json()
        test_email = data.get('email', 'a23962483@gmail.com')
        
        test_code = "123456"
        success = send_verification_email(test_email, test_code)
        
        return jsonify({
            'success': success,
            'message': f'Test email sent to {test_email}',
            'code_used': test_code
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Add a test route to verify auth routes are working
@auth_bp.route('/test', methods=['GET'])
def auth_test():
    return jsonify({
        'message': 'Auth routes are working!', 
        'status': 'success',
        'routes': ['signup', 'login', 'forgot-password', 'verify-code', 'reset-password']
    }), 200