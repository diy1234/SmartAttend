from flask import Blueprint, request, jsonify
from models.database import get_db_connection
from services.notification_service import NotificationService
from datetime import datetime

teacher_subjects_bp = Blueprint('teacher_subjects', __name__)


# ============================================================
# 1) ASSIGN TEACHER TO SUBJECT
# ============================================================
@teacher_subjects_bp.route('/teacher-subjects', methods=['POST'])
def assign_teacher_to_subject():
    """Assign a teacher to a subject with notification"""
    data = request.json
    
    required_fields = ['teacher_id', 'subject_id', 'department_id']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400
    
    teacher_id = data.get('teacher_id')
    subject_id = data.get('subject_id')
    department_id = data.get('department_id')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Validate teacher exists (teacher_profiles.id)
        cursor.execute('SELECT user_id, full_name FROM teacher_profiles WHERE id = ?', (teacher_id,))
        teacher = cursor.fetchone()
        if not teacher:
            return jsonify({'error': 'Teacher not found'}), 404
        
        teacher_user_id = teacher['user_id']
        teacher_name = teacher['full_name']
        
        # Validate subject exists
        cursor.execute('SELECT name FROM subjects WHERE id = ?', (subject_id,))
        subject = cursor.fetchone()
        if not subject:
            return jsonify({'error': 'Subject not found'}), 404
        
        subject_name = subject['name']
        
        # Validate department exists
        cursor.execute('SELECT name FROM departments WHERE id = ?', (department_id,))
        department = cursor.fetchone()
        if not department:
            return jsonify({'error': 'Department not found'}), 404
        
        department_name = department['name']
        
        # Check if already assigned
        cursor.execute(
            'SELECT id FROM teacher_subjects WHERE teacher_id = ? AND subject_id = ?',
            (teacher_id, subject_id)
        )
        if cursor.fetchone():
            return jsonify({'error': 'Teacher already assigned to this subject'}), 409
        
        # Insert into teacher_subjects
        cursor.execute('''
            INSERT INTO teacher_subjects (teacher_id, subject_id, department_id)
            VALUES (?, ?, ?)
        ''', (teacher_id, subject_id, department_id))
        
        conn.commit()
        assignment_id = cursor.lastrowid
        
        # 🔔 Send notification to teacher
        try:
            NotificationService.notify_teacher_subject_assignment(
                teacher_user_id=teacher_user_id,
                assignment_data={
                    'id': assignment_id,
                    'subject_name': subject_name,
                    'department_name': department_name,
                    'teacher_name': teacher_name
                }
            )
        except Exception as notif_err:
            print(f"⚠️ Notification failed: {notif_err}")
            # Don't fail the API call if notification fails
        
        return jsonify({
            'message': f'{teacher_name} assigned to {subject_name} ({department_name})',
            'id': assignment_id,
            'teacher_id': teacher_id,
            'subject_id': subject_id,
            'department_id': department_id
        }), 201
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


# ============================================================
# 2) GET TEACHER ASSIGNMENTS
# ============================================================
@teacher_subjects_bp.route('/teacher-subjects/teacher/<int:teacher_id>', methods=['GET'])
def get_teacher_subjects(teacher_id):
    """Get all subjects assigned to a specific teacher"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT 
                ts.id,
                ts.teacher_id,
                ts.subject_id,
                ts.department_id,
                s.name as subject_name,
                d.name as department_name,
                tp.full_name as teacher_name,
                ts.created_at
            FROM teacher_subjects ts
            JOIN subjects s ON ts.subject_id = s.id
            JOIN departments d ON ts.department_id = d.id
            JOIN teacher_profiles tp ON ts.teacher_id = tp.id
            WHERE ts.teacher_id = ?
            ORDER BY ts.created_at DESC
        ''', (teacher_id,))
        
        assignments = [dict(row) for row in cursor.fetchall()]
        return jsonify(assignments)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


# ============================================================
# 3) REMOVE TEACHER FROM SUBJECT
# ============================================================
@teacher_subjects_bp.route('/teacher-subjects/<int:assignment_id>', methods=['DELETE'])
def remove_teacher_from_subject(assignment_id):
    """Remove a teacher from a subject"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if assignment exists
        cursor.execute('SELECT * FROM teacher_subjects WHERE id = ?', (assignment_id,))
        assignment = cursor.fetchone()
        if not assignment:
            return jsonify({'error': 'Assignment not found'}), 404
        
        # Delete
        cursor.execute('DELETE FROM teacher_subjects WHERE id = ?', (assignment_id,))
        conn.commit()
        
        return jsonify({'message': 'Assignment removed successfully'})
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


# ============================================================
# 4) GET ALL ASSIGNMENTS (Admin view)
# ============================================================
@teacher_subjects_bp.route('/teacher-subjects', methods=['GET'])
def get_all_assignments():
    """Get all teacher-subject assignments"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT 
                ts.id,
                ts.teacher_id,
                ts.subject_id,
                ts.department_id,
                s.name as subject_name,
                d.name as department_name,
                tp.full_name as teacher_name,
                tp.email as teacher_email,
                ts.created_at
            FROM teacher_subjects ts
            JOIN subjects s ON ts.subject_id = s.id
            JOIN departments d ON ts.department_id = d.id
            JOIN teacher_profiles tp ON ts.teacher_id = tp.id
            ORDER BY ts.created_at DESC
        ''')
        
        assignments = [dict(row) for row in cursor.fetchall()]
        return jsonify(assignments)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()
