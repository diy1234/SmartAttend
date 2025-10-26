from flask import Blueprint, request, jsonify
from datetime import datetime
from models.database import get_db_connection

attendance_bp = Blueprint('attendance', __name__)

@attendance_bp.route('/', methods=['POST'])
def mark_attendance():
    try:
        data = request.get_json()
        student_id = data.get('student_id')
        class_id = data.get('class_id')
        status = data.get('status')
        marked_by = data.get('marked_by')
        
        attendance_date = datetime.now().date()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO attendance 
            (student_id, class_id, attendance_date, status, marked_by)
            VALUES (?, ?, ?, ?, ?)
        ''', (student_id, class_id, attendance_date, status, marked_by))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Attendance marked successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@attendance_bp.route('/', methods=['GET'])
def get_attendance():
    class_id = request.args.get('class_id')
    date = request.args.get('date')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT a.*, u.name as student_name, s.enrollment_no
        FROM attendance a
        JOIN students st ON a.student_id = st.id
        JOIN users u ON st.user_id = u.id
        WHERE a.class_id = ? AND a.attendance_date = ?
    ''', (class_id, date))
    
    attendance = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify({'attendance': attendance})