from flask import Blueprint, request, jsonify
from models.database import get_db_connection

users_bp = Blueprint('users', __name__)

@users_bp.route('/profile', methods=['GET'])
def get_profile():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'error': 'User ID required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT u.id, u.name, u.email, u.role, u.created_at,
               s.enrollment_no, s.course, s.department,
               f.domain as faculty_domain
        FROM users u
        LEFT JOIN students s ON u.id = s.user_id
        LEFT JOIN faculty f ON u.id = f.user_id
        WHERE u.id = ?
    ''', (user_id,))
    
    profile = cursor.fetchone()
    conn.close()
    
    if not profile:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({'profile': dict(profile)})