from flask import Blueprint, request, jsonify
import sqlite3

faculty_bp = Blueprint('faculty', __name__)

def get_db():
    """Get SQLite database connection"""
    conn = sqlite3.connect('smartattend.db')
    conn.row_factory = sqlite3.Row
    return conn

@faculty_bp.route('/faculty', methods=['GET'])
def get_faculty():
    try:
        conn = get_db()
        cur = conn.cursor()
        
        cur.execute("SELECT * FROM faculty")
        faculty = cur.fetchall()
        cur.close()
        conn.close()
        
        return jsonify({'faculty': [dict(fac) for fac in faculty]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@faculty_bp.route('/faculty/<int:faculty_id>/classes', methods=['GET'])
def get_faculty_classes(faculty_id):
    try:
        conn = get_db()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT c.*, COUNT(DISTINCT e.student_id) as student_count 
            FROM classes c 
            LEFT JOIN enrollment e ON c.id = e.class_id 
            WHERE c.faculty_id = ? 
            GROUP BY c.id
        """, (faculty_id,))
        classes = cur.fetchall()
        cur.close()
        conn.close()
        
        return jsonify({'classes': [dict(cls) for cls in classes]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500