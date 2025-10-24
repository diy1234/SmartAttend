from flask import Blueprint, request, jsonify
import sqlite3

students_bp = Blueprint('students', __name__)

def get_db():
    """Get SQLite database connection"""
    conn = sqlite3.connect('smartattend.db')
    conn.row_factory = sqlite3.Row
    return conn

@students_bp.route('/students', methods=['GET'])
def get_students():
    try:
        conn = get_db()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT s.*, COUNT(DISTINCT e.class_id) as enrolled_classes 
            FROM students s 
            LEFT JOIN enrollment e ON s.id = e.student_id 
            GROUP BY s.id
        """)
        students = cur.fetchall()
        cur.close()
        conn.close()
        
        return jsonify({'students': [dict(student) for student in students]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@students_bp.route('/students/<int:student_id>', methods=['GET'])
def get_student(student_id):
    try:
        conn = get_db()
        cur = conn.cursor()
        
        cur.execute("SELECT * FROM students WHERE id = ?", (student_id,))
        student = cur.fetchone()
        cur.close()
        conn.close()
        
        if not student:
            return jsonify({'error': 'Student not found'}), 404
            
        return jsonify({'student': dict(student)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@students_bp.route('/students/<int:student_id>/attendance', methods=['GET'])
def get_student_attendance(student_id):
    try:
        conn = get_db()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT a.*, c.class_name, f.faculty_name 
            FROM attendance a 
            JOIN classes c ON a.class_id = c.id 
            JOIN faculty f ON c.faculty_id = f.id 
            WHERE a.student_id = ? 
            ORDER BY a.date DESC
        """, (student_id,))
        attendance = cur.fetchall()
        cur.close()
        conn.close()
        
        return jsonify({'attendance': [dict(record) for record in attendance]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500