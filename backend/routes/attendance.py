from flask import Blueprint, request, jsonify
import sqlite3
from datetime import datetime

attendance_bp = Blueprint('attendance', __name__)

def get_db():
    """Get SQLite database connection"""
    conn = sqlite3.connect('smartattend.db')
    conn.row_factory = sqlite3.Row
    return conn

@attendance_bp.route('/attendance', methods=['POST'])
def mark_attendance():
    try:
        data = request.get_json()
        student_id = data.get('student_id')
        class_id = data.get('class_id')
        status = data.get('status', 'present')
        date = data.get('date', datetime.now().date())

        if not student_id or not class_id:
            return jsonify({'error': 'Student ID and Class ID are required'}), 400

        conn = get_db()
        cur = conn.cursor()
        
        # Check if attendance already marked for today
        cur.execute("""
            SELECT id FROM attendance 
            WHERE student_id = ? AND class_id = ? AND date = ?
        """, (student_id, class_id, date))
        
        if cur.fetchone():
            cur.close()
            conn.close()
            return jsonify({'error': 'Attendance already marked for today'}), 400
        
        cur.execute(
            "INSERT INTO attendance (student_id, class_id, date, status) VALUES (?, ?, ?, ?)",
            (student_id, class_id, date, status)
        )
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({'message': 'Attendance marked successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@attendance_bp.route('/classes/<int:class_id>/attendance/<date>', methods=['GET'])
def get_class_attendance(class_id, date):
    try:
        conn = get_db()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT a.*, s.student_name, s.enrollment_no 
            FROM attendance a 
            JOIN students s ON a.student_id = s.id 
            WHERE a.class_id = ? AND a.date = ?
        """, (class_id, date))
        attendance = cur.fetchall()
        cur.close()
        conn.close()
        
        return jsonify({'attendance': [dict(record) for record in attendance]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@attendance_bp.route('/classes/<int:class_id>/attendance-report', methods=['GET'])
def get_attendance_report(class_id):
    try:
        conn = get_db()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT s.id, s.student_name, s.enrollment_no,
                   COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
                   COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
                   COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count,
                   COUNT(a.id) as total_days
            FROM enrollment e
            JOIN students s ON e.student_id = s.id
            LEFT JOIN attendance a ON e.student_id = a.student_id AND e.class_id = a.class_id
            WHERE e.class_id = ?
            GROUP BY s.id, s.student_name, s.enrollment_no
        """, (class_id,))
        report = cur.fetchall()
        cur.close()
        conn.close()
        
        return jsonify({'report': [dict(record) for record in report]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500