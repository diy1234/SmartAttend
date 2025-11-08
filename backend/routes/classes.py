from flask import Blueprint, request, jsonify
from models.database import get_db_connection

classes_bp = Blueprint('classes', __name__)

@classes_bp.route('/', methods=['GET'])
def get_classes():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT c.*, u.name as faculty_name 
        FROM classes c
        JOIN faculty f ON c.faculty_id = f.id
        JOIN users u ON f.user_id = u.id
    ''')
    classes = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify({'classes': classes})

@classes_bp.route('/', methods=['POST'])
def create_class():
    try:
        data = request.get_json()
        faculty_id = data.get('faculty_id')
        class_name = data.get('class_name')
        subject_code = data.get('subject_code')
        schedule = data.get('schedule')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO classes (faculty_id, class_name, subject_code, schedule)
            VALUES (?, ?, ?, ?)
        ''', (faculty_id, class_name, subject_code, schedule))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Class created successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500