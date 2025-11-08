# routes/student_routes.py
from flask import Blueprint, request, jsonify
from models.database import get_db_connection

student_bp = Blueprint('student', __name__)

@student_bp.route('/dashboard', methods=['GET'])
def get_student_dashboard():
    try:
        student_id = request.args.get('student_id')
        if not student_id:
            return jsonify({'error': 'Student ID required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get student profile
        cursor.execute('''
            SELECT u.id, u.name, u.email, u.photo, u.created_at, u.role,
                   s.enrollment_no, s.course, s.department, s.semester
            FROM users u
            LEFT JOIN students s ON u.id = s.user_id
            WHERE u.id = ? AND u.role = 'student'
        ''', (student_id,))
        
        profile = cursor.fetchone()
        
        if not profile:
            conn.close()
            return jsonify({'error': 'Student not found'}), 404
        
        # Get attendance summary - check if attendance table exists
        try:
            cursor.execute('''
                SELECT subject, 
                       COUNT(*) as total_classes,
                       SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_classes
                FROM attendance 
                WHERE student_id = ?
                GROUP BY subject
            ''', (student_id,))
            attendance_summary = cursor.fetchall()
        except Exception as e:
            print(f"Attendance summary error: {e}")
            attendance_summary = []

        # Get leave requests - check if attendance_requests table exists
        try:
            cursor.execute('''
                SELECT id, subject, from_date, to_date, reason, status, created_at
                FROM attendance_requests 
                WHERE student_id = ? 
                ORDER BY created_at DESC
            ''', (student_id,))
            leave_requests = cursor.fetchall()
        except Exception as e:
            print(f"Leave requests error: {e}")
            leave_requests = []
        
        conn.close()
        
        return jsonify({
            'success': True,
            'profile': dict(profile),
            'attendance_summary': [dict(row) for row in attendance_summary],
            'leave_requests': [dict(row) for row in leave_requests]
        })
        
    except Exception as e:
        print(f"Dashboard error: {e}")
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

@student_bp.route('/attendance', methods=['GET'])
def get_student_attendance():
    try:
        student_id = request.args.get('student_id')
        if not student_id:
            return jsonify({'error': 'Student ID required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, date, subject, status, method, created_at
            FROM attendance 
            WHERE student_id = ?
            ORDER BY date DESC
        ''', (student_id,))
        
        attendance_records = cursor.fetchall()
        conn.close()
        
        return jsonify({
            'success': True,
            'attendances': [dict(row) for row in attendance_records]
        })
        
    except Exception as e:
        print(f"Attendance error: {e}")
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

# Add this endpoint to check what tables exist
@student_bp.route('/debug-tables', methods=['GET'])
def debug_tables():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get all table names
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        
        table_info = {}
        for table in tables:
            table_name = table['name']
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = cursor.fetchall()
            table_info[table_name] = [dict(col) for col in columns]
            
            # Show sample data
            cursor.execute(f"SELECT * FROM {table_name} LIMIT 3")
            sample_data = cursor.fetchall()
            table_info[table_name + '_sample'] = [dict(row) for row in sample_data]
        
        conn.close()
        
        return jsonify({
            'success': True,
            'tables': table_info
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500