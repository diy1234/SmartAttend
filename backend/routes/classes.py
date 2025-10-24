from flask import Blueprint, request, jsonify
import sqlite3

classes_bp = Blueprint('classes', __name__)

def get_db():
    """Get SQLite database connection"""
    conn = sqlite3.connect('smartattend.db')
    conn.row_factory = sqlite3.Row
    return conn

@classes_bp.route('/classes', methods=['GET'])
def get_classes():
    try:
        conn = get_db()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT c.*, f.faculty_name 
            FROM classes c 
            JOIN faculty f ON c.faculty_id = f.id
        """)
        classes = cur.fetchall()
        cur.close()
        conn.close()
        
        return jsonify({'classes': [dict(cls) for cls in classes]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@classes_bp.route('/classes', methods=['POST'])
def create_class():
    try:
        data = request.get_json()
        class_name = data.get('class_name')
        faculty_id = data.get('faculty_id')
        schedule = data.get('schedule')

        if not class_name or not faculty_id:
            return jsonify({'error': 'Class name and faculty ID are required'}), 400

        conn = get_db()
        cur = conn.cursor()
        
        cur.execute(
            "INSERT INTO classes (class_name, faculty_id, schedule) VALUES (?, ?, ?)",
            (class_name, faculty_id, schedule)
        )
        conn.commit()
        
        class_id = cur.lastrowid
        cur.execute("SELECT * FROM classes WHERE id = ?", (class_id,))
        new_class = cur.fetchone()
        cur.close()
        conn.close()
        
        return jsonify({'class': dict(new_class)}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@classes_bp.route('/classes/<int:class_id>/enroll', methods=['POST'])
def enroll_student(class_id):
    try:
        data = request.get_json()
        student_id = data.get('student_id')

        if not student_id:
            return jsonify({'error': 'Student ID is required'}), 400

        conn = get_db()
        cur = conn.cursor()
        
        # Check if already enrolled
        cur.execute("SELECT id FROM enrollment WHERE student_id = ? AND class_id = ?", 
                   (student_id, class_id))
        if cur.fetchone():
            cur.close()
            conn.close()
            return jsonify({'error': 'Student already enrolled in this class'}), 400
        
        cur.execute(
            "INSERT INTO enrollment (student_id, class_id) VALUES (?, ?)",
            (student_id, class_id)
        )
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({'message': 'Student enrolled successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500